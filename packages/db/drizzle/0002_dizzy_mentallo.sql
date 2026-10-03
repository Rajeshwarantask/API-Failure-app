ALTER TABLE "teams" ADD COLUMN "team_code" text NOT NULL DEFAULT 'LEGACY-TEAM-KEY';--> statement-breakpoint
ALTER TABLE "teams" ALTER COLUMN "team_code" DROP DEFAULT;
