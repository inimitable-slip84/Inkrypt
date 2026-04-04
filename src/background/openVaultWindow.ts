/**
 * Opens the extension action popup — the same UI as clicking the Inkrypt icon in the toolbar.
 * Avoids chrome.windows.create(), which opens a separate floating window (unlike normal extensions).
 */
export async function focusOrOpenVaultPopupWindow(
  windowId?: number
): Promise<void> {
  const open = chrome.action?.openPopup;
  if (typeof open !== 'function') return;

  const withWindow =
    windowId != null && Number.isFinite(windowId)
      ? { windowId }
      : undefined;

  try {
    await open.call(chrome.action, withWindow);
    return;
  } catch {
    /* openPopup may reject (e.g. no user gesture, or unsupported build) */
  }

  if (withWindow) {
    try {
      await open.call(chrome.action);
    } catch {
      /* ignore */
    }
  }
}
