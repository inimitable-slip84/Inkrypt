import { useEffect, useState } from 'react';
import type { AuthState } from '../../types/auth';
import { sendMessage } from '../api';
type Props = {
  onUnlocked: () => void;
  /** Called after sign-out so routing returns to sign-in (e.g. user forgot master password). */
  onLogout: () => void | Promise<void>;
};

type AppState = {
  auth: AuthState;
  vaultUnlocked: boolean;
  vault2faEnabled: boolean;
};

export default function Unlock({ onUnlocked, onLogout }: Props) {
  const [masterPassword, setMasterPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [vault2faEnabled, setVault2faEnabled] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const st = await sendMessage<AppState>({ type: 'GET_STATE' });
        setVault2faEnabled(!!st.vault2faEnabled);
      } catch {
        setVault2faEnabled(false);
      }
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await sendMessage({
        type: 'UNLOCK_VAULT',
        masterPassword,
        ...(vault2faEnabled ? { totpCode: totpCode.replace(/\s/g, '') } : {}),
      });
      await onUnlocked();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not unlock');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setErr(null);
    setBusy(true);
    try {
      await sendMessage({ type: 'SIGN_OUT' });
      await onLogout();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not sign out');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="vault-page vault-view-scroll max-w-md min-h-0 px-4 py-4">
      <p className="text-sm leading-relaxed text-vault-muted">
        Your encryption key is derived from this master password and never leaves your device. You
        can use the same password as your account, or a different one.
      </p>
      {vault2faEnabled && (
        <p className="mt-3 rounded-lg border border-vault-border bg-vault-surface px-3 py-2 text-xs leading-relaxed text-vault-muted">
          This vault is protected with an authenticator app. Enter your master password and the
          current 6-digit code.
        </p>
      )}
      <form onSubmit={submit} className="mt-5 space-y-3">
        <input
          type="password"
          required
          className="vault-input"
          placeholder="Master password"
          value={masterPassword}
          onChange={(e) => setMasterPassword(e.target.value)}
          autoComplete="off"
        />
        {vault2faEnabled && (
          <div>
            <label htmlFor="vault-unlock-totp" className="mb-1 block text-[0.65rem] font-bold uppercase tracking-[0.14em] text-vault-subtle">
              Authenticator code
            </label>
            <input
              id="vault-unlock-totp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              className="vault-input text-center font-mono text-lg tracking-[0.35em]"
              placeholder="000000"
              maxLength={6}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
          </div>
        )}
        {err && <p className="text-sm text-vault-danger">{err}</p>}
        <button type="submit" disabled={busy} className="vault-btn-primary">
          {busy ? 'Unlocking…' : 'Unlock'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm leading-relaxed text-vault-muted">
        Forgot your master password?{' '}
        <button
          type="button"
          onClick={logout}
          disabled={busy}
          className="vault-link inline align-baseline disabled:opacity-40"
        >
          Log out
        </button>{' '}
        and sign in with a different account.
      </p>
    </div>
  );
}
