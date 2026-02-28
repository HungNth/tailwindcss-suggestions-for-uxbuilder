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
 * Popup settings panel for UX Builder Tailwind CSS extension.
 *
 * Shows bundled class count (always available offline), backend connection
 * status, custom classes, and configuration options.
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
   * Load status and custom classes from background script
   */
  const loadData = async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const statusRequest: GetStatusRequest = { action: 'getStatus' };
      const statusResponse = await browser.runtime.sendMessage<GetStatusRequest, GetStatusResponse>(
        statusRequest
      );

      if ('data' in statusResponse && statusResponse.data) {
        setStatus(statusResponse.data);
        setCssFilePath(statusResponse.data.config?.cssFilePath || '');
      } else {
        setError(statusResponse.message || 'Failed to get status');
      }

      const customRequest: GetCustomClassesRequest = { action: 'getCustomClasses' };
      const customResponse = await browser.runtime.sendMessage<
        GetCustomClassesRequest,
        GetCustomClassesResponse
      >(customRequest);

      if ('data' in customResponse && customResponse.data) {
        setCustomClasses(customResponse.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Save configuration to backend
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

  const formatTime = (timestamp: number | string): string => {
    const time = typeof timestamp === 'string' ? Date.parse(timestamp) : timestamp;
    return new Date(time).toLocaleString();
  };

  const isBackendOnline = status?.backendOnline ?? false;

  // Loading state
  if (loading) {
    return (
      <div className="popup-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

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

      {/* Extension Status — always shows, works offline */}
      <section className="section">
        <h2>Status</h2>
        <div className="status-grid">
          <div className="status-item">
            <span className="status-label">Bundled Classes:</span>
            <span className="status-value">
              {(status?.tailwindClassCount ?? status?.totalClasses ?? 0).toLocaleString()}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Backend:</span>
            <span
              className={`status-value ${isBackendOnline ? 'status-online' : 'status-offline'}`}
            >
              {isBackendOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Custom Classes:</span>
            <span className="status-value">
              {status?.customClassCount ?? status?.totalCustomClasses ?? 0}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Last Updated:</span>
            <span className="status-value status-time">
              {status ? formatTime(status.lastUpdated) : 'N/A'}
            </span>
          </div>
        </div>
      </section>

      {/* Offline mode info */}
      {!isBackendOnline && (
        <section className="section">
          <div className="info-banner">
            Running in offline mode. Standard Tailwind classes are available. Start the backend
            server at <code>http://localhost:3456</code> to use custom CSS classes.
          </div>
        </section>
      )}

      {/* Configuration — only useful when backend is online */}
      <section className="section">
        <h2>Custom CSS Configuration</h2>
        {isBackendOnline ? (
          <>
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
                Path to your custom CSS file with @apply directives. Leave empty to use only
                Tailwind utilities.
              </p>
            </div>
            <button onClick={handleSaveConfig} className="btn-primary">
              Save Configuration
            </button>
          </>
        ) : (
          <p className="help-text">
            Connect the backend server to configure custom CSS file watching.
          </p>
        )}
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
