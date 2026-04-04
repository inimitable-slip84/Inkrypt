import { VAULT_EXT_CSS, VAULT_EXT_FONT_HREF } from '../vault-page-styles';
import type { ExtTheme } from './types';

let extTheme: ExtTheme = 'dark';
let uiInjected = false;

export function ensureVaultPageUiInjected(): void {
  if (uiInjected) return;
  uiInjected = true;
  if (!document.getElementById('vault-ext-fonts')) {
    const link = document.createElement('link');
    link.id = 'vault-ext-fonts';
    link.rel = 'stylesheet';
    link.href = VAULT_EXT_FONT_HREF;
    document.head.appendChild(link);
  }
  if (!document.getElementById('vault-ext-ui-css')) {
    const style = document.createElement('style');
    style.id = 'vault-ext-ui-css';
    style.textContent = VAULT_EXT_CSS;
    document.head.appendChild(style);
  }
}

export function applyExtThemeToElement(el: HTMLElement): void {
  el.setAttribute('data-vault-ext', '1');
  el.setAttribute('data-vault-ext-theme', extTheme);
}

export function refreshAllExtThemeRoots(): void {
  document.querySelectorAll<HTMLElement>('[data-vault-ext]').forEach((el) => {
    el.setAttribute('data-vault-ext-theme', extTheme);
  });
}

export function initExtThemeFromStorage(): void {
  try {
    chrome.storage.local.get(['vaultTheme'], (r) => {
      if (r.vaultTheme === 'light' || r.vaultTheme === 'dark') {
        extTheme = r.vaultTheme;
      } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        extTheme = 'light';
      }
      refreshAllExtThemeRoots();
    });
  } catch {
    if (window.matchMedia('(prefers-color-scheme: light)').matches) extTheme = 'light';
  }
}

try {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes.vaultTheme) return;
    const v = changes.vaultTheme.newValue;
    if (v === 'light' || v === 'dark') {
      extTheme = v;
      refreshAllExtThemeRoots();
    }
  });
} catch {
  /* ignore */
}
