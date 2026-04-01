# E2E Validation Report — 2026-04-01

**Validator:** QA agent  
**Scope:** Debugger fix (onSkip) + Timeout-griller rewrite (discovery-flow.spec.ts)  
**Result: PASS with fixes — 23/23 tests passing after 3 corrections**

---

## 1. onSkip Fix Validation

**Change:** `onSkip={runAnalysis}` → `onSkip={() => runAnalysis()}`  
**File:** `src/app/start/start-client.tsx:310`

**Verdict: CORRECT.**

`runAnalysis` has signature `async function runAnalysis(adaptiveAnswers?: Record<string, string>)`. If passed directly as `onClick={runAnalysis}`, the button's click event would call `runAnalysis(mouseEvent)`. The `mouseEvent` object is non-null, passes the `adaptiveAnswers && Object.keys(adaptiveAnswers).length > 0` check (MouseEvent has enumerable properties), and would send garbage data to the analyze API.

The wrapper `onSkip={() => runAnalysis()}` correctly calls with no arguments, so `adaptiveAnswers` stays `undefined`.

### Other event handler audit in DataUploadHub and start-client.tsx

| Handler | Prop | Signature | Safe? |
|---------|------|-----------|-------|
| `onSkip={() => runAnalysis()}` | `DataUploadHub.onSkip: () => void` | No args passed | **Yes** (fixed) |
| `onGenerateResults={handleRequestResults}` | `DataUploadHub.onGenerateResults: () => void` | `onClick={onGenerateResults}` passes MouseEvent, but `handleRequestResults` takes no args | **Yes** — excess args are silently ignored in JS |
| `onComplete={runAnalysis}` | `AdaptiveFollowUp.onComplete: (answers: Record<string,string>) => void` | Called as `onComplete(answers)` — correct type | **Yes** |
| `onStartOver={handleStartFresh}` | `AnalysisResults.onStartOver: () => void` | Used as `onClick={onStartOver}` — MouseEvent ignored, `handleStartFresh` takes no args | **Yes** |

No additional leaks found. The only problematic handler was `onSkip`, now fixed.

---

## 2. Rewritten E2E Test Validation

### 2a. waitForTimeout / force / catch audit

Searched entire rewritten file:

- `waitForTimeout` calls: **0**
- `{ force: true }` calls: **0**
- `.catch(() => false)` calls: **0**

All hacks from the audit are gone.

### 2b. addInitScript + Jotai atomWithStorage compatibility

`atomWithStorage` reads `localStorage` during its initializer, which runs on module evaluation. `addInitScript` is guaranteed to run before any page JS. The pattern works correctly for initial page loads.

**However, `addInitScript` runs on EVERY navigation, including `page.reload()`.**

The rewritten `startFresh` function called:
```ts
await page.addInitScript(() => {
  localStorage.clear()
  localStorage.setItem('cookie-consent', 'accepted')
})
```

This fired on `page.reload()` too, wiping Jotai atom state that the Form Persistence tests depend on. Fixed with a `sessionStorage` once-guard (see Section 3).

### 2c. Cookie consent localStorage key format

**Critical bug in the rewritten tests:**

The consent system (`src/features/cookie-consent/lib/use-consent-state.ts`) stores consent as a JSON record:
```ts
{ version: 1, timestamp: number, analytics: boolean }
```

The `parseRecord()` function calls `JSON.parse(raw)`. Setting `localStorage.setItem('cookie-consent', 'accepted')` causes `JSON.parse('accepted')` to throw, the catch returns `null`, and `getStoredConsent()` returns `'undecided'`. The cookie banner renders and overlays the Skip button, causing the Full Flow test to fail (skip click is blocked by the banner).

Fixed in Section 3.

### 2d. Step helper functions

All helpers use `page.locator('button:has-text(...)')` selectors and `waitForStep` patterns. These match the actual rendered text in QuickProfile. Verified:

- `completeOccupation`: selects by partial text ('Working', 'Student', 'Freelance' etc.) — matches QuickProfile options
- `completeAge`: '16-20', '21-25', '26-30', '30+' — matches age options
- `completePainPoints`: multi-select + 'Lock in' button — correct
- `completeAiComfort`: single tap advances — correct
- `completeAiTools`: multi-select + 'Lock in' — correct

### 2e. Results phase assertion

**Bug in the rewritten Full Flow test:**

```ts
await page.locator('text=TestApp').waitFor({ state: 'visible', timeout: 20000 })
```

`TestApp` is `analysis.recommendedApp` (index 0). `LockedRecommendationCard` only renders the app's real name when `position === 'second'` (index 1). At index 0, the card renders blurred honeypot content: "Removing the CSS doesn't show this. Nice try." — `TestApp` is never in the DOM.

Fixed: assert on `text=App2` (the `additionalApps[0]` entry, always at index 1, always visible).

---

## 3. Fixes Applied

### Fix A: Cookie consent JSON format in startFresh

**File:** `test/e2e/discovery-flow.spec.ts` — `startFresh` function

```ts
// BEFORE (broken):
localStorage.setItem('cookie-consent', 'accepted')

// AFTER (correct):
localStorage.setItem(
  'cookie-consent',
  JSON.stringify({ version: 1, timestamp: Date.now(), analytics: true }),
)
```

### Fix B: sessionStorage once-guard in startFresh

**File:** `test/e2e/discovery-flow.spec.ts` — `startFresh` function

```ts
// BEFORE: addInitScript fires on every navigation (including reload), wiping
// persistence test data.

// AFTER: once-guard via sessionStorage — only clears on the first navigation
await page.addInitScript(() => {
  if (!sessionStorage.getItem('_e2e_init')) {
    sessionStorage.setItem('_e2e_init', '1')
    localStorage.clear()
    localStorage.setItem(
      'cookie-consent',
      JSON.stringify({ version: 1, timestamp: Date.now(), analytics: true }),
    )
  }
})
```

`sessionStorage` persists within the same page session across reloads but does not survive fresh navigations (new `page.goto`). This ensures `localStorage.clear()` fires exactly once per test: on the initial `goto('/start')`, but not on `page.reload()` calls in persistence tests.

### Fix C: Cookie consent JSON format in 'API receives correct profile data'

**File:** `test/e2e/discovery-flow.spec.ts` — standalone `addInitScript` in the API test

Same string-to-JSON-record correction as Fix A. This test does not use `startFresh`, so the once-guard was not needed (no reloads in that test), but the consent format still had to be fixed.

### Fix D: Full Flow results assertion

**File:** `test/e2e/discovery-flow.spec.ts:422`

```ts
// BEFORE:
await page.locator('text=TestApp').waitFor({ state: 'visible', timeout: 20000 })

// AFTER:
await page.locator('text=App2').waitFor({ state: 'visible', timeout: 20000 })
```

`TestApp` (index 0) is always blurred. `App2` (index 1) is always the visible recommendation card.

---

## 4. Final Test Results

```
Running 23 tests using 1 worker
23 passed (1.4m)
```

All 23 tests pass. Zero `waitForTimeout`, zero `{ force: true }`, zero `.catch(() => false)`.
