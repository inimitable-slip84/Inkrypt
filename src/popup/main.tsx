import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AuthRedirectScreen from './components/AuthRedirectScreen';
import { consumeAuthRedirectFromUrl } from './authFromUrl';
import { useThemeStore } from './themeStore';
import './index.css';

function syncDocumentTheme(): void {
  const theme = useThemeStore.getState().theme;
  document.documentElement.setAttribute('data-theme', theme);
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      void chrome.storage.local.set({ vaultTheme: theme });
    }
  } catch {}
}

async function bootstrap(): Promise<void> {
  syncDocumentTheme();

  const authUrl = await consumeAuthRedirectFromUrl();
  const root = document.getElementById('root');
  if (!root) return;

  const app =
    authUrl.kind === 'ok' || authUrl.kind === 'error' ? (
      <AuthRedirectScreen result={authUrl} />
    ) : (
      <App />
    );

  ReactDOM.createRoot(root).render(<React.StrictMode>{app}</React.StrictMode>);
}

void bootstrap();
