# WU-090 — API privada dos acessos à continuidade

RUN_ID: ATV-20260902-170644Z-01A0630F. Dados sintéticos locais, sem migração hospedada, modelo homologado, gasto ou ativação.

## Entrega e evidência

- POST `access` e `clear-access`: sessão verificada, mesma origem, corpo vazio estrito, RPC sem proprietário informado, prazo limitado, erros sanitizados e resposta privada/no-store. Sem rota de purge ou service_role.
- Parser fechado de recibos sem conteúdo: até 1.000 eventos de 12 itens, UUIDs/revisões/datas, duplicatas e consistência de fontes. Limite pós-transporte de 3.145.728 unidades UTF-16; não equivale a limite de rede.
- Focal Vitest: 106 testes/3 arquivos PASS após ajuste das asserções sobre JSON unknown; `test-results/wu090-focal.log`.
- Regressão web: 949 testes/47 arquivos PASS, inclui alterações concorrentes não integrantes deste commit; `test-results/wu090-web-regression.log`.
- `svelte-kit sync` + `svelte-check`: 0 erros/0 avisos, `test-results/wu090-check.log`. Prettier/ESLint dos sete arquivos TypeScript alterados PASS. Lint global não alegado.
- Integração SQL real em PGlite: seleção → consulta HTTP sem conteúdo; isolamento entre proprietários; consulta/limpeza após revogação e desativação; notas preservadas; resposta de limpeza perdida recuperada por consulta; expiração oculta e perfil soft-deleted impedido de consultar, mas autorizado a apagar seus recibos.

## Limites

Sem mudanças SQL ou visuais nesta unidade. A regressão DB de 93 casos pertence à WU089, não foi reexecutada como evidência nova. JWT/PostgREST hospedados, concorrência real e Gate B não certificados. A limpeza tenta uma única escrita: nunca repetir automaticamente, pois novos eventos podem surgir entre tentativas.

WU089 confirmada em d0a9792304cd8393e5084c0ad9a0c4458da68964: quality 108982306761, secrets 108982306464, Pages 108982801483 completed/success. Retenção de produção permanece NULL; policy default-off e ausência de scheduler preservadas. UI de acessos, descarte de derivados e executor permanecem pendentes.
