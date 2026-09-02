# ADR 0002 — Ambientes e custo

- Estado: aceito
- Data: 2026-09-02

## Decisão

- Produção: Supabase Free `irgnhvouvzyoqfmltrna` em `sa-east-1`.
- Desenvolvimento e staging de dados: Supabase CLI local com seeds sintéticos.
- Staging de frontend: previews do Cloudflare Pages, com `noindex` e sem secrets de produção.
- Custo fixo e gasto automático: R$ 0.
- Nenhum upgrade, add-on, billing ou domínio novo pode ser ativado automaticamente.

## Isolamento

Produção, preview e local usam secrets e dados distintos. O projeto LUMINARA não participa da arquitetura e não pode ser alterado.

## Limitação conhecida

Preview de frontend não é um banco remoto de staging. Jornadas de dados são validadas localmente até existir um terceiro ambiente gratuito ou autorização para outro arranjo.

