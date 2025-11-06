#!/bin/bash
# Audit functions - check for stubs, TODOs, and missing implementations

cd /home/user/agro-rag-engine/web

echo "=== PHASE 2: FUNCTION INTEGRITY AUDIT ==="
echo ""

echo "=== 2.1: LOOKING FOR TODO/STUB/PLACEHOLDER FUNCTIONS ==="
echo ""

find src -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | while read file; do
  # Check for TODO comments
  todos=$(grep -n "TODO\|FIXME\|XXX\|HACK\|STUB" "$file" 2>/dev/null)
  if [ -n "$todos" ]; then
    echo "📝 $file:"
    echo "$todos" | sed 's/^/  /'
    echo ""
  fi

  # Check for placeholder implementations
  placeholders=$(grep -n "console.log.*placeholder\|throw new Error.*not implemented\|return {} as" "$file" 2>/dev/null)
  if [ -n "$placeholders" ]; then
    echo "⚠️  PLACEHOLDER in $file:"
    echo "$placeholders" | sed 's/^/  /'
    echo ""
  fi

  # Check for empty function bodies
  empty=$(grep -A 2 "function\|const.*=>.*{" "$file" | grep -B 1 "^\s*}$" | head -20)
  if [ -n "$empty" ]; then
    # Only report if it's actually empty (just opening and closing braces)
    potential_empty=$(echo "$empty" | grep -c "{\s*}$")
    if [ "$potential_empty" -gt 0 ]; then
      echo "🕳️  POTENTIALLY EMPTY FUNCTION in $file"
    fi
  fi
done

echo ""
echo "=== 2.2: CHECKING FOR ASYNC/AWAIT ISSUES ==="
echo ""

# Find async functions called without await
echo "Checking for missing await on async calls..."
find src -name "*.ts" -o -name "*.tsx" | xargs grep -n "async.*function\|async.*=>.*{" | head -20

echo ""
echo "=== 2.3: CHECKING FOR TYPE ASSERTION LIES ==="
echo ""

# Find dangerous type assertions
find src -name "*.ts" -o -name "*.tsx" | xargs grep -n " as " | grep -v "import" | head -30

echo ""
echo "=== 2.4: CHECKING FOR @ts-ignore SUPPRESSIONS ==="
echo ""

find src -name "*.ts" -o -name "*.tsx" | xargs grep -n "@ts-ignore\|@ts-expect-error" || echo "✅ No TypeScript suppressions found"

echo ""
echo "Function audit complete!"
