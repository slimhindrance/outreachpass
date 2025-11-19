#!/bin/bash
# Production Environment End-to-End Test Suite
# Tests all critical endpoints and services in production.

set -e

# Configuration
PROD_API_BASE_URL="https://hwl4ycnvda.execute-api.us-east-1.amazonaws.com"
PASSED=0
FAILED=0
WARNINGS=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo ""
    echo -e "${BOLD}${BLUE}============================================================${NC}"
    printf "${BOLD}${BLUE}%60s${NC}\n" "$1"
    echo -e "${BOLD}${BLUE}============================================================${NC}"
    echo ""
}

print_test() {
    echo -e "\n${BLUE}🧪 Testing:${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED++))
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
    ((FAILED++))
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Test 1: Health Check
test_health_endpoint() {
    print_test "Health Check"

    local response=$(curl -s -w "\n%{http_code}" "${PROD_API_BASE_URL}/health" 2>&1)
    local body=$(echo "$response" | head -n -1)
    local status=$(echo "$response" | tail -n 1)

    if [ "$status" != "200" ]; then
        print_error "Health check failed with status $status"
        echo "Response: $body"
        return 1
    fi

    # Check if response contains "healthy"
    if echo "$body" | grep -q '"status".*"healthy"'; then
        print_info "Status: healthy"
    else
        print_error "Health status is not 'healthy'"
        echo "$body"
        return 1
    fi

    # Check database status
    if echo "$body" | grep -q '"database".*"healthy"'; then
        print_info "✓ Database: connected"
    else
        print_warning "Database status unclear"
    fi

    # Check S3 status
    if echo "$body" | grep -q '"s3".*"healthy"'; then
        print_info "✓ S3: accessible"
    else
        print_warning "S3 status unclear"
    fi

    # Check SQS status
    if echo "$body" | grep -q '"sqs".*"healthy"'; then
        print_info "✓ SQS: accessible"
    else
        print_warning "SQS status unclear"
    fi

    print_success "Health endpoint is working correctly"
}

# Test 2: List Cards (should work with empty or existing data)
test_list_cards() {
    print_test "List Cards Endpoint"

    local response=$(curl -s -w "\n%{http_code}" "${PROD_API_BASE_URL}/api/admin/cards" 2>&1)
    local body=$(echo "$response" | head -n -1)
    local status=$(echo "$response" | tail -n 1)

    if [ "$status" != "200" ]; then
        print_error "List cards failed with status $status"
        echo "Response: $body"
        return 1
    fi

    print_info "Cards endpoint responding correctly"
    print_success "List cards endpoint is working"
}

# Test 3: Create Card
test_create_card() {
    print_test "Create Card"

    local card_data='{
        "tenant_id": "00000000-0000-0000-0000-000000000000",
        "event_id": "00000000-0000-0000-0000-000000000000",
        "attendee_id": "00000000-0000-0000-0000-000000000000",
        "first_name": "Production",
        "last_name": "Test",
        "email": "production.test@example.com",
        "company": "Test Corp",
        "title": "QA Engineer"
    }'

    local response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -d "$card_data" \
        "${PROD_API_BASE_URL}/api/admin/cards" 2>&1)

    local body=$(echo "$response" | head -n -1)
    local status=$(echo "$response" | tail -n 1)

    if [ "$status" != "200" ] && [ "$status" != "201" ]; then
        print_error "Create card failed with status $status"
        echo "Response: $body"
        return 1
    fi

    # Extract card ID for later tests
    CARD_ID=$(echo "$body" | grep -o '"id"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | cut -d'"' -f4)

    if [ -n "$CARD_ID" ]; then
        print_info "Created card with ID: $CARD_ID"
        print_success "Card creation successful"
    else
        print_error "Card created but no ID returned"
        echo "$body"
        return 1
    fi
}

# Test 4: Get Card
test_get_card() {
    print_test "Get Card by ID"

    if [ -z "$CARD_ID" ]; then
        print_warning "Skipping get card test - no card ID available"
        return 0
    fi

    local response=$(curl -s -w "\n%{http_code}" \
        "${PROD_API_BASE_URL}/api/admin/cards/${CARD_ID}" 2>&1)

    local body=$(echo "$response" | head -n -1)
    local status=$(echo "$response" | tail -n 1)

    if [ "$status" != "200" ]; then
        print_error "Get card failed with status $status"
        echo "Response: $body"
        return 1
    fi

    if echo "$body" | grep -q '"first_name".*"Production"'; then
        print_info "Card data verified"
        print_success "Card retrieval successful"
    else
        print_error "Card data mismatch"
        echo "$body"
        return 1
    fi
}

# Test 5: Update Card
test_update_card() {
    print_test "Update Card"

    if [ -z "$CARD_ID" ]; then
        print_warning "Skipping update card test - no card ID available"
        return 0
    fi

    local update_data='{"title": "Senior QA Engineer"}'

    local response=$(curl -s -w "\n%{http_code}" \
        -X PUT \
        -H "Content-Type: application/json" \
        -d "$update_data" \
        "${PROD_API_BASE_URL}/api/admin/cards/${CARD_ID}" 2>&1)

    local body=$(echo "$response" | head -n -1)
    local status=$(echo "$response" | tail -n 1)

    if [ "$status" != "200" ]; then
        print_error "Update card failed with status $status"
        echo "Response: $body"
        return 1
    fi

    if echo "$body" | grep -q '"title".*"Senior QA Engineer"'; then
        print_success "Card update successful"
    else
        print_error "Card update failed - title not updated"
        echo "$body"
        return 1
    fi
}

# Test 6: Delete Card
test_delete_card() {
    print_test "Delete Card"

    if [ -z "$CARD_ID" ]; then
        print_warning "Skipping delete card test - no card ID available"
        return 0
    fi

    local response=$(curl -s -w "\n%{http_code}" \
        -X DELETE \
        "${PROD_API_BASE_URL}/api/admin/cards/${CARD_ID}" 2>&1)

    local status=$(echo "$response" | tail -n 1)

    if [ "$status" != "200" ] && [ "$status" != "204" ]; then
        print_error "Delete card failed with status $status"
        return 1
    fi

    print_success "Card deletion successful"
}

# Test 7: Verify Deletion
test_verify_deletion() {
    print_test "Verify Card Deletion"

    if [ -z "$CARD_ID" ]; then
        print_warning "Skipping deletion verification - no card ID available"
        return 0
    fi

    local response=$(curl -s -w "\n%{http_code}" \
        "${PROD_API_BASE_URL}/api/admin/cards/${CARD_ID}" 2>&1)

    local status=$(echo "$response" | tail -n 1)

    if [ "$status" == "404" ]; then
        print_success "Card deletion verified"
    elif [ "$status" == "200" ]; then
        print_error "Card still exists after deletion"
        return 1
    else
        print_warning "Unexpected status $status when fetching deleted card"
    fi
}

# Print Summary
print_summary() {
    print_header "Test Summary"

    local total=$((PASSED + FAILED))
    local success_rate=0
    if [ $total -gt 0 ]; then
        success_rate=$(awk "BEGIN {printf \"%.1f\", ($PASSED / $total) * 100}")
    fi

    echo -e "${GREEN}Passed:${NC}   $PASSED/$total ($success_rate%)"
    echo -e "${RED}Failed:${NC}   $FAILED/$total"
    echo -e "${YELLOW}Warnings:${NC} $WARNINGS"

    if [ $FAILED -eq 0 ]; then
        echo -e "\n${GREEN}${BOLD}🎉 All tests passed!${NC}"
        return 0
    else
        echo -e "\n${RED}${BOLD}❌ $FAILED test(s) failed${NC}"
        return 1
    fi
}

# Main execution
main() {
    print_header "OutreachPass Production Test Suite"
    print_info "Testing environment: $PROD_API_BASE_URL"

    # Run all tests (continue even if some fail)
    test_health_endpoint || true
    test_list_cards || true
    test_create_card || true
    test_get_card || true
    test_update_card || true
    test_delete_card || true
    test_verify_deletion || true

    # Print summary and exit with appropriate code
    print_summary
}

# Run main
main
