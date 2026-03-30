# Rapid Prototyper Grills the Team

**Perspective:** Can we actually ship this fast? I build things in hours, not weeks. Here's what I see when I read these proposals through the lens of "does this help us validate discovery this week?"

---

## 1. Scope Creep: Where 4-Hour Tasks Become 6-Month Projects

### discovery-engine.md: The ActivityEvent Unified Model

The `ActivityEvent` model with 8 fields, 6 source types, 6 event types, and a `metadata: Record<string, unknown>` is an enterprise data warehouse schema. It's gorgeous engineering. It's also premature.

**The problem:** Before we build a unified activity timeline that normalizes screen time, calendar events, bank transactions, notifications, browser history, and search queries into one schema, we need to know if anyone cares about multi-source discovery at all. We have zero evidence that users will upload a second screenshot after seeing their first result.

**The scope trap:** The cross-source fusion examples (Screen Time + Calendar = "wasted free time", Screen Time + Bank = "zombie subscriptions") read like product demos, not MVPs. Each combo requires:
- Two working source processors
- A temporal overlap engine
- Contradiction detection logic
- A narrative generator that combines both
- Result cards that show the merged insight

That's not 4 hours per combo. That's 2-3 days per combo, assuming both sources already work perfectly.

**What to do instead:** Build source #1 (Screen Time -- already exists) and source #2 (one more) independently. Show them on the same results page. Let users see both results side by side. If users manually notice the connection ("oh wait, I pay for Headspace but I don't use it"), then we know cross-source matters. Don't build the cross-source engine until users prove they want it.

### discovery-engine.md: The Pattern Detector Library

Ten pattern detectors ship with MVP. Each is "50-100 lines of TypeScript." That sounds small until you realize each detector also needs:
- Test data for various edge cases
- UI to display its specific output format
- A suggestion template tied to a Meldar skill
- Documentation for what it does

10 detectors x (code + tests + UI + suggestion) = several weeks of work, not a few days. And you need two working data sources before most detectors can fire -- because most detect *cross-source* patterns (Polling requires browser data, Zombie Subscription requires bank + screen time, Research-Then-Buy requires browser + bank).

**Scope creep verdict:** Start with 3 detectors that work on Screen Time data alone (high pickups, top-app dominance, late-night usage). Those can ship in a day. Everything else waits until we have a second source live.

### discovery-engine.md: The Suggestion Engine Two-Tier Architecture

Rule-based tier + AI-enhanced tier + PatternDetector interface + Suggestion output format with 7 fields including `confidence` and `required_tier` and `data_sources` array. This is a recommendation engine architecture. We're pre-revenue with < 100 users.

**Cut it.** For the PoC, every insight ends with one hardcoded CTA: "Want Meldar to fix this? Join the waitlist." That's it. We don't need `required_tier: "starter"` when we don't have tiers yet.

---

## 2. Premature Abstraction: The SourceProcessor Registry

### architecture.md: The Registry Pattern

```typescript
interface SourceProcessor<TInput, TExtraction> {
  sourceType: string
  validateInput: (raw: unknown) => TInput
  extract: (input: TInput) => Promise<TExtraction>
  toSignals: (extraction: TExtraction) => Signal[]
}
```

Plus a `register()` function and a `getProcessor()` lookup.

**Is this overkill for 3 sources?** Honestly... it's borderline. The pattern itself is simple. The risk isn't the abstraction -- it's the **Signal normalization layer** underneath it.

The `Signal` type has 8 fields, 5 signal types, 3 confidence levels, and an open `metadata` bag. Before we lock this schema in, we need to answer: what decisions does the `Signal` type actually enable? Right now, the only consumer of `Signal[]` is `buildProfile()`, which just aggregates app usage minutes and collects pain points. You don't need a normalized signal type for that. You need `{ appName: string, minutes: number }[]` and `painPoints: string[]`.

**The real question:** Is the registry worth it if we're adding sources every few days? Yes -- IF we're actually adding sources that fast. But will we? The SYNTHESIS.md says "this week: 2 new sources, next week: 2 more." If that pace holds, the registry pays for itself by source #4. If we ship source #2 and then spend 3 weeks iterating on the result cards and messaging, the registry was wasted abstraction.

**My call:** Build the SourceProcessor interface. Skip the Signal normalization. Each processor returns its own typed result. The `buildProfile()` function has a switch on `sourceType` and handles each one directly. When we hit source #5 and the switch statement is ugly, refactor to Signal then. We'll know what the actual signal shape needs to be by then because we'll have real data.

### architecture.md: One Endpoint vs. Multiple

The proposal says one `POST /api/upload/analyze` with a `type` discriminator instead of separate endpoints per source. The reasoning: "identical lifecycle, simpler client code."

**Challenge:** The lifecycles are NOT identical for all sources. Image uploads need multipart/form-data and Claude Vision. Text pastes need JSON and text analysis. Questionnaires are pure client-side with no API call. A calendar ICS file needs file parsing. Shoehorning these into one endpoint creates a `parseRequest()` function that has to handle every content type and a `getProcessor()` that dispatches to completely different code paths.

**Counter-argument:** Separate endpoints are fine. `/api/upload/screentime` already exists and works. Add `/api/upload/notifications`, `/api/upload/subscriptions`. Each is 50 lines. The client component just calls the right endpoint. When we have 8+ sources and the pattern is clear, unify them if it helps. But starting unified adds complexity for zero benefit at 3 sources.

---

## 3. What Can We SKIP Entirely

### Skip #1: Database Tables (For Now)

The `discovery_sessions` and `discovery_sources` tables are well-designed but premature. We don't have user accounts. We don't have auth. We have email capture and one-shot X-Ray results.

**What we actually need:** Each screenshot upload returns a JSON result. The client holds the results in React state. If the user uploads a second screenshot, the client sends both results to a "combine" endpoint (or just shows them side by side). No database. No sessions. No migrations.

When we need persistence (sharing results via link, returning users), add it then. We'll know the actual data shape from the in-memory version.

### Skip #2: Retroactive Enrichment

The discovery-engine doc's big idea: "adding Level N retroactively reprocesses Levels 1 through N-1." This sounds brilliant but adds enormous complexity. When a user adds notifications data, do we re-call Claude Vision on their screen time screenshot? Do we regenerate all insights? Do we show "before/after" comparison?

**For the PoC:** Just show all source results on the same page. The user's brain does the cross-referencing. "Oh, Instagram sends me 30 notifications but I only use it 20 minutes -- interesting." We don't need to compute the ratio for them yet. The side-by-side view IS the retroactive enrichment, except it's free and instant.

### Skip #3: Cost Monitoring Dashboard

The discovery-engine doc specifies tracking "AI cost per user (7-day rolling average), AI calls per user action, cache hit rate, cost per insight generated." We're spending $0.002 per screenshot. At 1,000 users that's $2. Track this with a Vercel log grep when we need it, not a dashboard.

### Skip #4: The Chrome Extension

Listed in the original discovery SYNTHESIS as Week 3. Skip it entirely for now. We haven't validated that users want to submit even ONE screenshot. A Chrome extension is a trust escalation step that requires proven value first. It's also a separate product (Chrome Web Store review, Manifest V3, ongoing maintenance). Minimum 2-3 weeks of real work to ship properly. Revisit at 500+ active users.

### Skip #5: Google Takeout Pipeline

Client-side ZIP parsing, WebAssembly streaming, multi-format parsers for Chrome history, search, YouTube, Calendar, Maps. This is a project in itself. The SYNTHESIS already marks it Phase 3+. Agree completely. Don't touch it until screenshot-based discovery is proven.

### Skip #6: The Moat Section

The discovery-engine doc spends 2,000+ words explaining why Apple, Google, and ChatGPT can't replicate this. That's important strategic thinking but it's a pitch deck, not an engineering plan. Nobody is competing with us right now. We're competing with "close tab." Ship features, not moat narratives.

### Skip #7: Bank Statement Analysis

Both ai-data-sources and email-discovery docs include this. Financial screenshots are the highest-privacy-risk source with the most variable formats across banks and countries. The insight (subscription waste) can be approximated with App Store subscriptions screenshots (much lower risk, much more structured). Skip bank statements entirely until Phase 3.

---

## 4. The Brutal MVP: Minimum to Prove Multi-Source Discovery

**The hypothesis we're testing:** "Users who see insights from 2+ data sources are significantly more likely to sign up / pay than users who see insights from 1 source."

**What we need to test that:**

1. **Screen Time upload** (already exists)
2. **ONE more source** (I vote Subscriptions screenshot -- dollar amounts are the strongest viral trigger and the cross-reference with Screen Time creates the "zombie subscription" insight without any fancy engine)
3. **A results page that shows both** (two cards, side-by-side, with a manual callout: "You pay for Headspace ($12.99/mo) but Screen Time shows 0 minutes in the last 30 days")
4. **A "try another source" prompt** after the first upload ("Want to see more? Screenshot your subscriptions too")

That's it. No Signal normalization. No SourceProcessor registry. No discovery_sessions table. No retroactive enrichment engine. No pattern detector library. No cross-source combinator.

**Build time:** 1 day for the Subscriptions processor (Vision API, same pattern as Screen Time). 1 day for the combined results page. 0.5 days for the "try another" flow.

**2.5 days to validate multi-source discovery.** Everything else in these docs is post-validation architecture.

### If the hypothesis is true (users love multi-source):
THEN invest in the SourceProcessor pattern, Signal normalization, and cross-source engine. We'll know exactly what shape the data needs to be because we'll have real examples.

### If the hypothesis is false (users don't bother with source #2):
Then we saved ourselves from building an elaborate multi-source architecture nobody wants. Focus instead on making source #1 (Screen Time) insights much deeper and more actionable.

---

## 5. Dependency Chains: What MUST Exist Before Others Work

```
Screen Time Upload (EXISTS)
  |
  +--> Doomscroll Meter (different prompt on same screenshot, 2h)
  |
  +--> Notification Source (separate screenshot, 4h)
  |      |
  |      +--> Interruption Cost Insight (Screen Time + Notifications, 2h)
  |
  +--> Subscriptions Source (separate screenshot, 4h)
  |      |
  |      +--> Zombie Subscription Insight (Screen Time + Subscriptions, 2h)
  |
  +--> Calendar Source (separate screenshot, 4h)
         |
         +--> Free Time Waste Insight (Screen Time + Calendar, 3h)

Decision Fatigue Calculator (NO DEPENDENCIES, 3h, pure frontend)
Sleep Procrastination Score (NO DEPENDENCIES, 2h, pure frontend)
Content Creation Ratio (NO DEPENDENCIES, 2h, pure frontend)

ChatGPT Export Analysis (NO DEPENDENCIES from Screen Time, 4-6h)
  |
  +--> But pairs amazingly with Screen Time for "you asked ChatGPT about X,
       but Screen Time shows you spend 3 hours/week doing X manually"

SourceProcessor Registry (NEEDED AFTER source #3 is built, not before)
Signal Normalization (NEEDED AFTER source #5 is built, not before)
Cross-Source Combinator (NEEDED AFTER we prove users submit 2+ sources)
Discovery Sessions DB Table (NEEDED AFTER we want persistent results/sharing)
```

### The Critical Path:

**No-dependency items ship first:** Decision Fatigue Calculator, Sleep Procrastination Score, Content Creation Ratio. These are standalone viral tools. They validate the "quick discovery tool" pattern with zero API cost. Ship all three in a single day.

**Screen Time extensions ship second:** Doomscroll Meter (just a different prompt on the existing upload) and Notification Source (same infra, different screenshot).

**First cross-source insight ships third:** Zombie Subscription = Subscriptions Source + Screen Time. This is the moment of truth for multi-source discovery.

**Architecture investment ships ONLY after cross-source is validated.**

---

## 6. Document-Specific Callouts

### ai-data-sources.md

**Strength:** The 18-source ranked table with composite scores is excellent. This is the roadmap.

**Concern:** 18 sources catalogued in detail creates an illusion of a to-do list. We don't need 18. We need 3, max 5, to validate the concept. The doc should have a hard line after #5: "Everything below this line is Phase 2+. Do not touch until Phase 1 is validated."

**The ChatGPT Export idea (source #6) is brilliant** and under-prioritized. It's the only source that gives us direct problem signals (every conversation = an unsolved problem). For our Gen Z audience, this is more relevant than calendar or email. I'd move it above Calendar and Email in priority. Title-only analysis from a sidebar screenshot is trivially fast to build and uniquely insightful.

### email-discovery.md

**Strength:** The notification-to-usage ratio insight is genuinely novel. Nobody has seen this number before. It's the kind of thing that gets screenshotted and shared.

**Concern:** The doc catalogs 6 communication patterns, 3 notification patterns, 3 inbox patterns, and 2 subscription patterns -- each with a fix table. That's 14+ patterns, each requiring detection logic, UI, and a fix suggestion. This is a product roadmap for 6 months, presented as if it's a brainstorm.

**What to take from this doc:** The Notification-to-Usage Ratio calculation. That single insight. Build that and ship it. The rest waits.

### messaging.md

**Strength:** "What's eating your week?" is a strong tagline. The feature naming ("The Ping Audit", "The Leak Finder", "Inbox Autopsy") is excellent. The three-transition story (curiosity -> shock -> fix) is the right emotional arc.

**Concern:** This is marketing and messaging, not a build plan. It's useful for copy when we ship features but it doesn't affect engineering priority. No grilling needed -- it's well-scoped for what it is.

### architecture.md

**Strength:** The migration strategy (additive, keep old tables, backfill later) is correct. Zero risk to live data. The "adding a new source = one file" DX goal is the right target.

**Concern:** The doc is 400+ lines of schema, interface definitions, and code samples for a system we don't need yet. The `SourceProcessor` interface, the registry, the pipeline, the computed profile, the JSONB schema -- all of this is engineering for source #5-10. We're at source #1. See section 2 above.

**What to take:** The migration strategy and the philosophy of "one endpoint, one file per source." Implement the simplest version of this when we build source #2. Don't build the full registry/pipeline up front.

### discovery-engine.md

**Strength:** The cost analysis is useful ($0.003/user typical, $0.013 power user). The "rule-based first, AI by exception" principle is correct.

**Concern:** This doc is a 500-line architecture spec for a system that requires 5 data sources, 10 pattern detectors, 2 AI tiers, circuit breakers, cost monitoring, and a feedback loop. It's the right system to build in month 6. It's the wrong system to build in week 1.

**What to take:** The cost numbers and the "rules first" principle. Ignore the rest until we have 3+ sources live and evidence of cross-source demand.

### SYNTHESIS.md

**Strength:** Good prioritization. The "build this week" list (4 items, ~13 hours total) is aggressive but achievable. The "do NOT build" list at the bottom is critical and correct.

**One disagreement:** The synthesis says "build SourceProcessor registry this week." I disagree. Build source #2 as a standalone processor. If the code looks like source #1 with find-and-replace changes, THEN extract the pattern. Don't abstract before the pattern is clear. The existing Screen Time code should be the template we copy, not a framework we refactor into.

---

## Summary: What Ships This Week

From a "can we actually ship this fast?" perspective, here's the real plan:

| Day | What | Hours | Dependencies |
|-----|------|-------|-------------|
| Mon | Decision Fatigue Calculator (questionnaire) | 3h | None |
| Mon | Sleep Procrastination Score (questionnaire) | 2h | None |
| Tue | Subscriptions Screenshot source (Vision API) | 4h | None |
| Tue | Combined results page (Screen Time + Subscriptions side-by-side) | 2h | Subscriptions source |
| Wed | "Try another source" prompt after first upload | 1h | Combined results page |
| Wed | Doomscroll Meter (new prompt on existing Screen Time upload) | 2h | None |
| Thu | Content Creation Ratio (questionnaire) | 2h | None |
| Thu | Measure: do users submit source #2? | -- | All of above |

**Total: ~16 hours across 4 days.** 5 new discovery tools. 1 multi-source validation experiment. Zero new database tables. Zero new abstractions. Zero cross-source engines.

If Thursday's data shows users actually submit source #2, Friday is when we start the SourceProcessor pattern. Not before.
