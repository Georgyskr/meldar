-- P1-13 Postgres orphan reset (pre-launch, one-shot)
--
-- Reason: `sandboxNameFor` was renamed from `project-{uuid}` to
-- `p-{uuid_no_dashes}`. Any `projects.preview_url` cached from the old
-- worker points at a DO hostname that no longer exists, and any crashed
-- `builds` row left at `status='streaming'` is wedged on the partial
-- unique index `ux_builds_project_streaming`, blocking new builds.
--
-- Run once against Neon after the new worker + reaper are live:
--   psql $DATABASE_URL -f scripts/reset-orphan-previews.sql
--
-- Idempotent. Second run touches zero rows.

BEGIN;

-- 1. Null orphan preview URLs that embed the old `project-<uuid>` DO name.
--    The new shape `p-<32hex>` never contains the literal `project-`, so
--    this match is unambiguous.
UPDATE projects
SET preview_url = NULL,
    preview_url_updated_at = NULL,
    updated_at = NOW()
WHERE preview_url LIKE '%project-%';

-- 2. Fail wedged streaming builds so `ux_builds_project_streaming` frees
--    its slot per project. The DO that would have driven them to
--    completion is gone; there is no recovery path.
UPDATE builds
SET status = 'failed',
    error_message = 'reaper: orphaned by sandbox rename (P1-13 cleanup)',
    completed_at = NOW()
WHERE status = 'streaming';

COMMIT;

-- Verification (run separately, outside the transaction):
-- SELECT
--   (SELECT COUNT(*) FROM projects WHERE preview_url LIKE '%project-%') AS orphan_urls,
--   (SELECT COUNT(*) FROM builds WHERE status = 'streaming')            AS wedged_streams;
-- Both columns must be 0.
