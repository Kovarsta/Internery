# MinIO for staging

Date: 2026-10-21

## Context

The compose file referenced `minio/minio:latest` and `minio/mc`, but MinIO removed the community
images from Docker Hub and Quay in 2025. Pulls fail with `pull access denied` (Docker Hub) or
`401 Unauthorized` (Quay). Quay historical tags are no longer pullable either.

MinIO Community Edition is source-only and in maintenance mode. The Go binary still works; only the
published container images disappeared.

## Decision

- Use `cgr.dev/chainguard/minio:latest` for the server. Chainguard builds the current MinIO release
  from source (AGPLv3), runs as non-root uid 65532, and publishes it publicly.
- Use `cgr.dev/chainguard/minio-client:latest` for the one-shot `minio-init` bucket job.
- Healthcheck with `mc ready local` and an `MC_HOST_local` alias. The Chainguard image includes
  `mc` but not `curl`, so the original `curl -f /minio/health/live` check would fail.
- Create `${S3_BUCKET:-internery-staging}` on startup with `mc mb --ignore-existing`. The job is
  idempotent and exits after the bucket exists.

## Consequences

- Pin a digest (not `:latest`) before a real staging deploy. Current digests:
  - server: `sha256:32c504bea4574d8f29d719b37bc0dad920ecf3e22b81dc5cea0bb105af2ce10f`
  - client: `sha256:694b07329b19836a369be6537301aa9b5cb8d2203157d1894c26c45be4308ef3`
- `MINIO_ROOT_USER` and `MINIO_ROOT_PASSWORD` default to development values. Set real values in
  `.env` for staging and keep `.env` out of git (already ignored).
- `MC_HOST_local` embeds the password in a URL. URL-encode special characters or use a URL-safe
  password.
- Presigned URLs are signed by the client with the endpoint it was configured with. MinIO cannot
  rewrite them. The app must use the public S3 endpoint in staging; `MINIO_SERVER_URL` is deprecated
  since 2024-05-10 and is not a fix for SDK-generated URLs.
- `MINIO_BROWSER_REDIRECT_URL` defaults to `http://localhost:9001`; set it in `.env` when the
  console is served through a reverse proxy.
- Ports 9000/9001 are published on all interfaces. For staging, bind them to a private interface or
  put MinIO behind the reverse proxy and drop the published ports.

## Verification

- `docker compose config` parses.
- `docker compose up -d minio minio-init` brings MinIO to `healthy`.
- `docker compose exec minio mc ls local` lists `internery-staging/`.
