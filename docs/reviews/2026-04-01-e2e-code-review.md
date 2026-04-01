# E2E Code Review: `test/e2e/discovery-flow.spec.ts`

**Reviewed:** 2026-04-01
**Reviewer:** Code Reviewer agent
**Files:** `test/e2e/discovery-flow.spec.ts`, `playwright.config.ts`, `src/app/start/start-client.tsx`, `src/features/discovery-flow/ui/QuickProfile.tsx`

---

## Summary

The test suite covers the happy path of the discovery flow adequately and the structure is broadly sensible. However there are several DRY violations, brittle locator strategies, insufficient assertions, and one fixme whose root cause is now traceable. These are documented below.

---

## Issues

### DRY Violations

**🔴 `beforeEach` navigation duplicated in every describe block**
File: `discovery-flow.spec.ts:155-159`, `177-183`, `225-234`, `245-257`

Every `beforeEach` for Steps 2–5 duplicates the full navigation sequence from `fresh()` up to that step. There is no shared helper for "navigate to step N". This means:

- A single label change in `QuickProfile.tsx` (e.g., `'How old are you?'` → `'Your age?'`) requires updates in 4+ places.
- The `'Job hunting'` occupation in Step 3's `beforeEach` uses `'Student'` instead of a shared constant, making the test data inconsistent.

**Fix:** Extract a `navigateToStep(page, n)` helper or a `stepSetup` map. Each `beforeEach` should call e.g. `await navigateToStep(page, 3)`, with the navigation chain defined once.

---

**🟡 `completeProfile` mixes two click styles for the same intent**
File: `discovery-flow.spec.ts:89-103`

`completeProfile` uses `pickOption(page, 'Email')` on line 94 for most options, but then falls back to `page.locator('button:has-text("Email")').click()` directly on lines 94-95. The two patterns are equivalent — `pickOption` is just a thin wrapper. Pick one.

More specifically: lines 94-95 and 98 bypass `pickOption` entirely with raw locator calls while lines 90, 92, 100 use `pickOption`. This is inconsistent within the same function.

---

**🟡 Cookie-dismiss logic in `fresh()` is not reusable**
File: `discovery-flow.spec.ts:71-75`

The cookie banner dismiss is inlined in `fresh()`. If any test needs to dismiss the banner in a different context (e.g., a test that navigates mid-flow), the logic would need to be duplicated. Extract a `dismissCookieBanner(page)` helper.

---

**🟡 `waitForStep` is a thin one-liner that doesn't add enough value**
File: `discovery-flow.spec.ts:79-81`

```ts
async function waitForStep(page: Page, stepText: string) {
  await page.locator(`text=${stepText}`).waitFor({ state: 'visible', timeout: 5000 })
}
```

The 5000ms timeout is hardcoded. If the test environment is slow (CI, cold start), this will be the first thing that flakes. Either accept timeout as a parameter with a default, or use Playwright's global `timeout` from the config consistently. As written it silently overrides the global 30s timeout with 5s for all step transitions.

---

### Naming

**🟡 Test names are inconsistent in style**
File: `discovery-flow.spec.ts:110`, `134`, `143`, `161`, `167`

Some tests use imperative present-tense (`'renders step counter and all options'`, `'shows all age options'`), others use outcome-first (`'tapping option advances to step 2'`, `'auto-advances on tap'`). Neither is wrong, but mixing them within the same describe block makes the test report harder to scan.

Standardise on `'<subject> <behaviour> when <condition>'` or the Playwright convention of action → outcome. For example:

- `'renders step counter and all options'` → `'step counter and all occupation options are visible on load'`
- `'auto-advances on tap'` → `'selecting an AI comfort level advances to step 5 automatically'`

---

**🟡 `fresh()` is an opaque name**
File: `discovery-flow.spec.ts:63`

`fresh` reads like a boolean flag. A verb like `startFresh(page)` or `loadFreshSession(page)` communicates the side effects (mock setup + navigation + localStorage wipe) without needing the reader to inspect the body.

---

**💭 `pickOption` is slightly misleading for multi-select steps**
File: `discovery-flow.spec.ts:84-86`

`pickOption` wraps `button:has-text(text).first().click()`. For multi-select steps (pain points, AI tools) this function is used to select one of N options, but its name implies completing a choice. Callers like `await pickOption(page, 'ChatGPT')` at line 100 in `completeProfile` are fine, but new contributors might assume it also locks in the choice. A name like `selectOption` would be more accurate.

---

### Structure

**🟡 23 tests in a single file covering 7 distinct concern areas**
File: `discovery-flow.spec.ts`

The file mixes unit-style step tests (Steps 1–5), feature tests (ADHD Mode, Persistence), integration tests (Data Upload Hub), and a full E2E flow. Splitting by concern would improve isolation and parallel execution:

- `profile-steps.spec.ts` — Steps 1–5
- `adhd-mode.spec.ts` — ADHD toggle
- `persistence.spec.ts` — localStorage reload
- `upload-hub.spec.ts` — Data upload
- `full-flow.spec.ts` — API capture + fixme

The `Full Flow` describe is particularly out of place: `'API receives correct profile data'` is an integration/API contract test, while the fixme is an incomplete E2E scenario. These belong in different files.

---

**🟡 `playwright.config.ts` has `retries: 0` with no CI override**
File: `playwright.config.ts:6`

Zero retries is fine for local runs to get fast feedback, but CI typically benefits from `retries: 2` to handle flakiness from animation timings (which this suite relies on heavily with `waitForTimeout`). There is no `process.env.CI` check. Consider:

```ts
retries: process.env.CI ? 2 : 0,
```

---

**💭 `webServer` runs `pnpm build && PORT=3001 pnpm start` on every CI run**
File: `playwright.config.ts:13`

Full production builds take 30-120s per run. This is fine for a current small project but will become a friction point. Note it for future: a dev-mode server (`pnpm dev`) with `waitForPort` is faster for iteration; production mode should be reserved for pre-release E2E.

---

### Error Handling

**🔴 `page.locator('button:has-text("Lock in")')` matches ambiguously**
File: `discovery-flow.spec.ts:95`, `101`, `147`, `216`, `254`, `313`

There are multiple `Lock in` buttons in different states simultaneously. The text locator `button:has-text("Lock in")` will always return the first DOM match, which may or may not be the one being tested. On multi-select steps, the button text changes to `Lock in 2 picks` / `Lock in 3 picks`, so `.click()` on a bare `Lock in` locator hits whichever appears first. In `completeProfile`, line 95 and 101, the same locator is used for different intents.

When this misfires, Playwright's error is `Locator.click: strict mode violation — resolved to N elements`, which is actually helpful. But the risk is it silently clicks the wrong button in some DOM orderings.

**Fix:** Use `getByRole('button', { name: /Lock in/ })` with exact matching where needed, or add `data-testid` attributes to disambiguate the primary action button.

---

**🟡 `await acceptBtn.isVisible().catch(() => false)` swallows real errors**
File: `discovery-flow.spec.ts:72`

`.isVisible()` on a `Locator` does not throw when the element is absent — it returns `false`. The `.catch(() => false)` pattern is therefore unnecessary and hides actual unexpected errors (e.g., a navigation failure that causes `isVisible` to throw for a different reason). Remove the `.catch`.

---

**🟡 `page.waitForTimeout` used 3 times as a proxy for state settling**
File: `discovery-flow.spec.ts:69`, `74`, `302`, `306`, `396`

`waitForTimeout(500)` for hydration and `waitForTimeout(1000)` for reload are test smells. They make the suite slow and still flaky — the right amount of time is unknowable ahead of execution. Replace with deterministic waits:

- Line 69: Wait for the first interactive element instead (`page.locator('button:has-text("Student")').waitFor()`)
- Line 74: After clicking Accept, wait for the banner to disappear: `await acceptBtn.waitFor({ state: 'hidden' })`
- Line 302/306: After reload, wait for `text=Welcome back` or `text=What do you do?` instead of a fixed 1s sleep
- Line 396: After lock-in, wait for the `session` API route to resolve using `page.waitForResponse`

---

### Type Safety

**🟡 `body` typed as `Record<string, unknown> | null` with `?.` access**
File: `discovery-flow.spec.ts:363`, `398-401`

The type is accurate, but the assertions at line 399–401 use optional chaining (`body?.occupation`) which means a `null` body would silently pass `toBe('freelance')` rather than failing the assertion with a clear message. Prefer:

```ts
expect(body).not.toBeNull()
const b = body as Record<string, unknown>  // safe after above assertion
expect(b.occupation).toBe('freelance')
```

Or define a typed interface for the expected request body so field names are caught by TypeScript rather than failing at runtime.

---

**💭 `as` cast on route handler body**
File: `discovery-flow.spec.ts:366`

`body = JSON.parse(route.request().postData() ?? '{}')` returns `unknown`. Assigning directly to `Record<string, unknown> | null` is an implicit cast. This is low risk but worth naming: TypeScript doesn't validate `JSON.parse` results, so a malformed payload would produce a runtime error rather than a type error.

---

### Mock Consistency

**🟡 Mock response fields use single-character strings**
File: `discovery-flow.spec.ts:38-55`

All description, whyThisUser, headline, detail, and source fields are `'d'`, `'w'`, `'h'`, `'s'`. This is fine as a contract-level check, but it means:

- Any UI component that renders these fields and conditionally shows/hides based on length or content would not be exercised.
- A bug where `description` is mapped to the wrong field would not be caught — `'d' === 'd'` regardless of which field it came from.

Use realistic minimal values: `description: 'Screen time tracker app'`, `whyThisUser: 'You spend 2h/day on Instagram'`. This catches field-mapping bugs without adding noise.

---

**🟡 `aiComfort` mock expectation uses a magic number**
File: `discovery-flow.spec.ts:401`

```ts
expect(body?.aiComfort).toBe(4)
```

The value `4` comes from `COMFORT_MAP["\u{1F9E0} Can't stop"]` in `QuickProfile.tsx`. This is implicit — a reader must open the source to verify the mapping. The test clicks `'button:has-text("stop")'` (line 392), which matches the `"Can't stop"` option. Add a comment:

```ts
// "Can't stop" maps to aiComfort: 4 per COMFORT_MAP in QuickProfile.tsx
expect(body?.aiComfort).toBe(4)
```

Or better, expose `COMFORT_MAP` as a tested constant and import it in the test.

---

### Assertions

**🟡 Most tests only assert visibility — not content or state**

- `'slot board shows all 5 labels'` (line 121): checks that label text exists but not that they appear in order or that they correspond to the correct slot indices.
- `'toggle exists, off by default'` (line 280): checks `aria-pressed="false"` — good. But after toggle, line 287 only checks visibility of the placeholder text, not that `aria-pressed` became `"true"`.
- `'"Generate results" disabled, "Skip" enabled'` (line 332): asserts disabled state, but does not assert that clicking Skip triggers an API call or that the button becomes active after upload.
- `'"How to export" toggles instructions'` (line 337): checks that `text=Settings` appears, which is an implementation detail that breaks if the instruction copy changes. A `data-testid="export-instructions"` with `.toBeVisible()` is more robust.

---

**🟡 `'max 3 enforced'` test assertion is indirect**
File: `discovery-flow.spec.ts:196-202`

The test clicks 4 buttons and then checks `button:has-text("Lock in 3")` is visible. This verifies the UI count text but not that the 4th item was actually rejected from the selection set. If the component displays `Lock in 3` while internally storing 4 picks, this test would pass incorrectly. Add:

```ts
await expect(page.locator('button:has-text("Posting to every")[aria-pressed="true"]')).not.toBeVisible()
```

Or check that only 3 buttons have `aria-pressed="true"`:

```ts
await expect(page.locator('[aria-pressed="true"]')).toHaveCount(3)
```

---

**🟡 `'"None" clears other selections'` assertion is wrong**
File: `discovery-flow.spec.ts:266-272`

The comment says `// Still 1 pick (just "None" now)` and the assertion checks `button:has-text("Lock in 1")`. But this does not verify that `ChatGPT` was deselected — it only verifies the count is 1. If the component erroneously kept `ChatGPT` selected alongside `None` (count 2), the test would fail. But if it kept `ChatGPT` and dropped `None` to show count 1, it would pass incorrectly.

Add:
```ts
await expect(page.locator('button:has-text("ChatGPT")[aria-pressed="true"]')).not.toBeVisible()
await expect(page.locator('button:has-text("None")[aria-pressed="true"]')).toBeVisible()
```

---

### The Fixme Test — Root Cause Trace

**🔴 `'profile → skip → results'` — fixme root cause identified**
File: `discovery-flow.spec.ts:348-360`

The test comment says:
> "Likely a timing issue between Jotai state update and React render."

After tracing the actual code path in `start-client.tsx`:

1. `onSkip` is wired to `runAnalysis` directly (line 308: `onSkip={runAnalysis}`).
2. `runAnalysis` calls `fetch('/api/discovery/analyze')`, awaits the response, then calls `setAnalysis(data.analysis)` followed by `transitionTo('results')` (lines 165-169).
3. `transitionTo` sets `transitioning = true`, then after a **300ms `setTimeout`** sets `phase = 'results'` (lines 57-63).
4. The `{phase === 'results' && analysis != null && ...}` conditional (line 322) requires **both** `phase === 'results'` AND `analysis != null` to be true simultaneously.

The bug is a **race between `setAnalysis` and the phase transition**:

- `setAnalysis(data.analysis)` is called at line 166 — this schedules a React state update.
- `transitionTo('results')` is called at line 169 — this sets `transitioning = true` immediately, then schedules `setPhase('results')` inside a `setTimeout(..., 300)`.
- The 300ms delay means `phase` becomes `'results'` 300ms after `setAnalysis` was called.
- **In E2E, the mock returns immediately (no network delay).** This means the sequence is compressed: `setAnalysis` fires, React batches it, but `transitioning = true` causes the phase content box to animate out (`phaseExit` animation), which hides `AnalysisResults` even after `phase` transitions. The content area (`{!analyzing && <Box ...>}`) is only visible when `!analyzing`, but `setAnalyzing(false)` is called at line 167, one line before `transitionTo`. So the content briefly renders with `phase === 'data'` (DataUploadHub) during the 300ms exit animation, then switches to `AnalysisResults`.

The actual failure is that `page.locator('text=TestApp').waitFor({ timeout: 20000 })` is looking for the `recommendedApp.name` from the analysis response. `AnalysisResults` only renders when `analysis != null` AND `phase === 'results'`. Given the `setAnalysis` call happens before `transitionTo`, `analysis` should be non-null when `phase` becomes `'results'`. So the data race is not the real issue.

**The real issue is the `analyzing` flag.** After `runAnalysis` calls `setAnalyzing(false)` and `transitionTo('results')`, the phase content box becomes visible (because `!analyzing` is true). But during the 300ms window before `setPhase('results')` fires, `phase` is still `'data'`, so `DataUploadHub` renders. Then when `setPhase('results')` fires inside the setTimeout, another render cycle runs and `AnalysisResults` appears. In E2E, the `waitFor('text=TestApp', timeout: 20000)` should be long enough to catch this. 

The most likely real failure: **`data.analysis` is `null` in the mock.** Looking at the fixme test's mock at line 374:
```ts
body: '{"success":true,"analysis":null}'
```
`analysis` is **explicitly `null`**. So `setAnalysis(null)` is called. The render condition `phase === 'results' && analysis != null` will never be true. `AnalysisResults` never mounts. `text=TestApp` never appears.

This is not a timing issue. The fixme mock is broken: it returns `"analysis": null`, which means the results phase never renders. Fix the mock to return the same full analysis object as `mockApis()` uses (lines 33-56), and remove the fixme.

---

## Hacks List

These are the quick pragmatic fixes that should be addressed before this test suite is considered production-grade:

| # | Location | Hack | Fix |
|---|----------|------|-----|
| 1 | `spec:69,74,302,306,396` | `waitForTimeout` used as hydration/settle guard | Replace with deterministic `waitFor` / `waitForResponse` |
| 2 | `spec:71-75` | `.catch(() => false)` on `isVisible()` | Remove the catch; `isVisible()` is safe |
| 3 | `spec:95,101,147,216,254,313` | `button:has-text("Lock in")` is ambiguous | Use `getByRole` with exact name or add `data-testid` |
| 4 | `spec:374` | Fixme mock sets `"analysis": null` — results never render | Use full analysis mock from `mockApis()` |
| 5 | `spec:89-103` | `completeProfile` mixes `pickOption` and raw `.click()` | Use `pickOption` consistently |
| 6 | `spec:155-257` | `beforeEach` navigation chains duplicated in 4 describes | Extract `navigateToStep(page, n)` helper |
| 7 | `spec:44-54` | Mock fields are single-char strings (`'d'`, `'w'`) | Use realistic minimal values to catch field-mapping bugs |
| 8 | `spec:266-272` | `'"None" clears other selections'` only checks count, not which items are selected | Assert `aria-pressed` on both `ChatGPT` and `None` buttons |
| 9 | `playwright.config.ts:6` | `retries: 0` with no CI override | Add `process.env.CI ? 2 : 0` |
| 10 | `spec:63` | `fresh` is a noun/adjective, not a verb | Rename to `startFresh` or `loadFreshSession` |
