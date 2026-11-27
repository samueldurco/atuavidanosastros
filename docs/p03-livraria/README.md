# Livraria ATVNA — preparação do lançamento

A página pública fica em `/loja/livraria`. O catálogo, as fichas e os testes do clube ficam em `/loja/livraria/previa`. A API e as capas privadas usam `/api/livraria/previa`.

## Acesso e persistência

O servidor exige uma sessão Supabase não anônima, confirmada também por `getUser`, e um UUID em `LIVRARIA_PREVIEW_OWNER_IDS` ou email confirmado na lista administrativa existente `ADMIN_EMAIL_ALLOWLIST`. Sessões e listas ficam fora do cliente. HTML, dados SSR, API e capas usam `private, no-store` e `noindex, nofollow`.

A migração `20261126125656_p03_preview.sql` cria somente `p03_preview_accounts`. A tabela tem RLS e nenhum grant para clientes. Após autorizar a conta, o servidor usa `SUPABASE_SERVICE_ROLE_KEY` e filtra todas as operações por proprietário. Atualizações usam versão e confirmação idempotente. O rollback correspondente foi testado com reaplicação.

## Simulações

Os 21 metadados refletem o inventário editorial, com capas provisórias, manuscritos em reescrita e direitos pendentes de revisão para o lançamento. A primeira edição do clube tem identidade própria e conteúdo adicional proposto; o livro regular continua separado.

Preços, cenários ATV+, fretes por faixa de CEP, pagamentos, rastreios e remessas são fixtures identificadas. As simulações não escrevem nas tabelas comerciais, não concedem benefícios, não chamam provedores de pagamento ou impressão e sempre retornam `commercialEnabled: false`. O clube usa cartão simulado pelo ciclo completo; renovar exige autorização expressa. Os ciclos geram três ou doze competências, com a mesma edição no mesmo mês.

Lulu foi retirada desta etapa pelo proprietário. Hotmart continua sendo a autoridade comercial do ATVNA, sem ativação de venda nesta entrega. A homologação externa e os custos industriais permanecem separados dos testes de jornada.

## Verificação

O teste `src/lib/server/livraria/preview.test.ts` cobre domínio, isolamento, concorrência, migração e rollback. Os arquivos `tests/p03-bookshop-{public,private}.e2e.ts` cobrem a interface local e são executados pelo CI. O transporte sintético fica exclusivamente em `scripts/helpers/bookshop-e2e-transport.mjs`.

`node scripts/p03-hosted-verify.mjs --help` descreve a conferência HTTP da publicação real, com contas sintéticas autorizada e negada e segredos externos ao repositório. O relatório também deve ficar fora do repositório e não contém credenciais ou dados pessoais.

RUN_ID: `ATV-20260902-170644Z-01A0630F`. O log e as evidências de execução são canônicos em `C:/ATVNA/docs/20-produto/programa-comercial-atvna/P03-livraria-ceu-de-papel/`.
