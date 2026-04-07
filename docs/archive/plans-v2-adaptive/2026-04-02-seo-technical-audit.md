# SEO Technical Audit -- meldar.ai

**Audited:** 2026-04-01
**Codebase:** `/agentgate/src/` (Next.js 16, App Router, React 19, RSC-first)
**Hosting:** Vercel
**Domain:** meldar.ai

---

## 1. Current State Audit

### Meta Tags -- Grade: B+

**What exists:**
- Root layout (`src/app/layout.tsx:23-52`) exports a well-structured `Metadata` object with title, description, OG tags, Twitter card, canonical URL, and robots directive.
- Every sub-page exports its own `metadata` or `generateMetadata` with page-specific titles, descriptions, and canonical URLs.
- Dynamic pages (`/start/[id]`, `/xray/[id]`) use `generateMetadata` with DB-driven descriptions and dynamic OG images.

**What's good:**
- Canonical tags on every page.
- OG image uses Next.js `ImageResponse` (edge-rendered, no static file needed).
- `metadataBase` set correctly, so relative URLs resolve properly.
- `robots: { index: false }` on thank-you and coming-soon pages.

**Issues:**
- **Homepage title** ("Meldar -- Tell us what annoys you. We build an app that fixes it.") is 68 characters. Acceptable, but the em dash takes space. Consider trimming.
- **OG title** ("Meldar -- Your personal AI app, built in 30 minutes") differs from the page title. Intentional but creates split-brain in search results vs. social shares.
- **No keyword strategy** in titles. None of the page titles target search queries people actually type (e.g., "screen time analyzer", "AI app builder for non-coders").
- **FAQ pricing answer in schema** is stale: says "$5-20/month + convenience fee" -- does not match current model (Free / EUR 79 / EUR 9.99/mo). This is schema.org structured data that Google reads directly. **Must fix.**
- **`/xray` page title** says "Time X-Ray" -- should be "Digital Footprint Scan" per v2 doc.
- **`/discover` page** still references "Time X-Ray" in tool card titles.
- No `viewport` meta tag explicitly set (Next.js sets a default, but worth confirming).

### Open Graph -- Grade: A-

**What exists:**
- Root-level OG tags with title, description, URL, siteName, type, locale, image.
- Dynamic OG image routes: `/og`, `/xray/[id]/og`, `/start/[id]/og`.
- Twitter card set to `summary_large_image`.

**Issues:**
- No `og:locale:alternate` for multi-market targeting (EU, UK, USA, Ukraine per v2 doc).
- Missing `og:see_also` for social profiles (none exist yet, so deferred).

### Sitemap -- Grade: C

**What exists (`src/app/sitemap.ts`):**
- 4 URLs: `/`, `/start`, `/privacy-policy`, `/terms`.
- Uses `changeFrequency` and `priority`.
- `lastModified: new Date()` on every entry (always returns "today" -- not useful for crawlers).

**Issues:**
- **Missing pages from sitemap:** `/discover`, `/discover/sleep`, `/discover/overthink`, `/xray`, `/quiz` (redirects to /start, so OK to omit).
- **No dynamic URLs:** `/xray/[id]` and `/start/[id]` shareable result pages are not in sitemap. These are the viral loop pages and should be crawled.
- **`lastModified` is meaningless** -- it's `new Date()` on every request. Should use actual last-modified dates or remove the field.
- **No blog, no programmatic pages** yet -- sitemap will need to grow substantially.

### Robots.txt -- Grade: A-

**What exists (`src/app/robots.ts`):**
- Allows all crawlers on `/`.
- Explicitly allows GPTBot, ClaudeBot, PerplexityBot (good for AI discovery).
- Points to sitemap.

**Issues:**
- No `Disallow` rules for internal routes that shouldn't be indexed (e.g., `/api/`, `/thank-you`, `/coming-soon`). Currently relying on `robots: { index: false }` in page metadata -- this works for Google but is defense-in-depth; robots.txt `Disallow` is the first line.
- No crawl-delay specified (not critical for a small site).

### Schema / Structured Data -- Grade: B

**What exists (`src/app/page.tsx:84-105`):**
- `SoftwareApplication` schema with name, description, applicationCategory, operatingSystem, offers, author.
- `FAQPage` schema with 7 Q&A pairs (`src/app/page.tsx:18-79`).
- Reusable `JsonLd` component (`src/shared/ui/JsonLd.tsx`) with XSS-safe serialization.
- `buildBreadcrumbSchema` utility exists in `src/shared/config/seo.ts` but is **not used anywhere**.

**Issues:**
- **No `Organization` schema.** Google uses this for Knowledge Graph. Missing: logo, foundingDate, contactPoint, sameAs (social profiles).
- **`SoftwareApplication` is questionable.** Meldar is closer to a service/product than a downloadable app. The `operatingSystem: 'macOS, Windows, Linux, iOS, Android'` claim is misleading -- it's a web app. Consider `WebApplication` or `Product` instead.
- **FAQ schema pricing answer is stale** (see Meta Tags section above). Google can feature this in rich snippets -- showing wrong pricing is actively harmful.
- **FAQ schema has 7 items but the page renders 9 items.** The schema and the component are out of sync.
- **No `HowTo` schema** for the onboarding flow (3-step process: upload screenshot, see analysis, get recommendation).
- **No breadcrumb JSON-LD** despite the utility existing.
- **No `WebSite` schema** with `potentialAction` for sitelinks searchbox.

---

## 2. SSR Verification

### Server-Side Rendering Status: GOOD

**All page components are server components by default (RSC-first):**
- `page.tsx` (homepage) -- server component. JSON-LD rendered server-side.
- `discover/page.tsx` -- server component.
- `discover/sleep/page.tsx` -- server component (wraps `SleepClient`).
- `discover/overthink/page.tsx` -- server component (wraps `OverthinkClient`).
- `start/page.tsx` -- server component (wraps `StartClient`).
- `start/[id]/page.tsx` -- async server component with DB query.
- `xray/[id]/page.tsx` -- async server component with DB query.
- `terms/page.tsx` -- server component.
- `privacy-policy/page.tsx` -- server component.

**Client components are leaf nodes only:**
- `FadeInOnScroll` -- wraps landing sections for animation. Children are server-rendered; the wrapper just adds opacity/transform transitions. **No SEO impact** because content is in the DOM on first paint.
- `FaqSection` -- `'use client'` for accordion toggle. Content is rendered in initial HTML. **No SEO impact.**
- `Footer` -- `'use client'` for cookie consent reopen button. **No SEO impact.**
- Interactive tools (`SleepClient`, `OverthinkClient`, `StartClient`, `XRayPageClient`) -- these are client components for quiz/upload flows. The page shells and metadata are server-rendered.

**Landing page sections (`src/widgets/landing/`):** Zero `"use client"` directives. All 11 section components are server components. This is ideal.

**Potential concern:** `FadeInOnScroll` sets `opacity: 0` initially and transitions to `opacity: 1` on intersection. If a crawler doesn't execute JS, content is technically invisible (opacity 0). In practice, Googlebot executes JS and IntersectionObserver works. But for extra safety, consider using CSS `@media (prefers-reduced-motion)` or `<noscript>` fallback to ensure visible content without JS.

---

## 3. Schema Markup Plan

### 3.1 Organization Schema (add to `layout.tsx` or `page.tsx`)

```tsx
<JsonLd
  data={{
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Meldar',
    legalName: 'ClickTheRoadFi Oy',
    url: 'https://meldar.ai',
    logo: 'https://meldar.ai/favicon.svg',
    description: 'Tell Meldar what annoys you. It builds a personal app that fixes it. 30 minutes. No coding. No confusion.',
    foundingDate: '2026',
    founder: {
      '@type': 'Person',
      name: 'Georgy Skryuchenkov',
      jobTitle: 'Founder',
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Punavuorenkatu 1 B 13',
      addressLocality: 'Helsinki',
      postalCode: '00120',
      addressCountry: 'FI',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'gosha.skryuchenkov@gmail.com',
    },
    // Add sameAs when social profiles exist:
    // sameAs: ['https://twitter.com/meldar_ai', 'https://linkedin.com/company/meldar'],
  }}
/>
```

### 3.2 Product Schema (replace current SoftwareApplication)

```tsx
<JsonLd
  data={{
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Meldar',
    url: 'https://meldar.ai',
    description: 'Upload your screen time data. Meldar finds what wastes your time and builds a personal app to fix it.',
    applicationCategory: 'ProductivityApplication',
    operatingSystem: 'Web',
    browserRequirements: 'Requires JavaScript. Works in Chrome, Firefox, Safari, Edge.',
    offers: [
      {
        '@type': 'Offer',
        name: 'Digital Footprint Scan',
        price: '0',
        priceCurrency: 'EUR',
        description: 'Free screen time analysis. Upload a screenshot, get your real numbers.',
      },
      {
        '@type': 'Offer',
        name: 'Build',
        price: '79',
        priceCurrency: 'EUR',
        description: 'Founder builds you a working app in 72 hours. One-time payment.',
      },
      {
        '@type': 'Offer',
        name: 'Bundle',
        price: '9.99',
        priceCurrency: 'EUR',
        description: 'Monthly access to skills library and bundled third-party APIs.',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: '9.99',
          priceCurrency: 'EUR',
          billingDuration: 'P1M',
        },
      },
    ],
    author: {
      '@type': 'Organization',
      name: 'ClickTheRoadFi Oy',
      url: 'https://meldar.ai',
    },
  }}
/>
```

### 3.3 FAQPage Schema (fix and sync with component)

The FAQ schema in `page.tsx` must be updated to:
1. Match the current pricing model.
2. Sync with all 9 questions rendered in `FaqSection.tsx`.

```tsx
const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Do I need to know how to code to use Meldar?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. You tell Meldar what bothers you, and it handles the rest. No coding required.',
      },
    },
    {
      '@type': 'Question',
      name: 'What does Meldar cost?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The Digital Footprint Scan is free. The Build tier is EUR 79 one-time — a founder builds you a working app in 72 hours. The Bundle is EUR 9.99/month for ongoing access to the skills library and bundled APIs.',
      },
    },
    {
      '@type': 'Question',
      name: 'What if it does not work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The free tier costs nothing. If something breaks, we fix it. If you are unhappy, delete your account — no strings attached.',
      },
    },
    {
      '@type': 'Question',
      name: 'I tried AI tools before and gave up. Why is this different?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Those tools dropped you into a blank screen. Meldar connects to how you already work, finds the time-wasters you did not notice, and builds the fix.',
      },
    },
    {
      '@type': 'Question',
      name: 'What if I want to stop using Meldar?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Everything you built is yours. Your apps run on your computer. If you leave, they keep working.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I talk to a real person?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. One person runs Meldar and reads every message. A human answers.',
      },
    },
    {
      '@type': 'Question',
      name: 'What data do you actually need?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'A screenshot of your Screen Time. That is it for the free tier. For deeper analysis, you can optionally upload your Google Takeout or ChatGPT export.',
      },
    },
    {
      '@type': 'Question',
      name: 'Who built this?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'One person in Helsinki, using the same AI tools Meldar teaches you to use.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is this another AI chatbot?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. Chatbots give advice. Meldar builds actual apps that run on your computer and do the work for you.',
      },
    },
  ],
}
```

### 3.4 HowTo Schema (new -- add to homepage)

```tsx
<JsonLd
  data={{
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to find and fix your biggest time wasters with Meldar',
    description: 'Upload your screen time data, get an AI analysis, and receive a custom-built app that solves your problem.',
    totalTime: 'PT2M',
    step: [
      {
        '@type': 'HowToStep',
        position: 1,
        name: 'Upload your Screen Time screenshot',
        text: 'Take a screenshot of your phone\'s Screen Time settings and upload it to Meldar. The image is processed in your browser and deleted immediately.',
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: 'See your real numbers',
        text: 'Meldar analyzes your screen time data using AI and shows you exactly where your time goes, which apps dominate, and what patterns emerge.',
      },
      {
        '@type': 'HowToStep',
        position: 3,
        name: 'Get a personal app built for you',
        text: 'Based on your analysis, Meldar recommends what to build. Order a Build (EUR 79) and a founder builds you a working app in 72 hours.',
      },
    ],
  }}
/>
```

---

## 4. Meta Tag Templates

### Homepage

```
Title: Meldar -- See Where Your Time Goes, Then Fix It with AI
Description: Upload your Screen Time screenshot. Meldar shows your real numbers and builds a personal app to fix your biggest time waster. Free to start. No coding.
```

**Formula:** `[Brand] -- [Value proposition verb phrase]`

### Pain Point / Discover Pages

**Template:**
```
Title: [Problem Statement] | Free [Tool Name] | Meldar
Description: [Specific question the user types]. [What the tool does]. [Time commitment]. Free. No signup.
```

**Examples:**

`/discover`:
```
Title: What's Eating Your Week? | Free Time Analysis Tools | Meldar
Description: Discover where your time actually goes with free analysis tools. Screen time scan, overthinking report, and sleep debt score. Under 2 minutes each.
```

`/discover/sleep`:
```
Title: How Much Sleep Does Your Phone Steal? | Free Sleep Score | Meldar
Description: 5 questions about your bedtime habits. Get your Sleep Debt Score in 1 minute. See how much sleep your phone costs you every night. Free, no signup.
```

`/discover/overthink`:
```
Title: How Much Time Do You Lose to Indecision? | Free Report | Meldar
Description: 8 questions about your daily decisions. Get your Overthink Report in 2 minutes. See exactly how much time you waste second-guessing yourself.
```

`/xray`:
```
Title: Digital Footprint Scan -- See Your Real Screen Time | Meldar
Description: Upload a Screen Time screenshot. AI analyzes your real usage in 30 seconds. Free, private, instant. Your screenshot is deleted immediately.
```

### Blog Posts (future)

**Template:**
```
Title: [How to / Why / N Ways to] [Specific Problem] [with/without AI] | Meldar
Description: [1-sentence summary of the post]. [Key takeaway or number]. [CTA hint].
```

**Example:**
```
Title: How I Automated My Morning Routine and Saved 47 Minutes a Day | Meldar
Description: A step-by-step breakdown of the 3 automations that eliminated my worst morning time-wasters. Built with Meldar in one afternoon.
```

### Comparison Pages (future `/vs/[competitor]`)

**Template:**
```
Title: Meldar vs [Competitor]: [Key differentiator in plain language]
Description: Comparing Meldar and [Competitor] for [use case]. [1-sentence honest differentiator]. See which is right for you.
```

**Example:**
```
Title: Meldar vs Zapier: Personal Automation Without the Learning Curve
Description: Comparing Meldar and Zapier for personal productivity automation. Meldar finds what to automate; Zapier expects you to know already.
```

---

## 5. Sitemap Strategy

### Current Pages (should be in sitemap now)

| URL | Priority | Change Freq | Notes |
|-----|----------|-------------|-------|
| `/` | 1.0 | weekly | Homepage |
| `/start` | 0.9 | monthly | Main funnel entry |
| `/discover` | 0.8 | monthly | Tool hub |
| `/discover/sleep` | 0.7 | monthly | Sleep debt quiz |
| `/discover/overthink` | 0.7 | monthly | Overthink quiz |
| `/xray` | 0.8 | monthly | Digital Footprint Scan entry |
| `/privacy-policy` | 0.3 | yearly | Legal |
| `/terms` | 0.3 | yearly | Legal |

### Dynamic Pages (add to sitemap via DB query)

| URL Pattern | Priority | Notes |
|-------------|----------|-------|
| `/xray/[id]` | 0.5 | Shareable X-Ray results. Query DB for all public results. |
| `/start/[id]` | 0.5 | Shareable analysis results. Query DB for completed analyses. |

**Implementation:** Change `sitemap.ts` to an async function that queries the database for shareable result IDs.

### Future Programmatic Pages (plan the routes now)

| URL Pattern | Volume | Priority | Notes |
|-------------|--------|----------|-------|
| `/blog/[slug]` | 50-100 | 0.7 | SEO content, tutorials, automation stories |
| `/problems/[slug]` | 12+ | 0.8 | One page per pain point from the quiz (e.g., `/problems/too-much-screen-time`) |
| `/vs/[competitor]` | 6-10 | 0.7 | Comparison pages (vs Zapier, vs Cursor, vs Lovable, etc.) |
| `/tools/[slug]` | 3-5 | 0.8 | Landing pages for each free tool (X-Ray, Sleep Score, Overthink Report) |
| `/skills/[slug]` | 10-50 | 0.6 | Skills library pages (once Bundle tier launches) |

### Sitemap Implementation (revised)

```ts
// src/app/sitemap.ts
import type { MetadataRoute } from 'next'
import { SITE_CONFIG } from '@/shared/config'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_CONFIG.url, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_CONFIG.url}/start`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_CONFIG.url}/discover`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_CONFIG.url}/discover/sleep`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_CONFIG.url}/discover/overthink`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_CONFIG.url}/xray`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_CONFIG.url}/privacy-policy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_CONFIG.url}/terms`, changeFrequency: 'yearly', priority: 0.3 },
  ]

  // TODO: Query DB for shareable xray and start results
  // const db = getDb()
  // const xrays = await db.select({ id: xrayResults.id, updatedAt: xrayResults.updatedAt }).from(xrayResults)
  // const dynamicPages = xrays.map(x => ({
  //   url: `${SITE_CONFIG.url}/xray/${x.id}`,
  //   lastModified: x.updatedAt,
  //   priority: 0.5,
  // }))

  return [...staticPages]
}
```

---

## 6. Core Web Vitals Concerns

### LCP (Largest Contentful Paint) -- Risk: LOW-MEDIUM

- **Hero section** is text-only (no images, no hero image). LCP element is likely the `<h1>` text. Text LCP is fast.
- **Fonts:** Bricolage Grotesque and Inter loaded via `next/font/google` with `display: 'swap'`. This prevents font-blocking but may cause FOIT/FOUT flash. Low risk.
- **No images on landing page.** Zero `next/image` usage in landing widgets. The entire page is text + CSS. This is actually excellent for LCP.
- **No above-the-fold images at all.** LCP should be sub-1s on most connections.

### CLS (Cumulative Layout Shift) -- Risk: LOW

- **Fixed header** at 72px height; `paddingBlockStart: 72px` on main. No shift from header appearing.
- **Font swap** could cause minor CLS if system font metrics differ significantly from web font metrics. `next/font` with `variable` mitigates this.
- **FadeInOnScroll** starts at `opacity: 0` and `translateY(20px)`. The transform doesn't cause layout shift (it's composited). No CLS impact.
- **FAQ accordion** uses conditional rendering (`{openIndex === i && ...}`). This shifts content below when opened, but it's user-initiated (not counted by CWV).

### INP (Interaction to Next Paint) -- Risk: LOW

- **Landing page is mostly static.** Only interactive elements are the FAQ accordion and CTA links.
- **FAQ accordion** uses `useState` toggle. Simple, fast.
- **No heavy client-side JS** on the landing page. The quiz/upload flows are on separate routes.
- **Panda CSS** is build-time CSS (not runtime), so no style computation overhead.

### Potential Issues

1. **`FadeInOnScroll` wraps 9 sections.** Each creates its own `IntersectionObserver`. Consider using a single observer for all sections, or switching to CSS-only `@starting-style` / `animation-timeline: view()` which requires zero JS.
2. **Cookie consent banner** and **Google Analytics** are loaded after consent. No CWV impact until consent is given.
3. **No `loading.tsx` files anywhere.** If pages with DB queries (`/start/[id]`, `/xray/[id]`) are slow, there's no streaming skeleton. Not a CWV issue for landing page, but affects these deeper pages.
4. **Tesseract.js (OCR)** is loaded on the `/xray` and `/start` routes. It's a large WASM bundle (~4MB). Verify it's code-split and not in the main bundle. The `optimizePackageImports: ['lucide-react']` in `next.config.ts` only covers lucide.

---

## 7. Missing SEO Infrastructure

### 7.1 Blog Route -- NOT BUILT

No `/blog` route exists. This is the highest-impact missing piece for organic traffic. Needed for:
- Targeting long-tail keywords ("how to reduce screen time", "what is my phone doing to my sleep")
- Internal linking to pain point pages and tools
- Building topical authority
- Supporting Reddit/LinkedIn content strategy (link back to blog posts)

**Recommended structure:**
```
/src/app/blog/page.tsx          -- Blog index
/src/app/blog/[slug]/page.tsx   -- Individual posts
```

Content can be MDX files or CMS-driven. For MVP, MDX in the repo is fine.

### 7.2 Programmatic Pain Point Pages -- NOT BUILT

The quiz has 12 pain points. Each should have a dedicated SEO landing page at `/problems/[slug]`. These pages should:
- Target the specific search query (e.g., "I spend too much time on my phone")
- Explain the problem with data/statistics
- Show how Meldar's tool addresses it
- CTA to the relevant free tool
- Include FAQ schema specific to that pain point

### 7.3 Comparison Pages -- NOT BUILT

Comparison pages (`/vs/[competitor]`) for: Zapier, Cursor, Lovable, Bolt, ChatGPT, Rork.
High-intent keywords. Each page should have:
- Honest feature comparison table
- Schema markup (`ComparisonTable` or structured `ItemList`)
- Specific use-case differentiation

### 7.4 Canonical Tags -- PARTIALLY IMPLEMENTED

Canonical tags exist on most pages but:
- `/quiz` redirects to `/start` (good, server-side redirect)
- No `rel="canonical"` on `/coming-soon` (has `noindex` which is sufficient)
- Dynamic pages (`/xray/[id]`, `/start/[id]`) have proper canonicals

### 7.5 Hreflang for Multi-Market -- NOT IMPLEMENTED

v2 doc targets EU, UK, USA, Ukraine. Currently:
- Site is English-only (`<html lang="en">`)
- No hreflang tags
- No locale-specific content

**For now:** Not needed. The site is English-only and the target markets all speak English (Ukraine included for this product). Hreflang becomes relevant only if you add Ukrainian-language pages or locale-specific pricing pages.

### 7.6 Breadcrumb Navigation -- UTILITY EXISTS, NOT USED

`buildBreadcrumbSchema` is defined in `src/shared/config/seo.ts:20-39` but never called. Add breadcrumb JSON-LD to all non-homepage pages.

### 7.7 404 Page -- PARTIALLY IMPLEMENTED

Custom `not-found.tsx` exists for `/xray/[id]` and `/start/[id]` (dynamic routes). No global `not-found.tsx` in `src/app/`. The default Next.js 404 is functional but not branded.

### 7.8 Internal Linking -- WEAK

- Header has only logo + "Start here" CTA. No navigation links for a 10+ section page.
- Footer has only Privacy, Terms, Cookie Settings, Contact.
- No internal links between discover tools, xray, start pages.
- No breadcrumb navigation (visual or schema).

### 7.9 Structured Data Testing

No evidence of Google Search Console integration or structured data testing. Should validate all JSON-LD with Google's Rich Results Test before deploy.

---

## 8. Implementation Checklist

### Priority 1: Critical Fixes (do first)

- [ ] **Fix FAQ schema pricing** -- `src/app/page.tsx:35-37`. Replace "$5-20/month + convenience fee" with current EUR 79 / EUR 9.99/mo model. This is live in Google's structured data and showing wrong info.
- [ ] **Sync FAQ schema with FAQ component** -- Schema has 7 items, component renders 9. Add the 2 missing questions to schema or remove from component.
- [ ] **Fix "Time X-Ray" references** -- `src/app/xray/page.tsx:7` title, `src/app/discover/page.tsx:16` tool title. Rename to "Digital Footprint Scan" per v2 doc.
- [ ] **Update FaqSection pricing answer** -- `src/widgets/landing/FaqSection.tsx:14`. Currently says "$5-20/month + 5% fee".

### Priority 2: Schema Additions (high SEO impact, low effort)

- [ ] **Add Organization JSON-LD** -- In `src/app/layout.tsx` or `src/app/page.tsx`. See Section 3.1 above.
- [ ] **Replace SoftwareApplication with WebApplication** -- `src/app/page.tsx:86-104`. See Section 3.2 above. Fix `operatingSystem` to `'Web'`.
- [ ] **Add HowTo JSON-LD** -- `src/app/page.tsx`. See Section 3.4 above.
- [ ] **Add breadcrumb JSON-LD** -- Use existing `buildBreadcrumbSchema()` on `/discover`, `/discover/sleep`, `/discover/overthink`, `/xray`, `/start`, `/terms`, `/privacy-policy`.

### Priority 3: Sitemap & Robots Improvements

- [ ] **Expand sitemap** -- Add `/discover`, `/discover/sleep`, `/discover/overthink`, `/xray` to `src/app/sitemap.ts`.
- [ ] **Remove fake `lastModified`** -- Either use real dates or omit the field.
- [ ] **Add Disallow rules to robots.txt** -- Disallow `/api/`, `/thank-you`, `/coming-soon` in `src/app/robots.ts`.
- [ ] **Add dynamic pages to sitemap** -- Query DB for `/xray/[id]` and `/start/[id]` URLs.

### Priority 4: Meta Tag Optimization

- [ ] **Rewrite homepage title** -- Target a search query. See Section 4 templates.
- [ ] **Rewrite sub-page titles** -- Apply keyword-rich templates from Section 4.
- [ ] **Add meta descriptions to all pages** -- `/quiz` page has none (it redirects, so low priority).
- [ ] **Ensure OG images exist for all pages** -- `/discover`, `/discover/sleep`, `/discover/overthink` have no OG images. Either add custom OG routes or set a default fallback.

### Priority 5: Infrastructure (build for growth)

- [ ] **Create `/blog` route** -- MDX or CMS-driven. Needs `generateStaticParams` for static generation.
- [ ] **Create `/problems/[slug]` programmatic pages** -- One per pain point (12 minimum).
- [ ] **Create `/vs/[competitor]` comparison pages** -- Start with top 3: Zapier, Cursor, ChatGPT.
- [ ] **Add global `not-found.tsx`** -- Branded 404 page at `src/app/not-found.tsx`.
- [ ] **Add navigation links to Header** -- Anchor links for landing page sections + links to /discover, /blog (when built).
- [ ] **Set up Google Search Console** -- Submit sitemap, monitor indexing, validate structured data.
- [ ] **Add `WebSite` schema with SearchAction** -- For sitelinks searchbox in Google results (useful once blog/skills library adds searchable content).
- [ ] **Add `loading.tsx` skeletons** -- For `/start/[id]` and `/xray/[id]` to improve perceived performance.

### Priority 6: Future / Deferred

- [ ] **Hreflang tags** -- Only if Ukrainian-language content is added.
- [ ] **Sitemap index** -- Only needed when total URLs exceed ~1,000 (blog + programmatic pages + dynamic results).
- [ ] **Image sitemap** -- Only relevant once blog has images or product screenshots.
- [ ] **Video schema** -- Only if video content is added (tutorials, walkthroughs).
- [ ] **Review schema** -- Only once real customer reviews exist. Do not fabricate.

---

## Summary

The codebase has a **solid technical foundation** for SEO: server-rendered pages, proper meta tags, canonical URLs, OG images, and some structured data. The main gaps are:

1. **Stale/incorrect structured data** (FAQ pricing, SoftwareApplication type) -- fix immediately.
2. **Incomplete sitemap** -- missing 4 existing pages.
3. **No content infrastructure** (blog, pain point pages, comparison pages) -- this is the biggest bottleneck for organic growth.
4. **Missing Organization schema** -- needed for Knowledge Graph presence.
5. **Weak internal linking** -- header has no nav, footer is minimal.

The site is technically capable of ranking well once content and schema issues are addressed. The RSC-first architecture is a significant advantage -- zero client-side rendering bottlenecks for crawlers.
