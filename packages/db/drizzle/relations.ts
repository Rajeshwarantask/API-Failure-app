import { relations } from "drizzle-orm/relations";
import { simulations, executions } from "./schema";

export const executionsRelations = relations(executions, ({one}) => ({
	simulation: one(simulations, {
		fields: [executions.simulationId],
		references: [simulations.id]
	}),
}));

export const simulationsRelations = relations(simulations, ({many}) => ({
	executions: many(executions),
}));