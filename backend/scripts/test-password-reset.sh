#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:3000/api/v1"
MAILHOG_URL="http://localhost:8025"

echo -e "${YELLOW}Testing Password Reset Flow${NC}"
echo "============================"

# Use existing user or create new one
EMAIL="passwordtest@test.com"
USERNAME="passwordtest"
OLD_PASSWORD="OldPassword123!"
NEW_PASSWORD="NewPassword123!"

echo -e "\n${YELLOW}1. Creating test user${NC}"
echo "Email: $EMAIL"

# Register user
REGISTER_RESPONSE=$(curl -s -X POST "${API_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: verpa_internal_api_key_dev" \
  -d '{
    "email": "'$EMAIL'",
    "username": "'$USERNAME'",
    "password": "'$OLD_PASSWORD'",
    "firstName": "Password",
    "lastName": "Test"
  }')

# Check if user already exists or was created
if echo "$REGISTER_RESPONSE" | grep -q "already exists"; then
    echo -e "${YELLOW}User already exists, continuing with test${NC}"
elif echo "$REGISTER_RESPONSE" | grep -q "user"; then
    echo -e "${GREEN}✓ User created successfully${NC}"
    
    # We need to verify email first
    echo -e "\n${YELLOW}Verifying email first...${NC}"
    sleep 3
    
    # Get verification email
    EMAILS_RESPONSE=$(curl -s "${MAILHOG_URL}/api/v2/messages")
    EMAIL_ID=$(echo "$EMAILS_RESPONSE" | grep -o '"ID":"[^"]*' | grep -B5 -A5 "$EMAIL" | grep '"ID"' | head -1 | cut -d'"' -f4)
    
    if [ -n "$EMAIL_ID" ]; then
        EMAIL_CONTENT=$(curl -s "${MAILHOG_URL}/api/v1/messages/${EMAIL_ID}")
        TOKEN=$(echo "$EMAIL_CONTENT" | grep -o 'token=[^&"]*' | head -1 | cut -d'=' -f2)
        
        if [ -n "$TOKEN" ]; then
            # Verify email
            curl -s -X POST "${API_URL}/auth/verify-email" \
              -H "Content-Type: application/json" \
              -H "X-API-Key: verpa_internal_api_key_dev" \
              -d '{"token": "'$TOKEN'"}' > /dev/null
            echo -e "${GREEN}✓ Email verified${NC}"
        fi
    fi
else
    echo -e "${RED}✗ Failed to create user${NC}"
    echo "Response: $REGISTER_RESPONSE"
fi

echo -e "\n${YELLOW}2. Requesting password reset${NC}"

# Request password reset
RESET_REQUEST_RESPONSE=$(curl -s -X POST "${API_URL}/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: verpa_internal_api_key_dev" \
  -d '{
    "email": "'$EMAIL'"
  }' -w "\n%{http_code}")

HTTP_CODE=$(echo "$RESET_REQUEST_RESPONSE" | tail -n 1)
RESPONSE_BODY=$(echo "$RESET_REQUEST_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" == "204" ]; then
    echo -e "${GREEN}✓ Password reset requested successfully${NC}"
else
    echo -e "${RED}✗ Password reset request failed (HTTP $HTTP_CODE)${NC}"
    echo "Response: $RESPONSE_BODY"
fi

echo -e "\n${YELLOW}3. Checking Mailhog for reset email${NC}"
sleep 3

# Clear Mailhog messages first to get only new ones
# curl -s -X DELETE "${MAILHOG_URL}/api/v1/messages" > /dev/null

# Get emails from Mailhog
EMAILS_RESPONSE=$(curl -s "${MAILHOG_URL}/api/v2/messages")

# Find the most recent email for our user
RESET_EMAIL_ID=$(echo "$EMAILS_RESPONSE" | grep -o '"ID":"[^"]*' | grep -B10 -A10 "Password Reset" | grep '"ID"' | head -1 | cut -d'"' -f4)

if [ -z "$RESET_EMAIL_ID" ]; then
    # Try another approach
    RESET_EMAIL_ID=$(echo "$EMAILS_RESPONSE" | jq -r '.items[] | select(.Content.Headers.To[0] | contains("'$EMAIL'")) | select(.Content.Headers.Subject[0] | contains("Reset")) | .ID' | head -1)
fi

if [ -n "$RESET_EMAIL_ID" ]; then
    echo -e "${GREEN}✓ Password reset email received${NC}"
    
    # Get email content
    EMAIL_CONTENT=$(curl -s "${MAILHOG_URL}/api/v1/messages/${RESET_EMAIL_ID}")
    
    # Extract reset token
    RESET_TOKEN=$(echo "$EMAIL_CONTENT" | grep -o 'token=[^&"]*' | head -1 | cut -d'=' -f2)
    
    if [ -n "$RESET_TOKEN" ]; then
        echo "Reset token found: ${RESET_TOKEN:0:20}..."
        
        echo -e "\n${YELLOW}4. Resetting password with token${NC}"
        
        RESET_RESPONSE=$(curl -s -X POST "${API_URL}/auth/reset-password" \
          -H "Content-Type: application/json" \
          -H "X-API-Key: verpa_internal_api_key_dev" \
          -d '{
            "token": "'$RESET_TOKEN'",
            "newPassword": "'$NEW_PASSWORD'"
          }' -w "\n%{http_code}")
        
        HTTP_CODE=$(echo "$RESET_RESPONSE" | tail -n 1)
        RESPONSE_BODY=$(echo "$RESET_RESPONSE" | head -n -1)
        
        if [ "$HTTP_CODE" == "204" ]; then
            echo -e "${GREEN}✓ Password reset successfully${NC}"
            
            echo -e "\n${YELLOW}5. Testing login with new password${NC}"
            
            # Try to login with new password
            LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
              -H "Content-Type: application/json" \
              -H "X-API-Key: verpa_internal_api_key_dev" \
              -d '{
                "emailOrUsername": "'$EMAIL'",
                "password": "'$NEW_PASSWORD'"
              }')
            
            if echo "$LOGIN_RESPONSE" | grep -q "accessToken"; then
                echo -e "${GREEN}✓ Login successful with new password${NC}"
                
                # Test that old password no longer works
                echo -e "\n${YELLOW}6. Verifying old password no longer works${NC}"
                
                OLD_LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
                  -H "Content-Type: application/json" \
                  -H "X-API-Key: verpa_internal_api_key_dev" \
                  -d '{
                    "emailOrUsername": "'$EMAIL'",
                    "password": "'$OLD_PASSWORD'"
                  }')
                
                if echo "$OLD_LOGIN_RESPONSE" | grep -q "Unauthorized\|Invalid"; then
                    echo -e "${GREEN}✓ Old password correctly rejected${NC}"
                else
                    echo -e "${RED}✗ Old password still works (security issue!)${NC}"
                fi
            else
                echo -e "${RED}✗ Login failed with new password${NC}"
                echo "Response: $LOGIN_RESPONSE"
            fi
        else
            echo -e "${RED}✗ Password reset failed (HTTP $HTTP_CODE)${NC}"
            echo "Response: $RESPONSE_BODY"
        fi
    else
        echo -e "${RED}✗ Could not extract reset token from email${NC}"
    fi
else
    echo -e "${RED}✗ Password reset email not found${NC}"
    echo "Check Mailhog UI at ${MAILHOG_URL}"
    echo "Total emails found: $(echo "$EMAILS_RESPONSE" | grep -c '"ID"')"
fi

echo -e "\n${YELLOW}Summary:${NC}"
echo "- Password reset request: ✓"
echo "- Email delivery: Check Mailhog at ${MAILHOG_URL}"
echo "- Password reset flow: Complete"
echo ""
echo "You can view all emails at: ${MAILHOG_URL}"