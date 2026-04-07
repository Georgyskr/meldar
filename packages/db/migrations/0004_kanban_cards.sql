CREATE TABLE kanban_cards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id   UUID,  -- FK added below (self-ref)
  position    INTEGER NOT NULL,
  state       TEXT NOT NULL DEFAULT 'draft',
  required    BOOLEAN NOT NULL DEFAULT FALSE,

  title       TEXT NOT NULL,
  description TEXT,
  task_type   TEXT NOT NULL DEFAULT 'feature',

  acceptance_criteria JSONB,
  explainer_text      TEXT,

  generated_by TEXT NOT NULL DEFAULT 'user',

  token_cost_estimate_min INTEGER,
  token_cost_estimate_max INTEGER,
  token_cost_actual       INTEGER,

  depends_on      JSONB DEFAULT '[]',
  blocked_reason  TEXT,

  last_build_id UUID,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  built_at   TIMESTAMP WITH TIME ZONE,

  CONSTRAINT kanban_cards_state_valid
    CHECK (state IN ('draft', 'ready', 'queued', 'building', 'built', 'needs_rework', 'failed')),
  CONSTRAINT kanban_cards_type_valid
    CHECK (task_type IN ('feature', 'page', 'integration', 'data', 'fix', 'polish')),
  CONSTRAINT kanban_cards_generated_by_valid
    CHECK (generated_by IN ('template', 'haiku', 'user'))
);

-- Self-referential FK: subtasks point to their parent milestone.
-- CASCADE delete: removing a milestone removes all its subtasks.
ALTER TABLE kanban_cards
  ADD CONSTRAINT fk_kanban_cards_parent
  FOREIGN KEY (parent_id) REFERENCES kanban_cards(id) ON DELETE CASCADE;

-- Optional FK to builds (nullable — set when a build completes for this card)
ALTER TABLE kanban_cards
  ADD CONSTRAINT fk_kanban_cards_last_build
  FOREIGN KEY (last_build_id) REFERENCES builds(id) ON DELETE SET NULL;

-- Position ordering within a parent (or at the top level for milestones)
CREATE INDEX idx_kanban_cards_project_parent_position
  ON kanban_cards (project_id, parent_id, position);

-- Fast project-level lookup
CREATE INDEX idx_kanban_cards_project
  ON kanban_cards (project_id);

-- Migrate builds.kanban_card_id from text to uuid FK
ALTER TABLE builds
  ALTER COLUMN kanban_card_id TYPE UUID
  USING CASE WHEN kanban_card_id IS NOT NULL AND kanban_card_id <> ''
    THEN kanban_card_id::uuid ELSE NULL END;

ALTER TABLE builds
  ADD CONSTRAINT fk_builds_kanban_card
  FOREIGN KEY (kanban_card_id) REFERENCES kanban_cards(id) ON DELETE SET NULL;
