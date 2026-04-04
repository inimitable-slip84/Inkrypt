export type DecryptedEntry = {
  id: string;
  site_url: string;
  label: string | null;
  username: string | null;
  password: string;
  totpSecret: string | null;
  /**
   * No ciphertext or decryption failed (e.g. row inserted in SQL without encrypted fields).
   * Use “Complete entry” to save a password from the extension.
   */
  passwordMissing?: boolean;
};
