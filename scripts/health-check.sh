#!/bin/bash

# Health Check Script
# Comprehensive system health verification

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_URL=${1:-"http://localhost:3000"}
MAX_RETRIES=5
RETRY_DELAY=2

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
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

# Function to check HTTP endpoint
check_endpoint() {
    local url=$1
    local expected_status=${2:-200}
    local description=$3

    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")

    if [ "$response" -eq "$expected_status" ]; then
        print_success "$description (HTTP $response)"
        return 0
    else
        print_error "$description (HTTP $response, expected $expected_status)"
        return 1
    fi
}

# Function to check JSON response
check_json_response() {
    local url=$1
    local jq_filter=$2
    local expected_value=$3
    local description=$4

    response=$(curl -s "$url" 2>/dev/null)

    if [ -z "$response" ]; then
        print_error "$description (No response)"
        return 1
    fi

    if command -v jq &> /dev/null; then
        actual_value=$(echo "$response" | jq -r "$jq_filter" 2>/dev/null)

        if [ "$actual_value" == "$expected_value" ]; then
            print_success "$description ($actual_value)"
            return 0
        else
            print_error "$description (Got: $actual_value, Expected: $expected_value)"
            return 1
        fi
    else
        print_warning "$description (jq not installed, cannot verify)"
        return 0
    fi
}

# Function to check Docker container
check_docker_container() {
    local container_name=$1
    local description=$2

    if command -v docker &> /dev/null; then
        status=$(docker ps --filter "name=$container_name" --format "{{.Status}}" 2>/dev/null)

        if [ -n "$status" ] && [[ "$status" == *"Up"* ]]; then
            print_success "$description (Running)"
            return 0
        else
            print_error "$description (Not running)"
            return 1
        fi
    else
        print_warning "$description (Docker not available)"
        return 0
    fi
}

print_header "System Health Check"
print_info "Target: $API_URL"
print_info "Time: $(date)"

TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# 1. Container Health Checks
print_header "1. Container Status"

containers=("postgres:PostgreSQL Database" "redis:Redis Cache" "api:API Server")
for container_desc in "${containers[@]}"; do
    IFS=':' read -r container description <<< "$container_desc"
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    if check_docker_container "$container" "$description"; then
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
done

# 2. API Health Endpoints
print_header "2. API Health Endpoints"

# Wait for API to be ready
print_info "Waiting for API to be ready..."
retry_count=0
while [ $retry_count -lt $MAX_RETRIES ]; do
    if curl -s -f "$API_URL/health" > /dev/null 2>&1; then
        break
    fi
    retry_count=$((retry_count + 1))
    if [ $retry_count -lt $MAX_RETRIES ]; then
        print_info "Retry $retry_count/$MAX_RETRIES..."
        sleep $RETRY_DELAY
    fi
done

if [ $retry_count -eq $MAX_RETRIES ]; then
    print_error "API not responding after $MAX_RETRIES retries"
else
    print_success "API is responding"
fi

# Liveness probe
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if check_endpoint "$API_URL/health/live" 200 "Liveness Probe"; then
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# Readiness probe
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if check_endpoint "$API_URL/health/ready" 200 "Readiness Probe"; then
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# Database health
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if check_endpoint "$API_URL/health/database" 200 "Database Health"; then
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# 3. Core API Endpoints
print_header "3. Core API Endpoints"

# Health endpoint with JSON validation
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if check_json_response "$API_URL/health" ".status" "healthy" "General Health Status"; then
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# 4. Database Connectivity
print_header "4. Database Connectivity"

if command -v docker &> /dev/null; then
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    if docker exec postgres pg_isready -U postgres > /dev/null 2>&1; then
        print_success "PostgreSQL accepting connections"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        print_error "PostgreSQL not accepting connections"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi

    # Check database size
    DB_SIZE=$(docker exec postgres psql -U postgres -t -c "SELECT pg_size_pretty(pg_database_size('social_media_db'));" 2>/dev/null | xargs)
    if [ -n "$DB_SIZE" ]; then
        print_info "Database size: $DB_SIZE"
    fi
else
    print_warning "Docker not available - skipping database checks"
fi

# 5. Redis Connectivity
print_header "5. Redis Connectivity"

if command -v docker &> /dev/null; then
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    if docker exec redis redis-cli ping > /dev/null 2>&1; then
        print_success "Redis responding to PING"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        print_error "Redis not responding"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi

    # Check Redis memory usage
    REDIS_MEMORY=$(docker exec redis redis-cli INFO memory 2>/dev/null | grep "used_memory_human" | cut -d':' -f2 | tr -d '\r')
    if [ -n "$REDIS_MEMORY" ]; then
        print_info "Redis memory usage: $REDIS_MEMORY"
    fi
else
    print_warning "Docker not available - skipping Redis checks"
fi

# 6. Backup System Health
print_header "6. Backup System Health"

# Check backup directory
BACKUP_DIR="./backups"
if [ -d "$BACKUP_DIR" ]; then
    print_success "Backup directory exists"

    # Count backups
    BACKUP_COUNT=$(find "$BACKUP_DIR" -name "*.sql.gz" -o -name "*.sql" | wc -l | tr -d ' ')
    print_info "Backup files: $BACKUP_COUNT"

    # Find latest backup
    LATEST_BACKUP=$(find "$BACKUP_DIR" -name "*.sql.gz" -o -name "*.sql" | sort -r | head -1)
    if [ -n "$LATEST_BACKUP" ]; then
        BACKUP_AGE=$(( ($(date +%s) - $(stat -f%m "$LATEST_BACKUP" 2>/dev/null || stat -c%Y "$LATEST_BACKUP" 2>/dev/null)) / 3600 ))
        print_info "Latest backup: $(basename "$LATEST_BACKUP") (${BACKUP_AGE}h ago)"

        TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
        if [ "$BACKUP_AGE" -lt 48 ]; then
            print_success "Recent backup available (< 48h old)"
            PASSED_CHECKS=$((PASSED_CHECKS + 1))
        else
            print_warning "Latest backup is old (${BACKUP_AGE}h ago)"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
        fi
    fi
else
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    print_warning "Backup directory not found"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# 7. Disk Space
print_header "7. System Resources"

# Check disk space
if command -v df &> /dev/null; then
    DISK_USAGE=$(df -h . | awk 'NR==2 {print $5}' | tr -d '%')
    print_info "Disk usage: ${DISK_USAGE}%"

    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    if [ "$DISK_USAGE" -lt 80 ]; then
        print_success "Disk space sufficient (${DISK_USAGE}% used)"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        print_warning "Disk space running low (${DISK_USAGE}% used)"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
fi

# Check memory (if available)
if command -v free &> /dev/null; then
    MEM_USAGE=$(free | awk '/Mem:/ {printf "%.0f", $3/$2 * 100}')
    print_info "Memory usage: ${MEM_USAGE}%"
fi

# 8. Network Connectivity
print_header "8. Network Connectivity"

# Check external connectivity
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
if ping -c 1 8.8.8.8 > /dev/null 2>&1; then
    print_success "External network connectivity"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    print_error "No external network connectivity"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# 9. Security Checks
print_header "9. Security Checks"

# Check if .env file exists and is not world-readable
if [ -f ".env" ]; then
    PERMISSIONS=$(stat -f%A ".env" 2>/dev/null || stat -c%a ".env" 2>/dev/null)
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

    if [ "${PERMISSIONS: -1}" == "0" ]; then
        print_success ".env file permissions secure ($PERMISSIONS)"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        print_warning ".env file is world-readable ($PERMISSIONS)"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
fi

# 10. Summary
print_header "Health Check Summary"

echo ""
echo "Total Checks: $TOTAL_CHECKS"
print_success "Passed: $PASSED_CHECKS"
print_error "Failed: $FAILED_CHECKS"

PASS_RATE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
echo ""
print_info "Success Rate: ${PASS_RATE}%"

# Determine overall status
if [ "$FAILED_CHECKS" -eq 0 ]; then
    echo ""
    print_success "All health checks passed! ✓"
    exit 0
elif [ "$PASS_RATE" -ge 80 ]; then
    echo ""
    print_warning "Health checks mostly passed with some warnings"
    exit 0
else
    echo ""
    print_error "Health checks failed!"
    exit 1
fi
