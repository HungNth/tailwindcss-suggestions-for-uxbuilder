/**
 * Utility functions for parsing and manipulating Tailwind class names in input fields
 */

/**
 * Known Tailwind CSS v4 variant prefixes.
 * Used to detect and strip variant prefixes from class names during autocomplete.
 */
const KNOWN_VARIANTS = new Set([
  // State variants
  'hover',
  'focus',
  'active',
  'visited',
  'focus-within',
  'focus-visible',
  'disabled',
  'enabled',
  'checked',
  'indeterminate',
  'default',
  'required',
  'valid',
  'invalid',
  'in-range',
  'out-of-range',
  'placeholder-shown',
  'autofill',
  'read-only',

  // Pseudo-element variants
  'before',
  'after',
  'placeholder',
  'file',
  'marker',
  'selection',
  'first-line',
  'first-letter',
  'backdrop',

  // Responsive variants
  'sm',
  'md',
  'lg',
  'xl',
  '2xl',

  // Dark mode
  'dark',

  // Group/peer variants
  'group-hover',
  'group-focus',
  'group-active',
  'group-visited',
  'peer-hover',
  'peer-focus',
  'peer-checked',
  'peer-disabled',

  // Child variants
  'first',
  'last',
  'only',
  'odd',
  'even',
  'first-of-type',
  'last-of-type',
  'only-of-type',
  'empty',

  // Media variants
  'motion-safe',
  'motion-reduce',
  'contrast-more',
  'contrast-less',
  'portrait',
  'landscape',
  'print',

  // Misc
  'open',
  'closed',
  'ltr',
  'rtl',
]);

export interface VariantParseResult {
  /** The variant prefix string including trailing colons (e.g. "hover:focus:") */
  variants: string;
  /** The utility class part after all variant prefixes (e.g. "bg-blue") */
  utility: string;
}

/**
 * Parse variant prefixes from a Tailwind class word.
 *
 * Examples:
 *   "hover:bg-blue"       → { variants: "hover:", utility: "bg-blue" }
 *   "sm:hover:text-"      → { variants: "sm:hover:", utility: "text-" }
 *   "bg-blue-500"         → { variants: "", utility: "bg-blue-500" }
 *   "hover:"              → { variants: "hover:", utility: "" }
 *   "hover:focus:"        → { variants: "hover:focus:", utility: "" }
 */
export function parseVariantPrefix(word: string): VariantParseResult {
  if (!word.includes(':')) {
    return { variants: '', utility: word };
  }

  const parts = word.split(':');
  let variantEnd = 0;

  // Walk from the left: each part that is a known variant gets consumed
  for (let i = 0; i < parts.length - 1; i++) {
    if (KNOWN_VARIANTS.has(parts[i])) {
      variantEnd = i + 1;
    } else {
      // Stop at the first non-variant segment
      break;
    }
  }

  if (variantEnd === 0) {
    return { variants: '', utility: word };
  }

  const variantParts = parts.slice(0, variantEnd);
  const utilityParts = parts.slice(variantEnd);

  return {
    variants: variantParts.join(':') + ':',
    utility: utilityParts.join(':'),
  };
}

export interface WordPosition {
  word: string;
  start: number;
  end: number;
}

/**
 * Type for input elements that support text manipulation
 */
export type TextInputElement = HTMLInputElement | HTMLTextAreaElement;

/**
 * Get the current word at the cursor position in an input/textarea element
 * Classes are space-separated, so we find the word boundaries
 */
export function getCurrentWord(input: TextInputElement): WordPosition | null {
  const value = input.value;
  const cursorPos = input.selectionStart ?? value.length;

  // Empty input
  if (value.length === 0) {
    return { word: '', start: 0, end: 0 };
  }

  // Find word boundaries (space-separated)
  let start = cursorPos;
  let end = cursorPos;

  // Move start backward to find word start (or beginning of string)
  while (start > 0 && value[start - 1] !== ' ') {
    start--;
  }

  // Move end forward to find word end (or end of string)
  while (end < value.length && value[end] !== ' ') {
    end++;
  }

  const word = value.substring(start, end);

  return { word, start, end };
}

/**
 * Replace the current word at cursor position with a new class name.
 * Always appends a trailing space so the user can immediately type the next class.
 * Preserves other classes and maintains proper spacing.
 */
export function replaceCurrentWord(
  input: TextInputElement,
  newWord: string,
  wordPosition: WordPosition
): void {
  const value = input.value;
  const { start, end } = wordPosition;

  // Build new value
  const before = value.substring(0, start);
  const after = value.substring(end);

  // Always place a space after the inserted word so the user can type the next class.
  // - `before` already ends with a space (or is empty), so no prefix space needed.
  // - Strip any leading spaces from `after` to avoid double-spacing.
  const afterTrimmed = after.trimStart();
  const newValue = before + newWord + ' ' + afterTrimmed;

  // Cursor sits right after the inserted word + the trailing space
  const newCursorPos = before.length + newWord.length + 1;

  // Update input value
  input.value = newValue;

  // Set cursor position after the replaced word
  input.setSelectionRange(newCursorPos, newCursorPos);

  // Dispatch events for Angular compatibility
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Get all class names from the input value
 */
export function getAllClasses(input: TextInputElement): string[] {
  return input.value
    .split(' ')
    .map((cls) => cls.trim())
    .filter((cls) => cls.length > 0);
}

/**
 * Check if the current word is suitable for autocomplete
 * Must have at least 1 character and not be whitespace
 */
export function shouldShowAutocomplete(word: string): boolean {
  return word.trim().length > 0;
}

// Height constants that match autocomplete.ts styles exactly
const DROPDOWN_ITEM_HEIGHT = 52; // Each item: padding 8px top+bottom + class-name line ~20px + css line ~16px + gap 4px
const DROPDOWN_LIST_PADDING = 8; // .autocomplete-list padding: 4px 0 top + bottom
const DROPDOWN_MAX_HEIGHT = 300; // max-height in autocomplete styles
const DROPDOWN_GAP = 4; // Gap between input edge and dropdown

/**
 * Estimate dropdown height based on number of items.
 * Used to anchor the dropdown bottom edge to the input top edge.
 */
export function estimateDropdownHeight(itemCount: number): number {
  const contentHeight = itemCount * DROPDOWN_ITEM_HEIGHT + DROPDOWN_LIST_PADDING;
  return Math.min(contentHeight, DROPDOWN_MAX_HEIGHT);
}

/**
 * Calculate dropdown position based on input element.
 * Always positions above the input so the closest item is right next to the input.
 * Items are rendered top-to-bottom (first item at top), so the last/closest item
 * sits right above the input edge.
 */
export function calculateDropdownPosition(
  input: TextInputElement,
  itemCount = 10
): {
  top: number;
  left: number;
} {
  const rect = input.getBoundingClientRect();
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

  const dropdownHeight = estimateDropdownHeight(itemCount);

  return {
    top: rect.top + scrollTop - dropdownHeight - DROPDOWN_GAP,
    left: rect.left + scrollLeft,
  };
}

/**
 * Calculate expanded panel position based on input element
 * Positions panel near the input, checking available space
 */
export function calculateExpandedPanelPosition(input: HTMLInputElement): {
  top: number;
  left: number;
} {
  const rect = input.getBoundingClientRect();
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

  // Panel dimensions (should match ExpandedEditor styles)
  const panelWidth = 400;
  const panelHeight = 300;

  // Try to position to the right of the input first
  let left = rect.right + scrollLeft + 8; // 8px gap
  let top = rect.top + scrollTop;

  // If not enough space on the right, position to the left
  if (left + panelWidth > window.innerWidth) {
    left = rect.left + scrollLeft - panelWidth - 8;
  }

  // If still not enough space, center horizontally
  if (left < 0) {
    left = (window.innerWidth - panelWidth) / 2 + scrollLeft;
  }

  // Ensure panel doesn't go below viewport
  if (top + panelHeight > window.innerHeight + scrollTop) {
    top = window.innerHeight + scrollTop - panelHeight - 20;
  }

  // Ensure panel doesn't go above viewport
  if (top < scrollTop) {
    top = scrollTop + 20;
  }

  return { top, left };
}
