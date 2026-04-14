# UI Designer Validation — Onboarding + Workspace

**Scope:** `DoorPicker`, `DoorA`, `DoorB`, `DoorC`, `ProposalPreview`, `OnboardingFunnel`, `OverflowMenu`, `WorkspaceTopBar`.
**Date:** 2026-04-13
**Design system:** Panda CSS + Park UI (Panda preset). Primary `#623153`, surface `#faf9f6`, accent `#FFB876`. Bricolage Grotesque headlines, Inter body.

---

## Top 3 Strengths

1. **Correct layout primitives and logical properties.** `VStack`, `HStack`, `Flex`, `Grid`, `Box` from `@styled-system/jsx` are used consistently for structure. Logical properties (`paddingInline`, `paddingBlock`, `borderBlockEnd`, `insetBlockStart`, `insetInlineEnd`) are used correctly where Panda props are used at all. Brand gradient (`linear-gradient(135deg, primary, #FFB876)`) is preserved on the primary CTA in `ProposalPreview`.

2. **Clear progressive-disclosure structure.** The three-door model has a consistent "back link → H1 + support copy → content → primary CTA" rhythm across `DoorA`, `DoorB`, `DoorC`. `ProposalPreview` frames the generated card inside its own bordered surface with a warm `primary/5` header — a strong visual anchor that reads like a real product preview, not a form summary.

3. **Touch targets meet 44px minimum on primary affordances.** `minHeight: 44` is set on vertical chips (`DoorA`), example-use buttons (`DoorB`), text CTAs (`DoorC`), and both primary/secondary actions in `ProposalPreview`. The `OverflowMenu` trigger is 36×36 (miss — see gaps) but menu items have `10px 16px` padding which gives ~40px row height (also just under). Otherwise good coverage.

---

## Design System Violations

### CRITICAL — Missing textStyle tokens (breaks at runtime / falls back to unstyled)

**CLAUDE.md lists `heading.1`–`heading.6`, `body.xl/lg/md/sm/xs`, `label.xs`, but these DO NOT exist in `apps/web/panda.config.ts`.** The actual config has:

- Size scales: `primary.{xxl,xl,lg,md,sm,xs}`, `secondary.{xl,lg,md,sm,xs}`, `tertiary.{xl,lg,md,sm,xs}`
- Fixed: `label.{lg,md,sm}`, `display.{xl,lg,md,sm}`, `italic.{lg,md,sm}`, `button.{lg,md,sm}`

This means every invocation below is referring to a token that isn't generated and will produce no style (or a Panda warning), silently breaking typography:

| File | Line(s) | Broken reference |
|---|---|---|
| `DoorPicker.tsx` | 42 | `textStyle="heading.1"` |
| `DoorPicker.tsx` | 45 | `textStyle="body.md"` |
| `DoorPicker.tsx` | 76 | `textStyle="body.sm"` |
| `DoorA.tsx` | 48 | `textStyle="heading.2"` |
| `DoorA.tsx` | 51 | `textStyle="body.md"` |
| `DoorB.tsx` | 32 | `textStyle="heading.2"` |
| `DoorB.tsx` | 35 | `textStyle="body.md"` |
| `DoorB.tsx` | 55, 59 | `textStyle="body.sm"`, `textStyle="body.xs"` |
| `DoorC.tsx` | 39 | `textStyle="heading.2"` |
| `DoorC.tsx` | 42 | `textStyle="body.md"` |
| `DoorC.tsx` | 67, 75 | `textStyle="body.xs"` |
| `ProposalPreview.tsx` | 29 | `textStyle="heading.2"` |
| `ProposalPreview.tsx` | 32 | `textStyle="body.md"` |
| `ProposalPreview.tsx` | 46 | `textStyle="heading.3"` |
| `ProposalPreview.tsx` | 65, 74 | `textStyle="body.xs"` |
| `ProposalPreview.tsx` | 82 | `textStyle="body.sm"` |
| `OverflowMenu.tsx` | 82, 92, 101, 110 | `textStyle="body.sm"` |

**Note:** `WorkspaceTopBar.tsx:28,37` correctly uses `tertiary.sm` and `primary.xs` — these are the real tokens. The onboarding files need the same fix.

**Recommended mapping** (replace across onboarding):
- `heading.1` → `primary.xl` or `primary.xxl`
- `heading.2` → `primary.lg`
- `heading.3` → `primary.md`
- `body.md` → `secondary.md`
- `body.sm` → `secondary.sm`
- `body.xs` → `secondary.xs`

Or, **add the aliases to `panda.config.ts`** (align config with CLAUDE.md docs) and run `pnpm panda codegen`. Given CLAUDE.md documents these names authoritatively, I'd argue the config is the bug, not the usage — but either way this is a hard break.

### Inline `style={{...}}` abuse (12 instances across 5 files)

CLAUDE.md says *"No inline styles. Always use Panda CSS utilities."* Violations:

| File | Line | What's inline | Why it's wrong |
|---|---|---|---|
| `DoorPicker.tsx` | 56–67 | Full `<button>` style (flex, padding, border, borderRadius, background, cursor) | Should be Panda recipe or `styled.button` with tokens |
| `DoorPicker.tsx` | 69 | `fontSize: 24, lineHeight: 1` on emoji span | Inline typography — violates strict rule. Use `<Text textStyle="...">` or Panda `fontSize`/`lineHeight` tokens |
| `DoorA.tsx` | 34–40 | Back button | Same as above |
| `DoorA.tsx` | 63–80 | Vertical chip buttons (including selected/unselected border and background branching) | Should use Panda conditional variants via `css` or recipe with `data-selected` |
| `DoorA.tsx` | 98–106, 119–127 | Text/URL inputs — includes `fontFamily: 'var(--fonts-body)'`, `fontSize: 14` | **Inline font-family and font-size** — direct rule violation |
| `DoorA.tsx` | 135–147 | Primary CTA — `fontFamily: 'var(--fonts-heading)'`, `fontWeight: 600`, `fontSize: 14` | **Inline typography on CTA** |
| `DoorB.tsx` | 18–24 | Back button | Inline |
| `DoorB.tsx` | 65–77 | "Use this" secondary CTA — `fontFamily`, `fontWeight`, `fontSize` inline | Typography violation |
| `DoorC.tsx` | 25–31 | Back button | Inline |
| `DoorC.tsx` | 52–63 | `<textarea>` — `fontFamily`, `fontSize`, `lineHeight` inline | Typography violation |
| `DoorC.tsx` | 85–97 | Primary CTA — same typography-inline pattern | Typography violation |
| `ProposalPreview.tsx` | 93–106, 114–125 | Both CTAs with `fontFamily`, `fontWeight`, `fontSize` inline | Typography violation |
| `OverflowMenu.tsx` | 43–53 | Trigger button | Inline (minor — purely structural) |
| `OverflowMenu.tsx` | 80, 90, 99, 108 | `style={{ padding: '10px 16px', textDecoration: 'none' }}` on Link/anchor | Inline padding — should use token |

### Shorthand / non-logical properties

No `px`/`mb`/`pt` shorthand violations found in these files. `WorkspaceTopBar.tsx` line 23–24 uses `paddingInline={5}` and `gap={5}` correctly.

### Typography-via-raw-HTML

- The emoji in `DoorPicker.tsx:69` is a raw `<span>` with inline font-size. The 24px size should come from a token or a dedicated "icon.md" textStyle.
- All back buttons are `<button>` → `<Text textStyle="label.sm" color="primary">` inside — acceptable, but the chevron `←` sits as a text node, not a `lucide-react` icon. For consistency with the OverflowMenu (which uses `lucide-react`), swap to `<ChevronLeft size={14} />`.

---

## Accessibility Gaps

### Contrast (WCAG AA 4.5:1 body / 3:1 large)

- **Disabled CTA in `DoorA`, `DoorC`, `ProposalPreview`** sets `background: var(--colors-outline-variant)` + `color: var(--colors-surface)` + `opacity: 0.5`. With `opacity: 0.5` layered on top of already-muted outline colors, effective contrast drops well below 4.5:1. Use a single `background: outlineVariant` + non-opacity disabled state, or a dedicated disabled token.
- **`OverflowMenu.tsx:32`** — `color="onSurface/20"` on the `/` separator. At 20% opacity the glyph likely falls below 3:1 even as decorative. It's marked `aria-hidden` so it's not read, but visible contrast is still a concern — raise to `/40` or `/50`.
- **`ProposalPreview.tsx:82`** — `color="error"` on error banner text over `background="error/10"`. Depending on the resolved error token, error-on-error/10 is typically around 4:1 and may just miss AA on smaller type. Verify with actual computed colors.

### Focus states

**Every inline-styled button has no visible focus indicator.** Browsers apply a default `outline`, but custom-styled buttons often lose it to `outline: none` from a global reset. Confirm there's a `:focus-visible` outline in `globals.css`; otherwise none of these buttons are keyboard-discoverable:

- `DoorPicker.tsx` door buttons
- `DoorA.tsx` vertical chips, inputs, CTA
- `DoorB.tsx` example CTA
- `DoorC.tsx` textarea, CTA
- `ProposalPreview.tsx` both CTAs
- `OverflowMenu.tsx` trigger and all menu links

Fix: migrate inline styles to Panda recipes with `_focusVisible={{ outline: '2px solid', outlineColor: 'primary', outlineOffset: '2px' }}`.

### Labels and semantics

- **`DoorA.tsx` inputs (lines 93, 114)** — no `<label htmlFor>`. The visible `<Text>` above each input is not associated. Screen readers announce "edit blank". Either wrap in `<label>` or add `aria-labelledby`/`id` pairing. Place `htmlFor="business-name"` + `id="business-name"`.
- **`DoorC.tsx` textarea** — same missing label issue.
- **`DoorA.tsx:62`** — `aria-pressed={selectedId === v.id}` is correct for toggle semantics, good.
- **`OverflowMenu.tsx`** — `aria-expanded` is set but no `aria-controls` pointing at the popover, and the popover has no `role="menu"` / `role="menuitem"` or `aria-labelledby`. Keyboard users pressing Enter land in a generic `VStack`. Add `role="menu"` to the `VStack` and `role="menuitem"` to each link, plus arrow-key navigation (optional but expected for menu pattern).
- **Back buttons (arrows)** — `←` is a text character, not flagged `aria-hidden`. Screen readers may say "left arrow, Back" redundantly. Swap to `<ChevronLeft aria-hidden />` + text "Back".

### Touch targets

- **`OverflowMenu.tsx:47-53`** trigger is 36×36. Below 44×44 WCAG 2.5.5 AAA recommendation and below iOS HIG 44pt. Either bump to 44×44 or pad hit area with a transparent wrapper.
- **`OverflowMenu.tsx` menu items** — `padding: '10px 16px'` gives ~40px row height at `body.sm`. Bump padding to `12px 16px` to clear 44px.
- **`DoorA`/`DoorB`/`DoorC` back buttons** — `padding: '8px 0'` alone gives ~32px hit height. Add horizontal padding and minHeight 44.

### Loading / submitting states

- `ProposalPreview.tsx:91-108` — when `submitting=true` the button shows "Setting up…" but there's no `aria-busy` or `aria-live` announcement. Screen-reader users don't know anything changed. Add `aria-busy={submitting}` on the button and `aria-live="polite"` on a status region.
- No spinner or motion indicator — in a 30s setup the submitting CTA looks frozen. Add a small `lucide-react` `Loader2` with `animation: spin`.

### Error handling

- `ProposalPreview.tsx:80-86` error surfaces via a static `Box`. Needs `role="alert"` or `aria-live="assertive"` so the error is announced when it appears post-submit.

---

## Visual Hierarchy & Consistency

### Hierarchy wins
- `DoorPicker` uses a clean H1 + subhead + 3 large cards — hierarchy reads immediately.
- `ProposalPreview` distinguishes the eyebrow (`primary` color, label textStyle) → H1 → preview card → CTA row. Good scan pattern.

### Hierarchy gaps
- **`DoorA`/`DoorB`/`DoorC` all have H2, not H1.** The door step is a distinct page at the top of the funnel — the first focusable landmark after the door pick should be H1, not H2. Currently there's no H1 on these steps, which breaks heading outline accessibility. Either promote to `<Heading as="h1">` or render the overall funnel's H1 in a sticky parent.
- **Back-button styling** is inconsistent with the rest of the system — it's a text link sized `label.sm`, tight, at the top-left. Compare against `WorkspaceTopBar` which has a structured `meldar / {projectName}` crumb. Recommend unifying onboarding with a similar crumb pattern: `← What do you need today? / {door title}`.
- **`DoorB` example cards** (lines 42–81) lack any differentiating visual element (no icon, no thumbnail, no preview image). Each card is just text + CTA. For a "Real pages made with Meldar" screen, a preview thumbnail or service-icon row is the single biggest UX win available.

### Consistency gaps across files
- **Border radius values drift**: buttons use `borderRadius: 8`, cards use `borderRadius: 10` or `12` or `"md"` or `"lg"`. `DoorPicker` door buttons are `12`, `DoorA` chips are `10`, `DoorC` textarea is `10`, CTAs are `8`. Establish 3 tiers (`xs`/`sm`/`md` → e.g., 6/8/12) and stick to them.
- **Gap sizing**: `gap={3}` on some rows, `gap="3"` on others, `gap="0.5"`, `gap={5}`. Pick string-form for Panda token consistency.
- **Padding on buttons**: `"14px 24px"`, `"10px 20px"`, `"14px 16px"`, `"16px 20px"`, `"16px 12px"`. Standardize to recipe variants (`sm` / `md` / `lg`).
- **Chevron direction**: `DoorA`/`DoorC` submit CTAs use `→` (text arrow); `ProposalPreview` uses `\u2192` (escaped right arrow). Same character but visually inconsistent source. And `DoorC` back button uses text `←`. Normalize to `lucide-react` `ChevronRight` / `ChevronLeft`.

---

## Component State Coverage

| Component | Default | Hover | Focus-visible | Disabled | Loading |
|---|---|---|---|---|---|
| DoorPicker door buttons | yes | **missing** | **missing** | n/a | n/a |
| DoorA vertical chips | yes | **missing** | **missing** | n/a | n/a |
| DoorA inputs | yes | n/a | **missing** (inline style) | n/a | n/a |
| DoorA primary CTA | yes | **missing** | **missing** | yes (but opacity contrast issue) | **missing** |
| DoorB example CTA | yes | **missing** | **missing** | n/a | n/a |
| DoorC textarea | yes | n/a | **missing** | n/a | n/a |
| DoorC primary CTA | yes | **missing** | **missing** | yes (contrast issue) | **missing** |
| ProposalPreview primary CTA | yes | **missing** | **missing** | yes | yes (text only, no spinner/aria-busy) |
| ProposalPreview secondary CTA | yes | **missing** | **missing** | yes | n/a |
| OverflowMenu trigger | yes | **missing** | **missing** | n/a | n/a |
| OverflowMenu items | yes | **missing** | **missing** | n/a | n/a |
| WorkspaceTopBar link | yes | n/a (inline `textDecoration:none` only) | ??? | n/a | n/a |

**Hover and focus are systematically missing** because everything is expressed through inline `style={{...}}` which can't express pseudo-classes. This is the single biggest mechanical fix: moving these to Panda `css` prop or recipes unlocks `_hover`, `_focusVisible`, `_active`, `_disabled` in one pass.

---

## Recommended Fixes (priority-ordered)

### P0 — Ship-blockers

1. **Fix the textStyle drift.** Either (a) rename onboarding `textStyle="heading.N"` / `textStyle="body.X"` calls to the real scale (`primary.*`, `secondary.*`), or (b) add the missing aliases to `panda.config.ts` and run `pnpm panda codegen`. Right now the onboarding funnel ships with ghost textStyles and falls back to unstyled or Park UI defaults.
2. **Migrate all inline `style={{...}}` on buttons/inputs to Panda recipes.** Create three recipes in `apps/web/src/shared/ui/`:
   - `button.recipe.ts` — variants `primary` (gradient), `secondary` (outline), `ghost` (text), `chip` (DoorA vertical), sizes `sm` / `md` / `lg`, with `_hover`, `_focusVisible`, `_disabled`.
   - `input.recipe.ts` — for text/url/textarea.
   - `card.recipe.ts` — for door buttons, example cards, proposal preview card.
   This removes every typography-inline violation and unlocks focus/hover in one pass.
3. **Add `:focus-visible` styles.** Required before any of these screens are production-ready for keyboard users.
4. **Fix missing labels on `DoorA` and `DoorC` inputs.** Wrap in `<label>` or add `htmlFor`/`id`.
5. **Promote step-page headings to H1** (or consolidate H1 in a shared funnel shell).

### P1 — Quality

6. **Add `aria-busy` + visible spinner on `ProposalPreview` submit CTA.** 30s of "Setting up…" without motion reads as frozen.
7. **Add `role="alert"` to error box** in `ProposalPreview`.
8. **Standardize border-radius, gap, padding tokens.** One scale, applied via recipe, no raw pixel values.
9. **Replace text-arrow chevrons with `lucide-react` icons** (`ChevronLeft` / `ChevronRight`). Unifies with existing lucide usage.
10. **Bump `OverflowMenu` trigger to 44×44** and menu-item padding to 12×16. Add `role="menu"` / `role="menuitem"` plus arrow-key navigation.
11. **Add visual differentiation to `DoorB` example cards** — preview thumbnail or service-icon row. Currently three identical text blocks.

### P2 — Polish

12. **Icon treatment in `DoorPicker`** — emoji (`🏪 👀 💡`) is friendly but mixes platform renderings wildly. Consider lucide icons with brand color for consistency, or accept emoji and mark `aria-hidden` + add an `<SrOnly>` label.
13. **Back-button as breadcrumb.** Align with `WorkspaceTopBar`'s `meldar / {projectName}` pattern: render `← What do you need today? / {step}` at the top of each door step.
14. **Disabled CTA contrast** — swap `opacity: 0.5` + `outline-variant` for a dedicated `_disabled` token that preserves contrast (e.g., `background: neutral.300`, `color: neutral.600`).
15. **Consider Park UI components.** The `Button`, `Input`, `Textarea` in Park UI already come with states, tokens, and accessibility wired up. Adopting them (via `npx @park-ui/cli add button`) eliminates most of the inline-style cleanup above.

---

## Files Referenced

- `/Users/georgyskr/projects/pet/agentgate/apps/web/src/features/onboarding/ui/DoorPicker.tsx`
- `/Users/georgyskr/projects/pet/agentgate/apps/web/src/features/onboarding/ui/DoorA.tsx`
- `/Users/georgyskr/projects/pet/agentgate/apps/web/src/features/onboarding/ui/DoorB.tsx`
- `/Users/georgyskr/projects/pet/agentgate/apps/web/src/features/onboarding/ui/DoorC.tsx`
- `/Users/georgyskr/projects/pet/agentgate/apps/web/src/features/onboarding/ui/ProposalPreview.tsx`
- `/Users/georgyskr/projects/pet/agentgate/apps/web/src/features/onboarding/ui/OnboardingFunnel.tsx`
- `/Users/georgyskr/projects/pet/agentgate/apps/web/src/widgets/workspace/OverflowMenu.tsx`
- `/Users/georgyskr/projects/pet/agentgate/apps/web/src/widgets/workspace/WorkspaceTopBar.tsx`
- `/Users/georgyskr/projects/pet/agentgate/apps/web/panda.config.ts` (textStyle source of truth)
