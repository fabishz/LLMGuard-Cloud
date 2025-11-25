import pino from 'pino';
import env from '../config/env.js';

/**
 * Pino logger configuration
 * Provides structured logging with request ID tracking
 */
const logger = pino({
  level: env.LOG_LEVEL,
  transport:
    env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
            singleLine: false,
            messageFormat: '{levelLabel} - {msg}',
          },
        }
      : undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
});

export { logger };
