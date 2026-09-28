# Recuperação selecionada de continuidade — WU-083

`read_product_continuity_selection(uuid[])` + `prepareStoredContinuity` ligam a persistência privada ao preparador de domínio, sem rota HTTP, UI ou executor de IA. Versão de transporte `atv-continuity-selection/1`. Default-off; preparação bem-sucedida continua com `publication: blocked`. Nenhum modelo homologado.

## Autoridade e projeção

A RPC deriva o proprietário de `auth.uid()`; somente authenticated possui EXECUTE. Rejeita anon/service_role, perfil ausente/excluído, policy desligada, consentimento revogado, escopo removido, seleção vazia/duplicada/>12, item alheio/ausente/não relevante e fonte não liberada pelo leitor canônico. Retorna a seleção inteira ou um código sem dados parciais. Não utiliza a listagem de gestão como autoridade.

Uma chamada SQL STABLE usa um snapshot de statement. Cada chamada relê consentimento, itens e disponibilidade atual (incluindo promoção/motor/release). Isso **não autoriza um envio posterior** nem impede revogação concorrente após a leitura. Um futuro executor deverá revalidar no limite de uso; não há fila, cache, provider ou envio nesta unidade.

A projeção mantém somente itens escolhidos, escopo dos runs envolvidos, título quando selecionado como resultado, textos das hipóteses explicitamente escolhidas e fatos de ciclos referenciados. Placeholders vazios preservam índices das seções sem copiar parágrafos não selecionados. Limites das fontes são preservados integralmente. Não retorna input bruto, dados arbitrários de cálculo, evidências/títulos das seções, promoção ou reviewDigest. IDs/revisões permanecem privados na fronteira servidor; o preparador os separa do contexto em manifesto/auditoria.

## Fronteira do servidor

O chamador deve fornecer identidade **verificada** e porta RPC vinculada à sessão dessa identidade, nunca snapshots vindos do cliente nem credenciais service_role. Identidade e seleção são capturadas antes de aguardar a porta. A resposta é validada por chaves exatas, versões, contagens, ownership, ordem e revisões; domínio valida novamente as fontes e compila o contexto. Erros de transporte retornam `continuity_service_unavailable`, sem SQL, argumentos, conteúdo ou retry/fallback.

A porta recebe AbortSignal de 10 segundos e deve respeitá-lo; resposta tardia é rejeitada. Não é garantia de cancelamento de uma porta que ignore o sinal. Teto de transporte: 196.608 unidades UTF-16 do JSON serializado (não bytes de rede). Teto final do domínio continua 12.000 bytes UTF-8, sem truncamento. Auditoria privada contém revisão do consentimento e de cada item; não serializar para modelos, analytics, HTTP público ou cache.

## Recuperação e limites

`supabase/forward-fixes/disable_product_continuity_selection.sql` desliga policy e revoga a leitura selecionada, preservando consulta de gestão, revogação e exclusão. Não apaga dados nem reativa automaticamente.

Testes locais PostgreSQL/PGlite → servidor → domínio incluem seis universos com fixtures e gates exclusivamente sintéticos. Não certificam JWT/PostgREST hospedados, concorrência multi-conexão, qualidade editorial ou cálculos desses produtos. A WU-084 acrescenta [rotas autenticadas de gestão](continuity-api.md), sem expor contexto selecionado. Faltam UI de revisão/consentimento, auditoria de acesso sem conteúdo, descarte de derivados e executor com revalidação. Nenhuma migração hospedada foi aplicada.
