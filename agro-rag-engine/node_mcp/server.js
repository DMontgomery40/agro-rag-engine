import express from 'express';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 8014;
const RAG_API_URL = process.env.RAG_API_URL || 'http://127.0.0.1:8012';

app.get('/health', (req, res) => {
  res.json({ status: 'ok', proxy: true, target: RAG_API_URL });
});

// JSON answer proxy
app.get('/mcp/answer', async (req, res) => {
  try {
    const { q, repo, token } = req.query;
    const u = new URL('/answer', RAG_API_URL);
    if (q) u.searchParams.set('q', q);
    if (repo) u.searchParams.set('repo', repo);
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const r = await fetch(u.toString(), { headers });
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// JSON search proxy
app.get('/mcp/search', async (req, res) => {
  try {
    const { q, repo, top_k, token } = req.query;
    const u = new URL('/search', RAG_API_URL);
    if (q) u.searchParams.set('q', q);
    if (repo) u.searchParams.set('repo', repo);
    if (top_k) u.searchParams.set('top_k', String(top_k));
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const r = await fetch(u.toString(), { headers });
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// SSE proxy for streaming answer
app.get('/mcp/answer_stream', async (req, res) => {
  try {
    const { q, repo, token } = req.query;
    const u = new URL('/answer_stream', RAG_API_URL);
    if (q) u.searchParams.set('q', q);
    if (repo) u.searchParams.set('repo', repo);
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const r = await fetch(u.toString(), { headers });
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');

    if (!r.ok || !r.body) {
      res.write(`data: [ERROR] upstream ${r.status}\n\n`);
      return res.end();
    }

    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value));
      // flush
    }
    res.end();
  } catch (e) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.write(`data: [ERROR] ${String(e)}\n\n`);
    res.end();
  }
});

// Netlify deploy proxy (calls Python HTTP MCP on 8013)
app.get('/mcp/netlify_deploy', async (req, res) => {
  try {
    const { domain, token } = req.query;
    const MCP_HTTP_URL = process.env.MCP_HTTP_URL || 'http://127.0.0.1:8013';
    const u = new URL('/mcp/tools/call', MCP_HTTP_URL);
    const headers = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
    const body = JSON.stringify({
      name: 'netlify_deploy',
      arguments: { domain: domain || 'both' }
    });
    const r = await fetch(u.toString(), { method: 'POST', headers, body });
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Web get proxy (calls Python HTTP MCP on 8013)
app.get('/mcp/web_get', async (req, res) => {
  try {
    const { url, max_bytes, token } = req.query;
    const MCP_HTTP_URL = process.env.MCP_HTTP_URL || 'http://127.0.0.1:8013';
    const u = new URL('/mcp/tools/call', MCP_HTTP_URL);
    const headers = token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
    const body = JSON.stringify({
      name: 'web_get',
      arguments: { url, max_bytes: max_bytes ? parseInt(max_bytes) : 20000 }
    });
    const r = await fetch(u.toString(), { method: 'POST', headers, body });
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`Node proxy listening on :${PORT}, targeting ${RAG_API_URL}`);
});

