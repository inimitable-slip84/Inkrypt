import { useEffect, useState } from 'react';
import { BRANDING_STORAGE_MAIN_LOGO } from '../../constants/branding';

const DEFAULT_SRC = `${import.meta.env.BASE_URL}brand/mainlogo.png`;

export function useBrandingMainLogoSrc(): string {
  const [src, setSrc] = useState(DEFAULT_SRC);

  useEffect(() => {
    void chrome.storage.local.get(BRANDING_STORAGE_MAIN_LOGO).then((o) => {
      const v = o[BRANDING_STORAGE_MAIN_LOGO];
      setSrc(typeof v === 'string' && v.startsWith('data:') ? v : DEFAULT_SRC);
    });

    const onChange: Parameters<typeof chrome.storage.onChanged.addListener>[0] = (changes, area) => {
      if (area !== 'local' || !changes[BRANDING_STORAGE_MAIN_LOGO]) return;
      const nv = changes[BRANDING_STORAGE_MAIN_LOGO].newValue;
      setSrc(typeof nv === 'string' && nv.startsWith('data:') ? nv : DEFAULT_SRC);
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => chrome.storage.onChanged.removeListener(onChange);
  }, []);

  return src;
}
