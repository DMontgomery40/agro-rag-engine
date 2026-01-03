# Testing Requirements

Testing philosophy and requirements for the project.

## Testing Stack

- **Backend**: pytest
- **Frontend E2E**: Playwright
- **Config**: Contract tests

## Running Tests

```bash
# Backend tests
pytest tests/

# Frontend E2E (development - port 5173)
npx playwright test --config=playwright.web.config.ts

# Frontend E2E (production - port 8012)
npx playwright test --config=playwright.web-static.config.ts
```

## Config Contract Tests

**Mandatory after any config-related changes:**

```bash
pytest tests/test_agro_config.py::TestConfigContractEnforcement -v
```

This validates:
- No `os.getenv` for config keys
- JSON/Pydantic/Registry parity
- No hardcoded fallbacks

## GUI Verification Required

**GUI work requires actual functional verification:**

1. **Feature text visible** - Labels, headings, descriptions render correctly
2. **Button clicks work** - Actions execute, responses happen
3. **Micro-interactions work** - Hover states, transitions, feedback
4. **CSS style tokens correct** - Colors, spacing, typography match design system
5. **Data flows end-to-end** - Frontend → API → Backend → Response displayed

A GUI that "renders" but doesn't function is NOT acceptable.

## Backend Verification

- Smoke test exercising actual endpoints
- Verify data transforms correctly
- Config changes persist and reload

## Never Report "Done" Without Proof

- Show actual working functionality
- Demonstrate the feature in action
- Verify the complete data flow

## Test Organization

```
tests/
├── smoke/           # Fast health checks
├── unit/            # Unit tests
├── integration/     # Cross-module tests
├── routers/         # API endpoint tests
└── playwright/      # E2E specs
```

## Testing Patterns

```python
# Backend: Use TestClient
from fastapi.testclient import TestClient
from server.asgi import create_app

client = TestClient(create_app())
response = client.get("/api/health")
assert response.status_code == 200
```

```typescript
// Frontend: Verify actual functionality
test('reranker mode changes work', async ({ page }) => {
  await page.goto('/rag');
  await page.click('[data-testid="mode-cloud"]');
  await expect(page.locator('.provider-select')).toBeVisible();
  await expect(page.locator('.api-key-status')).toContainText('Configured');
});
```
