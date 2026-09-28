# Auditoria privada da seleção de continuidade — WU-089

Migração `20260928160000_product_continuity_access.sql`. Fundação local, default-off, sem modelo homologado, executor ou alteração da projeção `atv-continuity-selection/1`. O registro comprova uma seleção SQL bem-sucedida, **não** envio, interpretação ou uso por modelo.

## Transação e privacidade

A RPC existente passa a ser VOLATILE e grava o registro na mesma transação da seleção. Seu núcleo STABLE é renomeado para `product_continuity_selection_snapshot` e perde EXECUTE para PUBLIC/anon/authenticated/service_role. Não existe caminho cliente sem auditoria. O wrapper usa o mesmo advisory lock por proprietário e lock compartilhado da policy; cada tentativa relê o snapshot. Isso não cria autorização durável nem garante proteção contra revogação posterior: o futuro executor ainda deverá revalidar na fronteira de uso.

Somente seleções inteiras válidas geram evento. Falha de persistência, quota ou retenção impede a resposta selecionada e reverte o evento; o servidor normaliza erros como `continuity_service_unavailable`, sem argumentos SQL ou texto privado. Falhas de autorização não gravam IDs fornecidos por terceiros. Uma seleção SQL registrada pode ser recusada depois pelo parser/domínio, ou perder a resposta no transporte; não se deve interpretar o registro como entrega confirmada.

`product_continuity_access` guarda proprietário, UUID, revisão de consentimento, finalidade fixa `reading-context`, resultado fixo `selected`, criação e expiração. `product_continuity_access_items` guarda ordem e IDs/revisões de itens e fontes. Não guarda notas, input, cálculo, interpretação, dados de provider nem snapshot recuperável. FK composta exige o mesmo proprietário. Ambas as tabelas possuem RLS, sem policies de cliente; privilégios diretos revogados inclusive de service_role. Rotinas SECURITY DEFINER usam search_path vazio e identidade de `auth.uid()`, nunca argumento de proprietário.

## Retenção e controle

- `access_retention_days` nasce NULL. Nenhum prazo de produção é presumido; mesmo com policy ligada, seleção válida falha até decisão explícita entre 1 e 30 dias. Os 7 dias dos testes são apenas fixture.
- Até 1.000 eventos não expirados por pessoa. Exceder bloqueia nova seleção, sem sobrescrever silenciosamente. Limpeza explícita permite nova seleção se todas as demais autorizações continuarem válidas.
- `read_product_continuity_access()` retorna `atv-continuity-access/1`, somente eventos próprios não expirados e metadados ordenados. Exige authenticated e perfil ativo; funciona com policy desligada ou consentimento revogado. Não é fonte de contexto nem autoridade de uso.
- `clear_product_continuity_access()` remove somente registros próprios, é idempotente e funciona desligado, revogado ou com perfil soft-deleted. Preserva notas, consentimento e registros alheios. Somente authenticated.
- Excluir um item ou uma fonte remove o evento inteiro que os referenciava, inclusive em seleções de múltiplas fontes. Excluir fisicamente o perfil remove seus eventos. Revogação isolada não equivale a exclusão.
- Expirados deixam de aparecer imediatamente na consulta. A próxima seleção bem-sucedida do proprietário remove os expirados dele; `purge_expired_product_continuity_access()` permite somente a service_role remover expirados de todos. A WU-092 limita essa RPC a 500 eventos por chamada, sem loop; zero não prova backlog vazio. Nenhum scheduler é instalado. **Expiração lógica não garante descarte físico no prazo**: operação de manutenção e verificação hospedada são pré-requisitos de ativação.

## Recuperação e limites

`supabase/forward-fixes/disable_product_continuity_access.sql` desliga a policy e revoga wrapper e núcleo. Preserva inspeção, limpeza, manutenção de expirados e revogação de consentimento. Não reabre o caminho sem auditoria nem apaga dados automaticamente.

A migração acrescenta estruturas e endurece comportamento, incluindo rename da função interna: não é puramente adição de tabelas. Sem remoção de dados existentes; assinatura pública preservada. Testes PGlite cobrem isolamento, rollback atômico, quota, expiração, exclusões e forward-fix; integração real local SQL → servidor → domínio cobre falhas de auditoria e os seis universos. Não certificam JWT/PostgREST hospedados ou concorrência multi-conexão.

WU-090 acrescenta [API autenticada de inspeção e limpeza](continuity-api.md), sem contexto ou interpretação; WU-091 acrescenta [sua UI na Biblioteca](continuity-access-library.md); WU-092 acrescenta a [fundação interna de manutenção por lote](continuity-maintenance.md). Ainda faltam decisão de retenção de produção, manutenção física operacional, descarte de derivados e executor com revalidação. Nenhuma migração hospedada, modelo, release ou ATV+ foi ativado.
