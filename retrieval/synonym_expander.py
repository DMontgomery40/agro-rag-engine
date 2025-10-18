"""
Semantic Synonym Expander for Query Enhancement

Expands queries with semantic synonyms to improve retrieval accuracy.
Example: "auth" -> "auth authentication oauth jwt bearer token"
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Set


_SYNONYMS_CACHE: Dict[str, Dict[str, List[str]]] = {}


def load_synonyms(repo: str) -> Dict[str, List[str]]:
    """Load semantic synonyms for a given repository."""
    global _SYNONYMS_CACHE
    
    if repo in _SYNONYMS_CACHE:
        return _SYNONYMS_CACHE[repo]
    
    # Prefer data/semantic_synonyms.json; fallback to repo-root semantic_synonyms.json
    repo_root = Path(__file__).resolve().parents[1]
    candidates = [
        Path(os.getenv('AGRO_SYNONYMS_PATH', '')),
        repo_root / 'data' / 'semantic_synonyms.json',
        repo_root / 'semantic_synonyms.json',
    ]
    synonyms_path = next((p for p in candidates if p and str(p) and Path(p).exists()), None)
    
    if not synonyms_path or not Path(synonyms_path).exists():
        _SYNONYMS_CACHE[repo] = {}
        return {}
    
    try:
        with open(synonyms_path, 'r', encoding='utf-8') as f:
            all_synonyms = json.load(f)
        
        repo_synonyms = all_synonyms.get(repo, {})
        _SYNONYMS_CACHE[repo] = repo_synonyms
        return repo_synonyms
    except Exception:
        _SYNONYMS_CACHE[repo] = {}
        return {}


def expand_query_with_synonyms(query: str, repo: str, max_expansions: int = 3) -> str:
    """
    Expand a query by adding semantic synonyms.
    
    Args:
        query: Original query string
        repo: Repository name for synonym lookup
        max_expansions: Maximum number of synonyms to add per term (default: 3)
    
    Returns:
        Expanded query string with synonyms added
    
    Example:
        Input:  "camera auth"
        Output: "camera video stream auth authentication oauth"
    """
    synonyms = load_synonyms(repo)
    
    if not synonyms:
        return query
    
    # Split query into words
    words = query.lower().split()
    expanded_terms: Set[str] = set(words)
    
    # For each word in the query, check if we have synonyms
    for word in words:
        # Direct match
        if word in synonyms:
            # Add up to max_expansions synonyms
            for syn in synonyms[word][:max_expansions]:
                expanded_terms.add(syn)
        
        # Partial match (e.g., "authentication" matches "auth")
        for key, syn_list in synonyms.items():
            if key in word or word in key:
                # Add the key itself and one synonym
                expanded_terms.add(key)
                if syn_list:
                    expanded_terms.add(syn_list[0])
                break
    
    # Return expanded query
    return " ".join(sorted(expanded_terms))


def get_synonym_variants(query: str, repo: str) -> List[str]:
    """
    Generate multiple query variants with different synonym combinations.
    
    Args:
        query: Original query string
        repo: Repository name
    
    Returns:
        List of query variants (including original)
    
    Example:
        Input: "how does auth work"
        Output: [
            "how does auth work",
            "how does authentication work",
            "how does oauth work"
        ]
    """
    synonyms = load_synonyms(repo)
    
    if not synonyms:
        return [query]
    
    variants = [query]  # Always include original
    words = query.lower().split()
    
    # Find words that have synonyms
    for i, word in enumerate(words):
        if word in synonyms and synonyms[word]:
            # Create variant with first synonym
            variant_words = words.copy()
            variant_words[i] = synonyms[word][0]
            variants.append(" ".join(variant_words))
            
            # Create variant with second synonym if available
            if len(synonyms[word]) > 1:
                variant_words = words.copy()
                variant_words[i] = synonyms[word][1]
                variants.append(" ".join(variant_words))
    
    # Limit to 4 variants to avoid over-expansion
    return variants[:4]

