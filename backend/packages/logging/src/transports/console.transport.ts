import * as winston from 'winston';
import * as chalk from 'chalk';
import { format } from 'winston';
import { ConsoleTransportConfig } from '../interfaces/log-config.interface';

const levelColors = {
  error: chalk.red,
  warn: chalk.yellow,
  info: chalk.green,
  http: chalk.magenta,
  verbose: chalk.cyan,
  debug: chalk.blue,
  silly: chalk.gray,
};

export function createConsoleTransport(config?: ConsoleTransportConfig['options']): winston.transport {
  const colorize = config?.colors !== false;
  const prettyPrint = config?.prettyPrint !== false;
  const timestamps = config?.timestamps !== false;

  const consoleFormat = format.combine(
    timestamps ? format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }) : format.uncolorize(),
    format.errors({ stack: true }),
    format.printf(({ timestamp, level, message, ...metadata }) => {
      const coloredLevel = colorize ? levelColors[level](`[${level.toUpperCase()}]`) : `[${level.toUpperCase()}]`;
      const timestampStr = timestamps ? `${timestamp} ` : '';
      
      let output = `${timestampStr}${coloredLevel} ${message}`;
      
      if (prettyPrint && Object.keys(metadata).length > 0) {
        // Remove internal winston properties
        const cleanMetadata = { ...metadata };
        delete cleanMetadata.level;
        delete cleanMetadata.message;
        delete cleanMetadata.timestamp;
        delete cleanMetadata.label;
        delete cleanMetadata.splat;
        
        if (Object.keys(cleanMetadata).length > 0) {
          const metadataStr = JSON.stringify(cleanMetadata, null, 2);
          const indentedMetadata = metadataStr.split('\n').map((line, index) => 
            index === 0 ? line : '  ' + line
          ).join('\n');
          output += '\n' + (colorize ? chalk.gray(indentedMetadata) : indentedMetadata);
        }
      }
      
      return output;
    }),
  );

  return new winston.transports.Console({
    format: consoleFormat,
  });
}