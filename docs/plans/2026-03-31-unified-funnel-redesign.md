# Unified Funnel Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the scattered quiz/xray/discover flows with one unified funnel that collects real user data (AI chat exports, Google Takeout, screen time), cross-references it via Claude AI, and delivers a personalized "starter pack" of learning content — with the full analysis + curriculum paywalled at EUR 29 and a handcrafted build package at EUR 79.

**Architecture:** Single-page progressive form at `/start` with 3 phases: Quick Profile (quiz warmup, 2 min) → Data Uploads (Google Takeout, ChatGPT/Claude exports, screen time — each optional, more = better) → AI Analysis + Results (free preview of 4 learning modules + 1 app recommendation, paywall for full access). Server-side processing via Claude API. All uploads processed and deleted. Results stored in DB for paywall unlock via Stripe.

**Tech Stack:** Next.js 16 (App Router, RSC), Panda CSS + Park UI, Drizzle ORM + Neon Postgres, Claude API (Haiku for extraction, Sonnet for cross-analysis), Stripe Checkout, Resend (email), Zod (validation), nanoid (IDs).

---

## Architecture Overview

```
/start (new unified page)
  Phase 1: Quick Profile (replaces /quiz)
    - 3-4 questions, 2 at a time
    - "What do you want to fix?" (pick tiles)
    - "How comfortable are you with AI tools?" (1-4 scale)
    - "What AI do you already use?" (checkboxes: ChatGPT, Claude, none, etc.)

  Phase 2: Data Uploads (replaces /xray upload)
    - Card per data source, each optional
    - Screen Time screenshot (existing, Claude Vision)
    - ChatGPT export (ZIP → conversations.json)
    - Claude export (JSON)
    - Google Takeout (ZIP → search history, YouTube, Gmail metadata)
    - Progress: "3 of 4 sources connected — the more you add, the sharper your results"
    - Each upload processed independently, results accumulate

  Phase 3: Analysis + Results (replaces /xray results)
    - AI cross-references all uploaded data
    - FREE: 4 learning module thumbnails + 1 specific app recommendation
    - PAYWALLED (EUR 29): Full analysis report + all learning content + personalized curriculum
    - PREMIUM (EUR 79, ~~149~~): Handcrafted repo + Claude Code setup + cover letter

/start/[id] (shareable results, replaces /xray/[id])
  - Shows free preview, CTA to create your own
```

### Database Changes

```
New table: discovery_sessions
  id: text (nanoid 16, PK)
  user_id: uuid (FK → users, nullable)
  email: text (nullable, captured at paywall)

  -- Phase 1 data
  quiz_picks: text[] (pain point IDs)
  ai_comfort: integer (1-4)
  ai_tools_used: text[] (chatgpt, claude, deepseek, none)

  -- Phase 2 data (processed extractions, not raw files)
  screen_time_data: jsonb (existing ScreenTimeExtraction shape)
  chatgpt_data: jsonb (topics, patterns, repeated questions)
  claude_data: jsonb (same shape as chatgpt)
  google_data: jsonb (search patterns, youtube habits, email volume)
  sources_provided: text[] (which uploads were done)

  -- Phase 3 data (AI analysis output)
  analysis: jsonb (cross-referenced insights, app recommendation, learning path)
  recommended_app: text (the one app we recommend building)
  learning_modules: jsonb (4 module slots with titles, descriptions, locked/unlocked)

  -- Conversion
  tier_purchased: text (null, 'base', 'build')
  stripe_session_id: text
  paid_at: timestamp

  created_at: timestamp
  updated_at: timestamp
```

---

## Task 1: Create the discovery_sessions table + migration

**Files:**
- Modify: `src/server/db/schema.ts` — add `discoverySessions` table
- Create: `src/server/db/migrations/XXXX_add_discovery_sessions.sql` (via drizzle-kit)

**Step 1: Add table schema**

Add to `src/server/db/schema.ts`:

```typescript
export const discoverySessions = pgTable(
  'discovery_sessions',
  {
    id: text('id').primaryKey(), // nanoid(16)
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    email: text('email'),

    // Phase 1
    quizPicks: text('quiz_picks').array(),
    aiComfort: integer('ai_comfort'), // 1-4
    aiToolsUsed: text('ai_tools_used').array(),

    // Phase 2 (processed extractions)
    screenTimeData: jsonb('screen_time_data'),
    chatgptData: jsonb('chatgpt_data'),
    claudeData: jsonb('claude_data'),
    googleData: jsonb('google_data'),
    sourcesProvided: text('sources_provided').array().notNull().default([]),

    // Phase 3 (AI output)
    analysis: jsonb('analysis'),
    recommendedApp: text('recommended_app'),
    learningModules: jsonb('learning_modules'),

    // Conversion
    tierPurchased: text('tier_purchased'), // null | 'base' | 'build'
    stripeSessionId: text('stripe_session_id'),
    paidAt: timestamp('paid_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  () => [],
)
```

**Step 2: Generate and run migration**

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit push
```

**Step 3: Commit**

```bash
git add src/server/db/schema.ts src/server/db/migrations/
git commit -m "feat: add discovery_sessions table for unified funnel"
```

---

## Task 2: Build data parsers for each export format

**Files:**
- Create: `src/server/discovery/parsers/chatgpt.ts`
- Create: `src/server/discovery/parsers/claude-export.ts`
- Create: `src/server/discovery/parsers/google-takeout.ts`
- Create: `src/server/discovery/parsers/index.ts`
- Create: `src/server/discovery/parsers/types.ts`

### Types (`types.ts`)

```typescript
import { z } from 'zod'

// Unified shape for parsed AI chat data
export const aiChatPatternSchema = z.object({
  totalConversations: z.number(),
  topTopics: z.array(z.object({
    topic: z.string(),
    count: z.number(),
    examples: z.array(z.string()), // first message snippets
  })),
  repeatedQuestions: z.array(z.object({
    pattern: z.string(), // "meal planning", "email templates", etc.
    frequency: z.number(),
    lastAsked: z.string().nullable(),
  })),
  timePatterns: z.object({
    mostActiveHour: z.number(), // 0-23
    weekdayVsWeekend: z.enum(['weekday_heavy', 'weekend_heavy', 'balanced']),
  }),
  platform: z.enum(['chatgpt', 'claude', 'deepseek']),
})

export type AiChatPattern = z.infer<typeof aiChatPatternSchema>

// Google Takeout parsed data
export const googlePatternSchema = z.object({
  searchTopics: z.array(z.object({
    topic: z.string(),
    queryCount: z.number(),
    examples: z.array(z.string()),
  })),
  youtubeTopCategories: z.array(z.object({
    category: z.string(),
    watchCount: z.number(),
    totalMinutes: z.number(),
  })).nullable(),
  emailVolume: z.object({
    dailyAverage: z.number(),
    topSenders: z.array(z.string()),
  }).nullable(),
})

export type GooglePattern = z.infer<typeof googlePatternSchema>
```

### ChatGPT parser (`chatgpt.ts`)

The ChatGPT export ZIP contains `conversations.json` — an array of conversation objects. Each has a `mapping` field with message nodes.

```typescript
import { type AiChatPattern } from './types'

export async function parseChatGptExport(file: File): Promise<AiChatPattern> {
  const zip = await import('jszip').then((m) => m.default)
  const archive = await zip.loadAsync(await file.arrayBuffer())

  const convFile = archive.file('conversations.json')
  if (!convFile) throw new Error('No conversations.json found in export')

  const raw = JSON.parse(await convFile.async('string'))

  // Extract user messages from conversation tree
  const userMessages: { text: string; timestamp: number }[] = []

  for (const conv of raw) {
    if (!conv.mapping) continue
    for (const node of Object.values(conv.mapping) as any[]) {
      const msg = node?.message
      if (msg?.author?.role === 'user' && msg?.content?.parts?.[0]) {
        userMessages.push({
          text: String(msg.content.parts[0]).slice(0, 200), // truncate
          timestamp: msg.create_time || 0,
        })
      }
    }
  }

  // Send to Claude for topic extraction (cheaper than parsing ourselves)
  // This happens in the API route, not here — parser just extracts raw messages
  return {
    totalConversations: raw.length,
    topTopics: [], // filled by AI analysis step
    repeatedQuestions: [], // filled by AI analysis step
    timePatterns: extractTimePatterns(userMessages),
    platform: 'chatgpt',
    _rawMessages: userMessages.slice(0, 500), // cap for API context
  } as AiChatPattern & { _rawMessages: typeof userMessages }
}

function extractTimePatterns(messages: { timestamp: number }[]) {
  const hours = messages.map((m) => new Date(m.timestamp * 1000).getHours())
  const hourCounts = new Map<number, number>()
  for (const h of hours) hourCounts.set(h, (hourCounts.get(h) || 0) + 1)
  const mostActiveHour = [...hourCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 12

  const weekdays = messages.filter((m) => {
    const day = new Date(m.timestamp * 1000).getDay()
    return day > 0 && day < 6
  }).length
  const ratio = messages.length > 0 ? weekdays / messages.length : 0.5

  return {
    mostActiveHour,
    weekdayVsWeekend: ratio > 0.7 ? 'weekday_heavy' as const :
      ratio < 0.3 ? 'weekend_heavy' as const : 'balanced' as const,
  }
}
```

### Google Takeout parser (`google-takeout.ts`)

Google Takeout exports a ZIP with folders per service. Search history is at `Takeout/My Activity/Search/MyActivity.json`.

```typescript
import type { GooglePattern } from './types'

export async function parseGoogleTakeout(file: File): Promise<GooglePattern & { _rawSearches: string[] }> {
  const zip = await import('jszip').then((m) => m.default)
  const archive = await zip.loadAsync(await file.arrayBuffer())

  const searches: string[] = []
  const youtubeWatches: string[] = []

  // Find search history (path varies by locale)
  for (const [path, entry] of Object.entries(archive.files)) {
    if (path.includes('My Activity') && path.includes('Search') && path.endsWith('.json')) {
      const raw = JSON.parse(await entry.async('string'))
      for (const item of Array.isArray(raw) ? raw : []) {
        if (item.title?.startsWith('Searched for ')) {
          searches.push(item.title.replace('Searched for ', '').slice(0, 100))
        }
      }
    }
    if (path.includes('My Activity') && path.includes('YouTube') && path.endsWith('.json')) {
      const raw = JSON.parse(await entry.async('string'))
      for (const item of Array.isArray(raw) ? raw : []) {
        if (item.title?.startsWith('Watched ')) {
          youtubeWatches.push(item.title.replace('Watched ', '').slice(0, 100))
        }
      }
    }
  }

  return {
    searchTopics: [], // filled by AI analysis
    youtubeTopCategories: null, // filled by AI analysis
    emailVolume: null, // future: parse MBOX
    _rawSearches: searches.slice(0, 500),
  }
}
```

### Claude export parser (`claude-export.ts`)

Claude exports are JSON with conversation arrays.

```typescript
import type { AiChatPattern } from './types'

export async function parseClaudeExport(file: File): Promise<AiChatPattern & { _rawMessages: { text: string; timestamp: number }[] }> {
  const text = await file.text()
  const raw = JSON.parse(text)

  const userMessages: { text: string; timestamp: number }[] = []

  // Claude export structure: array of conversations with chat_messages
  const conversations = Array.isArray(raw) ? raw : raw.conversations || []

  for (const conv of conversations) {
    const messages = conv.chat_messages || conv.messages || []
    for (const msg of messages) {
      if (msg.sender === 'human' || msg.role === 'user') {
        userMessages.push({
          text: String(msg.text || msg.content || '').slice(0, 200),
          timestamp: msg.created_at ? new Date(msg.created_at).getTime() / 1000 : 0,
        })
      }
    }
  }

  return {
    totalConversations: conversations.length,
    topTopics: [],
    repeatedQuestions: [],
    timePatterns: { mostActiveHour: 12, weekdayVsWeekend: 'balanced' },
    platform: 'claude',
    _rawMessages: userMessages.slice(0, 500),
  }
}
```

**Step: Install jszip**

```bash
pnpm add jszip
```

**Step: Commit**

```bash
git add src/server/discovery/parsers/
git commit -m "feat: add export parsers for ChatGPT, Claude, Google Takeout"
```

---

## Task 3: Build the cross-reference AI analysis engine

**Files:**
- Create: `src/server/discovery/analyze.ts`
- Create: `src/server/discovery/prompts.ts` (update existing)

This is the core. Takes all parsed data sources and produces a unified analysis via Claude Sonnet.

### Analysis engine (`analyze.ts`)

```typescript
import Anthropic from '@anthropic-ai/sdk'
import type { ScreenTimeExtraction } from '@/entities/xray-result/model/types'
import type { AiChatPattern, GooglePattern } from './parsers/types'

type AnalysisInput = {
  quizPicks: string[]
  aiComfort: number
  aiToolsUsed: string[]
  screenTime?: ScreenTimeExtraction
  chatgptData?: AiChatPattern & { _rawMessages: { text: string }[] }
  claudeData?: AiChatPattern & { _rawMessages: { text: string }[] }
  googleData?: GooglePattern & { _rawSearches: string[] }
}

type AnalysisOutput = {
  recommendedApp: {
    name: string
    description: string
    whyThisUser: string // personalized reason
    complexity: 'beginner' | 'intermediate'
    estimatedBuildTime: string // "1 day", "2 hours"
  }
  additionalApps: Array<{
    name: string
    description: string
    whyThisUser: string
  }>
  learningModules: Array<{
    id: string
    title: string
    description: string
    locked: boolean // first 4 unlocked, rest locked
  }>
  keyInsights: Array<{
    headline: string
    detail: string
    source: string // which data source this came from
  }>
  dataProfile: {
    totalSourcesAnalyzed: number
    topProblemAreas: string[]
    aiUsageLevel: string
  }
}

export async function runCrossAnalysis(input: AnalysisInput): Promise<AnalysisOutput> {
  const client = new Anthropic()

  const dataContext = buildDataContext(input)

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 4000,
    system: ANALYSIS_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: dataContext }],
    tools: [ANALYSIS_TOOL],
  })

  const toolUse = response.content.find((c) => c.type === 'tool_use')
  if (!toolUse || toolUse.name !== 'generate_analysis') {
    throw new Error('Analysis failed: no tool response')
  }

  return toolUse.input as AnalysisOutput
}
```

The system prompt and tool definition are the key pieces. The prompt should:
1. Cross-reference AI chat history (what they keep asking about) with screen time (what apps eat their time) with Google searches (what they're researching)
2. Identify the #1 thing they should build
3. Generate a personalized learning path
4. Always include the 4 base modules: (1) Coding in 2026 intro, (2) Prompting rules, (3) Claude Code advanced, (4) Your perfect app setup

**Step: Commit**

```bash
git add src/server/discovery/analyze.ts
git commit -m "feat: add cross-reference AI analysis engine"
```

---

## Task 4: Build the unified /start page — Phase 1 (Quick Profile)

**Files:**
- Create: `src/app/start/page.tsx`
- Create: `src/app/start/start-client.tsx`
- Create: `src/features/discovery-flow/ui/QuickProfile.tsx`
- Create: `src/features/discovery-flow/ui/AiComfortScale.tsx`
- Create: `src/features/discovery-flow/ui/AiToolsPicker.tsx`
- Create: `src/features/discovery-flow/index.ts`

### Quick Profile (`QuickProfile.tsx`)

Three sub-steps shown 2 at a time:
1. Pick pain tiles (reuse existing pain library, but show 6 max, not 12)
2. AI comfort level (4-point scale: "Never touched it" → "Use it daily")
3. Which AI tools do you use? (checkboxes: ChatGPT, Claude, Gemini, DeepSeek, None)

Design: Card-based, each step slides in. No progress bar (per CLAUDE.md — creates anxiety). Subtle dot indicators.

### Start Client (`start-client.tsx`)

State machine with 3 phases:
```typescript
type Phase = 'profile' | 'data' | 'results'
```

Phase transitions are animated (meldarFadeSlideUp). Each phase's data accumulates into a `session` state object that gets posted to the API.

**Step: Commit after Phase 1 UI is working**

---

## Task 5: Build the unified /start page — Phase 2 (Data Uploads)

**Files:**
- Create: `src/features/discovery-flow/ui/DataUploadHub.tsx`
- Create: `src/features/discovery-flow/ui/UploadCard.tsx`
- Reuse: `src/features/screenshot-upload/ui/UploadZone.tsx` (for screen time)

### Data Upload Hub (`DataUploadHub.tsx`)

Shows 4 upload cards in a 2x2 grid (mobile: stacked):

1. **Screen Time** (existing) — "Screenshot your settings" — 30 sec
2. **ChatGPT History** — "Export from Settings → Data controls → Export" — 2 min
3. **Claude History** — "Export from Settings → Export data" — 2 min
4. **Google Takeout** — "Download from takeout.google.com" — 5 min

Each card:
- Platform icon + name
- One-line description
- Time estimate
- Status: "Not added" → "Uploading..." → "✓ Analyzed" with source count
- Expandable instructions (like the UploadZone collapsible guide)
- File input (accept appropriate types)

Top of section:
```
"The more you add, the sharper your results"
[===] 2 of 4 sources added
```

Bottom:
```
[Generate my results] (enabled when >= 1 source uploaded)
"Skip → just use my quiz answers" (fallback, disabled aesthetic)
```

### Upload Card (`UploadCard.tsx`)

Reusable card component:
```typescript
type UploadCardProps = {
  platform: 'screentime' | 'chatgpt' | 'claude' | 'google'
  title: string
  description: string
  timeEstimate: string
  accept: string // file input accept
  icon: LucideIcon
  status: 'idle' | 'uploading' | 'processing' | 'done' | 'error'
  onFile: (file: File) => void
  instructions: ReactNode // collapsible
}
```

**Step: Commit after Phase 2 UI is working**

---

## Task 6: Build the upload processing API

**Files:**
- Create: `src/app/api/discovery/upload/route.ts`
- Create: `src/app/api/discovery/analyze/route.ts`

### Upload endpoint (`/api/discovery/upload`)

Handles individual file uploads. Each source type processed differently:

```typescript
// POST /api/discovery/upload
// Body: FormData with { file, platform, sessionId }
// Returns: { success: true, platform, extractedData }

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File
  const platform = formData.get('platform') as string
  const sessionId = formData.get('sessionId') as string

  // Validate
  if (!file || !platform || !sessionId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Route to correct parser
  let extractedData: unknown
  switch (platform) {
    case 'screentime':
      extractedData = await processScreenTime(file) // existing Claude Vision flow
      break
    case 'chatgpt':
      extractedData = await parseChatGptExport(file)
      break
    case 'claude':
      extractedData = await parseClaudeExport(file)
      break
    case 'google':
      extractedData = await parseGoogleTakeout(file)
      break
    default:
      return NextResponse.json({ error: 'Unknown platform' }, { status: 400 })
  }

  // Update session in DB
  await updateSessionData(sessionId, platform, extractedData)

  return NextResponse.json({ success: true, platform })
}
```

### Analysis endpoint (`/api/discovery/analyze`)

Triggers the cross-reference analysis once user clicks "Generate my results":

```typescript
// POST /api/discovery/analyze
// Body: { sessionId }
// Returns: { success: true, analysis, sessionId }

export async function POST(request: NextRequest) {
  const { sessionId } = await request.json()

  // Load session with all data
  const session = await getSession(sessionId)
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  // Run cross-analysis
  const analysis = await runCrossAnalysis({
    quizPicks: session.quizPicks || [],
    aiComfort: session.aiComfort || 1,
    aiToolsUsed: session.aiToolsUsed || [],
    screenTime: session.screenTimeData,
    chatgptData: session.chatgptData,
    claudeData: session.claudeData,
    googleData: session.googleData,
  })

  // Save analysis to session
  await saveAnalysis(sessionId, analysis)

  return NextResponse.json({ success: true, analysis, sessionId })
}
```

**Step: Commit**

---

## Task 7: Build the unified /start page — Phase 3 (Results + Paywall)

**Files:**
- Create: `src/features/discovery-flow/ui/AnalysisResults.tsx`
- Create: `src/features/discovery-flow/ui/LearningModuleCard.tsx`
- Create: `src/features/discovery-flow/ui/AppRecommendation.tsx`
- Create: `src/features/discovery-flow/ui/PaywallSection.tsx`

### Results page layout

```
┌─────────────────────────────────────────────────┐
│ "We analyzed [N] sources. Here's what we found."│
│                                                 │
│ YOUR #1 APP TO BUILD:                           │
│ ┌─────────────────────────────────────────────┐ │
│ │ [App Name]                                  │ │
│ │ [Description]                               │ │
│ │ "We recommend this because [personalized]"  │ │
│ │ Complexity: Beginner · Build time: ~1 day   │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ YOUR LEARNING PATH:                             │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────┐│
│ │ Coding   │ │ Prompt   │ │ Claude   │ │Your ││
│ │ in 2026  │ │ Rules    │ │ Code     │ │Setup││
│ │ FREE     │ │ FREE     │ │ FREE     │ │FREE ││
│ └──────────┘ └──────────┘ └──────────┘ └─────┘│
│                                                 │
│ ─── PAYWALL ──────────────────────────────────  │
│                                                 │
│ + 3 more apps we'd recommend                   │
│ + Full analysis of your data                    │
│ + Complete learning curriculum                  │
│ + Personalized build roadmap                    │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ UNLOCK EVERYTHING — EUR 29                  │ │
│ │ Full access to your analysis + all SOPs     │ │
│ │ + tutorials + personalized curriculum       │ │
│ │                                             │ │
│ │ [Unlock my full results]                    │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ I DON'T WANT TO LEARN. BUILD IT FOR ME.    │ │
│ │ ~~EUR 149~~ EUR 79 (first 500 users)       │ │
│ │                                             │ │
│ │ Handcrafted GitHub repo + Claude Code setup │ │
│ │ + cover letter + agent config.              │ │
│ │ You take it, you own it, you run it.        │ │
│ │                                             │ │
│ │ [Get it built]                              │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ [Share my results]  [Save as image]             │
└─────────────────────────────────────────────────┘
```

### Key design decisions:

1. **4 learning modules shown FREE** — the thumbnails are visible, titles are visible, but content is placeholder until real SOPs exist. This is the hook.
2. **App recommendation is the star** — personalized, specific, with a "why you" explanation.
3. **Paywall is NOT a hard wall** — user can see what's behind it (blurred cards, locked icons). They know what they're paying for.
4. **Two tiers side by side** — EUR 29 (learn) vs EUR 79 (build). Clear distinction.
5. **Share still works** — the free preview is shareable. Viral loop preserved.

**Step: Commit**

---

## Task 8: Update routing and header

**Files:**
- Modify: `src/widgets/header/Header.tsx` — CTA links to `/start`
- Create: `src/app/start/page.tsx` — new entry point
- Modify: `src/app/page.tsx` — landing page CTAs point to `/start`
- Keep: `/xray` and `/xray/[id]` alive (don't break shared links)
- Keep: `/quiz` alive but redirect to `/start`

### Header update

```typescript
// CTA: "Start here" → /start (was /quiz)
```

### Landing page CTA updates

All CTAs on landing page should point to `/start`:
- Hero "Show me my data" → `/start`
- Hero "I know what bugs me" → `/start`
- "Get your free X-Ray" → `/start`
- Final CTA → `/start`

### Redirects

```typescript
// src/app/quiz/page.tsx — redirect to /start
import { redirect } from 'next/navigation'
export default function QuizPage() {
  redirect('/start')
}
```

**Step: Commit**

---

## Task 9: Update Stripe integration for new tiers

**Files:**
- Modify: `src/shared/config/stripe.ts` — update product slugs
- Modify: `src/app/api/billing/checkout/route.ts` — handle 'base' and 'build' products
- Modify: `src/app/thank-you/page.tsx` — add 'base' product copy

### New products

```typescript
// EUR 29 — "base" tier (full analysis + learning content)
// EUR 79 — "build" tier (handcrafted repo, was "appBuild")
```

The checkout route needs to accept `sessionId` so the thank-you page knows which session to unlock.

**Step: Commit**

---

## Task 10: Wire up the full flow end-to-end

**Files:**
- Modify: `src/app/start/start-client.tsx` — connect all phases
- Test the complete flow: profile → upload → analysis → results → paywall → Stripe → thank-you

### Integration points:
1. Phase 1 completion → create discovery_session in DB → get sessionId
2. Phase 2 uploads → POST each to `/api/discovery/upload` with sessionId
3. "Generate results" → POST to `/api/discovery/analyze` with sessionId
4. Phase 3 renders from analysis response
5. Paywall click → POST to `/api/billing/checkout` with sessionId + tier
6. Stripe redirect → thank-you → session marked as paid

**Step: Commit**

---

## Task 11: Clean up old flows

**Files:**
- Remove: `src/app/discover/` (entire directory — overthink, sleep)
- Remove: `src/features/discovery-flow/` old components that were replaced
- Keep: `src/app/xray/` (shared links must work)
- Keep: `src/app/xray/[id]/` (shared links must work)
- Modify: `src/app/xray/page.tsx` — redirect to `/start`

**Step: Commit**

---

## Task 12: Final — biome check + build + test

```bash
pnpm biome check .
pnpm build
```

Fix any issues, commit.

---

## Implementation Order (Critical Path)

```
Task 1 (DB schema)
  → Task 2 (parsers)
  → Task 3 (AI analysis engine)
  → Task 6 (API routes)
  → Task 4 (Phase 1 UI)
  → Task 5 (Phase 2 UI)
  → Task 7 (Phase 3 UI / Results + Paywall)
  → Task 10 (wire everything)
  → Task 8 (routing)
  → Task 9 (Stripe)
  → Task 11 (cleanup)
  → Task 12 (verify)
```

Tasks 4-5 (UI) can be built in parallel with Tasks 2-3-6 (backend) if using two agents.

---

## Risk Register

| Risk | Mitigation |
|------|-----------|
| ChatGPT export format changes | Lenient parser with fallbacks, log parse failures |
| Google Takeout ZIPs are huge (500MB+) | Client-side: reject files >200MB. Tell user to select only Search + YouTube |
| Claude API costs for cross-analysis | Use Haiku for extraction, Sonnet only for final cross-reference (1 call per session) |
| No learning content exists yet | Design placeholder modules with titles + "Coming soon" lock. System works without content. |
| User uploads sensitive data | Process and delete. Never store raw files. Only store extracted patterns. |

---

## What This Replaces

| Old | New |
|-----|-----|
| `/quiz` (pain quiz) | `/start` Phase 1 (Quick Profile) |
| `/xray` (screenshot upload) | `/start` Phase 2 (Data Uploads — screen time is one of 4 sources) |
| `/xray` results | `/start` Phase 3 (AI Analysis + Learning Path + Paywall) |
| `/discover`, `/discover/overthink`, `/discover/sleep` | Deleted. One funnel. |
| `UpsellBlock` (EUR 29 audit / EUR 79 build) | PaywallSection (EUR 29 learn / EUR 79 build) |
| `ResultEmailCapture` | Email captured at paywall step |
