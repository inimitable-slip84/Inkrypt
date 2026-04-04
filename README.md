# Inkrypt

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg)](CONTRIBUTING.md)

**Inkrypt** is an **open-source** browser extension: **encrypted password manager**, **TOTP / 2FA authenticator** (RFC 6238), and **site autofill**. Your vault is protected by a master password; optional **[Supabase](https://supabase.com/)** sync uses a project **you** control (including self-hosting).

This project is **open to everyone**: code, docs, issues, translations, design, and testing. See **[Contributing](CONTRIBUTING.md)** and **[Code of Conduct](CODE_OF_CONDUCT.md)**.

## Documentation

| | |
|---|---|
| **Docs index** | [docs/README.md](docs/README.md) |
| **Screenshots & store assets** | [docs/screenshots.md](docs/screenshots.md) — Chrome Web Store sizes, GitHub embeds, safe capture tips |
| **Contributing** | [CONTRIBUTING.md](CONTRIBUTING.md) |
| **Security** | [SECURITY.md](SECURITY.md) |
| **Privacy** | [PRIVACY.md](PRIVACY.md) |
| **License** | [LICENSE](LICENSE) (MIT) |

## Links

| | |
|---|---|
| **Source** | [github.com/yafet-dev/Inkrypt](https://github.com/yafet-dev/Inkrypt) |
| **Chrome Web Store** | Add your listing URL after publish |
| **Issues** | [github.com/yafet-dev/Inkrypt/issues](https://github.com/yafet-dev/Inkrypt/issues) |

## Features

- **Passwords** — Save site URLs, usernames, and passwords; copy or autofill on pages you visit.
- **2FA** — TOTP secrets and time-based codes in the popup.
- **Encryption** — Vault data encrypted **client-side**; master password is not sent in plaintext to Inkrypt servers.
- **Account** — Email/password via Supabase Auth; optional **vault 2FA** for unlocking.
- **Auditable** — Source is public; run your own stack.

## Tech stack

- **Extension** — Manifest V3, TypeScript, React, Vite, Tailwind CSS.
- **Backend** — Supabase (PostgreSQL, Auth, RLS). Bring your own keys.

## Development

```bash
npm install
# Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see .env.example if present)
npm run build
```

Load **`dist/`** as an unpacked extension: `chrome://extensions` → Developer mode → **Load unpacked**.

**Store package:** `npm run package:chrome` → `inkrypt-chrome.zip`

**Database:** migrations under `supabase/` — `npm run db:link`, `npm run db:push` with the Supabase CLI.

### Supabase auth redirect

In Supabase **Authentication → URL configuration**, add (use your real extension id from `chrome://extensions`):

`chrome-extension://YOUR_EXTENSION_ID/auth-callback.html`

### Email link blocked (`ERR_BLOCKED_BY_CLIENT`)

Often an **ad blocker** blocks URLs with `#access_token=…`. Allowlist your extension or open the link in a **Guest** window with only Inkrypt enabled.

## Privacy & security

Review the code and Supabase policies before production. Self-host Supabase for full control. Report vulnerabilities privately — see **[SECURITY.md](SECURITY.md)**.

## Contributing

Contributions welcome — see **[CONTRIBUTING.md](CONTRIBUTING.md)** and **[docs/README.md](docs/README.md)**.

## License

[MIT](LICENSE) © Inkrypt contributors
