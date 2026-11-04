# P02 — schema hospedado

Aplicado em 04/11/2026 por `supabase.apply_migration`, no projeto existente `irgnhvouvzyoqfmltrna`, na janela P02.03.01. As três chamadas retornaram `success: true`, na ordem abaixo. Não houve `db push`, reparo de histórico, backfill, concessão de acesso, nova infraestrutura, cobrança ou criação de identidades.

| Arquivo de origem | SHA256 do arquivo | Versão remota efetiva |
|---|---|---|
| `20261104102635_p02_launch_preparations.sql` | `d194b5b5c25461272cfc57948101274973692431ed4fe01b76eaedf9cebd0fa2` | `20261104112718` |
| `20261104103423_p02_launch_readings.sql` | `0ffc8290a0d35459c26c4da6e1c5fc57beb591089e14f12ef616b929f31a52b5` | `20261104112739` |
| `20261104110009_p02_launch_feedback.sql` | `7fc144f2077d7e58ffc3403317a62492ecfc911af947b719b81cdf29b0f024a9` | `20261104112801` |

O MCP atribuiu as versões remotas no momento da aplicação. Os nomes são, respectivamente, `p02_launch_preparations`, `p02_launch_readings`, `p02_launch_feedback`. Preservar este mapeamento ao reconciliar o histórico; não repetir as migrations de origem nem reparar versões automaticamente. O preflight e a divergência anterior estão em [hosted-preflight.md](hosted-preflight.md).

## Verificação após aplicação

Consulta somente leitura ao catálogo confirmou as três versões, três tabelas com RLS ativo e políticas de proprietário: uma em preparação, uma em leitura e duas em feedback. `anon` não tem SELECT. `authenticated` tem SELECT e não tem UPDATE/DELETE. `service_role` pode inserir preparação/leitura, mas não feedback. Em feedback, INSERT autenticado fica limitado a `request_key`, `preparation_id`, `owner_id`, `reading_digest`, `decision`, `comment`; o cliente não pode definir `id` nem `created_at`.

Contagens após a aplicação: **zero preparações, zero leituras, zero feedbacks**. Não foram lidas entradas ou identidades privadas. A verificação por catálogo não substitui autenticação real/PostgREST ou aceite E5. Os testes locais de RLS, cálculo, gravação e reabertura permanecem identificados separadamente em [feedback-persistence.md](feedback-persistence.md) e [security-review.md](security-review.md).

As três migrations têm rollback de desativação em `supabase/rollbacks`, preservando os registros e fechando permissões. Nenhum rollback foi executado. A disponibilidade comercial dos onze produtos continua `PREPARING`, com preço/custo desconhecidos e sem oferta de cobrança configurada. A aplicação do schema não constitui publicação do front-end, compra homologada ou liberação comercial.
