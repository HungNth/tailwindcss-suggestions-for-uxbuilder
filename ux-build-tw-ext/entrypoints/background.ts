import type {
  ExtensionMessage,
  SearchClassesRequest,
  SearchClassesResponse,
  ValidateClassesRequest,
  ValidateClassesResponse,
  GetCustomClassesRequest,
  GetCustomClassesResponse,
  GetStatusRequest,
  GetStatusResponse,
  UpdateConfigRequest,
  UpdateConfigResponse,
  ApiResponse,
  TailwindClass,
  ValidationResult,
  CustomClass,
  ServerStatus,
  BackendConfig,
} from '@ux-builder-tw/shared';
import { BACKEND_URL, CACHE_TTL_MS } from '@ux-builder-tw/shared';

/**
 * Background service worker for UX Builder Tailwind CSS extension
 * Relays messages between content scripts and local backend server
 * Implements caching for better performance
 */
export default defineBackground(() => {
  console.log('[UX Builder TW] Background service worker started');

  // Setup message listener
  browser.runtime.onMessage.addListener(handleMessage);

  // Check backend status on startup
  checkBackendStatus();
});

/**
 * Cache for class search results
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const searchCache = new Map<string, CacheEntry<TailwindClass[]>>();
const validationCache = new Map<string, CacheEntry<ValidationResult[]>>();
let customClassesCache: CacheEntry<CustomClass[]> | null = null;
let statusCache: CacheEntry<ServerStatus> | null = null;

/**
 * Handle messages from content scripts and popup
 */
function handleMessage(
  message: ExtensionMessage,
  sender: any,
  sendResponse: (response: ExtensionMessage) => void
): boolean {
  console.log('[UX Builder TW] Received message:', message.action);

  // Handle message asynchronously
  (async () => {
    let response: ExtensionMessage;

    switch (message.action) {
      case 'searchClasses':
        response = await handleSearchClasses(message as SearchClassesRequest);
        break;

      case 'validateClasses':
        response = await handleValidateClasses(message as ValidateClassesRequest);
        break;

      case 'getCustomClasses':
        response = await handleGetCustomClasses(message as GetCustomClassesRequest);
        break;

      case 'getStatus':
        response = await handleGetStatus(message as GetStatusRequest);
        break;

      case 'updateConfig':
        response = await handleUpdateConfig(message as UpdateConfigRequest);
        break;

      default:
        console.warn('[UX Builder TW] Unknown message action:', message);
        response = {
          action: 'error',
          error: 'Unknown action',
          message: `Action "${(message as any).action}" is not supported`,
        } as ExtensionMessage;
    }

    sendResponse(response);
  })();

  // Return true to indicate async response
  return true;
}

/**
 * Handle search classes request
 */
async function handleSearchClasses(
  request: SearchClassesRequest
): Promise<SearchClassesResponse> {
  const { query, limit = 50, offset = 0 } = request;
  const cacheKey = `${query}:${limit}:${offset}`;

  console.log('[UX Builder TW] Searching classes with query:', query);

  // Check cache
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log('[UX Builder TW] Returning cached search results:', cached.data.length);
    return { action: 'searchClasses', data: cached.data };
  }

  try {
    const url = `${BACKEND_URL}/api/classes/search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`;
    console.log('[UX Builder TW] Fetching from:', url);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const apiResponse: ApiResponse<TailwindClass[]> = await response.json();

    if ('error' in apiResponse) {
      console.warn('[UX Builder TW] API error:', apiResponse.error);
      return {
        action: 'searchClasses',
        error: apiResponse.error,
        message: apiResponse.message,
      };
    }

    console.log('[UX Builder TW] Found', apiResponse.data.length, 'classes');

    // Cache result
    searchCache.set(cacheKey, {
      data: apiResponse.data,
      timestamp: Date.now(),
    });

    return { action: 'searchClasses', data: apiResponse.data };
  } catch (error) {
    console.error('[UX Builder TW] Search failed:', error);
    return {
      action: 'searchClasses',
      error: 'NETWORK_ERROR',
      message: `Failed to connect to backend: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Handle validate classes request
 */
async function handleValidateClasses(
  request: ValidateClassesRequest
): Promise<ValidateClassesResponse> {
  const { classNames } = request;
  const cacheKey = classNames.join(',');

  // Check cache
  const cached = validationCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log('[UX Builder TW] Returning cached validation results');
    return { action: 'validateClasses', data: cached.data };
  }

  try {
    const url = `${BACKEND_URL}/api/classes/validate`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classNames }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const apiResponse: ApiResponse<ValidationResult[]> = await response.json();

    if ('error' in apiResponse) {
      return {
        action: 'validateClasses',
        error: apiResponse.error,
        message: apiResponse.message,
      };
    }

    // Cache result
    validationCache.set(cacheKey, {
      data: apiResponse.data,
      timestamp: Date.now(),
    });

    return { action: 'validateClasses', data: apiResponse.data };
  } catch (error) {
    console.error('[UX Builder TW] Validation failed:', error);
    return {
      action: 'validateClasses',
      error: 'NETWORK_ERROR',
      message: `Failed to connect to backend: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Handle get custom classes request
 */
async function handleGetCustomClasses(
  request: GetCustomClassesRequest
): Promise<GetCustomClassesResponse> {
  // Check cache
  if (customClassesCache && Date.now() - customClassesCache.timestamp < CACHE_TTL_MS) {
    console.log('[UX Builder TW] Returning cached custom classes');
    return { action: 'getCustomClasses', data: customClassesCache.data };
  }

  try {
    const url = `${BACKEND_URL}/api/custom-classes`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const apiResponse: ApiResponse<CustomClass[]> = await response.json();

    if ('error' in apiResponse) {
      return {
        action: 'getCustomClasses',
        error: apiResponse.error,
        message: apiResponse.message,
      };
    }

    // Cache result
    customClassesCache = {
      data: apiResponse.data,
      timestamp: Date.now(),
    };

    return { action: 'getCustomClasses', data: apiResponse.data };
  } catch (error) {
    console.error('[UX Builder TW] Get custom classes failed:', error);
    return {
      action: 'getCustomClasses',
      error: 'NETWORK_ERROR',
      message: `Failed to connect to backend: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Handle get status request
 */
async function handleGetStatus(request: GetStatusRequest): Promise<GetStatusResponse> {
  // Check cache
  if (statusCache && Date.now() - statusCache.timestamp < CACHE_TTL_MS) {
    console.log('[UX Builder TW] Returning cached status');
    return { action: 'getStatus', data: statusCache.data };
  }

  try {
    const url = `${BACKEND_URL}/api/status`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const apiResponse: ApiResponse<ServerStatus> = await response.json();

    if ('error' in apiResponse) {
      return {
        action: 'getStatus',
        error: apiResponse.error,
        message: apiResponse.message,
      };
    }

    // Cache result
    statusCache = {
      data: apiResponse.data,
      timestamp: Date.now(),
    };

    return { action: 'getStatus', data: apiResponse.data };
  } catch (error) {
    console.error('[UX Builder TW] Get status failed:', error);
    return {
      action: 'getStatus',
      error: 'NETWORK_ERROR',
      message: `Failed to connect to backend: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Handle update config request
 */
async function handleUpdateConfig(
  request: UpdateConfigRequest
): Promise<UpdateConfigResponse> {
  const { config } = request;

  try {
    const url = `${BACKEND_URL}/api/config`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const apiResponse: ApiResponse<BackendConfig> = await response.json();

    if ('error' in apiResponse) {
      return {
        action: 'updateConfig',
        error: apiResponse.error,
        message: apiResponse.message,
      };
    }

    // Clear caches after config update
    clearAllCaches();

    return { action: 'updateConfig', data: apiResponse.data };
  } catch (error) {
    console.error('[UX Builder TW] Update config failed:', error);
    return {
      action: 'updateConfig',
      error: 'NETWORK_ERROR',
      message: `Failed to connect to backend: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Check backend status on startup
 */
async function checkBackendStatus(): Promise<void> {
  try {
    const status = await handleGetStatus({ action: 'getStatus' });
    if ('data' in status) {
      console.log('[UX Builder TW] Backend is online:', status.data);
    } else {
      console.warn('[UX Builder TW] Backend is offline or unreachable');
    }
  } catch (error) {
    console.error('[UX Builder TW] Failed to check backend status:', error);
  }
}

/**
 * Clear all caches
 */
function clearAllCaches(): void {
  searchCache.clear();
  validationCache.clear();
  customClassesCache = null;
  statusCache = null;
  console.log('[UX Builder TW] All caches cleared');
}

