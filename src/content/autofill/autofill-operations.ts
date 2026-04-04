/**
 * Inkrypt content script: page chip, credential fill, save prompts, and form wiring.
 * Shared helpers: `./constants`, `./dom-fields`, `./identity-session`, `./theme-ui`, `./toast-attention`.
 */
import { generateRandomPassword, parseTotpPaste } from '../password-utils';
import {
  BTN_ATTR,
  PW_VAULT_AUTOFILL_ATTR,
  VAULT_SAVE_MODAL_ATTR,
  SAVE_PROMPT_SUPPRESS_MS,
  PERSISTENT_SAVE_MAX_REOPEN,
} from './constants';
import type {
  VaultWidgetEl,
  MsgRes,
  CredentialOption,
  OpenSaveModalOptions,
  SaveOfferSnap,
} from './types';
import { vaultAutofillState } from './state';
import { defaultToolbarIconUrl, getToolbarIconUrl } from './toolbar-icon';
import {
  enrichUsernameFromPageAndSession,
  rememberSessionIdentityEmail,
  markPasswordFilledByVault,
  wireIdentityEmailCapture,
  sessionIdentityKey,
} from './identity-session';
import {
  fillField,
  findUsernameNearPassword,
  isEligibleUsernameField,
  isPasswordFieldEligible,
  isLikelyConfirmField,
  isLikelyCurrentPasswordField,
  pickLoginPasswordFromForm,
  findPasswordFieldNearLoginButton,
  isLikelySignupContext,
  fillConfirmPasswordIfPresent,
  getCredentialsFromInputs,
  passwordResetPathOrToken,
  isLikelyPasswordResetWithoutUsernameForm,
} from './dom-fields';
import {
  ensureVaultPageUiInjected,
  applyExtThemeToElement,
  initExtThemeFromStorage,
} from './theme-ui';
import { showToast, dismissVaultAttentionOverlay, showVaultAttentionOverlay } from './toast-attention';

initExtThemeFromStorage();

function closeOpenMenu() {
  if (vaultAutofillState.openMenuEl) {
    vaultAutofillState.openMenuEl.style.display = 'none';
    vaultAutofillState.openMenuEl.classList.remove('vault-ext-menu--anim');
    vaultAutofillState.openMenuEl = null;
  }
  if (vaultAutofillState.openMenuAnchor) {
    vaultAutofillState.openMenuAnchor.classList.remove('vault-ext-ink-btn--menu-open');
    vaultAutofillState.openMenuAnchor = null;
  }
  if (vaultAutofillState.openMenuCleanup) {
    const cleanup = vaultAutofillState.openMenuCleanup;
    vaultAutofillState.openMenuCleanup = null;
    cleanup();
  }
}

function positionVaultDropdownMenu(menu: HTMLElement, anchor: HTMLElement) {
  const margin = 8;
  const gap = 6;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  menu.style.display = 'block';
  menu.style.position = 'fixed';
  menu.style.visibility = 'hidden';
  menu.style.left = '-99999px';
  menu.style.top = '0';
  menu.style.boxSizing = 'border-box';
  menu.style.maxWidth = `${Math.min(280, vw - margin * 2)}px`;
  menu.style.minWidth = `${Math.min(220, vw - margin * 2)}px`;
  menu.style.maxHeight = `${vh - margin * 2}px`;
  menu.style.overflowY = 'auto';

  const mw = menu.offsetWidth;
  const mh = menu.offsetHeight;
  menu.style.visibility = 'visible';

  const a = anchor.getBoundingClientRect();

  let left = a.right - mw;
  if (left < margin) left = a.left;
  if (left + mw > vw - margin) left = vw - mw - margin;
  if (left < margin) left = margin;

  let top = a.bottom + gap;
  if (top + mh > vh - margin) {
    const above = a.top - gap - mh;
    if (above >= margin) top = above;
    else top = Math.max(margin, Math.min(top, vh - mh - margin));
  }

  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  menu.style.right = 'auto';
  menu.style.bottom = 'auto';
  menu.style.margin = '0';
  menu.style.zIndex = '2147483641';
}

function openVaultMenu(menu: HTMLElement, anchor: HTMLElement) {
  closeOpenMenu();
  vaultAutofillState.openMenuEl = menu;
  vaultAutofillState.openMenuAnchor = anchor;
  vaultAutofillState.openMenuCleanup = null;
  positionVaultDropdownMenu(menu, anchor);
  anchor.classList.add('vault-ext-ink-btn--menu-open');
  menu.classList.remove('vault-ext-menu--anim');
  void menu.offsetWidth;
  menu.classList.add('vault-ext-menu--anim');
}

function openEphemeralVaultMenu(menu: HTMLElement, anchor: HTMLElement) {
  closeOpenMenu();
  vaultAutofillState.openMenuEl = menu;
  vaultAutofillState.openMenuAnchor = anchor;
  vaultAutofillState.openMenuCleanup = () => menu.remove();
  positionVaultDropdownMenu(menu, anchor);
  anchor.classList.add('vault-ext-ink-btn--menu-open');
  menu.classList.remove('vault-ext-menu--anim');
  void menu.offsetWidth;
  menu.classList.add('vault-ext-menu--anim');
}

document.addEventListener(
  'click',
  (e) => {
    if (!(e.target instanceof Node)) return;
    if (vaultAutofillState.openMenuEl && !vaultAutofillState.openMenuEl.contains(e.target)) {
      const t = e.target as Element;
      if (!t.closest?.(`[${BTN_ATTR}]`)) closeOpenMenu();
    }
  },
  true
);

/** Chip sits inside the trailing edge of the username/email field (or password fallback). */
function repositionVaultWidget(w: VaultWidgetEl) {
  const closeMenuIfThisWidget = () => {
    if (vaultAutofillState.openMenuAnchor && w.contains(vaultAutofillState.openMenuAnchor)) closeOpenMenu();
  };

  const pair = vaultAutofillState.widgetToPair.get(w);
  const pw = pair?.pw;
  const anchor = pair?.user ?? pw;
  if (!pw || !pw.isConnected || !anchor || !anchor.isConnected) {
    closeMenuIfThisWidget();
    unregisterWidget(w);
    w.vaultMenuEl?.remove();
    w.remove();
    return;
  }

  const cs = window.getComputedStyle(anchor);
  if (cs.display === 'none' || cs.visibility === 'hidden') {
    closeMenuIfThisWidget();
    w.style.visibility = 'hidden';
    return;
  }

  const r = anchor.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) {
    closeMenuIfThisWidget();
    w.style.visibility = 'hidden';
    return;
  }
  if (
    r.bottom < 0 ||
    r.top > window.innerHeight ||
    r.right < 0 ||
    r.left > window.innerWidth
  ) {
    closeMenuIfThisWidget();
    w.style.visibility = 'hidden';
    return;
  }

  /* Slot for icon (22px) + button padding; trailing edge (may overlap native password reveal) */
  const ICON = 28;
  const pad = 8;
  if (r.width < ICON + 10) {
    w.style.visibility = 'hidden';
    return;
  }

  w.style.visibility = 'visible';
  w.style.position = 'fixed';
  w.style.margin = '0';
  w.style.transform = 'none';

  void w.offsetWidth;

  let left = r.right - ICON - pad;
  const minL = r.left + 5;
  const maxL = r.right - ICON - 5;
  left = Math.max(minL, Math.min(left, maxL));
  const top = r.top + (r.height - ICON) / 2;

  w.style.left = `${Math.round(left)}px`;
  w.style.top = `${Math.round(top)}px`;
  w.style.zIndex = '2147483630';
}

function unregisterWidget(w: VaultWidgetEl): void {
  const pair = vaultAutofillState.widgetToPair.get(w);
  if (pair?.user) vaultAutofillState.userToWidget.delete(pair.user);
  if (pair?.pw) vaultAutofillState.pwToWidget.delete(pair.pw);
  vaultAutofillState.widgetToPair.delete(w);
}

function scheduleRepositionAllVaultWidgets() {
  if (vaultAutofillState.repositionScheduled) return;
  vaultAutofillState.repositionScheduled = true;
  requestAnimationFrame(() => {
    vaultAutofillState.repositionScheduled = false;
    document.querySelectorAll<HTMLElement>(`[${BTN_ATTR}]`).forEach((el) => {
      repositionVaultWidget(el as VaultWidgetEl);
    });
    if (vaultAutofillState.openMenuEl && vaultAutofillState.openMenuAnchor) {
      positionVaultDropdownMenu(vaultAutofillState.openMenuEl, vaultAutofillState.openMenuAnchor);
    }
  });
}

window.addEventListener('scroll', scheduleRepositionAllVaultWidgets, true);
window.addEventListener('resize', scheduleRepositionAllVaultWidgets);
visualViewport?.addEventListener?.('resize', scheduleRepositionAllVaultWidgets);
visualViewport?.addEventListener?.('scroll', scheduleRepositionAllVaultWidgets);

function makeMenuItem(label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.className = 'vault-ext-menu-item';
  b.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    closeOpenMenu();
    onClick();
  });
  return b;
}

function openCredentialPickerMenu(
  wrap: VaultWidgetEl,
  anchor: HTMLElement,
  options: CredentialOption[]
): void {
  const menu = document.createElement('div');
  menu.className = 'vault-ext-menu vault-ext-account-picker';
  applyExtThemeToElement(menu);
  menu.style.cssText = [
    'display:none',
    'position:fixed',
    'overflow-wrap:break-word',
    'word-break:break-word',
  ].join(';');

  const header = document.createElement('div');
  header.className = 'vault-ext-account-picker__header';
  {
    const icon = document.createElement('img');
    icon.alt = '';
    icon.className = 'vault-ext-account-picker__icon';
    icon.width = 18;
    icon.height = 18;
    icon.src = defaultToolbarIconUrl();
    void getToolbarIconUrl().then((u) => {
      icon.src = u;
    });
    header.appendChild(icon);
  }
  const title = document.createElement('span');
  title.textContent = 'Choose account from Inkrypt';
  header.appendChild(title);
  menu.appendChild(header);

  for (const opt of options) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'vault-ext-account-item';
    const top = document.createElement('span');
    top.className = 'vault-ext-account-item__top';
    top.textContent = opt.username || '(no username)';
    const sub = document.createElement('span');
    sub.className = 'vault-ext-account-item__sub';
    sub.textContent = opt.label?.trim() ? `${opt.label} Â· â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢` : 'â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢';
    item.append(top, sub);
    item.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      closeOpenMenu();
      requestFillForWidget(wrap, opt.id);
    });
    menu.appendChild(item);
  }

  document.body.appendChild(menu);
  openEphemeralVaultMenu(menu, anchor);
}

function requestFillForWidget(wrap: VaultWidgetEl, entryId?: string) {
  const pair = vaultAutofillState.widgetToPair.get(wrap);
  if (!pair) return;
  const anchor = wrap.querySelector('.vault-ext-ink-btn') as HTMLElement | null;
  if (!entryId && anchor) {
    void chrome.runtime.sendMessage(
      { type: 'LIST_CREDENTIAL_OPTIONS', siteUrl: location.hostname },
      (res: MsgRes & { data?: { options?: CredentialOption[] } }) => {
        if (res?.ok) {
          const options = Array.isArray(res.data?.options) ? res.data!.options! : [];
          if (options.length > 1) {
            openCredentialPickerMenu(wrap, anchor, options);
            return;
          }
          if (options.length === 1) {
            requestFillForWidget(wrap, options[0]!.id);
            return;
          }
        }
        if (res?.unlockNeeded) {
          showVaultAttentionOverlay(res.signInNeeded ? 'signin' : 'unlock', wrap);
          return;
        }
        requestFillForWidget(wrap, '__no_entry__');
      }
    );
    return;
  }

  vaultAutofillState.fillTargetPw = pair.pw;
  vaultAutofillState.fillTargetUser = pair.user;
  const primaryPw = pair.pw;
  void chrome.runtime.sendMessage(
    {
      type: 'GET_CREDENTIALS',
      siteUrl: location.hostname,
      ...(entryId && entryId !== '__no_entry__' ? { entryId } : {}),
    },
    (res: MsgRes) => {
      if (res?.ok) {
        /* Background sends FILL_CREDENTIAL; listener clears fillTarget* */
        return;
      }
      if (res?.unlockNeeded) {
        vaultAutofillState.fillTargetPw = null;
        vaultAutofillState.fillTargetUser = null;
        showVaultAttentionOverlay(res.signInNeeded ? 'signin' : 'unlock', wrap);
        return;
      }

      const err = res?.error ?? '';
      const noCreds = err === 'No credentials for this site';

      if (noCreds && isLikelySignupContext(primaryPw)) {
        vaultAutofillState.fillTargetPw = null;
        vaultAutofillState.fillTargetUser = null;
        const generated = generateRandomPassword(20);
        fillField(primaryPw, generated);
        fillConfirmPasswordIfPresent(primaryPw, generated);
        void navigator.clipboard.writeText(generated).then(
          () =>
            showToast(
              'No saved login for this site â€” strong password filled & copied (sign-up)'
            ),
          () =>
            showToast('No saved login for this site â€” strong password filled (clipboard blocked)')
        );
        return;
      }

      vaultAutofillState.fillTargetPw = null;
      vaultAutofillState.fillTargetUser = null;
      showToast(noCreds ? 'No credentials found for this site' : err || 'Could not fill login');
    }
  );
}

function getSaveNeverKey(site: string): string {
  return `inkrypt-save-never:${site}`;
}

/** After a successful save, block banner/submit prompts (refilling fields fires input events). */
function suppressSavePromptsForSite(site: string): void {
  sessionStorage.setItem(`inkrypt-save-suppress:${site}`, String(Date.now() + SAVE_PROMPT_SUPPRESS_MS));
  if (vaultAutofillState.saveHintTimer) {
    clearTimeout(vaultAutofillState.saveHintTimer);
    vaultAutofillState.saveHintTimer = null;
  }
}

function shouldSuppressSavePromptsForSite(site: string): boolean {
  const raw = sessionStorage.getItem(`inkrypt-save-suppress:${site}`);
  if (!raw) return false;
  const until = parseInt(raw, 10);
  if (Number.isNaN(until)) {
    sessionStorage.removeItem(`inkrypt-save-suppress:${site}`);
    return false;
  }
  if (Date.now() > until) {
    sessionStorage.removeItem(`inkrypt-save-suppress:${site}`);
    return false;
  }
  return true;
}

/** Match `normalizeSite` in background â€” compare pending save host to current page. */
function hostnameForPendingSave(input: string): string {
  const t = input.trim().toLowerCase();
  if (!t) return '';
  try {
    if (t.includes('://')) return new URL(t).hostname;
  } catch {
    /* fall through */
  }
  return t.split('/')[0].split('?')[0] ?? t;
}

async function persistPendingSaveOffer(
  siteUrl: string,
  username: string,
  password: string
): Promise<void> {
  if (!password.trim()) return;
  try {
    await chrome.runtime.sendMessage({
      type: 'SET_PENDING_SAVE',
      siteUrl,
      username,
      password,
    });
  } catch {
    /* ignore */
  }
}

async function clearPendingSaveOffer(): Promise<void> {
  try {
    await chrome.runtime.sendMessage({ type: 'CLEAR_PENDING_SAVE' });
  } catch {
    /* ignore */
  }
}

function isSaveModalOpen(): boolean {
  return document.querySelector('.vault-ext-modal-backdrop') != null;
}

function vaultMountModalRoot(el: HTMLElement): void {
  const b = document.body;
  if (b) b.appendChild(el);
  else document.documentElement.appendChild(el);
}

function clearPersistentSaveReconnectTimer(): void {
  if (vaultAutofillState.persistentSaveReopenTimer) {
    clearTimeout(vaultAutofillState.persistentSaveReopenTimer);
    vaultAutofillState.persistentSaveReopenTimer = null;
  }
}

function disconnectPersistentSaveObserver(): void {
  if (vaultAutofillState.persistentSaveObserver) {
    vaultAutofillState.persistentSaveObserver.disconnect();
    vaultAutofillState.persistentSaveObserver = null;
  }
}

function endPersistentAutoSaveOffer(): void {
  vaultAutofillState.persistentSaveUserDismissed = true;
  vaultAutofillState.persistentSavePayload = null;
  vaultAutofillState.persistentSaveReopenCount = 0;
  disconnectPersistentSaveObserver();
  clearPersistentSaveReconnectTimer();
}

function schedulePersistentSaveModalReconnect(): void {
  if (vaultAutofillState.persistentSaveUserDismissed || !vaultAutofillState.persistentSavePayload) return;
  if (vaultAutofillState.persistentSaveReopenTimer != null) return;
  vaultAutofillState.persistentSaveReopenTimer = window.setTimeout(() => {
    vaultAutofillState.persistentSaveReopenTimer = null;
    if (vaultAutofillState.persistentSaveUserDismissed || !vaultAutofillState.persistentSavePayload) return;
    if (document.querySelector('.vault-ext-modal-backdrop')) return;
    if (vaultAutofillState.persistentSaveReopenCount >= PERSISTENT_SAVE_MAX_REOPEN) {
      vaultAutofillState.persistentSavePayload = null;
      disconnectPersistentSaveObserver();
      return;
    }
    vaultAutofillState.persistentSaveReopenCount += 1;
    const p = vaultAutofillState.persistentSavePayload;
    void openSaveModalFromValues(p.site, p.username, p.password, null, null, {
      persistentAutoOffer: true,
      isPersistentReconnect: true,
    });
  }, 100);
}

function startPersistentAutoSaveOfferTracking(payload: PersistentSavePayload): void {
  disconnectPersistentSaveObserver();
  clearPersistentSaveReconnectTimer();
  vaultAutofillState.persistentSaveUserDismissed = false;
  vaultAutofillState.persistentSavePayload = { ...payload };

  vaultAutofillState.persistentSaveObserver = new MutationObserver(() => {
    if (vaultAutofillState.persistentSaveUserDismissed || !vaultAutofillState.persistentSavePayload) return;
    if (document.querySelector('.vault-ext-modal-backdrop')) return;
    schedulePersistentSaveModalReconnect();
  });
  vaultAutofillState.persistentSaveObserver.observe(document.documentElement, { childList: true, subtree: true });
}

function captureLoginFormCredentials(form: HTMLFormElement): {
  username: string;
  password: string;
  pwEl: HTMLInputElement;
  userEl: HTMLInputElement | null;
} | null {
  const pw = pickLoginPasswordFromForm(form);
  if (!pw || !isPasswordFieldEligible(pw)) return null;
  const userEl = findUsernameNearPassword(pw);
  const rawUser = (userEl?.value ?? '').trim();
  const username = enrichUsernameFromPageAndSession(pw, rawUser);
  const password = (pw.value ?? '').trim();
  if (!password) return null;
  return { username, password, pwEl: pw, userEl };
}

/** Same as form capture but when the submit control is not inside a `<form>` (common on Microsoft / SPA login). */
function captureCredentialsNearPasswordField(pw: HTMLInputElement): {
  username: string;
  password: string;
  pwEl: HTMLInputElement;
  userEl: HTMLInputElement | null;
  site: string;
} | null {
  if (!isPasswordFieldEligible(pw)) return null;
  const userEl = findUsernameNearPassword(pw);
  const rawUser = (userEl?.value ?? '').trim();
  const username = enrichUsernameFromPageAndSession(pw, rawUser);
  const password = (pw.value ?? '').trim();
  if (!password) return null;
  return {
    username,
    password,
    pwEl: pw,
    userEl,
    site: location.hostname,
  };
}

function isLikelyLoginSubmitButton(el: Element): boolean {
  if (el instanceof HTMLInputElement) return el.type === 'submit';
  if (!(el instanceof HTMLButtonElement)) return false;
  const t = (el.getAttribute('type') ?? 'submit').toLowerCase();
  if (t === 'reset') return false;
  if (t === 'submit') return true;
  if (t === 'button') {
    const label = `${el.textContent ?? ''} ${el.getAttribute('aria-label') ?? ''}`.toLowerCase();
    return /\b(log\s*in|sign\s*in|log\s*on|submit)\b/i.test(label);
  }
  return false;
}

/** SPAs often skip form "submit" or navigate before one timeout â€” retry a few times with frozen creds. */
function scheduleSaveOfferAttempts(snap: SaveOfferSnap): void {
  const now = Date.now();
  if (snap.site === vaultAutofillState.lastSaveOfferScheduleSite && now - vaultAutofillState.lastSaveOfferScheduleAt < 120) return;
  vaultAutofillState.lastSaveOfferScheduleSite = snap.site;
  vaultAutofillState.lastSaveOfferScheduleAt = now;

  const delays = [200, 900, 2200, 4500];
  for (const ms of delays) {
    window.setTimeout(() => void offerSaveAfterSubmit(snap), ms);
  }
}

async function openSaveModalFromValues(
  site: string,
  username: string,
  password: string,
  pw: HTMLInputElement | null,
  userEl: HTMLInputElement | null,
  options?: OpenSaveModalOptions
): Promise<void> {
  ensureVaultPageUiInjected();
  if (pw?.hasAttribute(PW_VAULT_AUTOFILL_ATTR)) {
    showToast('This login came from Inkrypt â€” nothing new to save here.');
    return;
  }
  let resolvedUser = username;
  if (pw && !resolvedUser.trim()) {
    resolvedUser = enrichUsernameFromPageAndSession(pw, resolvedUser);
  }
  if (!password.trim()) {
    showToast('Enter a password first');
    return;
  }
  if (isSaveModalOpen()) return;
  if (vaultAutofillState.openSaveModalInFlight) return;
  vaultAutofillState.openSaveModalInFlight = true;

  try {
    let savedUsernames: string[] = [];
    try {
      const res = (await chrome.runtime.sendMessage({
        type: 'USERNAMES_FOR_SITE',
        siteUrl: site,
      })) as MsgRes & { data?: { usernames?: string[] } };
      if (res?.ok && Array.isArray(res.data?.usernames)) savedUsernames = res.data!.usernames!;
    } catch {
      /* ignore */
    }

    if (isSaveModalOpen()) return;

    clearPersistentSaveReconnectTimer();
    if (!options?.persistentAutoOffer) {
      endPersistentAutoSaveOffer();
    } else {
      disconnectPersistentSaveObserver();
    }

    const backdrop = document.createElement('div');
    backdrop.className = 'vault-ext-modal-backdrop';
    backdrop.setAttribute(VAULT_SAVE_MODAL_ATTR, '1');
    applyExtThemeToElement(backdrop);

  const card = document.createElement('div');
  card.className = 'vault-ext-modal-card';

  const title = document.createElement('h2');
  title.className = 'vault-ext-modal-title';
  title.textContent = 'Save password to Inkrypt?';

  const subtitle = document.createElement('p');
  subtitle.className = 'vault-ext-modal-subtitle';
  subtitle.textContent = `You can save this login for ${site} and fill it next time from the Inkrypt icon on the page.`;

  let splitStepHint: HTMLElement | null = null;
  if (!resolvedUser.trim()) {
    splitStepHint = document.createElement('p');
    splitStepHint.className = 'vault-ext-modal-subtitle';
    splitStepHint.style.marginTop = '0.35rem';
    splitStepHint.style.opacity = '0.92';
    splitStepHint.textContent =
      'Email or username may have been on a previous step (e.g. Microsoft / Google) â€” enter it in the field below if itâ€™s empty.';
  }

  const labelIn = document.createElement('input');
  labelIn.className = 'vault-ext-input';
  labelIn.placeholder = 'Label (optional)';

  const userFieldId = `vault-ext-save-user-${Date.now()}`;
  const userLabel = document.createElement('label');
  userLabel.className = 'vault-ext-modal-field-label';
  userLabel.textContent = 'Username or email';
  userLabel.setAttribute('for', userFieldId);

  const userIn = document.createElement('input');
  userIn.className = 'vault-ext-input';
  userIn.id = userFieldId;
  userIn.placeholder = 'Email or username (optional)';
  userIn.setAttribute('autocomplete', 'username');
  userIn.value = resolvedUser;

  const userBlock = document.createElement('div');
  userBlock.appendChild(userLabel);
  if (savedUsernames.length >= 1) {
    const listId = `vault-ext-userlist-${Date.now()}`;
    userIn.setAttribute('list', listId);
    const dl = document.createElement('datalist');
    dl.id = listId;
    for (const u of savedUsernames) {
      const opt = document.createElement('option');
      opt.value = u;
      dl.appendChild(opt);
    }
    userBlock.appendChild(dl);
  }
  userBlock.appendChild(userIn);

  const passLabel = document.createElement('label');
  passLabel.className = 'vault-ext-modal-field-label';
  passLabel.textContent = 'Password';
  const passId = `vault-ext-save-pass-${Date.now()}`;
  passLabel.setAttribute('for', passId);

  const passIn = document.createElement('input');
  passIn.className = 'vault-ext-input';
  passIn.id = passId;
  passIn.type = 'password';
  passIn.placeholder = 'Password';
  passIn.value = password;
  passIn.setAttribute('autocomplete', 'new-password');

  const suggestHint =
    savedUsernames.length > 1
      ? document.createElement('p')
      : null;
  if (suggestHint) {
    suggestHint.className = 'vault-ext-modal-subtitle';
    suggestHint.style.marginTop = '-4px';
    suggestHint.style.marginBottom = '10px';
    suggestHint.textContent =
      'Multiple accounts saved for this site â€” use the username suggestions or type another.';
  }

  const totpLabel = document.createElement('div');
  totpLabel.className = 'vault-ext-field-hint';
  totpLabel.textContent = 'Website 2FA (optional) â€” Base32 or otpauth://â€¦';

  const totpIn = document.createElement('textarea');
  totpIn.className = 'vault-ext-textarea';
  totpIn.placeholder = 'Paste TOTP secret here';
  totpIn.rows = 2;

  const row = document.createElement('div');
  row.className = 'vault-ext-modal-actions vault-ext-modal-actions--triple';

  const neverBtn = document.createElement('button');
  neverBtn.type = 'button';
  neverBtn.textContent = 'Never';
  neverBtn.className = 'vault-ext-btn-never';

  const spacer = document.createElement('span');
  spacer.className = 'vault-ext-modal-actions-spacer';
  spacer.setAttribute('aria-hidden', 'true');

  const noThanks = document.createElement('button');
  noThanks.type = 'button';
  noThanks.textContent = 'No thanks';
  noThanks.className = 'vault-ext-btn-cancel';

  const save = document.createElement('button');
  save.type = 'button';
  save.textContent = 'Save';
  save.className = 'vault-ext-btn-save';

  const dismissModal = () => {
    endPersistentAutoSaveOffer();
    void clearPendingSaveOffer();
    backdrop.remove();
  };

  neverBtn.addEventListener('click', () => {
    sessionStorage.setItem(getSaveNeverKey(site), '1');
    dismissModal();
  });
  noThanks.addEventListener('click', dismissModal);
  save.addEventListener('click', () => {
    const totpSecret = parseTotpPaste(totpIn.value);
    if (totpIn.value.trim() && !totpSecret) {
      showToast('Invalid 2FA secret or otpauth URL');
      return;
    }
    const savedUser = userIn.value.trim();
    const savedPass = passIn.value;
    void chrome.runtime.sendMessage(
      {
        type: 'SAVE_ENTRY',
        siteUrl: site,
        label: labelIn.value.trim(),
        username: savedUser,
        password: savedPass,
        totpSecret: totpSecret ?? null,
      },
      (res: MsgRes) => {
        if (chrome.runtime.lastError || !res?.ok) {
          if (res?.unlockNeeded) {
            showVaultAttentionOverlay('unlock', null);
            showToast(res?.error ?? 'Unlock Inkrypt to save this login');
          } else if (res?.signInNeeded) {
            showVaultAttentionOverlay('signin', null);
            showToast(res?.error ?? 'Sign in to Inkrypt to save');
          } else {
            showToast(res?.error ?? chrome.runtime.lastError?.message ?? 'Save failed');
          }
          return;
        }
        endPersistentAutoSaveOffer();
        void clearPendingSaveOffer();
        backdrop.remove();
        suppressSavePromptsForSite(site);
        if (userEl?.isConnected) fillField(userEl, savedUser);
        if (pw?.isConnected) fillField(pw, savedPass);
        showToast('Saved in Inkrypt');
        void refreshBadge();
      }
    );
  });

  row.append(neverBtn, spacer, noThanks, save);

  const passBlock = document.createElement('div');
  passBlock.append(passLabel, passIn);

  card.append(title, subtitle, ...(splitStepHint ? [splitStepHint] : []), labelIn, userBlock);
  if (suggestHint) card.appendChild(suggestHint);
  card.append(passBlock, totpLabel, totpIn, row);
  backdrop.appendChild(card);
  backdrop.addEventListener('click', (ev) => {
    if (ev.target === backdrop) dismissModal();
  });
    if (isSaveModalOpen()) return;
    vaultMountModalRoot(backdrop);
    if (options?.persistentAutoOffer) {
      if (!options.isPersistentReconnect) {
        vaultAutofillState.persistentSaveReopenCount = 0;
      }
      startPersistentAutoSaveOfferTracking({ site, username: resolvedUser, password });
      void persistPendingSaveOffer(site, userIn.value, passIn.value);
      let persistDebounce: ReturnType<typeof setTimeout> | null = null;
      const queuePersistFields = () => {
        if (persistDebounce) clearTimeout(persistDebounce);
        persistDebounce = window.setTimeout(() => {
          persistDebounce = null;
          void persistPendingSaveOffer(site, userIn.value, passIn.value);
        }, 400);
      };
      userIn.addEventListener('input', queuePersistFields);
      passIn.addEventListener('input', queuePersistFields);
    }
    userIn.focus();
  } finally {
    vaultAutofillState.openSaveModalInFlight = false;
  }
}

/** After a full navigation (e.g. /login â†’ /home), reopen the save dialog from extension session storage. */
async function restorePendingSaveIfAny(): Promise<void> {
  if (isSaveModalOpen()) return;
  if (vaultAutofillState.openSaveModalInFlight) return;
  try {
    const res = (await chrome.runtime.sendMessage({ type: 'GET_PENDING_SAVE' })) as MsgRes & {
      data?: {
        siteUrl: string;
        username: string;
        password: string;
        savedAt: number;
      } | null;
    };
    if (!res?.ok || res.data == null) return;
    const p = res.data;
    if (!p.password?.trim()) return;
    const host = location.hostname;
    if (hostnameForPendingSave(p.siteUrl) !== hostnameForPendingSave(host)) return;
    if (shouldSuppressSavePromptsForSite(host)) {
      await clearPendingSaveOffer();
      return;
    }
    if (sessionStorage.getItem(getSaveNeverKey(host))) {
      await clearPendingSaveOffer();
      return;
    }
    if (!(await inkryptAuthSignedIn())) return;
    let pendingUser = (p.username ?? '').trim();
    const pwOnPage =
      Array.from(document.querySelectorAll<HTMLInputElement>('input[type="password"]')).find((el) =>
        isPasswordFieldEligible(el)
      ) ?? null;
    if (pwOnPage?.isConnected) {
      pendingUser = enrichUsernameFromPageAndSession(pwOnPage, pendingUser);
    } else {
      try {
        const s = sessionStorage.getItem(sessionIdentityKey(host));
        if (!pendingUser && s?.trim()) pendingUser = s.trim();
      } catch {
        /* ignore */
      }
    }
    if (pendingUser && (await isUsernameAlreadySavedForSite(host, pendingUser))) {
      await clearPendingSaveOffer();
      return;
    }
    await openSaveModalFromValues(p.siteUrl, pendingUser, p.password, pwOnPage ?? null, null, {
      persistentAutoOffer: true,
    });
  } catch {
    /* ignore */
  }
}

async function openSaveModal(pw: HTMLInputElement): Promise<void> {
  if (pw.hasAttribute(PW_VAULT_AUTOFILL_ATTR)) {
    showToast('This login came from Inkrypt â€” nothing new to save here.');
    return;
  }
  const { username, password, userEl } = getCredentialsFromInputs(pw);
  if (!password.trim()) {
    showToast('Enter a password first');
    return;
  }
  const u = enrichUsernameFromPageAndSession(pw, username);
  await openSaveModalFromValues(location.hostname, u, password, pw, userEl);
}

async function offerSaveAfterSubmit(snap: SaveOfferSnap): Promise<void> {
  if (snap.pwEl.hasAttribute(PW_VAULT_AUTOFILL_ATTR)) return;
  if (shouldSuppressSavePromptsForSite(snap.site)) return;
  if (sessionStorage.getItem(getSaveNeverKey(snap.site))) return;
  if (isSaveModalOpen()) return;
  if (!(await inkryptAuthSignedIn())) return;
  const u = enrichUsernameFromPageAndSession(snap.pwEl, snap.username).trim();
  if (u && (await isUsernameAlreadySavedForSite(snap.site, u))) return;

  const countRes = (await chrome.runtime.sendMessage({
    type: 'COUNT_FOR_SITE',
    siteUrl: snap.site,
  })) as MsgRes & { data?: { count?: number } };
  const count = countRes?.data?.count ?? 0;
  if (count > 0 && isLikelyPasswordResetWithoutUsernameForm(snap.pwEl)) return;

  void persistPendingSaveOffer(snap.site, u, snap.password);
  await openSaveModalFromValues(snap.site, u, snap.password, snap.pwEl, snap.userEl, {
    persistentAutoOffer: true,
  });
}

/** Signed in to Inkrypt account â€” vault may still be locked (unlock only needed to encrypt/save or fill). */
async function inkryptAuthSignedIn(): Promise<boolean> {
  const res = (await chrome.runtime.sendMessage({ type: 'GET_STATE' })) as MsgRes & {
    data?: { auth?: { status?: string } };
  };
  return !!(res?.ok && res.data?.auth?.status === 'signed_in');
}

/** Skip auto save prompts when this email/username is already stored for the site. */
async function isUsernameAlreadySavedForSite(site: string, username: string): Promise<boolean> {
  const u = username.trim();
  if (!u) return false;
  try {
    const res = (await chrome.runtime.sendMessage({
      type: 'HAS_USERNAME_FOR_SITE',
      siteUrl: site,
      username: u,
    })) as MsgRes & { data?: { saved?: boolean } };
    return !!(res?.ok && res.data?.saved);
  } catch {
    return false;
  }
}

async function getVaultGate(): Promise<'ok' | 'signin' | 'unlock'> {
  const res = (await chrome.runtime.sendMessage({ type: 'GET_STATE' })) as MsgRes & {
    data?: { vaultUnlocked?: boolean; auth?: { status?: string } };
  };
  if (!res?.ok) return 'signin';
  const auth = res.data?.auth?.status;
  if (auth !== 'signed_in') return 'signin';
  if (!res.data?.vaultUnlocked) return 'unlock';
  return 'ok';
}

function scheduleSaveHintFromForm(form: HTMLFormElement) {
  if (vaultAutofillState.saveHintTimer) clearTimeout(vaultAutofillState.saveHintTimer);
  vaultAutofillState.saveHintTimer = setTimeout(() => void maybeShowSaveBannerForForm(form), 750);
}

function scheduleSaveHintOrphan(pw: HTMLInputElement) {
  if (vaultAutofillState.saveHintTimer) clearTimeout(vaultAutofillState.saveHintTimer);
  vaultAutofillState.saveHintTimer = setTimeout(() => void maybeShowSaveBanner(pw), 750);
}

/** Wire every password field in the form so login, signup, change-password, etc. all trigger the save hint. */
function wireFormSaveDetection(form: HTMLFormElement, primaryPw: HTMLInputElement) {
  const pws = Array.from(form.querySelectorAll<HTMLInputElement>('input[type="password"]')).filter(
    isPasswordFieldEligible
  );
  const fire = () => scheduleSaveHintFromForm(form);

  for (const p of pws) {
    if (vaultAutofillState.wiredHint.has(p)) continue;
    vaultAutofillState.wiredHint.add(p);
    p.addEventListener('input', fire);
    p.addEventListener('blur', fire);
  }

  const u = findUsernameNearPassword(primaryPw);
  if (u && !vaultAutofillState.userSaveWired.has(u)) {
    vaultAutofillState.userSaveWired.add(u);
    u.addEventListener('input', fire);
    u.addEventListener('blur', fire);
    const remember = () => rememberSessionIdentityEmail(u.value);
    u.addEventListener('input', remember);
    u.addEventListener('change', remember);
    u.addEventListener('blur', remember);
  }
}

function wireOrphanSaveDetection(pw: HTMLInputElement) {
  if (vaultAutofillState.wiredHint.has(pw)) return;
  vaultAutofillState.wiredHint.add(pw);
  const fire = () => scheduleSaveHintOrphan(pw);
  pw.addEventListener('input', fire);
  pw.addEventListener('blur', fire);
  const u = findUsernameNearPassword(pw);
  if (u && !vaultAutofillState.userSaveWired.has(u)) {
    vaultAutofillState.userSaveWired.add(u);
    u.addEventListener('input', fire);
    u.addEventListener('blur', fire);
    const remember = () => rememberSessionIdentityEmail(u.value);
    u.addEventListener('input', remember);
    u.addEventListener('change', remember);
    u.addEventListener('blur', remember);
  }
}

async function maybeShowSaveBannerForForm(form: HTMLFormElement) {
  const pw = pickLoginPasswordFromForm(form);
  if (!pw) return;
  await maybeShowSaveBanner(pw);
}

async function maybeShowSaveBanner(pw: HTMLInputElement) {
  const host = location.hostname;
  if (pw.hasAttribute(PW_VAULT_AUTOFILL_ATTR)) return;
  if (shouldSuppressSavePromptsForSite(host)) return;

  const dismissKey = `vault-hint-dismiss:${host}`;
  if (sessionStorage.getItem(dismissKey)) return;

  const { password, username } = getCredentialsFromInputs(pw);
  if (!password.trim()) return;
  if (!(await inkryptAuthSignedIn())) return;
  const userTrim = enrichUsernameFromPageAndSession(pw, username).trim();
  if (userTrim && (await isUsernameAlreadySavedForSite(host, userTrim))) return;

  const countRes = (await chrome.runtime.sendMessage({
    type: 'COUNT_FOR_SITE',
    siteUrl: host,
  })) as MsgRes & { data?: { count?: number } };
  const count = countRes?.data?.count ?? 0;

  if (count > 0 && isLikelyPasswordResetWithoutUsernameForm(pw)) return;

  const id = 'vault-save-suggestion-banner';
  if (document.getElementById(id)) return;

  ensureVaultPageUiInjected();

  const bar = document.createElement('div');
  bar.id = id;
  bar.className = 'vault-ext-banner';
  applyExtThemeToElement(bar);

  const top = document.createElement('div');
  top.className = 'vault-ext-banner__top';

  {
    const icon = document.createElement('img');
    icon.className = 'vault-ext-banner__icon';
    icon.alt = '';
    icon.draggable = false;
    icon.src = defaultToolbarIconUrl();
    void getToolbarIconUrl().then((u) => {
      icon.src = u;
    });
    top.appendChild(icon);
  }

  const text = document.createElement('span');
  text.className = 'vault-ext-banner-text';
  text.textContent =
    count === 0
      ? 'Save this password in Inkrypt?'
      : 'Save this login in Inkrypt too? (separate entry for this site)';
  top.appendChild(text);

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.textContent = 'Saveâ€¦';
  saveBtn.className = 'vault-ext-btn-primary';

  const dismissBtn = document.createElement('button');
  dismissBtn.type = 'button';
  dismissBtn.textContent = 'Dismiss';
  dismissBtn.className = 'vault-ext-btn-secondary';

  saveBtn.addEventListener('click', (e) => {
    e.preventDefault();
    bar.remove();
    openSaveModal(pw);
  });
  dismissBtn.addEventListener('click', () => {
    sessionStorage.setItem(dismissKey, '1');
    bar.remove();
  });

  const actions = document.createElement('div');
  actions.className = 'vault-ext-banner__actions';
  actions.append(dismissBtn, saveBtn);

  bar.append(top, actions);
  document.body.appendChild(bar);
}

function makeInkryptWidget(
  anchorField: HTMLInputElement,
  primaryPw: HTMLInputElement,
  userEl: HTMLInputElement | null
): VaultWidgetEl {
  ensureVaultPageUiInjected();

  const wrap = document.createElement('span') as VaultWidgetEl;
  wrap.className = 'vault-ext-ink-wrap';
  wrap.setAttribute(BTN_ATTR, '1');
  applyExtThemeToElement(wrap);

  const main = document.createElement('button');
  main.type = 'button';
  main.className = 'vault-ext-ink-btn';
  main.setAttribute('aria-label', 'Inkrypt: fill saved login');
  main.title = 'Fill saved login â€” right-click for more';
  const img = document.createElement('img');
  img.alt = '';
  img.className = 'vault-ext-ink-img';
  img.width = 22;
  img.height = 22;
  img.draggable = false;
  img.src = defaultToolbarIconUrl();
  void getToolbarIconUrl().then((u) => {
    img.src = u;
  });
  main.appendChild(img);

  const menu = document.createElement('div');
  menu.className = 'vault-ext-menu';
  applyExtThemeToElement(menu);
  menu.style.cssText = [
    'display:none',
    'position:fixed',
    'overflow-wrap:break-word',
    'word-break:break-word',
  ].join(';');

  menu.append(
    makeMenuItem('Fill saved login', () => requestFillForWidget(wrap)),
    makeMenuItem('Save / add 2FAâ€¦', () => {
      void (async () => {
        const gate = await getVaultGate();
        if (gate === 'signin') {
          showVaultAttentionOverlay('signin', wrap);
          return;
        }
        if (gate === 'unlock') {
          showVaultAttentionOverlay('unlock', wrap);
          return;
        }
        openSaveModal(primaryPw);
      })();
    }),
    makeMenuItem('Generate password', () => {
      const generated = generateRandomPassword(20);
      fillField(primaryPw, generated);
      void navigator.clipboard.writeText(generated).then(
        () => showToast('Strong password filled & copied'),
        () => showToast('Password filled (clipboard blocked)')
      );
    })
  );

  main.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    requestFillForWidget(wrap);
  });

  main.addEventListener('contextmenu', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    if (vaultAutofillState.openMenuEl === menu) {
      closeOpenMenu();
      return;
    }
    openVaultMenu(menu, main);
  });

  wrap.vaultMenuEl = menu;
  document.body.appendChild(menu);
  wrap.append(main);
  return wrap;
}

function attachPairWidget(loginPw: HTMLInputElement) {
  if (!isPasswordFieldEligible(loginPw)) return;

  const user = findUsernameNearPassword(loginPw);
  const primaryPw =
    loginPw.form != null ? pickLoginPasswordFromForm(loginPw.form) ?? loginPw : loginPw;
  const pairUser = user && isEligibleUsernameField(user) ? user : null;

  let w: VaultWidgetEl | undefined;
  if (pairUser) w = vaultAutofillState.userToWidget.get(pairUser);
  if (!w) w = vaultAutofillState.pwToWidget.get(primaryPw);

  if (!w || !document.body.contains(w)) {
    const anchor = pairUser ?? primaryPw;
    w = makeInkryptWidget(anchor, primaryPw, pairUser);
    document.body.appendChild(w);
    if (pairUser) vaultAutofillState.userToWidget.set(pairUser, w);
    vaultAutofillState.pwToWidget.set(primaryPw, w);
  }

  vaultAutofillState.widgetToPair.set(w, { user: pairUser, pw: primaryPw });
  applyExtThemeToElement(w);
  if (w.vaultMenuEl) applyExtThemeToElement(w.vaultMenuEl as HTMLElement);
  repositionVaultWidget(w);
  const form = primaryPw.form;
  if (form) wireFormSaveDetection(form, primaryPw);
  else wireOrphanSaveDetection(primaryPw);
}

function scan() {
  document.querySelectorAll<VaultWidgetEl>(`[${BTN_ATTR}]`).forEach((el) => {
    const w = el as VaultWidgetEl;
    const pair = vaultAutofillState.widgetToPair.get(w);
    const pw = pair?.pw;
    const user = pair?.user;
    if (!pw || !pw.isConnected || (user != null && !user.isConnected)) {
      if (vaultAutofillState.openMenuEl === w.vaultMenuEl) closeOpenMenu();
      unregisterWidget(w);
      w.vaultMenuEl?.remove();
      w.remove();
    }
  });

  const seenForms = new WeakSet<HTMLFormElement>();
  const orphans: HTMLInputElement[] = [];

  document.querySelectorAll<HTMLInputElement>('input[type="password"]').forEach((pw) => {
    if (!isPasswordFieldEligible(pw)) return;
    if (pw.closest(`[${VAULT_SAVE_MODAL_ATTR}="1"]`)) return;
    const form = pw.form;
    if (form) {
      if (seenForms.has(form)) return;
      seenForms.add(form);
      const loginPw = pickLoginPasswordFromForm(form);
      if (loginPw) attachPairWidget(loginPw);
    } else {
      orphans.push(pw);
    }
  });

  for (const pw of orphans) {
    attachPairWidget(pw);
  }

  scheduleRepositionAllVaultWidgets();
  wireIdentityEmailCapture();
}

async function refreshBadge() {
  try {
    const res = (await chrome.runtime.sendMessage({
      type: 'COUNT_FOR_SITE',
      siteUrl: location.hostname,
    })) as MsgRes & { data?: { count?: number } };
    const n = res?.data?.count ?? 0;
    await chrome.runtime.sendMessage({ type: 'SET_BADGE', text: n > 0 ? String(n) : '' });
  } catch {
    /* ignore */
  }
}

void refreshBadge();

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'TRIGGER_INKRYPT_FILL_ACTIVE_TAB') {
    const wrap = document.querySelector(`[${BTN_ATTR}]`) as VaultWidgetEl | null;
    const pair = wrap ? vaultAutofillState.widgetToPair.get(wrap) : undefined;
    if (!wrap || !pair) {
      sendResponse?.({ ok: false, error: 'No Inkrypt chip on this page â€” open a login form' });
      return false;
    }
    requestFillForWidget(wrap);
    sendResponse?.({ ok: true });
    return false;
  }

  if (msg?.type !== 'FILL_CREDENTIAL') return false;

  const pw =
    vaultAutofillState.fillTargetPw ??
    Array.from(document.querySelectorAll<HTMLInputElement>('input[type="password"]')).find(
      (el) => el.offsetParent !== null || document.activeElement === el
    ) ??
    null;
  const userEl = vaultAutofillState.fillTargetUser ?? (pw ? findUsernameNearPassword(pw) : null);
  vaultAutofillState.fillTargetPw = null;
  vaultAutofillState.fillTargetUser = null;
  if (!pw) return false;

  if (passwordResetPathOrToken()) {
    const form = pw.form;
    const hasCurrentPw = form
      ? Array.from(form.querySelectorAll<HTMLInputElement>('input[type="password"]')).some(
          (p) => isPasswordFieldEligible(p) && isLikelyCurrentPasswordField(p)
        )
      : false;
    if (hasCurrentPw) {
      showToast(
        'Inkrypt: not filling your saved password here. Rightâ€‘click the icon â†’ Generate password for the new one.'
      );
      return false;
    }
    const primary = form ? pickLoginPasswordFromForm(form) ?? pw : pw;
    const gen = generateRandomPassword(20);
    fillField(primary, gen);
    fillConfirmPasswordIfPresent(primary, gen);
    void navigator.clipboard.writeText(gen).then(
      () =>
        showToast(
          'Reset page â€” new strong password filled & copied. Your Inkrypt vault password stays the same until you save again.'
        ),
      () => showToast('Reset page â€” new strong password filled (clipboard blocked).')
    );
    return false;
  }

  fillField(userEl, (msg as { username?: string }).username ?? '');
  fillField(pw, (msg as { password?: string }).password ?? '');
  markPasswordFilledByVault(pw);
  const totp = (msg as { totpCode?: string }).totpCode;
  if (totp) {
    void navigator.clipboard.writeText(totp).then(() => {
      showToast('2FA code copied â€” paste in the code field');
    });
  }
  return false;
});

document.addEventListener(
  'submit',
  (e) => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement)) return;
    const creds = captureLoginFormCredentials(form);
    if (!creds) return;
    scheduleSaveOfferAttempts({
      username: creds.username,
      password: creds.password,
      pwEl: creds.pwEl,
      userEl: creds.userEl,
      site: location.hostname,
    });
  },
  true
);

document.addEventListener(
  'click',
  (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const btn = t.closest('button, input[type="submit"]');
    if (!btn || !isLikelyLoginSubmitButton(btn)) return;
    const form =
      btn instanceof HTMLInputElement || btn instanceof HTMLButtonElement ? btn.form : null;

    let creds: {
      username: string;
      password: string;
      pwEl: HTMLInputElement;
      userEl: HTMLInputElement | null;
    } | null = null;

    if (form?.querySelector('input[type="password"]')) {
      creds = captureLoginFormCredentials(form);
    }
    if (!creds) {
      const pwNear = findPasswordFieldNearLoginButton(btn);
      if (pwNear) creds = captureCredentialsNearPasswordField(pwNear);
    }
    if (!creds) return;

    scheduleSaveOfferAttempts({
      username: creds.username,
      password: creds.password,
      pwEl: creds.pwEl,
      userEl: creds.userEl,
      site: location.hostname,
    });
  },
  true
);

const mo = new MutationObserver(() => scan());
mo.observe(document.documentElement, { childList: true, subtree: true });
scan();
void restorePendingSaveIfAny();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void restorePendingSaveIfAny();
});
window.addEventListener('pageshow', () => void restorePendingSaveIfAny());
setInterval(scan, 2000);
setInterval(refreshBadge, 30000);
