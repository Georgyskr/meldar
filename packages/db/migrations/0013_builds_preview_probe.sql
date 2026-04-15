ALTER TABLE builds ADD COLUMN IF NOT EXISTS preview_probe_status integer;
ALTER TABLE builds ADD COLUMN IF NOT EXISTS preview_probe_body_length integer;
ALTER TABLE builds ADD COLUMN IF NOT EXISTS preview_probe_body_preview text;
