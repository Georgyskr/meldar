# Code Review: Meldar PoC New Code

**Reviewer:** Code Reviewer Agent
**Date:** 2026-03-30
**Scope:** `src/server/`, `src/app/api/`, `src/entities/xray-result/`, `src/features/screenshot-upload/`, `src/features/billing/`, `src/features/founding-program/`, `src/app/xray/`, `src/app/thank-you/`, `src/app/coming-soon/`, `src/shared/config/stripe.ts`, `drizzle.config.ts`

---

## BLOCKERS

### B1. Stripe module-level crash without env var

**File:** `src/server/billing/stripe.ts:3-5`

```ts
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set')
}
```

This runs at **module evaluation time**. Any file that imports `stripe` (directly or transitively) will crash the entire process if `STRIPE_SECRET_KEY` is missing -- including during builds, tests, or any server component that doesn't need Stripe. The checkout route already lazily imports `getDb` in one branch but eagerly imports `stripe` at the top.

**Fix:** Use a lazy getter pattern like `getDb()` does, or move the check inside a `getStripe()` function.

---

### B2. Subscribe route has no rate limiting

**File:** `src/app/api/subscribe/route.ts`

A `subscribeLimit` rate limiter exists in `src/server/lib/rate-limit.ts` but the subscribe route never uses it. This endpoint sends two emails per request (Resend). An attacker can spam this endpoint to exhaust your Resend quota, generate email bounce storms, and abuse your sender reputation.

**Fix:** Import and apply `checkRateLimit(subscribeLimit, ip)` at the top of the POST handler, mirroring the screentime upload route.

---

### B3. Subscribe route lacks input validation via Zod

**File:** `src/app/api/subscribe/route.ts:8-10`

```ts
const { email, founding } = await request.json()
if (!email || typeof email !== 'string' || !email.includes('@')) {
```

Manual email validation with `includes('@')` is insufficient -- `"@"` alone passes. The rest of the codebase uses Zod for validation (checkout route, entity types). This route also blindly destructures `request.json()` which can throw on malformed JSON with no structured error response.

**Fix:** Add a Zod schema (`z.object({ email: z.string().email(), founding: z.boolean().optional() })`) and handle JSON parse errors.

---

### B4. XSS vector in subscribe welcome email

**File:** `src/app/api/subscribe/route.ts:60`

```ts
html: `<p>New signup: <strong>${email}</strong></p>...`
```

The founder notification email injects the raw user-supplied `email` value directly into HTML without escaping. A malicious email value like `"><script>alert(1)</script>` would be rendered as HTML in the founder's email client. The same issue applies to the welcome email subject line (less exploitable, but still unsanitized input).

**Fix:** HTML-escape the email before interpolation, or use a text-based email for the founder notification.

---

### B5. Webhook does not return 200 for unhandled event types early enough

**File:** `src/app/api/billing/webhook/route.ts:29-65`

If the webhook receives an event type other than `checkout.session.completed`, it falls through all the conditionals and returns `{ received: true }` with a 200. This is technically correct, but the route has no error handling inside the DB operations. If `db.insert(auditOrders)` throws (e.g., constraint violation on a non-unique field, or DB connection failure), the webhook returns 500 and **Stripe will retry** the event up to ~16 times over 3 days, potentially creating duplicate orders if the first insert succeeded but the second `db.insert(subscribers)` failed.

**Fix:** Wrap the DB operations in a transaction, or at minimum add try/catch inside the `checkout.session.completed` handler to always return 200 to Stripe and log the error for manual investigation.

---

### B6. Dead route: `src/app/api/analyze-screenshot/route.ts`

**File:** `src/app/api/analyze-screenshot/route.ts`

This is the old mock endpoint with hardcoded data and `setTimeout(r, 1500)`. The real implementation now lives at `/api/upload/screentime`. This dead route is still accessible in production and returns fake data to anyone who hits it. It can mislead developers and is a confusing surface area.

**Fix:** Delete this file entirely.

---

## SUGGESTIONS

### S1. FSD violation: barrel bypass in multiple files

**Files:**
- `src/app/xray/xray-client.tsx:6-7` imports from `@/entities/xray-result/ui/XRayCard` instead of `@/entities/xray-result`
- `src/app/xray/[id]/page.tsx:5-7` imports from `@/entities/xray-result/model/types` and `@/entities/xray-result/ui/XRayCard`
- `src/app/xray/[id]/og/route.tsx:3` imports from `@/entities/xray-result/model/types`
- `src/features/screenshot-upload/ui/UploadZone.tsx:6` imports from `@/entities/xray-result/model/types`
- `src/features/billing/ui/UpsellBlock.tsx:2` imports from `@/entities/xray-result/model/types`
- `src/server/discovery/*.ts` imports from `@/entities/xray-result/model/types`

Per CLAUDE.md: "Import from barrels, not internal files." All of these should import from `@/entities/xray-result` (the barrel at `index.ts`). The barrel already exports `XRayCard`, `XRayCardActions`, and all types.

---

### S2. `src/server/` sits outside the FSD layer hierarchy

The `src/server/` directory is not part of the defined FSD layers (`app > widgets > features > entities > shared`). Server code in `src/server/discovery/` imports from `@/entities/xray-result/model/types`, which means server code depends on the entities layer. This is architecturally fine (server utilities are like shared infrastructure), but the layer should be documented in CLAUDE.md or moved under `src/shared/server/` to formalize its position.

---

### S3. Database connection created per-request with no pooling

**File:** `src/server/db/client.ts`

`getDb()` creates a new `neon()` + `drizzle()` instance on every call. For Neon's HTTP driver (`@neondatabase/serverless` with `neon-http`), each call is a stateless HTTP request, so there's no TCP connection leak -- but there's also no connection reuse. For serverless (Vercel), this is acceptable, but if request volume grows, consider using the WebSocket driver with connection pooling or caching the drizzle instance at module level.

---

### S4. `FoundingCounter` queries DB directly from a feature-layer component

**File:** `src/features/founding-program/ui/FoundingCounter.tsx:3-4`

This React Server Component directly imports `getDb` and `subscribers` from `@/server/db/`. Feature-layer components should not directly access the database. The DB query should be extracted to a server function or data access layer and passed via props or called from the `app` layer.

---

### S5. Checkout route inconsistently uses dynamic imports

**File:** `src/app/api/billing/checkout/route.ts:29-30`

```ts
const { getDb } = await import('@/server/db/client')
const { subscribers } = await import('@/server/db/schema')
```

The `starter` branch dynamically imports DB modules while other code paths import them statically. If the reason is to avoid loading DB code when not needed, all DB imports should be dynamic. If not, use static imports consistently. The subscribe route (`src/app/api/subscribe/route.ts:15-16`) does the same thing inconsistently.

---

### S6. No expiration enforcement for X-Ray results

**File:** `src/server/db/schema.ts:28-30`

The `xrayResults` table has an `expiresAt` column with a 30-day default, and there's an index on it, but no cron job, scheduled task, or TTL mechanism to actually delete expired rows. Without cleanup, the table will grow indefinitely and expired X-Rays remain accessible via their shareable URLs.

---

### S7. `handleShare` does not handle errors

**File:** `src/entities/xray-result/ui/XRayCardActions.tsx:11-20`

`navigator.share()` can throw (user cancels the share dialog, or the browser rejects the share). The async function has no try/catch, which will produce an unhandled promise rejection.

---

### S8. Checkout route missing rate limiting

**File:** `src/app/api/billing/checkout/route.ts`

The checkout endpoint creates Stripe checkout sessions. Without rate limiting, an attacker can generate thousands of Stripe sessions. Consider adding a rate limiter similar to the screentime upload route.

---

## NITS

### N1. Unused `ExternalLink` import semantic mismatch

**File:** `src/entities/xray-result/ui/XRayCardActions.tsx:4`

`ExternalLink` icon is used for the "Copy link" action, but `Copy` icon is used for the "Copied!" state. The semantics are swapped -- `Copy` should be the default icon, and a checkmark or `ExternalLink` for the confirmation state.

---

### N2. `subscribers` table builder has empty index callback

**File:** `src/server/db/schema.ts:68`

```ts
(_table) => [],
```

The `subscribers` table has no indexes but has a `unique()` constraint on `email` which implicitly creates one. The empty callback is harmless but unnecessary. Either remove it or add an explicit index on `foundingMember` if you query by it (which `FoundingCounter` does via `where(eq(subscribers.foundingMember, true))`).

---

### N3. `compressImage` always outputs JPEG

**File:** `src/features/screenshot-upload/ui/UploadZone.tsx:208-209`

When compressing, the function always converts to `image/jpeg` regardless of input format. This means a PNG screenshot with transparency will get a black background. For screen time screenshots this is likely fine, but the MIME type sent to the server will be `image/jpeg` even though the server accepts PNG/WebP.

---

### N4. Hardcoded founder email

**File:** `src/app/api/subscribe/route.ts:59`

```ts
to: 'gosha.skryuchenkov@gmail.com',
```

Consider moving this to an environment variable (e.g., `FOUNDER_EMAIL`) for easier configuration across environments.

---

### N5. OG image uses inline styles (acceptable for `ImageResponse`)

**File:** `src/app/xray/[id]/og/route.tsx`

The OG image route uses inline `style` objects. This is correct and required for `next/og` `ImageResponse` (it only supports inline styles), but worth noting it's an intentional exception to the "no inline styles" rule in CLAUDE.md.

---

### N6. `drizzle.config.ts` uses non-null assertion

**File:** `drizzle.config.ts:11`

```ts
url: process.env.DATABASE_URL!,
```

This will silently pass `undefined` to the driver if the env var is missing. The `getDb()` function handles this properly with a runtime check, but `drizzle-kit` commands (migrations) will fail with a confusing error. Consider adding a guard or using `config()` result to verify.

---

### N7. `from` email address uses Resend test domain

**File:** `src/app/api/subscribe/route.ts:29`

```ts
from: 'Meldar <onboarding@resend.dev>',
```

This uses Resend's shared test domain. For production, this should be `onboarding@meldar.ai` (or similar) with proper DNS records (SPF/DKIM). Emails from `@resend.dev` may not be deliverable to all recipients and hurt sender reputation.

---

## Summary

| Severity | Count |
|----------|-------|
| BLOCKER  | 6     |
| SUGGESTION | 8   |
| NIT      | 7     |

**Top priorities:**
1. Fix Stripe module-level crash (B1)
2. Add rate limiting to subscribe route (B2)
3. Fix XSS in founder notification email (B4)
4. Add transaction/idempotency to webhook handler (B5)
5. Delete dead analyze-screenshot route (B6)
6. Fix barrel bypass imports for FSD compliance (S1)
