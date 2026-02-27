import { describe, it, expect, beforeEach } from 'vitest';
import { ClassStore } from '../src/services/class-store';

describe('ClassStore', () => {
  let store: ClassStore;

  beforeEach(() => {
    store = new ClassStore();
  });

  it('should search by prefix', () => {
    store.setClasses([
      { name: 'bg-blue-500', css: 'background-color: blue', category: 'backgrounds' },
      { name: 'bg-red-500', css: 'background-color: red', category: 'backgrounds' },
      { name: 'flex', css: 'display: flex', category: 'layout' },
    ]);
    const results = store.search('bg-');
    expect(results.map((r) => r.name)).toEqual(['bg-blue-500', 'bg-red-500']);
  });

  it('should limit results', () => {
    store.setClasses(
      Array.from({ length: 100 }, (_, i) => ({
        name: `p-${i}`,
        css: `padding: ${i}px`,
        category: 'spacing',
      }))
    );
    const results = store.search('p-', 10);
    expect(results).toHaveLength(10);
  });

  it('should validate known classes', () => {
    store.setClasses([{ name: 'flex', css: 'display: flex', category: 'layout' }]);
    expect(store.validate('flex')).toBe(true);
    expect(store.validate('flexxx')).toBe(false);
  });
});
