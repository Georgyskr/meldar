-- Clean slate: truncate all user-generated data
-- Keeps schema, drops all projects, users, sessions, and anything derived
-- Run via: psql $DATABASE_URL -f scripts/clean-slate.sql

BEGIN;

TRUNCATE TABLE
	agent_events,
	agent_tasks,
	ai_call_log,
	build_files,
	builds,
	deployment_log,
	discovery_sessions,
	kanban_cards,
	project_domains,
	project_files,
	projects,
	token_transactions,
	users,
	xray_results,
	audit_orders,
	subscribers
RESTART IDENTITY CASCADE;

COMMIT;
