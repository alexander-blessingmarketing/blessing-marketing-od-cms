# Shared TinaCMS Backend (Architecture B)

Generic, env-driven self-hosted TinaCMS backend. **One** Docker image serves **any** Kit
client; everything client-specific comes from environment variables. Content lives only in
each client's Astro repo (GitHub Pages) and is fetched fresh at container start — this
service edits that content and commits it back. It does **not** render or host the public
website; Pages/Actions in the client repo remain the source of the live site build.

Forked from [tinacms/tina-self-hosted-demo](https://github.com/tinacms/tina-self-hosted-demo),
dependencies pinned to a validated version matrix (see `package.json`), MongoDB as the
datalayer instead of Vercel KV.

## Architecture

- **Client repo** (`<client>-site`): pure Astro + content (`src/clients/<slug>/content/de.json` + `assets/`) → GitHub Pages. No Tina code.
- **This backend**: Next.js + Tina self-hosted with a **superset schema**, **git-backed media**, **runtime content fetch**, and **env-decoupled auth**. Builds one image → GHCR.
- **VPS**: one shared MongoDB; one container per client from the shared image, behind Traefik by subdomain.

Data flow:

```text
container start → fetch content fresh from <client> repo
               → tinacms build (index superset into Mongo, dbName per client)
               → next start (/admin live)
editor: login → edit → Tina commits content + media back to <client> repo → Astro rebuilds → Pages
redeploy: re-fetches content → no staleness, no duplicate
```

Principle: the image is generic; every client difference lives **only** in env + the client
repo. Content exists once (client repo), schema once (this backend, superset).

## What it edits

- One single-doc JSON collection `site` (`tina/collections/site.ts`), its `path` from `CONTENT_PATH`. The schema is a **superset**: every known Kit section is an **optional** field, so any client's `de.json` is a subset (missing sections → empty, no index error).
- **Media** is git-backed via a custom client store (`lib/media-store.ts`) that talks to backend routes (`lib/media-handler.ts`: list/upload/delete) which commit into the client repo's `assets/`. Editor previews are served by `pages/api/assets/[...path].ts`.
- **Auth** is env-based (`lib/env-auth.ts`) — no user records in the repo or datalayer.

## Environment variables

All client-specific config is env. None of these live in the repo; set them in the
container's environment (Compose `environment:` block, an `.env`, or a secrets manager).
See `.env.example` and `docker-compose.deploy.yml`.

| Variable | Required | Example / notes |
|---|---|---|
| `TINA_PUBLIC_IS_LOCAL` | yes | `false` in production (`true` = local filesystem mode) |
| `GITHUB_OWNER` | yes | `alexander-blessingmarketing` |
| `GITHUB_REPO` | yes | `blessing-marketing-od-site` — repo name **only**, no owner |
| `GITHUB_BRANCH` | no | default `main` |
| `CONTENT_PATH` | yes | `src/clients/<slug>/content` — the collection path |
| `CONTENT_PUBLIC_FOLDER` | yes | `src/clients/<slug>` — parent that holds `assets/` |
| `MONGO_DB` | yes | `tina_<slug>` — per-client namespace on the shared mongo |
| `MONGODB_URI` | yes | `mongodb://mongo:27017/` (compose sets this) |
| `GITHUB_PERSONAL_ACCESS_TOKEN` | yes | Contents:write on `GITHUB_OWNER/GITHUB_REPO` (content + media write-back) |
| `NEXTAUTH_SECRET` | yes | `openssl rand -base64 32`, unique per instance |
| `ADMIN_USER` | yes | client admin username, e.g. `admin` |
| `ADMIN_PASSWORD_HASH` | yes | pbkdf2 hash from `scripts/gen-password-hash.mjs` (see below) |
| `AGENCY_ADMIN_USER` | yes | agency admin username (same on every instance) |
| `AGENCY_ADMIN_PASSWORD_HASH` | yes | pbkdf2 hash, shared agency password |
| `NEXTAUTH_URL` | no | `https://<host>` — silences a NextAuth warning; login works without it |

### Password hashes

Two admins per instance: a **client** admin (per client) and an **agency** admin (same
credentials on every instance). Generate each hash locally and paste the value into env —
plaintext passwords never go into the repo or compose:

```bash
node scripts/gen-password-hash.mjs "<password>"
```

The output is one long hex line. It may wrap in the compose/YAML editor — the backend
strips whitespace before comparing, so wrapping is harmless; just keep the YAML valid
(value in quotes, consistent indentation).

## Onboarding a new client

1. Create the client's Astro repo `<client>-site` with content at `src/clients/<slug>/content/de.json` + `assets/`, deploying to GitHub Pages (mirror the pilot repo's layout).
2. Ensure the client's `de.json` is a **subset** of the superset (`tina/collections/site.ts`). If it needs a section the superset lacks, add it as a new **optional** field (backwards-compatible) and rebuild the image.
3. Copy `docker-compose.deploy.yml`, fill the env block for the client: subdomain (Traefik labels), `CONTENT_PATH`/`CONTENT_PUBLIC_FOLDER`, `MONGO_DB=tina_<slug>`, PAT with Contents:write, `NEXTAUTH_SECRET`, and the four auth vars (hashes via `gen-password-hash.mjs`).
4. Point Traefik at the client subdomain and bring the container up. It fetches content, indexes into its Mongo namespace, and serves `/admin`.
5. Log in with the client or agency admin.

The shared mongo and the GHCR image are reused; a new client = env + container + subdomain.

## Local development (local mode — no GitHub/Mongo/auth)

Local mode edits the filesystem directly and skips GitHub/Mongo/auth — useful for verifying
the schema against real content.

1. Copy the client folder into `src/clients/<slug>/` (content + assets); it's git-ignored here.
2. `pnpm install --ignore-scripts` — avoids the `better-sqlite3` native build.
3. **React caveat**: local `tinacms dev` needs react/react-dom pinned to `18.3.1`. Prod is `19.2.6`, which throws a `ReactCurrentDispatcher` error in Tina's local-mode dev bundle. Temporarily edit `package.json`, reinstall, revert after.
4. `cp .env.example .env` — values don't matter in local mode except `NEXTAUTH_SECRET` (any string); set `CONTENT_PATH`/`CONTENT_PUBLIC_FOLDER` to the local slug.
5. Start the dev server (on Windows, export the env var first; the inline `VAR=value` script form fails under pnpm's default `cmd.exe` shell):
   ```bash
   export TINA_PUBLIC_IS_LOCAL=true
   pnpm exec tinacms dev -c "next dev --webpack"
   ```
   On Linux/macOS the plain `pnpm dev` script works as-is.
6. Open `http://localhost:3000/admin/index.html` → **Enter Edit Mode**.

## Production (Docker + Traefik)

1. Fill the container env (table above + `docker-compose.deploy.yml`).
2. `docker compose up -d` (or pull the GHCR image and recreate). Entrypoint runs `node scripts/fetch-content.mjs` → `tinacms build` (reindex into Mongo) → `next start -p 3000`.
3. The client site's GitHub Pages deploy is untouched — this backend only commits content/media to the branch Pages already builds from.
4. Log in at `https://<host>/admin`.

**CI:** pushing to `main` builds + pushes the image to GHCR (`docker-image.yml`). PRs run a build check in local mode (`pr-open.yml`). **Redeploy on `:latest` must force a pull** — same tag, new digest; a plain restart keeps the old image.

## Notes / gotchas

- **Build uses webpack** (`next build --webpack`) — Turbopack has a project-root resolution issue with this Tina setup.
- **`tinacms-authjs` pinned to `^22.0.1`** — 23.x breaks ESM interop with this dependency matrix.
- **Editor image previews**: the field value stays Astro-relative (`assets/<file>`). A `fallback` rewrite in `next.config.js` (`/admin/assets/*` and `/assets/*` → `/api/assets/*`) makes previews load without changing the stored value; `fallback` only fires on true 404s, so the admin's own hashed chunks under `/admin/assets/*.js|css` are unaffected.
- **Known limits**: media list is not paginated (loads a whole directory — fine for typical asset counts); thumbnails serve the full-size image (no resize).
- **Vestigial**: the `Users` collection (`TinaUserCollection`) and the committed `content/users/index.json` are unused under env auth — kept to avoid schema churn; candidates for later cleanup.
