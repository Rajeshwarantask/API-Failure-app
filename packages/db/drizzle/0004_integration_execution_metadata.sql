ALTER TABLE "simulations" ADD COLUMN IF NOT EXISTS "execution_token" text;
--> statement-breakpoint
ALTER TABLE "simulations" ADD COLUMN IF NOT EXISTS "allowed_origins" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "executions" ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'dashboard' NOT NULL;
--> statement-breakpoint
ALTER TABLE "executions" ADD COLUMN IF NOT EXISTS "token_authenticated" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "executions" ADD COLUMN IF NOT EXISTS "request_ip" text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "integration_credentials" (
  "id" serial PRIMARY KEY NOT NULL,
  "simulation_id" integer NOT NULL,
  "owner_id" uuid NOT NULL,
  "key_prefix" text NOT NULL,
  "key_hash" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "revoked_at" timestamp with time zone,
  "last_used_at" timestamp with time zone,
  "last_used_ip" text
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "integration_credentials" ADD CONSTRAINT "integration_credentials_simulation_id_simulations_id_fk" FOREIGN KEY ("simulation_id") REFERENCES "public"."simulations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "integration_credentials" ADD CONSTRAINT "integration_credentials_owner_id_faultline_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."faultline_users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "integration_credentials_simulation_id_idx" ON "integration_credentials" USING btree ("simulation_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "integration_credentials_owner_id_idx" ON "integration_credentials" USING btree ("owner_id");
