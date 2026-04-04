import { getSupabaseClientWithUrlDetection } from '../utils/supabase';

export type AuthUrlResult =
  | { kind: 'noop' }
  | { kind: 'ok' }
  | { kind: 'error'; message: string };

const POLL_ATTEMPTS = 20;
const POLL_INTERVAL_MS = 80;
const LISTENER_TIMEOUT_MS = 12_000;

const LINK_ERROR =
  'Could not complete sign-in from this link. Try opening Inkrypt and signing in.';

function clearAuthFromUrl(): void {
  const u = new URL(window.location.href);
  u.hash = '';
  u.search = '';
  window.history.replaceState(null, document.title, u.pathname);
}

function parseOAuthError(hash: URLSearchParams, query: URLSearchParams): string | null {
  const code = hash.get('error') ?? query.get('error');
  if (!code) return null;
  const raw = hash.get('error_description') ?? query.get('error_description') ?? code;
  return decodeURIComponent(raw.replace(/\+/g, ' '));
}

function isAuthRedirectUrl(hash: URLSearchParams, query: URLSearchParams): boolean {
  const implicit =
    hash.has('access_token') || hash.has('refresh_token') || hash.has('type');
  return implicit || query.has('code');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForSessionEvent(
  client: ReturnType<typeof getSupabaseClientWithUrlDetection>
): Promise<void> {
  return new Promise((resolve, reject) => {
    let subscription: { unsubscribe: () => void } | null = null;
    const to = window.setTimeout(() => {
      subscription?.unsubscribe();
      reject(new Error('timeout'));
    }, LISTENER_TIMEOUT_MS);

    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (!session) return;
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        window.clearTimeout(to);
        subscription?.unsubscribe();
        resolve();
      }
    });
    subscription = data.subscription;
  });
}

export async function consumeAuthRedirectFromUrl(): Promise<AuthUrlResult> {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const query = new URLSearchParams(window.location.search.replace(/^\?/, ''));

  const oauthErr = parseOAuthError(hash, query);
  if (oauthErr) {
    clearAuthFromUrl();
    return { kind: 'error', message: oauthErr };
  }

  if (!isAuthRedirectUrl(hash, query)) {
    return { kind: 'noop' };
  }

  const client = getSupabaseClientWithUrlDetection();

  for (let i = 0; i < POLL_ATTEMPTS; i++) {
    if (i > 0) await delay(POLL_INTERVAL_MS);
    const { data, error } = await client.auth.getSession();
    if (error) {
      clearAuthFromUrl();
      return { kind: 'error', message: error.message };
    }
    if (data.session) {
      clearAuthFromUrl();
      return { kind: 'ok' };
    }
  }

  try {
    await waitForSessionEvent(client);
    clearAuthFromUrl();
    return { kind: 'ok' };
  } catch {
    clearAuthFromUrl();
    return { kind: 'error', message: LINK_ERROR };
  }
}
