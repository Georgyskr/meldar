# §JARVIS Workspace Specification — ARCHIVED

> **ARCHIVED (2026-04-10).** This spec described a 3D galaxy-based
> workspace that was prototyped but not shipped. The production workspace
> uses a two-column layout (TaskListPane + ArtifactPane) with a
> conversational onboarding chat. See the 2026-04-10 section of
> `meldar-v3-mvp-backlog.md` for current state.

**Created:** 2026-04-09
**Status:** Archived — design superseded by two-column workspace
**Depends on:** N/A (archived)

---

## Decision: Hybrid Card Expansion + Layered Workspace

The workspace centerpiece is the 3D Project Galaxy using the **Hybrid Card Expansion** visual style:
- **Ready/Active tasks** = frosted glass Html cards (160px, always-visible title + status dot)
- **Done tasks** = green spheres with checkmark badges
- **Locked tasks** = smaller dim spheres (0.09 radius, 45% opacity)
- **Click interaction** = glass card expands in-place from 160px to 320px (350ms spring)

The galaxy is **always mounted**. Everything else is an overlay.

---

## Page Layout Architecture

### Layer Model

```
┌──────────────────────────────────────────────┐
│ TopBar (48px) — meldar / Project / progress  │
├──────────┬───────────────────────────────────┤
│          │                                   │
│ Chat     │     3D GALAXY (always here)       │
│ Drawer   │                                   │
│ (380px)  │     Bottom sheets slide up        │
│ slides   │     over the galaxy for:          │
│ from     │     - Task Focus (120px)          │
│ left     │     - Build Progress (160px)      │
│ on       │     - Review (140px)              │
│ demand   │                                   │
│          │                       ┌────────┐  │
│          │                       │Preview │  │
│          │                       │Thumb   │  │
│          │                       └────────┘  │
├──────────┴───────────────────────────────────┤
│ BottomBar (44px) — tier / last build / next  │
└──────────────────────────────────────────────┘
```

### Z-Index Assignments

| Layer | z-index | Element |
|-------|---------|---------|
| 0 | 1 | Galaxy Canvas (Three.js scene) |
| 1 | 5 | Preview Thumbnail (bottom-right floating card) |
| 2 | 10 | Bottom Sheets (Task Focus / Build Progress / Review) |
| 3 | 20 | Chat Drawer (left slide-in) |
| 4 | 40 | TopBar / BottomBar (chrome) |
| 5 | 50 | Modals (pricing, confirm, celebration) |

---

## Five Workspace Modes

### Mode A: Galaxy (hub/default)

Full 3D constellation visible. Auto-rotate on. Preview thumbnail bottom-right (260x180). "Ask Meldar" chat pill bottom-left. No bottom sheet.

### Mode B: Task Focus

User clicked a galaxy card. Camera zooms in. Bottom sheet (120px) slides up with: status dot, title, learn text, "Make this now" CTA, "Back to galaxy" button. For locked tasks: dependency chips showing what needs to be done first.

### Mode C: Building

User clicked "Make this now". Bottom sheet grows to 160px, swaps to build progress: 3-phase display ("Thinking... Writing... Done!"), progress bar, single-line status. Preview thumbnail grows to 320x220 with green "live" dot. Galaxy card shows spinning animation.

### Mode D: Review

Build complete. Bottom sheet becomes review sheet (140px): "Built [task name]", "See it in your app" link, "Ask for changes" (opens chat), "Next step" button. Preview thumbnail expands to 480x340. Galaxy card transitions to done sphere with celebration pulse.

### Mode E: Chat (overlay, any mode)

Chat drawer (380px) slides in from left. Galaxy canvas shifts right (`padding-left: 380px`). Chat is context-aware: if a task is selected, chat is scoped to that task. Messages are bubble-style (like iMessage). During builds, build events appear as system messages inline.

---

## Mode Transitions

| From | To | Trigger | Animation |
|------|-----|---------|-----------|
| Galaxy → Task Focus | Click a card | Camera lerps (0.06, ~400ms), nodes dim, sheet slides up 300ms |
| Task Focus → Building | "Make this now" | Sheet cross-fades 200ms, grows 120→160px, preview grows |
| Building → Review | Build completes | Progress fills 100%, sheet cross-fades, card → green sphere, preview expands |
| Review → Galaxy | "Next step" or "Back" | Sheet slides down, camera returns (600ms), preview shrinks |
| Any → Chat | "Ask Meldar" pill or `/` key | Drawer slides in 300ms, galaxy shifts right |
| Chat → Close | X button or Escape | Drawer slides out 250ms, galaxy shifts back |

---

## Hybrid Node System

### Ready/Active Glass Cards (Html overlays in 3D)

| Property | Value |
|----------|-------|
| Width | 160px (compact), 320px (expanded) |
| Background | `rgba(250,249,246,0.72)` + `backdrop-filter: blur(20px)` |
| Border | `1px solid rgba(98,49,83,0.12)` |
| Border-left (ready) | `2px solid #FFB876` |
| Border-left (active) | `2px solid #623153` |
| Border-radius | 12px |
| Box-shadow (ready) | `0 0 16px rgba(255,184,118,0.25), 0 2px 8px rgba(0,0,0,0.06)` |

Content: 6px status dot + title (12px Inter 500). Ready cards show "Tap to start" label below (9px uppercase, pulsing opacity).

Hover: scale 1.06 (200ms spring), stronger shadow, learn text fades in (150ms).

Expansion on click: 160→320px, 350ms `cubic-bezier(0.16,1,0.3,1)`. Shows: title, learn text, token cost, "Make this now" button. All other nodes dim to 15%.

### Done Spheres

Sphere (0.14 radius), green `#22c55e`, emissive 0.5. Checkmark badge (Html, 16px white circle with green check) at (+0.12, +0.12). Hover: scale 1.25, tooltip pill. Click: detail card materializes.

### Locked Spheres

Sphere (0.09 radius), `#d4cdd0`, opacity 0.45. Hover: "Waiting for: [dependency name]" tooltip. Click: detail card with clickable dependency names that navigate to those tasks.

---

## Sequential Melding Animation (4.2s)

| Time | Event |
|------|-------|
| 0-800ms | Chapter 1 nodes materialize (scale 0.3→1.0, opacity 0→1) |
| 800-1600ms | Chapter 2 nodes materialize |
| 1600-2400ms | Chapter 3 nodes materialize |
| 2400-3200ms | Chapter 4 nodes materialize |
| 3000-3400ms | Dependency lines fade in |
| 3200-3600ms | Milestone connection lines fade in |
| 3600-4200ms | Ready card emphasis: spring bounce 1.0→1.12→1.0, glow intensifies |

Status text overlay: "Mapping your journey..." → "Building your path..." → "Almost there..."

Interaction disabled until 4200ms.

---

## Build Connection Line

During builds, an SVG dashed line (`#623153`, 1.5px, dash 8/6, flowing at 25px/sec) connects the building card's screen-projected position to the preview thumbnail corner. A peach dot (3px) travels along the path. On completion: particle burst at endpoint + preview green flash.

---

## Language Changes (Critical)

| Current | New | Rationale |
|---------|-----|-----------|
| Milestone | **Chapter** | Non-technical users don't know "milestone" |
| Subtask | **Step** | Less nested/complex feeling |
| "To do" (draft) | **"Needs your OK"** | Signals user action needed |
| "Ready" | **"Ready to create"** | Explicit about what happens |
| "Building..." | **"Meldar is working on this"** | Personal, active |
| "Done" | **"Done"** | Already correct |
| "Failed" | **"Didn't work — tap to retry"** | Action-oriented |
| "Edit" (needs_rework) | **"Needs a tweak"** | Descriptive |
| Build log events | **3-phase: "Thinking / Writing / Done"** | No file paths, no build IDs |
| "5 tokens" | **"5 energy"** | Renewable resource, not currency |

---

## Information Architecture Priorities

### Always Visible

- Project name + step progress ("Step 3 of 12")
- Token/energy balance pill
- Preview thumbnail (app they're creating)
- Galaxy with all nodes (spatial context)

### Show on Interaction

- Learn text (hover glass card)
- Dependency explanation (hover locked sphere: "Waiting for: Weight chart")
- Task details (click → expand or bottom sheet)
- "See it in your app" link (after build)

### Never Show

- Build IDs, file paths, byte counts
- Raw error messages, stack traces, HTTP codes
- Cent cost estimates (use energy/tokens only)
- Revision numbers, prompt hashes

### Hide by Default, Available on Demand

- Raw build log (behind "Details" disclosure)
- Token cost per task card (show only in confirm modal)
- Task type (feature/page/integration)
- Acceptance criteria (rename to "What this step should do")

---

## Error Handling (Human-Friendly)

| Error | Message |
|-------|---------|
| Insufficient tokens | "You're out of energy for today. You'll get 15 more tomorrow." |
| Rate limit (429) | "Meldar is really popular right now. Try again in a minute?" |
| Server error (500) | "Something went wrong on our end. We're looking into it." |
| Network drop | "Looks like your internet dropped. Check your connection." |
| Generic build fail | "This step didn't work this time. Let's try again." |

---

## Post-Build Learning Moments

After every step completes, show a brief inline "What just happened" panel:
- What was created (step name in human language)
- "See it in your app" link
- What you learned (explainerText)
- Progress count ("4 of 12 steps done")

After every chapter completes, show a celebration:
- "Chapter 1 complete! You just learned: how to organize information, how forms capture input."
- Progress to next chapter

---

## Mobile Layout (< 1024px)

No 3D galaxy. Use the Wildcard Stack variant:
- Scrollable frosted glass card list
- Milestone sections with task rows
- Ready task has inline "Make this now" button
- Sticky chat input at bottom
- Preview accessible via floating button

---

## Component Architecture

### New Components

| Component | Path | Role |
|-----------|------|------|
| `WorkspaceCanvas` | widgets/workspace | Container: Galaxy + all overlay layers. Replaces LeftPane+PreviewPane split. |
| `GalaxyLayer` | features/galaxy | Three.js canvas wrapper. `dynamic(ssr: false)`. |
| `TaskFocusSheet` | widgets/workspace | Bottom sheet for task detail. |
| `BuildProgressSheet` | widgets/workspace | Bottom sheet for build-in-progress. |
| `ReviewSheet` | widgets/workspace | Bottom sheet for post-build review. |
| `ChatDrawer` | features/chat | Left-side sliding drawer. Absorbs BuildComposer + BuildLog. |
| `ChatPill` | features/chat | Floating "Ask Meldar" entry point. |
| `PreviewThumbnail` | widgets/workspace | Mode-responsive floating preview. |
| `WorkspaceMode` | features/workspace-mode | State machine: galaxy / taskFocus / building / review. |

### Retire/Refactor

| Current | Change |
|---------|--------|
| `WorkspaceShell` | Replace 42%/58% split with layered canvas model |
| `LeftPane` | Galaxy replaces plan view. Build trigger → TaskFocusSheet. |
| `PreviewPane` | Becomes floating PreviewThumbnail. Full preview on click. |
| `BuildPanel` | Composer → ChatDrawer, log → chat messages, streaming → sheets. |

### State Machine

```typescript
type WorkspaceMode =
  | { type: 'galaxy' }
  | { type: 'taskFocus'; taskId: string }
  | { type: 'building'; taskId: string; buildId: string }
  | { type: 'review'; taskId: string; buildReceipt: BuildReceipt }
```

`chatOpen: boolean` is orthogonal (chat can be open in any mode).

---

## Implementation Phases

### Phase 1: Foundation
1. `WorkspaceMode` context + state machine
2. `WorkspaceCanvas` container (layered model)
3. Promote `GalaxyHybridExpansion` to production
4. `TaskFocusSheet` (bottom sheet)
5. `PreviewThumbnail` (floating, mode-responsive)

### Phase 2: Build Flow
6. `BuildProgressSheet` (wired to SSE)
7. `ReviewSheet` (wired to BuildReceipt)
8. Mode transitions: galaxy → taskFocus → building → review → galaxy

### Phase 3: Chat
9. `ChatDrawer` with message UI
10. `ChatPill` entry point
11. Move BuildComposer into ChatDrawer
12. Build events as chat system messages
13. Context-awareness (task scoping)

### Phase 4: Mobile
14. Promote WildcardStack as mobile variant
15. Responsive switching at 1024px breakpoint
16. Mobile task interaction (accordion, inline progress)

---

## Design Lab Prototypes (current state)

Files in `apps/web/src/app/design-lab/`:

| File | Description |
|------|-------------|
| `GalaxyHybridExpansion.tsx` | **Winner:** Glass cards + spheres, in-place expansion |
| `GalaxyHybridFlyinto.tsx` | Glass cards + spheres, fly-into + bottom bar |
| `GalaxyWildcardStack.tsx` | Pure 2D card list (mobile fallback candidate) |
| `GalaxyWildcardMap.tsx` | Territory map on tilted 3D plane |
| `GalaxyVariantA.tsx` | Crystal Facets (octahedrons) |
| `GalaxyVariantB.tsx` | Glass Cards (uniform, no hybrid) |
| `GalaxyVariantC.tsx` | Orbital Rings (torus geometry) |
| `GalaxyVariantD.tsx` | Pulse Network (energy on connections) |
| `GalaxyVariantE.tsx` | Editorial Markers (flat circles + typography) |
| `ProjectGalaxy.tsx` | Original prototype (spheres, melding, zoom variants) |
| `AppPreviewThumbnail.tsx` | Floating preview thumbnail |
| `WeightTrackerPreview.tsx` | Iframe weight tracker mock (full-page version) |
