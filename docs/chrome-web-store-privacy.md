# Chrome Web Store — Privacy practices (copy-paste)

Use the text below on the **Privacy practices** tab when publishing Inkrypt. Shorten only if a field has a character limit; meaning should stay the same.

**Account tab (required before publish):** Add and **verify** a contact email in the Chrome Web Store developer account.

**Certification:** On the same Privacy flow, check the box that your data use complies with the [Developer Program Policies](https://developer.chrome.com/docs/webstore/program-policies/) when prompted.

---

## Single purpose description

Inkrypt has a single purpose: to help the user manage their own passwords and time-based two-factor (TOTP) codes in the browser. The extension stores credentials in an encrypted vault, fills login forms on sites the user visits, generates one-time codes, and optionally syncs account-related data with a Supabase project the user configures. It does not serve unrelated advertising or unrelated functionality.

---

## Justification: `storage`

Inkrypt uses `chrome.storage` (local and session) to save settings and encrypted vault-related data on the user’s device: theme preference, optional custom branding, session state for pending saves, Supabase session tokens for sign-in, vault encryption metadata, and similar app data. This is required for the password manager and 2FA features to work offline in the browser and to persist the user’s choices between sessions.

---

## Justification: `alarms`

Inkrypt uses the Alarms API to run a periodic background check (about once per minute) for vault auto-lock after inactivity. This limits how long an unlocked vault stays open without user action. No unrelated timers or background tasks are used.

---

## Justification: `clipboardWrite`

Inkrypt uses clipboard access so the user can copy passwords, TOTP codes, or generated passwords from the extension UI or autofill flows when they explicitly choose copy or fill actions. Clipboard is not read by the extension for unrelated purposes.

---

## Justification: `activeTab`

Inkrypt uses `activeTab` so that when the user invokes a command that should apply only to the tab they are viewing (for example, filling credentials on the current page), the extension can interact with that tab in response to the user’s gesture. Access is limited to the active tab at invocation time and is used for password-manager behavior, not for broad browsing surveillance.

---

## Justification: host permissions (`http://*/*`, `https://*/*`)

Host access is required for two reasons: (1) **Content scripts** inject the autofill UI and helpers on normal websites so users can fill logins on pages they visit. (2) **Network requests** from the extension connect to the user’s configured **Supabase** backend (HTTPS) for authentication and encrypted vault data, and to the sites users save as login URLs. Inkrypt does not collect unrelated browsing history; site access supports autofill and user-initiated sync with the user’s own backend.

---

## Justification: remote code

**If the form asks whether you use remote code:** Inkrypt does **not** download or execute JavaScript from arbitrary remote URLs. All extension logic is bundled inside the published package (Manifest V3). Network calls are used for **API requests** (e.g. to the user’s Supabase project: auth, encrypted storage) and normal web requests—not for loading executable extension code from the internet.

If the dashboard offers a “no remote code” or similar option, select it in line with the above. If you must paste text:

> The extension does not execute remotely hosted code. Executable code is contained in the extension bundle only. Remote endpoints are used for HTTPS API calls to the user-configured backend (Supabase) and for web content interaction during autofill, not for eval or dynamic script injection from third-party servers.

---

## Data usage / privacy (short, if a separate field asks)

- **Account data:** Handled per your Supabase configuration; see your project’s privacy policy.
- **Local data:** Vault and settings are stored locally and encrypted as implemented in the app; review the open-source repository for details.
- **Selling user data:** Not applicable to the extension’s stated purpose; certify per Google’s checklist honestly.

Adjust the last bullet to match your actual practices and legal obligations.
