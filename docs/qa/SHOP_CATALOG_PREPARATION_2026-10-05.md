# WU227 — Loja dos Signos: base privada de curadoria

RUN_ID `ATV-20260902-170644Z-01A0630F`. Requisito: plano mestre §8.1, catálogo mestre, taxonomia, coleções e 12 vitrines por signo. A Loja pública permanece em preparação conforme §8.2.

## Entrega local

- Migração `20261005130000_shop_catalog_preparation.sql`: candidatos de item, categoria/coleção e vínculos por signo, sem registros iniciais. Os cinco tipos de candidato correspondem aos templates futuros simples, variante, personalizado, membro e externo; a disponibilidade é decisão posterior.
- Estados limitados a `DRAFT` e `REVIEW`. Não há estado publicado, preço, estoque, checkout nem política de leitura por `anon`/`authenticated`; grants de cliente são revogados. Somente `service_role` pode curar candidatos. Assim, um rascunho não se torna oferta pública por engano.
- `disable_shop_catalog_preparation.sql` é o forward-fix reversível para revogar o acesso do servidor aos quatro conjuntos de dados sem apagá-los.

## Prova e limites

`node --test scripts/shop-catalog-db.test.mjs`: 1/1 PASS em PostgreSQL WASM. Testou catálogo inicialmente vazio, leitura negada para clientes, vínculos de categoria/signo, recusa de estado `ACTIVE` e signo inválido, além do forward-fix com dados preservados. `git diff --check`: PASS. Isso é validação local sintética, não prova de migração, RLS/JWT ou operação hospedada no Supabase pausado.

Categoria/coleção reais, fornecedores, SKU, preços, variantes, estoque, frete, políticas e aprovação editorial/comercial ainda faltam. Os responsáveis por curadoria, comercial e jurídico devem definir esses insumos antes de qualquer leitura pública, página de produto ou checkout físico. A flag `FEATURE_PHYSICAL_CHECKOUT` permanece desligada. Próxima WU independente: Gate B da Loja em preparação, com aceite visual local e sem ofertas fictícias.
