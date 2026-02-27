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
  /** Alias for sourceFile (for compatibility) */
  source: string;
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
  tailwindClassCount: number; // Alias for totalClasses
  totalCustomClasses: number;
  customClassCount: number; // Alias for totalCustomClasses
  watchedFile: string | null;
  lastUpdated: string | number;
  config: BackendConfig;
}

// Backend configuration
export interface BackendConfig {
  cssFilePath?: string;
}

// Extension ↔ Background message types
export const MessageType = {
  SEARCH_CLASSES: 'SEARCH_CLASSES',
  VALIDATE_CLASSES: 'VALIDATE_CLASSES',
  GET_STATUS: 'GET_STATUS',
  GET_CUSTOM_CLASSES: 'GET_CUSTOM_CLASSES',
  UPDATE_CONFIG: 'UPDATE_CONFIG',
} as const;

export type MessageTypeValue = (typeof MessageType)[keyof typeof MessageType];

export interface ExtensionMessage {
  type?: MessageTypeValue;
  action?: string;
  payload?: unknown;
}

export interface SearchMessage extends ExtensionMessage {
  type: typeof MessageType.SEARCH_CLASSES;
  payload: { query: string; limit?: number };
}

export interface ValidateMessage extends ExtensionMessage {
  type: typeof MessageType.VALIDATE_CLASSES;
  payload: { classNames: string[] };
}

// Request/Response types for extension messages
export interface SearchClassesRequest {
  action: 'searchClasses';
  query: string;
  limit?: number;
  offset?: number;
}

export interface SearchClassesResponse {
  action: 'searchClasses';
  data?: TailwindClass[];
  error?: string;
  message?: string;
}

export interface ValidateClassesRequest {
  action: 'validateClasses';
  classNames: string[];
}

export interface ValidateClassesResponse {
  action: 'validateClasses';
  data?: ValidationResult[];
  error?: string;
  message?: string;
}

export interface GetCustomClassesRequest {
  action: 'getCustomClasses';
}

export interface GetCustomClassesResponse {
  action: 'getCustomClasses';
  data?: CustomClass[];
  error?: string;
  message?: string;
}

export interface GetStatusRequest {
  action: 'getStatus';
}

export interface GetStatusResponse {
  action: 'getStatus';
  data?: ServerStatus;
  error?: string;
  message?: string;
}

export interface UpdateConfigRequest {
  action: 'updateConfig';
  config: BackendConfig;
}

export interface UpdateConfigResponse {
  action: 'updateConfig';
  data?: BackendConfig;
  error?: string;
  message?: string;
}
