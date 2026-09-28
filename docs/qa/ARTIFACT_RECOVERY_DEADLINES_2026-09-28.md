# Prazo efetivo para arquivos guardados

RUN_ID `ATV-20260902-170644Z-01A0630F`. WU-106, 28/09/2026.

## Escopo

Consulta e recuperação de artefatos persistidos passam a ter uma espera efetivamente limitada a30s no cliente, incluindo headers, corpo e digest. O timer anterior na UI apenas sinalizava abort. Agora o cliente rejeita a espera antes de sinalizar abort; destruição da UI também encerra a espera. Limpeza do stream não aguarda `cancel()` e libera o reader lock. Timers/listeners são removidos. Respostas tardias não retornam lista/blob, não geram download nem repetem requisições.

Autorização, revisão, limites de bytes, SHA-256, recibos, same-origin/no-store/redirect-error e estados de recuperação permanecem. A UI mantém mensagem, descarte da lista obsoleta e restauração de foco; nova consulta depende de ação explícita. Nenhum layout, formato, persistência, política ou release mudou. O limite não interrompe CPU síncrona ou garante pontualidade com timers suspensos, nem prova encerramento do transporte remoto. Downloads sob demanda não foram modificados.

## Evidência

- Cliente: **20 PASS**, incluindo14 novos casos de prazo/cancelamento, `test-results/wu106-client.log`.
- Lint final dos quatro arquivos TypeScript/Svelte: PASS, `test-results/wu106-lint-final.log`.
- Web completo: **1157 PASS** em57 arquivos, `test-results/wu106-unit.log`; check:0 erros/0 avisos, `wu106-check.log`. Build local e diff-check PASS.
- E2E inicial: **8 PASS/15 FAIL** (`wu106-e2e.log`), incluindo os dois testes novos aprovados antes da queda do preview local Wrangler. As falhas seguintes incluíram `ERR_CONNECTION_REFUSED`; o log do Wrangler apontou `ProxyController2.onProxyWorkerMessage / castErrorCause`, sem causa-raiz estabelecida.
- Repetição sem mudança no código, um worker: **23 PASS** em2min (`wu106-e2e-retry.log`), cobrindo Biblioteca, arquivos guardados e leitor em320/390/820/1440px. Não apaga a instabilidade inicial nem prova estabilidade do preview sob concorrência.

Casos novos: consulta/arquivo × headers/corpo × timeout/abort externo; cancelamento de stream que nunca termina, headers tardios sem consumo, rejeição tardia tratada, sinal pré-abortado sem rede, orçamento único, digest tardio sem blob, resolução no abort e falha rápida com limpeza. A nova tentativa explícita funciona com recibos/bytes válidos. E2E adicionais usam transporte sintético que ignora abort para verificar prazo, foco, retry explícito e ausência de download tardio.

CI anterior WU-105 `22edd18a9001073f305bb81e3d7d14ad70b662f1`: quality `109060862638`, secrets `109060862824`, Pages `109061566053`, completed/success.

Sem migração hospedada, IA, gasto, scheduler, e-mail, liberação de artefatos ou modelo homologado. Toolchain Wrangler existente usada apenas para build/check/preview local; não é prova de latência de produção ou Gate B integral.
