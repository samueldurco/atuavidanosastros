# Semana — private reader and seven-sample timeline

WU183 implements a partial E3/E4 reader for `week-reading`, using the existing private `ProductRunReader`, SQL publication, history and Library. WU185 extends this reader with an area summary. Current delivery version is `atv-product-delivery/1.18.0`; the experimental calculation remains `atv-week-reading-calculation/1.0.0`. No migration, release flag, runtime registration or approval authority is added.

## Preserved content

The original snapshot must pass Week preparation before its trusted editorial profile is selected. The generic free output budget must not reject or truncate the eight valid Week hypotheses. Preparation remains captured before asynchronous review. The delivery contains:

- An interval fact group, ten shared natal facts, seven groups of eleven sample facts and optional reported context, in original order.
- One natal hypothesis and seven dated sample hypotheses, with the original text and references.
- Three editorial area syntheses and one general synthesis with three practical questions, plus every literal calculation/editorial limit. All four preserve the eight ordered hypothesis references; missing context is explicit.

Current deliveries contain 88 facts/21 sections without context and 89 facts/22 sections with context. Legacy deliveries keep their original 18/19 sections. Only Week joins the existing specific source-length allowlist at 300 characters; the generic source budget and the 100-reference section bound remain unchanged. Labels explain shared natal positions, sample number, noon UTC, interval and reported context while retaining the persisted fact identifier.

## Timeline projection

The timeline is a view of the released persisted calculation and editorial sections. It does not calculate astrology or assert factual completeness. It requires the exact supported calculation version, unique 88/89 fact identifiers, ten natal positions, valid context provenance and seven consecutive canonical dates at 12:00 UTC. Every sample has its eleven calculated facts and versioned provenance. The interval must match the first and seventh dates literally.

Each date links to one uniquely identified `week-day-N` hypothesis containing that date and exactly the interval, shared natal facts, its own sample facts and optional context. Duplicate, missing, foreign or exchanged references suppress the timeline. Invalid dates, altered range/source and unknown versions also suppress it; the preserved reading and base remain available with an explicit presentation notice. This is defensive rendering, not a replacement for the worker's original snapshot validation.

Seven ordered cards use semantic `time`, keyboard-operable links and existing reader chapter anchors. Dates use UTC; copy states that samples do not represent complete local days, forecasts or favorable windows. Mobile links retain a sample-specific accessible name.

## Privacy, persistence and limits

The existing reader requires authentication and ownership and reevaluates release/entitlement/editorial authority. Unreleased states contain neither private calculation nor editorial payload; the timeline is absent. Reloading retrieves the same history and preserved evidence. Existing artifact, recovery and email gates remain intact. Local rendering specimens keep downloads disabled.

The SQL test uses an isolated PostgreSQL/WASM database, synthetic identities and a database-owner-created receipt. It proves full-content transport, private recovery, a single Library item and revocation redaction through the existing publisher/reader. It does not certify hosted JWT/PostgREST, independent concurrent connections, engine homologation, model/content approval or an external migration.

The original product requires a web timeline, area summary and PDF. WU183 covers the seven-sample timeline and private reading. WU184 adds the PDF through the existing private artifact renderer and persistence, preserving every section, fact, reference, source, limit and version-history entry. The renderer remains `atv-pdf-export/1.2.0`; no new renderer version or release authority is introduced.

The additive migration `20260929130000_week_reading_pdf_artifacts.sql` allows Week PDF persistence under the existing owner, revision, review-digest, receipt, policy, release, byte/hash and quota controls. Its forward-fix `disable_week_reading_pdf_artifacts.sql` restores the preceding write allowlist. Existing immutable PDF reads remain authorized independently; new persistence is denied after the forward-fix, and reapplication restores idempotent writes. Both paths are tested in local PGlite with synthetic authority.

WU185 adds three keyboard-operable area links to the original preserved summaries, without duplicating or reconstructing editorial content. Exact labels, ordered claim prefix, nonempty text and unique references to all 88/89 persisted facts are required. Missing or ambiguous areas suppress only this navigation; the reading and valid timeline remain available. Legacy deliveries are never rewritten.

Full temporal scope, engine homologation, legitimate editorial approval and hosted acceptance remain pending. No E2/E5 or hosted release is concluded from synthetic content. Evidence: [WEEK_READING_READER_2026-09-29.md](../qa/WEEK_READING_READER_2026-09-29.md), [WEEK_READING_PDF_2026-09-29.md](../qa/WEEK_READING_PDF_2026-09-29.md).

WU185 evidence: [WEEK_READING_AREAS_2026-09-29.md](../qa/WEEK_READING_AREAS_2026-09-29.md).

## Experimental temporal projection (WU190)

The private reader and existing PDF renderer can display the persisted `atv-week-reading-calculation/1.2.0` projection after the ordinary released/editorial gate. This is a version-specific factual presentation, not a new release path. It requires the exact eleven calculated facts: one summary and ten bodies in canonical order, with one shared source ending in the calculation version. The web result displays the recorded summary and per-body nominal counts, with an explicit warning that the hourly grid does not certify continuous coverage, engine precision or favorable periods. PDF adds the versioned summary and warning; its existing base section presents each body count, source, fact and limit once. The 1.0.0 seven-sample timeline remains unchanged and is never inferred from 1.2.0 data.

WU191 adds a bounded private detail view of event endpoints and candidate windows from `calculation.data`, with keyboard-operable disclosure, UTC labels and explicit uncertainty. This does not certify continuous occupancy, favorable periods, engine accuracy or a complete interpretive timeline. WU192 adds a [bounded editorial profile](week-temporal-editorial.md) and review candidate projection for the 1.2.0 fact envelope. A legitimately released result still requires independent editorial approval and the existing release gates; synthetic fixtures confer no authority. Evidence: [WEEK_TEMPORAL_READER_2026-09-29.md](../qa/WEEK_TEMPORAL_READER_2026-09-29.md), [WEEK_TEMPORAL_DETAIL_2026-09-29.md](../qa/WEEK_TEMPORAL_DETAIL_2026-09-29.md).
