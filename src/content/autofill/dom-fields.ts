export function fillField(el: HTMLInputElement | null, value: string): void {
  if (!el) return;
  const proto = HTMLInputElement.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, 'value');
  const setter = desc?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

/** Not an email/username field — confirm-password styling, password-ish names, etc. */
export function isLikelyFalseUsernameField(el: HTMLInputElement): boolean {
  const s = `${el.name} ${el.id} ${el.getAttribute('aria-label') ?? ''} ${el.getAttribute('placeholder') ?? ''}`.toLowerCase();
  if (/confirm|re-?enter|repeat|verification|again|passwd2|password2|pwd2/.test(s)) return true;
  const ac = (el.getAttribute('autocomplete') || '').toLowerCase();
  if (ac === 'new-password' || ac === 'current-password') return true;
  if (/^(password|passwd|pass|pwd)([-_]|$)/i.test(el.name) || /^(password|passwd|pass|pwd)([-_]|$)/i.test(el.id))
    return true;
  return false;
}

/**
 * Only treat fields *above* this password in the form as username/email.
 * Avoids filling the vault email into a later text field or mis-ordered “confirm” UI.
 */
export function findUsernameNearPassword(pw: HTMLInputElement): HTMLInputElement | null {
  const form = pw.form;
  const candidates: HTMLInputElement[] = [];
  if (form) {
    candidates.push(
      ...Array.from(
        form.querySelectorAll<HTMLInputElement>(
          'input[type="email"], input[type="text"], input[type="tel"], input[name="username"], input[name="email"], input[name="user"], input[id="username"], input[id="email"], input[id="user"], input[autocomplete="username"], input[autocomplete="email"]'
        )
      )
    );
  }
  let sib: Element | null = pw.previousElementSibling;
  let hops = 0;
  while (sib && hops++ < 16) {
    if (sib instanceof HTMLInputElement && sib.type !== 'password') candidates.push(sib);
    sib = sib.previousElementSibling;
  }
  const visible = candidates.filter(
    (i) =>
      i.type !== 'hidden' &&
      i.type !== 'submit' &&
      !i.disabled &&
      i !== pw &&
      isEligibleUsernameField(i) &&
      !isLikelyFalseUsernameField(i)
  );
  const beforePw = visible.filter(
    (i) => (i.compareDocumentPosition(pw) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
  );
  if (beforePw.length === 0) return null;
  return beforePw[beforePw.length - 1]!;
}

export function isEligibleUsernameField(el: HTMLInputElement): boolean {
  if (el.disabled || el.type === 'hidden' || el.type === 'password') return false;
  const t = el.type;
  if (t === 'email' || t === 'tel') return true;
  const ac = (el.getAttribute('autocomplete') ?? '').toLowerCase();
  if (ac.includes('username') || ac.includes('email')) return true;
  const key = `${el.name} ${el.id}`.toLowerCase();
  if (/(^|[-_])(user(name)?|email|login|account|id|identifier)$/i.test(key)) return true;
  if (
    /^(user(name)?|email|login|account|identifier)$/i.test(el.name) ||
    /^(user(name)?|email|login|identifier)$/i.test(el.id)
  )
    return true;
  return false;
}

export function isPasswordFieldEligible(pw: HTMLInputElement): boolean {
  if (!pw.isConnected || pw.disabled) return false;
  const cs = window.getComputedStyle(pw);
  return cs.display !== 'none' && cs.visibility !== 'hidden';
}

export function isLikelyConfirmField(pw: HTMLInputElement): boolean {
  const s = `${pw.name} ${pw.id} ${pw.getAttribute('aria-label') ?? ''}`.toLowerCase();
  return /confirm|repeat|re-?enter|reenter|verification|again|passwd2|password2|pwd2/.test(s);
}

export function isLikelyCurrentPasswordField(pw: HTMLInputElement): boolean {
  const s = `${pw.name} ${pw.id} ${pw.getAttribute('aria-label') ?? ''}`.toLowerCase();
  return /(\b|^)(current|old|existing|previous)([-_]?password)?|password[-_]?old|passwd[-_]?old/.test(
    s
  );
}

/**
 * Prefer the password to *save* (new/reset), not current/confirm, for login + signup + change-password.
 * Works for `<form>` or any container (e.g. Microsoft login uses divs without a form).
 */
export function pickLoginPasswordFromContainer(root: Element): HTMLInputElement | null {
  const pws = Array.from(root.querySelectorAll<HTMLInputElement>('input[type="password"]')).filter(
    isPasswordFieldEligible
  );
  if (pws.length === 0) return null;

  const candidates = pws.filter((p) => !isLikelyConfirmField(p));

  const byNewAc = candidates.find((p) => {
    const ac = (p.getAttribute('autocomplete') || '').toLowerCase();
    return ac === 'new-password';
  });
  if (byNewAc) return byNewAc;

  const byNewHint = candidates.find((p) => {
    if (isLikelyCurrentPasswordField(p)) return false;
    const s = `${p.name} ${p.id}`.toLowerCase();
    return (
      /\b(new|choose|reset|password1|pw1|pass1)\b|newpassword|new[-_]?password|password[-_]?new/.test(
        s
      ) || /\b(reset|recovery|forgot)\b/.test(s)
    );
  });
  if (byNewHint) return byNewHint;

  const nonCurrent = candidates.filter((p) => !isLikelyCurrentPasswordField(p));
  if (nonCurrent.length > 0) return nonCurrent[0]!;

  const preferred = pws.find((p) => !isLikelyConfirmField(p));
  return preferred ?? pws[0];
}

export function pickLoginPasswordFromForm(form: HTMLFormElement): HTMLInputElement | null {
  return pickLoginPasswordFromContainer(form);
}

/** Multi-step logins (Outlook, OAuth) often use a button outside `<form>` — walk up to find the password field. */
export function findPasswordFieldNearLoginButton(btn: Element): HTMLInputElement | null {
  let el: Element | null = btn;
  for (let i = 0; i < 20; i++) {
    el = el?.parentElement ?? null;
    if (!el) break;
    const picked = pickLoginPasswordFromContainer(el);
    if (picked) return picked;
  }
  return null;
}

/** Biased toward login when unsure — random fill only when signup is likely. */
export function isLikelySignupContext(primaryPw: HTMLInputElement): boolean {
  const ac = (primaryPw.getAttribute('autocomplete') || '').toLowerCase();
  if (ac === 'new-password') return true;

  const form = primaryPw.form;
  if (form) {
    const pws = Array.from(form.querySelectorAll<HTMLInputElement>('input[type="password"]')).filter(
      isPasswordFieldEligible
    );
    if (pws.length >= 2 && pws.some(isLikelyConfirmField)) return true;
  }

  const path = `${location.pathname}${location.search}`.toLowerCase();
  try {
    const qs = new URLSearchParams(location.search);
    const mode = (qs.get('mode') || qs.get('type') || '').toLowerCase();
    if (mode === 'signup' || mode === 'register' || qs.get('signup') === '1') return true;
  } catch {
    /* ignore */
  }

  if (
    /\/(sign[-_]?up|register|registration|join|create[-_]?account|account\/create|signup|sign_up)(\/|$|\?|#)/i.test(
      path
    ) ||
    /\b(signup|register|join|createaccount)=1?\b/i.test(path)
  ) {
    return true;
  }

  if (
    /\/(sign[-_]?in|login|log[-_]?in|auth\/login|session|account\/login)(\/|$|\?|#)/i.test(path)
  ) {
    return false;
  }

  return false;
}

export function fillConfirmPasswordIfPresent(primaryPw: HTMLInputElement, password: string): void {
  const form = primaryPw.form;
  if (!form) return;
  const pws = Array.from(form.querySelectorAll<HTMLInputElement>('input[type="password"]')).filter(
    isPasswordFieldEligible
  );
  for (const p of pws) {
    if (p === primaryPw) continue;
    if (isLikelyConfirmField(p)) {
      fillField(p, password);
      return;
    }
  }
}

export function getCredentialsFromInputs(pw: HTMLInputElement) {
  const userEl = findUsernameNearPassword(pw);
  return {
    username: (userEl?.value ?? '').trim(),
    password: pw.value ?? '',
    userEl,
  };
}

/** URL / query looks like password reset or recovery (not generic ?reset= on login). */
export function passwordResetPathOrToken(): boolean {
  const path = `${location.pathname}`.toLowerCase();
  if (
    /(?:^|\/)(reset[-_]password|password[-_]reset|forgot[-_]?(?:password|pw)|change[-_]password|update[-_]password|set[-_]password)(?:\/|$|\?|#)/i.test(
      path
    ) ||
    /(?:^|\/)account\/(?:recover|reset|password|passwords)(?:\/|$|\?|#)/i.test(path) ||
    /(?:^|\/)users\/password(?:\/|$|\?|#)/i.test(path) ||
    /(?:^|\/)auth\/(?:reset|recover|forgot)(?:\/|$|\?|#)/i.test(path)
  ) {
    return true;
  }
  const search = location.search;
  return (
    search.length > 1 &&
    /(?:^|[?&])(token|code|oobcode|recovery|hash|uid)=/i.test(search)
  );
}

/**
 * Reset / change-password steps often only show new+confirm password (no email).
 * If the vault already has this site, auto "save as new entry" is misleading — skip auto prompts.
 */
export function isLikelyPasswordResetWithoutUsernameForm(pw: HTMLInputElement): boolean {
  if (!passwordResetPathOrToken()) return false;
  const { username } = getCredentialsFromInputs(pw);
  return !username.trim();
}
