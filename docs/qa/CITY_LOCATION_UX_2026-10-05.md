# City location UX — 2026-10-05

RUN_ID: ATV-20260902-170644Z-01A0630F. Scope: CITY-LOCATION-UX-20261005.

## User outcome and coverage

City search replaces manual geographic latitude, longitude, IANA zone and UTC offset entry in Career Compass, natal onboarding and every product using NatalIntake or PartnerBirthFields. Solar Return and Week reading also search the destination/current city. Selecting a result resolves internal coordinates and the IANA zone; birth date/time determines the historical UTC instant automatically. Editing a city invalidates the previous selection and relevant consent. Saved profiles remain compatible. Astrological angular coordinates in reading outputs retain their meaning.

The shared combobox supports accents, aliases, non-Latin names, state/country disambiguation, keyboard selection, loading, empty and retry states. Layout verified at 390px. Nonexistent civil times are rejected; repeated daylight-saving times require a human-readable first/second occurrence choice. The Solar Return year HTML pattern was corrected after a real browser submission exposed its interpolation error.

## Dataset and privacy

Self-hosted GeoNames cities500 snapshot: 235970 cities, 1024 shards, 78275573 JSON bytes, largest shard 2099215 bytes. Static locations are excluded from the Cloudflare worker. GeoNames CC BY 4.0 attribution is present in the search UI and dataset README. Generator and manifest retain transformation and source hashes.

- cities500 archive SHA-256: 75f912ddb8d04f9d3d053523b2878ee7c3cb161a3b6884469ea059636b37b37c
- admin1 source SHA-256: 1da92a6323a5fec3176f3f743bf4cf4040fd56a876da55e46fbca23c863aa60a

Search requests fetch a same-origin shard key, without sending the entered city, birth date or birth time to an external geocoder. Coverage includes cities above 500 inhabitants and administrative seats; small villages may be absent. Search offers canonical dataset names, sometimes in another language. Regeneration downloads current upstream data; the checked-in snapshot is versioned and its hashes are recorded.

Historical conversion uses runtime Intl/IANA data and supports the engine's 1900–2099 civil date contract. Tests cover Brazilian daylight saving, quarter-hour offsets, New York and Lord Howe gaps/folds, and Paris historical second offsets. Runtime timezone database version is not pinned or independently certified; passing cases are not a claim of universal historical certification. No AI calculates charts or locations.

## Validation evidence

Evidence logs retained at E:/ATVNA/app/test-results/ (local, ignored).

- Focused city/natal/partner unit tests: 56/56 PASS, also on the isolated branch (city-isolated-unit.log).
- Original checkout full web suite: 1609/1610 PASS on first run; the PDF recovery test exceeded its timeout and passed on focused retry (city-pdf-retry.log). This checkout contains concurrent changes and is not treated as exact-branch evidence.
- Browser regression: 69 unique scenarios verified, covering the new city flow and onboarding, partner, synastry, couple dossier and week flows. The final Solar Return scenario passed after fixing the year pattern (city-e2e-final.log, city-e2e-city-final.log, city-solar-final.log).
- Isolated branch: global web Prettier and ESLint PASS (city-isolated-lint.log); svelte-check 0 errors/0 warnings (city-isolated-svelte.log). Wrangler type check initially rejected CRLF headers on Windows; normalizing checkout line endings restores byte-compatible header comparison without changing the generated tracked types.
- Rebased isolated branch on main a2163e7: check 0 errors/0 warnings, global web lint and 56/56 unit tests PASS; new city browser scenarios 5/5 PASS, including the build (city-exact-*.log).
- Initial CI37346738900 exposed one stale Gate B test still filling removed Latitude/Longitude inputs; updated it to select a city. The other 44 accessibility scenarios passed. City browser regressions are now included in the CI accessibility job. Final CI and shared browser regression results are recorded in the canonical execution log and its evidence directory.

No deployment, product/model approval, paid service, gate promotion or production data change. Existing R$0 and product release gates remain intact. Integration and hosted verification are separate from local implementation.
