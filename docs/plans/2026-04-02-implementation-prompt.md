# Meldar Implementation Session Prompt

Copy everything below the line into a new Claude Code session in the `agentgate` repo.

---

# Implementation Plan: Meldar Landing Page + SEO + Tracking

You are implementing a prioritized set of changes to meldar.ai (a Next.js 16 app). Read the plan files in `docs/plans/` before making ANY changes:

- `docs/plans/2026-04-02-landing-copy-v2.md` — Ready-to-paste copy for all 11 sections + TypeScript data structures
- `docs/plans/2026-04-02-landing-section-specs.md` — Visual/animation specs with file paths and line numbers
- `docs/plans/2026-04-02-seo-technical-audit.md` — Schema markup, meta tags, sitemap fixes
- `docs/plans/2026-04-02-seo-programmatic-pages.md` — Programmatic SEO page templates (Phase 2, do NOT implement now unless you finish everything else)

Also read `CLAUDE.md` and `AGENTS.md` for coding standards.

## Context

Meldar helps non-technical people discover what AI app to build for their life. The site is live at meldar.ai. Solo founder, browser-only audience, zero jargon.

Key decisions already made:
- "Time X-Ray" renamed to "Digital Footprint Scan"
- Revenue model: Free (scan) / Build EUR 79 (founder builds your app) / Bundle EUR 9.99/mo (skills library + API bundle)
- Founding member slots: 10-15 (not 50)
- Remove ALL fabricated claims ("12 senior engineers", "we asked thousands")
- Voice: "Confident but warm. Like a friend who's brilliant at this."

## IMPORTANT: Do NOT commit or push. The user handles all git operations manually.

---

## Phase 1: Critical Trust Fixes (do first, blocks everything)

### 1.1 Remove fake "12 engineers" claims

**File: `src/widgets/landing/TrustSection.tsx`**
- Lines ~64-95: Remove the 12 avatar circles (the `.map()` loop generating colored circles) and the text "Built in a single day by 12 senior engineers." / "150+ years combined experience. Refined every day since."
- Replace with:
  - "Built by a founder who uses the same AI tools you're about to learn."
  - "Refined every day since launch."
  - "EU-registered company. GDPR compliant. Data auto-purges in 30 days."
  - "Your screenshot is processed in your browser using OCR. The image never reaches our servers."

**File: `src/widgets/footer/Footer.tsx`**
- Line ~43: Change "Built by 12 senior engineers in Helsinki" to "Built in Helsinki with AI"

### 1.2 Reframe "2,847" stat

**File: `src/widgets/landing/ProblemSection.tsx`**
- Lines ~83-84: Change "We asked thousands of people what annoys them most about daily tasks." to "Posts, threads, and rants we analyzed across Reddit and forums. The same frustrations kept coming up."

### 1.3 Rename "Time X-Ray" → "Digital Footprint Scan"

Search the entire codebase for "Time X-Ray", "X-Ray", "xray" in user-facing text and rename:
- Page titles and meta descriptions mentioning "Time X-Ray"
- UI labels in `/src/app/xray/`, `/src/app/discover/` components
- Do NOT rename file paths/routes yet (that's a bigger refactor) — just the user-facing strings

---

## Phase 2: Pricing & Content Fixes

### 2.1 Update TiersSection with new pricing model

**File: `src/widgets/landing/TiersSection.tsx`**

Replace the entire tier data structure with this (from `landing-copy-v2.md`):

```typescript
const tiers = [
  {
    label: 'Digital Footprint Scan',
    headline: 'Free',
    desc: 'See where your time actually goes. Upload a screenshot or answer a few questions. Get a report showing what to build first.',
    features: [
      'Screen Time screenshot analysis',
      '1 personalized app recommendation',
      'Your data never leaves your browser',
    ],
    cta: 'Start free',
    subtext: 'Because everyone deserves to know the truth about their digital life.',
    highlighted: false,
  },
  {
    label: 'Build',
    headline: 'EUR 79',
    desc: 'We build your first app for you. Working code, fully set up, delivered in 72 hours. You own everything.',
    features: [
      'Founder builds your app by hand',
      'Working code delivered to your GitHub',
      'You own it. You run it. No lock-in.',
    ],
    cta: 'Get it built',
    subtext: 'Less than a day of your time wasted on the problem this app solves.',
    highlighted: false,
  },
  {
    label: 'Bundle',
    headline: 'EUR 9.99/mo',
    desc: "Access Meldar's growing library of tested automations plus every AI tool your app needs — image, video, voice, search — through one subscription.",
    features: [
      'Full skills library (new automations added weekly)',
      'Bundled AI tools: image gen, video, voice, search',
      'One subscription. One bill. Already set up.',
    ],
    cta: 'Start your bundle',
    subtext: "One subscription covers tools you'd have to sign up for separately.",
    highlighted: true,
  },
]
```

### 2.2 Update FAQ with correct pricing

**File: `src/widgets/landing/FaqSection.tsx`**

Replace the FAQ data with the 9-question set from `landing-copy-v2.md`. Critical: Q2 answer currently says "$5-20/month + 5% fee" — must be replaced with the correct tiers (Free / EUR 79 / EUR 9.99/mo).

### 2.3 Reduce founding member slots

**File: `src/features/founding-program/ui/FoundingCounter.tsx`**
- Line ~13: Change the total slots from 50 to 15

### 2.4 Update FAQ JSON-LD schema

**File: `src/app/page.tsx`**
- The FAQ schema (lines ~18-79) has 7 items but the component renders 9. Replace with the updated 9-question schema from `seo-technical-audit.md` Section 3.3. Critical: the pricing answer in schema currently shows wrong pricing that Google reads directly for rich snippets.

---

## Phase 3: Render Missing Sections

**File: `src/app/page.tsx`**

Four sections are built as components but NOT imported/rendered. Add them and reorder to this sequence:

```tsx
import {
  HeroSection,
  ProblemSection,
  ComparisonSection,
  HowItWorksSection,
  DataReceiptSection,
  SkillCardsSection,
  TrustSection,
  TiersSection,
  EarlyAdopterSection,
  FaqSection,
  FinalCtaSection,
} from '@/widgets/landing'

// In JSX:
<HeroSection />
<ProblemSection />
<ComparisonSection />
<HowItWorksSection />
<DataReceiptSection />
<SkillCardsSection />
<TrustSection />
<TiersSection />
<EarlyAdopterSection />
<FaqSection />
<FinalCtaSection />
```

Check `src/widgets/landing/index.ts` — all components should already be exported. If any are missing, add the exports.

---

## Phase 4: SEO Schema Fixes

**File: `src/app/page.tsx` or `src/app/layout.tsx`**

### 4.1 Add Organization schema
Add the Organization JSON-LD from `seo-technical-audit.md` Section 3.1.

### 4.2 Fix SoftwareApplication → WebApplication
Replace the current SoftwareApplication schema with WebApplication from `seo-technical-audit.md` Section 3.2. Critical: current schema claims `operatingSystem: 'macOS, Windows, Linux, iOS, Android'` — it's a web app, should be `operatingSystem: 'Web'`.

### 4.3 Add HowTo schema
Add the HowTo JSON-LD from `seo-technical-audit.md` Section 3.4.

### 4.4 Expand sitemap

**File: `src/app/sitemap.ts`**
Add missing pages: `/discover`, `/discover/sleep`, `/discover/overthink`, `/xray`. Remove the fake `lastModified: new Date()` — either use real dates or omit.

### 4.5 Update robots.txt

**File: `src/app/robots.ts`**
Add Disallow rules for `/api/`, `/thank-you`, `/coming-soon`.

---

## Phase 5: GA4 Conversion Tracking

### 5.1 Create tracking utility

Create `src/shared/lib/analytics.ts`:

```typescript
type EventParams = Record<string, string | number | boolean>

export function trackEvent(name: string, params?: EventParams) {
  if (typeof window === 'undefined') return
  if (typeof window.gtag !== 'function') return

  window.gtag('event', name, params)
}
```

### 5.2 Wire events into components

Use the `trackEvent` function in these locations:

| Event | Where to fire | File |
|---|---|---|
| `quiz_started` | When user clicks "Take the quiz" CTA | `HeroSection.tsx`, any quiz entry point |
| `quiz_completed` | When quiz selection is submitted | Quiz completion handler in `/start` flow |
| `scan_started` | When user uploads a screenshot | Upload handler in xray/start flow |
| `scan_completed` | When OCR successfully returns results | OCR success handler |
| `scan_failed` | When OCR fails | OCR error handler |
| `receipt_generated` | When Data Receipt card is rendered | Results page component |
| `receipt_shared` | When user clicks share button | Share button handler (if exists) |
| `founding_signup` | When founding member email is submitted | `FoundingEmailCapture` submit handler |
| `pricing_viewed` | When Tiers section enters viewport | `TiersSection` with IntersectionObserver |
| `checkout_started` | When user clicks Build/Bundle CTA | Stripe checkout initiation |
| `checkout_completed` | Stripe webhook confirms payment | `/api/billing/webhook` handler |
| `faq_opened` | When FAQ accordion item expands | `FaqSection` toggle handler |
| `cta_clicked` | When any CTA button is clicked | All CTA buttons across landing page |

For `pricing_viewed`, create a small client component wrapper or use the existing `FadeInOnScroll` pattern with an `onVisible` callback.

For `checkout_completed`, fire from the server-side webhook is tricky (no `window`). Instead, fire it on the thank-you/confirmation page load.

Important: All landing page section components are currently server components (no `'use client'`). To add click tracking to CTAs, you'll need to either:
- Create thin client wrapper components for buttons that need tracking
- Or use `<a>` tags with `onClick` handlers in small client islands

Do NOT convert entire sections to client components just for tracking. Keep the RSC architecture intact.

---

## Phase 6: Visual Polish (if time permits)

Refer to `landing-section-specs.md` for detailed specs. Priority items:

### 6.1 Enable scroll animations
The `FadeInOnScroll` component already wraps sections. Verify it's working. The keyframes exist in `globals.css` — check `meldarFadeSlideUp`, `staggerFadeIn` are defined and the `FadeInOnScroll` component applies them.

### 6.2 Alternate section backgrounds
Break the monotony of consecutive `surfaceContainerLow` sections:
- DataReceiptSection: dark background (`inverseSurface` or dark mauve `#481b3c`)
- TrustSection: warm tint (`primary/3`)
- EarlyAdopterSection: slightly stronger tint (`primary/6`)

### 6.3 FAQ accordion animation
Replace conditional render with CSS `grid-template-rows` transition for smooth open/close.

### 6.4 FinalCTA button gradient
The Final CTA button is plain white. Apply the same mauve-to-peach gradient used on all other CTAs.

---

## What NOT to do

- Do NOT rename `/xray` route to `/scan` (save for a separate PR with redirects)
- Do NOT build the blog route, programmatic pages, or comparison pages (Phase 2)
- Do NOT add dark mode
- Do NOT refactor the design system or component library
- Do NOT add new dependencies unless absolutely necessary
- Do NOT touch the discovery flow (/start, quiz, upload) — only the landing page
- Do NOT commit or push — user handles git manually

---

## Verification checklist

After all changes, verify:
- [ ] Landing page renders all 11 sections in correct order
- [ ] No mention of "12 engineers" or "150+ years" anywhere
- [ ] "2,847" stat uses "analyzed" framing, not "asked"
- [ ] FAQ Q2 shows correct pricing (Free / EUR 79 / EUR 9.99/mo)
- [ ] Tiers section shows Free / Build / Bundle
- [ ] Founding counter shows X of 15 (not 50)
- [ ] "Digital Footprint Scan" appears instead of "Time X-Ray" in user-facing text
- [ ] Organization JSON-LD present
- [ ] WebApplication JSON-LD (not SoftwareApplication)
- [ ] FAQ schema has 9 items matching the rendered FAQ
- [ ] HowTo schema present
- [ ] Sitemap includes all pages
- [ ] `trackEvent` utility exists and is wired to key interactions
- [ ] Site builds without errors (`pnpm build`)
- [ ] No TypeScript errors
