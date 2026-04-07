# Software Architect Review — Project File Storage

**Author:** Software Architect (independent review)
**Date:** 2026-04-06
**Subject:** R2-only vs Postgres-manifest+R2 hybrid for Meldar generated project files
**Status of decision:** Awaiting founder approval

---

## Section 1 — Recommendation

**Ship Option B (Postgres manifest + R2 content), but treat the manifest as a *projection* of an immutable build event log, not as the source of truth.**

One sentence, no hedging: the hybrid wins, but only if the manifest is regenerable from a `builds` event stream — otherwise you've just bought yourself two sources of truth instead of one.

---

## Section 2 — Architectural Decision Record

### ADR-001: Storage architecture for generated project files

**Status:** Proposed

**Context.**
Meldar v3 is a live-preview AI development environment. When a user clicks **Build** on a kanban card, Sonnet generates a batch of file writes (typically 5-30 files per card, ~20-50 files per project at MVP, total <500KB but unbounded by design — users will eventually drag in image assets, fonts, and small JSON datasets). The Cloudflare Sandbox container that runs the live preview is **transient by contract**: the sandbox spike (`spikes/cloudflare-sandbox/README.md`) confirms warm reuse is 4-5ms but cold rehydrate from stored files is the dominant Day-2 latency, with a hard acceptance criterion of **<5s p50, <8s p95** (AC-1 in the spike report).

This means *the stored representation IS the product*. The sandbox is a cache. Three operations dominate the storage layer's design budget:

1. **Restore** — fetch all current files for a project, write them into a fresh sandbox via `writeFile()`. Happens on every Day-2 entry, every cold start, every retry after sandbox eviction. Latency-critical.
2. **Build write** — Sonnet streams 5-30 file writes into the project as a single logical unit (one kanban card = one build = one atomic delta). Must be observable mid-stream (the user is watching the preview iframe).
3. **Diff/rollback** — show "what changed in this build" and "revert to before this build." A core part of the learning layer (`meldar-v3-product-spec.md` §3, "Learn by doing, 1-2 sentences at a time") and of trust ("you own everything you make", `meldar-v3-mvp-backlog.md` step #25 escape hatch).

The decision must be made now because Sprint 1 schema work (task #6) and the SandboxProvider adapter extraction (task #7) both depend on it. Schema choices made in haste here become migration debt within 8 weeks.

**Decision Drivers.**
In rough priority order (the founder's MVP is retention-bound, not scale-bound):

1. **Day-2 cold rehydrate latency** — must hit <5s p50 (AC-1). The storage layer's contribution to this budget is "list files + read all files." If this exceeds ~800ms it eats too much of the 5s budget.
2. **Time to ship MVP** — every week the founder is not in front of paying users is a week of unvalidated assumptions. Architecture must not block Sprint 1.
3. **Reversibility** — see Section 4. We are early enough that *being wrong cheaply* matters more than *being right expensively*.
4. **Atomic builds with rollback** — a build is an aggregate; a half-applied build is a corrupted user experience. Rollback is a Phase-1 feature, not Phase-3.
5. **Evolvability toward Phase-2 GitHub-backed storage** — the product narrative explicitly says "your app, you own it" (`meldar-v3-product-spec.md` taglines). This implies an export/handoff path. Storage shape today must not poison that path.
6. **Cost at 1000 paying users** — the founder is targeting EUR 19/mo Builder tier with a EUR 2/day API ceiling. Storage cost must be a rounding error against API spend, not a competing line item.
7. **Engineer-readability** — Meldar is a small team. Future engineers must be able to load the storage model into their head in <5 minutes.
8. **Operational blast radius** — if one store goes down, what works and what doesn't?

**Considered Options.**

- **Option A** — Pure Cloudflare R2. R2 list/get/put is the only API. Postgres holds user/project/billing/kanban only. Source of truth = whatever R2 returns.
- **Option B** — Postgres manifest (`projects.manifest jsonb` + `builds.manifestSnapshot jsonb`) + R2 content at versioned keys. Source of truth = Postgres manifest; R2 holds opaque content blobs.
- **Option C (proposed)** — **Postgres event log (`builds` + `build_files` rows) + R2 content at content-addressed keys (`projects/{projectId}/blobs/{sha256}`) + a `manifest` view materialized from the latest build.** Source of truth = the immutable `builds` event log; the manifest is a projection that can be rebuilt from events. This is Option B with the failure mode designed out.

**Decision Outcome.**
**Option C.** Justification against drivers:

- **Day-2 latency:** restore is one indexed Postgres query (`SELECT path, blob_sha FROM build_files WHERE build_id = (SELECT current_build_id FROM projects WHERE id = $1)`) + N parallel R2 GETs by content hash. Postgres query <20ms. R2 reads parallelize cleanly. Comfortably inside the 800ms storage-layer budget.
- **MVP velocity:** the schema is three tables (`projects`, `builds`, `build_files`). Drizzle migration is ~30 lines. No more complex than Option B.
- **Reversibility:** because content keys are content-addressed (sha256), the *blobs* are immutable and re-keyable to any future store. The manifest is a projection — drop and rebuild from events. This is the cheapest possible escape hatch (see Section 4).
- **Atomic builds:** a build row is the transaction boundary. Either all `build_files` rows for `build_id = X` exist or none do. Postgres gives this for free. Rollback = "set `projects.current_build_id = previous_build_id`." One UPDATE.
- **GitHub Phase-2:** the `builds` event log maps cleanly to git commits. Each build → one commit. `build_files` → tree entries. Content-addressed blobs → git blobs. We are accidentally building a thin git, which is exactly the abstraction we'll need.
- **Cost at 1000 users:** content addressing also gives free deduplication (every starter template's `package.json` is the same blob, written once). At ~50 files × ~1000 projects × ~10 builds = 500k `build_files` rows. Postgres laughs. R2 cost is ~$0.015/GB/mo + tiny per-op fees.
- **Readability:** "files belong to builds, builds belong to projects, blobs are content-addressed" is one sentence.
- **Blast radius:** R2 down → restore fails (read-degraded). Postgres down → list fails AND restore fails (full outage). Same as Option B. R2-only would fail-restore-only on R2 outage but lose the audit trail of what existed.

**Consequences.**

*Positive:*
- Rollback is a single Postgres UPDATE — no R2 churn.
- Diffs are a SQL query — `SELECT … FROM build_files WHERE build_id IN (a,b)`. Free.
- Content addressing gives free dedup across users sharing template files.
- The event log is a natural audit trail for the "Done-for-me" escape hatch — the founder can replay exactly what happened.
- Maps cleanly to GitHub when Phase 2 needs it.
- Restore is parallelizable across R2 by design (no sequential listing).

*Negative — what we are sacrificing:*
- **Two stores to keep consistent.** Postgres write must succeed before R2 write is considered "done"; orphan blobs in R2 are tolerable (cheap), orphan rows in Postgres are not. This needs a write-order discipline, documented in code, enforced in one helper function. Cost: ~50 lines of carefully reviewed code.
- **No "filesystem-shaped" mental model in R2.** You can't `aws s3 ls` a project and see its files — you see content-addressed hashes. Operationally weirder during incidents. Mitigation: build a tiny `meldar inspect project <id>` CLI that prints the manifest.
- **Slightly more code than Option A.** Maybe ~150 lines of repository code vs ~80. This is rounding error.
- **Postgres is in the hot path of cold restore.** If Neon has a hiccup, restores fail. Mitigation: cache the most recent manifest in Cloudflare KV with a 1-minute TTL (Phase 2, not MVP).

### Pros and cons table

| Concern | A: Pure R2 | B: Postgres manifest + R2 | C: Event log + content-addressed R2 |
|---|---|---|---|
| Source of truth | R2 listing | Postgres manifest | Postgres `builds` event log |
| List files (cold restore) | R2 LIST + sort + filter, ~100-300ms + paginated | 1 indexed SELECT, <20ms | 1 indexed SELECT, <20ms |
| Read N files | N GETs (parallel ok) | N GETs by manifest key | N GETs by content hash (parallel) |
| Atomic build write | None — partial state visible | Manifest UPDATE is atomic | Build row + child rows in one TX |
| Rollback | Copy old objects forward, races | Restore old `manifestSnapshot` jsonb | Flip `current_build_id` |
| Diff between builds | Two LISTs + N GETs + diff | Compare two jsonb manifests | SQL JOIN over `build_files` |
| Dedup across users | None | None | Free (content addressing) |
| Operational visibility | High in R2 console | Medium | Lower in R2, high in Postgres |
| Blast radius if R2 down | Total | Total for restore, list still works | Same as B |
| Blast radius if Postgres down | Restore still works (degraded) | Total | Total |
| Lines of repository code | ~80 | ~120 | ~150 |
| Maps to GitHub Phase 2 | Awkward (no commit semantics) | Awkward (manifest ≠ commit) | Natural (build = commit) |
| Reversibility cost (see §4) | Medium | Low-Medium | **Low** |
| Cost at 1000 users | R2 dominated, ~$5-15/mo | R2 + tiny Postgres, ~$5-15/mo | Same as B + free dedup savings |

---

## Section 3 — Bounded contexts and domain model

### Where does file storage sit?

In domain-driven design terms, **project file storage is a Supporting Subdomain, not a Core Subdomain.** Meldar's core subdomains are:

1. **Learning Orchestration** (the moat — kanban + step state machine + inline explainers)
2. **Model Routing** (Sonnet/Opus/Haiku triage — also a moat)
3. **Token Economy** (margin protection — operationally critical)

File storage is supporting because it does not differentiate Meldar from competitors — every code-gen tool has it. But it is *load-bearing for the core* because the live preview, the "Ship #1" milestone, and the rollback affordance all sit on top of it. Pick boring, well-understood patterns. Resist novelty.

**It is NOT pure infrastructure.** A pure infrastructure subdomain would be "swap S3 for R2 with no ripple." File storage has domain semantics: a *build* is a meaningful aggregate, not a bulk file dump. Treat it as a supporting subdomain with its own bounded context, not as a filesystem driver.

### Aggregates

```
Project (aggregate root)
  ├─ id, userId, slug, templateId, currentBuildId, createdAt
  └─ invariant: currentBuildId always points to a build whose project_id = self.id

Build (aggregate root)
  ├─ id, projectId, parentBuildId, kanbanCardId, status, createdAt, completedAt
  ├─ generatedBy: { model, promptHash, tokenCost }
  ├─ files: BuildFile[]
  └─ invariants:
       - either status='completed' AND files non-empty, OR status='draft' AND mutable
       - parentBuildId ≠ null except for the genesis build (template instantiation)

BuildFile (entity within Build)
  ├─ buildId, path, blobSha, size, mode
  └─ invariant: path is unique within a build

Blob (separate aggregate, lives in R2)
  ├─ sha256 (key), bytes
  └─ invariant: content-addressed, immutable, GC'd only when no BuildFile references it
```

**Why Build is its own aggregate root and not a child of Project:** because builds have a lifecycle (draft → streaming → completed → optionally rolled-back) that is independent of the project's lifecycle, and the Sonnet generation streams asynchronously while the project remains usable. If you nest Build inside Project, you serialize all writes through the Project aggregate, which kills concurrency on the orchestrator side. Two roots, linked by `currentBuildId`.

### Domain events the storage layer must emit

```
ProjectCreated         { projectId, userId, templateId, initialBuildId }
BuildStarted           { buildId, projectId, kanbanCardId, parentBuildId }
FileWritten            { buildId, path, blobSha, size }       // emitted per writeFile during streaming
BuildCompleted         { buildId, projectId, fileCount, totalBytes, durationMs }
BuildFailed            { buildId, projectId, reason }
ProjectRolledBack      { projectId, fromBuildId, toBuildId }
ProjectRestored        { projectId, buildId, sandboxId, restoreDurationMs }   // emitted by sandbox layer, consumed by analytics
```

The kanban execution engine (`meldar-v3-mvp-backlog.md` #20) consumes `BuildCompleted` to advance card status. The analytics layer (#27, #28) consumes all of these for friction tracking. The Done-for-me escape hatch (#25) consumes `BuildFailed` to surface "need help?" buttons. **Treat events as the public contract of this bounded context;** other contexts must never reach into the schema directly.

---

## Section 4 — Reversibility analysis (the section the founder most needs)

This is the section worth re-reading. The founder is making this decision **before having 1000 users to validate it.** That means the value of being right is bounded; the value of being *easy to unwind* is unbounded. Let's score reversibility honestly.

### Switching costs from each option

**If we ship Option A (pure R2) and want to move to B or C later:**
- Have to bulk-LIST every project's R2 keys, parse them into a manifest, write to Postgres. ~1 hour script per 10k projects, runnable as a backfill job.
- **But:** all the historical R2 keys were structured as `projects/{id}/{path}` — they encode no version. To reconstruct the *history* of files, you'd have to introspect R2 object versioning (if enabled) or accept that you can only recover the latest state. **History is gone.** This is the silent killer.
- Cost: medium for current state, **infinite for history**. You cannot retroactively give users a rollback feature that retains their pre-migration build history.
- Engineering effort: ~1 sprint.

**If we ship Option B (Postgres manifest + R2) and want to move to A or C later:**
- To A: just stop writing to Postgres, treat R2 as canonical. Trivial. ~1 day. (But you lose rollback and diff.)
- To C: a migration script that reads `builds.manifestSnapshot` jsonb and projects it into `build_files` rows. ~1 sprint. History is preserved because Option B already keeps `manifestSnapshot` per build.
- Cost: low. Engineering effort: 1-2 weeks.

**If we ship Option C (event log + content-addressed) and want to move to A or B later:**
- To A: write a job that materializes the latest manifest of every project to plain R2 keys. ~1 day. (Lose history.)
- To B: rename `build_files` to a manifest jsonb column. Trivial. ~3 days.
- Cost: low. Engineering effort: <1 sprint.

### The GitHub Phase-2 question

This is the one the founder should think hardest about. The product narrative says **"your app, you own it"** (`meldar-v3-product-spec.md` taglines, anti-positioning). At Phase 2, this almost certainly means: *push the user's project to a real GitHub repository under their account.*

| Starting from | Cost to migrate to GitHub-backed storage |
|---|---|
| Option A | Hard. Each R2 LIST → file → blob → tree → commit. No history → users get a single "Initial commit." A loss of trust. ~3 weeks. |
| Option B | Medium. Each `builds.manifestSnapshot` → one commit. History is preserved! But manifest jsonb has no semantic notion of *what changed*; you have to diff snapshots to compute commit deltas. ~2 weeks. |
| Option C | **Easy.** Every Build is already a commit-shaped object: parentBuildId = parent commit, build_files = tree, content-addressed blobs = git blobs. A migration script writes git objects directly. The semantic shape already matches. ~1 week. |

**This is the strongest argument for Option C.** We are not just picking storage; we are picking how easily we can fulfill the brand promise.

### The optionality argument

**Option C buys the most optionality.** The content-addressed blob layer is portable to any object store (S3, R2, B2, even SQLite blob columns for early dev) without the manifest layer caring. The event log is portable to any relational store. The event log is also a perfect substrate for *future* features the founder hasn't thought of yet:

- Per-build cost attribution (already implied by `generatedBy.tokenCost`)
- "Replay this build to a fresh project" → trivially a SQL SELECT
- Time-travel debugging for the Done-for-me hatch
- Branching projects (one user's build forked by another) — `parentBuildId` already supports DAGs

**Cost of this optionality: ~30 extra lines of code over Option B and one more table.** This is the cheapest insurance policy in the entire architecture.

---

## Section 5 — Quality attribute trade-offs

Scores 1 (poor) to 5 (excellent). Each justified.

| Attribute | A: Pure R2 | B: Manifest + R2 | C: Event log + R2 |
|---|---|---|---|
| Performance | 2 | 4 | 5 |
| Scalability | 4 | 4 | 5 |
| Availability | 3 | 3 | 3 |
| Consistency | 2 | 4 | 5 |
| Maintainability | 4 | 4 | 4 |
| Testability | 2 | 3 | 4 |
| Cost | 5 | 4 | 4 |
| Security | 4 | 4 | 4 |
| Evolvability | 2 | 3 | 5 |

**Performance.** R2 LIST + paginate is the bottleneck for A — measured at hundreds of ms for moderate prefixes, and worse with eventual consistency. B and C use a single indexed SELECT (~20ms) then parallel R2 GETs. C wins narrowly because content-addressed reads can be served from any blob store including a CDN edge cache.

**Scalability.** All options scale fine to 1000 users; storage is not the bottleneck — Sonnet API budget is. C edges ahead because content addressing dedups starter template files across the entire user base (one `package.json`, one `next.config.ts`, one `tsconfig.json` per template, not 1000 copies).

**Availability.** All three are equally bad here: any option that crosses two stores has the worst-of-both availability. **You are not solving availability with storage architecture; you are solving it with caching (KV) and pre-warming.** This is a Phase 2 concern. Don't over-rotate on it now.

**Consistency.** A has eventual consistency on R2 LIST after writes — strictly bad for "I just clicked Build, where are my files?" UX. B has read-after-write via Postgres for the manifest. C has read-after-write *and* the build aggregate is transactional.

**Maintainability.** All three are similarly readable. A is one less moving part but the implicit "R2 is the source of truth" is harder to express to a future engineer than "the schema is the source of truth, here's the table." Tied at 4.

**Testability.** A is the worst because R2 must be either mocked (lossy abstraction) or run in a real container in tests (slow). B and C let unit tests stub Postgres entirely and only integration-test the blob layer. C wins narrowly because content-addressed blobs can be put in a `Map<string, Buffer>` for tests with no fidelity loss.

**Cost.** A is cheapest because there is no Postgres row overhead. But the row overhead at 1000 users × 50 files × 10 builds is ~500k rows on Neon — a few cents per month. B and C tie. The API token cost dwarfs storage by 100x for the entire MVP horizon. **Stop optimizing for storage cost; optimize for engineering velocity.**

**Security.** Same blast radius for all: an R2 token compromise leaks all blobs, a Postgres compromise leaks everything. The relevant mitigation is per-user IAM + encryption-at-rest, which is identical across options.

**Evolvability.** This is where C separates from the pack. The event log is the most flexible substrate for unknown future features. A is the worst — flat object stores resist all schema-shaped questions.

---

## Section 6 — The question behind the question

The founder is asking: *"Pure R2 or hybrid?"*

**The real question is: "What is the unit of versioning in Meldar, and where does it live?"**

Until you answer that, the storage debate is theology. The first option implicitly says "the unit of versioning is *the latest state*" — which is what every filesystem says, and which is why git was invented. The second option says "the unit of versioning is *a snapshot of the manifest*." My recommendation says "the unit of versioning is *the build that produced the change*."

The founder picked R2 for "architectural cleanliness." That instinct is correct about cleanliness but wrong about *what is being kept clean*. Filesystems are clean when files are the unit. Meldar's domain unit is not a file — it's a **build**, generated by Sonnet, attached to a kanban card, with a token cost, a parent, and a learning explainer. **Files are an implementation detail of builds.**

If you store builds as the unit, R2 becomes a content-addressed blob store under the hood (which is what S3 and R2 are *good at*) and Postgres becomes the source of truth for *what those blobs mean to a project*. That is the cleanest split, and it happens to also be the easiest to migrate to git later.

**Reframe in one line:**
> "We're not designing a file store. We're designing an append-only build log whose payloads happen to be files."

Once you read the question that way, Option A is obviously wrong (files have no semantic boundary that matches a build), Option B is acceptable (manifest is a poor projection of an unwritten event log), and Option C falls out of the domain naturally.

**The decision the founder is making is not "where do files go." It is "what is a Meldar project, mathematically?"** A bag of files? Or a sequence of generations? The product spec answers this clearly — kanban cards generate builds, builds are explained, builds can be undone — and the storage layer should match.

---

## Section 7 — Growth path diagrams (C4-style, in markdown)

### MVP launch (~10 founding members)

```
                ┌─────────────────────────────┐
                │        meldar.ai            │
                │   Next.js 16 on Vercel      │
                └──────────┬──────────────────┘
                           │
       ┌───────────────────┼─────────────────────────┐
       │                   │                         │
       ▼                   ▼                         ▼
┌─────────────┐   ┌─────────────────┐   ┌───────────────────────┐
│   Neon      │   │  Cloudflare R2  │   │  Cloudflare Worker    │
│  Postgres   │   │ (blob storage)  │   │  + Sandbox SDK + DOs  │
│             │   │                 │   │                       │
│ projects    │   │ blobs/{sha256}  │   │ proxyToSandbox()      │
│ builds      │   │  (immutable)    │   │ writeFile()           │
│ build_files │   │                 │   │ project-{projectId}   │
└─────────────┘   └─────────────────┘   └───────────────────────┘
       ▲                   ▲                         │
       │                   │                         ▼
       │                   │                  ┌─────────────┐
       │                   │                  │ Sandboxed   │
       └───── manifest ────┴── content ───────┤ Next.js dev │
              lookup            fetch          │ (transient) │
                                               └─────────────┘
```

Restore flow: workspace entry → Worker fetches `current_build_id` from Postgres → SELECTs `build_files` → parallel R2 GETs by sha → streams `writeFile()` calls into sandbox → preview URL ready.

### Phase 2 (~100 users, second use case, referrals live)

```
   Same as MVP, plus:
   - Cloudflare KV  caching the latest manifest per project (1m TTL)
   - Inngest jobs   for async export to user's Vercel project
   - A second use   case template image in the container registry
   - prewarm()      hook called from Stripe webhook → DO spinup overlaps
                    with the magic-link verification page

   The storage layer DOES NOT CHANGE.
```

This is the crucial property: a well-chosen storage shape survives feature growth. The same three tables and same R2 layout serve Phase 2 with zero migration.

### Phase 3 (~1000 paying users, full kanban library, Pro Builder tier)

```
                           ┌──────────────────┐
                           │  Meldar Frontend │
                           └────────┬─────────┘
                                    │
        ┌───────────────────────────┼──────────────────────────┐
        │                           │                          │
        ▼                           ▼                          ▼
┌──────────────────┐    ┌──────────────────────┐    ┌─────────────────────┐
│ Neon (read       │    │ Cloudflare R2        │    │ Cloudflare Workers  │
│ replica for      │    │ + KV manifest cache  │    │ + Sandbox SDK       │
│ analytics)       │    │ + edge blob cache    │    │ + Containers (paid) │
│                  │    │                      │    │                     │
│ projects         │    │ blobs/{sha256}       │    │ Per-user DOs        │
│ builds           │    │ (deduped across      │    │ (project-scoped)    │
│ build_files      │    │  starter templates)  │    │                     │
│ + GitHub mirror  │    │                      │    │                     │
│   metadata table │    │                      │    │                     │
└──────────────────┘    └──────────────────────┘    └─────────────────────┘
        │
        ▼
┌──────────────────┐
│ GitHub App       │  ← New in Phase 3: each Meldar Build → one git commit
│ writes builds    │     pushed to user's own repo. Builds map to commits
│ as commits to    │     1:1 because we designed for it from Day 1.
│ user's repo      │
└──────────────────┘
```

### Where does the wrong choice hurt most?

| Phase | Pain point if we picked Option A (pure R2) |
|---|---|
| MVP launch | Mild — diffs are slow, rollback awkward, but you can ship around it |
| Phase 2 (100 users) | Moderate — you're adding bandaid scripts to compute diffs from R2 LISTs |
| Phase 3 (1000 users + GitHub) | **Severe — you cannot offer "your full history pushed to GitHub" because you never had history.** The brand promise breaks. You either ship a degraded "single initial commit" UX or rebuild storage under load, in production, with paying users. This is the canonical "we should have made this decision differently in week 4" scenario. |

**The worst version of this story is real:** in 18 months, with 800 paying customers, you announce GitHub export, and your users discover they get one giant commit. They feel cheated. A founder you respect tweets that Meldar's "you own it" claim is hollow. You spend a quarter rebuilding storage under load. **All of that pain is avoided by adding one column and one table today.**

---

## Section 8 — Hidden assumptions in the A-vs-B framing

The framing assumes a lot. In rough order of how much each one would change the answer if wrong:

1. **"The sandbox file tree matches the stored file tree 1:1."** False in the limit. The sandbox will accumulate `node_modules`, `.next/`, build artifacts, log files, scratch dirs the user doesn't know about. We need an explicit allowlist or denylist for what gets persisted. If we don't define this, on Day 2 we either restore a broken project (missing build artifacts) or restore a 200MB junk drawer (Sonnet outputs + node_modules + build cache).

2. **"Files are text and small."** False in the limit. Users will eventually upload images, fonts, JSON datasets, maybe small SQLite files. Content addressing handles this gracefully. Storing binary blobs in a `manifest jsonb` column (Option B's literal interpretation) does not.

3. **"A build is one Sonnet response."** False — a kanban card may produce multiple Sonnet calls if Sonnet routes to Opus mid-build. The build aggregate must span the *card execution*, not the *model call*. This is why Option C's `Build` aggregate is the right granularity, not "Sonnet response."

4. **"Users will never edit files outside of a Build."** False eventually. Drag-and-drop component additions (mvp-backlog #37) and approval-checkpoint manual tweaks (mvp-backlog #11) both produce file changes that aren't a "Build" in the orchestration sense. Either widen the definition of Build to include manual edits, or introduce a `change_source: 'build' | 'manual' | 'template'` discriminator. **Don't ship without deciding this.**

5. **"R2 list-after-write consistency is good enough."** R2 has strong read-after-write consistency for *individual objects* but eventual consistency for *list operations*. Option A is silently betting on this not mattering. The first time a user clicks Build then immediately refreshes, they may see an inconsistent file tree. Option B and C dodge this entirely by reading from Postgres.

6. **"Project state is just files."** False. There is also: deploy URL history, environment variables, secrets, DB schema for the user's app, kanban card history, generated explainer text. None of these are files. A project is a richer aggregate than this debate acknowledges. The decision should explicitly carve out *which parts of project state* live in the storage layer and which live elsewhere (kanban tables, secrets vault, etc.).

7. **"There's only one project per user."** True for MVP (`Builder` tier = 1 active project), false for Pro Builder. Ensure schema doesn't bake in the assumption.

8. **"Sonnet generates valid file trees."** False sometimes. Sonnet will occasionally produce a file with `..` in the path, or a 10MB output, or a duplicate path within one build. Storage layer must validate. Otherwise the AGENTS.md "Validate ALL AI Output" rule is being violated at the storage boundary.

9. **"R2 is always cheaper than Postgres for blobs."** True for *bytes*, false for *operations*. R2 charges per Class A op (PUT, LIST). At streaming-write granularity (one writeFile per generated file), per-op cost can become non-trivial. Content addressing with dedup reduces this; Option A's "every file is one PUT" maximizes it.

10. **"We can change this later if we need to."** True technically, false emotionally. Once 100 paying users have data in your storage layer, changing it is no longer a refactor — it's a migration with a rollback plan and a maintenance window. The cheap moment is now. After ~50 users it gets meaningfully more expensive each week.

---

## Closing note (one paragraph for the founder)

The instinct toward "architectural cleanliness" is correct, but the cleanliness lives one level higher than where you're looking. Files in R2 isn't clean — it's *familiar*. What's actually clean is: **a project is an append-only log of builds, builds are addressable units of work, files are content-addressed blobs that builds reference.** That model is clean because it matches the domain (kanban → build → preview → ship), not because it matches a filesystem metaphor. Add one table and one jsonb column today, save yourself a quarter of rework in 12 months, and hand your users a real `git log` when they ask for it. That's the trade.
