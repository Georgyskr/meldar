# E2E Tester Review -- Meldar PoC

**Reviewer:** E2E Test Engineer
**Date:** 2026-03-30
**Scope:** All API routes, upload flow, billing flow, X-Ray result pages, DB schema, discovery pipeline

---

## 1. User Flow Map

### Flow A: Screenshot Upload (Free)
1. User visits `/xray`
2. Selects/drops a screenshot in `UploadZone`
3. Client compresses image (if >2 MB)
4. `POST /api/upload/screentime` with FormData
5. Server: rate limit check -> validate file -> extract via Claude Vision -> generate insights/upsells/pain points -> save to DB -> return JSON
6. Client renders `XRayCard`, `XRayCardActions` (share/copy), insights, `UpsellBlock`
7. User can share `/xray/[id]` link

### Flow B: Shared X-Ray View
1. Visitor opens `/xray/[id]`
2. Server fetches from DB, renders SSR page with OG metadata
3. CTA links back to `/xray` for the visitor to upload their own

### Flow C: Purchase (Time Audit / App Build)
1. User clicks upsell CTA on X-Ray result page
2. `PurchaseButton` calls `POST /api/billing/checkout`
3. Server creates Stripe Checkout Session, returns URL
4. User completes payment on Stripe
5. Stripe fires `checkout.session.completed` webhook to `POST /api/billing/webhook`
6. Server inserts into `audit_orders` + `subscribers`
7. User redirected to `/thank-you`

### Flow D: Starter (Coming Soon)
1. User clicks Starter upsell
2. `POST /api/billing/checkout` with `product: 'starter'`
3. Server saves email to `subscribers` with source `starter_interest`
4. Returns `{ comingSoon: true }`
5. Client redirects to `/coming-soon`

### Flow E: Email Subscription
1. User submits email on landing page or `/coming-soon`
2. `POST /api/subscribe`
3. Server saves to DB, sends welcome email via Resend, notifies founder
4. Returns `{ success: true }`

---

## 2. Critical Bugs and Issues

### BUG-01: Missing OG Image Route (SEVERITY: HIGH)
**Location:** `src/app/xray/[id]/page.tsx:35`
The metadata references `${SITE_CONFIG.url}/xray/${id}/og` for OpenGraph images, but no route exists at `src/app/xray/[id]/og/`. Sharing an X-Ray link on social media will show a broken image.

**Impact:** Broken social sharing -- the core viral loop is non-functional.

### BUG-02: No Custom 404 Page (SEVERITY: MEDIUM)
No `src/app/not-found.tsx` exists. When `/xray/[id]` calls `notFound()` for an invalid ID, Next.js will show its default 404, which is unbranded and jarring.

### BUG-03: UploadZone Step Indicator Out of Sync (SEVERITY: LOW)
**Location:** `src/features/screenshot-upload/ui/UploadZone.tsx:35-48`
The step indicator advances to "Uploading screenshot" (step 1) then immediately to "Detecting apps" (step 2) *before* `fetch` even starts. The actual upload and analysis happen in a single `fetch` call, so the user sees "Detecting apps" during the entire network request (upload + server processing). Steps 1 and 2 are misleading since there's no way to know when upload finishes vs. when analysis begins.

### BUG-04: Webhook Does Not Verify Idempotency Beyond `onConflictDoNothing` (SEVERITY: MEDIUM)
**Location:** `src/app/api/billing/webhook/route.ts:40-53`
The `onConflictDoNothing` on `audit_orders` relies on the `stripe_checkout_session_id` unique constraint. This is correct for deduplication. However, the `subscribers` insert on line 55-62 also uses `onConflictDoNothing` keyed on email. If the user already subscribed with a different source (e.g., `landing`), the webhook silently drops the update. The subscriber's source will never reflect `checkout`, and `foundingMember` status will never be updated via this path.

### BUG-05: Subscribe API Has No Rate Limiting Applied (SEVERITY: MEDIUM)
**Location:** `src/app/api/subscribe/route.ts`
A `subscribeLimit` is defined in `rate-limit.ts` but never imported or used in the subscribe route. An attacker can spam the endpoint to trigger unlimited Resend API calls (and associated costs).

### BUG-06: `getDb()` Creates a New Connection on Every Call (SEVERITY: HIGH)
**Location:** `src/server/db/client.ts:6-11`
Every call to `getDb()` creates a new `neon()` SQL connection and `drizzle()` instance. In serverless, this is acceptable for Neon's HTTP driver, but in a long-running dev server or if Next.js doesn't tree-shake properly, this could lead to unnecessary connection churn. More importantly, there's no error handling if `DATABASE_URL` is malformed (not missing, but invalid).

### BUG-07: Subscribe Email Validation Is Weak (SEVERITY: MEDIUM)
**Location:** `src/app/api/subscribe/route.ts:10`
The validation is `!email.includes('@')` -- this accepts strings like `@`, `foo@`, `@bar`, `a@b`. No Zod validation is used here, unlike the checkout route. This could pollute the subscriber list and cause Resend delivery failures.

---

## 3. Edge Cases Analysis

### Screenshot Upload Edge Cases

| Scenario | Currently Handled? | Notes |
|---|---|---|
| No file attached | YES | Returns 400 |
| Wrong MIME type (e.g., PDF, GIF) | YES | ALLOWED_TYPES check |
| File >5 MB | YES | MAX_SIZE check |
| File exactly 5 MB | YES | Uses `>` not `>=`, so 5 MB exactly passes (edge: may still be too large after base64 encoding ~33% overhead) |
| Empty file (0 bytes) | PARTIAL | Passes validation (type/size checks pass on a 0-byte file with correct MIME), then Claude Vision will likely error. The generic 500 catch handles it, but the user gets "Analysis failed" instead of "Empty file." |
| Corrupted image (valid MIME, broken data) | PARTIAL | Claude Vision may return `unreadable` error or throw. Caught by generic handler. |
| Non-screen-time image (e.g., a selfie) | YES | Claude prompt instructs `not_screen_time` error |
| Blurry/low-res screenshot | YES | Claude prompt instructs `unreadable` error |
| Very large resolution image (e.g., 8000x8000) | PARTIAL | Client compression only triggers if >2 MB. A 4.9 MB, 8000x8000 image skips compression and goes straight to Claude. Base64 encoding makes it ~6.5 MB in the API call. |
| HEIC format (common on iPhone) | NO | HEIC is not in ALLOWED_TYPES. iPhone users taking screenshots get PNG, but if they export from Photos, HEIC is common. Instructions say "screenshot" so probably fine. |
| Android screenshot with different UI language | PARTIAL | Claude prompt says "extract EVERY visible app" but doesn't mention multilingual support. Likely works but untested. |
| Concurrent uploads from same IP | YES | Rate limited to 5/min |
| Upload when Redis is down | YES | `checkRateLimit` returns `{ success: true }` if limiter is null, so uploads still work (rate limiting degrades gracefully) |

### Billing Edge Cases

| Scenario | Currently Handled? | Notes |
|---|---|---|
| Invalid product slug | YES | Zod validates `z.enum(['timeAudit', 'appBuild', 'starter'])` |
| Missing email on checkout | YES | Email is optional; Stripe Checkout collects it |
| Stripe API down | PARTIAL | Generic 500 catch, but no user-facing retry guidance |
| Invalid Stripe webhook signature | YES | Returns 401 |
| Webhook fires before user returns from Stripe | YES | Webhook and redirect are independent; `onConflictDoNothing` handles the race |
| Same checkout session webhook fires twice | YES | `stripe_checkout_session_id` unique constraint + `onConflictDoNothing` |
| Webhook for unknown product type | PARTIAL | Falls through the `if (product === 'timeAudit' \|\| product === 'appBuild')` check, only the subscriber insert runs. No audit order created. Silent data loss if a new product is added without updating webhook. |
| Missing `STRIPE_WEBHOOK_SECRET` env var | YES | Returns 401 early |
| Missing `STRIPE_SECRET_KEY` env var | NO | `stripe.ts` throws at module load time, crashing the entire API. Should fail gracefully per-request. |
| `session.amount_total` is null | PARTIAL | Stored as 0 (`session.amount_total \|\| 0`), which is technically wrong -- a $0 order looks like a free order, not a missing value |

### X-Ray Result Page Edge Cases

| Scenario | Currently Handled? | Notes |
|---|---|---|
| Valid ID, result exists | YES | Renders correctly |
| Invalid/nonexistent ID | YES | `notFound()` is called (though no custom 404, see BUG-02) |
| Expired result (past `expiresAt`) | NO | Results have an `expiresAt` column but no query filters on it. Expired results are still accessible. There's no cleanup job either. |
| Malformed `apps` JSON in DB | NO | `xray.apps as AppUsage[]` is an unsafe cast. If DB data is corrupted, the page will crash with an unhandled error. |
| Result with 0 apps | PARTIAL | `apps[0]?.name` handles undefined, but `XRayCard` component behavior with empty array is untested. |
| SQL injection via ID parameter | YES | Drizzle ORM parameterizes queries |

### Subscribe Edge Cases

| Scenario | Currently Handled? | Notes |
|---|---|---|
| Duplicate email | YES | `onConflictDoNothing` on unique email column |
| Invalid email format | PARTIAL | Only checks `includes('@')` -- see BUG-07 |
| Resend API down | PARTIAL | Entire request fails with 500. The DB insert succeeds but welcome email is never sent. No retry mechanism. If subscriber insert succeeds but email send fails, user gets an error but is actually subscribed. |
| Resend rate limit exceeded | PARTIAL | Same as above -- 500 error, no specific handling |
| Extremely long email string | NO | No max-length validation. Could store extremely long strings in DB. |
| `founding` field manipulation | LOW RISK | Any caller can set `founding: true` to become a "founding member." No server-side authorization check. |

---

## 4. Race Conditions and Concurrency

### RC-01: Founding 50 Counter
There is no "Founding 50" counter implementation in the codebase. The `foundingMember` boolean on `subscribers` is set based on the client-sent `founding` field. There is no server-side check for "are we at 50 founding members yet?" or any atomic counter. **If founding member slots need to be limited, this is a critical gap.**

### RC-02: Webhook vs. Checkout Redirect Race
Not a problem. The webhook inserts to `audit_orders` and `subscribers` using `onConflictDoNothing`. The redirect goes to `/thank-you` which is a static page. These paths don't share mutable state that could conflict.

### RC-03: Concurrent Screenshot Uploads
Rate limiting is per-IP with a sliding window. No global concurrency concern. Each upload generates its own `nanoid`, so no collision risk (nanoid with 12 chars has negligible collision probability at this scale).

### RC-04: Duplicate Subscribe + Checkout for Same Email
A user who subscribes via landing page (source: `landing`) and then purchases (webhook sets source: `checkout`) will retain the `landing` source due to `onConflictDoNothing`. The purchase source is lost. Not a data race per se, but a data accuracy issue.

---

## 5. Data Consistency Issues

### DC-01: X-Ray Expiration Not Enforced
`expiresAt` is set to 30 days from creation but never checked:
- No query filter: `getXRay()` fetches by ID without checking `expiresAt`
- No cleanup: No cron job or scheduled task to delete expired rows
- No OG image cleanup: (N/A since OG route doesn't exist, but would need it)

### DC-02: `xrayId` Foreign Key on `auditOrders` but X-Ray Can Expire
If an X-ray result is deleted (manually or by future cleanup), the `auditOrders.xrayId` becomes null (via `onDelete: 'set null'`). This means the audit order loses its link to the original analysis. The X-Ray data that the customer paid for an audit on would be gone.

### DC-03: Subscriber Source Is Write-Once
The `subscribers` table has a unique constraint on `email`. All inserts use `onConflictDoNothing`. This means the first interaction's source wins. A user who subscribes via landing, then buys a Time Audit, then uploads a screenshot -- their source will always say `landing`. Consider `onConflictDoUpdate` for the source/foundingMember fields.

### DC-04: No Audit Trail for Webhook Events
Webhook events are processed and the raw event is discarded. If there's a dispute or debugging need, there's no record of what Stripe sent. Consider logging the event ID at minimum.

---

## 6. Security Considerations

### SEC-01: No CSRF Protection on API Routes
All `POST` routes accept requests from any origin. Next.js App Router doesn't include CSRF tokens by default. The subscribe and checkout routes could be triggered from third-party sites. Mitigated somewhat by `SameSite` cookies, but there are no cookies to protect here -- these are stateless API routes.

### SEC-02: IP Extraction for Rate Limiting
`request.headers.get('x-forwarded-for')?.split(',')[0]` can be spoofed if the app is not behind a trusted reverse proxy that strips/overwrites this header. On Vercel, this is handled correctly, but the code falls back to `'unknown'` which means all requests without the header share one rate limit bucket.

### SEC-03: Founder Email Hardcoded
`gosha.skryuchenkov@gmail.com` is hardcoded in `subscribe/route.ts:59`. Should be an environment variable.

### SEC-04: No Input Sanitization on Email in Notification
The founder notification email includes `${email}` directly in HTML (`<strong>${email}</strong>`). This is a stored XSS vector in the email client if a malicious email address contains HTML/JS. Most email clients sanitize this, but it's still poor practice.

---

## 7. Claude Vision / AI Edge Cases

### AI-01: Malformed JSON from Claude
**Location:** `src/server/discovery/ocr.ts:99-115`
If Claude returns a tool use block but with invalid data:
- `toolUse.input` exists but doesn't match `screenTimeExtractionSchema` -> Zod `.safeParse` catches it, throws `Error('Invalid extraction: ...')` -> caught by route's generic 500 handler. User sees "Analysis failed."
- `toolUse.input.error` is set -> returns `{ error: string }`, handled by route.
- No tool use block at all -> throws `Error('No tool use in response')` -> caught by generic 500.

**Gap:** If Claude returns a tool use with `input.error` set AND valid extraction fields, the error takes precedence (line 106 checks `input.error` first). This is correct behavior.

**Gap:** If Claude times out or the Anthropic SDK throws a network error, it propagates to the generic catch. User sees "Analysis failed." There's no retry logic. For a 3-second analysis that costs ~$0.001, a single retry would be reasonable.

### AI-02: Claude Returns 0 Apps
If Claude extracts zero apps (empty array), Zod validation passes (array can be empty). Then:
- `extraction.apps[0]?.name` -> `undefined` -> `topApp = 'Unknown'`
- `generateInsights()` produces no top-app insight (the `if (topApp)` guard), but may still produce screen time and pickup insights
- `generateUpsells()` produces no social/email upsells, but may trigger `many_apps` (no, because `apps.length >= 5` fails) or `high_pickups`
- This is a valid but potentially confusing result for the user

### AI-03: Claude Returns Negative or Absurd Values
No validation that `usageMinutes` or `totalScreenTimeMinutes` are positive numbers. Claude could return `-30` or `999999`. Zod only checks `z.number()`, not `z.number().nonneg()` or `.max()`.

---

## 8. Missing Error Feedback in UI

### UX-01: PurchaseButton Swallows Errors
**Location:** `src/features/billing/ui/PurchaseButton.tsx:26-44`
If `fetch` succeeds but returns an error JSON (`!res.ok`), or if `data.url` is missing, the button just stays in "Redirecting..." state forever (loading is never set back to false in the success path). The `catch` handles network errors but not API errors.

### UX-02: No Loading State for Share/Copy Actions
**Location:** `src/entities/xray-result/ui/XRayCardActions.tsx`
`navigator.share()` can fail (user cancels, or permission denied). The error is uncaught. `navigator.clipboard.writeText()` can also fail in insecure contexts (HTTP, not HTTPS). Both need try/catch.

### UX-03: "Screenshot deleted" Banner Is Misleading
The banner says "Screenshot deleted" but the screenshot was never stored server-side -- it was processed in memory and discarded. The message implies it was stored and then deleted, which is technically inaccurate (though reassuring).

---

## 9. Required E2E Tests Before Launch

### Critical Path Tests (Must Have)

```
TEST-01: Upload Happy Path
  - Upload a valid iPhone Screen Time screenshot
  - Verify response contains: id, extraction (with apps), insights, upsells, painPoints
  - Verify DB row created in xray_results
  - Verify /xray/[id] page renders with correct data

TEST-02: Upload Validation
  - Upload no file -> 400
  - Upload PDF -> 400
  - Upload 6 MB image -> 400
  - Upload valid image that's not screen time -> 422 with "not_screen_time" message

TEST-03: Rate Limiting
  - Send 6 requests in quick succession from same IP
  - Verify 6th request returns 429

TEST-04: X-Ray Shared View
  - Create a result via upload
  - Visit /xray/[returned-id]
  - Verify page renders with correct totalHours, topApp, apps
  - Verify OG meta tags are present and correct

TEST-05: X-Ray Invalid ID
  - Visit /xray/nonexistent-id-123
  - Verify 404 response

TEST-06: Stripe Checkout Flow
  - POST /api/billing/checkout with product: 'timeAudit'
  - Verify response contains Stripe checkout URL
  - Verify URL points to checkout.stripe.com

TEST-07: Stripe Webhook Processing
  - POST /api/billing/webhook with valid signature and checkout.session.completed event
  - Verify audit_orders row created
  - Verify subscribers row created
  - Repeat same webhook -> verify no duplicate rows

TEST-08: Stripe Webhook Signature Rejection
  - POST /api/billing/webhook with invalid signature
  - Verify 401 response

TEST-09: Subscribe Happy Path
  - POST /api/subscribe with valid email
  - Verify subscribers row created
  - Verify welcome email sent (mock Resend)
  - Verify founder notification sent (mock Resend)

TEST-10: Subscribe Duplicate Email
  - Subscribe with email X
  - Subscribe with email X again
  - Verify only one row in DB
  - Verify no error returned (idempotent)

TEST-11: Starter "Coming Soon" Flow
  - POST /api/billing/checkout with product: 'starter', email: 'test@test.com'
  - Verify response: { comingSoon: true }
  - Verify subscribers row with source 'starter_interest'
```

### Important but Not Blocking

```
TEST-12: Claude Vision Timeout/Error
  - Mock Claude API to throw a network error
  - Verify upload returns 500 with user-friendly message

TEST-13: Database Down
  - Mock getDb() to throw
  - Verify upload returns 500
  - Verify subscribe returns 500
  - Verify webhook returns 500 (not 200!)

TEST-14: Resend API Down
  - Mock Resend to throw
  - Verify subscribe returns 500
  - Verify DB insert still happened (partial success)

TEST-15: Client Compression
  - Upload a 3 MB PNG
  - Verify compression runs (file sent is <3 MB JPEG)
  - Upload a 1.5 MB PNG
  - Verify compression is skipped (file sent as-is)

TEST-16: Empty Apps Array
  - Mock Claude to return 0 apps
  - Verify no crash, verify page renders with "Unknown" as top app

TEST-17: Insights Generation
  - Input with 8h screen time, 150 pickups, 3h social
  - Verify all 4 insight types generated
  - Input with 2h screen time, 30 pickups, 0 social
  - Verify only top-app insight generated
```

---

## 10. Manual Test Scenarios

### Pre-Launch Checklist

1. **iPhone Screenshot**: Take a real iOS 17+ Screen Time screenshot, upload it, verify all apps are extracted with correct times.

2. **Android Screenshot**: Take a real Android Digital Wellbeing screenshot, upload, verify extraction works.

3. **Share Flow**: Upload a screenshot, click Share, verify the link works when opened in an incognito window. Verify OG tags render correctly when pasted into Twitter/Slack/iMessage.

4. **Purchase Flow**: Complete a real Stripe test-mode purchase for Time Audit. Verify:
   - Redirect to `/thank-you`
   - `audit_orders` row exists with correct amount
   - `subscribers` row exists

5. **Webhook Reliability**: Use Stripe CLI (`stripe listen --forward-to`) to verify webhooks arrive and process correctly.

6. **Mobile Upload**: Test the upload flow on iPhone Safari and Android Chrome. Verify the file picker allows selecting screenshots from camera roll.

7. **Rate Limit**: Rapidly upload 6 screenshots. Verify the 6th shows "Too many requests."

8. **Non-Screenshot Image**: Upload a photo of a cat. Verify user-friendly "not a screen time screenshot" error.

9. **Slow Connection**: Throttle to 3G in DevTools. Verify the upload progress indicator works and doesn't timeout.

10. **Email Edge Cases**: Subscribe with `test+tag@gmail.com`, `user@university.ac.uk`, and a very long email address. Verify all work.

---

## 11. Summary of Action Items

### Must Fix Before Launch

| ID | Issue | Severity | Effort |
|---|---|---|---|
| BUG-01 | Missing `/xray/[id]/og` route -- social sharing broken | HIGH | Medium |
| BUG-05 | Subscribe route has no rate limiting (cost exposure via Resend) | MEDIUM | Low |
| BUG-07 | Weak email validation on subscribe (use Zod) | MEDIUM | Low |
| UX-01 | PurchaseButton hangs on API error | MEDIUM | Low |
| RC-01 | No Founding 50 counter -- anyone can claim founding status | HIGH | Medium |

### Should Fix Before Launch

| ID | Issue | Severity | Effort |
|---|---|---|---|
| BUG-02 | No custom 404 page | MEDIUM | Low |
| BUG-04 | Subscriber source never updates (onConflictDoNothing) | MEDIUM | Low |
| DC-01 | Expired X-Ray results are still accessible | LOW | Medium |
| SEC-03 | Founder email hardcoded | LOW | Trivial |
| SEC-04 | Unsanitized email in founder notification HTML | LOW | Low |
| AI-03 | No bounds validation on Claude-extracted numbers | LOW | Low |

### Nice to Have

| ID | Issue | Severity | Effort |
|---|---|---|---|
| BUG-03 | Upload step indicator out of sync with actual progress | LOW | Medium |
| DC-04 | No webhook event audit trail | LOW | Low |
| UX-02 | Uncaught errors in share/copy actions | LOW | Low |
| UX-03 | "Screenshot deleted" banner wording | LOW | Trivial |
| AI-01 | No retry on Claude Vision timeout | LOW | Low |

---

*End of E2E review.*
