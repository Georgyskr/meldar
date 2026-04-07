# Sandbox Worker — Secrets & Environment Variables

This document lists every secret and environment variable the production
sandbox worker integration requires, where each is set, and the exact
shape/format expected.

**Do NOT commit secret values to git.** The repo's `.gitignore` already
excludes `.env*` files — keep it that way. If you paste a secret into a
code comment or shell history by accident, rotate it immediately (see
"Rotation" at the bottom of this doc).

---

## The two variables

### 1. `CF_SANDBOX_WORKER_URL`
**What:** Base URL of the deployed Cloudflare Worker.

**Format:** HTTPS URL, no trailing slash, no path. Example:

```text
https://meldar-sandbox-worker.my-account.workers.dev
```

If using a custom domain (wave-2):

```text
https://sandbox.meldar.ai
```

**Where it's read:**
- Vercel orchestrator — `process.env.CF_SANDBOX_WORKER_URL` in
  `packages/orchestrator/src/deps.ts:75` via `createSandboxProviderFromEnv()`
- Allowlisted in `turbo.json` under `globalEnv` so Turbo knows it affects
  build inputs

**Where it's set:**
- Vercel dashboard / `vercel env add`, in **Production** and **Preview**
  environments only. NOT set in Development (local `pnpm dev` runs with
  `deps.sandbox === null` by design — the orchestrator degrades gracefully
  to "DB writes only, no live preview").

**Public or secret?** Technically public (it's just a URL, it will appear
in network logs from browser dev tools any time the worker returns a
preview URL on that domain). Treating it as non-secret is fine, but Vercel
stores it encrypted anyway — no reason to downgrade.

---

### 2. `CF_SANDBOX_HMAC_SECRET`
**What:** 32-byte shared secret used to HMAC-sign every request from the
orchestrator to the Worker. Proves the request came from the orchestrator
and wasn't forged, and that the request body wasn't tampered with in
flight.

**Format:** base64url-encoded 32-byte random value, no padding, no
slashes, no plus signs. Example (do not use this one):

```text
xK9_cN-aB7d2EfGhI3jKlMnOpQ4rS5tUvWxYz6A1B2C
```

**Length:** 43 characters. If you see 44 characters with a trailing `=`,
strip it — Wrangler's secret store tolerates the padding but it can
cause byte-mismatch bugs if you're comparing two secrets by eye.

**Generation command:**

```bash
openssl rand 32 | base64 | tr '/+' '_-' | tr -d '=\n'
```

**Where it's read:**
- Cloudflare Worker — `env.HMAC_SECRET` (see note below about the name
  mismatch)
- Vercel orchestrator — `process.env.CF_SANDBOX_HMAC_SECRET` in
  `packages/orchestrator/src/deps.ts:76`

**Where it's set:**
- **Cloudflare (Worker side):** `pnpm exec wrangler secret put HMAC_SECRET`
  run from `apps/sandbox-worker/`. The Worker reads it via `env.HMAC_SECRET`
  inside the fetch handler. This is the name expected by the production
  worker code per the contract doc at
  `packages/sandbox/src/cloudflare-provider.ts:28`.
- **Vercel (orchestrator side):** `vercel env add CF_SANDBOX_HMAC_SECRET production`
  and the same for `preview`. The orchestrator reads it via
  `process.env.CF_SANDBOX_HMAC_SECRET`.

> **Name mismatch is intentional.** The Vercel-side variable is
> `CF_SANDBOX_HMAC_SECRET` (namespaced to avoid colliding with other
> HMAC secrets in the monorepo). The Cloudflare-side secret is plain
> `HMAC_SECRET` because it lives in the Worker's isolated secret store
> and doesn't need namespacing. The **values** must be byte-identical;
> only the variable names differ by convention.

**Public or secret?** HIGHLY SECRET. Anyone with this value can:
- Forge signed requests to the Worker and boot/destroy any user's sandbox
- Write arbitrary files into any project's live preview
- Read preview URLs and exfiltrate in-progress work

Treat it like a database password. Never log it. Never echo it in CI.
Never check it into git or paste it into Slack.

**Allowlisted in `turbo.json`?** Yes — under `globalEnv`. Turbo needs
to know it affects build inputs so cache keys change when it changes.
This does not leak the value; Turbo only hashes the name.

---

## Setting up from scratch (exact commands)

```bash
# 1. Generate the shared secret ONCE and copy it to a secret store
SECRET=$(openssl rand 32 | base64 | tr '/+' '_-' | tr -d '=\n')
echo "store this in 1Password: $SECRET"

# 2. Set on Cloudflare Worker
cd /Users/georgyskr/projects/pet/agentgate/apps/sandbox-worker
printf '%s' "$SECRET" | pnpm exec wrangler secret put HMAC_SECRET
# (wrangler accepts secret value via stdin when piped)

# 3. Deploy the worker so the secret binding takes effect
pnpm exec wrangler deploy

# 4. Capture the worker URL from the deploy output
WORKER_URL="https://meldar-sandbox-worker.<your-account>.workers.dev"

# 5. Set both env vars on Vercel (production + preview)
cd /Users/georgyskr/projects/pet/agentgate/apps/web
printf '%s' "$WORKER_URL" | vercel env add CF_SANDBOX_WORKER_URL production
printf '%s' "$WORKER_URL" | vercel env add CF_SANDBOX_WORKER_URL preview
printf '%s' "$SECRET"     | vercel env add CF_SANDBOX_HMAC_SECRET production
printf '%s' "$SECRET"     | vercel env add CF_SANDBOX_HMAC_SECRET preview

# 6. Clear SECRET from the current shell so it's not in history
unset SECRET

# 7. Redeploy Vercel so the orchestrator picks up the new env
vercel --prod
```

---

## Verification (does the secret actually work?)

```bash
export CF_SANDBOX_WORKER_URL="https://meldar-sandbox-worker.<account>.workers.dev"
export CF_SANDBOX_HMAC_SECRET="<the secret you generated>"
cd /Users/georgyskr/projects/pet/agentgate/apps/sandbox-worker
./scripts/verify-deployment.sh
```

The script's Step 7 is an HMAC-tamper test — it sends a request with a
deliberately-wrong signature and asserts the worker returns 401. If
Step 7 passes while Step 1-6 also pass, you know the secrets match
between both ends.

---

## Rotation

If the secret is ever leaked (committed to git, pasted in Slack, shown in
a screenshot, etc.):

1. Generate a new secret:
   ```bash
   NEW_SECRET=$(openssl rand 32 | base64 | tr '/+' '_-' | tr -d '=\n')
   ```

2. Update Cloudflare first (the Worker will start rejecting the old secret
   immediately):
   ```bash
   cd apps/sandbox-worker
   printf '%s' "$NEW_SECRET" | pnpm exec wrangler secret put HMAC_SECRET
   ```

3. Update Vercel (Production AND Preview):
   ```bash
   vercel env rm CF_SANDBOX_HMAC_SECRET production
   vercel env rm CF_SANDBOX_HMAC_SECRET preview
   printf '%s' "$NEW_SECRET" | vercel env add CF_SANDBOX_HMAC_SECRET production
   printf '%s' "$NEW_SECRET" | vercel env add CF_SANDBOX_HMAC_SECRET preview
   ```

4. Redeploy Vercel:
   ```bash
   cd apps/web && vercel --prod
   ```

5. Expect a brief (10-60s) window during which in-flight Builds fail with
   HMAC errors. The orchestrator degrades to "no live preview" during this
   window, which is acceptable for rotation.

6. Unset the local shell variable:
   ```bash
   unset NEW_SECRET
   ```

**There is no zero-downtime rotation** — the worker has only one
`HMAC_SECRET` binding at a time. If you need zero-downtime, the worker
code would have to support accepting EITHER of two secrets during a
rotation window (and compare both on each request). That's a wave-2
feature — ship rotation-with-brief-downtime for MVP.

---

## Anti-patterns: things to never do

- **Never put `CF_SANDBOX_HMAC_SECRET` in any `.env` file** under version
  control. It must live in Vercel's encrypted env-var store and in
  Cloudflare's secret store — nowhere else on disk.
- **Never use the same secret across staging and production.** Generate
  separate secrets for each Cloudflare Worker environment (if you run
  a staging Worker) so a staging compromise doesn't open production.
- **Never echo the secret into CI logs.** If you're debugging in CI, log
  `echo "secret set: ${CF_SANDBOX_HMAC_SECRET:+YES}"` to confirm presence
  without exposing the value.
- **Never accept a secret that has shell-escaping special characters.**
  base64url (what the recommended command produces) is safe — no `$`,
  backtick, single-quote, or double-quote. If you use a different
  generator and get a secret with these characters, regenerate.
- **Never put `CF_SANDBOX_WORKER_URL` or `CF_SANDBOX_HMAC_SECRET` in
  `NEXT_PUBLIC_*`.** These are server-only values. The `NEXT_PUBLIC_`
  prefix would expose them to every browser that loads the Meldar
  frontend — total compromise.

---

## Quick reference table

| Variable | Where set | Where read | Format | Secret? |
|---|---|---|---|---|
| `HMAC_SECRET` (Cloudflare) | `wrangler secret put HMAC_SECRET` | `env.HMAC_SECRET` in worker.ts | base64url 32 bytes, 43 chars | YES |
| `CF_SANDBOX_WORKER_URL` (Vercel) | `vercel env add` prod + preview | `process.env.CF_SANDBOX_WORKER_URL` in `deps.ts` | HTTPS URL, no trailing slash | No (but stored encrypted) |
| `CF_SANDBOX_HMAC_SECRET` (Vercel) | `vercel env add` prod + preview | `process.env.CF_SANDBOX_HMAC_SECRET` in `deps.ts` | base64url 32 bytes, 43 chars | YES |

The Cloudflare `HMAC_SECRET` and the Vercel `CF_SANDBOX_HMAC_SECRET` must
contain **byte-identical** values. Different names, same value.
