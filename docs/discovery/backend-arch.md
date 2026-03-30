# Discovery Backend Architecture

**Author:** Backend Architect
**Date:** 2026-03-30
**Scope:** 2-person team, 4-week MVP
**Product name:** Meldar (working: AgentGate)

---

## Overview

The Discovery tier answers: "What should you automate?" It collects signals from the user's digital life — via OAuth connections, file uploads, and conversation — then runs pattern analysis to surface the top automation opportunities ranked by time saved.

```
┌─────────────┐  ┌─────────────┐  ┌──────────────────┐
│ OAuth APIs   │  │ File Uploads │  │ Conversational Q │
│ (Calendar,   │  │ (Takeout,    │  │ (Chat interface)  │
│  Gmail, YT)  │  │  browser)    │  │                   │
└──────┬───────┘  └──────┬───────┘  └────────┬──────────┘
       │                 │                    │
       ▼                 ▼                    ▼
┌────────────────────────────────────────────────────────┐
│              Ingestion & Normalization Layer            │
│         (events → unified ActivitySignal format)       │
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│              Pattern Analysis Engine                    │
│    (repetition detection, time-sink scoring, LLM       │
│     enrichment for opportunity ranking)                 │
└────────────────────────┬───────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│              Insights Store                             │
│    (only derived insights persisted, raw data purged)  │
└────────────────────────────────────────────────────────┘
```

---

## 1. OAuth Integration Layer

### Realistic API Connections (4-week scope)

| Provider | API | Scopes | What We Extract | Feasibility |
|----------|-----|--------|-----------------|-------------|
| **Google Calendar** | Calendar API v3 | `calendar.readonly` | Event titles, durations, recurrence patterns, time-of-day distribution | High — well-documented, generous quota |
| **Gmail (metadata only)** | Gmail API v1 | `gmail.metadata` | Sender frequency, thread counts, label distribution, response times (no body text) | High — metadata scope avoids sensitive content |
| **YouTube** | YouTube Data API v3 | `youtube.readonly` | Watch history categories, average session length, subscription topics | Medium — watch history requires user's own data |
| **Google Drive** | Drive API v3 | `drive.metadata.readonly` | File types, edit frequency, sharing patterns, folder structure | Medium — useful for "spreadsheet manual work" detection |
| **Apple Screen Time** | **No public API** | N/A | N/A | **Not feasible** — Apple provides no API. Workaround: screenshot upload + OCR (see Section 2) |
| **Spotify** | Web API | `user-read-recently-played` | Listening patterns, focus/break detection | Low priority — nice signal but not core |

### OAuth Flow Architecture

```
Client                    Meldar API                 Google
  │                          │                         │
  │── GET /auth/google ─────►│                         │
  │                          │── redirect to Google ──►│
  │                          │                         │── user consents
  │                          │◄── callback + code ─────│
  │                          │── exchange code ────────►│
  │                          │◄── access + refresh ─────│
  │                          │                         │
  │                          │── encrypt refresh token  │
  │                          │── store in DB            │
  │◄── redirect to app ──────│                         │
```

**Implementation:**

- **NextAuth.js v5** (Auth.js) — handles OAuth dance, token refresh, session management. Already Next.js-native.
- **Token storage:** Refresh tokens encrypted at rest (AES-256-GCM) in Postgres. Access tokens held in memory only, never persisted.
- **Scopes are additive:** User starts with Calendar only. Each new connection is a separate OAuth consent. Never request all scopes upfront.
- **Token refresh:** Background job refreshes tokens 5 minutes before expiry. If refresh fails, mark connection as `stale` and prompt user to re-authorize.

### Data Fetch Strategy

After OAuth connection, we do a **one-time historical pull** + optional **periodic sync**:

| Source | Historical Pull | Ongoing Sync | Rationale |
|--------|----------------|--------------|-----------|
| Calendar | Last 90 days | Every 6 hours | Recurrence patterns need history |
| Gmail metadata | Last 30 days (headers only) | Daily | Sender frequency stabilizes fast |
| YouTube | Last 60 days | Weekly | Consumption patterns are slow-changing |
| Drive | Last 30 days of edits | Weekly | File edit frequency is the signal |

All fetches run as **background jobs** (see Section 5) — never in the request path.

---

## 2. File Upload + Parsing Pipeline

### Supported Upload Formats

#### Google Takeout (.zip)

**What it contains:** User requests a Takeout export from Google. The zip contains structured JSON/HTML for every Google product.

**Parsing pipeline:**

```
Upload (.zip, max 2GB)
  │
  ▼
Streaming unzip (node-stream-zip / yauzl — never extract to disk fully)
  │
  ▼
Router: detect file paths inside zip
  │
  ├── Takeout/My Activity/Search/*.json → search pattern extraction
  ├── Takeout/My Activity/Chrome/*.json → browsing pattern extraction
  ├── Takeout/My Activity/YouTube/*.json → watch history extraction
  ├── Takeout/Calendar/*.ics → calendar event parsing
  ├── Takeout/Mail/All mail Including Spam and Trash.mbox → skip (too large, use OAuth instead)
  └── everything else → skip
  │
  ▼
Normalize each to ActivitySignal[] → feed to analysis engine
  │
  ▼
Delete uploaded zip from temp storage (max retention: 1 hour)
```

**Key Takeout files and what we extract:**

| File Path | Format | Extraction |
|-----------|--------|------------|
| `My Activity/Search/MyActivity.json` | JSON array of search objects | Search topics, frequency, time-of-day |
| `My Activity/Chrome/MyActivity.json` | JSON array | Sites visited, frequency, dwell time estimates |
| `My Activity/YouTube/MyActivity.json` | JSON array | Video categories, watch times |
| `Calendar/*.ics` | iCal | Events, recurrence (backup if OAuth not connected) |

**Takeout JSON structure** (Google's format):

```json
{
  "header": "Searched for",
  "title": "best meal prep app",
  "titleUrl": "https://www.google.com/search?q=...",
  "time": "2026-03-15T14:23:01.000Z",
  "products": ["Search"]
}
```

We extract: `title`, `time`, `products`. Never store `titleUrl`.

#### Browser History

**Chrome:** `History` SQLite file (exported from `chrome://history` or from Takeout).

```sql
-- Chrome's history DB schema (relevant tables)
SELECT url, title, visit_count, last_visit_time
FROM urls
ORDER BY visit_count DESC;
```

**Firefox:** `places.sqlite` — similar schema.

**Safari:** Export as CSV/HTML from History menu.

**Parsing:** Use `better-sqlite3` (read-only mode) to query the uploaded SQLite file directly. Extract domain frequency, visit patterns, time-of-day distribution. Strip full URLs immediately — store only domains and visit counts.

#### Screen Time Screenshots (Apple workaround)

Since Apple has no Screen Time API:

1. User takes screenshots of Settings → Screen Time → App Usage
2. Uploads images (PNG/JPEG)
3. **OCR pipeline:** Claude Vision API (or Tesseract as fallback) extracts app names + durations
4. Normalize to `ActivitySignal[]`

**Prompt for Claude Vision:**

```
Extract app usage data from this Screen Time screenshot.
Return JSON: [{"app": "Instagram", "category": "Social", "duration_minutes": 47}, ...]
Only return apps visible in the screenshot. Do not guess or infer.
```

This is the most novel upload type and gives us data no competitor has access to.

### Upload Infrastructure

- **Storage:** Vercel Blob (or S3) for temporary upload staging. Signed upload URLs, 1-hour TTL.
- **Processing:** Vercel Functions (or a dedicated worker) with 60s timeout for parsing. Large Takeout zips may need a queue-based approach (see below).
- **Validation:** File type verification (magic bytes, not just extension). Max sizes: zip 2GB, SQLite 500MB, images 10MB each.
- **Queue:** For large files, use Inngest or BullMQ to process asynchronously. Client polls for status via SSE or WebSocket.

---

## 3. Conversational Discovery API

### Purpose

Not everyone will connect OAuth or upload files. The conversational questionnaire is the **lowest-friction entry point** — a chat interface that asks smart questions to surface automation opportunities from self-reported habits.

### Conversation Flow

```
Phase 1: Context Gathering (3-5 questions)
  "What does a typical Monday morning look like for you?"
  "What apps do you open most on your phone?"
  "What recurring task do you dread most?"
  "When do you feel like you're wasting time?"
  "What do you wish happened automatically?"

Phase 2: Deep Dive (2-3 follow-ups per pattern)
  "You mentioned checking email first thing — roughly how long does that take?"
  "When you say you copy data into spreadsheets, what kind of data?"
  "How often does the invoice follow-up situation happen?"

Phase 3: Synthesis
  LLM generates structured pattern analysis
  Returns ranked automation opportunities
```

### API Design

```
POST /api/discovery/chat
{
  "session_id": "uuid",
  "message": "I spend about 2 hours every Monday copying..."
}

Response (streamed):
{
  "reply": "That's a significant time sink. What format is the data...",
  "extracted_signals": [
    {
      "type": "self_reported",
      "category": "data_entry",
      "description": "Manual email-to-spreadsheet copying",
      "frequency": "weekly",
      "estimated_minutes": 120,
      "confidence": 0.8
    }
  ],
  "phase": "deep_dive",
  "progress": 0.6
}
```

### LLM Integration

**Model:** Claude Sonnet 4.6 (fast, cheap, good enough for conversation + extraction)

**System prompt structure:**

```
You are Meldar's discovery assistant. Your job is to uncover
repetitive tasks and automation opportunities in the user's life.

Rules:
- Ask ONE question at a time
- Be conversational, warm, non-technical
- After each user response, extract structured signals (JSON)
- Focus on: frequency, time spent, emotional friction, existing tools used
- After 5-8 exchanges, synthesize findings
- Never suggest specific products or competitors

Current signals extracted so far:
{signals_json}

Conversation history:
{messages}
```

**Structured extraction:** Each LLM response includes both the conversational reply and a JSON block of extracted `ActivitySignal` objects. We parse both from the response using a tool-call pattern (Claude's tool use feature).

### Data Model

```sql
-- Conversation sessions
CREATE TABLE discovery_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'active', -- active, completed, abandoned
  phase TEXT NOT NULL DEFAULT 'context',  -- context, deep_dive, synthesis
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Individual messages
CREATE TABLE discovery_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES discovery_sessions(id),
  role TEXT NOT NULL, -- user, assistant
  content TEXT NOT NULL,
  extracted_signals JSONB, -- signals extracted from this message
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Extracted activity signals (unified format from ALL sources)
CREATE TABLE activity_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  source TEXT NOT NULL, -- 'oauth:calendar', 'upload:takeout', 'chat', 'upload:screentime'
  category TEXT NOT NULL, -- 'email', 'data_entry', 'scheduling', 'browsing', etc.
  description TEXT NOT NULL,
  frequency TEXT, -- 'daily', 'weekly', 'monthly', 'adhoc'
  estimated_minutes_per_occurrence INT,
  occurrences_per_week FLOAT,
  confidence FLOAT NOT NULL DEFAULT 0.5, -- 0-1, higher = more data points
  raw_metadata JSONB, -- source-specific details (NOT raw user data)
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ -- auto-purge date
);

-- Derived insights (the ONLY long-term storage)
CREATE TABLE automation_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL, -- "Email-to-spreadsheet automation"
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  estimated_weekly_minutes_saved INT NOT NULL,
  complexity TEXT NOT NULL, -- 'simple', 'moderate', 'complex'
  data_sources TEXT[] NOT NULL, -- which sources contributed
  confidence FLOAT NOT NULL,
  signal_ids UUID[] NOT NULL, -- references to contributing signals
  status TEXT NOT NULL DEFAULT 'suggested', -- suggested, accepted, dismissed, built
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 4. Pattern Analysis Engine

### The Core Question

Given a bag of `ActivitySignal` objects from mixed sources (OAuth + uploads + chat), how do we identify the top 5-10 automation opportunities?

### Algorithm: Three-Pass Analysis

#### Pass 1: Frequency Clustering (deterministic)

Group signals by category and identify repetitive patterns:

```typescript
interface FrequencyCluster {
  category: string;
  signals: ActivitySignal[];
  totalWeeklyMinutes: number;
  occurrencesPerWeek: number;
  sources: string[]; // how many independent sources confirm this
  crossSourceConfidence: number; // higher if multiple sources agree
}
```

**Logic:**
1. Group signals by `category`
2. Within each category, cluster by semantic similarity (simple: Levenshtein on description, or embedding cosine similarity if we have it)
3. Sum `estimated_minutes_per_occurrence * occurrences_per_week` per cluster
4. Boost confidence when multiple sources agree (e.g., calendar shows recurring meetings AND chat confirms "I spend hours in meetings")

#### Pass 2: Opportunity Scoring (deterministic + heuristic)

Score each cluster on three dimensions:

```
opportunity_score = (time_saved_weight * weekly_minutes_saved)
                  + (frequency_weight * occurrences_per_week)
                  + (feasibility_weight * automation_feasibility)
                  + (cross_source_bonus * num_confirming_sources)
```

Where:
- `weekly_minutes_saved`: Estimated from signal data
- `occurrences_per_week`: Higher frequency = more value
- `automation_feasibility`: Pre-scored lookup table based on category:

| Category | Feasibility Score | Rationale |
|----------|:-:|---|
| Email triage/filtering | 0.9 | Well-established automation patterns |
| Data entry / spreadsheet | 0.85 | Structured input → structured output |
| Social media posting | 0.8 | APIs available for all major platforms |
| Scheduling / calendar | 0.8 | Calendar APIs are mature |
| Price/availability monitoring | 0.8 | Web scraping is reliable |
| Meal planning | 0.7 | LLM-native task, good results |
| Expense categorization | 0.7 | Receipt OCR + categorization is solved |
| Job application tracking | 0.6 | Partially manual, email parsing helps |
| Health data aggregation | 0.4 | Fragmented APIs, privacy concerns |
| Relationship management | 0.3 | Subjective, hard to automate well |

- `cross_source_bonus`: +0.15 per additional confirming source (max +0.3)

#### Pass 3: LLM Enrichment (for presentation)

Take the top 10 scored opportunities and pass them to Claude for:

1. **Human-readable title and description** — rewrite technical cluster data into language the user understands
2. **Personalized explanation** — reference the user's own words from the chat ("You mentioned spending 2 hours on Mondays...")
3. **Concrete next step** — what the automation would actually do
4. **Effort estimate** — simple/moderate/complex

**Prompt:**

```
Given these automation opportunities detected for the user, write
a personalized summary for each. Use the user's own words where possible.

Opportunities (ranked by score):
{opportunities_json}

User's own descriptions (from chat):
{user_quotes}

For each opportunity, return:
- title: Short, non-technical name
- description: 2-3 sentences, referencing the user's situation
- what_it_does: Concrete explanation of the automation
- complexity: simple | moderate | complex
- estimated_weekly_time_saved: "X hours" or "X minutes"
```

### Why Not Pure LLM?

Passes 1 and 2 are deterministic for a reason:

- **Reproducibility:** Same inputs → same ranking. LLMs are stochastic.
- **Cost:** Running full analysis through an LLM for every user is expensive. Deterministic passes cost zero.
- **Debuggability:** When a suggestion is bad, we can trace exactly which signals contributed and why.
- **Speed:** Passes 1-2 run in <100ms. LLM call only happens once at the end.

The LLM's job is **presentation, not analysis**. It makes the results human-readable and personal. The scoring is ours.

---

## 5. Privacy-First Architecture

### Core Principle: Process and Discard

Raw user data is **transient**. Only derived insights are persisted.

```
                    ┌─────────────────────────┐
                    │     Raw Data Zone        │
                    │  (encrypted, ephemeral)  │
                    │                          │
  OAuth fetch ────► │  Calendar events         │
  File upload ────► │  Email headers           │ ──► ActivitySignals ──► Insights
  Chat messages ──► │  Browser history         │     (short-lived)      (permanent)
                    │  Screenshots             │
                    │                          │
                    │  TTL: 1 hour max         │
                    └─────────────────────────┘
```

### Data Lifecycle

| Data Type | Storage | Retention | Encryption |
|-----------|---------|-----------|------------|
| Uploaded files (zip, sqlite, images) | Blob storage (temp) | **1 hour** — deleted after processing | AES-256 at rest, TLS in transit |
| OAuth raw responses (calendar events, email headers) | In-memory only | **Never persisted** — processed in streaming fashion | TLS in transit |
| OAuth refresh tokens | Postgres | Until user disconnects | AES-256-GCM, key in env var |
| Chat messages | Postgres | **30 days** — then hard-deleted | AES-256 at rest |
| Activity Signals | Postgres | **7 days** — then hard-deleted | AES-256 at rest |
| Automation Opportunities (insights) | Postgres | **Permanent** (user can delete) | AES-256 at rest |
| LLM prompts/responses | Not stored | **Never persisted** — streaming only | TLS to API |

### GDPR Compliance (Finnish entity = Finnish DPA jurisdiction)

- **Lawful basis:** Explicit consent per data source (OAuth consent screen + in-app toggle)
- **Right to erasure:** `DELETE /api/user/data` purges all data within 24 hours, including backups
- **Data portability:** `GET /api/user/export` returns all stored insights as JSON
- **Data processing agreement:** Required with Vercel (hosting), Anthropic (LLM), Google (OAuth)
- **Privacy policy:** Must enumerate every data type collected, retention period, and third-party processor
- **Cookie consent:** Already implemented in the frontend (see `features/cookie-consent/`)

### Implementation Details

**Encryption at rest:**

```typescript
// Encrypt before storing sensitive fields
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32 bytes

function encrypt(plaintext: string): { ciphertext: string; iv: string; tag: string } {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
  };
}
```

**Automated purge job:**

```typescript
// Runs every hour via cron (Vercel Cron or Inngest)
async function purgeExpiredData() {
  // Delete expired activity signals
  await db.execute(
    `DELETE FROM activity_signals WHERE expires_at < NOW()`
  );

  // Delete old chat messages (30-day retention)
  await db.execute(
    `DELETE FROM discovery_messages
     WHERE created_at < NOW() - INTERVAL '30 days'`
  );

  // Delete orphaned sessions
  await db.execute(
    `DELETE FROM discovery_sessions
     WHERE status = 'abandoned'
     AND created_at < NOW() - INTERVAL '7 days'`
  );
}
```

**No raw data in logs:**

- All logging uses structured JSON (pino)
- Sensitive fields are redacted at the logger level: email addresses, event titles, file contents
- Log retention: 7 days (Vercel default)
- No user data in error tracking (Sentry DSN events scrubbed)

---

## 6. Tech Stack Decisions (4-week constraint)

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **API framework** | Next.js API Routes (App Router) | Already the frontend framework. No second server. |
| **Database** | Postgres on Neon (serverless) or Supabase | Serverless scaling, generous free tier, GDPR-ready (EU region) |
| **ORM** | Drizzle ORM | Type-safe, lightweight, excellent Postgres support |
| **Auth** | Auth.js v5 (NextAuth) | Native Next.js OAuth, handles token refresh |
| **Background jobs** | Inngest | Serverless-native, works on Vercel, handles retries/scheduling |
| **File storage** | Vercel Blob | Temporary upload staging, auto-TTL |
| **LLM** | Anthropic Claude API (Sonnet for chat, Haiku for OCR/extraction) | Already in the product DNA. Token metering infrastructure exists. |
| **Encryption** | Node.js `crypto` (AES-256-GCM) | No external dependency needed |
| **Monitoring** | Vercel Analytics + pino logging | Sufficient for MVP |

### What We Explicitly Skip (4-week scope)

- **No real-time sync** — periodic batch fetches are sufficient for discovery
- **No mobile app** — web-only, responsive
- **No Spotify/Fitbit/etc.** — Google ecosystem only for MVP
- **No ML models** — deterministic scoring + LLM enrichment is enough
- **No microservices** — monolith in Next.js, split later if needed

---

## 7. API Surface (MVP)

```
Auth
  POST /api/auth/[...nextauth]     — Auth.js handles OAuth flows

Connections
  GET  /api/connections              — list user's OAuth connections
  POST /api/connections/google       — initiate Google OAuth (scopes param)
  DELETE /api/connections/:id        — revoke connection, delete tokens

Upload
  POST /api/upload/presign           — get signed upload URL
  POST /api/upload/process           — trigger parsing of uploaded file
  GET  /api/upload/:id/status        — poll processing status

Discovery Chat
  POST /api/discovery/chat           — send message, get streamed response
  GET  /api/discovery/sessions       — list user's discovery sessions
  GET  /api/discovery/sessions/:id   — get session with messages

Insights
  GET  /api/insights                 — get user's automation opportunities
  PATCH /api/insights/:id            — update status (accepted/dismissed)
  POST /api/insights/refresh         — re-run analysis with latest data

Privacy
  GET  /api/user/export              — GDPR data export
  DELETE /api/user/data              — GDPR erasure (all data)

Webhooks (internal)
  POST /api/cron/purge               — hourly data purge (Vercel Cron)
  POST /api/cron/sync                — periodic OAuth data refresh
```

---

## 8. Sequencing: What to Build in Which Week

### Week 1: Conversational Discovery (highest value, lowest complexity)

- Discovery chat API (`/api/discovery/chat`)
- LLM integration with Claude (system prompt, signal extraction)
- Chat UI (reuse existing component patterns)
- Activity signal storage + basic schema
- **Deliverable:** User can have a conversation and get automation suggestions

### Week 2: OAuth + Calendar Integration

- Auth.js setup with Google OAuth
- Google Calendar historical pull + normalization
- Gmail metadata fetch (headers only)
- Connection management UI
- Merge OAuth signals with chat signals in analysis
- **Deliverable:** Connected Google account enriches suggestions

### Week 3: File Upload + Pattern Analysis

- Upload flow (presign → upload → process)
- Google Takeout zip parser (activity JSON files)
- Browser history SQLite parser
- Screen Time screenshot OCR via Claude Vision
- Three-pass analysis engine (frequency → scoring → LLM enrichment)
- **Deliverable:** Full discovery pipeline works end-to-end

### Week 4: Polish, Privacy, Edge Cases

- Automated data purge cron jobs
- GDPR export + erasure endpoints
- Error handling for failed OAuth refreshes, corrupt uploads
- Rate limiting on chat and upload endpoints
- Loading states, progress indicators, empty states in UI
- **Deliverable:** Production-ready discovery tier

---

## 9. Key Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|:---:|:---:|---|
| Google OAuth review takes >4 weeks | High | High | Use "Testing" mode (100 users) for beta. Apply for verification in parallel. |
| Takeout zip format changes | Low | Medium | Parser is path-based with graceful fallback. Unknown paths are skipped, not errored. |
| LLM extraction quality varies | Medium | Medium | Deterministic scoring is the backbone. LLM only enriches presentation. Bad extraction = lower confidence score, not wrong suggestion. |
| Users don't connect OAuth or upload | High | High | Conversational discovery works standalone. It's the fallback AND the primary entry point. |
| File upload processing exceeds Vercel function timeout | Medium | Medium | Use Inngest for async processing. Stream progress to client. |
| GDPR complaint before privacy policy is live | Low | High | Privacy policy is a Week 4 blocker. No public launch without it. |

---

## 10. The Unified ActivitySignal Format

Every data source normalizes into this shape before analysis:

```typescript
interface ActivitySignal {
  id: string;
  userId: string;
  source: 'oauth:calendar' | 'oauth:gmail' | 'oauth:youtube' | 'oauth:drive'
        | 'upload:takeout' | 'upload:browser' | 'upload:screentime'
        | 'chat';
  category: string;       // 'email' | 'scheduling' | 'data_entry' | 'browsing' | 'social_media' | ...
  description: string;    // Human-readable: "Checks Gmail 12 times per day"
  frequency: 'daily' | 'weekly' | 'monthly' | 'adhoc';
  estimatedMinutesPerOccurrence: number;
  occurrencesPerWeek: number;
  confidence: number;     // 0-1
  metadata: Record<string, unknown>; // Source-specific, non-PII
  createdAt: Date;
  expiresAt: Date;        // Auto-purge date
}
```

**Normalization examples:**

| Source | Raw Data | Normalized Signal |
|--------|----------|-------------------|
| Calendar | 5 recurring "Team standup" events/week, 30min each | `{category: "scheduling", description: "Recurring 30-min meetings 5x/week", frequency: "daily", estimatedMinutes: 30, occurrences: 5, confidence: 0.95}` |
| Gmail metadata | 47 emails from `noreply@` in 7 days | `{category: "email", description: "47 automated notification emails per week", frequency: "daily", estimatedMinutes: 5, occurrences: 47, confidence: 0.8}` |
| Chat | "I copy sales numbers from email to a Google Sheet every Monday" | `{category: "data_entry", description: "Manual email-to-spreadsheet copying", frequency: "weekly", estimatedMinutes: 120, occurrences: 1, confidence: 0.7}` |
| Screen Time OCR | Instagram: 1h 23m daily | `{category: "social_media", description: "Instagram usage ~1.4 hours daily", frequency: "daily", estimatedMinutes: 83, occurrences: 7, confidence: 0.6}` |
| Browser history | reddit.com: 342 visits in 30 days | `{category: "browsing", description: "Reddit visited ~11 times daily", frequency: "daily", estimatedMinutes: null, occurrences: 80, confidence: 0.85}` |

---

## Summary

The architecture optimizes for three things:

1. **Low-friction entry:** Chat-first. No OAuth required. No file upload required. Users can get value from a 5-minute conversation alone.
2. **Progressive enrichment:** Each additional data source (OAuth connection, file upload) increases confidence and specificity of suggestions. The system gets smarter with more signals.
3. **Privacy by default:** Raw data is transient. Only insights survive. Users own their data. GDPR compliance is structural, not bolted on.

The 4-week plan front-loads the conversational discovery (Week 1) because it delivers immediate value and requires zero infrastructure beyond an LLM call. OAuth and file uploads layer on top as enrichment, not prerequisites.

---
---

# ADDENDUM: The Self-Export Architecture

**Date:** 2026-03-30
**Updated:** 2026-03-30 (v2 — founder directive: user exports their own data, we analyze the file)

**Core principle:** We never touch user accounts. Users exercise their existing GDPR/privacy rights to export their own data from platforms they already use. We give them a step-by-step tutorial for each platform, they hand us the file, we find the patterns.

**Why this is structurally superior to OAuth:**
- Zero API integration (no OAuth dance, no token management, no verification review)
- Zero ongoing maintenance (APIs change, break, rate-limit — files don't)
- Legal clarity: the user extracted their own data using their own rights. We're analyzing a file they chose to give us. No third-party API access, no stored credentials, no scope creep.
- GDPR-native: we're literally helping users exercise Article 20 (right to data portability)
- We get MORE data than APIs give us (exports include historical data that APIs paginate or restrict)

---

## The Complete Self-Export Data Catalog

Every major platform offers a data export. Here's what exists, what's in it, and what's worth parsing.

### Tier 1: High Value, Easy Export, Easy Parse (build first)

#### Google Takeout

**Export URL:** `takeout.google.com`
**Export time:** 2-10 minutes (small selection), hours (full export)
**Format:** ZIP containing JSON, iCal, mbox, HTML files

| Data File | Format | Discovery Signal | Parse Effort |
|-----------|--------|-----------------|:---:|
| `My Activity/Chrome/MyActivity.json` | JSON array | Every site visited + timestamp | Trivial |
| `My Activity/Search/MyActivity.json` | JSON array | Every Google search + timestamp | Trivial |
| `My Activity/YouTube/MyActivity.json` | JSON array | Every video watched + timestamp | Trivial |
| `My Activity/Maps/MyActivity.json` | JSON array | Location visits + timestamps | Trivial |
| `Calendar/*.ics` | iCal | Meetings, recurring events, duration | Medium |
| `Fit/Daily activity metrics/*.json` | JSON | Step counts, activity minutes, sleep | Trivial |
| `Mail/` (mbox) | mbox | Sender frequency, thread counts (headers only) | Medium |
| `Chrome/Bookmarks.html` | HTML | Interest categories, saved resources | Trivial |
| `YouTube/subscriptions/subscriptions.json` | JSON | Content interests | Trivial |

**Guided selection (keep zip small):** Tell users to select ONLY: My Activity, Calendar, Fit. Skip Drive, Photos, Mail full export.

**Expected zip size with our selection:** 50-200MB
**Signals extracted:** 500-5000 activity signals per user

**Takeout JSON structure (Google's standard format):**
```json
{
  "header": "Searched for",
  "title": "best meal prep app",
  "titleUrl": "https://www.google.com/search?q=...",
  "time": "2026-03-15T14:23:01.000Z",
  "products": ["Search"]
}
```
We extract: `title`, `time`, `products`. Strip `titleUrl` immediately.

#### Apple Screen Time (via screenshot)

**No export file exists.** Apple provides no data export for Screen Time.

**Our workaround:** Screenshot upload + Claude Vision OCR. This is a feature, not a hack.

**Export path (guided):**
- iOS: Settings → Screen Time → See All App & Website Activity → screenshot each day
- Android: Settings → Digital Wellbeing → Dashboard → screenshot

**What we extract:** App name, category, daily duration in minutes
**Parse cost:** ~$0.002 per screenshot (Claude Haiku Vision)
**Signals:** 10-30 per screenshot (one per app)

**Why this is actually better than an API:**
- Works on both iOS and Android (Digital Wellbeing screenshots parse the same way)
- Zero platform integration
- Users already know where Screen Time is
- One screenshot = complete daily usage breakdown
- Claude Vision handles OCR perfectly for these structured UI screenshots

#### Browser History (direct export)

**Chrome:** `chrome://history` → three-dot menu → Export (or from Takeout)
**Firefox:** `about:support` → Profile Folder → `places.sqlite`
**Safari:** File → Export Bookmarks (history is limited)

**Format:** Chrome History is a SQLite database. Firefox `places.sqlite` is also SQLite.

```sql
-- Chrome/Firefox history query
SELECT url, title, visit_count, last_visit_time FROM urls ORDER BY visit_count DESC;
```

**What we extract:** Domain frequency (strip full URLs), visit time-of-day patterns, most-visited sites
**Parse:** `better-sqlite3` in read-only mode, ~10 lines of code
**Signals:** 100-500 per user (domain-level aggregations)

---

### Tier 2: High Value, Moderate Effort (build in weeks 2-3)

#### Meta (Facebook + Instagram) Data Download

**Export URL:** Facebook → Settings → Your Information → Download Your Information
**Export time:** Hours to days (Meta is slow)
**Format:** ZIP containing JSON or HTML (user chooses)

| Data File | Format | Discovery Signal | Parse Effort |
|-----------|--------|-----------------|:---:|
| `your_activity_across_facebook/posts/your_posts.json` | JSON | Posting frequency, content types | Trivial |
| `messages/inbox/*/message_1.json` | JSON | Messaging patterns, most-contacted people, response times | Medium |
| `your_activity_across_facebook/search/your_search_history.json` | JSON | What they search for on FB | Trivial |
| `apps_and_websites_off_of_facebook/your_off-facebook_activity.json` | JSON | **Gold mine** — every app/site that reports data to Meta. Shows real app usage. | Trivial |
| `instagram_activity/content/posts_1.json` | JSON | IG posting frequency and times | Trivial |
| `instagram_activity/login_and_account_creation/login_activity.json` | JSON | When they use Instagram (login timestamps) | Trivial |

**The killer file:** `your_off-facebook_activity.json` — this contains data from every app and website that uses Meta's tracking pixel. It's essentially a second browsing history that the user doesn't even know they have. Format:

```json
{
  "off_facebook_activity_v2": [
    {
      "name": "Spotify",
      "events": [
        { "id": 123, "type": "CUSTOM", "timestamp": 1711234567 }
      ]
    }
  ]
}
```

**Guided selection:** Tell users to request JSON format, select: Posts, Messages (metadata only), Search History, Off-Facebook Activity. Skip Photos, Videos, Ads.

#### Apple Privacy Report (via download)

**Export URL:** `privacy.apple.com` → "Request a copy of your data"
**Export time:** Up to 7 days (Apple is VERY slow)
**Format:** ZIP containing CSV files

| Data File | Format | Discovery Signal | Parse Effort |
|-----------|--------|-----------------|:---:|
| `Apple ID account and device information/*.csv` | CSV | Devices owned, account age | Trivial |
| `App Store/App Store - Purchase History.csv` | CSV | Apps purchased/downloaded, categories | Trivial |
| `Apple Media Services/Apple Music - Play Activity.csv` | CSV | Listening patterns, time of day | Trivial |
| `iCloud/iCloud Drive - File Metadata.csv` | CSV | File types worked with, edit timestamps | Medium |
| `iCloud/iCloud - Calendars and Reminders.csv` | CSV | Calendar events, reminders | Medium |
| `iCloud/iCloud - Safari - Bookmarks.csv` | CSV | Interest categories | Trivial |

**Limitation:** Apple's export takes up to 7 days. Too slow for "instant discovery." Best used as a follow-up enrichment, not the first step.

#### Spotify Data Export

**Export URL:** Spotify Account → Privacy Settings → Download your data
**Export time:** Up to 30 days for extended history, 5 days for basic
**Format:** ZIP containing JSON

| Data File | Format | Discovery Signal | Parse Effort |
|-----------|--------|-----------------|:---:|
| `StreamingHistory_music_0.json` | JSON | Listening times, duration, patterns | Trivial |
| `SearchQueries.json` | JSON | What they search for (interests) | Trivial |

**Signal value:** Medium. Shows focus vs. distraction patterns (long listening sessions = deep work, shuffling = procrastination). Fun to show users but not core to automation discovery.

---

### Tier 3: Niche Value (consider post-MVP)

| Platform | Export URL | Wait Time | Format | Value for Discovery |
|----------|-----------|-----------|--------|-------------------|
| **Twitter/X** | Settings → Your Account → Download Archive | 24h | ZIP/JSON | Posting patterns, interests |
| **LinkedIn** | Settings → Get a copy of your data | 24h | ZIP/CSV | Professional activity, job search signals |
| **Reddit** | Settings → Request Your Data | Minutes | ZIP/CSV | Interest patterns, time-of-day usage |
| **Netflix** | Account → Download your personal information | Days | CSV | Consumption patterns |
| **Amazon** | Request My Data | Days | CSV/JSON | Purchase patterns, browsing history |
| **WhatsApp** | Settings → Request Account Info | 3 days | ZIP/JSON | Communication patterns |
| **Slack** | Workspace admin → Export data | Minutes | ZIP/JSON | Work communication patterns |
| **Notion** | Settings → Export All Content | Minutes | ZIP/Markdown | What they organize, project types |

---

## Platform-Specific Parser Design

### Universal Parser Architecture

Every export, regardless of platform, goes through the same pipeline:

```
Upload (zip/sqlite/image)
  │
  ▼
Format Detection
  │ (magic bytes + internal file path patterns)
  │
  ├── Google Takeout detected → GoogleTakeoutParser
  ├── Meta Download detected  → MetaDownloadParser
  ├── Apple Privacy detected  → ApplePrivacyParser
  ├── Spotify Export detected → SpotifyParser
  ├── Chrome History SQLite   → BrowserHistoryParser
  ├── Firefox places.sqlite   → BrowserHistoryParser
  ├── Screen Time screenshot  → ScreenTimeOCRParser
  └── Unknown format          → LLMFallbackParser (!)
  │
  ▼
ActivitySignal[] (unified format)
  │
  ▼
Delete source file (max 1-hour retention)
```

### Format Detection (the smart part)

We don't ask users what they uploaded. We detect it:

```typescript
async function detectExportFormat(zipEntries: string[]): ExportFormat {
  // Google Takeout: always has "Takeout/" root directory
  if (zipEntries.some(e => e.startsWith('Takeout/')))
    return 'google-takeout';

  // Meta: has specific directory structure
  if (zipEntries.some(e => e.includes('your_activity_across_facebook')))
    return 'meta-facebook';
  if (zipEntries.some(e => e.includes('instagram_activity')))
    return 'meta-instagram';

  // Apple: CSV files with specific headers
  if (zipEntries.some(e => e.includes('Apple Media Services')))
    return 'apple-privacy';

  // Spotify: specific JSON filenames
  if (zipEntries.some(e => e.includes('StreamingHistory')))
    return 'spotify';

  // Fallback: ask the LLM to figure it out
  return 'unknown';
}
```

### The LLM Fallback Parser

For unknown formats or edge cases, we have one more cheat: send a sample of the file contents to Claude and ask it to extract activity signals.

```typescript
async function llmFallbackParse(sampleContent: string, filename: string): ActivitySignal[] {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6-20250326',
    system: `You are a data parser. Given a sample of a data export file,
extract activity signals. Each signal should capture: what activity,
when it happened, how often, and how long it took.
Return JSON array of signals. If you can't parse it, return [].`,
    messages: [{
      role: 'user',
      content: `Filename: ${filename}\n\nSample content (first 5000 chars):\n${sampleContent.slice(0, 5000)}`
    }]
  });
  return JSON.parse(extractJSON(response));
}
```

This means we can accept ANY export format from ANY platform without writing a custom parser first. The LLM figures it out. We only write dedicated parsers for high-volume formats (Google, Meta) where speed and cost matter.

---

## The Guided Tutorial System

This is the product differentiator. Not the parsing — anyone can parse JSON. The magic is making non-technical users successfully export their data on the first try.

### Tutorial Structure (per platform)

Each tutorial is a step-by-step guide with:

```typescript
interface ExportTutorial {
  platform: string;              // "Google", "Meta", "Apple", etc.
  exportUrl: string;             // Direct link to the export page
  estimatedTime: string;         // "2-10 minutes", "up to 7 days"
  difficulty: 'easy' | 'medium'; // How many steps
  steps: TutorialStep[];
  recommendedSelections: string[]; // Which data categories to check
  skipRecommendations: string[];   // What to leave unchecked (and why)
  expectedFileSize: string;       // "50-200 MB"
  troubleshooting: FAQ[];         // Common issues
}

interface TutorialStep {
  instruction: string;           // "Click 'Deselect all', then check only these 3 boxes"
  screenshot?: string;           // Path to annotated screenshot showing exactly where to click
  animatedGif?: string;          // Short GIF showing the action
  tip?: string;                  // "This page looks different on mobile — use a computer"
  waitTime?: string;             // "Google will prepare your file. This takes 2-10 minutes."
}
```

### Tutorial Content (Google Takeout — the primary path)

```
Step 1: Open takeout.google.com
        [Screenshot: Google Takeout landing page with "Deselect all" button highlighted]
        Tip: "Make sure you're logged into the right Google account"

Step 2: Click "Deselect all"
        [Screenshot: All checkboxes unchecked]
        Tip: "We only need 3 things. Selecting everything would make a huge file."

Step 3: Check these 3 boxes: "My Activity", "Calendar", "Fit"
        [Screenshot: Just these 3 checked, with red circles around them]
        Tip: "My Activity includes your Chrome browsing, Google searches, and YouTube history — that's where the gold is"

Step 4: Scroll down and click "Next step"
        [Screenshot: Next step button]

Step 5: Choose "Export once", ".zip", and any file size
        [Screenshot: Export settings with recommended options circled]

Step 6: Click "Create export"
        [Screenshot: Create export button]

Step 7: Wait for the email (2-10 minutes)
        "While Google prepares your data, let's chat about your daily routine..."
        [Transitions to conversational questionnaire]

Step 8: Download the zip from your email, then drop it here
        [Upload dropzone appears]
```

### The "Chat While Waiting" Pattern

This is the key UX insight. Every platform export has a wait time:

| Platform | Wait Time | What We Do During the Wait |
|----------|-----------|---------------------------|
| Google Takeout | 2-10 min | Run the conversational questionnaire |
| Meta Download | Hours-days | Ask for Screen Time screenshot instead |
| Apple Privacy | Up to 7 days | Ask for Screen Time screenshot + Google Takeout |
| Spotify | 5-30 days | Not worth waiting; skip for MVP |

The wait is never dead time. We always have a fallback that gives instant value (chat + screenshot).

### The "Pick Your Platforms" Flow

On the discovery page, the user sees:

```
"Which of these do you use? (pick all that apply)"

[Google]  [Instagram]  [iPhone]  [Android]  [Chrome]  [Firefox]

→ Based on selection, we build a personalized export checklist:

"Here's your export plan (10 minutes total):"

 1. ✅ Google Takeout — 3 minutes to set up, 5-min wait
 2. ✅ Screen Time screenshot — 30 seconds
 3. ○ Meta Download — we'll email you when it's ready (optional, takes hours)

[Start with Google →]
```

This makes it feel like a guided process, not homework.

---

## The Hack: Guide the Takeout Export (original — retained for continuity)

Instead of building OAuth flows, we build a **3-screen guided Takeout wizard**:

```
Screen 1: "Let's see what you're spending time on"
          [Big button: "Download your Google data"]
          → Opens takeout.google.com in new tab
          → Inline instructions: "Select these 4 categories, click Export"
          → Animated GIF/screenshots showing exactly which checkboxes

Screen 2: "Drop your file here" (while they wait ~2-10 min for Google to prepare)
          → Meanwhile, run the conversational questionnaire
          → "While Google prepares your data, let's chat..."
          → This is BRILLIANT: the wait time becomes engagement time

Screen 3: Upload complete → "Here's what we found"
          → Combined analysis: Takeout data + chat signals
```

**Why this is unfair:**
- Zero OAuth infrastructure (saves ~1 week of dev)
- Zero Google API verification (saves weeks of waiting)
- Zero token management (no refresh bugs, no expiry handling)
- Zero rate limits (we're parsing a local file)
- User already trusts Google's export (it's their own data)
- We get MORE data than OAuth would give us (Takeout includes historical data OAuth APIs paginate poorly)

---

## The Second Cheat Code: A Single Browser Extension

One install. One click. The most unfair data source possible.

### What a Chrome Extension Can Silently Observe

A simple Chrome extension with `tabs` and `history` permissions gives us:

| Signal | How | Value |
|--------|-----|-------|
| **Every site visited + time spent** | `chrome.history.search()` + `chrome.tabs.onActivated` | Extreme — real browsing behavior, not self-reported |
| **Tab switching frequency** | `chrome.tabs.onActivated` listener | High — measures multitasking/context switching cost |
| **Which sites are open simultaneously** | `chrome.tabs.query()` | High — reveals workflow patterns |
| **Time-of-day patterns** | Timestamps on all events | High — shows when they work, when they procrastinate |
| **Repeated manual workflows** | URL sequence detection (e.g., Gmail → Sheets → Gmail → Sheets) | **Extreme** — this IS the automation discovery |
| **Copy-paste frequency** | `document.execCommand` listener (with permission) | Extreme — manual data transfer detection |
| **Form filling patterns** | Detect repeated form submissions to same domains | High — data entry automation candidates |

### The Killer Feature: URL Sequence Detection

This is the hack that no competitor does. A simple state machine:

```typescript
// Pseudocode — runs in extension background script
const recentTabs: { url: string; timestamp: number }[] = [];

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  recentTabs.push({ url: new URL(tab.url).hostname, timestamp: Date.now() });

  // Keep rolling window of last 100 tab switches
  if (recentTabs.length > 100) recentTabs.shift();

  // Detect repeated sequences
  const sequences = findRepeatingSequences(recentTabs, {
    minLength: 2,     // at least 2 sites in sequence
    minOccurrences: 3, // repeated at least 3 times
    timeWindow: 7 * 24 * 60 * 60 * 1000, // within 1 week
  });

  // Example detection:
  // "gmail.com → sheets.google.com → gmail.com → sheets.google.com"
  // repeated 12 times this week = HIGH automation candidate
  if (sequences.length > 0) {
    sendToMeldarAPI(sequences);
  }
});

function findRepeatingSequences(
  events: { url: string; timestamp: number }[],
  opts: { minLength: number; minOccurrences: number; timeWindow: number }
): DetectedSequence[] {
  // Sliding window + suffix array approach
  // Group by hostname to reduce noise
  // Look for n-grams that repeat above threshold
  const hostnames = events.map(e => e.url);
  const ngrams = new Map<string, number>();

  for (let len = opts.minLength; len <= 5; len++) {
    for (let i = 0; i <= hostnames.length - len; i++) {
      const gram = hostnames.slice(i, i + len).join(' → ');
      ngrams.set(gram, (ngrams.get(gram) || 0) + 1);
    }
  }

  return [...ngrams.entries()]
    .filter(([_, count]) => count >= opts.minOccurrences)
    .map(([sequence, count]) => ({ sequence, count }))
    .sort((a, b) => b.count - a.count);
}
```

**What this catches that nothing else does:**
- "Every Monday I go Gmail → Google Sheets → Gmail → Google Sheets for 2 hours" (the email-to-spreadsheet pattern from our research)
- "I check 3 apartment sites in sequence every morning" (the housing search pattern)
- "I open Instagram → TikTok → Instagram → TikTok → Twitter in a loop" (the doom scroll pattern)
- "I go to Jira → Slack → Jira → Slack 40 times a day" (the context switching pattern)

### Extension Architecture

```
meldar-extension/
  manifest.json          # Manifest V3, permissions: tabs, history, storage
  background.js          # Service worker: tab tracking, sequence detection
  popup.html/js          # Simple popup: "Meldar is watching. X patterns found."
  content.js             # Optional: copy-paste detection on active pages

Data flow:
  Extension → local storage (rolling 7-day window)
            → batched upload to Meldar API every 6 hours
            → only sends: domains, timestamps, sequences, durations
            → NEVER sends: full URLs, page content, form data
```

**Manifest V3 permissions (minimal):**

```json
{
  "manifest_version": 3,
  "name": "Meldar — Find Your Time Sinks",
  "permissions": ["tabs", "history", "storage", "alarms"],
  "host_permissions": [],
  "background": {
    "service_worker": "background.js"
  }
}
```

Note: `tabs` + `history` permissions are standard and non-scary in the Chrome Web Store review. No `<all_urls>`, no content script injection, no network request interception. This passes review fast.

### Chrome Web Store Timeline

- **Review time:** 1-3 business days for a simple extension with standard permissions
- **No OAuth verification needed** — the extension talks to our own API
- **Auto-publish:** Extensions can auto-update, so we iterate fast

---

## The Third Cheat: Skip the Analysis Engine, Use the LLM

The original architecture has a three-pass deterministic analysis engine. For the MVP, that's over-engineered.

**The hack:** Dump everything into one big Claude prompt.

```typescript
async function analyzeUser(userId: string): Promise<AutomationOpportunity[]> {
  const signals = await db.activitySignals.findMany({ where: { userId } });

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6-20250326',
    max_tokens: 4096,
    system: `You are Meldar's analysis engine. Given raw activity signals
from a user's digital life, identify the top 5 automation opportunities.

For each opportunity:
1. title: Short, non-technical name
2. description: 2-3 sentences explaining the problem in the user's own context
3. estimated_weekly_minutes_saved: conservative estimate
4. complexity: simple | moderate | complex
5. automation_approach: one sentence on how Meldar would fix this
6. confidence: 0-1 based on how much evidence supports this
7. contributing_signals: which input signals led to this conclusion

Rank by: (minutes_saved * confidence * frequency). Prioritize things that are
ACTUALLY automatable over things that are merely time-consuming.

IMPORTANT: Be specific to THIS user. "Check email less" is useless.
"Auto-sort your 47 weekly notification emails into a digest" is useful.`,
    messages: [{
      role: 'user',
      content: `Here are ${signals.length} activity signals for this user:\n\n${JSON.stringify(signals, null, 2)}`
    }],
  });

  return parseOpportunities(response);
}
```

**Why this works for MVP:**
- Signals array for a typical user is 50-200 items = ~5K-20K tokens. Well within context window.
- Claude is better at spotting non-obvious cross-domain patterns than our deterministic scorer (e.g., "you search for recipes AND you have 3 grocery store visits per week AND your calendar shows meal prep time — meal planning automation")
- Cost: ~$0.01-0.05 per analysis. We can afford this at beta scale.
- Zero code to maintain for the scoring engine

**When to switch to deterministic:** When we have >1000 users and can validate which patterns the LLM consistently identifies. Then codify those into the deterministic engine from the original architecture.

---

## The Fourth Cheat: Screen Time Via Screenshot Is Actually Great

The original architecture treated Screen Time screenshots as a fallback workaround. Reframe: it's a **feature**.

**Why screenshots are better than an API would be:**
- Works on iOS AND Android (Digital Wellbeing screenshots work the same way)
- Zero integration work
- Users already know where to find it
- Claude Vision handles the OCR perfectly
- One screenshot = complete daily app usage breakdown

**The UX flow:**

```
"Take a screenshot of your Screen Time (here's how)"
  → Show iOS/Android toggle with exact tap path:
    iOS: Settings → Screen Time → See All App & Website Activity → screenshot
    Android: Settings → Digital Wellbeing → Dashboard → screenshot

"Drop it here"
  → Claude Vision extracts: [{app, category, minutes}, ...]
  → Instant signal: "You spent 4.2 hours on social media yesterday"
```

**Cost:** One Claude Haiku Vision call per screenshot = ~$0.002. Negligible.

---

## Revised Architecture: The Shortcut Stack

```
┌─────────────────────────────────────────────────────────┐
│                    DATA COLLECTION                        │
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Conversational│  │ Google Takeout│  │ Screen Time   │  │
│  │ Chat          │  │ Upload        │  │ Screenshot    │  │
│  │ (5 min)       │  │ (drop a zip)  │  │ (drop a pic)  │  │
│  │               │  │               │  │               │  │
│  │ Week 1        │  │ Week 2        │  │ Week 1        │  │
│  │ $0/user       │  │ $0/user       │  │ $0.002/user   │  │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘  │
│          │                  │                   │          │
│          ▼                  ▼                   ▼          │
│  ┌────────────────────────────────────────────────────┐   │
│  │           ActivitySignal[] (unified)                │   │
│  └────────────────────────┬───────────────────────────┘   │
│                           │                               │
│  ┌──────────────┐         │                               │
│  │ Browser       │         │                               │
│  │ Extension     │────────►│                               │
│  │ (install once)│         │                               │
│  │               │         │                               │
│  │ Week 3        │         │                               │
│  │ $0/user       │         │                               │
│  └──────────────┘         │                               │
│                           │                               │
└───────────────────────────┼───────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    ANALYSIS                               │
│                                                           │
│  Single Claude Sonnet call                                │
│  Input: all signals as JSON (~5-20K tokens)               │
│  Output: ranked automation opportunities                  │
│  Cost: $0.01-0.05 per user                               │
│                                                           │
│  Week 1 (chat-only) → Week 2 (+ Takeout) → richer input │
└────────────────────────────┬──────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                    OUTPUT                                  │
│                                                           │
│  "Here's what you should automate"                        │
│  Top 5 opportunities, ranked, personalized                │
│  Each with: time saved, complexity, what we'd build       │
│                                                           │
│  → CTA: "Want us to build this?" (tier 2/3 upsell)      │
└─────────────────────────────────────────────────────────┘
```

---

## Revised 4-Week Plan

### Week 1: Chat + Screenshots = Instant Value

**Goal:** User lands on page, has a 5-minute conversation, drops a Screen Time screenshot, gets automation suggestions. No accounts, no installs, no OAuth.

- Conversational discovery API (streamed, Claude Sonnet)
- Screen Time screenshot upload + Claude Vision OCR
- Single LLM analysis call (signals → opportunities)
- Results page: "Your top 5 automation opportunities"
- **Backend:** 2 API routes. 1 database table. That's it.
- **Effort:** 3-4 days backend, 3-4 days frontend

### Week 2: Takeout Upload = 10x More Data

**Goal:** "Want better results? Drop your Google Takeout here."

- Guided Takeout wizard (3 screens with instructions)
- Zip upload to Vercel Blob (signed URL, 1-hour TTL)
- Streaming parser for My Activity JSON files (Chrome, Search, YouTube)
- Calendar iCal parser
- Re-run analysis with combined signals (chat + screenshot + Takeout)
- **Backend:** Upload route, 4 parsers (~200 lines each), Inngest job for async processing
- **Effort:** 5 days backend, 2-3 days frontend

### Week 3: Browser Extension = Ongoing Signal

**Goal:** "Install Meldar to keep discovering automation opportunities over time."

- Chrome extension (Manifest V3): tab tracking, history access, sequence detection
- Extension background service worker (~300 lines)
- API endpoint for batched signal ingestion from extension
- Extension popup showing "X patterns detected this week"
- Auto-refresh analysis when new extension data arrives
- Chrome Web Store submission (1-3 day review)
- **Effort:** 4 days extension, 2 days backend, 1 day integration

### Week 4: Polish + Privacy + GDPR

Same as original Week 4, but with less infrastructure debt because we skipped OAuth.

- Automated data purge (Vercel Cron)
- GDPR export + erasure endpoints
- Privacy policy
- Error handling, rate limiting, loading states
- User accounts (Auth.js — but just email/password, no OAuth complexity)
- **Effort:** Full week

---

## What We Cut (and Why It's Fine)

| Cut | Savings | Why It's Fine |
|-----|---------|---------------|
| OAuth integration layer | ~1.5 weeks dev + weeks of Google verification | Takeout gives us the SAME data without any API |
| Token management + refresh | ~2 days dev + ongoing bugs | No tokens, no bugs |
| Deterministic analysis engine | ~3 days dev | LLM does it better at beta scale, codify later |
| Gmail API integration | ~2 days dev | Takeout mbox headers give us the metadata |
| Drive API integration | ~1 day dev | Low signal-to-noise, not worth it for MVP |
| Background sync jobs | ~2 days dev | One-shot analysis from uploads. Extension handles ongoing. |
| Multiple database tables for signal types | ~1 day dev | Everything is `activity_signals` + `automation_opportunities`. Two tables. |

**Total saved: ~3 weeks of development.** Redirected to polish, extension, and the conversational UX.

---

## Cost Per User (The Math)

| Component | Cost | Notes |
|-----------|------|-------|
| Chat (5 messages avg) | ~$0.02 | Sonnet, ~2K tokens per exchange |
| Screen Time OCR | ~$0.002 | Haiku Vision, one image |
| Takeout parsing | $0 | Local compute, no LLM needed |
| Analysis call | ~$0.03 | Sonnet, ~15K input + 2K output |
| Extension signal ingestion | $0 | Just database writes |
| **Total per discovery** | **~$0.05** | At 1000 users = $50 total |

Compare to the OAuth architecture: same cost PLUS infrastructure overhead, token management bugs, and Google verification delays.

---

## The Unfair Advantage Summary

1. **Google Takeout as API bypass** — same data, zero integration, zero verification wait
2. **Browser extension as always-on sensor** — detects workflow patterns no self-report or API can catch
3. **Screenshot OCR for Screen Time** — works on iOS + Android, zero API, $0.002/user
4. **LLM-as-analysis-engine** — skip building a scoring system, let Claude do it for $0.03/user
5. **Chat-while-waiting UX** — the Takeout export wait time (2-10 min) becomes engagement time for the conversational questionnaire

The "proper" architecture from Sections 1-10 is where we migrate once we have traction. The shortcut architecture is how we get there.

---
---

# ADDENDUM 2: The "Reclaim Your Data" Viral Architecture

**Date:** 2026-03-30
**Context:** Founder directive — "Big Tech collected your data for a decade. They used it to sell you ads. Now take it back and use it for YOURSELF."

This changes the emotional arc of the entire backend. The same file-upload pipeline from the addendum above, but reframed through a revenge + empowerment lens that has massive implications for how we design the analysis output, the onboarding flow, and the shareable results.

---

## How "Reclaim Your Data" Changes the Backend

The pipeline stays the same: user exports their data, uploads it, we analyze it. But the **output format** changes fundamentally. We're no longer just showing "here are your automation opportunities." We're showing the user what Big Tech knew about them and how they can weaponize that knowledge for themselves.

### The Reveal: What They Knew About You

Before we show automation opportunities, we show a **data reveal** — a shocking, shareable summary of what the platforms collected.

This is a new analysis step that runs BEFORE the automation opportunity ranking:

```typescript
interface DataReveal {
  // The shock stats — designed to be screenshotted
  totalDataPoints: number;        // "Google tracked 47,293 actions in the last 90 days"
  totalHoursTracked: number;      // "That's 2,160 hours of your life they watched"
  topCategories: RevealCategory[]; // What they knew, ranked

  // The emotional pivot
  whatTheyUsedItFor: string;      // "They used this to show you 12,400 targeted ads"
  whatYouCanUseItFor: string;     // "You can use it to save 6.5 hours every week"

  // The shareable card
  shareCard: ShareableCard;        // Pre-rendered OG image for social sharing
}

interface RevealCategory {
  category: string;               // "Your browsing habits"
  dataPointCount: number;         // 12,847
  summary: string;                // "Google knows you visit Reddit 11 times a day"
  whatTheyDid: string;            // "They used this to target you with productivity tool ads"
  whatYouCanDo: string;           // "Meldar can build you a custom Reddit digest so you check once"
}
```

### The Analysis Prompt Changes

The LLM analysis call now has a two-phase output:

```typescript
async function analyzeWithReveal(signals: ActivitySignal[]): Promise<{
  reveal: DataReveal;
  opportunities: AutomationOpportunity[];
}> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6-20250326',
    max_tokens: 4096,
    system: `You are Meldar's analysis engine. You have two jobs:

JOB 1 — THE REVEAL (designed to shock and go viral):
Analyze the user's exported data and generate a "data reveal" showing
what Big Tech knew about them. Make it visceral and specific:
- Total data points tracked
- The most surprising thing their data reveals about their habits
- What platforms used this data for (ad targeting, engagement optimization)
- Frame each insight as: "They knew X. You can USE X to Y."

Be dramatic but factual. Every stat must come from the actual data.
Don't exaggerate. The truth is shocking enough.

JOB 2 — THE OPPORTUNITIES (same as before):
Top 5 automation opportunities ranked by time saved.

The emotional arc is: SHOCK ("they knew all this?") → ANGER ("they used it
to sell me ads") → EMPOWERMENT ("now I'M using it to get my time back").`,
    messages: [{
      role: 'user',
      content: `${signals.length} activity signals:\n\n${JSON.stringify(signals, null, 2)}`
    }]
  });

  return parseRevealAndOpportunities(response);
}
```

### Backend Support for Shareable Results

The viral angle needs one new backend capability: **generating shareable result cards**.

```
POST /api/insights/share
  → Takes the user's DataReveal
  → Generates a shareable card image (OG-compatible, 1200x630)
  → Returns a unique share URL: meldar.io/r/{hash}

GET /r/{hash}
  → Public page showing the anonymized reveal stats
  → "Google tracked 47,293 of my actions. I turned their data into 6.5 hours/week back."
  → CTA: "Reclaim YOUR data →"
```

**Implementation:** Use `@vercel/og` (Satori) to generate OG images server-side. No canvas library needed. The share page is a simple static route with dynamic OG tags.

**Privacy for shared cards:** The share page shows ONLY aggregate stats (total data points, hours saved, category breakdown). Never specific browsing history, search queries, or app names. The user controls what appears on the card before sharing.

```typescript
interface ShareableCard {
  headline: string;            // "Google tracked 47,293 of my actions"
  subheadline: string;         // "I turned their data into my personal time-saving app"
  stats: {
    dataPoints: number;        // 47,293
    platformsReclaimed: string[]; // ["Google", "Meta", "Apple"]
    weeklyTimeSaved: string;   // "6.5 hours"
    topOpportunity: string;    // "Auto-sorting 200+ weekly notification emails"
  };
  shareUrl: string;            // meldar.io/r/abc123
  ctaText: string;             // "Reclaim your data →"
}
```

### The Onboarding Emotional Arc (Backend Perspective)

The backend now needs to support a specific emotional sequence in its API responses:

```
Phase 1: CURIOSITY
  POST /api/discovery/chat (first message)
  → "What platforms do you use daily?"
  → Backend tags: google, meta, apple, etc.

Phase 2: ACTION
  → Tutorial: "Let's get your data back from Google. It's YOUR right."
  → Backend serves: guided tutorial steps for selected platforms
  GET /api/tutorials/google-takeout

Phase 3: WAIT (productive)
  → "While Google prepares your file, let's talk..."
  → Conversational questionnaire runs during export wait
  POST /api/discovery/chat (subsequent messages)

Phase 4: UPLOAD
  POST /api/upload/process
  → Backend parses the export file

Phase 5: SHOCK (the reveal)
  GET /api/insights?include=reveal
  → Backend returns DataReveal + AutomationOpportunities
  → Response is structured for the frontend to animate:
    First: the data reveal (shock stats, what they knew)
    Then: the pivot ("but here's what YOU can do with it")
    Finally: the opportunities (ranked, actionable)

Phase 6: SHARE
  POST /api/insights/share
  → Generate shareable card
  → Return share URL

Phase 7: ACT
  → "Want us to build this for you?"
  → Tier 2/3 upsell
```

### The "Off-Facebook Activity" Gold Mine

Meta's data export includes `your_off-facebook_activity.json` — a file most users don't know exists. It lists every app and website that reported the user's activity back to Meta via the tracking pixel.

From a backend perspective, this is the most viral data source because:

1. **Users don't know it exists** — the shock value is enormous
2. **It shows tracking they never consented to** — apps they used sent data to Meta without them realizing
3. **The list is long** — typically 100-400 apps/websites

```typescript
// Example extraction from off-facebook activity
interface OffFacebookActivity {
  appName: string;    // "Spotify", "Duolingo", "H&M"
  eventCount: number; // How many times this app reported to Meta
  eventTypes: string[]; // "PURCHASE", "CUSTOM", "PAGE_VIEW"
}

// Backend generates a reveal like:
// "342 apps reported your activity to Meta. Including Spotify (847 events),
//  your banking app (234 events), and your period tracker (12 events).
//  They used this to build a profile worth $47.20 in ad revenue.
//  Let's use that same profile to save you 6 hours a week."
```

**The estimated ad revenue stat:** We can estimate what the user's data is "worth" to the platform based on public ARPU (Average Revenue Per User) figures. Google ARPU ~$67/quarter in the US, Meta ~$52/quarter. This gives us a concrete dollar figure: "Your data generated approximately $238 in ad revenue last year. You got $0 of that."

### New API Endpoints

```
Tutorials
  GET  /api/tutorials/:platform        — step-by-step export guide
  GET  /api/tutorials/:platform/steps   — individual steps with screenshots

Reveal
  GET  /api/insights?include=reveal     — insights + data reveal stats
  POST /api/insights/share              — generate shareable card + URL
  GET  /r/:hash                         — public share page (Next.js route)

Revenue estimate
  GET  /api/insights/data-value         — estimated ad revenue from user's data
```

### Backend Cost Impact

The reveal analysis adds minimal cost:

| New Component | Cost | Notes |
|---------------|------|-------|
| Reveal generation | +$0.01 | Same LLM call, slightly longer output |
| Share card image | ~$0 | `@vercel/og` runs server-side, no external API |
| Share page hosting | ~$0 | Static Next.js route, CDN-cached |
| **New total per user** | **~$0.06** | Up from $0.05 |

---

## Revised Architecture Diagram (Final)

```
┌──────────────────────────────────────────────────────────────┐
│                "RECLAIM YOUR DATA" FLOW                        │
│                                                                │
│  User exercises GDPR Article 20 rights                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │
│  │ Google    │  │ Meta     │  │ Apple    │  │ Screen Time │  │
│  │ Takeout   │  │ Download │  │ Privacy  │  │ Screenshot  │  │
│  │ (guided)  │  │ (guided) │  │ (guided) │  │ (guided)    │  │
│  └─────┬─────┘  └─────┬────┘  └─────┬────┘  └──────┬──────┘  │
│        │              │             │               │          │
│        ▼              ▼             ▼               ▼          │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Auto-detect format → Platform-specific parser          │  │
│  │  (LLM fallback for unknown formats)                     │  │
│  └──────────────────────┬──────────────────────────────────┘  │
│                          │                                     │
│  ┌───────────────┐       │                                     │
│  │ Conversational │       │                                     │
│  │ Chat           │──────►│                                     │
│  │ (during wait)  │       │                                     │
│  └───────────────┘       │                                     │
│                          │                                     │
│  ┌───────────────┐       │                                     │
│  │ Browser        │       │                                     │
│  │ Extension      │──────►│                                     │
│  │ (ongoing)      │       │                                     │
│  └───────────────┘       │                                     │
│                          ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              ActivitySignal[] (unified)                   │  │
│  └──────────────────────┬──────────────────────────────────┘  │
│                          │                                     │
└──────────────────────────┼─────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                     ANALYSIS (single LLM call)                │
│                                                                │
│  Phase 1: DATA REVEAL                                          │
│    "Google tracked 47,293 actions. Meta got reports from 342   │
│     apps. Your data generated ~$238 in ad revenue last year."  │
│                                                                │
│  Phase 2: THE PIVOT                                            │
│    "They used YOUR data to profit. Now use it for YOURSELF."   │
│                                                                │
│  Phase 3: OPPORTUNITIES                                        │
│    Top 5 automation opportunities, personalized, actionable    │
│                                                                │
│  Cost: ~$0.04 per user                                        │
└──────────────────────┬─────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│                     OUTPUT + VIRALITY                          │
│                                                                │
│  Results page: Reveal → Pivot → Opportunities                  │
│  Shareable card: "I reclaimed my data. Here's what I found."  │
│  Share URL: meldar.io/r/{hash} (public, anonymized)           │
│  CTA: "Want us to build this for you?"                        │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

---

## Final Summary

Three layers of the architecture, each building on the last:

1. **Sections 1-10** — The "proper" OAuth + deterministic-engine architecture. Target state for when we have traction and need reproducibility at scale.

2. **Addendum 1** — The shortcut architecture. Replace OAuth with self-exports, skip the scoring engine, use LLM directly. Same data, 3 weeks less dev.

3. **Addendum 2 (this section)** — The viral layer. Same pipeline as Addendum 1, but the output is reframed as "reclaim your data" with a shock-reveal → empowerment → action arc. Adds shareable cards, data-value estimates, and an emotional onboarding sequence. Minimal backend cost (+$0.01/user).

The backend doesn't fundamentally change between Addendum 1 and 2 — it's the same file upload + LLM analysis pipeline. What changes is the **analysis prompt** (add the reveal phase), the **API response shape** (include DataReveal alongside opportunities), and one new feature (shareable card generation via `@vercel/og`).

The "reclaim your data" framing is a marketing/positioning decision that costs us approximately 1-2 days of additional backend work (share endpoints, reveal schema, card generation) but potentially 100x the organic distribution.
