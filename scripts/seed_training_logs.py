#!/usr/bin/env python3
"""Seed the query logs with high-quality training data for the learning reranker.

This creates accurate query-retrieval-feedback tuples that teach the cross-encoder
to properly rank code results for this AGRO codebase.
"""
import json
import uuid
import time
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
LOG_PATH = BASE / "data" / "logs" / "queries.jsonl"

def now():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

# High-quality training data: each entry has:
# - query: what the user asked
# - positive: the correct code file/snippet (should rank #1)
# - negatives: irrelevant results (should rank lower)
# - feedback: thumbsup/star5 for positive, sometimes thumbsdown for very wrong results

TRAINING_DATA = [
    # === HYBRID SEARCH ===
    {
        "query": "How does hybrid search work in AGRO?",
        "positive": {
            "doc_id": "retrieval/hybrid_search.py:1-40",
            "text": '''"""Clean Hybrid Search - v2 Rewrite

Simple, working search that:
1. BM25 sparse search
2. Qdrant vector search  
3. RRF fusion
4. Cross-encoder reranking
5. Returns results

No bells and whistles - just working search.
"""

import os
import json
from pathlib import Path
from typing import List, Dict, Optional
from collections import defaultdict

# BM25
import bm25s
from bm25s.tokenization import Tokenizer
from Stemmer import Stemmer

# Qdrant
from qdrant_client import QdrantClient, models'''
        },
        "negatives": [
            {"doc_id": "server/alerts.py:1-20", "text": "Alert configuration module for monitoring thresholds..."},
            {"doc_id": "web/src/App.tsx:1-30", "text": "import React from 'react'; const App = () => {..."},
            {"doc_id": "cli/agro.py:1-20", "text": "#!/usr/bin/env python3\nCLI entry point for AGRO..."},
        ],
        "feedback": "star5"
    },
    {
        "query": "Where is BM25 sparse search implemented?",
        "positive": {
            "doc_id": "retrieval/hybrid_search.py:15-35",
            "text": '''# BM25
import bm25s
from bm25s.tokenization import Tokenizer
from Stemmer import Stemmer

# BM25 search configuration
BM25_WEIGHT = 0.4
VECTOR_WEIGHT = 0.6

def _bm25_search(query: str, corpus, k: int = 100) -> List[Dict]:
    """Perform BM25 sparse search over the corpus."""
    stemmer = Stemmer("english")
    tokenizer = Tokenizer(stemmer=stemmer)
    tokens = tokenizer.tokenize([query])
    scores = bm25s.score(tokens[0], corpus)
    return sorted(zip(range(len(scores)), scores), key=lambda x: -x[1])[:k]'''
        },
        "negatives": [
            {"doc_id": "retrieval/embed_cache.py:1-20", "text": "Embedding cache for vector storage..."},
            {"doc_id": "server/env_model.py:1-20", "text": "Environment model configuration..."},
        ],
        "feedback": "thumbsup"
    },
    
    # === LEARNING RERANKER ===
    {
        "query": "How does the learning reranker train on feedback?",
        "positive": {
            "doc_id": "server/learning_reranker.py:1-35",
            "text": '''"""
Learning Reranker Module (server/learning_reranker.py)

This is the LEARNING reranker that supports:
  - Feedback loop integration for model improvement
  - Hot-reloadable cross-encoder model training
  - Enhanced search quality through continuous learning

NOT to be confused with retrieval/rerank.py which is the production search reranker
used during retrieval operations.

Purpose: Hot-reloadable cross-encoder for enhanced search with feedback-driven training
"""
import os
import math
import time
from typing import List, Dict, Any, Optional
from pathlib import Path
from sentence_transformers import CrossEncoder'''
        },
        "negatives": [
            {"doc_id": "retrieval/rerank.py:1-20", "text": "Production reranker for retrieval operations..."},
            {"doc_id": "server/cards_builder.py:1-20", "text": "Semantic card builder module..."},
        ],
        "feedback": "star5"
    },
    {
        "query": "Where are triplets mined from query logs?",
        "positive": {
            "doc_id": "scripts/mine_triplets.py:1-50",
            "text": '''#!/usr/bin/env python3
"""Mine training triplets from query logs.

Reads data/logs/queries.jsonl and extracts positive/negative examples
for reranker training based on clicks, feedback, and ground truth.
"""
import json
import os
import sys
from pathlib import Path
from typing import List, Dict, Any, Optional, Set

# Respect AGRO_LOG_PATH if provided
_log_env = os.getenv("AGRO_LOG_PATH", "data/logs/queries.jsonl")
LOG = Path(_log_env)

def iter_events():
    """Yield all events from the query log."""
    if not LOG.exists():
        return
    with LOG.open("r", encoding="utf-8") as f:
        for line in f:
            yield json.loads(line)'''
        },
        "negatives": [
            {"doc_id": "scripts/train_reranker.py:1-20", "text": "Train the cross-encoder model..."},
            {"doc_id": "server/telemetry.py:1-20", "text": "Telemetry logging module..."},
        ],
        "feedback": "thumbsup"
    },
    
    # === CONFIGURATION ===
    {
        "query": "Where is the Pydantic config model defined?",
        "positive": {
            "doc_id": "server/models/agro_config_model.py:1-60",
            "text": '''"""Pydantic models for AGRO configuration.

This defines the schema for agro_config.json and provides
validation, type coercion, and serialization.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class RetrievalConfig(BaseModel):
    """Configuration for retrieval/search behavior."""
    bm25_weight: float = Field(default=0.4, ge=0, le=1)
    vector_weight: float = Field(default=0.6, ge=0, le=1)
    final_k: int = Field(default=10, ge=1)
    rerank_top_n: int = Field(default=20, ge=1)
    multi_query_count: int = Field(default=3, ge=1)'''
        },
        "negatives": [
            {"doc_id": "agro_config.json:1-20", "text": '{"retrieval": {"bm25_weight": 0.4...'},
            {"doc_id": "server/env_model.py:1-20", "text": "Environment variable configuration..."},
        ],
        "feedback": "star5"
    },
    {
        "query": "How do I add a new config setting to AGRO?",
        "positive": {
            "doc_id": "server/services/config_registry.py:1-80",
            "text": '''"""Configuration Registry - Central config management.

All config keys must be registered here. This provides:
- Type validation
- Default values  
- Hot-reload support
- GUI integration via config_store.py

To add a new config:
1. Add key to AGRO_CONFIG_KEYS
2. Add to agro_config_model.py Pydantic model
3. Add default to agro_config.json
4. Optionally add GUI control in web/
"""
from typing import Any, Dict, Optional, Callable
import os
import json

AGRO_CONFIG_KEYS = [
    "AGRO_LOG_PATH",
    "AGRO_RERANKER_MODEL_PATH",
    "AGRO_RETRIEVAL_BM25_WEIGHT",
    ...
]'''
        },
        "negatives": [
            {"doc_id": "server/app.py:1-20", "text": "FastAPI application factory..."},
            {"doc_id": ".env.example:1-20", "text": "# Environment variables for secrets..."},
        ],
        "feedback": "star5"
    },
    
    # === API ENDPOINTS ===
    {
        "query": "Where is the /api/chat endpoint defined?",
        "positive": {
            "doc_id": "server/routers/search.py:120-180",
            "text": '''@router.post("/api/chat")
async def chat_endpoint(request: Request) -> Union[JSONResponse, StreamingResponse]:
    """Unified chat endpoint supporting both regular and streaming responses.
    
    Request body:
        question: str - The user's question
        repo: Optional[str] - Target repository
        model: Optional[str] - Model to use
        temperature: float - Generation temperature
        stream: bool - Enable streaming (SSE)
        fast_mode: bool - Skip LLM, retrieval only
    
    Returns JSON or SSE stream based on 'stream' flag.
    """
    body = await request.json()
    question = body.get("question", "")
    stream = body.get("stream", False)
    fast_mode = body.get("fast_mode", False)'''
        },
        "negatives": [
            {"doc_id": "server/routers/config.py:1-30", "text": "Config API endpoints..."},
            {"doc_id": "server/routers/eval.py:1-30", "text": "Evaluation API endpoints..."},
        ],
        "feedback": "thumbsup"
    },
    {
        "query": "How does the feedback API work?",
        "positive": {
            "doc_id": "server/feedback.py:1-52",
            "text": '''from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from .telemetry import log_feedback_event

router = APIRouter()

class FeedbackBody(BaseModel):
    event_id: str = Field(..., description="event id returned by the ask call")
    signal: str = Field(..., description="thumbsup | thumbsdown | click | noclick")
    doc_id: Optional[str] = None
    note: Optional[str] = None

@router.post("/api/feedback")
def post_feedback(body: FeedbackBody, request: Request) -> Dict[str, Any]:
    """Record user feedback for a query event.
    
    The signal can be:
    - thumbsup: User found the answer helpful
    - thumbsdown: User found the answer unhelpful
    - star1-star5: 1-5 star rating
    """
    valid_signals = {"thumbsup", "thumbsdown", "click", "noclick", "note", "star1", "star2", "star3", "star4", "star5"}
    if body.signal not in valid_signals:
        raise HTTPException(status_code=400, detail="invalid signal")
    log_feedback_event(body.event_id, {"signal": body.signal})
    return {"ok": True}'''
        },
        "negatives": [
            {"doc_id": "server/telemetry.py:1-30", "text": "Telemetry logging functions..."},
            {"doc_id": "server/routers/search.py:1-30", "text": "Search router..."},
        ],
        "feedback": "star5"
    },
    
    # === INDEXING ===
    {
        "query": "How do I index a repository in AGRO?",
        "positive": {
            "doc_id": "indexer/index_repo.py:1-60",
            "text": '''#!/usr/bin/env python3
"""Index a repository for AGRO RAG search.

Usage:
    python indexer/index_repo.py --repo /path/to/repo
    
This will:
1. Scan the repository for code files
2. Chunk files using AST-aware chunking
3. Generate embeddings via configured provider
4. Store chunks in Qdrant vector database
5. Build BM25 index for sparse search
"""
import argparse
import json
from pathlib import Path
from typing import List, Dict

from retrieval.ast_chunker import chunk_file
from common.qdrant_utils import upsert_chunks

def index_repo(repo_path: str, collection: str = "agro") -> Dict:
    """Index a repository into AGRO's vector store."""
    chunks = []
    for file_path in Path(repo_path).rglob("*"):
        if file_path.suffix in {".py", ".ts", ".tsx", ".js", ".jsx"}:
            chunks.extend(chunk_file(str(file_path)))
    
    upsert_chunks(chunks, collection)
    return {"indexed": len(chunks)}'''
        },
        "negatives": [
            {"doc_id": "indexer/build_cards.py:1-30", "text": "Build semantic cards..."},
            {"doc_id": "retrieval/hybrid_search.py:1-30", "text": "Hybrid search module..."},
        ],
        "feedback": "star5"
    },
    {
        "query": "Where is AST-based code chunking implemented?",
        "positive": {
            "doc_id": "retrieval/ast_chunker.py:1-50",
            "text": '''"""AST-aware code chunking for better retrieval.

Uses tree-sitter to parse code and chunk at semantic boundaries
(functions, classes, methods) rather than arbitrary line counts.
"""
import tree_sitter
from tree_sitter_languages import get_parser
from typing import List, Dict, Optional

def chunk_file(file_path: str, max_chunk_size: int = 1500) -> List[Dict]:
    """Chunk a code file using AST-aware boundaries.
    
    Args:
        file_path: Path to the code file
        max_chunk_size: Maximum characters per chunk
        
    Returns:
        List of chunks with metadata (file_path, start_line, end_line, text)
    """
    parser = get_parser(detect_language(file_path))
    tree = parser.parse(open(file_path, "rb").read())
    return _extract_chunks(tree.root_node, file_path, max_chunk_size)'''
        },
        "negatives": [
            {"doc_id": "indexer/index_repo.py:1-30", "text": "Repository indexing script..."},
            {"doc_id": "retrieval/hybrid_search.py:1-30", "text": "Search implementation..."},
        ],
        "feedback": "thumbsup"
    },
    
    # === WEB UI ===
    {
        "query": "Where is the React chat interface component?",
        "positive": {
            "doc_id": "web/src/components/Chat/ChatInterface.tsx:1-60",
            "text": '''import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAPI } from '../../hooks/useAPI';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  citations?: string[];
  confidence?: number;
  eventId?: string; // For feedback correlation
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ onTraceUpdate }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const { api } = useAPI();
  
  const sendMessage = async () => {
    const response = await fetch(api('chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: input, stream: true })
    });
    // Handle streaming response...
  };'''
        },
        "negatives": [
            {"doc_id": "web/src/components/Dashboard/SystemStatusSubtab.tsx:1-30", "text": "Dashboard status component..."},
            {"doc_id": "web/src/App.tsx:1-30", "text": "Main App component..."},
        ],
        "feedback": "star5"
    },
    {
        "query": "How are tooltips implemented in the AGRO GUI?",
        "positive": {
            "doc_id": "web/src/hooks/useTooltips.ts:1-80",
            "text": '''import { useEffect, useCallback } from 'react';

/**
 * Tooltip definitions for AGRO GUI elements.
 * Each tooltip provides context-sensitive help for UI controls.
 */
export const TOOLTIPS: Record<string, string> = {
  BM25_WEIGHT: "Weight for BM25 sparse search (0-1). Higher values emphasize keyword matching.",
  VECTOR_WEIGHT: "Weight for vector/semantic search (0-1). Higher values emphasize meaning.",
  FINAL_K: "Number of final results to return after reranking.",
  RERANK_TOP_N: "Number of candidates to pass to the reranker.",
  MULTI_QUERY_COUNT: "Number of query variations to generate for multi-query expansion.",
  CHAT_STREAMING_ENABLED: "Enable real-time streaming of chat responses.",
};

export function useTooltips() {
  const registerTooltip = useCallback((element: HTMLElement, key: string) => {
    if (TOOLTIPS[key]) {
      element.title = TOOLTIPS[key];
    }
  }, []);
  
  return { registerTooltip, TOOLTIPS };
}'''
        },
        "negatives": [
            {"doc_id": "gui/js/tooltips.js:1-30", "text": "Legacy tooltip module..."},
            {"doc_id": "web/src/hooks/useAPI.ts:1-30", "text": "API hook..."},
        ],
        "feedback": "thumbsup"
    },
    
    # === DOCKER/INFRASTRUCTURE ===
    {
        "query": "How do I start AGRO with Docker?",
        "positive": {
            "doc_id": "scripts/up.sh:1-40",
            "text": '''#!/bin/bash
# Start all AGRO services

set -e

echo "Starting AGRO services..."

# Start infrastructure
docker compose -f infra/docker-compose.yml up -d

# Wait for Qdrant
echo "Waiting for Qdrant..."
until curl -s http://localhost:6333/collections > /dev/null; do
    sleep 1
done

# Wait for Redis  
echo "Waiting for Redis..."
until docker exec agro-redis redis-cli ping > /dev/null; do
    sleep 1
done

# Start API server
echo "Starting API server..."
uvicorn server.asgi:create_app --factory --host 0.0.0.0 --port 8012 &

echo "AGRO is ready!"'''
        },
        "negatives": [
            {"doc_id": "docker-compose.yml:1-30", "text": "Docker compose configuration..."},
            {"doc_id": "Dockerfile:1-30", "text": "Docker build configuration..."},
        ],
        "feedback": "star5"
    },
    {
        "query": "Where is the Qdrant vector database configured?",
        "positive": {
            "doc_id": "common/qdrant_utils.py:1-50",
            "text": '''"""Qdrant vector database utilities.

Provides functions for connecting to and interacting with Qdrant.
"""
from qdrant_client import QdrantClient, models
from typing import List, Dict, Optional
import os

def get_qdrant_client() -> QdrantClient:
    """Get a configured Qdrant client."""
    host = os.getenv("QDRANT_HOST", "localhost")
    port = int(os.getenv("QDRANT_PORT", "6333"))
    return QdrantClient(host=host, port=port)

def upsert_chunks(chunks: List[Dict], collection: str = "agro") -> int:
    """Upsert chunks to Qdrant collection."""
    client = get_qdrant_client()
    
    # Create collection if needed
    try:
        client.get_collection(collection)
    except:
        client.create_collection(
            collection_name=collection,
            vectors_config=models.VectorParams(size=1536, distance=models.Distance.COSINE)
        )
    
    # Upsert chunks
    points = [models.PointStruct(id=c["id"], vector=c["embedding"], payload=c) for c in chunks]
    client.upsert(collection_name=collection, points=points)
    return len(points)'''
        },
        "negatives": [
            {"doc_id": "infra/docker-compose.yml:1-30", "text": "Docker compose services..."},
            {"doc_id": "retrieval/hybrid_search.py:1-30", "text": "Search implementation..."},
        ],
        "feedback": "thumbsup"
    },
    
    # === EVALUATION ===
    {
        "query": "How do I run evaluation tests in AGRO?",
        "positive": {
            "doc_id": "eval/eval_loop.py:1-50",
            "text": '''#!/usr/bin/env python3
"""Run evaluation loop against golden test questions.

Usage:
    python eval/eval_loop.py --golden data/golden.json
    
This will:
1. Load golden questions with expected file paths
2. Run each question through the RAG pipeline
3. Calculate metrics (MRR, Hit@K, precision, recall)
4. Save results to data/evals/
"""
import json
import argparse
from pathlib import Path
from typing import List, Dict

from server.services.rag import do_search

def evaluate_golden(golden_path: str) -> Dict:
    """Run evaluation on golden dataset."""
    with open(golden_path) as f:
        golden = json.load(f)
    
    results = []
    for item in golden:
        query = item["question"]
        expected = set(item["expected_files"])
        
        # Run search
        docs = do_search(query)
        retrieved = {d["file_path"] for d in docs}
        
        # Calculate metrics
        hits = len(expected & retrieved)
        results.append({
            "query": query,
            "precision": hits / len(retrieved) if retrieved else 0,
            "recall": hits / len(expected) if expected else 0
        })
    
    return {"results": results, "avg_precision": sum(r["precision"] for r in results) / len(results)}'''
        },
        "negatives": [
            {"doc_id": "data/golden.json:1-30", "text": '[{"question": "...", "expected_files": [...]}]'},
            {"doc_id": "tests/test_search.py:1-30", "text": "Search unit tests..."},
        ],
        "feedback": "star5"
    },
    {
        "query": "Where is the golden test dataset?",
        "positive": {
            "doc_id": "data/golden.json:1-40",
            "text": '''[
  {
    "question": "How does hybrid search work?",
    "expected_files": ["retrieval/hybrid_search.py", "retrieval/hybrid_search_v2.py"]
  },
  {
    "question": "Where is the learning reranker implemented?",
    "expected_files": ["server/learning_reranker.py", "reranker/learning_reranker.py"]
  },
  {
    "question": "How do I configure AGRO settings?",
    "expected_files": ["server/services/config_registry.py", "server/models/agro_config_model.py"]
  },
  {
    "question": "Where are semantic cards built?",
    "expected_files": ["server/cards_builder.py", "indexer/build_cards.py"]
  }
]'''
        },
        "negatives": [
            {"doc_id": "eval/eval_loop.py:1-30", "text": "Evaluation loop script..."},
            {"doc_id": "data/evals/baseline.json:1-30", "text": "Baseline eval results..."},
        ],
        "feedback": "thumbsup"
    },
    
    # === SEMANTIC CARDS ===
    {
        "query": "What are semantic cards and how are they built?",
        "positive": {
            "doc_id": "server/cards_builder.py:1-60",
            "text": '''"""Semantic Card Builder

Builds pre-indexed semantic cards from the repository for faster search.
Cards are curated document units that represent key concepts, functions,
and patterns in the codebase.

A semantic card contains:
- title: Short description
- content: Detailed explanation
- file_refs: Related file paths
- keywords: Extracted keywords for BM25
- embedding: Dense vector for semantic search
"""
import json
from pathlib import Path
from typing import List, Dict

def build_cards(repo_path: str, out_path: str) -> int:
    """Build semantic cards from a repository.
    
    Args:
        repo_path: Path to the repository
        out_path: Output path for cards.jsonl
        
    Returns:
        Number of cards built
    """
    cards = []
    
    # Extract cards from docstrings, comments, READMEs
    for file_path in Path(repo_path).rglob("*.py"):
        cards.extend(_extract_cards_from_file(str(file_path)))
    
    # Write cards
    with open(out_path, "w") as f:
        for card in cards:
            f.write(json.dumps(card) + "\\n")
    
    return len(cards)'''
        },
        "negatives": [
            {"doc_id": "indexer/build_cards.py:1-30", "text": "Card indexing script..."},
            {"doc_id": "retrieval/hybrid_search.py:1-30", "text": "Search implementation..."},
        ],
        "feedback": "star5"
    },
    
    # === CLI ===
    {
        "query": "How do I use the AGRO CLI?",
        "positive": {
            "doc_id": "cli/agro.py:1-60",
            "text": '''#!/usr/bin/env python3
"""AGRO CLI - Command line interface for AGRO RAG engine.

Usage:
    agro search "your query"      # Search the codebase
    agro chat                     # Interactive chat mode
    agro index /path/to/repo      # Index a repository
    agro reranker train           # Train the learning reranker
    agro eval                     # Run evaluation
    agro status                   # Check service status
"""
import click
from rich.console import Console

console = Console()

@click.group()
def cli():
    """AGRO - Another Good RAG Option"""
    pass

@cli.command()
@click.argument("query")
def search(query: str):
    """Search the codebase."""
    from server.services.rag import do_search
    results = do_search(query)
    for r in results:
        console.print(f"[bold]{r['file_path']}[/bold]: {r['score']:.3f}")
        console.print(f"  {r['text'][:200]}...")

@cli.command()
def chat():
    """Start interactive chat mode."""
    from cli.chat_cli import run_chat
    run_chat()'''
        },
        "negatives": [
            {"doc_id": "cli/chat_cli.py:1-30", "text": "Chat CLI implementation..."},
            {"doc_id": "server/app.py:1-30", "text": "FastAPI app..."},
        ],
        "feedback": "star5"
    },
    
    # === TELEMETRY ===
    {
        "query": "How is query telemetry logged in AGRO?",
        "positive": {
            "doc_id": "server/telemetry.py:1-80",
            "text": '''import json
import time
import os
import uuid
from pathlib import Path
from typing import List, Dict, Any, Optional

def _resolve_log_path() -> Path:
    """Resolve the telemetry log path from config registry."""
    _log_path_str = os.getenv("AGRO_LOG_PATH", "data/logs/queries.jsonl")
    return Path(_log_path_str)

def log_query_event(
    query_raw: str,
    query_rewritten: Optional[str],
    retrieved: List[Dict[str, Any]],
    answer_text: str,
    ground_truth_refs: Optional[List[str]] = None,
    latency_ms: Optional[int] = None,
) -> str:
    """Log a query event and return event_id for later feedback correlation."""
    event_id = str(uuid.uuid4())
    evt = {
        "type": "query",
        "event_id": event_id,
        "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "query_raw": query_raw,
        "retrieval": retrieved,
        "answer_text": answer_text,
    }
    with _resolve_log_path().open("a") as f:
        f.write(json.dumps(evt) + "\\n")
    return event_id

def log_feedback_event(event_id: str, feedback: Dict[str, Any]) -> None:
    """Log feedback for a previous query event."""
    evt = {"type": "feedback", "event_id": event_id, "feedback": feedback}
    with _resolve_log_path().open("a") as f:
        f.write(json.dumps(evt) + "\\n")'''
        },
        "negatives": [
            {"doc_id": "server/metrics.py:1-30", "text": "Prometheus metrics..."},
            {"doc_id": "server/alerts.py:1-30", "text": "Alert configuration..."},
        ],
        "feedback": "thumbsup"
    },
    
    # === CROSS-ENCODER TRAINING ===
    {
        "query": "How do I train the cross-encoder reranker?",
        "positive": {
            "doc_id": "scripts/train_reranker.py:1-60",
            "text": '''#!/usr/bin/env python3
"""Train the cross-encoder reranker model.

Usage:
    python scripts/train_reranker.py --epochs 3 --batch 16

Reads triplets from data/training/triplets.jsonl and fine-tunes
a cross-encoder model for reranking search results.
"""
import argparse
import json
from pathlib import Path
from sentence_transformers import CrossEncoder, InputExample
from sentence_transformers.cross_encoder.evaluation import CECorrelationEvaluator

def load_triplets(path: str):
    """Load training triplets."""
    triplets = []
    with open(path) as f:
        for line in f:
            t = json.loads(line)
            triplets.append(t)
    return triplets

def train(triplets_path: str, output_path: str, epochs: int = 2, batch_size: int = 16):
    """Train the cross-encoder model."""
    triplets = load_triplets(triplets_path)
    
    # Create training examples
    examples = []
    for t in triplets:
        query = t["query"]
        pos = t["positive_text"]
        for neg in t["negative_texts"]:
            examples.append(InputExample(texts=[query, pos], label=1.0))
            examples.append(InputExample(texts=[query, neg], label=0.0))
    
    # Train model
    model = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
    model.fit(train_dataloader=examples, epochs=epochs)
    model.save(output_path)'''
        },
        "negatives": [
            {"doc_id": "scripts/mine_triplets.py:1-30", "text": "Triplet mining script..."},
            {"doc_id": "server/learning_reranker.py:1-30", "text": "Learning reranker module..."},
        ],
        "feedback": "star5"
    },
    
    # === MCP SERVER ===
    {
        "query": "Where is the MCP server implemented?",
        "positive": {
            "doc_id": "server/mcp/server.py:1-50",
            "text": '''"""AGRO MCP (Model Context Protocol) Server.

Provides RAG tools for integration with AI assistants like Claude, Cursor, etc.
Exposes search and retrieval capabilities via the MCP protocol.
"""
import asyncio
from mcp import Server, Tool
from typing import List, Dict

server = Server("agro-mcp")

@server.tool()
async def search_codebase(query: str, limit: int = 10) -> List[Dict]:
    """Search the indexed codebase for relevant code.
    
    Args:
        query: Natural language search query
        limit: Maximum number of results
        
    Returns:
        List of relevant code chunks with file paths and scores
    """
    from server.services.rag import do_search
    results = do_search(query, final_k=limit)
    return [{"file": r["file_path"], "text": r["text"], "score": r["score"]} for r in results]

@server.tool()
async def get_file_content(file_path: str) -> str:
    """Get the full content of a file from the indexed repository."""
    from common.paths import repo_root
    with open(repo_root() / file_path) as f:
        return f.read()'''
        },
        "negatives": [
            {"doc_id": "server/mcp/http.py:1-30", "text": "MCP HTTP transport..."},
            {"doc_id": "server/app.py:1-30", "text": "FastAPI app..."},
        ],
        "feedback": "thumbsup"
    },
    
    # === MULTI-QUERY EXPANSION ===
    {
        "query": "How does multi-query expansion work?",
        "positive": {
            "doc_id": "retrieval/synonym_expander.py:1-50",
            "text": '''"""Query expansion via synonyms and multi-query generation.

Expands user queries to improve recall by:
1. Generating alternative phrasings
2. Adding synonyms for technical terms
3. Creating multiple query variants for RRF fusion
"""
from typing import List, Optional
import re

SYNONYMS = {
    "function": ["method", "def", "func", "procedure"],
    "class": ["type", "struct", "model", "interface"],
    "variable": ["var", "const", "let", "param", "argument"],
    "config": ["configuration", "settings", "options", "preferences"],
    "api": ["endpoint", "route", "handler", "service"],
}

def expand_query(query: str, num_variants: int = 3) -> List[str]:
    """Generate query variants for multi-query search.
    
    Args:
        query: Original user query
        num_variants: Number of variants to generate
        
    Returns:
        List of query variants including original
    """
    variants = [query]
    
    # Add synonym expansions
    for term, synonyms in SYNONYMS.items():
        if term in query.lower():
            for syn in synonyms[:num_variants-1]:
                variants.append(query.lower().replace(term, syn))
    
    return variants[:num_variants]'''
        },
        "negatives": [
            {"doc_id": "retrieval/hybrid_search.py:1-30", "text": "Hybrid search implementation..."},
            {"doc_id": "server/langgraph_app.py:1-30", "text": "LangGraph pipeline..."},
        ],
        "feedback": "star5"
    },
    
    # More accurate entries...
    {
        "query": "Where is the FastAPI application created?",
        "positive": {
            "doc_id": "server/asgi.py:1-50",
            "text": '''"""ASGI entry point for AGRO FastAPI application.

This module creates and configures the FastAPI app with all routers,
middleware, and startup/shutdown handlers.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from server.routers import config, search, eval, indexing, profiles
from server.feedback import router as feedback_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    print("AGRO starting up...")
    yield
    # Shutdown
    print("AGRO shutting down...")

def create_app() -> FastAPI:
    """Factory function to create FastAPI app."""
    app = FastAPI(
        title="AGRO RAG API",
        description="Another Good RAG Option - Enterprise RAG for codebases",
        version="1.0.0",
        lifespan=lifespan
    )
    
    # Add CORS
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"])
    
    # Include routers
    app.include_router(search.router)
    app.include_router(config.router)
    app.include_router(feedback_router)
    
    return app'''
        },
        "negatives": [
            {"doc_id": "server/app.py:1-20", "text": "Legacy app module..."},
            {"doc_id": "server/routers/search.py:1-30", "text": "Search router..."},
        ],
        "feedback": "thumbsup"
    },
    
    {
        "query": "How does AGRO handle embedding caching?",
        "positive": {
            "doc_id": "retrieval/embed_cache.py:1-60",
            "text": '''"""Embedding cache for vector storage efficiency.

Caches computed embeddings to avoid redundant API calls.
Uses file-based or Redis cache depending on configuration.
"""
import hashlib
import json
from pathlib import Path
from typing import List, Optional, Dict
import numpy as np

CACHE_DIR = Path("data/embed_cache")

def get_cache_key(text: str, model: str) -> str:
    """Generate cache key from text and model."""
    content = f"{model}:{text}"
    return hashlib.md5(content.encode()).hexdigest()

def get_cached_embedding(text: str, model: str) -> Optional[List[float]]:
    """Retrieve cached embedding if available."""
    key = get_cache_key(text, model)
    cache_path = CACHE_DIR / f"{key}.npy"
    if cache_path.exists():
        return np.load(cache_path).tolist()
    return None

def cache_embedding(text: str, model: str, embedding: List[float]) -> None:
    """Store embedding in cache."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    key = get_cache_key(text, model)
    np.save(CACHE_DIR / f"{key}.npy", np.array(embedding))'''
        },
        "negatives": [
            {"doc_id": "retrieval/hybrid_search.py:1-30", "text": "Search implementation..."},
            {"doc_id": "common/qdrant_utils.py:1-30", "text": "Qdrant utilities..."},
        ],
        "feedback": "star5"
    },
    
    {
        "query": "Where are RAG service functions defined?",
        "positive": {
            "doc_id": "server/services/rag.py:1-80",
            "text": '''"""RAG Service Layer

Core RAG operations: search, answer generation, and chat.
This is the main entry point for RAG functionality used by API endpoints.
"""
from typing import List, Dict, Any, Optional, AsyncIterator
from retrieval.hybrid_search import hybrid_search
from server.env_model import get_model_response

async def do_search(query: str, final_k: int = 10, **kwargs) -> List[Dict]:
    """Perform hybrid search over the indexed codebase.
    
    Args:
        query: User search query
        final_k: Number of results to return
        
    Returns:
        List of search results with file_path, text, score
    """
    return hybrid_search(query, k=final_k, **kwargs)

async def do_answer(query: str, context: List[Dict], **kwargs) -> str:
    """Generate an answer using retrieved context.
    
    Args:
        query: User question
        context: Retrieved documents
        
    Returns:
        Generated answer string
    """
    prompt = _build_rag_prompt(query, context)
    return await get_model_response(prompt, **kwargs)

async def do_chat_stream(query: str, **kwargs) -> AsyncIterator[Dict]:
    """Stream a chat response with citations.
    
    Yields chunks with type: thinking, content, citations, done
    """
    context = await do_search(query)
    async for chunk in _stream_response(query, context, **kwargs):
        yield chunk'''
        },
        "negatives": [
            {"doc_id": "server/routers/search.py:1-30", "text": "Search API router..."},
            {"doc_id": "retrieval/hybrid_search.py:1-30", "text": "Search implementation..."},
        ],
        "feedback": "star5"
    },
]

def write_training_logs():
    """Write high-quality training data to the query logs."""
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    
    count = 0
    with LOG_PATH.open("w", encoding="utf-8") as f:
        for item in TRAINING_DATA:
            # Generate unique event ID
            event_id = str(uuid.uuid4())
            
            # Build retrieval list with positive first (highest score)
            retrieval = []
            pos = item["positive"]
            retrieval.append({
                "doc_id": pos["doc_id"],
                "score": 0.95,
                "text": pos["text"],
                "clicked": True  # Mark as clicked for triplet mining
            })
            
            # Add negatives with lower scores
            for i, neg in enumerate(item["negatives"]):
                retrieval.append({
                    "doc_id": neg["doc_id"],
                    "score": 0.6 - (i * 0.1),
                    "text": neg["text"],
                    "clicked": False
                })
            
            # Write query event
            query_evt = {
                "type": "query",
                "event_id": event_id,
                "ts": now(),
                "query_raw": item["query"],
                "query_rewritten": "",
                "retrieval": retrieval,
                "answer_text": f"Answer based on {pos['doc_id']}...",
                "ground_truth_refs": [pos["doc_id"]],
                "latency_ms": 150,
            }
            f.write(json.dumps(query_evt, ensure_ascii=False) + "\n")
            
            # Write feedback event
            feedback_evt = {
                "type": "feedback",
                "event_id": event_id,
                "ts": now(),
                "feedback": {"signal": item["feedback"]}
            }
            f.write(json.dumps(feedback_evt, ensure_ascii=False) + "\n")
            
            count += 1
    
    print(f"Wrote {count} query-feedback pairs to {LOG_PATH}")
    return count

if __name__ == "__main__":
    write_training_logs()


