# WU-092 — manutenção limitada de acessos expirados

RUN_ID `ATV-20260902-170644Z-01A0630F`. Testes exclusivamente locais e sintéticos; nenhuma purga ou migração hospedada, scheduler, credencial, modelo, chamada paga ou ativação.

- Migração substitui purge global por um lote de até 500 eventos expirados, preservando assinatura service-only. Porta interna default-off, uma tentativa e deadline local de 10 s, recibo fechado e erro sanitizado. Forward-fix revoga manutenção/seleção, preservando controles próprios.
- **23 focais/2 arquivos PASS**, incluindo 20 testes unitários e 3 integrações PGlite → porta interna (`test-results/wu092-focal.log`). Timeout com transporte que ignora abort, limpeza de timer, resultados inválidos, resposta perdida após commit real sem drenar o lote seguinte, permissões e default-off.
- **13 DB focais PASS** (`wu092-db-focal.log`): 1.203 expirados em lotes 500/500/203/0, ordem, preservação de vigentes/consentimentos/notas, cascata dos itens, falha após DELETE com rollback integral, service-only e forward-fix. **96 DB totais PASS** (`wu092-db.log`).
- **974 web/49 arquivos PASS** (`wu092-web.log`), incluindo arquivos concorrentes não integrantes deste commit. Svelte-check **0 erros/0 avisos** (`wu092-check.log`). Prettier/ESLint dos três arquivos TS próprios PASS (`wu092-lint.log`); lint global não alegado.
- Sem alteração visual: Gate B não reavaliado; E2E da WU091 não é evidência nova desta unidade. Seu CI em `824b09f36771a454bf83149bbe271fa48a6108e1` foi confirmado: quality `108992514853`, secrets `108992514334`, Pages `108993251257`, todos completed/success.

Limites: PGlite single-connection não certifica contenção/SKIP LOCKED entre conexões; tempo local de espera não cancela necessariamente SQL; limite é de eventos pais, não custo/tempo absoluto; zero removidos não atesta backlog vazio. Ainda faltam prazo de produção, executor hospedado autorizado, SLA/alertas, descarte de derivados e revalidação na fronteira de uso. Policy default-off e retenção NULL preservadas.
