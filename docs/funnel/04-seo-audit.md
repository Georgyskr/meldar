# SEO Audit -- Meldar Landing Page

**Date:** 2026-03-30
**Scope:** `/src/app/page.tsx`, `/src/app/layout.tsx`, all `/src/components/landing/*` sections
**Goal:** Maximize organic discoverability for "personal AI app builder" and adjacent queries

---

## 1. Meta Tags

### Current State

**Title (layout.tsx:10):**
```
Meldar -- Your AI. Your App. Nobody Else's.
```
- Character count: ~44 characters
- Issue: **No target keywords.** "Meldar" is an unknown brand. Google has no reason to rank this for anything. The title reads like a tagline, not a search-optimized title.

**Description (seo.ts:6):**
```
AgentGate discovers what you should automate and guides you from zero to a working AI agent in 30 minutes. Free to start. GDPR-native.
```
- Character count: ~133 characters (within 155 limit)
- Issues:
  - **Brand mismatch:** Says "AgentGate" but the site brand is "Meldar"
  - **No primary keyword** ("personal AI app builder", "AI automation tool", "build AI app without coding")
  - "GDPR-native" is jargon; searchers don't use this term

### Recommended Fix

**layout.tsx -- metadata object:**
```tsx
export const metadata: Metadata = {
  title: 'Meldar -- Build Your Own AI App in 30 Minutes | No Coding Required',
  description:
    'Tell Meldar what frustrates you and it builds a personal AI app that fixes it. No coding, no setup headaches. Free to start. Privacy-first, built in the EU.',
  metadataBase: new URL(SITE_CONFIG.url),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Meldar -- Build Your Own AI App in 30 Minutes',
    description:
      'Tell Meldar what frustrates you and it builds a personal AI app that fixes it. No coding required. Free to start.',
    url: SITE_CONFIG.url,
    siteName: 'Meldar',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Meldar -- Build your own AI app in 30 minutes',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Meldar -- Build Your Own AI App in 30 Minutes',
    description:
      'Tell Meldar what frustrates you and it builds a personal AI app that fixes it. No coding required.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
  robots: { index: true, follow: true },
}
```

**seo.ts -- update description:**
```ts
export const SITE_CONFIG = {
  name: 'Meldar',
  url: 'https://meldar.com',
  tagline: 'Your AI. Your app. Nobody else\'s.',
  description:
    'Tell Meldar what frustrates you and it builds a personal AI app that fixes it. No coding, no setup headaches. Free to start. Privacy-first, built in the EU.',
} as const
```

**Priority: CRITICAL.** The brand name mismatch (AgentGate vs Meldar) will confuse Google and users arriving from search.

---

## 2. Heading Hierarchy (H1/H2/H3)

### Current State

| Section | Tag | Text |
|---|---|---|
| HeroSection | `h1` | "Stop trying to figure out AI. Let it figure out you." |
| ProblemSection | `h2` | "Sound familiar?" |
| ProblemSection (items) | `h4` | "You hit a wall every time", etc. |
| SkillCardsSection | `h2` | "Things people build in their first week" |
| SkillCardsSection (items) | `h5` | "Meal planner", etc. |
| HowItWorksSection | `h3` | "Tell us what bugs you", etc. |
| TiersSection | `h4` | Price text (Free, Pay as you go, From $200) |
| ComparisonSection | `h2` | "How Meldar is different" |
| TrustSection | `h2` | "Your stuff stays your stuff" |
| FaqSection | `h2` | "Questions people ask" |
| FaqSection (items) | `h5` | FAQ questions |
| FinalCtaSection | `h2` | "Ready to build your own AI app?" |

### Issues

1. **H1 has zero keywords.** "Stop trying to figure out AI. Let it figure out you." is conversational but unsearchable. Google weighs H1 heavily for topical relevance.
2. **Broken hierarchy.** H4 appears before any H3 (ProblemSection). H5 appears without a parent H4 (SkillCardsSection). H3 in HowItWorksSection has no parent H2.
3. **HowItWorksSection has no H2.** The section jumps straight to H3 items.
4. **Tier prices in H4 tags.** "Free" and "Pay as you go" carry no semantic value as headings.

### Recommended Fix

```
h1: "Build Your Own AI App in 30 Minutes -- No Coding Required" (HeroSection)
  h2: "Sound familiar?" (ProblemSection)
    h3: "You hit a wall every time" (was h4)
    h3: "Even if you got in, then what?" (was h4)
    h3: "The tutorials never work twice" (was h4)
  h2: "AI Apps People Build in Their First Week" (SkillCardsSection -- add keyword)
    h3: "Meal planner" (was h5)
  h2: "How It Works" (NEW -- add parent h2 to HowItWorksSection)
    h3: "Tell us what bugs you" (keep h3)
  h2: "Simple Pricing for Your AI App" (TiersSection -- add h2, change h4 to h3)
    h3: "Explorer -- Free" (was h4)
  h2: "How Meldar Is Different" (ComparisonSection)
  h2: "Privacy-First AI -- Your Data Stays Yours" (TrustSection -- add keyword)
  h2: "Frequently Asked Questions" (FaqSection -- match FAQ schema expectations)
    h3: FAQ questions (was h5)
  h2: "Ready to Build Your Own AI App?" (FinalCtaSection)
```

**Key changes:**
- H1 includes primary keyword "Build Your Own AI App"
- Strict H1 > H2 > H3 nesting -- no skipped levels
- Every section has an H2
- Keywords seeded into H2s where natural

**Priority: HIGH.** Heading hierarchy is a core ranking signal and currently broken.

---

## 3. JSON-LD Structured Data

### Current State (page.tsx:19-38)

Single `SoftwareApplication` schema with:
- `applicationCategory: "LifestyleApplication"` -- questionable category
- `operatingSystem: "macOS, Windows, Linux"` -- Meldar is a web service, not desktop software
- `author.name: BUSINESS_INFO.legalName` -- resolves to "AgentGate Oy" (brand mismatch again)
- No `aggregateRating`, no `screenshot`, no `review`

### Issues

1. **Wrong schema type?** `SoftwareApplication` implies a downloadable app. Meldar is a web-based SaaS. Consider `WebApplication` instead.
2. **No FAQPage schema** for the FAQ section. Google shows FAQ rich results which massively increase SERP real estate.
3. **No Organization schema.** Google Knowledge Panel won't populate.
4. **Brand mismatch.** JSON-LD says "AgentGate Oy".

### Recommended Fix

**page.tsx -- Add FAQPage schema alongside SoftwareApplication:**
```tsx
<JsonLd
  data={{
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Meldar',
    url: 'https://meldar.com',
    description: 'Tell Meldar what frustrates you and it builds a personal AI app that fixes it. No coding required.',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'AggregateOffer',
      lowPrice: '0',
      highPrice: '200',
      priceCurrency: 'USD',
      offerCount: '3',
    },
    author: {
      '@type': 'Organization',
      name: 'Meldar Oy',
      url: 'https://meldar.com',
    },
  }}
/>

<JsonLd
  data={{
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Do I need to know how to code?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. Meldar handles the technical stuff. You just tell it what you want done, and it builds it.',
        },
      },
      {
        '@type': 'Question',
        name: 'What does it cost?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'The discovery part is free. When you start using the AI to build things, you pay for what you use. Most people spend $5-20 a month.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is my data safe?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'European privacy law applies to everything we do. We only see which apps you use and how often. You can delete everything at any time.',
        },
      },
      {
        '@type': 'Question',
        name: 'What if I want to stop?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Everything you build is yours. It lives on your computer. If you leave, your apps keep working.',
        },
      },
      {
        '@type': 'Question',
        name: 'I tried AI tools before and failed. Why is this different?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Meldar starts from zero. It figures out what to automate in YOUR day, sets everything up for you, and stays with you until it works.',
        },
      },
      {
        '@type': 'Question',
        name: 'What can it build for me?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Anything you repeat on your computer. Sorting files, writing emails, cleaning spreadsheets, summarizing meetings, generating reports.',
        },
      },
    ],
  }}
/>
```

**Priority: HIGH.** FAQ rich results can double click-through rate on SERPs.

---

## 4. Image Alt Text

### Current State

The page uses **zero `<img>` tags.** All visual elements are Material Symbols icon font glyphs rendered via `<span className="material-symbols-outlined">`. Icons used:

| Section | Icons |
|---|---|
| ProblemSection | `layers_clear`, `visibility_off`, `build_circle`, `cloud_off` |
| SkillCardsSection | `restaurant`, `school`, `sell`, `work`, `receipt_long`, `share` |
| TiersSection | `check` (feature list) |
| TrustSection | `shield_moon` |
| FaqSection | `expand_more` |

### Issues

1. **Icon fonts are invisible to search engines.** Google cannot read Material Symbols ligatures. They contribute nothing to SEO.
2. **No decorative `aria-hidden="true"`.** Screen readers will announce the ligature text ("layers_clear", "visibility_off") which is meaningless to users.
3. **No OG image exists.** Social shares will have no preview image.

### Recommended Fixes

**Add `aria-hidden` to all icon spans and `role="img"` with `aria-label` where the icon conveys meaning:**
```tsx
// Decorative icon (next to text that already describes it):
<styled.span className="material-symbols-outlined" aria-hidden="true">
  restaurant
</styled.span>

// Meaningful icon (conveys info without adjacent text):
<styled.span className="material-symbols-outlined" role="img" aria-label="Privacy shield">
  shield_moon
</styled.span>
```

**Create `/public/og-image.png`** (1200x630px) with:
- Brand name "Meldar"
- Tagline "Build your own AI app in 30 minutes"
- Gradient branding consistent with the site

**Priority: MEDIUM.** No images to optimize per se, but the accessibility + OG gaps hurt social sharing and assistive technology.

---

## 5. Canonical URL

### Current State

**No canonical URL is set.** `layout.tsx` defines `metadataBase` but does not set `alternates.canonical`.

### Issue

Without a canonical, duplicate content issues can arise (e.g., `https://meldar.com` vs `https://meldar.com/` vs `https://www.meldar.com`). Google may split ranking signals across these variants.

### Recommended Fix

```tsx
// layout.tsx metadata
alternates: {
  canonical: '/',
},
```

This uses `metadataBase` to resolve to the full canonical URL. For sub-pages, set canonical per-page via `generateMetadata()`.

**Priority: HIGH.** A missing canonical is a foundational SEO gap.

---

## 6. Open Graph & Twitter Card

### Current State

**Open Graph (layout.tsx:13-20):**
- `og:title` -- present
- `og:description` -- present
- `og:url` -- present
- `og:site_name` -- present
- `og:type` -- present (website)
- `og:locale` -- present (en_US)
- `og:image` -- **MISSING**

**Twitter Card:**
- **Entirely missing.** No `twitter:card`, `twitter:title`, `twitter:description`, or `twitter:image`.

### Issues

1. **No OG image.** Social shares on Facebook, LinkedIn, Discord, Slack will render as plain text links with no preview. This dramatically reduces click-through from social.
2. **No Twitter card.** Same problem on X/Twitter.
3. OG description still references "AgentGate" if it pulls from `SITE_CONFIG.description`.

### Recommended Fix

See the full metadata object in Section 1 above. The critical additions:
```tsx
openGraph: {
  // ... existing fields ...
  images: [{
    url: '/og-image.png',
    width: 1200,
    height: 630,
    alt: 'Meldar -- Build your own AI app in 30 minutes',
  }],
},
twitter: {
  card: 'summary_large_image',
  title: 'Meldar -- Build Your Own AI App in 30 Minutes',
  description: 'Tell Meldar what frustrates you and it builds a personal AI app that fixes it. No coding required.',
  images: ['/og-image.png'],
},
```

**Priority: CRITICAL.** Every social share is a missed click without a preview image.

---

## 7. Target Keywords & Copy Optimization

### Recommended Keyword Clusters

| Priority | Keyword Cluster | Monthly Volume (est.) | Current Coverage |
|---|---|---|---|
| Primary | "build AI app without coding", "no-code AI app builder" | 1K-5K | None |
| Primary | "personal AI assistant builder" | 500-2K | None |
| Secondary | "AI automation for beginners" | 1K-3K | Weak (implied) |
| Secondary | "AI app builder no experience" | 500-1K | None |
| Long-tail | "build AI app in 30 minutes" | <500 | Partial (body copy) |
| Long-tail | "AI that builds apps for you" | <500 | Partial (body copy) |
| Long-tail | "automate tasks with AI no coding" | <500 | None |

### Current Keyword Problems

1. **H1 has zero searchable terms.** "Stop trying to figure out AI. Let it figure out you." -- clever but invisible to search.
2. **The word "app" barely appears on the page.** It shows up in skill card descriptions and the final CTA, but not in any heading or prominent position.
3. **"no coding" appears once** in the hero subtext. Should appear in H1 or at least an H2.
4. **"AI agent" / "AI automation" / "AI app builder"** do not appear in any heading.
5. **Brand confusion:** Config says "AgentGate", page says "Meldar". Google will be confused about what the site is even about.

### Recommended Copy Changes

**HeroSection h1:**
```
Build Your Own AI App in 30 Minutes -- No Coding Required
```

**HeroSection subtext:**
```
Tell Meldar what frustrates you. It builds a personal AI app that fixes it.
No technical skills needed. No setup headaches.
```

**SkillCardsSection h2:**
```
AI Apps People Build in Their First Week
```

**TrustSection h2:**
```
Privacy-First AI -- Your Data Stays Yours
```

**FaqSection h2:**
```
Frequently Asked Questions
```
(Matches standard FAQ schema expectations and what people search for)

**Priority: CRITICAL.** Without target keywords in headings and prominent copy, the page will not rank for anything.

---

## 8. Internal Linking

### Current State

Internal links on the page:
- Header logo: `/` (home -- self-referential)
- "Our privacy promise": `/privacy-policy`
- Footer: `/privacy-policy`, `/terms`, `mailto:hello@meldar.com`
- All CTAs: `#early-access` (anchor, not a real link)

### Issues

1. **No internal links to future content.** When blog posts, use cases, or tutorial pages are added, the landing page should link to them.
2. **No anchor navigation in header.** "How it works", "Pricing", "FAQ" nav links would help both UX and SEO (Google considers internal linking structure).
3. **Footer has no links to product pages** (when they exist).

### Recommended Fixes

**Immediate -- Add nav links to Header:**
```tsx
<Flex alignItems="center" gap={6} display={{ base: 'none', md: 'flex' }}>
  <styled.a href="#how-it-works" textStyle="body.sm" color="onSurface/60"
    textDecoration="none" _hover={{ color: 'primary' }}>
    How it works
  </styled.a>
  <styled.a href="#pricing" textStyle="body.sm" color="onSurface/60"
    textDecoration="none" _hover={{ color: 'primary' }}>
    Pricing
  </styled.a>
  <styled.a href="#faq" textStyle="body.sm" color="onSurface/60"
    textDecoration="none" _hover={{ color: 'primary' }}>
    FAQ
  </styled.a>
</Flex>
```

**Requires section IDs:**
- TiersSection: add `id="pricing"`
- FaqSection: add `id="faq"`
- HowItWorksSection: already has `id="how-it-works"`

**Future -- When content pages exist:**
- Link "Meal planner" skill card to a `/use-cases/meal-planner` page
- Link FAQ answers to detailed help articles
- Add a `/blog` link in the header/footer

**Priority: MEDIUM.** Low effort, meaningful UX and crawlability improvement.

---

## 9. Page Speed Considerations

### External Font Load (layout.tsx:32-36)

```html
<link
  href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=Inter:wght@300;400;500&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
  rel="stylesheet"
/>
```

### Issues

1. **Three font families in one request, including Material Symbols.** The Material Symbols icon font is ~300KB+ and render-blocking. This single stylesheet load will significantly impact LCP (Largest Contentful Paint) and FCP (First Contentful Paint).
2. **`display=swap` helps** but doesn't eliminate the network dependency. Users on slow connections will see a flash of unstyled text (FOUT).
3. **Variable font axis ranges are wide.** `Bricolage Grotesque:opsz,wght@12..96,200..800` loads every optical size and weight. The page only uses a few weights.
4. **No `rel="preload"` for critical fonts.** The `preconnect` hints are good but not sufficient.
5. **Material Symbols loads the full icon set** (~300 icons worth of glyphs) for ~10 icons used on the page.

### Recommended Fixes

**Short-term -- Split font loading and subset Material Symbols:**
```tsx
<head>
  <link href="https://fonts.googleapis.com" rel="preconnect" />
  <link crossOrigin="anonymous" href="https://fonts.gstatic.com" rel="preconnect" />

  {/* Critical fonts -- preloaded */}
  <link
    href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;700;800&family=Inter:wght@400;500&display=swap"
    rel="stylesheet"
  />

  {/* Icon font -- loaded async to avoid render-blocking */}
  <link
    href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@400,0..1&display=swap"
    rel="stylesheet"
    media="print"
    // @ts-ignore -- forces async load
    onLoad="this.media='all'"
  />
</head>
```

**Medium-term -- Self-host fonts:**
- Download Bricolage Grotesque and Inter as WOFF2 files
- Serve from `/public/fonts/` (already exists in the project)
- Eliminates third-party DNS lookup and the Google Fonts render-blocking issue entirely
- Use `next/font` for automatic optimization

**Long-term -- Replace Material Symbols with inline SVGs:**
- Only ~10 icons are used. Inline SVG saves ~300KB of font download.
- Better accessibility (SVGs can have `<title>` and `aria-label`)
- No FOUT for icons

**Priority: HIGH.** Font loading is likely the single biggest Core Web Vitals issue. Material Symbols alone may be adding 1-2 seconds to load time on mobile.

---

## 10. robots.txt & Sitemap

### Current State

- **No `robots.txt`** file (no `src/app/robots.ts` or `public/robots.txt`)
- **No `sitemap.xml`** file (no `src/app/sitemap.ts` or `public/sitemap.xml`)
- `layout.tsx` has `robots: { index: true, follow: true }` in metadata (good, but insufficient)
- CLAUDE.md says "robots.txt allows AI crawlers" -- but this file does not yet exist

### Issues

1. **Without robots.txt**, crawlers have no guidance. Not critical for a single-page site, but necessary before adding more pages.
2. **Without sitemap.xml**, Google relies solely on crawling to discover pages. Submitting a sitemap to Google Search Console accelerates indexing.
3. The CLAUDE.md states the intent to allow AI crawlers -- this needs to be explicitly configured.

### Recommended Fix

**Create `src/app/robots.ts`:**
```ts
import type { MetadataRoute } from 'next'
import { SITE_CONFIG } from '@/shared/config'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/'],
      },
    ],
    sitemap: `${SITE_CONFIG.url}/sitemap.xml`,
  }
}
```

**Create `src/app/sitemap.ts`:**
```ts
import type { MetadataRoute } from 'next'
import { SITE_CONFIG } from '@/shared/config'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_CONFIG.url,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${SITE_CONFIG.url}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${SITE_CONFIG.url}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ]
}
```

**Priority: HIGH.** These are table-stakes for any site that wants to be indexed.

---

## Summary: Priority Matrix

| # | Issue | Severity | Effort | Impact |
|---|---|---|---|---|
| 1 | Brand mismatch (AgentGate vs Meldar) in config + JSON-LD | CRITICAL | Low | Fixes identity confusion for Google |
| 2 | No target keywords in title, H1, or any heading | CRITICAL | Low | Currently unrankable for any query |
| 3 | Missing OG image + Twitter card | CRITICAL | Medium | Social shares are invisible |
| 4 | Missing canonical URL | HIGH | Trivial | Prevents duplicate content splitting |
| 5 | Broken heading hierarchy (H4 before H3, missing H2s) | HIGH | Low | Confuses crawlers + accessibility tools |
| 6 | No FAQPage JSON-LD schema | HIGH | Low | Missing rich result opportunity |
| 7 | No robots.txt or sitemap.xml | HIGH | Low | Table-stakes for indexing |
| 8 | Font loading -- Material Symbols render-blocking (~300KB) | HIGH | Medium | Core Web Vitals impact |
| 9 | Icon font invisible to crawlers + missing aria attributes | MEDIUM | Medium | Accessibility + minor SEO |
| 10 | No internal nav links in header | MEDIUM | Low | UX + crawlability |
| 11 | Self-host fonts via next/font | MEDIUM | Medium | Eliminate third-party dependency |
| 12 | Replace Material Symbols with inline SVG | LOW | High | Performance gain, better a11y |

### Recommended Implementation Order

1. **Fix SITE_CONFIG** -- update name, URL, description to Meldar branding (30 min)
2. **Update metadata** -- title, description, canonical, twitter card (30 min)
3. **Create robots.ts + sitemap.ts** (15 min)
4. **Fix heading hierarchy** across all sections (1 hr)
5. **Add FAQPage JSON-LD** (30 min)
6. **Create OG image** and wire it into metadata (1 hr)
7. **Add header nav links + section IDs** (30 min)
8. **Add aria-hidden to icon spans** (30 min)
9. **Optimize font loading** -- subset weights, async Material Symbols (1 hr)
10. **Self-host fonts** via next/font (2 hrs)
