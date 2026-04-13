# UX Architecture: Workspace Redesign

*Informed by UX Research Findings (01-ux-research-findings.md) and independent code analysis.*

## Research Questions Answered

The UX Researcher posed four questions for this document. Here are the answers (with section references):

**Q: How should the onboarding-to-workspace transition work so that the user's first view is a personalized, pre-built booking page — not a blank canvas?**
A: Auto-build starts during onboarding, not after workspace entry. The user arrives to the BUILDING state with progress already visible. See Section 2 (onboarding-to-workspace bridge).

**Q: What is the minimum viable personalization that makes a booking page feel "mine"?**
A: Business name + services (name, duration, price) + hours. These are collected in onboarding Step 2 with vertical-specific defaults the user confirms or overrides. See Section 4 (vertical-to-defaults mapping).

**Q: How should the propose-and-go pattern be implemented? Inline confirmation during onboarding, or a separate "plan review" step?**
A: Inline confirmation during onboarding. Structured form fields with smart defaults, not a free-text proposal card. No separate "plan review" step — the personalization form IS the proposal. See Section 2 (onboarding Step 2) and Section 4.

**Q: Should tabs (Bookings, Settings) be hidden until they have content, or revealed progressively?**
A: Neither — tabs are deleted entirely. Bookings and Settings move to an overflow menu, accessible only when relevant. See Section 3 (navigation model).

---

## 1. Current State Summary

### What exists today

The workspace has **three layers** with fundamentally different mental models stitched together:

1. **Dashboard** (`/workspace`) — project grid, streak badge, continue banner, sign out
2. **Builder** (`/workspace/[projectId]`) — full-screen shell with preview iframe + feedback bar
3. **Admin** (`/workspace/[projectId]/admin`) — bookings dashboard + settings, accessed via tab nav

**Onboarding** (`/onboarding`) is a separate route that creates a project and redirects into the workspace. It asks "What's your business?" with vertical cards (Hair salon, Gym, etc.) and an optional business name.

### P0 problems (from UX Research, confirmed by code analysis)

**P0-1. No personalization captured during onboarding.** The `/onboarding` page collects a vertical ID and an optional business name. That's it. No services, no hours, no style preferences. The system pre-fills generic defaults (Haircut EUR 45, Color EUR 85, Blowout EUR 35) that may be completely wrong for the user. These defaults are silently applied in the background — the user never sees or confirms them. (Research finding 1.1, 1.7)

**P0-2. "Your booking page is ready!" leads to a blank canvas.** Onboarding tells the user their page is "ready," then redirects to the workspace which shows an empty preview pane with "Describe what you want to build." This is the trust-killing moment. The system promised a booking page and delivered a text input. (Research finding 3.1, 4.1)

**P0-3. Prompt-first interaction = Lovable/Replit clone.** The workspace asks "Tell me what you want to build" with template chips + free text. This is the exact pattern the founder identified as the core problem. A non-technical user does not know how to formulate a prompt. (Research finding 4.1, 4.3)

**P0-4. System never proposes.** Despite the "propose-and-go" vision documented in memory, nothing is ever proposed. The `generate-proposal` API exists but is only triggered by user free-text input. Every action requires user initiation. (Research finding, all competitive analysis)

### Additional structural problems (from code analysis)

**P5. The "Make this now" ceremony.** `PromptEditor` presents each kanban card with a manual "Make this now" button. The founder explicitly called this out: "If it's a button that gets clicked 100% of the time, why does it exist?" The entire TaskListPane/ArtifactPane/PromptEditor pipeline assumes the user selects a task, reads a prompt, then clicks build. This is a developer's mental model, not Irka's.

**P6. TaskListPane is a developer artifact.** The sidebar shows milestones, subtasks, state icons, and position numbers. This is a kanban board exposed as a nav panel. Irka doesn't know what a "milestone" is.

**P7. WorkspaceNav has premature tabs.** Three tabs: Build, Bookings, Settings. The "Build" tab is the entire workspace. "Bookings" and "Settings" are admin features that only make sense after the first build is deployed. Showing them from minute one adds cognitive load for zero benefit. (Research finding 4.2)

**P8. Preview is the most important thing, but it's buried.** The preview iframe only appears after a build succeeds and the sandbox URL resolves. Before that, the user stares at placeholder text.

**P9. Developer language throughout.** "Writing code...", "Writing helpers.ts...", "Review AI actions", "dashboard", "Build" tab. Irka doesn't think in these terms. (Research finding 6.1, 6.2, 7.2)

**P10. No wish persistence in the UI.** The proposal flow captures wishes into the DB, but the workspace UI never surfaces them again. The user can't see or edit what they asked for.

## 2. New Page Hierarchy

### Route structure

```
/onboarding                     → Pick vertical + confirm personalization
/workspace                      → Project selector (only if >1 project)
/workspace/[projectId]          → THE workspace (single page, all states)
```

The `/workspace/[projectId]/admin` and `/workspace/[projectId]/admin/settings` routes are deleted. Their functionality moves to an on-demand panel within the workspace, accessed via overflow menu.

### Key decision: single workspace page

The workspace (`/workspace/[projectId]`) is ONE page with progressive states, not separate routes for build/admin/settings. Irka should never navigate between tabs. The workspace morphs based on project state.

### The onboarding-to-workspace bridge (solves P0-1 and P0-2)

The critical failure in the current system is the gap between "Your booking page is ready!" and a blank workspace. The new architecture eliminates this gap entirely:

```
/onboarding Step 1: "What's your business?"
  → User picks "Hair / Beauty"

/onboarding Step 2: "Let's set it up" (NEW — minimum viable personalization)
  → Pre-filled from vertical defaults, user confirms or overrides:
  → Business name: [Studio Mia        ]
  → Your services (we guessed these — change what's wrong):
      [Haircut    ] [45 min] [EUR 45]  [x]
      [Color      ] [90 min] [EUR 85]  [x]
      [Blowout    ] [35 min] [EUR 35]  [x]
      [+ Add another service]
  → Your hours:
      [Tue-Sat] [10:00 - 18:00]
  → [ Build my booking page → ]

/onboarding Step 2 triggers:
  1. Saves wishes (services, hours, name) to project
  2. Generates plan from personalized wishes
  3. Starts auto-build pipeline
  4. Redirects to /workspace/[projectId]

/workspace/[projectId] — user arrives to State: BUILDING
  → Build is ALREADY running. Progress visible immediately.
  → No blank canvas. No "describe what you want." No proposal step.
  → Within 30-60 seconds, preview appears with THEIR services, THEIR hours.
```

**Why personalization happens during onboarding, not in the workspace:** The loading state between Step 2 and workspace arrival is currently wasted time (a spinner). By collecting services and hours DURING this step, we (a) eliminate the blank workspace problem, (b) make the first build personalized, and (c) give the system real data to work with instead of generic defaults.

**Minimum viable personalization (MVP):** Business name + services (name, duration, price) + hours. This is enough to make the booking page feel "mine." The vertical provides sensible defaults that the user can edit inline. No free-text prompts, no open questions — just confirm or override structured fields.

### Project states (drive what the page shows)

```
State 1: BUILDING      — Auto-build pipeline running (triggered by onboarding)
State 2: LIVE          — Preview available, feedback bar active
State 3: MANAGING      — Bookings exist, admin features unlocked
```

Note: The PROPOSING and PLANNING states from the first draft are eliminated. Proposal confirmation and plan generation happen during onboarding, not in the workspace. The user's first workspace experience is always BUILDING or LIVE — never a blank canvas, never a prompt.

**Exception flow for return visits:** If the user returns to a workspace with no builds (e.g., onboarding completed but build pipeline failed), show a single "Resume setup" button that re-triggers the auto-build. Never fall back to "Describe what you want to build."

## 3. Navigation Model

### No tabs. One page. State-driven UI.

The current `WorkspaceNav` with Build/Bookings/Settings tabs is deleted. Instead:

**Top bar** (always visible):
```
[ meldar ]  /  [ Project Name ]                    [ ... menu ]
```

The `...` overflow menu contains:
- "My site" (external link, only when deployed)
- "Manage bookings" (only when bookings feature is active)
- "Settings" (business name, services, hours)
- "All projects" (back to `/workspace`)

**Why no tabs:** Tabs suggest equal-weight destinations. Build/Bookings/Settings are not equal. "Build" is 95% of what Irka does. Bookings and Settings are configuration that she touches once. Promoting them to top-level tabs confuses the hierarchy.

**Why overflow menu:** Irka doesn't need to see "Settings" every time she opens Meldar. But when she wants it, it's one tap away. Progressive disclosure.

### Mobile-first layout

The workspace is a single vertical stack on mobile:
```
[ Top bar          ]
[ Main content     ]  ← Full width, scrollable
[ Feedback bar     ]  ← Fixed bottom, always visible when LIVE
```

No sidebars on mobile. No split panes. The preview is full-bleed.

On desktop (>768px), the preview can optionally split with a narrow context panel on the right, but only in LIVE state.

## 4. Personalization and Discovery Flow (Propose-and-Go)

### How P0-1 through P0-4 are solved

| P0 | Problem | Solution |
|----|---------|----------|
| P0-1 | No personalization captured | Onboarding Step 2 collects services, hours, business name with vertical-specific defaults |
| P0-2 | "Ready!" → blank canvas | Auto-build starts during onboarding redirect. User arrives to BUILDING state. |
| P0-3 | Prompt-first interaction | No prompts. Structured fields with smart defaults. User confirms/overrides. |
| P0-4 | System never proposes | Vertical selection generates defaults that the system proposes. User edits, not describes. |

### Vertical-to-defaults mapping

Each vertical provides a complete set of default services, hours, and style. The user sees these pre-filled and can edit inline. This is the "propose-and-go" pattern applied to structured data instead of free text.

```
hair-salon → { services: [Haircut/45min/EUR45, Color/90min/EUR85, Blowout/35min/EUR35],
               hours: Tue-Sat 10-18, style: "clean and warm" }
pt-wellness → { services: [Personal Training/60min/EUR60, Assessment/30min/EUR0, Group/45min/EUR25],
                hours: Mon-Sat 7-20, style: "bold and energetic" }
tattoo → { services: [Consultation/30min/EUR0, Small piece/120min/EUR150, Large piece/240min/EUR300],
           hours: Tue-Sat 11-19, style: "dark and editorial" }
consulting → { services: [Discovery call/30min/EUR0, Strategy session/90min/EUR200, Retainer/monthly/EUR1500],
               hours: Mon-Fri 9-17, style: "professional and minimal" }
other → { services: [Service 1/60min/EUR50], hours: Mon-Fri 9-17, style: "clean" }
```

These defaults already partially exist in `BOOKING_VERTICALS` (`src/entities/booking-verticals`). They need to be extended with full service/hours/style data.

### Template chips and OnboardingChat are gone

No more `TEMPLATE_CHIPS` array in `OnboardingChat.tsx`. No more "Tell me what you want to build." No more `WorkspaceEmptyState`. The entire OnboardingChat component is deleted. Template discovery is replaced by vertical-driven personalization during onboarding.

### Free-text as escape hatch only

If the user has no vertical (edge case: direct URL access to workspace with no onboarding data), show a minimal fallback: "What does your business do?" with a single input. The response is used to infer a vertical and generate defaults. This is the exception, not the primary flow.

## 5. Build-to-Preview Transition

### Current problem

The build flow is: select task in sidebar → read prompt in artifact pane → click "Make this now" → wait → see files being written → eventually preview loads. This is a multi-step ceremony.

### New flow: auto-build pipeline with live progress

```
State: BUILDING
┌─────────────────────────────────────────────┐
│  meldar / Studio Mia                   ...  │
├─────────────────────────────────────────────┤
│                                             │
│         Setting up your booking page        │
│                                             │
│         ████████░░░░░░░░  3 of 5            │
│                                             │
│         ✓ Your page layout                  │
│         ✓ Your 3 services                   │
│         ● The booking calendar  ← now       │
│         ○ About your salon                  │
│         ○ Contact and location              │
│                                             │
│         Adding the booking calendar...      │
│                                             │
└─────────────────────────────────────────────┘
```

**Language rules for BUILDING state (solves P9):**
- Never show file names. "Writing BookingForm.tsx..." becomes "Adding the booking calendar..."
- Never say "code", "writing", "file". Say "setting up", "adding", "preparing".
- Step labels use business language: "Your 3 services" not "Services section". "The booking calendar" not "Booking form".
- The card `title` from the kanban data needs a display-name mapping. Each card stores a `title` (technical) and should have a `userFacingLabel` (human). If the label is missing, derive it from the title by removing technical suffixes.

**Technical implementation:**
- The `auto-build` pipeline already exists in the API (`/api/workspace/[projectId]/auto-build`). It processes cards sequentially via SSE events (`card_started`, `file_written`, `committed`, `pipeline_complete`).
- The reducer already handles `card_started` with `cardIndex` and `totalCards`.
- The UI just needs to render this as a clear vertical progress list instead of requiring manual task selection.
- The `card_started` event should include a `userFacingLabel` field (or the card's `explainerText` can serve this purpose).

### Transition to LIVE

When the pipeline completes and the sandbox URL resolves:

```
State: LIVE
┌─────────────────────────────────────────────┐
│  meldar / Studio Mia                   ...  │
├─────────────────────────────────────────────┤
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │                                       │  │
│  │          LIVE PREVIEW IFRAME          │  │
│  │          (full width, dominant)       │  │
│  │                                       │  │
│  │                                       │  │
│  │                                       │  │
│  └───────────────────────────────────────┘  │
│                                             │
├─────────────────────────────────────────────┤
│  Click any element above, or describe       │
│  [ what you want to change           ] [→]  │
└─────────────────────────────────────────────┘
```

- Preview iframe fills the entire main area.
- FeedbackBar is pinned to the bottom, always visible.
- No sidebar. No task list. No artifact pane.
- The user interacts with their live app and gives feedback.

### First-build celebration

The `FirstBuildCelebration` component already exists. It should fire when the pipeline completes (not when a single card builds). Brief moment of delight, then fade to the LIVE preview.

## 6. Progressive Disclosure Strategy

### What's visible at each state

Since PROPOSING and PLANNING are handled in onboarding, the workspace only has 3 states:

| UI Element | BUILDING | LIVE | MANAGING |
|---|---|---|---|
| Top bar | Yes | Yes | Yes |
| Build progress view | **Yes** | No | No |
| Preview iframe | No | **Yes** | **Yes** |
| Feedback bar | No | **Yes** | **Yes** |
| "My site" link in menu | No | **Yes** | **Yes** |
| Bookings panel | No | No | **Yes** |
| Settings access | No | Via menu | Via menu |
| "What was built" | No | Via menu | Via menu |

### Key principle: reduce to one action per state

- **BUILDING**: zero actions = watch progress, can't intervene
- **LIVE**: one primary action = type feedback in the bar (or click an element in the preview)
- **MANAGING**: one primary action = check bookings (secondary: settings, feedback)

### Teaching moments (inline, not tooltip)

- **First time in LIVE state**: "This is your live booking page. Click anything to change it, or type below."
- **First feedback submitted**: "Meldar is updating your page. You'll see the changes in a few seconds."
- **First booking received**: "You got your first booking! Here's what your customer sees."

These replace the generic `TeachingHint` component system with state-specific inline messages.

## 7. Iteration Flow (LIVE State)

### Primary: FeedbackBar (text)

The existing `FeedbackBar` component is close to correct. Changes needed:

- Remove the `Paperclip` attachment button (premature complexity)
- Remove the reference URL/image fields
- Remove the Stitch suggestion for design keywords (Research P2-4: sending users to an external design tool contradicts "we handle everything for you" positioning)
- Remove the 5-word minimum check before direct submit (Research P2-3: short commands like "add a gallery" are perfectly valid)
- Keep the suggestion chips, but make them contextual to the current page content instead of generic ("Bolder colors?" etc.)
- Change placeholder examples to match the user's page: "e.g. 'change the price to 50' or 'add a photo gallery'" instead of generic developer-adjacent examples

### Secondary: Visual feedback (click-to-comment)

The visual feedback tool (hover elements in iframe, click to select, give feedback on that specific element) is identified as a killer feature. Architecture for this:

```
PreviewPane (iframe)
  ↓ postMessage
FeedbackBar receives element metadata
  ↓ combines with user text
Build API receives targeted instruction
```

The `FeedbackBar` already accepts an `onSubmit` callback that produces a `FeedbackRequest` with `instruction` string. The element metadata from the iframe can be prepended to the instruction before submission. No new components needed — just an enhancement to the iframe injection script and the FeedbackBar's state.

### Tertiary: "What was built" (on-demand)

The file list, code viewer, and build receipt from `ArtifactPane` move to an on-demand panel accessible from the overflow menu: "See what Meldar wrote." This is for power users and the "teaching by doing" angle. Not shown by default.

## 8. ASCII Wireframes

### Onboarding Step 2: Personalization (mobile, 375px)

```
┌─────────────────────────────┐
│  meldar                     │
├─────────────────────────────┤
│                             │
│   Let's set up your         │
│   booking page              │
│                             │
│   We guessed these from     │
│   "Hair / Beauty" — change  │
│   anything that's wrong.    │
│                             │
│   Business name             │
│   [ Studio Mia           ]  │
│                             │
│   Your services             │
│   [ Haircut  ] [45m] [€45]  │
│   [ Color    ] [90m] [€85]  │
│   [ Blowout  ] [35m] [€35]  │
│   [ + Add another        ]  │
│                             │
│   Your hours                │
│   [ Tue - Sat ] [10 - 18 ]  │
│                             │
│   ┌───────────────────────┐ │
│   │  Build my page  →     │ │
│   └───────────────────────┘ │
│                             │
└─────────────────────────────┘
```

### State: BUILDING — first workspace view (mobile, 375px)

```
┌─────────────────────────────┐
│  meldar / Studio Mia        │
├─────────────────────────────┤
│                             │
│                             │
│   Setting up your           │
│   booking page              │
│                             │
│   ████████████░░░  4 of 5   │
│                             │
│   ✓ Your page layout        │
│   ✓ Your 3 services         │
│   ✓ The booking calendar    │
│   ● About your salon  ← now│
│   ○ Contact and location    │
│                             │
│   Adding salon details...   │
│                             │
│                             │
│                             │
│                             │
└─────────────────────────────┘
```

### State: LIVE (mobile, 375px)

```
┌─────────────────────────────┐
│  meldar / Studio Mia   ...  │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │                         │ │
│ │    LIVE PREVIEW         │ │
│ │    (full width)         │ │
│ │                         │ │
│ │    Studio Mia           │ │
│ │    Book your next       │ │
│ │    appointment          │ │
│ │                         │ │
│ │    [Haircut - 45min]    │ │
│ │    [Color - 90min ]     │ │
│ │    [Styling - 30min]    │ │
│ │                         │ │
│ │                         │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ Click anything above, or    │
│ [describe a change     ] [→]│
└─────────────────────────────┘
```

### State: LIVE (desktop, 1280px)

```
┌──────────────────────────────────────────────────────────────────┐
│  meldar / Studio Mia                                        ...  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                                                            │  │
│  │                    LIVE PREVIEW IFRAME                      │  │
│  │                    (full width, padded)                     │  │
│  │                                                            │  │
│  │    Studio Mia                                              │  │
│  │    Book your next appointment                              │  │
│  │                                                            │  │
│  │    [Haircut - 45min - EUR 35]                              │  │
│  │    [Color treatment - 90min - EUR 85]                      │  │
│  │    [Styling - 30min - EUR 25]                              │  │
│  │                                                            │  │
│  │    [Book now]                                              │  │
│  │                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  Click any element above to change it, or describe what you want │
│  [ e.g. "make the button pink" or "add a price list"      ] [→] │
└──────────────────────────────────────────────────────────────────┘
```

### Overflow menu (desktop)

```
                                    ┌─────────────────┐
                                    │ My site ↗        │
                                    │ Manage bookings  │
                                    │ Settings         │
                                    │ What was built   │
                                    │ ─────────────── │
                                    │ All projects     │
                                    └─────────────────┘
```

## 9. What to DELETE from Current UI

### Components to remove entirely

| Component | File | Why |
|---|---|---|
| `TaskListPane` | `src/widgets/workspace/TaskListPane.tsx` | Kanban sidebar. Users don't manually select build steps. Auto-build pipeline replaces this. |
| `ArtifactPane` | `src/widgets/workspace/ArtifactPane.tsx` | Three-column artifact viewer. Code files and byte sizes are not for Irka. Moves to on-demand "What was built" panel. |
| `WorkspaceNav` | `src/widgets/workspace/WorkspaceNav.tsx` | Build/Bookings/Settings tab bar. Replaced by overflow menu. |
| `WorkspaceBottomBar` | `src/widgets/workspace/WorkspaceBottomBar.tsx` | Footer with tier label and roadmap button. Tier info is not useful. Roadmap button has no clear purpose. |
| `OnboardingChat` | `src/widgets/workspace/OnboardingChat.tsx` | "Tell me what you want to build" with template chips. Replaced by auto-proposal from vertical. |
| `WorkspaceEmptyState` | `src/widgets/workspace/WorkspaceEmptyState.tsx` | Wrapper for OnboardingChat. Deleted with it. |
| `ContinueBanner` | `src/widgets/workspace/ContinueBanner.tsx` | Dashboard banner. Single-project users don't need this. Multi-project users see the project grid. |
| `StepIndicator` | `src/widgets/workspace/StepIndicator.tsx` | Step progress dots. Replaced by inline build progress list. |
| `StreakBadge` | `src/features/token-economy/` | Visit streak gamification. Premature — no real users to retain. |
| `NewProjectButton` | `src/widgets/workspace/NewProjectButton.tsx` | Multi-project support. Premature for MVP. One project per user initially. |

### Components to simplify

| Component | Change |
|---|---|
| `WorkspaceShell` | Remove TaskListPane and ArtifactPane rendering. Becomes: TopBar + state-driven main area + FeedbackBar. |
| `WorkspaceTopBar` | Remove `WorkspaceNav` render. Add overflow menu. Simplify to logo + project name + menu. |
| `PreviewPane` | Remove the empty-state placeholder text that says "Describe what you want to build." The empty state is now the PROPOSING state which is a separate component. |
| `FeedbackBar` | Remove attachment button, reference URL/image fields. Keep text input + suggestion chips. |
| `BuildStatusOverlay` | Keep as-is. The building/done/failed pills are good UX. |
| `ProposalCard` | No longer used in workspace. Its role (proposing defaults for confirmation) moves to onboarding Step 2 as structured form fields. The glass-plan ProposalCard can be deleted or repurposed for the onboarding preview. |

### Routes to remove

| Route | Replacement |
|---|---|
| `/workspace/[projectId]/admin` | Moves to overflow menu → inline panel or modal |
| `/workspace/[projectId]/admin/settings` | Moves to overflow menu → inline panel or modal |

### API routes to keep

All API routes stay. The architecture change is UI-only. The `auto-build`, `generate-proposal`, `wishes`, `cards`, `build`, `files`, `settings`, `bookings` endpoints all serve the new flow.

## 10. Component Architecture (New)

### New component tree

```
WorkspaceShell (client boundary)
  ├── WorkspaceTopBar
  │     ├── Logo + project name
  │     └── OverflowMenu (new)
  │           ├── MySiteLink (conditional: only when deployed)
  │           ├── ManageBookingsLink (conditional: only in MANAGING)
  │           ├── SettingsLink
  │           ├── WhatWasBuiltLink
  │           └── AllProjectsLink
  │
  ├── WorkspaceMain (state-driven, 3 states)
  │     ├── [BUILDING] BuildProgressView (new)
  │     │     ├── ProgressHeader ("Setting up your booking page")
  │     │     ├── ProgressBar (fraction + visual)
  │     │     └── StepList (human-readable labels, checkmarks, current indicator)
  │     │
  │     ├── [LIVE] PreviewPane (simplified, existing)
  │     │     ├── iframe (full bleed)
  │     │     └── BuildStatusOverlay (existing, for iteration builds)
  │     │
  │     └── [MANAGING] PreviewPane + ManagePanel (slide-over from menu)
  │
  ├── FeedbackBar (existing, simplified)
  │     └── Only visible in LIVE and MANAGING states
  │
  └── FirstBuildCelebration (existing, triggers at BUILDING → LIVE transition)
```

### State machine (workspace only — onboarding is upstream)

```
                ┌──────────── /onboarding ────────────┐
                │  Step 1: Pick vertical               │
                │  Step 2: Confirm personalization     │
                │  Step 2 triggers: plan + auto-build  │
                │  Redirects to workspace              │
                └──────────────┬───────────────────────┘
                               │
                               v
    BUILDING ──[pipeline complete + sandbox ready]──→ LIVE
                               ^                        │
                               │                        │
                               └──[user gives feedback]─┘
                                   (single card build)

    LIVE ──[first booking received OR user opens manage]──→ MANAGING
                                                             │
    MANAGING ──[user gives feedback]──→ BUILDING ──→ LIVE ──→ MANAGING
```

**Edge case: failed first build.** If the user arrives and the pipeline has failed (or never started), show a recovery state: "Something went wrong setting up your page. [Try again]". This re-triggers the auto-build pipeline. Never fall back to a prompt.

### Context changes

The existing `WorkspaceBuildProvider` and `useWorkspaceBuild` hook stay as the state backbone. Simplify the derived phase:

```typescript
type WorkspacePhase = 'building' | 'live' | 'managing'
```

This is derived from:
- `building`: `pipelineActive === true` OR `activeBuildCardId !== null`
- `live`: preview URL exists, no active build
- `managing`: preview URL exists, bookings feature active (future)

The `WorkspaceMode` type in `context.tsx` (currently `plan | taskFocus | building | review`) simplifies. The `plan` and `taskFocus` modes are deleted — there is no plan view and no task selection in the new workspace. The `review` mode collapses into `live`. The mode type becomes:

```typescript
type WorkspaceMode =
  | { readonly type: 'building' }
  | { readonly type: 'live' }
  | { readonly type: 'managing' }
```

The `selectedTaskId`, `chatOpen` actions in the reducer are deleted. No manual task selection, no chat toggle.

## 11. Implementation Priority

### Phase 1: Zero-to-live flow (highest impact, do first)

These changes eliminate the trust-killing blank-canvas moment and deliver the core propose-and-go experience.

1. **Add onboarding Step 2** — personalization form with vertical-specific defaults (services, hours, business name). Modify `/onboarding` route and `OnboardingFlow.tsx`.
2. **Wire onboarding completion to auto-build pipeline** — when user taps "Build my page," save wishes, generate plan, trigger `/api/workspace/[projectId]/auto-build`, redirect to workspace. No intermediate "ready!" screen.
3. **Create `BuildProgressView` component** — renders the auto-build pipeline progress with human-readable step labels. Replaces the blank workspace empty state.
4. **Simplify `WorkspaceShell` to 3-state model** — `building | live | managing`. No task selection, no artifact pane, no tab nav.
5. **Delete dead components** — `TaskListPane`, `ArtifactPane`, `WorkspaceNav`, `WorkspaceBottomBar`, `OnboardingChat`, `WorkspaceEmptyState`, `StepIndicator`, `NewProjectButton`, `ContinueBanner`, `StreakBadge`.

### Phase 2: Iteration experience

These changes make the LIVE state great — the user can see their page and improve it.

6. **Simplify `FeedbackBar`** — remove attachment UI, Stitch suggestion, 5-word minimum. Add contextual suggestion chips.
7. **Add overflow menu to `WorkspaceTopBar`** — replace tab nav with minimal menu.
8. **Add human-readable labels to build events** — `card_started` SSE events include `userFacingLabel`. "Adding the booking calendar..." not "Writing BookingForm.tsx..."
9. **Enhance `PreviewPane` with visual feedback** — click-to-comment iframe injection (the killer differentiator).

### Phase 3: Management and polish

10. Move admin/settings into on-demand slide-over panel accessed from overflow menu. Delete `/admin` routes.
11. "What was built" on-demand panel (teaching-by-doing, code viewer).
12. Bookings management integration into workspace (MANAGING state).
13. Multi-project support (only when needed).

### What ships in the "if we can only do 3 things" scenario

1. Onboarding Step 2 (personalization)
2. Auto-build triggered from onboarding (no blank canvas)
3. BuildProgressView (user sees progress, not a prompt)

These three changes transform the experience from "Lovable clone" to "Meldar proposes, you confirm." Everything else is refinement.
