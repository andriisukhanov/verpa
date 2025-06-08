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

### Installation

```bash
# Install dependencies
yarn install

# Setup git hooks
yarn prepare
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

## License

Proprietary - All rights reserved