# ATV+ — fronteira de E1 e dependências da assinatura

RUN_ID `ATV-20260902-170644Z-01A0630F`. WU224, 05/10/2026. Produto de catálogo `atv-plus`, estado `PREPARING`, entregas `web` e `club`. Esta inspeção não ativa oferta, cobrança, acesso, créditos ou continuidade.

## Requisito e evidência observada

O plano mestre §0.2 exige, em E1, entrada/consentimento real, processamento e contrato versionado de fatos do próprio produto. A arquitetura de produtos §§11.2 e 12 condiciona a assinatura a produto pontual consumido, retorno orgânico, valor renovável, custo/créditos, cancelamento e preço explícitos, entitlement integrado, métrica e calendário editorial. As faixas Essencial/Integral/Duo em §12.2 são recomendações sujeitas a teste, não ofertas aprovadas. O Atlas Vivo em §12.4 exige autorização para reunir fontes de outras verticais.

O código contém apenas o item `atv-plus` no catálogo. O esquema inicial tem ofertas, preços, compras, inbox e entitlements pontuais, mas não possui vínculo entre ciclo de assinatura, período pago, benefício renovado e concessão/revogação correspondente. O webhook Hotmart atual autentica e guarda eventos no inbox, sem consumidor/reconciliação. Não há contrato de entrada ATV+, plano aprovado, método de crédito, CTA de assinatura ou resultado de assinatura. As políticas de produto e `FEATURE_HOTMART_LIVE` permanecem desligadas.

## Bloqueio finito e aceite necessário

| Decisão ou dependência | Responsável | Evidência necessária para avançar |
| --- | --- | --- |
| Selecionar benefício renovável, calendário/fallback, formato Club e limites de cada plano; aprovar oferta/preço/cancelamento | Produto, editorial e operação comercial | Versão aprovada do contrato de planos, unidade de valor, política de créditos e custo marginal; nenhum preço de faixa tratado como venda |
| Definir fatos/consentimento E1, inclusive quais fontes podem entrar no Atlas Vivo e como revogar | Produto e privacidade | Schema versionado com autorização explícita, origem e escopo por fonte; teste de exclusão/revogação |
| Vincular evento financeiro e conta verificada ao período e entitlement, incluindo atraso, cancelamento, reembolso e chargeback | Engenharia e operação Hotmart | Mapeamento aprovado, reconciliação idempotente, SQL/transportes locais e prova hospedada; webhook isolado não concede acesso |
| Demonstrar os oito critérios de §11.2 e a jornada de cobrança/consumo/cancelamento | Produto, operação e QA | Dados reais de consumo/retorno e aceite de staging, Gate B/Lab e gates de liberação aplicáveis |

E1 está **BLOQUEADO** no contrato específico da assinatura e nas decisões de produto; E2–E5 pendentes. É seguro prosseguir com a dependência comercial já requerida pelo plano §13, começando pela recepção e reconciliação dos eventos Hotmart, sem presumir oferta ATV+ nem ativar `FEATURE_HOTMART_LIVE`. A implementação local dos 25 produtos não demonstra os critérios comerciais ou a sessão hospedada; o Supabase pausado impede essa prova até ação do proprietário.
