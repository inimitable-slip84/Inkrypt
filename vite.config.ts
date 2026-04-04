import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: '',
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL ?? ''),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY ?? ''),
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(manifest.version ?? '0.0.0'),
    },
    plugins: [react(), crx({ manifest })],
    build: {
      rollupOptions: {
        input: {
          popup: resolve(__dirname, 'popup.html'),
          'auth-callback': resolve(__dirname, 'auth-callback.html'),
        },
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      hmr: { port: 5173 },
    },
  };
});
