# DevOps & Infrastructure Plan — Meldar PoC/MVP

**Authors:** DevOps Automator + Infrastructure Maintainer
**Date:** 2026-03-30
**Status:** Draft (Iteration 1)

---

## 1. Deployment Architecture

### Recommendation: Stay on Vercel. No separate backend.

**Why:**
- Meldar is a Next.js 16 App Router project. Vercel is the canonical deployment platform — zero-config, edge-optimized, automatic HTTPS, preview deployments per PR.
- The app has two API routes (`/api/subscribe`, `/api/analyze-screenshot`). Both are lightweight. Next.js API routes (serverless functions) handle this perfectly. There is no need for a separate Express/Fastify backend at PoC/MVP scale.
- Vercel Hobby plan is free and sufficient for early traffic (100 GB bandwidth, 100 GB-hours serverless, 6000 minutes build).
- Adding a separate backend service introduces deployment complexity, CORS management, and a second billing surface — none of which are justified at this stage.

**When to reconsider:**
- Long-running jobs (>60s serverless timeout on Hobby, 300s on Pro). The Claude Vision analysis may hit this if processing large images — if so, move to a background job pattern (see Section 10).
- WebSocket/real-time features (Chrome extension live tracking). Not needed for PoC/MVP.
- CPU-intensive workloads that exceed serverless limits.

**Architecture diagram (PoC):**
```
User → Vercel Edge Network → Next.js App
                                ├── Static pages (ISR/SSG)
                                ├── /api/subscribe → Resend API
                                ├── /api/analyze-screenshot → Anthropic API
                                └── Database reads/writes → Neon (Postgres)
```

---

## 2. Database Selection

### Recommendation: Neon Postgres (serverless)

**Comparison of free tiers:**

| Service | Free Tier | Storage | Compute | Branching | Edge/Serverless | Notes |
|---------|-----------|---------|---------|-----------|-----------------|-------|
| **Neon** | Forever free | 512 MB | 0.25 vCPU, auto-suspend | Yes (dev branches) | Native serverless driver | Best DX for Next.js |
| Vercel Postgres | Powered by Neon | 256 MB | Shared | No | Yes | Less storage, Vercel lock-in |
| Supabase | Free tier | 500 MB | Shared | No | Yes (via edge functions) | More features than needed (auth, storage, realtime) |
| PlanetScale | No free tier (removed 2024) | N/A | N/A | N/A | N/A | Not viable at $0 |

**Why Neon:**
1. **Serverless-native** — connections scale to zero when idle (no cost when nobody uses the app). Perfect for a PoC that may have sporadic traffic.
2. **Branching** — create a database branch per PR for isolated testing. Free tier includes branches.
3. **Postgres** — industry standard. No lock-in. Easy to migrate to any Postgres host later (Supabase, RDS, self-hosted).
4. **`@neondatabase/serverless`** — HTTP-based driver that works in Vercel Edge Runtime and serverless functions without connection pooling hassles.
5. **512 MB free** — more than enough for PoC/MVP. Email signups + quiz results + screenshot analyses won't approach this for thousands of users.
6. **Drizzle ORM** — pair with Drizzle for type-safe queries and migrations. Lightweight, no runtime overhead, perfect for Next.js.

**What to store:**
- Subscribers (email, timestamp, consent status, referral source)
- Quiz responses (selected pain points, timestamp, optional user link)
- Screenshot analysis results (extracted data, insight text, timestamp — NOT the image itself)
- User accounts (when auth is added for MVP)

**Migration strategy:**
- Use Drizzle Kit for schema migrations (`drizzle-kit push` for dev, `drizzle-kit migrate` for prod)
- Migration files checked into git under `drizzle/` directory

---

## 3. File Storage

### Recommendation: In-memory processing only (PoC). Vercel Blob for MVP.

**PoC approach — no persistent storage:**
- Screen Time screenshots are uploaded to `/api/analyze-screenshot`
- The serverless function receives the file as `FormData`, reads it into a `Buffer`, sends the base64-encoded image directly to Claude Vision API, returns the result, and discards the image
- No file ever hits disk or object storage
- This is the simplest, cheapest, and most GDPR-compliant approach — the image exists only in memory during the API call

**Why not store screenshots:**
- GDPR risk: screenshots may contain personal data (app names, notification previews). Storing them creates data controller obligations.
- The user promise is "Meldar doesn't watch you. You show Meldar." Ephemeral processing reinforces this.
- No business need to retain the raw image — only the extracted analysis matters.

**MVP approach — Vercel Blob (when needed):**
- If we need to store files later (e.g., Google Takeout uploads for async processing), use Vercel Blob
- Free tier: 500 MB storage, 1 GB bandwidth/month
- Automatic CDN, signed URLs for private files, TTL-based auto-deletion
- Alternative: Cloudflare R2 (10 GB free, no egress fees) if Vercel Blob limits are hit

**Screenshot flow (PoC):**
```
Upload (client) → FormData POST → /api/analyze-screenshot
  → Buffer in memory → base64 encode → Claude Vision API
  → Return JSON result → Buffer garbage collected
  → Image never stored
```

---

## 4. CI/CD Pipeline

### Recommendation: GitHub Actions (lightweight) + Vercel auto-deploy

**Current state:** Vercel auto-deploys from `main` branch. No CI checks. No PR previews configured explicitly (Vercel does this by default for connected repos).

**Proposed pipeline:**

#### On Pull Request (`pull_request` → `main`):

```yaml
name: CI
on:
  pull_request:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm biome check .          # Lint + format
      - run: pnpm panda codegen           # Ensure styled-system is up to date
      - run: pnpm build                   # Type-check + build verification
      # Future: pnpm test (when tests exist)
```

**Why these checks:**
- `biome check` — catches lint/format issues before review. Fast (<5s).
- `panda codegen` — ensures generated CSS utilities match the config. Prevents "works on my machine" styled-system drift.
- `pnpm build` — catches TypeScript errors, broken imports, RSC violations. This is the most important check since there are no tests yet.

#### On merge to `main`:
- Vercel auto-deploys to production. No additional GitHub Action needed.
- Vercel provides instant rollback if a deploy breaks.

#### Future additions (MVP):
- Database migration check (`drizzle-kit check` to validate schema)
- Lighthouse CI (performance budget: LCP < 2.5s, CLS < 0.1)
- Dependency audit (`pnpm audit`)
- E2E smoke test (Playwright: load homepage, submit email, run quiz)

**Estimated CI time:** ~90 seconds per PR (pnpm install cached: 10s, biome: 3s, codegen: 5s, build: 60s).

**Cost:** GitHub Actions free tier: 2,000 minutes/month. At 10 PRs/day, ~15 min/day = ~450 min/month. Well within limits.

---

## 5. Monitoring & Alerting

### PoC (free, zero-config):

| What | Tool | Cost | Notes |
|------|------|------|-------|
| **Web analytics** | Vercel Analytics (free tier) | $0 | Real user metrics, Web Vitals. Complement GA4. |
| **Error tracking** | Sentry (free tier) | $0 | 5K errors/month. `@sentry/nextjs` SDK. Source maps. |
| **Uptime monitoring** | Better Stack (free tier) | $0 | 5 monitors, 3-min interval. Alert on meldar.ai down. |
| **Serverless logs** | Vercel Logs (built-in) | $0 | Real-time function logs. 1-hour retention on Hobby. |
| **Build monitoring** | Vercel Deploy Notifications | $0 | Slack/email on failed deploys. |

### What to monitor:

1. **Availability** — Is meldar.ai responding? (Better Stack, 3-min checks)
2. **Error rate** — Are API routes throwing? (Sentry, alert on >5 errors/hour)
3. **Performance** — Core Web Vitals regression? (Vercel Analytics, weekly review)
4. **API latency** — `/api/subscribe` and `/api/analyze-screenshot` p95 response time (Sentry performance)
5. **Business metrics** — Signup count, quiz completion rate (GA4 custom events, already in place)

### Alerting channels:
- **Sentry** → Email to founder (gosha.skryuchenkov@gmail.com)
- **Better Stack** → Email + optional Telegram bot
- **Vercel** → Deploy failure email (automatic)

### MVP additions:
- Sentry Performance Monitoring (traces for API routes)
- Custom Sentry alerts: screenshot analysis failures, Resend API errors
- Weekly Vercel Analytics digest

---

## 6. Environment Management

### Strategy: Two environments (dev + prod). No staging for PoC.

**Why no staging:**
- Vercel preview deployments serve as per-PR staging. Every PR gets a unique URL for manual testing.
- A dedicated staging environment adds cost and maintenance for zero benefit at this scale.
- When traffic/team grows, add staging as a Vercel project environment.

### Environment setup:

| Environment | Branch | URL | Database | Purpose |
|-------------|--------|-----|----------|---------|
| **Production** | `main` | meldar.ai | Neon `main` branch | Live users |
| **Preview** | PR branches | `*.vercel.app` | Neon `preview` branch | PR testing |
| **Local dev** | Any | localhost:3000 | Neon `dev` branch (or local Postgres via Docker) | Development |

### Environment variables:

**Current:**
```
NEXT_PUBLIC_GA_ID=G-5HB6Q8ZVB8    # Client-side
RESEND_API_KEY=re_xxx              # Server-side
```

**To add:**
```
DATABASE_URL=postgresql://...       # Server-side, Neon connection string
ANTHROPIC_API_KEY=sk-ant-...        # Server-side, Claude Vision API
SENTRY_DSN=https://xxx@sentry.io/yyy  # Client+Server, Sentry error reporting
SENTRY_AUTH_TOKEN=sntrys_xxx        # CI only, for source map uploads
```

### Variable management:
- **Vercel dashboard** → production and preview environment variables. This is the source of truth.
- **`.env.local`** → local development only. In `.gitignore` (already is by default in Next.js).
- **`.env.example`** → checked into git. Lists all required variables with placeholder values. No secrets.
- **GitHub Secrets** → CI variables (if GitHub Actions needs to run migrations or upload source maps).

### Rules:
- Never put secrets in code or `CLAUDE.md`. The `RESEND_API_KEY=re_xxx...` placeholder in CLAUDE.md is fine (it's a placeholder), but real keys live only in Vercel/GitHub Secrets.
- `NEXT_PUBLIC_*` prefix = exposed to browser bundle. Only use for non-sensitive values.
- Rotate API keys quarterly. Document rotation date in a private doc.

---

## 7. Security Checklist

### Already in place (good):
- [x] HTTPS everywhere (Vercel automatic)
- [x] `X-Content-Type-Options: nosniff` (next.config.ts)
- [x] `X-Frame-Options: DENY` (next.config.ts)
- [x] `Strict-Transport-Security` with preload (next.config.ts)
- [x] `Referrer-Policy: strict-origin-when-cross-origin` (next.config.ts)
- [x] `Permissions-Policy` disabling camera/mic/geo (next.config.ts)
- [x] GDPR cookie consent gating GA4
- [x] Server-side API keys not exposed to client

### To add (PoC):
- [ ] **Content Security Policy (CSP)** — add to `next.config.ts` headers. Allow `self`, Google Analytics domains, Sentry. Block inline scripts (use nonces).
- [ ] **Rate limiting on API routes** — use Vercel Edge Middleware + `@upstash/ratelimit` with Upstash Redis (free tier: 10K commands/day). Protect `/api/subscribe` (10 req/min per IP) and `/api/analyze-screenshot` (5 req/min per IP).
- [ ] **Input validation** — already using Zod for email. Add Zod schema validation to screenshot upload (file type, max size 10 MB).
- [ ] **CORS** — restrict API routes to `meldar.ai` origin only. Next.js API routes don't have CORS by default (same-origin), but add explicit headers if we ever expose APIs.
- [ ] **Dependency scanning** — `pnpm audit` in CI. Fix critical/high vulnerabilities before merge.

### To add (MVP):
- [ ] **Authentication** — when user accounts are added. Recommendation: Clerk (free tier: 10K MAU) or NextAuth.js (self-hosted, free).
- [ ] **CSRF protection** — Next.js Server Actions have built-in CSRF tokens. For API routes, validate `Origin` header.
- [ ] **API key rotation** — quarterly rotation for Resend, Anthropic, Sentry keys. Document process.
- [ ] **Secrets scanning** — GitHub secret scanning (free for public repos, or use `gitleaks` in CI).

### GDPR-specific security:
- [ ] **Data Processing Agreement** — needed with Neon (database), Resend (email), Anthropic (AI), Vercel (hosting), Sentry (error tracking). Most have standard DPAs on their websites.
- [ ] **Data retention policy** — define how long subscriber data, quiz results, and analysis results are kept. Implement automatic deletion after retention period.
- [ ] **Right to erasure** — build an admin endpoint or script to delete all data for a given email address.
- [ ] **Data export** — build an endpoint for users to download their data (GDPR Article 20).

---

## 8. Backup & DR

### What needs backing up:

| Data | Location | Backup Strategy | Recovery |
|------|----------|----------------|----------|
| **Source code** | GitHub | Git history (inherent) | Clone from GitHub |
| **Database** | Neon Postgres | Neon automatic PITR (7-day, free tier) | Restore from Neon dashboard |
| **Environment variables** | Vercel dashboard | Manual export to encrypted file (quarterly) | Re-enter in Vercel |
| **DNS records** | Domain registrar | Screenshot/document in private doc | Re-configure manually |
| **Email templates** | In source code | Git history | Redeploy |

### What does NOT need backing up:
- Uploaded screenshots (ephemeral, never stored)
- Build artifacts (regenerated on deploy)
- Vercel logs (transient, not critical data)
- Node modules / lockfile (regenerated from `pnpm-lock.yaml`)

### Disaster Recovery:
- **App goes down:** Vercel has built-in redundancy. If a deploy breaks, instant rollback via Vercel dashboard (one click).
- **Database corrupted:** Neon PITR — restore to any point in the last 7 days. Free tier.
- **GitHub goes down:** Git is distributed — local clones are full backups. For extended outages, push to a secondary remote (GitLab, Codeberg).
- **Vercel goes down:** The app is a standard Next.js project. Deploy to Netlify, Railway, or Cloudflare Pages with minimal config changes. No vendor lock-in beyond some Vercel-specific features (Blob, Analytics).
- **DNS/domain issue:** TTL set low enough (300s) for fast propagation. Keep registrar login credentials secure.

### Recovery Time Objectives:
- **App down (Vercel issue):** Target <5 min (Vercel rollback)
- **Bad deploy:** Target <2 min (Vercel instant rollback)
- **Database recovery:** Target <30 min (Neon PITR)
- **Full platform migration:** Target <4 hours (re-deploy to alternative platform)

---

## 9. Cost Breakdown

### Monthly cost by user count:

#### At 0-50 users (PoC):

| Service | Tier | Monthly Cost |
|---------|------|-------------|
| Vercel | Hobby (free) | $0 |
| Neon Postgres | Free | $0 |
| GitHub Actions | Free (2K min) | $0 |
| Resend | Free (100 emails/day) | $0 |
| Anthropic API | Pay-per-use | ~$0-5 (est. 50 screenshots/month at ~$0.05/call) |
| Sentry | Free (5K errors) | $0 |
| Better Stack | Free (5 monitors) | $0 |
| Upstash Redis | Free (10K cmd/day) | $0 |
| Vercel Analytics | Free tier | $0 |
| **Total** | | **~$0-5/month** |

#### At 100 users:

| Service | Tier | Monthly Cost |
|---------|------|-------------|
| Vercel | Hobby (free) | $0 |
| Neon Postgres | Free (512 MB) | $0 |
| GitHub Actions | Free | $0 |
| Resend | Free (if <100/day, else $20/mo) | $0-20 |
| Anthropic API | ~200 screenshots/month | ~$10 |
| Sentry | Free | $0 |
| Upstash Redis | Free | $0 |
| **Total** | | **~$10-30/month** |

#### At 1,000 users:

| Service | Tier | Monthly Cost |
|---------|------|-------------|
| Vercel | Pro ($20/member) | $20 |
| Neon Postgres | Launch ($19/mo, 10 GB) | $19 |
| GitHub Actions | Free (may need more minutes) | $0 |
| Resend | Growth tier ($35/mo, 50K emails) | $35 |
| Anthropic API | ~2,000 screenshots/month | ~$100 |
| Sentry | Team ($26/mo) | $26 |
| Upstash Redis | Pay-as-you-go | ~$5 |
| **Total** | | **~$205/month** |

### Key insight:
- Anthropic API is the biggest variable cost. Optimize by: caching common screenshot patterns, setting per-user daily limits, compressing images before sending.
- At 1,000 users, the app is generating revenue (pricing tiers exist). $205/month is well within viable unit economics.
- The jump from $0 to $205 happens gradually — each service upgrades independently as its free tier is exhausted.

---

## 10. Scaling Path

### Phase 1: Free tier (0-100 users) — Current + PoC
- Vercel Hobby, Neon Free, all free tiers
- No changes needed from current setup beyond adding DB and monitoring

### Phase 2: Paid basics (100-1,000 users) — MVP
- **Vercel Pro** ($20/mo) — higher limits, team features, longer log retention
- **Neon Launch** ($19/mo) — more storage, compute, longer PITR retention
- **Resend paid** — higher email volume
- **Consider:** Edge Middleware for rate limiting, Vercel Cron for scheduled jobs

### Phase 3: Growth (1,000-10,000 users)
- **Vercel Enterprise or alternative** — evaluate cost. At this scale, may be cheaper to deploy on Railway, Fly.io, or AWS Amplify.
- **Neon Scale** or migrate to **Supabase** (if auth/storage features needed) or **AWS RDS** (if raw Postgres is enough)
- **Background jobs** — for Google Takeout processing and Chrome extension data. Options:
  - Inngest (serverless background jobs, free tier exists)
  - Upstash QStash (HTTP-based message queue, pairs with serverless)
  - BullMQ on Railway (if we need a persistent worker)
- **CDN/caching** — Vercel Edge caching is automatic. Add Redis caching (Upstash) for API responses.
- **Multi-region** — Neon supports read replicas. Deploy database closer to users if expanding beyond Europe.

### Phase 4: Scale (10,000+ users)
- **Dedicated infrastructure** — consider Kubernetes (EKS/GKE) only if the monolith architecture becomes a bottleneck
- **Terraform/Pulumi** — infrastructure as code when managing multiple services
- **Observability upgrade** — Datadog or Grafana Cloud for unified metrics, logs, traces
- **Compliance** — SOC 2 Type II if targeting enterprise customers

### What does NOT need to change when scaling:
- The Next.js application code (same codebase works at any scale)
- The database schema (Postgres scales vertically first, then read replicas)
- The CI/CD pipeline (same GitHub Actions, just add checks)
- The deployment model (Vercel handles scaling automatically up to Phase 3)

---

## 11. PoC vs MVP Boundary

### PoC Infrastructure (build in a day):

| Component | Implementation | Effort |
|-----------|---------------|--------|
| Hosting | Vercel Hobby (already done) | 0 |
| Database | Neon free + Drizzle ORM | 2-3 hours |
| File storage | In-memory only (no storage) | 0 |
| CI/CD | GitHub Actions (lint + build) | 30 min |
| Monitoring | Sentry free + Better Stack | 1 hour |
| Rate limiting | Upstash Redis + middleware | 1 hour |
| Env management | Vercel dashboard + `.env.example` | 30 min |
| **Total** | | **~5-6 hours** |

### MVP Infrastructure (adds to PoC):

| Component | Implementation | Effort |
|-----------|---------------|--------|
| Authentication | Clerk or NextAuth.js | 4-6 hours |
| Database migrations | Drizzle Kit automated in CI | 1-2 hours |
| File storage | Vercel Blob (for Takeout uploads) | 2-3 hours |
| Background jobs | Inngest or QStash (Takeout processing) | 4-6 hours |
| E2E tests | Playwright smoke tests in CI | 3-4 hours |
| CSP headers | Strict CSP with nonces | 2-3 hours |
| GDPR endpoints | Data export + deletion | 3-4 hours |
| Lighthouse CI | Performance budgets | 1-2 hours |
| **Total** | | **~20-30 hours** |

### The dividing line:
- **PoC = enough to collect real user data and validate the product hypothesis.** Users can sign up, take the quiz, upload a screenshot, and see results. Data is stored in a database. Errors are tracked. The site doesn't go down silently.
- **MVP = enough to charge money.** Users have accounts, their data persists, they can export/delete it, background processing works, and the infrastructure is reliable enough to support paying customers.

---

## Open Questions for Other Teams

1. **Backend/API team:** What's the expected payload size for Google Takeout uploads? This affects file storage and serverless function timeout decisions.
2. **Frontend team:** Are there any planned real-time features (live updates, WebSocket connections) that would affect the deployment model?
3. **Product team:** What's the data retention policy? How long do we keep quiz results and analysis data?
4. **Security team:** Do we need SOC 2 or any specific compliance certifications for the MVP, or is GDPR sufficient?
5. **Business team:** At what user count do we expect to start charging? This determines when we need to upgrade from free tiers.

---

## Summary of Recommendations

| Decision | Recommendation | Rationale |
|----------|---------------|-----------|
| Hosting | Stay on Vercel | Zero-config, free, scales automatically |
| Database | Neon Postgres | Serverless, free branching, standard Postgres |
| ORM | Drizzle | Type-safe, lightweight, great migration tooling |
| File storage | In-memory (PoC), Vercel Blob (MVP) | GDPR-safe, simplest approach |
| CI/CD | GitHub Actions + Vercel auto-deploy | Free, fast, covers lint/build/deploy |
| Error tracking | Sentry | Industry standard, free tier sufficient |
| Uptime | Better Stack | Free, simple, reliable |
| Rate limiting | Upstash Redis + Edge Middleware | Free tier, serverless-native |
| Auth (MVP) | Clerk or NextAuth.js | Evaluate when auth is needed |
| Background jobs (MVP) | Inngest or QStash | Serverless-native, no infra to manage |
