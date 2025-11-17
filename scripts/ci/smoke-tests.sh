#!/bin/bash
# Smoke Tests for API
# Usage: ./smoke-tests.sh <API_URL>

set -e

API_URL="${1:-https://api.outreachpass.base2ml.com}"

echo "🧪 Running smoke tests against: $API_URL"

# Test 1: Health endpoint
echo "Test 1: Health endpoint..."
response=$(curl -s -w "\n%{http_code}" "$API_URL/health" || echo "000")
status=$(echo "$response" | tail -n 1)

if [ "$status" = "200" ]; then
    echo "✅ Health endpoint working"
else
    echo "❌ Health endpoint failed (status: $status)"
    exit 1
fi

# Test 2: API root
echo "Test 2: API root endpoint..."
response=$(curl -s -w "\n%{http_code}" "$API_URL/" || echo "000")
status=$(echo "$response" | tail -n 1)

if [ "$status" = "200" ]; then
    echo "✅ API root working"
else
    echo "❌ API root failed (status: $status)"
    exit 1
fi

# Test 3: API docs (if available)
echo "Test 3: API documentation..."
response=$(curl -s -w "\n%{http_code}" "$API_URL/docs" || echo "000")
status=$(echo "$response" | tail -n 1)

if [ "$status" = "200" ] || [ "$status" = "404" ]; then
    echo "✅ Docs endpoint accessible"
else
    echo "⚠️  Docs endpoint returned: $status"
fi

# Test 4: Admin health (if available)
echo "Test 4: Admin health check..."
response=$(curl -s -w "\n%{http_code}" "$API_URL/admin/health" || echo "000")
status=$(echo "$response" | tail -n 1)

if [ "$status" = "200" ] || [ "$status" = "404" ]; then
    echo "✅ Admin endpoint accessible"
else
    echo "⚠️  Admin endpoint returned: $status"
fi

# Test 5: Response time check
echo "Test 5: Response time check..."
start_time=$(date +%s%N)
curl -s "$API_URL/health" > /dev/null
end_time=$(date +%s%N)
duration=$(( ($end_time - $start_time) / 1000000 )) # Convert to milliseconds

echo "Response time: ${duration}ms"

if [ $duration -lt 3000 ]; then
    echo "✅ Response time acceptable (<3s)"
else
    echo "⚠️  Response time slow (${duration}ms)"
fi

echo ""
echo "✅ All smoke tests passed!"
exit 0
