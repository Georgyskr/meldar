-- =============================================================================
-- Meldar — Legacy landing-funnel rehydrate
-- =============================================================================
-- Recreates the four legacy landing/discovery tables that were dropped during
-- the 2026-04-07 cleanup wave before we realized the discovery funnel is still
-- part of the "tell me what to build" half of v3. Idempotent.
--
-- Apply: psql "$DATABASE_URL" -f packages/db/migrations/0003_legacy_landing_rehydrate.sql
-- =============================================================================

BEGIN;

-- xray_results: Time X-Ray results (quiz + screenshot + insight/suggestions)
CREATE TABLE IF NOT EXISTS xray_results (
    id            text        PRIMARY KEY,
    user_id       uuid        REFERENCES users(id) ON DELETE SET NULL,
    email         text,
    quiz_pains    text[],
    apps          jsonb       NOT NULL,
    total_hours   real        NOT NULL,
    top_app       text        NOT NULL,
    pickups       integer,
    insight       text        NOT NULL,
    suggestions   jsonb,
    created_at    timestamptz NOT NULL DEFAULT now()
);

-- audit_orders: Stripe-backed audit / app-build orders
CREATE TABLE IF NOT EXISTS audit_orders (
    id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    email                       text        NOT NULL,
    stripe_checkout_session_id  text        NOT NULL UNIQUE,
    stripe_customer_id          text,
    product                     text        NOT NULL,
    amount_cents                integer     NOT NULL,
    currency                    text        NOT NULL DEFAULT 'eur',
    xray_id                     text        REFERENCES xray_results(id) ON DELETE SET NULL,
    status                      text        NOT NULL DEFAULT 'paid',
    delivered_at                timestamptz,
    notes                       text,
    created_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_email ON audit_orders (email);

-- subscribers: newsletter / founding-member signups
CREATE TABLE IF NOT EXISTS subscribers (
    id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    email             text        NOT NULL UNIQUE,
    source            text        NOT NULL DEFAULT 'landing',
    xray_id           text        REFERENCES xray_results(id) ON DELETE SET NULL,
    founding_member   boolean     NOT NULL DEFAULT false,
    created_at        timestamptz NOT NULL DEFAULT now()
);

-- discovery_sessions: multi-phase "what should I build" funnel state
CREATE TABLE IF NOT EXISTS discovery_sessions (
    id                  text        PRIMARY KEY,
    user_id             uuid        REFERENCES users(id) ON DELETE SET NULL,
    email               text,

    -- Phase 1
    occupation          text,
    age_bracket         text,
    quiz_picks          text[],
    ai_comfort          integer,
    ai_tools_used       text[],

    -- Phase 2 (processed extractions)
    screen_time_data    jsonb,
    chatgpt_data        jsonb,
    claude_data         jsonb,
    google_data         jsonb,
    subscriptions_data  jsonb,
    battery_data        jsonb,
    storage_data        jsonb,
    calendar_data       jsonb,
    health_data         jsonb,
    adaptive_data       jsonb,
    sources_provided    text[]      NOT NULL DEFAULT '{}',

    -- Phase 3 (AI output)
    analysis            jsonb,
    recommended_app     text,
    learning_modules    jsonb,

    -- Conversion
    tier_purchased      text,
    stripe_session_id   text,
    paid_at             timestamptz,

    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_discovery_user_id ON discovery_sessions (user_id);

COMMIT;
