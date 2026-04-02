# Landing Page Section-by-Section Implementation Spec

**Last updated:** 2026-04-01
**Purpose:** Granular implementation guide for each of the 11 landing page sections. Every directive references actual file paths, line numbers, Panda CSS tokens, and keyframes from globals.css.

**Key files:**
- Page composition: `/src/app/page.tsx`
- Section components: `/src/widgets/landing/*.tsx`
- Design tokens: `/panda.config.ts`
- Keyframes: `/src/shared/styles/globals.css`
- Scroll wrapper: `/src/shared/ui/FadeInOnScroll.tsx`
- Header: `/src/widgets/header/Header.tsx`
- Footer: `/src/widgets/footer/Footer.tsx`

**Section rendering order** (from `page.tsx:107-135`):
1. HeroSection
2. ProblemSection
3. ComparisonSection
4. HowItWorksSection
5. DataReceiptSection
6. SkillCardsSection
7. TrustSection
8. TiersSection
9. EarlyAdopterSection
10. FaqSection
11. FinalCtaSection

---

## Section 1: Hero

**File:** `/src/widgets/landing/HeroSection.tsx`
**Current state:** Left-aligned headline + subhead + 2 CTA cards + trust micro-line. No visual element on the right. Uses `heading.hero` text style (line 19). Dead space on desktop right side.

### Visual Direction
- **Background:** `surface` (#faf9f6) -- keep clean, let the headline carry weight
- **Layout:** 2-column on desktop: left column = headline + subhead + CTAs, right column = animated Data Receipt mini-card preview (new)
- **Card style:** Two CTA cards already differentiated (primary border vs outline). Track A has gradient icon circle (line 62). Keep this asymmetry.
- **Animation:** Hero should NOT use FadeInOnScroll (it's above fold). Instead apply `meldarFadeSlideUp` (globals.css:3-12) directly to the headline and subhead with staggered `animation-delay` (0ms headline, 200ms subhead, 400ms CTA grid, 600ms trust line).

### Content Structure (in order)
1. **H1 headline** (line 19-25): "Google made ~$238 from your data last year. What did you get?" -- currently correct, uses `heading.hero` and gradient `secondaryLight` accent on "What did you get?"
2. **Subhead** (line 27-35): "Upload a screenshot. See your real numbers..." -- currently correct
3. **CTA card grid** (lines 38-122): Two cards, 2-column on md+
4. **Trust micro-line** (lines 124-135): "No signup required. Your screenshot is deleted immediately" -- add founding member counter dynamically (e.g., "38 of 50 founding spots left")
5. **NEW: Data Receipt mini-preview** -- floating on the right column (desktop only), showing a condensed 3-stat version of the Data Receipt card. Use the same card chrome from `DataReceiptSection.tsx:35-101` but at ~60% scale with `opacity: 0.85` and a subtle `gentleBreathe` animation (globals.css:98-106) on the outer container

### CTA Strategy
- **Card A** ("Show me my data", line 67): href="/start" -- PRIMARY. Gradient icon circle signals importance. Keep.
- **Card B** ("I know what bugs me", line 109): href="/start" -- change to href="/quiz" to actually differentiate the tracks. Currently both go to /start.
- **Priority:** Card A is visually dominant (2px border, gradient icon). Correct hierarchy.

### Mobile Behavior
- CTA cards already stack 1-col on base (line 38: `columns={{ base: 1, md: 2 }}`)
- Data Receipt mini-preview should be `display="none"` on base, `display="block"` on lg+
- Headline wraps naturally via `<styled.br />` elements -- consider hiding `<styled.br />` on base to let text reflow naturally on small screens

### Specific Changes
1. **HeroSection.tsx:6-136** -- wrap entire section content in a `Grid columns={{ base: 1, lg: 2 }}` to create the 2-column layout. Left column: existing content. Right column: mini Data Receipt preview.
2. **HeroSection.tsx:19** -- add `style={{ animation: 'meldarFadeSlideUp 0.6s ease both' }}` to the h1
3. **HeroSection.tsx:27** -- add `style={{ animation: 'meldarFadeSlideUp 0.6s ease 0.2s both' }}` to the subhead paragraph
4. **HeroSection.tsx:38** -- add `style={{ animation: 'meldarFadeSlideUp 0.6s ease 0.4s both' }}` to the Grid
5. **HeroSection.tsx:82** -- change `href="/start"` to `href="/quiz"` for Track B card
6. **HeroSection.tsx:124-135** -- add founding member count next to trust line. Import `FoundingCounter` or add inline text.

### Keyframes to Apply
- `meldarFadeSlideUp` (globals.css:3-12) -- staggered entrance for headline, subhead, CTAs
- `gentleBreathe` (globals.css:98-106) -- subtle pulse on the Data Receipt mini-preview

---

## Section 2: Problem

**File:** `/src/widgets/landing/ProblemSection.tsx`
**Current state:** 2-column grid. Left: 3 pain points with icons. Right: Research card with "2,847" stat. Background `surfaceContainerLow`. Already has good copy and structure. Research card has gradient overlay (line 66-70) and pain point stats (lines 91-101).

### Visual Direction
- **Background:** `surfaceContainerLow` (#f4f3f1) -- keep, provides first visual break from hero
- **Layout:** Keep 2-column grid (`columns={{ base: 1, md: 2 }}`). Gap is `24` -- reduce to `gap={{ base: 12, md: 24 }}` for mobile
- **Card style:** Research card (right column) needs differentiation from generic cards. Add a gradient left-border accent: `borderLeft="3px solid"` with `borderLeftColor="primary"` plus keep the existing gradient overlay.
- **Animation:** Pain points should stagger-enter. Research card should use `blurReveal` for a dramatic entrance.

### Content Structure (in order)
1. **H2** (line 33): "Be honest. This is your week." -- keep as-is, strong conversational tone
2. **Pain point list** (lines 37-51): 3 items with icons. Each should animate individually with staggered delay.
3. **Research card** (lines 56-106): "2,847" stat + reframed copy + top 3 pain points + "Meldar picks up where you left off"

### CTA Strategy
- No explicit CTA in this section -- it's purely pain-agitation. The section headline ("Be honest. This is your week.") serves as emotional confrontation. Correct approach.

### Mobile Behavior
- Grid already stacks to 1-col on base. Pain points go above the research card.
- Reduce `gap` from 24 to 12 on mobile: `gap={{ base: 12, md: 24 }}` (line 29)
- Research card padding `{{ base: 8, md: 12 }}` inner padding (line 77) -- already responsive

### Specific Changes
1. **ProblemSection.tsx:29** -- change `gap={24}` to `gap={{ base: 12, md: 24 }}`
2. **ProblemSection.tsx:37-51** -- wrap each pain point `styled.div` in a stagger container. Add `style={{ animation: 'staggerFadeIn 0.5s ease both', animationDelay: '${i * 150}ms' }}` to each mapped item. This requires the component to become a client component OR the stagger to be applied via the parent `FadeInOnScroll` delay prop.
3. **ProblemSection.tsx:56** -- add `borderInlineStart="3px solid"` and `borderInlineStartColor="primary"` to the research card outer container for visual differentiation
4. **ProblemSection.tsx:80** -- the "2,847" number should use a count-up animation. Add `style={{ animation: 'counterUp 0.6s ease both' }}` (globals.css:119-128). For a true count-up, a client-side counter component would be needed -- but the `counterUp` fade-in-from-below is a good first pass.

### Keyframes to Apply
- `staggerFadeIn` (globals.css:177-186) -- staggered entrance for each pain point
- `counterUp` (globals.css:119-128) -- entrance animation for the "2,847" stat
- `blurReveal` (globals.css:188-197) -- entrance for the research card

---

## Section 3: Comparison

**File:** `/src/widgets/landing/ComparisonSection.tsx`
**Current state:** Centered section with "How Meldar is different" heading + 5-row comparison table. Background `surface`. Rows use a 3-column grid. Meldar column text is `fontWeight="500"` and `color="onSurface"`, others column is dimmed `color="onSurface/30"`. Subtle hover on rows.

### Visual Direction
- **Background:** `surface` (#faf9f6) -- same as hero, which creates monotony since ProblemSection (surfaceContainerLow) only barely differs. Change to keep `surface` but add a subtle decorative element -- a faint gradient circle (like TrustSection's blur orb at line 13-23) in the top-right corner.
- **Layout:** Keep centered single-column with max-width breakpoint-md
- **Card style:** The table container has `borderRadius="xl"` and `border="1px solid"`. Strengthen: add `boxShadow="md"` to lift it off the page. The Meldar column values should have a faint primary background tint on hover to draw the eye.
- **Animation:** Rows should stagger-enter from top to bottom when scrolled into view.

### Content Structure (in order)
1. **H2** (line 23): "How Meldar is different" -- consider a sharper rewrite: "You vs. the alternatives" or keep as-is
2. **Column headers** (currently missing): Add a header row with "Feature / Meldar / Others" labels. Currently the table has no headers -- the first row ("Starting point") just starts. Add a header row with `textStyle="label.upper"` styling.
3. **5 comparison rows** (lines 35-62): Feature, Meldar value (emphasized), Others value (dimmed)

### CTA Strategy
- No CTA currently. Consider adding a small CTA below the table: "See it in action" linking to /start. Secondary priority.

### Mobile Behavior
- The 3-column grid (`gridTemplateColumns="1fr 1fr 1fr"`) may squeeze on narrow mobile. Consider responsive columns: `gridTemplateColumns={{ base: '1fr 1fr', md: '1fr 1fr 1fr' }}` and hide the "Feature" label column on base, using the feature name as a row header instead.
- Alternative: keep 3-column but reduce `paddingInline` from 6 to 3 on base

### Specific Changes
1. **ComparisonSection.tsx** -- add a header row before the `.map()` (before line 35):
   ```tsx
   <styled.div display="grid" gridTemplateColumns="1fr 1fr 1fr" paddingBlock={4} paddingInline={6} borderBlockEnd="1px solid" borderColor="outlineVariant/15">
     <styled.span textStyle="label.upper" color="onSurface/40">Feature</styled.span>
     <styled.span textStyle="label.upper" color="primary" textAlign="center">Meldar</styled.span>
     <styled.span textStyle="label.upper" color="onSurface/40" textAlign="right">Others</styled.span>
   </styled.div>
   ```
2. **ComparisonSection.tsx:27** -- add `boxShadow="lg"` to the table container
3. **ComparisonSection.tsx:50-53** -- change the Meldar column to use `color="primary"` instead of `color="onSurface"` to make it pop as the "winning" column
4. **ComparisonSection.tsx:21** -- add a decorative gradient blur orb (copy pattern from TrustSection.tsx:13-23) but positioned top-left, smaller (width="256px")

### Keyframes to Apply
- `staggerFadeIn` (globals.css:177-186) -- stagger each row entrance
- `meldarFadeSlideUp` (globals.css:3-12) -- heading entrance (handled by FadeInOnScroll wrapper in page.tsx)

---

## Section 4: How It Works

**File:** `/src/widgets/landing/HowItWorksSection.tsx`
**Current state:** 3 steps displayed vertically with large step numbers (01, 02, 03) and descriptive text. Background `surfaceContainerLow`. No visual mockups, no connecting line, no icons beyond the numbers. Steps flex row on md+ (number left, text right).

### Visual Direction
- **Background:** `surfaceContainerLow` (#f4f3f1) -- PROBLEM: this is the same background as ProblemSection (section 2), creating visual monotony. Change to `surface` (#faf9f6) since ComparisonSection is also `surface` but this creates a different kind of monotony. Better approach: keep `surfaceContainerLow` but add a **vertical gradient connector line** between steps that uses the brand gradient, creating visual interest.
- **Layout:** Keep centered single-column with max-width breakpoint-md. Steps are vertically stacked with large gap (24).
- **Card style:** Steps are NOT in cards (just flex rows), which is correct -- not everything needs a card. The step numbers (`primary/40`, 5xl, 800 weight) provide visual anchoring.
- **Animation:** Steps should enter one at a time with slide-in-from-left.

### Content Structure (in order)
1. **H2** (line 26): "How it actually works" -- the DESIGN_PLAN flags this as generic. Rewrite: "Three steps. Your data. Your rules."
2. **Subhead** (line 29): "No installs. No permissions..." -- keep, good trust-building
3. **Step 01** (Take back your data): The DESIGN_PLAN suggests "Download what they already know" -- more intriguing
4. **Step 02** (See your real numbers): keep
5. **Step 03** (Pick a fix. We build it.): keep -- strongest copy
6. **NEW: Vertical connector line** between steps: a thin (2px) gradient line running vertically between step numbers, using `linear-gradient(to bottom, #623153, #FFB876)`

### CTA Strategy
- No explicit CTA. The final step ("Pick a fix. We build it.") acts as a natural bridge to the DataReceiptSection below. Correct.

### Mobile Behavior
- Steps already flex column on base, row on md+ (line 38: `flexDir={{ base: 'column', md: 'row' }}`)
- On mobile, the step numbers sit above the text block instead of beside it. Keep.
- Connector line should be left-aligned on mobile, running through the step numbers vertically. On desktop, same position (left of the text column).

### Specific Changes
1. **HowItWorksSection.tsx:24-62** -- wrap the steps container in a `position="relative"` container. Add a pseudo-element-like `Box` with `position="absolute"`, `left={{ base: '18px', md: '32px' }}`, `top="60px"`, `bottom="60px"`, `width="2px"`, `background="linear-gradient(to bottom, #623153, #FFB876)"`, `opacity={0.2}`, `zIndex={0}`. Position the step numbers with `position="relative"` and `zIndex={1}` so they sit on top of the line.
2. **HowItWorksSection.tsx:26** -- change heading from "How it actually works" to "Three steps. Your data. Your rules." or keep if stakeholder prefers
3. **HowItWorksSection.tsx:42-47** -- add entrance animation to each step: `style={{ animation: 'meldarFadeSlideUp 0.6s ease both', animationDelay: '${i * 200}ms' }}` (requires converting to client component or using CSS `animation-delay` via nth-child)
4. **HowItWorksSection.tsx:42** -- add `position="relative"` and `zIndex={1}` to each step container so content sits above the connector line

### Keyframes to Apply
- `meldarFadeSlideUp` (globals.css:3-12) -- staggered step entrance
- `barFill` (globals.css:80-87) -- could be applied to the connector line to animate it filling from top to bottom on scroll

---

## Section 5: Data Receipt (the "wow" moment)

**File:** `/src/widgets/landing/DataReceiptSection.tsx`
**Current state:** Dark background section (`inverseSurface` #2f312f). Contains a centered Data Receipt card with gradient header, 6-stat 2-column grid, and footer. The card uses `surfaceContainerLowest` (white) background against the dark section -- strong contrast. Sample stats include searches, email hours, recipe searches, app bouncing, recoverable time, and Google data value.

### Visual Direction
- **Background:** `inverseSurface` (#2f312f) -- keep the dark treatment. This is the dramatic break in the page. BUT: the DESIGN_PLAN notes this should be dark mauve, not generic charcoal. Change background to `primaryDark` (#481b3c) or use `background="linear-gradient(180deg, #2f312f 0%, #481b3c 100%)"` to blend from charcoal to brand-dark-mauve.
- **Layout:** Centered single-column with the card as the visual centerpiece
- **Card style:** This card is the hero visual moment. It should have special treatment:
  - Add `transform="perspective(800px) rotateY(-2deg)"` on desktop for a subtle 3D tilt
  - Add `_hover={{ transform: 'perspective(800px) rotateY(0deg)' }}` to flatten on hover
  - Add `boxShadow="0 32px 64px rgba(0,0,0,0.25)"` to dramatically lift it off the dark background
  - The gradient header strip (line 47-49) already uses the brand gradient -- good
- **Animation:** The card should enter with `blurReveal` (globals.css:188-197) for a dramatic deblur effect. Individual stats should `counterUp` with stagger.

### Content Structure (in order)
1. **Label** (line 23): "Your Data Analysis" in `inversePrimary` color -- keep
2. **H2** (line 25): "This is what your data looks like when it works for you" -- uses `heading.display`, correct for this high-impact section
3. **Subhead** (line 28-30): "A real report from real data..." -- keep
4. **Data Receipt card** (lines 35-101): Gradient header, 6 stats in 2-col grid, footer with "meldar.ai" and "Get your own analysis" link
5. **Disclaimer** (line 103-109): "Sample report. Your numbers will be different..."

### CTA Strategy
- **In-card CTA** (line 98): "Get your own analysis" -- this is small and easy to miss. Make it a more prominent link: increase font size from `2xs` to `xs`, add an arrow icon, and make it an actual `<a href="/start">`.
- Consider adding a standalone CTA button below the card: "See your own numbers -- free" with the gradient button treatment.

### Mobile Behavior
- Card has `maxWidth="440px"` and `marginInline="auto"` -- centers well on all sizes
- Stats grid is 2-column (`columns={2}`) -- fine on mobile, the card width constrains appropriately
- Remove the 3D tilt transform on mobile (it can cause rendering issues): `transform={{ base: 'none', lg: 'perspective(800px) rotateY(-2deg)' }}`

### Specific Changes
1. **DataReceiptSection.tsx:17** -- change `bg="inverseSurface"` to `background="linear-gradient(180deg, #2f312f 0%, #481b3c 100%)"` for brand-connected dark section
2. **DataReceiptSection.tsx:35-101** -- add to the outer Box: `transition="transform 0.4s ease, box-shadow 0.4s ease"`, `transform={{ base: 'none', lg: 'perspective(800px) rotateY(-2deg)' }}`, `_hover={{ transform: 'perspective(800px) rotateY(0deg)', boxShadow: '0 40px 80px rgba(0,0,0,0.3)' }}`
3. **DataReceiptSection.tsx:43** -- increase boxShadow from `"0 24px 48px rgba(0,0,0,0.08)"` to `"0 32px 64px rgba(98,49,83,0.2)"` (use brand primary color in shadow for tinted shadow effect)
4. **DataReceiptSection.tsx:98** -- change "Get your own analysis" from `fontSize="2xs"` to `fontSize="xs"` and add ` fontWeight="600"`
5. **After line 101** -- add a standalone gradient CTA button below the card, inside the VStack: `<styled.a href="/start" display="inline-flex" ... background="linear-gradient(135deg, #623153 0%, #FFB876 100%)" ...>See your real numbers -- free</styled.a>`
6. **DataReceiptSection.tsx:63** -- add entrance animation to each stat cell: requires converting to client component. Each `VStack` in the stats grid gets `style={{ animation: 'counterUp 0.5s ease both', animationDelay: '${i * 100}ms' }}`

### Keyframes to Apply
- `blurReveal` (globals.css:188-197) -- card entrance (dramatic deblur)
- `counterUp` (globals.css:119-128) -- individual stat values stagger-enter
- `shimmer` (globals.css:89-96) -- subtle shimmer on the gradient header strip after entrance

---

## Section 6: Skill Cards

**File:** `/src/widgets/landing/SkillCardsSection.tsx`
**Current state:** 6 skill cards in a 3-column grid. Each card has an icon, name, and description. Background `surface`. Cards are white with very faint border (`outlineVariant/5`) and hover border color change. All cards look identical -- no differentiation.

### Visual Direction
- **Background:** `surface` (#faf9f6) -- returning to light after the dark DataReceiptSection creates a good contrast rhythm. Keep.
- **Layout:** 3-column grid on md+, 2-col on sm, 1-col on base. Keep.
- **Card style:** BREAK THE MONOTONY. Instead of 6 identical cards:
  - **Top row (3 cards):** Standard white cards with the existing treatment
  - **Bottom row (3 cards):** Invert one card to use a `primary/5` background tint, making it "featured"
  - Add a "time saved" micro-stat to each card that reveals on hover (e.g., "Saves ~3 hrs/week")
  - Add a subtle gradient accent line at the top of each card (2px height, full width, brand gradient)
- **Animation:** Cards should stagger-enter in a wave pattern (left to right, top to bottom)

### Content Structure (in order)
1. **H2** (line 42): "Things people build in their first week" -- keep, strong social proof framing
2. **Subhead** (line 45): "Real problems. Personal apps. Each takes minutes to set up." -- keep
3. **6 skill cards** in grid:
   - Meal planner (UtensilsCrossed icon)
   - Grade watcher (GraduationCap)
   - Price watcher (Tag)
   - Email triage (Mail)
   - Expense sorter (Receipt)
   - Social poster (Share2)
4. **NEW: Each card should show "time saved" on hover** -- add a small line like `Saves ~3 hrs/week` below the description, hidden by default, revealed on hover with opacity transition

### CTA Strategy
- No section-level CTA currently. Add a centered CTA below the grid: "What would YOU build?" linking to /start. Use outline button style (not gradient -- save gradient for primary CTAs).

### Mobile Behavior
- Grid columns already responsive: `{{ base: 1, sm: 2, md: 3 }}` -- good
- On 1-column mobile, cards should have reduced padding: `padding={{ base: 6, md: 8 }}`
- Time-saved hover reveal should be always-visible on mobile (no hover on touch): use `display={{ base: 'block', md: 'none' }}` for always-on and `display={{ base: 'none', md: 'block' }}` for hover-reveal

### Specific Changes
1. **SkillCardsSection.tsx** -- add `timeSaved` field to each skill object in the `skills` array:
   ```
   { icon: UtensilsCrossed, name: 'Meal planner', desc: '...', timeSaved: '~3 hrs/week' },
   { icon: GraduationCap, name: 'Grade watcher', desc: '...', timeSaved: '~3 hrs/week' },
   { icon: Tag, name: 'Price watcher', desc: '...', timeSaved: '~2 hrs/week' },
   { icon: Mail, name: 'Email triage', desc: '...', timeSaved: '~4 hrs/week' },
   { icon: Receipt, name: 'Expense sorter', desc: '...', timeSaved: '~2 hrs/week' },
   { icon: Share2, name: 'Social poster', desc: '...', timeSaved: '~5 hrs/week' },
   ```
2. **SkillCardsSection.tsx:51-75** -- inside each card, after the description paragraph, add:
   ```tsx
   <styled.span fontSize="xs" fontWeight="600" color="primary" opacity={{ base: 1, md: 0 }}
     transition="opacity 0.2s ease" _groupHover={{ opacity: 1 }}>
     Saves {s.timeSaved}
   </styled.span>
   ```
   And add `className="group"` or Panda CSS `_hover` group pattern to the card container.
3. **SkillCardsSection.tsx:52** -- add to each card container: a top gradient accent line using a pseudo-element or a child Box: `<Box height="2px" background="linear-gradient(135deg, #623153 0%, #FFB876 100%)" marginBlockEnd={4} borderRadius="full" />` at the top of each card.
4. **SkillCardsSection.tsx:50** -- add stagger animation delay to each card: since this uses `.map()`, pass `style={{ animationDelay: '${i * 100}ms' }}` with `animation: staggerFadeIn 0.5s ease both` (requires client component or CSS approach)

### Keyframes to Apply
- `staggerFadeIn` (globals.css:177-186) -- staggered card entrance
- `bouncySelect` (globals.css:130-143) -- subtle bounce on card hover/click for interactive feel

---

## Section 7: Trust

**File:** `/src/widgets/landing/TrustSection.tsx`
**Current state:** 2-column layout. Left: "What we can see" / "What we can never see" checklist. Right: two trust blocks (Leave whenever, Delete everything). Bottom: founder narrative + GDPR + OCR explanation. Background `surfaceContainerLow`. Decorative gradient blur orb in top-right corner (line 13-23). Previous fake team claims have been removed.

### Visual Direction
- **Background:** `surfaceContainerLow` (#f4f3f1) -- the 3rd section using this bg. Change to `primary/3` (very faint mauve tint) for differentiation. This creates a subtle but noticeable warm undertone that connects to the brand without being heavy.
- **Layout:** Keep 2-column grid. The gradient blur orb (line 13-23) is a strong decorative element -- keep and make it slightly more visible (increase opacity from 0.08 to 0.12).
- **Card style:** The checklist items are plain text with Check/X icons. Consider wrapping the "What we can see" and "What we can never see" blocks in light card containers (`bg="surfaceContainerLowest"`, `borderRadius="lg"`, `padding={6}`) to visually frame them.
- **Animation:** Checklist items should stagger-enter. The trust blocks on the right should slide in from the right.

### Content Structure (in order)
1. **H2** (line 26): "Your stuff stays your stuff" -- keep, conversational and direct
2. **Left column:**
   - "What we can see" (3 items with green checks)
   - "What we can never see" (3 items with red X marks)
3. **Right column:**
   - "Leave whenever you want" trust block
   - "Delete everything in one click" trust block
4. **Bottom divider section** (lines 64-86):
   - Founder narrative: "Built by a founder who uses the same AI tools..."
   - "Refined every day since launch."
   - GDPR compliance line
   - OCR explanation: "Your screenshot is processed in your browser using OCR..."

### CTA Strategy
- No CTA in this section. It's a trust-building section that addresses objections. Correct.

### Mobile Behavior
- Grid stacks 1-col on base (line 30: `columns={{ base: 1, md: 2 }}`)
- Gap responsive: `gap={{ base: 8, md: 12 }}` -- already set
- The gradient blur orb may be partially visible/clipped on mobile -- fine, it's decorative

### Specific Changes
1. **TrustSection.tsx:9** -- change `bg="surfaceContainerLow"` to `bg="primary/3"` for warm mauve tint differentiation
2. **TrustSection.tsx:22** -- change `opacity={0.08}` to `opacity={0.12}` on the blur orb
3. **TrustSection.tsx:31-48** -- wrap the left column check/X lists in card containers:
   ```tsx
   <VStack bg="surfaceContainerLowest" borderRadius="lg" padding={6} ...>
   ```
4. **TrustSection.tsx:50-61** -- the right column trust blocks could benefit from subtle left-border accent (same pattern recommended for ProblemSection research card): `borderInlineStart="2px solid" borderInlineStartColor="primary/20"`
5. **TrustSection.tsx:73-85** -- the bottom "Built by a founder" section should be more visually prominent. Consider changing the `borderBlockStart="1px solid"` divider to a full-width gradient line: `background="linear-gradient(90deg, transparent, #623153, #FFB876, transparent)"` with `height="1px"`

### Keyframes to Apply
- `staggerFadeIn` (globals.css:177-186) -- checklist items stagger-enter
- `slideInFromRight` (globals.css:145-154) -- right column trust blocks entrance
- `meldarFadeSlideUp` (globals.css:3-12) -- bottom founder section entrance

---

## Section 8: Tiers / Pricing

**File:** `/src/widgets/landing/TiersSection.tsx`
**Current state:** 3-column grid of tier cards (Free / Starter EUR 9.99/mo / Build EUR 79). Middle card ("Starter") is highlighted with 2px border, shadow, and "Best starting point" badge. Background `surfaceContainerLow`. **NEEDS UPDATE:** Tier names and descriptions don't match the v2 revenue model (should be Free / Build EUR 79 / Bundle EUR 9.99/mo).

### Visual Direction
- **Background:** `surfaceContainerLow` -- this is the 4th use. Change to `surface` (#faf9f6) to differentiate. OR: use a subtle gradient: `background="linear-gradient(180deg, #faf9f6 0%, #f4f3f1 100%)"` for a soft shift.
- **Layout:** 3-column grid on md+, 1-col on base. Keep.
- **Card style:** Currently all three cards use the same white container with varying border treatment. DIFFERENTIATE:
  - **Free tier:** White card, outline border. Icon or illustration of a receipt/scan at the top.
  - **Build tier (highlighted, EUR 79):** Gradient border glow using the brand gradient. `boxShadow="0 8px 32px rgba(98,49,83,0.15)"`. This is the primary revenue driver -- make it visually dominant.
  - **Bundle tier (EUR 9.99/mo):** White card with a subtle `primary/5` background tint to differentiate from Free.
- **Animation:** Cards should fan-in from center (middle card first, then left and right with slight delay).

### Content Structure (in order)
1. **H2** (line 48): "Pick how deep you want to go" -- keep
2. **Subhead** (line 51): "Start free. Go further when you're ready." -- keep
3. **Three tier cards** -- UPDATE content to match v2 model:
   - **Free Analysis** (EUR 0): "Screenshot analysis + 1 app recommendation" -- CTA: "Start free"
   - **Build** (EUR 79, highlighted): "We build your first app. Working GitHub repo. 72-hour delivery. You own everything." -- CTA: "Get it built" -- Badge: "Most popular"
   - **Bundle** (EUR 9.99/mo): "Skills library + bundled AI APIs. One subscription covers everything." -- CTA: "Coming soon" or "Join waitlist"
4. **Pricing psychology reframes** (NEW, below cards): Small text under each card:
   - Free: "Because everyone deserves to know."
   - Build: "Less than a day of your time wasted on the problem this app solves."
   - Bundle: "One subscription. Every AI tool your app needs. Already set up."

### CTA Strategy
- **Free:** "Start free" -> href="/start" (primary path)
- **Build (highlighted):** "Get it built" -> href="/start" with query param `?tier=build` or dedicated build page
- **Bundle:** "Coming soon" or "Join waitlist" -> disabled or links to email capture
- The Build tier CTA should use the gradient background. Free and Bundle use outline style.

### Mobile Behavior
- Cards stack vertically on base. **Reorder on mobile** so the highlighted Build tier appears first (CSS `order` property): `order={{ base: -1, md: 0 }}` on the Build card.
- Cards already transition shadow on hover (line 71: `_hover={{ boxShadow: 'xl' }}`)

### Specific Changes
1. **TiersSection.tsx:4-41** -- rewrite the `tiers` array to match v2 revenue model:
   ```tsx
   const tiers = [
     {
       label: 'Free Analysis',
       headline: 'Free',
       desc: 'See where your time actually goes. Upload a screenshot and get a personalized report showing what to build first.',
       features: ['Screenshot analysis', '1 personalized app recommendation', 'Privacy-first: data never leaves your device'],
       cta: 'Start free',
       highlighted: false,
       psychology: 'Because everyone deserves to know.',
     },
     {
       label: 'Build',
       headline: 'EUR 79',
       desc: 'We build your first app. Working GitHub repo, Claude Code setup, agent config. 72-hour delivery. You own everything.',
       features: ['Handcrafted working app', 'GitHub repo you own forever', '72-hour delivery by the founder'],
       cta: 'Get it built',
       highlighted: true,
       psychology: 'Less than a day of your time wasted on the problem this app solves.',
     },
     {
       label: 'Bundle',
       headline: 'EUR 9.99/mo',
       desc: "Access Meldar's growing skills library plus bundled AI APIs. One subscription, one key, one bill.",
       features: ['Skills library access', 'Bundled AI APIs (image, video, voice)', 'New skills added monthly'],
       cta: 'Join waitlist',
       highlighted: false,
       psychology: 'One subscription. Every AI tool your app needs.',
     },
   ]
   ```
2. **TiersSection.tsx:45** -- change `bg="surfaceContainerLow"` to `bg="surface"`
3. **TiersSection.tsx:74-90** -- change the "Best starting point" badge text to "Most popular" for the Build tier
4. **TiersSection.tsx** -- after the features list, add the `psychology` text: `<styled.p fontSize="2xs" color="onSurfaceVariant" fontStyle="italic" marginBlockStart={4}>{tier.psychology}</styled.p>`
5. **TiersSection.tsx:68** -- for the highlighted (Build) card, change `boxShadow` from `"2xl"` to `"0 8px 32px rgba(98,49,83,0.15)"` for brand-tinted shadow

### Keyframes to Apply
- `staggerFadeIn` (globals.css:177-186) -- cards stagger entrance
- `pulseGlow` (globals.css:167-175) -- subtle glow pulse on the highlighted Build card border to draw attention

---

## Section 9: Early Adopter / Founding Members

**File:** `/src/widgets/landing/EarlyAdopterSection.tsx`
**Current state:** 4 perk cards in a 2-column grid + FoundingCounter + FoundingEmailCapture. Background `primary/4` (subtle mauve tint) -- the ONLY section currently using a brand-tinted background. Good differentiation. Perk cards use white bg with faint borders. Counter shows "X of 50 spots remaining". Email capture has 3 value-prop checkmarks.

### Visual Direction
- **Background:** `primary/4` -- keep. This is the strongest background differentiation on the page. Consider increasing to `primary/6` for more visual weight since this is the conversion-critical section.
- **Layout:** 2-column grid for perks, centered counter + email form below. Keep.
- **Card style:** Perk cards should feel more premium than generic white cards:
  - Add gradient icon backgrounds (same as Hero Track A card, line 62-63): `background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"` on the icon circles (currently `bg="surfaceContainerHigh"` at line 63)
  - Add a subtle `boxShadow="md"` to each card
- **Animation:** Cards should bounce-enter with `bouncySelect` animation. Counter should have `counterUp` animation. The email form should pulse glow after cards finish animating.

### Content Structure (in order)
1. **Label** (line 33): "Founding members" in `label.upper` style + primary color -- keep
2. **H2** (line 36): "We don't just give you a tool. We get you in." -- keep, strong
3. **Subhead** (line 39-41): "The biggest barrier to AI isn't the technology..." -- keep
4. **4 Perk cards** (2x2 grid):
   - 1-on-1 onboarding call (HandHelping) -- already specific per DESIGN_PLAN
   - Custom time audit report within 48hrs (Zap)
   - Weekly email: one automation tip (Mail)
   - Vote on next feature (Users)
5. **Founding counter** (FoundingCounter component): "X of 50 spots remaining" -- UPDATE: should be "X of 15 spots remaining" per v2 docs
6. **Email capture form** (FoundingEmailCapture component): email input + "Claim your spot" button + 3 value props

### CTA Strategy
- **Primary CTA:** "Claim your spot" button in email form -- gradient background, strong. Keep.
- **Urgency mechanism:** FoundingCounter (server component, line 6-28 of FoundingCounter.tsx). Currently 50 spots -- MUST change to 15 per v2 docs.
- The counter should be wrapped in `aria-live="polite"` for accessibility.

### Mobile Behavior
- Perk grid stacks 1-col on base (line 45: `columns={{ base: 1, md: 2 }}`)
- Email form already stacks vertically on base (FoundingEmailCapture.tsx line 42: `flexDir={{ base: 'column', sm: 'row' }}`)
- Counter + form are centered (`alignItems="center"`) -- works on all sizes

### Specific Changes
1. **EarlyAdopterSection.tsx:30** -- increase `bg="primary/4"` to `bg="primary/6"` for stronger visual weight
2. **EarlyAdopterSection.tsx:57-64** -- change icon circle background from `bg="surfaceContainerHigh"` to `background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"` and change icon `color` from `"#623153"` to `"white"` for contrast against gradient
3. **EarlyAdopterSection.tsx:46-75** -- add `boxShadow="md"` to each perk card VStack
4. **FoundingCounter.tsx:13** -- change `50` to `15`: `const spotsLeft = Math.max(0, 15 - memberCount)`
5. **FoundingCounter.tsx:24** -- change "50 spots remaining" to "15 spots remaining": `{spotsLeft} of 15 spots remaining`
6. **FoundingCounter.tsx:23-26** -- wrap in `aria-live="polite"`: `<styled.span aria-live="polite" ...>`
7. **EarlyAdopterSection.tsx:77-79** -- add a progress bar above the counter:
   ```tsx
   <Box width="200px" height="4px" bg="primary/10" borderRadius="full" overflow="hidden">
     <Box width={`${((15 - spotsLeft) / 15) * 100}%`} height="100%" background="linear-gradient(90deg, #623153, #FFB876)" borderRadius="full" />
   </Box>
   ```
   This requires passing spotsLeft data down -- may need to restructure or co-locate the counter + progress bar.

### Keyframes to Apply
- `bouncySelect` (globals.css:130-143) -- perk cards entrance animation
- `counterUp` (globals.css:119-128) -- counter number entrance
- `pulseGlow` (globals.css:167-175) -- subtle glow on the "Claim your spot" button after page settles

---

## Section 10: FAQ

**File:** `/src/widgets/landing/FaqSection.tsx`
**Current state:** Client component with accordion pattern. 9 FAQ items. Background `surface`. Heading is "Fair questions" (the DESIGN_PLAN flagged this as bland). Accordion uses `useState` with conditional rendering (no animation on open/close). ChevronDown icon rotates on toggle (line 89-90).

### Visual Direction
- **Background:** `surface` (#faf9f6) -- returning to light after the mauve-tinted Early Adopter section. Keep.
- **Layout:** Single-column, centered, max-width breakpoint-md. Keep -- FAQs don't need complex layout.
- **Card style:** FAQ items are borderless with only bottom dividers. This is clean and appropriate. The section doesn't need card containers.
- **Animation:** The FAQ heading should fade-in (handled by FadeInOnScroll wrapper). Individual FAQ items don't need entrance animation. But the **open/close** animation is missing -- currently it's a hard conditional render (line 97: `{openIndex === i && ...}`). Replace with height animation.

### Content Structure (in order)
1. **H2** (line 52): "Fair questions" -- change to something sharper: "You're wondering..." or "Questions people actually ask" or keep "Fair questions" if brand voice prefers understated
2. **9 FAQ items** (accordion):
   - Q1: "Do I need to know how to code?" -- A: No...
   - Q2: "What does it actually cost?" -- **NEEDS UPDATE**: currently says "$5-20/month + 5% fee" (line 14). Must match v2 model: "Free tier costs nothing. Build tier is EUR 79 one-time. Bundle is EUR 9.99/month."
   - Q3-Q6: existing questions -- fine
   - Q7-Q9: added in current version (data needed, who built this, is this a chatbot) -- good additions

### CTA Strategy
- No CTA. This is objection-handling. The user should scroll naturally to the Final CTA below.

### Mobile Behavior
- Already single-column with full width. Accordion works well on mobile.
- Touch targets: accordion buttons have `paddingBlock={5}` which provides good height. Verify meets 44px minimum.

### Specific Changes
1. **FaqSection.tsx:14** -- UPDATE Q2 answer: change from `'The Discover tier is free. When you start using AI to build things, most people spend $5\u201320 a month. We add a 5% fee on top. You see exactly what you pay for on every invoice.'` to `'The analysis is free, always. If you want us to build your first app, it\u2019s EUR 79 one-time \u2014 you own everything. The Bundle subscription (EUR 9.99/month) gives you access to the skills library and bundled AI APIs.'`
2. **FaqSection.tsx:97-102** -- replace conditional render with animated height transition. Change:
   ```tsx
   {openIndex === i && (
     <styled.div paddingBlockEnd={5}>
       <styled.p ...>{faq.a}</styled.p>
     </styled.div>
   )}
   ```
   To:
   ```tsx
   <styled.div
     overflow="hidden"
     maxHeight={openIndex === i ? '200px' : '0'}
     opacity={openIndex === i ? 1 : 0}
     transition="max-height 0.3s ease, opacity 0.2s ease"
     paddingBlockEnd={openIndex === i ? 5 : 0}
   >
     <styled.p textStyle="body.base" color="onSurfaceVariant">{faq.a}</styled.p>
   </styled.div>
   ```
   Note: `maxHeight` with a fixed value is fragile -- use a generous value (200px) or implement a ref-based height measurement. The simpler approach is `grid-template-rows` animation: `display="grid"` with `gridTemplateRows={openIndex === i ? '1fr' : '0fr'}` and `transition="grid-template-rows 0.3s ease"` with the content wrapped in `overflow="hidden"`.
3. **FaqSection.tsx:52** -- consider changing "Fair questions" to "Questions people actually ask"
4. **FaqSection.tsx:64** -- add `aria-controls={`faq-answer-${i}`}` to each button, and add `id={`faq-answer-${i}`}` to each answer panel for accessibility

### Keyframes to Apply
- No keyframes needed -- CSS transitions handle the accordion animation
- `meldarFadeSlideUp` (globals.css:3-12) -- section entrance handled by FadeInOnScroll wrapper

---

## Section 11: Final CTA

**File:** `/src/widgets/landing/FinalCtaSection.tsx`
**Current state:** Dark section (`inverseSurface` #2f312f) with centered H2 using `heading.display`, subhead, and a white CTA button. Decorative radial gradient blob at the top (line 14-24). H2: "Your data told Google everything. It's time it told you something useful." with pink accent on the second sentence (`#f5b3dc`). CTA: "Start here -- it's free" with white bg and primary color text.

### Visual Direction
- **Background:** `inverseSurface` (#2f312f) -- this matches the DataReceiptSection (section 5). Per the recommendation for section 5, change DataReceiptSection to dark mauve gradient. Keep FinalCTA as `inverseSurface` for visual bookending, or ALSO shift to dark mauve: `background="linear-gradient(180deg, #481b3c 0%, #2f312f 100%)"` (mauve fading to charcoal).
- **Layout:** Centered single-column. Keep -- this should be clean and focused.
- **Card style:** No cards. Just text and a CTA button. The simplicity is correct for a closing section.
- **CTA button:** Currently plain white (`background="white"`, `color="#623153"`). The DESIGN_PLAN flags this as inconsistent -- every other CTA uses the gradient. **However:** the inverted treatment (white button on dark bg) is actually effective for visual contrast. Consider a compromise: white button with gradient text (using `background-clip: text` if supported) or keep white but add a subtle border glow.
- **Animation:** The decorative blob should use `focusDrift1` for slow movement. The heading should use `blurReveal` for a dramatic final entrance.

### Content Structure (in order)
1. **Decorative radial gradient** (lines 14-24): centered at top, creates ambient glow. Keep.
2. **H2** (line 35-37): "Your data told Google everything. It's time it told you something useful." -- the second sentence uses `color="#f5b3dc"` (light pink/mauve). Strong. Keep.
3. **Subhead** (line 40): "30 seconds. One screenshot. No signup." -- keep
4. **CTA button** (lines 44-61): "Start here -- it's free" with ArrowRight icon

### CTA Strategy
- **Primary (and final) CTA:** "Start here -- it's free" -> href="/start"
- This is the last conversion opportunity. The button should be the most visually prominent CTA on the page.
- Consider changing to the gradient button treatment for consistency, or keep the white inverted style for the contrast argument. The gradient would look like: `background="linear-gradient(135deg, #FFB876 0%, #ffffff 100%)"` (warm peach to white) to differentiate from earlier gradient CTAs while still being distinctive.
- Add a `pulseGlow` animation to the button to draw attention.

### Mobile Behavior
- Content is centered and constrained (`maxWidth="breakpoint-md"`) -- scales well
- Padding is generous (`paddingBlock={40}`) -- may be too much on mobile. Add responsive: `paddingBlock={{ base: 24, md: 40 }}`
- CTA button text wraps fine on mobile

### Specific Changes
1. **FinalCtaSection.tsx:7-12** -- change `paddingBlock={40}` to `paddingBlock={{ base: 24, md: 40 }}` for better mobile proportions
2. **FinalCtaSection.tsx:9** -- change `bg="inverseSurface"` to `background="linear-gradient(180deg, #481b3c 0%, #2f312f 100%)"` for brand-connected dark mauve treatment
3. **FinalCtaSection.tsx:14-24** -- add subtle animation to the decorative blob: `style={{ animation: 'focusDrift1 20s ease-in-out infinite' }}` (globals.css:14-27). This requires adding `position="relative"` to ensure it works.
4. **FinalCtaSection.tsx:44-61** -- change the CTA button from white to gradient: `background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"` and `color="white"`. This makes it consistent with all other gradient CTAs. Remove the `_hover={{ opacity: 0.9 }}` and replace with `_hover={{ transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(98,49,83,0.3)' }}` for a lift effect.
5. **FinalCtaSection.tsx:44** -- add `style={{ animation: 'pulseGlow 3s ease-in-out infinite' }}` to the CTA button for attention
6. **FinalCtaSection.tsx:35** -- add `style={{ animation: 'blurReveal 0.8s ease both' }}` to the H2 for dramatic entrance (the FadeInOnScroll wrapper handles overall visibility, but blurReveal adds the extra deblur drama)

### Keyframes to Apply
- `blurReveal` (globals.css:188-197) -- heading entrance with blur-to-sharp transition
- `focusDrift1` (globals.css:14-27) -- slow ambient motion on the decorative gradient blob
- `pulseGlow` (globals.css:167-175) -- attention-drawing pulse on the CTA button

---

## Cross-Section Summary: Visual Rhythm

The 11 sections should create a deliberate visual rhythm of alternating backgrounds:

| # | Section | Background | Visual Energy |
|---|---------|-----------|---------------|
| 1 | Hero | `surface` (#faf9f6) | Clean, high-contrast headline |
| 2 | Problem | `surfaceContainerLow` (#f4f3f1) | Warm, grounded |
| 3 | Comparison | `surface` (#faf9f6) + blur orb | Light, analytical |
| 4 | How It Works | `surfaceContainerLow` (#f4f3f1) + gradient connector line | Structured, progressive |
| 5 | Data Receipt | **DARK**: gradient from #2f312f to #481b3c | **Peak drama** -- the "wow" moment |
| 6 | Skill Cards | `surface` (#faf9f6) | Light return, breathing room |
| 7 | Trust | `primary/3` (faint mauve tint) | Warm, trustworthy |
| 8 | Tiers | `surface` (#faf9f6) | Clean, decision-oriented |
| 9 | Early Adopter | `primary/6` (stronger mauve tint) | **Urgency** -- conversion push |
| 10 | FAQ | `surface` (#faf9f6) | Neutral, objective |
| 11 | Final CTA | **DARK**: gradient from #481b3c to #2f312f | **Closing drama** |

**Pattern:** Light > Light > Light > Light > DARK > Light > Warm > Light > Warm > Light > DARK

This creates two dark "bookend" moments (sections 5 and 11) with a warm crescendo leading into the Early Adopter conversion section (7-9).

---

## Cross-Section Summary: Animation Strategy

All animations must respect `prefers-reduced-motion` (already handled by globals.css:211-218).

| Technique | Where Used | Keyframe / Method |
|-----------|-----------|-------------------|
| **Fade-slide-up on scroll** | All sections via `FadeInOnScroll` wrapper (page.tsx:108-134) | FadeInOnScroll component uses IntersectionObserver + CSS transition |
| **Staggered entrance** | Pain points (S2), comparison rows (S3), steps (S4), skill cards (S6), perk cards (S9) | `staggerFadeIn` (globals.css:177-186) with per-item `animationDelay` |
| **Hero entrance** | Headline, subhead, CTAs (S1) | `meldarFadeSlideUp` (globals.css:3-12) with staggered delays |
| **Blur reveal** | Data Receipt card (S5), Final CTA heading (S11) | `blurReveal` (globals.css:188-197) |
| **Counter entrance** | "2,847" stat (S2), founding counter (S9) | `counterUp` (globals.css:119-128) |
| **Ambient motion** | Final CTA decorative blob (S11) | `focusDrift1` (globals.css:14-27) |
| **Attention pulse** | Build tier card (S8), Final CTA button (S11), email capture button (S9) | `pulseGlow` (globals.css:167-175) |
| **Accordion** | FAQ open/close (S10) | CSS `grid-template-rows` transition (no keyframe) |
| **Card hover** | Skill cards (S6), tier cards (S8) | `bouncySelect` (globals.css:130-143) or CSS `transform: translateY(-2px)` |
| **3D tilt** | Data Receipt card (S5) | CSS `perspective` + `rotateY` transform (no keyframe) |

### Implementation Note on Client Components
Several animations require client-side JavaScript (staggered delays based on index, intersection-based triggers). The current architecture uses:
- `FadeInOnScroll` (client component) for section-level scroll animation
- `FaqSection` is already a client component
- `FoundingEmailCapture` is already a client component
- `FoundingCounter` is a server component

For per-item stagger animations in server components (ProblemSection, ComparisonSection, HowItWorksSection, SkillCardsSection, EarlyAdopterSection), the options are:
1. **Convert to client components** -- simplest, but loses RSC benefits
2. **Use CSS-only stagger via nth-child** -- add a class and use `animation-delay` calculated via CSS `calc()` and `--index` custom property set inline. Example: `style={{ '--index': i } as React.CSSProperties}` with CSS `.stagger-item { animation-delay: calc(var(--index) * 150ms) }` in globals.css
3. **Create a `StaggerItem` client wrapper** -- minimal client component that accepts delay and wraps each item

**Recommendation:** Option 2 (CSS custom property) is the cleanest. Add to globals.css:
```css
.stagger-item {
  opacity: 0;
  animation: staggerFadeIn 0.5s ease both;
  animation-delay: calc(var(--stagger-index) * 150ms);
}
```
Then in server components, each mapped item gets: `style={{ '--stagger-index': i } as React.CSSProperties}` and `className="stagger-item"`. The parent `FadeInOnScroll` wrapper triggers visibility, but the stagger runs independently once the element is in the DOM. To combine both, the `FadeInOnScroll` wrapper could add a `data-visible` attribute, and the CSS could be `.stagger-item[data-visible] { animation: ... }`.

---

## Cross-Section Summary: Card Treatment Differentiation

The DESIGN_PLAN identifies card monotony as the biggest visual problem. Here's how each card type should differ:

| Card Type | Sections | Treatment |
|-----------|----------|-----------|
| **CTA card** | Hero (S1) | 2px primary border, gradient icon circle, hover border intensification |
| **Research stat card** | Problem (S2) | Gradient left-border accent, gradient overlay background, `boxShadow="lg"` |
| **Comparison table** | Comparison (S3) | Full-width with row hovers, `boxShadow="lg"`, no card per row |
| **Data Receipt card** | Data Receipt (S5) | Gradient header strip, 3D tilt perspective, brand-tinted shadow, white card on dark bg |
| **Skill card** | Skill Cards (S6) | Top gradient accent line (2px), hover reveals "time saved" stat, minimal border |
| **Trust block** | Trust (S7) | No card chrome for check/X lists (or light card wrapper), left-border accent on trust blocks |
| **Tier card** | Tiers (S8) | Highlighted card has gradient border glow + badge, others have outline borders |
| **Perk card** | Early Adopter (S9) | Gradient icon circles (not gray), `boxShadow="md"`, white on mauve-tinted bg |

---

## Priority Order for Implementation

### Phase 1: Content Fixes (ship before traffic)
1. Update FaqSection.tsx Q2 answer (line 14) -- pricing mismatch
2. Update TiersSection.tsx tier content -- v2 revenue model
3. Update FoundingCounter.tsx -- 50 -> 15 spots

### Phase 2: Visual Differentiation (biggest impact on monotony)
4. DataReceiptSection dark mauve background gradient
5. TrustSection `primary/3` background tint
6. EarlyAdopterSection `primary/6` background, gradient icon circles
7. SkillCardsSection top gradient accent lines + time-saved hover reveals
8. ComparisonSection column headers + box shadow
9. TiersSection card differentiation (highlighted card shadow, Build tier as primary)

### Phase 3: Animation (brings the page to life)
10. Hero staggered `meldarFadeSlideUp` entrance
11. CSS stagger items (custom property approach) for card grids
12. DataReceiptSection `blurReveal` entrance + stat `counterUp`
13. FinalCtaSection `blurReveal` heading + `pulseGlow` button + `focusDrift1` blob
14. FAQ accordion height animation (replace conditional render)
15. HowItWorksSection vertical gradient connector line

### Phase 4: Advanced Polish
16. Hero right-column Data Receipt mini-preview
17. DataReceiptSection 3D tilt perspective
18. HowItWorksSection step entrance stagger
19. FinalCtaSection gradient CTA button
20. ComparisonSection decorative blur orb
