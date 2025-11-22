#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "🔧 Docker Data Persistence Migration"
echo "===================================="
echo ""
echo "This script migrates Qdrant data from Docker named volume to local directory"
echo "and restarts the stack with persistence enabled."
echo ""

# Step 1: Stop the stack
echo "📦 Step 1: Stopping Docker Compose stack..."
docker compose down
echo "✓ Stack stopped"
echo ""

# Step 2: Check if Qdrant named volume exists
echo "🔍 Step 2: Checking for existing Qdrant volume..."
if docker volume inspect agro_qdrant_storage >/dev/null 2>&1; then
  echo "✓ Found named volume 'agro_qdrant_storage'"

  # Create local directory
  echo "📁 Creating local data/qdrant directory..."
  mkdir -p data/qdrant

  # Migrate data from named volume to local directory
  echo "🚚 Migrating Qdrant data to ./data/qdrant..."
  docker run --rm \
    -v agro_qdrant_storage:/source \
    -v "$(pwd)/data/qdrant":/dest \
    alpine sh -c "cp -a /source/. /dest/"

  echo "✓ Data migrated successfully"
  echo "📊 Data size:"
  du -sh data/qdrant

  # Ask user if they want to remove the old volume
  echo ""
  read -p "Remove old named volume 'agro_qdrant_storage'? (y/N): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker volume rm agro_qdrant_storage
    echo "✓ Old volume removed"
  else
    echo "ℹ Keeping old volume (can be removed manually with: docker volume rm agro_qdrant_storage)"
  fi
else
  echo "ℹ No existing named volume found - creating fresh data/qdrant directory"
  mkdir -p data/qdrant
fi

echo ""
echo "📋 Step 3: Ensuring critical directories exist..."
mkdir -p data/qdrant
mkdir -p data/evals
mkdir -p out
mkdir -p models
mkdir -p checkpoints
echo "✓ All directories created"

echo ""
echo "🚀 Step 4: Starting Docker Compose with new persistence configuration..."
docker compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

echo ""
echo "✅ Migration Complete!"
echo "===================="
echo ""
echo "Data persistence is now configured:"
echo "  ✓ Qdrant: ./data/qdrant (bind mount)"
echo "  ✓ Redis: docker volume with --save 60 1000"
echo "  ✓ Indexes: ./out (mounted)"
echo "  ✓ Models: ./models (mounted)"
echo "  ✓ Checkpoints: ./checkpoints (mounted)"
echo "  ✓ Evals: ./data/evals (mounted)"
echo ""
echo "Your data will now persist across Docker restarts!"
echo ""
echo "Verify services:"
echo "  curl http://127.0.0.1:6333/collections"
echo "  curl http://127.0.0.1:8012/health"
