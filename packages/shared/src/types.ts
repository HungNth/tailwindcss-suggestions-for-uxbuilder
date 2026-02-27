// Tailwind utility class entry
export interface TailwindClass {
  /** The class name (e.g. "bg-blue-500", "flex", "p-4") */
  name: string;
  /** The resolved CSS (e.g. "background-color: rgb(59 130 246)") */
  css: string;
  /** Category for grouping (e.g. "backgrounds", "layout", "spacing") */
  category: string;
  /** Variants this class supports (e.g. ["hover", "focus", "sm"]) */
  variants?: string[];
}

// Custom class from @apply resolution
export interface CustomClass {
  /** The custom class name (e.g. "btn-primary") */
  name: string;
  /** The resolved CSS output */
  css: string;
  /** The original @apply value (e.g. "bg-blue-500 text-white px-4 py-2") */
  applyValue: string;
  /** Individual utility classes referenced by @apply */
  appliedUtilities: string[];
  /** Source file path */
  sourceFile: string;
}

// API response wrappers
export interface ApiSuccess<T> {
  data: T;
}

export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// Search request/response
export interface ClassSearchParams {
  q: string;
  limit?: number;
  offset?: number;
  includeCustom?: boolean;
}

export interface ClassSearchResult {
  classes: TailwindClass[];
  customClasses: CustomClass[];
  total: number;
}

// Validation
export interface ValidationResult {
  className: string;
  valid: boolean;
  suggestion?: string;
}

// Server status
export interface ServerStatus {
  running: boolean;
  tailwindVersion: string;
  totalClasses: number;
  totalCustomClasses: number;
  watchedFile: string | null;
  lastUpdated: string;
}

// Extension ↔ Background message types
export const MessageType = {
  SEARCH_CLASSES: 'SEARCH_CLASSES',
  VALIDATE_CLASSES: 'VALIDATE_CLASSES',
  GET_STATUS: 'GET_STATUS',
  UPDATE_CONFIG: 'UPDATE_CONFIG',
} as const;

export type MessageType = (typeof MessageType)[keyof typeof MessageType];

export interface ExtensionMessage {
  type: MessageType;
  payload: unknown;
}

export interface SearchMessage extends ExtensionMessage {
  type: typeof MessageType.SEARCH_CLASSES;
  payload: { query: string; limit?: number };
}

export interface ValidateMessage extends ExtensionMessage {
  type: typeof MessageType.VALIDATE_CLASSES;
  payload: { classNames: string[] };
}
