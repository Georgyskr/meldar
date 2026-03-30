# Frontend Performance Review -- Meldar X-Ray Flow

**Reviewer:** Frontend Performance Specialist
**Date:** 2026-03-30
**Scope:** X-Ray upload/result pages, OG image route, layout, bundle dependencies

---

## 1. RSC vs Client Boundary Split

### What works well
- `src/app/xray/page.tsx` is a proper RSC that only exports metadata and renders a client wrapper -- clean split.
- `src/app/xray/[id]/page.tsx` is a full RSC with async data fetching -- correct. The `XRayCard` component is also a server component (no `'use client'`), so it renders server-side on the share page. Good.
- `Header` is a server component -- correct since it has no interactivity.
- Heavy server-only dependencies (`@anthropic-ai/sdk`, `stripe`, `drizzle-orm`, `@neondatabase/serverless`) are only imported in `src/server/` and API routes -- they will never appear in the client bundle.

### Issues

**P1 -- `XRayCard` is a server component imported into a `'use client'` tree**
In `xray-client.tsx` (line 6), `XRayCard` is imported directly. Since `xray-client.tsx` has `'use client'`, every module it imports (including `XRayCard`) becomes part of the client bundle. `XRayCard` itself has no `'use client'` directive but it gets pulled into the client boundary by its parent.

This is not a bug -- it works correctly -- but it means the `XRayCard` code is shipped to the client even though it does not use any hooks or browser APIs. On the `[id]` share page it renders as a true RSC, but on the `/xray` upload page it is fully client-rendered.

**Impact:** Minimal. `XRayCard` is small (~125 lines of Panda CSS primitives, no heavy deps). No action required.

**P2 -- `Footer` is `'use client'` only for `requestConsentReopen`**
`Footer.tsx` has `'use client'` because it imports `requestConsentReopen` from the cookie-consent feature and calls it in an `onClick`. This pulls the entire footer into the client bundle.

**Suggestion:** Extract only the "Cookie Settings" button into a tiny client component (`CookieSettingsButton`). Let `Footer` remain a server component. This removes the footer markup from the JS bundle.

---

## 2. Bundle Size Analysis

### Dependencies in `package.json`

| Dependency | Used client-side? | Size concern |
|---|---|---|
| `@sentry/nextjs` (^10.46.0) | **Not imported anywhere** | **P0 -- Dead dependency. ~200-300 KB gzipped.** Even if tree-shaken, the Sentry Next.js plugin often injects wrapping code via Webpack/Turbopack plugins. Remove it. |
| `@anthropic-ai/sdk` | Server only | OK |
| `stripe` | Server only | OK |
| `drizzle-orm` / `@neondatabase/serverless` | Server only | OK |
| `@upstash/ratelimit` / `@upstash/redis` | Server only | OK |
| `resend` | Server only | OK |
| `nanoid` | Server only (API route) | OK |
| `lucide-react` | Client-side (icons) | OK -- `optimizePackageImports` configured in `next.config.ts` ensures tree-shaking |
| `zod` (^4.3.6) | `types.ts` in entities (imported in client) | **P2 -- Zod v4 is ~14 KB gzipped.** The types file uses `z.object`/`z.enum` at module level. Since `XRayCard` and `xray-client.tsx` import `types.ts`, Zod's runtime ships to the client. Consider splitting the type definitions (pure TS types) from the Zod schemas, or using `z.infer` only at the server validation boundary. |

### Recommendation: Remove `@sentry/nextjs`

No `sentry.client.config.ts`, no `sentry.server.config.ts`, no `instrumentation.ts`, no imports anywhere in `src/`. This dependency does nothing but risks injecting its Webpack plugin or increasing `node_modules` install time.

```bash
pnpm remove @sentry/nextjs
```

---

## 3. LCP (Largest Contentful Paint)

### `/xray` page (upload flow)
- LCP element: The heading "Your Time X-Ray" + the `UploadZone` drop area.
- The entire page is a `'use client'` component (`XRayPageClient`), so it requires JS to hydrate before any content is painted.
- **On 4G (~1.5s RTT, ~1.6 Mbps):** The HTML shell (header/footer from RSC) renders immediately. The main content waits for JS bundle download + hydration. If the client JS chunk is under ~50 KB gzipped, LCP should be < 3s. Likely acceptable for a tool page (not the landing page).

### `/xray/[id]` page (shared result)
- LCP element: The `XRayCard` with the gradient header and hours/day stat.
- This is a **full RSC page** with async DB fetch. LCP depends on DB query speed.
- Neon serverless HTTP driver (`@neondatabase/serverless`) uses HTTP, not persistent connections. Cold-start latency on Vercel Edge/Serverless can add 100-300ms per request. Since this is the viral share page, it should load fast.
- **Assessment:** If Neon is in the same region as Vercel, LCP should be < 2s on 4G. Good.

### Landing page (`/`)
- Not in direct scope, but `Header` and `Footer` are rendered in the root layout for every page. Header is RSC (good). Footer is client (unnecessary -- see section 1).

---

## 4. CLS (Cumulative Layout Shift)

### Upload flow state transitions
`UploadZone.tsx` transitions between `idle`, `compressing/uploading/analyzing`, `error`, and `done` states. Each state renders completely different content inside the same `<label>` container.

**P2 -- Potential CLS during state transitions:**
- The `idle` state renders: icon + 3 text lines + button + privacy note = tall content (~200px+).
- The `processing` state renders: 4 step indicators = shorter content (~120px).
- The container has `minHeight="200px"` which partially mitigates this, but the idle content is likely taller than 200px.

**Suggestion:** Set a fixed `height` or `minHeight` on the label container that accommodates the tallest state. Alternatively, use `opacity`/`visibility` transitions instead of conditional rendering to maintain layout stability.

### Result display
When `result` becomes non-null, the `UploadZone` is removed and replaced by the `XRayCard` + `XRayCardActions` + insights + `UpsellBlock` + "Upload another" button. This is a full content swap, but since the user just completed an action (upload), this is expected and not a CLS issue per CWV standards (user-initiated layout shifts are excluded from CLS measurement).

### Deletion banner
The `showDeletionBanner` in `xray-client.tsx` (line 46-59) inserts a banner at the top of the results that auto-dismisses after 5 seconds. Since it is inside the `VStack` with `gap={6}`, inserting/removing it shifts all content below.

**P3 -- Minor CLS:** The banner appears and disappears, pushing content. Consider using a `position="absolute"` or `position="fixed"` toast pattern instead of an in-flow element.

---

## 5. Image Compression (Client-side)

`UploadZone.tsx:187-209` -- `compressImage()`:

### What works well
- Skip compression for files under 2 MB -- avoids unnecessary processing.
- Uses `OffscreenCanvas` and `createImageBitmap` -- performs compression off the main thread (well, `OffscreenCanvas` still runs on main thread here since it is not in a Worker, but `createImageBitmap` itself is async and efficient).
- Targets 1568px max dimension -- matches Claude Vision's optimal input size.
- JPEG at 0.85 quality -- reasonable tradeoff.

### Issues

**P2 -- Canvas dimensions not always updated:**
Lines 199-205: When scaling down, `canvas.width` and `canvas.height` are reassigned, but when the image is already <= 1568px AND > 2MB, the canvas retains `bitmap.width` x `bitmap.height` from line 192 (the `OffscreenCanvas` constructor). In this case, the canvas dimensions are correct since they were set in the constructor. However, the `drawImage` call on line 207 uses the potentially-scaled `width` and `height` variables, while the canvas might be at the original size. This works but produces a JPEG file at the original resolution with just quality reduction. This is correct behavior -- no bug.

**P3 -- No Web Worker for compression:**
For a 12 MP phone screenshot, `createImageBitmap` + `canvas.drawImage` + `convertToBlob` on the main thread can block for 200-500ms. Moving this to a Web Worker via `OffscreenCanvas` transfer would keep the UI responsive during compression. Low priority since it only affects the upload moment.

**P3 -- Missing `bitmap.close()`:**
After `drawImage`, the `ImageBitmap` should be closed to free GPU memory: `bitmap.close()`. Not a visible perf issue for a single image, but good practice.

---

## 6. Dynamic Imports / Lazy Loading

### Current state
No `next/dynamic` or `React.lazy` is used anywhere in the codebase.

### Recommendations

**P3 -- Lazy-load `UpsellBlock` and `PurchaseButton`:**
These components are only shown after the X-Ray result is generated. They include Stripe checkout logic. Using `next/dynamic` with `ssr: false` would exclude them from the initial JS bundle:

```tsx
const UpsellBlock = dynamic(() =>
  import('@/features/billing').then(m => ({ default: m.UpsellBlock })),
  { ssr: false }
)
```

**Impact:** Small -- `PurchaseButton` is tiny (~73 lines) and `UpsellBlock` is ~50 lines. The Stripe SDK is server-side only. This is more of a hygiene improvement than a material win.

**P3 -- Lazy-load `CookieConsent`:**
Cookie consent banner is not needed until after first paint. It could be dynamically imported. However, since it is already conditionally rendered (returns `null` until `useEffect` fires), the visual impact is already deferred. JS execution still happens at hydration time though.

---

## 7. OG Image Route (`/xray/[id]/og/route.tsx`)

### Performance for social crawlers

- **Runtime:** `nodejs` (explicit). Good -- avoids Edge runtime cold start issues with `ImageResponse`.
- **DB query:** Single query with `eq(xrayResults.id, id).limit(1)` on a primary key -- fast.
- **Rendering:** Uses `next/og` (`ImageResponse`) with inline JSX and `system-ui` font. No custom fonts loaded.
- **Image size:** 1200x630 -- standard OG dimensions.

### Issues

**P2 -- No caching headers:**
Social crawlers (Facebook, Twitter, LinkedIn) will re-fetch the OG image on every share preview request. Without cache headers, each request hits the DB + renders an image.

**Suggestion:** Add `Cache-Control` or use Next.js segment config:

```tsx
export const revalidate = 3600 // Cache for 1 hour
```

Or set headers on the response:

```tsx
return new ImageResponse(jsx, {
  width: 1200,
  height: 630,
  headers: {
    'Cache-Control': 'public, max-age=3600, s-maxage=86400',
  },
})
```

Since X-Ray data does not change after creation, aggressive caching is safe.

**P3 -- No custom font:**
The OG image uses `system-ui, sans-serif` while the site brand uses Bricolage Grotesque. Loading a custom font in the OG route would improve brand consistency, but adds ~10-50ms to generation time. Trade-off is acceptable if brand matters for social sharing.

---

## 8. Mobile Responsiveness (375px)

### `XRayCard`
- Max-width of 440px with auto margins. On 375px screens with `paddingInline={6}` (24px * 2 = 48px), effective width is 327px. The card will fit.
- App list uses `Flex` with `justifyContent="space-between"` -- text may wrap on long app names at 327px. Low risk since app names are typically short.

### `UploadZone`
- `maxWidth="breakpoint-sm"` (640px) -- will collapse to full width on mobile. Good.
- `padding={10}` (40px) on the drop zone label -- 375px - 48px page padding - 80px zone padding = 247px for content. Tight but workable.
- The file input is hidden and triggered via the label -- touch-friendly. Good.

### `XRayCardActions`
- Two buttons in a `Flex` with `gap={3}`. On 375px this will fit. Each button has `paddingInline={4}` (16px * 2 = 32px) + icon (14px) + text. "Share" and "Copy link" are short enough.

### Header
- Fixed position, `paddingInline={8}` (32px * 2 = 64px). Logo area ("Meldar" + circle) + CTA button ("Get your free time audit"). On 375px: 375 - 64 = 311px for content. The CTA text is long at 14px font. Might be tight but should fit.

### Footer
- Uses `flexDir={{ base: 'column', md: 'row' }}` -- stacks on mobile. Good.
- Four footer links with `gap={8}` (32px) in a row could overflow on 375px in landscape orientation, but on portrait the `base: 'column'` stacking prevents this.

**P2 -- Footer links on small screens:**
The inner `Flex gap={8}` containing Privacy/Terms/Cookie Settings/Contact does not have responsive `flexDir`. On 375px portrait, the parent stacks vertically, but this inner flex with 4 items and `gap={8}` (32px) needs ~280px minimum. It fits at 375px, but just barely. On 320px screens (iPhone SE) it could overflow.

---

## 9. Additional Observations

### `[id]/page.tsx` -- Double data fetch
`generateMetadata` (line 22) and `XRayResultPage` (line 46) both call `getXRay(id)`. In Next.js, `fetch` is automatically deduplicated, but since this uses Drizzle (not `fetch`), the query executes twice.

**P2 -- Duplicate database query:**
Two identical DB queries per page load. Next.js 16 does not auto-deduplicate non-`fetch` calls.

**Suggestion:** Use React `cache()` wrapper:

```tsx
import { cache } from 'react'
const getXRay = cache(async (id: string) => {
  const db = getDb()
  const rows = await db.select().from(xrayResults).where(eq(xrayResults.id, id)).limit(1)
  return rows[0] || null
})
```

This deduplicates the call within a single request lifecycle.

### Google Analytics script ordering
In `GoogleAnalytics.tsx`, the inline `gtag-init` script is rendered before the external gtag.js script. This is correct -- gtag needs `window.dataLayer` initialized before the library loads. The `strategy="afterInteractive"` ensures it does not block page load. Good.

### `new Date().getFullYear()` in Footer
`Footer.tsx` line 40 creates a new `Date` on every render. Since Footer is a `'use client'` component, this runs in the browser -- fine. If Footer were converted to RSC (per section 1 recommendation), it would still work since `Date` is available server-side.

### `getDb()` creates a new connection per call
`src/server/db/client.ts` instantiates a new `neon()` + `drizzle()` on every `getDb()` call. Neon's serverless HTTP driver is designed for this (stateless HTTP queries), so this is correct for serverless environments. No connection pooling needed.

---

## Summary of Findings

| Priority | Issue | Impact | File |
|---|---|---|---|
| **P0** | `@sentry/nextjs` is a dead dependency | ~200-300 KB wasted in potential bundle injection | `package.json` |
| **P2** | No cache headers on OG image route | Redundant DB queries + image generation on every crawler hit | `src/app/xray/[id]/og/route.tsx` |
| **P2** | Double DB query on `[id]` page | 2x unnecessary Neon HTTP round-trips per page load | `src/app/xray/[id]/page.tsx` |
| **P2** | Zod runtime ships to client via type imports | ~14 KB gzipped unnecessary client JS | `src/entities/xray-result/model/types.ts` |
| **P2** | Footer is `'use client'` for one button | Entire footer markup in JS bundle | `src/widgets/footer/Footer.tsx` |
| **P2** | CLS during upload state transitions | Layout shifts between idle/processing states | `src/features/screenshot-upload/ui/UploadZone.tsx` |
| **P2** | Footer links may overflow on 320px screens | 4 links with `gap={8}` in a non-wrapping flex | `src/widgets/footer/Footer.tsx` |
| **P3** | No Web Worker for image compression | 200-500ms main thread block on upload | `src/features/screenshot-upload/ui/UploadZone.tsx` |
| **P3** | Deletion banner causes in-flow CLS | Content shifts when banner appears/disappears | `src/app/xray/xray-client.tsx` |
| **P3** | `ImageBitmap` not closed after use | Minor GPU memory leak | `src/features/screenshot-upload/ui/UploadZone.tsx` |
| **P3** | OG image uses system font, not brand font | Brand inconsistency in social previews | `src/app/xray/[id]/og/route.tsx` |
| **P3** | UpsellBlock/PurchaseButton could be lazy-loaded | Minor initial bundle savings | `src/app/xray/xray-client.tsx` |

---

## What is done well

- Server-only deps (Anthropic SDK, Stripe, Drizzle, Neon, Resend) are correctly isolated to `src/server/` and API routes -- zero client bundle impact.
- `next/font` with `display: 'swap'` for both fonts -- prevents FOIT, good LCP.
- `optimizePackageImports: ['lucide-react']` in `next.config.ts` -- ensures tree-shaking.
- Google Analytics is consent-gated and loaded with `strategy="afterInteractive"` -- no render-blocking.
- Client-side image compression before upload -- reduces upload time and server-side processing.
- The `[id]` share page is a full RSC -- fast initial paint for viral traffic.
- `browserslist` targets `"defaults and fully supports es6-module"` -- modern-only bundle, no polyfills.
- Security headers are comprehensive (HSTS, X-Frame-Options, CSP-adjacent policies).
