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
from server.models.agro_config_model import DEFAULT_CONFIG

# Module-level cached configuration
try:
    from server.services.config_registry import get_config_registry
    _config_registry = get_config_registry()
except ImportError:
    _config_registry = None

# Cached enrichment parameters - Pydantic naming
_cards_enrich_default = None
_cards_max = None
_enrich_code_chunks = None
_enrich_timeout = None
_out_dir_base = None
_embedding_type = None
_enrich_model = None
_gen_model = None
_reranker_mode = None
_reranker_cloud_provider = None
_reranker_cloud_model = None
_reranker_local_model = None
_agro_reranker_model_path = None
_embedding_model = None
_voyage_model = None
_embedding_model_local = None
_cards_exclude_dirs: List[str] = []
_cards_exclude_patterns: List[str] = []
_cards_exclude_keywords: List[str] = []
_cards_code_snippet_length = None
_cards_max_symbols = None
_cards_max_routes = None
_cards_purpose_max_length = None
_cards_quick_tips: List[str] = []
_bm25_stopwords_lang = None

_DEFAULT_CARD_FILTERS = DEFAULT_CONFIG.cards


def _coerce_list(value: Any, fallback: Optional[List[str]] = None) -> List[str]:
    """Normalize CSV/list inputs into a clean list of strings."""
    if value is None:
        return list(fallback or [])
    if isinstance(value, (list, tuple, set)):
        cleaned = []
        for item in value:
            if item is None:
                continue
            text = str(item).strip()
            if text:
                cleaned.append(text)
        return cleaned
    text = str(value).strip()
    if not text:
        return list(fallback or [])
    parts = [part.strip() for part in text.replace('\n', ',').split(',')]
    cleaned = [part for part in parts if part]
    return cleaned or list(fallback or [])

def _load_cached_config():
    """Load cards config values into module-level cache."""
    global _cards_enrich_default, _cards_max, _enrich_code_chunks, _enrich_timeout
    global _out_dir_base, _embedding_type, _enrich_model, _gen_model
    global _reranker_mode, _reranker_cloud_provider, _reranker_cloud_model, _reranker_local_model
    global _agro_reranker_model_path, _embedding_model, _voyage_model, _embedding_model_local
    global _cards_exclude_dirs, _cards_exclude_patterns, _cards_exclude_keywords
    global _cards_code_snippet_length, _cards_max_symbols, _cards_max_routes
    global _cards_purpose_max_length, _cards_quick_tips, _bm25_stopwords_lang

    if _config_registry is None:
        # Fallback to Pydantic defaults when registry unavailable
        # NOTE: .env is for SECRETS ONLY - config comes from agro_config.json/Pydantic
        _cards_enrich_default = DEFAULT_CONFIG.enrichment.cards_enrich_default
        _cards_max = DEFAULT_CONFIG.enrichment.cards_max
        _enrich_code_chunks = DEFAULT_CONFIG.enrichment.enrich_code_chunks
        _enrich_timeout = DEFAULT_CONFIG.enrichment.enrich_timeout
        _out_dir_base = DEFAULT_CONFIG.indexing.out_dir_base or str(Path(__file__).resolve().parents[1] / "out")
        _embedding_type = DEFAULT_CONFIG.embedding.embedding_type.lower()
        _enrich_model = DEFAULT_CONFIG.enrichment.enrich_model or DEFAULT_CONFIG.generation.gen_model
        _gen_model = DEFAULT_CONFIG.generation.gen_model
        _reranker_mode = DEFAULT_CONFIG.reranking.reranker_mode
        _reranker_cloud_provider = DEFAULT_CONFIG.reranking.reranker_cloud_provider
        _reranker_cloud_model = DEFAULT_CONFIG.reranking.reranker_cloud_model
        _reranker_local_model = DEFAULT_CONFIG.reranking.reranker_local_model
        _agro_reranker_model_path = DEFAULT_CONFIG.training.agro_reranker_model_path
        _embedding_model = DEFAULT_CONFIG.embedding.embedding_model
        _voyage_model = DEFAULT_CONFIG.embedding.voyage_model
        _embedding_model_local = DEFAULT_CONFIG.embedding.embedding_model_local
        _cards_exclude_dirs = list(DEFAULT_CONFIG.cards.exclude_dirs)
        _cards_exclude_patterns = list(DEFAULT_CONFIG.cards.exclude_patterns)
        _cards_exclude_keywords = list(DEFAULT_CONFIG.cards.exclude_keywords)
        _cards_code_snippet_length = DEFAULT_CONFIG.cards.code_snippet_length
        _cards_max_symbols = DEFAULT_CONFIG.cards.max_symbols
        _cards_max_routes = DEFAULT_CONFIG.cards.max_routes
        _cards_purpose_max_length = DEFAULT_CONFIG.cards.purpose_max_length
        _cards_quick_tips = list(DEFAULT_CONFIG.cards.quick_tips)
        _bm25_stopwords_lang = DEFAULT_CONFIG.indexing.bm25_stopwords_lang
    else:
        _cards_enrich_default = _config_registry.get_int('CARDS_ENRICH_DEFAULT', 1)
        _cards_max = _config_registry.get_int('CARDS_MAX', 100)
        _enrich_code_chunks = _config_registry.get_int('ENRICH_CODE_CHUNKS', 1)
        _enrich_timeout = _config_registry.get_int('ENRICH_TIMEOUT', 30)
        _out_dir_base = _config_registry.get_str('OUT_DIR_BASE', str(Path(__file__).resolve().parents[1] / "out"))
        _embedding_type = _config_registry.get_str('EMBEDDING_TYPE', 'openai').lower()
        _enrich_model = _config_registry.get_str('ENRICH_MODEL', '') or _config_registry.get_str('GEN_MODEL', 'gpt-4o-mini')
        _gen_model = _config_registry.get_str('GEN_MODEL', 'gpt-4o-mini')
        _reranker_mode = _config_registry.get_str('RERANKER_MODE', 'none')
        _reranker_cloud_provider = _config_registry.get_str('RERANKER_CLOUD_PROVIDER', '')
        _reranker_cloud_model = _config_registry.get_str('RERANKER_CLOUD_MODEL', 'rerank-3.5')
        _reranker_local_model = _config_registry.get_str('RERANKER_LOCAL_MODEL', '')
        _agro_reranker_model_path = _config_registry.get_str('AGRO_RERANKER_MODEL_PATH', 'models/cross-encoder-agro')
        _embedding_model = _config_registry.get_str('EMBEDDING_MODEL', 'text-embedding-3-large')
        _voyage_model = _config_registry.get_str('VOYAGE_MODEL', 'voyage-code-3')
        _embedding_model_local = _config_registry.get_str('EMBEDDING_MODEL_LOCAL', 'all-MiniLM-L6-v2')
        _cards_exclude_dirs = _coerce_list(_config_registry.get('CARDS_EXCLUDE_DIRS', _DEFAULT_CARD_FILTERS.exclude_dirs),
                                           _DEFAULT_CARD_FILTERS.exclude_dirs)
        _cards_exclude_patterns = _coerce_list(_config_registry.get('CARDS_EXCLUDE_PATTERNS', _DEFAULT_CARD_FILTERS.exclude_patterns),
                                               _DEFAULT_CARD_FILTERS.exclude_patterns)
        _cards_exclude_keywords = _coerce_list(_config_registry.get('CARDS_EXCLUDE_KEYWORDS', _DEFAULT_CARD_FILTERS.exclude_keywords),
                                               _DEFAULT_CARD_FILTERS.exclude_keywords)
        _cards_code_snippet_length = _config_registry.get_int('CARDS_CODE_SNIPPET_LENGTH', 2000)
        _cards_max_symbols = _config_registry.get_int('CARDS_MAX_SYMBOLS', 5)
        _cards_max_routes = _config_registry.get_int('CARDS_MAX_ROUTES', 5)
        _cards_purpose_max_length = _config_registry.get_int('CARDS_PURPOSE_MAX_LENGTH', 240)
        _cards_quick_tips = _coerce_list(_config_registry.get('CARDS_QUICK_TIPS', _DEFAULT_CARD_FILTERS.quick_tips),
                                         _DEFAULT_CARD_FILTERS.quick_tips)
        _bm25_stopwords_lang = _config_registry.get_str('BM25_STOPWORDS_LANG', 'en')

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
    base = Path(_out_dir_base)
    return base / "cards" / repo


def _logs_path() -> Path:
    base = Path(_out_dir_base)
    return base / "logs" / "cards_build.log"


def _model_info() -> Dict[str, str]:
    """Return current model config from Pydantic registry - no mapping logic here."""
    return {
        "embed_type": _embedding_type,
        "embed_model": _embedding_model,
        "embed_model_voyage": _voyage_model,
        "embed_model_local": _embedding_model_local,
        "enrich": str(_enrich_model),
        "rerank_mode": _reranker_mode,
        "rerank_cloud_provider": _reranker_cloud_provider,
        "rerank_cloud_model": _reranker_cloud_model,
        "rerank_local_model": _reranker_local_model,
        "rerank_learning_model": _agro_reranker_model_path,
    }


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

            max_chunks = _cards_max
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
                        # Get semantic cards prompt from config (or use default)
                        # Using same prompt as indexer/build_cards.py for consistency
                        default_prompt = (
                            "Analyze this code chunk and create a comprehensive JSON summary for code search. "
                            "Focus on WHAT the code does (business purpose) and HOW it works (technical details). "
                            "Include all important symbols, patterns, and domain concepts.\n\n"
                            "JSON format:\n"
                            "{\n"
                            "  \"symbols\": [\"function_name\", \"class_name\", \"variable_name\"],\n"
                            "  \"purpose\": \"Clear business purpose - what problem this solves\",\n"
                            "  \"technical_details\": \"Key technical implementation details\",\n"
                            "  \"domain_concepts\": [\"business_term1\", \"business_term2\"],\n"
                            "  \"routes\": [\"api/endpoint\", \"webhook/path\"],\n"
                            "  \"dependencies\": [\"external_service\", \"library\"],\n"
                            "  \"patterns\": [\"design_pattern\", \"architectural_concept\"]\n"
                            "}\n\n"
                            "Focus on:\n"
                            "- Domain-specific terminology and concepts from this codebase\n"
                            "- Technical patterns and architectural decisions\n"
                            "- Business logic and problem being solved\n"
                            "- Integration points, APIs, and external services\n"
                            "- Key algorithms, data structures, and workflows\n\n"
                        )
                        prompt = _config_registry.get_str('PROMPT_SEMANTIC_CARDS', default_prompt) if _config_registry else default_prompt
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
                    # Create rich text representation for BM25 indexing (matching indexer/build_cards.py format)
                    text_parts = [
                        ' '.join(card.get('symbols', [])),
                        card.get('purpose', ''),
                        card.get('technical_details', ''),
                        ' '.join(card.get('domain_concepts', [])),
                        ' '.join(card.get('routes', [])),
                        ' '.join(card.get('dependencies', [])),
                        ' '.join(card.get('patterns', [])),
                        fp
                    ]
                    text_out = ' '.join(filter(None, text_parts))
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
                # Load BM25 parameters from config
                from server.services.config_registry import get_config_registry
                cfg = get_config_registry()

                # Config-driven tokenization
                tokenizer_type = cfg.get_str('BM25_TOKENIZER', 'stemmer').lower()
                stemmer_lang = cfg.get_str('BM25_STEMMER_LANG', 'english')
                stopwords_lang = cfg.get_str('BM25_STOPWORDS_LANG', 'en')

                if tokenizer_type == 'whitespace':
                    tok = Tokenizer(stemmer=None, stopwords=[], splitter=r"\s+")
                else:
                    stemmer = Stemmer(stemmer_lang)
                    tok = Tokenizer(stemmer=stemmer, stopwords=stopwords_lang)

                docs = [ln.strip() for ln in paths["cards_txt"].read_text(encoding="utf-8").splitlines() if ln.strip()]
                tokens = tok.tokenize(docs)

                bm25_k1 = cfg.get_float('BM25_K1', 1.2)
                bm25_b = cfg.get_float('BM25_B', 0.4)
                
                retriever = bm25s.BM25(method="lucene", k1=bm25_k1, b=bm25_b)
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
                exclude_dirs=list(exclude_dirs) if exclude_dirs is not None else list(_cards_exclude_dirs),
                exclude_patterns=list(exclude_patterns) if exclude_patterns is not None else list(_cards_exclude_patterns),
                exclude_keywords=list(exclude_keywords) if exclude_keywords is not None else list(_cards_exclude_keywords)
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


def get_card_filter_defaults() -> Dict[str, List[str]]:
    """Expose current default card filters for API/UI consumption."""
    return {
        "exclude_dirs": list(_cards_exclude_dirs),
        "exclude_patterns": list(_cards_exclude_patterns),
        "exclude_keywords": list(_cards_exclude_keywords),
    }
