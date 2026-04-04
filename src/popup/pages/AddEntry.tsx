import { useEffect, useState } from 'react';
import { parseTotpInput } from '../../utils/totp';
import { sendMessage } from '../api';
import InfoTipButton from '../components/InfoTipButton';
import { useAppStore } from '../store';

const EDIT_ENTRY_INFO_FULL =
  'Leave the password field blank to keep your saved password. You can add or update the 2FA secret here after the site turns on two-factor authentication.';

const PASSWORD_MISSING_INFO_FULL =
  'This row had no encrypted password (for example it was added in the Supabase dashboard). Enter a password below to store it the way Inkrypt expects—then autofill and copy will work.';

type Props = {
  onBack: () => void;
  onSaved: () => void;
};

export default function AddEntry({ onBack, onSaved }: Props) {
  const editingEntry = useAppStore((s) => s.editingEntry);
  const [siteUrl, setSiteUrl] = useState('');
  const [label, setLabel] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totpRaw, setTotpRaw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!editingEntry) return;
    setSiteUrl(editingEntry.site_url);
    setLabel(editingEntry.label ?? '');
    setUsername(editingEntry.username ?? '');
    setPassword('');
    setTotpRaw('');
  }, [editingEntry]);

  const needsNewPassword = !editingEntry || !!editingEntry.passwordMissing;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const totpSecret = parseTotpInput(totpRaw);
    if (totpRaw.trim() && !totpSecret) {
      setErr('Invalid TOTP secret or otpauth URL');
      return;
    }
    if (needsNewPassword && !password.trim()) {
      setErr('Enter a password');
      return;
    }
    const keepExistingPassword =
      !!editingEntry && !editingEntry.passwordMissing && !password.trim();
    setBusy(true);
    try {
      if (editingEntry) {
        await sendMessage({
          type: 'UPDATE_ENTRY',
          id: editingEntry.id,
          siteUrl,
          label,
          username,
          password: password.trim(),
          totpSecret: totpSecret ?? null,
          keepExistingTotp: !totpRaw.trim(),
          keepExistingPassword,
        });
      } else {
        await sendMessage({
          type: 'SAVE_ENTRY',
          siteUrl,
          label,
          username,
          password,
          totpSecret: totpSecret ?? null,
        });
      }
      await onSaved();
      onBack();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="vault-page vault-view-scroll min-h-0 min-w-0 px-4 py-4">
      <div className="w-full min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={onBack} className="vault-link">
            ← Back to vault
          </button>
          <div className="flex items-center gap-2">
            {!editingEntry && (
              <InfoTipButton ariaLabel="About this form">{EDIT_ENTRY_INFO_FULL}</InfoTipButton>
            )}
            {editingEntry?.passwordMissing && (
              <InfoTipButton ariaLabel="Why no password is stored yet">{PASSWORD_MISSING_INFO_FULL}</InfoTipButton>
            )}
            {editingEntry && !editingEntry.passwordMissing && (
              <InfoTipButton ariaLabel="About password and 2FA when editing">{EDIT_ENTRY_INFO_FULL}</InfoTipButton>
            )}
          </div>
        </div>
        {editingEntry?.passwordMissing && (
          <p className="mt-1 text-center text-xs leading-relaxed text-vault-subtle">
            Add a password so autofill and copy work.
          </p>
        )}
        {editingEntry && !editingEntry.passwordMissing && (
          <p className="mt-1 text-center text-xs leading-relaxed text-vault-subtle">
            Blank password keeps the current one. Add or change 2FA when the site enables it.
          </p>
        )}
        <form onSubmit={submit} className="mt-5 space-y-4 pb-2">
          <label className="vault-label">
            Site URL or domain
            <input
              required
              className="vault-input"
              placeholder="github.com"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
            />
          </label>
          <label className="vault-label">
            Label (optional)
            <input className="vault-input" value={label} onChange={(e) => setLabel(e.target.value)} />
          </label>
          <label className="vault-label">
            Username
            <input className="vault-input" value={username} onChange={(e) => setUsername(e.target.value)} />
          </label>
          <label className="vault-label">
            Password
            <input
              type="password"
              required={needsNewPassword}
              className="vault-input"
              placeholder={
                editingEntry && !editingEntry.passwordMissing
                  ? 'Leave blank to keep current password'
                  : undefined
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className="vault-label">
            Website 2FA secret (optional)
            <textarea
              className="vault-input min-h-[4.5rem] resize-y"
              rows={2}
              placeholder="Base32 secret or otpauth://totp/…"
              value={totpRaw}
              onChange={(e) => setTotpRaw(e.target.value)}
            />
          </label>
          {err && <p className="text-center text-sm text-vault-danger">{err}</p>}
          <button type="submit" disabled={busy} className="vault-btn-primary">
            {busy ? 'Saving…' : editingEntry ? 'Save changes' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  );
}
