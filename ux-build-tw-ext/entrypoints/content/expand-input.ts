import type { TailwindClass } from '@ux-builder-tw/shared';
import { calculateExpandedPanelPosition } from '~/utils/class-parser.ts';
import { InputHandler } from './input-handler.ts';

/**
 * Expand button that opens an expanded editor for the class input
 */
export class ExpandButton {
  private input: HTMLInputElement;
  private container: HTMLDivElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private button: HTMLButtonElement | null = null;
  private editor: ExpandedEditor | null = null;
  private searchCallback: (query: string) => Promise<TailwindClass[]>;

  constructor(
    input: HTMLInputElement,
    searchCallback: (query: string) => Promise<TailwindClass[]>
  ) {
    this.input = input;
    this.searchCallback = searchCallback;
    this.mount();
  }

  /**
   * Mount the expand button next to the input
   */
  private mount(): void {
    // Create Shadow DOM container for the button
    this.container = document.createElement('div');
    this.container.id = 'ux-builder-tw-expand-btn';
    this.container.style.cssText = 'display: inline-block; position: relative; margin-left: 4px;';

    this.shadowRoot = this.container.attachShadow({ mode: 'open' });

    // Create button with expand icon
    this.button = document.createElement('button');
    this.button.className = 'expand-btn';
    this.button.title = 'Expand class editor';
    this.button.innerHTML = this.getExpandIcon();
    this.button.addEventListener('click', this.handleClick);

    // Inject styles
    const style = document.createElement('style');
    style.textContent = this.getStyles();
    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(this.button);

    // Insert button after the input
    // Use insertAdjacentElement which is safer and simpler
    try {
      // Try to insert right after the input
      this.input.insertAdjacentElement('afterend', this.container);
    } catch (error) {
      console.warn(
        '[UX Builder TW] Failed to insert expand button after input, trying parent append:',
        error
      );
      // Fallback: append to parent
      if (this.input.parentElement) {
        this.input.parentElement.appendChild(this.container);
      } else {
        console.error('[UX Builder TW] Cannot mount expand button: input has no parent');
        return;
      }
    }
  }

  /**
   * Handle button click - open expanded editor
   */
  private handleClick = (): void => {
    if (!this.editor) {
      this.editor = new ExpandedEditor(this.input, this.searchCallback, () => {
        // Callback when editor is closed - reset reference so it can be opened again
        this.editor = null;
      });
    }
  };

  /**
   * Get expand icon SVG
   */
  private getExpandIcon(): string {
    return `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="15 3 21 3 21 9"></polyline>
        <polyline points="9 21 3 21 3 15"></polyline>
        <line x1="21" y1="3" x2="14" y2="10"></line>
        <line x1="3" y1="21" x2="10" y2="14"></line>
      </svg>
    `;
  }

  /**
   * Get button styles
   */
  private getStyles(): string {
    return `
      .expand-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        padding: 0;
        background: transparent;
        border: 1px solid #3e3e3e;
        border-radius: 3px;
        cursor: pointer;
        color: #858585;
        transition: all 0.15s ease;
      }

      .expand-btn:hover {
        background: #2a2a2a;
        border-color: #4ec9b0;
        color: #4ec9b0;
      }

      .expand-btn:active {
        background: #1e1e1e;
      }
    `;
  }

  /**
   * Cleanup and unmount
   */
  public destroy(): void {
    if (this.button) {
      this.button.removeEventListener('click', this.handleClick);
    }
    if (this.editor) {
      this.editor.destroy();
    }
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
    this.shadowRoot = null;
    this.button = null;
    this.editor = null;
  }
}

/**
 * Expanded editor panel with large textarea and autocomplete support
 */
export class ExpandedEditor {
  private originalInput: HTMLInputElement;
  private container: HTMLDivElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private panel: HTMLDivElement | null = null;
  private textarea: HTMLTextAreaElement | null = null;
  private inputHandler: InputHandler | null = null;
  private searchCallback: (query: string) => Promise<TailwindClass[]>;
  private onCloseCallback: (() => void) | null = null;

  constructor(
    originalInput: HTMLInputElement,
    searchCallback: (query: string) => Promise<TailwindClass[]>,
    onCloseCallback?: () => void
  ) {
    this.originalInput = originalInput;
    this.searchCallback = searchCallback;
    this.onCloseCallback = onCloseCallback || null;
    this.mount();
  }

  /**
   * Mount the expanded editor panel
   */
  private mount(): void {
    // Create container with Shadow DOM
    this.container = document.createElement('div');
    this.container.id = 'ux-builder-tw-expanded-editor';
    this.container.style.cssText = 'position: fixed; z-index: 999998;'; // Below autocomplete (999999)

    const position = calculateExpandedPanelPosition(this.originalInput);
    this.container.style.top = `${position.top}px`;
    this.container.style.left = `${position.left}px`;

    this.shadowRoot = this.container.attachShadow({ mode: 'open' });

    // Create panel structure
    this.panel = document.createElement('div');
    this.panel.className = 'expanded-panel';

    // Header
    const header = document.createElement('div');
    header.className = 'panel-header';

    const title = document.createElement('h3');
    title.textContent = 'Edit Classes';
    header.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.innerHTML = '&times;';
    closeBtn.title = 'Close (Esc)';
    closeBtn.addEventListener('click', () => this.handleCancel());
    header.appendChild(closeBtn);

    this.panel.appendChild(header);

    // Textarea
    this.textarea = document.createElement('textarea');
    this.textarea.className = 'class-textarea';
    this.textarea.value = this.originalInput.value;
    this.textarea.placeholder = 'Enter Tailwind classes...';
    this.textarea.spellcheck = false;
    this.panel.appendChild(this.textarea);

    // Footer with buttons
    const footer = document.createElement('div');
    footer.className = 'panel-footer';

    const hint = document.createElement('span');
    hint.className = 'keyboard-hint';
    hint.textContent = 'Ctrl+Enter to apply, Esc to cancel';
    footer.appendChild(hint);

    const btnGroup = document.createElement('div');
    btnGroup.className = 'btn-group';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-cancel';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => this.handleCancel());
    btnGroup.appendChild(cancelBtn);

    const applyBtn = document.createElement('button');
    applyBtn.className = 'btn btn-apply';
    applyBtn.textContent = 'Apply';
    applyBtn.addEventListener('click', () => this.handleApply());
    btnGroup.appendChild(applyBtn);

    footer.appendChild(btnGroup);
    this.panel.appendChild(footer);

    // Inject styles
    const style = document.createElement('style');
    style.textContent = this.getStyles();
    this.shadowRoot.appendChild(style);
    this.shadowRoot.appendChild(this.panel);

    // Mount to document
    document.body.appendChild(this.container);

    // Focus textarea
    this.textarea.focus();

    // Setup keyboard shortcuts
    this.textarea.addEventListener('keydown', this.handleKeyDown);

    // Setup autocomplete for textarea
    this.inputHandler = new InputHandler(this.textarea, this.searchCallback);

    // Close on outside click
    document.addEventListener('click', this.handleOutsideClick, true);
  }

  /**
   * Handle keyboard shortcuts
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.handleCancel();
    } else if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault();
      this.handleApply();
    }
  };

  /**
   * Handle outside click
   */
  private handleOutsideClick = (event: MouseEvent): void => {
    if (this.container && event.target instanceof Node && !this.container.contains(event.target)) {
      // Don't close if clicking on autocomplete dropdown
      const target = event.target as HTMLElement;
      if (target.closest('#ux-builder-tw-autocomplete-root')) {
        return;
      }
      this.handleCancel();
    }
  };

  /**
   * Apply changes to original input
   */
  private handleApply(): void {
    if (this.textarea) {
      this.originalInput.value = this.textarea.value;

      // Dispatch events for Angular compatibility
      this.originalInput.dispatchEvent(new Event('input', { bubbles: true }));
      this.originalInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Call onClose callback before destroying
    if (this.onCloseCallback) {
      this.onCloseCallback();
    }

    this.destroy();
  }

  /**
   * Cancel and close without applying
   */
  private handleCancel(): void {
    // Call onClose callback before destroying
    if (this.onCloseCallback) {
      this.onCloseCallback();
    }

    this.destroy();
  }

  /**
   * Get panel styles
   */
  private getStyles(): string {
    return `
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      .expanded-panel {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        font-size: 13px;
        background: #1e1e1e;
        border: 1px solid #3e3e3e;
        border-radius: 6px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        width: 400px;
        display: flex;
        flex-direction: column;
      }

      .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-bottom: 1px solid #3e3e3e;
        background: #252525;
        border-radius: 6px 6px 0 0;
      }

      .panel-header h3 {
        font-size: 14px;
        font-weight: 600;
        color: #d4d4d4;
      }

      .close-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        padding: 0;
        background: transparent;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        color: #858585;
        font-size: 20px;
        line-height: 1;
        transition: all 0.15s ease;
      }

      .close-btn:hover {
        background: #3e3e3e;
        color: #d4d4d4;
      }

      .class-textarea {
        width: 100%;
        min-height: 200px;
        max-height: 400px;
        padding: 12px;
        background: #1e1e1e;
        border: none;
        color: #d4d4d4;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 13px;
        line-height: 1.6;
        resize: vertical;
        outline: none;
      }

      .class-textarea::placeholder {
        color: #5858585;
      }

      .panel-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-top: 1px solid #3e3e3e;
        background: #252525;
        border-radius: 0 0 6px 6px;
      }

      .keyboard-hint {
        font-size: 11px;
        color: #858585;
      }

      .btn-group {
        display: flex;
        gap: 8px;
      }

      .btn {
        padding: 6px 16px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
        border: 1px solid transparent;
      }

      .btn-cancel {
        background: transparent;
        border-color: #3e3e3e;
        color: #d4d4d4;
      }

      .btn-cancel:hover {
        background: #3e3e3e;
      }

      .btn-apply {
        background: #4ec9b0;
        color: #1e1e1e;
        border: none;
      }

      .btn-apply:hover {
        background: #5edac0;
      }

      .btn-apply:active {
        background: #3eb89f;
      }
    `;
  }

  /**
   * Cleanup and unmount
   */
  public destroy(): void {
    if (this.textarea) {
      this.textarea.removeEventListener('keydown', this.handleKeyDown);
    }
    document.removeEventListener('click', this.handleOutsideClick, true);

    if (this.inputHandler) {
      this.inputHandler.destroy();
      this.inputHandler = null;
    }

    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }

    this.container = null;
    this.shadowRoot = null;
    this.panel = null;
    this.textarea = null;
  }
}
