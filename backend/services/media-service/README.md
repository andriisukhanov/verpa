# Media Service

The Media Service handles all file uploads and media management for the Verpa platform, including image processing, storage, and delivery.

## Features

- **File Upload**
  - Single and multiple file uploads
  - File type validation
  - Size limits enforcement
  - Metadata storage

- **Image Processing**
  - Automatic thumbnail generation (small, medium, large)
  - Image optimization (WebP conversion)
  - EXIF orientation correction
  - Quality adjustment

- **Storage**
  - MinIO/S3 compatible storage
  - Public and private file support
  - Signed URL generation
  - Automatic bucket creation

- **File Management**
  - List files with pagination
  - Delete single or multiple files
  - File categorization
  - Entity association (link files to aquariums, users, etc.)

## Architecture

```
src/
├── application/          # Application layer
│   ├── controllers/      # HTTP controllers
│   ├── dto/             # Data transfer objects
│   └── services/        # Application services
├── infrastructure/      # Infrastructure layer
│   ├── storage/         # Storage service (MinIO/S3)
│   └── processors/      # Image processing
└── config/             # Configuration
```

## API Endpoints

### File Upload
- `POST /api/v1/media/upload` - Upload single file
- `POST /api/v1/media/upload/multiple` - Upload multiple files

### File Management
- `GET /api/v1/media/files` - List user files
- `GET /api/v1/media/files/:fileId` - Get file info
- `GET /api/v1/media/files/:fileId/download` - Download file
- `GET /api/v1/media/files/:fileId/signed-url` - Get signed URL
- `DELETE /api/v1/media/files/:fileId` - Delete single file
- `DELETE /api/v1/media/files` - Delete multiple files

### Health
- `GET /health` - Health check
- `GET /health/ready` - Readiness check
- `GET /health/live` - Liveness check

## File Categories

- `aquarium_photo` - Aquarium photos
- `fish_photo` - Fish photos
- `avatar` - User avatars
- `document` - Documents (PDFs)
- `other` - Other files

## Configuration

### Environment Variables

```bash
# Service Configuration
NODE_ENV=development
PORT=3005
SERVICE_NAME=media-service

# Storage Configuration (MinIO/S3)
STORAGE_PROVIDER=minio
STORAGE_ENDPOINT=http://localhost:9000
STORAGE_ACCESS_KEY=verpa_minio_admin
STORAGE_SECRET_KEY=verpa_minio_password_2024
STORAGE_BUCKET=verpa-uploads
STORAGE_PUBLIC_BUCKET=verpa-public
STORAGE_USE_SSL=false
AWS_REGION=us-east-1

# Upload Configuration
MAX_FILE_SIZE=10485760  # 10MB
MAX_FILES=10

# Image Processing
IMAGE_QUALITY=85
IMAGE_FORMAT=webp

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=media-service
KAFKA_GROUP_ID=media-service-group

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Security
SIGNED_URL_EXPIRY=3600  # 1 hour
ALLOWED_ORIGINS=http://localhost:3000
```

## Supported File Types

### Images
- JPEG/JPG
- PNG
- GIF
- WebP

### Documents
- PDF

### Videos (future)
- MP4
- MPEG
- QuickTime

## Image Processing

### Thumbnail Sizes
- **Small**: 150x150
- **Medium**: 300x300
- **Large**: 800x800

### Optimization
- Automatic WebP conversion
- Quality adjustment (85% default)
- EXIF orientation correction
- Aspect ratio preservation

## Development

### Local Setup

1. Install dependencies:
```bash
yarn install
```

2. Start MinIO (via Docker):
```bash
docker run -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=verpa_minio_admin \
  -e MINIO_ROOT_PASSWORD=verpa_minio_password_2024 \
  minio/minio server /data --console-address ":9001"
```

3. Start the service:
```bash
yarn start:dev
```

Access MinIO console at: http://localhost:9001

### Testing

```bash
# Unit tests
yarn test

# Integration tests
yarn test:e2e

# Test coverage
yarn test:cov
```

### Example Upload

```bash
# Upload single file
curl -X POST http://localhost:3005/api/v1/media/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/image.jpg" \
  -F "category=aquarium_photo" \
  -F "visibility=public" \
  -F "entityId=aquarium-123" \
  -F "entityType=aquarium"

# Upload multiple files
curl -X POST http://localhost:3005/api/v1/media/upload/multiple \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "files=@/path/to/image1.jpg" \
  -F "files=@/path/to/image2.jpg" \
  -F "category=aquarium_photo"
```

## Production Deployment

1. Build the Docker image:
```bash
docker build -t verpa-media-service .
```

2. Configure production environment variables

3. Ensure MinIO/S3 is accessible

4. Deploy to your container orchestration platform

## Security Considerations

- File type validation prevents malicious uploads
- Size limits prevent DoS attacks
- Private files require authentication
- Signed URLs expire after configured time
- CORS configured for allowed origins

## Monitoring

- Monitor storage usage
- Track upload/download metrics
- Monitor image processing performance
- Alert on storage errors