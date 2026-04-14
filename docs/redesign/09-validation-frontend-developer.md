# Frontend Developer Validation — Onboarding Funnel & Workspace

**Reviewer**: Frontend Developer (validation-final team, Task #2)
**Scope**: `features/onboarding/ui/*`, `widgets/workspace/WorkspaceShell.tsx`, `widgets/workspace/PreviewPane.tsx`, `widgets/workspace/OverflowMenu.tsx`, `app/(authed)/onboarding/page.tsx`
**Date**: 2026-04-13

---

## Top 3 Strengths

### 1. Funnel state is modeled as a discriminated-union reducer (excellent)
`features/onboarding/model/funnel-machine.ts` + `types.ts` is textbook. `FunnelState` is a discriminated union by `screen`, and `funnelReducer` pattern-matches on `action.type` then narrows on `state.screen`. This is exactly how `useReducer` should be used — the component (`OnboardingFunnel.tsx:88-128`) renders a single `switch (state.screen)` and TypeScript enforces that `state.proposal` only exists on screens where it's defined. Illegal states are unrepresentable, no optional-chaining soup, no `useState` hook salad. Bonus: `INITIAL_STATE` is a module constant so `useReducer` doesn't need a lazy initializer.

### 2. RSC / client boundary is correctly drawn
`app/(authed)/onboarding/page.tsx` is a server component that only exports `metadata` and mounts `<OnboardingFunnel />`. All interactive surfaces (`OnboardingFunnel`, `DoorPicker`, `DoorA/B/C`, `ProposalPreview`, `WorkspaceShell`, `PreviewPane`, `OverflowMenu`) correctly declare `'use client'`. `metadata` includes `robots: { index: false, follow: false }` on the authed onboarding page, which is right for a logged-in funnel. `WorkspaceTopBar` correctly stays a server component (no interactivity — `OverflowMenu` is its lone client child).

### 3. Callback memoization and ref patterns in `WorkspaceShell` are solid
- `handleFeedbackSubmit` is wrapped in `useCallback` with accurate deps (`projectId`, `activeBuildCardId`, `publish`). `context.tsx:347` memoizes `publish` via `useCallback` with empty deps (safe — `dispatch` is stable), so the feedback bar won't re-mount on every workspace tick.
- `autoBuildStartedRef` (a `useRef` boolean) correctly prevents double-firing auto-build in StrictMode dev and across re-renders triggered by the SSE stream updating `cards`/`activeBuildCardId` mid-build.
- `providerKey = initialKanbanCards.length === 0 ? 'empty' : 'loaded'` is a deliberate remount signal — crude but explicit.

---

## Top 3 Issues

### Issue 1 — Inline styles everywhere in onboarding, violating project style rules [HIGH]

**Files**: `DoorPicker.tsx:56-80`, `DoorA.tsx:32-150`, `DoorB.tsx:17-80`, `DoorC.tsx:24-100`, `ProposalPreview.tsx:89-128`, `OverflowMenu.tsx:43-113`.

The repo's `CLAUDE.md` is explicit: **"No inline styles. Always use Panda CSS utilities."** Every onboarding Door component, the ProposalPreview CTAs, and the OverflowMenu button/menu items ship with `style={{ ... }}` objects that re-invoke `var(--colors-primary)` / `var(--fonts-heading)` CSS custom property strings inline instead of using Panda's `css()` or JSX primitives with token props.

Concrete consequences:
1. **No token-level consistency**. `DoorA.tsx:139` uses `background: selectedId ? 'var(--colors-primary)' : 'var(--colors-outline-variant)'` — but the disabled state should be `bg="outlineVariant/40"` using Panda's alpha modifier, not a raw CSS var.
2. **No responsive tokens**. `fontSize: 14` is hard-coded; can't participate in the `textStyle` scale defined in `panda.config.ts`.
3. **Three duplicate CTA buttons** (`DoorA`, `DoorC`, `ProposalPreview`) each re-define the same 15-line button style object. None of them use `@/shared/ui/button`.
4. **Typography rule violations**: buttons set `fontFamily: 'var(--fonts-heading)'` and `fontWeight: 600` inline — per `CLAUDE.md` "Typography rules (STRICT)" this must come from `textStyle="button.md"` or similar.

**Fix**: Replace each inline `<button style={...}>` with either the shared `Button` primitive in `@/shared/ui/button` (preferred) or a `styled('button', ...)` recipe. Back-button pattern (`DoorA.tsx:31-45`, `DoorB.tsx:15-29`, `DoorC.tsx:22-36`) is duplicated verbatim three times — extract to `<BackButton onBack={...} />` in `features/onboarding/ui/`.

```tsx
// features/onboarding/ui/BackButton.tsx
'use client'
import { styled } from '@styled-system/jsx'
import { Text } from '@/shared/ui'

const BackStyled = styled('button', {
  base: {
    alignSelf: 'flex-start',
    bg: 'transparent',
    border: 'none',
    cursor: 'pointer',
    paddingBlock: 2,
    paddingInline: 0,
  },
})

export function BackButton({ onBack }: { readonly onBack: () => void }) {
  return (
    <BackStyled type="button" onClick={onBack}>
      <Text textStyle="label.sm" color="primary">← Back</Text>
    </BackStyled>
  )
}
```

---

### Issue 2 — `handleConfirm`'s `useCallback` depends on the whole `state` object [MEDIUM]

**File**: `OnboardingFunnel.tsx:52-86`.

```tsx
const handleConfirm = useCallback(async () => {
  if (state.screen !== 'proposalPreview') return
  // ...uses state.proposal.verticalId, .businessName, .services
}, [state, router])
```

The callback depends on `[state, router]` but only reads `state.proposal.*`. This means the memoized callback identity changes on **every reducer action**, not just when `proposal` changes. Since `handleConfirm` is passed as `onConfirm` to `<ProposalPreview>`, any reducer transition (even `'back'`) triggers a new reference. `ProposalPreview` isn't memoized, so in practice this is visible on the `'submitting'` branch — `handleConfirm` is recreated the instant `dispatch({ type: 'confirm' })` fires, which is harmless here but fragile.

More importantly, **the dispatch inside `handleConfirm` plus the outer `state` dep creates a subtle race**: after `dispatch({ type: 'confirm' })` (line 54), `state` is still the pre-dispatch `proposalPreview` snapshot — that's what the fetch uses. That's fine for now, but if anyone later adds early-return logic between `dispatch` and `fetch`, the stale closure will bite.

**Fix**: narrow the dependency surface. Either:

```tsx
const handleConfirm = useCallback(async () => {
  if (state.screen !== 'proposalPreview') return
  const { proposal } = state
  dispatch({ type: 'confirm' })
  const res = await fetch('/api/onboarding', { /* body uses proposal.* */ })
  // ...
}, [state.screen === 'proposalPreview' ? state.proposal : null, router])
```

…or accept a `proposal` argument and pass it from the render site:
```tsx
case 'proposalPreview':
  return <ProposalPreview ... onConfirm={() => handleConfirm(state.proposal)} />
```

The second form eliminates the stale-closure risk entirely and makes the callback trivially memoizable.

---

### Issue 3 — `OverflowMenu` is a focus-trap / keyboard-nav accessibility gap [HIGH]

**File**: `OverflowMenu.tsx`.

This dropdown is **missing critical keyboard and ARIA affordances**:

1. **No `role="menu"` on the popover, no `role="menuitem"` on items.** The popover is a `<VStack>` containing raw `<a>` and `<Link>` elements. Screen readers hear it as a list of links, not a menu.
2. **No keyboard navigation between items.** Arrow-down / arrow-up does nothing. In a `role="menu"`, Down/Up/Home/End/Escape must cycle through `menuitem`s.
3. **No focus management.** When the menu opens, focus doesn't move to the first item. When it closes via Escape, focus doesn't return to the trigger button. Users navigating by keyboard will be stranded.
4. **`aria-expanded` is set but `aria-haspopup="menu"` is not.** Assistive tech doesn't know the button opens a menu.
5. **Click-outside uses `mousedown` but there's no matching `touchstart` / `pointerdown`.** On iOS Safari and some Android browsers, tapping outside won't close the menu reliably.
6. **The dropdown is rendered inside the same stacking context as `WorkspaceTopBar` header.** `zIndex={50}` on the menu vs. `zIndex={40}` on the fixed workspace Flex means it renders above the top bar — OK — but any future modal or toast above z=50 will overlap it unpredictably. Park UI ships a tested `<Menu>` component that handles this via portal.

**Fix**: swap the hand-rolled menu for Park UI's `Menu` (already available — Park is the ambient component library per CLAUDE.md). That gets you all of the above for free via Ark UI's headless implementation. If you must keep the hand-rolled version, add:

```tsx
<button
  aria-label="Menu"
  aria-haspopup="menu"
  aria-expanded={open}
  aria-controls={menuId}
  // ...
>
{open && (
  <VStack id={menuId} role="menu" ref={menuRef} onKeyDown={handleArrowKeys}>
    <Link role="menuitem" tabIndex={-1} ...>...</Link>
  </VStack>
)}
```

…plus a `useEffect` that focuses the first `menuitem` on open and restores focus to the trigger on close.

---

## Performance Concerns

### P1 — `WorkspaceBuildProvider` value memo still recreates every card-state tick [MEDIUM]
`context.tsx:358-361` memoizes `value` on `[state, mode, publish, selectTask, clearSelection, openChat, closeChat]`. `state` is a new object on every reducer action (correct — reducer returns new references for changed fields), so `value` changes on **every SSE event** (`file_written`, `started`, `committed`, etc.). Every consumer re-renders. During an active build that fires ~30+ `file_written` events, every workspace subtree re-renders 30 times.

**Fix**: split the context. One context exposes slow-changing ambient (`projectId`, `publish`, `selectTask`, `openChat/closeChat`, `tier`), another exposes fast-changing state (`cards`, `writtenFiles`, `activeBuildCardId`, `previewUrl`). Most consumers only need the former. This is a textbook React context split and high-leverage here because SSE events are a sustained stream.

### P2 — `autoBuild` useEffect re-evaluates on every `cards` change during the build [LOW]
`WorkspaceShell.tsx:73-82` has `cards` in its dep array. Because the ref guards against re-entry, this is functionally correct, but the effect still runs (re-evaluates guards, computes `hasReadyWork`) on every SSE-driven card update. Fine in isolation; combined with P1, it means the whole effect body executes dozens of times per build. Not a correctness bug, but if you fix P1 the unnecessary re-runs collapse automatically.

### P3 — `ProposalPreview` maps `services` without `React.memo` or stable keys [LOW]
`ProposalPreview.tsx:52-70` uses `key={svc.name}`. If a user has two services with the same name (unlikely but possible), React will warn about duplicate keys. The component itself isn't memoized, but it's rendered at most once per funnel, so this is trivially OK.

### P4 — `lucide-react` imports are tree-shaken correctly [OK]
`OverflowMenu.tsx:4` imports `{ MoreHorizontal }` by name, which Next.js's optimized package imports handles well. No concern.

### P5 — Iframe cache-busting uses a `Date.now()` query param every build finish [OK]
`PreviewPane.tsx:28-36` sets `cacheBuster` only on `isBuilding` transitions from true to false, so the iframe re-mounts exactly once per build. The `key={cacheBuster}` on the iframe is the right pattern — URL query-string busting alone wouldn't guarantee a re-mount if only the src query changed.

---

## Accessibility Gaps

Beyond Issue 3 (OverflowMenu):

### A1 — Icon-only hero cards rely on emoji with no `aria-label` [MEDIUM]
`DoorPicker.tsx:69-71`: `<span style={{fontSize: 24, ...}}>{door.icon}</span>` where icon is `'🏪'`, `'👀'`, `'💡'`. Screen readers may read these emojis literally ("shop emoji") or skip them entirely depending on the platform. The door button is already labeled by the following `<Text>` block, so the emoji should be hidden from AT:

```tsx
<span aria-hidden style={{ fontSize: 24, ... }}>{door.icon}</span>
```

### A2 — Input labels are visually adjacent but not programmatically associated [MEDIUM]
`DoorA.tsx:89-108` places a `<Text textStyle="label.sm">Business name</Text>` above a raw `<input>` with no `id` / `htmlFor` linkage. Screen readers announce the input as unlabeled. Same issue in `DoorA.tsx:110-129` (website URL field) and `DoorC.tsx:47-64` (textarea).

**Fix**:
```tsx
<VStack gap="1.5" alignItems="stretch">
  <Text as="label" htmlFor="biz-name" textStyle="label.sm" color="onSurfaceVariant">
    Business name
  </Text>
  <input id="biz-name" type="text" ... />
</VStack>
```

Or use `aria-label` on the input directly. The `<Text as="label">` path is preferred because it preserves the visual design and click-target behavior.

### A3 — `DoorA` vertical-picker grid lacks `role="radiogroup"` semantics [MEDIUM]
`DoorA.tsx:56-87` renders a set of mutually-exclusive buttons with `aria-pressed={selectedId === v.id}`. That's misleading — `aria-pressed` is for toggle buttons (can be on or off independently), but these are radio-like (exactly one can be selected). Correct pattern:

```tsx
<div role="radiogroup" aria-label="Business category">
  {BOOKING_VERTICALS.map(v => (
    <button
      role="radio"
      aria-checked={selectedId === v.id}
      tabIndex={selectedId === v.id || (selectedId === null && i === 0) ? 0 : -1}
      onKeyDown={handleRadioArrowKeys}
      ...
    />
  ))}
</div>
```

…and implement arrow-key navigation within the group. Otherwise keyboard users must Tab through every category one at a time.

### A4 — Disabled submit buttons have no explanation [LOW]
`DoorA.tsx:131-150` and `DoorC.tsx:81-100` disable the CTA until valid input. Screen readers announce "Continue, dimmed, button" with no reason. Add `aria-describedby` pointing to an error hint, or use `aria-disabled="true"` instead of `disabled` and handle the click no-op — that way the button remains focusable and the validation message is announced.

### A5 — `PreviewPane` live region missing on build status [MEDIUM]
`PreviewPane.tsx:78-106` shows "Writing code… Writing {file}…" text that updates as SSE events arrive, but the container has no `role="status"` or `aria-live="polite"`. A blind user staring at this screen won't hear anything is happening. Add `aria-live="polite"` (or `role="status"`) to the status text region.

### A6 — Iframe missing `title` adjustments on state changes [LOW]
`PreviewPane.tsx:55` has `title="Live preview"` — correct. Good.

---

## Recommended Fixes (Priority Order)

### P0 — Must fix before launch

1. **Replace all inline styles with Panda tokens / shared primitives** (Issue 1). Extract shared `<BackButton />` and use `@/shared/ui/button` for CTAs. Typography must come from `textStyle` tokens.
2. **Fix OverflowMenu a11y** (Issue 3). Prefer swapping to Park UI's `<Menu>`. If rolling your own, add `role="menu"`, `role="menuitem"`, focus management, and `aria-haspopup="menu"`.
3. **Associate input labels with inputs** (A2). `<Text as="label" htmlFor>` or `aria-label` on every input/textarea in `DoorA`, `DoorC`.
4. **Add `aria-live` to PreviewPane build status** (A5) — critical for non-sighted users during long builds.

### P1 — Should fix before launch

5. **Split `WorkspaceBuildContext` into fast/slow** (P1) — meaningful perf win during builds.
6. **Fix `aria-pressed` → `role="radio"` on DoorA grid** (A3) — semantic correctness + keyboard nav.
7. **Narrow `handleConfirm` dependency** (Issue 2) — remove stale-closure risk.
8. **Hide decorative emoji from AT** (A1) — one-line fix.

### P2 — Nice to have

9. **Add `aria-describedby` on disabled CTAs** (A4) to explain why they're dimmed.
10. **De-duplicate the three Door back-button blocks** into one `<BackButton />`.

---

## Code Quality Notes

- **Duplication**: the three Door submit CTAs (`DoorA.tsx:131-150`, `DoorC.tsx:81-100`, `ProposalPreview.tsx:89-109`) all reimplement the same 15-line style object with slight variations. One `<PrimaryCta disabled={...} loading={...}>Label →</PrimaryCta>` would replace all three.
- **Naming**: `sourceDoor` in `FunnelState` is great (makes "back" deterministic). `buildProposalFromFreeform` vs `buildProposalFromDoorA` — consistent, good.
- **Dead code**: `buildProposalFromDoorA` in `proposal-data.ts` is exported but not imported anywhere the funnel uses (the funnel inlines the same logic in the reducer's `submitDoorA` case). Either remove the helper or call it from the reducer.
- **`WorkspaceShell.providerKey` trick** — works, but hacky. A real fix is making `WorkspaceBuildProvider` react to `initialKanbanCards` changes via `useEffect` + a `reset` action. Low priority; the remount is fine at current scale.
- **`ProposalPreview` submitting state**: `OnboardingFunnel.tsx:110` passes `submitting={false}` for the `proposalPreview` screen, then re-renders `ProposalPreview` with `submitting={true}` on the `submitting` screen. This works because `ProposalPreview` is stateless — but it's slightly confusing. Consider collapsing the two cases in the switch into one branch parameterized by `state.screen === 'submitting'`.
- **`metadata` on onboarding page** is correctly marked `noindex`. Good.

---

## Bundle Size Impact

No concerns. `lucide-react` imports are tree-shaken (named imports only). No heavy deps introduced (no `framer-motion`, no date libs, no lodash). `@meldar/orchestrator` is imported in `WorkspaceShell` only and is client-side anyway. Total funnel surface is small.

---

## Next.js App Router Patterns

- `app/(authed)/onboarding/page.tsx` is correct: RSC, exports `metadata`, mounts one client component. No data fetching in the page — appropriate since the funnel is client-driven. No issues.
- No `loading.tsx` or `error.tsx` in the onboarding route. Consider adding an `error.tsx` to catch the rare case where `OnboardingFunnel` throws (e.g., reducer bug) — better than the default Next.js error page.
- `WorkspaceShell` as a client component is correct given its heavy use of state, refs, and SSE consumption.
- No streaming / Suspense boundaries used in onboarding. Fine — the funnel has no async RSC children.

---

**Summary**: the state management is excellent, the RSC/client boundary is right, and the auto-build effect is carefully guarded. The big misses are **inline-style non-compliance with project rules** (Issue 1) and **accessibility gaps in the new OverflowMenu and form inputs** (Issue 3, A2, A5). Fix those four P0 items and this is launch-ready frontend work.

---
**Frontend Developer** — validation-final
**Date**: 2026-04-13
