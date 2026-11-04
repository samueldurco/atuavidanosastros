# Consultas ATVNA pelo WhatsApp

Decisão do proprietário em 04/11/2026, atualizada para venda exclusiva de produtos digitais pagos. RUN_ID `ATV-20260902-170644Z-01A0630F`.

A entrada é um botão flutuante no canto inferior direito, com ícone e **Fazer uma consulta pelo WhatsApp**. Não cria uma seção na home. Aparece na home, descoberta digital, ferramentas, universos, temas, fichas e ATV+. Fica oculto no menu móvel, no aviso inicial de cookies e enquanto as ações de compra estão visíveis. Desktop usa cápsula; celular mantém duas linhas legíveis. P06 entrega o componente global a P02, sem duplicar a home.

O clique passa por `GET /api/whatsapp/entry`, que revalida a configuração no servidor antes de redirecionar ao número comercial brasileiro. A mensagem inicial abre o menu da assistente virtual: **Ver produtos digitais** ou **Fazer uma consulta**. Os dois caminhos são comerciais: apresentam produtos digitais pagos ou ajudam a escolher uma leitura paga pela intenção da pessoa. A contratação acontece na ficha canônica. P06 não faz leituras no chat nem abre uma fila humana.

Ferramentas gratuitas, conteúdos gratuitos e lançamentos liberados em teste gratuito ficam fora dos menus, indicações e links dos dois caminhos. Não são usados como alternativa quando falta uma oferta paga. Uma intenção sem cobertura paga disponível recebe uma explicação breve e a opção de voltar ou encerrar.

## Canal e liberação

`FEATURE_WHATSAPP_WEBHOOK`, `FEATURE_WHATSAPP_CONSULTATION` e `FEATURE_WHATSAPP_PUBLIC_ENTRY` começam `false`. A entrada exige os três, `AUTOMATIC_SPEND_CAP_BRL=0`, `WHATSAPP_CONSULTATION_FREE_REPLY_VERIFIED=true`, verificação datada há no máximo sete dias, número comercial e todas as credenciais do receptor/responder. `FREE_REPLY` comprova a resposta sem custo dentro da janela permitida do WhatsApp; não habilita produtos gratuitos. A data é uma atestação operacional; não comprova sozinha a saúde do provedor. Expiração, falha do canal ou troca de ativo exigem fechar a entrada e repetir a prova. Nunca usar o número de teste Meta como destino comercial.

A prova deve conferir número, WABA, Phone Number ID, assinatura e recepção do mesmo canal; mensagem iniciada pelo destinatário de homologação autorizado; resposta recebida dentro da janela gratuita; status/reenvio sem duplicação. Não reabrir cadastro YCloud, revogar a coexistência ou repetir ticket existente. O adapter atual usa Cloud API Graph; um canal YCloud deve ter transporte e assinatura próprios homologados antes de ligar flags. Credencial válida em outro driver não satisfaz o contrato.

Configuração documentada em `.env.example`. Valores secretos são bindings privados. Nunca enviar texto livre, telefone, dados natais ou credenciais a logs ou bundles públicos. O layout recebe apenas disponibilidade booleana. A resposta HTTP de entrada não permite cache.

## Catálogo e encaminhamento

IDs e URLs vêm dos catálogos existentes. Somente produto digital pago entra no snapshot comercial: oferta atual, ficha e checkout disponíveis, preço estrutural positivo em centavos de BRL, prazo e canal de entrega confirmados. Texto que aparenta preço não substitui o valor estrutural; preço zero, negativo, ausente ou inválido fecha o encaminhamento. Ferramentas e ofertas gratuitas continuam inelegíveis mesmo com destino funcional, checkout acessível ou rótulo de produto pago. Não existe lista de ferramentas gratuitas verificadas para habilitar no P06.

ATV+ usa exclusivamente a projeção pública de ofertas P01 e seus gates comerciais. Não inicia checkout em nome de um telefone. Encaminha a `/atv-mais`, onde conta, elegibilidade de membro e preço final são resolvidos pelo fluxo existente. Previsões programadas e próxima Revolução Solar respeitam o contrato P01. Avulsos e lançamentos P02 permanecem fora das ofertas compráveis até receberem projeção homologada de preço positivo, checkout, prazo e entrega. A autorização P02 para publicar onze lançamentos gratuitamente em modo de teste não os habilita para o P06. Não deduzir habilitação de um preço isolado no banco.

O motor distingue semana única e recorrência, sinastria, comparação de datas e previsão de casamento, carreira e dificuldade ao cobrar. Em ambiguidade, pergunta; sem cobertura ou oferta, explica e oferece voltar/sair. Não calcula mapas, não faz leituras privadas, não coleta dados de nascimento nem usa a pergunta da conversa como entrada de produto sem contrato explícito. O destino é reavaliado a cada mensagem com um snapshot novo.

## Recepção, idempotência e dados

`POST /api/webhooks/whatsapp` valida HMAC do corpo bruto, tamanho e IDs antes da inbox durável existente. Eventos de status mantêm seu tratamento e nunca geram orientação. O recebimento só é confirmado depois da persistência. O responder usa claim atômica e lock por interlocutor antes de enviar; só responde a inbound recente e não usa templates pagos.

O interlocutor é HMAC com segredo separado. A sessão guarda somente etapa e IDs de escolhas, com validade de 24 horas; mensagem e telefone existem apenas em memória para a resposta. O dispatch guarda hashes/estados e nunca o texto. Resposta ambígua, timeout e claim abandonada exigem reconciliação, sem reenvio automático. Migração expand-only `20261104104910_whatsapp_consultation_dispatch.sql`, RLS e funções restritas a `service_role`.

Para rollback operacional: fechar `FEATURE_WHATSAPP_PUBLIC_ENTRY` e `FEATURE_WHATSAPP_CONSULTATION` primeiro. Preservar `FEATURE_WHATSAPP_WEBHOOK` quando o receptor compartilhado estiver saudável, para manter os eventos de status de P01; desligá-lo somente em incidente do próprio receptor. Manter tabelas de auditoria e revogar o uso do responder. Não remover registros de envio ambíguo. Forward-fix do DDL exige nova migração; nunca alterar uma migração já aplicada.

## Verificação e publicação

Suítes: engine, adapter comercial, recepção HTTP, store/responder, migração em PostgreSQL local e gate público. Devem rejeitar ferramentas e ofertas gratuitas no menu, na navegação e na consulta por intenção, inclusive em payload adulterado com preço aparente, valor zero/negativo ou ID legado de ferramenta. O caso Ascendente pode indicar uma leitura paga compatível e disponível, sem link para a calculadora gratuita; na ausência dessa oferta, admite a indisponibilidade. A prova HTTP anterior da calculadora gratuita está fora do aceite atual.

`playwright.p06.config.ts` constrói o site e usa apenas bindings fictícios num Wrangler local; intercepta o clique externo, sem enviar mensagem. Cobre 1440, 390 e 320 px, rolagem, cookies, menu, compra e rotas privadas. Essa suíte verifica a entrada visual; as suítes do engine, catálogo e webhook verificam as respostas e a elegibilidade comercial. CI inclui um job próprio.

Aceite público exige prova do canal e clique junto à revisão P02. Teste local sintético, código integrado, publicação com flags fechadas e experiência comercial pública são estados diferentes. Usar `ENTREGUE` no log comercial apenas depois da experiência pública verificada.
