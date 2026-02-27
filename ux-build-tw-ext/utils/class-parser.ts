/**
 * Utility functions for parsing and manipulating Tailwind class names in input fields
 */

export interface WordPosition {
  word: string;
  start: number;
  end: number;
}

/**
 * Get the current word at the cursor position in an input element
 * Classes are space-separated, so we find the word boundaries
 */
export function getCurrentWord(input: HTMLInputElement): WordPosition | null {
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
 * Replace the current word at cursor position with a new class name
 * Preserves other classes and maintains proper spacing
 */
export function replaceCurrentWord(
  input: HTMLInputElement,
  newWord: string,
  wordPosition: WordPosition
): void {
  const value = input.value;
  const { start, end } = wordPosition;

  // Build new value
  const before = value.substring(0, start);
  const after = value.substring(end);

  // Handle spacing
  let newValue: string;
  let newCursorPos: number;

  if (before.length === 0 && after.length === 0) {
    // Only word in input
    newValue = newWord;
    newCursorPos = newWord.length;
  } else if (before.length === 0) {
    // First word - add space after if there's content after
    newValue = newWord + (after.trim().length > 0 ? ' ' : '') + after.trimStart();
    newCursorPos = newWord.length + 1;
  } else if (after.trim().length === 0) {
    // Last word - ensure space before
    newValue = before + newWord;
    newCursorPos = newValue.length;
  } else {
    // Middle word - ensure spaces on both sides
    newValue = before + newWord + ' ' + after.trimStart();
    newCursorPos = before.length + newWord.length + 1;
  }

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
export function getAllClasses(input: HTMLInputElement): string[] {
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

/**
 * Calculate dropdown position based on input element
 * Positions dropdown above the input to avoid cutoff in UX Builder sidebar
 * Dropdown height is estimated at 300px (max-height in autocomplete.ts)
 */
export function calculateDropdownPosition(input: HTMLInputElement): {
  top: number;
  left: number;
} {
  const rect = input.getBoundingClientRect();
  const scrollTop = window.scrollY || document.documentElement.scrollTop;
  const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

  // Estimate dropdown height (matches max-height in autocomplete styles)
  const dropdownHeight = 300;

  return {
    top: rect.top + scrollTop - dropdownHeight - 4, // 4px gap above input
    left: rect.left + scrollLeft,
  };
}
