# Paid Social Strategist Review
## Meldar Marketing Blitz Plan -- Full-Funnel Paid Social Assessment

**Reviewer**: Paid Social Strategist
**Date**: 2026-04-12
**Scope**: Meta campaign architecture, persona page farm model, LinkedIn paid, TikTok, cross-platform audience strategy, iOS privacy mitigation, full-funnel design

---

## Executive Summary

The plan's ambition is clear -- replicate MedVi's multi-persona page farm model at scale across Meta, then layer LinkedIn and TikTok on top. The core insight (authority-based personas running native ads) is sound and can outperform branded campaigns for cold audiences. However, the plan as written has critical structural flaws in Meta Ads Manager architecture, dangerously underestimates platform enforcement risk, sets unrealistic LinkedIn expectations at $2K/mo, and lacks the measurement infrastructure needed to survive post-ATT paid social.

Below is a section-by-section teardown with actionable redesigns.

---

## 1. Meta Campaign Redesign -- The Persona Page Farm Model

### What the Plan Gets Wrong

The plan calls for "50 pages x 5 campaigns = 250 concurrent campaigns minimum." This is an account structure nightmare that will:
- Fragment learning across too many campaigns, preventing Meta's algorithm from exiting the learning phase
- Create massive auction overlap (your own pages bidding against each other for the same audience)
- Make optimization nearly impossible -- no human or automated system can manage 250+ campaigns effectively
- Trigger automated review flags at Meta for unusual account activity patterns

### Recommended Architecture

**Account Structure: Hub-and-Spoke Model**

```
Business Manager (Master)
  |
  +-- Ad Account A (Pages 1-10)
  |     +-- Campaign 1: Prospecting CBO [Advantage+ Shopping if eligible, otherwise Manual Sales/Leads]
  |     |     +-- Ad Set 1: Broad (18-65, geo only) -- let Meta find the audience
  |     |     +-- Ad Set 2: Interest stack (career dev + job search + AI)
  |     |     +-- Ad Set 3: Lookalike 1% from quiz completers
  |     |     +-- [Each ad set contains ads from 2-3 different persona pages]
  |     |
  |     +-- Campaign 2: Retargeting ABO [Manual, Conversions objective]
  |     |     +-- Ad Set 1: Video viewers 75% (7d) -- persona-matched creative
  |     |     +-- Ad Set 2: Landing page visitors (14d) -- urgency creative
  |     |     +-- Ad Set 3: Quiz abandoners (30d) -- step-specific messaging
  |     |
  |     +-- Campaign 3: Advantage+ Shopping Campaign (ASC)
  |           +-- Feed all creative variants, let Meta's ML handle placement/audience
  |
  +-- Ad Account B (Pages 11-20)
  |     [Mirror structure]
  |
  +-- [Repeat for groups of 10 pages]
```

**Key Structural Decisions:**

| Decision | Recommendation | Rationale |
|----------|---------------|-----------|
| CBO vs ABO | CBO for prospecting, ABO for retargeting | CBO lets Meta shift budget to winning ad sets in prospecting. ABO gives you fixed-spend control on known-value retargeting pools |
| Advantage+ vs Manual | Use ASC for 30-40% of prospecting budget; manual for the rest | ASC outperforms manual for conversion-optimized campaigns when you have sufficient creative volume (you will). Manual retains control for testing hypotheses |
| Campaign Objective | Leads (with lead method = website) or Conversions (quiz completion event) | Do NOT use Traffic -- it optimizes for clicks, not conversions. Never use Engagement for acquisition |
| Optimization Event | Quiz Completion (custom event) as primary; Quiz Start as fallback if volume is too low for quiz completion | Meta needs ~50 conversions/week per ad set to exit learning. If quiz completions are too sparse, optimize one step higher in the funnel |
| Bid Strategy | Lowest cost (no cap) for first 2 weeks, then introduce cost cap at 1.2x observed CPA | Starting with cost caps kills learning. Let it run, observe, then constrain |
| Placements | Advantage+ placements (all placements) -- do NOT restrict to feed only | Reels, Stories, and Audience Network often deliver cheaper CPAs. Creative should be formatted for all placements (9:16, 1:1, 4:5) |

**Campaigns Per Ad Account: Maximum 5-8 active campaigns.** Not 25. Not 50. Five to eight. This is the single most important structural fix in this entire plan.

**Pages Per Ad Account: 10 maximum.** Spread across multiple Business Managers if needed (see scaling section below).

### Creative Strategy Within Meta

The plan's creative formats are solid. Refine the execution:

- **UGC-style expert recommendation**: This is your primary format. Shoot for 60%+ of creative mix. The persona authority angle ("As a recruiter with 15 years experience...") is your differentiator. Use Advantage+ Creative to auto-generate variations (text overlays, aspect ratios)
- **Carousel ("5 things recruiters find")**: Strong for mid-funnel. Use dynamic creative to test headline/image combinations
- **Transformation story (single image)**: Lower performer for cold traffic. Reserve for retargeting quiz abandoners
- **Reels (15-30s career tips)**: Must have strong hook in first 1.5 seconds. Target thumb-stop rate of 25%+. If a creative drops below 15% thumb-stop, kill it immediately regardless of CPA

**Creative Volume Target**: The plan says 50 creatives in Week 1. This is actually conservative for this model. Target:
- Week 1: 100 creatives (20 per persona for first 5 personas)
- Ongoing: 30-50 new creatives/week
- Kill threshold: any creative with <1% CTR after 1,000 impressions or >2x target CPA after $50 spend

---

## 2. The Page Farm Scaling Playbook -- 10 to 100 Pages Without Getting Banned

This is the highest-risk element of the entire plan. Meta has been aggressively enforcing against coordinated inauthentic behavior (CIB) since 2020. Here is the step-by-step playbook to mitigate (not eliminate) that risk.

### Phase 1: Foundation (Weeks 1-2) -- 10 Pages

1. **Business Manager hygiene**: Create 2-3 separate Business Managers using different admin emails (not all tied to one person). Each BM should have its own payment method
2. **Page creation cadence**: Maximum 2-3 pages per day per BM. Never batch-create pages
3. **Page categorization**: Use "Education" or "Personal Blog" as the plan suggests. Correct call -- "Business" pages face heavier ad review
4. **Organic seeding**: The plan says 10-15 organic posts before ads. Increase this to 20-25 posts over 2-3 weeks. Posts should include:
   - Original text posts with career advice (not just links)
   - Shared articles from legitimate news sources
   - At least 2-3 image/video posts
   - Respond to any comments (even if you seed them yourself from personal accounts)
5. **Follower campaigns**: The plan budgets $500-1K per page. Revise downward to $200-400. You don't need 10K followers -- 2K-3K is sufficient social proof. Overspending on followers is a waste and the follower campaigns are low-quality traffic anyway
6. **First ad launch**: Start with 1 campaign per page, not 3-5. Low-spend ($20-50/day). Observe for 7 days before scaling

### Phase 2: Controlled Expansion (Weeks 3-6) -- 10 to 30 Pages

7. **Add 3-4 pages per week**, distributed across different BMs
8. **Diversify page "DNA"**: Vary profile photos, bios, posting styles, URL patterns. Meta's CIB detection uses similarity clustering -- if 30 pages all have the same posting pattern, link to the same domain, and use similar creative, they'll be flagged
9. **Stagger ad launches**: No two new pages should start running ads on the same day from the same BM
10. **Domain diversity**: Use 2-3 different landing page domains (e.g., meldar.com, digitalfootprintscan.com, careervisibility.com) -- all pointing to the same funnel. This reduces the "coordinated linking" signal
11. **Payment diversification**: Use different payment methods across BMs. Shared payment = shared risk
12. **Monitor page health daily**: Check for restricted pages, ad account warnings, or policy violations. One violation can cascade to an entire BM

### Phase 3: Scale (Weeks 7-12) -- 30 to 100 Pages

13. **Agency BM structure**: At this scale, consider creating 5-10 "agency-style" Business Managers, each managing 10-15 pages. This mirrors how legitimate agencies operate
14. **Automated monitoring**: Set up alerts for page restrictions, ad disapprovals, and account spending anomalies
15. **Contingency pages**: Always have 10-15 "warm" pages (seeded with organic content, some followers, but not yet running ads) ready to replace any that get flagged
16. **Rotation strategy**: Rotate page activity. Not all 100 pages should be running ads simultaneously. Run 40-60 active at any time, rest the others
17. **Content differentiation at scale**: Use different AI content generation prompts per page cluster. Identical or near-identical content across pages is a primary CIB signal

### Critical Risk Warnings

| Risk | Severity | Mitigation |
|------|----------|------------|
| Mass page takedown (CIB enforcement) | CRITICAL | BM diversification, content differentiation, staggered launches |
| Ad account ban cascade | HIGH | Separate payment methods, separate BMs, no shared admins across more than 2-3 BMs |
| Landing page domain ban | HIGH | Multiple landing domains, clean redirect chains, Meta-compliant landing pages |
| Creative policy violations (AI-generated faces presented as real people) | MEDIUM-HIGH | Meta's policy on synthetic media is tightening. Disclose AI-generated content where required. Monitor policy changes monthly |
| Follower campaign waste | MEDIUM | Cap at $200-400/page, focus on organic growth through cross-engagement |

**Hard Truth**: At 100 persona pages, you WILL lose some. Budget for a 10-20% attrition rate per month. The question is not "will pages get banned" but "can you replace them faster than they get banned." The contingency page pipeline (step 15) is not optional -- it is a core operational requirement.

---

## 3. LinkedIn Paid Strategy -- Is $2K/Month Enough?

### Short Answer: Barely, but Viable With the Right Approach

LinkedIn's average CPM is $30-60 (vs Meta's $5-15). Average CPC is $5-12. Average cost per lead via Lead Gen Forms is $30-75 for B2B SaaS. At $2K/month, you are working with roughly:

- **33-66 clicks per day** (at $1-2/click for Sponsored Content in some geos -- optimistic)
- **27-67 leads per month** (at $30-75/lead)
- **Reality check**: More likely 15-30 qualified leads/month

### Minimum Viable LinkedIn Ads Approach at $2K/Month

**Do This:**

1. **Single campaign, single objective: Lead Gen Forms**
   - Do NOT use website conversion campaigns on LinkedIn at this budget. LinkedIn's pixel is inferior to Meta's, and you won't have enough conversion volume for optimization
   - Lead Gen Forms capture data natively within LinkedIn = higher conversion rate, no landing page friction
   - Form fields: Name, Email, Job Title, Company (all auto-filled by LinkedIn)
   - Offer: "Get Your Team's Free Digital Footprint Audit" (B2B angle) or "Free Digital Footprint Score" (individual angle)

2. **Targeting -- go narrow and precise:**
   - Job titles: HR Director, VP People, Chief People Officer, L&D Manager, Talent Acquisition Director
   - Company size: 200-10,000 employees (mid-market sweet spot)
   - Industries: Technology, Financial Services, Professional Services, Healthcare (highest digital-awareness verticals)
   - Geography: USA + UK only (don't dilute budget across EU/Ukraine on LinkedIn)
   - Expected audience size: 50K-200K

3. **Creative: Thought leadership Sponsored Content only**
   - Single image + long-form copy (150-300 words)
   - Frame as industry insight, not product pitch: "67% of hiring managers now Google candidates before interviews. Is your team's digital footprint helping or hurting your employer brand?"
   - CTA: "Get the free audit"
   - Rotate 3-4 creative variants, kill losers after 2,000 impressions each

4. **Budget allocation:**
   - $1,500/mo on Lead Gen Form campaign
   - $500/mo on retargeting (website visitors from other channels who are on LinkedIn) -- this is where LinkedIn's precision targeting actually shines

**Do NOT Do This (at $2K/month):**

- Conversation Ads (minimum viable test is $3K+/month due to high send costs)
- Video ads (LinkedIn video CPVs are expensive and you need volume for optimization)
- Account-Based targeting of Fortune 500 (audience too small for algorithmic optimization at this spend)
- Sponsored InMail to enterprise (requires $5K+ to generate meaningful pipeline)

**Scale Triggers:**
- If Lead Gen Forms deliver leads at <$50/lead with >10% form completion rate, increase to $5K/month
- If leads convert to demos/trials at >5%, increase to $10K/month and add Conversation Ads
- If enterprise pipeline develops, allocate dedicated ABM budget of $3-5K/month separately

### LinkedIn Ads Verdict

$2K/month is a test budget, not a growth budget. It's enough to validate whether LinkedIn-sourced leads convert to paid users/enterprise pipeline. But do not expect it to be a meaningful acquisition channel at this spend level. The real LinkedIn play for Meldar at this stage is organic (CEO personal brand + persona accounts) with paid as a retargeting layer.

---

## 4. TikTok Opportunity Assessment

### Is TikTok Right for This Audience?

**Partially yes, but not for the reasons the plan assumes.**

The plan's ICP is professionals 28-45 worried about AI replacing them. TikTok's user base skews younger than Meta/LinkedIn, but the 25-44 age bracket now represents ~36% of TikTok's user base in the US and UK. The career content vertical ("CareerTok") is one of the fastest-growing content categories.

**Where TikTok fits in this strategy:**

| Use Case | Fit | Rationale |
|----------|-----|-----------|
| Top-of-funnel awareness | STRONG | Career anxiety content performs exceptionally well. "Did you know recruiters can see THIS?" is native TikTok format |
| Quiz funnel traffic | MODERATE | TikTok users will take the quiz, but expect lower quiz completion rates (shorter attention spans, mobile-only) |
| Paid conversion (direct to paid) | WEAK | TikTok audiences are harder to convert directly to $29/mo SaaS. Use it as a TOFU channel, not a conversion channel |
| B2B/enterprise | VERY WEAK | Do not attempt B2B messaging on TikTok |

### TikTok Format Recommendations

**Priority 1: Spark Ads (80% of TikTok budget)**

Spark Ads let you boost organic posts from your persona accounts as paid ads. This is the right primary format because:
- Native look and feel (no "ad" aesthetic)
- Engagement accrues to the organic post (builds page following)
- Outperforms standard in-feed ads by 30-50% on engagement rate benchmarks

Workflow:
1. Post 3-5 organic videos per week from each of 5 TikTok persona accounts (10-20 accounts is overkill -- start with 5)
2. Identify posts that achieve >8% engagement rate organically within 48 hours
3. Boost those as Spark Ads with $50-200/day budgets
4. Target: Broad (25-45, US/UK), let TikTok's algorithm find the audience
5. Optimization event: "Complete Registration" (quiz completion)

**Priority 2: Standard In-Feed Ads (20% of budget)**

For creatives that don't fit organic posting:
- "Green screen" style: persona on camera with digital footprint results on screen behind them
- "Stitch" format: reacting to career advice content
- "Before/after" transformation: worried professional -> confident professional with improved digital footprint

**Creative Rules for TikTok:**
- First 1 second: pattern interrupt (visual or audio). "STOP scrolling if you've ever Googled yourself" or abrupt text overlay
- 15-30 second maximum (shorter is better for paid)
- Vertical 9:16 only, no letterboxing
- Native TikTok editing tools (CapCut, in-app effects) outperform polished production
- Use trending sounds/music when possible (check TikTok Creative Center for trending audio)
- Text overlays are mandatory -- 85%+ of TikTok is watched without sound
- Thumb-stop target: 30%+ (TikTok benchmark is higher than Meta)

**TikTok Budget Recommendation:**

$2K/month is appropriate for a test phase. Allocate:
- $1,600 Spark Ads (boosting winning organic)
- $400 standard in-feed (testing non-organic creative concepts)

Scale trigger: Any creative achieving <$3 CPA for quiz completion at >25% thumb-stop rate

**TikTok Risk: Account bans for persona accounts.** TikTok is more aggressive than Meta about detecting inauthentic accounts. Limit to 5 accounts, use real phone numbers for each, and maintain consistent posting cadence. Do not link them to each other.

---

## 5. Cross-Platform Audience Strategy

### The Overlap Problem

Running the same targeting across Meta, LinkedIn, and TikTok without coordination means you're paying to reach the same people multiple times across platforms -- but with no frequency control or attribution clarity.

### Recommended Cross-Platform Architecture

**Layer 1: Platform-Specific Prospecting (No Overlap)**

| Platform | Prospecting Audience | Why This Segmentation |
|----------|---------------------|----------------------|
| Meta (persona pages) | Broad interest-based + Lookalikes | Meta's algorithm is best at finding conversion-likely users from broad targeting. Let it optimize |
| LinkedIn | Job title + company size + seniority | LinkedIn's unique data advantage is professional graph. Use it for what only LinkedIn can do |
| TikTok | Broad demo (25-45) + behavioral (career content viewers) | TikTok's algorithm is interest-graph based. Don't over-target -- let it find your audience |

**Layer 2: Cross-Platform Retargeting (Coordinated)**

Create a unified retargeting strategy using your own first-party data:

```
Tier 1 Retargeting (Highest Intent -- All Platforms):
  - Quiz abandoners (started but didn't complete)
  - Pricing page visitors
  - Scan starters who didn't purchase
  - Retarget on: Meta, LinkedIn, TikTok (all)
  - Frequency cap: Combined 3-5x/week across platforms

Tier 2 Retargeting (Medium Intent -- Meta + LinkedIn only):
  - Landing page visitors (no quiz start)
  - Blog readers (2+ pages)
  - Retarget on: Meta, LinkedIn
  - Frequency cap: Combined 2-3x/week

Tier 3 Retargeting (Low Intent -- Meta only):
  - Video viewers (50%+ on any platform)
  - Social engagers
  - Retarget on: Meta only (cheapest retargeting CPMs)
  - Frequency cap: 1-2x/week
```

**Layer 3: Suppression Lists (Critical)**

- Upload paying customer list to ALL platforms monthly -> exclude from prospecting and retargeting
- Upload free scan completers to ALL platforms -> exclude from prospecting (move to upgrade nurture)
- Upload quiz completers to Meta -> exclude from top-of-funnel campaigns (move to retargeting)

### Frequency Management Across Platforms

The plan mentions no cross-platform frequency management. This is a gap.

**Targets:**
- Prospecting: 1.5-2.5x per user per week per platform (so ~5-7x total across platforms)
- Retargeting: 3-5x per user per week per platform, BUT use suppression to ensure a user isn't being retargeted on all 3 platforms simultaneously
- Total maximum exposure: 10-12x per user per week across all platforms

**How to enforce this without a unified frequency cap tool:**
1. Match audience lists across platforms using email hashes (upload customer/lead lists to all platforms)
2. Use platform-native frequency caps: Meta (set at campaign level), LinkedIn (set at campaign level), TikTok (set at ad group level)
3. Stagger retargeting windows: Meta retargets days 1-7, LinkedIn retargets days 7-14, TikTok retargets days 1-3 (for highest-intent only)
4. Monitor cross-platform overlap reports monthly (Meta Audience Overlap tool, LinkedIn Campaign Manager audience insights)

---

## 6. iOS Privacy / Post-ATT Measurement Mitigation

### The Problem

The plan mentions "Meta Pixel + Conversions API" but doesn't address the fundamental reality: post-ATT (Apple's App Tracking Transparency), Meta can only deterministically match ~35-40% of iOS conversions. The rest is modeled. This means your reported CPA is likely 20-40% lower than actual CPA.

### Required Infrastructure

**1. Meta Conversions API (CAPI) -- Non-Negotiable**

The plan mentions CAPI. Confirm implementation priority:
- Server-side event tracking for ALL key events: PageView, ViewContent (quiz start), Lead (quiz completion), Purchase (scan purchase)
- Deduplication with browser pixel events (use event_id parameter)
- Pass back maximum user data: email (hashed), phone (hashed), first name, last name, city, state, zip, country
- Test in Events Manager > Test Events before going live
- Expected match rate target: >70% (with email + phone passed back)

**2. Aggregated Event Measurement (AEM)**

- Configure your 8 prioritized events in Events Manager:
  1. Purchase (highest priority)
  2. Subscribe
  3. StartTrial
  4. CompleteRegistration (quiz completion)
  5. Lead (email capture)
  6. AddToCart (pricing page view)
  7. ViewContent (quiz start)
  8. PageView (lowest priority)
- You only get 8 events per domain per iOS user. Prioritize conversion events over engagement events

**3. UTM-Based Measurement (Parallel System)**

Do not rely solely on Meta's reported numbers. Build a parallel measurement system:
- Strict UTM taxonomy: `?utm_source=meta&utm_medium=paid&utm_campaign={campaign_name}&utm_content={ad_name}&utm_term={persona_page_name}`
- GA4 attribution: compare Meta's reported conversions vs GA4's last-click attribution
- Expected discrepancy: Meta will report 20-50% more conversions than GA4. The truth is somewhere in between
- Build a weekly reconciliation spreadsheet comparing: Meta reported conversions, GA4 attributed conversions, Stripe actual revenue, and CAPI match rate

**4. LinkedIn Measurement**

- LinkedIn Insight Tag on all pages
- LinkedIn CAPI (available since 2024) -- implement for lead gen form follow-up tracking
- LinkedIn's attribution is primarily last-click and even less reliable than Meta's post-ATT. Rely on UTM + GA4 for LinkedIn measurement

**5. TikTok Measurement**

- TikTok Pixel + Events API (TikTok's equivalent of CAPI)
- TikTok's measurement is the least mature of the three platforms. Use TikTok's "Advanced Matching" to pass back hashed email/phone
- Self-Attributing Network (SAN) reporting: TikTok will over-report conversions. Discount TikTok-reported conversions by 30-40% as a rule of thumb

### North Star Metric for Measurement

**Do not optimize to platform-reported CPA.** Instead, build a blended CPA model:

```
True CPA = Total Platform Spend / Stripe-Verified Conversions (within attribution window)
```

This eliminates platform reporting inflation. Track weekly by channel.

---

## 7. Full-Funnel Architecture

### Current Plan Gaps

The plan's "tier" system (Brand / Problem-aware / Solution-aware / Competitor conquest) is a content taxonomy, not a funnel architecture. A proper full-funnel design ties specific campaigns to specific audience states with specific creative and specific conversion events.

### Recommended Full-Funnel Design

```
STAGE 1: PROSPECTING (Cold -- Never Heard of Meldar)
  |
  |  Objective: Awareness -> Quiz Start
  |  Platforms: Meta (persona pages), TikTok (Spark Ads)
  |  Audiences: Broad interest, Lookalikes, Behavioral
  |  Creative: UGC persona authority, Career fear hooks, "Did you know?" format
  |  CTA: "Check Your Digital Footprint" or "Take the Free Quiz"
  |  Optimization Event: Quiz Start (if volume too low for Quiz Completion)
  |  Budget: 50-60% of total paid budget
  |  KPIs: CPM <$15, CTR >1.5%, Thumb-stop >25%, Cost per Quiz Start <$3
  |
  v
STAGE 2: ENGAGEMENT (Warm -- Interacted But Didn't Convert)
  |
  |  Objective: Quiz Completion
  |  Platforms: Meta (retargeting), LinkedIn (retargeting website visitors)
  |  Audiences: Video viewers 50%+, Landing page visitors, Quiz starters (didn't complete)
  |  Creative: Social proof (testimonials, results), Urgency ("Your score is waiting"),
  |            Step-specific messaging for quiz abandoners
  |  CTA: "Finish Your Scan" or "See What Recruiters See"
  |  Optimization Event: Quiz Completion
  |  Budget: 20-25% of total paid budget
  |  KPIs: Quiz completion rate >40%, Cost per Quiz Completion <$8
  |
  v
STAGE 3: RETARGETING (Hot -- Completed Quiz, Didn't Purchase)
  |
  |  Objective: Free-to-Paid Conversion
  |  Platforms: Meta, LinkedIn, Programmatic Display
  |  Audiences: Quiz completers (saw score, didn't purchase), Pricing page visitors
  |  Creative: Specific results ("You scored 43/100 -- here's how to fix it"),
  |            Time-limited offers ($19 first month), Case studies,
  |            "Before/after" transformations
  |  CTA: "Start Your Full Scan for $19" or "Fix Your Digital Footprint Today"
  |  Optimization Event: Purchase
  |  Budget: 15-20% of total paid budget
  |  KPIs: ROAS >3:1, Cost per Purchase <$20, Frequency 3-5x/week
  |
  v
STAGE 4: RETENTION / EXPANSION (Customer -- Already Paying)
  |
  |  Objective: Upsell, Cross-sell, Reduce Churn
  |  Platforms: Meta (custom audience of paying customers), Email (primary)
  |  Audiences: Paying customers segmented by plan type and tenure
  |  Creative: New feature announcements, Annual plan upgrade offers,
  |            Cross-sell (LinkedIn Optimizer, Resume AI)
  |  CTA: "Upgrade to Annual (Save 40%)" or "Try LinkedIn Optimizer Free"
  |  Budget: 5-10% of total paid budget
  |  KPIs: Annual plan upgrade rate >20%, Cross-sell attach rate >10%, Churn <5%/mo
```

### Funnel Timing and Sequencing

| User Action | What Happens Next (Paid) | Timing |
|-------------|-------------------------|--------|
| Sees ad, doesn't click | Re-serve different creative from different persona page | 24-48 hours |
| Clicks ad, bounces from landing page | Stage 2 retargeting: social proof creative | 1-24 hours |
| Starts quiz, abandons at Step 2 | Step-specific retargeting: "You're 3 questions away from your score" | 2-6 hours |
| Starts quiz, abandons at Step 4 (email capture) | Email capture retargeting + parallel email nurture | 1-4 hours |
| Completes quiz, sees score, doesn't purchase | Stage 3 retargeting: urgency + offer creative | 1-24 hours |
| Completes quiz, visits pricing, doesn't purchase | High-intent retargeting: $19 first month offer | 30 min - 4 hours |
| Purchases | Suppress from all acquisition campaigns. Move to Stage 4 | Immediate |

### Dynamic Creative Rules by Funnel Stage

| Funnel Stage | Headline Tone | Image/Video Style | CTA Style |
|-------------|--------------|-------------------|-----------|
| Stage 1 (Cold) | Curiosity / Fear: "What Google says about you might shock you" | Persona authority, professional headshot, career lifestyle | Soft: "Find out free" |
| Stage 2 (Warm) | Social proof / FOMO: "Join 2,000+ professionals who've checked their footprint" | Results screenshots, testimonial clips | Medium: "Complete your scan" |
| Stage 3 (Hot) | Urgency / Value: "Your score: 43/100. Fix it for $19" | Before/after, specific results, countdown timers | Hard: "Start now for $19" |
| Stage 4 (Customer) | Helpful / Expansion: "New: LinkedIn Profile Optimizer now included" | Product UI, feature demos, success metrics | Value: "Unlock free" |

---

## 8. Budget Reallocation Recommendations

The current budget split needs adjustment based on the analysis above:

### Current vs Recommended (Month 1 -- $15K Total Paid Social)

| Platform | Current Plan | Recommended | Rationale |
|----------|-------------|-------------|-----------|
| Meta/Facebook | $5,000 | $10,000 | Meta is the primary acquisition engine. Consolidate budget here for faster learning |
| LinkedIn Ads | $2,000 | $1,500 | Reduce to pure Lead Gen Form test. Don't spread thin |
| TikTok | $2,000 | $1,500 | Test budget only. Spark Ads focused |
| Page farm seeding | $5,000-10,000 one-time | $2,000-3,000 one-time | Reduce to $200-400/page x 10 pages. Don't overspend on followers |

### Month 2-3 Scaling Budget (Assuming Positive Signals)

| Platform | Month 2 | Month 3 | Scale Condition |
|----------|---------|---------|----------------|
| Meta | $20,000 | $40,000 | CPA <$8 for quiz completion sustained for 2 weeks |
| LinkedIn | $2,000 | $5,000 | Lead Gen Forms delivering <$50/lead at >10% form rate |
| TikTok | $2,000 | $5,000 | Any Spark Ad creative at <$3 CPA for quiz start |
| Page farm seeding | $2,000 | $1,000 | Ongoing replacement page seeding |

---

## 9. Critical Flags and Non-Negotiable Fixes

### Must-Fix Before Launch

1. **Remove fake "As Seen In" logos immediately.** Meta, LinkedIn, and TikTok all have policies against misleading advertising. Using TechCrunch/Forbes/Wired logos without real coverage will get ads disapproved and potentially accounts banned. This is not a "replace later" issue -- it's a launch blocker for paid ads.

2. **Remove or clearly label AI-generated testimonials.** Meta's updated Advertising Standards (2025) require disclosure of AI-generated content in ads. LinkedIn and TikTok have similar policies. Fake testimonials presented as real will result in ad disapprovals and can trigger account-level reviews.

3. **Fix the "12 senior engineers" claim.** If this appears on any landing page that paid traffic is directed to, it creates a policy violation risk (misleading claims). Platform reviewers do check landing pages.

4. **Implement Conversions API before spending a dollar on Meta ads.** Without CAPI, you're making optimization decisions with 40-60% data blindness. This is not optional.

5. **Set up proper exclusion audiences from Day 1.** Without suppression lists, you'll waste 15-25% of budget showing ads to people who already converted.

### Should-Fix Within First 30 Days

6. **Implement incrementality testing framework.** Hold-out 10% of retargeting audience (show no ads) and measure organic conversion rate vs. ad-exposed conversion rate. This tells you whether retargeting is actually causing conversions or just claiming credit for them.

7. **Build creative fatigue monitoring dashboard.** Track frequency vs. CTR vs. CPA by creative. When frequency hits 3x and CTR drops >20% from peak, rotate creative. At this creative volume, fatigue will hit fast.

8. **Establish a cross-platform reporting cadence.** Weekly: platform-level CPA, funnel stage conversion rates, creative performance. Monthly: blended CPA, cross-platform attribution comparison, true ROAS (Stripe revenue / total spend).

---

## 10. Summary Scorecard

| Plan Element | Score (1-5) | Verdict |
|-------------|-------------|---------|
| Meta persona page concept | 4/5 | Strong core idea, but execution plan needs structural overhaul |
| Meta campaign architecture | 2/5 | 250 campaigns is unworkable. Needs complete redesign per Section 1 |
| Page farm scaling plan | 2/5 | Dangerously naive about CIB enforcement. Follow Section 2 playbook |
| LinkedIn paid ($2K) | 3/5 | Adequate test budget. Must narrow to Lead Gen Forms only |
| TikTok strategy | 3/5 | Right platform intuition, wrong format assumptions. Spark Ads first |
| Cross-platform audience management | 1/5 | Not addressed in plan. Critical gap -- follow Section 5 |
| iOS/privacy measurement | 2/5 | CAPI mentioned but not prioritized. Post-ATT strategy missing entirely |
| Full-funnel design | 2/5 | Content tiers are not a funnel. Needs complete redesign per Section 7 |
| Creative strategy | 4/5 | Volume + AI production pipeline is a genuine advantage. Format mix is solid |
| Budget allocation | 3/5 | Reasonable totals but wrong distribution. Consolidate on Meta initially |

**Overall Assessment: 2.6/5 -- Ambitious vision, execution plan needs significant rework before launch.**

The persona page farm model is genuinely differentiated and can work. But the current execution plan will result in fragmented data, wasted budget, and likely account bans within 60 days. Implement the structural fixes in this review before spending.
