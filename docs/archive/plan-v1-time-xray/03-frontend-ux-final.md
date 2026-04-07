# Frontend & UX -- Final Plan

**Authors:** Frontend Developer, ArchitectUX, UX Researcher
**Date:** 2026-03-30
**Status:** Final (Iteration 3)
**Phases:** PoC (2w) -> Commercial Validation (4w) -> MVP (4w)

---

## 1. Routes & Pages

### Phase 1: PoC (Weeks 1-2)

| Route | Purpose | Auth | Status |
|---|---|---|---|
| `/` | Landing page (10 sections, CTA fixes, Founding 50 capture) | No | Exists, needs CTA overhaul |
| `/quiz` | Pick Your Pain quiz + inline results | No | Exists, needs polish |
| `/xray` | Screenshot upload + inline X-Ray result | No | New page |
| `/xray/[id]` | Shareable Time X-Ray result (server-rendered) | No | New page |
| `/xray/[id]/og` | Dynamic OG image for social sharing | No | New route (edge) |
| `/privacy-policy` | Privacy policy | No | Exists, needs AI sub-processor update |
| `/terms` | Terms of service | No | Exists, needs payment terms update |
| `/api/upload/screentime` | Screenshot analysis (Claude Haiku 4.5) | No | Exists as mock, needs real integration |
| `/api/billing/checkout` | Create Stripe Checkout session | No | New |
| `/api/billing/webhook` | Stripe webhook handler | No | New |
| `/api/subscribe` | Email capture (Resend) | No | Exists |

### Phase 2: Commercial Validation (Weeks 3-6)

| Route | Purpose | Auth | Status |
|---|---|---|---|
| `/audit/[token]` | Paid Time Audit delivery page | Token | New |
| `/about` | "Built by 12 seniors" story | No | New |

No new auth-gated routes in this phase. Identity = Stripe customer email + signed delivery tokens.

### Phase 3: MVP (Weeks 7-10)

| Route | Purpose | Auth | Status |
|---|---|---|---|
| `/login` | Magic link login (Auth.js + Resend) | No | New |
| `/dashboard` | User hub: latest X-Ray, weekly tip, stats | Yes | New |
| `/dashboard/xrays` | Past Time X-Ray results | Yes | New |
| `/dashboard/advice` | "12 seniors" tips feed (MDX) | Yes | New |
| `/dashboard/settings` | Email, notifications, data deletion (GDPR) | Yes | New |
| `/takeout` | Google Takeout upload + client-side parsing | Yes | New |

### Route design rules

- `/xray/[id]` is the viral surface. Anyone with the link can view, no auth.
- Dashboard routes sit behind middleware auth check in `src/app/dashboard/layout.tsx`.
- Google OAuth is NOT included anywhere. Deferred post-MVP per locked consensus.

---

## 2. User Journey Map

### PoC + Commercial Validation journey

```
Landing page
  |
  +---> [Hero email capture: "Join Founding 50"]
  |       |
  |       v
  |     Resend subscriber (Founding 50 funnel)
  |
  +---> [Mid-page CTA: "See what eats your time"]
          |
          v
        /quiz -- Pick 2-5 pain points (15 sec)
          |
          v
        Quiz Results (inline, same page)
        "~12 hrs/week recoverable"
          |
          +---> [CTA: "Get your real numbers -- 30 seconds"]
                  |
                  v
                /xray -- Screenshot upload
                  |
                  v
                Processing (3-5 sec, multi-step indicator)
                  |
                  v
                Time X-Ray result (inline on /xray, saved to DB)
                  |
                  +---> [Share button] --> /xray/[id] (shareable link)
                  |
                  +---> [CTA: "Personal Time Audit -- EUR 29"]
                  |       |
                  |       v
                  |     Stripe Checkout (hosted)
                  |       |
                  |       v
                  |     Confirmation email (Resend) with /audit/[token]
                  |
                  +---> [CTA: "Join Founding 50 and get it free"]
                  |       |
                  |       v
                  |     Email capture with Founding 50 messaging
                  |
                  +---> [CTA: "Upload another screenshot"]
                          |
                          v
                        New analysis (unlimited, $0.003/call)
```

### Viral loop

```
User creates X-Ray
  --> Shares link (/xray/[id]) to social / DM
  --> Friend sees OG card preview (dynamic image)
  --> Friend clicks --> lands on /xray/[id]
  --> "Get your own X-Ray" CTA at bottom
  --> Friend enters /quiz --> creates their own X-Ray
  --> Loop repeats
```

### Conversion psychology

1. **Zero-friction entry.** Quiz requires no data, no signup, no permissions.
2. **Value before ask.** Users see quiz results AND Time X-Ray before any email/payment ask.
3. **Escalating commitment.** Quiz (0 effort) -> Screenshot (low effort) -> Email/Purchase (earned trust).
4. **Two revenue paths after value delivery.** Direct purchase (EUR 29) OR Founding 50 signup (free audit, captures for future conversion).
5. **Social proof via sharing.** Time X-Ray card is designed for screenshots and link sharing.

---

## 3. CTA Strategy (Blocker #1 Fix)

### Current problem

All CTAs on the landing page link to `#early-access` which scrolls to the Hero section email form. This is:
- Disorienting (user in section 7 jumps to section 1)
- Low-context (email form doesn't match what they just read)
- Revenue-blocking (no path to Stripe)

### Files to modify

**`src/widgets/landing/TiersSection.tsx` lines 114-129:**
Replace all `href="#early-access"` anchors with tier-specific actions.

**`src/features/quiz/ui/PainQuiz.tsx` lines 180-194:**
Replace `href="#early-access"` with link to `/xray` (screenshot upload).

**`src/widgets/landing/HeroSection.tsx` line 180:**
Update email form messaging to Founding 50 language.

**`src/widgets/landing/EarlyAdopterSection.tsx` line 74:**
Add `id="founding"` to the email capture wrapper. Enhance with Founding 50 counter.

### New CTA mapping

| Section | Component file | Current CTA | New CTA | Target |
|---|---|---|---|---|
| Hero | `HeroSection.tsx` | Email form "Time Audit" | "Join Founding 50 -- Claim your spot" | Inline email capture (Resend) |
| Problem | `ProblemSection.tsx` | None | "See what eats your time" | `/quiz` |
| How It Works | `HowItWorksSection.tsx` | None | "Try it free" | `/quiz` |
| Data Receipt | `DataReceiptSection.tsx` | None | "Get your own X-Ray" | `/quiz` |
| Trust | `TrustSection.tsx` | None | None (trust-building only) | N/A |
| Skills | `SkillCardsSection.tsx` | None | "Get this built -- EUR 49" | Stripe Checkout |
| Early Adopter | `EarlyAdopterSection.tsx` | Email form | Founding 50 email capture with counter | Inline email (Resend) |
| Tiers | `TiersSection.tsx` | All `#early-access` | Free: `/quiz`, Starter: Stripe, Concierge: `mailto:` | Mixed |
| FAQ | `FaqSection.tsx` | None | None | N/A |
| Final CTA | `FinalCtaSection.tsx` | Email form | "Get your free Time X-Ray" | `/quiz` + email capture |

### CTA hierarchy principle

Mid-page CTAs route to `/quiz` (funnel entry). The funnel delivers value THEN presents the revenue ask. Only the Skills and Tiers sections link directly to Stripe because users reading those sections are already price-aware.

---

## 4. Time X-Ray Result Page

### Design: "Spotify Wrapped meets a lab report"

**Card layout (440px max-width, optimized for mobile screenshot):**

```
+--------------------------------------------+
|  [gradient bar: #623153 -> #FFB876]        |
|  YOUR TIME X-RAY              meldar.ai    |
+--------------------------------------------+
|                                            |
|  Total screen time       7.4 hrs/day       |
|  ----------------------------------------- |
|  1. Instagram                      2.3h    |
|  2. Safari                         1.8h    |
|  3. Mail                           1.2h    |
|  4. Messages                       0.9h    |
|  5. YouTube                        0.8h    |
|  ----------------------------------------- |
|  Daily pickups           87                |
|  Recoverable time        ~2.1 hrs/day      |
|                                            |
|  "You check your phone 87 times a day.     |
|   Instagram alone is 16 hrs/week --        |
|   almost a part-time job."                 |
|                                            |
+--------------------------------------------+
|  [Share]  [Save as Image]  [Copy link]     |
+--------------------------------------------+
```

**Visual treatment:**
- Warm cream background (#faf9f6)
- Header gradient bar: linear-gradient(135deg, #623153 0%, #FFB876 100%)
- Stat numbers: Bricolage Grotesque, bold, `color="primary"` (#623153)
- Body text: Inter, weight 300
- Light horizontal rules between rows (`borderColor="outlineVariant/10"`)
- Rounded corners (`borderRadius="xl"`), subtle shadow (`boxShadow="0 24px 48px rgba(0,0,0,0.08)"`)
- Card ratio roughly 3:4 -- looks good when screenshotted on phone

**Data display: specific app names, not categories.** "2.3 hours on Instagram" is shareable. "2.3 hours on social media" is not. Users can toggle anonymization before sharing (but default is specific).

**Below-card content:**
1. AI insight paragraph (rule-based for PoC, Sonnet-generated for MVP)
2. "What Meldar would build for you" -- 2-3 automation suggestions matched to detected apps
3. Revenue upsell block (see section 5)
4. Trust strip: "Your screenshot was processed in ~3 seconds and deleted immediately. We never store your images."

### Three rendering paths

| Purpose | Technology | Why |
|---|---|---|
| On-page display | HTML/CSS via RSC (`XRayCard.tsx`) | Accessible, SEO-indexed, fast |
| "Save as image" button | `html-to-image` library | Renders DOM node to PNG, pixel-perfect |
| OG image for link previews | `next/og` ImageResponse (edge) | No browser needed, cached, 1200x630 |

### Accessibility

- Card content is real text, not a rendered image
- All colors meet WCAG AA contrast on cream background
- Focus-visible outlines on interactive elements (`outline: 2px solid`, `outlineColor: primary`, `outlineOffset: 2px`)
- Card reads as a description list (`<dl>`) for screen readers
- Reduced motion: no animations by default; subtle fade-in behind `prefers-reduced-motion: no-preference`

---

## 5. Revenue UX

### Stripe integration (PoC)

**No auth needed.** Stripe Checkout IS the identity layer for PoC.

**Flow:**
1. User clicks "Buy Time Audit" (PurchaseButton component)
2. Client calls `POST /api/billing/checkout` with `{ product: 'time-audit', email?: string }`
3. API route creates Stripe Checkout session with `customer_email` pre-filled
4. Client redirects to Stripe's hosted checkout page
5. User pays on Stripe
6. Stripe webhook (`checkout.session.completed`) fires to `/api/billing/webhook`
7. Webhook handler sends confirmation email via Resend with `/audit/[token]` link
8. Token is a signed JWT containing `stripe_customer_id` + `checkout_session_id`
9. Founder delivers audit manually within 72 hours to that URL

**Stripe products to create:**

| Product | Type | Price | Stripe mode |
|---|---|---|---|
| Personal Time Audit | One-time | EUR 29 | `payment` |
| Personal Time Audit (Founding) | One-time | EUR 0 (100% coupon) | `payment` with coupon |
| Starter | Subscription | EUR 9/mo (EUR 4/mo founding) | `subscription` |
| App Build | One-time | EUR 49 (EUR 19 founding) | `payment` |
| Concierge | Subscription | EUR 199/mo (EUR 99/mo founding) | `subscription` |

**Founding coupon codes:** Created in Stripe dashboard. Applied automatically when Founding 50 member purchases.

### Pricing visibility

**Hero section** -- below the email form, add:
```
Free forever -- No credit card
Founding members get a free Time Audit (worth EUR 29)
```

Anchors EUR 29 value. Signals real business.

**Tiers section** -- replace anchor links with real actions:

| Tier | CTA text | Action |
|---|---|---|
| Time X-Ray (Free) | "Start your free X-Ray" | `<a href="/quiz">` |
| Starter (EUR 9/mo) | "Join Founding 50 -- EUR 4/mo" | `onClick` -> `POST /api/billing/checkout` -> Stripe redirect |
| Concierge (EUR 199/mo) | "Talk to us" | `<a href="mailto:hello@meldar.ai?subject=Concierge%20inquiry">` |

### X-Ray result page upsell

After the free X-Ray card, display:

```
Your free X-Ray shows the basics. Want the full picture?

[Personal Time Audit -- EUR 29]
A senior engineer reviews your data, interviews you
for 15 minutes, and delivers a custom action plan.

[Buy your Time Audit -->]  (Stripe Checkout)

-- or --

[Join Founding 50 and get it free]  (X spots left)
```

Two paths: direct purchase or Founding 50 signup. Both lead to revenue.

---

## 6. Founding 50 Email Capture

### Enhanced EmailCapture component

Replace the current generic email capture with a Founding 50-specific version:

```
+--------------------------------------------+
|  Join the Founding 50                      |
|                                            |
|  [email input]  [Claim your spot]          |
|                                            |
|  27 of 50 spots remaining                 |
|                                            |
|  What you get:                             |
|  + Free Time Audit (EUR 29 value)          |
|  + Weekly automation playbook              |
|  + Founding pricing locked forever         |
+--------------------------------------------+
```

**Counter implementation:**
- Server-side: query subscriber count from Neon `subscribers` table (one of the 3 PoC tables)
- Displayed via RSC (server component renders current count, no client-side fetching)
- When count hits 50, form copy changes to "Join the waitlist" with regular pricing
- Counter is real -- not manipulated

**Placement:**
- Hero section: primary email capture with Founding 50 messaging
- Early Adopter section: secondary capture with `id="founding"` (scroll target for paid tier CTAs)
- X-Ray result page: after the upsell block, as a fallback for users who don't purchase

---

## 7. Screenshot Upload UX

### Upload flow (3 steps)

**Step 1 -- Upload zone**

```
+--------------------------------------------+
|    [Phone icon]                            |
|                                            |
|    Take a screenshot of your Screen Time   |
|                                            |
|    [iPhone] [Android]  (platform toggle)   |
|                                            |
|    iPhone: Settings > Screen Time >        |
|            See All Activity > screenshot   |
|                                            |
|    [  Drop image or tap to choose  ]       |
|                                            |
+--------------------------------------------+
|  Processed in ~3 seconds and deleted       |
|  immediately. We never store your images.  |
+--------------------------------------------+
```

Design decisions:
- Platform toggle detects via `navigator.userAgent`, defaults to iPhone
- Privacy message always visible below the drop zone. Short, factual, no legalese.
- On mobile, `accept="image/*"` triggers native camera/gallery picker
- Minimum drop zone height: 200px for easy thumb tapping

**Client-side image compression before upload:**
```typescript
// Using browser-image-compression (locked consensus: client-side, not sharp)
import imageCompression from 'browser-image-compression'

const options = {
  maxSizeMB: 0.5,           // Compress to ~500KB
  maxWidthOrHeight: 1568,    // Claude Vision max resolution
  useWebWorker: true,        // Don't block UI
  fileType: 'image/jpeg',    // JPEG for text OCR (smaller than PNG)
}
const compressed = await imageCompression(file, options)
```

This reduces upload time on 4G from ~5 seconds (2-5MB raw) to ~1 second (200-500KB compressed).

**Step 2 -- Processing indicator**

```
+--------------------------------------------+
|    Reading your screen time...             |
|                                            |
|    [x] Detecting apps                      |
|    [.] Extracting usage hours              |
|    [ ] Generating your X-Ray               |
+--------------------------------------------+
```

- Multi-step progress (not a spinner). Shows what's happening.
- Steps are timed client-side (the API is a single call, but we show progress incrementally for UX).
- Step 1 completes at ~1s, step 2 at ~2s, step 3 when API responds.
- No thumbnail of uploaded image shown during processing (reinforces deletion).

**Step 3 -- Result + deletion confirmation**

Banner at top of result (auto-dismiss after 5s or on scroll):
```
[Shield icon] Screenshot deleted. Only the extracted data remains below.
```

### Error states

| Scenario | AI confidence field | User message | Action |
|---|---|---|---|
| Not a screenshot | `error: "not_screen_time"` | "That doesn't look like a Screen Time screenshot. Here's what to screenshot:" + visual guide | Show instruction image |
| Blurry/cropped | `error: "unreadable"` | "We couldn't read that clearly. Try a sharper screenshot." | Show retry button |
| Partial data | `confidence: "low"` | "We got partial results. Upload another screenshot for the full picture." | Show partial results + retry |
| Server error | HTTP 5xx | "Something went wrong on our end. Your image was not stored." | Show retry button |

### Unlimited uploads

Per locked consensus: unlimited free screenshots in PoC at $0.003/call. No counters, no limits, no gates. After first result, show "Upload another day's data" button for comparison.

---

## 8. "12 Seniors" -- Trust Section Integration

### Current Trust section structure (TrustSection.tsx)

```
"Your stuff stays your stuff"
  |
  +-- What we can see (3 items)
  +-- What we can never see (3 items)
  +-- Leave whenever you want
  +-- Delete everything in one click
```

### Addition: subsection at the bottom

After the existing "Delete everything" block, add:

```
+--------------------------------------------+
|  Who's behind the curtain?                 |
|                                            |
|  12 senior engineers. 150+ years of        |
|  combined experience. Built in a single    |
|  day. Improved every day since.            |
|                                            |
|  [12 overlapping avatar circles]           |
|                                            |
|  [Read our story -->]  (links to /about)   |
+--------------------------------------------+
```

**Implementation:**
- Avatars: 40px circles, slightly overlapping (negative margin), arranged in a horizontal row
- Wrap to 2 rows on screens <400px
- "Read our story" links to `/about` (Phase 2 page)
- No tooltips on hover for PoC -- just the visual cluster of faces

**Footer addition** (in `src/widgets/footer/Footer.tsx`):
One line: "Built by 12 senior engineers in Helsinki."

---

## 9. Component Architecture (FSD)

### New slices for all 3 phases

```
src/
  app/
    xray/
      page.tsx                    # Screenshot upload page (PoC)
      [id]/
        page.tsx                  # Shareable X-Ray result (PoC)
        og/
          route.tsx               # Dynamic OG image (PoC)
    api/
      upload/
        screentime/
          route.ts                # Replace existing analyze-screenshot mock (PoC)
      billing/
        checkout/
          route.ts                # Stripe Checkout session creator (PoC)
        webhook/
          route.ts                # Stripe webhook handler (PoC)
      subscribe/
        route.ts                  # EXISTS -- email capture
    audit/
      [token]/
        page.tsx                  # Paid audit delivery (Phase 2)
    about/
      page.tsx                    # "12 seniors" story (Phase 2)
    login/
      page.tsx                    # Magic link login (MVP)
    dashboard/
      layout.tsx                  # Auth guard middleware (MVP)
      page.tsx                    # Overview (MVP)
      xrays/
        page.tsx                  # X-Ray history (MVP)
      advice/
        page.tsx                  # Tips feed (MVP)
      settings/
        page.tsx                  # Account settings (MVP)
    takeout/
      page.tsx                    # Google Takeout upload (MVP)

  entities/
    pain-points/                  # EXISTS -- no changes
      index.ts
      model/data.ts
    xray-result/                  # NEW (PoC)
      index.ts                    #   barrel
      model/
        types.ts                  #   XRayResult, AppUsage types (align with AI pipeline Zod schemas)
        insights.ts               #   Rule-based insight generation (pure function)
      ui/
        XRayCard.tsx              #   The shareable card (RSC)
        XRayCardActions.tsx       #   Share / Save / Copy link (client component)

  features/
    quiz/                         # EXISTS -- modify
      index.ts
      ui/
        PainQuiz.tsx              #   Fix CTA links, polish results view
        ScreenTimeUpload.tsx      #   DEPRECATED -- replaced by screenshot-upload feature
    screenshot-upload/            # NEW (PoC)
      index.ts
      ui/
        UploadZone.tsx            #   Drop zone with platform detection
        ProcessingSteps.tsx       #   Multi-step progress indicator
        DeletionBanner.tsx        #   "Screenshot deleted" confirmation toast
      lib/
        use-upload.ts             #   Upload state machine hook
        compress-image.ts         #   Client-side browser-image-compression wrapper
    sharing/                      # NEW (PoC)
      index.ts
      ui/
        ShareActions.tsx          #   Web Share API + "Copy link" fallback
      lib/
        use-share.ts              #   Share logic hook
        render-card-image.ts      #   html-to-image wrapper for "Save as image"
    billing/                      # NEW (PoC)
      index.ts
      ui/
        PurchaseButton.tsx        #   "Buy Time Audit" / "Start Starter" -- calls checkout API
        FoundingCounter.tsx       #   "X of 50 spots remaining" (RSC, reads from DB)
        PricingCard.tsx           #   Individual tier card with real Stripe CTA
      lib/
        use-checkout.ts           #   Hook: POST /api/billing/checkout, handle redirect
    founding-program/             # NEW (PoC)
      index.ts
      ui/
        FoundingEmailCapture.tsx  #   Enhanced email capture with counter + perks
    cookie-consent/               # EXISTS -- no changes
    analytics/                    # EXISTS -- no changes
    auth/                         # NEW (MVP)
      index.ts
      ui/
        LoginForm.tsx             #   Magic link email input
        AuthGuard.tsx             #   Wraps protected routes
      lib/
        use-session.ts            #   Session state hook

  widgets/
    landing/                      # EXISTS -- modify
      index.ts
      HeroSection.tsx             #   Update email form to Founding 50 messaging
      ProblemSection.tsx          #   Add CTA button
      HowItWorksSection.tsx       #   Add CTA button
      DataReceiptSection.tsx      #   Add CTA button
      TrustSection.tsx            #   Add "12 seniors" subsection
      SkillCardsSection.tsx       #   Add "Get this built" CTA
      EarlyAdopterSection.tsx     #   Replace EmailCapture with FoundingEmailCapture
      TiersSection.tsx            #   Replace #early-access links with real actions
      FaqSection.tsx              #   No changes
      FinalCtaSection.tsx         #   Add /quiz link alongside email capture
    header/                       # EXISTS -- modify (MVP: add user avatar when logged in)
    footer/                       # EXISTS -- add "Built by 12 seniors" line
    dashboard/                    # NEW (MVP)
      index.ts
      DashboardNav.tsx            #   Horizontal tab navigation
      OverviewCards.tsx           #   Latest X-Ray + tip + stats
      XRayHistory.tsx             #   List of past X-Rays
      AdviceFeed.tsx              #   Weekly tips content feed

  shared/
    config/
      index.ts                    # EXISTS
      seo.ts                      # EXISTS
      stripe.ts                   # NEW -- Stripe price IDs, product config
    ui/
      EmailCapture.tsx            # EXISTS -- keep for non-Founding contexts
      JsonLd.tsx                  # EXISTS
      button.tsx                  # EXISTS
      Toast.tsx                   # NEW -- auto-dismiss banner (deletion confirmation)
      StepIndicator.tsx           # NEW -- reusable multi-step progress
    lib/
      session.ts                  # NEW -- session_id cookie management
      generate-id.ts              # NEW -- nanoid for shareable X-Ray URLs
```

### FSD compliance

- `xray-result` is an **entity** (data model + read-only card). No side effects, no API calls.
- `screenshot-upload`, `sharing`, `billing`, `founding-program` are **features** (user interactions with side effects).
- `dashboard` is a **widget** (composes features and entities for the logged-in experience).
- Import direction enforced: `app -> widgets -> features -> entities -> shared`.

---

## 10. Mobile UX

### Mobile-first design rules

Gen Z is mobile-first. 78% of 18-24 year olds browse primarily on phones. Every page is designed for 375px first.

### Page-specific mobile adaptations

**Landing page:**
- Hero headline: `fontSize={{ base: '4xl', lg: '6xl' }}` (already implemented)
- Stage cards: stack vertically on mobile (already implemented)
- Founding 50 email capture: full-width, stacked input + button on `base`
- "12 seniors" avatars: wrap to 2 rows on screens <400px

**Quiz (`/quiz`):**
- Pain tiles: 2-column grid on mobile (existing)
- All tile tap targets: minimum 48x48px (verify -- some current tiles may be tight)
- Results view: full-width cards with generous padding

**Screenshot upload (`/xray`):**
- Upload zone: full-width, minimum 200px height
- Camera option: `accept="image/*"` triggers native camera/gallery picker on mobile
- Processing steps: centered, large text, thumb-friendly

**Time X-Ray result (`/xray/[id]`):**
- Card: full-width with 16px inline padding
- Share buttons: sticky bottom bar on mobile (`position: fixed`, `bottom: 0`, above safe area inset)
- Upsell block: full-width, stacked buttons

### Performance budget

| Metric | Target | Measurement |
|---|---|---|
| LCP | <2.5s on 4G | Vercel Analytics + Lighthouse CI |
| FID / INP | <200ms | Vercel Analytics |
| CLS | <0.1 | Vercel Analytics |
| JS bundle (initial route) | <100KB gzip | `next build` output |
| Time to Interactive | <3s on 4G | Lighthouse |

### Performance strategy

- Default to RSC (server components). Zero JS sent for static content.
- `"use client"` only for: PainQuiz, UploadZone, ProcessingSteps, ShareActions, PurchaseButton, FoundingEmailCapture, EmailCapture, CookieConsent, HeroSection (email form).
- Client-side image compression runs in a Web Worker (non-blocking).
- Images via `next/image` with WebP/AVIF, sized for device viewport.
- Fonts via `next/font` with `display: swap` (already configured in `layout.tsx`).
- Lazy load `html-to-image` only when "Save as image" is clicked (dynamic import).

---

## 11. Sharing Mechanics

### Three sharing methods

**Method 1 -- Link sharing (primary, PoC)**

- URL: `https://meldar.ai/xray/[id]`
- Page has full OG meta tags for rich previews
- Dynamic OG image at `/xray/[id]/og` via `next/og` ImageResponse (edge runtime)
- OG image renders the X-Ray card as 1200x630 PNG
- Share button: Web Share API on mobile (native share sheet), "Copy link" fallback on desktop

Dynamic OG meta tags for `/xray/[id]`:
```html
<meta property="og:title" content="My Time X-Ray -- Meldar" />
<meta property="og:description" content="I spend 7.4 hrs/day on my phone. Instagram alone is 2.3 hours." />
<meta property="og:image" content="https://meldar.ai/xray/abc123/og" />
<meta property="og:url" content="https://meldar.ai/xray/abc123" />
<meta property="twitter:card" content="summary_large_image" />
```

Description is dynamic, generated from the user's actual data. Makes every share unique and curiosity-inducing.

**Method 2 -- Save as image (Phase 2)**

- `html-to-image` renders XRayCard DOM node to PNG
- Downloads as `my-time-xray.png`
- Card includes `meldar.ai` watermark in footer
- On mobile, triggers native "Save to Photos"

**Method 3 -- Screenshot-friendly design (passive)**

- Card at 440px max-width sits cleanly within phone screenshot frame
- Enough padding and contrast to look good when screenshotted
- `meldar.ai` watermark always visible in card footer

### Privacy in sharing

- Shared pages show app names + hours (specific, per locked consensus)
- No identifying info unless user opted in (default: anonymous)
- "Someone's Time X-Ray" header by default
- Viewers see a "Get your own X-Ray" CTA at the bottom of shared pages

---

## 12. Session Management (PoC vs MVP)

### PoC: No auth, session_id cookie

- Anonymous `session_id` set as httpOnly cookie on first visit
- Quiz results and screenshot analyses stored in Neon with `session_id` (nullable `user_id`)
- Shareable X-Ray URLs use the database record's UUID (`/xray/[id]`)
- Stripe Checkout pre-fills email if user already subscribed via Founding 50 capture
- No session merge needed -- no accounts exist

### MVP: Magic link auth + session merge

When a user clicks a magic link for the first time:

1. Server creates/finds user record by email
2. Server queries all records matching current `session_id` cookie
3. Server updates `user_id` on all matching records (quiz_results, screentime_analyses)
4. Server sets authenticated session cookie
5. Client redirects to `/dashboard`

Dashboard shows a one-time "We found your existing data" banner with prior X-Ray results. Banner dismisses after click.

If no prior data exists, dashboard shows "Create your first X-Ray" card.

Merge is silent -- no "merging..." screen, no user confirmation needed.

---

## 13. Dependencies on Other Clusters

### From Architecture

| Need | What | When |
|---|---|---|
| Database schema | `subscribers`, `quiz_results`, `screentime_analyses` tables in Neon | PoC Week 1 |
| Drizzle ORM setup | `src/server/db/schema.ts` + `src/server/db/client.ts` | PoC Week 1 |
| API route structure | `/api/upload/screentime` replaces mock | PoC Week 1 |
| Auth.js setup | Magic link provider + Drizzle adapter | MVP Week 7 |
| Session merge logic | Server-side function to reassign `session_id` records to `user_id` | MVP Week 7 |

### From AI Pipeline

| Need | What | When |
|---|---|---|
| Real Claude Vision integration | Replace mock in `/api/upload/screentime/route.ts` | PoC Week 1 |
| Zod response schema | `ScreenTimeAnalysis` type with `apps`, `totalHours`, `confidence` | PoC Week 1 |
| Error response format | `{ error: "not_screen_time" | "unreadable" }` | PoC Week 1 |
| Rule-based insights function | `generateInsights(data: ScreenTimeAnalysis): Insight[]` | PoC Week 2 |

### From DevOps

| Need | What | When |
|---|---|---|
| Neon Postgres provisioned | Frankfurt region, connection string in Vercel env vars | PoC Week 1 |
| `ANTHROPIC_API_KEY` in Vercel env | Server-side env var | PoC Week 1 |
| `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` in Vercel env | Server-side env vars | PoC Week 1 |
| Sentry setup | `@sentry/nextjs` SDK with session replay on funnel pages | PoC Week 2 |
| Upstash Redis | Rate limiting on `/api/upload/screentime` (5 req/min/IP) | PoC Week 2 |

### From Business

| Need | What | When |
|---|---|---|
| Stripe products created | Time Audit (EUR 29), Starter (EUR 9/mo), founding coupons | PoC Week 1 |
| Stripe Tax enabled | EU OSS VAT handling | PoC Week 1 |
| Welcome email copy | Resend template for Founding 50 welcome | PoC Week 1 |
| Audit delivery process | How founder delivers the EUR 29 audit manually | Phase 2 Week 3 |
| Privacy policy updates | AI sub-processor disclosure, payment terms | PoC Week 2 |
| "12 seniors" avatars/photos | 12 images for Trust section subsection | PoC Week 2 |

---

## 14. Week-by-Week Deliverables

### Phase 1: PoC (Weeks 1-2)

**Week 1 -- Revenue infrastructure + core funnel**

| Day | Deliverable | Blocked by |
|---|---|---|
| 1 | Fix all dead CTAs (TiersSection, PainQuiz, HeroSection) | Nothing |
| 1 | Create `/api/billing/checkout/route.ts` + `/api/billing/webhook/route.ts` | Stripe products (Business) |
| 2 | Create `features/billing/` slice (PurchaseButton, use-checkout hook) | Checkout API route |
| 2 | Create `features/founding-program/` slice (FoundingEmailCapture, FoundingCounter) | Neon DB (DevOps) |
| 2 | Update HeroSection + EarlyAdopterSection with Founding 50 messaging | FoundingEmailCapture |
| 3 | Create `/xray` page with enhanced upload UX (UploadZone, ProcessingSteps, DeletionBanner) | AI pipeline ready (AI) |
| 3 | Create `features/screenshot-upload/` slice with client-side compression | Nothing |
| 4 | Create `entities/xray-result/` (types, XRayCard, XRayCardActions) | Zod schema (AI) |
| 4 | Create `/xray/[id]` shareable result page with OG meta tags | XRayCard entity |
| 5 | End-to-end testing: landing -> quiz -> upload -> X-Ray -> share -> purchase | All above |

**Week 2 -- Polish + virality + revenue completion**

| Day | Deliverable | Blocked by |
|---|---|---|
| 1 | Create `/xray/[id]/og/route.tsx` dynamic OG image | XRayCard design |
| 1 | Create `features/sharing/` slice (ShareActions, use-share, render-card-image) | OG route |
| 2 | Add upsell block to X-Ray result page (Time Audit EUR 29 + Founding 50) | Billing feature |
| 2 | Add CTA buttons to ProblemSection, HowItWorksSection, DataReceiptSection, SkillCardsSection | Nothing |
| 3 | Add "12 seniors" subsection to TrustSection + footer line | Avatar images (Business) |
| 3 | Update PainQuiz results to link to `/xray` with Founding 50 messaging | Nothing |
| 4 | Update `privacy-policy/page.tsx` with AI sub-processor + payment disclosures | Legal copy (Business) |
| 4 | Update `terms/page.tsx` with payment terms + AI disclaimer | Legal copy (Business) |
| 5 | Mobile QA pass: test entire funnel on iPhone Safari + Android Chrome | All above |
| 5 | Performance audit: Lighthouse, bundle size check, LCP verification | All above |

**PoC deliverable: A live site where users can take the quiz, upload screenshots, see their Time X-Ray, share it, and purchase a Time Audit for EUR 29.**

### Phase 2: Commercial Validation (Weeks 3-6)

| Week | Deliverable | Notes |
|---|---|---|
| 3 | Create `/audit/[token]` delivery page for paid Time Audits | Signed JWT token verification |
| 3 | Add "Save as image" feature (html-to-image) to X-Ray result | Dynamic import, lazy loaded |
| 4 | Create `/about` page with "12 seniors" full story | Content from Business |
| 4 | Add GA4 event tracking on all CTAs, funnel steps, and share actions | Consent-gated per GDPR |
| 5 | A/B test: Founding 50 counter vs no counter on conversion rate | GA4 + Stripe data |
| 5 | Iterate on X-Ray card design based on share/screenshot data | Analytics from Week 3-4 |
| 6 | Iterate on upsell messaging based on purchase conversion data | Stripe dashboard data |
| 6 | Sitemap update to include new pages (`/xray`, `/about`) | SEO |

### Phase 3: MVP (Weeks 7-10)

| Week | Deliverable | Blocked by |
|---|---|---|
| 7 | Create `/login` page with magic link form | Auth.js setup (Arch) |
| 7 | Create `features/auth/` slice (LoginForm, AuthGuard, use-session) | Auth.js (Arch) |
| 7 | Create `/dashboard/layout.tsx` with auth middleware | Auth feature |
| 8 | Create dashboard pages: overview, xrays, settings | Auth middleware |
| 8 | Session merge UX: "We found your existing data" banner | Merge logic (Arch) |
| 9 | Create `/dashboard/advice` with MDX content feed | Content (Business) |
| 9 | Create `/takeout` page with client-side ZIP parsing (JSZip) | Takeout parser (AI) |
| 10 | GDPR: data export endpoint UI, "Delete everything" button in settings | GDPR endpoints (Arch) |
| 10 | Full mobile QA pass on all new pages | All above |

---

## 15. Risk Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Stripe webhook fails silently | Medium | High (lost payments) | Log every webhook event. Sentry alert on webhook errors. Manual fallback: check Stripe dashboard daily. |
| Claude Vision returns garbage for unusual screenshots | Medium | Medium (bad UX) | Show partial results with "try a clearer screenshot" CTA. Confidence field drives messaging. |
| Users screenshot the wrong screen | High | Low | Show inline visual guide ("this is what to screenshot") with platform-specific examples. |
| Founding 50 fills too fast (before site is polished) | Low | Medium | Set initial cap at 25, expand to 50 after Week 2 polish is complete. |
| Founding 50 doesn't fill at all | Medium | High (no revenue validation) | Iterate on CTA copy weekly. Add urgency: "Only available until [date]." Shift to paid acquisition if organic fails by Week 4. |
| Low share rate on X-Ray cards | Medium | Medium (no viral loop) | A/B test card designs. Add "compared to average" benchmarks if available. Test different share prompts. |
| Mobile performance regression (LCP >2.5s) | Low | Medium | Lighthouse CI in GitHub Actions (MVP). Client-side image compression prevents large uploads. RSC by default. |
| Stripe Checkout friction (redirect away from site) | Medium | Medium | Pre-fill email to reduce form fields. Show reassuring copy before redirect: "You'll be redirected to Stripe's secure checkout." |

---

## 16. Success Metrics

### PoC (Weeks 1-2)

| Metric | Target | Measurement |
|---|---|---|
| All CTAs functional | 100% | Manual QA |
| Lighthouse mobile score | >90 | Lighthouse CI |
| First Founding 50 signup | Within 48 hours | Resend dashboard |

### Commercial Validation (Weeks 3-6)

| Metric | Target | Measurement |
|---|---|---|
| Founding 50 signups | 50 in 6 weeks | Resend contact count |
| First EUR 29 payment | Within 2 weeks of launch | Stripe dashboard |
| Quiz completion rate | >60% of starts | GA4 event |
| Screenshot upload rate | >20% of quiz completers | GA4 event |
| X-Ray share rate | >15% of X-Ray viewers | GA4 share event |
| CTA click-through rate | >5% per section | GA4 event per CTA |
| Stripe Checkout completion | >50% of sessions | Stripe dashboard |

### MVP (Weeks 7-10)

| Metric | Target | Measurement |
|---|---|---|
| Dashboard daily active users | >10% of authenticated users | GA4 |
| Session merge success rate | >99% | Server logs |
| Magic link email delivery | >95% | Resend dashboard |
| Takeout upload completion | >30% of starts | GA4 event |
| LCP on all pages | <2.5s | Vercel Analytics |
