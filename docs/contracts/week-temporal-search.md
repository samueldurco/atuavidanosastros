# Week nominal temporal search

`searchWeekTransits` implements `atv-week-temporal-search/1.0.0`. This product-specific experimental primitive is not a `CalculationSnapshot`, approved policy, default calculator or runtime registration. Week bases 1.0.0/1.1.0 remain unchanged. Coherence cannot authenticate a provider or bind a reading to a request.

## Inputs and period

The caller supplies a valid date, ten unique natal longitudes, an explicit versioned aspect policy, an asynchronous evaluator for ten transit longitudes and an abort signal. Original exact descriptors and dense ordinary arrays reject hidden/symbol/accessor/extra metadata, unsupported prototypes, duplicate/missing bodies, invalid/nonfinite numbers and overlapping rules. Natal and policy copies are captured before awaiting; evaluator arrays before reuse. The caller must validate charts, establish compatible tropical frame/provider identity and retain source provenance separately. Only geometric positions enter this primitive.

Observe 169 hourly instants from 00:00 UTC on the selected date through the closing 00:00 UTC seven days later. That endpoint is an observation boundary, not an eighth product day or coverage of declared local civil days. All seven dates and the closing engine-supported date must be valid. Start 2099-12-25 fails before evaluation; 2099-12-24 is supported. Date-only input does not relocate houses.

## Nominal events and candidates

Evaluate all 100 ordered transit-first/natal-second pairs, including same-body pairs, using the caller's exact conjunction/sextile/square/trine/opposition rules and inclusive orbs. Preserve tropical epochs without a common-epoch transform. Unwrap the shortest signed phase step in each cell; an exactly 180-degree tie chooses the negative step. Exact thresholds have one phase branch at 0/180 degrees and two otherwise. Orb thresholds exclude clipped 0/180 edges, which cannot separate inside from outside; zero orb has no orb thresholds.

Refine strict phase sign changes by evaluator calls and bisection, with no linear interpolation, epsilon or display rounding. Each `bracketed-crossing` retains observed endpoint times/separations in an interval at most 60,000 ms wide, or one nominal exact evaluated point. `phaseDirection` describes signed bracket change only, never applying/separating motion or certified speed. Record original grid contacts once; consecutive contacts coalesce into `grid-contact-run` with first/last grid times/count. A long contact run is not a root bracket or continuous-occupancy proof.

For a positive orb, collect each cell's in-orb endpoints and observed orb-crossing brackets. Their enclosing interval is a candidate; merge touching intervals per pair/rule. This detects narrow passages through both orb edges when both grid endpoints are outside. Report period clipping. Zero orb yields contacts/roots but no positive-duration windows. Candidates do not establish favorability, ranking, intensity or uninterrupted occupancy.

## Coverage, budgets and persistence

Hourly endpoints and shortest-arc assumptions can miss reversals, tangencies, multiple turns and short excursions inside a cell. There is no certified derivative/longitude-error bound or complete-event proof; stability is unknown and accuracy uncertified. Tests deliberately demonstrate a missed tangency and a full intra-hour turn. Bracket resolution is not a celestial error bound.

Limits are 2,048 distinct evaluations, 4,096 events and 2,048 candidates. Overflow throws an explicit error without partial output or truncation. Cache is request-local. Check abort before/after evaluations, at rule boundaries and before output; this fences asynchronous output, not synchronous CPU/provider cancellation. Provider failures and invalid output have no fallback geometry.

The output retains every evaluated longitude observation for local audit and is **not a persisted snapshot**. The measured smoke search is 373,085 bytes. Integration requires a separately versioned bounded projection with the 169 grid observations, final bracket endpoints and necessary provenance; verify events/windows before persistence and reject excess size without increasing the existing 200,000-byte bound or dropping geometric evidence. Integration, editorial adaptation, engine/policy approval, reader/PDF adaptation and hosted acceptance remain pending.
