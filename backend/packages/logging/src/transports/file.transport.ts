import * as winston from 'winston';
import { format } from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import * as path from 'path';
import { FileTransportConfig } from '../interfaces/log-config.interface';

export function createFileTransport(config: FileTransportConfig['options']): winston.transport {
  const fileFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    format.errors({ stack: true }),
    format.json(),
  );

  const dirname = config.dirname || path.join(process.cwd(), 'logs');
  const filename = config.filename || 'app-%DATE%.log';

  return new DailyRotateFile({
    dirname,
    filename,
    datePattern: config.datePattern || 'YYYY-MM-DD',
    zippedArchive: config.zippedArchive !== false,
    maxSize: config.maxSize || '20m',
    maxFiles: config.maxFiles || '14d',
    format: fileFormat,
  });
}

export function createErrorFileTransport(config: FileTransportConfig['options']): winston.transport {
  const dirname = config.dirname || path.join(process.cwd(), 'logs');
  const filename = 'error-%DATE%.log';

  return new DailyRotateFile({
    dirname,
    filename,
    level: 'error',
    datePattern: config.datePattern || 'YYYY-MM-DD',
    zippedArchive: config.zippedArchive !== false,
    maxSize: config.maxSize || '20m',
    maxFiles: config.maxFiles || '30d',
    format: format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      format.errors({ stack: true }),
      format.json(),
    ),
  });
}