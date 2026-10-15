# Arquitetura integral — prontidão hospedada

Verificação somente de leitura em 15/10/2026, entre 15:27 e 16:00 UTC. RUN_ID: `ATV-20260902-170644Z-01A0630F`. Esta nota distingue configuração observada, implementação local e liberação; não declara aceite dos produtos pelo proprietário.

## Estado comprovado

- Supabase `irgnhvouvzyoqfmltrna`: `ACTIVE_HEALTHY`, região `sa-east-1`. O bloqueio histórico de projeto pausado deixou de se aplicar.
- Treze migrações hospedadas, até `20261013145855_free_tool_auth_delete_cascade`. As novas migrações de avaliação ATV+, ferramentas e Diário ainda não estavam aplicadas.
- Home e `/api/health`: HTTP 200. `/api/private-trials/health`: HTTP 503, `configurationReady:false`, `available:false`, política `atv-private-trial-approval/3.0.0`.
- A configuração privada exige `PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `ATV_TRIAL_RUNTIME_KEY`. O probe não distingue qual binding falta e não se deve inferir isso de seu resultado.
- Funções Supabase existentes: `atv-trial-runtime` versão 15, JWT verificado; `atv-free-tools-runtime` versão 3. Não receberam o código desta arquitetura durante a auditoria.
- Existe exatamente uma concessão privada ativa, vinculada a usuário confirmado com identidade Google, criada em 06/10/2026 às 13:24:41 UTC. Ela corresponde temporalmente à liberação nominal documentada em `EXECUCAO_MESTRA_LOG.md`, entrada `PRODUTOS-TESTE-LIBERADOS-20261006`. Nenhum e-mail ou UUID foi exportado ou incluído nesta nota.
- A coluna/permissão de avaliação do proprietário ainda não existia em produção. A migração local cria a permissão desativada por padrão; nenhuma concessão foi promovida automaticamente.

## Publicação e acesso administrativo

A credencial GitHub existente permite leitura administrativa e push no repositório `samueldurco/atuavidanosastros`. O app Cloudflare Workers and Pages permanece conectado. A última consulta a `commits/main/check-runs` retornou sucesso para Cloudflare Pages e para `quality`, `accessibility`, `secrets` e `sbom` no CI [38646446911](https://github.com/samueldurco/atuavidanosastros/actions/runs/38646446911). Deployment associado: `ed80a224-97c7-4648-9ba0-fd8f7e4732dd`. Essa evidência é do main anterior à nova arquitetura.

Não há segredos de repositório GitHub. O único environment listado é `atvna-editorial-signing`; não é um mecanismo de configuração do runtime Pages.

O Wrangler 4.129.1 inicialmente não carregava o backend Windows de keyring. A dependência explicitamente exigida pelo CLI, `@napi-rs/keyring@1.3.0`, foi instalada globalmente sem scripts de instalação. Depois disso, `whoami --json` informou `loggedIn:false`; `auth token --json` confirmou ausência de login. Há somente o perfil `default`.

O helper somente de leitura já documentado em `VISUAL_V4_RELEASE_PREPARATION.md` também foi verificado: o arquivo de credencial criptografado existe, mas a leitura não fornece uma credencial utilizável. Os guards impediram escrita, exclusão, migração e renovação. Não houve login, alteração de perfil, exposição de token, navegação no painel do provedor ou alteração de configuração hospedada. O HTTP 403 histórico não foi revalidado, pois falta uma credencial efetiva para fazer essa consulta.

O snapshot de 09/10 registrava 18 bindings de produção, inclusive os três exigidos pelo runtime. Ele não comprova a configuração atual. Publicar código pelo app GitHub/Pages é possível; inspecionar ou corrigir os bindings exige recuperar uma sessão ou credencial Cloudflare com acesso ao projeto.

## Ordem de liberação preservada

1. Fechar os gates locais e CI do SHA exato, incluindo os novos motores, SQL/RLS, aprovação privada, acessibilidade e build dos runtimes.
2. Confirmar novamente a concessão nominal existente e aplicar as migrações aditivas testadas. Conceder avaliação integral somente à conta confirmada, por operação administrativa separada. Não criar seeds ou fixtures com dados da conta.
3. Publicar as funções Supabase construídas e revisar os bindings Pages por acesso administrativo autenticado. Preservar JWT, chave privada entre serviços, gastos automáticos e flags comerciais desligados.
4. Publicar candidato pelo fluxo existente, verificar CI, deployment/SHA e smoke externo, e só então promover a produção conforme os gates. Registrar rollback e smoke do deployment canônico.
5. Com conta Google real, testar geração, gravação, reabertura, download e os três ciclos ATV+. A suíte local e os probes anônimos não substituem esse percurso nem o parecer do proprietário.

Nenhuma migração, grant, função, segredo, publicação ou cobrança hospedada foi alterada por esta auditoria.
