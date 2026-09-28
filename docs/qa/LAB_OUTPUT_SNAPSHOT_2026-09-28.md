# WU076 — one output snapshot per evaluation

RUN_ID: ATV-20260902-170644Z-01A0630F

Benchmark and promotion policies advance to 1.2.0. Previously an undefined/cyclic/BigInt output could crash the benchmark during hashing after schema rejection; multiple serializations could also observe different `toJSON` representations. The evaluator now serializes once and parses an immutable JSON snapshot. Schema, mechanical review, character count and digest describe that same snapshot. Serialization failure yields a rejected report with null digest/size, without raw exception text. Promotion explicitly rejects missing digests.

Historical digest semantics are retained: hash `JSON.stringify(sample.output)` for valid JSON objects and JSON strings; they are deliberately not collapsed into one canonical representation.

## Verification

- AI TypeScript PASS (`test-results/wu076-check.log`).
- 26/26 AI tests PASS (`test-results/wu076-unit.log`). Added undefined/function/symbol/BigInt/cycle/throwing serialization; malformed JSON string; changing `toJSON`; stable object/string digests; rejection of previously valid reviews for unserializable output.
- Offline replay of all 20 historical samples preserved digest, schema/mechanical result and character count exactly relative to WU075 (`test-results/wu076-benchmark.json`). Original artifacts untouched.
- WU074 repair commit `648f421`: quality108917464805, secrets108917464308 and Pages108917839730 completed/success.

This verifies reporting and gate behavior, not model quality. No model/prompt homologation, external inference, paid use, hosted migration, production release or automatic retry. The official eval guidance cited in WU075 continues to inform scoped failure tests, not a hosted service integration.
