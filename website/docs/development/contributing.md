---
sidebar_position: 1
---

# Contributing

Contributions to AGRO are welcome! This guide covers the development setup, testing procedures, and contribution workflow.

## Development Setup

### Prerequisites

- **Python 3.11+**
- **Docker Desktop** (for Qdrant, Redis, Grafana, Prometheus)
- **Node.js 18+** (for GUI development)
- **Git** with LFS support

### Quick Start

```bash
# Clone the repository
git clone https://github.com/DMontgomery40/agro-rag-engine.git
cd agro-rag-engine

# Create virtual environment
python3.11 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start infrastructure
docker compose up -d

# Copy environment template
cp .env.example .env

# Edit .env with your settings
# At minimum, set REPO=agro and add API keys if using cloud models

# Run development server
make dev
# Or manually: uvicorn server.app:app --reload --port 8012
```

GUI will be available at http://127.0.0.1:8012/

### Environment Variables

Key variables to configure in `.env`:

```bash
# Repository
REPO=agro
SOURCE_DIR=/absolute/path/to/your/code

# Models
EMBEDDING_TYPE=openai  # openai|voyage|local
GENERATION_MODEL=gpt-4o
RERANK_BACKEND=local  # local|cohere

# API Keys (if using cloud models)
OPENAI_API_KEY=sk-...
VOYAGE_API_KEY=...
COHERE_API_KEY=...

# Infrastructure
QDRANT_URL=http://127.0.0.1:6333
REDIS_URL=redis://127.0.0.1:6379/0

# Performance
TOPK_SPARSE=75
TOPK_DENSE=75
QUERY_EXPANSION_COUNT=4

# Optional: LangSmith tracing
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=...
LANGCHAIN_PROJECT=agro-dev
```

## Testing

AGRO uses **Playwright** for GUI tests and **pytest** for backend tests.

### Running Tests

**All tests:**
```bash
make test
```

**GUI tests only:**
```bash
# Start server first
uvicorn server.app:app --port 8012 &

# Run Playwright tests
npx playwright test --config tests/playwright.gui.config.ts
```

**Backend tests only:**
```bash
pytest tests/ -v --ignore=tests/gui
```

**Smoke tests:**
```bash
# Test retrieval pipeline
python tests/test_retrieval_smoke.py

# Test indexing
python tests/test_index_smoke.py

# Test MCP server
python tests/test_mcp_smoke.py
```

### Writing Tests

**GUI test example (Playwright):**

```typescript
// tests/gui/navigation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should load dashboard', async ({ page }) => {
    await page.goto('http://127.0.0.1:8012/');

    // Wait for GUI to load
    await page.waitForSelector('.dashboard', { timeout: 10000 });

    // Check dashboard elements
    await expect(page.locator('.dashboard')).toBeVisible();
  });
});
```

**Backend test example (pytest):**

```python
# tests/test_retrieval.py
import pytest
from retrieval.hybrid_search import search

def test_hybrid_search():
    """Test hybrid search returns results."""
    results = search("How does indexing work?", repo="agro", final_k=10)

    assert len(results) > 0, "Search should return results"
    assert "file_path" in results[0], "Results should include file_path"
    assert "rerank_score" in results[0], "Results should include rerank_score"
```

### Test Requirements

All PRs must:
1. **Pass all existing tests** (no regressions)
2. **Add tests for new features** (GUI or backend)
3. **Maintain >80% code coverage** for new code
4. **Include smoke tests** if adding new endpoints

## Running Evaluations

AGRO includes a golden test suite for regression tracking.

### Add Golden Questions

Via GUI:
1. Navigate to **Evals** tab
2. Click **Add Golden Question**
3. Enter question and expected file paths
4. Save

Via API:
```bash
curl -X POST http://127.0.0.1:8012/api/golden \
  -H 'Content-Type: application/json' \
  -d '{
    "question": "How does hybrid search work?",
    "expect_paths": ["retrieval/hybrid_search.py"],
    "top_k": 10,
    "repo": "agro"
  }'
```

### Run Evaluations

Via GUI:
1. Navigate to **Evals** tab
2. Click **Run Evaluation**
3. Wait for results
4. Compare to baseline

Via CLI:
```bash
# Run full evaluation suite
python scripts/eval_runner.py --repo agro

# Save as baseline
python scripts/eval_runner.py --repo agro --save-baseline
```

Via API:
```bash
# Start evaluation
curl -X POST http://127.0.0.1:8012/api/eval/run \
  -H 'Content-Type: application/json' \
  -d '{"repo": "agro", "save_baseline": false}'

# Check results
curl http://127.0.0.1:8012/api/eval/results
```

### Eval Metrics

- **Top-1 Accuracy**: Expected file in #1 position
- **Top-5 Accuracy**: Expected file in top 5
- **MRR (Mean Reciprocal Rank)**: Average 1/rank of first hit
- **Hit@K**: Percentage of queries with expected file in top K

**Acceptable thresholds:**
- Top-1: >70%
- Top-5: >90%
- MRR: >0.75

## Branch Workflow

AGRO uses a three-branch model:

- **development**: Active development (default)
- **staging**: Pre-release hardening
- **main**: Production-ready releases

**Workflow:**
```bash
# Create feature branch from development
git checkout development
git pull origin development
git checkout -b feature/your-feature-name

# Make changes, commit
git add .
git commit -m "feat: Add your feature description"

# Push and open PR to development
git push origin feature/your-feature-name
# Open PR: feature/your-feature-name → development
```

**Never push directly to main.** All changes flow through development → staging → main.

## Code Style

### Python

AGRO follows PEP 8 with some exceptions:

```python
# Good: Type hints, docstrings, clear variable names
def search(query: str, repo: str, final_k: int = 10) -> List[Dict[str, Any]]:
    """
    Hybrid search combining BM25 and dense vectors.

    Args:
        query: Search query string
        repo: Repository name
        final_k: Number of results to return

    Returns:
        List of ranked documents with rerank scores
    """
    # Implementation...

# Avoid: Single-letter variables, missing types
def s(q, r, k=10):
    # What does this do?
```

**Formatting:**
```bash
# Format code with black
black server/ retrieval/ indexer/

# Check with flake8
flake8 server/ retrieval/ indexer/ --max-line-length=120
```

### TypeScript/JavaScript (GUI)

```typescript
// Good: TypeScript interfaces, JSDoc comments
interface SearchResult {
  file_path: string;
  start_line: number;
  end_line: number;
  rerank_score: number;
}

async function searchCode(query: string): Promise<SearchResult[]> {
  const response = await fetch(`/search?q=${encodeURIComponent(query)}`);
  return await response.json();
}

// Avoid: Untyped, unclear
async function s(q) {
  return await fetch(`/search?q=${q}`).then(r => r.json());
}
```

## Commit Messages

Use conventional commits:

```
feat: Add semantic card retrieval
fix: Resolve Qdrant connection timeout
docs: Update API endpoint documentation
test: Add Playwright test for reranker UI
refactor: Extract RRF fusion to separate module
perf: Optimize BM25 index loading
```

**Structure:**
```
<type>: <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `test`: Tests
- `refactor`: Code restructure (no behavior change)
- `perf`: Performance improvement
- `chore`: Maintenance (deps, config)

## Pull Request Process

1. **Create PR from feature branch → development**
2. **Fill out PR template:**
   - What changed?
   - Why?
   - How to test?
   - Screenshots (if GUI changes)
3. **Wait for CI checks to pass:**
   - All tests pass
   - No linting errors
   - No type errors (mypy)
4. **Address review feedback**
5. **Squash and merge** when approved

### PR Checklist

- [ ] Tests added/updated
- [ ] All tests pass
- [ ] Documentation updated (if needed)
- [ ] GUI changes verified in browser
- [ ] No console errors or warnings
- [ ] Eval baseline still passes (if changed retrieval)
- [ ] Screenshots included (if visual changes)

## GUI Development

### Architecture

- **Framework**: Vanilla JavaScript (no build step)
- **State Management**: Browser localStorage + API calls
- **Styling**: Tailwind CSS (via CDN)
- **Testing**: Playwright

### Adding a New GUI Feature

1. **Add HTML in gui/index.html:**
```html
<div id="my-feature-section" class="section hidden">
  <h2>My Feature</h2>
  <button id="my-feature-btn" class="btn btn-primary">Click Me</button>
  <div id="my-feature-output"></div>
</div>
```

2. **Add JavaScript in gui/js/my_feature.js:**
```javascript
function initMyFeature() {
  const btn = document.getElementById('my-feature-btn');
  const output = document.getElementById('my-feature-output');

  btn.addEventListener('click', async () => {
    const response = await fetch('/api/my-feature');
    const data = await response.json();
    output.textContent = JSON.stringify(data, null, 2);
  });
}

// Auto-initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMyFeature);
} else {
  initMyFeature();
}
```

3. **Add backend endpoint in server/app.py:**
```python
@app.get("/api/my-feature")
def my_feature() -> Dict[str, Any]:
    """My feature endpoint."""
    return {"status": "success", "data": "Hello World"}
```

4. **Add Playwright test in tests/gui/my_feature.spec.ts:**
```typescript
test('my feature works', async ({ page }) => {
  await page.goto('http://127.0.0.1:8012/');
  await page.click('#my-feature-btn');
  await expect(page.locator('#my-feature-output')).toContainText('Hello World');
});
```

5. **Run test to verify:**
```bash
npx playwright test tests/gui/my_feature.spec.ts
```

## Backend Development

### Adding a New Endpoint

1. **Define Pydantic model (if needed):**
```python
from pydantic import BaseModel

class MyRequest(BaseModel):
    query: str
    limit: int = 10
```

2. **Add endpoint:**
```python
@app.post("/api/my-endpoint")
def my_endpoint(req: MyRequest) -> Dict[str, Any]:
    """
    My endpoint description.

    Args:
        req: Request with query and limit

    Returns:
        Results dictionary
    """
    results = do_something(req.query, req.limit)
    return {"results": results}
```

3. **Add test:**
```python
def test_my_endpoint():
    from fastapi.testclient import TestClient
    from server.app import app

    client = TestClient(app)
    response = client.post("/api/my-endpoint", json={
        "query": "test",
        "limit": 5
    })

    assert response.status_code == 200
    assert "results" in response.json()
```

## Common Development Tasks

### Rebuild Index

```bash
# Via GUI: Settings → Index → Rebuild
# Via API:
curl -X POST http://127.0.0.1:8012/api/index/start \
  -H 'Content-Type: application/json' \
  -d '{"repo": "agro", "force": true}'
```

### Generate Semantic Cards

```bash
# Via GUI: Settings → Cards → Build
# Via API:
curl -X POST http://127.0.0.1:8012/api/cards/build/start \
  -H 'Content-Type: application/json' \
  -d '{"repo": "agro"}'
```

### Train Reranker

```bash
# Via GUI: Settings → Reranker → Train
# Via CLI:
python scripts/train_reranker.py --repo agro --epochs 3

# Via API:
curl -X POST http://127.0.0.1:8012/api/reranker/train \
  -H 'Content-Type: application/json' \
  -d '{"epochs": 3, "batch_size": 16}'
```

### Clear Logs

```bash
# Clear query logs
curl -X POST http://127.0.0.1:8012/api/reranker/logs/clear

# Clear Docker logs
docker logs qdrant --tail 0
docker logs rag-redis --tail 0
```

## Debugging

### Enable Debug Logging

```bash
# In .env
LOG_LEVEL=DEBUG

# Or runtime:
export LOG_LEVEL=DEBUG
uvicorn server.app:app --reload --log-level debug
```

### Inspect Qdrant Collection

```bash
# List collections
curl http://127.0.0.1:6333/collections

# Get collection info
curl http://127.0.0.1:6333/collections/code_chunks_agro

# Search directly
curl -X POST http://127.0.0.1:6333/collections/code_chunks_agro/points/search \
  -H 'Content-Type: application/json' \
  -d '{"vector": [0.1, 0.2, ...], "limit": 10}'
```

### Inspect Redis State

```bash
# Connect to Redis
docker exec -it rag-redis redis-cli

# List keys
KEYS *

# Get value
GET langgraph:checkpoints:dev
```

### View LangSmith Traces

```bash
# Get latest trace URL
curl http://127.0.0.1:8012/api/langsmith/latest
```

## Performance Profiling

### Profile Search Latency

```bash
# Via GUI: Metrics tab → Grafana → Search Latency dashboard
# Via Prometheus:
curl http://127.0.0.1:9090/api/v1/query?query=agro_request_duration_seconds
```

### Profile Memory Usage

```python
# Add to code
import tracemalloc
tracemalloc.start()

# Your code here

current, peak = tracemalloc.get_traced_memory()
print(f"Current: {current / 1024 / 1024:.2f} MB, Peak: {peak / 1024 / 1024:.2f} MB")
```

## Release Process

1. **Feature complete on development**
2. **Open PR: development → staging**
3. **Run full test suite + manual QA on staging**
4. **Tag staging release: v0.X.0-rc1**
5. **After 1 week soak, open PR: staging → main**
6. **Tag production release: v0.X.0**
7. **Update changelog and GitHub release notes**

## Getting Help

- **GitHub Issues**: Bug reports, feature requests
- **GitHub Discussions**: Questions, ideas, benchmarks
- **Tag @DMontgomery40** for urgent issues

## License

AGRO is MIT licensed. By contributing, you agree to license your contributions under MIT.

---

**Thank you for contributing to AGRO!** Every improvement helps developers code without rate limits.
