# ADR 0001 — Plataforma e runtime

- Estado: aceito
- Data: 2026-09-02
- RUN_ID: `ATV-20260902-170644Z-01A0630F`

## Decisão

Usar SvelteKit com TypeScript estrito e `@sveltejs/adapter-cloudflare` em Cloudflare Pages Free. O código será organizado como monólito modular em workspace pnpm. PostgreSQL/Supabase é a base canônica; SDKs de fornecedor ficam atrás de adaptadores.

## Razões

- SSR e metadata por rota atendem SEO sem um gerador separado.
- SvelteKit possui integração oficial vigente com Cloudflare Pages.
- Pages oferece previews por branch e rollback de deploy sem custo fixo inicial.
- O monólito modular reduz operação prematura e preserva fronteiras extraíveis.

## Consequências

- O output de build é `.svelte-kit/cloudflare`.
- Recursos incompatíveis com Workers runtime não podem entrar no caminho SSR.
- Jobs duráveis começam como worker local/idempotente e só recebem runtime remoto quando houver opção gratuita adequada.
- Produção não é acessada por desenvolvimento local com bindings remotos de escrita.

## Rollback

O domínio não depende das APIs Cloudflare. Outro adapter SvelteKit pode substituir o adapter atual, mantendo rotas e pacotes de domínio.

