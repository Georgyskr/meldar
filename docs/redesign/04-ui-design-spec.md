# 04 — UI Design Spec: Component-Level Workspace Redesign

This document specifies every component in the redesigned workspace at the Panda CSS prop level. It is the implementation blueprint — an engineer reading this can build each component without design ambiguity.

All specs use the project's actual design system: Panda CSS + Park UI tokens, `@styled-system/jsx` primitives, `<Text>` and `<Heading>` from `@/shared/ui`, and the textStyle/color tokens defined in `apps/web/panda.config.ts`.

---

## 1. Component Inventory

### Kept and simplified
| Component | Current file | Changes |
|---|---|---|
| `WorkspaceShell` | `src/widgets/workspace/WorkspaceShell.tsx` | Becomes state-machine driver. Renders TopBar + phase-specific main content + conditional FeedbackBar. |
| `WorkspaceTopBar` | `src/widgets/workspace/WorkspaceTopBar.tsx` | Strips WorkspaceNav. Adds OverflowMenu. Logo + project name + overflow trigger. |
| `PreviewPane` | `src/widgets/workspace/PreviewPane.tsx` | Remove empty-state placeholder. Only renders iframe + BuildStatusOverlay. |
| `FeedbackBar` | `src/features/visual-feedback/ui/FeedbackBar.tsx` | Remove Paperclip/attachment UI. Remove reference URL/image fields. Keep text input + send + suggestion chips. |
| `BuildStatusOverlay` | `src/widgets/workspace/BuildStatusOverlay.tsx` | Keep as-is. Building/done/failed pills are correct. |
| `ProposalCard` | `src/features/glass-plan/ui/ProposalCard.tsx` | Enhance with vertical-specific defaults and "Change something" inline editor. |

### New components
| Component | Location | Purpose |
|---|---|---|
| `WorkspaceMain` | `src/widgets/workspace/WorkspaceMain.tsx` | State-driven router: renders ProposalView, BuildProgressView, or PreviewPane based on WorkspacePhase. |
| `ProposalView` | `src/widgets/workspace/ProposalView.tsx` | PROPOSING state: centers ProposalCard with contextual copy. |
| `BuildProgressView` | `src/widgets/workspace/BuildProgressView.tsx` | BUILDING state: progress bar + step checklist. |
| `OverflowMenu` | `src/widgets/workspace/OverflowMenu.tsx` | Three-dot menu in top bar. Conditional items based on workspace phase. |
| `BuildStepList` | `src/widgets/workspace/BuildStepList.tsx` | Vertical checklist of build steps with live status. |

### Deleted
| Component | Why |
|---|---|
| `TaskListPane` | Kanban sidebar. Replaced by auto-build pipeline. |
| `ArtifactPane` | Code file viewer. Moves to on-demand panel (Phase 3). |
| `WorkspaceNav` | Build/Bookings/Settings tabs. Replaced by OverflowMenu. |
| `WorkspaceBottomBar` | Footer with tier/roadmap. No purpose in new flow. |
| `OnboardingChat` | "Tell me what to build" prompt. Replaced by ProposalView. |
| `WorkspaceEmptyState` | Wrapper for OnboardingChat. Deleted with it. |
| `ContinueBanner` | Dashboard continue banner. Not needed for single-project MVP. |
| `StepIndicator` | Step dots. Replaced by BuildStepList. |
| `NewProjectButton` | Multi-project. Premature for MVP. |

---

## 2. WorkspaceShell

The root client boundary. Drives the phase state machine.

### Props
```typescript
type WorkspaceShellProps = {
  readonly projectId: string
  readonly projectName: string
  readonly initialPreviewUrl: string | null
  readonly initialKanbanCards: readonly KanbanCard[]
  readonly subdomain: string | null
  readonly vertical: string | null
}
```

### Layout
```tsx
<WorkspaceBuildProvider ...>
  <Flex
    direction="column"
    position="fixed"
    inset={0}
    zIndex={40}
    bg="surface"
    color="onSurface"
  >
    <WorkspaceTopBar
      projectName={projectName}
      subdomain={subdomain}
      phase={phase}
    />
    <WorkspaceMain
      projectId={projectId}
      phase={phase}
      vertical={vertical}
    />
    {(phase === 'live' || phase === 'managing') && (
      <FeedbackBar onSubmit={handleFeedbackSubmit} />
    )}
  </Flex>
</WorkspaceBuildProvider>
```

### Phase derivation
```typescript
type WorkspacePhase = 'proposing' | 'planning' | 'building' | 'live' | 'managing'

function derivePhase(state: WorkspaceBuildState): WorkspacePhase {
  if (state.cards.length === 0 && !state.previewUrl) return 'proposing'
  if (state.cards.length > 0 && !state.activeBuildCardId && !state.previewUrl) return 'planning'
  if (state.activeBuildCardId || state.pipelineActive) return 'building'
  if (state.previewUrl) return 'live'
  return 'proposing' // fallback
}
```

### States
| Phase | Main content | FeedbackBar | TopBar menu items |
|---|---|---|---|
| `proposing` | ProposalView | Hidden | All projects |
| `planning` | Brief "Setting up..." message | Hidden | All projects |
| `building` | BuildProgressView | Hidden | All projects |
| `live` | PreviewPane (full) | Visible | My site, Settings, What was built, All projects |
| `managing` | PreviewPane (full) | Visible | My site, Manage bookings, Settings, What was built, All projects |

---

## 3. WorkspaceTopBar

Simplified top bar. Logo + project name + overflow menu.

### Props
```typescript
type WorkspaceTopBarProps = {
  readonly projectName: string
  readonly subdomain: string | null
  readonly phase: WorkspacePhase
}
```

### Layout
```tsx
<Flex
  as="header"
  alignItems="center"
  justifyContent="space-between"
  height="52px"
  paddingInline={5}
  bg="surface"
  borderBlockEnd="2px solid"
  borderColor="onSurface"
  flexShrink={0}
>
  {/* Left: logo + breadcrumb */}
  <Flex alignItems="center" gap={3} minWidth={0}>
    <Link href="/workspace">
      <Text textStyle="tertiary.sm" color="primary">
        meldar
      </Text>
    </Link>
    <Text color="onSurface/20" aria-hidden>
      /
    </Text>
    <Heading
      as="h1"
      textStyle="primary.xs"
      color="onSurface"
      whiteSpace="nowrap"
      overflow="hidden"
      textOverflow="ellipsis"
    >
      {projectName}
    </Heading>
  </Flex>

  {/* Right: overflow menu */}
  <OverflowMenu subdomain={subdomain} phase={phase} />
</Flex>
```

### Changes from current
- Removed: `WorkspaceNav` render (the Build/Bookings/Settings tab bar below the top bar).
- Removed: `NewProjectButton`.
- Added: `OverflowMenu` on the right.
- Single row instead of two rows (was: top row + nav row). Height changes from variable (48px + nav) to fixed 52px.
- The 2px bottom border (`borderBlockEnd="2px solid" borderColor="onSurface"`) is the editorial ink rule from the existing design language.

### Responsive
- Mobile: Same layout. Project name truncates with ellipsis.
- Desktop: Same layout. No changes needed.

### Accessibility
- `as="header"` provides landmark.
- `<Heading as="h1">` for project name gives document structure.
- Logo link has visible text "meldar" (no icon-only link).
- Focus order: logo link, then overflow menu trigger.

---

## 4. OverflowMenu

Three-dot trigger that opens a dropdown with contextual items.

### Props
```typescript
type OverflowMenuProps = {
  readonly subdomain: string | null
  readonly phase: WorkspacePhase
}
```

### Trigger button
```tsx
<styled.button
  type="button"
  aria-label="Menu"
  aria-haspopup="menu"
  aria-expanded={open}
  onClick={toggle}
  display="inline-flex"
  alignItems="center"
  justifyContent="center"
  width="36px"
  height="36px"
  bg="transparent"
  border="none"
  borderRadius="md"
  cursor="pointer"
  color="onSurfaceVariant"
  _hover={{ bg: 'outlineVariant/10' }}
  _focusVisible={{
    outline: '2px solid",
    outlineColor: 'primary',
    outlineOffset: '2px',
  }}
>
  <MoreHorizontal size={18} />
</styled.button>
```

### Dropdown panel
```tsx
<Box
  position="absolute"
  insetBlockStart="100%"
  insetInlineEnd={0}
  marginBlockStart={1}
  minWidth="200px"
  bg="surfaceContainerLowest"
  border="1px solid"
  borderColor="outlineVariant/30"
  borderRadius="md"
  boxShadow="0 4px 16px rgba(0,0,0,0.08)"
  paddingBlock={1}
  zIndex={50}
  role="menu"
>
  {/* Items rendered conditionally based on phase */}
</Box>
```

### Menu item
```tsx
<styled.button
  type="button"
  role="menuitem"
  onClick={action}
  display="flex"
  alignItems="center"
  gap={3}
  width="100%"
  paddingBlock={2.5}
  paddingInline={4}
  bg="transparent"
  border="none"
  textAlign="left"
  cursor="pointer"
  _hover={{ bg: 'onSurface/4' }}
  _focusVisible={{
    outline: '2px solid',
    outlineColor: 'primary',
    outlineOffset: '-2px',
  }}
>
  <Icon size={15} color="var(--colors-on-surface-variant)" />
  <Text textStyle="label.md" color="onSurface">
    {label}
  </Text>
</styled.button>
```

### Conditional items
| Item | Icon | Condition | Action |
|---|---|---|---|
| My site | `ExternalLink` | `subdomain !== null` | Opens `https://{subdomain}` in new tab |
| Manage bookings | `Calendar` | `phase === 'managing'` | Opens bookings panel/route |
| Settings | `Settings` | Always | Opens settings panel |
| What was built | `FileCode2` | `phase === 'live' or 'managing'` | Opens code viewer panel |
| Separator | `<Box height="1px" bg="outlineVariant/20" marginBlock={1} />` | Always | Visual divider |
| All projects | `ArrowLeft` | Always | Navigates to `/workspace` |

### Accessibility
- Trigger: `aria-label="Menu"`, `aria-haspopup="menu"`, `aria-expanded`.
- Panel: `role="menu"`.
- Items: `role="menuitem"`.
- Keyboard: ArrowDown/ArrowUp to navigate items. Escape to close. Enter/Space to activate. Focus trapped within menu when open.
- Click-outside closes menu.

### States
| State | Behavior |
|---|---|
| Closed | Only trigger button visible |
| Open | Dropdown visible, focus on first item |
| Item hover | `bg: 'onSurface/4'` |
| Item focus | 2px primary outline |

---

## 5. WorkspaceMain

State-driven content area. Renders the appropriate view for the current phase.

### Props
```typescript
type WorkspaceMainProps = {
  readonly projectId: string
  readonly phase: WorkspacePhase
  readonly vertical: string | null
}
```

### Layout
```tsx
<Box flex="1" position="relative" minHeight={0} overflow="hidden">
  {phase === 'proposing' && (
    <ProposalView projectId={projectId} vertical={vertical} />
  )}
  {phase === 'planning' && <PlanningView />}
  {phase === 'building' && <BuildProgressView />}
  {(phase === 'live' || phase === 'managing') && (
    <PreviewPane
      previewUrl={previewUrl}
      activeBuildCardId={activeBuildCardId}
      failureMessage={failureMessage}
    />
  )}
</Box>
```

### Container styling
The container fills all available vertical space between TopBar and FeedbackBar (or bottom of viewport when FeedbackBar is hidden). `flex="1"` with `minHeight={0}` prevents content from pushing the layout.

---

## 6. ProposalView (PROPOSING state)

Centers the ProposalCard with contextual copy. This is what the user sees on first workspace entry.

### Layout
```tsx
<VStack
  gap={6}
  maxWidth="480px"
  marginInline="auto"
  paddingBlock={12}
  paddingInline={6}
  height="100%"
  justifyContent="center"
>
  <VStack gap={2} alignItems="center">
    <Heading as="h2" textStyle="primary.lg" color="onSurface" textAlign="center">
      Your booking page
    </Heading>
    <Text as="p" textStyle="secondary.sm" color="onSurfaceVariant" textAlign="center">
      Meldar picked these based on your business.
    </Text>
  </VStack>

  <ProposalCard
    wishes={proposal}
    onApprove={handleApprove}
    onEdit={handleEdit}
    loading={loading}
  />
</VStack>
```

### ProposalCard (enhanced)

The existing `ProposalCard` is structurally correct. Enhancements:

**Add vertical-specific rows.** The current card shows Style, Palette, Sections, Tone. For booking-type verticals, add:
- "Hours" row (e.g., "Mon-Fri 9-17")
- "Services" row (e.g., from onboarding vertical defaults)

**"Change something" inline edit mode.** When the user taps "Edit" / "Change something", rows become editable:

```tsx
{/* Read-only row */}
<Flex gap={3} alignItems="baseline">
  <Text textStyle="label.sm" color="onSurfaceVariant" flexShrink={0} minWidth="70px">
    {label}
  </Text>
  <Text textStyle="secondary.sm" color="onSurface">
    {value}
  </Text>
</Flex>

{/* Edit-mode row */}
<Flex gap={3} alignItems="center">
  <Text textStyle="label.sm" color="onSurfaceVariant" flexShrink={0} minWidth="70px">
    {label}
  </Text>
  <styled.input
    type="text"
    value={editValue}
    onChange={handleChange}
    flex={1}
    paddingBlock={1.5}
    paddingInline={2}
    bg="transparent"
    border="1px solid"
    borderColor="outlineVariant"
    borderRadius="sm"
    fontFamily="body"
    fontSize="sm"
    color="onSurface"
    _focus={{ borderColor: 'primary', outline: 'none' }}
  />
</Flex>
```

**Button text changes:**
- Primary: "Looks good" (arrow entity) when read-only. "Go" when in edit mode.
- Secondary: "Change something" when read-only. "Cancel" when in edit mode.

**Glass card styling (keep existing):**
```tsx
background="rgba(250, 249, 246, 0.7)"
backdropFilter="blur(20px) saturate(1.2)"
border="1px solid"
borderColor="outlineVariant/15"
borderRadius="xl"
boxShadow="0 2px 12px rgba(98,49,83,0.08)"
paddingBlock={6}
paddingInline={6}
```

### States
| State | Display |
|---|---|
| Loading proposal | "Choosing what to build..." with subtle pulse animation on a placeholder card |
| Proposal ready | ProposalCard with read-only rows |
| Editing | ProposalCard with editable rows, "Go" + "Cancel" buttons |
| Approving | ProposalCard with "Setting up..." in primary button, disabled |
| Error | Error text below card + "Try again" button |

### Responsive
- Mobile (< 768px): `maxWidth="100%"`, `paddingInline={4}`, `paddingBlock={8}`.
- Desktop: `maxWidth="480px"`, centered.

### Accessibility
- Heading announces the page type.
- ProposalCard rows are read as label-value pairs.
- Edit mode: inputs are labeled by the row label text.
- Primary action button has visible text.
- Focus moves to first editable input when entering edit mode.

---

## 7. BuildProgressView (BUILDING state)

Shows live progress during the auto-build pipeline.

### Layout
```tsx
<VStack
  gap={6}
  maxWidth="480px"
  marginInline="auto"
  paddingBlock={12}
  paddingInline={6}
  height="100%"
  justifyContent="center"
>
  <VStack gap={2} alignItems="center">
    <Heading as="h2" textStyle="primary.lg" color="onSurface" textAlign="center">
      Setting up your booking page
    </Heading>
    <Text as="p" textStyle="secondary.sm" color="onSurfaceVariant" textAlign="center">
      Choosing layout, adding your details, picking colors
    </Text>
  </VStack>

  {/* Progress bar */}
  <Box width="100%">
    <Box
      height="2px"
      bg="onSurface/10"
      borderRadius="full"
      overflow="hidden"
      position="relative"
    >
      <Box
        position="absolute"
        insetBlockStart={0}
        insetBlockEnd={0}
        insetInlineStart={0}
        width={`${progressPct}%`}
        bg="primary"
        transition="width 0.4s ease-out"
      />
    </Box>
    <Text
      textStyle="secondary.xs"
      color="onSurfaceVariant"
      textAlign="right"
      marginBlockStart={1}
    >
      {currentStep} of {totalSteps}
    </Text>
  </Box>

  {/* Step checklist */}
  <BuildStepList steps={steps} currentIndex={currentStepIndex} />
</VStack>
```

### BuildStepList

```tsx
<VStack gap={0} alignItems="stretch" width="100%">
  {steps.map((step, i) => (
    <Flex
      key={step.id}
      alignItems="center"
      gap={3}
      paddingBlock={2.5}
      paddingInline={3}
      borderBlockStart={i === 0 ? 'none' : '1px solid'}
      borderColor="outlineVariant/10"
    >
      {/* Status icon */}
      <Box
        width="18px"
        height="18px"
        display="flex"
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
      >
        {step.status === 'done' && (
          <Text textStyle="secondary.sm" color="primary">&#10003;</Text>
        )}
        {step.status === 'active' && (
          <Box
            width="8px"
            height="8px"
            borderRadius="50%"
            bg="primary"
            animation="softPulse 1.6s ease-in-out infinite"
          />
        )}
        {step.status === 'pending' && (
          <Box
            width="6px"
            height="6px"
            borderRadius="50%"
            bg="onSurfaceVariant/20"
          />
        )}
      </Box>

      {/* Step title */}
      <Text
        textStyle="secondary.sm"
        color={
          step.status === 'done'
            ? 'onSurfaceVariant'
            : step.status === 'active'
              ? 'onSurface'
              : 'onSurfaceVariant/40'
        }
        fontWeight={step.status === 'active' ? '500' : '300'}
      >
        {step.title}
      </Text>

      {/* "now" indicator */}
      {step.status === 'active' && (
        <Text textStyle="secondary.xs" color="primary" marginInlineStart="auto">
          now
        </Text>
      )}
    </Flex>
  ))}
</VStack>
```

### Step data mapping
The SSE event stream already provides `card_started` with `cardIndex` and `totalCards`. Each kanban card's `title` is the step label. Map card states:
- `built` -> `done`
- `building` / `queued` -> `active` (for the current card)
- `ready` / `draft` -> `pending`

### File-level progress
Below the step list, show the current file being written (from `file_written` SSE events):

```tsx
{latestFile && (
  <Text textStyle="secondary.xs" color="onSurfaceVariant/50" textAlign="center">
    Writing {latestFile.path.split('/').pop()}...
  </Text>
)}
```

This is secondary, de-emphasized text. It gives a sense of activity without exposing developer concepts. The file name is enough to show "something is happening" without requiring understanding.

### States
| State | Display |
|---|---|
| Pipeline starting | Heading + "Choosing layout..." + empty progress bar + all steps pending |
| Steps progressing | Progress bar fills + steps update to done/active/pending |
| Pipeline complete | All steps checked + brief pause before transitioning to LIVE |
| Pipeline failed | Failed step shows error icon (red dot) + error message below step list + "Try again" button |

### Responsive
Same as ProposalView: `maxWidth="480px"` centered on desktop, full-width with `paddingInline={4}` on mobile.

### Animation
- Progress bar: `transition="width 0.4s ease-out"` for smooth fill.
- Step checkmark: Use existing `checkIn` keyframe (`0%: scale(0.8), opacity(0)` -> `100%: scale(1), opacity(1)`) at 300ms.
- Active step pulse: Reuse existing `softPulse` keyframe on the 8px dot.
- On pipeline completion, hold the "all done" state for 800ms before transitioning to LIVE. This is the breath before the reveal.

---

## 8. PlanningView (PLANNING state)

Brief transitional state between proposal approval and build start.

### Layout
```tsx
<VStack
  gap={4}
  maxWidth="480px"
  marginInline="auto"
  paddingBlock={12}
  paddingInline={6}
  height="100%"
  justifyContent="center"
  alignItems="center"
>
  <Box
    width="40px"
    height="40px"
    borderRadius="50%"
    bg="primary"
    animation="softPulse 1.6s ease-in-out infinite"
  />
  <Heading as="h2" textStyle="primary.sm" color="onSurface" textAlign="center">
    Setting up your plan...
  </Heading>
  <Text textStyle="secondary.sm" color="onSurfaceVariant" textAlign="center">
    This takes a few seconds.
  </Text>
</VStack>
```

This state is transient (auto-transitions to BUILDING when the plan is generated and auto-build triggers). Typically visible for 2-5 seconds.

---

## 9. PreviewPane (LIVE state, simplified)

The preview iframe dominates the viewport. All empty-state placeholder content is removed.

### Props (simplified)
```typescript
type PreviewPaneProps = {
  readonly previewUrl: string
  readonly activeBuildCardId: string | null
  readonly failureMessage: string | null
}
```

Note: `previewUrl` is now required (non-null). PreviewPane only renders in LIVE/MANAGING states where a URL exists.

### Layout
```tsx
<Flex direction="column" flex="1" height="100%" position="relative" minWidth={0}>
  <Box
    flex="1"
    marginInline={4}
    marginBlock={3}
    border="1px solid"
    borderColor="outlineVariant/30"
    borderRadius="md"
    overflow="hidden"
  >
    <iframe
      key={cacheBuster}
      src={buildPreviewSrc(previewUrl, cacheBuster)}
      title="Live preview of your site"
      sandbox="allow-scripts allow-same-origin allow-forms"
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        display: 'block',
      }}
    />
  </Box>

  <BuildStatusOverlay
    activeBuildCardId={activeBuildCardId}
    failureMessage={failureMessage}
  />

  {/* First-time teaching prompt (inline, not modal) */}
  {showTeachingPrompt && (
    <TeachingPrompt onDismiss={dismissTeaching} />
  )}
</Flex>
```

### Teaching prompt (first visit only)
Shown once after the first preview renders. Dismisses on any interaction.

```tsx
<Flex
  position="absolute"
  insetBlockEnd="16px"
  insetInlineStart="50%"
  transform="translateX(-50%)"
  zIndex={10}
  alignItems="center"
  gap={2}
  paddingBlock={2.5}
  paddingInline={4}
  bg="onSurface"
  color="surface"
  borderRadius="full"
  boxShadow="0 4px 16px rgba(0,0,0,0.12)"
  animation="fadeInUp 0.4s ease-out"
>
  <Text as="span" textStyle="label.sm" color="surface">
    Point at anything to change it
  </Text>
</Flex>
```

### States
| State | Display |
|---|---|
| Preview loaded | Full iframe, no overlay |
| Updating (feedback submitted) | Iframe visible + BuildStatusOverlay "Updating..." pill |
| Update complete | Overlay "Updated" pill fades after 3s |
| Update failed | Overlay "Build failed" pill persists |

### Responsive
- Mobile: `marginInline={2}`, `marginBlock={2}`. Preview is nearly full-bleed.
- Desktop: `marginInline={4}`, `marginBlock={3}`. Subtle breathing room.

### Accessibility
- `title="Live preview of your site"` on iframe.
- BuildStatusOverlay uses `aria-live="polite"`.
- Teaching prompt auto-dismisses, not blocking.

---

## 10. FeedbackBar (simplified)

Fixed bottom bar for text feedback. Visible only in LIVE and MANAGING states.

### Props
```typescript
type FeedbackBarProps = {
  readonly onSubmit: (request: { instruction: string }) => Promise<void>
}
```

### Layout
```tsx
<Box
  bg="surface"
  borderBlockStart="1px solid"
  borderColor="outlineVariant/40"
  paddingBlock={3}
  paddingInline={4}
  flexShrink={0}
>
  <Flex direction="column" gap={2} maxWidth="720px" marginInline="auto">
    {/* Contextual hint */}
    <Text as="p" textStyle="label.sm" color="onSurfaceVariant">
      Point at anything above, or describe a change
    </Text>

    {/* Suggestion chips (shown for short instructions) */}
    {showChips && (
      <Flex gap={2} flexWrap="wrap" role="group" aria-label="Suggestions">
        {chips.map((chip) => (
          <styled.button
            key={chip}
            type="button"
            onClick={() => handleChipClick(chip)}
            paddingBlock={1}
            paddingInline={3}
            bg="outlineVariant/20"
            borderRadius="full"
            border="1px solid"
            borderColor="outlineVariant/40"
            cursor="pointer"
            _hover={{ bg: 'outlineVariant/30' }}
          >
            <Text as="span" textStyle="secondary.sm" color="onSurface">
              {chip}
            </Text>
          </styled.button>
        ))}
      </Flex>
    )}

    {/* Input row */}
    <Flex gap={2} alignItems="flex-end">
      <Box flex={1}>
        <styled.textarea
          ref={textareaRef}
          value={instruction}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder='e.g. "make the header darker" or "add my phone number"'
          disabled={submitting}
          rows={1}
          width="100%"
          minHeight="36px"
          maxHeight="96px"
          paddingBlock={2}
          paddingInline={3}
          border="1px solid"
          borderColor="outlineVariant"
          borderRadius="md"
          fontFamily="body"
          fontSize="sm"
          lineHeight="1.5"
          resize="none"
          overflow="auto"
          bg="transparent"
          color="onSurface"
          _focus={{ borderColor: 'primary', outline: 'none' }}
          _placeholder={{ color: 'onSurfaceVariant/50' }}
        />
      </Box>

      {/* Send button */}
      <styled.button
        type="button"
        aria-label="Send"
        onClick={handleSubmit}
        disabled={sendDisabled}
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
        width="36px"
        height="36px"
        flexShrink={0}
        bg={sendDisabled ? 'outlineVariant/20' : 'primary'}
        color={sendDisabled ? 'onSurfaceVariant' : 'onPrimary'}
        border="none"
        borderRadius="md"
        cursor={sendDisabled ? 'not-allowed' : 'pointer'}
        opacity={sendDisabled ? 0.5 : 1}
        _hover={sendDisabled ? {} : { bg: 'primary/90' }}
        _focusVisible={{
          outline: '2px solid',
          outlineColor: 'primary',
          outlineOffset: '2px',
        }}
      >
        <Send size={16} />
      </styled.button>
    </Flex>
  </Flex>
</Box>
```

### Removed from current FeedbackBar
- Paperclip attach button and entire attachment panel (reference URL, reference image).
- Stitch design tool recommendation.
- The 5-word minimum check that triggers chips regardless of instruction clarity.

### Kept from current FeedbackBar
- Auto-resizing textarea.
- Suggestion chips for short instructions.
- Enter-to-submit (Shift+Enter for newline).
- Send button with disabled state.

### Suggestion chips update
Replace the generic chips with context-aware suggestions:

```typescript
const SUGGESTION_CHIPS = [
  'Change the colors',
  'Add my phone number',
  'Make the text bigger',
]
```

These are phrased as actions a non-technical user would naturally say, not design jargon.

### States
| State | Display |
|---|---|
| Idle | Input placeholder visible, send button dimmed |
| Typing | Input has text, send button active (primary bg) |
| Short instruction entered | Chips appear above input |
| Submitting | Input disabled, send button dimmed |
| Submitted | Input clears, returns to idle |

### Responsive
- Mobile: `paddingInline={3}`, `maxWidth="100%"`. Full width.
- Desktop: Content capped at `maxWidth="720px"`, centered.

### Accessibility
- Textarea has visible label text above it ("Point at anything above, or describe a change").
- Send button: `aria-label="Send"`.
- Chips: wrapped in `role="group"` with `aria-label="Suggestions"`.
- Enter submits, Shift+Enter for newline (documented in placeholder).

---

## 11. BuildStatusOverlay (kept as-is)

No changes needed. The existing pills are correct:

- **Building pill**: Primary bg + softPulse animation + "Updating..." text.
- **Done pill**: Success bg + checkIn animation + "Updated" text. Fades after 3s.
- **Failed pill**: Error bg + "Build failed" text. Persists.

All use `aria-live="polite"` for screen reader announcements.

---

## 12. State Transitions and Animation

### Transition A: PROPOSING -> PLANNING -> BUILDING

```
ProposalCard "Looks good" clicked
  -> Button text changes to "Setting up..." (loading state)
  -> After plan generates, ProposalView fades out (200ms, ease-out)
  -> BuildProgressView fades in (300ms, ease-out, 100ms delay)
  -> First step starts building automatically
```

### Transition B: BUILDING -> LIVE

```
Pipeline complete (all steps checked)
  -> Hold "all done" state for 800ms
  -> BuildProgressView fades out (300ms, ease-out)
  -> PreviewPane fades in top-to-bottom (600ms, ease-out)
     (This is the "printing" metaphor from the Visual Narrative:
      content appears as if being laid onto paper)
  -> Teaching prompt appears (400ms, fadeInUp) after preview loads
  -> FeedbackBar slides up from bottom (300ms, ease-out)
```

### Transition C: Feedback iteration cycle (LIVE -> brief BUILDING -> LIVE)

```
User submits feedback in FeedbackBar
  -> BuildStatusOverlay shows "Updating..." pill
  -> Preview iframe stays visible (no phase change to BUILDING)
  -> When build completes, iframe refreshes via cacheBuster
  -> Overlay shows "Updated" pill (fades after 3s)
  -> Changed element in iframe gets a brief peach (#FFB876) outline glow (200ms appear, 800ms fade)
```

Note: Single-card feedback builds do NOT transition to the BUILDING view. The preview stays visible with the overlay pill. Only the initial auto-build pipeline uses BuildProgressView.

### Container transitions
```tsx
{/* In WorkspaceMain, use CSS transitions on children */}
<Box flex="1" position="relative" minHeight={0}>
  {/* Each phase view handles its own enter/exit animation */}
  {/* Use opacity + transform transitions */}
</Box>
```

Phase views use a shared fade pattern:
```tsx
// Enter: opacity 0 -> 1, translateY(8px) -> 0
// Exit: opacity 1 -> 0
// Duration: 300ms ease-out
```

---

## 13. Responsive Behavior

### Breakpoints

| Breakpoint | Name | Layout changes |
|---|---|---|
| < 768px | Mobile | Single column. Preview full-bleed. FeedbackBar full-width. |
| >= 768px | Desktop | Content areas get horizontal padding. Preview has margin. |

### Mobile-specific adjustments

**WorkspaceTopBar:**
- Height stays 52px.
- Project name truncates aggressively (max 50% width).
- Overflow menu trigger is the same 36px button.

**ProposalView:**
- `paddingInline={4}` instead of 6.
- `paddingBlock={8}` instead of 12.
- ProposalCard takes full width.

**BuildProgressView:**
- Same narrowing as ProposalView.
- Progress text and step list use full width.

**PreviewPane:**
- `marginInline={2}`, `marginBlock={2}`. Nearly full-bleed.
- Teaching prompt has `insetBlockEnd="12px"` and smaller padding.

**FeedbackBar:**
- `paddingInline={3}`.
- Textarea and send button take full width.
- Chips wrap naturally.

### No sidebars on mobile
The workspace is always a single vertical stack on mobile. No split panes, no sidebars, no drawers. The preview is the full viewport width minus 4px margins.

### Desktop enhancements
On desktop, the LIVE state could optionally show a narrow context panel on the right (for "What was built" or teaching content), but this is Phase 3 and not specified here. The default desktop layout is still single-column, preview-dominant.

---

## 14. Accessibility Requirements

### Document structure
```
<header> (WorkspaceTopBar)
  <h1> Project name
<main> (WorkspaceMain)
  <h2> Phase-specific heading ("Your booking page", "Setting up...", etc.)
<footer> (FeedbackBar, when visible)
```

### Focus management

| Event | Focus behavior |
|---|---|
| Workspace loads in PROPOSING | Focus on ProposalCard primary button |
| Transition to BUILDING | Focus on heading "Setting up your booking page" |
| Transition to LIVE | Focus on preview iframe |
| FeedbackBar appears | No auto-focus (user initiated) |
| Overflow menu opens | Focus on first menu item |
| Overflow menu closes | Focus returns to trigger button |
| Build error | Focus on error message (via `tabIndex={-1}` + ref.focus()) |

### Keyboard navigation

| Component | Keys |
|---|---|
| OverflowMenu | ArrowDown/Up to navigate, Enter/Space to activate, Escape to close |
| FeedbackBar textarea | Enter to submit, Shift+Enter for newline, Tab to send button |
| ProposalCard | Tab through action buttons, Enter/Space to activate |
| Suggestion chips | Tab to navigate between chips, Enter/Space to select |

### ARIA attributes summary

| Element | Attributes |
|---|---|
| TopBar | `<header>` landmark |
| Menu trigger | `aria-label="Menu"`, `aria-haspopup="menu"`, `aria-expanded` |
| Menu panel | `role="menu"` |
| Menu items | `role="menuitem"` |
| Preview iframe | `title="Live preview of your site"` |
| Status overlay | `aria-live="polite"` |
| FeedbackBar label | Visible `<Text>` element above input |
| Send button | `aria-label="Send"` |
| Chip group | `role="group"`, `aria-label="Suggestions"` |
| Build step list | Semantic list, no special ARIA needed (visual indicators have text equivalents) |
| Error states | `aria-live="assertive"` |
| Teaching prompt | `role="status"` |

### Color contrast
All text/background combinations meet WCAG 2.1 AA:
- `onSurface` (#1a1c1a) on `surface` (#faf9f6): 15.8:1
- `onSurfaceVariant` (#4f434a) on `surface` (#faf9f6): 7.3:1
- `onPrimary` (#ffffff) on `primary` (#623153): 7.1:1
- `surface` (#faf9f6) on `primary` (#623153): 6.5:1
- `primary` (#623153) on `surface` (#faf9f6): 6.5:1

### Reduced motion
All animations respect `prefers-reduced-motion`:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```
This should be added to `globals.css` if not already present.

---

## 15. Park UI Components to Reuse vs Custom

### Reuse from Park UI

| Park UI component | Where used | Notes |
|---|---|---|
| Button recipe (`button` from `@styled-system/recipes`) | ProposalCard primary/secondary buttons, error retry buttons | Already in `src/shared/ui/button.tsx`. Use `variant="solid"` for primary, `variant="outline"` for secondary. |

### Custom (keep building with primitives)

| Component | Why custom |
|---|---|
| OverflowMenu | Park UI's Menu component uses Ark UI which adds significant bundle weight. A simple `useState` + click-outside + keyboard handler is lighter and sufficient. |
| FeedbackBar textarea | Needs auto-resize behavior and custom styling that doesn't map to any Park UI component. |
| BuildStepList | Simple list with status indicators. No matching Park UI component. |
| ProposalCard | Already custom with glass card styling. Keep it. |
| BuildStatusOverlay | Already custom. The pill design is specific to Meldar. |

### Why minimal Park UI usage
The workspace is a highly custom experience. Park UI's value is in form controls (inputs, selects, dialogs) and data display (tables, cards). The workspace uses mostly custom layout + typography + simple interactive elements. Pulling in Ark UI primitives for the menu would add ~15KB to the bundle for a feature that needs 30 lines of custom code.

---

## 16. Token and Style Reference

Quick reference for the tokens used across all components in this spec.

### Colors used
| Token | Value | Usage |
|---|---|---|
| `surface` | #faf9f6 | Page background, bar backgrounds |
| `onSurface` | #1a1c1a | Primary text, ink rules |
| `onSurfaceVariant` | #4f434a | Secondary text, labels |
| `primary` | #623153 | Brand color, active states, buttons |
| `onPrimary` | #ffffff | Text on primary backgrounds |
| `outlineVariant` | #d3c2ca | Borders, dividers (usually with /30 or /40 opacity) |
| `surfaceContainerLowest` | #ffffff | Menu dropdown background |
| `success` | #22c55e | Done state indicator |
| `error` | #ef4444 | Error state indicator |
| `secondaryLight` | #FFB876 | Peach accent (changed-element glow) |

### Text styles used
| Token | Usage |
|---|---|
| `primary.lg` | Phase headings ("Your booking page", "Setting up...") |
| `primary.sm` | Planning view heading |
| `primary.xs` | Project name in top bar |
| `tertiary.sm` | "meldar" logo text in top bar |
| `secondary.sm` | Body text, step labels, proposal row values |
| `secondary.xs` | Progress counts, file names, timestamps |
| `label.sm` | FeedbackBar hint, proposal row labels, menu item labels, status labels |
| `label.md` | Menu item text |
| `button.sm` | Small button labels |

### Spacing patterns
| Pattern | Values |
|---|---|
| Page-level padding | `paddingInline={6}` desktop, `paddingInline={4}` mobile |
| Card internal padding | `paddingBlock={6} paddingInline={6}` |
| Component gap (tight) | `gap={2}` or `gap={3}` |
| Component gap (section) | `gap={6}` |
| Top bar height | `52px` |
| Input/button height | `36px` minimum |
| Touch target | `44px` minimum for interactive elements on mobile |

### Animation keyframes (existing, reused)
| Keyframe | Used by |
|---|---|
| `softPulse` | Active build step dot, planning state dot |
| `checkIn` | Completed step checkmark |
| `fadeInUp` | Teaching prompt, phase transitions |
| `toastSlideIn` | Status overlay pills |

---

## 17. Implementation Notes

### What NOT to build yet

These are described in the UX Architecture and Visual Narrative but deferred beyond this spec:

1. **Visual feedback tool (click-to-comment on iframe elements).** Requires iframe injection script, postMessage protocol, and element metadata extraction. Killer feature but architecturally complex. Separate spec needed.

2. **"What was built" on-demand panel.** The code viewer from ArtifactPane moves here. Accessible from overflow menu. Phase 3.

3. **Manage bookings inline panel.** The MANAGING state with bookings integration. Phase 3.

4. **Settings inline panel.** Business name, services, hours editing from the overflow menu. Phase 2.

5. **Multi-project support.** The project selector at `/workspace`. Deferred until needed.

6. **Conversation panel / chat history.** The Visual Narrative describes the onboarding chat sliding to become a side panel. This requires deeper architectural work on the onboarding-to-workspace transition.

### What to build in order

**Sprint 1 (Core flow):**
1. `WorkspaceMain` state router
2. `ProposalView` with enhanced `ProposalCard`
3. `BuildProgressView` with `BuildStepList`
4. Simplified `PreviewPane` (remove empty state)
5. Simplified `FeedbackBar` (remove attachment UI)
6. Simplified `WorkspaceTopBar` (remove WorkspaceNav, add OverflowMenu)
7. Updated `WorkspaceShell` (phase-driven rendering)
8. Delete: TaskListPane, ArtifactPane, WorkspaceNav, WorkspaceBottomBar, OnboardingChat, WorkspaceEmptyState, ContinueBanner, StepIndicator, NewProjectButton

**Sprint 2 (Polish):**
9. Phase transition animations
10. Teaching prompt on first LIVE state
11. Settings panel from overflow menu
12. Reduced motion support

### File structure after implementation

```
src/widgets/workspace/
  WorkspaceShell.tsx        (simplified)
  WorkspaceMain.tsx         (new — state router)
  WorkspaceTopBar.tsx       (simplified)
  OverflowMenu.tsx          (new)
  ProposalView.tsx          (new)
  BuildProgressView.tsx     (new)
  BuildStepList.tsx         (new)
  PreviewPane.tsx           (simplified)
  BuildStatusOverlay.tsx    (kept as-is)
  lib/
    build-status.ts         (kept)
    preview-url.ts          (kept)
    handle-sse-event.ts     (kept)

src/features/visual-feedback/ui/
  FeedbackBar.tsx           (simplified)

src/features/glass-plan/ui/
  ProposalCard.tsx          (enhanced)
```
