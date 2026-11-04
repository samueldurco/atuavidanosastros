# P02 — escopo aprovado para publicação em teste gratuito

Decisão do proprietário em **04/11/2026**, na conversa de execução P02. RUN_ID `ATV-20260902-170644Z-01A0630F`. Registro documental da instrução vigente; não é evidência de deploy concluído ou de aceite E5.

## Instrução literal

> nao coloque preço nem gere cobrança por enquanto somente publique e deixe no ar funcionando de modo liberado e gratuito igual os outros, modo de teste

Esta instrução define o modo da publicação atual e posterga a frente comercial anteriormente prevista no projeto. Não é necessário pedir nova aprovação de preço, Hotmart ou cobrança para concretizar a publicação gratuita autorizada.

## O que a autorização cobre

Os **onze** IDs da [matriz](product-readiness-matrix.md) podem ter suas fichas e entradas publicadas, e o fluxo privado pode preparar, calcular fatos, compor/revisar, salvar e reabrir a entrega gratuitamente. O root realiza integração, CTA/interface, publicação e postflight. Não há cobrança, pedido financeiro, checkout, assinatura exigida ou desconto de membro para acessar esse teste.

O acesso segue **o mesmo mecanismo dos outros testes privados**: conta autenticada com `has_atv_trial_access()` verdadeiro e grant existente, vigente e não revogado. Gratuito descreve a relação com o usuário; não declara custo marginal de infraestrutura igual a zero. A decisão não autoriza criar custos fixos, upgrade ou serviço pago.

## Gates e limites preservados

| Área | Regra mantida |
| --- | --- |
| Identidade e acesso | `trialIdentity` verifica claims da conta e `has_atv_trial_access`. Não criar acesso anônimo, grant universal ou bypass por assinatura/CTA. |
| Isolamento | Preparações, leituras e feedback pertencem ao proprietário autenticado. RLS exige `owner_id = auth.uid()` e grant válido; não abrir leitura cruzada ou após revogação. |
| Escrita | Escrita de fatos/leitura pelo servidor com `trialWriter`; privilégio não exposto ao navegador. Feedback conserva permissões e vínculos próprios. |
| Fatos e estados | Preparação inicia `AWAITING_CALCULATION`; fatos calculados/persistidos levam a `FACTS_READY_AWAITING_REVIEW`. Não apresentar recibo como leitura pronta. |
| Entrega | Compor a partir de fatos persistidos, reavaliar no servidor e salvar somente revisão `APPROVED_FOR_PRIVATE_TEST`, vinculada a produto/execução/digests. Preservar imutabilidade, idempotência e reabertura da entrega salva. |
| Conteúdo e método | Manter corpus, política, contexto, consentimentos aplicáveis e limites de cada produto. A gratuidade não aprova cálculo/editorial rejeitados, precisão comercial ou promessa de resultado. |
| Publicação | Manter os gates técnicos/visuais e o postflight da revisão efetiva na janela coordenada pelo root. Falha técnica concreta continua sendo bloqueador do fluxo afetado. |

Fontes do mecanismo existente: [private-trials.ts](../../apps/web/src/lib/server/private-trials.ts), migrations de [preparações](../../supabase/migrations/20261104102635_p02_launch_preparations.sql), [leituras](../../supabase/migrations/20261104103423_p02_launch_readings.sql) e [feedback](../../supabase/migrations/20261104110009_p02_launch_feedback.sql). Nenhuma dessas regras ou permissões foi alterada por esta tarefa documental.

## Comércio postergado e E5 separado

Preço regular, piso de contribuição, custos monetários completos, inventário/ofertas Hotmart, checkout, compra homologada e benefício financeiro de membro ficam explicitamente **para uma etapa comercial futura**. Campos desconhecidos permanecem `null`; não cadastrar preço zero ou oferta fictícia para viabilizar o teste. A regra P01 continua válida para futura cobrança, com melhor condição única sem acúmulo, mas não é um gate de publicação gratuita.

E5 é a avaliação própria da entrega no percurso privado real: conta autorizada, entrada, fatos, leitura revisada persistida, reabertura e avaliação vinculada ao produto/versão/digest. O proprietário pode realizar essa avaliação usando o teste publicado. A autorização de publicar não fabrica um aceite E5, e E5 pendente não transforma pendência financeira em requisito da publicação gratuita. Snapshots sintéticos e revisão automática privada continuam identificados separadamente.

## Evidência para concluir a execução autorizada

O root registra a revisão/deploy efetivos e confirma que descoberta/ficha/CTA levam ao modo gratuito; conta já autorizada consegue gerar e reabrir sua própria leitura; controles de identidade/grant/revisão permanecem; nenhuma etapa exige preço, pagamento ou Hotmart. Registrar qualquer bloqueador técnico concreto e seu produto/rota sem declarar uma venda ou E5 fictícios. A criação de conta/grant novo ou uso de identidade alheia não é implicada por este documento.

Estado de partida: [schema P02 aplicado](hosted-schema.md), front ainda sem publicação comprovada na última atualização desta documentação. A [matriz](product-readiness-matrix.md), a [preparação comercial](commercial-readiness.md) e as [evidências de custos](pricing-evidence.md) passam a usar este escopo como decisão vigente de publicação.
