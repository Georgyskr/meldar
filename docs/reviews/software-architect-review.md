# Software Architecture Review: Meldar PoC

**Reviewer:** Software Architect Agent
**Date:** 2026-03-30
**Scope:** PoC implementation (Phase 1) vs. MELDAR-PLAN-FINAL.md
**Verdict:** Solid foundation with a few structural issues to fix before Phase 2

---

## 1. Plan Conformance

### Implemented (matches plan)

| Planned Item | Status | Notes |
|---|---|---|
| 3-table schema (xray_results, audit_orders, subscribers) | Done | Matches plan exactly, including indexes |
| Neon serverless + Drizzle ORM | Done | HTTP driver, no connection pooling needed |
| Claude Vision OCR via tool_use | Done | Haiku 4.5, forced tool call, Zod validation |
| Rule-based insights (4 rules) | Done | Zero AI cost, matches plan thresholds |
| Upsell hook generation (5 triggers) | Done | Maps to correct tiers |
| Pain point mapping | Done | Dictionary lookup, correct file location |
| Stripe Checkout (one-time payments) | Done | Time Audit + App Build + Starter (coming soon) |
| Stripe webhook handler | Done | checkout.session.completed, writes to both tables |
| Rate limiting (Upstash Redis) | Done | 3 limiters with correct windows |
| Screenshot upload with client-side compression | Done | OffscreenCanvas, 1568px max, JPEG 85% |
| Shareable X-Ray URL `/xray/[id]` | Done | Server-rendered with DB fetch |
| Dynamic OG image `/xray/[id]/og` | Done | ImageResponse, branded |
| X-Ray card UI component | Done | Matches Data Receipt section design |
| Founding 50 counter (live from DB) | Done | RSC, real count query |
| Email capture + Resend integration | Done | Welcome email + founder notification |
| Error response format | Done | `{ error: { code, message } }` consistently |

### Missing from plan

| Planned Item | Status | Severity | Notes |
|---|---|---|---|
| `POST /api/quiz/submit` route | Missing | Medium | Plan specifies this as PoC endpoint. Quiz currently exists as client-only feature. |
| Cost cap (Upstash daily spend tracking) | Missing | High | Plan specifies soft ($50) and hard ($500) caps with queue UI fallback. Zero implementation exists. Without this, a viral moment could generate unbounded Anthropic API costs. |
| `GET /api/xray/[id]` API route | Missing | Low | Plan specifies this, but the server-rendered page at `/xray/[id]` serves the same purpose. API route would be needed for mobile/embed use cases but not PoC-critical. |
| File size validation uses 5 MB, plan says 2 MB | Mismatch | Low | `MAX_SIZE` in upload route is 5 MB; plan says 2 MB post-compression. Client compression targets 2 MB, but server accepts up to 5 MB. Harmonize. |
| Sentry error tracking | Missing | Medium | Listed in plan as PoC dependency. `@sentry/nextjs` is in `package.json` but no `sentry.client.config.ts` or `sentry.server.config.ts` found. Dead dependency. |
| Rate limiting in middleware vs. per-route | Differs | Low | Plan says `src/middleware.ts`, implementation puts rate limiting inline in each route handler. Both work; per-route is actually simpler for PoC. |

---

## 2. Bounded Contexts

The plan defines 4 bounded contexts: **Discovery**, **Identity**, **Billing**, **Advice**.

### Assessment

**Discovery** -- Well-implemented. `src/server/discovery/` contains OCR, insights, suggestions, upsells, prompts. Clean separation. The "god context" rule from the plan is respected: all custom logic lives here.

**Billing** -- Properly thin. `src/server/billing/stripe.ts` is a 7-line client wrapper. `src/shared/config/stripe.ts` holds price IDs. Checkout and webhook routes are clean wrappers around Stripe API. No business logic leaking into billing.

**Identity** -- PoC-appropriate. Email is the identity anchor (plan says no auth in PoC). `subscribers` table plus Resend emails. No over-engineering here.

**Advice** -- Not yet implemented (plan defers to Phase 2: manual audit delivery). Correct to omit.

**Cross-context coupling:** Minimal. The webhook handler correctly writes to both `audit_orders` (billing context) and `subscribers` (identity context). This is acceptable for PoC; in MVP, consider an event bus or at least a service function to decouple.

---

## 3. Feature-Sliced Design Assessment

### Layer Compliance

| Layer | Contents | Verdict |
|---|---|---|
| `app/` | Routes, layouts, API handlers | Correct |
| `widgets/` | Header, Footer, Landing sections | Correct (not reviewed in detail, pre-existing) |
| `features/` | screenshot-upload, billing, founding-program, quiz, cookie-consent, analytics | Correct |
| `entities/` | xray-result (model + UI) | Correct |
| `shared/` | config, ui, styles | Correct |

### FSD Violations Found

**1. `src/server/` is an undocumented layer**

The `src/server/` directory (`db/`, `billing/`, `discovery/`, `lib/`) does not appear in the FSD layer hierarchy defined in CLAUDE.md. It acts as a server-side "shared" layer. This is not necessarily wrong -- server code needs to live somewhere -- but it should be explicitly documented as a cross-cutting concern or placed within the existing FSD hierarchy.

Recommendation: Document `src/server/` as a server-only shared layer in CLAUDE.md. It sits at the same level as `shared/` but is server-only.

**2. `FoundingCounter` imports directly from `@/server/db/`**

```
src/features/founding-program/ui/FoundingCounter.tsx
  -> import { getDb } from '@/server/db/client'
  -> import { subscribers } from '@/server/db/schema'
```

A feature-layer component directly imports the database client and schema. This bypasses any abstraction boundary. If the schema changes (e.g., MVP migration merges `subscribers` into `users`), this component breaks.

Recommendation: Extract a `getFoundingCount()` function into `src/server/discovery/` or a new `src/server/identity/` module. The RSC component should call a function, not query the database directly.

**3. Barrel import bypass**

Multiple files import from `@/entities/xray-result/model/types` instead of `@/entities/xray-result` (the barrel). This is documented as a rule in CLAUDE.md: "Import from barrels, not internal files."

Files violating:
- `src/app/xray/[id]/page.tsx`
- `src/app/xray/[id]/og/route.tsx`
- `src/app/xray/xray-client.tsx`
- `src/server/discovery/ocr.ts`
- `src/server/discovery/insights.ts`
- `src/server/discovery/suggestions.ts`
- `src/server/discovery/upsells.ts`
- `src/features/screenshot-upload/ui/UploadZone.tsx`
- `src/features/billing/ui/UpsellBlock.tsx`

The barrel at `src/entities/xray-result/index.ts` exports the types, so these should all import from `@/entities/xray-result`.

**4. No circular dependencies detected**

Checked all import directions. No upward imports found (features importing from widgets, entities importing from features, etc.). The only structural issue is the `server/` layer placement, which is acceptable.

---

## 4. Database Schema

### Normalization

Appropriate for PoC. Three tables, no over-normalization.

**Good decisions:**
- `nanoid(12)` for X-Ray IDs (URL-safe, short for sharing)
- UUID for audit_orders and subscribers (standard, no collision risk)
- `onConflictDoNothing()` for subscriber upserts (idempotent)
- `onDelete: 'set null'` for xray_id foreign keys (X-Ray can expire without breaking orders)
- `expires_at` on xray_results with index (enables cron purge)
- JSONB for `apps` and `suggestions` (flexible, queryable if needed)

**Concerns:**
- `quizPains` is `text[]` but could be JSONB for consistency with other JSON columns. Minor.
- `product` column in audit_orders stores `'time_audit' | 'app_build'` as text -- no enum constraint at DB level. Acceptable for PoC; the Zod schema validates on write.
- `status` columns (`audit_orders.status`, etc.) are unconstrained text. Same reasoning applies.

### MVP Migration Path

The plan's migration path is sound: add nullable `user_id` to existing tables, merge `subscribers` into `users`. The current schema doesn't block this. The `onDelete: 'set null'` on xray_id references is forward-compatible.

---

## 5. API Contracts

### Consistency

All endpoints follow the planned error format: `{ error: { code, message } }`. Status codes are correct (400/401/422/429/500).

**Exception:** `POST /api/subscribe` uses `{ error: 'string' }` instead of `{ error: { code, message } }`. This breaks the contract.

```typescript
// Current (inconsistent):
return NextResponse.json({ error: 'Valid email required' }, { status: 400 })

// Should be:
return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Valid email required' } }, { status: 400 })
```

### Validation

- `/api/upload/screentime` -- validates file type, size, rate limit. Good.
- `/api/billing/checkout` -- Zod validation on body. Good.
- `/api/billing/webhook` -- Stripe signature verification. Good.
- `/api/subscribe` -- Manual validation (`!email || typeof email !== 'string' || !email.includes('@')`). Should use Zod for consistency with other routes.

### Missing Rate Limiting

- `/api/subscribe` has `subscribeLimit` defined in `rate-limit.ts` but the route handler does not use it. The import and check are absent.
- `/api/billing/checkout` has no rate limiting at all. Not critical (Stripe itself rate-limits), but plan doesn't mention skipping it.

---

## 6. Monolith Extractability

The structure is clean enough for later extraction:

**Easy to extract:**
- `src/server/discovery/` -- self-contained module with clear inputs/outputs. Could become a separate service.
- `src/server/billing/` -- thin Stripe wrapper. Could be replaced with a billing microservice.
- `src/server/db/` -- single connection module. Swap for a different DB by changing one file.

**Harder to extract:**
- `FoundingCounter` RSC queries the DB directly in a UI component. This tight coupling would need refactoring.
- API routes mix validation, rate limiting, and business logic in a single function. For PoC this is fine, but for MVP, consider a middleware chain or a `createApiHandler` wrapper.

**Good architectural decisions for extraction:**
- No ORM-specific types leak into the domain. `types.ts` uses plain Zod schemas.
- Server code is isolated in `src/server/`. Client code never imports from it (except the RSC violation noted above).
- Stripe config is in `shared/config/` (client-accessible price IDs) while the Stripe client is in `server/billing/` (server-only secret key).

---

## 7. Over-Engineering vs. Under-Engineering

### Appropriately Scoped (good)
- Rate limiting is properly implemented with graceful degradation (`if (!limiter) return { success: true }`). Redis being optional is correct for local dev.
- `getDb()` creates a new connection per call -- appropriate for serverless (Neon HTTP driver, no pooling needed).
- Client-side image compression using native browser APIs (OffscreenCanvas) instead of pulling in `browser-image-compression` library. Leaner than the plan suggested.
- No auth layer in PoC. Plan says email-only identity, and that's exactly what's implemented.

### Under-Engineered (needs attention)
- **No cost cap** -- the single most dangerous omission. A Reddit front-page moment could run up thousands in Anthropic API costs with zero circuit breaker. This should be the top priority fix.
- **No Sentry integration** -- the package is installed but not configured. Either configure it or remove it from `package.json` to avoid confusion.
- **Subscribe route missing rate limiting** -- the limiter exists in `rate-limit.ts` but isn't wired up.
- **Legacy mock route** -- `src/app/api/analyze-screenshot/route.ts` is the old mock implementation that was replaced by `/api/upload/screentime`. It should be deleted to avoid confusion. It uses `setTimeout` to simulate processing and returns hardcoded data.

### Appropriately Not Over-Engineered (good)
- No middleware.ts for rate limiting -- per-route is simpler and more explicit.
- No repository pattern wrapping Drizzle -- direct queries in route handlers are fine for PoC.
- No event bus between billing and identity contexts -- direct writes are fine for 3 tables.
- No abstraction layer over Anthropic SDK -- direct `client.messages.create()` is appropriate.

---

## 8. Security Notes

- Stripe webhook signature verification is correctly implemented.
- API keys are accessed via `process.env` (not committed). Good.
- The `stripe.ts` client throws at module level if `STRIPE_SECRET_KEY` is missing. This means importing the module in any context (even tests) will throw if the env var isn't set. Consider lazy initialization (like `getDb()` pattern).
- No CORS headers on API routes -- fine for same-origin requests from the Next.js frontend.
- Image data is processed in-memory and discarded (plan's privacy guarantee). Confirmed: no file writes.
- XSS in email templates: the subscribe route injects `email` into HTML sent to the founder (`New signup: <strong>${email}</strong>`). This is rendered in an email client, which typically sanitizes HTML, but technically the email address is unescaped user input in an HTML context. Low risk but worth noting.

---

## 9. Summary of Action Items

### Must Fix (before Phase 2)

1. **Implement cost cap** -- Add daily spend tracking via Upstash Redis counter. Enforce soft/hard caps in `/api/upload/screentime`. This is the plan's safety net against runaway API costs.

2. **Wire up subscribe rate limiting** -- The limiter exists but isn't used in the route handler.

3. **Fix subscribe error format** -- Use `{ error: { code, message } }` consistently.

4. **Delete legacy mock route** -- Remove `src/app/api/analyze-screenshot/route.ts`.

### Should Fix (quality of life)

5. **Fix barrel import bypass** -- Change all `@/entities/xray-result/model/types` imports to `@/entities/xray-result`.

6. **Extract `getFoundingCount()`** -- Move DB query out of `FoundingCounter` component into a server function.

7. **Document `src/server/` layer** -- Add to CLAUDE.md's FSD structure as a server-only shared layer.

8. **Configure or remove Sentry** -- Either set up `sentry.*.config.ts` files or remove `@sentry/nextjs` from `package.json`.

### Nice to Have (before MVP)

9. **Add `POST /api/quiz/submit`** -- Plan specifies it. Currently quiz is client-only.

10. **Harmonize file size limits** -- Server accepts 5 MB, plan says 2 MB. Align with plan.

11. **Use Zod in subscribe route** -- Replace manual email validation with Zod for consistency.

12. **Lazy-init Stripe client** -- Match `getDb()` pattern to avoid module-level throws.

---

## 10. Overall Assessment

The PoC implementation is **well-structured and closely follows the plan**. The Discovery bounded context is clean, the DB schema is sound, and the FSD layering is mostly correct. The biggest risk is the missing cost cap -- everything else is refinement.

The codebase is extractable, the tech choices are appropriate for the stage, and there's no significant over-engineering. The developer(s) made good pragmatic decisions: no unnecessary abstractions, server code properly isolated, graceful degradation for optional services (Redis).

**Confidence level:** High that this PoC can scale into the MVP described in the plan without a rewrite.
