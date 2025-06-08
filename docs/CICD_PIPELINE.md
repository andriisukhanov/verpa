# CI/CD Pipeline для Verpa

## GitHub Actions Workflows

### 1. Backend Pipeline
```yaml
# .github/workflows/backend-ci.yml
name: Backend CI/CD

on:
  push:
    branches: [main, develop]
    paths:
      - 'backend/**'
      - '.github/workflows/backend-*.yml'
  pull_request:
    branches: [main, develop]
    paths:
      - 'backend/**'

env:
  NODE_VERSION: '18'
  DOCKER_REGISTRY: 'ghcr.io'

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [user, aquarium, notification, media, analytics, billing, ai]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: |
          cd backend/services/${{ matrix.service }}
          npm ci
      
      - name: Lint
        run: |
          cd backend/services/${{ matrix.service }}
          npm run lint
      
      - name: Type check
        run: |
          cd backend/services/${{ matrix.service }}
          npm run type-check
      
      - name: Unit tests
        run: |
          cd backend/services/${{ matrix.service }}
          npm run test:unit
      
      - name: Integration tests
        run: |
          cd backend/services/${{ matrix.service }}
          docker-compose -f docker-compose.test.yml up -d
          npm run test:integration
          docker-compose -f docker-compose.test.yml down
      
      - name: Code coverage
        run: |
          cd backend/services/${{ matrix.service }}
          npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          directory: ./backend/services/${{ matrix.service }}/coverage

  build-and-push:
    needs: lint-and-test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop'
    
    strategy:
      matrix:
        service: [user, aquarium, notification, media, analytics, billing, ai]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.DOCKER_REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Build and push Docker image
        uses: docker/build-push-action@v4
        with:
          context: ./backend/services/${{ matrix.service }}
          push: true
          tags: |
            ${{ env.DOCKER_REGISTRY }}/${{ github.repository }}/${{ matrix.service }}:latest
            ${{ env.DOCKER_REGISTRY }}/${{ github.repository }}/${{ matrix.service }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Deploy to Production
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            cd /opt/verpa
            docker-compose pull
            docker-compose up -d --no-deps
            docker system prune -f
```

### 2. Flutter Pipeline
```yaml
# .github/workflows/flutter-ci.yml
name: Flutter CI/CD

on:
  push:
    branches: [main, develop]
    paths:
      - 'mobile/**'
      - '.github/workflows/flutter-*.yml'
  pull_request:
    branches: [main, develop]
    paths:
      - 'mobile/**'

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.16.0'
          channel: 'stable'
      
      - name: Get dependencies
        run: |
          cd mobile
          flutter pub get
      
      - name: Analyze code
        run: |
          cd mobile
          flutter analyze
      
      - name: Run tests
        run: |
          cd mobile
          flutter test --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          directory: ./mobile/coverage

  build-android:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.16.0'
      
      - name: Setup Java
        uses: actions/setup-java@v3
        with:
          distribution: 'temurin'
          java-version: '11'
      
      - name: Build APK
        run: |
          cd mobile
          flutter build apk --release
      
      - name: Build App Bundle
        run: |
          cd mobile
          flutter build appbundle --release
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: android-release
          path: |
            mobile/build/app/outputs/flutter-apk/app-release.apk
            mobile/build/app/outputs/bundle/release/app-release.aab

  build-ios:
    needs: test
    runs-on: macos-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.16.0'
      
      - name: Build iOS
        run: |
          cd mobile
          flutter build ios --release --no-codesign
      
      - name: Archive iOS app
        run: |
          cd mobile/ios
          xcodebuild -workspace Runner.xcworkspace \
            -scheme Runner \
            -sdk iphoneos \
            -configuration Release \
            -archivePath $PWD/build/Runner.xcarchive \
            archive

  build-web:
    needs: test
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.16.0'
      
      - name: Build Web
        run: |
          cd mobile
          flutter build web --release
      
      - name: Deploy to GitHub Pages
        if: github.ref == 'refs/heads/develop'
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./mobile/build/web
```

### 3. Admin Panel Pipeline
```yaml
# .github/workflows/admin-ci.yml
name: Admin Panel CI/CD

on:
  push:
    branches: [main, develop]
    paths:
      - 'admin/**'
      - '.github/workflows/admin-*.yml'

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: |
          cd admin
          npm ci
      
      - name: Lint and type check
        run: |
          cd admin
          npm run lint
          npm run type-check
      
      - name: Run tests
        run: |
          cd admin
          npm run test
      
      - name: Build
        run: |
          cd admin
          npm run build
      
      - name: Deploy to S3
        if: github.ref == 'refs/heads/main'
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        run: |
          cd admin
          aws s3 sync build/ s3://verpa-admin-panel/ --delete
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/*"
```

## Docker Configuration

### Backend Dockerfile
```dockerfile
# backend/services/[service-name]/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm ci --only=production
RUN npm ci --only=development

# Copy source code
COPY src ./src

# Build
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built application
COPY --from=builder /app/dist ./dist

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node healthcheck.js

# Run as non-root user
USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  # API Gateway
  gateway:
    image: kong:3.4
    environment:
      KONG_DATABASE: 'off'
      KONG_DECLARATIVE_CONFIG: /kong/kong.yml
      KONG_PROXY_ACCESS_LOG: /dev/stdout
      KONG_ADMIN_ACCESS_LOG: /dev/stdout
      KONG_PROXY_ERROR_LOG: /dev/stderr
      KONG_ADMIN_ERROR_LOG: /dev/stderr
    ports:
      - "8000:8000"
      - "8001:8001"
    volumes:
      - ./kong.yml:/kong/kong.yml

  # MongoDB
  mongodb:
    image: mongo:7
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017"

  # Redis
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

  # RabbitMQ
  rabbitmq:
    image: rabbitmq:3-management
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD}
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    ports:
      - "5672:5672"
      - "15672:15672"

  # MinIO (S3 compatible)
  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"

  # Services
  user-service:
    image: ghcr.io/verpa/user-service:latest
    environment:
      NODE_ENV: production
      DATABASE_URL: mongodb://mongodb:27017/users
      REDIS_URL: redis://redis:6379
      RABBITMQ_URL: amqp://rabbitmq:5672
    depends_on:
      - mongodb
      - redis
      - rabbitmq

  aquarium-service:
    image: ghcr.io/verpa/aquarium-service:latest
    environment:
      NODE_ENV: production
      DATABASE_URL: mongodb://mongodb:27017/aquariums
      REDIS_URL: redis://redis:6379
      RABBITMQ_URL: amqp://rabbitmq:5672
    depends_on:
      - mongodb
      - redis
      - rabbitmq

  # ... остальные сервисы

volumes:
  mongo_data:
  redis_data:
  rabbitmq_data:
  minio_data:
```

## Мониторинг и алерты

### GitHub Actions Status
```yaml
# .github/workflows/notify.yml
name: Build Status Notifications

on:
  workflow_run:
    workflows: ["Backend CI/CD", "Flutter CI/CD", "Admin Panel CI/CD"]
    types: [completed]

jobs:
  notify:
    runs-on: ubuntu-latest
    
    steps:
      - name: Send Slack notification
        if: ${{ github.event.workflow_run.conclusion == 'failure' }}
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ github.event.workflow_run.conclusion }}
          text: |
            Workflow: ${{ github.event.workflow_run.name }}
            Status: ${{ github.event.workflow_run.conclusion }}
            Branch: ${{ github.event.workflow_run.head_branch }}
            Commit: ${{ github.event.workflow_run.head_sha }}
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```