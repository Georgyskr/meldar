# Sandbox Worker — Production Deployment Runbook

> **READ FIRST:** `PRODUCTION-READINESS.md` (sibling file). This runbook assumes
> the spike `src/worker.ts` has been rewritten to implement the 5 contract
> endpoints (`/api/v1/{prewarm,start,write,status,stop}`) with HMAC verification
> and per-project Durable Object IDs. **Do not run `wrangler deploy` against
> the spike code as it stands today** — the orchestrator will 404 on every call.

This runbook covers the deploy of the Cloudflare Worker that hosts Meldar v3's
sandboxed Next.js dev servers, plus the corresponding Vercel env-var setup so
the orchestrator running on Vercel can talk to it.

You will go through these phases:

1. Prerequisites (one-time)
2. Generate the HMAC secret (one-time)
3. Configure the Worker secret on Cloudflare
4. Deploy the Worker
5. Capture the Worker URL
6. Configure Vercel env vars
7. Verify end-to-end with `scripts/verify-deployment.sh`
8. Trigger a Vercel redeploy so the orchestrator picks up the env vars
9. (Optional) Rollback procedure

Estimated time: **30 minutes if everything works.** Realistically **60-90 minutes**
on the first deploy because the HMAC byte-identity check between Cloudflare and
Vercel catches at least one paste error per attempt and `wrangler deploy` of a
new container image takes its time pushing the image.

---

## 1. Prerequisites

### Cloudflare account
- A Cloudflare account on the **Workers Paid plan** ($5/mo). The free plan does
  **not** include Durable Objects with SQLite-backed storage or Containers.
- The account must have **Cloudflare Containers** access enabled. As of writing,
  this is gated. If `wrangler deploy` rejects the `containers` block in
  `wrangler.jsonc`, request access via the Cloudflare dashboard.

### Local tooling
- Node.js ≥ 20 (Wrangler 4 requires it)
- pnpm ≥ 8 (matches the monorepo)
- Wrangler CLI ≥ 4.0 (already a devDep in `apps/sandbox-worker/package.json`,
  use `pnpm exec wrangler` rather than a globally installed copy)
- Docker Desktop running locally (Wrangler builds the container image locally
  before pushing it to Cloudflare's registry)
- `openssl` (preinstalled on macOS and most Linux)
- `jq`, `curl` (preinstalled on macOS; `brew install jq` if missing)

### Vercel
- The Vercel project for `apps/web` (`meldar` or whatever the project is named).
- Vercel CLI logged in (`vercel login`) and the project linked
  (`vercel link` from `apps/web/`), or use the dashboard at
  https://vercel.com/<team>/<project>/settings/environment-variables.

### Sanity checks
```bash
cd /Users/georgyskr/projects/pet/agentgate/apps/sandbox-worker
pnpm install
pnpm exec wrangler --version    # expect >= 4.0.0
pnpm exec wrangler whoami       # if "Not logged in" -> run `pnpm exec wrangler login`
docker version                  # daemon must be running
```

If `pnpm exec wrangler login` opens a browser and you confirm the OAuth flow,
the CLI will store credentials in `~/.config/.wrangler/` (macOS) and you're set.

---

## 2. Generate the HMAC secret (one-time)

This secret protects every request from the Vercel orchestrator to the
Cloudflare Worker. It is shared (symmetric). It must be **byte-identical** on
both ends. Any difference — extra newline, leading space, wrong base64
alphabet — will cause every request to fail HMAC verification with 401.

Generate a 32-byte random secret and base64url-encode it (no padding, no
slashes, no plus signs — these survive copy-paste between dashboards intact):

```bash
openssl rand 32 | base64 | tr '/+' '_-' | tr -d '=\n'
```

The output is a 43-character string like:

```text
xK9_cN-aB7d2EfGhI3jKlMnOpQ4rS5tUvWxYz6A1B2C
```

**Copy this string to your clipboard and immediately store it somewhere safe**
(1Password, Bitwarden, etc.). You will paste it into both Cloudflare and Vercel
in the next two sections — there is no way to retrieve it from either platform
once it's set, and a regeneration means redeploying both ends.

> If you accidentally close the terminal before storing it, just regenerate
> with the same command — but make sure you use the new value in **both**
> Cloudflare AND Vercel. Mixing old and new values is the most common cause
> of HMAC failures.

---

## 3. Set the HMAC secret on Cloudflare (Worker side)

The Worker reads the secret from `env.HMAC_SECRET`. Wrangler stores it
encrypted in Cloudflare's secret manager — it never appears in
`wrangler.jsonc` or git.

```bash
cd /Users/georgyskr/projects/pet/agentgate/apps/sandbox-worker
pnpm exec wrangler secret put HMAC_SECRET
```

Wrangler will prompt:

```text
Enter a secret value:
```

Paste the secret string from Step 2 and hit Enter. Wrangler responds:

```text
Success! Uploaded secret HMAC_SECRET
```

Verify it's stored (Wrangler doesn't show the value, just the name):

```bash
pnpm exec wrangler secret list
```

Expected output includes:

```json
[
  { "name": "HMAC_SECRET", "type": "secret_text" }
]
```

> **Note for first-deploy chicken-and-egg:** if the Worker hasn't been
> deployed yet, `wrangler secret put` will offer to create the Worker for
> you. Accept. The secret will be attached to the (empty) worker, and the
> next `wrangler deploy` will populate it with code.

---

## 4. Deploy the Worker

Confirm `wrangler.jsonc` has been updated for production (per
`PRODUCTION-READINESS.md` §4):

```bash
cd /Users/georgyskr/projects/pet/agentgate/apps/sandbox-worker
cat wrangler.jsonc
```

Confirm at minimum:
- `name` is `meldar-sandbox-worker` (or your chosen production name) — NOT `-spike`
- `compatibility_date` is recent (within the last 90 days)
- `containers[0].max_instances` is `>= 50` (or whatever your launch capacity is)
- The `assets` block is removed (the production worker has no static assets)
- `observability.enabled` is `true`

Then deploy:

```bash
pnpm install
pnpm exec wrangler deploy
```

This will:

1. Bundle `src/worker.ts` with esbuild
2. Build the Docker image from `Dockerfile` (this can take 1-3 minutes the
   first time — Cloudflare has to push it to their registry; subsequent
   deploys reuse cached layers)
3. Apply the Durable Object SQLite migration (`new_sqlite_classes: ["Sandbox"]`,
   tag `v1`) — only on the first deploy
4. Publish the worker to `https://<name>.<account-subdomain>.workers.dev`

Expected output (truncated):

```text
Total Upload: <size> KiB / gzip: <size> KiB
Uploaded meldar-sandbox-worker (Xs)
Published meldar-sandbox-worker (Ys)
  https://meldar-sandbox-worker.<your-account>.workers.dev
Current Deployment ID: <uuid>
```

**If the deploy fails:**

- `Error: 10067 — workers.api.error.containers_not_enabled` → your Cloudflare
  account doesn't have Containers access. Request it from the dashboard.
- `Error: durable object migration ... already applied` → you're re-running a
  first deploy. Either bump the migration tag in `wrangler.jsonc` or delete
  the Worker from the dashboard and start over.
- `Error pushing container image` → Docker daemon isn't running, or the
  Dockerfile failed to build locally. Run `docker build -t test apps/sandbox-worker/`
  to debug in isolation.

---

## 5. Capture the Worker URL

The line in the deploy output:

```text
  https://meldar-sandbox-worker.<your-account>.workers.dev
```

is the URL you need. Copy it. **No trailing slash.** This goes into Vercel as
`CF_SANDBOX_WORKER_URL` in the next step.

If you missed the output, retrieve it any time with:

```bash
pnpm exec wrangler deployments list
```

or look at `https://dash.cloudflare.com/<account-id>/workers-and-pages/view/<name>`.

---

## 6. Configure Vercel env vars

The orchestrator on Vercel needs **two** env vars: the worker URL and the
HMAC secret. Both must be set in the **Production** and **Preview**
environments. Skip **Development** intentionally — `pnpm dev` runs against the
local stack with `deps.sandbox === null` per `packages/orchestrator/src/deps.ts:74-79`,
which gracefully degrades to "DB writes only, no live preview" and is the
correct local-dev experience.

### Option A — CLI (recommended for the first time)

From any directory linked to the Vercel project (typically `apps/web/`):

```bash
cd /Users/georgyskr/projects/pet/agentgate/apps/web

# Worker URL — Production
vercel env add CF_SANDBOX_WORKER_URL production
# Paste: https://meldar-sandbox-worker.<your-account>.workers.dev
# (no trailing slash, no quotes)

# Worker URL — Preview
vercel env add CF_SANDBOX_WORKER_URL preview
# Paste the same URL

# HMAC secret — Production
vercel env add CF_SANDBOX_HMAC_SECRET production
# Paste the secret from Step 2 — must be byte-identical to what you put in
# Cloudflare in Step 3

# HMAC secret — Preview
vercel env add CF_SANDBOX_HMAC_SECRET preview
# Paste the same secret
```

After each `vercel env add`, the CLI confirms the var was added and which
environments it applies to.

### Option B — Dashboard

1. Go to https://vercel.com/<team>/<project>/settings/environment-variables
2. Click "Add New"
3. Name: `CF_SANDBOX_WORKER_URL`, Value: `https://meldar-sandbox-worker.<...>.workers.dev`,
   Environments: ✓ Production, ✓ Preview, ☐ Development → Save
4. Click "Add New" again
5. Name: `CF_SANDBOX_HMAC_SECRET`, Value: `<secret from Step 2>`,
   Environments: ✓ Production, ✓ Preview, ☐ Development → Save

### Verify the vars are set

```bash
vercel env ls
```

You should see four entries (two vars × two environments):

```text
CF_SANDBOX_WORKER_URL    Encrypted   Production
CF_SANDBOX_WORKER_URL    Encrypted   Preview
CF_SANDBOX_HMAC_SECRET   Encrypted   Production
CF_SANDBOX_HMAC_SECRET   Encrypted   Preview
```

---

## 7. Verify the Worker contract end-to-end

Run the verification script. It exercises all 5 contract endpoints, confirms
HMAC verification works (and rejects tampered signatures), and measures cold
vs warm latency.

```bash
cd /Users/georgyskr/projects/pet/agentgate/apps/sandbox-worker

export CF_SANDBOX_WORKER_URL="https://meldar-sandbox-worker.<your-account>.workers.dev"
export CF_SANDBOX_HMAC_SECRET="<secret from Step 2>"

./scripts/verify-deployment.sh
```

**What it checks:**

- All 5 contract endpoints respond with valid JSON
- HMAC signature on a real request is accepted (200)
- A request with a tampered signature is rejected (401)
- Full happy path: `prewarm → start → write → status → fetch previewUrl → stop`
- Cold-start latency on the first `start` (warns if >10s)
- Warm-reuse latency on the second `start` (warns if >100ms)

**Expected output (success):**

```text
[verify] worker URL: https://meldar-sandbox-worker.<account>.workers.dev
[verify] secret length: 43 chars (looks valid)
[verify] generated test projectId: verify-test-1712345678

[1/8] POST /api/v1/prewarm                       ✓ 200 (123 ms)
[2/8] POST /api/v1/start (cold boot)             ✓ 200 (1842 ms)
       previewUrl = https://3001-project-verify-test-...
       sandboxId  = project-verify-test-1712345678
[3/8] POST /api/v1/start (warm reuse)            ✓ 200 (38 ms)
[4/8] POST /api/v1/write (single file)           ✓ 200 (94 ms)
[5/8] POST /api/v1/status                        ✓ 200 (28 ms)
[6/8] GET <previewUrl>                           ✓ 200 (412 ms)
       page renders 'Hello Meldar' or your starter content
[7/8] HMAC tamper test                           ✓ 401 (rejected as expected)
[8/8] POST /api/v1/stop                          ✓ 200 (76 ms)

[verify] all checks passed
```

**If any check fails**, the script exits non-zero and prints the failing
endpoint plus the response body. Common failures:

- `HMAC verification failed (401)` on Step 1 → the secret on Cloudflare and
  the secret in your shell env don't match. Re-run `wrangler secret put HMAC_SECRET`
  with the exact same value you have in `$CF_SANDBOX_HMAC_SECRET`.
- `Container start timeout (504)` → Cloudflare Containers cold start is taking
  >25s. Either capacity-constrained, or `max_instances` is too low. Check the
  Worker logs at https://dash.cloudflare.com/<account>/workers/services/view/meldar-sandbox-worker/production/observability.
- `404 on /api/v1/start` → the wrong worker is deployed (the spike, or an old
  version). Re-deploy from `apps/sandbox-worker/`.

**Do not proceed to Step 8 until the verify script passes.** A broken Worker
contract behind correctly-set env vars produces a workspace iframe that hangs
silently — much harder to debug after the fact.

---

## 8. Trigger a Vercel redeploy

Vercel does **not** automatically redeploy when env vars change. Trigger a
redeploy so the orchestrator process restarts and picks up the new env:

```bash
cd /Users/georgyskr/projects/pet/agentgate/apps/web
vercel --prod
```

Or via dashboard: Vercel project → Deployments → latest production deployment
→ ... menu → Redeploy → confirm "Use existing Build Cache" off (so the build
re-reads env at runtime).

After redeploy completes, the orchestrator will start calling the Worker on
real Build requests. Watch the Vercel function logs for the first user-driven
Build to confirm the live preview pipeline is wired:

```bash
vercel logs --since 10m
```

Look for:
- `[CloudflareSandboxProvider] start` lines (indicates the provider is being
  invoked, not skipped)
- No `prewarm failed silently` warnings (those indicate the worker is
  unreachable)
- Workspace iframe in the browser actually loads instead of showing the
  placeholder

---

## 9. Rollback procedure

If the Worker misbehaves and you need to disable the live-preview feature
**immediately** without redeploying the orchestrator code, remove the env
vars from Vercel. The orchestrator's `createSandboxProviderFromEnv()` returns
`null` when either var is unset (per `packages/orchestrator/src/deps.ts:74-79`),
and downstream code is built to gracefully degrade to "DB writes only, no
live preview" — workspace iframes will fall back to the placeholder, but
Builds will still complete and persist source files.

```bash
vercel env rm CF_SANDBOX_WORKER_URL production
vercel env rm CF_SANDBOX_WORKER_URL preview

cd /Users/georgyskr/projects/pet/agentgate/apps/web
vercel --prod    # redeploy so the new (absent) env vars take effect
```

You can leave `CF_SANDBOX_HMAC_SECRET` in place — without `CF_SANDBOX_WORKER_URL`,
the provider returns null regardless. Removing both is cleaner.

To re-enable, repeat Step 6.

If the issue is bad worker code (rather than infrastructure), roll back the
Worker itself instead:

```bash
cd /Users/georgyskr/projects/pet/agentgate/apps/sandbox-worker
pnpm exec wrangler deployments list
pnpm exec wrangler rollback <deployment-id-from-the-list>
```

Cloudflare keeps the last 10 deployments by default. The Vercel side does not
need a redeploy — the worker URL and HMAC secret are unchanged.

---

## 10. Cost estimate

Cloudflare's pricing for the Workers Paid plan + Containers (as of mid-2025
Cloudflare announcements; verify against the current pricing page before
launching):

| Component | Cost |
|---|---|
| Workers Paid base | $5/mo flat |
| Worker requests | 10M included, $0.30 per additional 1M |
| Worker CPU time | 30M ms included, $0.02 per additional 1M ms |
| Durable Objects requests | 1M included, $0.15 per additional 1M |
| Durable Objects duration | 400k GB-s included, $12.50 per additional 1M GB-s |
| Container compute (lite, ~1 vCPU, 512 MB) | ~$0.000020/sec while running |
| Container egress | $0.05/GB after 1 TB free tier |

**Per-user estimate (rough, based on the spike's measured behavior):**

- A typical Meldar session runs the sandbox for ~15-30 minutes of active use,
  most of that idle waiting on the user
- Cold start: ~2s @ $0.000020 = negligible
- Active sandbox time: 1800s × $0.000020 = **$0.036 per session**
- Worker requests per session: ~50 (start, prewarm, ~30 writes during a Build,
  status pings, stop) → negligible at the per-million tier
- DO duration: minimal — the DO is mostly delegating to the container

**Projected total at the founder's research-document estimate of 1000 active
users/month with ~5 sessions each:** ~$180/month in Cloudflare costs, plus
the $5 base. This is consistent with the spike README's `$0.36-0.40/user/mo`
projection.

**Watch points (set up Cloudflare billing alerts at):**
- $50/month (early warning)
- $200/month (investigate scaling)
- $500/month (something is wrong — runaway sandbox creation, missing idle
  cleanup, abuse)

You will not see real numbers until production traffic hits. The spike's
projection is informed-guesswork. Expect to revisit after the first 30 days
of real users.

---

## 11. After-the-fact: custom domain (wave-2, optional)

The default `*.workers.dev` URL works for MVP. For branded preview URLs
(`https://3001-project-abc.sandbox.meldar.ai`), you need to:

1. Add a wildcard CNAME `*.sandbox` → `meldar-sandbox-worker.<account>.workers.dev`
   to the meldar.ai DNS zone (or proxy through Cloudflare's DNS)
2. Add to `wrangler.jsonc`:
   ```jsonc
   "routes": [
     { "pattern": "*.sandbox.meldar.ai/*", "zone_name": "meldar.ai" }
   ]
   ```
3. Re-run `pnpm exec wrangler deploy`
4. Update `CF_SANDBOX_WORKER_URL` in Vercel from the workers.dev URL to
   `https://sandbox.meldar.ai` (or whatever bare domain you want orchestrator
   calls to hit)
5. Re-run the verify script
6. Vercel redeploy

This is purely cosmetic for the user-facing share-link. None of the contract
or HMAC details change.

---

## Quick command reference

```bash
# Generate HMAC secret
openssl rand 32 | base64 | tr '/+' '_-' | tr -d '=\n'

# Cloudflare
cd apps/sandbox-worker
pnpm install
pnpm exec wrangler login
pnpm exec wrangler secret put HMAC_SECRET
pnpm exec wrangler deploy
pnpm exec wrangler tail              # live worker logs

# Vercel
cd apps/web
vercel env add CF_SANDBOX_WORKER_URL production
vercel env add CF_SANDBOX_WORKER_URL preview
vercel env add CF_SANDBOX_HMAC_SECRET production
vercel env add CF_SANDBOX_HMAC_SECRET preview
vercel env ls
vercel --prod                         # redeploy

# Verify
cd apps/sandbox-worker
export CF_SANDBOX_WORKER_URL=...
export CF_SANDBOX_HMAC_SECRET=...
./scripts/verify-deployment.sh

# Rollback
vercel env rm CF_SANDBOX_WORKER_URL production
vercel env rm CF_SANDBOX_WORKER_URL preview
cd apps/web && vercel --prod
```
