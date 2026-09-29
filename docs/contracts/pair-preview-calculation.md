# Preview do Par — partial calculation contract

`pair-preview` uses `atv-context-product-calculation/1.0.0`. The input and consent boundary remains [pair-product-requests.md](pair-product-requests.md): owner data comes from the current complete consented profile; partner data is captured for this private run with a recorded permission declaration. The HTTP bridge accepts no personal context, inferred relationship, identity verification or sharing grant. Both civil inputs must pass validation before provider work.

The experimental engine projects only Moon, Venus and Mars for each person. `first` has role `person-a`, `second` has role `person-b`; each contains exactly three ordered positions and its own provenance. The six facts are ordered A Moon/Venus/Mars, then B Moon/Venus/Mars. Each exact ID, calculated kind, display and source must agree with the corresponding position. A and B can have different UTC instants and fixed-offset or IANA timezone provenance. Both projections use the same provider, version, adapter and data manifest, with the existing experimental engine contract and UTC ≈ UT1 limitations.

WU153 introduces `validPairPreviewProjection` and preparation `atv-product-editorial-evidence/1.26.0`. Validation inspects the original persisted snapshot, including keys that generic normalization could omit. The snapshot, data, side, position, temporal and fact shapes are closed; position values and canonical instants are finite and within engine bounds; the approximate Julian day agrees with UTC; warnings and the four original limitations remain in order. Divergence blocks preparation with `calculation_invalid`.

No date sample, target date, aspect, event, house or angle is present. `sampleInstant`, `targetDate` and `compatibilityScore` remain null, aspects/events empty, and sharing `not-authorized`. These are separate positions, without calculated compatibility, feelings, gender or relationship destiny. Recorded consent does not establish bilateral identity or authorize sharing.

The generic workflow calculator can retain its existing optional `personal-context` fact as reported, with source `input.context`, at most 1200 UTF-16 units and valid Unicode text. That capability does not add context to the pair HTTP input. It never changes the geometry, becomes a calculated fact or authorizes sharing.

This guard proves internal coherence of a persisted partial snapshot; it does not authenticate its origin, recalculate it, homologate the engine, approve interpretation or establish a legitimate hosted session. E1 remains incomplete for the full product until applicable calculation/reference and input/consent requirements are accepted. E2–E5 still require useful approved interpretation, legitimate authority, private persisted delivery and hosted acceptance. Publication gates remain closed and automatic spend stays R$0.

Local proof: [PAIR_PREVIEW_BASE_2026-09-29.md](../qa/PAIR_PREVIEW_BASE_2026-09-29.md).
