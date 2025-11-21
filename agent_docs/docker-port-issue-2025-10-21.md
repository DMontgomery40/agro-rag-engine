# Docker Port Mapping Issue - Root Cause Analysis

**Date**: 2025-10-21
**Environment**: macOS (Darwin 25.0.0) with Colima
**Affected Port**: 8012 (agro-api container)

## Executive Summary

Docker container `agro-api` was running with correct port mapping configuration (`0.0.0.0:8012->8012/tcp`), and uvicorn was successfully listening inside the container. However, connections from the host to `localhost:8012` were refused. Root cause was Colima's SSH port forwarder failing to dynamically detect and forward the newly-started container's port.

## Symptoms

1. Container running: `docker ps` showed `agro-api` with ports `0.0.0.0:8012->8012/tcp`
2. Container logs: uvicorn successfully started on `http://0.0.0.0:8012`
3. Inside container: API responded correctly (`curl http://localhost:8012/health` worked)
4. From host: `nc -zv localhost 8012` returned "Connection refused"
5. No process listening on host port 8012: `lsof -iTCP:8012` returned nothing

## Root Cause Analysis

### Hypotheses Investigated (Ranked by Probability)

#### 1. **Colima SSH Port Forwarder Stale State** (CONFIRMED - ROOT CAUSE)
- **Probability**: HIGH
- **Evidence**:
  - `ps aux | grep ssh` showed SSH mux process (PID 83068) forwarding ports 9090, 4440, 9093 but NOT 8012
  - `lsof -iTCP:8012 -sTCP:LISTEN` returned no results (no process listening on host)
  - `docker inspect agro-api` confirmed correct port binding configuration
  - API worked perfectly from inside Colima VM: `colima ssh -- curl http://localhost:8012/health`
  - After `colima restart`, new SSH process (PID 85484) properly forwarded port 8012

**Why this happened**:
- Colima uses SSH multiplexing for port forwarding from the Lima VM to the host
- When a container starts AFTER Colima has already initialized, the SSH port forwarder may not dynamically detect the new port binding
- A rogue host process (PID 46437) was previously occupying port 8012, which was killed before the container restart
- Restarting the container alone doesn't trigger Colima to refresh its port forwarding rules
- Only a full Colima restart re-scans all Docker port bindings and sets up SSH tunnels

#### 2. **Docker Port Binding Conflict** (RULED OUT)
- **Probability**: MEDIUM (initially suspected)
- **Evidence**:
  - Previously a Python process (PID 46437) was listening on port 8012
  - This was killed before investigation
  - `docker port agro-api` confirmed correct binding
  - `netstat -an | grep 8012` showed nothing on host (ruling out conflict)

#### 3. **Container Networking Misconfiguration** (RULED OUT)
- **Probability**: LOW
- **Evidence**:
  - docker-compose.services.yml correctly specified `ports: ["8012:8012"]`
  - `docker inspect` showed correct NetworkSettings.Ports configuration
  - Container was on correct network (agro-rag-engine_default)

#### 4. **Uvicorn Binding Issue** (RULED OUT)
- **Probability**: LOW
- **Evidence**:
  - Container logs showed: `INFO: Uvicorn running on http://0.0.0.0:8012`
  - API responded correctly from inside container
  - API responded from inside Colima VM

## Solution Implemented

```bash
# Restart Colima to reinitialize port forwarding
colima restart

# Wait for Colima to fully start (automatic)

# Restart containers
docker compose -f docker-compose.services.yml --profile api up -d

# Verify port forwarding
nc -zv localhost 8012
curl http://localhost:8012/health
```

**Result**: Port 8012 now properly forwarded via SSH (PID 85484), API accessible from host.

## Validation Tests

1. **Port listening verification**:
   ```bash
   lsof -iTCP:8012 -sTCP:LISTEN -n -P
   # Expected: ssh process listening on *:8012
   ```

2. **Health endpoint test**:
   ```bash
   curl -s http://localhost:8012/health | jq
   # Expected: {"status":"healthy","graph_loaded":true,...}
   ```

3. **API functionality test**:
   ```bash
   curl -s "http://localhost:8012/search?q=test&repo=agro&top_k=1" | jq
   # Expected: Valid search results
   ```

4. **Container network test** (from inside VM):
   ```bash
   colima ssh -- curl http://localhost:8012/health
   # Expected: Valid JSON response
   ```

All tests passed after fix.

## Prevention Recommendations

### For This Project

1. **Add health check to docker-compose.services.yml**:
   ```yaml
   api:
     healthcheck:
       test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8012/health')"]
       interval: 10s
       timeout: 5s
       retries: 3
   ```

2. **Create startup verification script** (`scripts/verify-ports.sh`):
   ```bash
   #!/bin/bash
   # Verify all expected ports are accessible from host
   ports=(8012 6333 6379)
   for port in "${ports[@]}"; do
     if ! nc -zv localhost $port 2>&1 | grep -q succeeded; then
       echo "ERROR: Port $port not accessible from host"
       echo "This may be a Colima port forwarding issue. Try: colima restart"
       exit 1
     fi
   done
   echo "All ports accessible"
   ```

3. **Document Colima-specific behavior in README**:
   - Note that port forwarding requires Colima restart after first container start
   - Include troubleshooting section for "connection refused" issues

### General Best Practices

1. **When starting containers after Colima has been running**:
   - If new ports are exposed, restart Colima: `colima restart`
   - Or use `colima stop && colima start` for a clean state

2. **Alternative**: Switch to Docker Desktop for macOS (automatic port forwarding)

3. **Alternative**: Use host networking mode (not recommended for Docker Desktop compatibility):
   ```yaml
   network_mode: "host"  # Only works on Linux
   ```

4. **Monitoring**: Check port forwarding status regularly:
   ```bash
   # List all forwarded ports
   lsof -iTCP -sTCP:LISTEN -n -P | grep ssh

   # Compare with running containers
   docker ps --format "{{.Names}}: {{.Ports}}"
   ```

## Related Issues

- Colima issue tracker: Similar reports of port forwarding not updating dynamically
- Lima (underlying VM): SSH multiplexing doesn't auto-detect new port bindings
- Workaround: Always restart Colima when exposing new container ports

## Technical Details

### Colima Port Forwarding Architecture

```
Host macOS
  └─> SSH Client (multiplexed, PID varies)
      └─> SSH Tunnel: localhost:8012 -> 127.0.0.1:53211 (dynamic port to VM)
          └─> Lima VM (Ubuntu 24.04.2 LTS)
              └─> Docker Bridge Network
                  └─> Container agro-api:8012
                      └─> uvicorn on 0.0.0.0:8012
```

### Configuration Files Examined

- `/Users/davidmontgomery/agro-rag-engine/docker-compose.services.yml`: Correct port mapping `"8012:8012"`
- `~/.colima/default/colima.yaml`: Using `portForwarder: ssh` (default)

### Process Tree During Failure

```
ssh (PID 83068) - SSH mux master
├─> Forwarding 9090 (infrastructure ports)
├─> Forwarding 4440
├─> Forwarding 9093
├─> Forwarding 6333 (Qdrant)
├─> Forwarding 6379 (Redis)
└─> NOT forwarding 8012 (missing!)
```

### Process Tree After Fix

```
ssh (PID 85484) - SSH mux master (new instance)
├─> Forwarding 8012 (agro-api) ✓
├─> Forwarding 9090
├─> Forwarding 4440
└─> ... (all other infrastructure ports)
```

## Conclusion

This was a Colima-specific issue where the SSH port forwarder maintains a static set of forwarded ports and doesn't dynamically detect new containers. The solution is simple: restart Colima whenever new ports are exposed. This is a known limitation of Colima's SSH-based port forwarding mechanism.

For production environments or to avoid this issue, consider:
1. Using Docker Desktop for Mac (automatic port forwarding)
2. Pre-defining all required ports before starting Colima
3. Creating a startup script that verifies all expected ports are accessible
