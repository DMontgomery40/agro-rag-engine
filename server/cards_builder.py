from __future__ import annotations

import os
import json
import time
import uuid
import queue
import threading
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Any, Optional, Iterator, List

from common.config_loader import out_dir
from server.env_model import generate_text

# Module-level cached configuration
try:
    from server.services.config_registry import get_config_registry
    _config_registry = get_config_registry()
except ImportError:
    _config_registry = None

# Cached enrichment parameters
_CARDS_ENRICH_DEFAULT = None
_CARDS_MAX = None
_ENRICH_CODE_CHUNKS = None
_ENRICH_TIMEOUT = None
_OUT_DIR_BASE = None
_EMBEDDING_TYPE = None
_ENRICH_MODEL = None
_GEN_MODEL = None
_RERANK_BACKEND = None
_COHERE_RERANK_MODEL = None
_RERANKER_MODEL = None

def _load_cached_config():
    """Load cards config values into module-level cache."""
    global _CARDS_ENRICH_DEFAULT, _CARDS_MAX, _ENRICH_CODE_CHUNKS, _ENRICH_TIMEOUT
    global _OUT_DIR_BASE, _EMBEDDING_TYPE, _ENRICH_MODEL, _GEN_MODEL
    global _RERANK_BACKEND, _COHERE_RERANK_MODEL, _RERANKER_MODEL

    if _config_registry is None:
        # Fallback to os.getenv only when registry unavailable
        _CARDS_ENRICH_DEFAULT = int(os.getenv('CARDS_ENRICH_DEFAULT', '1') or '1')
        _CARDS_MAX = int(os.getenv('CARDS_MAX', '100') or '100')
        _ENRICH_CODE_CHUNKS = int(os.getenv('ENRICH_CODE_CHUNKS', '1') or '1')
        _ENRICH_TIMEOUT = int(os.getenv('ENRICH_TIMEOUT', '30') or '30')
        _OUT_DIR_BASE = os.getenv("OUT_DIR_BASE") or str(Path(__file__).resolve().parents[1] / "out")
        _EMBEDDING_TYPE = (os.getenv("EMBEDDING_TYPE", "openai") or "openai").lower()
        _ENRICH_MODEL = os.getenv("ENRICH_MODEL") or os.getenv("GEN_MODEL") or "gpt-4o-mini"
        _GEN_MODEL = os.getenv("GEN_MODEL") or "gpt-4o-mini"
        _RERANK_BACKEND = (os.getenv("RERANK_BACKEND", "local") or "local").lower()
        _COHERE_RERANK_MODEL = os.getenv("COHERE_RERANK_MODEL", "rerank-3.5")
        _RERANKER_MODEL = os.getenv("RERANKER_MODEL", "BAAI/bge-reranker-v2-m3")
    else:
        # Use config_registry (preferred path)
        _CARDS_ENRICH_DEFAULT = _config_registry.get_int('CARDS_ENRICH_DEFAULT', 1)
        _CARDS_MAX = _config_registry.get_int('CARDS_MAX', 100)
        _ENRICH_CODE_CHUNKS = _config_registry.get_int('ENRICH_CODE_CHUNKS', 1)
        _ENRICH_TIMEOUT = _config_registry.get_int('ENRICH_TIMEOUT', 30)
        _OUT_DIR_BASE = _config_registry.get_str('OUT_DIR_BASE', str(Path(__file__).resolve().parents[1] / "out"))
        _EMBEDDING_TYPE = _config_registry.get_str('EMBEDDING_TYPE', 'openai').lower()
        _ENRICH_MODEL = _config_registry.get_str('ENRICH_MODEL', '') or _config_registry.get_str('GEN_MODEL', 'gpt-4o-mini')
        _GEN_MODEL = _config_registry.get_str('GEN_MODEL', 'gpt-4o-mini')
        _RERANK_BACKEND = _config_registry.get_str('RERANK_BACKEND', 'local').lower()
        _COHERE_RERANK_MODEL = _config_registry.get_str('COHERE_RERANK_MODEL', 'rerank-3.5')
        _RERANKER_MODEL = _config_registry.get_str('RERANKER_MODEL', 'BAAI/bge-reranker-v2-m3')

def reload_config():
    """Reload all cached config values from registry."""
    _load_cached_config()

# Initialize cache
_load_cached_config()


QUICK_TIPS = [
    "Put repo-specific nouns in Discriminative to improve filename/path hits.",
    "Add Semantic synonyms: auth→oauth,jwt,bearer; events→sse,ws,subscribe.",
    "Short, concrete briefs beat generic text; include unique module names.",
    "Boost paths you care about (e.g., app/,lib/,config/,scripts/,server/,api/).",
    "Flip Enrich code chunks on for semantic cards; then Build, not Refresh.",
]


def _progress_dir(repo: str) -> Path:
    base = Path(_OUT_DIR_BASE)
    return base / "cards" / repo


def _logs_path() -> Path:
    base = Path(_OUT_DIR_BASE)
    return base / "logs" / "cards_build.log"


def _model_info() -> Dict[str, str]:
    # Embed
    if _EMBEDDING_TYPE == "voyage":
        embed = "voyage-code-3"
    elif _EMBEDDING_TYPE == "local":
        embed = "BAAI/bge-small-en-v1.5"
    else:
        embed = "text-embedding-3-large"
    # Enrich
    enrich = _ENRICH_MODEL
    # Rerank
    if _RERANK_BACKEND == "cohere":
        rerank = _COHERE_RERANK_MODEL
    else:
        rerank = _RERANKER_MODEL
    return {"embed": embed, "enrich": str(enrich), "rerank": rerank}


def _read_jsonl(path: Path) -> Iterator[Dict[str, Any]]:
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            try:
                yield json.loads(line)
            except Exception:
                continue


def _log(msg: str) -> None:
    p = _logs_path()
    p.parent.mkdir(parents=True, exist_ok=True)
    ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    try:
        p.write_text(p.read_text() + f"[{ts}] {msg}\n") if p.exists() else p.write_text(f"[{ts}] {msg}\n")
    except Exception:
        # Best-effort only
        pass


@dataclass
class CardsBuildJob:
    repo: str
    enrich: bool = True
    exclude_dirs: List[str] = field(default_factory=list)
    exclude_patterns: List[str] = field(default_factory=list)
    exclude_keywords: List[str] = field(default_factory=list)
    job_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    started_at: float = field(default_factory=time.time)
    stage: str = "scan"
    total: int = 0
    done: int = 0
    last_emit_at: float = field(default_factory=time.time)
    last_done: int = 0
    status: str = "running"  # running|done|error|cancelled
    error: Optional[str] = None
    _queue: "queue.Queue[str]" = field(default_factory=lambda: queue.Queue(maxsize=1000))
    _cancel: threading.Event = field(default_factory=threading.Event)
    _thread: Optional[threading.Thread] = None

    def start(self) -> None:
        t = threading.Thread(target=self._run, daemon=True)
        self._thread = t
        t.start()

    def cancel(self) -> None:
        self._cancel.set()
        self.status = "cancelled"
        self._emit_event("cancelled", {"message": "User cancelled"})

    def events(self) -> Iterator[str]:
        while True:
            try:
                evt = self._queue.get(timeout=1.0)
                yield evt
                if evt.startswith("event: done") or evt.startswith("event: cancelled") or evt.startswith("event: error"):
                    break
            except queue.Empty:
                if self.status in {"done", "cancelled", "error"}:
                    break
                continue

    def snapshot(self) -> Dict[str, Any]:
        return self._progress_payload(tip=None)

    def _emit_event(self, event: str, data: Dict[str, Any]) -> None:
        try:
            payload = json.dumps(data, ensure_ascii=False)
            s = f"event: {event}\ndata: {payload}\n\n"
            self._queue.put_nowait(s)
        except Exception:
            pass

    def _progress_payload(self, tip: Optional[str]) -> Dict[str, Any]:
        pct = (float(self.done) / float(self.total) * 100.0) if self.total > 0 else 0.0
        elapsed = max(0.001, time.time() - self.started_at)
        rate = self.done / elapsed
        eta = int((self.total - self.done) / rate) if rate > 0 and self.total > self.done else 0
        if rate >= 1200:
            thr = f"{rate/1000.0:.1f}k chunks/min"
        else:
            thr = f"{rate*60.0:.1f} chunks/min"
        data = {
            "repo": self.repo,
            "stage": self.stage,
            "total": int(self.total),
            "done": int(self.done),
            "pct": round(pct, 2),
            "model": _model_info(),
            "tip": tip or QUICK_TIPS[int(time.time()) % len(QUICK_TIPS)],
            "started_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(self.started_at)),
            "eta_s": int(max(0, eta)),
            "throughput": thr,
        }
        # Persist snapshot
        try:
            prog_path = _progress_dir(self.repo) / "progress.json"
            prog_path.parent.mkdir(parents=True, exist_ok=True)
            prog_path.write_text(json.dumps(data, indent=2))
        except Exception:
            pass
        return data

    def _emit_progress(self, tip: Optional[str] = None) -> None:
        data = self._progress_payload(tip)
        self._emit_event("progress", data)

    def _should_filter_chunk(self, chunk: Dict[str, Any]) -> bool:
        """Check if chunk should be filtered based on user-specified criteria."""
        fp = chunk.get("file_path", "")
        code = chunk.get("code", "")
        
        # Check exclude_dirs
        for exclude_dir in self.exclude_dirs:
            if exclude_dir and (f"/{exclude_dir}/" in fp or fp.startswith(f"{exclude_dir}/")):
                return True
        
        # Check exclude_patterns (file extensions or name patterns)
        for pattern in self.exclude_patterns:
            if pattern and (pattern in fp or fp.endswith(pattern)):
                return True
        
        # Check exclude_keywords (in code content)
        for keyword in self.exclude_keywords:
            if keyword and keyword.lower() in code.lower():
                return True
        
        return False

    def _ensure_cards_dirs(self) -> Dict[str, Path]:
        base = Path(out_dir(self.repo))
        base.mkdir(parents=True, exist_ok=True)
        return {
            "base": base,
            "chunks": base / "chunks.jsonl",
            "cards": base / "cards.jsonl",
            "cards_txt": base / "cards.txt",
            "bm25_dir": base / "bm25_cards",
        }

    def _run(self) -> None:
        try:
            _log(f"cards-build start repo={self.repo} enrich={self.enrich}")
            paths = self._ensure_cards_dirs()
            chunks_path = paths["chunks"]
            if not chunks_path.exists():
                self.status = "error"
                self.error = f"No chunks found for repo {self.repo}. Please index first."
                self._emit_event("error", {"message": self.error})
                return
            # Stage: scan
            self.stage = "scan"
            self.total = sum(1 for _ in chunks_path.open("r", encoding="utf-8"))
            self.done = 0
            self._emit_progress(QUICK_TIPS[0])
            # Stage: chunk (noop for cards build)
            self.stage = "chunk"
            self.done = self.total
            self._emit_progress(QUICK_TIPS[1])
            # Stage: summarize (enrich) or fast heuristic
            self.stage = "summarize" if self.enrich else "summarize"
            self.done = 0
            self._emit_progress(QUICK_TIPS[2])

            max_chunks = _CARDS_MAX
            written = 0
            skipped = 0
            with paths["cards"].open("w", encoding="utf-8") as out_json, paths["cards_txt"].open("w", encoding="utf-8") as out_txt:
                for idx, ch in enumerate(_read_jsonl(chunks_path)):
                    if self._cancel.is_set():
                        self.status = "cancelled"
                        self._emit_event("cancelled", {"message": "Cancelled by user"})
                        return
                    
                    # Apply filters
                    if self._should_filter_chunk(ch):
                        skipped += 1
                        self.done = idx + 1
                        continue
                    
                    code = (ch.get("code") or "")[:2000]
                    fp = ch.get("file_path", "")
                    if self.enrich:
                        prompt = (
                            "Summarize this code chunk for retrieval as a JSON object with keys: "
                            "symbols (array of names: functions/classes/components/routes), purpose (short sentence), routes (array of route paths if any). "
                            "Respond with only the JSON.\n\n"
                        )
                        user = prompt + code
                        try:
                            text, _meta = generate_text(user_input=user, system_instructions=None, reasoning_effort=None, response_format={"type": "json_object"})
                            content = (text or "").strip()
                            card: Dict[str, Any]
                            try:
                                card = json.loads(content)
                            except Exception:
                                # Fuzzy parse: try to extract a JSON object substring; else treat as free-text purpose
                                try:
                                    start = content.find('{')
                                    end = content.rfind('}')
                                    if start != -1 and end != -1 and end > start:
                                        card = json.loads(content[start:end + 1])
                                    else:
                                        raise ValueError('no json braces')
                                except Exception:
                                    # Free-text fallback becomes purpose; derive symbols/routes heuristically
                                    syms: List[str] = []
                                    routes: List[str] = []
                                    try:
                                        import re
                                        syms = [m[1] for m in re.findall(r"\b(class|def|function|interface|type)\s+([A-Za-z_][A-Za-z0-9_]*)", code)][:5]
                                        routes = re.findall(r"['\"](/[^'\"\s]*)['\"]", code)[:5]
                                    except Exception:
                                        pass
                                    card = {"symbols": syms, "purpose": content[:240], "routes": routes}
                        except Exception:
                            card = {"symbols": [], "purpose": "", "routes": []}
                    else:
                        # Heuristic fallback (no external models)
                        heur_syms: List[str] = []
                        try:
                            import re
                            heur_syms = re.findall(r"\b(class|def|function|interface|type)\s+([A-Za-z_][A-Za-z0-9_]*)", code)
                            heur_syms = [s[1] for s in heur_syms][:5]
                        except Exception:
                            heur_syms = []
                        purpose = f"High-level card from {os.path.basename(fp)}"
                        heur_routes = []
                        try:
                            import re
                            heur_routes = re.findall(r"['\"](/[^'\"\s]*)['\"]", code)[:5]
                        except Exception:
                            heur_routes = []
                        card = {"symbols": heur_syms, "purpose": purpose, "routes": heur_routes}
                    card["file_path"] = fp
                    card["id"] = ch.get("id")
                    # Ensure minimal purpose is present
                    if not (card.get("purpose") or "").strip():
                        base = os.path.basename(fp)
                        syml = card.get("symbols") or []
                        card["purpose"] = (f"Defines {'/'.join(syml[:2])} in {base}" if syml else f"High-level summary for {base}")
                    out_json.write(json.dumps(card, ensure_ascii=False) + "\n")
                    text_out = " ".join(card.get("symbols", [])) + "\n" + card.get("purpose", "") + "\n" + " ".join(card.get("routes", [])) + "\n" + fp
                    out_txt.write(text_out.replace("\n", " ") + "\n")
                    written += 1
                    self.done = idx + 1
                    now = time.time()
                    if now - self.last_emit_at >= 0.5:
                        self._emit_progress(None)
                        self.last_emit_at = now
                    if max_chunks and written >= max_chunks:
                        break

            # Stage: write (already written incrementally)
            self.stage = "write"
            self._emit_progress(QUICK_TIPS[3])

            # Stage: sparse (build BM25 index for cards)
            self.stage = "sparse"
            try:
                import bm25s  # type: ignore
                from bm25s.tokenization import Tokenizer  # type: ignore
                from Stemmer import Stemmer  # type: ignore
                stemmer = Stemmer("english")
                tok = Tokenizer(stemmer=stemmer, stopwords="en")
                docs = [ln.strip() for ln in paths["cards_txt"].read_text(encoding="utf-8").splitlines() if ln.strip()]
                tokens = tok.tokenize(docs)
                retriever = bm25s.BM25(method="lucene", k1=1.2, b=0.65)
                retriever.index(tokens)
                try:
                    retriever.vocab_dict = {str(k): v for k, v in retriever.vocab_dict.items()}
                except Exception:
                    pass
                paths["bm25_dir"].mkdir(parents=True, exist_ok=True)
                retriever.save(str(paths["bm25_dir"]))
                tok.save_vocab(save_dir=str(paths["bm25_dir"]))
                tok.save_stopwords(save_dir=str(paths["bm25_dir"]))
                _log(f"cards-build bm25 ok repo={self.repo} docs={len(docs)} dir={paths['bm25_dir']}")
            except Exception as e:
                _log(f"cards-build bm25 failed: {e}")

            # Stage: finalize
            self.stage = "finalize"
            self.done = self.total
            snap = self._progress_payload(QUICK_TIPS[4])
            snap["result"] = {
                "cards_written": written,
                "chunks_skipped": skipped,
                "duration_s": int(time.time() - self.started_at)
            }
            try:
                prog_path = _progress_dir(self.repo) / "progress.json"
                prog_path.write_text(json.dumps(snap, indent=2))
            except Exception:
                pass
            self.status = "done"
            self._emit_event("done", snap)
            _log(f"cards-build done repo={self.repo} cards={written} skipped={skipped}")
        except Exception as e:
            self.status = "error"
            self.error = str(e)
            self._emit_event("error", {"message": str(e)})
            _log(f"cards-build error: {e}")


class _Registry:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.jobs_by_id: Dict[str, CardsBuildJob] = {}
        self.jobs_by_repo: Dict[str, str] = {}

    def start(self, repo: str, enrich: bool, exclude_dirs: Optional[List[str]] = None, 
              exclude_patterns: Optional[List[str]] = None, exclude_keywords: Optional[List[str]] = None) -> CardsBuildJob:
        with self._lock:
            if repo in self.jobs_by_repo:
                jid = self.jobs_by_repo[repo]
                job = self.jobs_by_id.get(jid)
                if job and job.status == "running":
                    raise RuntimeError(f"Job already running for repo {repo}")
            job = CardsBuildJob(
                repo=repo, 
                enrich=enrich,
                exclude_dirs=exclude_dirs or [],
                exclude_patterns=exclude_patterns or [],
                exclude_keywords=exclude_keywords or []
            )
            self.jobs_by_id[job.job_id] = job
            self.jobs_by_repo[repo] = job.job_id
        job.start()
        return job

    def get(self, job_id: str) -> Optional[CardsBuildJob]:
        return self.jobs_by_id.get(job_id)

    def get_by_repo(self, repo: str) -> Optional[CardsBuildJob]:
        jid = self.jobs_by_repo.get(repo)
        return self.jobs_by_id.get(jid) if jid else None

    def cancel(self, job_id: str) -> bool:
        job = self.jobs_by_id.get(job_id)
        if not job:
            return False
        job.cancel()
        return True


REGISTRY = _Registry()


def start_job(repo: str, enrich: bool, exclude_dirs: Optional[List[str]] = None, 
              exclude_patterns: Optional[List[str]] = None, exclude_keywords: Optional[List[str]] = None) -> CardsBuildJob:
    return REGISTRY.start(
        repo.strip(), 
        bool(int(enrich) if isinstance(enrich, (int, str)) else enrich),
        exclude_dirs=exclude_dirs,
        exclude_patterns=exclude_patterns,
        exclude_keywords=exclude_keywords
    )


def get_job(job_id: str) -> Optional[CardsBuildJob]:
    return REGISTRY.get(job_id)


def get_job_for_repo(repo: str) -> Optional[CardsBuildJob]:
    return REGISTRY.get_by_repo(repo.strip())


def cancel_job(job_id: str) -> bool:
    return REGISTRY.cancel(job_id)


def read_logs(tail_bytes: int = 16384) -> Dict[str, Any]:
    p = _logs_path()
    if not p.exists():
        return {"ok": True, "content": "", "path": str(p)}
    try:
        data = p.read_bytes()
        if len(data) > tail_bytes:
            data = data[-tail_bytes:]
        return {"ok": True, "content": data.decode("utf-8", errors="ignore"), "path": str(p)}
    except Exception as e:
        return {"ok": False, "error": str(e), "path": str(p)}
