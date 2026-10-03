import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db, teamMembersTable, teamsTable } from "@workspace/db";
import { requireUserId, ensureUser, hashTeamCodeValue } from "../lib/workspace.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

router.get("/workspace", async (req: AuthenticatedRequest, res) => {
  const userId = requireUserId(req);
  await ensureUser(userId, req.userEmail);
  const memberships = await db.select({ id: teamsTable.id, name: teamsTable.name, ownerId: teamsTable.ownerId, createdAt: teamsTable.createdAt }).from(teamMembersTable).innerJoin(teamsTable, eq(teamsTable.id, teamMembersTable.teamId)).where(eq(teamMembersTable.userId, userId));
  res.json({ userId, email: req.userEmail ?? null, teams: memberships });
});

router.post("/teams", async (req: AuthenticatedRequest, res) => {
  const userId = requireUserId(req);
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
  if (name.length < 2 || code.length < 6) { res.status(400).json({ error: "Team name and a team code of at least 6 characters are required." }); return; }
  await ensureUser(userId, req.userEmail);
  const [team] = await db.insert(teamsTable).values({ name, codeHash: await hashTeamCodeValue(code), ownerId: userId }).returning({ id: teamsTable.id, name: teamsTable.name, ownerId: teamsTable.ownerId, createdAt: teamsTable.createdAt });
  await db.insert(teamMembersTable).values({ teamId: team.id, userId });
  res.status(201).json(team);
});

router.post("/teams/join", async (req: AuthenticatedRequest, res) => {
  const userId = requireUserId(req);
  const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
  if (code.length < 6) { res.status(400).json({ error: "A valid team code is required." }); return; }
  await ensureUser(userId, req.userEmail);
  const [team] = await db.select({ id: teamsTable.id, name: teamsTable.name, ownerId: teamsTable.ownerId, createdAt: teamsTable.createdAt }).from(teamsTable).where(eq(teamsTable.codeHash, await hashTeamCodeValue(code))).limit(1);
  if (!team) { res.status(404).json({ error: "Team not found." }); return; }
  await db.insert(teamMembersTable).values({ teamId: team.id, userId }).onConflictDoNothing();
  res.json(team);
});

export default router;
