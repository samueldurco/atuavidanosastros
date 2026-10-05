# Arquivos estáticos sem invocações desnecessárias — WU233

RUN_ID: `ATV-20260902-170644Z-01A0630F`.
Requisito: desempenho da Onda 8 e plano mestre §0.6.

O build da WU232 avisou que o adaptador Cloudflare descartava 23 exclusões por exceder o limite de 100 regras. O arquivo gerado tinha 100 regras, deixava 11 dos 108 arquivos estáticos sem exclusão e descartava os 12 redirecionamentos da Loja. Isso encaminhava solicitações estáticas ao Worker e impedia o tratamento desses redirecionamentos por Pages.

`apps/web/vite.config.ts` agrupa os arquivos públicos de marca em `/brand/*`; mantém exclusões dos artefatos Vite, manifest, arquivo de verificação Google, páginas prerenderizadas e redirecionamentos. A inclusão padrão `/*` permanece para o servidor. Não há rota de servidor em `/brand`. Nenhuma configuração remota foi alterada.

A configuração usa os mecanismos documentados em [SvelteKit — routes](https://svelte.dev/docs/kit/adapter-cloudflare#Options-routes) e respeita o [limite de roteamento de Pages](https://developers.cloudflare.com/pages/functions/routing/#limits).

## Aceite local

| Verificação | Resultado | Evidência em `test-results/` |
| --- | --- | --- |
| Build web | PASS, aviso de exclusões descartadas ausente | `wu233-build.log` |
| Regras geradas | 18 no total, antes 100 após truncamento | `wu233-routing-verification.json` |
| Arquivos estáticos | 108/108 cobertos; antes 11 descobertos | `wu233-routing-verification.json` |
| Redirecionamentos | 12/12 excluídos do Worker | `wu233-routing-verification.json` |
| Servidor | 84 rotas no manifest; nenhuma colisão em `/brand`; 15 caminhos de login, admin, APIs, Biblioteca, produtos, SEO e Loja continuam encaminhados ao Worker | `wu233-routing-verification.json` |
| Check | 0 erros e 0 avisos | `wu233-check.log` |
| Prettier/ESLint da configuração | PASS | `wu233-format.log`, `wu233-eslint.log` |

A prova valida o artefato gerado e a configuração local. Implantação e comportamento hospedado permanecem pendentes. CI será validado em branch isolada, pois a branch local contém SEO ainda não publicado e arquivos paralelos. Supabase pausado, gates editoriais/motor/release, features pagas e gasto automático R$0 permanecem nas condições anteriores.

Novos arquivos estáticos fora de `/brand` exigem exclusão explícita ou revisão desta lista; novas rotas de servidor não devem usar o prefixo reservado aos arquivos de marca.
