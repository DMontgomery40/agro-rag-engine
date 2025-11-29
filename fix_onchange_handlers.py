#!/usr/bin/env python3
"""
Fix onChange handlers in partially-migrated AGRO config components.

The previous migration script:
1. ✅ Added useConfig import
2. ✅ Changed value={stateVar} to value={get('KEY', default)}
3. ❌ Left onChange handlers calling non-existent setXxx() functions

This script fixes step 3 by:
- Finding onChange handlers that call setXxx(...)
- Extracting the config key from the element's name attribute
- Replacing with set('KEY', ...) preserving the value transformation

Usage:
    python fix_onchange_handlers.py <file.tsx>
    python fix_onchange_handlers.py <file.tsx> --dry-run
"""

import re
import sys
from pathlib import Path


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


def transform_setter_to_set_call(setter_call: str, config_key: str) -> str:
    """
    Transform: setGenTemperature(parseFloat(e.target.value) || 0.0)
    To:        set('GEN_TEMPERATURE', parseFloat(e.target.value) || 0.0)
    
    Handles various patterns:
    - setXxx(e.target.value)
    - setXxx(parseInt(e.target.value, 10) || 0)
    - setXxx(parseFloat(e.target.value) || 0.0)
    - setXxx(parseInt(e.target.value, 10))
    """
    # Extract the argument part (everything inside the outermost parens)
    match = re.match(r'set[A-Za-z]+\((.*)\)$', setter_call.strip(), re.DOTALL)
    if match:
        arg = match.group(1).strip()
        return f"set('{config_key}', {arg})"
    return setter_call  # Return unchanged if pattern doesn't match


def fix_onchange_in_line(line: str, config_key: str) -> str:
    """
    Fix onChange handlers in a single line.
    
    Patterns to fix:
    1. onChange={(e) => setXxx(something)}
    2. onChange={(e) => { setXxx(something); updateConfig(...); }}
    """
    # Pattern 1: Simple arrow function - onChange={(e) => setXxx(...)}
    pattern1 = r'onChange=\{(?:\(e\)|e)\s*=>\s*(set[A-Za-z]+\([^}]+\))\}'
    match = re.search(pattern1, line)
    if match:
        old_setter = match.group(1)
        new_setter = transform_setter_to_set_call(old_setter, config_key)
        new_handler = f"onChange={{(e) => {new_setter}}}"
        return line[:match.start()] + new_handler + line[match.end():]
    
    # Pattern 2: Block with setState and updateConfig
    # onChange={(e) => { setXxx(e.target.value); updateConfig('KEY', e.target.value); }}
    pattern2 = r'onChange=\{(?:\(e\)|e)\s*=>\s*\{\s*(set[A-Za-z]+\([^;]+\));[^}]*updateConfig[^}]*\}\}'
    match = re.search(pattern2, line)
    if match:
        old_setter = match.group(1)
        new_setter = transform_setter_to_set_call(old_setter, config_key)
        new_handler = f"onChange={{(e) => {new_setter}}}"
        return line[:match.start()] + new_handler + line[match.end():]
    
    return line


def process_file(filepath: Path, dry_run: bool = False) -> tuple[int, list[str]]:
    """
    Process a single TSX file, fixing onChange handlers.
    Returns (changes_made, log_messages).
    """
    content = filepath.read_text()
    lines = content.split('\n')
    changes = []
    log = []
    
    for i, line in enumerate(lines):
        # Skip lines that don't have onChange with a setter pattern
        if 'onChange=' not in line:
            continue
        if not re.search(r'set[A-Z][a-zA-Z]+\(', line):
            continue
        
        # Find the config key from context
        config_key = extract_config_key_from_context(lines, i)
        if not config_key:
            log.append(f"  ⚠️  Line {i+1}: Could not find config key for setter")
            continue
        
        # Try to fix the line
        new_line = fix_onchange_in_line(line, config_key)
        if new_line != line:
            changes.append((i, line, new_line, config_key))
            lines[i] = new_line
            log.append(f"  ✅ Line {i+1}: Fixed setter -> set('{config_key}', ...)")
    
    if changes and not dry_run:
        filepath.write_text('\n'.join(lines))
    
    return len(changes), log


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    
    filepath = Path(sys.argv[1])
    dry_run = '--dry-run' in sys.argv
    
    if not filepath.exists():
        print(f"Error: File not found: {filepath}")
        sys.exit(1)
    
    print(f"{'[DRY RUN] ' if dry_run else ''}Processing: {filepath}")
    print("-" * 60)
    
    count, log = process_file(filepath, dry_run)
    
    for msg in log:
        print(msg)
    
    print("-" * 60)
    print(f"{'Would fix' if dry_run else 'Fixed'} {count} onChange handlers")
    
    if dry_run and count > 0:
        print("\nRun without --dry-run to apply changes.")


if __name__ == '__main__':
    main()
