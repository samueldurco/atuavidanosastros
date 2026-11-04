# P06 — consultas pelo WhatsApp: cobertura e limites

Registro em 04/11/2026. RUN_ID `ATV-20260902-170644Z-01A0630F`.
Contrato: [Consultas ATVNA pelo WhatsApp](../contracts/whatsapp-consultation.md).

## Resultado neste registro

O código local implementa a entrada flutuante, a orientação determinística, a consulta de ofertas autorizadas e o recebimento/resposta idempotente. Isso não comprova atendimento pelo canal real. A integração e a publicação estão previstas com `FEATURE_WHATSAPP_WEBHOOK=false`, `FEATURE_WHATSAPP_CONSULTATION=false` e `FEATURE_WHATSAPP_PUBLIC_ENTRY=false`.

| Verificação | Evidência disponível | Limite |
| --- | --- | --- |
| Suíte consolidada local | 7 arquivos, 118 testes PASS, exit 0; inclui engine 24/24 e adapter de catálogo 24/24 | Entradas sintéticas, provedores simulados e banco local; não é homologação comercial |
| `pnpm check` | 0 erros e 0 avisos | Verificação estática local |
| Lint | Em andamento | Sem aprovação registrada aqui |
| Build | Em andamento | Sem aprovação registrada aqui |
| E2E | Em andamento | Sem aprovação registrada aqui |
| CI | Job específico previsto em `.github/workflows/ci.yml` | Este registro não atribui aprovação a um run remoto |
| Migração hospedada | Ainda não aplicada | Testes locais não alteram o banco remoto |
| Atendimento e entrega reais | Bloqueados; nenhum envio realizado nesta execução | Não houve compra, mensagem recebida em homologação ou entrega comercial comprovada |

A suíte consolidada e o check acima foram comunicados pela integração P06. Este relatório não executou novamente Vitest, build, Wrangler ou operações remotas. A conclusão de lint, build, E2E, CI e eventual publicação precisa de evidência própria.

## Entrada e contrato da orientação

O botão global usa ícone e a chamada **Fazer uma consulta pelo WhatsApp**, no canto inferior direito. Não cria uma seção na home. O componente cobre home, descoberta digital, ferramentas, temas, universos, fichas e ATV+. O contrato prevê ocultá-lo no aviso de cookies, no menu móvel aberto e enquanto as ações de compra estiverem visíveis; a verificação visual/E2E continua pendente neste registro.

O clique passa por `GET /api/whatsapp/entry`, sem cache, e revalida os gates antes do redirecionamento ao número comercial. A mensagem **Olá! Quero conhecer a assistente virtual da ATVNA.** abre o menu com **Ver produtos digitais** e **Fazer uma consulta**. A orientação é gratuita e a compra é opcional, na ficha canônica. Não existe SKU ou cobrança pela conversa, abertura de fila humana ou checkout iniciado em nome de um telefone.

O gate público exige os três flags, teto automático de gasto igual a zero, credenciais do transporte, número comercial brasileiro e prova datada de resposta gratuita com até sete dias. Essa data é uma atestação operacional; sozinha, não comprova saúde atual do provedor. Credencial Graph válida e prova do mesmo ativo são necessárias; YCloud exige transporte e assinatura próprios homologados.

## Matriz de intenções verificadas no engine

Os testes usam catálogos sintéticos explicitamente autorizados. Uma indicação correta nesses testes não torna uma oferta disponível em produção.

| Entrada/intenção | Comportamento verificado | Condição para encaminhar |
| --- | --- | --- |
| Mensagem exata do botão e saudação inicial | Identifica a assistente virtual e apresenta os dois caminhos | Sem venda obrigatória |
| Pergunta já enviada na primeira mensagem | Classifica a dúvida sem exigir repetir o menu | Cobertura reconhecida e destino atual |
| Navegar por tema | Lista opções dos seis universos e permite escolha | Somente ferramentas verificadas e ofertas disponíveis no snapshot |
| Descobrir o Ascendente | Prioriza a calculadora gratuita | ID canônico e destino operacionalmente verificado |
| Comparar mapas/sinastria | Explica escopo, dados no site e ficha da leitura completa; alternativa gratuita é identificada como parcial | Oferta completa com ficha/checkout confirmados; gratuita verificada quando usada |
| Semana específica versus recorrência | Distingue leitura avulsa de uma semana e acompanhamento ATV+ | Cada oferta precisa do seu próprio contrato vigente |
| ATV+ | Usa os planos comerciais P01, seus ritmos e presentes natais; vigências de 3, 6 ou 12 meses; próxima Revolução Solar após contratação/cadastro, inclusive no trimestral com aniversário após a vigência; previsões programadas em PDF pelo WhatsApp | Preço, prazo e entrega do snapshot autorizado; sem promessa de 24 horas, consultas individuais, perguntas ao leitor ou grupos |
| Comparar datas reais de cerimônia | Encaminha somente para comparação de duas ou três opções, com horário e cidade | Lançamento registrado e liberado; não prevê quando a pessoa se casará |
| Prosperidade, carreira ou dificuldade ao cobrar | Pergunta para distinguir carreira natal, bloqueio ao cobrar e primeira oferta/talento | Sem substituir uma necessidade por produto de outro escopo |
| Tarot de três cartas | Explica o formato sem prometer incorporar a pergunta do WhatsApp à leitura | Entrada de produto somente conforme contrato explícito |
| Corrigir, reiniciar, menu e sair | Permite mudar de assunto ou encerrar voluntariamente | Não preserva narrativa anterior |
| Sem cobertura, oferta retirada ou seleção antiga | Admite o limite e permite corrigir/voltar/sair; reavalia a escolha com catálogo novo | Sem link de compra inadequado ou oferta retirada |
| Dados de nascimento ou relato no texto | Não os replica na resposta nem no estado persistido | Dados e pagamento seguem pelo site |

## Autoridade do catálogo e dos preços

O adapter consulta somente a projeção pública de ofertas ATV+ P01 quando os gates comerciais existentes permitem. Agrega todas as combinações autorizadas de plano e vigência na ordem canônica, com o preço de cada uma, sem escolher um plano padrão ou anunciar mínimo arbitrário. Erro, timeout, preço ausente/inválido, checkout ausente ou oferta desabilitada fecham o encaminhamento. Nenhum preço foi inventado ou publicado por P06; os valores de teste são sintéticos.

Avulsas e lançamentos P02 permanecem fechados no adapter atual até existir projeção homologada de preço, ficha, checkout, prazo e entrega. O suporte do engine a metadados de novos produtos não os ativa. Um preço isolado no banco não basta. Ferramentas gratuitas exigem ID canônico, disponibilidade suportada e prova do destino em `WHATSAPP_CONSULTATION_VERIFIED_FREE_TOOLS`; a existência de uma rota não comprova funcionamento.

Preço final, conta e eventual benefício de membro são resolvidos na ficha e no checkout existentes. P06 não cria desconto, não concede direito, não calcula mapa e não realiza leitura privada.

## Transporte, persistência e migração

O receptor confere assinatura HMAC dos bytes originais, tamanho, WABA e Phone Number ID antes da inbox durável. Eventos de status não geram orientação. O responder utiliza claim atômica por evento e serialização por interlocutor; inbound expirado, futuro ou fora de ordem não inicia envio. Resposta incerta, timeout ou claim abandonada vão para reconciliação, sem reenvio automático e sem template pago.

O interlocutor usa HMAC com segredo separado. A sessão tem validade de 24 horas e guarda somente etapa e IDs de escolhas. Texto, telefone e dados natais não são persistidos no estado ou no dispatch; este guarda hashes, estado, intenção e ID de produto. RLS e permissões de RPC restringem o acesso a `service_role`; os testes locais incluem rejeição de leitura/execução por `anon` e `authenticated`.

Migração expand-only: [`20261104104910_whatsapp_consultation_dispatch.sql`](../../supabase/migrations/20261104104910_whatsapp_consultation_dispatch.sql).

SHA256 calculado do arquivo atual:

```text
180edec42d6fb07bd5314e87025e647164990b874ca4e07945146f321dcd5116
```

Esse hash identifica o DDL local revisado; não é prova de aplicação remota. Uma alteração posterior ao arquivo invalida esta referência. Após aplicação, correções devem usar nova migração.

## Bloqueios reais e distinção de liberação

A [auditoria de prontidão P01](P01_COMMERCIAL_READINESS_2026-11-04.md) registrou, em 04/11, HTTP 401 do Graph com `OAuthException`, código 190 e subcódigo 463: credencial expirada. O canal YCloud não tem homologação comprovada. A [preparação de publicação P01](P01_PUBLICATION_2026-11-04.md) registra que os nove preços ATV+ ainda não foram definidos pelo proprietário. Esses fatos impedem anunciar atendimento comercial ou assinatura comprável; P06 preserva os gates fechados.

Teste sintético local, aprovação de CI, código integrado, publicação com flags fechadas e atendimento comercial público são estados diferentes. Este registro comprova somente as verificações locais explicitadas na tabela. A migração remota, o canal gratuito homologado com credencial válida, os preços/ofertas autorizados, a revisão junto à entrada P02 e o clique/resposta reais continuam pendentes antes da ativação pública. Não marcar P06 como `ENTREGUE` no log comercial com base apenas no código publicado.

Para rollback operacional, fechar primeiro entrada pública e responder. Preservar o receptor compartilhado quando saudável para os status P01; desligá-lo em incidente do próprio receptor. Manter registros de reconciliação e histórico, sem apagar auditoria.

Referências adicionais: [núcleo P01](P01_SUBSCRIPTION_CORE_2026-11-04.md), [contrato comercial ATV+](../contracts/atv-plus-commercial.md), [preço de membro](P01_MEMBER_PRICING_2026-11-04.md).
