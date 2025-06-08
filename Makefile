# Makefile for Verpa project

.PHONY: help
help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Docker commands
.PHONY: up
up: ## Start all services
	docker-compose up -d

.PHONY: down
down: ## Stop all services
	docker-compose down

.PHONY: restart
restart: down up ## Restart all services

.PHONY: logs
logs: ## Show logs from all services
	docker-compose logs -f

.PHONY: logs-service
logs-service: ## Show logs from specific service (usage: make logs-service SERVICE=mongodb)
	docker-compose logs -f $(SERVICE)

.PHONY: ps
ps: ## Show running containers
	docker-compose ps

.PHONY: clean
clean: ## Clean up volumes (WARNING: destroys data)
	docker-compose down -v

# Development commands
.PHONY: dev
dev: ## Start development environment
	docker-compose up -d
	cd backend/packages/common && yarn build
	@echo "Development environment is ready!"
	@echo "MongoDB: mongodb://localhost:27017"
	@echo "Redis: redis://localhost:6379"
	@echo "Kafka: localhost:9092"
	@echo "Kafka UI: http://localhost:8080"
	@echo "Mongo Express: http://localhost:8081"
	@echo "Redis Commander: http://localhost:8082"
	@echo "MinIO Console: http://localhost:9001"

.PHONY: dev-stop
dev-stop: ## Stop development environment
	docker-compose down

# Build commands
.PHONY: build
build: ## Build all packages
	cd backend/packages/common && yarn build

.PHONY: build-docker
build-docker: ## Build Docker images
	docker-compose build

# Test commands
.PHONY: test
test: ## Run all tests
	cd backend/packages/common && yarn test

.PHONY: test-coverage
test-coverage: ## Run tests with coverage
	cd backend/packages/common && yarn test:coverage

.PHONY: test-watch
test-watch: ## Run tests in watch mode
	cd backend/packages/common && yarn test:watch

# Lint commands
.PHONY: lint
lint: ## Run linter
	cd backend/packages/common && yarn lint

.PHONY: lint-fix
lint-fix: ## Fix linting issues
	cd backend/packages/common && yarn lint:fix

# Database commands
.PHONY: db-shell
db-shell: ## Open MongoDB shell
	docker-compose exec mongodb mongosh -u verpa_admin -p verpa_secure_password_2024

.PHONY: redis-cli
redis-cli: ## Open Redis CLI
	docker-compose exec redis redis-cli -a verpa_redis_password_2024

# Kafka commands
.PHONY: kafka-topics
kafka-topics: ## List Kafka topics
	docker-compose exec kafka kafka-topics --list --bootstrap-server localhost:9094

.PHONY: kafka-create-topic
kafka-create-topic: ## Create Kafka topic (usage: make kafka-create-topic TOPIC=my-topic)
	docker-compose exec kafka kafka-topics --create --topic $(TOPIC) --bootstrap-server localhost:9094 --partitions 3 --replication-factor 1

# Utility commands
.PHONY: install
install: ## Install all dependencies
	yarn install

.PHONY: setup
setup: install ## Initial project setup
	cp .env.example .env
	@echo "Please update .env file with your configuration"
	make dev

.PHONY: reset
reset: clean setup ## Reset entire development environment

# Production commands
.PHONY: prod-up
prod-up: ## Start production environment
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

.PHONY: prod-down
prod-down: ## Stop production environment
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml down

.PHONY: backup-mongodb
backup-mongodb: ## Backup MongoDB database
	./scripts/backup-mongodb.sh

.PHONY: restore-mongodb
restore-mongodb: ## Restore MongoDB database (usage: make restore-mongodb FILE=backup.gz)
	./scripts/restore-mongodb.sh $(FILE)