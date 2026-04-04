import * as OTPAuth from 'otpauth';

/** Accept 6-digit TOTP with ±1 step clock skew. */
export function verifyTotpCode(secretBase32: string, code: string, window = 1): boolean {
  const cleaned = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(cleaned)) return false;
  try {
    const totp = new OTPAuth.TOTP({
      secret: OTPAuth.Secret.fromBase32(secretBase32),
      digits: 6,
      period: 30,
      algorithm: 'SHA1',
    });
    return totp.validate({ token: cleaned, window }) != null;
  } catch {
    return false;
  }
}

/** New random secret for vault 2FA enrollment (stored encrypted with vault key). */
export function generateVault2faProvisioning(accountLabel: string): {
  secretBase32: string;
  otpauthUri: string;
} {
  const safeLabel = accountLabel.replace(/:/g, ' ').trim() || 'Vault';
  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer: 'Inkrypt Vault',
    label: safeLabel,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret,
  });
  return { secretBase32: secret.base32, otpauthUri: totp.toString() };
}

export function generateTOTPCode(secret: string): { code: string; secondsLeft: number } {
  const totp = new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(secret),
    digits: 6,
    period: 30,
    algorithm: 'SHA1',
  });
  const code = totp.generate();
  const secondsLeft = 30 - (Math.floor(Date.now() / 1000) % 30);
  return { code, secondsLeft };
}

/** Parse otpauth:// URI or return trimmed secret if base32. */
export function parseTotpInput(input: string): string | null {
  const t = input.trim();
  if (!t) return null;
  try {
    const u = new URL(t);
    if (u.protocol === 'otpauth:' && u.hostname === 'totp') {
      const secret = u.searchParams.get('secret');
      if (secret) return secret.replace(/\s/g, '').toUpperCase();
    }
  } catch {
    // not a URL
  }
  const cleaned = t.replace(/\s/g, '').toUpperCase();
  if (/^[A-Z2-7]+=*$/.test(cleaned)) return cleaned;
  return null;
}
