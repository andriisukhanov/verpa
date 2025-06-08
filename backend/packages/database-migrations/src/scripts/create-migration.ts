#!/usr/bin/env node

import { Command } from 'commander';
import * as dotenv from 'dotenv';
import chalk from 'chalk';
import { MongoDBMigrationRunner } from '../mongodb/mongodb-runner';
import { PostgresMigrationRunner } from '../postgres/postgres-runner';

// Load environment variables
dotenv.config();

const program = new Command();

program
  .name('create-migration')
  .description('Create a new migration file')
  .version('1.0.0')
  .argument('<name>', 'Migration name (e.g., add-user-indexes)')
  .option('-d, --database <type>', 'Database type (mongodb|postgres)', 'mongodb')
  .option('-p, --path <path>', 'Migrations directory path')
  .action(async (name, options) => {
    try {
      console.log(chalk.blue(`Creating ${options.database} migration: ${name}`));

      const runnerOptions = {
        migrationsPath: options.path,
      };

      let runner;
      switch (options.database) {
        case 'mongodb':
          runner = new MongoDBMigrationRunner(runnerOptions);
          break;
        case 'postgres':
          runner = new PostgresMigrationRunner(runnerOptions);
          break;
        default:
          throw new Error(`Unsupported database type: ${options.database}`);
      }

      const filePath = await runner.create(name);
      console.log(chalk.green(`✓ Created migration: ${filePath}`));
      
      console.log(chalk.blue('\nNext steps:'));
      console.log('1. Edit the migration file to add your changes');
      console.log('2. Run migrations with: npm run migrate:up');
      
    } catch (error) {
      console.error(chalk.red('Failed to create migration:'), error);
      process.exit(1);
    }
  });

program.parse();