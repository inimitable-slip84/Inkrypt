import { BRANDING_STORAGE_TOOLBAR_ICON } from '../../constants/branding';

export function defaultToolbarIconUrl(): string {
  return typeof chrome !== 'undefined' && chrome.runtime?.getURL
    ? chrome.runtime.getURL('brand/logo.png')
    : '';
}

let cachedToolbarIconUrl: string | null = null;

export async function getToolbarIconUrl(): Promise<string> {
  if (cachedToolbarIconUrl) return cachedToolbarIconUrl;
  try {
    const o = await chrome.storage.local.get(BRANDING_STORAGE_TOOLBAR_ICON);
    const v = o[BRANDING_STORAGE_TOOLBAR_ICON];
    cachedToolbarIconUrl =
      typeof v === 'string' && v.startsWith('data:') ? v : defaultToolbarIconUrl();
  } catch {
    cachedToolbarIconUrl = defaultToolbarIconUrl();
  }
  return cachedToolbarIconUrl || defaultToolbarIconUrl();
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes[BRANDING_STORAGE_TOOLBAR_ICON]) return;
  cachedToolbarIconUrl = null;
});
