#!/bin/bash
# Setup Grafana service account for AGRO GUI
# Run this after starting Grafana for the first time

set -e

echo "Waiting for Grafana to be ready..."
until curl -sf http://localhost:3000/api/health > /dev/null 2>&1; do
    sleep 1
done

echo "Creating service account..."
SA_RESPONSE=$(curl -sf -X POST \
  -H "Content-Type: application/json" \
  -u admin:Trenton2023 \
  -d '{"name":"agro-gui","role":"Editor"}' \
  http://localhost:3000/api/serviceaccounts 2>/dev/null || echo '{"id":2}')

SA_ID=$(echo "$SA_RESPONSE" | jq -r '.id')

echo "Creating service account token..."
TOKEN_RESPONSE=$(curl -sf -X POST \
  -H "Content-Type: application/json" \
  -u admin:Trenton2023 \
  -d '{"name":"agro-gui-token"}' \
  "http://localhost:3000/api/serviceaccounts/$SA_ID/tokens" 2>/dev/null)

TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.key')

echo ""
echo "✓ Grafana service account created"
echo "✓ Service Account ID: $SA_ID"
echo "✓ Token: $TOKEN"
echo ""
echo "Update gui/index.html iframe src with:"
echo "http://localhost:3000/d/agro-overview/agro-overview?auth_token=$TOKEN&kiosk=tv"
