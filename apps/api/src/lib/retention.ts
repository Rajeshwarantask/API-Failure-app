import { and, eq, isNull, lt } from "drizzle-orm";
import { db, simulationsTable, teamsTable, usersTable } from "@workspace/db";

export function retentionCutoff(weeks: number) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - weeks * 7);
  return cutoff;
}

export async function cleanupExpiredData() {
  const users = await db.select({ id: usersTable.id, retentionWeeks: usersTable.retentionWeeks }).from(usersTable);
  for (const user of users) {
    await db.delete(simulationsTable).where(and(eq(simulationsTable.ownerId, user.id), isNull(simulationsTable.teamId), lt(simulationsTable.createdAt, retentionCutoff(user.retentionWeeks))));
  }
  const teams = await db.select({ id: teamsTable.id, retentionWeeks: teamsTable.retentionWeeks }).from(teamsTable);
  for (const team of teams) {
    await db.delete(simulationsTable).where(and(eq(simulationsTable.teamId, team.id), lt(simulationsTable.createdAt, retentionCutoff(team.retentionWeeks))));
  }
}

export function startRetentionCleanup() {
  void cleanupExpiredData().catch(() => undefined);
  return setInterval(() => void cleanupExpiredData().catch(() => undefined), 60 * 60 * 1000);
}

export { retentionCutoff as getRetentionCutoff };
