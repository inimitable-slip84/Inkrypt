import { BRANDING_STORAGE_TOOLBAR_ICON } from '../constants/branding';

const DEFAULT_PATH_DICT = {
  16: 'brand/logo.png',
  32: 'brand/logo.png',
  48: 'brand/logo.png',
  128: 'brand/logo.png',
} as const;

/** Resolves true if Chrome accepted the icon; never throws. */
function setActionIconAccept(details: chrome.action.TabIconDetails): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      chrome.action.setIcon(details, () => {
        resolve(!chrome.runtime.lastError?.message);
      });
    } catch {
      resolve(false);
    }
  });
}

async function applyDefaultToolbarIcon(): Promise<void> {
  if (await setActionIconAccept({ path: 'brand/logo.png' })) return;
  await setActionIconAccept({ path: DEFAULT_PATH_DICT });
}

async function imageDataFromDataUrl(dataUrl: string, size: number): Promise<ImageData> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob);
  try {
    const scaled =
      bitmap.width === size && bitmap.height === size
        ? bitmap
        : await createImageBitmap(bitmap, {
            resizeWidth: size,
            resizeHeight: size,
            resizeQuality: 'high',
          });
    try {
      const canvas = new OffscreenCanvas(size, size);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('no 2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(scaled, 0, 0);
      return ctx.getImageData(0, 0, size, size);
    } finally {
      if (scaled !== bitmap) scaled.close();
    }
  } finally {
    bitmap.close();
  }
}

async function trySetIconFromDataUrl(dataUrl: string): Promise<boolean> {
  try {
    const img128 = await imageDataFromDataUrl(dataUrl, 128);
    if (await setActionIconAccept({ imageData: img128 })) {
      return true;
    }

    const sizes = [16, 32, 48, 128] as const;
    const map: Record<number, ImageData> = {};
    for (const s of sizes) {
      map[s] = await imageDataFromDataUrl(dataUrl, s);
    }
    if (await setActionIconAccept({ imageData: map })) {
      return true;
    }
  } catch {
    /* try fallbacks below */
  }
  return false;
}

export async function applyToolbarIconFromStorage(): Promise<void> {
  try {
    const raw = (
      await chrome.storage.local.get(BRANDING_STORAGE_TOOLBAR_ICON)
    )[BRANDING_STORAGE_TOOLBAR_ICON];
    const dataUrl = typeof raw === 'string' && raw.startsWith('data:') ? raw : null;

    if (!dataUrl) {
      await applyDefaultToolbarIcon();
      return;
    }

    const ok = await trySetIconFromDataUrl(dataUrl);
    if (!ok) {
      await chrome.storage.local.remove(BRANDING_STORAGE_TOOLBAR_ICON);
      await applyDefaultToolbarIcon();
    }
  } catch {
    try {
      await chrome.storage.local.remove(BRANDING_STORAGE_TOOLBAR_ICON);
    } catch {
      /* ignore */
    }
    await applyDefaultToolbarIcon();
  }
}
