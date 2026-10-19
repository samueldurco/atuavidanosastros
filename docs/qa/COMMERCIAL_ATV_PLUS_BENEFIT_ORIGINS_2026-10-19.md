# Auditoria focal — origem de direitos ATV+ e benefícios

Data: 2026-10-19. Escopo: contrato local e migrações versionadas de J02/J06; não é verificação do banco hospedado, de cobrança ativa ou de uma conta real.

## Conclusão

Há uma política de produtos e uma simulação privada de cotas ATV+, mas não existe hoje uma origem comercial verificável para classificar um direito como `ATV+` ou `benefício`. Um `entitlement` ligado a compra comprova somente a relação com um pedido e com o produto de sua oferta. Um `entitlement` sem `purchase_id` também pode ser uma concessão privada; ele não comprova bônus, assinatura ou plano. Portanto, os rótulos e acessos comerciais específicos continuam bloqueados. A projeção atual deve manter `purchase | unknown`, sem inferir uma assinatura a partir de `purchase_id`, `reason_code`, URL, retorno do checkout ou tabelas de teste.

## Evidência versionada

| Ponto | Evidência | Consequência |
| --- | --- | --- |
| Política de planos | `packages/domain/src/atv-plus-plans.ts:36-88,100-142` define opções e cotas de um ciclo, com `billingEnabled: false`; a seleção é validação, não concessão. | Não há cobrança nem ciclo comercial aprovado pelo domínio. |
| Simulação | `supabase/migrations/20261015145546_atv_plus_owner_simulation.sql:2-72` cria `atv_plus_test_cycles` e `atv_plus_test_uses` sob grant privado do proprietário; `apps/web/src/lib/server/atv-plus.ts:19-91` só usa essas tabelas. | Cota de teste não é direito de assinante. |
| Oferta/pedido | `supabase/migrations/20260902170000_initial_platform.sql:88-100,116-129` vincula uma oferta a um produto e um pedido a uma transação, estado e oferta; não registra tipo de oferta, assinatura ou ciclo. | Pedido aprovado, por si só, não distingue avulso de recorrência. |
| Direito | `supabase/migrations/20260902170000_initial_platform.sql:163-175` tem `purchase_id` opcional e `reason_code` livre, sem referência tipada a assinatura, benefício, quantidade ou consumo. | Não há prova relacional para fonte ATV+/bônus nem para reserva de cota. |
| Autorização | `supabase/migrations/20261019133000_purchase_entitlement_gate.sql:1-23` exige pedido aprovado e oferta correspondente para direito ligado a compra, mas preserva concessões sem `purchase_id` para teste/emissão privada. | O direito sem compra pode ser válido para produto; sua origem comercial permanece desconhecida. |
| Eventos | `apps/web/src/routes/api/webhooks/hotmart/+server.ts:7-62` autentica e guarda o evento em `webhook_inbox`, retornando 202; `packages/integrations/src/index.ts:6-29` lê apenas envelope genérico. | Ainda não há normalização confiável de assinatura/ciclo/benefício nem processamento comercial que conceda tais direitos. |
| Minha Área | `apps/web/src/lib/server/account-rights.ts:107-174` valida o vínculo compra/oferta e projeta `source: purchase | unknown` com estado efetivo. | A interface não deve prometer fonte específica sem registro correspondente. |

Uma busca local pelas leituras/escritas de `purchases`, `entitlements` e `webhook_inbox` no app encontrou a projeção de direitos, o receptor de webhook e a visão administrativa da inbox, sem processador de compra/assinatura para emitir benefícios. Isso descreve apenas o código versionado examinado.

## Critérios de desbloqueio

1. Fechar em J01/J02 os IDs e versões de ofertas comerciais e mapear cada item de checkout ao direito que concede. Para ATV+, aprovar renovação, período, cotas não usadas, troca de plano, inadimplência e cancelamento. Para cada bônus, aprovar natureza (leitura, desconto, cota ou período), elegibilidade, validade, resgate e efeito de estorno. Essas decisões constam como abertas em `C:/ATVNA/docs/30-execucao/PROJETO_JORNADAS_COMERCIAIS_2026-10-19/README.md:173-181`.
2. Modelar referências explícitas e auditáveis para pedido/item, assinatura/ciclo e campanha/benefício. Registrar ação, quantidade, validade e consumo/reserva de forma atômica; preservar origens simultâneas sem fundi-las. A matriz de direitos está em `C:/ATVNA/docs/30-execucao/PROJETO_JORNADAS_COMERCIAIS_2026-10-19/ACESSOS_E_JORNADAS.md` (§§3–6).
3. Implementar associação verificada de identidade e processamento idempotente dos eventos comerciais, inclusive repetição, ordem invertida, reembolso e reconciliação. O retorno visual do checkout não pode conceder acesso. Só então estender a autorização do servidor e o DTO da Minha Área para fontes ATV+/benefício.
4. Verificar em testes negativos e de concorrência: cliente misto mantém direitos independentes; benefício de desconto não abre leitura; expiração/estorno revoga apenas a origem afetada; duas reservas simultâneas não excedem a cota; dados de simulação privada não aparecem como assinatura comercial.

Até esse contrato existir, manter `atvPlusPolicy.billingEnabled=false`, a simulação privada isolada e as fontes neutras na Minha Área. Não há migração, flag ou grant comercial nesta auditoria.
