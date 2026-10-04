import { and, eq, sql } from "drizzle-orm";
import { db, simulationsTable, teamMembersTable, usersTable } from "@workspace/db";

export function requireUserId(request: { userId?: string }): string {
  if (!request.userId) throw new Error("Authenticated user is required");
  return request.userId;
}

export function simulationAccess(userId: string, simulationId?: number) {
  const idClause = simulationId === undefined ? undefined : eq(simulationsTable.id, simulationId);
  return and(
    idClause,
    sql`(${simulationsTable.ownerId} = ${userId} OR EXISTS (SELECT 1 FROM ${teamMembersTable} tm WHERE tm.team_id = ${simulationsTable.teamId} AND tm.user_id = ${userId}))`,
  );
}

export async function ensureUser(userId: string, email?: string, displayName?: string) {
  await db.insert(usersTable).values({ id: userId, email: email ?? `${userId}@supabase.local`, displayName: displayName || null }).onConflictDoUpdate({ target: usersTable.id, set: { ...(email ? { email } : {}), ...(displayName ? { displayName } : {}), updatedAt: new Date() } });
}

export async function canAccessTeam(userId: string, teamId: number) {
  const [member] = await db.select({ userId: teamMembersTable.userId }).from(teamMembersTable).where(and(eq(teamMembersTable.teamId, teamId), eq(teamMembersTable.userId, userId))).limit(1);
  return Boolean(member);
}

export function hashTeamCode(code: string) {
  return sql`encode(digest(${code.trim()}, 'sha256'), 'hex')`;
}

export async function hashTeamCodeValue(code: string) {
  const crypto = await import("node:crypto");
  return crypto.createHash("sha256").update(code.trim()).digest("hex");
}

export async function getAccessibleSimulation(userId: string, id: number) {
  const [simulation] = await db.select().from(simulationsTable).where(simulationAccess(userId, id)).limit(1);
  return simulation;
}
