-- =============================================================================
-- Meldar v3 — Projects preview URL cache + in-flight build partial index
-- =============================================================================
-- Apply once via psql against Neon dev → staging → production:
--   psql "$DATABASE_URL" -f packages/db/migrations/0001_projects_preview_url.sql
--
-- Idempotent: every statement uses IF NOT EXISTS. Safe to re-run.
--
-- Adds:
--   1. projects.preview_url + projects.preview_url_updated_at — sandbox URL
--      hint cached on the project row so the workspace RSC can paint the
--      iframe without an RPC. Cloudflare Worker remains the source of truth.
--   2. idx_builds_project_streaming_created — partial index that scopes the
--      "is there a streaming build for this project?" query to active rows
--      only, so projects with thousands of historical builds don't pay an
--      O(N) heap re-check on every workspace page load.
--
-- No CONCURRENTLY: Sprint 1 tables are still empty. Per the runbook §6, this
-- discipline kicks in once tables hold production rows.
-- =============================================================================

BEGIN;

ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS preview_url            text,
    ADD COLUMN IF NOT EXISTS preview_url_updated_at timestamptz;

COMMENT ON COLUMN projects.preview_url IS
    'Cached sandbox preview URL hint. Cloudflare Worker is source of truth.';
COMMENT ON COLUMN projects.preview_url_updated_at IS
    'When preview_url was last refreshed. Treat values older than ~2 min as stale.';

CREATE INDEX IF NOT EXISTS idx_builds_project_streaming_created
    ON builds (project_id, created_at DESC)
    WHERE status = 'streaming';

COMMIT;

-- =============================================================================
-- Rollback (manual, run only if you know what you're doing):
--
-- BEGIN;
-- DROP INDEX IF EXISTS idx_builds_project_streaming_created;
-- ALTER TABLE projects
--     DROP COLUMN IF EXISTS preview_url_updated_at,
--     DROP COLUMN IF EXISTS preview_url;
-- COMMIT;
-- =============================================================================
