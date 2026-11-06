# Build stage: install every dependency and compile the SvelteKit server.
FROM node:22-bookworm-slim AS build

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN npm install --global pnpm@10.33.2

WORKDIR /app

# `vite build` checks that every variable declared in `src/env.ts` has a value,
# even though this app reads them at runtime. These placeholders only satisfy
# that build check; the runtime stage gets the real values from compose. They
# are all dynamic variables, so no value is inlined into the bundle.
#
# ORIGIN is the exception: it becomes the trusted origin through
# `paths.origin`, so it must match the address the demo is served at.
ARG APP_ORIGIN=http://localhost:3000
ENV ORIGIN=$APP_ORIGIN
ENV DATABASE_URL=postgres://build:build@localhost:5432/build
ENV BETTER_AUTH_SECRET=build-placeholder
ENV GITHUB_CLIENT_ID=build-placeholder
ENV GITHUB_CLIENT_SECRET=build-placeholder
ENV RESEND_API_KEY=build-placeholder
ENV EMAIL_FROM_ADDRESS=build@example.com
ENV WORK_RECORD_SECRET=build-placeholder
ENV S3_ENDPOINT=http://localhost:9000
ENV S3_REGION=us-east-1
ENV S3_BUCKET=build-placeholder
ENV S3_ACCESS_KEY_ID=build-placeholder
ENV S3_SECRET_ACCESS_KEY=build-placeholder

# Copy the manifests first, so a source-only change reuses the dependency layer.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# Runtime stage: production dependencies and the compiled output only.
FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN npm install --global pnpm@10.33.2

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --prod --frozen-lockfile

# `pnpm build` with adapter-node writes the server, the client and the static
# files into `build/`. This folder is all the runtime needs.
COPY --from=build /app/build ./build

EXPOSE 3000

# Adapter-node reads HOST and PORT from the environment; compose sets both.
CMD ["node", "build"]
