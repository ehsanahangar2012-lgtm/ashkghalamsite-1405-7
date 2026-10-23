import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import '@fontsource/vazirmatn';

// Suppress known iframe environment WebSocket reconnection logs when HMR is disabled
window.addEventListener('error', (event) => {
  if (
    event.message?.includes('WebSocket') || 
    event.message?.includes('createWebSocketModuleRunnerTransport') ||
    event.filename?.includes('@vite/client')
  ) {
    event.stopImmediatePropagation();
    event.preventDefault();
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const reasonStr = String(event.reason || '');
  if (reasonStr.includes('WebSocket') || reasonStr.includes('createWebSocketModuleRunnerTransport')) {
    event.stopImmediatePropagation();
    event.preventDefault();
  }
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);