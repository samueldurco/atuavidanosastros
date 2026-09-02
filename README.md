# A Tua Vida nos Astros

Plataforma editorial, interpretativa e transacional de autoconhecimento, construída como monorepo TypeScript.

## Estrutura

- `apps/web`: SvelteKit SSR para Cloudflare Pages.
- `apps/worker`: processador idempotente de jobs e reconciliações.
- `packages/domain`: contratos e máquinas de estado do negócio.
- `packages/ui`: tokens e contratos do Atlas Essencial Digital Product System.
- `packages/astrology`: abstração de efemérides e cálculo reproduzível.
- `packages/ai`: gateway, schemas e política de uso de IA.
- `packages/content`: modelos editoriais e SEO.
- `packages/integrations`: adaptadores externos.
- `packages/observability`: eventos, correlação e redaction.
- `packages/testing`: fixtures e utilitários determinísticos.
- `supabase`: configuração, migrations e seed sintético local.

## Desenvolvimento

Pré-requisitos: Node 22+, pnpm 11 e um runtime compatível com Docker para o Supabase local.

```bash
pnpm install
pnpm check
pnpm test:unit
pnpm dev
```

Copie `.env.example` para um arquivo local ignorado pelo Git e preencha os valores somente pelo fluxo seguro do ambiente. O repositório nunca contém secrets.

## Ambientes

- Local/teste: Supabase CLI e dados sintéticos.
- Preview/staging: deploys de preview do Cloudflare Pages, sem indexação.
- Produção: `atuavidanosastros.com.br`, Supabase `irgnhvouvzyoqfmltrna` e secrets isolados.

Nenhum recurso pago ou upgrade automático é permitido nesta fase.

