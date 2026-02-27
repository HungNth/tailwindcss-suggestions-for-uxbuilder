import { describe, it, expect } from 'vitest';
import { resolveApplyDirectives } from '../src/services/apply-resolver';

describe('ApplyResolver', () => {
  it('should resolve @apply directives from CSS content', async () => {
    const css = `
      .btn-primary {
        @apply bg-blue-500 text-white px-4 py-2 rounded;
      }
    `;
    const result = await resolveApplyDirectives(css, 'test.css');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('btn-primary');
    expect(result[0].appliedUtilities).toEqual([
      'bg-blue-500',
      'text-white',
      'px-4',
      'py-2',
      'rounded',
    ]);
    expect(result[0].css).toBeTruthy();
  });

  it('should handle multiple custom classes', async () => {
    const css = `
      .btn-primary { @apply bg-blue-500 text-white; }
      .btn-secondary { @apply bg-gray-200 text-gray-800; }
    `;
    const result = await resolveApplyDirectives(css, 'test.css');
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.name)).toEqual(['btn-primary', 'btn-secondary']);
  });

  it('should ignore non-@apply rules', async () => {
    const css = `
      .custom { color: red; }
      .btn { @apply flex; }
    `;
    const result = await resolveApplyDirectives(css, 'test.css');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('btn');
  });
});
