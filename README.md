# Verpa - Aquarium Monitoring System

## Overview

Verpa is a comprehensive aquarium monitoring and management system designed to help aquarium enthusiasts track and maintain their aquatic environments. The system consists of a microservices backend, cross-platform mobile application, and admin panel.

## Architecture

- **Backend**: Microservices architecture using NestJS (TypeScript)
- **Mobile App**: Flutter (iOS, Android, Web)
- **Admin Panel**: React + TypeScript
- **Database**: MongoDB
- **Cache**: Redis
- **Message Queue**: Kafka
- **API Gateway**: Kong/Traefik

## Project Structure

```
verpa/
├── backend/
│   ├── packages/
│   │   └── common/         # Shared interfaces, DTOs, utilities
│   ├── services/
│   │   ├── user-service/   # Authentication & user management
│   │   ├── aquarium-service/
│   │   ├── event-service/
│   │   ├── notification-service/
│   │   ├── media-service/
│   │   ├── api-gateway/
│   │   └── mobile-bff/
│   └── infrastructure/     # Docker, K8s configs
├── mobile/                 # Flutter application
├── admin/                  # Admin panel
└── docs/                   # Documentation
```

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- Yarn >= 1.22.0
- Docker & Docker Compose
- MongoDB
- Redis
- Kafka

### Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/andriisukhanov/verpa.git
cd verpa
```

2. **Setup environment**
```bash
cp .env.example .env
# Edit .env file with your configuration
```

3. **Start with Docker (Recommended)**
```bash
# Start infrastructure
docker compose up -d mongodb redis kafka

# Start all services
docker compose up -d

# Check service status
docker compose ps
```

4. **Development setup (Alternative)**
```bash
# Install dependencies
yarn install

# Setup git hooks
yarn prepare

# Start development servers
yarn dev:all
```

### Running Tests

```bash
# Run all tests
yarn test

# Run tests with coverage
yarn test:cov

# Run tests in watch mode
yarn test:watch
```

### Code Quality

```bash
# Run linter
yarn lint

# Format code
yarn format

# Check formatting
yarn format:check
```

## Testing Strategy

- **Minimum Coverage**: 80% (enforced)
- **Test Types**: Unit, Integration, E2E
- **TDD Approach**: Write tests first
- **Testing Framework**: Jest

## Commit Convention

We follow conventional commits specification:

- `feat(scope):` New feature
- `fix(scope):` Bug fix
- `docs(scope):` Documentation
- `style(scope):` Code style changes
- `refactor(scope):` Code refactoring
- `perf(scope):` Performance improvements
- `test(scope):` Tests
- `build(scope):` Build system
- `ci(scope):` CI/CD
- `chore(scope):` Maintenance

## Service URLs (Development)

After starting with Docker, the following services will be available:

### Core Services
- **API Gateway**: http://localhost:3000
- **Mobile BFF**: http://localhost:3100  
- **Admin Panel**: http://localhost:3001

### Backend Services
- **User Service**: http://localhost:3001
- **Aquarium Service**: http://localhost:3002
- **Event Service**: http://localhost:3003
- **Notification Service**: http://localhost:3004
- **Media Service**: http://localhost:3005
- **Analytics Service**: http://localhost:3006
- **Subscription Service**: http://localhost:3007

### Infrastructure UIs
- **MongoDB Express**: http://localhost:8081 (admin/verpa_admin_2024)
- **Redis Commander**: http://localhost:8082 (admin/verpa_admin_2024)
- **Kafka UI**: http://localhost:8080
- **MinIO Console**: http://localhost:9001 (verpa_minio_admin/verpa_minio_password_2024)
- **MailHog**: http://localhost:8025

## Mobile Development

The Flutter mobile app is located in the `mobile/` directory:

```bash
cd mobile

# Install Flutter dependencies
flutter pub get

# Run on iOS simulator
flutter run -d ios

# Run on Android emulator  
flutter run -d android

# Run on web
flutter run -d chrome
```

## Admin Panel Development

The React admin panel is located in the `admin/` directory:

```bash
cd admin

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass (`yarn test`)
6. Run linting (`yarn lint`)
7. Commit your changes (`git commit -am 'Add new feature'`)
8. Push to the branch (`git push origin feature/new-feature`)
9. Create a Pull Request

## Troubleshooting

### Docker Issues
```bash
# Reset Docker state
docker compose down -v
docker system prune -f

# Rebuild images
docker compose build --no-cache
```

### Database Issues
```bash
# Reset MongoDB data
docker volume rm verpa_mongodb_data

# Check MongoDB connection
docker exec -it verpa-mongodb mongosh
```

### Service Health Checks
```bash
# Check all service health
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
```

## License

Proprietary - All rights reserved