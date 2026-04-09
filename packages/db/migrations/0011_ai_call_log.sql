CREATE TABLE IF NOT EXISTS ai_call_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  project_id uuid,
  session_id text,
  kind text NOT NULL,
  model text NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  cached_read_tokens integer NOT NULL DEFAULT 0,
  cached_write_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  cents_charged integer NOT NULL DEFAULT 0,
  latency_ms integer NOT NULL DEFAULT 0,
  stop_reason text,
  status text NOT NULL,
  error_code text,
  cache_hit_rate_pct integer,
  CONSTRAINT ai_call_kind_valid CHECK (kind IN (
    'build',
    'chat',
    'improve_prompt',
    'ask_question',
    'generate_plan',
    'discovery_ocr',
    'discovery_extract_topics',
    'discovery_extract_text',
    'discovery_extract_screenshot',
    'discovery_analyze',
    'discovery_adaptive',
    'discovery_insights'
  )),
  CONSTRAINT ai_call_status_valid CHECK (status IN ('ok', 'error', 'truncated', 'aborted', 'refused'))
);

CREATE INDEX IF NOT EXISTS idx_ai_call_log_user_created ON ai_call_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_call_log_kind_created ON ai_call_log (kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_call_log_status_created ON ai_call_log (status, created_at DESC);
