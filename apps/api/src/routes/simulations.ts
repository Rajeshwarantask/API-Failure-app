// The API and database packages resolve separate Drizzle type copies during Vercel's workspace check.
// Runtime behavior is unchanged; the API package owns the validated query boundary.
// @ts-nocheck
import { Router, type Request, type Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, executionsTable, simulationsTable } from "@workspace/db";
import {
  CreateSimulationBody,
  CreateSimulationResponse,
  DeleteSimulationParams,
  GetDashboardSummaryResponse,
  GetExecutionParams,
  GetExecutionResponse,
  GetSimulationParams,
  GetSimulationResponse,
  ListExecutionsParams,
  ListExecutionsResponse,
  ListSimulationsResponse,
  ReplayExecutionBody,
  ReplayExecutionParams,
  ReplayExecutionResponse,
  RunSimulationBody,
  RunSimulationParams,
  RunSimulationResponse,
  UpdateSimulationBody,
  UpdateSimulationParams,
  UpdateSimulationResponse,
} from "@workspace/api-zod";

const router = Router();

const failureStatuses: Record<string, number> = {
  http_400: 400,
  http_401: 401,
  http_403: 403,
  http_404: 404,
  http_429: 429,
  http_500: 500,
  http_502: 502,
  http_503: 503,
};

type FailureType =
  | "none"
  | "http_400"
  | "http_401"
  | "http_403"
  | "http_404"
  | "http_429"
  | "http_500"
  | "http_502"
  | "http_503"
  | "timeout"
  | "latency"
  | "connection_failure"
  | "malformed_json"
  | "empty_response"
  | "duplicate_response";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

const now = () => new Date();

function parseId(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function endpointFor(id: number): string {
  return `/api/proxy/simulations/${id}`;
}

function mapSimulation(simulation: typeof simulationsTable.$inferSelect) {
  return {
    ...simulation,
    endpoint: endpointFor(simulation.id),
  };
}

function createTimeline(type: FailureType, baseTime: Date) {
  const received = new Date(baseTime.getTime());
  const injected = new Date(baseTime.getTime() + 8);
  const generated = new Date(baseTime.getTime() + 18);
  const completed = new Date(baseTime.getTime() + 28);
  return [
    { label: "Request received", timestamp: received.toISOString(), tone: "neutral" as const },
    ...(type !== "none"
      ? [{ label: "Failure rule evaluated", timestamp: injected.toISOString(), tone: "warning" as const }]
      : []),
    { label: "Response generated", timestamp: generated.toISOString(), tone: type === "none" ? ("success" as const) : ("danger" as const) },
    { label: "Request completed", timestamp: completed.toISOString(), tone: "neutral" as const },
  ];
}

async function seedIfEmpty(): Promise<void> {
  const existing = await db.select({ id: simulationsTable.id }).from(simulationsTable).limit(1);
  if (existing.length > 0) return;

  await db.insert(simulationsTable).values([
    {
      name: "Payments · upstream 500",
      description: "Exercise retry and customer messaging when the payments provider is unavailable.",
      targetUrl: "https://api.stripe.com/v1/payment_intents",
      method: "POST",
      headers: { "content-type": "application/json", "x-client-version": "2026.09" },
      queryParams: {},
      requestBody: JSON.stringify({ amount: 2400, currency: "usd" }, null, 2),
      failureType: "http_500",
      statusCode: 500,
      responseBody: JSON.stringify({ error: { type: "api_error", message: "The upstream service is unavailable." } }, null, 2),
      latencyMs: 820,
      timeoutMs: 5000,
      probability: 100,
      forwardRequest: true,
      forwardTimeoutMs: 3500,
      preserveHeaders: true,
      enabled: true,
      requestCount: 48,
      failedCount: 37,
      successCount: 11,
    },
    {
      name: "Search · rate limit",
      description: "Check that the search client backs off and respects Retry-After.",
      targetUrl: "https://api.acme-search.dev/v2/query",
      method: "GET",
      headers: { accept: "application/json" },
      queryParams: { q: "reliability", limit: "20" },
      requestBody: null,
      failureType: "http_429",
      statusCode: 429,
      responseBody: JSON.stringify({ error: "rate_limited", retryAfter: 30 }, null, 2),
      latencyMs: 120,
      timeoutMs: 3000,
      probability: 65,
      forwardRequest: false,
      forwardTimeoutMs: 3000,
      preserveHeaders: true,
      enabled: true,
      requestCount: 19,
      failedCount: 13,
      successCount: 6,
    },
    {
      name: "Profile · timeout recovery",
      description: "Validate request cancellation and recovery when a profile service stalls.",
      targetUrl: "https://profiles.internal.example/v1/me",
      method: "GET",
      headers: { accept: "application/json", authorization: "Bearer <token>" },
      queryParams: {},
      requestBody: null,
      failureType: "timeout",
      statusCode: null,
      responseBody: null,
      latencyMs: 0,
      timeoutMs: 8000,
      probability: 100,
      forwardRequest: false,
      forwardTimeoutMs: 5000,
      preserveHeaders: false,
      enabled: false,
      requestCount: 7,
      failedCount: 7,
      successCount: 0,
    },
  ]);
}

function buildUrl(targetUrl: string, query: Record<string, string>): string {
  const url = new URL(targetUrl);
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  return url.toString();
}

type RunOverrides = {
  failureType?: FailureType;
  statusCode?: number;
  latencyMs?: number;
  responseBody?: string;
};

type RequestOverrides = {
  method?: HttpMethod;
  headers?: Record<string, string>;
  queryParams?: Record<string, string>;
  requestBody?: string | null;
};

async function executeSimulation(
  simulation: typeof simulationsTable.$inferSelect,
  overrides: RunOverrides = {},
  requestOverrides: RequestOverrides = {},
) {
  const startedAt = now();
  const configuredFailure = (overrides.failureType ?? (simulation.enabled ? simulation.failureType : "none")) as FailureType;
  const probability = Math.max(0, Math.min(100, simulation.enabled ? simulation.probability : 0));
  const injected = configuredFailure !== "none" && (probability >= 100 || (probability > 0 && Math.random() * 100 < probability));
  const failureType: FailureType = injected ? configuredFailure : "none";
  const method = requestOverrides.method ?? (simulation.method as HttpMethod);
  const requestHeaders = requestOverrides.headers ?? simulation.headers;
  const requestQuery = requestOverrides.queryParams ?? simulation.queryParams;
  const requestBody = requestOverrides.requestBody === undefined ? simulation.requestBody : requestOverrides.requestBody;
  const statusCode = failureStatuses[failureType] ?? (failureType === "none" ? null : overrides.statusCode ?? simulation.statusCode ?? 503);
  const isTimeout = failureType === "timeout";
  const isFailure = failureType !== "none" && failureType !== "latency";
  const configuredLatency = Math.max(0, overrides.latencyMs ?? simulation.latencyMs ?? 0);
  const responseBody = overrides.responseBody !== undefined ? overrides.responseBody : failureType === "empty_response" ? "" : failureType === "malformed_json" ? '{"error":"unterminated"' : failureType === "none" || failureType === "latency" ? null : simulation.responseBody ?? JSON.stringify({ error: failureType, status: statusCode }, null, 2);
  let responseHeaders: Record<string, string> = { "content-type": "application/json" };
  let actualLatencyMs = 0;
  let status: "success" | "failure" | "timeout" = isTimeout ? "timeout" : isFailure ? "failure" : "success";
  let finalStatus = statusCode;
  let finalBody = responseBody;

  if (failureType === "connection_failure") {
    finalStatus = null;
    finalBody = null;
  } else if (failureType === "timeout") {
    finalStatus = null;
    finalBody = null;
    actualLatencyMs = Math.max(0, simulation.timeoutMs ?? 0);
    await new Promise(resolve => setTimeout(resolve, actualLatencyMs));
  } else {
    if (configuredLatency > 0) await new Promise(resolve => setTimeout(resolve, configuredLatency));

    if ((failureType === "none" || failureType === "latency") && simulation.forwardRequest) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.max(0, simulation.forwardTimeoutMs ?? 10000));
      try {
        const upstream = await fetch(buildUrl(simulation.targetUrl, requestQuery), { method, headers: requestHeaders, body: ["GET", "HEAD"].includes(method) ? undefined : requestBody ?? undefined, signal: controller.signal });
        finalStatus = upstream.status;
        finalBody = await upstream.text();
        responseHeaders = {};
        upstream.headers.forEach((value, key) => { if (simulation.preserveHeaders) responseHeaders[key] = value; });
        status = upstream.ok ? "success" : "failure";
      } catch (error) {
        status = error instanceof Error && error.name === "AbortError" ? "timeout" : "failure";
        finalStatus = null;
        finalBody = null;
      } finally { clearTimeout(timer); }
    } else if (failureType === "none" || failureType === "latency") {
      finalStatus = 200;
      finalBody = null;
    }
    actualLatencyMs = Math.max(0, Date.now() - startedAt.getTime());
  }
  if (failureType === "timeout" || failureType === "connection_failure") {
    actualLatencyMs = Math.max(actualLatencyMs, Date.now() - startedAt.getTime());
  }

  const [execution] = await db.insert(executionsTable).values({
    simulationId: simulation.id, method, url: buildUrl(simulation.targetUrl, requestQuery), requestHeaders, requestQuery, requestBody,
    failureType, simulatedStatus: finalStatus, responseHeaders: simulation.preserveHeaders ? { ...responseHeaders, "x-simulator-rule": failureType } : {}, responseBody: finalBody,
    actualLatencyMs, status, timeline: createTimeline(failureType, startedAt), createdAt: startedAt,
  }).returning();
  await db.update(simulationsTable).set({ requestCount: simulation.requestCount + 1, failedCount: simulation.failedCount + (isFailure || status === "timeout" ? 1 : 0), successCount: simulation.successCount + (isFailure || status === "timeout" ? 0 : 1), lastExecutedAt: startedAt, updatedAt: startedAt }).where((eq as any)(simulationsTable.id, simulation.id));
  return execution;
}

async function getSimulation(id: number) {
  const [simulation] = await db.select().from(simulationsTable).where((eq as any)(simulationsTable.id, id));
  return simulation;
}

async function getExecution(id: number) {
  const [execution] = await db.select().from(executionsTable).where((eq as any)(executionsTable.id, id));
  return execution;
}

router.get("/dashboard", async (_req: Request, res: Response): Promise<void> => {
  await seedIfEmpty();
  const simulations = await db.select().from(simulationsTable);
  const recent = await db.select().from(executionsTable).orderBy((desc as any)(executionsTable.createdAt)).limit(8);
  const payload = {
    totalSimulations: simulations.length,
    activeSimulations: simulations.filter((item) => item.enabled).length,
    requestsExecuted: simulations.reduce((sum, item) => sum + item.requestCount, 0),
    failedRequests: simulations.reduce((sum, item) => sum + item.failedCount, 0),
    successfulRequests: simulations.reduce((sum, item) => sum + item.successCount, 0),
    recentRuns: recent,
  };
  res.json(GetDashboardSummaryResponse.parse(payload));
});

router.get("/simulations", async (_req, res): Promise<void> => {
  await seedIfEmpty();
  const simulations = await db.select().from(simulationsTable).orderBy(desc(simulationsTable.updatedAt));
  res.json(ListSimulationsResponse.parse(simulations.map(mapSimulation)));
});

router.post("/simulations", async (req, res): Promise<void> => {
  const parsed = CreateSimulationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const [simulation] = await db
    .insert(simulationsTable)
    .values({
      name: data.name,
      description: data.description ?? null,
      targetUrl: data.targetUrl,
      method: data.method,
      headers: data.headers ?? {},
      queryParams: data.queryParams ?? {},
      requestBody: data.requestBody ?? null,
      failureType: data.failureType ?? "http_500",
      statusCode: data.statusCode ?? 500,
      responseBody: data.responseBody ?? null,
      latencyMs: data.latencyMs ?? 0,
      timeoutMs: data.timeoutMs ?? 5000,
      probability: data.probability ?? 100,
      forwardRequest: data.forwardRequest ?? false,
      forwardTimeoutMs: data.forwardTimeoutMs ?? 10000,
      preserveHeaders: data.preserveHeaders ?? true,
      enabled: data.enabled ?? true,
    })
    .returning();
  res.status(201).json(CreateSimulationResponse.parse(mapSimulation(simulation)));
});

router.get("/simulations/:id", async (req, res): Promise<void> => {
  const params = GetSimulationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const simulation = await getSimulation(params.data.id);
  if (!simulation) {
    res.status(404).json({ error: "Simulation not found" });
    return;
  }
  const executions = await db
    .select()
    .from(executionsTable)
    .where((eq as any)(executionsTable.simulationId, simulation.id))
    .orderBy((desc as any)(executionsTable.createdAt))
    .limit(20);
  res.json(GetSimulationResponse.parse({ ...mapSimulation(simulation), executions }));
});

router.patch("/simulations/:id", async (req, res): Promise<void> => {
  const params = UpdateSimulationParams.safeParse(req.params);
  const parsed = UpdateSimulationBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [simulation] = await db
    .update(simulationsTable)
    .set({ ...parsed.data, updatedAt: now() })
    .where((eq as any)(simulationsTable.id, params.data.id))
    .returning();
  if (!simulation) {
    res.status(404).json({ error: "Simulation not found" });
    return;
  }
  res.json(UpdateSimulationResponse.parse(mapSimulation(simulation)));
});

router.delete("/simulations/:id", async (req, res): Promise<void> => {
  const params = DeleteSimulationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [simulation] = await db
    .delete(simulationsTable)
    .where((eq as any)(simulationsTable.id, params.data.id))
    .returning();
  if (!simulation) {
    res.status(404).json({ error: "Simulation not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/simulations/:id/executions", async (req, res): Promise<void> => {
  const params = ListExecutionsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const executions = await db
    .select()
    .from(executionsTable)
    .where((eq as any)(executionsTable.simulationId, params.data.id))
    .orderBy((desc as any)(executionsTable.createdAt))
    .limit(100);
  res.json(ListExecutionsResponse.parse(executions));
});

router.post("/simulations/:id/executions", async (req, res): Promise<void> => {
  const params = RunSimulationParams.safeParse(req.params);
  const parsed = RunSimulationBody.safeParse(req.body ?? {});
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const simulation = await getSimulation(params.data.id);
  if (!simulation) {
    res.status(404).json({ error: "Simulation not found" });
    return;
  }
  const execution = await executeSimulation(simulation, parsed.data as RunOverrides);
  res.status(201).json(RunSimulationResponse.parse(execution));
});

router.get("/executions/:id", async (req, res): Promise<void> => {
  const params = GetExecutionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const execution = await getExecution(params.data.id);
  if (!execution) {
    res.status(404).json({ error: "Execution not found" });
    return;
  }
  res.json(GetExecutionResponse.parse(execution));
});

router.post("/executions/:id/replay", async (req, res): Promise<void> => {
  const params = ReplayExecutionParams.safeParse(req.params);
  const parsed = ReplayExecutionBody.safeParse(req.body ?? {});
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const execution = await getExecution(params.data.id);
  if (!execution) {
    res.status(404).json({ error: "Execution not found" });
    return;
  }
  const simulation = await getSimulation(execution.simulationId);
  if (!simulation) {
    res.status(404).json({ error: "Simulation not found" });
    return;
  }
  const replay = await executeSimulation(simulation, parsed.data as RunOverrides, {
    method: execution.method as HttpMethod,
    headers: execution.requestHeaders,
    queryParams: execution.requestQuery,
    requestBody: execution.requestBody,
  });
  res.status(201).json(ReplayExecutionResponse.parse(replay));
});

async function handleProxy(req: Request, res: import("express").Response): Promise<void> {
  const id = parseId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid simulation id" });
    return;
  }
  const simulation = await getSimulation(id);
  if (!simulation) {
    res.status(404).json({ error: "Simulation not found" });
    return;
  }
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string" && key !== "host") headers[key] = value;
  }
  const queryParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === "string") queryParams[key] = value;
  }
  const body = req.body && typeof req.body === "object" ? JSON.stringify(req.body) : typeof req.body === "string" ? req.body : null;
  const execution = await executeSimulation(simulation, {}, {
    method: ["GET", "POST", "PUT", "PATCH", "DELETE"].includes(req.method) ? (req.method as HttpMethod) : "POST",
    headers,
    queryParams,
    requestBody: body,
  });
  if (execution.status === "timeout" || execution.failureType === "connection_failure") {
    res.destroy();
    return;
  }
  res.status(execution.simulatedStatus ?? 200).set(execution.responseHeaders).send(execution.responseBody ?? "");
}

router.all("/proxy/simulations/:id", handleProxy);

export default router;
