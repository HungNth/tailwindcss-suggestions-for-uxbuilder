/**
 * Build script: Compile sample.html → CSS → parse → JSON
 * Output: ux-build-tw-ext/public/data/tailwind-classes.json
 *
 * Usage: npx tsx scripts/build-tw-classes.ts
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
import type { TailwindClass } from '@ux-builder-tw/shared';

const __dirname = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));
const BACKEND_DIR = resolve(__dirname, '..', 'tw-backend');
const OUTPUT_DIR = resolve(__dirname, '..', 'ux-build-tw-ext', 'public', 'data');
const OUTPUT_FILE = resolve(OUTPUT_DIR, 'tailwind-classes.json');

async function main(): Promise<void> {
  console.log('[build:tw] Starting Tailwind class generation...');
  const startTime = Date.now();

  // Read the Tailwind CSS entry file
  const cssPath = resolve(BACKEND_DIR, 'tailwind.css');
  const inputCSS = await readFile(cssPath, 'utf-8');

  // Process through PostCSS + Tailwind (scans tw-backend/sample.html via postcss.config.js)
  const result = await postcss([tailwindcss]).process(inputCSS, {
    from: cssPath,
  });

  // Parse CSS output into structured class data
  const classes = parseCSSToClasses(result.css);

  // Ensure output directory exists
  await mkdir(OUTPUT_DIR, { recursive: true });

  // Write JSON file
  const output = {
    version: '4.0',
    generatedAt: new Date().toISOString(),
    totalClasses: classes.length,
    classes,
  };

  await writeFile(OUTPUT_FILE, JSON.stringify(output), 'utf-8');

  const elapsed = Date.now() - startTime;
  console.log(`[build:tw] Generated ${classes.length} classes in ${elapsed}ms`);
  console.log(`[build:tw] Output: ${OUTPUT_FILE}`);
}

/**
 * Parse compiled CSS output into structured class entries.
 * (Same logic as tw-backend/src/services/tailwind-generator.ts)
 */
function parseCSSToClasses(css: string): TailwindClass[] {
  const classes: TailwindClass[] = [];
  const ruleRegex = /\.([a-zA-Z0-9_-][a-zA-Z0-9_:.\-\\/[\]]*)\s*\{([^}]+)\}/g;

  let match: RegExpExecArray | null;
  while ((match = ruleRegex.exec(css)) !== null) {
    const rawName = match[1];
    const cssBody = match[2].trim();
    const name = unescapeClassName(rawName);
    const category = categorizeClass(name);
    classes.push({ name, css: cssBody, category });
  }

  return deduplicateClasses(classes);
}

function unescapeClassName(raw: string): string {
  return raw.replace(/\\(.)/g, '$1');
}

function categorizeClass(name: string): string {
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

main().catch((error) => {
  console.error('[build:tw] Failed:', error);
  process.exit(1);
});
