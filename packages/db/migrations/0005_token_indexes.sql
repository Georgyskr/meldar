-- These statements use CREATE INDEX CONCURRENTLY, which cannot run inside a
-- transaction. Run each statement individually against the database:
--   psql "$DATABASE_URL" -f packages/db/migrations/0005_token_indexes.sql

-- Partial indexes for token-based lookups (verify-email, reset-password routes).
-- Most rows have NULL tokens, so partial indexes stay tiny.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_verify_token
  ON users (verify_token)
  WHERE verify_token IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_reset_token
  ON users (reset_token)
  WHERE reset_token IS NOT NULL;

-- The UNIQUE constraint on users.email already creates an index.
-- idx_users_email is redundant.
DROP INDEX IF EXISTS idx_users_email;

-- idx_kanban_cards_project on (project_id) is a prefix of the composite
-- idx_kanban_cards_project_parent_position on (project_id, parent_id, position).
-- Postgres can use the composite for project_id-only queries.
DROP INDEX IF EXISTS idx_kanban_cards_project;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at
  ON users (created_at);
