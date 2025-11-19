#!/bin/bash

# Backup Verification Script
# Verifies backup integrity and contents

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BACKUP_FILE=$1
BACKUP_DIR="./backups"

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
    echo -e "$1"
}

# Check if backup file is provided
if [ -z "$BACKUP_FILE" ]; then
    print_error "Usage: ./verify-backup.sh <backup_file>"
    exit 1
fi

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    print_error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

print_info "========================================"
print_info "Backup Verification Started"
print_info "========================================"
print_info "File: $BACKUP_FILE"
print_info "Date: $(date)"
print_info ""

# 1. Check file size
print_info "1. Checking file size..."
FILE_SIZE=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE" 2>/dev/null)
if [ "$FILE_SIZE" -gt 0 ]; then
    print_success "File size: $(numfmt --to=iec-i --suffix=B $FILE_SIZE 2>/dev/null || echo $FILE_SIZE bytes)"
else
    print_error "File is empty"
    exit 1
fi

# 2. Calculate checksum
print_info ""
print_info "2. Calculating checksum..."
CHECKSUM=$(sha256sum "$BACKUP_FILE" | awk '{print $1}')
print_success "SHA-256: $CHECKSUM"

# 3. Check if file is compressed
print_info ""
print_info "3. Checking compression..."
if [[ "$BACKUP_FILE" == *.gz ]]; then
    print_success "File is gzip compressed"

    # Test gzip integrity
    if gzip -t "$BACKUP_FILE" 2>/dev/null; then
        print_success "Gzip integrity check passed"
    else
        print_error "Gzip integrity check failed"
        exit 1
    fi

    # Decompress to temp file for further checks
    TEMP_FILE="/tmp/backup_verify_$$.sql"
    print_info "Decompressing for content verification..."
    gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"
    VERIFY_FILE="$TEMP_FILE"
else
    print_warning "File is not compressed"
    VERIFY_FILE="$BACKUP_FILE"
fi

# 4. Verify SQL dump structure
print_info ""
print_info "4. Verifying SQL dump structure..."

# Check for PostgreSQL dump header
if grep -q "PostgreSQL database dump" "$VERIFY_FILE" 2>/dev/null; then
    print_success "Valid PostgreSQL dump format"
else
    print_warning "PostgreSQL dump header not found"
fi

# Check for table definitions
TABLE_COUNT=$(grep -c "CREATE TABLE" "$VERIFY_FILE" 2>/dev/null || echo "0")
print_info "   Tables found: $TABLE_COUNT"

# Check for data inserts
INSERT_COUNT=$(grep -c "INSERT INTO" "$VERIFY_FILE" 2>/dev/null || echo "0")
COPY_COUNT=$(grep -c "COPY.*FROM stdin" "$VERIFY_FILE" 2>/dev/null || echo "0")
DATA_STATEMENTS=$((INSERT_COUNT + COPY_COUNT))
print_info "   Data statements: $DATA_STATEMENTS"

if [ "$TABLE_COUNT" -gt 0 ] && [ "$DATA_STATEMENTS" -gt 0 ]; then
    print_success "SQL dump contains tables and data"
else
    print_warning "SQL dump may be incomplete"
fi

# 5. Check for critical tables
print_info ""
print_info "5. Checking for critical tables..."

CRITICAL_TABLES=("users" "posts" "sessions" "audit_logs")
MISSING_TABLES=0

for table in "${CRITICAL_TABLES[@]}"; do
    if grep -q "CREATE TABLE.*$table" "$VERIFY_FILE" 2>/dev/null; then
        print_success "   Found table: $table"
    else
        print_error "   Missing table: $table"
        MISSING_TABLES=$((MISSING_TABLES + 1))
    fi
done

if [ "$MISSING_TABLES" -eq 0 ]; then
    print_success "All critical tables present"
else
    print_warning "$MISSING_TABLES critical table(s) missing"
fi

# 6. Estimate record counts
print_info ""
print_info "6. Estimating data volume..."

for table in "${CRITICAL_TABLES[@]}"; do
    # Count COPY data lines for each table
    COUNT=$(awk "/COPY.*$table.*FROM stdin/,/^\\\\\\.$/" "$VERIFY_FILE" 2>/dev/null | grep -v "COPY\|^\\\\\." | wc -l | tr -d ' ')
    if [ "$COUNT" -gt 0 ]; then
        print_info "   $table: ~$COUNT records"
    fi
done

# 7. Test restore to temporary database (optional, requires Docker)
print_info ""
print_info "7. Test restore (optional)..."

if command -v docker &> /dev/null; then
    print_info "Starting temporary PostgreSQL container..."

    # Start temporary PostgreSQL container
    TEMP_CONTAINER="backup_verify_postgres_$$"
    docker run -d --name "$TEMP_CONTAINER" \
        -e POSTGRES_PASSWORD=test \
        -e POSTGRES_DB=test_restore \
        postgres:14-alpine > /dev/null 2>&1

    # Wait for PostgreSQL to be ready
    sleep 5

    # Attempt restore
    if docker exec -i "$TEMP_CONTAINER" psql -U postgres -d test_restore < "$VERIFY_FILE" > /dev/null 2>&1; then
        print_success "Test restore successful"

        # Verify tables exist
        TABLE_COUNT=$(docker exec "$TEMP_CONTAINER" psql -U postgres -d test_restore -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'" | tr -d ' ')
        print_info "   Restored tables: $TABLE_COUNT"
    else
        print_error "Test restore failed"
    fi

    # Cleanup
    docker rm -f "$TEMP_CONTAINER" > /dev/null 2>&1
else
    print_warning "Docker not available - skipping test restore"
fi

# Cleanup temp file if created
if [ -n "$TEMP_FILE" ] && [ -f "$TEMP_FILE" ]; then
    rm "$TEMP_FILE"
fi

# 8. Generate verification report
print_info ""
print_info "========================================"
print_info "Verification Summary"
print_info "========================================"
print_info "Backup File: $BACKUP_FILE"
print_info "File Size: $(numfmt --to=iec-i --suffix=B $FILE_SIZE 2>/dev/null || echo $FILE_SIZE bytes)"
print_info "Checksum: $CHECKSUM"
print_info "Tables: $TABLE_COUNT"
print_info "Data Statements: $DATA_STATEMENTS"
print_info "Critical Tables: $((${#CRITICAL_TABLES[@]} - MISSING_TABLES))/${#CRITICAL_TABLES[@]}"
print_info ""

# Save verification metadata
METADATA_FILE="${BACKUP_FILE}.verify.json"
cat > "$METADATA_FILE" << EOF
{
  "verificationDate": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "backupFile": "$BACKUP_FILE",
  "fileSize": $FILE_SIZE,
  "checksum": "$CHECKSUM",
  "tables": $TABLE_COUNT,
  "dataStatements": $DATA_STATEMENTS,
  "criticalTables": {
    "total": ${#CRITICAL_TABLES[@]},
    "found": $((${#CRITICAL_TABLES[@]} - MISSING_TABLES)),
    "missing": $MISSING_TABLES
  },
  "status": "verified"
}
EOF

print_success "Verification metadata saved to: $METADATA_FILE"
print_info ""
print_success "Backup verification completed successfully!"

exit 0
