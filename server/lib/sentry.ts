import * as Sentry from '@sentry/node';
import type { Express } from 'express';

/**
 * Initialize Sentry error monitoring and performance tracking
 *
 * Features:
 * - Error tracking with stack traces and context
 * - Performance monitoring (transactions, spans)
 * - Release tracking and source maps
 * - User context and breadcrumbs
 * - Express integration for automatic error capture
 *
 * Environment variables:
 * - SENTRY_DSN: Data Source Name from sentry.io (required)
 * - NODE_ENV: Set to 'production' to enable Sentry
 * - SENTRY_ENVIRONMENT: Environment name (default: NODE_ENV)
 * - SENTRY_RELEASE: Release version (default: from package.json or git)
 *
 * @param app - Express application instance
 */
export function initializeSentry(app: Express) {
  const dsn = process.env.SENTRY_DSN;
  const environment = process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';

  // Only initialize Sentry in production or if DSN is explicitly set
  if (!dsn) {
    console.log('[Sentry] Skipping initialization - no SENTRY_DSN configured');
    return;
  }

  // Get release version from environment or default
  const release = process.env.SENTRY_RELEASE || '1.0.0';

  Sentry.init({
    dsn,
    environment,
    release,

    // Performance monitoring
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in dev

    // Profiling (optional - can be added later if needed)
    // profilesSampleRate: environment === 'production' ? 0.1 : 1.0,

    integrations: [
      // Express integration
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app }),
    ],

    // Filter sensitive data
    beforeSend(event, hint) {
      // Remove passwords from error context
      if (event.request?.data) {
        try {
          const data = typeof event.request.data === 'string'
            ? JSON.parse(event.request.data)
            : event.request.data;

          if (data.password) {
            data.password = '[REDACTED]';
            event.request.data = JSON.stringify(data);
          }
        } catch {
          // Ignore parse errors
        }
      }

      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      'ECONNRESET',
      'ENOTFOUND',
      'ETIMEDOUT',
      'AbortError',
      'Navigation cancelled',
    ],
  });

  console.log(`[Sentry] Initialized successfully - Environment: ${environment}, Release: ${release}`);
}

/**
 * Sentry Express middleware
 *
 * Add these to your Express app:
 * ```ts
 * import { sentryRequestHandler, sentryTracingHandler, sentryErrorHandler } from './lib/sentry';
 *
 * // Before routes
 * app.use(sentryRequestHandler);
 * app.use(sentryTracingHandler);
 *
 * // After routes (error handler must be last)
 * app.use(sentryErrorHandler);
 * ```
 */
export const sentryRequestHandler = Sentry.Handlers.requestHandler();
export const sentryTracingHandler = Sentry.Handlers.tracingHandler();
export const sentryErrorHandler = Sentry.Handlers.errorHandler();

/**
 * Manually capture exceptions with context
 *
 * @example
 * ```ts
 * import { captureException } from './lib/sentry';
 *
 * try {
 *   // code
 * } catch (error) {
 *   captureException(error, {
 *     user: { id: '123', username: 'john' },
 *     tags: { operation: 'fetch_students' },
 *     extra: { groupId: 'group123' }
 *   });
 * }
 * ```
 */
export const captureException = Sentry.captureException;
export const captureMessage = Sentry.captureMessage;
export const setUser = Sentry.setUser;
export const setContext = Sentry.setContext;
export const addBreadcrumb = Sentry.addBreadcrumb;
