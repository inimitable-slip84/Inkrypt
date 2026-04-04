/** Browser-safe random password (avoids ambiguous 0/O, 1/l). */
export function generateRandomPassword(length = 20): string {
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const num = '23456789';
  const sym = '!@#$%&*-_.';
  const all = lower + upper + num + sym;
  const buf = new Uint8Array(length);
  crypto.getRandomValues(buf);
  let out = '';
  for (let i = 0; i < length; i++) out += all[buf[i]! % all.length];
  return out;
}

export function parseTotpPaste(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const u = new URL(t);
    if (u.protocol === 'otpauth:' && u.hostname === 'totp') {
      const s = u.searchParams.get('secret');
      if (s) return s.replace(/\s/g, '').toUpperCase();
    }
  } catch {
    /* not a URL */
  }
  const c = t.replace(/\s/g, '').toUpperCase();
  if (/^[A-Z2-7]+=*$/.test(c)) return c;
  return null;
}
