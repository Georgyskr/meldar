-- =============================================================================
-- Meldar v3 — Initial project storage migration
-- =============================================================================
-- Apply once, manually, via psql against the Neon production and staging DBs:
--   psql "$DATABASE_URL" -f src/server/db/migrations/0000_meldar_v3_initial.sql
--
-- Idempotent: every statement uses IF NOT EXISTS / ON CONFLICT DO NOTHING where
-- possible. Safe to re-run.
--
-- Decision record:
--   docs/v3/engineering/data-engineer-review.md
--   docs/v3/engineering/software-architect-review.md
--   docs/v3/engineering/database-optimizer-review.md
--
-- Architecture: normalized Postgres metadata + content-addressed R2 blobs.
-- Build events are the unit of truth. Files are payloads. Rollback is a single
-- UPDATE to projects.current_build_id.
--
-- Post-migration (done OUTSIDE this file, by the DB admin, via Neon console or
-- psql as the owner role — these are role-level settings, not schema):
--   ALTER ROLE <app_role> SET statement_timeout = '5s';
--   ALTER ROLE <app_role> SET idle_in_transaction_session_timeout = '30s';
--   -- In Neon console: set compute minimum to 1 CU (NOT 0.25) and enable
--   -- autoscaling to avoid 200-500ms cold starts under Build streaming bursts.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Extensions
-- -----------------------------------------------------------------------------
-- pg_stat_statements enables per-query observability from day one. We use this
-- to monitor the 5 hot-path queries flagged by the DB optimizer review
-- (upsert latency on project_files, workspace entry scan, dashboard fetch,
-- rollback fetch, soft-delete). On Neon, the extension is available but must
-- be explicitly enabled per-database.
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- -----------------------------------------------------------------------------
-- 2. Tables
-- -----------------------------------------------------------------------------

-- projects: one row per Meldar project. current_build_id is HEAD.
CREATE TABLE IF NOT EXISTS projects (
    id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name              text        NOT NULL,
    template_id       text        NOT NULL,
    tier              text        NOT NULL DEFAULT 'builder',
    current_build_id  uuid,       -- FK added below as DEFERRABLE
    last_build_at     timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    deleted_at        timestamptz,
    CONSTRAINT projects_tier_valid
        CHECK (tier IN ('builder', 'pro', 'vip'))
);

-- builds: immutable append-only event log. Each Build is a commit-shaped unit.
CREATE TABLE IF NOT EXISTS builds (
    id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id        uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_build_id   uuid        REFERENCES builds(id) ON DELETE SET NULL,
    status            text        NOT NULL,
    triggered_by      text        NOT NULL,
    kanban_card_id    text,
    model_version     text,
    prompt_hash       text,
    token_cost        integer,
    error_message     text,
    created_at        timestamptz NOT NULL DEFAULT now(),
    completed_at      timestamptz,
    CONSTRAINT builds_status_valid
        CHECK (status IN ('streaming', 'completed', 'failed', 'rolled_back')),
    CONSTRAINT builds_triggered_by_valid
        CHECK (triggered_by IN ('template', 'user_prompt', 'kanban_card', 'rollback', 'upload')),
    CONSTRAINT builds_token_cost_positive
        CHECK (token_cost IS NULL OR token_cost >= 0)
);

-- build_files: per-build manifest. Composite PK, no surrogate id.
CREATE TABLE IF NOT EXISTS build_files (
    build_id          uuid        NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
    path              text        NOT NULL,
    r2_key            text        NOT NULL,
    content_hash      text        NOT NULL,
    size_bytes        integer     NOT NULL,
    PRIMARY KEY (build_id, path),
    CONSTRAINT build_files_size_positive
        CHECK (size_bytes >= 0)
);

-- project_files: LIVE working set. One row per (project, path) where
-- deleted_at IS NULL. Maintained via upsert during Build streaming.
CREATE TABLE IF NOT EXISTS project_files (
    id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id        uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    path              text        NOT NULL,
    r2_key            text        NOT NULL,
    content_hash      text        NOT NULL,
    size_bytes        integer     NOT NULL,
    version           integer     NOT NULL DEFAULT 1,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    deleted_at        timestamptz,
    CONSTRAINT project_files_size_positive
        CHECK (size_bytes >= 0),
    CONSTRAINT project_files_version_positive
        CHECK (version >= 1)
);

-- -----------------------------------------------------------------------------
-- 3. The deferred circular FK
-- -----------------------------------------------------------------------------
-- projects.current_build_id → builds.id forms a cycle with builds.project_id.
-- DEFERRABLE INITIALLY DEFERRED lets a single transaction insert a project,
-- insert its genesis build, and flip HEAD without tripping the constraint
-- mid-transaction.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'projects_current_build_id_fkey'
    ) THEN
        ALTER TABLE projects
            ADD CONSTRAINT projects_current_build_id_fkey
            FOREIGN KEY (current_build_id)
            REFERENCES builds(id)
            ON DELETE SET NULL
            DEFERRABLE INITIALLY DEFERRED;
    END IF;
END$$;

-- -----------------------------------------------------------------------------
-- 4. Indexes
-- -----------------------------------------------------------------------------
-- Sprint 1 uses plain CREATE INDEX because tables are empty. EVERY post-Sprint-1
-- index on these tables must use CREATE INDEX CONCURRENTLY to avoid
-- ACCESS EXCLUSIVE lock storms on Neon.

-- --- projects -----------------------------------------------------------------

-- Dashboard: list user's projects by recency. Partial excludes soft-deletes.
CREATE INDEX IF NOT EXISTS idx_projects_user_lastbuild
    ON projects (user_id, last_build_at DESC NULLS LAST)
    WHERE deleted_at IS NULL;

-- Rollback reconciliation: "which projects have HEAD at this build?"
CREATE INDEX IF NOT EXISTS idx_projects_current_build
    ON projects (current_build_id)
    WHERE current_build_id IS NOT NULL;

-- --- builds -------------------------------------------------------------------

-- Build history: "all builds for this project, newest first".
CREATE INDEX IF NOT EXISTS idx_builds_project_created
    ON builds (project_id, created_at DESC);

-- In-flight set: resume incomplete builds, reap orphaned builds.
CREATE INDEX IF NOT EXISTS idx_builds_project_status
    ON builds (project_id, status)
    WHERE status IN ('streaming', 'failed');

-- --- build_files --------------------------------------------------------------

-- Diff and content GC support.
CREATE INDEX IF NOT EXISTS idx_build_files_content_hash
    ON build_files (content_hash);

-- --- project_files ------------------------------------------------------------

-- ⚠️ THE CRITICAL INDEX. Do NOT ship without it. The upsert in Build streaming
-- (hot path #2) uses this as the conflict target. Without it, the upsert
-- silently inserts duplicate rows, causing file-flicker corruption that's
-- only visible after hundreds of duplicates accumulate in production.
-- Partial clause lets soft-deleted rows coexist with a live row at the
-- same path (user deletes file, re-creates at same path).
CREATE UNIQUE INDEX IF NOT EXISTS ux_project_files_project_path
    ON project_files (project_id, path)
    WHERE deleted_at IS NULL;

-- Workspace entry / sandbox rehydrate: load all live files for a project.
CREATE INDEX IF NOT EXISTS idx_project_files_project_active
    ON project_files (project_id)
    WHERE deleted_at IS NULL;

-- Phase 2 cross-project content dedup. Cheap to add now.
CREATE INDEX IF NOT EXISTS idx_project_files_content_hash
    ON project_files (content_hash);

-- -----------------------------------------------------------------------------
-- 5. Comments (schema docs surfaced in psql \d+)
-- -----------------------------------------------------------------------------

COMMENT ON TABLE projects
    IS 'Meldar v3 projects. current_build_id is HEAD; rollback = UPDATE one row.';
COMMENT ON TABLE builds
    IS 'Append-only event log. Each Build = one future git commit (Phase 2).';
COMMENT ON TABLE build_files
    IS 'Per-build manifest. Immutable. Composite PK (build_id, path).';
COMMENT ON TABLE project_files
    IS 'Live working set. Upserted during Build streaming. Partial unique index on (project_id, path) is load-bearing.';

COMMENT ON COLUMN projects.current_build_id
    IS 'HEAD pointer. FK is DEFERRABLE INITIALLY DEFERRED to allow genesis transactions.';
COMMENT ON COLUMN builds.parent_build_id
    IS 'Self-referential FK forms the Build DAG. Null only for the genesis (template) build.';
COMMENT ON COLUMN build_files.content_hash
    IS 'sha256 of the file bytes. r2_key = projects/{project_id}/content/{content_hash}.';
COMMENT ON COLUMN project_files.content_hash
    IS 'sha256 of the file bytes. r2_key = projects/{project_id}/content/{content_hash}.';

COMMIT;

-- =============================================================================
-- Post-migration sanity checks (run manually after apply):
--
-- -- Extension is live?
-- SELECT * FROM pg_extension WHERE extname = 'pg_stat_statements';
--
-- -- Four new tables exist?
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public'
--     AND table_name IN ('projects', 'builds', 'build_files', 'project_files');
--
-- -- The critical partial unique index exists?
-- SELECT indexname, indexdef FROM pg_indexes
--   WHERE tablename = 'project_files'
--     AND indexname = 'ux_project_files_project_path';
--
-- -- The deferred FK is in place with DEFERRABLE INITIALLY DEFERRED?
-- SELECT conname, condeferrable, condeferred
--   FROM pg_constraint
--   WHERE conname = 'projects_current_build_id_fkey';
-- =============================================================================
