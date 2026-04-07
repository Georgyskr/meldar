# Meldar v3 — UX Researcher Findings

**Author:** UX Researcher (agent)
**Date:** 2026-04-06
**Status:** Pre-implementation. Hypotheses + extrapolations from existing research. No v3 user interviews conducted yet.
**Companion deliverable:** `docs/v3/ux/ux-architect-spec.md` (technical UX architecture, owned by `ux-architect`)
**Source documents read:**
- `docs/v3/meldar-v3-product-spec.md`
- `docs/v3/meldar-v3-mvp-backlog.md`
- `docs/v3/meldar-v3-decisions-needed.md`
- `docs/research/SYNTHESIS.md` and `docs/research/reddit-freelance.md`, `docs/research/reddit-productivity.md`
- `docs/discovery/SYNTHESIS.md` and `docs/discovery/ux-research.md`
- `CLAUDE.md`
- `src/widgets/landing/HeroSection.tsx` (voice/tone reference)

---

## How to read this document

Each claim is tagged:
- **[EVIDENCE]** — sourced from a research file in this repo, an external study cited in those files, or current product copy.
- **[INFERENCE]** — extrapolation from evidence + product spec. Should be treated as a hypothesis, not a finding.
- **[ASSUMPTION]** — load-bearing guess that needs to be tested before launch.

Where the founder needs to make a call, the document says so explicitly.

---

## Section 1 — Research questions this document answers

These are the questions I asked myself before reading anything. They frame the rest of the document.

1. What does a non-technical user need to feel safe clicking "Build" for the first time, given that "Build" triggers an opaque, expensive, multi-minute backend job?
2. Why would someone who has failed at AI tools before believe Meldar will be different? What proof do they need in the first 90 seconds of the workspace?
3. What is the *minimum* concept load a user must absorb to make a kanban "the spec language" without reading documentation?
4. When the live-preview iframe loads for the first time and shows a working app, what emotional state should the user be in — and how do we engineer that moment?
5. What does Katya (24, freelancer) think she is buying when she pays EUR 19 — a tool, a tutor, a service, or a friend who is good at this? The answer changes the entire onboarding tone.
6. What is the single most likely reason Katya bounces *after* paying but *before* her first deploy? (The post-paywall valley is the most expensive drop-off in any SaaS funnel.)
7. How do we communicate token cost without making every action feel like a slot machine?
8. What does "Day 2 retention" actually mean for this product? Is it logging back in, opening the workspace, or running another prompt? Each implies a different design.
9. Where in the journey does the gap between user expectation ("AI builds my app") and reality ("you draft a kanban, then approve a build, then iterate") cause the most disappointment?
10. What does the "Done-for-me / Skip-the-Line" escape hatch look like to a stuck user — a defeat, a relief, or an upsell trap? If it feels like defeat, conversion to it will be near zero and we lose the safety net.
11. For Jari (corporate, 41) entering through the same flow as Katya, where does the messaging snap from helpful to alienating?
12. What evidence will tell us, within the first 10 founding members, that the kanban-as-spec model works — and what specifically would falsify it?

---

## Section 2 — Refined personas

> **Methodology note:** The product spec names three personas (Daria, Katya, Jari) but provides only a single sentence each. No real interviews have been conducted for v3. The persona refinements below are constructed by triangulating: (a) the spec's brief descriptions, (b) the audience profile in `CLAUDE.md`, (c) Reddit research in `docs/research/`, (d) trust and onboarding patterns in `docs/discovery/ux-research.md`. Each section flags evidence vs. inference. **None of these should be treated as validated findings.** They are starting hypotheses for the first 10 founding-member interviews.

---

### Persona 1 — Katya (24, marketing coordinator / freelancer / creative) — *first use case target*

**Status: Highest-confidence persona for MVP.** Reddit freelance research provides the most direct ground truth.

#### Demographics & context
- **[EVIDENCE — spec]** 24, marketing coordinator + freelancer + creative.
- **[INFERENCE]** Likely working a day job + side gigs. Owns a laptop. Browser-only AI usage (ChatGPT free or Plus). Has tried Notion, Canva, maybe Figma. Has *not* opened a terminal.
- **[INFERENCE]** Geographic split: probably Europe-leaning given Meldar is Finnish, but the freelancer pain pattern is global (Reddit research is largely US/UK).
- **[INFERENCE]** Income: variable. EUR 19/mo is a real decision, not impulse. She will compare against Canva Pro (EUR 11.99), Notion (EUR 9.50), Squarespace (EUR 19+). She is fluent at evaluating tools at this price point.

#### Jobs-to-be-done (in her words — paraphrased from Reddit research)
- **[EVIDENCE — `reddit-freelance.md`]** "I want to look professional enough that prospects book me without asking too many questions." (Top-quartile freelance pain: client acquisition / first impressions.)
- **[EVIDENCE — `reddit-freelance.md`]** "I waste time chasing back-and-forth on scheduling — 47% of freelancers say this is their #1 admin frustration."
- **[EVIDENCE — `reddit-freelance.md`]** "I need a portfolio + booking link I can drop in DMs that doesn't look like a Linktree."
- **[INFERENCE]** "I want to feel like I'm actually building something modern, not paying someone to make a Squarespace template."
- **[INFERENCE]** "I want it to be *mine* — the URL, the data, the design — so I can move it later if I have to."

#### Fears + failure modes (why she gave up on past AI tools)
- **[EVIDENCE — `discovery/ux-research.md`]** "82% of GenAI users say the technology could be misused" — she's transactionally trusting at best.
- **[EVIDENCE — `discovery/ux-research.md`]** "60% of users abandon and uninstall when they discover how much personal information an app requests."
- **[INFERENCE — high confidence]** Past AI failures look like: tried Bolt or Lovable, got stuck on the second prompt, didn't understand why the preview broke, gave up. Tried ChatGPT to write a landing page, got generic copy, gave up. Tried Wix AI, hated the design, gave up.
- **[INFERENCE]** The deeper failure mode is *not* technical — it's *self-blame*. She concludes "AI isn't for me yet" or "I'm not technical enough for this." Meldar must aggressively neutralize this attribution. The product cannot let her feel stupid even once.

#### Success criteria — "Meldar worked" looks like
- **[INFERENCE]** Within 24 hours of paying: a working URL she can paste into an Instagram bio. Even if it's ugly, even if it's a v0.1 — *the URL is the proof*.
- **[INFERENCE]** Within 7 days: she has shown the URL to one friend who said "wait, you built this?"
- **[INFERENCE]** Within 30 days: at least one booking has come through the form. (This is the *real* success metric; everything else is a proxy.)

#### Accessibility considerations
- **[INFERENCE]** Mobile-aware but does serious work on laptop. The split-screen workspace must assume 13-15" laptop screens — not 27" monitors. **A 50/50 split on a 13" MacBook = 600px panels, which is too cramped for a kanban + chat on the left.**
- **[INFERENCE]** Color contrast on the warm cream surface (#faf9f6) needs verification. Park UI + Panda defaults should be checked against WCAG AA at minimum.
- **[ASSUMPTION]** She is sighted, English-fluent, no major motor impairments. Default accessibility baseline (keyboard nav, focus rings, alt text) is sufficient for MVP. *This is a population assumption — not a personal one.*

---

### Persona 2 — Daria (19, student / content creator / side hustler) — *primary v3 audience, deferred use case*

**Status: Medium-confidence persona.** Productivity + freelance Reddit research touches her edges, but the product spec defers her use case (Reddit Scanner) past MVP.

#### Demographics & context
- **[EVIDENCE — spec]** 19, student, content creator, side hustler.
- **[INFERENCE]** Mobile-first life, laptop for serious work. Uses ChatGPT daily for school + content ideas. TikTok-native communication style. Probably has tried Capcut, Canva, ChatGPT, maybe Bolt once.
- **[INFERENCE]** Pays for *one* subscription at most. Cancels aggressively if not used in 7 days.

#### Jobs-to-be-done
- **[EVIDENCE — `discovery/ux-research.md`]** "70% of Gen Z use generative AI tools like ChatGPT weekly — far more than any other age group."
- **[INFERENCE]** "I want to make content faster without sounding like AI."
- **[INFERENCE]** "I want to monetize the side hustle but I don't have $99/mo to spend on tools."
- **[INFERENCE]** "I want to feel ahead of my friends, not behind."

#### Fears + failure modes
- **[EVIDENCE — `discovery/ux-research.md`]** "41% of Gen Z feel anxious about AI, 22% feel angry."
- **[EVIDENCE — `discovery/ux-research.md`]** "44% say a brand respecting their privacy is a top factor in earning trust."
- **[INFERENCE]** Past AI failures: tried Sora, paywalled. Tried Cursor, it asked her to install Node. Tried ChatGPT plugins, broke. The pattern is "the cool thing is always behind a wall."
- **[INFERENCE]** Deeper fear: looking dumb. She will *not* ask for help in a comment thread. She will silently bounce.

#### Success criteria
- **[INFERENCE]** Posts something on TikTok/IG with the caption "I built this in 20 min lol."
- **[INFERENCE]** Tells one friend who then signs up via her referral link.

#### Accessibility considerations
- **[INFERENCE]** Mobile-friendly preview is high-value for her even though the workspace is laptop. She will absolutely paste the preview URL into her phone to show people. The exported preview must be mobile-responsive *out of the box* — this is a P0 requirement that the backlog doesn't explicitly call out.

---

### Persona 3 — Jari (41, corporate operations manager) — *secondary, UTM-swap entry*

**Status: Low-confidence persona.** No corporate/B2B research in the existing files. Personality is largely inferred from the spec's "career FOMO" framing.

#### Demographics & context
- **[EVIDENCE — spec]** 41, corporate operations manager. Slow decision-maker. Reached through direct sales (per `CLAUDE.md`).
- **[INFERENCE]** Has a corporate laptop with restrictions. May not be able to install Chrome extensions. Uses Outlook + Teams. Uses ChatGPT in a personal browser tab.
- **[INFERENCE]** Pays for personal Notion or ChatGPT Plus out of pocket. Files it as "professional development."

#### Jobs-to-be-done
- **[EVIDENCE — spec narrative]** "AI is moving. The people who learn it now won't be replaced."
- **[INFERENCE]** "I need to be able to *demonstrate* I've built something with AI in my next performance review."
- **[INFERENCE]** "I want a side project I can show on LinkedIn without it looking like a hobby."

#### Fears + failure modes
- **[INFERENCE]** Past AI failures: corporate ChatGPT licence, overuse it, hit rate limits. Asked IT for Cursor, denied. Tried building in the browser, gave up at the first error message.
- **[INFERENCE]** Deeper fear: *being passed over by someone younger who learned AI faster*. This is the operative emotion. He is not curious; he is *afraid*.
- **[INFERENCE]** He will distrust anything that looks like a Gen Z product. The Drop terminology, the streetwear vibe, "ship #1" — these are hostile to him. **The UTM-swap (Decision 4 in `meldar-v3-decisions-needed.md`) must change at minimum: the hero copy, the FAQ, the milestone vocabulary, and probably the onboarding style picker default.**

#### Success criteria
- **[INFERENCE]** Has a working app deployed with a custom-looking domain (not a generic preview URL).
- **[INFERENCE]** Has one talking point for his next 1:1: "I'm building an internal tool that does X."
- **[INFERENCE]** Feels less afraid by the end of week 1.

#### Accessibility considerations
- **[INFERENCE]** Corporate eye-strain. Default font sizes likely too small for him at default zoom. Workspace must respect browser zoom up to 200% without breaking layout. (This is a baseline accessibility requirement but worth flagging because split-screen layouts are particularly fragile under zoom.)
- **[INFERENCE]** Likely uses keyboard shortcuts in Outlook/Excel — will *expect* them in Meldar. Even minimal hotkey support (cmd+enter to send prompt, cmd+k for command palette) raises perceived professionalism.

---

### Persona ranking for MVP focus

| Priority | Persona | Why |
|---|---|---|
| **1** | Katya | The locked first use case. Highest-confidence persona. Reddit freelance research is direct ground truth. Build the entire MVP UX around her. |
| **2** | Jari | Conversion potential is real (he can afford it and is afraid enough to commit). But his persona is mostly inferred. The UTM-swap is a low-risk way to test demand without building a separate product. |
| **3** | Daria | Locked-in for v3 *audience* but her use case is deferred. Her presence in MVP is to validate the *aesthetic* and *trust signals*, not to convert. |

> **Recommendation to founder:** Stop trying to design for all three. Design *every* MVP screen for Katya first. Test for Jari by reading what feels alienating. Daria is downstream; her use case is post-launch.

---

## Section 3 — Journey map: Katya, Landing → Ship #1 → Day 2 return

This is the operative journey. Every step is annotated with intent, emotional state, friction risk, and the explainer moment that should reduce cognitive load.

> **Note:** Drop-off severity is **inferred** from general SaaS funnel patterns and `discovery/ux-research.md` benchmarks (60% abandon on permission asks, 48% abandon without perceived value, 70% abandon if onboarding > 20 min). These are not Meldar-specific numbers — they need real measurement after launch.

---

### Stage 1 — Landing visit
- **Intent:** "What is this thing? Is it for me?"
- **Emotional state:** Skeptical, distracted, time-pressured. Probably came from a tweet or a friend share. **[INFERENCE]**
- **Friction:** The current v2 hero ("AI is eating the world. Your data fed it.") is data-reclamation framing. **For Katya, this lands sideways** — she doesn't think of herself as a data-reclamation person, she thinks of herself as a freelancer who needs a portfolio. **[INFERENCE — high confidence]**
- **Drop-off risk:** **HIGH.** Wrong-frame bounces are silent and instant.
- **Explainer needed:** *(deferred — separate v3 landing rewrite is owned elsewhere per task brief, but flag to whoever owns it: Katya needs to see the words "freelance," "portfolio," or "booking" in the hero or above the fold.)*

### Stage 2 — Signup (free tier)
- **Intent:** "OK I'll click 'see my report,' but I'm not committing to anything."
- **Emotional state:** Curious + guarded.
- **Friction:** Asking for email here is the first trust ask. Per `discovery/ux-research.md`: collect AFTER the user sees value. The current free-tier flow already does this (Pain Quiz first, then capture).
- **Drop-off risk:** Medium.
- **Explainer:** "We'll never email you more than once a week. Cancel anytime — one click."

### Stage 3 — Pain Quiz
- **Intent:** "Tell them what I'm struggling with so they tell me what to do."
- **Emotional state:** Engaged. This is the dopamine hit per `discovery/SYNTHESIS.md`.
- **Friction:** Low. The quiz is the existing strength of the product.
- **Drop-off risk:** Low.
- **Explainer:** None needed. The quiz IS the explainer.

### Stage 4 — Screenshot upload (Time X-Ray)
- **Intent:** "Show me where my time goes."
- **Emotional state:** Slightly nervous (uploading personal data) + curious.
- **Friction:** **The screenshot upload is currently positioned for the data-reclamation crowd, not for Katya.** Katya doesn't necessarily care about her Screen Time — she cares about *getting more clients*. We need to bridge: "Show me where you waste time → so we can build the thing that gets you back the hours."
- **Drop-off risk:** Medium-high. **Important:** Katya may legitimately not want to upload a screenshot. The flow must let her skip directly to the use-case selector ("I already know what I want to build → Landing Page + Booking").
- **Explainer:** "Screen Time is optional — it helps us recommend your best fix. If you already know what you want to build, skip ahead."
- **MISSING FROM BACKLOG [P0 RECOMMENDATION]:** Add an explicit "Skip — I know what I want" path in the discovery flow. The backlog assumes everyone goes through scan → recommendation. For Katya, that's a detour.

### Stage 5 — Recommendation reveal
- **Intent:** "Tell me what you'd build for me."
- **Emotional state:** Anticipation. **This is the moment the product earns or loses her.**
- **Friction:** If the recommendation feels generic ("you should build a productivity app!"), she bounces. If it feels specific ("based on your answers, here's your personal landing page + booking system, here's what it'll look like, here's what it'll do"), she leans in.
- **Drop-off risk:** **HIGH** if generic. **Low** if specific.
- **Explainer:** Show a *visual mock* of what her landing page will look like. Not a screenshot of someone else's — a placeholder with her name, her freelancer title, her colors if possible. Even if the actual build looks different, the placeholder commits her emotionally.
- **MISSING FROM BACKLOG [P0 RECOMMENDATION]:** "Personalized recommendation preview card" — this is the hand-off from free to paid. Currently the backlog says "produce one clear recommendation → roadmap preview" but doesn't specify visual personalization. **Without it, the conversion math breaks.**

### Stage 6 — Roadmap preview (the upgrade trigger)
- **Intent:** "How long is this going to take? Is it a course? I don't want a course."
- **Emotional state:** Evaluating cost vs. benefit.
- **Friction:** **Critical.** If the 8-step roadmap looks like a curriculum (Step 1: Learn HTML, Step 2: Learn CSS...), she runs. It must look like a *project plan* — "1. Pick your colors, 2. Add your services, 3. Connect a calendar, 4. Ship it."
- **Drop-off risk:** Medium-high.
- **Explainer:** "These aren't lessons. Each step ships something real. By Step 4 you have a working booking link to share."

### Stage 7 — Paywall
- **Intent:** "Is EUR 19 worth it?"
- **Emotional state:** Calculating. Comparing to Canva, Squarespace, Notion.
- **Friction:** Two specific things kill conversion here:
  1. **Subscription dread.** Even at EUR 19, "monthly" hurts more than "one-time."
  2. **Token anxiety.** "500 tokens" is a number she has no intuition for. Is that 5 actions or 50?
- **Drop-off risk:** **HIGH.** This is the largest single drop-off in the funnel.
- **Explainer needed:** Translate tokens into outcomes. "500 tokens = ~150 prompts = enough to build, polish, and re-deploy your landing page 10+ times."
- **MISSING FROM BACKLOG [P0 RECOMMENDATION]:** "Token-to-action translator" — at every place tokens are mentioned, show the equivalent in *actions she will recognize*. Not "3 tokens." Always "3 tokens — about one design tweak."
- **Note on the EUR 79 escape hatch:** Don't surface it on the paywall itself — it cannibalizes Builder. Surface it later, contextually, when she gets stuck (see Stage 13).

### Stage 8 — Payment
- **Intent:** "Take my money quickly so I don't change my mind."
- **Emotional state:** Mild buyer's remorse forming.
- **Friction:** Stripe checkout is solved. The remorse is real but architectural — the *next* screen has to instantly reward the purchase.
- **Drop-off risk:** Low *during* checkout, **high** *immediately after*. Post-paywall valley.

### Stage 9 — First workspace entry
- **Intent:** "OK I paid. Show me what I bought."
- **Emotional state:** **The most fragile moment in the entire journey.** She has paid. She is now asking, internally, "did I just waste EUR 19?"
- **Friction:** The split-screen workspace will look intimidating. Two panels. A kanban with cards. A live preview iframe loading. Multiple buttons. It's a lot.
- **Drop-off risk:** **HIGHEST POST-PAYMENT risk in the journey.**
- **Explainer needed:** A 3-step micro-tour. Not a tooltip pile. Three sentences:
  1. "On the right is your app. It's already running."
  2. "On the left is your plan. Each card is a feature."
  3. "Click any card to change it. Click Build when you're ready."
- **MISSING FROM BACKLOG [P0 RECOMMENDATION]:** "Pre-built kanban + pre-loaded preview on first workspace entry." The user must walk into a workspace where *the preview is already showing a starter version of their app*. Empty state = death. The starter (irka) must be deployed and live in the iframe before she lands.

### Stage 10 — Onboarding style picker (Drop / Recipe)
- **Intent:** Honestly, she just wants to skip this.
- **Emotional state:** "Is this a quiz? I just paid you."
- **Friction:** Adding *any* gate before the workspace at this fragile moment is risky.
- **Drop-off risk:** Medium.
- **Recommendation:** **Move the style picker to BEFORE the paywall, not after.** Put it at the end of the recommendation reveal — it doubles as a soft commitment ritual. After payment, she goes *straight* to a populated workspace.

### Stage 11 — First kanban interaction
- **Intent:** "Let me read what's on this kanban and figure out what I'd change."
- **Emotional state:** Curious. Lower stakes — she's just reading.
- **Friction:** If kanban cards are pre-filled with technical jargon ("Configure routing," "Add metadata"), she's lost. If they're outcomes ("Add your services list," "Pick your colors," "Connect a Cal.com link"), she's home.
- **Drop-off risk:** Low if cards are well-written.
- **Explainer:** Each card has a 1-sentence explainer of what it does to her live preview. Per spec — but it must be enforced ruthlessly. **No card may exist without an explainer.** Add this as a P0 acceptance criterion.

### Stage 12 — First Build (the big moment)
- **Intent:** "I clicked Build. What now?"
- **Emotional state:** **Anticipation + anxiety.** She is committing tokens. The cost is real.
- **Friction:** If Build takes more than 30 seconds with no feedback, she will tab away to Instagram and not come back this session. **This is the highest-impact technical UX issue in the product.**
- **Drop-off risk:** **HIGH** if streaming UX is poor. **Low** if the user sees continuous activity (token spend ticking, log lines streaming, "writing component...", "deploying..." etc.)
- **Explainer needed:** Real-time streaming of activity, in human language. Not stack traces. "Adding your services section..." "Wiring up the booking calendar..." "Almost done — deploying..."
- **MISSING FROM BACKLOG [P0 RECOMMENDATION]:** "Streaming Build progress with human-readable phases." The backlog mentions "progress streaming" but doesn't specify the *language* layer. The orchestrator must translate technical phases into Katya-readable verbs. This is a writing job, not just an engineering one.

### Stage 13 — Live preview reveal
- **Intent:** "Is it actually mine?"
- **Emotional state:** **The dopamine moment.** This is what she paid for.
- **Friction:** If the preview shows a generic template that doesn't reflect anything she chose, the moment is lost. The first build *must* visibly include at least one thing she personally specified — her name, her services, her colors, *something*.
- **Drop-off risk:** Low if the moment lands. **Catastrophic** if the preview looks generic.
- **Explainer:** "This is your app. It's running on a real URL (link). Try it on your phone."
- **MISSING FROM BACKLOG [P0 RECOMMENDATION]:** "QR code to view preview on phone" — Katya will absolutely want to show this to a friend on her phone in the next 5 minutes. Make it trivial. This is also the foundation of the viral hook.

### Stage 14 — First iteration
- **Intent:** "Let me change one thing and see it work."
- **Emotional state:** Empowered + curious.
- **Friction:** This is the cause-and-effect moment from Pillar 3 of the spec. The iteration must be *fast* — under 60 seconds round-trip. If the second build is slower than the first (because the first was warm-cached), she will think the product is breaking.
- **Drop-off risk:** Low if responsive. Medium if slow.

### Stage 15 — Ship #1 unlock (achievement moment)
- **Intent:** Show off. Tell people. Save the URL.
- **Emotional state:** Pride. *This is the share trigger.*
- **Friction:** The shareable certificate / Data Receipt v2 must be designed for screenshot, not click. Most shares will be screenshots of the "Ship #1" card pasted into a friend's DM, not formal social posts.
- **Drop-off risk:** N/A — this is the success state. But poor design here costs viral coefficient.
- **Explainer:** "You shipped your first thing. The URL is yours forever. Share it."
- **MISSING FROM BACKLOG [P0 RECOMMENDATION]:** "Ship #1 card optimized for vertical screenshot (Instagram Story / iMessage paste)." The backlog calls for a shareable certificate but doesn't specify the *format that Katya actually shares in*. She does not tweet. She iMessages and IG-stories.

### Stage 16 — Day 2 return
- **Intent:** Open the workspace, see what's new, do something small.
- **Emotional state:** Cautious. Will the magic still be there?
- **Friction:** **The single biggest cause of Day 2 dropout is forgetting where she left off.** The workspace must open with: (a) her preview already loaded, (b) a clear "what to do next" card, (c) any tokens she earned overnight (50/day refill) visibly added.
- **Drop-off risk:** **HIGH.** General SaaS Day 2 retention is brutal.
- **Explainer:** "Welcome back. You shipped yesterday. Here's the next one." Plus a notification that she has fresh tokens.
- **MISSING FROM BACKLOG [P0 RECOMMENDATION]:** "Day 2 return state" — explicit landing screen / treatment when a user returns within their first week. The backlog has an email touchpoint (Task #35) but no in-app return state. Do both.

---

## Section 4 — Feature requirements with justifications

> Priority key: **MH** = Must-have for MVP, **SH** = Should-have, **CH** = Could-have, **WH** = Won't-have for MVP.
> **"Must-have" means:** if we cut this, Katya will not complete Ship #1, and the whole product proposition collapses. Use sparingly.

### Area A — Workspace shell (the foundation)

| Feature | Priority | User need | Justification |
|---|---|---|---|
| **Split-screen layout, always-visible preview** | **MH** | "Show me what I'm building, not what I'm typing." | Pillar 1 of the spec. Without it, this is just another chat AI. The preview IS the product proposition. |
| **Pre-loaded starter app in preview on first entry** | **MH** | "I just paid — show me something instantly." | Empty state at the post-paywall moment is the highest-leverage place to lose a paying user. The irka starter must be deployed before she enters. |
| **Workspace responsive on 13" laptop (1280px wide)** | **MH** | "I work on my MacBook." | Katya is laptop-only. If split-screen breaks at 1280px, the whole MVP audience is locked out. *Coordinate with `ux-architect` on breakpoints.* |
| **Live preview controls (refresh, open in new tab, view on phone via QR)** | **MH** | "Let me show this to a friend right now." | The QR code is the viral hook. The "open in new tab" is the ownership signal. Both unlock pride. |
| **Live preview "view logs" / "what's happening"** | **SH** | "Why is it broken?" | When (not if) builds fail, she needs *some* signal. Doesn't need a debugger — needs a one-line "this card couldn't run because X. Try this." |
| **Pause / cancel a Build mid-run** | **SH** | "I changed my mind, stop." | Cancelling builds saves tokens. Without it, an accidental Build click costs her 20+ tokens and trust. |

### Area B — Kanban as spec language

| Feature | Priority | User need | Justification |
|---|---|---|---|
| **Pre-filled kanban template for the use case** | **MH** | "I don't know where to start." | Without a starting kanban she stares at a blank board. The irka template must come with 8-12 pre-filled, well-written cards. |
| **Card drag-and-drop / reorder** | **MH** | "I want to do this thing first." | Reordering IS the planning act. It's the central interaction. |
| **Card editing (title, description)** | **MH** | "I want to make this card mine." | Otherwise the kanban is read-only and feels like a worksheet. |
| **Card-level explainer (1-2 sentences)** | **MH** | "What does this card actually do to my app?" | Without it, she cannot understand the kanban without watching a tutorial. Hardcoding kills the learning loop. |
| **Card mandatory vs. optional marking** | **SH** | "What's required, what's nice-to-have?" | Removes paralysis. Lets her focus on the must-haves before iterating. |
| **Card priority / importance tagging** | **CH** | (lower urgency) | She has a kanban order; explicit priority tags are redundant for MVP. |
| **Add new card from blank** | **MH** | "I want a thing the template didn't include." | Without this, she's stuck inside the template. Lock-in feels infantilizing. |
| **Add new card from "suggest a feature"** | **SH** | "I want it to do X but I don't know how to phrase it." | Haiku-powered suggestion turns vague intent into a card. Removes blank-page anxiety. Cheap (Haiku). |
| **Delete card** | **MH** | "I don't want this part of the app." | Obvious. Without it, the template is permanent. |
| **Card status (todo / in-progress / built / failed)** | **MH** | "Where am I in this?" | The visible state machine from Backlog #8. Critical for Day 2 returners. |
| **Bulk Build (build multiple approved cards at once)** | **WH** | (efficiency) | Premature for MVP. One card at a time is safer for token control and learning. Add post-launch. |

### Area C — Build & execution

| Feature | Priority | User need | Justification |
|---|---|---|---|
| **Build button (one-click trigger from kanban)** | **MH** | "I'm ready, do the thing." | The central commit action. The product proposition. |
| **Streaming build progress, human-language phases** | **MH** | "Is it working? How long?" | If Build is opaque for 90+ seconds she tabs away and may not return. Streaming activity is the difference between "AI is broken" and "AI is working hard for me." |
| **Token cost displayed BEFORE Build click** | **MH** | "How much will this cost me?" | Without upfront cost, every Build feels like a slot machine. Trust collapses fast. |
| **Approval checkpoint before expensive (>10 token) actions** | **MH** | "Confirm before you spend my money." | From Backlog #11. Critical for trust and cost control. |
| **Undo / rollback a Build** | **SH** | "I broke it. Take me back." | The fear of breaking things is the #1 reason non-technical users freeze. A visible Undo unlocks experimentation. |
| **Build queue visibility** | **CH** | "Where am I in line?" | Only matters under load. MVP probably won't have load. Defer. |

### Area D — Learning layer

| Feature | Priority | User need | Justification |
|---|---|---|---|
| **Inline 1-2 sentence explainers (everywhere)** | **MH** | "What just happened?" | Pillar 3 of the spec. Without these, the platform is a black box. With them, she's a builder. |
| **"What just happened?" micro-card after each AI action** | **MH** | "Tell me why it did that." | Builds intuition. Cheap to write (template + variable filling). Critical for the learning promise. |
| **Prompt anatomy side panel** | **SH** | "What makes a good prompt?" | Valuable for retention but not critical for Ship #1. Many users won't open it on Day 1. |
| **"Improve my prompt" Haiku widget** | **SH** | "Make my prompt better." | High-leverage for learning. Cheap. But not blocking Ship #1. |
| **Concept sidebar / glossary** | **CH** | "What does 'route' mean?" | Nice but Wikipedia exists. Defer. |

### Area E — Token economy & cost visibility

| Feature | Priority | User need | Justification |
|---|---|---|---|
| **Token balance, persistent in workspace chrome** | **MH** | "How much do I have left?" | Without it she lives in fear of spending. The visible counter is reassurance, not anxiety. |
| **Token-to-action translator (everywhere tokens appear)** | **MH** | "What does 3 tokens actually buy me?" | "3 tokens" means nothing to her. "3 tokens — about one design change" means everything. Cheapest, highest-leverage UX writing in the entire MVP. |
| **Daily earn cap (50/day) visible + animated when earned** | **SH** | "I'm being rewarded for coming back." | Reinforces the daily return loop. Without animation, the refill is invisible. |
| **Cost ceiling soft wall ("You've used today's compute")** | **MH** | (founder need: protect margins) | From Backlog. Critical for unit economics. Must be phrased gently. "You've used today's compute. Come back tomorrow, or unlock more for 20 tokens." |
| **Per-action cost shown on hover/before commit** | **MH** | "How much does this one cost?" | Token counter alone isn't enough — she needs per-action cost to reason about choices. |

### Area F — Roadmap & milestones

| Feature | Priority | User need | Justification |
|---|---|---|---|
| **Visible roadmap / Drop tracker** | **MH** | "How far am I?" | The aspirational anchor. Pillar 4 of the spec. Without it, the product feels like an endless chat. |
| **Ship #1 unlock moment (achievement)** | **MH** | "I want proof I did the thing." | The peak emotional moment of the journey. Ship #1 IS the product success metric. |
| **Shareable certificate / Skills Receipt v2** | **MH** | "Show off." | Drives viral. Format must be screenshot-friendly, not click-share-friendly. |
| **Future milestones visible but greyed** | **SH** | "What's next? Aspiration." | Anchors retention. Without future milestones she has no reason to come back after Ship #1. |
| **Streak tracker** | **CH** | "I came back 3 days in a row." | Streaks are powerful but the spec deprioritizes gamification. Test before adding. |

### Area G — Onboarding & first-run

| Feature | Priority | User need | Justification |
|---|---|---|---|
| **Onboarding style picker (Drop / Recipe), placed PRE-paywall** | **MH** | "How do you want to talk to me?" | Per spec. **Recommendation: move BEFORE paywall, not after** — see Stage 10 of the journey map. |
| **3-step micro-tour on first workspace entry** | **MH** | "What am I looking at?" | The fragile post-paywall moment. Three sentences only. No sticky-tooltip pile. |
| **Personalized recommendation preview card (pre-paywall)** | **MH** | "Show me what you'll build for me." | The conversion lever. Without personalization, the recommendation is generic and the paywall fails. |
| **"Skip the discovery" path for users who know what they want** | **SH** | "I'm here for the landing page builder, not a quiz." | Katya may not need or want the Time X-Ray. Forcing her through it costs conversion. |

### Area H — Referral & viral

| Feature | Priority | User need | Justification |
|---|---|---|---|
| **Referral link generation + copy button** | **MH** | "Share so I earn tokens." | Day-1 referral earning is the spec's growth mechanism. |
| **Referral dashboard widget** | **SH** | "How many people did I bring?" | Social proof loop. |
| **In-Ship-#1-card referral CTA** | **MH** | "Tell a friend, get tokens." | Highest-intent moment to ask for a referral. Skipping this is leaving the viral loop on the table. |

### Area I — Escape hatches

| Feature | Priority | User need | Justification |
|---|---|---|---|
| **Done-for-me / Skip-the-Line button (contextual)** | **MH** | "I'm stuck. Help me." | The safety net. **Must NOT appear on the paywall** (cannibalizes Builder). Should appear after a failed Build or 30+ minutes of inactivity. |
| **Contact-me error handler** | **MH** | "Something broke. Tell me a human will help." | Per locked decisions: no refunds, contact form instead. The phrasing must convey "a real person will read this," not "your ticket has been received." |
| **Export project (ownership)** | **SH** | "Is it really mine?" | The ownership promise of the spec. Doesn't have to be one-click for MVP — a manual export request that triggers a founder action is enough at < 50 users. |

### Area J — Day 2+ retention

| Feature | Priority | User need | Justification |
|---|---|---|---|
| **Day-2 return-state landing in workspace** | **MH** | "Where did I leave off?" | Without this, returning users land on a confusing screen and bounce. Highest-leverage retention feature. |
| **Email Day 1 nudge: "Your app is waiting"** | **MH** | "Reminder, you have something unfinished." | Per Backlog #35. Critical for Day 2 returns. |
| **Token refill notification (in-product)** | **SH** | "You earned 50 tokens overnight." | The daily-return loop requires visible reinforcement. |

### Features mentioned in the prompt but downgraded

- **Card priority/mandatory marking** — *Should-have*, not Must. Mandatory cards in the template are baked in by the template author; user-driven priority is post-MVP.
- **Card drag-and-drop reorder** — *Must-have*, but more important for the kanban-as-spec mental model than for actual workflow optimization.
- **Streak / daily return loop** — *Could-have*. Streaks are powerful but the spec's anti-Duolingo positioning makes them risky tonally. Test post-launch.

### Critical features the backlog is missing

1. **Personalized recommendation preview card** (pre-paywall, with placeholder versions of what we'll build for *her* specifically)
2. **Token-to-action translator** (everywhere a token cost appears)
3. **Skip-the-discovery path** (for users who already know what they want)
4. **QR code for preview-on-phone** (the viral mechanic)
5. **Day-2 return-state landing screen** (in-product, not just email)
6. **Streaming build progress in human language** (translation layer over orchestrator phases)
7. **Pre-deployed starter app on first workspace entry** (no empty states, ever)
8. **Onboarding style picker BEFORE paywall** (currently spec'd as after)
9. **Mobile-responsive preview as a P0 build constraint** (the irka template must be responsive out of the box because users will share to phones)
10. **Ship-#1 card optimized for vertical screenshot format** (not generic OG image)

---

## Section 5 — Friction hotspots ranked by severity

Top 10 places Katya will drop off if we don't intervene. Severity = Drop-off probability × Cost of losing that user at that stage. Inferred from general SaaS patterns + `discovery/ux-research.md` benchmarks.

| # | Hotspot | Severity | Specific intervention |
|---|---|:---:|---|
| **1** | **Post-paywall first-screen intimidation** (Stage 9) | CRITICAL | Pre-deployed preview + 3-sentence micro-tour + populated kanban. No empty states. |
| **2** | **Build button click → silent 60+ seconds** (Stage 12) | CRITICAL | Streaming progress with human-readable phases. Visible token meter ticking. "What's happening" log line every 3-5 seconds. |
| **3** | **Generic recommendation pre-paywall** (Stage 5) | CRITICAL | Personalized preview card with her name/inputs reflected back. Show, don't tell, what she'll get. |
| **4** | **Token cost = slot machine anxiety** (Stages 7, 12) | HIGH | Token-to-action translator everywhere. "3 tokens = ~one design change." |
| **5** | **Day 2 confusion: where did I leave off?** (Stage 16) | HIGH | In-app return-state screen + email Day-1 nudge. The workspace remembers. |
| **6** | **Wrong-frame landing copy for Katya** (Stage 1) | HIGH | (Owned by separate v3 landing rewrite, but flag: she needs to see "freelance," "portfolio," or "booking" above the fold.) |
| **7** | **Failed Build with technical error** (Stage 12) | HIGH | Translate errors to human language. Always show a "Try X" remediation. Surface Done-for-me here, not on paywall. |
| **8** | **Onboarding style picker AFTER payment** (Stage 10) | MEDIUM-HIGH | Move BEFORE paywall. Doubles as soft commitment. Workspace should be 100% populated when she lands. |
| **9** | **Live preview is generic on first reveal** (Stage 13) | MEDIUM-HIGH | Build #1 must include at least one personal element she specified (name, color, services). The starter must be dynamically personalized, not a static template. |
| **10** | **Roadmap looks like a curriculum, not a plan** (Stage 6) | MEDIUM | Step labels are outcomes ("Add your services") not lessons ("Learn about routing"). Banish the word "lesson." |

---

## Section 6 — Open research questions

These cannot be answered from the spec alone. They need actual user interviews — minimum 5 founding members, ideally 10 — before launch.

1. **Does Katya understand "kanban" without prior exposure?** The product treats kanban-as-spec as the central concept. Trello and Notion have normalized the metaphor for office workers, but a 24-year-old freelance creative may have never used either. *Test:* show her the empty kanban shell and ask "what is this?"
2. **What does Katya call the thing she's building?** "App"? "Site"? "Page"? "Tool"? The product currently uses "app" but Katya may say "site." Vocabulary alignment is a free conversion lever.
3. **How long is "too long" to wait for a Build?** Industry says <3 seconds for a click, <30 seconds for a major action, <2 minutes for batch operations. But this varies by perceived value. *Test:* run wizard-of-oz builds at 30/60/90/120 second durations and measure perceived satisfaction.
4. **Does the EUR 19/mo price feel like a tool subscription or a service subscription?** This dramatically changes how she values a Build that fails (for a tool she shrugs; for a service she rage-quits).
5. **Does the "Drop" terminology feel native or cringe to Daria/Katya?** The spec recommends "Drop" but flags risk. *Test:* show two versions of the same UI (Drop vs. Recipe) to 5 users each and measure self-reported reaction + completion rate.
6. **What is the actual referral trigger moment?** The Ship #1 card is the obvious answer but maybe she shares earlier — at the "wow it's actually mine" moment of first preview reveal. *Test:* track when shares organically happen vs. when prompted.
7. **Will Katya pay before seeing her preview?** Or does she need to see *her* preview (not a generic one) before EUR 19 feels real? The current funnel asks her to pay before any personalized output. *Test:* AB the paywall position — before vs. after first preview reveal.
8. **How much trust does the "Time X-Ray" cost vs. add for Katya?** She might not care about her time and find the screenshot upload weird. *Test:* dual paths (with-X-Ray vs. skip-X-Ray) and measure conversion + retention.
9. **What does Jari actually need to convert?** No corporate research exists. Before investing in /teams page or UTM-swap copy, talk to 3-5 actual corporate ops managers.
10. **Does the live preview iframe inside an iframe (Cloudflare sandbox) trigger any browser-security warnings or feel-like-a-scam moments?** Some users get nervous when they see "this is running on a different domain." *Test:* explicit screen recording + think-aloud during first build.

---

## Section 7 — Testable hypotheses + success metrics

For each MVP Must-have, here is a falsifiable hypothesis with a specific measurement. These should drive analytics events (cross-reference Backlog #27).

### H1 — Pre-deployed preview prevents post-paywall drop
**Hypothesis:** If the workspace shows a deployed, working starter app in the preview iframe within 5 seconds of first entry, > 80% of paying users will reach the kanban interaction (vs. baseline ~50% for empty-state landings).
**Measurement:** `workspace_entered` → `kanban_card_clicked` within 60 seconds. Target: 80% conversion.
**Falsified if:** < 60% of users interact with the kanban in their first session despite the pre-deployed preview.

### H2 — Token-to-action translator reduces cost anxiety
**Hypothesis:** Users shown "3 tokens — about one design change" instead of "3 tokens" will run their first paid Build within 10 minutes of workspace entry at > 70% rate (vs. < 40% baseline).
**Measurement:** `workspace_entered` → `first_build_started` < 600 seconds. Target: 70%.
**Falsified if:** First-build completion rate is the same with and without translator.

### H3 — Streaming build progress prevents tab-away abandonment
**Hypothesis:** When Build operations stream human-readable progress, > 85% of users wait for the build to complete without backgrounding the tab. Without streaming, the rate drops below 50%.
**Measurement:** `build_started` → `build_completed_in_foreground`. Target: 85% in-foreground completion.
**Falsified if:** Tab-away rate is unaffected by streaming verbosity.

### H4 — Ship #1 unlock triggers immediate share intent
**Hypothesis:** > 30% of users who unlock Ship #1 will click the share / copy-link / referral button within 60 seconds of unlock.
**Measurement:** `ship_1_unlocked` → `share_clicked` or `referral_link_copied` < 60 sec. Target: 30%.
**Falsified if:** < 15% share within an hour.

### H5 — Day 2 return-state screen lifts retention
**Hypothesis:** Users who return to a workspace with a clear "where you left off" + fresh-tokens notification will have a > 50% Day 2 → Day 3 retention rate. Without the return state, < 25%.
**Measurement:** Returning user lands → completes one action (click any kanban card or run any prompt) within 5 minutes. Target: 50%.
**Falsified if:** Day 2 retention is unchanged by the return-state UI.

---

## Section 8 — Cross-references to ux-architect-spec.md

> **Update 2026-04-06:** `ux-architect-spec.md` is now complete (1451 lines). This section answers each of the architect's open questions (§11 of their spec) and flags the spec choices where research says to amend. Per the architect's stated conflict rule, *"what users need"* wins over *"how to structure implementation."*

### 8.0 Architectural implications I sent before reading the spec

These were sent to `ux-architect` early (see message sent 2026-04-06). All six are still valid and are now incorporated into their spec or acknowledged as pending:

1. **13" laptop is the lower bound, not 15".** Split-screen breakpoints must work at 1280px wide. — *Addressed in §2.2, `lg` breakpoint 1024–1279px.*
2. **Build streaming UX is technical + a translation layer.** The orchestrator emits technical phases; user needs human-readable phases. — *Addressed in §4.1 step 4; the translation layer needs to be a separate writing job (not yet owned).*
3. **Day-2 return state is a distinct screen.** — *Not yet explicitly in the spec. **Gap to flag.***
4. **Kanban must be fully extensible** (add/edit/delete/reorder/status). — *Addressed in §3, §4.2, §4.6.*
5. **Token-cost UI needs a translator everywhere.** — *Partially addressed (§3.7) but still shows model names. See Q-9 below.*
6. **QR code for preview-on-phone.** — *Not yet in the spec. **Gap to flag.***

### 8.1 Direct answers to architect's open questions (§11 of their spec)

| Q | Architect's question | My answer | Confidence | Action |
|---|---|---|---|---|
| **Q-1** | Do users return on mobile? | **Yes, frequently, but for two specific purposes only.** Katya returns on mobile within the first 24 hours to *show the preview URL to a friend or a prospect*. Daria returns on mobile to *check if her referral link got a click*. Neither will try to edit cards on mobile. The architect's read-only fallback is directionally correct, but the read-only view should be **optimized for showing the preview big**, not the kanban big. **Also:** add an explicit QR code in the desktop preview controls — Katya will use it within minutes of her first Ship #1. [INFERENCE — medium-high; mobile share behavior is well-documented in Gen Z product research] | Medium-high | Flip §2.3 layout: preview full-width top, kanban collapsed accordion below. Add QR to desktop preview controls per my "architectural implications" #6 above. |
| **Q-2** | Kanban grouped by Drop or by Status columns? | **Drop — architect is right.** Three reasons: (1) Non-technical users who haven't used Jira/Trello don't default to Todo/Doing/Done. (2) The spec's Pillar 4 locks roadmap + milestones as a differentiator; grouping by Drop reinforces that structure — status columns would fragment it. (3) Katya's mental model is "what am I shipping next," not "what's in progress." The per-card status pill (§3.2) carries the state information without fragmenting the visual hierarchy. [INFERENCE — high confidence for non-technical audience. Residual risk: users who DO know Trello may expect columns; the status pill mitigates this.] | High | **Keep §3.5 as-is. Do not rework.** |
| **Q-3** | Chat panel: tab vs. collapsible bottom? | **Collapsible bottom-of-left-pane is correct for MVP.** A tab makes chat equivalent to kanban, implying users must choose — doubles cognitive load at exactly the wrong moment. Bottom-collapsible keeps chat as an occasional escape hatch, which is what it should be. The kanban IS the product; chat is for things that don't fit in a card. [INFERENCE — high confidence, rooted in the spec's "kanban IS the spec language" positioning] | High | Keep current architecture. |
| **Q-4** | On build failure, show last-good or diff? | **Last good, full stop.** A diff view is a developer affordance. Katya doesn't want to see "what broke" — she wants to see "my app still works, I can try again." Showing broken state, even with a diff overlay, triggers the self-blame failure mode that made her quit Bolt/Lovable. The bottom-bar "Something broke. [Try again]" is enough. [INFERENCE — high confidence, directly addresses documented persona failure mode] | High | Keep §4.1 step 6. |
| **Q-5** | Lock preview URL by default? | **Yes — architect is right.** Katya will navigate into `/booking` to test the calendar form, then click Build. Without the lock, Build sends her back to `/` and she loses her place. This is exactly the "am I working in a broken system?" moment that kills trust. Architect's call is correct. **One refinement:** the lock state should be visually prominent, and after a deliberate unlock, show a brief toast ("Preview will follow builds") so she understands the state change. [INFERENCE — high confidence, rooted in avoiding the "broken system" failure mode] | High | Keep §4.8. Add the visible lock-state affordance + unlock toast. |
| **Q-6** | Token debit animation: tick every digit or jump in 10s? | **Every digit, smooth via rAF — architect is right.** Discrete jumps feel arbitrary. Smooth ticking feels like real money being spent, which is good — it creates calibration. Aligned with decision log #9 (tabular-nums). Caveat: cap animation duration at 800ms on large debits so it never feels laggy. [INFERENCE — medium confidence] | Medium | Keep as-is, add ≤800ms animation cap. |
| **Q-7** | Explainer suppression per-key? | **Yes, dismiss-per-key-per-user — with one critical separation.** Non-technical users who see "This is pagination" three times start reading it as noise. Show-once is correct for static card-level explainers. **But** the "What just happened?" toast after a successful Build is NOT an explainer in this sense — it's a post-action receipt and should fire every time. **Separate the two:** (a) static explainers (show once per key, suppress after dismiss); (b) dynamic build-completion summaries (show every time). [INFERENCE — medium confidence, this separates two UX patterns that the current spec conflates] | Medium | Split the concept in §3.6 and §4.1 step 5. |
| **Q-8** | Card editing modal vs. inline? | **Modal-first is right, with one amendment: allow inline rename on title double-click only.** Katya needs to rename a card in 2 seconds without an interruption. The modal is correct for the spec-heavy fields (description, acceptance, dependencies). But the title is high-frequency, low-stakes — double-click the title to rename inline, enter to save, esc to cancel. This preserves the "am I editing?" clarity for substantive edits while removing friction on the most-common rename. [INFERENCE — high confidence; modal-only for every rename feels stilted] | High | Amend §4.2 to add title-double-click inline rename. All other card editing stays modal. |
| **Q-9** | Show Sonnet/Opus/Haiku or fast/medium/heavy? | **Neither. Show outcome-framed descriptors.** Katya doesn't care that Sonnet is medium — she cares what a number *buys* her in *minutes and output*. Model names are noise. "fast/medium/heavy" is better but still abstract. Use **"quick change"**, **"build a section"**, **"heavy feature"** — this is the token-to-action translator from my main findings Section 4 Area E and surprise #2. [EVIDENCE — my main findings, Section 10 surprise #2] | High | **Revise §3.1 card schema and §3.7 token display.** Drop model names from user-visible UI. Add outcome-framed cost labels. |
| **Q-10** | Drop vs. Run vs. Ship? | **Ship Recipe-only for MVP.** Do not ship a second onboarding style in MVP. Do not commit to Drop/Run/Ship vocabulary in user-visible copy yet. Use plain English: "Batch 1," "Batch 2," or "Next up" / "Later." This cuts an open decision AND a code path. Post-launch A/B once real users exist. [EVIDENCE — my main findings Section 9 scope cuts] | High | **Founder decision needed.** Defaulting to Recipe-only + plain English labels is safest. |
| **Q-11** | Orchestrator chat: conversational + build commentary, or commentary-only? | **Both — but the commentary is ALWAYS ON, and the conversational input is a collapsible affordance inside the same surface.** One panel, two modes, one clear visual distinction. Commentary is passive consumption (default). Conversational input is an "Ask Meldar" bar at the bottom that expands into a text input. **Do not make the user switch modes** — commentary and conversation can coexist vertically. When a build is streaming, disable the conversational input temporarily with a tooltip "Building... back in a moment." [INFERENCE — medium confidence, two distinct user intents need visual differentiation in the same surface] | Medium | Keep §5.1 `orchestrator-chat/` structure. Add an interaction spec for "passive log vs. active input" state co-existence. |
| **Q-12** | Delete built card (and its code) or only rework? | **Both — but deletion requires approval.** Katya will want to delete things she regretted; locking to rework-only infantilizes her and breaks the ownership promise. **But** deleting a built card means deleting deployed code, which costs tokens and can break dependent cards. Deletion must: (a) show dependency warnings, (b) require typed confirmation for high-cost deletions, (c) default to a "soft delete" (archive to Shipped group). Undo/rollback (§4.7) handles regret cases. [INFERENCE — high confidence, rooted in ownership promise] | High | Amend §3.1 card schema to add `archived` status. Keep delete as a path with a confirmation checkpoint. |

### 8.2 Spec choices I'd amend even though the architect didn't ask

1. **§2.8 empty state "No cards on board"** says it opens a chat with a primer prompt. **This empty state should never happen in MVP.** The template always pre-fills cards. If all cards are deleted, show a "Reset to template?" card instead of a blank board. An empty board is a trap the user shouldn't be able to fall into.
2. **§2.6 loading copy "usually 2-4 seconds"** — this must be verified against the Cloudflare Sandbox spike (Task #3). Don't commit to a timing promise the infrastructure can't keep. Coordinate with whoever owns the sandbox spike before copy lockdown.
3. **§2.7 error copy uses "sandbox hiccup" and "slow to wake up"** — "hiccup" is infantilizing. Prefer: "Your app couldn't start. Let's try again." And "Still warming up — usually takes 5–10 seconds more."
4. **§3.5 Drop header** shows "6 cards · ~120 tokens · 4 required." **Add estimated time-to-ship:** "6 cards · ~120 tokens · ~15 minutes." Time is more legible to Katya than tokens for her "is this worth it?" calculation.
5. **§4.1 step 5 "ShareCertificateModal after 1.5s delay"** — 1.5s is too slow. The dopamine moment is *immediate*. Fire at ≤300ms. And it should feel like a celebration (subtle animation, particle effect, pride), not a dialog box. "Modal" is the wrong word; it's a celebration overlay that can be dismissed or shared from.
6. **§4.5 approval checkpoint threshold at ≥10 tokens** — consider adaptive: **≥6 tokens for first-time users, ≥10 tokens after first successful Build.** First checkpoint is teaching, not protection. Follow-up work; not MVP-blocking.
7. **§6.2 typography** — please ensure body copy at default zoom is ≥16px. Jari will have small-text pain; Katya won't notice but won't suffer either.
8. **§4.9 keyboard shortcuts** — great list, add `Cmd+Z` for "undo last build" to match §4.7.

### 8.3 Two gaps in the architect spec that my main findings flagged as P0

These are MUST-HAVEs from my feature prioritization (Section 4) that are **missing or only implied** in the architect's spec. Please incorporate:

1. **Day 2 return-state screen** — a distinct landing surface when a user returns to their workspace within the first week. "Where you left off" + fresh tokens + next-up hint. Not a modal, not a banner — a screen. This is H5 in my hypothesis section and is the highest-leverage retention feature. The architect spec has `loading states` and `error states` but no `return-state`. Please add.
2. **QR code for preview-on-phone** — the viral mechanic for Ship #1. Katya will show her friend on the phone within minutes. Architect spec §4.8 has "Open in new tab" but not QR. Please add as a persistent affordance in the preview controls bar.

### 8.4 Points where researcher and architect fully agree

For the record — strong alignments. Should NOT be revisited:

- Split-screen, always-visible preview
- Pre-deployed starter on first workspace entry (surprise #1)
- Build button bottom-bar placement (closest peripheral to the action surface)
- Token cost shown in 3 places (architect decision #14, my Section 4 Area E)
- Iframe never unmounts (decision #5 — critical for trust)
- Database-driven explainer copy (decision #6)
- Failed cards auto-refund tokens (decision #15 — critical trust signal)
- SSE for build progress (§4.1)
- Focus-trapped modals with one unified `ModalShell` primitive (decision #4)

### 8.5 Blocking items for the founder

Two items can't be resolved between researcher and architect — they need a founder decision:

1. **Q-10 / decision #1 in `meldar-v3-decisions-needed.md`** — "Drop" terminology. My strong recommendation: ship Recipe-only + plain English labels for MVP. Founder must approve.
2. **Q-11 / chat surface scope** — conversational + commentary vs. commentary-only. My recommendation: both in one panel with clear state distinction. Founder must confirm the scope commitment (this is not just a UI choice — it's a feature scope commitment that affects backlog estimation).

---

## Section 9 — Recommended scope cuts (founder, read this)

Things in the backlog that I'd push to P1/P2 to protect MVP velocity:

| Backlog item | Current | Recommended | Why |
|---|---|---|---|
| Prompt anatomy side panel (#12) | P0 | **P1** | Valuable for retention, not blocking Ship #1. Most first-session users won't open it. Defer. |
| Onboarding style selector — Drop terminology TBD (#5, decision #1) | P0 + open decision | **Ship with Recipe only for MVP** | Cuts a decision and a code path. Drop can ship in week 2. |
| Referral dashboard (#23) | P0 | **MH for share button, SH for dashboard** | The share button is critical. The dashboard is a luxury until there are referrals to display. |
| Skills Receipt v2 / shareable card (#34) | P1 | **MH for the Ship-#1 moment specifically** | Can't ship Ship #1 without a shareable artifact. The full Receipt v2 feature can be the next iteration. |
| Email touchpoints (#35) | P1 | **MH for Day-1 nudge only** | Welcome + Day-1 nudge are critical. Day-7 streak email is post-launch. |
| Component drag-and-drop library (Pillar 2 spec) | P0 implied | **P2** | The kanban + prompt model can replace drag-and-drop entirely for MVP. Components are a moat investment, not a launch requirement. |

---

## Section 10 — The three things the founder will most likely be surprised by

1. **The post-paywall first screen is more dangerous than the paywall itself.** Industry instinct is to optimize the paywall. Research instinct is to obsess over the moment *immediately after payment*. Your single highest-leverage MVP investment is making sure Katya lands in a populated, alive workspace — preview already deployed, kanban already filled, tour already running.

2. **Tokens are the conversion killer, not the price.** EUR 19 is fine. "500 tokens" is not. Non-technical users have zero intuition for token quantities and every token mention without a translation triggers slot-machine anxiety. The cheapest, highest-leverage UX writing in the entire MVP is the token-to-action translator. Three weeks of writing work prevents months of confused churn.

3. **Katya may not want the Time X-Ray at all.** The discovery flow is the spec's crown jewel and it works for Daria. But Katya already knows what she wants — a landing page + booking system. Forcing her through a Screen Time screenshot to discover something she already knows is detour, not delight. The product should let her *skip* discovery and go straight to the use case. The free tier assumes everyone is in discovery mode; that's a bet, not a fact.

---

*End of UX Researcher findings. Cross-link to be added when `ux-architect-spec.md` exists.*
