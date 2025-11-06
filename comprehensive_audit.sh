#!/bin/bash
# COMPREHENSIVE FORENSIC AUDIT OF /web REFACTOR
# Checks EVERY import, export, function, component

cd /home/user/agro-rag-engine/web

echo "==================================================================="
echo "PHASE 1: IMPORT/EXPORT VERIFICATION"
echo "==================================================================="
echo ""

echo "1.1 CHECKING ALL TYPESCRIPT IMPORTS..."
echo "-------------------------------------------------------------------"

# Find all TypeScript/TSX files
find src -name "*.ts" -o -name "*.tsx" | while read file; do
  echo "Checking: $file"

  # Extract imports
  grep "^import.*from ['\"]" "$file" | while read import_line; do
    # Extract the path
    path=$(echo "$import_line" | sed -n "s/.*from ['\"]\\([^'\"]*\\)['\"].*/\\1/p")

    # Skip node_modules packages
    if [[ "$path" =~ ^(react|zustand|axios|@) ]]; then
      continue
    fi

    # Check relative imports
    if [[ "$path" =~ ^\./ ]] || [[ "$path" =~ ^\.\./ ]]; then
      file_dir=$(dirname "$file")

      # Try different extensions
      found=false
      for ext in "" ".ts" ".tsx" ".js" ".jsx"; do
        resolved="${file_dir}/${path#./}${ext}"
        if [ -f "$resolved" ]; then
          found=true
          break
        fi
      done

      # Check if directory with index
      if [ -d "${file_dir}/${path#./}" ]; then
        if [ -f "${file_dir}/${path#./}/index.ts" ] || [ -f "${file_dir}/${path#./}/index.tsx" ]; then
          found=true
        fi
      fi

      if [ "$found" = false ]; then
        echo "  ❌ BROKEN: $import_line"
        echo "     File: $file"
        echo "     Path: $path"
      fi
    fi

    # Check path aliases (@/...)
    if [[ "$path" =~ ^@/ ]]; then
      alias_path="src/${path#@/}"

      found=false
      for ext in "" ".ts" ".tsx" ".js" ".jsx"; do
        if [ -f "${alias_path}${ext}" ]; then
          found=true
          break
        fi
      done

      if [ -d "$alias_path" ]; then
        if [ -f "$alias_path/index.ts" ] || [ -f "$alias_path/index.tsx" ]; then
          found=true
        fi
      fi

      if [ "$found" = false ]; then
        echo "  ❌ BROKEN ALIAS: $import_line"
        echo "     File: $file"
        echo "     Path: $path"
      fi
    fi
  done
done

echo ""
echo "1.2 CHECKING FOR IMPORT TYPOS..."
echo "-------------------------------------------------------------------"
find src -name "*.ts" -o -name "*.tsx" | xargs grep -n "improt\|impart\|inmport\|form '\|form \"\|exports default\|export defualt" || echo "✅ No typos found"

echo ""
echo "1.3 CHECKING PACKAGE DEPENDENCIES..."
echo "-------------------------------------------------------------------"
# Extract all package imports
find src -name "*.ts" -o -name "*.tsx" | xargs grep "^import.*from ['\"]" | \
  sed -n "s/.*from ['\"]\\([^'\"@/.][^'\"]*\\)['\"].*/\\1/p" | \
  sort -u | while read pkg; do
    base_pkg=$(echo "$pkg" | cut -d'/' -f1)
    if ! grep -q "\"$base_pkg\"" package.json 2>/dev/null; then
      echo "❌ Package '$pkg' imported but not in package.json"
    fi
  done

echo ""
echo "==================================================================="
echo "PHASE 2: FUNCTION INTEGRITY"
echo "==================================================================="
echo ""

echo "2.1 CHECKING FOR TODO/STUB/PLACEHOLDER FUNCTIONS..."
echo "-------------------------------------------------------------------"
find src -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | while read file; do
  todos=$(grep -n "TODO\|FIXME\|XXX\|HACK\|STUB\|placeholder" "$file" 2>/dev/null)
  if [ -n "$todos" ]; then
    echo "📝 $file:"
    echo "$todos" | sed 's/^/  /'
  fi
done

echo ""
echo "2.2 CHECKING FOR TYPE ASSERTIONS (POTENTIAL LIES)..."
echo "-------------------------------------------------------------------"
find src -name "*.ts" -o -name "*.tsx" | xargs grep -n " as " | grep -v "import" | head -50

echo ""
echo "2.3 CHECKING FOR @ts-ignore SUPPRESSIONS..."
echo "-------------------------------------------------------------------"
find src -name "*.ts" -o -name "*.tsx" | xargs grep -n "@ts-ignore\|@ts-expect-error" || echo "✅ No TypeScript suppressions"

echo ""
echo "==================================================================="
echo "PHASE 3: CHECKING ALL 54 MODULES LOAD"
echo "==================================================================="
echo ""

echo "Modules in filesystem:"
ls -1 src/modules/*.js | wc -l

echo ""
echo "Modules imported in App.tsx:"
grep "import('./modules/" src/App.tsx | wc -l

echo ""
echo "MODULES IN FILESYSTEM BUT NOT IMPORTED:"
comm -23 <(ls src/modules/*.js | xargs -n1 basename | sed 's/.js$//' | sort) \
         <(grep "import('./modules/" src/App.tsx | sed "s/.*modules\\/\\(.*\\)\\.js.*/\\1/" | sort)

echo ""
echo "==================================================================="
echo "PHASE 4: API ENDPOINT VERIFICATION"
echo "==================================================================="
echo ""

echo "Checking if backend endpoints exist..."
echo ""

echo "API calls in docker.ts:"
grep -n "api(" src/api/docker.ts

echo ""
echo "Checking backend for these endpoints:"
grep -r "/api/docker" ../server/ | grep -E "@app\.(get|post|put|delete)" | head -20

echo ""
echo "==================================================================="
echo "PHASE 5: REACT COMPONENT ANALYSIS"
echo "==================================================================="
echo ""

echo "Checking for components with potential issues..."
echo ""

echo "5.1 Components with map() but no key prop:"
find src/components src/pages -name "*.tsx" -o -name "*.jsx" | xargs grep -l ".map(" | while read file; do
  if ! grep -q "key=" "$file"; then
    echo "⚠️  $file has .map() but no visible key prop"
  fi
done

echo ""
echo "5.2 useState with potentially wrong types:"
find src -name "*.tsx" | xargs grep -n "useState<" | head -20

echo ""
echo "5.3 useEffect with empty dependency arrays (potential issues):"
find src -name "*.tsx" | xargs grep -A1 "useEffect(" | grep "\[\]" | head -20

echo ""
echo "==================================================================="
echo "PHASE 6: BUILD ANALYSIS"
echo "==================================================================="
echo ""

echo "Running production build to check for warnings..."
npm run build 2>&1 | tee /tmp/build-output.log | tail -50

echo ""
echo "Checking for build warnings:"
grep -i "warning\|deprecated" /tmp/build-output.log | head -20 || echo "✅ No warnings"

echo ""
echo "==================================================================="
echo "PHASE 7: HARDCODED VALUES"
echo "==================================================================="
echo ""

echo "Searching for hardcoded URLs and ports:"
grep -rn "localhost\|127.0.0.1\|http://\|https://" src --include="*.ts" --include="*.tsx" | grep -v "node_modules" | head -30

echo ""
echo "==================================================================="
echo "AUDIT SCRIPT COMPLETE"
echo "==================================================================="
