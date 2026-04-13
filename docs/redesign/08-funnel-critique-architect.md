# 08 — Funnel Structure Critique (Architecture)

Reviewed: 07-onboarding-funnel.md (the 4-door funnel strategy), 06-onboarding-flow-v2.md (the detailed 3-step quiz spec), 02-ux-architecture.md (workspace architecture post-onboarding), VariantB.tsx component prototype, CLAUDE.md product context.

---

## 1. Structural Issues

### 1.1 The funnel spec has split into two conflicting documents

The most urgent structural problem is that **two parallel specs describe two different funnels**, and neither acknowledges the other.

**Doc 07 (funnel):** 4 doors (Business, Explorer, Idea, Discovery) converge at a single Proposal Preview (Screen A2), then Build, then Live. Door A goes directly from vertical picker to Proposal Preview in 2 screens. No services quiz. No hours picker.

**Doc 06 (flow v2):** A single 3-step wizard: vertical picker, service editor, availability picker. Optional website extraction between steps 1 and 2. Progressive profiling during the build. No doors. No examples gallery. No free-text "describe your idea" entry.

These are not the same funnel. Doc 07's Door A skips the services/hours quiz entirely. Doc 06's wizard has no concept of Doors B, C, or D. The Proposal Preview in doc 07 shows pre-generated services (Strategy call, Workshop, Quick check-in) with no indication of where those defaults came from or how the user confirms them. Doc 06's Step 2 and Step 3 are the mechanism for that confirmation but are absent from doc 07.

**Impact:** Developers will not know which document to implement. If Door A goes straight to the Proposal Preview without collecting services/hours, the preview shows generic vertical defaults that the user never confirmed. This contradicts the core "propose-and-go" principle, which requires explicit user confirmation of defaults — not silent application of them.

**Fix:** Merge into one canonical spec. Door A must include the services/hours confirmation flow. The Proposal Preview is the OUTPUT of that confirmation, not a substitute for it. Recommended structure below in Section 4.

### 1.2 Door A skips the personalization that makes the preview credible

Doc 07, Door A: "I need something for my business" goes to A1 (pick vertical + business name), then straight to A2 (Proposal Preview showing services, prices, hours).

The question is: where did those services and prices come from? The answer is vertical defaults — but the user never saw or confirmed them. The preview says "Strategy call, 60 min, EUR 120" but the user never typed those numbers.

This creates a credibility problem. If the defaults are wrong (and for many consulting businesses, they will be), the user sees a preview that doesn't match their business. The "This looks right" button becomes "I guess this is close enough" — which is the opposite of the ownership effect the funnel is trying to create.

**The services/hours quiz from doc 06 is not overhead — it is the mechanism that makes the Proposal Preview feel like "mine."** Without it, the preview is just a template with the user's business name injected.

**Fix:** Door A needs the services/hours quiz steps between the vertical picker and the Proposal Preview. The quiz should use the "propose-and-go" pattern (pre-filled with vertical defaults, user confirms or overrides), not a blank form. This is exactly what doc 06 describes. Door A should route through it.

### 1.3 The Proposal Preview conflates two different things

Screen A2 (Proposal Preview) tries to be both:
1. A **confirmation step** — "Here's what we'll build, is this right?"
2. A **mini preview** — "Here's what your page will look like"

These serve different purposes. The confirmation step needs editable data (services, hours, style). The mini preview needs visual fidelity (layout, colors, typography).

In the current design, the Proposal Preview does neither well. It shows a static card with service names and prices (not editable inline) and a "Change things" button that is undefined. The user can see the data but cannot edit it without expanding an undesigned interface.

**Fix:** Separate these concerns:
- **The quiz steps (from doc 06) ARE the confirmation.** The user edits services and hours there.
- **The Proposal Preview becomes a pure preview** — a visual rendering of what the page will look like, using the data already confirmed. No editing on the preview. The CTA is "Build this" (not "This looks right" which implies the data might be wrong).
- Remove the "Change things" button. If the user wants to change data, they use the back button to return to the quiz steps.

### 1.4 Door D (Discovery) is architecturally orphaned

Door D ("Let's find out") offers three data sources: Screen Time screenshot, website URL, Google Takeout. These are the core Discovery Engine features from CLAUDE.md. But the funnel spec does not describe what happens AFTER any of these.

- Screen Time screenshot: upload, then what? The analysis produces app usage data, not business vertical/services/hours. How does "you spend 3 hours on Instagram" become a booking page proposal?
- Website URL: this IS designed in doc 06 as the optional extraction step between quiz Step 1 and Step 2. But doc 07 treats it as a Door D sub-option rather than an accelerator within Door A.
- Google Takeout: async (hours/days to process). The user cannot wait. The funnel has no mechanism for "come back when your export is ready."

Door D does not converge cleanly at the Proposal Preview because the data it produces (app usage patterns) is fundamentally different from what the Proposal Preview needs (business vertical, services, hours, prices).

**Fix:** 
- **Website URL** belongs inside Door A (as doc 06 already designs it), not inside Door D. It is a personalization accelerator, not a discovery mechanism.
- **Screen Time and Google Takeout** are discovery features that belong in the product (post-onboarding workspace), not in the onboarding funnel. They answer "what wastes your time?" — a different question from "what should your booking page look like?"
- **If Door D must exist in the funnel,** it needs its own convergence path that does NOT go to the Proposal Preview. It should go to a "Time X-Ray" results screen that shows the analysis and then offers next steps (one of which might be "build something to fix this," which THEN enters the Door A flow).
- Alternatively, simplify to 3 doors. Door D's contents become a feature of the workspace dashboard, accessible after the user has a project.

### 1.5 Door B and Door C convergence works, but Door C needs guardrails

Door B (Examples): tap a template, land at Proposal Preview with template data pre-filled. Clean. The "I want something different" escape hatch routes to Door A. Good.

Door C (Free text): user describes their need, AI infers vertical + services, lands at Proposal Preview. This works in theory, but:

- **What if the AI inference fails?** The user types "I need help organizing my life" — this is not a business with services and hours. The funnel has no fallback for non-business inputs. Does it force-fit a vertical? Show an error? Redirect to Door D?
- **What if the description is too vague?** "I want a website" gives the AI nothing to work with. The spec says "Haiku analyzes the text" but does not describe the failure mode.
- **The "propose-and-go" pattern requires confirmable defaults.** If the AI generates garbage defaults from a vague input, the Proposal Preview loses credibility.

**Fix:** Door C should route through the quiz steps (not directly to the Proposal Preview) with AI-inferred defaults as the pre-fill. This gives the user a chance to correct bad inferences. If the AI cannot infer a vertical, default to "Other" and let the quiz steps collect the details explicitly.

---

## 2. Information Architecture Refinements

### 2.1 Canonical funnel architecture (recommended)

```
Screen 1: "What brings you here?"
  ├── Door A: "I need something for my business"
  │     └── Step A1: Vertical picker + business name
  │           └── [Optional: Website URL extraction]
  │                 └── Step A2: Service editor (pre-filled)
  │                       └── Step A3: Availability picker (pre-filled)
  │                             └── Proposal Preview (read-only visual)
  │                                   └── Build → Live
  │
  ├── Door B: "Show me what this can do"
  │     └── Step B1: Example gallery
  │           ├── [Pick one] → Step A2 (pre-filled from template)
  │           └── [I want something different] → Step A1
  │
  └── Door C: "I have an idea but I'm not sure"
        └── Step C1: Free text description
              └── AI infers vertical + defaults
                    └── Step A2 (pre-filled from AI inference)
```

**Key changes from doc 07:**
- 3 doors, not 4. Discovery (Screen Time, Takeout) moves to post-onboarding.
- Website URL is an accelerator within Door A, not a separate door.
- All paths go through the service editor (A2) and availability picker (A3) before the preview.
- Door B and Door C converge at Step A2 (service editor), not at the Proposal Preview. This gives users from all paths a chance to confirm/edit their data.
- The Proposal Preview is purely visual and read-only. No "Change things" button — use back navigation.

### 2.2 Step count per path

| Path | Steps to Build | User time (est.) |
|------|----------------|-------------------|
| Door A, accept defaults | A1 + A2 + A3 + Preview = 4 taps | ~12s |
| Door A, with website URL | A1 + URL + confirm + Preview = 4 taps | ~19s |
| Door B, pick template | B1 + A2 + A3 + Preview = 4 taps | ~15s |
| Door C, describe idea | C1 + A2 + A3 + Preview = 4 taps | ~20s |

All paths are 4 interaction points. The quiz steps (A2, A3) are fast because defaults are pre-filled — the user confirms with "Next" without editing if the defaults are good. The Proposal Preview adds one more tap ("Build this") but provides the critical ownership moment.

### 2.3 The Proposal Preview should earn its screen real estate

The current Proposal Preview (doc 07, Screen A2) is a small card showing service names, prices, and hours. This undersells the moment.

The Proposal Preview should be the emotional peak of the funnel — the moment the user sees THEIR page before it exists. Make it as close to the real output as possible:

```
┌─────────────────────────────────────────────┐
│                                             │
│  Here's your booking page                   │
│  We'll build this in about 30 seconds.      │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │                                     │    │
│  │     [Full-width visual preview]     │    │
│  │     Business name in header         │    │
│  │     "Book your next session"        │    │
│  │                                     │    │
│  │     Service 1 · 60 min · EUR120     │    │
│  │     Service 2 · 180 min · EUR350    │    │
│  │     Service 3 · 30 min · EUR50      │    │
│  │                                     │    │
│  │     Mon-Fri, 09:00-17:00           │    │
│  │                                     │    │
│  │     [ Book now ]                    │    │
│  │                                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │         Build this  →               │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  [ ← Change my details ]                   │
│                                             │
└─────────────────────────────────────────────┘
```

- "Build this" is the single CTA. Confident, irreversible-sounding (though nothing is truly irreversible).
- "Change my details" is a text link that navigates back to the service editor. Not an inline editor. Not a modal.
- The preview fills the viewport. The user should feel like the page already exists.

---

## 3. Edge Cases and Missing Flows

### 3.1 Repeat visits (the funnel only covers first-time)

The biggest architectural gap. Doc 07 describes the first visit. Doc 02 describes the workspace. But what happens when:

**User completed onboarding, has a project, returns to the site.**
- Doc 02 answers this: redirect to `/workspace/[projectId]`. The workspace loads in LIVE state (if build completed) or BUILDING state (if build is still running). This is correct.

**User started onboarding, abandoned mid-flow, returns.**
- Doc 06 says: "if the user abandons onboarding mid-flow, they start fresh on return." This is acceptable for a 12-35 second flow. No state persistence needed.

**User completed onboarding, build failed, returns.**
- Doc 02 covers this: "If the user returns to a workspace with no builds, show a single 'Resume setup' button." Good.

**User wants a SECOND project.**
- Doc 02 says: "One project per user initially." This is fine for MVP but should be acknowledged in the funnel spec. The 3-door screen should NOT appear for returning users who already have a project. The entry point for a second project (when supported) should be in the workspace, not in the onboarding funnel.

**User clicks a marketing link and is already logged in with a project.**
- The funnel should detect existing projects and redirect to the workspace. Never show the 3-door screen to a user who already has a project.

### 3.2 The "Change things" button is undesigned

Doc 07, Proposal Preview: `"Change things" = expand inline editors for services, hours.`

What does "expand inline editors" mean? This is an unspecified interaction. Options:

1. **Inline editing on the preview card** — each service becomes editable in place. This is complex (the preview is a visual mockup, not a form) and creates a hybrid state where the preview is simultaneously a form and a preview.
2. **Navigate back to the quiz steps** — simple, uses existing components, consistent with the linear flow.
3. **A modal/drawer with edit fields** — adds a new component, disrupts the flow.

**Recommendation:** Option 2. "Change my details" navigates back to Step A2 (service editor). The quiz steps already handle editing. Do not build a second editing interface. This also avoids the "Change things" button problem entirely — the Proposal Preview becomes read-only.

### 3.3 Door B example gallery — what data do examples carry?

Door B shows 3 example pages (salon, PT, consultant). When the user taps "I want this," what data is transferred?

- **Vertical ID** — obvious, inferred from the example type.
- **Services** — the example's services become the pre-fill for Step A2. But are these the same as the vertical defaults, or are they the example's actual services?
- **Style/layout** — are examples just data templates, or do they also carry visual style (color palette, layout choices)?

If examples are just vertical defaults with a visual wrapper, then Door B is functionally identical to Door A (pick a vertical) with a visual nudge. That is fine — the visual nudge is the value.

If examples carry unique style data (e.g., the salon example has a pink palette, the PT example has a dark theme), then that style data needs to flow into the build prompt. The current architecture does not show where style preferences are stored or how they reach the build.

**Fix:** Define the data contract for Door B examples. At minimum:

```typescript
type FunnelExample = {
  verticalId: string
  displayName: string
  services: Array<{ name: string; durationMinutes: number; priceEur: number }>
  hours: { days: string[]; start: string; end: string }
  stylePreset?: string  // e.g., "warm-minimal", "bold-dark", "editorial-clean"
}
```

### 3.4 Door C AI inference latency

Door C: user types a description, taps "See what Meldar suggests," AI processes the text.

This is a server round-trip with LLM inference. Estimated latency: 2-5 seconds. The funnel spec does not describe:

- **Loading state** during inference. The user tapped a button and nothing happened. What do they see?
- **Failure fallback.** If inference fails or returns unusable results, what happens?
- **Partial inference.** If the AI can infer a vertical but not services, what defaults fill in?

**Fix:** Add a loading state (similar to doc 06's website extraction loading). On failure, redirect to Step A1 (vertical picker) with a message: "We couldn't figure that out automatically. Pick your business type and we'll take it from there." On partial inference, fill what was inferred and fall back to vertical defaults for the rest.

### 3.5 Building screen — should it differ by entry door?

Doc 07: "The Building screen and Live screen are the same regardless of entry door."

This is correct for the Building screen. The auto-build pipeline does not care which door the user entered through. The progress steps are derived from the plan, which is derived from the confirmed services/hours data. All doors converge on the same data shape.

The Live screen is also correctly door-agnostic. The preview is the user's page, regardless of how they got there.

One exception: **the progressive profiling questions (doc 06, Section 7) should adapt based on what was already collected.** If the user entered via Door A with a website URL and the extraction found a location, the "Where are you based?" profiling question should be skipped. The current doc 06 spec handles this: "If location was already extracted from a website URL, this question is skipped." This is correct and should be maintained in the merged spec.

### 3.6 Authentication timing

Neither doc 07 nor doc 06 fully specifies when authentication happens relative to the funnel.

Doc 06 says: "Onboarding requires auth." The flow overview shows `/sign-up (or /login)` before `/onboarding`.

But the 4-door screen in doc 07 is designed to feel zero-friction. Requiring auth BEFORE the user even picks a door adds a barrier at the highest-intent moment.

**Options:**
1. **Auth before funnel** — current spec. Adds friction but simplifies data persistence.
2. **Auth after quiz, before build** — user completes the quiz anonymously, then is asked to sign up to trigger the build. The quiz data is held in client state.
3. **Auth after build, before saving** — most aggressive. User sees their page built, THEN signs up to keep it.

Option 2 is the best balance. The user invests in the quiz (sunken cost), then signing up feels like a natural next step to protect their investment. The Proposal Preview screen is the ideal auth gate: "Sign up to build this page."

**Fix:** Move the auth wall to the Proposal Preview screen. The quiz steps (A1, A2, A3) work anonymously with client-side React state. When the user taps "Build this" on the preview, check auth status. If not authenticated, show a sign-up/login prompt. If authenticated, trigger the build.

---

## 4. Recommended Changes (Ordered by Impact)

### Impact 1: Merge the two specs into one canonical document

Resolve the 07/06 conflict. A single funnel spec that describes: 3 doors, the quiz steps, the Proposal Preview, the build, and the live state. Door D (discovery) moves to post-onboarding. Website URL becomes an accelerator within Door A.

### Impact 2: Route all doors through the service editor (A2) and availability picker (A3)

Door B and Door C currently skip these steps and go directly to the Proposal Preview. This means users from those paths never confirm the data that defines their page. Route them through A2 and A3 with appropriate pre-fills (template data for Door B, AI-inferred data for Door C).

### Impact 3: Make the Proposal Preview read-only

Remove the "Change things" button. The Proposal Preview is a visual reward for completing the quiz. Editing happens via back navigation to the quiz steps. This eliminates an undesigned interaction (inline editing on a preview card) and keeps the component tree simpler.

### Impact 4: Move the auth wall to the Proposal Preview

Let the quiz steps work anonymously. Gate on "Build this." This reduces friction at the funnel entry point and increases the user's investment before the auth barrier.

### Impact 5: Drop Door D from the onboarding funnel

Screen Time, Google Takeout, and discovery analysis are product features, not onboarding mechanisms. They answer "what wastes your time?" which is a different question from "what should your booking page look like?" Move them to the workspace dashboard where they become enrichment features for existing users.

### Impact 6: Define Door B example data contracts

Specify exactly what data flows from an example selection into the quiz steps. At minimum: verticalId, services, hours. Optionally: stylePreset. Without this, Door B cannot be implemented.

### Impact 7: Design Door C failure states

Add loading state, error fallback (redirect to A1), and partial inference handling. Without these, Door C is fragile.

### Impact 8: Add repeat-visit routing logic

- Has project + build complete: redirect to workspace (LIVE state)
- Has project + build running: redirect to workspace (BUILDING state)  
- Has project + build failed: redirect to workspace (recovery state)
- No project + authenticated: show the 3-door funnel
- No project + unauthenticated: show the 3-door funnel (quiz works anonymously)
- Already has a project + hits marketing link: redirect to workspace, never show funnel

---

## 5. Revised Flow Diagram

```
                         meldar.ai / marketing link
                                    |
                              [Has project?]
                               /         \
                             YES          NO
                              |            |
                    /workspace/[id]    Screen 1: 3 Doors
                    (BUILDING/LIVE/      |
                     MANAGING)     ┌─────┼──────┐
                                   |     |      |
                                Door A  Door B  Door C
                                   |     |      |
                              Vertical  Example  Free text
                              + name    gallery  description
                              + [URL]    |      |
                                   |   pick    AI inference
                                   |   one      |
                                   |     |      |
                                   └─────┼──────┘
                                         |
                                   Step A2: Services
                                   (pre-filled from:
                                    vertical / template / AI)
                                         |
                                   Step A3: Availability
                                   (pre-filled)
                                         |
                                   Proposal Preview
                                   (read-only visual)
                                         |
                                   [Authenticated?]
                                    /           \
                                  YES            NO
                                   |              |
                                   |         Sign up / Log in
                                   |              |
                                   └──────┬───────┘
                                          |
                                     "Build this"
                                          |
                                   POST /api/onboarding
                                          |
                                   /workspace/[id]
                                   (BUILDING state)
                                          |
                                   [Progressive profiling
                                    during build wait]
                                          |
                                   LIVE state
```

---

## 6. Component Impact on VariantB.tsx

The prototype in `VariantB.tsx` currently shows 7 screens in a linear scroll:

1. `ThreeDoorsScreen` (4 doors)
2. `ExamplesScreen` (Door B)
3. `DescribeScreen` (Door C)
4. `DiscoveryScreen` (Door D)
5. `ProposalPreview`
6. `BuildingScreen`
7. `LiveScreen`

Recommended changes for the prototype:

- Remove `DiscoveryScreen` (Door D removed from funnel)
- Update `ThreeDoorsScreen` to show 3 doors instead of 4
- Add service editor and availability picker screens between the door-specific screens and the Proposal Preview
- Make `ProposalPreview` read-only (remove "Change things" button)
- Replace "This looks right" with "Build this"
- Add a "Change my details" back-navigation link on the preview
- The `BuildingScreen` and `LiveScreen` remain as-is — they are correct

The `fixtures.ts` data structures support this well. The `BUSINESS` fixture already carries services, hours, and vertical data. The `BUILD_PROGRESS` fixture correctly models the building state.
