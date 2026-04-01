# E2E Timeout & Hack Audit — discovery-flow.spec.ts

**Audited:** 2026-04-01  
**Auditor:** QA Automation agent  
**File:** `test/e2e/discovery-flow.spec.ts`

---

## All Hacks Found

### Hack #1: `waitForTimeout(500)` — hydration guard

**File:** `test/e2e/discovery-flow.spec.ts:69`  
**Current code:**
```ts
await page.waitForTimeout(500) // ensure hydration
```
**Why it's wrong:** Arbitrary 500ms delay. The preceding line 68 already waits for `text=What do you do?` to be visible, which is a concrete signal that React has hydrated and the component is interactive. This timeout is therefore pure dead time — it provides zero additional safety while adding 500ms to every single test run (22 tests = 11 seconds wasted per run minimum).  
**Correct replacement:**
```ts
// Delete this line entirely. Line 68 already guarantees hydration:
await page.locator('text=What do you do?').waitFor({ timeout: 10000 })
```
**Why this works:** Playwright's `waitFor` with `state: 'visible'` (the default) polls the DOM until the element is attached and visible. When `"What do you do?"` is visible, the QuickProfile component has fully mounted and is interactive.

---

### Hack #2: `waitForTimeout(300)` — cookie banner animation guard

**File:** `test/e2e/discovery-flow.spec.ts:74`  
**Current code:**
```ts
if (await acceptBtn.isVisible().catch(() => false)) {
    await acceptBtn.click()
    await page.waitForTimeout(300)
}
```
**Why it's wrong:** Assumes the cookie banner's hide animation completes within 300ms. On a loaded CI machine this will flake. Also, `.isVisible().catch(() => false)` is unnecessary — Playwright's `isVisible()` already returns `false` for absent/hidden elements without throwing, so the `.catch` silently swallows real Playwright errors (e.g., a navigation failure mid-check).  
**Correct replacement:**
```ts
// Suppress the banner before the page loads entirely, via addInitScript:
await page.addInitScript(() => {
    localStorage.setItem('cookie-consent', 'accepted')
})
```
**Why this works:** `addInitScript` runs in the page context before any JavaScript executes. The cookie consent feature reads from `localStorage` on mount; if the key is already set to `'accepted'`, the banner never renders. This eliminates both the conditional check and any post-click wait.

---

### Hack #3: Double `page.goto` for localStorage reset

**File:** `test/e2e/discovery-flow.spec.ts:65–67`  
**Current code:**
```ts
await page.goto('/start', { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.goto('/start', { waitUntil: 'networkidle' })
```
**Why it's wrong:** The first navigation loads the page with whatever stale localStorage exists, potentially initializing Jotai atoms from previous test state. The `evaluate` clears it, then the second navigation re-initializes cleanly. This is a workaround for not being able to seed localStorage before the page boots. It doubles navigation time for every test (22 tests × ~2s = ~44s wasted) and causes the session API to potentially fire on the first load against mock routes.  
**Correct replacement:**
```ts
await page.addInitScript(() => localStorage.clear())
await mockApis(page)
await page.goto('/start', { waitUntil: 'domcontentloaded' })
await page.locator('text=What do you do?').waitFor({ timeout: 10000 })
```
**Why this works:** `addInitScript` is guaranteed to execute before any page script. Jotai's `atomWithStorage` reads localStorage during its initializer — by the time it runs, localStorage is already empty. One navigation, clean state, no race.

---

### Hack #4: `.catch(() => false)` on `isVisible()`

**File:** `test/e2e/discovery-flow.spec.ts:72`  
**Current code:**
```ts
if (await acceptBtn.isVisible().catch(() => false)) {
```
**Why it's wrong:** `Locator.isVisible()` does not throw when the element is absent — it returns `false`. The `.catch(() => false)` therefore only catches unexpected Playwright errors (wrong page state, navigation failure) and converts them to a silent `false`, hiding real test bugs.  
**Correct replacement:**
```ts
// Eliminated entirely via the addInitScript approach (Hack #2).
// If conditional dismissal is needed, use:
const acceptBtn = page.locator('button:has-text("Accept")')
const isVisible = await acceptBtn.isVisible() // no .catch needed
if (isVisible) {
    await acceptBtn.click()
    await acceptBtn.waitFor({ state: 'hidden' })
}
```
**Why this works:** `isVisible()` is safe to call without `.catch`. The `waitFor({ state: 'hidden' })` replaces the 300ms guess.

---

### Hack #5: `waitForTimeout(1000)` — post-reload hydration guard (Form Persistence, twice)

**File:** `test/e2e/discovery-flow.spec.ts:302` and `test/e2e/discovery-flow.spec.ts:312`  
**Current code:**
```ts
await page.reload()
await page.waitForTimeout(1000)
await expect(page.locator('text=Welcome back')).toBeVisible()
```
and
```ts
await page.reload()
await page.waitForTimeout(1000)
await page.locator('button:has-text("Start fresh")').click()
```
**Why it's wrong:** Both `waitForTimeout(1000)` calls are immediately followed by an assertion or interaction on a specific element. Playwright's auto-retry assertions (`toBeVisible`) and `locator.waitFor` / `locator.click` already wait for the element to be ready. The 1000ms is dead time that adds 2 seconds to the persistence tests and still cannot guarantee the page is ready on a slow machine.  
**Correct replacement (line 302):**
```ts
await page.reload()
await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 10000 })
```
**Correct replacement (line 312):**
```ts
await page.reload()
await page.locator('button:has-text("Start fresh")').waitFor({ state: 'visible', timeout: 10000 })
await page.locator('button:has-text("Start fresh")').click()
```
**Why this works:** `toBeVisible` has Playwright's built-in auto-retry at the assertion level. `locator.waitFor` + `locator.click` ensures the element exists before clicking, without guessing a fixed delay.

---

### Hack #6: `waitForTimeout(1500)` — session API response guard

**File:** `test/e2e/discovery-flow.spec.ts:396` (inside `'API receives correct profile data'`)  
**Current code:**
```ts
await page.locator('button:has-text("Lock in")').click()
await page.waitForTimeout(1500)

expect(body).not.toBeNull()
expect(body?.occupation).toBe('freelance')
```
**Why it's wrong:** After clicking "Lock in", the profile completion triggers a `POST /api/discovery/session`. The test waits 1.5s assuming the request completes in that window. On a loaded CI machine, this can easily flake. On a fast machine, 1.5s is wasted. There is a deterministic signal: the upload hub appears (`text=Add your data`) only after the session API call succeeds and `transitionTo('data')` fires.  
**Correct replacement:**
```ts
const [sessionRequest] = await Promise.all([
    page.waitForRequest('**/api/discovery/session'),
    page.locator('button:has-text("Lock in")').click(),
])
body = JSON.parse(sessionRequest.postData() ?? '{}')

expect(body).not.toBeNull()
```
Or, if capturing from the route handler (as currently done), wait for the upload hub:
```ts
await page.locator('button:has-text("Lock in")').click()
await page.locator('text=Add your data').waitFor({ timeout: 10000 })

expect(body).not.toBeNull()
```
**Why this works:** `waitForRequest` resolves the moment the request is dispatched, before the response. The route handler captures the body synchronously during the request. `waitForResponse` or waiting for the resulting UI change are both deterministic alternatives.

---

### Hack #7: `skipBtn.click({ force: true })` — force click on obscured button

**File:** `test/e2e/discovery-flow.spec.ts:369`  
**Current code:**
```ts
const skipBtn = page.locator('button:has-text("Skip")')
await skipBtn.scrollIntoViewIfNeeded()
await skipBtn.click({ force: true })
```
**Why it's wrong:** `{ force: true }` bypasses Playwright's actionability checks (visibility, enabled state, not obscured). It clicks the element regardless of whether it's actually interactable. This hides a real problem: either the button is obscured by an overlay (cookie banner? analyzing spinner?), not in the viewport, or not yet rendered. `scrollIntoViewIfNeeded()` suggests viewport is the suspected issue, but `{ force: true }` is the real bypass. If the button is underneath another element, a real user cannot click it — neither should the test.  
**Root cause:** The "Add your data" phase has a sticky/fixed header or a cookie banner potentially overlapping the Skip button. The correct fix is to eliminate the overlay first (which `addInitScript` for cookie consent does), then use a normal click with an explicit scroll:
```ts
const skipBtn = page.locator('button:has-text("Skip")')
await skipBtn.scrollIntoViewIfNeeded()
await skipBtn.click() // no force — if it fails, fix the obstruction
```
If the button is still obscured after scrolling, use:
```ts
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
await skipBtn.waitFor({ state: 'visible' })
await skipBtn.click()
```
**Why this works:** Once the cookie banner is suppressed via `addInitScript`, the only remaining issue is viewport position. `scrollIntoViewIfNeeded()` handles that. A normal click then confirms the button is truly interactable.

---

### Hack #8: `waitForTimeout(5000)` in the full-flow test

**File:** `test/e2e/discovery-flow.spec.ts:371`  
**Current code:**
```ts
await skipBtn.click({ force: true })
// Wait a bit for network and state changes
await page.waitForTimeout(5000)
```
**Why it's wrong:** A 5-second arbitrary sleep waiting for "network and state changes". The test immediately after already waits for `text=TestApp` with a 20s timeout. The 5s sleep is completely redundant — it only adds 5 seconds of dead time before the condition-based wait begins.  
**Correct replacement:**
```ts
await skipBtn.click()
// No sleep needed — waitFor below is the real gate
await page.locator('text=TestApp').waitFor({ state: 'visible', timeout: 20000 })
```
**Why this works:** `locator.waitFor` polls continuously until the element appears or the timeout is reached. The 5s wait adds nothing — the 20s timeout already covers the full expected wait window.

---

## Double `page.goto` pattern — Additional Detail

The pattern:
```ts
await page.goto('/start', { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.clear())
await page.goto('/start', { waitUntil: 'networkidle' })
```
appears in `fresh()` AND is re-implemented manually in the `'API receives correct profile data'` test (lines 379–382):
```ts
await page.goto('/start')
await page.evaluate(() => localStorage.clear())
await page.reload()
```

The Playwright-native solution for both is `page.addInitScript`:
```ts
// Runs before any page JS — localStorage is empty when Jotai atoms initialize
await page.addInitScript(() => localStorage.clear())
await page.goto('/start', { waitUntil: 'domcontentloaded' })
```

Note: `waitUntil: 'networkidle'` is unnecessarily strict. `'domcontentloaded'` is sufficient because the subsequent `waitFor('text=What do you do?')` is the real readiness gate.

---

## The `'API receives correct profile data'` Test — `waitForTimeout` + broken assertion

The `body` variable is captured in the route handler callback:
```ts
await page.route('**/api/discovery/session', async (route) => {
    body = JSON.parse(route.request().postData() ?? '{}')
    await route.fulfill(...)
})
```

After clicking "Lock in", the test does:
```ts
await page.waitForTimeout(1500)
expect(body).not.toBeNull()
expect(body?.occupation).toBe('freelance')
```

The `waitForTimeout(1500)` is wrong because:
1. The route handler fires synchronously when the request is made
2. The request is made when `handleProfileComplete` calls `fetch('/api/discovery/session')`
3. That happens inside `handleDone()` which is called from the `useEffect` watching `allLocked`
4. The `allLocked` state updates after the last `lockSingle` call in the 5th step

The deterministic signal is either:
- `page.waitForResponse('**/api/discovery/session')` — resolves when the response is received
- `page.locator('text=Add your data').waitFor()` — the upload hub appearing proves the session call completed AND the transition fired

The optional-chaining on assertions (`body?.occupation`) also masks a null body by not failing loudly. Use `expect(body).not.toBeNull()` first, then cast.

---

## Summary Table

| # | File | Line | Hack | Replacement |
|---|------|------|------|-------------|
| 1 | spec.ts | 69 | `waitForTimeout(500)` — hydration | Delete; line 68 already waits for element |
| 2 | spec.ts | 74 | `waitForTimeout(300)` — cookie animation | `addInitScript` to pre-accept consent |
| 3 | spec.ts | 65–67 | Double `page.goto` for localStorage | `addInitScript(() => localStorage.clear())` |
| 4 | spec.ts | 72 | `.catch(() => false)` on `isVisible()` | Remove `.catch`; `isVisible()` is safe |
| 5 | spec.ts | 302, 312 | `waitForTimeout(1000)` — post-reload | `toBeVisible({ timeout })` / `waitFor` |
| 6 | spec.ts | 396 | `waitForTimeout(1500)` — session API | `waitForResponse` or wait for upload hub |
| 7 | spec.ts | 369 | `{ force: true }` on skip button | Remove `force`; fix obstruction via `addInitScript` |
| 8 | spec.ts | 371 | `waitForTimeout(5000)` — skip→results | Delete; `waitFor('text=TestApp')` is the gate |

**Zero `waitForTimeout` calls in the fixed file.**
