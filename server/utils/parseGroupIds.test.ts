import { describe, it, expect } from 'vitest';

/**
 * Parse groupIds from various formats to ensure robust handling
 * @param groupIds - Can be array, JSON string, or any value
 * @returns Array of string group IDs, or empty array on error
 */
export function parseGroupIds(groupIds: any): string[] {
  try {
    if (!groupIds) return [];

    // If it's already an array, use it
    if (Array.isArray(groupIds)) {
      return groupIds.filter((id): id is string => typeof id === 'string');
    }

    // If it's a string (JSON), parse it
    if (typeof groupIds === 'string') {
      const parsed = JSON.parse(groupIds);
      return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
    }

    return [];
  } catch (error) {
    console.error('Failed to parse groupIds:', error);
    return [];
  }
}

describe('parseGroupIds', () => {
  describe('Array input', () => {
    it('should handle valid string array', () => {
      const input = ['group1', 'group2', 'group3'];
      const result = parseGroupIds(input);
      expect(result).toEqual(['group1', 'group2', 'group3']);
    });

    it('should filter out non-string values from array', () => {
      const input = ['group1', 123, null, 'group2', undefined, 'group3'];
      const result = parseGroupIds(input);
      expect(result).toEqual(['group1', 'group2', 'group3']);
    });

    it('should handle empty array', () => {
      const input: string[] = [];
      const result = parseGroupIds(input);
      expect(result).toEqual([]);
    });
  });

  describe('JSON string input', () => {
    it('should parse valid JSON array string', () => {
      const input = '["group1", "group2", "group3"]';
      const result = parseGroupIds(input);
      expect(result).toEqual(['group1', 'group2', 'group3']);
    });

    it('should handle JSON array with mixed types', () => {
      const input = '["group1", 123, "group2"]';
      const result = parseGroupIds(input);
      expect(result).toEqual(['group1', 'group2']);
    });

    it('should return empty array for invalid JSON', () => {
      const input = '{not valid json}';
      const result = parseGroupIds(input);
      expect(result).toEqual([]);
    });

    it('should return empty array for JSON non-array', () => {
      const input = '{"key": "value"}';
      const result = parseGroupIds(input);
      expect(result).toEqual([]);
    });
  });

  describe('Edge cases', () => {
    it('should handle null', () => {
      const result = parseGroupIds(null);
      expect(result).toEqual([]);
    });

    it('should handle undefined', () => {
      const result = parseGroupIds(undefined);
      expect(result).toEqual([]);
    });

    it('should handle empty string', () => {
      const result = parseGroupIds('');
      expect(result).toEqual([]);
    });

    it('should handle number', () => {
      const result = parseGroupIds(123);
      expect(result).toEqual([]);
    });

    it('should handle object', () => {
      const result = parseGroupIds({ key: 'value' });
      expect(result).toEqual([]);
    });
  });
});
