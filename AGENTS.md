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
- External providers are MCP-only: operate and inspect Stitch, Cloudflare, Supabase, Hotmart, GitHub, Google, analytics, email, DNS and any other connected provider through their dedicated MCP/API/CLI capability. Do not use Browser, Chrome or Computer Use as an operational or verification fallback unless the owner gives a new explicit written exception for that exact action.
- Browser-rendering E2E tests remain limited to the local test suite; they are not a channel for provider administration or remote integration checks.

## Contexto da execução contínua

- Comece a retomada por `node E:/ATVNA/app/scripts/execution-context.mjs resume` e siga `E:/ATVNA/docs/30-execucao/PROTOCOLO_CONTEXTO_CONTINUO.md`.
- Leia somente as seções e arquivos da WU atual; não reimporte o histórico bruto de outras tarefas. Filtre respostas MCP antes de inseri-las no contexto; saída usual de 1000–2000 tokens, até 3000 para diagnóstico focal.
- Atualize o checkpoint curto após cada WU/decisão relevante e prossiga automaticamente à próxima WU autorizada. Compactação e checkpoint não encerram a execução nem dispensam gates.
