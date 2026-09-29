# Week temporal reader and PDF — local evidence

RUN_ID `ATV-20260902-170644Z-01A0630F`; WU190; product `week-reading`, E4 partial. Synthetic/local data, R$0, release flags and approval authority unchanged.

## Delivered

The private Week reader recognizes only the ordered eleven-fact `atv-week-reading-calculation/1.2.0` projection with calculated kind and shared versioned source. It presents the persisted summary and per-body nominal counts as experimental, with the hourly-grid limitation. The existing PDF renderer adds the same versioned summary and limitation; its base section lists each body count and source once. The legacy seven-sample timeline remains restricted to 1.0.0. Incomplete or mismatched 1.2.0 facts suppress the special presentation, while the stored reading and base remain accessible through the ordinary release gate. Unreleased content is redacted by the existing private parser.

## Local proof

- The focused reader/PDF suites: 14/14 pass, including 1.2.0 transport, canonical fact order, malformed/source/version/unreleased suppression, deterministic PDF, and unchanged 1.0.0 timeline. Full web unit suite: **71 files/1,446 tests pass**. Svelte check: 0 errors/0 warnings. Targeted ESLint and Prettier pass.
- Synthetic PDF generated at `test-results/pdf/atv-week-temporal-synthetic.pdf`: A4, three pages, 19,018 bytes. Poppler rendered pages 1–2 to `test-results/pdf/atv-week-temporal-page-1.png` and `...-2.png`; visual inspection found readable typography, section hierarchy and no clipping or overlap. The example editorial text is synthetic and has no promotion authority.
- Previous WU189 GitHub CI succeeded: SHA `a0d62354926979343a0b9e7e24eab525e0fdc59e`, run `36600366242`.

## Acceptance limits

E1/E3/E4 remain **EM_EXECUCAO**, E2/E5 **PENDENTE**. This presents only summary/body facts; the private view does not expose persisted event endpoints or candidate windows. No complete temporal reading, engine homologation, legitimate editorial approval or hosted release is claimed. The current editorial policy rejects 1.2.0, so a real released 1.2.0 result cannot yet reach this branch. The synthetic fixture tests rendering, not approval. Supabase pause and Cloudflare 403 retain their recorded owner/actions. Next product requirement: expose bounded persisted event/window detail privately for the temporal result, then complete the approved interpretation and QA without bypassing gates.
