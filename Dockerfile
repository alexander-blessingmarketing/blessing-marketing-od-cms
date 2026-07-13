FROM node:20-bookworm-slim

# TinaCMS build needs git (git-provider push/pull) + certs for outbound HTTPS;
# tar is needed to unpack the client content tarball fetched at container start.
RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates tar \
    && rm -rf /var/lib/apt/lists/*

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches
RUN pnpm install --ignore-scripts --frozen-lockfile

COPY . .

# TINA_PUBLIC_IS_LOCAL must be false at build time so the local-mode branch
# (createLocalDatabase) is not baked into the production bundle.
ENV TINA_PUBLIC_IS_LOCAL=false

# Bake the Tina admin bundle + generated client/types INTO the image (codegen).
# This is the heavy ~3.3GB / 40-76s step; running it ONCE here instead of on every
# container start is the OOM fix. --skip-indexing skips content indexing (no client
# content in this generic image yet). TINA_BUILD_LOCAL_DB=true makes tina/database.ts
# use an in-memory datalayer for this build so NO Mongo is required (codegen otherwise
# forces a datalayer connection even with --skip-indexing). Client/auth stay production
# because TINA_PUBLIC_IS_LOCAL is still false.
# Codegen genuinely needs ~3.3-4GB heap (that's why running it per container start
# was the OOM). Here it's a ONE-TIME build cost, so give it the heap it needs.
RUN NODE_OPTIONS=--max-old-space-size=4096 TINA_BUILD_LOCAL_DB=true pnpm exec tinacms build --skip-indexing

RUN pnpm exec next build --webpack

EXPOSE 3000

# No client content is baked into the image. At container start: fetch the
# client's content+assets fresh from its public site repo, index that content into
# the shared Mongo datalayer (programmatic, NO codegen -> low memory; the admin was
# already built above), then start the Next.js server. Start now takes seconds at a
# fraction of the RAM instead of a full `tinacms build` per boot.
# NOTE: no user seeding — auth is env-decoupled (lib/env-auth.ts, design §6
# Fallback II), so there is no content/users doc to seed or re-index.
ENTRYPOINT ["sh","-c","node scripts/fetch-content.mjs && node scripts/index-content.mjs && pnpm exec next start -p 3000"]
