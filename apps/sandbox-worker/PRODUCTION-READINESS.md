# Sandbox Worker — Production-Readiness Review

**Verdict: BLOCKED**

The spike code at `apps/sandbox-worker/` proves that Cloudflare Sandbox SDK + Next.js 16 + iframe-embedded preview URLs work end-to-end. That validation stands.

It is **not** the production worker that `packages/sandbox/src/cloudflare-provider.ts` expects to talk to. The orchestrator-side HTTP client and the spike worker speak two entirely different protocols. Deploying the spike as-is and pointing the orchestrator at it will produce 404s on every contract endpoint.

This document enumerates every gap between the spike and the contract. It is the punch-list for whoever rewrites `src/worker.ts` into the production worker.

---

## 1. HTTP API contract drift (BLOCKERS)

The orchestrator client (`packages/sandbox/src/cloudflare-provider.ts`) calls these endpoints. The spike worker (`apps/sandbox-worker/src/worker.ts`) implements a completely different set.

| Contract endpoint (orchestrator calls) | Spike worker handles? | Status |
|---|---|---|
| `POST /api/v1/prewarm`  body: `{ projectId }` | No | Blocker |
| `POST /api/v1/start`    body: `{ projectId, userId, template, files }` | No | Blocker |
| `POST /api/v1/write`    body: `{ projectId, files }` | No | Blocker |
| `POST /api/v1/status`   body: `{ projectId }` | No | Blocker |
| `POST /api/v1/stop`     body: `{ projectId }` | No (has `/api/stop` GET, no projectId, no JSON body) | Blocker |

The spike instead exposes:

| Spike endpoint | Used by | Status |
|---|---|---|
| `GET /api/sandbox` | the spike's `public/index.html` test page | Spike-only, must be removed |
| `POST /api/write`  body: `{ path, content }` | the spike's test page | Spike-only, contract is per-file not per-project |
| `GET /api/stop` | the spike's test page | Spike-only |

Every difference is load-bearing:

- The contract includes `projectId` on every call. The spike hardcodes `SANDBOX_ID = 'meldar-spike'` (line 20). **Per-project isolation is the entire point of the production worker** — without per-project DO IDs, every Meldar user shares one sandbox, every Build overwrites every other user's preview, and the data leak is total.
- The contract supports an `initialFiles` batch on `start` so a Day-2 cold rehydrate can restore the user's source code from Postgres/R2 in one call. The spike has no path to start from a file batch — it always boots the pre-baked starter.
- The contract uses `POST /api/v1/write` with `{ projectId, files: [...] }` (a batch). The spike uses `POST /api/write` with `{ path, content }` (one file at a time). The difference matters: every Build streams 5-30 files; one round-trip per file would multiply latency by 30x.
- The contract requires a `status` endpoint returning `{ previewUrl, status }`. The spike has no equivalent — `getPreviewUrl()` from the orchestrator side will get a 404 every time.

**Fix:** rewrite `src/worker.ts` to implement the 5 contract endpoints. The spike's test endpoints (`/api/sandbox`, `/api/write`, `/api/stop`) and the host page (`public/index.html`) should be removed entirely from the production worker — they were debugging UI for the spike phase and have no production purpose.

---

## 2. HMAC authentication (BLOCKER)

The orchestrator client signs every request:

```text
x-meldar-timestamp: <unix-millis>
x-meldar-signature: hex(HMAC-SHA256(secret, "${timestamp}.${bodyJson}"))
```

The spike worker has **zero authentication**. Any request from any IP on the open internet will be accepted. Deployed as-is, this is an open-relay that lets anyone:

- Boot a sandbox container on Meldar's Cloudflare account (cost: real dollars per minute)
- Write arbitrary files into anyone's project (data destruction, supply-chain attack on previews)
- Read the resulting preview URL and exfiltrate work-in-progress

**Fix:** the production worker must verify the HMAC signature on every request:

1. Read `x-meldar-timestamp` and `x-meldar-signature` from request headers.
2. Reject (401) if either is missing.
3. Reject (401) if `Date.now() - timestamp > 5 * 60 * 1000` (5-minute clock-skew window — matches the spec in `cloudflare-provider.ts:308-323`).
4. Read the request body **as the raw string**, not as parsed JSON (the orchestrator signs the exact bytes it sends; re-serializing JSON would change whitespace and break the signature).
5. Compute `HMAC-SHA256(env.HMAC_SECRET, "${timestamp}.${rawBody}")` using the Web Crypto API (`crypto.subtle.importKey` + `crypto.subtle.sign`).
6. Hex-encode the result and constant-time-compare against the supplied signature. **Use `crypto.subtle.verify` or a constant-time hex comparison** — `===` on hex strings leaks via timing.
7. Reject (401) on mismatch. Only then parse the body as JSON and dispatch to the handler.

The signed message format MUST be exactly `${timestamp}.${rawBody}` (period delimiter, no surrounding whitespace, no trailing newline). The orchestrator client at `cloudflare-provider.ts:221` constructs it that way. Any divergence in canonicalization breaks every request.

The HMAC secret is expected in `env.HMAC_SECRET` (per the docstring at `cloudflare-provider.ts:28`). The current spike `wrangler.jsonc` declares no secrets binding, so this needs to be added (see §6).

---

## 3. Per-project Durable Object IDs (BLOCKER)

The spike: `getSandbox(env.Sandbox, 'meldar-spike')` — one DO instance for the entire deployment.

The contract: every endpoint receives a `projectId` in the body and the worker MUST scope the sandbox to `getSandbox(env.Sandbox, \`project-${projectId}\`)`. Without this, two concurrent Meldar users share a single sandbox.

**Fix:** every handler must extract `projectId` from the parsed body and pass `\`project-${projectId}\`` to `getSandbox()`. Validate `projectId` matches a strict regex (`/^[a-zA-Z0-9_-]{1,64}$/`) before using it as a DO ID — DO IDs end up in URLs and logs and must not contain user-controlled separators.

---

## 4. Wrangler config issues (PRE-DEPLOY FIXES)

`wrangler.jsonc` has several spike-only settings that need attention before production deploy:

| Field | Current | Issue | Fix |
|---|---|---|---|
| `name` | `meldar-sandbox-spike` | Reads as a throwaway in Cloudflare dashboards and metrics | Rename to `meldar-sandbox-worker` or `meldar-sandbox` |
| `compatibility_date` | `2025-05-06` | Almost a year stale (today is 2026-04-07) | Bump to `2026-04-01` or later |
| `assets.directory` | `./public` with `index.html` | The host test page is spike-only | Remove the `assets` block entirely; production worker has no static assets |
| `assets.run_worker_first` | `true` | Only matters if `assets` exists | Removed when `assets` is removed |
| `containers[0].max_instances` | `1` | One container globally — fine for spike, fatal for production | Raise to a real number (start with 50, monitor, scale up). Cloudflare will charge per active instance — see cost section in DEPLOY.md |
| `containers[0].instance_type` | `lite` | Document this is a deliberate choice for cost; the SDK supports bigger sizes | Confirm `lite` matches the sandbox-app's RAM needs (Next.js dev server with Turbopack is not free — measure) |
| `migrations` tag | `v1` | Fine for first deploy, bumping requires a new tag | Document for future migrations |

There is **no `routes` block** declaring a custom domain. The default `*.workers.dev` URL works for MVP but the spike notes (README.md §"What this spike does NOT prove") explicitly call out that production needs `*.sandbox.meldar.ai` for branded preview URLs. **Day-1 deployment can ship on `*.workers.dev`**; the custom domain is a wave-2 follow-up that requires Cloudflare DNS setup the user controls.

---

## 5. Missing observability and operational basics

The spike worker is a happy-path prototype. The production worker needs:

| Item | Status | Severity |
|---|---|---|
| `observability.enabled: true` in wrangler.jsonc | Already set | Done |
| Structured logging on every request (method, path, projectId, latency, status) | Missing | Pre-deploy |
| Error envelope: every 4xx/5xx returns `{ error: string }` JSON, never an HTML error page | Missing | Pre-deploy |
| 4xx vs 5xx discipline: 401 for HMAC fail, 404 for no sandbox, 409 for conflict, 500 for unhandled exceptions (the orchestrator client maps these per `cloudflare-provider.ts:251-265`) | Missing | Pre-deploy |
| Request timeout protection (the orchestrator times out at 30s; the worker should bail at ~25s and return 504 rather than hang) | Missing | Pre-deploy |
| Per-projectId rate limit (one user shouldn't be able to spawn 1000 sandboxes/sec) | Missing | Wave-2 |
| Health check endpoint (e.g. `GET /healthz` returning `{ ok: true, version }`) for the verification script and external monitoring | Missing | Pre-deploy |
| Tests on the worker side (Vitest + Miniflare against the contract) | Missing | Wave-2 |

---

## 6. Dockerfile / starter image

The spike's `Dockerfile` extends `cloudflare/sandbox:0.8.4` and pre-installs the `sandbox-app/` Next.js starter. For production:

- The container image must be **pushed to Cloudflare's container registry** during `wrangler deploy`. Wrangler ≥ 4.0 with the `containers` config does this automatically — confirmed by the spike's already-working local build. No manual `docker push` needed.
- The base image tag `cloudflare/sandbox:0.8.4` is pinned. **Pin it harder by digest** (`cloudflare/sandbox:0.8.4@sha256:...`) before production to prevent silent base-image drift between deploys.
- `sandbox-app/` is the **one starter template Meldar ships at MVP**. The contract `start` call accepts a `template` field — the worker should validate it against an allowlist of known template names (initially just `'next-landing-v1'` or whatever the orchestrator passes) and 400 unknown templates rather than silently using the only one available.
- The container exposes port 3001 (Next.js); port 3000 is reserved by the sandbox runtime. This is correct in the spike and should be preserved.

The Dockerfile itself is fine. The fix is in `worker.ts` — it must respect `template` from the request body and validate it.

---

## 7. Cold-start exposure if `prewarm` is fired opportunistically

The orchestrator's `prewarm()` is fire-and-forget (`cloudflare-provider.ts:97-104`). It's intended to be called from:

1. Stripe webhook (paid signup → start booting the user's sandbox before they even hit `/thank-you`)
2. Magic-link click (start booting before the workspace page hydrates)

The spike measured 6.8s cold start on Apple Silicon, projected 1-2s on amd64 production. Multiplied by N concurrent prewarms during a viral spike, this can saturate Cloudflare Containers:

- `max_instances: 1` in the spike config means **only one container can be cold-booting at once**, ever. Concurrent prewarms will queue behind it and most will hit the orchestrator's 30-second timeout.
- Even with `max_instances: 50`, a 50-user surge means 50 simultaneous container boots → real money + possible per-account quota hits.

**Mitigation (wave-2):**
- Make `prewarm` idempotent on the worker side: if a sandbox for `project-${projectId}` is already starting or ready, return 200 immediately without re-booting.
- Add a worker-side rate limit on `prewarm` per IP / per Cloudflare account.
- Surface container-saturation as an explicit 503 the orchestrator can map to a "preview unavailable, retry shortly" state in the workspace UI.

For Day-1, document the expected concurrency ceiling and monitor.

---

## 8. Contract trace (confirmation)

For each of the 5 contract endpoints, here is what the orchestrator sends and what the worker must return.

### `POST /api/v1/prewarm`
**Request body:**
```json
{ "projectId": "proj_abc123" }
```
**Headers:** `x-meldar-timestamp`, `x-meldar-signature`, `content-type: application/json`
**Worker action:** validate HMAC, look up `getSandbox(env.Sandbox, \`project-\${projectId}\`)`, kick off container start without waiting for the dev server, return immediately. Idempotent — safe to call repeatedly.
**Success response:** `200 { "ok": true }` (body shape not checked by orchestrator — it swallows errors).

### `POST /api/v1/start`
**Request body:**
```json
{
  "projectId": "proj_abc123",
  "userId": "user_xyz",
  "template": "next-landing-v1",
  "files": [{ "path": "src/app/page.tsx", "content": "..." }]
}
```
**Worker action:** validate HMAC, validate template against allowlist, get/create the per-project sandbox, write all `files` into the container via `sandbox.writeFile()`, start `next dev` on port 3001, expose the port, wait for it to be listening, return the preview URL.
**Success response (200):**
```json
{
  "sandboxId": "project-proj_abc123",
  "previewUrl": "https://3001-project-proj_abc123-<token>.<worker-host>",
  "status": "ready",
  "revision": 0
}
```
**Errors:**
- `400` — bad request (missing fields, unknown template, unsafe path)
- `401` — HMAC fail
- `409` — conflict (sandbox in unstartable state — orchestrator retries with stop-then-start)
- `500` — unhandled
- `503` — container quota exhausted

### `POST /api/v1/write`
**Request body:**
```json
{
  "projectId": "proj_abc123",
  "files": [
    { "path": "src/app/page.tsx", "content": "..." },
    { "path": "src/components/Hero.tsx", "content": "..." }
  ]
}
```
**Worker action:** validate HMAC, look up sandbox, sequentially write each file. On the first failure, return `200` with `failedPath` set. On total success, return the current preview URL and increment revision counter.
**Success response (200):**
```json
{
  "previewUrl": "https://...",
  "status": "ready",
  "revision": 7
}
```
**Failure-while-writing response (200, NOT 4xx — the orchestrator inspects the body):**
```json
{
  "previewUrl": "https://...",
  "failedPath": "src/app/page.tsx",
  "error": "ENOSPC: no space left on device"
}
```

### `POST /api/v1/status`
**Request body:**
```json
{ "projectId": "proj_abc123" }
```
**Worker action:** look up the sandbox. If it has port 3001 exposed, return the URL. Otherwise, return 404.
**Success response (200):**
```json
{ "previewUrl": "https://...", "status": "ready" }
```
**Not-found response:** `404` with optional body — orchestrator maps this to `null`.

### `POST /api/v1/stop`
**Request body:**
```json
{ "projectId": "proj_abc123" }
```
**Worker action:** kill the next-dev process and let the DO go idle. Idempotent — already-stopped is success.
**Success response (200):** `{ "ok": true }`
**Already-stopped response:** `404` (orchestrator treats as success).

---

## 9. Summary table

| Severity | Item | Fix location |
|---|---|---|
| Blocker | Wrong endpoint paths (`/api/sandbox` vs `/api/v1/start` etc) | `src/worker.ts` rewrite |
| Blocker | No HMAC verification | `src/worker.ts` rewrite |
| Blocker | Hardcoded single sandbox ID, no per-project isolation | `src/worker.ts` rewrite |
| Blocker | No batch `writeFiles` endpoint | `src/worker.ts` rewrite |
| Blocker | No `status` endpoint | `src/worker.ts` rewrite |
| Blocker | No `template` validation, no `initialFiles` handling | `src/worker.ts` rewrite |
| Pre-deploy | Wrangler `name` is `-spike` | `wrangler.jsonc` |
| Pre-deploy | `compatibility_date` stale | `wrangler.jsonc` |
| Pre-deploy | `assets` block + `public/index.html` not needed in prod | `wrangler.jsonc`, delete `public/` |
| Pre-deploy | `max_instances: 1` is fatally low | `wrangler.jsonc` |
| Pre-deploy | No `HMAC_SECRET` secret bound | `wrangler.jsonc` + `wrangler secret put` |
| Pre-deploy | No structured logging / error envelope / health check | `src/worker.ts` |
| Pre-deploy | Base image not pinned by digest | `Dockerfile` |
| Wave-2 | No per-project rate limit | `src/worker.ts` |
| Wave-2 | Custom domain `*.sandbox.meldar.ai` not configured | `wrangler.jsonc` + Cloudflare DNS |
| Wave-2 | No worker-side tests | `src/__tests__/` |
| Wave-2 | No load test against staging | separate harness |
| Wave-2 | No idempotency on prewarm | `src/worker.ts` |

---

## What's not actionable from this report

I did **not** rewrite `src/worker.ts`. That's an implementation task with real test coverage requirements (every contract endpoint needs Vitest + Miniflare tests against a fake `Sandbox` DO, plus an integration test against a real Wrangler dev instance). It's also large enough that it should land as its own PR with its own code review — I'm a deploy-prep agent, not the implementer.

The deploy runbook (`DEPLOY.md`) is written **assuming the worker rewrite has happened**. Do not run `wrangler deploy` against the spike code as it stands today — the orchestrator will get 404s on every call and the workspace iframe will stay broken.
