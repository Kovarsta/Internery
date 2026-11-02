# Data retention and file garbage collection

Date: 2026-10-21

Status: policy agreed; implementation deferred.

## Principle

A stored object lives only while at least one database row needs it. The object is deleted only when
no current profile and no application snapshot references it. Unique keys and reference-aware
cleanup prevent a student reuploading a CV from breaking an application the employer is reviewing.

## Retention defaults

| Data                                              | Retention                                                      | Clock starts         | Action                                                                                            |
| ------------------------------------------------- | -------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------- |
| Current profile CV                                | While the account is active and the CV is current              | Upload               | Replaced/deleted CVs follow the rows below                                                        |
| Replaced/deleted CV, no application reference     | 7 days                                                         | Replacement/deletion | Delete object after grace period                                                                  |
| Replaced/deleted CV, referenced by an application | Until every referencing application passes its CV retention    | Replacement/deletion | Keep object                                                                                       |
| Application CV, pending                           | While the job is active, plus 30 days after terminal job state | Application created  | Keep snapshot                                                                                     |
| Application CV, rejected/withdrawn                | 6 months after decision                                        | `decidedAt`          | Null CV fields; delete object if unreferenced                                                     |
| Application CV, accepted/completed                | 24 months after job terminal state                             | Job terminal date    | Null CV fields; delete object if unreferenced                                                     |
| Account deletion                                  | 30-day grace, then purge                                       | Deletion request     | Revoke sessions; delete current CV; anonymise profile; application CVs follow their own retention |
| Sessions                                          | 30 days after expiry                                           | Expiry               | Delete                                                                                            |
| Verification tokens                               | 7 days after expiry                                            | Expiry               | Delete                                                                                            |
| Notifications                                     | 90 days                                                        | Created              | Delete                                                                                            |
| Audit logs                                        | 24 months                                                      | Created              | Delete or archive                                                                                 |
| AI explanations                                   | 30 days, or immediately on consent withdrawal                  | Creation/withdrawal  | Delete                                                                                            |
| AI usage counters                                 | 90 days                                                        | Day recorded         | Delete                                                                                            |
| Temporary upload objects                          | 24 hours                                                       | Upload               | S3 lifecycle rule                                                                                 |
| Backups containing deleted data                   | 30 days                                                        | Backup created       | Deletion effective after backup expiry                                                            |

The 6-month and 24-month periods are product defaults, not legal requirements. Confirm them with
counsel and put the final periods in the privacy notice.

## Application snapshot rule

- Every upload gets a new unique key; never overwrite a key.
- An application stores its own `cvKey` / `cvFileName` snapshot.
- Reuploading a CV updates `student_profiles`, not `applications`.
- `GET /applications/{id}/cv` reads the application snapshot, not the current profile CV.
- `GET /me/cv` reads the current profile CV.
- A key referenced by any application must not be deleted.

## Locking and races

Both apply and CV replacement/deletion must lock the student profile row before reading or changing
the CV key:

```sql
SELECT ... FROM student_profiles WHERE "userId" = $1 FOR UPDATE;
```

Without the lock, an apply can read CV A, a reupload can check references before the application is
visible, and the old object can be deleted while the application commits against it.

## Deletion order

Normal replacement or removal:

1. Commit the database change.
2. Check references to the old key.
3. Keep the object if referenced.
4. Delete after the grace period otherwise.
5. Leave failed deletes to the orphan sweep.

Application CV retention expiry:

1. Null `applications.cvKey` and `cvFileName`.
2. Commit.
3. Check whether the key is still referenced by the profile or another application.
4. Delete if unreferenced.

Never delete the object before the database change commits.

## Scheduled garbage collection

- Delete expired sessions and verification tokens.
- Delete old notifications and AI data.
- Purge application CV fields past retention.
- Sweep `cv/` objects: collect referenced keys from `student_profiles` and `applications`; delete
  unreferenced objects older than 7 days.
- Sweep `avatars/` objects the same way, collecting referenced keys from `user_profiles.avatarKey`.
- Never sweep the reserved blank avatar key (`avatars/_blank.png`). It is infrastructure and stays
  even when no row references it. See `avatar-storage.md`.
- S3 lifecycle rule for `tmp/` uploads after 24 hours.

### Sweep notes

- The reference check loads the distinct non-null keys from the profile and application columns into
  one set. It is three queries in total, never one query per object.
- Deleting in batches is the useful optimisation: S3 accepts up to 1000 keys per delete request.
- Listing and deleting are separate round trips, so page-by-page processing costs about two requests
  per 1000 objects. That is enough at the current size.
- If the bucket grows much larger, the options are partial indexes on the key columns, or a
  `stored_files` table with reference counts. Both add write-path cost, so measure first.
- Run the sweep as a scheduled script, not inside the request process.

## Open decisions

- Confirm final retention periods with counsel.
- Decide whether account deletion hard-deletes users or anonymises them. Current restrictive foreign
  keys make anonymisation the practical choice.
- Decide whether an application CV is a reference snapshot (current design) or a byte-for-byte copy
  at apply time. Reference snapshots use less storage; copy-on-apply gives absolute isolation.
- Add `applications.cvMimeType` and `applications.cvSizeBytes` if the application snapshot should be
  fully self-contained.
- Consider a `stored_files` table later for centralized key metadata and cleanup. Not required for
  the first version.
- Note that already-downloaded employer copies cannot be revoked; the employer terms must cover
  retention of downloaded candidate files.

## Implementation TODOs

- Add retention constants to configuration.
- Run `pnpm storage:sweep` from a scheduler. Dry run is the default; `--apply` deletes.
- Add application CV expiry and the notification/AI/auth cleanup jobs.
- Add audit entries for system deletions, using key hashes rather than PII where possible.
