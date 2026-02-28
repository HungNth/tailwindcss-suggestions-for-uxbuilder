# Offline Bundled Classes + Backend Simplification Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bundle pre-built Tailwind CSS class data (JSON) directly inside the Chrome extension so it works offline for standard classes, and simplify the backend to only serve custom classes from user CSS files.

**Architecture:** At build time, a root-level script (`npm run build:tw`) uses the existing tw-backend PostCSS + Tailwind pipeline to compile `sample.html` into CSS, parse it into `TailwindClass[]`, and write a JSON file into `ux-build-tw-ext/public/data/tailwind-classes.json`. The extension's background script loads this bundled JSON on startup for standard class search (fully offline). The backend is simplified to only handle custom CSS (`@apply` resolution, file watching) on port 3456. The extension only contacts the backend when the user configures a custom CSS file path.

**Tech Stack:** PostCSS, @tailwindcss/postcss, Tailwind CSS v4, WXT, TypeScript, Express v5

---

## Execution Order

1. Task 1 (shared types) — prerequisite for everything
2. Task 2 (build script) — generates the JSON
3. Task 3 (local class store) — search engine in extension
4. Task 4 (background rewrite) — use local store + optional backend
5. Task 5 (backend simplification) — remove standard class endpoints
6. Task 6 (port fix + AGENTS.md) — fix all port references
7. Task 7 (popup update) — show offline/online UI
8. Task 8 (verification) — full build + test

---

## Phase 1: Update Shared Types

### Task 1: Update shared types for new architecture

**Files:**

- Modify: `packages/shared/src/types.ts` — add `backendOnline` to `ServerStatus`
- Modify: `packages/shared/src/constants.ts` — remove deprecated CLASSES endpoints

**Step 1: Update `ServerStatus` type in `packages/shared/src/types.ts`**

Add `backendOnline` field:

```ts
export interface ServerStatus {
  running: boolean;
  tailwindVersion: string;
  totalClasses: number;
  tailwindClassCount: number;
  totalCustomClasses: number;
  customClassCount: number;
  watchedFile: string | null;
  lastUpdated: string;
  backendOnline?: boolean; // NEW: whether the backend server is reachable
  config: BackendConfig;
}
```

**Step 2: Update `ENDPOINTS` in `packages/shared/src/constants.ts`**

Remove deprecated standard class endpoints:

```ts
export const ENDPOINTS = {
  CUSTOM_CLASSES: '/api/custom-classes',
  STATUS: '/api/status',
  CONFIG: '/api/config',
} as const;
```

**Step 3: Run typecheck to verify**

Run: `npm run typecheck`

**Step 4: Commit**

```
feat(shared): add backendOnline to ServerStatus, remove deprecated class endpoints
```

---

## Phase 2: Build Script & Static JSON Generation

### Task 2: Create the build script to generate tailwind-classes.json

**Files:**

- Create: `scripts/build-tw-classes.ts`
- Modify: root `package.json` — add `build:tw` script, update `build` script
- Modify: root `.gitignore` — add generated JSON to ignore

**Step 1: Create `scripts/build-tw-classes.ts`**

This script reuses the same PostCSS + Tailwind pipeline from `tw-backend/src/services/tailwind-generator.ts` but runs standalone and writes JSON output.

```ts
/**
 * Build script: Compile sample.html → CSS → parse → JSON
 * Output: ux-build-tw-ext/public/data/tailwind-classes.json
 *
 * Usage: npx tsx scripts/build-tw-classes.ts
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
import type { TailwindClass } from '@ux-builder-tw/shared';

const BACKEND_DIR = resolve(import.meta.dirname, '..', 'tw-backend');
const OUTPUT_DIR = resolve(import.meta.dirname, '..', 'ux-build-tw-ext', 'public', 'data');
const OUTPUT_FILE = resolve(OUTPUT_DIR, 'tailwind-classes.json');

async function main(): Promise<void> {
  console.log('[build:tw] Starting Tailwind class generation...');
  const startTime = Date.now();

  // Read the Tailwind CSS entry file
  const cssPath = resolve(BACKEND_DIR, 'tailwind.css');
  const inputCSS = await readFile(cssPath, 'utf-8');

  // Process through PostCSS + Tailwind (uses tw-backend/postcss.config.js)
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
  const ruleRegex = /\.([a-zA-Z0-9_-][a-zA-Z0-9_:.\-\\/\[\]]*)\s*\{([^}]+)\}/g;

  let match: RegExpExecArray | null;
  while ((match = ruleRegex.exec(css)) !== null) {
    const rawName = match[1];
    const cssBody = match[2].trim();
    const name = rawName.replace(/\\(.)/g, '$1');
    const category = categorizeClass(name);
    classes.push({ name, css: cssBody, category });
  }

  // Deduplicate
  const seen = new Map<string, TailwindClass>();
  for (const cls of classes) {
    if (!seen.has(cls.name)) {
      seen.set(cls.name, cls);
    }
  }
  return Array.from(seen.values());
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

main().catch((error) => {
  console.error('[build:tw] Failed:', error);
  process.exit(1);
});
```

**Step 2: Update root `package.json` scripts**

Add `build:tw` and update `build`:

```json
{
  "scripts": {
    "build:tw": "tsx scripts/build-tw-classes.ts",
    "build": "npm run build:tw && npm run build --workspaces"
  }
}
```

**Step 3: Add to `.gitignore`**

Add to root `.gitignore`:

```
# Generated Tailwind class data (build artifact)
ux-build-tw-ext/public/data/tailwind-classes.json
```

**Step 4: Run the build script and verify**

Run: `npm run build:tw`
Expected: `ux-build-tw-ext/public/data/tailwind-classes.json` created with 3000+ classes.

**Step 5: Commit**

```
feat: add build:tw script to generate bundled Tailwind class JSON
```

---

## Phase 3: Extension — Offline Class Store

### Task 3: Create local class store for the extension

**Files:**

- Create: `ux-build-tw-ext/utils/class-store.ts`

This is a lightweight in-memory search engine that mirrors `tw-backend/src/services/class-store.ts` logic, running entirely in the extension's background service worker.

```ts
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
```

**Step 1: Commit**

```
feat(ext): add local class store for offline search
```

---

### Task 4: Rewrite background.ts to use bundled data + optional backend

**Files:**

- Modify: `ux-build-tw-ext/entrypoints/background.ts`

**Key architectural changes:**

1. On startup: loads `tailwind-classes.json` from `browser.runtime.getURL('data/tailwind-classes.json')` into the local class store
2. `searchClasses`: searches the local store (offline, zero network) — combines standard + custom results
3. `validateClasses`: validates against the local store (offline)
4. `getCustomClasses`: fetches from backend (only if backend is reachable)
5. `getStatus`: returns local stats + backend connection status
6. `updateConfig`: sends config to backend, then fetches updated custom classes
7. Removes `searchCache` and `validationCache` (search is now local, instant)

```ts
import type {
  ExtensionMessage,
  SearchClassesRequest,
  SearchClassesResponse,
  ValidateClassesRequest,
  ValidateClassesResponse,
  GetCustomClassesRequest,
  GetCustomClassesResponse,
  GetStatusRequest,
  GetStatusResponse,
  UpdateConfigRequest,
  UpdateConfigResponse,
  ApiResponse,
  TailwindClass,
  CustomClass,
  BackendConfig,
} from '@ux-builder-tw/shared';
import { BACKEND_URL, CACHE_TTL_MS } from '@ux-builder-tw/shared';
import {
  setStandardClasses,
  setCustomClasses,
  searchClasses,
  searchCustom,
  validateClass,
  getCustomClasses,
  getStats,
} from '~/utils/class-store';

export default defineBackground(() => {
  console.log('[UX Builder TW] Background service worker started');

  loadBundledClasses();
  browser.runtime.onMessage.addListener(handleMessage);
  checkBackendStatus();
});

let backendOnline = false;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
let customClassesCache: CacheEntry<CustomClass[]> | null = null;

async function loadBundledClasses(): Promise<void> {
  try {
    const url = browser.runtime.getURL('data/tailwind-classes.json');
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load bundled classes: ${response.status}`);
    }
    const data: { version: string; totalClasses: number; classes: TailwindClass[] } =
      await response.json();
    setStandardClasses(data.classes);
    console.log(`[UX Builder TW] Loaded ${data.totalClasses} bundled classes (v${data.version})`);
  } catch (error) {
    console.error('[UX Builder TW] Failed to load bundled classes:', error);
  }
}

function handleMessage(
  message: ExtensionMessage,
  _sender: unknown,
  sendResponse: (response: ExtensionMessage) => void
): boolean {
  (async () => {
    let response: ExtensionMessage;
    switch (message.action) {
      case 'searchClasses':
        response = handleSearchClasses(message as SearchClassesRequest);
        break;
      case 'validateClasses':
        response = handleValidateClasses(message as ValidateClassesRequest);
        break;
      case 'getCustomClasses':
        response = await handleGetCustomClasses(message as GetCustomClassesRequest);
        break;
      case 'getStatus':
        response = await handleGetStatus(message as GetStatusRequest);
        break;
      case 'updateConfig':
        response = await handleUpdateConfig(message as UpdateConfigRequest);
        break;
      default:
        response = {
          action: 'error',
          error: 'Unknown action',
          message: `Action "${(message as ExtensionMessage).action}" is not supported`,
        } as ExtensionMessage;
    }
    sendResponse(response);
  })();
  return true;
}

// SYNC — no network, instant search
function handleSearchClasses(request: SearchClassesRequest): SearchClassesResponse {
  const { query, limit = 50, offset = 0 } = request;
  const standardResults = searchClasses(query, limit, offset);
  const customResults = searchCustom(query, limit);
  const combined = [...standardResults, ...customResults].slice(0, limit);
  return { action: 'searchClasses', data: combined };
}

// SYNC — no network, instant validation
function handleValidateClasses(request: ValidateClassesRequest): ValidateClassesResponse {
  const { classNames } = request;
  const results = classNames.map((className: string) => ({
    className,
    valid: validateClass(className),
  }));
  return { action: 'validateClasses', data: results };
}

// ASYNC — fetches from backend if available
async function handleGetCustomClasses(
  _request: GetCustomClassesRequest
): Promise<GetCustomClassesResponse> {
  if (customClassesCache && Date.now() - customClassesCache.timestamp < CACHE_TTL_MS) {
    return { action: 'getCustomClasses', data: customClassesCache.data };
  }
  if (!backendOnline) {
    return { action: 'getCustomClasses', data: getCustomClasses() };
  }
  try {
    const url = `${BACKEND_URL}/api/custom-classes`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const apiResponse: ApiResponse<CustomClass[]> = await response.json();
    if ('error' in apiResponse) {
      return { action: 'getCustomClasses', error: apiResponse.error, message: apiResponse.message };
    }
    setCustomClasses(apiResponse.data);
    customClassesCache = { data: apiResponse.data, timestamp: Date.now() };
    return { action: 'getCustomClasses', data: apiResponse.data };
  } catch (error) {
    console.error('[UX Builder TW] Get custom classes failed:', error);
    return { action: 'getCustomClasses', data: getCustomClasses() };
  }
}

async function handleGetStatus(_request: GetStatusRequest): Promise<GetStatusResponse> {
  const stats = getStats();
  let backendInfo = {
    running: false,
    watchedFile: null as string | null,
    totalCustom: stats.totalCustom,
  };

  try {
    const response = await fetch(`${BACKEND_URL}/api/status`);
    if (response.ok) {
      const apiResponse = await response.json();
      if ('data' in apiResponse) {
        backendOnline = true;
        backendInfo = {
          running: true,
          watchedFile: apiResponse.data.watchedFile,
          totalCustom: apiResponse.data.totalCustomClasses || stats.totalCustom,
        };
      }
    }
  } catch {
    backendOnline = false;
  }

  return {
    action: 'getStatus',
    data: {
      running: true,
      tailwindVersion: '4.0',
      totalClasses: stats.totalStandard,
      tailwindClassCount: stats.totalStandard,
      totalCustomClasses: backendInfo.totalCustom,
      customClassCount: backendInfo.totalCustom,
      watchedFile: backendInfo.watchedFile,
      lastUpdated: new Date().toISOString(),
      backendOnline: backendInfo.running,
      config: {},
    },
  };
}

async function handleUpdateConfig(request: UpdateConfigRequest): Promise<UpdateConfigResponse> {
  const { config } = request;
  try {
    const response = await fetch(`${BACKEND_URL}/api/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const apiResponse: ApiResponse<BackendConfig> = await response.json();
    if ('error' in apiResponse) {
      return { action: 'updateConfig', error: apiResponse.error, message: apiResponse.message };
    }
    customClassesCache = null;
    backendOnline = true;
    await handleGetCustomClasses({ action: 'getCustomClasses' });
    return { action: 'updateConfig', data: apiResponse.data };
  } catch (error) {
    return {
      action: 'updateConfig',
      error: 'NETWORK_ERROR',
      message: `Failed to connect to backend at ${BACKEND_URL}. Make sure the backend server is running.`,
    };
  }
}

async function checkBackendStatus(): Promise<void> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/status`);
    if (response.ok) {
      backendOnline = true;
      console.log('[UX Builder TW] Backend is online');
      await handleGetCustomClasses({ action: 'getCustomClasses' });
    } else {
      backendOnline = false;
      console.log('[UX Builder TW] Backend offline (extension works offline)');
    }
  } catch {
    backendOnline = false;
    console.log('[UX Builder TW] Backend unreachable (extension works offline)');
  }
}
```

**Step 1: Run extension build**

Run: `npm run build` (from root)
Expected: Build succeeds, `.output/chrome-mv3/` includes `data/tailwind-classes.json`.

**Step 2: Commit**

```
feat(ext): rewrite background to use bundled classes with offline support

Standard class search is now instant (no network). Backend is only
needed for custom CSS classes via @apply resolution.
```

---

## Phase 4: Simplify Backend

### Task 5: Remove standard class endpoints from backend

**Files:**

- Modify: `tw-backend/src/index.ts` — remove `generateClassList()` startup call
- Modify: `tw-backend/src/server.ts` — remove `/api/classes` route
- Delete: `tw-backend/src/routes/classes.ts` — no longer needed
- Modify: `tw-backend/src/services/class-store.ts` — remove standard class methods
- Modify: `tw-backend/src/routes/status.ts` — simplify status response
- Update: `tw-backend/tests/` — remove/update tests for deleted functionality

**Step 1: Simplify `tw-backend/src/index.ts`**

Remove `generateClassList()` import and startup call:

```ts
import { createApp } from './server.js';
import { ClassStore } from './services/class-store.js';

const PORT = typeof process.env.PORT === 'string' ? parseInt(process.env.PORT, 10) : 3456;

async function main(): Promise<void> {
  const store = new ClassStore();
  const app = createApp();
  app.locals.store = store;

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[tw-backend] Custom class server running on http://localhost:${PORT}`);
    console.log(`[tw-backend] Endpoints: /api/custom-classes, /api/config, /api/status`);
  });
}

main().catch((error) => {
  console.error('[tw-backend] Failed to start:', error);
  process.exit(1);
});
```

**Step 2: Simplify `tw-backend/src/server.ts`**

Remove `classesRouter` import and route mounting. Keep only:

- `/api/custom-classes`
- `/api/config`
- `/api/status`

**Step 3: Delete `tw-backend/src/routes/classes.ts`**

This file is no longer needed — standard class search/validate is handled offline in the extension.

**Step 4: Simplify `tw-backend/src/services/class-store.ts`**

Remove `classes`, `setClasses()`, `search()`, `validate()`, `validateMany()`. Keep only custom class storage.

**Step 5: Update `tw-backend/src/routes/status.ts`**

Remove `totalClasses` / `tailwindClassCount` from response. Report only custom class count and watched file.

**Step 6: Update tests**

- Remove or update `tailwind-generator.test.ts` (generator is now only used by build script, not backend)
- Update `class-store.test.ts` to only test custom class methods
- Keep `apply-resolver.test.ts` as-is

**Step 7: Run tests**

Run: `npm run test --workspace=tw-backend`
Expected: All remaining tests pass.

**Step 8: Commit**

```
refactor(backend): simplify to custom-class-only server

BREAKING: Removed /api/classes/search and /api/classes/validate endpoints.
Standard class search is now handled offline by the extension.
```

---

## Phase 5: Fix Port Mismatch & Update Knowledge

### Task 6: Fix port 3000 → 3456 everywhere

**Files:**

- Modify: `ux-build-tw-ext/wxt.config.ts` — change `host_permissions` from `localhost:3000` to `localhost:3456`
- Modify: `ux-build-tw-ext/entrypoints/popup/App.tsx` — fix hardcoded `localhost:3000` in error message
- Modify: `AGENTS.md` — update port references and architecture description

**Step 1: Fix `wxt.config.ts` host_permissions**

Change `http://localhost:3000/*` to `http://localhost:3456/*`.

**Step 2: Fix popup error message in `App.tsx`**

Replace hardcoded `http://localhost:3000` with `http://localhost:3456`.

**Step 3: Update `AGENTS.md`**

Key updates:

- Port is 3456 (not 3000)
- Extension works offline for standard classes (bundled JSON)
- Backend only serves custom CSS classes (optional)
- `npm run build:tw` generates the bundled JSON
- Simplified backend has 3 endpoints: `/api/custom-classes`, `/api/config`, `/api/status`
- New data flow description

**Step 4: Commit**

```
fix: update port references to 3456 and update AGENTS.md
```

---

## Phase 6: Update Popup UI

### Task 7: Update popup to show offline/online status

**Files:**

- Modify: `ux-build-tw-ext/entrypoints/popup/App.tsx`

**Key UI changes:**

1. Show "Bundled Classes: X" (always available, from local store)
2. Show "Backend: Online/Offline" (separate from main status)
3. Show "Custom Classes: X" (from backend, if connected)
4. Replace big error banner (when backend is offline) with info message: "Running in offline mode. Standard Tailwind classes are available. Start the backend server to use custom CSS classes."
5. Only show CSS config section when backend is online
6. The `getStatus` response now includes `backendOnline` field — use it

**Step 1: Update App.tsx**

- Use `backendOnline` from status response
- Show different UI states for offline vs online
- Keep config form but disable/show message when backend offline

**Step 2: Commit**

```
feat(ext): update popup to show offline/online mode status
```

---

## Phase 7: Verify & Build

### Task 8: Full build verification

**Step 1: Run type check**

Run: `npm run typecheck`
Expected: All workspaces pass.

**Step 2: Run linter**

Run: `npm run lint`
Expected: No errors.

**Step 3: Run backend tests**

Run: `npm run test --workspace=tw-backend`
Expected: All remaining tests pass.

**Step 4: Full build**

Run: `npm run build`
Expected:

1. `build:tw` generates `ux-build-tw-ext/public/data/tailwind-classes.json` (3000+ classes)
2. `tw-backend` compiles to `dist/`
3. `ux-build-tw-ext` builds to `.output/chrome-mv3/` with `data/tailwind-classes.json` included

**Step 5: Verify extension output**

Check: `ux-build-tw-ext/.output/chrome-mv3/data/tailwind-classes.json` exists
Check: `ux-build-tw-ext/.output/chrome-mv3/manifest.json` has `host_permissions: ["http://localhost:3456/*"]`

**Step 6: Commit (if any final fixes needed)**

```
chore: final build verification and fixes
```

---

## Summary of Changes

| Area                          | Before                                     | After                                          |
| ----------------------------- | ------------------------------------------ | ---------------------------------------------- |
| **Standard class search**     | Backend HTTP API (requires running server) | Bundled JSON in extension (offline)            |
| **Custom class search**       | Backend HTTP API                           | Backend HTTP API (unchanged)                   |
| **Backend port**              | 3456 (but manifest said 3000)              | 3456 everywhere                                |
| **Backend startup**           | Generates 3000+ classes on start           | Starts immediately (no generation)             |
| **Extension without backend** | Completely broken (no search)              | Fully functional for standard classes          |
| **Build process**             | `npm run build`                            | `npm run build:tw` → `npm run build` (chained) |
| **Backend endpoints**         | 5 endpoints                                | 3 endpoints (config, custom-classes, status)   |

## Files Created

- `scripts/build-tw-classes.ts` — root-level build script
- `ux-build-tw-ext/utils/class-store.ts` — local class store
- `ux-build-tw-ext/public/data/tailwind-classes.json` — generated build artifact (gitignored)

## Files Modified

- `package.json` (root) — add `build:tw` script
- `.gitignore` (root) — ignore generated JSON
- `packages/shared/src/types.ts` — add `backendOnline` to `ServerStatus`
- `packages/shared/src/constants.ts` — remove deprecated endpoints
- `ux-build-tw-ext/entrypoints/background.ts` — full rewrite (offline + optional backend)
- `ux-build-tw-ext/entrypoints/popup/App.tsx` — offline/online UI
- `ux-build-tw-ext/wxt.config.ts` — fix port to 3456
- `tw-backend/src/index.ts` — simplify (no class generation)
- `tw-backend/src/server.ts` — remove `/api/classes` route
- `tw-backend/src/services/class-store.ts` — simplify to custom-only
- `tw-backend/src/routes/status.ts` — simplify status
- `tw-backend/tests/*` — update for simplified backend
- `AGENTS.md` — update architecture and port

## Files Deleted

- `tw-backend/src/routes/classes.ts` — no longer needed
