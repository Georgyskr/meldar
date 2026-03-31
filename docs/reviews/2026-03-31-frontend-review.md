# Frontend Review — Discovery Flow
**Date:** 2026-03-31  
**Reviewer:** Frontend Developer  
**Scope:** `/start` route, `discovery-flow` feature, `billing/PurchaseButton`, `thank-you` page, `Header`, `globals.css`, `panda.config.ts`

---

## Summary

The discovery flow is well-structured overall: FSD architecture is respected, Panda CSS is used consistently, and the step-based quiz pattern is coherent. The main risks are **accessibility gaps** (missing ARIA roles, unlabelled interactive elements, focus management on step transitions), **no `prefers-reduced-motion` guarding in JS** (only CSS), a few **Panda CSS compliance violations** (inline `style=` for static properties, hardcoded hex colors in JSX), and some **architectural leaks** (direct import from `atoms.ts` internal path in `start-client.tsx` instead of the barrel, `analysisAtom` typed as `unknown`). Nothing that blocks shipping, but several items that affect WCAG 2.1 AA compliance.

---

## Blockers

### 🔴 Missing focus management on phase/step transitions

**Files:** `start-client.tsx:42-49`, `QuickProfile.tsx:73-79`

`transitionTo()` and `advanceStep()` both call `window.scrollTo` after a `setTimeout` but never move focus. When the phase changes (profile → data → adaptive → results) or a step advances in the quiz, keyboard/screen-reader users are left with focus on a button that has been unmounted or is now offscreen. The `<Box>` container that conditionally renders phase content has no `tabIndex` or `ref` to receive focus.

**Fix:** Attach a `ref` to the phase container and call `.focus()` after the transition timeout. Apply the same pattern in `advanceStep()`.

---

### 🔴 `analysisAtom` typed as `unknown`

**File:** `src/features/discovery-flow/model/atoms.ts:30`

```ts
export const analysisAtom = atomWithStorage<unknown | null>('meldar-analysis', null)
```

`unknown | null` provides no type safety. In `start-client.tsx:298` it is cast with `as DiscoveryAnalysis` without validation, meaning corrupted or stale localStorage data will produce a runtime crash inside `AnalysisResults` (e.g. `analysis.recommendedApp.name` throws).

**Fix:** Type it as `DiscoveryAnalysis | null` and import the type. Add a guard before `setAnalysis` where the API response is received.

---

### 🔴 `PurchaseButton` missing `_focusVisible`

**File:** `src/features/billing/ui/PurchaseButton.tsx:55-75`

The button has `_hover` and `_disabled` but no `_focusVisible` style. All other interactive elements in the codebase define focus rings (`outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px'`). This is a WCAG 2.1 SC 2.4.7 (Focus Visible) failure on the primary conversion element — the purchase button.

---

### 🔴 File inputs have no accessible label text visible to screen readers

**Files:** `UploadCard.tsx:239,317`, `AdaptiveFollowUp.tsx:119`

The `<input type="file">` elements are hidden and wrapped in `<styled.label>`. The label text ("Upload", "Add more", "Upload screenshot") is present as visible text, which is good. However, the `title` attribute and `description` prop of each card are not associated with the input. A screen reader announces "Upload, file picker" with no context about *what* is being uploaded. 

**Fix:** Either add `aria-describedby` pointing to the card's title `<span>`, or pass the title as an `aria-label` on the input:

```tsx
<input
  ref={fileRef}
  type="file"
  accept={accept}
  aria-label={`Upload ${title}`}
  onChange={handleFileChange}
  style={{ display: 'none' }}
/>
```

---

## Suggestions

### 🟡 Direct import from internal `atoms.ts` path bypasses the barrel

**File:** `start-client.tsx:17-24`

```ts
import {
  type AdaptiveFollowUpItem,
  adaptiveAnswersAtom,
  ...
} from '@/features/discovery-flow/model/atoms'
```

FSD rules require importing from the slice barrel (`@/features/discovery-flow`), not from internal paths. The barrel at `src/features/discovery-flow/index.ts` does not re-export the atoms, so `start-client.tsx` reaches inside the slice. This creates a coupling that bypasses the public API contract.

**Fix:** Export atoms from `src/features/discovery-flow/index.ts`, or (better) keep atoms private and lift the parent–child communication to props/callbacks — the client already does this for most state.

---

### 🟡 Hardcoded hex colors in JSX violate design token rule

**Files:** Multiple — representative examples:
- `start-client.tsx:253`: `background="linear-gradient(135deg, #623153, #FFB876)"`
- `[id]/page.tsx:83`: `background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"`
- `Header.tsx:27`: `background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"`
- `QuickProfile.tsx:389`, `AnalysisResults.tsx:399`, `PurchaseButton.tsx:61`

The gradient is duplicated ~10 times across the codebase with hardcoded hex values. The design tokens `primary` (`#623153`) and `secondaryLight` (`#FFB876`) are defined in `panda.config.ts` but the gradient is never tokenized. A brand color change requires editing many files.

**Fix:** Add a `gradientAccent` token to `panda.config.ts`:

```ts
gradientAccent: { value: 'linear-gradient(135deg, #623153 0%, #FFB876 100%)' }
```

Then use `background="gradientAccent"` consistently.

---

### 🟡 `renderSourceCard` is a function-as-renderer inside a component, not a sub-component

**File:** `DataUploadHub.tsx:463-489`

`renderSourceCard` is defined as a plain function inside `DataUploadHub` and called in the render. This is a common React anti-pattern: it prevents React from correctly reconciling subtree identity, produces unstable keys when the array changes, and cannot benefit from `memo`. The `key` prop is set on the `<Box>` inside the function — the immediate child of the `.map()` call — which is correct, but the function itself re-creates the element type on every render.

**Fix:** Extract as a named `SourceCard` component that receives props.

---

### 🟡 `handleStartTrial` in `DataUploadHub` duplicates `PurchaseButton` logic

**File:** `DataUploadHub.tsx:370-390`

There is a bespoke `handleStartTrial` function that performs a checkout fetch, sets loading state, and redirects. This is the same logic as `PurchaseButton`. Having two implementations means bugs need to be fixed in two places (e.g. `PurchaseButton` handles `!res.ok` with `setError`; `handleStartTrial` silently fails on a non-redirect response).

**Fix:** Replace the bespoke button with `<PurchaseButton product="starter" label="Start free trial" variant="secondary" />`.

---

### 🟡 `QuickProfile` step transitions: stale closure risk in `advanceStep`

**File:** `QuickProfile.tsx:73-79`

```ts
function advanceStep(nextStep?: number) {
  setTransitioning(true)
  setTimeout(() => {
    setStep(nextStep ?? step + 1)  // ← `step` captured at call time
    setTransitioning(false)
  }, 250)
}
```

`step` inside the closure captures its value when `advanceStep` is called. If the user taps rapidly, `step + 1` could compute from a stale value. The `step` read in the `setTimeout` callback should use the functional update form: `setStep((s) => nextStep ?? s + 1)`.

---

### 🟡 `AnalysisResults`: `handleShare` shares `/start` instead of the session-specific URL

**File:** `AnalysisResults.tsx:62-75`

```ts
const url = `${window.location.origin}/start`
```

The shareable URL is hardcoded to `/start` (the generic flow), not `/start/${sessionId}` (the user's specific results page). The `/start/[id]/page.tsx` OG route exists precisely for this sharing use case. The share button labels say "Share results" but shares a generic entry point.

---

### 🟡 `DataUploadHub`: `handleFile` sets status to `uploading` but immediately transitions to `processing` before the fetch completes

**File:** `DataUploadHub.tsx:392-447`

```ts
setSources(...{ status: 'uploading' })
// No actual upload logic here yet —
setSources(...{ status: 'processing' })  // immediately after
const res = await fetch(...)
```

`uploading` and `processing` are set synchronously back-to-back. The `uploading` state is shown in `UploadCard` as "Uploading..." and `processing` as "Analyzing..." — but since there is no actual upload progress tracking (XHR `onprogress`), the card will flash `uploading` for one render frame then show `processing` for the entire request duration. This is minor UX, but the `uploading` state is effectively dead.

**Fix:** Either remove the intermediate `uploading` state and go straight to `processing`, or use `XMLHttpRequest` with progress events if the upload progress bar is meant to be real.

---

### 🟡 `start/[id]/page.tsx`: double DB query for metadata and page render

**File:** `src/app/start/[id]/page.tsx:15-57`

`getSession` is called twice: once in `generateMetadata` and once in the page component. Next.js does not deduplicate these unless `fetch` is used with a URL (which it can cache). Drizzle/direct DB calls are not deduplicated across the metadata and page render.

**Fix:** Use React's `cache()` to wrap `getSession`:

```ts
import { cache } from 'react'
const getSession = cache(async (id: string) => { ... })
```

---

### 🟡 App cards in `[id]/page.tsx` and `AnalysisResults.tsx` are duplicated verbatim

**Files:** `src/app/start/[id]/page.tsx:104-252`, `AnalysisResults.tsx:52-252`

The app recommendation card rendering logic (blurred overlay, visible card, lock icon, honeypot content) is copy-pasted between the shared result page and the results component. Any UI change needs to be applied to both.

**Fix:** Extract an `AppRecommendationCard` component to `src/features/discovery-flow/ui/`.

---

### 🟡 `UploadCard` has two `<input ref={fileRef}>` elements in the DOM simultaneously

**File:** `UploadCard.tsx:239-245` and `UploadCard.tsx:317-322`

When `isPartiallyDone && !isActive`, there is an "Add more" label/input rendered. When `status === 'idle' || isError`, there is an "Upload" label/input. These states are mutually exclusive, but both use the same `fileRef`. If somehow both branches rendered (edge case), the ref would point to the last input. This is structurally safe currently but fragile — the logic around `isPartiallyDone`, `isDone`, and `isError` is complex enough that a future change could accidentally render both.

---

## Nits

### 💭 `prefers-reduced-motion` only covers CSS; JS animations bypass it

**File:** `globals.css:199-207`, `start-client.tsx:274-277`

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
```

The CSS rule correctly disables animations. However, the JS transition logic in `start-client.tsx` (`transitioning` state → `phaseExit` animation name) and `QuickProfile.tsx` (`slideOutToLeft`, `slideInFromRight`) still sets `animation` values in `style={}`. The CSS override will catch these (since they are CSS animations), so the final behavior is correct. Still, the JS `transitioning` flag and `setTimeout(300ms)` will still fire even when motion is reduced — the `setTransitioning(true/false)` dance adds unnecessary state churn. A `useReducedMotion()` hook from a library or native `window.matchMedia` check would let the JS skip the timeout entirely.

---

### 💭 Panda shorthand `mb`/`px`/`py` not used — good, but some logical property inconsistencies

**Files:** Various

The codebase mostly follows the "logical properties over shorthands" rule from CLAUDE.md, but there are a few `paddingBlock` / `paddingInline` values that use Panda's numeric shorthand values (e.g. `paddingBlock={3.5}`, `paddingBlock={0.5}`) which are valid Panda scale values and fine. No issues here, just confirming compliance.

---

### 💭 `not-found.tsx`: emoji rendered as text, not image

**File:** `src/app/start/[id]/not-found.tsx:7`

```tsx
<styled.span fontSize="4xl">&#128269;</styled.span>
```

Unicode emoji rendered as raw text has inconsistent cross-platform appearance and no accessible alternative. Consider wrapping with `aria-hidden="true"` since it is decorative, or use a Lucide icon instead.

---

### 💭 `Header`: logo `<div>` is not `aria-hidden`

**File:** `Header.tsx:24-30`

The gradient circle `<styled.div>` next to the wordmark is decorative. It should have `aria-hidden="true"` to prevent screen readers from announcing an unlabelled element.

---

### 💭 `AdaptiveFollowUp`: "Generate my results" CTA active regardless of answer completeness

**File:** `AdaptiveFollowUp.tsx:237-263`

The CTA button has no `disabled` state. If a user is shown 3 follow-up questions and answers none, they can proceed immediately. The `QuickProfile` step correctly enforces `MIN_PAIN_PICKS` — the same discipline should apply here for `question`-type follow-ups.

---

### 💭 `AnalysisResults`: module notify form has no `onKeyDown` Enter handler

**File:** `AnalysisResults.tsx:366-419`

The email `<input>` in the inline notify-me form is not inside a `<form>` element, so pressing Enter does not submit. The submit action is only triggered by clicking "Notify me". This is a usability issue — wrapping in `<styled.form onSubmit={...}>` would fix it.

---

### 💭 `DataUploadHub`: `SCREENTIME_MAX_FILES` constant defined inside the component

**File:** `DataUploadHub.tsx:357`

```ts
const SCREENTIME_MAX_FILES = 4
```

This constant is defined inside the component body on every render instead of at module scope. Move it to module scope with the other constants.

---

### 💭 `start/[id]/page.tsx`: CTA `<styled.a>` missing `_focusVisible`

**File:** `src/app/start/[id]/page.tsx:308-321`

```tsx
<styled.a
  href="/start"
  ...
  _hover={{ opacity: 0.9 }}
  // no _focusVisible
>
  Start my analysis
</styled.a>
```

The CTA anchor in the shared-result page footer is missing a focus ring. The `not-found.tsx` CTA correctly has `_focusVisible`. Apply the same pattern.

---

## What's Good

- **FSD layer boundaries are respected** — `features` do not import from `widgets` or `app`, entities are consumed from their barrel. The only exception is the atoms import in `start-client.tsx` noted above.
- **`prefers-reduced-motion` CSS override** is comprehensive and correctly uses `!important` to override inline animations.
- **All interactive elements** (`button`, `label`) have `_focusVisible` rings — except the two noted blockers (`PurchaseButton`, one CTA anchor).
- **Touch targets** are generally well-sized: most buttons are `paddingBlock={3}` (≥44px rendered height) and the `UploadCard` label enforces `minHeight="48px"`.
- **Panda CSS compliance** is strong — logical properties used throughout, no shorthand `mb`/`px`/`py`, no inline `style=` except for dynamic animation names where Panda can't handle conditional strings.
- **Jotai `atomWithStorage`** for session persistence is a clean pattern — users can close the tab and resume, and the `RESET` sentinel correctly wipes all atoms on "Start fresh".
- **Honeypot anti-CSS-hack pattern** on locked recommendations (`aria-hidden="true"` on decoy content, real content server-gated) is clever and effective.
- **`UploadCard`** state machine (`idle → uploading → processing → done/error`) is clear and all states are handled in the UI with distinct visual treatments.
- **Responsive layout** uses `Grid columns={{ base: 1, md: 2 }}` appropriately; `VStack maxWidth` constraints prevent over-wide content on large viewports.
