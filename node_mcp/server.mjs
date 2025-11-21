#!/usr/bin/env node

import { createServer } from "node:http";

const PORT = parseInt(process.env.PORT || "8014", 10);
const RAG_API_URL = process.env.RAG_API_URL || "http://127.0.0.1:8012";

const httpServer = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === "GET" && req.url?.startsWith("/health")) {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ status: "ok", server: "agro-bridge" }));
    return;
  }

  if (req.method === "POST" && req.url === "/mcp") {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const request = JSON.parse(body);
        let response;

        if (request.method === "tools/list") {
          response = { 
            jsonrpc: "2.0", 
            id: request.id, 
            result: { 
              tools: [
                {
                  name: "answer",
                  description: "Get RAG answer",
                  inputSchema: {
                    type: "object",
                    properties: {
                      q: { type: "string" },
                      repo: { type: "string" }
                    },
                    required: ["q"]
                  }
                }
              ]
            }
          };
        } else if (request.method === "tools/call") {
          const { name, arguments: args } = request.params;
          
          if (name === "answer") {
            const { q, repo = "agro" } = args;
            const url = `${RAG_API_URL}/answer?q=${encodeURIComponent(q)}&repo=${encodeURIComponent(repo)}`;
            
            try {
              const ragResponse = await fetch(url, { 
                signal: AbortSignal.timeout(10000) // 10 second timeout
              });
              const ragData = await ragResponse.json();
              
              response = { 
                jsonrpc: "2.0", 
                id: request.id, 
                result: {
                  content: [{ type: "text", text: JSON.stringify(ragData, null, 2) }]
                }
              };
            } catch (fetchError) {
              response = { 
                jsonrpc: "2.0", 
                id: request.id, 
                error: { code: -32603, message: `RAG API error: ${fetchError.message}` } 
              };
            }
          } else {
            response = { 
              jsonrpc: "2.0", 
              id: request.id, 
              error: { code: -32601, message: `Unknown tool: ${name}` } 
            };
          }
        } else {
          response = { 
            jsonrpc: "2.0", 
            id: request.id, 
            error: { code: -32601, message: "Method not found" } 
          };
        }

        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(response));
      } catch (error) {
        res.writeHead(500, { "content-type": "application/json" });
        res.end(JSON.stringify({ 
          jsonrpc: "2.0", 
          id: null, 
          error: { code: -32603, message: error.message } 
        }));
      }
    });
    
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`MCP bridge listening on http://0.0.0.0:${PORT}/mcp`);
});