# Security Audit: Meldar PoC

**Date:** 2026-03-30
**Auditor:** Security Engineer (automated review)
**Scope:** All API routes, server modules, configuration, environment secrets
**Methodology:** Manual code review against OWASP Top 10 2021, GDPR requirements, Stripe integration best practices

---

## Executive Summary

The codebase demonstrates solid foundational security practices: Stripe webhook signature verification is correctly implemented, security headers are configured in `next.config.ts`, `.env.local` is gitignored and was never committed, Zod validation is used on billing inputs, and file uploads are type/size-checked. However, several **critical** and **high**-severity issues require immediate remediation before production use with real user data.

---

## Findings

### CRITICAL

#### C1. Secrets Exposed in `.env.local` Readable by Agents/Tools
**File:** `.env.local`
**CVSS:** 9.1 (Critical)
**Category:** Sensitive Data Exposure (OWASP A02)

`.env.local` contains live API keys for Resend, Neon Postgres, Stripe (test mode), Anthropic, and the Stripe webhook secret. While `.gitignore` correctly excludes it and it was never committed to git history, **any tool or agent with filesystem read access in this project can extract all secrets**. This is the current situation -- the audit itself read the file.

**Observed keys:** [REDACTED — keys were present during audit but removed from this report]

**Impact:** Full compromise of database, email sending, billing, and AI services.

**Remediation:**
1. **Rotate ALL keys immediately.** Every key listed above should be considered compromised since they were read during this audit.
2. Store secrets in Vercel Environment Variables (encrypted at rest), never in `.env.local` for production.
3. Add `.env.local` to `.claude/settings.json` deny-read list to prevent agent access.
4. Consider using a secrets manager (e.g., Vercel's built-in, Doppler, or 1Password CLI) for local dev.

---

#### C2. Subscribe Endpoint Has No Rate Limiting
**File:** `src/app/api/subscribe/route.ts`
**CVSS:** 7.5 (High)
**Category:** Security Misconfiguration (OWASP A05)

The subscribe endpoint defines a `subscribeLimit` in `src/server/lib/rate-limit.ts` (3 requests/hour/IP) but **never imports or calls it**. The route handler has zero rate limiting.

**Impact:** An attacker can:
- Spam unlimited signup requests, flooding the database with fake emails
- Abuse the Resend API to send unlimited emails (welcome email + founder notification per request), potentially exhausting the Resend quota or getting the domain blacklisted
- Perform email bombing against arbitrary addresses (the `email` field is user-controlled and receives an email)

**Remediation:**
```typescript
import { checkRateLimit, subscribeLimit } from '@/server/lib/rate-limit'

// At the top of the POST handler:
const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
const { success } = await checkRateLimit(subscribeLimit, ip)
if (!success) {
  return NextResponse.json(
    { error: 'Too many requests. Try again later.' },
    { status: 429 }
  )
}
```

---

#### C3. Email-Based HTML Injection in Founder Notification
**File:** `src/app/api/subscribe/route.ts:57-62`
**CVSS:** 7.3 (High)
**Category:** Injection (OWASP A03)

The founder notification email interpolates the raw user-supplied `email` directly into HTML:

```typescript
html: `<p>New signup: <strong>${email}</strong></p><p>Time: ${new Date().toISOString()}</p>`
```

An attacker can submit an email like `<img src=x onerror=alert(1)>@example.com` or more sophisticated payloads. While most email clients sanitize HTML, some do not, and this pattern is categorically unsafe.

**Impact:** HTML injection in founder's email client. Could be escalated to phishing or credential theft depending on the email client.

**Remediation:**
HTML-encode the email before interpolation:
```typescript
function escapeHtml(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}
// ...
html: `<p>New signup: <strong>${escapeHtml(email)}</strong></p>...`
```

---

### HIGH

#### H1. Rate Limiting Silently Disabled When Redis Is Unavailable
**File:** `src/server/lib/rate-limit.ts:14-28`
**CVSS:** 7.5 (High)
**Category:** Security Misconfiguration (OWASP A05)

If `UPSTASH_REDIS_REST_URL` or `UPSTASH_REDIS_REST_TOKEN` are not set, `getRedis()` returns `null`, and all rate limiters become `null`. The `checkRateLimit` function then returns `{ success: true }` unconditionally -- **rate limiting is silently disabled**.

**Observed:** The `.env.local` file does not contain `UPSTASH_REDIS_REST_URL` or `UPSTASH_REDIS_REST_TOKEN`. This means **all rate limiting is currently disabled in the development environment**, and if these env vars are missing in production, it will be disabled there too.

**Impact:** All rate-limited endpoints (screentime upload, subscribe, quiz) are unprotected against abuse, brute force, and resource exhaustion.

**Remediation:**
1. Add Upstash Redis credentials to all environments.
2. Fail closed -- if Redis is unavailable, reject requests rather than allowing them:
```typescript
export async function checkRateLimit(limiter: Ratelimit | null, identifier: string) {
  if (!limiter) {
    console.error('Rate limiter unavailable -- rejecting request')
    return { success: false }
  }
  return limiter.limit(identifier)
}
```
3. Add monitoring/alerting for rate limiter availability.

---

#### H2. Legacy Analyze-Screenshot Route Has No Validation or Rate Limiting
**File:** `src/app/api/analyze-screenshot/route.ts`
**CVSS:** 6.5 (Medium)
**Category:** Security Misconfiguration (OWASP A05)

This appears to be an older mock endpoint that was superseded by `/api/upload/screentime`. It accepts arbitrary file uploads with:
- No file type validation
- No file size validation
- No rate limiting
- Returns hardcoded mock data

**Impact:** Even though it returns mock data, it accepts arbitrary uploads to server memory (via `formData`), enabling memory exhaustion attacks. Its existence increases attack surface unnecessarily.

**Remediation:** Delete this file entirely. The real endpoint at `/api/upload/screentime/route.ts` is the active implementation.

---

#### H3. Checkout Endpoint Has No Rate Limiting
**File:** `src/app/api/billing/checkout/route.ts`
**CVSS:** 6.5 (Medium)
**Category:** Security Misconfiguration (OWASP A05)

The checkout endpoint creates Stripe Checkout sessions without any rate limiting. While Stripe has its own rate limits (100 requests/second in test mode, higher in live), an attacker can:
- Create thousands of pending checkout sessions, cluttering the Stripe dashboard
- Enumerate valid price IDs
- Abuse the `starter` path to insert unlimited subscriber rows into the database

**Remediation:** Add rate limiting (e.g., 10 requests per minute per IP) to this endpoint.

---

#### H4. No CSRF Protection on API Routes
**File:** All API routes
**CVSS:** 6.1 (Medium)
**Category:** Cross-Site Request Forgery

Next.js App Router API routes do not include CSRF protection by default. All POST endpoints (`/api/subscribe`, `/api/upload/screentime`, `/api/billing/checkout`) can be called from any origin via a simple fetch or form submission.

**Impact:** An attacker can craft a malicious page that submits requests to these endpoints on behalf of a visitor. For the subscribe endpoint, this means signing up arbitrary visitors' sessions. For checkout, it means creating checkout sessions.

**Remediation:**
1. Verify the `Origin` or `Referer` header matches the expected domain:
```typescript
const origin = request.headers.get('origin')
if (origin && !origin.endsWith('meldar.ai')) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```
2. Alternatively, use a custom header check (e.g., `X-Requested-With`) that browsers won't send cross-origin without CORS preflight.

---

#### H5. Email Validation Is Too Permissive
**File:** `src/app/api/subscribe/route.ts:10`
**CVSS:** 5.3 (Medium)
**Category:** Improper Input Validation (OWASP A03)

Email validation is just `!email.includes('@')`. This accepts inputs like `@`, `<script>@`, or extremely long strings. The checkout route uses Zod's `z.string().email()` properly, but the subscribe route does not.

**Impact:** Junk data in the database; potential for injection in downstream email systems; the email is passed directly to Resend which will attempt delivery to malformed addresses.

**Remediation:** Use Zod validation consistent with the checkout route:
```typescript
const schema = z.object({
  email: z.string().email().max(254),
  founding: z.boolean().optional(),
})
const parsed = schema.safeParse(body)
if (!parsed.success) {
  return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
}
```

---

### MEDIUM

#### M1. Missing Content-Security-Policy Header
**File:** `next.config.ts`
**CVSS:** 4.7 (Medium)
**Category:** Security Misconfiguration (OWASP A05)

The security headers include `X-Content-Type-Options`, `X-Frame-Options`, `HSTS`, `Referrer-Policy`, and `Permissions-Policy`, but **no Content-Security-Policy (CSP)**. CSP is the primary defense against XSS attacks.

**Impact:** If an XSS vulnerability is introduced (e.g., via user-generated content), there is no CSP to mitigate it.

**Remediation:** Add a CSP header. Start with a report-only policy:
```typescript
{
  key: 'Content-Security-Policy',
  value: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self' https://www.google-analytics.com https://api.stripe.com",
    "frame-src https://js.stripe.com",
    "font-src 'self'",
  ].join('; ')
}
```

---

#### M2. Error Logging May Leak Sensitive Context
**Files:** `src/app/api/subscribe/route.ts:66`, `src/app/api/upload/screentime/route.ts:113`
**CVSS:** 4.0 (Medium)
**Category:** Sensitive Data Exposure (OWASP A02)

Both catch blocks log the full error object via `console.error`. On Vercel, these logs are visible in the dashboard and may contain:
- Database connection strings (in Drizzle errors)
- API key fragments (in Anthropic/Resend errors)
- User email addresses (in the error context)
- Stack traces revealing internal architecture

**Impact:** PII or secrets could appear in log aggregators accessible to anyone with Vercel project access.

**Remediation:**
```typescript
console.error('Subscribe error:', error instanceof Error ? error.message : 'Unknown error')
```
Never log the full error object in production. Use structured logging with PII scrubbing.

---

#### M3. IP Extraction Spoofable via x-forwarded-for
**File:** `src/app/api/upload/screentime/route.ts:17`
**CVSS:** 3.7 (Low)
**Category:** Security Misconfiguration (OWASP A05)

The rate limiter uses `x-forwarded-for` to identify clients. This header can be spoofed by attackers to bypass rate limiting by sending a different IP in each request.

**Impact:** Rate limiting can be trivially bypassed.

**Remediation:** On Vercel, use the `x-real-ip` header or `request.ip` (Next.js provides this on `NextRequest`), which Vercel sets from the actual connecting IP and cannot be spoofed:
```typescript
const ip = request.ip || request.headers.get('x-real-ip') || 'unknown'
```

---

#### M4. File Upload Content Sniffing Not Validated
**File:** `src/app/api/upload/screentime/route.ts:41`
**CVSS:** 3.7 (Low)
**Category:** Unrestricted File Upload (OWASP A04)

The upload route checks `file.type` (MIME type from the `Content-Type` header set by the browser), but this is trivially spoofable. An attacker can upload any file (e.g., an HTML file, a ZIP bomb, or a polyglot) with a fake MIME type of `image/png`.

The file is then converted to base64 and sent to the Anthropic API, so it does not get served back to users -- limiting the impact. However, a crafted file could potentially cause issues in the Vision API or consume excessive resources.

**Impact:** Low due to the file being processed server-side only and not served. But could be used for resource exhaustion.

**Remediation:** Validate magic bytes (file signature) in addition to the MIME type:
```typescript
const PNG_MAGIC = [0x89, 0x50, 0x4E, 0x47]
const JPEG_MAGIC = [0xFF, 0xD8, 0xFF]
const WEBP_MAGIC = [0x52, 0x49, 0x46, 0x46] // RIFF

const bytes = new Uint8Array(buffer.slice(0, 4))
const isValidImage = /* check against magic bytes */
```

---

#### M5. Webhook Endpoint Does Not Restrict HTTP Methods
**File:** `src/app/api/billing/webhook/route.ts`
**CVSS:** 3.1 (Low)
**Category:** Security Misconfiguration (OWASP A05)

The webhook route only exports `POST`, which is correct for Next.js App Router (other methods auto-return 405). This is acceptable. However, the route does not validate that the event type is one it expects before processing.

Currently it only handles `checkout.session.completed`, but if new event types are added to the Stripe webhook configuration, they would be silently ignored. This is not a vulnerability per se, but a robustness concern.

**No remediation needed** -- the current behavior is acceptable.

---

### LOW / INFORMATIONAL

#### L1. Sentry Dependency Installed But Not Configured
**File:** `package.json` (`@sentry/nextjs: ^10.46.0`)
**CVSS:** Informational
**Category:** Security Misconfiguration

Sentry is listed as a dependency but no Sentry configuration files (`sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`) or DSN exist in the codebase. This is dead weight that increases bundle size and attack surface.

**Remediation:** Either configure Sentry properly or remove the dependency: `pnpm remove @sentry/nextjs`.

---

#### L2. JsonLd Component Properly Escapes Output
**File:** `src/shared/ui/JsonLd.tsx`
**CVSS:** Informational (No issue)

The `JsonLd` component uses `dangerouslySetInnerHTML` but applies `.replace(/</g, '\\u003c')` to prevent script injection via JSON-LD. This is the correct mitigation. No issue.

---

#### L3. GoogleAnalytics Uses Environment Variable in Template Literal
**File:** `src/features/analytics/ui/GoogleAnalytics.tsx:36`
**CVSS:** Informational (No issue)

`GA_ID` is sourced from `NEXT_PUBLIC_GA_ID` (a build-time constant), not user input. No injection risk.

---

#### L4. Database Has No Row-Level Security
**File:** `src/server/db/schema.ts`
**CVSS:** Informational
**Category:** Broken Access Control (OWASP A01)

There is no authentication system yet, so no row-level access control exists. X-ray results are accessible by their nanoid (12-character URL-safe string = ~71 bits of entropy), which provides adequate security-by-obscurity for a PoC.

**Remediation (when auth is added):** Ensure X-ray results, audit orders, and subscriber data are scoped to authenticated users. Add a `userId` column to all tables.

---

#### L5. GDPR: Screenshot Data Lifecycle
**File:** `src/app/api/upload/screentime/route.ts`
**CVSS:** Informational
**Category:** GDPR Compliance

The screenshot itself is processed in-memory (converted to base64, sent to Anthropic API) and is **not persisted to disk or database** -- only the extracted structured data is stored. This is good. However:

1. The base64 image is sent to Anthropic's API, which may retain it per their data retention policy. Under GDPR, Anthropic is a data processor and a DPA (Data Processing Agreement) should be in place.
2. The extracted app usage data in `xray_results` has an `expiresAt` column (30 days), but **there is no cron job or mechanism to actually delete expired rows**.

**Remediation:**
1. Verify Anthropic DPA covers EU data processing.
2. Implement a scheduled job to delete expired `xray_results` rows: `DELETE FROM xray_results WHERE expires_at < NOW()`.
3. Document the data flow in the privacy policy (what goes to Anthropic, retention period).

---

## Summary Table

| ID | Severity | Title | CVSS | Status |
|----|----------|-------|------|--------|
| C1 | CRITICAL | Secrets readable by agents/tools | 9.1 | Open |
| C2 | CRITICAL | Subscribe endpoint has no rate limiting | 7.5 | Open |
| C3 | CRITICAL | HTML injection in founder notification email | 7.3 | Open |
| H1 | HIGH | Rate limiting silently disabled without Redis | 7.5 | Open |
| H2 | HIGH | Legacy analyze-screenshot route unprotected | 6.5 | Open |
| H3 | HIGH | Checkout endpoint has no rate limiting | 6.5 | Open |
| H4 | HIGH | No CSRF protection on API routes | 6.1 | Open |
| H5 | HIGH | Email validation too permissive in subscribe | 5.3 | Open |
| M1 | MEDIUM | Missing Content-Security-Policy header | 4.7 | Open |
| M2 | MEDIUM | Error logging may leak sensitive context | 4.0 | Open |
| M3 | MEDIUM | IP extraction spoofable via x-forwarded-for | 3.7 | Open |
| M4 | MEDIUM | File upload content sniffing not validated | 3.7 | Open |
| L1 | LOW | Sentry dependency installed but not configured | Info | Open |
| L4 | LOW | No row-level security (acceptable for PoC) | Info | Open |
| L5 | LOW | GDPR: No expired data deletion mechanism | Info | Open |

---

## Recommended Priority

**Immediate (before any production traffic):**
1. **C1** -- Rotate all secrets now
2. **C2** -- Add rate limiting to subscribe endpoint
3. **C3** -- Escape HTML in founder notification
4. **H1** -- Fail closed when Redis unavailable
5. **H2** -- Delete legacy analyze-screenshot route

**Before launch with real payments:**
6. **H3** -- Rate limit checkout endpoint
7. **H4** -- Add CSRF/origin checks
8. **H5** -- Use Zod validation in subscribe
9. **M1** -- Add Content-Security-Policy

**Before scaling:**
10. **M2** -- Sanitize error logs
11. **M3** -- Use `request.ip` instead of `x-forwarded-for`
12. **M4** -- Validate file magic bytes
13. **L5** -- Implement expired data cleanup
