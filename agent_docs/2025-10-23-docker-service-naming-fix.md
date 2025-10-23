## 2025-10-23 — Docker service vs. container naming fixes

Context: Compose service is `api` while runtime container is `agro-api`. Several scripts and configs pointed at the wrong compose file (`infra/docker-compose.yml`) which does not define the API service, producing `no such service: agro-api` errors.

Changes:
- Annotated `docker-compose.services.yml` to call out the split naming.
- Corrected `scripts/dev_up.sh` log guidance to reference `docker-compose.services.yml` and mention both log commands.
- Updated `Makefile` `index-docker` target and Playwright `webServer` command to use `docker-compose.services.yml`.
- Clarified GUI autotune error helper to show both compose and docker log commands.
- Added README quick-reference table covering service vs. container commands.

Next steps: consider longer-term standardisation (service/container rename) after validating downstream references such as `RAG_API_URL` and MCP dependencies.
