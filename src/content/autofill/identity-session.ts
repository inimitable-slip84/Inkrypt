import { EMAIL_IN_TEXT_RX, PW_VAULT_AUTOFILL_ATTR } from './constants';

export function sessionIdentityKey(host: string): string {
  return `inkrypt-pending-email:${host}`;
}

export function rememberSessionIdentityEmail(email: string): void {
  const t = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return;
  try {
    sessionStorage.setItem(sessionIdentityKey(location.hostname), t);
  } catch {
    /* ignore */
  }
}

/**
 * Microsoft / Google often show the identifier as plain text on the password step (no email input).
 * Walks a few ancestors and picks a reasonable email from visible text.
 */
export function extractDisplayedEmailNearPassword(pw: HTMLInputElement): string {
  let el: Element | null = pw;
  for (let depth = 0; depth < 14 && el; depth++) {
    el = el.parentElement;
    if (!el) break;
    const text =
      el instanceof HTMLElement ? el.innerText : (el.textContent ?? '');
    if (text.length > 5000) continue;
    const matches = text.match(EMAIL_IN_TEXT_RX);
    if (!matches?.length) continue;
    for (const m of matches) {
      const lower = m.toLowerCase();
      if (
        /^(no-?reply|donotreply|mailer-daemon|postmaster|bounce|notifications?)@/.test(lower)
      ) {
        continue;
      }
      return m.trim();
    }
    return matches[0]!.trim();
  }
  return '';
}

export function enrichUsernameFromPageAndSession(pw: HTMLInputElement, username: string): string {
  const t = username.trim();
  if (t) return t;
  const fromDom = extractDisplayedEmailNearPassword(pw);
  if (fromDom) return fromDom;
  try {
    const s = sessionStorage.getItem(sessionIdentityKey(location.hostname));
    if (s?.trim()) return s.trim();
  } catch {
    /* ignore */
  }
  return '';
}

export function markPasswordFilledByVault(pw: HTMLInputElement): void {
  requestAnimationFrame(() => {
    if (!pw.isConnected) return;
    pw.setAttribute(PW_VAULT_AUTOFILL_ATTR, '1');
    const clear = (): void => {
      pw.removeAttribute(PW_VAULT_AUTOFILL_ATTR);
    };
    pw.addEventListener('input', clear, { once: true });
    pw.addEventListener('cut', clear, { once: true });
  });
}

const identityCaptureWired = new WeakSet<HTMLInputElement>();

/** Remember email typed on step 1 (e.g. Microsoft loginfmt) for the password step save dialog. */
export function wireIdentityEmailCapture(): void {
  const sel =
    'input[type="email"], input[name="loginfmt"], input[id="i0116"], input[autocomplete="username"], input[autocomplete="email"]';
  document.querySelectorAll<HTMLInputElement>(sel).forEach((el) => {
    if (identityCaptureWired.has(el)) return;
    if (el.type === 'hidden' || el.disabled) return;
    const cs = window.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    identityCaptureWired.add(el);
    const onVal = () => rememberSessionIdentityEmail(el.value);
    el.addEventListener('input', onVal);
    el.addEventListener('change', onVal);
    el.addEventListener('blur', onVal);
  });
}
