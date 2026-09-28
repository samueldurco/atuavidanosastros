# Biblioteca — paginação privada (WU-110)

## Contrato de leitura

`/biblioteca` usa `readLibraryPage` e a sessão existente, sem cliente privilegiado. Cada consulta aplica `user_id` e `archived_at IS NULL`, mantendo RLS. A página pede no máximo 51 linhas e apresenta até 50; a linha adicional indica continuação, sem ser apresentada nem usada como fronteira. Não informa um total que não tenha sido contado.

Ordenação canônica: `created_at DESC, id DESC`. A URL contém somente `?before=<UUID do último item visível>`. O servidor resolve esse UUID dentro do mesmo proprietário/acervo ativo e usa seu timestamp, com microssegundos intactos, no predicado `created_at < t OR (created_at = t AND id < cursor)`. Não aceita timestamp, filtro SQL, título ou notas do navegador. Parâmetro repetido ou malformado é recusado sem consulta; os valores da fronteira têm gramáticas estritas antes da interpolação.

Cursor inexistente, arquivado ou de outro proprietário produz o mesmo estado expirado. O usuário pode voltar à primeira página; não se pula silenciosamente para ela. Falha de banco/transporte, resposta inválida, IDs duplicados e timeout são erro recuperável, nunca acervo vazio. Campos extras não saem do servidor. O prazo de 10 segundos cobre resolução da fronteira e leitura da página; abort é solicitado, mas o limite efetivo não depende de o transporte obedecê-lo. Não há retry automático nem garantia de cancelamento de SQL. Fronteira que responde após o prazo não dispara uma segunda consulta.

Cabeçalhos: `Cache-Control: private, no-store`, `Referrer-Policy: no-referrer` e `X-Robots-Tag: noindex, nofollow`. A URL continua sendo um endereço privado com identificador opaco, não um link público de compartilhamento. Não há novas escritas, RPCs, migrações ou exposição de resultados.

## Experiência e mudanças no acervo

“Ver registros anteriores” avança e “Voltar aos mais recentes” reinicia. Links funcionam sem JavaScript. Busca, filtros, ordenação alfabética e contador são explicitamente da página exibida; não prometem busca global. Filtros locais são limpos após navegação. A ordem “Mais recentes” preserva a ordem canônica recebida, inclusive empates.

As páginas são leituras independentes, não um snapshot transacional do acervo inteiro. Novos itens recentes aparecem ao retornar à primeira página; remoção/arquivamento pode esvaziar um trecho ou expirar a fronteira. O teste não certifica mudanças arbitrárias de `created_at` durante navegação. Não há contagem global, salto por número, busca global ou indexação nova nesta entrega.

As fontes candidatas da gestão de continuidade vêm da página atual. Mudar de página não revoga consentimento nem exclui registros de continuidade. Fontes persistidas fora da página mantêm o fallback por ID; toda gravação continua revalidada pela API/banco. Consulte [continuidade na Biblioteca](continuity-library.md).

## Evidência e limites

### Retorno do leitor — WU-112

Os cards levam `fromBefore=<UUID>` quando abertos de uma página histórica. O carregamento privado do leitor aceita exatamente um UUID, normalizado para minúsculas; metadado ausente, repetido, malformado ou endereço externo retorna à primeira página. Não há parâmetro de URL de retorno arbitrária. O breadcrumb, a ação “Voltar à Biblioteca” e a navegação após exclusão confirmada usam o mesmo destino interno validado. Os links existem no HTML renderizado no servidor e sobrevivem à recarga; não dependem do histórico do navegador ou de armazenamento local.

O cursor não autoriza acesso ao registro nem consulta dados de outra pessoa. A leitura do registro permanece vinculada à sessão, com os mesmos 404 e cabeçalhos privados. Sua fronteira só é resolvida, com o proprietário atual, ao voltar à lista. Cursor sintaticamente válido mas removido/estranho mantém o tratamento expirado da WU-110; não garante uma página imutável. Filtros, busca, scroll e seleção local não são preservados. Uma nova versão reprocessada continua usando o destino da recuperação existente, sem herdar este cursor. Não muda o protocolo de exclusão, a disponibilidade dos produtos ou as autorizações.

Testes unitários exercitam fronteira, isolamento no construtor de consultas, prazo e erros. Um teste usa o cliente Supabase instalado com `fetch` sintético para atravessar 1.051 registros em 22 páginas; não é prova de RLS/JWT/PostgREST implantados. A fixture `/biblioteca/_spec/historico` só responde em localhost/127.0.0.1 e reduz a página a três itens para testar navegação/estados/viewport. A produção mantém 50+1.

Extensão funcional MEM-02 (`f5af4d1cdd4542488d60e94fa2c9bafb`, projeto `2141801333950500965`), reutilizando Atlas/Button/StatePanel e tokens existentes. Evidência visual local não equivale a Gate B integral nem completa produtos sem cálculo/editorial homologados. Nenhum modelo promovido, transporte de e-mail ativado, migração hospedada ou gasto pago.
