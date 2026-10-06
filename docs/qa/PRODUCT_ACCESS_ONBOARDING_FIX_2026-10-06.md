# Acesso gratuito e cadastro de nascimento

RUN_ID: ATV-20260902-170644Z-01A0630F. Correção solicitada pelo proprietário após encontrar o catálogo em preparação e o perfil indisponível na produção.

## Causas e correção

As páginas comerciais não consultavam a concessão nominal de teste, apesar de o grant já estar ativo. O layout agora deriva o acesso de claims verificados e da RPC do banco. As páginas dos produtos e universos abrem o teste correspondente; os 25 caminhos antigos redirecionam para o mesmo fluxo. Dashboard, Biblioteca e navegação mostram o acesso gratuito, ATV+ e resultados privados reabríveis. Falhas de autorização permanecem fechadas. Páginas personalizadas por sessão recebem `private, no-store`.

O E2E identificou que a lista de destinos permitidos após o login rejeitava os novos caminhos de teste. A lista agora aceita somente os 25 IDs canônicos, índice, ATV+ e leituras com UUID válido. Destinos externos, fixtures e caminhos inválidos continuam rejeitados. O login preserva o produto escolhido.

A inspeção visual móvel encontrou o cartão de teste usando o estilo de uma pequena etiqueta de status. O cartão agora usa disposição vertical e tipografia normal, deixando descrição e botão legíveis no celular. Imagens locais são evidência de apresentação com dados sintéticos, não de sessão hospedada.

O banco publicado não tinha a migração existente `20260923180000_natal_onboarding`: faltavam as duas RPCs, revisão e recibos de consentimento, enquanto as políticas antigas ainda permitiam escrita direta. A migração foi aplicada isoladamente em transação, com guardas para o estado esperado, registro de migração e recarga do PostgREST. Não foram aplicadas outras migrações pendentes. Não houve gravação de dados de nascimento nem criação de leituras sintéticas na produção.

Uma consulta posterior comprovou as duas funções, revisão, consentimentos e remoção dos caminhos antigos de escrita. Verificação somente de leitura sob o papel `authenticated` e o UUID administrativo da identidade Google nominal confirmou grant ativo e snapshot válido `atv-onboarding/1`. Esse ensaio SQL não substitui uma sessão real do usuário. Permissões de ambas as RPCs para `authenticated`, negação para `anon` e negação de UPDATE direto também foram confirmadas. Identidade e dados pessoais permanecem fora do Git.

## Validação

- 112 testes focais únicos aprovados: autorização derivada de claims/grant, redirecionamento de todos os 25 produtos, isolamento da consulta de histórico, privacidade de cache, dashboard, Biblioteca, destinos seguros após login e dez testes de integração do cadastro.
- Integração do cadastro verifica salvamento/recuperação, consentimento, conflito de revisão, validação temporal, RLS e o forward-fix que revoga a escrita preservando dados e leitura.
- Check: zero erros e zero avisos. Lint/Prettier: aprovado.
- 14 cenários E2E locais aprovados após corrigir o retorno do login e o título da fixture: índice anônimo, catálogo dos 25 produtos com acesso gratuito, Biblioteca/ATV+, acessibilidade móvel e nove cenários privados existentes. A seleção de acessibilidade no CI inclui `trial-access.e2e.ts`.
- CI37484436173 em `4313fd4`: quality/accessibility/secrets/sbom e Cloudflare PASS; 1739 testes web, 69 cenários de acessibilidade e quatro cenários legais aprovados. QA móvel local final de catálogo, Biblioteca e índice revisada; PR13 integrado em `c46fa6e`.

## Dependência detectada na publicação

O CI37485219596 de `c46fa6e` detectou GHSA-wq5f-xc86-pv6w na auditoria após os gates do PR13 terem passado. O aviso entrou na base do GitHub em 06/10/2026. Cloudflare, acessibilidade, secrets e SBOM passaram; o gate de quality permanece bloqueado até corrigir a dependência.

O override existente `miniflare>sharp` passa de 0.35.4 para a versão corrigida 0.35.5 e seu lockfile é regenerado. Referência do mantenedor: https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w. Auditoria e CI completo continuam obrigatórios; essa correção não dispensa nenhum gate.

Instalação congelada, auditoria sem vulnerabilidades conhecidas e build local completo aprovados. Logs `sharp-install.txt`, `sharp-audit.txt` e `sharp-build.txt` no diretório externo de evidências. CI e confirmação hospedada da correção ficam registrados no log canônico de publicação.

Logs e consultas administrativas fora do Git: `E:/ATVNA/.worktrees/trial-access-evidence/`, `E:/ATVNA/.worktrees/onboarding-access-*`. O diretório local de saída do Playwright é substituído a cada execução; artefatos do CI consolidam a prova desta revisão. Fixture de renderização limitada a localhost; não concede acesso, não persiste nem representa aprovação humana.

## Limites preservados

Teste privado gratuito dos 25 produtos e ATV+, sob o grant existente. Aprovação automática e aceite pessoal seguem separados. Nenhum preço ou Hotmart configurado. Permanecem os limites do motor experimental e os gates comerciais. Não é declaração de conclusão do programa integral.
