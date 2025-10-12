/**
 * Parse groupIds from various formats to ensure robust handling
 *
 * Supports multiple input formats:
 * - Array of strings (returns filtered array)
 * - JSON string array (parses and returns filtered array)
 * - Any other value (returns empty array)
 *
 * @param groupIds - Can be array, JSON string, or any value
 * @returns Array of string group IDs, or empty array on error
 *
 * @example
 * ```ts
 * parseGroupIds(['group1', 'group2']) // => ['group1', 'group2']
 * parseGroupIds('["group1", "group2"]') // => ['group1', 'group2']
 * parseGroupIds(null) // => []
 * ```
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
