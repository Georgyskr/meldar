# Market Research: App Store / Play Store Competitors

**Date:** 2026-03-30
**Focus:** Existing apps and platforms that overlap with Meldar's vision — personal AI automations for non-technical people.

---

## Executive Summary

The market splits into three categories: (1) **AI app builders** that let you create full apps from prompts, (2) **AI automation platforms** that connect tools and run workflows, and (3) **AI personal assistants** that execute tasks on your behalf. **None of them combine a discovery layer ("here's what you could automate in YOUR life") with guided, no-code setup for non-technical individuals.** Every competitor assumes the user already knows what they want to build or automate.

---

## Category 1: AI App Builders (Prompt-to-App)

These platforms turn natural-language prompts into working web/mobile apps. They target founders, makers, and increasingly non-technical users — but require the user to arrive with an idea.

### Lovable
- **What it does:** Generates production-ready TypeScript/React apps from plain English. Full-stack: frontend, backend (Supabase), auth, deployment.
- **Target:** Non-technical founders building MVPs.
- **Onboarding:** Templates, remixing, visual editing. You describe what you want; Lovable scaffolds the missing pieces.
- **Discovery layer?** No. Templates exist, but no personalized suggestions. You must arrive with an idea.
- **Pricing:** From $25/mo.
- **Gap vs Meldar:** Lovable builds apps, not personal automations. No life-context awareness. No "here's what you should build."

### Bolt.new
- **What it does:** Generates full-stack apps (React + Node.js) from a single prompt in the browser.
- **Target:** Technical founders who want speed with full code control.
- **Discovery layer?** No. Blank prompt. You need to know what you want.
- **Gap vs Meldar:** Developer-oriented. No guidance for non-technical users. Builds apps, not automations.

### Replit Agent
- **What it does:** Full-stack platform. Built-in database, auth, hosting, 30+ integrations (Stripe, Figma, Notion). Agent works autonomously up to 200 minutes.
- **Target:** Developers and increasingly non-technical users.
- **Onboarding:** Project type selection (web app, mobile, data viz). Agent figures out the right setup automatically.
- **Discovery layer?** Minimal. You can select a project type, but no personalized suggestions.
- **Pricing:** Free tier; paid from $25/mo.
- **Gap vs Meldar:** Still assumes you know what to build. No life-context discovery.

### v0 by Vercel
- **What it does:** AI-powered frontend component generation. Excellent for UI within the Vercel/Next.js ecosystem.
- **Target:** Developers building frontends.
- **Discovery layer?** No. Component-focused, no app-level guidance.
- **Gap vs Meldar:** Frontend-only. No backend, no automation, no non-technical onboarding.

### Create.xyz (now "Anything")
- **What it does:** Turns English prompts into React web apps and Expo mobile apps. Multi-screen flows.
- **Target:** Solo creators and rapid prototypers.
- **Discovery layer?** No. Conversational prompt interface, but you must describe what you want.
- **Limitations:** Primarily frontend/layout. Backend and API logic requires "logic thinking."
- **Gap vs Meldar:** Quick prototyping tool, not a personal automation platform. No discovery.

### Adalo
- **What it does:** Visual no-code builder producing true native iOS/Android apps. AI builder added in 3.0.
- **Target:** Non-developers. Ranked #1 among visual builders for non-developers.
- **Onboarding:** Industry-specific templates, drag-and-drop.
- **Discovery layer?** Templates by category (restaurants, fitness, etc.), but no personalized suggestions.
- **Pricing:** Free plan; $36/mo for app store publishing.
- **Gap vs Meldar:** Builds apps, not personal automations. No life-context awareness.

### Other Notable Builders
| Platform | Key Differentiator | Discovery Layer? |
|---|---|---|
| **Base44** (acquired by Wix) | Prompt-first, instantly live apps | No |
| **Bubble** | Web + native mobile from one backend | No |
| **Appy Pie** | Industry templates, publish to both stores | No (template gallery) |
| **Figma Make** | Design-to-app, no code | No |
| **CatDoes** | Multi-agent system, single prompt to app stores | No |
| **Newly (natively.dev)** | AI agent builds native iOS/Android with Expo | No |
| **Hostinger Horizons** | All-in-one with hosting, SSL, domain | No |
| **Durable AI** | Custom software generation without code | No |

---

## Category 2: AI Automation Platforms (Workflow Automation)

These connect apps together and run automated workflows. They assume you know WHAT to connect and WHY.

### Zapier
- **What it does:** 5,000+ app integrations. If-this-then-that with AI enhancements.
- **Target:** Business users, small teams.
- **Discovery layer?** Template gallery by category. AI suggests Zaps based on connected apps — but you must connect apps first.
- **Pricing:** Free plan; paid from $29.99/mo.
- **Gap vs Meldar:** Business-focused. No personal life automation. No proactive "you should automate this."

### Make (Integromat)
- **What it does:** Visual workflow automation. More complex logic than Zapier.
- **Target:** Technical teams, power users.
- **Discovery layer?** No. Visual builder assumes you know what to build.
- **Gap vs Meldar:** Too technical for non-technical users. Business workflows, not personal.

### n8n
- **What it does:** Open-source workflow automation. Self-hostable.
- **Target:** Developers and technical teams.
- **Discovery layer?** No.
- **Gap vs Meldar:** Developer tool. Not for non-technical personal use.

### Bardeen (Closest to a "Discovery Layer")
- **What it does:** Browser extension that watches what you do and proactively suggests automations. Uses AI to analyze open tabs and connected apps.
- **Target:** Knowledge workers doing repetitive browser tasks.
- **Discovery layer?** **YES — partial.** When you manually do something automatable, Bardeen pops up with a relevant automation. Context-aware suggestions based on the page you're viewing.
- **Pricing:** Free plan with unlimited basic automations; paid plans available.
- **Gap vs Meldar:** Browser/work focused, not personal life. Reactive (waits for you to be in-browser), not proactive about life patterns. No mobile app. No "tell me about your life" onboarding.

### Lindy AI
- **What it does:** "Digital employees" — AI agents for email triage, CRM prep, document extraction, follow-ups. No-code Flow Editor.
- **Target:** Teams automating knowledge work.
- **Discovery layer?** No. You build agents for specific tasks.
- **Pricing:** Free (400 credits/mo); paid from $19.99/mo.
- **Gap vs Meldar:** Business-focused agents. No personal life automation. No discovery.

### Notion AI Agents (Notion 3.0+)
- **What it does:** Autonomous agents that work within Notion — build project plans, compile feedback, draft reports, update databases. Custom Agents run 24/7 on triggers/schedules.
- **Target:** Notion users (personal and business).
- **Discovery layer?** No. You configure agents manually. But Notion's ecosystem makes it easy to start.
- **Pricing:** Free for personal use. Custom Agents free through May 2026, then credits-based.
- **Gap vs Meldar:** Locked to Notion ecosystem. No cross-app personal automation. No "what should I automate?" guidance.

### Apple Shortcuts + AI
- **What it does:** On-device personal automations triggered by time, location, app. Now includes AI actions (summarize, proofread, generate) via on-device models, server models, or ChatGPT.
- **Target:** iPhone/iPad users.
- **Discovery layer?** **Minimal.** Gallery of community-shared shortcuts. No personalized suggestions.
- **Limitation:** Creating shortcuts from scratch is "nerve-wracking" and "confusing" for beginners.
- **Gap vs Meldar:** The closest native competitor for personal automation, but building is still hard for non-technical users. No guided discovery. No AI that figures out what YOU need.

---

## Category 3: AI Personal Assistants

These do tasks for you, but don't let you BUILD custom automations.

### Sintra AI
- **What it does:** 12 specialized "AI Helpers" (copywriter, sales manager, support, etc.) that handle business tasks.
- **Target:** Solopreneurs and small teams.
- **Discovery layer?** Role-based helpers are pre-defined, so you pick from a menu. But no personal life helpers.
- **Pricing:** $39/mo (one helper); $97/mo (all).
- **Gap vs Meldar:** Business-only. No personal automation. No custom agent creation. No discovery of personal needs.

### General AI Assistants (ChatGPT, Claude, Gemini)
- **What they do:** Answer questions, draft content, analyze data. Increasingly can take actions (browse, code, use tools).
- **Discovery layer?** No. Conversational, but you must ask for what you want.
- **Gap vs Meldar:** General-purpose. No persistent personal automations. No "set it and forget it" workflows. No guided setup for personal use cases.

### Motion, Reclaim, Morgen (AI Scheduling)
- **What they do:** AI-powered calendar management, task scheduling, meeting optimization.
- **Discovery layer?** Auto-scheduling is somewhat proactive, but narrowly focused on time management.
- **Gap vs Meldar:** Single-purpose (calendar). No broader personal automation.

---

## The Discovery Gap: Key Finding

| Aspect | Existing Market | Meldar Opportunity |
|---|---|---|
| **Starting point** | "What do you want to build/automate?" | "Tell me about your life/routines" |
| **Onboarding** | Blank prompt or template gallery | Guided interview discovering personal pain points |
| **Suggestions** | Generic templates by category | Personalized: "Based on your morning routine, you could..." |
| **User knowledge required** | Must know what's possible | System reveals what's possible |
| **Target** | Founders, developers, business users | Anyone with a smartphone |
| **Scope** | Work/business workflows | Personal life (health, finance, habits, family, home) |
| **Setup** | User configures connections, logic, triggers | AI handles setup from conversational input |

**Bardeen is the only competitor with any form of proactive discovery**, but it is:
- Browser-only (no mobile)
- Work/productivity focused (not personal life)
- Reactive (suggests when you're already doing the task), not proactive about life patterns
- No conversational onboarding or life-context interview

---

## Competitive Landscape Map

```
                    DISCOVERY (AI suggests what to automate)
                              ^
                              |
                       Bardeen (partial)
                              |
                    MELDAR OPPORTUNITY
                              |
          Apple Shortcuts     |
          (gallery only)      |
                              |
    ------+-------------------+-------------------+-------> TECHNICAL SOPHISTICATION
          |                   |                   |
     Non-technical        Semi-technical       Developer
          |                   |                   |
      Adalo, Appy Pie    Zapier, Make        Bolt, Replit, n8n
      Sintra, Lovable     Lindy, Notion      v0, Create.xyz
                              |
                              |
                     NO DISCOVERY
                   (user must know what to build)
```

---

## Pricing Benchmarks

| Platform | Free Tier | Entry Paid | Notes |
|---|---|---|---|
| Zapier | Yes | $29.99/mo | Per-task pricing |
| Lindy | 400 credits/mo | $19.99/mo | Credit-based |
| Bardeen | Unlimited basic | Paid available | Browser extension |
| Lovable | Limited | $25/mo | App builder |
| Replit | Yes | $25/mo | Full IDE |
| Adalo | Yes | $36/mo | Native mobile |
| Sintra | No | $39/mo | AI helpers |
| Notion | Personal free | $12/mo (Plus) | Custom agents extra |

---

## Key Takeaways for Meldar

1. **The discovery layer is the moat.** No competitor asks "what's your life like?" and then suggests what to automate. Every single tool starts with a blank prompt or template gallery.

2. **Personal life is unserved.** The entire market optimizes for business/work automation. Personal life automation (morning routines, health tracking, family coordination, household management, financial habits) is a white space.

3. **Non-technical users are underserved even in "no-code."** Lovable and Adalo are the friendliest, but they still require the user to articulate an app idea. For someone who doesn't know what's possible, the blank prompt is a wall.

4. **Mobile-first is rare.** Most competitors are web-first. Adalo, Appy Pie, and CatDoes produce mobile apps, but they're app BUILDERS, not personal automation tools.

5. **Guided onboarding is the entry point.** The market validates that short, conversational onboarding (3-5 questions) works for AI tools. Meldar should do this for personal life context, not app-building context.

6. **Bardeen's proactive suggestions prove the concept.** Users love being told "you could automate this." Meldar should apply the same principle to personal life, not just browser tabs.

7. **Pricing opportunity at $10-20/mo.** Below Zapier/Lindy/Sintra for personal use. Above free tiers that limit features.
