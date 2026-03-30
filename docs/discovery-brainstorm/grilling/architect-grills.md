# Architecture Review: Grilling All Proposals

Reviewing each document against five criteria: over-engineering, under-engineering, integration assumptions, data model conflicts, and build time realism. This is a 1-person team. Every hour matters.

---

## 1. ai-data-sources.md

### Over-engineering

**22 data sources is a catalog, not a plan.** The document lists 22 screenshot types with full specification tables. This is thorough research, but the risk is treating the catalog as a backlog. A 1-person team building 22 source processors -- even "simple" ones -- is months of work when you factor in prompt engineering, edge case handling, result card design, and cross-source testing.

**The "multi-screenshot stitching" suggestion** (detecting overlap when users scroll and take multiple screenshots of the same screen) is a genuine computer vision problem. This is not a 4-hour feature. Detecting overlapping rows across screenshots, merging them correctly, handling slight scroll differences -- this is a research project. Cut it from PoC entirely. Accept that one screenshot captures one screenful.

**Client-side Claude API proxy.** The doc suggests sending screenshots directly from the browser to Claude API through "our proxy that adds API key, but never stores the image." This is architecturally sound for privacy, but adds a proxy layer, CORS configuration, streaming response handling in the browser, and client-side Zod validation. For PoC, just upload to the server, process server-side, don't store the image after extraction. The privacy story of "we process and immediately discard" is good enough for the first 100 users.

### Under-engineering

**No error handling strategy across sources.** Each source has "Technical Feasibility: High" but there's no discussion of what happens when Claude Vision returns garbage, partial data, or misidentifies the screenshot type. At 100 users, you'll get screenshots in languages the prompt wasn't tested against, screenshots with overlaid notifications, partial screenshots, and screenshots of the wrong settings screen. Each source needs:
- A confidence threshold below which we say "we couldn't read this clearly"
- A fallback path (retry with Sonnet? ask user to retake?)
- User-facing error messages specific to each source type

**No rate limiting or cost protection per source type.** The doc mentions per-image costs but doesn't discuss what happens if someone uploads 50 screenshots. The current `screentimeLimit` (5/min) is source-agnostic. Each Vision-based source needs its own or a shared daily budget per session.

### Integration assumptions

**ChatGPT Export (Tier B) assumes client-side JSON parsing of potentially massive files.** A power user's `conversations.json` can be 50-200MB. Parsing this in the browser with `JSON.parse` will freeze the UI on lower-end devices. This needs web workers or streaming JSON parsing (`JSONStream`, `oboe.js`). The document hand-waves this with "parsed entirely in the browser" -- true, but not trivially.

**Google Search History via My Activity** requires the user to be logged into Google in their browser and navigate to a specific URL. This is not "zero friction" -- it's at least 3-4 steps more than screenshotting Settings. The friction estimate of "60 seconds" is optimistic; users who've never visited myactivity.google.com will need guidance.

### Data model conflicts

The doc proposes "client-side in localStorage or IndexedDB -- data never hits our server in raw form" but our architecture.md stores `raw_input` in `discovery_sources.raw_input` JSONB. These are contradictory. We need to decide: does the server store extracted data or not? My recommendation: the server stores the **extraction** (structured JSON), never the raw image. But the doc's suggestion of purely client-side storage means no persistence across devices, no shareable URLs, and no ability to re-process when we improve our prompts. Server-side extracted data storage is the right call for PoC.

### Build time estimates

The doc doesn't provide per-source build times (it defers to rapid-prototypes.md for that). But the implicit suggestion of building 22 sources, even phased, vastly underestimates total effort. Even Tier 1 alone (6 sources) at a realistic 6-8 hours each (prompt engineering + testing + result card + edge cases) is 36-48 hours of focused work. That's 1-2 weeks for one person, not counting the shared infrastructure that needs to exist first.

---

## 2. rapid-prototypes.md

### Over-engineering

**10 rapid prototypes is 5 too many for a first sprint.** The doc proposes building 6 features in 3 days. Even the "client-side only" features (Decision Fatigue Calculator, Sleep Procrastination Score, Content Creation Ratio) each need: a questionnaire UI with sliders, calculation logic, a result card component, a shareable image/card, a CTA connection to the Meldar funnel, and mobile responsiveness. That's not 2-3 hours. That's 4-6 hours minimum per feature.

**The `ShareableCard` component** is mentioned as "build once, reuse." This is correct but undersells the effort. A shareable card that looks good as a screenshot on Twitter/Instagram/TikTok needs: fixed dimensions, brand-consistent styling, dynamic data rendering, correct font rendering at card scale, and mobile-optimized layout. Building the first ShareableCard is a 4-6 hour job. Subsequent cards that reuse it are genuinely fast (~1 hour each).

### Under-engineering

**No persistence for questionnaire results.** The Decision Fatigue Calculator and Sleep Procrastination Score are described as "pure client-side, no API route." But if there's no persistence:
- Users can't revisit their results
- Results can't feed into the discovery session / profile
- No analytics on which features drive conversions
- No cross-source insights ("your decision fatigue is 6.2 hours AND your screen time shows 3 hours of food delivery apps")

These features MUST feed into the discovery session pipeline, even if the "extraction" step is trivial (the user's slider inputs ARE the extraction). Otherwise they're isolated marketing gimmicks, not discovery tools.

**No mobile-first consideration.** Our target audience (Gen Z, 18-28) will access these on phones. Slider inputs are notoriously bad on mobile touch interfaces. The "8 quick questions" for Decision Fatigue Calculator needs mobile-native input patterns: segmented controls, big tap targets, not tiny sliders. This is a design detail that adds 1-2 hours per questionnaire feature.

### Integration assumptions

None -- these are all self-contained features. This is actually correct for the first iteration. But (see under-engineering above) they become isolated dead-ends if they don't connect to the session system eventually.

### Build time estimates

| Feature | Claimed | Realistic (including mobile, result card, session integration) |
|---------|---------|--------------------------------------------------------------|
| Decision Fatigue Calculator | 3h | 6-8h |
| Sleep Procrastination Score | 2h | 4-6h |
| Subscription Autopsy | 3h | 8-10h (Vision prompt + edge cases) |
| Doomscroll Meter | 2h | 4-6h (new Vision prompt, different from Screen Time) |
| Content Creation Ratio | 2h | 3-4h |
| Copy-Paste Detective | 2h | 4-5h (prompt engineering for classification) |

The "build 6 features in 3 days" claim is actually closer to 30-40 hours of work = 4-5 focused days. Not catastrophically wrong, but a 60% underestimate.

---

## 3. discovery-engine.md

### Over-engineering

**The `ActivityEvent` timeline model is premature.** The document proposes normalizing ALL data into timestamped `ActivityEvent` objects and then running temporal overlap detection, contradiction detection, and intent-action gap analysis. This is an analytics engine architecture, not a PoC architecture.

For the cross-source insights described (zombie subscriptions, interruption cost, free time waste), you do NOT need a unified timeline. You need simple joins:
- Zombie subs: `subscriptions WHERE app NOT IN (screen_time_apps WHERE minutes > 5)` -- that's a set intersection, not temporal analysis.
- Interruption cost: `notifications_count * 23_seconds` -- that's multiplication, not timeline fusion.
- Free time waste: `calendar_gaps INTERSECT screen_time_by_hour` -- this does need temporal alignment, but it's one specific cross-source query, not a generic engine.

Building a generic `ActivityEvent` timeline engine that can detect arbitrary temporal overlaps, contradictions, and patterns is a weeks-long project. Building 5 specific cross-source insight functions is 2-3 days. At PoC stage, build the specific functions.

**The `PatternDetector` library (50 detectors) is massive scope.** The doc says "start with 10-15, each is 50-100 lines." That's 500-1500 lines of detection logic, plus tests, plus the suggestions each detector produces. 10-15 detectors at PoC is fine. 50 is a roadmap, not a sprint goal.

**The "retroactive enrichment" mechanism** (adding source N triggers reprocessing of sources 1 through N-1) is architecturally correct and is what my architecture.md proposes via `buildProfile()`. But the discovery-engine.md describes it as re-running pattern detectors, regenerating narratives, and producing new cross-source insights -- each of which may trigger AI calls. At 5 sources per session, adding source 5 would trigger reprocessing all 4 prior sources' patterns + generating new cross-source combos. The cost and latency implications aren't addressed. In practice, `buildProfile()` computing a fresh aggregate from all signals is the right implementation -- no "reprocessing," just re-aggregation.

### Under-engineering

**The Tier 2 AI narrative generation lacks prompt versioning or evaluation.** The doc describes using Claude Haiku for simple narratives and Sonnet for complex ones, but there's no mention of:
- How to evaluate narrative quality
- How to A/B test different prompts
- How to handle the cold start (first 10 users get untested prompts)

For PoC this is acceptable -- you iterate on prompts manually based on user feedback. But flagging it because bad narratives at launch will undermine trust.

**No discussion of data retention or session expiry.** Sessions accumulate sources but never expire. After the initial "wow" moment, does the session persist forever? Is there a cleanup strategy? For GDPR, there needs to be a data retention policy: "sessions older than 90 days are deleted" or "users can delete their session at any time." The architecture.md schema has a `status` field with `expired` as an option, but neither document discusses when or how expiry happens.

### Integration assumptions

**Calendar (ICS export) is mentioned but we're doing screenshots, not exports.** The doc references "Google Calendar export (ICS)" in Level 3, but the entire premise of the product is "screenshot, no exports." ICS export requires: finding the export option in Google Calendar settings, downloading a file, and uploading it. That's OAuth-level friction disguised as a file operation. Stick to calendar screenshots.

**Bank statement CSV** is mentioned at Level 4. This requires downloading a CSV from a bank's website -- not a screenshot. Many banks require 2FA to access statements. Some don't offer CSV at all. This is medium-high friction, not the "30 seconds" the doc implies. The iPhone Subscriptions screenshot is the right approach for financial data -- it's genuinely 15 seconds.

### Data model conflicts

The `ActivityEvent` model (timestamped events with `duration_s`, `event_type`, `domain`) is fundamentally different from my architecture.md's `Signal` model (labeled values with `type`, `value`, `unit`, `category`). These are two different abstractions:
- `ActivityEvent` is raw, temporal, event-sourced. Good for timeline queries. Hard to aggregate.
- `Signal` is pre-aggregated, categorical, analysis-ready. Good for insights. Loses temporal detail.

For PoC, `Signal` is the right abstraction. We don't need to know that the user used Instagram from 2:15pm to 2:47pm. We need to know "Instagram: 47 min/day, social category, high confidence." The temporal detail is in `raw_input` if we ever need it.

If we later need temporal analysis (e.g., "what do you do during your calendar gaps?"), we can add a `timeline` computed view on top of signals. But building `ActivityEvent` as the primary model is over-indexing on a future need.

### Build time estimates

The doc doesn't give build times but the scope implied by "10-15 pattern detectors at launch" + "two-tier suggestion engine" + "cost monitoring dashboard" + "circuit breakers" is 2-3 weeks of focused work for one person. The pattern detectors alone (10 detectors x 4 hours each for logic + test + suggestion template) is 40 hours.

Recommendation: ship with 3-5 pattern detectors that cover the most common cases (high screen time, zombie subscriptions, notification flood, social media dominance, high pickups). Add more as user data reveals which patterns actually fire.

---

## 4. email-discovery.md

### Over-engineering

**Six pattern archetypes for inbox analysis is premature.** The doc defines "Inbox as Junk Drawer," "Drowning Organizer," "Newsletter Hoarder," "Email as Todo List" -- these are marketing personas, not engineering requirements. For PoC, the inbox screenshot processor extracts: unread count, sender distribution (brands vs humans), folder/label count. The "archetype" is a UX layer on top. Don't build archetype classification until you've seen 50+ real inbox screenshots and know which patterns actually occur.

**The notification-to-usage ratio analysis** is described in extraordinary detail (6 patterns, 3 composite insights, a full "killer ratio" table). This is great product thinking but the implementation is simple: it's division. `notification_count / screen_time_minutes` per app. The document makes it sound like a complex analytical engine. It's one line of math per app, wrapped in a well-written insight template. Don't over-build the engine; spend the time on the insight copy.

### Under-engineering

**No discussion of multi-language support.** Email subjects, notification text, and app names will be in the user's device language. A Finnish user's Gmail says "Ensisijainen" not "Primary," "Ilmoitukset" not "Notifications." The Vision prompts need to handle this. The current `SCREEN_TIME_SYSTEM_PROMPT` doesn't mention language detection. At 100 users in Finland (where the company is registered), this will be the first failure mode.

**The "actionable suggestions" section** (Group Mute Blitz, Email Digest Bot, Notification Audit Wizard) describes actual product features, not discovery insights. Building an "Email Digest Bot" that "checks inbox 3x/day and sends a text with a 3-line summary" is a full product in itself -- OAuth to Gmail, message parsing, summarization, SMS/push delivery. This is the Meldar product vision, not a discovery PoC feature. The discovery PoC should show the insight and offer a "Want this? Join the waitlist" CTA, not actually build the automation.

### Integration assumptions

**"Guide user to mute the 15 least-active groups in 2 minutes"** -- this assumes deep-linking into WhatsApp/Telegram settings per group, which isn't possible on iOS. We can't programmatically mute a user's Telegram groups. The best we can do is show them a ranked list and say "here are the groups to mute, go do it." This is a fine UX but it's not the "2-minute guided walkthrough" the doc implies.

### Build time estimates

The email inbox screenshot processor is genuinely ~4 hours (prompt + Zod schema + signal mapper). The notification analysis is ~2 hours on top of a Screen Time notification screenshot processor. The "actionable suggestions" section is aspirational product scope, not PoC work -- correctly excluded from the SYNTHESIS.md build plan.

---

## 5. messaging.md

### Over-engineering

**This is a marketing document, not a technical proposal.** There's no architecture to critique -- it's taglines, feature names, competitive positioning, and hero copy. This is useful product work, but from an architecture perspective it has zero implementation surface area.

The only concern: **don't let marketing promises drive scope.** The "positioning matrix" claims Meldar "Sees your data / Finds patterns / Tells you what to do / Builds the fix / Never touches your accounts" -- but "Builds the fix" is the entire Meldar product roadmap, not a PoC feature. The discovery brainstorm should not promise automation delivery as part of the discovery flow.

### Under-engineering

N/A -- this is copy, not code.

### Integration assumptions

N/A.

### Data model conflicts

N/A.

### Build time estimates

N/A (zero engineering work). The tagline testing and A/B setup is marketing work, correctly separated from engineering.

---

## 6. SYNTHESIS.md

### Over-engineering

**The "build this week" plan is too ambitious.** It proposes 4 items for the week of March 31 - April 6:
1. Notification Count source processor (claimed 4h)
2. Subscriptions source processor (claimed 4h)
3. Decision Fatigue Calculator questionnaire (claimed 3h)
4. Sleep Procrastination Score questionnaire (claimed 2h)

Total claimed: 13 hours. But this assumes the multi-source infrastructure already exists. Before building ANY new source processor, someone must:
- Create the `discovery_sessions` + `discovery_sources` tables (Drizzle schema, migration)
- Build the `SourceProcessor` interface, registry, and `processSource()` pipeline
- Build the unified `/api/upload/analyze` endpoint
- Refactor the existing Screen Time flow into a `SourceProcessor`
- Build the `buildProfile()` aggregation function
- Refactor `insights.ts` and `upsells.ts` to consume signals instead of `ScreenTimeExtraction`
- Build the new session-aware result page

That infrastructure work is 12-16 hours on its own. The "build this week" plan should be:

**Actual week 1:** Infrastructure (session tables, pipeline, registry, refactor existing Screen Time into the new system).
**Actual week 2:** First new source (Notification Count) + first questionnaire (Decision Fatigue Calculator).

Trying to do both in one week means either the infrastructure is half-baked or the source processors are bolted on without the shared pipeline.

### Under-engineering

**The cross-source insight generation isn't specified.** The synthesis lists 5 "killer insights" (Zombie Subscription Detector, Interruption Cost Calculator, etc.) but doesn't describe HOW they get generated. Are they:
- Hard-coded functions that run when specific source combinations are present?
- Pattern detectors from discovery-engine.md?
- AI-generated from the signal aggregate?

My recommendation: hard-coded functions, one per cross-source combo. `if (has('screen_time') && has('subscriptions')) generateZombieSubscriptionInsight()`. Simple, testable, zero AI cost. Add AI narrative polish later.

**No testing strategy.** None of the documents mention how to test source processors against real-world screenshots. You need a corpus of test images (at least 5-10 per source type, covering iOS/Android, light/dark mode, different languages, edge cases). Building this corpus is a prerequisite for reliable extraction. Budget 2-3 hours per source type for collecting and annotating test screenshots.

### Integration assumptions

The synthesis correctly scopes to "screenshots only, no OAuth" which is the right call. No integration assumptions to challenge.

### Data model conflicts

The synthesis endorses the architecture.md model (JSONB signals, `SourceProcessor` registry, computed profiles). No conflicts. It also correctly rejects the `ActivityEvent` timeline from discovery-engine.md in favor of the simpler `Signal` approach, though it doesn't say so explicitly.

### Build time estimates

| Item | Synthesis claim | Realistic (including infra prerequisites) |
|------|----------------|------------------------------------------|
| Notification Count source | 4h | 6-8h (new prompt, testing across iOS/Android, signal mapper) |
| Subscriptions source | 4h | 8-10h (highly variable screenshot formats, dollar parsing, currency handling) |
| Decision Fatigue Calculator | 3h | 5-6h (mobile-friendly questionnaire UI, session integration, result card) |
| Sleep Procrastination Score | 2h | 4-5h (same reasons) |
| **Infrastructure (not mentioned)** | 0h | **12-16h** |
| **Total** | 13h | **35-45h** |

The synthesis timeline is approximately 3x optimistic when accounting for the infrastructure work it omits.

---

## Cross-Cutting Concerns

### Data model alignment

The architecture.md `Signal` model and the SYNTHESIS.md endorsement of it are the right choice. The discovery-engine.md `ActivityEvent` model should be treated as a future evolution, not a PoC requirement. All source processors should output `Signal[]`. Cross-source insights should be hard-coded functions consuming signals, not a generic pattern detection engine.

### The biggest risk: prompt engineering time

Every Vision-based source processor depends on a Claude Vision prompt that extracts structured data from a screenshot. The current Screen Time prompt (`SCREEN_TIME_SYSTEM_PROMPT`) is 15 lines and works well for a single screenshot type. Each new source needs its own prompt, tested against 5-10+ real-world screenshots.

Prompt engineering is not coding -- it's iteration. A "4 hour" source processor estimate typically allocates 30 minutes to the prompt. In practice, getting a prompt to handle dark mode, non-English text, different OS versions, and edge cases takes 2-4 hours of iteration per source. This is the hidden multiplier that makes every build time estimate wrong.

### What to build first (my recommendation)

1. **Week 1:** Multi-source infrastructure (tables, pipeline, registry, refactor Screen Time). This is the foundation everything else depends on.
2. **Week 2:** One new Vision source (Notification Count -- same settings screen, user is already there) + one questionnaire (Decision Fatigue Calculator -- zero AI cost, validates the pattern).
3. **Week 3:** Subscriptions source (highest viral potential, but also hardest Vision extraction due to format variability) + one more questionnaire.
4. **Week 4:** Cross-source insights (the 3-5 hard-coded functions that produce the "moat" insights).

This is a realistic 4-week plan for one person. The brainstorm documents collectively describe 8-12 weeks of work and frame it as 2 weeks. Underpromise, overdeliver.
