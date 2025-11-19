#!/bin/bash

# Smoke Test Script
# Quick functional tests after deployment or recovery

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_URL=${1:-"http://localhost:3000"}
TEST_USER_EMAIL="smoketest_$(date +%s)@example.com"
TEST_USER_PASSWORD="TestPassword123!"

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

# Cleanup function
cleanup() {
    print_info "Cleaning up test data..."
    # Add cleanup logic here if needed
}

trap cleanup EXIT

print_header "Smoke Test Suite"
print_info "Target: $API_URL"
print_info "Time: $(date)"

TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test 1: API is responding
print_header "1. Basic Connectivity"
TOTAL_TESTS=$((TOTAL_TESTS + 1))

response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health" 2>/dev/null || echo "000")
if [ "$response" == "200" ]; then
    print_success "API is responding (HTTP 200)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    print_error "API not responding (HTTP $response)"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Test 2: User registration
print_header "2. User Registration"
TOTAL_TESTS=$((TOTAL_TESTS + 1))

register_response=$(curl -s -X POST "$API_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_USER_EMAIL\",\"password\":\"$TEST_USER_PASSWORD\",\"username\":\"smoketest_user\"}" \
    2>/dev/null)

if echo "$register_response" | grep -q "token\|success\|user"; then
    print_success "User registration successful"
    PASSED_TESTS=$((PASSED_TESTS + 1))

    # Extract token if available
    if command -v jq &> /dev/null; then
        ACCESS_TOKEN=$(echo "$register_response" | jq -r '.token // .accessToken // empty' 2>/dev/null)
    fi
else
    print_error "User registration failed"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Test 3: User login
print_header "3. User Authentication"
TOTAL_TESTS=$((TOTAL_TESTS + 1))

login_response=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$TEST_USER_EMAIL\",\"password\":\"$TEST_USER_PASSWORD\"}" \
    2>/dev/null)

if echo "$login_response" | grep -q "token\|accessToken"; then
    print_success "User login successful"
    PASSED_TESTS=$((PASSED_TESTS + 1))

    # Extract access token
    if command -v jq &> /dev/null; then
        ACCESS_TOKEN=$(echo "$login_response" | jq -r '.token // .accessToken' 2>/dev/null)
        print_info "Access token obtained"
    fi
else
    print_error "User login failed"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Test 4: Create a post (if authenticated)
if [ -n "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "null" ]; then
    print_header "4. Create Content"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    post_response=$(curl -s -X POST "$API_URL/posts" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -d "{\"content\":\"Smoke test post at $(date)\",\"visibility\":\"public\"}" \
        2>/dev/null)

    if echo "$post_response" | grep -q "id\|post\|success"; then
        print_success "Post creation successful"
        PASSED_TESTS=$((PASSED_TESTS + 1))

        # Extract post ID
        if command -v jq &> /dev/null; then
            POST_ID=$(echo "$post_response" | jq -r '.post.id // .id // empty' 2>/dev/null)
        fi
    else
        print_error "Post creation failed"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi

    # Test 5: Read the post
    if [ -n "$POST_ID" ] && [ "$POST_ID" != "null" ]; then
        print_header "5. Read Content"
        TOTAL_TESTS=$((TOTAL_TESTS + 1))

        get_response=$(curl -s -X GET "$API_URL/posts/$POST_ID" \
            -H "Authorization: Bearer $ACCESS_TOKEN" \
            2>/dev/null)

        if echo "$get_response" | grep -q "Smoke test post"; then
            print_success "Post retrieval successful"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            print_error "Post retrieval failed"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi

        # Test 6: Update the post
        print_header "6. Update Content"
        TOTAL_TESTS=$((TOTAL_TESTS + 1))

        update_response=$(curl -s -X PATCH "$API_URL/posts/$POST_ID" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $ACCESS_TOKEN" \
            -d "{\"content\":\"Updated smoke test post at $(date)\"}" \
            2>/dev/null)

        if echo "$update_response" | grep -q "Updated smoke test post\|success"; then
            print_success "Post update successful"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            print_error "Post update failed"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi

        # Test 7: Delete the post
        print_header "7. Delete Content"
        TOTAL_TESTS=$((TOTAL_TESTS + 1))

        delete_response=$(curl -s -X DELETE "$API_URL/posts/$POST_ID" \
            -H "Authorization: Bearer $ACCESS_TOKEN" \
            2>/dev/null)

        if echo "$delete_response" | grep -q "success\|deleted" || [ "$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/posts/$POST_ID" -H "Authorization: Bearer $ACCESS_TOKEN" 2>/dev/null)" == "404" ]; then
            print_success "Post deletion successful"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            print_error "Post deletion failed"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    fi
else
    print_info "Skipping authenticated tests (no access token)"
fi

# Test 8: Database connectivity
print_header "8. Database Health"
TOTAL_TESTS=$((TOTAL_TESTS + 1))

db_health=$(curl -s "$API_URL/health/database" 2>/dev/null)
if echo "$db_health" | grep -q "healthy\|ok\|connected"; then
    print_success "Database is healthy"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    print_error "Database health check failed"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Test 9: Performance check
print_header "9. Performance Check"
TOTAL_TESTS=$((TOTAL_TESTS + 1))

start_time=$(date +%s%N)
curl -s "$API_URL/health" > /dev/null 2>&1
end_time=$(date +%s%N)
response_time=$(( (end_time - start_time) / 1000000 ))

print_info "Response time: ${response_time}ms"

if [ "$response_time" -lt 1000 ]; then
    print_success "Response time acceptable (< 1s)"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    print_error "Response time slow (${response_time}ms)"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Test 10: Error handling
print_header "10. Error Handling"
TOTAL_TESTS=$((TOTAL_TESTS + 1))

error_response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/nonexistent-endpoint" 2>/dev/null)
if [ "$error_response" == "404" ]; then
    print_success "404 error handling works"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    print_error "Unexpected error response (HTTP $error_response)"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Summary
print_header "Smoke Test Summary"

echo ""
echo "Total Tests: $TOTAL_TESTS"
print_success "Passed: $PASSED_TESTS"
print_error "Failed: $FAILED_TESTS"

PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
echo ""
print_info "Success Rate: ${PASS_RATE}%"

# Determine overall status
if [ "$FAILED_TESTS" -eq 0 ]; then
    echo ""
    print_success "All smoke tests passed! ✓"
    exit 0
elif [ "$PASS_RATE" -ge 70 ]; then
    echo ""
    print_info "Most smoke tests passed (${PASS_RATE}%)"
    exit 0
else
    echo ""
    print_error "Smoke tests failed!"
    exit 1
fi
