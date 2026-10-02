CREATE TABLE IF NOT EXISTS "executions" (
	"id" serial PRIMARY KEY NOT NULL,
	"simulation_id" integer NOT NULL,
	"method" text NOT NULL,
	"url" text NOT NULL,
	"request_headers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"request_query" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"request_body" text,
	"failure_type" text NOT NULL,
	"simulated_status" integer,
	"response_headers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"response_body" text,
	"actual_latency_ms" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"timeline" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "simulations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"target_url" text NOT NULL,
	"method" text NOT NULL,
	"headers" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"query_params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"request_body" text,
	"failure_type" text DEFAULT 'http_500' NOT NULL,
	"status_code" integer DEFAULT 500,
	"response_body" text,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"timeout_ms" integer DEFAULT 5000 NOT NULL,
	"probability" real DEFAULT 100 NOT NULL,
	"forward_request" boolean DEFAULT false NOT NULL,
	"forward_timeout_ms" integer DEFAULT 10000 NOT NULL,
	"preserve_headers" boolean DEFAULT true NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"last_executed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"conditions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"workflow" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "executions" ADD CONSTRAINT "executions_simulation_id_simulations_id_fk" FOREIGN KEY ("simulation_id") REFERENCES "public"."simulations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
