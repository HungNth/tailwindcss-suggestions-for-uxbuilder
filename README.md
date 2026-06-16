[Tiếng Việt](README.md) | [English](README-en.md)

<p align="center">
  <img src="./ux-build-tw-ext/public/icon/128.png" width="72" alt="UX Builder Tailwind CSS IntelliSense icon">
</p>

# Tailwind CSS IntelliSense for Flatsome UX Builder

A Chrome extension that provides offline-first Tailwind CSS v4 class autocomplete and validation within the Flatsome UX Builder in WordPress.

> [!NOTE]
> Standard Tailwind classes are pre-bundled during build time. You do not need to run the backend unless you want to resolve custom CSS classes defined via `@apply`.

## Features

- **Tailwind CSS v4 Autocomplete:** Real-time suggestions in the UX Builder **Class name** input field.
- **Offline-First & Zero Latency:** Queries are processed instantly using an in-memory class store.
- **Custom `@apply` Support:** Connects to an optional local backend server to extract custom classes.
- **Clean Configuration UI:** Easy-to-use extension popup for managing backend paths and settings.

## Project Structure

This project is configured as an npm workspace monorepo:

| Path               | Purpose                                                   |
| ------------------ | --------------------------------------------------------- |
| `ux-build-tw-ext/` | Chrome extension built with WXT, React, and TypeScript.   |
| `tw-backend/`      | Optional Express server for resolving custom CSS classes. |
| `packages/shared/` | Shared TypeScript types and constants.                    |
| `scripts/`         | Build scripts for compiling Tailwind class data.          |

## Quick Start

### 1. Installation & Build

Install workspace dependencies and build the extension:

```bash
npm install
npm run build
```

The build command compiles the Tailwind class data into `ux-build-tw-ext/public/data/tailwind-classes.json` and outputs the Chrome extension directory inside `ux-build-tw-ext/dist/chrome-mv3/`.

### 2. Load the Extension in Chrome

1. Open `chrome://extensions/` in your browser.
2. Toggle on **Developer mode** (top right).
3. Click **Load unpacked** (top left).
4. Select the `ux-build-tw-ext/dist/chrome-mv3/` directory.

### 3. Usage

Open any WordPress page in Flatsome UX Builder:

```text
?app=uxbuilder&type=editor
```

Select any element and click its **Class name** field. The autocomplete menu will appear as you type.

---

## Custom Classes Backend (Optional)

If you use custom stylesheets containing `@apply` rules, you can start the backend to stream those classes to the extension.

### 1. Start the Backend Server

```bash
cd tw-backend
npm run dev
```

The server listens on [http://localhost:3456](http://localhost:3456).

### 2. Configure in Extension Popup

1. Click the extension icon in your toolbar when inside the UX Builder.
2. Provide the absolute path to your custom CSS file in the **CSS File Path** input.
3. Click **Save Configuration**.

---

## Development Commands

Run these commands from the root directory:

| Command             | Description                                                         |
| ------------------- | ------------------------------------------------------------------- |
| `npm run dev`       | Starts development mode for all workspaces in parallel.             |
| `npm run build:tw`  | Compiles `tw-backend/tailwind.css` and updates standard class data. |
| `npm run build`     | Compiles Tailwind class data, extension, and backend.               |
| `npm run typecheck` | Runs TypeScript compilation checks across all workspaces.           |
| `npm run lint`      | Lints the codebase with ESLint.                                     |
| `npm run lint:fix`  | Automatically fixes ESLint warnings and errors.                     |
| `npm run format`    | Formats all code, JSON, and markdown files using Prettier.          |

## How It Works

1. **Generation:** `npm run build:tw` runs PostCSS with Tailwind v4 over `tw-backend/tailwind.css` to generate structured class definitions.
2. **Buffering:** On extension startup, the background service worker loads the precompiled JSON class database.
3. **Injection:** The content script detects the UX Builder canvas, hooks into class fields, and displays the autocomplete menu.
4. **Merging:** If active, the background worker fetches dynamic classes from the backend server and merges them into the autocompletion results.
