# Git Backfill / Restoration

This project now uses Git as the runtime source of truth for page documents in `src/data/pages/*.json`.

In local development, `GET /api/page-content` reads the local working tree first so previews and smoke tests reflect uncommitted page document changes. Production continues to read the GitHub-backed source of truth.

Use the backfill script only for controlled restoration or initial Git backfill:

```bash
npm run backfill:git-pages
npm run backfill:git-pages:write
```

Source mapping used by the script:

- `version-1`: `getVersion1InitialDocument()` built from `src/templates/version-1-published-seed.js` and current runtime migrations
- `mentions-legales`: `src/templates/mentions-legales-template.html`
- `politique-confidentialite`: `src/templates/politique-confidentialite-template.html`
- `politique-cookies`: `src/templates/politique-cookies-template.html`
- `cgu-cgv`: `src/templates/cgu-cgv-template.html`

Safety rules:

- The script is not a continuous synchronization tool.
- The script must never run automatically during `build`, `dev`, deploy hooks, or production runtime.
- Run the dry-run form first to inspect which files would change.
- Commit a backup before running the write mode when restoring production content.
