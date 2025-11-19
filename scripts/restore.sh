#!/bin/bash

# Restore Script for Database and Redis
# Usage: ./scripts/restore.sh [postgres_backup] [redis_backup]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

POSTGRES_BACKUP=$1
REDIS_BACKUP=$2

if [ -z "$POSTGRES_BACKUP" ]; then
    echo -e "${YELLOW}Available PostgreSQL backups:${NC}"
    ls -lh backups/postgres_*.sql.gz 2>/dev/null || echo "No backups found"
    echo ""
    echo "Usage: ./scripts/restore.sh [postgres_backup] [redis_backup]"
    echo "Example: ./scripts/restore.sh backups/postgres_20250119.sql.gz backups/redis_20250119.rdb"
    exit 1
fi

echo -e "${GREEN}====================================${NC}"
echo -e "${GREEN}Starting Restore Process${NC}"
echo -e "${GREEN}====================================${NC}"

# Load environment variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

if [ -f "${PROJECT_DIR}/.env" ]; then
    set -a
    source "${PROJECT_DIR}/.env"
    set +a
fi

# Restore PostgreSQL
if [ -f "$POSTGRES_BACKUP" ]; then
    echo -e "${YELLOW}Restoring PostgreSQL database from ${POSTGRES_BACKUP}...${NC}"

    # Decompress if needed
    if [[ "$POSTGRES_BACKUP" == *.gz ]]; then
        gunzip -c "$POSTGRES_BACKUP" | docker-compose exec -T postgres psql -U ${DATABASE_USER:-postgres} ${DATABASE_NAME:-social_media_db}
    else
        docker-compose exec -T postgres psql -U ${DATABASE_USER:-postgres} ${DATABASE_NAME:-social_media_db} < "$POSTGRES_BACKUP"
    fi

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}PostgreSQL restore completed!${NC}"
    else
        echo -e "${RED}Error: PostgreSQL restore failed${NC}"
        exit 1
    fi
else
    echo -e "${RED}Error: PostgreSQL backup file not found: ${POSTGRES_BACKUP}${NC}"
    exit 1
fi

# Restore Redis
if [ -n "$REDIS_BACKUP" ] && [ -f "$REDIS_BACKUP" ]; then
    echo -e "${YELLOW}Restoring Redis data from ${REDIS_BACKUP}...${NC}"

    # Stop Redis
    docker-compose stop redis

    # Copy backup to container
    docker cp "$REDIS_BACKUP" $(docker-compose ps -q redis):/data/dump.rdb

    # Start Redis
    docker-compose start redis

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Redis restore completed!${NC}"
    else
        echo -e "${RED}Error: Redis restore failed${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}====================================${NC}"
echo -e "${GREEN}Restore completed successfully!${NC}"
echo -e "${GREEN}====================================${NC}"
