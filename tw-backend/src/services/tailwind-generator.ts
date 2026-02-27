import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
import type { TailwindClass } from '@ux-builder-tw/shared';

/**
 * Generate the complete list of Tailwind CSS v4 utility classes
 * by compiling a CSS file that uses @import "tailwindcss".
 * Content scanning is configured in postcss.config.js
 */
export async function generateClassList(): Promise<TailwindClass[]> {
  // Read Tailwind CSS v4 config file
  const cssPath = resolve(process.cwd(), 'tailwind.css');
  const inputCSS = await readFile(cssPath, 'utf-8');

  const result = await postcss([tailwindcss]).process(inputCSS, {
    from: cssPath,
  });

  return parseCSSToClasses(result.css);
}

/**
 * Parse compiled CSS output into structured class entries.
 */
function parseCSSToClasses(css: string): TailwindClass[] {
  const classes: TailwindClass[] = [];
  // Regex to extract class-based rules
  const ruleRegex = /\.([a-zA-Z0-9_-][a-zA-Z0-9_:.\-\\/\[\]]*)\s*\{([^}]+)\}/g;

  let match: RegExpExecArray | null;
  while ((match = ruleRegex.exec(css)) !== null) {
    const rawName = match[1];
    const cssBody = match[2].trim();

    // Unescape CSS class names (e.g., `p-4` from `.p-4`)
    const name = unescapeClassName(rawName);
    const category = categorizeClass(name);

    classes.push({ name, css: cssBody, category });
  }

  return deduplicateClasses(classes);
}

function unescapeClassName(raw: string): string {
  // Handle escaped characters in CSS selectors
  return raw.replace(/\\(.)/g, '$1');
}

function categorizeClass(name: string): string {
  // Rough categorization based on prefix patterns
  const categories: Record<string, string[]> = {
    layout: ['flex', 'grid', 'block', 'inline', 'hidden', 'container', 'columns', 'box-'],
    spacing: [
      'p-',
      'px-',
      'py-',
      'pt-',
      'pr-',
      'pb-',
      'pl-',
      'm-',
      'mx-',
      'my-',
      'mt-',
      'mr-',
      'mb-',
      'ml-',
      'space-',
      'gap-',
    ],
    sizing: ['w-', 'h-', 'min-w-', 'min-h-', 'max-w-', 'max-h-', 'size-'],
    typography: [
      'text-',
      'font-',
      'leading-',
      'tracking-',
      'line-clamp-',
      'truncate',
      'uppercase',
      'lowercase',
      'capitalize',
      'italic',
      'underline',
      'line-through',
      'no-underline',
    ],
    backgrounds: ['bg-'],
    borders: ['border', 'rounded', 'ring-', 'outline-', 'divide-'],
    effects: [
      'shadow',
      'opacity-',
      'blur-',
      'brightness-',
      'contrast-',
      'drop-shadow-',
      'grayscale',
      'invert',
      'sepia',
      'backdrop-',
    ],
    transitions: ['transition', 'duration-', 'ease-', 'delay-', 'animate-'],
    transforms: ['scale-', 'rotate-', 'translate-', 'skew-', 'origin-'],
    interactivity: [
      'cursor-',
      'pointer-events-',
      'resize',
      'select-',
      'scroll-',
      'snap-',
      'touch-',
      'will-change-',
    ],
    positioning: [
      'static',
      'fixed',
      'absolute',
      'relative',
      'sticky',
      'inset-',
      'top-',
      'right-',
      'bottom-',
      'left-',
      'z-',
    ],
    overflow: ['overflow-', 'overscroll-'],
    flexbox: [
      'flex-',
      'basis-',
      'grow',
      'shrink',
      'order-',
      'justify-',
      'items-',
      'self-',
      'content-',
      'place-',
    ],
    colors: ['text-', 'bg-', 'border-', 'accent-', 'caret-', 'fill-', 'stroke-'],
  };

  for (const [category, prefixes] of Object.entries(categories)) {
    if (prefixes.some((p) => name.startsWith(p) || name === p.replace(/-$/, ''))) {
      return category;
    }
  }

  return 'other';
}

function deduplicateClasses(classes: TailwindClass[]): TailwindClass[] {
  const seen = new Map<string, TailwindClass>();
  for (const cls of classes) {
    if (!seen.has(cls.name)) {
      seen.set(cls.name, cls);
    }
  }
  return Array.from(seen.values());
}
