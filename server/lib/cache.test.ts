import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock logger to avoid Winston in tests
vi.mock('./logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
}));

// Simple in-memory cache implementation for testing
interface CacheItem<T> {
  data: T;
  timestamp: number;
}

class SimpleCache {
  private cache = new Map<string, CacheItem<any>>();
  private CACHE_DURATION = 10 * 60 * 1000;

  getCacheKey(operation: string, ...params: any[]): string {
    return `${operation}:${params.join(':')}`;
  }

  getFromCache<T>(key: string, maxAge: number = this.CACHE_DURATION): T | null {
    const item = this.cache.get(key);
    if (item && (Date.now() - item.timestamp) < maxAge) {
      return item.data as T;
    }
    if (item) this.cache.delete(key);
    return null;
  }

  setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clearCache(pattern?: string): void {
    if (pattern) {
      const keys = Array.from(this.cache.keys());
      const clearedKeys = keys.filter(key => key.includes(pattern));
      clearedKeys.forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }

  // Helper for tests
  getCacheSize(): number {
    return this.cache.size;
  }
}

describe('Cache System', () => {
  let cache: SimpleCache;

  beforeEach(() => {
    cache = new SimpleCache();
  });

  describe('getCacheKey', () => {
    it('should generate cache key from operation and params', () => {
      const key = cache.getCacheKey('students', 'group1', true);
      expect(key).toBe('students:group1:true');
    });

    it('should handle multiple parameters', () => {
      const key = cache.getCacheKey('attendance', 'group1', '2024-01-01', 'session123');
      expect(key).toBe('attendance:group1:2024-01-01:session123');
    });

    it('should handle no parameters', () => {
      const key = cache.getCacheKey('groups');
      expect(key).toBe('groups:');
    });
  });

  describe('setCache and getFromCache', () => {
    it('should store and retrieve data', () => {
      const testData = { id: '1', name: 'Test' };
      const key = 'test:data';

      cache.setCache(key, testData);
      const retrieved = cache.getFromCache<typeof testData>(key);

      expect(retrieved).toEqual(testData);
    });

    it('should return null for non-existent key', () => {
      const result = cache.getFromCache('non:existent');
      expect(result).toBeNull();
    });

    it('should return null for expired data', () => {
      const testData = { value: 'test' };
      const key = 'test:expired';

      cache.setCache(key, testData);

      // Mock expired cache by using very short maxAge
      const result = cache.getFromCache(key, 0);
      expect(result).toBeNull();
    });

    it('should handle different data types', () => {
      cache.setCache('string', 'hello');
      cache.setCache('number', 42);
      cache.setCache('array', [1, 2, 3]);
      cache.setCache('object', { a: 1, b: 2 });

      expect(cache.getFromCache('string')).toBe('hello');
      expect(cache.getFromCache('number')).toBe(42);
      expect(cache.getFromCache('array')).toEqual([1, 2, 3]);
      expect(cache.getFromCache('object')).toEqual({ a: 1, b: 2 });
    });
  });

  describe('clearCache', () => {
    beforeEach(() => {
      cache.setCache('students:group1:true', []);
      cache.setCache('students:group1:false', []);
      cache.setCache('students:group2:true', []);
      cache.setCache('attendance:group1', []);
      cache.setCache('groups', []);
    });

    it('should clear all cache when no pattern provided', () => {
      expect(cache.getCacheSize()).toBe(5);

      cache.clearCache();

      expect(cache.getCacheSize()).toBe(0);
      expect(cache.getFromCache('students:group1:true')).toBeNull();
    });

    it('should clear cache by pattern', () => {
      cache.clearCache('students:group1');

      expect(cache.getFromCache('students:group1:true')).toBeNull();
      expect(cache.getFromCache('students:group1:false')).toBeNull();
      expect(cache.getFromCache('students:group2:true')).not.toBeNull();
      expect(cache.getFromCache('attendance:group1')).not.toBeNull();
    });

    it('should clear cache by specific group', () => {
      cache.clearCache('group1');

      expect(cache.getFromCache('students:group1:true')).toBeNull();
      expect(cache.getFromCache('students:group1:false')).toBeNull();
      expect(cache.getFromCache('attendance:group1')).toBeNull();
      expect(cache.getFromCache('students:group2:true')).not.toBeNull();
    });

    it('should handle pattern that matches nothing', () => {
      const sizeBefore = cache.getCacheSize();
      cache.clearCache('nonexistent');

      expect(cache.getCacheSize()).toBe(sizeBefore);
    });
  });

  describe('Cache expiration', () => {
    it('should respect custom maxAge', () => {
      const testData = { value: 'test' };
      cache.setCache('test', testData);

      // Should be valid with 1 hour maxAge
      const valid = cache.getFromCache('test', 60 * 60 * 1000);
      expect(valid).toEqual(testData);

      // Should be expired with 0 maxAge
      const expired = cache.getFromCache('test', 0);
      expect(expired).toBeNull();
    });

    it('should remove expired entries on access', () => {
      cache.setCache('test', 'data');
      expect(cache.getCacheSize()).toBe(1);

      // Access with 0 maxAge should remove entry
      cache.getFromCache('test', 0);
      expect(cache.getCacheSize()).toBe(0);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle student cache invalidation workflow', () => {
      // Initial cache
      const students1 = [{ id: '1', name: 'John' }];
      const students2 = [{ id: '2', name: 'Jane' }];

      cache.setCache('students:group1:true', students1);
      cache.setCache('students:group1:false', students1);

      // Add student - clear cache for group1
      cache.clearCache('students:group1');

      // Re-fetch and cache
      cache.setCache('students:group1:true', students2);
      cache.setCache('students:group1:false', students2);

      const result = cache.getFromCache('students:group1:true');
      expect(result).toEqual(students2);
    });

    it('should support multiple cache durations', () => {
      const STUDENTS_CACHE = 15 * 60 * 1000;
      const ATTENDANCE_CACHE = 5 * 60 * 1000;

      cache.setCache('students', []);
      cache.setCache('attendance', []);

      // Both should be valid immediately
      expect(cache.getFromCache('students', STUDENTS_CACHE)).not.toBeNull();
      expect(cache.getFromCache('attendance', ATTENDANCE_CACHE)).not.toBeNull();
    });
  });
});
