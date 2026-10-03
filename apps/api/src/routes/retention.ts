import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db, teamMembersTable, teamsTable, usersTable } from "@workspace/db";
import { ensureUser, requireUserId } from "../lib/workspace.js";
import { getRetentionCutoff } from "../lib/retention.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

router.patch("/workspace/retention", async (req: AuthenticatedRequest, res) => {
  const userId = requireUserId(req);
  const weeks = Number(req.body?.weeks);
  const teamId = req.body?.teamId == null ? null : Number(req.body.teamId);
  if (![1, 2].includes(weeks) || (teamId !== null && !Number.isInteger(teamId))) {
    res.status(400).json({ error: "Retention must be exactly 1 or 2 weeks." }); return;
  }
  await ensureUser(userId, req.userEmail);
  if (teamId === null) {
    await db.update(usersTable).set({ retentionWeeks: weeks, updatedAt: new Date() }).where(eq(usersTable.id, userId));
    res.json({ weeks, deletionDate: getRetentionCutoff(weeks) }); return;
  }
  const [team] = await db.select({ ownerId: teamsTable.ownerId }).from(teamsTable).innerJoin(teamMembersTable, eq(teamMembersTable.teamId, teamsTable.id)).where(and(eq(teamsTable.id, teamId), eq(teamMembersTable.userId, userId))).limit(1);
  if (!team) { res.status(403).json({ error: "You are not a member of that team." }); return; }
  if (team.ownerId !== userId) { res.status(403).json({ error: "Only the team owner can change shared retention." }); return; }
  await db.update(teamsTable).set({ retentionWeeks: weeks }).where(eq(teamsTable.id, teamId));
  res.json({ weeks, deletionDate: getRetentionCutoff(weeks) });
});

export default router;
