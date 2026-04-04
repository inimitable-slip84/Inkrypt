# Privacy policy — Inkrypt

**Inkrypt** is an **open-source** password manager and 2FA (TOTP) browser extension. This document describes how we think about privacy for the **official reference build** published for Chrome (and similar Chromium browsers). The same source code is available for anyone to inspect, fork, and run with their own configuration.

## Our goal

- **Open source first** — Anyone can read the code, self-host a backend, and use the extension without depending on a single company’s servers.
- **No data business** — The Inkrypt project **does not sell user data**, **does not run targeted advertising**, and **does not collect browsing history or keystrokes** for analytics or profiling.
- **Reference & testing** — The published Chrome extension is the **official reference client** for the project so people can try the real UI and flows. It is not a separate “data product.”

## What we do *not* do

- We do **not** sell, rent, or trade your personal information.
- We do **not** use your vault contents or site usage for advertising.
- We do **not** upload a log of every website you visit as “web history” for Inkrypt’s purposes.
- We do **not** embed third-party trackers in the extension for marketing analytics.

## What data exists (and who controls it)

### On your device

The extension stores **your vault and settings locally** in the browser (for example encrypted credentials, TOTP material, theme, and related app state). That data exists **so the password manager can work**. It stays under **your** browser profile unless you configure sync (below).

You can review what the extension can access in the **open-source repository** and in your browser’s extension details.

### Optional: your own Supabase project

If you enable **sign-in / sync** with **[Supabase](https://supabase.com/)**, **you** (or your organization) choose the **Supabase URL and keys** (see `.env.example` and build docs). In that case:

- **Authentication** (for example **email** for login) and **encrypted vault-related records** are processed by **your** Supabase project, not by a separate “Inkrypt cloud” operated for profit.
- Network requests go to **the endpoints you configured**. You should read **Supabase’s** terms and your own project settings for retention, logs, and regions.

The Inkrypt maintainers **do not** receive your vault contents from that setup unless **you** explicitly send data to infrastructure they operate—which is **not** required to use the app.

### Clipboard

The extension may use the clipboard **when you explicitly copy** a password, TOTP code, or generated value. It is not used to read unrelated clipboard content for collection.

## Changes to this policy

We may update this file in the repository as the software evolves. The **version on GitHub** is the reference; for store listings, point to this document or a copy on your site that stays in sync.

## Contact

For security issues, see [SECURITY.md](SECURITY.md). For general questions, use [GitHub Issues](https://github.com/yafet-dev/Inkrypt/issues).

---

*Last updated: 2026-04-04 (adjust date when you change this file.)*
