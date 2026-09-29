# Week temporal detail — local evidence

RUN_ID `ATV-20260902-170644Z-01A0630F`; WU191; product `week-reading`, E4 partial. Local synthetic data only. Release flags, payment spend and approval authority remain unchanged.

## Delivered

The owner-only `read_product_run` projection exposes bounded events and candidate windows only for a released Week calculation at `atv-week-reading-calculation/1.2.0`. It preserves the existing release, editorial, entitlement and ownership checks. SQL selects named fields, returns total counts and at most 24 events and 12 windows, and rejects source arrays over 4,096/2,048. It does not return raw calculation data, natal snapshot, coordinates or input context. A strict browser parser validates version, enums, UTC instants, spans, counts and array limits, then builds a fresh whitelist object.

The reader presents the persisted event/window detail in keyboard-operable disclosure lists after the temporal summary. It labels the source/version, experimental status, UTC times, truncation and search-grid limitations. Legacy 1.0 results keep their existing timeline. The local-only preview fixture is synthetic and is not editorial approval.

## Local proof

- Isolated PGlite test: 2/2 pass. It exercises 25/13 synthetic records to confirm 24/12 projection and true counts, checks whitelist and owner isolation, then applies the tested forward fix to restore the former reader. The unreleased gate and legacy branch remain covered.
- Full web unit suite: 71 files/1,447 tests pass. Svelte check: 0 errors/0 warnings. Focused lint passed.
- Playwright at 390 px and 320 px: 2/2 pass, including keyboard disclosure, reload and no horizontal overflow. Visual inspection of the 320 px screenshot found readable UTC timestamps, both lists and limits without clipping. Captures: `apps/web/test-results/tests-week-reading-reader.-a1fc7-nd-keyboard-readable-at-320-chromium/week-temporal-detail-320.png` and corresponding 390 px capture.
- Previous WU190 GitHub CI: SHA `cd5a5927b54c417df9ae1aaa50ee2a09d828cb9a`, run `36602591918`, success.

## Acceptance limits

E1/E3/E4 remain **EM_EXECUCAO**; E2/E5 remain **PENDENTE**. The current editorial policy rejects 1.2.0, so this projection has no legitimately approved hosted example. The test grafts 1.2 synthetic data onto a valid isolated local receipt solely to prove transport and redaction; it does not establish editorial promotion or engine homologation. No Supabase deployment or hosted release is claimed. Recorded external owner actions remain in force. Next: address the first remaining product-specific interpretation/approval requirement while preserving the release gates.
