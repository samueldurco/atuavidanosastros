# Manutenção limitada de registros expirados — WU-092

Fundação interna, sem scheduler, rota HTTP, cliente service_role, credencial ou ativação. Não decide retenção nem autoriza uso de contexto. Nenhum modelo homologado; policy e releases permanecem desativados.

## SQL

`20260928170100_product_continuity_maintenance.sql` substitui a implementação da RPC sem argumentos `purge_expired_product_continuity_access()`, preservando sua assinatura e acesso exclusivo de service_role. Cada chamada remove **até 500 eventos já expirados**, ordenados por expiração e UUID, com `FOR UPDATE SKIP LOCKED`. Filhos de auditoria são removidos por FK; notas curadas, fontes, consentimentos e eventos vigentes são preservados. O limite é de eventos pai, não de todos os registros físicos afetados (cada evento pode possuir até 12 itens).

`SECURITY DEFINER` usa `search_path` vazio e tabelas qualificadas. Clientes não fornecem proprietário, IDs, data-limite ou tamanho de lote. As tabelas continuam sem acesso direto. A manutenção não depende de consentimento ou policy ativa: desligar o uso não deve impedir o descarte do que já expirou. O forward-fix dedicado revoga explicitamente a capacidade de manutenção quando necessário.

O retorno inteiro é a quantidade removida na transação; **zero não prova fila vazia**, pois registros podem estar bloqueados por outra transação. Falha SQL reverte o lote. A rotina não contém loop e não promete prazo de execução do banco ou SLA de descarte. Os testes locais de PGlite não certificam concorrência multi-conexão nem comportamento hospedado de locks.

## Fronteira interna

`maintainContinuityAccess` exige `enabled === true`, exclusivamente de infraestrutura confiável. O callback injetado deve representar somente a RPC de expiração; o adaptador não permite configurar seus argumentos. Sem habilitação explícita, não chama a dependência.

- Uma chamada, no máximo um lote. Recibo aceito: inteiro entre 0 e 500, sem erro. Retorno `completed`, quantidade e `remaining: 'unknown'`.
- Prazo local de espera de 10 segundos, sinal de abort e corrida com deadline mesmo se o transporte ignorar abort. Isso **não prova cancelamento SQL**.
- Falha, perda de resposta, timeout ou recibo inválido: `unconfirmed / maintenance_unavailable`, sem erro bruto, conteúdo, IDs, logs ou retry automático.
- Uma resposta perdida pode seguir uma exclusão já confirmada no banco. A decisão de nova operação pertence à futura infraestrutura autorizada; o código não drena o backlog.

## Recuperação e ativação

`supabase/forward-fixes/disable_product_continuity_maintenance.sql` desliga a policy e revoga a RPC de manutenção, o wrapper de seleção e o núcleo privado. Preserva consulta, limpeza própria e revogação de consentimento; não apaga dados nem restaura eventos já descartados. A limpeza física é irreversível; o forward-fix interrompe novas operações, não é recuperação de dados.

Continuam pendentes: prazo de retenção decidido (NULL em produção), aplicador/revisão de migrações, executor de manutenção autenticado com limites de banco/tempo/carga, frequência e responsabilidade operacional, alertas sem conteúdo e evidência hospedada de descarte e concorrência. Não instalar scheduler nem chamar a RPC hospedada só porque esta fundação passou nos testes. Expiração lógica continua distinta de descarte físico no prazo. Descarte de derivados e revalidação na fronteira de uso são contratos separados.
