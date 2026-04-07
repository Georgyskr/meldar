-- =============================================================================
-- Meldar v3 — At-most-one streaming build per project (unique partial index)
-- =============================================================================
-- Apply once via psql against Neon dev → staging → production:
--   psql "$DATABASE_URL" -f packages/db/migrations/0002_builds_unique_streaming.sql
--
-- Idempotent: every statement uses IF NOT EXISTS. Safe to re-run.
--
-- Why:
--   The workspace double-submit guard relies on `getActiveStreamingBuild`,
--   which is a non-atomic read. Two concurrent POSTs to the build route can
--   both pass the guard and start two streaming builds for the same project.
--   Backend reviewer flagged this as P0-5.
--
-- Effect:
--   A second concurrent INSERT INTO builds with status='streaming' for the
--   same project_id will fail with a unique constraint violation. The
--   orchestrator catches that error and converts it to BUILD_IN_PROGRESS,
--   so the loser of the race gets a clean "build already running" response
--   instead of corrupting state.
--
-- Sprint 1 invariant:
--   Plain CREATE INDEX (no CONCURRENTLY) is OK because `builds` is empty
--   at the time this migration runs (verify via `SELECT count(*) FROM builds`).
--   Per the runbook §6, every post-Sprint-1 index on this table must use
--   CREATE INDEX CONCURRENTLY to avoid ACCESS EXCLUSIVE lock storms on Neon.
-- =============================================================================

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS ux_builds_project_streaming
    ON builds (project_id)
    WHERE status = 'streaming';

COMMIT;

-- =============================================================================
-- Rollback (manual, run only if you know what you're doing):
--
-- BEGIN;
-- DROP INDEX IF EXISTS ux_builds_project_streaming;
-- COMMIT;
-- =============================================================================
