import { boolean, index, integer, jsonb, pgTable, real, serial, text, timestamp, uuid, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("faultline_users", {
  id: uuid("id").primaryKey(),
  displayName: text("display_name"),
  email: text("email").notNull(),
  retentionWeeks: integer("retention_weeks").notNull().default(2),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const teamsTable = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  codeHash: text("code_hash").notNull().unique(),
  teamCode: text("team_code").notNull(),
  ownerId: uuid("owner_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  retentionWeeks: integer("retention_weeks").notNull().default(2),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const teamMembersTable = pgTable("team_members", {
  teamId: integer("team_id").notNull().references(() => teamsTable.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({ primaryKey: primaryKey({ columns: [table.teamId, table.userId] }) }));

export const simulationsTable = pgTable("simulations", {
  id: serial("id").primaryKey(),
  ownerId: uuid("owner_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  teamId: integer("team_id").references(() => teamsTable.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  targetUrl: text("target_url").notNull(),
  method: text("method").notNull(),
  headers: jsonb("headers").$type<Record<string, string>>().notNull().default({}),
  queryParams: jsonb("query_params").$type<Record<string, string>>().notNull().default({}),
  requestBody: text("request_body"),
  failureType: text("failure_type").notNull().default("http_500"),
  statusCode: integer("status_code").default(500),
  responseBody: text("response_body"),
  latencyMs: integer("latency_ms").notNull().default(0),
  timeoutMs: integer("timeout_ms").notNull().default(5000),
  probability: real("probability").notNull().default(100),
  conditions: jsonb("conditions").$type<{
    method?: string;
    path?: string;
    headers?: Record<string, string>;
    queryParams?: Record<string, string>;
    bodyContains?: string;
  }>().notNull().default({}),
  workflow: jsonb("workflow").$type<Array<{
    failureType: string;
    statusCode?: number | null;
    attempts?: number;
    latencyMs?: number;
  }>>().notNull().default([]),
  forwardRequest: boolean("forward_request").notNull().default(false),
  forwardTimeoutMs: integer("forward_timeout_ms").notNull().default(10000),
  preserveHeaders: boolean("preserve_headers").notNull().default(true),
  executionToken: text("execution_token"),
  allowedOrigins: jsonb("allowed_origins").$type<string[]>().notNull().default([]),
  enabled: boolean("enabled").notNull().default(true),
  requestCount: integer("request_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  successCount: integer("success_count").notNull().default(0),
  lastExecutedAt: timestamp("last_executed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const integrationCredentialsTable = pgTable("integration_credentials", {
  id: serial("id").primaryKey(),
  simulationId: integer("simulation_id").notNull().references(() => simulationsTable.id, { onDelete: "cascade" }),
  ownerId: uuid("owner_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  keyPrefix: text("key_prefix").notNull(),
  keyHash: text("key_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  lastUsedIp: text("last_used_ip"),
}, (table) => ({ simulationIdIdx: index("integration_credentials_simulation_id_idx").on(table.simulationId), ownerIdIdx: index("integration_credentials_owner_id_idx").on(table.ownerId) }));

export const executionsTable = pgTable("executions", {
  id: serial("id").primaryKey(),
  ownerId: uuid("owner_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  teamId: integer("team_id").references(() => teamsTable.id, { onDelete: "set null" }),
  simulationId: integer("simulation_id").notNull().references(() => simulationsTable.id, { onDelete: "cascade" }),
  method: text("method").notNull(),
  url: text("url").notNull(),
  requestHeaders: jsonb("request_headers").$type<Record<string, string>>().notNull().default({}),
  requestQuery: jsonb("request_query").$type<Record<string, string>>().notNull().default({}),
  requestBody: text("request_body"),
  source: text("source").notNull().default("dashboard"),
  tokenAuthenticated: boolean("token_authenticated").notNull().default(false),
  requestIp: text("request_ip"),
  failureType: text("failure_type").notNull(),
  simulatedStatus: integer("simulated_status"),
  responseHeaders: jsonb("response_headers").$type<Record<string, string>>().notNull().default({}),
  responseBody: text("response_body"),
  actualLatencyMs: integer("actual_latency_ms").notNull().default(0),
  status: text("status").notNull(),
  timeline: jsonb("timeline").$type<Array<{ label: string; timestamp: string; tone: string }>>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSimulationSchema = createInsertSchema(simulationsTable).omit({
  id: true,
  ownerId: true,
  teamId: true,
  requestCount: true,
  failedCount: true,
  successCount: true,
  lastExecutedAt: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSimulation = z.infer<typeof insertSimulationSchema>;
export type Simulation = typeof simulationsTable.$inferSelect;
export type Execution = typeof executionsTable.$inferSelect;
