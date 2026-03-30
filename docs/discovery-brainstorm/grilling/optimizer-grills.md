# Cost & Scaling Grilling: Challenging Every Proposal

**Date:** 2026-03-30
**Role:** Autonomous Optimization Architect
**Purpose:** Stress-test cost claims, scaling assumptions, free tier abuse vectors, and AI-vs-rule-based categorizations across all discovery brainstorm documents.

---

## 1. Cost Claims Audit

### Current Anthropic Pricing (as of March 2026)

Before evaluating any cost claim, let's establish actual pricing. The documents reference various costs but several are stale or imprecise.

| Model | Input (per MTok) | Output (per MTok) | Cache Read | Notes |
|-------|:-:|:-:|:-:|---|
| **Claude Haiku 3.5** | $0.80 | $4.00 | $0.08 | The actual "cheap" model |
| **Claude Sonnet 4** | $3.00 | $15.00 | $0.30 | Mid-tier |
| **Claude Opus 4** | $15.00 | $75.00 | $1.50 | Expensive |

For **Vision** calls, images are converted to tokens. A typical screenshot (1568x resolution) is roughly **1,600 tokens** for a low-detail image. High-detail screenshots (Screen Time with many rows) can reach **3,000-6,000 tokens** depending on complexity.

### Claim-by-Claim Verification

#### ai-data-sources.md Claims

**Claim:** "Claude Haiku ~$0.002 per image"

**Reality check:** Let's compute. A Screen Time screenshot at ~1568px:
- Image input: ~1,600-4,000 tokens (depends on content density)
- System prompt + extraction instructions: ~500 tokens
- Total input: ~2,100-4,500 tokens
- Output (structured JSON): ~300-800 tokens
- **Haiku cost: (4,500 * $0.80 + 800 * $4.00) / 1,000,000 = $0.0036 + $0.0032 = $0.0068**

**Verdict: The $0.002 claim is 3x too low.** A more realistic Haiku Vision cost per screenshot is **$0.005-0.010** depending on image complexity and output length. Simple screenshots (alarms, battery) are closer to $0.005. Dense screenshots (Screen Time with 20+ apps, notification list) are closer to $0.010.

**Claim:** "Claude Sonnet ~$0.008 per image"

**Reality check:** Same token math:
- Input: (4,500 * $3.00 + 800 * $15.00) / 1,000,000 = $0.0135 + $0.012 = **$0.0255**

**Verdict: The $0.008 claim is 3x too low.** Sonnet Vision per screenshot is closer to **$0.020-0.030**.

**Claim:** "Claude Opus ~$0.03 per image"

**Reality check:**
- Input: (4,500 * $15.00 + 800 * $75.00) / 1,000,000 = $0.0675 + $0.06 = **$0.1275**

**Verdict: The $0.03 claim is 4x too low.** Opus Vision is more like **$0.10-0.15** per screenshot.

#### discovery-engine.md (my own document) Claims

**Claim:** "Screen Time OCR: $0.002 per parse (Haiku)"

**Verdict: My own claim is wrong by the same factor.** Should be $0.005-0.010.

**Claim:** "Time X-Ray narrative (Haiku): $0.001"

**Reality check:** A narrative generation call:
- Input: ~1,000 tokens (pattern summaries) + ~500 tokens (system prompt) = 1,500 tokens
- Output: ~500-1,000 tokens (3-paragraph narrative)
- **Haiku cost: (1,500 * $0.80 + 1,000 * $4.00) / 1,000,000 = $0.0012 + $0.004 = $0.0052**

**Verdict: 5x too low.** Narrative generation with Haiku is ~$0.005, not $0.001.

**Claim:** "Deep analysis (Sonnet): $0.008"

**Reality check:** A deep analysis call with multi-source data:
- Input: ~3,000-5,000 tokens (all patterns + context)
- Output: ~1,000-2,000 tokens (detailed analysis)
- **Sonnet cost: (5,000 * $3.00 + 2,000 * $15.00) / 1,000,000 = $0.015 + $0.03 = $0.045**

**Verdict: 5x too low.** Deep Sonnet analysis is ~$0.04-0.05, not $0.008.

### Corrected Cost Table Per User Journey

| Step | Original Claim | Corrected Cost | Delta |
|------|:-:|:-:|:-:|
| Screen Time OCR (Haiku Vision) | $0.002 | $0.007 | 3.5x |
| Subscription OCR (Haiku Vision) | $0.002 | $0.007 | 3.5x |
| Calendar OCR (Haiku Vision) | $0.002 | $0.006 | 3x |
| Notification OCR (Haiku Vision) | $0.002 | $0.006 | 3x |
| Email Inbox OCR (Haiku Vision) | $0.002 | $0.008 | 4x |
| Rule-based pattern detection | $0.00 | $0.00 | correct |
| Narrative generation (Haiku text) | $0.001 | $0.005 | 5x |
| Deep analysis (Sonnet text) | $0.008 | $0.045 | 5.6x |
| ChatGPT export analysis (Sonnet) | $0.01-0.05 | $0.03-0.15 | 3x |

### Corrected User Journey Costs

| Journey | Original Claim | Corrected | Notes |
|---------|:-:|:-:|---|
| **Typical user (1 screenshot)** | $0.003 | $0.012 | 1 OCR + 1 narrative |
| **Engaged user (3 screenshots)** | $0.008 | $0.030 | 3 OCR + 1 narrative |
| **Power user (5 screenshots + deep)** | $0.013 | $0.080 | 5 OCR + 1 narrative + 1 deep analysis |
| **Maximum (all sources + ChatGPT export)** | $0.025 | $0.200+ | Multiple OCR + analysis + export parsing |

**The original $0.02/user target is still achievable for the single-screenshot path, but barely.** The multi-screenshot "full X-Ray" blows past it significantly.

### Mitigation Strategies That Actually Work

1. **Prompt caching.** The system prompt for Screen Time extraction is identical across all users. With Anthropic's prompt caching, the ~500-token system prompt is cached at $0.08/MTok instead of $0.80/MTok — a 10x reduction on that portion. This saves ~$0.0004 per call. Helpful but small.

2. **Output length control.** The biggest cost lever is output tokens ($4.00/MTok for Haiku). Force structured JSON output with `max_tokens` limits. A Screen Time extraction needs ~200-400 tokens of output, not 800. This can halve the output cost.

3. **Image compression.** Resize to 1024px instead of 1568px for structured UIs (Screen Time, Subscriptions, Battery). These are grid layouts, not photographs — lower resolution is fine. This reduces image token count by ~40%.

4. **Skip the narrative for single-source reports.** If the user has only one screenshot, use a template, not an AI call. The narrative call ($0.005) is wasted when you could just say "You spend {x} hours on {app}. That's {y} hours per year."

With all mitigations applied:
- **Optimized single-screenshot cost: ~$0.005-0.007** (OCR only, template narrative)
- **Optimized 3-screenshot cost: ~$0.018-0.022** (3 OCR, template narrative, rule-based cross-source)
- **Optimized full X-Ray cost: ~$0.040-0.060** (5 OCR + 1 AI narrative)

---

## 2. Viral Math: 10K Users in a Day

### The Scenario

A TikTok video showing someone's Time X-Ray goes viral. 10,000 users arrive in 24 hours.

### What Breaks

**Cost explosion:**
- If each user uploads 1 screenshot: 10,000 x $0.007 = **$70**
- If each user uploads 3 screenshots (the recommended flow): 10,000 x $0.021 = **$210**
- If each user uploads 3 screenshots AND gets a narrative: 10,000 x $0.026 = **$260**
- If 10% request deep analysis: 1,000 x $0.045 = **$45** additional

**Total viral day cost: $200-$300** for the 3-screenshot flow. This is manageable.

**But the real problem is rate limits, not cost.**

Anthropic API rate limits (as of early 2026 for Haiku):
- Requests per minute (RPM): varies by tier, typically 1,000-4,000 for production tiers
- Tokens per minute (TPM): varies, typically 200K-400K for Haiku

At 10,000 users in 24 hours:
- Average arrival rate: ~7 users/minute
- Peak arrival rate (viral spikes are not uniform): **50-100 users/minute** during peak hours
- Each user triggering 1-3 API calls = **50-300 API calls/minute at peak**

**With a 1,000 RPM limit, this is fine.** With a lower-tier limit (200 RPM), peak hours could hit rate limits.

**Mitigation:**
- Request a rate limit increase proactively before any marketing push
- Implement a request queue with exponential backoff
- Show a "Your X-Ray is processing..." spinner with an email notification when results are ready (async processing)
- Cache OCR results aggressively — if the same image is uploaded twice (same hash), return cached result

### What Else Breaks at 10K Users/Day

**Vercel serverless functions:**
- Default: 1,000 concurrent executions
- Each OCR call takes 1-3 seconds (waiting for Claude)
- At peak (100 users/minute, 3 screenshots each = 300 calls/minute, each lasting 2 seconds): ~10 concurrent executions
- **This is fine.** Vercel handles this easily.

**Database (Neon Postgres):**
- 10,000 sessions x 3 sources each = 30,000 rows in `discovery_sources`
- Each row: ~1-2 KB (JSONB signals)
- Total data: ~30-60 MB
- **This is nothing.** Neon handles this trivially.

**Image proxy bandwidth:**
- 10,000 users x 3 screenshots x ~200KB each = ~6 GB of image uploads
- Vercel's free tier allows 100 GB/month bandwidth
- **This is fine for one viral day.** A sustained viral week (70K users) would exceed the free tier.

### The Real Risk: Repeated Viral Days

One viral day costs $200-300. If the product becomes consistently viral:
- 10K users/day for 30 days = 300K users = **$6,000-9,000/month** in AI costs alone
- At $0/revenue (free tier), this is an unsustainable burn

**The circuit breaker must be aggressive:**
- Free tier: 1 screenshot per session (not 3)
- Require email before the second screenshot (captures lead)
- Third screenshot requires account creation
- Deep analysis is paid-only

This changes the economics:
- 300K free users x 1 screenshot x $0.007 = **$2,100/month**
- If 5% convert to email capture and upload a second: 15K x $0.007 = **$105**
- If 1% reach deep analysis (paid): 3K x $0.045 = **$135**
- **Total: ~$2,340/month** — manageable with even modest revenue

---

## 3. Free Tier Abuse Vectors

### Vector 1: Screenshot Farming

**Attack:** A user uploads hundreds of screenshots (for themselves or others) to get unlimited free analyses.

**Severity:** Medium. Each analysis costs $0.007.

**Mitigation:**
- Rate limit by IP + session: max 5 screenshots per session, max 3 sessions per IP per day
- Require email after first screenshot — ties abuse to a real identity
- Fingerprinting (browser, device) as secondary rate limit signal
- Diminishing returns: after 3 screenshots, say "Unlock deeper insights with an account"

### Vector 2: API Scraping

**Attack:** Someone reverse-engineers the `/api/upload/analyze` endpoint and sends bulk requests, using Meldar as a free OCR-as-a-service.

**Severity:** High. This bypasses all UI-level rate limits.

**Mitigation:**
- CSRF token on the upload form
- Rate limit by API key / session token at the middleware level
- Validate that uploaded images look like phone screenshots (aspect ratio, resolution, content heuristics) — reject random images
- Monitor for anomalous patterns: many uploads from same IP with no session state, uploads at machine speed (< 1 second between requests)
- Consider moving to a serverless queue model where uploads are queued and processed asynchronously — this naturally throttles abuse

### Vector 3: Clipboard / Text Paste Abuse

**Attack:** The Copy-Paste Detective (rapid-prototypes.md #10) accepts arbitrary text and sends it to Claude Haiku. A user could use this as a free Claude chat by pasting long texts and getting analysis.

**Severity:** Medium-High. Text-based Claude calls are cheaper than Vision but still cost per token.

**Mitigation:**
- Hard character limit on text paste (1,000 chars)
- Rate limit: max 3 paste analyses per session
- The prompt is narrowly scoped (classify intent, suggest automation) — not a general-purpose chat

### Vector 4: Questionnaire Abuse (Non-Issue)

The questionnaire-based tools (Decision Fatigue Calculator, Sleep Procrastination Score, Meeting Tax Calculator, Content Creation Ratio) are **pure client-side**. No API calls. No cost. Unlimited usage is fine — and actually beneficial for viral sharing.

### Vector 5: ChatGPT Export as Free Analysis Tool

**Attack:** Users upload their ChatGPT `conversations.json` repeatedly to get free topic analysis of their conversations.

**Severity:** Medium. The Sonnet call for full export analysis is $0.03-0.15, making this the most expensive abuse vector.

**Mitigation:**
- Full export analysis is gated behind account creation
- Max 1 full export analysis per account per week
- Title-only analysis (sidebar screenshot) is the free path — much cheaper
- Client-side JSON parsing for basic stats (conversation count, topic distribution) with no AI call
- AI call only for the cross-reference narrative, not the raw extraction

### Vector 6: Share Card Generation as Image Service

**Attack:** Users generate shareable "Spotify Wrapped"-style cards and screenshot them for use in their own content, without engaging with the product.

**Severity:** Low. Card generation is server-rendered or client-rendered from existing data. No additional API cost.

**Response:** This is actually fine. Every shared card is free marketing. Let them.

---

## 4. Rule-Based vs AI: What Really Needs AI?

### Features That Genuinely Need AI

| Feature | Why AI? | Model | Can't be replaced because... |
|---------|---------|-------|------------------------------|
| **Screen Time OCR** | Extracting structured data from screenshots | Haiku Vision | Screenshots are unstructured images with variable layouts (iOS versions, languages, dark/light mode, manufacturer UI differences). No static parser works. |
| **Calendar Screenshot OCR** | Extracting events from visual calendar grids | Haiku Vision | Calendar UIs have overlapping blocks, color coding, truncated text. Needs visual understanding. |
| **Notification Screenshot OCR** | Extracting app names and counts from notification center | Haiku Vision | Grouped notifications, badges, icons, variable layouts across OS versions. |
| **Subscription Screenshot OCR** | Extracting app names and prices | Haiku Vision | Different App Store/Play Store layouts, currency formatting, renewal dates. |
| **Email Inbox Screenshot OCR** | Extracting sender/subject patterns | Haiku Vision | Variable email clients, threading, read/unread indicators. |
| **ChatGPT Export Topic Clustering** | Grouping 200+ conversation titles into themes | Sonnet text | Semantic understanding required — "Help me plan dinner" and "What should I cook tonight" are the same theme. No keyword matcher handles this. |
| **Multi-source Narrative Generation** | Creating readable cross-source insights | Haiku text | Template-based works for 1-2 sources but becomes rigid at 3+ where the interaction between patterns is unique per user. |

### Features Masquerading as "AI" That Are Actually If/Else

| Feature | What it claims | What it actually is | Savings |
|---------|---------------|--------------------|---------|
| **Decision Fatigue Calculator** | Correctly listed as pure client-side | Slider inputs x multipliers | $0 (already correct) |
| **Sleep Procrastination Score** | Correctly listed as pure client-side | Time difference calculations | $0 (already correct) |
| **Meeting Tax Calculator** | Correctly listed as pure client-side | Slider inputs x multipliers | $0 (already correct) |
| **Content Creation Ratio** | Correctly listed as pure client-side | Division + comparison | $0 (already correct) |
| **Zombie Subscription Detection** | discovery-engine.md implies AI | Compare subscription list against Screen Time usage = if app in subscriptions AND app not in top 20 screen time, flag it | Save $0.005/user by not calling AI for this |
| **Notification-to-Usage Ratio** | Could be done with AI, doesn't need it | Divide notification count by screen time minutes. Sort by ratio. Template the output. | Save $0.005/user |
| **Free Time Waste Detection** | discovery-engine.md implies cross-source AI | Find calendar gaps > 1 hour. Check screen time during those hours. If > 60% social media, flag. | Save $0.005/user |
| **Polling Behavior Detection** | Listed as rule-based, confirm it stays that way | Count visits to same domain > 3x/day for > 3 days. Template output. | Already $0 |
| **Context Switching Detection** | Listed as rule-based, confirm it stays that way | Count domain switches > 5 in 10 min window. Template output. | Already $0 |
| **Email Sender Analysis** | email-discovery.md implies AI | After OCR extraction, sender frequency analysis is just `GROUP BY sender ORDER BY count DESC`. | Post-extraction analysis is free |

### The Rule: AI for Extraction, Rules for Analysis

**All AI cost should be in data EXTRACTION (turning screenshots into structured data).** Once you have structured data, every analysis is deterministic:
- Ratios: division
- Zombies: set intersection (subscriptions NOT IN used_apps)
- Patterns: time-window aggregation
- Thresholds: if value > threshold, flag
- Rankings: sort by computed score
- Temporal overlap: range intersection

**The only post-extraction AI call that is justified is narrative generation for 3+ source reports**, where template combinatorics become unwieldy (you'd need templates for every combination of 3 from 18 sources = 816 combinations).

For 1-2 source reports, templates are sufficient. Write 20 good templates and handle 90% of users with zero AI cost beyond extraction.

---

## 5. The Real $/User Across All Proposed Features

### Scenario Analysis

**Scenario A: Viral-casual user (80% of users)**
- Arrives from TikTok/social
- Uploads 1 screenshot (Screen Time)
- Sees result card, screenshots it, shares it, leaves
- Never returns

| Cost Component | Amount |
|---|:-:|
| Screen Time OCR (Haiku Vision, optimized) | $0.005 |
| Template-based insight (no AI) | $0.000 |
| Share card generation | $0.000 |
| **Total** | **$0.005** |

**Scenario B: Engaged free user (15% of users)**
- Uploads 2-3 screenshots (Screen Time + Notifications + maybe Calendar)
- Provides email
- Sees cross-source insights
- Shares X-Ray card
- May or may not return

| Cost Component | Amount |
|---|:-:|
| 3 OCR calls (Haiku Vision, optimized) | $0.015-0.020 |
| Cross-source analysis (rule-based) | $0.000 |
| Template narrative (no AI for 2 sources, Haiku for 3) | $0.000-0.005 |
| **Total** | **$0.015-0.025** |

**Scenario C: Power user / potential paying customer (5% of users)**
- Uploads 5+ screenshots
- Tries a questionnaire tool
- Does ChatGPT sidebar screenshot
- Requests deep analysis
- Strong conversion candidate

| Cost Component | Amount |
|---|:-:|
| 5 OCR calls (Haiku Vision, optimized) | $0.025-0.035 |
| Cross-source analysis (rule-based) | $0.000 |
| AI narrative (Haiku text) | $0.005 |
| Deep analysis (Sonnet text) | $0.040-0.050 |
| Questionnaire tools (client-side) | $0.000 |
| **Total** | **$0.070-0.090** |

**Scenario D: ChatGPT export power user (< 1% of users)**
- Everything in Scenario C
- Plus full ChatGPT export analysis
- Plus Google Takeout

| Cost Component | Amount |
|---|:-:|
| Scenario C costs | $0.080 |
| ChatGPT export analysis (Sonnet, large context) | $0.050-0.150 |
| Google Takeout pattern analysis (client-side extraction + Sonnet narrative) | $0.030-0.050 |
| **Total** | **$0.160-0.280** |

### Blended Cost Per User

Weighting by expected distribution:

```
(0.80 x $0.005) + (0.15 x $0.020) + (0.05 x $0.080) + (0.00 x $0.200)
= $0.004 + $0.003 + $0.004 + $0.000
= $0.011 per user (blended average)
```

**The blended cost per user is ~$0.011.** This is well within the $0.02 target IF:
1. The distribution holds (80% casual, 15% engaged, 5% power)
2. Rate limits and gating prevent abuse
3. AI is reserved strictly for extraction, not analysis

### At Scale

| Users/month | Blended Cost | Notes |
|:-:|:-:|---|
| 1,000 | $11 | Negligible |
| 10,000 | $110 | Manageable |
| 100,000 | $1,100 | Needs revenue to sustain |
| 1,000,000 | $11,000 | Must have paying users covering free tier |

**Break-even math:** If 2% of free users convert to Starter at $9/month:
- 100K free users x 2% conversion = 2,000 paying users
- Revenue: 2,000 x $9 = $18,000/month
- AI cost: $1,100/month
- **Margin: 94%** on AI costs (other costs: Vercel, Neon, Resend not included)

The unit economics work. The original cost estimates were wrong by 3-5x, but the architecture (rule-based first, AI for extraction only) keeps the blended cost low enough that it doesn't matter much.

---

## Summary of Findings

### Critical Issues

1. **All cost-per-call estimates in every document are 3-5x too low.** This is because they undercount image tokens and output tokens. The corrected costs don't break the model but they need to be updated in all documents to prevent surprise when the first real bills arrive.

2. **The $0.02/user target is achievable ONLY if the gating strategy is enforced:** 1 free screenshot, email for second, account for third, deep analysis is paid. Without gating, engaged users easily reach $0.03-0.08.

3. **ChatGPT full export analysis is dangerously expensive.** A large export (200+ conversations) can require 10K+ input tokens on Sonnet, pushing a single analysis to $0.10-0.15. This MUST be paid-only or heavily rate-limited.

### Moderate Issues

4. **Rate limits, not costs, are the real viral bottleneck.** Ensure Anthropic rate limits are upgraded before any marketing push. Implement async processing with email notification as a fallback.

5. **The "Sonnet for fallback" pattern (ai-data-sources.md) is expensive.** If Haiku extraction fails and we retry with Sonnet, the cost jumps 4x. Better to retry with Haiku using a refined prompt than to escalate to Sonnet. Only escalate for genuinely complex images (browser tabs, LinkedIn feed).

### Things That Are Actually Fine

6. **Questionnaire-based tools (4 of the 10 rapid prototypes) cost zero.** These are correctly designed as client-side calculations. Ship all 4 immediately — they are free viral tools.

7. **The rule-based pattern detection layer costs zero.** The architecture correctly separates extraction (AI, costs money) from analysis (rules, free). This is the right call.

8. **The SourceProcessor registry architecture is sound.** One endpoint, pluggable processors, JSONB signals, computed profiles. No concerns here.

9. **The viral day scenario ($200-300) is affordable.** Even a 10K-user day doesn't break the bank if gating is in place.

### Recommendations

1. **Update all cost estimates** in every document to use corrected figures.
2. **Gate aggressively:** 1 free screenshot, email for second, account for third.
3. **Ship questionnaire tools first** (zero cost, pure viral potential).
4. **Make ChatGPT full export a paid feature** from day one.
5. **Implement prompt caching** for all Vision calls (system prompt is identical across users).
6. **Set `max_tokens` on all Vision calls** to prevent output cost overruns.
7. **Compress images to 1024px** for structured screenshots (Screen Time, Subscriptions, Battery).
8. **Never retry with Sonnet on Haiku failure.** Retry with Haiku + refined prompt instead.
9. **Monitor actual costs from day one.** Log every API call with model, input tokens, output tokens, and cost. Build the cost dashboard before building the fifth data source.
10. **Set a hard daily spend cap** ($10/day initially, adjustable) with an alert at 80%.
