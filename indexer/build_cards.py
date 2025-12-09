import os
import json
from typing import Dict, Iterator
from dotenv import load_dotenv
from server.env_model import generate_text
from common.config_loader import out_dir

load_dotenv()

# Module-level cached configuration
try:
    from server.services.config_registry import get_config_registry
    _config_registry = get_config_registry()
except ImportError:
    _config_registry = None

# REPO is infrastructure (not tunable) - keep as env var
REPO = os.getenv('REPO','project').strip()

# CARDS_MAX is tunable - load from config registry
if _config_registry is not None:
    MAX_CHUNKS = _config_registry.get_int('CARDS_MAX', 100)
else:
    MAX_CHUNKS = int(os.getenv('CARDS_MAX') or '0')

BASE = out_dir(REPO)
CHUNKS = os.path.join(BASE, 'chunks.jsonl')
CARDS = os.path.join(BASE, 'cards.jsonl')
CARDS_TXT = os.path.join(BASE, 'cards.txt')
INDEX_DIR = os.path.join(BASE, 'bm25_cards')

# Default semantic cards prompt
_DEFAULT_SEMANTIC_CARDS_PROMPT = (
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

# Get semantic cards prompt from config (or use default)
if _config_registry is not None:
    PROMPT = _config_registry.get_str('PROMPT_SEMANTIC_CARDS', _DEFAULT_SEMANTIC_CARDS_PROMPT)
else:
    PROMPT = _DEFAULT_SEMANTIC_CARDS_PROMPT

def iter_chunks() -> Iterator[Dict]:
    with open(CHUNKS, 'r', encoding='utf-8') as f:
        for line in f:
            o = json.loads(line)
            yield o

def main() -> None:
    os.makedirs(BASE, exist_ok=True)
    
    # Domain context is now generic - the prompt itself is sufficient
    n = 0
    with open(CARDS, 'w', encoding='utf-8') as out_json, open(CARDS_TXT, 'w', encoding='utf-8') as out_txt:
        for ch in iter_chunks():
            code = ch.get('code','')
            fp = ch.get('file_path','')
            snippet = code[:2000]
            msg = PROMPT + snippet
            try:
                text, _ = generate_text(user_input=msg, system_instructions=None, reasoning_effort=None, response_format={"type": "json_object"})
                content = (text or '').strip()
                card: Dict = json.loads(content) if content else {"symbols": [], "purpose": "", "routes": []}
            except Exception:
                card = {"symbols": [], "purpose": "", "routes": []}
            card['file_path'] = fp
            card['id'] = ch.get('id')
            out_json.write(json.dumps(card, ensure_ascii=False) + '\n')
            # Create rich text representation for BM25 indexing
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
            out_txt.write(text_out.replace('\n',' ') + '\n')
            n += 1
            if MAX_CHUNKS and n >= MAX_CHUNKS:
                break
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

        with open(CARDS_TXT,'r',encoding='utf-8') as f:
            docs = [line.strip() for line in f if line.strip()]
        tokens = tok.tokenize(docs)

        bm25_k1 = cfg.get_float('BM25_K1', 1.2)
        bm25_b = cfg.get_float('BM25_B', 0.4)
        
        retriever = bm25s.BM25(method='lucene', k1=bm25_k1, b=bm25_b)
        retriever.index(tokens)
        try:
            retriever.vocab_dict = {str(k): v for k, v in retriever.vocab_dict.items()}
        except Exception:
            pass
        os.makedirs(INDEX_DIR, exist_ok=True)
        retriever.save(INDEX_DIR, corpus=docs)
        tok.save_vocab(save_dir=INDEX_DIR)
        tok.save_stopwords(save_dir=INDEX_DIR)
        print(f"Built cards BM25 index with {len(docs)} docs at {INDEX_DIR}")
    except Exception as e:
        print('BM25 build failed:', e)

if __name__ == '__main__':
    main()
