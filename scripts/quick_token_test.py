#!/usr/bin/env python3
"""Quick token test for docs - measure actual usage"""
import os
os.environ["OLLAMA_URL"] = "http://127.0.0.1:11434/api"
os.environ["GEN_MODEL"] = "qwen3-coder:30b"

import sys
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, ROOT_DIR)

try:
    import tiktoken
    enc = tiktoken.encoding_for_model("gpt-4o")
    def count_tokens(text): return len(enc.encode(text))
except:
    def count_tokens(text): return len(text) // 4

# Test 1: Claude Alone (read full files)
from pathlib import Path
question = "How are fax jobs created and dispatched"
keywords = ["fax", "jobs", "created", "dispatched"]
repo_path = os.getenv('project_PATH', '/abs/path/to/project')

full_content = ""
for py_file in list(Path(repo_path).rglob('*.py'))[:10]:
    try:
        content = py_file.read_text(errors='ignore')
        if any(kw in content.lower() for kw in keywords):
            full_content += f"\n{'='*70}\n{content}\n"
    except:
        pass

tokens_claude_alone = count_tokens(full_content)
print(f"1. Claude Alone: {tokens_claude_alone:,} tokens")

# Test 2: MCP metadata only (simulate what Claude Code gets)
mcp_response = """{"results": [
  {"file_path": "server.py", "start_line": 120, "end_line": 145, "score": 0.89},
  {"file_path": "tasks.py", "start_line": 67, "end_line": 89, "score": 0.85},
  {"file_path": "models.py", "start_line": 234, "end_line": 267, "score": 0.78}
], "count": 3}"""

# Tool schema (sent with every request)
tool_schema = """{"tools": [{"name": "rag_search", "description": "Search codebase", "inputSchema": {...}}]}"""

tokens_mcp = count_tokens(mcp_response + tool_schema)
print(f"2. Claude + RAG via MCP: {tokens_mcp:,} tokens")

# Calculate savings
saved = tokens_claude_alone - tokens_mcp
pct = (saved / tokens_claude_alone * 100) if tokens_claude_alone > 0 else 0
reduction = tokens_claude_alone / tokens_mcp if tokens_mcp > 0 else 0

print(f"\nSavings: {saved:,} tokens ({pct:.1f}%)")
print(f"Reduction: {reduction:.1f}x")

# Cost (gpt-4o: $2.50/1M input)
cost_alone = tokens_claude_alone * (2.50 / 1_000_000)
cost_mcp = tokens_mcp * (2.50 / 1_000_000)
cost_saved = cost_alone - cost_mcp

print(f"\nPer query: ${cost_saved:.6f} saved")
print(f"Per 100 queries: ${cost_saved * 100:.2f} saved")
print(f"Per month (100/day): ${cost_saved * 3000:.2f} saved")
