import os
import re
import hashlib
import logging
from typing import Dict, List, Optional

try:
    from tree_sitter_languages import get_parser as _ts_get_parser  # type: ignore
except Exception:
    _ts_get_parser = None

logger = logging.getLogger("agro.ast_chunker")

LANG_MAP = {
    ".py": "python", ".js": "javascript", ".jsx": "javascript",
    ".ts": "typescript", ".tsx": "typescript",
    ".go": "go", ".java": "java", ".rs": "rust",
    ".c": "c", ".h": "c", ".cpp": "cpp", ".cc": "cpp", ".hpp": "cpp",
    ".sh": "bash", ".bash": "bash",
    ".txt": "text",  # For requirements.txt, exclude_globs.txt, etc.
    ".yml": "yaml", ".yaml": "yaml",
    ".md": "markdown",
}

OVERLAP_LINES = 20

FUNC_NODES = {
    "python": {"function_definition", "class_definition"},
    "javascript": {"function_declaration", "class_declaration", "method_definition", "arrow_function"},
    "typescript": {"function_declaration", "class_declaration", "method_signature", "method_definition", "arrow_function"},
    "go": {"function_declaration", "method_declaration"},
    "java": {"class_declaration", "method_declaration"},
    "rust": {"function_item", "impl_item"},
    "c": {"function_definition"},
    "cpp": {"function_definition", "class_specifier"},
    "bash": {"function_definition"},
}

IMPORT_NODES = {
    "python": {"import_statement", "import_from_statement"},
    "javascript": {"import_declaration"},
    "typescript": {"import_declaration"},
    "go": {"import_declaration"},
    "java": {"import_declaration"},
    "rust": {"use_declaration"},
    "c": set(), "cpp": set(),
    "bash": {"command"},  # bash uses 'source' or '.' for imports
}

def lang_from_path(path:str)->Optional[str]:
    _, ext = os.path.splitext(path)
    return LANG_MAP.get(ext.lower())

def nonws_len(s:str)->int:
    return len(re.sub(r"\s+", "", s))

def extract_imports(src:str, lang:str)->List[str]:
    try:
        if _ts_get_parser is None:
            raise RuntimeError("tree_sitter_languages not available")
        parser = _ts_get_parser(lang)
        tree = parser.parse(bytes(src, "utf-8"))
        imports = []
        def walk(n):
            if n.type in IMPORT_NODES.get(lang, set()):
                imports.append(src[n.start_byte:n.end_byte])
            for c in n.children:
                walk(c)
        walk(tree.root_node)
        return imports
    except Exception:
        if lang == "python":
            return re.findall(r"^(?:from\s+[^\n]+|import\s+[^\n]+)$", src, flags=re.M)
        if lang in {"javascript","typescript"}:
            return re.findall(r"^import\s+[^\n]+;$", src, flags=re.M)
        return []

def greedy_fallback(src:str, fpath:str, lang:str, target:int, max_tokens:Optional[int]=None, provider:str="openai")->List[Dict]:
    """Fallback chunker using regex splits with token validation.

    Args:
        src: Source code to chunk
        fpath: File path for metadata
        lang: Programming language
        target: Target non-whitespace character count
        max_tokens: Maximum tokens per chunk (if specified, validates and splits oversized chunks)
        provider: Provider for token counting (openai, voyage, etc)

    Returns:
        List of chunk dictionaries, all guaranteed to be under max_tokens if specified
    """
    sep = r"(?:\nclass\s+|\ndef\s+)" if lang=="python" else r"(?:\nclass\s+|\nfunction\s+)"
    parts = re.split(sep, src)

    # Build initial chunks
    raw_chunks: List[Dict] = []

    if len(parts) < 2:
        # No class/function boundaries found - split by character count
        out: List[str] = []
        cur: List[str] = []
        acc = 0
        for line in src.splitlines(True):
            cur.append(line)
            acc += nonws_len(line)
            if acc >= target:
                out.append("".join(cur))
                cur = []
                acc = 0
        if cur:
            out.append("".join(cur))
        raw_chunks = [{
            "id": hashlib.md5((fpath+str(i)+s[:80]).encode()).hexdigest()[:12],
            "file_path": fpath, "language": lang, "type":"blob","name":None,
            "start_line": 1, "end_line": s.count("\n")+1, "imports": extract_imports(src, lang), "code": s
        } for i, s in enumerate(out)]
    else:
        # Has class/function boundaries - rejoin small parts
        rejoined: List[str] = []
        buf: List[str] = []
        acc = 0
        for p in parts:
            if acc + nonws_len(p) > target and buf:
                s: str = "".join(buf)
                rejoined.append(s)
                buf = []
                acc = 0
            buf.append(p)
            acc += nonws_len(p)
        if buf:
            rejoined.append("".join(buf))
        raw_chunks = [{
            "id": hashlib.md5((fpath+str(i)+s[:80]).encode()).hexdigest()[:12],
            "file_path": fpath, "language": lang, "type":"section","name":None,
            "start_line": 1, "end_line": s.count("\n")+1, "imports": extract_imports(s, lang), "code": s
        } for i,s in enumerate(rejoined)]

    # If no token limit specified, return raw chunks
    if not max_tokens:
        return raw_chunks

    # Token validation - split oversized chunks
    from common.token_utils import get_token_counter
    counter = get_token_counter(provider)
    validated_chunks: List[Dict] = []

    for chunk in raw_chunks:
        token_count = counter.count_tokens(chunk['code'])

        if token_count <= max_tokens:
            validated_chunks.append(chunk)
        else:
            # Chunk exceeds token limit - split it further
            logger.warning(
                f"⚠️  greedy_fallback: Chunk in {fpath} exceeds {max_tokens} tokens "
                f"({token_count} tokens), splitting with smaller target..."
            )
            # Recursively split with smaller target until under limit
            smaller_target = target // 2
            min_target = 100  # Don't go below 100 chars

            pending_code = [chunk['code']]
            while pending_code and smaller_target >= min_target:
                code = pending_code.pop(0)
                code_tokens = counter.count_tokens(code)

                if code_tokens <= max_tokens:
                    # Small enough now
                    validated_chunks.append({
                        "id": hashlib.md5((fpath+str(len(validated_chunks))+code[:80]).encode()).hexdigest()[:12],
                        "file_path": fpath, "language": lang, "type": chunk['type'], "name": None,
                        "start_line": chunk['start_line'], "end_line": chunk['start_line'] + code.count("\n"),
                        "imports": chunk.get('imports', []), "code": code
                    })
                else:
                    # Still too big - split by lines
                    lines = code.splitlines(True)
                    mid = len(lines) // 2
                    if mid > 0:
                        first_half = "".join(lines[:mid])
                        second_half = "".join(lines[mid:])
                        if first_half.strip():
                            pending_code.append(first_half)
                        if second_half.strip():
                            pending_code.append(second_half)
                    else:
                        # Single line that's too long - truncate with warning
                        logger.error(
                            f"❌ greedy_fallback: Single line in {fpath} exceeds {max_tokens} tokens "
                            f"({code_tokens} tokens) - this will cause embedding truncation!"
                        )
                        validated_chunks.append({
                            "id": hashlib.md5((fpath+str(len(validated_chunks))+code[:80]).encode()).hexdigest()[:12],
                            "file_path": fpath, "language": lang, "type": chunk['type'], "name": None,
                            "start_line": chunk['start_line'], "end_line": chunk['start_line'] + code.count("\n"),
                            "imports": chunk.get('imports', []), "code": code
                        })

    return validated_chunks

def collect_files(roots:List[str])->List[str]:
    import fnmatch
    out=[]
    skip_dirs = {".git","node_modules",".venv","venv","dist","build","__pycache__",".next",".turbo",".parcel-cache",".pytest_cache","vendor","third_party",".bundle","Pods"}
    exclude_patterns = []
    for root in roots:
        parent_dir = os.path.dirname(root) if os.path.isfile(root) else root
        exclude_file = os.path.join(parent_dir, 'data', 'exclude_globs.txt')
        if os.path.exists(exclude_file):
            try:
                with open(exclude_file, 'r') as f:
                    patterns = [line.strip() for line in f if line.strip() and not line.startswith('#')]
                    exclude_patterns.extend(patterns)
            except Exception:
                pass
    for root in roots:
        for dp, dns, fns in os.walk(root):
            dns[:] = [d for d in dns if d not in skip_dirs and not d.startswith('.venv') and not d.startswith('venv')]
            for fn in fns:
                p = os.path.join(dp, fn)
                skip = False
                for pattern in exclude_patterns:
                    if fnmatch.fnmatch(p, pattern) or fnmatch.fnmatch(os.path.relpath(p, root), pattern):
                        skip = True
                        break
                if not skip and lang_from_path(p):
                    out.append(p)
    return out

def _guess_name(lang:str, text:str)->Optional[str]:
    if lang=="python":
        m = re.search(r"^(?:def|class)\s+([A-Za-z_][A-Za-z0-9_]*)", text, flags=re.M)
        return m.group(1) if m else None
    if lang in {"javascript","typescript"}:
        m = re.search(r"^(?:function|class)\s+([A-Za-z_$][A-Za-z0-9_$]*)", text, flags=re.M)
        return m.group(1) if m else None
    return None

def chunk_code(
    src: str,
    fpath: str,
    lang: str,
    target: int = 900,
    max_tokens: Optional[int] = None,
    provider: str = "openai"
) -> List[Dict]:
    """Chunk code with optional token limit awareness.

    Args:
        src: Source code to chunk
        fpath: File path for metadata
        lang: Programming language
        target: Target non-whitespace character count
        max_tokens: Maximum tokens per chunk (from provider limits)
        provider: Provider for token counting (openai, voyage, etc)

    Returns:
        List of chunk dictionaries
    """
    try:
        if _ts_get_parser is None:
            raise RuntimeError("tree_sitter_languages not available")
        parser = _ts_get_parser(lang)
        tree = parser.parse(bytes(src, "utf-8"))
        wanted = FUNC_NODES.get(lang, set())
        nodes = []
        stack = [tree.root_node]
        while stack:
            n = stack.pop()
            if n.type in wanted:
                nodes.append(n)
            stack.extend(n.children)
        if not nodes:
            return greedy_fallback(src, fpath, lang, target, max_tokens=max_tokens, provider=provider)
        chunks: List[Dict] = []
        all_lines = src.splitlines()
        for i, n in enumerate(nodes):
            text = src[n.start_byte:n.end_byte]
            if nonws_len(text) > target:
                for j, sub in enumerate(greedy_fallback(text, fpath, lang, target, max_tokens=max_tokens, provider=provider)):
                    sub["id"] = hashlib.md5((fpath+f"/{i}:{j}"+sub["code"][:80]).encode()).hexdigest()[:12]
                    sub["start_line"] = n.start_point[0]+1
                    sub["end_line"] = sub["start_line"] + sub["code"].count("\n")
                    chunks.append(sub)
            else:
                name = _guess_name(lang, text)
                start_line = n.start_point[0] + 1
                end_line = n.end_point[0] + 1
                actual_start = max(1, start_line - OVERLAP_LINES) if OVERLAP_LINES > 0 else start_line
                chunk_text = "\n".join(all_lines[actual_start-1:end_line])
                chunks.append({
                    "id": hashlib.md5((fpath+str(i)+text[:80]).encode()).hexdigest()[:12],
                    "file_path": fpath,
                    "language": lang,
                    "type": "unit",
                    "name": name,
                    "start_line": actual_start,
                    "end_line": end_line,
                    "imports": extract_imports(src, lang),
                    "code": chunk_text,
                })

        # Validate token limits if specified
        if max_tokens:
            from common.token_utils import get_token_counter

            counter = get_token_counter(provider)
            validated_chunks: List[Dict] = []

            for chunk in chunks:
                token_count = counter.count_tokens(chunk['code'])

                if token_count <= max_tokens:
                    validated_chunks.append(chunk)
                else:
                    # Split oversized chunk using greedy fallback
                    logger.warning(
                        f"⚠️  Chunk in {fpath}:{chunk.get('start_line')} exceeds {max_tokens} tokens "
                        f"({token_count} tokens), splitting..."
                    )
                    # Use greedy fallback to split the chunk further
                    # Recursively split until all chunks are under max_tokens
                    pending = greedy_fallback(chunk['code'], fpath, lang, target // 2)
                    while pending:
                        sub_chunk = pending.pop(0)
                        sub_chunk.update({
                            "file_path": fpath,
                            "language": lang,
                            "imports": chunk.get("imports", [])
                        })
                        sub_tokens = counter.count_tokens(sub_chunk['code'])
                        if sub_tokens <= max_tokens:
                            validated_chunks.append(sub_chunk)
                        else:
                            # Still too big - split again more aggressively
                            logger.warning(
                                f"⚠️  Sub-chunk still exceeds {max_tokens} tokens "
                                f"({sub_tokens} tokens), splitting again..."
                            )
                            smaller = greedy_fallback(sub_chunk['code'], fpath, lang, target // 4)
                            pending.extend(smaller)

            return validated_chunks

        return chunks
    except Exception as e:
        # LOG THE ERROR - never silently swallow exceptions!
        logger.warning(
            f"⚠️  AST parsing failed for {fpath} ({lang}): {type(e).__name__}: {e}. "
            f"Falling back to greedy chunker."
        )
        return greedy_fallback(src, fpath, lang, target, max_tokens=max_tokens, provider=provider)

