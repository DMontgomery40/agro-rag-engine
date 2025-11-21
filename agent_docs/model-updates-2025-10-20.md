# Model Updates - October 20, 2025

## Summary

Your original `.env` file has been **RESTORED** from `.env.backup`. All your API keys and settings are intact.

## What Was Fixed

### 1. ✅ Original .env File Restored
- Your original configuration with `gpt-4o-mini`, `openai` backend, and all API keys has been restored
- Added local model support WITHOUT modifying your existing settings:
  - `GEN_MODEL_OLLAMA=qwen3-coder:30b`
  - `EMBEDDINGS_MODEL=qwen3-coder:30b`

### 2. ✅ 60 Models Added to prices.json

All models from major providers are now available in GUI dropdowns:

#### OpenAI (14 models)
- gpt-5, gpt-5-mini, gpt-5-nano, gpt-5-chat-latest, gpt-5-codex, gpt-5-pro
- gpt-4.1, gpt-4.1-mini, gpt-4.1-nano
- gpt-4o, gpt-4o-2024-05-13, gpt-4o-mini
- text-embedding-3-small, text-embedding-3-large

#### Anthropic (5 models)
- claude-3.5-sonnet, claude-3.5-haiku
- claude-3-opus, claude-3-sonnet, claude-3-haiku

#### Google (5 models)
- gemini-2.5-pro, gemini-2.5-flash
- gemini-1.5-pro, gemini-1.5-flash
- gemini-embedding-001

#### Cohere (8 models)
- command-xlarge-r-plus, command-xlarge-r, command-light
- embed-english-v3.0, embed-multilingual-v3.0
- rerank-english-v3.0, rerank-3.5, rerank-multilingual-v3.0

#### Mistral (4 models)
- mistral-large-2, mixtral-8x22b, mixtral-8x7b, mistral-7b

#### DeepSeek (2 models)
- deepseek-reasoner, deepseek-coder-v2

#### Voyage (4 models)
- voyage-3-large, voyage-code-3
- voyage-rerank-2, voyage-rerank-2-lite

#### Jina (2 models)
- jina-embeddings-v3, jina-clip-v2

#### Hugging Face (7 models)
- intfloat/e5-large-v2
- BAAI/bge-m3, BAAI/bge-small-en-v1.5, BAAI/bge-reranker-v2-m3
- jinaai/jina-reranker-v3
- mixedbread-ai/mxbai-rerank-large-v2, mixedbread-ai/mxbai-embed-large-v1

#### Ollama/Local (9 models)
- qwen3-coder:30b, qwen3-coder:14b, qwen3-coder:7b
- llama3.2:3b, llama3.2:1b
- nomic-embed-text
- deepseek-coder-v3:16b, deepseek-coder-v3:236b
- NV-Embed-v2

### 3. ✅ API Verified
- API is serving 60 models
- All GPT-5, GPT-4.1, and GPT-4o models are available
- 15 embedding models available
- Reranker models from Cohere, Voyage, Jina, and Hugging Face

## Current Configuration

Your `.env` file now contains:
```bash
GEN_MODEL=gpt-4o-mini
ENRICH_MODEL=gpt-4o-mini
ENRICH_BACKEND=openai
ENRICH_MODEL_OLLAMA=qwen3-coder:30b
GEN_MODEL_OLLAMA=qwen3-coder:30b
EMBEDDINGS_MODEL=qwen3-coder:30b
OPENAI_API_KEY=sk-proj-...
```

## Files Modified

1. `gui/prices.json` - Updated with 60 models from all major providers
2. `.env` - Restored from backup + added local model settings
3. `docker-compose.services.yml` - Fixed GEN_MODEL override
4. `gui/profiles/defaults.json` - Updated to match your settings

## Status

✅ Original .env restored
✅ 60+ models added across all providers
✅ API container rebuilt and restarted
✅ All models verified in `/api/prices` endpoint

## Next Steps

The GUI should now populate dropdowns with all available models from:
- OpenAI (if OPENAI_API_KEY is set) ✅
- Anthropic (if ANTHROPIC_API_KEY is set) ✅
- Google (if GOOGLE_API_KEY is set) ✅
- Cohere (if COHERE_API_KEY is set) ✅
- Local/Ollama models ✅


