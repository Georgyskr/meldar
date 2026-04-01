# E2E Clean Code Review — discovery-flow.spec.ts

**Reviewed:** 2026-04-01  
**File:** `test/e2e/discovery-flow.spec.ts`  
**Reviewer:** Clean Code Agent

---

## Summary

The test file is well-structured for a first pass and the helper abstraction layer (`fresh`, `waitForStep`, `pickOption`, `completeProfile`) is a good instinct. However, there are clear DRY violations, several magic values, at least two "hack" workarounds that mask real timing issues, and one fixme test with a misleading comment. Below is a full audit.

---

## Issues

### 1. DRY — `beforeEach` setup is copy-pasted four times

**Principle violated:** DRY  
**Location:** lines 155–159 (Step 2), 177–183 (Step 3), 225–234 (Step 4), 245–257 (Step 5)

Each `beforeEach` replays the same navigation sequence to reach its target step, manually repeating every `pickOption` and `waitForStep` call. Only two of them delegate to `completeProfile`; the other four inline the steps entirely.

The issue is that `completeProfile` navigates through all 5 steps at once. It cannot be used for mid-flow entry. The fix is to break the navigation into composable step helpers:

```ts
// Composable step helpers
async function completeOccupation(page: Page, pick = 'Working') {
  await pickOption(page, pick)
  await waitForStep(page, 'How old are you?')
}

async function completeAge(page: Page, pick = '26-30') {
  await pickOption(page, pick)
  await waitForStep(page, 'What bugs you most?')
}

async function completePainPoints(page: Page, picks = ['Email', 'Posting to every']) {
  for (const pick of picks) await page.locator(`button:has-text("${pick}")`).click()
  await page.locator('button:has-text("Lock in")').click()
  await waitForStep(page, 'How AI-savvy')
}

async function completeAiComfort(page: Page, pick = 'A few times') {
  await page.locator(`button:has-text("${pick}")`).click()
  await waitForStep(page, 'Which AI tools')
}
```

Then each `beforeEach` composes only what it needs:

```ts
// Step 4 beforeEach becomes:
await fresh(page)
await completeOccupation(page, 'Freelance')
await completeAge(page, '30+')
await completePainPoints(page, ['Email', 'Money goes'])
```

This also makes the pain point selection explicit per test group rather than hidden.

---

### 2. DRY — Magic values repeated at least 14 times

**Principle violated:** DRY + Naming  
**Location:** throughout the file

The following strings appear across multiple test blocks with no single source of truth:

| Value | Occurrences |
|---|---|
| `'Working'` | lines 90, 114, 248 |
| `'26-30'` | lines 92, 100, 250, 385 |
| `'ChatGPT'` | lines 100, 261, 329 |
| `'Email'` | lines 94, 189, 197, 215, 231, 253, 387 |
| `'Lock in'` | lines 96, 101, 147, 217, 254, 263, 395 |
| `'A few times'` | lines 98, 256 |
| `'How old are you?'` | lines 91, 157, 228, 249 |
| `'What bugs you most?'` | lines 93, 181, 229, 251 |
| `'How AI-savvy'` | lines 97, 234, 255 |
| `'Which AI tools'` | lines 99, 257 |

These should be constants at the top of the file:

```ts
const STEP_LABELS = {
  age: 'How old are you?',
  pain: 'What bugs you most?',
  aiComfort: 'How AI-savvy',
  aiTools: 'Which AI tools',
  upload: 'Add your data',
} as const

const DEFAULT_PROFILE = {
  occupation: 'Working',
  age: '26-30',
  aiComfort: 'A few times',
  aiTool: 'ChatGPT',
} as const
```

When a label changes in the UI, you currently need to hunt through 30+ scattered string literals. With constants, it's one edit.

---

### 3. SRP — `completeProfile` does 7 distinct user gestures in one function

**Principle violated:** SRP  
**Location:** lines 89–103

`completeProfile` completes all 5 steps — it's a convenience shortcut, not a focused helper. That's acceptable, but the implementation body picks specific pain points (`Email`, `Posting to every`) and a specific AI comfort level (`A few times`) with no parameters. Tests that call `completeProfile` are opaque: a reader cannot tell what profile data is being submitted without reading the helper.

Fix: Either accept an options bag with defaults, or (better) compose it from the step helpers proposed in issue #1:

```ts
async function completeProfile(page: Page) {
  await completeOccupation(page)
  await completeAge(page)
  await completePainPoints(page)
  await completeAiComfort(page)
  await completeAiTools(page)
}
```

Now the body is declarative and each sub-helper's default values document the canonical profile.

---

### 4. SRP — `'API receives correct profile data'` test does too much

**Principle violated:** SRP  
**Location:** lines 362–402

This test:
1. Sets up its own full API route mocks (duplicating `mockApis`)
2. Navigates through the entire 5-step profile manually (duplicating `completeProfile`)
3. Asserts `occupation`, `ageBracket`, and `aiComfort` in a single test

Three unrelated field assertions in one test means a failure message (`Expected 'freelance' to equal...`) gives no localization. Each assertion should be its own test, and the navigation should use the step helpers.

Additionally, this test uses different values than all other tests (`Freelance`, `26-30`, `Claude`, `stop`) without explaining why. If the intent is to test a non-default profile, name the test that way.

---

### 5. KISS — `fresh()` navigates twice

**Principle violated:** KISS  
**Location:** lines 63–76

```ts
await mockApis(page)
await page.goto('/start', { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.goto('/start', { waitUntil: 'networkidle' })
```

The double navigation exists to clear localStorage after the first load. But routes are registered before the first navigation, so there's no reason the first load needs to complete at all. The intent is: "start from a clean state with mocks active." A cleaner approach:

```ts
async function fresh(page: Page) {
  await page.addInitScript(() => localStorage.clear())
  await mockApis(page)
  await page.goto('/start', { waitUntil: 'networkidle' })
  await page.locator('text=What do you do?').waitFor({ timeout: 10000 })
  await dismissCookieBanner(page)
}
```

`addInitScript` runs before any page JavaScript, so localStorage is empty on the first load. One navigation, no double-load.

---

### 6. Naming — `fresh` is a vague function name

**Principle violated:** Naming  
**Location:** line 63

`fresh(page)` tells you nothing about what it does. It could mean "fresh page" or "fresh state". A reader must inspect the body to understand. Better names: `setupPage`, `navigateToStart`, or `startWithCleanState`. Given that it both mocks APIs and navigates, `startFresh` (mirroring the "Start fresh" button in the UI) is a readable choice.

---

### 7. Naming — Single-letter `d`, `w` in mock data

**Principle violated:** Naming  
**Location:** lines 36–45 (`mockApis`)

```ts
description: 'd',
whyThisUser: 'w',
```

These are placeholder stubs, which is fine in mocks. But if a test ever accidentally asserts on these values, the failure message (`Expected 'd' to equal...`) is meaningless. Use `'mock-description'` and `'mock-reason'` — they're explicit and grep-able if a test leaks through.

---

### 8. Dead code — Comment at line 77 restates the code

**Principle violated:** DRY (comments)  
**Location:** line 78

```ts
/** Wait for step transition (animation + state) */
async function waitForStep(page: Page, stepText: string) {
```

The function name `waitForStep` already says this. The comment adds nothing. Remove it.

Similarly, line 105:
```ts
// ── Step 1: Occupation ─────────────────────────────────────────────────────
```
These ASCII-art section dividers are redundant because `test.describe('Step 1: Occupation', ...)` immediately follows. They add visual noise. The `test.describe` block IS the section header.

---

### 9. Guard clause vs. hack — cookie banner dismissal

**Principle violated:** Guard clauses / KISS  
**Location:** lines 71–75

```ts
const acceptBtn = page.locator('button:has-text("Accept")')
if (await acceptBtn.isVisible().catch(() => false)) {
  await acceptBtn.click()
  await page.waitForTimeout(300)
}
```

This is a workaround, not a guard clause. Three problems:

1. **`.catch(() => false)` swallows errors.** `isVisible()` does not throw on a hidden element — it returns `false`. The `.catch` only masks unexpected Playwright errors, silently hiding real problems.

2. **The `waitForTimeout(300)` is a timing hack.** It assumes the banner animation takes under 300ms. This is flaky by nature.

3. **The condition itself is a sign of environmental inconsistency.** If the cookie banner appears in some runs and not others, that's a test environment problem (state leaking between tests) that should be fixed, not worked around. Either always dismiss it (guarantee it always appears by clearing localStorage, which `fresh` already does), or disable it in the test environment via an env flag.

Fix: The banner should always appear after `localStorage.clear()`. Remove the conditional and make dismissal unconditional:

```ts
async function dismissCookieBanner(page: Page) {
  const acceptBtn = page.locator('button:has-text("Accept")')
  await acceptBtn.waitFor({ state: 'visible', timeout: 3000 })
  await acceptBtn.click()
}
```

If the banner sometimes doesn't appear, fix the consent logic, not the test.

---

### 10. Dead code — `waitForTimeout(500)` hydration comment is a lie

**Principle violated:** KISS + honesty  
**Location:** line 69

```ts
await page.waitForTimeout(500) // ensure hydration
```

Playwright's `waitUntil: 'networkidle'` does not guarantee React hydration. This timeout exists because hydration is non-deterministic and the author hoped 500ms would be enough. It will not always be. It also slows every single test.

The correct fix is to wait for a concrete element that only renders after hydration:

```ts
await page.locator('text=What do you do?').waitFor({ timeout: 10000 })
// That waitFor already appears on line 68, making this timeout redundant.
```

Since line 68 already waits for `'What do you do?'`, the `waitForTimeout(500)` on line 69 is completely redundant and should be deleted.

---

### 11. `test.fixme` vs `test.skip` — wrong tool for a known failure

**Principle violated:** Naming / intent  
**Location:** line 348

```ts
test.fixme('profile → skip → results', async ({ page }) => {
```

`test.fixme` in Playwright marks a test that is expected to fail and will be skipped. The semantic difference from `test.skip` is that `test.fixme` signals "this test is broken and someone intends to fix it." Without a linked issue or ticket, `test.fixme` is an intention that evaporates. The inline comment explains the cause well, but the fix is:

1. Open a GitHub issue for the Jotai state/React render timing problem.
2. Replace `test.fixme` with `test.skip` and link the issue:

```ts
// Skipped: phase transition after analyze doesn't fire in E2E. See #42.
test.skip('profile → skip → results', ...)
```

Or, if you want to keep `test.fixme` (to get a "fixed unexpectedly" signal if it starts passing), add a ticket reference in the description string itself:

```ts
test.fixme('[#42] profile → skip → results — Jotai/React phase transition timing', ...)
```

`test.fixme` without a ticket is dead weight. The failure is silently ignored forever.

---

### 12. KISS — `'API receives correct profile data'` re-navigates manually

**Principle violated:** DRY + KISS  
**Location:** lines 379–396

This test manually repeats the full profile navigation after defining its own route overrides — it cannot use `completeProfile` because it needs to intercept the session API before navigation. But the navigation sequence is a verbatim copy of `completeProfile` with different data values. If the step order changes, this test will silently break at a different line than the suite tests.

The fix is to make `completeProfile` accept a profile parameter, and to make the API capture work with `fresh` by passing a route override callback. Alternatively, set up the capture route before calling `fresh` and `completeProfile`:

```ts
test('API receives correct profile data', async ({ page }) => {
  let capturedBody: Record<string, unknown> | null = null
  
  // Override session route before fresh() registers it
  await page.route('**/api/discovery/session', async (route) => {
    capturedBody = JSON.parse(route.request().postData() ?? '{}')
    await route.fulfill({ status: 200, body: JSON.stringify({ sessionId: 'cap' }) })
  })

  await startFresh(page)
  await completeProfile(page, { occupation: 'Freelance', age: '26-30', ... })

  expect(capturedBody?.occupation).toBe('freelance')
  expect(capturedBody?.ageBracket).toBe('26-30')
  expect(capturedBody?.aiComfort).toBe(4)
})
```

---

### 13. KISS — Playwright config: `retries: 0` is fine but undocumented

**Principle violated:** Minor — clarity  
**Location:** `playwright.config.ts:6`

`retries: 0` is the Playwright default, so the explicit declaration is noise. Either remove it (prefer no defaults re-stated) or add a comment if it's intentionally set to prevent flaky-test masking: `retries: 0, // intentional — retries mask flakiness`.

---

## Hacks List

Every workaround catalogued in one place:

| # | Location | Hack | What it masks |
|---|---|---|---|
| H1 | `fresh()` line 65–67 | Double `page.goto('/start')` to clear localStorage | Should use `addInitScript(() => localStorage.clear())` instead |
| H2 | `fresh()` line 69 | `waitForTimeout(500) // ensure hydration` | Hydration timing is non-deterministic; the `waitFor` on line 68 already handles this — this line is dead |
| H3 | `fresh()` line 72 | `.catch(() => false)` on `isVisible()` | Swallows real Playwright errors; `isVisible()` already returns false for invisible elements |
| H4 | `fresh()` line 74 | `waitForTimeout(300)` after cookie banner click | Animation timing assumption; should wait for the banner to be hidden instead |
| H5 | `'profile → skip → results'` line 357 | `skipBtn.click({ force: true })` | The button is not normally interactable — something else is overlapping or blocking it, and `force: true` bypasses that check silently |
| H6 | `'API receives correct profile data'` line 396 | `waitForTimeout(1500)` before asserting `capturedBody` | Assumes the session API call completes within 1.5s; should wait for a deterministic signal (e.g., the upload hub appearing) |
| H7 | `test.fixme` line 348 | `test.fixme` without a ticket | Known failure silently ignored with no remediation path |

---

## Priority Order for Fixes

1. **H2 (dead timeout)** — Delete the `waitForTimeout(500)` on line 69. Zero cost, immediately cleaner.
2. **H1 (double navigation)** — Replace with `addInitScript`. Faster tests, simpler code.
3. **H3 + H4 (cookie banner)** — Unconditional banner dismissal. Remove the guard.
4. **Magic value constants** — Add `STEP_LABELS` and `DEFAULT_PROFILE`. Prevents future hunt-and-replace.
5. **Step helper decomposition** — Break `completeProfile` into composable steps, eliminating the four duplicated `beforeEach` blocks.
6. **`test.fixme` → `test.skip` + issue link** — Takes 2 minutes, prevents permanent neglect.
7. **H6 (1500ms timeout in API test)** — Wait for upload hub visibility instead.
8. **H5 (`force: true`)** — Investigate the blocking element; fix the real problem.
