#!/usr/bin/env python3
"""
AGRO Config Migration - Phase 2: Add useEffect Config Initialization

Problem:
Components have useState with hardcoded defaults but never load actual values 
from the Pydantic backend via useConfig's get() function.

Example broken pattern:
  const [blendAlpha, setBlendAlpha] = useState<number>(0.7);
  // Later: onBlur={() => set('AGRO_RERANKER_ALPHA', blendAlpha)}
  // But blendAlpha shows 0.7 even if backend has 0.5

Fix:
Add useEffect to sync state from config on mount:
  useEffect(() => {
    if (!loading) {
      setBlendAlpha(get('AGRO_RERANKER_ALPHA', 0.7));
    }
  }, [loading, get]);

This script:
1. Finds useState declarations with hardcoded defaults
2. Finds matching set('CONFIG_KEY', ...) calls to identify config fields
3. Builds a mapping of state setter -> config key -> default value
4. Generates a useEffect block to initialize all config state
5. Inserts it after the existing useEffect blocks (or after useState declarations)
"""

import re
import sys
import os
from pathlib import Path
from typing import Dict, List, Tuple, Optional

# Pattern to match useState declarations with defaults
# const [varName, setVarName] = useState<type>(defaultValue);
# const [varName, setVarName] = useState(defaultValue);
USESTATE_PATTERN = re.compile(
    r'const\s+\[(\w+),\s*(set\w+)\]\s*=\s*useState(?:<[^>]+>)?\(([^)]+)\)',
    re.MULTILINE
)

# Pattern to match set('CONFIG_KEY', value) calls - these identify config fields
SET_CONFIG_PATTERN = re.compile(
    r"set\(\s*['\"]([A-Z][A-Z0-9_]+)['\"]",
    re.MULTILINE
)

# Pattern to find where to insert the useEffect (after component's useEffect blocks)
# We'll look for the last useEffect and insert after its closing });
USEEFFECT_BLOCK_PATTERN = re.compile(
    r'useEffect\(\s*\(\)\s*=>\s*\{[^}]*(?:\{[^}]*\}[^}]*)*\}[^)]*,\s*\[[^\]]*\]\s*\);',
    re.MULTILINE | re.DOTALL
)

# Pattern to detect if useConfig is imported and used
USECONFIG_IMPORT_PATTERN = re.compile(r"import.*useConfig.*from\s+['\"]@/hooks['\"]")
USECONFIG_CALL_PATTERN = re.compile(r'const\s*\{\s*get\s*,\s*set\s*,?\s*[^}]*\}\s*=\s*useConfig\(\)')


def parse_default_value(raw_default: str) -> str:
    """Clean up the default value for use in get() call."""
    cleaned = raw_default.strip()
    # Handle cases like: 0.7, '0', 'append', true, false, 100
    return cleaned


def find_config_keys_in_file(content: str) -> Dict[str, str]:
    """
    Find all config keys used in set() calls.
    Returns: {state_var_name: CONFIG_KEY}
    
    We need to match setState calls to their config keys by analyzing
    the handler functions or direct calls.
    """
    config_keys = {}
    
    # Find all set('KEY', stateVar) or set('KEY', ...) patterns
    # and try to associate them with state variables
    
    # Pattern 1: set('KEY', stateVar) - direct use of state variable
    direct_pattern = re.compile(r"set\(\s*['\"]([A-Z][A-Z0-9_]+)['\"]\s*,\s*(\w+)\s*\)")
    for match in direct_pattern.finditer(content):
        config_key = match.group(1)
        state_var = match.group(2)
        # Check if this looks like a state variable (not 'e', 'value', etc)
        if len(state_var) > 2 and not state_var.startswith('e.') and state_var not in ['value', 'newValue']:
            config_keys[state_var] = config_key
    
    # Pattern 2: Handler functions like handleXxxBlur = () => set('KEY', stateVar)
    handler_pattern = re.compile(
        r'const\s+handle(\w+)Blur\s*=\s*\(\)\s*=>\s*\{\s*set\(\s*[\'"]([A-Z][A-Z0-9_]+)[\'"]',
        re.MULTILINE
    )
    for match in handler_pattern.finditer(content):
        handler_name = match.group(1)  # e.g., "BlendAlpha"
        config_key = match.group(2)
        # Convert handler name to likely state var name
        # BlendAlpha -> blendAlpha
        state_var = handler_name[0].lower() + handler_name[1:]
        config_keys[state_var] = config_key
    
    # Pattern 3: Simpler handler: handleXxxBlur = () => { set('KEY', xxx); }
    handler_pattern2 = re.compile(
        r'handle(\w+)Blur\s*=\s*\(\)\s*=>\s*\{\s*\n?\s*set\(\s*[\'"]([A-Z][A-Z0-9_]+)[\'"]',
        re.MULTILINE
    )
    for match in handler_pattern2.finditer(content):
        handler_name = match.group(1)
        config_key = match.group(2)
        state_var = handler_name[0].lower() + handler_name[1:]
        config_keys[state_var] = config_key
    
    # Pattern 4: onChange with name attribute - set('KEY', value)
    # Look for name="KEY" followed by set('KEY'
    name_set_pattern = re.compile(
        r'name=["\']([A-Z][A-Z0-9_]+)["\'].*?set\(\s*[\'"]([A-Z][A-Z0-9_]+)[\'"]',
        re.DOTALL
    )
    for match in name_set_pattern.finditer(content):
        if match.group(1) == match.group(2):
            config_keys[f'_name_{match.group(1)}'] = match.group(1)
    
    return config_keys


def find_usestate_with_config(content: str) -> List[Tuple[str, str, str, str]]:
    """
    Find useState declarations that are config fields.
    Returns: [(state_var, setter_name, default_value, config_key), ...]
    """
    config_keys = find_config_keys_in_file(content)
    results = []
    
    for match in USESTATE_PATTERN.finditer(content):
        state_var = match.group(1)
        setter_name = match.group(2)
        default_value = parse_default_value(match.group(3))
        
        # Check if this state variable has an associated config key
        config_key = config_keys.get(state_var)
        
        # Also check by setter name (setXxx -> xxx)
        if not config_key:
            derived_var = setter_name[3:4].lower() + setter_name[4:] if setter_name.startswith('set') else None
            if derived_var:
                config_key = config_keys.get(derived_var)
        
        if config_key:
            results.append((state_var, setter_name, default_value, config_key))
    
    return results


def generate_useeffect_block(config_fields: List[Tuple[str, str, str, str]]) -> str:
    """
    Generate the useEffect block to sync config state on mount.
    """
    if not config_fields:
        return ""
    
    lines = []
    lines.append("  // Sync config values from backend on mount")
    lines.append("  useEffect(() => {")
    lines.append("    if (!loading) {")
    
    for state_var, setter_name, default_value, config_key in config_fields:
        lines.append(f"      {setter_name}(get('{config_key}', {default_value}));")
    
    lines.append("    }")
    lines.append("  }, [loading, get]);")
    lines.append("")
    
    return "\n".join(lines)


def find_insertion_point(content: str) -> Optional[int]:
    """
    Find where to insert the new useEffect block.
    Looks for the last useEffect block and returns position after it.
    """
    # Find all useEffect blocks
    last_end = -1
    for match in USEEFFECT_BLOCK_PATTERN.finditer(content):
        last_end = match.end()
    
    if last_end > 0:
        return last_end
    
    # Fallback: find after useState declarations
    last_usestate = -1
    for match in USESTATE_PATTERN.finditer(content):
        last_usestate = match.end()
    
    if last_usestate > 0:
        # Find the end of the line
        newline_pos = content.find('\n', last_usestate)
        if newline_pos > 0:
            return newline_pos + 1
    
    return None


def check_already_has_config_sync(content: str) -> bool:
    """Check if file already has config sync useEffect."""
    return "// Sync config values from backend on mount" in content


def process_file(filepath: str, dry_run: bool = True) -> int:
    """
    Process a single file.
    Returns: number of config fields that would be/were synced
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    filename = os.path.basename(filepath)
    
    # Check if file uses useConfig
    if not USECONFIG_CALL_PATTERN.search(content):
        return 0
    
    # Check if already fixed
    if check_already_has_config_sync(content):
        print(f"  ⏭️  {filename}: Already has config sync useEffect")
        return 0
    
    # Find config fields that need syncing
    config_fields = find_usestate_with_config(content)
    
    if not config_fields:
        print(f"  ℹ️  {filename}: No config useState fields found")
        return 0
    
    print(f"\nProcessing: {filename}")
    for state_var, setter_name, default_value, config_key in config_fields:
        print(f"  ✅ {setter_name}(get('{config_key}', {default_value}))")
    
    if dry_run:
        print(f"Would add useEffect to sync {len(config_fields)} config fields")
        return len(config_fields)
    
    # Find insertion point
    insertion_point = find_insertion_point(content)
    if insertion_point is None:
        print(f"  ⚠️  Could not find insertion point")
        return 0
    
    # Generate the useEffect block
    useeffect_block = generate_useeffect_block(config_fields)
    
    # Insert the block
    new_content = (
        content[:insertion_point] + 
        "\n\n" + useeffect_block + 
        content[insertion_point:]
    )
    
    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"Added useEffect to sync {len(config_fields)} config fields")
    return len(config_fields)


def scan_directory(directory: str, dry_run: bool = True) -> int:
    """
    Scan directory recursively for .tsx files.
    Returns: total number of fields fixed
    """
    total = 0
    
    for root, dirs, files in os.walk(directory):
        # Skip node_modules, dist, etc.
        dirs[:] = [d for d in dirs if d not in ['node_modules', 'dist', '.git', '__pycache__']]
        
        for filename in files:
            if filename.endswith('.tsx') and not filename.endswith('.bak'):
                filepath = os.path.join(root, filename)
                total += process_file(filepath, dry_run)
    
    return total


def main():
    if len(sys.argv) < 2:
        print("Usage: python fix_config_init.py <directory_or_file> [--dry-run]")
        print("")
        print("Examples:")
        print("  python fix_config_init.py ./web/src/components/RAG --dry-run")
        print("  python fix_config_init.py ./web/src/components/RAG/LearningRankerSubtab.tsx")
        print("  python fix_config_init.py ./web/src/components")
        sys.exit(1)
    
    target = sys.argv[1]
    dry_run = '--dry-run' in sys.argv
    
    print("=" * 60)
    print("AGRO Config Migration - Add useEffect Config Initialization")
    print("=" * 60)
    print(f"Target: {target}")
    print(f"Mode: {'DRY RUN (preview)' if dry_run else 'APPLY CHANGES'}")
    print("=" * 60)
    
    if os.path.isfile(target):
        total = process_file(target, dry_run)
    elif os.path.isdir(target):
        total = scan_directory(target, dry_run)
    else:
        print(f"Error: {target} not found")
        sys.exit(1)
    
    print("\n" + "=" * 60)
    if dry_run:
        print(f"Total: Would sync {total} config fields")
        print("\nRun without --dry-run to apply changes.")
    else:
        print(f"Total: Synced {total} config fields")
        print("\nNext steps:")
        print("  1. cd web && npm run dev")
        print("  2. Open http://localhost:5173")
        print("  3. Verify config values load from backend")


if __name__ == '__main__':
    main()
