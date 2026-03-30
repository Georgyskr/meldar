# 03 -- Mobile UX Audit (iPhone 15 baseline)

**Date:** 2026-03-30
**Viewport reference:** iPhone 15 -- 393 x 852 CSS px, safe area insets top 59px / bottom 34px
**Target audience:** Gen Z (18-28), mobile-first browsers

---

## 1. Hero Section (`HeroSection.tsx`)

### Current state
- `minHeight="100vh"` with `justifyContent="center"` centers content vertically
- Two CTAs side by side above `sm` breakpoint, stacked column below
- No `EmailCapture` component rendered -- the hero links to `#early-access` anchor but the `EmailCapture` form only appears in a separate widget (not in the hero itself)

### Issues

| # | Severity | Issue | Detail |
|---|----------|-------|--------|
| H1 | **Critical** | Email capture is NOT visible above the fold | The hero has two anchor links ("Get early access", "See how it works") but neither is an inline email form. The `EmailCapture` component exists in `shared/ui` but is imported only by this file's import line and never rendered in the hero. Users must scroll to find the form -- or it may not exist on the page at all. For Gen Z on mobile, if the capture is not in the first screen, conversion drops 40-60%. |
| H2 | **High** | Full-viewport hero wastes vertical space on small screens | `minHeight="100vh"` (852px) is excessive when the actual content (label + h1 + paragraph + 2 buttons) only needs ~400-450px. On iPhone 15 this means ~400px of dead space below the CTAs before any scroll content appears. Gen Z users may not realize there is more content below. |
| H3 | **Medium** | `paddingInline={8}` (32px) is tight but acceptable | On 393px viewport, content area = 329px. The headline "Stop trying to figure out AI. Let it figure out you." at `3xl` (~30px) fits, but barely. No issue currently, but watch if copy changes. |
| H4 | **Low** | No scroll indicator | No visual hint that content exists below the fold. A subtle chevron or "scroll" animation would reduce bounce. |

### Recommended fixes

```
H1 fix: Add <EmailCapture id="early-access" /> directly inside the hero
VStack, below the CTA buttons. Replace the "Get early access" anchor
link with the actual form. This is the single highest-impact change
in this audit.

H2 fix: Change minHeight="100vh" to minHeight={{ base: "auto", md: "100vh" }}
and add paddingBlockStart={{ base: 24, md: 0 }} to account for the fixed
header (72px top padding already on <main>). On mobile, let the hero
be content-sized so subsequent sections are visible sooner.
```

---

## 2. Problem Section (`ProblemSection.tsx`)

### Current state
- 2-column grid (`base: 1, md: 2`) -- on mobile it stacks to 1 column (good)
- Left column: 3 icon+text problem cards stacked vertically
- Right column: testimonial card with `padding={8}` outer + `padding={12}` inner VStack

### Issues

| # | Severity | Issue | Detail |
|---|----------|-------|--------|
| P1 | **High** | Testimonial card is excessively tall on mobile | Inner VStack has `padding={12}` (48px each side) = 96px vertical padding, plus `padding={8}` (32px each side) on the outer div = 64px more. Total vertical padding alone: ~160px. With the icon (6xl ~60px), quote text (~3 lines at xl = ~84px), and label, the card is approximately **350-400px tall** -- nearly half the viewport -- for a single quote. This pushes the skill cards section far down the page. |
| P2 | **Medium** | `paddingBlock={32}` (128px) section padding is generous | Combined with the tall testimonial, the Problem section could span 1200-1400px on mobile. That is 1.5+ full screens of scrolling for 3 short problem statements and one quote. |
| P3 | **Low** | Problem body text is dense | Each problem card body is 2-3 sentences of colloquial text. On mobile (1 column), these read fine, but consider shorter copy for scanning. |

### Recommended fixes

```
P1 fix: Reduce inner padding on testimonial card for mobile:
  padding={{ base: 6, md: 12 }}
on the inner VStack. Also reduce the icon from fontSize="6xl" to
fontSize={{ base: "4xl", md: "6xl" }}.
Expected saving: ~80-100px vertical space.

P2 fix: Reduce section padding on mobile:
  paddingBlock={{ base: 20, md: 32 }}
```

---

## 3. Skill Cards Section (`SkillCardsSection.tsx`)

### Current state
- 6 cards in a Grid with `columns={{ base: 2, md: 3 }}`
- Each card: `padding={8}` (32px), icon + title + description
- Description text: `fontSize="xs"` (~12px)

### Issues

| # | Severity | Issue | Detail |
|---|----------|-------|--------|
| S1 | **High** | 2-column grid is cramped on 393px screens | Each card gets ~(393 - 32*2 - 24) / 2 = ~152px wide. With 32px padding inside each card, usable content width is ~88px. That is extremely narrow for text. Card titles like "Expense sorter" fit, but descriptions will wrap to 5-6 lines at 12px, creating tall, uneven cards. |
| S2 | **High** | Uneven card heights create visual chaos | Different description lengths (e.g., "Snap a receipt..." vs "Write once...") mean cards in the same row will be different heights. CSS Grid forces row height to the tallest card, leaving awkward whitespace in shorter cards. |
| S3 | **Medium** | `fontSize="xs"` (12px) descriptions may be below comfortable reading size | Gen Z mobile users expect 14-16px minimum for body text. 12px on a phone held at arm's length strains readability. |

### Recommended fixes

**Option A -- Single column with horizontal scroll (recommended):**
```
On base breakpoint, switch to a horizontal scrollable row:
  display={{ base: "flex", md: "grid" }}
  overflowX={{ base: "auto", md: "visible" }}
  flexWrap={{ base: "nowrap", md: "wrap" }}
  gap={4}

Each card gets:
  minWidth={{ base: "260px", md: "auto" }}
  flexShrink={0}

Add scroll-snap-type: x mandatory on the container and
scroll-snap-align: start on each card.

This is familiar to Gen Z (Instagram stories, TikTok, Spotify)
and eliminates the cramped 2-column problem entirely.
```

**Option B -- Single column stack:**
```
columns={{ base: 1, sm: 2, md: 3 }}
Full-width cards on small phones, 2-col on larger phones (428px+).
Less visually interesting but simpler.
```

```
S3 fix: Bump description fontSize to "sm" (14px) on mobile:
  fontSize={{ base: "sm", md: "xs" }}
(Note: "xs" for desktop is intentional if cards are wider there.)
```

---

## 4. How It Works Section (`HowItWorksSection.tsx`)

### Current state
- 3 steps, each with a large step number (`6xl` ~60px) and title + description
- `flexDir={{ base: 'column', md: 'row' }}` -- stacks vertically on mobile (good)
- `gap={24}` (96px) between steps

### Issues

| # | Severity | Issue | Detail |
|---|----------|-------|--------|
| W1 | **Medium** | `gap={24}` (96px) between steps is excessive on mobile | Three steps with 96px gaps between them means ~192px of pure whitespace. On a 852px screen, that is 22% of the viewport in gaps alone. |
| W2 | **Low** | Step number overlaps with content on column layout | When stacked, the giant "01" sits above the title. This is fine visually but takes up ~80px per step for a decorative element. |

### Recommended fixes

```
W1 fix: gap={{ base: 12, md: 24 }}

W2 fix (optional): On mobile, make step numbers smaller:
  fontSize={{ base: "4xl", md: "6xl" }}
```

---

## 5. Tiers Section (`TiersSection.tsx`)

### Current state
- 3-column grid on desktop, 1-column on mobile (`columns={{ base: 1, md: 3 }}`)
- Highlighted "Builder" card: `transform="scale(1.05)"`, `border="2px solid"`, `boxShadow="2xl"`
- "Preferred" badge: `position="absolute"`, `top={0}`, `transform="translateY(-50%)"`

### Issues

| # | Severity | Issue | Detail |
|---|----------|-------|--------|
| T1 | **High** | `scale(1.05)` causes horizontal overflow on mobile | On a 1-column layout, the card is full-width (~329px with paddingInline 8). Scaling to 1.05x makes it ~345px, which overflows the 329px content area by ~16px. This creates unwanted horizontal scroll on the entire page. Even if `overflow: hidden` is set on a parent, the card edges get clipped. |
| T2 | **High** | "Preferred" badge clips at top of card stack | With `top: 0; translateY(-50%)`, the badge sits half above the card. In a 1-column stack with `gap={8}` (32px), the badge sits in the gap between cards, but if the Builder card is the second card, the badge may overlap the bottom of the Explorer card above it, or be clipped by the section's `overflow`. |
| T3 | **Medium** | Cards are very tall on mobile | Each card has `padding={10}` (40px), feature list, and CTA button. Three cards stacked at full height could span 1200-1500px. Combined with section padding (128px), this section alone could be 1300-1600px -- nearly 2 full screens of scrolling. |

### Recommended fixes

```
T1 fix: Disable scale on mobile:
  transform={{ base: "none", md: tier.highlighted ? "scale(1.05)" : "none" }}
Instead, differentiate the highlighted card on mobile with a stronger
border and background tint:
  bg={tier.highlighted ? "surfaceContainerLow" : "surfaceContainerLowest"}

T2 fix: On mobile, move badge inside the card:
  position={{ base: "relative", md: "absolute" }}
  top={{ base: "auto", md: 0 }}
  transform={{ base: "none", md: "translateY(-50%)" }}
  marginBlockEnd={{ base: 4, md: 0 }}

T3 fix: Reduce padding on mobile:
  padding={{ base: 6, md: 10 }}
```

---

## 6. Comparison Section (`ComparisonSection.tsx`)

### Current state
- Table-like layout using `gridTemplateColumns="1fr 1fr 1fr"` (3 equal columns)
- `paddingInline={6}` (24px) per row
- Text uses `textStyle="body.sm"` (14px)

### Issues

| # | Severity | Issue | Detail |
|---|----------|-------|--------|
| C1 | **Critical** | 3 equal columns overflow or are unreadable on mobile | Available width: 393 - 64 (section padding) = 329px container. Minus 48px row padding = 281px for content. Three equal columns = ~93px each. The first column has labels like "Discovers what to automate" (24 characters) and "Technical knowledge" which at 14px will wrap to 2-3 lines in 93px. The Meldar and Others columns have shorter text but still look cramped. |
| C2 | **Medium** | No column headers | Without labels for "Feature / Meldar / Others", the table structure is unclear, especially when text wraps and column alignment breaks visually. |

### Recommended fixes

```
C1 fix: Switch to a stacked card layout on mobile:
  gridTemplateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }}

For each row on mobile, render as a card:
  Feature label on top (full width, muted)
  Two columns below: Meldar value | Others value

Alternatively, use a 2-column layout with the feature label
spanning full width:
  gridTemplateColumns={{ base: "1fr 1fr", md: "1fr 1fr 1fr" }}
  with the feature name as a full-width row above each pair.

C2 fix: Add sticky column headers:
  <styled.div display={{ base: "none", md: "grid" }} ...>
    <span>Feature</span><span>Meldar</span><span>Others</span>
  </styled.div>
```

---

## 7. Trust Section (`TrustSection.tsx`)

### Current state
- Centered text with icon, heading, paragraph, and link
- Decorative gradient blur blob: `position="absolute"`, `right="-80px"`, `top="-80px"`, `width="384px"`

### Issues

| # | Severity | Issue | Detail |
|---|----------|-------|--------|
| R1 | **Medium** | Gradient blob may cause horizontal overflow | The blob is 384px wide, positioned at `right: -80px`. With `overflow="hidden"` on the section, this should be clipped. If overflow is not effectively hiding it on all mobile browsers (Safari has known issues with `overflow: hidden` on sections with `position: relative`), it would cause a page-wide horizontal scroll. |
| R2 | **Low** | Section is well-structured for mobile | Text-centered, reasonable max-width, no complex layouts. No major issues. |

### Recommended fix

```
R1 fix: Verify overflow clipping works in mobile Safari. If not,
add overflow="hidden" to the parent <main> or use overflow="clip"
(better Safari support for this use case) on the section.
```

---

## 8. FAQ Section (`FaqSection.tsx`)

### Current state
- Accordion pattern with `onClick` on the entire `styled.div`
- No explicit height/padding on touch targets
- Question row: `display="flex" justifyContent="space-between" alignItems="center"`
- Chevron icon: `expand_more` Material Symbol, no rotation animation

### Issues

| # | Severity | Issue | Detail |
|---|----------|-------|--------|
| F1 | **High** | Touch targets are too small | The clickable area is the entire FAQ item div, but the visual affordance (the question text + chevron) has no minimum height. Short questions like "What does it cost?" at default font size may render at ~20px height. Apple HIG recommends 44px minimum touch targets. The `paddingBlockEnd={6}` (24px) only applies to the bottom of each item, not the clickable header row. |
| F2 | **Medium** | No visual feedback on tap | No `:active` or tap highlight state. Gen Z users expect immediate feedback -- a subtle background flash or scale on press. |
| F3 | **Medium** | Chevron does not rotate when open | The `expand_more` icon stays static whether the item is open or closed. This is a missed affordance -- users expect the chevron to flip to `expand_less` or rotate 180deg. |
| F4 | **Low** | `maxWidth="breakpoint-sm"` constrains well on mobile | Good choice. No overflow issues. |

### Recommended fixes

```
F1 fix: Add minimum touch target to the header row:
  <styled.div
    display="flex"
    justifyContent="space-between"
    alignItems="center"
    minHeight="48px"          /* 44px + buffer */
    paddingBlock={3}          /* vertical padding for comfort */
  >

F2 fix: Add active state to the item container:
  _active={{ bg: "surfaceContainerLow" }}
  transition="background 0.1s ease"

F3 fix: Rotate chevron based on open state:
  transform={openIndex === i ? "rotate(180deg)" : "rotate(0deg)"}
  transition="transform 0.2s ease"
```

---

## 9. Final CTA Section (`FinalCtaSection.tsx`)

### Current state
- Heading + single "Get early access" anchor link + tagline
- `paddingBlock={40}` (160px top + bottom = 320px)
- CTA button: `_hover={{ transform: 'scale(1.05)' }}`

### Issues

| # | Severity | Issue | Detail |
|---|----------|-------|--------|
| FC1 | **Medium** | Same problem as hero -- no inline email capture | The CTA links to `#early-access` but again, this is just an anchor, not a form. If the EmailCapture is not rendered anywhere on the page, this link goes nowhere. |
| FC2 | **Low** | `paddingBlock={40}` (160px each side) is excessive on mobile | This section should feel spacious, but 320px of padding for a heading + button + tagline is too much dead space on a phone. |

### Recommended fixes

```
FC1 fix: Replace the anchor CTA with <EmailCapture /> component here
as well (or at minimum, ensure the #early-access target exists).

FC2 fix: paddingBlock={{ base: 24, md: 40 }}
```

---

## 10. Header (`Header.tsx`)

### Current state
- Fixed header, `paddingBlock={4}` (16px), `paddingInline={8}` (32px)
- Logo (icon + "Meldar" text) on left
- "Get early access" button on right -- `display={{ base: 'none', md: 'block' }}`

### Issues

| # | Severity | Issue | Detail |
|---|----------|-------|--------|
| HD1 | **High** | Header CTA is hidden on mobile | The "Get early access" button uses `display={{ base: 'none', md: 'block' }}`, so on mobile the header is just the logo with nothing actionable. This is a wasted opportunity for conversion. |
| HD2 | **Medium** | No hamburger menu or mobile navigation | There are no other pages yet, but as the site grows, there is no mobile nav pattern in place. |

### Recommended fix

```
HD1 fix: Show a compact CTA on mobile. Either:
  a) Remove the base: 'none' and show the button always (with
     smaller padding on mobile), or
  b) Add a sticky bottom CTA bar instead (see section 11).
```

---

## 11. Missing: Sticky Mobile CTA Bar

### Issue -- **Critical**

There is no sticky mobile CTA bar. On a page this long (see section 12), the user can scroll for 30+ seconds before reaching any email capture form -- if one even exists on the page. The header hides its CTA on mobile. The hero has no form. The final CTA section is at the very bottom.

**This means there is potentially no way for a mobile user to convert without scrolling through the entire page.**

### Recommended fix

```
Create a sticky bottom CTA bar for mobile:

<styled.div
  display={{ base: "flex", md: "none" }}
  position="fixed"
  bottom={0}
  left={0}
  right={0}
  zIndex={50}
  bg="surface/95"
  backdropFilter="blur(12px)"
  paddingInline={6}
  paddingBlock={3}
  paddingBlockEnd="calc(env(safe-area-inset-bottom) + 12px)"
  borderBlockStart="1px solid"
  borderColor="outlineVariant/20"
  boxShadow="0 -4px 24px rgba(0,0,0,0.06)"
  gap={3}
  justifyContent="center"
  alignItems="center"
>
  <styled.a
    href="#early-access"
    flex={1}
    textAlign="center"
    paddingBlock={3}
    background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"
    color="white"
    fontWeight="500"
    borderRadius="md"
    textDecoration="none"
  >
    Get early access
  </styled.a>
</styled.div>

Also add paddingBlockEnd to <main> to prevent the bar from
covering the footer:
  paddingBlockEnd={{ base: "80px", md: 0 }}
```

---

## 12. Total Scroll Depth Estimate

| Section | Estimated mobile height (px) | Thumb scrolls (~400px each) |
|---------|-----------------------------|-----------------------------|
| Header offset | 72 | -- |
| Hero | 852 (100vh) | 2.1 |
| Problem | ~1300 (3 cards + testimonial + padding) | 3.3 |
| Skill Cards | ~900 (6 cards in 2-col + padding) | 2.3 |
| How It Works | ~800 (3 steps + padding) | 2.0 |
| Tiers | ~1500 (3 tall cards + padding) | 3.8 |
| Comparison | ~550 (5 rows + padding) | 1.4 |
| Trust | ~500 (text + padding) | 1.3 |
| FAQ | ~700 (6 items + padding) | 1.8 |
| Final CTA | ~500 (heading + button + padding) | 1.3 |
| Footer | ~200 | 0.5 |
| **Total** | **~7,874px** | **~19.7 thumb scrolls** |

### Assessment

**19-20 thumb scrolls is too many.** Research (Baymard Institute) shows mobile landing page conversion drops significantly beyond 8-10 scrolls. Gen Z attention spans are even shorter -- if the core value prop and CTA are not within the first 2-3 scrolls, bounce rates spike.

### Recommended approach to reduce scroll depth

1. **Hero height reduction** (-400px): Remove `minHeight: 100vh` on mobile
2. **Problem section padding** (-80px): Reduce `paddingBlock` from 32 to 20 on mobile
3. **Testimonial card padding** (-100px): Reduce inner padding on mobile
4. **Skill cards horizontal scroll** (-400px): 1 row instead of 3 rows of 2
5. **How It Works gap reduction** (-100px): Reduce gap from 24 to 12 on mobile
6. **Tiers card padding** (-150px): Reduce card padding and section padding on mobile
7. **Section padding globally** (-300px): Reduce `paddingBlock` from 32 to 20 on all sections for base breakpoint

**Estimated savings: ~1,530px -> ~6,344px -> ~16 thumb scrolls**

Still long, but within acceptable range for a feature-rich landing page. Further reduction would require removing a section (Comparison is the weakest candidate for removal on mobile).

---

## 13. Footer (`Footer.tsx`)

### Issues

| # | Severity | Issue | Detail |
|---|----------|-------|--------|
| FT1 | **Medium** | Footer links are in a horizontal Flex with no wrapping | 4 links ("Privacy Policy", "Terms of Service", "Cookie Settings", "Contact") in a row at `body.sm` (14px). On 393px, these total ~300px+ and may fit tightly, but if any text is longer, they will overflow without `flexWrap="wrap"`. |
| FT2 | **Low** | Footer links have no minimum touch target height | Same 44px concern as the FAQ items. |

### Recommended fixes

```
FT1 fix: Add flexWrap="wrap" and justifyContent="center" to the
link Flex on mobile.

FT2 fix: Add paddingBlock={2} to each footer link for touch comfort.
```

---

## Priority Summary

### Critical (fix before launch)
1. **No email capture anywhere on the page** -- EmailCapture component exists but is not rendered. Add to hero and/or final CTA section.
2. **No sticky mobile CTA bar** -- users have no persistent way to convert.
3. **Comparison table overflows on mobile** -- 3-column fixed grid is unreadable at 393px.

### High (fix in next sprint)
4. **`scale(1.05)` on Tiers card causes horizontal overflow** -- disable on mobile.
5. **Skill cards 2-column grid is too cramped** -- switch to horizontal scroll or 1-column.
6. **Testimonial card is too tall** -- reduce inner padding on mobile.
7. **FAQ touch targets are too small** -- add minHeight and padding.
8. **Header CTA hidden on mobile** -- show or add sticky bar alternative.

### Medium (polish)
9. **Hero `100vh` wastes space** -- use `auto` height on mobile.
10. **Section padding too generous globally** -- reduce `paddingBlock` on mobile.
11. **How It Works gaps too large** -- reduce from 24 to 12 on mobile.
12. **FAQ missing chevron rotation and active state** -- add micro-interactions.
13. **Footer links may overflow** -- add `flexWrap`.
14. **Trust section blob overflow risk** -- verify in Safari.
15. **Final CTA section excessive padding** -- reduce on mobile.

### Low (nice to have)
16. **Hero scroll indicator** -- add subtle down-chevron.
17. **Font size on skill card descriptions** -- bump from xs to sm on mobile.
18. **Step numbers oversized on mobile** -- reduce decorative number size.
