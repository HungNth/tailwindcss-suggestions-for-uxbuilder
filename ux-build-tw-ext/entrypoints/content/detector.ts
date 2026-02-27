import { UX_BUILDER_URL_PARAMS, UX_BUILDER_SELECTORS } from '@ux-builder-tw/shared';

/**
 * Check if the current page is the Flatsome UX Builder editor.
 */
export function isUxBuilderPage(): boolean {
  const params = new URLSearchParams(window.location.search);
  return (
    params.get('app') === UX_BUILDER_URL_PARAMS.app &&
    params.get('type') === UX_BUILDER_URL_PARAMS.type
  );
}

/**
 * Wait for UX Builder editor to fully load
 * Polls for the presence of UX Builder elements
 */
export async function waitForUxBuilder(timeout = 10000): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    // Check if UX Builder container exists
    const uxBuilder = document.querySelector('#ux-builder');
    if (uxBuilder) {
      // Wait a bit more for Angular to initialize
      await new Promise((resolve) => setTimeout(resolve, 500));
      return;
    }

    // Wait before next check
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error('UX Builder editor failed to load within timeout');
}

/**
 * Find all target inputs (class inputs) in the UX Builder sidebar.
 */
export function findClassInputs(): HTMLInputElement[] {
  const inputs = document.querySelectorAll<HTMLInputElement>(UX_BUILDER_SELECTORS.TARGET_INPUT);
  return Array.from(inputs);
}

/**
 * Observe DOM for dynamically added class inputs.
 */
export function observeClassInputs(callback: (input: HTMLInputElement) => void): MutationObserver {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) {
          const inputs = node.querySelectorAll<HTMLInputElement>(
            UX_BUILDER_SELECTORS.TARGET_INPUT
          );
          inputs.forEach(callback);
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return observer;
}

