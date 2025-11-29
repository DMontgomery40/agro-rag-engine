import json as _json
import subprocess
from typing import Any, Dict

from fastapi import APIRouter

from common.paths import repo_root
from server.services.config_registry import get_config_registry

router = APIRouter()

# Helper to get config values with defaults
def _get_docker_config():
    """Get Docker config values from registry."""
    registry = get_config_registry()
    return {
        "status_timeout": registry.get_int("DOCKER_STATUS_TIMEOUT", 5),
        "container_list_timeout": registry.get_int("DOCKER_CONTAINER_LIST_TIMEOUT", 10),
        "container_action_timeout": registry.get_int("DOCKER_CONTAINER_ACTION_TIMEOUT", 30),
        "infra_up_timeout": registry.get_int("DOCKER_INFRA_UP_TIMEOUT", 60),
        "infra_down_timeout": registry.get_int("DOCKER_INFRA_DOWN_TIMEOUT", 30),
        "logs_tail": registry.get_int("DOCKER_LOGS_TAIL", 100),
        "logs_timestamps": registry.get_bool("DOCKER_LOGS_TIMESTAMPS", True),
    }


@router.get("/api/docker/status")
def docker_status() -> Dict[str, Any]:
    cfg = _get_docker_config()
    try:
        result = subprocess.run(
            ["docker", "info", "--format", "{{.ServerVersion}}"],
            capture_output=True,
            text=True,
            timeout=cfg["status_timeout"],
        )
        if result.returncode == 0:
            count_result = subprocess.run(
                ["docker", "ps", "-q"], capture_output=True, text=True, timeout=cfg["status_timeout"]
            )
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
    return docker_containers_all()


@router.get("/api/docker/containers/all")
def docker_containers_all() -> Dict[str, Any]:
    cfg = _get_docker_config()
    try:
        result = subprocess.run(
            ["docker", "ps", "-a", "--format", "{{json .}}"],
            capture_output=True,
            text=True,
            timeout=cfg["container_list_timeout"],
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
                    or compose_service_lower
                    in {
                        "api",
                        "grafana",
                        "prometheus",
                        "loki",
                        "promtail",
                        "alertmanager",
                        "openvscode",
                        "redis",
                        "qdrant",
                        "mcp-http",
                        "mcp-node",
                    }
                    or name_lower.startswith(
                        (
                            "agro-",
                            "rag-",
                            "qdrant",
                            "redis",
                            "grafana",
                            "prometheus",
                            "loki",
                            "promtail",
                            "alertmanager",
                        )
                    )
                    or image_lower.startswith(("agro", "rag"))
                    or "agro" in image_lower
                )

                containers.append(
                    {
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
                    }
                )
            return {"containers": containers}
        return {"containers": [], "error": "Failed to list containers"}
    except Exception as e:
        return {"containers": [], "error": str(e)}


@router.get("/api/docker/redis/ping")
def docker_redis_ping() -> Dict[str, Any]:
    cfg = _get_docker_config()
    try:
        find_result = subprocess.run(
            ["docker", "ps", "--format", "{{.Names}}", "--filter", "name=redis"],
            capture_output=True,
            text=True,
            timeout=cfg["status_timeout"],
        )
        if find_result.returncode != 0 or not find_result.stdout.strip():
            return {"success": False, "error": "Redis container not found"}

        container_name = find_result.stdout.strip().split("\n")[0]
        ping_result = subprocess.run(
            ["docker", "exec", container_name, "redis-cli", "ping"],
            capture_output=True,
            text=True,
            timeout=cfg["status_timeout"],
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
    try:
        find_result = subprocess.run(
            ["docker", "ps", "--format", "{{.Names}}", "--filter", "name=redis"],
            capture_output=True,
            text=True,
            timeout=cfg["status_timeout"],
        )
        if find_result.returncode != 0 or not find_result.stdout.strip():
            return {"success": False, "error": "Redis container not found", "used_memory": 0}

        container_name = find_result.stdout.strip().split("\n")[0]
        # Get memory info from Redis
        info_result = subprocess.run(
            ["docker", "exec", container_name, "redis-cli", "INFO", "memory"],
            capture_output=True,
            text=True,
            timeout=cfg["status_timeout"],
        )
        if info_result.returncode != 0:
            return {"success": False, "error": "Failed to get Redis memory info", "used_memory": 0}

        # Parse used_memory from the output
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
    cfg = _get_docker_config()
    try:
        root = repo_root()
        result = subprocess.run(
            ["bash", str(root / "scripts" / "up.sh")],
            capture_output=True,
            text=True,
            timeout=cfg["infra_up_timeout"],
            cwd=str(root),
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
    cfg = _get_docker_config()
    try:
        root = repo_root()
        result = subprocess.run(
            ["docker", "compose", "down"],
            capture_output=True,
            text=True,
            timeout=cfg["infra_down_timeout"],
            cwd=str(root),  # Fixed: Use root compose file (same as up.sh), not infra/
        )
        return {
            "success": result.returncode == 0,
            "output": result.stdout,
            "error": result.stderr if result.returncode != 0 else None,
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


def _ctl(action: str, container_id: str, timeout: int = None) -> Dict[str, Any]:
    if timeout is None:
        cfg = _get_docker_config()
        timeout = cfg["container_action_timeout"]
    try:
        result = subprocess.run(
            ["docker", action, container_id],
            capture_output=True,
            text=True,
            timeout=timeout,
        )
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
    import os
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
    return _ctl("pause", container_id)


@router.post("/api/docker/container/{container_id}/unpause")
def docker_container_unpause(container_id: str) -> Dict[str, Any]:
    return _ctl("unpause", container_id)


@router.post("/api/docker/container/{container_id}/stop")
def docker_container_stop(container_id: str) -> Dict[str, Any]:
    return _ctl("stop", container_id)


@router.post("/api/docker/container/{container_id}/start")
def docker_container_start(container_id: str) -> Dict[str, Any]:
    return _ctl("start", container_id)


@router.post("/api/docker/container/{container_id}/remove")
def docker_container_remove(container_id: str) -> Dict[str, Any]:
    cfg = _get_docker_config()
    # Use rm -f for remove
    try:
        result = subprocess.run(
            ["docker", "rm", "-f", container_id],
            capture_output=True,
            text=True,
            timeout=cfg["container_action_timeout"],
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
    return _ctl("restart", container_id)


@router.get("/api/docker/container/{container_id}/logs")
def docker_container_logs(
    container_id: str, tail: int = None, timestamps: bool = None
) -> Dict[str, Any]:
    cfg = _get_docker_config()
    # Use config defaults if not specified
    if tail is None:
        tail = cfg["logs_tail"]
    if timestamps is None:
        timestamps = cfg["logs_timestamps"]
    try:
        cmd = ["docker", "logs", "--tail", str(tail)]
        if timestamps:
            cmd.append("--timestamps")
        cmd.append(container_id)
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=cfg["container_action_timeout"]
        )
        return {
            "success": result.returncode == 0,
            "logs": result.stdout + result.stderr,
            "error": None if result.returncode == 0 else "Failed to get logs",
        }
    except Exception as e:
        return {"success": False, "logs": "", "error": str(e)}
