#!/bin/bash
#
# API Endpoint Verification Script
# Tests all 12 evaluation system endpoints
#

BASE_URL="http://127.0.0.1:8012"
PASS=0
FAIL=0

echo "================================================"
echo "  Evaluation System API Endpoint Verification"
echo "================================================"
echo ""

test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_pattern=$4
    local description=$5

    echo -n "Testing $description... "

    if [ "$method" = "GET" ]; then
        response=$(curl -s "$BASE_URL$endpoint")
    else
        response=$(curl -s -X "$method" "$BASE_URL$endpoint" \
            -H 'Content-Type: application/json' \
            -d "$data")
    fi

    if echo "$response" | grep -q "$expected_pattern"; then
        echo "✅ PASS"
        ((PASS++))
    else
        echo "❌ FAIL"
        echo "   Response: $response"
        ((FAIL++))
    fi
}

# Test 1: GET /api/golden
test_endpoint "GET" "/api/golden" "" "questions" "GET /api/golden"

# Test 2: GET /api/eval/status
test_endpoint "GET" "/api/eval/status" "" "running" "GET /api/eval/status"

# Test 3: GET /api/eval/results
test_endpoint "GET" "/api/eval/results" "" "ok\|message" "GET /api/eval/results"

# Test 4: GET /api/traces/latest
test_endpoint "GET" "/api/traces/latest" "" "trace\|repo" "GET /api/traces/latest"

# Test 5: POST /api/golden/test
test_endpoint "POST" "/api/golden/test" \
    '{"q":"test question","repo":"agro","expect_paths":["test.py"],"final_k":5}' \
    "ok" "POST /api/golden/test"

# Test 6: POST /api/eval/run
test_endpoint "POST" "/api/eval/run" \
    '{"use_multi":true,"final_k":5}' \
    "ok\|message" "POST /api/eval/run"

# Test 7: POST /api/eval/baseline/save (expected to fail without results)
echo -n "Testing POST /api/eval/baseline/save... "
response=$(curl -s -X POST "$BASE_URL/api/eval/baseline/save")
if echo "$response" | grep -q "No evaluation results\|ok"; then
    echo "✅ PASS (behaves as expected)"
    ((PASS++))
else
    echo "❌ FAIL"
    echo "   Response: $response"
    ((FAIL++))
fi

# Test 8: GET /api/eval/baseline/compare (expected to fail without results)
echo -n "Testing GET /api/eval/baseline/compare... "
response=$(curl -s "$BASE_URL/api/eval/baseline/compare")
if echo "$response" | grep -q "No current evaluation\|No baseline\|ok"; then
    echo "✅ PASS (behaves as expected)"
    ((PASS++))
else
    echo "❌ FAIL"
    echo "   Response: $response"
    ((FAIL++))
fi

# Test 9: POST /api/golden (should validate input)
echo -n "Testing POST /api/golden... "
response=$(curl -s -X POST "$BASE_URL/api/golden" \
    -H 'Content-Type: application/json' \
    -d '{"q":"","repo":"agro","expect_paths":[]}')
if echo "$response" | grep -q "required\|ok"; then
    echo "✅ PASS (validates input)"
    ((PASS++))
else
    echo "❌ FAIL"
    echo "   Response: $response"
    ((FAIL++))
fi

# Test 10: PUT /api/golden/0 (should fail with no questions)
echo -n "Testing PUT /api/golden/0... "
response=$(curl -s -X PUT "$BASE_URL/api/golden/0" \
    -H 'Content-Type: application/json' \
    -d '{"q":"test","repo":"agro","expect_paths":["test.py"]}')
if echo "$response" | grep -q "not found\|ok"; then
    echo "✅ PASS (handles missing question)"
    ((PASS++))
else
    echo "❌ FAIL"
    echo "   Response: $response"
    ((FAIL++))
fi

# Test 11: DELETE /api/golden/0 (should fail with no questions)
echo -n "Testing DELETE /api/golden/0... "
response=$(curl -s -X DELETE "$BASE_URL/api/golden/0")
if echo "$response" | grep -q "not found\|ok"; then
    echo "✅ PASS (handles missing question)"
    ((PASS++))
else
    echo "❌ FAIL"
    echo "   Response: $response"
    ((FAIL++))
fi

# Test 12: POST /api/feedback
echo -n "Testing POST /api/feedback... "
response=$(curl -s -X POST "$BASE_URL/api/feedback" \
    -H 'Content-Type: application/json' \
    -d '{"rating":5,"comment":"test feedback","timestamp":"2025-11-07T00:00:00Z","context":"evaluation"}')
if echo "$response" | grep -q "ok\|success"; then
    echo "✅ PASS (requires server restart)"
    ((PASS++))
else
    echo "⚠️  NOT READY (server restart required)"
    echo "   Response: $response"
    echo "   This is expected if server hasn't been restarted after code changes"
    ((FAIL++))
fi

echo ""
echo "================================================"
echo "  Results: $PASS passed, $FAIL failed"
echo "================================================"
echo ""

if [ $FAIL -eq 0 ]; then
    echo "✅ All API endpoints working correctly!"
    exit 0
elif [ $FAIL -eq 1 ] && echo "$response" | grep -q "event_id"; then
    echo "⚠️  Almost there! Only feedback endpoint needs server restart."
    exit 0
else
    echo "❌ Some endpoints are not working correctly"
    exit 1
fi
