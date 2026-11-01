# FaultLine — Technical Knowledge Report

> Evidence-based interview preparation for the FaultLine API failure simulation workspace.

## 1. Project overview

FaultLine is a developer tool for making API failure behavior repeatable. Instead of waiting for a real payment outage, expired token, timeout, malformed response, or rate limit, an engineer defines the request path and the failure rule, executes it, inspects the result, and turns the result into recovery code or a regression test.

The verified product capabilities are: simulation creation and editing; failure recipes; probabilistic and condition-based failure injection; optional upstream forwarding; execution history; an Execution Inspector; replay and comparison; recovery workflows; request/code generation; regression-test generation; duplication of simulations; profile/workspace context; and authenticated API access.

The key engineering value is observability plus reproducibility. A run is persisted as an execution record containing the request, simulated result, response, latency, status, timeline, simulation ID, owner, and team context. This gives the frontend enough evidence to explain not only *what* failed, but which configured path produced the result.

## 2. Architecture

```text
Browser UI (React + Wouter)
        |
        | generated React Query hooks / authenticated requests
        v
Express API routes
        |
        | auth middleware + workspace access helpers
        v
Drizzle ORM + PostgreSQL/Supabase
        |
        +--> simulations
        +--> executions
        +--> users, teams, team_members

Optional during execution: API server -> configured upstream URL
```

The frontend is a React application. `App.tsx` owns the route composition and major screens, while reusable components provide the Developer Actions, regression-test generator, and failure recipes. Wouter maps paths such as `/simulations/new`, `/simulations/:id`, and `/executions/:id`. TanStack Query, through generated API-client hooks, loads and mutates server state.

The Express API is the control plane. It validates request bodies with shared Zod schemas, authenticates the request, checks owner/team access, executes simulation logic, and persists results through Drizzle. The database schema stores ownership explicitly: simulations and executions have `owner_id`, and optional `team_id`; team membership is represented by the join table `team_members`.

Supabase Auth supplies the user identity. The server uses the authenticated user ID as a query boundary rather than trusting a client-provided owner. RLS policies have also been applied to the five application tables, with authenticated access restricted by ownership or team membership and anonymous table access revoked.

## 3. Main execution workflow

1. A user opens **Create Simulation** and enters a target URL, method, headers, query parameters, body, failure type, status, response, latency, probability, conditions, and forwarding settings.
2. The frontend sends the validated form through the generated `useCreateSimulation` mutation.
3. The API validates the body, confirms any requested team is accessible, assigns the authenticated user as `ownerId`, and inserts the simulation.
4. When the user runs it, the API loads the accessible simulation and applies request overrides if supplied.
5. Conditions are evaluated in order: method, URL path, headers, query parameters, and body substring. A mismatch disables the configured probability for that request.
6. The configured failure is selected. If probability is below 100%, the seeded pseudo-random generator decides whether injection occurs.
7. The engine either creates a simulated response or forwards the request upstream. Forwarding uses `AbortController` and a timeout; upstream status and body are captured when the request completes.
8. The API computes final status, body, headers, latency, and lifecycle timeline, inserts an execution, and updates simulation counters.
9. The Inspector loads the execution and related simulation, then renders status, request/response evidence, timeline, Developer Actions, and regression-test output.

## 4. Feature implementation

### Simulation builder and recipes

The form state is a single `FormState` object. `toForm` converts persisted simulation data into editable strings and JSON text areas. `parseJsonMap` rejects arrays and non-object JSON, preventing malformed header/query objects from silently becoming valid configuration. Failure Recipes are patches applied to the existing form through `applyRecipe`; they are convenience presets, not a second persistence model.

Important edge cases are invalid JSON, missing required URL/name values, invalid status and probability ranges, and recipes that users must still review before saving. The actual API remains the final validation boundary.

### Condition matching and deterministic probability

`matchesConditions` returns `true` for an empty condition set. Otherwise every configured condition must match. Header lookup accepts either lowercase or original key spelling; path matching uses `pathname.includes`; body matching uses substring search. This is simple and predictable, but it is not a full expression language.

The engine uses an LCG-style seeded generator:

```text
state = (1664525 * state + 1013904223) modulo 2^32
random = state / 2^32
```

JavaScript’s unsigned right shift (`>>> 0`) constrains state to 32-bit unsigned arithmetic. Using the simulation ID as the default seed means the same simulation can make repeatable probability decisions for the same execution setup; an explicit run seed can override it. Probability is clamped to 0–100. At 100% injection occurs without drawing randomness; at 0% it never injects.

An interviewer may ask why this is useful: deterministic pseudo-randomness allows a failure to be reproduced during debugging and test automation. It is not cryptographically secure and should not be used for security decisions. A stronger design could persist the exact seed and random draw in the execution record; the current schema persists the result and timeline, but not those decision inputs.

### Failure and forwarding behavior

HTTP failure types map to status codes such as 401, 429, 500, and 503. Timeout and connection failure deliberately have no final HTTP status. Latency waits before producing the response but is not classified as a failure. Empty and malformed JSON alter the response body. Duplicate response is modeled as a single 502 with diagnostic metadata because an HTTP request cannot safely emit two responses.

For pass-through or latency paths with forwarding enabled, the API constructs the target URL with query parameters, sends the request using the configured method and body, aborts after `forwardTimeoutMs`, and optionally preserves upstream headers. An abort becomes a timeout; other fetch failures become a failure with no final status. This is a practical failure-injection proxy model: the simulator controls the response while retaining a controlled path to the real dependency.

### Execution Inspector and Developer Actions

The Inspector renders the actual persisted execution. Developer Actions provides deterministic code derived from execution fields:

- **Copy request:** cURL, fetch, Axios, Python requests, and raw HTTP; sensitive authorization, cookie, and API-key headers are masked by default.
- **Handle this error:** retryable versus non-retryable TypeScript/fetch handling based on status/failure type.
- **Why did this fail?:** condition results, probability, selected failure, final status, forwarding state, and timeline.
- **Create test:** opens the regression generator in the Inspector rather than navigating away.

The regression generator uses method, URL, headers, body, observed status, and failure type to create Vitest, Jest, Playwright, pytest, or JUnit templates. The output is a starting point: the developer still decides the test environment, exact assertion, and fixture strategy.

### Duplicate, replay, comparison, and recovery

Duplicate opens `/simulations/new?duplicate=:id`, loads the source through the normal simulation query, copies configuration, appends `copy` to the name, and resets execution counters before save. This avoids mutating the original scenario.

Replay calls the existing execution endpoint with the original request context. Comparison loads two executions and presents differences in status, latency, response, and failure behavior. Recovery workflows store ordered fallback attempts with failure type, status, attempt count, and latency; the API selects the first available workflow step during execution.

## 5. Algorithms and engineering trade-offs

The project uses a layered architecture: route handlers coordinate, shared schemas validate, workspace helpers authorize, the execution engine computes behavior, and Drizzle persists state. This separation makes the engine testable independently of the UI and prevents the client from owning security decisions.

The database uses normalized ownership/team tables plus JSONB for flexible simulation configuration, headers, conditions, workflows, and timelines. JSONB is convenient for evolving failure rules, but it sacrifices some relational constraints and makes deep querying less straightforward.

Counters are updated after execution using the simulation value loaded before the update. Under high concurrency, this can create lost-update risk because two requests may calculate from the same old counter. A production hardening step would use an atomic SQL increment or a transaction. This is an engineering limitation identified from the code, not evidence that the current app has encountered it.

## 6. Failure handling and limitations

Verified behavior includes API validation errors, inaccessible simulations returning not-found behavior, upstream aborts becoming timeouts, connection errors becoming failures, condition mismatches disabling injection, and persisted execution records for simulated paths. Authenticated access and owner/team filters are applied in server queries.

Important limitations to discuss honestly: the Inspector cannot explain a persisted random draw that is not stored; path matching is substring-based; header matching is not fully canonicalized; counter updates are not visibly atomic; and the repository’s API route file uses `@ts-nocheck` because of workspace Drizzle type-copy resolution. These are opportunities for future hardening, not claims that the system is unusable.

## 7. Testing and quality engineering

The most valuable tests are focused on the execution engine and API boundary:

- Unit-test condition matching for empty conditions, case differences, missing headers, query mismatches, and body boundaries.
- Parameterize every failure type and assert status/body/timeout classification.
- Test seeds that produce reproducible probability decisions.
- Integration-test create → run → inspect, including owner isolation and team access.
- Test upstream success, non-2xx response, abort timeout, and network failure.
- Test regression templates for escaping quotes, JSON bodies, and masked secrets.
- Test duplicate does not modify the source and resets counters.

These map to QA automation concepts: unit tests isolate logic; integration tests validate API/database collaboration; API tests verify status and payload contracts; regression tests preserve previously fixed failure behavior; fixtures create repeatable setup; assertions define observable guarantees; and parameterization covers a matrix without duplicated test code.

## 8. Interview preparation

### Fundamentals

Be able to explain HTTP status versus transport failure, REST request/response flow, middleware, authentication versus authorization, relational ownership, JSONB, React state, query caching, and why an API needs server-side validation even when a form validates in the browser.

### Implementation understanding

Expect questions such as:

1. How does one simulation run become an execution row?
2. How are conditions and probability combined?
3. Why does timeout have no HTTP status?
4. How does forwarding avoid hanging forever?
5. How are users prevented from reading another user’s simulation?
6. Why is duplicate implemented through the existing create flow?
7. How does the Inspector turn a failure into a regression test?

### Deeper discussion

Be ready to discuss LCG limitations, atomic counter updates, transaction boundaries, retries and idempotency, upstream backpressure, secret masking, RLS versus application-level authorization, structured event logs, and how to persist a seed/random draw for forensic reproducibility.

## 9. Practical exercises

1. Add a pure `matchesConditions` test matrix with boundary cases.
2. Implement an atomic counter update and explain its concurrency behavior.
3. Add a persisted `seed` and `conditionsMatch` field to executions.
4. Build an API integration test for a user attempting to access another user’s simulation.
5. Add a retry policy that respects `Retry-After` for 429 responses.
6. Write a small battery-monitoring analogue: simulate a sensor API timeout and verify fallback to the last known safe reading.

## 10. Fluence internship relevance

FaultLine demonstrates transferable engineering and QA skills: designing reproducible failure scenarios, validating API contracts, automating regression coverage, diagnosing distributed request failures, protecting tenant data, and reasoning about reliability under partial failure. These skills apply to energy-storage software even though FaultLine does not implement battery-management or BESS functionality.

For example, a battery telemetry service could be tested with the same techniques: inject a delayed inverter response, a stale sensor payload, a 503 from an asset gateway, or malformed state-of-charge JSON; observe whether the service retries, falls back safely, records the incident, and avoids unsafe decisions. The transferable lesson is failure analysis and validation, not domain experience that the project does not demonstrate.

## 11. Unresolved details

The inspected implementation does not fully verify production deployment topology, CI test execution, exact Supabase Auth configuration, or whether every generated test template is executed automatically. Those should be described as future investigation topics rather than asserted as current capabilities.
