/** Attribute on Inkrypt chip wrapper — used for scan() and outside-click handling. */
export const BTN_ATTR = 'data-vault-ui';

/** Mark save modal root so scan() does not attach Inkrypt chips to its password field. */
export const VAULT_SAVE_MODAL_ATTR = 'data-vault-save-modal';

/** Password value came from Inkrypt vault fill — do not prompt to save the same login again. */
export const PW_VAULT_AUTOFILL_ATTR = 'data-vault-ext-autofill';

export const EMAIL_IN_TEXT_RX =
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

export const VAULT_ATTENTION_OVERLAY_ID = 'vault-ext-attention-overlay';

export const SAVE_PROMPT_SUPPRESS_MS = 120_000;

export const PERSISTENT_SAVE_MAX_REOPEN = 15;
