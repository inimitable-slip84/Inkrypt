import { create } from 'zustand';

export type VaultTheme = 'light' | 'dark';

function readStoredTheme(): VaultTheme {
  try {
    const s = localStorage.getItem('vault-theme');
    if (s === 'light' || s === 'dark') return s;
  } catch {
    /* ignore */
  }
  return 'dark';
}

/** Keeps page-injected autofill UI in sync with the popup theme. */
function syncThemeToExtensionStorage(theme: VaultTheme): void {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      void chrome.storage.local.set({ vaultTheme: theme });
    }
  } catch {
    /* ignore */
  }
}

type ThemeState = {
  theme: VaultTheme;
  setTheme: (t: VaultTheme) => void;
  toggleTheme: () => void;
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: readStoredTheme(),
  setTheme: (theme) => {
    try {
      localStorage.setItem('vault-theme', theme);
    } catch {
      /* ignore */
    }
    syncThemeToExtensionStorage(theme);
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },
}));
