#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Testing Subscription Service${NC}"
echo "============================"

# Service URL
SUBSCRIPTION_URL="http://localhost:3007/api"

# Test user ID
USER_ID="test-user-123"
USER_EMAIL="test@example.com"

# 1. Health check
echo -e "\n${GREEN}1. Testing health check:${NC}"
curl -s "${SUBSCRIPTION_URL}/health" | jq .

# 2. Get available plans
echo -e "\n${GREEN}2. Getting available subscription plans:${NC}"
curl -s "${SUBSCRIPTION_URL}/subscriptions/plans" | jq .

# 3. Get current subscription (should be none or free)
echo -e "\n${GREEN}3. Getting current subscription:${NC}"
curl -s "${SUBSCRIPTION_URL}/subscriptions/current" \
  -H "Authorization: Bearer test-token" | jq .

# 4. Create a trial subscription
echo -e "\n${GREEN}4. Creating trial subscription for Pro plan:${NC}"
SUBSCRIPTION_RESPONSE=$(curl -s -X POST "${SUBSCRIPTION_URL}/subscriptions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{
    "planId": "pro",
    "email": "test@example.com"
  }')
echo "$SUBSCRIPTION_RESPONSE" | jq .

# Extract subscription ID
SUBSCRIPTION_ID=$(echo "$SUBSCRIPTION_RESPONSE" | jq -r '.id // empty')

if [ -n "$SUBSCRIPTION_ID" ]; then
  # 5. Check feature access
  echo -e "\n${GREEN}5. Checking feature access:${NC}"
  echo -e "\n  Checking AI recommendations:"
  curl -s "${SUBSCRIPTION_URL}/subscriptions/check-feature/aiRecommendations" \
    -H "Authorization: Bearer test-token" | jq .
  
  echo -e "\n  Checking API access:"
  curl -s "${SUBSCRIPTION_URL}/subscriptions/check-feature/apiAccess" \
    -H "Authorization: Bearer test-token" | jq .

  # 6. Check resource limits
  echo -e "\n${GREEN}6. Checking resource limits:${NC}"
  echo -e "\n  Aquarium limit:"
  curl -s "${SUBSCRIPTION_URL}/subscriptions/check-limit/aquariums" \
    -H "Authorization: Bearer test-token" | jq .
  
  echo -e "\n  Photo limit:"
  curl -s "${SUBSCRIPTION_URL}/subscriptions/check-limit/photos" \
    -H "Authorization: Bearer test-token" | jq .

  # 7. Update subscription (cancel at period end)
  echo -e "\n${GREEN}7. Scheduling subscription cancellation:${NC}"
  curl -s -X PUT "${SUBSCRIPTION_URL}/subscriptions/${SUBSCRIPTION_ID}" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer test-token" \
    -d '{
      "cancelAtPeriodEnd": true
    }' | jq .

  # 8. Reactivate subscription
  echo -e "\n${GREEN}8. Reactivating subscription:${NC}"
  curl -s -X POST "${SUBSCRIPTION_URL}/subscriptions/${SUBSCRIPTION_ID}/reactivate" \
    -H "Authorization: Bearer test-token" | jq .
fi

# 9. Test Stripe webhook endpoint
echo -e "\n${GREEN}9. Testing Stripe webhook endpoint:${NC}"
echo "Note: In production, use Stripe CLI to test webhooks:"
echo "  stripe listen --forward-to localhost:3007/webhooks/stripe"
echo "  stripe trigger payment_intent.succeeded"

# 10. Create free subscription
echo -e "\n${GREEN}10. Creating free subscription:${NC}"
curl -s -X POST "${SUBSCRIPTION_URL}/subscriptions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{
    "planId": "free",
    "email": "free@example.com"
  }' | jq .

echo -e "\n${YELLOW}Done!${NC}"
echo -e "\nView API documentation at: ${SUBSCRIPTION_URL}/docs"
echo -e "\nNote: For full payment testing, you'll need:"
echo "  1. Valid Stripe API keys"
echo "  2. Stripe CLI for webhook testing"
echo "  3. Test credit card numbers"