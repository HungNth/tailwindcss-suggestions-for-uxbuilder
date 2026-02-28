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
  CustomClass,
  BackendConfig,
} from '@ux-builder-tw/shared';
import { BACKEND_URL, CACHE_TTL_MS } from '@ux-builder-tw/shared';
import {
  setStandardClasses,
  setCustomClasses,
  searchClasses,
  searchCustom,
  validateClass,
  getCustomClasses,
  getStats,
} from '~/utils/class-store';

/**
 * Background service worker for UX Builder Tailwind CSS extension.
 *
 * Architecture: offline-first
 * - Standard Tailwind classes are loaded from bundled JSON (zero network)
 * - Custom classes (@apply) are fetched from backend when available
 * - Search and validation are fully local, instant operations
 */
export default defineBackground(() => {
  console.log('[UX Builder TW] Background service worker started');

  loadBundledClasses();
  browser.runtime.onMessage.addListener(handleMessage);
  checkBackendStatus();
});

/** Whether the backend server is currently reachable */
let backendOnline = false;

/** Shorter TTL for refreshing custom classes during search (30s) */
const CUSTOM_REFRESH_INTERVAL_MS = 30 * 1000;

/** Timer handle for periodic custom class refresh */
let customRefreshTimer: ReturnType<typeof setInterval> | null = null;

/** Cache for custom classes (only thing still fetched from network) */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
let customClassesCache: CacheEntry<CustomClass[]> | null = null;

/**
 * Load standard Tailwind classes from bundled JSON in extension assets
 */
async function loadBundledClasses(): Promise<void> {
  try {
    // Cast needed: WXT's PublicPath type is auto-generated and may not include data/ files
    const url: string = browser.runtime.getURL('/data/tailwind-classes.json');
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load bundled classes: ${response.status}`);
    }
    const data: { version: string; totalClasses: number; classes: TailwindClass[] } =
      await response.json();
    setStandardClasses(data.classes);
    console.log(`[UX Builder TW] Loaded ${data.totalClasses} bundled classes (v${data.version})`);
  } catch (error) {
    console.error('[UX Builder TW] Failed to load bundled classes:', error);
  }
}

/**
 * Handle messages from content scripts and popup
 */
function handleMessage(
  message: ExtensionMessage,
  _sender: unknown,
  sendResponse: (response: ExtensionMessage) => void
): boolean {
  (async () => {
    let response: ExtensionMessage;

    switch (message.action) {
      case 'searchClasses':
        response = await handleSearchClasses(message as SearchClassesRequest);
        break;

      case 'validateClasses':
        response = handleValidateClasses(message as ValidateClassesRequest);
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
          message: `Action "${(message as ExtensionMessage).action}" is not supported`,
        } as ExtensionMessage;
    }

    sendResponse(response);
  })();

  // Return true to indicate async response
  return true;
}

/**
 * Search classes — combines standard + custom results, prefix matches first.
 * Refreshes custom classes from backend if cache is stale and backend is online.
 */
async function handleSearchClasses(request: SearchClassesRequest): Promise<SearchClassesResponse> {
  const { query, limit = 50, offset = 0 } = request;

  // If backend is online and custom cache is stale, refresh before searching
  if (backendOnline && isCustomCacheStale()) {
    await refreshCustomClassesFromBackend();
  }

  const standardResults = searchClasses(query, limit, offset);
  const customResults = searchCustom(query, limit);

  // Convert custom classes to TailwindClass shape for uniform response
  const customAsTailwind: TailwindClass[] = customResults.map((c) => ({
    name: c.name,
    css: c.css,
    category: 'custom',
  }));

  const combined = [...standardResults, ...customAsTailwind].slice(0, limit);
  return { action: 'searchClasses', data: combined };
}

/**
 * Validate classes — SYNC, no network, instant
 */
function handleValidateClasses(request: ValidateClassesRequest): ValidateClassesResponse {
  const { classNames } = request;
  const results = classNames.map((className: string) => ({
    className,
    valid: validateClass(className),
  }));
  return { action: 'validateClasses', data: results };
}

/**
 * Check if the custom classes cache is stale (older than CUSTOM_REFRESH_INTERVAL_MS)
 */
function isCustomCacheStale(): boolean {
  if (!customClassesCache) return true;
  return Date.now() - customClassesCache.timestamp > CUSTOM_REFRESH_INTERVAL_MS;
}

/**
 * Fetch custom classes from the backend and update the local store + cache.
 * Silently fails — search still works with whatever is in the local store.
 */
async function refreshCustomClassesFromBackend(): Promise<void> {
  try {
    const url = `${BACKEND_URL}/api/custom-classes`;
    const response = await fetch(url);
    if (!response.ok) return;

    const apiResponse: ApiResponse<CustomClass[]> = await response.json();
    if ('error' in apiResponse) return;

    setCustomClasses(apiResponse.data);
    customClassesCache = { data: apiResponse.data, timestamp: Date.now() };
  } catch {
    // Silently fail — local store still has whatever was last loaded
  }
}

/**
 * Get custom classes — ASYNC, fetches from backend if available
 * Falls back to locally cached custom classes when backend is offline
 */
async function handleGetCustomClasses(
  _request: GetCustomClassesRequest
): Promise<GetCustomClassesResponse> {
  // Return cache if still fresh
  if (customClassesCache && Date.now() - customClassesCache.timestamp < CACHE_TTL_MS) {
    return { action: 'getCustomClasses', data: customClassesCache.data };
  }

  // Return local store if backend is offline
  if (!backendOnline) {
    return { action: 'getCustomClasses', data: getCustomClasses() };
  }

  try {
    const url = `${BACKEND_URL}/api/custom-classes`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const apiResponse: ApiResponse<CustomClass[]> = await response.json();
    if ('error' in apiResponse) {
      return {
        action: 'getCustomClasses',
        error: apiResponse.error,
        message: apiResponse.message,
      };
    }

    // Update local store and cache
    setCustomClasses(apiResponse.data);
    customClassesCache = { data: apiResponse.data, timestamp: Date.now() };
    return { action: 'getCustomClasses', data: apiResponse.data };
  } catch (error) {
    console.error('[UX Builder TW] Get custom classes failed:', error);
    return { action: 'getCustomClasses', data: getCustomClasses() };
  }
}

/**
 * Get status — returns local stats + backend connection status
 */
async function handleGetStatus(_request: GetStatusRequest): Promise<GetStatusResponse> {
  const stats = getStats();
  let backendInfo = {
    running: false,
    watchedFile: null as string | null,
    totalCustom: stats.totalCustom,
    config: {} as Record<string, unknown>,
  };

  try {
    const response = await fetch(`${BACKEND_URL}/api/status`);
    if (response.ok) {
      const apiResponse = await response.json();
      if ('data' in apiResponse) {
        backendOnline = true;
        if (!customRefreshTimer) startCustomClassPolling();
        backendInfo = {
          running: true,
          watchedFile: apiResponse.data.watchedFile,
          totalCustom: apiResponse.data.totalCustomClasses || stats.totalCustom,
          config: apiResponse.data.config || {},
        };
      }
    }
  } catch {
    backendOnline = false;
    stopCustomClassPolling();
  }

  return {
    action: 'getStatus',
    data: {
      running: true,
      tailwindVersion: '4.0',
      totalClasses: stats.totalStandard,
      tailwindClassCount: stats.totalStandard,
      totalCustomClasses: backendInfo.totalCustom,
      customClassCount: backendInfo.totalCustom,
      watchedFile: backendInfo.watchedFile,
      lastUpdated: new Date().toISOString(),
      backendOnline: backendInfo.running,
      config: backendInfo.config,
    },
  };
}

/**
 * Update config — sends config to backend, then refreshes custom classes
 */
async function handleUpdateConfig(request: UpdateConfigRequest): Promise<UpdateConfigResponse> {
  const { config } = request;

  try {
    const response = await fetch(`${BACKEND_URL}/api/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const apiResponse: ApiResponse<BackendConfig> = await response.json();
    if ('error' in apiResponse) {
      return { action: 'updateConfig', error: apiResponse.error, message: apiResponse.message };
    }

    // Clear custom class cache and re-fetch
    customClassesCache = null;
    backendOnline = true;
    await handleGetCustomClasses({ action: 'getCustomClasses' });

    return { action: 'updateConfig', data: apiResponse.data };
  } catch {
    return {
      action: 'updateConfig',
      error: 'NETWORK_ERROR',
      message: `Failed to connect to backend at ${BACKEND_URL}. Make sure the backend server is running.`,
    };
  }
}

/**
 * Check backend status on startup and load custom classes if available.
 * Starts periodic custom class refresh if backend is online.
 */
async function checkBackendStatus(): Promise<void> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/status`);
    if (response.ok) {
      backendOnline = true;
      console.log('[UX Builder TW] Backend is online');
      // Pre-fetch custom classes
      await handleGetCustomClasses({ action: 'getCustomClasses' });
      startCustomClassPolling();
    } else {
      backendOnline = false;
      console.log('[UX Builder TW] Backend offline (extension works offline)');
    }
  } catch {
    backendOnline = false;
    console.log('[UX Builder TW] Backend unreachable (extension works offline)');
  }
}

/**
 * Start periodic polling for custom classes from the backend.
 * Polling runs every CUSTOM_REFRESH_INTERVAL_MS when backend is online.
 */
function startCustomClassPolling(): void {
  if (customRefreshTimer) return; // Already running
  customRefreshTimer = setInterval(async () => {
    if (!backendOnline) {
      stopCustomClassPolling();
      return;
    }
    await refreshCustomClassesFromBackend();
  }, CUSTOM_REFRESH_INTERVAL_MS);
}

/**
 * Stop periodic custom class polling.
 */
function stopCustomClassPolling(): void {
  if (customRefreshTimer) {
    clearInterval(customRefreshTimer);
    customRefreshTimer = null;
  }
}
