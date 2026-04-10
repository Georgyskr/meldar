# Template Category Strategy

What Meldar can build well, what it must refuse, and how templates map
to the onboarding conversation.

## Viable categories

Each category below is broad enough that dozens of specific use cases
fit inside it. Meldar never names the specific use case as a template —
the onboarding conversation personalizes the plan to the user's
description. The category determines the **starter subtask tree** and
the **component types** Claude is encouraged to use.

### 1. Personal landing page / portfolio

**Shape:** 1-page static site, optional contact form, social links.
**Always needed:** hero section, about section, footer, responsive layout.
**Conditional:** project gallery, testimonials, contact form with email send.
**Component types:** `page`, `layout`, `form`.
**Why it works:** minimal state, no backend, Claude excels at layout + copy.
**Example user prompts:** "a page for my photography", "a resume
website", "a portfolio for my design work".

### 2. Link-in-bio / Linktree clone

**Shape:** single page, vertical stack of links, avatar, theme selector.
**Always needed:** link list, avatar + name header, add/edit link form.
**Conditional:** analytics (click counts via localStorage), theme picker,
social icons.
**Component types:** `page`, `data-input`, `layout`.
**Why it works:** tiny surface, huge demand, zero backend dependency.

### 3. Booking page (personal Calendly)

**Shape:** calendar view, time-slot picker, form submission.
**Always needed:** weekly calendar grid, time-slot buttons, booking
confirmation screen.
**Conditional:** timezone selector, email notification (Resend), Google
Calendar link generation.
**Component types:** `page`, `form`, `scheduler`, `notification`.
**Why it works:** well-bounded problem, Claude can generate a
full-featured booking form in ~5 subtasks. External integration
(Google Calendar API) is optional and can be a "Trick" the user
discovers later.
**Limitation:** no real-time availability check without a backend API.
The first version uses static time slots the user configures manually.

### 4. Dashboard with data entry + chart

**Shape:** form input → localStorage/state → chart visualization.
**Always needed:** data entry form, data display table/list, one chart
(line, bar, or pie).
**Conditional:** export to CSV, date range filter, summary stats cards.
**Component types:** `dashboard`, `form`, `chart`, `data-input`, `export`.
**Why it works:** covers weight tracking, habit tracking, budget
tracking, mood tracking, water intake — anything with one numeric
input and one trend line. The broadest category by use-case count.

### 5. Configurable automation frontend (form → webhook)

**Shape:** a form that collects user input and POSTs to an external
webhook URL (n8n, Zapier, Make.com, custom).
**Always needed:** form builder UI, submit button, success/error feedback.
**Conditional:** multi-step form, file upload field, conditional logic
(show/hide fields based on previous answers).
**Component types:** `form`, `data-input`, `api-connector`.
**Why it works:** the "backend" lives elsewhere; Meldar only builds
the frontend. Users who use n8n/Zapier get immediate value.
**Limitation:** Meldar doesn't build the automation itself — just the
form that triggers it. The onboarding conversation should clarify
this: "I'll make the form that sends data to your automation tool."

### 6. Feed / aggregator / reading list

**Shape:** a scrollable list of items, optionally fetched from an RSS
URL or manually entered.
**Always needed:** item card component, scrollable list, add-item form.
**Conditional:** RSS fetch (client-side via a CORS proxy), search/filter,
mark as read, categorize.
**Component types:** `page`, `search`, `filter`, `data-input`.
**Why it works:** list + card is the most common UI pattern in web
apps; Claude generates it cleanly.
**Limitation:** client-side RSS parsing is unreliable across feeds.
Manual entry is the safe default; RSS is a "Trick" upgrade.

## Categories to explicitly REFUSE

When the onboarding conversation detects one of these intents, Meldar
should respond honestly: "That's outside what I can build well right
now. Here's what I can do instead: [suggest closest viable category]."

### Games

**Why refuse:** state machines, physics engines, sprite rendering, game
loops, collision detection. Claude can generate a tic-tac-toe or a
simple quiz, but anything with real-time interaction, animation frames,
or multiplayer is beyond 15 subtasks. Users expect "a game" to mean
something playable and polished — the gap between expectation and
deliverable is too large.
**Suggest instead:** "I can make a quiz app or a scoreboard. Want to
try that?"

### Realtime multiplayer

**Why refuse:** WebSocket orchestration, session state, latency budgets,
conflict resolution. Requires infrastructure Meldar doesn't provide.
**Suggest instead:** "I can make a single-player version. Want to
start there?"

### Native mobile apps

**Why refuse:** Meldar ships web. React Native, Swift, Kotlin are out
of scope. PWA is possible but not a first-class path yet.
**Suggest instead:** "I make web apps that work great on your phone's
browser. Want to try that?"

### Payment flows (Stripe, PayPal, etc.)

**Why refuse:** PCI-DSS compliance, security liability, sandbox vs
production key management. A bad checkout page is worse than no
checkout page.
**Suggest instead:** "I can make a pricing page with a 'Buy' button
that links to your Stripe payment link. Want that?"

### Video streaming / media hosting

**Why refuse:** bandwidth costs, encoding pipelines, DRM, CDN config.
Way outside Vercel's static/SSR model.
**Suggest instead:** "I can embed YouTube or Vimeo videos on a page.
Want a video portfolio?"

### ML inference / GPU workloads

**Why refuse:** can't run on Vercel. No GPU, no model hosting.
**Suggest instead:** "I can build a UI that talks to an AI API you
already have. Want to connect to OpenAI or Claude?"

## How templates map to the onboarding conversation

The onboarding chat (Phase A, shipped) asks 3 questions: who / problem
/ first screen. Based on the user's answers, the `generate-plan`
endpoint produces a custom kanban plan.

When a user's description matches a known category, the generated plan
should bias toward that category's "always needed" subtasks and
component types. This is NOT a template lookup — it's a prompt-seeding
strategy. The `PLAN_GENERATION_SYSTEM_PROMPT` in
`packages/orchestrator/src/features/project-onboarding/lib/prompts.ts`
should include the 6 viable categories as context so Haiku can
recognize patterns and generate well-structured plans.

When a user's description matches a REFUSED category, the
`ask-question` endpoint should detect the keyword pattern and return a
redirect suggestion before the plan is generated. This detection can be
a simple keyword check on the first user message (e.g., "game",
"multiplayer", "mobile app", "payment", "video stream").

## Template chips in onboarding

The current onboarding chat shows 8 template chips. These should map
to the 6 viable categories:

| Chip label | Category |
|---|---|
| Gym tracker | Dashboard with data entry + chart |
| Habit tracker | Dashboard with data entry + chart |
| Weight log | Dashboard with data entry + chart |
| Meal planner | Dashboard with data entry + chart |
| Expense sorter | Dashboard with data entry + chart |
| Link-in-bio page | Link-in-bio / Linktree clone |
| Booking page | Booking page (personal Calendly) |
| Dashboard | Dashboard with data entry + chart |

Missing from chips but should be added:
- "Portfolio site" → Personal landing page / portfolio
- "Form for my clients" → Configurable automation frontend
- "Reading list" → Feed / aggregator

Chips to remove (too specific, collapses into Dashboard):
- "Meal planner" (→ Dashboard)
- "Weight log" (→ Dashboard)

Revised chip set (8 chips, balanced across categories):
`Gym tracker` · `Habit tracker` · `Expense sorter` ·
`Link-in-bio page` · `Booking page` · `Portfolio site` ·
`Client form` · `Reading list`
