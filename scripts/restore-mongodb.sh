#!/bin/bash

# MongoDB Restore Script for Verpa
# This script restores MongoDB database from compressed backups

set -e

# Check if backup file is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <backup-file.gz>"
  echo "Example: $0 /backup/verpa_backup_20240115_120000.gz"
  exit 1
fi

BACKUP_FILE="$1"

# Configuration
MONGO_HOST="${MONGO_HOST:-mongodb}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_USER="${MONGO_USER:-verpa_admin}"
MONGO_PASS="${MONGO_PASS:-verpa_secure_password_2024}"
MONGO_DB="${MONGO_DB:-verpa}"
TEMP_DIR="/tmp/restore_$$"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file not found: $BACKUP_FILE"
  exit 1
fi

echo "Starting MongoDB restore..."
echo "Restoring from: $BACKUP_FILE"

# Create temporary directory
mkdir -p "$TEMP_DIR"

# Extract backup
echo "Extracting backup..."
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

# Find the extracted directory
BACKUP_DIR=$(find "$TEMP_DIR" -type d -name "verpa_backup_*" | head -1)

if [ -z "$BACKUP_DIR" ]; then
  echo "Error: Could not find backup directory in archive"
  rm -rf "$TEMP_DIR"
  exit 1
fi

# Confirm before restore
echo "WARNING: This will overwrite the existing database '$MONGO_DB'"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Restore cancelled"
  rm -rf "$TEMP_DIR"
  exit 0
fi

# Perform the restore
echo "Restoring database..."
mongorestore \
  --host="${MONGO_HOST}:${MONGO_PORT}" \
  --username="${MONGO_USER}" \
  --password="${MONGO_PASS}" \
  --authenticationDatabase=admin \
  --db="${MONGO_DB}" \
  --drop \
  --dir="${BACKUP_DIR}/${MONGO_DB}" \
  --quiet

# Clean up
rm -rf "$TEMP_DIR"

echo "Restore completed successfully!"
echo "Database '$MONGO_DB' has been restored from backup"

# Verify restore
echo "Verifying restore..."
mongo "${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}" \
  --username="${MONGO_USER}" \
  --password="${MONGO_PASS}" \
  --authenticationDatabase=admin \
  --eval "db.stats()" \
  --quiet

echo "Restore process completed!"