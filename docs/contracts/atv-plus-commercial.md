# ATV+ comercial e preço de membro

RUN_ID `ATV-20260902-170644Z-01A0630F`. Implementação P01 de 04/11/2026. Política `atv-plus-commercial/1`.

## Referência para P02, P03, P04, P06 e Loja dos Signos

- Destino da assinatura `/atv-mais`; os identificadores são `atv-plus-{essencial|ampliado|premium}-{3|6|12}m`.
- Matriz e calendário em `@atv/domain`: `atvPlusCommercialPlans`, `atvPlusCommercialOffers`, `atvPlusCommercialSchedule`.
- Direito financeiro em `atv_plus_memberships`, separado da avaliação gratuita anterior. `ACTIVE` e `CANCELLED` mantêm benefícios somente no intervalo pago `[starts_at, ends_at)`. Cancelamento não apaga leituras anteriores.
- Direito/preço no servidor em `apps/web/src/lib/server/member-pricing.ts`: `memberPricingSnapshot`, `memberPriceForSnapshot`, `reviewedShopMemberPrice`. Nunca confiar em nível, valor ou desconto enviados pelo cliente.
- Consulta por identificador em `/api/member-price`. Catálogo, ficha, carrinho e checkout físicos usam a mesma regra. P03/P04/P06 devem consumir os identificadores e a disponibilidade reais de seu catálogo; não criar produtos ou preços para demonstrar desconto.
- Melhor condição única entre regular, promoção, cupom e membro, sem acumular. Frete e o próprio ATV+ não são elegíveis. Revalidar direito e preço no servidor ao iniciar checkout e confirmar pedido; orçamento antigo não garante benefício após expiração.
- Percentuais 10/20/30 digitais e 10/15/20 físicos são simulações internas. Não anunciar ou tornar pagável sem custos, piso de margem e suporte comercial aprovados. Em 04/11 não há preço comercial ACTIVE nem custo completo que libere a condição. Os preços regulares existentes permanecem os únicos pagáveis.

## Primeira entrega e calendário

A próxima Revolução Solar é devida imediatamente após compra confirmada e dados/WhatsApp confirmados, inclusive no trimestral e com aniversário além da vigência. A cidade da próxima revolução é obrigatória. O motor astrológico determina o próximo retorno pelo instante real; aniversário é referência de calendário. Previsões periódicas seguem as datas futuras do plano. Presente natal uma vez por perfil e tipo; renovação e upgrade não duplicam presentes ou edições.

O cadastro ocorre na própria `/atv-mais`, vinculado ao perfil natal autorizado da conta. O calendário e o contato mascarado são privados. O serviço consiste em PDFs programados pelo WhatsApp, sem consultas, perguntas ou grupos. Telegram permanece futuro.

## Checkout e publicação

O formulário autenticado chama `atv_plus_start_checkout` e vincula o pagamento por `sck` aleatório; não encaminhar diretamente uma URL de oferta pública. A oferta exige preço positivo revisado, referência real do provedor e flags `FEATURE_HOTMART_LIVE=true` e `FEATURE_ATV_PLUS_COMMERCIAL=true`. Sem esses requisitos a interface mostra contratação em preparação.

Hotmart é autoridade financeira. Inbox, ativação, concessão e entrega são idempotentes e não se baseiam na página de retorno do pagamento. A execução comercial exige PDF aprovado e canal homologado. Credenciais expiradas ou ausência de adapter não podem produzir estado entregue.

P02 conserva a responsabilidade da home/menu. As referências antigas a quotas e ciclos de 30 dias não descrevem esta assinatura comercial; devem apontar à matriz acima ao integrar a descoberta. A avaliação privada anterior continua reservada ao proprietário e seu histórico é preservado.

## Contrato de persistência e integração

A migração `20261104094016_atv_plus_commercial_memberships.sql` cria ofertas, intenções de checkout, vínculos, contatos, liberações e entregas. As nove ofertas nascem desabilitadas, sem preço, identificação Hotmart ou termos aprovados. A cobrança única pelo prazo e a renovação manual são uma proposta técnica condicionada à aprovação comercial; não equivalem a termos já aprovados pelo proprietário.

RPCs públicas e autenticadas:

| RPC                                                                                                                                                 | Acesso              | Retorno ou efeito                                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `atv_plus_public_offers()`                                                                                                                          | anônimo/autenticado | Somente ofertas habilitadas, com identificador, nível, prazo, preço e moeda; nunca URL de checkout.                                  |
| `atv_plus_membership_state()`                                                                                                                       | autenticado         | `policyVersion`, `memberships`, `contact` mascarado, `deliveries`, `offers`, sempre da conta ativa.                                  |
| `atv_plus_start_checkout(p_offer_id text)`                                                                                                          | autenticado         | `intent_id`, `checkout_url` Hotmart com vínculo aleatório `sck`; única origem de URL de pagamento.                                   |
| `atv_plus_complete_onboarding(p_membership_id uuid, p_profile_id uuid, p_whatsapp text, p_whatsapp_consent boolean, p_solar_return_location jsonb)` | autenticado         | Valida posse, perfil natal atual e consentido, contato E164, consentimento explícito e local da revolução; devolve o estado privado. |
| `atv_plus_cancel_membership(p_membership_id uuid)`                                                                                                  | autenticado         | Cancela renovação, conservando o período pago e o histórico.                                                                         |

O local da revolução exige `label`, `countryCode` ISO de duas letras maiúsculas, `timezone` reconhecido, `latitude` e `longitude` válidas. A confirmação pelo formulário não verifica a posse do WhatsApp: `verified_at` exige referência de verificação independente pelo serviço. O perfil natal precisa conter hora exata para uma entrega astrológica aprovada; conta excluída ou consentimento revogado bloqueiam geração e envio.

A intenção conserva preço, moeda, produto/oferta Hotmart e referência dos termos aprovados no instante do checkout. Mudanças posteriores da oferta não invalidam uma compra autenticada vinculada a essa intenção. A validade de 24 horas limita o uso/reuso local do checkout; não rejeita um pagamento já cobrado nem uma notificação atrasada, pois não existe expiração remota comprovada da URL. Uma intenção não concede duas transações. Evento aprovado exige assinatura verificada na inbox, produto/oferta, valor e moeda compatíveis com o snapshot; divergências ficam em quarentena.

`process_atv_plus_hotmart_event(p_external_event_id text)` é exclusivo do serviço. Aprovação ativa uma vez; renovação do mesmo nível e downgrade iniciam após os termos pagos de nível igual ou superior; upgrade inicia imediatamente. Cancelamento conserva o termo pago. Estorno/chargeback suspende o vínculo; previsões futuras de nível inferior podem ser restauradas. Presentes cancelados antes de qualquer aceitação podem ser reaproveitados em nova compra; envio aceito ou entregue nunca é repetido automaticamente.

## Geração, envio e confirmação

O serviço chama `atv_plus_dispatch_due()` para enfileirar até cem entregas elegíveis por lote. O job `atv_plus.generate` usa uma chave por entrega. `atv_plus_delivery_step(p_delivery_id uuid, p_action text, p_artifact_id uuid default null, p_provider_message_id text default null, p_error_code text default null)` implementa `CLAIM`, `ATTACH`, `BEGIN_SEND`, `ACCEPTED`, `CONFIRM`, `FAIL` e `UNCERTAIN`.

O runtime `apps/worker/src/atv-plus-delivery.ts` precisa receber adapters aprovados de PDF e WhatsApp. O adapter de PDF cria o run existente com `request_key = deliveryId` e persiste o documento pelo pipeline de artefatos aprovado. `ATTACH` exige PDF aprovado da mesma conta, run, produto, período e dados natais/local autorizados. Para Tarot, o foco é o período da previsão. `SENT` significa aceitação pelo canal; somente recibo verificável permite `CONFIRM` e `DELIVERED`. Resultado incerto exige conciliação, sem reenvio automático. Repetir job em `SENDING`, `SENT` ou `DELIVERED` não regenera nem reenvia.

Para a Revolução Solar, `selectAtvPlusNextSolarReturn` compara instantes calculados das candidatas anuais e seleciona o primeiro estritamente posterior ao cadastro. O ano civil é referência de busca; não representa o instante do retorno. O adapter homologado deve obrigatoriamente usar essa seleção e comprovar o primeiro retorno futuro: a janela defensiva SQL de 370 dias, isoladamente, não comprova essa propriedade. O instante real substitui o marcador do calendário, e a chave do ciclo evita repetição em renovação/upgrade. Um novo ciclo elegível é solicitado na próxima contratação; não há reposição de presentes por alteração da versão do perfil natal.

Em 04/11/2026, o banco hospedado não contém `workflow_releases`, `product_runs`, `product_artifacts` nem `product_artifact_run_allowed(uuid,uuid)`. A migração P01 pode coexistir sem esses objetos e devolve `pipeline_unavailable`; não cria substitutos ou libera as migrations históricas indiscriminadamente. Também faltam o mapeamento editorial P01 homologado, o adapter comercial de geração/canal e a confirmação de WhatsApp. O runtime é uma integração testada localmente com adapters sintéticos; não comprova envio comercial real. Recuperação de processamento interrompido sem resposta e conciliação de envio precisam ser homologadas com esses adapters antes da abertura.

O forward fix `supabase/rollbacks/20261104094016_atv_plus_commercial_disable.sql` desabilita novas contratações e execuções, cancela jobs pendentes e conserva termos pagos, histórico e envios que exigem conciliação. Não remove dados financeiros.

## Estado verificável

Referência inicial de integração disponibilizada antes da publicação. Worktree `C:/ATVNA/.worktrees/p01-atv-mais-20261104`, branch `codex/p01-atv-mais-20261104`, base `52a759d`. Testes finais, migração hospedada e revisão publicada devem ser registrados no relatório P01 e no log comercial canônico. A existência deste contrato não comprova compra, envio real ou publicação.
