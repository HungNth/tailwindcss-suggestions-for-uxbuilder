import { useState, useEffect } from 'react';
import type {
  GetStatusRequest,
  GetStatusResponse,
  GetCustomClassesRequest,
  GetCustomClassesResponse,
  UpdateConfigRequest,
  UpdateConfigResponse,
  ServerStatus,
  CustomClass,
  BackendConfig,
} from '@ux-builder-tw/shared';
import './App.css';

/**
 * Popup settings panel for UX Builder Tailwind CSS extension
 * Shows backend status, custom classes, and configuration options
 */
function App() {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [customClasses, setCustomClasses] = useState<CustomClass[]>([]);
  const [cssFilePath, setCssFilePath] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Load initial data on mount
  useEffect(() => {
    loadData();
  }, []);

  /**
   * Load backend status and custom classes
   */
  const loadData = async (): Promise<void> => {
    console.log('[Popup] Loading data...');
    setLoading(true);
    setError(null);

    try {
      // Get backend status
      console.log('[Popup] Requesting backend status...');
      const statusRequest: GetStatusRequest = { action: 'getStatus' };
      const statusResponse = await browser.runtime.sendMessage<GetStatusRequest, GetStatusResponse>(
        statusRequest
      );

      console.log('[Popup] Status response:', statusResponse);

      if ('data' in statusResponse && statusResponse.data) {
        console.log('[Popup] Got status data:', statusResponse.data);
        setStatus(statusResponse.data);
        setCssFilePath(statusResponse.data.config?.cssFilePath || '');
      } else {
        console.error('[Popup] Status error:', statusResponse);
        setError(statusResponse.message || 'Failed to get backend status');
      }

      // Get custom classes
      console.log('[Popup] Requesting custom classes...');
      const customRequest: GetCustomClassesRequest = { action: 'getCustomClasses' };
      const customResponse = await browser.runtime.sendMessage<
        GetCustomClassesRequest,
        GetCustomClassesResponse
      >(customRequest);

      console.log('[Popup] Custom classes response:', customResponse);

      if ('data' in customResponse && customResponse.data) {
        console.log('[Popup] Got custom classes:', customResponse.data.length);
        setCustomClasses(customResponse.data);
      }
    } catch (err) {
      console.error('[Popup] Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      console.log('[Popup] Loading complete');
    }
  };

  /**
   * Save configuration
   */
  const handleSaveConfig = async (): Promise<void> => {
    setSaveMessage(null);
    setError(null);

    try {
      const config: BackendConfig = {
        cssFilePath: cssFilePath.trim(),
      };

      const request: UpdateConfigRequest = {
        action: 'updateConfig',
        config,
      };

      const response = await browser.runtime.sendMessage<UpdateConfigRequest, UpdateConfigResponse>(
        request
      );

      if ('data' in response) {
        setSaveMessage('Configuration saved successfully!');
        // Reload data to reflect changes
        setTimeout(() => {
          loadData();
          setSaveMessage(null);
        }, 2000);
      } else {
        setError(response.message || 'Failed to save configuration');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  /**
   * Format timestamp
   */
  const formatTime = (timestamp: number | string): string => {
    const time = typeof timestamp === 'string' ? Date.parse(timestamp) : timestamp;
    return new Date(time).toLocaleString();
  };

  console.log('[Popup] Render - loading:', loading, 'error:', error, 'status:', status);

  // Loading state
  if (loading) {
    console.log('[Popup] Showing loading state');
    return (
      <div className="popup-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  // Error state
  if (error && !status) {
    console.log('[Popup] Showing error state');
    return (
      <div className="popup-container">
        <div className="error-banner">
          <strong>Error:</strong> {error}
        </div>
        <p className="error-help">
          Make sure the backend server is running at <code>http://localhost:3000</code>
        </p>
        <button onClick={loadData} className="btn-primary">
          Retry
        </button>
      </div>
    );
  }

  console.log('[Popup] Showing main content');
  return (
    <div className="popup-container">
      <header className="popup-header">
        <h1>UX Builder Tailwind CSS</h1>
        <p className="subtitle">Autocomplete & Validation</p>
      </header>

      {error && (
        <div className="error-banner">
          <strong>Error:</strong> {error}
        </div>
      )}

      {saveMessage && <div className="success-banner">{saveMessage}</div>}

      {/* Backend Status */}
      <section className="section">
        <h2>Backend Status</h2>
        {status ? (
          <div className="status-grid">
            <div className="status-item">
              <span className="status-label">Server:</span>
              <span className="status-value status-online">Online</span>
            </div>
            <div className="status-item">
              <span className="status-label">Utility Classes:</span>
              <span className="status-value">
                {(status.tailwindClassCount ?? status.totalClasses ?? 0).toLocaleString()}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">Custom Classes:</span>
              <span className="status-value">
                {status.customClassCount ?? status.totalCustomClasses ?? 0}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">Last Updated:</span>
              <span className="status-value status-time">{formatTime(status.lastUpdated)}</span>
            </div>
          </div>
        ) : (
          <div className="status-offline">Offline</div>
        )}
      </section>

      {/* Configuration */}
      <section className="section">
        <h2>Configuration</h2>
        <div className="form-group">
          <label htmlFor="cssFilePath">CSS File Path (Optional)</label>
          <input
            type="text"
            id="cssFilePath"
            className="input"
            placeholder="/path/to/custom.css"
            value={cssFilePath}
            onChange={(e) => setCssFilePath(e.target.value)}
          />
          <p className="help-text">
            Path to your custom CSS file with @apply directives. Leave empty to use only Tailwind
            utilities.
          </p>
        </div>
        <button onClick={handleSaveConfig} className="btn-primary">
          Save Configuration
        </button>
      </section>

      {/* Custom Classes */}
      {customClasses.length > 0 && (
        <section className="section">
          <h2>Custom Classes ({customClasses.length})</h2>
          <div className="custom-classes-list">
            {customClasses.map((cls) => (
              <div key={cls.name} className="custom-class-item">
                <code className="class-name">.{cls.name}</code>
                <span className="class-source">{cls.source}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="popup-footer">
        <button onClick={loadData} className="btn-secondary">
          Refresh
        </button>
      </footer>
    </div>
  );
}

export default App;
