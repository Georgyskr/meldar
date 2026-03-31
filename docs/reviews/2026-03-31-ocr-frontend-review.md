# OCR Frontend Review — 2026-03-31

**Reviewer:** Frontend Developer  
**Scope:** Client-side Tesseract.js integration, bundle impact, UX, memory, CDN, error handling, accessibility

---

## Summary

The architecture is sound: lazy `import()` in `initWorker` achieves real code-splitting, preload timing is well-intentioned, and the fallback to raw file send is logical. However, several issues range from data-loss risk to silent failures that will hurt real users on slow connections or edge cases. The preload-race and worker-leak are the two blockers.

---

## What's Good

- Dynamic `import('tesseract.js')` inside `initWorker` (`ocr-client.ts:33`) genuinely code-splits Tesseract out of the main bundle — users who never reach the upload step never pay the cost.
- The `loadingPromise` deduplication pattern (`ocr-client.ts:16`, `44–48`) correctly prevents double-initialization on concurrent calls.
- Preloading during quiz (`QuickProfile.tsx:69–71`) is the right UX strategy; it exploits the quiz's ~60s dwell time.
- `isOcrReady()` guard (`DataUploadHub.tsx:409`) cleanly enables the file-only fallback without user-visible errors.
- Upload status state machine (`idle → uploading → processing → done/error`) gives the user consistent feedback across all sources.
- `aria-label` on every hidden file `<input>` (`UploadCard.tsx:244`, `323`; `AdaptiveFollowUp.tsx:122`) is correct.

---

## Issues

### Blockers

**🔴 Worker is never terminated — memory leak on long sessions**

`ocr-client.ts` creates a Tesseract worker (`createWorker` at line 34) and stores it in a module-level `worker` variable. There is no `worker.terminate()` call anywhere. Tesseract workers hold a WASM heap (typically 64–256 MB) plus a Web Worker thread. On a phone with a long session — quiz → uploads → results — this memory is never released.

Fix: export a `terminateOcr()` function and call it from a `useEffect` cleanup in the component that owns the upload phase, or after the last upload completes.

```ts
// ocr-client.ts — add:
export async function terminateOcr(): Promise<void> {
  if (worker) {
    await worker.terminate()
    worker = null
    loadingPromise = null
  }
}
```

---

**🔴 Preload race: quiz can be completed before WASM finishes downloading**

`preloadOcr()` fires on mount of `QuickProfile` (`QuickProfile.tsx:69–71`). The quiz has 5 steps but step 0 (occupation) auto-advances on tap with a 300 ms delay (`QuickProfile.tsx:105`). A user who has pre-filled nothing but clicks rapidly through all 5 steps can reach the upload phase in under 5 seconds. On a slow 3G connection (WASM is ~2 MB + training data ~4 MB), that is nowhere near enough time.

When `isOcrReady()` is `false`, `DataUploadHub.tsx:409` silently falls back to sending the raw image file (`formData.append('file', file)`). The server must then handle raw images, which may not be expected for image-type sources — but more importantly, **the user receives no indication that OCR was skipped**. If the server-side path for raw images is not implemented, the upload will silently fail or return incorrect data.

This is a silent degradation with no observable signal. Fix options:
1. During OCR (when `!isOcrReady()` and the worker is still loading), await the `loadingPromise` before proceeding — add a small "Preparing scanner..." step in the UI while the promise resolves.
2. Or, on the upload trigger, explicitly check `loadingPromise` and show a loading state instead of silently falling back.

The current code in `getWorker()` (`ocr-client.ts:44–49`) will correctly await a still-loading worker, but `DataUploadHub.tsx:409` calls `isOcrReady()` (which checks `worker !== null`) instead of awaiting the worker — so a mid-load state returns `false` and skips OCR entirely rather than waiting.

---

### Suggestions

**🟡 CDN paths reference tesseract.js@5 but the package is v7**

`ocr-client.ts:36–37`:
```ts
workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
corePath:   'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core-simd-lstm.wasm.js',
```

`package.json` has `"tesseract.js": "^7.0.0"`. Pinning CDN paths to `@5` while using v7 locally means the WASM binary and the JS wrapper are from different major versions. This will produce runtime errors in Tesseract's internal worker<>main thread protocol, which changed between v5 and v7. This has likely not been caught because the OCR fallback (`!isOcrReady()`) silently hides initialization failures.

Fix: match the CDN version to the installed package version, or remove the custom `workerPath`/`corePath` and let Tesseract v7 self-host from the npm package (it bundles worker assets).

---

**🟡 OCR errors are silently swallowed — no user feedback**

`DataUploadHub.tsx:396–458`: `handleFile` does `await extractText(file)` without a try/catch around the OCR step specifically. If Tesseract throws (WASM crash, recognition failure, OOM), the error propagates to the outer `catch` at line 449, which sets `errorMessage: 'Connection failed. Try again.'`. This is misleading — the connection was fine; the OCR failed client-side.

More critically, if OCR produces empty text (`data.text` is `""` for a blurry or non-screen-time screenshot), the empty string is sent as `ocrText` and the server will receive no usable data. There is no guard for empty OCR output.

Fix: check `ocrText.trim().length > 0` before sending; if empty, fall back to sending the raw file with a distinct `formData` flag, or surface a user-facing message.

---

**🟡 `AdaptiveFollowUp` screenshot uploads bypass OCR entirely**

`AdaptiveFollowUp.tsx:33–44`: `ScreenshotCard.handleFile` always sends `formData.append('file', file)` — it never calls `extractText`. The follow-up screenshots are the same type of image (phone screen) as the main uploads, so the server must handle raw images here anyway. But this creates an inconsistency: main uploads send OCR text when ready, follow-ups always send raw files. The server's `/api/discovery/upload` handler presumably has two code paths; it's worth confirming that both work, and documenting the design intention.

If OCR is intentionally skipped in follow-ups (to keep the component simple), add a comment. If it should apply, thread `extractText` through the same way as `DataUploadHub`.

---

**🟡 No CSP policy accommodating jsdelivr CDN**

Fetching WASM from `cdn.jsdelivr.net` at runtime requires `script-src cdn.jsdelivr.net` and `connect-src cdn.jsdelivr.net` in the Content Security Policy. If Vercel's default CSP headers are set anywhere (middleware, `next.config`), or if they are added later, these CDN requests will silently fail. There is no fallback if the CDN is unavailable (no `try/catch` around `initWorker`).

Check `next.config` and any Vercel header config for CSP. If no CSP is currently set, document this constraint so it doesn't become a surprise later.

---

**🟡 Progress bar is stuck at 60% during OCR**

`UploadCard.tsx:198`: `width: progress != null ? \`${progress}%\` : '60%'`. The `progress` prop is never passed from `DataUploadHub.tsx:483–499` — it's always `undefined`, so the bar sits at 60% for the entire duration of OCR + upload. OCR on a screenshot can take 3–15 seconds on a mid-range phone. Users have no indication whether they are waiting 2 more seconds or 30 more seconds.

Fix: drive `progress` from OCR stages. Tesseract v7 supports a `logger` callback in `createWorker` options that emits `{ status, progress }` events. Wire these through to update the `uploadStatusAtom` with a numeric progress value.

---

**🟡 `SCREENTIME_MAX_FILES = 4` constant defined inside the component body**

`DataUploadHub.tsx:358`: `const SCREENTIME_MAX_FILES = 4` is declared inside `DataUploadHub`. This is a compile-time constant and should be at module scope alongside the `INSTANT_SOURCES` / `DEEP_SOURCES` arrays to avoid it being re-evaluated on every render and to make it easier to find.

---

### Nits

**💭 `isOcrReady()` is a misleading name for the mid-load case**

`ocr-client.ts:28–30`: `isOcrReady()` returns `false` both when preload hasn't started and when the WASM is actively downloading. Callers cannot distinguish "not started" from "loading". Rename to `isWorkerInitialized()` or expose a third state like `getOcrState(): 'idle' | 'loading' | 'ready'` so `DataUploadHub` can show "OCR warming up..." rather than silently falling back.

---

**💭 `initWorker` failure leaves `loadingPromise = null` without setting `worker`**

`ocr-client.ts:32–42`: if `createWorker` throws, the function rejects. `loadingPromise` is set to `null` only on success (line 40). But `loadingPromise` is assigned before the await (line 17), so a rejection leaves `loadingPromise` pointing to a rejected promise. A subsequent call to `preloadOcr()` will see `loadingPromise !== null` and short-circuit, then any `getWorker()` call will re-await that rejected promise. Wrap `initWorker` in error handling that resets `loadingPromise = null` on failure so retry is possible.

---

**💭 `UploadCard` toggle button missing `aria-expanded`**

`UploadCard.tsx:361–385`: the "How to export" toggle button controls a collapsible section. It should have `aria-expanded={showGuide}` and `aria-controls` pointing to the instructions container's `id`. Currently screen readers cannot announce the expanded/collapsed state.

---

**💭 `handleFileChange` in `UploadCard` resets the input immediately — prevents re-selecting the same file**

`UploadCard.tsx:52–56`:
```ts
function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0]
  if (file) onFile(file)
  if (e.target) e.target.value = ''
}
```

Resetting value immediately is correct for allowing re-selection of the same file. However, since `onFile` is async in the parent and the ref is shared between the "Upload" and "Add more" labels (both use the same `fileRef` at lines 239 and 319), there is potential for the second label to be rendered while the input is mid-reset. Low risk in practice since they are never shown simultaneously, but worth noting.

---

## Bundle Size Assessment

`tesseract.js@7` is not tree-shakeable in any meaningful sense — the entire library is one runtime. The dynamic `import()` in `ocr-client.ts:33` does code-split it into a separate chunk. The WASM binary (~2 MB) and training data (~4 MB) are fetched at runtime from jsDelivr, not bundled. So the bundle impact is:

- **Main bundle:** ~0 bytes from Tesseract (dynamic import)
- **Lazy chunk:** ~80–120 KB (Tesseract JS wrapper, minified)  
- **Runtime fetch:** ~6 MB total (WASM + training data), cached after first load

This is acceptable given the CDN-hosted WASM strategy. The v5/v7 version mismatch (see above) may cause the CDN assets to fail to load at all, which would make the ~120 KB lazy chunk useless.
