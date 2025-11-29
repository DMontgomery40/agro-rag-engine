import os
import json
import subprocess
from pathlib import Path
from typing import Any, Dict, List
from common.paths import repo_root, data_dir


def _read_json(path: Path, default: Any) -> Any:
    if path.exists():
        try:
            return json.loads(path.read_text())
        except Exception:
            return default
    return default


def _last_index_timestamp_for_repo(base: Path, repo_name: str) -> str | None:
    """Return the best-effort last index timestamp for a single repo under a base dir.

    Preference order:
    1) base/<repo>/last_index.json["timestamp"]
    2) mtime of base/<repo>/chunks.jsonl
    3) mtime of base/<repo>/bm25_index directory
    """
    repo_dir = base / repo_name
    if not repo_dir.exists():
        return None

    # 1) Explicit metadata file
    meta = _read_json(repo_dir / "last_index.json", {})
    ts = str(meta.get("timestamp") or "").strip()
    if ts:
        return ts

    # 2) chunks.jsonl mtime
    chunks = repo_dir / "chunks.jsonl"
    if chunks.exists():
        try:
            return __import__('datetime').datetime.fromtimestamp(chunks.stat().st_mtime).isoformat()
        except Exception:
            pass

    # 3) bm25_index dir mtime
    bm25 = repo_dir / "bm25_index"
    if bm25.exists():
        try:
            return __import__('datetime').datetime.fromtimestamp(bm25.stat().st_mtime).isoformat()
        except Exception:
            pass
    return None


def _get_index_embedding_metadata(repo_name: str) -> Dict[str, Any] | None:
    """Read embedding metadata from last_index.json for a specific repo.
    
    Searches across all index profiles (out, out.noindex-shared, etc.)
    to find the most recent index for this repo and returns its embedding config.
    
    Returns dict with: embedding_type, embedding_dim, timestamp, index_path
    Returns None if no index found for this repo.
    """
    base_paths = ["out", "out.noindex-shared", "out.noindex-gui", "out.noindex-devclean"]
    best_meta = None
    best_ts = None
    
    for base in base_paths:
        base_path = repo_root() / base
        repo_dir = base_path / repo_name
        meta_file = repo_dir / "last_index.json"
        
        if not meta_file.exists():
            continue
            
        meta = _read_json(meta_file, {})
        if not meta:
            continue
            
        # Get timestamp for comparison
        ts = meta.get("timestamp", "")
        
        # Track the most recent index
        if best_ts is None or (ts and ts > best_ts):
            best_ts = ts
            best_meta = {
                "embedding_type": meta.get("embedding_type"),
                "embedding_dim": meta.get("embedding_dim"),
                "timestamp": ts,
                "index_path": str(repo_dir),
                "collection": meta.get("collection"),
                "chunk_count": meta.get("chunk_count"),
            }
    
    return best_meta


def _get_redis_memory_usage() -> int:
    """Get actual Redis memory usage in bytes by querying the Redis container.
    
    Returns 0 if Redis is not available.
    """
    try:
        # Find Redis container
        find_result = subprocess.run(
            ["docker", "ps", "--format", "{{.Names}}", "--filter", "name=redis"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if find_result.returncode != 0 or not find_result.stdout.strip():
            return 0  # Redis not running

        container_name = find_result.stdout.strip().split("\n")[0]
        
        # Get memory info from Redis
        info_result = subprocess.run(
            ["docker", "exec", container_name, "redis-cli", "INFO", "memory"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if info_result.returncode != 0:
            return 0

        # Parse used_memory from the output
        for line in info_result.stdout.split("\n"):
            if line.startswith("used_memory:"):
                try:
                    return int(line.split(":")[1].strip())
                except (ValueError, IndexError):
                    pass
        return 0
    except Exception:
        return 0


def get_index_stats() -> Dict[str, Any]:
    """Gather comprehensive indexing statistics with storage calculator integration.

    Prefers a persisted last_index.json timestamp if present, falling back to
    file mtimes, then now().
    """
    import subprocess
    from datetime import datetime

    # Get embedding configuration
    embedding_type = os.getenv("EMBEDDING_TYPE", "openai").lower()
    embedding_dim = int(os.getenv("EMBEDDING_DIM", "3072" if embedding_type == "openai" else "512"))

    stats: Dict[str, Any] = {
        "timestamp": datetime.now().isoformat(),  # may be replaced below
        "repos": [],
        "total_storage": 0,
        "embedding_config": {
            "provider": embedding_type,
            "model": "text-embedding-3-large" if embedding_type == "openai" else f"local-{embedding_type}",
            "dimensions": embedding_dim,
            "precision": "float32",
        },
        "keywords_count": 0,
        "storage_breakdown": {
            "chunks_json": 0,
            "bm25_index": 0,
            "cards": 0,
            "embeddings_raw": 0,
            "qdrant_overhead": 0,
            "reranker_cache": 0,
            "redis": _get_redis_memory_usage(),  # actual Redis memory
        },
        "costs": {
            "total_tokens": 0,
            "embedding_cost": 0.0,
        },
    }

    # Current repo + branch
    try:
        repo = os.getenv("REPO", "agro")
        # Try env var first (for Docker containers where git isn't available)
        branch = os.getenv("GIT_BRANCH", "").strip()
        if not branch:
            # Fallback to git command (for local development)
            branch_result = subprocess.run(["git", "branch", "--show-current"], capture_output=True, text=True, cwd=str(repo_root()))
            branch = branch_result.stdout.strip() if branch_result.returncode == 0 else "unknown"
        stats["current_repo"] = repo
        stats["current_branch"] = branch if branch else "unknown"
    except Exception:
        stats["current_repo"] = os.getenv("REPO", "agro")
        stats["current_branch"] = os.getenv("GIT_BRANCH", "unknown")

    total_chunks = 0

    # Index profiles to scan (default out, shared, gui, devclean)
    base_paths = ["out", "out.noindex-shared", "out.noindex-gui", "out.noindex-devclean"]
    discovered_ts: List[str] = []
    for base in base_paths:
        base_path = repo_root() / base
        if not base_path.exists():
            continue
        profile_name = "default" if base == "out" else base.replace("out.noindex-", "")
        repo_dirs = [d for d in base_path.iterdir() if d.is_dir()]
        for repo_dir in repo_dirs:
            repo_name = repo_dir.name
            chunks_file = repo_dir / "chunks.jsonl"
            bm25_dir = repo_dir / "bm25_index"
            cards_file = repo_dir / "cards.jsonl"

            repo_stats: Dict[str, Any] = {
                "name": repo_name,
                "profile": profile_name,
                "paths": {
                    "chunks": str(chunks_file) if chunks_file.exists() else None,
                    "bm25": str(bm25_dir) if bm25_dir.exists() else None,
                    "cards": str(cards_file) if cards_file.exists() else None,
                },
                "sizes": {},
                "chunk_count": 0,
                "has_cards": cards_file.exists() if cards_file else False,
            }

            # Aggregate sizes and counts
            if chunks_file.exists():
                size = chunks_file.stat().st_size
                repo_stats["sizes"]["chunks"] = size
                stats["total_storage"] += size
                stats["storage_breakdown"]["chunks_json"] += size
                try:
                    with open(chunks_file, 'r') as f:
                        cc = sum(1 for _ in f)
                        repo_stats["chunk_count"] = cc
                        total_chunks += cc
                except Exception:
                    pass

            if bm25_dir.exists():
                bm25_size = sum(f.stat().st_size for f in bm25_dir.rglob('*') if f.is_file())
                repo_stats["sizes"]["bm25"] = bm25_size
                stats["total_storage"] += bm25_size
                stats["storage_breakdown"]["bm25_index"] += bm25_size

            if cards_file.exists():
                card_size = cards_file.stat().st_size
                repo_stats["sizes"]["cards"] = card_size
                stats["total_storage"] += card_size
                stats["storage_breakdown"]["cards"] += card_size

            stats["repos"].append(repo_stats)

            # Try to resolve a last-index timestamp for this repo under this profile
            ts = _last_index_timestamp_for_repo(base_path, repo_name)
            if ts:
                discovered_ts.append(ts)

    # Embedding storage + rough costs when we have chunks
    if total_chunks > 0:
        bytes_per_float = 4
        embeddings_raw = total_chunks * embedding_dim * bytes_per_float
        qdrant_overhead_multiplier = 1.5
        qdrant_total = embeddings_raw * qdrant_overhead_multiplier
        reranker_cache = embeddings_raw * 0.5
        stats["storage_breakdown"]["embeddings_raw"] = embeddings_raw
        stats["storage_breakdown"]["qdrant_overhead"] = int(qdrant_total - embeddings_raw)
        stats["storage_breakdown"]["reranker_cache"] = int(reranker_cache)
        stats["total_storage"] += qdrant_total + reranker_cache + stats["storage_breakdown"]["redis"]
        if embedding_type == "openai":
            est_tokens_per_chunk = 750
            total_tokens = total_chunks * est_tokens_per_chunk
            cost_per_million = 0.13
            embedding_cost = (total_tokens / 1_000_000) * cost_per_million
            stats["costs"]["total_tokens"] = total_tokens
            stats["costs"]["embedding_cost"] = round(embedding_cost, 4)

    # Try to get keywords count from repos.json
    current_repo = stats.get('current_repo', 'agro')
    repos_json_path = repo_root() / "repos.json"
    if repos_json_path.exists():
        try:
            repos_data = json.loads(repos_json_path.read_text())
            repos_list = repos_data.get("repos", [])
            for repo_entry in repos_list:
                if repo_entry.get("name") == current_repo:
                    keywords = repo_entry.get("keywords", [])
                    stats["keywords_count"] = len(keywords) if isinstance(keywords, list) else 0
                    break
        except Exception:
            pass

    # Expose total chunks count (already calculated above)
    stats["total_chunks"] = total_chunks

    # Set a better global timestamp if any per-repo timestamp found
    if discovered_ts:
        stats["timestamp"] = sorted(discovered_ts)[-1]

    # Get index embedding metadata for current repo to detect mismatches
    current_repo = stats.get("current_repo", "agro")
    index_meta = _get_index_embedding_metadata(current_repo)
    
    # Check if there are ACTUAL chunks (not just metadata from a stale last_index.json)
    has_actual_chunks = total_chunks > 0
    
    if index_meta and index_meta.get("embedding_type") and has_actual_chunks:
        stats["index_embedding_config"] = {
            "provider": index_meta["embedding_type"],
            "dimensions": index_meta["embedding_dim"],
            "indexed_at": index_meta["timestamp"],
            "index_path": index_meta["index_path"],
            "chunk_count": index_meta.get("chunk_count"),
        }
        
        # Detect mismatch between current config and index
        config_type = embedding_type.lower()
        index_type = (index_meta["embedding_type"] or "").lower()
        config_dim = embedding_dim
        index_dim = index_meta["embedding_dim"]
        
        # Types must match, and if both have dimensions, those must match too
        type_match = config_type == index_type
        dim_match = (index_dim is None) or (config_dim == index_dim)
        
        stats["embedding_mismatch"] = not (type_match and dim_match)
        stats["embedding_mismatch_details"] = {
            "config_type": config_type,
            "index_type": index_type,
            "config_dim": config_dim,
            "index_dim": index_dim,
            "type_match": type_match,
            "dim_match": dim_match,
        }
    else:
        # No index found or no actual chunks - no mismatch possible
        # (but also no index to search - user needs to run indexing!)
        stats["index_embedding_config"] = None
        stats["embedding_mismatch"] = False
        stats["embedding_mismatch_details"] = None
        stats["has_index"] = False  # Explicit flag for frontend

    # Add explicit has_index flag for clarity
    stats["has_index"] = has_actual_chunks and (index_meta is not None)

    return stats

