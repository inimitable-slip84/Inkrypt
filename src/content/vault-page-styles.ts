/**
 * Injected on host pages for Vault autofill UI (button, menu, modal, toasts).
 * Tokens align with popup "Ledger" / "Inkwell" themes — not generic slate/navy.
 */
export const VAULT_EXT_FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700&display=swap';

export const VAULT_EXT_CSS = `
[data-vault-ext-theme="light"] {
  --v-bg: #f3efe6;
  --v-surface: #faf7ef;
  --v-raised: #ffffff;
  --v-border: #cfc6b4;
  --v-border-strong: #a8987c;
  --v-text: #14120f;
  --v-muted: #5c564c;
  --v-subtle: #7a7265;
  --v-accent: #8b3a1f;
  --v-accent-hover: #6d2e18;
  --v-on-accent: #fff8f0;
  --v-accent-soft: rgba(139, 58, 31, 0.12);
  --v-success: #0f5c4f;
  --v-success-soft: #e8f5f2;
  --v-danger: #b42318;
  --v-shadow: 0 14px 44px -12px rgba(20, 18, 15, 0.22);
  --v-shadow-soft: 0 4px 20px rgba(20, 18, 15, 0.12);
  --v-scroll-track: var(--v-bg);
  --v-scroll-thumb: #b8aa96;
  --v-scroll-thumb-hover: #9a8b76;
}

[data-vault-ext-theme="dark"] {
  --v-bg: #0c0c0f;
  --v-surface: #121218;
  --v-raised: #1a1a22;
  --v-border: #2c2c38;
  --v-border-strong: #45454f;
  --v-text: #f0ece4;
  --v-muted: #a8a3a0;
  --v-subtle: #6e6a66;
  --v-accent: #d4a574;
  --v-accent-hover: #e8bc8c;
  --v-on-accent: #1a120a;
  --v-accent-soft: rgba(212, 165, 116, 0.14);
  --v-success: #7dd3c0;
  --v-success-soft: rgba(125, 211, 192, 0.12);
  --v-danger: #f07167;
  --v-shadow: 0 24px 56px -16px rgba(0, 0, 0, 0.65);
  --v-shadow-soft: 0 8px 32px rgba(0, 0, 0, 0.45);
  --v-scroll-track: var(--v-bg);
  --v-scroll-thumb: #45454f;
  --v-scroll-thumb-hover: #5d5d6a;
}

[data-vault-ext] {
  font-family: "Atkinson Hyperlegible", "Segoe UI", sans-serif;
  font-size: 13px;
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
  box-sizing: border-box;
}

[data-vault-ext] *,
[data-vault-ext] *::before,
[data-vault-ext] *::after {
  box-sizing: border-box;
}

[data-vault-ext] button.vault-ext-btn {
  appearance: none;
  -webkit-appearance: none;
}

.vault-ext-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px 5px 12px;
  margin: 0;
  border-radius: 999px;
  border: 1px solid var(--v-border-strong);
  background: linear-gradient(165deg, var(--v-raised) 0%, var(--v-surface) 100%);
  color: var(--v-text);
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  box-shadow: var(--v-shadow-soft), inset 0 1px 0 rgba(255,255,255,0.06);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
}

[data-vault-ext-theme="dark"] .vault-ext-btn {
  background: linear-gradient(165deg, #1e1e26 0%, var(--v-surface) 100%);
  box-shadow: var(--v-shadow-soft), inset 0 1px 0 rgba(255,255,255,0.04);
}

.vault-ext-btn:hover {
  border-color: var(--v-accent);
  box-shadow: var(--v-shadow-soft), 0 0 0 1px var(--v-accent-soft);
}

.vault-ext-btn:active {
  transform: scale(0.98);
}

.vault-ext-btn-label {
  font-family: Fraunces, Georgia, serif;
  font-weight: 700;
  font-size: 13px;
  letter-spacing: -0.02em;
  color: var(--v-accent);
}

[data-vault-ext-theme="dark"] .vault-ext-btn-label {
  color: var(--v-accent);
}

.vault-ext-btn-chevron {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
  color: var(--v-muted);
  transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.vault-ext-btn--open .vault-ext-btn-chevron {
  transform: rotate(180deg);
}

.vault-ext-menu {
  display: none;
  padding: 6px;
  border-radius: 12px;
  border: 1px solid var(--v-border);
  background: var(--v-surface);
  box-shadow: var(--v-shadow);
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--v-scroll-thumb) var(--v-scroll-track);
}

.vault-ext-menu::-webkit-scrollbar {
  width: 8px;
}
.vault-ext-menu::-webkit-scrollbar-track {
  background: var(--v-scroll-track);
  border-radius: 999px;
}
.vault-ext-menu::-webkit-scrollbar-thumb {
  background: var(--v-scroll-thumb);
  border-radius: 999px;
  border: 2px solid var(--v-scroll-track);
  background-clip: padding-box;
}
.vault-ext-menu::-webkit-scrollbar-thumb:hover {
  background: var(--v-scroll-thumb-hover);
}
.vault-ext-menu::-webkit-scrollbar-button {
  display: none;
  width: 0;
  height: 0;
}

.vault-ext-menu.vault-ext-menu--anim {
  animation: vaultExtMenuIn 0.24s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes vaultExtMenuIn {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.vault-ext-menu-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  margin: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--v-text);
  font-family: inherit;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.35;
  cursor: pointer;
  white-space: normal;
  transition: background 0.15s ease, color 0.15s ease;
}

.vault-ext-menu-item:hover {
  background: var(--v-accent-soft);
  color: var(--v-text);
}

.vault-ext-menu-item:focus-visible {
  outline: 2px solid var(--v-accent);
  outline-offset: 1px;
}

.vault-ext-account-picker {
  min-width: min(320px, calc(100vw - 20px));
  max-width: min(360px, calc(100vw - 20px));
  padding: 8px;
}

.vault-ext-account-picker__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px 10px 10px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--v-text);
  border-bottom: 1px solid var(--v-border);
  margin: -2px -2px 6px -2px;
}

.vault-ext-account-picker__icon {
  width: 18px;
  height: 18px;
  object-fit: contain;
  flex-shrink: 0;
}

.vault-ext-account-item {
  display: flex;
  flex-direction: column;
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  margin: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--v-text);
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.vault-ext-account-item:hover {
  background: var(--v-accent-soft);
}

.vault-ext-account-item__top {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.35;
  color: var(--v-text);
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.vault-ext-account-item__sub {
  margin-top: 2px;
  font-size: 11px;
  font-weight: 500;
  color: var(--v-muted);
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.vault-ext-menu.vault-ext-menu--anim .vault-ext-menu-item:nth-child(1) { animation: vaultExtItemIn 0.32s cubic-bezier(0.22, 1, 0.36, 1) 0.03s backwards; }
.vault-ext-menu.vault-ext-menu--anim .vault-ext-menu-item:nth-child(2) { animation: vaultExtItemIn 0.32s cubic-bezier(0.22, 1, 0.36, 1) 0.07s backwards; }
.vault-ext-menu.vault-ext-menu--anim .vault-ext-menu-item:nth-child(3) { animation: vaultExtItemIn 0.32s cubic-bezier(0.22, 1, 0.36, 1) 0.11s backwards; }

@keyframes vaultExtItemIn {
  from {
    opacity: 0;
    transform: translateX(-4px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.vault-ext-toast {
  position: fixed;
  z-index: 2147483647;
  max-width: 320px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid var(--v-border);
  background: var(--v-surface);
  color: var(--v-text);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  box-shadow: var(--v-shadow);
  animation: vaultExtToastIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes vaultExtToastIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.vault-ext-banner {
  position: fixed;
  z-index: 2147483645;
  left: 50%;
  bottom: 20px;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid var(--v-border);
  background: var(--v-surface);
  color: var(--v-text);
  box-shadow: var(--v-shadow);
  max-width: min(420px, calc(100vw - 32px));
  animation: vaultExtToastIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.vault-ext-banner__top {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.vault-ext-banner__icon {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  object-fit: contain;
  margin-top: 1px;
  pointer-events: none;
}

.vault-ext-banner-text {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
}

.vault-ext-banner__actions {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  width: 100%;
}

.vault-ext-banner__actions .vault-ext-btn-primary,
.vault-ext-banner__actions .vault-ext-btn-secondary {
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.vault-ext-btn-primary {
  padding: 6px 14px;
  border-radius: 999px;
  border: none;
  background: var(--v-accent);
  color: var(--v-on-accent);
  font-family: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.12s ease;
}

.vault-ext-btn-primary:hover {
  background: var(--v-accent-hover);
}

.vault-ext-btn-primary:active {
  transform: scale(0.97);
}

.vault-ext-btn-secondary {
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--v-border);
  background: transparent;
  color: var(--v-muted);
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
}

.vault-ext-btn-secondary:hover {
  border-color: var(--v-border-strong);
  color: var(--v-text);
  background: var(--v-accent-soft);
}

.vault-ext-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(8, 8, 10, 0.52);
  backdrop-filter: blur(4px);
  animation: vaultExtBackdropIn 0.25s ease forwards;
}

@keyframes vaultExtBackdropIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.vault-ext-modal-card {
  width: 100%;
  max-width: 380px;
  padding: 20px;
  border-radius: 16px;
  border: 1px solid var(--v-border);
  background: var(--v-surface);
  color: var(--v-text);
  box-shadow: var(--v-shadow);
  animation: vaultExtCardIn 0.32s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

@keyframes vaultExtCardIn {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.vault-ext-modal-title {
  font-family: Fraunces, Georgia, serif;
  font-weight: 700;
  font-size: 1.15rem;
  letter-spacing: -0.02em;
  color: var(--v-text);
  margin: 0 0 6px 0;
}

.vault-ext-modal-subtitle {
  font-size: 12px;
  line-height: 1.45;
  color: var(--v-muted);
  margin: 0 0 14px 0;
}

.vault-ext-modal-field-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--v-subtle);
  margin: 0 0 5px 0;
}

.vault-ext-input,
.vault-ext-textarea {
  width: 100%;
  margin: 0 0 10px 0;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--v-border);
  background: var(--v-raised);
  color: var(--v-text);
  font-family: inherit;
  font-size: 13px;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.vault-ext-input:focus,
.vault-ext-textarea:focus {
  outline: none;
  border-color: var(--v-accent);
  box-shadow: 0 0 0 2px var(--v-accent-soft);
}

.vault-ext-textarea {
  resize: vertical;
  min-height: 56px;
}

.vault-ext-field-hint {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--v-subtle);
  margin: 12px 0 6px 0;
}

.vault-ext-modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 18px;
}

.vault-ext-modal-actions--triple {
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
}

.vault-ext-modal-actions-spacer {
  flex: 1 1 12px;
  min-width: 0;
}

.vault-ext-btn-never {
  padding: 9px 14px;
  border-radius: 10px;
  border: 1px solid var(--v-border);
  background: transparent;
  color: var(--v-muted);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
}

.vault-ext-btn-never:hover {
  border-color: var(--v-border-strong);
  color: var(--v-text);
  background: var(--v-accent-soft);
}

.vault-ext-btn-cancel {
  padding: 9px 16px;
  border-radius: 10px;
  border: 1px solid var(--v-border);
  background: var(--v-raised);
  color: var(--v-text);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.vault-ext-btn-cancel:hover {
  border-color: var(--v-border-strong);
  background: var(--v-bg);
}

.vault-ext-btn-save {
  padding: 9px 18px;
  border-radius: 10px;
  border: none;
  background: var(--v-accent);
  color: var(--v-on-accent);
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.12s ease;
}

.vault-ext-btn-save:hover {
  background: var(--v-accent-hover);
}

.vault-ext-btn-save:active {
  transform: scale(0.98);
}

/* —— Toolbar attention + Vault pill pulse (unlock / sign-in prompt) —— */
.vault-ext-attn-overlay {
  position: fixed;
  inset: 0;
  z-index: 2147483644;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding: 56px 20px 24px 20px;
  background: rgba(10, 10, 12, 0.38);
  backdrop-filter: blur(2px);
  animation: vaultExtAttnFade 0.35s ease forwards;
}

@keyframes vaultExtAttnFade {
  from { opacity: 0; }
  to { opacity: 1; }
}

.vault-ext-attn-toolbar {
  position: relative;
  width: 120px;
  height: 120px;
  flex-shrink: 0;
  margin-right: 4px;
}

.vault-ext-attn-ring {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: 3px solid var(--v-accent);
  opacity: 0.85;
  pointer-events: none;
}

.vault-ext-attn-ring--1 {
  width: 44px;
  height: 44px;
  animation: vaultExtRingExpand 2s cubic-bezier(0.22, 1, 0.36, 1) infinite;
}

.vault-ext-attn-ring--2 {
  width: 44px;
  height: 44px;
  animation: vaultExtRingExpand 2s cubic-bezier(0.22, 1, 0.36, 1) 0.35s infinite;
}

.vault-ext-attn-ring--3 {
  width: 44px;
  height: 44px;
  animation: vaultExtRingExpand 2s cubic-bezier(0.22, 1, 0.36, 1) 0.7s infinite;
}

@keyframes vaultExtRingExpand {
  0% {
    transform: translate(-50%, -50%) scale(0.65);
    opacity: 0.95;
  }
  70% {
    opacity: 0.35;
  }
  100% {
    transform: translate(-50%, -50%) scale(2.4);
    opacity: 0;
  }
}

.vault-ext-attn-card {
  margin-top: 16px;
  max-width: min(320px, calc(100vw - 40px));
  padding: 16px 18px;
  border-radius: 14px;
  border: 1px solid var(--v-border);
  background: var(--v-surface);
  color: var(--v-text);
  box-shadow: var(--v-shadow);
  text-align: right;
}

.vault-ext-attn-card h3 {
  margin: 0 0 8px 0;
  font-family: Fraunces, Georgia, serif;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--v-accent);
}

.vault-ext-attn-card p {
  margin: 0;
  font-size: 13px;
  line-height: 1.45;
  color: var(--v-muted);
}

.vault-ext-attn-dismiss {
  margin-top: 14px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid var(--v-border);
  background: var(--v-raised);
  color: var(--v-text);
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.vault-ext-attn-dismiss:hover {
  border-color: var(--v-border-strong);
}

.vault-ext-btn.vault-ext-attention-target {
  animation: vaultExtBtnAttention 1.1s ease-in-out infinite;
}

@keyframes vaultExtBtnAttention {
  0%,
  100% {
    box-shadow: 0 0 0 0 var(--v-accent-soft), 0 0 0 0 transparent;
  }
  50% {
    box-shadow: 0 0 0 3px var(--v-accent), 0 0 20px 2px var(--v-accent-soft);
  }
}

/* —— Inkrypt inline chip (email / username field, icon-only) —— */
.vault-ext-ink-wrap {
  position: fixed;
  z-index: 2147483630;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.vault-ext-ink-wrap .vault-ext-ink-btn {
  pointer-events: auto;
}

.vault-ext-ink-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: auto;
  height: auto;
  padding: 2px;
  margin: 0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: transparent;
  box-shadow: none;
  transition: transform 0.18s ease, opacity 0.15s ease;
}

.vault-ext-ink-btn:hover {
  transform: scale(1.06);
  opacity: 0.92;
}

.vault-ext-ink-btn:active {
  transform: scale(0.94);
}

.vault-ext-ink-btn:focus-visible {
  outline: 2px solid var(--v-accent);
  outline-offset: 2px;
}

.vault-ext-ink-btn--menu-open {
  transform: scale(1.04);
  outline: 2px solid var(--v-accent);
  outline-offset: 1px;
}

.vault-ext-ink-img {
  width: 22px;
  height: 22px;
  max-width: 22px;
  max-height: 22px;
  display: block;
  border-radius: 0;
  object-fit: contain;
  object-position: center;
  pointer-events: none;
}

.vault-ext-ink-btn.vault-ext-attention-target .vault-ext-ink-img {
  animation: vaultExtInkPulse 1.1s ease-in-out infinite;
}

@keyframes vaultExtInkPulse {
  0%,
  100% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.12) drop-shadow(0 0 3px rgba(212, 165, 116, 0.45));
  }
}
`;
