# Preparação da publicação Supabase da arquitetura

Estado: preparada localmente; **nenhuma mutação hospedada autorizada por esta nota**. O executor principal sinaliza a publicação após gates e CI do SHA final. Projeto: `irgnhvouvzyoqfmltrna`. Usar MCP autenticado; o CLI Supabase 2.116.0 instalado não possui token. Não pedir segredos no chat nem abrir painel/browser. Não usar `db push`: existem migrações históricas locais que não fazem parte desta entrega.

## Evidência anterior à mudança

Em 15/10/2026 o projeto estava saudável, com 13 migrações hospedadas. A última era `20261013145855_free_tool_auth_delete_cascade`. Os objetos de grants, leituras, sonhos e resultados gratuitos e `has_atv_trial_access()` existem. A função histórica `product_continuity_text_valid(text,integer)` **não existe**: a migração do Diário foi corrigida para incluir seu próprio `private_dream_atlas_text_valid`, sem executar a migração histórica de continuidade. O teste do Diário precisa passar a partir desse baseline (10/10 em `f5b8a6c`).

Funções anteriores: `atv-trial-runtime` v15, JWT ativado, SHA ezbr `e4e9bb095caaa8610a5d543b837bef502ab2c202532fa041a76f1d840816e61d`; `atv-free-tools-runtime` v3, JWT desativado como já publicado, SHA ezbr `5cd97db6625785c530ffc6abaa4bd2eeb4321006efe2477710160e8a8b85322d`. Reconsultar antes de publicar; não presumir ausência de outro executor.

Advisors anteriores: segurança INFO `rls_enabled_no_policy` (13), WARN `anon_security_definer_function_executable` (1), `authenticated_security_definer_function_executable` (6), `auth_leaked_password_protection` (1). Performance INFO `unindexed_foreign_keys` (13), `unused_index` (6), WARN `auth_rls_initplan` (9). Comparar o delta após DDL; não confundir achado preexistente com regressão nem habilitar escrita para eliminar alerta de RLS sem política. Referências: [Database Advisor](https://supabase.com/docs/guides/database/database-advisors), [proteção de senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Escopo auditado dos testes do proprietário

Na revisão somente leitura de 15/10/2026, as 19 ofertas de `offeredProductIds` possuem cálculo, composição e revisão no caminho privado. As evidências locais existentes em `apps/web/.trial-qa/` registram as 19 aprovações no escopo `private-free-test`. Isso comprova a execução das entradas sintéticas avaliadas; não representa E5, aprovação pessoal do proprietário nem liberação hospedada. Os motores opt-in usados pelo teste privado são distintos do registry comercial padrão: os 18 casos indisponíveis desse registry não impedem o teste privado nem autorizam venda.

O Dossiê de Sonhos exige de um a três registros anteriores da própria conta e consentimento. O Diário permite iniciar o período e registrar sonhos imediatamente, mas sua análise pessoal integrada exige os 30 dias reais persistidos; a marca de proprietário não antecipa esse prazo. A rota de exemplo final usa dados fictícios identificados e não substitui o ciclo pessoal. As demais ofertas conservam validação dos dados, consentimentos aplicáveis e revisão automática antes da entrega.

`owner_evaluation=true` não concede acesso isoladamente: exige a conta Google correta e grant ativo, não revogado e dentro da validade. Os testes completos das 19 ofertas ficam separados das quotas do simulador ATV+. Antes da liberação, verificar novamente a identidade nominal e os grants ativos para preservar a exclusividade solicitada. Ainda são necessárias as três migrações abaixo, os runtimes e Pages atualizados, a operação nominal e a validação com sessão real; nenhum bloqueador adicional de motor foi identificado nesta revisão.

## Congelamento local

O template nominal tem teste isolado, com identidades sintéticas e banco descartável: `node --test scripts/architecture-owner-evaluation-db.test.mjs` (3/3). Ele cobre conta não verificada, ausência de identidade Google, grant ausente/revogado/expirado, segunda conta proprietária, idempotência e preservação da validade. A operação serializa tentativas concorrentes pelo mesmo procedimento com um lock transacional; esse teste não é uma prova da sessão real do proprietário.

No worktree limpo, após gates do SHA exato:

```powershell
node scripts/prepare-architecture-supabase-release.mjs <SHA_APROVADO_DE_40_CARACTERES>
```

O script exige HEAD correspondente e Git limpo, constrói ambos os bundles com os scripts existentes, verifica novamente Git e salva em `test-results/supabase-release-<sha12>/` três payloads de migration, dois payloads de função e `manifest.json` com hashes. Não acessa provedor, credencial ou conta. Não versionar os payloads gerados. Cada payload de função contém `index.ts`, `runtime.js` e a configuração Deno, se existente. Não exibir conteúdo dos bundles na conversa. O diretório só é candidato válido se o script terminar com sucesso e o manifest existir.

## Sequência hospedada, depois da sinalização

1. Reconsultar projeto, migrations, objetos/privilégios e versões das funções. Recuperar as duas funções atuais com `get_edge_function`, guardar os arquivos e `verify_jwt` em evidência privada para redeploy de recuperação. Não alterar secrets; registrar somente metadados e hashes. Confirmar a identidade nominal usando a concessão canônica `PRODUTOS-TESTE-LIBERADOS-20261006` do log mestre, sem imprimir email/UUID. A identificação deve bater com a conta Google confirmada e o grant ativo; unicidade de grant, sozinha, não identifica o proprietário.
2. Aplicar, sequencialmente, via `apply_migration({project_id,name,query})`, os payloads abaixo. O MCP gera o timestamp hospedado: registrar o mapeamento entre `name`, versão retornada, arquivo local e SHA-256. Se o resultado for ambíguo, consultar `list_migrations` e objetos antes de qualquer repetição. Não alterar versões históricas nem executar `migration repair` para mascarar divergência.

| Ordem | Arquivo local                                      | Nome MCP                        |
| ----- | -------------------------------------------------- | ------------------------------- |
| 1     | `20261015145546_atv_plus_owner_simulation.sql`     | `atv_plus_owner_simulation`     |
| 2     | `20261015145634_expanded_free_tool_result_ids.sql` | `expanded_free_tool_result_ids` |
| 3     | `20261015152322_private_dream_atlas_cycles.sql`    | `private_dream_atlas_cycles`    |

3. Verificar DDL/RLS/privilégios antes de conceder acesso: `owner_evaluation` default false; nenhuma conta habilitada automaticamente; allowlists incluem legado e novos IDs; `atv_plus_test_cycles`, `atv_plus_test_uses` e `atv_trial_dream_cycles` têm RLS; `authenticated` não possui INSERT/UPDATE/DELETE direto nas tabelas protegidas; RPCs públicas são restritas a authenticated; helper privado do Diário não é executável por anon/authenticated/service_role; triggers e FKs permanecem ativos. Conferir os nomes exatos na migration. Rodar advisors e revisar o delta. Não criar leituras fictícias no banco real para validar.
4. Publicar `atv-trial-runtime` com `deploy_edge_function` usando o payload congelado e `verify_jwt:true`; depois `atv-free-tools-runtime` com `verify_jwt:false`, preservando a configuração existente da função pública. Reconsultar status ACTIVE, versão e JWT; inspecionar logs de erro. `ATV_TRIAL_RUNTIME_KEY`, sua chave de rotação e `FREE_TOOL_RECEIPT_KEY` permanecem como bindings existentes, nunca dentro dos arquivos enviados. Não usar deploy sem slug nem `--prune`.
5. Conceder a avaliação nominal por operação separada: em uma transação, definir `atvna.release_owner_id` via `set_config(...,true)` com o UUID obtido/confirmado privadamente e executar `supabase/operations/architecture-owner-evaluation.sql`. Usar `DO ... PERFORM set_config(...)` para não retornar o valor. O template falha sem dono verificado, exige grant existente/ativo e conta Google confirmada, recusa outra conta já habilitada e altera exatamente uma linha. Não criar grants novos, estender validade, reativar revogação ou incluir identidade em fixtures. Conferir apenas contagens e booleans.
6. Comunicar ao executor principal as versões/hashes hospedados para publicar Pages pelo processo vigente, executando o preflight e o postflight versionados abaixo. Após o deployment, conferir também `/api/health` e uma ferramenta gratuita real. A avaliação completa exige sessão real do proprietário: gerar, salvar, reabrir e baixar uma leitura; exercitar os três planos e limite excedido; Diário cria período real de 30 dias e recusa síntese antecipada. Fixtures locais não comprovam esse percurso. Não simular login do proprietário por SQL.

## Gate de publicação Pages

Após os gates e CI do SHA final, executar na raiz do candidato com o Wrangler autenticado:

```powershell
pnpm release:pages:preflight
```

O preflight é somente leitura. Confere o projeto e a URL Supabase em `apps/web/wrangler.jsonc`, o ambiente de produção e os gates de gasto zero e features desligadas. Com o Wrangler fixado em 4.129.1, consulta `pages secret list --env production`: a listagem só inclui bindings `secret_text`. Exige uma das chaves públicas de autenticação (`PUBLIC_SUPABASE_ANON_KEY` ou `PUBLIC_SUPABASE_PUBLISHABLE_KEY`), mais os bindings de serviço, runtime e recibo. A chave pública deve permanecer como secret de produção no Pages; não adicioná-la ao mapa `vars` nem usar opções de preservação de variáveis específicas de Workers como substituto. O relatório apresenta apenas nomes de checks, booleans e status; não imprime valores nem a saída do provedor.

Com o preflight aprovado, publicar pelo processo Pages já autorizado e registrar o SHA/deployment. Em seguida executar:

```powershell
pnpm release:pages:postflight
```

O postflight exige HTTP 200 e os indicadores de configuração/autenticação em `/api/private-trials/health`; exige HTTP 401 JSON dos POSTs anônimos de salvar ferramenta e iniciar Diário. Não envia cookies, não segue redirecionamentos nem repete chamadas. O preflight tem limite de 30 segundos para o CLI e cada sonda HTTP tem limite de 15 segundos. Ambos os comandos precisam terminar com `pass: true` e código zero; uma falha interrompe a liberação até diagnóstico e correção. Os comandos não fazem deploy, não alteram grants e não substituem os demais gates.

A presença de um secret não comprova seu valor nem o pareamento da chave com a URL. Health e proteção anônima também não comprovam salvar/reabrir com sessão. A prova hospedada separada com conta sintética isolada, grant de avaliação autorizado e limpeza verificada continua necessária; seu acesso de avaliação não representa direito comercial Hotmart. A sessão pessoal do proprietário continua sendo validada pelo próprio proprietário, sem impersonação por SQL.

CLI alternativo, **somente se autenticado por mecanismo dedicado**, conforme `supabase functions deploy --help` e [documentação oficial](https://supabase.com/docs/guides/functions/deploy):

```powershell
pnpm exec supabase functions deploy atv-trial-runtime --project-ref irgnhvouvzyoqfmltrna --use-api
pnpm exec supabase functions deploy atv-free-tools-runtime --project-ref irgnhvouvzyoqfmltrna --use-api --no-verify-jwt
```

Não usar o CLI como substituto silencioso quando o MCP retorna erro de autorização. A publicação de migrations segue [a orientação de migrações Supabase](https://supabase.com/docs/guides/deployment/database-migrations), mas nesta entrega aplica somente a lista explícita acima.

## Revalidação somente leitura em 19/10/2026

Preflight às 09:07 UTC: projeto `ACTIVE_HEALTHY`, PostgreSQL `17.6.1.166`, mesmas 13 migrações e mesma última versão `20261013145855`. As duas funções permanecem ACTIVE, com as versões, JWT e hashes ezbr de 15/10 acima. As três migrações da reforma continuam pendentes: a coluna `owner_evaluation` e as três tabelas novas ainda não existem. O guard legado de testes existe; o helper histórico de texto permanece ausente, conforme o baseline já coberto pela migração do Diário.

A identidade foi reconciliada com o arquivo operacional nominal da concessão original, preservado fora do Git; a consulta retornou uma conta correspondente, Google confirmado e grant ativo. Não se presumiu titularidade apenas por haver uma única concessão. Nenhum UUID/email foi incluído nesta nota. Nenhuma concessão ou dado foi alterado.

Backups completos dos dois runtimes, payloads prontos para redeploy de recuperação, estado remoto e manifest com SHA-256 estão no diretório ignorado `test-results/supabase-preflight-20261019/`. `manifest.json` registra os arquivos e hashes; `nominal-owner.private.json` é evidência privada e não deve ser exibido ou versionado. A preservação em disco e a exclusão pelo Git foram verificadas. O backup não constitui publicação dos novos runtimes.

Advisors de segurança e performance têm exatamente os mesmos tipos, severidades e contagens do baseline de 15/10. Não apareceu regressão de schema entre as datas. O changelog oficial foi conferido: a remoção futura de cifras TLS legadas em novembro e os avisos da atualização PostgreSQL não alteram esta sequência de release; não houve upgrade de banco, mudança de TLS ou extensão nesta etapa. Referências: [TLS](https://supabase.com/changelog/cbc-tls-ciphers-deprecated) e [PostgreSQL](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes).

Próximo passo: aguardar CI do SHA final, congelar o candidato com o preparador local e seguir a sequência hospedada acima. Nenhuma mutação hospedada foi executada neste preflight.

## Recuperação sem apagar dados

Se houver falha em uma migration, interromper a sequência, consultar o estado real e executar correção aditiva; não aplicar as seguintes por tentativa. Se o resultado da chamada for desconhecido, investigar antes de repetir. Para incidente de avaliação, executar em transação `supabase/rollback/20261015145546_atv_plus_owner_simulation.sql`: revoga a marca de avaliação, cancela ciclos e fecha RPC de abertura, mantendo leituras recebidas. Para fechar escrita do Diário, usar `supabase/rollbacks/20261015152322_private_dream_atlas_cycles.sql`: preserva ciclos, relatos e leituras, revogando as três RPCs de mutação. Os guards de síntese permanecem.

Manter a allowlist expandida de ferramentas gratuitas; não estreitar a constraint se já existirem novos registros. As colunas e IDs aditivos são compatíveis com o frontend anterior. Em falha de runtime, redeploy dos arquivos capturados antes da mudança com o mesmo JWT; isso cria nova versão equivalente, sem apagar função. Coordenar recuperação Pages com o executor principal para não deixar cliente novo sobre runtime antigo. Nunca apagar relatos, ciclos ou leituras como rollback. Cobrança, preços e publicação comercial continuam desligados.
