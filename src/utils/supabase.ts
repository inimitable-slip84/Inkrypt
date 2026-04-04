import { createClient, type SupportedStorage } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export function createChromeSupabaseAdapter(): SupportedStorage {
  return {
    getItem: (name) =>
      new Promise((resolve) => {
        chrome.storage.local.get(name, (items) => {
          const v = items[name];
          resolve(v !== undefined && v !== null ? String(v) : null);
        });
      }),
    setItem: (name, value) =>
      new Promise((resolve, reject) => {
        chrome.storage.local.set({ [name]: value }, () => {
          const err = chrome.runtime.lastError;
          if (err) reject(err);
          else resolve();
        });
      }),
    removeItem: (name) =>
      new Promise((resolve, reject) => {
        chrome.storage.local.remove(name, () => {
          const err = chrome.runtime.lastError;
          if (err) reject(err);
          else resolve();
        });
      }),
  };
}

const chromeAuthOptions = {
  storage: createChromeSupabaseAdapter(),
  persistSession: true,
  autoRefreshToken: true,
  storageKey: 'vault-supabase-auth',
} as const;

function createSupabaseClient(detectSessionInUrl: boolean) {
  if (!url || !anon) {
    throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  }
  return createClient(url, anon, {
    auth: {
      ...chromeAuthOptions,
      detectSessionInUrl,
    },
  });
}

export function getSupabaseClient() {
  return createSupabaseClient(false);
}

export function getSupabaseClientWithUrlDetection() {
  return createSupabaseClient(true);
}
