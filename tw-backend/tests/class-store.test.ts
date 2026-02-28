import { describe, it, expect, beforeEach } from 'vitest';
import { ClassStore } from '../src/services/class-store';
import type { CustomClass } from '@ux-builder-tw/shared';

describe('ClassStore', () => {
  let store: ClassStore;

  const sampleCustomClasses: CustomClass[] = [
    {
      name: 'btn-primary',
      css: 'background-color: blue; color: white; padding: 0.5rem 1rem;',
      applyValue: 'bg-blue-500 text-white px-4 py-2',
      appliedUtilities: ['bg-blue-500', 'text-white', 'px-4', 'py-2'],
      sourceFile: '/path/to/styles.css',
      source: '/path/to/styles.css',
    },
    {
      name: 'btn-secondary',
      css: 'background-color: gray; color: black;',
      applyValue: 'bg-gray-500 text-black',
      appliedUtilities: ['bg-gray-500', 'text-black'],
      sourceFile: '/path/to/styles.css',
      source: '/path/to/styles.css',
    },
    {
      name: 'card-wrapper',
      css: 'padding: 1rem; border-radius: 0.5rem;',
      applyValue: 'p-4 rounded-lg',
      appliedUtilities: ['p-4', 'rounded-lg'],
      sourceFile: '/path/to/components.css',
      source: '/path/to/components.css',
    },
  ];

  beforeEach(() => {
    store = new ClassStore();
  });

  it('should search custom classes by prefix', () => {
    store.setCustomClasses(sampleCustomClasses);
    const results = store.searchCustom('btn-');
    expect(results.map((r) => r.name)).toEqual(['btn-primary', 'btn-secondary']);
  });

  it('should search custom classes by substring', () => {
    store.setCustomClasses(sampleCustomClasses);
    const results = store.searchCustom('wrapper');
    expect(results.map((r) => r.name)).toEqual(['card-wrapper']);
  });

  it('should limit custom class results', () => {
    store.setCustomClasses(sampleCustomClasses);
    const results = store.searchCustom('', 2);
    expect(results).toHaveLength(2);
  });

  it('should return all custom classes', () => {
    store.setCustomClasses(sampleCustomClasses);
    const results = store.getCustomClasses();
    expect(results).toHaveLength(3);
  });

  it('should report correct stats', () => {
    store.setCustomClasses(sampleCustomClasses);
    const stats = store.getStats();
    expect(stats.totalCustomClasses).toBe(3);
  });

  it('should start with empty custom classes', () => {
    const stats = store.getStats();
    expect(stats.totalCustomClasses).toBe(0);
    expect(store.getCustomClasses()).toEqual([]);
  });
});
