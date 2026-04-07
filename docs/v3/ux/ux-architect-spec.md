# Meldar v3 — Workspace UX Architecture Spec

**Author:** UX Architect
**Last updated:** 2026-04-06
**Status:** Draft for founder review (paired with `ux-researcher-findings.md`)
**Scope:** Technical UX architecture for the v3 split-screen workspace, kanban-driven build loop, live preview, and supporting features. Implementation-ready specification — no source code.
**Companion doc:** `ux-researcher-findings.md` (parallel deliverable owned by ux-researcher; cross-referenced where relevant).

---

## How to read this document

This spec is the technical foundation half of the v3 workspace design. It locks layout, component hierarchy, interaction patterns, design tokens, accessibility, and performance budgets so a developer can begin implementation without re-deciding architecture. The companion `ux-researcher-findings.md` answers *what* to build and *why*; this doc answers *how* to build it.

Conventions used throughout:

- **FSD layer** in parentheses after a component name: `(app)`, `(widgets)`, `(features)`, `(entities)`, `(shared)`.
- **(S)** = React Server Component, **(C)** = `"use client"` Client Component. When a component is split, the parent is named with the child suffix `*Shell` (server) and `*Surface` (client).
- ASCII wireframes are dimensioned by ratio, not pixels. Pixel values are given separately as breakpoint specs.
- "Token" without qualification refers to the **economy token** (the user-facing credit), never to a Claude API token. The latter is called "model token" or "API token" for disambiguation.

Open questions are flagged inline as `[Q-#]` and aggregated in §11.

---

## Section 1 — Information architecture

### 1.1 Sitemap

```
/                                    Landing (existing, v3 copy update is task #1)
/start                               Discovery flow entry (existing) — see ADR #42
/quiz                                Pain quiz (existing)
/discover                            Recommendation surface (existing, gets v3 roadmap preview)
/xray                                Free-tier Time X-Ray result (existing)
/coming-soon                         Existing
/thank-you                           Existing
/privacy-policy                      Existing
/terms                               Existing

/onboarding                          NEW — post-payment, post-account creation
  /onboarding/use-case               Step 1: pick first build (MVP: pre-filled with Landing Page;
                                       becomes a real picker once use case #2 ships).
                                       Skip path from /start lands here directly.
  /onboarding/intro                  Step 2: 30-second roadmap walkthrough → enter workspace
  (Style picker removed for MVP per ADR #27 — Recipe-only.)

/workspace                           NEW — workspace home (lists user's projects)
  /workspace/[projectId]             NEW — primary workspace surface (split screen)
  /workspace/[projectId]/roadmap     NEW — full-screen roadmap view (escape from split)
  /workspace/[projectId]/history     NEW — build history + rollback surface
  /workspace/[projectId]/settings    NEW — project-level settings (rename, delete, export)

/account                             NEW — user-level (not project-level)
  /account/billing                   NEW — Stripe portal embed
  /account/referrals                 NEW — referral dashboard + share links
  /account/tokens                    NEW — token transaction history
  /account/settings                  NEW — email, password reset, danger zone

/api/                                Existing API routes + new ones:
  /api/workspace/projects            CRUD: list/create/delete projects
  /api/workspace/projects/[id]       Project state (cards, history, sandbox handle)
  /api/workspace/cards               CRUD: kanban cards
  /api/workspace/cards/[id]          Single card update / state transition
  /api/workspace/build               POST: trigger orchestrator with full kanban
  /api/workspace/build/[runId]       SSE stream of build progress
  /api/workspace/sandbox/[projectId] Provider-shaped facade over Cloudflare Sandbox SDK
  /api/workspace/tokens              GET balance / debit history
  /api/workspace/explainers          GET explainer copy by key (data-driven, A/B-able)
  /api/workspace/orchestrator/chat   POST chat message → SSE stream of model output
```

### 1.2 Modal / dialog inventory (no route, rendered above workspace)

- `BuildConfirmModal` — pre-flight summary before clicking Build (token cost, card list, "what will happen" explainer).
- `CardEditorModal` — full editor for a kanban card (focus-trapped, keyboard-first).
- `ApprovalCheckpointModal` — generic gate for any action ≥10 economy tokens.
- `DoneForMeModal` — escape hatch → "Need help? Founder takes over for EUR 79."
- `RollbackConfirmModal` — confirm reverting a build.
- `TokenPaywallModal` — soft wall when EUR 2/day cap is hit.
- `LearningExplainerSheet` — slide-up sheet for "tell me more" deep-dives (lazy-loaded, opt-in). Shared surface for static explainers (§3.6.1) and dynamic build receipts (§3.6.2).
- `ShareCelebrationOverlay` — milestone unlocked → shareable card. **Not a modal.** Non-blocking overlay surface: no focus trap, no scrim, no Esc dismiss. Fires at ≤300ms on build_complete with a milestone flag. See §4.1 step 6.

All **modals** follow one shared `ModalShell` primitive (see §6.5) for accessibility consistency. The `ShareCelebrationOverlay` is intentionally NOT a modal; it follows the same non-blocking overlay pattern as `ReturnStateOverlay` (§4.10).

### 1.3 Content hierarchy inside `/workspace/[projectId]`

Primary (always visible, never collapsible):
1. **Live preview** (right pane) — the user's running app
2. **Kanban board** (left pane, top) — the structured build plan
3. **Build button** (left pane, bottom or top bar — see §2.4)
4. **Top bar** — project name, current step, token balance

Secondary (toggle-visible, default collapsed or in subtle position):
5. **Orchestrator chat** (left pane, bottom slot) — for free-form questions and prompt iteration
6. **Roadmap progress strip** (top bar) — shows step N of 8 with milestone marker
7. **"What just happened?" toast stack** — anchored bottom-left, auto-dismiss

Tertiary (revealed on demand):
8. **Prompt anatomy side panel** — slides in from the left edge over the kanban
9. **Build history drawer** — slides up from the bottom
10. **Learning explainer sheet** — slides up from the bottom-right
11. **Settings dropdown** — top-right of top bar

This hierarchy is enforced by stacking context, not z-index hacks. See §6.7.

### 1.4 Relationship to existing flows

```
                  ┌──────────────────────┐
                  │   Landing (/)        │
                  └──────────┬───────────┘
                             ▼
                  ┌──────────────────────┐
                  │  Discovery (/start)  │ ◀── single entry, with
                  │  (pain quiz default) │     "I know what I want
                  └─────┬────────┬───────┘     to build →" skip link
                        │        │             (see ADR #42)
              full path │        │ skip path
                        ▼        │
                  ┌─────────────┐│
                  │ Time X-Ray  ││
                  │ + Roadmap   ││ ◀── upgrade trigger
                  │ Preview     ││      (Daria's full-discovery path)
                  └──────┬──────┘│
                         │       │
                         ▼       ▼
                  ┌──────────────────────┐
                  │  /onboarding/        │  ◀── PRE-PAYWALL
                  │   use-case           │     (per researcher
                  │  (pre-filled MVP)    │      §4G, §5 #8)
                  └──────────┬───────────┘
                             ▼
                  ┌──────────────────────┐
                  │  Personalized preview│  ◀── the conversion lever
                  │  card (recommendation│
                  │  with her inputs)    │
                  └──────────┬───────────┘
                             ▼
                  ┌──────────────────────┐
                  │  Stripe Checkout     │
                  │  (Builder EUR 19/mo) │
                  └──────────┬───────────┘
                             ▼
                  ┌──────────────────────┐
                  │ Starter app deployed │  ◀── BACKGROUND JOB
                  │ to CF sandbox BEFORE │      (researcher §5 #1:
                  │ user lands           │       no empty states)
                  └──────────┬───────────┘
                             ▼
                ┌────────────────────────────┐
                │  /workspace/[projectId]    │ ◀── DAILY RETURN POINT
                │  (split-screen workspace)  │      populated kanban
                │                            │      preview already live
                └─────┬──────────────────┬───┘
                      │                  │
            ┌─────────▼──────┐    ┌──────▼──────────┐
            │  /roadmap      │    │  /history       │
            │  (full screen) │    │  (timeline)     │
            └────────────────┘    └─────────────────┘
                      │
                      ▼
            ┌────────────────┐
            │  /account/*    │
            │  (billing,     │
            │   referrals)   │
            └────────────────┘
```

The workspace is the **gravity well**. Every other v3 surface is either funneling into it (landing → discovery → onboarding) or supporting it (roadmap, history, account). Free-tier users hit a paywall at `/workspace`; paid users land in a workspace that is **already populated** — starter app deployed, kanban pre-filled, preview live — because the researcher's #1 friction hotspot is "post-paywall first-screen intimidation." The onboarding flow runs **before** the paywall, not after: it doubles as soft commitment and gives us the data we need to personalize the pre-paywall preview card.

**Skip-the-discovery affordance (ADR #42, per researcher confirmation):** `/start` carries a prominent "I know what I want to build →" affordance on the first screen — a skip link near the top, plain copy, no "skip" framing (skip implies missing something). Clicking it fast-forwards Katya past the pain quiz + Time X-Ray and lands her directly on the `/onboarding/use-case` step she'd otherwise reach after completing discovery. **Single entry `/start`, not a separate `/start-fast` route** — keeps the funnel unified for analytics and AB testing, and lets the subset of Katyas who *aren't* sure what they want stay in the default discovery path. For MVP (one use case), the skip path lands directly on the personalized preview card pre-filled with the Landing Page use case; once use case #2 ships, this becomes a real picker.

**Delta vs. original draft (2026-04-06 revision):** Onboarding was originally placed after Stripe checkout. Research finding `ux-researcher-findings.md` §4G + §5 hotspot #8 moved it before the paywall. The style picker step was removed (Recipe-only MVP per ADR #27); `use-case` is now MVP-step-1, `intro` is MVP-step-2. A new background job (`starter-deploy`) must provision the user's Cloudflare sandbox with the starter repo during the Stripe webhook callback, so the iframe is live by the time the user lands in `/workspace/[projectId]`. This is tracked as a handoff dependency in §10.5.

### 1.5 State transitions inside the workspace

A user's workspace session is one of these macro-states. The UI surfaces them visibly so the user always knows what mode they're in.

| Macro-state | What's happening | Visible signals |
|---|---|---|
| **Idle** | User reading, planning, no compute running | Default split screen, no progress bars |
| **Editing card** | Card editor modal open OR inline edit active | Modal scrim OR inline highlight |
| **Building** | Orchestrator is generating code; sandbox is rebuilding | Top bar shows progress bar + token meter ticking; preview pane shows build overlay |
| **Preview-stale** | Build complete but preview iframe hasn't reloaded yet | Pulsing indicator on preview frame; "Refresh preview" CTA |
| **Approval-required** | Modal blocking until user confirms or cancels | Approval modal with token cost breakdown |
| **Failed** | Build/preview/sandbox errored | Error banner in top bar; failed cards highlighted; rollback CTA |
| **Locked** | Daily EUR 2 cost ceiling hit | Soft paywall modal; preview frozen; can still read |

State transitions are unidirectional from a user's perspective: they always go forward via Build, or back via Rollback. Approval and Failed states can occur from any other state.

---

## Section 2 — Layout specification (split-screen workspace)

### 2.1 Wireframe (desktop ≥1024px, default)

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│  TOP BAR (56px tall, frosted-glass, sticky)                                       │
│  ┌──────────────┬─────────────────────────────────┬─────────────────────────────┐ │
│  │ ◀ /workspace │ Reddit Scanner · Step 4 of 8    │ 👛 487 tokens · ⚙ · 👤    │ │
│  │ Logo         │ ▓▓▓▓▓▓▓░░░░░░░░░░░░             │                           │ │
│  └──────────────┴─────────────────────────────────┴─────────────────────────────┘ │
├──────────────────────────────────────────┬────────────────────────────────────────┤
│ LEFT PANE (~42% wide, scrollable)        │ RIGHT PANE (~58% wide, fixed)         │
│                                          │                                        │
│ ┌──────────────────────────────────────┐ │ ┌────────────────────────────────────┐ │
│ │ KANBAN HEADER                        │ │ │ PREVIEW URL BAR                    │ │
│ │ "Your Build Plan"     [+ Add card]   │ │ │ 🔒 reddit-scanner.meldar.dev    🔄 │ │
│ │ Drop 1 · 6 cards · ~120 tokens       │ │ └────────────────────────────────────┘ │
│ └──────────────────────────────────────┘ │ ┌────────────────────────────────────┐ │
│                                          │ │                                    │ │
│ ┌─ Drop 1 ─────────────────────────┐    │ │       LIVE PREVIEW IFRAME          │ │
│ │ ☐ Pull trending posts            │    │ │       (Cloudflare Sandbox URL)     │ │
│ │ ☐ Filter by keyword              │    │ │                                    │ │
│ │ ☑ Generate post in my voice      │    │ │       (renders the user's          │ │
│ │ ☐ Add deploy button              │    │ │        in-progress app)            │ │
│ └──────────────────────────────────┘    │ │                                    │ │
│                                          │ │                                    │ │
│ ┌─ Drop 2 (locked until ship #1) ──┐    │ │                                    │ │
│ │ ☐ Save scraped posts to library  │    │ │                                    │ │
│ │ ☐ Schedule daily run             │    │ │                                    │ │
│ └──────────────────────────────────┘    │ └────────────────────────────────────┘ │
│                                          │ ┌────────────────────────────────────┐ │
│ ┌──────────────────────────────────┐    │ │ PREVIEW STATUS STRIP               │ │
│ │ 💬 ORCHESTRATOR CHAT (collapsed) │    │ │ ● Live · last build 12s ago · logs │ │
│ │ Expand ▼                         │    │ └────────────────────────────────────┘ │
│ └──────────────────────────────────┘    │                                        │
│                                          │                                        │
├──────────────────────────────────────────┴────────────────────────────────────────┤
│ BOTTOM BAR (64px tall, sticky, primary action zone)                               │
│  [What just happened? "We added a new route at /scrape"]    [▶ BUILD (12 tokens)]│
└───────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Responsive behavior

**Critical floor: 1280px wide (13" MacBook).** Per researcher §4A + §8 #1, the primary persona is laptop-only on a 13" MacBook. Split-screen MUST work at 1280px without feeling cramped. The `lg` tier (1024–1279) is a bonus, not the target — if you have to choose between making `xl` great and making `lg` passable, make `xl` great.

| Breakpoint | Width | Behavior |
|---|---|---|
| `xl` desktop | ≥1280px | **Primary target.** Default split: left 42% / right 58%. Draggable divider snaps to 30/40/50/60/70. Min left 360px, min right 480px. Must feel spacious at 1280×800. |
| `lg` desktop | 1024–1279px | Same split logic but minimums tighten (left 320px, right 420px). No feature loss — kanban still supports drag, chat still expands — but density increases. |
| `md` tablet landscape | 768–1023px | Split forced to 50/50 with non-draggable divider. Kanban becomes vertical-only (no horizontal scroll). |
| `sm` tablet portrait | 600–767px | **Stacked layout**: preview pinned to top (40vh), kanban scrolls below. Build button stays sticky-bottom. Top bar collapses (project name truncates, token balance becomes icon-only). |
| `xs` mobile | <600px | **Guided mode** — see §2.3. The full split-screen is hidden. |

The draggable divider stores its ratio in localStorage per projectId, defaults to 0.42 left.

**1280px sanity check (test during implementation):** at 1280×800 with browser chrome, usable workspace is ~1280×650. Split 42/58 gives ~538px left pane, ~742px right pane. Kanban card content must read comfortably at 490px effective width (accounting for padding). Preview iframe must render a typical landing page layout without horizontal scroll at 700px effective width. If either fails, adjust minimums or default ratio before shipping.

### 2.3 Mobile guided mode (`xs`, <600px)

The MVP does **not** ship a mobile workspace. Per researcher §8 directive #5, users DO return on mobile — but only for two purposes: **Katya shows her live preview URL to a friend or prospect within the first 24 hours**, and **Daria checks referral link clicks**. Neither tries to edit cards on mobile. This makes the mobile surface a **show-off + referral surface, not an editor**.

**Layout (preview-first, kanban-collapsed):**

```
┌─────────────────────────────────────┐
│ [Meldar wordmark]   Token: 487      │  ← Thin top bar, 48px
├─────────────────────────────────────┤
│                                     │
│                                     │
│         [ LIVE PREVIEW ]            │  ← Full-width iframe, 60vh
│         (their actual app,          │     tap-through enabled
│          no scrim, no lock)         │
│                                     │
│                                     │
├─────────────────────────────────────┤
│ ↗ Open full screen   ↗ Share link   │  ← Preview action strip
├─────────────────────────────────────┤
│ ▾ Your plan (8 cards, 3 shipped)    │  ← Accordion, collapsed
│                                     │     default
│ ▾ Referral clicks (2 today)         │  ← Accordion, collapsed
│                                     │
│ ▾ Continue on desktop →             │  ← Accordion, email-link CTA
└─────────────────────────────────────┘
```

Behavior:
- **Preview iframe is tap-through** (not read-only in the sense of being disabled — the user's actual app is fully interactive on mobile, because that's the point of "show it to a friend").
- **"Share link" button** → native share sheet with the preview URL. Highest priority mobile affordance.
- **"Open full screen"** → navigates to the preview URL directly (leaving the Meldar shell) so the user can demo without the top bar in the way.
- **"Your plan" accordion** → read-only kanban cards. No edit, no Build, no drag. Tap a card → expands inline to show description only. No modal.
- **"Referral clicks" accordion** → same surface as the desktop referral widget but read-only.
- **"Continue on desktop" accordion** → single CTA: "Email myself a desktop link" — same pattern as the prior flow, but demoted to the bottom because it's the least-common mobile goal.

No Build, no card edits, no chat, no approval checkpoints. The mobile surface is a show-and-tell + passive retention surface, not a workspace.

[Q-1] **Resolved per researcher §8 directive #5:** users return on mobile for show-off + referral-check. Layout flipped accordingly.

### 2.4 Top bar contents (left → right)

| Slot | Content | Behavior |
|---|---|---|
| 1 (left edge) | `← Workspace` link + Meldar wordmark | Returns to `/workspace` project list |
| 2 (left center) | Project name (editable on click) | Inline-edit pattern, save on blur |
| 3 (center) | Step indicator: "Step 4 of 8 · Reddit Scanner" + 8-segment progress bar | Click → opens roadmap drawer |
| 4 (right center) | Token balance pill: "👛 487" with daily-earn-cap tooltip | Click → opens TokenBudget popover |
| 5 (right edge) | Settings cog → dropdown (Project settings, Account, Sign out) + Avatar | Standard menu pattern |

### 2.5 Bottom bar contents

| Slot | Content | Behavior |
|---|---|---|
| Left | Latest "What just happened?" line — single sentence, fade-in/out queue | Click → opens full explainer sheet |
| Center | Empty by default; reserved for build progress text during Building macro-state | Live region (`role="status"` `aria-live="polite"`) |
| Right | **Primary action button** — `▶ Build (N tokens)` | Always visible, disabled when no build-able cards exist |

Why bottom-bar Build instead of top-bar: the user's eye lives in the kanban + preview region. The action they take most often must be in the closest peripheral position. Top bar is for orientation, bottom bar is for commitment.

### 2.6 Loading states

**Critical rule: no empty states on first workspace entry.** Per researcher §5 hotspot #1, the post-paywall first-screen intimidation is the highest-severity drop-off in the entire funnel. When the user arrives at `/workspace/[projectId]` for the first time, all of the following must already be true:

- The starter app is deployed to their Cloudflare sandbox (provisioned during Stripe webhook callback — see §10.5)
- The preview iframe already points to the live URL and is rendered within 2 seconds of page load (not the 3s general budget — this specific moment has a tighter target)
- The kanban is pre-filled with 8–12 well-written cards from the use-case template (researcher §4B MH)
- A 3-sentence micro-tour overlay points at: (1) "This is your app, live", (2) "These are the next things to build", (3) "Click Build when you're ready"
- At least one card in the kanban is visibly personalized with input from the pre-paywall style picker (her name, her color, her service type)

If any of these aren't ready at page load, the workspace shell renders a **progress narrative** — not a spinner — showing: "Deploying your app…" → "Filling in your plan…" → "Almost there…", each with a checkmark as it completes. **Timing budget:** per task #3 spike, cold start is 1–2s on production amd64 plus ~1–2s HMR pickup. The narrative should span ~3–5 seconds total under normal conditions. If the sandbox isn't ready in 8s, hold the narrative on the last checkmark step rather than reaching a blank state — never let the UI progress past the infra's readiness.

| Surface | Skeleton / loading pattern |
|---|---|
| **Workspace shell first paint (first ever entry)** | Server-rendered shell. If sandbox is still provisioning, render the progress narrative above (not shimmer). Top bar renders immediately with project name from server props. |
| **Workspace shell first paint (returning session)** | Server-rendered shell with kanban pre-hydrated from the database + preview frame skeleton (gradient shimmer in brand colors). Top bar renders immediately. Should NEVER show the progress narrative on Day 2+ — the sandbox should already be warm. |
| **Preview booting** (Cloudflare sandbox cold start on later visits) | Centered illustration: "Spinning up your app…" Subtle animated gradient using brand mauve. **Spike results (task #3) measured cold start at 1–2s on production amd64 / ~6.8s on dev Apple Silicon; warm reuse is 4–5ms**, so on any user's second+ session there is effectively no wait. Copy must not commit to a specific number, because a production amd64 cold start and a dev-emulated cold start differ by 3–4x. Rule: no visible timing promise; after 8s show "Still warming up…"; after 20s show "Something's slow. [View logs] / [Retry]". |
| **Preview rebuilding** (post-Build) | Iframe stays mounted; overlay with 60% opacity scrim + "Rebuilding (3s)" text + linear progress bar at top. Iframe re-fetches when overlay clears. **Do not unmount the iframe** — losing scroll/URL state is the #1 mobile/desktop frustration in similar tools. |
| **AI generating response** | Chat message shows shimmer line + animated brand-colored cursor. Build progress streams into a `role="log"` list under the kanban — translated phrases only, never raw phase names (see §4.1 streaming translation layer). |
| **Card transitions (state change)** | Subtle border-color animation on the card (300ms ease) + status pill morph. No layout shift. |

### 2.7 Error states

| Error | Where it shows | Recovery action |
|---|---|---|
| **Preview iframe failed** | Replaces preview content with full-pane error card: "Your app couldn't start. Let's try again." | `[Retry]` button → re-spin sandbox; `[View logs]` → opens log drawer |
| **Sandbox timed out** | Same surface as iframe failure but with text "Still warming up — usually takes a few seconds more." | Same retry; after 3 retries, escalate to "Contact us" link |
| **Orchestrator errored mid-build** | Top bar status changes to red; failed cards get red border + status pill "Failed"; toast at bottom-left "Build failed: [reason]" | `[Try again]` on each failed card; `[Rollback to last good]` in toast |
| **Token balance insufficient** | Build button disables + tooltip "Not enough tokens. Need N more." | `[Earn more]` link → opens TokenBudget popover with daily earn cap, referral, top-up |
| **Stripe webhook failed** | Account billing screen banner; workspace top bar shows "Subscription issue" pill | Banner CTA → Stripe portal |
| **Sandbox SDK provider down** | Workspace shell renders with full-pane warning + "We're unable to start sandboxes right now. Status page →" | Read-only mode; can still browse cards and history |
| **Validation error from AI output** (Zod fails) | Failed card shows pill "Bad output from AI"; explainer "We caught a malformed response and stopped before it broke anything" | Auto-retry once; if second fails, offer Done-for-me escape hatch |

All error states must be styled with the same `ErrorSurface` primitive (see §6.5). Never use raw browser alerts.

### 2.8 Empty states

| Surface | Empty state |
|---|---|
| **No projects yet** (`/workspace`) | Centered: illustration + "Your first build starts here" + one button "Start Reddit Scanner" (or whatever onboarding selected) |
| **No cards on board** | **This state should never happen.** The template always pre-fills on project creation. If the user deletes every card, render a single "Reset to template?" card (NOT a blank-board prompt) so the board is never a blank page. Per researcher §8 minor tweak. |
| **No build history** | History drawer shows "No builds yet. Click ▶ Build to see your first one." |
| **No referrals** | Referral surface shows "Share this link to earn tokens" + copy link button |
| **No "what just happened" log** | Bottom bar left slot is empty (no placeholder text — silence is fine) |

---

## Section 3 — Kanban card schema and visual pattern

### 3.1 Card data schema (proposed, refinement of founder's draft)

```
KanbanCard {
  id:                  uuid
  projectId:           uuid
  position:            integer (sort key within group)
  group:               'drop-1' | 'drop-2' | 'backlog' | 'shipped'
  state:               'draft' | 'ready' | 'queued' | 'building' | 'built' | 'needs-rework' | 'failed'
  required:            boolean (mandatory for current step? affects visual hierarchy)

  title:               string (max 80 chars, single line)
  description:         string (max 500 chars, the user's intent in plain English)
  type:                'feature' | 'page' | 'integration' | 'data' | 'fix' | 'polish'

  acceptanceCriteria:  string[] (1–5 bullet points; what "done" looks like)
  explainerKey:        string | null (foreign key into explainers table — see §4.5)

  tokenCostEstimate:   { min: number, max: number, model: 'haiku' | 'sonnet' | 'opus' }
  tokenCostActual:     number | null (filled after build)

  dependsOn:           uuid[] (other card IDs that must be built first)
  blockedReason:       string | null (set when state='needs-rework'; explainer for user)

  createdAt:           timestamp
  updatedAt:           timestamp
  builtAt:             timestamp | null
  buildRunId:          uuid | null (link to build history record)
}
```

Why these fields:

- **`type`** lets the orchestrator pick a different prompt template per category — "page" cards generate routes, "integration" cards generate API clients. Keeps the moat (skills library) addressable.
- **`acceptanceCriteria`** is the structured handoff to the orchestrator. The user fills these in plain English; the orchestrator turns them into test cases. This is the secret weapon: it teaches users to think in deliverables without using the word "spec."
- **`tokenCostEstimate`** is computed by Haiku in the background when a card is created or edited. Stored on the card so the user can see costs without re-querying.
- **`explainerKey`** is a foreign key into a database table of inline explainer copy. Editing copy doesn't require a deploy. This satisfies backlog item #29.
- **`dependsOn`** enables the build order to be a topological sort, not a manual queue. The user reorders visually, but the orchestrator builds in dependency order.

### 3.2 Card states (state machine)

```
            ┌──────────┐
            │  draft   │  user is still editing
            └─────┬────┘
                  │ user marks "ready"
                  ▼
            ┌──────────┐
            │  ready   │  user has confirmed; eligible for next Build
            └─────┬────┘
                  │ user clicks Build
                  ▼
            ┌──────────┐
            │  queued  │  in build pipeline, not yet started
            └─────┬────┘
                  │ orchestrator picks it up
                  ▼
            ┌──────────┐
            │ building │  active model call, streaming progress
            └─────┬────┘
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
   ┌────────┐          ┌─────────┐
   │ built  │          │ failed  │
   └───┬────┘          └────┬────┘
       │                    │ user clicks "fix"
       │                    ▼
       │              ┌──────────────┐
       │              │ needs-rework │  user edits → back to ready
       │              └──────────────┘
       │
       │ user clicks "rollback"
       └──────► back to ready
```

### 3.3 Visual hierarchy at-a-glance vs expanded

**Collapsed card (default in kanban list):**

```
┌──────────────────────────────────────────────┐
│ [type icon] Title of the card                │  ← row 1: 16px Bricolage, 600 weight
│ ✦ ~12 tokens · build a section · ⊙ ready    │  ← row 2: 11px Inter, 400, dim
└──────────────────────────────────────────────┘
   ↑
   Left edge: 4px colored stripe = state color
```

**Expanded card (modal or accordion — see §4.2):**

```
┌──────────────────────────────────────────────┐
│ [type icon] Title of the card        [edit]  │
│                                               │
│ The user's plain-English description goes    │
│ here over multiple lines if needed.          │
│                                               │
│ ┌─ ACCEPTANCE ─────────────────────────────┐ │
│ │ ✓ Show top 10 trending posts             │ │
│ │ ✓ Filter by subreddit name               │ │
│ │ ✓ Update every 5 minutes                 │ │
│ └──────────────────────────────────────────┘ │
│                                               │
│ ┌─ DEPENDS ON ─────────────────────────────┐ │
│ │ → "Connect to Reddit"                    │ │
│ │ → "Set up data store"                    │ │
│ └──────────────────────────────────────────┘ │
│                                               │
│ ┌─ COST ESTIMATE ──────────────────────────┐ │
│ │ ~12 tokens · build a section · ~30 sec   │ │
│ └──────────────────────────────────────────┘ │
│                                               │
│ ┌─ WHAT YOU'LL LEARN ──────────────────────┐ │
│ │ "This is called pagination — APIs return │ │
│ │ data in chunks so we don't load it all." │ │
│ └──────────────────────────────────────────┘ │
│                                               │
│ [Mark ready] [Delete] [Build this only]      │
└──────────────────────────────────────────────┘
```

### 3.4 Mandatory vs optional cards (visual distinction)

- **Required cards** (`required: true`): solid left stripe in `primary` color, "Required" pill in top-right.
- **Optional cards**: outlined left stripe in `outlineVariant` color, no pill.

This is reinforced by sort order (required cards always pin to the top of their group) and by the Build button copy ("Build 4 required cards" vs "Build all 6 cards").

### 3.5 Card groupings

Group by **Drops** (founder's term for batches of work that ship together). **MVP ships Recipe-only labels per ADR #27** — the friendly label is "Drop" for the founder / backend, but the user-facing label uses plain English ("Ship #1", "Ship #2") and never exposes the word "Drop" to the user in Recipe mode.

**Drop header copy includes time, not just tokens** (researcher §8 minor tweak: "time is more legible to Katya than tokens"):

```
Ship #1 — Working Reddit Scanner  [6 cards · ~15 minutes · 4 required]
  └─ cards...
Ship #2 — Saved searches & schedule  [4 cards · ~10 minutes · LOCKED until Ship #1]
  └─ cards (grayed, click → "Unlock by completing Ship #1")
Saved for later — your ideas  [collapsed by default]
  └─ user-added cards not yet planned
Shipped — built and live  [collapsed by default, archive surface]
  └─ historical cards
```

- Time-to-ship is computed by the **token-to-action translator** (see §3.7), not by a separate system. A translator function `estimatedMinutes(totalTokens) → string` reads from the same explainer data map.
- Tokens are still shown, but demoted to the tooltip on the Drop header — the primary number is time. Exception: if the user has explicitly opted into "show tokens everywhere" in project settings, tokens return to primary.
- Drops are fixed by the use-case template at project creation. Users can add cards to them but cannot rename Ship #1, Ship #2, etc.

### 3.6 How explainers attach to cards

**Critical conceptual split (per researcher §8 directive #7):** there are **two independent surfaces** that previous drafts of this spec incorrectly conflated. They have different dismissal semantics, different data sources, and different lifecycle rules.

#### 3.6.1 Static card-level explainers (show-once-then-suppress)

Pre-authored copy attached to a card by key (e.g., `explainerKey: "what-is-a-scraper"`). Static, curated, non-personalized.

- **Surface:** inline footer on the expanded card + optional deep-dive sheet behind a "Tell me more" link.
- **Dismissal:** **dismiss-per-key-per-user.** Once the user dismisses an explainer with key `what-is-a-scraper`, it stays dismissed on every future card that carries the same key. Stored in user preferences (follows the user across devices), not localStorage.
- **Suppression rule:** if an explainer key is dismissed, the inline footer collapses to a single discoverable `?` icon that re-opens on click. Never auto-shown again.
- **Why:** researcher §8 directive #7 flags "repeated explainer shows read as clutter." Once Katya knows what a scraper is, every subsequent scraper card showing the same paragraph is noise.
- **Data model impact:** `Explainer` entity has `key: string` (primary), and dismissal is stored as `dismissedExplainerKeys: string[]` on the user profile.

#### 3.6.2 Dynamic build-completion receipts ("What just happened?", always fire)

Orchestrator-generated, 1–2 sentence summary written by Sonnet after each successful build. Personalized to what actually shipped in that specific build run.

- **Surface:** bottom-bar left slot (latest only, see §4.4) + toast stack (queued) + permanent entry in the history drawer.
- **Dismissal:** **fires every time a build completes.** There is no "don't show again" for build receipts. Each one is a new event, not a repeat.
- **Why:** this is a post-action receipt confirming that work happened — not an educational explainer. Suppressing it is how Lovable/Bolt feel like black boxes.
- **Interaction:** click the receipt → opens the deep-dive sheet with the detailed what-changed summary. Click X on a toast → dismisses just that toast (the history drawer entry stays forever).

#### 3.6.3 Deep-dive sheet (shared surface)

Both static explainers and dynamic receipts can open the same `ExplainerSheet` component — a slide-up sheet with 1–3 paragraph deeper content. Static explainers load pre-authored copy by key; dynamic receipts load the build-specific summary. The sheet itself is the same component; only its data source differs.

This honors the "1–2 sentences at a time" rule while leaving an off-ramp for curious users who want more, AND keeps the two dismissal models cleanly separated.

### 3.7 Communicating token cost before Build

**Token-to-action translator rule (non-negotiable, per researcher §4E MH + §5 hotspot #4 + §10 #2 + §8 directive #7):** anywhere a token cost appears in the UI, it must be accompanied by a plain-English, **outcome-framed** translation of what that cost buys. "3 tokens" alone is a slot machine. "3 tokens — design change" is a decision aid. **Raw model names (Sonnet / Opus / Haiku) never appear in user-visible cost surfaces** — they are backend routing details, not user vocabulary.

The translator is data-driven, stored as a map on the `Explainer` entity (see §5 FSD tree, `entities/explainer`). **Four tiers, not seven** (per researcher §pass-2 note #1: four is the magic number for ordinal lists humans can rank without effort; seven mixes near-synonyms like "full feature" vs "heavy feature" and reintroduces the cognitive load that killing model names was supposed to remove). Final copy needs a 30-min founder review against backlog #29:

| Token range | Outcome phrase | Backend routing (internal only) |
|---|---|---|
| 1–2 | quick tweak | Haiku |
| 3–5 | design change | Sonnet |
| 6–15 | build a section | Sonnet |
| 16+ | heavy feature (large ones get a double-confirm at ≥30 tokens) | Opus or routed Sonnet |

The "Backend routing" column is informational for the orchestrator team only — it never reaches the user. The token-band → outcome-phrase mapping is what the translator function exposes; model selection is decided independently by the routing layer.

The translator is applied consistently across all three cost surfaces:

1. **On the card** — `~12 tokens · build a section` next to status pill
2. **In the kanban header** — `Ship #1 · 6 cards · ~15 minutes · build a section`
3. **In the Build button** — `▶ Build · 12 tokens · build a section`

When the user hovers / focuses the Build button, a tooltip expands:

```
You're about to spend 12 tokens.
That's building a section — about 30 seconds of work.

- "Pull trending posts" — 4 tokens · design change
- "Filter by keyword" — 3 tokens · design change
- "Generate post in my voice" — 5 tokens · design change

After this build: 475 tokens remaining (of 500/mo).
That's still enough for ~10 more changes this month.

[Confirm] [Cancel]
```

Notice the closing line — the translator also operates on the *balance*, not just the debit. "475 tokens" means little; "still enough for ~10 more changes" means everything.

If the sum is ≥10 tokens, the click does NOT immediately fire — it opens the `BuildConfirmModal` (approval checkpoint, backlog item #11). If <10 tokens, the click fires after a 600ms grace period during which the user can press Esc to abort.

**Implementation note:** the translator function lives in `features/token-budget/lib/translator.ts` as a pure function `(tokens: number) => string`, reading from the translation map loaded from the explainer API. It is called from every surface that displays a token count. NEVER hardcode a translation — always go through the translator so copy changes ship without a deploy.

---

## Section 4 — Interaction patterns

### 4.1 The Build button: full interaction spec

**Trigger:** user clicks `▶ Build (N tokens)` in the bottom bar OR presses `Cmd+Enter` while focus is in the kanban or chat.

**Step-by-step:**

1. **Pre-flight check (synchronous, client-side):**
   - Are there any cards in `ready` state? If no, button is disabled with tooltip "Mark a card ready first."
   - Is token balance ≥ estimated cost? If no, button shows "Need N more tokens" + opens TokenBudget popover.
   - Is daily EUR 2 cap close? If yes, button shows warning pill but allows click.

2. **Confirmation modal** (`BuildConfirmModal`) — only if cost ≥10 tokens or build includes any "destructive" card (delete, replace, modify deployed feature).
   - Modal shows: card list with individual costs, total cost, current balance, post-build balance, "What will happen" 1-sentence summary, "Approve and build" / "Cancel".
   - Focus trapped, Esc cancels, Enter confirms.

3. **Click confirmed → optimistic UI:**
   - Bottom bar replaces Build button with build progress bar + "Building 6 cards…"
   - Top bar shows token meter ticking down (animated debit, not jump cuts)
   - Each `ready` card transitions: `ready → queued → building` with stripe color change
   - Preview pane shows overlay scrim (60% opacity over current iframe) + "Rebuilding…" text

4. **SSE stream from `/api/workspace/build/[runId]`:**
   - Each event updates one card's state, increments token meter, appends to chat log
   - Chat log uses `role="log"` `aria-live="polite"` for screen reader announcements
   - Raw stream events from the orchestrator: `card_started`, `card_token_emitted`, `card_completed`, `card_failed`, `build_complete`, `build_failed`, plus finer-grained phase events (`reading_context`, `drafting`, `generating_code`, `applying_changes`, `running_tests`, `hot_reloading`, etc.)
   - **Phase translation layer (MH, per researcher §8 #2):** raw phase names are NEVER shown to the user. Every phase event passes through a translation map stored in the `Explainer` entity (keyed by phase name, locale-aware). Examples:
     - `reading_context` → "Reading what you already built…"
     - `drafting` → "Sketching the plan…"
     - `generating_code` → "Writing the code…"
     - `applying_changes` → "Putting the pieces together…"
     - `running_tests` → "Making sure nothing broke…"
     - `hot_reloading` → "Refreshing your app…"
   - The translation map lives as data (`features/learning-explainer/lib/phase-translator.ts`), editable without a deploy, and MUST ship with a translation for every phase the orchestrator can emit. Unknown phases fall back to "Working on it…" and log a warning to Sentry for the founder to fix.
   - The chat log shows one translated phase line per 3–5 seconds minimum cadence so the user sees continuous activity even during long phases (if a phase takes 15 seconds, the translator layer emits heartbeat lines: "Still working on: Writing the code…"). This is critical per researcher §5 hotspot #2: "silent 60+ seconds" is the #2 drop-off risk.

5. **Cancel / pause during a Build (SH, per researcher §4A):**
   - While in the Building macro-state, the Build button in the bottom bar is replaced with a `✕ Cancel build` button
   - Click → confirmation toast (not modal, to avoid interrupting the stream): "Cancel this build? You'll keep any cards that already finished."
   - On confirm: client sends `DELETE /api/workspace/build/[runId]`, server aborts the orchestrator, any in-flight Anthropic API call is canceled via AbortController, already-completed cards stay `built`, in-flight card rolls back to `ready`, token debits for completed cards stay, tokens for canceled cards are refunded
   - UI state transitions back to Idle; a toast confirms "Build canceled. N cards kept, M refunded tokens."
   - Rationale: without cancel, an accidental Build click on a 50-token build is a disaster. Cancel is a trust primitive.

6. **On `build_complete`:**
   - Preview iframe re-fetches its source URL (sandbox already has new code)
   - Overlay scrim fades out (300ms)
   - Each built card transitions to `built` state (green stripe)
   - Bottom bar shows "What just happened?" with the 1-sentence summary. **This fires on every successful build** — it is a dynamic post-action receipt, not a static explainer, and therefore is NOT subject to dismiss-per-key suppression (see §3.6.2 for the conceptual split).
   - If a milestone unlocked, fire `ShareCelebrationOverlay` (renamed from `ShareCertificateModal`) at **≤300ms** (not 1.5s). Per researcher §8 minor tweak: the previous 1.5s felt like a dialog box, not a celebration. This surface is a **celebration overlay**, not a modal — no focus trap, no Esc-to-dismiss scrim, no "cancel" button. It has a single "Nice" acknowledgement button and a "Share this" affordance, and fades out on acknowledgement. The component name in the file tree is updated accordingly in §5.1.

7. **On `build_failed`:**
   - Failed cards transition to `failed` state (red stripe)
   - Top bar shows red "Build failed" pill
   - Bottom bar shows a **human-translated** error: never a stack trace, never an orchestrator phase name. The orchestrator's error code maps to user-facing copy via the same translator layer (e.g., `SANDBOX_OOM` → "Your app ran out of memory — probably too much data at once. Try removing a card and rebuilding.")
   - Error card shows `[Try again]` `[Rollback]` and — per researcher §4I + §5 hotspot #7 — **Done-for-me is surfaced here, NOT on the paywall.** The button reads "Stuck? Let a human take over (EUR 79)" and lives directly in the error card.
   - Preview overlay does NOT clear; shows "Preview unchanged — last good build still visible"
   - Tokens consumed by partial build are debited; tokens for failed cards are refunded automatically (trust signal)

### 4.2 Card editing: modal vs inline

**Decision: modal-first for substantive edits, inline for title rename only.** Per researcher §8 directive #2: modal is correct for description / acceptance / dependencies (spec-heavy fields), but inline rename on title double-click is the one exception because title is high-frequency and low-stakes.

**Modal path (substantive edits):**
- **Single-click on card row (but not on title)** → opens `CardEditorModal` with focus on title input
- **Click "+ Add card"** → opens `CardEditorModal` with empty fields
- **Click "✨ Suggest a card"** (next to "+ Add card") → opens `CardEditorModal` pre-filled by Haiku from a one-line intent input (see §4.2.1)
- Modal has tabbed sections: `Description` / `Acceptance` / `Dependencies` / `Cost preview`
- "Save" button persists; "Cancel" discards. Esc = cancel after dirty-state check.
- Modal supports keyboard-only flow (Tab/Shift-Tab cycles through sections, Enter advances, Cmd+Enter saves).

**Inline rename path (title only):**
- **Double-click on card title** → title text becomes an `<input type="text">` with value selected, in place, no modal
- **Enter** → saves, fires PATCH to `/api/workspace/cards/[id]`, exits edit mode
- **Esc** → discards, exits edit mode
- **Blur** → saves (same as Enter) — matches the project-name inline-edit pattern in §2.4 top bar
- Only the title field is inline-editable. Description, acceptance criteria, dependencies, and type all require the modal. This protects the "am I editing?" clarity for substantive work while eliminating friction on the single most-common edit (rename).
- Keyboard alternative: focus card → press `F2` → same inline rename path (standard rename shortcut from file managers).

Drag-to-reorder cards within a group is also **inline** (no modal). See §4.6.

### 4.2.1 "Suggest a card from blank" (Haiku-powered, SH per researcher §4B)

Removes the blank-page problem: the user knows they want something but doesn't know how to phrase it as a card.

**Flow:**
1. User clicks `✨ Suggest a card` next to `+ Add card`
2. A small inline input appears: "What do you want to add?" with placeholder "e.g., a way to favorite posts"
3. User types a one-line intent and presses Enter
4. Haiku is invoked (1 token, charged on submit) with a prompt that asks for: suggested title, description, acceptance criteria (3 bullets), type classification, dependency hints from existing cards
5. Response streams into the `CardEditorModal` with all fields pre-filled
6. User reviews, edits freely, and saves — or discards (token still charged, this is a paid call)
7. If the user discards three suggestions in a row, surface a tooltip: "Prefer to write it yourself? Click + Add card."

**Why Haiku not Sonnet:** cost. This is a thought-starter, not a production build. Getting 80% right for 1 token beats getting 95% right for 3 tokens, because the user is going to edit anyway.

**Validation:** Haiku output goes through a Zod schema (`entities/kanban-card/types.ts`) before being written into the modal. Malformed output triggers a fallback: "We had trouble suggesting a card — try rephrasing, or click + Add card to write it yourself." Tokens refunded on validation failure (per AGENTS.md rule: validate ALL AI output).

### 4.3 Prompt improvement widget (backlog #13)

**When it appears:** as a small ghost button next to the chat input AND at the bottom of any open card editor's description field.

**Copy:** `✨ Improve this (1 token)`

**Behavior:**
1. User clicks → button shows loading spinner
2. Haiku call returns: rewritten text + 2-3 sentence explanation of what changed
3. Result rendered as an inline diff card directly under the input:
   - Strikethrough on removed words, underline on added words
   - "Why we changed this" expansion
   - `[Use this]` `[Keep mine]` `[Try again — 1 token]` buttons
4. Choosing `Use this` replaces the input value AND fires an analytics event
5. Choosing `Keep mine` dismisses without persisting

Token debit happens on click, not on accept — even if user dismisses, the call cost was real.

### 4.4 "What just happened?" micro-explainers (backlog #14)

**Where they render:**
- **Bottom bar left slot** (single sentence, latest only) — primary surface
- **Toast stack bottom-left** (queue of recent explainers, max 3 visible) — fallback if user is reading the bottom bar slot
- **History drawer** — full chronological list

**Persistence:**
- 8 seconds visible in bottom bar before fading
- 12 seconds visible as a toast
- Forever in the history drawer (until rollback or project delete)

**Dismissal:**
- Click anywhere on the explainer → opens deep-dive sheet
- Click X on toast → dismisses just that toast
- They never block interaction; always non-modal

### 4.5 Approval checkpoints (backlog #11)

A unified `ApprovalCheckpointModal` for any action ≥10 economy tokens OR:
- Connecting an external service (OAuth)
- Deploying / publishing
- Deleting a card or rolling back a build
- Spending real money (Done-for-me, top-up)

**Modal anatomy:**

```
┌─ Modal title: "Confirm: Build 6 cards" ──────┐
│                                               │
│ What will happen:                             │
│ "Meldar will write code to scrape Reddit and │
│  generate posts. Your app will rebuild."     │
│                                               │
│ Cost:                                         │
│ • 12 tokens (you have 487)                    │
│ • ~30 seconds                                 │
│                                               │
│ ┌─────────────────────────┐                  │
│ │ Show what's in this build │                │
│ └─────────────────────────┘                  │
│                                               │
│ [Cancel]              [Approve and build]    │
└───────────────────────────────────────────────┘
```

The "Show what's in this build" expansion is collapsed by default to honor the "no walls of text" principle. Curious users can expand it; everyone else sees just enough.

### 4.6 Drag-to-reorder cards

- Drag handle is an explicit `⋮⋮` icon on the left edge of the card (NOT the entire card row — too easy to misfire while clicking)
- Keyboard alternative: focus card → press Space to "pick up" → arrow keys to move → Space to drop (HTML5 dnd-kit pattern)
- Visual: dragged card has 4px elevation shadow, drop targets show insertion line (2px primary color)
- Cross-group drops allowed within a project (move from Drop 1 → Backlog), not across projects
- After drop: optimistic update, then PATCH to `/api/workspace/cards/[id]` with new position
- If reorder violates `dependsOn` constraint, show toast "This card depends on X — can't move it before X" and snap back

### 4.7 Undo / rollback a Build

Two pathways:

1. **Per-build rollback** (full undo):
   - History drawer lists every build as a row with timestamp + cards built + token cost
   - Each row has a `[Rollback to this point]` button
   - Click → ApprovalCheckpointModal: "This will revert all changes since this build. Tokens won't be refunded. Confirm?"
   - On confirm: orchestrator applies the inverse diff to the sandbox; preview rebuilds; cards revert to their pre-build state

2. **Per-card retry** (partial undo, only for failed cards):
   - Failed card has `[Try again]` button → re-queues just that card

Rollback is destructive in user-perception terms. It always requires explicit confirmation (no undo-the-undo).

### 4.8 Live preview interactions

| Interaction | Behavior |
|---|---|
| **Click inside iframe** | Click passes through to the user's app (their app handles it) |
| **URL bar in preview header** | Shows current iframe URL. Read-only by default. Click to copy. |
| **Refresh button (🔄)** | Force-reloads iframe (bypasses sandbox cache via cache-bust query param) |
| **🔒 lock to current URL** | Toggle. When locked, regenerations don't reset iframe location. Default: locked. **Visual prominence is required** (per researcher §8 directive #4) — the lock state is rendered as a fully-styled pill with a background color, not a subtle icon toggle, so the state change is never hidden. On **deliberate unlock** (user click), fire a Toast: "Preview will follow builds." On re-lock, fire a Toast: "Preview locked to current URL." No toast when the lock state was merely restored from a previous session. |
| **Open in new tab** | Opens preview URL in new tab so user can interact full-size |
| **📱 Open on phone (QR code)** | **MH per researcher §4A + §8 directive #6.** **Persistent affordance in the preview controls bar** — always visible, never hidden in a menu, never conditional on hover. Click opens a popover with a QR code encoding the preview URL. User scans with their phone → preview opens in their mobile browser. **This is the single most important viral affordance.** It turns "I built something" into "I can show this to anyone right now." The QR popover also has a "Copy mobile link" fallback for users without the phone handy. |
| **View logs** | Slide-up drawer with sandbox logs (stdout, stderr, build output). Auto-scrolls to bottom. |
| **Iframe failed to load** | See §2.7 |
| **Cross-origin / mixed-content errors** | Logged to drawer; banner in preview header "Some content blocked — [why?]" |

The lock-to-URL feature is the single most important preview interaction. Without it, every Build resets the user back to `/` and they lose their navigation context. With it, the preview behaves like a hot-reload dev server that respects the user's mental model.

**Starter template responsive requirement (per researcher §4 critical-missing #9):** every use-case starter template MUST be mobile-responsive out of the box. The QR-code-to-phone flow is worthless if the user scans and sees a desktop layout crammed onto 375px. This is a **P0 constraint on the template authoring work** (backlog #19), not a workspace feature per se — but the preview controls assume it's true, and the workspace should run a one-time automated check on first project deploy: fetch the preview URL at 375px viewport and verify no horizontal scroll. If the check fails, log a founder alert (not a user-facing error) so template bugs surface fast.

**Share-link visibility warning (P0, per spike README AC-3):** preview URLs are **public-by-default** — the share-link IS the auth. Anyone with the URL sees the user's work-in-progress. For MVP this is acceptable IF the UI is explicit about it. Every surface that exposes a share-link must include a single-line warning, never hidden, never on hover-only:

> "Anyone with this link can view your preview. Don't share secrets."

Surfaces requiring the warning (P0 — checked in handoff §10.6):
- The QR popover (next to "Copy mobile link")
- The "Open in new tab" affordance (small inline note)
- The mobile share-link CTA in §2.3 (inline, above the share button)
- The referral widget in `features/referral/` (the share-your-project surface, not the referral-link surface)
- Any "Copy preview URL" button anywhere in the workspace
- The `ShareCelebrationOverlay`'s "Share this" affordance (§4.1 step 6)

The warning copy is one of the items in §10.6 content checklist. Founder may revise the exact wording but the constraint is non-negotiable: the user must see the warning before they could plausibly share the URL. Real auth on preview URLs is a Sprint 2+ follow-up; for MVP the warning carries the load.

### 4.9 Keyboard shortcuts (workspace scope)

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + Enter` | Trigger Build |
| `Cmd/Ctrl + Z` | **Undo last build** — opens `RollbackConfirmModal` pre-targeted at the most recent build. Pairs with §4.7 per-build rollback. Per researcher §8 minor tweak. Never fires auto — always requires confirmation. |
| `Cmd/Ctrl + K` | Open command palette (Phase 2; in MVP this opens chat input) |
| `Cmd/Ctrl + /` | Open chat input |
| `Cmd/Ctrl + N` | New card |
| `Cmd/Ctrl + S` | Save current modal (if open) |
| `F2` | Rename focused card inline (see §4.2) |
| `Esc` | Close any modal / cancel drag |
| `?` | Show keyboard shortcut overlay |
| `J` / `K` | Move focus down/up the kanban (vim-style, Phase 2) |

All shortcuts must respect input focus — never fire inside an active text input unless it's `Cmd+Enter` or `Esc`.

### 4.10 Day-2 return-state screen (MH, per researcher §4J + §5 hotspot #5 + §8 #3)

**This is a distinct component surface, not a workspace macro-state.** On any session after the first, when the user lands on `/workspace/[projectId]`, the workspace shell renders a lightweight overlay card BEFORE the full workspace is interactive. It disappears either automatically (after 3 seconds) or on user interaction.

**Overlay card anatomy:**

```
┌─────────────────────────────────────────────┐
│ Welcome back, Katya. 👋                     │
│                                              │
│ Where you left off:                         │
│ • You shipped: "Booking form" (2 days ago)  │
│ • Next up: "Add confirmation email"          │
│                                              │
│ While you were gone:                        │
│ ✨ You earned 50 tokens overnight           │
│ ✨ 2 of your referrals clicked your link    │
│                                              │
│ [Keep going →]     [See full roadmap]       │
└─────────────────────────────────────────────┘
```

**Data sources:**
- Last `built` card's title (from `build-history` feature)
- Next card in `ready` or first `draft` card (from `kanban` feature)
- Token refill events since last session (from `token-budget` feature)
- Referral events since last session (from `referral` feature)

**Why it's a distinct screen, not a workspace banner:**
- A banner inside the workspace competes with kanban + preview for attention and gets dismissed without being read
- A distinct card forces a single moment of reorientation: "where was I?" → "oh right" → "let me go"
- It is **not** a modal — no focus trap, no scrim, no Esc dismiss. It's a non-blocking overlay card that fades as the workspace becomes interactive.
- On reduced-motion, it renders statically for 3 seconds then fades linearly.

**Suppression rules:**
- Only shown on first load of a session (tab open, or after ≥4 hours idle)
- Never shown if the user has no built cards yet (pre-Ship-#1)
- Never shown if the user's token balance hasn't changed and there are no new referral events — falls back to just the "where you left off" half
- Dismissible permanently via a small "Don't show this again" link — stored in user preferences, not localStorage (follows the user across devices)

**Component location:** `features/workspace-return-state/` (new feature). Exports `ReturnStateOverlay` (C) + `model/return-state-atoms.ts`. Added to §5.1 file tree.

**Day-2 cold rehydrate timing (critical, per spike README AC-1):** Day-2 entry is **NOT** the same as the same-session 4–5ms warm reuse. On Day 2, the user's Durable Object is cold, the container needs to boot, source files need to restore from Postgres/R2, and Next.js needs to recompile before the preview URL is ready. Spike-projected range: **6–15 seconds**. Acceptance criterion for Sprint 1: <5s p50, <8s p95 on prod amd64.

**UX implication:** the `ReturnStateOverlay` card MUST be designed to **absorb the cold-rehydrate window**, not flash by in 3 seconds. Two coordinated behaviors:

1. **Overlay timing follows sandbox readiness, not a fixed timer.** The 3-second auto-dismiss only applies if the sandbox is already serving by the time the overlay paints. If the sandbox is still rehydrating, the overlay stays visible until rehydration completes — the user is reading "while you were gone…" while the infrastructure catches up. This is a feature, not a bug.
2. **If rehydrate exceeds 5s, the overlay shows a contextual progress narration in its lower band:** "Getting your Ship #1 ready…" → "Compiling your code…" → "Almost there…" — phase translations from §4.1, scoped to rehydration. Same translator infra, different phase vocabulary.

**Mitigation if Sprint 1 misses the <5s p50 / <8s p95 bar (per spike AC-1 fallback):** pre-warm the user's DO during the email-magic-link click → workspace render window, so the cold boot overlaps with the magic-link verification page. This is the same pattern as ADR #47 (pre-warm during paywall) but for Day-2 returners. Tracked in §10.5.

### 4.11 Orchestrator chat panel: scope (Q-11 resolved per researcher §8 directive #3)

**Resolution:** the chat panel carries BOTH passive build-commentary AND active conversational input — not as two modes the user switches between, but as two layers **coexisting vertically in a single panel**. This is a confirmed scope decision from the researcher; flagged for founder ack because it affects feature-scope estimation, not just UI.

**Panel anatomy (top-to-bottom inside the chat panel):**

```
┌─────────────────────────────────────┐
│ Build commentary (passive, always)  │  ← role="log" aria-live="polite"
│ ─────────────────────────────────── │
│ "Reading what you already built…"   │
│ "Sketching the plan…"               │
│ "Writing the code…"                 │
│ "Putting the pieces together…"      │
│ ✓ "Your app is ready to preview."   │
│ ─────────────────────────────────── │
│                                     │
│                                     │  ← Log auto-scrolls, retains history
│                                     │
│ ─────────────────────────────────── │
│ [ Ask Meldar...              ][→]  │  ← Active input, bottom-docked
└─────────────────────────────────────┘
```

**Behavior rules:**

1. **Commentary is ALWAYS ON** (default state, passive consumption). It streams build phase translations (per §4.1 step 4) and "What just happened?" receipts (per §3.6.2). The user does nothing to turn it on.
2. **Active input is a persistent "Ask Meldar" affordance** docked at the bottom of the panel. It is always visible but collapsed — just a placeholder-styled text input with a send icon. Click / focus → expands to a multi-line textarea.
3. **The two layers coexist vertically in the same panel.** No tabs. No mode switch. The user never has to ask "where is the chat?" vs "where is the build log?" — they're the same panel.
4. **During an active Build stream, the active input is disabled** with a tooltip: "Building… back in a moment." This prevents the user from queueing a conflicting instruction mid-build. The input re-enables on `build_complete` or `build_failed`.
5. **Commentary scrolls with build events; input does not move.** The input is sticky-positioned at the bottom of the panel. The commentary region above it auto-scrolls as new phase translations arrive. Standard chat app behavior.
6. **Input submissions route to a different backend** than build streams. Active input → `/api/workspace/chat` (conversational turn). Build commentary → consumed from the `/api/workspace/build/[runId]` SSE stream. Two data sources, one panel, handled by the `orchestrator-chat` feature's two atoms: `chat-atoms.ts` (user turns) and `commentary-atoms.ts` (build log).

**File tree impact (§5.1 update):** `orchestrator-chat` feature gets a second model file:
- `chat-atoms.ts` — user conversational turns (existing)
- `commentary-atoms.ts` — passive build commentary log (NEW, splits responsibility from chat-atoms so the always-on log is not coupled to the conversational input state machine)

**Founder-blocking ack:** per researcher §8 "founder-blocking items," this expands feature scope from "one of the two" to "both-in-one-panel." Flagged for team-lead review. If scope is cut, the fallback is commentary-only (passive log, no active input) — the always-on log is non-negotiable for trust (§5 hotspot #2) but the active-input "Ask Meldar" affordance can be deferred to Phase 2.

---

## Section 5 — Component hierarchy (Feature-Sliced Design)

### 5.1 New file tree (proposed)

```
src/
├─ app/
│  ├─ workspace/
│  │  ├─ layout.tsx                          (S)  Auth gate + workspace chrome wrapper
│  │  ├─ page.tsx                            (S)  Project list / "no projects yet"
│  │  └─ [projectId]/
│  │     ├─ layout.tsx                       (S)  Loads project data → renders WorkspaceShell
│  │     ├─ page.tsx                         (S)  Default workspace surface
│  │     ├─ roadmap/page.tsx                 (S)  Full-screen roadmap view
│  │     ├─ history/page.tsx                 (S)  Build history timeline
│  │     └─ settings/page.tsx                (S)  Project settings form
│  ├─ onboarding/
│  │  ├─ layout.tsx                          (S)  Onboarding chrome
│  │  ├─ style/page.tsx                      (S)  Style selector (mostly server)
│  │  ├─ use-case/page.tsx                   (S)  Use case picker
│  │  └─ intro/page.tsx                      (S)  Roadmap walkthrough
│  ├─ account/
│  │  ├─ layout.tsx                          (S)
│  │  ├─ billing/page.tsx                    (S)
│  │  ├─ referrals/page.tsx                  (S)
│  │  ├─ tokens/page.tsx                     (S)
│  │  └─ settings/page.tsx                   (S)
│  └─ api/workspace/
│     ├─ projects/route.ts
│     ├─ projects/[id]/route.ts
│     ├─ cards/route.ts
│     ├─ cards/[id]/route.ts
│     ├─ build/route.ts                       POST → returns runId
│     ├─ build/[runId]/route.ts               GET → SSE stream
│     ├─ sandbox/[projectId]/route.ts         GET → preview URL + status
│     ├─ tokens/route.ts                      GET balance / debit history
│     ├─ explainers/route.ts                  GET explainer copy
│     └─ orchestrator/chat/route.ts           POST chat → SSE stream
│
├─ widgets/
│  ├─ workspace/                              NEW WIDGET
│  │  ├─ ui/
│  │  │  ├─ WorkspaceShell.tsx               (S)  Server parent: loads project, passes to client
│  │  │  ├─ WorkspaceSurface.tsx             (C)  Client coordinator for split pane + state
│  │  │  ├─ TopBar.tsx                       (C)  Project name, progress, token balance
│  │  │  ├─ BottomBar.tsx                    (C)  Explainer slot + Build button
│  │  │  ├─ SplitPane.tsx                    (C)  Resizable divider, ratio persistence
│  │  │  ├─ MobileFallback.tsx               (S)  Mobile guided mode (no client logic)
│  │  │  └─ WorkspaceErrorBoundary.tsx       (C)  Workspace-scoped error fallback
│  │  ├─ model/
│  │  │  └─ workspace-atoms.ts                    Jotai atoms: split ratio, active modal, etc.
│  │  └─ index.ts                                 barrel
│  │
│  ├─ onboarding/                             NEW WIDGET
│  │  ├─ ui/
│  │  │  ├─ StyleSelector.tsx                (C)
│  │  │  ├─ UseCasePicker.tsx                (C)
│  │  │  └─ RoadmapWalkthrough.tsx           (C)
│  │  └─ index.ts
│  │
│  ├─ account-shell/                          NEW WIDGET
│  │  ├─ ui/
│  │  │  ├─ AccountNav.tsx                   (S)
│  │  │  └─ AccountBreadcrumb.tsx            (S)
│  │  └─ index.ts
│  │
│  ├─ landing/                                EXISTING (no change in this spec)
│  ├─ header/                                 EXISTING (reused for non-workspace pages)
│  └─ footer/                                 EXISTING (NOT shown inside workspace)
│
├─ features/
│  ├─ kanban/                                 NEW FEATURE
│  │  ├─ ui/
│  │  │  ├─ KanbanBoard.tsx                  (C)  Top-level board, drag context
│  │  │  ├─ KanbanGroup.tsx                  (C)  Drop section
│  │  │  ├─ KanbanCardRow.tsx                (C)  Collapsed card
│  │  │  ├─ CardEditorModal.tsx              (C)  Modal editor
│  │  │  ├─ CardStatePill.tsx                (S — or C if needs runtime label) State badge
│  │  │  ├─ CardCostBadge.tsx                (S)
│  │  │  ├─ CardDragHandle.tsx               (C)
│  │  │  └─ EmptyKanban.tsx                  (S)
│  │  ├─ model/
│  │  │  ├─ kanban-atoms.ts                       Jotai: cards by group, dirty state
│  │  │  └─ card-state-machine.ts                 Pure functions for state transitions
│  │  ├─ lib/
│  │  │  ├─ topological-sort.ts                   Dependency-ordered build queue
│  │  │  └─ schemas.ts                            Zod schemas for card + state
│  │  └─ index.ts
│  │
│  ├─ sandbox-preview/                        NEW FEATURE
│  │  ├─ ui/
│  │  │  ├─ PreviewFrame.tsx                 (C)  Iframe + URL bar + lock toggle
│  │  │  ├─ PreviewHeader.tsx                (C)  URL display, refresh, open in new tab
│  │  │  ├─ PreviewLogsDrawer.tsx            (C)  Logs slide-up
│  │  │  ├─ PreviewLoadingState.tsx          (S)  Shimmer + cold-start copy
│  │  │  └─ PreviewErrorState.tsx            (C)  Retry CTAs
│  │  ├─ model/
│  │  │  └─ preview-atoms.ts                       URL lock, current URL, status
│  │  ├─ lib/
│  │  │  ├─ sandbox-client.ts                      Provider-shaped facade (CF Sandbox SDK)
│  │  │  └─ schemas.ts                             Zod for sandbox responses
│  │  └─ index.ts
│  │
│  ├─ orchestrator-chat/                      NEW FEATURE
│  │  ├─ ui/
│  │  │  ├─ ChatPanel.tsx                    (C)  Vertical panel: commentary log + active input
│  │  │  ├─ BuildCommentaryLog.tsx           (C)  role="log" always-on phase stream
│  │  │  ├─ AskMeldarInput.tsx               (C)  Sticky bottom conversational input
│  │  │  ├─ ChatMessage.tsx                  (C)  Single message renderer (used by both)
│  │  │  └─ PromptImprovementInline.tsx      (C)  Diff card after improve click
│  │  ├─ model/
│  │  │  ├─ chat-atoms.ts                          Conversational turns (user-initiated)
│  │  │  └─ commentary-atoms.ts                    Passive build commentary log (build-stream-initiated)
│  │  ├─ lib/
│  │  │  ├─ sse-client.ts                          SSE consumer for build + chat streams
│  │  │  └─ schemas.ts                             Zod for streamed messages
│  │  └─ index.ts
│  │
│  ├─ token-budget/                           NEW FEATURE
│  │  ├─ ui/
│  │  │  ├─ TokenBalancePill.tsx             (C)  Top bar widget
│  │  │  ├─ TokenBudgetPopover.tsx           (C)  Hover/click breakdown
│  │  │  ├─ TokenPaywallModal.tsx            (C)  Soft wall at EUR 2/day
│  │  │  ├─ TokenDebitAnimation.tsx          (C)  Animated counter on debit
│  │  │  └─ EarnTokensSurface.tsx            (S)  Daily cap, referral, top-up CTAs
│  │  ├─ model/
│  │  │  └─ token-atoms.ts
│  │  ├─ lib/
│  │  │  └─ schemas.ts                             Zod for balance + debit responses
│  │  └─ index.ts
│  │
│  ├─ roadmap/                                NEW FEATURE
│  │  ├─ ui/
│  │  │  ├─ RoadmapStrip.tsx                 (C)  Top bar 8-segment progress
│  │  │  ├─ RoadmapDrawer.tsx                (C)  Slide-down full roadmap
│  │  │  ├─ RoadmapStep.tsx                  (S)  Single step renderer
│  │  │  ├─ MilestoneBadge.tsx               (S)
│  │  │  └─ ShareCelebrationOverlay.tsx      (C)  Non-blocking, ≤300ms on milestone
│  │  ├─ model/
│  │  │  └─ roadmap-atoms.ts
│  │  └─ index.ts
│  │
│  ├─ learning-explainer/                     NEW FEATURE
│  │  ├─ ui/
│  │  │  ├─ WhatJustHappenedToast.tsx        (C)
│  │  │  ├─ ExplainerSheet.tsx               (C)  Slide-up deep-dive
│  │  │  ├─ PromptAnatomyPanel.tsx           (C)  Side panel
│  │  │  └─ InlineExplainer.tsx              (S)  Card footer 1-liner
│  │  ├─ model/
│  │  │  └─ explainer-atoms.ts
│  │  ├─ lib/
│  │  │  └─ explainer-client.ts                    Fetches copy from /api/workspace/explainers
│  │  └─ index.ts
│  │
│  ├─ build-history/                          NEW FEATURE
│  │  ├─ ui/
│  │  │  ├─ HistoryDrawer.tsx                (C)
│  │  │  ├─ HistoryRow.tsx                   (S)
│  │  │  └─ RollbackConfirmModal.tsx         (C)
│  │  ├─ model/
│  │  │  └─ history-atoms.ts
│  │  └─ index.ts
│  │
│  ├─ done-for-me/                            NEW FEATURE
│  │  ├─ ui/
│  │  │  ├─ DoneForMeButton.tsx              (C)  Surfaces when user is stuck
│  │  │  └─ DoneForMeModal.tsx               (C)
│  │  └─ index.ts
│  │
│  ├─ referral/                               NEW FEATURE (extends existing if any)
│  │  ├─ ui/
│  │  │  ├─ ReferralLinkCard.tsx             (C)
│  │  │  └─ ReferralStats.tsx                (S)
│  │  └─ index.ts
│  │
│  ├─ workspace-return-state/                 NEW FEATURE (per researcher §4J, §5 #5)
│  │  ├─ ui/
│  │  │  └─ ReturnStateOverlay.tsx           (C)  Day-2 "where you left off" card
│  │  ├─ model/
│  │  │  └─ return-state-atoms.ts
│  │  ├─ lib/
│  │  │  └─ session-detector.ts                    Detects first-of-session entry vs. reload
│  │  └─ index.ts
│  │
│  ├─ preview-qr/                              NEW FEATURE (per researcher §4A MH)
│  │  ├─ ui/
│  │  │  └─ PreviewQrPopover.tsx             (C)  QR code + copy mobile link
│  │  ├─ lib/
│  │  │  └─ qr-generator.ts                        QR generation (qrcode lib, client-only)
│  │  └─ index.ts
│  │
│  ├─ discovery-flow/                         EXISTING — minor update for v3 roadmap preview
│  ├─ discovery-quizzes/                      EXISTING — no change
│  ├─ analytics/                              EXISTING — extend with v3 events (#27)
│  ├─ billing/                                EXISTING — extend for Builder tier subscription
│  ├─ cookie-consent/                         EXISTING — no change
│  ├─ focus-mode/                             EXISTING — no change
│  ├─ founding-program/                       EXISTING — no change
│  └─ screenshot-upload/                      EXISTING — no change
│
├─ entities/
│  ├─ project/                                NEW ENTITY
│  │  ├─ types.ts                                  Project type + Zod schema
│  │  ├─ lib/                                      Pure helpers (project-related calculations)
│  │  └─ index.ts
│  ├─ kanban-card/                             NEW ENTITY
│  │  ├─ types.ts                                  Card type + Zod schema (matches §3.1)
│  │  ├─ lib/
│  │  └─ index.ts
│  ├─ build-run/                               NEW ENTITY
│  │  ├─ types.ts
│  │  └─ index.ts
│  ├─ token-account/                           NEW ENTITY
│  │  ├─ types.ts
│  │  └─ index.ts
│  ├─ explainer/                               NEW ENTITY (data-driven copy)
│  │  ├─ types.ts
│  │  └─ index.ts
│  └─ pain-points/                             EXISTING
│
└─ shared/
   ├─ ui/
   │  ├─ Button.tsx                            EXISTING
   │  ├─ EmailCapture.tsx                      EXISTING
   │  ├─ JsonLd.tsx                            EXISTING
   │  ├─ FadeInOnScroll.tsx                    EXISTING
   │  ├─ legal-primitives.tsx                  EXISTING
   │  ├─ ModalShell.tsx                        NEW — focus trap, scrim, Esc handler
   │  ├─ Drawer.tsx                            NEW — slide-in/up panel
   │  ├─ Toast.tsx                             NEW — bottom-left toast queue
   │  ├─ ErrorSurface.tsx                      NEW — unified error styling
   │  ├─ EmptyState.tsx                        NEW — illustration + CTA shell
   │  ├─ SkeletonShimmer.tsx                   NEW — brand-colored shimmer
   │  ├─ KeyboardShortcutHint.tsx              NEW — `Cmd K` style chip
   │  └─ index.ts                              barrel update
   │
   ├─ config/
   │  ├─ seo.ts                                EXISTING
   │  └─ workspace-config.ts                    NEW — split ratio defaults, build limits
   │
   ├─ types/
   │  ├─ discovery.ts                          EXISTING
   │  └─ workspace.ts                           NEW — shared workspace types (re-exports)
   │
   ├─ lib/
   │  └─ workspace-fetcher.ts                   NEW — typed fetch helpers for /api/workspace/*
   │
   └─ styles/
      └─ globals.css                           EXISTING
```

### 5.2 Reuse vs new

**Reused as-is:**
- `shared/ui/Button.tsx`, `EmailCapture.tsx`, `JsonLd.tsx`
- `widgets/header/`, `widgets/footer/` (for non-workspace pages)
- `features/analytics/`, `features/cookie-consent/`, `features/billing/`
- `features/discovery-flow/` for the free-tier funnel into the workspace

**Reused with extension:**
- `features/billing/` adds Stripe portal embed for Builder tier subscription
- `features/analytics/` adds the 11 v3 events from backlog #27

**Net new:**
- 11 new features (kanban, sandbox-preview, orchestrator-chat, token-budget, roadmap, learning-explainer, build-history, done-for-me, referral, workspace-return-state, preview-qr)
- 3 new widgets (workspace, onboarding, account-shell)
- 5 new entities (project, kanban-card, build-run, token-account, explainer)
- 7 new shared UI primitives

### 5.3 RSC vs Client split — rules of thumb applied

| Boundary | Rule |
|---|---|
| **Pages** | Always Server. Fetch project data, hand off to client widget. |
| **Top bar / bottom bar** | Client (interactive), but project name/avatar can be passed as server props. |
| **Kanban board** | Client (drag-and-drop, optimistic updates). |
| **Individual card row** | Client wrapping a server-rendered content shell (CardStatePill can be S). |
| **Preview iframe** | Client (lock state, refresh handler). |
| **Chat panel** | Client (input, SSE consumer). |
| **Roadmap drawer** | Client (open/close state) wrapping server step content. |
| **Modals** | Client (focus trap, Esc, scrim). |
| **History rows** | Server-rendered (static data); the drawer wrapper is Client. |

The pattern is **server shell, client surface**: every widget that has interactive state has a `*Shell.tsx` Server parent that loads data, and a `*Surface.tsx` (or equivalent) Client child that handles state.

---

## Section 6 — Design system extensions

### 6.1 New Panda CSS tokens (additions to `panda.config.ts`)

```ts
// Colors (workspace-specific semantic tokens)
workspaceSurface:        { value: '#fffefb' }      // slightly warmer than landing surface
workspacePanel:          { value: '#faf9f6' }      // matches existing surface
workspacePanelDim:       { value: '#f4f3f1' }      // matches existing surfaceContainerLow
previewBorder:           { value: '#d3c2ca' }      // matches outlineVariant
previewBorderActive:     { value: '#623153' }      // primary, when preview is focused
liveIndicator:           { value: '#22c55e' }      // green for live preview
liveIndicatorPulse:      { value: '#22c55e80' }    // semi-transparent for pulse animation

// Card state colors
cardStateDraft:          { value: '#9ca3af' }      // gray
cardStateReady:          { value: '#623153' }      // primary mauve
cardStateQueued:         { value: '#FFB876' }      // gradient orange
cardStateBuilding:       { value: '#3b82f6' }      // blue for in-flight
cardStateBuilt:          { value: '#22c55e' }      // green for success
cardStateNeedsRework:    { value: '#f59e0b' }      // amber
cardStateFailed:         { value: '#ef4444' }      // red

// Token economy colors
tokenBalanceHealthy:     { value: '#623153' }
tokenBalanceLow:         { value: '#f59e0b' }      // <50 tokens
tokenBalanceEmpty:       { value: '#ef4444' }      // 0 tokens
```

All workspace colors inherit from the brand palette where possible. State colors deliberately use system-standard hues (red/green/amber/blue) so they're recognizable to non-technical users coming from email clients and chat apps.

### 6.2 Typography additions

```ts
textStyles: {
  'workspace.cardTitle': {
    value: {
      fontFamily: 'heading',
      fontSize: 'md',
      fontWeight: '600',
      lineHeight: '1.3',
    },
  },
  'workspace.cardMeta': {
    value: {
      fontFamily: 'body',
      fontSize: 'xs',
      fontWeight: '400',
      color: 'onSurfaceVariant',
      lineHeight: '1.4',
    },
  },
  'workspace.label': {
    value: {
      fontFamily: 'body',
      fontSize: '2xs',
      fontWeight: '600',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'onSurfaceVariant',
    },
  },
  'workspace.previewUrl': {
    value: {
      fontFamily: 'mono',
      fontSize: 'xs',
      fontWeight: '400',
      color: 'onSurfaceVariant',
    },
  },
  'workspace.tokenBalance': {
    value: {
      fontFamily: 'heading',
      fontSize: 'sm',
      fontWeight: '700',
      fontVariantNumeric: 'tabular-nums',     // critical: no jitter on token debit animation
    },
  },
  'explainer.body': {
    value: {
      fontFamily: 'body',
      fontSize: 'sm',
      fontWeight: '400',
      lineHeight: '1.55',
      color: 'onSurfaceVariant',
    },
  },
}
```

The `tabular-nums` on the token balance is non-negotiable — without it, the animated debit will visibly jitter as the digits change widths.

### 6.3 New recipes

```ts
recipes: {
  // Existing 'button' recipe stays
  
  kanbanCard: {
    base: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      padding: 4,
      borderRadius: '12px',
      bg: 'workspacePanel',
      border: '1px solid',
      borderColor: 'outlineVariant/40',
      borderLeftWidth: '4px',
      borderLeftColor: 'cardStateDraft',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      _hover: {
        borderColor: 'outlineVariant',
        boxShadow: '0 2px 8px rgba(98, 49, 83, 0.06)',
      },
      _focusVisible: {
        outline: '2px solid',
        outlineColor: 'primary',
        outlineOffset: '2px',
      },
    },
    variants: {
      state: {
        draft:        { borderLeftColor: 'cardStateDraft' },
        ready:        { borderLeftColor: 'cardStateReady' },
        queued:       { borderLeftColor: 'cardStateQueued' },
        building:     { borderLeftColor: 'cardStateBuilding', bg: 'cardStateBuilding/4' },
        built:        { borderLeftColor: 'cardStateBuilt' },
        'needs-rework': { borderLeftColor: 'cardStateNeedsRework' },
        failed:       { borderLeftColor: 'cardStateFailed', bg: 'cardStateFailed/4' },
      },
      required: {
        true:  { borderLeftWidth: '4px' },
        false: { borderLeftWidth: '2px', borderLeftStyle: 'dashed' },
      },
    },
    defaultVariants: { state: 'draft', required: false },
  },
  
  splitPaneDivider: {
    base: {
      width: '6px',
      cursor: 'col-resize',
      bg: 'transparent',
      borderInline: '1px solid',
      borderColor: 'outlineVariant/30',
      transition: 'background 0.15s ease',
      _hover: { bg: 'primary/10' },
      _focusVisible: {
        bg: 'primary/20',
        outline: '2px solid',
        outlineColor: 'primary',
        outlineOffset: '-2px',
      },
    },
  },
  
  workspacePanel: {
    base: {
      bg: 'workspacePanel',
      borderRadius: '16px',
      border: '1px solid',
      borderColor: 'outlineVariant/30',
    },
    variants: {
      tone: {
        default: {},
        elevated: { boxShadow: '0 4px 16px rgba(98, 49, 83, 0.05)' },
        sunken:   { bg: 'workspacePanelDim' },
      },
    },
  },
}
```

### 6.4 Motion guidelines

| Animation | Duration | Easing | Notes |
|---|---|---|---|
| Card state transition | 300ms | ease-out | Color only, no layout shift |
| Card reorder | 250ms | ease-in-out | Position interpolated, never hard-cut |
| Modal open | 200ms | ease-out | Scrim fade + scale 0.97 → 1.0 |
| Modal close | 150ms | ease-in | Faster than open (perceived snappiness) |
| Drawer slide | 280ms | cubic-bezier(0.32, 0.72, 0, 1) | iOS-like spring feel |
| Toast enter | 220ms | ease-out | Slide up + fade |
| Toast exit | 180ms | ease-in | Slide down + fade |
| Token debit count animation | 600ms | linear | Counted via `requestAnimationFrame`, NOT CSS interpolation (text content can't be tweened) |
| Build progress bar | live | linear | Stream-driven, no easing |
| Live preview overlay fade | 300ms | ease-out | After build, scrim clears smoothly |
| Card hover lift | 150ms | ease-out | Subtle, never more than 2px translate |
| Reorder drag elevation | 100ms | ease-out | Picks up shadow on drag start |

**Reduced motion:** when `prefers-reduced-motion: reduce`, all transitions drop to `0ms` except for token debit (which uses opacity flash instead) and progress bars (which stay live).

### 6.5 New shared primitives

| Primitive | Purpose | Why shared not feature-local |
|---|---|---|
| `ModalShell` | Focus trap, scrim, Esc handler, ARIA dialog roles | Used by 5+ modals across workspace |
| `Drawer` | Slide-in/up panel with same a11y guarantees | History, logs, prompt anatomy, explainer all use it |
| `Toast` + `ToastQueue` | Bottom-left non-modal notification with auto-dismiss | "What just happened" + system errors share the queue |
| `ErrorSurface` | Unified error card (illustration + headline + body + CTAs) | Preview errors, build errors, auth errors all use it |
| `EmptyState` | Illustration + headline + 1 CTA | Empty kanban, empty history, no projects, no referrals |
| `SkeletonShimmer` | Brand-colored loading placeholder | Used for all initial workspace loads |
| `KeyboardShortcutHint` | `Cmd K` style chip | Shown in tooltips and command palette |

These are **shared, not feature-local**, because they enforce the same accessibility and visual treatment everywhere.

### 6.6 Focus state design

Every interactive element uses `_focusVisible` (not `_focus`) to avoid showing focus rings on mouse clicks. The ring is always:

- 2px solid `primary`
- 2px offset
- Border-radius matches the element

For elements with no border-radius (text links), the ring is rectangular with 2px offset.

For the kanban cards specifically, focus is critical because keyboard reorder requires the card to look obviously focused. The kanban card focus state adds a 4px primary-tinted shadow alongside the outline ring.

### 6.7 Stacking context strategy

Z-index values are NOT raw numbers. Define them as named tokens:

```ts
zIndex: {
  base:           { value: '0' },
  raised:         { value: '1' },     // hover lifts
  sticky:         { value: '10' },    // top bar, bottom bar
  drawer:         { value: '20' },    // history, logs, prompt anatomy
  popover:        { value: '30' },    // token budget, explainer
  toast:          { value: '40' },    // notifications
  modalScrim:     { value: '50' },
  modal:          { value: '51' },
  loadingOverlay: { value: '60' },    // preview rebuild scrim
}
```

This prevents the "z-index arms race" that kills maintenance.

---

## Section 7 — Accessibility baseline

### 7.1 Keyboard navigation map

**Workspace tab order (top → bottom, left → right):**

1. Skip-to-main-content link (visually hidden until focused)
2. Top bar: workspace home link → project name → progress bar → token balance → settings
3. Kanban: + Add card button → drop group headers → first card → next card → ...
4. Chat panel toggle → chat input → improve button → send button (if expanded)
5. Preview header: URL → refresh → lock → open in new tab → logs
6. Bottom bar: explainer (clickable for deep-dive) → Build button

**Within a card (when focused):**
- `Enter` → opens edit modal
- `Space` → picks up for drag
- `Arrow up/down` → moves focus to adjacent card

**Within the kanban (during keyboard drag):**
- `Arrow up/down` → reorder within group
- `Arrow left/right` → move across groups
- `Space` → drop
- `Esc` → cancel drag, return to original position

**Skip links provided:**
- "Skip to kanban" (jumps past top bar)
- "Skip to preview" (jumps past entire left pane)
- "Skip to Build button" (jumps to primary action)

### 7.2 Screen reader patterns

| Surface | ARIA pattern |
|---|---|
| Workspace shell | `<main role="main">` with `aria-label="Workspace for [project name]"` |
| Top bar | `<header role="banner">` |
| Bottom bar | `<footer role="contentinfo">` |
| Kanban board | `<section role="region" aria-label="Build plan">` |
| Drop group | `<section role="group" aria-labelledby="drop-1-heading">` |
| Card | `<article role="article" aria-labelledby="card-{id}-title">`. State is in `aria-describedby` link to status pill text. |
| Preview iframe | `<iframe title="Live preview of {project name}">` — `title` attribute is read by all screen readers |
| Chat log | `role="log" aria-live="polite" aria-relevant="additions"` so SR announces new messages without interrupting |
| Build progress | `role="status" aria-live="polite"` in bottom bar, updated with sentence-level summaries (not token-by-token) |
| Token balance | `<output aria-live="polite">487 tokens</output>` — updates announce on debit |
| Modals | `role="dialog" aria-modal="true" aria-labelledby="modal-title"` |
| Toasts | `role="status" aria-live="polite"` — non-modal, never `assertive` |
| Errors | `role="alert" aria-live="assertive"` reserved ONLY for true blocking errors |

**Critical SR rules:**
- Token debits announce as full sentences ("Spent 12 tokens. Balance is 475 tokens."), not raw numbers
- Build progress announces every state change but NOT every streamed token (would flood SR)
- Card state changes announce as "Card '[title]' is now [state]"
- The preview iframe is announced once on mount; SR users navigating in are told "Entering preview frame"

### 7.3 Color contrast verification

| Surface | Foreground | Background | Ratio target | Status |
|---|---|---|---|---|
| Card title on workspace panel | `onSurface` `#1a1c1a` | `workspacePanel` `#faf9f6` | ≥7:1 (AAA) | passes |
| Card meta text | `onSurfaceVariant` `#4f434a` | `workspacePanel` | ≥4.5:1 (AA) | passes |
| Token balance pill | `primary` `#623153` | `surfaceContainerLow` `#f4f3f1` | ≥4.5:1 | passes — must verify |
| Build button text | white | gradient `#623153 → #FFB876` | ≥4.5:1 against worst point | needs verify on `#FFB876` end (likely fails for sm text) |
| Card state pill text on `bg/4` tinted bg | state color | bg | ≥4.5:1 | needs per-state verification |
| Live indicator green on workspace panel | `liveIndicator` `#22c55e` | `workspacePanel` | non-text (decorative); paired with text "Live" | passes for graphic |

**Action item for the implementer:** run all combinations through axe-core in CI. For the gradient button specifically, add a 1px text shadow OR increase font weight to compensate for the lighter end of the gradient.

### 7.4 Reduced motion handling

Honor `@media (prefers-reduced-motion: reduce)`:
- All transitions → `0ms`
- Card reorder → instant snap, no interpolation
- Modal scale animation → opacity-only
- Token debit animation → opacity flash on the new value, no count interpolation
- Live preview rebuild scrim → opacity-only fade (no scale)
- Loading shimmers → static gradient (no animation)
- Build progress bar → still updates live (essential information)

### 7.5 Text scaling

- All workspace surfaces must remain functional at 200% browser zoom and at user font-size: 200%
- Use `rem` for sizing, never `px`, except for hairline borders (1px is fine)
- Container queries (`@container`) preferred over breakpoints for components that can appear in different layout slots
- Top bar elements can compress (project name truncates with ellipsis + tooltip) but the Build button must NEVER truncate or wrap

### 7.6 Internationalization hooks

The MVP ships English-only, but the architecture must not block i18n later (Finnish is the obvious second per existing memory):

- All user-facing strings come from a single `messages.ts` per feature, NOT inlined in JSX
- Explainer copy is database-driven, so locale is just another column
- Date/time formatting via `Intl.DateTimeFormat`, never `.toString()`
- Number formatting via `Intl.NumberFormat` (especially for token counts and currency)
- No string concatenation for interpolated values (use template literals or a tagged-template helper)

This is **architecture only** for MVP — no actual translations ship yet.

---

## Section 8 — Interaction states inventory

| Surface | Idle | Hover | Focus | Active | Disabled | Loading | Success | Error |
|---|---|---|---|---|---|---|---|---|
| **Build button (bottom bar)** | gradient + cost | brightness +5%, shadow lift | 2px primary ring | scale 0.98 | gray, no shadow, tooltip | spinner replaces icon, "Building…" label | green check 1.5s then back to idle | red border, "Failed — retry" label |
| **Card row (collapsed)** | left stripe state color | bg tint 2%, shadow lift | 2px primary ring + tinted shadow | scale 0.99 | opacity 50%, cursor not-allowed | pulsing left stripe | green stripe, check icon | red stripe, alert icon |
| **Card edit modal** | rendered, fields editable | n/a | first field auto-focused | n/a | save button disabled until dirty + valid | save button spinner | toast "Saved" + close | inline error per field |
| **Chat input** | placeholder + improve button | border emphasis | 2px primary ring | n/a | grayed, "Out of tokens" tooltip | input disabled, spinner under | toast "Sent" briefly | red border, error message below |
| **Preview iframe** | iframe live | n/a (passes through) | iframe takes focus, ring around frame | n/a | grayed scrim, "Sandbox unavailable" | shimmer + cold-start copy | brief green pulse on URL bar | error card replaces iframe content |
| **Preview URL bar** | URL text + icons | icon hover state | 2px primary ring | n/a | n/a | n/a | "Copied" tooltip 1s | n/a |
| **Kanban (board level)** | list of groups | n/a | first card focused | n/a | "Read-only" overlay if subscription lapsed | shimmer rows | n/a | full-board error surface |
| **Token counter pill** | value + icon | underline | 2px ring + popover | n/a | n/a | digit pulse during debit | brief green flash on credit | red flash + tooltip "Out of tokens" |
| **Drag handle (⋮⋮)** | 30% opacity | 100% opacity, cursor grab | 2px ring | cursor grabbing | hidden if card cannot move | n/a | n/a | n/a |
| **Drop target (during drag)** | invisible | n/a | n/a | 2px primary insertion line | n/a | n/a | brief flash on successful drop | n/a |
| **Approval modal — Approve button** | gradient | brightness +5% | 2px ring | scale 0.98 | n/a | spinner | n/a | n/a |
| **Improve button** | ✨ ghost button | bg tint | 2px ring | scale 0.98 | "Need 1 token" tooltip | spinner | inline diff card appears | inline error |
| **Top bar progress bar** | 8 segments, current filled | n/a | n/a | n/a | n/a | latest segment shimmers | next segment fills | n/a |
| **History row** | list item | bg tint | 2px ring | n/a | "Cannot rollback" if newer dependent build | n/a | n/a | n/a |
| **Settings cog menu** | icon | rotate 15deg | ring | menu open | n/a | n/a | n/a | n/a |
| **Skip link** | hidden offscreen | n/a | becomes visible at top of viewport, primary background | scale 0.98 | n/a | n/a | n/a | n/a |

This table is the developer's checklist — every state listed must be implemented, even if visually subtle. Missing states (especially focus and disabled) are the #1 source of accessibility bugs in similar tools.

---

## Section 9 — Performance budget

| Metric | Target | Measurement | Notes |
|---|---|---|---|
| **Initial workspace shell load TTI** | <2s on 4G laptop | Lighthouse, throttled | Shell is mostly server-rendered; client JS budget: 120KB gzipped on first paint |
| **Workspace JS bundle (route-level)** | ≤120KB gzipped | `next build` analyzer | Lazy-load chat, drawer, modals — they aren't part of first paint |
| **Preview iframe first paint** | <3s from "project created" (prod amd64); <10s on dev Apple Silicon | Custom timing in `sandbox-client.ts` | **Spike (task #3) measured: 1–2s cold start on prod amd64, 6.8s on dev Apple Silicon, 4–5ms warm reuse, 12ms `writeFile()` server-side, ~1–2s HMR pickup.** Cloudflare Sandbox cold start dominates this; show progress narrative until ready. Warm reuse is effectively free. |
| **Card reorder animation** | 60fps | Chrome DevTools rendering panel | Use `transform` not `top/left`; `will-change: transform` on dragged element only |
| **Build progress stream latency** | <300ms model→user | Server-side timestamp + client-side timestamp on first SSE event | Use SSE not WebSockets — simpler infra, fine for one-way streams |
| **Token debit UI feedback** | <100ms click→visible change | RUM event | Optimistic update; reconcile with server response |
| **Card click → modal open** | <150ms | RUM | Modal preloads when card row mounts; only the form state initializes on open |
| **Kanban load (50 cards)** | <500ms | RUM | Server-render cards; client only handles drag |
| **Chat message send → first token** | <800ms | SSE first chunk | This is mostly Anthropic API latency |
| **Preview rebuild visible feedback** | <100ms click→overlay shown | RUM | Overlay scrim is pure CSS, no async |
| **Workspace memory footprint** | <50MB after 1 hour idle | Chrome task manager | Stream cleanup, atom GC, no event listener leaks |

### 9.1 Performance non-negotiables

1. **The preview iframe is never unmounted during a session.** Unmounting/remounting costs 1-3 seconds and loses scroll/URL state. Updates happen via cache-busting query param refresh, not full remount.
2. **Kanban cards are virtualized only above 200 cards.** Below that, full DOM is faster than virtual scroll overhead, especially for keyboard navigation.
3. **All AI streaming uses SSE, not WebSockets.** Fewer moving parts, simpler error handling, works with edge runtimes.
4. **Optimistic UI everywhere a user takes an action.** Card creates, edits, reorders, marks-ready all update instantly. Server confirmation reconciles in background. Conflict resolution: last-write-wins on the same card, with toast notification if reconciliation overrides user state.
5. **Code-split aggressively at the modal boundary.** No modal code ships in initial bundle. `next/dynamic` with `ssr: false` for ModalShell consumers.
6. **Explainer copy is fetched lazily** (not bundled). Initial workspace shell doesn't include any explainer text — they fetch on demand from `/api/workspace/explainers`. Cache via SWR or React Query.

### 9.2 Performance risks to watch

- **Atom proliferation** — Jotai is great but 50+ atoms per workspace will create re-render storms. Group related state into atoms with selectors, not 50 individual atoms.
- **SSE connection limits** — browsers cap concurrent SSE connections per origin (~6). Reuse connections across features (one connection for build progress, one for chat, NOT one per card).
- **iframe message channel** — if the preview app tries to `postMessage` back to the workspace, set up a single message handler with discriminated union schemas (Zod), not handlers per message type.

---

## Section 10 — Handoff checklist

Before any developer starts coding the workspace, these artifacts must exist:

### 10.1 Design tokens & system
- [ ] All color tokens added to `panda.config.ts` (§6.1)
- [ ] Typography text styles added (§6.2)
- [ ] Recipes added (§6.3)
- [ ] Z-index tokens defined (§6.7)
- [ ] `pnpm panda codegen` re-run, committed
- [ ] axe-core color contrast audit passes for all token combinations

### 10.2 Component skeletons (empty files in correct locations)
- [ ] All files in §5.1 created with correct (S)/(C) directives at the top
- [ ] Barrels (`index.ts`) created and exporting placeholder names
- [ ] Each shared primitive (`ModalShell`, `Drawer`, `Toast`, `ErrorSurface`, `EmptyState`, `SkeletonShimmer`, `KeyboardShortcutHint`) has a stub implementation that renders a labeled placeholder

### 10.3 Data contracts (Zod schemas, in `entities/*/types.ts`)
- [ ] `Project` schema
- [ ] `KanbanCard` schema (matches §3.1 exactly)
- [ ] `BuildRun` schema with state machine
- [ ] `TokenAccount` schema with balance + transaction history
- [ ] `Explainer` schema (key, locale, body, last_updated)
- [ ] `SandboxStatus` schema (matches Cloudflare provider response)
- [ ] All schemas exported from feature barrels for backend reuse

### 10.4 API contracts (OpenAPI or pseudo-types)
- [ ] All routes in §1.1 sketched with request + response types
- [ ] SSE event payloads typed (`CardStarted`, `CardTokenEmitted`, etc.)
- [ ] Error response shape unified across all routes (`{ error: { code, message, details? } }`)
- [ ] Provider-shaped sandbox interface specced (so we can swap CF Sandbox for another provider later)

### 10.5 Backend pre-reqs (for the orchestrator team)
- [ ] Model routing decision tree codified (matches backlog #16). **Model names stay backend-internal** — never exposed in user-facing cost surfaces (resolved Q-9).
- [ ] Token cost estimation function specced (input: card → output: `{min, max, modelInternal}`). The `modelInternal` field is for routing only; the UI reads `min/max` and runs them through the token-to-action translator (§3.7).
- [ ] Cost ceiling enforcement specced (Redis-based daily counter, EUR 2 hard cap)
- [ ] Build orchestration loop specced (queue, retries, partial failure handling)
- [ ] **Starter-deploy background job** — provisions CF sandbox + deploys starter template during Stripe webhook callback, so the workspace is populated on first entry. Triggered by `checkout.session.completed` → enqueue → Cloudflare sandbox API → write project record → signal webhook done. Target: sandbox warm within 90 seconds of payment (covers the email delivery window). **Task #3 spike confirms this is feasible: 1–2s cold start on prod amd64, 4–5ms warm reuse.** Per researcher §5 hotspot #1.
- [ ] **(Optional optimization)** **Pre-warm during paywall page load.** Per researcher pass-2 note #3: at 1–2s prod cold start + 4–5ms warm reuse, the 90-second target above is so loose it's not actually a constraint. Optional optimization: warm a sandbox during the Stripe payment-intent screen, not after payment confirmation. By the time Stripe confirms, the sandbox is already serving and the post-paywall first-screen latency drops to effectively zero. **Tradeoff:** wastes ~2–5% of compute on abandoned checkouts (the user starts payment but never confirms). The researcher and architect both judge this worth eating to pay back the most fragile UX moment in the journey. **This is a "could be better" optimization, not a "must change."** Founder call. Tracked separately from the must-have starter-deploy bullet above so the orchestrator team can ship the synchronous version first and add pre-warm as a perf pass.
- [ ] **Sandbox platform constants** (per task #3 spike findings):
  - Next.js dev server port: **3001** (port 3000 reserved by sandbox runtime). Surface as platform constant, not magic number.
  - Starter template `next.config.ts` must include `allowedDevOrigins: ['*.localhost', '*.workers.dev', '*.meldar.ai', '*.sandbox.meldar.ai']` (Next.js 16 CORS guard).
  - Wrangler dev bootstrap must run `docker pull cloudflare/proxy-everything:<tag>` before `wrangler dev` (tag binding workaround; see spike §critical-finding-2).
  - `.dockerignore` at Dockerfile build context root must exclude `node_modules`, `**/node_modules`, `.next`, `**/.next` (symlink conflict, see spike §critical-finding-3).
  - `wrangler.jsonc` assets block must set `"run_worker_first": true` (asset handler subdomain interception, see spike §critical-finding-4).
- [ ] **Build cancel endpoint** — `DELETE /api/workspace/build/[runId]` aborts the orchestrator via AbortController, rolls back in-flight cards, refunds canceled-card tokens. Per researcher §4A SH + architect §4.1 step 5.
- [ ] **Phase translation map** — orchestrator emits phase names from a fixed vocabulary; the translator layer in `features/learning-explainer/lib/phase-translator.ts` must cover every phase name the orchestrator can emit. Coordinate the vocabulary between backend + architect spec before coding begins.
- [ ] **Error code map** — orchestrator and sandbox provider errors must come from a fixed vocabulary of user-mappable codes (`SANDBOX_OOM`, `SANDBOX_TIMEOUT`, `ORCH_VALIDATION_FAILED`, etc.), not raw exception messages. Architect spec §2.7 assumes this.
- [ ] **Explainer dismissal store schema** — user profile column `dismissedExplainerKeys: string[]`. **Key-list of explicitly dismissed keys only.** Do NOT track seen-state. When a new explainer ships post-launch, returning users must see it on their next session because their key is absent from the list, not because of any "seen" flag flipping. Per researcher pass-2 note #2 and ADR #30. Stored on user profile (follows the user across devices), not localStorage.
- [ ] **Day-2 cold rehydrate target (per spike AC-1, ADR #49)** — Day-2 entry from cold DO must complete in **<5s p50, <8s p95** on prod amd64. Measured by RUM timing from session-init request to first preview iframe paint on the second-and-later sessions. **Pre-warm fallback** if the bar is missed: warm the user's DO during the email-magic-link click → workspace render window. Same code path as the §10.5 paywall pre-warm bullet but triggered by magic-link click instead of Stripe checkout.
- [ ] **Multi-user concurrency load test (per spike AC-2, ADR #51)** — before any public launch traffic, run a 50-concurrent-user load test against the staging worker. Spawn 50 simultaneous `fetch()` calls with different project IDs, record p50/p95/p99 cold-start latency, assert per-project DO isolation (no state leakage between sandboxes), check whether Cloudflare Containers concurrency caps are hit. Spike estimates ~1 hour of work and is the cheapest single de-risk for the public launch window. Owner: orchestrator team.

### 10.6 Content / copy
- [ ] Explainer copy seed (20-30 entries for Reddit Scanner use case) — backlog #29
- [ ] **Token-to-action translator copy** for the four token bands (1–2, 3–5, 6–15, 16+) per §3.7 (collapsed from 7 per ADR #43)
- [ ] **Share-link visibility warning copy** — single-line, must appear on every share-link surface listed in §4.8. Default copy: "Anyone with this link can view your preview. Don't share secrets." Founder may revise wording but the constraint is non-negotiable per spike AC-3 + ADR #50.
- [ ] **Phase translation copy** for every build phase name (see §4.1 step 4, §10.5 bullet 6)
- [ ] **Error code copy** for every orchestrator/sandbox error code (see §10.5 final bullet)
- [ ] Empty state copy for all 5 empty surfaces (§2.8)
- [ ] Error state copy for all 7 error surfaces (§2.7)
- [ ] Loading state copy for cold-start (§2.6) AND for first-entry progress narrative (§2.6)
- [ ] Modal copy templates (Build confirm, Approval, Done-for-me, Rollback, Token paywall)
- [ ] Day-2 return-state overlay copy templates (§4.10)

### 10.7 Cross-deliverable cross-references
- [x] Researcher findings (`ux-researcher-findings.md`) reviewed and any conflicts resolved (this revision pass)
- [x] Cloudflare Sandbox SDK spike outcome reviewed (`spikes/cloudflare-sandbox/README.md`); provider interface confirmed viable. Spike proved: Next.js 16 + RSC streaming runs inside the container, iframe embedding works with no `X-Frame-Options`/`CSP` blockers, HMR round-trip from `writeFile()` to iframe visible change is ~1–2s. Platform constants baked into §10.5 above.
- [ ] Backend orchestrator spike outcome reviewed; SSE event shape confirmed

### 10.8 Test fixtures
- [ ] Mock project with 12 cards across 2 drops, all states represented (for visual testing)
- [ ] Mock build run with mid-stream and completed states (for SSE testing)
- [ ] Mock token account with debit history (for animation testing)
- [ ] Playwright E2E test plan covering: enter workspace → edit card → mark ready → build → see preview update → rollback (per backlog launch checklist)

---

## Section 11 — Open questions

Updated 2026-04-06 after cross-reference with `ux-researcher-findings.md`. Resolved items marked with ✓.

| ID | Question | Owner | Blocking | Status |
|---|---|---|---|---|
| Q-1 | Do users actually return on mobile after starting on desktop? | researcher | no | ✓ **Resolved: yes, for show-off + referral-check only.** Per researcher §8 directive #5. Mobile layout flipped to preview-top, kanban-accordion-below. See §2.3. |
| Q-2 | Kanban grouped by Drop vs. Status columns? | researcher | yes | ✓ **Resolved: Drop.** Confirmed by researcher §8 directive #1. Grouping by Drop reinforces Pillar 4 (roadmap+milestones) and matches Katya's "what am I shipping next" mental model. Per-card status pill carries the state info without fragmenting visual hierarchy. |
| Q-3 | Chat panel placement — tab vs. bottom-collapsible? | researcher | no | ✓ **Resolved: bottom-collapsible.** Per researcher §8 Q-3 + pass-2 closeout. A tab makes chat equivalent to kanban, which implies users must choose — doubles cognitive load. Bottom-collapsible keeps chat as an occasional escape hatch, which is what it should be. The kanban IS the product; chat is for things that don't fit in a card. |
| Q-4 | Build failure: last-good vs. diff preview? | founder | no | ✓ **Resolved: last-good, full stop.** Per researcher §8 Q-4 + pass-2 closeout. Diff preview adds engineer-mental-model surface area at the worst possible moment. Showing the last working state preserves the trust signal "your app didn't break, this build did." See §2.7 + §4.1 step 7. |
| Q-5 | Lock-to-URL default on or off? | researcher | no | ✓ **Resolved: default ON, with visual prominence.** Per researcher §8 directive #4. Lock state rendered as a styled pill, not a subtle icon toggle. Deliberate unlock fires a toast ("Preview will follow builds"). See §4.8. |
| Q-6 | Token debit animation granularity? | founder | no | ✓ **Resolved: every digit, smooth via rAF, ≤800ms cap on large debits.** Per researcher §8 Q-6 + pass-2 closeout. Tabular-nums on the balance prevents jitter (ADR #9). Cap prevents the animation from feeling sluggish on large multi-card builds. |
| Q-7 | Explainer suppression on dismiss? | researcher | yes (conceptual) | ✓ **Resolved: TWO surfaces, different rules.** Per researcher §8 directive #7. Static card-level explainers = dismiss-per-key-per-user, show once then suppress. Dynamic build-completion receipts = fire every time, never suppressed. Previous spec conflated them. Split into §3.6.1 and §3.6.2. Affected §4.1 step 6. |
| Q-8 | Card editing modal vs. inline expansion? | researcher | yes | ✓ **Resolved: modal-first, with title-double-click inline exception.** Per researcher §8 directive #2. Title rename is inline (high-frequency, low-stakes); everything else is modal. See §4.2 updated. |
| Q-9 | Show model name or friendly label on cost? | founder | no | ✓ **Resolved: outcome-framed descriptors only.** Per researcher §8 minor tweak. Not "fast/medium/heavy" (intermediate revision) and not Sonnet/Opus/Haiku (original). Spec now uses outcome phrases: "quick change", "build a section", "heavy feature". See §3.7 and updated §3.3 wireframes. |
| Q-10 | Zoomer-style label for "Drop"? | founder | no | ✓ **Researcher recommends scope cut.** Per §9 recommended cuts, ship **Recipe-only** for MVP. Drop picker deferred. Updated in §12 ADR. |
| Q-11 | Chat: conversational + build-commentary or just one? | founder + researcher | yes (founder ack) | ✓ **Resolved: BOTH, coexisting vertically in one panel.** Per researcher §8 directive #3. Commentary always-on (passive log), active "Ask Meldar" input docked at bottom. Flagged for founder ack because it affects scope. Fallback if cut: commentary-only (log is non-negotiable per §5 hotspot #2). See §4.11 (new). |
| Q-12 | Can users delete a built card and its code? | founder | no | ✓ **Resolved: yes.** Researcher §4B MH lists "Delete card" as Must-have without state restriction. Spec allows delete from any state including `built`. |

### New open questions from researcher §6 (not yet resolved)

| ID | Question | Owner | Blocking |
|---|---|---|---|
| Q-R1 | Does Katya understand "kanban" without prior exposure? | researcher (user testing needed) | no |
| Q-R2 | Vocabulary: "app" vs "site" vs "page" vs "tool"? | researcher | no |
| Q-R3 | What's the actual tolerance for Build latency (30/60/90/120s test)? | researcher + eng | yes — affects streaming cadence |
| Q-R4 | Does the iframe-in-iframe feel like a scam to non-technical users? | researcher (think-aloud needed) | no |
| Q-R5 | Does the X-Ray step hurt or help conversion? | researcher (AB test needed) | no |

---

## Section 12 — Architecture decisions log (for future maintainers)

These are decisions that look arbitrary but have a reason. Documented so they don't get reverted in a future refactor.

1. **Bottom-bar Build button, not top-bar.** Eye lives in the kanban + preview region. Closest peripheral position wins. Top bar is for orientation, bottom bar for action.

2. **Modal-first card editing, not inline.** Inline edit creates "am I editing? did I save?" anxiety in non-technical users. Explicit modal is clearer even though it's more clicks.

3. **Server shell + client surface pattern, not full-client widgets.** Lets us load project data at the edge and stream. Avoids the workspace becoming a SPA inside an RSC app.

4. **One unified `ModalShell` primitive, not per-feature modals.** Focus management bugs are common and high-impact (a11y). One primitive = one place to fix.

5. **Iframe never unmounts.** Unmount = lost scroll, lost URL state, lost user context. Worth the lifecycle complexity.

6. **Explainer copy is database-driven.** Lets non-engineers (founder) edit copy without deploys. Honors backlog #29's "stored as data, not hardcoded."

7. **SSE everywhere, not WebSockets.** SSE works on edge runtimes, has simpler reconnection semantics, and we never need bidirectional streams.

8. **Z-index as named tokens, not raw numbers.** Prevents arms race. Documented stacking context.

9. **`tabular-nums` on the token balance.** Without it, the debit animation jitters as digit widths change. Looks broken.

10. **Card grouping by Drop, not by Status (kanban-classic).** The user's mental model is "what ships next," not "what's in progress." Drops match the roadmap structure 1:1. (Pending Q-2 confirmation from researcher.)

11. **Kanban virtualization deferred.** <200 cards in MVP. Full DOM is faster than virtual scroll for that range, especially for keyboard navigation.

12. **Optimistic UI as default.** Non-technical users notice 200ms delays as "broken." Optimism with reconciliation is the only way to feel snappy on slow networks.

13. **Drag handle is explicit, not "the whole row is draggable."** Whole-row drag misfires constantly. An explicit handle prevents accidental moves while clicking.

14. **Token costs shown in 3 places** (card, kanban header, Build button). Users underestimate their spend; redundancy creates calibration.

15. **Failed cards refund their tokens automatically.** Trust signal. Cheaper than handling support tickets about "I was charged for a broken build."

### Revisions added 2026-04-06 after researcher findings cross-reference

16. **Onboarding moves BEFORE the paywall.** Originally placed after Stripe checkout. Researcher §5 hotspot #8 identified "onboarding style picker after payment" as a medium-high severity drop-off. Moving it forward also gives us the data to personalize the pre-paywall preview card (the single biggest conversion lever per researcher §10 #1).

17. **Starter app must be deployed BEFORE first workspace entry.** Researcher §5 hotspot #1 identifies "post-paywall first-screen intimidation" as the highest-severity drop-off. A background `starter-deploy` job runs during the Stripe webhook so the preview iframe is live and the kanban is populated when the user lands. No empty state ever on first entry.

18. **1280px is the critical floor, not 1024px.** Researcher §4A + §8 #1 pin the primary persona (Katya) to a 13" MacBook. Split-screen must feel spacious at 1280px, not merely functional. `lg` (1024–1279) is a bonus tier.

19. **Phase translation layer is mandatory, not optional.** Build progress events from the orchestrator pass through a translation map before being shown to the user. Raw phase names are never displayed. This is a backend + frontend coordination requirement, not a frontend polish item. Per researcher §5 hotspot #2 and §8 #2.

20. **Token-to-action translator is the highest-leverage UX writing in the MVP.** Per researcher §10 #2. Every token count display must be accompanied by a plain-English translation. The translator is data-driven and applies to debits AND balances. "475 tokens remaining" becomes "still enough for ~10 more changes this month."

21. **QR code for preview-on-phone is a must-have, not a nice-to-have.** Per researcher §4A + §8 #6. It turns "I built something" into "I can show this to anyone right now" — the single most important viral affordance. Requires starter templates to be mobile-responsive out of the box.

22. **Day-2 return state is a distinct component surface, not a workspace state.** Per researcher §4J + §5 #5 + §8 #3. Shown as a non-blocking overlay card on first session-entry after the initial visit. Implemented as its own `workspace-return-state` feature.

23. **Build cancel / pause is in scope.** Originally omitted. Researcher §4A SH flags it as user-need. Without it, an accidental Build click on a 50-token build destroys trust. Added to §4.1 step 5.

24. **"Suggest a card from blank" (Haiku-powered) is in scope.** Originally not specced. Researcher §4B SH flags it as removing the blank-page problem. Added as §4.2.1. Uses Haiku for cost and ships with Zod validation per AGENTS.md.

25. **Done-for-me appears in failed-build error cards, NOT on the paywall.** Per researcher §4I + §5 #7 — putting Done-for-me on the paywall cannibalizes the Builder tier. Keeping it in the error surface means it appears exactly when the user is most stuck and most willing to pay for rescue.

26. **Show friendly model labels, not Sonnet/Opus/Haiku.** Resolved Q-9. Technical model names are the same category of noise the token-to-action translator is trying to eliminate. Spec now uses "fast / medium / heavy" tier labels chosen by the translator layer.

27. **Ship Recipe-only for MVP (no Drop terminology).** Resolved Q-10 via researcher §9 scope cut recommendation. Saves a decision, a code path, and a testing burden. Drop can ship as a second onboarding style in week 2.

28. **Delete card is allowed from any state, including `built`.** Resolved Q-12. Researcher §4B MH lists delete without state restriction.

### Revisions added 2026-04-06 (pass 2) after researcher §8 second-round directives + task #3 spike results

29. **Inline title rename is allowed (double-click title only); all other card edits stay modal.** Refinement of ADR #2. Researcher §8 directive #2 flags title-rename as high-frequency / low-stakes, justifying a narrow inline exception that doesn't break the "am I editing?" clarity for substantive fields. See §4.2 amendment. `F2` added as keyboard shortcut equivalent.

30. **Static explainers (show-once-per-key) and dynamic build receipts (always-fire) are two distinct surfaces.** Resolved Q-7. Original spec conflated them. Researcher §8 directive #7 split the concepts: dismiss-per-key suppression applies only to pre-authored card-level explainers (§3.6.1). Post-build "What just happened?" receipts (§3.6.2) are event logs that fire on every build_complete. Also affects §4.1 step 6.

   **Data schema constraint (researcher pass-2 note #2):** the dismissal store on the user profile MUST be `dismissedExplainerKeys: string[]` — a key-list of *explicitly dismissed* keys only. It must NOT track "seen-but-not-dismissed" or "seen-and-dismissed" as separate states. Reason: when a NEW explainer ships post-launch with a key the user has never seen, returning users must see it on their next session. If the schema tracks "seen" at all, returning users get tutorials on features that already shipped while they were away — exactly the wrong outcome. Backend pre-req added to §10.5.

31. **Orchestrator chat = commentary always-on + "Ask Meldar" input coexisting vertically in one panel.** Resolved Q-11. Researcher §8 directive #3. Not a mode switch, not separate tabs — two layers in one panel, with the active input docked at the bottom and disabled during active Build streams. Fallback if scoped out: commentary-only (log is non-negotiable per §5 hotspot #2, input can defer to Phase 2). See new §4.11. Flagged as founder-blocking scope decision. `orchestrator-chat` feature gets a second atoms file (`commentary-atoms.ts`) to separate passive-log state from conversational-turn state.

32. **Lock-to-URL is default-ON, visually prominent (styled pill), with a toast on deliberate unlock.** Resolved Q-5. Researcher §8 directive #4. "Visually prominent" is an explicit requirement, not a polish item — hiding the lock state is how users lose navigation context without knowing why.

33. **Mobile surface is a show-off + referral-check surface, not a workspace.** Resolved Q-1. Researcher §8 directive #5 confirms users DO return on mobile, but only to share the preview URL with a prospect or check referral clicks. Layout flipped: preview full-width top, kanban-accordion-below. No editing surfaces. See §2.3 rewrite.

34. **Outcome-framed token translator descriptors — not model names, not tier labels like "fast/medium/heavy".** Second refinement of Q-9. Researcher §8 minor tweak. Phrases: "quick tweak" / "quick change" / "build a section" / "build a full feature" / "heavy feature" / "large build" / "major build". Updated table in §3.7 and wireframes in §3.3.

35. **`ShareCertificateModal` is renamed `ShareCelebrationOverlay` and fires at ≤300ms, not 1.5s.** Researcher §8 minor tweak: "modal" framing was wrong — this is a celebration, not a dialog. Non-blocking overlay pattern, no focus trap, no Esc-to-dismiss scrim. Single "Nice" acknowledgement button + "Share this" affordance. Updated file tree accordingly.

36. **Drop headers show time-to-ship as the primary number, tokens as secondary (tooltip).** Researcher §8 minor tweak: time is more legible to Katya than tokens. Time is computed by the token-to-action translator from the token total, not by a separate system. Tokens return to primary only if the user opts in via project settings.

37. **"No cards on board" empty state should never happen.** Template always pre-fills. If user deletes every card, show "Reset to template?" card, not a blank-board prompt. Researcher §8 minor tweak. §2.8 updated.

38. **Cmd+Z in workspace scope opens `RollbackConfirmModal` pre-targeted at the most recent build.** Pairs with §4.7 per-build rollback. Researcher §8 minor tweak. Never auto-rolls-back — always requires confirmation. Added to §4.9 shortcut table.

39. **Loading copy does not commit to a timing promise.** Researcher §8 flagged "usually 2-4 seconds" as over-promise. Task #3 spike confirmed the concern: prod amd64 cold start is 1–2s but dev Apple Silicon is ~6.8s, and real production latency varies. Copy is now "Spinning up your app…" with no number. Timing tables in §9 use spike-measured values as ceilings.

40. **Error copy tone correction: no "hiccup", no "slow to wake up".** Researcher §8 minor tweak. "Hiccup" is infantilizing. New copy: "Your app couldn't start. Let's try again." / "Still warming up — usually takes a few seconds more." Updated §2.7.

41. **Task #3 spike results baked into backend pre-reqs (§10.5).** Sandbox platform constants are now mandatory pre-reqs for the orchestrator team: port 3001, `allowedDevOrigins` in starter template `next.config.ts`, `.dockerignore` rules, `run_worker_first: true` in `wrangler.jsonc`, and the `proxy-everything` tag pull workaround. Without these, any fresh dev environment will waste hours re-discovering the spike's critical findings.

42. **Skip-the-discovery is a button on `/start`, not a separate `/start-fast` route.** Per researcher follow-up. A separate route would split the funnel surface for marketing/analytics, double the landing-to-workspace measurement burden, and force a decision at the URL level before Katya has seen the product. A skip affordance inside `/start` keeps a single funnel, preserves discovery as the default for the subset of users who need it (Daria), and lets Katya bypass it without losing her place. Skip lands on `/onboarding/use-case` (MVP: pre-filled with the only available use case). Copy: "I know what I want to build →" — no "skip" framing. B2B `/teams` entry for Jari is a separate decision (decision #4 in `meldar-v3-decisions-needed.md`) and does not conflict with single-`/start` for B2C.

### Revisions added 2026-04-06 (pass 4) after researcher pass-2 closeout

43. **Token cost descriptors collapsed from 7 tiers to 4.** Refinement of ADR #34. Per researcher pass-2 note #1. Seven tiers had near-synonyms ("full feature" vs "heavy feature", "large build" vs "major build") that reintroduced the cognitive load that killing model names was supposed to remove. Four tiers ("quick tweak / design change / build a section / heavy feature") map to the underlying token-band routing (Haiku / Sonnet / Sonnet / Opus-or-routed-Sonnet) and are intuitively orderable without effort. Founder copy review still needed against backlog #29. Updated §3.7 table.

44. **Chat panel is bottom-collapsible, not a tab.** Resolved Q-3. Per researcher pass-2 closeout. A tab makes chat equivalent to kanban, which implies users must choose between two surfaces — exactly the cognitive load we're trying to remove. Bottom-collapsible keeps chat as an occasional escape hatch, which is what it should be. The kanban IS the product; chat is for things that don't fit in a card.

45. **Build failure shows last-good preview, not diff preview.** Resolved Q-4. Per researcher pass-2 closeout. Diff preview adds engineer-mental-model surface area at the worst possible moment (the moment the user is most anxious about whether their app is broken). Showing the last working state preserves the trust signal "your app didn't break, this build did." Already specced in §2.7 + §4.1 step 7; this ADR locks it in.

46. **Token debit animation: every digit, rAF-smooth, ≤800ms cap.** Resolved Q-6. Per researcher pass-2 closeout. Every digit ticking down (not jump cuts) makes the spend feel real and weighted. rAF smoothing prevents jitter. The 800ms cap prevents the animation from feeling sluggish on large multi-card debits. Pairs with ADR #9 (`tabular-nums` on the token balance to prevent digit-width jitter).

47. **Pre-warm sandbox during paywall page load — optional perf optimization.** Per researcher pass-2 note #3 + spike README "bonus" cross-check. Cloudflare spike's 1–2s prod cold start makes the 90-second post-payment target trivially achievable, which unlocks an optimization: warm a sandbox during the Stripe payment-intent screen (not after confirmation). By the time Stripe confirms, the sandbox is already serving and the post-paywall first-screen latency drops to effectively zero. The spike's UX cross-check **extends this with a compounding step:** the Stripe Checkout → `/thank-you` redirect window is an additional 3–5 seconds of staring-at-loading-screen time; if the redirect page also issues a fire-and-forget warm call, the combined window is ~10–30 seconds and fully absorbs even the worst-case cold boot. Tradeoff: ~2–5% wasted compute on abandoned checkouts. Researcher, architect, and spike author all judge this worth eating to pay back the most fragile UX moment in the journey. **Sprint-1 implementation requirement (so the optimization is actually possible):** the `SandboxProvider` adapter must expose a `prewarm(projectId)` method *separate* from `create()` / `getPreviewUrl()` so the Stripe webhook handler and the redirect page can trigger it fire-and-forget without blocking the webhook response. **This is "could be better," not "must change."** Founder call. Tracked as a separate §10.5 line item below the must-have starter-deploy bullet so the orchestrator team can ship the synchronous version first and add pre-warm as a later perf pass.

48. **Explainer dismissal store schema is `dismissedExplainerKeys: string[]`, key-list of explicitly-dismissed only.** Refinement of ADR #30. Per researcher pass-2 note #2. The store must NOT track "seen-but-not-dismissed" or any "seen" state at all. Reason: when a NEW explainer ships post-launch with a key the user has never seen, returning users must see it on their next session because their key is absent from the dismissed list — not because of any "seen" flag flipping. Otherwise we end up showing returning users tutorials on features that already shipped while they were away. Backend pre-req in §10.5.

### Revisions added 2026-04-06 (pass 4 continued) after spike README acceptance criteria added

49. **Day-2 cold rehydrate is a distinct latency budget from same-session warm reuse — and the `ReturnStateOverlay` is the absorber.** Per spike README AC-1. The 4–5ms warm-reuse number from the spike is for an already-running sandbox in the same session. Day-2 entry hits a cold DO + cold container + source restore from Postgres/R2 + Next.js recompile, projected at **6–15 seconds**. Sprint 1 acceptance: <5s p50, <8s p95 prod amd64. UX implication that touches this spec, not just backend: the `ReturnStateOverlay` (§4.10) MUST be designed to absorb the rehydrate window — overlay timing follows sandbox readiness, not a fixed 3-second timer; if rehydrate exceeds 5s, the overlay shows a contextual progress narration in its lower band ("Getting your Ship #1 ready…" → "Compiling your code…" → "Almost there…"). Mitigation if Sprint 1 misses the bar: pre-warm the user's DO during the email-magic-link click → workspace render window, same code path as ADR #47 but triggered by magic-link click. Backend pre-req in §10.5.

50. **Share-link visibility warning is P0 on every share-link surface — preview URLs are public-by-default for MVP.** Per spike README AC-3. The Cloudflare Sandbox SDK preview URLs are unguessable (nanoid-based) but not authenticated — anyone with the URL sees the user's work-in-progress. The MVP solution is the warning copy, not real auth (real auth is Sprint 2+). The constraint is non-negotiable: every surface that exposes a share-link must include the warning, never hidden, never on hover-only. Surfaces enumerated in §4.8. Founder may revise the exact wording (default: "Anyone with this link can view your preview. Don't share secrets.") but cannot opt out of having a warning. This is the only thing standing between Katya tweeting her preview URL and Katya accidentally publishing a half-finished payment form.

51. **50-concurrent-user load test is a launch criterion, not a polish item.** Per spike README AC-2. The spike used a single hardcoded sandbox ID and never exercised per-user DO IDs under contention. A small Node script that spawns 50 simultaneous `fetch()` calls with different project IDs against staging, records p50/p95/p99 cold-start latency, and asserts per-project DO isolation is the cheapest single de-risk for the public launch window — ~1 hour of work, prevents the "TikTok lands and 200 users hit the workspace simultaneously" failure mode. Owner: orchestrator team. Tracked in §10.5 as a backend pre-req. Without this test passing, no public launch traffic.

---

**End of UX Architect spec.**

This document is intended to be reviewed alongside `ux-researcher-findings.md`. Any conflicts resolve in favor of researcher findings about *what users need*, and in favor of this document about *how to structure the implementation*.

**Revision history:**
- 2026-04-06 (initial): 12 sections, 10 open questions.
- 2026-04-06 (revision pass 1): cross-referenced with researcher findings; added 13 ADRs (#16–#28), 2 new features (workspace-return-state, preview-qr), starter-deploy backend pre-req, phase translation layer, token-to-action translator, cancel-build flow, suggest-card-from-blank interaction, Day-2 return-state overlay, 1280px responsive floor reinforcement, and moved onboarding pre-paywall. Resolved 6 open questions (Q-2, Q-8, Q-9, Q-10, Q-12 via researcher doc).
- 2026-04-06 (revision pass 2): incorporated researcher §8 second-round directives (7 of 7 flagged items resolved) + task #3 Cloudflare Sandbox SDK spike results. Added ADRs #29–#41. Resolved 4 more open questions (Q-1, Q-5, Q-7, Q-11). Added new §3.6.1, §3.6.2, §3.6.3, §4.11. Rewrote §2.3, §3.5, §3.6, §3.7, §4.1 step 6, §4.2, §4.8, §4.9. Renamed `ShareCertificateModal` → `ShareCelebrationOverlay` in §1.2 and §5.1. `orchestrator-chat` feature file tree split into `chat-atoms.ts` + `commentary-atoms.ts`. Task #3 spike constants baked into §10.5 and §9 perf table. Only Q-3, Q-4, Q-6 and the 5 new research questions (Q-R1–Q-R5) remain open.
- 2026-04-06 (revision pass 3): researcher confirmed all 4 design assumptions (Day-2 overlay, 42/58 split, bottom-collapsible chat, mobile read-only) — no design changes needed. Added skip-discovery routing (button on `/start`, not `/start-fast`) per researcher follow-up. Updated §1.1 sitemap, §1.4 funnel diagram + narrative, removed `/onboarding/style` step from sitemap (Recipe-only MVP). Added ADR #42.
- 2026-04-06 (revision pass 4): incorporated researcher pass-2 closeout (cost translator collapsed 7→4 tiers, dismissal schema constraint, pre-warm during paywall) and resolved Q-3 / Q-4 / Q-6. Added ADRs #43–#48. Then folded in spike README's three new acceptance criteria (AC-1 Day-2 cold rehydrate, AC-2 50-user load test, AC-3 share-link warning) plus the spike's bonus pre-warm-during-Stripe-redirect framing into ADR #47. Added ADRs #49–#51, expanded §4.10 with cold-rehydrate timing + overlay-absorbs-window behavior, expanded §4.8 with mandatory share-link warning surfaces, updated §10.5 with Day-2 cold rehydrate target + 50-user load test pre-reqs, updated §10.6 with share-link warning copy + collapsed token band copy, fixed stale 7-tier reference in §10.6. Spec is now in sync with both researcher findings and the spike report.
