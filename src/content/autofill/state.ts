import type { FieldPair, PersistentSavePayload, VaultWidgetEl } from './types';

/**
 * Shared mutable state for the content-script autofill layer.
 * Centralizing this avoids hidden coupling across helpers and keeps a single place to inspect lifecycle.
 */
export const vaultAutofillState = {
  widgetToPair: new WeakMap<VaultWidgetEl, FieldPair>(),
  userToWidget: new WeakMap<HTMLInputElement, VaultWidgetEl>(),
  pwToWidget: new WeakMap<HTMLInputElement, VaultWidgetEl>(),
  wiredHint: new WeakSet<HTMLInputElement>(),
  userSaveWired: new WeakSet<HTMLInputElement>(),

  fillTargetPw: null as HTMLInputElement | null,
  fillTargetUser: null as HTMLInputElement | null,

  saveHintTimer: null as ReturnType<typeof setTimeout> | null,

  openMenuEl: null as HTMLElement | null,
  openMenuAnchor: null as HTMLElement | null,
  openMenuCleanup: null as (() => void) | null,

  attentionEscListener: null as ((e: KeyboardEvent) => void) | null,

  openSaveModalInFlight: false,

  persistentSavePayload: null as PersistentSavePayload | null,
  persistentSaveObserver: null as MutationObserver | null,
  persistentSaveReopenTimer: null as ReturnType<typeof setTimeout> | null,
  persistentSaveUserDismissed: false,
  persistentSaveReopenCount: 0,

  lastSaveOfferScheduleSite: '',
  lastSaveOfferScheduleAt: 0,

  repositionScheduled: false,
};
