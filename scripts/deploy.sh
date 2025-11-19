#!/bin/bash

# Production Deployment Script
# Usage: ./scripts/deploy.sh [environment]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${GREEN}====================================${NC}"
echo -e "${GREEN}Social Media API Deployment${NC}"
echo -e "${GREEN}Environment: ${ENVIRONMENT}${NC}"
echo -e "${GREEN}====================================${NC}"

# Check if environment file exists
ENV_FILE="${PROJECT_DIR}/.env.${ENVIRONMENT}"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: Environment file not found: ${ENV_FILE}${NC}"
    exit 1
fi

# Load environment variables
echo -e "${YELLOW}Loading environment variables...${NC}"
set -a
source "$ENV_FILE"
set +a

# Check required tools
echo -e "${YELLOW}Checking required tools...${NC}"
command -v docker >/dev/null 2>&1 || { echo -e "${RED}Error: docker is required but not installed.${NC}" >&2; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo -e "${RED}Error: docker-compose is required but not installed.${NC}" >&2; exit 1; }

# Build Docker image
echo -e "${YELLOW}Building Docker image...${NC}"
docker build -t social-media-api:${VERSION:-latest} -t social-media-api:latest .

# Run database migrations
echo -e "${YELLOW}Running database migrations...${NC}"
docker-compose run --rm api bun run migrate

# Deploy with Docker Compose
echo -e "${YELLOW}Deploying services...${NC}"
docker-compose up -d --remove-orphans

# Wait for services to be healthy
echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker-compose ps | grep -q "healthy"; then
        echo -e "${GREEN}Services are healthy!${NC}"
        break
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "Waiting for services... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}Error: Services failed to become healthy${NC}"
    docker-compose logs api
    exit 1
fi

# Check API health
echo -e "${YELLOW}Checking API health...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${PORT:-3000}/health/live)

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}API is healthy!${NC}"
else
    echo -e "${RED}Error: API health check failed (HTTP ${HTTP_CODE})${NC}"
    exit 1
fi

# Show deployment status
echo -e "${YELLOW}Deployment Status:${NC}"
docker-compose ps

echo -e "${GREEN}====================================${NC}"
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}====================================${NC}"
echo -e "API URL: http://localhost:${PORT:-3000}"
echo -e "Health: http://localhost:${PORT:-3000}/health"
echo -e "Metrics: http://localhost:${PORT:-3000}/metrics"
