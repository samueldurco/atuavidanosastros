# WU-034 — Product calculation / Editorial Director evidence

RUN_ID: ATV-20260902-170644Z-01A0630F. Contract: `atv-product-editorial-evidence/1.0.0`.

## Implemented

The portable worker now connects validated persisted calculations to the existing Lab facts/schema/Director contracts. Six workflow kinds map to their corresponding capabilities. All eight existing calculators were exercised. Facts retain exact IDs, kinds, text and source; raw inputs, calculation data blobs and history are not copied into the facts envelope. Envelopes are partial, not an assertion of complete interpretation or engine approval.

The adapter refuses evidence outside the stricter Lab bounds (40 facts, 1200-character display, 160-character source, 64-character identifier). It never truncates, splits or relabels a fact. Long dream narrative chunks can therefore remain blocked pending a separately versioned factor-selection contract. This is a known product gap, not an approved fallback.

Offline draft assessment binds a review to the run UUID, revision, product, tier, full calculation/provenance/limits, projected facts, reading and active constitution/prompt/schema/rubric version labels. A canonical SHA-256 basis ignores object-key order but preserves arrays and values. The existing Director additionally checks the SHA-256 of the parsed reading serialized as JSON. Text, fact source, provenance, limit or revision changes invalidate the review. Fields are copied before asynchronous hashing to avoid request-mutation races.

Server-owned reviewer and calibration allowlists default to empty. Mechanical/schema rejection precedes scores; missing, unauthorized, stale, uncalibrated or insufficient reviews cannot become reviewed candidates. No output from this module is READY or published: even a synthetically passing review returns `reviewed_candidate`, `publication: blocked`, `promotion_required`. Synthetic scores test control logic; they are not human calibration or a model eval result.

## Verification

- Seven new worker tests: eight real calculators, exact/isolation/partial projection, oversized facts, missing basis, digest compatibility, review replay across all bound fields, stable canonical ordering, mutation race, authorization/calibration/thresholds, schema/mechanical refusal, production/personal-data gateway refusal with zero provider calls.
- One new PostgreSQL test uses the real local migration chain, requests and persists a real Tarot calculation, reaches AWAITING_EDITORIAL, assesses a synthetic draft and proves unchanged durable state, hidden unpublished content, cross-owner isolation and an empty promotion table.
- Worker type check, full monorepo unit suite (104 tests), local PostgreSQL suite (19 tests), lint and build: see `test-results/wu034-*.log`.
- Previous SHA `0d779b9cf1b3c974ee3d296d4d62dbce115da53b`: GitHub quality/secrets and Cloudflare Pages observed completed/success.

## Limits and next gates

This module is an internal offline assessment bridge, not a public API or authentication/signature verifier. It requires trusted persisted calculations and authenticated review records at its future calling boundary. It does not bind actual provider provenance or artifact hashes; those remain release-evidence requirements of the existing promotion policy. No candidate persistence, editorial lease, generator invocation, model promotion, paid operation, hosted migration or runtime activation was added. Personal content must not be used in the synthetic Lab. All production release gates remain closed.

OpenAI Docs informed the use of task-specific, repeatable checks alongside separately calibrated editorial judgment, rather than treating a mechanical score as quality evidence. Reference: [Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices). This work does not adopt an OpenAI model or call its API.
