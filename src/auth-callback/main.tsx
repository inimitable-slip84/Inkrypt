import React from 'react';
import ReactDOM from 'react-dom/client';
import AuthRedirectScreen from '../popup/components/AuthRedirectScreen';
import { consumeAuthRedirectFromUrl } from '../popup/authFromUrl';
import { useThemeStore } from '../popup/themeStore';
import '../popup/index.css';

document.documentElement.setAttribute('data-theme', useThemeStore.getState().theme);

async function boot(): Promise<void> {
  const r = await consumeAuthRedirectFromUrl();
  const root = document.getElementById('root');
  if (!root) return;

  if (r.kind === 'ok' || r.kind === 'error') {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <AuthRedirectScreen result={r} />
      </React.StrictMode>
    );
    return;
  }

  root.innerHTML = `<div class="vault-shell vault-shell--dashboard"><div class="vault-shell__inner flex items-center justify-center p-8 text-center text-sm text-vault-muted" style="width:818px;height:728px">Nothing to confirm on this link. You can close this tab.</div></div>`;
}

void boot();
