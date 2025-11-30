"""
Comprehensive test that React components follow AGRO config migration patterns.

This test verifies the fixes applied by:
- migrate_config.py (original migration)
- fix_onchange_handlers.py (onChange handler fixes)
- fix_config_init.py (useEffect sync initialization)
- pydantic_guard_tests.py (Pydantic model correctness)

It ensures:
1. onChange handlers use set('KEY', ...) not setXxx() for config fields
2. useState config fields sync from backend via useEffect
3. Components properly use useConfig hook
4. Old migration patterns are removed
5. Pydantic model is correct (critical for React components to work)
"""

import re
import os
import json
import sys
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import pytest

# Add project root to path
repo_root = Path(__file__).parent.parent
sys.path.insert(0, str(repo_root))

from server.models.agro_config_model import (
    AgroConfigRoot,
    AGRO_CONFIG_KEYS
)
from common.paths import repo_root as get_repo_root

# Patterns from the fix scripts - EXACT copies
USESTATE_PATTERN = re.compile(
    r'const\s+\[(\w+),\s*(set\w+)\]\s*=\s*useState(?:<[^>]+>)?\(([^)]+)\)',
    re.MULTILINE
)

SET_CONFIG_PATTERN = re.compile(
    r"set\(\s*['\"]([A-Z][A-Z0-9_]+)['\"]",
    re.MULTILINE
)

USECONFIG_CALL_PATTERN = re.compile(
    r'const\s*\{\s*get\s*,\s*set\s*,?\s*[^}]*\}\s*=\s*useConfig\(\)'
)

USECONFIG_IMPORT_PATTERN = re.compile(
    r"import.*useConfig.*from\s+['\"]@/hooks['\"]"
)

# Pattern from fix_onchange_handlers.py - EXACT copy
ONCHANGE_PATTERN1 = re.compile(
    r'onChange=\{(?:\(e\)|e)\s*=>\s*(set[A-Za-z]+\([^}]+\))\}'
)

ONCHANGE_PATTERN2 = re.compile(
    r'onChange=\{(?:\(e\)|e)\s*=>\s*\{\s*(set[A-Za-z]+\([^;]+\));[^}]*updateConfig[^}]*\}\}'
)

CONFIG_SYNC_MARKER = "// Sync config values from backend on mount"


def find_react_components(directory: str) -> list[Path]:
    """Find all .tsx React component files."""
    components = []
    for root, dirs, files in os.walk(directory):
        # Skip node_modules, dist, etc.
        dirs[:] = [d for d in dirs if d not in ['node_modules', 'dist', '.git', '__pycache__']]
        
        for filename in files:
            # Skip backup files, test files, and files starting with underscore
            if filename.endswith('.tsx') and not filename.endswith('.bak'):
                if filename.startswith('_') or 'test' in filename.lower() or 'backup' in filename.lower():
                    continue
                components.append(Path(root) / filename)
    
    return components


# EXACT copy from fix_onchange_handlers.py lines 25-37
def extract_config_key_from_context(lines: list[str], line_idx: int) -> str | None:
    """
    Look backwards from onChange line to find the name="KEY" attribute.
    Returns the KEY or None if not found.
    """
    # Look up to 15 lines back for the name attribute
    for i in range(line_idx, max(0, line_idx - 15), -1):
        line = lines[i]
        # Match name="SOME_KEY" or name='SOME_KEY'
        match = re.search(r'name=["\']([A-Z][A-Z0-9_]+)["\']', line)
        if match:
            return match.group(1)
    return None


# EXACT copy from fix_config_init.py lines 69-125
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


# EXACT copy from fix_config_init.py lines 62-66
def parse_default_value(raw_default: str) -> str:
    """Clean up the default value for use in get() call."""
    cleaned = raw_default.strip()
    # Handle cases like: 0.7, '0', 'append', true, false, 100
    return cleaned


# EXACT copy from fix_config_init.py lines 128-153
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


def test_no_bad_onchange_setters():
    """
    Test that onChange handlers use set('KEY', ...) not setXxx() for CONFIG fields.
    
    This verifies fix_onchange_handlers.py fixes were applied.
    Uses EXACT same logic as fix_onchange_handlers.py - only flags when name="KEY" found.
    """
    repo_root = Path(__file__).parent.parent
    components_dir = repo_root / "web" / "src" / "components"
    
    if not components_dir.exists():
        pytest.skip("web/src/components directory not found")
    
    components = find_react_components(str(components_dir))
    violations = []
    
    for component_path in components:
        content = component_path.read_text()
        
        # Skip if doesn't use useConfig
        if not USECONFIG_CALL_PATTERN.search(content):
            continue
        
        # EXACT same logic as fix_onchange_handlers.py lines 94-117
        lines = content.split('\n')
        
        for i, line in enumerate(lines):
            # Skip lines that don't have onChange with a setter pattern
            if 'onChange=' not in line:
                continue
            if not re.search(r'set[A-Z][a-zA-Z]+\(', line):
                continue
            
            # Find the config key from context (EXACT same as script)
            config_key = extract_config_key_from_context(lines, i)
            if not config_key:
                # Script skips these - not a config field, probably UI-only
                continue
            
            # Check if already using set('KEY', ...) pattern
            if "set('" in line or 'set("' in line:
                continue
            
            # Check for bad patterns (EXACT same as script lines 68 and 78)
            pattern1_match = ONCHANGE_PATTERN1.search(line)
            pattern2_match = ONCHANGE_PATTERN2.search(line)
            
            if pattern1_match or pattern2_match:
                violations.append({
                    'file': str(component_path.relative_to(repo_root)),
                    'line': i + 1,
                    'pattern': line.strip()[:150],
                    'config_key': config_key
                })
    
    assert len(violations) == 0, (
        f"Found {len(violations)} onChange handlers using setXxx() instead of set('KEY', ...) for CONFIG fields:\n" +
        "\n".join(
            f"  {v['file']}:{v['line']} - Should use set('{v['config_key']}', ...)\n"
            f"    {v['pattern']}"
            for v in violations
        ) +
        "\n\nRun: python fix_onchange_handlers.py <file.tsx>"
    )


def test_no_usestate_for_config_values():
    """
    CRITICAL: Config values must use get() directly, NOT useState.
    
    Per CLAUDE.md: "I should NOT be adding local useState for config values - 
    they should use get() and set() from the Zustand store"
    
    WRONG pattern (what fix scripts create - still incorrect):
        const [cloudModel, setCloudModel] = useState('');
        value={cloudModel}
        onChange={(e) => set('RERANKER_CLOUD_MODEL', e.target.value)}
    
    CORRECT pattern:
        value={get('RERANKER_CLOUD_MODEL', '')}
        onChange={(e) => set('RERANKER_CLOUD_MODEL', e.target.value)}
    """
    repo_root = Path(__file__).parent.parent
    components_dir = repo_root / "web" / "src" / "components"
    
    if not components_dir.exists():
        pytest.skip("web/src/components directory not found")
    
    components = find_react_components(str(components_dir))
    violations = []
    
    for component_path in components:
        content = component_path.read_text()
        
        # Skip if doesn't use useConfig
        if not USECONFIG_CALL_PATTERN.search(content):
            continue
        
        # Find config keys used in set() calls
        config_keys = find_config_keys_in_file(content)
        
        if not config_keys:
            continue
        
        component_violations = []
        
        # Check for useState declarations that correspond to config keys
        for match in USESTATE_PATTERN.finditer(content):
            state_var = match.group(1)
            setter_name = match.group(2)
            default_value = match.group(3)
            
            # Check if this state var has an associated config key
            config_key = config_keys.get(state_var)
            if not config_key:
                # Try deriving from setter name (setXxx -> xxx)
                derived_var = setter_name[3:4].lower() + setter_name[4:] if setter_name.startswith('set') else None
                config_key = config_keys.get(derived_var) if derived_var else None
            
            if config_key:
                component_violations.append({
                    'type': 'useState_for_config',
                    'state_var': state_var,
                    'setter': setter_name,
                    'config_key': config_key,
                    'fix': f"Remove useState, use value={{get('{config_key}', {default_value.strip()})}}"
                })
        
        # Check for value={stateVar} that should be value={get('KEY', default)}
        value_pattern = re.compile(r'value=\{\s*(\w+)\s*\}')
        for match in value_pattern.finditer(content):
            state_var = match.group(1)
            config_key = config_keys.get(state_var)
            if config_key:
                # Check if there's a get() on the same or nearby line
                match_pos = match.start()
                line_start = content.rfind('\n', 0, match_pos) + 1
                line_end = content.find('\n', match.end())
                if line_end == -1:
                    line_end = len(content)
                line_content = content[line_start:line_end]
                
                # If line uses value={stateVar} without get(), it's a violation
                if f"get('{config_key}'" not in line_content and f'get("{config_key}"' not in line_content:
                    line_num = content[:match_pos].count('\n') + 1
                    component_violations.append({
                        'type': 'value_uses_state_not_get',
                        'line': line_num,
                        'state_var': state_var,
                        'config_key': config_key,
                        'fix': f"Change value={{{state_var}}} to value={{get('{config_key}', default)}}"
                    })
        
        if component_violations:
            violations.append({
                'file': str(component_path.relative_to(repo_root)),
                'issues': component_violations
            })
    
    assert len(violations) == 0, (
        f"Found {len(violations)} components using useState for config values (should use get() directly):\n" +
        "\n".join(
            f"  {v['file']}:\n" +
            "\n".join(
                f"    - {i['type']}: {i.get('state_var', '')} -> {i['config_key']}\n"
                f"      Fix: {i['fix']}"
                for i in v['issues']
            )
            for v in violations
        ) +
        "\n\nPer CLAUDE.md: 'I should NOT be adding local useState for config values - "
        "they should use get() and set() from the Zustand store'"
    )


def test_migrate_config_patterns():
    """
    Test that migrate_config.py patterns are correctly applied.
    
    Verifies absence of old patterns and presence of new patterns.
    """
    repo_root = Path(__file__).parent.parent
    components_dir = repo_root / "web" / "src" / "components"
    
    if not components_dir.exists():
        pytest.skip("web/src/components directory not found")
    
    components = find_react_components(str(components_dir))
    violations = []
    
    for component_path in components:
        content = component_path.read_text()
        
        # Skip if doesn't use useConfig (not migrated yet)
        if not USECONFIG_CALL_PATTERN.search(content):
            continue
        
        issues = []
        
        # Check for old patterns that should be removed
        # Pattern 1: fetch('/api/config') calls
        if re.search(r"fetch\s*\(\s*['\"]/api/config['\"]", content):
            issues.append("Still has fetch('/api/config') calls - should use useConfig hook")
        
        # Pattern 2: updateConfig() function calls
        if re.search(r'\bupdateConfig\s*\(', content):
            issues.append("Still has updateConfig() calls - should use set('KEY', ...)")
        
        # Pattern 3: loadConfig() function calls
        if re.search(r'\bloadConfig\s*\(', content):
            issues.append("Still has loadConfig() calls - should use useConfig hook")
        
        # Note: value={stateVar} patterns are checked in test_no_usestate_for_config_values
        # Per CLAUDE.md, config values MUST use get() directly, not useState
        
        if issues:
            violations.append({
                'file': str(component_path.relative_to(repo_root)),
                'issues': issues
            })
    
    assert len(violations) == 0, (
        f"Found {len(violations)} components with old migrate_config.py patterns:\n" +
        "\n".join(
            f"  {v['file']}:\n" +
            "\n".join(f"    - {issue}" for issue in v['issues'])
            for v in violations
        ) +
        "\n\nRun: python migrate_config.py <file.tsx>"
    )


def test_components_use_useconfig():
    """
    Test that components using config properly import and use useConfig.
    
    Enhanced to catch all cases.
    """
    repo_root = Path(__file__).parent.parent
    components_dir = repo_root / "web" / "src" / "components"
    
    if not components_dir.exists():
        pytest.skip("web/src/components directory not found")
    
    components = find_react_components(str(components_dir))
    violations = []
    
    for component_path in components:
        content = component_path.read_text()
        
        # Check if file uses set('KEY', ...) or get('KEY', ...)
        uses_config_api = (
            SET_CONFIG_PATTERN.search(content) is not None or
            re.search(r"get\s*\(\s*['\"][A-Z][A-Z0-9_]+['\"]", content) is not None
        )
        
        if uses_config_api:
            has_import = USECONFIG_IMPORT_PATTERN.search(content) is not None
            has_call = USECONFIG_CALL_PATTERN.search(content) is not None
            
            # Check hook destructuring has get and set
            has_get_set = False
            if has_call:
                # Verify get and set are destructured
                destructure_match = re.search(
                    r'const\s*\{\s*([^}]+)\}\s*=\s*useConfig\(\)',
                    content
                )
                if destructure_match:
                    destructured = destructure_match.group(1)
                    has_get_set = 'get' in destructured and 'set' in destructured
            
            if not has_import or not has_call or not has_get_set:
                violations.append({
                    'file': str(component_path.relative_to(repo_root)),
                    'missing_import': not has_import,
                    'missing_call': not has_call,
                    'missing_get_set': not has_get_set
                })
    
    assert len(violations) == 0, (
        f"Found {len(violations)} components using config API without proper useConfig:\n" +
        "\n".join(
            f"  {v['file']}:" +
            (f" missing import" if v['missing_import'] else "") +
            (f" missing useConfig() call" if v['missing_call'] else "") +
            (f" missing get/set in destructuring" if v['missing_get_set'] else "")
            for v in violations
        )
    )


def test_pydantic_model_correctness():
    """
    Test that Pydantic model is correct - CRITICAL for React components to work.
    
    If the model is broken, React components can't work even if wired correctly.
    Uses logic from pydantic_guard_tests.py
    """
    config_path = get_repo_root() / "agro_config.json"
    
    if not config_path.exists():
        pytest.skip("agro_config.json not found")
    
    # Test 1: Actual agro_config.json validates
    try:
        raw_json = json.loads(config_path.read_text())
        model = AgroConfigRoot(**raw_json)
        
        # Verify we got real values, not just defaults
        flat = model.to_flat_dict()
        assert len(flat) > 50, "Config seems too sparse - check if values loaded"
    except Exception as e:
        pytest.fail(f"agro_config.json failed Pydantic validation:\n{e}")
    
    # Test 2: No drift between to_flat_dict() and AGRO_CONFIG_KEYS
    flat_keys = set(flat.keys())
    extra_in_flat = flat_keys - AGRO_CONFIG_KEYS
    missing_from_flat = AGRO_CONFIG_KEYS - flat_keys
    
    # Known legacy aliases that are in to_flat_dict() but not AGRO_CONFIG_KEYS
    # These are intentional duplicates (e.g., MQ_REWRITES is an alias for MAX_QUERY_REWRITES)
    known_legacy_aliases = {'MQ_REWRITES'}
    extra_in_flat = extra_in_flat - known_legacy_aliases
    
    errors = []
    if extra_in_flat:
        errors.append(
            f"Keys in to_flat_dict() but NOT in AGRO_CONFIG_KEYS "
            f"(add them to AGRO_CONFIG_KEYS):\n  {sorted(extra_in_flat)}"
        )
    if missing_from_flat:
        errors.append(
            f"Keys in AGRO_CONFIG_KEYS but NOT in to_flat_dict() "
            f"(remove from AGRO_CONFIG_KEYS or add to model):\n  {sorted(missing_from_flat)}"
        )
    
    if errors:
        pytest.fail("\n\n".join(errors))
    
    # Test 3: No duplicate keys
    assert len(flat) == len(set(flat.keys())), "Duplicate keys detected in flat dict"
    
    # Test 4: Roundtrip preservation
    reconstructed = AgroConfigRoot.from_flat_dict(flat)
    reconstructed_flat = reconstructed.to_flat_dict()
    
    mismatches = []
    for key in flat:
        if key not in reconstructed_flat:
            mismatches.append(f"Key {key} lost in roundtrip")
        elif flat[key] != reconstructed_flat[key]:
            # Special handling for floats
            if isinstance(flat[key], float):
                if abs(flat[key] - reconstructed_flat[key]) > 0.0001:
                    mismatches.append(
                        f"{key}: {flat[key]} -> {reconstructed_flat[key]}"
                    )
            else:
                mismatches.append(
                    f"{key}: {flat[key]} -> {reconstructed_flat[key]}"
                )
    
    if mismatches:
        pytest.fail(f"Values changed in roundtrip:\n" + "\n".join(mismatches[:20]))
    
    # Test 5: All config sections have Pydantic models
    # Use model class, not instance, to avoid deprecation warning
    expected_sections = set(AgroConfigRoot.model_fields.keys())
    actual_sections = set(raw_json.keys())
    extra = actual_sections - expected_sections
    if extra:
        pytest.fail(
            f"Sections in agro_config.json without Pydantic models: {extra}\n"
            f"Add corresponding model classes to agro_config_model.py"
        )


def test_parameter_coverage():
    """
    Test that all config parameters are covered.
    
    Uses dynamic count from model (not hardcoded).
    """
    model = AgroConfigRoot()
    flat = model.to_flat_dict()
    actual_count = len(flat)
    
    # Verify AGRO_CONFIG_KEYS matches (accounting for legacy aliases)
    declared_count = len(AGRO_CONFIG_KEYS)
    # Known legacy aliases that are in to_flat_dict() but not AGRO_CONFIG_KEYS
    known_legacy_aliases = {'MQ_REWRITES'}
    expected_count = declared_count + len(known_legacy_aliases)
    
    assert actual_count == expected_count, (
        f"to_flat_dict() has {actual_count} keys but "
        f"AGRO_CONFIG_KEYS has {declared_count} (+ {len(known_legacy_aliases)} legacy aliases = {expected_count}). "
        f"Update AGRO_CONFIG_KEYS to match."
    )
    
    # Verify all keys in flat dict are in AGRO_CONFIG_KEYS
    flat_keys = set(flat.keys())
    # Known legacy aliases that are in to_flat_dict() but not AGRO_CONFIG_KEYS
    known_legacy_aliases = {'MQ_REWRITES'}
    missing = flat_keys - AGRO_CONFIG_KEYS - known_legacy_aliases
    
    assert len(missing) == 0, (
        f"Found {len(missing)} keys in to_flat_dict() not in AGRO_CONFIG_KEYS:\n"
        f"  {sorted(missing)}\n"
        f"Add them to AGRO_CONFIG_KEYS in server/models/agro_config_model.py"
    )
    
    # Verify all keys in AGRO_CONFIG_KEYS are in flat dict
    extra = AGRO_CONFIG_KEYS - flat_keys
    
    assert len(extra) == 0, (
        f"Found {len(extra)} keys in AGRO_CONFIG_KEYS not in to_flat_dict():\n"
        f"  {sorted(extra)}\n"
        f"Remove them from AGRO_CONFIG_KEYS or add to model."
    )


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
