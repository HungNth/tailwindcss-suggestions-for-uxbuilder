import type { TailwindClass, CustomClass } from '@ux-builder-tw/shared';

/**
 * In-memory class store for offline search.
 * Loaded from bundled JSON (standard classes) and backend (custom classes).
 */

let standardClasses: TailwindClass[] = [];
let customClasses: CustomClass[] = [];
let classNameSet: Set<string> = new Set();

/**
 * Load standard classes from bundled JSON data
 */
export function setStandardClasses(classes: TailwindClass[]): void {
  standardClasses = classes;
  rebuildIndex();
}

/**
 * Load custom classes from backend
 */
export function setCustomClasses(classes: CustomClass[]): void {
  customClasses = classes;
  rebuildIndex();
}

/**
 * Get custom classes
 */
export function getCustomClasses(): CustomClass[] {
  return customClasses;
}

/**
 * Rebuild the Set index for O(1) validation
 */
function rebuildIndex(): void {
  classNameSet = new Set([
    ...standardClasses.map((c) => c.name),
    ...customClasses.map((c) => c.name),
  ]);
}

/**
 * Search standard classes by query (prefix + substring, prefix-first sorting)
 */
export function searchClasses(query: string, limit = 50, offset = 0): TailwindClass[] {
  if (!query) return [];

  const lowerQuery = query.toLowerCase();

  const prefixMatches: TailwindClass[] = [];
  const substringMatches: TailwindClass[] = [];

  for (const cls of standardClasses) {
    const lowerName = cls.name.toLowerCase();
    if (lowerName.startsWith(lowerQuery)) {
      prefixMatches.push(cls);
    } else if (lowerName.includes(lowerQuery)) {
      substringMatches.push(cls);
    }
  }

  prefixMatches.sort((a, b) => a.name.localeCompare(b.name));
  substringMatches.sort((a, b) => a.name.localeCompare(b.name));

  const combined = [...prefixMatches, ...substringMatches];
  return combined.slice(offset, offset + limit);
}

/**
 * Search custom classes by query
 */
export function searchCustom(query: string, limit = 50): CustomClass[] {
  if (!query) return customClasses.slice(0, limit);

  const lowerQuery = query.toLowerCase();
  const matches: CustomClass[] = [];

  for (const cls of customClasses) {
    const lowerName = cls.name.toLowerCase();
    if (lowerName.includes(lowerQuery)) {
      matches.push(cls);
    }
  }

  return matches.slice(0, limit);
}

/**
 * Validate a class name exists
 */
export function validateClass(className: string): boolean {
  return classNameSet.has(className);
}

/**
 * Get stats
 */
export function getStats(): { totalStandard: number; totalCustom: number } {
  return {
    totalStandard: standardClasses.length,
    totalCustom: customClasses.length,
  };
}
