# Frontend & UX Plan -- Meldar PoC / MVP

**Authors:** Frontend Developer, ArchitectUX, UX Researcher
**Date:** 2026-03-30
**Status:** Draft (Iteration 1)

---

## 1. New Pages & Routes

### PoC Routes (launch first)

| Route | Purpose | Auth? |
|---|---|---|
| `/quiz` | Pick Your Pain quiz (exists, needs polish) | No |
| `/quiz/results` | Quiz results + upsell to screenshot upload | No |
| `/xray` | Screen Time screenshot upload + live analysis | No |
| `/xray/[id]` | Time X-Ray result page (shareable) | No |
| `/xray/[id]/og` | Dynamic OG image for sharing a specific X-Ray | No |

### MVP Routes (after validation)

| Route | Purpose | Auth? |
|---|---|---|
| `/login` | Magic link login | No |
| `/dashboard` | Early adopter hub: results, advice, settings | Yes |
| `/dashboard/xrays` | All past Time X-Ray results | Yes |
| `/dashboard/advice` | "Advice from 12 seniors" content feed | Yes |
| `/dashboard/settings` | Email, notifications, data deletion | Yes |
| `/takeout` | Google Takeout upload + client-side parser | Yes |
| `/about` | "Built by 12 IT seniors" story page | No |

### Route architecture notes

- `/xray/[id]` is the viral surface. It must work without auth -- anyone with the link can view a result.
- Quiz and X-Ray flows do NOT require auth for PoC. Conversion to signup happens *after* they see value.
- Dashboard routes sit behind middleware auth check via `src/app/dashboard/layout.tsx`.

---

## 2. User Journey Map

### Primary flow (PoC target)

```
Landing page
  |
  v
[CTA: "See what eats your time"]
  |
  +---> Quiz (15 sec, zero data)
  |       |
  |       v
  |     Quiz Results ("~12 hrs/week recoverable")
  |       |
  |       +---> [CTA: "Get your real numbers"]
  |               |
  |               v
  +----------> Screenshot Upload (/xray)
                 |
                 v
               Processing indicator (3-5 sec)
                 |
                 v
               Time X-Ray result (/xray/[id])
                 |
                 +---> Share (generates OG image, copies link)
                 |
                 +---> [CTA: "Save your results + get weekly tips"]
                         |
                         v
                       Email capture (or magic link signup for MVP)
```

### Conversion psychology (UX Researcher notes)

1. **Zero-friction entry.** Quiz requires no data, no signup, no permissions. This is critical for Gen Z -- they bounce at any friction.
2. **Value before ask.** Users see their quiz results AND their Time X-Ray before we ask for an email. They've already invested 60 seconds and received something personal.
3. **Escalating commitment.** Quiz (0 effort) -> Screenshot (low effort, they already have it) -> Email (earned trust) -> Google Takeout (high effort, only after trust).
4. **Social proof via sharing.** The Time X-Ray result is designed to be screenshot-worthy AND link-shareable. Friends see it, want their own.

### Drop-off mitigation

- **Quiz -> Screenshot:** Show the gap between estimated and real numbers. "Your quiz says ~12 hrs. Want your real number? It takes 30 seconds."
- **Screenshot -> Signup:** The X-Ray result is the hook. The CTA to save results + get tips feels like a natural next step, not a paywall.
- **Anywhere -> Exit:** Exit intent on desktop shows a mini Data Receipt card with "Get yours free" -- not a popup wall.

---

## 3. Time X-Ray Result Page (`/xray/[id]`)

### Design concept: "Spotify Wrapped meets a lab report"

The page has two zones:

**Zone 1 -- The Card (above the fold, shareable)**

A self-contained card that works as both a page section and a generated image for sharing. Structured like a receipt:

```
+--------------------------------------------+
|  [gradient header bar]                     |
|  YOUR TIME X-RAY              meldar.ai    |
+--------------------------------------------+
|                                            |
|  Total screen time       7.4 hrs/day       |
|  ----------------------------------------  |
|  Top app                 Instagram  2.3h   |
|  #2                      Safari     1.8h   |
|  #3                      Mail       1.2h   |
|  #4                      Messages   0.9h   |
|  #5                      YouTube    0.8h   |
|  ----------------------------------------  |
|  Daily pickups           87                |
|  Recoverable time        ~2.1 hrs/day      |
|                                            |
|  "You check your phone 87 times a day.     |
|   Instagram alone is 16 hrs/week --        |
|   almost a part-time job."                 |
|                                            |
+--------------------------------------------+
|  [Share]  [Save as Image]  [Get tips -->]  |
+--------------------------------------------+
```

Visual treatment:
- Card sits on the warm cream (#faf9f6) background
- Header gradient bar: #623153 -> #FFB876
- Stats use Bricolage Grotesque in the primary color for numbers
- Light horizontal rules between rows, no heavy borders
- Rounded corners (xl), subtle shadow
- Card max width: 440px -- optimized for mobile screenshot sharing
- The card ratio (roughly 3:4) is chosen so it looks good when screenshotted on a phone

**Zone 2 -- Below the card (context + conversion)**

- **Insight paragraph:** AI-generated one-liner insight (e.g., "Your top 3 apps eat 5.3 hours. That's 37 hours a week -- more than most people work.")
- **"What Meldar would build for you":** 2-3 automation suggestions based on the detected apps (e.g., Instagram heavy -> social scheduling tool, Mail heavy -> email triage)
- **CTA block:** "Save your X-Ray + get weekly tips" with email capture
- **Trust strip:** "Your screenshot was processed and deleted immediately. We never store your images." with a lock icon

### Accessibility

- Card content is real text, not a rendered image (image is only generated for sharing)
- All colors meet WCAG AA contrast on the cream background
- Focus-visible outlines on all interactive elements
- Screen reader: card reads as a description list (`<dl>`)
- Reduced motion: no animations by default, subtle fade-in behind `prefers-reduced-motion: no-preference`

---

## 4. Screenshot Upload UX

### The core challenge

Gen Z is privacy-aware but not privacy-literate. They won't read a policy, but they *feel* whether something is safe. The UX must *feel* safe through design, not disclaimers.

### Upload flow (step by step)

**Step 1 -- Instruction + Upload zone**

```
+--------------------------------------------+
|                                            |
|    [Phone icon]                            |
|                                            |
|    Take a screenshot of your Screen Time   |
|                                            |
|    iPhone: Settings > Screen Time >        |
|            See All Activity > screenshot   |
|                                            |
|    Android: Settings > Digital Wellbeing > |
|             screenshot                     |
|                                            |
|    [  Drop image or tap to choose  ]       |
|                                            |
+--------------------------------------------+
|  Your image is processed in seconds and    |
|  deleted immediately. We never store it.   |
+--------------------------------------------+
```

Design decisions:
- Dashed border drop zone (existing pattern, keep it)
- Platform toggle (iPhone / Android) -- show correct instructions per platform. Default to iPhone (Gen Z skew), but detect via `navigator.userAgent` if available
- Privacy message is *below* the upload zone, not in a tooltip or modal. It's always visible. Short. Factual.
- No "terms and conditions" language. Just "processed and deleted immediately."

**Step 2 -- Processing indicator**

```
+--------------------------------------------+
|                                            |
|    [Animated progress]                     |
|                                            |
|    Reading your screen time...             |
|                                            |
|    Step 1: Detecting apps         [done]   |
|    Step 2: Extracting hours       [...]    |
|    Step 3: Generating your X-Ray           |
|                                            |
+--------------------------------------------+
```

Design decisions:
- Multi-step progress (not a spinner). Shows the user what's happening, builds confidence that it's working
- Each step completes visually before the next starts (can be timed if API doesn't stream progress)
- Total time target: 3-5 seconds. If faster, hold the animation slightly so it feels intentional
- No thumbnail of their uploaded image is shown during processing -- reinforces that we're not keeping it

**Step 3 -- Deletion confirmation**

After result loads, a brief toast/banner:

```
[Shield icon] Your screenshot was deleted. Only the extracted data remains below.
```

This is not a modal. It's a subtle, self-dismissing banner at the top of the result page. Green shield icon. Disappears after 5 seconds or on scroll.

### Error states

- **Unreadable image:** "We couldn't read that image. Make sure it's a Screen Time screenshot, not just a lock screen. [Try again]"
- **Wrong format:** "That doesn't look like a Screen Time screenshot. Here's what to screenshot: [visual guide]"
- **Server error:** "Something went wrong on our end. Your image was not stored. [Try again]"

---

## 5. Early Adopter Dashboard

### Information architecture

```
/dashboard
  |
  +-- Overview (default view)
  |     - Latest X-Ray card (or prompt to create one)
  |     - "This week's tip" card
  |     - Quick stats: total time recovered, X-Rays created
  |
  +-- /xrays
  |     - List of past Time X-Ray results
  |     - Each card links to /xray/[id]
  |     - "New X-Ray" button
  |
  +-- /advice
  |     - Feed of "advice from 12 seniors" articles
  |     - Weekly tip with date
  |     - Categories: Automation basics, Privacy, Productivity, Tools
  |
  +-- /settings
        - Email address (editable)
        - Notification preferences (weekly tips on/off)
        - "Delete all my data" button (GDPR)
        - Log out
```

### Dashboard design principles

1. **Not a SaaS dashboard.** No sidebar nav, no data tables, no admin feel. This is a personal space.
2. **Card-based layout.** Everything is a card. Matches the X-Ray card visual language.
3. **Mobile-first grid.** Single column on mobile, 2-column on tablet+. No horizontal scroll.
4. **Progressive disclosure.** New users see a prominent "Create your first X-Ray" card. Returning users see their latest result.

### Navigation

- Top nav bar (existing Header component) gets a user avatar/initial circle when logged in
- Dashboard sub-nav is horizontal tabs below the header (Overview | X-Rays | Advice | Settings)
- On mobile, tabs scroll horizontally if needed
- Active tab uses the gradient underline (#623153 -> #FFB876)

### "Advice from 12 seniors" content

Content cards in a vertical feed. Each card:
- Title (Bricolage Grotesque, bold)
- 1-2 paragraph body (Inter, light)
- Category tag (e.g., "Automation basics")
- Date
- Optional "Try this" action button that links to relevant Meldar feature

Content is server-rendered (RSC). No CMS needed for PoC -- MDX files in the repo, loaded at build time. For MVP, consider a headless CMS or Notion as data source.

---

## 6. Auth UX

### PoC: No auth required

The PoC quiz and screenshot flows work without accounts. Results are stored ephemerally (localStorage on client, or short-lived server storage with a shareable UUID). This removes the #1 conversion killer for Gen Z.

### MVP: Magic link (passwordless)

**Why magic link over alternatives:**

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| Email + password | Familiar | Passwords = friction, forgot-password flow | No |
| Google OAuth | 1-tap on Chrome | "Google sees my data" fear, contradicts positioning | No |
| Apple Sign In | Privacy-friendly | Low Android penetration | Maybe (add later) |
| Magic link | Zero friction, no password | Requires email access | Yes (primary) |
| SMS OTP | Fast | Costs money per SMS, needs phone number | No (PoC) |

**Magic link flow:**

```
[Enter email] --> [Check your inbox] --> [Click link] --> [Logged in]
```

- Email sent via Resend (already in stack)
- Link contains a signed JWT token with 15-min expiry
- Token exchange creates a session cookie (httpOnly, secure, sameSite=strict)
- Session duration: 30 days, refreshed on activity
- No "create account" vs "log in" distinction. Same flow. If email is new, account is created silently.

**UX details:**
- Login page is minimal: email input + "Send me a link" button
- After sending: animated checkmark + "Check your inbox. The link expires in 15 minutes."
- Deep link support: if user was on `/xray/abc123`, after login they return to `/xray/abc123`
- "Logged in as [email]" indicator in header, subtle

---

## 7. "Built by 12 IT Seniors" Section

### Placement strategy

This message serves two purposes: **trust** and **differentiation**. It answers "who's behind this?" and "why should I trust you?"

**Primary placement: Landing page, after the Trust section (position 5.5)**

Insert a new section between Trust and Skills:

```
+--------------------------------------------+
|                                            |
|  Built in a single day                     |
|  by 12 IT seniors.                         |
|                                            |
|  Not a faceless startup.                   |
|  A team that's been building software      |
|  for decades, working together to give     |
|  you AI that actually works.               |
|                                            |
|  [12 small avatar circles in a row]        |
|  Combined experience: 150+ years           |
|                                            |
+--------------------------------------------+
```

Design treatment:
- Full-width section, warm cream background
- Headline in Bricolage Grotesque, primary color, large (4xl+)
- "In a single day" in gradient text (#623153 -> #FFB876) for emphasis
- Avatar circles: small (40px), circular, arranged in a slightly overlapping row (like GitHub contributor avatars)
- Below avatars: combined experience stat as a single large number
- Optional: on hover/tap, each avatar shows name + specialty in a tooltip

**Secondary placements:**
- Footer: small text "Built by 12 IT seniors in Helsinki" next to company info
- `/about` page (MVP): Full story with team details, the "why" behind building Meldar, photos

**Why this position on the landing page:**
- After Trust section, the user has just read "what we see / what we never see." They're thinking about who's behind the curtain.
- Before Skills section, where we show *what* the team can build. "Built by seniors" primes credibility for the automations shown next.

---

## 8. Component Architecture (FSD Slices)

### New slices needed

```
src/
  entities/
    pain-points/              # EXISTS -- keep as-is
    xray-result/              # NEW -- Time X-Ray data model
      index.ts                #   barrel
      model/
        types.ts              #   XRayResult, AppUsage, XRayInsight types
        mock.ts               #   Mock data for development
      ui/
        XRayCard.tsx           #   The shareable card component (RSC)

  features/
    quiz/                     # EXISTS -- extend
      ui/
        PainQuiz.tsx           #   EXISTS -- refactor to use router for results
        ScreenTimeUpload.tsx   #   EXISTS -- enhance with platform toggle, step progress
    screenshot-upload/        # NEW -- extracted from quiz, standalone upload flow
      index.ts
      ui/
        UploadZone.tsx         #   Drop zone with platform detection
        ProcessingSteps.tsx    #   Multi-step progress indicator
        DeletionBanner.tsx     #   "Screenshot deleted" confirmation
      lib/
        use-upload.ts          #   Upload state machine hook
    sharing/                  # NEW -- share mechanics for X-Ray
      index.ts
      ui/
        ShareActions.tsx       #   Share / Save as Image / Copy Link buttons
      lib/
        use-share.ts           #   Web Share API + fallback
        generate-image.ts      #   html2canvas or similar for card -> image
    auth/                     # NEW (MVP) -- magic link authentication
      index.ts
      ui/
        LoginForm.tsx          #   Email input + send link
        AuthGuard.tsx          #   Wraps protected routes
      lib/
        use-session.ts         #   Session state hook
    cookie-consent/           # EXISTS -- no changes
    analytics/                # EXISTS -- no changes

  widgets/
    landing/                  # EXISTS -- add BuiltBySeniorsSection
      BuiltBySeniorsSection.tsx  # NEW
    header/                   # EXISTS -- extend with auth state (avatar when logged in)
    footer/                   # EXISTS -- add "Built by 12 seniors" line
    dashboard/                # NEW (MVP)
      index.ts
      DashboardNav.tsx         #   Horizontal tab navigation
      OverviewCards.tsx         #   Latest X-Ray + tip + stats
      XRayHistory.tsx          #   List of past X-Rays
      AdviceFeed.tsx           #   Weekly tips content feed

  shared/
    ui/
      EmailCapture.tsx         # EXISTS -- no changes
      JsonLd.tsx               # EXISTS -- no changes
      button.tsx               # EXISTS -- no changes
      Toast.tsx                # NEW -- for deletion confirmation banner
      StepIndicator.tsx        # NEW -- reusable multi-step progress
    lib/
      generate-xray-id.ts     # NEW -- nanoid or uuid for shareable URLs
```

### FSD compliance notes

- `xray-result` entity holds the data model and the read-only card. It doesn't import from features.
- `screenshot-upload` feature orchestrates the upload flow and calls the API. It imports from `xray-result` entity for types.
- `sharing` feature handles share actions. It imports from `xray-result` entity for the card component (to render as image).
- `dashboard` widget composes features and entities for the logged-in experience.
- `auth` feature is MVP-only. PoC flows work without it.

---

## 9. Mobile UX Priorities

### Mobile-specific considerations

**Gen Z is mobile-first.** 78% of 18-24 year olds browse primarily on phones. Every page must be designed for 375px first, then expanded.

### Page-by-page mobile adaptations

**Landing page:**
- Hero: single column, headline scales from 4xl (mobile) to 6xl (desktop)
- Stage cards: stack vertically on mobile (already handled by `Grid columns={{ base: 1, md: 3 }}`)
- Data Receipt card: already 440px max -- fits perfectly on mobile
- "Built by 12 seniors" avatars: wrap to 2 rows on small screens

**Quiz:**
- Pain tiles: 2-column grid on mobile (existing), increase tap target to 48px min
- Results: full-width cards, no side padding waste

**Screenshot upload:**
- Upload zone: full-width, tall tap target (min 200px height)
- Camera option: on mobile, `accept="image/*"` triggers camera OR gallery picker natively
- Processing steps: centered, large text, thumb-friendly

**Time X-Ray result:**
- Card: full-width with small inline padding (16px)
- Share buttons: sticky bottom bar on mobile (fixed position, above safe area)
- Below-card content: full-width, generous line spacing

**Dashboard (MVP):**
- Tab nav: horizontal scroll with gradient fade on edges
- Cards: full-width, stacked vertically
- Settings: simple form, large inputs, thumb-friendly buttons

### Touch targets

All interactive elements: minimum 44x44px (WCAG 2.5.8, Apple HIG). Currently some buttons in the quiz are close to this -- verify during implementation.

### Performance budget

| Metric | Target | Why |
|---|---|---|
| LCP | <2.5s on 4G | Google Core Web Vital, landing page ranking |
| FID | <100ms | Interactive responsiveness |
| CLS | <0.1 | No layout shifts from loading content |
| JS bundle (initial) | <100KB gzip | Gen Z on spotty mobile data |
| Time to Interactive | <3s on 4G | They leave if it's slow |

Strategy:
- Default to RSC (server components) -- zero JS sent for static content
- `"use client"` only for: quiz interaction, upload flow, email capture, share buttons, cookie consent
- Lazy load below-fold landing sections (already server-rendered, no issue)
- Images: next/image with WebP/AVIF, proper sizing for mobile/desktop
- Fonts: `next/font` with `display: swap` (already configured)

---

## 10. Sharing Mechanics

### The viral loop

```
User creates X-Ray --> Shares to social / DM --> Friend sees card
--> Friend clicks link --> Friend lands on /xray/[id] --> Friend wants their own
--> Friend clicks "Get yours free" --> Quiz or Upload flow --> New X-Ray
```

### Implementation: three sharing methods

**Method 1 -- Link sharing (primary)**

- URL: `https://meldar.ai/xray/[id]`
- Page has full OG meta tags for rich previews on social platforms
- Dynamic OG image generated at `/xray/[id]/og` via `next/og` (ImageResponse API)
- OG image is the Time X-Ray card rendered as a 1200x630 PNG
- Share button uses Web Share API on mobile (native share sheet), falls back to "Copy link" on desktop

OG meta tags for `/xray/[id]`:
```html
<meta property="og:title" content="My Time X-Ray -- Meldar" />
<meta property="og:description" content="I spend 7.4 hrs/day on my phone. Instagram alone is 2.3 hours." />
<meta property="og:image" content="https://meldar.ai/xray/abc123/og" />
<meta property="og:url" content="https://meldar.ai/xray/abc123" />
<meta property="twitter:card" content="summary_large_image" />
```

The description is dynamic, generated from the user's actual data. This makes every share unique and curiosity-inducing.

**Method 2 -- Save as image**

- "Save as image" button renders the XRayCard component to a canvas using `html-to-image` (or similar)
- Downloads as PNG with filename `my-time-xray.png`
- Image includes the meldar.ai watermark in the footer of the card
- On mobile, this triggers the native "Save to Photos" flow

**Method 3 -- Screenshot-friendly design**

- The card is designed so that a native phone screenshot of the result page captures the card cleanly
- Card has enough padding and contrast to look good when screenshotted
- `meldar.ai` watermark is always visible in the card footer
- This is the "organic" share method -- users will screenshot without being prompted

### Dynamic OG image route (`/xray/[id]/og`)

Uses `next/og` ImageResponse (same pattern as existing `/og/route.tsx`):

- Fetches X-Ray data by ID
- Renders the card layout using the Satori JSX renderer
- Returns 1200x630 PNG
- Edge runtime for fast response
- Cached with `revalidate: 3600` (results don't change)

### Privacy in sharing

- Shared X-Ray pages show aggregated data only (app names + hours), not raw screenshots
- No identifying information in the shared view unless the user added their name
- "This is [name]'s Time X-Ray" only if user opted in to showing their name
- Default: anonymous ("Someone's Time X-Ray")

---

## 11. PoC vs MVP Boundary

### PoC scope (build first, validate fast)

| Feature | Details | Why PoC |
|---|---|---|
| Quiz polish | Refine existing quiz, add results page with upsell | Exists, needs minor work |
| Screenshot upload + analysis | Enhanced upload UX, Claude Vision API integration | Core value prop validation |
| Time X-Ray result page | Shareable card with real data | The viral hook |
| Dynamic OG images | Per-X-Ray OG image for social sharing | Sharing = growth |
| "Built by 12 seniors" section | Landing page section + footer mention | Trust + differentiation |
| Link sharing | Shareable URLs with OG previews | Minimum viable virality |
| Mobile optimization | All PoC pages responsive, touch-friendly | Primary audience is mobile |

PoC does NOT include: auth, dashboard, Google Takeout, advice content, settings, image download.

X-Ray results in PoC are stored server-side with a UUID, no auth needed. Ephemeral storage (auto-delete after 30 days) is fine for validation.

### MVP scope (build after PoC validates)

| Feature | Details | Why MVP |
|---|---|---|
| Magic link auth | Passwordless login via Resend | Needed for dashboard |
| Early adopter dashboard | Overview, X-Ray history, advice feed, settings | Retention + engagement |
| Google Takeout upload | Client-side parsing, deeper analysis | Effort escalation step 3 |
| Save as image | Download X-Ray card as PNG | Enhanced sharing |
| Advice content | "12 seniors" tips, MDX-based | Retention hook |
| GDPR data deletion | Self-serve "delete everything" | Legal requirement |
| `/about` page | Full team story | Deeper trust |
| Notification preferences | Weekly tip email opt-in/out | User control |

### Success metrics for PoC -> MVP decision

| Metric | Target | Measurement |
|---|---|---|
| Quiz completion rate | >60% of starts | GA event tracking |
| Screenshot upload rate | >20% of quiz completers | GA event tracking |
| X-Ray share rate | >15% of X-Ray viewers | Share button click events |
| Email capture rate | >10% of X-Ray viewers | Resend subscriber count |
| Return visits | >5% within 7 days | GA returning users |

If PoC hits these numbers, proceed to MVP. If not, revisit the value prop and funnel before building more.

---

## Open Questions for Cross-Review

1. **Backend:** What storage do we use for X-Ray results? Vercel KV? Postgres? How long do we keep anonymous results?
2. **AI/Data:** What's the Claude Vision API prompt structure for screen time extraction? How do we handle non-English screenshots?
3. **Business:** Is "Built in a single day by 12 IT seniors" the exact phrasing? Should it be "12 senior developers"? "12 engineers"? Tone matters.
4. **Legal:** Do ephemeral X-Ray results (30-day auto-delete, no auth) trigger GDPR data subject rights? Probably not if truly anonymous, but confirm.
5. **Design:** Should the X-Ray card have a "compared to average" benchmark? E.g., "You use Instagram 2x more than average." This adds social comparison (powerful for Gen Z) but requires baseline data.
