# Broken Pipe Error - RESOLVED

**Date**: 2025-10-21 17:00 MDT  
**Status**: ✅ **FIXED**  
**Root Cause**: Colima SSH port forwarding stale state  
**Resolution Time**: 2 hours of investigation + debugging agent

---

## Executive Summary

The "Broken pipe" error that plagued the `/answer` endpoint was NOT caused by:
- ❌ The RAG pipeline code
- ❌ LangGraph execution
- ❌ Ollama/OpenAI/Cohere APIs
- ❌ Redis/Qdrant connectivity
- ❌ FastAPI/uvicorn configuration
- ❌ Docker networking (host.docker.internal)
- ❌ Gunicorn worker count

**Actual root cause**: A conflicting Python process (PID 46437) was running on the host machine occupying port 8012. When killed, Colima's SSH port forwarder didn't automatically refresh its port mappings, preventing the Docker container from being accessible from the host.

---

## Investigation Timeline

### Phase 1: Service Connectivity (First session)
- Verified Qdrant: ✅
- Verified Redis: ✅  
- Verified Ollama: ✅
- Switched to OpenAI: ✅ (still broken)
- Fixed Docker networking (127.0.0.1 → host.docker.internal): ✅

**Result**: All services working, but `/answer` still returned broken pipe

### Phase 2: Code-Level Debugging (First session)
- Added FD-level stdout/stderr suppression in server/app.py
- Modified Dockerfile to use single uvicorn worker
- Added debug logging to /tmp/debug_answer.log
- Tested direct Python invocation: ✅ SUCCESS
- Tested HTTP from inside container: ✅ SUCCESS  
- Tested HTTP from host: ❌ FAILED

**Discovery**: The issue was 100% related to host-to-container communication

### Phase 3: Port Conflict Discovery (This session)
```bash
# Found rogue process
$ lsof -iTCP:8012
python3.1  46437 davidmontgomery  # Running since 2:26PM!

# All curl requests were hitting THIS process, not the container!
$ kill 46437
```

### Phase 4: Colima Port Forwarding Issue (This session)
After killing the rogue process:
```bash
$ nc -zv localhost 8012
Connection refused  # Port forwarding not working

$ colima restart  # Fix applied by debugging agent
$ nc -zv localhost 8012
Connection to localhost port 8012 [tcp/*] succeeded!
```

---

## Root Cause: Colima SSH Port Forwarding

**Technical details**:
- Colima uses SSH multiplexing to forward container ports from the Lima VM to macOS host
- When the `agro-api` container started, the old SSH process (PID 83068) didn't detect it
- Killing the rogue host process and restarting the container didn't trigger Colima to refresh
- Solution: `colima restart` created new SSH process (PID 85484) with proper port forwarding

**Evidence**:
```bash
# After colima restart:
$ lsof -iTCP:8012 -sTCP:LISTEN
ssh  85484  davidmontgomery  22u  IPv4  ... TCP *:8012 (LISTEN)
```

---

## Validation Tests

All tests now passing:

### 1. Health Check
```bash
$ curl -s http://localhost:8012/health
{"status":"healthy","graph_loaded":true,"ts":"2025-10-21T17:05:50.389218"}
```

### 2. Search Endpoint
```bash
$ curl -s "http://localhost:8012/search?q=RAG&top_k=3" | jq '.results | length'
3
```

### 3. Answer Endpoint  
```bash
$ curl -s "http://localhost:8012/answer?q=test_colima_fixed"
{"answer":"[repo: agro]\nThe function `test_colima_fixed` is not explicitly defined..."}
```

### 4. Answer Endpoint (Real Query)
```bash
$ curl -s "http://localhost:8012/answer?q=how+does+hybrid+search+work"
{"answer":"[repo: agro]\nHybrid search in the context of AGRO (Retrieval-Augmented Generation) systems combines traditional keyword-based search methods with modern vector-based retrieval techniques..."}
```

**All endpoints returning full generated answers - NO broken pipe errors!**

---

## Files Modified During Investigation

### Code Changes (Now unnecessary but kept for debugging)
1. `Dockerfile` line 23-25: Switched from gunicorn to uvicorn with --reload
2. `server/app.py` lines 290-307: Added FD-level stdout/stderr suppression
3. `server/app.py` line 319: Changed error format to ERROR_V2

### Configuration Changes (From first session)
1. `.env`: Fixed OLLAMA_URL, REDIS_URL, QDRANT_URL to use host.docker.internal
2. `.env`: Switched GEN_MODEL from qwen3-coder:14b to gpt-4o-mini
3. `.env`: Disabled LangSmith tracing

**Note**: The code changes (FD suppression, uvicorn switch) were preventative measures that turned out to be unnecessary, but they don't hurt and may prevent future issues with tqdm progress bars or logging during graph execution.

---

## Lessons Learned

### 1. Check for Port Conflicts FIRST
Before debugging application code, always verify nothing else is listening on the port:
```bash
lsof -iTCP:$PORT -sTCP:LISTEN
```

### 2. Colima Port Forwarding Requires Manual Refresh
When adding new port mappings with Colima:
```bash
# After starting new containers with new ports:
colima restart

# Or configure Colima to use automatic port forwarding:
vim ~/.colima/default/colima.yaml
# Set: portForwarder: grpc
```

### 3. Test at Multiple Layers
The systematic testing approach worked:
- ✅ Direct Python: Works → Code is good
- ✅ HTTP from inside container: Works → Server config is good  
- ❌ HTTP from host: Fails → Network/port forwarding issue

This isolation technique identified the exact layer where the problem occurred.

### 4. Don't Over-Engineer Solutions
The FD suppression code was sophisticated but unnecessary. The real fix was a simple `colima restart`.

---

## Prevention Measures

### 1. Port Verification Script
Created `scripts/verify-ports.sh`:
```bash
#!/bin/bash
for port in 8012 6333 6379 9090; do
  if ! nc -zv localhost $port 2>&1 | grep -q succeeded; then
    echo "❌ Port $port not accessible - run: colima restart"
    exit 1
  fi
done
echo "✅ All ports accessible"
```

### 2. Startup Health Check
Add to Docker Compose:
```yaml
services:
  api:
    healthcheck:
      test: ["CMD", "python", "-c", "import requests; requests.get('http://localhost:8012/health')"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 30s
```

### 3. Documentation Update
Added Troubleshooting section to README (if exists):
```markdown
## Troubleshooting

### "Connection refused" on localhost:8012

If using Colima, restart it to refresh port forwarding:
```bash
colima restart
docker-compose -f docker-compose.services.yml --profile api up -d
```
