import { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import type { AuthState } from '../../types/auth';
import { processMainLogoFile, processToolbarIconFile } from '../../utils/brandingImage';
import { sendMessage } from '../api';
import InfoTipButton from '../components/InfoTipButton';
import ThemeToggle from '../components/ThemeToggle';
import { useThemeStore } from '../themeStore';

type Props = {
  onRefresh: () => void;
};

type AppState = {
  auth: AuthState;
  vaultUnlocked: boolean;
  vault2faEnabled: boolean;
};

type EnrollPayload = { secretBase32: string; otpauthUri: string };

const DEFAULT_MAIN_LOGO_PREVIEW = `${import.meta.env.BASE_URL}brand/mainlogo.png`;

const VAULT_2FA_INFO_FULL =
  'Require an authenticator code together with your master password when unlocking. The secret is encrypted with your vault key and kept in this browser only — not on Inkrypt servers.';

export default function Settings({ onRefresh }: Props) {
  const [busy, setBusy] = useState(false);
  const theme = useThemeStore((s) => s.theme);
  const [appState, setAppState] = useState<AppState | null>(null);
  const [enroll, setEnroll] = useState<EnrollPayload | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [enrollErr, setEnrollErr] = useState<string | null>(null);
  const [disablePwd, setDisablePwd] = useState('');
  const [disableTotp, setDisableTotp] = useState('');
  const [disableErr, setDisableErr] = useState<string | null>(null);

  const [mainLogoDataUrl, setMainLogoDataUrl] = useState<string | null>(null);
  const [toolbarIconDataUrl, setToolbarIconDataUrl] = useState<string | null>(null);
  const [brandErr, setBrandErr] = useState<string | null>(null);
  const mainLogoInputRef = useRef<HTMLInputElement>(null);
  const toolbarIconInputRef = useRef<HTMLInputElement>(null);

  const loadBranding = useCallback(async () => {
    const data = await sendMessage<{
      mainLogoDataUrl: string | null;
      toolbarIconDataUrl: string | null;
    }>({ type: 'GET_BRANDING' });
    setMainLogoDataUrl(data.mainLogoDataUrl);
    setToolbarIconDataUrl(data.toolbarIconDataUrl);
  }, []);

  const loadState = useCallback(async () => {
    const st = await sendMessage<AppState>({ type: 'GET_STATE' });
    setAppState(st);
  }, []);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  useEffect(() => {
    void loadBranding();
  }, [loadBranding]);

  const vault2faEnabled = !!appState?.vault2faEnabled;
  const userEmail =
    appState?.auth.status === 'signed_in' ? appState.auth.session.user.email ?? '' : '';

  async function lock() {
    setBusy(true);
    try {
      await sendMessage({ type: 'LOCK_VAULT' });
      await onRefresh();
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try {
      await sendMessage({ type: 'SIGN_OUT' });
      await onRefresh();
    } finally {
      setBusy(false);
    }
  }

  async function startVault2faSetup() {
    setEnrollErr(null);
    setVerifyCode('');
    setBusy(true);
    try {
      const data = await sendMessage<EnrollPayload>({ type: 'GENERATE_VAULT_2FA_ENROLL' });
      setEnroll(data);
    } catch (e) {
      setEnrollErr(e instanceof Error ? e.message : 'Could not start setup');
    } finally {
      setBusy(false);
    }
  }

  async function confirmVault2fa() {
    if (!enroll) return;
    setEnrollErr(null);
    setBusy(true);
    try {
      await sendMessage({
        type: 'ENABLE_VAULT_2FA',
        secretBase32: enroll.secretBase32,
        verificationCode: verifyCode.replace(/\s/g, ''),
      });
      setEnroll(null);
      setVerifyCode('');
      await loadState();
      await onRefresh();
    } catch (e) {
      setEnrollErr(e instanceof Error ? e.message : 'Could not enable');
    } finally {
      setBusy(false);
    }
  }

  async function cancelVault2faSetup() {
    setEnroll(null);
    setVerifyCode('');
    setEnrollErr(null);
  }

  const defaultToolbarIconPreview =
    typeof chrome !== 'undefined' && chrome.runtime?.getURL
      ? chrome.runtime.getURL('brand/logo.png')
      : '';

  async function onMainLogoFile(file: File | null) {
    if (!file) return;
    setBrandErr(null);
    setBusy(true);
    try {
      const dataUrl = await processMainLogoFile(file);
      await sendMessage({ type: 'SET_BRANDING', mainLogoDataUrl: dataUrl });
      setMainLogoDataUrl(dataUrl);
    } catch (e) {
      setBrandErr(e instanceof Error ? e.message : 'Could not use image');
    } finally {
      setBusy(false);
    }
  }

  async function onToolbarIconFile(file: File | null) {
    if (!file) return;
    setBrandErr(null);
    setBusy(true);
    try {
      const dataUrl = await processToolbarIconFile(file);
      await sendMessage({ type: 'SET_BRANDING', toolbarIconDataUrl: dataUrl });
      setToolbarIconDataUrl(dataUrl);
    } catch (e) {
      setBrandErr(e instanceof Error ? e.message : 'Could not use image');
    } finally {
      setBusy(false);
    }
  }

  async function resetMainLogo() {
    setBrandErr(null);
    setBusy(true);
    try {
      await sendMessage({ type: 'SET_BRANDING', mainLogoDataUrl: null });
      setMainLogoDataUrl(null);
    } finally {
      setBusy(false);
    }
  }

  async function resetToolbarIcon() {
    setBrandErr(null);
    setBusy(true);
    try {
      await sendMessage({ type: 'SET_BRANDING', toolbarIconDataUrl: null });
      setToolbarIconDataUrl(null);
    } finally {
      setBusy(false);
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setEnrollErr(null);
    } catch {
      setEnrollErr('Could not copy — select the text above and copy manually');
    }
  }

  async function submitDisableVault2fa(e: React.FormEvent) {
    e.preventDefault();
    setDisableErr(null);
    setBusy(true);
    try {
      await sendMessage({
        type: 'DISABLE_VAULT_2FA',
        masterPassword: disablePwd,
        totpCode: disableTotp.replace(/\s/g, ''),
      });
      setDisablePwd('');
      setDisableTotp('');
      await loadState();
      await onRefresh();
    } catch (e) {
      setDisableErr(e instanceof Error ? e.message : 'Could not disable');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="vault-page vault-view-scroll min-h-0 px-4 py-4">
      <p className="mb-6 text-sm leading-relaxed text-vault-muted">
        Lock clears the encryption key from memory. Use <strong className="text-vault-text">Sign out</strong> in the
        sidebar to end your Supabase session on this device.
      </p>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-vault-border bg-vault-surface px-4 py-3 shadow-vault-glow">
          <div>
            <div className="text-sm font-medium text-vault-text">Appearance</div>
            <div className="text-xs text-vault-subtle">
              {theme === 'dark' ? 'Inkwell (dark)' : 'Ledger (light)'}
            </div>
          </div>
          <ThemeToggle />
        </div>

        <div className="rounded-xl border border-vault-border bg-vault-surface px-4 py-3 shadow-vault-glow">
          <div className="text-sm font-medium text-vault-text">Your branding</div>
          <p className="mt-1 text-xs leading-relaxed text-vault-subtle">
            Replace the header wordmark and the toolbar / page chip icon. Stored only in this browser.
          </p>
          {brandErr && <p className="mt-2 text-sm text-vault-danger">{brandErr}</p>}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-[0.6rem] font-bold uppercase tracking-wide text-vault-subtle">
                Header logo
              </span>
              <div className="flex h-10 items-center overflow-hidden rounded-lg border border-vault-border bg-vault-canvas/80 px-2">
                <img
                  src={mainLogoDataUrl ?? DEFAULT_MAIN_LOGO_PREVIEW}
                  alt=""
                  className="max-h-8 w-auto max-w-full object-contain object-left"
                />
              </div>
              <input
                ref={mainLogoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  void onMainLogoFile(e.target.files?.[0] ?? null);
                  e.target.value = '';
                }}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => mainLogoInputRef.current?.click()}
                  className="rounded-lg border border-vault-border bg-vault-raised px-2.5 py-1 text-xs font-medium text-vault-text hover:bg-vault-surface disabled:opacity-40"
                >
                  Upload
                </button>
                <button
                  type="button"
                  disabled={busy || !mainLogoDataUrl}
                  onClick={() => void resetMainLogo()}
                  className="vault-link text-xs disabled:opacity-40"
                >
                  Reset
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[0.6rem] font-bold uppercase tracking-wide text-vault-subtle">
                Toolbar icon
              </span>
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border border-vault-border bg-vault-canvas/80 p-1">
                <img
                  src={toolbarIconDataUrl ?? defaultToolbarIconPreview}
                  alt=""
                  className="h-12 w-12 object-contain"
                />
              </div>
              <input
                ref={toolbarIconInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  void onToolbarIconFile(e.target.files?.[0] ?? null);
                  e.target.value = '';
                }}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => toolbarIconInputRef.current?.click()}
                  className="rounded-lg border border-vault-border bg-vault-raised px-2.5 py-1 text-xs font-medium text-vault-text hover:bg-vault-surface disabled:opacity-40"
                >
                  Upload
                </button>
                <button
                  type="button"
                  disabled={busy || !toolbarIconDataUrl}
                  onClick={() => void resetToolbarIcon()}
                  className="vault-link text-xs disabled:opacity-40"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-vault-border bg-vault-surface px-4 py-3 shadow-vault-glow">
          <div className="flex items-center gap-1.5">
            <div className="text-sm font-medium text-vault-text">Vault two-factor</div>
            <InfoTipButton ariaLabel="About vault two-factor">{VAULT_2FA_INFO_FULL}</InfoTipButton>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-vault-subtle">
            Authenticator code plus master password to unlock.
          </p>
          {vault2faEnabled && !enroll && (
            <p className="mt-2 text-xs font-semibold text-vault-totp">Enabled for this browser</p>
          )}

          {!vault2faEnabled && !enroll && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void startVault2faSetup()}
              className="mt-3 w-full rounded-lg border border-vault-border-strong bg-vault-raised py-2.5 text-sm font-medium text-vault-text transition-colors hover:bg-vault-surface disabled:opacity-40"
            >
              Turn on vault 2FA
            </button>
          )}

          {enroll && (
            <div className="mt-3 space-y-3 border-t border-vault-border pt-3">
              <p className="text-xs text-vault-muted">
                Add this account in Google Authenticator, 1Password, Authy, etc. (time-based /
                TOTP).
              </p>
              <div className="flex flex-col items-center gap-2 rounded-lg border border-vault-border bg-vault-canvas/80 px-3 py-3">
                <p className="text-[0.6rem] font-bold uppercase tracking-wider text-vault-subtle">
                  Scan QR code
                </p>
                <div
                  className="rounded-lg border border-vault-border-strong/40 bg-white p-2 shadow-inner"
                  role="img"
                  aria-label="QR code for vault two-factor setup"
                >
                  <QRCode
                    value={enroll.otpauthUri}
                    size={152}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#14120f"
                  />
                </div>
                <p className="text-center text-[0.62rem] text-vault-subtle">Or use the key below</p>
              </div>
              <div className="rounded-lg border border-vault-border bg-vault-canvas/80 px-3 py-2">
                <p className="text-[0.6rem] font-bold uppercase tracking-wider text-vault-subtle">
                  Setup key (Base32)
                </p>
                <p className="mt-1 break-all font-mono text-[0.7rem] leading-relaxed text-vault-text">
                  {enroll.secretBase32}
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void copyText(enroll.secretBase32)}
                  className="vault-link mt-2 text-xs"
                >
                  Copy secret
                </button>
              </div>
              <div className="rounded-lg border border-vault-border bg-vault-canvas/80 px-3 py-2">
                <p className="text-[0.6rem] font-bold uppercase tracking-wider text-vault-subtle">
                  otpauth URI
                </p>
                <p className="mt-1 max-h-16 overflow-y-auto break-all font-mono text-[0.62rem] text-vault-muted">
                  {enroll.otpauthUri}
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void copyText(enroll.otpauthUri)}
                  className="vault-link mt-2 text-xs"
                >
                  Copy URI
                </button>
              </div>
              {userEmail && (
                <p className="text-[0.65rem] text-vault-subtle">Account label in app: {userEmail}</p>
              )}
              <div>
                <label
                  htmlFor="vault-2fa-verify"
                  className="mb-1 block text-[0.65rem] font-bold uppercase tracking-[0.12em] text-vault-subtle"
                >
                  Enter code to confirm
                </label>
                <input
                  id="vault-2fa-verify"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="vault-input text-center font-mono text-base tracking-[0.3em]"
                  placeholder="000000"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
              </div>
              {enrollErr && <p className="text-sm text-vault-danger">{enrollErr}</p>}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || verifyCode.replace(/\s/g, '').length !== 6}
                  onClick={() => void confirmVault2fa()}
                  className="vault-btn-primary flex-1 !py-2 text-xs"
                >
                  Enable protection
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void cancelVault2faSetup()}
                  className="rounded-lg border border-vault-border px-4 py-2 text-xs font-medium text-vault-muted hover:text-vault-text"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {vault2faEnabled && !enroll && (
            <form onSubmit={submitDisableVault2fa} className="mt-3 space-y-2 border-t border-vault-border pt-3">
              <p className="text-xs text-vault-muted">
                To turn off vault 2FA, confirm your master password and a current authenticator code.
              </p>
              <input
                type="password"
                required
                className="vault-input"
                placeholder="Master password"
                value={disablePwd}
                onChange={(e) => setDisablePwd(e.target.value)}
                autoComplete="off"
              />
              <input
                type="text"
                inputMode="numeric"
                required
                className="vault-input font-mono tracking-[0.25em]"
                placeholder="6-digit code"
                maxLength={6}
                value={disableTotp}
                onChange={(e) => setDisableTotp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                autoComplete="one-time-code"
              />
              {disableErr && <p className="text-sm text-vault-danger">{disableErr}</p>}
              <button type="submit" disabled={busy} className="vault-btn-danger w-full text-sm">
                Turn off vault 2FA
              </button>
            </form>
          )}
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => void lock()}
          className="w-full rounded-lg border border-vault-border bg-vault-raised py-2.5 text-sm font-medium text-vault-text transition-colors hover:bg-vault-surface disabled:opacity-40"
        >
          Lock vault
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void logout()}
          className="vault-btn-danger"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
