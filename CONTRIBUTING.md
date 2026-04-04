# Contributing to Inkrypt

Thank you for helping make Inkrypt better. This project is **open source** and welcomes contributions from everyone.

## Ways to contribute

- Report bugs or suggest features ([Issues](https://github.com/YOUR_ORG/Inkrypt/issues))
- Submit pull requests (bugfixes, features, tests)
- Improve documentation (`README`, `docs/`, code comments where they add real value)
- Review others’ PRs, reproduce bug reports, or answer questions

Replace `YOUR_ORG/Inkrypt` with your repository path after publishing on GitHub.

## Before you code

1. **Search existing issues** to avoid duplicates.
2. For **larger changes**, open an issue first so we can agree on direction.
3. **Security issues** — do *not* open a public issue. See [SECURITY.md](SECURITY.md).

## Development setup

```bash
git clone https://github.com/YOUR_ORG/Inkrypt.git
cd Inkrypt
npm install
```

Copy environment variables (see `.env.example` if present):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

```bash
npm run build
```

Load **`dist/`** as an unpacked extension in Chrome (`chrome://extensions` → Developer mode → Load unpacked).

```bash
npm run dev
```

Use the dev workflow from [@crxjs/vite-plugin](https://crxjs.dev/vite-plugin/) if you rely on the Vite dev server for the extension.

## Pull requests

- **One topic per PR** when possible (easier review and history).
- **Match existing style**: TypeScript/React patterns, Tailwind usage, formatting consistent with nearby files.
- **No unrelated refactors** mixed with feature fixes.
- Update **docs** if you change user-facing behavior or setup.

## Code of conduct

Participation is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). Be respectful and constructive.

## License

By contributing, you agree that your contributions are licensed under the **MIT License** (see [LICENSE](LICENSE)).
