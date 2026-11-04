# P02 — preflight hospedado, somente leitura

Verificado em **04/11/2026, 11:11:48–11:13:49 UTC**, projeto Supabase `irgnhvouvzyoqfmltrna`, pelo MCP dedicado `supabase.execute_sql`. Resultado: **dependências de DDL compatíveis, nenhuma colisão P02 encontrada; aplicação e testes hospedados não executados**. A ordem das três migrations deve ser preservada. Um `db push` genérico deste checkout não está aprovado pelo preflight: o histórico local e o remoto têm versões diferentes e migrations locais adicionais.

Nenhum `INSERT`, `UPDATE`, `DELETE`, DDL, `SET ROLE`, reparo de histórico, criação de branch/projeto ou chamada paga foi executado. Foram consultados catálogos PostgreSQL, definições das duas funções necessárias e agregados de volume, sem retornar identidades, entradas, leituras, tokens ou chaves. A única escrita desta tarefa é este relatório local. A consulta administrativa ocorreu como `postgres`; isso não representa um ensaio de JWT/PostgREST como proprietário.

## Fonte local examinada

| Ordem | Arquivo | SHA-256 da fonte examinada |
| --- | --- | --- |
| 1 | [20261104102635_p02_launch_preparations.sql](../../supabase/migrations/20261104102635_p02_launch_preparations.sql) | `d194b5b5c25461272cfc57948101274973692431ed4fe01b76eaedf9cebd0fa2` |
| 2 | [20261104103423_p02_launch_readings.sql](../../supabase/migrations/20261104103423_p02_launch_readings.sql) | `0ffc8290a0d35459c26c4da6e1c5fc57beb591089e14f12ef616b929f31a52b5` |
| 3 | [20261104110009_p02_launch_feedback.sql](../../supabase/migrations/20261104110009_p02_launch_feedback.sql) | `7fc144f2077d7e58ffc3403317a62492ecfc911af947b719b81cdf29b0f024a9` |

Contratos: [preparation-persistence.md](preparation-persistence.md), [reading-persistence.md](reading-persistence.md), base [20261006140000_private_product_trials.sql:2–18](../../supabase/migrations/20261006140000_private_product_trials.sql). A terceira migration mantém feedback humano separado da revisão editorial automática e da liberação comercial.

## Dependências reais hospedadas

| Verificação de catálogo | Evidência observada | Consequência para P02 |
| --- | --- | --- |
| PostgreSQL | `17.6`, banco `postgres`; linguagem `plpgsql` presente | Tipos UUID/JSONB, checks, policies e triggers usados estão disponíveis. |
| `auth.users(id)` | Coluna `uuid`, chave primária; `postgres` tem `REFERENCES` | Compatível com as três FKs de proprietário. Aplicar com papel de migration, não com `service_role`/cliente. |
| Schemas | `anon`, `authenticated`, `service_role` e `postgres` têm `USAGE` em `public` e `auth`; `postgres` tem `CREATE` em `public` | Funções qualificadas são alcançáveis e o executor administrativo tem o privilégio de schema necessário. Clientes não têm `CREATE`. |
| `auth.uid()` | Função SQL `STABLE`, retorna UUID das claims `sub`; execução efetiva concedida aos papéis necessários | O vínculo de identidade usado nas policies/feedback existe. Não depende de `user_metadata`. |
| `public.has_atv_trial_access()` | SQL `STABLE SECURITY DEFINER`, dono `postgres`, `search_path=''`; `EXECUTE` apenas dono, `authenticated`, `service_role` | Confere `owner_id=auth.uid()`, `revoked_at IS NULL` e expiração nula ou futura. Contrato coincide com P02. `anon` não executa o helper. |
| `public.atv_trial_grants` | RLS habilitada; PK `owner_id uuid`, FK `auth.users`; `created_at`, `expires_at`, `revoked_at` presentes | Os guards de preparação/leitura podem verificar a concessão real. A coluna adicional `owner_evaluation boolean NOT NULL` não muda as colunas nem a semântica consultada. |
| Grants de trials | `authenticated`: `SELECT`; `anon`: sem `SELECT`; `service_role`: `SELECT` efetivo e `BYPASSRLS`; dono `postgres` | `SECURITY INVOKER` dos guards de serviço pode consultar grants; o guard de feedback pode reler a própria leitura sob RLS. |
| Policy de grants | `trial_grant_read`, `SELECT TO authenticated USING (owner_id=auth.uid())` | O helper definer continua responsável pela condição de revogação/expiração; a policy de grants sozinha não a substitui. |
| Papéis | `anon`/`authenticated`: sem superuser ou bypass; `service_role`: sem superuser, com bypass; `postgres`: bypass | As novas tabelas precisam dos `REVOKE`, grants mínimos e guards já contidos nos arquivos; bypass não substitui a validação do trial no escritor. |
| `pgcrypto` | Instalado `1.3`, schema `extensions`; disponível `1.3` | Nenhuma instalação de extensão é necessária. Os digests P02 continuam sendo calculados pelo servidor, não por um algoritmo SQL diferente. |
| `gen_random_uuid()` | Existe em `pg_catalog` e `extensions`; execução efetiva de `authenticated` confirmada | O default de feedback resolve a função nativa. Não é necessário conceder acesso adicional à extensão. |

As tabelas novas revogam explicitamente os grants padrão. Preparação: cliente só lê, serviço insere/calcula uma vez. Leitura: cliente só lê, serviço insere uma entrega imutável. Feedback: cliente recebe somente as colunas de inserção previstas e leitura própria; serviço apenas lê. Os três guards são invoker com `search_path=''`. Essa leitura do SQL e do catálogo valida as dependências, não substitui os testes de autorização de cada tabela após sua criação.

## Histórico e ausência de colisões

- Histórico remoto contém **20 migrations**; a mais recente é `20261104104946_atv_plus_commercial_memberships`.
- Zero registros remotos nas versões `20261104102635`, `20261104103423`, `20261104110009`; zero nomes contendo `p02` ou `launch`.
- Zero relações/índices P02 com os prefixos `atv_launch_`, `launch_preparation`, `launch_reading`, `launch_feedback`; zero funções `guard_atv_launch_preparation()`, `guard_atv_launch_reading()`, `guard_atv_launch_feedback()`.
- O checkout examinado contém **69 arquivos de migration**. Por exemplo, `private_dream_atlas_cycles` usa fonte local `20261015152322`, mas o histórico remoto registra `20261019095922`. P01 também tem fonte e versão remota diferentes, documentadas abaixo. Não há base para fazer replay em massa ou marcar versões como aplicadas apenas para igualar nomes.
- As duas primeiras fontes P02 são anteriores à última versão remota P01; a terceira é posterior. Isso é um cuidado de integração do histórico, não uma dependência de negócio de P02 em memberships.

P01 comprova o padrão já utilizado: fonte aprovada `20261104094016_atv_plus_commercial_memberships.sql`, SHA-256 `73cf089204c374c562d273bed83f4697a5a14f914c9a9b5c82cd405102562818`, aplicada individualmente por MCP como versão remota `20261104104946`. A prova P01 instrui expressamente a não executar `db push` do histórico para reconciliar esses identificadores.

Fontes de continuidade P01: `C:/ATVNA/docs/20-produto/programa-comercial-atvna/P01-atv-mais/EXECUCAO_CHECKPOINT.json:12–19` e `PUBLICACAO_2026-11-04.md:19–22`. Checkpoint atualizado às `11:00:16Z`: janela `P01.04.01` encerrada/liberada em `P01.04.05`, migration remota aplicada, merge `2c4e3c34ae10d1cf314e315cb598cc32b5ba323b`, deploy verificado `SUCCESS`. Os bloqueios de ativação comercial continuam em P01.05.01. A janela anterior não bloqueia mais P02; isso não aprova preços ou vendas.

## Volume e impacto de dados

| Objeto | Medida somente leitura |
| --- | --- |
| Três tabelas P02 | Ausentes; não existe backfill nem dado P02 a transformar nesta migração. |
| `atv_trial_grants` | `COUNT(*)=1`; ativo agora `1`, revogado `0`, expirado `0`; relação total `24.576` bytes. Nenhuma identidade foi retornada. |
| `atv_trial_readings` existente | `pg_stat_user_tables.n_live_tup=1` **estimado**, relação total `909.312` bytes. |
| `atv_trial_feedback` existente | `n_live_tup=0` **estimado**, relação total `32.768` bytes. |

Os bytes incluem índices/TOAST; as duas estimativas de estatística não são contagens exatas de entregas. P02 cria tabelas/índices vazios e FKs para identidades, preparações e leituras; não altera nem recalcula entregas anteriores. Este preflight não mede duração de lock, latência, capacidade de hospedagem ou custo futuro. Não foi iniciado upgrade, compute, plano, branch ou serviço adicional.

## Ordem de aplicação proposta e limites

1. Em uma etapa de aplicação autorizada, reconferir projeto, ausência dos três objetos/nomes e hashes acima. Se o código mudar, este parecer deixa de cobrir os novos bytes.
2. Usar a capacidade dedicada de migration individual, preservando a fonte completa e o vínculo fonte/hash → versão remota efetivamente retornada, conforme o precedente P01. Não usar `execute_sql` para DDL, não reparar versões e não executar o conjunto de 69 migrations deste checkout.
3. Aplicar somente preparação → leitura → feedback. Leitura referencia a preparação; feedback referencia a PK da leitura. Interromper no primeiro erro; não antecipar tabela dependente.
4. Verificar imediatamente cada registro de histórico, colunas/checks/FKs, RLS, policies, grants efetivos, search paths e triggers. Confirmar que nenhuma flag ou estado comercial foi aberto. Um ensaio com identidade/JWT real exigirá a etapa hospedada própria; não foi feito neste preflight somente leitura.
5. Persistir as evidências de aplicação/postflight separadamente. Somente depois considerar as rotas hospedadas correspondentes disponíveis. Para fechamento de acesso, os forward-fixes locais preservam dados; sua existência não constitui autorização para executá-los agora.

**Bloqueador técnico de dependência encontrado: nenhum.** Ressalva concreta: **histórico divergente impede recomendar `db push` genérico**. Nenhuma migration P02 está hospedada e nenhuma leitura P02 foi validada em produção nesta tarefa. O resultado libera a discussão de uma aplicação individual ordenada; não declara E5, homologação de precisão, aprovação de proprietário, preço ou ativação comercial.

## Método de verificação e documentação oficial

Consultas exclusivamente `SELECT` em `pg_proc`, `pg_namespace`, `pg_roles`, `pg_class`, `pg_attribute`, `pg_constraint`, `pg_policies`, `pg_available_extensions`, `pg_extension`, `pg_language`, `pg_stat_user_tables`, `supabase_migrations.schema_migrations`; `has_*_privilege`, `pg_get_functiondef` apenas para `auth.uid` e `has_atv_trial_access`; um agregado de `atv_trial_grants`. Não foram consultados corpos de inputs/readings/feedback nem tabelas de segredos. Não houve necessidade de extrair credenciais ou usar browser.

Skill aplicada: `C:/Users/samue/.codex/plugins/cache/openai-curated-remote/supabase/1.0.0/skills/supabase/SKILL.md`. Documentação consultada via MCP: [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security), [Tables and data](https://supabase.com/docs/guides/database/tables), [db push](https://supabase.com/docs/reference/cli/supabase-db-push), [CLI workflows](https://supabase.com/docs/guides/local-development/cli-workflows). O CLI Supabase não estava no `PATH`; o acesso MCP ao projeto foi bem-sucedido e suficiente para este escopo.

[Changelog oficial](https://supabase.com/changelog.md) lido nesta auditoria: aviso de `30/10/2026` sobre tzdata em versões anteriores a `15.19.0.003`/`17.11.0.003`, para Vancouver, Edmonton e Casablanca. Não altera os requisitos dos três DDLs, que usam `timestamptz`/`now()` e não fazem conversão de horário civil desses locais. O servidor observado `17.6` não foi atualizado por esta tarefa; este preflight não homologa seu uso para cálculos temporais externos ao escopo.
