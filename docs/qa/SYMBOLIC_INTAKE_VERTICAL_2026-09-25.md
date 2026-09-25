# Integração vertical da entrada simbólica — WU-057

RUN_ID: ATV-20260902-170644Z-01A0630F. Data: 2026-09-25.

## Prova local

Vinte cenários parametrizados ligam o `FormData` dos quatro produtos (Carta do Dia, Três Perguntas, Leitura Essencial de Sonhos e Registro de Sonhos) ao parser real, controlador recuperável, handlers HTTP, RPCs/migrações PostgreSQL via PGlite, runtime de cálculo e leitor da Biblioteca. Não são criadas promoções, recibos editoriais ou respostas READY fictícias.

- Entrada e consentimentos preservados; uma execução, um item da Biblioteca e três eventos após QUEUED → CALCULATED → AWAITING_EDITORIAL.
- Cálculo persistido igual ao calculador real versionado. Tarot vincula o sorteio ao UUID do servidor. Sonhos mantém relato, associações e emoções informadas, sem inferência ou consulta de histórico.
- Biblioteca recupera o estado e histórico próprios, mas não expõe input, cálculo ou editorial antes de liberação. Downloads permanecem 404. Publisher selecionado não publica sem recibo; processor/publisher padrão não fazem RPC.
- Resposta perdida após commit: recarga consulta a mesma chave, inclusive após cálculo e revogação do release; nenhuma segunda escrita/evento/sorteio. Storage contém somente UUID, com escopo conta/produto.
- Outra conta não recupera chave, execução, Biblioteca ou downloads. Argumento de proprietário falsificado no leitor não contorna RLS.
- Release fechado e entitlement ausente recusam formulário obsoleto antes de qualquer escrita, limpando somente a chave da tentativa conhecida.
- Reprocessamento explícito cria execução filha e mantém o original. Tarot copia o cálculo/sorteio; Sonhos recalcula os mesmos fatos a partir da entrada imutável. Ambos voltam à espera editorial.

## Validação e limites

Suíte web: **353 testes / 27 arquivos PASS**, incluindo 20 novos (`test-results/wu057-web.log`). Check: zero erros e avisos; ESLint/Prettier focais PASS (`wu057-check.log`, `wu057-lint.log`, `wu057-format.log`). Os primeiros testes expuseram expectativas incorretas na fixture (spy compartilhado, nome do produto confundido com campo privado e congelamento de Sonhos); foram corrigidas conforme contrato, sem modificar produção. Uma anotação de tipo da resposta de teste também foi corrigida.

Somente teste/documentação alterados nesta WU. Não há mudança visual/runtime que exija repetir os 32 E2E/build aprovados na WU-056. O aviso de 24 exclusões descartadas de `_routes.json` continua aberto.

PGlite usa uma conexão e claims sintéticos; o adaptador Supabase e a fronteira de rede são locais. Não certifica JWT/PostgREST hospedado, concorrência entre conexões, qualidade editorial, precisão do motor, entrega de interpretação ou os 25 produtos completos. Os testes de navegador da WU-056 continuam interceptando HTTP; esta suíte complementa, não substitui, essa evidência.

Nenhuma migração hospedada, promoção, chamada paga, scheduler ou gate ativado. Todos os releases/policies produtivos seguem fechados. Nenhum modelo homologado.
