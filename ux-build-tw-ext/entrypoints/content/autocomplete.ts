import type { TailwindClass } from '@ux-builder-tw/shared';

export interface AutocompleteOptions {
  onSelect: (className: string) => void;
  onClose: () => void;
}

export interface AutocompletePosition {
  top: number;
  left: number;
}

/**
 * Autocomplete dropdown UI with Shadow DOM isolation
 * Handles keyboard navigation, click selection, and CSS preview
 */
export class AutocompleteDropdown {
  private container: HTMLDivElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private dropdown: HTMLDivElement | null = null;
  private listElement: HTMLUListElement | null = null;
  private items: TailwindClass[] = [];
  private selectedIndex = 0;
  private variantPrefix = '';
  private options: AutocompleteOptions;

  constructor(options: AutocompleteOptions) {
    this.options = options;
  }

  /**
   * Create and mount the dropdown at the specified position
   */
  public mount(position: AutocompletePosition): void {
    if (this.container) {
      this.unmount();
    }

    // Create container for Shadow DOM
    this.container = document.createElement('div');
    this.container.id = 'ux-builder-tw-autocomplete-root';
    this.container.style.position = 'absolute';
    this.container.style.zIndex = '999999';
    this.container.style.top = `${position.top}px`;
    this.container.style.left = `${position.left}px`;

    // Attach Shadow DOM for style isolation
    this.shadowRoot = this.container.attachShadow({ mode: 'open' });

    // Create dropdown structure
    this.dropdown = document.createElement('div');
    this.dropdown.className = 'autocomplete-dropdown';

    this.listElement = document.createElement('ul');
    this.listElement.className = 'autocomplete-list';
    this.listElement.setAttribute('role', 'listbox');

    this.dropdown.appendChild(this.listElement);

    // Inject styles
    const style = document.createElement('style');
    style.textContent = this.getStyles();
    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(this.dropdown);

    // Mount to document
    document.body.appendChild(this.container);

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Update dropdown items and re-render
   * @param items - The matching Tailwind classes
   * @param variantPrefix - Active variant prefix (e.g. "hover:", "sm:hover:")
   */
  public update(items: TailwindClass[], variantPrefix = ''): void {
    this.items = items;
    this.variantPrefix = variantPrefix;
    this.selectedIndex = 0;
    this.render();
  }

  /**
   * Update dropdown position (e.g., on input scroll)
   */
  public updatePosition(position: AutocompletePosition): void {
    if (this.container) {
      this.container.style.top = `${position.top}px`;
      this.container.style.left = `${position.left}px`;
    }
  }

  /**
   * Remove dropdown from DOM and cleanup
   */
  public unmount(): void {
    document.removeEventListener('mousedown', this.handleOutsideMouseDown, true);
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.shadowRoot = null;
    this.dropdown = null;
    this.listElement = null;
    this.items = [];
    this.selectedIndex = 0;
    this.variantPrefix = '';
  }

  /**
   * Check if dropdown is currently mounted
   */
  public isMounted(): boolean {
    return this.container !== null && this.container.parentNode !== null;
  }

  /**
   * Handle keyboard navigation
   */
  public handleKeyDown(event: KeyboardEvent): boolean {
    if (!this.isMounted() || this.items.length === 0) {
      return false;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectNext();
        return true;

      case 'ArrowUp':
        event.preventDefault();
        this.selectPrevious();
        return true;

      case 'Enter':
      case 'Tab':
        event.preventDefault();
        this.selectCurrent();
        return true;

      case 'Escape':
        event.preventDefault();
        this.options.onClose();
        return true;

      default:
        return false;
    }
  }

  /**
   * Render dropdown items
   */
  private render(): void {
    if (!this.listElement) return;

    // Clear existing items
    this.listElement.innerHTML = '';

    if (this.items.length === 0) {
      const emptyItem = document.createElement('li');
      emptyItem.className = 'autocomplete-item autocomplete-item-empty';
      emptyItem.textContent = 'No classes found';
      this.listElement.appendChild(emptyItem);
      return;
    }

    // Render each item
    this.items.forEach((item, index) => {
      const li = document.createElement('li');
      li.className = 'autocomplete-item';
      li.setAttribute('role', 'option');
      li.setAttribute('data-index', index.toString());

      if (index === this.selectedIndex) {
        li.classList.add('selected');
        li.setAttribute('aria-selected', 'true');
      }

      // Class name — show with variant prefix if present
      const nameSpan = document.createElement('span');
      nameSpan.className = 'class-name';

      if (this.variantPrefix) {
        // Show variant prefix in dimmer color, utility in bright color
        const variantSpan = document.createElement('span');
        variantSpan.className = 'class-variant';
        variantSpan.textContent = this.variantPrefix;
        nameSpan.appendChild(variantSpan);

        const utilitySpan = document.createElement('span');
        utilitySpan.textContent = item.name;
        nameSpan.appendChild(utilitySpan);
      } else {
        nameSpan.textContent = item.name;
      }

      li.appendChild(nameSpan);

      // CSS preview
      if (item.css) {
        const cssSpan = document.createElement('span');
        cssSpan.className = 'class-css';
        cssSpan.textContent = this.formatCss(item.css);
        li.appendChild(cssSpan);
      }

      // Use mousedown instead of click so it fires before the input's blur event.
      // preventDefault() prevents the input from losing focus at all.
      li.addEventListener('mousedown', (e: MouseEvent) => {
        e.preventDefault(); // Prevent input blur
        this.selectedIndex = index;
        this.selectCurrent();
      });

      // Hover: only swap the .selected class, never re-render the whole list
      // Re-rendering clears innerHTML which destroys existing mousedown listeners
      // and can cause the browser to cancel the in-progress mousedown sequence.
      li.addEventListener('mouseenter', () => {
        if (this.selectedIndex === index) return; // nothing to do
        // Remove .selected from the previously selected item
        const prev = this.listElement?.querySelector('.selected');
        if (prev) {
          prev.classList.remove('selected');
          prev.removeAttribute('aria-selected');
        }
        // Add .selected to hovered item
        li.classList.add('selected');
        li.setAttribute('aria-selected', 'true');
        this.selectedIndex = index;
      });

      this.listElement!.appendChild(li);
    });

    // Scroll selected item into view
    this.scrollSelectedIntoView();
  }

  /**
   * Setup event listeners for the dropdown
   */
  private setupEventListeners(): void {
    // Close dropdown when clicking outside.
    // Use mousedown (not click) so we can check before the selection fires,
    // and use composedPath() to correctly detect clicks inside Shadow DOM.
    document.addEventListener('mousedown', this.handleOutsideMouseDown, true);
  }

  /**
   * Handle mousedown outside the dropdown.
   * Uses composedPath() to see through Shadow DOM boundaries — event.target
   * alone would only show the shadow host, causing false "outside" detections.
   */
  private handleOutsideMouseDown = (event: MouseEvent): void => {
    if (!this.container) return;
    const path = event.composedPath();
    if (!path.includes(this.container)) {
      this.options.onClose();
    }
  };

  /**
   * Select next item
   */
  private selectNext(): void {
    if (this.items.length === 0) return;
    this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
    this.render();
  }

  /**
   * Select previous item
   */
  private selectPrevious(): void {
    if (this.items.length === 0) return;
    this.selectedIndex = this.selectedIndex === 0 ? this.items.length - 1 : this.selectedIndex - 1;
    this.render();
  }

  /**
   * Select current item and trigger callback
   * Prepends variant prefix to the selected class name
   */
  private selectCurrent(): void {
    if (this.items.length === 0) return;
    const selectedItem = this.items[this.selectedIndex];
    if (selectedItem) {
      this.options.onSelect(this.variantPrefix + selectedItem.name);
    }
  }

  /**
   * Scroll selected item into view
   */
  private scrollSelectedIntoView(): void {
    if (!this.listElement) return;
    const selectedElement = this.listElement.querySelector('.selected') as HTMLElement;
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  /**
   * Format CSS for display (truncate long values)
   */
  private formatCss(css: string): string {
    const maxLength = 60;
    const cleaned = css.replace(/\s+/g, ' ').trim();
    if (cleaned.length > maxLength) {
      return cleaned.substring(0, maxLength) + '...';
    }
    return cleaned;
  }

  /**
   * Get Shadow DOM styles
   */
  private getStyles(): string {
    return `
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      .autocomplete-dropdown {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        font-size: 13px;
        background: #1e1e1e;
        border: 1px solid #3e3e3e;
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        max-height: 300px;
        min-width: 400px;
        max-width: 600px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        /* Allow dropdown to shrink to content size for better proximity */
        width: fit-content;
      }

      .autocomplete-list {
        list-style: none;
        margin: 0;
        padding: 4px 0;
        overflow-y: auto;
        overflow-x: hidden;
      }

      .autocomplete-list::-webkit-scrollbar {
        width: 10px;
      }

      .autocomplete-list::-webkit-scrollbar-track {
        background: #1e1e1e;
      }

      .autocomplete-list::-webkit-scrollbar-thumb {
        background: #3e3e3e;
        border-radius: 5px;
      }

      .autocomplete-list::-webkit-scrollbar-thumb:hover {
        background: #4e4e4e;
      }

      .autocomplete-item {
        padding: 8px 12px;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        gap: 4px;
        color: #d4d4d4;
        transition: background-color 0.1s ease;
      }

      .autocomplete-item:hover {
        background: #2a2a2a;
      }

      .autocomplete-item.selected {
        background: #094771;
        color: #ffffff;
      }

      .autocomplete-item.selected .class-css {
        color: #e0e0e0;
      }

      .autocomplete-item-empty {
        color: #858585;
        cursor: default;
        font-style: italic;
      }

      .autocomplete-item-empty:hover {
        background: transparent;
      }

      .class-name {
        font-weight: 600;
        color: #4ec9b0;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      }

      .class-variant {
        color: #c586c0;
        font-weight: 400;
      }

      .autocomplete-item.selected .class-name {
        color: #ffffff;
      }

      .autocomplete-item.selected .class-variant {
        color: #dca3dc;
      }

      .class-css {
        font-size: 11px;
        color: #858585;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `;
  }
}
