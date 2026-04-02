# Programmatic SEO Page Templates for Meldar

**Date:** 2026-04-01
**Author:** SEO Programmatic Specialist Agent
**Status:** Strategy & Templates Ready for Implementation

---

## Table of Contents

1. [Feasibility Index](#1-feasibility-index)
2. [Page Taxonomy](#2-page-taxonomy)
3. [Pain Point Pages — Template & Example](#3-pain-point-pages)
4. [Comparison Pages — Template & Example](#4-comparison-pages)
5. [How-To Pages — Template & Example](#5-how-to-pages)
6. [Data Model](#6-data-model)
7. [Internal Linking Strategy](#7-internal-linking-strategy)
8. [Schema Markup (JSON-LD)](#8-schema-markup)
9. [Next.js Implementation](#9-nextjs-implementation)
10. [Quality Gates & Kill Switches](#10-quality-gates--kill-switches)

---

## 1. Feasibility Index

### Programmatic SEO Feasibility Score: 72 / 100 — Moderate Fit

| Category | Score | Max | Rationale |
|---|---|---|---|
| Search Pattern Validity | 15 | 20 | Clear repeating patterns ("how to automate X", "best app for X", "Y vs Z for non-technical users"). Aggregate demand is moderate — long-tail, not head terms. |
| Unique Value per Page | 18 | 25 | Each pain point has distinct time-wasted data, real forum quotes, different app recommendations, and unique step-by-step flows. Comparison pages have genuinely different feature matrices. Not just variable swaps. |
| Data Availability & Quality | 15 | 20 | Pain point data from 2,847 forum posts is proprietary and defensible. Competitor feature data is public but curated. Some data gaps in lesser pain points will need editorial fill. |
| Search Intent Alignment | 12 | 15 | Pain point pages match informational + solution intent. Comparison pages match commercial investigation. How-to pages match instructional intent. All natural page types users expect to find. |
| Competitive Feasibility | 6 | 10 | Long-tail queries are mostly served by generic listicles and Reddit threads. No dominant programmatic competitor in the "AI for non-technical users" niche. Head terms (e.g., "meal planning app") are dominated by established players — we avoid those. |
| Operational Sustainability | 6 | 10 | Solo founder means limited capacity for data refresh. Templates reduce per-page cost. Pain point data is relatively stable. Competitor features change and will need periodic updates. |

### Verdict: Moderate Fit — Proceed with Scope Limits

**Scope limit:** Start with 50-60 high-quality pages across three page types. Do not scale beyond this until traffic data validates the approach. Every page must pass the quality gate before indexing.

---

## 2. Page Taxonomy

### Three page types, three URL directories

```
meldar.ai/
├── solve/                     # Pain Point Pages (12-15 pages)
│   ├── email-chaos/
│   ├── meal-planning-paralysis/
│   ├── expense-tracking-nightmare/
│   ├── social-media-posting-burnout/
│   ├── job-application-fatigue/
│   ├── price-watching-obsession/
│   ├── grade-checking-anxiety/
│   ├── meeting-overload/
│   └── ...
│
├── vs/                        # Comparison Pages (15-20 pages)
│   ├── chatgpt/
│   ├── zapier/
│   ├── make/
│   ├── cursor/
│   ├── lovable/
│   ├── bolt/
│   ├── notion/
│   ├── ifttt/
│   └── ...
│
├── learn/                     # How-To Pages (20-25 pages)
│   ├── automate-meal-planning/
│   ├── organize-email-with-ai/
│   ├── track-expenses-with-ai/
│   ├── automate-social-media-posts/
│   ├── write-job-applications-with-ai/
│   ├── track-price-drops-with-ai/
│   ├── plan-your-week-with-ai/
│   └── ...
│
├── sitemap-solve.xml          # Segmented sitemaps
├── sitemap-vs.xml
└── sitemap-learn.xml
```

### Why this taxonomy

- **/solve/** targets people who know their pain but not the solution. Informational + solution intent.
- **/vs/** targets people comparing tools. Commercial investigation intent. High purchase intent.
- **/learn/** targets people searching "how to use AI to [task]". Instructional intent. Widest top-of-funnel reach.

### Page count targets

| Type | Initial Count | Keyword Pattern |
|---|---|---|
| Pain Point (`/solve/`) | 12-15 | "[pain point] solution", "how to fix [pain point]", "stop wasting time on [task]" |
| Comparison (`/vs/`) | 15-20 | "meldar vs [competitor]", "[competitor] alternative for non-technical", "[competitor] too complicated" |
| How-To (`/learn/`) | 20-25 | "how to use AI to [task]", "automate [task] without coding", "AI [task] for beginners" |
| **Total** | **47-60** | |

---

## 3. Pain Point Pages

### URL Pattern

```
/solve/[slug]/
```

### H1 Formula

```
Stop Wasting [hours_wasted] Hours a Week on [pain_point_name]
```

### Meta Title Formula

```
[pain_point_name]: How to Automate It Without Any Technical Skills | Meldar
```

Limited to 60 characters. Adjust per page. Examples:
- "Email Chaos: Automate It Without Technical Skills | Meldar" (57 chars)
- "Meal Planning: Let AI Handle It, No Coding Needed | Meldar" (57 chars)

### Meta Description Formula

```
You spend [hours_wasted] hours a week on [pain_point_description]. Meldar finds the right AI app for your situation and builds it for you. No coding required.
```

Limited to 155 characters. Adjust per page.

### Template Structure

```
┌─────────────────────────────────────────────────┐
│  BREADCRUMB: Home > Solve > [Pain Point Name]   │
├─────────────────────────────────────────────────┤
│  H1: Stop Wasting [hours] Hours a Week on       │
│      [Pain Point Name]                           │
│                                                  │
│  Subhead: [one_line_hook]                        │
│  CTA Button: "Find Your Fix — Free in 30s"      │
│  → links to /quiz or /scan                       │
├─────────────────────────────────────────────────┤
│  SECTION: The Real Cost                          │
│  ─────────────────────                           │
│  H2: What [pain_point_name] Actually Costs You   │
│                                                  │
│  Visual stat block:                              │
│  • [hours_wasted] hrs/week wasted                │
│  • [hours_yearly] hrs/year                       │
│  • [money_equivalent] EUR in lost productivity   │
│                                                  │
│  Body: [cost_paragraph] — 2-3 sentences about    │
│  the hidden cost, citing forum research.         │
├─────────────────────────────────────────────────┤
│  SECTION: You Are Not Alone                      │
│  ─────────────────────────                       │
│  H2: What People Are Saying                      │
│                                                  │
│  3 real forum quotes (anonymized):               │
│  • "[forum_quote_1]" — Reddit, r/[subreddit]     │
│  • "[forum_quote_2]" — Reddit, r/[subreddit]     │
│  • "[forum_quote_3]" — Online forum              │
│                                                  │
│  These are from the 2,847-post research dataset. │
│  Each quote must be real, sourced, and relevant.  │
├─────────────────────────────────────────────────┤
│  SECTION: The AI Solution                        │
│  ─────────────────────────                       │
│  H2: How AI Can Fix [pain_point_name]            │
│                                                  │
│  [solution_paragraph] — what the AI app does,    │
│  written for a non-technical reader.             │
│                                                  │
│  Example app card:                               │
│  ┌──────────────────────────┐                    │
│  │ [example_app_name]       │                    │
│  │ [example_app_description]│                    │
│  │ Built for: [audience]    │                    │
│  │ Time saved: [hours] hrs  │                    │
│  └──────────────────────────┘                    │
├─────────────────────────────────────────────────┤
│  SECTION: Why Meldar (not a generic tool)        │
│  ─────────────────────────────────────           │
│  H2: Why Meldar Instead of [competitor_1] or     │
│      [competitor_2]                              │
│                                                  │
│  3-row comparison mini-table:                    │
│  | Feature         | Meldar | [comp_1] | [comp_2]│
│  | No coding       | Yes    | No       | No      │
│  | Finds what to   | Yes    | No       | No      │
│  |   build for you |        |          |         │
│  | Builds it for   | Yes    | No       | No      │
│  |   you (EUR 79)  |        |          |         │
│                                                  │
│  Internal links:                                 │
│  → Full comparison: /vs/[competitor_1]           │
│  → Full comparison: /vs/[competitor_2]           │
├─────────────────────────────────────────────────┤
│  SECTION: FAQ (2-4 questions)                    │
│  ─────────────────────────                       │
│  Q: Do I need to know how to code?               │
│  A: No. Meldar's founder builds it for you.      │
│                                                  │
│  Q: [faq_question_2]                             │
│  A: [faq_answer_2]                               │
│                                                  │
│  Q: How much does it cost?                       │
│  A: The scan is free. If you want a custom app,  │
│     it's EUR 79 one-time. No subscription needed.│
├─────────────────────────────────────────────────┤
│  SECTION: CTA                                    │
│  ─────────                                       │
│  H2: Ready to Reclaim [hours_wasted] Hours       │
│      a Week?                                     │
│                                                  │
│  CTA: "Take the Free Scan" → /scan              │
│  Sub-CTA: "Or start with the quiz" → /quiz       │
├─────────────────────────────────────────────────┤
│  INTERNAL LINKS FOOTER                           │
│  ─────────────────────                           │
│  Related problems:                               │
│  → /solve/[related_pain_1]                       │
│  → /solve/[related_pain_2]                       │
│                                                  │
│  Learn how to fix it yourself:                   │
│  → /learn/[related_how_to]                       │
└─────────────────────────────────────────────────┘
```

### Full Example: /solve/email-chaos/

---

**URL:** `https://meldar.ai/solve/email-chaos`

**Meta Title:** `Email Chaos: Automate It Without Technical Skills | Meldar`

**Meta Description:** `You spend 4 hours a week drowning in email. Meldar finds the right AI app for your inbox and builds it for you. No coding. Free scan.`

**Breadcrumb:** Home > Solve > Email Chaos

---

**H1: Stop Wasting 4 Hours a Week on Email Chaos**

Your inbox is a second job. Every morning starts the same way: 47 unread messages, half of them irrelevant, and the important ones buried under newsletters you forgot to unsubscribe from. You spend your best hours sorting, replying, and searching for that one attachment from last Tuesday.

**[Find Your Fix — Free in 30 Seconds]** → /scan

---

**H2: What Email Chaos Actually Costs You**

| Metric | Value |
|---|---|
| Time wasted per week | 4 hours |
| Time wasted per year | 208 hours |
| Equivalent salary lost (at EUR 25/hr) | EUR 5,200/year |

That is 26 full working days a year — more than an entire month of your life — spent managing your inbox instead of doing the work that actually matters. And it compounds: every hour spent on email is an hour not spent on the project, the side hustle, or the rest you need.

---

**H2: What People Are Saying**

> "I literally spend the first 90 minutes of every day just triaging my inbox. By the time I start real work, I'm already exhausted."
> — Reddit, r/productivity

> "I've tried every email app. Superhuman, Hey, Spark. They all help for a week and then I'm back to square one because the volume doesn't change."
> — Reddit, r/emailaddiction

> "The worst part is missing important emails because they're buried under 200 marketing messages. I missed a job interview invite once."
> — Online forum

These quotes come from an analysis of 2,847 posts across Reddit and online forums where people describe their daily frustrations with repetitive tasks.

---

**H2: How AI Can Fix Email Chaos**

The problem is not your email app — it is the absence of a system that understands what matters to you. AI can:

- **Categorize incoming email** by priority, sender relationship, and required action — automatically
- **Draft replies** for routine messages using your tone and past responses
- **Surface only what needs your attention** and archive the rest
- **Send you a daily digest** instead of making you check 30 times a day

This is not a fantasy — these are real automations that Meldar builds for non-technical users.

**Example App: Inbox Zero Agent**

| | |
|---|---|
| **What it does** | Reads your inbox, categorizes by urgency, drafts replies, sends a morning digest with only what needs your attention |
| **Built for** | Anyone drowning in email who does not want to learn automation tools |
| **Time saved** | 3-4 hours per week |
| **How you get it** | Meldar's founder builds it for you. EUR 79 one-time. Working in 72 hours. |

---

**H2: Why Meldar Instead of Zapier or Superhuman**

| | Meldar | Zapier | Superhuman |
|---|---|---|---|
| No coding or setup required | Yes — founder builds it for you | No — you build your own "Zaps" | No — still manual triage |
| Discovers what to build for your situation | Yes — personalized scan | No — you need to know what you want | No — it is a fixed product |
| Builds a custom AI app for you | Yes — EUR 79, 72-hour delivery | No — DIY with templates | No — not an automation tool |

Want the full comparison? See [Meldar vs Zapier](/vs/zapier) or [Meldar vs Superhuman](/vs/superhuman).

---

**H2: Frequently Asked Questions**

**Q: Do I need to know how to code?**
A: No. You take a free scan, Meldar tells you what to build, and the founder builds it for you. You never touch a terminal or write a line of code.

**Q: Will it work with Gmail / Outlook / Apple Mail?**
A: Yes. The AI app works with any email provider that supports standard access. Meldar's founder configures it for your specific setup during the build.

**Q: What if I just want to try the free scan first?**
A: That is what most people do. Upload a screenshot of your screen time, and Meldar shows you exactly where your time goes — and what to do about it. No payment, no signup.

**Q: How much does it cost?**
A: The scan is free. If you want a custom AI app built for your inbox, it is EUR 79 one-time. No subscription required to use your app. If you want ongoing access to Meldar's skills library and bundled AI APIs, the Bundle is EUR 9.99/month.

---

**H2: Ready to Reclaim 4 Hours a Week?**

Your inbox will not fix itself. But it takes 30 seconds to find out what an AI app could do for you.

**[Take the Free Scan]** → /scan

Or [start with the quiz](/quiz) if you want to explore more pain points first.

---

**Related Problems:**
- [Meal Planning Paralysis](/solve/meal-planning-paralysis) — 3 hours/week wasted
- [Meeting Overload](/solve/meeting-overload) — 4 hours/week wasted

**Learn How to Fix It Yourself:**
- [How to Organize Email with AI](/learn/organize-email-with-ai)

---

## 4. Comparison Pages

### URL Pattern

```
/vs/[competitor-slug]/
```

### H1 Formula

```
Meldar vs [Competitor Name]: [differentiating_hook]
```

### Meta Title Formula

```
Meldar vs [Competitor]: [short_hook] | Honest Comparison
```

Examples:
- "Meldar vs ChatGPT: Which One Actually Builds Apps? | Comparison" (60 chars)
- "Meldar vs Zapier: AI Automation Without the Learning Curve" (57 chars)

### Meta Description Formula

```
[Competitor] [does_what]. Meldar [does_what_differently]. See the honest comparison for non-technical users who want AI to work for them.
```

### Template Structure

```
┌─────────────────────────────────────────────────┐
│  BREADCRUMB: Home > Compare > Meldar vs [Name]  │
├─────────────────────────────────────────────────┤
│  H1: Meldar vs [Competitor]:                     │
│      [differentiating_hook]                      │
│                                                  │
│  Subtitle: An honest comparison for people who   │
│  want AI to work for them — without a CS degree. │
├─────────────────────────────────────────────────┤
│  SECTION: Quick Verdict                          │
│  ──────────────────────                          │
│  2-3 sentence summary of when to use Meldar      │
│  vs when to use the competitor. Honest — if the  │
│  competitor is better for some cases, say so.     │
│                                                  │
│  CTA: "See What Meldar Recommends for You"       │
│  → /scan                                         │
├─────────────────────────────────────────────────┤
│  SECTION: Comparison Table                       │
│  ─────────────────────────                       │
│  H2: Feature-by-Feature Comparison               │
│                                                  │
│  | Feature              | Meldar    | [Comp]    │
│  |──────────────────────|───────────|───────────│
│  | Requires coding      | No        | [Yes/No]  │
│  | Discovers what to    | Yes       | No        │
│  |   build              |           |           │
│  | Builds the app for   | Yes (79€) | No        │
│  |   you                |           |           │
│  | Works in browser     | Yes       | [Yes/No]  │
│  | Ongoing AI APIs      | Bundle    | [varies]  │
│  |   bundled            | 9.99€/mo  |           │
│  | Privacy-first (no    | Yes       | [varies]  │
│  |   data stored)       |           |           │
│  | Target audience      | Non-tech  | [varies]  │
│                                                  │
│  Features must be accurate and verifiable.        │
├─────────────────────────────────────────────────┤
│  SECTION: Where [Competitor] Shines              │
│  ────────────────────────────────                │
│  H2: What [Competitor] Is Good At                │
│                                                  │
│  Honest 2-3 bullet points about the competitor's │
│  strengths. This builds trust and prevents the   │
│  page from reading as a hit piece.               │
├─────────────────────────────────────────────────┤
│  SECTION: Where [Competitor] Falls Short         │
│  ──────────────────────────────────────          │
│  H2: Where [Competitor] Struggles for            │
│      Non-Technical Users                         │
│                                                  │
│  2-3 specific pain points with examples.          │
│  Sourced from real forum complaints where         │
│  possible.                                        │
├─────────────────────────────────────────────────┤
│  SECTION: Where Meldar Fits                      │
│  ──────────────────────────                      │
│  H2: What Meldar Does Differently                │
│                                                  │
│  3 key differentiators, each with a concrete     │
│  example rather than a marketing claim.          │
├─────────────────────────────────────────────────┤
│  SECTION: Who Should Use What                    │
│  ─────────────────────────────                   │
│  H2: The Honest Recommendation                   │
│                                                  │
│  "Use [Competitor] if: [conditions]"             │
│  "Use Meldar if: [conditions]"                   │
│                                                  │
│  This section is the reason users trust and       │
│  share the page. Never say "always use Meldar."  │
├─────────────────────────────────────────────────┤
│  SECTION: FAQ (2-3 questions)                    │
│  ──────────────────────────                      │
│  Specific to this competitor comparison.          │
│  E.g., "Can I use [Competitor] and Meldar        │
│  together?"                                       │
├─────────────────────────────────────────────────┤
│  SECTION: CTA                                    │
│  ──────────                                      │
│  H2: Not Sure Which Is Right for You?            │
│  CTA: "Take the Free Scan" → /scan              │
├─────────────────────────────────────────────────┤
│  INTERNAL LINKS FOOTER                           │
│  ─────────────────────                           │
│  Other comparisons:                              │
│  → /vs/[other_competitor_1]                      │
│  → /vs/[other_competitor_2]                      │
│                                                  │
│  Related pain points:                            │
│  → /solve/[relevant_pain_point]                  │
└─────────────────────────────────────────────────┘
```

### Full Example: /vs/chatgpt/

---

**URL:** `https://meldar.ai/vs/chatgpt`

**Meta Title:** `Meldar vs ChatGPT: Which One Actually Builds Apps for You?`

**Meta Description:** `ChatGPT gives advice. Meldar builds a working AI app for your life. See the honest comparison for non-technical users.`

**Breadcrumb:** Home > Compare > Meldar vs ChatGPT

---

**H1: Meldar vs ChatGPT: Which One Actually Builds Apps for You?**

If you are not a developer, ChatGPT and Meldar look like they do the same thing. They do not. This page explains the difference honestly — including where ChatGPT is the better choice.

---

**H2: Quick Verdict**

ChatGPT is the best general-purpose AI chat tool available. If you want to ask questions, brainstorm, write text, or learn things, ChatGPT is excellent — and Meldar does not try to replace it.

Meldar exists for the next step: when you realize you are asking ChatGPT the same thing every week and want an app that just does it for you automatically. ChatGPT advises. Meldar builds.

**[See What Meldar Recommends for You — Free]** → /scan

---

**H2: Feature-by-Feature Comparison**

| Feature | Meldar | ChatGPT |
|---|---|---|
| Answers questions about anything | No — not a chat tool | Yes — best in class |
| Discovers what AI app you need | Yes — personalized scan | No — you need to know what to ask |
| Builds a working app for you | Yes — EUR 79, 72-hour delivery | No — gives instructions you cannot follow |
| Requires coding to get value | No | No for chat; Yes for automation |
| Works entirely in browser | Yes | Yes |
| Bundles third-party AI APIs | Yes — EUR 9.99/mo | No — ChatGPT only |
| Privacy-first (no data stored) | Yes — client-side processing | No — OpenAI retains conversation data |
| Cost | Free scan, EUR 79 build | Free tier or $20/mo for Plus |

---

**H2: What ChatGPT Is Good At**

Credit where it is due:

- **General knowledge and conversation.** ChatGPT is the best conversational AI for general-purpose questions. Meldar is not a chat tool and does not try to be one.
- **Writing assistance.** For drafting emails, essays, cover letters, and creative writing, ChatGPT is excellent.
- **Accessibility.** ChatGPT is free to start, works in every browser, and requires zero setup. It is the most accessible AI tool in the world.

---

**H2: Where ChatGPT Struggles for Non-Technical Users**

- **It advises but does not act.** Ask ChatGPT "how do I automate my email triage" and it will give you a 12-step guide involving Zapier, Google Scripts, and API keys. If you are non-technical, you cannot execute those steps.
- **No memory of your life context.** ChatGPT does not know your screen time, your app usage patterns, or your specific pain points unless you explain them every time. It cannot analyze your digital footprint.
- **No delivery.** ChatGPT does not produce a working, deployed application. It produces text. The gap between "here's how you could do it" and "here's your working app" is where non-technical users get stuck.

> "I asked ChatGPT to help me automate my expense tracking. It gave me a Python script. I don't know what Python is."
> — Reddit, r/ChatGPT

---

**H2: What Meldar Does Differently**

1. **Discovers your problem first.** Instead of requiring you to know what to build, Meldar analyzes your screen time and digital habits to recommend the one app that saves you the most time. ChatGPT waits for you to ask the right question.

2. **Builds the app, not the instructions.** When Meldar recommends an Inbox Zero Agent, the founder builds it for you — a real, working app in a GitHub repo, configured and tested. ChatGPT gives you a tutorial you cannot follow.

3. **Bundles the AI tools your app needs.** Your app might need image generation, voice synthesis, or web search. Meldar bundles those APIs under one subscription (EUR 9.99/mo) so you do not need to sign up for Leonardo, ElevenLabs, and Perplexity separately.

---

**H2: The Honest Recommendation**

**Use ChatGPT if:**
- You want to ask questions, brainstorm, or write text
- You are technical enough to follow implementation guides
- You enjoy exploring and learning about AI capabilities
- You need a general-purpose AI assistant

**Use Meldar if:**
- You know you are wasting time on repetitive tasks but do not know what to build
- You want a working AI app, not a tutorial
- You are not technical and do not want to become technical
- You want someone to build it for you and hand you the keys

**Use both if:**
- You use ChatGPT for daily questions and Meldar for the one automation that saves you hours every week. They are complementary, not competing.

---

**H2: Frequently Asked Questions**

**Q: Can I use ChatGPT and Meldar together?**
A: Yes. Many Meldar users are ChatGPT users. ChatGPT is your daily AI assistant. Meldar is the service that turns one of those recurring ChatGPT conversations into a working app that runs on autopilot.

**Q: Is Meldar built on ChatGPT?**
A: No. Meldar uses Anthropic's Claude for its AI processing. Your data is processed client-side where possible, and Meldar never stores raw uploads.

**Q: Why would I pay EUR 79 for Meldar when ChatGPT is $20/month?**
A: Different products. ChatGPT Plus gives you better chat. Meldar's EUR 79 gives you a working, custom-built AI app that saves you hours every week — built by a human, not generated by a chatbot. You own the code. There is no ongoing fee to use it.

---

**H2: Not Sure Which Is Right for You?**

Take the free Digital Footprint Scan. In 30 seconds, Meldar shows you where your time goes and what an AI app could do about it. No signup, no payment.

**[Take the Free Scan]** → /scan

---

**Other Comparisons:**
- [Meldar vs Zapier](/vs/zapier) — When automation tools are too complicated
- [Meldar vs Cursor](/vs/cursor) — When code editors are not the answer
- [Meldar vs Notion](/vs/notion) — When organization is not the same as automation

**Related Pain Points:**
- [Email Chaos](/solve/email-chaos) — 4 hours/week wasted
- [Job Application Fatigue](/solve/job-application-fatigue) — 6 hours/week wasted

---

## 5. How-To Pages

### URL Pattern

```
/learn/[action-slug]/
```

### H1 Formula

```
How to [Action] with AI (No Coding Required)
```

### Meta Title Formula

```
How to [Action] with AI — Step-by-Step for Beginners | Meldar
```

Examples:
- "How to Automate Meal Planning with AI — No Coding | Meldar" (57 chars)
- "How to Track Expenses with AI — Beginner Guide | Meldar" (54 chars)

### Meta Description Formula

```
Step-by-step guide to [action] using AI. No coding, no technical skills. See how Meldar builds it for you in 72 hours.
```

### Template Structure

```
┌─────────────────────────────────────────────────┐
│  BREADCRUMB: Home > Learn > [Action Title]      │
├─────────────────────────────────────────────────┤
│  H1: How to [Action] with AI                    │
│      (No Coding Required)                        │
│                                                  │
│  Subtitle: A step-by-step guide for people who   │
│  do not want to learn programming.               │
│                                                  │
│  Reading time: [X] min                           │
├─────────────────────────────────────────────────┤
│  SECTION: The Problem                            │
│  ────────────────────                            │
│  H2: Why [Task] Takes So Long                    │
│                                                  │
│  2-3 paragraphs on the pain, with stat from      │
│  research data. Links to /solve/[pain_point]     │
│  for the full deep dive.                         │
├─────────────────────────────────────────────────┤
│  SECTION: What You Need                          │
│  ──────────────────────                          │
│  H2: What You Will Need                          │
│                                                  │
│  Bulleted list of prerequisites. Keep it short    │
│  and non-intimidating:                            │
│  • A browser (Chrome, Safari, Firefox)           │
│  • [Any specific account needed]                 │
│  • 10 minutes of your time                       │
├─────────────────────────────────────────────────┤
│  SECTION: Step-by-Step Guide                     │
│  ───────────────────────────                     │
│  H2: Step-by-Step: [Action] with AI              │
│                                                  │
│  **Step 1: [action_verb] [object]**              │
│  Description (2-3 sentences)                     │
│  [Screenshot or illustration placeholder]         │
│                                                  │
│  **Step 2: [action_verb] [object]**              │
│  Description                                      │
│                                                  │
│  **Step 3: [action_verb] [object]**              │
│  Description                                      │
│                                                  │
│  ...up to 5-7 steps maximum.                     │
│  Steps must be actionable and completable by      │
│  someone with zero technical knowledge.           │
├─────────────────────────────────────────────────┤
│  SECTION: The Shortcut                           │
│  ─────────────────────                           │
│  H2: Or Skip the Steps — Let Meldar Build It     │
│                                                  │
│  "If the steps above feel like too much, that    │
│  is exactly why Meldar exists."                  │
│                                                  │
│  Brief explanation of how Meldar's Build tier     │
│  delivers the same result without the DIY.       │
│                                                  │
│  CTA: "Get It Built for You — EUR 79" → /scan   │
├─────────────────────────────────────────────────┤
│  SECTION: What the Result Looks Like             │
│  ───────────────────────────────────             │
│  H2: What Your AI [Task] App Can Do              │
│                                                  │
│  Concrete feature list of what the finished      │
│  automation does. Makes the abstract tangible.   │
├─────────────────────────────────────────────────┤
│  SECTION: FAQ (2-3 questions)                    │
│  ──────────────────────────                      │
│  Specific to this how-to topic.                  │
├─────────────────────────────────────────────────┤
│  SECTION: CTA                                    │
│  ──────────                                      │
│  H2: Start with a Free Scan                      │
│  CTA: "Take the Digital Footprint Scan" → /scan │
├─────────────────────────────────────────────────┤
│  INTERNAL LINKS FOOTER                           │
│  ─────────────────────                           │
│  Related guides:                                 │
│  → /learn/[related_guide_1]                      │
│  → /learn/[related_guide_2]                      │
│                                                  │
│  Related problem:                                │
│  → /solve/[related_pain_point]                   │
└─────────────────────────────────────────────────┘
```

### Full Example: /learn/automate-meal-planning/

---

**URL:** `https://meldar.ai/learn/automate-meal-planning`

**Meta Title:** `How to Automate Meal Planning with AI — No Coding | Meldar`

**Meta Description:** `Step-by-step guide to automating your weekly meal plan with AI. No coding, no apps to install. See how Meldar builds it for you.`

**Breadcrumb:** Home > Learn > Automate Meal Planning

---

**H1: How to Automate Meal Planning with AI (No Coding Required)**

A step-by-step guide for people who spend hours every week deciding what to eat — and want AI to handle it instead.

Reading time: 6 min

---

**H2: Why Meal Planning Takes So Long**

You open the fridge. Nothing inspires you. You open a recipe app. Too many choices. You check what is on sale. None of it matches the recipes you saved. You give up and order takeout — again.

Research across 2,847 forum posts found that meal planning paralysis wastes an average of 3 hours per week. That is 156 hours per year spent on a problem that AI can solve in seconds.

The issue is not laziness — it is decision fatigue compounded by scattered information. Your dietary preferences live in your head, your grocery list lives in an app, your budget lives in your bank account, and your schedule lives in your calendar. No single tool connects them.

Read more: [Meal Planning Paralysis — The Full Problem](/solve/meal-planning-paralysis)

---

**H2: What You Will Need**

- A browser (Chrome, Safari, or Firefox)
- A free ChatGPT or Claude account (for the DIY approach)
- 10 minutes of your time
- Optional: a list of dietary preferences or restrictions

---

**H2: Step-by-Step: Automate Meal Planning with AI**

**Step 1: Write down your constraints**

Before talking to any AI, spend 2 minutes listing your real constraints. Not aspirational ones — real ones. Examples:
- "I eat vegetarian on weekdays"
- "Budget is EUR 80/week for groceries"
- "I have 30 minutes max to cook on weeknights"
- "My kid will not eat mushrooms"

This list is your prompt foundation. AI is only as useful as the context you give it.

**Step 2: Create a meal planning prompt**

Open ChatGPT or Claude in your browser. Paste a prompt like this:

> "I need a 7-day meal plan. Here are my constraints: [paste your list from Step 1]. For each day, give me breakfast, lunch, and dinner. Keep ingredients simple and available at a standard European supermarket. At the end, generate a consolidated grocery list sorted by aisle (produce, dairy, grains, protein, pantry)."

Submit it. You will get a full week's plan in about 30 seconds.

**Step 3: Refine the output**

The first plan will not be perfect. That is normal. Reply with corrections:
- "Swap Thursday dinner — I do not like lentils"
- "Add a snack option for each day"
- "Make the grocery list cheaper — I am over budget"

Two rounds of refinement usually produces a usable plan.

**Step 4: Save and reuse your prompt**

Copy your refined prompt (with constraints) and save it somewhere you will find it — a note, a bookmark, a pinned message. Next week, paste it again with small tweaks ("I have leftover rice from this week").

**Step 5: Automate the grocery list (advanced)**

If you want the grocery list sent to your phone automatically every Sunday, you need an automation layer. This is where it gets technical: you would need to connect the AI to a scheduling tool and a messaging app. For most non-technical users, this is the step where the DIY approach breaks down.

---

**H2: Or Skip the Steps — Let Meldar Build It**

If Step 5 made you think "I am not doing that," that is exactly why Meldar exists.

Here is what happens instead:
1. You take Meldar's free Digital Footprint Scan (30 seconds)
2. Meldar identifies meal planning as one of your time sinks
3. You order the Build tier (EUR 79, one-time)
4. Meldar's founder builds you a working Meal Planner AI app — personalized to your constraints, connected to your calendar, with an automated weekly grocery list
5. You receive a working app in 72 hours. You own the code. No subscription required to use it.

**[Get It Built for You — EUR 79]** → /scan

---

**H2: What Your AI Meal Planning App Can Do**

Once built, your personalized meal planner can:

- Generate a full 7-day meal plan every Sunday based on your dietary preferences, budget, and schedule
- Adjust automatically when you flag meals you did not like
- Produce a sorted grocery list and send it to your phone
- Track what you have cooked before and rotate to avoid repetition
- Account for leftovers and reduce food waste
- Integrate with your calendar so it knows which nights you have 30 minutes vs. 60 minutes

This is not a generic recipe app. It is a system built for your life.

---

**H2: Frequently Asked Questions**

**Q: Can AI account for food allergies?**
A: Yes. Both the DIY approach (by including allergies in your prompt) and the Meldar-built app (configured during the build) handle allergies. The Meldar app can also flag potential allergens in suggested recipes.

**Q: Does this work for families with different dietary needs?**
A: Yes. Specify each person's requirements in your constraints. The AI can generate meals that satisfy multiple diets or suggest modifications per person.

**Q: What if I do not use ChatGPT or Claude?**
A: The DIY steps work with any AI chat tool. If you do not want to DIY at all, Meldar builds the full app for you — no ChatGPT account needed on your end.

---

**H2: Start with a Free Scan**

Not sure if meal planning is your biggest time sink? The Digital Footprint Scan analyzes your screen time and tells you where AI can help most — in 30 seconds, for free.

**[Take the Digital Footprint Scan]** → /scan

---

**Related Guides:**
- [How to Track Expenses with AI](/learn/track-expenses-with-ai)
- [How to Automate Social Media Posts](/learn/automate-social-media-posts)

**Related Problem:**
- [Meal Planning Paralysis](/solve/meal-planning-paralysis) — 3 hours/week wasted

---

## 6. Data Model

### Overview

All page content is driven by structured data objects. This allows templates to render dynamically while ensuring every page has the required content to pass quality gates.

### Pain Point Data

```typescript
interface PainPoint {
  // Identity
  slug: string;                    // "email-chaos"
  name: string;                    // "Email Chaos"
  life_category: string;           // "email" | "food" | "money" | "social" | "work" | "shopping" | "school" | "health" | "files" | "planning"

  // Core metrics
  hours_wasted_weekly: number;     // 4
  hours_wasted_yearly: number;     // 208 (computed)
  money_equivalent_yearly: number; // 5200 (computed at EUR 25/hr)

  // Content
  one_line_hook: string;           // "Your inbox is a second job."
  cost_paragraph: string;          // 2-3 sentences about hidden costs
  solution_paragraph: string;      // What the AI app does, non-technical language
  
  // Social proof
  forum_quotes: Array<{
    text: string;                  // The quote
    source: string;                // "Reddit, r/productivity"
    verified: boolean;             // Must be true before publishing
  }>;                              // Minimum 3

  // Example app
  example_app: {
    name: string;                  // "Inbox Zero Agent"
    description: string;           // What it does
    audience: string;              // "Anyone drowning in email"
    time_saved: string;            // "3-4 hours per week"
  };

  // Competitors for mini-comparison
  competitors: Array<{
    name: string;                  // "Zapier"
    slug: string;                  // "zapier" (for internal link)
    no_coding: boolean;
    discovers_what_to_build: boolean;
    builds_for_you: boolean;
  }>;                              // Exactly 2

  // FAQ
  faqs: Array<{
    question: string;
    answer: string;
  }>;                              // 2-4 items

  // Internal links
  related_pain_points: string[];   // ["meal-planning-paralysis", "meeting-overload"]
  related_how_to: string;          // "organize-email-with-ai"
  
  // SEO
  meta_title: string;              // Max 60 chars
  meta_description: string;        // Max 155 chars
  
  // Quality gate
  status: "draft" | "review" | "published";
  last_verified: string;           // ISO date
}
```

### Competitor Data

```typescript
interface Competitor {
  // Identity
  slug: string;                    // "chatgpt"
  name: string;                    // "ChatGPT"
  website: string;                 // "chat.openai.com"
  
  // Positioning
  category: string;                // "AI Chat" | "Automation" | "Code Editor" | "Productivity"
  one_line_description: string;    // "General-purpose AI chat assistant"
  differentiating_hook: string;    // "Which One Actually Builds Apps for You?"

  // Comparison features
  features: {
    requires_coding: boolean;
    discovers_what_to_build: boolean;
    builds_for_you: boolean;
    works_in_browser: boolean;
    bundles_apis: boolean;
    privacy_first: boolean;
    target_audience: string;       // "Everyone" | "Developers" | "Power users" | "Non-technical"
    pricing: string;               // "Free / $20/mo Plus"
  };
  
  // Content
  quick_verdict: string;           // 2-3 sentence summary
  strengths: string[];             // 2-3 honest bullet points
  weaknesses_for_nontechnical: Array<{
    point: string;
    forum_quote?: {
      text: string;
      source: string;
    };
  }>;                              // 2-3 specific pain points
  
  meldar_differentiators: Array<{
    title: string;
    explanation: string;
  }>;                              // 3 items
  
  // Honest recommendation
  use_competitor_if: string[];     // Conditions
  use_meldar_if: string[];         // Conditions
  use_both_if?: string;            // Optional
  
  // FAQ
  faqs: Array<{
    question: string;
    answer: string;
  }>;                              // 2-3 items
  
  // Internal links
  related_competitors: string[];   // ["zapier", "cursor"]
  related_pain_points: string[];   // ["email-chaos", "job-application-fatigue"]
  
  // SEO
  meta_title: string;
  meta_description: string;
  
  // Quality gate
  status: "draft" | "review" | "published";
  last_verified: string;
}
```

### How-To Data

```typescript
interface HowTo {
  // Identity
  slug: string;                    // "automate-meal-planning"
  action_title: string;            // "Automate Meal Planning"
  action_verb: string;             // "automate"
  task_noun: string;               // "meal planning"
  
  // Related pain point
  pain_point_slug: string;         // "meal-planning-paralysis"
  hours_wasted_weekly: number;     // 3
  
  // Content
  problem_paragraphs: string;      // 2-3 paragraphs on the pain
  reading_time_minutes: number;    // 6
  
  prerequisites: string[];         // ["A browser", "A free ChatGPT or Claude account", ...]
  
  steps: Array<{
    title: string;                 // "Write down your constraints"
    description: string;           // 2-3 sentences
    prompt_example?: string;       // Optional AI prompt to include
    is_technical_step: boolean;    // If true, this is where DIY breaks down
  }>;                              // 5-7 steps max
  
  // Meldar shortcut
  shortcut_pitch: string;          // What happens when Meldar builds it
  
  // Result preview
  app_capabilities: string[];      // What the finished app can do
  
  // FAQ
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  
  // Internal links
  related_guides: string[];        // ["track-expenses-with-ai", "automate-social-media-posts"]
  related_pain_point: string;      // "meal-planning-paralysis"
  
  // SEO
  meta_title: string;
  meta_description: string;
  
  // Quality gate
  status: "draft" | "review" | "published";
  last_verified: string;
}
```

### Data Storage

For the initial 50-60 pages, store data as TypeScript objects in the codebase:

```
/src/data/
├── pain-points.ts       # PainPoint[]
├── competitors.ts       # Competitor[]
├── how-tos.ts           # HowTo[]
└── types.ts             # Interface definitions
```

No database needed at this scale. Move to a CMS or database only when:
- Page count exceeds 100
- Multiple people need to edit content
- Content update frequency exceeds weekly

---

## 7. Internal Linking Strategy

### Link Architecture

Every programmatic page links to other pages in the system. The linking is structured, not random.

```
                    ┌──────────┐
                    │ Homepage │
                    │ meldar.ai│
                    └─────┬────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
    ┌─────▼─────┐   ┌────▼────┐   ┌─────▼─────┐
    │  /solve/  │   │  /vs/   │   │  /learn/  │
    │ Pain Point│   │Compare  │   │  How-To   │
    │  Index    │   │  Index  │   │  Index    │
    └─────┬─────┘   └────┬────┘   └─────┬─────┘
          │               │               │
    ┌─────▼─────┐   ┌────▼────┐   ┌─────▼─────┐
    │ /solve/   │◄──┤ /vs/    │──►│ /learn/   │
    │ email-    │   │ chatgpt │   │ organize- │
    │ chaos     │──►│         │◄──│ email-    │
    └───────────┘   └─────────┘   │ with-ai   │
                                  └───────────┘
```

### Linking Rules

| From Page Type | Links To | How |
|---|---|---|
| Pain Point (`/solve/`) | 2 other pain points | "Related Problems" footer |
| Pain Point (`/solve/`) | 1 how-to page | "Learn How to Fix It" footer |
| Pain Point (`/solve/`) | 2 competitor pages | In-body comparison mini-table links |
| Pain Point (`/solve/`) | Homepage `/scan` | Primary CTA |
| Comparison (`/vs/`) | 3 other comparisons | "Other Comparisons" footer |
| Comparison (`/vs/`) | 2 pain point pages | "Related Pain Points" footer |
| Comparison (`/vs/`) | Homepage `/scan` | Primary CTA |
| How-To (`/learn/`) | 2 other how-to guides | "Related Guides" footer |
| How-To (`/learn/`) | 1 pain point page | "Related Problem" footer |
| How-To (`/learn/`) | Homepage `/scan` | Primary and secondary CTAs |
| All pages | Homepage | Breadcrumb + header nav |

### Index Pages

Create lightweight index pages at each directory root:

- `/solve/` — "Problems Meldar Solves" — grid of all pain points with hours wasted
- `/vs/` — "How Meldar Compares" — grid of all competitor comparisons
- `/learn/` — "Learn to Use AI" — grid of all how-to guides by life category

These index pages:
- Serve as hub pages for internal link equity distribution
- Are linked from the main site navigation
- Group content by life category (email, food, money, etc.)
- Each card links to the individual page

### Link Equity Flow

```
Homepage (highest authority)
  ├── /solve/ (index)    ← nav link
  │     └── /solve/[slug]  ← index grid + cross-links from /vs/ and /learn/
  ├── /vs/ (index)       ← nav link  
  │     └── /vs/[slug]    ← index grid + cross-links from /solve/
  ├── /learn/ (index)    ← nav link
  │     └── /learn/[slug]  ← index grid + cross-links from /solve/
  ├── /scan              ← CTA from every page
  └── /quiz              ← Secondary CTA from pain point pages
```

### Anchor Text Rules

- Never use "click here" or "read more"
- Use descriptive anchor text that includes the target page's primary keyword
- Vary anchor text slightly across pages to avoid pattern detection
- Examples:
  - "See the full [Meldar vs Zapier comparison](/vs/zapier)"
  - "[Meal Planning Paralysis](/solve/meal-planning-paralysis) — 3 hours/week wasted"
  - "Learn [how to organize email with AI](/learn/organize-email-with-ai)"

---

## 8. Schema Markup

### Schema Eligibility Assessment

| Page Type | Schema Type | Eligibility Score | Verdict |
|---|---|---|---|
| Pain Point (`/solve/`) | FAQPage + Product | 78 | Valid but Limited — FAQ is visible; Product markup is valid for the Build tier service |
| Comparison (`/vs/`) | FAQPage | 75 | Valid but Limited — FAQ is visible on page |
| How-To (`/learn/`) | HowTo + FAQPage | 85 | Strong Candidate — genuine step-by-step content with visible FAQ |
| All pages | BreadcrumbList | 90 | Strong Candidate — breadcrumbs are visible |
| Homepage only | Organization + WebSite | 88 | Strong Candidate — brand entity page |

### Pain Point Pages: FAQPage + BreadcrumbList

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://meldar.ai"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Solve",
          "item": "https://meldar.ai/solve"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "{{pain_point.name}}",
          "item": "https://meldar.ai/solve/{{pain_point.slug}}"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "{{pain_point.faqs[0].question}}",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "{{pain_point.faqs[0].answer}}"
          }
        },
        {
          "@type": "Question",
          "name": "{{pain_point.faqs[1].question}}",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "{{pain_point.faqs[1].answer}}"
          }
        }
      ]
    }
  ]
}
```

**Note:** Product schema is not included on pain point pages. While Meldar's Build tier is a real purchasable service, the pain point pages are informational — the primary content entity is the pain point, not the product. Adding Product schema here would misrepresent the page's purpose. Product schema belongs on the dedicated pricing/tiers page.

### Comparison Pages: FAQPage + BreadcrumbList

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://meldar.ai"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Compare",
          "item": "https://meldar.ai/vs"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Meldar vs {{competitor.name}}",
          "item": "https://meldar.ai/vs/{{competitor.slug}}"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "{{competitor.faqs[0].question}}",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "{{competitor.faqs[0].answer}}"
          }
        },
        {
          "@type": "Question",
          "name": "{{competitor.faqs[1].question}}",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "{{competitor.faqs[1].answer}}"
          }
        }
      ]
    }
  ]
}
```

### How-To Pages: HowTo + FAQPage + BreadcrumbList

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://meldar.ai"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Learn",
          "item": "https://meldar.ai/learn"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "{{how_to.action_title}}",
          "item": "https://meldar.ai/learn/{{how_to.slug}}"
        }
      ]
    },
    {
      "@type": "HowTo",
      "name": "How to {{how_to.action_title}} with AI",
      "description": "{{how_to.meta_description}}",
      "totalTime": "PT{{how_to.reading_time_minutes}}M",
      "tool": [
        {
          "@type": "HowToTool",
          "name": "Web browser (Chrome, Safari, or Firefox)"
        },
        {
          "@type": "HowToTool",
          "name": "Free ChatGPT or Claude account"
        }
      ],
      "step": [
        {
          "@type": "HowToStep",
          "position": 1,
          "name": "{{how_to.steps[0].title}}",
          "text": "{{how_to.steps[0].description}}"
        },
        {
          "@type": "HowToStep",
          "position": 2,
          "name": "{{how_to.steps[1].title}}",
          "text": "{{how_to.steps[1].description}}"
        },
        {
          "@type": "HowToStep",
          "position": 3,
          "name": "{{how_to.steps[2].title}}",
          "text": "{{how_to.steps[2].description}}"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "{{how_to.faqs[0].question}}",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "{{how_to.faqs[0].answer}}"
          }
        },
        {
          "@type": "Question",
          "name": "{{how_to.faqs[1].question}}",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "{{how_to.faqs[1].answer}}"
          }
        }
      ]
    }
  ]
}
```

### Schema Implementation Notes

1. **All schema is server-rendered.** JSON-LD is injected via Next.js `generateMetadata` or a `<script type="application/ld+json">` in the page component. Never client-side rendered.
2. **Every schema property must match visible content.** If a FAQ is removed from the page, remove it from the schema.
3. **Validate before deploying each page type** using Google Rich Results Test.
4. **Monitor Search Console** Enhancements tab monthly for errors or warnings.
5. **Do not add AggregateRating or Review schema.** Meldar has no user reviews yet. Adding fabricated ratings is a policy violation.

---

## 9. Next.js Implementation

### File Structure

```
/src/
├── app/
│   ├── solve/
│   │   ├── page.tsx                    # Index: "Problems Meldar Solves"
│   │   └── [slug]/
│   │       └── page.tsx                # Pain point template
│   ├── vs/
│   │   ├── page.tsx                    # Index: "How Meldar Compares"
│   │   └── [slug]/
│   │       └── page.tsx                # Comparison template
│   ├── learn/
│   │   ├── page.tsx                    # Index: "Learn to Use AI"
│   │   └── [slug]/
│   │       └── page.tsx                # How-to template
│   ├── sitemap.ts                      # Dynamic sitemap generation
│   └── robots.ts                       # Robots.txt with sitemap references
│
├── components/
│   └── seo-pages/
│       ├── PainPointPage.tsx           # Pain point page component
│       ├── ComparisonPage.tsx          # Comparison page component
│       ├── HowToPage.tsx              # How-to page component
│       ├── BreadcrumbNav.tsx           # Shared breadcrumb component
│       ├── ComparisonTable.tsx         # Reusable comparison table
│       ├── ForumQuoteBlock.tsx         # Styled forum quote display
│       ├── StatBlock.tsx              # Visual stat display
│       ├── ExampleAppCard.tsx         # App preview card
│       ├── FaqAccordion.tsx           # FAQ with accordion
│       ├── InternalLinksFooter.tsx    # Related pages footer
│       └── JsonLd.tsx                 # Schema markup renderer
│
├── data/
│   ├── types.ts                       # PainPoint, Competitor, HowTo interfaces
│   ├── pain-points.ts                 # PainPoint[] data
│   ├── competitors.ts                 # Competitor[] data
│   └── how-tos.ts                     # HowTo[] data
│
└── lib/
    └── seo/
        ├── generate-schema.ts         # JSON-LD generation functions
        ├── generate-metadata.ts       # Next.js metadata generation
        └── get-related-pages.ts       # Internal linking logic
```

### Route Implementation Pattern

Each dynamic route follows the same pattern. Example for `/solve/[slug]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { painPoints } from "@/data/pain-points";
import { PainPointPage } from "@/components/seo-pages/PainPointPage";
import { generatePainPointMetadata } from "@/lib/seo/generate-metadata";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return painPoints
    .filter((pp) => pp.status === "published")
    .map((pp) => ({ slug: pp.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const painPoint = painPoints.find((pp) => pp.slug === slug);
  if (!painPoint) return {};
  return generatePainPointMetadata(painPoint);
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const painPoint = painPoints.find((pp) => pp.slug === slug);
  if (!painPoint || painPoint.status !== "published") notFound();
  return <PainPointPage data={painPoint} />;
}
```

### Key Implementation Details

1. **Static generation.** All programmatic pages use `generateStaticParams` for ISR. Pages are built at deploy time, not on request. This is critical for performance and SEO.

2. **Status gating.** Only pages with `status: "published"` are generated. Draft and review pages return 404. This prevents indexing of incomplete content.

3. **Metadata generation.** Each page type has a dedicated metadata function that produces `title`, `description`, `openGraph`, `twitter`, and `alternates` (canonical URL). Canonical URLs prevent duplicate content issues.

4. **Sitemap segmentation.** The `sitemap.ts` file generates separate sitemap entries grouped by page type. Optionally split into `sitemap-solve.xml`, `sitemap-vs.xml`, `sitemap-learn.xml` for easier monitoring in Search Console.

5. **JSON-LD injection.** Schema markup is rendered as a `<script type="application/ld+json">` inside the page component, server-side. Use a shared `JsonLd` component:

```tsx
function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
```

6. **No client-side data fetching.** All content is resolved at build time from the `/data/` files. No `useEffect`, no loading states, no client-side API calls. This is pure RSC.

7. **Shared components.** The components in `/components/seo-pages/` are shared across page types where appropriate (breadcrumbs, FAQ accordion, internal links footer). Page-type-specific layout is handled by the top-level page component (`PainPointPage`, `ComparisonPage`, `HowToPage`).

### Sitemap Generation

```tsx
// /src/app/sitemap.ts
import type { MetadataRoute } from "next";
import { painPoints } from "@/data/pain-points";
import { competitors } from "@/data/competitors";
import { howTos } from "@/data/how-tos";

const BASE_URL = "https://meldar.ai";

export default function sitemap(): MetadataRoute.Sitemap {
  const solvePages = painPoints
    .filter((pp) => pp.status === "published")
    .map((pp) => ({
      url: `${BASE_URL}/solve/${pp.slug}`,
      lastModified: new Date(pp.last_verified),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }));

  const vsPages = competitors
    .filter((c) => c.status === "published")
    .map((c) => ({
      url: `${BASE_URL}/vs/${c.slug}`,
      lastModified: new Date(c.last_verified),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

  const learnPages = howTos
    .filter((ht) => ht.status === "published")
    .map((ht) => ({
      url: `${BASE_URL}/learn/${ht.slug}`,
      lastModified: new Date(ht.last_verified),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }));

  const indexPages = [
    { url: `${BASE_URL}/solve`, changeFrequency: "weekly" as const, priority: 0.9 },
    { url: `${BASE_URL}/vs`, changeFrequency: "weekly" as const, priority: 0.9 },
    { url: `${BASE_URL}/learn`, changeFrequency: "weekly" as const, priority: 0.9 },
  ];

  return [...indexPages, ...solvePages, ...vsPages, ...learnPages];
}
```

---

## 10. Quality Gates & Kill Switches

### Pre-Publish Checklist (Every Page)

Before any page moves from `draft` to `published`:

- [ ] **Unique value demonstrated.** Page contains information not found on any other page in the system (unique quotes, unique data, unique steps).
- [ ] **Intent fully satisfied.** A user searching the target keyword would find this page a complete answer.
- [ ] **No near-duplicates.** No other page on the site covers substantially the same topic.
- [ ] **Forum quotes verified.** Every quote is real, sourced, and relevant. No fabricated quotes.
- [ ] **Competitor data accurate.** Feature comparisons are factually correct as of `last_verified` date.
- [ ] **Meta title under 60 characters.**
- [ ] **Meta description under 155 characters.**
- [ ] **All internal links resolve.** No broken links to unpublished pages.
- [ ] **Schema validates.** Passes Google Rich Results Test with no errors.
- [ ] **Canonical URL set.** Points to the correct page.
- [ ] **Mobile rendering verified.** All sections display correctly on mobile.
- [ ] **Page load time under 2 seconds.** No heavy images or unoptimized assets.

### Kill Switch Criteria

Monitor monthly. If any of these trigger, halt indexing of the affected page type and investigate:

| Signal | Threshold | Action |
|---|---|---|
| High impressions, near-zero clicks | CTR below 1% after 30 days for a page type | Review titles and descriptions. May indicate content mismatch. |
| Indexed pages with zero impressions | More than 30% of published pages have zero impressions after 60 days | Reduce page count. Consolidate thin pages. |
| Thin content warning in Search Console | Any manual warning | Immediately noindex affected pages. Audit all pages of that type. |
| Bounce rate above 85% | Across a page type for 30 days | Content is not satisfying intent. Rewrite or remove. |
| Crawl budget waste | Googlebot crawling noindexed or low-value pages frequently | Review robots.txt and internal linking. |
| Index bloat | Pages indexed exceeds pages with traffic by 3x+ | Noindex low-performers. Tighten `generateStaticParams` filter. |

### Content Refresh Schedule

| Content Type | Refresh Frequency | What Changes |
|---|---|---|
| Pain point metrics | Quarterly | Hours wasted, forum quotes (add new, verify existing) |
| Competitor features | Monthly | Feature matrix accuracy, pricing, new competitors |
| How-to steps | Quarterly | Tool availability, UI changes in ChatGPT/Claude |
| Internal links | On every new page publish | Add links to/from new pages |
| Schema markup | On any content change | Keep schema in sync with visible content |

---

## Appendix: Initial Page List

### Pain Point Pages (12)

| Slug | Name | Hours/Week | Life Category |
|---|---|---|---|
| email-chaos | Email Chaos | 4 | Email |
| meal-planning-paralysis | Meal Planning Paralysis | 3 | Food |
| expense-tracking-nightmare | Expense Tracking Nightmare | 2 | Money |
| social-media-posting-burnout | Social Media Posting Burnout | 5 | Social |
| job-application-fatigue | Job Application Fatigue | 6 | Work |
| price-watching-obsession | Price Watching Obsession | 2 | Shopping |
| grade-checking-anxiety | Grade Checking Anxiety | 3 | School |
| meeting-overload | Meeting Overload | 4 | Work |
| file-organization-chaos | File Organization Chaos | 2 | Files |
| health-tracking-overwhelm | Health Tracking Overwhelm | 2 | Health |
| weekly-planning-paralysis | Weekly Planning Paralysis | 3 | Planning |
| notification-overload | Notification Overload | 3 | Files |

### Comparison Pages (15)

| Slug | Name | Category |
|---|---|---|
| chatgpt | ChatGPT | AI Chat |
| claude | Claude | AI Chat |
| zapier | Zapier | Automation |
| make | Make (Integromat) | Automation |
| ifttt | IFTTT | Automation |
| cursor | Cursor | Code Editor |
| lovable | Lovable | App Builder |
| bolt | Bolt.new | App Builder |
| notion | Notion | Productivity |
| todoist | Todoist | Productivity |
| superhuman | Superhuman | Email |
| rork | Rork | AI Wrapper |
| copilot | Microsoft Copilot | AI Assistant |
| gemini | Google Gemini | AI Chat |
| perplexity | Perplexity | AI Search |

### How-To Pages (20)

| Slug | Action Title | Related Pain Point |
|---|---|---|
| automate-meal-planning | Automate Meal Planning | meal-planning-paralysis |
| organize-email-with-ai | Organize Email with AI | email-chaos |
| track-expenses-with-ai | Track Expenses with AI | expense-tracking-nightmare |
| automate-social-media-posts | Automate Social Media Posts | social-media-posting-burnout |
| write-job-applications-with-ai | Write Job Applications with AI | job-application-fatigue |
| track-price-drops-with-ai | Track Price Drops with AI | price-watching-obsession |
| automate-grade-checking | Automate Grade Checking | grade-checking-anxiety |
| summarize-meetings-with-ai | Summarize Meetings with AI | meeting-overload |
| organize-files-with-ai | Organize Files with AI | file-organization-chaos |
| plan-your-week-with-ai | Plan Your Week with AI | weekly-planning-paralysis |
| create-ai-health-tracker | Create an AI Health Tracker | health-tracking-overwhelm |
| manage-notifications-with-ai | Manage Notifications with AI | notification-overload |
| build-personal-ai-assistant | Build a Personal AI Assistant | — |
| automate-grocery-lists | Automate Grocery Lists | meal-planning-paralysis |
| ai-budget-tracker-for-beginners | AI Budget Tracker for Beginners | expense-tracking-nightmare |
| use-ai-without-coding | Use AI Without Coding | — |
| automate-daily-routines-with-ai | Automate Daily Routines with AI | weekly-planning-paralysis |
| ai-for-students-no-coding | AI for Students (No Coding) | grade-checking-anxiety |
| build-ai-app-without-coding | Build an AI App Without Coding | — |
| what-ai-app-should-i-build | What AI App Should I Build? | — |
