import os, operator
from typing import List, Dict, TypedDict, Annotated
from pathlib import Path
from dotenv import load_dotenv, find_dotenv

# Initialize LangTrace FIRST (before any LLM/LangGraph imports)
try:
    from langtrace_python_sdk import langtrace
    langtrace.init(api_key=os.getenv('LANGTRACE_API_KEY', '0b20be5d3e82b7c514cd1bea1fa583f92683e55ebe895452ece7d9261d4412d2'))
    print("✓ LangTrace initialized for LangGraph observability")
except Exception as e:
    print(f"⚠ LangTrace init failed: {e}")

from langgraph.graph import END, StateGraph
from langgraph.checkpoint.redis import RedisSaver
from retrieval.hybrid_search import search_routed_multi as hybrid_search_routed_multi
from server.tracing import get_trace
from server.env_model import generate_text
from server.index_stats import get_index_stats

# Load environment from repo root .env without hard-coded paths
try:
    # Load any existing env first
    load_dotenv(override=False)
    repo_root = Path(__file__).resolve().parent
    env_path = repo_root / ".env"
    if env_path.exists():
        load_dotenv(dotenv_path=env_path, override=False)
    else:
        alt = find_dotenv(usecwd=True)
        if alt:
            load_dotenv(dotenv_path=alt, override=False)
except Exception:
    pass

class RAGState(TypedDict):
    question: str
    documents: Annotated[List[Dict], operator.add]
    generation: str
    iteration: int
    confidence: float
    repo: str

def should_use_multi_query(question: str) -> bool:
    q = (question or '').lower().strip()
    if len(q.split()) <= 3:
        return False
    for w in ("how", "why", "explain", "compare", "tradeoff"):
        if w in q:
            return True
    return False

def retrieve_node(state: RAGState) -> Dict:
    q = state['question']
    repo = state.get('repo') if isinstance(state, dict) else None
    mq = int(os.getenv('MQ_REWRITES','2')) if should_use_multi_query(q) else 1
    tr = get_trace()
    docs = hybrid_search_routed_multi(q, repo_override=repo, m=mq, final_k=int(os.getenv('LANGGRAPH_FINAL_K','20') or 20), trace=tr)
    conf = float(sum(d.get('rerank_score',0.0) for d in docs)/max(1,len(docs)))
    repo_used = (repo or (docs[0].get('repo') if docs else os.getenv('REPO','project')))
    # freshness snapshot (per-request)
    try:
        from server.index_stats import get_index_stats
        stats = get_index_stats()
        if tr is not None:
            tr.add('freshness.status', {
                'bm25_updated': stats.get('timestamp'),
                'cards_updated': None,
                'dense_updated_min': stats.get('timestamp'),
                'dense_updated_max': stats.get('timestamp'),
                'dense_backlog': 0,
                'vector_backend': (os.getenv('VECTOR_BACKEND','qdrant') or 'qdrant'),
            })
    except Exception:
        pass
    return {'documents': docs, 'confidence': conf, 'iteration': state.get('iteration',0)+1, 'repo': repo_used}

def route_after_retrieval(state:RAGState)->str:
    conf = float(state.get("confidence", 0.0) or 0.0)
    it = int(state.get("iteration", 0) or 0)
    docs = state.get("documents", []) or []
    scores = sorted([float(d.get("rerank_score",0.0) or 0.0) for d in docs], reverse=True)
    top1 = scores[0] if scores else 0.0
    avg5 = (sum(scores[:5])/min(5, len(scores))) if scores else 0.0
    try:
        CONF_TOP1 = float(os.getenv('CONF_TOP1', '0.62'))
        CONF_AVG5 = float(os.getenv('CONF_AVG5', '0.55'))
        CONF_ANY = float(os.getenv('CONF_ANY', '0.55'))
    except Exception:
        CONF_TOP1, CONF_AVG5, CONF_ANY = 0.62, 0.55, 0.55
    # Decide next step
    if top1 >= CONF_TOP1 or avg5 >= CONF_AVG5 or conf >= CONF_ANY:
        decision = "generate"
    elif it >= 3:
        decision = "fallback"
    else:
        decision = "rewrite_query"

    # add trace of gating decision (include outcome + thresholds)
    try:
        from server.tracing import get_trace
        tr = get_trace()
        if tr is not None:
            tr.add('gating.outcome', {
                'confidence_top1': top1,
                'confidence_avg5': avg5,
                'thresholds': {'top1': CONF_TOP1, 'avg5': CONF_AVG5, 'any': CONF_ANY},
                'iterated': it > 0,
                'outcome': decision,
                'notes': ''
            })
    except Exception:
        pass
    return decision

def rewrite_query(state: RAGState) -> Dict:
    q = state['question']
    sys = "You rewrite developer questions into search-optimized queries without changing meaning."
    user = f"Rewrite this for code search (expand CamelCase, include API nouns), one line.\n\n{q}"
    newq, _ = generate_text(user_input=user, system_instructions=sys, reasoning_effort=None)
    newq = (newq or '').strip()
    return {'question': newq}

def generate_node(state: RAGState) -> Dict:
    q = state['question']; ctx = state['documents'][:5]
    # packer summary for trace
    try:
        tr = get_trace()
        if tr is not None:
            budget = int(os.getenv('PACK_BUDGET_TOKENS', '4096') or 4096)
            selected = []
            for d in ctx:
                sel = {
                    'path': d.get('file_path'),
                    'lines': f"L{d.get('start_line')}-L{d.get('end_line')}",
                    'est_tokens': int(len((d.get('code') or ''))/4),
                    'reason': ['high_rerank']
                }
                selected.append(sel)
            tr.add('packer.pack', {
                'budget_tokens': budget,
                'diversity_penalty': 0.0,
                'hydration_mode': (os.getenv('HYDRATION_MODE','lazy') or 'lazy'),
                'selected': selected,
                'final_tokens': sum(s['est_tokens'] for s in selected)
            })
    except Exception:
        pass
    ql = (q or '').lower()
    if any(kw in ql for kw in ("last index", "last indexed", "when was this indexed", "when indexed", "index time")):
        stats = get_index_stats()
        repo_hdr = state.get('repo') or os.getenv('REPO','project')
        paths = None
        for r in stats.get('repos', []):
            if str(r.get('name')) == str(repo_hdr):
                paths = r.get('paths', {})
                break
        lines = []
        lines.append(f"Most recent index: {stats.get('timestamp','unknown')}")
        if paths and (paths.get('chunks') or paths.get('bm25')):
            if paths.get('chunks'):
                lines.append(f"chunks.jsonl: {paths['chunks']}")
            if paths.get('bm25'):
                lines.append(f"bm25_index: {paths['bm25']}")
        content = "\n".join(lines)
        header = f"[repo: {repo_hdr}]"
        return {'generation': header + "\n" + content}
    def _cite(d):
        mark = " (card)" if d.get('card_hit') else ""
        return f"- {d['file_path']}:{d['start_line']}-{d['end_line']}{mark}"
    citations = "\n".join([_cite(d) for d in ctx])
    context_text = "\n\n".join([d.get('code','') for d in ctx])
    # Use custom system prompt if provided, otherwise use default
    sys = os.getenv('SYSTEM_PROMPT') or '''You are an expert software engineer and smart home automation specialist with deep knowledge of both AGRO (Retrieval-Augmented Generation) systems and  plugin development.

## Your Expertise:

###  Plugin Development:
- **Plugin Architecture**: Expert in creating device plugins, automation plugins, and integration plugins for the  smart home platform
- **Device Interfaces**: Deep understanding of Interface types (Camera, MotionSensor, BinarySensor, Switch, Lock, Thermostat, etc.)
- **Protocols & Communication**: 
  - **WebRTC**: Real-time video streaming, peer connections, data channels
  - **RTSP**: Real-Time Streaming Protocol for IP cameras
  - **ONVIF**: Network video interface standard
  - **HTTP/HTTPS**: REST APIs, webhooks, authentication
  - **MQTT**: Message queuing for IoT devices
  - **WebSockets**: Real-time bidirectional communication
  - **FFmpeg**: Video processing, transcoding, streaming
- **Smart Home Integration**: HomeKit, Alexa, Google Assistant, Home Assistant
- **AI & Computer Vision**: Motion detection, object recognition, face detection
- **Device Management**: Discovery, pairing, state management, event handling

### AGRO RAG System:
- **Hybrid Search**: BM25 + dense vector retrieval with reranking
- **Vector Databases**: Qdrant, embeddings, semantic search
- **Code Analysis**: AST chunking, semantic cards, keyword generation
- **Multi-Repository**: Routing, indexing, evaluation systems
- **MCP Integration**: Model Context Protocol for AI agents

## Your Role:
- Answer questions about both AGRO and  codebases with expert precision
- Help developers create robust, efficient  plugins for any device type
- Provide guidance on protocol implementation, interface design, and best practices
- Always cite specific file paths and line ranges from the provided code context
- Offer practical, production-ready solutions with error handling and edge cases

## Response Style:
- Be direct and technical, but accessible
- Include relevant code examples when helpful
- Explain the "why" behind recommendations
- Consider performance, security, and maintainability
- Always ground answers in the actual codebase when available

You answer strictly from the provided code context. Always cite file paths and line ranges you used.'''
    user = f"Question:\n{q}\n\nContext:\n{context_text}\n\nCitations (paths and line ranges):\n{citations}\n\nAnswer:"
    content, _ = generate_text(user_input=user, system_instructions=sys, reasoning_effort=None)
    content = content or ''
    conf = float(state.get('confidence', 0.0) or 0.0)
    if conf < 0.55:
        repo = state.get('repo') or os.getenv('REPO','project')
        alt_docs = hybrid_search_routed_multi(q, repo_override=repo, m=4, final_k=10)
        if alt_docs:
            ctx2 = alt_docs[:5]
            citations2 = "\n".join([f"- {d['file_path']}:{d['start_line']}-{d['end_line']}" + (" (card)" if d.get('card_hit') else "") for d in ctx2])
            context_text2 = "\n\n".join([d.get('code','') for d in ctx2])
            user2 = f"Question:\n{q}\n\nContext:\n{context_text2}\n\nCitations (paths and line ranges):\n{citations2}\n\nAnswer:"
            # Use same system prompt as first generation attempt
            sys2 = os.getenv('SYSTEM_PROMPT') or '''You are an expert software engineer and smart home automation specialist with deep knowledge of both AGRO (Retrieval-Augmented Generation) systems and  plugin development.

## Your Expertise:

###  Plugin Development:
- **Plugin Architecture**: Expert in creating device plugins, automation plugins, and integration plugins for the  smart home platform
- **Device Interfaces**: Deep understanding of Interface types (Camera, MotionSensor, BinarySensor, Switch, Lock, Thermostat, etc.)
- **Protocols & Communication**: 
  - **WebRTC**: Real-time video streaming, peer connections, data channels
  - **RTSP**: Real-Time Streaming Protocol for IP cameras
  - **ONVIF**: Network video interface standard
  - **HTTP/HTTPS**: REST APIs, webhooks, authentication
  - **MQTT**: Message queuing for IoT devices
  - **WebSockets**: Real-time bidirectional communication
  - **FFmpeg**: Video processing, transcoding, streaming
- **Smart Home Integration**: HomeKit, Alexa, Google Assistant, Home Assistant
- **AI & Computer Vision**: Motion detection, object recognition, face detection
- **Device Management**: Discovery, pairing, state management, event handling

### AGRO RAG System:
- **Hybrid Search**: BM25 + dense vector retrieval with reranking
- **Vector Databases**: Qdrant, embeddings, semantic search
- **Code Analysis**: AST chunking, semantic cards, keyword generation
- **Multi-Repository**: Routing, indexing, evaluation systems
- **MCP Integration**: Model Context Protocol for AI agents

## Your Role:
- Answer questions about both AGRO and  codebases with expert precision
- Help developers create robust, efficient  plugins for any device type
- Provide guidance on protocol implementation, interface design, and best practices
- Always cite specific file paths and line ranges from the provided code context
- Offer practical, production-ready solutions with error handling and edge cases

## Response Style:
- Be direct and technical, but accessible
- Include relevant code examples when helpful
- Explain the "why" behind recommendations
- Consider performance, security, and maintainability
- Always ground answers in the actual codebase when available

You answer strictly from the provided code context. Always cite file paths and line ranges you used.'''
            content2, _ = generate_text(user_input=user2, system_instructions=sys2, reasoning_effort=None)
            content = (content2 or content or '')
    repo_hdr = state.get('repo') or (ctx[0].get('repo') if ctx else None) or os.getenv('REPO','project')
    header = f"[repo: {repo_hdr}]"
    return {'generation': header + "\n" + content}

def fallback_node(state: RAGState) -> Dict:
    repo_hdr = state.get('repo') or (state.get('documents', [])[0].get('repo') if state.get('documents') else None) or os.getenv('REPO','project')
    header = f"[repo: {repo_hdr}]"
    msg = "I don't have high confidence from local code. Try refining the question or expanding the context."
    return {'generation': header + "\n" + msg}

def build_graph():
    builder = StateGraph(RAGState)
    builder.add_node('retrieve', retrieve_node)
    builder.add_node('rewrite_query', rewrite_query)
    builder.add_node('generate', generate_node)
    builder.add_node('fallback', fallback_node)
    builder.set_entry_point('retrieve')
    builder.add_conditional_edges('retrieve', route_after_retrieval, {
        'generate': 'generate', 'rewrite_query': 'rewrite_query', 'fallback': 'fallback'
    })
    builder.add_edge('rewrite_query', 'retrieve')
    builder.add_edge('generate', END)
    builder.add_edge('fallback', END)
    DB_URI = os.getenv('REDIS_URL','redis://127.0.0.1:6379/0')
    try:
        checkpointer = RedisSaver(redis_url=DB_URI)
        graph = builder.compile(checkpointer=checkpointer)
    except Exception:
        graph = builder.compile()
    return graph

if __name__ == '__main__':
    import sys
    q = ' '.join(sys.argv[1:]) if len(sys.argv)>1 else 'Where is OAuth token validated?'
    graph = build_graph(); cfg = {'configurable': {'thread_id': 'dev'}}
    res = graph.invoke({'question': q, 'documents': [], 'generation':'', 'iteration':0, 'confidence':0.0}, cfg)
    print(res['generation'])
