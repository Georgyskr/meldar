# 03 — Visual Narrative: The Emotional Journey of the Workspace

The workspace is not a tool. It is a place where someone who has never touched code watches their idea become real. Every pixel, every transition, every word must serve one feeling: **"This is mine, and it's already working."**

This document maps the emotional arc from the moment a user arrives in the workspace to the moment they share their first live page — and every critical hand-off in between.

Cross-references UX Research (01-ux-research-findings.md) throughout. Problem IDs like P0-2, P1-1 refer to that document's prioritized problem list.

---

## 1. Emotional Journey Map

The journey has five distinct emotional phases. Each phase has a dominant feeling, a risk of drop-off, and a design responsibility.

### Phase 1 — Arrival: "It knows what I need"

**Feeling:** Relief. Recognition. Not overwhelm.

The user just finished onboarding. They picked "Hair salon" or "Photography portfolio" or typed something specific. They land in the workspace and the first thing they see is not a blank canvas, not a code editor, not a list of tasks. They see **their project, already named, already structured, already moving**.

The workspace greets them with context they recognize:
- The project name they chose (or Meldar proposed)
- A scannable plan with items that make sense for their business — "Booking page", "Price list", "Gallery"
- A status indicator that something is already happening

**The risk:** If this screen looks like a generic dashboard, the magic of onboarding dies instantly. The user must feel continuity — "the conversation we just had is still happening."

**Design responsibility:** The workspace must feel like a continuation of the onboarding conversation, not a new destination. No loading screens with spinners. No "Welcome to your workspace!" hero banners. The content IS the welcome.

**What currently breaks this (see 01-ux-research, P0-2):** The user clicks "Create my booking page," sees a spinner, sees "Your booking page is ready!" with a "Go to your dashboard" button, clicks through — and lands on an empty workspace with "Describe what you want to build." The promise of a ready page dissolved into a blank prompt input. This is the single most damaging emotional moment in the current product. The narrative fix: the user must never see an empty workspace. When they arrive, the first milestone is either already rendered or visibly in progress with functional progress copy ("Adding your services..."), not file names ("Writing helpers.ts...").

---

### Phase 2 — First Creation: "It's already working"

**Feeling:** Surprise. Delight. A little disbelief.

Within seconds of arriving, the first piece of their project is being created. Not "click here to start" — it is already underway. The user watches as their booking page (or whatever the first milestone is) materializes.

This is the most emotionally volatile moment in the entire product. Two things can happen:

**Good path:** The user sees a preview appear. It has their business name. It has colors that feel right. It has sections that make sense for what they do. They think: "Wait, it actually understood me."

**Bad path:** The user sees a generic page. Wrong colors. Wrong sections. Placeholder text that says "Lorem ipsum." They think: "This is just a template. I got played."

The difference between these two paths is not technical sophistication — it is **personalization density**. Every visible element must carry at least one detail from what the user told Meldar during onboarding.

**Design responsibility:** The preview must show the user's own words reflected back at them. Their business name in the header. Their service categories in the navigation. Their color preference (if expressed) in the palette. Even if the rest is default, these anchor points create ownership.

**What currently breaks this (see 01-ux-research, P0-1, P1-7):** The onboarding captures only a vertical ("Hair / Beauty") and an optional business name. It never asks about specific services, hours, style, or what the user struggles with. Then it silently applies generic defaults (Haircut EUR 45, Color EUR 85, Blowout EUR 35) that may not match the user's reality. Irka does cuts, highlights, and extensions — not blowouts. The system doesn't know because it never asked. The narrative fix: onboarding must capture at minimum the business name and 2-3 specific services. These details flow into the first build prompt so the preview reflects the user's actual business, not a category template.

---

### Phase 3 — Understanding: "I see what happened"

**Feeling:** Curiosity. Growing confidence. "Oh, so THAT's how this works."

After the first piece is created, the teaching layer activates. Not as a tutorial. Not as a tooltip. As a natural part of the flow:

- "Here's the prompt that created your booking page" (collapsed by default, expandable)
- "3 things Meldar decided for you" — e.g., "Clean layout because salons need fast scanning", "Mobile-first because 70% of salon bookings happen on phones", "Warm palette to match your brand"
- A gentle nudge: "Want to change anything? Just point at it."

This phase transforms the user from a passive recipient into someone who understands the system. They don't need to understand code. They need to understand the conversation — "I said X, Meldar interpreted it as Y, and here's the result Z."

**The risk:** Over-explaining. If the teaching layer feels like homework, the user skips it forever. It must feel like a friend saying "oh by the way, here's why I did it this way" — not a textbook.

**Design responsibility:** Teaching content must be visually subordinate to the creation itself. It lives in the margin, in collapsed panels, in secondary text. The preview is always the hero. The explanation is always the footnote.

---

### Phase 4 — Iteration: "I'm shaping this"

**Feeling:** Agency. Ownership. "This is becoming MY thing."

The user sees their preview and wants to change something. Maybe the header image is wrong. Maybe they want a different font. Maybe the booking form needs an extra field.

This is where the visual feedback tool becomes the emotional centerpiece. The user doesn't type a description of what they want to change. They **point at the thing** and say what they want. Like talking to a contractor who's standing right there in the room:

- Hover over the header → highlight appears → click → "Make this darker"
- Hover over the price list → click → "Add a column for duration"
- Hover over the footer → click → "Put my Instagram here"

Each iteration reinforces ownership. Each change that appears correctly builds trust. Each cycle tightens the bond between "what I imagined" and "what I see."

**The risk:** Slow iteration kills the magic. If each change takes 30 seconds of visible waiting, the user loses the feeling of direct manipulation. The feedback loop must feel conversational — ask, see, adjust.

**Design responsibility:** The iteration UI must feel like direct manipulation even though it isn't. Instant acknowledgment ("Got it — updating the header..."), fast preview refresh, and the changed element should subtly pulse or highlight when the update lands so the user's eye is drawn to the result.

**What currently breaks this (see 01-ux-research, P1-4, P0-3):** The visual feedback tool is described in the FeedbackBar copy ("Click any element above to change it") but is not wired up in the preview pane. The user reads the instruction, tries to click an element, and nothing happens. Meanwhile the FeedbackBar placeholder says "make the button pink" — which assumes a button already exists. For the empty-state user, this is doubly confusing. The narrative fix: the visual feedback tool must be functional before any iteration copy references it. And the FeedbackBar must never show refinement examples ("bolder colors?") when there's nothing to refine — its role changes based on context.

---

### Phase 5 — Ownership: "This is MY booking page"

**Feeling:** Pride. Accomplishment. "I did this." Eagerness to show someone.

The "aha moment." The user looks at their screen and no longer sees "Meldar's output" — they see **their page**. The shift is subtle but absolute. It happens when enough personal details accumulate that the result could not belong to anyone else.

Markers of this moment:
- The user's business name is in the header
- Their specific services are listed
- Their color choices are reflected
- Their phone number or address appears
- The URL has their name in it (irka-salon.apps.meldar.ai)

This is when the user wants to share. The "It's live" moment must meet this emotional peak with ceremony — not fireworks and confetti (that's what coding tools do), but with quiet editorial confidence: a clean URL, a QR code, a "Share with a client" button.

**Design responsibility:** The live moment should feel like receiving a finished magazine spread, not like deploying code. No deploy logs. No build output. No terminal aesthetics. A clean card with the URL, a preview thumbnail, and a single action: "Send this to someone."

---

## 2. Transition Moments

These are the critical hand-offs where the user moves between emotional phases. Each transition is a potential drop-off point and must be designed with extreme care.

### Transition A: Onboarding to Workspace (THE CRITICAL TRANSITION)

**From:** Conversational flow (text input, chip selection, follow-up questions)
**To:** Spatial workspace (plan view, preview pane, milestone list)

**The danger:** Jarring context switch. The user was in a conversation; suddenly they're in a dashboard. The UX research (01-ux-research, Problems 3.1, 3.2, 4.1) documents the exact failure: "Your booking page is ready!" → "Go to your dashboard" → blank workspace with "Describe what you want to build." Three consecutive screens, each breaking the emotional promise of the previous one. The phrase "Go to your dashboard" is itself a red flag — Irka doesn't think in dashboards.

**The solution:** Eliminate the intermediate "ready!" and "dashboard" screens entirely. The workspace should feel like the conversation continues in a new form. The plan that Meldar proposed in the chat now appears as a visual layout — same items, same language, same order. The chat doesn't disappear; it becomes a side panel that the user can return to. The transition is not "you've been moved to a new place" but "the room expanded." The first milestone is already building when the workspace appears — the user never sees an empty preview.

**Copy at transition:**
- NOT: "Your booking page is ready!" (it isn't yet) / "Go to your dashboard" (developer language)
- YES: The workspace simply appears with "Setting up your booking page..." already visible. No announcement. No button to click through. The work is happening.

**Animation:** The conversation panel slides to the left third of the screen. The plan items from the last chat message animate outward into their spatial positions in the main area. No page transition. No loading screen. One continuous motion.

---

### Transition B: Plan to First Preview

**From:** Scannable plan ("Booking page", "Price list", "Gallery")
**To:** Rendered preview of the first milestone

**The danger:** The wait. If the user stares at a plan for 10 seconds with nothing happening, they start to doubt.

**The solution:** Auto-build starts immediately on workspace entry. The first milestone begins creating itself without any user action. A subtle progress indicator (a 2px ink strip that fills) shows movement. The plan item that's being worked on has a gentle pulse or "in progress" state.

When the preview is ready, it doesn't pop in — it **reveals**. The plan pane narrows slightly. The preview pane grows from a sliver to its full width, with the content fading in top-to-bottom, like a page being printed.

**Copy during wait:**
- On the plan item: "Setting up your booking page..."
- Below it, in secondary text: *"Choosing layout, adding your services, picking colors"*
- NOT: "Building..." / "Deploying..." / "Compiling..."

---

### Transition C: Preview to Iteration

**From:** Viewing the first result
**To:** Actively changing it

**The danger:** The user doesn't know they CAN change things. They think this is the final output.

**The solution:** After the preview fully renders, a gentle prompt appears — not a modal, not a toast, but an inline element near the preview:

*"This is your starting point, not your final page. Point at anything to change it."*

The cursor changes behavior over the preview: it becomes a subtle crosshair or pointer with a small highlight ring, signaling that the preview is interactive. The first hover that highlights an element is itself a micro-revelation.

**Animation:** When the user first hovers over a preview element, the highlight should appear with a brief, satisfying snap — not a slow fade. It should feel responsive, like touching a screen and seeing it react. This communicates: "Yes, you can touch this. Everything here responds to you."

---

### Transition D: Single Page to Full Project

**From:** One completed milestone (the booking page)
**To:** Awareness that there are more milestones to complete

**The danger:** The user thinks they're done. Or they feel overwhelmed by how much is left.

**The solution:** After the first milestone reaches a satisfying state (user has iterated at least once, or explicitly said "looks good"), the workspace gently reveals the next step. Not all remaining milestones at once — just the next one.

*"Your booking page is ready. Next: your price list — want to start?"*

The milestone list on the left shows progress: one item complete (with a subtle check), one item highlighted as next, the rest dimmed but visible. The chapter metaphor from the design language applies here: "Milestone 1 of 4 — complete" in the editorial style, with the numbered marker.

**Animation:** The completed milestone's card settles into a compact "done" state (smaller, with a thin ink border and a check). The next milestone card grows slightly and gains visual weight. The transition should feel like turning a page in a magazine — the current spread recedes, the next one comes forward.

---

### Transition E: Project to Live

**From:** Iterating on pages in the preview
**To:** The project is accessible at a real URL

**The danger:** "Deploy" language. Terminal output. Build logs. Anything that makes this feel like a developer workflow.

**The solution:** The user sees a simple, confident message:

*"Ready to go live?"*

One button. No configuration. No domain settings. No hosting options. One tap, and the progress strip fills. When complete:

A card appears with editorial calm:
- The URL (irka-salon.apps.meldar.ai) in a clean monospace type
- A small, beautiful preview thumbnail
- "It's live" — two words, in the serif-italic flourish style
- Two actions: "Open" and "Share"

No deploy logs. No "build succeeded." No celebration animation. The confidence of the editorial design language says: "Of course it worked. That's what we do."

**Animation:** The card slides up from below the preview, like a receipt being printed. Clean, mechanical, satisfying.

---

## 3. Copy and Microcopy Recommendations

### Workspace States

| State | Primary copy | Secondary copy | Tone |
|---|---|---|---|
| First load (auto-building) | "Setting up your [project type]..." | *"Choosing layout, adding your details, picking colors"* | Calm, active |
| Preview ready | No copy — the preview IS the message | "Point at anything to change it." | Minimal, inviting |
| Iteration in progress | "Updating [element]..." | — | Brief, responsive |
| Iteration complete | No copy — the change IS the message | Element pulses briefly | Silent |
| Milestone complete | "Your [milestone] is ready." | "Next: [next milestone]" | Satisfied, forward-looking |
| Project live | "It's live." | URL displayed prominently | Quiet pride |
| Return visit | "Welcome back. You left off here." | Continue banner with last milestone | Warm, contextual |

### Language Rules for the Workspace

**Always say / Never say:**

| Always | Never |
|---|---|
| "Setting up" | "Building" / "Deploying" |
| "Your booking page" | "The booking page component" |
| "Point at anything" | "Click to edit" / "Select element" |
| "It's live" | "Deploy successful" / "Build complete" |
| "Your site" | "The application" / "The project" |
| "Share with a client" | "Copy deploy URL" |
| "Milestone 2 of 4" | "Step 2" / "Task 2" / "Ship #2" |
| "Change this" | "Edit" / "Modify" / "Configure" |
| "Adding your services..." | "Writing helpers.ts..." / "Writing code..." |
| "See your booking page" | "Go to your dashboard" |
| "What would you change?" | "Describe what you want to build" |
| "Your prices" / "Your hours" | "Default configuration" / "Settings" |
| (nothing — tabs emerge contextually) | "Build" / "Bookings" / "Settings" tabs on first visit |

The last five rows address specific developer-language violations found in the current implementation (see 01-ux-research, P1-1). The current FeedbackBar placeholder ("make the button pink"), the preview build states ("Writing helpers.ts..."), and the navigation tabs (Build/Bookings/Settings exposed on first visit) all communicate "this is a developer tool." Every one must change.

### Teaching Layer Microcopy

The decisions card and prompt viewer use a specific voice — confident, brief, conversational:

- "We went mobile-first. 70% of salon bookings happen on phones."
- "Clean layout — salons need fast scanning, not novelty."
- "Warm colors to match the vibe you described."

NOT:
- "Based on industry best practices, we have implemented a mobile-first responsive design..."
- "The layout has been optimized for conversion..."

Three words per decision when possible. Then one sentence of "why" if the user expands.

---

## 4. Anti-Patterns: How the Workspace Must Differ from Coding Tools

### What Coding Tools Do (and We Must Not)

| Coding tool pattern | Why it exists | Why it's wrong for Meldar |
|---|---|---|
| File tree sidebar | Developers navigate by file | Irka doesn't know what a file is |
| Terminal/console panel | Developers read logs | Logs are gibberish to our users |
| "Deploy" button with config | Developers choose environments | Our users have one environment: live |
| Code diff view | Developers review changes | Our users review visually, not textually |
| Branch/version dropdown | Developers manage parallel work | Our users work linearly on one thing |
| "Build succeeded" toast | Developers need build feedback | Our users need to see the result, not the process |
| Kanban/sprint board | Developers manage tasks | Our users follow a guided chapter sequence |
| Empty state with "Create new" | Developers start from scratch | Our users should never see an empty state — Meldar proposes first |

### The Core Difference

Coding tools show the **process**. Meldar shows the **result**.

- Lovable shows a code editor with a preview panel. Meldar shows only the preview. The code exists, but it's behind a door the user never needs to open.
- Bolt shows a terminal building in real time. Meldar shows a gentle progress strip and then the finished page.
- Cursor shows file diffs. Meldar shows before/after in the visual preview.

The workspace should feel closer to **Canva** than to **VS Code** — a creative tool where the output is always visible and the mechanics are always hidden.

### Specific Anti-Patterns to Avoid

1. **The "what do you want to do?" blank state.** Never. Meldar always proposes first. The user's first action is reacting to a suggestion, not creating from nothing.

2. **The sidebar of technical objects.** No file trees. No component lists. No "Pages" panel with filenames. The sidebar shows milestones in human language: "Booking page", "Price list", "Gallery."

3. **The build log.** Never show raw output from any build process. Not even behind a toggle. If something fails, say what happened in human language: "The image didn't load — want to try a different one?"

4. **The settings page.** No settings. No configuration. No "Project settings" gear icon. Every decision that matters is made through the conversational propose-and-go flow.

5. **The "Save" button.** Everything auto-saves. The concept of saving is from a world of files and disks. This is a world of continuous state.

---

## 5. Motion and Animation Narrative

### Guiding Principles

Motion in Meldar serves three purposes:
1. **Continuity** — showing that the workspace is one connected experience, not a series of screens
2. **Feedback** — confirming that the system heard the user and is responding
3. **Attention** — drawing the eye to what changed or what matters next

Motion does NOT serve:
- Decoration (no particle effects, no floating elements, no ambient animation)
- Celebration (no confetti, no fireworks, no achievement popups)
- Brand expression (the editorial design language is inherently still and confident)

### Motion Vocabulary

| Action | Motion | Duration | Easing |
|---|---|---|---|
| Plan item starts creating | Subtle pulse on the item's left border (2px ink strip blinks once) | 300ms | ease-in-out |
| Preview appears | Fade in top-to-bottom, like ink spreading on paper | 600ms | ease-out |
| Element highlight on hover | Snap to full opacity (no fade) | 0ms appear, 150ms disappear | — / ease-out |
| Iteration update lands | Changed element briefly glows with a 1px peach (#FFB876) outline, then fades | 200ms appear, 800ms fade | ease-out |
| Milestone completes | Card compresses to compact state, check mark appears with a single tick motion | 400ms | spring (slight overshoot) |
| Next milestone activates | Card expands, gains visual weight | 300ms | ease-out |
| "It's live" card appears | Slides up from below viewport edge | 500ms | spring (gentle) |
| Conversation panel repositions | Slides left with content intact | 400ms | ease-out |
| Progress strip fills | Linear left-to-right fill of the 2px ink strip | Duration of actual process | linear |

### What Never Moves

- The main preview area. It is the anchor. Content within it changes, but the container never slides, bounces, or transitions.
- Headings and navigation. They are fixed editorial landmarks.
- The milestone list, once visible. Items within it transition state, but the list itself doesn't rearrange, shuffle, or animate in bulk.

### The "Printing" Metaphor

The dominant motion metaphor is **printing** — content appears as if being laid onto paper. Top-to-bottom reveals. Ink strips that fill. Cards that slide up like receipts. This aligns with the editorial design language: the workspace is a publication being assembled, page by page.

---

## 6. The "Aha Moment" — When Irka Feels "This Is MY Booking Page"

### The Moment Itself

The aha moment is not a single event. It is the accumulation of **three recognition signals** that tip the user from "this is Meldar's output" to "this is mine."

**Signal 1 — Name recognition.** The user sees their business name rendered in a real header, on a real page, with real typography. Not in an input field. Not in a placeholder. In the actual output. "Irka's Hair Studio" in Bricolage Grotesque on a warm cream surface.

**Signal 2 — Context recognition.** The user sees details they mentioned reflected in the structure. They said "haircuts, coloring, extensions" and those are the three service cards on the page. They didn't configure this — Meldar heard them and structured it.

**Signal 3 — Taste recognition.** The user sees aesthetic choices that feel right. Not because they specified every color, but because Meldar's defaults for "hair salon" are good defaults. Warm tones. Clean layout. A booking button that says "Book now" not "Submit." This is the hardest signal to engineer — it requires good taste in the defaults.

### When It Happens

For most users, the aha moment lands during **Phase 2** (First Creation) — specifically, the 2-5 seconds after the first preview renders. The user's eyes scan for their name, their services, their vibe. If all three signals are present, ownership transfers instantly.

For users who arrive skeptical or who had a less specific onboarding ("I don't know what I want"), the aha moment may not land until **Phase 4** (Iteration) — when they point at something, say "change this," and see it change. The act of directing change creates ownership even when the initial result didn't.

### How to Protect It

The aha moment can be destroyed by:

1. **Generic content.** If the preview shows "Your Business Name Here" or "Service 1, Service 2, Service 3" — the moment is dead. Every visible text element must carry real data from onboarding.

2. **Wrong category defaults.** If a hair salon gets a tech startup layout, or a photographer gets a restaurant template — the moment is dead. Category-aware defaults are load-bearing.

3. **Slow rendering.** If the preview takes so long that the user's attention has drifted to the sidebar, the email notification, or the phone in their hand — the moment is missed. The preview must render before curiosity expires (under 8 seconds from workspace entry).

4. **UI chrome competing for attention.** If the preview is surrounded by panels, buttons, navigation, and status indicators — the user's eye doesn't land on their name in the header. The preview must be the dominant visual element, occupying at least 60% of the viewport on first load.

### Designing Backward from the Aha Moment

Every design decision in the workspace should be tested against this question:

**"Does this help Irka see her business name in a real header within 8 seconds of landing in the workspace?"**

If the answer is no, the feature is secondary. If the answer is "it actively delays that," the feature is harmful.

The milestone list, the teaching layer, the iteration tools, the deploy flow — all of these exist to support and extend the aha moment. None of them should compete with it.

---

## 7. Current State vs. Target State — The Emotional Gap

Mapping the UX Research findings (01-ux-research-findings.md) against the target emotional journey reveals where the current product sabotages its own narrative.

### The Trust-Breaking Sequence (current)

The research documents Irka's exact experience. Here is the emotional translation:

```
Onboarding:  "What's your business?"     → Irka feels: Optimistic. "It's asking about ME."
             Picks Hair/Beauty            → Feels: "It knows what I do."
             Types "Studio Irka"          → Feels: "This is personal."
             "Create my booking page"     → Feels: Excited. Committed.

Loading:     Spinner, 3-8 seconds         → Feels: Nervous anticipation.
             "Taking longer..."           → Feels: "Is it broken?"

Success:     "Your booking page is ready!" → Feels: PEAK EXCITEMENT. "Show me!"
             "Go to your dashboard"        → Feels: Slight confusion. "Dashboard?"

Workspace:   Blank preview pane            → Feels: "Where is my booking page?"
             "Describe what you want       → Feels: BETRAYAL. "I already told you."
              to build"
             Tabs: Build|Bookings|Settings → Feels: "This is a developer tool."
             Tries "Bookings" tab          → Feels: Empty. Dead end.
             Tries "Settings" tab          → Feels: "Haircut EUR 45? That's not my price."
             Back to "Build"               → Feels: Lost. Defeated.
             Leaves.                       → Feels: "This isn't for me."
```

### The Target Sequence (redesigned)

```
Onboarding:  "What kind of business?"     → Irka feels: Optimistic.
             "Hair salon"                  → Feels: "It knows."
             "Studio Irka" + follow-ups    → Feels: "It's really listening."
               (services, hours, vibe)
             Meldar proposes a plan        → Feels: "It already has ideas."
             "Looks good"                  → Feels: Excited. No effort required.

Workspace:   Plan visible, first item      → Feels: Continuity. "Same conversation."
             already in progress
             "Setting up your booking      → Feels: Calm anticipation.
              page... adding your
              services, picking colors"
             Preview appears with          → Feels: SURPRISE. "That's my salon name!"
             "Studio Irka" in the header
             Her services listed correctly → Feels: "It actually listened."
             "Point at anything to         → Feels: Agency. "I can shape this."
              change it."
             Hovers, sees highlight        → Feels: Delight. "Everything responds."
             Changes one thing, sees it    → Feels: OWNERSHIP. "This is mine."
             "It's live." + URL            → Feels: Pride. Sends to a friend.
```

### Where Each P0 Problem Breaks the Emotional Arc

| Research P0 | Phase it breaks | Emotional consequence |
|---|---|---|
| P0-1: No personalization captured | Phase 2 (First Creation) | Preview is generic, aha moment impossible |
| P0-2: Empty workspace after onboarding | Phase 1 (Arrival) — destroys it entirely | Trust dies at the door |
| P0-3: Prompt-first interaction model | Phase 4 (Iteration) — blocks entry to it | User can't iterate because they can't even start |
| P0-4: System never proposes | Phase 1 through Phase 4 | Every phase requires user initiation that the user can't provide |

### The Single Most Important Fix

If only one thing changes, it must be this: **the workspace must never show an empty preview pane after onboarding.** The "Your booking page is ready!" screen and the blank workspace are currently two consecutive lies — the page isn't ready, and the workspace isn't a workspace. Eliminate both. The user should transition from onboarding directly into a workspace where their first milestone is visibly in progress or already rendered.

This one change would rescue Phase 1 (Arrival) and Phase 2 (First Creation), which together constitute the first 15 seconds of the workspace experience — the window in which Irka decides whether to stay or leave.

---

## Appendix: Emotional Temperature Map

A visual summary of the emotional intensity across the five phases:

```
Anxiety    |####............................................|
Relief     |....####........................................|
Surprise   |........####....................................|
Curiosity  |............########............................|
Agency     |....................##########..................|
Pride      |..............................##########.......|
Eagerness  |........................................########|
           |                                              |
            Arrival  Create  Understand  Iterate  Ownership
```

The design goal is to minimize the anxiety peak (make arrival feel continuous from onboarding) and maximize the pride plateau (make iteration feel like personal expression, not configuration).
