# P02 — persistência privada de preparação e fatos

RUN_ID `ATV-20260902-170644Z-01A0630F`, 04/11/2026. A skill `supabase` foi aplicada a esta alteração. A migration foi criada com `pnpm exec supabase migration new p02_launch_preparations`, CLI instalada 2.116.0, após consultar `--help`; não foi aplicado SQL em ambiente hospedado.

## Contrato

`public.atv_launch_preparations` é separada de `atv_trial_readings`, direitos comerciais e entrega aprovada. Guarda UUIDv4 de execução, proprietário com FK para `auth.users`, chave UUID do pedido, ID de um dos onze lançamentos, entrada JSON versionada, digest SHA-256 em hexadecimal minúsculo, evidência JSON versionada, estado e data. `unique(owner_id,request_key)` estabelece idempotência por proprietário; repetir a chave não altera o primeiro payload. O servidor deve comparar a entrada/digest existente antes de tratar uma repetição com dados diferentes como o mesmo pedido.

O banco verifica objeto/versão/produto/consentimento/answers da entrada, confirmação adulta explícita nos dois produtos adultos e tamanho em bytes do JSON, incluindo texto repetitivo. A validação semântica de datas, coordenadas, chaves por produto, narrativas e consentimento permanece em `parseLaunchInput`. O servidor calcula o digest canônico; o banco valida seu formato e o vínculo com a evidência. JSONB serializado pelo PostgreSQL não substitui a canonicalização do domínio.

Somente estes estados existem:

- `AWAITING_CALCULATION`: evidência `atv-launch-evidence/1`, entrada declarada, nenhum cálculo ou tiragem presumidos.
- `FACTS_READY_AWAITING_REVIEW`: evidência `atv-launch-calculation/1`, fatos específicos de um dos onze produtos persistidos e ainda aguardando revisão editorial. Não é interpretação aprovada.

`evidence.executionId`, `productId`, `inputDigest` e `state` precisam coincidir com as colunas. Somente inserção no primeiro estado é permitida. A única atualização passa do primeiro para o segundo estado, sem alterar entrada, identidade, pedido, produto, digest ou data. Uma segunda atualização não pode substituir a primeira evidência. A API deve filtrar `id + owner_id + status=AWAITING_CALCULATION`; corrida posterior recebe zero linhas e precisa reler a evidência vencedora, sem entregar sua cópia transitória. O teste local verifica esta semântica sequencial de compare-and-set; não simula conexões HTTP concorrentes hospedadas.

## Acesso e revogação

RLS permite `SELECT` a `authenticated` apenas quando `owner_id=auth.uid()` e `has_atv_trial_access()` é verdadeiro. A função de acesso existente consulta a concessão no banco; autorização não depende de metadado editável do usuário. Grants herdados da plataforma são revogados explicitamente. `anon` não recebe acesso; `authenticated` recebe só `SELECT`; `service_role` recebe `SELECT, INSERT, UPDATE`, sem `DELETE`/`TRUNCATE`.

O trigger usa `SECURITY INVOKER`, `search_path=''` e referências qualificadas. Escritas privilegiadas também conferem concessão atual, expiração e revogação. Revogar ou expirar a concessão oculta os registros e impede novas preparações/cálculos; restaurar o acesso preserva os dados. A credencial de serviço continua apenas no servidor, após `trialIdentity` e validação; o acesso do navegador não pode escolher proprietário ou estado autoritativos.

## Verificação e limites

Comando executado:

`node --test scripts/p02-launch-preparations-db.test.mjs scripts/migration-versions.test.mjs`

Resultado: **10 testes aprovados**, incluindo isolamento entre proprietários, anon, privilégios de escrita, repetição sem sobrescrita, envelope/inconsistências/limites, adultos, imutabilidade, transição única, bloqueio por revogação/expiração e forward-fix. PGlite executa PostgreSQL/RLS real descartável com identidades e sessão sintéticas. Não comprova JWT, PostgREST, infraestrutura hospedada ou deploy.

`pnpm exec supabase db advisors --local --type security --level warn --fail-on error` não conseguiu conectar a `127.0.0.1:54322`: não havia cluster Supabase local ativo. Nenhum advisors hospedado foi executado e esse resultado não deve ser descrito como auditoria limpa do ambiente. Revisão local: tabela exposta com RLS, grants explícitos, proprietário + concessão, nenhuma view, nenhuma função `SECURITY DEFINER` nova, nenhuma credencial, nenhum dado real e nenhum provedor pago.

O changelog foi consultado em 04/11/2026. Foram examinadas as mudanças de [PostgreSQL 15.19/17.11](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes) e [cifras TLS CBC](https://supabase.com/changelog/cbc-tls-ciphers-deprecated): a tabela nova não utiliza índices `ltree`/`btree_gist`, criptografia PGP legada ou operadores customizados, e esta execução não altera clientes TLS. RLS e grants seguem a distinção entre acesso ao objeto e acesso às linhas das [instruções de segurança da Data API](https://supabase.com/docs/guides/api/securing-your-api) e da [documentação de RLS](https://supabase.com/docs/guides/database/postgres/row-level-security). A checagem é referente a esta mudança local, não uma certificação do projeto remoto.

## Forward-fix

`supabase/rollbacks/20261104102635_p02_launch_preparations.sql` revoga acesso do cliente e do escritor sem apagar entradas ou evidências. O teste aplica o arquivo e confirma dados preservados e operações bloqueadas. Usar esse caminho se a superfície precisar ser fechada; restauração requer migration revisada que restabeleça os grants e políticas esperados. Não apagar a tabela como rollback automático. Não alterar scripts de deploy nem marcar esta migration como aplicada remotamente sem a etapa própria de liberação.
