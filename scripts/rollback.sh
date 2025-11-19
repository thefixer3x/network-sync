#!/bin/bash

# Rollback Deployment Script
# Usage: ./scripts/rollback.sh [version]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

VERSION=${1}

if [ -z "$VERSION" ]; then
    echo -e "${RED}Error: Version is required${NC}"
    echo "Usage: ./scripts/rollback.sh [version]"
    echo "Example: ./scripts/rollback.sh v1.0.0"
    exit 1
fi

echo -e "${GREEN}====================================${NC}"
echo -e "${GREEN}Rolling back to version: ${VERSION}${NC}"
echo -e "${GREEN}====================================${NC}"

# Check if image exists
if ! docker images | grep -q "social-media-api.*${VERSION}"; then
    echo -e "${RED}Error: Image social-media-api:${VERSION} not found${NC}"
    echo "Available images:"
    docker images | grep social-media-api
    exit 1
fi

# Stop current services
echo -e "${YELLOW}Stopping current services...${NC}"
docker-compose down

# Update image tag
echo -e "${YELLOW}Updating to version ${VERSION}...${NC}"
export IMAGE_TAG=${VERSION}

# Start services with rollback version
echo -e "${YELLOW}Starting services...${NC}"
docker-compose up -d

# Wait for services
echo -e "${YELLOW}Waiting for services...${NC}"
sleep 10

# Check health
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${PORT:-3000}/health/live)

if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}Rollback completed successfully!${NC}"
    docker-compose ps
else
    echo -e "${RED}Error: Rollback health check failed${NC}"
    docker-compose logs api
    exit 1
fi
