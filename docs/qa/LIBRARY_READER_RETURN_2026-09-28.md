# WU-112 — retorno do leitor ao histórico

RUN_ID: ATV-20260902-170644Z-01A0630F. Extensão funcional da Biblioteca, não liberação de produtos/modelos.

## Entrega

- Card da página histórica inclui apenas `fromBefore=<UUID>`. Primeira página mantém os links anteriores.
- Carregamento privado valida parâmetro único e normaliza UUID; leitor de fluxo e Bússola recebem cursor como metadado de navegação, não como autorização.
- Breadcrumb, botão de volta e destino após exclusão confirmada apontam à página de origem. Endereço externo, cursor inválido ou repetido cai na primeira página.
- HTML sem JavaScript e recarga mantêm o retorno. Não preserva filtros/scroll/snapshot; fronteira removida continua expirada. Reprocessamento mantém sua recuperação anterior.

## Verificações locais

- 61 testes focais PASS (12 helpers, 9 carregamento privado, 40 regressões de lista/leitor).
- Suíte web: 1.227 testes / 61 arquivos PASS (`test-results/wu112-web-tests.log`).
- Check Svelte/TypeScript: zero erros/avisos (`wu112-check-final.log`). Prettier e ESLint dos 11 arquivos da mudança PASS (`wu112-format.log`, `wu112-eslint.log`); diff check PASS. Lint global não reivindicado: alterações concorrentes permanecem fora da WU.
- Build pelo Playwright PASS. Rodada de 31 cenários: 30 PASS, uma falha de redirecionamento sem sessão no teste preexistente; repetição isolada do mesmo teste PASS sem mudar código (`wu112-e2e.log`, `wu112-isolated.log`). A falha inicial não foi apagada nem reclassificada como aprovação integral da primeira rodada; causa de intermitência não comprovada.
- Os 7 novos cenários passaram: links dos cards, os dois leitores com recarga/teclado, query inválida/repetida e HTML sem JavaScript. Destino de retorno interceptado/abortado apenas para observar o cursor, sem simular sessão ou banco remoto. Testes unitários verificam usuário e 404 com leitor mockado; não são prova de RLS/JWT implantado.
- Regressão de leitores e paginação em 1440/820/390/320 px; captura do leitor de Bússola a 320 px inspecionada, sem redesenho. Exclusão continua indisponível nas fixtures sintéticas: o destino foi alterado no ramo existente confirmado, mas nenhuma exclusão real/fluxo destrutivo foi exercitado no navegador nesta WU. Não certifica Gate B integral.

Sem migrações, novas consultas, scheduler, e-mail, chamadas de modelo, gasto ou promoção. 13 bases parciais / 12 cálculos indisponíveis; nenhum modelo homologado. Políticas default-off preservadas.
