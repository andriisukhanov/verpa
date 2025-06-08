#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Testing Analytics Service${NC}"
echo "========================="

# Analytics Service URL
ANALYTICS_URL="http://localhost:3006/api"

# 1. Health check
echo -e "\n${GREEN}1. Testing health check:${NC}"
curl -s "${ANALYTICS_URL}/health" | jq .

# 2. Track a test event
echo -e "\n${GREEN}2. Tracking a test event:${NC}"
curl -s -X POST "${ANALYTICS_URL}/analytics/track" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "viewed",
    "eventCategory": "aquarium",
    "entityType": "aquarium",
    "entityId": "test-aquarium-123",
    "userId": "test-user-123",
    "properties": {
      "aquariumName": "Test Aquarium",
      "viewDuration": 45
    },
    "metadata": {
      "platform": "web",
      "version": "1.0.0",
      "sessionId": "session-123"
    }
  }'
echo -e "${GREEN}✓ Event tracked${NC}"

# 3. Track multiple events
echo -e "\n${GREEN}3. Tracking multiple events:${NC}"
for i in {1..5}; do
  curl -s -X POST "${ANALYTICS_URL}/analytics/track" \
    -H "Content-Type: application/json" \
    -d "{
      \"eventType\": \"parameter_recorded\",
      \"eventCategory\": \"aquarium\",
      \"entityType\": \"aquarium\",
      \"entityId\": \"test-aquarium-123\",
      \"userId\": \"test-user-123\",
      \"properties\": {
        \"parameter\": \"temperature\",
        \"value\": $((25 + RANDOM % 5)),
        \"unit\": \"celsius\"
      }
    }"
done
echo -e "${GREEN}✓ Multiple events tracked${NC}"

# 4. Get user analytics
echo -e "\n${GREEN}4. Getting user analytics:${NC}"
curl -s "${ANALYTICS_URL}/analytics/users/test-user-123" | jq .

# 5. Get user events
echo -e "\n${GREEN}5. Getting user event history:${NC}"
START_DATE=$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)
END_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)
curl -s "${ANALYTICS_URL}/analytics/users/test-user-123/events?startDate=${START_DATE}&endDate=${END_DATE}" | jq .

# 6. Get activity statistics
echo -e "\n${GREEN}6. Getting activity statistics:${NC}"
curl -s "${ANALYTICS_URL}/analytics/activity-stats?startDate=${START_DATE}&endDate=${END_DATE}" | jq .

# 7. Get user segments
echo -e "\n${GREEN}7. Getting user segments:${NC}"
curl -s "${ANALYTICS_URL}/analytics/segments" | jq .

# 8. Test metrics endpoint
echo -e "\n${GREEN}8. Testing metrics query:${NC}"
curl -s "${ANALYTICS_URL}/analytics/metrics?metricName=events.total&startDate=${START_DATE}&endDate=${END_DATE}" | jq .

echo -e "\n${YELLOW}Testing Kafka Event Integration${NC}"
echo "================================"

# 9. Simulate user event via API Gateway
echo -e "\n${GREEN}9. Simulating user login event:${NC}"
# This would normally be triggered by the user service
echo "Note: In production, events are automatically sent via Kafka when users perform actions"

echo -e "\n${YELLOW}Done!${NC}"
echo -e "\nView analytics dashboard at: ${ANALYTICS_URL}/docs"