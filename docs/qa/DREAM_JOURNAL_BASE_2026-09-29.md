# Registro de sonho — E1 local / WU144

RUN_ID: `ATV-20260902-170644Z-01A0630F`. Produto `dream-journal`, rota `/registro-de-sonho`, catálogo web.

O diagnóstico reproduziu uma lacuna: `prepareProductFacts` aceitava uma emoção diferente da informada e `historyLoaded=true` no mesmo registro (`test-results/wu144-baseline.json`). O formato genérico dos fatos não verificava fidelidade ao relato salvo.

A verificação específica agora compara a projeção com o parser/calculador reais, preservando integralmente relato, data, emoções, associações, contexto e continuidade declarada. Rejeita divergência de texto/fonte/ordem/cardinalidade, campos inesperados, entrada inválida, histórico/recorrência consultados, hipótese simbólica e limites/versão/estado incorretos. Inspeção é pura; não muda o snapshot, infere conteúdo ou chama provedores. A revisão do preparo para 1.20.0 vincula essa regra à evidência; os 105 casos e seus fingerprints factuais permanecem iguais no corpus 1.20.0.

Quatro testes novos cobrem registros com/sem contexto/listas, continuidade consentida sem consulta, 22 alterações inválidas, relato longo com emoji na fronteira de trechos e a base independente de Leitura Essencial. A primeira rodada identificou um erro de tipagem no comparador e a normalização genérica que retirava metadata adicional dos fatos. Comparação de campos explícitos e inspeção anterior à normalização corrigiram os dois casos.

Entrada, armazenamento consentido, recuperação e privacidade reutilizam as provas WU056/057: FormData → parser → controlador → handlers → SQL/PGlite → cálculo → Biblioteca, com proprietário, gates/entitlement, resposta perdida, recarga e execução filha. Não há revisão fictícia nem READY no teste original da vertical simbólica. As verificações atuais estão em `test-results/wu144-*.log`; resultados finais são registrados no fechamento da WU.

Validação final: worker **115/115**, web **1.247/1.247 em 62 arquivos** (inclui intake/vertical simbólica), scripts de corpus/benchmark/comparação/revisão **63/63**; corpus focal **13/13**, worker check PASS, Svelte check **zero erros e avisos**, Prettier focal PASS. Não foi repetido navegador: não há mudança de interface nesta WU. Diff staged e scanner de segredos são gates de fechamento antes do commit.

Não houve alteração de interface; o QA visual existente da entrada não representa aceite E4 do resultado desse produto. E1 local é distinto de E1 integral; Supabase pausado impede a sessão/percurso hospedados. Conteúdo/modelo/prompt/revisão legítimos continuam requisitos para E2 e aceites dependentes. Todos os releases permanecem fechados, R$0, sem dados reais ou novas chamadas. CI143 `36520584806` passou em `34e9aaf`; CI144 será conferida após commit/push. Código paralelo de administração/TikTok/mídia/social preservado.
