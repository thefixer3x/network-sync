#!/bin/bash

# Backup Script for Database and Redis
# Usage: ./scripts/backup.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${GREEN}====================================${NC}"
echo -e "${GREEN}Starting Backup Process${NC}"
echo -e "${GREEN}Timestamp: ${TIMESTAMP}${NC}"
echo -e "${GREEN}====================================${NC}"

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Load environment variables
if [ -f "${PROJECT_DIR}/.env" ]; then
    set -a
    source "${PROJECT_DIR}/.env"
    set +a
fi

# Backup PostgreSQL
echo -e "${YELLOW}Backing up PostgreSQL database...${NC}"
docker-compose exec -T postgres pg_dump -U ${DATABASE_USER:-postgres} ${DATABASE_NAME:-social_media_db} > "${BACKUP_DIR}/postgres_${TIMESTAMP}.sql"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}PostgreSQL backup completed: postgres_${TIMESTAMP}.sql${NC}"

    # Compress backup
    gzip "${BACKUP_DIR}/postgres_${TIMESTAMP}.sql"
    echo -e "${GREEN}Backup compressed: postgres_${TIMESTAMP}.sql.gz${NC}"
else
    echo -e "${RED}Error: PostgreSQL backup failed${NC}"
    exit 1
fi

# Backup Redis
echo -e "${YELLOW}Backing up Redis data...${NC}"
docker-compose exec redis redis-cli BGSAVE

# Wait for save to complete
sleep 2

# Copy Redis dump
docker cp $(docker-compose ps -q redis):/data/dump.rdb "${BACKUP_DIR}/redis_${TIMESTAMP}.rdb"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Redis backup completed: redis_${TIMESTAMP}.rdb${NC}"
else
    echo -e "${RED}Error: Redis backup failed${NC}"
fi

# Calculate backup sizes
echo -e "${YELLOW}Backup Summary:${NC}"
ls -lh "${BACKUP_DIR}" | grep "${TIMESTAMP}"

# Clean up old backups (keep last 7 days)
echo -e "${YELLOW}Cleaning up old backups (keeping last 7 days)...${NC}"
find "${BACKUP_DIR}" -name "postgres_*.sql.gz" -mtime +7 -delete
find "${BACKUP_DIR}" -name "redis_*.rdb" -mtime +7 -delete

echo -e "${GREEN}====================================${NC}"
echo -e "${GREEN}Backup completed successfully!${NC}"
echo -e "${GREEN}====================================${NC}"
