# Sprint 1 — Database setup runbook

**Last updated:** 2026-04-07
**Status:** Required prerequisite before any v3 code that touches `projects`, `builds`, `build_files`, or `project_files`.

This runbook captures the one-time Neon + Postgres setup steps for Meldar v3 Sprint 1. The reasoning behind every setting is preserved in the archived database-optimizer review at `docs/archive/storage-decision-2026-04/database-optimizer-review.md`.

---

## 1. Apply the initial migration

The v3 schema is a hand-crafted idempotent SQL file (not a Drizzle Kit generated migration) because we need features Drizzle Kit can't emit: `CREATE EXTENSION`, `DEFERRABLE INITIALLY DEFERRED` foreign keys, and partial indexes with complex predicates.

```bash
psql "$DATABASE_URL" -f packages/db/migrations/0000_meldar_v3_initial.sql
```

The file is safe to re-run — every statement uses `IF NOT EXISTS` or a `DO $$ ... END$$` guard.

Apply it to:

1. Local Neon dev branch
2. Staging
3. Production

In that order. Verify after each apply using the sanity-check queries at the bottom of the SQL file.

---

## 2. Neon compute configuration

The database-optimizer review explicitly calls out that the default **0.25 CU** compute size is **not enough** for Sprint 1's workload (Build streaming = bursts of ~50 upserts per click against a 64-connection pool). Configure in the Neon console:

| Setting | Value | Why |
|---|---|---|
| Minimum compute | **1 CU** | Prevents 200-500ms cold-start latency on the first query of an idle period. |
| Autoscaling max | 2-4 CU | Absorbs Build streaming bursts without starving the connection pool. |
| Suspend after | 5 minutes | Reasonable default; won't affect cold start because min compute is 1 CU not 0. |

Neon's pooled (pgbouncer) endpoint is what the `@neondatabase/serverless` HTTP driver should connect to — the pooled URL is the one ending in `-pooler.<region>.aws.neon.tech`. Confirm `DATABASE_URL` in Vercel uses the pooled endpoint, not the unpooled compute endpoint.

---

## 3. Role-level session settings

These are set **per role**, not per schema — they can't live in the migration file because the app doesn't have permission to `ALTER ROLE`. Run once as the Neon database owner, either via the Neon SQL editor or via `psql` as the owner role:

```sql
-- Replace <app_role> with the actual role used by the Next.js app
-- (probably neondb_owner or a custom role per environment).
ALTER ROLE <app_role> SET statement_timeout = '5s';
ALTER ROLE <app_role> SET idle_in_transaction_session_timeout = '30s';
```

**Why these values:**

- `statement_timeout = 5s` — matches the AC-1 Day-2 cold-rehydrate budget from the Cloudflare Sandbox spike. Any query exceeding this is a bug, not a slow operation. Enforcing the timeout protects the Neon connection pool from starvation under load.
- `idle_in_transaction_session_timeout = 30s` — Workers sometimes open a transaction and then the client disconnects mid-flow. Without this limit, abandoned transactions hold locks indefinitely and create contention on `project_files` during Build streaming.

Verify with:

```sql
SELECT rolname, rolconfig
  FROM pg_roles
  WHERE rolname = '<app_role>';
```

You should see both `statement_timeout=5s` and `idle_in_transaction_session_timeout=30s` in `rolconfig`.

---

## 4. pg_stat_statements sanity check

Confirm the extension is live and collecting data after a few minutes of app traffic:

```sql
-- Extension installed?
SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_stat_statements';

-- Top 10 queries by total time (will populate after traffic hits the DB).
SELECT
    calls,
    round(total_exec_time::numeric, 2) AS total_ms,
    round(mean_exec_time::numeric, 2) AS mean_ms,
    substring(query, 1, 80) AS query_preview
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

If the query returns 0 rows but the extension is installed, traffic hasn't hit the DB yet — wait until the first Build streams and re-check.

---

## 5. The 5 hot-path queries to watch

Per the database-optimizer review, set up monitoring for these once the product is live. Alert thresholds are the ones flagged in the review:

| # | Query pattern | Alert threshold |
|---|---|---|
| 1 | `INSERT INTO project_files ... ON CONFLICT (project_id, path) DO UPDATE ...` | `mean_exec_time > 50ms` OR sustained >100 calls/sec → upsert is missing the partial unique index, OR orchestrator is fan-out-bombing the DB |
| 2 | `SELECT ... FROM project_files WHERE project_id = $1 AND deleted_at IS NULL` | `mean_exec_time > 100ms` → `idx_project_files_project_active` is being skipped, or row count per project is exploding |
| 3 | `SELECT ... FROM projects WHERE user_id = $1 AND deleted_at IS NULL ORDER BY last_build_at DESC` | `mean_exec_time > 50ms` at p95 → `idx_projects_user_lastbuild` is not being picked, run `EXPLAIN ANALYZE` |
| 4 | `SELECT ... FROM build_files WHERE build_id = $1` | `mean_exec_time > 80ms` → primary key index `(build_id, path)` is being skipped, likely bad planner stats, run `ANALYZE build_files` |
| 5 | `UPDATE projects SET deleted_at = now() WHERE id = $1` | `mean_exec_time > 30ms` → lock contention from a long-running transaction touching the same row |

Beyond per-query stats, also monitor:

- `pg_stat_database.numbackends` (active connection count) — alert at >80% of pool capacity
- `pg_stat_database.xact_rollback` rate — alert at >5% of total transactions
- `pg_stat_user_tables.n_dead_tup` on `project_files` and `build_files` — alert at >20% dead-tuple ratio
- Any index in `pg_stat_user_indexes` with `idx_scan = 0` after a week of traffic — it's unused, drop it

These observability dashboards are **NOT** Sprint 1 scope — they're documented here so the next person setting up monitoring knows what to build.

---

## 6. Future-proofing notes

### Index creation in production

**Sprint 1:** plain `CREATE INDEX` is fine because the tables are empty.

**After Sprint 1:** every new index on `projects`, `builds`, `build_files`, or `project_files` must use `CREATE INDEX CONCURRENTLY`. Drizzle Kit does NOT emit `CONCURRENTLY` automatically — you will need a custom SQL migration for every index added after first launch. On Neon, a non-concurrent `CREATE INDEX` takes an `ACCESS EXCLUSIVE` lock for the duration, which stalls every other query against the table.

### Column additions to `project_files` and `build_files`

These are the highest-cardinality tables in the system (projected ~50M `build_files` rows at 10K users). Never run `ALTER TABLE ... ADD COLUMN ... NOT NULL DEFAULT '...'` on either — that's a full table rewrite under a long lock. Use the two-step pattern:

1. `ALTER TABLE ... ADD COLUMN ... NULL` (fast)
2. Backfill in batches via a background job
3. `ALTER TABLE ... ALTER COLUMN ... SET NOT NULL` (metadata-only on modern Postgres)

### Build retention

Sprint 1 decision: **keep all builds forever**. Revisit when:

- `SELECT count(*) FROM build_files` exceeds ~20M rows (~5× the 10K-user projection), OR
- Neon's total storage billing becomes a visible line item vs API token spend

Trimming strategy when we need it: delete `build_files` rows for builds older than 30 days where `status = 'completed'` and `id != any project's current_build_id`. Content-addressed R2 blobs are then garbage-collected by reference counting.
