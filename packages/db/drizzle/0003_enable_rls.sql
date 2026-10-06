-- Protect every application table exposed through Supabase's public schema.
-- The API uses its server-side database connection; these policies protect direct
-- Data API access made with the publishable/anon key.

ALTER TABLE "faultline_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "teams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "team_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "simulations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "executions" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "faultline_users_owner_access" ON "faultline_users";
CREATE POLICY "faultline_users_owner_access" ON "faultline_users"
  FOR ALL TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "teams_member_access" ON "teams";
CREATE POLICY "teams_member_access" ON "teams"
  FOR ALL TO authenticated
  USING (
    owner_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM "team_members" tm
      WHERE tm.team_id = teams.id AND tm.user_id = (select auth.uid())
    )
  )
  WITH CHECK (owner_id = (select auth.uid()));

DROP POLICY IF EXISTS "team_members_member_access" ON "team_members";
CREATE POLICY "team_members_member_access" ON "team_members"
  FOR ALL TO authenticated
  USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM "teams" t
      WHERE t.id = team_members.team_id AND t.owner_id = (select auth.uid())
    )
  )
  WITH CHECK (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM "teams" t
      WHERE t.id = team_members.team_id AND t.owner_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "simulations_owner_or_team_access" ON "simulations";
CREATE POLICY "simulations_owner_or_team_access" ON "simulations"
  FOR ALL TO authenticated
  USING (
    owner_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM "team_members" tm
      WHERE tm.team_id = simulations.team_id AND tm.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    owner_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM "team_members" tm
      WHERE tm.team_id = simulations.team_id AND tm.user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "executions_owner_or_team_access" ON "executions";
CREATE POLICY "executions_owner_or_team_access" ON "executions"
  FOR ALL TO authenticated
  USING (
    owner_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM "team_members" tm
      WHERE tm.team_id = executions.team_id AND tm.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    owner_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM "team_members" tm
      WHERE tm.team_id = executions.team_id AND tm.user_id = (select auth.uid())
    )
  );

REVOKE ALL ON TABLE "faultline_users", "teams", "team_members", "simulations", "executions" FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "faultline_users", "teams", "team_members", "simulations", "executions" TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

COMMENT ON TABLE "faultline_users" IS 'RLS protected: users can access only their own profile.';
COMMENT ON TABLE "teams" IS 'RLS protected: owners and members can access team records.';
COMMENT ON TABLE "team_members" IS 'RLS protected: members and team owners can access memberships.';
COMMENT ON TABLE "simulations" IS 'RLS protected: owners and team members can access simulations.';
COMMENT ON TABLE "executions" IS 'RLS protected: owners and team members can access executions.';
