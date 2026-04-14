# 09 — Backend Architect Validation

**Reviewer:** Backend Architect
**Scope:** Onboarding + workspace build APIs, orchestrator, sandbox/prewarm, DB schema
**Date:** 2026-04-13
**Status:** SHIP with fixes (see Recommended Fixes)

---

## Files reviewed

- `apps/web/src/app/api/onboarding/route.ts`
- `apps/web/src/app/api/workspace/[projectId]/auto-build/route.ts`
- `apps/web/src/app/api/workspace/[projectId]/build/route.ts`
- `apps/web/src/server/build/run-build.ts`
- `apps/web/src/server/build/run-auto-build.ts`
- `apps/web/src/server/build/sandbox-preview.ts`
- `apps/web/src/server/sandbox/prewarm.ts`
- `packages/orchestrator/src/engine.ts`
- `packages/sandbox/src/cloudflare-provider.ts`
- `packages/db/src/schema.ts`
- supporting: `require-auth.ts`, `rate-limit.ts`, `verify-project-ownership.ts`

---

## Top 3 strengths

### 1. Defense-in-depth around concurrent builds is well engineered
The streaming-build invariant is enforced at three independent layers:

- **DB layer:** `ux_builds_project_streaming` partial unique index (`packages/db/src/schema.ts:208`) makes it physically impossible to have two streaming rows for one project. This is the authoritative gate.
- **Application pre-check:** `runBuildForUser` (`run-build.ts:106`) calls `storage.getActiveStreamingBuild` and returns `409 BUILD_IN_PROGRESS` before debiting tokens — fast-failing the common case without a wasted INSERT.
- **Schema integrity:** self-ref FK on `builds.parentBuildId` and deferrable circular FK on `projects.currentBuildId ↔ builds.id` documented in comments, emitted in hand-edited migration. Correct call — Drizzle can't express DEFERRABLE.

This is textbook: in-app guard for UX, DB constraint for correctness. Race conditions on rapid double-submit will fail loudly at the DB with a unique-violation, not corrupt state.

### 2. Token accounting ordering is correct and testable
`run-build.ts:117-129` debits tokens BEFORE starting the Anthropic stream and wraps the generator in `withTokenRefund` (`run-build.ts:306-328`) so any non-committed outcome (abort, orchestrator failure, stream error) refunds. The orchestrator itself (`engine.ts:357-381`) debits actual-spend AFTER the AI call but BEFORE `buildContext.commit()`, with an explicit comment explaining why: a post-build ceiling violation leaves HEAD untouched. This is rare to see done correctly — most builders either debit-then-hope or commit-then-debit (non-atomic).

The `CeilingExceededError` path properly fails the build context (`engine.ts:364`) and yields a typed event rather than throwing. Observability-friendly.

### 3. Sandbox auth model (HMAC with body binding + timestamp) is production-grade
`packages/sandbox/src/cloudflare-provider.ts:286-302` signs `${timestamp}.${bodyJson}` rather than a bare token. This prevents:
- Replay of a stolen header against a different payload (body is in the signed material)
- Long-tail replay (timestamp presence lets the Worker reject stale requests)

Timeout bump to 60s (`cloudflare-provider.ts:72`) is reasonable for container-cold-start reality. The 409→`SandboxNotReadyError` mapping (`cloudflare-provider.ts:243`) gives the caller a typed error class to drive retry logic, rather than string-sniffing error messages.

Also good: `start()` and `writeFiles()` validate paths via `assertSafeSandboxPath` before hitting the wire (`cloudflare-provider.ts:104, 140`), so a compromised caller can't pivot to path traversal on the Worker.

---

## Top 3 issues

### ISSUE #1 — `run-build.ts` does NOT propagate rate-limit `serviceError` to its callers (CRITICAL for chat path)
**Severity:** MEDIUM (high impact if Upstash is down, low probability)
**Location:** `apps/web/src/app/api/workspace/[projectId]/auto-build/route.ts:31-37`

The manual `/build` route correctly surfaces `serviceError` → `503` (`build/route.ts:46-63`), but `/auto-build` ignores it:

```ts
const { success: rateLimitSuccess } = await checkRateLimit(rateLimit, auth.userId, true)
if (!rateLimitSuccess) {
  return NextResponse.json(
    { error: { code: 'RATE_LIMITED', message: 'Too many builds...' } },
    { status: 429 },
  )
}
```

When Upstash is unreachable, `checkRateLimit(..., critical=true)` returns `{ success: false, serviceError: true }`. `/auto-build` will then return 429 "Too many builds" — which is a **lie to the client** and will route users to the wrong recovery UX (wait vs. retry). The manual route gets this right; the auto-build route diverges.

Asymmetry between two routes that share the same limiter is a landmine — future contributors will copy the wrong one.

### ISSUE #2 — Subdomain provisioning is non-atomic with project creation (ORPHAN RISK)
**Severity:** MEDIUM
**Location:** `apps/web/src/app/api/onboarding/route.ts:104-114`

```ts
prewarmSandbox(created.project.id).catch(() => {})

let subdomain: string | undefined
try {
  subdomain = await provisionSubdomain(created.project.id, projectName)
} catch (subErr) {
  console.error(...)
}
```

Two concerns:

1. **Silent swallow.** A failed subdomain provision is logged but the project is returned as successfully created. The client has no signal that its app has no hostname. A user who completes onboarding and lands on a broken preview will not know whether to retry, contact support, or reload.
2. **No retry / reconciliation.** Unlike `projectDomains.retryCount` (exposed in the schema at `schema.ts:502`), there is no worker/reconciler that picks up projects with missing subdomains and retries. The failure is terminal by default.

The `prewarmSandbox(...).catch(() => {})` is even worse — the error is fully silenced, not just downgraded. A prewarm that always fails in production would be completely invisible until users hit first-build latency.

### ISSUE #3 — Sandbox retry-with-prewarm can cascade failures under worker overload
**Severity:** MEDIUM-HIGH
**Location:** `apps/web/src/server/build/sandbox-preview.ts:45-52` and `packages/orchestrator/src/engine.ts:422-431`

Both code paths follow the same pattern:

```ts
try { handle = await sandbox.start(opts) }
catch (firstErr) {
  await sandbox.prewarm(projectId)   // adds load during failure mode
  handle = await sandbox.start(opts) // retry immediately
}
```

Issues:

1. **No jitter / backoff.** Two back-to-back calls during a worker outage. If the Worker is returning 500s because it is overloaded (container DO quota exhausted, e.g.), this doubles the load at the worst time. Classic retry-storm.
2. **No retry classification.** The code retries on *any* error. HMAC-auth failure, `SandboxStartFailedError` due to malformed file path, and `503` under overload are all retried identically. Auth errors especially should never retry.
3. **Double retry on the happy-after-cold-start path.** Orchestrator retries `writeFiles` after prewarm; `withSandboxPreview` *also* wraps sandbox provisioning with its own retry. Both can fire for the same build if `withSandboxPreview` runs after `orchestrateBuild` in the HTTP route's generator chain. Check `run-build.ts:157` — the `withSandboxPreview` wrapper is applied AFTER the orchestrator generator, meaning a `committed` event from the orchestrator (which already ran sandbox.writeFiles internally at `engine.ts:419-456`) will trigger ANOTHER sandbox.start in `withSandboxPreview`. That is two sandbox invocations per build with independent retry budgets.
4. **`prewarm` is "fire and forget" by design** (`cloudflare-provider.ts:94-101` silently swallows errors). Calling it between failed starts is basically a hope-and-pray; the caller gets no signal whether prewarm actually succeeded.

The 60s per-call timeout compounds this — a pathological user request can hang the Next.js request for up to 2 × 60s on the sandbox + Anthropic's wall time + storage ops. `maxDuration = 300` gives you 5 minutes; it is tight.

---

## Security concerns

### S1. SQL injection — NOT PRESENT (positive finding)
All queries use Drizzle parameterized builders (`eq`, `and`, `inArray`). No raw `sql\`\${userInput}\`` interpolation found in the reviewed surface. The one raw `sql` expression is in `verifyProjectOwnership` and uses `isNull(projects.deletedAt)` — safe.

### S2. XSS — out of scope for these routes, but one carry-forward concern
The onboarding/build routes return JSON only. However, `businessName` (`apps/web/src/app/api/onboarding/route.ts:26`) is accepted as arbitrary text up to 80 chars and stored as `projects.name`. Downstream UI that renders this as HTML (not JSX text) would be vulnerable. Schema allows any unicode. Consider a charset restriction (e.g., disallow control chars, `<`, `>`) at the API boundary. Not a backend-only fix — flag to Frontend Dev.

### S3. CSRF — weakly protected
`requireAuth` relies on the `meldar-auth` cookie (`require-auth.ts:22-28`). I could not confirm from the reviewed files whether the cookie is `SameSite=Lax|Strict` and whether mutation endpoints (onboarding POST, build POST) require a CSRF token or Origin header check. Recommend confirming:
- Cookie attributes: `SameSite=Lax`, `HttpOnly`, `Secure`, path scoped
- Explicit `Origin` check on POST routes, OR rely on `SameSite=Lax` (acceptable for non-cross-site flows since these routes don't accept GET)

If only `SameSite=Lax` is used, the login form and the build endpoints must all be POST (they are — good). But a misconfigured proxy stripping `SameSite` would re-open CSRF silently.

### S4. Authorization boundary is consistent — GOOD
`verifyProjectOwnership` is called on every workspace endpoint reviewed. The kanban-card lookup in `run-build.ts:66-73` adds a three-way JOIN on `projects.userId = auth.userId` — tenant isolation is enforced at the SQL level, not just application code. A bug in a future route that forgets to call `verifyProjectOwnership` would still fail here.

### S5. `preview_url` stored as plain text from the sandbox — VALIDATED (good)
`engine.ts:433` re-validates `sandboxHandle.previewUrl` with `previewUrlSchema` (Zod + protocol check) before calling `storage.setPreviewUrl`. A compromised Worker cannot inject `javascript:` URLs into the DB. Well done.

### S6. Secrets in logs — minor risk
`run-build.ts:249, 270` logs truncated Vercel error body (first 200 chars). Vercel error bodies sometimes include a partial deployment URL or project slug, which leaks tenant info into your logs. Low severity, but consider a redaction pass or structured logger.

### S7. HMAC secret handled in Node memory only — FINE
`CloudflareSandboxProvider.fromEnv()` reads secret from env and holds in instance. Not logged, not shipped to client. Constant-time comparison happens on the Worker side (not visible here) — worth confirming in the Worker code review.

---

## Scalability red flags

### R1. Sandbox per request is synchronous-in-the-request-path
`engine.ts:422-431` calls `sandbox.writeFiles` on the HTTP request path with a 60s timeout. At 30 concurrent builds (Vercel's default Node serverless concurrency per instance), you have 30 long-lived fetches to the Cloudflare Worker. Next.js on Vercel has per-function concurrency limits; blocking on sandbox I/O will exhaust them fast. Consider:

- Offload sandbox provisioning to a background job (Inngest, QStash) and stream a `sandbox_queued` → `sandbox_ready` event pair
- Or at minimum cap `sandbox.writeFiles` timeout well below the 300s `maxDuration` so a stuck sandbox can't eat the whole budget

### R2. Anthropic stream + file writes + sandbox all inside one SSE connection
Single failure of any upstream (Anthropic, R2, Cloudflare Worker) terminates the user's stream. No resumability — a dropped connection mid-build loses the SSE progress but the build continues server-side, orphaning events the client never sees. The DB record of `builds.status` eventually reaches `completed`, but the client was told "disconnected" or silence.

For a pre-launch product this is acceptable; post-launch add:
- Client-side reconnect using `Last-Event-ID`
- Server-side event log per build (partial — there is `agent_events` but not used for SSE replay)

### R3. `getCurrentFiles` + per-file `readFile` is N+1 on R2
`engine.ts:135-140` and `sandbox-preview.ts:28-34` both:

```ts
const rows = await storage.getCurrentFiles(projectId)
const files = await Promise.all(rows.map(row => ({
  path: row.path,
  content: await storage.readFile(projectId, row.path),
})))
```

For a 50-file project, that is 50 parallel R2 GETs. R2 handles parallel fine, but Vercel's outbound bandwidth is metered and latency compounds for the 95th-percentile file. Add a `getAllFilesWithContent(projectId)` to `ProjectStorage` that batches via a single R2 ListObjects + parallel Gets with a concurrency cap (e.g., 10). Right now a large project could open 100+ simultaneous HTTP connections to R2 from the hot path.

### R4. No idempotency keys on onboarding POST
`/api/onboarding` creates projects + provisions subdomains + inserts plan cards + kicks off prewarm. If the client retries on a flaky network (mobile users will), you get duplicate projects. The rate limit of 30/hr is not a defense against duplicate creation at the UX level — a legit retry within 5 seconds lands two projects.

Add an `Idempotency-Key` header (client-generated UUID) + a 24h cache of `(userId, idempotencyKey) → projectId` in Redis. Stripe's pattern. ~30 lines.

### R5. `aiCallLogger` is not awaited — log loss under fail
`engine.ts:383-402` runs `deps.aiCallLogger({...})` inside a `try { } catch` but the underlying `recordAiCall` likely returns a Promise. If it is, and the function is sync-wrapped, errors are swallowed. If the logger actually does DB INSERT, you lose the log on any failure. Worth confirming `recordAiCall`'s signature and either awaiting it or fire-and-forget-with-explicit-`.catch`.

### R6. `users.tokenBalance` in `users` table (hot row contention)
Every build does `debitTokens` which UPDATEs `users.tokenBalance`. Under bursty load (a single user triggering auto-build on 10 cards), this row is contended. Postgres row-locking means these become serial. At the v3 scale this is fine, but it is the obvious first hot-spot. When you see the issue, move the balance to a ledger-sum view or a `user_balances` table with SERIALIZABLE tx.

---

## Recommended fixes (prioritized)

### P0 — Ship-blocking before real users

1. **Fix auto-build `serviceError` handling** (`apps/web/src/app/api/workspace/[projectId]/auto-build/route.ts:31-37`). Copy the `build/route.ts` pattern exactly — return 503 on `serviceError`, 429 on genuine rate-limit. Literally 8 lines.

2. **Eliminate the double-sandbox-provision path in `run-build.ts`.** The orchestrator already does `sandbox.writeFiles` at `engine.ts:422-431`. The `withSandboxPreview` wrapper then does `sandbox.start` again post-commit (`sandbox-preview.ts:44-52`). Pick one. Recommend: the orchestrator handles live-sandbox updates; `withSandboxPreview` should only run for projects that have no sandbox yet (first build). Add a `status` check.

3. **Add jitter + classify errors in sandbox retries.** Don't retry on `SandboxStartFailedError` with cause `HMAC_AUTH_FAILED` or `SAFE_PATH_VIOLATION`. Add 250-500ms randomized delay before retry. Pattern:
   ```ts
   if (isRetryable(firstErr)) {
     await sleep(200 + Math.random() * 300)
     await sandbox.prewarm(projectId)
     handle = await sandbox.start(opts)
   } else {
     throw firstErr
   }
   ```

### P1 — Within the first week of real users

4. **Stop silently swallowing prewarm + subdomain failures** (`onboarding/route.ts:104, 111`). Minimum: emit a structured log with `{ projectId, userId, op: 'prewarm' }` tags so these show up in log-based alerts. Better: track as a `project_provisioning_issues` row so a reconciler can retry.

5. **Add idempotency to `/api/onboarding`.** Accept `Idempotency-Key` header; cache response in Redis for 24h. Mobile-flaky-network insurance.

6. **Confirm cookie attributes on `meldar-auth`.** Must be `HttpOnly; Secure; SameSite=Lax; Path=/`. If not already, fix the session issuance code (not in this review scope but adjacent).

7. **Cap per-file R2 concurrency in `getCurrentFiles + readFile` flows.** Use `p-limit` or equivalent — 10 parallel gets max per request.

### P2 — Next iteration

8. **Extract sandbox provisioning to a background job.** Return 202 Accepted with an SSE channel the client subscribes to for sandbox_ready. Frees the build path from Worker latency.

9. **Add SSE resumability** with `Last-Event-ID`. Requires server-side event log (reuse `agent_events` table schema or add `build_events`).

10. **Charset-restrict `businessName`** at the API boundary. Reject control chars and HTML metacharacters. Belt-and-braces against downstream XSS.

11. **Redact Vercel error bodies** before logging at `run-build.ts:249, 270`.

---

## Summary scorecard

| Area | Grade | Notes |
|---|---|---|
| API contract design | B+ | Zod everywhere, typed error codes, good HTTP status discipline. Asymmetric 503 handling between `/build` and `/auto-build` drops the grade. |
| Auth | A- | Cookie + JWT + `tokenVersion` revocation + per-query ownership join. CSRF posture needs confirmation. |
| Rate limiting | A- | Consistent pattern. Production-fail-closed via `mustHaveRateLimit`. Good. |
| Error handling | B | Typed errors, token refunds on failure. But silent catches on prewarm/subdomain are risky. |
| Idempotency | C | Missing on onboarding. Build has DB-level streaming-unique index (strong). |
| Observability | B | Console.error with context prefixes everywhere. No structured logger. AI call log is comprehensive. |
| SQL injection | A | Drizzle parameterized throughout. |
| Sandbox retry logic | C+ | Correct intent, no jitter, no error classification, potential double-provision path. |
| DB schema | A | Partial unique indexes, check constraints, soft-delete, content-addressed file storage. Professional. |
| Scalability | B- | Synchronous sandbox in request path is the main risk. Token-balance hot row is a known future issue. |

**Overall:** Ship it. The data model and transactional discipline are strong. The sandbox retry logic and the auto-build/build asymmetry are the two things I would fix before a public launch — both are small, localized changes. Everything else is "make it better under load," not "make it correct."
