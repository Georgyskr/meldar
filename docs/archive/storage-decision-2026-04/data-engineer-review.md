# Data Engineer Review — File Storage Architecture for Meldar v3 Sandbox

**Reviewer persona:** Data Engineer (pipeline reliability, schema contracts, observability, lineage)
**Decision under review:** Pure R2 (Option A) vs Postgres-manifest + R2-content hybrid (Option B) for storing the source files of Meldar-built apps
**Date:** 2026-04-06

---

## Section 1 — Recommendation

**Option B (Postgres manifest + R2 content), with versioned R2 keys and an immutable per-build manifest snapshot.** Treat the manifest as the schema contract; treat R2 as immutable cold storage.

---

## Section 2 — Data pipeline reasoning

A Build is a data pipeline. Sonnet is the producer, the manifest is the schema, R2 is the warehouse, and the sandbox is the consumer. Once you frame it that way, the answer stops being a matter of taste.

### Idempotency

A Build will be retried. Cards will be retried inside Builds. Sonnet will occasionally re-emit the same file with a slightly different newline. The orchestrator will be killed mid-stream by a Cloudflare Worker CPU limit and re-driven by the queue. **Every one of these is a normal Tuesday for a data pipeline,** and the storage layer must absorb them without producing duplicates, half-states, or "the file exists in R2 but the sandbox doesn't see it" mysteries.

- **Pure R2** is idempotent at the *object level* (`PUT` is last-writer-wins, same key, same content → no duplicate). It is **not idempotent at the build level**: if Build #5 writes 30 of 40 files and dies, R2 now contains a Frankenstein mix of Build #4 and Build #5 files under the same `projects/{id}/{path}` keys. There is no way to atomically roll back to "exactly the state of Build #4." That is the whole ballgame.
- **Hybrid B** lets you write content to R2 under a fresh versioned key (`projects/{id}/{path}@v{buildId}`) and only flip the manifest in Postgres after all writes succeed. The content writes are append-only and naturally idempotent (same key, same bytes), and the **manifest commit is the single transactional cut-over**. Postgres gives you exactly-once semantics where it matters: at the boundary where the *next read* picks which version to serve.

This is the standard write-ahead pattern from any decent ETL system. Iceberg, Delta, Hudi all work this way: write data files first, then atomically flip a metadata pointer. We are reinventing that, badly, if we go pure R2.

### Schema contracts

The Sonnet output is the upstream producer. **It is going to drift.** Sonnet 4.6 today emits `{path, content}`. Tomorrow you'll want `{path, content, language, kind: 'route' | 'component' | 'config'}` because the kanban UI wants to render different icons. Then `mode: '0644' | '0755'` for the Reddit Scanner shell hook. Then `binary: bool` for image assets. Each of those is a schema migration.

- **Pure R2** has no schema. Whatever Sonnet produces gets serialized into a key/value blob. There is no place to enforce "every file must have a non-null `language`" except in application code, which means three different code paths will disagree about what's required. **This is exactly the implicit-null-propagation problem** I am paid to prevent.
- **Hybrid B** puts the manifest in Postgres with a Drizzle/Zod schema. Schema drift becomes a migration, and Zod validation at the orchestrator boundary blocks malformed Sonnet output **before** it reaches storage. AGENTS.md already mandates Zod validation on AI output (`/Users/georgyskr/projects/pet/agentgate/AGENTS.md` lines 41-50) — Option B honors that rule natively, Option A pushes it out of band.

### Data lineage

Meldar's whole product loop is "the user prompts, Sonnet builds, the iframe shows the result." The minute a user says "wait, what changed between my last build and this one?" — and they will, because the *learning layer* explicitly promises to explain what just happened — you need to answer:

> "Which Build produced `app/page.tsx@v17`? Which kanban card was that Build serving? Which prompt did Sonnet receive? Which model variant was on?"

That is a lineage query. Lineage queries are cheap if you have a relational metadata layer with foreign keys. They are nightmarish if your only source of truth is "whatever R2 returns when you list a prefix" — you have no way to trace a file back to its causal upstream because R2 doesn't carry that metadata.

- **Pure R2** can stuff lineage into object metadata headers, but you can't query metadata across objects without listing them all. There is no `SELECT * FROM files WHERE buildId = ?`.
- **Hybrid B** gives you `builds → build_files → manifest_entries` as a clean star schema. Joining lineage to a preview deployment is one query.

### Medallion architecture parallel

There absolutely is one, and I think the founder and the coding agent missed it. Map it like this:

| Layer | What it is | Where it lives |
|---|---|---|
| **Bronze** (raw) | The exact byte stream Sonnet emitted, untouched, validated only at the Zod boundary | R2 at `projects/{id}/raw/{buildId}/{path}` |
| **Silver** (validated/dedup) | The canonical file set for a build, deduped, post-formatter, post-typecheck if you ever add one | Manifest in Postgres pointing at R2 keys at `projects/{id}/files/{contentHash}` |
| **Gold** (deployed) | The exact set of files that the running sandbox is reading right now | `projects.activeBuildId` foreign key into `builds`, plus the manifest snapshot on that build |

This isn't academic. Splitting Bronze from Silver lets you **replay**: if the formatter changes, you re-derive Silver from Bronze without rerunning Sonnet. That's gold for cost control — Sonnet calls are expensive, formatter passes are free.

Pure R2 collapses all three layers into one mutable bucket. You lose the ability to distinguish "what Sonnet actually said" from "what we ended up shipping," and you lose the ability to reprocess without rerunning the model.

### Observability

The failure mode I lose sleep over: **the file write succeeded in R2, but the sandbox is reading stale content.** With the cold-rehydrate path the spike documents (Day-2 login → fresh container → restore files from storage → start `next dev`), there are at least three points where this can silently break:

1. R2 write returned 200 but the bucket replication is still propagating → next read returns the old object
2. Manifest in Postgres updated but the orchestrator never told the sandbox to refresh → preview shows yesterday's code
3. The orchestrator wrote file A then died before file B → manifest says both exist but only A is in R2

Option B gives you the hooks to catch all three. The manifest is the **source of truth for "what the system thinks should exist,"** and a periodic reconciliation job (`SELECT manifest entries WHERE r2_get(key) IS NULL OR r2_get(key).etag != manifest.etag`) catches drift. Option A has nothing to reconcile against. The bucket *is* the truth, so the bucket is by definition consistent with itself, even when it's wrong.

This is the part where data engineers and software engineers most often talk past each other. "Eventual consistency is fine" is true for a CRUD app. It is not true for a system whose entire UX promise is "you click Build and your iframe updates." Stale-read in this product = the user thinks Meldar is broken.

### Backfill / reprocessing

When (not if) Meldar wants to:
- Re-run every project's last Build with a better system prompt to A/B test quality
- Apply a Prettier upgrade across all stored projects
- Migrate every project from Next.js 16 to Next.js 17
- Strip out a deprecated component from every starter

…you need a reprocessing job. Reprocessing on Option A means: list every prefix, fetch every object, transform, write back. There is no "give me all projects whose last build used Sonnet 4.5" query. You'd have to crawl the entire bucket. At 1000 users × 3 projects × 40 files = 120k objects per pass. At 100k users that's 12M list operations.

Option B reduces it to a Postgres query: `SELECT * FROM projects WHERE active_build.model_version < 'sonnet-4.6' LIMIT 1000` → reprocess in batches → write new build, flip pointer. **This is the difference between a backfill that takes an afternoon and a backfill that takes a week.**

### Soft deletes and audit columns

My hard rule: every row gets `created_at`, `updated_at`, `deleted_at`, `source_system`. R2 objects can carry custom metadata but you can't query on it without listing. Option B gives me audit columns natively on `manifest_entries` and `builds`. Option A makes me invent a parallel `file_audit_log` Postgres table that mirrors what I'd just put in the manifest anyway — at which point I've reinvented Option B with extra steps and a guaranteed inconsistency window.

### Exactly-once semantics for the Build stream

This is the killer. The Build interaction model is: kanban card runs → Sonnet streams a sequence of file writes → user sees the iframe update card by card. If Sonnet errors halfway, the user must see one of two states:
- **Pre-build state** (rollback to whatever was there before)
- **Mid-build state** (intentionally — partial progress shown so user can decide whether to retry or continue)

Both are legitimate product choices, but **Option A makes it physically impossible to choose the first one**, because there's no way to atomically un-write the files Sonnet already produced. You'd have to remember the previous content of each file before overwriting and roll back manually — i.e., reinvent versioning by hand. Option B gives you both options for free: writes go to a new `buildId` namespace, manifest commit is atomic, rollback is `UPDATE projects SET active_build_id = previous`.

---

## Section 3 — Failure modes

### Option A — Pure R2

| # | Failure mode | What happens | Mitigation in Option A |
|---|---|---|---|
| A1 | **R2 list-objects eventual consistency** | Build finishes, orchestrator immediately calls `list({prefix})` to verify, file written 50ms ago is missing from the listing → orchestrator reports the build as incomplete and retries. | None native. R2 is documented as strongly consistent for `GET` after `PUT` of the same key, but `LIST` consistency is weaker. Workaround = remember what you wrote and skip the list, which means you've already implemented a manifest in memory. |
| A2 | **Mid-build crash leaves Frankenstein state** | Sonnet writes 18 of 40 files, the orchestrator's CPU budget runs out (Workers have a 30s wall clock unless you're on Containers), the build is marked failed but R2 now has a half-old, half-new mix under live keys. The next sandbox read serves a broken project that won't compile. | Snapshot the previous state to a backup prefix before any write, restore on failure. This is manifesting Option B as an ad-hoc lifecycle hook. |
| A3 | **Diff is O(n × R2 GET)** | "What changed between Build 4 and Build 5" requires fetching every file from both prefixes and comparing. At 40 files × 2 builds × 1ms latency overhead × O(n) network round trips = 80+ R2 GETs per diff. Slow and expensive at scale. | Cache diffs in… a relational store. Which is Option B. |
| A4 | **No atomic rollback** | User clicks "undo my last build." With pure R2 there is no previous version to flip back to unless you've enabled R2 object versioning (extra cost, extra complexity, slow to enumerate). And even then, "restore the bucket state from 10 minutes ago" is not an R2 primitive — you'd script per-key version restoration. | Enable R2 versioning + write a versioning shim. You're now ~70% of the way to Option B with weaker guarantees. |
| A5 | **No way to know which files belong to which project without trusting the prefix** | If a path collision happens (two users get the same project slug), or if a corrupted write produces a key like `projects//app/page.tsx`, there is no foreign-key check to catch it. R2 will happily store nonsense. | Validate keys at write time. Still no way to detect orphaned writes after the fact without listing the bucket. |

### Option B — Postgres manifest + R2 content

| # | Failure mode | What happens | Mitigation in Option B |
|---|---|---|---|
| B1 | **Postgres write succeeds, R2 write fails** | Manifest says `app/page.tsx@v17` exists, R2 returns 404. Sandbox boots and immediately crashes on missing file. | Write order: R2 first, then Postgres manifest commit. The manifest is the *commit log* — until it's updated, the file is invisible to readers. Reconciliation job catches lingering "manifest exists, R2 missing" rows. |
| B2 | **R2 write succeeds, Postgres manifest write fails** | Orphaned R2 object accumulating cost forever. | Garbage collection cron: `SELECT r2_keys FROM r2.list() EXCEPT SELECT r2_key FROM manifest_entries` → delete. Run nightly. |
| B3 | **Drizzle migration drops a column the manifest depends on** | Manifest reads 500 with "column does not exist" → all sandbox loads fail. | Schema migration discipline: never drop columns in the same migration that introduces a replacement; always two-phase. This is a normal data engineering rule, not Meldar-specific. |
| B4 | **JSONB manifest column grows huge for projects with many files** | A 200-file project with 5 builds × full manifest snapshots = 1000 entries × ~200 bytes each = 200KB per project. At 100k projects = 20GB Postgres. Manageable but not free, and Postgres TOAST kicks in for jsonb >2KB which adds fetch overhead. | Normalize: instead of `projects.manifest jsonb`, use a `manifest_entries` table with rows. Then build the manifest at read time via a view or a denormalized cache. The hybrid Option B should *not* literally be a single jsonb column at any meaningful scale. |
| B5 | **Postgres becomes the bottleneck for the Build stream** | Each card streams ~5-10 file writes, each one needs an `INSERT` into `manifest_entries`. Neon serverless cold start adds latency to the first INSERT. | Batch the manifest writes per card (single transaction at end of card) instead of per file. Use Neon's connection pooling. The manifest write is much smaller than the R2 write so it shouldn't dominate. |

---

## Section 4 — What the founder and the coding agent are missing

**They are arguing about where to *store* files. The actual question is what the *system of record* for a project is.** That is a different question, and it has a different answer.

The founder's instinct ("R2 is the filesystem, that's clean") is the instinct of someone who thinks of files as the unit of truth. From a data engineering perspective, **files are not the unit of truth in this product.** The unit of truth is the *Build* — a causally-traceable event that has a producer (Sonnet + a kanban card + a model version + a prompt), a consumer (the sandbox), and a payload (the file set). Files are just the payload. If you optimize for storing the payload elegantly, you lose the ability to ask interesting questions about the producer or the consumer. If you optimize for storing the *event*, you can derive everything else.

Once you accept that the Build is the unit of truth, the storage shape stops being a debate. You need:
1. An events table (`builds`) that records what happened, when, by whom, with what model
2. A payload pointer (the manifest) that says "this build's outputs live at these R2 keys"
3. A bucket for the actual bytes
4. A project pointer (`projects.active_build_id`) that says "this is what the sandbox should currently serve"

That's Option B, but framed as event sourcing instead of as a "hybrid." The reason it matters is that the next ten product features the founder hasn't built yet — undo/redo, A/B testing builds, "show me what changed in the last 5 minutes," "let me share a frozen snapshot URL," "let me fork another user's project at a specific build" — are all trivially-cheap queries against an events-and-pointers model and impossible-to-implement nightmares against a "files in a bucket" model. The founder should not be making this decision based on architectural cleanliness in April 2026; they should be making it based on which product features cost weeks to retrofit later.

**The coding agent got the right answer for partially-wrong reasons.** Listing cost, diff cost, and rollback atomicity are all real, but they're consequences of a deeper truth: **R2 is a content-addressable cold store, not a database.** Anything you can do in R2 you can also do better, faster, and with stronger guarantees by putting a relational layer in front of it — *as long as you respect the boundary*. The thing the founder should fear is not "we're using two storage systems, that's complex," it's "we're treating R2 as a database." If the manifest is in Postgres and R2 only ever stores immutable content-addressed blobs, the system is *simpler* than pure R2, not more complex, because each layer does the one thing it's good at.

---

## Section 5 — Cost and SLA projection at scale

**Caveats:** I'm estimating against R2 pricing as of late 2025 (free egress, $0.015/GB/month storage, $4.50 per million Class A operations [PUTs], $0.36 per million Class B operations [GETs]) and Neon Postgres pricing on the Scale plan (~$69/month base + compute). Actual April 2026 numbers may differ — flag for verification before commitment.

**Workload assumption (1000 active users):**
- 1000 users × 3 projects × 40 files = 120,000 files at any given time
- Avg file size: ~5KB (small TS files dominate, occasional larger config or markdown)
- Total content storage: ~600MB
- 5 builds per project × 3 projects × 1000 users = 15,000 builds total per month
- Each build writes ~40 files = 600,000 PUTs/month
- Each workspace entry reads ~40 files (Day-2 cold rehydrate). Assume 5 entries/user/month = 200,000 GETs/month
- Each preview render hits ~10 files via the Next.js dev server file system reads (most stay in container memory). Negligible additional R2 traffic.

### Option A — Pure R2

| Cost component | 1k users | 10k users | 100k users |
|---|---|---|---|
| R2 storage | 600MB × $0.015 = **$0.01** | 6GB × $0.015 = **$0.09** | 60GB × $0.015 = **$0.90** |
| R2 PUTs (Build writes) | 600k × $4.50/M = **$2.70** | 6M × $4.50/M = **$27** | 60M × $4.50/M = **$270** |
| R2 GETs (rehydrates) | 200k × $0.36/M = **$0.07** | 2M × $0.36/M = **$0.72** | 20M × $0.36/M = **$7.20** |
| R2 LIST operations (the hidden killer) | ~50k LISTs (every workspace entry + every diff) at $4.50/M = **$0.23** | $2.25 | **$22.50** |
| Postgres (just user/project metadata) | Neon $19 base | Neon $69 | Neon scale ~$200-300 |
| **Total / month** | **~$22** | **~$99** | **~$501** |

### Option B — Postgres manifest + R2 content

| Cost component | 1k users | 10k users | 100k users |
|---|---|---|---|
| R2 storage (versioned, retained ~6 builds) | 600MB × 6 versions × $0.015 = **$0.05** | **$0.54** | **$5.40** |
| R2 PUTs (immutable content writes) | Same as A — 600k × $4.50/M = **$2.70** | **$27** | **$270** |
| R2 GETs (rehydrates via manifest lookup) | Same as A — **$0.07** | **$0.72** | **$7.20** |
| R2 LISTs | **~$0** (manifest replaces listing) | **~$0** | **~$0** |
| Postgres rows (manifest_entries: 600k builds × 40 entries = 24M rows over a year, ~10GB with indexes) | Neon $19 base | Neon $69 | Neon scale ~$300-400 |
| Postgres compute (manifest INSERTs during Builds) | Marginal — bundled into base | ~$10-20 extra | ~$50-100 extra |
| **Total / month** | **~$22** | **~$108** | **~$683** |

### Verdict at each scale

- **At 1k users:** roughly tied (~$22 either way). Cost is not the deciding factor at MVP scale.
- **At 10k users:** Option A is ~$10/month cheaper. Negligible.
- **At 100k users:** Option A is **~$180/month cheaper** in raw $$, but you've spent that many times over in eng hours building reconciliation, custom diff tooling, manual rollback, lineage queries, and the inevitable ad-hoc Postgres-side cache to make queries fast. **Option B's "extra" Postgres cost is buying you everything that makes the system operable at that scale.**

The cost answer is: it doesn't matter at MVP scale, and at 100k scale the "savings" of Option A are an illusion that gets eaten by ops time within the first month. **Pick the option that gives you the operational primitives you need, not the one that shaves $180/mo off your Cloudflare bill at a scale you might not reach for a year.**

### Neon serverless connection caveat

The Neon connection cost is real and worth flagging. Cloudflare Workers don't pool connections across requests by default — every Build write touches a fresh connection unless you use Neon's HTTP driver (`@neondatabase/serverless`). You should be using the HTTP driver anyway, but if you're not, the per-INSERT overhead during a streaming Build will dominate the manifest write time. I'd want to measure this in the Sprint 1 spike before committing to per-file inserts; the safe path is per-card batching.

---

## Section 6 — What I'd actually build (Option C)

If the founder asked me to design this from scratch with no prior framing, I'd build **Option B in event-sourced shape with content-addressable R2 keys**. Concretely:

### The data model

**`projects`** — one row per Meldar project
- `id`, `user_id`, `name`, `template_id`, `active_build_id`, `created_at`, `updated_at`, `deleted_at`

**`builds`** — one row per Build event (immutable, append-only)
- `id`, `project_id`, `parent_build_id` (the build this one was derived from — gives you a DAG, not just a list)
- `status` (`pending`, `streaming`, `committed`, `failed`, `rolled_back`)
- `model_version`, `prompt_hash`, `card_id`, `started_at`, `committed_at`, `error`
- Audit: `created_at`, `updated_at`, `source_system` (`sonnet`, `template`, `migration`)

**`build_files`** — one row per file in a build (the manifest, normalized)
- `build_id` (FK), `path`, `content_hash` (sha256 of the bytes), `size`, `mode`, `language`, `kind`
- R2 key derived: `projects/{project_id}/content/{content_hash}` (content-addressable, dedupe by hash)
- Unique on `(build_id, path)`

**R2 layout**
- `projects/{project_id}/content/{contentHash}` — immutable content, deduped by hash across all builds of all users (well, all builds of one user — you don't want to leak across user boundaries even at the storage layer, so content-address per project, not globally)
- That's the entire R2 schema. Two levels deep, fully append-only, garbage-collected by reference counting against `build_files`

### Why content-addressable

This is the upgrade over the founder's `path@v{version}` proposal. With content-addressing:
- **Free dedupe.** Two builds that didn't change `app/layout.tsx` reuse the exact same R2 object. Storage cost is proportional to *unique content*, not to *builds × files*. At 5 builds where 35/40 files are unchanged, you save 87% of storage.
- **Free integrity.** The content hash IS the address. If the bytes don't hash to the key, the data is corrupt. You don't need a separate checksum column.
- **Free immutability.** Nothing ever overwrites an R2 object — same hash → same content → no-op write. PUT idempotency is structural, not contractual.
- **Free rollback.** The old build's `build_files` rows still point at unchanged R2 objects. Rolling back is `UPDATE projects SET active_build_id = old`. Zero R2 operations.

### Why event-sourced builds (not just versioned files)

Because the Build is the unit of truth, not the file. Once builds are first-class events with parent pointers, you get:
- **Branching for free** — fork a project at any historical build
- **Comparing builds for free** — `SELECT * FROM build_files WHERE build_id IN (a,b)` and diff in SQL
- **Lineage for free** — "what model produced this preview?" is one join
- **Reproducibility** — "rebuild this same project with a new template" is a SQL query that produces the input set

### What about partial Builds during streaming?

Use `builds.status`:
- Sonnet starts streaming → `INSERT builds (status='streaming')`
- Each card writes its files → `INSERT build_files` rows + R2 PUTs (idempotent because content-addressed)
- Card finishes successfully → leave status as `streaming`, the partial state is visible to the sandbox via `active_build_id` pointer if the user wants live preview during build (which they do)
- Whole build finishes → `UPDATE builds SET status='committed', committed_at=now()`
- Whole build crashes → `UPDATE builds SET status='failed'`, **leave the rows in place** (no destructive cleanup), let the user choose: continue from partial, retry from scratch, or roll back

For "show me the build as it was before this kanban card started," you record `builds.parent_build_id` per card (each card creates a child build off the previous successful one). Streaming + safety + lineage all from one schema.

### What's harder with this design

- **Garbage collection is real work.** You need a reference-counted GC for orphaned content blobs. Run it nightly. It's a known pattern (Git does this), but it's code you have to write.
- **Migrations on `build_files` need to be careful.** It's the highest-cardinality table in the system; at 100k users it's tens of millions of rows. Add indexes thoughtfully and never do a full table rewrite.
- **Per-build manifest snapshots eat space if you store them denormalized.** Don't. Keep them as a query against `build_files` and only denormalize to a JSONB cache if profiling proves you need to.

---

## Section 7 — Questions the founder needs to answer before this is safe

1. **What does "rollback" mean to a user, and who decides?** Is it "automatic on Build failure" (then we need a clear definition of failure — Sonnet 500? Compile error? Type error? Runtime error?) or "user-triggered explicit undo button" (then we need to know how many steps back). The data model can support either, but the UX shape is different. Pin this before Sprint 1.

2. **Are Build files ever edited outside of a Build?** If a user can hand-edit `app/page.tsx` in a code panel between Builds, those edits are also files-in-the-system and need either to (a) become an implicit "manual build" record or (b) be lost when the next Sonnet build runs. Either is fine but they have to be the same answer everywhere or the lineage breaks.

3. **What is the retention policy on old builds?** Do we keep all builds forever (cool, lineage is intact, R2 grows), or trim after N builds per project (then we need a soft-delete + GC story, and old shareable preview URLs break), or trim after N days (then "share my project from last month" stops working)? This decides whether `build_files` is unbounded growth or has a steady state.

4. **What is the exportability contract?** When a user exports their project to their own hosting, do they get the latest committed build, the active build (which might be a partial in-progress build), or a chosen historical build? This affects whether the export endpoint reads `active_build_id` or `latest committed build_id`.

5. **Does Sonnet's output ever include binary files?** Images, audio, fonts, fixtures? Binary content is R2-friendly but jsonb-hostile, and the Zod schema for the orchestrator boundary needs a `binary: bool` field. Either confirm "text only forever" or design for binary on day one.

6. **What happens when Sonnet generates a `package.json` change?** The file write succeeds, but the sandbox container doesn't auto-`npm install`. Is dependency state part of "the project"? If yes, dep installation has to be a Build step with its own manifest entries (lockfile, node_modules tarball, who knows). If no, you have a class of Builds that produce code which doesn't run, and the user sees a broken iframe. Pin this — it's a UX-breaking bug waiting to happen.

7. **What is the consistency contract between the manifest and the running sandbox?** When a Build commits in Postgres, how does the sandbox find out? Push (orchestrator notifies via DO RPC) or pull (sandbox polls)? Push is faster, pull is more reliable. If push, what's the retry policy if the DO is asleep? **This is not a storage question, it is a propagation question, and it's where stale-read bugs will live.**

8. **What's the SLA on Day-2 cold rehydrate from storage?** The spike already flagged AC-1: <5s p50, <8s p95. With a normalized `build_files` table and 40 files to fetch from R2, that means ~40 R2 GETs per cold rehydrate. R2 GETs are ~10-30ms each. If we do them in parallel that's ~50ms; if they accidentally serialize that's 1.2s. **Confirm we are doing parallel GETs and measure it in Sprint 1**, because this is the path Hypothesis H4 (Day-2 retention) depends on.

9. **Is there a ceiling on file count per project?** If a Sonnet hallucination produces 5,000 files in a single Build, do we accept it, truncate it, or reject the build? The schema needs a `MAX_FILES_PER_BUILD` constant and the orchestrator needs to enforce it. Default suggestion: 200, configurable per tier.

10. **What's the disaster recovery story?** If R2 has a regional outage, can users still load their workspace from cache? If Neon goes down, can users see anything at all? The hybrid model means **both** are on the critical path, which is a multiplied availability risk. Acceptable for MVP, but worth designing the "we are degraded" UX before the first real outage.

---

## Bottom line

Pick **Option B**, but build it in the event-sourced + content-addressable shape from Section 6, not the literal `manifest jsonb` shape the coding agent proposed. The literal jsonb is fine for the first 100 projects and starts to hurt around 10k. Build it right the first time — the shape is not more code than the naive version, it's just *the right shape*.

The founder's instinct that "R2 is clean" is correct **for content storage**. R2 should be a cold, immutable, content-addressable bucket. The mistake is generalizing that cleanliness to the manifest, which is a relational problem with relational queries and relational guarantees. **Use the right tool for each layer and the system gets simpler, not more complex.**
