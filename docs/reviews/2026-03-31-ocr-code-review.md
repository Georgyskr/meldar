# OCR Feature Code Review — 2026-03-31

Reviewer: Code Reviewer agent
Scope: client-side OCR pipeline (Tesseract preload → text extraction → server-side Haiku analysis)

---

## `src/features/discovery-flow/lib/ocr-client.ts`

### 🔴 Race condition between preload and first upload

`isOcrReady()` returns `worker !== null`. But `preloadOcr()` sets `loadingPromise` and only sets `worker` after `initWorker()` resolves. The window between these two is 2–5 seconds (WASM download). During that window:

- `isOcrReady()` → `false`
- `handleFile` in DataUploadHub falls back to sending the raw file

This is the intended fallback path, but users who upload immediately after the quiz (before WASM is cached) silently lose the cheap-path optimization and pay Vision API cost instead. There is no observable problem, but the comment in `preloadOcr()` ("ready by upload phase") overpromises — it is only true if loading completes before the user acts.

No fix required if the Vision fallback is acceptable. If you want to surface this: expose a `waitForOcr(): Promise<void>` that returns `loadingPromise ?? Promise.resolve()` and await it in the upload handler. That would eliminate the race entirely and remove `isOcrReady()` from the public surface.

### 🟡 `isOcrReady()` is effectively unused as a correctness check

`DataUploadHub.tsx:409` — `isOcrReady()` is used as a branch condition, but the only consequence of it returning `false` is the raw-file fallback (which works). This means `isOcrReady()` is a performance hint, not a safety check. The name implies a readiness gate that blocks bad behavior; that is misleading. Rename to `isOcrCached()` or add a comment clarifying its purpose.

### 🟡 Module-level singleton state — no cleanup or termination

`worker` is module-level and lives for the entire browser session. Tesseract workers hold Web Workers open. There is no `terminateOcr()` export. This is fine for a single-page app where the user stays on the discovery flow, but if the component unmounts and remounts (e.g. SPA navigation), the stale worker is reused — which is actually correct — but there is no way to release resources if needed later. Low priority but worth noting for future memory budget work.

### 🟡 CDN URLs are hardcoded without integrity checks

`ocr-client.ts:36-37` — Fetching WASM from jsDelivr with no Subresource Integrity (SRI) hash. If the CDN is compromised or the package is updated in a breaking way (version `@5` is a floating tag), users get untrusted WASM executing in their browser. Pin to a specific version patch (e.g. `tesseract.js@5.1.1`) and ideally add SRI hashes. This is a supply-chain concern worth addressing before scale.

### 💭 `loadingPromise = null` before `worker = w`

`initWorker():39-40` — The order is `worker = w` then `loadingPromise = null`. If `getWorker()` is called concurrently between these two lines (micro-task boundary), it will find `worker !== null` and return early correctly. The order is safe but setting `loadingPromise = null` before returning `w` would be slightly cleaner (null it out as soon as you are done, not after setting worker). Not a bug.

---

## `src/server/discovery/extract-from-text.ts`

### 🔴 Schema mismatch with `extract-screenshot.ts` — same source type, different field shapes

The two extractors for the same source types produce incompatible data shapes. This is a correctness bug if downstream code (analysis, display) expects a single canonical shape:

| Source type | `extract-from-text` | `extract-screenshot` |
|---|---|---|
| `storage` | `sizeMB: number` | `size: string` (e.g. "1.2 GB") |
| `calendar` | `time: string` | `startTime: string`, `durationMinutes: number`, `category: enum` |
| `subscriptions` | `price: string`, `frequency: string` are optional (`required: ['name']`) | both are `required` |
| `health` | no `unit` required | `unit` is required |

The `storage` mismatch is the most dangerous — downstream code that expects `size: string` will get `undefined` when OCR path is used, and code that expects `sizeMB: number` will break on Vision path. These need to be reconciled into a single canonical type.

### 🔴 No input validation on `ocrText` before sending to Claude

`extractFromOcrText` receives `ocrText: string` but does not check for empty string. If Tesseract returns `""` (blank image, low-contrast screenshot), the function sends an empty user message to Claude and wastes an API call. The server route validates `ocrText.length > 50000` but has no minimum length check. Add a guard:

```ts
if (!ocrText.trim()) {
  return { error: 'No text could be extracted from the image' }
}
```

### 🔴 `Anthropic` client instantiated at module level on a server module

`extract-from-text.ts:8` — `const client = new Anthropic()` is called at module import time. In Next.js App Router, server modules are evaluated once per cold start and cached. This is fine for the key lookup, but it means if `ANTHROPIC_API_KEY` is not set at boot time, the error surfaces as a cold-start crash rather than a request-time error. `extract-screenshot.ts` has the same pattern. Consistent, so not a blocker, but both files should guard this:

```ts
function getClient() {
  return new Anthropic() // reads env at call time
}
```

Or at minimum ensure the env var is validated at startup in a central place.

### 🟡 `sourceType: string` parameter is untyped at the boundary

`extractFromOcrText(ocrText: string, sourceType: string)` — `sourceType` accepts any string. If an unknown type is passed, the function returns `{ error: 'Unknown source type: ...' }`, which is correct, but TypeScript cannot catch the mistake at the call site. The set of valid types is already expressed in `platformSchema` in the route. Extract a shared union type:

```ts
export type OcrSourceType = 'screentime' | 'subscriptions' | 'battery' | 'storage' | 'calendar' | 'health'
```

Use it in both `extractFromOcrText` and `extractFromScreenshot`. This makes mismatches a compile error.

### 🟡 Tool schema for `screentime` in `extract-from-text.ts` is less rich than `extract-screenshot.ts`'s `ocr.ts` counterpart

The `screentime` source type routes to `extractFromOcrText` when OCR text is present. The `TOOLS.screentime` schema in this file includes `apps`, `totalScreenTimeMinutes`, `pickups`, `platform`, `confidence`. But `extract-screenshot.ts` does not handle `screentime` — that route goes to `extractScreenTime` in `ocr.ts`. The `ocr.ts` Vision prompt likely extracts richer data (it was the original implementation). Verify that `extract-from-text.ts`'s screentime output shape matches what `analyze.ts` / insights expect.

### 🟡 DRY: tool schemas are duplicated across three files

`extract-from-text.ts`, `extract-screenshot.ts`, and `ocr.ts` each define their own Anthropic tool schemas for overlapping source types (subscriptions, battery, storage, calendar, health). The schemas are not identical (see mismatch finding above). A single `src/server/discovery/schemas/` directory with Zod schemas as the source of truth — from which both the Anthropic tool `input_schema` and the validation schemas are derived — would eliminate this drift. This is a refactor, not a bug fix, but the schema mismatch above is a direct consequence of this duplication.

### 💭 `max_tokens: 2000` in `extract-from-text.ts` vs `max_tokens: 1024` in `extract-screenshot.ts`

Inconsistent cap. The OCR text path allows 2x the tokens for the same extraction task. Probably fine (the text path has more to parse), but worth a comment explaining the difference.

---

## `src/app/api/discovery/upload/route.ts` (OCR changes)

### 🟡 `ocrText` bypasses file type and size validation for image platforms

`route.ts:174` — When `ocrText` is present, the entire file validation block is skipped via `if (!ocrText && file)`. This is correct (there is no file to validate), but the `ocrText` path only validates `ocrText.length > 50000` (line 232). There is no check that the claimed `platform` is actually an image platform when `ocrText` is provided. A client could POST `ocrText` with `platform=chatgpt` and bypass the ZIP requirement check, proceeding to `parseChatGptExport` without a file — which would then hit the `if (!file)` guard at line 302 and return a clean 400. Safe, but the validation logic is harder to reason about than it should be.

Consider restructuring as:

```
if (ocrText) { validate ocrText }
else if (file) { validate file based on platform }
else { 400 }
```

### 🟡 `formData.get('ocrText') as string | null` — unsafe cast

`route.ts:131` — `FormData.get()` returns `FormDataEntryValue | null` which is `string | File | null`. Casting directly to `string | null` means if a client sends a File field named `ocrText`, the cast silently succeeds and downstream code receives a `File` where it expects a string. Use:

```ts
const raw = formData.get('ocrText')
const ocrText = typeof raw === 'string' ? raw : null
```

The same pattern applies to `platform`, `sessionId`, and `appName` fields (lines 131–134 and 400).

### 💭 `const dataKey = \`${platformParsed.data}Data\` as const` (line 395)

`as const` on a template literal does nothing useful here — the type is already narrowed by the `switch` case. The `as const` just adds noise. Could be `as keyof typeof updateData` or simply removed. Not a bug.

---

## `src/features/discovery-flow/ui/DataUploadHub.tsx` (handleFile changes)

### 🟡 OCR failure is indistinguishable from upload failure to the user

`handleFile:409-411` — If `extractText(file)` throws (Tesseract crash, WASM OOM, worker terminated), the `catch` at line 449 catches it and shows "Connection failed. Try again." This is misleading — there was no connection failure. The error message should differentiate:

```ts
if (isImagePlatform(platformId) && isOcrReady()) {
  try {
    const ocrText = await extractText(file)
    formData.append('ocrText', ocrText)
  } catch {
    // OCR failed — fall back to raw file upload
    formData.append('file', file)
  }
} else {
  formData.append('file', file)
}
```

This makes the fallback explicit and keeps the user-facing error message accurate.

### 🟡 `uploadCount` is not incremented in the `uploading` state transition

`handleFile:397-402` — When entering the uploading state, `uploadCount: prevCount` is set (not `prevCount + 1`). The count only increments on success at line 440 (`newCount = prevCount + 1`). This is correct behavior, but it means `getUploadCount` during upload reflects the pre-upload count, which affects the `done` vs `error` status fallback on failure (lines 431, 453: `prevCount > 0 ? 'done' : 'error'`). The logic is self-consistent, but worth a comment since it is subtle.

### 💭 `isImagePlatform` lambda re-created on every render

`DataUploadHub.tsx:393` — `const isImagePlatform = (id: string) => ...` is declared inside the component body and recreated every render. Not a perf issue (it is a simple array search, not passed as a prop), but could be a module-level constant since `INSTANT_SOURCES` is also module-level.

---

## `src/features/discovery-flow/ui/QuickProfile.tsx` (preload useEffect)

### 💭 `preloadOcr()` in an empty-deps `useEffect` is correct

`QuickProfile.tsx:69-71` — The `useEffect(() => { preloadOcr() }, [])` is correct. `preloadOcr()` is idempotent (guards against double-init), so StrictMode double-invocation is safe. No issues.

---

## Summary

| Severity | Count | Key issues |
|---|---|---|
| 🔴 Blocker | 3 | Schema mismatch between OCR and Vision extractors for same source types; no empty-OCR-text guard before Claude call; `isOcrReady` race silently routes to Vision API |
| 🟡 Suggestion | 8 | Unsafe `FormData` casts; untyped `sourceType`; OCR error swallowed as connection error; CDN without SRI; schema duplication across 3 files |
| 💭 Nit | 4 | `loadingPromise` order, `as const` noise, `isImagePlatform` inside component, `uploadCount` subtlety |

The blockers center on one theme: the OCR and Vision paths produce non-identical data for the same source types, and no guard stops the OCR path from wasting API tokens on empty text. Fix those two before shipping to production.
