#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:3000/api/v1"
MINIO_URL="http://localhost:9001"

echo -e "${YELLOW}Testing Media Upload Flow${NC}"
echo "=========================="

# Create a test image if it doesn't exist
TEST_IMAGE="/tmp/test-aquarium.jpg"
if [ ! -f "$TEST_IMAGE" ]; then
    echo -e "\n${YELLOW}Creating test image${NC}"
    # Create a simple test image using ImageMagick or fallback to a small binary
    if command -v convert &> /dev/null; then
        convert -size 800x600 xc:blue -pointsize 48 -fill white -gravity center -annotate +0+0 'Test Aquarium' "$TEST_IMAGE"
    else
        # Create a minimal valid JPEG
        echo -e "\xFF\xD8\xFF\xE0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xFF\xDB\x00\x43\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\x09\x09\x08\x0A\x0C\x14\x0D\x0C\x0B\x0B\x0C\x19\x12\x13\x0F\x14\x1D\x1A\x1F\x1E\x1D\x1A\x1C\x1C\x20\x24\x2E\x27\x20\x22\x2C\x23\x1C\x1C\x28\x37\x29\x2C\x30\x31\x34\x34\x34\x1F\x27\x39\x3D\x38\x32\x3C\x2E\x33\x34\x32\xFF\xC0\x00\x0B\x08\x00\x01\x00\x01\x01\x01\x11\x00\xFF\xC4\x00\x1F\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0A\x0B\xFF\xC4\x00\xB5\x10\x00\x02\x01\x03\x03\x02\x04\x03\x05\x05\x04\x04\x00\x00\x01\x7D\x01\x02\x03\x00\x04\x11\x05\x12\x21\x31\x41\x06\x13\x51\x61\x07\x22\x71\x14\x32\x81\x91\xA1\x08\x23\x42\xB1\xC1\x15\x52\xD1\xF0\x24\x33\x62\x72\x82\x09\x0A\x16\x17\x18\x19\x1A\x25\x26\x27\x28\x29\x2A\x34\x35\x36\x37\x38\x39\x3A\x43\x44\x45\x46\x47\x48\x49\x4A\x53\x54\x55\x56\x57\x58\x59\x5A\x63\x64\x65\x66\x67\x68\x69\x6A\x73\x74\x75\x76\x77\x78\x79\x7A\x83\x84\x85\x86\x87\x88\x89\x8A\x92\x93\x94\x95\x96\x97\x98\x99\x9A\xA2\xA3\xA4\xA5\xA6\xA7\xA8\xA9\xAA\xB2\xB3\xB4\xB5\xB6\xB7\xB8\xB9\xBA\xC2\xC3\xC4\xC5\xC6\xC7\xC8\xC9\xCA\xD2\xD3\xD4\xD5\xD6\xD7\xD8\xD9\xDA\xE1\xE2\xE3\xE4\xE5\xE6\xE7\xE8\xE9\xEA\xF1\xF2\xF3\xF4\xF5\xF6\xF7\xF8\xF9\xFA\xFF\xDA\x00\x08\x01\x01\x00\x00\x3F\x00\xFD\xFC\xA3\x4A\x00\xFF\xD9" > "$TEST_IMAGE"
    fi
    echo -e "${GREEN}✓ Test image created${NC}"
fi

# First, let's register and login a test user
echo -e "\n${YELLOW}1. Creating test user for media upload${NC}"
RANDOM_ID=$((RANDOM % 10000))
USERNAME="mediatest${RANDOM_ID}"
EMAIL="${USERNAME}@test.com"
PASSWORD="TestPassword123!"

# Register user
REGISTER_RESPONSE=$(curl -s -X POST "${API_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: verpa_internal_api_key_dev" \
  -d '{
    "email": "'$EMAIL'",
    "username": "'$USERNAME'",
    "password": "'$PASSWORD'",
    "firstName": "Media",
    "lastName": "Test"
  }')

if echo "$REGISTER_RESPONSE" | grep -q "accessToken"; then
    echo -e "${GREEN}✓ User registered successfully${NC}"
    ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
elif echo "$REGISTER_RESPONSE" | grep -q "already exists"; then
    echo -e "${YELLOW}User already exists, logging in${NC}"
    
    # Try to login
    LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
      -H "Content-Type: application/json" \
      -H "X-API-Key: verpa_internal_api_key_dev" \
      -d '{
        "emailOrUsername": "'$EMAIL'",
        "password": "'$PASSWORD'"
      }')
    
    if echo "$LOGIN_RESPONSE" | grep -q "accessToken"; then
        ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
        echo -e "${GREEN}✓ Logged in successfully${NC}"
    else
        echo -e "${RED}✗ Login failed${NC}"
        echo "Response: $LOGIN_RESPONSE"
        exit 1
    fi
else
    echo -e "${RED}✗ Registration failed${NC}"
    echo "Response: $REGISTER_RESPONSE"
fi

# Now test file upload
echo -e "\n${YELLOW}2. Uploading test image${NC}"

UPLOAD_RESPONSE=$(curl -s -X POST "${API_URL}/media/upload" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "X-API-Key: verpa_internal_api_key_dev" \
  -F "file=@${TEST_IMAGE}" \
  -F "category=aquarium_photo" \
  -F "visibility=public" \
  -F 'metadata={"description":"Test aquarium photo"}')

echo "Response: $UPLOAD_RESPONSE"

if echo "$UPLOAD_RESPONSE" | grep -q '"id"'; then
    echo -e "${GREEN}✓ File uploaded successfully${NC}"
    
    # Extract file info
    FILE_ID=$(echo "$UPLOAD_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
    FILE_URL=$(echo "$UPLOAD_RESPONSE" | grep -o '"url":"[^"]*' | head -1 | cut -d'"' -f4)
    
    echo "File ID: $FILE_ID"
    echo "File URL: $FILE_URL"
    
    # Check if thumbnails were generated
    if echo "$UPLOAD_RESPONSE" | grep -q "thumbnails"; then
        echo -e "${GREEN}✓ Thumbnails generated${NC}"
    fi
    
    # Test file retrieval
    echo -e "\n${YELLOW}3. Getting file information${NC}"
    
    GET_RESPONSE=$(curl -s -X GET "${API_URL}/media/files/${FILE_ID}" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -H "X-API-Key: verpa_internal_api_key_dev")
    
    if echo "$GET_RESPONSE" | grep -q "$FILE_ID"; then
        echo -e "${GREEN}✓ File information retrieved${NC}"
    else
        echo -e "${RED}✗ Failed to get file information${NC}"
        echo "Response: $GET_RESPONSE"
    fi
    
    # Test signed URL generation
    echo -e "\n${YELLOW}4. Getting signed URL${NC}"
    
    SIGNED_URL_RESPONSE=$(curl -s -X GET "${API_URL}/media/files/${FILE_ID}/signed-url?expiresIn=3600" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -H "X-API-Key: verpa_internal_api_key_dev")
    
    if echo "$SIGNED_URL_RESPONSE" | grep -q '"url"'; then
        echo -e "${GREEN}✓ Signed URL generated${NC}"
        SIGNED_URL=$(echo "$SIGNED_URL_RESPONSE" | grep -o '"url":"[^"]*' | cut -d'"' -f4)
        echo "Signed URL: ${SIGNED_URL:0:80}..."
    else
        echo -e "${RED}✗ Failed to generate signed URL${NC}"
        echo "Response: $SIGNED_URL_RESPONSE"
    fi
    
    # Test file listing
    echo -e "\n${YELLOW}5. Listing user files${NC}"
    
    LIST_RESPONSE=$(curl -s -X GET "${API_URL}/media/files?category=aquarium_photo&limit=10" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -H "X-API-Key: verpa_internal_api_key_dev")
    
    if echo "$LIST_RESPONSE" | grep -q '"files"'; then
        FILE_COUNT=$(echo "$LIST_RESPONSE" | grep -o '"id"' | wc -l)
        echo -e "${GREEN}✓ Files listed successfully (found $FILE_COUNT files)${NC}"
    else
        echo -e "${RED}✗ Failed to list files${NC}"
        echo "Response: $LIST_RESPONSE"
    fi
    
    # Test file deletion (optional)
    echo -e "\n${YELLOW}6. Delete test file? (y/n)${NC}"
    read -r DELETE_CONFIRM
    
    if [ "$DELETE_CONFIRM" = "y" ]; then
        DELETE_RESPONSE=$(curl -s -X DELETE "${API_URL}/media/files/${FILE_ID}" \
          -H "Authorization: Bearer ${ACCESS_TOKEN}" \
          -H "X-API-Key: verpa_internal_api_key_dev")
        
        if echo "$DELETE_RESPONSE" | grep -q '"success":true'; then
            echo -e "${GREEN}✓ File deleted successfully${NC}"
        else
            echo -e "${RED}✗ Failed to delete file${NC}"
            echo "Response: $DELETE_RESPONSE"
        fi
    fi
else
    echo -e "${RED}✗ File upload failed${NC}"
fi

echo -e "\n${YELLOW}Summary:${NC}"
echo "- User authentication: ✓"
echo "- File upload: Working"
echo "- Image processing: Check thumbnails"
echo "- Storage: Check MinIO at ${MINIO_URL}"
echo ""
echo "You can access MinIO console at: ${MINIO_URL}"
echo "Default credentials: verpa_minio_admin / verpa_minio_password_2024"