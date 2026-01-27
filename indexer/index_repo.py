"""Clean RAG Indexer - v2 Rewrite

Simple, working indexer that:
1. Chunks source files
2. Builds BM25 index  
3. Embeds and stores in Qdrant
4. Ensures consistent IDs between BM25 and Qdrant
"""

import os
import json
import hashlib
import logging
from pathlib import Path
from typing import List, Dict
from datetime import datetime

logger = logging.getLogger("agro.indexer")

# BM25
import bm25s
from bm25s.tokenization import Tokenizer
from Stemmer import Stemmer

# Qdrant
from qdrant_client import QdrantClient, models
import uuid

# Local imports
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from common.config_loader import _get_repo_paths_raw, out_dir, exclude_paths
from common.filtering import PRUNE_DIRS
from retrieval.ast_chunker import collect_files, chunk_code, lang_from_path
from server.services.config_registry import get_config_registry

# Config
_cfg = get_config_registry()
REPO = _cfg.get_str('REPO', 'agro')
QDRANT_URL = _cfg.get_str('QDRANT_URL', 'http://127.0.0.1:6333')
COLLECTION = _cfg.get_str('COLLECTION_NAME', f'code_chunks_{REPO}')
EMBEDDING_TYPE = _cfg.get_str('EMBEDDING_TYPE', 'openai').lower()
EMBEDDING_MODEL = _cfg.get_str('EMBEDDING_MODEL', 'text-embedding-3-large')
EMBEDDING_MODEL_LOCAL = _cfg.get_str('EMBEDDING_MODEL_LOCAL', 'BAAI/bge-small-en-v1.5')
VOYAGE_MODEL = _cfg.get_str('VOYAGE_MODEL', 'voyage-code-3')
SKIP_DENSE = _cfg.get_bool('SKIP_DENSE', False)
INDEX_MAX_FILE_SIZE_MB = _cfg.get_int('INDEX_MAX_FILE_SIZE_MB', 10)
MAX_FILE_SIZE_BYTES = INDEX_MAX_FILE_SIZE_MB * 1_000_000
INDEX_EXCLUDED_EXTS = {
    e.strip().lower()
    for e in _cfg.get_str('INDEX_EXCLUDED_EXTS', '').split(',')
    if e.strip()
}

# Get provider-specific token limits (no hardcoding!)
from common.provider_limits import get_provider_limits

provider_limits = get_provider_limits(
    provider=EMBEDDING_TYPE,
    model=EMBEDDING_MODEL if EMBEDDING_TYPE != 'local' else EMBEDDING_MODEL_LOCAL,
    config={
        'embedding_max_tokens': _cfg.get_int('EMBEDDING_MAX_TOKENS', None),
        'embedding_batch_size': _cfg.get_int('EMBEDDING_BATCH_SIZE', None),
        'embedding_dim': _cfg.get_int('EMBEDDING_DIM', None),
    }
)

MAX_TOKENS = provider_limits['max_tokens']
BATCH_SIZE = provider_limits['batch_size']
CHUNK_TARGET = _cfg.get_int('CHUNK_SIZE', 1000)
CHUNK_STRATEGY = _cfg.get_str('CHUNKING_STRATEGY', 'ast').lower()
AST_OVERLAP_LINES = _cfg.get_int('AST_OVERLAP_LINES', 20)

# File extensions to index
SOURCE_EXTS = {
    '.py', '.ts', '.tsx', '.js', '.jsx', '.go', '.rs', '.java',
    '.c', '.h', '.cpp', '.hpp', '.rb', '.sh', '.yaml', '.yml',
    '.json', '.toml', '.sql'
}

# Files to skip (descriptions/docs, not implementations)
SKIP_FILES = {
    'tooltips.js', 'tooltips.ts', 'usetooltips.ts', 'usetooltips.tsx',
}


def infer_layer_from_path(file_path: str) -> str:
    """Infer architectural layer from file path for scoring bonuses.

    Maps file paths to layer names that match repos.json layer_bonuses keys.
    This enables intent-based scoring (e.g., 'gui' queries boost 'web' files).
    """
    fp = (file_path or '').lower()

    # Web/GUI layer - frontend code
    if any(x in fp for x in ['web/', 'gui/', '.tsx', '.jsx', 'component']):
        return 'web'
    # Server layer - API/backend code (check before retrieval since server/ contains routers)
    if any(x in fp for x in ['server/', 'routers/', 'app.py', 'asgi.py']):
        return 'server'
    # Retrieval layer - search/ranking code
    if any(x in fp for x in ['retrieval/', 'hybrid_search', 'rerank']):
        return 'retrieval'
    # Indexer layer - indexing code
    if any(x in fp for x in ['indexer/', 'index_repo', 'chunker']):
        return 'indexer'
    # Eval layer - evaluation and testing
    if any(x in fp for x in ['eval/', 'tests/', 'test_', '.spec.ts']):
        return 'eval'
    # Infra layer - infrastructure/scripts
    if any(x in fp for x in ['infra/', 'scripts/', 'docker', 'compose']):
        return 'infra'
    # Common utilities
    if 'common/' in fp:
        return 'common'
    # Default
    return 'other'


def should_index(path: str, repo_excludes: List[str] = None) -> bool:
    """Check if file should be indexed."""
    p = Path(path)
    path_str = str(p)
    path_lower = path_str.lower()
    
    # Check extension
    ext = p.suffix.lower()
    if ext not in SOURCE_EXTS:
        return False
    if ext in INDEX_EXCLUDED_EXTS:
        return False
    
    # Check for skip files (tooltips, etc - descriptions not implementations)
    if p.name.lower() in SKIP_FILES:
        return False
    
    # Check for skip dirs in path parts
    for part in p.parts:
        part_lower = part.lower()
        if part_lower in PRUNE_DIRS or part_lower.startswith('.'):
            # Skip hidden dirs and known junk
            if part_lower not in {'.env'}:  # .env file is ok, but .venv dir is not
                return False
    
    # Check repo-specific excludes from repos.json
    if repo_excludes:
        for exc in repo_excludes:
            exc_lower = exc.lower().strip('/')
            # Match if exclude pattern appears in path
            if exc_lower in path_lower or f'/{exc_lower}/' in path_lower or path_lower.endswith(f'/{exc_lower}'):
                return False
    
    # Skip very large files
    try:
        if p.stat().st_size > MAX_FILE_SIZE_BYTES:
            return False
    except:
        return False
    
    return True


def get_embedding_func():
    """Return embedding function based on config.
    
    Reads EMBEDDING_TYPE and EMBEDDING_MODEL from config registry.
    """
    # Get embedding dimension from config
    embed_dim = _cfg.get_int('EMBEDDING_DIM', 3072)
    
    if EMBEDDING_TYPE == 'local':
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer(EMBEDDING_MODEL_LOCAL)
        # Local models have varying dimensions - get from model
        local_dim = model.get_sentence_embedding_dimension()

        # Use provider limits (already computed at module level)
        def embed(texts: List[str]) -> List[List[float]]:
            # Local models don't have strict API token limits
            # But batch for memory efficiency using configured batch size
            all_embs = []
            for i in range(0, len(texts), BATCH_SIZE):
                batch = texts[i:i+BATCH_SIZE]
                all_embs.extend(
                    model.encode(batch, normalize_embeddings=True, show_progress_bar=False).tolist()
                )
            return all_embs
        return embed, local_dim
    
    elif EMBEDDING_TYPE == 'voyage':
        import voyageai
        from common.token_utils import create_token_aware_batches

        client = voyageai.Client(api_key=os.getenv('VOYAGE_API_KEY'))

        # Use provider limits (already computed at module level)
        def embed(texts: List[str]) -> List[List[float]]:
            batches = create_token_aware_batches(
                texts,
                max_tokens_per_batch=MAX_TOKENS,
                max_batch_size=BATCH_SIZE,
                provider='voyage'
            )

            all_embs = []
            for batch in batches:
                r = client.embed(batch, model=VOYAGE_MODEL, input_type='document')
                all_embs.extend(r.embeddings)

            return all_embs

        return embed, provider_limits['dimensions']
    
    else:  # openai (default)
        from openai import OpenAI
        from common.token_utils import create_token_aware_batches

        client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

        # Use provider limits (already computed at module level)
        def embed(texts: List[str]) -> List[List[float]]:
            # Create token-aware batches using FFD - get indices for reordering!
            # CRITICAL: create_token_aware_batches REORDERS texts for efficient packing,
            # so we need indices to put embeddings back in original order
            batches, batch_indices = create_token_aware_batches(
                texts,
                max_tokens_per_batch=MAX_TOKENS,
                max_batch_size=BATCH_SIZE,
                provider='openai',
                return_indices=True
            )

            # Collect embeddings in batch order (will reorder at end)
            batch_embs = []  # List of (original_idx, embedding) tuples

            for i, (batch, indices) in enumerate(zip(batches, batch_indices)):
                try:
                    # Validate batch before sending
                    if not batch:
                        logger.warning(f"Skipping empty batch {i+1}/{len(batches)}")
                        continue

                    # Filter out empty strings while tracking which indices remain
                    valid_items = [(t, idx) for t, idx in zip(batch, indices) if t and t.strip()]
                    if not valid_items:
                        logger.warning(f"Skipping batch {i+1}/{len(batches)} - all texts empty")
                        continue

                    valid_batch = [t for t, _ in valid_items]
                    valid_indices = [idx for _, idx in valid_items]

                    r = client.embeddings.create(input=valid_batch, model=EMBEDDING_MODEL)

                    # Pair each embedding with its original index
                    for emb_data, orig_idx in zip(r.data, valid_indices):
                        batch_embs.append((orig_idx, emb_data.embedding))

                except Exception as e:
                    logger.error(f"Embedding failed for batch {i+1}/{len(batches)} with {len(batch)} texts")
                    logger.error(f"First text preview: {repr(batch[0][:100]) if batch else 'EMPTY'}")
                    logger.error(f"Error: {e}")
                    raise

            # CRITICAL: Reorder embeddings back to original text order
            batch_embs.sort(key=lambda x: x[0])
            all_embs = [emb for _, emb in batch_embs]

            return all_embs

        return embed, provider_limits['dimensions']


def main():
    print(f"=== Clean Indexer v2 ===")
    print(f"Repo: {REPO}")
    print(f"Embedding: {EMBEDDING_TYPE}")
    
    # Get repo paths
    try:
        bases = _get_repo_paths_raw(REPO)
    except:
        bases = [str(Path(__file__).parent.parent)]
    
    outdir = out_dir(REPO)
    os.makedirs(outdir, exist_ok=True)
    os.makedirs(os.path.join(outdir, 'bm25_index'), exist_ok=True)
    
    # Load repo-specific excludes
    repo_excludes = exclude_paths(REPO)
    print(f"Excludes: {repo_excludes}")
    
    # Collect files
    print(f"\n1. Collecting files from {bases}...")
    all_files = []
    exclude_lower = {e.lower().strip('/') for e in repo_excludes} if repo_excludes else set()
    
    for base in bases:
        for root, dirs, files in os.walk(base):
            # Aggressively prune directories
            dirs[:] = [
                d for d in dirs
                if d.lower() not in PRUNE_DIRS
                and d.lower() not in exclude_lower
                and not d.startswith('.')  # Skip all hidden dirs
            ]
            for f in files:
                fp = os.path.join(root, f)
                if should_index(fp, repo_excludes):
                    all_files.append(fp)
    
    print(f"   Found {len(all_files)} indexable files")
    
    # Chunk files
    print(f"\n2. Chunking files...")
    chunks: List[Dict] = []
    seen_hashes = set()
    
    for fp in all_files:
        lang = lang_from_path(fp)
        if not lang:
            continue
        
        try:
            with open(fp, 'r', encoding='utf-8', errors='ignore') as f:
                src = f.read()
        except:
            continue
        
        # Make path relative
        rel_path = fp
        for base in bases:
            try:
                rel_path = str(Path(fp).relative_to(base))
                break
            except ValueError:
                continue
        
        # Chunk the file with token limits
        file_chunks = chunk_code(
            src,
            rel_path,
            lang,
            target=CHUNK_TARGET,
            max_tokens=MAX_TOKENS,
            provider=EMBEDDING_TYPE,
            strategy=CHUNK_STRATEGY,
            overlap_lines=AST_OVERLAP_LINES,
        )
        
        for c in file_chunks:
            # Dedupe by content hash
            h = hashlib.md5(c['code'].encode()).hexdigest()
            if h in seen_hashes:
                continue
            seen_hashes.add(h)

            c['hash'] = h
            c['repo'] = REPO
            c['layer'] = infer_layer_from_path(rel_path)
            chunks.append(c)
    
    print(f"   Created {len(chunks)} unique chunks")
    
    # Build BM25 index
    print(f"\n3. Building BM25 index...")
    
    # Create corpus for BM25 (code + metadata)
    corpus = []
    for c in chunks:
        # Include file path and function name for better matching
        parts = []
        if c.get('name'):
            parts.append(c['name'])
        parts.append(c.get('file_path', ''))
        parts.append(c['code'])
        corpus.append(' '.join(parts))
    
    # Tokenize with config-driven stemming and stopwords
    tokenizer_type = _cfg.get_str('BM25_TOKENIZER', 'stemmer').lower()
    stemmer_lang = _cfg.get_str('BM25_STEMMER_LANG', 'english')
    stopwords_lang = _cfg.get_str('BM25_STOPWORDS_LANG', 'en')

    if tokenizer_type == 'whitespace':
        # Whitespace tokenization - no stemming, no stopwords, split on whitespace
        tokenizer = Tokenizer(stemmer=None, stopwords=[], splitter=r"\s+")
        print(f"   Using whitespace tokenizer (no stemming)")
    elif tokenizer_type == 'lowercase':
        # Lowercase tokenization - lowercasing + stopwords, no stemming
        tokenizer = Tokenizer(stemmer=None, stopwords=stopwords_lang)
        print(f"   Using lowercase tokenizer (stopwords={stopwords_lang})")
    else:
        # Stemmer tokenization - full text processing
        stemmer = Stemmer(stemmer_lang)
        tokenizer = Tokenizer(stemmer=stemmer, stopwords=stopwords_lang)
        print(f"   Using stemmer tokenizer (lang={stemmer_lang}, stopwords={stopwords_lang})")

    corpus_tokens = tokenizer.tokenize(corpus)
    
    # Build BM25 index
    bm25_k1 = _cfg.get_float('BM25_K1', 1.2)
    bm25_b = _cfg.get_float('BM25_B', 0.4)
    bm25 = bm25s.BM25(method='lucene', k1=bm25_k1, b=bm25_b)
    bm25.index(corpus_tokens)
    
    # CRITICAL: Set vocab from tokenizer
    bm25.vocab_dict = tokenizer.get_vocab_dict()
    
    # Save BM25 index
    idx_dir = os.path.join(outdir, 'bm25_index')
    bm25.save(idx_dir, corpus=corpus)
    tokenizer.save_vocab(idx_dir)
    tokenizer.save_stopwords(idx_dir)
    
    # Save chunk ID mapping (index -> chunk_id)
    chunk_ids = [c['id'] for c in chunks]
    with open(os.path.join(idx_dir, 'chunk_ids.txt'), 'w') as f:
        for cid in chunk_ids:
            f.write(f"{cid}\n")
    
    # Save as JSON too for easy loading
    id_map = {str(i): cid for i, cid in enumerate(chunk_ids)}
    with open(os.path.join(idx_dir, 'bm25_map.json'), 'w') as f:
        json.dump(id_map, f)
    
    print(f"   BM25 index saved to {idx_dir}")
    
    # Save chunks.jsonl
    chunks_path = os.path.join(outdir, 'chunks.jsonl')
    with open(chunks_path, 'w', encoding='utf-8') as f:
        for c in chunks:
            f.write(json.dumps(c, ensure_ascii=False) + '\n')
    print(f"   Chunks saved to {chunks_path}")
    
    if SKIP_DENSE:
        print(f"\n4. SKIP_DENSE=1 - skipping dense embeddings and Qdrant upsert.")
        meta = {
            'repo': REPO,
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'chunk_count': len(chunks),
            'embedding_type': EMBEDDING_TYPE,
            'embedding_dim': provider_limits.get('dimensions'),
            'skip_dense': True,
        }
        with open(os.path.join(outdir, 'last_index.json'), 'w') as f:
            json.dump(meta, f, indent=2)
        print(f"\n=== Indexing Complete (BM25-only) ===")
        print(f"Chunks: {len(chunks)}")
        print(f"Output: {outdir}")
        return

    # Embed and store in Qdrant
    print(f"\n4. Embedding and storing in Qdrant...")

    embed_func, embed_dim = get_embedding_func()

    # Filter out empty chunks BEFORE embedding to maintain alignment
    valid_chunks = [c for c in chunks if c.get('code') and c['code'].strip()]
    skipped = len(chunks) - len(valid_chunks)
    if skipped > 0:
        print(f"   Skipping {skipped} empty chunks")

    # Get texts for embedding
    texts = [c['code'] for c in valid_chunks]

    # Embed in batches
    print(f"   Embedding {len(texts)} chunks...")
    embeddings = embed_func(texts)
    print(f"   Got {len(embeddings)} embeddings (dim={embed_dim})")

    # CRITICAL: Verify alignment - embeddings must match chunks exactly
    if len(embeddings) != len(valid_chunks):
        raise RuntimeError(
            f"Embedding count mismatch! Got {len(embeddings)} embeddings for "
            f"{len(valid_chunks)} chunks. This will corrupt the index!"
        )

    # Use valid_chunks from here on
    chunks = valid_chunks
    
    # Connect to Qdrant
    qc = QdrantClient(url=QDRANT_URL)
    
    # Recreate collection
    try:
        qc.delete_collection(COLLECTION)
        print(f"   Deleted existing collection '{COLLECTION}'")
    except:
        pass
    
    qc.create_collection(
        collection_name=COLLECTION,
        vectors_config={'dense': models.VectorParams(size=embed_dim, distance=models.Distance.COSINE)}
    )
    print(f"   Created collection '{COLLECTION}'")
    
    # Upsert points
    points = []
    point_ids = []
    for i, (c, emb) in enumerate(zip(chunks, embeddings)):
        # Generate deterministic UUID from chunk ID
        pid = str(uuid.uuid5(uuid.NAMESPACE_DNS, c['id']))
        point_ids.append(pid)
        
        payload = {
            'id': c['id'],  # CRITICAL: Store chunk ID in payload
            'file_path': c.get('file_path'),
            'start_line': c.get('start_line'),
            'end_line': c.get('end_line'),
            'language': c.get('language'),
            'repo': c.get('repo'),
            'hash': c.get('hash'),
        }
        
        points.append(models.PointStruct(
            id=pid,
            vector={'dense': emb},
            payload={k: v for k, v in payload.items() if v is not None}
        ))
        
        # Batch upsert
        if len(points) >= 64:
            qc.upsert(COLLECTION, points=points)
            points = []
    
    # Final batch
    if points:
        qc.upsert(COLLECTION, points=points)
    
    print(f"   Indexed {len(chunks)} points to Qdrant")
    
    # Save point ID mapping (for reference)
    with open(os.path.join(idx_dir, 'bm25_point_ids.json'), 'w') as f:
        json.dump({str(i): pid for i, pid in enumerate(point_ids)}, f)
    
    # Save metadata
    meta = {
        'repo': REPO,
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'chunk_count': len(chunks),
        'collection': COLLECTION,
        'embedding_type': EMBEDDING_TYPE,
        'embedding_dim': embed_dim,
    }
    with open(os.path.join(outdir, 'last_index.json'), 'w') as f:
        json.dump(meta, f, indent=2)
    
    print(f"\n=== Indexing Complete ===")
    print(f"Chunks: {len(chunks)}")
    print(f"Collection: {COLLECTION}")
    print(f"Output: {outdir}")


if __name__ == '__main__':
    main()
