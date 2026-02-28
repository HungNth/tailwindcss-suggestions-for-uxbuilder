[Tiếng Việt](README.md) | [English](README-en.md)

# Tailwind CSS IntelliSense for Flatsome UX Builder

Chrome extension that provides Tailwind CSS v4 autocomplete inside Flatsome UX Builder (WordPress).

Works **offline** — standard Tailwind classes are bundled inside the extension, no server needed. The backend is only required if you want to use custom CSS classes via `@apply`.

---

## Installation

```bash
npm install
```

---

## Build

### 1. Generate Tailwind class data

Generate the JSON file containing all Tailwind classes (must be run before building the extension):

```bash
npm run build:tw
```

Output: `ux-build-tw-ext/public/data/tailwind-classes.json`

### 2. Build extension

```bash
cd ux-build-tw-ext
npm run build
```

Output: `ux-build-tw-ext/.output/chrome-mv3/`

### 3. Load extension into Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select `ux-build-tw-ext/.output/chrome-mv3/`

---

## Using with Backend (Custom CSS classes)

The backend is only needed if you have a custom CSS file with `@apply` directives.

### Run the backend

```bash
cd tw-backend
npm run dev
```

Server runs at `http://localhost:3456`.

### Configure in the extension popup

1. Click the extension icon while UX Builder is open
2. Enter the path to your CSS file in the **CSS File Path** field
3. Click **Save Configuration**

The extension will automatically pick up custom classes from the backend and show them in autocomplete.

---

## Usage

Open any UX Builder editor page (`?app=uxbuilder&type=editor`), click the **class name** input of any element — autocomplete will appear automatically.
