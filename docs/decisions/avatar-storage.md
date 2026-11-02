# Avatar storage and URLs

Date: 2026-10-21

Status: accepted.

## Principle

Avatars follow the same storage philosophy as CVs: the bucket stays private and the API never
returns a raw storage URL or a presigned URL. The application owns the URL and serves the bytes.

## Source of truth

- `user_profiles.avatarKey` — uploaded avatar object key.
- `users.image` — Better Auth/OAuth provider image, used only as a fallback.

`avatarUrl` in `UserMe` is generated at response time:

```text
avatarKey exists  -> /api/v1/users/{userId}/avatar?v=<key-hash>
else users.image  -> OAuth provider image URL
else              -> null
```

The uploaded-avatar URL points at the application, not at S3/MinIO.

Resetting an avatar stores the reserved blank key instead of clearing `avatarKey`, so the provider
fallback cannot bring the provider image back. See "Resetting to a blank avatar".

## Access

Avatars are public profile-display data. `GET /api/v1/users/{userId}/avatar` can be unauthenticated,
unlike CV downloads, which remain owner/application-scoped.

If avatars become private later, change this route to require a session and keep the same
application-served URL shape.

## Serving

`GET /api/v1/users/{userId}/avatar` should:

- stream the private object;
- set `Content-Type` from stored metadata;
- send an `ETag` derived from the object key or version;
- send cache headers;
- return `404` when the user has no uploaded avatar and no fallback image.

Do not return a presigned S3 URL: it creates a temporary shareable storage link and makes cache
invalidation harder.

## Upload and replacement

- Accept PNG or JPEG, up to 2 MB.
- Let the decoder identify the format; never trust the client MIME type or file extension.
- Cap the decoder at 16 MP, so a small compressed file cannot expand into an enormous raster.
- Rotate by the EXIF orientation, crop towards 512×512 without enlarging, then re-encode as WebP at
  quality 80. Re-encoding strips EXIF, including GPS coordinates.
- Generate a new key for every upload; never overwrite an existing object.
- Update `avatarKey` to the new key.
- Delete the old object after the normal 7-day unreferenced grace period.

## Resetting to a blank avatar

A user must be able to remove their picture completely, including the OAuth provider image. Deleting
the row or nulling `avatarKey` would make the fallback show the provider image again, which is the
opposite of what was asked.

Decision: one shared placeholder object, and reset points at it.

- Key: `avatars/_blank.png` — a fixed, reserved key, not per-user.
- Reset sets `user_profiles.avatarKey = 'avatars/_blank.png'`.
- `GET /api/v1/users/{userId}/avatar` then serves the placeholder like any other avatar, with `200`.
- `users.image` is left alone. It is shadowed by `avatarKey`, so the provider image never surfaces.
- No new column and no extra flag: the existing `avatarKey` precedence does the work.

Consequences:

- `avatarKey` non-null no longer means "this user uploaded a picture". Anything that branches on it
  must treat the reserved key as "blank", not as a custom image.
- The placeholder object is exempt from the orphan sweep even when no row references it. It is
  infrastructure, not user data. See `data-retention.md`.
- The object must exist before any reset is served. Provision it with the bucket, not on first use.
- Resetting is idempotent: setting the same key twice is harmless.

The reset action is `DELETE /me/avatar`. It answers `204` whether or not the user had a picture, so
repeating the call is safe. Adding it took the contract from 64 to 65 operations; no existing
operation changed.

Local provisioning is the compose `minio-blank-avatar` job, which copies
`docker/minio/blank-avatar.png` into the bucket after `minio-init` creates it. A real deployment must
provision the same object once.

## Open decisions

- Whether avatars stay public or become authenticated later.
- Whether `users.image` should be updated to the application URL for OAuth consistency, or remain the
  provider URL fallback. Current decision: keep it as the provider fallback.

## Implementation TODOs

- Version the `avatarUrl` with `?v=` so the route can cache immutably.
- Answer `304` when the request's `If-None-Match` matches the object ETag.
- Sweep avatars: remove objects no profile and no application references.

## References

- [Amazon S3 GetObject](https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html)
- [Path-style vs virtual-hosted requests](https://docs.aws.amazon.com/AmazonS3/latest/userguide/VirtualHosting.html)
- [Signature Version 4](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_sigv.html)
- [Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control)
- [ETag](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/ETag)
- [MinIO users and policies](https://min.io/docs/minio/linux/reference/minio-mc-admin/mc-admin-user.html)
