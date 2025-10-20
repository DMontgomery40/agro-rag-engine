# Tooltip & Error Message Quick Reference

> **For Developers:** Quick copy-paste reference for adding helpful documentation links to the GUI

---

## RAG Core Concepts

### Retrieval Augmented Generation
```
Learn more about RAG: https://python.langchain.com/docs/concepts/rag/
```

### Hybrid Search
```
Combining dense and sparse retrieval: https://python.langchain.com/docs/how_to/hybrid/
```

### Vector Search
```
Understanding vector similarity search: https://qdrant.tech/documentation/overview/vector-search/
```

---

## Embedding Models

### BGE Embeddings (BAAI)
```
BGE embedding models documentation: https://github.com/FlagOpen/FlagEmbedding
Supports dense, sparse, and multi-vector retrieval in 100+ languages.
```

### Cohere Embeddings
```
Cohere Embed API: https://docs.cohere.com/docs/embeddings
Use input_type="search_query" for queries, "search_document" for documents.
```

---

## Reranking

### Cohere Rerank
```
Cohere Rerank models: https://docs.cohere.com/docs/rerank-overview
Reorder results by semantic relevance (rerank-v3.5, rerank-multilingual-v3.0).
```

### Cross-Encoder Reranking
```
FastEmbed rerankers: https://qdrant.tech/documentation/fastembed/fastembed-rerankers/
Token-level analysis for precise relevance scoring.
```

### Maximal Marginal Relevance (MMR)
```
MMR for diverse results: https://python.langchain.com/docs/how_to/example_selectors_mmr/
Balances relevance and diversity using λ parameter.
```

---

## Indexing & Search

### HNSW Indexing
```
HNSW parameters: https://qdrant.tech/documentation/concepts/indexing/
- m: edges per node (accuracy vs space)
- ef_construct: neighbors during build (accuracy vs time)
- ef: search range (accuracy vs speed)
```

### BM25 Sparse Search
```
BM25 algorithm: https://docs.llamaindex.ai/en/stable/examples/retrievers/bm25_retriever/
Sparse retrieval using term frequency and document length normalization.
```

### Reciprocal Rank Fusion (RRF)
```
RRF for hybrid search: https://www.elastic.co/docs/reference/elasticsearch/rest-apis/reciprocal-rank-fusion
Combines multiple rankings: score = 1/(rank + k), typically k=60.
```

### ColBERT Late Interaction
```
ColBERT documentation: https://github.com/stanford-futuredata/ColBERT
Late interaction model using token-level embeddings and MaxSim operators.
```

---

## Monitoring & Metrics

### Prometheus Metrics
```
Metric types: https://prometheus.io/docs/concepts/metric_types/
Counter, Gauge, Histogram, Summary metrics.

Naming conventions: https://prometheus.io/docs/practices/naming/
```

### Prometheus Alerts
```
Alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
Define alert conditions with 'for' and 'keep_firing_for' clauses.

Best practices: https://prometheus.io/docs/practices/alerting/
```

### Grafana Dashboards
```
Visualizations: https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/
Time series, bar charts, heatmaps, pie charts, and more.
```

---

## Evaluation

### OpenAI Evaluation
```
Evaluation guide: https://platform.openai.com/docs/guides/evals
Best practices: https://platform.openai.com/docs/guides/evaluation-best-practices
```

### Hugging Face Metrics
```
Evaluation metrics: https://huggingface.co/docs/evaluate/en/index
Choosing metrics: https://huggingface.co/docs/evaluate/choosing_a_metric
```

---

## LLM APIs

### Anthropic Claude
```
Claude API docs: https://docs.anthropic.com/en/docs/intro-to-claude
Getting started: https://docs.anthropic.com/claude/reference/getting-started-with-the-api
```

### LangChain LCEL
```
Chain composition: https://python.langchain.com/docs/concepts/lcel/
LCEL cheatsheet: https://python.langchain.com/docs/how_to/lcel_cheatsheet/
Use the | pipe operator to compose chains declaratively.
```

---

## Common Error Message Templates

### Invalid HNSW Parameter
```python
f"Invalid HNSW parameter '{param_name}'. Expected {expected}, got {actual}. "
f"See https://qdrant.tech/documentation/concepts/indexing/ for valid parameters."
```

### Reranking Configuration Error
```python
f"Reranking model '{model}' not found. "
f"Supported models: https://docs.cohere.com/reference/rerank"
```

### Embedding Dimension Mismatch
```python
f"Embedding dimension mismatch. Expected {expected_dim}, got {actual_dim}. "
f"Verify your embedding model: https://github.com/FlagOpen/FlagEmbedding"
```

### Hybrid Search Configuration
```python
f"Invalid hybrid search configuration. Dense weight: {dense_weight}, Sparse weight: {sparse_weight}. "
f"Learn more: https://python.langchain.com/docs/how_to/hybrid/"
```

### Metric Collection Error
```python
f"Failed to collect Prometheus metrics. Check metric naming: "
f"https://prometheus.io/docs/practices/naming/"
```

### Alert Rule Syntax Error
```python
f"Invalid alert rule syntax in '{rule_name}'. "
f"See https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/"
```

---

## Tooltip HTML Examples

### React/MUI Tooltip
```jsx
import { Tooltip, IconButton } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

<Tooltip
  title="HNSW indexing parameters control search accuracy and speed"
  arrow
>
  <IconButton
    size="small"
    onClick={() => window.open('https://qdrant.tech/documentation/concepts/indexing/', '_blank')}
  >
    <HelpOutlineIcon fontSize="small" />
  </IconButton>
</Tooltip>
```

### Inline Help Link
```jsx
<Typography variant="body2" color="text.secondary">
  Reranking refines search results by semantic relevance.{' '}
  <Link
    href="https://docs.cohere.com/docs/rerank-overview"
    target="_blank"
    rel="noopener"
  >
    Learn more
  </Link>
</Typography>
```

### Info Icon with Popover
```jsx
import { Popover, IconButton, Typography } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';

const [anchorEl, setAnchorEl] = useState(null);

<IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
  <InfoIcon />
</IconButton>
<Popover
  open={Boolean(anchorEl)}
  anchorEl={anchorEl}
  onClose={() => setAnchorEl(null)}
>
  <Box p={2} maxWidth={300}>
    <Typography variant="body2">
      Hybrid search combines dense vector search with sparse keyword search (BM25).
    </Typography>
    <Link
      href="https://python.langchain.com/docs/how_to/hybrid/"
      target="_blank"
    >
      View documentation
    </Link>
  </Box>
</Popover>
```

---

## Python Backend Error Examples

### With Documentation Link
```python
class InvalidHNSWParameterError(ValueError):
    """Raised when HNSW parameter is invalid."""

    def __init__(self, param_name, value, expected_range):
        self.docs_url = "https://qdrant.tech/documentation/concepts/indexing/"
        message = (
            f"Invalid HNSW parameter '{param_name}' = {value}. "
            f"Expected {expected_range}. "
            f"Documentation: {self.docs_url}"
        )
        super().__init__(message)
```

### Logging with Context
```python
import logging

logger = logging.getLogger(__name__)

def validate_rerank_model(model_name):
    valid_models = ["rerank-v3.5", "rerank-multilingual-v3.0"]
    if model_name not in valid_models:
        logger.error(
            f"Invalid rerank model '{model_name}'. "
            f"Valid models: {valid_models}. "
            f"See https://docs.cohere.com/reference/rerank for details."
        )
        raise ValueError(f"Unsupported rerank model: {model_name}")
```

---

## Best Practices

1. **Always provide context:** Don't just link to docs, explain what the user should look for
2. **Use official sources:** Prefer official documentation over blog posts or tutorials
3. **Version awareness:** Most links point to /latest/ or stable versions
4. **Deep linking:** Use section anchors when referencing specific topics
5. **Accessibility:** Ensure links open in new tabs with `target="_blank" rel="noopener"`
6. **Mobile friendly:** Keep tooltip text concise on small screens
7. **Fallback text:** Always show text even if link fails to load

---

## Quick Copy-Paste Links by Category

**RAG & Retrieval:**
- https://python.langchain.com/docs/concepts/rag/
- https://python.langchain.com/docs/how_to/hybrid/
- https://qdrant.tech/documentation/overview/vector-search/

**Embeddings:**
- https://github.com/FlagOpen/FlagEmbedding
- https://docs.cohere.com/docs/embeddings

**Reranking:**
- https://docs.cohere.com/docs/rerank-overview
- https://qdrant.tech/documentation/fastembed/fastembed-rerankers/

**Indexing:**
- https://qdrant.tech/documentation/concepts/indexing/
- https://docs.llamaindex.ai/en/stable/examples/retrievers/bm25_retriever/

**Monitoring:**
- https://prometheus.io/docs/concepts/metric_types/
- https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/

**Evaluation:**
- https://platform.openai.com/docs/guides/evals
- https://huggingface.co/docs/evaluate/en/index

---

**Last Updated:** 2025-10-20
**Full Reference:** See `/agent_docs/EXTERNAL_DOCS_REFERENCE.md` for complete documentation
**JSON Data:** See `/agent_docs/external_documentation_links.json` for programmatic access
