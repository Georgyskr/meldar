# 09 — Validation: Visual Storyteller (Copy & Emotional Narrative)

**Scope:** Every line of user-facing copy in the current onboarding + workspace implementation.

**Files audited:**
- `apps/web/src/features/onboarding/ui/DoorPicker.tsx`
- `apps/web/src/features/onboarding/ui/DoorA.tsx`
- `apps/web/src/features/onboarding/ui/DoorB.tsx`
- `apps/web/src/features/onboarding/ui/DoorC.tsx`
- `apps/web/src/features/onboarding/ui/ProposalPreview.tsx`
- `apps/web/src/widgets/workspace/PreviewPane.tsx`
- `apps/web/src/widgets/workspace/OverflowMenu.tsx`
- `apps/web/src/features/visual-feedback/ui/FeedbackBar.tsx`
- `apps/web/src/widgets/workspace/BuildStatusOverlay.tsx`

**Measured against:**
- `docs/redesign/03-visual-narrative.md` (emotional arc spec)
- `docs/redesign/08-funnel-critique-storyteller.md` (prior funnel critique)
- `CLAUDE.md` brand voice rules (banned words: "build", "deploy", "code", "template")

---

## 1. Banned Word Audit

Grep-style list of every violation of the banned words list (`build`, `deploy`, `code`, `template`) in user-facing strings. Non-user-facing strings (aria-labels for dev tools, internal function names, comments) excluded.

| File | Line | String | Word | Severity |
|---|---|---|---|---|
| `PreviewPane.tsx` | 91 | `"Writing code…"` | **code** | **Critical** — shown to the user during primary build state |
| `PreviewPane.tsx` | 127 | `"Describe what you want to build"` | **build** | **Critical** — empty-state header, direct violation |
| `PreviewPane.tsx` | 129–131 | `"…or \"build a landing page with email capture.\""` | **build** | **Critical** — example copy shown to user |
| `PreviewPane.tsx` | 134 | `"Your live preview will appear here once the first build completes."` | **build** | **Critical** — reassurance line |
| `BuildStatusOverlay.tsx` | 126 | `"Build failed — check the notification below"` | **build** | **Critical** — error pill visible on every failure |
| `ProposalPreview.tsx` | — | *clean* | — | No banned word (previously fixed per doc 08) |
| `DoorPicker.tsx` | — | *clean* | — | — |
| `DoorA.tsx` | — | *clean* | — | — |
| `DoorB.tsx` | — | *clean* | — | — |
| `DoorC.tsx` | — | *clean* | — | — |
| `OverflowMenu.tsx` | — | *clean* | — | — |
| `FeedbackBar.tsx` | — | *clean* | — | — |

**Summary:** 5 critical banned-word violations, **all concentrated in the workspace phase** (`PreviewPane.tsx` + `BuildStatusOverlay.tsx`). The onboarding doors have been cleaned up per the prior critique (doc 08), but the workspace surfaces still read like a developer tool. This is the exact failure pattern the visual-narrative spec warns about (§4 Anti-Patterns): *"Coding tools show the process. Meldar shows the result."*

**Secondary technical-jargon violations** (not banned-list but brand-voice violations):

| File | String | Issue |
|---|---|---|
| `PreviewPane.tsx` L93 | `"Writing {latestFile.path.split('/').pop()}…"` | Exposes raw filenames like `helpers.ts` — explicit anti-pattern in spec §4 |
| `PreviewPane.tsx` L129 | `"create a booking page for a hair salon with 3 services"` | "3 services" is business-consulting jargon per doc 08 |
| `FeedbackBar.tsx` L220 | `'e.g. "make the button pink" or "change price to 50"'` | "Button" is web-dev vocabulary; assumes a button already exists |
| `FeedbackBar.tsx` L150 | `"Click any element above to change it, or describe what you want"` | "Element" is developer language |
| `FeedbackBar.tsx` L32 | Chip suggestions `'Bolder colors?', 'Bigger text?', 'More spacing?'` | "More spacing?" is design-tool vocabulary; users don't think in spacing |
| `OverflowMenu.tsx` L103 | `"Settings"` | Explicit anti-pattern per spec §4.4: *"No settings page."* |

---

## 2. Top 3 Copy Strengths

### Strength 1 — `DoorC.tsx` headline: *"What's eating your time?"*

This is the best line in the entire funnel. It is conversational, visceral, relatable, and does three things simultaneously:
1. Validates the user's frustration (something IS eating their time).
2. Positions Meldar as the fix without saying "fix."
3. Avoids all jargon. A sixteen-year-old and a sixty-year-old understand it identically.

This is the voice the rest of the product should chase.

### Strength 2 — `ProposalPreview.tsx` primary CTA: *"Let's go →"*

Short, warm, collaborative, forward-moving. Exactly the tone prescribed by doc 08 (`Fix #5`). It reads like a friend saying "come on, let's do this" — not a form asking for confirmation. At the highest-stakes button in the funnel, the copy carries the right emotional weight.

### Strength 3 — `DoorA.tsx` secondary input label: *"Got a website? We'll read it for you"*

This line does what the brand voice promises: warm, conversational, outcome-oriented. "Got a website?" is how a human asks. "We'll read it for you" is reassurance without surveillance framing — contrast with Door D's earlier "share your data" language. It's the gold standard for data-capture microcopy in the product.

---

## 3. Top 5 Copy Issues

### Issue 1 — `PreviewPane.tsx` empty state is a developer tool (CRITICAL)

**Current:**
```
Describe what you want to build
Use the input below to get started. Try "create a booking page for a hair salon with 3 services" or "build a landing page with email capture."
Your live preview will appear here once the first build completes.
```

**Severity:** Critical. This single screen contains three banned-word violations and triples down on the exact anti-pattern the visual-narrative spec identifies as the trust-breaking moment (§7 — *"P0-2: Empty workspace after onboarding"*). The spec is explicit: *"the workspace must never show an empty preview pane after onboarding."*

This screen should not exist. If it does exist as a fallback, its copy must not sound like a code editor's empty state. The "try this prompt" examples belong in a developer tool like v0 or Bolt — not in a product built for Irka.

**Proposed rewrite:**
```
Setting up your page…
Adding your details, choosing a layout, picking colors.
This usually takes under a minute.
```

*Why:* Present-progressive tense implies motion ("setting up"). No banned words. Tells the user what's happening in their language, not in prompt-engineering language. Crucially, this copy only fires *during* the auto-build Phase 1 — if the workspace ever hits a true empty state post-build, it's a bug, not a UX state.

---

### Issue 2 — `PreviewPane.tsx` building state exposes filenames (CRITICAL)

**Current:**
```
Writing code…
Writing helpers.ts…
```

**Severity:** Critical. Doc 03 §4 table, row "Coding tool terminal/console panel": *"Logs are gibberish to our users."* Spec copy table (L239): *"Always: 'Adding your services…'. Never: 'Writing helpers.ts…'"* — this exact violation is called out by name in the narrative spec.

"Writing code…" is the primary headline during the build phase. This is where Phase 2 (First Creation, emotional peak: *surprise, delight, disbelief*) either lands or dies. Right now, Irka is told her salon is being assembled by watching files named `helpers.ts` scroll past. The aha moment cannot survive this.

**Proposed rewrite:**
```
Setting up your page…
[secondary] {contextual substep — "Adding your booking calendar" / "Choosing colors" / "Adding your services"}
```

*Why:* The substep should be mapped from the actual build phase (which the orchestrator already tracks) to a human-language label — not derived from the filename currently being written. If there's no clean mapping, show nothing in the secondary slot. Silence is better than jargon.

---

### Issue 3 — `BuildStatusOverlay.tsx` failure pill is brutal (HIGH)

**Current:**
```
Build failed — check the notification below
```

**Severity:** High. "Build failed" is the exact phrase developer tools use. For a user who just watched their first milestone attempt fail, this reads as: *"You broke it. Go find the log."*

The spec (§4, table row "Kanban/sprint board" through "Empty state"): *"If something fails, say what happened in human language: 'The image didn't load — want to try a different one?'"*

**Proposed rewrite (generic):**
```
Something went sideways — we'll try again in a moment
```

**Better (if cause is known):**
- Timeout: `Taking longer than usual. Give us a minute.`
- Invalid user input: `We got stuck on one bit — see the note below.`
- Server error: `Our end had a hiccup. Trying again…`

*Why:* Error copy must carry the weight the spec demands — editorial calm, not deploy-log vocabulary. The current copy also uses "notification below" which assumes the user will notice and understand what a "notification" is in this context.

---

### Issue 4 — `FeedbackBar.tsx` instruction copy breaks the Phase 4 promise (HIGH)

**Current:**
```
Click any element above to change it, or describe what you want
Placeholder: e.g. "make the button pink" or "change price to 50"
Chips: Bolder colors? | Bigger text? | More spacing?
```

**Severity:** High. The visual-narrative spec (Phase 4 — Iteration, and §2 Transition C) is categorical: the feedback bar is the emotional centerpiece of iteration. It must feel like talking to a contractor standing in the room. Three problems here:

1. **"Element"** is developer vocabulary. Irka does not have elements. She has a logo, a title, a list of prices, a photo.
2. **"make the button pink"** as the first example assumes a button already exists and that the user thinks in "buttons." Per doc 08: this is explicitly flagged. Still not fixed.
3. **Chip suggestions fire regardless of context.** "More spacing?" is a design-tool question ("tracking? kerning?") — a salon owner would stare at it blankly. The chips also only appear *after* the user types a short instruction, which is backwards — they should scaffold the user *before* they type, not police short inputs after.

**Proposed rewrite:**
```
[primary] Point at anything you want to change
[placeholder] e.g. "make the title bigger" or "use warmer colors"
[chips — context-aware, shown on focus not after submit]
Try: "add a photo" | "change the colors" | "make it feel warmer"
```

*Why:* "Point at anything" matches the spec's preferred phrasing. "Title" replaces "button" and "header" (both called out in doc 08). The chip examples match the spec's Phase 5 recognition signals (photo, color, vibe) rather than design-tool abstractions. And firing chips on focus (not after short-input gotcha) respects the user's first move instead of correcting it.

**Additional note:** The instruction line `"Click any element above to change it"` is load-bearing against doc 03 §2 Transition C — which says this copy *must not appear* until the preview actually renders AND hover interactions are wired up. If the visual feedback tool isn't functional yet (per doc 08 §Phase 4 note: *"not wired up in the preview pane"*), this line is a lie. Suppress it until the feature works.

---

### Issue 5 — `OverflowMenu.tsx` violates "no settings" anti-pattern (MEDIUM)

**Current menu items:**
```
My site →
Manage bookings
Settings
All projects
```

**Severity:** Medium. Visual-narrative spec §4.4: *"No settings page. No configuration. No 'Project settings' gear icon. Every decision that matters is made through the conversational propose-and-go flow."*

Shipping a `Settings` link in the overflow menu — linking to `/workspace/{id}/admin/settings` — concedes the point. It tells users "there are configurations elsewhere that aren't in the conversation," which undermines the entire propose-and-go narrative.

Also: "Manage bookings" is fine for a salon, but breaks down for Door C users who built a non-booking site. The menu items are vertical-specific but presented as universal.

**Proposed rewrite:**
```
My site →
Bookings (contextual — only for booking-type projects)
All my things
```

Drop "Settings" entirely. If there are truly settings the user needs (domain, visibility), surface them inline in the workspace conversation the first time they're relevant — not buried behind a gear.

"All projects" → "All my things" (or "My sites"): "projects" is product/dev vocabulary; users don't think of their salon page as a "project."

---

## 4. Additional Rewrites (Lower Priority)

### `DoorPicker.tsx`

**Current subtitle:** `Your AI. Your app. Nobody else's.`

Same issue flagged in doc 08: premature tagline. "App" is banned-adjacent vocabulary ("I want a page for my salon," not "I want an app") and the ownership messaging lands better *after* the user has seen their preview. But since doc 08 already prescribed `Tell us what you need. We'll handle the rest.` and that hasn't been applied, reiterating here.

**Current Door A description:** `Set up a booking page, client list, or site in about 30 seconds.`

"Client list" is an improvement over the previous "client portal" but still reads as a database feature, not an outcome. Consider: `A page where clients can find you and book — ready in about 30 seconds.`

**Current Door C description:** `Describe what you need and we'll figure it out together.`

"Describe" is a command. "Tell us what's on your mind" is warmer (per doc 08). Apply that fix.

**Missing Door D entirely.** Doc 08 audits Door D ("Let's find out" with the DATA-BASED ANALYSIS badge), but current `DoorPicker.tsx` only renders three doors. Either Door D was intentionally cut (good — removes the anxiety spike) or it's implemented elsewhere. If cut, great. If elsewhere, it still needs the doc-08 fixes applied.

---

### `DoorA.tsx`

**Current:** `Pick a category and we'll suggest what to set up.`

This is fine. Minor: "suggest what to set up" is slightly cold. Alternative: `Pick a category. We'll put together a starting point for you.` — mirrors the "put together" language from ProposalPreview for continuity.

**Continue button:** `Continue →` is neutral but generic. `See what we'll make →` keeps continuity with `See what Meldar suggests →` in DoorC and sets the expectation that the next screen is a preview, not another form.

---

### `DoorB.tsx`

**Current:** `Real pages made with Meldar` / `Tap one to make it yours. We'll swap in your details.`

Doc 08 prescribed: `Here's what other businesses look like on Meldar` / `Pick one you like. We'll set it up with your info.` Still unapplied. "Pages" is jargon; "tap" is mobile-only.

**Use this CTA:** `Use this →` — doc 08 suggested `Start with this →`. Apply.

---

### `DoorC.tsx`

**Current:** `Others have said:` → apply doc 08 fix: `People like you have typed:`.

**Examples quality:** Now three booking-focused examples. Doc 08 recommended swapping one for a non-booking case ("I want a simple page to show my work and prices"). Still unaddressed — broadening the range of visible examples broadens the perceived scope of what Meldar can do.

---

### `ProposalPreview.tsx`

**Current:** `Ready in about 30 seconds. Change anything first, or go.`

Good — the `We'll build this` violation is fixed. Minor hedge: "or go" still reads slightly abrupt. Consider: `Ready in about 30 seconds. Adjust anything here, or let's go.` (matches the CTA's "Let's go" warmth.)

**Secondary CTA:** `Change things` is still the vague placeholder doc 08 flagged. Change to `Adjust the details` or `I want to tweak this`.

**Label:** `{proposal.verticalLabel}` appears as an eyebrow above the heading. If this renders as "Hair & Beauty" or "Photography" that's fine. If it renders as an internal ID like `hair_beauty_v2`, that's a leak. Verify.

---

### `FeedbackBar.tsx` — Stitch suggestion

**Current:**
```
Need design assets? Try Stitch — it's free
```

Appears when keywords like "logo", "brand", "colors" are detected. Problems:
1. "Design assets" is agency jargon — Irka doesn't need design assets, she needs a logo.
2. Routing users to an external Google tool *mid-iteration* yanks them out of Meldar's custody at the exact moment the narrative is meant to feel seamless. The spec (§5 — "What Never Moves") is about keeping the user anchored; sending them to stitch.withgoogle.com does the opposite.
3. If this feature must exist, frame it warmer: `Want a new logo or color palette? We'll pull one together — or try Stitch (free) and upload what you make.`

---

### `BuildStatusOverlay.tsx`

**Pills:**
- `Updating…` — good. Matches spec.
- `✓ Updated` — good.
- `Build failed — check the notification below` — see Issue 3.

One issue: the done pill (`✓ Updated`) and the building pill (`Updating…`) use different tenses for the same object. `Updating…` → `✓ Updated` reads fine. But if the pill appears post-initial-build (i.e., first render of a milestone), "Updated" is wrong — there was nothing there to update. Consider two state pairs:
- First build: `Setting up…` → `✓ Your page is ready`
- Subsequent iteration: `Updating…` → `✓ Updated`

This matches the spec's distinction between Phase 2 (First Creation) and Phase 4 (Iteration) — two different emotional moments that deserve different microcopy.

---

## 5. Narrative Gaps

### Gap A — No moment of arrival after build completes (Transition E missing)

**Spec reference:** §2 Transition E — *"Project to Live."*

The spec is unambiguous: when the first build completes, the user must experience editorial punctuation — *"a clean card, a URL, a small beautiful preview thumbnail, 'It's live' in serif-italic flourish style, two actions: Open and Share."*

**Actual behavior:** `PreviewPane.tsx` swaps from the "Writing code…" state directly to the rendered iframe. No celebration. No "It's live." No URL card. The `DonePill` fires for 3 seconds in the overlay, then vanishes. Irka sees her page appear, the pill says "✓ Updated" (wrong tense — see BuildStatusOverlay note), and… that's it.

**Impact:** The pride-and-eagerness peak from the emotional temperature map (§Appendix) never fires. The user goes from anxious anticipation directly into another iteration loop, skipping the one moment the spec requires to convert them from user to evangelist.

**Fix:** After the first successful build (not every build), show a transient "It's live" card with the URL and a single action. This is new UI, not new copy — but the copy should be:
```
It's live.
{subdomain.meldar.app}
[Open] [Share]
```

And then, and only then, fade into the iteration mode.

---

### Gap B — No continuity between onboarding and workspace

**Spec reference:** §2 Transition A — *"the critical transition."* The spec says the workspace should *"feel like the conversation continues in a new form"* and that *"the plan that Meldar proposed in the chat now appears as a visual layout — same items, same language, same order."*

**Actual behavior:** Based on the files audited, the handoff from `ProposalPreview.tsx` ("Let's go →") to `PreviewPane.tsx` is abrupt. The plan items Meldar proposed (services, hours, vertical) do not appear to carry into the workspace as visual landmarks. The user arrives and sees either the build-in-progress state or the empty prompt state — neither of which echoes back the specific details they just approved.

**Impact:** The Phase 1 (Arrival) recognition signal — *"the first thing they see is their project, already named, already structured, already moving"* — is weak. The user went from a personalized proposal to what looks like a fresh dev environment.

**Fix:** The workspace's primary heading (not audited, but presumably in a parent layout) should render the business name from the proposal. The milestone list should render the service names from the proposal. The loading substep should name the specific thing being added:
```
Adding "Highlights" to your booking page…
```
not:
```
Writing helpers.ts…
```

This is the most load-bearing narrative fix in the entire product. Without it, the aha moment described in §6 is mechanically unreachable.

---

### Gap C — FeedbackBar shows Phase 4 copy in Phase 1/2

**Spec reference:** §2 Transition C — *"After the preview fully renders, a gentle prompt appears…"*

**Actual behavior:** The FeedbackBar's instruction line ("Click any element above to change it") is presumably always rendered. The spec is specific: this copy appears *after* the preview renders *and* when hover interactions are wired. Firing it during the building state, or when the preview is empty, breaks the promise — the user reads "click any element above," tries, nothing happens.

**Fix:** The FeedbackBar's instruction copy must be conditional on build state:
- During first build: `Meldar is setting up your page. One moment.`
- Preview ready, tool not wired: (suppress entirely, show only placeholder)
- Preview ready, tool wired: `Point at anything you want to change`

Doc 08 already flagged this; still unaddressed in current implementation.

---

### Gap D — No error recovery narrative

**Spec reference:** §4 — *"If something fails, say what happened in human language: 'The image didn't load — want to try a different one?'"*

**Actual behavior:** `BuildStatusOverlay.tsx` renders `"Build failed — check the notification below"` as a generic pill for any failure. There's no mapping from error class (timeout, validation, orchestrator error, quota) to user-appropriate copy. Irka will see the same pill whether the system crashed or whether her screenshot was unreadable.

**Fix:** An error-class → copy mapping. This is a product decision as much as a copy one — every error path needs a sentence that (a) doesn't blame the user, (b) says what happened in one clause, (c) offers one next step. Example starter set:
- Timeout: `Taking longer than usual. We'll keep trying for another minute.`
- Invalid input: `We couldn't read one of the things you sent. Want to try again?`
- Model refusal: `We need to word this a bit differently — mind rephrasing?`
- Quota/rate limit: `We're a bit busy right now. Give us a moment and try again.`
- True crash: `Something went sideways on our end. We've logged it.`

---

### Gap E — The overflow menu mixes verticals and ignores Door B/C users

**Spec reference:** §4, table row "File tree sidebar / Kanban board" — anti-patterns around presenting developer metaphors.

**Actual behavior:** `OverflowMenu.tsx` always shows "Manage bookings." A Door C user who described a portfolio with no booking functionality still sees "Manage bookings" in their menu. It's a dead link for them — and a trust-damaging one, because it implies the page has functionality it doesn't.

**Fix:** Menu items should be project-type aware. Render "Manage bookings" only when `projectType === 'booking'`. For portfolio/landing projects, surface relevant contextual actions (e.g., "Edit my intro") or nothing at all.

---

## 6. Priority Summary

In descending order of narrative impact:

1. **Fix `PreviewPane.tsx` empty state and building state** — removes 4 banned-word violations and the filename-exposure anti-pattern in one sweep. (Issue 1 + Issue 2)
2. **Add the "It's live" moment (Gap A)** — the single highest-leverage additive change. Turns Phase 5 from silent into ceremonial.
3. **Wire onboarding proposal details into workspace copy (Gap B)** — the aha moment depends on this.
4. **Fix `BuildStatusOverlay.tsx` failure pill + add error taxonomy (Issue 3 + Gap D)** — every Irka who hits an error right now is being told "Build failed." That's catastrophic.
5. **Fix `FeedbackBar.tsx` instruction copy + context-aware chips (Issue 4 + Gap C)** — Phase 4 promise depends on this.
6. **Remove "Settings" from `OverflowMenu.tsx` (Issue 5)** — violates §4 anti-pattern.
7. **Re-apply unapplied doc-08 fixes in `DoorPicker.tsx`, `DoorB.tsx`, `DoorC.tsx`** — these were already critiqued once; several haven't been shipped.

---

## 7. Closing Observation

The onboarding side of the funnel has absorbed most of the prior critique (doc 08). The copy is warmer, less clinical, fewer banned words. The three-door picker reads like a Meldar product.

The workspace side has not. `PreviewPane.tsx`, `FeedbackBar.tsx`, and `BuildStatusOverlay.tsx` still carry developer-tool DNA — "build," "code," filenames, "elements," "Build failed." These three files together form the entire emotional payoff of the onboarding journey. If onboarding is Meldar's front door and the workspace is the room behind it, right now the door is warm and the room is Visual Studio.

The narrative spec (§7) names this exact failure: *"The single most important fix: the workspace must never show an empty preview pane after onboarding."* The code still does. The generic empty-state copy in `PreviewPane.tsx` L125–136 is the moment Irka leaves. Every other fix in this document is downstream of that one.
