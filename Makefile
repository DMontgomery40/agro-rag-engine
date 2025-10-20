SHELL := /bin/bash

.PHONY: up down status setup index api dev makedev prom grafana dash

up:
	bash scripts/up.sh

down:
	bash scripts/down.sh

status:
	bash scripts/status.sh

# Usage: make setup repo=/abs/path/to/your/repo name=your-repo
setup:
	bash scripts/setup.sh $(repo) $(name)

# Usage: make index REPO=rag-service
index:
	. .venv/bin/activate && REPO=$(REPO) python index_repo.py

# Start API locally with Gunicorn (production-ready)
api:
	bash scripts/api_up.sh

# Start everything (infra + MCP + API + open browser)
dev:
	bash scripts/dev_up.sh

# Headless dev: reuse infra+server without opening browser (for Playwright)
.PHONY: dev-headless
dev-headless:
	OPEN_BROWSER=0 bash scripts/dev_up.sh

# Docker-first indexing (does not require venv)
.PHONY: index-docker
index-docker:
	docker compose -f infra/docker-compose.yml exec -T api bash -lc "REPO=$${REPO:-agro} OUT_DIR_BASE=/app/out python index_repo.py"

# Alias for dev (convenience)
makedev: dev

# Open Prometheus UI
prom:
	@echo "Opening Prometheus at http://127.0.0.1:9090 ..."
	@command -v open >/dev/null 2>&1 && open http://127.0.0.1:9090 || echo "Navigate to: http://127.0.0.1:9090"

# Open Grafana UI
grafana:
	@echo "Opening Grafana at http://127.0.0.1:3000 ..."
	@echo "Login: admin / Trenton2023"
	@command -v open >/dev/null 2>&1 && open http://127.0.0.1:3000 || echo "Navigate to: http://127.0.0.1:3000"

# Generate and import Grafana dashboard
dash:
	@echo "Generating Grafana dashboard from telemetry/grafana_dash.py ..."
	@. .venv/bin/activate && python telemetry/grafana_dash.py
	@echo "Dashboard JSON saved. Import it via Grafana UI or use the API."
