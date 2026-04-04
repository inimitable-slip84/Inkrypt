import { useState } from 'react';
import { sendMessage } from '../api';
type EnrollPayload = {
  step: string;
  factorId: string;
  qrCode: string;
  secret: string;
  challengeId: string;
};

type Props = {
  onBack: () => void;
  onRefresh: () => void;
};

export default function Signup({ onBack, onRefresh }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [enroll, setEnroll] = useState<EnrollPayload | null>(null);
  const [code, setCode] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitRegister(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const data = await sendMessage<EnrollPayload>({
        type: 'SIGN_UP',
        email: email.trim(),
        password,
      });
      setEnroll(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Signup failed');
    } finally {
      setBusy(false);
    }
  }

  async function submitVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!enroll) return;
    setErr(null);
    setBusy(true);
    try {
      await sendMessage({
        type: 'MFA_ENROLL_VERIFY',
        factorId: enroll.factorId,
        challengeId: enroll.challengeId,
        code,
      });
      await onRefresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setBusy(false);
    }
  }

  async function skipEnrollment() {
    if (!enroll) return;
    setErr(null);
    setBusy(true);
    try {
      await sendMessage({ type: 'SKIP_MFA_ENROLL', factorId: enroll.factorId });
      setEnroll(null);
      setCode('');
      await onRefresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not skip');
    } finally {
      setBusy(false);
    }
  }

  if (enroll) {
    return (
      <div className="vault-page vault-view-scroll min-h-0 px-4 py-4">
        <p className="text-sm leading-relaxed text-vault-muted">
          Scan this QR in Google Authenticator, 1Password, or Authy. This secures the extension
          itself — not your saved website codes.
        </p>
        <div className="mt-5 flex justify-center rounded-xl border border-vault-border bg-vault-raised p-4 shadow-vault">
          <img src={enroll.qrCode} alt="MFA QR" className="h-44 w-44" />
        </div>
        <p className="mt-3 break-all text-center font-mono text-[0.65rem] leading-relaxed text-vault-subtle">
          {enroll.secret}
        </p>
        <form onSubmit={submitVerify} className="mt-5 space-y-3">
          <input
            className="vault-input font-mono text-lg tracking-[0.35em]"
            inputMode="numeric"
            placeholder="6-digit code"
            maxLength={8}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
          {err && <p className="text-sm text-vault-danger">{err}</p>}
          <button type="submit" disabled={busy || code.length < 6} className="vault-btn-primary">
            {busy ? 'Checking…' : 'Finish setup'}
          </button>
        </form>
        <button
          type="button"
          disabled={busy}
          onClick={skipEnrollment}
          className="vault-btn-ghost mt-3 w-full text-vault-muted"
        >
          Skip for now
        </button>
        <p className="mt-2 text-center text-xs leading-relaxed text-vault-subtle">
          You can turn on vault 2FA later in Settings.
        </p>
      </div>
    );
  }

  return (
    <div className="vault-page vault-view-scroll max-w-md min-h-0 px-4 py-4">
      <button type="button" onClick={onBack} className="vault-link mb-3">
        ← Back to sign in
      </button>
      <p className="text-sm leading-relaxed text-vault-muted">
        You will enroll vault 2FA next. Use a strong password.
      </p>
      <form onSubmit={submitRegister} className="mt-5 space-y-4">
        <label className="vault-label">
          Email
          <input
            type="email"
            required
            className="vault-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        <label className="vault-label">
          Password
          <input
            type="password"
            required
            minLength={8}
            className="vault-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>
        {err && <p className="text-sm text-vault-danger">{err}</p>}
        <button type="submit" disabled={busy} className="vault-btn-primary">
          {busy ? 'Creating…' : 'Continue'}
        </button>
      </form>
    </div>
  );
}
