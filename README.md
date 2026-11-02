# FaultLine

FaultLine is a developer-focused API failure simulation and debugging workspace. It lets teams model realistic failure conditions, run controlled simulations against HTTP endpoints, inspect exactly what happened, and turn failed executions into actionable recovery code and regression tests.

> Built for engineers who want to test failure behavior before production finds it.

## Demo

<!-- Paste the working product video GIF below this comment. Recommended: keep the GIF under 10 MB and use a relative path such as `docs/demo.gif`. -->

<!--
![FaultLine demo](docs/demo.gif)
-->

_Add the working product video GIF here._

## Why FaultLine

Happy-path testing is not enough for production systems. APIs fail because of expired credentials, rate limits, upstream outages, timeouts, malformed responses, intermittent errors, and network problems. FaultLine makes those cases explicit and repeatable instead of leaving them to manual mocks or one-off test scripts.

FaultLine gives developers one place to:

- Define a failure simulation with deterministic request conditions.
- Inject HTTP, latency, timeout, connection, and response-shape failures.
- Execute a simulation and inspect the complete request and response lifecycle.
- Understand why a failure was selected and whether each condition matched.
- Generate request snippets and client-side error-handling templates.
- Create regression tests from real failed executions.
- Duplicate existing simulations and start from reusable failure recipes.
- Keep simulations, executions, profiles, and workspace data isolated by account and team membership.

## Core Features

### Simulation Builder

Create a simulation by defining:

- Target URL and HTTP method.
- Request headers, query parameters, and request body.
- Failure type and final status code.
- Response body and controlled latency.
- Probability of failure.
- Optional method, path, header, query, and body-match conditions.
- Optional request forwarding with timeout and header-preservation controls.
- Enabled/disabled state.

The existing form is the source of truth for simulation configuration. Failure Recipes prefill that same form; nothing is locked behind a separate workflow.

### Failure Recipes

The Create Simulation flow includes ready-to-use presets for common incidents, including:

- Payment provider outage / HTTP 503.
- Rate limiting / HTTP 429.
- Expired authentication / HTTP 401.
- Slow upstream responses.
- Random HTTP 500 errors.
- Third-party outages.
- Network connection failures.
- Empty responses.
- Malformed JSON.
- Intermittent HTTP 503 failures.
- Request timeouts.

Choose a recipe, review the populated values, change anything needed, and save it as a normal simulation.

### Deterministic Execution Engine

When a simulation runs, the API evaluates the configured conditions, probability, failure mode, and forwarding settings. It records the execution result rather than returning only a generic error. This makes repeated debugging possible and gives the UI enough information to explain the selected path.

Execution records include the request identity, URL, method, request headers, status, latency, failure type, response body, timestamps, simulation reference, owner, and team context.

### Execution Inspector

The Execution Inspector is the primary debugging surface for a completed run. It shows:

- Success, failure, or timeout status.
- Method, URL, status, and observed latency.
- Request and response details.
- Timeline events for the execution lifecycle.
- Developer Actions for turning the failure into code and tests.

Developer Actions includes:

- **Copy request** — Generate cURL, TypeScript/fetch, Axios, Python requests, or raw HTTP. Sensitive headers such as authorization, cookies, and API keys are masked by default.
- **Handle this error** — Generate deterministic TypeScript and fetch-oriented handling code. Retryable failures and non-retryable failures produce different guidance.
- **Why did this fail?** — Show condition matches, probability, selected failure type, final status, forwarding state, and the recorded timeline.
- **Create test** — Open the regression-test generator directly from the inspector without leaving the execution context.

### Regression Test Generator

A failed execution can be converted into a copy-ready regression test. The generator uses the actual execution method, URL, headers, body, status, and failure type, and supports templates for:

- Vitest.
- Jest.
- Playwright.
- pytest.
- JUnit.

The generated output is deterministic and intentionally leaves the final assertion and test-environment wiring visible to the developer.

### Duplicate Simulation

From Simulation Detail, **Duplicate** opens the normal Create Simulation flow with the source configuration copied into it. The duplicate receives a new name and starts with reset execution counters, so it can be safely edited and saved as a separate simulation.

### Recovery Workflows

Recovery workflows describe ordered fallback behavior for a failure path. An engineer can group attempts, select actions, configure determinism, and run a recovery workflow against the existing simulation model.

### Replay and Comparison

Execution history can be replayed to reproduce a request path and compared with another execution to identify changes in status, latency, response, and failure behavior.

### Profiles and Workspace Context

The application includes profile and workspace context so account identity, team membership, simulations, and executions remain scoped to the correct user and workspace. Authenticated access is backed by Supabase Auth, while server-side queries apply explicit owner and team scoping.

## How It Works

```text
Create simulation
      |
      v
Evaluate request conditions
      |
      +--> Conditions do not match --> Forward or return normal behavior
      |
      +--> Conditions match
              |
              v
        Evaluate probability
              |
              +--> Failure not selected --> Forward or return normal behavior
              |
              +--> Failure selected
                      |
                      v
             Apply failure behavior
                      |
                      v
             Persist execution record
                      |
                      v
             Inspect, replay, compare,
             generate code, or create a test
```

## Architecture

FaultLine is a pnpm monorepo with a React frontend, a server API, shared API contracts, and a Drizzle-backed database package.

```text
apps/frontend              React + Vite user interface
apps/api                   HTTP API and simulation execution routes
packages/api-spec          OpenAPI contract
packages/api-zod           Shared Zod validation and generated schemas
packages/api-client-react  Typed React Query API hooks
packages/db                Drizzle schema, migrations, and database client
api/                       Vercel serverless entrypoint
```

### Frontend

The frontend uses React, Vite, Wouter, TanStack React Query, Tailwind CSS, Radix primitives, and Lucide icons. Pages and feature components are composed around the existing design system rather than duplicating UI patterns in each workflow.

### API

The API owns authentication-aware request handling, simulation CRUD, execution, replay, comparison, recovery workflows, and workspace/profile operations. Validation is shared through the API schema packages so the frontend and backend use the same request and response shapes.

### Database

The database layer uses Drizzle ORM and SQL migrations. Core tables include:

- `faultline_users`
- `teams`
- `team_members`
- `simulations`
- `executions`

Supabase Row Level Security is enabled for the application tables with owner/team policies, while the server API continues to apply explicit user and workspace scoping to queries.

### Authentication

Supabase Auth supplies the user session. API requests send a Bearer token, and the API verifies both legacy HS256 Supabase tokens and newer asymmetric Supabase JWTs through the project JWKS endpoint. This supports existing projects as well as newly connected Supabase projects.

## Data and Security Model

FaultLine is designed for multi-user workspaces:

- Every user-owned record is scoped by owner identity.
- Team-visible records are scoped through team membership.
- Anonymous access to application tables is revoked.
- Authenticated table access is limited by RLS policies.
- Sensitive request headers are masked by default in generated developer output.
- Server-side queries use parameterized database access and explicit ownership filters.
- Service-role credentials are never intended for browser code.

When connecting a new Supabase project, apply the committed database migrations and configure the required environment variables before deploying.

## Getting Started

### Prerequisites

- Node.js 20 or newer.
- pnpm 10 or newer.
- A Supabase project with Auth enabled.
- A Postgres connection string for the application database.

### Install

```bash
git clone <your-repository-url>
cd API-Failure-app
pnpm install
```

### Environment Variables

Create a local environment file for the API and frontend deployment. The exact file names may vary by deployment target, but the application expects the following values:

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<supabase-publishable-key>
SUPABASE_ANON_KEY=<supabase-anon-key>
SUPABASE_JWT_SECRET=<legacy-jwt-secret-when-used>
POSTGRES_URL=<pooled-postgres-connection-string>
POSTGRES_URL_NON_POOLING=<direct-postgres-connection-string>
```

For browser builds, expose only the publishable/anon key and Supabase URL using the frontend environment-variable convention. Never expose `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` to the browser.

### Database Setup

Run the database migrations before starting the API:

```bash
pnpm --filter @workspace/db migrate
pnpm --filter @workspace/db build
```

The Vercel build configuration runs the database migration step automatically before building the application packages.

### Development

Start the frontend and API using the workspace scripts used by your deployment environment. The main package scripts are:

```bash
pnpm --filter @workspace/frontend dev
pnpm --filter @workspace/api dev
```

The frontend proxies API requests according to the local Vite configuration. In a deployed Vercel environment, `vercel.json` routes `/api/*` to the serverless API entrypoint and all other routes to the frontend application.

## Useful Commands

```bash
# Install dependencies
pnpm install --frozen-lockfile

# Typecheck shared libraries and workspaces
pnpm typecheck

# Typecheck the frontend only
pnpm --filter @workspace/frontend typecheck

# Build the frontend
pnpm --filter @workspace/frontend build

# Build all deployment packages
pnpm build

# Check whitespace and patch formatting
git diff --check
```

## Deployment

FaultLine is configured for Vercel deployment:

1. Connect the repository to a Vercel project.
2. Add the Supabase and Postgres environment variables for the deployment environment.
3. Set the build command to the committed `vercel.json` configuration, or use the repository defaults.
4. Deploy.
5. Confirm that database migrations completed successfully.
6. Sign in and create a test simulation.
7. Run it and open the Execution Inspector to verify Developer Actions and test generation.

The application is designed to work with a new Supabase connection as long as the schema migrations and environment variables are applied to that project. Existing projects should retain their data while receiving the latest migrations.

## Project Workflow

A typical engineering workflow looks like this:

1. Start with a Failure Recipe or create a simulation manually.
2. Run the simulation against a safe development or staging endpoint.
3. Open the resulting execution in the Execution Inspector.
4. Use **Why did this fail?** to confirm the selected decision path.
5. Use **Handle this error** to draft recovery behavior.
6. Use **Copy request** to reproduce the request locally.
7. Use **Create test** to preserve the failure as a regression test.
8. Duplicate the simulation when building a related scenario.
9. Replay or compare executions while iterating on the client behavior.

## Contributing

1. Create a feature branch.
2. Keep changes focused on one workflow or package.
3. Reuse existing components and API contracts.
4. Add or update migrations when the data model changes.
5. Run typecheck, build, and `git diff --check` before opening a pull request.
6. Explain any required environment-variable or Supabase migration changes.

## License

This project is licensed under the MIT License.
