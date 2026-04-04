# Security

## Reporting a vulnerability

If you believe you have found a **security vulnerability** in Inkrypt, **please do not** open a public GitHub issue.

Instead, report it privately so we can address it responsibly:

1. Use **GitHub Security Advisories** for this repository (**Security** tab → **Report a vulnerability**), if enabled, **or**
2. Email the maintainers directly (add a contact in your repo description or `README` once you have one).

Include:

- A clear description of the issue and its impact
- Steps to reproduce (or a proof-of-concept), if safe to share
- Affected versions or commit, if known

We will acknowledge receipt as soon as we can and work with you on a fix and disclosure timeline.

## General security notes

- Review the code and your **Supabase** Row Level Security policies before production use.
- Vault encryption is **client-side**; protect your master password and device.
- For dependency issues, maintainers may use automated alerts and periodic updates; responsible disclosure for **direct** vulnerabilities in this codebase still follows the process above.
