#!/usr/bin/env python3
"""Measure MCP tool schema overhead - the part sent on EVERY request"""
import sys, os
import json
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, ROOT_DIR)

try:
    import tiktoken
    enc = tiktoken.encoding_for_model("gpt-4o")
    def count_tokens(text): return len(enc.encode(text))
except:
    def count_tokens(text): return len(text) // 4

# Get tool schemas
from server.mcp.server import MCPServer
server = MCPServer()
tools_req = {'jsonrpc': '2.0', 'id': 1, 'method': 'tools/list', 'params': {}}
tools_resp = server.handle_request(tools_req)
tools_json = json.dumps(tools_resp['result']['tools'], indent=2)

schema_tokens = count_tokens(tools_json)

print("=" * 80)
print("MCP TOOL SCHEMA OVERHEAD (sent with EVERY Claude Code request)")
print("=" * 80)
print(f"Schema tokens: {schema_tokens:,}")
print(f"Schema size: {len(tools_json):,} bytes")
print(f"\nThis overhead is ADDED to every single request.")
print(f"Even if MCP response is small, you always pay for the tool schemas.\n")

# Show the actual schema
print("Tool schemas:")
for tool in tools_resp['result']['tools']:
    print(f"  - {tool['name']}: {len(json.dumps(tool)):,} bytes")

with open('/tmp/mcp_schema.json', 'w') as f:
    f.write(tools_json)
print(f"\nFull schema saved to: /tmp/mcp_schema.json")
