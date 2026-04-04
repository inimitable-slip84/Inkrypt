import { VAULT_ATTENTION_OVERLAY_ID } from './constants';
import { vaultAutofillState } from './state';
import { applyExtThemeToElement, ensureVaultPageUiInjected } from './theme-ui';

export function showToast(text: string, ms = 3800): void {
  ensureVaultPageUiInjected();
  const tip = document.createElement('div');
  tip.textContent = text;
  applyExtThemeToElement(tip);
  tip.className = 'vault-ext-toast';
  tip.style.bottom = '16px';
  tip.style.right = '16px';
  tip.style.left = 'auto';
  tip.style.top = 'auto';
  document.body.appendChild(tip);
  setTimeout(() => tip.remove(), ms);
}

export function dismissVaultAttentionOverlay(): void {
  if (vaultAutofillState.attentionEscListener) {
    const fn = vaultAutofillState.attentionEscListener;
    vaultAutofillState.attentionEscListener = null;
    document.removeEventListener('keydown', fn, true);
  }
  document.getElementById(VAULT_ATTENTION_OVERLAY_ID)?.remove();
  document.querySelectorAll('.vault-ext-attention-target').forEach((el) => {
    el.classList.remove('vault-ext-attention-target');
  });
}

export function showVaultAttentionOverlay(
  mode: 'unlock' | 'signin',
  vaultWidgetWrap?: HTMLElement | null
): void {
  ensureVaultPageUiInjected();
  void chrome.runtime.sendMessage({ type: 'OPEN_VAULT_UI', reason: mode });
  dismissVaultAttentionOverlay();

  const overlay = document.createElement('div');
  overlay.id = VAULT_ATTENTION_OVERLAY_ID;
  applyExtThemeToElement(overlay);
  overlay.className = 'vault-ext-attn-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'vault-ext-attn-title');
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) dismissVaultAttentionOverlay();
  });

  const toolbar = document.createElement('div');
  toolbar.className = 'vault-ext-attn-toolbar';
  toolbar.innerHTML =
    '<span class="vault-ext-attn-ring vault-ext-attn-ring--1" aria-hidden="true"></span><span class="vault-ext-attn-ring vault-ext-attn-ring--2" aria-hidden="true"></span><span class="vault-ext-attn-ring vault-ext-attn-ring--3" aria-hidden="true"></span>';

  const card = document.createElement('div');
  card.className = 'vault-ext-attn-card';
  card.addEventListener('click', (e) => e.stopPropagation());

  const h3 = document.createElement('h3');
  h3.id = 'vault-ext-attn-title';
  const p = document.createElement('p');
  if (mode === 'signin') {
    h3.textContent = 'Sign in to Inkrypt';
    p.textContent =
      'The Inkrypt popup should open from the toolbar — sign in there. If it did not open, click the Inkrypt icon next to the address bar (or the puzzle icon → Inkrypt), then try again.';
  } else {
    h3.textContent = 'Unlock your vault';
    p.textContent =
      'Enter your master password in the Inkrypt popup. If it did not open, click the Inkrypt icon in your toolbar (puzzle piece → Inkrypt).';
  }

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'vault-ext-attn-dismiss';
  btn.textContent = 'Got it';
  btn.addEventListener('click', () => dismissVaultAttentionOverlay());

  card.append(h3, p, btn);
  overlay.append(toolbar, card);
  document.body.appendChild(overlay);

  vaultWidgetWrap?.querySelector('.vault-ext-ink-btn')?.classList.add('vault-ext-attention-target');

  vaultAutofillState.attentionEscListener = (e: KeyboardEvent) => {
    if (e.key === 'Escape') dismissVaultAttentionOverlay();
  };
  document.addEventListener('keydown', vaultAutofillState.attentionEscListener, true);
}
