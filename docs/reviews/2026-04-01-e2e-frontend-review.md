# E2E Frontend Review — Discovery Flow
**Reviewed:** 2026-04-01  
**Reviewer:** Frontend Dev agent  
**Files reviewed:**
- `test/e2e/discovery-flow.spec.ts`
- `playwright.config.ts`
- `src/app/start/start-client.tsx`
- `src/features/discovery-flow/ui/QuickProfile.tsx`
- `src/features/discovery-flow/ui/DataUploadHub.tsx`

---

## Line-by-Line Issues

### `playwright.config.ts`

**Line 13 — `pnpm build && PORT=3001 pnpm start` as webServer command**
- **Severity: hack**
- Running a full production build before every test run is slow and masks real issues. Tests should run against `pnpm dev` or a pre-built artifact cached in CI. The `reuseExistingServer: true` mitigates this locally but means CI always waits 2 min+ on a cold build.
- **Fix:** Split into two stages: build in a CI step, then test against the pre-built server. Locally, document that you must run `pnpm build` first and use `reuseExistingServer: true`.

**Line 9 — `headless: true` only, no video/trace**
- **Severity: improvement**
- On failure you get a screenshot but no trace. Playwright traces capture network, console, and DOM snapshots — invaluable for debugging async failures.
- **Fix:** Add `trace: 'on-first-retry'` and `video: 'on-first-retry'` to the `use` block.

**Line 7 — `retries: 0`**
- **Severity: improvement**
- Zero retries is fine for local development but CI flake from animation timing will fail builds permanently. Consider `retries: 1` in CI via `process.env.CI ? 1 : 0`.

**Missing — no Firefox or WebKit projects**
- **Severity: missing**
- Only Chromium is tested. The app targets Gen Z / mobile-first users who may use Safari. At minimum add a WebKit project.
- **Fix:** Add `{ name: 'webkit', use: { browserName: 'webkit' } }` and `{ name: 'firefox', use: { browserName: 'firefox' } }`.

**Missing — no mobile viewport**
- **Severity: missing**
- The QuickProfile component has explicit `base/md` responsive breakpoints (side-by-side vs stacked layout). No mobile viewport is tested.
- **Fix:** Add a `{ name: 'mobile-chrome', use: { ...devices['Pixel 5'] } }` project.

---

### `test/e2e/discovery-flow.spec.ts`

#### `mockApis` function (lines 8–61)

**Lines 9–10 — `**/api/discovery/session` mock never asserts on request body**
- **Severity: antipattern**
- The mock just fulfills; it never checks what was sent. The `API receives correct profile data` test (line 362) does capture the body, but only for the session endpoint, and the assertions are incomplete (see line 399–401).
- **Fix:** In `mockApis`, add a `route.request().postData()` assertion or create a separate `captureApis` helper used in body-assertion tests.

**Lines 12–24 — `**/api/discovery/upload` mock ignores `FormData`**
- **Severity: missing**
- The upload endpoint receives `FormData` with `platform`, `sessionId`, and either `ocrText` or `file`. The mock fulfills with a static success body regardless. There is no test that verifies: (a) the correct `platform` is sent, (b) the `sessionId` matches the one from the session response, or (c) `ocrText` vs `file` branching works.
- **Fix:** Add at least one upload test that intercepts and inspects `request().postData()` or `request().headers()`.

**Lines 25–27 — `**/api/discovery/adaptive` mock returns `{ followUps: [] }`**
- **Severity: missing**
- The only tested adaptive path is "no follow-ups". The code path where `followUps.length > 0` (which transitions to the `adaptive` phase) is completely untested. This is the most business-critical branching in `handleRequestResults`.
- **Fix:** Add a test that mocks adaptive to return one or more follow-up questions and asserts the `AdaptiveFollowUp` component renders.

**Lines 39–44 — Minimal `recommendedApp` shape**
- **Severity: improvement**
- `description: 'd'` and `whyThisUser: 'w'` are non-realistic. If `AnalysisResults` renders these values visibly, tests that check for 'd' will be meaningless and could hide rendering bugs. Use realistic strings that make assertions meaningful.

#### `fresh` function (lines 63–76)

**Lines 65–67 — Double `page.goto` pattern**
```ts
await page.goto('/start', { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.goto('/start', { waitUntil: 'networkidle' })
```
- **Severity: hack**
- This is a two-pass pattern to work around the fact that Jotai's `atomWithStorage` reads from `localStorage` on first render. If the first navigation happens before `localStorage` is cleared, the atom initializes from stale state. The second navigation re-initializes with clean storage. The problem: `mockApis` is called before the first `goto`, so route handlers are registered before either navigation — that part is fine. But `waitUntil: 'networkidle'` on a page that fires `/api/discovery/session` on mount (if a session is resumed) means the first navigation may trigger a real-ish network request against the mock. The real issue is that you need a way to seed localStorage *before* the page loads.
- **Fix:** Use `page.addInitScript(() => localStorage.clear())` before the first `goto`. This runs the script in the page context before any JavaScript executes, ensuring atoms never see stale state:
  ```ts
  async function fresh(page: Page) {
    await mockApis(page)
    await page.addInitScript(() => localStorage.clear())
    await page.goto('/start', { waitUntil: 'domcontentloaded' })
    await page.locator('text=What do you do?').waitFor({ timeout: 10_000 })
    // dismiss cookie banner...
  }
  ```
  This eliminates the double navigation entirely.

**Line 69 — `await page.waitForTimeout(500) // ensure hydration`**
- **Severity: hack**
- This is an explicit timing hack. There is no guarantee 500ms is enough on a slow CI machine, and it's dead time on a fast one. The correct signal is a visible element.
- **Fix:** Remove this line. The `waitFor` on line 68 already ensures the page is hydrated enough to show "What do you do?". If the ADHD button isn't visible yet, use `page.locator('button:has-text("ADHD mode")').waitFor()` instead.

**Lines 71–75 — Cookie banner dismissal**
```ts
const acceptBtn = page.locator('button:has-text("Accept")')
if (await acceptBtn.isVisible().catch(() => false)) {
  await acceptBtn.click()
  await page.waitForTimeout(300)
}
```
- **Severity: hack + antipattern**
- Two problems: (1) `isVisible().catch(() => false)` silently swallows errors — if the locator throws for a reason other than not-visible, you'll get a false `false`. (2) `waitForTimeout(300)` after clicking Accept is another timing hack.
- The correct approach is to either (a) set a cookie/localStorage flag before the page loads (more reliable), or (b) use `locator.waitFor({ state: 'hidden' })` after clicking:
  ```ts
  await page.addInitScript(() => {
    localStorage.setItem('cookie-consent', 'accepted')
  })
  ```
  This prevents the banner from ever mounting, which is the correct E2E setup — you're not testing the cookie banner in these tests.

**Line 80 — `waitForStep` uses `text=` selector**
```ts
await page.locator(`text=${stepText}`).waitFor({ state: 'visible', timeout: 5000 })
```
- **Severity: antipattern**
- `text=` is a partial-text selector in Playwright. `text=How AI-savvy` will match any element containing that substring, including hidden ones or ones in a different part of the DOM. If the slot board shows a locked value containing that text, this could match incorrectly.
- **Fix:** Use the heading specifically: `page.locator('h2', { hasText: stepText })` or add `data-testid="step-prompt"` to the `<styled.h2>` in QuickProfile and use `page.getByTestId('step-prompt')`.

**Lines 84–85 — `pickOption` uses `button:has-text` + `.first()`**
```ts
await page.locator(`button:has-text("${text}")`).first().click()
```
- **Severity: antipattern**
- `.first()` silently picks the first match, hiding ambiguity. If there are two buttons with matching text (e.g., the "Lock in" button has "Lock in 1 picks" while another has "Lock in"), `.first()` could click the wrong one. More importantly, any text refactor (e.g., "ChatGPT" → "ChatGPT (Plus)") silently breaks the test.
- **Fix:** Add `data-testid` attributes to option buttons in QuickProfile: `data-testid={`option-${opt.toLowerCase().replace(/\s+/g, '-')}`}` and use `page.getByTestId(...)` in tests.

#### Step 1 tests (lines 107–150)

**Line 111 — `text=Step 1 of 5` as assertion**
- **Severity: antipattern**
- This asserts on rendered user-visible text. If the copy changes to "Question 1 of 5" or "1 / 5", the test breaks for no functional reason.
- **Fix:** Add `data-testid="step-counter"` to the `<styled.span>` in QuickProfile and assert on `aria-label` or a more stable attribute.

**Line 122–126 — `slot board shows all 5 labels` test**
```ts
for (const label of ['YOU ARE', 'AGE', 'PAIN POINTS', 'AI LEVEL', 'AI TOOLS']) {
  await expect(page.locator(`text=${label}`).first()).toBeVisible()
}
```
- **Severity: antipattern**
- These labels are uppercase CSS-transformed text. `text=YOU ARE` matches any element with that substring, including elements that might be off-screen. Use `.first()` suggests awareness of ambiguity but not resolution.
- **Fix:** Add `data-testid="slot-label-{id}"` to each slot row and assert against those.

**Lines 134–149 — "Something else" tests**
- **Severity: missing**
- These tests don't verify that the submitted custom value actually appears in the slot board. After pressing Enter / "Lock in", the test only checks navigation to Step 2 via `waitForStep`. The slot board should show the custom value — this is untested.

#### Step 3: Pain Points (lines 174–220)

**Line 192 — `button:has-text("dinner")`**
- **Severity: antipattern**
- This matches the pain library option that contains "dinner" as a substring. This is brittle — it relies on the pain library content and order (specifically `painLibrary.slice(0, 6)`). If the pain library changes, this test breaks silently.
- **Fix:** Pin the expected pain options by importing the test data or using stable `data-testid` attributes.

**Line 202 — `button:has-text("Lock in 3")`**
- **Severity: improvement**
- This assertion checks the button text after selecting 3 options, which is a nice behavioral check. However, it doesn't verify that the 4th option is visually de-emphasized (opacity, disabled state). The component uses `maxPicks` to prevent adding but doesn't `disabled` the buttons beyond the limit — this means a user could tap endlessly with no feedback. That's a UX gap worth testing.

**Lines 205–212 — custom pain test**
- **Severity: missing**
- The test adds a custom pain and clicks "Add", then checks for "Lock in 2". But it doesn't verify: (a) the custom option chip appears in the selection list, (b) the custom chip is de-selectable, or (c) the custom value survives the `lockMulti()` and appears in the slot board.

#### Step 5: AI Tools (lines 243–273)

**Lines 266–272 — `"None" clears other selections`**
```ts
await pickOption(page, 'ChatGPT')
await expect(page.locator('button:has-text("Lock in 1")')).toBeVisible()
await pickOption(page, 'None')
// Still 1 pick (just "None" now)
await expect(page.locator('button:has-text("Lock in 1")')).toBeVisible()
```
- **Severity: antipattern + missing**
- The test asserts the button text stays "Lock in 1", which is technically correct but doesn't verify that ChatGPT was actually cleared. A bug where `toggleMulti('None')` keeps both ChatGPT and None selected would still show "Lock in 2" — wait, actually "Lock in 2" would fail this assertion. But the inverse isn't tested: selecting None first, then selecting a tool, should clear None. That code path in `toggleMulti` is:
  ```ts
  next.delete('None')
  ```
  This is untested.

#### ADHD Mode (lines 276–292)

**Line 284 — `aria-pressed` check**
- **Severity: improvement**
- This is a good accessibility assertion. However, the component sets `aria-pressed={adhdMode}` where `adhdMode` is a boolean. Playwright's `toHaveAttribute` check with `'false'` (string) works because HTML attributes are strings. This is correct but fragile if the component ever switches to `aria-pressed={adhdMode ? 'true' : undefined}`.

**Missing — ADHD mode keyboard activation**
- **Severity: missing**
- The ADHD toggle is a `<styled.button>`. There's no test for activating it via keyboard (Space/Enter). Given the a11y focus in `start-client.tsx` (`heading.focus()`), keyboard navigation matters.

#### Form Persistence (lines 295–316)

**Line 302 — `await page.waitForTimeout(1000)`**
- **Severity: hack**
- After `page.reload()`, this waits 1 full second for hydration. The correct approach is to wait for a specific element: `await page.locator('text=Welcome back').waitFor({ timeout: 5000 })` — which the next assertion does anyway.
- **Fix:** Remove the `waitForTimeout(1000)` and rely on the `toBeVisible` assertion's built-in timeout (Playwright's default is 5s).

**Line 312 — `await page.waitForTimeout(1000)` (again)**
- **Severity: hack**
- Same issue as above.

#### Data Upload Hub (lines 319–343)

**Lines 337–342 — `"How to export" toggles instructions`**
```ts
const toggle = page.locator('button:has-text("How to export")').first()
await toggle.click()
await expect(page.locator('text=Settings').first()).toBeVisible()
```
- **Severity: antipattern**
- "Settings" is the most generic possible assertion — every instruction section mentions "Settings" (Settings → Screen Time, Settings → Battery, etc.). This assertion would pass even if the wrong section expanded. Additionally, `.first()` on both locators masks which card was actually toggled.
- **Fix:** Click a specific card's toggle by `data-testid` and assert on a unique string from that card's instructions, e.g., "See All App & Website Activity" for Screen Time.

**Missing — upload card file input interaction**
- **Severity: missing**
- No test exercises actually attaching a file to an upload card. Playwright supports `page.setInputFiles()`. This would test the `handleFile` → `fetch('/api/discovery/upload')` → status update cycle, which is the core upload flow.
- **Fix:** Add a test that calls `page.setInputFiles('input[type="file"]', ...)` and verifies the card transitions through `uploading → processing → done`.

**Missing — "Generate my results" button behavior after upload**
- **Severity: missing**
- The test verifies the button is disabled with no uploads, but never verifies it becomes enabled after a successful upload.

#### Full Flow (lines 345–403)

**Lines 348–360 — `test.fixme('profile → skip → results')`**

Root cause analysis of why Skip → results doesn't complete:

In `DataUploadHub.tsx` (line 715–736), the Skip button calls `onSkip` directly:
```tsx
onClick={onSkip}
```

In `start-client.tsx` (line 307–312), `onSkip` is `runAnalysis` (without arguments):
```tsx
<DataUploadHub
  sessionId={sessionId}
  onGenerateResults={handleRequestResults}
  onSkip={runAnalysis}
/>
```

`runAnalysis` (lines 142–174 of `start-client.tsx`) does:
1. Sets `analyzing = true` — this unmounts the phase content (`!analyzing` gate at line 292)
2. Fetches `/api/discovery/analyze`
3. On success: `setAnalysis(data.analysis)`, `setAnalyzing(false)`, `terminateOcr()`, `transitionTo('results')`

`transitionTo('results')` (lines 56–64) does:
```ts
setTransitioning(true)
setTimeout(() => {
  setPhase('results')
  setTransitioning(false)
  setFocusTrigger((n) => n + 1)
  window.scrollTo(...)
}, 300)
```

And `results` phase renders only when `phase === 'results' && analysis != null && sessionId` (line 322).

**The actual bug:** The analyze mock returns `{ success: true, analysis: null }` in the `API receives correct profile data` test (line 376). But the fixme test uses the global `mockApis` which returns a full analysis object. The `transitionTo('results')` fires after a 300ms `setTimeout`. The test waits 20s for `text=TestApp`. This should be enough time.

The likely real cause is one of:
1. **Race between `setAnalysis` and `transitionTo`**: `setAnalysis(data.analysis)` is called synchronously, then `transitionTo('results')` fires `setTimeout(..., 300)`. Inside that timeout, `setPhase('results')` triggers a re-render. At that point `analysis` should be non-null (it was set synchronously before). This should work.
2. **`terminateOcr()` throws**: If `terminateOcr()` throws an unhandled error between `setAnalysis` and `transitionTo`, the transition never fires. This is the most likely culprit — `terminateOcr` calls WASM cleanup which may not be initialized in the test environment.
3. **The `analyzing` gate**: While `analyzing === true`, the phase content is unmounted (line 292: `{!analyzing && <Box ...>}`). The `analyzing` overlay renders instead. After `setAnalyzing(false)`, React re-renders, then `transitionTo` fires 300ms later. By then `phase` should be `'results'`. Unless there's a stale closure where `phase` inside the `setTimeout` is still `'data'` — but `setPhase` is a state setter, not a read, so this shouldn't matter.

**Most likely fix:** Wrap `terminateOcr()` in a try/catch in `runAnalysis`, or mock it in tests. Then verify the `text=TestApp` appears after the 300ms animation delay by using a generous timeout (already 20s — that's fine).

```ts
// In runAnalysis:
try { terminateOcr() } catch { /* ignore in non-WASM environments */ }
```

**Lines 363–401 — `API receives correct profile data`**

**Line 379–382 — second page setup without `mockApis`**
```ts
await page.goto('/start')
await page.evaluate(() => localStorage.clear())
await page.reload()
await page.locator('text=What do you do?').waitFor({ timeout: 10000 })
```
- **Severity: hack + antipattern**
- This test sets up its own routes inline (lines 365–377) but then does `page.goto` + `localStorage.clear()` + `page.reload()` — the same double-nav anti-pattern as `fresh()`. The routes registered at lines 365–377 cover only session/upload/adaptive/analyze, but not subscribe. If the page calls subscribe on load, this will fail. More critically, `page.reload()` is used instead of `page.goto('/start')` — these behave differently for route handler lifetime.
- **Fix:** Extract common setup into `fresh()` and accept an optional route override callback.

**Line 396 — `await page.waitForTimeout(1500)`**
- **Severity: hack**
- After clicking "Lock in" on AI tools, the test waits 1.5s for the session API call to complete and the `body` variable to be populated. The correct pattern is to use `page.waitForRequest` or `page.waitForResponse`:
  ```ts
  const [sessionRequest] = await Promise.all([
    page.waitForRequest('**/api/discovery/session'),
    page.locator('button:has-text("Lock in")').click(),
  ])
  body = JSON.parse(sessionRequest.postData() ?? '{}')
  ```

**Lines 398–401 — incomplete body assertions**
- **Severity: missing**
- The test asserts `occupation`, `ageBracket`, and `aiComfort` but skips `quizPicks`, `aiToolsUsed`, and `customOccupation`/`customPain`. These are the more complex serializations in `handleDone()` and `handleProfileComplete()`.

**Line 392 — `button:has-text("stop")` for AI comfort level**
```ts
await page.locator('button:has-text("stop")').click()
```
- **Severity: antipattern**
- This matches the comfort option `"🧠 Can't stop"` via substring "stop". This is fragile — any button with "stop" in its label would match. The `pickOption` helper uses `.first()` which masks the ambiguity.
- **Fix:** Use `data-testid` or match the exact emoji string.

---

## Missing Test Cases (Global)

1. **Deselecting a multi-select option** — clicking a selected pain point or AI tool again should deselect it. Untested.
2. **Back navigation** — there is no "back" UI visible in the components, but browser back button behavior is untested.
3. **Error states** — no test simulates a 500 from `/api/discovery/session`, `/api/discovery/analyze`, or `/api/discovery/upload`. The error banner (`{error && ...}` in `start-client.tsx`) is completely untested.
4. **Network failure** — no test simulates a `fetch` rejection (connection error). The `catch` blocks in `handleProfileComplete` and `runAnalysis` set error messages that are untested.
5. **Adaptive follow-up phase** — the entire `adaptive` phase (transition to `AdaptiveFollowUp`, submitting answers, then calling `runAnalysis` with `adaptiveAnswers`) is untested.
6. **`AnalysisResults` rendering** — the results phase is tested only in the fixme'd test. No test verifies that the analysis response shape actually renders correctly.
7. **Upload card multi-file behavior** — Screen Time allows up to 4 uploads (`SCREENTIME_MAX_FILES = 4`). No test verifies that multiple sequential uploads are tracked correctly via `uploadCount`.
8. **Keyboard navigation through profile steps** — Tab, Space, Enter interactions are untested.
9. **Focus management** — `start-client.tsx` explicitly manages focus on phase transitions (lines 43–52). No test asserts which element receives focus after a transition.
10. **"Start fresh" from mid-profile** — `handleStartFresh` resets all atoms. Only tested after a full profile + reload. Not tested mid-profile (e.g., after step 3).
11. **Mobile slot board collapse** — the `boardExpanded` toggle (QuickProfile lines 286–311) is only visible on mobile. No mobile viewport test exercises it.
12. **Deep source "Start free trial" CTA** — `handleStartTrial` calls `/api/billing/checkout`. No mock or test exists for this path.

---

## Hacks List

| # | Location | Hack | Correct Fix |
|---|----------|------|-------------|
| H1 | `fresh()` L65–67 | Double `page.goto` to reset Jotai state | `page.addInitScript(() => localStorage.clear())` before first goto |
| H2 | `fresh()` L69 | `waitForTimeout(500)` for hydration | Remove; rely on element waitFor |
| H3 | `fresh()` L74 | `waitForTimeout(300)` after cookie dismiss | `waitFor({ state: 'hidden' })` on banner, or suppress via localStorage |
| H4 | `FormPersistence` L302 | `waitForTimeout(1000)` after reload | Remove; the subsequent `toBeVisible` has its own timeout |
| H5 | `FormPersistence` L312 | `waitForTimeout(1000)` after reload | Same as H4 |
| H6 | `FullFlow` L396 | `waitForTimeout(1500)` for session API capture | `page.waitForRequest` + Promise.all pattern |
| H7 | `fresh()` L71 | `isVisible().catch(() => false)` for cookie banner | Suppress banner via localStorage init script |
| H8 | `FullFlow` L379–382 | `goto` + `evaluate(clear)` + `reload` | Refactor into `fresh()` with route override |
| H9 | `playwright.config.ts` L13 | Build + start in webServer command | Separate build step; test against pre-built server |

---

## Summary

The test suite covers the happy path of the 5-step profile well. The core problems are:

1. **Timing hacks throughout** — 5 `waitForTimeout` calls that should be replaced with condition-based waits.
2. **Brittle text selectors** — `has-text` on option buttons and step prompts will break on any copy change. The components need `data-testid` attributes on interactive elements.
3. **The fixme test** — most likely broken by `terminateOcr()` throwing in a non-WASM test environment. Wrap it in try/catch.
4. **Critical untested paths** — adaptive follow-up, error states, network failures, file upload interaction, and the entire `AnalysisResults` render are all missing.
5. **No mobile testing** — a responsive component with explicit `base/md` breakpoints has zero mobile coverage.

The cookie banner suppression pattern and the double-navigation state reset are the two hacks that will cause the most flake in CI and should be fixed first.
