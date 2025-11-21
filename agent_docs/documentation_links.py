"""
External Documentation Links Library

Programmatic access to verified external documentation URLs for use in:
- Error messages with helpful links
- Tooltip generation
- Help text in GUI components
- Logging with context

Usage:
    from agent_docs.documentation_links import DOCS, get_doc_link, format_error_with_link

Example:
    # Get a link
    qdrant_url = DOCS.qdrant.indexing

    # Format an error
    raise ValueError(format_error_with_link(
        "Invalid HNSW parameter",
        "qdrant.indexing",
        details="m must be >= 0"
    ))
"""

from typing import Dict, Optional
import json
from pathlib import Path


class DocLinks:
    """Type-safe access to documentation links."""

    class LangChain:
        rag = "https://python.langchain.com/docs/concepts/rag/"
        rag_tutorial = "https://python.langchain.com/docs/tutorials/rag/"
        hybrid_search = "https://python.langchain.com/docs/how_to/hybrid/"
        react_agent = "https://python.langchain.com/api_reference/langchain/agents/langchain.agents.react.agent.create_react_agent.html"
        lcel = "https://python.langchain.com/docs/concepts/lcel/"
        lcel_cheatsheet = "https://python.langchain.com/docs/how_to/lcel_cheatsheet/"
        bm25 = "https://python.langchain.com/v0.2/docs/integrations/retrievers/bm25/"
        mmr = "https://python.langchain.com/docs/how_to/example_selectors_mmr/"

    class BAAI:
        flagembedding = "https://github.com/FlagOpen/FlagEmbedding"
        bge_models = "https://github.com/FlagOpen/FlagEmbedding"

    class Cohere:
        rerank_overview = "https://docs.cohere.com/docs/rerank-overview"
        rerank_api = "https://docs.cohere.com/reference/rerank"
        rerank_best_practices = "https://docs.cohere.com/v2/docs/reranking-best-practices"
        embeddings = "https://docs.cohere.com/docs/embeddings"
        embed_api = "https://docs.cohere.com/reference/embed"

    class Qdrant:
        vector_search = "https://qdrant.tech/documentation/overview/vector-search/"
        search = "https://qdrant.tech/documentation/concepts/search/"
        indexing = "https://qdrant.tech/documentation/concepts/indexing/"
        collections = "https://qdrant.tech/documentation/concepts/collections/"
        optimize = "https://qdrant.tech/documentation/guides/optimize/"
        rerank_semantic = "https://qdrant.tech/documentation/search-precision/reranking-semantic-search/"
        rerank_hybrid = "https://qdrant.tech/documentation/advanced-tutorials/reranking-hybrid-search/"
        fastembed_rerankers = "https://qdrant.tech/documentation/fastembed/fastembed-rerankers/"
        fastembed_colbert = "https://qdrant.tech/documentation/fastembed/fastembed-colbert/"
        filtrable_hnsw = "https://qdrant.tech/articles/filtrable-hnsw/"
        hybrid_search = "https://qdrant.tech/articles/hybrid-search/"

    class Prometheus:
        metric_types = "https://prometheus.io/docs/concepts/metric_types/"
        data_model = "https://prometheus.io/docs/concepts/data_model/"
        naming = "https://prometheus.io/docs/practices/naming/"
        alerting_rules = "https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/"
        alerting_overview = "https://prometheus.io/docs/alerting/latest/overview/"
        alerting_best_practices = "https://prometheus.io/docs/practices/alerting/"

    class Grafana:
        visualizations = "https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/"
        panels = "https://grafana.com/docs/grafana/latest/panels-visualizations/"

    class OpenAI:
        evals = "https://platform.openai.com/docs/guides/evals"
        evaluation_best_practices = "https://platform.openai.com/docs/guides/evaluation-best-practices"

    class Anthropic:
        intro = "https://docs.anthropic.com/en/docs/intro-to-claude"
        api_start = "https://docs.anthropic.com/claude/reference/getting-started-with-the-api"
        quickstart = "https://docs.anthropic.com/en/docs/quickstart"

    class HuggingFace:
        evaluate = "https://huggingface.co/docs/evaluate/en/index"
        choosing_metrics = "https://huggingface.co/docs/evaluate/choosing_a_metric"
        evaluation_types = "https://huggingface.co/docs/evaluate/types_of_evaluations"

    class Algorithms:
        bm25 = "https://docs.llamaindex.ai/en/stable/examples/retrievers/bm25_retriever/"
        rrf = "https://www.elastic.co/docs/reference/elasticsearch/rest-apis/reciprocal-rank-fusion"
        colbert_repo = "https://github.com/stanford-futuredata/ColBERT"
        colbert_paper = "https://arxiv.org/abs/2004.12832"
        mmr_vectara = "https://docs.vectara.com/docs/learn/mmr-reranker"


# Create singleton instance
DOCS = DocLinks()


# Description mappings for error messages and tooltips
DESCRIPTIONS: Dict[str, str] = {
    # LangChain
    "langchain.rag": "RAG architecture including indexing, retrieval, and generation stages",
    "langchain.hybrid_search": "Combining dense vector search with sparse keyword search (BM25)",
    "langchain.lcel": "LangChain Expression Language for declarative chain composition",
    "langchain.mmr": "Maximal Marginal Relevance for balancing relevance and diversity",

    # Embeddings
    "baai.bge_models": "BGE embedding models supporting dense, sparse, and multi-vector retrieval",
    "cohere.embeddings": "Cohere embeddings optimized for search_query and search_document",

    # Reranking
    "cohere.rerank": "Semantic reranking models (rerank-v3.5, rerank-multilingual-v3.0)",
    "qdrant.rerank_semantic": "Using cross-encoder rerankers to refine search results",
    "qdrant.fastembed_rerankers": "FastEmbed cross-encoders for token-level relevance analysis",

    # Vector Search
    "qdrant.vector_search": "Vector similarity search fundamentals using HNSW",
    "qdrant.indexing": "HNSW parameters: m (edges), ef_construct (build), ef (search)",
    "qdrant.collections": "Creating and managing vector collections",
    "qdrant.optimize": "Performance optimization including HNSW tuning",

    # Algorithms
    "algorithms.bm25": "BM25 sparse retrieval with term frequency saturation and length normalization",
    "algorithms.rrf": "Reciprocal Rank Fusion: score = 1/(rank + k), typically k=60",
    "algorithms.colbert": "ColBERT late interaction with token-level embeddings and MaxSim",
    "algorithms.mmr": "MMR algorithm balancing relevance (λ) vs diversity (1-λ)",

    # Monitoring
    "prometheus.metric_types": "Counter, Gauge, Histogram, and Summary metric types",
    "prometheus.alerting_rules": "Alert conditions with 'for' and 'keep_firing_for' clauses",
    "prometheus.naming": "Metric and label naming best practices",
    "grafana.visualizations": "Time series, bar charts, heatmaps, and other visualization types",

    # Evaluation
    "openai.evals": "Evaluation patterns and quality metrics for LLM applications",
    "huggingface.evaluate": "Evaluation metrics including referenced and referenceless types",
}


def get_doc_link(path: str) -> Optional[str]:
    """
    Get documentation link by dot-notation path.

    Args:
        path: Dot notation path like 'qdrant.indexing' or 'cohere.rerank'

    Returns:
        URL string or None if not found

    Example:
        >>> get_doc_link('qdrant.indexing')
        'https://qdrant.tech/documentation/concepts/indexing/'
    """
    parts = path.split('.')
    if len(parts) != 2:
        return None

    category, topic = parts
    category = category.replace('_', '').lower()

    # Map common aliases
    category_map = {
        'langchain': 'LangChain',
        'baai': 'BAAI',
        'cohere': 'Cohere',
        'qdrant': 'Qdrant',
        'prometheus': 'Prometheus',
        'grafana': 'Grafana',
        'openai': 'OpenAI',
        'anthropic': 'Anthropic',
        'huggingface': 'HuggingFace',
        'hf': 'HuggingFace',
        'algorithms': 'Algorithms',
        'algo': 'Algorithms',
    }

    category_class_name = category_map.get(category)
    if not category_class_name:
        return None

    category_class = getattr(DOCS, category_class_name, None)
    if not category_class:
        return None

    return getattr(category_class, topic, None)


def get_description(path: str) -> Optional[str]:
    """
    Get description for a documentation link.

    Args:
        path: Dot notation path like 'qdrant.indexing'

    Returns:
        Description string or None if not found
    """
    return DESCRIPTIONS.get(path)


def format_error_with_link(
    error_message: str,
    doc_path: str,
    details: Optional[str] = None
) -> str:
    """
    Format an error message with a helpful documentation link.

    Args:
        error_message: The main error message
        doc_path: Dot notation path to documentation
        details: Optional additional details

    Returns:
        Formatted error string with link

    Example:
        >>> format_error_with_link(
        ...     "Invalid HNSW parameter 'm'",
        ...     "qdrant.indexing",
        ...     details="m must be >= 0"
        ... )
        "Invalid HNSW parameter 'm'. m must be >= 0. Documentation: https://..."
    """
    parts = [error_message]

    if details:
        parts.append(details)

    url = get_doc_link(doc_path)
    if url:
        parts.append(f"Documentation: {url}")

    return ". ".join(parts) + ("" if parts[-1].endswith(".") else ".")


def format_tooltip(
    topic: str,
    doc_path: str,
    custom_description: Optional[str] = None
) -> Dict[str, str]:
    """
    Format tooltip data for GUI components.

    Args:
        topic: Display name for the topic
        doc_path: Dot notation path to documentation
        custom_description: Optional custom description (otherwise uses default)

    Returns:
        Dict with 'title', 'description', and 'url' keys

    Example:
        >>> format_tooltip("HNSW Indexing", "qdrant.indexing")
        {
            'title': 'HNSW Indexing',
            'description': 'HNSW parameters: m (edges), ef_construct (build), ef (search)',
            'url': 'https://qdrant.tech/documentation/concepts/indexing/'
        }
    """
    description = custom_description or get_description(doc_path) or ""
    url = get_doc_link(doc_path) or ""

    return {
        'title': topic,
        'description': description,
        'url': url
    }


def load_full_json() -> dict:
    """
    Load the complete JSON documentation library.

    Returns:
        Full JSON data structure
    """
    json_path = Path(__file__).parent / "external_documentation_links.json"
    with open(json_path, 'r') as f:
        return json.load(f)


# Pre-defined common error formats
class CommonErrors:
    """Pre-formatted error templates with documentation links."""

    @staticmethod
    def invalid_hnsw_param(param: str, value: any, expected: str) -> str:
        return format_error_with_link(
            f"Invalid HNSW parameter '{param}' = {value}",
            "qdrant.indexing",
            details=f"Expected {expected}"
        )

    @staticmethod
    def invalid_rerank_model(model: str, valid_models: list) -> str:
        return format_error_with_link(
            f"Invalid rerank model '{model}'",
            "cohere.rerank",
            details=f"Valid models: {', '.join(valid_models)}"
        )

    @staticmethod
    def embedding_dimension_mismatch(expected: int, actual: int) -> str:
        return format_error_with_link(
            f"Embedding dimension mismatch",
            "baai.bge_models",
            details=f"Expected {expected}D, got {actual}D"
        )

    @staticmethod
    def hybrid_search_config_error(issue: str) -> str:
        return format_error_with_link(
            "Invalid hybrid search configuration",
            "langchain.hybrid_search",
            details=issue
        )

    @staticmethod
    def prometheus_metric_error(metric_name: str, issue: str) -> str:
        return format_error_with_link(
            f"Metric '{metric_name}' validation failed",
            "prometheus.naming",
            details=issue
        )

    @staticmethod
    def alert_rule_error(rule_name: str, issue: str) -> str:
        return format_error_with_link(
            f"Alert rule '{rule_name}' is invalid",
            "prometheus.alerting_rules",
            details=issue
        )


# Pre-defined common tooltips
class CommonTooltips:
    """Pre-formatted tooltip data for common GUI elements."""

    HNSW_M = format_tooltip(
        "HNSW m parameter",
        "qdrant.indexing",
        "Number of edges per node - higher values increase accuracy but use more space"
    )

    HNSW_EF_CONSTRUCT = format_tooltip(
        "HNSW ef_construct",
        "qdrant.indexing",
        "Neighbors considered during index building - higher values increase accuracy but slow down indexing"
    )

    HNSW_EF = format_tooltip(
        "HNSW ef parameter",
        "qdrant.indexing",
        "Search range during queries - higher values increase accuracy but slow down search"
    )

    RERANK_MODEL = format_tooltip(
        "Rerank Model",
        "cohere.rerank",
        "Cross-encoder model that reorders results by semantic relevance"
    )

    HYBRID_SEARCH = format_tooltip(
        "Hybrid Search",
        "langchain.hybrid_search",
        "Combines dense vector search with sparse keyword search (BM25) for better results"
    )

    MMR_THRESHOLD = format_tooltip(
        "MMR Threshold (λ)",
        "langchain.mmr",
        "Balance between relevance (near 1.0) and diversity (near 0.0)"
    )

    BM25_K1 = format_tooltip(
        "BM25 k1 parameter",
        "algorithms.bm25",
        "Controls term frequency saturation - typical values: 1.2-2.0"
    )

    BM25_B = format_tooltip(
        "BM25 b parameter",
        "algorithms.bm25",
        "Controls document length normalization - typical values: 0.5-0.8"
    )

    RRF_K = format_tooltip(
        "RRF k constant",
        "algorithms.rrf",
        "Ranking constant in score = 1/(rank + k) - typically 60"
    )

    PROMETHEUS_COUNTER = format_tooltip(
        "Counter Metric",
        "prometheus.metric_types",
        "Cumulative metric that only increases (e.g., total requests)"
    )

    PROMETHEUS_GAUGE = format_tooltip(
        "Gauge Metric",
        "prometheus.metric_types",
        "Metric that can go up or down (e.g., current memory usage)"
    )


if __name__ == "__main__":
    # Demo usage
    print("=== Documentation Links Library Demo ===\n")

    # Example 1: Get a link
    print("1. Get a documentation link:")
    url = get_doc_link("qdrant.indexing")
    print(f"   qdrant.indexing -> {url}\n")

    # Example 2: Format an error
    print("2. Format error with link:")
    error = CommonErrors.invalid_hnsw_param("m", -1, "m >= 0")
    print(f"   {error}\n")

    # Example 3: Get tooltip data
    print("3. Get tooltip data:")
    tooltip = CommonTooltips.HNSW_M
    print(f"   Title: {tooltip['title']}")
    print(f"   Desc: {tooltip['description']}")
    print(f"   URL: {tooltip['url']}\n")

    # Example 4: Custom tooltip
    print("4. Custom tooltip:")
    custom = format_tooltip("My Feature", "cohere.embeddings")
    print(f"   {custom}\n")

    # Example 5: All available categories
    print("5. Available documentation categories:")
    for attr in dir(DOCS):
        if not attr.startswith('_'):
            print(f"   - {attr}")
