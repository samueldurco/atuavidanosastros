# WU-091 — consulta e limpeza de acessos na Biblioteca

RUN_ID `ATV-20260902-170644Z-01A0630F`. Dados sintéticos locais; sem migração hospedada, modelo homologado, gasto ou ativação ATV+.

- 47 testes focais/2 arquivos PASS (`test-results/wu091-focal.log`); regressão web **951 testes/47 arquivos PASS** (`wu091-web.log`). Inclui arquivos concorrentes preservados, fora deste commit.
- Svelte-check **0 erros/0 avisos** (`wu091-check.log`); Prettier/ESLint dos sete arquivos TS/Svelte alterados PASS. Lint global não alegado.
- Primeira rodada: 33 PASS/2 falhas mobile por aviso de cookies interceptando cliques. Fixture corrigida para recusar analytics pelo botão real, sem clique forçado. Rodada final: **35 Chromium PASS** (`wu091-e2e-final.log`), incluindo 16 testes de acessos e 19 regressões de leitor/gestão. Build local incluído.
- Consulta somente explícita, POST vazio, sem conteúdo/IDs na URL ou armazenamento local; ocultação/recarga, paginação 25 e expansão local; schema inválido e falha de consulta bloqueiam limpeza.
- Confirmação de escopo destrutivo, Escape/foco contido/restaurado; vazio permite descartar expirados. Resposta perdida, recibo inválido e HTTP 401/403/503 não repetem escrita. Falha na releitura exige recuperação. Novos eventos após limpeza continuam visíveis.
- Reflow/landmark/alvos 44px em 1440/820/390/320, reduced-motion. Revisão direta dos PNGs de 1440 e 320, incluindo diálogo 320: conteúdo e ações legíveis, sem corte horizontal. Capturas em `apps/web/test-results/tests-continuity-access.e2e.ts-acessos-composição-<largura>-chromium/access[-dialog]-<largura>.png`.

MEM-02 (`f5af4d1cdd4542488d60e94fa2c9bafb`), SH-02 (`7d41b4e1322349109a91363bb7c2df2b`), CMP-02 (`7e5a59578fce4c48853a139940e07418`), projeto Stitch `2141801333950500965`. Extensão funcional Atlas 3.1; Gate B integral/paridade visual permanece parcial. Fixture não certifica JWT/PostgREST hospedados, zoom nativo 400% ou leitor de tela humano. Evidência SQL/HTTP separada na WU-090. Retenção NULL, manutenção física operacional, descarte de derivados e executor continuam pendentes.
