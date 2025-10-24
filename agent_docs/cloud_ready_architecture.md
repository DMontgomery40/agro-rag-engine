# Cloud-Ready Architecture Blueprint (Forward-Looking)

This blueprint outlines how to evolve AGRO from self-hosted to a cloud-ready, multi-tenant platform without rewrites. It does not implement auth/billing now; it ensures today’s choices won’t block tomorrow.

## Tenancy Model

- Entities: Organization → Project/Repo → Resources (indexes, traces, profiles).
- Data partitioning: `tenant_id` at the boundary. For Qdrant, use per-tenant collections or a `tenant` payload route with filters; for Redis keys prefix by tenant.
- File outputs: `out/<tenant>/<repo>/...` with `OUT_DIR_BASE` root env.

## Identity & Access (Not Implemented Yet)

- Authentication: OIDC/OAuth2 (PKCE), providers: Google/GitHub/Entra ID; SPA uses Auth.js or custom PKCE; API uses `authlib` or `fastapi-users`.
- Authorization: RBAC per Organization (Owner, Admin, Editor, Viewer) + feature flags. Enforce at router layer using dependency injection.
- Session: short-lived JWT + refresh or cookie-based session; CSRF tokens for cookie flows.

## Billing & Metering (Future)

- Usage events: retrievals, generations, indexing jobs, storage; aggregate per tenant.
- Plans & limits: rate limiting (Redis), quota enforcement at route layer.
- Payment provider: Stripe (customers/subscriptions), webhooks → billing worker to adjust flags.

## API Strategy

- Versioned routes (`/v1/...`) when introducing breaking changes; keep current unversioned internal routes for self-host.
- OpenAPI as the contract; generate typed clients for the SPA.
- Idempotent POST for config changes; background jobs via `/start` + `/status` pattern.

## Configuration & Secrets

- Central SettingsRegistry remains the source of truth; surface only allowed fields per tenant/role.
- Secrets stored via vault (cloud) or `.env` (self-host); never return secret values in GETs.

## Observability & SRE

- Metrics: per-tenant labels; error budgets by tier.
- Logs: structured, tenant-aware; ship to Loki or cloud log sinks.
- Traces: LangSmith or OTEL exporters; sample rates per plan.
- Alerts: Prometheus/Alertmanager in self-host; cloud provider alerts in SaaS.

## Security & Compliance

- CSP: strict defaults; explicit frame-src for Editor/Grafana via env-driven allowlist.
- Audit log: auth events, config changes, data export actions.
- Data export/delete endpoints to support data subject rights.

## Deployment Topology

- Monorepo with apps: `api/` (FastAPI), `web/` (Vite SPA), `workers/` (indexers/trainers).
- Images per service; horizontal scale at api/workers; sticky sessions not required (stateless).
- CDN for web assets; signed URLs for large downloads.

## Feature Flags & Licensing

- Server-side flags in a simple store (Redis/postgres feature table); fallback to env for self-host.
- SPA consumes `/api/nav` and `/api/flags` to toggle UI without hard-coded conditionals.

## Migration Guardrails (Now)

- Avoid absolute paths; route all file IO through helpers using `OUT_DIR_BASE` and `repo_root()`.
- Define `tenant_id` plumbing in service functions, even if self-host uses a default tenant.
- Ensure all new endpoints include `tenant_id` parameter hooks for future scoping.

