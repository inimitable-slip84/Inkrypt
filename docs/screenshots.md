# Screenshots & promotional images

Use this guide when preparing assets for the **Chrome Web Store**, **GitHub** (`README`), and other listings.

## Chrome Web Store (official requirements)

Requirements change over time. Always confirm the latest sizes on Google’s developer documentation:

- [Chrome Web Store: Preparing your item](https://developer.chrome.com/docs/webstore/best_practices/#prepare-your-items-metadata)
- [Program policies / listing](https://developer.chrome.com/docs/webstore/program-policies/)

Typical assets include:

| Asset | Common use |
|-------|------------|
| **Screenshots** | Show the UI (vault, add entry, settings, autofill context if safe). Usually several images; follow current min/max count and dimensions in the dashboard. |
| **Small promo tile** | Grid icon in the store (often **440×280** px — verify in dashboard). |
| **Marquee / large tile** | Optional larger banner where the store asks for it. |

**Tips**

- Use a **clean browser profile** or demo data — no real passwords or personal emails in pixels.
- Prefer **PNG** for UI; **JPEG** is often allowed for photos.
- **Light and dark** theme: include at least one screenshot per theme if you support both.
- **Consistent zoom**: same OS scaling when capturing all shots.

## GitHub README

In `README.md`, embed images from this repo:

```markdown
![Vault overview](docs/screenshots/vault-overview.png)
```

Recommended shots (filenames are suggestions — add files under `docs/screenshots/`):

| Suggested file | Content |
|----------------|---------|
| `vault-overview.png` | Main vault list (signed in, unlocked) |
| `add-entry.png` | Add / edit entry form |
| `settings.png` | Settings (optional) |
| `unlock.png` | Unlock screen (optional; no secrets visible) |

Keep total image size reasonable for clones (compress PNGs if needed).

## Where to put files

Save exported PNGs in **`docs/screenshots/`** (see [screenshots/README.md](screenshots/README.md)). They are referenced by the main [README](../README.md) once you add them.

## Capture workflow (quick)

1. Build: `npm run build`, load **`dist/`** unpacked in Chrome.
2. Resize or use a fixed window size so shots are consistent.
3. Capture with OS screenshot tool or browser devtools device frame (if you use one).
4. Crop to the extension popup window only, or leave a thin margin — your choice; stay consistent.
5. Commit to git and push so README images work on GitHub.

## License note

Screenshots of Inkrypt’s UI are usually fine to ship under the same **MIT** license as the project; if you include third-party logos or sites in the background, ensure you have rights or use neutral demo pages.
