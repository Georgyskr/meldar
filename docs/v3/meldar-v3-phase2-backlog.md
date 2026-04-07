# Meldar v3 — Phase 2 Backlog

**Last updated:** 2026-04-06
**Status:** Post-MVP scope. Do NOT ship any of these in Sprint 1 or Sprint 2 unless explicitly re-prioritized.

This file captures work explicitly deferred from the v3 MVP during founder decision-making, with enough context that future-you (or a new teammate) can understand why each item was deferred and what the trigger for reviving it should be.

---

## 1. Heavy Time X-Ray scan as a paid product

**Context:** The existing discovery flow (`/start`, `/xray`) lets users upload a Screen Time screenshot and get a free recommendation. The founder wants a **deeper, paid version** where users upload multiple data sources (ChatGPT export, Claude export, Google Takeout, subscriptions, calendar, health) and receive a comprehensive personal-data analysis. Narrative hook: "You gave Google ten years of your data. Take it back. See what it really means."

**Why deferred:** Sprint 1 must prove the Katya Landing-Page-+-Booking flow end-to-end. Adding a third Stripe product (on top of Builder EUR 19/mo + Skip-the-Line VIP EUR 79) creates extra billing/entitlement/analytics surface area that doesn't serve Katya's journey.

**What it would need:**
- A third Stripe product (price point TBD — likely EUR 9 or EUR 19 one-time)
- A deliverable spec: PDF report? Ranked app list? Video walkthrough from founder?
- Entitlement logic: does heavy-scan purchase grant any Builder tokens, or is it fully separate?
- A new "Insights delivered" email template
- Potentially a background job if the scan is async
- Legal review on data retention since users are uploading heavier personal exports

**Trigger to revisit:** When the free Time X-Ray has generated >200 `heavy_scan_interest` analytics events (users clicking anything that implies "I'd pay to go deeper"). This gives real demand signal before building.

**Cross-reference:** The `heavy_scan_interest` GA4 event is added in Sprint 1 as part of the analytics event layer — it's the sensor for this trigger.

---

## 2. Encrypted-preload-on-email-entry (Day-2 latency trick)

**Context:** Founder idea, captured verbatim: "we upload something to their device encrypted when they type email in and decrypt once they finish log in — we can use this."

**Pattern:** When the user types their email in the login/signup form, the client fires a silent POST to `/api/prefetch-workspace` with `{email}`. Server responds with an encrypted blob of the starter project files (or a session token referencing a prewarmed sandbox). Browser stores it in memory / IndexedDB. Once login completes, the client decrypts the blob and uses it to hydrate the workspace instantly — zero additional API roundtrip.

**Why deferred:** Sprint 1 already has the pre-deploy-during-Stripe-webhook pattern (ADR #47) and the DO-pre-warm-during-magic-link-click pattern (ADR #49). These absorb most of the cold start without the encryption layer, so the encrypted preload is a 2-5% marginal improvement for 5-10x more complexity (key management, encryption scheme, storage fallback, abandonment cleanup).

**What it would need:**
- Encryption scheme (AES-GCM with a session-derived key?)
- Client-side IndexedDB storage with TTL
- Server-side prefetch endpoint with rate limiting (abuse vector: enumeration of valid emails)
- Decryption-on-login logic that gracefully falls back if the blob is missing or stale
- Abandonment cleanup cron

**Trigger to revisit:** When measured Day-2 cold rehydrate exceeds 5s p50 in production AND the architect's Day-2 loading state narration is losing users (measurable via `day2_workspace_abandoned` analytics event).

---

## 3. Preload sandbox assets on the landing page

**Context:** Use `<link rel="preload">` or `<link rel="prefetch">` on the landing page to start warming browser caches for the Cloudflare Worker assets the user will need in the workspace.

**Why deferred:** Marginal impact. Cloudflare's edge cache already handles this for returning visitors. Benefit only shows for first-time signups.

**What it would need:** A small set of `<link rel="prefetch">` tags in the landing layout for known workspace assets (top 3-5 chunks).

**Trigger to revisit:** When landing-page → workspace time-to-interactive is measured and we find a specific asset that blocks first paint.

---

## 4. Predictive DO activation on "checkout started"

**Context:** The moment the user clicks the Builder EUR 19 button (but BEFORE Stripe redirect fires), we fire-and-forget a `prewarm(projectId)` request. This gives us ~30 seconds of extra warm time that absorb the Stripe interstitial latency.

**Why deferred:** Sprint 1 already pre-warms during the Stripe webhook callback (ADR #47), which catches users who completed checkout. Pre-warming on "checkout started" would catch them earlier but also wastes compute on users who abandon at the Stripe page (~10-15% of checkout starts). Not worth the complexity until cold start is measured as a retention problem.

**What it would need:**
- Client-side event when the user clicks the Stripe checkout button
- Server endpoint that maps {email or pending_session_id} → prewarmed DO
- Cleanup for prewarmed DOs that never convert

**Trigger to revisit:** When `checkout_started → workspace_entered` transition time has a measurable fat tail in production and we can correlate it to cold-start-related drop-off.

---

## 5. Durable Object hibernation + snapshot restore (the biggest latency win)

**Context:** Cloudflare Durable Objects support hibernation — on user logout, don't tear down the sandbox, instead snapshot its state (SQLite-backed via DO storage) and hibernate. Day-2 login thaws the snapshot, skipping the entire cold boot.

**Projected impact:** Day-2 cold rehydrate goes from "6-15s" to "sub-second." This is the biggest single latency improvement on the table.

**Why deferred:** Complexity + storage cost + unvalidated by the Sprint 0 spike. Needs a dedicated Sprint 2 spike to confirm:
- DO hibernation works with the Cloudflare Sandbox SDK's container lifecycle
- Storage cost per hibernated sandbox is tolerable at Meldar's scale
- Thaw latency is actually sub-second in practice (the architect's target)
- The hibernated sandbox can be un-thawed if the user's project files changed in the DB while they were away

**What it would need:**
- Sprint 2 spike: measure hibernation + thaw behavior with the Sandbox SDK
- DO-storage cost projection at 1000 hibernated sandboxes
- Reconciliation logic for "source files changed while hibernated" (probably: thaw, diff, re-apply)
- Eviction policy for long-idle hibernated sandboxes (e.g., >30 days)

**Trigger to revisit:** After Sprint 1 ships and we have real Day-2 cold rehydrate measurements. If p50 exceeds 5s, this becomes the top Sprint 2 optimization candidate.

---

## 6. Pre-built `.next` in the starter container image — **SHIPPING IN SPRINT 1**

**Context:** Run `next build` once at Docker build time, check in the resulting `.next` directory, and skip Turbopack's first-compile on every sandbox boot.

**Why NOT deferred:** Cheapest, biggest-bang-for-buck latency optimization. Already approved for Sprint 1.

**Cross-reference:** This is the ONE latency trick shipping in Sprint 1. The other four in this file are Phase 2.

---

## 7. Active "Ask Meldar" chat input

**Context:** A conversational input in the workspace chat panel where users can type free-form questions ("why did you use this library?", "what does this card do?", "how do I add a testimonials section?"). Routes to Haiku at 1 token per question.

**Why deferred:** The passive build commentary log ships in Sprint 1 and is the critical feature (silent 60+ seconds during Build = user thinks it's broken = drop-off). The active input is a classic "chatbot feature" that sounds great on paper but often gets underused unless carefully designed. Shipping without it forces us to learn what users actually want to ask before building the mechanism. Also saves ~1-2 days of frontend work + a `/api/workspace/chat` endpoint + Haiku routing in the orchestrator.

**What it would need when revived:**
- Conversational UI in the workspace chat panel (coexists with the passive log per UX architect §4.11)
- `/api/workspace/chat` SSE endpoint
- Haiku system prompt that understands the current project context (kanban state, last build, preview URL)
- Token accounting integration
- Explainer attachment (so every chat response has a "what just happened" companion)

**Trigger to revisit:** When workspace analytics show a critical mass of users clicking placeholder or trying to type into non-input areas, proving latent demand for "ask Meldar."

---

## 8. Drop terminology (Gen Z onboarding style)

**Context:** The product spec originally proposed splitting onboarding between "Recipe style" (for millennials — "follow this recipe and tweak it") and "Drop style" (for Gen Z — "drop 1, drop 2, drop 3"). The founder approved "Drop" as the zoomer term.

**Why deferred:** Researcher recommends Recipe-only for MVP. Saves a decision, a code path, and a testing burden. Drop terminology can A/B test post-launch once we have real user data.

**What it would need when revived:**
- Second onboarding style variant with Drop vocabulary
- User preference stored in `users.style` column (already added in Sprint 1 schema)
- Content variations: every learning explainer, every milestone, every email needs a Drop variant
- Analytics comparing conversion + retention across both styles

**Trigger to revisit:** After Sprint 1 ships and we have enough users to A/B test onboarding styles at statistically significant volume. OR: if founding-member interviews surface that Gen Z users find Recipe terminology alienating.

---

## 9. Corporate (Jari) persona flow

**Context:** Original spec proposed Jari as a secondary persona (41, corporate operations manager) reached via career-FOMO messaging. Architect initially planned UTM-based hero swap.

**Why deferred:** Zero corporate research exists in `docs/research/`. Jari is 100% inferred. Building a corporate conversion path without real interviews is a bet against unknown user needs.

**What it would need when revived:**
- 3-5 real interviews with corporate operations managers (researcher's §6 prerequisite)
- A dedicated `/teams` or `/professional` landing page (or UTM-swap path)
- Corporate-flavored copy variants (proof points: team productivity, ROI, professional credibility)
- A different first use case that resonates corporately (email triage? meeting notes? expense tracking?)
- Sales enablement materials if moving toward B2B

**Trigger to revisit:** Never, unless the founder explicitly runs corporate interviews and finds strong signal. Current recommendation is to drop corporate from MVP and revisit after initial launch data.

---

## 10. Recipe contribution rewards

**Context:** Users submit their successful kanban patterns as "recipes" that enter Meldar's template library. Contributors earn tokens as reward. Originally P2 in the v3 backlog.

**Why deferred:** P2 explicitly. Needs a critical mass of users (>50) before it's worth building.

**Trigger to revisit:** When the Meldar template library grows beyond the founder's ability to curate manually AND users are organically asking to share their patterns.

---

## 11. Pro Builder tier (EUR 39/mo)

**Context:** Higher token allowance, multiple concurrent projects, priority model routing. Originally P2 in the v3 backlog.

**Why deferred:** No data yet on whether Builder EUR 19 users hit the 500-token cap consistently. Premature.

**Trigger to revisit:** When >20% of Builder users exhaust their monthly token allowance in the first week.

---

## 12. Third-party API bundle (Leonardo, ElevenLabs, Runway, Perplexity)

**Context:** Meldar holds keys to premium creative APIs, users access via Meldar's proxy, Meldar earns margin on markup. Original v2 idea, kept in backlog.

**Why deferred:** Premature. Ship Katya's landing-page use case first, validate that users want to build real apps on Meldar, then consider adding creative APIs.

**Trigger to revisit:** When user interviews surface consistent "I wish I could add AI images / AI voice to my app" requests.

---

## 13. Multi-project workspace + team features

**Context:** Users work on multiple projects simultaneously, invite teammates, comment on each other's kanban cards.

**Why deferred:** Meldar's MVP is single-user, single-project. Team features are a massive scope expansion not warranted until there's a proven single-user product.

**Trigger to revisit:** Post-Series-A, or when >30% of users have multiple projects AND interviews surface collaboration pain.

---

## 14. Mentor / community layer

**Context:** Power users help newcomers with their builds. Reputation system, rewards for helping.

**Why deferred:** Requires scale Meldar doesn't have yet. Also: the "AI tutor that's always available" value prop competes with human mentorship — we should see if the AI alone is enough before adding humans.

**Trigger to revisit:** If churn analysis shows that users who get "stuck" on the AI-only workflow have higher abandonment than users who pay for Skip-the-Line VIP.

---

## 15. Project offload + reupload (bulk import)

**Context:** Founder decision 2026-04-06: users should be able to download their full Meldar project as a zip/tarball, edit it locally in their own editor, and upload the new version — which becomes a new Build event (`triggered_by='upload'`) in the event log. This is how we answer "can users hand-edit files outside of a Sonnet build?" — not with inline editing in the workspace, but with an explicit export/import loop. Preserves the brand promise ("your app, you own it") while keeping the orchestration model clean.

**Why deferred:** The founder explicitly called out the security surface: "we have to triple check the security standpoint here." Correct instinct — the attack surface on a user-uploaded project tarball is significant:

- **Path traversal:** `../../../etc/passwd` in zip entry names
- **Zip bombs:** 10KB input → 10GB decompressed, DoSing the worker
- **Symbolic links in tarballs:** point outside the sandbox
- **Binary exec content:** the sandbox runs the code, so a malicious uploaded binary targeting the container runtime is a live concern
- **Package dependency confusion:** user uploads `package.json` with a typosquatted malicious dep → Sonnet's next Build triggers `pnpm install` → RCE in sandbox
- **Secret ingestion:** user uploads with `.env` accidentally → secrets in R2 forever
- **File count / size bomb:** upload with 1M files → DB denial via Zod validation bypass attempts

The schema from Sprint 1 already supports this feature (it's just another `builds` row with `triggered_by='upload'` and a different file source), so enabling it later is a matter of adding the endpoint + validation + security review, NOT a schema migration. Defer safely.

**What it would need when revived:**
- `/api/projects/{id}/export` endpoint — streams a zip with all files at `current_build_id` (the persistence allowlist applies: no node_modules, .next, .git, etc.)
- `/api/projects/{id}/import` endpoint — accepts a zip, validates in a separate sandbox (NOT the user's live DO), creates a new Build, flips HEAD
- Security hardening checklist (must be passed before ship):
  - Zip entry path canonicalization + rejection of any `..` component
  - Decompressed-size limit enforced via streaming decompression (reject mid-stream if >50MB total)
  - Symlink rejection at tarball parse time
  - File count limit (200, same as Sonnet build cap)
  - MIME sniffing + denylist for binaries (allow only source text extensions)
  - Content scan for common secret patterns (`.env`, `BEGIN PRIVATE KEY`, AWS access key regex) — warn user, optionally block
  - `package.json` dependency scan: reject if not already in a known-good allowlist, OR run `pnpm audit` in an isolated sandbox before accepting
  - Rate limit: 1 import per project per minute
  - All imports processed in a dedicated "import validation" sandbox, NOT the user's live DO — isolate blast radius
- Event logging: `ProjectImported { projectId, buildId, fileCount, totalBytes, userId }` for audit

**Trigger to revisit:** When >10% of founding members explicitly ask for "can I edit my code locally and push back?" OR when the first power user files a feature request. The security work is non-trivial — estimate 1-2 weeks of dedicated effort with external security review recommended before ship.

**Cross-reference:** Sprint 1 schema decision 2026-04-06 — the `builds` table has `triggered_by text NOT NULL` with values `'user_prompt' | 'kanban_card' | 'rollback' | 'template'` at MVP; `'upload'` is reserved for when this feature ships.

---

## Appendix: Sprint 1 latency optimizations actually shipping

For reference, these are in Sprint 1 (NOT deferred):

1. **Pre-built `.next` in starter container** (Trick #3 from founder convo, fastest to implement, biggest bang-for-buck)
2. **Pre-deploy sandbox during Stripe webhook** (UX architect ADR #47)
3. **DO pre-warm during magic-link click** (UX architect ADR #49, Day-2 rehydrate mitigation)

Everything else is in this file.
