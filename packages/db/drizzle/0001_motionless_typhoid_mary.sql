CREATE TABLE "team_members" (
	"team_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "team_members_team_id_user_id_pk" PRIMARY KEY("team_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code_hash" text NOT NULL,
	"owner_id" uuid NOT NULL,
	"retention_weeks" integer DEFAULT 2 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "teams_code_hash_unique" UNIQUE("code_hash")
);
--> statement-breakpoint
CREATE TABLE "faultline_users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text,
	"email" text NOT NULL,
	"retention_weeks" integer DEFAULT 2 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "executions" ADD COLUMN "owner_id" uuid;--> statement-breakpoint
ALTER TABLE "executions" ADD COLUMN "team_id" integer;--> statement-breakpoint
ALTER TABLE "simulations" ADD COLUMN "owner_id" uuid;--> statement-breakpoint
ALTER TABLE "simulations" ADD COLUMN "team_id" integer;--> statement-breakpoint
INSERT INTO "faultline_users" ("id", "email") VALUES ('00000000-0000-0000-0000-000000000001', 'system@faultline.local') ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
UPDATE "simulations" SET "owner_id" = '00000000-0000-0000-0000-000000000001' WHERE "owner_id" IS NULL;--> statement-breakpoint
UPDATE "executions" SET "owner_id" = '00000000-0000-0000-0000-000000000001' WHERE "owner_id" IS NULL;--> statement-breakpoint
ALTER TABLE "simulations" ALTER COLUMN "owner_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "executions" ALTER COLUMN "owner_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_faultline_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."faultline_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_owner_id_faultline_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."faultline_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "executions" ADD CONSTRAINT "executions_owner_id_faultline_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."faultline_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "executions" ADD CONSTRAINT "executions_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_owner_id_faultline_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."faultline_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;
