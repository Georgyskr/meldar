# Database Optimizer Review — Project File Storage Architecture

**Reviewer persona:** Database Optimizer
**Date:** 2026-04-06
**Decision under review:** How Meldar v3 stores Sonnet-generated project source files (Option A pure R2 vs Option B Postgres-manifest + R2-content hybrid)
**Stack context:** Next.js 16 + Drizzle + Neon Postgres (serverless HTTP driver) + Cloudflare Workers + Cloudflare Sandbox SDK

---

## Section 1 — Recommendation

**Option B (Postgres manifest + R2 content), with a normalized `project_files` table instead of a `manifest jsonb` column.**

The hybrid is correct, but the coding agent's specific *shape* of the hybrid (a single `manifest: jsonb` column on `projects`) has a lifetime-of-product index problem that I'd fix on day one.

---

## Section 2 — Query plan analysis

I'll write each plan twice: Option A as proposed (pure R2, Postgres only holds project metadata, no file rows), Option B as I'd ship it (a `project_files` table where each row is a file, plus a `builds` table that snapshots the manifest by reference). I also note where Option B-as-the-coding-agent-proposed-it (manifest jsonb blob on `projects`) breaks.

### Hot path 1 — Workspace entry (load project + all files)

**Workload:** "User opens project abc123. Need ownership check + every file's path + R2 key + size, so we can stream them into a fresh sandbox."

**Option A pseudo-EXPLAIN:**
```
Plan A1: Postgres roundtrip
  Index Scan using projects_pkey on projects
    Index Cond: (id = 'abc123')
    Filter: (user_id = $current_user)         -- ownership check
    Rows: 1   Buffers: shared hit=3
  -> 1 HTTP roundtrip to Neon (~30-80ms)

Plan A2: R2 LIST (no Postgres)
  R2 ListObjectsV2
    Prefix: 'projects/abc123/'
    MaxKeys: 1000
    Rows: ~30 file metadata entries (key, size, etag, lastModified)
  -> 1 R2 API call (~50-150ms eventually-consistent across CF edge)

Total: 2 sequential roundtrips, mixed services, ~80-230ms
```
Issues with A: R2 LIST is eventually consistent across regions and pagination cost grows linearly. There is no way to get "files at version X" without also storing version metadata somewhere — meaning Option A actually forces you to push version state into R2 keys (`@v123`) and re-derive the manifest from a LIST every time. That's fine at 30 files, painful at 200, and reads "the wrong way around" for an indexable system.

**Option B (normalized `project_files`) pseudo-EXPLAIN:**
```
Plan B1: Single Postgres roundtrip with join
  Nested Loop  (cost=0.42..38.71 rows=30)
    -> Index Scan using projects_pkey on projects
         Index Cond: (id = 'abc123')
         Filter: (user_id = $current_user)    -- ownership check
         Rows: 1
    -> Index Scan using idx_project_files_project_active on project_files
         Index Cond: (project_id = 'abc123')
         Filter: (deleted_at IS NULL)         -- partial index, no filter step
         Rows: 30   Buffers: shared hit=4
  -> 1 HTTP roundtrip to Neon (~30-80ms)

Then: 30 parallel R2 GETs from the worker against R2 (~30-80ms each, in parallel ~80-150ms total)
Total: ~110-230ms wall clock, but predictable, indexed, and isolated per project
```
The single-roundtrip auth+manifest fetch is the win. In Option A we either pay two roundtrips (Postgres for ownership, R2 for LIST) or we lose the ownership check and accept that anyone with a project ID can LIST.

**Option B-as-coding-agent-proposed (manifest jsonb on projects):**
```
Plan B'1: Index Scan using projects_pkey on projects
    Index Cond: (id = 'abc123')
    Filter: (user_id = $current_user)
    Rows: 1   Buffers: shared hit=3, toast=N
    Output: id, user_id, manifest          -- TOAST decompression for jsonb
```
This works for read but hides a write-amplification trap I'll cover in Section 7.

**Verdict:** B-normalized > B-jsonb > A.

### Hot path 2 — Build streaming write (Sonnet writes a file, persist + return version pointer)

**Workload:** "Sonnet just streamed `src/app/page.tsx` (3.2 KB). Persist it, return the new version pointer. Called ~50 times in a single Build."

**Option A pseudo-EXPLAIN:**
```
Plan A: R2 PUT only
  R2 PutObject
    Key: 'projects/abc123/src/app/page.tsx@v124'
    Body: <3.2 KB>
  -> 1 R2 API call (~40-100ms)

Then: Postgres write to update some "current version pointer"?
  - In pure R2, where does the "what's the current version of this file" pointer live?
  - Option: encode it in another R2 object ('projects/abc123/HEAD')
    -> R2 GET HEAD, mutate JSON, R2 PUT HEAD
    -> RACE CONDITION between concurrent file writes in the same Build
  - Option: rely on R2 LIST sorted by lastModified
    -> Eventually consistent. Build streaming will read stale state.

Total: 1 + N R2 calls per file, no atomicity, race-y if Build streams in parallel.
```
This is the "pure R2" trap. R2 has no compare-and-swap on objects. The moment you need a "current version" concept that two writers might race on, you need a transactional store. The coding agent's instinct here is right.

**Option B (normalized) pseudo-EXPLAIN:**
```
Plan B: R2 PUT then Postgres UPSERT
  Step 1: R2 PutObject
    Key: 'projects/abc123/src/app/page.tsx@v124'  -- content-addressed or version-suffixed
    Body: <3.2 KB>
    -> ~40-100ms

  Step 2: INSERT INTO project_files ... ON CONFLICT (project_id, path)
          DO UPDATE SET r2_key = EXCLUDED.r2_key,
                        version = project_files.version + 1,
                        size = EXCLUDED.size,
                        updated_at = NOW()
    Index Scan using ux_project_files_project_path  -- the unique index drives the upsert
      Index Cond: ((project_id = 'abc123') AND (path = 'src/app/page.tsx'))
      Rows: 1   Buffers: shared hit=4, dirtied=1
    -> 1 Neon roundtrip (~30-80ms)

Total: ~70-180ms per file write. Atomic, idempotent, indexed.
```

**At 50 writes per Build:** Option A is 50 R2 calls + 50 mutations of HEAD = ~100 calls + a guaranteed race. Option B is 50 R2 PUTs + 50 single-row upserts = ~100 calls but every upsert is O(log n) on a unique index, no races, and the orchestrator can pipeline them. This is roughly equivalent in latency but vastly better in correctness. **Critical:** the upsert MUST hit a unique index on `(project_id, path)`, otherwise it degrades to a seq scan and a 50-write Build will eat your connection budget.

### Hot path 3 — Build rollback (restore to state at build abc999)

**Workload:** "Restore project abc123 to the exact file set it had at build abc999."

**Option A:**
```
Plan A: R2 LIST + filter by versioned key prefix
  R2 ListObjectsV2
    Prefix: 'projects/abc123/'
    -> Returns ALL versions of ALL files
    -> Application code must walk the list and pick the version <= build's timestamp
    -> No way to know which version was "current" at build time without a separate index
  -> Multiple LIST pages if file count > 1000 versions

Plan B for A: store a per-build manifest object in R2
    'projects/abc123/builds/abc999/manifest.json'
    -> 1 R2 GET (~50-100ms)
    -> Then 1 GET per file (~30 files * ~50-100ms parallel = ~80-150ms)

Total with manifest object: ~130-250ms
```
Workable, but: (a) you've now invented a denormalized manifest store inside R2 with no integrity constraints, (b) deleting files in compaction has to scan every build manifest to know if a file version is still referenced.

**Option B (normalized + builds table):**
```
Plan B: Index Scan using build_files
  Nested Loop  (cost=0.42..40.21 rows=30)
    -> Index Scan using builds_pkey on builds
         Index Cond: (id = 'abc999')
         Filter: (project_id = 'abc123')      -- safety check
         Rows: 1
    -> Index Scan using idx_build_files_build_id on build_files
         Index Cond: (build_id = 'abc999')
         Rows: 30                             -- (path, r2_key, size) per file
  -> 1 Neon roundtrip (~30-80ms)

Then: COPY build_files for build abc999 INTO project_files (upsert by path)
  -> 1 batched UPSERT on conflict, ~50-100ms

Then: R2 GETs are NOT needed for rollback metadata; only when sandbox rehydrates do we read the bytes.

Total: ~80-180ms for the rollback metadata flip. R2 reads happen lazily on next workspace entry.
```
The decisive feature here is that "what files did build abc999 produce" is a primary-key range scan in B, and a "walk the entire R2 prefix and infer" exercise in A. **The DB optimizer's heart sings.**

### Hot path 4 — List all projects for user xyz (dashboard)

**Workload:** "Show all my projects with last-modified timestamp." 1-N projects per user, mostly N=1 for free tier, up to ~10 for Builder.

**Option A:**
```
Plan A1: SELECT id, name, updated_at FROM projects WHERE user_id = 'xyz'
  Index Scan using idx_projects_user_id on projects
    Index Cond: (user_id = 'xyz')
    Rows: ~3   Buffers: shared hit=4
  -> 1 Neon roundtrip (~30-80ms)

Plan A2: For each project, R2 LIST to get last-modified file
  3 * R2 LIST calls
  -> ~150-450ms parallel
```
This is a CLASSIC N+1. The dashboard renders 3 projects, you fan out 3 R2 LIST calls. At 10 projects, 10 LISTs. R2 LIST is not free — it's eventually consistent, charged per request, and metered separately from GET. Avoid.

You can mitigate by storing `lastModifiedAt` on `projects` and updating it on every Build. Then A1 is sufficient. But now you've added denormalized state to Postgres anyway — half a step toward Option B.

**Option B:**
```
Plan B: SELECT id, name, last_build_at FROM projects WHERE user_id = 'xyz' ORDER BY last_build_at DESC
  Index Scan using idx_projects_user_lastbuild on projects
    Index Cond: (user_id = 'xyz')
    Order by index, no sort step
    Rows: ~3   Buffers: shared hit=4
  -> 1 Neon roundtrip (~30-80ms)
```
**One roundtrip. Index-ordered. Done.** This is the win that pure R2 cannot match without inventing a sidecar index.

### Hot path 5 — Diff two builds (what changed between abc111 and abc222)

**Workload:** "Learning explainer: 'Your last Build added 3 files and modified 2.'"

**Option A:**
```
Plan A: R2 LIST both prefixes, walk in application code
  R2 ListObjectsV2 (prefix abc111)
  R2 ListObjectsV2 (prefix abc222)
  -> Application diffs the two lists in memory by (path, etag/version)
  -> 2 R2 calls + O(N) memory work
```
No way to do this server-side or pushdown. Worker has to materialize both file lists to compare.

**Option B:**
```
Plan B: SQL set difference
  WITH a AS (SELECT path, content_hash FROM build_files WHERE build_id='abc111'),
       b AS (SELECT path, content_hash FROM build_files WHERE build_id='abc222')
  SELECT 'added' AS kind, b.path FROM b LEFT JOIN a USING (path) WHERE a.path IS NULL
  UNION ALL
  SELECT 'removed', a.path FROM a LEFT JOIN b USING (path) WHERE b.path IS NULL
  UNION ALL
  SELECT 'modified', a.path FROM a JOIN b USING (path) WHERE a.content_hash <> b.content_hash;

Plan:
  Hash Anti Join  (cost=8.42..16.84 rows=5 width=80)
    Hash Cond: (a.path = b.path)
    -> Index Scan idx_build_files_build_id on build_files a (build_id='abc111') Rows: 30
    -> Hash on Index Scan idx_build_files_build_id on build_files b (build_id='abc222') Rows: 32
  Result: 5 rows
  -> 1 Neon roundtrip (~40-90ms)
```
**One roundtrip. SQL does the diff in milliseconds in-memory because each build is small.** This is the difference between "the database does its job" and "the application reimplements set operations because it can't push down."

### Hot path 6 — Delete project (GDPR right-to-erasure)

**Workload:** "Remove all traces of project abc123."

**Option A:**
```
Plan A: R2 LIST + R2 DELETE batch
  R2 ListObjectsV2 (prefix='projects/abc123/')
    -> All versions of all files, possibly thousands of objects after many builds
  R2 DeleteObjects (batches of 1000)
    -> Multiple calls for large projects
  Postgres DELETE FROM projects WHERE id='abc123'
    -> Index Scan using projects_pkey, Rows: 1, Buffers: shared dirtied=1
```
Two systems to clean up, no transaction boundary. If R2 deletes succeed and Postgres delete fails, you have an orphaned project metadata row pointing at nothing (not great). If Postgres delete succeeds and R2 delete fails (rate limit, network), you have orphaned R2 objects (a GDPR audit problem). You need a job queue to retry, and you need a "project deletion in progress" state in Postgres.

**Option B:**
```
Plan B: Soft-delete + async hard-delete
  Step 1: UPDATE projects SET deleted_at = NOW() WHERE id='abc123'
    Index Scan using projects_pkey, Rows: 1
    -> 1 Neon roundtrip (~30-80ms)
  -> Returns immediately to user

  Step 2: Background job (Inngest / Vercel cron) reads soft-deleted projects:
    SELECT r2_key FROM project_files WHERE project_id='abc123'  -- index on project_id
    Then R2 batch delete those keys
    Then DELETE FROM project_files, build_files, builds, projects WHERE project_id='abc123'
       (cascading FK with ON DELETE CASCADE)
    -> 1 transaction, atomic in Postgres
```
Soft-delete + background hard-delete is the only way to give the user a fast UX response AND maintain GDPR audit trail (deleted_at timestamp proves compliance) AND be safe under partial failure (the job retries until all R2 keys are gone, then drops the rows). Option A can also do this pattern but needs the same Postgres state to track it — at which point you're back to Option B by another name.

---

## Section 3 — Index strategy

### Option A indexes (Postgres side, minimal)
```
projects (
  id              uuid PK,
  user_id         uuid NOT NULL,
  name            text NOT NULL,
  tier            text NOT NULL,
  created_at      timestamptz NOT NULL,
  updated_at      timestamptz NOT NULL,
  deleted_at      timestamptz
)

CREATE INDEX idx_projects_user_active
  ON projects (user_id, updated_at DESC)
  WHERE deleted_at IS NULL;
```
That's it. Everything else lives in R2.

**Bloat at 1000 users / ~3 projects each = 3000 rows:** ~250 KB index. Trivial.
**Bloat at 10000 users:** ~2.5 MB. Still nothing.

### Option B indexes (recommended shape)

```
projects (
  id              uuid PK,
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  tier            text NOT NULL,
  current_build_id uuid REFERENCES builds(id) ON DELETE SET NULL,  -- "HEAD"
  last_build_at   timestamptz,
  created_at      timestamptz NOT NULL,
  updated_at      timestamptz NOT NULL,
  deleted_at      timestamptz
)

CREATE INDEX idx_projects_user_lastbuild
  ON projects (user_id, last_build_at DESC NULLS LAST)
  WHERE deleted_at IS NULL;
-- Drives Hot Path 4 (dashboard). Partial index excludes soft-deleted rows so the index stays lean.

CREATE INDEX idx_projects_current_build
  ON projects (current_build_id)
  WHERE current_build_id IS NOT NULL;
-- Supports rollback: "find projects whose HEAD points at this build" (rare but cheap to maintain).


project_files (
  id              uuid PK DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  path            text NOT NULL,                  -- 'src/app/page.tsx'
  r2_key          text NOT NULL,                  -- 'projects/abc/src/app/page.tsx@v124' or content-addressed
  content_hash    text NOT NULL,                  -- sha256 of bytes, used for diff and dedup
  size_bytes      integer NOT NULL,
  version         integer NOT NULL DEFAULT 1,
  created_at      timestamptz NOT NULL DEFAULT NOW(),
  updated_at      timestamptz NOT NULL DEFAULT NOW(),
  deleted_at      timestamptz
)

CREATE UNIQUE INDEX ux_project_files_project_path
  ON project_files (project_id, path)
  WHERE deleted_at IS NULL;
-- THE most important index. Drives the upsert in Hot Path 2 (Build streaming write).
-- Partial so soft-deleted rows don't break uniqueness if the user deletes & re-creates a file.
-- Column order: project_id first because every query filters by it; path second.

CREATE INDEX idx_project_files_project_active
  ON project_files (project_id)
  WHERE deleted_at IS NULL;
-- Drives Hot Path 1 (workspace entry: load all files for project).
-- Partial keeps it lean.

CREATE INDEX idx_project_files_content_hash
  ON project_files (content_hash);
-- Supports content dedup across projects (Phase 2 optimization, not required Sprint 1).
-- Cheap if added now.


builds (
  id              uuid PK,
  project_id      uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_build_id uuid REFERENCES builds(id) ON DELETE SET NULL,
  status          text NOT NULL,                  -- 'streaming' | 'completed' | 'failed' | 'rolled_back'
  triggered_by    text NOT NULL,                  -- 'user_prompt' | 'kanban_card' | 'rollback'
  token_cost      integer,
  created_at      timestamptz NOT NULL DEFAULT NOW(),
  completed_at    timestamptz
)

CREATE INDEX idx_builds_project_created
  ON builds (project_id, created_at DESC);
-- Drives the build history list ("show me all my builds for this project, newest first").
-- Composite (project_id, created_at DESC) is index-ordered so no sort step.

CREATE INDEX idx_builds_project_status
  ON builds (project_id, status)
  WHERE status IN ('streaming', 'failed');
-- Partial index for the "in-flight" set, which is tiny. Used for resume-incomplete-build flows.


build_files (
  build_id        uuid NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
  path            text NOT NULL,
  r2_key          text NOT NULL,
  content_hash    text NOT NULL,
  size_bytes      integer NOT NULL,
  PRIMARY KEY (build_id, path)
)
-- The PK IS the index for Hot Paths 3 and 5. (build_id, path) is the natural composite PK
-- because build_files is a join table with no surrogate identity.

CREATE INDEX idx_build_files_content_hash
  ON build_files (content_hash);
-- Supports diff (Hot Path 5) and content garbage collection of orphaned R2 keys.
```

### Notes on column order and partial indexes

- **Composite key column order is always "filter first, then sort/range":** `(project_id, last_build_at DESC)` because we always filter by project_id and then range over time. Reversing it would force a seq scan on the project predicate.
- **Partial indexes (`WHERE deleted_at IS NULL`)** keep the live working set small. At 10000 users with 5% deletion rate, a partial index is 5% smaller AND, more importantly, the planner picks it preferentially because it's cheaper.
- **No GIN index needed.** This is the win of the normalized schema — we never need to index *into* a JSONB blob, because there are no JSONB blobs in the hot path. (See Section 4 for why this matters more on Neon than on bare-metal Postgres.)

### Bloat projections (B-tree at scale)

| Scale | projects | project_files | builds | build_files | Total index pages |
|---|---|---|---|---|---|
| 1000 users (~3 projects, ~30 files, ~5 builds each) | 3K rows | 90K rows | 15K rows | 450K rows | ~25 MB indexes |
| 10000 users (~5 projects, ~50 files, ~20 builds each) | 50K rows | 2.5M rows | 1M rows | 50M rows | ~2-3 GB indexes |

The 10K-user projection is interesting: `build_files` is the dominant table (every Build snapshots every file). At 50M rows with `(build_id, path)` as PK, the B-tree is ~1.5 GB. **This is fine for Postgres but worth knowing.** Mitigations available later: (a) only keep build_files for the last N builds per project, (b) content-address the R2 keys so identical files dedupe (no `@v` suffix, just sha256-keyed), (c) prune build_files for builds older than 30 days unless the user explicitly pins them. None of these need to ship Sprint 1.

---

## Section 4 — Neon serverless context

This is where the calculus tilts hard, and it's worth being explicit because it's not obvious.

### What the Neon HTTP driver actually is

`@neondatabase/serverless`'s HTTP driver doesn't keep persistent TCP connections. Every query is `fetch()` to Neon's pooler endpoint. That means:

1. **Each query has TLS + HTTP overhead.** Within an edge worker, the second query to the same Neon endpoint reuses the keep-alive socket and is much cheaper, but the *first* query of each invocation pays the full TLS handshake (~50-150ms cold).
2. **No prepared statement caching across requests.** Every query is parsed and planned fresh. The planner cost on a 4-table join of small tables is negligible (<1ms), but it adds up if you fan out many queries instead of one.
3. **Per-query payload size limit.** Neon's HTTP driver has a 64MB body limit (it's the Cloudflare Workers `fetch()` body cap, which Neon inherits). In practice, individual JSONB column values are constrained by Postgres's TOAST mechanism (~1GB theoretical, ~10MB practical) but the round-trip must fit in the HTTP body cap.
4. **Cold start of Neon compute can be 200-500ms** if the project is in autosuspend. Workers Paid plus Neon's keep-warm Pro tier is the answer there, but it's a real number to plan around.

### How this changes Option A vs Option B

**Argument for Option A getting *better* under Neon:**
"Every Postgres roundtrip is expensive on Neon, so doing N+1 Postgres queries is bad. Pure R2 has fewer Postgres roundtrips, so it should win."

**Counter-argument (the correct one):**
This is true *only if* you can structure all your hot paths as zero-or-one Postgres queries. Let's check:
- Hot Path 1 (workspace entry) — Option B is **one** query (auth+manifest). Option A is **one** Postgres query (auth) + **one** R2 LIST (manifest). So both are one Postgres roundtrip, but A also pays the R2 LIST.
- Hot Path 2 (Build streaming write) — Option B is **one** upsert per file. Option A is **zero** Postgres + **two** R2 calls (PUT file, mutate HEAD). A wins on Postgres count but loses on race safety.
- Hot Path 4 (dashboard) — Option B is **one** query. Option A is **one** Postgres query + **N** R2 LISTs (or one denormalized timestamp on projects). A is strictly worse.
- Hot Path 5 (diff) — Option B is **one** Postgres query (SQL set difference). Option A is **two** R2 LISTs + application diff. A is strictly worse.

**Conclusion:** Neon's per-query cost makes you want to *fold work into a single SQL query*, not avoid SQL altogether. SQL is uniquely good at "give me everything I need in one roundtrip with joins and filters." R2 is good at "give me one big object." When you need lots of small structured fact lookups, R2 forces a fan-out pattern that Neon makes expensive *via the same mechanism* that makes Option A look attractive in the abstract.

### The Postgres-blob-as-manifest trap

The coding agent's "manifest: jsonb on projects" version of Option B is the version Neon punishes hardest. Here's why:

1. **Every file write rewrites the entire manifest.** A Build with 50 file writes does 50 reads + 50 writes of the entire jsonb blob. At 30 files * ~80 bytes per entry = 2.4 KB, that's 50 * 4.8 KB = 240 KB of manifest churn per build. Not catastrophic, but pure waste.
2. **JSONB updates are not in-place.** Postgres MVCC writes a new row version per UPDATE, which means 50 dead tuples per build to vacuum. 1000 builds/day = 50K dead tuples/day on the projects table.
3. **TOAST decompression on every read.** A jsonb manifest > ~2 KB gets TOASTed. Reads decompress on every fetch, even if you only need one field.
4. **You can't index into it cheaply.** "Find the r2_key for src/app/page.tsx in project abc" requires either a GIN index on the jsonb (which is slow to update on every write) or a full jsonb decode + walk in application code.

The normalized `project_files` table avoids ALL of these. Per-file write touches one row. No TOAST. The unique index drives upsert in O(log n). **Indexes are exactly the right tool, jsonb blobs are not, and Neon makes the cost of using the wrong tool more visible.**

### Does Option B hit Neon's HTTP size limit?

For typical projects (~30-50 files, ~5-50 KB each, ~500 KB total), no. Even reading every file row in one query is a few KB of JSON over the wire. The R2 bytes never touch Postgres. The 64MB cap is irrelevant.

For huge projects (~500 files): a `SELECT * FROM project_files WHERE project_id = ?` returns ~500 rows of (path, r2_key, content_hash, size, version, timestamps) = maybe 200 KB serialized. Still nothing.

The size cap *would* be a problem if you stored file contents in jsonb (which the coding agent's first proposal — JSONB-blob-in-Postgres — would have done). The agent rightly rejected that. The hybrid as I'm proposing it never sends file bytes through Postgres at all.

### Practical Neon configuration recommendations

- Use the **pooled connection string** (Neon's `pgbouncer` endpoint) for the HTTP driver, not the unpooled compute endpoint. The HTTP driver handles this transparently if you give it the pooled URL.
- Enable **autoscaling** but set min compute > 0 to avoid the 200-500ms cold start on first query of an idle period. This is a paid feature on Neon Pro and is worth it for Sprint 1.
- Set `statement_timeout = 5s` at the role level. Long-running queries on Neon HTTP either time out cleanly or eat your worker's CPU budget. Enforce the limit.

---

## Section 5 — Migration strategy

### Option A migration (description)

**Forward:**
- Add `projects` table with columns: `id` (uuid PK), `user_id` (uuid FK to users with ON DELETE CASCADE), `name` (text), `tier` (text), `created_at` / `updated_at` / `deleted_at` (timestamptz).
- Foreign key from `projects.user_id` to `users.id`.
- One partial composite index `(user_id, updated_at DESC) WHERE deleted_at IS NULL`.
- That's the entire Postgres surface.

**Down:**
- `DROP TABLE projects`.
- The R2 bucket cleanup is **not** part of the Drizzle migration (Drizzle doesn't manage R2). You'd need a separate manual cleanup step or a runbook entry. **This is itself a reason to lean toward Option B: down-migrations should be reversible from a single tool, and Drizzle can't reverse R2 state.**

**Backfill:** None — Sprint 1 is greenfield.

### Option B migration (description)

**Forward:**
- Add `projects` table: `id`, `user_id` (FK with CASCADE delete), `name`, `tier`, `current_build_id` (FK to builds, nullable, ON DELETE SET NULL), `last_build_at` (timestamptz nullable), `created_at`, `updated_at`, `deleted_at`.
- Add `builds` table: `id`, `project_id` (FK CASCADE), `parent_build_id` (FK SET NULL, self-referential), `status` (text), `triggered_by` (text), `token_cost` (integer nullable), `created_at`, `completed_at` (nullable).
- Add `project_files` table: `id`, `project_id` (FK CASCADE), `path` (text), `r2_key` (text), `content_hash` (text), `size_bytes` (integer), `version` (integer default 1), `created_at`, `updated_at`, `deleted_at`.
- Add `build_files` table: composite PK `(build_id, path)`, `build_id` (FK CASCADE), `path`, `r2_key`, `content_hash`, `size_bytes`. No surrogate ID — the natural composite is the PK.
- Indexes (per Section 3): one partial composite on projects by user, the unique partial composite on project_files for upsert, the project-scoped indexes on builds, and the content-hash indexes for diff/dedup.
- Constraints: CHECK constraint on `builds.status IN ('streaming','completed','failed','rolled_back')`. CHECK on `project_files.size_bytes >= 0`. CHECK on `version >= 1`.
- The `projects.current_build_id` FK creates a circular dependency with `builds.project_id`. Drizzle handles this by creating tables first without FKs, then adding FKs in a second migration step. Mark `current_build_id` as `DEFERRABLE INITIALLY DEFERRED` so a single transaction can insert a project + a build + flip the head pointer.

**Down:**
- Drop in reverse FK order: `build_files`, `project_files`, drop FK from `projects.current_build_id`, drop `builds`, drop `projects`.
- All indexes are auto-dropped with their tables.
- R2 cleanup is again outside Drizzle's scope, BUT with Option B, the soft-delete pattern means R2 cleanup is handled by the application's existing background job. You roll back the schema change, and the R2 reaper continues to clean orphaned objects whose `project_files` rows are gone. **This is the safer rollback story.**

**Backfill:** None for Sprint 1. Future-proofing: any migration that adds a new column to `project_files` (e.g., adding `mime_type`) needs `DEFAULT NULL` or a backfilled value, applied with `ALTER TABLE ... ADD COLUMN ... DEFAULT ... NOT NULL` *only* if the table is small enough; otherwise add as nullable, backfill in batches, then add NOT NULL constraint. At 2.5M rows (10K-user scale), don't ever do `ALTER TABLE project_files ADD COLUMN x NOT NULL DEFAULT 'foo'` in one shot — that's a full table rewrite under a long lock.

**Index creation in production:** For all future indexes added to `project_files`, use `CREATE INDEX CONCURRENTLY`. Drizzle Kit's default migration emits plain `CREATE INDEX` which takes an `ACCESS EXCLUSIVE` lock for the duration. On Neon, this stalls every other query against the table. **Sprint 1 can use plain CREATE INDEX because the table is empty. Anything after Sprint 1 must use CONCURRENTLY.** Drizzle doesn't emit CONCURRENTLY automatically — you'll need a custom SQL migration.

---

## Section 6 — N+1 and connection pool risks

### Where Option A creates landmines

1. **Dashboard fetch.** "List my projects with file counts" — naive code fetches projects (1 Postgres query), then calls R2 LIST per project (N R2 calls). The R2 fan-out is metered and rate-limited per Worker. At 200 concurrent dashboard loads, that's potentially 1000+ R2 LIST calls in one second. Worker subrequest limits (50 per request on the Free plan, 1000 on Paid) become a real ceiling.
2. **Project export.** "Download my project as a zip" — application fetches the manifest (R2 LIST), then GETs each file (N R2 GETs). The GETs are sequential or pipelined in the worker. There's no Postgres-side equivalent risk here, but the worker holds N pending fetch promises in memory.
3. **Build streaming.** Each file write does R2 PUT + a manifest mutation (read-modify-write of HEAD). Concurrent writes within a single Build race on the manifest unless you serialize them in the orchestrator. **Concurrent writes from two Builds on the same project (rollback during a new Build, or two browser tabs) corrupt HEAD silently.**

### Where Option B creates landmines

1. **N+1 on `builds` per project.** Bad code: `SELECT * FROM projects WHERE user_id = ?` then per-project `SELECT * FROM builds WHERE project_id = ? ORDER BY created_at DESC LIMIT 1`. **Fix:** one query with a `LATERAL` join, or precompute `last_build_at` on `projects` (which the schema above does). Drizzle's relational query API will produce the N+1 if you write `db.query.projects.findMany({ with: { builds: true } })` without `limit`. You want either `db.query.projects.findMany({ with: { latestBuild: true } })` with a custom relation, or a single hand-written SQL with `DISTINCT ON`.
2. **Loading individual files.** Per-file Postgres lookups when rehydrating a workspace. **Fix:** always batch — `SELECT path, r2_key FROM project_files WHERE project_id = ?` returns the whole manifest in one row set.
3. **Background jobs vs user queries.** If a Stripe webhook handler does a bulk pre-warm (creating builds, inserting build_files, etc.) at the same time a user query runs, both compete for Neon compute. **Fix:** use separate Neon roles with different quotas if it becomes a problem; for Sprint 1, just keep the webhook fast (single transaction, no row-level locks held across HTTP calls).

### Connection pool exhaustion

Neon's default pool size on a 0.25 CU compute is 64 connections. The HTTP driver multiplexes over this pool. Risk surfaces:

- **Workers fanning out.** A single worker invocation can issue many parallel queries. At Workers Paid concurrency (1000 simultaneous worker invocations) with 4 queries each, that's 4000 in-flight queries against a 64-connection pool. The HTTP driver queues. Latency goes up. 
- **Long-running queries.** Anything > 1 second blocks a connection from the pool. A 5-second statement_timeout + a runaway query under load = pool starvation in <1 minute. **Always set statement_timeout.**
- **Prepared statement / pooler mode.** Neon's pooler uses transaction pooling, which means you cannot use session-level features (LISTEN/NOTIFY, prepared statements that span requests, temporary tables across calls). Drizzle is fine with this; just don't write code that assumes session continuity.

**Sprint 1 concrete recommendations:**
- Scale Neon compute to 1 CU minimum from day one. The 0.25 CU pool is not enough for the workload Sprint 1 envisions (Build streaming = bursts of 50 upserts per click).
- Set `statement_timeout = 5s` and `idle_in_transaction_session_timeout = 30s` at the role level.
- Set `pg_stat_statements.max = 10000` and `track = all` so we capture every query for monitoring.
- Monitor `pg_stat_database.numbackends` and alert at 80% of pool capacity.

---

## Section 7 — What the founder and coding agent are missing

The agent's argument is centered on three things: listing cost, diff cost, rollback atomicity. All real. But there's a fourth concern that's bigger than any of those, and it's the one that tilts the decision from "Option B is convenient" to "Option B is the only correct choice."

**Postgres is the only place where you can put a constraint that prevents corruption.** R2 has eventual consistency, no transactions, no foreign keys, no uniqueness, no atomic compare-and-swap. If you tell yourself "the manifest lives in R2 as a JSON object," you've voluntarily given up every single integrity tool a database provides. The first time two browser tabs from the same user attempt to write to the same project, or a Build retries after a partial failure, or a rollback overlaps with a save, you will silently end up with a manifest that doesn't match the file set R2 actually has. That bug will be undebuggable because there's no audit trail and no constraint to catch it. The user will see "I clicked save and my file is gone" and you won't be able to tell them why.

This is the database-specific problem the conversation is underweighting: **the file set is not just data, it's a graph of relationships with invariants that only a transactional database can enforce.** The invariants are: every project has a HEAD build, every build has a parent (or is the root), every file in HEAD exists in build_files for HEAD, every R2 key referenced by Postgres exists in R2 (this last one is a soft invariant — the R2 reaper is the enforcer). You write these as foreign keys and CHECK constraints in Postgres, and the database catches violations at write time. You can't write them in R2 at all.

The second underweighted concern: **observability.** When a user reports "my build is broken," you need to answer "what was the file set at build X, what was it at build X+1, what changed?" In Option B that's three SELECT queries against indexed columns. In Option A that's "let me parse the R2 LIST output, hope eventual consistency settled, and walk it manually." The DB optimizer's bias here is unapologetic: **databases are debugging tools too.** The cost of *not* having SQL access to your file history will become obvious the first week the founder is on a call with a paying user trying to figure out what went wrong.

---

## Section 8 — The one critical detail to get right

**The unique index on `project_files (project_id, path) WHERE deleted_at IS NULL` must exist on day one and must be a partial unique index.**

Here's the failure mode if you get this wrong: you ship without the unique index, the upsert in Hot Path 2 (Build streaming write) has nothing to conflict on, so Drizzle's `onConflictDoUpdate` falls back to a no-op or — worse — silently inserts duplicate rows. The first time it happens you have two `project_files` rows for the same `(project_id, 'src/app/page.tsx')` pair. Now `SELECT ... WHERE project_id = ? AND path = ?` returns two rows. The application picks one arbitrarily. The user sees their file flicker between two versions on every refresh because the row order changes with each query plan. By the time you notice (probably from a user bug report), you have hundreds of duplicates and need a complicated dedup migration that picks the right "winning" row per pair, all while the app is live.

Why partial: if you don't make it partial, soft-deleting a file and then re-creating one at the same path would conflict with the soft-deleted row and the upsert would fail. The partial index `WHERE deleted_at IS NULL` lets soft-deleted rows coexist with the live row at the same path.

Why column order matters: `(project_id, path)` not `(path, project_id)`. Every query filters by project_id first; column order in a B-tree must match the leftmost prefix of the predicate or you don't get an index scan. With the wrong order, "find file at path X in project Y" requires a full index scan over all paths (across all projects) and then a filter — millions of pages read at scale.

If you ship Sprint 1 with this index correct, everything else is recoverable. If you ship it wrong, you'll find out 3 months in when the duplicates start corrupting builds.

---

## Section 9 — pg_stat_statements monitoring

After Sprint 1 launches, the top 5 queries to watch:

| # | Query (normalized) | What it measures | Threshold to alert |
|---|---|---|---|
| 1 | `INSERT INTO project_files ... ON CONFLICT (project_id, path) DO UPDATE ...` | Per-file Build write latency. The hot path. | **mean_exec_time > 50ms** OR **calls/sec > 100** sustained. Either signals the upsert is missing the index or the orchestrator is fan-out-bombing the DB. |
| 2 | `SELECT ... FROM project_files WHERE project_id = $1 AND deleted_at IS NULL` | Workspace entry / sandbox rehydrate. Drives Hot Path 1. | **mean_exec_time > 100ms** signals the partial index is being skipped or the row count per project is exploding. |
| 3 | `SELECT ... FROM projects WHERE user_id = $1 AND deleted_at IS NULL ORDER BY last_build_at DESC` | Dashboard load. Hot Path 4. | **mean_exec_time > 50ms** for the p95 means the partial composite index isn't being picked (run EXPLAIN to confirm). |
| 4 | `SELECT ... FROM build_files WHERE build_id = $1` | Rollback fetch and diff fetch. Hot Path 3 + 5. | **mean_exec_time > 80ms** signals the (build_id, path) PK isn't being used (very rare; would mean the planner has bad stats — fix with ANALYZE). |
| 5 | `UPDATE projects SET deleted_at = NOW() WHERE id = $1` | GDPR soft-delete. Hot Path 6. | **mean_exec_time > 30ms** would be surprising on a single-row PK update; if it's high, suspect lock contention from a long-running transaction touching the same row. |

**Beyond per-query, also monitor:**
- `pg_stat_database.numbackends` (active connections) — alert at >80% of pool size.
- `pg_stat_database.xact_rollback` (rollback rate) — alert at >5% of total transactions; signals app errors or constraint violations.
- `pg_stat_user_tables.n_dead_tup` for `project_files` and `build_files` — alert at >20% dead-tuple ratio; signals autovacuum is falling behind.
- `pg_stat_user_indexes.idx_scan = 0` for any index after a week of traffic — that index is unused and should be dropped (Postgres still maintains it on every write, costing you).
- Slowest query in the past 1 hour — surface in the founder's daily cost dashboard.

`pg_stat_statements` is shipped by default on Neon but **not enabled per-database by default**; you need to `CREATE EXTENSION pg_stat_statements;` in the migration. Add this to Sprint 1's first migration so the data is there from day one.

---

## Closing note for the founder

The right shape is Option B with a normalized `project_files` table — not a `manifest jsonb` column. The single index that matters most is `ux_project_files_project_path` partial-unique on `(project_id, path) WHERE deleted_at IS NULL`. Get that right, enable `pg_stat_statements` from migration #1, set `statement_timeout = 5s`, and Sprint 1 will scale comfortably to your Phase 1 user count without database rework.
