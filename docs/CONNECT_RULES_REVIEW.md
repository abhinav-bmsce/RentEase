# RentEase Connect — rules prepared for review

Rules and Hosting were deployed to `rentease-3f04f` on 14 November 2026 after explicit owner approval. GitHub publication was also approved. No production test messages were created.

## Additions

- `chatOwner`: resolve explicit property owner, otherwise the existing bootstrap owner.
- `chatLease`: require active tenancy, matching tenant user/room, active tenant and owner accounts, and current owner assignment before create/send.
- `chatParticipant`: allow only the immutable tenant/owner pair with active accounts to read chat. No blanket administrator read access.
- `/conversations/{tenancyId}`: deterministic ID, validated participants and zero initial counters; immutable identities. Updates can only atomically append a message/counters or advance the caller's own read marker.
- `/conversations/{tenancyId}/messages/{messageId}`: sender identity, 1–2,000 nonblank characters, server timestamp, ordered sequence, atomic parent update and valid maintenance linkage. Client edits/deletes are denied.
- List limits: 100 conversations, 40 messages. No new composite indexes needed.

Original participants retain read-only history when a tenancy ends. Disabled accounts lose access. A new owner does not inherit old messages. Existing trusted administrator powers to manage user/property/tenancy records are unchanged.

## Exact proposed change

Run `git diff -- firestore.rules` in the project, or inspect the new RentEase Connect block in `firestore.rules`. All pre-existing collection rules are unchanged.

Deployment used `firebase deploy --only firestore:rules,hosting`. No Firestore records or indexes were migrated.

Verification: lint, type-check, production/PWA build, 67 unit/component tests, 31 Connect emulator authorization/realtime tests, and 12 existing security-rule tests passed. Tests cover simultaneous sends, participant privacy, sender spoofing, content validation, maintenance ownership, immutable history, read receipts, disabled accounts, and both portal navigation links. Cross-account production chat was not exercised with real tenant data.
