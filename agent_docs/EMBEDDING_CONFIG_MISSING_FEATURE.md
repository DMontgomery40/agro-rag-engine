# Embedding Configuration - Complete Implementation Plan

## Problem
- Embedding model HARDCODED in indexer (text-embedding-3-large)
- No UI to configure model/dimensions/precision
- Dashboard shows values but they're not changeable
- No support for alternative vector DBs

## Solution

### 1. Add UI in RAG → Indexing (where indexing happens)
Inputs needed:
- Embedding Provider select (OpenAI, Voyage, HF, Local)
- Embedding Model select (populated per provider)
- Dimensions input (with model-specific limits)
- Precision select (float32, float16, int8, uint8)
- Vector DB select (Qdrant, [future: Chroma, Weaviate, etc.])

### 2. Backend API
Add to /api/index/start payload:
- embedding_provider
- embedding_model  
- embedding_dimensions
- embedding_precision
- vector_db

### 3. Indexer Updates
File: indexer/index_repo.py
- Read EMBEDDING_MODEL from env/config (not hardcoded)
- Read EMBEDDING_DIMENSIONS from env/config
- Read EMBEDDING_PRECISION from env/config
- Pass to Qdrant VectorParams(size=dimensions)

### 4. Vector DB Abstraction
Create: indexer/vector_db_adapter.py
- QdrantAdapter
- [Future: ChromaAdapter, WeaviateAdapter]
- Factory pattern based on config

### 5. Storage Calculator
Must prefill with:
- Current embedding model from /api/config
- Current dimensions from /api/config
- Current precision from /api/config
- Calculate storage based on ACTUAL values, not assumptions

### 6. Dashboard Links
Embedding Config Panel values link to:
- /rag?subtab=indexing (where embedding is configured)

This is the CORRECT implementation.
