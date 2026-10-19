# Jornadas comerciais — auditoria J00/J01 para o piloto Carreira

Data: 19/10/2026. Escopo: inventário técnico local do catálogo e dos contratos disponíveis; nenhuma oferta foi ativada. Esta evidência não equivale à aprovação comercial J01 nem ao aceite do produto E5.

Atualização da mesma data: o proprietário confirmou que “Mapa Astral Aprofundado” é `life-atlas` e definiu a apresentação contextual imediatamente após a compra de `birth-chart`. O inventário completo das seis escadas históricas, com a situação de cada aresta, está em [FUNNEL_SOURCE_RECONCILIATION_2026-10-19.md](FUNNEL_SOURCE_RECONCILIATION_2026-10-19.md). Essa decisão prepara a copy de uma página contextual distinta da página pública; ainda não cria uma oferta ativa, preço, checkout nem gatilho de elegibilidade no servidor. O piloto de Carreira descrito abaixo permanece sem aresta aprovada.

## Conclusão executável

Não há contrato suficiente para implementar ou publicar a página de upsell J08 de `purpose-career`. O plano de jornadas chama esse produto de *candidato comercial* e exige J01/J07 antes de J08. A sequência Carreira com `career-forecast-30d` ainda precisa de decisão; o tema comum não cria uma relação de upsell. Preço, condições, ID de checkout, elegibilidade e direito concedido não foram fixados. Todas as 19 ofertas do catálogo de domínio estão `PREPARING`, e a política de ATV+ mantém cobrança desativada. Construir uma etapa de aceite agora exigiria inventar o que o cliente compra.

Fontes: `docs/contracts/architecture-offers-20261015.md`; `packages/domain/src/catalog.ts`; `packages/domain/src/commerce.ts`; `packages/domain/src/atv-plus-plans.ts`; `apps/web/src/lib/data/free-tools.ts`; plano externo ao worktree `C:/ATVNA/docs/30-execucao/PROJETO_JORNADAS_COMERCIAIS_2026-10-19/README.md` (§§6, 8) e `PAGINAS_E_FUNIS.md` (§§5–6).

## J00 — inventário das 19 ofertas atuais

Os IDs, slugs, formatos e estados abaixo vêm de `productOffers` no catálogo de domínio. A rota pública atual é única, `/produtos/[slug]`; portanto cada caminho na tabela usa esse componente parametrizado. Os formatos são o contrato de entrega do catálogo, não evidência de cobrança nem de liberação pública. Todas as linhas têm estado `PREPARING` em 19/10/2026. O contrato de 15/10 preserva os IDs antigos e redireciona slugs comerciais anteriores por 308.

| Universo | ID de produto | Página canônica atual | Formatos previstos |
|---|---|---|---|
| Mapa Astral | `birth-chart` | `/produtos/mapa-astral-completo` | web, PDF, SVG |
| Mapa Astral | `three-pillars` | `/produtos/sol-lua-e-ascendente` | web |
| Mapa Astral | `life-atlas` | `/produtos/mapa-astral-por-temas` | web, PDF, SVG |
| Previsões | `week-reading` | `/produtos/horoscopo-semanal-pessoal` | web, PDF |
| Previsões | `personal-calendar` | `/produtos/calendario-previsoes-30-dias` | web, PDF |
| Previsões | `date-reading` | `/produtos/horoscopo-data-especial` | web |
| Previsões | `solar-return` | `/produtos/mapa-do-seu-ano` | web, PDF |
| Amor e Relacionamentos | `synastry` | `/produtos/analise-astral-do-casal` | web, PDF |
| Amor e Relacionamentos | `couple-dossier` | `/produtos/aprofundamento-astral-do-casal` | web, PDF |
| Dinheiro e Carreira | `purpose-career` | `/produtos/mapa-astral-dinheiro-carreira` | web, PDF, áudio |
| Dinheiro e Carreira | `career-forecast-30d` | `/produtos/previsoes-dinheiro-carreira-30-dias` | web, PDF |
| Tarot | `tarot-situation-challenge-advice` | `/produtos/tarot-3-cartas` | web, PDF |
| Tarot | `tarot-peladan-cross` | `/produtos/tarot-5-cartas-cruz-peladan` | web, PDF |
| Tarot | `tarot-celtic-cross` | `/produtos/tarot-10-cartas-cruz-celta` | web, PDF |
| Tarot | `tarot-aphrodite-temple` | `/produtos/tarot-relacionamentos-7-cartas` | web, PDF |
| Tarot | `tarot-astrological-mandala` | `/produtos/tarot-12-areas-da-vida` | web, PDF |
| Sonhos | `dream-reading` | `/produtos/interpretacao-do-sonho` | web |
| Sonhos | `dream-dossier` | `/produtos/interpretacao-aprofundada-do-sonho` | web, PDF |
| Sonhos | `dream-atlas` | `/produtos/diario-sonhos-30-dias` | web, PDF |

`/leituras` já usa `customerOffers`, agrupados por universo, e cards que levam à rota pública do produto. A rota `/produtos/[slug]` resolve o slug canônico, permite 308 para alias, rejeita produto histórico fora da oferta e só marca uma página como indexável no estado `ACTIVE`. A interface apresenta disponibilidade como “Produto em preparação” no estado atual. Assim, a vitrine é informativa, coerente com o estado publicado.

Há nove ferramentas gratuitas em `apps/web/src/lib/data/free-tools.ts`: Ascendente, Mapa Astral, Horóscopo de Hoje (parcial), Combinação do Casal, Meio do Céu, Dinheiro no Mapa, Carta do Dia, Carta do Amor e Registro de Sonhos. Os `offerIds` desse arquivo são **IDs de produtos sugeridos para descoberta**, não IDs de ofertas comerciais de checkout. Meio do Céu e Dinheiro no Mapa apontam para `purpose-career` e `career-forecast-30d`; essa ligação de descoberta não define ordem de compra, preço ou upsell. `career-compass` permanece experiência gratuita/histórica distinta do produto pago `purpose-career`.

ATV+ tem três planos de ciclo de 30 dias em `atv-plus-plans.ts`: Essencial (uma previsão dentre calendário pessoal e previsão de Carreira), Ampliado (essa previsão mais uma leitura básica), Premium (essa previsão e duas leituras básicas, **ou** uma leitura estendida no lugar das duas). A política declara `billingEnabled: false`, ferramentas gratuitas e histórico independentes da assinatura. A composição de ID permitida por ciclo não é prova de autenticação, persistência ou direito. O contrato `architecture-offers-20261015.md` reserva mapas natais e outras leituras fora dessas cotas para venda avulsa futura.

### Destino das sequências históricas no plano atual

`PAGINAS_E_FUNIS.md` (§5) já classifica as sequências; a tabela resume a situação, sem convertê-las em ofertas ativas.

| Sequência anterior | Destino documentado agora |
|---|---|
| Três Pilares → Mapa Completo; Mapa Completo → Atlas | `three-pillars` → `birth-chart` é candidata histórica. `birth-chart` → `life-atlas` foi decidido para apresentação pós-compra imediata, sem pressupor leitura anterior aberta; a variante pós-consumo é candidata separada. Ambas dependem de contexto e propriedade verificados antes de ativação. |
| Atlas / Revolução Solar / Atlas de Sonhos → clube antigo | Retirar vínculo automático ao clube anterior; reavaliar só pelos benefícios atuais do ATV+. |
| Leitura do Dia → Semana; Semana → Revolução Solar | Reconciliar o escopo de `date-reading`; segunda ligação candidata quando pertinente. |
| Faísca do Par → Sinastria → Dossiê | Entrada atual gratuita; `synastry` → `couple-dossier` é candidata, não oferta ativa. |
| Sonho → Dossiê → Atlas | Candidatas `dream-reading` → `dream-dossier` → `dream-atlas`, respeitando a rotina própria de 30 dias. |
| Tarot antigo / escada de Ascendente | Reconciliar métodos e ferramentas novas; não recriar SKUs retirados nem uma compra obrigatória por número de cartas. |
| Carreira | Definir sequência `purpose-career` / `career-forecast-30d`; o vínculo ainda não está aprovado. |
| Downsell, bump e formatos históricos | Só usar produto/entregável atual com escopo e condições aprovados; PDF/áudio já incluídos não viram item pago duplicado. |

O plano limita uma sessão a uma oferta principal, no máximo um bump e até duas decisões pós-compra, sempre preservando entrega e respeito à recusa. Isso é limite de desenho, não aprovação de uma etapa específica.

## J01 — matriz factual do piloto e lacunas de contrato

| Campo | O que existe | O que falta para uma oferta ativa |
|---|---|---|
| Produto e versão | `purpose-career`, slug canônico e formatos no catálogo; copy informativa na página pública. | Versão de produto liberada pelo gate pessoal/editorial aplicável e promessa final de entrega. |
| Oferta e checkout | A interface `CommercialMapping` prevê IDs internos e IDs da Hotmart. A tabela SQL `offers` tem `checkout_provider='hotmart'` e exige produto/código Hotmart para estado `ACTIVE`. | `offer_id` e versão reais, registro de oferta, Hotmart product ID/offer code, condições e preço versionado. Nenhum mapeamento preenchido foi encontrado no código auditado. |
| Contextos de entrada | `/leituras` → `/produtos/mapa-astral-dinheiro-carreira`; Meio do Céu e Dinheiro no Mapa indicam o produto. | Decisão sobre em que momento cada entrada permite comprar; copy e rota contextual próprias de cada momento. |
| Próximo passo | `career-forecast-30d` existe como produto independente e alternativa de previsão do ATV+. | Grafo aprovado dizendo se há upsell, downsell ou só descoberta; evento de origem, critérios de exclusão, ordem e versão da copy. |
| Elegibilidade | Plano exige verificação no servidor; tabela `entitlements` possui política de leitura pelo titular. | Regra concreta por compra, posse prévia, assinatura/cota, expiração, revogação e destinatário do pedido. Slug ou UTM não prova elegibilidade. |
| Aceite e recusa | Plano define que recusa mantém a entrega original; compra nova concede somente novo direito. | Endpoint de checkout/retorno, estado de sessão persistido, pagamento e associação segura à conta, proteção contra link direto e repetição. |
| Cobrança e confirmação | Rota `/api/webhooks/hotmart` aceita evento autenticado apenas quando `FEATURE_HOTMART_LIVE=true` e o registra de forma idempotente em `webhook_inbox`. `.env.example` mantém a flag falsa. | Processador/reconciliação de inbox, transição de `purchases`, concessão/revogação de `entitlements`, testes autorizados ponta a ponta e liberação de cobrança. A recepção isolada do webhook não concede acesso. |
| Entrega | Estruturas de execução/leitor privado existem; produto público segue em preparação. | Amarração entre compra aprovada, direito, pedido da leitura, geração, Biblioteca e formatos específicos; evidência E5 da versão liberada. |

Os arquivos de rota auditados contêm webhook e testes privados de leitura, mas não uma rota de checkout/retorno digital comercial. A migração `supabase/migrations/20260902170000_initial_platform.sql` cria `offers`, `price_versions`, `purchases`, `webhook_inbox` e `entitlements` e restringe leitura de compras/direitos à conta titular. Estrutura de banco não substitui registros comerciais nem worker de processamento.

## Menor implementação segura após as decisões

1. Fechar uma linha J01 verificável para a oferta pública `purpose-career`: produto/versão, offer ID/versão, preço e termos, checkout Hotmart, direito exato e prazo, elegibilidade por origem e política de revogação. A linha da possível previsão de Carreira permanece fora da ativação até decisão explícita.
2. Implementar J03/J04 do piloto: identidade e associação de pedido, criação de checkout com oferta `ACTIVE`, inbox idempotente com processamento/reconciliação, transições de compra e direito no servidor. Validar que URL/ID direto, webhook repetido e retorno visual não abrem acesso.
3. Completar J05/J07 para o mesmo direito e entrega; aplicar a skill visual nas páginas e comprovar o percurso compra → Biblioteca → leitura. Somente então criar J08 contextual para uma aresta aprovada, com copy própria, contexto persistido, aceitar/recusar e limite da sessão.

Esse encadeamento mantém a página pública atual útil para descoberta sem anunciar compra indisponível. Não alterar `FEATURE_HOTMART_LIVE`, inventar preço, cadastrar oferta fictícia nem expor o teste privado do proprietário como venda.
