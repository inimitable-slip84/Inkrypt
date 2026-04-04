import type { SupabaseClient } from '@supabase/supabase-js';
import type { DecryptedEntry } from '../types/vault';
import { aesGcmDecrypt, aesGcmEncrypt, deriveVaultKey } from '../utils/crypto';
import { generateTOTPCode, verifyTotpCode } from '../utils/totp';
import {
  getVault2faBlob,
  isVault2faEnabled,
  removeVault2faBlob,
  setVault2faBlob,
} from './vault2faStorage';

export type VaultRow = {
  id: string;
  user_id: string;
  site_url: string;
  label: string | null;
  username: string | null;
  password_cipher: string | null;
  password_iv: string | null;
  totp_cipher: string | null;
  totp_iv: string | null;
  created_at: string;
  updated_at: string;
};

export function normalizeSite(input: string): string {
  const t = input.trim().toLowerCase();
  if (!t) return '';
  try {
    if (t.includes('://')) return new URL(t).hostname;
  } catch {
    /* fall through */
  }
  return t.split('/')[0].split('?')[0] ?? t;
}

let vaultKey: CryptoKey | null = null;
const recentExactSaveFingerprints = new Map<string, number>();
const inFlightExactSaveFingerprints = new Set<string>();
const EXACT_SAVE_DEDUPE_TTL_MS = 45_000;

function exactSaveFingerprint(userId: string, siteUrl: string, username: string, password: string): string {
  return `${userId}::${siteUrl}::${username.trim().toLowerCase()}::${password}`;
}

export function isVaultUnlocked(): boolean {
  return vaultKey !== null;
}

export function lockVaultKey(): void {
  vaultKey = null;
}

export async function unlockVaultKey(
  masterPassword: string,
  userId: string,
  totpCode?: string
): Promise<void> {
  const key = await deriveVaultKey(masterPassword, userId);
  const has2fa = await isVault2faEnabled(userId);
  if (!has2fa) {
    vaultKey = key;
    return;
  }
  const blob = await getVault2faBlob(userId);
  if (!blob) {
    throw new Error(
      'Vault two-factor is on but its data is missing on this device. Use another device where you set it up, or contact support.'
    );
  }
  let secret: string;
  try {
    secret = await aesGcmDecrypt(key, blob.cipherB64, blob.ivB64);
  } catch {
    throw new Error('Incorrect master password');
  }
  const code = (totpCode ?? '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(code)) {
    throw new Error('Enter the 6-digit code from your authenticator app');
  }
  if (!verifyTotpCode(secret, code)) {
    throw new Error('Invalid authenticator code');
  }
  vaultKey = key;
}

/** While vault is unlocked — enable 2FA after user proves enrollment with a valid code. */
export async function enableVaultTwoFactor(
  userId: string,
  secretBase32: string,
  verificationCode: string
): Promise<void> {
  if (!vaultKey) throw new Error('Vault is locked');
  if (await isVault2faEnabled(userId)) {
    throw new Error('Vault two-factor is already enabled. Turn it off before setting up again.');
  }
  const trimmed = secretBase32.replace(/\s/g, '').toUpperCase();
  if (!/^[A-Z2-7]+=*$/.test(trimmed)) {
    throw new Error('Invalid authenticator secret');
  }
  if (!verifyTotpCode(trimmed, verificationCode.replace(/\s/g, ''))) {
    throw new Error('Code does not match — check the time on your device and try a new code');
  }
  const { cipherB64, ivB64 } = await aesGcmEncrypt(vaultKey, trimmed);
  await setVault2faBlob(userId, { cipherB64, ivB64 });
}

export async function disableVaultTwoFactor(
  masterPassword: string,
  userId: string,
  totpCode: string
): Promise<void> {
  const blob = await getVault2faBlob(userId);
  if (!blob) throw new Error('Vault two-factor is not enabled');
  const key = await deriveVaultKey(masterPassword, userId);
  let secret: string;
  try {
    secret = await aesGcmDecrypt(key, blob.cipherB64, blob.ivB64);
  } catch {
    throw new Error('Incorrect master password');
  }
  if (!verifyTotpCode(secret, totpCode.replace(/\s/g, ''))) {
    throw new Error('Invalid authenticator code');
  }
  await removeVault2faBlob(userId);
}

export async function fetchVaultRows(client: SupabaseClient, userId: string): Promise<VaultRow[]> {
  const { data, error } = await client
    .from('vault')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as VaultRow[];
}

function pushIncomplete(
  out: DecryptedEntry[],
  r: VaultRow,
  totpSecret: string | null = null
): void {
  out.push({
    id: r.id,
    site_url: r.site_url,
    label: r.label,
    username: r.username,
    password: '',
    totpSecret,
    passwordMissing: true,
  });
}

export async function listDecryptedEntries(
  client: SupabaseClient,
  userId: string
): Promise<DecryptedEntry[]> {
  if (!vaultKey) throw new Error('Vault locked');
  const rows = await fetchVaultRows(client, userId);
  const out: DecryptedEntry[] = [];
  for (const r of rows) {
    if (!r.password_cipher || !r.password_iv) {
      let totpSecret: string | null = null;
      if (r.totp_cipher && r.totp_iv) {
        try {
          totpSecret = await aesGcmDecrypt(vaultKey, r.totp_cipher, r.totp_iv);
        } catch {
          totpSecret = null;
        }
      }
      pushIncomplete(out, r, totpSecret);
      continue;
    }
    let password: string;
    try {
      password = await aesGcmDecrypt(vaultKey, r.password_cipher, r.password_iv);
    } catch {
      let totpSecret: string | null = null;
      if (r.totp_cipher && r.totp_iv) {
        try {
          totpSecret = await aesGcmDecrypt(vaultKey, r.totp_cipher, r.totp_iv);
        } catch {
          totpSecret = null;
        }
      }
      pushIncomplete(out, r, totpSecret);
      continue;
    }
    let totpSecret: string | null = null;
    if (r.totp_cipher && r.totp_iv) {
      try {
        totpSecret = await aesGcmDecrypt(vaultKey, r.totp_cipher, r.totp_iv);
      } catch {
        totpSecret = null;
      }
    }
    out.push({
      id: r.id,
      site_url: r.site_url,
      label: r.label,
      username: r.username,
      password,
      totpSecret,
    });
  }
  return out;
}

export async function saveEntry(
  client: SupabaseClient,
  userId: string,
  fields: {
    siteUrl: string;
    label: string;
    username: string;
    password: string;
    totpSecret?: string | null;
  }
): Promise<void> {
  if (!vaultKey) throw new Error('Vault locked');
  const site_url = normalizeSite(fields.siteUrl);
  const usernameNorm = fields.username.trim().toLowerCase();
  const fingerprint = exactSaveFingerprint(userId, site_url, usernameNorm, fields.password);
  const now = Date.now();
  const recent = recentExactSaveFingerprints.get(fingerprint);
  if (recent != null && now - recent < EXACT_SAVE_DEDUPE_TTL_MS) {
    throw new Error('This login is already saved for this site.');
  }
  if (inFlightExactSaveFingerprints.has(fingerprint)) {
    throw new Error('This login is already saved for this site.');
  }
  inFlightExactSaveFingerprints.add(fingerprint);

  try {
    // Prevent exact duplicate records: same site + username/email + password.
    const existing = await fetchVaultRows(client, userId);
    for (const row of existing) {
      if (normalizeSite(row.site_url) !== site_url) continue;
      const rowUser = (row.username ?? '').trim().toLowerCase();
      if (rowUser !== usernameNorm) continue;
      if (!row.password_cipher || !row.password_iv) continue;
      try {
        const rowPassword = await aesGcmDecrypt(vaultKey, row.password_cipher, row.password_iv);
        if (rowPassword === fields.password) {
          throw new Error('This login is already saved for this site.');
        }
      } catch (e) {
        if (e instanceof Error && e.message === 'This login is already saved for this site.') {
          throw e;
        }
        // Ignore undecryptable rows and continue checking others.
      }
    }

    const { cipherB64: password_cipher, ivB64: password_iv } = await aesGcmEncrypt(
      vaultKey,
      fields.password
    );
    let totp_cipher: string | null = null;
    let totp_iv: string | null = null;
    if (fields.totpSecret?.trim()) {
      const t = await aesGcmEncrypt(vaultKey, fields.totpSecret.trim());
      totp_cipher = t.cipherB64;
      totp_iv = t.ivB64;
    }
    const { error } = await client.from('vault').insert({
      user_id: userId,
      site_url,
      label: fields.label.trim() || null,
      username: fields.username.trim() || null,
      password_cipher,
      password_iv,
      totp_cipher,
      totp_iv,
    });
    if (error) throw error;
    recentExactSaveFingerprints.set(fingerprint, Date.now());
  } finally {
    inFlightExactSaveFingerprints.delete(fingerprint);
  }
}

export async function updateEntry(
  client: SupabaseClient,
  userId: string,
  id: string,
  fields: {
    siteUrl: string;
    label: string;
    username: string;
    password: string;
    totpSecret?: string | null;
    /** When true and totpSecret is empty, do not change existing TOTP columns */
    keepExistingTotp?: boolean;
    /** When true, omit password columns so the stored password is unchanged */
    keepExistingPassword?: boolean;
  }
): Promise<void> {
  if (!vaultKey) throw new Error('Vault locked');
  const site_url = normalizeSite(fields.siteUrl);
  const payload: Record<string, unknown> = {
    site_url,
    label: fields.label.trim() || null,
    username: fields.username.trim() || null,
  };
  if (!fields.keepExistingPassword) {
    const { cipherB64: password_cipher, ivB64: password_iv } = await aesGcmEncrypt(
      vaultKey,
      fields.password
    );
    payload.password_cipher = password_cipher;
    payload.password_iv = password_iv;
  }
  const totpTrim = fields.totpSecret?.trim();
  if (totpTrim) {
    const t = await aesGcmEncrypt(vaultKey, totpTrim);
    payload.totp_cipher = t.cipherB64;
    payload.totp_iv = t.ivB64;
  } else if (!fields.keepExistingTotp) {
    payload.totp_cipher = null;
    payload.totp_iv = null;
  }
  const { error } = await client
    .from('vault')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function deleteEntry(
  client: SupabaseClient,
  userId: string,
  id: string
): Promise<void> {
  const { error } = await client.from('vault').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

export async function countEntriesForSite(
  client: SupabaseClient,
  userId: string,
  hostname: string
): Promise<number> {
  const host = normalizeSite(hostname);
  const rows = await fetchVaultRows(client, userId);
  return rows.filter((r) => normalizeSite(r.site_url) === host).length;
}

/** Distinct usernames/emails already saved for this host (plaintext column; no vault unlock). */
export async function listUsernamesForSite(
  client: SupabaseClient,
  userId: string,
  hostname: string
): Promise<string[]> {
  const host = normalizeSite(hostname);
  const rows = await fetchVaultRows(client, userId);
  const seen = new Set<string>();
  for (const r of rows) {
    if (normalizeSite(r.site_url) !== host) continue;
    const u = r.username?.trim();
    if (u) seen.add(u);
  }
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
}

/** True if this username/email is already stored for this host (plaintext match; no decrypt). */
export async function hasUsernameOnSite(
  client: SupabaseClient,
  userId: string,
  hostname: string,
  username: string
): Promise<boolean> {
  const host = normalizeSite(hostname);
  const want = username.trim().toLowerCase();
  if (!want) return false;
  const rows = await fetchVaultRows(client, userId);
  return rows.some(
    (r) =>
      normalizeSite(r.site_url) === host && (r.username?.trim().toLowerCase() ?? '') === want
  );
}

export async function getCredentialsForSite(
  client: SupabaseClient,
  userId: string,
  hostname: string,
  entryId?: string
): Promise<{ username: string; password: string; totpCode: string | null } | null> {
  if (!vaultKey) return null;
  const host = hostname.toLowerCase();
  const rows = await fetchVaultRows(client, userId);
  const match = entryId
    ? rows.find((r) => r.id === entryId && normalizeSite(r.site_url) === host)
    : rows.find((r) => normalizeSite(r.site_url) === host);
  if (!match || !match.password_cipher || !match.password_iv) return null;
  const password = await aesGcmDecrypt(vaultKey, match.password_cipher, match.password_iv);
  let totpCode: string | null = null;
  if (match.totp_cipher && match.totp_iv) {
    const secret = await aesGcmDecrypt(vaultKey, match.totp_cipher, match.totp_iv);
    totpCode = generateTOTPCode(secret).code;
  }
  const username = match.username ?? '';
  return { username, password, totpCode };
}

export async function listCredentialOptionsForSite(
  client: SupabaseClient,
  userId: string,
  hostname: string
): Promise<Array<{ id: string; username: string; label: string | null }>> {
  const host = hostname.toLowerCase();
  const rows = await fetchVaultRows(client, userId);
  return rows
    .filter(
      (r) =>
        normalizeSite(r.site_url) === host &&
        !!r.password_cipher &&
        !!r.password_iv
    )
    .map((r) => ({
      id: r.id,
      username: (r.username ?? '').trim(),
      label: r.label,
    }));
}
