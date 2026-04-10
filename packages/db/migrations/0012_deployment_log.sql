CREATE TABLE IF NOT EXISTS deployment_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  project_id uuid,
  build_id text,
  vercel_project_id text,
  vercel_deployment_id text,
  slug text,
  url text,
  status text NOT NULL,
  error_code text,
  error_message text,
  api_latency_ms integer NOT NULL DEFAULT 0,
  build_duration_ms integer NOT NULL DEFAULT 0,
  CONSTRAINT deployment_status_valid CHECK (status IN (
    'shadow',
    'queued',
    'building',
    'ready',
    'error',
    'timeout',
    'quota_exceeded',
    'canceled'
  ))
);

CREATE INDEX IF NOT EXISTS idx_deployment_log_user_created ON deployment_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deployment_log_project_created ON deployment_log (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deployment_log_status_created ON deployment_log (status, created_at DESC);
