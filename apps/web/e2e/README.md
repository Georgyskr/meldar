# E2E Tests

Playwright tests against a real production build (`pnpm build && pnpm start`) of the web app.

## Running

```bash
pnpm test:e2e           # default suite — fast, deterministic, runs in CI
pnpm test:e2e:nightly   # real-LLM integration suite — expensive, runs nightly only
pnpm test:e2e:ui        # Playwright UI mode for debugging
```

## Split

### Default (`test:e2e`)

Everything except `@nightly`-tagged tests. Completes in ~2-3 minutes. Safe to run on every push.

Covers: API smoke tests, landing page, onboarding funnel, SSE capture, workspace empty state, workspace reload recovery.

### Nightly (`test:e2e:nightly`)

Tests tagged `@nightly`. These hit real infrastructure (Anthropic LLM, Vercel, Neon DB) and can take 5-10 minutes. They're flaky by nature (real LLM latency is variable) and are not suitable for blocking merges.

Current nightly tests:
- `core-flow.spec.ts` — full signup → onboarding → real LLM build → preview DOM verification → admin → settings. Two serialized Anthropic calls (auto-build + beacon-build), 5-7 min typical.

Tag new tests with `@nightly` when they:
- Make real LLM calls end-to-end
- Take longer than ~30s typical
- Are structurally flaky due to upstream variance (LLM, Vercel deploys, etc.)

## Conventions

- **No per-test `test.setTimeout(N)`**. Single timeout ceiling lives in `playwright.config.ts` (`timeout`, `expect.timeout`, `actionTimeout`, `navigationTimeout`).
- **No per-assertion `{ timeout: N }`** in spec files. If an assertion needs longer than the config ceiling, the test is structurally wrong — split it, not the timeout.
- **Plain `.toBeVisible()`, `.toBeHidden()`, `.waitForURL()`** — let config-level budgets handle the waits.

## Rate limiting

E2E runs set `DISABLE_RATE_LIMIT=1` in `playwright.config.ts`'s `webServer.env`, bypassing `checkRateLimit()` so repeated runs don't trip the registration/login IP-based limits. This flag is **test-only** — production deployments must never have it set.

## Auth

Tests use `injectAuthCookie(page)` (see `core-flow.spec.ts`) to mint a JWT directly via the DB, bypassing the sign-in UI. Requires `AUTH_SECRET` in `.env.local`.
