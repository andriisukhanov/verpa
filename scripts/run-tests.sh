#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo "🧪 Verpa Test Suite Runner"
echo "=========================="

# Function to run tests and capture results
run_test_suite() {
    local suite_name=$1
    local test_command=$2
    
    echo -e "\n${YELLOW}Running $suite_name...${NC}"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✓ $suite_name passed${NC}"
        ((PASSED_TESTS++))
    else
        echo -e "${RED}✗ $suite_name failed${NC}"
        ((FAILED_TESTS++))
    fi
    
    ((TOTAL_TESTS++))
}

# Check if specific test type is requested
TEST_TYPE=${1:-all}

case $TEST_TYPE in
    unit)
        echo "Running Unit Tests..."
        
        # Backend unit tests
        run_test_suite "User Service Unit Tests" "cd backend/services/user-service && npm test"
        run_test_suite "Aquarium Service Unit Tests" "cd backend/services/aquarium-service && npm test"
        run_test_suite "Analytics Service Unit Tests" "cd backend/services/analytics-service && npm test"
        run_test_suite "Event Service Unit Tests" "cd backend/services/event-service && npm test"
        run_test_suite "Notification Service Unit Tests" "cd backend/services/notification-service && npm test"
        run_test_suite "Subscription Service Unit Tests" "cd backend/services/subscription-service && npm test"
        run_test_suite "Media Service Unit Tests" "cd backend/services/media-service && npm test"
        run_test_suite "API Gateway Unit Tests" "cd backend/services/api-gateway && npm test"
        
        # Mobile unit tests
        run_test_suite "Mobile App Unit Tests" "cd mobile && flutter test"
        
        # Admin panel unit tests
        run_test_suite "Admin Panel Unit Tests" "cd admin && npm test"
        ;;
        
    integration)
        echo "Running Integration Tests..."
        
        # Start test infrastructure
        echo -e "${YELLOW}Starting test infrastructure...${NC}"
        docker-compose -f docker-compose.test.yml up -d
        
        # Wait for services to be ready
        echo "Waiting for services to be ready..."
        sleep 30
        
        # Run integration tests
        run_test_suite "API Gateway Integration Tests" "npm run test:integration -- test/integration/api-gateway.integration.spec.ts"
        run_test_suite "User Service Integration Tests" "cd backend/services/user-service && npm run test:integration"
        run_test_suite "Aquarium Service Integration Tests" "cd backend/services/aquarium-service && npm run test:integration"
        
        # Stop test infrastructure
        echo -e "${YELLOW}Stopping test infrastructure...${NC}"
        docker-compose -f docker-compose.test.yml down
        ;;
        
    e2e)
        echo "Running E2E Tests..."
        
        # Start full application
        echo -e "${YELLOW}Starting application...${NC}"
        docker-compose -f docker-compose.test.yml up -d
        
        # Wait for services to be ready
        echo "Waiting for services to be ready..."
        sleep 60
        
        # Run E2E tests
        run_test_suite "Full Flow E2E Tests" "npm run test:e2e -- test/e2e/full-flow.e2e.spec.ts"
        
        # Stop application
        echo -e "${YELLOW}Stopping application...${NC}"
        docker-compose -f docker-compose.test.yml down
        ;;
        
    security)
        echo "Running Security Tests..."
        
        # Start test infrastructure
        echo -e "${YELLOW}Starting test infrastructure...${NC}"
        docker-compose -f docker-compose.test.yml up -d
        
        # Wait for services to be ready
        echo "Waiting for services to be ready..."
        sleep 30
        
        # Run security tests
        run_test_suite "Security Tests" "npm run test:security -- test/security/security.test.ts"
        
        # Stop test infrastructure
        echo -e "${YELLOW}Stopping test infrastructure...${NC}"
        docker-compose -f docker-compose.test.yml down
        ;;
        
    performance)
        echo "Running Performance Tests..."
        
        # Start application
        echo -e "${YELLOW}Starting application...${NC}"
        docker-compose up -d
        
        # Wait for services to be ready
        echo "Waiting for services to be ready..."
        sleep 60
        
        # Run load tests
        run_test_suite "Load Tests" "k6 run test/performance/load-test.js"
        
        # Run stress tests (optional)
        if [ "$2" == "stress" ]; then
            run_test_suite "Stress Tests" "k6 run test/performance/stress-test.js"
        fi
        
        # Stop application
        echo -e "${YELLOW}Stopping application...${NC}"
        docker-compose down
        ;;
        
    coverage)
        echo "Running Tests with Coverage..."
        
        # Backend coverage
        echo -e "${YELLOW}Collecting backend coverage...${NC}"
        cd backend
        npm run test:coverage
        
        # Mobile coverage
        echo -e "${YELLOW}Collecting mobile coverage...${NC}"
        cd ../mobile
        flutter test --coverage
        
        # Generate coverage report
        echo -e "${YELLOW}Generating coverage report...${NC}"
        cd ..
        npm run coverage:report
        ;;
        
    all)
        echo "Running All Tests..."
        
        # Run all test suites
        $0 unit
        $0 integration
        $0 security
        $0 e2e
        $0 coverage
        ;;
        
    *)
        echo "Usage: $0 [unit|integration|e2e|security|performance|coverage|all]"
        exit 1
        ;;
esac

# Print summary
echo -e "\n=========================="
echo "Test Summary"
echo "=========================="
echo -e "Total: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}All tests passed! 🎉${NC}"
    exit 0
else
    echo -e "\n${RED}Some tests failed. Please check the logs above.${NC}"
    exit 1
fi