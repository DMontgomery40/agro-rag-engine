---
paths: tests/**/*
---

# Testing System

Comprehensive testing with pytest (backend) and Playwright (frontend).

## Directory Structure

```
tests/
├── smoke/           # 55+ smoke tests (fast CI health checks)
├── routers/         # 14 API endpoint tests (FastAPI routes)
├── unit/            # Isolated component tests
├── integration/     # Multi-component workflow tests
├── server/          # Server configuration tests
├── web-smoke/       # 35+ React component smoke tests (Playwright)
├── gui-smoke/       # 7 legacy GUI smoke tests (Playwright)
├── playwright/      # Playwright configuration
└── test-results/    # Artifacts and reports
```

## Test Commands

```bash
# Backend (pytest)
pytest tests/                          # All tests
pytest tests/smoke/ -v                 # Smoke tests
pytest tests/routers/ -v               # Router tests
pytest tests/unit/ -v                  # Unit tests

# Config contract (MANDATORY after config changes)
pytest tests/test_agro_config.py::TestConfigContractEnforcement -v

# Frontend (Playwright)
npx playwright test --config=playwright.web.config.ts        # Dev (port 5173)
npx playwright test --config=playwright.web-static.config.ts # Prod (port 8012)
```

## Config Contract Tests (CRITICAL)

**Location**: `tests/test_agro_config.py::TestConfigContractEnforcement`

Validates after ANY config change:
1. `test_no_env_usage_for_agro_config_keys` - No `os.getenv()` for config keys
2. `test_json_pydantic_registry_parity` - JSON/Pydantic/Registry alignment
3. `test_no_hardcoded_fallbacks` - No hardcoded defaults
4. `test_runtime_config_parity_check` - Pydantic flat keys vs AGRO_CONFIG_KEYS

## Pytest Patterns

### Fixtures
```python
# Function-scoped (default)
@pytest.fixture
def client():
    return TestClient(app)

# Autouse for cleanup
@pytest.fixture(autouse=True)
def _reset_env(monkeypatch):
    for key in config_keys:
        monkeypatch.delenv(key, raising=False)
    yield

# Temp directories
@pytest.fixture
def eval_dir(tmp_path):
    path = tmp_path / "data" / "evals"
    path.mkdir(parents=True)
    return path
```

### API Testing (TestClient)
```python
from fastapi.testclient import TestClient
from server.app import app

client = TestClient(app)

def test_config_endpoint():
    r = client.get('/api/config')
    assert r.status_code == 200
    assert isinstance(r.json(), dict)
```

### API Testing (httpx for running server)
```python
import httpx

def test_health():
    r = httpx.get("http://127.0.0.1:8012/health", timeout=30.0)
    assert r.status_code == 200

# Streaming (SSE)
with httpx.stream("POST", url, json=data, timeout=30.0) as response:
    for line in response.iter_lines():
        if line.startswith("data: "):
            chunk = json.loads(line[6:])
```

### Monkeypatch
```python
def test_with_env(monkeypatch):
    monkeypatch.setenv("KEY", "value")
    monkeypatch.delenv("KEY", raising=False)

# Module patching
monkeypatch.setattr(hybrid_search, "expand_query_with_synonyms", lambda q, *a: q)
```

### Pydantic Validation
```python
def test_valid_config():
    config = AgroConfigRoot(retrieval=RetrievalConfig(rrf_k_div=60))
    assert config.retrieval.rrf_k_div == 60

def test_invalid_config():
    with pytest.raises(ValidationError) as exc_info:
        AgroConfigRoot(retrieval=RetrievalConfig(rrf_k_div=0))
    assert "rrf_k_div" in str(exc_info.value)
```

## Playwright Patterns

### Test Structure
```typescript
test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
  });

  test('verifies functionality', async ({ page }) => {
    const element = page.locator('[data-testid="button"]');
    await expect(element).toBeVisible({ timeout: 5000 });
    await element.click();
    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```

### Assertions
```typescript
await expect(element).toBeVisible({ timeout: 5000 });
await expect(element).toHaveValue('expected');
await expect(element).toBeEnabled();
await expect(page.locator('li')).toHaveCount(5);
await expect(page).toHaveURL(/.*dashboard/);
```

### Config Options
```typescript
// playwright.web.config.ts
export default defineConfig({
  testDir: './tests/web-smoke',
  timeout: 30 * 1000,
  fullyParallel: false,  // Sequential for GUI stability
  workers: 1,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
```

## Smoke Test Pattern

Fast validation without heavy mocking:

```python
# tests/smoke/test_docker_api_smoke.py
def test_docker_status():
    response = requests.get("http://127.0.0.1:8012/api/docker/status")
    assert response.status_code == 200
    data = response.json()
    assert "running" in data
    assert isinstance(data["running"], bool)
```

## File Naming

- Backend: `test_*.py`
- Playwright: `*.spec.ts`
- Config: `test_agro_config.py` (centralized)

## Key Files

| File | Purpose |
|------|---------|
| `test_agro_config.py` | Config contract enforcement |
| `test_hybrid_pipeline_modes.py` | Retrieval pipeline modes |
| `test_react_config_migration.py` | React config hook validation |
| `smoke/test_docker_api_smoke.py` | Docker API health |
| `smoke/test_evaluate_backend_wiring.py` | Eval endpoint validation |
| `routers/test_*.py` | Individual router tests |

## Best Practices

1. **Path Management**: Use `Path(__file__).parent.parent` for project root
2. **Imports**: `sys.path.insert(0, str(_project_root))` at file start
3. **Timeouts**: 5000ms for locators, 30s for global
4. **Messages**: Include descriptive assertion messages
5. **Cleanup**: Use autouse fixtures for environment reset
