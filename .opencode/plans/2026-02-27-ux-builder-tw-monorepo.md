# UX Builder Tailwind CSS IntelliSense — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a monorepo with a Chrome extension providing Tailwind CSS v4 autocomplete/validation in Flatsome UX Builder, backed by a local Express server that generates class data and watches custom CSS files.

**Architecture:** Extension content script detects UX Builder pages via URL params, injects autocomplete dropdown into `.ng-pristine` inputs. Background script relays requests to a local Express server that serves pre-built Tailwind v4 utility class lists and resolves custom `@apply`-based classes from a user-configured CSS file.

**Tech Stack:** WXT (Chrome extension framework), React, TypeScript, Express, Tailwind CSS v4 (programmatic API), PostCSS, chokidar, Vitest, npm workspaces.

---

## AGENTS.md Content (Create at repo root: `/AGENTS.md`)

Write approximately 150 lines to `/AGENTS.md` with this content:

```markdown
# AGENTS.md - UX Builder Tailwind CSS IntelliSense

## Project Overview

Monorepo for a Chrome extension that provides Tailwind CSS v4 class autocomplete
and validation inside the Flatsome UX Builder (WordPress). Two packages:

- `ux-build-tw-ext/` — Chrome extension (WXT + React + TypeScript)
- `tw-backend/` — Node.js Express server that generates/serves Tailwind class data

Communication: Extension <-> local HTTP server (`http://localhost:3000`).

## Monorepo Structure

ux-builder-tw/                     # Root (npm workspaces)
├── ux-build-tw-ext/               # Chrome Extension (WXT framework)
│   ├── entrypoints/
│   │   ├── background.ts          # Service worker: message relay, caching
│   │   ├── content.ts             # Content script: UX Builder detection, autocomplete
│   │   ├── content/               # Content script modules
│   │   └── popup/                 # React popup: settings panel
│   ├── utils/                     # Extension utilities
│   ├── wxt.config.ts              # WXT configuration
│   └── package.json
├── tw-backend/                    # Express server
│   ├── src/
│   │   ├── index.ts               # Entry point
│   │   ├── server.ts              # Express app
│   │   ├── routes/                # REST API endpoints
│   │   └── services/              # TW class generator, CSS watcher, @apply resolver
│   ├── tests/                     # Vitest tests
│   └── package.json
└── packages/shared/               # Shared types & constants

## Build / Dev / Test Commands

### Root (monorepo)
    npm install                        # Install all workspace dependencies
    npm run build                      # Build all packages
    npm run dev                        # Dev mode all packages (parallel)
    npm run lint                       # Lint all packages
    npm run lint:fix                   # Lint + autofix
    npm run typecheck                  # TypeScript check all packages

### Extension (ux-build-tw-ext/)
    npm run dev                        # WXT dev mode (Chrome, hot reload)
    npm run dev:firefox                # WXT dev mode (Firefox)
    npm run build                      # Production build -> .output/chrome-mv3/
    npm run build:firefox              # Production build (Firefox)
    npm run zip                        # Package for Chrome Web Store
    npm run compile                    # TypeScript check (tsc --noEmit)

### Backend (tw-backend/)
    npm run dev                        # Start with tsx watch (nodemon-like)
    npm run build                      # Compile TS -> dist/
    npm run start                      # Run compiled server
    npm run test                       # Run all Vitest tests
    npm run test -- path/to/file.test.ts           # Single test file
    npm run test -- -t "test name"                 # Single test by name
    npm run test:watch                 # Watch mode
    npm run test:coverage              # With coverage

## Code Style Guidelines

### TypeScript
- Strict mode — no `any` (use `unknown` + type guards)
- Functional patterns — no classes (exception: ClassStore for stateful pattern)
- Explicit return types on exports; inferred OK internally
- Interface for object shapes; type for unions/intersections
- No enums — use `as const` objects + union literal types

### Imports (order)
1. Node built-ins (`node:fs/promises`)
2. External packages (`express`, `chokidar`)
3. Internal packages (`@ux-builder-tw/shared`)
4. Relative imports (`../services/...`)
- Use `import type` for type-only imports
- Named imports preferred; no barrel files

### Naming
- Files: `kebab-case.ts`
- Variables/functions: `camelCase`
- Types/Interfaces: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- React components: `PascalCase.tsx`
- Tests: `<module>.test.ts`

### Formatting (Prettier)
- 2 spaces, single quotes, trailing commas (ES5), semicolons, print width 100

### Error Handling
- Never swallow errors — log or re-throw
- Content scripts: catch + console.warn, never crash UX Builder
- API responses: `{ data: T }` or `{ error: string, message: string }`
- Use Result pattern or typed errors in backend services

### Chrome Extension Rules
- Content matches: `*://*/wp-admin/post.php*`
- Detect UX Builder: `app=uxbuilder&type=editor` in URL params
- Target: `input.ng-pristine` in `ux-option.option-name-class`
- Shadow DOM for injected UI (style isolation)
- Angular compat: dispatch `input` + `change` events after `.value` mutation
- Permissions: minimal (`activeTab`, `storage`)
- WXT auto-imports: `defineBackground`, `defineContentScript`, `browser`

### REST API (tw-backend)
- Base: `/api/`, JSON responses, CORS for `chrome-extension://`
- GET for reads, POST for mutations
- Query params: `?q=term&limit=50&offset=0`

### Testing (Vitest)
- Unit tests in `tw-backend/tests/`
- Pattern: `describe('Module')` -> `it('should X when Y')`
- Prefer real TW processing over mocks
- Snapshot tests for generated class lists

### Git
- Conventional Commits: `feat(ext):`, `fix(backend):`, `chore(shared):`
- Branch: `feat/description`, `fix/description`
- Small, atomic commits
```

---

## Phase 1: Monorepo Setup (Tasks 1-6)

### Task 1: Initialize git repository

**Files:** Create `.gitignore`

**Step 1: Initialize git**
```bash
git init
```

**Step 2: Create root .gitignore**
```
node_modules/
dist/
.output/
.wxt/
*.log
.DS_Store
.env
.env.local
stats.html
stats-*.json
web-ext.config.ts
```

**Step 3: Commit**
```bash
git add .gitignore && git commit -m "chore: initialize git repository"
```

### Task 2: Create root package.json with npm workspaces

**Files:** Create `package.json`

```json
{
  "name": "ux-builder-tw",
  "private": true,
  "version": "1.0.0",
  "description": "Tailwind CSS IntelliSense for Flatsome UX Builder",
  "workspaces": ["ux-build-tw-ext", "tw-backend", "packages/*"],
  "scripts": {
    "dev": "npm run dev --workspaces --if-present",
    "build": "npm run build --workspaces --if-present",
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "typecheck": "npm run compile --workspaces --if-present",
    "format": "prettier --write \"**/*.{ts,tsx,json,md}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,json,md}\""
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint": "^9.0.0",
    "prettier": "^3.4.0",
    "typescript": "^5.9.0"
  },
  "engines": { "node": ">=20.0.0" }
}
```

**Step 1: Commit**
```bash
git add package.json && git commit -m "chore: add root package.json with npm workspaces"
```

### Task 3: Create shared TypeScript base config

**Files:** Create `tsconfig.base.json`

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "noEmit": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "strict": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

### Task 4: Create Prettier and ESLint configs

**Files:** Create `.prettierrc`, `eslint.config.mjs`

**.prettierrc:**
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "printWidth": 100,
  "useTabs": false
}
```

### Task 5: Create AGENTS.md

Write the AGENTS.md content from the section above to `/AGENTS.md`.

### Task 6: Create shared package

**Files:**
- `packages/shared/package.json`
- `packages/shared/tsconfig.json`
- `packages/shared/src/types.ts` — TailwindClass, CustomClass, ApiResponse, MessageType, etc.
- `packages/shared/src/constants.ts` — URLs, selectors, cache TTL, debounce settings
- `packages/shared/src/index.ts` — re-exports

---

## Phase 2: tw-backend — Express Server (Tasks 7-12)

### Task 7: Initialize tw-backend package

**Files:** `tw-backend/package.json`, `tw-backend/tsconfig.json`

Dependencies: express, cors, chokidar, postcss, tailwindcss (v4), @ux-builder-tw/shared
Dev deps: @types/express, @types/cors, tsx, vitest

### Task 8: Implement Tailwind CSS v4 class generator service

**Files:**
- Create: `tw-backend/src/services/tailwind-generator.ts`
- Create: `tw-backend/tests/tailwind-generator.test.ts`

Use TW v4 programmatic API / PostCSS plugin to compile `@import "tailwindcss"` and parse
the output CSS to extract class-to-CSS mappings. Categorize classes by prefix.

Key function: `generateClassList(): Promise<TailwindClass[]>`

### Task 9: Implement @apply resolver service

**Files:**
- Create: `tw-backend/src/services/apply-resolver.ts`
- Create: `tw-backend/tests/apply-resolver.test.ts`

Use PostCSS to parse CSS files, walk rules, extract @apply at-rules,
return CustomClass[] with name, appliedUtilities, resolved CSS.

Key function: `resolveApplyDirectives(css: string, sourceFile: string): Promise<CustomClass[]>`

### Task 10: Implement class store (in-memory search)

**Files:**
- Create: `tw-backend/src/services/class-store.ts`
- Create: `tw-backend/tests/class-store.test.ts`

ClassStore with: setClasses(), setCustomClasses(), search(query, limit), validate(className),
validateMany(classNames[]), getStats(). Prefix search prioritized over substring.

### Task 11: Implement CSS file watcher

**Files:** Create `tw-backend/src/services/css-watcher.ts`

Use chokidar to watch a user-configured CSS file path. On change, re-parse with
apply-resolver and update the ClassStore's custom classes.

Functions: startWatching(filePath, callbacks), stopWatching(), getWatchedFile()

### Task 12: Implement Express server and routes

**Files:**
- `tw-backend/src/server.ts` — Express app with CORS, JSON body parsing
- `tw-backend/src/routes/classes.ts` — GET /api/classes/search?q=&limit=
- `tw-backend/src/routes/custom-classes.ts` — GET /api/custom-classes
- `tw-backend/src/routes/status.ts` — GET /api/status
- `tw-backend/src/routes/config.ts` — POST /api/config (set watched CSS file)
- `tw-backend/src/index.ts` — entry point, startup: generate classes -> start server

---

## Phase 3: ux-build-tw-ext — Chrome Extension (Tasks 13-18)

### Task 13: Update extension configuration

**Modify:** `wxt.config.ts` — set name, description, permissions, host_permissions
**Modify:** `package.json` — rename to @ux-build-tw-ext/extension

### Task 14: Implement UX Builder detection

**Create:** `entrypoints/content/detector.ts`
- isUxBuilderPage() — check URL params for app=uxbuilder&type=editor
- findClassInputs() — querySelector for .ng-pristine inputs within ux-option.option-name-class
- observeClassInputs(callback) — MutationObserver for dynamically added inputs

### Task 15: Implement autocomplete dropdown UI

**Create:** `entrypoints/content/autocomplete.ts`
- Shadow DOM isolated dropdown (prevents style conflicts with UX Builder)
- Show class name + CSS preview
- Keyboard navigation: ArrowUp/Down, Enter/Tab to select, Escape to close
- Click to select
- Position anchored below the input element
- Dark theme matching developer tooling aesthetic

### Task 16: Implement input handler + content script main

**Create:** `utils/class-parser.ts`
- getCurrentWord(value, cursorPos) — extract word being typed
- replaceCurrentWord(value, cursorPos, newWord) — replace current word with selected class

**Modify:** `entrypoints/content.ts`
- Match: `*://*/wp-admin/post.php*`, runAt: 'document_end'
- Check isUxBuilderPage(), exit early if not
- Attach input handlers to found class inputs
- Debounce input events (150ms)
- Send search messages to background via browser.runtime.sendMessage
- On autocomplete select: update input value + dispatch input/change events (Angular compat)

### Task 17: Implement background script

**Modify:** `entrypoints/background.ts`
- Listen for messages: SEARCH_CLASSES, VALIDATE_CLASSES, GET_STATUS
- Fetch from tw-backend REST API
- Read backendUrl from chrome.storage.local (default: http://localhost:3000)
- Cache class data with TTL

### Task 18: Implement popup settings panel

**Modify:** `entrypoints/popup/App.tsx`, `style.css`, `index.html`
- Backend URL input field
- Connection status indicator (green/red)
- Enable/disable toggle
- CSS file path input (sends POST /api/config to backend)
- Class count display
- Save settings to chrome.storage.local

---

## Phase 4: Integration & Testing (Tasks 19-21)

### Task 19: Install deps and verify builds
```bash
npm install && npm run build
```

### Task 20: Manual integration test
1. Start backend: `cd tw-backend && npm run dev`
2. Load extension: chrome://extensions/ -> Load unpacked -> .output/chrome-mv3/
3. Open WordPress + Flatsome UX Builder
4. Type in class input -> verify autocomplete
5. Select class -> verify insertion + Angular events

### Task 21: Add class validation visual indicator
- On blur, validate each class in the input against known list
- Mark invalid classes with red dotted underline via injected styles

---

## MVP Scope Summary

**Included:** tw-backend (TW v4 classes + @apply + CSS watcher), extension (autocomplete + validation + settings popup), shared types, monorepo setup

**Deferred:** variant suggestions, color swatches, CSS conflict detection, class sorting, full fuzzy matching, Chrome Web Store publishing
