CREATE TABLE "agent_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_event_type_valid" CHECK ("agent_events"."event_type" IN ('proposal', 'approval', 'rejection', 'execution', 'verification', 'escalation', 'error'))
);
--> statement-breakpoint
CREATE TABLE "agent_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"agent_type" text NOT NULL,
	"status" text DEFAULT 'proposed' NOT NULL,
	"payload" jsonb NOT NULL,
	"result" jsonb,
	"auto_approved" boolean DEFAULT false NOT NULL,
	"proposed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone,
	"executed_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	CONSTRAINT "agent_task_status_valid" CHECK ("agent_tasks"."status" IN ('proposed', 'approved', 'rejected', 'executing', 'verifying', 'done', 'failed', 'escalated')),
	CONSTRAINT "agent_task_type_valid" CHECK ("agent_tasks"."agent_type" IN ('booking_confirmation', 'booking_reminder', 'lead_research', 'email_drip'))
);
--> statement-breakpoint
CREATE TABLE "ai_call_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" uuid,
	"project_id" uuid,
	"session_id" text,
	"kind" text NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"cached_read_tokens" integer DEFAULT 0 NOT NULL,
	"cached_write_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cents_charged" integer DEFAULT 0 NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"stop_reason" text,
	"status" text NOT NULL,
	"error_code" text,
	"cache_hit_rate_pct" integer,
	CONSTRAINT "ai_call_kind_valid" CHECK ("ai_call_log"."kind" IN ('build', 'chat', 'improve_prompt', 'ask_question', 'generate_plan', 'discovery_ocr', 'discovery_extract_topics', 'discovery_extract_text', 'discovery_extract_screenshot', 'discovery_analyze', 'discovery_adaptive', 'discovery_insights', 'generate_proposal')),
	CONSTRAINT "ai_call_status_valid" CHECK ("ai_call_log"."status" IN ('ok', 'error', 'truncated', 'aborted', 'refused'))
);
--> statement-breakpoint
CREATE TABLE "audit_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"stripe_checkout_session_id" text NOT NULL,
	"stripe_customer_id" text,
	"product" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'eur' NOT NULL,
	"xray_id" text,
	"status" text DEFAULT 'paid' NOT NULL,
	"delivered_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_orders_stripe_checkout_session_id_unique" UNIQUE("stripe_checkout_session_id")
);
--> statement-breakpoint
CREATE TABLE "build_files" (
	"build_id" uuid NOT NULL,
	"path" text NOT NULL,
	"r2_key" text NOT NULL,
	"content_hash" text NOT NULL,
	"size_bytes" integer NOT NULL,
	CONSTRAINT "build_files_build_id_path_pk" PRIMARY KEY("build_id","path"),
	CONSTRAINT "build_files_size_positive" CHECK ("build_files"."size_bytes" >= 0)
);
--> statement-breakpoint
CREATE TABLE "builds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"parent_build_id" uuid,
	"status" text NOT NULL,
	"triggered_by" text NOT NULL,
	"kanban_card_id" uuid,
	"model_version" text,
	"prompt_hash" text,
	"token_cost" integer,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "builds_status_valid" CHECK ("builds"."status" IN ('streaming', 'completed', 'failed', 'rolled_back')),
	CONSTRAINT "builds_triggered_by_valid" CHECK ("builds"."triggered_by" IN ('template', 'user_prompt', 'kanban_card', 'rollback', 'upload')),
	CONSTRAINT "builds_token_cost_positive" CHECK ("builds"."token_cost" IS NULL OR "builds"."token_cost" >= 0)
);
--> statement-breakpoint
CREATE TABLE "deployment_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"user_id" uuid,
	"project_id" uuid,
	"build_id" text,
	"vercel_project_id" text,
	"vercel_deployment_id" text,
	"slug" text,
	"url" text,
	"status" text NOT NULL,
	"error_code" text,
	"error_message" text,
	"api_latency_ms" integer DEFAULT 0 NOT NULL,
	"build_duration_ms" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "deployment_status_valid" CHECK ("deployment_log"."status" IN ('shadow', 'queued', 'building', 'ready', 'error', 'timeout', 'quota_exceeded', 'canceled'))
);
--> statement-breakpoint
CREATE TABLE "discovery_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"email" text,
	"occupation" text,
	"age_bracket" text,
	"quiz_picks" text[],
	"ai_comfort" integer,
	"ai_tools_used" text[],
	"screen_time_data" jsonb,
	"chatgpt_data" jsonb,
	"claude_data" jsonb,
	"google_data" jsonb,
	"subscriptions_data" jsonb,
	"battery_data" jsonb,
	"storage_data" jsonb,
	"calendar_data" jsonb,
	"health_data" jsonb,
	"adaptive_data" jsonb,
	"sources_provided" text[] DEFAULT '{}' NOT NULL,
	"analysis" jsonb,
	"recommended_app" text,
	"learning_modules" jsonb,
	"tier_purchased" text,
	"stripe_session_id" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kanban_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"parent_id" uuid,
	"position" integer NOT NULL,
	"state" text DEFAULT 'draft' NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"task_type" text DEFAULT 'feature' NOT NULL,
	"acceptance_criteria" jsonb,
	"explainer_text" text,
	"generated_by" text DEFAULT 'user' NOT NULL,
	"token_cost_estimate_min" integer,
	"token_cost_estimate_max" integer,
	"token_cost_actual" integer,
	"depends_on" jsonb DEFAULT '[]'::jsonb,
	"blocked_reason" text,
	"last_build_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"built_at" timestamp with time zone,
	CONSTRAINT "kanban_cards_state_valid" CHECK ("kanban_cards"."state" IN ('draft', 'ready', 'queued', 'building', 'built', 'needs_rework', 'failed')),
	CONSTRAINT "kanban_cards_type_valid" CHECK ("kanban_cards"."task_type" IN ('feature', 'page', 'integration', 'data', 'fix', 'polish')),
	CONSTRAINT "kanban_cards_generated_by_valid" CHECK ("kanban_cards"."generated_by" IN ('template', 'haiku', 'user'))
);
--> statement-breakpoint
CREATE TABLE "project_domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"type" text NOT NULL,
	"domain" text NOT NULL,
	"state" text DEFAULT 'active' NOT NULL,
	"registrar_id" text,
	"failure_reason" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_domains_domain_unique" UNIQUE("domain"),
	CONSTRAINT "project_domain_type_valid" CHECK ("project_domains"."type" IN ('subdomain', 'custom')),
	CONSTRAINT "project_domain_state_valid" CHECK ("project_domains"."state" IN ('searching', 'available', 'purchasing', 'registered', 'dns_configuring', 'ssl_provisioning', 'active', 'expiring', 'expired', 'transferred_out', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "project_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"path" text NOT NULL,
	"r2_key" text NOT NULL,
	"content_hash" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "project_files_size_positive" CHECK ("project_files"."size_bytes" >= 0),
	CONSTRAINT "project_files_version_positive" CHECK ("project_files"."version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"template_id" text NOT NULL,
	"tier" text DEFAULT 'builder' NOT NULL,
	"current_build_id" uuid,
	"last_build_at" timestamp with time zone,
	"preview_url" text,
	"preview_url_updated_at" timestamp with time zone,
	"wishes" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "projects_tier_valid" CHECK ("projects"."tier" IN ('builder', 'pro', 'vip'))
);
--> statement-breakpoint
CREATE TABLE "subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"source" text DEFAULT 'landing' NOT NULL,
	"xray_id" text,
	"founding_member" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "token_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"reason" text NOT NULL,
	"reference_id" text,
	"balance_after" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "token_txn_reason_valid" CHECK ("token_transactions"."reason" IN ('build', 'improve_prompt', 'chat', 'daily_bonus', 'signup_bonus', 'referral_bonus', 'monthly_allowance', 'refund'))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text,
	"email_verified" boolean DEFAULT false NOT NULL,
	"verify_token" text,
	"verify_token_expires_at" timestamp with time zone,
	"reset_token" text,
	"reset_token_expires_at" timestamp with time zone,
	"xray_usage_count" integer DEFAULT 0 NOT NULL,
	"marketing_consent" boolean DEFAULT false NOT NULL,
	"welcome_email_sent_at" timestamp with time zone,
	"first_build_email_sent_at" timestamp with time zone,
	"last_nudge_sent_at" timestamp with time zone,
	"auth_provider" text DEFAULT 'email' NOT NULL,
	"token_version" integer DEFAULT 0 NOT NULL,
	"token_balance" integer DEFAULT 200 NOT NULL,
	"referral_code" text,
	"lifetime_tokens_earned" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code"),
	CONSTRAINT "users_token_balance_non_negative" CHECK ("users"."token_balance" >= 0)
);
--> statement-breakpoint
CREATE TABLE "xray_results" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"email" text,
	"quiz_pains" text[],
	"apps" jsonb NOT NULL,
	"total_hours" real NOT NULL,
	"top_app" text NOT NULL,
	"pickups" integer,
	"insight" text NOT NULL,
	"suggestions" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_events" ADD CONSTRAINT "agent_events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_events" ADD CONSTRAINT "agent_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_call_log" ADD CONSTRAINT "ai_call_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_orders" ADD CONSTRAINT "audit_orders_xray_id_xray_results_id_fk" FOREIGN KEY ("xray_id") REFERENCES "public"."xray_results"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "build_files" ADD CONSTRAINT "build_files_build_id_builds_id_fk" FOREIGN KEY ("build_id") REFERENCES "public"."builds"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "builds" ADD CONSTRAINT "builds_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployment_log" ADD CONSTRAINT "deployment_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discovery_sessions" ADD CONSTRAINT "discovery_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanban_cards" ADD CONSTRAINT "kanban_cards_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_domains" ADD CONSTRAINT "project_domains_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_files" ADD CONSTRAINT "project_files_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscribers" ADD CONSTRAINT "subscribers_xray_id_xray_results_id_fk" FOREIGN KEY ("xray_id") REFERENCES "public"."xray_results"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_transactions" ADD CONSTRAINT "token_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "xray_results" ADD CONSTRAINT "xray_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_agent_events_project_created" ON "agent_events" USING btree ("project_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_agent_events_user_created" ON "agent_events" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_agent_tasks_project_status" ON "agent_tasks" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "idx_agent_tasks_project_proposed" ON "agent_tasks" USING btree ("project_id","proposed_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_ai_call_log_user_created" ON "ai_call_log" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_ai_call_log_kind_created" ON "ai_call_log" USING btree ("kind","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_ai_call_log_status_created" ON "ai_call_log" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_audit_email" ON "audit_orders" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_build_files_content_hash" ON "build_files" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "idx_builds_project_created" ON "builds" USING btree ("project_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_builds_project_status" ON "builds" USING btree ("project_id","status") WHERE "builds"."status" IN ('streaming', 'failed');--> statement-breakpoint
CREATE INDEX "idx_builds_project_streaming_created" ON "builds" USING btree ("project_id","created_at" DESC NULLS LAST) WHERE "builds"."status" = 'streaming';--> statement-breakpoint
CREATE UNIQUE INDEX "ux_builds_project_streaming" ON "builds" USING btree ("project_id") WHERE "builds"."status" = 'streaming';--> statement-breakpoint
CREATE INDEX "idx_deployment_log_user_created" ON "deployment_log" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_deployment_log_project_created" ON "deployment_log" USING btree ("project_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_deployment_log_status_created" ON "deployment_log" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_discovery_user_id" ON "discovery_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_kanban_cards_project_parent_position" ON "kanban_cards" USING btree ("project_id","parent_id","position");--> statement-breakpoint
CREATE INDEX "idx_project_domains_project" ON "project_domains" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_project_domains_state" ON "project_domains" USING btree ("state") WHERE "project_domains"."state" NOT IN ('active', 'expired');--> statement-breakpoint
CREATE UNIQUE INDEX "ux_project_files_project_path" ON "project_files" USING btree ("project_id","path") WHERE "project_files"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_project_files_project_active" ON "project_files" USING btree ("project_id") WHERE "project_files"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_project_files_content_hash" ON "project_files" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "idx_projects_user_lastbuild" ON "projects" USING btree ("user_id","last_build_at" DESC NULLS LAST) WHERE "projects"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_projects_current_build" ON "projects" USING btree ("current_build_id") WHERE "projects"."current_build_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_token_transactions_user_created" ON "token_transactions" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_users_created_at" ON "users" USING btree ("created_at");