# Performance Audit — Core Web Vitals & Landing Page

## Executive Summary

The landing page is lightweight text-only (no images, no heavy JS), which is a strong baseline. The main bottlenecks are **three render-blocking Google Fonts requests** and an **unused framer-motion dependency**. Fixing these yields an estimated **200-400ms LCP improvement** and **~50KB smaller JS bundle**.

---

## 1. Font Loading (HIGH IMPACT)

### Current State

A single `<link>` tag in `layout.tsx:34-36` loads three font families from Google Fonts:

```
Bricolage Grotesque (variable weight 200-800)
Inter (weights 300, 400, 500)
Material Symbols Outlined (variable weight + FILL)
```

This means:
- **3 external HTTP requests** before first paint (DNS + TLS + download for `fonts.googleapis.com` stylesheet, then `fonts.gstatic.com` for each woff2 file)
- `display=swap` is set (good — prevents FOIT), but the stylesheet itself is **render-blocking**
- Material Symbols variable font is **~300KB** for the full icon set

### Recommendations

| Action | Impact | Effort |
|--------|--------|--------|
| **Self-host fonts via `next/font`** | Eliminates 2 external origins, enables automatic `font-display: swap`, subsetting, and preloading. Removes render-blocking stylesheet. | Medium |
| **Use `next/font/google` for Bricolage Grotesque + Inter** | Next.js downloads at build time, self-hosts, adds preload hints automatically. Zero-layout-shift font loading. | Low |
| **Preload the heading font (Bricolage Grotesque)** | It renders the hero H1 (LCP element). Preloading cuts ~100-200ms from LCP on slow connections. | Low |

#### Proposed Implementation

```tsx
// layout.tsx
import { Bricolage_Grotesque, Inter } from 'next/font/google'

const heading = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
})

const body = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-body',
  display: 'swap',
})
```

**Estimated LCP improvement: 150-300ms** (eliminates render-blocking external stylesheet + external origin connection)

---

## 2. Material Symbols (HIGH IMPACT)

### Current State

The full Material Symbols Outlined variable font is loaded (~300KB woff2) for **13 unique icons**:

| Icon | Component |
|------|-----------|
| `layers_clear` | ProblemSection |
| `visibility_off` | ProblemSection |
| `build_circle` | ProblemSection |
| `cloud_off` | ProblemSection (testimonial) |
| `restaurant` | SkillCardsSection |
| `school` | SkillCardsSection |
| `sell` | SkillCardsSection |
| `work` | SkillCardsSection |
| `receipt_long` | SkillCardsSection |
| `share` | SkillCardsSection |
| `check` | TiersSection |
| `shield_moon` | TrustSection |
| `expand_more` | FaqSection |

### Recommendations

| Option | Size | Tradeoffs |
|--------|------|-----------|
| **A. Switch to lucide-react icons** | ~0KB extra (already tree-shaken in deps, `optimizePackageImports` in next.config.ts) | Need to find equivalent icons; lose Material design language. Best option for bundle size. |
| **B. Self-host Material Symbols with icon subsetting** | ~15-25KB (subset woff2 with only 13 glyphs) | Keeps Material design language; requires build-time subsetting tooling. |
| **C. Inline SVGs for each icon** | ~5-10KB total (13 icons at ~400-800B each) | No font download at all; icons render in first paint; most work to set up. |

**Recommendation: Option A (lucide-react)**. It is already a dependency with tree-shaking configured. This eliminates the ~300KB icon font entirely with near-zero migration effort. If exact Material icon aesthetics are important, Option B via a subset generator is the fallback.

**Estimated savings: ~300KB transfer, eliminates 1 render-blocking request**

---

## 3. Client Components Audit (MEDIUM IMPACT)

### Current `"use client"` Components

| Component | Why client? | Can convert to RSC? |
|-----------|------------|---------------------|
| `FaqSection` | `useState` for accordion toggle | **No** — needs interactive state |
| `CookieConsent` | `useState`, `useEffect`, event listeners | **No** — inherently interactive |
| `GoogleAnalytics` | `useEffect`, `useConsentState` hook | **No** — consent-gated script injection |
| `Footer` | Imports `requestConsentReopen` (dispatches browser event) | **Yes — partially** |
| `EmailCapture` | `useState` for form state | **No** — form interaction |
| `use-consent-state` | localStorage access, event listeners | **No** — browser APIs |

### Recommendations

1. **Footer**: The only reason it's `"use client"` is the cookie settings button calling `requestConsentReopen()`. Extract the cookie settings button into a tiny `CookieSettingsButton` client component and make `Footer` a server component. Saves the Footer from being in the client bundle.

2. **FaqSection**: Consider using the native HTML `<details>/<summary>` elements instead of `useState`. This would make FaqSection a server component (zero JS) and improve accessibility for free. The `expand_more` icon rotation can be done with CSS `:open` pseudo-class (or `[open]` attribute selector).

**Estimated JS savings: ~2-5KB** (Footer RSC conversion) + **~1-3KB** (FaqSection if converted to `<details>`)

---

## 4. Bundle Size — framer-motion (HIGH IMPACT)

### Current State

`framer-motion@12.29.2` is listed in `dependencies` in package.json. Grep confirms **zero imports** across the entire `src/` directory — it is completely unused.

### Recommendation

**Remove it immediately.** Even with tree-shaking, framer-motion's entry point pulls in a baseline of ~30-50KB (minified + gzipped) if accidentally imported anywhere. As an unused dependency it inflates `node_modules` and risks accidental inclusion.

```bash
pnpm remove framer-motion
```

If subtle animations are needed later, consider CSS animations/transitions (already used throughout via Panda CSS `transition` props) or the lighter `motion` package (~5KB).

**Estimated savings: eliminates risk of ~30-50KB bundle bloat; cleaner dependency tree**

---

## 5. CSS — PandaCSS (LOW CONCERN)

### Current State

PandaCSS generates CSS at build time via static analysis. The `globals.css` file contains only layer declarations:

```css
@layer reset, base, tokens, recipes, utilities;
```

### Assessment

- **Unused styles are minimal** — PandaCSS only generates CSS for utilities actually used in source code. This is fundamentally different from Tailwind's purge approach; Panda never generates unused CSS in the first place.
- **No runtime CSS-in-JS overhead** — styles are extracted at build time.
- **Layer ordering is correct** — specificity is well-controlled.

**No action needed.** PandaCSS is an excellent choice for CWV; zero-runtime CSS generation with no unused style concerns.

---

## 6. Images (NO CONCERN)

### Current State

The landing page has **zero images**. No `<img>` tags, no `next/image` usage, no background images (only CSS gradients). The favicon is an SVG (`/favicon.svg`).

### Assessment

This is ideal for initial load performance — no image optimization needed. When images are added later:
- Use `next/image` with `priority` on above-the-fold images
- `next.config.ts` already configures AVIF + WebP formats and aggressive caching (`minimumCacheTTL: 31536000`)

**No action needed now.**

---

## 7. Third-Party Scripts (LOW CONCERN)

### Current State

| Script | Loading | Blocking? |
|--------|---------|-----------|
| Google Analytics (gtag.js) | `strategy="afterInteractive"` via `next/script` | **No** — deferred, and only loads after cookie consent acceptance |
| Google Fonts stylesheet | `<link rel="stylesheet">` in `<head>` | **Yes — render-blocking** (addressed in section 1) |

### Assessment

- GA is properly consent-gated (GDPR-compliant) and uses `afterInteractive` — correct.
- The gtag inline script runs before the external script loads — correct order.
- No other third-party scripts detected.

**Only issue: the Google Fonts `<link>` is render-blocking.** Solved by switching to `next/font` (section 1).

---

## 8. LCP Analysis (CRITICAL)

### Likely LCP Element

The **hero H1 text** ("Stop trying to figure out AI. Let it figure out you.") is the largest contentful paint candidate:
- It is the first visible above-the-fold content
- Rendered in Bricolage Grotesque (heading font) at hero size
- No images compete for LCP

### LCP Bottleneck Chain

```
1. HTML download
2. Parse <head> → discover Google Fonts <link> (render-blocking)
3. Fetch fonts.googleapis.com CSS (external origin: DNS + TLS + download)
4. Parse CSS → discover woff2 files on fonts.gstatic.com
5. Fetch Bricolage Grotesque woff2 (second external origin)
6. Render H1 with correct font → LCP fires
```

Steps 2-5 add **200-500ms** on typical connections. With `display: swap`, the browser shows fallback text immediately but LCP is measured on the *final* render (with the correct font).

### Optimizations to Hit <2.5s LCP

| Priority | Action | LCP Impact |
|----------|--------|------------|
| **P0** | Switch to `next/font/google` for Bricolage Grotesque + Inter | -200-400ms (eliminates external origin waterfall, auto-preloads) |
| **P0** | Remove Google Fonts `<link>` from `<head>` entirely | Eliminates render-blocking resource |
| **P1** | Remove Material Symbols font; switch to lucide-react | -100-200ms (eliminates 300KB font download) |
| **P2** | Add `fetchpriority="high"` equivalent via font preloading | Prioritizes LCP font in browser resource queue |
| **P2** | Convert FaqSection to `<details>` (RSC) | Reduces main-thread JS parsing |

---

## Priority Action Plan

### Tier 1 — Do Now (est. LCP improvement: 300-500ms)

1. **Replace Google Fonts `<link>` with `next/font/google`** for Bricolage Grotesque and Inter
2. **Remove Material Symbols font** — replace with lucide-react icons (already a dependency)
3. **Remove `framer-motion`** from dependencies

### Tier 2 — Do Soon (est. JS savings: 3-8KB)

4. **Extract `CookieSettingsButton`** client component; make Footer a server component
5. **Convert FaqSection** to use `<details>/<summary>` (eliminate `useState`, become RSC)

### Tier 3 — Monitor

6. **Run Lighthouse CI** on every deploy to catch regressions
7. **Set performance budget**: LCP < 1.5s, CLS < 0.05, INP < 100ms
8. **When images are added**: use `next/image` with `priority` for hero images

---

## Metrics to Track Post-Implementation

| Metric | Current (est.) | Target |
|--------|----------------|--------|
| LCP | ~1.5-2.5s (font-dependent) | < 1.2s |
| CLS | ~0.05 (font swap) | < 0.01 (next/font eliminates swap shift) |
| INP | < 100ms (minimal JS) | < 50ms |
| Total JS (first load) | ~80-100KB | < 70KB |
| Render-blocking resources | 1 (Google Fonts CSS) | 0 |
| External origins | 2 (googleapis.com, gstatic.com) | 0 (self-hosted fonts) |
