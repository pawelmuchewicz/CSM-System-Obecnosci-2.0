import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;

  // Add metadata if exists (excluding empty objects)
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }

  // Add stack trace for errors
  if (stack) {
    msg += `\n${stack}`;
  }

  return msg;
});

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

// Ensure logs directory exists
try {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log(`[Logger] Created logs directory: ${logsDir}`);
  }
} catch (error) {
  console.error('[Logger] Failed to create logs directory:', error);
  // Continue anyway - Winston will try to create it
}

// Define log level based on environment
const level = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

/**
 * Winston logger instance with daily rotation and structured logging
 *
 * Features:
 * - Daily log rotation (keeps 14 days)
 * - Separate files for errors and combined logs
 * - Console output with colors in development
 * - Structured logging with metadata support
 * - Automatic error stack traces
 *
 * Log levels (in order): error, warn, info, http, verbose, debug, silly
 */
const logger = winston.createLogger({
  level,
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    // Error log - only errors
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '14d',
      maxSize: '20m',
      zippedArchive: true,
    }),

    // Combined log - all levels
    new DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
      maxSize: '20m',
      zippedArchive: true,
    }),
  ],

  // Handle exceptions and rejections
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
    }),
  ],

  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '14d',
    }),
  ],
});

// Console output in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'HH:mm:ss' }),
        printf(({ level, message, timestamp, stack }) => {
          const msg = `${timestamp} ${level}: ${message}`;
          return stack ? `${msg}\n${stack}` : msg;
        })
      ),
    })
  );
}

/**
 * Helper function to replace console.log/error with logger
 *
 * Usage:
 * ```ts
 * import { logger } from './lib/logger';
 *
 * logger.info('User logged in', { userId: 123, username: 'john' });
 * logger.error('Failed to fetch data', { error: err.message });
 * logger.warn('Cache miss', { key: 'students:group1' });
 * logger.debug('Request details', { method: 'GET', path: '/api/students' });
 * ```
 */
export { logger };

// Export types for convenience
export type Logger = typeof logger;
