import { pgTable, foreignKey, serial, integer, text, jsonb, timestamp, real, boolean } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const executions = pgTable("executions", {
	id: serial().primaryKey().notNull(),
	simulationId: integer("simulation_id").notNull(),
	method: text().notNull(),
	url: text().notNull(),
	requestHeaders: jsonb("request_headers").default({}).notNull(),
	requestQuery: jsonb("request_query").default({}).notNull(),
	requestBody: text("request_body"),
	failureType: text("failure_type").notNull(),
	simulatedStatus: integer("simulated_status"),
	responseHeaders: jsonb("response_headers").default({}).notNull(),
	responseBody: text("response_body"),
	actualLatencyMs: integer("actual_latency_ms").default(0).notNull(),
	status: text().notNull(),
	timeline: jsonb().default([]).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.simulationId],
			foreignColumns: [simulations.id],
			name: "executions_simulation_id_simulations_id_fk"
		}).onDelete("cascade"),
]);

export const simulations = pgTable("simulations", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	targetUrl: text("target_url").notNull(),
	method: text().notNull(),
	headers: jsonb().default({}).notNull(),
	queryParams: jsonb("query_params").default({}).notNull(),
	requestBody: text("request_body"),
	failureType: text("failure_type").default('http_500').notNull(),
	statusCode: integer("status_code").default(500),
	responseBody: text("response_body"),
	latencyMs: integer("latency_ms").default(0).notNull(),
	timeoutMs: integer("timeout_ms").default(5000).notNull(),
	probability: real().default(100).notNull(),
	forwardRequest: boolean("forward_request").default(false).notNull(),
	forwardTimeoutMs: integer("forward_timeout_ms").default(10000).notNull(),
	preserveHeaders: boolean("preserve_headers").default(true).notNull(),
	enabled: boolean().default(true).notNull(),
	requestCount: integer("request_count").default(0).notNull(),
	failedCount: integer("failed_count").default(0).notNull(),
	successCount: integer("success_count").default(0).notNull(),
	lastExecutedAt: timestamp("last_executed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	conditions: jsonb().default({}).notNull(),
	workflow: jsonb().default([]).notNull(),
});
