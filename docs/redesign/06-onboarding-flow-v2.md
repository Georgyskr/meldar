# 06 — Onboarding Flow v2: 3-Step Adaptive Quiz

A 3-step guided wizard with pre-filled defaults from vertical selection. Optional website URL fast-track between steps 1 and 2. Progressive profiling during the build wait. The user goes from zero to a building booking page in 10-35 seconds. Nobody sees a blank workspace.

Cross-references: 01-ux-research-findings.md (problem IDs), 02-ux-architecture.md (page hierarchy, propose-and-go), 03-visual-narrative.md (emotional journey, copy rules), 04-ui-design-spec.md (component specs, tokens), 05-onboarding-data-strategy.md (data sources, LinkedIn verdict, quiz design).

---

## 1. Flow Overview

```
                    /sign-up (or /login)
                           |
                    /onboarding
                           |
              Step 1: "What's your business?"
              (vertical picker + business name)
                           |
              [Optional: "Got a website?"]
              (URL input — if provided, auto-fills Steps 2+3)
                           |
              Step 2: "What do you offer?"
              (pre-filled service editor)
                           |
              Step 3: "When are you available?"
              (pre-filled day + time picker)
                           |
              "Set up my page" triggers:
              → POST /api/onboarding (full data)
              → Auto-build pipeline starts
              → Redirect to /workspace/[projectId]
                           |
              [Progressive profiling during build]
              (phone, about, location — optional, skippable)
                           |
              State: BUILDING → LIVE
```

### Design principles

1. **Every step collects data that flows into the build prompt.** No decorative steps. No "welcome" interstitials.
2. **The system always proposes first.** Pre-filled defaults from vertical selection. The user confirms or overrides — never composes from scratch. (Propose-and-go from 02-ux-architecture.md.)
3. **Mobile-first, phone-in-hand.** Every element is a tap target >= 44px. No horizontal scrolling. No hover-dependent interactions.
4. **No developer language.** "Setting up your page" not "building." "Your services" not "default configuration." See 03-visual-narrative.md, Section 3 for the full always/never table.
5. **Three steps is the ceiling.** Each additional screen costs ~15-20% completion rate (05-onboarding-data-strategy.md). The website URL and progressive profiling are optional and never gate the build.

### Why no LinkedIn path

LinkedIn self-serve OAuth (Sign In with LinkedIn using OpenID Connect) returns only name, email, and photo — identical to Google OAuth which Meldar already has. The Partner APIs that expose headline, industry, and position data require a weeks-to-months approval process. Scraping is legally risky and unreliable. The engineering investment yields zero additional data signal. See 05-onboarding-data-strategy.md, Section 1 for the full analysis.

---

## 2. Step 1: "What's your business?"

Vertical picker + business name. The entry point. Determines all downstream defaults.

### ASCII wireframe (mobile, 375px)

```
+-------------------------------+
|  meldar           Step 1 of 3 |
+-------------------------------+
|                               |
|   What's your business?       |
|                               |
|   +-------+  +-------+       |
|   | [sci] |  | [dumb]|       |
|   | Hair  |  | PT /  |       |
|   | Beauty|  | Well. |       |
|   +-------+  +-------+       |
|   +-------+  +-------+       |
|   | [pen] |  | [brie]|       |
|   |Tattoo |  |Consult|       |
|   |Pierc. |  | ing   |       |
|   +-------+  +-------+       |
|   +-------+  +-------+       |
|   | [cam] |  | [store|       |
|   | Photo |  | Other |       |
|   +-------+  +-------+       |
|                               |
|   What's it called?           |
|   [ Studio Irka             ] |
|                               |
|   +-------------------------+ |
|   |  Next -->               | |
|   +-------------------------+ |
|                               |
+-------------------------------+
```

### ASCII wireframe (desktop, 1280px)

```
+------------------------------------------------------------------+
|  meldar                                         Step 1 of 3      |
+------------------------------------------------------------------+
|                                                                  |
|              What's your business?                               |
|                                                                  |
|    +--------+ +--------+ +--------+ +--------+ +--------+       |
|    | [sci]  | | [dumb] | | [pen]  | | [brief]| | [cam]  |       |
|    | Hair / | | PT /   | | Tattoo | | Consult| | Photo  |       |
|    | Beauty | | Welln. | | Pierc. | | ing    | | graphy |       |
|    +--------+ +--------+ +--------+ +--------+ +--------+       |
|                           +--------+                             |
|                           | [store]|                             |
|                           | Other  |                             |
|                           +--------+                             |
|                                                                  |
|              What's it called?                                   |
|              [ Studio Irka                                ]      |
|                                                                  |
|              +------------------------------------------+        |
|              |  Next -->                                |        |
|              +------------------------------------------+        |
|                                                                  |
+------------------------------------------------------------------+
```

### Copy

| Element | Text |
|---|---|
| Heading | "What's your business?" |
| Step indicator | "Step 1 of 3" (top right, secondary text) |
| Business name label | "What's it called?" |
| Business name placeholder | "e.g. Studio Mia" |
| Primary button | "Next" (with right arrow) |

### Verticals (expanded from 5 to 6)

| ID | Label | Icon (lucide) |
|---|---|---|
| `hair-beauty` | Hair / Beauty | `Scissors` |
| `pt-wellness` | PT / Wellness | `Dumbbell` |
| `tattoo-piercing` | Tattoo / Piercing | `Pen` |
| `consulting` | Consulting | `Briefcase` |
| `photography` | Photography | `Camera` |
| `other` | Other | `Store` |

**Why 6 instead of 5:** Photography is one of the most common solo service businesses. Adding it prevents the "I don't see myself" feeling for a significant user segment (see 01-ux-research, P1-5). Each new vertical requires a corresponding entry in `BOOKING_VERTICALS` with default services, hours, and slot duration.

**"Other" is not a dead end.** When the user selects "Other," the business name input becomes more prominent with helper text: "Tell us what you do and we'll pick the right setup." The business name is then used (in addition to the vertical defaults) to customize the build prompt. e.g., "Dog grooming" as a business name with "Other" vertical produces a more tailored result than "Other" alone.

### Data collected

| Field | Type | Required | Maps to |
|---|---|---|---|
| Vertical | Single select from 6 cards | Yes | `verticalId` in project creation, determines all defaults |
| Business name | Free text, max 80 chars | No (defaults to "My [vertical] business") | `projectName`, build prompt `businessName`, page header |

### Layout spec

- Step indicator: `<Text textStyle="label.sm" color="onSurfaceVariant">` in the top bar, right-aligned.
- Vertical cards: `Grid gridTemplateColumns="repeat(2, 1fr)" gap={3}` on mobile, `repeat(3, 1fr)` from 480px, `repeat(5, 1fr)` from 768px. Each card is a `<button>` with `paddingBlock={5} paddingInline={4}`, vertically centered icon + label. Min height 88px for touch targets.
- Selected state: `border="2px solid" borderColor="primary" bg="primary/5"`.
- Unselected state: `border="1px solid" borderColor="onSurface/15" bg="surface"`.
- Business name input: Same styling as current `OnboardingFlow.tsx` input. `width="100%" paddingInline={4} paddingBlock={3} border="1px solid" borderColor="onSurface/15" bg="surface"`.
- "Next" button: Full width, `bg="onSurface" color="surface"`, disabled until vertical selected. `paddingBlock={4}`.
- Overall container: `maxWidth="540px"`, centered. `paddingInline={6}` desktop, `paddingInline={4}` mobile. `paddingBlock={12}` desktop, `paddingBlock={8}` mobile.

### Validation

| Rule | Handling |
|---|---|
| No vertical selected | Button disabled (no error message — visual state is sufficient) |
| Business name > 80 chars | Input stops accepting characters (maxLength attribute) |

### Accessibility

- Vertical cards are `role="radiogroup"` with `aria-label="Business type"`. Each card is `role="radio"` with `aria-checked`.
- Business name input has a visible label ("What's it called?").
- Step indicator is decorative (does not affect navigation).
- Focus order: vertical cards (in grid order), business name input, next button.

---

## 3. Optional: "Got a website?"

Shown between Step 1 and Step 2. The best non-quiz data source (see 05-onboarding-data-strategy.md, Section 2). If the user provides a URL, the server extracts business data and pre-fills Steps 2 and 3 with real data instead of vertical defaults.

### ASCII wireframe (mobile, 375px)

```
+-------------------------------+
|  meldar                       |
+-------------------------------+
|                               |
|   Got a website?              |
|                               |
|   Paste your URL and we'll    |
|   grab your services and      |
|   hours automatically.        |
|                               |
|   [ https://studioirka.fi  ] |
|                               |
|   +-------------------------+ |
|   |  Grab my details -->    | |
|   +-------------------------+ |
|                               |
|   [ Skip — I'll type it    ] |
|                               |
+-------------------------------+
```

### ASCII wireframe — loading state

```
+-------------------------------+
|  meldar                       |
+-------------------------------+
|                               |
|   Reading your website...     |
|                               |
|   [  ========-------     ]   |
|                               |
|   This takes a few seconds.   |
|                               |
+-------------------------------+
```

### ASCII wireframe — extraction result

```
+-------------------------------+
|  meldar                       |
+-------------------------------+
|                               |
|   We found these on           |
|   your site                   |
|                               |
|   +-------------------------+ |
|   | Services                | |
|   | Haircut        EUR 40   | |
|   | Highlights     EUR 95   | |
|   | Extensions     EUR 150  | |
|   |                         | |
|   | Hours                   | |
|   | Tue-Sat 10:00-18:00     | |
|   |                         | |
|   | Location                | |
|   | Kallio, Helsinki        | |
|   +-------------------------+ |
|                               |
|   Look right?                 |
|                               |
|   +-------------------------+ |
|   |  Looks good -->         | |
|   +-------------------------+ |
|                               |
|   [ Let me adjust these    ] |
|                               |
+-------------------------------+
```

### Copy

| Element | Text |
|---|---|
| Heading | "Got a website?" |
| Helper text | "Paste your URL and we'll grab your services and hours automatically." |
| URL placeholder | "https://yourbusiness.com" |
| Submit button | "Grab my details" (with right arrow) |
| Skip link | "Skip — I'll type it myself" |
| Loading heading | "Reading your website..." |
| Loading helper | "This takes a few seconds." |
| Result heading | "We found these on your site" |
| Result confirm prompt | "Look right?" |
| Result confirm button | "Looks good" (with right arrow) |
| Result adjust link | "Let me adjust these" |

### Interaction flow

1. User pastes URL, taps "Grab my details."
2. Client sends URL to `POST /api/onboarding/extract-website`.
3. Server fetches the page, extracts text, sends to Claude with a structured extraction prompt.
4. Server returns extracted services, hours, location, about text.
5. Client shows extraction result card.
6. "Looks good" -> skips Steps 2 and 3, goes directly to auto-build trigger.
7. "Let me adjust these" -> navigates to Step 2 with extracted data pre-filled (instead of vertical defaults).

### Data mapping

| Extracted field | Maps to | Fallback if not found |
|---|---|---|
| Services (name, duration, price) | Pre-fills Step 2 service editor | Vertical defaults |
| Hours (days, start, end) | Pre-fills Step 3 availability picker | Vertical defaults |
| Location | Stored as wish, injected into build prompt | Omitted |
| About text | Stored as wish, injected into build prompt | Generated from vertical + business name |

### Layout spec

- Same container dimensions as Step 1.
- URL input: Full width, `paddingInline={4} paddingBlock={3}`, same input styling.
- Skip link: `<Text textStyle="secondary.sm" color="onSurfaceVariant" textDecoration="underline">`, centered below the submit button.
- Loading state: Centered progress bar (2px, `bg="primary"`, animated width) + secondary text.
- Result card: Glass-card styling (`bg="surface/90" backdropFilter="blur(20px)" border="1px solid" borderColor="outlineVariant/15" borderRadius="xl" paddingBlock={5} paddingInline={5}`).

### Error states

| Scenario | Handling |
|---|---|
| URL invalid (not a URL) | Inline message: "Enter a full URL like https://yourbusiness.com" |
| Server can't fetch the URL (timeout, 404) | Inline message: "Couldn't reach that site. You can type your details instead." Falls through to Step 2 with vertical defaults. |
| Extraction returns no useful data | Inline message: "We couldn't find services on that page. No worries — you can type them." Falls through to Step 2 with vertical defaults. |
| Extraction partially succeeds | Show what was found. Missing fields fall back to vertical defaults in Steps 2/3. |

### Accessibility

- URL input has visible label text ("Got a website?").
- Skip link is a `<button>` with visible text.
- Loading state: progress bar has `role="progressbar"` with `aria-label="Reading website"`.
- Result card: content is read naturally by screen readers (no special ARIA needed).

### Cost and latency

- Server-side fetch + Claude extraction: ~$0.01 per call, 2-5 seconds latency.
- The loading state masks the latency. If it exceeds 8 seconds, show "Taking longer than expected... you can skip and type it instead."

---

## 4. Step 2: "What do you offer?"

Service editor with pre-filled defaults from the selected vertical (or from website extraction). The propose-and-go pattern in action: Meldar guesses, the user corrects.

### ASCII wireframe (mobile, 375px)

```
+-------------------------------+
|  meldar           Step 2 of 3 |
+-------------------------------+
|                               |
|   What do you offer?          |
|                               |
|   We guessed these —          |
|   change what's wrong.        |
|                               |
|   +-------------------------+ |
|   | Haircut                 | |
|   | 45 min   EUR 45     [x]| |
|   +-------------------------+ |
|   +-------------------------+ |
|   | Color                   | |
|   | 90 min   EUR 85     [x]| |
|   +-------------------------+ |
|   +-------------------------+ |
|   | Blowout                 | |
|   | 30 min   EUR 35     [x]| |
|   +-------------------------+ |
|                               |
|   [ + Add a service         ] |
|                               |
|   +-------------------------+ |
|   |  Next -->               | |
|   +-------------------------+ |
|                               |
|   [ <-- Back                ] |
|                               |
+-------------------------------+
```

### ASCII wireframe (desktop, 1280px)

```
+------------------------------------------------------------------+
|  meldar                                         Step 2 of 3      |
+------------------------------------------------------------------+
|                                                                  |
|              What do you offer?                                  |
|              We guessed these — change what's wrong.             |
|                                                                  |
|              +--------------------------------------------+      |
|              | Service name       Duration    Price       |      |
|              +--------------------------------------------+      |
|              | [ Haircut        ] [ 45 min ] [ EUR 45 ] X |      |
|              | [ Color          ] [ 90 min ] [ EUR 85 ] X |      |
|              | [ Blowout        ] [ 30 min ] [ EUR 35 ] X |      |
|              +--------------------------------------------+      |
|                                                                  |
|              [ + Add a service ]                                 |
|                                                                  |
|              [ <-- Back ]          [ Next --> ]                   |
|                                                                  |
+------------------------------------------------------------------+
```

### Copy

| Element | Text |
|---|---|
| Heading | "What do you offer?" |
| Step indicator | "Step 2 of 3" |
| Helper text | "We guessed these — change what's wrong." |
| Helper text (website variant) | "We found these on your site — change what's wrong." |
| Service name placeholder (new row) | "e.g. Deep conditioning" |
| Duration placeholder | "min" |
| Price placeholder | "EUR" |
| Add button | "+ Add a service" |
| Primary button | "Next" (with right arrow) |
| Back link | "Back" (with left arrow) |

### Data collected

| Field | Type | Required | Validation |
|---|---|---|---|
| Service name | Text, max 60 chars | At least 1 service | Non-empty |
| Duration | Number, minutes | Yes per service | 5-480 range |
| Price | Number, EUR | Yes per service | 0-9999 range (0 = free) |

### Pre-filled defaults

Loaded from `BOOKING_VERTICALS[selectedVertical].defaultServices`, or from website extraction if the user provided a URL. Each service becomes an editable row with values pre-populated.

### Interaction details

- **Edit a default:** Tap the field, change the value. Inline editing, no modal.
- **Remove a service:** Tap the X button on the row. Removes immediately. If only 1 service remains, the X button is hidden (minimum 1 service required).
- **Add a service:** Tap "+ Add a service." Appends a new empty row at the bottom. Focus moves to the new service name input. Maximum 10 services (the add button disappears at 10).
- **Reorder:** Not supported in v1. Simplicity over flexibility.

### Data mapping to build prompt

```json
{
  "services": [
    { "name": "Haircut", "durationMinutes": 45, "priceEur": 45 },
    { "name": "Color", "durationMinutes": 90, "priceEur": 85 },
    { "name": "Blowout", "durationMinutes": 30, "priceEur": 35 }
  ]
}
```

Each service becomes a card on the booking page with the exact name, duration, and price the user entered.

### Layout spec

- Container: Same `maxWidth="540px"` centered layout.
- Service rows: `Flex direction="column" gap={3}`.
- Each row: Glass-card styled container (`bg="surface" border="1px solid" borderColor="onSurface/15" paddingBlock={3} paddingInline={4}`).
  - Service name: Full width text input on top line.
  - Duration + price: Two inputs on bottom line, `Flex gap={3}`. Duration: `width="100px"`. Price: `width="100px"`. Both right-aligned in their containers.
  - Remove button: `X` icon button, `position="absolute" insetBlockStart={2} insetInlineEnd={2}`, `width="28px" height="28px"`, `color="onSurfaceVariant/40"`, `_hover={{ color: "onSurface" }}`.
- On desktop: Service rows show all 3 fields in a single horizontal line (name takes remaining space, duration and price are fixed width).
- Add button: `<button>` styled as a dashed-border row: `border="1px dashed" borderColor="onSurface/15" paddingBlock={3}`, full width, `color="onSurfaceVariant"`.
- Back link: Text button, left-aligned. `<Text textStyle="secondary.sm" color="onSurfaceVariant">`.
- Next button: Primary button, right-aligned on desktop, full-width on mobile.
- On desktop: Back and Next are in a `Flex justifyContent="space-between"` row.

### Validation

| Rule | Message |
|---|---|
| No services | "Add at least one service" (inline, below the add button) |
| Service name empty | Red border on the input, no text message (self-evident) |
| Duration outside 5-480 | Input border turns red. No toast — field-level feedback only. |
| Price outside 0-9999 | Same field-level red border. |

### Accessibility

- Each service row is a `<fieldset>` with the service name as the implicit label.
- Remove button: `aria-label="Remove [service name]"`.
- Add button: `aria-label="Add a service"`.
- Duration input: `aria-label="Duration in minutes"`.
- Price input: `aria-label="Price in EUR"`.
- Error states: `aria-invalid="true"` on invalid inputs.

---

## 5. Step 3: "When are you available?"

Day picker and time range. Pre-filled from vertical defaults (or website extraction).

### ASCII wireframe (mobile, 375px)

```
+-------------------------------+
|  meldar           Step 3 of 3 |
+-------------------------------+
|                               |
|   When are you available?     |
|                               |
|   +--+--+--+--+--+--+--+     |
|   |Mo|Tu|We|Th|Fr|Sa|Su|     |
|   |  |##|##|##|##|##|  |     |
|   +--+--+--+--+--+--+--+     |
|                               |
|   Hours                       |
|   [ 10:00 ]  to  [ 18:00 ]   |
|                               |
|   You can change these        |
|   anytime in settings.        |
|                               |
|   +-------------------------+ |
|   |  Set up my page -->     | |
|   +-------------------------+ |
|                               |
|   [ <-- Back                ] |
|                               |
+-------------------------------+
```

### Copy

| Element | Text |
|---|---|
| Heading | "When are you available?" |
| Step indicator | "Step 3 of 3" |
| Hours label | "Hours" |
| Time separator | "to" |
| Helper text | "You can change these anytime in settings." |
| Primary button | "Set up my page" (with right arrow) |
| Back link | "Back" (with left arrow) |

### Data collected

| Field | Type | Required | Validation |
|---|---|---|---|
| Available days | Multi-select, Mon-Sun | At least 1 day | Min 1 selected |
| Start time | Time picker (HH:MM) | Yes | Valid time, before end time |
| End time | Time picker (HH:MM) | Yes | Valid time, after start time |

### Pre-filled defaults

From `BOOKING_VERTICALS[selectedVertical].defaultHours`:
- Hair/Beauty: Tue-Sat, 10:00-18:00
- PT/Wellness: Mon-Fri, 08:00-20:00
- Tattoo/Piercing: Tue-Sat, 11:00-19:00
- Consulting: Mon-Fri, 09:00-17:00
- Photography: Mon-Fri, 09:00-18:00 (new)
- Other: Mon-Fri, 09:00-17:00

Or from website extraction if the user provided a URL and hours were found.

### Day picker spec

Seven toggle buttons in a horizontal row. Each is a square with the 2-letter day abbreviation.

- Size: `width="40px" height="40px"` each.
- Selected: `bg="onSurface" color="surface"`.
- Unselected: `bg="transparent" color="onSurface" border="1px solid" borderColor="onSurface/15"`.
- Hover (unselected): `bg="onSurface/5"`.
- Row: `Flex gap={1} justifyContent="center"`.

### Time picker spec

Two `<input type="time">` fields with `step="1800"` (30-min increments). Native time picker on mobile. Styled with the same input treatment as other form fields.

- Width: `120px` each.
- "to" separator: `<Text textStyle="secondary.sm" color="onSurfaceVariant">`.

### Data mapping to build prompt

```json
{
  "hours": {
    "days": ["tue", "wed", "thu", "fri", "sat"],
    "start": "10:00",
    "end": "18:00"
  }
}
```

### Layout spec

- Same container as previous steps.
- Day picker is centered.
- Time inputs are in a `Flex gap={3} alignItems="center" justifyContent="center"` row.
- Helper text is `<Text textStyle="secondary.xs" color="onSurfaceVariant" textAlign="center">`.
- Button layout: Same as Step 2 (back left, next right on desktop; stacked on mobile).
- The primary button text changes from "Next" to "Set up my page" — this is the final user action before the build starts.

### Validation

| Rule | Message |
|---|---|
| No days selected | "Pick at least one day" (inline, below day picker) |
| Start >= end | "End time must be after start time" (inline, below time inputs) |

### Accessibility

- Day buttons: `role="group"` with `aria-label="Available days"`. Each button is `role="checkbox"` with `aria-checked` and `aria-label` (full day name: "Monday", "Tuesday", etc.).
- Time inputs: `aria-label="Start time"` and `aria-label="End time"`.

---

## 6. Convergence: What Happens After "Set up my page"

### Trigger sequence

When the user taps "Set up my page" (Step 3) or "Looks good" (website extraction confirm):

```
1. Client sends POST /api/onboarding with:
   {
     verticalId: "hair-beauty",
     businessName: "Studio Irka",
     services: [
       { name: "Haircut", durationMinutes: 45, priceEur: 40 },
       { name: "Highlights", durationMinutes: 90, priceEur: 95 },
       { name: "Extensions", durationMinutes: 120, priceEur: 150 }
     ],
     hours: {
       days: ["tue", "wed", "thu", "fri", "sat"],
       start: "10:00",
       end: "18:00"
     },
     websiteUrl: "https://studioirka.fi" | null,
     extraData: {
       location: "Kallio, Helsinki" | null,
       about: "..." | null
     }
   }

2. Server creates project (existing flow)
3. Server saves services + hours as project wishes (NEW)
4. Server generates plan from personalized wishes (existing generate-proposal flow)
5. Server triggers auto-build pipeline (existing /api/workspace/[projectId]/auto-build)
6. Server returns { projectId, subdomain }

7. Client redirects to /workspace/[projectId]
8. Workspace loads in BUILDING state — build is already running
```

### What the user sees during the redirect

No intermediate screens. No "Your booking page is ready!" No "Go to your dashboard."

The moment the server responds:
1. The browser navigates to `/workspace/[projectId]`.
2. The workspace `WorkspaceShell` renders in `building` phase.
3. `BuildProgressView` shows "Setting up your booking page" with the first step already in progress.
4. Progressive profiling questions begin appearing (Section 7).

**Total time from "Set up my page" to seeing the workspace:** Under 3 seconds (server round-trip for project creation + redirect).

### Data flow into the build prompt

| Onboarding data | Where it appears in the build |
|---|---|
| Business name | Page title, header, meta tags, about section |
| Services (name, duration, price) | Service cards on the booking page |
| Hours (days, start, end) | Available booking slots in the calendar |
| Vertical | Design style, layout choices, color palette |
| Location (if provided) | Contact/location section |
| About text (if provided) | "About" section content |

---

## 7. Progressive Profiling During Build

Shown DURING the build, not before it. Uses the dead time while the auto-build pipeline runs (see 01-ux-research, P1-6 and 05-onboarding-data-strategy.md, Section 3). The user is NOT blocked.

### Questions (one at a time)

Three optional questions shown sequentially during the build wait. Each can be independently skipped. They appear as cards overlaid on the BuildProgressView, below the progress bar.

**Question 1: Phone number**

```
+-------------------------------+
|                               |
|  While we set up...           |
|                               |
|  What's the best number for   |
|  clients to reach you?        |
|                               |
|  [ +358 40 123 4567        ]  |
|                               |
|  [Save]           [Skip]      |
|                               |
+-------------------------------+
```

**Question 2: About text**

```
+-------------------------------+
|                               |
|  Tell your customers a        |
|  little about you (optional)  |
|                               |
|  +-------------------------+  |
|  | I've been doing hair    |  |
|  | for 12 years in Kallio..|  |
|  +-------------------------+  |
|                               |
|  [Save]           [Skip]      |
|                               |
+-------------------------------+
```

**Question 3: Location**

```
+-------------------------------+
|                               |
|  Where are you based?         |
|                               |
|  [ Kallio, Helsinki         ] |
|                               |
|  [Save]           [Skip]      |
|                               |
+-------------------------------+
```

Note: If location was already extracted from a website URL, this question is skipped. Similarly, if about text was extracted, that question is skipped.

### Copy

| Element | Text |
|---|---|
| Card heading | "While we set up..." |
| Phone label | "What's the best number for clients to reach you?" |
| Phone placeholder | "+358 40 123 4567" |
| About label | "Tell your customers a little about you" |
| About hint | "(optional)" |
| About placeholder | "e.g. I've been doing hair for 12 years in Kallio..." |
| Location label | "Where are you based?" |
| Location placeholder | "e.g. Kallio, Helsinki" |
| Save button | "Save" |
| Skip link | "Skip" |

### Rules for loading-time questions (from 05-onboarding-data-strategy.md)

- Maximum 3 questions during a single build wait.
- Each question is independently skippable.
- Answers are stored as wishes and applied in a follow-up build iteration (not blocking the current build).
- Questions disappear when the build completes — the preview is always more important than the question.
- If the user ignores them, no problem. The first build works without these answers.
- Only one question visible at a time. Next question appears after save or skip.

### Interaction

- "Save" stores the data and shows the next question (or hides the card if no more questions).
- "Skip" hides the current question and shows the next one.
- All cards auto-dismiss when the build completes (transitions to LIVE state).
- Saved data is sent as additional wishes. If the build is still running and the relevant card hasn't been built yet, the data is incorporated. Otherwise, a follow-up micro-build adds the content.

### Layout spec

- Cards appear inside `BuildProgressView`, below the progress bar and step list.
- Card styling: Glass card (`bg="surface/90" backdropFilter="blur(20px)" border="1px solid" borderColor="outlineVariant/15" borderRadius="xl" paddingBlock={5} paddingInline={5}`).
- Phone input: Standard text input, `type="tel"`.
- About textarea: `rows={3} maxHeight="96px"`, standard textarea styling.
- Location input: Standard text input. Pre-filled with browser-detected city if geolocation API returns it.
- Save button: `bg="onSurface" color="surface"`, compact (`paddingBlock={2} paddingInline={5}`).
- Skip link: `<Text textStyle="secondary.sm" color="onSurfaceVariant" textDecoration="underline">`.
- Save and Skip are on the same line: `Flex justifyContent="space-between"`.

### Accessibility

- Each card has `role="complementary"` with `aria-label="Additional details (optional)"`.
- All inputs have visible labels.
- Skip is a `<button>` with visible text.

---

## 8. State Management

### Client-side state during onboarding

The onboarding wizard uses local React state. Each step's data is held in a parent component and passed down.

```typescript
type OnboardingState = {
  step: 1 | 'website' | 2 | 3
  
  // Step 1 data
  verticalId: string | null
  businessName: string

  // Website extraction (optional)
  websiteUrl: string
  extractedData: {
    services: Array<{ name: string; durationMinutes: number; priceEur: number }> | null
    hours: { days: string[]; start: string; end: string } | null
    location: string | null
    about: string | null
  } | null

  // Step 2 data (pre-filled from vertical defaults or website extraction)
  services: Array<{
    name: string
    durationMinutes: number
    priceEur: number
  }>

  // Step 3 data (pre-filled from vertical defaults or website extraction)
  hours: {
    days: string[]
    start: string
    end: string
  }

  // Submission
  submitting: boolean
  error: string | null
}
```

### Why not Jotai or persistent state

The onboarding flow is linear, short (10-35 seconds), and happens once per user. There is no "leave and come back" scenario — if the user abandons onboarding mid-flow, they start fresh on return. Browser state (React `useState`) is sufficient.

---

## 9. Component Architecture

### New components

```
src/features/onboarding/
  ui/
    OnboardingWizard.tsx        (replaces OnboardingFlow.tsx)
    VerticalPicker.tsx          (Step 1: vertical cards + business name)
    WebsiteExtractor.tsx        (Optional: URL input + extraction result)
    ServiceEditor.tsx           (Step 2: editable service rows)
    AvailabilityPicker.tsx      (Step 3: day toggles + time range)
    ProgressiveProfiler.tsx     (Loading-time questions, rendered inside BuildProgressView)
    StepHeader.tsx              (shared: heading + step indicator)
  lib/
    onboarding-schema.ts        (Zod schema for the full onboarding payload)
```

### Component relationships

```
OnboardingWizard (state owner, client boundary)
  ├── Step 1: StepHeader + VerticalPicker + business name input
  ├── [Optional] WebsiteExtractor (URL input + extraction result)
  ├── Step 2: StepHeader + ServiceEditor
  └── Step 3: StepHeader + AvailabilityPicker

ProgressiveProfiler (rendered inside BuildProgressView in the workspace, NOT inside OnboardingWizard)
```

### Shared component: StepHeader

Renders the step heading and step indicator consistently across all steps.

```tsx
type StepHeaderProps = {
  readonly heading: string
  readonly stepNumber?: number
  readonly totalSteps?: number
  readonly helperText?: string
}
```

---

## 10. API Changes

### Updated POST /api/onboarding

The existing endpoint accepts `verticalId` and `businessName`. Expanded to accept services, hours, and extra data.

**New body schema:**

```typescript
const bodySchema = z.object({
  verticalId: z.string().refine((id) => validVerticalIds.includes(id)),
  businessName: z.string().trim().min(1).max(80).optional(),
  services: z.array(z.object({
    name: z.string().trim().min(1).max(60),
    durationMinutes: z.number().int().min(5).max(480),
    priceEur: z.number().min(0).max(9999),
  })).min(1).max(10).optional(),
  hours: z.object({
    days: z.array(z.string()).min(1),
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
  }).optional(),
  websiteUrl: z.string().url().optional(),
  extraData: z.object({
    location: z.string().max(100).optional(),
    about: z.string().max(300).optional(),
  }).optional(),
})
```

**Backward compatibility:** Services, hours, and extraData are optional. If omitted, the server falls back to vertical defaults (current behavior).

### New: POST /api/onboarding/extract-website

Accepts a URL, fetches the page server-side, extracts business data via Claude, returns structured result.

**Request:** `{ url: string }`

**Response:**
```json
{
  "services": [
    { "name": "Haircut", "durationMinutes": 45, "priceEur": 40 }
  ],
  "hours": { "days": ["tue","wed","thu","fri","sat"], "start": "10:00", "end": "18:00" },
  "location": "Kallio, Helsinki",
  "about": "Hair salon in Kallio since 2014."
}
```

Fields are nullable — the extraction returns what it finds. The client handles missing fields by falling back to vertical defaults.

---

## 11. Error States and Edge Cases

### Quiz errors

| Scenario | Handling |
|---|---|
| User navigates back from Step 2 | Step 1 data is preserved (React state). No data loss. |
| User navigates back from Step 3 | Steps 1 and 2 data are preserved. |
| User refreshes during Step 2 | All data lost. User starts at Step 1. Acceptable for a 35-second flow. |
| No services entered (all removed) | Next button disabled. Inline message: "Add at least one service." |
| Time range invalid | Inline message below time inputs. Next button disabled. |

### Website extraction errors

| Scenario | Handling |
|---|---|
| URL invalid | Inline message: "Enter a full URL like https://yourbusiness.com" |
| Server can't fetch URL | "Couldn't reach that site. You can type your details instead." Falls through to Step 2. |
| Extraction returns nothing useful | "We couldn't find services on that page. No worries — you can type them." Falls through to Step 2. |
| Extraction takes > 8 seconds | "Taking longer than expected... you can skip and type it instead." Skip link appears. |
| Extraction partially succeeds | Show what was found. Missing fields fall back to vertical defaults. |

### Convergence errors

| Scenario | Handling |
|---|---|
| POST /api/onboarding fails (500) | Show error inline on Step 3. "Something went wrong. Try again?" with retry button. Do not navigate to workspace. |
| POST /api/onboarding rate-limited (429) | Show error inline. "Too many attempts. Wait a minute and try again." |
| Auto-build pipeline fails after redirect | Handled by workspace: BuildProgressView shows failed state with "Try again" button. See 04-ui-design-spec.md, Section 7. |

### Session/auth edge cases

| Scenario | Handling |
|---|---|
| User already has a project | Skip onboarding. Redirect to `/workspace/[existingProjectId]`. One project per user for MVP. |
| User is not authenticated | Redirect to `/sign-up` (or `/login`). Onboarding requires auth. |

---

## 12. Mobile-First Layout Specs

### Breakpoints

| Breakpoint | Label | Layout changes |
|---|---|---|
| < 480px | Small mobile | Single column, full-width inputs, stacked buttons |
| 480px-767px | Large mobile | Same as small, vertical grid may go to 3 columns |
| >= 768px | Desktop | Horizontal service editor rows, back/next on same line, 5-column vertical grid |

### Touch targets

Every interactive element (buttons, inputs, cards, day toggles, remove icons) has a minimum 44px touch target. On mobile, primary action buttons are 56px tall.

### Keyboard

The entire flow is completable via keyboard. Tab order follows visual order. Enter submits the current step. Back link is focusable before the next button.

### Scroll behavior

Each step fits within a single viewport on most devices (iPhone SE at 568px is the floor). If the service editor has many rows (> 5), the step scrolls naturally. The primary action button remains visible in the initial viewport.

---

## 13. Timing Budget

### With no edits (accept all defaults)

| Step | User time | Running total |
|---|---|---|
| Step 1: Pick vertical, type name, next | 6s | 6s |
| Step 2: Defaults look fine, next | 2s | 8s |
| Step 3: Defaults look fine, set up | 2s | 10s |
| API + redirect | 2s | 12s |
| **Total to BUILDING state** | **~12s** | |

### With edits (typical)

| Step | User time | Running total |
|---|---|---|
| Step 1: Pick vertical, type name, next | 8s | 8s |
| Step 2: Edit 1-2 services, next | 12s | 20s |
| Step 3: Adjust 1 day, next | 5s | 25s |
| API + redirect | 2s | 27s |
| **Total to BUILDING state** | **~27s** | |

### With website URL (fast-track)

| Step | User time | System time | Running total |
|---|---|---|---|
| Step 1: Pick vertical, type name, next | 6s | — | 6s |
| Website: Paste URL, tap grab | 4s | — | 10s |
| Website: Extraction | — | 3-5s | 13-15s |
| Website: "Looks good" | 2s | — | 15-17s |
| API + redirect | — | 2s | 17-19s |
| **Total to BUILDING state** | **~12s user, ~7s system** | | **~19s** |

The propose-and-go pattern means a user who trusts the defaults gets through the quiz in ~12 seconds. The website URL path is slightly slower due to extraction latency but produces higher-quality data.

---

## 14. Analytics Events

| Event | When | Properties |
|---|---|---|
| `onboarding_started` | Step 1 loads | — |
| `onboarding_step_completed` | User taps Next on any step | `step: 1 \| 2 \| 3` |
| `website_extraction_started` | User taps "Grab my details" | — |
| `website_extraction_completed` | Extraction returns | `services_found: number, hours_found: boolean, location_found: boolean` |
| `website_extraction_failed` | Extraction errors | `error_type: "fetch_failed" \| "no_data" \| "timeout"` |
| `website_extraction_skipped` | User taps "Skip" on website step | — |
| `website_extraction_confirmed` | User taps "Looks good" | `services_count: number` |
| `services_edited` | User modifies defaults in Step 2 | `added: number, removed: number, renamed: number` |
| `hours_edited` | User modifies defaults in Step 3 | `days_changed: boolean, times_changed: boolean` |
| `onboarding_completed` | API call succeeds | `vertical, services_count, has_website, total_time_ms` |
| `onboarding_abandoned` | User leaves mid-flow (beforeunload) | `last_step` |
| `progressive_profile_saved` | User saves a loading-time question | `field: "phone" \| "about" \| "location"` |
| `progressive_profile_skipped` | User skips a loading-time question | `field: "phone" \| "about" \| "location"` |

All events are consent-gated via the existing GA4 integration.

---

## 15. Implementation Priority

### Phase 1: Core quiz (ship first)

1. `OnboardingWizard` with Steps 1-3.
2. `ServiceEditor` with pre-filled defaults from vertical.
3. `AvailabilityPicker` with pre-filled defaults from vertical.
4. Updated `POST /api/onboarding` to accept services + hours.
5. Auto-build trigger on completion (wire to existing pipeline).
6. Remove intermediate "ready!" screen and "Go to your dashboard" button.

**This single change transforms the experience** from "pick a vertical, see a blank canvas" to "pick a vertical, confirm your services, confirm your hours, see your personalized page being built."

### Phase 2: Website extraction

7. `POST /api/onboarding/extract-website` endpoint (server-side fetch + Claude extraction).
8. `WebsiteExtractor` component (URL input, loading state, result confirmation).
9. Wire extracted data into Steps 2/3 as pre-fill source.

### Phase 3: Progressive profiling

10. `ProgressiveProfiler` component (phone, about, location questions during build).
11. Wire saved answers as follow-up wishes for micro-builds.
12. Analytics events.

### "If we can only ship one thing" pick

Steps 1-3 + updated API + auto-build trigger. Everything else is acceleration on top of a fundamentally better experience.
