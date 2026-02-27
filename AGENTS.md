# AGENTS.md - UX Builder Tailwind CSS IntelliSense

## Project Overview

Monorepo for a Chrome extension that provides Tailwind CSS v4 class autocomplete
and validation inside the Flatsome UX Builder (WordPress). Two packages:

- `ux-build-tw-ext/` — Chrome extension (WXT + React + TypeScript)
- `tw-backend/` — Node.js Express server that generates/serves Tailwind class data

Communication: Extension ↔ local HTTP server (`http://localhost:3000`).

## Monorepo Structure

```
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
```

## Build / Dev / Test Commands

### Root (monorepo)
```bash
npm install                        # Install all workspace dependencies
npm run build                      # Build all packages
npm run dev                        # Dev mode all packages (parallel)
npm run lint                       # Lint all packages
npm run lint:fix                   # Lint + autofix
npm run typecheck                  # TypeScript check all packages
```

### Extension (ux-build-tw-ext/)
```bash
npm run dev                        # WXT dev mode (Chrome, hot reload)
npm run dev:firefox                # WXT dev mode (Firefox)
npm run build                      # Production build → .output/chrome-mv3/
npm run build:firefox              # Production build (Firefox)
npm run zip                        # Package for Chrome Web Store
npm run compile                    # TypeScript check (tsc --noEmit)
```

### Backend (tw-backend/)
```bash
npm run dev                        # Start with tsx watch (nodemon-like)
npm run build                      # Compile TS → dist/
npm run start                      # Run compiled server
npm run test                       # Run all Vitest tests
npm run test -- path/to/file.test.ts           # Single test file
npm run test -- -t "test name"                 # Single test by name
npm run test:watch                 # Watch mode
npm run test:coverage              # With coverage
```

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
- Pattern: `describe('Module')` → `it('should X when Y')`
- Prefer real TW processing over mocks
- Snapshot tests for generated class lists

### Git
- Conventional Commits: `feat(ext):`, `fix(backend):`, `chore(shared):`
- Branch: `feat/description`, `fix/description`
- Small, atomic commits
