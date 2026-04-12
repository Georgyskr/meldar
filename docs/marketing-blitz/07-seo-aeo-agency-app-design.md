# SEO & AEO Agency App — Design & Implementation Plan

## Product Overview

A full-scale agentic SEO + AEO platform built as a Meldar template app. Modular AI agents act as an automated marketing department for any website. Built for Meldar's own use first, then templatized for solo founders and small business owners at EUR 19/mo+.

**Revenue model:** Subscription base + metered API brokerage (Claude API, SERP checks, citation audits, content generation — all through Meldar's keys with markup).

---

## Understanding Summary

- **What:** 16 modular AI agents covering full SEO + AEO lifecycle
- **Why:** (a) Automate Meldar's own marketing, (b) templatize into portfolio, (c) monetize every agent action via API brokerage
- **Who:** Solo founders, small business owners learning agentic workflows
- **Architecture:** Serverless. Claude-powered Strategist plans, human approves, deterministic functions execute
- **Progression:** Semi-autonomous → fully autonomous → automated link building/outreach
- **Constraint:** Solo founder builds this. Must ship incrementally.

---

## System Architecture

```
┌──────────────────────────────────────────┐
│             MELDAR PLATFORM              │
├──────────────────────────────────────────┤
│                                          │
│  ┌────────────────────────────────────┐  │
│  │       App Configuration UI         │  │
│  │  - Pick modules (template or       │  │
│  │    custom selection)               │  │
│  │  - Enter site URL + sitemap        │  │
│  │  - Set target keywords/topics      │  │
│  │  - Connect Search Console          │  │
│  │  - Set approval mode (B or A)      │  │
│  │  - Link to other Meldar apps       │  │
│  └──────────────┬─────────────────────┘  │
│                 │                         │
│  ┌──────────────▼─────────────────────┐  │
│  │       Strategist Agent (Claude)    │  │
│  │                                    │  │
│  │  Runs: weekly (or on-demand)       │  │
│  │  Reads: all module outputs, site   │  │
│  │         state, rankings, audits    │  │
│  │  Outputs: prioritized weekly plan  │  │
│  │  Cost: ~$0.50-2.00 per plan        │  │
│  │                                    │  │
│  │  Plan format:                      │  │
│  │  1. Research [keywords]            │  │
│  │  2. Write [content brief] for X    │  │
│  │  3. Fix [technical issues] A, B    │  │
│  │  4. Submit to [directories] X, Y   │  │
│  │  5. Outreach [prospects] for links │  │
│  │  6. Audit citations on [prompts]   │  │
│  └──────────────┬─────────────────────┘  │
│                 │                         │
│       ┌─────────▼──────────┐             │
│       │  Human Approval    │ (Mode B)    │
│       │  or Auto-execute   │ (Mode A)    │
│       └─────────┬──────────┘             │
│                 │                         │
│  ┌──────────────▼─────────────────────┐  │
│  │         Task Queue                 │  │
│  │  (Vercel Queues / BullMQ / SQS)   │  │
│  │                                    │  │
│  │  Each task = one module invocation │  │
│  │  with specific inputs              │  │
│  │  Retry logic: 3 attempts           │  │
│  │  Priority: critical fixes first    │  │
│  └──────────────┬─────────────────────┘  │
│                 │                         │
│  ┌────┬────┬────┼────┬────┬────┐         │
│  │ M1 │ M2 │ M3 │ M4 │ M5 │ MN │        │
│  └──┬─┘──┬─┘──┬─┘──┬─┘──┬─┘──┬─┘        │
│     │    │    │    │    │    │            │
│  ┌──▼────▼────▼────▼────▼────▼────────┐  │
│  │        Shared Data Store           │  │
│  │  (per-app, serverless DB)          │  │
│  │                                    │  │
│  │  Tables:                           │  │
│  │  - site_state (pages, meta, CWV)   │  │
│  │  - keywords (targets, rankings)    │  │
│  │  - content (briefs, drafts, live)  │  │
│  │  - backlinks (profile, prospects)  │  │
│  │  - citations (prompts, results)    │  │
│  │  - audit_history (findings, fixes) │  │
│  │  - outreach (prospects, status)    │  │
│  │  - plans (weekly plans, approvals) │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │        API Broker Layer            │  │
│  │                                    │  │
│  │  Meldar holds master keys:         │  │
│  │  - Anthropic (Claude API)          │  │
│  │  - Google Search Console           │  │
│  │  - Google SERP (via SerpAPI/free)  │  │
│  │  - ChatGPT API (citation audits)   │  │
│  │  - Gemini API (citation audits)    │  │
│  │  - Perplexity API (citation audits)│  │
│  │  - Email sending (outreach)        │  │
│  │                                    │  │
│  │  Every call metered per user:      │  │
│  │  - Claude: $X per 1K tokens + 20% │  │
│  │  - SERP check: $0.01 + markup     │  │
│  │  - Citation audit: $0.05/prompt    │  │
│  │  - Email send: $0.01/email         │  │
│  │  - Browser action: $0.02/action    │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │     Browser Automation Pool        │  │
│  │  (Playwright on serverless)        │  │
│  │                                    │  │
│  │  Used by:                          │  │
│  │  - Directory Submitter             │  │
│  │  - Entity Builder                  │  │
│  │  - Rank Tracker (SERP scraping)    │  │
│  │  - Technical Auditor (crawling)    │  │
│  │  - Citation Auditor (fallback)     │  │
│  └────────────────────────────────────┘  │
│                                          │
└──────────────────────────────────────────┘
```

---

## Module Catalog

### SEO Modules (12)

#### M1: Keyword Researcher
- **Trigger:** Weekly cron / on-demand / Strategist dispatch
- **Input:** Seed keywords, site URL, competitors
- **Action:** Scrape Google autocomplete, People Also Ask, related searches. Parse SERP for top 10 results per query. Analyze keyword difficulty (based on DA of ranking pages). Cross-reference with Search Console data if connected.
- **Output:** Keyword opportunities table (keyword, volume estimate, difficulty, intent, current rank if any, opportunity score)
- **LLM needed:** No
- **Billable:** Per batch (50 keywords = 1 unit)
- **Tech:** Serverless function + SERP scraping via browser automation or SerpAPI

#### M2: Content Brief Generator
- **Trigger:** After keyword research / Strategist dispatch
- **Input:** Target keyword + top 10 SERP results for that keyword
- **Action:** Analyze competing content (headings, word count, topics covered, gaps). Generate structured brief.
- **Output:** Brief (target keyword, secondary keywords, search intent, suggested title, H2/H3 outline, word count target, internal link suggestions, unique angle recommendation)
- **LLM needed:** Yes (Claude)
- **Billable:** Per brief (~1K-2K tokens)

#### M3: Content Writer
- **Trigger:** After brief approval / Strategist dispatch
- **Input:** Content brief + brand voice settings + existing site content for internal linking
- **Action:** Write full article following brief. Include meta title, meta description, FAQ section (for AEO), schema suggestions.
- **Output:** Markdown file with frontmatter (title, description, keywords, schema)
- **LLM needed:** Yes (Claude)
- **Billable:** Per article (~3K-8K tokens)

#### M4: Technical Auditor
- **Trigger:** Weekly cron
- **Input:** Site URL + sitemap
- **Action:** Crawl site via headless browser. Check: broken links, missing meta tags, missing alt text, duplicate titles, Core Web Vitals (via PageSpeed API), mobile responsiveness, robots.txt issues, sitemap validity, indexation status (via Search Console API), redirect chains, mixed content.
- **Output:** Prioritized fix list (critical / high / medium / low) with specific fix instructions per issue
- **LLM needed:** No (rules-based crawler)
- **Billable:** Per audit (1 site = 1 unit)

#### M5: Schema Generator
- **Trigger:** After audit / after new content / on-demand
- **Input:** Page URL + page content
- **Action:** Analyze content, determine applicable schema types, generate valid JSON-LD
- **Output:** JSON-LD code blocks ready to paste/inject (Organization, Article, FAQPage, HowTo, Product, SoftwareApplication, BreadcrumbList)
- **LLM needed:** Light (Claude for content analysis, template for generation)
- **Billable:** Per page

#### M6: Rank Tracker
- **Trigger:** Daily cron
- **Input:** Target keywords + site domain
- **Action:** Check SERP position via scraping. Store historical data. Calculate movement. Flag significant drops (>5 positions) or gains.
- **Output:** Daily rankings table + weekly trend report + alerts
- **LLM needed:** No
- **Billable:** Per keyword per day ($0.005/keyword/day)

#### M7: Cannibalization Detector
- **Trigger:** Weekly cron
- **Input:** Rank tracker data + Search Console data (queries × pages)
- **Action:** Identify multiple pages ranking for same query. Score conflict severity. Recommend consolidation, redirect, or differentiation.
- **Output:** Conflict list with recommended action per conflict
- **LLM needed:** No (data analysis)
- **Billable:** Per scan

#### M8: Internal Link Optimizer
- **Trigger:** After new content published / monthly
- **Input:** Full site content map (URLs, titles, content topics)
- **Action:** Analyze topical relationships between pages. Identify orphan pages. Suggest internal links (from page X, anchor text Y, to page Z).
- **Output:** Link suggestion list with specific anchor text and source/target pages
- **LLM needed:** Light (for topical relevance matching)
- **Billable:** Per analysis

#### M9: Directory Submitter
- **Trigger:** On-demand / Strategist dispatch
- **Input:** Business info (name, URL, description, category, contact) + target directory list
- **Action:** Browser automation (Playwright) to fill forms and submit listings. Handles CAPTCHA where possible. Stores submission status.
- **Output:** Submission log (directory, status, URL if live, date)
- **Built-in directory database:**
  - General: Product Hunt, Crunchbase, AngelList, G2, Capterra, AlternativeTo
  - Startup: BetaList, Launching Next, SaaSHub, StartupStash, ToolPilot
  - Tech: HackerNews (Show HN), DevHunt, Uneed, MicroLaunch
  - Niche: Industry-specific directories added per template
- **LLM needed:** No (scripted automation)
- **Billable:** Per submission

#### M10: Backlink Outreach Agent
- **Trigger:** Weekly / Strategist dispatch
- **Input:** Target content URLs + outreach strategy (guest post, broken link, resource page, link exchange)
- **Action:**
  1. Find prospects: scrape competitor backlinks, find broken links on resource pages, find "best tools" listicles
  2. Find contact info: scrape site for email, check common patterns
  3. Generate personalized outreach email (Claude)
  4. Send email via Meldar's email broker
  5. Track opens, replies, outcomes
  6. Generate follow-up emails for non-responders (Day 3, Day 7)
- **Output:** Outreach campaign dashboard (sent, opened, replied, link acquired)
- **LLM needed:** Yes (Claude for email personalization)
- **Billable:** Per outreach batch (10 emails = 1 unit)

#### M11: Backlink Monitor
- **Trigger:** Daily cron
- **Input:** Site domain
- **Action:** Check for new/lost backlinks via free sources (Google Search Console links report, web scraping for mentions). Alert on lost high-DA links. Track competitor new links.
- **Output:** Backlink change log + alerts
- **LLM needed:** No
- **Billable:** Per check

#### M12: Competitor Monitor
- **Trigger:** Weekly cron
- **Input:** Competitor domain list (up to 5)
- **Action:** Track competitor rankings for shared keywords. Detect new content published (sitemap diff). Detect new backlinks. Surface content gaps (they rank, you don't).
- **Output:** Weekly competitor intelligence report
- **LLM needed:** No (scraping + diff)
- **Billable:** Per competitor per week

---

### AEO Modules (4)

#### M13: Citation Auditor
- **Trigger:** Bi-weekly cron / on-demand
- **Input:** Brand name + competitor names + prompt universe
- **Action:** Query each AI platform (ChatGPT, Claude, Gemini, Perplexity) with each prompt. Record: is brand cited? Position? What competitors are cited? Exact quote? Score citation rate.
- **Output:** Citation scorecard (brand vs competitors, per platform, per prompt category, trend over time)
- **LLM needed:** Yes (API calls to 4 AI platforms)
- **Billable:** Per prompt per platform ($0.05/prompt — covers API cost + margin)

#### M14: Prompt Universe Manager
- **Trigger:** Monthly / after keyword research / on-demand
- **Input:** Brand category, target keywords, existing prompt library
- **Action:** Generate new prompts real users would ask AI systems. Categorize by intent (informational, transactional, comparative, navigational). Deduplicate against existing library.
- **Output:** Expanded prompt library with categories and priority scores
- **LLM needed:** Yes (Claude)
- **Billable:** Per expansion batch

#### M15: Content Optimizer for AI
- **Trigger:** After citation audit identifies gaps / Strategist dispatch
- **Input:** Page URL + page content + citation audit results showing what competitors do better
- **Action:** Restructure content for AI citability: add clear definitions in first paragraph, add FAQ section with concise answers, add unique statistics/data points, strengthen authoritative tone, add structured data hints.
- **Output:** Optimized content (markdown) + diff showing changes + explanation of why each change improves citability
- **LLM needed:** Yes (Claude)
- **Billable:** Per page

#### M16: Entity Builder
- **Trigger:** On-demand / Strategist dispatch
- **Input:** Brand info (name, description, founder, URL, social profiles, category)
- **Action:** Browser automation to create/update profiles on platforms that feed AI knowledge graphs:
  - Wikidata (structured entity)
  - Crunchbase (company profile)
  - LinkedIn Company Page
  - GitHub Organization
  - Google Business Profile
  - Apple Maps (if applicable)
  - Bing Places
  - Schema.org markup on own site
- **Output:** Entity profile status dashboard (platform, status, URL, last updated)
- **LLM needed:** No (scripted automation + templates)
- **Billable:** Per platform

---

## Data Model

```
app_config
  ├── id
  ├── user_id
  ├── site_url
  ├── sitemap_url
  ├── active_modules[]          # which modules are enabled
  ├── approval_mode             # "manual" | "auto"
  ├── linked_apps[]             # other Meldar apps connected
  ├── brand_info{}              # name, description, category
  ├── competitors[]             # competitor domains
  ├── target_keywords[]         # seed keywords
  └── created_at

keywords
  ├── id
  ├── app_id
  ├── keyword
  ├── volume_estimate
  ├── difficulty
  ├── intent                    # informational | transactional | navigational | comparative
  ├── current_rank
  ├── rank_history[]            # {date, position}
  ├── source_module             # which module discovered it
  └── status                    # prospect | target | tracking | archived

content
  ├── id
  ├── app_id
  ├── type                      # brief | draft | published | optimized
  ├── target_keyword_id
  ├── title
  ├── body_markdown
  ├── meta_title
  ├── meta_description
  ├── schema_jsonld
  ├── internal_links[]
  ├── status                    # draft | approved | published
  └── created_at

audit_findings
  ├── id
  ├── app_id
  ├── audit_date
  ├── finding_type              # technical | content | link | schema
  ├── severity                  # critical | high | medium | low
  ├── description
  ├── fix_instruction
  ├── status                    # open | in_progress | fixed | ignored
  └── page_url

backlinks
  ├── id
  ├── app_id
  ├── source_url
  ├── source_domain
  ├── target_url
  ├── anchor_text
  ├── domain_authority
  ├── status                    # active | lost | prospect | outreach_sent | acquired
  ├── first_seen
  └── last_checked

outreach_campaigns
  ├── id
  ├── app_id
  ├── prospect_url
  ├── prospect_email
  ├── strategy                  # guest_post | broken_link | resource | exchange
  ├── email_sent_at
  ├── follow_ups_sent
  ├── status                    # draft | sent | opened | replied | acquired | rejected
  └── backlink_id               # links to backlinks table if acquired

citations
  ├── id
  ├── app_id
  ├── prompt_text
  ├── prompt_category
  ├── platform                  # chatgpt | claude | gemini | perplexity
  ├── brand_cited               # boolean
  ├── brand_position            # 1st, 2nd, etc. or null
  ├── competitors_cited[]
  ├── response_excerpt
  ├── checked_at
  └── batch_id

entity_profiles
  ├── id
  ├── app_id
  ├── platform                  # wikidata | crunchbase | linkedin | etc.
  ├── profile_url
  ├── status                    # not_created | created | updated | verified
  └── last_updated

plans
  ├── id
  ├── app_id
  ├── week_of
  ├── strategist_output         # full plan text from Claude
  ├── tasks[]                   # parsed task list with module assignments
  ├── status                    # draft | approved | executing | completed
  ├── approved_at
  └── results_summary

usage_meters
  ├── id
  ├── app_id
  ├── module
  ├── action_type
  ├── tokens_used
  ├── cost_to_meldar
  ├── price_to_user
  └── timestamp
```

---

## Template Tiers

Users pick a template when creating the app:

### Starter (EUR 19/mo + usage)
- Modules: M4 (Technical Auditor), M6 (Rank Tracker), M7 (Cannibalization), M11 (Backlink Monitor), M12 (Competitor Monitor)
- Strategist: Monthly plan (1 planning cycle/month)
- No content generation, no outreach, no AEO
- Usage cap: 50 keywords tracked, 3 competitors, 1 audit/month

### Growth (EUR 39/mo + usage)
- All Starter modules +
- M1 (Keyword Research), M2 (Content Brief), M5 (Schema Generator), M8 (Internal Links), M9 (Directory Submitter)
- Strategist: Weekly plans
- Usage cap: 200 keywords, 5 competitors, weekly audits, 10 directory submissions/month

### Agency (EUR 69/mo + usage)
- All modules (M1-M16)
- Strategist: Weekly plans + on-demand replanning
- M3 (Content Writer), M10 (Backlink Outreach), M13-M16 (full AEO)
- Usage cap: 500 keywords, 10 competitors, daily audits, unlimited directory submissions, 50 outreach emails/month, bi-weekly citation audits

### Custom
- User picks any combination of modules
- Base: EUR 9/mo platform fee + per-module pricing + usage

---

## Strategist Agent Prompt Architecture

The Strategist is the brain. It runs on Claude via Meldar's brokered API.

### Input context (assembled before each planning cycle):

```
You are an SEO & AEO strategist managing {site_url}.

## Current State
- Site pages: {count}
- Keywords tracked: {count}, {X} in top 10, {Y} in top 3
- Last technical audit: {date}, {N} critical issues, {N} fixed
- Backlink profile: {count} total, {count} new this week, {count} lost
- Citation rate: {X}% across {N} prompts

## Recent Module Outputs
- Keyword Research (last run {date}): {summary}
- Technical Audit (last run {date}): {top findings}
- Rank Tracker: {notable movements}
- Citation Audit (last run {date}): {summary}
- Competitor Monitor: {notable changes}

## User Goals
- Primary keywords: {list}
- Target audience: {description}
- Business type: {type}
- Approval mode: {manual|auto}

## Available Modules
{list of enabled modules with descriptions}

## Constraints
- Budget: user has {X} credits remaining this month
- Content approval required: {yes|no}
- Outreach limit: {N} emails/month remaining

Generate a prioritized weekly plan. For each task:
1. Which module to run
2. Specific inputs for that module
3. Why this task matters now (priority justification)
4. Expected impact (traffic, rankings, citations)
5. Dependencies (must task X finish first?)

Order by impact. Be specific, not generic.
```

### Output format:

```json
{
  "week_of": "2026-04-14",
  "summary": "Focus on fixing 3 critical technical issues blocking indexation, then expand content on high-opportunity keywords discovered last week.",
  "tasks": [
    {
      "priority": 1,
      "module": "technical_auditor",
      "action": "Fix critical: 3 pages returning 404 that have backlinks",
      "inputs": {"pages": ["/old-url-1", "/old-url-2", "/old-url-3"]},
      "why": "These pages have 12 backlinks pointing to them. 404s waste link equity.",
      "impact": "Recover ~12 backlinks worth of authority",
      "depends_on": null
    },
    {
      "priority": 2,
      "module": "content_brief_generator",
      "action": "Generate brief for 'google yourself tool' keyword cluster",
      "inputs": {"keyword": "google yourself", "secondary": ["google my name", "what shows up when you google me"]},
      "why": "40-60K monthly searches, low competition, direct product fit",
      "impact": "Potential 500-2000 monthly organic visits within 3 months",
      "depends_on": null
    }
  ]
}
```

---

## API Broker Pricing Model

Meldar's margin on every action:

| Resource | Meldar's cost | Price to user | Margin |
|----------|--------------|---------------|--------|
| Claude API (planning) | ~$0.50/plan | $0.75/plan | 50% |
| Claude API (content) | ~$0.10/article | $0.15/article | 50% |
| Claude API (outreach email) | ~$0.02/email | $0.03/email | 50% |
| SERP scraping | ~$0.005/query | $0.01/query | 100% |
| Citation audit (per prompt, 4 platforms) | ~$0.03/prompt | $0.05/prompt | 67% |
| Browser automation action | ~$0.01/action | $0.02/action | 100% |
| Email sending (outreach) | ~$0.005/email | $0.01/email | 100% |
| Search Console API | Free (user connects own) | Free | N/A |

Revenue example at 500 active apps:
- 500 × EUR 39/mo average subscription = EUR 19,500/mo
- 500 × ~EUR 15/mo average usage = EUR 7,500/mo
- **Total: ~EUR 27,000/mo from this template alone**

---

## Implementation Plan

### Phase 1: Foundation (Week 1-2)
**Goal:** Core infrastructure that all modules depend on.

- [ ] **1.1** Data model: set up serverless DB (Vercel Postgres via Neon, or PlanetScale)
  - Create all tables from data model above
  - Per-app isolation (app_id on every table)

- [ ] **1.2** Task queue: set up job dispatch system
  - Option A: Vercel Queues (if available in plan)
  - Option B: BullMQ + Upstash Redis
  - Option C: Simple cron + database-backed queue
  - Must support: delayed jobs, retries (3x), priority ordering

- [ ] **1.3** API Broker layer: centralized external API handler
  - Wrapper functions for each external service
  - Usage metering: log every call to usage_meters table
  - Rate limiting per user per service
  - API key management (Meldar's master keys, not user keys)

- [ ] **1.4** Browser automation pool: Playwright on serverless
  - Test: can a Vercel Function run Playwright? (likely need separate service — Browserless.io, or dedicated VPS)
  - Fallback: AWS Lambda with Playwright layer
  - Pool management: concurrent session limits

- [ ] **1.5** App Configuration UI: basic admin panel
  - Create new app (site URL, sitemap, keywords, competitors)
  - Module picker (checkboxes)
  - Approval mode toggle
  - API usage dashboard

### Phase 2: Core SEO Modules (Week 3-5)
**Goal:** The 5 modules that deliver immediate value with zero LLM cost.

- [ ] **2.1** M4: Technical Auditor
  - Playwright-based crawler
  - Rules engine: check meta tags, broken links, redirects, sitemap, robots.txt
  - PageSpeed Insights API for CWV
  - Output: prioritized fix list
  - **Test on Meldar's own site first**

- [ ] **2.2** M6: Rank Tracker
  - SERP scraping function (Google search → parse positions)
  - Daily cron trigger
  - Historical storage + trend calculation
  - Alert on >5 position drop
  - **Test with Meldar's target keywords**

- [ ] **2.3** M11: Backlink Monitor
  - Google Search Console Links API (requires user OAuth)
  - Supplemental: scrape for brand mentions
  - Daily diff: new vs lost
  - **Test with Meldar's domain**

- [ ] **2.4** M12: Competitor Monitor
  - Sitemap diff (weekly fetch, compare to last)
  - Shared keyword ranking comparison
  - New content detection
  - **Test with Meldar's competitors (BrandYourself, DeleteMe)**

- [ ] **2.5** M7: Cannibalization Detector
  - Cross-reference rank tracker + Search Console query data
  - Flag: multiple pages ranking for same query
  - Recommend: consolidate, redirect, or differentiate
  - **Test on Meldar's own site**

### Phase 3: Strategist Agent (Week 5-6)
**Goal:** The Claude-powered brain that ties modules together.

- [ ] **3.1** Strategist prompt engineering
  - Build the context assembly pipeline (gather all module outputs into one prompt)
  - Design plan output schema (JSON)
  - Test with Meldar's actual data from Phase 2 modules

- [ ] **3.2** Planning cycle automation
  - Weekly cron triggers Strategist
  - Strategist output → plans table
  - Notification to user: "Your weekly SEO plan is ready for review"

- [ ] **3.3** Plan approval UI
  - Display plan as actionable task list
  - User can approve all, approve selectively, or request replan
  - On approval → dispatch tasks to queue

- [ ] **3.4** Plan execution pipeline
  - Queue processes approved tasks in priority order
  - Each task invokes the correct module with specified inputs
  - Results stored back to shared data store
  - Strategist can read results in next planning cycle

### Phase 4: Content Modules (Week 6-8)
**Goal:** LLM-powered content generation pipeline.

- [ ] **4.1** M1: Keyword Researcher
  - Google autocomplete scraping
  - People Also Ask extraction
  - Related searches parsing
  - Volume estimation (relative, based on SERP competition signals)
  - Opportunity scoring algorithm

- [ ] **4.2** M2: Content Brief Generator
  - Analyze top 10 SERP results for target keyword
  - Extract: headings, word counts, topics covered
  - Generate structured brief via Claude
  - Include internal link suggestions from existing content

- [ ] **4.3** M3: Content Writer
  - Takes brief → outputs full markdown article
  - Includes: meta title/description, FAQ section, schema suggestions
  - Brand voice configuration (tone, reading level, terminology)
  - Human reviews before "publish" (output as downloadable markdown)

- [ ] **4.4** M5: Schema Generator
  - Content analysis → applicable schema types
  - Template-based JSON-LD generation
  - Validation against schema.org spec

- [ ] **4.5** M8: Internal Link Optimizer
  - Build topical map of all site content
  - Identify orphan pages
  - Suggest links with specific anchor text

### Phase 5: AEO Modules (Week 8-10)
**Goal:** Answer Engine Optimization — the differentiator.

- [ ] **5.1** M14: Prompt Universe Manager
  - Generate 30-50 prompts from brand category + keywords
  - Categorize by intent
  - Deduplicate and score by priority

- [ ] **5.2** M13: Citation Auditor
  - API integration: ChatGPT API, Claude API, Gemini API
  - Perplexity: API if available, otherwise browser automation
  - Run all prompts across all platforms
  - Parse responses for brand/competitor citations
  - Score and trend tracking

- [ ] **5.3** M15: Content Optimizer for AI
  - Compare cited vs non-cited content structures
  - Rewrite/restructure for citability
  - Add: clear definitions, FAQ, unique stats, authoritative framing

- [ ] **5.4** M16: Entity Builder
  - Browser automation for profile creation
  - Platform templates: Wikidata, Crunchbase, LinkedIn, GitHub, Google Business, Bing Places
  - Status tracking dashboard

### Phase 6: Link Building Modules (Week 10-12)
**Goal:** Automated off-page SEO — the most valuable automation.

- [ ] **6.1** M9: Directory Submitter
  - Built-in directory database (30+ directories)
  - Playwright scripts per directory (form filling, account creation)
  - CAPTCHA handling (integration with solving service if needed)
  - Submission status tracking

- [ ] **6.2** M10: Backlink Outreach Agent
  - Prospect finder: competitor backlink analysis, broken link detection, resource page discovery
  - Contact finder: email pattern detection, site scraping
  - Email generator: Claude-powered personalization
  - Send via Meldar email broker
  - Follow-up automation (Day 3, Day 7)
  - Response tracking + outcome logging

- [ ] **6.3** Backlink exchange system
  - Match users within Meldar's network for relevant link exchanges
  - Automated outreach between matched sites
  - This becomes a network effect — more Meldar users = better link exchange opportunities

### Phase 7: Templatization & Polish (Week 12-14)
**Goal:** Package for Meldar's template library.

- [ ] **7.1** Template configuration system
  - Save module combinations as named templates
  - Starter / Growth / Agency presets
  - Custom template builder UI

- [ ] **7.2** Onboarding flow
  - "Connect your site" → auto-crawl → suggest modules → suggest keywords → first plan generated
  - 5-minute setup to first value

- [ ] **7.3** Dashboard
  - SEO health score (aggregate of all module signals)
  - Citation score (AEO performance)
  - Weekly trend charts (rankings, traffic, citations, backlinks)
  - Action feed (what agents did this week)
  - Usage & billing

- [ ] **7.4** App linking
  - "Connect to other Meldar apps" flow
  - Data sharing: if user has a landing page app, SEO app can optimize it
  - Cross-app Strategist: plan considers all connected apps

- [ ] **7.5** MedVi case study integration
  - Educational content within the app: "This module automates what MedVi did manually with 800 pages"
  - Legal compliance indicators: green/yellow/red badges on tactics
  - "The legal way" vs "what got them sued" framing throughout

---

## Decision Log

| # | Decision | Alternatives considered | Why this option |
|---|----------|------------------------|-----------------|
| 1 | Agent-per-function architecture | Monolithic agent, pipeline stages | Enables per-module billing, user customization, independent deployment |
| 2 | Serverless deployment | VPS, containerized | Cost-efficient for bursty workloads, aligns with Meldar's stack |
| 3 | Claude as Strategist LLM | GPT-4, Gemini, open-source | Brokered through Meldar API = revenue. Best reasoning for complex planning. |
| 4 | Hybrid API + browser automation | API-only, browser-only, CMS plugin | Maximum capability. APIs where clean, browser where needed, no CMS dependency. |
| 5 | File output (markdown) not CMS injection | CMS plugin, direct publishing | Works with any stack. No plugin maintenance. User controls deployment. |
| 6 | Meldar as API broker | Users bring own keys | Revenue model. Simpler UX. Volume pricing advantage. |
| 7 | Semi-auto → full-auto progression | Full auto from start, manual only | Builds trust. Catches errors early. User learns the system. |
| 8 | Link exchange network between Meldar users | External-only link building | Network effect. More users = better exchanges. Competitive moat. |
| 9 | MedVi case study as educational framing | Generic SEO tool positioning | Narrative hook. Differentiator. Draws attention. Teaches while selling. |
| 10 | Start with non-LLM modules (Phase 2) | Start with content generation | Fastest to ship, cheapest to run, proves infrastructure before adding AI cost |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| SERP scraping gets blocked by Google | Core modules (rank tracker, keyword research) break | Rotate IPs, use residential proxies, fallback to SerpAPI paid tier |
| AI platform APIs change or restrict citation auditing | AEO modules break | Browser automation fallback, multi-platform redundancy |
| Browser automation on serverless is unreliable | Directory submitter, entity builder fail | Dedicated browser service (Browserless.io) as fallback |
| Claude API costs spike | Margin on broker shrinks | Cache common operations, batch requests, use Haiku for simple tasks |
| User-generated outreach emails marked as spam | Email reputation destroyed | Dedicated IPs per sending volume tier, warm-up sequences, domain rotation |
| Google penalizes automated link building | User sites get penalized | Rate limiting, quality filters, manual review option for outreach |
| Solo founder can't ship 16 modules | Never launches | Phase 2 (5 modules) is the MVP. Ship that, validate, then continue. |

---

## MVP Definition (Ship This First)

**Phase 1 + Phase 2 + Phase 3 = Minimum Viable Product**

- 5 SEO modules (Technical Auditor, Rank Tracker, Backlink Monitor, Competitor Monitor, Cannibalization Detector)
- Strategist Agent generating weekly plans
- Plan approval UI
- Basic dashboard
- Usage metering

**Timeline: 6 weeks**
**Zero LLM cost in the MVP modules** (all scraping/parsing). Strategist is the only Claude call.
**This is already more than most solo founders have for SEO.**

Add content + AEO + link building in subsequent phases, each adding revenue streams.
