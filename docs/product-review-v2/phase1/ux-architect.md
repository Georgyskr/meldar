# UX Architecture Review — Discovery Form Components

## Scope

Review of the updated discovery form components:
- `src/app/xray/xray-client.tsx`
- `src/features/screenshot-upload/ui/UploadZone.tsx`
- `src/features/screenshot-upload/ui/ContextChip.tsx`
- `src/features/screenshot-upload/ui/ResultEmailCapture.tsx`
- `src/entities/xray-result/ui/XRayCard.tsx`
- `src/entities/xray-result/ui/XRayCardReveal.tsx`

Design system baseline: `panda.config.ts`, `src/shared/styles/globals.css`.
Reference components: `src/widgets/landing/HeroSection.tsx`, `src/widgets/header/Header.tsx`.

---

## 1. FSD Layer Compliance

**Overall: Mostly clean. One clear violation, one concern.**

### Violation: `XRayCard` is not truly an entity-layer component

`src/entities/xray-result/ui/XRayCard.tsx` is a React Server Component (no `"use client"` directive) that renders `style={{ animation: '...' }}` inline. CSS keyframe animations declared in `globals.css` require the DOM to be available at render time — this works, but it means the card's animation behavior depends on a globals.css side effect, which is an implicit coupling not visible from the component file. This is acceptable in practice but should be documented.

More importantly: `XRayCard` uses hardcoded hex values (`#623153`, `#FFB876`) in its `background` prop for the gradient header and the top-bar chart. It is an **entity** — the lowest reusable layer — but it embeds brand presentation values that should come from design tokens. Entities should describe domain objects without encoding brand opinion. The gradient header in particular (`linear-gradient(135deg, #623153 0%, #874a72 40%, #FFB876 100%)`) is presentation logic that belongs at a higher layer or in a token.

### Concern: `UploadZone` imports from an entity directly

`src/features/screenshot-upload/ui/UploadZone.tsx` imports `XRayResponse` from `@/entities/xray-result/model/types`. This is technically valid in FSD (features can import from entities), but it tightly couples the `screenshot-upload` feature to the `xray-result` entity. If a second upload flow with a different result type is added later, the feature cannot be reused without modification. This was flagged in the previous architecture review as a structural concern.

### Clean: All other import directions are correct

- `xray-client.tsx` (app layer) imports from `features/screenshot-upload`, `features/billing`, `features/focus-mode`, and `entities/xray-result` — correct.
- Features import from entities and shared — correct.
- No upward imports detected.

---

## 2. Styling Rules Compliance (CLAUDE.md)

### Logical Properties

**Partial compliance.** The components use logical properties correctly for most spacing: `paddingInline`, `paddingBlock`, `marginInline`, `marginBlockStart`, `marginBlockEnd`. However, several places use shorthand `padding` (not `paddingInline`/`paddingBlock`):

- `XRayCard.tsx:74` — `padding={6}` on the VStack container
- `XRayCard.tsx:28` — `paddingInline={6}` and `paddingBlock={5}` on the gradient header — **correct here**
- `ResultEmailCapture.tsx:37,81` — `padding={6}` on the outer Box
- `UploadZone.tsx:113` — `padding={8}` on the label element

`padding` shorthand sets all four sides equally and is not inherently wrong, but the CLAUDE.md rule is "logical properties over shorthands." Where padding is uniform (top = bottom = left = right), using `padding` is a pragmatic exception. This is a low-severity drift, not a hard violation.

### Semantic HTML via `styled.*`

**Compliant.** The main page container uses `styled.main` in `xray-client.tsx:48`. Headings use `styled.h1`. List items use `styled.li` and `styled.ol` in the screenshot guide section of `UploadZone.tsx`. Interactive elements use `styled.button`. The form uses `styled.form` and `styled.input`.

**One gap:** The scan-line overlay in `UploadZone.tsx:147-164` uses two nested `Box` components for a decorative `div/div` structure. This is correct — decorative elements should not use semantic HTML. No issue here.

### No Inline Styles Rule

**Violated in multiple places.** The CLAUDE.md rule is "No inline styles. Always use Panda CSS utilities." The following components use `style={{}}` for animations:

| Component | Line | Usage |
|---|---|---|
| `xray-client.tsx` | 57, 117, 143 | `style={{ animation: 'meldarFadeSlideUp ...' }}` |
| `UploadZone.tsx` | 136 | `style={{ animation: 'scanPulse ...' }}` |
| `UploadZone.tsx` | 163 | `style={{ animation: 'scanLine ...' }}` |
| `UploadZone.tsx` | 243 | `style={{ animation: 'gentleBreathe ...' }}` |
| `XRayCard.tsx` | 112-115 | `style={{ width: \`${barWidth}%\`, animation: 'barFill ...' }}` |
| `XRayCard.tsx` | 155 | `style={{ animation: 'counterUp ...' }}` |
| `XRayCard.tsx` | 176 | `style={{ animation: 'counterUp ...' }}` |
| `XRayCardReveal.tsx` | 8 | `style={{ animation: 'meldarFadeSlideUp ...' }}` |
| `XRayCardReveal.tsx` | 19-21 | `style={{ opacity: 0, animation: '...', animationDelay: '...' }}` |
| `ResultEmailCapture.tsx` | 42 | `style={{ animation: 'meldarFadeSlideUp ...' }}` |
| `FocusAmbient.tsx` | 29, 42, 51 | `style={{ animation: 'focusDrift...' }}` |

The reason these are inline rather than Panda utilities is that the animation keyframes are defined in `globals.css`, not in `panda.config.ts`. Panda can only generate animation utilities for keyframes it knows about (declared in `theme.extend.keyframes`). The new keyframes (`scanPulse`, `scanLine`, `barFill`, `shimmer`, `gentleBreathe`, `phaseExit`, `counterUp`) exist only in `globals.css` and are therefore inaccessible as Panda tokens.

**Recommendation:** Move the discovery-form keyframes from `globals.css` into `panda.config.ts > theme.extend.keyframes`. Once there, Panda can generate animation utility classes (e.g., `animation="scanPulse 2s ease-in-out infinite"`), and `style={{}}` props can be replaced with Panda props. The only legitimate remaining use of `style={{}}` is `XRayCard.tsx:113` where `width` is a computed percentage — that value cannot be expressed as a static Panda token.

The `RevealStagger` component in `XRayCardReveal.tsx:19` additionally sets `opacity: 0` via inline style. This will fight with Panda if a Panda `opacity` prop is ever added to the same element. Use CSS `animation-fill-mode: both` (already set via `both`) which handles the initial `opacity: 0` state — the `opacity: 0` inline style is therefore redundant and can be removed.

### JSX Primitives vs `styled.*`

**Compliant.** Layout primitives (`Box`, `Flex`, `VStack`, `HStack`, `Grid`) are used for structural containers. `styled.*` is used for semantic elements. This matches the CLAUDE.md preference.

---

## 3. Design Token Usage

### Hardcoded Hex Values

Several components bypass the design token system with hardcoded hex values:

**`ContextChip.tsx:7-10`** — The `OPTIONS` array defines per-chip accent colors:
```typescript
{ id: 'student',     accent: '#7c3aed' },  // purple — not in design tokens
{ id: 'working',     accent: '#623153' },  // primary — IS in tokens
{ id: 'freelance',   accent: '#b45309' },  // amber — not in tokens
{ id: 'job-hunting', accent: '#0f766e' },  // teal — not in tokens
```
The `accent` values are defined but **never used** in the rendering logic. `ContextChip` renders all chips with the same `primary` color token for the selected state — the per-chip accent colors are dead code. This is confusing and should either be removed or implemented.

**`UploadZone.tsx`** — Multiple hardcoded values:
- Line 124: `rgba(98, 49, 83, 0.1)` and `rgba(98, 49, 83, 0.08)` — should use `primary/10` and `primary/8` tokens
- Line 129-130: `rgba(98, 49, 83, 0.08)` — same
- Line 163: `background: "linear-gradient(90deg, transparent, #623153, #FFB876, transparent)"` — scan line gradient uses raw hex

**`UploadZone.tsx:179`** — `color="#623153"` on the Smartphone icon — should be `color="var(--colors-primary)"` or handled via CSS

**`UploadZone.tsx:200-205`** — Button background uses `linear-gradient(135deg, #623153 0%, #874a72 100%)`. The value `#874a72` is not in the design tokens. The token `primaryDark` is `#481b3c`, not `#874a72`. This is a one-off midpoint variant that is inconsistent with the token system.

**`ResultEmailCapture.tsx:134`** — Same `#874a72` midpoint issue.

**`XRayCard.tsx`** — Header gradient `linear-gradient(135deg, #623153 0%, #874a72 40%, #FFB876 100%)` uses the same undocumented `#874a72` midpoint.

**`Header.tsx:29`** (reference component) — Uses the clean 2-stop gradient `linear-gradient(135deg, #623153 0%, #FFB876 100%)`.

**Summary:** The new components introduce a 3-stop gradient variant (`#623153 → #874a72 → #FFB876`) while the reference Header uses a clean 2-stop gradient. The midpoint `#874a72` is hardcoded in three separate files with no shared constant. If the brand gradient ever changes, three files need updating. This should be extracted to a CSS custom property or token.

### Colors Missing from Token System

- `#874a72` — gradient midpoint (used in 3 places, not in tokens)
- `#7c3aed`, `#b45309`, `#0f766e` — ContextChip accent colors (dead code but present)
- `red.400`, `red.50`, `red.500`, `red.600` — error states use Park UI Sand color scale. These work via the Park preset but are not documented in the Stitch brand system.

---

## 4. Animation Architecture

### Keyframe Split Creates Two Sources of Truth

Discovery-form keyframes are defined in `globals.css` (`scanPulse`, `scanLine`, `barFill`, `shimmer`, `gentleBreathe`, `phaseExit`, `counterUp`). Landing-page keyframes are defined in both `globals.css` (`meldarFadeSlideUp`, `focusDrift1`, `focusDrift2`) and `panda.config.ts` (`fadeInUp`, `blink`). This three-way split means:

1. `globals.css` — meldarFadeSlideUp, focusDrift1, focusDrift2 (used via `style={{}}`)
2. `globals.css` — scanPulse, scanLine, barFill, shimmer, gentleBreathe, phaseExit, counterUp (discovery-form, used via `style={{}}`)
3. `panda.config.ts` — fadeInUp, blink (available as Panda tokens, likely underused)

`fadeInUp` in panda.config appears to be a duplicate of `meldarFadeSlideUp` in globals.css (same transform, slightly different distance). This is dead code in panda.config unless something uses it.

### Animation on Non-Interactive Containers

`xray-client.tsx:57` wraps the entire scan phase `VStack` with `style={{ animation: 'meldarFadeSlideUp 0.5s ease-out both' }}`. This animates a large container on every phase transition, including when the user resets from result back to scan. The reset path (`phase === 'scan'`) will trigger the entrance animation every time — users uploading multiple screenshots will see repeated fade-ins of the entire form, which can feel jarring rather than polished.

### `RevealStagger` and `prefers-reduced-motion`

`XRayCardReveal.tsx` applies animations with no `prefers-reduced-motion` check. Users who have enabled "Reduce Motion" in their OS will still see all stagger animations. The fix is a media query in the CSS keyframe declaration or a CSS variable that respects the preference:

```css
@media (prefers-reduced-motion: reduce) {
  /* All keyframes should resolve immediately */
}
```

This is also true for `FocusAmbient.tsx` — the ambient blob animations (`focusDrift1`, `focusDrift2`) run for 30-40 seconds in infinite loops. For users with vestibular disorders, large-scale motion on a decorative background is a WCAG 2.3.3 concern (AAA, non-binding) but also a practical UX concern.

---

## 5. Accessibility

### Missing Focus Styles

The styled buttons in `ContextChip.tsx` have no `_focusVisible` prop. The reference `HeroSection.tsx` cards use `_focusVisible={{ outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' }}`. The chip buttons are keyboard-navigable and need equivalent focus rings.

`UploadZone.tsx` — the `styled.label` (the drop zone) has no focus style. Labels are not natively focusable, but the `<input type="file">` inside it is. When the input receives focus, the visible label should show a focus indicator. This is currently invisible.

`XRayCardActions.tsx` — Share and Copy link buttons have no `_focusVisible` prop.

`xray-client.tsx` — The "Upload another screenshot" button and "Back to Meldar" link both lack `_focusVisible` styles.

### ARIA Labels and Roles

`ContextChip.tsx` — The chip group has no `role="group"` container and no label connecting the "I'm currently..." text to the chip buttons. Screen readers will announce the buttons in isolation without context. The `VStack` wrapping the label and chips in `xray-client.tsx:82-94` should become a `fieldset`/`legend` pair, or at minimum the buttons should have `aria-label` attributes that include the group context.

`UploadZone.tsx` — The processing step indicators (lines 217-251) convey state (done, current, pending) visually but have no ARIA live region. When the step advances, screen readers will not announce the change. Add `aria-live="polite"` to the steps container.

`XRayCard.tsx` — The app usage bar chart (lines 77-131) is a visual-only representation. There is no `role="img"` with `aria-label` summarizing the data, nor a `<table>` alternative. Screen readers will encounter a list of numbers and bars with no semantic relationship explained.

`XRayCardReveal.tsx` (RevealStagger) — Sets `opacity: 0` inline before animation starts. If a screen reader encounters the element during the animation delay window (up to 1200ms for the last stagger), it may read content that is visually invisible. This is generally acceptable since screen readers do not respect opacity, but it is worth noting.

### Color Contrast

The token `onSurfaceVariant/50` (50% opacity on `#4f434a` over `#faf9f6`) needs contrast verification. At 50% opacity the effective color is approximately `#a7a09e`, which is below the WCAG AA 4.5:1 ratio for normal text. This token combination is used extensively:
- `xray-client.tsx:76` — body paragraph under the hero heading
- `xray-client.tsx:102` — privacy reassurance text
- `UploadZone.tsx:191` — "iPhone or Android" subtitle
- `XRayCard.tsx:85,143,162` — app rank numbers, stat labels

The `onSurfaceVariant/70` variant (70% opacity) fares better but may still not meet AA for small text (below 18px).

---

## 6. Responsive Behavior

The components are built mobile-first with appropriate responsive breakpoints. Observed patterns:

**Compliant:**
- `UploadZone.tsx:332` — guide grid switches `flexDir={{ base: 'column', sm: 'row' }}`
- `ResultEmailCapture.tsx:107` — email form switches `flexDir={{ base: 'column', sm: 'row' }}`
- `XRayCard.tsx:66` — big stat font scales `fontSize={{ base: '4xl', md: '5xl' }}`
- `xray-client.tsx:63,121` — page heading scales `fontSize={{ base: '2xl', md: '3xl' }}`

**Gaps:**
- `ContextChip.tsx` — chip row uses `flexWrap="wrap"` but has no minimum touch target guarantee. At `fontSize="sm"` and `paddingBlock="10px"`, the chips may be under 44px tall on some iOS renderings. iOS HIG recommends 44×44pt minimum.
- `XRayCard.tsx:94-99` — app name column is `width="100px"` fixed. On very small screens (320px wide) this may cause layout overflow in the bar chart row. The app name should truncate with `overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap"` rather than a fixed pixel width.
- `UploadZone.tsx` — the upload label has `minHeight="220px"`. On landscape phone viewports this could crowd the screen. No landscape-specific adjustment is present.

---

## 7. Component Hierarchy Consistency

### Phase Model Simplification (Positive)

The two-phase model (`scan | result`) in `xray-client.tsx` is cleaner than a multi-step phase system. The state is minimal (`phase`, `lifeStage`, `result`, `showDeletionBanner`). The `handleResult` / `reset` functions are straightforward. This is a well-structured orchestrator component.

### Inconsistency: Gradient Stop Values

Three gradient variants exist across the new components:
1. `linear-gradient(135deg, #623153 0%, #FFB876 100%)` — Header, HeroSection icons (2-stop, canonical)
2. `linear-gradient(135deg, #623153 0%, #874a72 100%)` — UploadZone CTA button, ResultEmailCapture submit button (2-stop, dark variant)
3. `linear-gradient(135deg, #623153 0%, #874a72 40%, #FFB876 100%)` — XRayCard header, scan line (3-stop, full brand gradient)

The dark 2-stop variant (`#874a72`) is used only on buttons. The Header CTA uses the canonical 2-stop. This means the primary action button on the upload page looks different from the same-tier action in the header. This is unintentional inconsistency, not intentional hierarchy.

### Inconsistency: Button Border Radius

- Upload page buttons: `borderRadius="12px"` (fixed pixel)
- Header CTA: `borderRadius="md"` (token)
- XRayCardActions buttons: `borderRadius="full"` (pill)
- ContextChip buttons: `borderRadius="12px"`
- ResultEmailCapture submit: `borderRadius="12px"`

The pill-shaped share/copy buttons in `XRayCardActions` feel out of system with the rounded-rectangle buttons everywhere else. This may be intentional (secondary/tertiary action treatment), but it is not documented.

---

## 8. Summary of Issues by Severity

**High (fix before launch):**
1. Accessibility: No focus styles on `ContextChip` buttons, `UploadZone` drop target, `XRayCardActions` buttons, and reset/back action buttons in the result phase.
2. Accessibility: No `aria-live` region on upload progress steps — state changes are invisible to screen readers.
3. Accessibility: App usage chart in `XRayCard` has no text alternative.

**Medium (fix in next sprint):**
4. Animation: No `prefers-reduced-motion` handling in `XRayCardReveal`, `FocusAmbient`, or any animation-bearing component.
5. Token drift: `#874a72` gradient midpoint hardcoded in three files. Extract to a CSS custom property.
6. Keyframe split: Discovery keyframes in `globals.css` should move to `panda.config.ts` to enable Panda utility usage and eliminate `style={{}}` props.
7. Contrast: `onSurfaceVariant/50` on body text likely fails WCAG AA — needs audit.
8. `ContextChip`: Dead code `accent` values in OPTIONS array should be removed or implemented.

**Low (debt, address in refactor):**
9. `XRayCard` encodes brand presentation (gradient header, hardcoded hex) in the entity layer — presentation belongs at the feature or widget layer.
10. `UploadZone` is coupled to `XRayResponse` — limits reuse for future upload flows.
11. `RevealStagger` `opacity: 0` inline style is redundant given `animation-fill-mode: both`.
12. Reset path triggers entrance animation re-play — consider `key` prop or conditional animation class.
13. App name width `width="100px"` in `XRayCard` should be replaced with truncation styles for narrow viewport safety.

---

## 9. Questions for QA to Verify on Live Site

1. **Focus ring visibility**: Tab through the X-Ray upload flow using only the keyboard. Do the ContextChip buttons, the upload drop zone (clicking via Enter on the label), the "Choose image" button, and the result phase action buttons all show a visible focus indicator? Note any elements where focus disappears entirely.

2. **Screen reader announcement of upload progress**: Using VoiceOver (iOS/macOS) or NVDA (Windows), upload a screenshot. Are the step transitions ("Detecting apps", "Generating your X-Ray") announced as they change, or does the screen reader remain silent during processing?

3. **Reduced motion behavior**: Enable "Reduce Motion" in macOS System Settings → Accessibility. Load `/xray` and observe: does the page-entry fade animation still play? Do the result stagger animations still play? Does the FocusAmbient blob animation still run in the background?

4. **Color contrast at `onSurfaceVariant/50`**: Use a browser accessibility inspector (e.g., Chrome DevTools → Accessibility → Contrast) on the privacy reassurance text ("Processed in ~3 seconds") and the body paragraph under the hero heading. Does either fail WCAG AA 4.5:1?

5. **App name overflow on narrow screens**: Test `/xray` result view at 320px viewport width. Does the app usage bar chart in `XRayCard` overflow horizontally, or does the layout hold? Specifically check whether the fixed `width="100px"` app name column causes the time label (`1.4h`) to be clipped or pushed off-screen.
