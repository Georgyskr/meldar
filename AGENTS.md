# Engineering Standards

Rules for AI agents and human developers working on this codebase. These are non-negotiable — violations cause production bugs.

## React

### Event Handler Props
Never pass a function with optional parameters directly as a callback prop.

```tsx
// BAD — MouseEvent leaks as first argument
<Component onSkip={runAnalysis} />

// GOOD — arrow function prevents event leak
<Component onSkip={() => runAnalysis()} />
```

This applies to ALL `on*` props where the handler accepts optional parameters.

### Server vs Client Components
- Default to Server Components. Only `"use client"` when interactive behavior requires it.
- Split: Server parent + Client child when both data fetching and interactivity are needed.

## Testing

### E2E (Playwright)
- **Run against production build** (`pnpm build && pnpm start` on port 3001). Turbopack dev server has MIME type bugs that prevent JS hydration in headless browsers.
- **Zero `waitForTimeout`.** Every wait is condition-based: `waitForSelector`, `waitForResponse`, `expect(locator).toBeVisible()`.
- **No `{ force: true }` clicks.** If something blocks the element, fix the blocker.
- **No `.catch(() => false)`** on visibility checks. Let errors surface.
- **Use `page.addInitScript`** for localStorage setup (cookie consent, Jotai state reset).
- **Use `data-testid`** on key interactive elements. Prefer over text-based selectors.

### Unit Tests (Vitest)
- Mock Anthropic API with `vi.hoisted()` + `vi.mock('@anthropic-ai/sdk')`.
- Real JSZip (don't mock) — construct test ZIPs programmatically.
- Parsers that throw must be mocked with `mockRejectedValue`, not `mockResolvedValue`.
- `// @vitest-environment jsdom` for tests needing localStorage.

## AI Pipeline

### Validate ALL AI Output
```typescript
// BAD — unsafe cast, malformed output silently persists
const result = toolUse.input as AnalysisOutput

// GOOD — Zod validates, rejects bad data
const parsed = analysisSchema.safeParse(toolUse.input)
if (!parsed.success) throw new Error('Invalid AI output')
```

### Regex Shortcuts Must Preserve Downstream Fields
When skipping an AI call (e.g., regex extraction is sufficient), the output must include ALL fields the downstream pipeline expects. If the insight engine needs `category`, the regex path must provide it via a static lookup table — not `'utility'` for everything.

### Raw Data Never Stored
User messages from ChatGPT/Claude/Google exports are extracted into structured topics via Haiku, then discarded. Only the structured output (topic counts, patterns) is stored in the database.

### Client-Side OCR First
Tesseract.js runs in the browser. If OCR succeeds (text > 20 chars, confidence > 70%), send text to Haiku text model ($0.0003/call). If OCR fails, fall back to Vision API ($0.003/call). Image never leaves the device when OCR works.

## Code Review Process

### Post-Implementation Review
Code written AFTER a review cycle is unreviewed code. TDD passing does not mean reviewed. Always run a focused review on post-cycle additions — especially data pipeline changes.

### AI Engineer in Pipeline Reviews
Structural reviewers (code quality, security, performance) miss semantic bugs (wrong categories, missing downstream fields). Include the AI Engineer persona in any review touching parsers, extractors, or analysis prompts.

## Data Privacy

- GA loads only after cookie consent.
- Cookie consent stored in localStorage as a JSON record.
- GDPR 30-day auto-purge via Vercel cron (`/api/cron/purge`).
- Company: ClickTheRoadFi Oy, Finnish DPA jurisdiction.
