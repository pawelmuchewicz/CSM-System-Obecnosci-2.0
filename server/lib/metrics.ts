import { logger } from './logger';

/**
 * Performance metrics tracker for Google Sheets operations and cache
 *
 * Tracks:
 * - Request duration
 * - Cache hit/miss rates
 * - Google Sheets API call count
 * - Error rates
 */

interface MetricData {
  count: number;
  totalDuration: number;
  minDuration: number;
  maxDuration: number;
  errors: number;
}

class MetricsCollector {
  private metrics: Map<string, MetricData> = new Map();
  private cacheHits: number = 0;
  private cacheMisses: number = 0;
  private sheetsApiCalls: number = 0;

  /**
   * Track the duration of an operation
   *
   * @param operation - Name of the operation (e.g., 'getStudents', 'setAttendance')
   * @param duration - Duration in milliseconds
   * @param error - Whether the operation resulted in an error
   */
  trackDuration(operation: string, duration: number, error: boolean = false): void {
    const existing = this.metrics.get(operation) || {
      count: 0,
      totalDuration: 0,
      minDuration: Infinity,
      maxDuration: 0,
      errors: 0,
    };

    this.metrics.set(operation, {
      count: existing.count + 1,
      totalDuration: existing.totalDuration + duration,
      minDuration: Math.min(existing.minDuration, duration),
      maxDuration: Math.max(existing.maxDuration, duration),
      errors: existing.errors + (error ? 1 : 0),
    });
  }

  /**
   * Record a cache hit
   */
  recordCacheHit(): void {
    this.cacheHits++;
  }

  /**
   * Record a cache miss
   */
  recordCacheMiss(): void {
    this.cacheMisses++;
  }

  /**
   * Record a Google Sheets API call
   */
  recordSheetsApiCall(): void {
    this.sheetsApiCalls++;
  }

  /**
   * Get cache hit rate as percentage
   */
  getCacheHitRate(): number {
    const total = this.cacheHits + this.cacheMisses;
    return total === 0 ? 0 : Math.round((this.cacheHits / total) * 100);
  }

  /**
   * Get metrics summary for an operation
   */
  getOperationMetrics(operation: string): {
    count: number;
    avgDuration: number;
    minDuration: number;
    maxDuration: number;
    errorRate: number;
  } | null {
    const data = this.metrics.get(operation);
    if (!data) return null;

    return {
      count: data.count,
      avgDuration: Math.round(data.totalDuration / data.count),
      minDuration: data.minDuration === Infinity ? 0 : data.minDuration,
      maxDuration: data.maxDuration,
      errorRate: Math.round((data.errors / data.count) * 100),
    };
  }

  /**
   * Get all metrics summary
   */
  getSummary(): {
    operations: Record<string, any>;
    cache: {
      hits: number;
      misses: number;
      hitRate: number;
    };
    sheetsApiCalls: number;
  } {
    const operations: Record<string, any> = {};

    for (const [op, data] of this.metrics.entries()) {
      operations[op] = {
        count: data.count,
        avgDuration: Math.round(data.totalDuration / data.count),
        minDuration: data.minDuration === Infinity ? 0 : data.minDuration,
        maxDuration: data.maxDuration,
        errorRate: Math.round((data.errors / data.count) * 100),
      };
    }

    return {
      operations,
      cache: {
        hits: this.cacheHits,
        misses: this.cacheMisses,
        hitRate: this.getCacheHitRate(),
      },
      sheetsApiCalls: this.sheetsApiCalls,
    };
  }

  /**
   * Log metrics summary (useful for debugging and monitoring)
   */
  logSummary(): void {
    const summary = this.getSummary();

    logger.info('Performance Metrics Summary', {
      cache: summary.cache,
      sheetsApiCalls: summary.sheetsApiCalls,
      topOperations: Object.entries(summary.operations)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([op, metrics]) => ({ operation: op, ...metrics })),
    });
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.sheetsApiCalls = 0;
  }
}

// Singleton instance
export const metrics = new MetricsCollector();

/**
 * Middleware to track request duration
 *
 * @example
 * ```ts
 * import { trackPerformance } from './lib/metrics';
 *
 * const result = await trackPerformance('getStudents', async () => {
 *   return await getStudentsFromSheets(groupId);
 * });
 * ```
 */
export async function trackPerformance<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  let error = false;

  try {
    const result = await fn();
    return result;
  } catch (err) {
    error = true;
    throw err;
  } finally {
    const duration = Date.now() - start;
    metrics.trackDuration(operation, duration, error);

    // Log slow operations (> 1 second)
    if (duration > 1000) {
      logger.warn('Slow operation detected', {
        operation,
        duration,
        threshold: 1000,
      });
    }
  }
}

/**
 * Log metrics summary periodically
 * Call this at server startup to enable periodic logging
 */
export function startMetricsLogging(intervalMinutes: number = 15): NodeJS.Timeout {
  const interval = intervalMinutes * 60 * 1000;

  const timer = setInterval(() => {
    metrics.logSummary();
  }, interval);

  logger.info('Metrics logging started', { intervalMinutes });

  return timer;
}

/**
 * Express middleware to track API endpoint performance
 */
export function metricsMiddleware() {
  return (req: any, res: any, next: any) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const operation = `${req.method} ${req.path}`;

      metrics.trackDuration(operation, duration, res.statusCode >= 400);
    });

    next();
  };
}
