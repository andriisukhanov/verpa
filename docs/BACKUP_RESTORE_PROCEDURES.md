# Backup and Restore Procedures

## Overview

This document outlines the backup and restore procedures for the Verpa aquarium management system. It covers routine backup operations, disaster recovery procedures, and best practices for data protection.

## Backup Strategy

### Backup Types and Schedule

| Type | Schedule | Retention | Purpose |
|------|----------|-----------|---------|
| Full | Weekly (Sunday 2 AM UTC) | 4 weeks, 12 months, 5 years | Complete system backup |
| Incremental | Daily (Mon-Sat 2 AM UTC) | 30 days | Daily changes |
| Differential | Every 6 hours | 24 hours | Rapid recovery |
| Transaction Logs | Continuous | 7 days | Point-in-time recovery |

### Services Covered

1. **MongoDB Databases**
   - user-service
   - aquarium-service
   - event-service
   - notification-service

2. **PostgreSQL Databases**
   - analytics
   - subscriptions

3. **Redis**
   - Session cache
   - Application cache

4. **File Storage**
   - User uploads
   - Media files
   - Configuration files

## Routine Backup Procedures

### Daily Backup Verification

```bash
# 1. Check last night's backup status
npm run backup:status -- --date yesterday

# 2. Verify backup integrity
npm run backup:validate -- --date yesterday

# 3. Check storage usage
npm run backup:storage

# 4. Review backup logs
tail -f /var/log/verpa/backup.log
```

### Manual Backup

For urgent backups outside the schedule:

```bash
# Full backup of all services
npm run backup:all -- --type full --compress --encrypt

# Specific service backup
npm run backup:mongodb -- --database user-service --compress
npm run backup:postgres -- --database analytics --type full
npm run backup:redis
```

### Backup Monitoring

1. **Automated Alerts**
   - Backup failure notifications via email/Slack
   - Storage threshold warnings (< 20% free)
   - Backup duration anomalies (> 2x average)

2. **Dashboard Metrics**
   - Success/failure rate
   - Backup sizes over time
   - Recovery point objectives (RPO)

## Restore Procedures

### Standard Restore

For planned maintenance or testing:

```bash
# 1. List available backups
npm run backup:list -- --service mongodb --days 7

# 2. Validate backup before restore
npm run backup:validate -- --backup /backups/2024-01-15/

# 3. Perform restore (with confirmation)
npm run restore:all -- --backup /backups/2024-01-15/ --services mongodb redis

# 4. Verify restore
npm run health:check -- --service all
```

### Emergency Restore (Disaster Recovery)

In case of data loss or corruption:

#### 1. Assess the Situation
```bash
# Check service status
docker-compose ps

# Check database connectivity
npm run db:check -- --all

# Identify affected services
npm run health:check -- --detailed
```

#### 2. Isolate Affected Systems
```bash
# Stop affected services
docker-compose stop user-service aquarium-service

# Prevent new connections
npm run maintenance:enable
```

#### 3. Identify Recovery Point
```bash
# Find last known good backup
npm run backup:find -- --before "2024-01-15 10:00" --status completed

# Verify backup integrity
npm run backup:validate -- --backup /backups/2024-01-15-0200/
```

#### 4. Perform Recovery
```bash
# Create recovery environment
npm run recovery:prepare -- --target staging

# Restore to staging first
npm run restore:all \
  --backup /backups/2024-01-15-0200/ \
  --target staging \
  --services mongodb postgresql redis

# Validate data in staging
npm run recovery:validate -- --target staging

# If validation passes, restore to production
npm run restore:all \
  --backup /backups/2024-01-15-0200/ \
  --target production \
  --overwrite
```

#### 5. Post-Recovery
```bash
# Run integrity checks
npm run db:integrity -- --all

# Verify application functionality
npm run test:smoke

# Disable maintenance mode
npm run maintenance:disable

# Monitor for issues
npm run monitor:recovery -- --duration 1h
```

### Point-in-Time Recovery

For recovering to a specific moment:

```bash
# 1. Identify target timestamp
TARGET_TIME="2024-01-15T14:30:00Z"

# 2. Find base backup
npm run backup:pit:find -- --timestamp "$TARGET_TIME"

# 3. Restore with point-in-time
npm run restore:pit \
  --timestamp "$TARGET_TIME" \
  --services mongodb postgresql \
  --target recovery

# 4. Apply transaction logs
npm run restore:logs \
  --from-backup /backups/2024-01-15-0200/ \
  --to-timestamp "$TARGET_TIME"
```

## Backup Validation

### Regular Validation Schedule

- **Daily**: Automated checksum verification
- **Weekly**: Restore test to staging environment
- **Monthly**: Full disaster recovery drill
- **Quarterly**: Backup infrastructure audit

### Validation Procedures

```bash
# 1. Checksum validation
npm run backup:validate -- --backup /path/to/backup --checksum

# 2. Structure validation
npm run backup:validate -- --backup /path/to/backup --structure

# 3. Restore validation
npm run backup:validate -- --backup /path/to/backup --restore-test

# 4. Data integrity validation
npm run backup:validate -- --backup /path/to/backup --data-integrity
```

## Storage Management

### Local Storage

```bash
# Check storage usage
df -h /var/backups/verpa

# Apply retention policy manually
npm run backup:cleanup -- --dry-run
npm run backup:cleanup -- --confirm

# Archive old backups
npm run backup:archive -- --older-than 90d --to s3://verpa-archive/
```

### Cloud Storage

#### AWS S3
```bash
# List S3 backups
aws s3 ls s3://verpa-backups/ --recursive

# Download backup from S3
aws s3 sync s3://verpa-backups/2024-01-15/ /tmp/restore/

# Upload to S3
npm run backup:upload -- --backup /backups/2024-01-15/ --to s3
```

#### Google Cloud Storage
```bash
# List GCS backups
gsutil ls -l gs://verpa-backups/

# Download from GCS
gsutil -m cp -r gs://verpa-backups/2024-01-15/ /tmp/restore/
```

## Security Procedures

### Encryption Key Management

```bash
# Generate new encryption key
openssl rand -base64 32 > /etc/verpa/backup-key-new

# Rotate encryption key
npm run backup:rotate-key \
  --old-key /etc/verpa/backup-key \
  --new-key /etc/verpa/backup-key-new

# Backup encryption keys (store securely!)
npm run backup:export-keys -- --output /secure/location/
```

### Access Control

1. **Backup Storage Access**
   - Limited to backup service account
   - Read-only access for monitoring
   - Write access only during backup window

2. **Restore Permissions**
   - Requires admin approval
   - Audit log for all restore operations
   - Two-person rule for production restores

## Testing Procedures

### Monthly Restore Test

```bash
# 1. Create test environment
docker-compose -f docker-compose.test.yml up -d

# 2. Restore last week's backup
npm run restore:test \
  --backup last-week \
  --target test-env

# 3. Run validation suite
npm run test:backup-restore

# 4. Generate report
npm run backup:test-report -- --output ./reports/
```

### Disaster Recovery Drill

Quarterly full DR drill:

1. **Scenario Setup**
   - Simulate complete data center failure
   - Use alternate infrastructure
   - Follow documented procedures only

2. **Execution**
   - Time all operations
   - Document any issues
   - Test communication procedures

3. **Validation**
   - Verify all data restored
   - Check application functionality
   - Confirm performance metrics

4. **Report**
   - Document RTO/RPO achieved
   - List improvements needed
   - Update procedures

## Troubleshooting

### Common Issues

#### Backup Failures

```bash
# Check backup logs
tail -f /var/log/verpa/backup.log | grep ERROR

# Verify connectivity
npm run backup:test-connection -- --all

# Check disk space
df -h /var/backups

# Retry failed backup
npm run backup:retry -- --job-id <failed-job-id>
```

#### Slow Backups

```bash
# Analyze backup performance
npm run backup:analyze -- --job-id <job-id>

# Check network bandwidth
iperf3 -c backup-storage-server

# Optimize backup
npm run backup:optimize -- --suggestions
```

#### Restore Issues

```bash
# Verify backup integrity first
npm run backup:deep-validate -- --backup /path/to/backup

# Check target system requirements
npm run restore:prereq-check

# Try partial restore
npm run restore:partial -- --backup /path/to/backup --table users
```

## Monitoring and Alerts

### Metrics to Monitor

1. **Backup Metrics**
   - Success rate (target: > 99%)
   - Duration trend
   - Size growth rate
   - Compression ratio

2. **Storage Metrics**
   - Used space
   - Growth rate
   - Cost (for cloud storage)

3. **Recovery Metrics**
   - Last test date
   - Recovery time
   - Success rate

### Alert Configuration

```yaml
# alerts.yml
alerts:
  - name: backup_failure
    condition: backup_status == "failed"
    severity: critical
    notify:
      - email: ops@verpa.com
      - slack: #alerts
      - pagerduty: backup-team

  - name: storage_low
    condition: storage_free_percent < 20
    severity: warning
    notify:
      - email: ops@verpa.com

  - name: backup_duration_high
    condition: backup_duration > average * 2
    severity: warning
    notify:
      - slack: #monitoring
```

## Documentation

### Required Documentation

1. **Runbooks**
   - Standard backup procedure
   - Emergency restore procedure
   - Troubleshooting guide

2. **Contact Information**
   - On-call rotation
   - Vendor support
   - Management escalation

3. **System Documentation**
   - Architecture diagrams
   - Data flow diagrams
   - Recovery priorities

### Maintenance Log

Keep detailed logs of:
- All manual backups
- Restore operations
- Configuration changes
- Test results
- Incidents

## Compliance

### Regulatory Requirements

1. **Data Retention**
   - Financial data: 7 years
   - User data: As per privacy policy
   - Audit logs: 3 years

2. **Data Protection**
   - Encryption at rest
   - Encryption in transit
   - Access controls
   - Audit trails

3. **Testing Requirements**
   - Monthly restore tests
   - Quarterly DR drills
   - Annual compliance audit

### Audit Checklist

- [ ] Backup schedules documented
- [ ] Retention policies enforced
- [ ] Encryption keys secured
- [ ] Access logs maintained
- [ ] Test results documented
- [ ] Procedures up to date
- [ ] Staff trained
- [ ] Compliance verified

## Appendix

### Quick Reference

```bash
# Emergency contacts
On-call: +1-555-0123
Manager: +1-555-0124
Vendor: +1-555-0125

# Critical commands
npm run emergency:restore   # Start emergency restore
npm run backup:status      # Check backup status
npm run health:check       # Verify system health

# Key locations
Backups: /var/backups/verpa
Logs: /var/log/verpa/
Configs: /etc/verpa/
Keys: /secure/verpa/keys/
```

### Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-15 | DevOps Team | Initial version |
| 1.1 | 2024-02-01 | DevOps Team | Added cloud storage procedures |
| 1.2 | 2024-03-01 | DevOps Team | Updated DR procedures |