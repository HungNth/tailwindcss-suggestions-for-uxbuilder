import type { CustomClass } from '@ux-builder-tw/shared';

/**
 * In-memory store for custom classes (from @apply resolution).
 * Standard Tailwind classes are now bundled in the extension — this store
 * only handles custom CSS classes from user-defined files.
 */
export class ClassStore {
  private customClasses: CustomClass[] = [];
  private customClassNameSet: Set<string> = new Set();

  setCustomClasses(customClasses: CustomClass[]): void {
    this.customClasses = customClasses;
    this.customClassNameSet = new Set(customClasses.map((c) => c.name));
  }

  searchCustom(query: string, limit = 50): CustomClass[] {
    const q = query.toLowerCase();
    return this.customClasses
      .filter((c) => c.name.toLowerCase().startsWith(q) || c.name.toLowerCase().includes(q))
      .slice(0, limit);
  }

  getCustomClasses(): CustomClass[] {
    return this.customClasses;
  }

  getStats(): { totalCustomClasses: number } {
    return {
      totalCustomClasses: this.customClasses.length,
    };
  }
}
