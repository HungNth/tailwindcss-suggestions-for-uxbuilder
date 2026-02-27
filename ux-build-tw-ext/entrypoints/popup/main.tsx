import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './style.css';

console.log('[Popup Main] Starting popup...');

const rootElement = document.getElementById('root');
console.log('[Popup Main] Root element:', rootElement);

if (!rootElement) {
  console.error('[Popup Main] Root element not found!');
  document.body.innerHTML = '<div style="padding: 20px; color: red;">Error: Root element not found</div>';
} else {
  try {
    console.log('[Popup Main] Creating React root...');
    const root = ReactDOM.createRoot(rootElement);
    console.log('[Popup Main] Rendering App...');
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
    console.log('[Popup Main] App rendered successfully');
  } catch (error) {
    console.error('[Popup Main] Error rendering app:', error);
    document.body.innerHTML = `<div style="padding: 20px; color: red;">Error: ${error instanceof Error ? error.message : 'Unknown error'}</div>`;
  }
}
