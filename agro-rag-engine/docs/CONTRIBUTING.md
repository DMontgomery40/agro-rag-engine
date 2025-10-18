# Contributing Performance Benchmarks

**Help make this guide better!** We need benchmarks from different models, hardware, and Claude/Codex configurations.

## What We're Testing

The main comparison is:
- **Claude Code/Codex alone** (reading full files) vs **Claude Code/Codex + RAG** (metadata only)

Secondary comparisons:
- Different generation models (Qwen, gpt-4o, etc.)
- Different hardware (M-series Mac, NVIDIA GPU, etc.)
- Different Claude tiers (Free, Pro, Team)

## How to Run Benchmarks

### 1. Test Claude Code/Codex Alone (No RAG)

Just use Claude Code normally on a query. Count tokens sent:

```bash
# Ask Claude Code: "How are fax jobs created and dispatched?"
# Use Read tool to check how many files it reads
# Use tiktoken to count total tokens sent
```

### 2. Test Claude Code/Codex + RAG

```bash
cd /path/to/rag-service/scripts
python measure_overhead.py  # MCP schema overhead
python test_qwen_generation.py  # or your model
python test_openai_generation.py  # if using API
```

### 3. Document Your Setup

For each test, provide:
- **Date tested** (YYYY-MM-DD)
- **Claude model** (Sonnet 4.5, Opus 3.5, etc.)
- **Claude subscription** ($20/mo Pro, $30/mo Team, Free, etc.)
- **Hardware** (M-series Mac 32GB, NVIDIA RTX 4090, etc.)
- **Generation model** (qwen3-coder:30b, gpt-4o, etc.)
- **Test query used** (ideally: "How are fax jobs created and dispatched?")

## Data to Collect

### Primary Comparison (Claude Code/Codex Alone vs + RAG)

| Metric | How to Measure |
|--------|----------------|
| **Tokens sent (no RAG)** | Count all files Claude reads × avg file size |
| **Tokens sent (+ RAG)** | MCP schema (641) + response (~440) + generation output |
| **Latency (no RAG)** | Time from query to answer |
| **Latency (+ RAG)** | Search time + generation time |
| **Answer quality** | Subjective: excellent/good/fair/poor |

### Secondary (Generation Model Comparison)

Only if testing RAG path:
- Output tokens (generation only)
- Cost per query (if API)
- Latency (generation only)

## Template for Submission

```markdown
### Your Test Results (Date: YYYY-MM-DD)

**Tester:** @your-github-handle
**Claude model:** Sonnet 4.5 / Opus 3.5 / Haiku 3.0
**Claude subscription:** $200/mo Pro / $30/mo Team / Free
**Hardware:** M-series Mac, 32GB RAM / NVIDIA RTX 4090, 64GB RAM / etc.
**Test query:** "How are fax jobs created and dispatched?" (or your query)

#### Primary Comparison: Claude Code Alone vs + RAG

| Approach | Tokens | Latency | Cost/Query | Quality |
|----------|--------|---------|------------|---------|
| **Claude Code alone** | X,XXX | X.Xs | $X.XX | excellent/good |
| **Claude Code + RAG** | X,XXX | X.Xs | $X.XX | excellent/good |
| **Savings** | X,XXX (XX%) | -X.Xs | $X.XX (XX%) | — |

#### Generation Model (if testing RAG)

**Model:** qwen3-coder:30b / gpt-4o / etc.
**Output tokens:** XXX
**Generation latency:** X.XXs
**Cost:** $X.XXXXXX or $0 (local)

#### Notes

Any special config, observations, etc.
```

## How to Submit

1. **Via PR:**
   - Add your results to the "Community Benchmarks" section in PERFORMANCE_AND_COST.md
   - Include the template above with your data

2. **Via GitHub Issue:**
   - Open an issue titled "Benchmark: [Your Model] on [Your Hardware]"
   - Paste the completed template

3. **Via Discussion:**
   - Post in Discussions → Benchmarks category

## Methodology Notes

### Measuring "Claude Code Alone" Tokens

**Option 1: Read tool counts**
- Ask your question in Claude Code
- Count how many Read tool calls it makes
- Average Python file: ~500 lines = ~2000 tokens
- Example: 10 files × 2000 tokens = 20,000 tokens

**Option 2: Export conversation**
- Use Claude Code's export feature
- Count tokens with tiktoken

### Measuring "Claude Code + RAG" Tokens

**Always includes:**
- MCP tool schemas: 641 tokens (sent on every request)
- RAG search response: ~440 tokens (10 results)
- Generation output: varies (60-150 tokens typical)

**Total:** ~1,081 + generation tokens

### Quality Assessment

Rate answer quality:
- **Excellent:** Complete, accurate, cites correct files/lines
- **Good:** Mostly correct, minor omissions
- **Fair:** Partially correct, some errors
- **Poor:** Incorrect or missing key information

## What Makes a Good Benchmark

✅ **Good:**
- Uses standard test query (comparable)
- Documents exact setup
- Measures end-to-end (not just generation)
- Notes Claude subscription tier

❌ **Avoid:**
- Cherry-picked queries
- Missing hardware specs
- Unclear which Claude model was used
- No baseline comparison

## Questions?

- Open a GitHub Discussion
- Tag @davidmontgomery in issues
- See existing benchmarks in PERFORMANCE_AND_COST.md for examples

---

**Thank you for contributing!** Every benchmark helps the community make better decisions about RAG vs no-RAG.
