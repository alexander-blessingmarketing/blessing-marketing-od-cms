FROM node:20-bookworm-slim

# TinaCMS build needs git (git-provider push/pull) + certs for outbound HTTPS
RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates \
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
RUN pnpm exec next build --webpack

EXPOSE 3000

# Reindex tina content against Mongo, then start the Next.js server.
ENTRYPOINT ["sh", "-c", "NODE_OPTIONS=--max-old-space-size=4096 pnpm exec tinacms build && pnpm exec next start -p 3000"]
