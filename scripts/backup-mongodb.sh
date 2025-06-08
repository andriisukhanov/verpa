#!/bin/bash

# MongoDB Backup Script for Verpa
# This script creates compressed backups of the MongoDB database

set -e

# Configuration
BACKUP_DIR="/backup"
MONGO_HOST="${MONGO_HOST:-mongodb}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_USER="${MONGO_USER:-verpa_admin}"
MONGO_PASS="${MONGO_PASS:-verpa_secure_password_2024}"
MONGO_DB="${MONGO_DB:-verpa}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="verpa_backup_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

echo "Starting MongoDB backup..."
echo "Backup will be saved to: ${BACKUP_PATH}.gz"

# Perform the backup
mongodump \
  --host="${MONGO_HOST}:${MONGO_PORT}" \
  --username="${MONGO_USER}" \
  --password="${MONGO_PASS}" \
  --authenticationDatabase=admin \
  --db="${MONGO_DB}" \
  --out="${BACKUP_PATH}" \
  --quiet

# Compress the backup
echo "Compressing backup..."
tar -czf "${BACKUP_PATH}.gz" -C "${BACKUP_DIR}" "${BACKUP_NAME}"
rm -rf "${BACKUP_PATH}"

# Calculate backup size
BACKUP_SIZE=$(du -h "${BACKUP_PATH}.gz" | cut -f1)
echo "Backup completed successfully!"
echo "Backup size: ${BACKUP_SIZE}"
echo "Backup location: ${BACKUP_PATH}.gz"

# Clean up old backups
echo "Cleaning up old backups (older than ${RETENTION_DAYS} days)..."
find "${BACKUP_DIR}" -name "verpa_backup_*.gz" -type f -mtime +${RETENTION_DAYS} -delete

# List current backups
echo "Current backups:"
ls -lh "${BACKUP_DIR}"/verpa_backup_*.gz 2>/dev/null || echo "No backups found"

# If running in Docker, you might want to upload to S3/MinIO
if [ -n "$MINIO_ENDPOINT" ]; then
  echo "Uploading backup to MinIO..."
  # Add MinIO upload logic here
  # mc cp "${BACKUP_PATH}.gz" "minio/verpa-backups/${BACKUP_NAME}.gz"
fi

echo "Backup process completed!"