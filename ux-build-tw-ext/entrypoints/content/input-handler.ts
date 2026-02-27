import type { TailwindClass } from '@ux-builder-tw/shared';
import { SEARCH_DEBOUNCE_MS, SEARCH_MIN_CHARS } from '@ux-builder-tw/shared';
import { AutocompleteDropdown } from './autocomplete.ts';
import {
  getCurrentWord,
  replaceCurrentWord,
  shouldShowAutocomplete,
  calculateDropdownPosition,
  parseVariantPrefix,
  type WordPosition,
} from '~/utils/class-parser.ts';

/**
 * Manages autocomplete for a single input element
 * Handles input events, keyboard navigation, and dropdown lifecycle
 */
export class InputHandler {
  private input: HTMLInputElement;
  private autocomplete: AutocompleteDropdown;
  private searchCallback: (query: string) => Promise<TailwindClass[]>;
  private debounceTimer: number | null = null;
  private currentWordPosition: WordPosition | null = null;
  private currentVariantPrefix = '';
  private isDropdownVisible = false;

  constructor(
    input: HTMLInputElement,
    searchCallback: (query: string) => Promise<TailwindClass[]>
  ) {
    this.input = input;
    this.searchCallback = searchCallback;

    this.autocomplete = new AutocompleteDropdown({
      onSelect: this.handleSelect.bind(this),
      onClose: this.handleClose.bind(this),
    });

    this.attachEventListeners();
  }

  /**
   * Attach event listeners to the input element
   */
  private attachEventListeners(): void {
    this.input.addEventListener('input', this.handleInput.bind(this));
    this.input.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.input.addEventListener('blur', this.handleBlur.bind(this));
    this.input.addEventListener('focus', this.handleFocus.bind(this));
  }

  /**
   * Handle input event (typing)
   */
  private handleInput(): void {
    // Clear existing debounce timer
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
    }

    // Get current word at cursor
    this.currentWordPosition = getCurrentWord(this.input);

    if (!this.currentWordPosition) {
      this.hideDropdown();
      return;
    }

    const { word } = this.currentWordPosition;

    // Parse variant prefix (e.g. "hover:bg-" → variants="hover:", utility="bg-")
    const { variants, utility } = parseVariantPrefix(word);
    this.currentVariantPrefix = variants;

    // Use utility part for autocomplete check and search
    // If user only typed variant prefix (e.g. "hover:") with no utility yet, hide dropdown
    if (!shouldShowAutocomplete(utility) || utility.length < SEARCH_MIN_CHARS) {
      this.hideDropdown();
      return;
    }

    // Debounce search — send only the utility part as query
    this.debounceTimer = window.setTimeout(() => {
      this.performSearch(utility);
    }, SEARCH_DEBOUNCE_MS);
  }

  /**
   * Handle keydown event (keyboard navigation)
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (this.isDropdownVisible) {
      const handled = this.autocomplete.handleKeyDown(event);
      if (handled) {
        event.stopPropagation();
      }
    }
  }

  /**
   * Handle blur event (input loses focus)
   */
  private handleBlur(): void {
    // Delay hiding to allow click events on dropdown
    setTimeout(() => {
      this.hideDropdown();
    }, 200);
  }

  /**
   * Handle focus event (input gains focus)
   */
  private handleFocus(): void {
    // Re-trigger search if there's a current word
    this.currentWordPosition = getCurrentWord(this.input);
    if (this.currentWordPosition && shouldShowAutocomplete(this.currentWordPosition.word)) {
      const { variants, utility } = parseVariantPrefix(this.currentWordPosition.word);
      this.currentVariantPrefix = variants;
      if (utility.length >= SEARCH_MIN_CHARS) {
        this.performSearch(utility);
      }
    }
  }

  /**
   * Perform search and show dropdown
   */
  private async performSearch(query: string): Promise<void> {
    console.log('[UX Builder TW] Searching for:', query);
    try {
      const results = await this.searchCallback(query);
      console.log('[UX Builder TW] Search results:', results.length, 'classes');

      if (results.length > 0) {
        this.showDropdown(results);
      } else {
        console.log('[UX Builder TW] No results found');
        this.hideDropdown();
      }
    } catch (error) {
      console.warn('[UX Builder TW] Search failed:', error);
      this.hideDropdown();
    }
  }

  /**
   * Show autocomplete dropdown with results
   */
  private showDropdown(results: TailwindClass[]): void {
    const position = calculateDropdownPosition(this.input);

    if (!this.autocomplete.isMounted()) {
      this.autocomplete.mount(position);
      this.isDropdownVisible = true;
    } else {
      this.autocomplete.updatePosition(position);
    }

    this.autocomplete.update(results, this.currentVariantPrefix);
  }

  /**
   * Hide autocomplete dropdown
   */
  private hideDropdown(): void {
    if (this.isDropdownVisible) {
      this.autocomplete.unmount();
      this.isDropdownVisible = false;
    }
  }

  /**
   * Handle class selection from dropdown
   * The className already includes the variant prefix (prepended by AutocompleteDropdown)
   */
  private handleSelect(className: string): void {
    if (this.currentWordPosition) {
      replaceCurrentWord(this.input, className, this.currentWordPosition);
    }
    this.hideDropdown();
    this.input.focus();
  }

  /**
   * Handle dropdown close request
   */
  private handleClose(): void {
    this.hideDropdown();
    this.input.focus();
  }

  /**
   * Cleanup and remove event listeners
   */
  public destroy(): void {
    this.input.removeEventListener('input', this.handleInput.bind(this));
    this.input.removeEventListener('keydown', this.handleKeyDown.bind(this));
    this.input.removeEventListener('blur', this.handleBlur.bind(this));
    this.input.removeEventListener('focus', this.handleFocus.bind(this));

    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
    }

    this.hideDropdown();
  }
}
