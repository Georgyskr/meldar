# DevOps & Infrastructure Review -- Meldar PoC

**Date:** 2026-03-30
**Reviewer:** DevOps Agent
**Scope:** Deployment readiness, environment variables, CI/CD, monitoring, security, database strategy

---

## Executive Summary

The app is **close to deployable on Vercel** but has several issues that would cause failures or security gaps on first deploy. The most critical: Stripe module-level initialization will crash the build if `STRIPE_SECRET_KEY` is missing, Sentry is installed but completely unconfigured, CLAUDE.md documents only 2 of 7 required env vars, and there is no CI/CD pipeline.

---

## 1. Deployability to Vercel

**Verdict: Will fail on first deploy without all env vars configured.**

### Blocking Issues

| Issue | Severity | Details |
|-------|----------|---------|
| **Stripe top-level throw** | CRITICAL | `src/server/billing/stripe.ts:3-4` throws at module load if `STRIPE_SECRET_KEY` is unset. Since this module is imported by the webhook and checkout routes, Next.js will fail to compile these routes during build if the env var is missing from Vercel's environment. |
| **Anthropic SDK implicit env var** | HIGH | `src/server/discovery/ocr.ts:8` creates `new Anthropic()` which reads `ANTHROPIC_API_KEY` from env at runtime. This is present in `.env.local` but not documented in CLAUDE.md. If missing in Vercel, screenshot analysis will fail silently or throw. |
| **No `vercel.json`** | LOW | Not strictly required -- Vercel auto-detects Next.js. But useful for function region pinning (should be `eu-central-1` to match Neon DB region). |

### Recommendation

Wrap the Stripe initialization in a lazy getter (same pattern as `getDb()`) to avoid build-time crashes:

```ts
// Instead of top-level throw
let _stripe: Stripe | null = null
export function getStripe() {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set')
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  }
  return _stripe
}
```

---

## 2. Environment Variables

### Inventory

| Variable | In `.env.local` | In CLAUDE.md | Used In | Required for Build |
|----------|-----------------|--------------|---------|-------------------|
| `NEXT_PUBLIC_GA_ID` | Yes | Yes | `GoogleAnalytics.tsx` | No (graceful) |
| `RESEND_API_KEY` | Yes | Yes | `subscribe/route.ts` | No (runtime only) |
| `DATABASE_URL` | Yes | **No** | `db/client.ts`, `drizzle.config.ts` | No (lazy) |
| `STRIPE_SECRET_KEY` | Yes | **No** | `billing/stripe.ts` | **Yes (top-level throw)** |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes | **No** | Client-side checkout | No |
| `STRIPE_WEBHOOK_SECRET` | Yes | **No** | `webhook/route.ts` | No (runtime check) |
| `ANTHROPIC_API_KEY` | Yes | **No** | `discovery/ocr.ts` (implicit) | No (runtime only) |
| `UPSTASH_REDIS_REST_URL` | **No** | **No** | `rate-limit.ts` | No (graceful null) |
| `UPSTASH_REDIS_REST_TOKEN` | **No** | **No** | `rate-limit.ts` | No (graceful null) |

### Issues

1. **CLAUDE.md is stale** -- only documents 2 of 9 env vars. Should list all with descriptions.
2. **No `.env.example`** -- new developers have no template. Should create one with placeholder values.
3. **Upstash vars missing from `.env.local`** -- rate limiting is silently disabled in dev.
4. **No `SENTRY_DSN`** -- Sentry is in `package.json` but has zero configuration (see Monitoring section).

---

## 3. CI/CD Pipeline

**Verdict: None exists.** No `.github/workflows/` directory.

### Recommended Minimum Pipeline

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm biome check .
      - run: pnpm panda codegen
      - run: pnpm build
```

This catches lint errors and build failures before merge. Vercel preview deploys handle the rest.

---

## 4. Monitoring (Sentry)

**Verdict: Installed but completely unconfigured.**

- `@sentry/nextjs@^10.46.0` is in `package.json`
- No `sentry.client.config.ts`, `sentry.server.config.ts`, or `sentry.edge.config.ts` files exist
- No `SENTRY_DSN` env var
- No `withSentryConfig` wrapper in `next.config.ts`
- No `@sentry` imports anywhere in `src/`

**Impact:** Sentry is dead weight. Runtime errors in production will be invisible -- you'll only know something is wrong if a user reports it.

### Recommendation

Either configure Sentry properly (run `npx @sentry/wizard@latest -i nextjs`) or remove `@sentry/nextjs` from dependencies to reduce bundle size. Don't ship an unconfigured monitoring SDK.

---

## 5. Rate Limiting

**Verdict: Graceful degradation, but silently disabled without Upstash.**

The implementation in `src/server/lib/rate-limit.ts` is well-designed:

- Returns `null` limiters when Redis env vars are missing
- `checkRateLimit()` returns `{ success: true }` for null limiters
- Three separate limiters: screentime (5/min), subscribe (3/hr), quiz (10/min)

### Concerns

1. **Silent bypass** -- No logging when rate limiting is disabled. In production without Upstash configured, all endpoints are unprotected. Add a `console.warn` at startup if Redis is unavailable.
2. **No Upstash env vars in `.env.local`** -- Rate limiting has never been tested locally.
3. **IP extraction** relies on `x-forwarded-for` which Vercel provides, but the `|| 'unknown'` fallback means a missing header would share a single rate limit bucket across all requests.

---

## 6. Stripe Webhook

**Verdict: Signature verification is correct. URL configuration needed.**

### What's Good
- Properly reads raw body with `request.text()` (not `.json()`)
- Verifies signature via `stripe.webhooks.constructEvent()`
- Returns 401 on missing/invalid signature
- Uses `onConflictDoNothing()` for idempotency

### Issues

| Issue | Severity | Details |
|-------|----------|---------|
| **Webhook URL not set in Stripe** | HIGH | You must register `https://meldar.ai/api/billing/webhook` in the Stripe Dashboard (Developers > Webhooks). The test secret `whsec_BO2BM0lfXzCCSkV69kPI7Ha4tGFFu0OB` in `.env.local` is for Stripe CLI local testing only -- production needs a different secret. |
| **No event type filtering** | LOW | Only handles `checkout.session.completed`. Consider explicitly returning 200 for unhandled event types with a log, rather than falling through silently. |
| **Email in notification** | MEDIUM | `src/app/api/subscribe/route.ts:59` sends notification to hardcoded `gosha.skryuchenkov@gmail.com`. Should be an env var for flexibility. |
| **Resend `from` address** | HIGH | Both subscribe and welcome emails use `from: 'Meldar <onboarding@resend.dev>'`. This is Resend's sandbox domain -- emails will be rate-limited and may land in spam. You need a verified custom domain (e.g., `noreply@meldar.ai`) in Resend. |

---

## 7. Database Strategy

**Verdict: `drizzle-kit push` is acceptable for PoC but risky for production.**

### Current State
- Schema in `src/server/db/schema.ts` (3 tables: `xray_results`, `audit_orders`, `subscribers`)
- `drizzle.config.ts` outputs migrations to `src/server/db/migrations/` but **no migrations exist**
- `db:push` script uses `drizzle-kit push` (direct schema sync, no migration files)
- `db:generate` script exists but has never been run

### Risks of `push` in Production
- No rollback capability
- No audit trail of schema changes
- Can silently drop columns/data if schema diverges
- Unsafe with multiple developers or CI/CD

### Recommendation
For the current PoC stage, `push` is fine. Before adding a second developer or any production data you care about:
1. Run `pnpm db:generate` to create the initial migration
2. Switch to `drizzle-kit migrate` in production
3. Add `db:migrate` to the build step or a separate deploy hook

---

## 8. Security Headers

**Verdict: Good baseline, missing CSP.**

### Current Headers (`next.config.ts`)

| Header | Value | Status |
|--------|-------|--------|
| `X-Content-Type-Options` | `nosniff` | Good |
| `X-Frame-Options` | `DENY` | Good |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Good |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Good |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Good (2 years) |
| `X-DNS-Prefetch-Control` | `on` | Good |
| **Content-Security-Policy** | **Missing** | **Gap** |

### Missing CSP

No `Content-Security-Policy` header is configured. This leaves the app vulnerable to XSS via injected scripts. A starter CSP for this stack:

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://js.stripe.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self';
connect-src 'self' https://www.google-analytics.com https://api.stripe.com;
frame-src https://js.stripe.com;
```

Note: Next.js requires `'unsafe-inline'` for styles and `'unsafe-eval'` in dev mode. Consider using nonces for scripts in production.

---

## 9. What Would Break on First Deploy

Prioritized list of issues that would cause failures:

| Priority | Issue | Impact | Fix |
|----------|-------|--------|-----|
| P0 | `STRIPE_SECRET_KEY` not set in Vercel | Build crash | Add to Vercel env vars; refactor to lazy init |
| P0 | Database not provisioned / `DATABASE_URL` missing | All DB writes fail (subscribe, webhook, xray) | Add to Vercel env vars |
| P1 | `ANTHROPIC_API_KEY` missing | Screenshot analysis fails | Add to Vercel env vars |
| P1 | Stripe webhook URL not registered | Payments processed but never recorded in DB | Register in Stripe Dashboard |
| P1 | Resend sandbox `from` address | Emails rate-limited, land in spam | Verify `meldar.ai` domain in Resend |
| P1 | No database tables created | All inserts fail with "relation does not exist" | Run `pnpm db:push` against production Neon |
| P2 | Sentry unconfigured | No error visibility | Configure or remove |
| P2 | No Upstash Redis | Rate limiting silently disabled | Set up Upstash or accept the risk |
| P2 | No CSP header | XSS risk | Add Content-Security-Policy |
| P3 | No CI pipeline | Lint/build errors only caught on Vercel | Add GitHub Actions workflow |
| P3 | Function region mismatch | Higher latency if Vercel functions run outside `eu-central-1` | Add `vercel.json` with region config |

---

## 10. Additional Observations

1. **Duplicate screenshot endpoints** -- Both `api/analyze-screenshot/route.ts` (mock, 37 lines) and `api/upload/screentime/route.ts` (real, 119 lines) exist. The mock endpoint should be removed before production.

2. **Hardcoded Stripe price IDs** -- `src/shared/config/stripe.ts` contains test-mode price IDs (`price_1TG...`). These will need to be swapped for live-mode IDs before accepting real payments, ideally via env vars.

3. **No health check endpoint** -- Consider adding `api/health/route.ts` that pings the database. Useful for uptime monitoring.

4. **Image optimization** -- `next.config.ts` sets `minimumCacheTTL: 31536000` (1 year). Good for production, but ensure you have cache-busting for updated assets.

5. **No `vercel.json`** -- The Neon database is in `eu-central-1`. Without explicit region configuration, Vercel may deploy functions to a US region, adding ~100ms latency to every DB call.

---

## Summary Scorecard

| Category | Score | Notes |
|----------|-------|-------|
| Deployability | 6/10 | Will deploy with correct env vars, but Stripe init pattern is fragile |
| Env Var Documentation | 3/10 | Only 2 of 9 documented |
| CI/CD | 0/10 | Nothing exists |
| Monitoring | 1/10 | Sentry installed, not configured |
| Rate Limiting | 7/10 | Good pattern, needs Redis to actually work |
| Webhook Security | 8/10 | Solid implementation |
| Database Strategy | 6/10 | Fine for PoC, needs migrations before scaling |
| Security Headers | 7/10 | Good baseline, needs CSP |
| **Overall Readiness** | **5/10** | Functional PoC, not production-hardened |
