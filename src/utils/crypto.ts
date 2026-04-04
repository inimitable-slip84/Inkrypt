const PBKDF2_ITERATIONS = 100_000;

function encodeB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function decodeB64(s: string): ArrayBuffer {
  const binary = atob(s);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export async function deriveVaultKey(
  masterPassword: string,
  userId: string
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const salt = enc.encode(userId);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(masterPassword),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  return crypto.subtle.importKey('raw', bits, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function aesGcmEncrypt(
  key: CryptoKey,
  plaintext: string
): Promise<{ cipherB64: string; ivB64: string }> {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );
  return { cipherB64: encodeB64(ct), ivB64: encodeB64(iv.buffer) };
}

export async function aesGcmDecrypt(
  key: CryptoKey,
  cipherB64: string,
  ivB64: string
): Promise<string> {
  const iv = new Uint8Array(decodeB64(ivB64));
  const ct = decodeB64(cipherB64);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(pt);
}
