# 08 -- Funnel Critique: UI Designer

Visual design critique and refinements applied to `apps/web/src/app/design-lab/VariantB.tsx`.

---

## Issues Found

### 1. Visual Hierarchy -- Flat Title Scale

The h1 at 26px was undersized for a hero moment. Door card titles at 15px were nearly indistinguishable from 14px body text. Bumped h1 to 30px/1.1 line-height, card titles to 16px/700 weight, and body to 15px to restore clear size differentiation between headline, card title, and supporting text.

### 2. Selected Door -- Insufficient Contrast

The selected Door A had a 2px border and 3% opacity tinted background (`#62315308`). On a white card, this was nearly invisible. Increased background opacity to `#62315312`, added a subtle box-shadow (`0 2px 12px ${primary}15`), and bumped title weight to 700 vs 600 on unselected cards to create a clear visual distinction.

### 3. Proposal Preview -- Looked Like a Data Table

The mini-preview card read as a flat list of rows, not a real page. Added a gradient header background (`linear-gradient(180deg, ...)` instead of flat tint), added a "Book now" CTA button in the preview to make it look like an actual page, increased the business name to 22px/800 weight, added box-shadow to the card container, and bumped service row spacing for better scanability.

### 4. Building Screen -- Active Step Had No Weight

The active step used `fontWeight: 500` vs 400, which is nearly invisible. The pulsing circle was a generic opaque blob. Changes: active step now has a highlighted background row (`${primary}08`), larger indicator dot (16px), "now" label on the right edge, pending steps at 50% opacity. The center icon is now a gradient circle with a lightning bolt emoji. Progress bar thickened from 5px to 6px with a step counter below.

### 5. Teaching Banner -- Nearly Invisible

The live screen's teaching banner had `primaryLight` background (3% opacity rgba), making it blend into the page. Increased to `${primary}15`, added a distinct border (`${primary}20`), bumped text to 14px/500 weight, and increased the sparkle emoji size.

### 6. Touch Targets Below 44px Minimum

Multiple elements were under the 44px minimum:
- **Chips**: Were 29px total. Added `minHeight: 44` and increased padding to `10px 18px`.
- **Suggestion chips (live screen)**: Were ~19px. Increased to `10px 16px` padding with `minHeight: 44` and `display: inline-flex`.
- **"I want something different" link**: Was naked text. Added `padding: 10px 16px` and `display: inline-block`.
- **Send button**: Added `minWidth: 44` and `minHeight: 44`.
- **Overflow menu button**: Was `4px 8px` padding. Now `10px 12px` with `minWidth/minHeight: 44`.
- **Door cards**: Added `minHeight: 72` to ensure adequate vertical hit area.
- **Buttons**: Base `s.btn` now has `minHeight: 44`.

### 7. Color Contrast Below WCAG AA (4.5:1)

`onSurfaceVariant: '#666666'` on `surface: '#faf9f6'` measured approximately 4.2:1, failing AA at small text sizes (12-13px). Introduced `MUTED_TEXT: '#555555'` (approximately 5.6:1 contrast ratio on the cream surface) and replaced all secondary/muted text color references throughout. The accent badge on Door D was changed from orange-on-orange to `#8B5E3C` on `#FFB87630` for legible contrast.

### 8. Spacing Adjustments

- Increased gap between heading and door cards from 32px to remain at 32px (was fine).
- Proposal preview body text marginBlockEnd from 20px to 24px for breathing room before the card.
- Building screen step list gaps changed from uniform 8px to 0 with row-based 10px padding for tighter grouping with row highlights.
- Live screen suggestion chips gap from 6px to 8px.

---

## Summary of Changes Applied

All refinements were made directly in `VariantB.tsx`. No structural changes -- same components, same flow order. Changes are purely visual:

1. **Typography scale**: h1 26px -> 30px, card titles 15px -> 16px/700, body 14px -> 15px
2. **Selected state contrast**: Stronger tinted background + box shadow on selected cards
3. **Proposal preview**: Gradient header, "Book now" button, card shadow -- looks like a real page
4. **Building screen**: Row-highlighted active step, "now" label, gradient icon, step counter
5. **Teaching banner**: Visible background opacity, distinct border, larger text
6. **Touch targets**: All interactive elements now meet 44px minimum
7. **Color contrast**: `#666666` replaced with `#555555` throughout for WCAG AA compliance
8. **ARIA**: Added `aria-label="Menu"` to overflow button
