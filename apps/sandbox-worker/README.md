# Spike: Cloudflare Sandbox SDK + Next.js 16

**Status: ✅ SUCCESS — Cloudflare Sandbox SDK is viable as Meldar v3's live-preview runtime.**

**Timebox:** planned 1.5 days, completed in ~2 hours.
**Decision unblocked:** Cloudflare Sandbox SDK is the Day-1 primary. We can proceed with Sprint 1 backbone work.

---

## TL;DR results

| Check | Result |
|---|---|
| Next.js 16 App Router + React 19.2 runs inside the sandbox container | ✅ verified (full RSC streaming, Turbopack, HMR client loaded) |
| Preview URL is iframe-embeddable from a host page on the same origin | ✅ no `X-Frame-Options`, no CSP frame-ancestors, gzipped + chunked streaming works |
| Cold start (first `/api/sandbox` call) | **~6.8s on Apple Silicon** with AMD64 emulation (likely <2s on native amd64) |
| Warm reuse (second+ `/api/sandbox` call) | **4-5ms** — essentially free |
| `writeFile()` injection latency (the core "AI generates code → iframe updates" loop) | **12ms** server-side, Turbopack HMR picks it up within ~1-2 seconds |
| HMR WebSocket across the subdomain preview URL | ✅ Turbopack HMR client script is loaded and wired by Next.js dev server |

## Test URL to see it yourself

The wrangler dev server is running at **http://localhost:8787**.

1. Open `http://localhost:8787` in a browser
2. Click "Start sandbox + boot Next.js" → watch cold start time in the log
3. Iframe renders the sandboxed Next.js app with the Meldar gradient hero
4. Click "Rewrite page.tsx (tests HMR via writeFile)" → iframe updates within ~1-2s with the new content
5. Click "Start sandbox" again → instant warm reuse

If the wrangler process isn't running, restart it with:
```bash
cd spikes/cloudflare-sandbox
pnpm install --ignore-workspace  # if deps aren't installed
./node_modules/.bin/wrangler dev --port 8787
```

---

## Critical findings (blockers we hit and how to avoid them in Sprint 1)

### 1. Apple Silicon: no native arm64 image (AMD64 emulation required)
Cloudflare only publishes `linux/amd64` for `cloudflare/sandbox` and `cloudflare/proxy-everything`. On Apple Silicon Macs, Docker Desktop runs them under QEMU/Rosetta emulation:
- Container cold-boot took **6.8 seconds** for just the sandbox runtime. First-time including `npm install` was ~60s.
- Docker build of the Meldar starter image: ~40s first time (mostly the `cloudflare/sandbox:0.8.4` 116MB base image pull), ~0.1s cached.
- On native amd64 (production Cloudflare, Linux dev boxes, CI), expect cold start closer to **1-2s**.

**Action for Sprint 1:** CI runs on Linux amd64 so CI-level timing measurements will be different. For dev, accept the ~7s cold start tax on Apple Silicon. Mitigated by warm reuse (5ms) for all subsequent requests in the same session.

### 2. The `cloudflare/proxy-everything` image must be pulled by tag, not just by digest
`wrangler dev` pulled the proxy-everything image by digest only, leaving it tagless in the local Docker cache. When the sandbox runtime then tried to reference it as `cloudflare/proxy-everything:3cb1195@sha256:...`, Docker couldn't resolve it — the sandbox sat in "Container is starting" for 137s, failed 8 times, then returned a confusing `SandboxError`.

**Fix:** run `docker pull cloudflare/proxy-everything:3cb1195` once before `wrangler dev` to establish the tag binding. (The exact tag `3cb1195` is hardcoded in the Sandbox SDK — check which tag the SDK version you're using expects. Look in the wrangler error log for "No such image available named cloudflare/proxy-everything:XXXXX" if it bites you again.)

**Action for Sprint 1:** add the proxy-everything pull to a `postinstall` script or a `pnpm dev` wrapper so fresh machines don't hit this.

### 3. Host `node_modules` must not leak into the container build
Pnpm's symlinked `node_modules` inside `sandbox-app/` caused `COPY sandbox-app/ ./` in the Dockerfile to fail with `cannot replace to directory /app/node_modules/@types/node with file` — the host's symlinks conflicted with the container's real directories from the prior `npm install` step.

**Fix:** add a `.dockerignore` at the Dockerfile's build context root that excludes `node_modules`, `**/node_modules`, `.next`, `**/.next`. Already in place for this spike.

### 4. `assets` handler intercepts preview URL subdomains unless `run_worker_first: true` is set
By default, Cloudflare's static asset handler runs **before** the worker. On the main host (`localhost:8787`), that's what you want — `GET /` returns `public/index.html` instantly. But preview URLs are on subdomains like `3001-meldar-spike-{token}.localhost:8787`, and the default asset handler matched `/` to `/index.html` on the subdomain too, returning the host page instead of the sandboxed Next.js app.

**Fix:** set `"run_worker_first": true` in the `assets` block of `wrangler.jsonc`. The worker then receives every request, calls `proxyToSandbox()` first (which handles preview URL subdomains by routing them to the container), and falls through to `env.Assets.fetch(request)` only for the host-page traffic.

### 5. Port 3000 is reserved; Next.js runs on 3001
The Cloudflare Sandbox runtime itself listens on port 3000 inside the container. You cannot expose port 3000 as a preview URL. Next.js is configured to start on port 3001 via `next dev -p 3001` and the `PORT` env var is passed when the process starts.

**Action for Sprint 1:** hardcode 3001 (or any non-3000 port) in the Meldar starter template. Surface this as a platform constant, not a magic number.

### 6. `next.config.ts` needs `allowedDevOrigins` for Next.js 16 cross-origin dev access
Next.js 16 has a dev-server CORS guard that blocks requests if the hostname doesn't match the bound hostname. The sandbox proxies requests through a generated subdomain (e.g., `3001-meldar-spike-xxx.localhost`), which doesn't match `0.0.0.0`. Without `allowedDevOrigins: ['*.localhost', '*.workers.dev', '*.meldar.ai']`, Next.js would reject the preview proxy requests.

**Action for Sprint 1:** bake this into the starter template. For production (`*.sandbox.meldar.ai`), include that pattern too.

### 7. Sharp postinstall is optional
Next.js's image optimization prefers `sharp` as a native dep. The container build skipped sharp's postinstall (pnpm warned "Ignored build scripts: sharp") because it doesn't matter for a dev server that doesn't optimize images. If we ever need image optimization in the sandbox, add `sharp` to the Dockerfile's `RUN npm install --build-from-source` step.

---

## Measured cold start breakdown

| Phase | Time | Notes |
|---|---|---|
| Docker image build (first) | ~40s | One-time, cached after |
| Docker image build (cached) | <1s | Every subsequent wrangler dev |
| `wrangler dev` startup | ~4s | DO binding setup, proxy pull |
| First `/api/sandbox` → container boot + `next dev` listening | **~6.8s** | Apple Silicon emulation; includes writing sandbox session state + Next.js turbopack initial compile |
| Warm `/api/sandbox` (reuse existing sandbox) | **4-5ms** | Checks `getExposedPorts()`, returns existing URL |
| `writeFile()` API → file on disk in container | **12ms** | Worker → Durable Object → container FS |
| HMR pickup + iframe re-render | ~1-2s | Turbopack compile step + RSC re-stream |

### What this means for Meldar's UX
- **First workspace entry for a new project:** 6.8s (Apple Silicon) / likely 1-2s (amd64 production)
  - Acceptable if we show a "Spinning up your preview..." loading state with a progress animation
  - NOT acceptable if the user sees a blank iframe that silently stalls
- **Every subsequent page load:** instant (4-5ms)
- **Kanban "Build" → iframe updates:** dominated by Sonnet generation time, not sandbox latency
- **"Ship #1" workflow:** the whole session stays warm, user never sees cold start twice

---

## What this spike proves ✅

1. **Cloudflare Sandbox SDK runs Next.js 16 App Router with React 19.2 and Turbopack** inside an isolated Linux container
2. **Preview URLs are iframe-embeddable** from a host page on the same hostname without CORS, X-Frame-Options, or CSP blockers
3. **Runtime file injection via `writeFile()` is ~12ms** and Turbopack HMR picks up the change within seconds — this is the entire core of the Meldar interaction model
4. **Warm reuse is essentially free** (4-5ms), so a user who stays in their workspace pays the cold-start tax exactly once per session
5. **`proxyToSandbox()` correctly routes subdomain preview URL traffic** to the sandboxed Next.js dev server via wildcard host matching
6. **The starter image pattern works** — pre-install deps at Docker build time, so `next dev` boots against an already-populated `node_modules`
7. **Local-only development works without a Cloudflare account** — wrangler dev + Docker + Miniflare run the entire flow on localhost

## What this spike does NOT prove (deferred to later spikes)

1. **Production deployment** — requires:
   - Cloudflare account + Workers Paid plan ($5/mo)
   - Wildcard DNS on a custom domain (e.g., `*.sandbox.meldar.ai` → Workers route)
   - Wrangler route config (`"routes": ["*.sandbox.meldar.ai/*"]`)
   - Container image build + push during `wrangler deploy`
   - All of the above are well-documented follow-ups, not architectural unknowns
2. **Multi-user concurrency** — this spike uses a single sandbox ID (`'meldar-spike'`). Multi-user would use per-user DO IDs (`'user-${userId}'`). The DO pattern already isolates state per ID, so this is a known-working pattern, just untested at scale.
3. **Authentication on preview URLs** — they are public by default. Cloudflare Sandbox supports a `token` option on `exposePort()` and/or custom auth via the Worker. For MVP, unguessable nanoid sandbox IDs are probably enough; plan a follow-up for real auth.
4. **Persistence across sandbox restarts** — the Meldar product design persists source files in Postgres/R2 (the source is the product of record, the sandbox is transient). We did not test hydrating a fresh sandbox from stored source files on Day-2 login — that's Sprint 1.
5. **Streaming file writes during a Build** — the real interaction will stream multiple `writeFile` calls in sequence as Sonnet generates code. We tested a single `writeFile`; sequential streaming should work but hasn't been benchmarked.
6. **Node.js API compatibility for real features** — OAuth callbacks, Postgres sockets (via the HTTP drivers like Neon), filesystem scratch space — all should work because it's real Linux, but none tested here beyond the trivial Next.js page render.
7. **Cost at scale** — the research doc projected ~$0.36-0.40/user/mo at 1000 active users. Real measurement requires production traffic.

---

## Sprint 1 acceptance criteria surfaced by UX cross-check

These were raised by the UX Researcher after reading this spike report against the UX research + architecture spec. They are real gaps this spike doesn't close — captured here so Sprint 1 doesn't re-discover them in production.

### AC-1: Day-2 cold rehydrate timing (BLOCKING Hypothesis H4 — Day-2 retention)
The 4-5ms warm reuse measured here is **same-session reuse of an already-running sandbox**. Day-2 login is a different scenario: fresh DO activation + cold container boot + source file restore from Postgres/R2 → Next.js compile → preview URL ready. Projected range: **6-15 seconds**.

**Acceptance criterion:** Day-2 cold rehydrate from stored source files completes in **<5s p50, <8s p95** on amd64 production.

**If the bar is missed:** ship a Day-2-specific loading state with progress narration ("Getting your Drop 1 ready..." → "Compiling your code..." → "Almost there...") AND pre-warm the user's DO during the email-magic-link click → workspace render window, so the cold boot overlaps with the magic-link verification page.

### AC-2: Multi-user concurrency under contention (load test before public launch)
This spike uses a single hardcoded sandbox ID (`'meldar-spike'`). Per-user DO IDs (`'project-${projectId}'`) are a documented Cloudflare pattern but this spike never exercised them under contention. Risk: a TikTok/Reddit post lands and 200 users hit the workspace simultaneously — we have no measured data on cold-start p99 under that load.

**Acceptance criterion:** Run a **50-concurrent-user load test** against the staging worker before any public launch traffic. Measure p50/p95/p99 cold start, DO isolation (no state leakage), and Cloudflare Containers concurrency caps hit.

**Cheap to automate:** a small Node script that spawns 50 simultaneous `fetch()` calls with different project IDs against staging, records timings, asserts isolation. ~1 hour of work, massive de-risk.

### AC-3: Preview URL sharing warning copy (share-link IS the auth)
Preview URLs are public-by-default. The share-link IS the auth — anyone with the URL sees the user's work-in-progress. For MVP this is acceptable IF the UI is explicit about it. If Katya shares her preview URL on Twitter for feedback (exactly the viral loop Meldar wants), she needs to know that "anyone with this link" means what it says.

**Acceptance criterion:** Every share-link UI surface (referral widget, "copy preview URL" button, etc.) includes a single-line warning: "Anyone with this link can view your preview. Don't share secrets."

### Bonus: Pre-warm sandbox during Stripe Checkout redirect (compounding optimization)
The UX architect recommended pre-deploying the starter app during the Stripe webhook. The UX researcher extended this: the Stripe Checkout → `/thank-you` redirect window is an additional 3-5 seconds of "user is staring at a loading screen" time. If the webhook kicks off sandbox provisioning and the redirect page triggers a `/api/sandbox` warm call, the combined window is ~10-30 seconds — fully absorbing even the worst-case cold boot. Trade-off: ~2-5% wasted compute on abandoned checkouts. Worth it — paywall→workspace is the most fragile transition in the funnel.

**Sprint 1 implementation note:** the `SandboxProvider` adapter should expose a `prewarm(projectId)` method separate from `create()` / `getPreviewUrl()` so the Stripe webhook handler can trigger it fire-and-forget without blocking the webhook response.

---

## Files in this spike

```
spikes/cloudflare-sandbox/
├── README.md                  (this file)
├── package.json               Worker deps (wrangler, @cloudflare/sandbox)
├── wrangler.jsonc             CF Worker + DO + Container config with run_worker_first
├── Dockerfile                 Extends docker.io/cloudflare/sandbox:0.8.4 + pre-installs Next.js starter
├── .dockerignore              Excludes host node_modules from build context
├── tsconfig.json              Worker-only TS config
├── public/
│   └── index.html             Iframe host page with Start/Write/Stop buttons + log pane
├── src/
│   └── worker.ts              CF Worker: proxyToSandbox → /api/sandbox | /api/write | /api/stop → assets fallthrough
└── sandbox-app/               (runs inside the container)
    ├── package.json           Next.js 16, React 19.2
    ├── next.config.ts         allowedDevOrigins for preview subdomains
    ├── tsconfig.json
    └── src/app/
        ├── layout.tsx         Root layout with Meldar brand colors
        └── page.tsx           Hello Meldar hero (gets rewritten by /api/write to prove HMR)
```

---

## Sprint 1 work unblocked by this spike

With the architecture validated, the Sprint 1 sandbox integration can proceed with confidence:

1. **`SandboxProvider` adapter interface** (keeps door open for future Vercel Sandbox / CodeSandbox SDK fallback)
2. **`CloudflareSandboxProvider` implementation** — wrap `@cloudflare/sandbox` in the adapter
3. **Durable Object ID scheme** — `project-${projectId}` or `user-${userId}:project-${projectId}`
4. **Starter template image** — bake Meldar's Next.js 16 + Panda CSS + Park UI starter into a Docker image, push to Cloudflare's container registry on `wrangler deploy`
5. **File-sync layer** — takes a batch of file edits from the orchestrator (Sonnet output) and streams them into the sandbox via `writeFile()` calls. Need to decide: parallel writes vs sequential? Probably sequential to preserve error context.
6. **Preview URL caching** — the worker should memoize the preview URL per sandbox so the frontend doesn't need to hit `/api/sandbox` repeatedly
7. **Cold-start UX** — loading state in the workspace during the ~2-7s boot. Maybe pre-warm the sandbox before the user lands in the workspace?
8. **Sandbox lifecycle** — when to stop/restart sandboxes, idle timeouts, memory limits per sandbox

## Prereqs for anyone reproducing the spike

1. Docker Desktop running
2. Node.js ≥ 16.17.0 (verified with v22.19.0)
3. pnpm ≥ 8 (verified with v10.18.3)
4. Before first run, run `docker pull cloudflare/proxy-everything:3cb1195` (once per machine, or automate via postinstall)
5. No Cloudflare account required for local development
