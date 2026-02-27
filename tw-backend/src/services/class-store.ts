import type { TailwindClass, CustomClass, ValidationResult } from '@ux-builder-tw/shared';

/**
 * In-memory store for Tailwind utility classes and custom classes.
 * Provides fast prefix search and validation.
 * (Using class pattern here because it manages mutable state)
 */
export class ClassStore {
  private classes: TailwindClass[] = [];
  private customClasses: CustomClass[] = [];
  private classNameSet: Set<string> = new Set();

  setClasses(classes: TailwindClass[]): void {
    this.classes = classes;
    this.rebuildIndex();
  }

  setCustomClasses(customClasses: CustomClass[]): void {
    this.customClasses = customClasses;
    this.rebuildIndex();
  }

  search(query: string, limit = 50, offset = 0): TailwindClass[] {
    const q = query.toLowerCase();
    const matches = this.classes.filter(
      (c) => c.name.toLowerCase().startsWith(q) || c.name.toLowerCase().includes(q)
    );
    // Prioritize prefix matches over substring matches
    matches.sort((a, b) => {
      const aPrefix = a.name.toLowerCase().startsWith(q) ? 0 : 1;
      const bPrefix = b.name.toLowerCase().startsWith(q) ? 0 : 1;
      if (aPrefix !== bPrefix) return aPrefix - bPrefix;
      return a.name.localeCompare(b.name);
    });
    return matches.slice(offset, offset + limit);
  }

  searchCustom(query: string, limit = 50): CustomClass[] {
    const q = query.toLowerCase();
    return this.customClasses
      .filter((c) => c.name.toLowerCase().startsWith(q) || c.name.toLowerCase().includes(q))
      .slice(0, limit);
  }

  validate(className: string): boolean {
    return this.classNameSet.has(className);
  }

  validateMany(classNames: string[]): ValidationResult[] {
    return classNames.map((name) => ({
      className: name,
      valid: this.classNameSet.has(name),
    }));
  }

  getStats(): { totalClasses: number; totalCustomClasses: number } {
    return {
      totalClasses: this.classes.length,
      totalCustomClasses: this.customClasses.length,
    };
  }

  private rebuildIndex(): void {
    this.classNameSet = new Set([
      ...this.classes.map((c) => c.name),
      ...this.customClasses.map((c) => c.name),
    ]);
  }
}
