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
- Validate the file signature, not only the client-supplied MIME type.
- Generate a new key for every upload; never overwrite an existing object.
- Update `avatarKey` to the new key.
- Delete the old object after the normal 7-day unreferenced grace period.

## Open decisions

- Whether avatars stay public or become authenticated later.
- Whether to resize/normalise uploads to WebP before storing them.
- Whether `users.image` should be updated to the application URL for OAuth consistency, or remain the
  provider URL fallback. Current decision: keep it as the provider fallback.

## Implementation TODOs

- Implement the avatar-serving route (skeleton exists at
  `src/routes/api/v1/users/[userId]/avatar/+server.ts`).
- Add avatar upload validation and storage-service calls.
- Add cache/ETag handling.
- Add the avatar URL to the `UserMe` mapper.
