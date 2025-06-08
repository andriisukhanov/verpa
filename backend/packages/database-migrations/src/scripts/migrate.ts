#!/usr/bin/env node

import { Command } from 'commander';
import * as dotenv from 'dotenv';
import chalk from 'chalk';
import { MongoDBMigrationRunner } from '../mongodb/mongodb-runner';
import { PostgresMigrationRunner } from '../postgres/postgres-runner';
import { MigrationRunner } from '../common/interfaces/migration.interface';

// Load environment variables
dotenv.config();

const program = new Command();

program
  .name('migrate')
  .description('Database migration tool for Verpa')
  .version('1.0.0');

// Helper function to create runner based on database type
function createRunner(database: string, options: any): MigrationRunner {
  const runnerOptions = {
    databaseUrl: options.url,
    migrationsPath: options.path,
    migrationsTableName: options.table,
  };

  switch (database) {
    case 'mongodb':
      return new MongoDBMigrationRunner(runnerOptions);
    case 'postgres':
      return new PostgresMigrationRunner(runnerOptions);
    default:
      throw new Error(`Unsupported database type: ${database}`);
  }
}

// Common options for all commands
function addCommonOptions(command: Command): Command {
  return command
    .option('-d, --database <type>', 'Database type (mongodb|postgres)', 'mongodb')
    .option('-u, --url <url>', 'Database connection URL')
    .option('-p, --path <path>', 'Migrations directory path')
    .option('-t, --table <name>', 'Migrations table name', '_migrations');
}

// Up command
addCommonOptions(
  program
    .command('up [target]')
    .description('Run pending migrations up to target (or all if not specified)')
)
  .action(async (target, options) => {
    try {
      const runner = createRunner(options.database, options);
      console.log(chalk.blue('Running migrations up...'));
      
      const results = await runner.up(target);
      
      results.forEach(result => {
        if (result.status === 'success') {
          console.log(chalk.green(`✓ ${result.migration}`));
        } else if (result.status === 'skipped') {
          console.log(chalk.gray(`- ${result.migration} (already applied)`));
        } else {
          console.log(chalk.red(`✗ ${result.migration}: ${result.error?.message}`));
        }
      });

      const succeeded = results.filter(r => r.status === 'success').length;
      const failed = results.filter(r => r.status === 'failed').length;
      
      console.log(chalk.blue(`\nCompleted: ${succeeded} succeeded, ${failed} failed`));
      process.exit(failed > 0 ? 1 : 0);
    } catch (error) {
      console.error(chalk.red('Migration failed:'), error);
      process.exit(1);
    }
  });

// Down command
addCommonOptions(
  program
    .command('down [target]')
    .description('Rollback migrations down to target (or one if not specified)')
)
  .action(async (target, options) => {
    try {
      const runner = createRunner(options.database, options);
      console.log(chalk.blue('Rolling back migrations...'));
      
      const results = await runner.down(target);
      
      results.forEach(result => {
        if (result.status === 'success') {
          console.log(chalk.green(`✓ Rolled back ${result.migration}`));
        } else {
          console.log(chalk.red(`✗ ${result.migration}: ${result.error?.message}`));
        }
      });

      const succeeded = results.filter(r => r.status === 'success').length;
      const failed = results.filter(r => r.status === 'failed').length;
      
      console.log(chalk.blue(`\nCompleted: ${succeeded} succeeded, ${failed} failed`));
      process.exit(failed > 0 ? 1 : 0);
    } catch (error) {
      console.error(chalk.red('Rollback failed:'), error);
      process.exit(1);
    }
  });

// Status command
addCommonOptions(
  program
    .command('status')
    .description('Show migration status')
)
  .action(async (options) => {
    try {
      const runner = createRunner(options.database, options);
      console.log(chalk.blue('Checking migration status...\n'));
      
      const statuses = await runner.status();
      
      if (statuses.length === 0) {
        console.log(chalk.yellow('No migrations found'));
        return;
      }

      // Group by status
      const applied = statuses.filter(s => s.applied);
      const pending = statuses.filter(s => s.pending);

      if (applied.length > 0) {
        console.log(chalk.green('Applied migrations:'));
        applied.forEach(status => {
          const date = status.appliedAt ? 
            new Date(status.appliedAt).toLocaleString() : 'Unknown';
          console.log(chalk.green(`  ✓ ${status.timestamp}_${status.name} (${date})`));
        });
      }

      if (pending.length > 0) {
        console.log(chalk.yellow('\nPending migrations:'));
        pending.forEach(status => {
          console.log(chalk.yellow(`  ○ ${status.timestamp}_${status.name}`));
        });
      }

      console.log(chalk.blue(`\nTotal: ${applied.length} applied, ${pending.length} pending`));
    } catch (error) {
      console.error(chalk.red('Status check failed:'), error);
      process.exit(1);
    }
  });

// Latest command
addCommonOptions(
  program
    .command('latest')
    .description('Run all pending migrations')
)
  .action(async (options) => {
    try {
      const runner = createRunner(options.database, options);
      console.log(chalk.blue('Running all pending migrations...'));
      
      const results = await runner.latest();
      
      results.forEach(result => {
        if (result.status === 'success') {
          console.log(chalk.green(`✓ ${result.migration}`));
        } else if (result.status === 'skipped') {
          console.log(chalk.gray(`- ${result.migration} (already applied)`));
        } else {
          console.log(chalk.red(`✗ ${result.migration}: ${result.error?.message}`));
        }
      });

      const succeeded = results.filter(r => r.status === 'success').length;
      const failed = results.filter(r => r.status === 'failed').length;
      
      console.log(chalk.blue(`\nCompleted: ${succeeded} succeeded, ${failed} failed`));
      process.exit(failed > 0 ? 1 : 0);
    } catch (error) {
      console.error(chalk.red('Migration failed:'), error);
      process.exit(1);
    }
  });

// Rollback command
addCommonOptions(
  program
    .command('rollback')
    .description('Rollback the last applied migration')
)
  .action(async (options) => {
    try {
      const runner = createRunner(options.database, options);
      console.log(chalk.blue('Rolling back last migration...'));
      
      const results = await runner.rollback();
      
      if (results.length === 0) {
        console.log(chalk.yellow('No migrations to rollback'));
        return;
      }

      results.forEach(result => {
        if (result.status === 'success') {
          console.log(chalk.green(`✓ Rolled back ${result.migration}`));
        } else {
          console.log(chalk.red(`✗ ${result.migration}: ${result.error?.message}`));
        }
      });

      process.exit(results.some(r => r.status === 'failed') ? 1 : 0);
    } catch (error) {
      console.error(chalk.red('Rollback failed:'), error);
      process.exit(1);
    }
  });

program.parse();