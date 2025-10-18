#!/usr/bin/env python3
"""
Complete, transparent comparison:
- Qwen 3 vs OpenAI gpt-4o
- Actual MCP tool schema overhead
- Real latency measurements
- Quality comparison
"""
import sys
import os
import json
import time
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, ROOT_DIR)

try:
    import tiktoken
    enc = tiktoken.encoding_for_model("gpt-4o")
    def count_tokens(text): return len(enc.encode(text))
except:
    def count_tokens(text): return len(text) // 4

print("=" * 80)
print("COMPLETE MODEL COMPARISON - TRANSPARENT MEASUREMENTS")
print("=" * 80)

# Test query
question = "How are fax jobs created and dispatched"
repo = "project"

print(f"\nTest query: '{question}'")
print(f"Repo: {repo}\n")

# ==================================================================
# 1. MEASURE MCP TOOL SCHEMA OVERHEAD (sent on EVERY request)
# ==================================================================
print("1. MCP Tool Schema Overhead")
print("-" * 80)

from server.mcp.server import MCPServer
server = MCPServer()
tools_req = {'jsonrpc': '2.0', 'id': 1, 'method': 'tools/list', 'params': {}}
tools_resp = server.handle_request(tools_req)
tools_json = json.dumps(tools_resp['result']['tools'])
schema_tokens = count_tokens(tools_json)

print(f"Tool schemas (sent with EVERY request): {schema_tokens:,} tokens")
print(f"Schema size: {len(tools_json):,} bytes\n")

# ==================================================================
# 2. MCP SEARCH RESPONSE SIZE
# ==================================================================
print("2. MCP Search Response")
print("-" * 80)

search_req = {
    'jsonrpc': '2.0',
    'id': 1,
    'method': 'tools/call',
    'params': {
        'name': 'rag_search',
        'arguments': {'repo': repo, 'question': question, 'top_k': 10}
    }
}

start = time.time()
search_resp = server.handle_request(search_req)
search_latency = time.time() - start

mcp_response = search_resp['result']['content'][0]['text']
response_tokens = count_tokens(mcp_response)
total_mcp_tokens = schema_tokens + response_tokens

print(f"Response tokens: {response_tokens:,}")
print(f"Total MCP tokens: {total_mcp_tokens:,} ({schema_tokens} schema + {response_tokens} response)")
print(f"Search latency: {search_latency:.2f}s\n")

# ==================================================================
# 3. QWEN 3 GENERATION
# ==================================================================
print("3. Qwen 3 Generation (Local)")
print("-" * 80)

os.environ["OLLAMA_URL"] = "http://127.0.0.1:11434/api"
os.environ["GEN_MODEL"] = "qwen3-coder:30b"

from server.env_model import generate_text

# Parse MCP response to get context
result_data = json.loads(mcp_response)
context = f"Retrieved {result_data['count']} code locations:\n"
for r in result_data['results'][:5]:
    context += f"- {r['file_path']}:{r['start_line']}-{r['end_line']} (score: {r['rerank_score']:.3f})\n"

prompt = f"{context}\n\nQuestion: {question}\nAnswer:"

start = time.time()
qwen_answer, _ = generate_text(prompt, model="qwen3-coder:30b")
qwen_latency = time.time() - start

qwen_output_tokens = count_tokens(qwen_answer)
qwen_total_tokens = total_mcp_tokens + qwen_output_tokens

print(f"Answer length: {len(qwen_answer)} chars")
print(f"Output tokens: {qwen_output_tokens:,}")
print(f"Total tokens (MCP + generation): {qwen_total_tokens:,}")
print(f"Generation latency: {qwen_latency:.2f}s")
print(f"Cost: $0.00 (local)")
print(f"\nAnswer preview: {qwen_answer[:200]}...\n")

# ==================================================================
# 4. OPENAI GPT-4O GENERATION
# ==================================================================
print("4. OpenAI gpt-4o Generation (API)")
print("-" * 80)

# Use OpenAI for generation
from openai import OpenAI
client = OpenAI()

start = time.time()
try:
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=500
    )
    openai_answer = response.choices[0].message.content
    openai_latency = time.time() - start
    
    openai_output_tokens = count_tokens(openai_answer)
    openai_total_tokens = total_mcp_tokens + openai_output_tokens
    
    # gpt-4o pricing (as of Oct 2025): $2.50/1M input, $10/1M output
    input_cost = total_mcp_tokens * (2.50 / 1_000_000)
    output_cost = openai_output_tokens * (10.00 / 1_000_000)
    total_cost = input_cost + output_cost
    
    print(f"Answer length: {len(openai_answer)} chars")
    print(f"Output tokens: {openai_output_tokens:,}")
    print(f"Total tokens (MCP + generation): {openai_total_tokens:,}")
    print(f"Generation latency: {openai_latency:.2f}s")
    print(f"Cost: ${total_cost:.6f} (${input_cost:.6f} input + ${output_cost:.6f} output)")
    print(f"\nAnswer preview: {openai_answer[:200]}...\n")
except Exception as e:
    print(f"ERROR: {e}\n")
    openai_answer = None

# ==================================================================
# 5. COMPARISON TABLE
# ==================================================================
print("=" * 80)
print("SUMMARY COMPARISON")
print("=" * 80)

print("\nTOKEN BREAKDOWN:")
print(f"  MCP tool schemas:     {schema_tokens:,} tokens (sent on EVERY request)")
print(f"  MCP search response:  {response_tokens:,} tokens")
print(f"  Qwen 3 output:        {qwen_output_tokens:,} tokens")
if openai_answer:
    print(f"  gpt-4o output:        {openai_output_tokens:,} tokens")

print(f"\nTOTAL TOKENS:")
print(f"  Qwen 3:   {qwen_total_tokens:,} tokens")
if openai_answer:
    print(f"  gpt-4o:   {openai_total_tokens:,} tokens")

print(f"\nLATENCY:")
print(f"  MCP search:       {search_latency:.2f}s")
print(f"  Qwen 3 generate:  {qwen_latency:.2f}s")
if openai_answer:
    print(f"  gpt-4o generate:  {openai_latency:.2f}s")

print(f"\nCOST PER QUERY:")
print(f"  Qwen 3:   $0.00 (local)")
if openai_answer:
    print(f"  gpt-4o:   ${total_cost:.6f}")

print(f"\nANSWER QUALITY:")
print(f"  Qwen 3:   {len(qwen_answer)} chars - {qwen_answer[:100]}...")
if openai_answer:
    print(f"  gpt-4o:   {len(openai_answer)} chars - {openai_answer[:100]}...")

print("\n" + "=" * 80)
print(f"SAVED TO: /tmp/full_comparison_results.json")
print("=" * 80)

# Save results
results = {
    "query": question,
    "repo": repo,
    "mcp": {
        "schema_tokens": schema_tokens,
        "response_tokens": response_tokens,
        "total_tokens": total_mcp_tokens,
        "latency_s": search_latency
    },
    "qwen3": {
        "output_tokens": qwen_output_tokens,
        "total_tokens": qwen_total_tokens,
        "latency_s": qwen_latency,
        "cost_usd": 0.0,
        "answer": qwen_answer
    }
}

if openai_answer:
    results["gpt4o"] = {
        "output_tokens": openai_output_tokens,
        "total_tokens": openai_total_tokens,
        "latency_s": openai_latency,
        "cost_usd": total_cost,
        "answer": openai_answer
    }

with open('/tmp/full_comparison_results.json', 'w') as f:
    json.dump(results, f, indent=2)

print("\nDone!")
