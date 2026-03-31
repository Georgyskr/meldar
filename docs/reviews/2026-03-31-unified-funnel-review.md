# Code Review: Unified Funnel Redesign

**Reviewer:** Senior Code Reviewer (automated)
**Date:** 2026-03-31
**Scope:** All new and modified files for the unified discovery funnel at `/start`

---

## Critical Issues (must fix before deploy)

### C1. `_rawMessages` / `_rawSearches` / `_rawYoutubeWatches` are stored in the database

**Files:** `src/app/api/discovery/upload/route.ts` (lines 127-139), `src/server/discovery/parsers/chatgpt.ts` (line 50), `src/server/discovery/parsers/claude-export.ts` (line 41), `src/server/discovery/parsers/google-takeout.ts` (lines 58-59)

**What's wrong:** The parsers return up to 500 raw messages/searches, and the upload route stores the entire parse result -- including `_rawMessages`, `_rawSearches`, and `_rawYoutubeWatches` -- directly into the `jsonb` columns (`chatgptData`, `claudeData`, `googleData`) in the database. These fields are only needed by the analysis engine's `buildDataContext` function, not for persistent storage. This wastes database storage and, more importantly, stores large volumes of user chat history and search queries that you may not intend to persist under your privacy policy ("Meldar doesn't watch you").

**Fix:** Strip the raw data arrays before persisting to the database. Only store them in memory for analysis, or strip them after analysis completes. In `src/app/api/discovery/upload/route.ts`, strip before the database write:

```typescript
case 'chatgpt': {
    const parsed = await parseChatGptExport(file)
    // Strip raw messages before DB storage -- only needed during analysis
    const { _rawMessages, ...persistable } = parsed
    updateData = { chatgptData: persistable }
    break
}
case 'claude': {
    const parsed = await parseClaudeExport(file)
    const { _rawMessages, ...persistable } = parsed
    updateData = { claudeData: persistable }
    break
}
case 'google': {
    const parsed = await parseGoogleTakeout(file)
    const { _rawSearches, _rawYoutubeWatches, ...persistable } = parsed
    updateData = { googleData: persistable }
    break
}
```

However, this creates a problem: the `analyze` route reads data from the DB and passes it to `runCrossAnalysis`, which requires the raw data. You need to rethink the architecture -- either (a) parse and analyze in a single request, or (b) store raw data in a separate ephemeral store (e.g., Redis with TTL), or (c) accept the storage trade-off but add a cleanup job and update the privacy policy accordingly.

### C2. No file MIME type validation for `chatgpt`, `claude`, and `google` uploads

**File:** `src/app/api/discovery/upload/route.ts` (lines 57-85)

**What's wrong:** Only `screentime` validates the file's MIME type. For `chatgpt` and `google`, any file under 200MB/50MB will be accepted and fed directly to `JSZip.loadAsync()` or `JSON.parse()`. A malicious user could upload a crafted file that causes excessive memory consumption during ZIP decompression (zip bomb) or JSON parsing.

**Fix:** Add MIME type validation for all platforms:

```typescript
const ALLOWED_ZIP_TYPES = new Set([
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream', // browsers sometimes use this for .zip
])
const ALLOWED_JSON_TYPES = new Set([
    'application/json',
    'text/plain', // browsers sometimes use this for .json
])
```

For the `chatgpt` and `google` cases, add:
```typescript
if (!ALLOWED_ZIP_TYPES.has(file.type)) {
    return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'File must be a ZIP archive.' } },
        { status: 400 },
    )
}
```

For `claude`:
```typescript
if (!ALLOWED_JSON_TYPES.has(file.type)) {
    return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'File must be a JSON file.' } },
        { status: 400 },
    )
}
```

Note: MIME types from browsers are unreliable for `.zip` and `.json`, so consider also validating by file extension from `file.name`.

### C3. `handleGenerateResults` and `handleSkip` are identical functions

**File:** `src/app/start/start-client.tsx` (lines 92-146)

**What's wrong:** `handleGenerateResults` (lines 92-118) and `handleSkip` (lines 120-146) contain the exact same code. This is not merely a DRY violation -- it suggests that `handleSkip` was meant to have different behavior (e.g., skipping the data upload phase with a lighter analysis, or showing a warning). If a user clicks "Skip" and the analysis fails because no data was uploaded, they will see a generic "Analysis failed" error with no indication that they need to upload data first.

**Fix:** Either differentiate the two handlers (e.g., `handleSkip` could show a confirmation modal or pass a `skipUploads=true` flag to the API), or consolidate into a single handler:

```typescript
async function handleAnalyze() {
    if (!session) return
    setAnalyzing(true)
    setError('')
    try {
        const res = await fetch('/api/discovery/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: session.sessionId }),
        })
        if (!res.ok) {
            setError('Analysis failed. Please try again.')
            setAnalyzing(false)
            return
        }
        const data = await res.json()
        setAnalysis(data.analysis)
        setAnalyzing(false)
        transitionTo('results')
    } catch {
        setError('Connection failed. Please try again.')
        setAnalyzing(false)
    }
}
```

Then pass `handleAnalyze` to both `onGenerateResults` and `onSkip`.

### C4. `updateData` may be used before being assigned

**File:** `src/app/api/discovery/upload/route.ts` (line 103)

**What's wrong:** `updateData` is declared with `let updateData: Record<string, unknown>` without an initializer. While the current `switch` covers all enum values (and Zod validation should prevent reaching this point with an unknown platform), TypeScript may allow this code to reach the `db.update()` call at line 155 with `updateData` uninitialized if the switch somehow falls through. This is a defensive programming concern.

**Fix:** Initialize with a default or add an exhaustive check:

```typescript
let updateData: Record<string, unknown> = {}

// ... switch statement ...

// After the switch, add a guard:
if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Unknown platform handler.' } },
        { status: 500 },
    )
}
```

Or use the `never` exhaustive pattern:

```typescript
default: {
    const _exhaustive: never = platformParsed.data
    return NextResponse.json(
        { error: { code: 'INTERNAL_ERROR', message: 'Unknown platform.' } },
        { status: 500 },
    )
}
```

---

## High Issues (should fix soon)

### H1. No `sessionId` format validation in the upload route

**File:** `src/app/api/discovery/upload/route.ts` (line 41)

**What's wrong:** The `sessionId` from `formData.get('sessionId')` is used directly in a database query without any format validation. While Drizzle uses parameterized queries (safe from SQL injection), an attacker could send very long strings or special characters. The `analyze` route validates `sessionId` with `z.string().min(1).max(32)`, but the `upload` route does not.

**Fix:** Add Zod validation for `sessionId` in the upload route:

```typescript
const sessionIdParsed = z.string().min(1).max(32).safeParse(sessionId)
if (!sessionIdParsed.success) {
    return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid session ID.' } },
        { status: 400 },
    )
}
```

### H2. Analyze route reuses `screentimeLimit` rate limiter instead of a dedicated one

**File:** `src/app/api/discovery/analyze/route.ts` (line 9)

**What's wrong:** The analyze endpoint reuses `screentimeLimit` (5 requests per minute). This means a single user's rate limit budget is shared between uploading files and triggering analysis. A user who uploads 5 files will be rate-limited from analyzing. The analyze route calls the Anthropic API, which is expensive -- it should have its own, stricter rate limit.

**Fix:** Create a dedicated rate limiter in `src/server/lib/rate-limit.ts`:

```typescript
// 3 analysis requests per 10 minutes per IP (expensive AI call)
export const analyzeLimit = redis
    ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, '10 m'), prefix: 'rl:analyze' })
    : null
```

### H3. No error handling for `JSON.parse` failures in parsers

**Files:** `src/server/discovery/parsers/chatgpt.ts` (line 18), `src/server/discovery/parsers/claude-export.ts` (line 11), `src/server/discovery/parsers/google-takeout.ts` (line 29)

**What's wrong:** If a user uploads a corrupted ZIP or malformed JSON, `JSON.parse()` will throw a `SyntaxError`. This propagates up to the catch block in the upload route, which returns a generic "Upload processing failed" 500 error. The user gets no useful feedback about what went wrong.

**Fix:** Wrap JSON.parse calls in try-catch with specific error messages:

```typescript
// In chatgpt.ts
let raw: unknown
try {
    raw = JSON.parse(await convFile.async('string'))
} catch {
    throw new Error('conversations.json contains invalid JSON. Is this a valid ChatGPT export?')
}
```

Then in the upload route, catch these specific errors and return 422 instead of 500:

```typescript
} catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message.includes('invalid JSON') || message.includes('not an array') || message.includes('No conversations.json')) {
        return NextResponse.json(
            { error: { code: 'UNPROCESSABLE', message } },
            { status: 422 },
        )
    }
    // ... existing 500 handler
}
```

### H4. Share URL points to a non-existent route

**File:** `src/features/discovery-flow/ui/AnalysisResults.tsx` (line 81)

**What's wrong:** `handleShare` constructs the URL `${window.location.origin}/start/${sessionId}`, but there is no `src/app/start/[id]/page.tsx` route. Clicking a shared link will result in a 404.

**Fix:** Either create the `src/app/start/[id]/page.tsx` route to display shared results, or remove the share button until the route exists. If the share feature is planned for later, at minimum add a `// TODO` comment and disable the button with a "Coming soon" tooltip.

### H5. `AnalysisData` type is duplicated between `start-client.tsx` and `AnalysisResults.tsx`

**Files:** `src/app/start/start-client.tsx` (lines 19-47), `src/features/discovery-flow/ui/AnalysisResults.tsx` (lines 8-37)

**What's wrong:** The `AnalysisData` type is defined independently in both files. If the API response shape changes, one type may be updated while the other is forgotten, causing runtime bugs.

**Fix:** Define the type once, either in `src/server/discovery/parsers/types.ts` (it already has `DiscoveryAnalysis`) or in a shared types file within the feature slice. Then import from a single source. The `DiscoveryAnalysis` type in `types.ts` already matches this shape -- reuse it:

```typescript
// In AnalysisResults.tsx and start-client.tsx
import type { DiscoveryAnalysis } from '@/server/discovery/parsers/types'
```

Note: This would mean a frontend component importing from `@/server/`. If that violates your FSD boundaries, re-export the type from the `discovery-flow` feature barrel.

### H6. Sitemap does not include `/start`

**File:** `src/app/sitemap.ts`

**What's wrong:** The new `/start` page is not listed in the sitemap. Still references `/quiz` which now redirects. Both should be updated.

**Fix:**
```typescript
{
    url: `${SITE_CONFIG.url}/start`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.9,
},
```
And remove or update the `/quiz` entry since it is now a redirect.

### H7. `page.tsx` metadata is missing canonical URL

**File:** `src/app/start/page.tsx` (lines 4-8)

**What's wrong:** Per project rules: "Every page: metadata with title, description, canonical pointing to meldar.ai." The `/start` page has `title` and `description` but no canonical URL or `alternates`.

**Fix:**
```typescript
export const metadata: Metadata = {
    title: 'Start here — Meldar',
    description:
        'Discover what wastes your time. Upload your data, get personalized AI recommendations. Free to start.',
    alternates: {
        canonical: 'https://meldar.ai/start',
    },
}
```

---

## Medium Issues (improve when convenient)

### M1. Duplicated `extractTimePatterns` function

**Files:** `src/server/discovery/parsers/chatgpt.ts` (lines 54-82), `src/server/discovery/parsers/claude-export.ts` (lines 45-79)

**What's wrong:** Both files contain nearly identical `extractTimePatterns` functions. The Claude version is slightly more robust (skips `timestamp === 0`), while the ChatGPT version does not.

**Fix:** Extract into a shared utility:

```typescript
// src/server/discovery/parsers/time-patterns.ts
export function extractTimePatterns(messages: { timestamp: number }[]) {
    const withTimestamp = messages.filter((m) => m.timestamp > 0)
    if (withTimestamp.length === 0) {
        return { mostActiveHour: 12, weekdayVsWeekend: 'balanced' as const }
    }
    // ... rest of the Claude version's implementation
}
```

### M2. `DataUploadHub` error display accesses wrong property

**File:** `src/features/discovery-flow/ui/DataUploadHub.tsx` (line 221)

**What's wrong:** When the upload fails, the error data extraction is:
```typescript
const data = await res.json()
setSources((prev) => ({
    ...prev,
    [platformId]: {
        status: 'error',
        errorMessage: data.error || 'Upload failed. Try again.',
    },
}))
```
But the API returns `{ error: { code: '...', message: '...' } }` -- an object, not a string. `data.error` will always be truthy (it is an object), so it will display `[object Object]` in the UI.

**Fix:**
```typescript
errorMessage: data.error?.message || 'Upload failed. Try again.',
```

### M3. `AnalysisResults` cross-feature import from `@/features/billing`

**File:** `src/features/discovery-flow/ui/AnalysisResults.tsx` (line 6)

**What's wrong:** In strict FSD, features should not import from sibling features. `discovery-flow` imports `PurchaseButton` from `billing`. While this is pragmatic and common in real projects, it creates implicit coupling.

**Fix (when refactoring):** Either:
- Accept the pragmatic cross-feature import (document the exception)
- Lift `PurchaseButton` to `shared/ui` if it is truly generic
- Pass `PurchaseButton` as a render prop or children from the app layer

### M4. `QuickProfile` uses `useCallback` for `advanceStep` but not for other handlers

**File:** `src/features/discovery-flow/ui/QuickProfile.tsx` (lines 55-63)

**What's wrong:** `advanceStep` is wrapped in `useCallback` (with `step` dependency, so it recreates on every step change anyway), but `togglePain`, `selectComfort`, `toggleTool`, and `handleDone` are plain functions that recreate on every render. The `useCallback` on `advanceStep` provides no optimization benefit here because none of these handlers are passed to memoized children.

**Fix:** Remove the `useCallback` wrapper from `advanceStep` for consistency and simplicity, or wrap all handlers if memoized children are introduced later. Currently, removing the unnecessary `useCallback` is the cleaner approach:

```typescript
function advanceStep(nextStep?: number) {
    setTransitioning(true)
    setTimeout(() => {
        setStep(nextStep ?? step + 1)
        setTransitioning(false)
    }, 250)
}
```

### M5. `UploadCard` receives `platform` prop but never uses it

**File:** `src/features/discovery-flow/ui/UploadCard.tsx` (lines 9, 23)

**What's wrong:** The `platform` prop is declared in `UploadCardProps` and destructured in the function signature, but never used in the component body. This is dead code.

**Fix:** Remove `platform` from the props type and destructuring:

```typescript
type UploadCardProps = {
    // platform: string  <-- remove
    title: string
    // ...
}

export function UploadCard({
    // platform, <-- remove
    title,
    // ...
}: UploadCardProps) {
```

### M6. Animation via `style` prop instead of Panda CSS

**Files:** Multiple -- `start-client.tsx`, `QuickProfile.tsx`, `DataUploadHub.tsx`, `UploadCard.tsx`, `AnalysisResults.tsx`

**What's wrong:** The project rule states "No inline styles. Always use Panda CSS utilities." Many components use `style={{ animation: '...' }}` to apply animations. While this may be necessary for dynamic animation names (which Panda CSS does not support well), it should be documented as an intentional exception.

**Fix:** Add a comment at the top of globals.css or in the feature's README explaining that CSS animation keyframes are defined in globals.css and applied via inline `style` props because Panda CSS does not support dynamic animation name interpolation.

### M7. `discoverySessions` table has no index on `userId` or `email`

**File:** `src/server/db/schema.ts` (line 124)

**What's wrong:** The `discoverySessions` table passes an empty array `() => []` for the indexes parameter. As the table grows, queries filtering by `userId` will be slow. Other tables in the schema (e.g., `auditOrders`, `users`) have indexes.

**Fix:**
```typescript
(table) => [
    index('idx_discovery_user_id').on(table.userId),
],
```

### M8. No `updatedAt` auto-update mechanism

**File:** `src/server/db/schema.ts` (line 122)

**What's wrong:** `updatedAt` uses `.defaultNow()` for the initial insert but relies on manual `updatedAt: new Date()` in every update call (seen in upload and analyze routes). This is error-prone -- if any future update forgets to set `updatedAt`, it will be stale. Postgres has no built-in `ON UPDATE` for timestamps (unlike MySQL).

**Fix:** Consider using a Drizzle `$onUpdate` helper or a database trigger. Or at minimum, centralize the update logic in a helper function that always sets `updatedAt`.

---

## Low Issues (nice to have)

### L1. `DEFAULT_MODULES` in `AnalysisResults.tsx` duplicates `BASE_LEARNING_MODULES` in `analyze.ts`

**Files:** `src/features/discovery-flow/ui/AnalysisResults.tsx` (lines 45-70), `src/server/discovery/analyze.ts` (lines 17-42)

**What's wrong:** The default learning modules are defined in both the server analysis engine and the client results component with slightly different descriptions. If module definitions change on the server, the client fallback will be stale.

**Fix:** The client fallback should not be necessary if the server always returns modules. Consider removing the client-side fallback, or extracting module definitions to a shared constants file.

### L2. Video placeholder with no actual video

**File:** `src/features/discovery-flow/ui/UploadCard.tsx` (lines 223-247)

**What's wrong:** Each upload card's instructions section includes a video thumbnail placeholder with "Watch the 30-second tutorial" text, but there is no video. This creates a misleading affordance -- users will click the play button and nothing happens.

**Fix:** Either remove the video placeholder until actual videos exist, or add a `// TODO` comment and an `onClick` handler that shows a "Coming soon" tooltip.

### L3. Hardcoded color values

**Files:** Multiple -- `UploadCard.tsx` (line 73, 74), `AnalysisResults.tsx` (line 164), `QuickProfile.tsx`

**What's wrong:** Colors like `#623153`, `#81737a`, `white` are hardcoded as string props (e.g., to `lucide-react` icon `color` props). While this is necessary for third-party components that don't support Panda CSS tokens, it creates potential inconsistency if the brand palette changes.

**Fix:** Define constants for these values:
```typescript
const BRAND_PRIMARY = '#623153'
const BRAND_ICON_MUTED = '#81737a'
```

### L4. `handleShare` has no error handling for clipboard/share API

**File:** `src/features/discovery-flow/ui/AnalysisResults.tsx` (lines 80-91)

**What's wrong:** `navigator.share()` and `navigator.clipboard.writeText()` can both reject (e.g., user denies permission, or clipboard API is unavailable in HTTP context). The `async` callback will throw an unhandled promise rejection.

**Fix:**
```typescript
const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/start/${sessionId}`
    try {
        if (navigator.share) {
            await navigator.share({
                title: 'My Meldar Analysis',
                text: `Meldar analyzed my data and found my #1 app to build: ${analysis.recommendedApp.name}`,
                url,
            })
        } else {
            await navigator.clipboard.writeText(url)
            // Optionally show a "Copied!" toast
        }
    } catch {
        // User cancelled share or clipboard unavailable
    }
}, [sessionId, analysis.recommendedApp.name])
```

### L5. `prefers-reduced-motion` media query is good but covers all animations globally

**File:** `src/shared/styles/globals.css` (lines 199-207)

**What's wrong:** This is actually fine for accessibility. Just noting that the `!important` override is aggressive and could interfere with critical transitions (e.g., a loading spinner that should always animate). This is a minor concern.

### L6. `AnalysisResults` displays card positions inconsistently

**File:** `src/features/discovery-flow/ui/AnalysisResults.tsx` (lines 121-124)

**What's wrong:** The logic assigns `position` as `'first'`, `'second'`, `'third'`, then blurs the first and third while showing the second. This means the free visible recommendation is always index 1 (the first `additionalApp`), not the `recommendedApp` (index 0). The `recommendedApp` is blurred behind the paywall. This may be intentional (showing the best recommendation only after payment), but the label "Unlock to see your #1 recommendation" next to the blurred first card suggests it. Just flagging this as something to verify is intentional product behavior.

---

## What's Good

1. **Solid API route structure.** All three API routes (`session`, `upload`, `analyze`) follow a consistent pattern: rate limiting, Zod validation, proper HTTP status codes, and structured error responses with `{ error: { code, message } }`. This is well-organized.

2. **Proper rate limiting.** Every endpoint has rate limiting via Upstash Redis, with a graceful fallback (`checkRateLimit` returns `{ success: true }` when Redis is not configured). This prevents abuse while keeping local development frictionless.

3. **Good separation of parsers.** Each data source (ChatGPT, Claude, Google Takeout) has its own dedicated parser file with clear responsibilities. The barrel export in `parsers/index.ts` provides a clean public API.

4. **`discoverySessions` schema design.** The table design is pragmatic -- using `jsonb` columns for variable-structure data from different platforms, with typed columns for structured data. The `sourcesProvided` array elegantly tracks which data has been uploaded.

5. **Idempotent analysis.** The analyze route checks `if (session.analysis)` to return cached results instead of re-running the expensive AI call. This prevents unnecessary Anthropic API costs.

6. **Accessibility attention.** All interactive elements have `_focusVisible` styles, `aria-pressed` attributes on toggle buttons, and the `prefers-reduced-motion` media query respects user preferences. The keyboard navigation story is solid.

7. **FSD compliance.** The import direction is correct: `app -> features -> entities -> shared`. The barrel exports are used properly. The one exception (cross-feature `billing` import) is reasonable.

8. **Quiz redirect.** The old `/quiz` route redirects to `/start` via `redirect()` in a server component -- clean and SEO-friendly (returns a 307/308 status).

9. **Tool use pattern for structured AI output.** The `analyze.ts` file uses Anthropic's tool use with `tool_choice: { type: 'tool', name: 'generate_analysis' }` to force structured JSON output. This is the correct pattern for reliable structured generation.

10. **Header update.** The header CTA now points to `/start` instead of the old quiz, maintaining a consistent user journey.

11. **Thoughtful paywall honeypot.** The "Removing the CSS doesn't show this. Nice try." text in the blurred recommendation card is a clever anti-circumvention measure that shows the real recommendations are server-gated.

12. **Google Takeout parser has its own file-size check.** Even though the upload route validates size, the parser also checks at line 13 (`MAX_FILE_SIZE = 200 * 1024 * 1024`), providing defense-in-depth.
