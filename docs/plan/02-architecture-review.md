# Architecture Cluster — Cross-Review of All Drafts

**Authors:** Software Architect + Backend Architect
**Date:** 2026-03-30
**Status:** Iteration 2 — Cross-review feedback
**Reviewing:** AI Pipeline, Frontend/UX, DevOps/Infra, Business/GTM

---

## Key Tensions Resolved

Before the per-cluster reviews, let's settle the four tensions the team lead flagged.

### Tension 1: Business wants Stripe in PoC, but architecture said "no DB for PoC"

**Resolution: We were wrong. PoC needs a database.**

The business team's case is compelling. They want one-time Stripe Checkout payments (EUR 29 Time Audits) in the PoC. Stripe Checkout *can* work without our own database — Stripe hosts the checkout, processes the payment, and sends a webhook. But the webhook needs somewhere to land. We need to:

1. Record that user X paid for a Time Audit.
2. Link the payment to their email (for manual audit delivery).
3. Track Founding 50 slot count.

This is trivially small data. But it needs persistence. Our revised position:

**PoC gets Neon Postgres from day 1.** The schema is minimal:

```sql
-- PoC schema (3 tables, takes 30 minutes to set up)
CREATE TABLE subscribers (id, email, created_at);            -- already collected via Resend
CREATE TABLE quiz_results (id, session_id, pains, suggestions, created_at);
CREATE TABLE payments (id, email, stripe_session_id, product, status, created_at);
```

This is a ~2-hour setup with Drizzle. The full schema from our draft (10 tables) is for MVP, not PoC. The PoC schema is 3 tables. The cost is $0 (Neon free tier).

**We revise ADR-005 accordingly:** PoC includes a lightweight database. No auth system, but persistence exists for quiz results, email signups, and payment records.

### Tension 2: Frontend says magic link only (no Google OAuth)

**We agree with the frontend team. Magic link first.**

Their argument is product-positioning: "Take back your data from Google" while signing in with Google feels contradictory. We didn't consider this in our draft — we were thinking purely about technical convenience. The frontend team is right that UX messaging matters more here.

**Revised auth strategy:**

| Phase | Auth Method | Justification |
|-------|-------------|---------------|
| PoC | No auth (email + Stripe customer ID is identity) | Business team's model works without formal auth |
| MVP | Magic link via Resend | Already integrated, zero third-party OAuth, consistent with messaging |
| Post-MVP | Add Google OAuth *only* when we offer Google service connections (Calendar, Gmail) | At that point, "Sign in with Google to connect your Calendar" makes sense |

Auth.js v5 still works for this — it supports email providers (magic link) natively. The Drizzle adapter handles session storage. We just don't configure the Google provider until we need it.

**Architectural impact:** Minimal. The session management and middleware are identical regardless of provider. We swap `GoogleProvider` for `EmailProvider` in the Auth.js config. If anything, this simplifies the PoC.

### Tension 3: AI team says `sharp` for image preprocessing — does this work in Vercel serverless?

**Yes, but with a caveat.**

`sharp` is a native Node.js module (libvips bindings). It works in Vercel Serverless Functions (Node.js runtime) but does NOT work in Vercel Edge Runtime. Since our `/api/analyze-screenshot` route is a standard Route Handler (not edge), this is fine.

**The caveat:** `sharp` adds ~5-8 MB to the function bundle size because of the native binary. On Vercel's free tier, the function size limit is 50 MB (250 MB on Pro). We're well within limits, but the cold start may increase by 200-400ms.

**Our recommendation:**

- **PoC:** Use `sharp` in the serverless function. The cold start penalty is acceptable for a PoC with <100 users. The 40-60% image token reduction the AI team estimates is worth the tradeoff.
- **Alternative if sharp causes issues:** Do client-side image resize before upload. HTML Canvas can resize images to 1568px max edge. This eliminates the server-side dependency entirely. The AI team should decide based on quality — does Canvas resize produce readable screenshots for Claude Vision?

**Answer to AI team Q1:** Sharp runs in Vercel Serverless (Node.js runtime), not Edge. Use `export const runtime = 'nodejs'` in the route handler (this is the default, but be explicit).

### Tension 4: Business says PoC timeline is 6 weeks, architecture said 2 weeks

**We align on 6 weeks for PoC, with a phase split.**

Our 2-week estimate was for the *technical build* only (quiz upgrade + real OCR + result page). The business team's 6 weeks includes:

- Weeks 0-2: Technical build (quiz + OCR + Time X-Ray + Stripe checkout + minimal DB)
- Weeks 2-4: First 25 Founding 50 signups. Manual Time Audits being delivered. Weekly playbook starts.
- Weeks 4-6: Remaining Founding 50 signups. Iterate on Time X-Ray based on real screenshot data. First paid Time Audits.

This is the right framing. The PoC isn't just "does the code work?" — it's "do people pay for this?" That takes 6 weeks because it includes market validation, not just deployment.

**Revised PoC timeline:**
- **Technical build:** 2 weeks (our original estimate stands for the engineering work)
- **Validation period:** 4 additional weeks (business team runs the Founding 50 program)
- **Total PoC:** 6 weeks

The MVP then starts at week 7, not week 3.

---

## Review: AI Pipeline Draft

### Agreements

1. **Haiku 4.5 for screenshot OCR is the right call.** The cost analysis is airtight. $0.003/screenshot makes the AI cost genuinely irrelevant at PoC scale. The cascading strategy (Haiku first, Sonnet for low-confidence) is a good MVP optimization but correct to defer.

2. **Rule-based insights for PoC, LLM insights for MVP.** Strongly agree. Template-based insights are predictable, free, and testable. The "Spotify Wrapped" card format benefits from consistency — every user gets a reliable experience. LLM narratives add personalization but also add variance and cost.

3. **Structured output via tool_use.** Using Claude's function calling for JSON schema enforcement is the right pattern. No regex parsing of free-text output. This is architecturally clean and makes the Zod validation layer robust.

4. **"3 of 6 skills need zero AI."** Excellent observation. Grade watcher, price watcher, and social poster are pure automation (scraping + notifications). Keeping the AI envelope tight prevents cost blowup when skills launch.

5. **Privacy-by-architecture.** The serverless function lifecycle (process in memory, discard on response, function dies) is structurally stronger than any policy promise. This aligns perfectly with our ADR-007 (Process-and-Discard).

6. **Cost ceiling with circuit breakers.** The $50/day ceiling and per-IP rate limiting are essential. At $0.003/screenshot, it's hard to rack up costs accidentally — but adversarial use (automated uploads) could burn budget without these guardrails.

### Challenges

1. **`sharp` dependency weight.** The AI team proposes server-side image preprocessing with `sharp`. This is sound technically, but adds a native dependency to our serverless bundle. See Tension 3 above for our recommendation. The AI team should test whether client-side Canvas resize (sending a smaller image from the browser) produces equivalent OCR accuracy. If yes, eliminate the server-side dependency entirely.

2. **Image preprocessing adds latency.** The flow is: upload → resize/compress → base64 → Claude API → Zod validate → respond. The resize step adds 200-500ms on cold start. For a "3-5 second" experience target (per the frontend team), this is tight. We need to budget carefully:
   - Upload transfer: ~500ms (5MB image over 4G)
   - Cold start + sharp init: ~400ms (worst case)
   - Resize/compress: ~200ms
   - Claude API call: ~1.5-3s
   - Zod validation: ~5ms
   - **Total: ~2.5-4.5s** — within budget, but barely.

   **Recommendation:** Warm the function with a scheduled ping every 5 minutes during active hours. This eliminates cold starts for most users. Or: do client-side resize (see above).

3. **The FSD placement is slightly off.** The AI team places `anthropic.ts` in `src/shared/lib/`. But Anthropic is a server-side-only dependency — it should never be importable by client components. In our architecture, it belongs in `src/server/discovery/` or at minimum `src/shared/lib/server/`. The barrel export should use a server-only guard.

4. **No retry on partial extraction is too aggressive.** The AI team says "do NOT retry on partial extraction — same image produces same result." This is true for identical inputs, but if we do client-side resize, a re-upload might produce a slightly different image (different compression artifacts). Consider allowing ONE retry with a "try again with a clearer screenshot" prompt, but log the retry to detect abuse.

### Answers to AI Team's Questions

**Q1: Should `sharp` run in Vercel Serverless or Edge?**
Serverless (Node.js runtime). Sharp requires native bindings that Edge Runtime doesn't support. Explicitly set `export const runtime = 'nodejs'` in the route handler.

**Q2: Rate limiting — Vercel KV vs in-memory vs Upstash Redis?**
**Upstash Redis** (free tier: 10K commands/day). The DevOps team already recommends this. In-memory rate limiting doesn't work in serverless (each invocation is a fresh process). Vercel KV is powered by Upstash under the hood but has a smaller free tier. Go directly to Upstash.

**Q3: Separate `/api/time-x-ray` route or fold insight generation into the screenshot route?**
**Fold it in for PoC.** One route (`/api/analyze-screenshot`) does: validate → resize → Claude API → generate rule-based insights → return complete Time X-Ray data. For MVP, when we have multi-source data (screenshot + Takeout + chat), we'll need a separate `/api/insights/generate` endpoint that aggregates across sources. But for PoC, one route is cleaner.

### Revisions to Our Architecture

- **Add `sharp` to the dependency list** and note the serverless runtime requirement.
- **Move `anthropic.ts` to `src/server/`** in our directory structure, not `src/shared/lib/`.
- **Add function warming** as an infrastructure concern (Vercel Cron ping every 5 minutes during business hours, or accept cold starts).

---

## Review: Frontend & UX Draft

### Agreements

1. **Route architecture is well-designed.** The split between no-auth routes (`/quiz`, `/xray`, `/xray/[id]`) and auth-required routes (`/dashboard/*`) maps cleanly to our bounded contexts. The viral surface (`/xray/[id]`) being public and shareable without auth is the right call.

2. **User journey map nails the conversion psychology.** Zero friction entry → value before ask → escalating commitment. This is exactly the flow our architecture must support. The "session merging" pattern (anonymous quiz → authenticated dashboard) is architecturally sound — nullable `user_id` on `quiz_results` and `screentime_analyses` handles this.

3. **Magic link over Google OAuth.** See Tension 2 above — we agree and are revising our auth strategy accordingly. The "Google sees my data" objection they raise is a product-positioning insight we missed.

4. **The Time X-Ray card design.** The 440px max-width, 3:4 ratio for mobile screenshot sharing, and the receipt-style layout are well-considered. The OG image route (`/xray/[id]/og`) using `next/og` (ImageResponse/Satori) is the right approach for link previews.

5. **FSD slice additions.** `xray-result` as an entity, `screenshot-upload` and `sharing` as features, `dashboard` as a widget — all follow FSD conventions correctly. The barrel exports and import direction are maintained.

6. **"Not a SaaS dashboard" principle.** Card-based, personal-feeling, mobile-first. This is the right vibe for Gen Z. The horizontal tab nav (not sidebar) avoids the "enterprise tool" aesthetic.

### Challenges

1. **X-Ray result storage for sharing.** The frontend team asks: "What storage do we use for X-Ray results?" Their PoC spec says "ephemeral, 30-day auto-delete." This conflicts with our original "no DB for PoC" stance, but since we've now agreed to add Neon for PoC (Tension 1), the answer is straightforward:

   **Store X-Ray results in Postgres with a 30-day TTL.** Table:

   ```sql
   CREATE TABLE xray_results (
     id TEXT PRIMARY KEY,           -- nanoid, used in /xray/[id] URL
     session_id TEXT NOT NULL,      -- anonymous session
     user_id UUID REFERENCES users(id),  -- nullable, linked on signup
     apps JSONB NOT NULL,
     total_hours FLOAT NOT NULL,
     top_app TEXT NOT NULL,
     insight TEXT NOT NULL,
     created_at TIMESTAMPTZ DEFAULT now(),
     expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '30 days'
   );
   ```

   Purge job deletes rows where `expires_at < now()`. For MVP, authenticated users' results don't expire (or have a much longer TTL).

2. **Dynamic OG images require data persistence.** The `/xray/[id]/og` route needs to fetch the X-Ray data to render the image. This means the data MUST be server-side (not just in localStorage). Another confirmation that the database is needed for PoC.

3. **`html-to-image` vs `html2canvas` for "Save as image."** Both are client-side libraries. `html-to-image` is lighter and uses the DOM serialization approach. `html2canvas` re-renders the DOM to canvas (heavier, more compatible). For the simple card layout (text + colors, no complex CSS), `html-to-image` should work. But test on mobile Safari — it has known issues with both libraries. Fallback: generate the image server-side using the same `next/og` route and let users download it.

4. **Exit intent popup.** The frontend team mentions an exit-intent mini Data Receipt card. Exit intent detection doesn't work on mobile (no mouse cursor to track). Since Gen Z is 78% mobile, this feature has limited reach. Consider: for mobile, use a scroll-depth trigger instead (show a sticky CTA after 60% scroll depth if they haven't interacted with the quiz).

5. **Performance budget is tight but achievable.** <100KB gzip initial JS is ambitious with Park UI + Panda CSS. Currently the landing page likely exceeds this (Park UI components, Panda runtime). Measure before optimizing. RSC (server components as default) is the biggest lever — ensure the quiz and upload components are the only client boundaries.

### Answers to Frontend's Questions

**Q1: Storage for X-Ray results?**
Postgres (Neon). See the schema above. Results get a short nanoid for URLs. 30-day TTL for anonymous results. Permanent for authenticated users (MVP).

**Q2: Non-English screenshots?**
The AI team should answer this, but architecturally: Claude Vision handles multilingual OCR natively. No special handling needed. The Zod schema validates the output structure regardless of input language. The AI team should test with Finnish, Japanese, and Arabic screenshots specifically.

**Q3: "Built by 12 IT seniors" exact phrasing?**
Business team's call. Our architectural opinion: no impact on architecture. But the `/about` page (MVP) should be a static RSC page, not a CMS-driven page. Content changes infrequently.

**Q4: Ephemeral X-Ray results and GDPR?**
If truly anonymous (no email, no IP logged, no user account linked), GDPR data subject rights don't apply because we can't identify the data subject. The 30-day TTL and lack of identifying information means these are effectively anonymous statistics. However: if we store `session_id` cookies and could theoretically re-identify users, the Finnish DPA might consider this pseudonymous data (still covered by GDPR). **Recommendation:** Don't store IP addresses or browser fingerprints alongside anonymous X-Ray results. The `session_id` alone, with a 30-day TTL, is defensible.

**Q5: "Compared to average" benchmark?**
Not for PoC. We don't have baseline data yet. For MVP, once we have 100+ X-Ray results, compute anonymized averages and show "You use Instagram 2x more than our users" as a comparison. This is a powerful Gen Z hook (social comparison) and creates a network effect (more users = better benchmarks).

### Revisions to Our Architecture

- **Add `xray_results` table to PoC schema** (was only in MVP schema before).
- **Replace `screentime_analyses` with `xray_results`** in our schema — same data, better name, includes the shareable ID.
- **Add `generate-xray-id` utility** to `src/shared/lib/` (nanoid, 12 chars, URL-safe).
- **Confirm magic link auth** as the MVP strategy (revise ADR-003).

---

## Review: DevOps & Infrastructure Draft

### Agreements

1. **"Stay on Vercel. No separate backend."** 100% aligned. This is the single most important infrastructure decision. The DevOps team's analysis mirrors ours exactly — no CORS management, no second billing surface, no deployment complexity.

2. **Neon Postgres recommendation.** They chose Neon for the same reasons we did (serverless, branching, EU region, free tier). The comparison table is thorough. One note: they show Neon's free tier as 512 MB storage vs our 0.5 GB — same thing, just different rounding.

3. **GitHub Actions CI pipeline.** The proposed pipeline (biome check → panda codegen → build) is the right set of checks. 90-second CI time is fast enough for PR-gated merges. The future additions (Lighthouse CI, Playwright smoke tests, drizzle-kit check) are correctly deferred.

4. **Two environments (dev + prod), no staging.** Correct for a 1-2 person team. Vercel preview deployments per PR are functionally staging environments. Adding a formal staging env is pure overhead at this scale.

5. **Backup & DR section.** Neon PITR (7-day), git history for code, and Vercel instant rollback cover all realistic failure scenarios. The RTO targets (5 min for app, 30 min for DB) are reasonable and achievable.

6. **Security checklist.** Thorough. The CSP, rate limiting, CORS, and dependency scanning items are the right priorities. They recommend Upstash Redis for rate limiting — we agree.

7. **Cost breakdown aligns with ours.** Their $0-5/mo at PoC, $10-30 at 100 users, $205 at 1,000 users is close to our estimates ($0, $40, $290). The difference is we included Stripe fees and Inngest; they included Upstash Redis and Better Stack. Both are correct — the total envelope is $200-300/mo at 1,000 users.

### Challenges

1. **Vercel Hobby vs Pro timing.** DevOps says stay on Hobby for PoC. But the business team wants Stripe webhooks in PoC. Vercel Hobby has a 10-second function timeout. Stripe webhook processing (verify signature + DB write + send confirmation email via Resend) could take 3-5 seconds, but only on cold start. On warm functions, it's <1 second.

   **Recommendation:** Start on Hobby. If Stripe webhook processing reliably completes within 10 seconds, stay. If cold starts cause timeouts, upgrade to Pro ($20/mo) which gives 60-second timeouts. This is a "cross that bridge when we hit it" decision — don't pre-pay for Pro.

2. **Auth recommendation is ambiguous.** DevOps says "Clerk or NextAuth.js — evaluate when auth is needed." We need to resolve this now since the frontend team has already committed to magic link via Resend. **Decision: Auth.js v5 (NextAuth) with EmailProvider.** Not Clerk. Clerk's free tier (10K MAU) is generous, but it's a third-party dependency for something we can do with Auth.js + Resend (both already in the stack). The DevOps team should set up Auth.js as part of the MVP infrastructure, not evaluate alternatives.

3. **Better Stack for uptime monitoring.** We didn't include uptime monitoring in our draft. It's a good addition — free tier (5 monitors, 3-min interval) provides alerting that Vercel doesn't natively offer. Add it.

4. **Environment variables list is incomplete.** DevOps lists `DATABASE_URL`, `ANTHROPIC_API_KEY`, `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`. They're missing:
   - `STRIPE_SECRET_KEY` (server-side)
   - `STRIPE_WEBHOOK_SECRET` (server-side, for webhook signature verification)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (client-side, for Stripe.js)
   - `AUTH_SECRET` (server-side, for Auth.js session encryption — MVP)
   - `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (for rate limiting)
   - `ENCRYPTION_KEY` (server-side, for encrypting sensitive DB fields — MVP)

5. **Scaling path Phase 3 mentions Supabase migration.** We disagree. Migrating from Neon to Supabase at 1,000-10,000 users would be a distraction. Neon scales fine to that level on their Scale plan ($69/mo). The scaling path should be: Neon Free → Neon Launch → Neon Scale. Only consider migration if Neon has reliability issues, not for features.

### Answers to DevOps's Questions

**Q1: Expected Takeout upload size?**
Google Takeout exports are typically 500MB-5GB depending on how much data the user has and which products they select. We recommend guiding users to export only Chrome history, YouTube, Search, and Calendar (not Drive, Gmail, Photos). This keeps exports under 500MB for most users. For MVP: set a 500MB upload limit. Larger files need chunked upload or a different approach.

**Q2: Real-time features?**
Not for PoC or MVP. The chat discovery feature (MVP) uses SSE (Server-Sent Events) for streaming LLM responses. SSE works within Vercel's serverless model (the function stays alive until the stream completes). No WebSocket infrastructure needed.

**Q3: Data retention policy?**
- Anonymous X-Ray results: 30 days
- Quiz results: 90 days (or until linked to a user account)
- Authenticated user data: until account deletion
- Activity signals: 7 days (ephemeral, for analysis only)
- Chat messages: 30 days
- Uploaded files: deleted within 1 hour of processing
- Payment records: 6 years (Finnish accounting law, Kirjanpitolaki 2:10)

**Q4: SOC 2?**
Not needed for PoC or MVP. GDPR is the only compliance requirement. SOC 2 becomes relevant if we target enterprise (Concierge tier at scale). Defer to post-MVP.

**Q5: When to start charging?**
Business team says immediately (Founding 50 gets free audits, then EUR 29 paid audits). Infrastructure cost is $0 at PoC. We don't need to upgrade tiers until ~100 users.

### Revisions to Our Architecture

- **Add Better Stack uptime monitoring** to our infrastructure decisions.
- **Add Upstash Redis** to the stack for rate limiting (was mentioned but not formalized).
- **Complete the environment variables list** in our plan.
- **Resolve auth choice explicitly** — Auth.js v5 with EmailProvider, not "Clerk or Auth.js."
- **Add Vercel Hobby vs Pro decision point** — stay on Hobby until a function timeout forces the upgrade.

---

## Review: Business & GTM Draft

### Agreements

1. **"Do things that don't scale" approach.** Manual Time Audits (EUR 29, 1-2 hours founder time, 72-hour delivery) are the right way to validate willingness to pay before building automation. The business team correctly identifies that revenue from day 1 is possible with human-delivered value.

2. **Pricing is well-anchored.** EUR 9/month Starter below the "Netflix threshold" for Gen Z, EUR 49/app anchored against EUR 5,000 developer cost, EUR 199/month Concierge anchored against a virtual assistant. These are psychologically sound price points.

3. **Founding 50 program.** The perks (free audit, weekly playbook, shape the product, locked pricing) create urgency and community. The 6-week fill target is aggressive but achievable with the existing email list + Reddit/Twitter distribution.

4. **Stripe for payments.** Stripe Checkout handles PCI compliance, EU VAT (Stripe Tax), and the checkout flow. We never touch card data. The webhook-based confirmation flow is architecturally clean.

5. **Reddit strategy.** The 90/10 value-to-promotion ratio, 4-week warmup period, and "never post a link in the first 4 weeks" rule are disciplined. The subreddit targeting is well-researched.

6. **GDPR compliance audit is thorough.** The business team identified every new processing activity, its legal basis, and the privacy policy updates needed. The DPIA recommendation is correct — systematic profiling of behavioral data likely triggers Article 35.

7. **Revenue projections are honest.** The "founder time is the real cost" analysis (60-70 hours/month for EUR 1,265/month at 1,000 signups) correctly identifies the sustainability bottleneck. The product must automate discovery and app building to scale.

### Challenges

1. **Stripe in PoC without user accounts.** The business team says "email + Stripe customer ID is sufficient" for PoC. This works if we treat email as the primary key for identity. But it creates a data model wrinkle:

   - User signs up with email A.
   - Pays via Stripe with email B (their Stripe account might use a different email).
   - We now have two identities for the same person.

   **Mitigation:** Pre-fill the Stripe Checkout email with the email they used to sign up. If they change it during checkout, the Stripe webhook will tell us the payment email. Store both and reconcile manually during the PoC. For MVP, the user account (magic link with email A) is the canonical identity, and the Stripe customer is linked by `user_id`.

2. **One-time payments before subscriptions.** The business team correctly prioritizes one-time payments (Time Audit EUR 29, App Build EUR 49) over subscriptions. This is easier to validate. But the architecture needs to support both by MVP:

   - PoC: `stripe.checkout.sessions.create({ mode: 'payment' })` — one-time
   - MVP: `stripe.checkout.sessions.create({ mode: 'subscription' })` — recurring

   Both use the same webhook handler, same `payments` table (with a `type` column: 'one_time' | 'subscription'). No architectural difference. Good.

3. **VAT/OSS registration timing.** The business team says "register for EU OSS via vero.fi before first paid transaction." This is critical but easy to forget. Make it a launch blocker checklist item, not a backlog task.

4. **EUR 29 for a manual Time Audit is underpriced.** At 1-2 hours of founder time per audit, that's EUR 14.50-29/hour. Finnish freelance developer rates are EUR 80-150/hour. Post-Founding 50, the price should increase to EUR 49-79 once the process is refined and has testimonials. The business team's pricing may be correct for *validation* (low price = more buyers = more data), but not for sustainability.

5. **The "12 IT seniors" claim needs careful framing.** The business team provides good guidance ("Built in a day. Refined every day since."). From an architecture perspective: the claim is that 12 specialists contributed to the architecture and plan in a single session. This is accurate — these planning documents are the output. But "built in a single day" could be read as "the entire app was built in one day," which would be misleading once we're in a 6-week PoC + 10-week MVP build. The framing must be precise.

6. **TikTok content strategy is high-effort.** 2-3 videos/week + 2-3 tweets/day + 1 thread/week + daily Reddit commenting is a significant time commitment for a solo founder who's also building the product, delivering manual audits, and writing the weekly playbook. Prioritize: Reddit (organic, free, audience is there) and Twitter (build-in-public, fast). TikTok can start with cross-posted content from Twitter threads.

### Answers to Business Team's Questions (from AI team's draft)

**Free tier screenshot limit:** Unlimited for PoC. At $0.003/screenshot, even 1,000 free screenshots cost $3. Gating screenshots behind a limit adds friction to the viral loop. The business team should consider: free = unlimited screenshots + basic insights. Paid = multi-source analysis (Takeout + chat) + personalized audit + app builds.

**Should Time X-Ray be gated behind signup?** No. The X-Ray result is the viral hook. Gating it kills sharing. The signup gate should appear AFTER the user sees their X-Ray: "Save your results and get weekly tips." The X-Ray itself is the free tier product.

**Privacy policy updates:** The business team's checklist is complete. From an architecture perspective, the key claim to get right is: "Your uploaded file is processed in memory and deleted immediately. We never store your screenshots." This must be technically true — verify that Vercel's request logging doesn't capture the request body (it doesn't by default, but confirm).

### Revisions to Our Architecture

- **Add PoC database schema** (3 tables: subscribers, quiz_results, payments).
- **Add Stripe integration** to the PoC scope (was MVP-only in our draft).
- **Add `payments` table** to the PoC schema (stripe_session_id, email, product, status).
- **Revise PoC scope:** Quiz + real OCR + Time X-Ray + Stripe one-time checkout + email capture. Still no auth.
- **Add launch blocker checklist:** EU OSS registration, DPA signatures, privacy policy updates.
- **Revise cost estimates:** PoC infrastructure is still ~$0-5/mo, but now includes Stripe fees (~$1-2 for the first few transactions).

---

## Summary of Revisions to Architecture Draft

Based on all four cross-reviews, here's what changes in our architecture plan:

### Schema Changes

| Change | Reason |
|--------|--------|
| PoC gets a database (3 tables) | Business needs Stripe webhook persistence |
| Add `xray_results` table with nanoid ID + 30-day TTL | Frontend needs shareable URLs + OG images |
| Replace `screentime_analyses` with `xray_results` | Cleaner naming, same data |
| Add `payments` table for PoC | Stripe Checkout needs a landing zone |

### Auth Changes

| Change | Reason |
|--------|--------|
| PoC: no auth (email as identity) | Business model works without formal auth |
| MVP: magic link via Auth.js EmailProvider | Frontend team's positioning argument wins |
| Google OAuth deferred to post-MVP | Only needed when Google service connections launch |

### Infrastructure Changes

| Change | Reason |
|--------|--------|
| Add Upstash Redis for rate limiting | DevOps + AI team both recommend, free tier sufficient |
| Add Better Stack for uptime monitoring | DevOps team addition, free |
| Start on Vercel Hobby, upgrade to Pro if function timeouts occur | Saves $20/mo if Hobby suffices |
| Add function warming (Vercel Cron ping) for screenshot API | Eliminates cold start latency for OCR |

### Scope Changes

| Change | Reason |
|--------|--------|
| PoC includes Stripe one-time checkout | Business wants day-1 revenue validation |
| PoC timeline: 2 weeks build + 4 weeks validation = 6 weeks | Aligned with business team's Founding 50 program |
| `sharp` approved for serverless with fallback to client-side resize | AI team's image preprocessing is worth the bundle size |
| Move `anthropic.ts` to `src/server/` | Server-only dependency, shouldn't be in shared |

### ADR Revisions

| ADR | Change |
|-----|--------|
| ADR-003 (Auth) | Revised: magic link first, Google OAuth deferred |
| ADR-005 (Pre-Auth) | Revised: PoC includes lightweight Postgres (3 tables), not "no DB" |
| New ADR-008 | Stripe in PoC: one-time payments via Checkout, webhook to Postgres, email as identity |

---

## Cross-Cluster Alignment Matrix

A quick reference for where all teams agree and where decisions are now settled:

| Decision | AI | Frontend | DevOps | Business | Architecture | **Final** |
|----------|:--:|:--------:|:------:|:--------:|:------------:|:---------:|
| Database for PoC | -- | Wants it | Recommends it | Needs it | Now agrees | **Yes (Neon, 3 tables)** |
| Auth for PoC | -- | No auth | -- | No auth (email) | Now agrees | **No auth** |
| Auth for MVP | -- | Magic link | "Clerk or Auth.js" | -- | Auth.js + EmailProvider | **Auth.js magic link** |
| Google OAuth | -- | No (positioning) | -- | -- | Was yes, now deferred | **Post-MVP only** |
| Image preprocessing | `sharp` | -- | Watch bundle size | -- | Approved + fallback | **`sharp` in serverless** |
| Rate limiting | Upstash | -- | Upstash | -- | Upstash | **Upstash Redis** |
| Stripe in PoC | -- | -- | -- | Yes (day-1 revenue) | Now agrees | **Yes (one-time checkout)** |
| PoC timeline | 1-2 days (AI only) | -- | 5-6 hours (infra) | 6 weeks (incl. validation) | 2 weeks (build only) | **6 weeks (2 build + 4 validation)** |
| X-Ray storage | In-memory | Postgres + 30d TTL | -- | -- | Now Postgres | **Postgres, 30-day TTL** |
| Monitoring | Cost tracking | -- | Sentry + Better Stack | -- | Sentry | **Sentry + Better Stack** |

---

## ADDENDUM: Founder Directive — "We Wanna Be Making Money"

**Added:** 2026-03-30 (post-review, priority override from founder)

The founder has issued a clear directive: **revenue is a PoC requirement, not an MVP feature.** Every architectural decision must be evaluated through: "does this help us charge money sooner?"

This addendum revisits our PoC architecture through that lens.

### The Revenue-First PoC Architecture

Our original PoC was: "prove the discovery engine works." The revised PoC is: "prove people will pay for this." These are different products.

**What "making money in PoC" actually means:**

```
Week 0:  Landing page + email capture (EXISTS)
         Quiz + Screen Time screenshot (EXISTS, needs real OCR)
         Stripe Checkout for paid Time Audit (NEW)
         Founding 50 program (NEW)

Week 1:  First Founding 50 members sign up (free audit)
Week 2:  Real OCR + Time X-Ray deployed
Week 3:  First manual Time Audits delivered
Week 4:  Post-founding paid Time Audits (EUR 29) live
Week 5:  First App Build request (EUR 49) comes in
Week 6:  PoC ends. Revenue achieved or hypothesis killed.
```

### Can We Skip the Database? The "Stripe-as-Backend" Pattern

The founder's directive says "no-DB PoC is fine IF payments still work." Let's explore how far we can push this.

**What Stripe already stores for us:**

| Data | Stripe Object | API to retrieve |
|------|--------------|-----------------|
| Customer email | `Customer.email` | `stripe.customers.retrieve(id)` |
| Payment status | `PaymentIntent.status` | `stripe.paymentIntents.retrieve(id)` |
| Product purchased | `Checkout.Session.line_items` | `stripe.checkout.sessions.listLineItems(id)` |
| Payment date | `PaymentIntent.created` | Included in object |
| Founding 50 coupon usage | `PromotionCode.times_redeemed` | `stripe.promotionCodes.retrieve(id)` |

**What Stripe does NOT store:**

| Data | Where it goes instead |
|------|----------------------|
| Quiz results | Stripe has no concept of this |
| X-Ray analysis results | Need persistence for shareable URLs |
| Founding 50 slot count | Can use Stripe coupon `max_redemptions` |
| Which audit has been delivered | Need a status tracker |

**Verdict: Stripe-only works for payments but not for product data.**

We can eliminate a `payments` table by treating Stripe as the payment source of truth. But quiz results and X-Ray data need persistence for the shareable viral loop (`/xray/[id]`). And we need to track audit delivery status ("paid" vs "audit sent" vs "audit delivered").

**The minimal-DB compromise:**

```sql
-- PoC schema: 2 tables (not 3, not 10)

-- Table 1: X-Ray results (needed for shareable URLs + OG images)
CREATE TABLE xray_results (
  id TEXT PRIMARY KEY,                  -- nanoid, used in /xray/[id]
  email TEXT,                           -- nullable, captured after X-Ray
  apps JSONB NOT NULL,                  -- [{name, hours, category}]
  total_hours FLOAT NOT NULL,
  top_app TEXT NOT NULL,
  insight TEXT NOT NULL,
  quiz_pains TEXT[],                    -- link quiz results to X-Ray
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '30 days'
);

-- Table 2: Audit tracking (links Stripe payment to delivery status)
CREATE TABLE audit_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  stripe_checkout_session_id TEXT NOT NULL UNIQUE,
  xray_id TEXT REFERENCES xray_results(id),  -- link to their X-Ray
  status TEXT NOT NULL DEFAULT 'paid',        -- 'paid' | 'in_progress' | 'delivered'
  delivered_at TIMESTAMPTZ,
  notes TEXT,                                  -- founder's notes on the audit
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_xray_expires ON xray_results(expires_at);
CREATE INDEX idx_audit_email ON audit_orders(email);
```

**Why this is better than 3 tables:**

- No `subscribers` table -- Resend is the subscriber database (already is). We don't duplicate it.
- No `payments` table -- Stripe is the payment database. We only track audit delivery status.
- No `quiz_results` table -- quiz selections are embedded in the X-Ray result (`quiz_pains` column). If someone takes the quiz but doesn't upload a screenshot, the data lives in their browser session only (no server persistence needed for unmonetized users).
- The `xray_results` table serves double duty: product data AND conversion tracking (we can see how many X-Rays convert to paid audits).

**Revenue impact:** Zero data loss. Stripe handles all payment state. We handle product state (X-Rays) and fulfillment state (audit delivery). Two tables, not ten.

### Revenue-Critical Path: What Blocks Money?

Evaluating every PoC feature through the "does this help us charge money sooner?" lens:

| Feature | Revenue Impact | Priority | Blocks Revenue? |
|---------|---------------|----------|:---------------:|
| **Fix dead CTAs on landing page** | Users can't sign up if buttons don't work | P0 | **YES** |
| **Stripe Checkout integration** | Can't accept money without it | P0 | **YES** |
| **Stripe webhook endpoint** | Can't confirm payments without it | P0 | **YES** |
| **Founding 50 landing page update** | No scarcity = no urgency = slower signups | P0 | **YES** |
| **Welcome email with intake form** | Paid audits need an intake step | P0 | **YES** |
| **Real OCR (replace mock)** | Free X-Ray is the sales funnel | P1 | Indirectly |
| **Shareable X-Ray (`/xray/[id]`)** | Viral loop drives new signups which drive revenue | P1 | Indirectly |
| **Dynamic OG images** | Better shares = more clicks = more signups | P2 | No |
| **Rate limiting** | Protects API budget but doesn't generate revenue | P2 | No |
| **Image preprocessing (sharp)** | Saves $0.001/call, optimization not revenue | P3 | No |

**The first 3 items (dead CTAs, Stripe Checkout, webhook) are blockers.** Everything else is important but not revenue-blocking. Ship the blockers first, even if the OCR is still mock data. A working payment flow with mock X-Ray data is worth more than a perfect X-Ray with no way to pay.

### Revised PoC Build Order (Revenue-Optimized)

```
Day 1 (revenue-blocking):
  1. Fix dead CTA links on landing page
  2. Create Stripe products (Time Audit EUR 29, App Build EUR 49)
  3. Create Founding 50 coupon (100% off Time Audit, max_redemptions=50)
  4. POST /api/billing/checkout — create Checkout session
  5. POST /api/billing/webhook — handle payment confirmation
  6. Set up Neon Postgres + Drizzle (2 tables)
  7. Update landing page: Founding 50 section, pricing, CTA to checkout

Day 2 (product-critical):
  8. Replace mock OCR with real Claude Vision call
  9. Create /xray/[id] result page (server-rendered from DB)
  10. Wire quiz results into X-Ray flow
  11. Welcome email (Resend) with intake form for paid audits

Day 3 (growth):
  12. Dynamic OG image for /xray/[id]/og
  13. Share button (Web Share API + copy link)
  14. Rate limiting (Upstash Redis)
  15. Function warming for OCR endpoint

Day 4+ (polish):
  16. Image preprocessing (sharp)
  17. Error states, loading states
  18. Mobile optimization
  19. Privacy policy updates (Anthropic, Stripe as processors)
```

**Note:** Days 1-2 are the revenue-critical path. After Day 2, we can start accepting money AND delivering real X-Ray value. Days 3-4 are growth and polish.

### The Free Tier as a Sales Funnel

The founder directive says: "Free tier exists to convert, not to give away value."

Architectural implications:

1. **The free X-Ray is NOT the product. It's the demo.** The product is the paid Time Audit (human-reviewed, personalized, actionable). The X-Ray shows you the problem. The audit shows you the solution.

2. **X-Ray results should tease, not satisfy.** Show top 3 apps and total screen time. But the "what to do about it" section should say: "Get your Personal Time Audit -- a senior engineer reviews your data and gives you 3 specific automations to build." This is the upsell.

3. **Every X-Ray result page needs a CTA to the paid audit.** Not "save your results" -- that's retention. "Get your personal audit from a senior engineer" -- that's revenue.

4. **Email capture is a revenue step, not a product step.** We capture email to send the Founding 50 offer, the weekly playbook (which includes soft upsells), and the "your audit is ready" notification. Email = pipeline.

### Impact on Architecture

| Previous Decision | Revised Decision | Why |
|-------------------|------------------|-----|
| PoC schema: 3 tables | **2 tables** (xray_results + audit_orders) | Stripe is payment DB, Resend is subscriber DB |
| Stripe in PoC: "now agrees" | **Stripe is PoC blocker #1** | Revenue-blocking, build first |
| X-Ray storage: "30-day TTL" | **30-day TTL for anonymous, permanent for paid users** | Paid audit references the X-Ray; can't expire it |
| Build order: OCR first, then Stripe | **Stripe first, then OCR** | Money > features |
| Free X-Ray: "the viral hook" | **Free X-Ray: the sales funnel** | Hook implies standalone value; funnel implies conversion intent |

### ADR-009: Revenue Before Features

**Status:** Accepted (founder directive)
**Context:** Founder explicitly stated "we wanna be making money." The PoC was originally scoped as a technical validation. It is now scoped as a revenue validation.
**Decision:** The PoC build order prioritizes payment infrastructure over product features. A working Stripe Checkout with a manually-delivered service is more valuable than an automated product with no way to pay.
**Consequences:**
- (+) Revenue can start flowing before the OCR is even live (manual audits based on quiz results + self-reported data)
- (+) Forces us to validate willingness to pay immediately, not after building more product
- (+) Keeps the team focused on what matters: does anyone want this enough to pay?
- (-) The OCR demo (the "wow moment") may not be ready when the first Founding 50 members sign up
- (-) Early users may get a less polished experience (manual audit delivery, basic X-Ray)
**Mitigation:** The Founding 50 ARE the polish team. They signed up for early access, not a finished product. Their feedback shapes the MVP.

### Cost Model Revision (Revenue-Aware)

The AI team's $0.003/screenshot cost is, as the founder notes, a weapon. Let's quantify the unit economics:

| Metric | Value |
|--------|-------|
| Cost per free X-Ray | $0.003 (Claude Haiku) |
| Free X-Rays to equal one Time Audit sale | EUR 29 / $0.003 = 9,667 free X-Rays |
| Free X-Rays to equal one App Build sale | EUR 49 / $0.003 = 16,333 free X-Rays |
| **Conversion needed to break even on AI costs** | **1 in 9,667** (0.01%) |

The AI cost is so low that we could give away 10,000 free X-Rays and break even on a single EUR 29 sale. The free tier is essentially free for us. There is zero reason to gate screenshots behind limits, paywalls, or signup requirements. **Let them in. Let them see. Let them share. Let them pay when they want more.**

---

*Iteration 2 complete (with founder directive incorporated). Bring your counter-arguments to Iteration 3.*
