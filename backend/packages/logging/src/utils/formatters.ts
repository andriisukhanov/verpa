import { format } from 'winston';
import { LogEntry } from '../interfaces/logger.interface';

export const jsonFormatter = format.json();

export const prettyFormatter = format.combine(
  format.colorize(),
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.align(),
  format.printf(({ timestamp, level, message, ...metadata }) => {
    let log = `${timestamp} ${level}: ${message}`;
    
    if (Object.keys(metadata).length > 0) {
      log += '\n' + JSON.stringify(metadata, null, 2);
    }
    
    return log;
  }),
);

export const compactFormatter = format.printf(({ level, message, ...metadata }) => {
  const metaStr = Object.keys(metadata).length > 0 
    ? ` ${JSON.stringify(metadata)}` 
    : '';
  return `[${level.toUpperCase()}] ${message}${metaStr}`;
});

export const elasticsearchFormatter = format((info) => {
  const { timestamp, level, message, ...metadata } = info;
  
  return {
    '@timestamp': timestamp || new Date().toISOString(),
    level,
    message,
    ...metadata,
  };
})();

export function createCustomFormatter(template: string): any {
  return format.printf((info) => {
    let output = template;
    
    // Replace placeholders
    output = output.replace(/\{(\w+)\}/g, (match, key) => {
      return info[key] || match;
    });
    
    return output;
  });
}