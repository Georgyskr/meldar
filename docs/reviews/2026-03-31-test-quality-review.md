# Test Quality Review — 2026-03-31

**Reviewer:** Code Reviewer  
**Scope:** All new test files against the 2026-03-31 test plan  
**Reference style:** `src/app/api/auth/__tests__/login.test.ts`

---

## Executive Summary

The test suite is in strong shape overall. Style is consistent, FSD placement is correct, and mocks are generally well-constructed. Two bugs were correctly identified during testing (Dropbox→OP mapping, zip-bomb status code). The review below documents three blockers, several real gaps, and a handful of smaller issues.

---

## 1. Style Consistency

**Verdict: PASS with one deviation.**

All files correctly use:
- `vi.hoisted()` before any `vi.mock()` calls
- `describe/it` nesting matching the plan
- `beforeEach`/`afterEach` with `vi.clearAllMocks()`
- No `as any` — all mocks are properly typed or use `unknown`

One deviation: `ocr.test.ts` and `extract-topics.test.ts` use:
```ts
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: mockMessagesCreate }
  },
}))
```

The plan specifies using `vi.fn().mockImplementation(...)` factory form. The class syntax works identically at runtime and is arguably cleaner, but it diverges from the plan's canonical factory. This is a nit — not a blocker.

---

## 2. FSD Compliance

**Verdict: PASS.**

All test files are co-located in `__tests__` folders next to their source:
- `src/server/discovery/__tests__/` — correct
- `src/server/discovery/parsers/__tests__/` — correct
- `src/features/discovery-flow/lib/__tests__/` — correct
- `src/features/discovery-flow/model/__tests__/` — correct

**Exception:** `src/app/api/discovery/__tests__/upload-security.test.ts` and `src/app/api/cron/__tests__/purge-auth.test.ts` are placed one level above their route folders, rather than in `src/app/api/discovery/upload/__tests__/` and `src/app/api/cron/purge/__tests__/`. The plan specified `test/security/` for security tests. These landed in `src/app/api/` instead.

This is not wrong per se — they import from the correct route and the tests run — but the plan's original intent was a dedicated `test/security/` directory. It is worth tracking for consistency as the test suite grows.

---

## 3. Blockers

### 🔴 B1 — `upload-security.test.ts` asserts 500 for zip bomb but the plan (and the test's own comment) say 422

**File:** `src/app/api/discovery/__tests__/upload-security.test.ts:207-228` and `:231-252`

```ts
// The outer catch does not pattern-match "Archive too large" — falls to generic 500
expect(res.status).toBe(500)
expect(json.error.code).toBe('INTERNAL_ERROR')
```

The plan (section 3) says:
> `[REVISED] it('upload route returns 422 when parseChatGptExport rejects with "Archive too large when decompressed"')`

The upload route's outer catch (`route.ts:468-476`) pattern-matches on `invalid JSON`, `not an array`, `No conversations.json`, `valid ChatGPT`, and `valid Claude` — it does **not** match `Archive too large`. So the 500 assertion is technically correct for the _current_ production code.

However, the plan explicitly revised this to expect 422, meaning the plan intended the route to be fixed to return 422 for zip-bomb errors. The test accommodates the bug instead of catching it.

This is a genuine production bug: users who upload a zip bomb get a generic 500 rather than a meaningful 422. **The test should assert 422 and fail, driving a fix in the route.** Currently the test hides the bug.

Compare with `route.test.ts:755-768` where the exact same scenario asserts 500 (and leaves a comment admitting uncertainty). Both tests agree the status is 500 — but neither flags this as a bug that needs fixing.

**Fix:** Add `'Archive too large'` to the catch block's pattern list in `route.ts`, then update both test assertions to `422`.

---

### 🔴 B2 — `route.test.ts` "guard: empty updateData" test is a no-op

**File:** `src/app/api/discovery/upload/__tests__/route.test.ts:1092-1108`

```ts
it('returns 500 INTERNAL_ERROR when updateData is empty after the platform switch block', async () => {
  // ...long comment explaining why it's hard to trigger...
  expect(true).toBe(true)
})
```

This test always passes regardless of production behavior. It provides zero coverage of the guard it claims to test. A test that unconditionally passes is worse than no test — it adds false confidence and clutters the output.

**Fix:** Either delete this test entirely, or actually test the guard. The simplest approach: temporarily monkey-patch the route's switch internals via a module-level mock that forces an empty `updateData` object after the switch block. If that's not feasible, replace this with a comment in the source code and remove the test.

---

### 🔴 B3 — `upload-security.test.ts` prompt injection test does NOT verify the Anthropic payload

**File:** `src/app/api/discovery/__tests__/upload-security.test.ts:150-166`

```ts
it('wraps ocrText in <ocr-data>...</ocr-data> tags — assert via mockMessagesCreate payload', async () => {
  // ...comment explaining the limitation...
  expect(mockExtractFromOcrText).toHaveBeenCalledWith(maliciousText, 'screentime')
})
```

The test title claims it verifies `<ocr-data>` wrapping via `mockMessagesCreate`, but it only asserts that `mockExtractFromOcrText` was called with the raw text. The Anthropic SDK is mocked at the module level but `mockMessagesCreate` is never checked here.

The plan (section 3) explicitly requires:
> `assert mockMessagesCreate.mock.calls[0][0].messages[0].content includes both "<ocr-data>" and "</ocr-data>"`

The actual `<ocr-data>` wrapping _is_ verified in `extract-from-text.test.ts:113-129`, but that test operates on `extractFromOcrText` directly, not on the full upload→extract pipeline. The security test file is supposed to verify the end-to-end chain.

The test is misleading: its title promises one thing but asserts another. Any future refactor that removes `<ocr-data>` wrapping from `extractFromOcrText` would be caught by `extract-from-text.test.ts`, but not by this security test.

**Fix:** Either (a) remove `mockExtractFromOcrText` from this test and let the real `extractFromOcrText` run (requires also letting the real Anthropic mock receive the call, then asserting on `mockMessagesCreate`), or (b) rename the test to accurately describe what it asserts: `"passes raw ocrText unchanged to extractFromOcrText — wrapping verified in extract-from-text.test.ts"`.

---

## 4. Suggestions

### 🟡 S1 — `route.test.ts` Dropbox test documents the bug correctly but does not assert the intended behavior

**File:** `src/app/api/discovery/upload/__tests__/route.test.ts:1071-1075`

```ts
it('maps "Dropbox" — currently resolves to "subscriptions" due to "op" substring match in banking apps', async () => {
  // NOTE: "dropbox" contains "op" (Finnish bank), so it matches banking before storage.
  // This is a known issue in resolveAdaptiveSourceType.
  expect(await getResolvedSourceType('Dropbox')).toBe('subscriptions')
})
```

The test documents the bug and accepts the wrong behavior as correct. The plan says:
> `it('maps "Dropbox" → "storage"')`

The test name acknowledges this is wrong but asserts the wrong value anyway. This is better than asserting the right value (which would fail), but it means the bug tracker is a test file comment rather than a failing test.

**Recommendation:** Assert `'storage'` (the correct value, per plan), let the test fail, and fix `resolveAdaptiveSourceType` — move Dropbox to the storage check before banking. The banking check `lower.includes('op')` is too broad.

---

### 🟡 S2 — `ocr-client.test.ts` terminateOcr loadFailed semantics test is fragile

**File:** `src/features/discovery-flow/lib/__tests__/ocr-client.test.ts:224-234`

```ts
it('does NOT reset loadFailed — ...', async () => {
  mockCreateWorker.mockRejectedValue(new Error('WASM load failed'))
  preloadOcr()
  await new Promise((r) => setTimeout(r, 0))  // ← timing-dependent

  await terminateOcr()

  mockCreateWorker.mockClear()
  preloadOcr()
  expect(mockCreateWorker).not.toHaveBeenCalled()
})
```

The test uses `await new Promise((r) => setTimeout(r, 0))` to wait for the rejection handler. This is the same pattern used elsewhere in the file (e.g., line 106, line 227), and it works in Node.js environments where microtasks flush in a single tick. However, if the implementation uses multiple async hops, this can become a flaky ordering issue.

The test for `waitForOcr` at line 275 uses the same pattern and is more defensible there because it reads a state variable rather than timing a side-effect.

**Recommendation:** Use `await vi.waitFor(() => expect(mockCreateWorker).toHaveBeenCalledOnce())` to wait for the rejection to set `loadFailed`, then `mockClear()` and call `preloadOcr()` again. This is more robust than a raw `setTimeout(r, 0)`.

---

### 🟡 S3 — `analyze.test.ts` hardcodes `claude-sonnet-4-5-20250514` model ID

**File:** `src/server/discovery/__tests__/analyze.test.ts:351`

```ts
expect(callArgs.model).toBe('claude-sonnet-4-5-20250514')
```

The model ID is hardcoded in both `analyze.ts:416` and the test. If the model is upgraded (to Sonnet 4.6 or later), this test will correctly catch the change — which is the intended behavior. This is fine as a regression guard.

However, the model ID `claude-sonnet-4-5-20250514` is outdated relative to the project's environment comment which names `claude-sonnet-4-6` as the current Sonnet. This is a factual issue in the production code (`analyze.ts`), not the test itself. The test correctly reflects what the code does.

**Recommendation:** Update `analyze.ts:416` to use `claude-sonnet-4-6` (or whatever the canonical current Sonnet ID is), then update the test assertion to match. This is a production code issue exposed by a correct test.

---

### 🟡 S4 — `atoms.test.ts` `waitForHydration` helper races on synchronous atoms

**File:** `src/features/discovery-flow/model/__tests__/atoms.test.ts:57-81`

```ts
function waitForHydration<T>(store, atom): Promise<T> {
  return new Promise((resolve) => {
    let unsubFn: (() => void) | null = null
    let resolved = false

    unsubFn = store.sub(atom, () => {
      if (!resolved) {
        resolved = true
        const val = store.get(atom) as T
        queueMicrotask(() => unsubFn?.())
        resolve(val)
      }
    })

    if (resolved) return
    store.get(atom)  // Trigger read
  })
}
```

For atoms that return the default value synchronously (not from localStorage), `store.sub()` may never fire the callback if there is no state change. The `store.get(atom)` read at the end is meant to trigger hydration but this is not guaranteed by Jotai's `atomWithStorage` API — it depends on implementation internals.

In the tests, this helper is only called after `localStorage.setItem(...)` so there is always a non-default value to hydrate. The tests work. But if someone writes a new test using `waitForHydration` on an atom without pre-seeded localStorage, they will get a promise that never resolves.

**Recommendation:** Add a comment on the helper: `// Only call this after pre-seeding localStorage — will hang if the atom has no stored value to hydrate from`.

---

### 🟡 S5 — `upload/route.test.ts` chatgpt test strips `_rawMessages` but checks wrong field

**File:** `src/app/api/discovery/upload/__tests__/route.test.ts:705-708`

```ts
const setCall = mockDbSet.mock.calls[0][0]
expect(setCall.chatgptData._rawMessages).toBeUndefined()
expect(setCall.chatgptData.topTopics).toEqual(['AI'])
```

The `topTopics` assertion checks that `['AI']` is the final value — but this comes from `mockExtractTopicsFromMessages.mockResolvedValue({ topTopics: ['AI'], ... })` set in `beforeEach`. So the test is verifying that the mock output was passed through, not that the stripping logic preserved the right fields. This is acceptable — the stripping of `_rawMessages` is the real assertion.

However, the test does NOT verify that `totalConversations`, `timePatterns`, and `platform` are still present after stripping. A refactor that accidentally stripped those too would pass.

**Recommendation:** Add: `expect(setCall.chatgptData.conversationCount).toBeDefined()` (or whichever field name the parser returns for total count) and `expect(setCall.chatgptData.platform).toBe('chatgpt')`.

---

## 5. Nits

### 💭 N1 — `purge-auth.test.ts` duplicates nearly all of `purge/route.test.ts`

**Files:** `src/app/api/cron/purge/__tests__/route.test.ts` and `src/app/api/cron/__tests__/purge-auth.test.ts`

The `purge/route.test.ts` already covers all four authorization scenarios (missing header, wrong secret, wrong scheme, correct scheme). The `purge-auth.test.ts` covers the same four plus adds `'does not expose CRON_SECRET value in response body'`. The secret-exposure test is the only additive value.

Both files import from the same route. This duplication is harmless but creates maintenance burden — a change to the route's authorization response format requires updating two files.

**Recommendation:** Merge the secret-exposure test into `purge/route.test.ts` and delete `purge-auth.test.ts`.

---

### 💭 N2 — `webhook/route.test.ts` Resend mock uses class syntax inconsistently with other mocks

**File:** `src/app/api/billing/webhook/__tests__/route.test.ts:38-44`

```ts
vi.mock('resend', () => {
  return {
    Resend: class MockResend {
      emails = { send: mockResendEmailsSend }
    },
  }
})
```

The plan specifies:
```ts
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: mockResendEmailsSend },
  })),
}))
```

The class syntax works identically but is inconsistent with the plan's canonical form and with how other external modules are mocked in the suite. This is a cosmetic issue only.

---

### 💭 N3 — `upload/route.test.ts` "guard: empty updateData" test comment references source code structure incorrectly

**File:** `src/app/api/discovery/upload/__tests__/route.test.ts:1093-1107`

The comment says `"The route checks Object.keys(updateData).length === 0 after the switch."` This is accurate based on reading the route code, but the comment is longer than the test body (which is `expect(true).toBe(true)`). The comment is longer than a deleted test would need. This compounds B2 — if the test is being left as a placeholder, the comment should be shorter. If it's documenting a known limitation, it should be a source-code comment, not in a test file.

---

### 💭 N4 — `extract-topics.test.ts` `console.warn` spy is not restored in the `extractTopicsFromMessages` Zod error test

**File:** `src/server/discovery/__tests__/extract-topics.test.ts:147-156`

```ts
const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
// ...
warnSpy.mockRestore()
```

The spy is correctly created and restored within the `it` block. This is fine. The same pattern is used in `adaptive.test.ts` and `google-takeout.test.ts`. However, the afterEach in `extract-topics.test.ts` uses `vi.clearAllMocks()`, not `vi.restoreAllMocks()`. If `mockRestore()` is accidentally removed from a future edit, the spy would persist into subsequent tests and suppress all console.warn output. The pattern is correct today but fragile.

**Recommendation:** Change `afterEach(() => { vi.clearAllMocks() })` to `afterEach(() => { vi.clearAllMocks(); vi.restoreAllMocks() })` in files that use `vi.spyOn`.

---

## 6. Coverage Gaps vs. Plan

### Missing: `src/server/discovery/__tests__/extract-screenshot.test.ts`

The plan (section 1.3) specifies a full test file for `extractFromScreenshot` covering `subscriptions`, `battery`, `storage`, `calendar`, `health` sourceTypes, error field responses, Zod validation failures, and missing tool_use blocks. **This file does not exist.**

The upload route tests do mock `mockExtractFromScreenshot` and verify it is called, but the function's own logic (tool name selection, per-sourceType Zod schemas, `error` field handling) is untested at the unit level.

### Missing: Integration test files

The plan specifies three new integration test files:
- `test/integration/parsers-and-topics.test.ts`
- `test/integration/cross-analysis.test.ts`
- `test/integration/ocr-cyrillic.test.ts`

These are noted as requiring `ANTHROPIC_API_KEY` and are intentionally deferred, but they are not present. This is acceptable if the team tracks them separately.

### Missing: E2E tests

`test/e2e/discovery-flow.spec.ts` is not present. Same caveat as integration tests.

### Missing: `totalConversations` field on chatgpt/claude parser output

The plan specifies `parseChatGptExport` returns `totalConversations`. The test at `chatgpt.test.ts:82-93` correctly tests `result.totalConversations`. However, the `parseClaudeExport` test at `claude-export.test.ts:14-30` tests `result.totalConversations` correctly too. No gap here — confirming coverage.

---

## 7. False Positive Risk Analysis

### Could `chatgpt.test.ts` pass with a broken bomb check?

The zip bomb test at line 171 uses `vi.spyOn(JSZip, 'loadAsync')` to override `_data.uncompressedSize`. If the production code changes how it reads the uncompressed size (e.g., switches from `_data.uncompressedSize` to a different internal field), the spy would still inject into the right method but the size check would read a different field and return 0, so the bomb check would not throw — and the test would fail with `rejects.toThrow(...)` not triggering. This is correct behavior: the test would correctly catch the regression. No false positive risk here.

### Could `upload/route.test.ts` pass with a broken idempotency check?

The idempotency test at line 551 seeds `sourcesProvided: ['screentime']` in the DB mock and verifies `mockExtractScreenTime` is NOT called. If the idempotency guard were accidentally removed, `mockExtractScreenTime` would be called and the test would fail. This correctly catches the regression.

### Could `webhook/route.test.ts` pass with broken product mapping?

The `timeAudit → time_audit` mapping test at line 161-168 inspects `mockDbValues.mock.calls[0][0].product`. If the mapping were broken (e.g., `timeAudit` was stored as-is), the assertion `expect(firstInsertValues.product).toBe('time_audit')` would fail. This is a strong assertion.

### `analyze.test.ts` — could it pass if `runCrossAnalysis` is broken?

The `buildDataContext` tests call `runCrossAnalysis` which calls the mocked AI and returns `validAnalysisToolOutput`. If `runCrossAnalysis` threw before calling the AI, the test would fail with an unhandled rejection. If it called the AI but assembled the wrong user content, the content assertions would fail. No false positive risk.

---

## 8. Overall Verdict

**CONDITIONAL PASS — 3 blockers must be resolved before merging.**

| # | Severity | File | Issue |
|---|----------|------|-------|
| B1 | 🔴 Blocker | `upload-security.test.ts` | Zip bomb asserts 500 instead of catching the bug (should assert 422 and drive a fix in route.ts) |
| B2 | 🔴 Blocker | `upload/route.test.ts:1092` | `expect(true).toBe(true)` is a no-op test — delete or implement |
| B3 | 🔴 Blocker | `upload-security.test.ts:150` | Prompt injection test does not verify `mockMessagesCreate` payload as title claims |
| S1 | 🟡 Suggestion | `upload/route.test.ts:1071` | Dropbox test accepts wrong mapping — fix the source, assert `'storage'` |
| S2 | 🟡 Suggestion | `ocr-client.test.ts:227` | Replace raw `setTimeout(r, 0)` with `vi.waitFor()` for robustness |
| S3 | 🟡 Suggestion | `analyze.test.ts:351` | Outdated model ID in `analyze.ts` (Sonnet 4.5 vs 4.6) |
| S4 | 🟡 Suggestion | `atoms.test.ts:57` | `waitForHydration` helper needs usage warning comment |
| S5 | 🟡 Suggestion | `upload/route.test.ts:705` | chatgpt strip test does not assert surviving fields |
| N1 | 💭 Nit | `purge-auth.test.ts` | Duplicate of route.test.ts — merge one unique test and delete |
| N2 | 💭 Nit | `webhook/route.test.ts:38` | Resend mock style inconsistent with plan's canonical form |
| N3 | 💭 Nit | `upload/route.test.ts:1093` | Long comment on a no-op test compounds B2 |
| N4 | 💭 Nit | `extract-topics.test.ts` | `afterEach` should use `vi.restoreAllMocks()` alongside `clearAllMocks()` |

**Missing file:** `src/server/discovery/__tests__/extract-screenshot.test.ts` — this is a coverage gap, not a style issue. The function it covers (`extractFromScreenshot`) handles 5 platform-specific Zod schemas and is only exercised through route-level integration mocks. Recommend tracking as a follow-up.

The tests that do exist are well-written, catch two real bugs, and follow the reference style faithfully. The three blockers are fixable in under an hour. The Dropbox/zip-bomb issues they expose are real production bugs that the test suite should drive to resolution, not paper over.
