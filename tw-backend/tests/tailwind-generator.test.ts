import { describe, it, expect } from 'vitest';
import { generateClassList } from '../src/services/tailwind-generator';

describe('TailwindGenerator', () => {
  it('should generate a non-empty list of utility classes', async () => {
    const classes = await generateClassList();
    expect(classes.length).toBeGreaterThan(100);
  });

  it('should include common utility classes', async () => {
    const classes = await generateClassList();
    const classNames = classes.map((c) => c.name);
    expect(classNames).toContain('flex');
    expect(classNames).toContain('hidden');
    expect(classNames).toContain('p-4');
    expect(classNames).toContain('text-center');
  });

  it('should include CSS for each class', async () => {
    const classes = await generateClassList();
    const flexClass = classes.find((c) => c.name === 'flex');
    expect(flexClass).toBeDefined();
    expect(flexClass!.css).toContain('display');
    expect(flexClass!.css).toContain('flex');
  });

  it('should categorize classes', async () => {
    const classes = await generateClassList();
    const categories = new Set(classes.map((c) => c.category));
    expect(categories.size).toBeGreaterThan(5);
  });
});
