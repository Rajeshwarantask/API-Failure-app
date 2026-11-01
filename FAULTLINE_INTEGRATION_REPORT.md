# FaultLine — Live Application Integration Investigation Report

## 1. What FaultLine is building

FaultLine is an API failure simulation and resilience-testing platform. It should sit between a real frontend application and its backend API:

```text
Frontend application → FaultLine generated endpoint → upstream API
                           ├─ inject configured failure
                           └─ forward request normally
```

The Task Manager React + Express application is the integration subject. The desired outcome is genuine request interception: the browser sends its real request to FaultLine, FaultLine evaluates the simulation, the frontend receives the actual injected or forwarded HTTP response, and FaultLine records the execution.

## 2. What is already verified

- Simulations can be created and configured.
- Target URLs, methods, matching conditions, failure type, probability, forwarding, timing, and enabled state are supported.
- Standalone execution injects configured HTTP failures such as 500, 404, 401, and 429.
- Execution history records request data, decision information, response data, timeline, and latency.
- Upstream forwarding through the VS Code Dev Tunnel reaches the Express backend.
- Successful pass-through responses return real upstream data.
- When a valid authentication cookie is manually included in simulation headers, FaultLine forwards it and the Express backend authenticates successfully.
- Authenticated task creation was demonstrated with HTTP 201.
- Authenticated failure injection was demonstrated with HTTP 404; the upstream backend was not reached for the injected request.

These results show that the simulation engine and standalone forwarding path are functioning.

## 3. What is not working

The actual React application currently calls Express directly:

```text
React → localhost:3000 → Express
```

FaultLine's dashboard execution follows a separate path:

```text
FaultLine Run now → FaultLine API → Dev Tunnel → Express
```

Therefore, a successful or failed dashboard execution does not reach the React browser. The browser Network tab still shows direct Express requests, and the React application's error handling is not exercising FaultLine responses.

The required live path is:

```text
React → FaultLine proxy → Dev Tunnel → Express
                         ├─ injected response → React
                         └─ forwarded response → React
```

## 4. Main blocker: external proxy authentication

A generated proxy request such as:

```text
POST https://faultline-api-app.vercel.app/api/proxy/simulations/9/signup
```

currently returns:

```text
HTTP 401
{"message":"Authentication required."}
```

The proxy is protected by the same dashboard authentication flow used by FaultLine's private API. An external application does not have a FaultLine dashboard session, and the current simulation model does not expose a simulation-scoped execution credential or public execution setting.

This mixes two different trust relationships:

- Dashboard authentication controls who can view or modify FaultLine resources.
- Proxy execution authorization controls which external caller may invoke one simulation.

The first should remain private. The second needs a separate, narrowly scoped mechanism.

## 5. Authentication and cookie evidence

The Task Manager uses HTTP-only `accessToken` and `refreshToken` cookies. Express reads `req.cookies.accessToken`, and the React client uses credentialed requests.

Standalone FaultLine execution has no browser cookie context. When no cookie is supplied, protected upstream routes return:

```text
401 {"message":"Please Login"}
```

Manually including the access cookie in simulation headers makes forwarding work, which proves that the upstream path can authenticate. It is only a diagnostic workaround: the token expires, manually copying it is unsafe, and sensitive values may be persisted in execution data.

For real browser integration, the full lifecycle must work:

```text
Browser cookies → FaultLine proxy → upstream Cookie header
upstream Set-Cookie → FaultLine proxy → browser response
```

Authorization headers should similarly be preserved where appropriate. Sensitive request and response headers need masking or controlled redaction in stored execution history and generated developer output.

## 6. CORS and browser compatibility gap

A browser application on another origin needs FaultLine to handle preflight and actual requests correctly. Credentialed requests cannot use wildcard `Access-Control-Allow-Origin`.

The proxy needs simulation-aware behavior that can:

- validate the incoming `Origin` against configured allowed origins;
- return the exact approved origin;
- set `Access-Control-Allow-Credentials: true` when credentials are supported;
- handle `OPTIONS` preflight requests;
- advertise only appropriate methods and request headers;
- expose required response headers;
- apply equivalent CORS headers to injected failures and normal forwarded responses;
- avoid treating CORS as authentication.

A per-simulation allowlist should be preferable to unrestricted origin reflection.

## 7. Routing gap

The generated endpoint may be used as an API base URL, including suffixed calls such as:

```text
/api/proxy/simulations/9/send/alltask
```

The route needs an explicit, safe rule for mapping the suffix after the simulation ID to the configured upstream target URL. The behavior must avoid accidental path replacement, preserve query parameters, and work with target URLs that already contain a path. This should be verified before relying on the endpoint as a drop-in base URL.

## 8. Evidence timeline

| Execution | Result | Evidence |
|---|---:|---|
| #115 | 201 pass-through | Forwarding through the Dev Tunnel works. |
| #132 | 500 injected | Failure injection and timeline recording work. |
| #138 | 401 | Protected upstream route received no cookie. |
| #141 | 201 pass-through | Signup pass-through works. |
| #142 | 401 | Authenticated route fails without a cookie. |
| #143 | 201 pass-through | Manual cookie forwarding authenticates upstream. |
| #144 | 404 injected | Injection works on an authenticated route. |

## 9. Current status

| Capability | Status |
|---|---|
| Simulation creation/configuration | Working |
| Standalone failure injection | Verified |
| Execution history | Working |
| Upstream pass-through | Verified |
| Manual cookie forwarding | Verified for testing |
| External application proxy execution | Blocked by dashboard auth |
| Automatic browser cookie forwarding | Not demonstrated/needs implementation review |
| Credentialed cross-origin proxy requests | Not fully verified |
| React application receiving injected failures | Not demonstrated |
| Complete frontend-to-upstream integration | Incomplete |

## 10. Product conclusion

FaultLine is not blocked by the core failure engine. The unresolved product boundary is live external application access: simulation-scoped authorization, browser-compatible CORS, request/response credential forwarding, suffix routing, and observability of real browser traffic.

The simplest compatible direction is to preserve dashboard authentication for all management operations while adding a separate, revocable simulation execution credential and simulation-level origin policy for the proxy. The proxy should then evaluate the same existing engine, forward request semantics and approved credentials, preserve upstream response behavior, and record the browser-originated execution without exposing dashboard capabilities.

Any implementation should be validated with actual Task Manager browser requests, not only dashboard “Run now” executions.
