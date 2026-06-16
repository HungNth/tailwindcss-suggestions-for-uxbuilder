# AGENTS.md - UX Builder Tailwind CSS IntelliSense

## Project Overview

Monorepo for a Chrome extension that provides Tailwind CSS v4 class autocomplete
and validation inside the Flatsome UX Builder (WordPress). Two packages:

- `ux-build-tw-ext/` — Chrome extension (WXT + React + TypeScript)
- `tw-backend/` — Node.js Express server for custom CSS classes only (optional)

**Architecture:** Offline-first. Standard Tailwind classes are bundled as JSON inside
the extension (generated at build time by `npm run build:tw`). The backend server
on `http://localhost:3456` is **optional** — only needed when the user configures a
custom CSS file path for `@apply` class resolution.

## Monorepo Structure

```
ux-builder-tw/                     # Root (npm workspaces)
├── scripts/
│   └── build-tw-classes.ts        # Build script: sample.html → JSON
├── ux-build-tw-ext/               # Chrome Extension (WXT framework)
│   ├── entrypoints/
│   │   ├── background.ts          # Service worker: offline search, optional backend
│   │   ├── content.ts             # Content script: UX Builder detection, autocomplete
│   │   ├── content/               # Content script modules
│   │   └── popup/                 # React popup: settings panel
│   ├── utils/
│   │   ├── class-store.ts         # In-memory search engine (loaded from bundled JSON)
│   │   └── class-parser.ts        # Variant parsing utilities
│   ├── public/data/
│   │   └── tailwind-classes.json  # Generated build artifact (gitignored)
│   ├── wxt.config.ts              # WXT configuration
│   └── package.json
├── tw-backend/                    # Express server (custom classes only)
│   ├── src/
│   │   ├── index.ts               # Entry point
│   │   ├── server.ts              # Express app
│   │   ├── routes/                # REST API: custom-classes, config, status
│   │   └── services/              # CSS watcher, @apply resolver, class store
│   ├── tests/                     # Vitest tests
│   └── package.json
└── packages/shared/               # Shared types & constants
```

## Data Flow

1. **Build time:** `npm run build:tw` compiles `tw-backend/sample.html` through
   PostCSS+Tailwind → parses CSS → writes `ux-build-tw-ext/public/data/tailwind-classes.json`
2. **Extension startup:** Background service worker loads bundled JSON into in-memory
   class store (instant, no network)
3. **Search/validate:** Fully local — queries the in-memory store (zero latency)
4. **Custom classes (optional):** If backend is running, fetches custom `@apply` classes
   from `http://localhost:3456/api/custom-classes` and merges into search results

## Build / Dev / Test Commands

### Root (monorepo)

```bash
npm install                        # Install all workspace dependencies
npm run build:tw                   # Generate tailwind-classes.json from sample.html
npm run build                      # build:tw + build all workspaces
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

### Backend (tw-backend/) — port 3456

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
- host_permissions: `http://localhost:3456/*`
- WXT auto-imports: `defineBackground`, `defineContentScript`, `browser`

### REST API (tw-backend) — port 3456

- Base: `/api/`, JSON responses, CORS for `chrome-extension://`
- 3 endpoints: `/api/custom-classes` (GET), `/api/config` (GET/POST), `/api/status` (GET)
- Standard class search/validate removed — handled offline by extension

### Testing (Vitest)

- Unit tests in `tw-backend/tests/`
- Pattern: `describe('Module')` → `it('should X when Y')`
- Prefer real TW processing over mocks
- Snapshot tests for generated class lists

### Git

- Conventional Commits: `feat(ext):`, `fix(backend):`, `chore(shared):`
- Branch: `feat/description`, `fix/description`
- Small, atomic commits

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **tailwindcss-suggestions-for-uxbuilder** (383 symbols, 967 relationships, 29 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/tailwindcss-suggestions-for-uxbuilder/context` | Codebase overview, check index freshness |
| `gitnexus://repo/tailwindcss-suggestions-for-uxbuilder/clusters` | All functional areas |
| `gitnexus://repo/tailwindcss-suggestions-for-uxbuilder/processes` | All execution flows |
| `gitnexus://repo/tailwindcss-suggestions-for-uxbuilder/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
