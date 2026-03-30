# Meldar Research Synthesis

**Date:** 2026-03-30
**Agents used:** 20 (15 use-case + 5 market)
**Status:** Compiling (17/20 reported)

---

## Market Verdict: We're First

All 4 market researchers (web, Reddit, app stores, VC, Twitter) independently confirmed:

> **No product combines: discover what to automate + guided setup + build personal apps.**

Every competitor starts with a blank prompt or assumes you know what you want.

### Closest competitors and why they're not us

| Competitor | What they do | What they lack |
|-----------|-------------|----------------|
| **Lovable** ($6.6B val) | AI app builder from prompts | No discovery, assumes you know what to build |
| **Bolt.new** ($105M) | Same | Same |
| **Minro/Iris** (YC F2025) | Learns behavior, pre-fills actions | Replicates behavior, doesn't discover what's WORTH automating |
| **Sintra AI** ($17M) | Pre-built AI employee roles | Business-only, no personal life, no discovery |
| **Zapier/Make** | Workflow automation | "Too complicated" for non-technical (Reddit consensus), no discovery |
| **Manus AI** (acquired by Meta) | Autonomous agent | One-off tasks, no persistent automation, no discovery, dead as indie product |
| **ChatGPT/Claude** | Chat | Advises but doesn't act. Can't build persistent apps. |

### The white space

```
                    Knows what to build    Doesn't know what to build
                    ─────────────────────  ──────────────────────────
Technical user      Cursor, Lovable, Bolt  (researches themselves)

Non-technical user  Zapier (struggles)     ← MELDAR (nobody here)
```

---

## Top Use Cases by Category (from 15 researchers)

### Tier 1: Highest Pain + Broadest Audience

| Use Case | Source | Pain Level | Existing Solutions |
|----------|--------|:---:|---|
| **Meal planning + grocery list** | fitness, parenting, forums | extreme | Partial (apps exist but don't close the loop) |
| **"What should I eat with what's in my fridge?"** | fitness | extreme | Partial (AI cooking apps emerging) |
| **Email triage + auto-reply drafts** | freelance, forums, social | extreme | Gmail filters (inadequate) |
| **Resume tailoring per job application** | jobs | extreme | Jobscan etc (too generic) |
| **Manual expense/receipt tracking** | finance | extreme | Banking apps (limited categories) |
| **Student deadline + grade notifications** | students | extreme | Canvas notifications (broken) |
| **School communication overload for parents** | parenting | high | Nothing exists |
| **Scattered health data across 5 apps** | fitness | high | Apple Health (partial) |

### Tier 2: High Pain + Specific Audience

| Use Case | Source | Audience |
|----------|--------|----------|
| **Invoice chasing / payment follow-up** | freelance | Freelancers |
| **Cross-platform social media posting** | social | Small business |
| **Apartment hunting alerts** | housing | Renters |
| **Price drop / restock alerts** | shopping | Consumers |
| **Application tracking (jobs)** | jobs | Job seekers |
| **Family calendar + activity logistics** | parenting | Parents |
| **Morning/bedtime routine management** | parenting | Parents |
| **Game backlog / collection tracking** | hobbies | Gamers |

### Tier 3: Interesting Niches

| Use Case | Source | Notes |
|----------|--------|-------|
| Ghost job detection | jobs | 27% of listings are ghost jobs, zero tools |
| Scope creep management | freelance | Zero existing solutions |
| Moving day automation | housing | 30-50 address changes per move |
| Couple expense splitting | finance | Beyond Splitwise |
| RSVP tracking for events | parenting | 4/24 response rate |

---

## Cross-Cutting Patterns

### 1. Manual tracking fatigue
**Appears in:** fitness, finance, hobbies, jobs, freelance, students
**Pattern:** People start tracking (calories, expenses, applications, collections), quit within 2 weeks because it takes >30 seconds/day.
**Meldar angle:** "You stop tracking. We keep watching."

### 2. Polling → Push
**Appears in:** students, housing, shopping, travel
**Pattern:** Manually refreshing websites for changes (grades posted, apartment listed, price dropped, seat opened).
**Meldar angle:** "Stop checking. We'll tell you."

### 3. Scattered data, no unified view
**Appears in:** fitness, finance, hobbies, parenting, freelance
**Pattern:** Important information spread across 5+ apps with no dashboard.
**Meldar angle:** "One place for everything that matters to you."

### 4. Decision fatigue before the task starts
**Appears in:** fitness (what to eat), jobs (what to apply to), social (what to post), parenting (what's for dinner)
**Pattern:** The hardest part isn't doing the thing — it's deciding what to do.
**Meldar angle:** "We decide. You approve."

### 5. "AI is too generic for MY life"
**Appears in:** Twitter research, forums
**Pattern:** People want AI for their specific situation, not a chatbot. Fastest-growing AI use case (17%→30% in one year).
**Meldar angle:** "Your app. Nobody else's."

---

## Recommended Landing Page Examples

Replace the current skill cards with these real-life examples that non-technical people immediately recognize:

### Hero rotating examples (for the "You say" card):
1. "I spend 2 hours every Monday copying data from emails into a spreadsheet"
2. "I check my university portal 10 times a day waiting for grades"
3. "I forget to follow up on invoices and lose thousands every year"
4. "I waste 30 minutes every evening deciding what to cook"
5. "I manually post the same thing to 4 different social media accounts"
6. "I check 3 apartment sites every morning hoping for new listings"

### Skill cards section — replace technical automations with:
1. **Meal planner** — "Tell it what you like and what's in your fridge. Get a week of meals and a grocery list."
2. **Grade checker** — "Get a text the moment your professor posts a grade. Stop refreshing."
3. **Price watcher** — "Pick any product. Get a message when the price drops or it's back in stock."
4. **Job tracker** — "Apply once, track everywhere. Get reminded to follow up at the right time."
5. **Expense sorter** — "Forward receipts. Everything gets categorized and totaled automatically."
6. **Social poster** — "Write once. It posts to Instagram, LinkedIn, X, and TikTok."

---

## For the Pitch Deck / Investors

**TAM framing:** The 15 researchers identified pain points across 13 life categories affecting virtually every adult with a smartphone. The common thread: repetitive tasks that apps partially solve but never close the loop.

**Why now:** AI can now build personal apps. But the tools that let you build (Lovable, Bolt) require you to know what to build. The tools that discover what to do (process mining) are enterprise-only. Meldar is the first to combine discovery + building for consumers.

**Defensibility:** The pattern library grows with every user. The more people use Meldar, the better it gets at suggesting what YOU should automate based on people like you.
