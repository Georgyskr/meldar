# Cross-Review: DevOps & Infrastructure Perspective

**Reviewer:** DevOps Automator + Infrastructure Maintainer
**Date:** 2026-03-30
**Status:** Iteration 2 — Cross-review feedback (amended with founder priority override)

---

## 1. Architecture Draft Review

### Agreements

- **Modular monolith on Next.js.** Fully aligned. One deployment surface, one billing surface, one repo. This is the only sane choice for a 1-2 person team. From an ops perspective, a modular monolith means one CI pipeline, one deploy, one set of logs, one error tracker. Microservices at this scale would quadruple operational overhead for zero benefit.
- **Neon Postgres with Drizzle.** Strong alignment with our draft. Both teams independently arrived at Neon for the same reasons: true serverless (scales to zero), EU region (Frankfurt), database branching for preview environments. The database schema looks well-normalized and the indexes are appropriate.
- **Auth.js over Clerk.** Agreed from a cost and independence perspective. Auth.js at $0 vs Clerk at $25/mo at 1K MAU. The trade-off is more manual setup, but that's a one-time cost.
- **ADR-007 (Process-and-Discard).** Architecturally enforced privacy is exactly what we want. This makes GDPR compliance an infrastructure property rather than a policy obligation.
- **REST-ish Route Handlers.** Simple, no extra abstraction layer. From a DevOps perspective, this means standard HTTP monitoring, no special tooling for tRPC or GraphQL introspection.

### Challenges

- **"No database for PoC" contradicts multiple requirements.** Architecture says "No database -- results stored in-memory or localStorage (client-side)" for PoC. But:
  - Business wants Stripe checkout in PoC (for paid Time Audits). Stripe webhooks need somewhere to land. You can't confirm a payment without persisting the confirmation somewhere. localStorage is client-side only -- the webhook arrives server-side.
  - Frontend wants shareable X-Ray URLs (`/xray/[id]`). If results are client-only, there's nothing to serve when someone else opens that link.
  - **Recommendation:** Add Neon Postgres from PoC day 1. It's free, it takes 2-3 hours to set up with Drizzle, and it eliminates an entire class of "where does this data live?" problems. The overhead is negligible; the benefit is that Stripe webhooks, shareable URLs, and basic analytics all work properly.

- **Inngest for MVP background jobs -- operational complexity assessment.** Architecture proposes Inngest for Takeout parsing and chained LLM analysis. From a DevOps perspective:
  - **Free tier:** 5,000 runs/month. Sufficient for MVP. But "runs" = individual step executions, not jobs. A 3-step Takeout pipeline (parse -> analyze -> notify) costs 3 runs per user upload.
  - **Operational surface:** Inngest runs as a serverless integration with Vercel. No separate infrastructure to manage. However, it's another vendor dependency with its own dashboard, its own failure modes, and its own alerting.
  - **Recommendation:** Architecture's own suggestion is correct -- start with Vercel Cron only for PoC. Add Inngest only when Takeout parsing actually hits the 60s timeout. But I'd go further: for MVP, consider Upstash QStash instead of Inngest. QStash is simpler (HTTP-based message queue, no SDK, no step functions), already free-tier-compatible, and we're already proposing Upstash Redis for rate limiting. One vendor for two needs is better than two vendors for two needs.

- **Vercel Blob for temp file staging.** Architecture says "All uploads get a signed URL with 1-hour TTL. After processing, the blob is deleted." This contradicts our draft's recommendation of in-memory-only processing. The question is: **does the screenshot need to be staged in Blob before processing?**
  - If the serverless function receives the image, processes it in memory, and calls Claude Vision -- no Blob needed. The file never leaves the function's memory. This is simpler, cheaper, and more GDPR-friendly.
  - If the processing might exceed the serverless function's memory limit (Vercel: 1024 MB on Hobby, 3008 MB on Pro) -- then Blob staging makes sense.
  - A Screen Time screenshot is typically 500KB-3MB. In-memory processing is fine.
  - **Google Takeout ZIPs can be 2+ GB.** Blob staging is needed here, but that's MVP, not PoC.
  - **Recommendation:** PoC = in-memory only (no Blob). MVP = Blob for Takeout only, with TTL-based auto-deletion.

### Answers to Architecture's Open Questions

**Q3: "Vercel function timeout is 60s on Pro. Google Takeout ZIPs can be 2GB. Do we need Inngest from day 1, or can we limit accepted ZIP size for MVP?"**

**A:** Limit accepted ZIP size to 500 MB for MVP, with a message: "For larger exports, contact us." This avoids the Inngest dependency entirely for the first MVP iteration. If 500 MB is too small (unlikely -- most personal Takeout exports for Chrome + YouTube + Calendar are under 200 MB), add Inngest or QStash as a background job layer. But don't add it speculatively.

Additionally, the architecture's own plan says Takeout is parsed client-side (JSZip in the browser). If parsing happens client-side and only aggregated signals are sent server-side, the server never handles the 2 GB ZIP at all. The 60s timeout doesn't apply to the raw ZIP -- it only applies to the small JSON payload of aggregated data. This is the approach I'd strongly recommend: **client-side parsing eliminates the server-side file handling problem entirely.**

### Revisions to DevOps Plan

1. **Add Neon Postgres to PoC scope** (was already there, but reinforce: it's not optional if Stripe webhooks or shareable URLs exist).
2. **Replace Inngest recommendation with QStash** for background jobs in MVP. Consolidate on Upstash as a single vendor for rate limiting + job queuing.
3. **Clarify Vercel Blob:** Not needed for PoC. Only needed for MVP if server-side file staging is required (Takeout). Likely not needed if Takeout is parsed client-side.

---

## 2. AI/ML Pipeline Draft Review

### Agreements

- **Haiku 4.5 for screenshot OCR.** Correct model choice. Cost-optimal, fast, and vision-capable. The AI team's cost analysis ($0.002-0.003/screenshot) is well-researched and aligns with our cost projections.
- **Rule-based insights for PoC.** No second LLM call for insights. Templates are predictable, instant, and free. This is the right call for PoC -- it keeps the infrastructure simple (one external API call per screenshot, not two).
- **Process-and-discard for images.** Full alignment. The AI team's data flow diagram makes it clear: image in memory -> Claude Vision -> JSON out -> image garbage collected. Perfect from a GDPR and infrastructure perspective.
- **Prompt caching for cost reduction.** The system prompt is static, so Anthropic's automatic prompt caching gives a ~50% discount on input tokens after the first call. No infrastructure work needed -- it's automatic.
- **Structured output via tool_use.** Using Claude's tool_use/function_calling for JSON schema enforcement is better than regex parsing. It reduces error handling complexity in the API route.

### Challenges

- **`sharp` in Vercel serverless functions.** This is the biggest operational concern in the AI draft. The AI team proposes using `sharp` for image preprocessing (resize, compress) before sending to Claude Vision.
  - **Bundle size:** `sharp` is a native binary (~30-50 MB depending on platform). Vercel serverless functions have a 250 MB bundle limit. `sharp` alone consumes 12-20% of that budget. With Next.js, node_modules, and the rest of the app, this is a real constraint.
  - **Cold start impact:** Native binaries increase cold start time. On Vercel serverless, cold starts with `sharp` are typically 500-1500ms longer than without it. For a screenshot upload that already takes 3-5 seconds (including Claude Vision API call), this adds meaningful latency.
  - **Runtime compatibility:** `sharp` requires the Node.js runtime, not the Edge runtime. The API route must use `export const runtime = 'nodejs'` (this is the default for route handlers, so it works, but it excludes Edge Runtime benefits).
  - **Alternative 1: Browser-side resize.** Before uploading, resize the image in the browser using Canvas API or a library like `browser-image-compression`. This is zero-cost server-side, eliminates the `sharp` dependency entirely, and the client's CPU does the work. The trade-off: slightly less reliable compression quality, but for a Screen Time screenshot (text on a solid background), Canvas resize is more than adequate.
  - **Alternative 2: `@vercel/og` / Satori already bundles WASM-based image handling.** But this doesn't help with arbitrary image resize.
  - **Alternative 3: Skip preprocessing.** Claude Vision handles images up to 1568px on the longest edge. If the user's screenshot is already within this range (most phone screenshots are 1170x2532 for iPhone 15 -- exceeds the limit), we'd be sending more image tokens than necessary. But the cost difference is ~$0.001-0.002 per image. At 100 users, that's $0.10-0.20/month in wasted tokens vs. the operational complexity of `sharp`.
  - **Recommendation:** Use browser-side image compression (Alternative 1) for PoC. The AI team gets their preprocessing without any server-side dependency. If browser-side quality proves insufficient (unlikely for text-heavy screenshots), revisit `sharp` for MVP.

- **$50/day cost ceiling monitoring.** The AI team proposes a daily cost ceiling with tracking via "a simple KV store (Vercel KV or in-memory for PoC)." From a DevOps perspective:
  - **In-memory tracking doesn't work.** Vercel serverless functions are stateless. Each invocation gets a fresh memory space. An in-memory counter resets on every cold start and doesn't share state across concurrent function instances.
  - **Vercel KV is Upstash Redis.** This aligns with our rate limiting recommendation (Upstash Redis). Use the same Upstash Redis instance for both rate limiting and cost tracking. One `INCRBYFLOAT` call per API invocation to track daily spend. One `GET` call to check the budget. Both are sub-millisecond operations.
  - **Anthropic doesn't have real-time spend alerts.** The Anthropic dashboard shows usage, but there's no webhook or API for "alert me when spend exceeds $X." The cost ceiling must be self-implemented.
  - **Implementation:** On each Claude API call, calculate the approximate cost from the `usage` field in the API response (input_tokens, output_tokens). Write this to Upstash Redis with a key like `cost:2026-03-30` and a TTL of 48 hours. Before each call, check if the daily total exceeds the ceiling. If yes, return a 503 to the user.
  - **Recommendation:** Use Upstash Redis (already proposed for rate limiting) for cost tracking. This gives us rate limiting, cost ceilings, and potentially session counters from a single free-tier service.

- **Image preprocessing adds server-side latency.** If we do keep `sharp` (or any server-side preprocessing), the API route flow becomes: receive file -> resize/compress -> base64 encode -> Claude API call. The resize step adds 200-500ms. Combined with Claude Vision latency (1-3s), the total endpoint latency is 1.5-4s. This is within the UX team's 3-5s target but leaves little headroom.
  - **Recommendation:** Measure actual Claude Vision latency with unprocessed vs. preprocessed images. If the token savings don't meaningfully reduce Claude's response time, skip preprocessing entirely and save the complexity.

### Answers to AI Team's Open Questions

**Q1: "Anthropic API key management: Vercel environment variables? Secrets manager?"**

**A:** Vercel environment variables. This is the standard for Vercel-deployed apps. The key is stored encrypted at rest in Vercel's dashboard, injected as an environment variable at runtime, and never exposed to the client (no `NEXT_PUBLIC_` prefix). No additional secrets manager needed at PoC/MVP scale. If we later need key rotation automation or audit trails, consider Doppler or HashiCorp Vault, but that's a post-MVP concern.

**Q2: "Monitoring: How do we track API costs in real-time?"**

**A:** Two-layer approach:
1. **Approximate real-time:** Self-tracked via Upstash Redis. Each API call logs its cost (calculated from the `usage` response field). A simple admin page or API endpoint queries the daily/weekly/monthly totals.
2. **Authoritative monthly:** Anthropic dashboard + monthly invoice. Reconcile the self-tracked numbers against the actual invoice monthly.

We don't need a third-party LLM cost tracker (like Helicone or LangSmith) at PoC scale. The self-tracked numbers are accurate enough for cost ceilings and budgeting. Add a dedicated observability layer when we have multiple AI pipelines (chat discovery + Takeout analysis + skill automations).

**Q3: "Should we set up a staging environment with a separate (lower-limit) API key?"**

**A:** Yes, but it's simple. Create a second Anthropic API key with a lower rate limit (or just set a lower daily cost ceiling in Upstash for the preview environment). Use Vercel's environment variable scoping: set `ANTHROPIC_API_KEY` to the production key for the Production environment and a separate key for the Preview environment. Total setup time: 5 minutes. Total ongoing cost: $0 (unused API keys don't cost anything).

### Revisions to DevOps Plan

1. **Consolidate Upstash Redis usage:** rate limiting + cost ceiling tracking + (optionally) session counters. One free-tier service, three use cases.
2. **Add browser-side image compression to CI/CD considerations:** If we go with client-side preprocessing, the build pipeline doesn't need to handle `sharp` native binaries. This simplifies the CI step.
3. **Add AI cost monitoring to the monitoring section:** Upstash-based daily cost tracking with a simple query endpoint.
4. **Add separate Anthropic API key for preview environments** to environment management section.

---

## 3. Frontend & UX Draft Review

### Agreements

- **PoC routes don't require auth.** Fully aligned. No auth wall before value delivery. This simplifies the infrastructure: no auth provider, no session store, no middleware for PoC.
- **Mobile-first responsive design.** No infra impact, but the performance budget (LCP < 2.5s, JS < 100KB gzip) is relevant. Vercel's Edge Network and Next.js RSC patterns make this achievable without special infrastructure.
- **Dynamic OG images via `next/og`.** The existing `src/app/og/` directory pattern uses Edge Runtime with Satori. This is zero-cost on Vercel (runs at the edge, cached automatically). No infrastructure concern.
- **`html-to-image` for Save as Image.** Client-side rendering. Zero server cost. Good choice.
- **Shareable X-Ray URLs (`/xray/[id]`).** This confirms the need for a database in PoC (reinforcing the point made in the Architecture review). The X-Ray result must be persisted server-side for the link to work.

### Challenges

- **X-Ray result storage for shareable URLs.** Frontend proposes `localStorage` for PoC with "short-lived server storage with a shareable UUID." This is vague. Clarification:
  - `localStorage` is client-only. It can't serve content when someone else opens `/xray/[id]`.
  - "Short-lived server storage" means... what? Vercel KV? Postgres? In-memory cache?
  - **Recommendation:** Use Neon Postgres from PoC day 1. Store X-Ray results as a row in `screentime_analyses` with a UUID primary key. The `/xray/[id]` page is a simple server component that queries the database. Auto-delete after 30 days via a Vercel Cron job or a `expires_at` column with periodic cleanup. This is the simplest, most reliable approach and costs exactly $0 on Neon's free tier.

- **Auto-delete after 30 days (GDPR for anonymous results).** The frontend mentions 30-day auto-deletion for ephemeral X-Ray results. This needs a scheduled cleanup mechanism:
  - **Option A: Vercel Cron.** A daily cron job (`/api/cron/purge`) that deletes rows where `created_at < now() - 30 days`. Simple, free, reliable.
  - **Option B: Postgres TTL index.** Set `expires_at` on each row and have the cron job delete `WHERE expires_at < now()`. More flexible (different TTLs per record type).
  - **Recommendation:** Option B. It's marginally more work upfront but supports different retention policies for different data types later (e.g., 30 days for anonymous X-Rays, indefinite for authenticated user data).

- **Performance budget enforcement in CI.** Frontend sets targets (LCP < 2.5s, CLS < 0.1, JS < 100KB). From DevOps perspective:
  - **PoC:** Don't block merges on Lighthouse scores. Run Lighthouse CI as an informational check in GitHub Actions. Report the numbers but don't fail the build.
  - **MVP:** Consider making performance budgets blocking. Use `@lhci/cli` in GitHub Actions with performance budgets.
  - **Rationale:** At PoC stage, shipping speed matters more than performance optimization. The performance budget is aspirational. At MVP, it becomes a guardrail.

### Answers to Frontend's Open Questions

**Q1: "What storage do we use for X-Ray results? Vercel KV? Postgres? How long do we keep anonymous results?"**

**A:** Neon Postgres. Same database as everything else. Store in `screentime_analyses` table (already defined in Architecture's schema). Anonymous results (no `user_id`) get a 30-day TTL via an `expires_at` column. A daily Vercel Cron job purges expired rows. Vercel KV (Upstash Redis) is for ephemeral data (rate limits, cost counters); Postgres is for data that needs to survive function restarts and be queryable.

### Revisions to DevOps Plan

1. **Add Vercel Cron for data purge** to PoC scope. Even PoC needs cleanup for 30-day ephemeral X-Ray results.
2. **Add Lighthouse CI (informational only)** to MVP CI pipeline. Not blocking for PoC.
3. **Confirm: Neon Postgres is required for PoC**, not optional. Shareable URLs and Stripe webhooks both need it.

---

## 4. Business/GTM Draft Review

### Agreements

- **Stripe for payments.** Stripe is the correct choice for a Finnish company selling B2C in the EU. VAT handling via Stripe Tax is critical. From an infra perspective, Stripe integration is two API routes: `POST /api/billing/checkout` (create session) and `POST /api/billing/webhook` (receive payment confirmations). The webhook endpoint needs:
  - Stripe signature verification (built into the Stripe SDK)
  - A database to write the payment confirmation (reinforces: need DB in PoC)
  - Idempotency handling (Stripe can send duplicate webhooks)
- **Founding 50 pricing.** This is business strategy, no infra impact. The Stripe coupon system handles founding member discounts natively.
- **Reddit/TikTok/Twitter strategy.** No infrastructure implications. These are content/marketing channels, not technical systems.
- **GDPR compliance audit.** Thorough and well-researched. The DPA checklist is actionable. From DevOps perspective, the DPAs with Neon, Anthropic, Vercel, and Resend need to be signed before processing real user data.

### Challenges

- **Stripe Checkout without a database.** Business proposes Stripe in PoC, but Architecture says "no DB for PoC." This is a conflict:
  - Stripe Checkout redirects the user to Stripe's hosted page. After payment, Stripe sends a webhook to your server. The webhook contains the payment details (customer email, amount, product). You need to persist this somewhere to "unlock" the paid feature.
  - **Without a database:** You could set a cookie or send an email after the webhook fires. But this is fragile -- what if the user clears cookies? What if they switch devices? What if they need a receipt later?
  - **With a database:** Store `stripe_customer_id` + `email` + `payment status` in a `subscriptions` or `payments` table. Simple, reliable, standard.
  - **Verdict:** Stripe in PoC requires a database. Period. This is the third independent reason (after shareable URLs and cost tracking) to include Neon Postgres in PoC scope.

- **EUR pricing + VAT display.** Business recommends EUR pricing. Stripe handles multi-currency, but the Checkout session must be configured with the correct currency. Infra consideration: environment variables should include `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, and `STRIPE_WEBHOOK_SECRET`. Three new env vars to manage.
  - **Recommendation:** Add Stripe env vars to the environment management table. Use Vercel's environment variable scoping to have separate Stripe test/live keys for preview/production environments.

- **EU OSS VAT registration.** Business correctly identifies the need to register for EU One-Stop Shop via vero.fi before the first paid transaction. This is a business/legal action item, not infra, but it's a hard blocker for Stripe going live. Flag it clearly in the timeline.

- **$50/day cost ceiling (business-imposed AI budget).** Business says "every AI API call must have a ceiling." This aligns with the AI team's proposal and our Upstash Redis-based cost tracking recommendation. The implementation is consistent across teams:
  - Track per-call cost in Upstash Redis
  - Check daily total before each call
  - Return a user-friendly message if ceiling is hit
  - Auto-reset at midnight UTC

### Answers to Business's Open Questions (directed at infra/DevOps)

The business draft doesn't have explicit questions for DevOps, but implicit questions exist:

**Implicit Q: "Can Stripe Checkout work without user accounts?"**

**A:** Yes. Stripe Checkout creates a `customer` object on Stripe's side using just the email. No user account on our side is needed. However, you do need to persist the Stripe customer ID and payment status somewhere to verify access. With a database: store it. Without a database: you can't reliably verify that a returning user has paid. Conclusion: use the database.

**Implicit Q: "What infrastructure is needed for the weekly playbook email?"**

**A:** Resend's batch sending API + a Vercel Cron job that runs weekly. The cron job queries the database for all subscribers, sends the email via Resend, and logs the send. This is a simple, free-tier operation. The playbook content can be stored as MDX files in the repo (as Frontend suggests) or as rows in the database. For PoC, MDX files in the repo are simpler.

### Revisions to DevOps Plan

1. **Add Stripe environment variables** to the environment management section (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`).
2. **Add Vercel Cron for weekly playbook email** to MVP scope.
3. **Flag EU OSS registration** as a hard blocker in the timeline (business/legal action, not infra, but we track it).

---

## 5. Key Tensions Resolved

### Tension 1: `sharp` for image preprocessing

**Resolution:** Do not use `sharp` in Vercel serverless functions for PoC. Use browser-side image compression instead (`browser-image-compression` or Canvas API). This eliminates the 30-50 MB native binary from the bundle, removes cold start penalty, and keeps the server-side API route simple. If browser-side compression proves inadequate (unlikely for text-heavy screenshots), revisit for MVP.

### Tension 2: Inngest for durable async work

**Resolution:** Not needed for PoC. For MVP, evaluate Upstash QStash first (simpler, same vendor as rate limiting) before adding Inngest. Inngest's free tier (5,000 runs/month) is sufficient, but QStash is operationally simpler (HTTP-based, no SDK, no step functions). Only add Inngest if step functions (chained multi-step workflows) are genuinely needed.

### Tension 3: Stripe without a database

**Resolution:** Cannot work reliably. Stripe webhooks need server-side persistence. Add Neon Postgres to PoC scope. This is a zero-cost change (free tier) that resolves this tension plus two others (shareable X-Ray URLs, cost tracking).

### Tension 4: AI cost ceiling monitoring

**Resolution:** Use Upstash Redis (already proposed for rate limiting). Each Claude API call logs its cost via `INCRBYFLOAT` on a daily key (e.g., `ai_cost:2026-03-30`). Before each call, `GET` the key and compare to the ceiling. TTL of 48 hours on each key for automatic cleanup. Self-tracked costs reconciled monthly against Anthropic's invoice. No third-party LLM observability tool needed at this scale.

### Tension 5: Vercel Blob vs process-and-discard

**Resolution:** Compatible. Vercel Blob is for temporary staging of large files (Google Takeout ZIPs in MVP). Process-and-discard means the blob is deleted after processing, not retained. For PoC, no Blob is needed -- screenshots are processed in-memory. For MVP, Blob is only needed if Takeout parsing happens server-side (unlikely if client-side JSZip parsing is the plan). If Takeout parsing is client-side, Blob may never be needed.

---

## 6. Consolidated Revisions to DevOps/Infra Plan

Based on this cross-review, the following changes will be made in Iteration 3:

| Section | Change | Reason |
|---------|--------|--------|
| **Database** | Neon Postgres is mandatory for PoC, not just recommended | Stripe webhooks, shareable URLs, cost tracking all need persistence |
| **File storage** | Explicitly exclude Vercel Blob from PoC; note it's likely unnecessary even for MVP if Takeout is client-side parsed | Reduces scope and vendor dependencies |
| **CI/CD** | Add Lighthouse CI as informational (non-blocking) check for MVP | Frontend performance budget enforcement |
| **Monitoring** | Add AI cost tracking via Upstash Redis; add section on cost ceiling implementation | AI team and business team both require this |
| **Environment variables** | Add Stripe keys, separate Anthropic keys for preview/prod | Business requires Stripe; AI team requested staging API key |
| **Rate limiting** | Consolidate Upstash Redis usage: rate limiting + cost ceiling + session counters | Three use cases, one free-tier service |
| **Background jobs** | Replace Inngest with QStash as primary recommendation for MVP | Simpler, same vendor as Redis, sufficient for our needs |
| **Security** | Add recommendation for browser-side image compression instead of `sharp` | Eliminates native binary bundle bloat and cold start penalty |
| **Cron jobs** | Add daily data purge cron (PoC) and weekly playbook email cron (MVP) | Required for GDPR auto-deletion and email marketing |
| **Cost breakdown** | Update PoC costs to reflect DB usage (still $0); adjust AI cost estimates to match AI team's more precise calculations | Better alignment across teams |

---

## 7. Open Questions Remaining

1. **For Architecture:** You propose Auth.js with Google OAuth for MVP, but Frontend proposes magic links via Resend. Which is the MVP auth strategy? From DevOps perspective, magic links are simpler (no OAuth config, no Google Cloud Console project). Can we align on magic links for MVP and defer Google OAuth to post-MVP?

2. **For AI team:** If we go with browser-side image compression, what's the minimum image quality/resolution needed for reliable Claude Vision OCR on Screen Time screenshots? We need to set the compression parameters correctly on the client side.

3. **For Business:** What's the expected volume of paid Time Audits in the first 6 weeks? This affects whether Stripe webhook handling needs retry logic or if simple fire-and-forget is sufficient.

4. **For all teams:** The Architecture draft's PoC scope says "no database" but every other team's requirements imply one. Can we formally agree that **Neon Postgres is in PoC scope**? This seems like the most impactful cross-team alignment point.

---

## 8. FOUNDER PRIORITY OVERRIDE: Revenue from Day 1

**Directive:** "We wanna be making money." Revenue is a PoC requirement, not an MVP feature. Every technical decision is evaluated through: "does this help us charge money sooner?"

This override settles several open tensions and changes our infra priorities.

### Impact on DevOps/Infrastructure Plan

#### Stripe webhook endpoint is now infrastructure-critical for PoC

The Stripe webhook endpoint (`POST /api/billing/webhook`) moves from "nice to have" to **blocker**. No working webhook = no confirmed payments = no revenue.

**What this requires from ops:**

1. **Stripe environment variables in Vercel from day 1:**
   - `STRIPE_SECRET_KEY` -- server-side, for creating Checkout sessions
   - `STRIPE_PUBLISHABLE_KEY` -- client-side (`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`), for Stripe.js
   - `STRIPE_WEBHOOK_SECRET` -- server-side, for webhook signature verification
   - Separate test/live keys scoped to Preview/Production environments in Vercel

2. **Webhook reliability:**
   - Stripe retries failed webhooks for up to 3 days with exponential backoff. Our endpoint must be idempotent (processing the same event twice produces the same result).
   - The webhook endpoint must return 200 within 10 seconds. If it takes longer, Stripe marks it as failed and retries.
   - Monitor webhook delivery via Stripe Dashboard (free, built-in). Alert on consecutive failures.

3. **Webhook endpoint monitoring in Sentry/Better Stack:**
   - Track 5xx error rate on `/api/billing/webhook`
   - Alert if the endpoint returns non-200 for >3 consecutive Stripe events

#### Can Stripe work without a full database?

The founder's directive asks: "Figure out how to make it work even without a full database."

**Two viable approaches:**

**Option A: Stripe as the payment state store (no DB for payments)**

Stripe itself stores payment state. The Checkout session contains the customer email, product, amount, and payment status. Instead of persisting payment confirmations in our database, we can:
- On webhook `checkout.session.completed`: send a confirmation email via Resend with a "magic access link" (signed JWT with `stripe_customer_id`)
- On subsequent visits: verify payment status by calling `stripe.customers.retrieve()` + `stripe.checkout.sessions.list()` with the customer email
- Store the access state in a signed, httpOnly cookie (JWT containing `stripe_customer_id` + `tier`)

**Pros:** Zero database dependency for payments. Stripe is the source of truth.
**Cons:** Slower (API call to Stripe on each access check, ~200-400ms). Cookie can be lost/cleared (user must re-verify via email). No historical payment dashboard on our side.

**Option B: Minimal Neon Postgres (recommended)**

Add Neon Postgres with a single table:

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  stripe_customer_id TEXT NOT NULL,
  stripe_session_id TEXT NOT NULL UNIQUE,
  product TEXT NOT NULL,        -- 'time_audit' | 'app_build'
  amount_cents INT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

This is 15 minutes of Drizzle setup on Neon free tier. It gives us:
- Instant payment verification (local DB query, <5ms)
- Revenue dashboard data (simple SQL: `SELECT SUM(amount_cents) FROM payments`)
- Webhook idempotency (check `stripe_session_id` uniqueness before inserting)
- Foundation for shareable X-Ray URLs and subscriber tracking later

**Verdict:** Option B. The "no DB" constraint was about avoiding premature complexity, not about avoiding a database when it's genuinely needed. A single `payments` table on Neon free tier is the minimum viable infrastructure for revenue. It costs $0 and takes 15 minutes.

#### Revised PoC infrastructure priority order

Reordering the PoC build based on "what helps us charge money soonest":

| Priority | Component | Time | Revenue impact |
|----------|-----------|------|----------------|
| **P0** | Stripe Checkout + webhook endpoint | 2-3 hours | Direct: enables paid Time Audits |
| **P0** | Neon Postgres (payments table) | 1 hour | Enables: payment verification, revenue tracking |
| **P0** | Stripe env vars in Vercel (test + live) | 15 min | Unblocks Stripe integration |
| **P1** | Claude Vision API integration (replace mock) | 2-3 hours | Enables: free X-Ray funnel that converts to paid |
| **P1** | Rate limiting (Upstash Redis) | 1 hour | Protects: AI spend from abuse |
| **P1** | AI cost ceiling (Upstash Redis) | 30 min | Protects: runway |
| **P2** | Sentry error tracking | 30 min | Protects: revenue-critical endpoints |
| **P2** | Better Stack uptime monitoring | 15 min | Detects: site down = revenue down |
| **P2** | GitHub Actions CI (lint + build) | 30 min | Prevents: broken deploys |
| **P3** | Vercel Cron for data purge | 30 min | GDPR compliance |
| **P3** | CSP headers | 1 hour | Security hardening |

**Total P0 infra time: ~4 hours.** After this, the founder can create Stripe products, set founding member coupons, and accept payments.

#### Free X-Ray as a sales funnel, not a product

The founder clarifies: "Free tier exists to convert, not to give away value." Infrastructure implications:

1. **No rate limiting generosity on free X-Rays.** Limit to 1 screenshot analysis per IP per day for unauthenticated users. Encourage signup for more. Upstash Redis handles this.
2. **Track conversion metrics.** Every free X-Ray should log: did this user later hit the Stripe checkout? Use GA4 custom events (already in stack, consent-gated) + a simple `conversion_events` table if we want server-side attribution.
3. **The X-Ray result page (`/xray/[id]`) is a conversion surface.** It must load fast, look polished, and have a working CTA. From ops perspective: this page must be server-rendered (RSC), cached at the edge, and monitored for availability.

#### Founding 50 program infrastructure

The Founding 50 is launch-critical. Infrastructure needed:

1. **Stripe coupon codes:** Create founding member coupons in Stripe (100% off Time Audit, 55% off Starter, etc.). No infra code -- this is Stripe Dashboard config.
2. **Founding counter:** "23 of 50 founding spots remaining." Options:
   - **Simple:** Hardcoded, manually updated. Not real-time but honest.
   - **Dynamic:** Query `SELECT COUNT(*) FROM payments WHERE product = 'founding_50'` and display `50 - count`. Requires the database.
   - **Recommendation:** Dynamic counter from the database. It's a single query, adds urgency, and the scarcity is real (not manufactured).
3. **Welcome email automation:** When founding member payment is confirmed (webhook), trigger a welcome email via Resend with intake form link. This is a webhook handler addition, not a separate system.

### Updated Cost Breakdown (Revenue-First PoC)

| Service | Purpose | Monthly Cost |
|---------|---------|-------------|
| Vercel Hobby | Hosting | $0 |
| Neon Postgres Free | Payment records, X-Ray results, subscribers | $0 |
| Upstash Redis Free | Rate limiting, cost ceiling, session counters | $0 |
| Stripe | Payment processing (fees on revenue, not fixed cost) | 2.9% + EUR 0.25/tx |
| Anthropic API | Screenshot analysis (~50-100 free X-Rays/month) | ~$0.15-0.30 |
| Resend Free | Welcome emails, founder notifications, playbook | $0 |
| Sentry Free | Error tracking | $0 |
| Better Stack Free | Uptime monitoring | $0 |
| **Total fixed infra** | | **$0.15-0.30/month** |
| **Revenue from Day 1** | 5 founding Time Audits @ EUR 29 | **EUR 145** |

The infrastructure pays for itself with the first screenshot analysis. EUR 0.003 per free X-Ray, EUR 29 per paid Time Audit. That's a 9,666x margin between the cost of the hook and the price of the product.

### Revision Summary (Revenue-Focused Changes)

| Original Plan | Revenue-First Revision |
|---------------|----------------------|
| Neon Postgres "recommended" for PoC | **Mandatory.** Payments table from hour 1. |
| Stripe integration in "MVP scope" | **PoC scope.** P0 priority. |
| Rate limiting at 10 req/min | **1 free X-Ray/IP/day** for unauthenticated. Push toward signup. |
| AI cost ceiling as "nice to have" | **Required.** Protects runway while offering generous free tier. |
| Monitoring as "should have" | **Sentry on webhook endpoint is P0.** Revenue endpoint cannot fail silently. |
| PoC build time ~5-6 hours | **P0 infra (revenue-critical): ~4 hours.** Everything else is P1-P3. |
