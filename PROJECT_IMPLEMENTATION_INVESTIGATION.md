# FaultLine — Deep Implementation Investigation

> Targeted follow-up to `PROJECT_KNOWLEDGE_REPORT.md`. This document is based on executable source inspected in `apps/api/src/routes/simulations.ts`, `apps/api/src/middleware/auth.ts`, `apps/api/src/lib/workspace.ts`, `apps/api/src/lib/retention.ts`, `apps/frontend/src/App.tsx`, `apps/frontend/src/components/auth-gate.tsx`, `apps/frontend/src/lib/supabase.ts`, and `packages/db/src/schema/simulations.ts`.
>
> Labels: **VERIFIED** means directly supported by source; **INFERRED** means a reasonable interpretation; **NOT IMPLEMENTED** means no implementation was found in the inspected path; **POTENTIAL LIMITATION** identifies a weakness visible in the implementation.

## 1. Complete simulation execution engine

### Entry point and authorization

**VERIFIED — `apps/api/src/routes/simulations.ts`, `POST /simulations/:id/executions` (around lines 477–495).** The endpoint first parses the path with `RunSimulationParams.safeParse` and the body with `RunSimulationBody.safeParse`. Invalid input returns HTTP 400 before any database lookup. It then calls `requireUserId(req)`, passes that ID to `getSimulation`, and returns HTTP 404 when `getAccessibleSimulation` cannot find an owned or team-accessible simulation. The route calls `executeSimulation(simulation, parsed.data as RunOverrides)` and returns the persisted execution with HTTP 201 after parsing it through `RunSimulationResponse`.

Authentication happens before the router in `requireAuth` (`apps/api/src/middleware/auth.ts`). The middleware extracts `Bearer <token>`, verifies it, attaches `payload.sub` as `request.userId`, and rejects missing, invalid, or expired tokens with HTTP 401. The route-level access predicate is in `apps/api/src/lib/workspace.ts`.

### Exact execution sequence

1. **Request and body validation — VERIFIED.** `POST /simulations/:id/executions` validates route and body schemas.
2. **User and simulation lookup — VERIFIED.** `requireUserId` obtains the authenticated subject. `getSimulation` delegates to `getAccessibleSimulation`, whose `simulationAccess` predicate allows `simulations.owner_id = userId` or an existing `team_members` row for the simulation’s team.
3. **Start timestamp — VERIFIED.** `executeSimulation` captures `startedAt = now()`.
4. **Runtime request construction — VERIFIED.** Method, headers, query parameters, and body come from `requestOverrides` when present; otherwise they come from the simulation. `requestBody` preserves an explicit `null` because only `undefined` falls back to stored data.
5. **Effective URL and conditions — VERIFIED.** Conditions are evaluated against the simulation target URL and the effective request. Method comparison uppercases the configured condition; path uses `pathname.includes`; headers accept a lower-case or exact key; query values use exact equality; body uses substring matching. Any mismatch returns `false`.
6. **Workflow selection — VERIFIED.** `overrides.workflow` takes precedence over stored `simulation.workflow`. If non-empty, the implementation selects the first step whose `attempts ?? 1` is greater than zero using `.find`. It does not iterate workflow steps in this function.
7. **Failure selection — VERIFIED.** The chosen failure is, in order: selected workflow step failure, `overrides.failureType`, stored failure when the simulation is enabled and conditions match, otherwise `none`.
8. **Probability — VERIFIED.** Probability is clamped to 0–100. It is the simulation probability only when the simulation is enabled and conditions match; otherwise it becomes zero. The random generator is created with `overrides.seed ?? simulation.id`. Injection occurs when the selected failure is not `none` and either probability is 100 or `random() * 100 < probability`.
9. **Status/body setup — VERIFIED.** Known HTTP failures map through `failureStatuses`. A non-HTTP failure can use `overrides.statusCode`, stored status, or 503. Empty response becomes an empty string; malformed JSON becomes the literal malformed JSON string; `none` and `latency` initially have no body; other failures use stored response or a generated error object.
10. **Branch selection — VERIFIED.** Connection failure clears status/body. Timeout clears status/body, waits `simulation.timeoutMs`, and reports timeout. Duplicate response becomes a single 502 with diagnostic JSON and `x-faultline-duplicate-response`. Other paths optionally wait configured latency and then either forward upstream or generate a local 200 response.
11. **Persistence — VERIFIED.** The execution insert stores owner/team/simulation IDs, effective method and built URL, effective headers/query/body, chosen failure type, final status, response headers/body, measured latency, status, timeline, and original start time.
12. **Counters — VERIFIED.** A second, separate update increments request count and increments failed count for `isFailure` or timeout; otherwise it increments success count. It sets `lastExecutedAt` and `updatedAt` to `startedAt`.
13. **Response — VERIFIED.** The inserted record is returned to the route, parsed by `RunSimulationResponse`, and sent as HTTP 201.

### Flow diagram

```text
Bearer token
  -> requireAuth
  -> parse id/body
  -> requireUserId
  -> getAccessibleSimulation / owner-or-team predicate
  -> executeSimulation
       -> apply request overrides
       -> match conditions
       -> choose workflow/failure
       -> seeded probability decision
       -> local failure / local success / upstream forwarding
       -> build timeline
       -> INSERT execution
       -> UPDATE simulation counters
  -> 201 execution JSON
```

**POTENTIAL LIMITATION — counter consistency.** Insert and counter update are not inside a transaction. Two concurrent executions can both read the same old counters and overwrite one another’s increments. There is no atomic SQL increment or transaction in this function.

**Interview follow-ups:** Why is authorization performed before execution? What would change if execution insert and counters were wrapped in a transaction with atomic increments?

## 2. Request forwarding and upstream communication

### Construction

**VERIFIED — `buildUrl` and the forwarding branch in `executeSimulation`.** `buildUrl` creates `new URL(targetUrl)` and applies every query entry with `searchParams.set`, replacing duplicate keys rather than appending them. The forwarding URL uses the stored `simulation.targetUrl` and the effective query object. Method uses the effective request method. Headers use the effective request headers unchanged. `GET` and `HEAD` omit the body; other methods use the effective body when non-null.

**VERIFIED — `preserveHeaders`.** Upstream response headers are initially discarded into a new object. The code copies upstream headers only when `simulation.preserveHeaders` is true. The later execution insert stores either those headers plus `x-simulator-rule`, or `{}` when preservation is false. Request headers are not filtered in this branch. In the separate proxy route, incoming `host` is removed before becoming request headers.

### When forwarding happens

**VERIFIED.** Forwarding occurs only when `failureType` is `none` or `latency` and `simulation.forwardRequest` is true. A configured HTTP failure, timeout, connection failure, malformed JSON, empty response, or duplicate response does not reach `fetch` in `executeSimulation`; it takes its direct simulation branch first. Therefore failure selection occurs before forwarding.

### Normal forwarded request

1. Conditions and probability produce `failureType = none`.
2. If configured latency is positive, the server waits before forwarding.
3. An `AbortController` is created and a timer calls `abort()` after `forwardTimeoutMs`.
4. `fetch(buildUrl(...), { method, headers, body, signal })` sends the upstream request.
5. The upstream status and `await upstream.text()` become the final status/body.
6. Response headers are copied only when preservation is enabled.
7. `status` is `success` for `upstream.ok`, otherwise `failure`, even when no FaultLine failure was injected.
8. The timer is cleared in `finally`, latency is measured from the original start, and the result is persisted.

### Failed forwarded request

If the timer aborts the request, the catch branch recognizes `Error.name === "AbortError"`, sets `status = "timeout"`, and clears final status/body. Other fetch errors set `status = "failure"` and also clear final status/body. Upstream HTTP 4xx/5xx responses are not thrown by `fetch`; they are read normally and become `failure` because `upstream.ok` is false. An upstream malformed or empty body is stored as returned text; no JSON parse is attempted.

The public proxy route (`router.all("/proxy/simulations/:id", handleProxy)`) collects incoming headers except `host`, string query values, and a JSON/string request body, then calls the same engine with request overrides. If the resulting execution is timeout or connection failure, it calls `res.destroy()` rather than returning a normal HTTP response. Otherwise it sends `execution.responseBody` with the stored response headers and `simulatedStatus ?? 200`.

**Interview follow-up:** Why does an upstream HTTP 503 produce an execution failure with status 503, while a network failure produces a destroyed proxy connection and no HTTP status?

## 3. Seeded randomness and reproducibility

### Generator

**VERIFIED — `seededRandom` in `apps/api/src/routes/simulations.ts`.** It initializes `state = seed >>> 0`. Each draw updates:

```text
state = (1664525 * state + 1013904223) >>> 0
value = state / 4294967296
```

`>>> 0` converts the JavaScript number into an unsigned 32-bit value. Division by 2^32 normalizes the draw to `[0, 1)`. A seed of `0` is valid because the nullish operator checks only `undefined`/`null` behavior through the caller’s expression, not truthiness.

The default seed is `simulation.id`. An explicit `overrides.seed` is accepted by `RunOverrides`, replay body parsing, and recovery calls. Each `executeSimulation` call creates a new generator, so every execution resets to its chosen seed. The current function performs at most one random draw: it short-circuits for probability 100 and does not draw when the selected failure is `none` or probability is 0.

### Small numerical example

For seed `1`, the first state is:

```text
1664525 × 1 + 1013904223 = 1015568748
```

After unsigned 32-bit normalization, the draw is approximately `0.2364555`. With probability `25`, the condition is `0.2364555 × 100 < 25`, so injection occurs. With probability `20`, it does not.

### What is reproducible?

- **Random sequence — VERIFIED:** same numeric seed and same number of draws produce the same LCG sequence.
- **Failure decision — VERIFIED with conditions:** the decision repeats when seed, enabled state, conditions, selected failure, and probability are the same.
- **Complete execution — NOT GUARANTEED:** latency, upstream response/body/status, current simulation configuration, current forwarding target, current wall-clock timestamps, and concurrent state can differ. Replay also uses the current simulation, not a full immutable snapshot.

**POTENTIAL LIMITATION.** The execution table stores the resulting failure and request, but not the seed, random draw, probability decision, or conditions-match result. A reader can infer the outcome but cannot prove which draw produced it. Replay accepts a new seed and does not automatically preserve the original seed.

## 4. Recovery workflows, replay, and comparison

### Recovery workflows

**VERIFIED — storage.** `simulations.workflow` is JSONB containing an ordered array of `{ failureType, statusCode?, attempts?, latencyMs? }`. The creation route stores `data.workflow` directly after shared schema validation. The recovery route is `POST /simulations/:id/recovery`.

**VERIFIED — actual behavior.** The recovery route chooses request-body workflow or stored workflow, then loops through every step in array order. For each step it clamps attempts to 1–100 and calls `executeSimulation` once per attempt. Each attempt uses `seed = supplied seed or simulation.id + attempt`, so later attempts use different numeric seeds. The response returns all created executions and sets `recovered` only when the final execution has `status === "success"`.

**NOT IMPLEMENTED / IMPORTANT INTERPRETATION.** There is no stop-on-success check inside the loop, no conditional fallback based on the prior result, and no retry delay beyond a step’s normal simulation latency. Every step and every attempt is executed even if an earlier attempt succeeds. `attempts` is a loop count, not a retry policy with backoff. `statusCode` and `latencyMs` are passed as overrides; the current engine’s timeout branch uses `simulation.timeoutMs`, while configured step latency is only used if passed through the supported override path. This means workflow fields should not be described as a full recovery engine.

### Replay

**VERIFIED — `POST /executions/:id/replay`.** The endpoint validates the execution ID/body, authorizes the original execution, authorizes its current simulation, and calls `executeSimulation` with the current simulation plus request overrides copied from the original execution: method, request headers, query, and request body. Replay can supply new `failureType`, `statusCode`, `latencyMs`, `responseBody`, `seed`, and workflow through the body.

Replay creates a new execution. It does not copy the original timestamp, ID, seed, random draw, conditions result, response headers, or original simulation snapshot. If the simulation changed after the original run, the replay uses the changed failure configuration, probability, forwarding settings, timeout, and target URL while retaining the original request shape.

### Comparison

**VERIFIED — `POST /executions/:id/compare`.** The backend loads an original execution from the URL ID and a replay execution from `req.body.replayExecutionId`, using the same user-scoped `getExecution` helper. It returns both records and a fixed difference object: status changed, replay latency minus original latency, failure type changed, response body changed, and timeline JSON changed. No deep JSON diff is performed; response comparison is string inequality. Comparison is backend-side, not a frontend-only calculation.

**Interview follow-up:** What behavior would you change to make recovery stop after the first success? What immutable execution inputs must be stored for faithful replay?

## 5. Authentication, authorization, and tenant isolation

### Authentication

**VERIFIED — frontend.** `apps/frontend/src/lib/supabase.ts` creates a Supabase client from `VITE_*` or `NEXT_PUBLIC_*` URL and publishable/anon key. `auth-gate.tsx` calls `supabase.auth.getSession()`, stores the session, subscribes to `onAuthStateChange`, and installs an API auth-token getter returning `session.access_token`.

**VERIFIED — backend.** `requireAuth` extracts the Bearer token and verifies it with `jose`. HS256 tokens use `SUPABASE_JWT_SECRET`. Other accepted algorithms use a remote JWKS set at `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`, with allowed algorithms ES256 and RS256. The JWT subject must be a string. Expiration and signature errors fall into the catch branch and return `Invalid or expired authentication token.`. The code copies email and a display name from `payload.user_metadata` for profile synchronization; this metadata is not used as an authorization predicate.

### Authorization

`simulationAccess` allows a user when they own the simulation or have a matching `team_members` row for its `team_id`. Simulation reads, execution reads, run, replay, comparison, deletion, updates, proxy access, and recovery first use either `getAccessibleSimulation` or `getExecution`, which joins executions to simulations and applies `simulationAccess`.

Team creation and membership operations are in `apps/api/src/routes/workspace.ts`. The create-simulation route additionally calls `canAccessTeam` before accepting a supplied team ID. Team access therefore has both application checks and database predicates.

### Database security and gaps

**VERIFIED — schema and migration.** RLS was enabled for `faultline_users`, `teams`, `team_members`, `simulations`, and `executions`, with policies for owner/member access and authenticated grants; anonymous table access was revoked. Foreign keys cascade user/team-member deletion, cascade simulation deletion to executions, and set simulation/team references to null where configured.

**POTENTIAL LIMITATION.** The application uses a server-side Drizzle database connection rather than issuing Supabase user-context queries. RLS normally evaluates the PostgreSQL role/session JWT; a server connection using a privileged database role can bypass RLS. Therefore application authorization remains the effective boundary for API requests, and the presence of RLS does not by itself prove end-to-end enforcement through this connection. This should be verified against the deployed database role configuration.

**POTENTIAL LIMITATION.** The RLS policy for `teams` allows member reads but its `WITH CHECK` requires `owner_id = auth.uid()` for writes. That may be appropriate for owner-controlled writes, but it is stricter than the application’s general team-membership read model. The exact behavior depends on which database role executes queries.

## 6. Database operations and consistency

`faultline_users.id` is a UUID matching the Supabase subject. Teams use serial integer IDs and reference users. `team_members` has a composite primary key `(team_id, user_id)` and cascading foreign keys. Simulations reference an owner and optional team; executions reference owner, optional team, and simulation. Deleting a simulation cascades to its executions.

Headers, query parameters, conditions, workflow, response headers, and timeline are JSONB. This supports flexible simulator configuration and timeline data but moves some validation and shape guarantees into Zod/application code. Request and response bodies are text, so malformed JSON can intentionally be stored.

Create, update, delete, execution insert, and counter update are individual Drizzle statements. There is no explicit transaction in `executeSimulation`. The counter update calculates values from the simulation object loaded before execution:

```text
requestCount = simulation.requestCount + 1
failedCount  = simulation.failedCount + failureIncrement
successCount = simulation.successCount + successIncrement
```

**POTENTIAL LIMITATION — verified as a real race possibility.** If two requests load `requestCount = 10` concurrently, both can later write `11`. The same can happen to failed/success counters. Execution rows are still independently inserted, so the history can show two runs while counters show one increment. Atomic SQL expressions or a transaction with appropriate locking would remove this lost-update behavior.

There is no cleanup call in the inspected simulation route. Retention logic exists in `apps/api/src/lib/retention.ts`: it computes a cutoff of `weeks * 7` days and deletes old personal simulations and old team simulations. Because simulation deletion cascades, associated executions are removed. Whether cleanup is scheduled and invoked in production was **NOT VERIFIED** by the inspected files.

## 7. Frontend architecture and data flow

**VERIFIED.** `apps/frontend/src/App.tsx` uses Wouter `Route`, `Switch`, `Link`, `useLocation`, and `useParams` to compose dashboard, simulations, simulation editor/detail, execution inspector, replay, comparison, recovery, profile, and settings paths. Generated hooks from `@workspace/api-client-react` use TanStack Query for reads and mutations.

The Supabase auth gate owns session loading and auth-state subscription. The API client receives the current access token through the installed token getter. Screens call generated query hooks; mutation success handlers invalidate relevant query keys. For example, simulation creation/update invalidates list/detail queries and routes to the detail page; list execution invalidates the simulation list after a run.

`SimulationForm` stores editable values in local React state. `toForm` converts persisted values into JSON text fields; submit validates URL, name, probability, timing, JSON maps, request body, and response body before creating or updating. Server mutation errors pass through `errorText` into the form error banner.

The Inspector uses `useGetExecution` and then loads its simulation with `useGetSimulation`. It renders the execution timeline and Developer Actions. Replay and compare use generated hooks and route state; the backend supplies new execution records and fixed comparison fields. The regression-test generator receives the persisted execution object directly, builds framework templates locally, and does not call a separate generation API.

**POTENTIAL LIMITATION.** Several page handlers use broad `any` casts around generated responses and the API route file has `@ts-nocheck` because of workspace Drizzle type-copy resolution. Runtime validation still exists at the API boundaries, but compile-time guarantees are weaker in those locations.

## 8. Verified failure types and runtime semantics

| Identifier | Branch/result | Status/body | Latency | Forwarding |
|---|---|---|---|---|
| `none` | Normal path | Local 200 with null body, or upstream result | Measured; configured latency first | Yes, only when `forwardRequest` |
| `http_400` | Generic simulated failure | 400; stored/generated body | Configured latency | No |
| `http_401` | Generic simulated failure | 401; stored/generated body | Configured latency | No |
| `http_403` | Generic simulated failure | 403; stored/generated body | Configured latency | No |
| `http_404` | Generic simulated failure | 404; stored/generated body | Configured latency | No |
| `http_429` | Generic simulated failure | 429; stored/generated body | Configured latency | No |
| `http_500` | Generic simulated failure | 500; stored/generated body | Configured latency | No |
| `http_502` | Generic simulated failure | 502; stored/generated body | Configured latency | No |
| `http_503` | Generic simulated failure | 503; stored/generated body | Configured latency | No |
| `timeout` | Clears response and waits `simulation.timeoutMs` | No HTTP status/body; execution status `timeout` | Timeout duration | No |
| `latency` | Treated as non-failure; waits configured latency | Local 200/null or upstream result | Configured latency | Yes when configured |
| `connection_failure` | Clears response without network call | No HTTP status/body; execution failure | Usually near-zero | No |
| `malformed_json` | Stores literal malformed JSON | No automatic parse; status uses mapped/fallback status | Configured latency | No |
| `empty_response` | Stores empty string | Status uses mapped/fallback status | Configured latency | No |
| `duplicate_response` | Models duplicate write as one response | 502 diagnostic JSON plus marker header | Measured branch time | No |

`failureStatuses` contains only the HTTP identifiers. For non-HTTP failures, `overrides.statusCode`, stored status, or 503 is used before branch-specific overrides. The execution row records the chosen failure type, final status, body, headers, latency, status, and timeline. `createTimeline` always creates request received, response generated, and request completed; it inserts failure-rule-evaluated only when the chosen type is not `none`.

## 9. Additional important implementation findings

### Shared validation and normalization

**VERIFIED.** The API uses shared Zod schemas from `@workspace/api-zod` for create/update/run/replay parameter and body validation. The frontend performs earlier UX validation but the server remains authoritative. Simulation creation defaults failure type, status, latency, probability, forwarding, timeout, header preservation, and enabled state when fields are absent.

### Proxy serialization

**VERIFIED.** The proxy accepts JSON bodies and string bodies. JSON request bodies are serialized with `JSON.stringify`; query values are only retained when Express exposes them as strings; array query values are dropped. Unsupported HTTP methods fall back to POST in the proxy override.

### Sensitive header masking and code generation

**VERIFIED.** `apps/frontend/src/components/developer-actions.tsx` masks names matching `authorization`, `cookie`, `set-cookie`, or `x-api-key` when masking is enabled. It formats request code for cURL, fetch, Axios, Python, and raw HTTP using the persisted execution request. This is presentation-level masking: it does not remove secrets from database records or server logs.

### Seed data

**VERIFIED.** `seedIfEmpty` runs for dashboard and simulation-list requests. It ensures the authenticated user exists and inserts three sample simulations only when that user has no simulations. This is lazy per-user seeding, not a migration seed.

### Error propagation

**VERIFIED.** API validation uses 400, missing accessible resources use 404, team access failures use 403, auth middleware uses 401, and the frontend mutation/query error is rendered through its shared error text helper. Upstream connection and timeout errors become execution records; the proxy additionally destroys the current response connection for transport-level simulation failures.

## 10. Remaining unresolved implementation questions

The following points require deployment or additional source evidence and are intentionally not asserted:

1. Whether the production Drizzle connection uses a Supabase privileged role that bypasses RLS.
2. Whether retention cleanup is scheduled, invoked at startup, or only available as an unused helper.
3. Whether the generated API client always refreshes the Supabase token before each request or only reads the current session through its getter.
4. Whether all UI replay/recovery/comparison buttons are reachable in every deployed route variant; the backend endpoints are verified, but a full browser session with authenticated data was not available for this source audit.
5. Whether upstream request credentials are intentionally allowed through forwarding; the forwarding branch does not redact request headers.

## 11. Source-specific interview follow-ups

- Walk through `executeSimulation` and explain why failure selection must happen before forwarding.
- Show how a 503 returned by upstream differs from a simulated `http_503` execution.
- Explain why replay is not a perfect replay even when it copies the original request.
- Demonstrate the lost-update counter race with two concurrent requests and propose an atomic Drizzle update.
- Explain why RLS policy presence does not prove protection when a server-side privileged connection is used.
- Describe how a persisted seed, random draw, conditions result, and simulation snapshot would improve forensic reproducibility.
