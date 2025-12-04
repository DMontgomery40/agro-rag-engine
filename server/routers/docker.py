"""Docker API router with Python SDK + subprocess fallback.

Uses Python Docker SDK as primary method (auto-discovers socket across all platforms).
Falls back to subprocess with corrected HOME environment when SDK unavailable.

All config values come from agro_config.json via Pydantic (DockerConfig model).
"""

import json as _json
import logging
import os
import shutil
import subprocess
from typing import Any, Dict, Optional

import docker
from docker.errors import DockerException
from fastapi import APIRouter

from common.paths import repo_root
from server.services.config_registry import get_config_registry

router = APIRouter()
logger = logging.getLogger("agro.docker")

# ============================================================================
# Docker SDK Client (Primary Method)
# ============================================================================

_sdk_client: Optional[docker.DockerClient] = None
_sdk_available: Optional[bool] = None


def _get_sdk_client() -> Optional[docker.DockerClient]:
    """Get Docker SDK client (lazy-loaded, cached).

    Uses _discover_docker_host() to find socket. Priority:
    1. DOCKER_HOST from agro_config.json (Pydantic - user-configurable via GUI)
    2. Docker context from ~/.docker/config.json (auto-detect Colima/Rancher/etc)
    3. Common socket locations (/var/run/docker.sock, ~/.colima/default/docker.sock)

    Falls back to subprocess if SDK unavailable.
    """
    global _sdk_client, _sdk_available

    if _sdk_available is False:
        return None

    try:
        if _sdk_client is None:
            # Discover docker host - checks Pydantic config first, then auto-detect
            docker_host = _discover_docker_host()
            if docker_host:
                _sdk_client = docker.DockerClient(base_url=docker_host)
                logger.debug(f"Docker SDK client initialized with host={docker_host}")
            else:
                # No socket found anywhere - SDK will likely fail, subprocess fallback will handle it
                logger.warning("No Docker socket found - SDK may fail, using subprocess fallback")
                _sdk_available = False
                return None

            # Verify connection works
            _sdk_client.ping()
            _sdk_available = True
        return _sdk_client
    except DockerException as e:
        logger.warning(f"Docker SDK unavailable: {e}")
        _sdk_available = False
        _sdk_client = None
        return None
    except Exception as e:
        logger.warning(f"Docker SDK error: {e}")
        _sdk_available = False
        _sdk_client = None
        return None


def _reset_sdk_client() -> None:
    """Reset SDK client (for testing or reconnection)."""
    global _sdk_client, _sdk_available
    _sdk_client = None
    _sdk_available = None


# ============================================================================
# Subprocess Fallback (when SDK unavailable)
# ============================================================================

# Find docker binary - check common locations for macOS
_DOCKER_BIN = shutil.which("docker") or (
    "/opt/homebrew/bin/docker" if os.path.exists("/opt/homebrew/bin/docker") else
    "/usr/local/bin/docker" if os.path.exists("/usr/local/bin/docker") else
    "docker"
)

# Build env for subprocess - use real HOME from pwd, not potentially corrupted os.environ
# This is needed because .env may have HOME=/root for Docker containers
_SUBPROCESS_ENV = os.environ.copy()
try:
    import pwd
    _SUBPROCESS_ENV["HOME"] = pwd.getpwuid(os.getuid()).pw_dir
except Exception:
    pass  # Keep whatever HOME is set


def _subprocess_run(cmd_args: list, timeout: int = 10) -> subprocess.CompletedProcess:
    """Run docker command via subprocess with corrected environment."""
    return subprocess.run(
        [_DOCKER_BIN] + cmd_args,
        capture_output=True,
        text=True,
        timeout=timeout,
        env=_SUBPROCESS_ENV
    )


# ============================================================================
# Config Helper (reads from Pydantic model via registry)
# ============================================================================

def _get_docker_config() -> Dict[str, Any]:
    """Get Docker config values from registry (sourced from agro_config.json)."""
    registry = get_config_registry()
    return {
        "docker_host": registry.get("DOCKER_HOST", ""),
        "status_timeout": registry.get_int("DOCKER_STATUS_TIMEOUT", 5),
        "container_list_timeout": registry.get_int("DOCKER_CONTAINER_LIST_TIMEOUT", 10),
        "container_action_timeout": registry.get_int("DOCKER_CONTAINER_ACTION_TIMEOUT", 30),
        "infra_up_timeout": registry.get_int("DOCKER_INFRA_UP_TIMEOUT", 60),
        "infra_down_timeout": registry.get_int("DOCKER_INFRA_DOWN_TIMEOUT", 30),
        "logs_tail": registry.get_int("DOCKER_LOGS_TAIL", 100),
        "logs_timestamps": registry.get_bool("DOCKER_LOGS_TIMESTAMPS", True),
    }


def _discover_docker_host() -> Optional[str]:
    """Discover Docker socket location from config or auto-detect.

    Priority:
    1. DOCKER_HOST from agro_config.json (user-configured via Pydantic)
    2. Docker context from ~/.docker/config.json (using corrected HOME)
    3. Common socket locations for different platforms
    """
    # Check Pydantic config first (source of truth)
    cfg = _get_docker_config()
    docker_host = cfg.get("docker_host", "")
    if docker_host:
        return docker_host

    # Use corrected HOME for config file lookup
    real_home = _SUBPROCESS_ENV.get("HOME", os.path.expanduser("~"))
    docker_config_path = os.path.join(real_home, ".docker", "config.json")

    # Check docker context from config
    if os.path.exists(docker_config_path):
        try:
            with open(docker_config_path) as f:
                config = _json.load(f)
            context = config.get("currentContext", "")

            # Map known contexts to socket paths
            if context == "colima":
                colima_sock = os.path.join(real_home, ".colima", "default", "docker.sock")
                if os.path.exists(colima_sock):
                    return f"unix://{colima_sock}"
            elif context == "rancher-desktop":
                rd_sock = os.path.join(real_home, ".rd", "docker.sock")
                if os.path.exists(rd_sock):
                    return f"unix://{rd_sock}"
            # Docker Desktop context typically uses default socket
        except Exception as e:
            logger.debug(f"Failed to read docker config: {e}")

    # Check common socket locations
    common_sockets = [
        "/var/run/docker.sock",  # Linux native, Docker Desktop
        os.path.join(real_home, ".colima", "default", "docker.sock"),  # Colima
        os.path.join(real_home, ".rd", "docker.sock"),  # Rancher Desktop
    ]
    for sock in common_sockets:
        if os.path.exists(sock):
            return f"unix://{sock}"

    return None


# ============================================================================
# API Endpoints
# ============================================================================

@router.get("/api/docker/debug")
def docker_debug() -> Dict[str, Any]:
    """Debug endpoint to check Docker connectivity and configuration."""
    home = os.environ.get("HOME", "")
    real_home = _SUBPROCESS_ENV.get("HOME", "")
    docker_config = os.path.join(real_home, ".docker", "config.json")

    # Check SDK availability
    sdk_client = _get_sdk_client()
    sdk_info = None
    if sdk_client:
        try:
            sdk_info = {
                "version": sdk_client.version().get("Version"),
                "api_version": sdk_client.version().get("ApiVersion"),
            }
        except Exception as e:
            sdk_info = {"error": str(e)}

    # Check subprocess fallback
    subprocess_info = None
    try:
        result = _subprocess_run(["info", "--format", "{{.ServerVersion}}"], timeout=5)
        subprocess_info = {
            "returncode": result.returncode,
            "stdout": result.stdout.strip(),
            "stderr": result.stderr.strip() if result.stderr else None,
        }
    except Exception as e:
        subprocess_info = {"error": str(e)}

    return {
        "docker_bin": _DOCKER_BIN,
        "bin_exists": os.path.exists(_DOCKER_BIN),
        "which_result": shutil.which("docker"),
        "env_home": home,
        "corrected_home": real_home,
        "docker_config_exists": os.path.exists(docker_config),
        "sdk_available": _sdk_available,
        "sdk_info": sdk_info,
        "subprocess_info": subprocess_info,
    }


@router.get("/api/docker/status")
def docker_status() -> Dict[str, Any]:
    """Get Docker daemon status and running container count."""
    cfg = _get_docker_config()

    # Try SDK first
    client = _get_sdk_client()
    if client:
        try:
            info = client.info()
            running = client.containers.list()
            return {
                "running": True,
                "runtime": f"Docker {info.get('ServerVersion', 'Unknown')}",
                "containers_count": len(running),
            }
        except DockerException as e:
            logger.debug(f"SDK status check failed: {e}")
            # Fall through to subprocess

    # Subprocess fallback
    try:
        result = _subprocess_run(
            ["info", "--format", "{{.ServerVersion}}"],
            timeout=cfg["status_timeout"]
        )
        if result.returncode == 0:
            count_result = _subprocess_run(["ps", "-q"], timeout=cfg["status_timeout"])
            container_count = len(
                [line for line in count_result.stdout.strip().split("\n") if line]
            )
            return {
                "running": True,
                "runtime": "Docker " + result.stdout.strip(),
                "containers_count": container_count,
            }
        return {"running": False, "runtime": "Unknown", "containers_count": 0}
    except Exception as e:
        return {
            "running": False,
            "runtime": "Unknown",
            "error": str(e),
            "containers_count": 0,
        }


@router.get("/api/docker/containers")
def docker_containers() -> Dict[str, Any]:
    """Get all containers (alias for /all)."""
    return docker_containers_all()


@router.get("/api/docker/containers/all")
def docker_containers_all() -> Dict[str, Any]:
    """Get all containers (running and stopped) with AGRO-managed detection."""
    cfg = _get_docker_config()

    # Try SDK first
    client = _get_sdk_client()
    if client:
        try:
            sdk_containers = client.containers.list(all=True)
            containers = []
            for c in sdk_containers:
                # Extract attributes
                attrs = c.attrs
                container_id = c.id
                name = c.name
                image = c.image.tags[0] if c.image.tags else str(c.image.id)[:12]
                state_raw = attrs.get("State", {}).get("Status", "unknown")
                state = state_raw.lower()
                status = c.status

                # Get ports
                ports_config = attrs.get("NetworkSettings", {}).get("Ports", {}) or {}
                ports_list = []
                for container_port, bindings in ports_config.items():
                    if bindings:
                        for binding in bindings:
                            host_port = binding.get("HostPort", "")
                            if host_port:
                                ports_list.append(f"{host_port}->{container_port}")
                    else:
                        ports_list.append(container_port)
                ports = ", ".join(ports_list)

                # Get labels for compose detection
                labels = c.labels or {}
                compose_project = labels.get("com.docker.compose.project", "")
                compose_service = labels.get("com.docker.compose.service", "")

                # Get timing info
                created_at = attrs.get("Created", "")

                # Determine if AGRO-managed
                name_lower = (name or "").lower()
                image_lower = (image or "").lower()
                compose_project_lower = compose_project.lower() if compose_project else ""
                compose_service_lower = compose_service.lower() if compose_service else ""

                agro_managed = (
                    compose_project_lower in {"agro", "agro-rag-engine", "rag-service"}
                    or compose_project_lower.startswith(("agro", "rag"))
                    or compose_service_lower in {
                        "api", "grafana", "prometheus", "loki", "promtail",
                        "alertmanager", "openvscode", "redis", "qdrant", "mcp-http", "mcp-node",
                    }
                    or name_lower.startswith((
                        "agro-", "rag-", "qdrant", "redis", "grafana",
                        "prometheus", "loki", "promtail", "alertmanager",
                    ))
                    or image_lower.startswith(("agro", "rag"))
                    or "agro" in image_lower
                )

                containers.append({
                    "id": container_id,
                    "short_id": container_id[:12],
                    "name": name,
                    "image": image,
                    "state": state,
                    "status": status,
                    "ports": ports,
                    "compose_project": compose_project or None,
                    "compose_service": compose_service or None,
                    "created_at": created_at,
                    "running_for": "",  # SDK doesn't provide this directly
                    "agro_managed": agro_managed,
                    "raw_state": state_raw,
                })

            return {"containers": containers}
        except DockerException as e:
            logger.debug(f"SDK containers list failed: {e}")
            # Fall through to subprocess

    # Subprocess fallback
    try:
        result = _subprocess_run(
            ["ps", "-a", "--format", "{{json .}}"],
            timeout=cfg["container_list_timeout"]
        )
        if result.returncode == 0:
            containers = []
            for line in result.stdout.strip().split("\n"):
                if not line:
                    continue
                try:
                    info = _json.loads(line)
                except Exception:
                    continue

                container_id = info.get("ID") or info.get("Id") or ""
                name = info.get("Names") or info.get("Name") or container_id
                image = info.get("Image") or ""
                state_raw = info.get("State") or ""
                state = state_raw.lower()
                status = info.get("Status") or state
                ports = info.get("Ports") or ""
                created_at = info.get("CreatedAt") or ""
                running_for = info.get("RunningFor") or ""

                labels_field = info.get("Labels") or ""
                labels: Dict[str, str] = {}
                for item in labels_field.split(","):
                    if "=" in item:
                        key, value = item.split("=", 1)
                        labels[key.strip()] = value.strip()

                compose_project = labels.get("com.docker.compose.project", "")
                compose_service = labels.get("com.docker.compose.service", "")

                name_lower = (name or "").lower()
                image_lower = (image or "").lower()
                compose_project_lower = compose_project.lower() if compose_project else ""
                compose_service_lower = compose_service.lower() if compose_service else ""

                agro_managed = (
                    compose_project_lower in {"agro", "agro-rag-engine", "rag-service"}
                    or compose_project_lower.startswith(("agro", "rag"))
                    or compose_service_lower in {
                        "api", "grafana", "prometheus", "loki", "promtail",
                        "alertmanager", "openvscode", "redis", "qdrant", "mcp-http", "mcp-node",
                    }
                    or name_lower.startswith((
                        "agro-", "rag-", "qdrant", "redis", "grafana",
                        "prometheus", "loki", "promtail", "alertmanager",
                    ))
                    or image_lower.startswith(("agro", "rag"))
                    or "agro" in image_lower
                )

                containers.append({
                    "id": container_id,
                    "short_id": container_id[:12],
                    "name": name,
                    "image": image,
                    "state": state,
                    "status": status,
                    "ports": ports,
                    "compose_project": compose_project or None,
                    "compose_service": compose_service or None,
                    "created_at": created_at,
                    "running_for": running_for,
                    "agro_managed": agro_managed,
                    "raw_state": state_raw,
                })
            return {"containers": containers}
        return {"containers": [], "error": "Failed to list containers"}
    except Exception as e:
        return {"containers": [], "error": str(e)}


@router.get("/api/docker/redis/ping")
def docker_redis_ping() -> Dict[str, Any]:
    """Ping Redis container to check connectivity."""
    cfg = _get_docker_config()

    # Try SDK first
    client = _get_sdk_client()
    if client:
        try:
            # Find redis container
            redis_containers = [
                c for c in client.containers.list()
                if "redis" in c.name.lower()
            ]
            if not redis_containers:
                return {"success": False, "error": "Redis container not found"}

            container = redis_containers[0]
            result = container.exec_run(["redis-cli", "ping"])
            response = result.output.decode().strip() if result.output else ""
            return {
                "success": result.exit_code == 0 and "PONG" in response,
                "response": response,
            }
        except DockerException as e:
            logger.debug(f"SDK redis ping failed: {e}")
            # Fall through to subprocess

    # Subprocess fallback
    try:
        find_result = _subprocess_run(
            ["ps", "--format", "{{.Names}}", "--filter", "name=redis"],
            timeout=cfg["status_timeout"]
        )
        if find_result.returncode != 0 or not find_result.stdout.strip():
            return {"success": False, "error": "Redis container not found"}

        container_name = find_result.stdout.strip().split("\n")[0]
        ping_result = _subprocess_run(
            ["exec", container_name, "redis-cli", "ping"],
            timeout=cfg["status_timeout"]
        )
        return {
            "success": ping_result.returncode == 0 and "PONG" in ping_result.stdout,
            "response": ping_result.stdout.strip(),
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/api/docker/redis/memory")
def docker_redis_memory() -> Dict[str, Any]:
    """Get actual Redis memory usage in bytes."""
    cfg = _get_docker_config()

    # Try SDK first
    client = _get_sdk_client()
    if client:
        try:
            redis_containers = [
                c for c in client.containers.list()
                if "redis" in c.name.lower()
            ]
            if not redis_containers:
                return {"success": False, "error": "Redis container not found", "used_memory": 0}

            container = redis_containers[0]
            result = container.exec_run(["redis-cli", "INFO", "memory"])
            if result.exit_code != 0:
                return {"success": False, "error": "Failed to get Redis memory info", "used_memory": 0}

            output = result.output.decode() if result.output else ""
            used_memory = 0
            for line in output.split("\n"):
                if line.startswith("used_memory:"):
                    try:
                        used_memory = int(line.split(":")[1].strip())
                    except (ValueError, IndexError):
                        pass
                    break

            return {
                "success": True,
                "used_memory": used_memory,
                "used_memory_human": _format_bytes(used_memory),
            }
        except DockerException as e:
            logger.debug(f"SDK redis memory failed: {e}")
            # Fall through to subprocess

    # Subprocess fallback
    try:
        find_result = _subprocess_run(
            ["ps", "--format", "{{.Names}}", "--filter", "name=redis"],
            timeout=cfg["status_timeout"]
        )
        if find_result.returncode != 0 or not find_result.stdout.strip():
            return {"success": False, "error": "Redis container not found", "used_memory": 0}

        container_name = find_result.stdout.strip().split("\n")[0]
        info_result = _subprocess_run(
            ["exec", container_name, "redis-cli", "INFO", "memory"],
            timeout=cfg["status_timeout"]
        )
        if info_result.returncode != 0:
            return {"success": False, "error": "Failed to get Redis memory info", "used_memory": 0}

        used_memory = 0
        for line in info_result.stdout.split("\n"):
            if line.startswith("used_memory:"):
                try:
                    used_memory = int(line.split(":")[1].strip())
                except (ValueError, IndexError):
                    pass
                break

        return {
            "success": True,
            "used_memory": used_memory,
            "used_memory_human": _format_bytes(used_memory),
        }
    except Exception as e:
        return {"success": False, "error": str(e), "used_memory": 0}


def _format_bytes(num_bytes: int) -> str:
    """Format bytes to human readable string."""
    for unit in ["B", "KB", "MB", "GB"]:
        if abs(num_bytes) < 1024.0:
            return f"{num_bytes:.1f} {unit}"
        num_bytes /= 1024.0
    return f"{num_bytes:.1f} TB"


@router.post("/api/docker/infra/up")
def docker_infra_up() -> Dict[str, Any]:
    """Start AGRO infrastructure via up.sh script."""
    cfg = _get_docker_config()
    try:
        root = repo_root()
        # Always use subprocess for shell scripts
        result = subprocess.run(
            ["bash", str(root / "scripts" / "up.sh")],
            capture_output=True,
            text=True,
            timeout=cfg["infra_up_timeout"],
            cwd=str(root),
            env=_SUBPROCESS_ENV,
        )
        return {
            "success": result.returncode == 0,
            "output": result.stdout,
            "error": result.stderr if result.returncode != 0 else None,
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/api/docker/infra/down")
def docker_infra_down() -> Dict[str, Any]:
    """Stop AGRO infrastructure via docker compose down."""
    cfg = _get_docker_config()
    try:
        root = repo_root()
        # Need to run in correct directory with corrected environment
        result = subprocess.run(
            [_DOCKER_BIN, "compose", "down"],
            capture_output=True,
            text=True,
            timeout=cfg["infra_down_timeout"],
            cwd=str(root),
            env=_SUBPROCESS_ENV,
        )
        return {
            "success": result.returncode == 0,
            "output": result.stdout,
            "error": result.stderr if result.returncode != 0 else None,
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


def _container_action(action: str, container_id: str, timeout: int = None) -> Dict[str, Any]:
    """Execute a container action (start/stop/restart/pause/unpause).

    Uses SDK if available, falls back to subprocess.
    """
    if timeout is None:
        cfg = _get_docker_config()
        timeout = cfg["container_action_timeout"]

    # Try SDK first
    client = _get_sdk_client()
    if client:
        try:
            container = client.containers.get(container_id)
            if action == "start":
                container.start()
            elif action == "stop":
                container.stop(timeout=timeout)
            elif action == "restart":
                container.restart(timeout=timeout)
            elif action == "pause":
                container.pause()
            elif action == "unpause":
                container.unpause()
            else:
                return {"success": False, "error": f"Unknown action: {action}"}

            return {"success": True, "output": f"Container {action} successful"}
        except DockerException as e:
            logger.debug(f"SDK {action} failed: {e}")
            # Fall through to subprocess

    # Subprocess fallback
    try:
        result = _subprocess_run([action, container_id], timeout=timeout)
        return {
            "success": result.returncode == 0,
            "output": result.stdout,
            "error": result.stderr if result.returncode != 0 else None,
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/api/loki/status")
def loki_status() -> Dict[str, Any]:
    """Check Loki availability via HTTP.

    Tries LOKI_URL env (default http://loki:3100), then localhost fallback.
    """
    import requests
    base = (os.getenv("LOKI_URL") or "http://loki:3100").rstrip("/")
    urls = [f"{base}/ready", f"{base}/loki/api/v1/status/buildinfo"]
    # Fallback to localhost binding
    if "loki:" in base or base.startswith("http://loki:"):
        urls.extend(["http://127.0.0.1:3100/ready", "http://127.0.0.1:3100/loki/api/v1/status/buildinfo"])
    for u in urls:
        try:
            r = requests.get(u, timeout=1.5)
            if r.status_code == 200:
                return {"reachable": True, "url": u, "status": "ok"}
        except Exception:
            continue
    return {"reachable": False, "url": None, "status": "fail"}


@router.post("/api/docker/container/{container_id}/pause")
def docker_container_pause(container_id: str) -> Dict[str, Any]:
    """Pause a running container."""
    return _container_action("pause", container_id)


@router.post("/api/docker/container/{container_id}/unpause")
def docker_container_unpause(container_id: str) -> Dict[str, Any]:
    """Unpause a paused container."""
    return _container_action("unpause", container_id)


@router.post("/api/docker/container/{container_id}/stop")
def docker_container_stop(container_id: str) -> Dict[str, Any]:
    """Stop a running container."""
    return _container_action("stop", container_id)


@router.post("/api/docker/container/{container_id}/start")
def docker_container_start(container_id: str) -> Dict[str, Any]:
    """Start a stopped container."""
    return _container_action("start", container_id)


@router.post("/api/docker/container/{container_id}/remove")
def docker_container_remove(container_id: str) -> Dict[str, Any]:
    """Remove a container (force removes running containers)."""
    cfg = _get_docker_config()

    # Try SDK first
    client = _get_sdk_client()
    if client:
        try:
            container = client.containers.get(container_id)
            container.remove(force=True)
            return {"success": True, "output": "Container removed"}
        except DockerException as e:
            logger.debug(f"SDK remove failed: {e}")
            # Fall through to subprocess

    # Subprocess fallback
    try:
        result = _subprocess_run(
            ["rm", "-f", container_id],
            timeout=cfg["container_action_timeout"]
        )
        return {
            "success": result.returncode == 0,
            "output": result.stdout,
            "error": result.stderr if result.returncode != 0 else None,
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/api/docker/container/{container_id}/restart")
def docker_container_restart(container_id: str) -> Dict[str, Any]:
    """Restart a container."""
    return _container_action("restart", container_id)


@router.get("/api/docker/container/{container_id}/logs")
def docker_container_logs(
    container_id: str, tail: int = None, timestamps: bool = None
) -> Dict[str, Any]:
    """Get container logs."""
    cfg = _get_docker_config()
    if tail is None:
        tail = cfg["logs_tail"]
    if timestamps is None:
        timestamps = cfg["logs_timestamps"]

    # Try SDK first
    client = _get_sdk_client()
    if client:
        try:
            container = client.containers.get(container_id)
            logs = container.logs(
                tail=tail,
                timestamps=timestamps,
                stdout=True,
                stderr=True
            )
            logs_str = logs.decode() if isinstance(logs, bytes) else logs
            return {
                "success": True,
                "logs": logs_str,
                "error": None,
            }
        except DockerException as e:
            logger.debug(f"SDK logs failed: {e}")
            # Fall through to subprocess

    # Subprocess fallback
    try:
        cmd = ["logs", "--tail", str(tail)]
        if timestamps:
            cmd.append("--timestamps")
        cmd.append(container_id)
        result = _subprocess_run(cmd, timeout=cfg["container_action_timeout"])
        return {
            "success": result.returncode == 0,
            "logs": result.stdout + result.stderr,
            "error": None if result.returncode == 0 else "Failed to get logs",
        }
    except Exception as e:
        return {"success": False, "logs": "", "error": str(e)}
