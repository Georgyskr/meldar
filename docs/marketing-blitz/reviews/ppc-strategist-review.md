# PPC Strategist Review: Meldar Marketing Blitz Plan
## Paid Search Sections (Phase 1 Meta + Phase 2.1 Google Ads)

**Reviewer**: Senior PPC Campaign Strategist
**Date**: 2026-04-12
**Scope**: Phase 1 (Meta/Facebook) and Phase 2.1 (Google Ads) only

---

## 1. What's Strong

**Meta Campaign Architecture (Phase 1)**
- The tiered budget allocation (Brand 10% / Problem-aware 40% / Solution-aware 30% / Conquest 20%) is a textbook-correct split for a new entrant. Weighting toward problem-aware and solution-aware is the right move when brand awareness is zero.
- The volume-oriented creative production (50 creatives at launch, 20/week refresh) is exactly what Meta's algorithm needs. Creative fatigue is the #1 killer of Meta campaigns and the plan accounts for that.
- Retargeting segmentation by quiz step is smart. Step-specific abandonment ads dramatically outperform generic retargeting. If someone drops at Step 3 vs Step 5, those are different objections and the plan recognizes this.
- Lookalike audience layering (1%, 3%, 5%) is correct. Starting narrow and expanding is the right approach.

**Google Ads (Phase 2.1)**
- RSAs with 15 headline variants per ad group follows Google's own best practice for machine learning optimization.
- The keyword strategy covers all three funnel stages (brand, problem, competitor).
- Performance Max inclusion is smart for a product with clear conversion actions.

---

## 2. Critical Gaps — Issues That Will Cause Failure

### Gap 1: Zero Conversion Data + Aggressive Scaling = Budget Burn
The plan jumps from $5K to $50K in 12 weeks with no mention of how to handle the cold-start problem. Meta and Google need 50+ conversions per week per ad set/campaign to exit learning phase. At $5K/month across 250 campaigns, each campaign gets $20/month — roughly $0.67/day. This is catastrophically insufficient. None of those campaigns will ever exit learning phase. The algorithm will have zero signal and spend will be essentially random.

**This is the single biggest flaw in the entire plan.**

### Gap 2: 250 Concurrent Campaigns Is an Anti-Pattern
Running 50 pages x 5 campaigns = 250 campaigns sounds like the MedVi model, but it misses why MedVi could do it: they had established pixel data and conversion history to feed the algorithm. With zero conversion data, splitting budget across 250 campaigns means each one is statistically insignificant. Meta's recommendation is a minimum of $100/day per ad set for stable optimization. 250 campaigns at $5K/month = $0.67/day per campaign. You need at least $25K/day to run 250 campaigns properly, which is $750K/month — not $5K.

### Gap 3: Kill Trigger Is Dangerously Premature
"Kill trigger: any campaign > $15 CPA after 500 impressions." 500 impressions is not statistically meaningful for CPA evaluation. At a 2% CTR (optimistic for cold traffic), that's 10 clicks. At a 10% quiz completion rate from click, that's 1 conversion. You cannot make CPA decisions on 1 conversion. You need a minimum of 30-50 conversions per variant to reach statistical significance for CPA-based decisions. The plan will kill winning campaigns before they have a chance to optimize.

### Gap 4: No Account Structure for Learning Phase
There is no mention of campaign consolidation strategy. New Meta accounts need consolidated campaigns (not fragmented) to accumulate pixel data. The plan should start with 3-5 campaigns max, not 250.

### Gap 5: Google Ads — No Match Type Strategy
The plan lists keyword categories but doesn't specify match types (broad, phrase, exact). For a new account with zero quality score history, running broad match on "AI replacing my job" will drain budget on irrelevant queries within hours. There's also no negative keyword strategy mentioned, which is critical for the problem-aware keywords that are inherently ambiguous.

### Gap 6: No Conversion Tracking Hierarchy
The plan mentions tracking setup (Meta Pixel, CAPI, GA4) but doesn't define a conversion hierarchy. What is the primary conversion event? Quiz start? Quiz completion? Email capture? Scan purchase? Meta and Google need a single primary conversion event to optimize toward, and a defined micro-conversion path for learning phase when purchase volume is too low.

### Gap 7: No Ad Account Risk Mitigation
Running 50-100 persona pages with AI-generated content is extremely high-risk for Meta ad account bans. The plan has no mention of: Business Manager structure, ad account warming protocols, spend ramp curves per new account, appeal processes, or backup account infrastructure. Meta's automated enforcement has become significantly more aggressive. Running AI-generated testimonials from fake personas through 50+ pages will trigger automated reviews. Expect 30-50% of pages to get disabled in the first 30 days with no plan to handle this.

### Gap 8: Performance Max Without Conversion Data
The plan suggests launching Performance Max for Google Ads. PMax requires substantial conversion data (typically 30+ conversions in the last 30 days) to function properly. With a $3K/month Google budget and unknown CPAs, PMax will underperform standard campaigns in the learning phase and provide zero transparency into what's working.

---

## 3. Specific Improvements with Numbers

### Improvement 1: Consolidate Meta to 4-6 Campaigns at Launch

| Campaign | Objective | Daily Budget | Ad Sets |
|----------|-----------|-------------|---------|
| TOF - Problem Aware | Conversions (Quiz Complete) | $80/day | 3-4 interest stacks |
| TOF - Solution Aware | Conversions (Quiz Complete) | $50/day | 3-4 interest stacks |
| MOF - Retargeting | Conversions (Purchase) | $20/day | 3 segments (page visitors, quiz abandoners, video viewers) |
| BOF - Conquest | Conversions (Quiz Complete) | $15/day | 2-3 competitor audiences |
| Brand | Reach/Frequency | $5/day | Brand terms + existing followers |

Total: ~$170/day = ~$5,100/month. Each campaign has enough budget to exit learning phase.

### Improvement 2: Phase the Persona Page Rollout

- **Weeks 1-4**: Run ads from 3-5 persona pages only. Use main Meldar business page + 2-4 top personas.
- **Weeks 5-8**: Once you have 100+ conversions in the pixel, expand to 10-15 pages.
- **Weeks 9-12**: If CPA targets hold, scale to 25-30 pages.
- **Never**: Don't run 50+ pages until monthly budget exceeds $100K and each page can sustain $50+/day.

### Improvement 3: Fix the Kill Trigger

Replace "500 impressions" with conversion-volume thresholds:
- **Minimum evaluation period**: 7 days OR 1,000 clicks, whichever comes first.
- **Kill threshold**: CPA > 2.5x target after 30+ conversions (quiz completions).
- **Scale threshold**: CPA < target after 30+ conversions for 3 consecutive days.
- **Pause threshold**: CPA 1.5-2.5x target after 30+ conversions — reduce budget by 30%, test new creative.

### Improvement 4: Google Ads Match Type Strategy

| Keyword Tier | Match Type | Example | Bid Strategy |
|-------------|-----------|---------|-------------|
| Brand | Exact + Phrase | [meldar], "meldar scan" | Manual CPC, max visibility |
| Problem - High Intent | Phrase + Exact | "check my digital footprint", [what recruiters see online] | Manual CPC → tCPA after 30 conv |
| Problem - Research | Broad (with negatives) | AI replacing jobs | Maximize Clicks (capped) |
| Competitor | Exact | [linkedin premium alternatives] | Manual CPC, aggressive |

Negative keyword list from Day 1: free, download, reddit, wiki, definition, meaning, essay, pdf, government, examples (add 200+ before launching).

### Improvement 5: Conversion Event Hierarchy

Define and implement:

1. **Primary conversion (Meta + Google)**: Quiz Completion (email captured) — this will have enough volume for algorithm learning.
2. **Secondary conversion**: Paid Scan Purchase — use as optimization target once you hit 50+/week.
3. **Micro-conversions for learning**: Landing page scroll 50%, quiz step 1 start, quiz step 3 reach.
4. **Value-based**: Assign conversion values — Quiz Complete = $5, Paid Scan = $29, Subscription = $49. This enables value-based bidding later.

### Improvement 6: Google Budget Reallocation

$3,000/month is too thin spread across brand + problem + competitor + PMax. Restructure:

| Campaign | Monthly Budget | % of Spend |
|----------|---------------|-----------|
| Brand (exact match) | $300 | 10% |
| Problem - High Intent (phrase/exact) | $1,500 | 50% |
| Competitor (exact) | $600 | 20% |
| Problem - Research (broad, capped) | $600 | 20% |
| Performance Max | $0 (add at Month 3) | 0% |

Hold PMax until you have 50+ conversions/month in the account.

---

## 4. Campaign Structure Redesign

### Meta — Recommended Account Structure (Month 1)

```
Business Manager
├── Ad Account 1 (Primary — Meldar Business Page)
│   ├── Campaign: TOF - Problem Aware [CBO $80/day]
│   │   ├── Ad Set: Interest Stack A (career development + job search + age 28-45)
│   │   ├── Ad Set: Interest Stack B (AI/technology + management + age 28-45)
│   │   ├── Ad Set: Interest Stack C (LinkedIn users + recently changed jobs)
│   │   └── Ad Set: Broad (age 28-45, no interest targeting — let algorithm find)
│   ├── Campaign: TOF - Solution Aware [CBO $50/day]
│   │   ├── Ad Set: Career tools interest
│   │   ├── Ad Set: Resume/LinkedIn optimization interest
│   │   └── Ad Set: Online reputation interest
│   ├── Campaign: Retargeting [CBO $20/day]
│   │   ├── Ad Set: Landing page visitors (7d) - no quiz start
│   │   ├── Ad Set: Quiz abandoners (step 1-3)
│   │   ├── Ad Set: Quiz abandoners (step 4-5)
│   │   └── Ad Set: Video viewers 50%+
│   ├── Campaign: Conquest [CBO $15/day]
│   │   └── Ad Set: Competitor page followers + career coaching interest
│   └── Campaign: Brand [CBO $5/day]
│       └── Ad Set: Page followers + brand engaged
│
├── Ad Account 2 (Persona Page A — "Career Coach Sarah")
│   └── Campaign: TOF - UGC Style [CBO $30/day] — launch Week 3
│
└── Ad Account 3 (Persona Page B — "Tech Recruiter Marcus")
    └── Campaign: TOF - Expert Tips [CBO $30/day] — launch Week 3
```

Key structural decisions:
- **CBO (Campaign Budget Optimization)** on all campaigns. Let Meta allocate within campaigns — don't micro-manage ad set budgets.
- **Advantage+ placements** (all placements). Don't restrict to Feed only. Let the algorithm find cheap conversions in Reels, Stories, Messenger.
- **Each ad set gets 4-6 ad creatives** (mix of formats). This gives the algorithm enough creative variety to optimize.
- **Persona pages get their own ad accounts** to isolate risk. If one page gets flagged, it doesn't take down the primary account.

### Google Ads — Recommended Account Structure (Month 1)

```
Google Ads Account
├── Campaign: Brand [Manual CPC, $10/day]
│   ├── Ad Group: Core Brand ("meldar", "meldar scan", "digital footprint scan meldar")
│   └── Ad Group: Brand + Modifier ("meldar review", "meldar pricing", "meldar vs")
│
├── Campaign: Problem - High Intent [Manual CPC → tCPA, $50/day]
│   ├── Ad Group: Digital Footprint ("check my digital footprint", "what is my digital footprint")
│   ├── Ad Group: Recruiter Search ("what do recruiters see about me", "recruiters google candidates")
│   └── Ad Group: Online Reputation ("improve online reputation for jobs", "clean up digital presence")
│
├── Campaign: Problem - Research [Max Clicks capped $2, $20/day]
│   ├── Ad Group: AI Jobs Fear ("AI replacing my job", "will AI take my job")
│   └── Ad Group: Career AI ("career AI tools", "AI for job search")
│
└── Campaign: Competitor [Manual CPC, $20/day]
    ├── Ad Group: Resume Builders ("resume builder alternative", "better than [competitor]")
    └── Ad Group: LinkedIn Premium ("LinkedIn premium worth it", "LinkedIn premium alternative")
```

---

## 5. Bidding Strategy for a New Account with Zero Conversion Data

This is the most important tactical decision for Month 1. Here is the phased approach:

### Phase A: Data Collection (Days 1-14)
- **Meta**: Use "Maximize Conversions" with Quiz Completion as the conversion event. Do NOT set a target CPA yet. Let Meta spend freely within daily budgets to find converters. Expect high CPAs ($15-25) — this is the cost of pixel training.
- **Google Search**: Use Manual CPC on all campaigns. Set bids at $1.50-3.00 for problem keywords, $0.50-1.00 for brand. This gives you control while quality scores build. Use Max Clicks with a $2.00 cap on the research campaign.
- **Do not use tCPA or tROAS**: You have no historical data. Setting arbitrary targets tells the algorithm to restrict delivery, which starves it of the conversion data it needs.

### Phase B: Early Optimization (Days 15-30)
- **Meta**: Once you have 25+ quiz completions in a 7-day window, switch to "Cost Cap" bidding with a cap of 1.5x your observed average CPA. This tells Meta "keep finding conversions but don't let costs run away."
- **Google Search**: If any campaign has 15+ conversions, switch that campaign to Maximize Conversions (no target). Keep Manual CPC on campaigns with fewer conversions.

### Phase C: Scaling (Days 31-60)
- **Meta**: Once you have 50+ conversions/week consistently, introduce Target CPA. Set it at your observed average, not your goal CPA. Reduce by 10% every 2 weeks as long as volume holds.
- **Google Search**: Switch high-volume campaigns to tCPA. Set target at observed average CPA from Phase B. Keep Manual CPC on low-volume campaigns (brand, competitor).

### Phase D: Advanced (Days 61-90)
- **Meta**: Test value-based optimization (purchase value as conversion, not just quiz complete). Introduce Advantage+ Shopping campaigns if e-commerce checkout is live.
- **Google Search**: Launch Performance Max now that you have 50+ monthly conversions. Allocate 20% of Google budget. Begin tROAS testing on search campaigns if revenue data is flowing into Google Ads.

---

## 6. Budget Pacing: $5K to $50K Scale-Up Without Waste

### The Golden Rule: Never Increase More Than 20% Per Week

Meta's algorithm destabilizes when budget changes exceed 20% in a short period. The plan's scale path ($5K -> $15K -> $50K -> $150K) implies 200-300% jumps, which will reset learning phases and spike CPAs.

### Recommended Pacing Model

| Week | Meta Budget | Google Budget | Total | Key Action |
|------|-----------|-------------|-------|-----------|
| 1-2 | $1,200 (~$170/day) | $700 (~$100/day) | $1,900 | Launch consolidated campaigns, collect data |
| 3-4 | $1,440 (+20%) | $840 (+20%) | $2,280 | Evaluate creative performance, kill losers |
| 5-6 | $1,730 (+20%) | $1,000 (+20%) | $2,730 | Add 2 persona page ad accounts |
| 7-8 | $2,075 (+20%) | $1,200 (+20%) | $3,275 | Switch winning campaigns to tCPA |
| 9-10 | $2,490 (+20%) | $1,440 (+20%) | $3,930 | Launch retargeting with lookalike audiences |
| 11-12 | $2,990 (+20%) | $1,730 (+20%) | $4,720 | Add 3-5 more persona pages |

**Month 1 total**: ~$8,400
**Month 2 total**: ~$12,000
**Month 3 total**: ~$17,700

This gets you to roughly $18K/month by Week 12, not $50K. And that's correct. To get to $50K/month, you need:
1. Proven CPA below target on at least 3 campaign types
2. 200+ conversions/week in the pixel
3. Creative library of 100+ tested assets with at least 10 proven winners

Scaling to $50K before these conditions are met is budget incineration.

### Budget Utilization Rules

- **Minimum 95% spend rate**: If campaigns are not spending budget, increase audience size or add creative — don't just increase bids.
- **Reallocation cadence**: Every Monday, shift 10-20% of budget from worst-performing campaigns to best-performing.
- **Reserve fund**: Hold 15% of monthly budget as a reserve. Deploy it only when a campaign hits CPA targets 3 days in a row (signals it's found a vein of cheap conversions — accelerate before competition adjusts).
- **Creative-to-spend ratio**: For every $1,000 in weekly ad spend, you need at least 5 active ad creatives being tested. Below this ratio, fatigue will degrade performance.

### Emergency Brake Protocol

If blended CPA exceeds 3x target for 5 consecutive days:
1. Pause all campaigns except the 2 best-performing.
2. Audit landing page conversion rate (is the problem traffic quality or funnel conversion?).
3. Refresh all creative — creative fatigue is the most common cause.
4. Restart at 50% of previous budget and rebuild.

---

## Summary of Priority Actions

1. **RESTRUCTURE**: Consolidate from 250 campaigns to 4-6 campaigns at launch. This is non-negotiable.
2. **FIX BIDDING**: Use Maximize Conversions (no target) for the first 14 days. Do not set CPA targets until you have data.
3. **FIX KILL TRIGGER**: Replace 500-impression kill trigger with 30+ conversion threshold.
4. **DELAY PERSONA SCALING**: Start with 3-5 pages, scale after pixel matures.
5. **ADD MATCH TYPES + NEGATIVES**: Google Ads will hemorrhage budget without these.
6. **HOLD PMAX**: Do not launch Performance Max until Month 3 with 50+ monthly conversions.
7. **DEFINE CONVERSION HIERARCHY**: Set Quiz Completion as primary, Paid Scan as secondary.
8. **PACE BUDGET AT 20%/WEEK MAX**: The $5K-to-$50K ramp takes 5-6 months, not 12 weeks.
9. **ISOLATE AD ACCOUNTS**: Each persona page needs its own ad account to prevent cascading bans.
10. **BUILD NEGATIVE KEYWORD LIST**: 200+ negatives before launching Google Ads.
