# 09 — UX Researcher validation of the new onboarding funnel

**Scope:** New 3-door funnel → Proposal Preview → Workspace (BUILDING). Components reviewed on 2026-04-13.
**Persona lens:** Irka (hairdresser, phone-only, Finnish-speaker on ChatGPT but new to "apps"), and secondarily "the CEO with 3 apps + Docs."
**Files reviewed:**
- `apps/web/src/features/onboarding/ui/DoorPicker.tsx:1`
- `apps/web/src/features/onboarding/ui/DoorA.tsx:1`
- `apps/web/src/features/onboarding/ui/DoorB.tsx:1`
- `apps/web/src/features/onboarding/ui/DoorC.tsx:1`
- `apps/web/src/features/onboarding/ui/ProposalPreview.tsx:1`
- `apps/web/src/features/onboarding/ui/OnboardingFunnel.tsx:1`
- `apps/web/src/features/onboarding/model/funnel-machine.ts:1`
- `apps/web/src/features/onboarding/model/proposal-data.ts:1`
- `apps/web/src/features/onboarding/model/example-pages.ts:1`
- `apps/web/src/widgets/workspace/WorkspaceShell.tsx:1`
- `apps/web/src/widgets/workspace/WorkspaceTopBar.tsx:1`
- `apps/web/src/widgets/workspace/PreviewPane.tsx:1`
- `apps/web/src/widgets/workspace/OverflowMenu.tsx:1`
- `apps/web/src/widgets/workspace/BuildStatusOverlay.tsx:1`

---

## Top 3 Strengths

### 1. The 3-door framing respects that users arrive with different levels of clarity
Previously the onboarding asked "What's your business?" — which assumed the user already was a business. The new `DoorPicker` qualifies intent with a no-wrong-answer triage: "I need something", "Show me what this can do", "I have an idea but I'm not sure." This aligns with the finding in doc 01 (§1.3, §4.4) that the target persona does not know what to build or why. Door C ("I have an idea but not sure where to start") is the critical addition for Irka and the sent-in-employee persona — neither had an entry point before.

Evidence in code: `DoorPicker.tsx:18-36` — three equally-weighted options, no "primary" path styling. Door C's copy ("Tell us in your own words") explicitly signals vague input is acceptable. This maps to the "Lost" and "Forced Learner" personas from `07-onboarding-funnel.md` §Drop-off Prevention.

### 2. The Proposal Preview is doing the heaviest lifting in the funnel
`ProposalPreview.tsx:37-78` shows the user a rendered card with THEIR business name, THEIR services, THEIR hours — before they've committed to building anything. This is the endowment-effect moment called out in doc 07. Two observations:
- The card visually separates from the page chrome (primary-tinted header, service list, hours footer), so it reads as "a page-in-miniature," not a form summary.
- The dual CTA — "Let's go →" (gradient primary) vs. "Change things" (outlined secondary) — is well-weighted. "Change things" is non-threatening phrasing that won't scare off the 90% who tap the primary action. Compare to a generic "Edit" which implies work.

This is the single highest-impact screen in the funnel and it's getting the attention it deserves.

### 3. Auto-build on workspace entry removes the blank-prompt cliff
The previous workspace dumped users into a blank preview with "Describe what you want to build" — the exact Lovable/Replit anti-pattern flagged in doc 01 §4.1. The new `WorkspaceShell.tsx:73-82` auto-triggers a build when the user arrives with "ready" or "draft" Kanban cards and no preview yet. This means the user lands on the workspace and immediately sees progress happening — "Thinking…" → "Writing code…" → live preview — without having to type anything.

This is the correct fix for the structural problem. The user has already given consent via "Let's go →" on the Proposal Preview, so auto-build honors the intent they already expressed rather than re-asking.

---

## Top 3 UX Issues

### Issue A — "Writing code…" leaks the implementation to a non-technical user (P0)
**Where:** `PreviewPane.tsx:89-95`

The building state displays:
- "Thinking…" (acceptable, human metaphor)
- "Writing code…" (BAD — Irka doesn't want "code"; she wants a booking page)
- "Writing helpers.ts…" (MUCH WORSE — filename is meaningless, and the word "helpers.ts" will read as malfunction to a non-technical user)

This is the same failure mode called out in doc 01 §6.1–§6.2 and was supposed to be fixed in this redesign. It has not been. Users paid the cognitive cost of intent-qualification through three doors and a proposal preview — then at the moment of payoff they see a file named `helpers.ts` scroll by. That breaks the spell.

**Severity:** P0. This is the highest-stakes moment (the build) with the highest-scrutiny user (first-time, uncertain). Every second of "Writing code…" is a second where Irka wonders if she's in the wrong product.

**Fix:** Map file operations to functional progress strings. Even a static rotating list would be better than filenames:
- "Setting up your page…"
- "Adding your services…"
- "Choosing your colors…"
- "Getting the booking form ready…"

The orchestrator already knows what's being written; a thin mapping layer (file-path → functional verb) closes this gap cheaply.

### Issue B — Back navigation from the Proposal Preview via Door B or C silently drops user input (P1)
**Where:** `funnel-machine.ts:20-33`

When the user reaches Proposal Preview through Door B (example selection) and clicks "Change things":
```
case 'b': return { screen: 'doorB' }
```
They land back on the generic examples grid. Their selected example is NOT highlighted. If they reached Proposal Preview via Door C (freeform text), clicking "Change things" returns:
```
case 'c': return { screen: 'doorC', freeformText: '' }
```
The freeform text is gone — empty string. They have to retype.

Door A correctly re-hydrates `selectedVerticalId` and `businessName` (`funnel-machine.ts:24-28`). Door B and Door C do not.

Worse — "Change things" on ProposalPreview implies you can edit the proposal (services, hours, name). Nothing in the current code actually lets you edit; the only escape is back to the door. The button is a promise the UI does not keep.

**Severity:** P1. Users who tap "Change things" expecting to tweak one service name will feel gaslit when they're sent back to square one. They may drop off rather than retype — and if they DO retype Door C freeform, the Haiku classification may return a different vertical, producing an entirely different proposal. Non-deterministic UX from the user's perspective.

**Fix (minimum):** Either
- (a) implement actual inline editing on ProposalPreview for services/hours/name (the doc 07 spec calls for this — "'Change things' = expand inline editors"), OR
- (b) rename the button to "Start over" and preserve at least the Door C text on back nav so users don't lose their description.

Option (a) is correct per the spec. Option (b) is the stop-gap if inline editing slips.

### Issue C — Door A collects a website URL and then does nothing with it (P1)
**Where:** `DoorA.tsx:110-129`, `OnboardingFunnel.tsx:20-25`, `funnel-machine.ts:37-55`

Door A prompts "Got a website? We'll read it for you" with a URL field. Doc 07 §A1 calls this out as a "'wow it knows me' moment" — Meldar reads the site, extracts services, pre-fills the proposal.

Reality: the URL is captured in local state, passed through `submitDoorA`, and **dropped on the floor**. `funnel-machine.ts:37-55` ignores `websiteUrl` entirely when constructing the proposal. The user who types `studio-mia.fi` sees the exact same generic proposal as the user who leaves it blank.

This is worse than not asking. The form made a promise ("We'll read it for you"), extracted effort from the user, then produced no observable difference. When the user sees their proposal with generic "Haircut 45 min / Color 90 min / Blowout 30 min" — not matching their real website — they will correctly conclude Meldar did not read their site. Trust collateral damage.

**Severity:** P1 for the deceptive-affordance harm; P0 if the v3 positioning promise ("Your AI. Your app.") is taken seriously, because this is the first product interaction where Meldar could demonstrate "reading your world."

**Fix:** Either
- Wire the URL to a server-side scrape + Haiku classification that alters `proposal.services` (the "wow" moment as designed), OR
- Remove the URL field until it's wired. A removed field is better than a dishonest one.

Do not ship the field in a "we'll read it soon" state. Users cannot tell "feature in development" from "feature broken."

---

## Drop-off Risks (ranked by likelihood × impact)

### HIGH — Door C → generic proposal (keyword-only inference)
`proposal-data.ts:23-50` uses a 4-entry keyword map (hair, fitness, tattoo, consulting). Anything else → "other" → empty `defaultServices` (likely). A dance instructor who types "I teach ballet to kids" hits `verticalId: 'other'` and sees a proposal with their own business name but no relevant services. This looks broken to the user. Expected: if Haiku isn't wired yet, broaden the keyword map to cover at least dance, photography, yoga, bookkeeping, law, accounting, therapy, tutoring, pet grooming. Each missing vertical is a drop-off.

### HIGH — "Change things" → lost state (Issue B above)
Users who tap "Change things" from a Door B or Door C path lose their input. Estimated drop-off: 30–50% of users who tap "Change things" (no data, but the pattern — losing work after a tap — is well-documented to cause abandonment).

### MEDIUM — Empty `writtenFiles` state shows "Thinking…" indefinitely
`PreviewPane.tsx:96-105` shows "Thinking… Meldar is planning your page" when `writtenFiles` is empty. If the orchestrator takes 15+ seconds before emitting the first file write (plausible under API latency), the user stares at a pulsing dot with no progress indicator. No percentage, no step count, no ETA. Doc 01 §2.1–2.2 called this out under the old onboarding; the new workspace has the same gap.

### MEDIUM — Auto-build failure → toast + stuck on empty PreviewPane
`WorkspaceShell.tsx:117-133` handles auto-build failure by emitting a toast and publishing `failed` state. What does the user see? The preview pane shows "Describe what you want to build" (the default empty state at `PreviewPane.tsx:125-136`) — which is the exact Lovable anti-pattern this redesign was meant to avoid. A user who just tapped "Let's go →", watched a spinner, then sees "Describe what you want to build" will reasonably conclude Meldar is broken or that the proposal was ignored. The toast is ephemeral; the empty state is persistent.

### MEDIUM — No explicit "we're building your page" handoff between Proposal Preview and Workspace
The user taps "Let's go →" on `/onboarding` and is routed via `router.push(\`/workspace/${projectId}\`)` (`OnboardingFunnel.tsx:80`). Between the tap and the workspace render, they see a route transition. In the workspace, there's no persistent banner saying "We're setting up [Business Name]" tying this moment to what they just approved. The user has to trust that the pulsing dot in PreviewPane is THEIR page being built — not some default workspace. Missed continuity.

### LOW — Door B only has 3 examples, all service businesses
`example-pages.ts:11-45` — hair salon, PT, consulting. A user looking for a landing page, portfolio, email-capture page, or anything non-booking sees only booking examples and infers "this is a booking-page product." That inference matches the current MVP scope but contradicts the broader Meldar positioning ("discover what wastes your time, then build personal apps"). Low severity now because the MVP IS booking-focused, but plan for expansion.

### LOW — OverflowMenu discoverability
`OverflowMenu.tsx:36-56` — a `MoreHorizontal` icon button in the top-right corner, no label. For Irka, "three dots in the corner" is mapped to "Instagram post options" (share/report). She is unlikely to tap it when looking for "my bookings" or "settings." See Copy concerns below.

---

## Copy Concerns

### DoorPicker
- **"Your AI. Your app. Nobody else's."** (`DoorPicker.tsx:46`) — strong brand line but phrased at the wrong moment. The user hasn't decided they want an app yet; this reads as marketing push. Consider moving to the post-build celebration. A warmer Door 1 subtitle: "Tell us where you are. No wrong answers."
- **Icons are emoji** (🏪, 👀, 💡) — acceptable, but 👀 on Door B reads as "I'm watching you" to some users. Consider a simpler marker (Nº1, Nº2, Nº3 per the v3 design language locked 2026-04-08) to match brand.

### DoorA
- **"Got a website? We'll read it for you"** — until this is wired (see Issue C), this copy is making a false promise. Hide the field or change copy to "Website (optional — link from your page)."
- **"Continue →"** on the submit button is generic. Per v3 brand voice (avoid "build"), try "See my proposal →" or "Let's get it ready →". "Continue" doesn't tell Irka what happens next.

### DoorB
- **"Real pages made with Meldar"** implies these exist in production. If they're templates, this is misleading. If they ARE real customer pages (great!), consider adding a tiny attribution (e.g., "Sofia's Hair Studio — Helsinki") to reinforce social proof.
- **"Tap one to make it yours. We'll swap in your details."** — but Door B doesn't collect the user's details BEFORE navigating to ProposalPreview. The proposal uses the example's title ("Sofia's Hair Studio") as the business name (`OnboardingFunnel.tsx:36`). The user will see "Sofia's Hair Studio" on their preview, not their own business name. This contradicts the copy promise.

### DoorC
- **"What's eating your time?"** — on-brand (matches Meldar's "discover what wastes your time" positioning) but mismatched with what Door C actually does (generate a booking page from a description). A user who types "my team wastes hours on scheduling" will get a proposal for a booking page for a consulting business — which may not solve the scheduling problem they described. Either:
  - change copy to match scope: "What do you want to set up?" or "Describe what you need."
  - OR expand Door C to actually triage non-booking needs with an informed "we can't build that yet, join waitlist" path.
- **Example quotes** (`DoorC.tsx:70-78`) — all three examples imply booking-page solutions. Keep scope honest.

### ProposalPreview
- **"Here's what we've put together for you"** — warm, good.
- **"Ready in about 30 seconds. Change anything first, or go."** — "go" is ambiguous (leave? submit?). "Ready in about 30 seconds. Change anything first, or continue." Or "Change anything first, or build it now." Note: avoid "build" per brand voice; "continue" is safer.
- **"Let's go →"** button — friendly. But given Issue B, this button is doing the work that "Change things" is also supposed to do (both lead to the next state; "Change things" just goes backward). Make the asymmetry clearer: "Let's go →" as primary gradient (already correct); "Change things" (or the fixed version "Start over") as a smaller, quieter ghost button.

### PreviewPane (during BUILDING)
- **"Writing code…"** — REMOVE. See Issue A.
- **"Writing `{filename}`…"** — REMOVE. See Issue A.
- **"Thinking… Meldar is planning your page."** — acceptable. Keep.
- **"Starting preview… Your page is ready. Loading the live preview."** — contradicts itself. "Your page is ready" but then "Loading the live preview" — which is it? Suggest: "Almost there… Loading your preview."
- **Default empty state** — "Describe what you want to build" + code-editor examples like "create a booking page for a hair salon with 3 services" — this entire empty state should NEVER render for an onboarding user (they should always auto-build). If it's reached, something went wrong. Treat as error state with "Something didn't land — try again" rather than a blank prompt. Currently the user has no signal that they're in an anomalous state.

### OverflowMenu
- **"My site →"** — good, plain.
- **"Manage bookings"** — correct for Irka.
- **"Settings"** — too abstract. Irka doesn't know what's in "Settings." Label by content: "Hours & services" or "Business info."
- **"All projects"** — for a user with one project, this is confusing ("what other projects?"). Conditionally render only when user has ≥2 projects, or label "Switch project" when count > 1, hide when count = 1.

---

## Recommended Changes (prioritized)

### P0 — Must fix before shipping
1. **Remove developer-speak from BUILDING state.** Replace "Writing code…" and file-name leaks with functional, user-facing progress strings. (Issue A, `PreviewPane.tsx:89-95`)
2. **Fix Door B / Door C back-nav state loss.** Either implement inline editing on ProposalPreview (per doc 07 spec) or preserve prior input when returning to a door. (Issue B, `funnel-machine.ts:20-33`)
3. **Either wire or remove the Door A website URL.** Do not ship a dishonest affordance. (Issue C, `DoorA.tsx:110-129`)
4. **Handle auto-build failure explicitly in PreviewPane.** Don't fall back to the "Describe what you want to build" empty state after a failed auto-build. Show "Setup didn't finish. [Retry] or [Start over]". (`WorkspaceShell.tsx:117-133`, `PreviewPane.tsx:125-136`)

### P1 — Ship soon after
5. **Persistent "Setting up {Business Name}…" banner during BUILDING.** Bridges the gap between "Let's go →" and the live preview. Reassures the user their approval is being honored.
6. **Broaden Door C keyword inference OR ship Haiku classification.** The current 4-keyword map fails most user descriptions silently. (`proposal-data.ts:23-50`)
7. **Fix Door B proposal title to use user's own business name** — either collect it before routing to the example, or prompt for it on ProposalPreview (rename allowed in-place). (`OnboardingFunnel.tsx:27-45`)
8. **Rename OverflowMenu "Settings" to something concrete** ("Hours & services" or split into "Business info" + "Hours"). Hide "All projects" when the user has one project.

### P2 — Nice to have
9. Replace emoji door markers with numbered Nº markers to match v3 design language.
10. Label Door C scope honestly or broaden Door C routing.
11. Add step count or "usually 20–40 seconds" estimate to the BUILDING state.
12. Tiny attribution under Door B examples to reinforce social proof.

---

## One-line summary
The new funnel's architecture is correct (3 doors → 1 proposal → auto-build); the conversion risks live in three specific gaps: developer-language during BUILDING, dropped state on "Change things", and an unwired Door A website field that actively damages trust.
