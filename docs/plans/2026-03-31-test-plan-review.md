# Test Plan Review — 2026-03-31

Reviewed against source: `src/features/discovery-flow/lib/ocr-client.ts`,
`src/server/discovery/extract-from-text.ts`, `src/app/api/discovery/upload/route.ts`,
`src/features/discovery-flow/model/atoms.ts`, `src/features/discovery-flow/ui/DataUploadHub.tsx`,
`src/app/start/start-client.tsx`, `src/app/api/billing/checkout/route.ts`,
`src/app/api/billing/webhook/route.ts`.

---

## Gaps Found

### 1. Billing routes are entirely untested

`src/app/api/billing/checkout/route.ts` and `src/app/api/billing/webhook/route.ts` have
**zero test coverage** in the plan. These are the payment paths. Failures here lose revenue
or silently skip fulfillment.

Checkout route gaps:
- No test for rate limiting (`checkoutLimit`)
- No test for invalid `product` enum (e.g. `{ product: "free" }`)
- No test for optional `email` field: present vs absent affects `customer_email` in Stripe call
- No test for optional `xrayId` field being passed as metadata
- No test for Stripe API throwing (the `catch` returns 500 — untested)
- No test for `isSubscription` branch: `subscription_data.trial_period_days` only added for
  `starter`; the `timeAudit` and `appBuild` paths (payment mode) must not include it
- No test asserting `session.url` is returned in response body

Webhook route gaps:
- No test for missing `stripe-signature` header (should return 401)
- No test for missing `STRIPE_WEBHOOK_SECRET` env var (should return 401)
- No test for `constructEvent` throwing on invalid signature (returns 401)
- No test for `checkout.session.completed` with missing `email` — the route silently returns
  `{ received: true }` without inserting anything; this is a valid but easily missed branch
- No test for `product === 'timeAudit'` vs `product === 'appBuild'` DB column mapping
  (`time_audit` vs `app_build` — a typo here would silently corrupt audit orders)
- No test for `product === 'starter'` (subscription product): skips `auditOrders` insert but
  still inserts into `subscribers` — this branch is untested
- No test for Resend email calls (buyer confirmation + founder notification) — at minimum,
  verify they are called with correct `to` addresses; a mistake here means buyer gets no receipt
- No test for `customer.subscription.created` event (currently only logs, but that log is the
  only observable behavior and should at least be verified not to throw)
- No test for `customer.subscription.deleted` event
- No test for unhandled event types — route should return `{ received: true }` for all

Suggested new files:
- `src/app/api/billing/checkout/__tests__/route.test.ts`
- `src/app/api/billing/webhook/__tests__/route.test.ts`

---

### 2. `ocr-client.ts` — `getWorker()` has an uncovered branch

The `getWorker()` private function has this path:
```ts
if (!worker && !loadFailed && !loadingPromise) {
  loadingPromise = initWorker()
  return loadingPromise
}
```
This is triggered when `extractText()` is called cold (no prior `preloadOcr()` call). The test
plan only tests `extractText` after the worker is loaded or after `waitForOcr`. There is no test
for calling `extractText()` directly on a cold module, which exercises `getWorker()`'s
self-initiating path. This path also means `loadFailed` never gets set if `initWorker()` throws
inside `getWorker()` — that is a potential silent hang.

---

### 3. `waitForOcr()` — the `loadingPromise` resolves to `null` case is under-described

When `initWorker()` throws (caught in `preloadOcr`), `loadFailed` is set and `loadingPromise`
is set to `null`. But `waitForOcr()` awaits `loadingPromise` and then checks `worker !== null`.
If `preloadOcr` failure clears `loadingPromise` before `waitForOcr` awaits it, the `if
(loadingPromise)` branch is never entered. The plan's test case `'awaits loadingPromise and
returns false if worker is null after load'` implies the promise resolves to `null as Worker`,
which only happens via `preloadOcr`'s catch (not `getWorker`). This race condition is not
explicitly tested.

---

### 4. `upload/route.ts` — the `adaptive` platform image validation gap

The plan tests that adaptive uploads validate image MIME types (it's listed under
"file validation — image platforms"). However, in the actual source code the image MIME
validation block uses:

```ts
if (!ocrText && file) {
  if (isImagePlatform) {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) { ... }
```

`isImagePlatform` includes `'adaptive'`, so a GIF uploaded to the adaptive endpoint would be
rejected. But the plan's `'returns 400 for non-JPEG/PNG/WebP on adaptive platform'` test is
listed under the bulk image validation section alongside subscriptions/battery etc. That is
correct. **However**: the adaptive case also reads `formData.get('appName')`, and there is no
test for what happens when `appName` is `null` (no formData field provided). Looking at
`resolveAdaptiveSourceType(null)` — it returns `'subscriptions'` as fallback. The plan's
`resolveAdaptiveSourceType` section tests `null appName` indirectly via the `maps unknown app`
case, but does not confirm the full round-trip through the route with a missing `appName` field.

---

### 5. `upload/route.ts` — the outer `catch` block's error routing is underspecified

The plan's chatgpt section tests:
- `'returns 422 with error message on zip bomb detection'`
- `'returns 422 on invalid JSON in conversations.json'`
- `'returns 422 when conversations.json is not an array'`

But these errors are **not** returned inline — they bubble up through the outer `catch` block,
which pattern-matches error messages. The mock strategy for the upload route test mocks
`parseChatGptExport`. When the mock throws `new Error('No conversations.json found')`, the
outer catch checks `message.includes('No conversations.json')` and returns 422. The test must
verify that the mock throws, not returns `{ error }`. If the implementer writes:

```ts
parseChatGptExport.mockResolvedValue({ error: 'No conversations.json found' })
```

...instead of:

```ts
parseChatGptExport.mockRejectedValue(new Error('No conversations.json found'))
```

...the test would pass but the production behavior would not match. The plan does not specify
**how** these errors should be simulated, leaving the implementer to guess. Add explicit mock
setup guidance for the throw-based error path in the chatgpt and google sections.

---

### 6. `extract-from-text.ts` — `sourceType` validation not covering all TOOLS keys

The test plan checks `'returns error for unknown sourceType'`. But the TOOLS/PROMPTS objects
in the source define exactly: `screentime`, `subscriptions`, `battery`, `storage`, `calendar`,
`health`. The upload route can pass `adaptive` as `sourceType` to `extractFromOcrText` via the
adaptive platform path (resolved from `resolveAdaptiveSourceType` which returns `'subscriptions'`
etc., never `'adaptive'`). The plan does not have a test confirming that `'adaptive'` as a raw
`sourceType` arg returns an error — this matters only if the route is ever refactored. Minor gap,
but if the plan is meant to document the contract, it is missing.

---

### 7. Atom tests — missing schema migration and corrupt JSON scenarios

The plan states `'returns null (resets) when stored data is missing required fields'` and
`'returns null (resets) when stored data has wrong type for a field'`. These are good. But the
following are absent:

- **Corrupt JSON string in localStorage** (not structurally wrong, but
  `JSON.parse` throws): `localStorage.setItem('meldar-analysis', '{invalid json}')`. Jotai's
  `createJSONStorage` calls `JSON.parse` internally. If it throws, it may not reach the custom
  `getItem` override at all. The plan assumes the override handles all bad input, but a
  `JSON.parse` exception in Jotai's storage layer would bypass the Zod check entirely. This
  case must be tested explicitly.

- **Multiple tabs / concurrent writes**: `atomWithStorage` does not handle `storage` events
  from other tabs by default unless the storage subscription is wired. The plan does not test
  cross-tab sync behavior or document whether it is intentionally absent.

- **`uploadStatusAtom` with a status of `'waiting'`**: The atom type includes `'waiting'` as a
  valid status (used in `DataUploadHub` for the "export started" state), but no test verifies
  persistence of `waiting` status specifically.

---

### 8. No tests for `DataUploadHub` component at all

`DataUploadHub.tsx` has substantial logic:
- OCR path: calls `waitForOcr()` → `extractText()` → appends `ocrText` to FormData
- Vision fallback path: appends `file` directly
- Error state: if response is not ok, sets `'error'` status (but if `prevCount > 0`, reverts
  to `'done'` — this is a subtle "don't regress on partial success" logic with no coverage)
- The `handleStartTrial` function calls `/api/billing/checkout` — the UI-level billing path
  is not tested

The plan mentions no component-level tests for `DataUploadHub`. Even a few RTL unit tests
checking the OCR/fallback branching logic and the billing redirect would catch regressions.

---

### 9. No E2E test covering the full flow

The plan has integration tests for individual AI steps but no end-to-end test exercising:
```
/start (profile form) → POST /api/discovery/session →
/start (upload hub) → POST /api/discovery/upload →
POST /api/discovery/adaptive → POST /api/discovery/analyze → results
```
A Playwright E2E test at this level would catch:
- localStorage atom-to-server synchronization bugs
- Phase transition regressions (e.g. analysis returned but phase never transitions to `results`)
- OCR worker lifecycle issues (terminate called before second upload)

Recommended: `test/e2e/discovery-flow.spec.ts` with mocked API routes (via Playwright's
`page.route()`) to avoid real AI calls.

---

### 10. Performance benchmark for `buildDataContext` is untestable as specified

`bench('buildDataContext — all 12 data sources populated')` is listed as a performance
benchmark. But `buildDataContext` is not exported from `src/server/discovery/analyze.ts` — the
plan itself notes `[test via runCrossAnalysis or export for unit test]` in section 1.6. A
benchmark cannot call `runCrossAnalysis` because that makes a real AI call. The plan does not
resolve this: either export `buildDataContext`, or this benchmark cannot exist as written.

---

## Inconsistencies

### A. Rate-limit mock exports `screentimeLimit`, `analyzeLimit`, etc. but upload route only uses `screentimeLimit`

The mock strategy in the Conventions section exports:
```ts
screentimeLimit: null, quizLimit: null, analyzeLimit: null, adaptiveLimit: null
```
But `src/app/api/discovery/upload/route.ts` imports only `screentimeLimit`. The session route
presumably imports `quizLimit`, the analyze route `analyzeLimit`, etc. The mock is correct for
a shared module, but the naming implies the test file will re-use the same mock template for
all routes. If a test imports `quizLimit` from the mock and the route does not, Vitest will not
error — but if the route imports a limiter that is NOT in the mock, the mock will export
`undefined` for that key, and the real limiter will be loaded. The plan should specify which
limiters each route uses, and confirm the mock covers all of them.

### B. Error code for chatgpt/google parse failures

The plan's upload route tests say `'returns 422 with error message on zip bomb detection'`
but the security tests say `'rejects ZIP where sum of entry uncompressedSize exceeds 500 MB'`
for the ChatGPT parser. The security test lives in `test/security/upload-security.test.ts` and
presumably exercises the route. The upload route test covers the same path. These two tests
will test the same code path with slightly different framing — that is fine, but they should
be using the same mock infrastructure. The plan does not cross-reference them, creating risk
of drift.

### C. `extractScreenTime` vs `extractFromScreenshot` for screentime platform

In section 2.2, the plan says:
> `calls extractScreenTime (Vision) when only file is provided`

The source confirms this: `extractScreenTime` is used for the `screentime` case, and
`extractFromScreenshot` is used for subscriptions/battery/storage/calendar/health. These are
**two different functions**. Section 1.3 is titled "OCR Pipeline — Screenshot Extraction
(Vision)" and covers `extractFromScreenshot`. Section 1.4 covers `extractScreenTime`. But the
test for section 1.4 (`ocr.test.ts`) does not have a case for the screentime Vision path being
called from the upload route — because that is the route test's job. This is fine in isolation,
but it means the `extractScreenTime` mock in the upload route test must match the exact return
shape expected by `ocr.test.ts`'s `screenTimeExtractionSchema`. The plan does not specify the
mock return shape for `extractScreenTime` in the upload route test, unlike the AI mock strategy
which is documented in detail.

### D. Integration tests still mock the database

Section 7 states: "Integration tests: nothing mocked — real Anthropic API, real JSZip, real
Zod. DB still mocked (no test DB)." But section 4 (Integration Tests) tests parsers and AI
extraction functions that do not touch the DB at all. Calling it "DB still mocked" is
misleading — there is no DB call in `extractTopicsFromMessages` or `runCrossAnalysis`. The
correct statement is: these integration tests do not test any route (so DB is irrelevant). If
the intent is to eventually add route-level integration tests, that needs to be explicit.

---

## Missing Edge Cases

### M1. Concurrent uploads to the same session (race condition on `sourcesProvided`)

The `sourcesProvided` array is updated via `array_append` SQL, which is atomic at the DB level.
But the idempotency check reads `sourcesProvided` before the append. Two concurrent uploads of
the same platform from the same session would both pass the idempotency check (both see the
array without the platform yet), then both extract and both append. The plan has no test for
concurrent uploads. At minimum, document this as a known gap and add a comment in the test plan.

### M2. `ocrText` provided alongside a file (both fields non-null)

The route logic: if `ocrText` is truthy, it takes the OCR path and ignores the file. The plan
has no test for the case where both `ocrText` and `file` are provided. This exercises the
priority logic and confirms the file is silently ignored (no file validation occurs when
`ocrText` is set). A malicious client could send a 200 MB file + valid ocrText — the file size
check is skipped because `!ocrText && file` is false.

### M3. `ocrText` provided for ZIP/JSON platforms (chatgpt, claude, google)

The validation structure is:
```ts
if (!ocrText && file) {
  // file validation
} else if (ocrText && ocrText.length > 50000) {
  // ocrText validation
}
```
If a client sends `ocrText` on the `chatgpt` platform, the route enters the `chatgpt` switch
case which immediately checks `if (!file) return 400`. But wait — `ocrText` was provided, not
`file`. So `!file` is true and the route returns 400 with "File required for ChatGPT export."
This means `ocrText` on `chatgpt` returns a confusing error ("File required") rather than an
informative one. The plan has no test for this edge case.

### M4. `localStorage` quota exceeded

The plan mentions this in the grilling criteria but does not include it. `atomWithStorage`
calls `localStorage.setItem`. If `QuotaExceededError` is thrown (phones with low storage),
Jotai swallows it silently or throws depending on the storage adapter. This should be tested
via `vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new DOMException('QuotaExceededError') })`.

### M5. Network timeout in `DataUploadHub.handleFile`

The `fetch` call has no timeout. On a slow network the browser will eventually fail, landing
in the outer `catch` which sets `status: 'error'` (or `'done'` if previous uploads existed).
There is no test for this path. The plan does not test any `DataUploadHub` behavior at all
(see gap #8), so this is a sub-gap of that.

### M6. `webhook/route.ts` — `checkout.session.completed` where `product` is `'starter'`

When `product === 'starter'`, the condition `product === 'timeAudit' || product === 'appBuild'`
is false, so the route skips `auditOrders` insert and both emails. It then falls through to
the `subscribers` insert. This is deliberate, but it is a silent branch that could silently
break if the condition is ever widened. No test covers it.

### M7. Prompt injection test does not verify the API payload

The plan states:
> `it('does not include injected instructions in tool_choice response when ocrText contains "Ignore previous instructions"')`

This test name describes output behavior (AI response doesn't comply). But with a mocked
Anthropic SDK, the AI always returns the canned `tool_use` response regardless of injection.
What this test can actually verify is that the **request payload** wraps the text in
`<ocr-data>` tags. The plan does have a separate case:
> `it('wraps ocrText in <ocr-data> tags in the user message (verified in request payload)')`

...which is correct. But the first test (`'does not include injected instructions...'`) is
meaningless with a mock — it will always pass. Either replace it with an assertion on
`mockMessagesCreate.mock.calls[0][0].messages[0].content` containing `<ocr-data>`, or mark
it as an integration-only test.

### M8. `terminateOcr()` is not idempotent — `loadFailed` is never reset

`terminateOcr()` sets `worker = null` and `loadingPromise = null`, but does **not** reset
`loadFailed`. After a failed load followed by `terminateOcr()`, calling `preloadOcr()` again
would immediately return (because `loadFailed` is still `true`). The plan's test
`'does nothing if previous load failed'` covers `preloadOcr` returning early. But there is no
test for: `preloadOcr fails → terminateOcr called → preloadOcr called again → still fails`.
This may be intentional (fail-once semantics), but it should be an explicit test case, not an
accidental behavior.

### M9. Russian-language fixture for `initWorker`

The `ocr-client.ts` source comments: `// eng + rus for multi-locale support`. The test plan
mentions Russian-language screenshots as a locale testing concern in the grilling criteria.
Section 1.10 has `'matches non-English path containing "My Activity" + "Search"'` for the
Google Takeout parser. But there is no fixture or test for the OCR client handling
Cyrillic text output. The `extractText` function returns null if result is < 20 chars — a
Russian-language screenshot producing Cyrillic output is a distinct code path from an
English one. Add a fixture and a test in the OCR integration test.

---

## Recommended Additions

1. **`src/app/api/billing/checkout/__tests__/route.test.ts`** — full coverage of the checkout
   route: rate limiting, enum validation, `isSubscription` branch, Stripe mock, error path.

2. **`src/app/api/billing/webhook/__tests__/route.test.ts`** — coverage of: missing signature,
   invalid signature, `checkout.session.completed` with all three products, missing email branch,
   DB insert calls, Resend mock assertions, subscription events.

3. **Add to `1.11` atoms test:** corrupt JSON string case (`'{invalid json}'` in localStorage
   for `analysisAtom`) and `localStorage.setItem` quota exceeded case.

4. **Add to `2.2` upload route test:**
   - Both `ocrText` and `file` provided simultaneously (ocrText wins, file size check skipped)
   - `ocrText` on `chatgpt` platform (gets confusing "File required" error — document intended)
   - `null` appName on adaptive platform through the full route (not just the mapping function)

5. **Add to security tests:** the prompt injection test should assert on
   `mockMessagesCreate.mock.calls[0][0].messages[0].content` containing `<ocr-data>` and
   `</ocr-data>` — not on the AI response (which is always mocked).

6. **Add to `ocr-client` tests:** `terminateOcr` does not reset `loadFailed` — test the
   fail-then-terminate-then-retry flow explicitly so the behavior is documented.

7. **Add `test/e2e/discovery-flow.spec.ts`** using Playwright with `page.route()` mocking API
   calls. Cover: profile → session creation → upload (OCR path + Vision fallback) → adaptive
   → analyze → results phase transition.

8. **Resolve `buildDataContext` export question** before the performance benchmark file is
   written. Either export it from `analyze.ts` or remove the benchmark entry.

9. **Add to `1.4` `extractScreenTime` tests:** a mock return shape example showing the exact
   `tool_use` input structure expected by `screenTimeExtractionSchema`, so the upload route mock
   can be consistent with it.

10. **Add to integration test fixtures:** a Cyrillic-text screenshot (or a fixture text file
    simulating Tesseract output of a Russian-language screen time screenshot) to verify the
    eng+rus worker path and the 20-char minimum threshold behavior with non-ASCII text.

---

## Verdict

**Not ready for implementation. Needs revision.**

The plan is thorough for the discovery pipeline's happy paths and covers the parser/AI unit
test layer well. The mock conventions section is solid. But it has three categories of
problems that must be fixed before handing off to engineers:

1. **Billing routes are completely unplanned.** These are payment flows. Missing tests here
   means live checkout bugs go undetected until a customer reports a failed purchase.

2. **Several code paths in the upload route are either untested or the mock strategy
   contradicts the actual throw-vs-return behavior** of the error handling. An implementer
   following the plan as written will write incorrect mocks that give false confidence.

3. **The E2E gap is significant.** The individual unit and integration tests do not catch
   bugs in the atom↔API↔phase-transition wiring. At least one Playwright smoke test is
   necessary to validate the full user journey.
