# 09 — Validation: Software Architect

Reviewed the onboarding funnel + workspace auto-build against the redesign specs (01–07) and prior critique (08-funnel-critique-architect.md). Assessment below is strictly architectural: state management, separation of concerns, coupling, error handling, testability.

Files inspected:
- `/Users/georgyskr/projects/pet/agentgate/apps/web/src/features/onboarding/model/funnel-machine.ts`
- `/Users/georgyskr/projects/pet/agentgate/apps/web/src/features/onboarding/model/proposal-data.ts`
- `/Users/georgyskr/projects/pet/agentgate/apps/web/src/features/onboarding/model/types.ts`
- `/Users/georgyskr/projects/pet/agentgate/apps/web/src/features/onboarding/model/example-pages.ts`
- `/Users/georgyskr/projects/pet/agentgate/apps/web/src/features/onboarding/ui/OnboardingFunnel.tsx`
- `/Users/georgyskr/projects/pet/agentgate/apps/web/src/features/onboarding/index.ts`
- `/Users/georgyskr/projects/pet/agentgate/apps/web/src/widgets/workspace/WorkspaceShell.tsx`
- `/Users/georgyskr/projects/pet/agentgate/apps/web/src/widgets/workspace/OverflowMenu.tsx`
- `/Users/georgyskr/projects/pet/agentgate/apps/web/src/widgets/workspace/lib/handle-sse-event.ts`
- `/Users/georgyskr/projects/pet/agentgate/apps/web/src/features/workspace/context.tsx`
- `/Users/georgyskr/projects/pet/agentgate/apps/web/src/app/api/onboarding/route.ts`
- `/Users/georgyskr/projects/pet/agentgate/apps/web/src/app/api/workspace/[projectId]/auto-build/route.ts`
- `/Users/georgyskr/projects/pet/agentgate/apps/web/src/server/build/sandbox-preview.ts`
- `/Users/georgyskr/projects/pet/agentgate/apps/web/src/server/build/run-auto-build.ts`
- `/Users/georgyskr/projects/pet/agentgate/packages/orchestrator/src/engine.ts`

---

## Top 3 Strengths

### S1. Onboarding state machine is a clean, testable pure reducer

`funnel-machine.ts` is exemplary: a pure `funnelReducer(state, action)` with discriminated-union `FunnelState` and `FunnelAction` in `types.ts`. All state transitions are centralized, guard clauses (`if (state.screen !== 'doorB') return state`) make illegal transitions no-ops rather than crashes, and readonly modifiers on every field prevent accidental mutation. This is testable without any React or DOM mocking — exactly the goal of model/UI separation. The unit tests at `funnel-machine.test.ts` and `proposal-data.test.ts` prove it.

### S2. Orchestrator engine treats commit as a transactional barrier

`packages/orchestrator/src/engine.ts` orders operations with genuine care: `stop_reason` check before committing (line 205-212, explicit comment about refusing to commit truncated writes), debit-before-commit semantics (line 357-359, so a ceiling overflow leaves HEAD intact), and `sandbox_ready` yielded *after* `committed` (line 417-418, so the preview URL never advertises stale files). The self-repair flow (line 262-337) is bounded to a single retry with narrow instructions, not an unbounded agent loop. These are the kind of invariants that only survive if they are named and defended.

### S3. SSE pipeline discipline across `auto-build` and `build`

The streaming pipeline is uniform: orchestrator yields `OrchestratorEvent`, `sseStreamFromGenerator` converts to SSE, client `consumeSseStream` + `handleSseEvent` dispatch to the same reducer that server-side pipeline events target. One event vocabulary, one reducer, from build initiation to deploy. `run-auto-build.ts:87-105` composes `orchestrateBuild` per kanban card and surfaces `card_started` / `pipeline_complete` / `pipeline_failed` as first-class events. Clean, and it means the UI receives the same events whether a build was user-triggered or auto-triggered.

---

## Top 3 Issues

### I1. CRITICAL — `OnboardingFunnel.tsx` violates the funnel's own "propose-and-go" contract

The `07-onboarding-funnel.md` spec was explicitly revised in `08-funnel-critique-architect.md` (Impact 2) to require Door B and Door C to route through the service editor (A2) and availability picker (A3) before the proposal preview. The implementation in `OnboardingFunnel.tsx` does NOT do this — all three doors jump directly to `proposalPreview`:

- Door A: `submitDoorA` → `proposalPreview` (no service/hours confirmation)
- Door B: `selectExample` → `proposalPreview` (template data injected, never confirmed)
- Door C: `submitFreeform` → `proposalPreview` (AI-keyword-inferred data, never confirmed)

**Why this matters architecturally:** the funnel claims the Proposal Preview is the "emotional peak" / ownership moment, but the data is `businessName: \`My ${v?.label ?? 'Other'} business\`` fallback (`proposal-data.ts:61`) — a placeholder the user never typed. The state machine has no `serviceEditor` or `hoursPicker` screen at all. `FunnelState` (`types.ts:18-35`) lacks these variants entirely. This is not a cosmetic gap; the critique called out exactly this as the contradiction that destroys the preview's credibility.

**Secondary severity issue inside I1:** `buildProposalFromDoorA` in `proposal-data.ts:4-21` is dead code. The reducer in `funnel-machine.ts:37-55` duplicates the same logic inline (`action.businessName || \`My ${vertical.label} business\``, `vertical.defaultServices.map(...)`, `vertical.defaultHours`). Two sources of truth for the same transformation will drift. One of them should win — prefer the exported builder, since it is already tested and importable from the reducer.

**Recommendation:**
1. Add `serviceEditor` and `hoursPicker` screens to `FunnelState` as discriminated variants carrying a partial `ProposalData`.
2. Route all three doors through them: `doorA → serviceEditor → hoursPicker → proposalPreview`, and the same for Door B/C with their respective pre-fills.
3. Delete inline proposal construction from the reducer and call `buildProposalFromDoorA` / `buildProposalFromFreeform`. Add `buildProposalFromExample` for Door B.
4. Remove `error` from `proposalPreview` — it is a build-time concern that belongs in `submitting`/`failed` states only (see I2).

### I2. CRITICAL — `submitting` state in `OnboardingFunnel` is unreachable in practice + leaks loading concerns into the preview

`OnboardingFunnel.tsx:116-125` renders `ProposalPreview` with `submitting={true}` when `state.screen === 'submitting'`. But the reducer only transitions out of `submitting` via `success` or `failure`. On `failure`, it routes back to `proposalPreview` with `sourceDoor: 'a'` hardcoded (line 73-79 of `funnel-machine.ts`) — losing the real source door. If a Door B user's build fails, they are silently moved to a state that thinks they came from Door A. The back-nav logic in `case 'back'` will then send them to Door A's vertical picker, not to the example gallery. This is a real state-machine bug, not a theoretical one.

**Additional design-smell:** `ProposalPreview` is being asked to render two different modes (`submitting` and `error`). That is exactly the same anti-pattern called out in `08-funnel-critique-architect.md` Section 1.3 for the confirmation/preview conflation — now repeated for the submit/preview conflation.

**Recommendation:**
- Preserve `sourceDoor` on `failure`: `return { ...state, screen: 'proposalPreview', sourceDoor: state.sourceDoor_was_captured_here, error: action.error, proposal: state.proposal }`. The `submitting` state needs to carry `sourceDoor` forward, or the reducer needs to remember it separately. Simplest fix: add `sourceDoor` to the `submitting` variant.
- Split the submit UI into its own screen component (e.g., `SubmittingScreen`) that knows nothing about proposal rendering. The preview has one job; the submitter has another.

### I3. IMPORTANT — `WorkspaceShell` auto-build effect couples routing intent to render-side-effects with a fragile guard

`WorkspaceShell.tsx:73-82` runs auto-build inside a `useEffect` guarded by a `useRef` (`autoBuildStartedRef`) and derived-state checks (`previewUrl`, `activeBuildCardId`, `cards.length`). Four concerns are braided together:

1. "Is this the first render after onboarding just completed?" — inferred from `previewUrl === null && cards.length > 0`.
2. "Am I already building?" — `activeBuildCardId`.
3. "Was auto-build already kicked off this mount?" — `autoBuildStartedRef`.
4. "Is there any buildable work?" — `cards.some(c => c.state === 'ready' || c.state === 'draft')`.

The `providerKey` trick on the provider (line 29: `const providerKey = props.initialKanbanCards.length === 0 ? 'empty' : 'loaded'`) is a React-level workaround to remount the provider and reset the ref. This is load-bearing and unobvious. If `initialKanbanCards` ever arrives non-empty on first render but `previewUrl` is set (e.g., rehydration after a refresh during build), the effect still fires once per mount — guarded only by `previewUrl`. More importantly, the intent "start the first build automatically after onboarding" is a **navigation/routing concern**, not a workspace-render concern. Running it on mount means any path that lands on `/workspace/[id]` without a preview URL (including a user who refreshed during a legitimately failed build, or who came back from the admin subpage to the workspace) will re-trigger auto-build if the ref has reset.

**Why this is architectural, not cosmetic:** the workspace shell is becoming the router for post-onboarding kickoff. That responsibility belongs in one of: (a) the onboarding API route (fire-and-forget auto-build, as already done for sandbox prewarm at `api/onboarding/route.ts:104`), (b) a dedicated `/workspace/[id]/bootstrap` route that runs the auto-build once and redirects, or (c) a server-side flag on the project (`autoBuildRequested: true`) that the workspace clears atomically the first time it is consumed.

**Recommendation:**
- Move the auto-build trigger server-side. The onboarding API already plans cards via `insertPlanCards` and already calls `prewarmSandbox` fire-and-forget. Add a similar `triggerAutoBuild` fire-and-forget that enqueues the build. The client then just subscribes to events; it does not decide when to start.
- If client-triggered auto-build must remain, replace the effect+ref+providerKey combo with a single explicit boolean prop on `WorkspaceShell` (`shouldAutoStartBuild: true`) computed server-side from the project's row. The server knows whether this is the first post-onboarding visit; the client should not have to guess from the shape of the kanban.

---

## Code Smells

**CS1. Duplicated proposal-construction logic.** `funnel-machine.ts:37-55` inlines the same build-from-vertical logic that `proposal-data.ts:4-21` already exports and tests. The inline version and the exported version will drift. Reducer should call the builder.

**CS2. Hardcoded `sourceDoor: 'a'` on failure.** `funnel-machine.ts:73-79` — silent source-of-truth loss. See I2.

**CS3. Keyword-map vertical inference without tests for the "Other" fallback path.** `proposal-data.ts:23-50` — `inferVerticalFromText` returns `'other'` for unmatched, then `BOOKING_VERTICALS.find((v) => v.id === 'other')` — if the verticals table ever loses the `'other'` entry, the function silently returns an empty-services proposal (line 62 falls back to `[]`). No test covers the "verticals table lacks 'other'" scenario. Either assert `'other'` exists at module load, or let the function return `null` and force callers to handle it.

**CS4. `OnboardingFunnel.tsx:27-45` duplicates `proposal-data.ts` logic a third time** — the `handleExampleSelect` handler constructs a `ProposalData` inline from `EXAMPLE_PAGES` and `getVerticalById(...).defaultHours`, including the same fallback literal `{ days: ['mon'...], start: '09:00', end: '17:00' }` that appears in `proposal-data.ts:66-70`. Three definitions of the same default. Centralize: `DEFAULT_HOURS` constant in `types.ts` or `proposal-data.ts`, exported, and a `buildProposalFromExample(example)` helper.

**CS5. `OverflowMenu.tsx:43-53` and :80, :90, :98, :106 use `style={{...}}` inline objects.** This repo's CLAUDE.md explicitly bans inline styles ("Never inline styles. Always use Panda CSS utilities"). Five separate violations in one ~120-line file. Use Panda `css()` or the `<styled.button>` / `<styled.a>` variants.

**CS6. `WorkspaceShell.tsx:107-145 and :147-192` — `runAutoBuild` and `runBuild` are near-duplicates.** Same error-shape parsing, same toast/publish pattern, differ only in URL and body. Extract a shared `streamBuildRequest(endpoint, body, publish)` helper. Also, both functions are declared at module scope but capture nothing from the component — they are already pure-ish and should live in `lib/`, not in the component file.

**CS7. `context.tsx:324-345` — persistence effect runs a diff against previous cards on every render.** The `prevCardsRef.current = state.cards` assignment happens inside the effect, which is fine, but the comparison loop re-runs for every state change (even UI-only actions like `ui/selectTask`, which change `state` but not `state.cards`). Either memoize against `state.cards` identity (effect already depends on it, so this is low-priority) or split the persistence effect into its own `useSyncExternalStore`-shaped hook. Minor.

**CS8. `context.tsx:270-290` — `persistCardState` is fire-and-forget with console.error as the only observability.** If the PATCH fails, the client shows a built card; the DB still thinks it is `ready`. On page reload the user sees their built card as "ready" again. Either (a) retry on failure, (b) surface a toast, or (c) make the mutation blocking and drive the optimistic UI off a pending-writes queue. At minimum, add a telemetry hook so failures are visible outside the console.

**CS9. `api/onboarding/route.ts:82-89` — `buildProjectStorageFromEnv` / `buildProjectStorageWithoutR2` fallback is silent.** A missing R2 config swallows the error and uses a degraded storage with `initialFiles: []`. The project ends up without starter files, and the user's only signal is that the first build will behave oddly. Log the downgrade at WARN with the missing env var, and reflect it in the response so ops can see "hasR2=false" without reading the server logs.

**CS10. `sandbox-preview.ts:43-52` and `engine.ts:420-431` — retry-with-prewarm pattern is duplicated.** Both files have `try { start() } catch { prewarm(); start() }`. Same shape, different sites. Extract `startWithPrewarmFallback(sandbox, opts)` to `@meldar/sandbox` (where `SandboxProvider` lives) and call it from both. Bonus: the retry has no cap — if `prewarm()` itself throws, the error propagates up; if the second `start()` also fails, there is no third attempt but also no explicit `giveUp` event. Consider either a bounded retry policy or an explicit `sandbox_unavailable` event class.

**CS11. `funnel-machine.ts` `case 'selectDoor'` uses `break` after an inner switch.** Lines 8-17: outer `switch (action.type)` has `case 'selectDoor'` with an inner `switch (action.door)` that returns in every branch; the trailing `break` on line 17 is unreachable. Biome/TS-strict will catch this; it is a readability smell rather than a bug. Use exhaustive discriminated-union handling so unreachable code is impossible by construction.

**CS12. `types.ts:18-35` — `FunnelState` variants are structurally ambiguous.** Both `doorA` and `proposalPreview` carry a business-name-like field; both `proposalPreview` and `submitting` carry `proposal`. A future refactor could accidentally broaden one variant to match another. Consider brand types or a state-ID enum to make the variants nominally distinct.

---

## Recommended Follow-ups

### F1. Implement the missing quiz steps (blocks I1)

Add `serviceEditor` and `hoursPicker` to `FunnelState`, route all three doors through them, and gate the Proposal Preview behind their completion. Carry `sourceDoor` through all intermediate states. This is the single largest architectural gap vs. the spec and the only CRITICAL-priority follow-up for the onboarding funnel.

### F2. Fix the `failure` → `proposalPreview` transition to preserve `sourceDoor` (blocks I2)

One-line reducer fix once `submitting` carries `sourceDoor`. Adds a unit test: "failure from Door B submit returns to Door B's proposalPreview, not Door A's."

### F3. Move auto-build trigger off the client (blocks I3)

Preferred: server-side fire-and-forget from the onboarding API, mirroring the existing `prewarmSandbox` pattern. Delete the `useEffect` + `useRef` + `providerKey` combo from `WorkspaceShell`. Workspace becomes a pure event subscriber.

### F4. Centralize proposal construction

One builder module: `buildProposalFromVertical`, `buildProposalFromExample`, `buildProposalFromFreeform`. All three consumed from the reducer. Delete inline construction from `OnboardingFunnel.tsx` and `funnel-machine.ts`. Add `DEFAULT_HOURS` constant to kill the third copy.

### F5. Extract retry-with-prewarm into `@meldar/sandbox`

One `startWithPrewarmFallback(sandbox, opts)` used by both `engine.ts` and `sandbox-preview.ts`. Bound the retry; emit an explicit failure event if both attempts fail.

### F6. Replace `style={{...}}` with Panda in `OverflowMenu.tsx`

Project convention violation. Low effort, five call-sites.

### F7. Add explicit auth gate at the Proposal Preview (architect's critique Impact 4)

Per `08-funnel-critique-architect.md`, the funnel should work anonymously up to the preview and gate on "Build this." Current `OnboardingFunnel.tsx:57-66` calls `/api/onboarding` unconditionally, and that route's `requireAuth` will 401 — with no UX for "not authenticated, please sign in." The client needs a pre-check that routes to sign-up/login on 401 with return-to-funnel state preserved. This is primarily a UX concern but has an architectural component: where does funnel state live when the user leaves for auth and returns? Options: (a) serialize to URL, (b) Jotai/localStorage (matches existing memory `data_export_reality.md` pattern for async forms), (c) server-side draft record. Decide before implementing F1 — the quiz steps will have non-trivial state to persist.

### F8. Decide on `Door D` (discovery) placement

The architect critique (Impact 5) recommends removing Door D from the funnel entirely. The current implementation already omits it — `funnelReducer` only handles doors `a`, `b`, `c`. This is consistent with the critique but the `07-onboarding-funnel.md` spec still describes 4 doors. Either update doc 07 to match the code, or resurrect Door D. Currently the code and the spec disagree, and that disagreement is not recorded anywhere. One-line ADR resolves it.

---

## Tech Debt Introduced (Summary)

- Three parallel definitions of proposal-building logic (reducer inline, `proposal-data.ts`, `OnboardingFunnel.tsx` inline). **Delete two.**
- `OverflowMenu.tsx` inline styles, violating project convention. **5 sites.**
- Duplicated retry-with-prewarm in orchestrator and sandbox-preview. **2 sites.**
- `runAutoBuild` / `runBuild` client wrappers are ~90% identical. **1 file.**
- `WorkspaceShell` carries routing logic (auto-build kickoff) that belongs server-side. **1 effect.**
- Dead exported `buildProposalFromDoorA` with tests that pass but prove nothing about production behavior. **Delete or wire up.**
- `FunnelState` missing `serviceEditor`/`hoursPicker` variants, making the implementation diverge from the spec at the type level. **Schema-shaped gap.**

The tech debt is tractable — none of it is load-bearing for launch, and F1 (the quiz steps) is the only one that blocks the product feeling coherent vs. the spec. Everything else is cleanup that can happen once the flow shape is frozen.
