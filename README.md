# Blessing Marketing – TinaCMS Backend

Self-hosted TinaCMS backend for the `blessing-marketing-od-site` GitHub Pages
site. This is a standalone service (Next.js + Tina self-hosted) that runs in
its own container and edits content directly in the
`alexander-blessingmarketing/blessing-marketing-od-site` repo via the GitHub
data layer. It does **not** render or host the public website — Pages/Actions
in that repo remain the source of the live site build.

Forked from [tinacms/tina-self-hosted-demo](https://github.com/tinacms/tina-self-hosted-demo)
with dependencies pinned to a version matrix validated in a prior spike (see
`package.json`), MongoDB swapped in for the datalayer instead of Vercel KV,
and the schema (`tina/collections/blessing.ts`) modeled 1:1 on
`src/clients/blessing-marketing-od/content/de.json` from the site repo.

## What this edits

One JSON collection (`blessing`, single doc `de.json`) covering every
top-level section of the OD site content: brand/nav/footer, hero, logos,
services, stats, cases, about, people, testimonials, cta, map. See
`tina/collections/blessing.ts` for the full field list.

## Local development (local mode — no GitHub/Mongo/auth required)

Local mode edits the filesystem directly and skips GitHub/Mongo/auth
entirely — useful for verifying the schema against real content.

1. Copy the client folder from the site repo into this project at
   `src/clients/blessing-marketing-od/` (content + assets), matching the
   collection's `path`. This folder is git-ignored here; it's a local aid
   only, not a build artifact.
2. `pnpm install --ignore-scripts` — the `--ignore-scripts` flag avoids the
   `better-sqlite3` native build.
3. **React caveat**: for local `tinacms dev`, react/react-dom must be pinned
   to `18.3.1` (temporarily edit `package.json`, reinstall). React 19
   (the pinned prod version) throws a `ReactCurrentDispatcher` error in
   Tina's local-mode dev bundle. Revert to `^19` afterwards for the prod
   build.
4. `cp .env.example .env` (values don't matter for local mode except
   `NEXTAUTH_SECRET`, set to any string).
5. Start the dev server (on Windows, prefer exporting the env var directly
   rather than the inline `VAR=value next dev` script form, which fails
   under pnpm's default `cmd.exe` script shell):
   ```bash
   export TINA_PUBLIC_IS_LOCAL=true
   pnpm exec tinacms dev -c "next dev --webpack"
   ```
   On Linux/macOS the plain `pnpm dev` script works as-is.
6. Open `http://localhost:3000/admin/index.html`, click **Enter Edit Mode**,
   select the **Blessing Marketing – Website Inhalte** collection.

### Known cosmetic issues in local mode (do not affect saved data)

- Image field thumbnails for **already-saved** values 404
  (`/admin/assets/...`): Tina's `ImageField` renders the raw stored relative
  path (`assets/logo.png`) directly as `<img src>`, which the browser
  resolves against the current document URL (`/admin/`) instead of using
  `mediaRoot`/`publicFolder`. This is an upstream Tina gap in the
  self-hosted/local-filesystem media preview, not a config error — the
  media *picker*/upload flow resolves paths correctly server-side, and the
  JSON always stores the correct relative path regardless.
- `LocalAuthProvider` performs a "branch guard" `listBranches` check against
  `content.tinajs.io` on every save, which fails with a CORS/network error
  in local mode and logs to the console — then "fails open" and the save
  proceeds normally. Non-blocking.

## Production (Docker + Traefik)

1. Fill in `.env` (see `.env.example`): `GITHUB_PERSONAL_ACCESS_TOKEN` needs
   content read/write on `blessing-marketing-od-site`; generate
   `NEXTAUTH_SECRET` with `openssl rand -base64 32`.
2. In `docker-compose.yml`, replace the `<TRAEFIK_NET>`, `<ENTRYPOINT>`,
   `<CERTRESOLVER>`, and `<HOST>` placeholders with the values for the
   target VM's Traefik setup.
3. `docker compose up -d --build`. The entrypoint runs
   `tinacms build --partial-reindex` (reindexes GitHub content into Mongo)
   then `next start -p 3000`.
4. The site's GitHub Pages deployment is untouched — Pages source stays on
   the Actions workflow already in the site repo. This backend only pushes
   content commits to the branch Pages already builds from.
5. Log in at `https://<HOST>/admin` with the seeded user in
   `content/users/index.json` (`admin` / `admin` — password is stored
   plaintext in the seed and gets hashed automatically the first time Tina
   indexes/authenticates; change it immediately after first login via the
   Users collection).

## Environment Variables

| Variable                       | Description                                                                 |
| ------------------------------ | ---------------------------------------------------------------------------- |
| `TINA_PUBLIC_IS_LOCAL`          | `true` for local filesystem mode, `false` in production.                    |
| `GITHUB_OWNER`                  | `alexander-blessingmarketing`                                                |
| `GITHUB_REPO`                   | `blessing-marketing-od-site`                                                 |
| `GITHUB_BRANCH`                 | `main`                                                                       |
| `GITHUB_PERSONAL_ACCESS_TOKEN`  | PAT with content read/write on the repo above.                              |
| `MONGODB_URI`                   | Mongo connection string (docker-compose sets this to the `mongo` service). |
| `NEXTAUTH_SECRET`               | Random secret for NextAuth JWT/session encryption.                          |

## Notes

- `next.config.js` forces webpack (`next dev --webpack` / `next build --webpack`)
  — Turbopack has a project-root resolution issue with this Tina setup in
  the validated spike.
- `tinacms-authjs` must stay on `^22.0.1`, not `23.x` — the newer major
  breaks ESM interop with this dependency matrix.
