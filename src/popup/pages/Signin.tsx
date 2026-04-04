import { useState } from 'react';
import { sendMessage } from '../api';
import { useAppStore } from '../store';
import type { AuthState } from '../../types/auth';

type Props = {
  onSignedUp: () => void;
  onRefresh: () => void;
  mfaOnly?: boolean;
};

export default function Signin({ onSignedUp, onRefresh, mfaOnly }: Props) {
  const mfaCtx = useAppStore((s) => s.mfaSignin);
  const setMfaSignin = useAppStore((s) => s.setMfaSignin);
  const setView = useAppStore((s) => s.setView);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const st = await sendMessage<AuthState>({
        type: 'SIGN_IN',
        email: email.trim(),
        password,
      });
      if (st.status === 'needs_mfa') {
        setMfaSignin({
          factorId: st.factorId,
          challengeId: st.challengeId,
          email: st.email,
        });
        setView('signin-mfa');
      } else {
        await onRefresh();
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Sign in failed');
    } finally {
      setBusy(false);
    }
  }

  async function submitMfa(e: React.FormEvent) {
    e.preventDefault();
    if (!mfaCtx) return;
    setErr(null);
    setBusy(true);
    try {
      await sendMessage({
        type: 'SIGN_IN_MFA',
        factorId: mfaCtx.factorId,
        challengeId: mfaCtx.challengeId,
        code,
      });
      setMfaSignin(null);
      await onRefresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Invalid code');
    } finally {
      setBusy(false);
    }
  }

  if (mfaOnly) {
    return (
      <div className="vault-page vault-view-scroll max-w-md min-h-0 px-4 py-4">
        <p className="text-sm leading-relaxed text-vault-muted">
          Enter the 6-digit code from your authenticator for{' '}
          <span className="font-medium text-vault-text">{mfaCtx?.email}</span>
        </p>
        <form onSubmit={submitMfa} className="mt-5 space-y-3">
          <input
            className="vault-input font-mono text-lg tracking-[0.35em]"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            maxLength={8}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
          {err && <p className="text-sm text-vault-danger">{err}</p>}
          <button type="submit" disabled={busy || code.length < 6} className="vault-btn-primary">
            {busy ? 'Verifying…' : 'Continue'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="vault-page vault-view-scroll max-w-md min-h-0 px-4 py-4">
      <p className="text-sm leading-relaxed text-vault-muted">
        Email, password, then vault 2FA when prompted.
      </p>
      <form onSubmit={submitLogin} className="mt-5 space-y-4">
        <label className="vault-label">
          Email
          <input
            type="email"
            required
            className="vault-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </label>
        <label className="vault-label">
          Password
          <input
            type="password"
            required
            className="vault-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {err && <p className="text-sm text-vault-danger">{err}</p>}
        <button type="submit" disabled={busy} className="vault-btn-primary">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <button type="button" onClick={onSignedUp} className="vault-link mt-5 w-full text-center">
        Create an account
      </button>
    </div>
  );
}
