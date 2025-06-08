#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo -e "${BLUE}=== Verpa Test Suite ===${NC}"
echo ""

# Function to run tests and track results
run_test() {
    local test_name=$1
    local test_command=$2
    local test_dir=$3
    
    echo -e "${YELLOW}Running $test_name...${NC}"
    
    if [ -n "$test_dir" ]; then
        cd "$test_dir" || exit 1
    fi
    
    if eval "$test_command"; then
        echo -e "${GREEN}✓ $test_name passed${NC}"
        ((PASSED_TESTS++))
    else
        echo -e "${RED}✗ $test_name failed${NC}"
        ((FAILED_TESTS++))
    fi
    
    ((TOTAL_TESTS++))
    
    if [ -n "$test_dir" ]; then
        cd - > /dev/null || exit 1
    fi
    
    echo ""
}

# Backend Tests
echo -e "${BLUE}[Backend Tests]${NC}"
echo ""

# Common package tests
run_test "Common Package Tests" "yarn test" "backend/packages/common"

# Service tests
for service in user-service aquarium-service event-service notification-service media-service api-gateway; do
    if [ -d "backend/services/$service" ]; then
        run_test "$service Tests" "yarn test" "backend/services/$service"
    fi
done

# Mobile Tests
echo -e "${BLUE}[Mobile Tests]${NC}"
echo ""

# Check if Flutter is installed
if command -v flutter &> /dev/null; then
    run_test "Flutter Tests" "flutter test" "mobile"
    
    # Run integration tests if on a machine with display
    if [ -n "$DISPLAY" ] || [ "$(uname)" == "Darwin" ]; then
        run_test "Flutter Integration Tests" "flutter test integration_test" "mobile"
    else
        echo -e "${YELLOW}Skipping Flutter integration tests (no display available)${NC}"
    fi
else
    echo -e "${YELLOW}Flutter not installed, skipping mobile tests${NC}"
fi

# Admin Panel Tests
echo -e "${BLUE}[Admin Panel Tests]${NC}"
echo ""

if [ -d "admin" ]; then
    run_test "Admin Panel Tests" "npm test -- --passWithNoTests" "admin"
else
    echo -e "${YELLOW}Admin panel not found, skipping tests${NC}"
fi

# API Integration Tests
echo -e "${BLUE}[API Integration Tests]${NC}"
echo ""

# Check if services are running
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    run_test "API Gateway Integration Tests" "yarn test:e2e" "backend/services/api-gateway"
else
    echo -e "${YELLOW}API Gateway not running, skipping integration tests${NC}"
    echo -e "${YELLOW}Run 'docker compose up -d' to start services${NC}"
fi

# Database Tests
echo -e "${BLUE}[Database Tests]${NC}"
echo ""

# Check MongoDB connection
if docker ps | grep -q verpa-mongodb; then
    echo -e "${GREEN}✓ MongoDB is running${NC}"
else
    echo -e "${YELLOW}⚠ MongoDB is not running${NC}"
fi

# Check Redis connection
if docker ps | grep -q verpa-redis; then
    echo -e "${GREEN}✓ Redis is running${NC}"
else
    echo -e "${YELLOW}⚠ Redis is not running${NC}"
fi

echo ""

# Test Summary
echo -e "${BLUE}=== Test Summary ===${NC}"
echo -e "Total Tests Run: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}All tests passed! 🎉${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Please check the output above.${NC}"
    exit 1
fi