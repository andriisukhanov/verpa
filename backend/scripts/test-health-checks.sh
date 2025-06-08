#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Testing API Gateway Health Checks${NC}"
echo "====================================="

# API Gateway URL
API_URL="http://localhost:3000"

# 1. Basic health check
echo -e "\n${GREEN}1. Testing basic health check:${NC}"
curl -s "${API_URL}/health" | jq .

# 2. Services health check
echo -e "\n${GREEN}2. Testing services health check:${NC}"
curl -s "${API_URL}/health/services" | jq .

# 3. System health check
echo -e "\n${GREEN}3. Testing system health check:${NC}"
curl -s "${API_URL}/health/system" | jq .

# 4. Metrics
echo -e "\n${GREEN}4. Testing metrics endpoint:${NC}"
curl -s "${API_URL}/health/metrics" | jq .

# 5. Readiness probe
echo -e "\n${GREEN}5. Testing readiness probe:${NC}"
curl -s "${API_URL}/health/ready" | jq .

# 6. Liveness probe
echo -e "\n${GREEN}6. Testing liveness probe:${NC}"
curl -s "${API_URL}/health/live" | jq .

echo -e "\n${YELLOW}Testing individual service health through proxy:${NC}"
echo "================================================"

# Test each service through the API Gateway
services=("users" "aquariums" "events")

for service in "${services[@]}"; do
    echo -e "\n${GREEN}Testing ${service} service:${NC}"
    response=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/${service}/health")
    
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✓ ${service} service is healthy (HTTP ${response})${NC}"
    else
        echo -e "${RED}✗ ${service} service is unhealthy (HTTP ${response})${NC}"
    fi
done

echo -e "\n${YELLOW}Done!${NC}"