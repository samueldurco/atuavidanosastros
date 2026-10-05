# TikTok: documentos legais e backend — 05/10/2026

RUN_ID: ATV-20260902-170644Z-01A0630F. Preparação autorizada pelo proprietário; nenhuma publicação de conteúdo ou despesa.

## Entrega

Rotas públicas `/termos` e `/privacidade`, com contato já existente `suporte@atuavidanosastros.com.br`, práticas reais do projeto e controles para recusar ou permitir medição opcional. Rodapé e aviso de consentimento apontam para esses documentos. Não se inventou razão social, CNPJ, prazo fixo de retenção, avaliação jurídica ou aprovação externa.

Backend `/api/integrations/tiktok/connect` e `/callback`: sessão Supabase validada, administrador em allowlist, callback HTTPS exato, state com cookie HttpOnly/Secure/SameSite, permissão mínima `user.info.basic`, identidade conferida antes da persistência. Tokens são cifrados com AES-GCM; o retorno de sucesso exige gravação efetiva. Falhas não expõem segredos. Rotas restritas usam `private, no-store` e `no-referrer`.

Migração `20260916120000_tiktok_connections.sql`: conexão única, RLS e privilégios limitados ao service role. Contenção `supabase/forward-fixes/disable_tiktok_connections.sql` revoga acesso sem apagar tabela ou dados. Teste de banco incluído no `test:db`; documentos legais e endpoint incluídos no CI de navegador local.

## Validação

Checkout isolado: 2.207 testes de unidade e 105 de banco aprovados, incluindo 17 de handlers/criptografia, 5 do adaptador TikTok e 3 de privilégios/containment. Quatro testes Playwright aprovados; check e lint aprovados. Build Cloudflare executado pelo E2E, páginas verificadas em desktop e celular. Evidências locais ignoradas: `E:/ATVNA/app/test-results/social-setup/`. CI e publicação serão comprovados separadamente.

## Configuração hospedada

App ATVNA `7693098148494952468`, organização `7690521313189938196`, sandbox ATVNA Login Kit `7693080477079701525`.

- Website: `https://atuavidanosastros.com.br`.
- Termos: `https://atuavidanosastros.com.br/termos`.
- Privacidade: `https://atuavidanosastros.com.br/privacidade`.
- Callback: `https://atuavidanosastros.com.br/api/integrations/tiktok/callback`.
- Configurar no gerenciador de segredos do ambiente: `ADMIN_EMAIL_ALLOWLIST`, `PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REDIRECT_URI`, `TIKTOK_TOKEN_ENCRYPTION_KEY`. A URL Supabase já está na configuração pública. A chave AES é aleatória, de 32 bytes codificados em base64; não registrar em Git, logs ou chat. Rotação requer recifrar os tokens existentes.
- Migração única já aplicada por Management API em transação, com versão `20260916120000` registrada no histórico. Preflight confirmou dependências existentes. Prova remota: RLS ativa, zero conexões, anon/authenticated sem privilégios, service role com SELECT/INSERT/UPDATE e sem DELETE, trigger de timestamp presente. Não houve reset nem aplicação de outras migrações.
- Autorizar a conta real pelo painel restrito após autenticação/configuração. O consentimento OAuth não pode ser substituído por fixture ou por aprovação genérica da execução.

Em 05/10/2026, o projeto Supabase `irgnhvouvzyoqfmltrna` foi reativado por API com credencial existente e ficou `ACTIVE_HEALTHY`; aplicação e verificação da migração retornaram HTTP201. A credencial Cloudflare disponível está ativa, porém retorna HTTP403 para gerenciamento Pages e não lista contas acessíveis. O fluxo GitHub→Pages existente continua sendo o caminho de entrega. Verificação de domínio e revisão TikTok permanecem requisitos externos; Login Kit básico não libera Content Posting. Publicação automática permanece desligada.
