# OCR Database Review — 2026-03-31

Reviewer: Database Optimizer
Scope: How the OCR text path affects DB operations in `upload/route.ts`

---

## Summary

The OCR text path is clean from a database perspective. No new query patterns introduced, no raw OCR text persisted, and the write path is structurally identical to the Vision path. One shape mismatch between the OCR and Vision extractors for `screentime` is a latent risk worth addressing.

---

## Findings

### 🟡 Shape mismatch on `screenTimeData` between OCR and Vision paths

**File:** `src/server/discovery/extract-from-text.ts` vs `src/server/discovery/ocr.ts`

The Vision extractor (`ocr.ts`) uses `screenTimeExtractionSchema` (Zod) and enforces:
- `firstAppOpenTime` (nullable string)
- `date` (nullable string)
- `error` field (enum, stripped before storage)

The OCR text extractor (`extract-from-text.ts`) uses a looser tool schema and does **not** request `firstAppOpenTime` or `date`. The output stored in `screenTimeData` will be missing those fields on the OCR path.

Downstream, `analyze/route.ts` casts `screenTimeData` directly to `ScreenTimeExtraction` with no validation:

```ts
screenTime: session.screenTimeData as ScreenTimeExtraction | undefined,
```

`insights.ts` and `analyze.ts` only access `apps`, `totalScreenTimeMinutes`, `pickups`, and `platform` — so the missing `firstAppOpenTime`/`date` fields don't cause a runtime crash today. But if any future code reads those fields from JSONB (e.g. for a "first thing you opened" insight), the OCR path will silently return `undefined` while Vision returns `null`. That's the kind of shape divergence that bites you in a night deploy.

**Recommendation:** Either add `firstAppOpenTime` and `date` to the OCR tool schema (as nullable), or add a Zod parse of `screenTimeExtractionSchema` before storing on the OCR path, the same way the Vision path does. Matching shapes prevents JSONB becoming a bag of surprises.

---

### 💭 No schema validation on OCR extraction output before storage

**File:** `src/server/discovery/extract-from-text.ts` line 211

```ts
return { data: toolUse.input }
```

The Vision path validates with `screenTimeExtractionSchema.safeParse(input)` before returning. The OCR path returns the raw tool input with no Zod guard. If Haiku hallucinates a bad value (e.g. `usageMinutes: "36m"` as a string instead of a number), it lands in JSONB and only fails at read time — probably silently.

This is low risk today since Haiku reliably follows tool schemas, but the asymmetry is worth noting.

---

### OCR text is not stored — confirmed clean

`ocrText` is read from `formData` and passed to `extractFromOcrText()` but never placed in `updateData`. Only the structured extraction result (`result.data`) reaches the DB. No PII concern here.

---

### Query patterns unchanged — confirmed

The OCR path follows the exact same DB flow as the Vision path:

1. `SELECT id, sourcesProvided` — idempotency check (already existed)
2. `UPDATE discoverySessions SET screenTimeData = ..., sourcesProvided = array_append(...)` — same write

No new queries, no extra round-trips, no N+1 introduced. The `adaptive` platform's atomic JSONB append (`COALESCE ... || ::jsonb`) is also used correctly for both Vision and OCR on that branch.

---

### Data size — acceptable

OCR text input is capped at 50,000 characters (line 232 of `upload/route.ts`). The Haiku extraction output for `screentime` is a JSON object with an apps array — realistically 20-50 apps × ~50 bytes each ≈ 1-3 KB. This is well within normal JSONB range and matches Vision extraction output size. No concern.

---

## Verdict

One shape mismatch to fix before adding any code that reads `firstAppOpenTime` or `date` from `screenTimeData`. Everything else is solid — the OCR path is a well-scoped addition that doesn't touch query patterns or leak raw text into the DB.
