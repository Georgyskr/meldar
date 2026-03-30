# PM Analysis: Kill the Quiz, Rethink the Entry Funnel

**Date:** 2026-03-30
**Author:** Product Analysis
**Status:** Recommendation for founder review

---

## Executive Summary

The quiz is dead weight. It should be killed. But the problem it was trying to solve -- "what do I even do with this?" -- is real and critical. The replacement isn't another quiz. It's a two-track entry that matches what the founder already intuited: let people who know what they want start immediately, and show people who don't know what they want their own real data.

---

## 1. Is the Quiz a Proper Funnel Entry Point?

**No. The quiz is a conversion killer.**

Here's why, broken down honestly:

### What the quiz actually does

1. User picks 2-5 tiles from 12 pre-baked pain points (email chaos, meal planning, etc.)
2. Math: `picks.reduce((sum, p) => sum + parseFloat(p.weeklyHours))` -- literally adds up hardcoded strings like "~4 hrs/week"
3. Shows a fabricated total: "~12 hrs/week you could get back"
4. Lists pre-written `automationHint` strings per selection
5. Links to `/xray` (Screen Time screenshot upload)

### Why it fails

**The numbers are fiction.** The `weeklyHours` field is a static string per pain point. Picking "Email chaos" always yields "~4 hrs/week" whether you're a CEO getting 200 emails/day or a student checking once. The total is a sum of made-up constants. Users can smell this. Gen Z especially -- they grew up with BuzzFeed quizzes and know when they're being played.

**The suggestions are generic.** `automationHint` is a one-liner like "Auto-sort by importance, draft replies, mass unsubscribe." This is what ChatGPT gives you if you ask "how can I fix my email." Zero personalization. Zero "aha moment."

**It creates no investment.** Picking tiles is 15 seconds of work. There's no emotional stake. Compare this to uploading a Screen Time screenshot (real data, real vulnerability) or describing a specific frustration in their own words (identity commitment).

**It gates the real value behind another step.** After the quiz, the CTA says "Get your real Time X-Ray" linking to `/xray`. The quiz is literally an extra step between the user and the thing that actually delivers value. It's friction disguised as engagement.

**The conversion path is broken anyway.** The `/xray` route doesn't exist in the app router. The Screen Time upload at `api/analyze-screenshot` is a mock endpoint. Even if someone completes the quiz and clicks through, they hit a dead end.

### The damning comparison

The quiz was designed as Step 1 in the "Effort Escalation Funnel":

| Step | Effort | Value Delivered |
|------|--------|----------------|
| Quiz (15 sec) | Zero data shared | Fake numbers, generic tips |
| Screen Time screenshot (30 sec) | Real data | Real app breakdown (if API worked) |
| Google Takeout (3 min) | Real data | Real Time X-Ray |
| Chrome extension (ongoing) | Full trust | Live tracking |

The quiz is the only step that gives fake value for zero input. Every other step exchanges real effort for real insight. The quiz is a horoscope in a funnel of medical scans.

**Verdict: Kill it.**

---

## 2. What Should the Entry Funnel Look Like for This Audience?

### Understanding the audience

Gen Z, 18-28. Uses ChatGPT daily. Has tried AI tools and failed. Wants AI for their specific life. Key psychological profile:

- **Low patience.** If value isn't visible in 30 seconds, they leave.
- **High BS detection.** Grew up with influencer marketing and "10 AI tools that will change your life" threads. They know when they're being sold to.
- **Specific, not general.** They don't want "AI can help you be more productive." They want "AI can watch your grade portal and text you when your calc grade posts."
- **Show, don't tell.** They need to SEE it work, not read about how it works.
- **Fear of looking stupid.** They've failed before. The entry point can't feel like another thing they'll fail at.

### The two mental states at landing

Every visitor arrives in one of two states:

**State A: "I know what I want."** They have a specific frustration. They've been copy-pasting expenses into a spreadsheet every week, or they're tired of reformatting the same content for 4 social platforms. They don't need discovery -- they need a path to the solution.

**State B: "I don't know what I'd even use this for."** They're curious but have no specific problem in mind. They need discovery. But the discovery must be grounded in THEIR real data, not a horoscope.

### The right funnel: Two tracks from one entry point

The landing page hero should present both paths without forcing a choice:

**Track A -- "I know what bugs me"**
A single text input: "What wastes your time? Tell us in a sentence."

- "I copy-paste expenses from my email into a Google Sheet every Friday"
- "I check my university grade portal 10 times a day"
- "I spend 30 minutes every Sunday planning meals"

User types a sentence. Meldar responds in real-time with a concrete preview: "Here's what your personal app would look like." This is Lovable's prompt-first approach, but reframed from "what do you want to build?" (scary, technical) to "what annoys you?" (safe, emotional).

This works because:
1. It's a frustration, not a feature request. No technical knowledge required.
2. The response is personalized -- it literally addresses their words.
3. It creates commitment (they typed something personal) before asking for email.
4. It proves the product works in 30 seconds.

**Track B -- "Show me my data"**
A clear path to the Time X-Ray, but without the quiz gate.

Option 1: Screen Time screenshot upload (30 sec, works today if the API is real)
Option 2: Google Takeout walkthrough (3 min, higher value)

The key insight: Track B should NOT be gated behind Track A. The current funnel forces quiz -> screenshot upload -> Takeout. But someone who is willing to upload their Screen Time screenshot has already self-selected as high-intent. Don't make them pick tiles first.

### What the quiz was trying to do (and the right way to do it)

The quiz served as a micro-commitment device. "Pick some tiles" feels easy and creates the consistency principle: "I identified my problems, now I should seek the solution." This psychology is sound. The execution is wrong.

The replacement micro-commitment is the text input. Typing "I hate planning meals every week" is a stronger commitment than clicking a tile, because:
- It's in their own words (identity investment)
- It's specific to their life (not a generic category)
- It takes marginally more effort (the Ikea effect)
- It gives Meldar actually useful data for personalization

---

## 3. Should We Kill, Fix, or Replace the Quiz?

**Kill it. Replace it with a prompt-first entry.**

### Why not fix it?

You could theoretically make the quiz better:
- Use real data ranges instead of hardcoded strings
- Add follow-up questions to narrow the estimate
- Personalize the automation hints based on combinations

But this polishes the wrong thing. The fundamental problem isn't that the quiz is poorly executed. It's that the quiz is the wrong interaction pattern for this product and audience.

The quiz assumes the user doesn't know what's wasting their time and needs a menu to pick from. But the 12 categories in the pain library are Meldar's guesses about what wastes people's time. The product's entire value proposition is that it discovers this from the USER'S data. A quiz that presents pre-baked categories contradicts the core positioning.

### Why replace with a prompt input?

| Dimension | Quiz (current) | Prompt input (proposed) |
|-----------|---------------|------------------------|
| Personalization | Zero (same output for everyone who picks the same tiles) | High (responds to their specific words) |
| Data quality for Meldar | Categories selected (low signal) | Natural language frustration (high signal) |
| User investment | Clicking tiles (low) | Writing a sentence (medium) |
| Time to value | ~60 sec to fake results | ~15 sec to real preview |
| BS detection risk | High (fabricated numbers) | Low (responding to their actual input) |
| Consistency with brand | Contradicts "we discover, not you" | Aligns with "tell us what bugs you, we fix it" |

---

## 4. Fastest Path from Stranger to Personal Value

The current path: Land -> scroll -> maybe find quiz -> pick tiles -> see fake numbers -> click through to dead-end upload page. **Time to personal value: never** (because the numbers are fake and the upload API is a mock).

### The proposed path (fastest achievable with current tech)

**10 seconds:** User types a frustration into the hero input.

**15 seconds:** Meldar shows a personalized response. Not a generic card -- a specific preview of what their personal app would do. "Your Meal Planner would: check what's in your fridge (you tell it on Sunday), generate 5 dinners for the week, create a grocery list sorted by store aisle, text you the list at 10am Monday." This can be generated by an LLM call or, for MVP, pattern-matched from a library of detailed templates keyed to intent categories.

**30 seconds:** Below the preview, the CTA: "Want this? Drop your email and we'll set it up for you." The email capture is contextual -- they're not signing up for "early access," they're signing up for THIS SPECIFIC THING they just described.

**Total time to personal value: 30 seconds.**

### The secondary path (for Track B users)

**10 seconds:** User clicks "See your Time X-Ray" (prominent secondary CTA on hero).

**30 seconds:** Upload Screen Time screenshot.

**60 seconds:** Vision AI extracts real app usage, shows personalized report.

**90 seconds:** Report suggests the top 3 automations based on their actual app usage. Email capture: "Want us to build #1?"

**Total time to personal value: 90 seconds.**

### What blocks this today

1. **The prompt-to-preview flow doesn't exist.** Building this requires either: (a) a real-time LLM call that takes a user's frustration and generates a preview, or (b) a pattern-matching system that maps intents to detailed templates. Option (b) is the MVP.

2. **The Screen Time analysis API is a mock.** `api/analyze-screenshot/route.ts` needs to call Claude Vision. This is the highest-leverage engineering investment because it converts a 30-second user action into genuinely personalized output.

3. **The `/xray` route doesn't exist.** The quiz results link to it, but there's no page at that path.

### Minimum viable funnel (buildable in a week)

1. Replace quiz page with a single text input + template-matched response
2. Wire up Screen Time screenshot API to Claude Vision
3. Create `/xray` page that hosts the screenshot upload
4. Add email capture after both tracks deliver personal value

---

## 5. How Competitors Handle the Cold-Start Problem

Every AI-builder product faces the same problem: the user lands with a blank prompt and no idea what to type. Here's how each handles it:

### Lovable: Template gallery
- Shows 8+ pre-built templates (portfolio, blog, ecommerce, event planner)
- "Discover apps" section shows community-built projects
- User clicks a template and it pre-fills the prompt
- **Strength:** Reduces blank-prompt anxiety to zero
- **Weakness:** Still requires the user to know they want "a portfolio site"

### Bolt.new: Example prompts + design system import
- Shows concrete example prompts: "Build a movie streaming web app"
- Lets users import from Figma or GitHub (brings their existing work)
- Design system templates (Shadcn, Material UI) as starting scaffolds
- **Strength:** Multiple entry points for different knowledge levels
- **Weakness:** Examples are developer-oriented, not life-problem-oriented

### Replit: Quick-start template buttons
- Category buttons: Website, Mobile, Design, Slides, Animation, Data Viz, 3D Game
- Example prompts: "B2B project management app," "Freelance client portal"
- **Strength:** Broadest category coverage
- **Weakness:** Overwhelming number of options

### Lindy.ai: Structured framework + 50 templates
- Ask > Act > Anticipate framework (interactive tabs)
- 50+ pre-built agent templates by use case
- Agent Builder creates from natural language description
- **Strength:** Best "what does this actually do?" communication
- **Weakness:** Still assumes professional/business context

### Sintra.ai: Named AI characters
- 12 named AI "Helpers" with specific roles (copywriter, sales manager)
- 90+ "Power-Ups" as pre-built automations
- **Strength:** Makes AI feel like people, not tools. Reduces intimidation.
- **Weakness:** Character-based framing may feel gimmicky to some

### What Meldar should steal (and what it shouldn't)

**Steal from Lindy:** The outcome-first framing. "Get two hours back every day" is the strongest cold-start headline because it answers "what's in it for me?" before asking "what do you want?" Meldar's "What eats your time?" is close but the quiz ruins the delivery.

**Steal from Lovable/Bolt:** Clickable example prompts that pre-fill the input. Not templates (too technical) but example frustrations: "I waste 30 min/day on email," "I check prices on 5 sites every morning," "I reformat the same post for 4 platforms."

**Steal from Sintra:** The personality angle. Naming Meldar's discovery engine (e.g., "Scout") makes AI feel like a helpful friend, not a scary tool. This matters enormously for the scared audience.

**Don't steal:** Template galleries (too technical for this audience), design system imports (irrelevant), feature matrices (nobody reads them).

### Meldar's unique advantage

None of these competitors offer discovery. They all assume you know what you want. Meldar's unfair advantage is saying: "You don't need to know. Show us your data. We'll tell you."

The quiz was supposed to be the entry point for this discovery. The replacement should be the Time X-Ray itself -- but with lower friction entry points (screenshot upload, a simple prompt).

---

## 6. MVP Funnel That Validates Willingness to Pay

### What we need to validate

1. Will people describe their frustrations to a text input? (engagement)
2. Will they give us their email after seeing a personalized preview? (conversion)
3. Will they pay for the automated solution? (revenue)

### The funnel

```
Hero
  |
  +-- [Track A] Type your frustration -----> Personalized preview -----> Email capture
  |                                                                         |
  +-- [Track B] Upload Screen Time --------> Real Time X-Ray -----------> Email capture
                                                                            |
                                                                   Welcome email with:
                                                                   - "Your app is being built"
                                                                   - Personal Time Audit (first 50)
                                                                   - Weekly progress email
                                                                            |
                                                                   DM/email: "Your app preview is ready"
                                                                            |
                                                                   Stripe payment link ($5-20 to activate)
```

### Pricing validation approach

Don't show 3 tiers to cold traffic. The current TiersSection creates decision paralysis and sticker shock ("From $200" with no anchoring).

Instead:
1. **Free:** Time X-Ray (the diagnostic). This is the hook.
2. **Paid:** "We'll build your first automation for $X." Single price, single CTA.

The question to answer is: after someone sees their personalized preview or Time X-Ray, will they pay $5-20 for Meldar to actually build the automation?

### Metrics to track

| Metric | What it validates | Target |
|--------|-------------------|--------|
| % who type a frustration | Product-market fit of the entry point | >15% of visitors |
| % who submit email after preview | Value of personalized response | >30% of those who typed |
| % who upload Screen Time screenshot | Trust + data willingness | >5% of visitors |
| % who open welcome email | Email deliverability + interest | >60% |
| % who respond to "your app is ready" | Willingness to engage deeper | >20% of email subscribers |
| % who pay | Revenue validation | >5% of engaged subscribers |

### The "Founding 50" validation play

The competitive analysis already identified this: offer the first 50 signups a concierge experience.

- Personal Time Audit (founder does it manually)
- Hand-built first automation
- Direct access to founder via DM
- Weekly updates on what's being built

This doesn't scale, but it doesn't need to. It validates:
- Whether people's frustrations are actionable (can Meldar actually solve them?)
- Whether the Time X-Ray creates enough "aha" to drive payment
- What the most common frustrations are (informs the template library)
- Whether "we build it for you" is the right positioning vs. "we help you build it"

---

## Recommendations: What to Build Next

### Immediate (this week)

1. **Kill `/quiz` route.** Remove from sitemap, remove from nav, remove the page.
2. **Add a frustration input to the hero.** Replace or supplement the email capture with: "What wastes your time? Tell us in one sentence." Below the input, show 3-4 clickable example frustrations.
3. **Wire Screen Time API to Claude Vision.** This is the single highest-leverage engineering task. It turns a 30-second user action into genuinely personalized output.
4. **Create `/xray` page.** Host the ScreenTimeUpload component there, plus a Google Takeout walkthrough.

### Next sprint

5. **Build prompt-to-preview pipeline.** Take the user's typed frustration, match it to a template or run it through an LLM, show a personalized "here's what your app would do" preview.
6. **Add email capture AFTER value delivery.** Not in the hero (too cold), not on a separate page (too far). Right below the personalized preview/X-Ray result.
7. **Implement Founding 50 mechanics.** Waitlist counter, personal audit promise, founder DM channel.

### What to preserve from the quiz

- The `painLibrary` data is still useful -- as clickable example prompts that pre-fill the frustration input, not as quiz tiles.
- The `ScreenTimeUpload` component is well-built and just needs a real API backend.
- The "What eats your time?" headline is good. Keep it, just change what follows it.

---

## Honest Challenges to the Founder's Instinct

The founder's instinct is directionally right but has two blind spots:

### Blind spot 1: "Let them start building immediately" assumes readiness

The founder says if users KNOW what to build, let them start immediately. But "knowing what you want" and "being ready to build" are different states. A user might know "I want a meal planner" but still freeze at "okay, now what?" The prompt-to-preview flow bridges this gap. Meldar takes the intent and does the work. The user never "builds" -- they describe and approve.

The word "build" should be eliminated from all user-facing copy. It's a threat word for this audience. Replace with "set up," "create," "get."

### Blind spot 2: Data extraction requires trust that hasn't been earned

The founder says if users DON'T know what to build, extract real data from Google Takeout, Screen Time, etc. This is the right long-term play but requires trust that a cold visitor hasn't given yet. Nobody uploads their Google Takeout to a website they landed on 30 seconds ago.

The effort escalation principle was right in concept:
1. Zero-effort entry (a sentence about your frustration)
2. Low-effort data (Screen Time screenshot)
3. Medium-effort data (Google Takeout)
4. High-effort data (Chrome extension)

The quiz was the wrong zero-effort entry. A text prompt is the right one. But the escalation ladder from prompt -> screenshot -> Takeout -> extension must be preserved. Each step delivers more value and earns more trust for the next.

---

## TL;DR

| Question | Answer |
|----------|--------|
| Is the quiz dead weight? | Yes. Kill it. |
| What replaces it? | A text input ("What wastes your time?") + clickable example frustrations + personalized preview |
| Two-track funnel? | Track A: type frustration -> preview -> email. Track B: upload screenshot -> X-Ray -> email |
| Fastest path to value? | 30 seconds (type frustration -> see personalized preview) |
| How to validate WTP? | Founding 50 concierge offer. Manual delivery. $5-20 for first automation. |
| What to build this week? | Kill quiz, add frustration input, wire Screen Time API, create /xray page |
