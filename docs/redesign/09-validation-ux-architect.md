# UX Architect — Implementation Validation

*Validating the actual code against `02-ux-architecture.md`. Read-only audit, no code changes made.*

## Implementation Fidelity Score: 6 / 10

The skeleton matches the vision. The top bar, overflow menu, auto-build trigger, single-page workspace, and deletion of the worst offenders (TaskListPane, ArtifactPane, WorkspaceNav, WorkspaceBottomBar, OnboardingChat, WorkspaceEmptyState, StepIndicator) are done correctly. But the BUILDING state, the personalization UX, the FeedbackBar simplification, the admin-into-workspace collapse, and the state-machine cleanup are all still missing or diverge significantly. The user will still see "Writing BookingForm.tsx" on arrival and a dead-end "Describe what you want to build" screen on failure — the exact two trust-killers the spec was built to eliminate.

---

## What matches the spec (keep)

### Architecture shell
- `apps/web/src/widgets/workspace/WorkspaceShell.tsx:38-57` — correct 3-slot structure: TopBar + body + FeedbackBar + FirstBuildCelebration. No TaskListPane. No ArtifactPane. No Nav tabs.
- `apps/web/src/widgets/workspace/WorkspaceTopBar.tsx:12-49` — reduced to logo + project name + overflow trigger. Matches Section 3 top bar spec exactly.
- `apps/web/src/widgets/workspace/OverflowMenu.tsx:36-117` — correct menu with conditional "My site", Manage bookings, Settings, All projects. Click-outside + Escape close handlers present. Matches Section 3 + Section 8 wireframe.
- Admin route consolidation: `apps/web/src/app/(authed)/workspace/[projectId]/admin/layout.tsx` exists as a minimal shell around bookings/settings pages, accessible only via OverflowMenu. Partial match for Section 9.

### Deletions (10 of 11 components)
Confirmed via `Glob /apps/web/src/widgets/workspace/*.tsx` + grep — these files no longer exist:
- `TaskListPane.tsx`, `ArtifactPane.tsx`, `WorkspaceNav.tsx`, `WorkspaceBottomBar.tsx`, `OnboardingChat.tsx`, `WorkspaceEmptyState.tsx`, `StepIndicator.tsx`.
- No dead imports to these in `widgets/workspace/index.ts`.

### Auto-build trigger
- `WorkspaceShell.tsx:73-82` — guards (`autoBuildStartedRef`, `previewUrl`, `activeBuildCardId`, `cards.length`, `hasReadyWork`) correctly prevent double-start, re-start after success, and start before cards load. This is solid.

### Onboarding → auto-build handoff
- `apps/web/src/features/onboarding/ui/OnboardingFunnel.tsx:52-86` — on confirm, POSTs `/api/onboarding`, then `router.push(/workspace/${projectId})`. Workspace-load effect kicks off auto-build. Net effect matches spec intent: user arrives to building state without manual prompting.

### State machine has clean dead-ends
- `apps/web/src/features/onboarding/model/funnel-machine.ts:6-83` — pure reducer, discriminated-union state, no impossible transitions; `back`, `submitDoorA`, `selectExample`, `submitFreeform`, `confirm`, `success`, `failure` are all exhaustively handled.

---

## What diverges from the spec (with justification analysis)

### 1. Onboarding flow is 3-door, not Step 1 → Step 2 (Spec Section 2, 8)

**Spec says:** Step 1 picks vertical → Step 2 "Let's set it up" with inline-editable services, durations, prices, hours → confirm.

**Actual:** `DoorPicker` → (A: vertical grid + business name + website URL) OR (B: example gallery) OR (C: freeform textarea) → `ProposalPreview` (read-only).

**Divergence severity: HIGH.** This is the core UX vision of the document. The spec was explicit: "Structured form fields with smart defaults, not a free-text proposal card. No separate 'plan review' step — the personalization form IS the proposal." The current implementation inverts this: the proposal IS a review step, NOT a form. Users cannot edit service name, duration, price, or hours inline. The only way to "change" anything is to go back to DoorA and restart.

**Additionally:** The spec never mentions Door B (examples) or Door C (freeform). Door C explicitly violates the "no prompts, no free text" directive of Section 4: "No more 'Tell me what you want to build.' No more `WorkspaceEmptyState`." Door C recreates that exact pattern in the onboarding.

**Is the divergence justified?** Only partially. The 3-door frame may map to different user confidence levels, but it's a new concept not discussed in the spec and contradicts the spec's core principle. **Not justified as implemented.** At minimum, ProposalPreview must become editable (per Section 8 wireframe), and Door C should be deleted or converted to "I can't find my business type" fallback.

### 2. BUILDING-state language is developer-facing (Spec Section 5, P9)

**Spec says:** "Setting up your booking page" + numbered step list ("Your 3 services", "The booking calendar") + "Adding the booking calendar...". Never show file names. Never say "code", "writing", "file".

**Actual:** `apps/web/src/widgets/workspace/PreviewPane.tsx:87-104` renders:
```
"Writing code…"
"Writing {latestFile.path.split('/').pop()}…"  // e.g. "Writing BookingForm.tsx..."
"Thinking…"
"Meldar is planning your page."
```

**Divergence severity: CRITICAL.** This is the single most-called-out anti-pattern in the entire spec (P9, Section 5 "Language rules for BUILDING state"). The user sees `Writing BookingForm.tsx...` on their first workspace arrival — exactly the Lovable/Replit clone experience the spec was designed to kill.

**Is the divergence justified?** No. There is no `BuildProgressView` component (Section 10 calls for one). There is no `userFacingLabel` field on `card_started` events (Section 5 explicitly lists this). The BUILDING UI is ad-hoc empty-state copy inside PreviewPane instead of a dedicated state renderer.

### 3. Failure recovery falls back to "Describe what you want to build" (Spec Section 2, 10)

**Spec says:** "Never fall back to 'Describe what you want to build.'" If auto-build fails or never started, show "Resume setup" / "Try again" single-button recovery.

**Actual:** `PreviewPane.tsx:123-136`:
```tsx
<Text textStyle="primary.sm" color="onSurface">
  Describe what you want to build
</Text>
<Text ...>Try "create a booking page for a hair salon with 3 services"...</Text>
```

This is shown when `!isBuilding && !isDeploying && !safeUrl` — i.e. whenever auto-build has failed, never started, or the user returns to a workspace with a stale/missing preview. The toast error from `runAutoBuild` fires (WorkspaceShell.tsx:123), but the empty state remains a prompt-first canvas. The FeedbackBar with "Click any element above" is pinned at the bottom with no element above to click.

**Divergence severity: CRITICAL.** This is literally the "trust-killing moment" the spec opens with (P0-2, P0-3).

**Is the divergence justified?** No. The WorkspaceShell has `failureMessage` in context but doesn't render a recovery state. PreviewPane ignores `failureMessage` for its empty state copy (it's passed only to `BuildStatusOverlay`).

### 4. FeedbackBar is not simplified (Spec Section 7)

**Spec says:** Remove Paperclip, reference URL/image fields, Stitch suggestion, 5-word minimum.

**Actual:** `apps/web/src/features/visual-feedback/ui/FeedbackBar.tsx` — all four items are still present:
- Paperclip button at `:193-212`
- Reference URL + image fields at `:264-311`
- Stitch keyword suggestion at `:133, 152-166`
- 5-word minimum gate at `:36, :93-97`

**Divergence severity: MEDIUM.** Not trust-killing, but directly contradicts four explicit Section 7 bullet points. The component has grown features instead of shrinking.

**Is the divergence justified?** No explanation visible. These were explicit spec requirements with rationales (the 5-word gate "violates" short-command UX per Research P2-3; the Stitch suggestion "contradicts 'we handle everything for you' positioning" per Research P2-4).

### 5. Admin routes not collapsed into workspace (Spec Section 2, 9)

**Spec says:** "The `/workspace/[projectId]/admin` and `/workspace/[projectId]/admin/settings` routes are deleted. Their functionality moves to an on-demand panel within the workspace, accessed via overflow menu."

**Actual:** Both routes still exist as separate pages (`apps/web/src/app/(authed)/workspace/[projectId]/admin/page.tsx` and `admin/settings/page.tsx`). `OverflowMenu.tsx:87-104` links to them via `Link href={...}` — taking the user OUT of the workspace.

**Divergence severity: MEDIUM.** This violates the single-page-workspace principle (Section 2) and recreates tab-like navigation in a different form. The admin layout (`admin/layout.tsx:37-49`) even re-introduces mini tabs ("Bookings", "Settings") — a miniature version of the deleted `WorkspaceNav`.

**Is the divergence justified?** Pragmatically yes for MVP — an inline slide-over panel is more work than keeping the existing routes. Spec Section 11 does put this in Phase 3. But the admin layout's inner mini-tabs are pure drift and should be removed now (just link from OverflowMenu directly to either page, no intermediate tab nav).

### 6. `/workspace` dashboard page still shows streak + NewProjectButton + ContinueBanner (Spec Section 9)

**Spec says:** Delete `StreakBadge`, `NewProjectButton`, `ContinueBanner`. "Multi-project support. Premature for MVP. One project per user initially."

**Actual:** `apps/web/src/app/(authed)/workspace/page.tsx:91, :111, :115-119, :133` — all three still present and active. `NewProjectButton.tsx` and `ContinueBanner.tsx` files still exist in `widgets/workspace/`.

**Divergence severity: LOW.** The `/workspace` root is a project selector for users with >1 project; single-project users hit a redirect to onboarding or go direct to `/workspace/[projectId]` from elsewhere. Streak/continue banner is noise but not on the critical path.

**Is the divergence justified?** Partially. Until multi-project support is truly deleted from the data model, the selector page needs something. But `StreakBadge` and `ContinueBanner` are pure deletions with no blocker — they should go.

### 7. WorkspaceMode type not simplified (Spec Section 10)

**Spec says:**
```typescript
type WorkspaceMode = { type: 'building' } | { type: 'live' } | { type: 'managing' }
```
With `selectedTaskId`, `chatOpen`, `openChat`, `closeChat`, `selectTask`, `clearSelection` deleted.

**Actual:** `apps/web/src/features/workspace/context.tsx:29-33`:
```typescript
export type WorkspaceMode =
  | { readonly type: 'plan' }
  | { readonly type: 'taskFocus'; readonly taskId: string }
  | { readonly type: 'building'; readonly taskId: string }
  | { readonly type: 'review'; readonly taskId: string; readonly receipt: BuildReceipt }
```

`selectedTaskId`, `chatOpen`, all UI actions (`ui/selectTask`, `ui/clearSelection`, `ui/openChat`, `ui/closeChat`), `selectTask`, `clearSelection`, `openChat`, `closeChat`, and `deriveWorkspaceMode` are all still present (context.tsx:29-156, 297-299, 347-354). None are consumed by `WorkspaceShell` or any other file that imports from `@/features/workspace`.

**Divergence severity: MEDIUM.** This is dead code rot. No UI consumes these modes or methods. But they're public API (exported via `index.ts`) and reachable. They contradict the CLAUDE.md "Stop writing historical/defensive comments. Zero comments by default; /clean-code means TRIM" rule and the no-real-users-so-rip-and-replace directive.

**Is the divergence justified?** No. These should be deleted per spec Section 10.

---

## Architectural issues found in the code

### A. Auto-build mid-load failure = blank canvas
`WorkspaceShell.tsx:73-82` fires auto-build only when `cards.length > 0` AND `hasReadyWork`. If the onboarding `/api/onboarding` POST succeeds but fails to produce cards (race with `getKanbanCards` on the server fetch at `page.tsx:81`), the effect won't trigger — and nothing tells the user why. The user sees the PreviewPane empty state with "Describe what you want to build" and no indication that setup is broken.

**Recommendation:** Replace PreviewPane's empty-state copy with state-aware rendering: when `failureMessage` present OR (no preview AND no cards AND never built), render a dedicated `SetupRecoveryState` with a "Resume setup" button that re-calls `/api/onboarding` or `/api/workspace/[projectId]/auto-build`.

### B. First workspace arrival shows "Thinking..." not "Setting up your page"
`PreviewPane.tsx:97-104` — before any `file_written` event fires, the user sees "Thinking…" + "Meldar is planning your page." This is better than a file name, but still generic. Section 5 called for step-list progress ("Your page layout", "Your services", "The booking calendar") from the first frame, because the `card_started` event carries `cardIndex` and `totalCards` from the very first card. The step list is never rendered.

### C. `card_started` events don't carry human labels
`apps/web/src/features/workspace/context.tsx:238-245` handles `card_started` by stuffing `cardIndex` / `totalCards` into state — but there's no plumbing to display a humanized per-card label. Spec Section 5 required `userFacingLabel` on the event. Without this, any `BuildProgressView` that is eventually built will be stuck with either raw card `title` (technical) or a hardcoded client-side mapping (brittle).

**Recommendation:** Either (1) add `userFacingLabel` to the `card_started` SSE event payload in the orchestrator OR (2) add a `userFacingLabel` column to `kanban_cards` that is populated when cards are generated. Option 2 is durable across non-SSE renders (e.g. returning user sees the label from DB).

### D. OverflowMenu trigger is an unstyled native button
`OverflowMenu.tsx:38-56` uses a raw `<button>` with inline `style={...}`. CLAUDE.md rule: "Never use inline styles. Always use Panda CSS utilities." This is a direct style-system violation. Same pattern on all `<Link>` tags inside the menu (`:80, :90, :97, :106`). Easy to fix with `styled.button` and token-based padding.

### E. Admin layout re-introduces mini-tabs
`admin/layout.tsx:37-49` renders Bookings / Settings as in-page nav links — a miniature tab bar. This is exactly the pattern Section 3 deleted from the workspace top bar. If admin stays as separate routes in Phase 1, the mini-tabs should go; OverflowMenu already links directly to each page.

### F. `WorkspaceMode.review` mode collapse never happened
Spec Section 10: "The `review` mode collapses into `live`." The `review` mode is still derived in `deriveWorkspaceMode` (context.tsx:105-110), which means `FirstBuildCelebration` or any other consumer that inspects `mode.type === 'review'` is operating on a mental model the spec abandoned. `FirstBuildCelebrationBridge` in `WorkspaceShell.tsx:194-198` doesn't use `mode`, so this is latent not active — but it's a state-machine landmine for anyone adding new code.

### G. "Describe what you want to build" placeholder in FeedbackBar when no preview
`FeedbackBar.tsx:149` shows "Click any element above to change it, or describe what you want" even when there's no preview iframe (i.e., `safeUrl` is null). The "element above" refers to nothing. This is state-blind rendering: the FeedbackBar is always mounted (WorkspaceShell.tsx:102), independent of whether the preview exists. Per Section 6, FeedbackBar should only render in LIVE/MANAGING — NOT BUILDING, NOT failure-recovery.

**Recommendation:** Hoist state from `useWorkspaceBuild()` into WorkspaceShell's body and conditionally render FeedbackBar only when `previewUrl && !activeBuildCardId`.

---

## Recommended changes (prioritized)

### P0 — required to hit the spec's core promise (zero-to-personalized-live flow)

1. **Delete the Describe-what-you-build empty state.** Replace `PreviewPane.tsx:123-136` with a state-aware `SetupRecoveryState` component shown when `failureMessage !== null` OR (no preview AND cards === 0). Button reads "Resume setup" and re-triggers auto-build. Never show a prompt placeholder.
2. **Build `BuildProgressView` component (Section 10 tree, Section 5 language).** Render when `activeBuildCardId !== null` OR `pipelineActive`. Show: "Setting up your booking page" headline + progress bar from `currentCardIndex / totalCards` + per-step list ("Your page layout", "Your services", "The booking calendar") with ✓ / ● / ○ indicators. Delete the "Writing code..." / "Writing BookingForm.tsx..." copy from PreviewPane entirely.
3. **Add `userFacingLabel` to card metadata.** Plumb through the SSE `card_started` event OR store on the kanban_cards row. Required for BuildProgressView to render human labels.
4. **Make ProposalPreview editable.** Inline service name, duration, price fields + hours editor. The "Change things" button that goes back to DoorA should be deleted — users edit in place and confirm. This is the core "propose and go" pattern.

### P1 — should ship in this pass

5. **Simplify `FeedbackBar` per Section 7.** Remove Paperclip, reference URL, reference image, Stitch keyword suggestion, and `MIN_WORD_COUNT_FOR_DIRECT_SUBMIT` gate. Keep text input + send + simple chip suggestions.
6. **Render FeedbackBar only in LIVE state.** Hoist `{ previewUrl, activeBuildCardId }` from `useWorkspaceBuild()` into `WorkspaceShell` (or keep it in `WorkspaceBody`) and wrap FeedbackBar in `{previewUrl && !activeBuildCardId && <FeedbackBar ... />}`.
7. **Delete Door C (freeform) and consolidate Door B.** Door C recreates the "tell me what you want" anti-pattern in onboarding. If a fallback is needed for unknown verticals, it belongs inside Door A's "other" bucket, not as a first-class choice.
8. **Delete `StreakBadge`, `ContinueBanner`, `NewProjectButton` usage in `/workspace/page.tsx`.** They're premature MVP features per Section 9. `NewProjectButton.tsx` and `ContinueBanner.tsx` can stay as unreferenced files or be deleted; either way, remove from dashboard.

### P2 — cleanup pass after P0/P1 ship

9. **Simplify `WorkspaceMode` type** (context.tsx:29-33) to `{type:'building'|'live'|'managing'}`. Delete `selectedTaskId`, `chatOpen`, all `ui/*` actions, `selectTask`, `clearSelection`, `openChat`, `closeChat`, `deriveWorkspaceMode`, and the `review` branch. They have zero consumers.
10. **Delete the admin/layout.tsx mini-tabs** (lines 37-49 Bookings/Settings in-page nav). OverflowMenu handles routing.
11. **Replace inline `style={...}` in `OverflowMenu.tsx` and `ProposalPreview.tsx`** with `styled.button` / `styled.a` + Panda tokens.
12. **Plan for admin-into-workspace slide-over.** Section 11 Phase 3 work. Not blocking, but document the panel API so `features/booking-admin` can be lifted into a slide-over without a full rewrite.

---

## Files reviewed

- `apps/web/src/app/(authed)/workspace/[projectId]/page.tsx`
- `apps/web/src/app/(authed)/workspace/[projectId]/admin/layout.tsx`
- `apps/web/src/app/(authed)/workspace/[projectId]/admin/page.tsx` (head only)
- `apps/web/src/app/(authed)/workspace/[projectId]/admin/settings/page.tsx` (head only)
- `apps/web/src/app/(authed)/workspace/page.tsx`
- `apps/web/src/widgets/workspace/WorkspaceShell.tsx`
- `apps/web/src/widgets/workspace/WorkspaceTopBar.tsx`
- `apps/web/src/widgets/workspace/OverflowMenu.tsx`
- `apps/web/src/widgets/workspace/PreviewPane.tsx`
- `apps/web/src/widgets/workspace/lib/handle-sse-event.ts`
- `apps/web/src/widgets/workspace/index.ts`
- `apps/web/src/widgets/workspace/__tests__/OverflowMenu.test.tsx`
- `apps/web/src/features/onboarding/ui/OnboardingFunnel.tsx`
- `apps/web/src/features/onboarding/ui/DoorPicker.tsx`
- `apps/web/src/features/onboarding/ui/DoorA.tsx`
- `apps/web/src/features/onboarding/ui/ProposalPreview.tsx`
- `apps/web/src/features/onboarding/model/funnel-machine.ts`
- `apps/web/src/features/onboarding/model/types.ts`
- `apps/web/src/features/workspace/context.tsx`
- `apps/web/src/features/visual-feedback/ui/FeedbackBar.tsx`
