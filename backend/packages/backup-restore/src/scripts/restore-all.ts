#!/usr/bin/env node

import { Command } from 'commander';
import { NestFactory } from '@nestjs/core';
import { BackupRestoreModule } from '../backup-restore.module';
import { RestoreService } from '../services/restore.service';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

dotenv.config();

const program = new Command();

program
  .name('restore-all')
  .description('Restore Verpa services from backup')
  .requiredOption('-b, --backup <path>', 'Backup directory path')
  .option('-s, --services <services...>', 'Services to restore (default: all)')
  .option('-t, --target <environment>', 'Target environment (dev, staging, prod)')
  .option('--skip-validation', 'Skip backup validation', false)
  .option('--dry-run', 'Perform dry run without actual restore', false)
  .option('--overwrite', 'Overwrite existing data', false)
  .option('--parallel', 'Restore services in parallel', false)
  .parse(process.argv);

const options = program.opts();

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  console.log('🔄 Starting Verpa restore...');
  console.log(`Options: ${JSON.stringify(options, null, 2)}`);

  // Confirmation for non-dry-run restores
  if (!options.dryRun) {
    console.log('\n⚠️  WARNING: This will restore data from backup!');
    if (options.overwrite) {
      console.log('⚠️  OVERWRITE MODE: Existing data will be replaced!');
    }
    
    const answer = await askQuestion('\nAre you sure you want to continue? (yes/no): ');
    if (answer.toLowerCase() !== 'yes') {
      console.log('Restore cancelled.');
      process.exit(0);
    }
  }

  rl.close();

  // Create NestJS application context
  const app = await NestFactory.createApplicationContext(
    BackupRestoreModule.forRoot({
      enabled: true,
      basePath: '/var/backups/verpa',
    }),
  );

  const restoreService = app.get(RestoreService);

  try {
    // Perform restore
    console.log('\n📦 Starting restore process...');
    const result = await restoreService.performRestore(options.backup, {
      targetEnvironment: options.target,
      services: options.services,
      skipValidation: options.skipValidation,
      dryRun: options.dryRun,
      parallel: options.parallel,
      overwrite: options.overwrite,
    });

    // Display results
    if (result.success) {
      console.log('\n✅ Restore completed successfully!');
    } else {
      console.log('\n⚠️  Restore completed with errors!');
    }

    console.log('\nRestore Summary:');
    console.log('================');
    console.log(`Duration: ${result.duration}ms`);
    console.log(`\nRestored services (${result.restoredServices.length}):`);
    result.restoredServices.forEach(service => {
      console.log(`  ✅ ${service}`);
    });

    if (result.failedServices.length > 0) {
      console.log(`\nFailed services (${result.failedServices.length}):`);
      result.failedServices.forEach(service => {
        console.log(`  ❌ ${service}`);
      });
    }

    if (result.warnings && result.warnings.length > 0) {
      console.log('\nWarnings:');
      result.warnings.forEach(warning => {
        console.log(`  ⚠️  ${warning}`);
      });
    }

    if (result.errors && result.errors.length > 0) {
      console.log('\nErrors:');
      result.errors.forEach(error => {
        console.log(`  ❌ ${error.message}`);
      });
    }

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Restore failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await app.close();
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});