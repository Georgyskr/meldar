# WCAG 2.1 AA Accessibility Audit — Meldar Landing Page

**Date:** 2026-03-30
**Scope:** All components in `src/components/landing/`, `src/widgets/`, `src/shared/ui/EmailCapture.tsx`, `src/app/layout.tsx`, `src/app/page.tsx`
**Standard:** WCAG 2.1 Level AA

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 5     |
| Major    | 10    |
| Minor    | 7     |

---

## 1. Color Contrast

### 1.1 Gradient text on cream background — CRITICAL

**File:** `HeroSection.tsx:28-34`, `FinalCtaSection.tsx:16-22`

The gradient text (`linear-gradient(135deg, #623153 0%, #FFB876 100%)` with `backgroundClip: text`, `color: transparent`) renders text that transitions from dark mauve (#623153) to golden (#FFB876) on a cream background (#faf9f6).

- **#623153 on #faf9f6:** Contrast ratio ~5.7:1 — passes 4.5:1 for normal text.
- **#FFB876 on #faf9f6:** Contrast ratio ~1.8:1 — **fails** 4.5:1 for normal text and 3:1 for large text.

The golden end of the gradient **critically fails** WCAG 1.4.3. As the gradient transitions, roughly 40-60% of the text span falls below the required ratio.

**Fix:** Darken the golden end to at least #B8782A (contrast ~4.6:1 on cream) or use #A06A1E (~5.5:1). Alternatively, use the gradient only on headings large enough to qualify as "large text" (18pt/24px bold or 24pt/32px regular) and darken the end stop to at least #C48530 (~3.1:1).

### 1.2 `onSurface/40` text — CRITICAL

**Files:** `TiersSection.tsx:79` (tier label), `FinalCtaSection.tsx:41` (tagline), `Footer.tsx:27,37-38,55` (copyright, footer links)

`onSurface/40` computes to `#1a1c1a` at 40% opacity on `#faf9f6`, yielding an effective color of approximately `#a3a4a2`. Contrast against cream (#faf9f6): ~2.2:1 — **fails** 4.5:1 for normal text.

**Fix:** Use `onSurface/60` minimum (effective ~#7d7e7c, ~4.0:1) for large text, or `onSurface/70` (~#636463, ~5.5:1) for normal-sized text. For body text at `sm`/`xs` sizes, use at minimum `onSurface/70`.

### 1.3 `onSurface/50` text — MAJOR

**Files:** `SkillCardsSection.tsx:49` (card descriptions), `FaqSection.tsx:44` (FAQ answers)

`onSurface/50` yields effective color ~#8d8e8c` on cream. Contrast ~2.8:1 — **fails** 4.5:1 for normal text.

**Fix:** Replace with `onSurface/70` or stronger.

### 1.4 `onSurface/60` text — MAJOR

**Files:** `ProblemSection.tsx:49`, `SkillCardsSection.tsx:20`, `TiersSection.tsx:86`

`onSurface/60` yields effective ~#777877` on cream. Contrast ~3.6:1 — fails 4.5:1 for normal text but passes 3:1 for large text.

**Fix:** Acceptable only where text qualifies as large text (18pt bold / 24pt). For `body.sm` or `body.base` text, increase to `onSurface/70`.

### 1.5 `onSurface/30` in comparison table — MAJOR

**File:** `ComparisonSection.tsx:51`

The "Others" column uses `onSurface/30`, yielding effective ~#b8b9b7` on cream. Contrast ~1.7:1 — **fails** all thresholds.

**Fix:** If the intent is to visually de-emphasize competitors, use at minimum `onSurface/60` and rely on layout/weight differentiation instead. `onSurface/30` is illegible.

### 1.6 `primary/10` step numbers — MINOR

**File:** `HowItWorksSection.tsx:30`

The step numbers (01, 02, 03) at `color="primary/10"` are decorative/ornamental. If purely decorative, this is acceptable — but they currently carry semantic meaning (step ordering). Consider using `aria-hidden="true"` if the step number is repeated in the heading context, or increase opacity to at least `primary/30` (~3:1 for large text at 6xl).

### 1.7 `primary/20` decorative icon — MINOR

**File:** `ProblemSection.tsx:79`

The `cloud_off` icon at `color="primary/20"` is decorative (inside a testimonial card). Acceptable if `aria-hidden="true"` is added.

---

## 2. Keyboard Navigation

### 2.1 FAQ accordions are not keyboard accessible — CRITICAL

**File:** `FaqSection.tsx:27-49`

FAQ items use `<styled.div>` with `onClick` but:
- No `role="button"` or semantic `<button>` element
- No `tabIndex={0}` — items are not focusable via Tab
- No `onKeyDown` handler for Enter/Space activation
- No `aria-expanded` state for open/close

A keyboard-only user **cannot access FAQ content at all**.

**Fix:** Replace the clickable `<styled.div>` with a `<button>` element (or use `<details>`/`<summary>`). Add `aria-expanded={openIndex === i}` and `aria-controls` pointing to the answer panel. Wrap answers in a region with `id` matching `aria-controls` and `role="region"`.

Recommended pattern:
```tsx
<styled.button
  type="button"
  aria-expanded={openIndex === i}
  aria-controls={`faq-answer-${i}`}
  onClick={() => setOpenIndex(openIndex === i ? null : i)}
  // ... styles
>
  <styled.h5>{faq.q}</styled.h5>
  <styled.span aria-hidden="true">expand_more</styled.span>
</styled.button>
{openIndex === i && (
  <styled.div id={`faq-answer-${i}`} role="region">
    <styled.p>{faq.a}</styled.p>
  </styled.div>
)}
```

### 2.2 Tier cards and comparison rows have hover-only interactions — MINOR

**Files:** `TiersSection.tsx:53`, `ComparisonSection.tsx:36-37`

Cards and rows have `_hover` styles but no `_focus` equivalents. While the CTAs inside tiers are links (focusable), the visual hover feedback on the cards themselves isn't available via keyboard.

**Fix:** Add `_focusWithin` styles that mirror `_hover` for tier cards. For comparison rows, this is cosmetic-only so lower priority.

---

## 3. Screen Reader / ARIA

### 3.1 Material Symbols icons lack accessible labels — CRITICAL

**Files:** All components using `className="material-symbols-outlined"`

Every Material Symbols icon is rendered as a `<span>` containing text like `"layers_clear"`, `"check"`, `"expand_more"`, etc. Screen readers will announce this raw icon name text (e.g., "layers underscore clear"), which is confusing and incorrect.

**Affected locations:**
- `ProblemSection.tsx:38-44` — problem icons (layers_clear, visibility_off, build_circle)
- `ProblemSection.tsx:75-81` — cloud_off testimonial icon
- `SkillCardsSection.tsx:37-44` — skill card icons (restaurant, school, sell, etc.)
- `TiersSection.tsx:94` — check icons in feature lists
- `TrustSection.tsx:26-30` — shield_moon icon
- `FaqSection.tsx:39-41` — expand_more chevrons

**Fix — informative icons:** Add `role="img"` and `aria-label` with a human-readable description:
```tsx
<styled.span
  className="material-symbols-outlined"
  role="img"
  aria-label="Layers cleared"
>
  layers_clear
</styled.span>
```

**Fix — decorative icons:** Add `aria-hidden="true"` to hide from screen readers:
```tsx
<styled.span className="material-symbols-outlined" aria-hidden="true">
  check
</styled.span>
```

Categorization:
- **Decorative** (use `aria-hidden="true"`): check marks in TiersSection, expand_more in FaqSection, cloud_off in ProblemSection testimonial, shield_moon in TrustSection
- **Informative** (use `role="img"` + `aria-label`): problem icons (layers_clear, visibility_off, build_circle), skill card icons (restaurant, school, sell, work, receipt_long, share)

### 3.2 Header logo gradient dot has no alt text — MINOR

**File:** `Header.tsx:24-29`

The decorative gradient circle next to the "Meldar" wordmark is a `<styled.div>`. It's decorative and should have `aria-hidden="true"`.

### 3.3 Comparison table lacks table semantics — MAJOR

**File:** `ComparisonSection.tsx:19-59`

The comparison table is built with a series of `<styled.div>` elements using CSS Grid. Screen readers see this as a flat list of text, losing all tabular relationships (which cell belongs to which column header).

**Fix:** Use a proper `<styled.table>` with `<thead>`, `<tbody>`, `<tr>`, `<th scope="col">`, and `<td>` elements. Add a `<caption>` or `aria-label` on the table. This provides row/column navigation to screen reader users.

### 3.4 "Preferred" badge on tier card is not announced in context — MINOR

**File:** `TiersSection.tsx:56-71`

The "Preferred" badge is visually positioned above the Builder card using absolute positioning. Screen readers may not associate it with the correct tier. Consider adding `aria-label="Builder tier (Preferred)"` to the card container, or using `sr-only` text within the tier heading.

---

## 4. Focus Indicators

### 4.1 No visible focus indicators on gradient buttons/links — CRITICAL

**Files:** `HeroSection.tsx:47-60`, `FinalCtaSection.tsx:25-38`, `TiersSection.tsx:102-123`, `Header.tsx:43-58`

All CTA links use `<styled.a>` with gradient backgrounds. None define `_focus` or `_focusVisible` styles. The browser default focus ring (typically a thin blue outline) is likely invisible or barely visible against the gradient background.

**Fix:** Add explicit `_focusVisible` styles to all interactive elements:
```tsx
_focusVisible={{
  outline: '2px solid',
  outlineColor: 'primary',
  outlineOffset: '2px',
}}
```

Apply to:
- Hero CTA links (both gradient and secondary)
- Header "Get early access" link
- FinalCta "Get early access" link
- Tier CTA links (all 3)
- TrustSection "Our privacy promise" link
- Footer links and "Cookie Settings" button
- EmailCapture input and submit button

### 4.2 Footer "Cookie Settings" button has no focus style — MAJOR

**File:** `Footer.tsx:35-43`

The `<styled.button>` for cookie settings inherits no focus style. Users tabbing through footer links will lose visual track at this button.

**Fix:** Add `_focusVisible` outline matching other interactive elements.

---

## 5. Form Labels

### 5.1 Email input has no accessible label — MAJOR

**File:** `EmailCapture.tsx:43-62`

The email input relies solely on `placeholder="you@email.com"` for identification. Placeholders are **not** accessible labels per WCAG 1.3.1 and 3.3.2:
- Placeholder disappears when user types, removing the field's identity
- Many screen readers do not announce placeholder text as a label
- Low contrast placeholder text (brand.fog) may be hard to read

**Fix:** Add a visually hidden `<label>`:
```tsx
<styled.label
  htmlFor="email-capture"
  position="absolute"
  width="1px"
  height="1px"
  overflow="hidden"
  clip="rect(0,0,0,0)"
  whiteSpace="nowrap"
>
  Email address
</styled.label>
<styled.input
  id="email-capture"
  type="email"
  aria-label="Email address"
  // ...
/>
```

Or at minimum add `aria-label="Email address"` to the input.

### 5.2 Submit button does not indicate form purpose — MINOR

**File:** `EmailCapture.tsx:64-83`

The button text "Get early access" is acceptable, but during loading it shows "Sending..." with no `aria-live` or `aria-busy` announcement.

**Fix:** Add `aria-busy={status === 'loading'}` to the form or button, and wrap the status text in an `aria-live="polite"` region so screen readers announce the state change.

---

## 6. Heading Hierarchy

### 6.1 Heading levels skip from H2 to H4/H5 — MAJOR

Multiple sections skip H3:

| Section | Headings used | Issue |
|---------|--------------|-------|
| ProblemSection | H2 > H4 | Skips H3 |
| SkillCardsSection | H2 > H5 | Skips H3, H4 |
| TiersSection | H4 (no parent H2/H3) | No section heading at all |
| FaqSection | H2 > H5 | Skips H3, H4 |

WCAG 1.3.1 requires heading levels to be semantically meaningful. Skipping levels confuses screen reader users navigating by headings.

**Fix:**
- `ProblemSection.tsx:46` — Change `<styled.h4>` to `<styled.h3>` for problem titles
- `SkillCardsSection.tsx:46` — Change `<styled.h5>` to `<styled.h3>` for skill names
- `TiersSection.tsx` — Add an H2 section heading (e.g., "Choose your path") before the grid. Change tier `<styled.h4>` to `<styled.h3>`
- `FaqSection.tsx:37` — Change `<styled.h5>` to `<styled.h3>` for question text

### 6.2 TiersSection has no section heading — MAJOR

**File:** `TiersSection.tsx`

The pricing/tiers section has no H2 heading. Screen reader users navigating by headings will skip from "How Meldar is different" (ComparisonSection) to "Your stuff stays your stuff" (TrustSection), never knowing a pricing section exists.

**Fix:** Add an H2 heading like "Choose your path" or "Pricing" at the top of the section.

---

## 7. Motion & Animation

### 7.1 No `prefers-reduced-motion` media query — MAJOR

**Files:** Multiple components with CSS transitions, `panda.config.ts:34-41` (keyframes)

The following animations/transitions have no reduced-motion accommodation:
- `fadeInUp` keyframe (opacity + translateY)
- `blink` keyframe
- Hover scale transforms on CTAs (`HeroSection.tsx:57`, `FinalCtaSection.tsx:36`)
- Hover/transition effects on tier cards, comparison rows, footer links

While CSS transitions (color, opacity, background) are generally safe, **transform-based animations** (scale, translateY) can cause vestibular discomfort.

**Fix:** Add a global reduced-motion rule in `panda.config.ts` globalCss:
```ts
'@media (prefers-reduced-motion: reduce)': {
  '*, *::before, *::after': {
    animationDuration: '0.01ms !important',
    animationIterationCount: '1 !important',
    transitionDuration: '0.01ms !important',
    scrollBehavior: 'auto !important',
  },
},
```

Or apply `@media (prefers-reduced-motion: reduce)` selectively to the `fadeInUp` and scale transforms.

---

## 8. Touch Targets

### 8.1 Footer links may be undersized on mobile — MAJOR

**File:** `Footer.tsx:32-46`

Footer links (`<FooterLink>`) and the "Cookie Settings" button have no explicit minimum height or padding. At `body.sm` font size with default line height, they are likely smaller than 44x44px.

**Fix:** Add minimum touch target size:
```tsx
// In FooterLink and Cookie Settings button
minHeight="44px"
display="inline-flex"
alignItems="center"
```

### 8.2 FAQ items touch target is the full row — acceptable

The FAQ divs are full-width blocks, so touch target width is fine. However, the height depends on content. The clickable area is the entire `<styled.div>` with `paddingBlockEnd={6}` (24px), which combined with text height should exceed 44px. **Acceptable.**

### 8.3 Header CTA hidden on mobile — MINOR

**File:** `Header.tsx:45`

The header "Get early access" link uses `display={{ base: 'none', md: 'block' }}`, hiding it on mobile. This means mobile users lose a CTA. Not an a11y violation per se, but worth noting for UX. The hero CTA is still accessible.

### 8.4 Skill cards on 2-column mobile grid may have small tap areas — MINOR

**File:** `SkillCardsSection.tsx:25`

On mobile (`base`), cards are in a 2-column grid. The cards themselves have `padding={8}` (32px) which provides adequate touch area since the entire card is not clickable — this is informational content only. **No action needed.**

---

## 9. Additional Issues

### 9.1 Broken anchor links — MAJOR (UX, not WCAG)

**Files:** `HeroSection.tsx:48`, `Header.tsx:44`, `FinalCtaSection.tsx:26`, `TiersSection.tsx:10,19,28`

Six links point to `href="#early-access"` but **no element on the page has `id="early-access"`**. The `EmailCapture` component accepts an `id` prop but is imported-and-unused in `HeroSection.tsx:2`. These links navigate nowhere.

**Fix:** Either render `<EmailCapture id="early-access" />` somewhere on the page, or add `id="early-access"` to the target section.

### 9.2 Unused import — MINOR

**File:** `HeroSection.tsx:2`

`EmailCapture` is imported but not used. Remove or implement.

### 9.3 `lang` attribute present — PASS

**File:** `layout.tsx:30` — `<html lang="en">` is correctly set.

### 9.4 Page has proper landmark structure — PASS

The page uses `<styled.header>`, `<styled.main>`, `<styled.footer>`, and `<styled.section>` elements providing correct landmark regions.

---

## Fix Priority Matrix

| Priority | Issue | WCAG Criterion | Effort |
|----------|-------|---------------|--------|
| P0 | 1.1 Gradient text contrast | 1.4.3 Contrast | Low — adjust gradient end color |
| P0 | 1.2 onSurface/40 text contrast | 1.4.3 Contrast | Low — find-replace opacity values |
| P0 | 2.1 FAQ keyboard access | 2.1.1 Keyboard | Medium — refactor to button/details |
| P0 | 3.1 Icon screen reader text | 1.1.1 Non-text Content | Medium — add aria attrs to all icons |
| P0 | 4.1 Missing focus indicators | 2.4.7 Focus Visible | Medium — add _focusVisible to all CTAs |
| P1 | 1.3 onSurface/50 contrast | 1.4.3 Contrast | Low |
| P1 | 1.4 onSurface/60 contrast | 1.4.3 Contrast | Low |
| P1 | 1.5 onSurface/30 contrast | 1.4.3 Contrast | Low |
| P1 | 3.3 Comparison table semantics | 1.3.1 Info & Relationships | Medium |
| P1 | 5.1 Email input label | 1.3.1 / 3.3.2 Labels | Low |
| P1 | 6.1 Heading hierarchy skips | 1.3.1 Info & Relationships | Low |
| P1 | 6.2 Missing TiersSection heading | 1.3.1 Info & Relationships | Low |
| P1 | 7.1 prefers-reduced-motion | 2.3.3 Animation | Low — one global rule |
| P1 | 8.1 Footer touch targets | 2.5.8 Target Size | Low |
| P1 | 4.2 Cookie button focus | 2.4.7 Focus Visible | Low |
| P2 | 9.1 Broken #early-access links | N/A (UX) | Low |
| P2 | 1.6 Step number opacity | 1.4.3 Contrast | Low |
| P2 | 1.7 Decorative icon opacity | 1.1.1 Non-text Content | Low |
| P2 | 2.2 Hover-only card feedback | 1.4.13 Content on Hover | Low |
| P2 | 3.2 Logo dot aria-hidden | 1.1.1 Non-text Content | Trivial |
| P2 | 3.4 Preferred badge context | 1.3.1 Info & Relationships | Low |
| P2 | 5.2 Loading state announcement | 4.1.3 Status Messages | Low |
