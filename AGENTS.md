# ATVNA engineering rules

- Preserve the decisions in `docs/adr` and the contracts in `docs/contracts`.
- Never commit secrets, credentials, real personal data, payment payloads or production seeds.
- Keep automatic spend at R$ 0 and paid provider features disabled by default.
- Brand authority is Atlas Essencial v3.0; product extensions live in `docs/DESIGN.md`.
- Astrology calculations are deterministic and versioned. AI never calculates charts, draws cards, prices offers, grants entitlement or decides state.
- Hotmart is the commercial authority; webhooks enter an idempotent inbox before domain transitions.
- Production and local/staging data remain isolated. Seeds are synthetic.
- Physical commerce remains disabled and must not expose fictitious products, prices, inventory or reviews.
- Migrations use expand/contract and require a tested rollback or forward-fix path.
- Append execution evidence to the canonical log outside this repository using the stable RUN_ID.

