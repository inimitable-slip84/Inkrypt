export type MessagePayload =
  | { type: 'GET_STATE' }
  | { type: 'GET_BRANDING' }
  | {
      type: 'SET_BRANDING';
      mainLogoDataUrl?: string | null;
      toolbarIconDataUrl?: string | null;
    }
  | { type: 'SIGN_UP'; email: string; password: string }
  | {
      type: 'MFA_ENROLL_VERIFY';
      factorId: string;
      challengeId: string;
      code: string;
    }
  /** Drop unverified account TOTP factor after sign-up (skip vault 2FA for now). */
  | { type: 'SKIP_MFA_ENROLL'; factorId: string }
  | { type: 'SIGN_IN'; email: string; password: string }
  | {
      type: 'SIGN_IN_MFA';
      factorId: string;
      challengeId: string;
      code: string;
    }
  | { type: 'SIGN_OUT' }
  | { type: 'START_MFA_ENROLL' }
  | { type: 'UNLOCK_VAULT'; masterPassword: string; totpCode?: string }
  | { type: 'GENERATE_VAULT_2FA_ENROLL' }
  | { type: 'ENABLE_VAULT_2FA'; secretBase32: string; verificationCode: string }
  | { type: 'DISABLE_VAULT_2FA'; masterPassword: string; totpCode: string }
  | { type: 'LOCK_VAULT' }
  | { type: 'LIST_VAULT' }
  | {
      type: 'SAVE_ENTRY';
      siteUrl: string;
      label: string;
      username: string;
      password: string;
      totpSecret?: string | null;
    }
  | {
      type: 'UPDATE_ENTRY';
      id: string;
      siteUrl: string;
      label: string;
      username: string;
      password: string;
      totpSecret?: string | null;
      keepExistingTotp?: boolean;
      /** When true, do not rewrite password ciphertext (password field may be blank). */
      keepExistingPassword?: boolean;
    }
  | { type: 'DELETE_ENTRY'; id: string }
  | { type: 'GET_CREDENTIALS'; siteUrl: string; tabId?: number; entryId?: string }
  | { type: 'LIST_CREDENTIAL_OPTIONS'; siteUrl: string }
  | { type: 'COUNT_FOR_SITE'; siteUrl: string }
  | { type: 'USERNAMES_FOR_SITE'; siteUrl: string }
  | { type: 'HAS_USERNAME_FOR_SITE'; siteUrl: string; username: string }
  | { type: 'PULSE_ACTIVITY' }
  | { type: 'SET_BADGE'; text: string }
  | { type: 'COPY_TO_CLIPBOARD'; text: string }
  /** Opens Vault UI (popup window / action); use when vault locked or not signed in. */
  | { type: 'OPEN_VAULT_UI'; reason?: 'unlock' | 'signin' }
  /** Ask the active tab’s content script to run fill (Inkrypt chip). */
  | { type: 'FILL_ACTIVE_TAB' }
  /** Extension-only session storage so save-offer survives full navigations in this tab. */
  | { type: 'SET_PENDING_SAVE'; siteUrl: string; username: string; password: string }
  | { type: 'GET_PENDING_SAVE' }
  | { type: 'CLEAR_PENDING_SAVE' };

export type MessageResponse =
  | { ok: true; data?: unknown }
  | {
      ok: false;
      error: string;
      /** Content script should show attention UI instead of a generic toast */
      unlockNeeded?: boolean;
      signInNeeded?: boolean;
    };
