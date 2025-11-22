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

PROMPT = (
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
    "- Domain-specific terms (camera, plugin, device, homekit, etc.)\n"
    "- Technical patterns (streaming, detection, automation)\n"
    "- Business logic (what problem does this solve?)\n"
    "- Integration points (APIs, protocols, services)\n\n"
)

def iter_chunks() -> Iterator[Dict]:
    with open(CHUNKS, 'r', encoding='utf-8') as f:
        for line in f:
            o = json.loads(line)
            yield o

def main() -> None:
    os.makedirs(BASE, exist_ok=True)
    
    # Add domain context based on repo
    domain_context = ""
    if REPO == '':
        domain_context = "\nDOMAIN CONTEXT: This is  - a smart home automation platform. Focus on:\n- Plugin architecture (device plugins, automation plugins)\n- Camera/streaming functionality (RTSP, ONVIF, FFmpeg)\n- HomeKit integration and device bridging\n- Motion detection and AI analysis\n- Webhook notifications and automation rules\n- Device management and discovery\n\n"
    elif REPO == 'agro':
        domain_context = "\nDOMAIN CONTEXT: This is AGRO - a RAG (Retrieval Augmented Generation) system. Focus on:\n- Vector search and embedding models\n- Hybrid retrieval (BM25 + dense vectors)\n- Code chunking and semantic analysis\n- MCP (Model Context Protocol) integration\n- Evaluation and performance optimization\n- Multi-repository routing and indexing\n\n"
    
    n = 0
    with open(CARDS, 'w', encoding='utf-8') as out_json, open(CARDS_TXT, 'w', encoding='utf-8') as out_txt:
        for ch in iter_chunks():
            code = ch.get('code','')
            fp = ch.get('file_path','')
            snippet = code[:2000]
            msg = PROMPT + domain_context + snippet
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
        stemmer = Stemmer('english')
        tok = Tokenizer(stemmer=stemmer, stopwords='en')
        with open(CARDS_TXT,'r',encoding='utf-8') as f:
            docs = [line.strip() for line in f if line.strip()]
        tokens = tok.tokenize(docs)
        retriever = bm25s.BM25(method='lucene', k1=1.2, b=0.65)
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
