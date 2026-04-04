export type FieldPair = { user: HTMLInputElement | null; pw: HTMLInputElement };

export type VaultWidgetEl = HTMLElement & { vaultMenuEl?: HTMLElement };

export type MsgRes = {
  ok?: boolean;
  error?: string;
  data?: unknown;
  unlockNeeded?: boolean;
  signInNeeded?: boolean;
};

export type ExtTheme = 'light' | 'dark';

export type CredentialOption = {
  id: string;
  username: string;
  label: string | null;
};

export type PersistentSavePayload = { site: string; username: string; password: string };

export type SaveOfferSnap = {
  username: string;
  password: string;
  pwEl: HTMLInputElement;
  userEl: HTMLInputElement | null;
  site: string;
};

export type OpenSaveModalOptions = {
  /** After login, SPAs may replace the DOM; keep re-offering until the user dismisses or saves. */
  persistentAutoOffer?: boolean;
  /** Set when MutationObserver re-opened the modal (do not reset reopen budget). */
  isPersistentReconnect?: boolean;
};
