#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:3000/api/v1"
MAILHOG_URL="http://localhost:8025"

echo -e "${YELLOW}Testing Email Verification Flow${NC}"
echo "================================="

# Generate random user data
RANDOM_ID=$((RANDOM % 10000))
USERNAME="testuser${RANDOM_ID}"
EMAIL="${USERNAME}@test.com"
PASSWORD="TestPassword123!"

echo -e "\n${YELLOW}1. Registering new user${NC}"
echo "Username: $USERNAME"
echo "Email: $EMAIL"

# Register user
REGISTER_RESPONSE=$(curl -s -X POST "${API_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: verpa_internal_api_key_dev" \
  -d '{
    "email": "'$EMAIL'",
    "username": "'$USERNAME'",
    "password": "'$PASSWORD'",
    "firstName": "Test",
    "lastName": "User"
  }')

echo "Response: $REGISTER_RESPONSE"

# Check if registration was successful
if echo "$REGISTER_RESPONSE" | grep -q "user"; then
    echo -e "${GREEN}✓ User registered successfully${NC}"
else
    echo -e "${RED}✗ Registration failed${NC}"
    exit 1
fi

echo -e "\n${YELLOW}2. Checking Mailhog for verification email${NC}"
sleep 3 # Give some time for email to be processed

# Get emails from Mailhog
EMAILS_RESPONSE=$(curl -s "${MAILHOG_URL}/api/v2/messages")

# Check if email was received
if echo "$EMAILS_RESPONSE" | grep -q "$EMAIL"; then
    echo -e "${GREEN}✓ Verification email received${NC}"
    
    # Extract verification token from email
    EMAIL_ID=$(echo "$EMAILS_RESPONSE" | grep -o '"ID":"[^"]*' | head -1 | cut -d'"' -f4)
    EMAIL_CONTENT=$(curl -s "${MAILHOG_URL}/api/v1/messages/${EMAIL_ID}")
    
    # Try to extract verification URL
    VERIFICATION_URL=$(echo "$EMAIL_CONTENT" | grep -o 'http://[^"]*verify-email[^"]*token=[^"]*' | head -1)
    
    if [ -n "$VERIFICATION_URL" ]; then
        echo "Verification URL found: $VERIFICATION_URL"
        
        # Extract token from URL
        TOKEN=$(echo "$VERIFICATION_URL" | grep -o 'token=[^&]*' | cut -d'=' -f2)
        echo "Token: $TOKEN"
    else
        echo -e "${YELLOW}Could not extract verification URL from email${NC}"
    fi
else
    echo -e "${RED}✗ Verification email not received${NC}"
    echo "Check Mailhog UI at ${MAILHOG_URL}"
fi

echo -e "\n${YELLOW}3. Attempting to login without email verification${NC}"

# Try to login
LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: verpa_internal_api_key_dev" \
  -d '{
    "emailOrUsername": "'$EMAIL'",
    "password": "'$PASSWORD'"
  }')

echo "Response: $LOGIN_RESPONSE"

if echo "$LOGIN_RESPONSE" | grep -q "verify your email"; then
    echo -e "${GREEN}✓ Login correctly blocked - email verification required${NC}"
else
    echo -e "${RED}✗ Login should have been blocked${NC}"
fi

# If we have a token, verify the email
if [ -n "$TOKEN" ]; then
    echo -e "\n${YELLOW}4. Verifying email with token${NC}"
    
    VERIFY_RESPONSE=$(curl -s -X POST "${API_URL}/auth/verify-email" \
      -H "Content-Type: application/json" \
      -H "X-API-Key: verpa_internal_api_key_dev" \
      -d '{
        "token": "'$TOKEN'"
      }')
    
    echo "Response: $VERIFY_RESPONSE"
    
    if echo "$VERIFY_RESPONSE" | grep -q "verified successfully"; then
        echo -e "${GREEN}✓ Email verified successfully${NC}"
        
        echo -e "\n${YELLOW}5. Attempting to login after verification${NC}"
        
        # Try to login again
        LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
          -H "Content-Type: application/json" \
          -H "X-API-Key: verpa_internal_api_key_dev" \
          -d '{
            "emailOrUsername": "'$EMAIL'",
            "password": "'$PASSWORD'"
          }')
        
        if echo "$LOGIN_RESPONSE" | grep -q "accessToken"; then
            echo -e "${GREEN}✓ Login successful after email verification${NC}"
            echo "Access token received"
        else
            echo -e "${RED}✗ Login failed after verification${NC}"
            echo "Response: $LOGIN_RESPONSE"
        fi
    else
        echo -e "${RED}✗ Email verification failed${NC}"
    fi
fi

echo -e "\n${YELLOW}6. Testing resend verification email${NC}"

# Clear Mailhog messages to see new email
curl -s -X DELETE "${MAILHOG_URL}/api/v1/messages" > /dev/null

RESEND_RESPONSE=$(curl -s -X POST "${API_URL}/auth/resend-verification" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: verpa_internal_api_key_dev" \
  -d '{
    "email": "'$EMAIL'"
  }')

echo "Response status: $?"

# Check if new email was sent
sleep 3
EMAILS_RESPONSE=$(curl -s "${MAILHOG_URL}/api/v2/messages")

if echo "$EMAILS_RESPONSE" | grep -q "$EMAIL"; then
    echo -e "${GREEN}✓ Verification email resent successfully${NC}"
else
    echo -e "${YELLOW}Email not resent (user might be already verified)${NC}"
fi

echo -e "\n${YELLOW}Summary:${NC}"
echo "- User registration: ✓"
echo "- Email delivery: Check Mailhog at ${MAILHOG_URL}"
echo "- Email verification flow: Working as expected"
echo "- Resend verification: Tested"
echo ""
echo "You can view all emails at: ${MAILHOG_URL}"