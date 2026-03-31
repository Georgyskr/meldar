# Code Quality Review — Discovery Flow
**Date:** 2026-03-31  
**Scope:** Full discovery flow (frontend + backend + shared)  
**Reviewer:** Code Reviewer agent

---

## Summary

The discovery flow is well-structured and has clear separation of concerns. The FSD architecture is respected, Zod validation is used at API boundaries, error handling is generally present, and the AI integration pattern (tool_use forced) is solid. The main concerns are type safety (several unsafe casts from `jsonb`), a logic bug in the app card visibility ordering, a security gap in the adaptive upload, and meaningful duplication in the locked-card rendering.

---

## What's Good

- **Privacy-first design is well-executed.** Raw messages are stripped in the upload route before storage; only extracted topics hit the DB. The `_rawMessages` destruction pattern in the upload route is clean.
- **Tool-forced AI calls.** Using `tool_choice: { type: 'tool', name: ... }` on every Claude call prevents free-text responses slipping through. Good defensive practice.
- **`atomWithStorage` for session resumption.** Persisting phase + sessionId to localStorage so users can leave and return is a nice UX detail.
- **Rate limiting applied consistently.** All three mutation routes (session, upload, analyze) check rate limits before doing any work.
- **Zod at every API boundary.** `createSessionSchema`, `analyzeSchema`, `adaptiveSchema` all validate before touching the DB.
- **Honeypot content on locked cards.** The `aria-hidden` dummy text with a note about server-side gating is a thoughtful anti-scraping touch.

---

## Issues

### Blockers

**🔴 Logic bug: app card visibility is inverted**  
`src/app/start/[id]/page.tsx:135` and `src/features/discovery-flow/ui/AnalysisResults.tsx:128`

```ts
const position = i === 0 ? 'first' : i === 1 ? 'second' : 'third'
const isBlurred = position === 'first' || position === 'third'
const isVisible = position === 'second'
```

The #1 recommended app (`i === 0`, position `'first'`) is **blurred/locked**. The second app (`i === 1`, position `'second'`) is visible. This is backwards — the primary recommendation should be the visible teaser, and the others should be locked. As written, users see the #2 recommendation for free and the #1 is paywalled and unlabeled. The lock overlay text says "Unlock to see your #1 recommendation" (correct) but the free card is the wrong one. This misrepresents the product to every user.

This bug is present in both `AnalysisResults.tsx` and the shared `[id]/page.tsx` (identical code duplication — see below).

---

**🔴 `analysisAtom` typed as `unknown | null`**  
`src/features/discovery-flow/model/atoms.ts:30`

```ts
export const analysisAtom = atomWithStorage<unknown | null>('meldar-analysis', null)
```

`unknown | null` simplifies to `unknown`. The type is widened to the least useful type. In `start-client.tsx:298`, this requires a cast:

```ts
analysis={analysis as DiscoveryAnalysis}
```

This cast is unchecked — if stale/corrupt data is in localStorage, the app renders with wrong shape and may crash. The atom should be typed `DiscoveryAnalysis | null` and the restored value should be validated with `discoveryAnalysisSchema.safeParse()` before use. At minimum, replace the unsafe cast with a runtime check.

---

**🔴 Session ID validated after DB lookup in upload route**  
`src/app/api/discovery/upload/route.ts:205-211`

The `sessionId` format validation (lines 205–211) runs **after** the session is already fetched from the DB (line 161–168). The DB query is the expensive operation — the cheap format check should be first. As written, an attacker can hit the DB with arbitrary `sessionId` strings before format rejection fires.

Move the `z.string().min(1).max(32).safeParse(sessionId)` check to immediately after line 110 (where `sessionId` is extracted from `formData`), before any DB access.

---

### Suggestions

**🟡 Massive code duplication: locked app card UI**  
`src/features/discovery-flow/ui/AnalysisResults.tsx:126-253`  
`src/app/start/[id]/page.tsx:133-252`

The entire "app recommendations" rendering block (blurred cards, lock overlay, visible card content) is copy-pasted verbatim between the authenticated results view and the shared results page. If the visibility logic or honeypot text changes, it must be updated in two places. This is where the inverted-card bug already lives in both files.

Extract to a shared component, e.g. `src/features/discovery-flow/ui/AppRecommendationList.tsx`, that takes `allApps` and renders the list. Both pages import it.

---

**🟡 Unsafe `as` casts for all `jsonb` columns in analyze route**  
`src/app/api/discovery/analyze/route.ts:79-88`

```ts
screenTime: session.screenTimeData as ScreenTimeExtraction | undefined,
chatgptData: session.chatgptData as AiChatPattern | undefined,
// ...8 more casts
```

Drizzle types `jsonb` columns as `unknown`. Casting to a typed interface without validation means a malformed DB row (partial write, schema migration, manual edit) silently produces wrong analysis. The existing Zod schemas (`aiChatPatternSchema`, `googlePatternSchema`, `discoveryAnalysisSchema`) should be used to `.safeParse()` the jsonb columns. Log and skip invalid data rather than passing it through.

---

**🟡 `resolveAdaptiveSourceType` returns `'subscriptions'` for everything**  
`src/app/api/discovery/upload/route.ts:38-82`

Financial apps → `'subscriptions'`. Music apps → `'subscriptions'`. Unknown apps → `'subscriptions'`. The only non-subscriptions return is fitness → `'health'`. The function has no path for notes, food delivery, trading portfolio, banking, Reddit, LinkedIn, or shopping screenshots. Extracting a Robinhood watchlist with the subscriptions extractor will produce garbled output. Either extend the map properly or document the current limitation clearly — but as written it's misleading.

---

**🟡 `handleStartFresh` calls `transitionTo('profile')` after resetting `phase` atom**  
`src/app/start/start-client.tsx:51-61`

```ts
function handleStartFresh() {
  setSessionId(RESET)
  setPhase(RESET)     // resets phase to 'profile'
  // ...
  transitionTo('profile')  // sets phase to 'profile' again after 300ms
}
```

`setPhase(RESET)` already resets to `'profile'` (the initial value). `transitionTo('profile')` then sets it again with a 300ms delay. The double-set is harmless but noisy — `transitionTo` also calls `window.scrollTo`, which is the real reason it's there. Consider renaming or splitting the concerns: one call to reset atoms, one call for the scroll/animation.

---

**🟡 `SCREENTIME_MAX_FILES` defined inside the component render**  
`src/features/discovery-flow/ui/DataUploadHub.tsx:357`

```ts
const SCREENTIME_MAX_FILES = 4
```

This constant is declared inside the `DataUploadHub` component body (not at module level), so it's re-created on every render. Move it to module scope alongside `INSTANT_SOURCES` and `DEEP_SOURCES`.

---

**🟡 `adaptiveData` read twice in upload route's `adaptive` case**  
`src/app/api/discovery/upload/route.ts:330-345`

The `adaptive` case does a second DB `.select()` inside the switch to read `adaptiveData` for appending. Combined with the session existence check at line 161, this is three DB round-trips for a single upload request. Pass `adaptiveData` in the initial session select (line 161), scoping it to the fields needed.

---

**🟡 `handleRequestResults` silently continues on adaptive API failure**  
`src/app/start/start-client.tsx:99-115`

```ts
if (adaptiveRes.ok) {
  // use follow-ups
}
// No follow-ups (or adaptive failed) — go straight to analysis
await runAnalysis()
```

If the adaptive endpoint returns 500, the code falls through to `runAnalysis()` without logging or notifying the user. This is intentional degradation, which is fine, but the comment says "adaptive failed" — the user never knows. If you want to keep silent fallback, at minimum log the failure. If adaptive follow-ups are important to results quality, surface a non-blocking notice.

---

**🟡 `AdaptiveFollowUp` doesn't submit question answers to the server**  
`src/features/discovery-flow/ui/AdaptiveFollowUp.tsx:206-266`  
`src/features/discovery-flow/model/atoms.ts:47-50`

`QuestionCard` stores answers in `adaptiveAnswersAtom` (localStorage), but when the user clicks "Generate my results", `onComplete` just calls `runAnalysis()` in the parent — it never sends the question answers to the server. The `adaptiveAnswersAtom` is written but never read in any API call. Question follow-up answers are silently dropped and never reach the analysis.

If question answers are intentionally excluded from the analysis, remove `adaptiveAnswersAtom` and the atom write in `QuestionCard`. If they should be included, add a submission step before `runAnalysis()`.

---

**🟡 `AdaptiveFollowUp` type conflict with `AdaptiveFollowUpItem`**  
`src/server/discovery/adaptive.ts:5-12`  
`src/features/discovery-flow/model/atoms.ts:32-40`

`AdaptiveFollowUp` (server) and `AdaptiveFollowUpItem` (client atom) are two separate type definitions for the same concept with slightly different shapes. Server type has `accept?: string`; client atom type does not. The API route converts between them implicitly. These should share a single type definition — either in `parsers/types.ts` or a shared types file — and re-exported where needed.

---

**🟡 `parseGoogleTakeout` has no per-file JSON parse error handling**  
`src/server/discovery/parsers/google-takeout.ts:29, 43`

```ts
const raw: unknown = JSON.parse(await entry.async('string'))
```

If any JSON file inside the ZIP is malformed, the entire `parseGoogleTakeout` call throws and the upload route returns a 422. A malformed search history file from a partially-downloaded export would silently kill a Google Takeout upload. Wrap per-file parsing in try/catch and skip invalid files rather than aborting the whole parse.

---

**🟡 `DataUploadHub.handleFile` races on `prevCount`**  
`src/features/discovery-flow/ui/DataUploadHub.tsx:393-397`

```ts
const prevCount = sources[platformId]?.uploadCount ?? 0
setSources((prev) => ({
  ...prev,
  [platformId]: { ...prev[platformId], status: 'uploading', uploadCount: prevCount },
}))
```

`prevCount` is captured from the render closure before the first `setSources`. If two uploads for the same `platformId` are started in rapid succession (the screentime source allows 4), `prevCount` will be stale for the second call. Use the functional updater to read `prev[platformId]?.uploadCount` inside the setter instead.

---

### Nits

**💭 `isResuming` condition is overly complex**  
`src/app/start/start-client.tsx:40`

```ts
const isResuming = sessionId !== null && phase !== 'profile'
```

Clean enough, but it means the resume banner shows even on the `results` phase. A user who completed the flow and comes back sees "picking up where you left off" on their finished results. Consider `phase === 'data' || phase === 'adaptive'` for the banner condition.

---

**💭 Magic numbers for animation delay multiplication**  
`src/features/discovery-flow/ui/DataUploadHub.tsx:470`, `src/features/discovery-flow/ui/AnalysisResults.tsx:143`

Animation delay calculations like `0.2 + i * 0.15` and `0.3 + i * 0.1` are inline magic numbers. They work fine but are scattered across multiple files. Consider a shared `staggerDelay(i, base, step)` utility or CSS custom properties if this pattern grows.

---

**💭 `handleNotifySubmit` has no error state shown to user**  
`src/features/discovery-flow/ui/AnalysisResults.tsx:84-102`

The `catch` block is `// silently fail`. If the `/api/subscribe` call fails, the "Notify me" button reverts to enabled but nothing tells the user their email wasn't saved. Add a minimal error message (even just "Something went wrong, try again").

---

**💭 OG image has hardcoded `'1200'` string for width**  
`src/app/start/[id]/og/route.tsx:36`

```ts
width: '1200',
```

`ImageResponse` expects `width` as a number. This is a string. It may work due to CSS coercion in the satori renderer but is technically incorrect — use `1200` (number).

---

**💭 `INSTRUCTION_MAP` callable values are inconsistently typed**  
`src/features/discovery-flow/ui/DataUploadHub.tsx:328-338`

```ts
const INSTRUCTION_MAP: Record<string, () => ReactNode> = { ... }
```

The values are React components (capitalized, no-arg functions returning JSX), but the type says `() => ReactNode`. At line 481 they're invoked as `<InstructionComponent />` which is correct JSX usage, but the map type implies they could be called as plain functions too. Use `React.FC` or `ComponentType` to make the intent explicit.

---

**💭 `AGE_BRACKET_OPTIONS` includes `'30+'` but session schema stores no upper bound**  
`src/features/discovery-flow/ui/QuickProfile.tsx:32`

The age bracket options are `['16-20', '21-25', '26-30', '30+']`. The `30+` value is unbounded, which is fine for a label, but if this is ever used for bucketing or cohort analysis it's ambiguous. No action needed now, just keep in mind if analytics are added.

---

## Untested Paths Worth Noting

- What happens if `parseChatGptExport` receives a ZIP with a `conversations.json` that is valid JSON but not an array of conversations (e.g., it's an object)? The `!Array.isArray(raw)` check throws — good — but the error message blames "valid ChatGPT export" even if it's a different malformed format.
- The `adaptive` case in the upload switch has no test for what happens when `appName` is provided but empty string — `resolveAdaptiveSourceType('')` returns `'subscriptions'` because `lower.includes(...)` always fails on empty string. This is fine but worth documenting.
- The `runAnalysis` function in `start-client.tsx` sets `setAnalyzing(false)` in both the success and error paths but not in a `finally` block. If an unexpected exception propagates (not caught by the inner try/catch), `analyzing` stays `true` forever and the UI is stuck on the spinner.
