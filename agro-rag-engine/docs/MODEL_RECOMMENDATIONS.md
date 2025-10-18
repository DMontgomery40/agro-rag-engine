# Model Recommendations for RAG Service

**⚠️ IMPORTANT**: AI model pricing and benchmarks change **daily**. These recommendations are current as of October 8, 2025, but will become outdated quickly. Always verify pricing and performance at the official sources before making decisions.

This guide helps you choose embedding and inference models based on your requirements: self-hosted vs cloud, hardware constraints, and budget.

## 📊 Quick Decision Matrix (October 2025)

| Use Case | Embedding | Inference | Monthly Cost* | Hardware |
|----------|-----------|-----------|---------------|----------|
| **Production (Cloud)** | OpenAI text-embedding-3-large | GPT-4o mini | $5 | None |
| **Budget Cloud** | Google Gemini (free tier) | Gemini 2.5 Flash | $1 | None |
| **Premium Cloud** | OpenAI text-embedding-3-large | Claude Sonnet 4.5 | $10 | None |
| **Self-Hosted (Mac M-series)** | nomic-embed-text | Qwen3-Coder 30B | $0 | 32GB+ RAM |
| **Self-Hosted (NVIDIA)** | NV-Embed-v2 | DeepSeek-Coder V2 | $0 | 24GB+ VRAM |
| **Privacy First** | BGE-M3 (local) | Qwen3-Coder (local) | $0 | 16GB+ RAM |

*Estimated for high usage (1M tokens/month -- that's a lot of embedding since **this RAG caches by default and only re-embeds and vectorizes on changed code**)

---

## 🌐 Cloud Models for Inference (API-Based)

- You do NOT need the same level of inference model that you would use without a good RAG. A really good RAG, such as this, will be doing a lot of the intellegence work upfront. 

### Current API Pricing (as of October 8, 2025)

**⚠️ WARNING**: Prices change frequently. Verify at:
- OpenAI: https://platform.openai.com/pricing
- Google: https://ai.google.dev/pricing
- Anthropic: https://docs.anthropic.com/pricing

#### OpenAI (Updated October 2025)

> Important note: If getting help from an LLM on setting this up, they will almost certainly recommend the Chat Completions API; however, that has been depricated for Responses API

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Use Case |
|-------|----------------------|------------------------|----------|
| **GPT-4o mini** | $0.15 | $0.60 | Best value for code generation |
| **GPT-4o** | $2.50 | $10.00 | Production, complex reasoning |
| **o3-mini** | $0.40 | $1.60 | Fast reasoning (new) |
| **text-embedding-3-large** | $0.13 | N/A | High-quality embeddings (3072d) |
| **text-embedding-3-small** | $0.02 | N/A | Budget embeddings (1536d) |

#### Google Gemini (Updated October 2025)

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Use Case |
|-------|----------------------|------------------------|----------|
| **Gemini 2.5 Flash** | $0.075 | $0.30 | Best value, 1M context |
| **Gemini 2.5 Pro** | $1.25 | $5.00 | Advanced reasoning |
| **Gemini Embeddings** | $0.15 | N/A | Free tier available (768d) |

**Free Tier**: Gemini offers generous free limits for embeddings - check current quotas at https://ai.google.dev/pricing

#### Anthropic Claude (Updated October 2025)

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Use Case |
|-------|----------------------|------------------------|----------|
| **Claude Haiku 3.5** | $0.80 | $4.00 | Fast, economical |
| **Claude Sonnet 4.5** | $3.00 | $15.00 | Balanced performance |
| **Claude Opus 4.1** | $15.00 | $75.00 | Highest quality |

### Cloud Model Recommendations

**Best Overall Value**: Gemini 2.5 Flash
- **Why**: $0.075/$0.30 pricing with 1M token context
- **When**: Production RAG with moderate budgets
- **Caveat**: Slightly lower code quality than GPT-4o mini

**Best Code Quality**: GPT-4o mini
- **Why**: 87.2% HumanEval score, $0.15/$0.60 pricing
- **When**: Code generation is critical
- **Caveat**: More expensive than Gemini

**Best for Large Context**: Gemini 2.5 Flash
- **Why**: 1M token context (8x more than GPT-4o mini)
- **When**: Processing large codebases or documents
- **Caveat**: Requires careful prompt engineering

---

## 🖥️ Self-Hosted Models (Local/On-Prem)

### Embedding Models for Self-Hosting

#### nomic-embed-text (Recommended for Mac)
- **Dimensions**: 768
- **Size**: 274MB
- **Performance**: 71% MTEB (surpasses OpenAI ada-002)
- **Hardware**: 8GB+ RAM (Mac M-series optimized)
- **Speed**: Very fast on Apple Silicon
- **Setup**: `ollama pull nomic-embed-text`

#### BGE-M3 (Multilingual, High Quality)
- **Dimensions**: 1024
- **Size**: ~1.3GB
- **Performance**: 71% MTEB
- **Hardware**: 16GB+ RAM
- **Languages**: 100+
- **Setup**: Via sentence-transformers

#### NV-Embed-v2 (NVIDIA GPUs)
- **Dimensions**: 1024
- **Size**: ~7GB
- **Performance**: 72.31% MTEB (former #1)
- **Hardware**: NVIDIA GPU with 16GB+ VRAM
- **Speed**: Optimized for CUDA
- **Setup**: Via transformers with trust_remote_code

### Inference Models for Self-Hosting

#### Qwen3-Coder (Recommended)
- **Variants**: 7B (~4GB), 14B (~8GB), 30B (~18GB)
- **Performance**: Excellent on code (leads open-source)
- **Context**: 256K tokens
- **Hardware Requirements**:
  - 7B: 8GB+ RAM
  - 14B: 16GB+ RAM
  - 30B: 32GB+ RAM (Mac M4 Max recommended)
- **Setup (Ollama)**: `ollama pull qwen3-coder:30b`
- **Setup (MLX - Apple Silicon)**: `pip install mlx mlx-lm` then `python -c "from mlx_lm import load; load('mlx-community/Qwen3-Coder-30B-A3B-Instruct-4bit')"`
- **Speed**: 100+ tokens/sec on M4 Max

#### MLX vs Ollama (Apple Silicon)
- **MLX**:
  - Direct Metal GPU integration
  - Optimized for Apple Silicon unified memory
  - Uses GPU, NOT Neural Engine (ANE is for smaller CoreML models)
  - Better memory efficiency
  - Setup: `pip install mlx mlx-lm`
- **Ollama**:
  - Also uses Metal GPU on Apple Silicon
  - Similar thermal profile to MLX
  - Easier multi-platform support
  - More straightforward model management
  - Setup: `brew install ollama`
- **Verdict**: Both are good options - MLX may have slight memory efficiency edge, Ollama is more portable

#### DeepSeek-Coder V3
- **Variants**: 16B (~9GB), 236B (multi-GPU)
- **Performance**: 85.6% HumanEval (highest open-source)
- **Context**: 16K tokens
- **Hardware Requirements**:
  - 16B: 16GB+ RAM or 12GB+ VRAM
  - 236B: 80GB+ VRAM (multi-GPU)
- **Setup**: `ollama pull deepseek-coder-v2:16b`

### Hardware-Specific Recommendations

#### Apple Silicon Macs

**M1/M2 (8-16GB RAM)**
- Embedding: nomic-embed-text
- Inference: Qwen3-Coder 7B
- Why: Optimized for unified memory, fits in RAM

**M3/M4 (16-32GB RAM)**
- Embedding: nomic-embed-text or BGE-M3
- Inference: Qwen3-Coder 14B
- Why: More headroom for larger models

**M4 Pro/Max (32GB+ RAM)**
- Embedding: BGE-M3
- Inference: Qwen3-Coder 30B
- Why: Can handle state-of-the-art local models

#### NVIDIA GPUs

**RTX 3080/4080 (8-16GB VRAM)**
- Embedding: BGE-large
- Inference: Qwen3-Coder 14B or DeepSeek-Coder 16B
- Why: Good balance for mid-range GPUs

**RTX 3090/4090 (24GB VRAM)**
- Embedding: NV-Embed-v2
- Inference: Qwen3-Coder 30B or DeepSeek-Coder 16B
- Why: Full utilization of high-end consumer GPUs

**A100/H100 (40GB+ VRAM)**
- Embedding: NV-Embed-v2
- Inference: DeepSeek-Coder V2 236B
- Why: Datacenter-grade, best local performance

#### CPU-Only (Budget/Privacy)

**16-32GB RAM**
- Embedding: BGE-small-en-v1.5
- Inference: Qwen3-Coder 7B (quantized)
- Why: CPU inference is slow, use smallest viable models
- Note: Expect 5-10x slower than GPU

---

## 📈 Benchmark References

**⚠️ BENCHMARKS CHANGE DAILY**: These links show current leaderboards. Rankings shift as new models release.

### Embedding Benchmarks
- **MTEB Leaderboard** (Primary): https://huggingface.co/spaces/mteb/leaderboard
- **NVIDIA Blog**: https://developer.nvidia.com/blog/nvidia-text-embedding-model-tops-mteb-leaderboard/
- **Nomic Analysis**: https://www.nomic.ai/blog/posts/evaluating-embedding-models

### Code Generation Benchmarks
- **HumanEval Stats**: https://llm-stats.com/benchmarks/humaneval
- **LiveBench**: https://livebench.ai/
- **Vellum LLM Leaderboard**: https://www.vellum.ai/llm-leaderboard
- **Aider Leaderboards**: https://aider.chat/docs/leaderboards/

---

## 🔄 Migration Guides

### Switch to Fully Local (Mac Example)

**1. Install Ollama**
```bash
brew install ollama
ollama serve  # Keep running
```

**2. Pull Models**
```bash
# Embedding
ollama pull nomic-embed-text

# Inference (choose based on RAM)
ollama pull qwen3-coder:7b   # 8-16GB
ollama pull qwen3-coder:14b  # 16-32GB
ollama pull qwen3-coder:30b  # 32GB+
```

**3. Update .env**
```bash
# Generation
OLLAMA_URL=http://127.0.0.1:11434/api
GEN_MODEL=qwen3-coder:30b

# Embeddings (optional, uses Ollama)
EMBEDDING_TYPE=local  # Falls back to Ollama/local models
```

**4. Re-index**
```bash
REPO=repo1 python index_repo.py
REPO=repo2 python index_repo.py
```

### Switch to Budget Cloud (Gemini)

**1. Get API Key**
- Visit: https://makersuite.google.com/app/apikey
- Create key

**2. Update .env**
```bash
GOOGLE_API_KEY=your_key_here
EMBEDDING_TYPE=gemini  # If implementing Gemini embeddings
GEN_MODEL=gemini-2.5-flash
```

**3. Update Code** (if not already supported)
See implementation examples in the code - Gemini support may need custom integration.


---


## 🎯 Final Recommendations by Scenario

### Startup/Prototype (Minimize Cost)
- **Embedding**: Google Gemini (free tier)
- **Inference**: Gemini 2.5 Flash
- **Why**: $3-10/month for moderate usage
- **When to Switch**: When free tier limits hit or need better quality

### Production (Balance Cost/Quality)
- **Embedding**: OpenAI text-embedding-3-large
- **Inference**: GPT-4o mini or Gemini 2.5 Flash
- **Why**: Proven reliability, good performance
- **Cost**: $50-200/month depending on scale

### Enterprise (Best Quality, On-Prem)
- **Embedding**: NV-Embed-v2 or BGE-M3
- **Inference**: Qwen3-Coder 30B or DeepSeek-Coder V2
- **Why**: Complete data control, zero API costs
- **Cost**: Hardware only ($1.4K-$3K Mac or GPU server)

### Privacy-Critical (Airgapped)
- **Embedding**: BGE-M3 (multilingual)
- **Inference**: Qwen3-Coder 14B
- **Why**: Fully offline, no external APIs
- **Cost**: Hardware only, works on M-series Mac or mid-range PC

---

## 📚 Additional Resources

- **OpenAI Pricing**: https://platform.openai.com/pricing
- **Google AI Pricing**: https://ai.google.dev/pricing
- **Anthropic Pricing**: https://docs.anthropic.com/pricing
- **MTEB Leaderboard**: https://huggingface.co/spaces/mteb/leaderboard
- **HumanEval Benchmarks**: https://llm-stats.com/benchmarks/humaneval
- **Ollama Models**: https://ollama.com/library
- **Continue.dev Embedding Guide**: https://docs.continue.dev/customize/model-roles/embeddings

---

**Last Updated**: October 8, 2025  
**Next Review**: Check pricing/benchmarks before implementing - they change daily!
