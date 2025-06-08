#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Base directory
BASE_DIR=$(dirname "$0")/..

# Function to run migrations for a service
run_service_migrations() {
    local service=$1
    local db_type=$2
    local db_url=$3
    
    echo -e "\n${BLUE}Running ${db_type} migrations for ${service}...${NC}"
    
    cd "${BASE_DIR}/services/${service}"
    
    # Check if migrations directory exists
    if [ ! -d "migrations/${db_type}" ]; then
        echo -e "${YELLOW}No ${db_type} migrations found for ${service}${NC}"
        return
    fi
    
    # Run migrations
    npx @verpa/database-migrations migrate up \
        --database "${db_type}" \
        --url "${db_url}" \
        --path "./migrations/${db_type}"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ ${service} ${db_type} migrations completed${NC}"
    else
        echo -e "${RED}✗ ${service} ${db_type} migrations failed${NC}"
        exit 1
    fi
}

# Function to check migration status
check_migration_status() {
    local service=$1
    local db_type=$2
    local db_url=$3
    
    echo -e "\n${BLUE}Checking ${db_type} migration status for ${service}...${NC}"
    
    cd "${BASE_DIR}/services/${service}"
    
    if [ ! -d "migrations/${db_type}" ]; then
        return
    fi
    
    npx @verpa/database-migrations migrate status \
        --database "${db_type}" \
        --url "${db_url}" \
        --path "./migrations/${db_type}"
}

# Main script
echo -e "${YELLOW}Verpa Database Migration Runner${NC}"
echo "================================"

# Parse command line arguments
COMMAND=${1:-up}
SERVICE=${2:-all}

# Database URLs (from environment or defaults)
MONGODB_URL=${MONGODB_URI:-"mongodb://verpa_admin:verpa_secure_password_2024@localhost:27017/verpa?authSource=admin"}
POSTGRES_URL=${DATABASE_URL:-"postgres://verpa_pg_user:verpa_pg_password_2024@localhost:5432/verpa_analytics"}

# Services with their database types
declare -A service_dbs=(
    ["user-service"]="mongodb"
    ["aquarium-service"]="mongodb"
    ["event-service"]="mongodb"
    ["notification-service"]="mongodb"
    ["media-service"]="mongodb"
    ["subscription-service"]="mongodb"
    ["analytics-service"]="mongodb postgres"
    ["api-gateway"]="mongodb"
    ["mobile-bff"]="mongodb"
)

# Execute command
case $COMMAND in
    up)
        echo -e "${GREEN}Running migrations UP...${NC}"
        if [ "$SERVICE" = "all" ]; then
            for svc in "${!service_dbs[@]}"; do
                for db in ${service_dbs[$svc]}; do
                    if [ "$db" = "mongodb" ]; then
                        run_service_migrations "$svc" "$db" "$MONGODB_URL"
                    else
                        run_service_migrations "$svc" "$db" "$POSTGRES_URL"
                    fi
                done
            done
        else
            if [ -z "${service_dbs[$SERVICE]}" ]; then
                echo -e "${RED}Unknown service: $SERVICE${NC}"
                exit 1
            fi
            for db in ${service_dbs[$SERVICE]}; do
                if [ "$db" = "mongodb" ]; then
                    run_service_migrations "$SERVICE" "$db" "$MONGODB_URL"
                else
                    run_service_migrations "$SERVICE" "$db" "$POSTGRES_URL"
                fi
            done
        fi
        ;;
        
    down)
        echo -e "${YELLOW}Rolling back migrations...${NC}"
        echo -e "${RED}WARNING: This will rollback the last migration!${NC}"
        read -p "Are you sure? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            # Implementation for down migrations
            echo "Rollback functionality to be implemented..."
        fi
        ;;
        
    status)
        echo -e "${GREEN}Checking migration status...${NC}"
        if [ "$SERVICE" = "all" ]; then
            for svc in "${!service_dbs[@]}"; do
                for db in ${service_dbs[$svc]}; do
                    if [ "$db" = "mongodb" ]; then
                        check_migration_status "$svc" "$db" "$MONGODB_URL"
                    else
                        check_migration_status "$svc" "$db" "$POSTGRES_URL"
                    fi
                done
            done
        else
            if [ -z "${service_dbs[$SERVICE]}" ]; then
                echo -e "${RED}Unknown service: $SERVICE${NC}"
                exit 1
            fi
            for db in ${service_dbs[$SERVICE]}; do
                if [ "$db" = "mongodb" ]; then
                    check_migration_status "$SERVICE" "$db" "$MONGODB_URL"
                else
                    check_migration_status "$SERVICE" "$db" "$POSTGRES_URL"
                fi
            done
        fi
        ;;
        
    create)
        if [ -z "$SERVICE" ] || [ "$SERVICE" = "all" ]; then
            echo -e "${RED}Please specify a service for creating migration${NC}"
            echo "Usage: $0 create <service> <migration-name> [mongodb|postgres]"
            exit 1
        fi
        
        MIGRATION_NAME=$3
        DB_TYPE=${4:-mongodb}
        
        if [ -z "$MIGRATION_NAME" ]; then
            echo -e "${RED}Please provide a migration name${NC}"
            echo "Usage: $0 create <service> <migration-name> [mongodb|postgres]"
            exit 1
        fi
        
        echo -e "${GREEN}Creating ${DB_TYPE} migration for ${SERVICE}: ${MIGRATION_NAME}${NC}"
        cd "${BASE_DIR}/services/${SERVICE}"
        
        npx @verpa/database-migrations create-migration "${MIGRATION_NAME}" \
            --database "${DB_TYPE}" \
            --path "./migrations/${DB_TYPE}"
        ;;
        
    *)
        echo -e "${RED}Unknown command: $COMMAND${NC}"
        echo "Usage: $0 [up|down|status|create] [service|all] [migration-name] [mongodb|postgres]"
        echo ""
        echo "Examples:"
        echo "  $0 up all                    # Run all migrations for all services"
        echo "  $0 up user-service          # Run migrations for user-service only"
        echo "  $0 status all               # Check status of all migrations"
        echo "  $0 create user-service add-indexes mongodb"
        exit 1
        ;;
esac

echo -e "\n${GREEN}Done!${NC}"