# AI Capabilities for Multi-Screenshot Time X-Ray

## Current State

Meldar currently sends a **single** Screen Time screenshot to Claude Haiku 4.5 Vision via tool use. The model extracts app names, usage minutes, categories, pickups (if visible), and date. Insights and upsells are generated with rule-based logic (zero additional AI cost). This works, but only captures what one screenshot shows.

iOS Screen Time actually has **4 distinct scrollable sections**, each requiring a separate screenshot to capture fully:

| # | Section | What it shows |
|---|---------|--------------|
| 1 | Screen Time (main) | Daily average, category bar chart, top apps with times |
| 2 | Most Used | Full ranked app list with usage durations |
| 3 | Pickups | Total pickup count, first app after each pickup, pickup frequency chart |
| 4 | Notifications | Notification count per app, total notifications |

---

## 1. Multi-Image Analysis

### Can Claude process 2-4 screenshots in a single API call?

**Yes.** The Claude Messages API accepts multiple `image` content blocks in a single user message. Each image is a separate content block within the same `content` array. There is no limit of one image per request -- Claude vision models support many images in a single turn.

**Example structure (pseudocode):**
```ts
messages: [{
  role: 'user',
  content: [
    { type: 'image', source: { type: 'base64', media_type: 'image/png', data: screenshot1 } },
    { type: 'image', source: { type: 'base64', media_type: 'image/png', data: screenshot2 } },
    { type: 'image', source: { type: 'base64', media_type: 'image/png', data: screenshot3 } },
    { type: 'image', source: { type: 'base64', media_type: 'image/png', data: screenshot4 } },
    { type: 'text', text: 'Extract all data from these 4 iOS Screen Time screenshots...' }
  ]
}]
```

### Cost per multi-image call

Claude vision pricing is based on **input tokens consumed by images**. Image token count depends on resolution. A typical iPhone screenshot (1170x2532 on iPhone 14/15) is approximately:

| Scenario | Images | Estimated image tokens | Text input/output tokens | Estimated cost (Haiku 4.5) |
|----------|--------|----------------------|--------------------------|--------------------------|
| Current (1 screenshot) | 1 | ~1,600 | ~800 | ~$0.002-0.003 |
| Full X-Ray (4 screenshots) | 4 | ~6,400 | ~1,200 | ~$0.008-0.012 |
| 2 screenshots (main + most used) | 2 | ~3,200 | ~1,000 | ~$0.004-0.006 |

**Haiku 4.5 pricing:** $0.80/M input tokens, $4/M output tokens.

Image tokens scale roughly linearly with pixel count up to a cap. Screenshots are resized internally -- a 1170x2532 iPhone screenshot gets tiled into roughly 1,600 tokens per image. Four screenshots: ~6,400 image tokens + system prompt + tool schema + output = roughly 10K-12K total tokens.

**Bottom line:** A 4-screenshot analysis costs **4x the image input** but only **1x the system prompt and tool schema overhead**. Going from $0.003 to $0.01 per analysis is negligible at early scale. At 10K analyses/month, it's $100 vs $30 -- still very manageable.

---

## 2. What Can AI Extract from Each Section?

### Screenshot 1: Screen Time (Main View)

**Extractable data:**
- Daily average screen time (e.g., "4h 23m")
- Category breakdown bar chart (Social, Entertainment, Productivity, etc.) with approximate percentages
- Top 3-5 apps with exact usage times
- Date or date range displayed
- Week-over-week trend arrow (up/down/flat) if visible

**Extraction confidence:** High. This is the cleanest view with large text and clear layout.

**Current coverage:** This is what Meldar extracts today. The existing prompt and tool schema handle it well.

### Screenshot 2: Most Used

**Extractable data:**
- Full ranked list of ALL apps with usage times (often 15-30+ apps vs top 5 on main view)
- Per-app category icons (system-assigned)
- Potentially daily breakdown if user has "Show Categories" toggled

**Extraction confidence:** High for top apps; medium-to-low for apps below the fold if user doesn't scroll fully before screenshotting. Names and times are in a clean list format.

**New value:** This is the biggest unlock. The main view only shows top 5 apps. The "Most Used" list can reveal 20+ apps, exposing patterns invisible in the summary -- the user spending 22 minutes on a delivery app, 18 minutes on a dating app, 15 minutes on a news app. These smaller-but-meaningful apps are where personalized suggestions get sharp.

### Screenshot 3: Pickups

**Extractable data:**
- Total pickup count (e.g., "78 pickups")
- Pickup frequency chart (hourly distribution -- when during the day)
- "First Used After Pickup" ranked app list with counts
- Average pickups per hour (calculated or shown)
- Comparison to previous period if visible

**Extraction confidence:** High. The layout is straightforward -- a number, a bar chart, and a list.

**New value:** "First used after pickup" is behavioral gold. It reveals the reflex app -- the one the user opens without thinking. This is different from "most used." Someone might use Notion for 2 hours intentionally but open Instagram reflexively 15 times. The distinction between **intentional use** and **compulsive habit** lives in this screenshot.

### Screenshot 4: Notifications

**Extractable data:**
- Total notification count (e.g., "234 notifications")
- Per-app notification counts ranked
- Notification frequency chart (hourly distribution)
- Comparison to previous period if visible

**Extraction confidence:** High. Same clean list format as Most Used.

**New value:** Notifications reveal **interruption patterns**. Apps that send many notifications but get little usage are pure distraction. Apps with high usage but low notifications are intentional choices. This ratio is not available from any single screenshot.

---

## 3. Cross-Section Insights (The Real Unlock)

With all 4 sections combined, Meldar can compute **derived metrics** that no individual screenshot reveals:

### 3.1 Notification-to-Usage Ratio

```
Telegram: 178 notifications/day, 11 min usage → ratio 16.2 (interrupt-heavy)
Instagram: 12 notifications/day, 94 min usage → ratio 0.13 (self-driven)
YouTube: 3 notifications/day, 127 min usage → ratio 0.02 (pure consumption)
```

**Insight:** "Telegram interrupts you 16x per minute of actual use. You're paying attention tax on an app you barely use."

**Actionable output:** Suggest notification silencing, scheduled check-ins, or a Meldar-built notification digest.

### 3.2 Reflex vs. Intentional Use

```
Instagram: first-after-pickup 17 times, total usage 94 min → reflex-driven
Notion: first-after-pickup 0 times, total usage 45 min → intentional
Safari: first-after-pickup 8 times, total usage 62 min → mixed
```

**Insight:** "You open Instagram on reflex -- 17 out of 78 pickups (22%). That's not a choice, it's a habit loop."

**Actionable output:** Suggest screen time limits, app rearrangement, or a Meldar-built "phone unlock challenge."

### 3.3 Productivity Ratio

```
Productive apps (Notion, Slack, Calendar): 112 min (26%)
Consumption apps (Instagram, YouTube, TikTok): 247 min (58%)
Utility (Maps, Weather, Settings): 68 min (16%)
```

**Insight:** "For every hour of productive phone use, you consume 2.2 hours of social media."

### 3.4 Interruption Cost

```
Total pickups: 78
Average time between pickups: 12 min (during waking hours)
Total notifications: 234
Notifications that likely triggered pickups: estimated 40-60%
```

**Insight:** "You're interrupted roughly every 12 minutes. Research shows it takes 23 minutes to refocus after an interruption. Your phone fragments your entire day."

### 3.5 The "Silent Killer" Pattern

Apps with moderate usage (20-40 min) that don't show up in top 5 but collectively add up:
```
Reddit: 28 min
News app: 22 min
Shopping app: 18 min
Food delivery: 15 min
Dating app: 12 min
Total "invisible" usage: 95 min (1.5 hours!)
```

**Insight:** "Your top apps get all the attention, but 5 'small' apps quietly eat 1.5 hours of your day."

This pattern is **only visible with the Most Used full list** (Screenshot 2).

---

## 4. Adding User Context (Role/Goals)

### How context changes the prompt

Currently, the prompt is generic: "Extract screen time data." With user context, we can shift from extraction to **interpretation**.

**Modified prompt structure:**
```
SYSTEM: You are a personal productivity analyst. The user is a {role} whose goals include {goals}.
Analyze their screen time data and provide insights calibrated to what matters for their specific situation.
```

**Examples of context-calibrated insights:**

| User context | Raw data | Generic insight | Contextual insight |
|-------------|----------|----------------|-------------------|
| "CS student, exam next week" | 3h YouTube, 2h Instagram | "5h on entertainment" | "You spent 3h on YouTube during exam prep. Was it study content or distraction? If study, we can build a focused playlist filter." |
| "Job hunting" | 45m LinkedIn, 2h gaming | "Moderate LinkedIn use" | "45 minutes on LinkedIn but 2 hours gaming -- during active job search, that ratio might be worth flipping." |
| "Freelance designer" | 2h Figma, 1h Instagram | "High social media" | "1h on Instagram could be client research or doom-scrolling. If it's research, we can build a visual mood board collector." |
| "Parent of toddler" | 1h baby tracker, 3h phone total | "Below average screen time" | "Only 3h total -- you're efficient. The baby tracker is intentional. No changes needed." |

### Impact on output quality

Context transforms the X-Ray from a **data dump** ("here's what you did") into a **coaching moment** ("here's what this means for your goals"). This is the difference between a scale that shows your weight and a trainer who knows you're preparing for a marathon.

**Implementation:** Two-pass approach:
1. Pass 1 (Haiku 4.5): Pure extraction with tool use (structured, reliable, cheap)
2. Pass 2 (Haiku 4.5 or Sonnet 4.6): Interpretation pass that takes extracted JSON + user context and generates narrative insights

The interpretation pass is text-only (no vision), so it's very cheap (~$0.001-0.002 on Haiku).

---

## 5. Chat-Based Intake

### Instead of a form, a 3-message LLM conversation

**Proposed flow:**
```
Meldar:  "Hey! What do you do? (Student, working, freelancing, between jobs...)"
User:    "I'm a CS student at Aalto"
Meldar:  "Cool. What's the one thing that wastes your time the most?"
User:    "I keep watching YouTube instead of studying. It's bad."
Meldar:  "Got it. Upload your Screen Time screenshots and I'll show you exactly how bad 😅"
User:    [uploads 1-4 screenshots]
Meldar:  [personalized X-Ray with student-calibrated insights]
```

### Architecture options

**Option A: Full LLM chat (3 turns)**
- Each message is an API call to Haiku 4.5
- Cost: 3 text calls (~$0.001 each) + 1 vision call (~$0.003-0.01) = **~$0.006-0.013 total**
- Pros: Natural conversation, can handle unexpected answers, feels personal
- Cons: Latency of 3 round-trips, harder to build structured UI around

**Option B: Hybrid (structured intake + LLM interpretation)**
- Steps 1-2 are a simple UI form (role dropdown, free-text pain point)
- Step 3 is screenshot upload with LLM vision extraction
- LLM only used for extraction + personalized insight generation
- Cost: 1 vision call + 1 text interpretation call = **~$0.005-0.014 total**
- Pros: Faster, more predictable UX, structured data for analytics
- Cons: Less "magic" feeling, form fatigue

**Option C: Pre-scripted chat with LLM-generated final response**
- Messages 1-2 are pre-scripted with button/chip responses (not LLM-generated)
- Only the final response after screenshot analysis uses LLM
- Cost: 1 vision call + 1 interpretation call = **~$0.005-0.014 total**
- Pros: Fast, cheap, feels conversational, predictable flow
- Cons: Can't handle unexpected freeform answers in steps 1-2

### Recommendation

**Option C** for launch. It gives the conversational feel without the cost or latency of 3 LLM round-trips. The "chat" is really a guided flow with chat-like UI. The LLM only fires when it adds unique value: vision extraction and personalized interpretation.

Move to Option A later when the product has enough users to justify the richer (but more expensive and complex) experience.

---

## 6. CV/Resume Analysis

### What becomes possible

If a user uploads a CV/resume alongside their Screen Time screenshots, Claude can cross-reference:

**Extractable from CV (text or PDF, no vision needed for most CVs):**
- Current role/title and seniority level
- Industry and domain
- Skills and tools they work with
- Employment gaps or "looking for work" signals
- Education level and field

**Cross-referenced insights:**

| CV signal | Screen Time signal | Combined insight |
|-----------|-------------------|-----------------|
| "Junior developer" | 6h gaming daily | "You're a junior dev spending 6h/day gaming during job hunting season. Even cutting to 3h frees up a workday of portfolio building per week." |
| "Marketing manager" | 3h Instagram, 1h TikTok | "4h on social could be competitive research or habit. If it's work, we can build a content tracker. If not, that's 20h/week." |
| "UX designer" | Heavy Figma + Dribbble | "Your screen time aligns with your work. No red flags -- you might not need us yet." |
| "Student, GPA mentioned" | Netflix 4h, study apps 30m | "Your CV says you care about grades, but your phone says Netflix gets 8x more attention than study tools." |
| Employment gap | High screen time | Sensitive territory -- frame as opportunity, not judgment |

### Privacy considerations

CV upload is a **significant trust escalation**. This should come AFTER the basic X-Ray proves value, not as part of the first interaction.

**GDPR implications:**
- CVs contain PII (name, address, work history) -- requires explicit consent and clear data retention policy
- Must offer immediate deletion after analysis
- Should process server-side and NOT store the CV -- extract relevant context, discard the file
- Consider: extract only role/industry/goals, never store the full document

### Implementation

```ts
// Extract minimal context from CV -- not the full document
type CVContext = {
  role: string           // "Junior Developer"
  industry: string       // "Tech"
  seniority: string      // "Entry-level"
  goals: string[]        // ["job hunting", "portfolio building"]
  isJobSeeking: boolean
}
```

Claude can extract this from a CV in a single text API call (~$0.002 on Haiku). The full CV is never stored -- only the derived context.

### Cost

- CV text extraction: ~$0.001-0.003 (Haiku 4.5, text only, small document)
- Combined analysis with screenshots: adds ~$0.001 to the interpretation pass (just more context in the prompt)
- **Total for screenshots + CV + personalized insights: ~$0.010-0.018**

---

## 7. Cost Model Summary

### Per-analysis cost breakdown

| Scenario | Vision (Haiku 4.5) | Text (Haiku 4.5) | Total | Notes |
|----------|-------------------|------------------|-------|-------|
| **Current: 1 screenshot** | $0.003 | -- | **$0.003** | Baseline |
| **2 screenshots (main + most used)** | $0.005 | -- | **$0.005** | Best bang for buck |
| **4 screenshots (full X-Ray)** | $0.010 | -- | **$0.010** | Complete picture |
| **4 screenshots + user context** | $0.010 | $0.002 | **$0.012** | Personalized insights |
| **4 screenshots + chat intake** | $0.010 | $0.004 | **$0.014** | Full conversational flow |
| **4 screenshots + CV** | $0.010 | $0.005 | **$0.015** | Maximum context |
| **4 screenshots + chat + CV** | $0.010 | $0.006 | **$0.016** | Everything combined |

### Monthly cost projections

| Monthly analyses | 1 screenshot | 4 screenshots + context | Full pipeline |
|-----------------|-------------|------------------------|---------------|
| 100 (early) | $0.30 | $1.20 | $1.60 |
| 1,000 | $3.00 | $12.00 | $16.00 |
| 10,000 | $30.00 | $120.00 | $160.00 |
| 100,000 | $300.00 | $1,200.00 | $1,600.00 |

### Where's the sweet spot?

**2 screenshots (main + most used) is the sweet spot for launch.**

Reasoning:
- The "Most Used" full app list is the single highest-value addition (reveals 20+ apps vs 5)
- Going from $0.003 to $0.005 per call is a 67% cost increase for a 300%+ insight improvement
- Pickups and notifications add value, but requiring 4 screenshots increases user friction significantly
- Make 4-screenshot upload optional ("Want deeper insights? Add your Pickups and Notifications screenshots too")

**Tiered approach:**
1. **Free tier (Time X-Ray):** 1-2 screenshots, basic extraction + rule-based insights. Cost: $0.003-0.005.
2. **Deeper analysis (after signup):** 4 screenshots + user context, personalized narrative insights. Cost: $0.012-0.015.
3. **Full profile (power users):** 4 screenshots + CV/goals + chat intake. Cost: $0.015-0.018.

The cost difference between tiers is so small ($0.003 vs $0.018) that cost is NOT the gating factor -- **user willingness to upload** is. The tier strategy should be about progressive trust, not cost management.

---

## 8. Implementation Notes for Current Codebase

### Changes needed in `src/server/discovery/ocr.ts`

The current `extractScreenTime` function accepts a single `imageBase64` string. To support multi-image:

```ts
// New signature
export async function extractScreenTime(
  images: Array<{ base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp'; section?: string }>,
): Promise<ExtractionResult>
```

The tool schema needs expansion to include pickup details (first-app-after-pickup list) and notification counts per app. The `ScreenTimeExtraction` type in `src/entities/xray-result/model/types.ts` needs new fields:

```ts
// New fields to add
notifications: z.array(z.object({
  appName: z.string(),
  count: z.number(),
})).nullable(),
firstAfterPickup: z.array(z.object({
  appName: z.string(),
  count: z.number(),
})).nullable(),
pickupsByHour: z.array(z.number()).nullable(), // 24 entries, one per hour
```

### New derived insights in `src/server/discovery/insights.ts`

With the expanded data, add:
- Notification-to-usage ratio calculation
- Reflex vs. intentional use classification
- "Silent killer" pattern detection (many small apps)
- Interruption cost estimation

These can all be **rule-based** (zero AI cost), just like the current insights.

### Prompt changes in `src/server/discovery/prompts.ts`

The system prompt needs to handle multiple screenshots and label them:
```
You will receive 1-4 screenshots from iOS Screen Time or Android Digital Wellbeing.
Each screenshot may show a different section: main overview, most used apps, pickups, or notifications.
Identify which section each screenshot shows and extract ALL data from ALL screenshots into a single unified extraction.
```
