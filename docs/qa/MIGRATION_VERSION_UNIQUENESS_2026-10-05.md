# WU242 — Unique Supabase migration versions

RUN_ID `ATV-20260902-170644Z-01A0630F`. Master plan §19.2/§0.6.

The linked migration inventory on 2026-10-05 showed two local SQL files with version `20260928170000`. Neither version was applied remotely. Supabase records migration versions independently of filenames, so the collision must be removed before deployment.

- Renamed only `20260928170000_product_continuity_maintenance.sql` to `20260928170100_product_continuity_maintenance.sql`; career intake retains its version. The sorted order remains career requests → continuity maintenance → career context.
- SQL bytes are unchanged: SHA256 `8b4cf0712a2cc6ab26293dd1c407201bb73ef294d1db4b905500a125142c2836`. RPC signature, service-only access, 500-event bound, locking, disabled policy and forward-fix remain unchanged.
- Updated the maintenance contract, DB suite and web integration suite filename references.
- Added a directory-level version uniqueness test to the existing `test:unit` CI command. The actual migration directory failed before the rename, identifying both files; it passes after the correction. This prevents future independently added migrations from silently sharing a version.

Local regression outputs are stored outside this checkout in `E:/ATVNA/app/test-results/wu242-*.log`. Exact validation and remote CI outcomes are recorded in the canonical execution evidence after completion.

The full 45-migration chain applies in synthetic PGlite; all 105 DB tests pass. Check, lint and build pass. The first unit run exposed a remaining web test filename reference, which was corrected, and a PDF render failure while other heavy checks were running. Both affected suites then passed together (10/10); the complete web rerun passed 79 files and 1,567 tests with the original rendering limit unchanged.

No remote migration was applied, history repaired, product enabled, production fixture inserted or gate relaxed. This correction does not certify hosted JWT/RLS, backup/restore, staging capacity or product approval. Applied migrations must not be renamed; this version was confirmed absent in the linked history before the correction.
