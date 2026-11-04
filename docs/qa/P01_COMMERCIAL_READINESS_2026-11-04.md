# P01 — prontidão comercial e infraestrutura

Inspeção em 04/11/2026, 09:44 UTC. RUN_ID `ATV-20260902-170644Z-01A0630F`.
Base publicada e inspecionada: `52a759df453ba21ae40f322484ca332a70907d93`.
Escopo: auditoria somente leitura. Não houve cadastro, alteração de preço, concessão, deploy, envio de mensagem ou contato com suporte. Os únicos artefatos desta auditoria são este relatório e `P01_OFFER_INVENTORY_2026-11-04.json`. Implementações P01 feitas em paralelo precisam de validação própria.

## Resultado observado

A infraestrutura atual está acessível e saudável. A contratação e a entrega comercial ATV+ ainda dependem de termos comerciais aprovados, acesso Hotmart e liberação real do canal WhatsApp. Ausência de credencial ou mapeamento local não demonstra inexistência de oferta na conta Hotmart; o catálogo remoto permanece desconhecido.

| Superfície | Verificação atual | Resultado |
| --- | --- | --- |
| Supabase | MCP dedicado, projeto `irgnhvouvzyoqfmltrna`, consultas SELECT | `ACTIVE_HEALTHY`; somente seis produtos físicos e seis ofertas DRAFT; nenhum produto/oferta ATV+ |
| Histórico comercial hospedado | Contagens agregadas, sem identidade ou payload | `purchases=0`, `entitlements=0`, `webhook_inbox=0`, `atv_plus_test_cycles=0` |
| Preços hospedados | `price_versions` associado às ofertas | Seis preços DRAFT físicos (BRL 249,00 ou 399,00), nenhum preço ATV+; não promovidos a preço comercial |
| Hotmart | Descoberta de ferramentas, nomes de credenciais nos arquivos locais conhecidos, metadata Pages e nomes de secrets de repositório GitHub | Nenhum acesso Hotmart autenticado disponível; flags de produção e código mantêm `FEATURE_HOTMART_LIVE=false` |
| WhatsApp Graph | GET de metadata do remetente com as credenciais locais WhatsApp e Meta User, sem POST de mensagem | Ambas: HTTP401, `OAuthException`, código190, subcódigo463 — credencial expirada |
| WhatsApp/YCloud comercial | Inventário local e evidências históricas delimitadas | Nenhuma chave YCloud ou identidade comercial comprovada na execução; histórico registra conciliação pendente, não foi revalidado pelo provedor |
| Cloudflare Pages | Wrangler autenticado e GET da API do projeto; gates existentes | Produção atual confirmada; preflight 19/19 e postflight 15/15 PASS |
| GitHub | `gh` autenticado; leitura do run CI | Run `41648851539` concluído com sucesso para a revisão publicada |

As contagens comerciais vazias não permitem apagar concessões gratuitas ou supor inexistência de direitos em outros provedores. Nenhuma linha de concessão, leitura ou histórico foi alterada. A evidência antiga que mencionava Supabase pausado está superada pelo acesso real atual.

## Alvo de publicação confirmado

- Pages: `atuavidanosastros`, conta `7de48803dab244aa9e6d4d2d7df9b8e7`, produção em `main`.
- Domínio principal: https://atuavidanosastros.com.br; também `www.atuavidanosastros.com.br` e `atuavidanosastros.pages.dev`.
- Deployment: `ec7cf8ac-0225-4ddd-9e27-51efabd4613a`, criado em `2026-11-03T13:56:22.738434Z`, estado `success`.
- URL da revisão: https://ec7cf8ac.atuavidanosastros.pages.dev.
- SHA: `52a759df453ba21ae40f322484ca332a70907d93`.
- Metadata de produção: `AUTOMATIC_SPEND_CAP_BRL=0`, `FEATURE_AI=false`, `FEATURE_HOTMART_LIVE=false`; nenhuma binding Hotmart além da flag e nenhuma binding WhatsApp.
- Secrets existentes necessários ao runtime privado, autenticação e loja foram conferidos por nome/tipo pelos gates; nenhum valor foi exportado.

A saúde atual comprova somente a publicação existente. Não comprova compra, ativação, geração ou entrega P01. O postflight existente executa consultas de saúde e probes anônimos que foram rejeitados com 401, sem gravação autorizada.

## Contratos reaproveitáveis

1. `apps/web/src/routes/api/webhooks/hotmart/+server.ts`: autentica HOTTOK; calcula hash do corpo; persiste em `webhook_inbox` antes do domínio; conflito por `provider,external_event_id` é idempotente e conteúdo divergente retorna409. Na base inspecionada, não há consumidor que transforme esse inbox em assinatura. A origem financeira continua Hotmart.
2. `products`, `offers`, `price_versions`, `purchases` e `entitlements`: estrutura existente para referência de produto/oferta, preço versionado, transação e direito. Os campos `hotmart_product_id` e `hotmart_offer_code` das seis ofertas atuais são nulos. O inventário JSON guarda somente IDs e campos não pessoais.
3. `docs/contracts/atv-plus-owner-evaluation.md`, `apps/web/src/lib/server/atv-plus.ts` e `packages/domain/src/atv-plus-plans.ts`: avaliação privada de 30 dias, exclusiva de identidade autenticada com grant e `owner_evaluation=true`. Não é assinatura comercial nem contrato de migração automática. Preservar histórico, quotas consumidas e acesso já concedido.
4. `apps/web/src/lib/server/private-trials.ts`, processamento privado existente e rota privada de download: identidade/grant, armazenamento privado e entrega existentes. Saúde HTTP200 de `/api/private-trials/health` não certifica sessão legítima ou qualidade editorial de uma edição.
5. A skill `C:/Users/samue/.codex/skills/atv-aprovar-interpretacoes/SKILL.md` e `references/criterios.md` permitem aprovação automática para teste privado, vinculada ao conteúdo/fatos/política exatos, com entradas sintéticas, revisão integral, persistência e formatos verificados. Esse aceite não concede autorização comercial nem substitui E5 pessoal ou gates de canal. Não é necessário novo aceite humano por interpretação que cumpra o gate privado.
6. Histórico local WhatsApp em `C:/ATVNA/app/apps/web/src/lib/server/whatsapp-webhook.ts` e `routes/api/webhooks/whatsapp/`: receptor HMAC raw, identidade WABA/Phone vinculada e inbox idempotente, com 36 testes anteriores. Esses arquivos não integram a revisão publicada inspecionada e precisam ser portados/revisados com o responsável P06, sem copiar outras alterações daquele checkout.
7. `C:/ATVNA/app/packages/social-publish/src/whatsapp-hello-world.ts`: executor restrito a recurso de teste e template `hello_world/en_US`, `testOnly=true`, `productionAllowed=false`, diário/digest/destinatário exatos. Não suporta entrega comercial de PDFs nem deve ter gates afrouxados.

## WhatsApp: provas atuais e limite histórico

O recurso configurado é app `28324358550566328`, WABA `1168374418857289`, Phone Number ID `1363049066896849`. Nenhum telefone pessoal ou destinatário foi exportado. Os gates locais observados são `PUBLISH_DEFAULT=no` e `WHATSAPP_PUBLISH_ENABLED=no`.

O GET atual falhou por expiração tanto com `WHATSAPP_ACCESS_TOKEN` quanto com `META_USER_ACCESS_TOKEN`. Assim, não foi possível revalidar identidade do recurso, permissões, templates, assinatura WABA, destinatário autorizado ou entrega. Não houve tentativa de mensagem.

A evidência histórica em `C:/ATVNA/app/docs/qa/WHATSAPP_COMMERCIAL_READINESS_2026-10-12.md` registra dois testes gratuitos anteriores com entrega `failed130497` e recibos pendentes de reconciliação. Existe autorização histórica de destinatário teste, mas isso não prova verificação atual nem autoriza reenvio. Preservar igualdade exata, claims, work IDs e diário original.

O delta histórico posterior registra YCloud Free, coexistência iniciada no número dedicado já escolhido, vínculo no celular relatado pelo proprietário e ticket `144653650` criado em 12/10 para conciliação do backend. Não há prova atual de WABA/Phone comerciais, webhook, driver ou custo total zero. Preservar conexão, aplicativo, número e histórico; não reiniciar signup, revogar vínculo, duplicar cadastro ou ressubmeter ticket. Navegador e envio a pessoas não foram usados nesta auditoria.

## Bloqueios finitos e próxima operação segura

Reconsulta Supabase às `09:47:31Z` de 04/11: `price_versions` em estado `ACTIVE`, com joins para oferta e classificação digital/física do produto, retornou zero registros. A agregação de todos os estados retornou somente seis preços físicos `DRAFT`. Não existe, nesse snapshot, preço digital ativo a reaproveitar no cálculo de benefícios; os preços físicos em rascunho não são termos comerciais aprovados. A lista sanitizada e a contagem foram incorporadas ao inventário JSON. Isso não demonstra ausência de ofertas no catálogo remoto Hotmart, cujo acesso continua sem autenticação válida.

| ID | Etapa bloqueada | Evidência que falta | Continuação segura |
| --- | --- | --- | --- |
| P01-C01 | Cadastrar os nove pares nível/prazo e abrir checkout | Acesso Hotmart autenticado para conferir cadastro remoto existente; total aprovado, frequência, vigência e regra de renovação para cada par | Concluir contrato/configuração local com preço ausente e CTA de compra bloqueado; não inventar valor ou duplicar ofertas |
| P01-C02 | Receber compra válida e ativar período/direito | IDs Hotmart reais mapeados, HOTTOK em runtime, consumidor/reconciliação financeira e prova autenticada de pagamento | Implementar/validar domínio com eventos sintéticos e idempotência; manter flag live desligada até homologação |
| P01-C03 | Enviar a primeira Revolução Solar e previsões agendadas | Credencial válida; identidade comercial/driver confirmados; assinatura de webhook, template/janela, consentimento e destinatário autorizados; evidência de custo total R$0 | Implementar outbox, calendário e retries simulados sem rede; não usar executor hello_world como transporte comercial |
| P01-C04 | Homologar canal coexistente | Retorno/reconciliação YCloud e acesso por API; IDs do ativo já conectado e estado verificável | Reconciliar por canal dedicado após acesso; preservar vínculo/ticket existentes e não contatar suporte sem autorização específica |
| P01-C05 | Liberar conteúdo pago e dizer entrega concluída | Aprovação da edição, formatos/PDF completos, acesso privado hospedado e gates comerciais/canal | Reutilizar motor e homologação privada existentes; conservar aprovação privada e aceite pessoal como estados separados |
| P01-C06 | Anunciar percentuais de membro | Simulação registrada com custo/margem, promoções, exclusões e preço final confirmado no servidor | Integrar cálculo compartilhado em modo bloqueado nos itens com custo desconhecido; percentuais propostos não são condição ativa |

A decisão vigente do proprietário exige a próxima Revolução Solar imediatamente após contratação confirmada e dados necessários, inclusive no trimestral e quando o aniversário ocorrer depois da vigência; previsões futuras seguem o calendário. O agendamento local e os exemplos podem avançar sem ativar Hotmart ou WhatsApp. A palavra “imediatamente” não é prova de uma entrega real antes de existir transporte homologado.

## Checks, CI e coordenação de deploy

### Revisão focal da implementação P01 local

O helper `apps/web/src/lib/server/atv-plus-commercial-page.ts`, as actions de `/atv-mais` e o formulário de contratação foram revisados com os contratos finais do responsável. A suíte nova `apps/web/src/lib/server/atv-plus-commercial-page.spec.ts` passou **43/43** com `pnpm --dir apps/web exec vitest run src/lib/server/atv-plus-commercial-page.spec.ts` em 04/11. Ela cobre flag comercial dupla, erro de infraestrutura distinto de conta sem assinatura, claims inválidas, consulta de perfil limitada ao proprietário, projeção sem campos extras/PII, consentimento, erros SQL sem diagnóstico privado, CSRF e checkout vinculado ao intent com `sck` único e destino Hotmart validado.

A revisão revelou e o responsável corrigiu o bloqueio real do runtime SvelteKit ao redirecionar para URL externa: a action usa agora a allowlist `https://pay.hotmart.com` no terceiro argumento de `redirect`. O teste exercita o redirect real, sem mock. Também foram corrigidos o retorno cru dos registros privados, o tratamento de infraestrutura ausente, userinfo/porta no checkout e arrays no formulário de localização. Não houve alteração de fonte pelo auditor; o único arquivo de código criado por ele é a suíte focal.

O fluxo visual usa POST de mesma origem para contratar e apresenta indisponibilidade antes do estado de ausência de assinatura. Antes de habilitar uma oferta real, valor total, frequência de cobrança e regra de renovação precisam corresponder aos termos aprovados do provedor e aparecer antes da compra. A aprovação dos testes locais não resolve os bloqueios de catálogo, termos ou canal descritos acima.

Executados nesta auditoria:
- `node scripts/pages-release-gate.mjs preflight`: PASS19/19.
- `node scripts/pages-release-gate.mjs postflight`: PASS15/15.
- Consultas Supabase SELECT de schema, ofertas/preços não pessoais e contagens agregadas.
- GETs Cloudflare Pages autenticados, leitura do run CI por `gh` e GETs Graph recusados por token expirado.

A CI atual contém `pnpm check`, `pnpm lint`, `pnpm test:unit`, `pnpm test:db`, `pnpm build`, `pnpm build:trial-runtime`, `pnpm build:free-tools-runtime`, Gate B e suítes E2E locais. O run publicado bem-sucedido é https://github.com/samueldurco/atuavidanosastros/actions/runs/41648851539. Ele valida a base, não a implementação P01 nova.

Os grupos de concorrência existentes são específicos: `dated-horoscope-publication`, `atvna-dimona-production` e o fluxo editorial. Não foi localizado um lock genérico que serialize automaticamente todo deploy Pages. O README comercial §“Publicação” permite reservar uma única publicação por responsável com confirmação no log. Antes de publicar P01, o responsável deve reconciliar a revisão Pages mais recente, reservar a janela no log canônico, preservar entregas das demais frentes e executar os gates para o SHA candidato. Esta auditoria não reservou janela nem publicou.
