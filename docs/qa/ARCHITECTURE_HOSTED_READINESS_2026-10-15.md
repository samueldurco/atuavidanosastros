# Arquitetura integral — prontidão hospedada

Verificação em 15/10/2026, entre 15:27 e 15:58 UTC. A única mudança administrativa nesta auditoria foi a autenticação pessoal pelo CLI oficial; configuração e dados hospedados foram somente consultados. RUN_ID: `ATV-20260902-170644Z-01A0630F`. Esta nota distingue configuração observada, implementação local e liberação; não declara aceite dos produtos pelo proprietário.

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

O Wrangler 4.129.1 inicialmente não carregava o backend Windows de keyring. A dependência explicitamente exigida pelo CLI, `@napi-rs/keyring@1.3.0`, foi instalada globalmente sem scripts de instalação. Depois disso, a consulta inicial ainda indicou ausência de login. O proprietário concluiu uma nova autorização oficial por `wrangler login --use-keyring --scopes account:read user:read pages:write`; o processo terminou com `Successfully logged in.` e código 0. `whoami --json` confirmou OAuth na conta esperada. Nenhum token, código de callback ou identificação pessoal foi incluído nesta nota.

Após a autenticação, o helper somente de leitura documentado em `VISUAL_V4_RELEASE_PREPARATION.md` retornou HTTP 200 para o projeto e o deployment canônico. Os guards impediram escrita, exclusão, migração e renovação de credenciais durante essas consultas. Não houve navegação no painel do provedor nem alteração da configuração hospedada. O bloqueio anterior de credencial Cloudflare está resolvido.

O deployment de produção continua em `4c7e81c36d4acf694fc5c9a61b98005628d7e549`, `ed80a224-97c7-4648-9ba0-fd8f7e4732dd`, concluído com sucesso em 14/10 às 22:17 UTC. A configuração atual e os metadados desse deployment incluem `PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `ATV_TRIAL_RUNTIME_KEY`. Os dois últimos são `secret_text`, também confirmados por `wrangler pages secret list --project-name atuavidanosastros` como `Value Encrypted`. A API omite seus valores: um campo de valor vazio na resposta não comprova um segredo vazio.

Os probes do domínio principal e do URL imutável `https://ed80a224.atuavidanosastros.pages.dev/api/private-trials/health` continuaram retornando 503 com `configurationReady:false`. Isso deixa pendente a resolução efetiva dos bindings/valores no runtime. Não há evidência para atribuir a falha a um segredo específico. A configuração de preview contém apenas os bindings públicos e `FREE_TOOL_RECEIPT_KEY`; ela não possui os dois segredos de testes privados. Uma publicação de preview, por si só, não valida a geração privada.

A revisão independente da migração do Diário confirmou os controles de proprietário, concessão, janela de 30 dias, revisão dos relatos, snapshot autorizado e conclusão única. `node --test scripts/private-dream-atlas-db.test.mjs` passou 9/9. Essa suíte usa PGlite sequencial; não equivale a uma prova de concorrência com duas conexões hospedadas. Os locks de ciclo e o índice único foram revisados no SQL.

## Ordem de liberação preservada

1. Fechar os gates locais e CI do SHA exato, incluindo os novos motores, SQL/RLS, aprovação privada, acessibilidade e build dos runtimes.
2. Confirmar novamente a concessão nominal existente e aplicar as migrações aditivas testadas. Conceder avaliação integral somente à conta confirmada, por operação administrativa separada. Não criar seeds ou fixtures com dados da conta.
3. Publicar as funções Supabase construídas e revisar os bindings Pages por acesso administrativo autenticado. Preservar JWT, chave privada entre serviços, gastos automáticos e flags comerciais desligados.
4. Publicar candidato pelo fluxo existente, verificar CI, deployment/SHA e smoke externo, e só então promover a produção conforme os gates. Registrar rollback e smoke do deployment canônico.
5. Com conta Google real, testar geração, gravação, reabertura, download e os três ciclos ATV+. A suíte local e os probes anônimos não substituem esse percurso nem o parecer do proprietário.

Nenhuma migração, grant, função, segredo, publicação ou cobrança hospedada foi alterada por esta auditoria.
