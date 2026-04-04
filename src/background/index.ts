import type { MessagePayload, MessageResponse } from '../utils/messages';
import {
  BRANDING_STORAGE_MAIN_LOGO,
  BRANDING_STORAGE_TOOLBAR_ICON,
} from '../constants/branding';
import { applyToolbarIconFromStorage } from './branding';
import * as auth from './auth';
import { focusOrOpenVaultPopupWindow } from './openVaultWindow';
import * as session from './session';
import {
  countEntriesForSite,
  deleteEntry,
  disableVaultTwoFactor,
  enableVaultTwoFactor,
  getCredentialsForSite,
  isVaultUnlocked,
  listDecryptedEntries,
  listCredentialOptionsForSite,
  listUsernamesForSite,
  hasUsernameOnSite,
  lockVaultKey,
  saveEntry,
  unlockVaultKey,
  updateEntry,
} from './vault';
import { isVault2faEnabled } from './vault2faStorage';
import { generateVault2faProvisioning } from '../utils/totp';

session.scheduleLockAlarm();

const PENDING_SAVE_KEY = (tabId: number) => `pendingSaveTab:${tabId}`;
const PENDING_SAVE_MAX_AGE_MS = 45 * 60 * 1000;

type PendingSavePayload = {
  siteUrl: string;
  username: string;
  password: string;
  savedAt: number;
};

chrome.alarms.onAlarm.addListener((a) => {
  if (a.name !== 'vault-inactivity-check') return;
  if (session.shouldAutoLock() && isVaultUnlocked()) {
    lockVaultKey();
  }
});

chrome.runtime.onInstalled.addListener(() => {
  void auth.loadSession();
});

async function getState() {
  const s = await auth.loadSession();
  let vault2faEnabled = false;
  if (s.status === 'signed_in') {
    const uid = s.session?.user?.id;
    if (uid) vault2faEnabled = await isVault2faEnabled(uid);
  }
  return {
    auth: s,
    vaultUnlocked: isVaultUnlocked(),
    vault2faEnabled,
  };
}

chrome.runtime.onMessage.addListener(
  (msg: MessagePayload, sender, sendResponse: (r: MessageResponse) => void) => {
    void (async () => {
      session.touchActivity();
      try {
        switch (msg.type) {
          case 'GET_STATE': {
            sendResponse({ ok: true, data: await getState() });
            break;
          }
          case 'GET_BRANDING': {
            const data = await chrome.storage.local.get([
              BRANDING_STORAGE_MAIN_LOGO,
              BRANDING_STORAGE_TOOLBAR_ICON,
            ]);
            sendResponse({
              ok: true,
              data: {
                mainLogoDataUrl:
                  typeof data[BRANDING_STORAGE_MAIN_LOGO] === 'string'
                    ? (data[BRANDING_STORAGE_MAIN_LOGO] as string)
                    : null,
                toolbarIconDataUrl:
                  typeof data[BRANDING_STORAGE_TOOLBAR_ICON] === 'string'
                    ? (data[BRANDING_STORAGE_TOOLBAR_ICON] as string)
                    : null,
              },
            });
            break;
          }
          case 'SET_BRANDING': {
            if (msg.mainLogoDataUrl === null) {
              await chrome.storage.local.remove(BRANDING_STORAGE_MAIN_LOGO);
            } else if (msg.mainLogoDataUrl !== undefined) {
              await chrome.storage.local.set({
                [BRANDING_STORAGE_MAIN_LOGO]: msg.mainLogoDataUrl,
              });
            }
            if (msg.toolbarIconDataUrl === null) {
              await chrome.storage.local.remove(BRANDING_STORAGE_TOOLBAR_ICON);
            } else if (msg.toolbarIconDataUrl !== undefined) {
              await chrome.storage.local.set({
                [BRANDING_STORAGE_TOOLBAR_ICON]: msg.toolbarIconDataUrl,
              });
            }
            if (msg.toolbarIconDataUrl !== undefined) {
              try {
                await applyToolbarIconFromStorage();
              } catch {
                /* branding applies safe fallbacks; ignore residual failures */
              }
            }
            sendResponse({ ok: true });
            break;
          }
          case 'SET_PENDING_SAVE': {
            const tabId = sender.tab?.id;
            if (tabId == null) {
              sendResponse({ ok: false, error: 'No tab' });
              break;
            }
            const payload: PendingSavePayload = {
              siteUrl: msg.siteUrl,
              username: msg.username,
              password: msg.password,
              savedAt: Date.now(),
            };
            await chrome.storage.session.set({ [PENDING_SAVE_KEY(tabId)]: payload });
            sendResponse({ ok: true });
            break;
          }
          case 'GET_PENDING_SAVE': {
            const tabId = sender.tab?.id;
            if (tabId == null) {
              sendResponse({ ok: true, data: null });
              break;
            }
            const key = PENDING_SAVE_KEY(tabId);
            const got = await chrome.storage.session.get(key);
            const raw = got[key] as PendingSavePayload | undefined;
            if (!raw || typeof raw.password !== 'string' || !raw.password.trim()) {
              sendResponse({ ok: true, data: null });
              break;
            }
            if (Date.now() - (raw.savedAt ?? 0) > PENDING_SAVE_MAX_AGE_MS) {
              await chrome.storage.session.remove(key);
              sendResponse({ ok: true, data: null });
              break;
            }
            sendResponse({
              ok: true,
              data: {
                siteUrl: raw.siteUrl,
                username: raw.username,
                password: raw.password,
                savedAt: raw.savedAt,
              },
            });
            break;
          }
          case 'CLEAR_PENDING_SAVE': {
            const tabId = sender.tab?.id;
            if (tabId != null) await chrome.storage.session.remove(PENDING_SAVE_KEY(tabId));
            sendResponse({ ok: true });
            break;
          }
          case 'PULSE_ACTIVITY': {
            sendResponse({ ok: true });
            break;
          }
          case 'SIGN_UP': {
            await auth.signUp(msg.email, msg.password);
            const enroll = await auth.startMfaEnroll();
            sendResponse({ ok: true, data: { step: 'mfa_enroll', ...enroll } });
            break;
          }
          case 'START_MFA_ENROLL': {
            const enroll = await auth.startMfaEnroll();
            sendResponse({ ok: true, data: enroll });
            break;
          }
          case 'MFA_ENROLL_VERIFY': {
            await auth.verifyMfaEnrollment(msg.factorId, msg.challengeId, msg.code);
            sendResponse({ ok: true, data: { done: true } });
            break;
          }
          case 'SKIP_MFA_ENROLL': {
            await auth.cancelMfaEnrollment(msg.factorId);
            sendResponse({ ok: true });
            break;
          }
          case 'SIGN_IN': {
            const st = await auth.signIn(msg.email, msg.password);
            sendResponse({ ok: true, data: st });
            break;
          }
          case 'SIGN_IN_MFA': {
            const st = await auth.completeMfaSignIn(msg.factorId, msg.challengeId, msg.code);
            sendResponse({ ok: true, data: st });
            break;
          }
          case 'SIGN_OUT': {
            lockVaultKey();
            await auth.signOut();
            sendResponse({ ok: true });
            break;
          }
          case 'UNLOCK_VAULT': {
            const client = auth.getClient();
            const { data } = await client.auth.getSession();
            const uid = data.session?.user?.id;
            if (!uid) {
              sendResponse({ ok: false, error: 'Not signed in' });
              break;
            }
            await unlockVaultKey(msg.masterPassword, uid, msg.totpCode);
            sendResponse({ ok: true });
            break;
          }
          case 'GENERATE_VAULT_2FA_ENROLL': {
            const client = auth.getClient();
            const { data } = await client.auth.getSession();
            const email = data.session?.user?.email ?? 'Vault';
            const { secretBase32, otpauthUri } = generateVault2faProvisioning(email);
            sendResponse({ ok: true, data: { secretBase32, otpauthUri } });
            break;
          }
          case 'ENABLE_VAULT_2FA': {
            const client = auth.getClient();
            const { data } = await client.auth.getSession();
            const uid = data.session?.user?.id;
            if (!uid) {
              sendResponse({ ok: false, error: 'Not signed in' });
              break;
            }
            if (!isVaultUnlocked()) {
              sendResponse({ ok: false, error: 'Unlock your vault first' });
              break;
            }
            await enableVaultTwoFactor(uid, msg.secretBase32, msg.verificationCode);
            sendResponse({ ok: true });
            break;
          }
          case 'DISABLE_VAULT_2FA': {
            const client = auth.getClient();
            const { data } = await client.auth.getSession();
            const uid = data.session?.user?.id;
            if (!uid) {
              sendResponse({ ok: false, error: 'Not signed in' });
              break;
            }
            await disableVaultTwoFactor(msg.masterPassword, uid, msg.totpCode);
            sendResponse({ ok: true });
            break;
          }
          case 'LOCK_VAULT': {
            lockVaultKey();
            sendResponse({ ok: true });
            break;
          }
          case 'LIST_VAULT': {
            const client = auth.getClient();
            const { data } = await client.auth.getSession();
            const uid = data.session?.user?.id;
            if (!uid) {
              sendResponse({ ok: false, error: 'Not signed in' });
              break;
            }
            const entries = await listDecryptedEntries(client, uid);
            sendResponse({ ok: true, data: entries });
            break;
          }
          case 'SAVE_ENTRY': {
            const client = auth.getClient();
            const { data } = await client.auth.getSession();
            const uid = data.session?.user?.id;
            if (!uid) {
              sendResponse({ ok: false, error: 'Not signed in', signInNeeded: true });
              break;
            }
            if (!isVaultUnlocked()) {
              sendResponse({
                ok: false,
                error: 'Unlock your vault in Inkrypt, then click Save again.',
                unlockNeeded: true,
              });
              break;
            }
            await saveEntry(client, uid, {
              siteUrl: msg.siteUrl,
              label: msg.label,
              username: msg.username,
              password: msg.password,
              totpSecret: msg.totpSecret,
            });
            sendResponse({ ok: true });
            break;
          }
          case 'UPDATE_ENTRY': {
            const client = auth.getClient();
            const { data } = await client.auth.getSession();
            const uid = data.session?.user?.id;
            if (!uid) {
              sendResponse({ ok: false, error: 'Not signed in', signInNeeded: true });
              break;
            }
            if (!isVaultUnlocked()) {
              sendResponse({
                ok: false,
                error: 'Unlock your vault in Inkrypt, then try again.',
                unlockNeeded: true,
              });
              break;
            }
            await updateEntry(client, uid, msg.id, {
              siteUrl: msg.siteUrl,
              label: msg.label,
              username: msg.username,
              password: msg.password,
              totpSecret: msg.totpSecret,
              keepExistingTotp: msg.keepExistingTotp,
              keepExistingPassword: msg.keepExistingPassword,
            });
            sendResponse({ ok: true });
            break;
          }
          case 'DELETE_ENTRY': {
            const client = auth.getClient();
            const { data } = await client.auth.getSession();
            const uid = data.session?.user?.id;
            if (!uid) {
              sendResponse({ ok: false, error: 'Not signed in' });
              break;
            }
            await deleteEntry(client, uid, msg.id);
            sendResponse({ ok: true });
            break;
          }
          case 'COUNT_FOR_SITE': {
            const client = auth.getClient();
            const { data } = await client.auth.getSession();
            const uid = data.session?.user?.id;
            if (!uid) {
              sendResponse({ ok: true, data: { count: 0 } });
              break;
            }
            const n = await countEntriesForSite(client, uid, msg.siteUrl);
            sendResponse({ ok: true, data: { count: n } });
            break;
          }
          case 'USERNAMES_FOR_SITE': {
            const client = auth.getClient();
            const { data } = await client.auth.getSession();
            const uid = data.session?.user?.id;
            if (!uid) {
              sendResponse({ ok: true, data: { usernames: [] } });
              break;
            }
            const usernames = await listUsernamesForSite(client, uid, msg.siteUrl);
            sendResponse({ ok: true, data: { usernames } });
            break;
          }
          case 'HAS_USERNAME_FOR_SITE': {
            const client = auth.getClient();
            const { data } = await client.auth.getSession();
            const uid = data.session?.user?.id;
            if (!uid) {
              sendResponse({ ok: true, data: { saved: false } });
              break;
            }
            const saved = await hasUsernameOnSite(client, uid, msg.siteUrl, msg.username);
            sendResponse({ ok: true, data: { saved } });
            break;
          }
          case 'OPEN_VAULT_UI': {
            await focusOrOpenVaultPopupWindow(sender.tab?.windowId);
            sendResponse({ ok: true });
            break;
          }
          case 'FILL_ACTIVE_TAB': {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const u = tab?.url ?? '';
            if (
              !tab?.id ||
              u.startsWith('chrome://') ||
              u.startsWith('chrome-extension://') ||
              u.startsWith('edge://') ||
              u.startsWith('about:')
            ) {
              sendResponse({ ok: false, error: 'Open a normal website tab to fill login' });
              break;
            }
            try {
              const r = (await chrome.tabs.sendMessage(tab.id, {
                type: 'TRIGGER_INKRYPT_FILL_ACTIVE_TAB',
              })) as { ok?: boolean; error?: string };
              if (r?.ok) sendResponse({ ok: true });
              else sendResponse({ ok: false, error: r?.error ?? 'Could not fill on this page' });
            } catch {
              sendResponse({
                ok: false,
                error: 'Reload the page or use the Inkrypt chip on the login form',
              });
            }
            break;
          }
          case 'GET_CREDENTIALS': {
            const client = auth.getClient();
            const { data } = await client.auth.getSession();
            const uid = data.session?.user?.id;
            const tabId = sender.tab?.id;
            if (!uid) {
              await focusOrOpenVaultPopupWindow(sender.tab?.windowId);
              sendResponse({
                ok: false,
                error: 'Sign in required',
                unlockNeeded: true,
                signInNeeded: true,
              });
              break;
            }
            if (!isVaultUnlocked()) {
              await focusOrOpenVaultPopupWindow(sender.tab?.windowId);
              sendResponse({
                ok: false,
                error: 'Vault locked',
                unlockNeeded: true,
                signInNeeded: false,
              });
              break;
            }
            const creds = await getCredentialsForSite(client, uid, msg.siteUrl, msg.entryId);
            if (!creds || tabId == null) {
              sendResponse({ ok: false, error: 'No credentials for this site' });
              break;
            }
            chrome.tabs.sendMessage(tabId, {
              type: 'FILL_CREDENTIAL',
              username: creds.username,
              password: creds.password,
              totpCode: creds.totpCode,
            });
            sendResponse({ ok: true, data: creds });
            break;
          }
          case 'LIST_CREDENTIAL_OPTIONS': {
            const client = auth.getClient();
            const { data } = await client.auth.getSession();
            const uid = data.session?.user?.id;
            if (!uid) {
              sendResponse({
                ok: false,
                error: 'Sign in required',
                unlockNeeded: true,
                signInNeeded: true,
              });
              break;
            }
            if (!isVaultUnlocked()) {
              sendResponse({
                ok: false,
                error: 'Vault locked',
                unlockNeeded: true,
                signInNeeded: false,
              });
              break;
            }
            const options = await listCredentialOptionsForSite(client, uid, msg.siteUrl);
            sendResponse({ ok: true, data: { options } });
            break;
          }
          case 'SET_BADGE': {
            const tabId = sender.tab?.id;
            const o: chrome.action.BadgeTextDetails = { text: msg.text };
            if (tabId !== undefined) o.tabId = tabId;
            await chrome.action.setBadgeText(o);
            sendResponse({ ok: true });
            break;
          }
          case 'COPY_TO_CLIPBOARD': {
            /* Popup cannot always use clipboard in MV3 without offscreen or user gesture — handled in UI */
            sendResponse({ ok: true });
            break;
          }
          default:
            sendResponse({ ok: false, error: 'Unknown message' });
        }
      } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        sendResponse({ ok: false, error: err });
      }
    })();
    return true;
  }
);

void applyToolbarIconFromStorage();
