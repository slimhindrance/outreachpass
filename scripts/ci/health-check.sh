#!/bin/bash
# Health Check Script for API
# Usage: ./health-check.sh <API_URL>

set -e

API_URL="${1:-https://api.outreachpass.base2ml.com}"
MAX_RETRIES=5
RETRY_DELAY=10

echo "🏥 Health checking: $API_URL"

# Function to check health endpoint
check_health() {
    local url="$1/health"
    local response=$(curl -s -w "\n%{http_code}" "$url" --max-time 10 || echo "000")
    local body=$(echo "$response" | head -n -1)
    local status=$(echo "$response" | tail -n 1)

    echo "Status code: $status"

    if [ "$status" = "200" ]; then
        echo "✅ Health check passed"
        echo "Response: $body"
        return 0
    else
        echo "❌ Health check failed"
        echo "Response: $body"
        return 1
    fi
}

# Retry logic
for i in $(seq 1 $MAX_RETRIES); do
    echo "Attempt $i/$MAX_RETRIES..."

    if check_health "$API_URL"; then
        echo ""
        echo "✅ API is healthy!"
        exit 0
    fi

    if [ $i -lt $MAX_RETRIES ]; then
        echo "Waiting ${RETRY_DELAY}s before retry..."
        sleep $RETRY_DELAY
    fi
done

echo ""
echo "❌ Health check failed after $MAX_RETRIES attempts"
exit 1
