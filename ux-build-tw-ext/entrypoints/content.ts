import type { TailwindClass, SearchClassesRequest, SearchClassesResponse } from '@ux-builder-tw/shared';
import { UX_BUILDER_SELECTOR } from '@ux-builder-tw/shared';
import { isUxBuilderPage, waitForUxBuilder } from './content/detector';
import { InputHandler } from './content/input-handler';

/**
 * Content script for UX Builder Tailwind CSS autocomplete
 * Detects UX Builder, finds class inputs, and attaches autocomplete handlers
 */
export default defineContentScript({
  matches: ['*://*/wp-admin/post.php*'],
  main: initContentScript,
});

/**
 * Active input handlers (for cleanup)
 */
const inputHandlers: Map<HTMLInputElement, InputHandler> = new Map();

/**
 * Initialize content script
 */
async function initContentScript(): Promise<void> {
  console.log('[UX Builder TW] Content script loaded');

  // Check if this is a UX Builder page
  if (!isUxBuilderPage()) {
    console.log('[UX Builder TW] Not a UX Builder page, exiting');
    return;
  }

  console.log('[UX Builder TW] UX Builder detected, waiting for editor...');

  try {
    // Wait for UX Builder editor to load
    await waitForUxBuilder();
    console.log('[UX Builder TW] UX Builder editor ready');

    // Start observing for class inputs
    startObserving();
  } catch (error) {
    console.error('[UX Builder TW] Failed to initialize:', error);
  }
}

/**
 * Start observing DOM for class input fields
 */
function startObserving(): void {
  // Initial scan for existing inputs
  scanForInputs();

  // Setup MutationObserver to detect new inputs
  const observer = new MutationObserver(() => {
    scanForInputs();
  });

  // Observe the entire document for added nodes
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  console.log('[UX Builder TW] Started observing for class inputs');
}

/**
 * Scan for class input fields and attach handlers
 */
function scanForInputs(): void {
  const inputs = document.querySelectorAll<HTMLInputElement>(UX_BUILDER_SELECTOR);

  inputs.forEach((input) => {
    // Skip if already handled
    if (inputHandlers.has(input)) {
      return;
    }

    // Attach handler
    attachInputHandler(input);
  });
}

/**
 * Attach autocomplete handler to an input element
 */
function attachInputHandler(input: HTMLInputElement): void {
  try {
    const handler = new InputHandler(input, searchClasses);
    inputHandlers.set(input, handler);

    // console.log('[UX Builder TW] Attached handler to input with class:', input.classList[0]);
  } catch (error) {
    console.warn('[UX Builder TW] Failed to attach handler:', error);
  }
}

/**
 * Search for Tailwind classes via background script
 */
async function searchClasses(query: string): Promise<TailwindClass[]> {
  try {
    const request: SearchClassesRequest = {
      action: 'searchClasses',
      query,
      limit: 50,
    };

    // console.log('[UX Builder TW] Sending message to background:', request);

    const response = await browser.runtime.sendMessage<
      SearchClassesRequest,
      SearchClassesResponse
    >(request);

    // console.log('[UX Builder TW] Received response from background:', response);

    // Handle undefined or null response
    if (!response) {
      console.warn('[UX Builder TW] No response from background script');
      return [];
    }

    if ('error' in response) {
      console.warn('[UX Builder TW] Search error:', response.error, response.message);
      return [];
    }

    if (!response.data) {
      console.warn('[UX Builder TW] Response has no data field:', response);
      return [];
    }

    // console.log('[UX Builder TW] Returning', response.data.length, 'results');
    return response.data;
  } catch (error) {
    console.error('[UX Builder TW] Failed to search classes:', error);
    return [];
  }
}

/**
 * Cleanup on unload
 */
window.addEventListener('unload', () => {
  inputHandlers.forEach((handler) => handler.destroy());
  inputHandlers.clear();
});
