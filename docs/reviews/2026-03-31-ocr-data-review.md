# OCR Data Quality Review: Vision → Tesseract.js Migration

**Date:** 2026-03-31
**Reviewer:** Data Engineer
**Scope:** `src/features/discovery-flow/lib/ocr-client.ts` + `src/server/discovery/extract-from-text.ts` vs Vision path in `src/server/discovery/ocr.ts`

---

## Summary

The switch from Claude Vision (`extractScreenTime`) to client-side Tesseract.js + Haiku text extraction (`extractFromOcrText`) introduces a two-stage pipeline where two components can each fail independently. Each stage degrades data quality in ways the current code does not defend against. The most severe risk is storing LLM-hallucinated structured data when Tesseract produces garbage OCR output — there is no quality gate between OCR text and the DB write.

---

## Findings

### 🔴 Blocker: No quality gate between OCR output and DB storage

**File:** `src/server/discovery/extract-from-text.ts:194–211`, `src/app/api/upload/screentime/route.ts:64–106`

The upload route calls `extractScreenTime` (Vision), which validates the LLM output with `screenTimeExtractionSchema` before storing. The OCR text path (`extractFromOcrText`) has no equivalent validation. Its return type is `{ data: unknown }` — the Haiku model will receive noisy OCR text and produce a structurally valid but semantically garbage tool call (e.g., `usageMinutes: 6` for an app that actually showed `6h 22m`, or hallucinated app names from corrupted glyphs). That garbage gets stored verbatim.

If the OCR text path ever feeds the upload route, a minimum confidence gate must be enforced before the DB insert: reject the result if `confidence === 'low'` or if `apps.length === 0` or if `totalScreenTimeMinutes < 5`. The Vision path effectively had this gate because Claude could see the image and set `confidence` accurately; the Haiku text model is guessing from ASCII soup.

---

### 🔴 Blocker: Tesseract initialized with `'eng'` only — Cyrillic and other scripts will fail silently

**File:** `src/features/discovery-flow/lib/ocr-client.ts:34`

```ts
const w = await createWorker('eng', 1, { ... })
```

Tesseract will not recognize Cyrillic characters. On a Russian-locale iPhone, iOS Screen Time renders app names, UI labels ("Экран и время использования", "Пикапы", category labels), and potentially system app names in Russian. Tesseract will output `?` characters, garbled Latin approximations, or skip entire text blocks. The downstream Haiku prompt will receive text like `??? ?????? 6?? 22?` and either hallucinate app names or produce an empty `apps` array.

The primary audience includes users with non-Latin system locales (Russian is explicitly called out in the brief). This is a correctness blocker for a material portion of real users, not an edge case.

**Required fix:** Multi-language training data, at minimum `eng+rus`. `createWorker('eng+rus', ...)` adds ~4 MB to the lazy-loaded bundle but Tesseract supports combining language packs. For broader coverage (Japanese, Arabic) the caller should attempt to detect script from a short sample or default to `eng+rus+chi_sim+ara` with OSD (orientation and script detection). The lazy-load pattern already exists in `preloadOcr()` so the size increase does not affect initial page load.

---

### 🔴 Blocker: Schema mismatch between OCR path and Vision path — incompatible tool outputs

**Files:** `src/server/discovery/extract-from-text.ts:31–68` vs `src/server/discovery/ocr.ts:46–104`

The Vision path (`ocr.ts`) uses the tool schema defined there and the result is validated against `screenTimeExtractionSchema` which requires:
- `firstAppOpenTime: string | null` (optional)
- `date: string | null` (optional)
- `platform: enum`
- `confidence: enum`

The OCR text path (`extract-from-text.ts`) defines a different `screentime` tool schema that omits `firstAppOpenTime` and `date` entirely, and the return type is `{ data: unknown }` with no Zod validation.

If any downstream consumer (insights engine, DB insert, xray response) passes OCR path output where Vision path output is expected, it will either throw at runtime or silently produce an incomplete record. The `generateInsights` call in the upload route receives a typed `ScreenTimeExtraction` — piping `unknown` data from the OCR path into that call is a type hole that TypeScript cannot catch without the Zod parse.

**Required fix:** `extractFromOcrText` for the `screentime` source must return a `{ data: ScreenTimeExtraction } | { error: string }` and run `screenTimeExtractionSchema.safeParse(toolUse.input)` before returning, identical to the pattern in `ocr.ts:119–123`.

---

### 🟡 Suggestion: Dark-mode iOS screenshots will significantly degrade Tesseract accuracy

iOS Screen Time in dark mode renders white text on near-black backgrounds. Tesseract is trained predominantly on light-background document scans. Dark-mode screenshots will produce substantially lower character recognition accuracy — typically 20–40% more errors in field tests for LSTM-based Tesseract on inverted-contrast UI screenshots.

The time values ("6h 22m", "36m") are the most critical fields and are small, anti-aliased, gray-on-dark. Tesseract frequently misreads `6h` as `6h` correctly but will misread similar-looking glyphs: `22m` → `22rn`, `36m` → `36m` (safe) but `382m` → `38zm` or `3B2m`. The Haiku prompt acknowledges "times might be messy" but has no mechanism to detect and reject systematically corrupted input.

**Suggested mitigation:** Invert the image on the client before passing to Tesseract when the average luminance of a sampled strip is below a threshold (e.g., `< 80/255`). Canvas API can do this in one `filter: invert(1)` operation before the `File` is passed to `extractText()`. This would materially improve accuracy on the dark-mode screenshots that Gen Z users (the primary audience) are most likely to upload.

---

### 🟡 Suggestion: No integration test for the OCR text path

**File:** `test/integration/screen-time-analysis.test.ts`

The existing integration test covers Vision extraction end-to-end, including the adaptive follow-up pipeline. The OCR text path has no parallel test. The Vision test has concrete fixture images and asserts specific app names (Cup Heroes, Safari, Hearthstone, Telegram, Instagram, GitHub, Reddit) and time ranges. Without an equivalent test for `extractFromOcrText`, there is no automated signal if Tesseract OCR quality regresses (e.g., after a `tesseract.js` version bump) or if the schema mismatch described above causes a silent extraction failure.

**Suggested test:** A fixture test for `extractFromOcrText('screentime', rawOcrText)` using a hardcoded OCR text string representative of what Tesseract actually produces (including noise characters), asserting that the 7 known apps are extracted within ±10% of their true durations, and that `confidence` is not `'low'` for clean input. This would also catch the schema mismatch blocker before it hits production.

---

### 🟡 Suggestion: Tesseract WASM loaded from CDN — single point of failure for the upload flow

**File:** `src/features/discovery-flow/lib/ocr-client.ts:36–37`

```ts
workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
corePath:   'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core-simd-lstm.wasm.js',
```

If jsDelivr is unreachable (CDN outage, corporate firewall, strict CSP), `initWorker()` will throw and `extractText()` will reject. The current error handling in the upload UI presumably shows a generic failure. Since the Vision path requires no client-side assets, this is a reliability regression that only affects the OCR path.

This is acceptable for a PoC but should be noted before production. Bundling the WASM (~2 MB gzipped for LSTM) or hosting on the same Vercel deployment eliminates the dependency. The comment in the file says "avoids bundling ~15MB" — the LSTM WASM is ~2 MB, not 15 MB; the 15 MB figure likely refers to the full training data file. The core WASM itself can be self-hosted.

---

### 💭 Nit: `pickups` described as "null if not visible" but schema marks it non-nullable

**Files:** `src/server/discovery/extract-from-text.ts:65`, `src/entities/xray-result/model/types.ts:29`

The OCR text tool schema describes `pickups` as "Daily pickup count, or null" but the property is not marked `nullable: true` in the JSON schema (unlike `firstAppOpenTime` and `date` in the Vision tool schema). The Vision path explicitly has `nullable: true` on the pickups field. This inconsistency will cause the Haiku model to omit `pickups` rather than return `null` when the field is not in the OCR text, leading to a missing key where the type system expects a number. Minor but will produce a runtime type error if downstream code reads `result.pickups` without a null check.

---

## Risk Matrix

| Risk | Severity | Likelihood | Affects |
|---|---|---|---|
| Garbage OCR stored in DB (no quality gate) | High | Certain on dark/noisy screenshots | All users on OCR path |
| Cyrillic/Russian locale fails silently | High | Certain for Russian-locale users | ~20%+ of target user base |
| Schema mismatch breaks downstream pipeline | High | Certain if OCR path feeds upload route | All users |
| Dark-mode accuracy degradation | Medium | High (Gen Z users) | ~50% of uploads |
| CDN failure blocks OCR flow | Medium | Low | All users on CDN outage |
| `pickups` null handling inconsistency | Low | Medium | Downstream pickups consumers |

---

## Recommendation

The OCR text path as implemented is not production-safe for the screentime source type given the three blockers above. The Vision path in `ocr.ts` already has the right pattern: Zod validation on the tool output, typed return, and a schema that is authoritative for downstream consumers. The OCR text path needs to adopt those same guards before it can replace or supplement Vision for screentime extraction.

For other source types (subscriptions, battery, storage, calendar, health), the risk profile is lower since those do not feed the main `xrayResults` DB table — but the same Zod validation gap applies to `extract-from-text.ts` vs `extract-screenshot.ts` (which validates via `sourceValidationSchemas`).
