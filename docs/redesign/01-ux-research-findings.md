# UX Research Findings: Workspace Redesign

## Executive Summary

- **The onboarding flow is a template picker disguised as personalization.** Users pick a business vertical (hair, PT, tattoo, consulting, other), optionally name it, and get a generic booking page. Their actual needs, preferences, and context are never captured and never flow into what gets built.
- **The workspace is a developer IDE presented to non-technical users.** Once inside, users face a blank preview pane with placeholder text ("Describe what you want to build"), a raw text input, and developer-oriented tabs (Build, Bookings, Settings). Nothing guides them toward a first successful outcome.
- **The system never proposes, only waits.** Despite the documented vision of "propose-and-go" (Meldar picks good defaults and the user confirms or overrides), the current implementation asks open questions and waits for the user to initiate every action. The entire burden of knowing what to do falls on someone who, by definition, does not know what to do.

---

## Current Flow Walkthrough with Problems

### Step 1: Onboarding (`/onboarding` -- OnboardingFlow.tsx)

**What happens:** User sees "What's your business?" with 5 vertical cards (Hair/Beauty, PT/Wellness, Tattoo/Piercing, Consulting, Other), an optional business name input, and a "Create my booking page" button.

**Problems:**

| # | Problem | Severity |
|---|---------|----------|
| 1.1 | **No discovery of user needs.** The system never asks what the user actually wants. Picking "Hair / Beauty" tells Meldar the category but nothing about Irka's specific salon -- her services, her hours, her style, what she's struggling with. The vertical selection pre-fills generic defaults (Haircut EUR 45, Color EUR 85, Blowout EUR 35) that may not match the user's reality at all. | P0 |
| 1.2 | **"Create my booking page" is the wrong promise.** The button text implies a booking page is the only outcome. But Meldar's value proposition is broader -- "discover what wastes your time, then build personal apps to fix it." The onboarding locks users into a single use case before they even understand what's possible. | P0 |
| 1.3 | **No teaching moment.** The target persona "doesn't know what she should build or why." The onboarding doesn't explain what a booking page does, why it helps, or what will happen next. It assumes the user already knows. | P1 |
| 1.4 | **Optional business name is a missed opportunity.** If the user types "Studio Mia," that personalization could flow into every build prompt, page title, color scheme suggestion, etc. Currently it's just stored as a project name. | P1 |
| 1.5 | **5 verticals is arbitrary and limiting.** A dance instructor, photographer, or dog groomer doesn't see themselves in these 5 options. "Other" is a dead end that communicates "we didn't think about you." | P1 |
| 1.6 | **No visual preview of what they're about to get.** The user clicks "Create my booking page" and hopes for the best. Showing a preview thumbnail of what a booking page looks like for their vertical would set expectations and build confidence. | P2 |

### Step 2: Loading state ("Setting up your booking page...")

**What happens:** Spinner with text. 10-second timeout, then "Taking longer than expected..." with retry button.

**Problems:**

| # | Problem | Severity |
|---|---------|----------|
| 2.1 | **Dead time with no value.** This is wasted screen real estate. Could be used to ask 1-2 personalization questions while the system works (progressive disclosure). | P1 |
| 2.2 | **Timeout UX is harsh.** "Taking longer than expected..." with "Try again?" feels like a broken product. No explanation of what went wrong or what will be different on retry. | P2 |

### Step 3: "Your booking page is ready!" (success state)

**What happens:** Centered text with subdomain and "Go to your dashboard" button.

**Problems:**

| # | Problem | Severity |
|---|---------|----------|
| 3.1 | **No preview of what was built.** User is told it's "ready" but can't see it. The natural reaction is excitement -- show them the result immediately, not a button to navigate somewhere else. | P1 |
| 3.2 | **"Go to your dashboard" is developer language.** Irka doesn't think in terms of dashboards. "See your booking page" or "Take a look" would match her mental model. | P1 |

### Step 4: Workspace (`/workspace/[projectId]` -- WorkspaceShell.tsx)

**What happens:** Full-screen fixed layout with:
- Top bar: meldar / project name / + New project button
- Navigation tabs: Build | Bookings | Settings | My Site (external link)
- Main area: Preview pane (empty or iframe) with feedback bar at bottom

**Problems:**

| # | Problem | Severity |
|---|---------|----------|
| 4.1 | **Empty state is a blank wall.** When there's no preview yet, the user sees "Describe what you want to build" with example prompts. This is the exact Lovable/Replit pattern the founder identified as the core problem. A non-technical user does not know how to "describe what they want to build." | P0 |
| 4.2 | **Tabs are meaningless at this stage.** "Build" / "Bookings" / "Settings" assume the user understands these as workspace modes. They don't. "Bookings" is empty (no bookings exist yet). "Settings" shows a form with the generic defaults. There's no guided path through these. | P0 |
| 4.3 | **The feedback bar instruction is confusing.** "Click any element above to change it, or describe what you want" -- but there are no elements above to click when the preview is empty. The visual feedback tool (the killer differentiator) is invisible until something is built, and the path to getting something built requires the user to write a good prompt. | P0 |
| 4.4 | **No progressive disclosure.** Everything is exposed at once: Build tab, Bookings tab, Settings tab, text input, attach button, suggestion chips. A new user should see one thing to do, not seven. | P1 |
| 4.5 | **"+ New project" in the top bar during first project.** The user just created their first project. Showing "new project" as the only action button in the top bar implies they should create another one. There's no "help", "share", or contextually useful action. | P2 |
| 4.6 | **Full-screen fixed layout with no escape.** The workspace takes over the entire viewport (`position: fixed, inset: 0`). There's no obvious way to go back to the project list, no breadcrumb, no sense of "where am I in the app." The meldar logo and project name are both links to `/workspace`, but that's not visually communicated. | P1 |

### Step 5: FeedbackBar (bottom input -- FeedbackBar.tsx)

**What happens:** Text area with placeholder `"make the button pink" or "change price to 50"`, attach button, send button. Short instructions (<5 words) trigger suggestion chips. Design keywords trigger a Stitch recommendation.

**Problems:**

| # | Problem | Severity |
|---|---------|----------|
| 5.1 | **Placeholder examples assume an existing page.** "Make the button pink" and "change price to 50" only make sense if there's already a button and a price. For the empty state, the examples should help the user describe what to create. | P1 |
| 5.2 | **Suggestion chips are generic.** "Bolder colors?", "Bigger text?", "More spacing?" are design refinement suggestions, not creation suggestions. They don't help a user who hasn't built anything yet. | P1 |
| 5.3 | **5-word minimum before direct submit is arbitrary.** Short instructions like "add a gallery" or "make it dark" are perfectly valid and specific. The chip interstitial adds friction without adding value for commands that are already clear. | P2 |
| 5.4 | **Stitch recommendation is premature.** Suggesting an external design tool in a product whose value proposition is "we handle everything for you" sends a conflicting message. It tells the user "go figure out design assets elsewhere." | P2 |

### Step 6: Preview Pane (PreviewPane.tsx)

**What happens:** Three states: building (pulsing dot + "Thinking..." / "Writing code..."), deploying ("Starting preview..."), and loaded (iframe).

**Problems:**

| # | Problem | Severity |
|---|---------|----------|
| 6.1 | **"Writing code" is developer language.** Irka doesn't care about code. She cares about her booking page. "Building your page..." or "Setting up your services..." would match her mental model. | P1 |
| 6.2 | **No intermediate progress.** The building state shows the last file being written (`Writing helpers.ts...`). File names are meaningless to the target user. Show functional progress: "Adding your services...", "Setting up the calendar...", "Choosing colors..." | P1 |
| 6.3 | **Preview URL staleness check is invisible.** The system has a 2-minute staleness threshold for preview URLs. If the preview is stale, the user sees the empty state instead of an old preview. No explanation of why their previously-working page has disappeared. | P2 |

### Step 7: Admin Dashboard (`/workspace/[projectId]/admin` -- AdminDashboard.tsx)

**What happens:** Business name heading, "Manage your bookings and review AI actions," tabs for Overview/Bookings/Approvals, stat cards, recent bookings list.

**Problems:**

| # | Problem | Severity |
|---|---------|----------|
| 7.1 | **Dashboard is empty on first visit.** Zero bookings, zero approvals. The user sees three zeroes and an empty list. No guidance on how bookings will appear or what to do next. | P1 |
| 7.2 | **"Review AI actions" is unexplained.** What AI actions? When do they happen? Why would they need approval? There's no onboarding for this concept. | P1 |
| 7.3 | **Navigation disconnect.** The admin layout has its own "Back to workspace" link and separate "Bookings" / "Settings" tabs, duplicating the workspace nav. Two different navigation systems for the same project. | P2 |

### Step 8: Settings Panel (`/workspace/[projectId]/admin/settings` -- SettingsPanel.tsx)

**What happens:** Form with business name, services list (add/remove), available hours (day toggles + open/close times), and save button.

**Problems:**

| # | Problem | Severity |
|---|---------|----------|
| 8.1 | **Settings are pre-filled with generic defaults the user never chose.** The system picked "Haircut EUR 45" etc. based on vertical selection. The user may not realize these are editable or that they matter. | P1 |
| 8.2 | **No connection between settings and the booking page.** Changing a service name here doesn't visibly update the preview. The user can't see the cause-and-effect relationship. | P1 |
| 8.3 | **Form is feature-complete but context-free.** Duration in minutes, price in EUR, time inputs -- these are functional but have no guidance. "How long does a haircut take?" would be more helpful than a blank number input labeled "Duration (min)". | P2 |

---

## Persona-Based Analysis: Irka's Experience

Irka runs a hair salon from her phone. She heard about Meldar from a friend who said "it makes a booking page for you." Here is her experience:

1. **Arrives at onboarding.** Sees "What's your business?" Taps "Hair / Beauty" because she sees scissors. Types "Studio Irka" in the business name. Taps "Create my booking page." So far, fine.

2. **Waits 3-8 seconds.** Sees a spinner. Wonders if she should have done something differently.

3. **Sees "Your booking page is ready!"** Feels excitement. Taps "Go to your dashboard."

4. **Arrives at the workspace.** Excitement drops. She sees a big empty box with the text "Describe what you want to build." She already told the system she wants a booking page. Why is it asking again? She doesn't know what to type. She looks at the example: `"create a booking page for a hair salon with 3 services"` -- but she already did that. Is this different?

5. **Tries the tabs.** Taps "Bookings" -- sees "Manage your bookings and review AI actions" with all zeroes. This is what she expected from "Go to your dashboard" -- a place to see bookings. But there are none. Dead end.

6. **Taps "Settings."** Sees her services pre-filled: Haircut EUR 45, Color EUR 85, Blowout EUR 35. These aren't her services. She does cuts, highlights, and extensions. She realizes she can edit them, but there are three services and she has six. She starts adding.

7. **Goes back to "Build."** Still a blank preview. She still doesn't know what to type. She types "booking page" and hits enter. Gets suggestion chips: "Bolder colors?", "Bigger text?", "More spacing?" These make no sense -- there's nothing to make bolder.

8. **Leaves.** She'll come back "later" but probably won't.

**Critical failure point:** Step 4. The moment between "Your booking page is ready!" and the empty workspace is where trust dies. The system promised a booking page and delivered a blank text input.

---

## Competitive Differentiation Problems

### Why This Feels Like Lovable/Replit

The founder's complaint is precise: "You create a project and this is yet again another claude/lovable/replit whatever." Here's the structural analysis of why:

| Pattern | Lovable/Replit | Current Meldar | How Meldar Should Differ |
|---------|---------------|----------------|--------------------------|
| Entry point | "Describe your app" text prompt | "Describe what you want to build" text prompt | Meldar should propose, not ask |
| First action | User writes a prompt | User writes a prompt | System should auto-build from onboarding data |
| Empty state | Blank canvas waiting for input | Blank preview waiting for input | First build should already be running or complete |
| Navigation | Tabs for different views (code, preview, etc.) | Tabs for Build, Bookings, Settings | Tabs should emerge as they become relevant |
| Mental model | "I'm building software" | "I'm building software" | "Meldar is setting up my business tool" |
| Iteration | Edit prompt, rebuild | Type feedback, rebuild | Point at something, say what to change |

### The Differentiation That Exists But Is Invisible

The codebase contains genuine differentiation that users never experience:

1. **Visual feedback tool** -- The FeedbackBar says "Click any element above to change it" but the element-selection feature is not wired up in the current preview pane. The killer feature is described but not delivered.

2. **Booking verticals with smart defaults** -- The system knows "hair salon" means Tue-Sat 10-18 with 30-min slots. But these defaults are silently applied in the background, never shown to the user for confirmation or personalization.

3. **Teaching-by-doing philosophy** -- The FirstBuildCelebration has an `explainerText` field ("You learned: ...") but the current build pipeline doesn't generate educational content.

4. **Propose-and-go pattern** -- Fully designed in memory documents but not implemented. The system asks, it never proposes.

---

## Prioritized Problem List

### P0 -- Fundamental Flow Broken (must fix to ship)

| ID | Problem | Impact |
|----|---------|--------|
| P0-1 | **No personalization captured during onboarding.** User needs, preferences, and context never enter the system. Every project starts generic. | Users get a product that doesn't feel like "theirs" |
| P0-2 | **Empty workspace after onboarding.** User is told their page is "ready" then shown a blank canvas with "describe what you want to build." Trust-breaking moment. | Users leave immediately |
| P0-3 | **Prompt-first interaction model.** Requires users to know what to ask for. Non-technical users can't formulate prompts. This is the Lovable/Replit pattern. | Product is unusable for target persona |
| P0-4 | **System never proposes.** Despite the "propose-and-go" vision, nothing is ever proposed. Every action requires user initiation. | Contradicts core product thesis |

### P1 -- Significant UX Problems (blocks quality perception)

| ID | Problem | Impact |
|----|---------|--------|
| P1-1 | **Developer language throughout.** "Build", "dashboard", "Writing code...", "Writing helpers.ts...", "Review AI actions" | Users feel the product isn't for them |
| P1-2 | **Tabs exposed immediately with no progressive disclosure.** Build/Bookings/Settings shown on first visit. Bookings and Settings are empty or generic. | Cognitive overload, no guided path |
| P1-3 | **No connection between settings and live preview.** Changing services in Settings doesn't visibly update the booking page. No cause-and-effect. | Users don't understand the relationship |
| P1-4 | **Visual feedback tool not wired up.** The differentiating click-on-element feature is described in the UI copy but not functional in the preview pane. | Killer feature is invisible |
| P1-5 | **Empty states provide no guidance.** Zero bookings, zero approvals, blank preview -- no explanation of what to do or what will happen. | Users feel lost |
| P1-6 | **Loading states waste screen time.** Spinner pages could be used for progressive personalization. | Missed opportunity for engagement |
| P1-7 | **Generic vertical defaults never confirmed.** EUR 45 haircut may not match the user's pricing. Defaults are silently applied. | Users discover wrong data later, eroding trust |

### P2 -- Polish and Secondary Issues

| ID | Problem | Impact |
|----|---------|--------|
| P2-1 | **Duplicate navigation systems.** Workspace nav and admin nav overlap. | Confusion about where you are |
| P2-2 | **"New project" button during first project.** Wrong affordance at wrong time. | Minor confusion |
| P2-3 | **Short instruction chip interstitial adds friction.** 5-word minimum doesn't match natural short commands. | Mild annoyance for returning users |
| P2-4 | **Stitch recommendation sends users away.** External tool suggestion contradicts "we handle it" positioning. | Brand confusion |
| P2-5 | **Preview staleness makes pages disappear.** 2-minute threshold with no explanation. | Confusion on return visits |
| P2-6 | **5 verticals are limiting.** Many service businesses don't see themselves represented. | Exclusion, "Other" is a dead end |

---

## Recommended Research Questions for Other Agents

### For the UX Architect (Task #2)
- How should the onboarding-to-workspace transition work so that the user's first view is a personalized, pre-built booking page -- not a blank canvas?
- What is the minimum viable personalization that makes a booking page feel "mine"? (Hypothesis: business name + 2-3 real services + correct hours is enough.)
- How should the propose-and-go pattern be implemented? Inline confirmation during onboarding, or a separate "plan review" step?
- Should tabs (Bookings, Settings) be hidden until they have content, or revealed progressively as the user completes setup?

### For the Visual Storyteller (Task #3)
- What emotional arc should the user feel from sign-up to first seeing their booking page? (Currently: excitement at "ready!" -> confusion at blank workspace -> abandonment.)
- How can the loading/building state teach rather than waste time? What content fills the gap while the system works?
- How should the first-build celebration evolve? Currently it's a modal with "Your first feature just shipped!" -- is "feature" the right word for Irka?

### For the UI Designer (Task #4)
- How should the FeedbackBar change for the empty state vs. the built state? Two different input modes for two different user needs (creation vs. refinement).
- What does progressive tab disclosure look like in the workspace top bar? Animation, appearance, labeling?
- How should the visual feedback tool (element hover/click in iframe) be surfaced? Always-on, toggle, or contextual prompt?
- What is the Settings panel design when it's integrated into the onboarding flow rather than a separate tab?

### For the Synthesis Agent (Task #5)
- What is the implementation priority if we can only ship 3 changes? (Hypothesis: auto-build from onboarding data, propose-and-go confirmation step, empty-state replacement.)
- Which P0 problems can be solved with content/copy changes vs. which require architectural changes?
- What can be deleted? (The "Build" tab concept, the empty preview state, the generic vertical defaults as-shipped, the admin layout's separate navigation.)
