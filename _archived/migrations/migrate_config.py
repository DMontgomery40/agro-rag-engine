#!/usr/bin/env python3
"""
AGRO UI Config Migration Script

Transforms React components from:
  - Local useState for each config value
  - Direct fetch('/api/config') calls
  - Individual updateConfig() calls

To:
  - Shared useConfig() hook
  - get('KEY', default) for reading
  - set('KEY', value) for writing

Usage:
  python migrate_config.py /path/to/component.tsx
  python migrate_config.py /path/to/web/src/components/RAG/  # all .tsx files
"""

import re
import sys
from pathlib import Path
from typing import Dict, List, Tuple

# Map of camelCase state variable -> (ENV_KEY, default_value, type)
# Built from analyzing RetrievalSubtab.tsx
STATE_TO_CONFIG: Dict[str, Tuple[str, str, str]] = {
    # Generation Models
    'genModel': ('GEN_MODEL', "''", 'string'),
    'openaiApiKey': ('OPENAI_API_KEY', "''", 'string'),
    'genTemperature': ('GEN_TEMPERATURE', '0.0', 'number'),
    'enrichModel': ('ENRICH_MODEL', "''", 'string'),
    'enrichModelOllama': ('ENRICH_MODEL_OLLAMA', "''", 'string'),
    'anthropicApiKey': ('ANTHROPIC_API_KEY', "''", 'string'),
    'googleApiKey': ('GOOGLE_API_KEY', "''", 'string'),
    'ollamaUrl': ('OLLAMA_URL', "'http://127.0.0.1:11434'", 'string'),
    'openaiBaseUrl': ('OPENAI_BASE_URL', "''", 'string'),
    'genModelHttp': ('GEN_MODEL_HTTP', "''", 'string'),
    'genModelMcp': ('GEN_MODEL_MCP', "''", 'string'),
    'genModelCli': ('GEN_MODEL_CLI', "''", 'string'),
    'enrichBackend': ('ENRICH_BACKEND', "''", 'string'),
    'genMaxTokens': ('GEN_MAX_TOKENS', '2048', 'number'),
    'genTopP': ('GEN_TOP_P', '1.0', 'number'),
    'genTimeout': ('GEN_TIMEOUT', '60', 'number'),
    'genRetryMax': ('GEN_RETRY_MAX', '2', 'number'),
    'enrichDisabled': ('ENRICH_DISABLED', "'0'", 'string'),
    
    # Retrieval Parameters
    'multiQueryRewrites': ('MAX_QUERY_REWRITES', '2', 'number'),
    'finalK': ('FINAL_K', '10', 'number'),
    'useSemanticSynonyms': ('USE_SEMANTIC_SYNONYMS', "'1'", 'string'),
    'topkDense': ('TOPK_DENSE', '75', 'number'),
    'vectorBackend': ('VECTOR_BACKEND', "'qdrant'", 'string'),
    'topkSparse': ('TOPK_SPARSE', '75', 'number'),
    'hydrationMode': ('HYDRATION_MODE', "'lazy'", 'string'),
    'hydrationMaxChars': ('HYDRATION_MAX_CHARS', '2000', 'number'),
    'vendorMode': ('VENDOR_MODE', "'prefer_first_party'", 'string'),
    'bm25Weight': ('BM25_WEIGHT', '0.3', 'number'),
    'bm25K1': ('BM25_K1', '1.2', 'number'),
    'bm25B': ('BM25_B', '0.4', 'number'),
    'vectorWeight': ('VECTOR_WEIGHT', '0.7', 'number'),
    'cardSearchEnabled': ('CARD_SEARCH_ENABLED', "'1'", 'string'),
    'multiQueryM': ('MULTI_QUERY_M', '4', 'number'),
    'confTop1': ('CONF_TOP1', '0.62', 'number'),
    'confAvg5': ('CONF_AVG5', '0.55', 'number'),
    
    # Advanced RAG Tuning
    'rrfKDiv': ('RRF_K_DIV', '60', 'number'),
    'cardBonus': ('CARD_BONUS', '0.08', 'number'),
    'filenameBoostExact': ('FILENAME_BOOST_EXACT', '1.5', 'number'),
    'filenameBoostPartial': ('FILENAME_BOOST_PARTIAL', '1.2', 'number'),
    'langgraphFinalK': ('LANGGRAPH_FINAL_K', '20', 'number'),
    'maxQueryRewrites': ('MAX_QUERY_REWRITES', '3', 'number'),
    'fallbackConfidence': ('FALLBACK_CONFIDENCE', '0.55', 'number'),
    'layerBonusGui': ('LAYER_BONUS_GUI', '0.15', 'number'),
    'layerBonusRetrieval': ('LAYER_BONUS_RETRIEVAL', '0.15', 'number'),
    'vendorPenalty': ('VENDOR_PENALTY', '-0.1', 'number'),
    'freshnessBonus': ('FRESHNESS_BONUS', '0.05', 'number'),
    
    # Routing Trace
    'tracingMode': ('TRACING_MODE', "'off'", 'string'),
    'traceAutoLs': ('TRACE_AUTO_LS', "'0'", 'string'),
    'traceRetention': ('TRACE_RETENTION', '50', 'number'),
    'langchainTracingV2': ('LANGCHAIN_TRACING_V2', "'0'", 'string'),
    'langchainEndpoint': ('LANGCHAIN_ENDPOINT', "''", 'string'),
    'langchainApiKey': ('LANGCHAIN_API_KEY', "''", 'string'),
    'langsmithApiKey': ('LANGSMITH_API_KEY', "''", 'string'),
    'langchainProject': ('LANGCHAIN_PROJECT', "''", 'string'),
    'langtraceApiHost': ('LANGTRACE_API_HOST', "''", 'string'),
    'langtraceProjectId': ('LANGTRACE_PROJECT_ID', "''", 'string'),
    'langtraceApiKey': ('LANGTRACE_API_KEY', "''", 'string'),
    
    # Embedding/Indexing (from other files)
    'embeddingType': ('EMBEDDING_TYPE', "'openai'", 'string'),
    'embeddingModel': ('EMBEDDING_MODEL', "''", 'string'),
    'embeddingDim': ('EMBEDDING_DIM', '1536', 'number'),
    'chunkSize': ('CHUNK_SIZE', '512', 'number'),
    'chunkOverlap': ('CHUNK_OVERLAP', '50', 'number'),
    'voyageModel': ('VOYAGE_MODEL', "''", 'string'),
    'cohereApiKey': ('COHERE_API_KEY', "''", 'string'),
    'voyageApiKey': ('VOYAGE_API_KEY', "''", 'string'),
    
    # Reranker
    'rerankerBackend': ('RERANKER_BACKEND', "''", 'string'),
    'rerankerModel': ('RERANKER_MODEL', "''", 'string'),
    'cohereRerankModel': ('COHERE_RERANK_MODEL', "''", 'string'),
    'voyageRerankModel': ('VOYAGE_RERANK_MODEL', "''", 'string'),
    'agroRerankerEnabled': ('AGRO_RERANKER_ENABLED', 'false', 'boolean'),
    'agroRerankerAlpha': ('AGRO_RERANKER_ALPHA', '0.5', 'number'),
    'agroRerankerTopn': ('AGRO_RERANKER_TOPN', '10', 'number'),
}


def add_useconfig_import(content: str) -> str:
    """Add useConfig import if not present."""
    if "import { useConfig }" in content or "import {useConfig}" in content:
        return content
    
    # Find the first import line and add after it
    import_match = re.search(r"^import .+ from '[^']+';?\n", content, re.MULTILINE)
    if import_match:
        insert_pos = import_match.end()
        new_import = "import { useConfig } from '@/hooks';\n"
        content = content[:insert_pos] + new_import + content[insert_pos:]
    
    return content


def remove_usestate_declarations(content: str) -> Tuple[str, List[str]]:
    """Remove useState declarations for config values, return list of removed vars."""
    removed_vars = []
    
    # Pattern: const [varName, setVarName] = useState<type>(default);
    pattern = r"^\s*const \[(\w+), set\w+\] = useState<(?:string|number|boolean)>\([^)]*\);\n?"
    
    def check_and_remove(match):
        var_name = match.group(1)
        if var_name in STATE_TO_CONFIG:
            removed_vars.append(var_name)
            return ""  # Remove the line
        return match.group(0)  # Keep non-config useState
    
    content = re.sub(pattern, check_and_remove, content, flags=re.MULTILINE)
    return content, removed_vars


def remove_loadconfig_function(content: str) -> str:
    """Remove the loadConfig async function."""
    # Pattern to match the entire loadConfig function
    # This is tricky because of nested braces, so we'll be conservative
    
    # Try to find and remove loadConfig function
    patterns = [
        # Arrow function style
        r"const loadConfig = async \(\) => \{[\s\S]*?\n  \};?\n",
        # Regular function style  
        r"async function loadConfig\(\) \{[\s\S]*?\n\}\n",
        # Simple pattern for the function call in useEffect
        r"loadConfig\(\);\n?\s*",
    ]
    
    for pattern in patterns:
        content = re.sub(pattern, "", content)
    
    return content


def remove_updateconfig_function(content: str) -> str:
    """Remove the updateConfig async function."""
    patterns = [
        r"const updateConfig = async \(key: string, value: any\) => \{[\s\S]*?\n  \};?\n",
        r"async function updateConfig\([^)]*\) \{[\s\S]*?\n\}\n",
    ]
    
    for pattern in patterns:
        content = re.sub(pattern, "", content)
    
    return content


def add_useconfig_hook(content: str) -> str:
    """Add the useConfig hook call at the start of the component."""
    # Find the component function start
    pattern = r"(export function \w+\(\) \{\n)"
    
    hook_line = "  const { get, set, loading, error } = useConfig();\n"
    
    def add_hook(match):
        return match.group(1) + hook_line
    
    # Only add if not already present
    if "useConfig()" not in content:
        content = re.sub(pattern, add_hook, content)
    
    return content


def replace_value_reads(content: str) -> str:
    """Replace value={stateVar} with value={get('KEY', default)}."""
    for var_name, (env_key, default, _) in STATE_TO_CONFIG.items():
        # Pattern: value={varName}
        pattern = rf"value=\{{{var_name}\}}"
        replacement = f"value={{get('{env_key}', {default})}}"
        content = re.sub(pattern, replacement, content)
    
    return content


def replace_onchange_handlers(content: str) -> str:
    """Replace onChange handlers that use setState."""
    
    for var_name, (env_key, default, var_type) in STATE_TO_CONFIG.items():
        setter_name = "set" + var_name[0].upper() + var_name[1:]
        
        # Pattern 1: onChange={(e) => { setVar(e.target.value); updateConfig('KEY', e.target.value); }}
        pattern1 = rf"onChange=\{{\(e\) => \{{\s*{setter_name}\([^)]+\);\s*updateConfig\('[^']+',\s*[^)]+\);\s*\}}\}}"
        
        # Pattern 2: onChange={(e) => setVar(parseFloat/parseInt(e.target.value) || default)}
        pattern2 = rf"onChange=\{{\(e\) => {setter_name}\([^)]+\)\}}"
        
        # Pattern 3: onChange={(e) => { setVar(e.target.value); updateConfig('KEY', e.target.value); }}
        pattern3 = rf"onChange=\{{\(e\) => \{{\s*{setter_name}\(e\.target\.value\);\s*updateConfig\('[A-Z_]+', e\.target\.value\);\s*\}}\}}"
        
        if var_type == 'number':
            # Check if it's likely a float or int based on default
            if '.' in default:
                replacement = f"onChange={{(e) => set('{env_key}', parseFloat(e.target.value) || {default})}}"
            else:
                replacement = f"onChange={{(e) => set('{env_key}', parseInt(e.target.value, 10) || {default})}}"
        else:
            replacement = f"onChange={{(e) => set('{env_key}', e.target.value)}}"
        
        content = re.sub(pattern1, replacement, content)
        content = re.sub(pattern2, replacement, content)
        content = re.sub(pattern3, replacement, content)
    
    return content


def remove_onblur_handlers(content: str) -> str:
    """Remove onBlur handlers that call updateConfig (no longer needed with debounced hook)."""
    # Pattern: onBlur={() => updateConfig('KEY', value)}
    pattern = r"\s*onBlur=\{\(\) => \{?\s*(?:if \([^)]+\)\s*)?updateConfig\('[^']+',\s*[^)]+\);?\s*\}?\}"
    content = re.sub(pattern, "", content)
    return content


def replace_direct_updateconfig_calls(content: str) -> str:
    """Replace remaining updateConfig('KEY', value) calls with set('KEY', value)."""
    pattern = r"updateConfig\('([A-Z_]+)',\s*([^)]+)\)"
    replacement = r"set('\1', \2)"
    content = re.sub(pattern, replacement, content)
    return content


def clean_empty_useeffect(content: str) -> str:
    """Clean up useEffect that only called loadConfig."""
    # Pattern: useEffect(() => { loadConfig(); }, []);
    pattern = r"useEffect\(\(\) => \{\s*\n?\s*\}, \[\]\);\n?"
    content = re.sub(pattern, "", content)
    
    # Also clean up useEffect that now only has loadModels
    # (keep those, they're fine)
    
    return content


def update_loading_check(content: str) -> str:
    """Update the loading state check to use hook's loading state."""
    # The hook provides loading, so this should work automatically
    # Just make sure we're not checking a local loading state
    
    # Remove: const [loading, setLoading] = useState<boolean>(true);
    pattern = r"const \[loading, setLoading\] = useState<boolean>\(true\);\n?"
    content = re.sub(pattern, "", content)
    
    # Remove setLoading calls
    content = re.sub(r"setLoading\(false\);\n?", "", content)
    content = re.sub(r"setLoading\(true\);\n?", "", content)
    
    return content


def migrate_file(filepath: Path) -> bool:
    """Migrate a single file. Returns True if changes were made."""
    print(f"Processing: {filepath}")
    
    content = filepath.read_text()
    original = content
    
    # Step 1: Add import
    content = add_useconfig_import(content)
    
    # Step 2: Add hook call
    content = add_useconfig_hook(content)
    
    # Step 3: Remove useState declarations for config values
    content, removed = remove_usestate_declarations(content)
    if removed:
        print(f"  Removed {len(removed)} useState declarations")
    
    # Step 4: Remove loadConfig function
    content = remove_loadconfig_function(content)
    
    # Step 5: Remove updateConfig function
    content = remove_updateconfig_function(content)
    
    # Step 6: Replace value reads
    content = replace_value_reads(content)
    
    # Step 7: Replace onChange handlers
    content = replace_onchange_handlers(content)
    
    # Step 8: Remove onBlur handlers
    content = remove_onblur_handlers(content)
    
    # Step 9: Replace any remaining updateConfig calls
    content = replace_direct_updateconfig_calls(content)
    
    # Step 10: Clean up empty useEffect
    content = clean_empty_useeffect(content)
    
    # Step 11: Update loading state
    content = update_loading_check(content)
    
    # Step 12: Clean up multiple blank lines
    content = re.sub(r"\n{3,}", "\n\n", content)
    
    if content != original:
        # Write backup
        backup_path = filepath.with_suffix('.tsx.bak')
        filepath.rename(backup_path)
        print(f"  Backup saved to: {backup_path}")
        
        # Write new content
        filepath.write_text(content)
        print(f"  Migrated successfully!")
        return True
    else:
        print(f"  No changes needed")
        return False


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    target = Path(sys.argv[1])
    
    if target.is_file():
        migrate_file(target)
    elif target.is_dir():
        files = list(target.glob("**/*.tsx"))
        print(f"Found {len(files)} .tsx files")
        
        migrated = 0
        for f in files:
            if migrate_file(f):
                migrated += 1
        
        print(f"\nMigrated {migrated}/{len(files)} files")
    else:
        print(f"Error: {target} not found")
        sys.exit(1)


if __name__ == "__main__":
    main()
