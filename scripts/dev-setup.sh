#!/bin/bash

# Development Environment Setup Script for Verpa
# This script sets up the complete development environment

set -e

echo "================================================"
echo "Verpa Development Environment Setup"
echo "================================================"

# Check for required tools
echo "Checking required tools..."

if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "Error: Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

if ! command -v yarn &> /dev/null; then
    echo "Error: Yarn is not installed. Please install Yarn first."
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "All required tools are installed!"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "Please update .env file with your configuration before running services"
fi

# Install dependencies
echo "Installing dependencies..."
yarn install

# Build common package
echo "Building @verpa/common package..."
cd backend/packages/common
yarn build
cd ../../..

# Start Docker services
echo "Starting Docker services..."
docker-compose up -d

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 10

# Check service health
echo "Checking service status..."
docker-compose ps

# Create Kafka topics
echo "Creating Kafka topics..."
TOPICS=(
    "user-events"
    "aquarium-events"
    "notification-events"
    "audit-events"
    "analytics-events"
)

for topic in "${TOPICS[@]}"; do
    echo "Creating topic: $topic"
    docker-compose exec -T kafka kafka-topics \
        --create \
        --if-not-exists \
        --topic "$topic" \
        --bootstrap-server localhost:9094 \
        --partitions 3 \
        --replication-factor 1 || true
done

# Initialize MinIO buckets
echo "Initializing MinIO buckets..."
docker-compose exec -T minio mc config host add local http://localhost:9000 verpa_minio_admin verpa_minio_password_2024 || true
docker-compose exec -T minio mc mb local/verpa-uploads --ignore-existing || true
docker-compose exec -T minio mc mb local/verpa-backups --ignore-existing || true
docker-compose exec -T minio mc policy set public local/verpa-uploads || true

echo "================================================"
echo "Development environment setup completed!"
echo "================================================"
echo ""
echo "Service URLs:"
echo "- MongoDB: mongodb://localhost:27017"
echo "- Redis: redis://localhost:6379"
echo "- Kafka: localhost:9092"
echo "- MinIO (S3): http://localhost:9000"
echo ""
echo "Admin UIs:"
echo "- Mongo Express: http://localhost:8081 (admin/verpa_admin_2024)"
echo "- Redis Commander: http://localhost:8082 (admin/verpa_admin_2024)"
echo "- Kafka UI: http://localhost:8080"
echo "- MinIO Console: http://localhost:9001 (verpa_minio_admin/verpa_minio_password_2024)"
echo ""
echo "Run 'make logs' to see service logs"
echo "Run 'make down' to stop all services"
echo ""
echo "Happy coding!"