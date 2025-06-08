import winston from 'winston';
import chalk from 'chalk';
import { MigrationLogger } from './interfaces/migration.interface';

export class ConsoleLogger implements MigrationLogger {
  private logger: winston.Logger;

  constructor(level: string = 'info') {
    this.logger = winston.createLogger({
      level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
          const coloredLevel = this.colorizeLevel(level);
          return `${chalk.gray(timestamp)} ${coloredLevel} ${message}`;
        }),
      ),
      transports: [new winston.transports.Console()],
    });
  }

  info(message: string): void {
    this.logger.info(message);
  }

  error(message: string, error?: Error): void {
    this.logger.error(message);
    if (error?.stack) {
      this.logger.error(chalk.red(error.stack));
    }
  }

  warn(message: string): void {
    this.logger.warn(message);
  }

  debug(message: string): void {
    this.logger.debug(message);
  }

  private colorizeLevel(level: string): string {
    switch (level) {
      case 'info':
        return chalk.blue('[INFO]');
      case 'error':
        return chalk.red('[ERROR]');
      case 'warn':
        return chalk.yellow('[WARN]');
      case 'debug':
        return chalk.gray('[DEBUG]');
      default:
        return `[${level.toUpperCase()}]`;
    }
  }
}