#!/bin/bash
# Audit script to check ALL imports in TypeScript files

cd /home/user/agro-rag-engine/web

echo "=== PHASE 1.1: PHANTOM IMPORTS AUDIT ==="
echo ""

# Find all import statements in TS/TSX files
find src -name "*.ts" -o -name "*.tsx" | while read file; do
  echo "Checking: $file"

  # Extract all imports from this file
  grep "^import.*from" "$file" 2>/dev/null | while read import_line; do
    # Extract the path (between quotes)
    path=$(echo "$import_line" | sed -n "s/.*from ['\"]\\([^'\"]*\\)['\"].*/\\1/p")

    if [ -n "$path" ]; then
      # Skip node_modules imports
      if [[ "$path" == react* ]] || [[ "$path" == zustand* ]] || [[ "$path" == axios* ]] || [[ "$path" == react-router-dom* ]]; then
        continue
      fi

      # Check if it's a relative import
      if [[ "$path" == ./* ]] || [[ "$path" == ../* ]]; then
        # Get directory of current file
        file_dir=$(dirname "$file")

        # Resolve the path
        if [[ "$path" == ./* ]]; then
          resolved_path="$file_dir/${path#./}"
        else
          resolved_path="$file_dir/$path"
        fi

        # Normalize path
        resolved_path=$(cd "$(dirname "$resolved_path")" 2>/dev/null && pwd)/$(basename "$resolved_path") 2>/dev/null

        # Try adding common extensions
        found=false
        for ext in "" ".ts" ".tsx" ".js" ".jsx"; do
          if [ -f "${resolved_path}${ext}" ]; then
            found=true
            break
          fi
        done

        # Check if it's a directory with index file
        if [ -d "$resolved_path" ]; then
          if [ -f "$resolved_path/index.ts" ] || [ -f "$resolved_path/index.tsx" ] || [ -f "$resolved_path/index.js" ]; then
            found=true
          fi
        fi

        if [ "$found" = false ]; then
          echo "  ❌ BROKEN: $import_line"
          echo "     Path: $path"
          echo "     Resolved: $resolved_path"
        fi
      elif [[ "$path" == @/* ]]; then
        # Path alias - resolve from src
        alias_path="src/${path#@/}"

        found=false
        for ext in "" ".ts" ".tsx" ".js" ".jsx"; do
          if [ -f "${alias_path}${ext}" ]; then
            found=true
            break
          fi
        done

        # Check if it's a directory with index file
        if [ -d "$alias_path" ]; then
          if [ -f "$alias_path/index.ts" ] || [ -f "$alias_path/index.tsx" ] || [ -f "$alias_path/index.js" ]; then
            found=true
          fi
        fi

        if [ "$found" = false ]; then
          echo "  ❌ BROKEN ALIAS: $import_line"
          echo "     Path: $path"
          echo "     Resolved: $alias_path"
        fi
      fi
    fi
  done
  echo ""
done

echo ""
echo "=== PHASE 1.2: CHECKING FOR TYPOS IN IMPORT STATEMENTS ==="
echo ""

# Check for common typos
find src -name "*.ts" -o -name "*.tsx" | xargs grep -n "improt\|impart\|inmport\|from'\|from\"\|exports default\|export defualt" 2>/dev/null || echo "No typos found"

echo ""
echo "=== PHASE 1.3: CHECKING PACKAGE.JSON DEPENDENCIES ==="
echo ""

# Extract all package imports
echo "Checking if all imported packages exist in package.json..."
find src -name "*.ts" -o -name "*.tsx" | xargs grep "^import.*from ['\"]" | \
  sed -n "s/.*from ['\"]\\([^'\"@.][^'\"]*\\)['\"].*/\\1/p" | \
  sort -u | while read pkg; do
    # Check if package is in dependencies or devDependencies
    if ! grep -q "\"$pkg\"" package.json 2>/dev/null; then
      echo "❌ Package '$pkg' imported but not in package.json"
    fi
  done

echo ""
echo "Audit complete!"
