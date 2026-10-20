# Jornadas comerciais — entrega local de 19/10/2026

RUN_ID: `ATV-20260902-170644Z-01A0630F`. Escopo: páginas públicas de produto, apresentação de direitos na Minha Área e correção dos gates de autorização existentes. **Estado: implementado e validado localmente; migrações e páginas ainda não liberadas em ambiente hospedado.**

## Entrega verificável

- Os 19 produtos do catálogo vigente têm apresentação pública individual em `/produtos/[slug]`, com copy de descoberta própria, distinção da ferramenta gratuita ou leitura próxima, dados e formatos derivados do contrato. `/leituras` conduz a essas páginas. Ofertas `PREPARING` mostram indisponibilidade e não exibem compra ou preço fictício. O link de ATV+ do catálogo aponta para `/atv-mais`.
- Dashboard e Biblioteca apresentam **Seus acessos** separadamente de leituras concluídas e testes. A projeção considera estado e período do entitlement, compra do próprio usuário, estado da compra e produto da oferta. Compra verificada recebe origem própria; concessão sem vínculo comercial identificável fica neutra, sem se passar por assinatura ou benefício. Falha de consulta fecha a projeção com erro, sem conceder ação.
- A RPC `owned_purchase_offers` resolve apenas pares oferta/produto presentes em compras da conta autenticada, inclusive quando a oferta histórica não é pública. Não expõe código, preço ou oferta de outra pessoa. Migração e rollback têm teste local de transação e isolamento.
- Os gates SQL `request_product_run`, `read_product_request_access` e `save_dream_atlas_entry` revalidam entitlement ativo no período e, para concessão com `purchase_id`, compra `APPROVED` do mesmo usuário e oferta do mesmo produto. Estorno, cancelamento, contestação, pendência e vínculo incoerente não autorizam nova ação. Retentativa idempotente devolve apenas o ID anterior. A migração possui rollback implantado que mantém EXECUTE revogado e forward-fix de contenção sem apagar dados.
- A migração J04 `supabase/migrations/20261019143000_purchase_state_guard.sql` guarda o grafo de transições de compra: impede, por exemplo, `REFUNDED → APPROVED` por atualização tardia, aceita atualização idempotente para o mesmo estado e preserva revogação de compras antes aprovadas. Há contenção e rollback próprios; a guarda não processa webhook, não cria entitlement e não autentica uma inserção inicial `APPROVED`. Evidência focal: `docs/qa/COMMERCIAL_J04_PURCHASE_STATE_GUARD_2026-10-19.md`.
- A reconciliação dos seis funis históricos com as 19 ofertas atuais está em `docs/qa/FUNNEL_SOURCE_RECONCILIATION_2026-10-19.md`. Ela registra cada uma das 18 arestas de upsell, 12 downsells, 12 bumps e 18 cross-sells históricos, com momento e fonte. A decisão atual prepara `birth-chart → life-atlas` logo após compra confirmada; `life-atlas` é o mesmo Mapa Astral Aprofundado referido pelo proprietário. A variante histórica após consumo, cinco outros upsells compatíveis e dois downsells condicionais permanecem candidatas, não condições comerciais aprovadas. `date-reading → week-reading` não foi validado; Tarot e Ascendente antigos, clubes e bundles não são equivalências automáticas.
- O registry `apps/web/src/lib/data/contextual-offers.ts` e a rota `/ofertas/[offerSlug]` preparam apresentações para essa decisão e as candidatas documentadas. São prévias sem preço/checkout, sem navegação automática do funil e sem comprovação de compra, leitura ou recusa por URL. A página pública do mesmo produto usa copy de descoberta; a contextual pós-compra explica o acréscimo sem dizer que a pessoa já leu a primeira. A revisão de 20/10 isolou toda a família `/ofertas/` da navegação pública e passou a exigir acesso interno para a prévia hospedada; ver `COMMERCIAL_POST_PURCHASE_FLOW_2026-10-20.md`.

| Prévia contextual (`/ofertas/…`) | Momento futuro a comprovar | Situação |
|---|---|---|
| `upsell-birth-chart-life-atlas-post-purchase` | Compra aprovada do titular e elegibilidade | Decisão atual, em preparação |
| `upsell-birth-chart-life-atlas-after-reading-or-theme-choice` | Consumo da leitura ou escolha explícita de temas | Candidata histórica |
| `upsell-three-pillars-birth-chart-after-short-reading` | Consumo da leitura curta | Candidata histórica |
| `upsell-week-reading-solar-return-near-birthday` | Aniversário ou marco pertinente verificável | Candidata histórica |
| `upsell-synastry-couple-dossier-after-reading-with-consent` | Leitura e consentimento para dados do casal | Candidata histórica |
| `upsell-dream-reading-dream-dossier-after-important-dream-marked` | Marcação explícita de um sonho | Candidata histórica |
| `upsell-dream-dossier-dream-atlas-after-two-or-three-records` | Dois ou três registros verificáveis | Candidata histórica |
| `downsell-birth-chart-three-pillars-after-public-offer-declined` | Recusa explícita e alternativa não possuída | Downsell candidato |
| `downsell-dream-dossier-dream-reading-after-public-offer-declined` | Recusa explícita e alternativa não possuída | Downsell candidato |

Todas as nove prévias têm `noindex, nofollow` no HTML inicial, não exibem compra, preço ou checkout e retornam 404 para slug desconhecido. Após a revisão de 20/10, a hospedagem também retorna 404 para visitantes sem acesso interno, mesmo com slug conhecido. A existência da URL não ativa a oferta nem substitui a condição futura. A revisão Playwright inicial cobriu as nove páginas e os tamanhos 320/390/768/1440 px, sem overflow; a revisão posterior está documentada separadamente.

## Validação local

- Catálogo: 19 rotas HTTP 200, slugs canônicos e links internos válidos; 320, 390 e 1440 px sem overflow na revisão visual.
- Minha Área: 62 testes de Dashboard/Biblioteca e 3 cenários Playwright responsivos passaram; screenshots inspecionadas.
- Banco em PGlite: 15 testes passaram, incluindo isolamento da oferta histórica, autorização, estorno, idempotência, rollback e regressões de execução/Diário de Sonhos.
- J04: o teste focal em PGlite passou junto aos dois testes adjacentes de autorização; cobriu transições válidas e inválidas, reabertura de estado terminal, contenção e reversão. A migração ainda não foi aplicada no Supabase hospedado.
- Web: `svelte-check` com 0 erros/0 avisos; 8 testes Vitest de projeção de direitos; Prettier e ESLint passaram para os arquivos desta entrega; `git diff --check` passou. O lint global ainda aponta formatação em `src/lib/server/trial-runtime-handler.spec.ts`, modificação preexistente e não incluída nesta entrega.

Os testes de banco usaram PGlite. Não houve aplicação das migrações no Supabase hospedado nem teste comercial real com Hotmart. A revisão visual local e os testes sintéticos não substituem Gate B/Lab, aprovação editorial pública, aceite E5 do proprietário ou liberação de cobrança.

## Próximas dependências

1. Fechar o contrato J01 de pelo menos uma oferta comercial: versão/ID, preço, termos, checkout Hotmart, direito e prazo, regra de estorno e elegibilidade. A auditoria [J00/J01](COMMERCIAL_J00_J01_AUDIT_2026-10-19.md) detalha o piloto de Carreira e as sequências históricas candidatas.
2. Fechar o contrato de cada aresta candidata e seu gatilho verificável. Para `birth-chart → life-atlas` pós-compra, comprovar pedido `APPROVED` do titular e elegibilidade no servidor; visita à URL não comprova o momento. Para variante pós-leitura, abertura não é consumo integral. Downsells exigem recusa expressa e alternativa não possuída. Até preço, condição e checkout aprovados, as páginas contextuais são apenas apresentações locais.
3. Implementar e validar associação de pedido, processamento/reconciliação Hotmart, direitos de ATV+ e benefícios com proveniência própria, checkout/retorno e trajetos de entrega; então homologar o percurso completo e aplicar as migrações no ambiente autorizado. A auditoria `docs/qa/COMMERCIAL_ATV_PLUS_BENEFIT_ORIGINS_2026-10-19.md` mostra que `purchase_id` prova vínculo com pedido, não assinatura; direito sem compra pode ser concessão privada, não benefício comercial. Os rótulos `ATV+` e `benefício` e o consumo de cotas dependem de origem tipada, ciclo/resgate persistido e evento comercial reconciliado.

Fontes de decisão: `docs/contracts/architecture-offers-20261015.md`, catálogo de domínio, plano externo `C:/ATVNA/docs/30-execucao/PROJETO_JORNADAS_COMERCIAIS_2026-10-19/` e skill `C:/Users/samue/.codex/skills/atvna-web-design/SKILL.md`.
