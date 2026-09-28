# WU-093 — prazo da seleção privada

RUN_ID `ATV-20260902-170644Z-01A0630F`. Sem executor, provider, nova rota, migração ou ativação.

- `prepareStoredContinuity` limita a espera pelo transporte a 10s mesmo quando ele ignora abort; limpa timer, sanitiza falhas e não repete a seleção. Resultado tardio não é entregue.
- **24 focais/2 arquivos PASS** (`test-results/wu093-focal.log`): 12 de deadline/default-off/entrada inválida/saídas antecipadas e 12 integrações SQL → servidor → domínio. Resposta perdida após commit deixa um único evento de auditoria; nova leitura após revogação falha fechada.
- **987 web/50 arquivos PASS** (`wu093-web.log`). A correção posterior da tabela parametrizada de entradas inválidas foi revalidada nos 24 focais. Regressão inclui arquivos concorrentes fora do commit.
- Svelte-check inicialmente encontrou dois erros na tabela parametrizada; corrigida para objetos contendo arrays. Reexecução: **0 erros/0 avisos** (`wu093-check.log`). Prettier/ESLint dos três TS próprios PASS (`wu093-lint.log`); lint global não alegado. Primeira tentativa de prettier na raiz não encontrou o binário; executado corretamente no pacote web.
- WU092 `8fed657a8155fac37dac4bbc90ba00cff8056806`: quality `108997348726`, secrets `108997349150`, Pages `108997753193` completed/success.

Limite de espera não cancela necessariamente SQL nem limita processamento síncrono. Auditoria pode existir mesmo quando a preparação retorna indisponível. Nenhuma autorização posterior decorre do snapshot; revalidação no limite de uso permanece pendente. Sem UI alterada ou novo Gate B; default-off, retenção NULL e nenhum modelo homologado preservados.
