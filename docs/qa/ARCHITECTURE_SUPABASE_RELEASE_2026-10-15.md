# Preparação da publicação Supabase da arquitetura

Estado: preparada localmente; **nenhuma mutação hospedada autorizada por esta nota**. O executor principal sinaliza a publicação após gates e CI do SHA final. Projeto: `irgnhvouvzyoqfmltrna`. Usar MCP autenticado; o CLI Supabase 2.116.0 instalado não possui token. Não pedir segredos no chat nem abrir painel/browser. Não usar `db push`: existem migrações históricas locais que não fazem parte desta entrega.

## Evidência anterior à mudança

Em 15/10/2026 o projeto estava saudável, com 13 migrações hospedadas. A última era `20261013145855_free_tool_auth_delete_cascade`. Os objetos de grants, leituras, sonhos e resultados gratuitos e `has_atv_trial_access()` existem. A função histórica `product_continuity_text_valid(text,integer)` **não existe**: a migração do Diário foi corrigida para incluir seu próprio `private_dream_atlas_text_valid`, sem executar a migração histórica de continuidade. O teste do Diário precisa passar a partir desse baseline (10/10 em `f5b8a6c`).

Funções anteriores: `atv-trial-runtime` v15, JWT ativado, SHA ezbr `e4e9bb095caaa8610a5d543b837bef502ab2c202532fa041a76f1d840816e61d`; `atv-free-tools-runtime` v3, JWT desativado como já publicado, SHA ezbr `5cd97db6625785c530ffc6abaa4bd2eeb4321006efe2477710160e8a8b85322d`. Reconsultar antes de publicar; não presumir ausência de outro executor.

Advisors anteriores: segurança INFO `rls_enabled_no_policy` (13), WARN `anon_security_definer_function_executable` (1), `authenticated_security_definer_function_executable` (6), `auth_leaked_password_protection` (1). Performance INFO `unindexed_foreign_keys` (13), `unused_index` (6), WARN `auth_rls_initplan` (9). Comparar o delta após DDL; não confundir achado preexistente com regressão nem habilitar escrita para eliminar alerta de RLS sem política. Referências: [Database Advisor](https://supabase.com/docs/guides/database/database-advisors), [proteção de senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

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
6. Comunicar ao executor principal as versões/hashes hospedados para publicar Pages pelo processo vigente. Após o deployment, conferir `/api/health`, `/api/private-trials/health`, proteção de acesso anônimo e ferramenta gratuita real. A avaliação completa exige sessão real do proprietário: gerar, salvar, reabrir e baixar uma leitura; exercitar os três planos e limite excedido; Diário cria período real de 30 dias e recusa síntese antecipada. Fixtures locais não comprovam esse percurso. Não simular login do proprietário por SQL.

CLI alternativo, **somente se autenticado por mecanismo dedicado**, conforme `supabase functions deploy --help` e [documentação oficial](https://supabase.com/docs/guides/functions/deploy):

```powershell
pnpm exec supabase functions deploy atv-trial-runtime --project-ref irgnhvouvzyoqfmltrna --use-api
pnpm exec supabase functions deploy atv-free-tools-runtime --project-ref irgnhvouvzyoqfmltrna --use-api --no-verify-jwt
```

Não usar o CLI como substituto silencioso quando o MCP retorna erro de autorização. A publicação de migrations segue [a orientação de migrações Supabase](https://supabase.com/docs/guides/deployment/database-migrations), mas nesta entrega aplica somente a lista explícita acima.

## Recuperação sem apagar dados

Se houver falha em uma migration, interromper a sequência, consultar o estado real e executar correção aditiva; não aplicar as seguintes por tentativa. Se o resultado da chamada for desconhecido, investigar antes de repetir. Para incidente de avaliação, executar em transação `supabase/rollback/20261015145546_atv_plus_owner_simulation.sql`: revoga a marca de avaliação, cancela ciclos e fecha RPC de abertura, mantendo leituras recebidas. Para fechar escrita do Diário, usar `supabase/rollbacks/20261015152322_private_dream_atlas_cycles.sql`: preserva ciclos, relatos e leituras, revogando as três RPCs de mutação. Os guards de síntese permanecem.

Manter a allowlist expandida de ferramentas gratuitas; não estreitar a constraint se já existirem novos registros. As colunas e IDs aditivos são compatíveis com o frontend anterior. Em falha de runtime, redeploy dos arquivos capturados antes da mudança com o mesmo JWT; isso cria nova versão equivalente, sem apagar função. Coordenar recuperação Pages com o executor principal para não deixar cliente novo sobre runtime antigo. Nunca apagar relatos, ciclos ou leituras como rollback. Cobrança, preços e publicação comercial continuam desligados.
