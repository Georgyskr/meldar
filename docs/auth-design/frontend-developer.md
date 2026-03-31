# Auth UX Design — Frontend Developer Perspective

## 1. When Does Sign-In Appear?

**After the first X-Ray result is displayed — not before.**

The current flow is: context chip -> screenshot guide -> upload -> result. Sign-in should never block the first experience. The user must see value before we ask for anything.

### Exact trigger point

```
Landing / Quiz  ->  /xray  ->  Context Chip  ->  Guide  ->  Upload  ->  Result (FREE, no auth)
                                                                              |
                                                                         "Upload another screenshot"
                                                                              |
                                                                    *** SIGN-IN GATE ***  (attempt 2+)
```

**Rule:** Attempt 1 is always free, always anonymous. When the user clicks "Upload another screenshot" (the `reset()` function in `xray-client.tsx:46`), we intercept and show the sign-in modal instead of returning to the upload phase.

**Why this moment:**
- The user has already received value (their X-Ray card).
- They've proven intent by wanting a second analysis.
- Asking for sign-in here feels like "save your progress" rather than a paywall.
- This matches the effort escalation funnel philosophy: earn trust first, then ask.

### Flow after sign-in is established

```
Signed-in user clicks "Upload another" ->  Upload phase (attempt 2 of 3)
                                                |
                                            Result
                                                |
                                         "Upload another"  ->  Upload phase (attempt 3 of 3)
                                                                     |
                                                                 Result
                                                                     |
                                                              "Upload another"
                                                                     |
                                                            *** UPSELL GATE ***
```

---

## 2. Sign-In UI

### Format: Bottom sheet modal (mobile) / Centered modal (desktop)

Not a full page. Not inline. A modal preserves context — the user can see their X-Ray result behind the frosted overlay. This reinforces "sign in to keep going" rather than "you've hit a wall."

### Visual treatment

```
+--------------------------------------------------+
|                                                    |
|   [Frosted overlay over X-Ray result behind]       |
|                                                    |
|   +------------------------------------------+    |
|   |                                          |    |
|   |     [Meldar gradient dot]                |    |
|   |     "Save your X-Ray"                   |    |
|   |                                          |    |
|   |     Sign in to keep your results and     |    |
|   |     get 2 more free analyses.            |    |
|   |                                          |    |
|   |     [  G  Continue with Google      ]    |    |
|   |     [  🍎 Continue with Apple       ]    |    |
|   |     [     Continue with Discord     ]    |    |
|   |                                          |    |
|   |     [ ] Email me about new features      |    |
|   |                                          |    |
|   |     ─────────────────────────────────    |    |
|   |     By signing in you agree to our       |    |
|   |     Terms and Privacy Policy.            |    |
|   |                                          |    |
|   |     [Skip for now]                       |    |
|   +------------------------------------------+    |
|                                                    |
+--------------------------------------------------+
```

### Styling details

- **Modal container:** `bg="surfaceContainerLowest"`, `borderRadius="2xl"`, `boxShadow="0 16px 64px rgba(0,0,0,0.16)"`, max-width 400px, centered.
- **Overlay:** `bg="surface/60"`, `backdropFilter="blur(12px)"`, covers viewport, click-outside closes (but shows "Skip for now" behavior).
- **Headline:** "Save your X-Ray" in Bricolage Grotesque, `fontWeight="800"`, `fontSize="xl"`, `color="onSurface"`.
- **Subtext:** Inter 300, `textStyle="body.sm"`, `color="onSurfaceVariant"`.
- **Animation:** `meldarFadeSlideUp 0.3s ease-out` (reuse existing keyframe).
- **Mobile:** Bottom-sheet style — `position="fixed"`, `bottom={0}`, full width, `borderRadius="2xl 2xl 0 0"`, draggable dismiss.

### "Skip for now" behavior

If the user skips sign-in, they can still click "Upload another" but the sign-in modal reappears. They cannot start a second analysis without signing in. The skip button exists to reduce pressure, not to bypass auth. After 2 consecutive skips, the button text changes to "Maybe later" and the modal won't appear again for that session — but the "Upload another" button becomes disabled with tooltip "Sign in to upload more."

---

## 3. Provider Buttons

### Providers: Google, Apple, Discord

**Why these three:**
- **Google** — universal, highest conversion. Gen Z all have Google accounts. #1 priority, top position.
- **Apple** — high trust signal, especially on iOS (where Screen Time screenshots come from). Privacy-conscious positioning aligns with Meldar's "your data, your control" message.
- **Discord** — Gen Z native platform. Higher affinity than GitHub/Microsoft/Facebook for 18-28 demographic. Signals "we're not corporate."

### Button design

Full-width stacked buttons, not side-by-side icons. Each button:

```
paddingBlock={3}
paddingInline={5}
borderRadius="md"
border="1px solid"
borderColor="outlineVariant/20"
bg="surfaceContainerLowest"
fontSize="sm"
fontWeight="500"
width="100%"
cursor="pointer"
transition="all 0.15s ease"
_hover={{ bg: "surfaceContainer", borderColor: "outlineVariant/40" }}
```

- **Google:** Google "G" logo (SVG, not lucide — brand guidelines require their official mark). Label: "Continue with Google".
- **Apple:** Apple logo (SVG). Label: "Continue with Apple".
- **Discord:** Discord logo (SVG). Label: "Continue with Discord".

**Order:** Google first (highest conversion), Apple second (trust/iOS), Discord third (niche/affinity).

No gradient backgrounds on provider buttons — they should look neutral and trustworthy. The Meldar gradient is reserved for primary CTAs.

### Icons

Use official brand SVGs, not lucide-react. Store in `src/shared/ui/icons/` as `GoogleLogo.tsx`, `AppleLogo.tsx`, `DiscordLogo.tsx`. Each renders a 20x20 SVG with official brand colors (Google multicolor, Apple black/currentColor, Discord #5865F2).

---

## 4. Post-Sign-In Flow

### OAuth callback redirect

```
/api/auth/callback/[provider]  ->  /xray?signed_in=1
```

After the OAuth callback completes:

1. **Set auth session** (cookie/token — backend concern).
2. **Redirect to `/xray?signed_in=1`** — the query param triggers a welcome toast.
3. **Restore state:** If the user had a previous X-Ray result in the session (stored in sessionStorage before redirect), restore it so they see their card again, not a blank upload screen.

### What the user sees after redirect

```
[Header with avatar + "2 of 3 remaining"]

"Your Time X-Ray"        <-- their previous result, restored
[X-Ray Card]
[Share actions]
[Upsell block]

[Upload another screenshot]   <-- now functional, attempt 2
```

### Welcome toast

A brief, non-blocking toast at the top:

```
+------------------------------------------+
| Welcome! You have 2 free analyses left.  |
+------------------------------------------+
```

Styled like the existing deletion banner (`green.50` bg, `green.700` text), but with `primary/5` bg and `primary` text. Auto-dismiss after 4 seconds.

---

## 5. Header Changes

### Current header (unauthenticated)

```
[Gradient dot] Meldar          [Focus] [Get your Time X-Ray]
```

### Signed-in header

```
[Gradient dot] Meldar          [Focus] [2 left] [Avatar ▾]
```

#### Changes:

1. **"Get your Time X-Ray" CTA** becomes **attempt counter pill** — `"2 left"` in a subtle pill.
2. **Avatar dropdown** appears on the right.

#### Attempt counter pill

```tsx
// Only visible when signed in and on /xray or after first use
<styled.span
  paddingInline={3}
  paddingBlock={1}
  borderRadius="full"
  fontSize="xs"
  fontWeight="600"
  bg="primary/8"
  color="primary"
  fontFamily="heading"
>
  {remaining} left
</styled.span>
```

- Shows `"3 left"` / `"2 left"` / `"1 left"` / `"0 left"` (with urgency color shift).
- At 1 remaining: `color="amber.600"`, `bg="amber.50"`.
- At 0 remaining: `color="red.500"`, `bg="red.50"`.

#### Avatar dropdown

A small circle with the user's profile photo (from OAuth provider) or initials fallback. On click, a dropdown:

```
+---------------------------+
|  [Photo] Jane D.          |
|  jane@gmail.com           |
|  ─────────────────────    |
|  My X-Rays                |
|  Settings                 |
|  ─────────────────────    |
|  Sign out                 |
+---------------------------+
```

Styled to match the FocusModeToggle popover pattern (same shadow, border, animation).

#### When not on /xray

The header shows "Get your Time X-Ray" CTA if the user is not signed in. If signed in, the CTA is replaced by the avatar + remaining counter. On the landing page, a signed-in user sees `[Avatar]` where the CTA was — no attempt counter on the landing page (it's contextual to the X-Ray flow).

---

## 6. Confidence Bar

### What it is

A horizontal progress bar that fills as the user provides more data, reinforcing that more data = better analysis. It lives inside the X-Ray flow (not in the header — too small, too far from the action).

### Where it lives

Inside `XRayPageClient`, above the phase content, below the headline. Visible from the context chip phase onward.

```
"Your Time X-Ray"
"One tap, then one screenshot..."

[=============================-----------]  55% — Good start
  Screenshot    Context    Focus mode

[Phase content below]
```

### Fill levels

| Action                    | Fill % | Label          |
|---------------------------|--------|----------------|
| Arrived at /xray          | 10%    | Just getting started |
| Selected context chip     | 25%    | Good start     |
| Viewed screenshot guide   | 30%    | Good start     |
| Uploaded screenshot       | 40%    | Getting clearer |
| Context chip + screenshot | 55%    | Solid picture  |
| Focus mode enabled        | +10%   | (additive)     |
| Signed in                 | +5%    | (additive)     |
| Second screenshot         | 75%    | Strong profile |
| Third screenshot          | 90%    | Crystal clear  |
| Google Takeout (future)   | 100%   | Full picture   |

### Visual treatment

```tsx
<Box width="100%" maxWidth="440px" marginInline="auto">
  {/* Track */}
  <Box
    width="100%"
    height="6px"
    borderRadius="full"
    bg="outlineVariant/10"
    overflow="hidden"
  >
    {/* Fill */}
    <Box
      height="100%"
      borderRadius="full"
      background="linear-gradient(135deg, #623153 0%, #FFB876 100%)"
      width={`${confidence}%`}
      transition="width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)"
    />
  </Box>
  {/* Label */}
  <Flex justifyContent="space-between" marginBlockStart={2}>
    <styled.span textStyle="body.sm" color="onSurfaceVariant/60" fontSize="xs">
      {confidenceLabel}
    </styled.span>
    <styled.span textStyle="body.sm" color="primary" fontSize="xs" fontWeight="600">
      {confidence}%
    </styled.span>
  </Flex>
</Box>
```

- The gradient fill matches the Meldar brand gradient.
- The bar uses a spring-like easing (`cubic-bezier(0.34, 1.56, 0.64, 1)`) so it slightly overshoots when filling — feels alive.
- Below the bar, small milestone dots can mark key thresholds (screenshot, context, focus mode) as subtle circles that fill when reached.

### Component

```
src/features/confidence-bar/
  ui/ConfidenceBar.tsx      # The visual bar component
  lib/use-confidence.ts     # Hook that calculates % from signals
  index.ts                  # Barrel: export { ConfidenceBar } from './ui/ConfidenceBar'
                            #         export { useConfidence } from './lib/use-confidence'
```

The `useConfidence` hook accepts the current signals (hasScreenshot, hasContext, hasFocusMode, isSignedIn, attemptCount) and returns `{ confidence: number, label: string }`.

---

## 7. Attempt Counter UX

### Where

1. **Header pill** (signed-in users, described above in section 5).
2. **Inside the sign-in modal** — "Sign in to get 2 more free analyses."
3. **Before each upload** (attempt 2+) — a subtle inline notice above the upload zone.
4. **In the result card footer** — after each analysis.

### Inline notice (above upload zone, attempt 2+)

```
+------------------------------------------+
|  Analysis 2 of 3                         |
|  ████████████████████░░░░░░░░░░          |
+------------------------------------------+
```

Minimal, horizontal mini-bar. Not blocking, not alarming. Just informational.

```tsx
<Flex
  alignItems="center"
  gap={3}
  width="100%"
  maxWidth="440px"
  marginInline="auto"
  paddingInline={4}
  paddingBlock={2}
>
  <styled.span textStyle="body.sm" color="onSurfaceVariant" whiteSpace="nowrap" fontSize="xs">
    Analysis {current} of {max}
  </styled.span>
  <Box flex={1} height="3px" borderRadius="full" bg="outlineVariant/15">
    <Box
      height="100%"
      borderRadius="full"
      bg="primary"
      width={`${(current / max) * 100}%`}
      transition="width 0.3s ease"
    />
  </Box>
</Flex>
```

### Urgency escalation

| Remaining | Counter color  | Tone                     |
|-----------|---------------|--------------------------|
| 3         | `primary`     | Neutral                  |
| 2         | `primary`     | Neutral                  |
| 1         | `amber.600`   | "Last free analysis"     |
| 0         | `red.500`     | Upsell gate              |

At 1 remaining, the inline notice text changes to: "Last free analysis — make it count."

---

## 8. After 3 Attempts — Upsell Gate

When the user clicks "Upload another screenshot" with 0 attempts remaining, instead of the sign-in modal, they see the **upgrade modal**.

### Upgrade modal design

Same modal container as sign-in (frosted overlay, centered/bottom-sheet). Content:

```
+------------------------------------------+
|                                          |
|     You've used all 3 free analyses.     |
|     Ready to go deeper?                  |
|                                          |
|   +------------------------------------+ |
|   | RECOMMENDED                        | |
|   |                                    | |
|   | Personal Time Audit    EUR 29      | |
|   | A human reviews your data and      | |
|   | sends you a custom action plan.    | |
|   |                                    | |
|   | [  Get my audit  ]  (gradient btn) | |
|   +------------------------------------+ |
|                                          |
|   +------------------------------------+ |
|   | Unlimited X-Rays     EUR 4.99/mo   | |
|   | Upload as many screenshots as you  | |
|   | want. Track changes over time.     | |
|   |                                    | |
|   | [  Start tracking  ]  (outline btn)| |
|   +------------------------------------+ |
|                                          |
|     Not ready? Your existing X-Rays      |
|     are saved to your account.           |
|                                          |
|     [Back to my results]                 |
|                                          |
+------------------------------------------+
```

### Why these two options

1. **Personal Time Audit (EUR 29, one-time)** — high-touch, matches the Concierge tier positioning. Recommended because it's a natural next step: "You've seen the data, now let an expert interpret it." This is the primary upsell.

2. **Unlimited X-Rays (EUR 4.99/mo)** — low-commitment subscription for users who want to track over time ("weekly check-in"). Lower price point than the Starter tier's EUR 9.99 because this is a narrower feature (just X-Rays, not full automations).

### "Back to my results"

Dismisses the modal and navigates to a `/my-xrays` page (or scrolls to the last result) where they can review their previous 3 analyses. This page is a simple list of their saved X-Ray cards — a reason to have signed in.

### If they don't buy

No hard lock. They can still access their saved X-Rays, share them, and use the quiz. The upload zone shows a locked state: the upload area displays "Upgrade to upload more" instead of the drag-and-drop zone.

---

## Component Hierarchy & FSD File Paths

### New FSD slices

```
src/
  features/
    auth/                              # Auth feature slice
      ui/
        SignInModal.tsx                 # OAuth sign-in modal (providers + consent checkbox)
        AuthProviderButton.tsx          # Individual provider button (Google/Apple/Discord)
        SignInGate.tsx                  # Logic wrapper: decides when to show SignInModal
        UpgradeModal.tsx               # Post-3-attempts upsell modal
        MarketingConsent.tsx            # "Email me about new features" checkbox
      lib/
        use-auth.ts                    # Hook: { user, isSignedIn, signIn, signOut }
        use-attempts.ts                # Hook: { remaining, used, max, canAnalyze }
        auth-context.tsx               # React context provider for auth state
      index.ts                         # Barrel exports

    confidence-bar/                    # Confidence bar feature slice
      ui/
        ConfidenceBar.tsx              # Visual progress bar
      lib/
        use-confidence.ts              # Calculates confidence % from signals
      index.ts                         # Barrel exports

  shared/
    ui/
      icons/
        GoogleLogo.tsx                 # Official Google "G" SVG
        AppleLogo.tsx                  # Official Apple logo SVG
        DiscordLogo.tsx                # Official Discord logo SVG
      Modal.tsx                        # Reusable modal (overlay + container + animation)
      Toast.tsx                        # Non-blocking toast notification

  widgets/
    header/
      Header.tsx                       # Modified: conditionally show avatar + attempt counter
      ui/
        AttemptPill.tsx                # "2 left" pill component
        UserAvatar.tsx                 # Avatar circle + dropdown menu

  app/
    api/
      auth/
        [...nextauth]/route.ts         # NextAuth.js route handler (or Auth.js v5)
    xray/
      xray-client.tsx                  # Modified: integrate SignInGate + ConfidenceBar
    my-xrays/
      page.tsx                         # Saved X-Ray history page
```

### Modified existing files

| File | Change |
|------|--------|
| `src/app/layout.tsx` | Wrap children with `AuthProvider` from `features/auth` |
| `src/app/xray/xray-client.tsx` | Add `SignInGate` check before attempt 2+, add `ConfidenceBar`, pass attempt data |
| `src/widgets/header/Header.tsx` | Conditionally render `AttemptPill` + `UserAvatar` when signed in, hide "Get your Time X-Ray" CTA |
| `src/features/billing/ui/UpsellBlock.tsx` | No change — the existing upsell block stays in the result view. The upgrade modal is separate. |

### Auth provider recommendation

**Auth.js v5** (formerly NextAuth.js) — works natively with Next.js App Router, supports Google/Apple/Discord out of the box, handles session via cookies (server-readable in RSC), and has built-in CSRF protection. Add via:

```bash
pnpm add next-auth@beta
```

### Import chain (FSD compliance)

```
app/layout.tsx          imports from  features/auth (AuthProvider)
app/xray/xray-client    imports from  features/auth (SignInGate, useAuth, useAttempts)
                        imports from  features/confidence-bar (ConfidenceBar)
widgets/header          imports from  features/auth (useAuth, useAttempts)
features/auth           imports from  shared/ui (Modal, icons)
features/confidence-bar imports from  shared (nothing upward)
```

No upward imports. FSD layers respected.

---

## Summary of Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| When to gate | After first free result, before second upload | Value-first; user has seen what Meldar does |
| Modal vs page | Modal with frosted overlay | Preserves context, feels lighter than a redirect |
| Providers | Google, Apple, Discord | Universal + trust + Gen Z native |
| Provider order | Google > Apple > Discord | Conversion rate priority |
| Attempt limit display | Header pill + inline notice | Non-intrusive but always visible |
| Post-limit action | Upgrade modal with 2 tiers | Audit (one-time, high-value) + Unlimited (subscription, low-barrier) |
| Confidence bar | Inside X-Ray flow, below headline | Close to the action, reinforces data contribution |
| Marketing consent | Unchecked checkbox in sign-in modal | GDPR-compliant, opt-in only |
| Skip sign-in | Allowed but "Upload another" stays gated | Reduces pressure without removing gate |
