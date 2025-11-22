# AGRO Architecture: Ports, Servers, and Testing Guide

## 🏗️ Big Picture Architecture

AGRO has **two frontends** and **one backend API**:

```
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND API (Port 8012)                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  FastAPI Server (server/asgi.py)                    │  │
│  │  - Serves: /api/* (REST endpoints)                  │  │
│  │  - Serves: /gui/* (Legacy JS GUI - static files)    │  │
│  │  - Serves: /web/* (React app - built from /web/dist)│  │
│  │  - Serves: / (root - redirects to /gui or /web)     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↕
┌─────────────────────────────────────────────────────────────┐
│              FRONTEND OPTIONS                               │
│                                                             │
│  Option 1: Legacy GUI (Port 8012)                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  /gui/index.html (Static HTML + JS)                  │  │
│  │  - Old JavaScript-based UI                           │  │
│  │  - Served directly by FastAPI                         │  │
│  │  - URL: http://localhost:8012/ or http://localhost:8012/gui │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Option 2: React App                                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Development: Vite Dev Server (Port 5173)            │  │
│  │  - Hot reload, fast refresh                          │  │
│  │  - Proxies /api/* → http://localhost:8012/api       │  │
│  │  - URL: http://localhost:5173                       │  │
│  │                                                       │  │
│  │  Production: Built files served by FastAPI (8012)    │  │
│  │  - npm run build → /web/dist                         │  │
│  │  - FastAPI serves /web/dist at /web/*                │  │
│  │  - URL: http://localhost:8012/web                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 📍 Port Reference

| Port | Service | When Used | URL |
|------|---------|-----------|-----|
| **8012** | FastAPI Backend | Always (Docker or local) | `http://localhost:8012` |
| **8012** | Legacy GUI | When accessing `/gui` | `http://localhost:8012/gui` |
| **8012** | React App (Production) | After `npm run build` | `http://localhost:8012/web` |
| **5173** | Vite Dev Server | During development (`npm run dev`) | `http://localhost:5173` |
| **6333** | Qdrant (Vector DB) | Always | `http://localhost:6333` |
| **6379** | Redis (Cache) | Always | `redis://localhost:6379` |
| **3000** | Grafana | Always | `http://localhost:3000` |

## 🔄 Development vs Production

### Development Mode

**Backend:**
```bash
# Option 1: Docker (recommended)
docker compose -f docker-compose.services.yml up -d api
# API runs at http://localhost:8012

# Option 2: Local Python
uvicorn server.asgi:create_app --factory --host 127.0.0.1 --port 8012 --reload
# API runs at http://localhost:8012
```

**Frontend:**
```bash
cd web
npm run dev
# React app runs at http://localhost:5173
# Vite proxies /api/* → http://localhost:8012/api
```

**Access:**
- React Dev UI: `http://localhost:5173` ✅ (Hot reload)
- Legacy GUI: `http://localhost:8012/gui` ✅
- API Docs: `http://localhost:8012/docs` ✅

### Production Mode

**Build React App:**
```bash
cd web
npm run build
# Creates /web/dist directory
```

**Start Backend:**
```bash
# Docker or local - serves everything
docker compose -f docker-compose.services.yml up -d api
# OR
uvicorn server.asgi:create_app --factory --host 0.0.0.0 --port 8012
```

**Access:**
- React App: `http://localhost:8012/web` ✅ (Built files)
- Legacy GUI: `http://localhost:8012/gui` ✅
- Root: `http://localhost:8012/` → redirects based on `GUI_CUTOVER` env var

## 🧪 Testing Architecture

### Playwright Configurations

| Config File | Tests | Base URL | What It Tests |
|-------------|-------|----------|---------------|
| `playwright.gui.config.ts` | `/tests/gui/*` | `http://localhost:8012` | Legacy GUI (static HTML) |
| `playwright.web.config.ts` | `/tests/web-smoke/*` | `http://127.0.0.1:5175` | React app (spawns dev server) |
| `playwright.web-static.config.ts` | `/tests/web-smoke/*` | `http://localhost:8012/web` | React app (production build) |

### Which Config to Use?

**For Legacy GUI Tests:**
```bash
npx playwright test --config=playwright.gui.config.ts
# Tests: http://localhost:8012/gui
# Requires: API running on 8012 (Docker or local)
```

**For React Dev Tests:**
```bash
npx playwright test --config=playwright.web.config.ts
# Tests: http://127.0.0.1:5175
# Spawns: Vite dev server automatically
# Requires: API running on 8012
```

**For React Production Tests:**
```bash
npm run build  # Build first!
npx playwright test --config=playwright.web-static.config.ts
# Tests: http://localhost:8012/web
# Requires: API running on 8012 with /web/dist built
```

## 🐳 Docker Setup

### Full Stack (Recommended)
```bash
bash scripts/up.sh
# Starts:
# - Qdrant (6333)
# - Redis (6379)
# - Grafana (3000)
# - Prometheus (9090)
# - API (8012) - serves /gui, /web, /api
```

### API Only
```bash
docker compose -f docker-compose.services.yml --profile api up -d
# Starts only API container on 8012
```

### What Docker Serves

The API container (`agro-api`) serves:
- `/api/*` - REST API endpoints
- `/gui/*` - Legacy GUI static files (mounted from `./gui`)
- `/web/*` - React app (mounted from `./web/dist` if built)
- `/` - Root redirects based on `GUI_CUTOVER` env var

## 🔍 Source of Truth

### Backend API
- **Source of Truth**: `server/asgi.py` (FastAPI app factory)
- **Port**: Always 8012
- **Runs**: Docker container OR local uvicorn
- **Serves**: API + both GUIs

### Legacy GUI
- **Source**: `/gui/index.html` + `/gui/js/*`
- **Served by**: FastAPI at `/gui/*`
- **URL**: `http://localhost:8012/gui`
- **Status**: Being migrated to React

### React App
- **Source**: `/web/src/*` (TypeScript/React)
- **Dev Server**: Vite on 5173 (only during `npm run dev`)
- **Production**: Built to `/web/dist`, served by FastAPI at `/web/*`
- **URL Dev**: `http://localhost:5173`
- **URL Prod**: `http://localhost:8012/web`

## 🎯 Testing Best Practices

### For React Components (Current Work)

**Option 1: Dev Server (Recommended for development)**
```bash
# Terminal 1: Start API
docker compose -f docker-compose.services.yml --profile api up -d

# Terminal 2: Run tests (spawns dev server automatically)
npx playwright test --config=playwright.web.config.ts
```

**Option 2: Production Build (Recommended for CI)**
```bash
# Build React app first
cd web && npm run build && cd ..

# Start API
docker compose -f docker-compose.services.yml --profile api up -d

# Run tests
npx playwright test --config=playwright.web-static.config.ts
```

### For Legacy GUI Tests
```bash
# Start API
docker compose -f docker-compose.services.yml --profile api up -d

# Run tests
npx playwright test --config=playwright.gui.config.ts
```

## 🚨 Common Confusion Points

### "Why do I see 127.0.0.1:8012 in tests but localhost:5173 in browser?"

- **Tests pointing to 8012**: Testing production build served by FastAPI
- **Browser on 5173**: You're running `npm run dev` (development mode)
- **Solution**: Use `playwright.web.config.ts` for dev tests, or build and use `playwright.web-static.config.ts`

### "Which one is the source of truth?"

- **Backend**: Always `server/asgi.py` on port 8012
- **Frontend Dev**: `/web/src/*` → Vite dev server (5173)
- **Frontend Prod**: `/web/src/*` → `npm run build` → `/web/dist` → FastAPI serves at `/web/*` (8012)

### "Do I need Docker for testing?"

- **For GUI tests**: Yes, API must be running (Docker or local)
- **For React dev tests**: Yes, API must be running (Vite proxies to it)
- **For React prod tests**: Yes, API must be running (serves built files)

### "What if I'm working on React but tests use 8012?"

- Tests are checking the **production build** served by FastAPI
- Your dev server on 5173 is separate
- **Fix**: Use `playwright.web.config.ts` which spawns dev server, OR build first and use `playwright.web-static.config.ts`

## 📝 Quick Reference

**Start Everything (Development):**
```bash
# Terminal 1: Backend
bash scripts/up.sh

# Terminal 2: Frontend Dev
cd web && npm run dev
# Access: http://localhost:5173
```

**Start Everything (Production):**
```bash
# Build React app
cd web && npm run build && cd ..

# Start backend (serves everything)
bash scripts/up.sh
# Access: http://localhost:8012/web
```

**Run Tests:**
```bash
# React Dev Tests
npx playwright test --config=playwright.web.config.ts

# React Prod Tests (build first!)
npx playwright test --config=playwright.web-static.config.ts

# Legacy GUI Tests
npx playwright test --config=playwright.gui.config.ts
```

## 🔧 Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `GUI_CUTOVER` | Redirect `/` to `/web` instead of `/gui` | `0` (off) |
| `PORT` | Uvicorn port (local only) | `8012` |
| `QDRANT_URL` | Vector DB URL | `http://127.0.0.1:6333` |
| `REDIS_URL` | Cache URL | `redis://127.0.0.1:6379/0` |

---

**Last Updated**: 2025-01-XX
**Maintained By**: AGRO Development Team

