# Visual Storyteller Review -- Phase 1 Features

## 1. Shareable Card Designs

The existing Time X-Ray card (`XRayCard.tsx`) establishes a strong pattern: gradient header strip (#623153 to #FFB876), warm cream body (#faf9f6), Bricolage Grotesque numbers, Inter labels, 440px max width, `xl` border radius. This is the "Meldar receipt" format. Each new tool should follow this structural skeleton but vary the content layout inside it.

### ChatGPT Conversation X-Ray Card

**Header strip:** Keep the Meldar gradient. Title: "YOUR CHAT X-RAY."
**Layout:** Single-column receipt, not the 2x3 grid used in the landing page `DataReceiptSection`. Conversations are narrative, not tabular.

Content rows, top to bottom:
- **Total conversations** (large number, Bricolage 2xl, right-aligned) with date range in `onSurfaceVariant` left-aligned
- Divider
- **Top 3 repeated topics** -- numbered list, each with conversation count in `primary` color. Example: "1. Python debugging -- 14 times"
- Divider
- **"Still unsolved" count** -- a single stat row. Left: "Topics you asked about 3+ times." Right: bold number in a warning-toned color (use `#D97706`, a warm amber that sits between the mauve and orange of the gradient -- not red, which feels punitive)
- Divider
- **Insight quote** in italic, same pattern as XRayCard: "You asked about meal planning 11 times but never got a working solution."
- Footer: "meldar.ai" left, "See your full report" right in `primary`

**Why not a unique visual language per tool:** Every card must be instantly recognizable as a Meldar artifact when screenshotted. A unified card shell (gradient header, cream body, meldar.ai footer) is the brand frame. The content inside varies, but the container is sacred. This is how Spotify Wrapped works -- every card looks like Wrapped, but the data is different.

### Subscription Autopsy Card

**Header strip:** Same Meldar gradient. Title: "YOUR SUBSCRIPTION AUTOPSY."
**Layout:** Financial data calls for a tighter receipt aesthetic -- closer to an actual paper receipt.

Content rows:
- **Monthly total** -- Bricolage 3xl, bold, `primary` color, centered. Example: "EUR 127.40/mo"
- **Yearly projection** -- smaller, below, in `onSurfaceVariant`. "EUR 1,528.80/year"
- Divider (dashed, like a receipt tear line -- `border-style: dashed`, `outlineVariant/20`)
- **Subscription list** -- left-aligned names, right-aligned monthly costs. Each row gets a status indicator:
  - Active + used: no indicator needed
  - Active + unused 30+ days: amber dot (#D97706)
  - Active + unused 90+ days ("zombie"): red-ish dot (#BA1A1A, already in the codebase for negative items in `TrustSection`)
- Divider (dashed)
- **"Zombie total"** -- a summary row. "Unused subscriptions: EUR 34.90/mo." Number in the warning amber.
- **Insight quote** in italic: "You've paid EUR 418 this year for apps you haven't opened."
- Footer: same as all cards

**Visual distinction from ChatGPT card:** The dashed dividers (vs solid) give it a transactional/receipt feel. The dot status indicators add a scan-and-spot pattern that makes the "waste" jump out visually without needing charts.

### Actionable Screen Time Card

This extends the existing `XRayCard` rather than replacing it. After the current X-Ray data, add a new section:

- Divider
- **"Your fix plan"** header in Bricolage, `primary` color
- 3 numbered steps, each with: a one-line action in `onSurface` bold, a one-line reason in `onSurfaceVariant`. Example: "1. Set Instagram daily limit to 45 min. -- You averaged 2.1h/day last week."
- These steps should feel like a prescription, not a lecture. Short, directive, specific.

The shareable version truncates to 2 steps + "See full plan at meldar.ai."

---

## 2. ADHD Mode Visual Treatment

### Guiding Principle

ADHD Mode is not a separate product or a disability label. It is an alternative sensory environment for anyone who finds the default UI overwhelming. The toggle should be as casual as dark mode -- no explanation required, no medical language, no "accessibility" framing that others the user.

### What Changes

**Color temperature:**
- Default surface #faf9f6 (warm cream) shifts to #f5f2ee (slightly warmer, lower contrast)
- Primary #623153 softens to #7a4a6a (10% lighter, less saturated) -- still recognizably mauve
- The gradient accent stays but drops opacity to ~70% so it feels like a glow rather than a beam
- Text contrast ratios must stay above WCAG AA (4.5:1 for body, 3:1 for large text) -- softer does not mean inaccessible

**Typography:**
- Body font size increases from the current `sm`/`base` to `base`/`lg` (roughly +2px)
- Line height increases from `relaxed` to `loose` (1.75 vs 1.625)
- Letter spacing on body text opens slightly: `0.01em`
- Headlines stay Bricolage but drop from `700` to `600` weight -- still bold, but less aggressive

**Density:**
- Padding on cards increases by ~25% (`padding: 8` becomes `padding: 10`)
- Gap between sections increases proportionally
- Fewer items visible at once -- if a list has 6 items, show 3 with a "Show more" rather than all 6

**Copy tone:**
- Same information, shorter sentences
- Replace urgency words ("right now", "immediately", "don't miss") with calming alternatives ("whenever you're ready", "take your time", "no rush")
- Replace exclamation marks with periods

### The GIFs / Ambient Elements

**Recommended style: Abstract slow-motion loops.** Not nature (too screensaver-y), not pixel art (too gamer-coded), not lava lamps (too novelty).

Think: soft gradient blobs that morph very slowly. Like the iOS wallpaper animations but at 0.2x speed. Or ink diffusing in water, shot from above. Or aurora borealis abstracted into two-tone washes of the Meldar palette (mauve fading into warm amber).

**Where they appear:**
- Behind form fields during multi-step flows (quiz, upload) -- as a CSS `background` on the container, not as a foreground element. The blob should be blurred (`filter: blur(80px)`) and at ~5-8% opacity so it is felt, not watched.
- On loading/processing states -- instead of a spinner, a slow breathing circle that expands and contracts (CSS animation, no GIF needed, `scale(1)` to `scale(1.05)` over 3 seconds, `ease-in-out`, infinite).
- NOT on results pages. Results need clarity. The ambient elements are for transitions and waiting moments.

**Implementation note:** Prefer CSS animations (`@keyframes`) and SVG filters over actual GIF files. GIFs are heavy, cannot match the color palette precisely, and introduce compression artifacts on the subtle gradients Meldar uses. A single `<div>` with `background: radial-gradient(...)` and a slow `transform: translate()` keyframe achieves the blob effect at zero network cost.

### How It Feels Different Without Being Othering

- The toggle is labeled "Calmer mode" or "Focus mode" -- not "ADHD Mode" in the UI. (The feature name "ADHD Mode" is internal/marketing only.)
- It lives in a settings panel alongside other preferences (dark mode, notification frequency), not in a special "accessibility" section.
- No tooltip or explanation attached. Dark mode doesn't explain why someone might want it. Neither does this.
- The transition between modes is a 300ms cross-fade, not a jarring switch. Everything eases into the new state.

---

## 3. The Discovery Hub Page (`/discover`)

### Current State

Currently `meldar.ai/discover` does not exist as a built page. The landing page hero offers two entry points (XRay upload and Pain Quiz). With four tools, this needs a dedicated hub.

### Recommended Layout: Card Grid with Progressive Disclosure

**Not tabs.** Tabs hide content and force the user to guess which tab has what they need. Our users are non-technical -- they need to see all options at once.

**Not a single scrolling page.** Four tools is not enough content for a long scroll. It would feel thin.

**A 2x2 card grid** on desktop, stacking to 1-column on mobile. Each card is a self-contained entry point:

```
+---------------------------+---------------------------+
|  [Icon]                   |  [Icon]                   |
|  Screen Time X-Ray        |  ChatGPT Conversation     |
|  "See where your hours    |  X-Ray                    |
|  actually go."            |  "What have you really    |
|  [Upload screenshot ->]   |  been asking AI?"         |
|                           |  [Upload export ->]       |
|  ~30 seconds              |  ~2 minutes               |
+---------------------------+---------------------------+
|  [Icon]                   |  [Icon]                   |
|  Subscription Autopsy     |  Pick Your Pain           |
|  "Find the apps eating    |  "15 seconds. Zero data.  |
|  your wallet."            |  Instant suggestions."    |
|  [Connect accounts ->]    |  [Start quiz ->]          |
|                           |                           |
|  ~3 minutes               |  ~15 seconds              |
+---------------------------+---------------------------+
```

**Card anatomy (following existing patterns from `HeroSection.tsx`):**
- `surfaceContainerLowest` background, `xl` border radius
- Border: `1px solid outlineVariant/20`, hover state: `primary/20`
- 40px icon circle with the Meldar gradient (same pattern as hero cards)
- Bricolage heading, Inter description
- Time estimate in `2xs` uppercase, `outlineVariant` color -- this is critical for the effort escalation funnel. Users self-select based on how much time they want to invest.
- CTA link in `primary` color with arrow icon

**Page header:**
- "Your Discovery Tools" in Bricolage, section heading size
- Subtitle: "Each one shows you something different. Start with whichever catches your eye."
- Below subtitle: a subtle horizontal line with the Meldar gradient (same treatment as the trust section separator)

**Order of cards (top-left to bottom-right, reading order):**
1. Screen Time X-Ray -- lowest effort, already proven
2. ChatGPT Conversation X-Ray -- new, curiosity-driven
3. Subscription Autopsy -- financial, slightly higher commitment
4. Pick Your Pain -- zero-data fallback, always available

**ADHD/Focus Mode variant:**
- Grid becomes 1-column with larger cards
- Each card shows only the headline and CTA, with description hidden behind a "Learn more" tap
- More breathing room between cards

---

## 4. Brand Consistency Across Tool Colors

### The Problem

Four tools could introduce four competing color identities:
- ChatGPT green (#10a37f)
- Subscription "money" blue or green
- Screen Time mauve (existing)
- ADHD pastels

This fragments the brand. The landing page currently has exactly one color story: mauve-to-orange gradient on cream. Everything reads as Meldar.

### The Solution: Meldar Mauve Is the Container. Tool Accents Are Interior Details.

**Rule: Every card, page, and header uses the Meldar gradient and mauve palette as the structural frame.** Tool-specific colors appear only as small interior accents -- icon fills, stat highlights, chart segments.

**Tool accent palette (all derived from the Meldar gradient spectrum):**

| Tool | Interior Accent | Rationale |
|------|----------------|-----------|
| Screen Time X-Ray | #623153 (mauve) | The original. Stays as-is. |
| ChatGPT X-Ray | #8B6914 (warm ochre) | Sits on the orange end of the Meldar gradient. Avoids ChatGPT's green entirely -- we are not OpenAI's brand. |
| Subscription Autopsy | #D97706 (amber) | Financial urgency without corporate blue. The "warning" color already natural to the gradient. |
| Pick Your Pain | #623153 (mauve) | Same as Screen Time. It's a quiz, not a tool with its own data output. |

**What we explicitly avoid:**
- ChatGPT green. Meldar is not a ChatGPT wrapper. Using their green makes us look derivative.
- Finance blue. Every fintech uses blue. Meldar is warm, not clinical.
- Any color outside the mauve-to-amber spectrum. The gradient is the brand. Stay inside it.

**ADHD/Focus Mode colors** are not a separate palette -- they are the same palette at reduced saturation and slightly shifted lightness. The hue remains recognizably Meldar.

---

## 5. The Viral Card

### Which tool produces the most screenshot-worthy output?

**Ranking by viral potential:**

**1st: Subscription Autopsy** -- "I'm paying EUR 127/month for apps I don't use" is the kind of statement that makes people screenshot, tag friends, and say "I need to check mine." Financial waste is universally relatable, mildly embarrassing, and actionable. It has the same energy as those "your Uber spend this year" screenshots that go viral on Twitter/X every December. The receipt-style card format is already optimized for this -- it looks like a bill, and bills shock people.

**2nd: Screen Time X-Ray** -- Already proven with the existing implementation. "7.2 hours/day" is a confrontational number. But it has diminishing novelty -- Apple shows this natively now, so the shock factor has faded since 2018.

**3rd: ChatGPT Conversation X-Ray** -- "You asked about Python debugging 47 times" is funny and self-aware, but it appeals to a narrower audience (people who use ChatGPT heavily). Within that audience, it is extremely shareable -- tech Twitter/X would love it.

**4th: Pick Your Pain** -- Quiz results are shareable ("I'm a Chronic Tab Hoarder") but they lack the data shock factor. Quizzes drive engagement through participation, not through output sharing.

### Recommendation for Maximum Virality

**Lead with Subscription Autopsy for social media marketing.** Design the card to be portrait-oriented (1080x1350, Instagram-native), with the monthly waste total as the hero number in Bricolage 4xl. Include a "Get your own Subscription Autopsy free at meldar.ai" footer.

**For OG/Twitter cards** (1200x630 landscape), keep the existing X-Ray format but add a second card variant for Subscription Autopsy with the monthly total as the dominant visual element.

The ideal viral loop: User gets their Subscription Autopsy -> screenshots the card -> posts "I can't believe I'm paying EUR 127/mo for zombie apps" -> friends click through to meldar.ai/discover -> they start with Screen Time X-Ray (lowest friction) -> they try Subscription Autopsy next -> they share their own card.

---

## 6. Questions for QA

1. **Focus Mode toggle persistence:** If a user enables Focus Mode and then returns in a new session, does the preference survive? Should it use `localStorage` (same pattern as cookie consent), or should it require an account to persist? If `localStorage`, what is the key name, and does clearing cookies/storage reset it?

2. **Subscription Autopsy data source:** The card design assumes structured subscription data (name, monthly cost, last-used date). What is the actual data input -- bank CSV upload? Email receipt scanning? Manual entry? The card layout depends on whether we have precise "last opened" dates (which produce the zombie classification) or only billing data (which only shows cost, not usage).

3. **ChatGPT export format stability:** ChatGPT's export format (the JSON from Settings > Data Controls > Export) has changed structure at least twice. Is there a validation/parsing layer that handles format variations, or does the card design need to account for partial/missing data fields (e.g., no conversation titles in older exports)?

4. **Shareable card rendering:** The existing X-Ray uses `next/og` ImageResponse for OG cards. Will the new tools follow the same server-rendered approach, or is there a plan for client-side canvas/SVG rendering (which would allow animated cards, but adds bundle size)? This affects whether the card designs can include visual elements beyond what `next/og` supports (it does not support CSS animations, blur filters, or custom fonts without explicit registration).

5. **Focus Mode and screen readers:** The visual changes (softer colors, larger text, more spacing) are purely aesthetic. But the copy changes ("whenever you're ready" vs "right now") alter the information hierarchy. Should screen reader users get Focus Mode copy by default, or should the copy variant be independent of the visual toggle? WCAG does not require calmer language, but it would be a meaningful UX choice to separate the two concerns.
