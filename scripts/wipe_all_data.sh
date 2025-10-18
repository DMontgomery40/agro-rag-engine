#!/bin/bash
# Nuclear option: wipe ALL indexed data

set -e
cd "$(dirname "$0")/.."

echo "🔥 WIPING ALL INDEXED DATA..."

# Kill Qdrant to avoid locks
docker compose -f infra/docker-compose.yml stop qdrant 2>/dev/null || true

# Wipe Qdrant data
echo "  Wiping Qdrant..."
rm -rf data/qdrant/*
rm -rf infra/data/qdrant/*

# Wipe all output directories
echo "  Wiping output directories..."
rm -rf out/*
rm -rf out.noindex-*

# Wipe training data
echo "  Wiping training data..."
rm -f data/training/triplets.jsonl

# Wipe reranker cache
echo "  Wiping reranker cache..."
rm -rf data/reranker_cache/*

# Restart Qdrant
echo "  Restarting Qdrant..."
docker compose -f infra/docker-compose.yml up -d qdrant

echo "✓ All data wiped. Ready for clean reindex."

