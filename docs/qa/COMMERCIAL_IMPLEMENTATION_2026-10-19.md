# Jornadas comerciais — entrega local de 19/10/2026

RUN_ID: `ATV-20260902-170644Z-01A0630F`. Escopo: páginas públicas de produto, apresentação de direitos na Minha Área e correção dos gates de autorização existentes. **Estado: implementado e validado localmente; migrações e páginas ainda não liberadas em ambiente hospedado.**

## Entrega verificável

- Os 19 produtos do catálogo vigente têm apresentação pública individual em `/produtos/[slug]`, com copy de descoberta própria, distinção da ferramenta gratuita ou leitura próxima, dados e formatos derivados do contrato. `/leituras` conduz a essas páginas. Ofertas `PREPARING` mostram indisponibilidade e não exibem compra ou preço fictício. O link de ATV+ do catálogo aponta para `/atv-mais`.
- Dashboard e Biblioteca apresentam **Seus acessos** separadamente de leituras concluídas e testes. A projeção considera estado e período do entitlement, compra do próprio usuário, estado da compra e produto da oferta. Compra verificada recebe origem própria; concessão sem vínculo comercial identificável fica neutra, sem se passar por assinatura ou benefício. Falha de consulta fecha a projeção com erro, sem conceder ação.
- A RPC `owned_purchase_offers` resolve apenas pares oferta/produto presentes em compras da conta autenticada, inclusive quando a oferta histórica não é pública. Não expõe código, preço ou oferta de outra pessoa. Migração e rollback têm teste local de transação e isolamento.
- Os gates SQL `request_product_run`, `read_product_request_access` e `save_dream_atlas_entry` revalidam entitlement ativo no período e, para concessão com `purchase_id`, compra `APPROVED` do mesmo usuário e oferta do mesmo produto. Estorno, cancelamento, contestação, pendência e vínculo incoerente não autorizam nova ação. Retentativa idempotente devolve apenas o ID anterior. A migração possui rollback implantado que mantém EXECUTE revogado e forward-fix de contenção sem apagar dados.

## Validação local

- Catálogo: 19 rotas HTTP 200, slugs canônicos e links internos válidos; 320, 390 e 1440 px sem overflow na revisão visual.
- Minha Área: 62 testes de Dashboard/Biblioteca e 3 cenários Playwright responsivos passaram; screenshots inspecionadas.
- Banco em PGlite: 15 testes passaram, incluindo isolamento da oferta histórica, autorização, estorno, idempotência, rollback e regressões de execução/Diário de Sonhos.
- Web: `svelte-check` com 0 erros/0 avisos; 8 testes Vitest de projeção de direitos; Prettier e ESLint passaram para os arquivos desta entrega; `git diff --check` passou. O lint global ainda aponta formatação em `src/lib/server/trial-runtime-handler.spec.ts`, modificação preexistente e não incluída nesta entrega.

Os testes de banco usaram PGlite. Não houve aplicação das migrações no Supabase hospedado nem teste comercial real com Hotmart. A revisão visual local e os testes sintéticos não substituem Gate B/Lab, aprovação editorial pública, aceite E5 do proprietário ou liberação de cobrança.

## Próximas dependências

1. Fechar o contrato J01 de pelo menos uma oferta comercial: versão/ID, preço, termos, checkout Hotmart, direito e prazo, regra de estorno e elegibilidade. A auditoria [J00/J01](COMMERCIAL_J00_J01_AUDIT_2026-10-19.md) detalha o piloto de Carreira e as sequências históricas candidatas.
2. Aprovar o grafo atual de upsell/downsell. A variante contextual do mesmo produto precisa da compra de origem e de contexto verificado pelo servidor; slug ou UTM isolado não dão acesso a condição restrita. Até essa decisão, nenhuma página de upsell/downsell é publicada como se houvesse oferta ativa.
3. Implementar e validar associação de pedido, processamento/reconciliação Hotmart, direitos de ATV+ e benefícios com proveniência própria, checkout/retorno e trajetos de entrega; então homologar o percurso completo e aplicar as migrações no ambiente autorizado.

Fontes de decisão: `docs/contracts/architecture-offers-20261015.md`, catálogo de domínio, plano externo `C:/ATVNA/docs/30-execucao/PROJETO_JORNADAS_COMERCIAIS_2026-10-19/` e skill `C:/Users/samue/.codex/skills/atvna-web-design/SKILL.md`.
