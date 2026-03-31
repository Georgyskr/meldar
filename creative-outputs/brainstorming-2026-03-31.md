# Brainstorm: Instant Data Sources for Meldar

**Date:** 2026-03-31
**Facilitator:** Carson (Brainstorming Coach)
**Techniques:** SCAMPER → Morphological Analysis → Grilling → Party Mode → Category Flip → Adaptive Form Design
**Topic:** What data can we get from users immediately (no heavy exports) to produce real results?

---

## Key Insight

Asking "what data exists on the phone" was the wrong question. The right question was: "what do people actually BUILD when they learn to code?" — then work backwards to find the data signals that predict each build type.

Three motivations drive 90% of vibe-coding:
1. "I track X manually and I'm sick of it" → dashboards, trackers
2. "I do X repetitively and it's boring" → automation, schedulers
3. "I pay for X and it's overkill" → SaaS replacements

---

## Confirmed Instant Data Sources (priority order)

| # | Source | Screenshot of | Time | What we learn | What it predicts |
|---|--------|--------------|------|---------------|-----------------|
| 1 | **Screen Time** (4 sections) | Settings → Screen Time | 30 sec | App usage, pickups, notifications, first-used-after-pickup | What eats their time → automation candidates |
| 2 | **App Store Subscriptions** | Settings → [name] → Subscriptions | 10 sec | What SaaS they pay for monthly | "Build your own X" → SaaS replacement recommendations |
| 3 | **Calendar week view** | Calendar app | 5 sec | Meeting density, free blocks, work-life split | Schedule/meeting tools, focus time recommendations |
| 4 | **Health app dashboard** | Apple Health / Google Fit main screen | 5 sec | Sleep, steps, activity — whether they track manually | Personal dashboard recommendations |
| 5 | **Bank transactions** (optional) | Banking app last 2 weeks | 10 sec | Spending patterns, delivery frequency, subscription leakage | Budget tools, meal planning, "stop paying for X" |

---

## Killed Ideas (with reasons)

| Idea | Why killed |
|------|-----------|
| Home screen screenshot | Screen Time already gives app list WITH usage data. Home screen adds position info nobody cares about. |
| Notification center screenshot | Screen Time section #4 already shows notification counts per app. Duplicate data. |
| Email inbox screenshot | Privacy risk (subject lines). Gmail metadata from Takeout is better when they upgrade. |
| Browser top sites | Thin signal. "You visit Reddit a lot" — so what? |
| Spotify Recently Played | Entertainment data. Doesn't lead to "what to build" for non-creators. |
| Alarm list | "You have snooze alarms" — trivial, no product signal. |
| Emojis | Zero analytical value. Fun garnish at best. |
| Free text "what bugs you" | Defeats the purpose. User doesn't know what they need — that's why they're here. |
| Most OAuth connections | Wrong audience (GitHub = already technical), shallow data (Google basic = email only), or entertainment noise (Spotify). |
| "Screenshot whatever's on your screen now" | Random, unstructured, can't reliably analyze. |

---

## The Adaptive Form: Haiku-Driven Follow-Up Questions

After collecting Screen Time, Haiku analyzes the app list in ~2 seconds and generates 2-3 PERSONALIZED follow-up requests. Nobody gets the same form.

### How it works

```
User uploads Screen Time → Haiku receives app list + occupation + age →
Haiku picks top 2-3 apps where additional data is valuable →
Haiku generates specific screenshot requests + targeted questions →
User sees: "Based on your screen time, we have a few more questions"
```

### App-to-Screenshot Mapping (for Haiku's context)

| App detected | Screenshot request | What we learn |
|---|---|---|
| Trading apps (Robinhood, eToro, Trading 212, Revolut Invest) | "Screenshot your watchlist or portfolio" | Investment interests, active trading patterns |
| Spotify / Apple Music | "Screenshot your Recently Played" | Podcast interests, study/focus music habits |
| Notion / Obsidian / Bear | "Screenshot your sidebar or home page" | How they organize knowledge, active projects |
| Food delivery (UberEats, Wolt, DoorDash, Bolt Food) | "Screenshot your recent orders" | Meal patterns, cooking vs ordering frequency |
| Fitness (Strava, Nike Run Club, Strong, Hevy) | "Screenshot your weekly summary" | Activity level, what they track, consistency |
| Shopping (Amazon, Temu, Shein) | "Screenshot your recent orders" | Spending habits, impulse patterns |
| Banking / Finance apps | "Screenshot last 2 weeks of transactions" | Full spending picture |
| Learning (Duolingo, Coursera, Udemy) | "Screenshot your current courses or streak" | What they're learning, commitment level |
| Reddit | "Screenshot your subreddit list or home feed" | Interest communities, problem domains |
| LinkedIn | "Screenshot your notifications tab" | Job hunting activity, networking intensity |

Haiku selects the top 2-3 based on: highest usage minutes + most signal we don't already have from Screen Time.

### Example adaptive flows

**Student, 22, uses TikTok 3h + Duolingo 30m + Notion 20m:**
→ "Screenshot your Notion sidebar" (what they organize)
→ "What language are you learning on Duolingo?" (commitment pattern)

**Freelancer, 27, uses Robinhood 45m + Gmail 1h + Slack 2h:**
→ "Screenshot your Robinhood watchlist" (trading interests)
→ "Screenshot your Slack workspace list" (how many teams/clients)

**Worker, 24, uses UberEats 15m + Instagram 2h + Spotify 1.5h:**
→ "Screenshot your recent UberEats orders" (food delivery dependency)
→ "How many times a week do you cook?" (confirms meal planning need)

---

## Revised Form Flow

```
Phase 1: Quick Profile
  ├─ Occupation (Student / Working / Freelance / Job hunting)
  ├─ Age bracket (16-20 / 21-25 / 26-30 / 30+)
  ├─ AI comfort (1-4)
  └─ AI tools used (checkboxes)

Phase 2: Instant Screenshots (free)
  ├─ FIXED: Screen Time (1-4 sections)
  ├─ FIXED: Subscriptions
  ├─ FIXED: Calendar
  ├─ FIXED: Health app dashboard
  │
  ├─ [Haiku analyzes screen time — 2 seconds]
  │
  ├─ ADAPTIVE: "We noticed you use [App]. Screenshot [specific screen]?" (2-3 requests)
  ├─ ADAPTIVE: "Quick question about [detected pattern]" (1-2 questions)
  │
  └─ [Generate Results]

Phase 3: Deep Analysis (EUR 9.99/mo subscription)
  ├─ ChatGPT export
  ├─ Claude export
  └─ Google Takeout

Phase 4: Results + Paywall
  ├─ FREE: 1 visible app recommendation + 4 learning modules
  ├─ EUR 9.99/mo: Full analysis + SOPs + 3 parsings/month
  ├─ EUR 29: Complete build roadmap
  └─ EUR 79: Handcrafted repo
```

---

## What Vibe-Coders Actually Build (research from public sources)

### Category 1: Personal dashboards & trackers
Weight loss trackers, habit trackers, finance dashboards, mood journals, reading lists, side project progress

### Category 2: Content & social media tools
Tweet schedulers, LinkedIn post generators, newsletter tools, blog CMS, social analytics, Reddit bots, bookmark managers

### Category 3: Workflow automation
Email triage, invoice generators, client CRM, meeting summarizers, resume tailoring, expense reports

### Category 4: Niche tools for their specific life
Meal planners, apartment hunters, price drop alerters, pet reminders, roommate expense splitters, class schedule optimizers, GPA calculators

### Category 5: "I'm tired of paying for this" replacements
Notion alternative, Calendly clone, link-in-bio page, landing page builder, Shopify replacement (Stripe + page), simple Canva alternative

### Category 6: AI wrappers & experiments
Custom ChatGPT with baked prompts, AI writing assistant for their voice, PDF/YouTube summarizers, code review bots, customer support chatbots

---

## Data Signal → Build Recommendation Mapping

| Data signal | Detected from | Recommended build |
|---|---|---|
| Food delivery app high usage + no cooking apps | Screen Time + adaptive question | Meal planning app |
| 3+ productivity apps in subscriptions | App Store Subscriptions | "Build your own simple [Notion/Todoist]" |
| Trading app installed + daily usage | Screen Time + watchlist screenshot | Custom stock dashboard with alerts |
| High email time + many notifications | Screen Time section 4 | Email triage automation |
| Fitness app with inconsistent usage | Health screenshot + Screen Time | Custom fitness tracker/accountability app |
| 20+ meetings/week in calendar | Calendar screenshot | Meeting summarizer |
| Learning app with broken streak | Adaptive screenshot | Study accountability tool |
| Instagram/TikTok 2h+ daily | Screen Time | Content scheduler (if creator) or usage limiter (if consumer) |
| Multiple subscriptions same category | Subscriptions screenshot | "Replace [X + Y] with one custom tool" |
| High pickup count + social first-used | Screen Time section 3 | Digital detox / notification manager |

---

## Reddit Thread Copy (Market Research)

### Thread 1: r/vibecoding or r/SideProject
> **What was the first thing you built when you started vibe-coding?**
>
> Researching what pushes non-developers to start building. Was it a specific pain point you couldn't solve with existing apps? Just curiosity? Something you saw someone else build?
>
> Interested in the messy honest answers, not the polished ones.

### Thread 2: r/wallstreetbets or r/stocks
> **If everyone's building personal finance dashboards with AI now, which SaaS companies should be worried?**
>
> Serious question. Robinhood charges for Gold. YNAB is $99/year. Mint got killed. Every vibe-coder I know built their own portfolio tracker or budget app as their first project. At what point does this actually dent revenue for these companies?

---

## Next Steps

1. **Implement adaptive Haiku follow-up** in the upload flow (new API endpoint that takes screen time data and returns personalized questions)
2. **Add Health app dashboard** as 4th fixed instant source
3. **Add age bracket** to Quick Profile
4. **Post Reddit threads** for market research
5. **Build the signal → recommendation mapping** into the Sonnet analysis prompt
6. **Create the app-to-screenshot mapping** as a server-side config for Haiku

---

## Decision Log

| Decision | Alternatives considered | Why this one |
|---|---|---|
| Kill home screen screenshot | Keep as data source | Screen Time already provides app list with actual usage hours. Home screen adds positions nobody cares about. |
| Kill notification center screenshot | Keep for interrupt analysis | Screen Time section 4 already shows notification counts per app. Duplicate. |
| Kill email inbox screenshot | Keep for email analysis | Privacy risk (subject lines visible). Gmail metadata from Google Takeout is better for paid tier. |
| Kill Spotify/entertainment screenshots | Keep for lifestyle analysis | Entertainment data doesn't predict "what to build" for non-creators. Noise. |
| Kill free text questions | Keep as intake method | Defeats product purpose. User doesn't know what they need — that's why they're here. |
| Keep bank transactions | Remove for privacy concerns | Spending patterns are the "money version" of Screen Time. Together they paint the full picture. Optional source reduces privacy pressure. |
| Add adaptive Haiku follow-up | Static form for everyone | Nobody gets the same form. Haiku picks the most valuable follow-ups per user. Feels personal, not bureaucratic. |
| Use app-to-screenshot mapping | Let Haiku freestyle | Structured mapping ensures consistent, testable recommendations. Haiku picks from the map, doesn't hallucinate requests. |
