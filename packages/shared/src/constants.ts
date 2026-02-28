export const DEFAULT_BACKEND_URL = 'http://localhost:3456';
export const BACKEND_URL = DEFAULT_BACKEND_URL; // Alias
export const API_BASE = '/api';
export const ENDPOINTS = {
  CUSTOM_CLASSES: '/api/custom-classes',
  STATUS: '/api/status',
  CONFIG: '/api/config',
} as const;

export const UX_BUILDER_URL_PARAMS = {
  app: 'uxbuilder',
  type: 'editor',
} as const;

export const UX_BUILDER_SELECTORS = {
  /** The input element to attach autocomplete to */
  TARGET_INPUT: 'ux-option.option-name-class .option-body .option-template input.ng-pristine',
  /** Alternative broader selector */
  TARGET_INPUT_BROAD: '#ux-builder input.ng-pristine',
} as const;

export const UX_BUILDER_SELECTOR =
  'ux-option.option-name-class .option-body .option-template input.ng-pristine';

export const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const DEFAULT_SEARCH_LIMIT = 50;
export const DEBOUNCE_MS = 150;
export const SEARCH_DEBOUNCE_MS = DEBOUNCE_MS; // Alias
export const SEARCH_MIN_CHARS = 1;
