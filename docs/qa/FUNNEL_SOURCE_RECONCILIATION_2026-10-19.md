# Reconciliação dos funis e momentos comerciais — 19/10/2026

## Decisão e precedência

Esta auditoria reconcilia os seis funis de setembro com as **19 ofertas atuais**. Precedência: decisão direta do proprietário nesta sessão sobre o exemplo pós-compra e o nome “Mapa Astral Aprofundado”; contrato aprovado em `docs/contracts/architecture-offers-20261015.md:1-57`; plano comercial de 19/10 em `C:/ATVNA/docs/30-execucao/PROJETO_JORNADAS_COMERCIAIS_2026-10-19/PAGINAS_E_FUNIS.md:54-122`; proposta histórica `C:/ATVNA/docs/20-produto/ARQUITETURA_ESCADA_PRODUTOS_E_FUNIS_2026-09-02.md`. A matriz de linguagem de 29/09 ainda enumera 25 produtos e é insumo editorial histórico, não catálogo ou grafo vigente (`C:/ATVNA/docs/20-produto/MATRIZ_LINGUAGEM_FUNIS_ATVNA_2026-09-29.md:1-15`).

O proprietário confirmou que “Mapa Astral Aprofundado” é `life-atlas`, hoje rotulado “Mapa Astral por Temas” no contrato e no catálogo (`docs/contracts/architecture-offers-20261015.md:15`; `packages/domain/src/catalog.ts:138-140`). O mesmo workflow conserva as quatro prioridades, sem novo SKU (`packages/domain/src/workflows.ts:134,151`; `docs/contracts/life-atlas-input.md`). Ele também deu o caso de oferta **logo após a compra** de Mapa Astral Completo. Este momento difere do gatilho histórico “após consumo mínimo ou escolha de áreas” (arquitetura de setembro:844). Preparar as duas copies separadamente não significa ativar cobrança nem inferir que houve leitura.

Nesta matriz, **decisão atual** significa momento pedido diretamente pelo proprietário, ainda sem preço/checkout; **candidata histórica compatível** significa aresta que pode orientar uma página contextual de prévia, sujeita a contrato de oferta, gatilho comprovado e aprovação comercial; **retirada/não equivalência** significa que a relação antiga não pode ser portada por alias, nome ou número de cartas. Nenhuma linha de setembro aprova preço atual. As 19 definições seguem `PREPARING`, e o contrato de outubro adia plataformas, preços e cobrança (`docs/contracts/architecture-offers-20261015.md:53-57`). O ATV+ atual é a seleção finita por ciclo do contrato, não os clubes históricos (mesmo arquivo:39-51; `packages/domain/src/atv-plus-plans.ts:83`).

## Entradas públicas e nove ferramentas

O trajeto público aprovado é `/leituras → /produtos/[slug]`; uma ferramenta gratuita pode sugerir páginas públicas, sem provar compra ou elegibilidade. O conjunto de `offerIds` é editorial; no componente atual apenas o primeiro ID vira CTA (`apps/web/src/lib/components/free-tools/FreeToolExperience.svelte:58-62`). Não se deve transformar a ordem desses IDs em uma sequência de upsell.

| Origem gratuita | Destinos atualmente configurados | Evidência |
|---|---|---|
| Calculadora de Ascendente | `three-pillars`, `birth-chart` | `apps/web/src/lib/data/free-tools.ts:20-29` |
| Mapa Astral Grátis | `birth-chart`, `life-atlas` | `apps/web/src/lib/data/free-tools.ts:32-41` |
| Horóscopo de Hoje | `week-reading`, `personal-calendar`, `date-reading`, `solar-return` | `apps/web/src/lib/data/free-tools.ts:44-53` |
| Combinação Astral do Casal | `synastry`, `couple-dossier` | `apps/web/src/lib/data/free-tools.ts:56-65` |
| Calculadora do Meio do Céu | `purpose-career`, `career-forecast-30d` | `apps/web/src/lib/data/free-tools.ts:68-78` |
| Dinheiro no Seu Mapa Astral | `purpose-career`, `career-forecast-30d` | `apps/web/src/lib/data/free-tools.ts:81-90` |
| Carta do Dia | `tarot-situation-challenge-advice`, `tarot-peladan-cross`, `tarot-celtic-cross`, `tarot-astrological-mandala` | `apps/web/src/lib/data/free-tools.ts:93-107` |
| Carta do Amor | `tarot-aphrodite-temple` | `apps/web/src/lib/data/free-tools.ts:110-120` |
| Registro de Sonhos | `dream-reading`, `dream-dossier`, `dream-atlas` | `apps/web/src/lib/data/free-tools.ts:123-132` |

As seis sequências antigas estão nos diagramas de Tarot, Mapa Astral, Horóscopo, Ascendente, Sinastria e Sonhos (arquitetura de setembro:252-268, 360-376, 468-484, 576-592, 684-700, 792-808). O universo atual Dinheiro e Carreira não recebe uma escada herdada desses seis diagramas. `purpose-career` e `career-forecast-30d` tratam perguntas e períodos distintos; a página pública atual os relaciona, mas não cria um upsell obrigatório (`apps/web/src/routes/produtos/[slug]/+page.svelte:91-117`; plano comercial:110).

## Matriz completa das 18 arestas de upsell históricas

“Momento” abaixo reproduz **o gatilho proposto em setembro**, salvo a linha da decisão atual. Todas as arestas históricas estão desativadas comercialmente. Os downsells correlatos aparecem na próxima matriz.

| Origem → oferta atual ou histórica | Momento/documento:linha | Reconciliação |
|---|---|---|
| `birth-chart → life-atlas` | **Imediatamente após compra confirmada**; decisão direta do proprietário nesta sessão; plano comercial:75-89 | **Decisão atual para página contextual.** Mostrar o acréscimo ao Mapa Completo e caminho para a entrega; não presumir leitura, desconto ou direito ao novo produto. |
| Tarot Foco Agora → Três Perguntas | Após abrir síntese; setembro:840 | Retirada: ambos os SKUs da antiga escada não são os cinco métodos independentes atuais (contrato de outubro:24-28,33). |
| Três Perguntas → Jornada da Pergunta | Após três leituras; setembro:841 | Retirada: `Jornada da Pergunta` não é oferta atual. |
| Jornada da Pergunta → Clube Tarot Vivo | Dia 21; setembro:842 | Retirada: clube não corresponde ao ATV+ atual. |
| `three-pillars → birth-chart` | Depois do relatório curto; setembro:843; plano:99 | Candidata histórica compatível. Exige entrega/abertura comprovada conforme copy e exclusão de quem já possui `birth-chart`. |
| `birth-chart → life-atlas` | Após consumo mínimo ou escolha de áreas; setembro:844; plano:100 | Candidata **distinta** da página pós-compra. Abertura da biblioteca não prova consumo mínimo. |
| Atlas da Vida 360 → Meu Céu em Movimento | Dias 21–30; setembro:845 | Retirada: antiga recorrência não é plano ATV+ nem produto atual. |
| Leitura Completa do Dia → Sua Semana | Após abrir/dia seguinte; setembro:846; plano:102 | Não equivalência: `date-reading` atual é data especial escolhida, não o antigo produto diário. Não criar `date-reading → week-reading` com essa prova. |
| `week-reading → solar-return` | Perto do aniversário ou marco grande; setembro:847; plano:103 | Candidata histórica compatível; contexto temporal e direito devem ser comprovados, sem interromper entrega pendente. |
| Revolução Solar → Ciclos em Dia | Após leitura/início do mês 2; setembro:848 | Retirada: antigo clube não é ATV+ atual. |
| Ascendente em Profundidade → Três Pilares Integrados | Após interpretação; setembro:849 | Retirada: origem paga e destino antigos ausentes; ferramenta gratuita atual só recomenda produtos públicos. |
| Três Pilares Integrados → Ascendente 360 | Após escolha de foco; setembro:850 | Retirada: `Ascendente 360` não é oferta atual. |
| Ascendente 360 → ATV+ | Após 14 dias; setembro:851 | Retirada: produto de origem ausente; adesão não nasce de completar ferramenta ou de prazo histórico. |
| Faísca do Par → Sinastria Completa | Após preview do comprador/casal; setembro:852 | Não equivalência comercial: entrada atual é a ferramenta gratuita `Combinação Astral do Casal → synastry` como descoberta pública (`free-tools.ts:56-65`). |
| `synastry → couple-dossier` | Após consumo e idealmente aceite dos dois; setembro:853; plano:105 | Candidata histórica compatível. Não presumir consentimento de terceiro ou consumo a partir de visita à URL. |
| Dossiê do Casal → Ciclos a Dois | Após síntese de 30 dias; setembro:854 | Retirada: antiga recorrência não é ATV+ atual. |
| `dream-reading → dream-dossier` | Após marcação **explícita** de sonho importante/recorrente; setembro:855; plano:106 | Candidata histórica compatível; relato íntimo não é gatilho de exploração automática. |
| `dream-dossier → dream-atlas` | Após 2–3 registros; setembro:856; plano:106 | Candidata histórica compatível. Diário atual dura 30 dias e integra apenas registros existentes ao final (contrato de outubro:35). |
| Atlas dos Sonhos → Caderno Vivo | No relatório final; setembro:857 | Retirada: antigo clube não é ATV+ atual. |

## Todos os 12 downsells históricos

Regra da proposta: downsell só após recusa explícita, com diferença real de escopo; produto já possuído não pode ser reofertado (arquitetura de setembro:826-834; plano comercial:112-118). Um abandono de página, falta de clique ou ausência de pagamento não equivale a recusa.

| Oferta recusada → alternativa | Fonte | Tratamento hoje |
|---|---|---|
| Três Perguntas → Tarot Foco Agora | setembro:884 | Retirados; sem mapeamento para os cinco métodos. |
| Jornada da Pergunta → Sessão Profunda | setembro:885 | Alternativa ausente do catálogo. |
| `birth-chart → three-pillars` | setembro:886 | Candidata se recusa direta ao Mapa Completo e `three-pillars` ainda não foi comprado. Incoerente após `three-pillars → birth-chart`. |
| `life-atlas` → Trilha de Uma Área | setembro:887 | Alternativa ausente; não dividir o workflow atual implicitamente. |
| Sua Semana → Leitura Completa do Dia | setembro:888 | `date-reading` não é equivalente comprovado ao antigo diário. |
| `solar-return` → Próximos 90 Dias | setembro:889 | Alternativa ausente. |
| Ascendente 360 → Seu Regente em Foco | setembro:890 | Ambos fora da vitrine atual. |
| `synastry` → Faísca do Par | setembro:891 | Faísca era oferta paga histórica; ferramenta gratuita atual não é downsell comercial. |
| `couple-dossier` → Plano de Quatro Conversas | setembro:892 | Alternativa ausente. |
| `dream-dossier → dream-reading` | setembro:893 | Candidata se recusa direta e `dream-reading` não possuída; incoerente após upsell de `dream-reading`. |
| `dream-atlas` → Miniatlas de 7 Dias | setembro:894 | Alternativa ausente; diário atual é de 30 dias. |
| Plano anual → mensal do mesmo plano | setembro:895 | Sem modalidades de cobrança vigentes; não criar condição anual/mensal por inferência. |

## Bumps, cross-sell e ofertas compostas

Os 12 bumps de setembro:865-876 eram áudio para Tarot Foco, PDF de Três Perguntas, áudio do Mapa Completo, exercícios do Atlas, crédito de outra data, alertas semanais, áudio do Ascendente, card dos Três Pilares, áudio de Sinastria, cartas de conversa do casal, áudio privado do sonho e prompts para Dossiê. **Nenhum** tem hoje cadastro aprovado de entregável/preço/checkout. A alternativa “crédito de outra data” ainda depende de ledger e definição de unidade. PDF ou formato incluído na entrega não pode ser cobrado de novo (plano comercial:120-122). O pôster físico foi explicitamente adiado para depois da entrega e do gate físico (setembro:878,911); fica fora destas LPs digitais.

As 18 sugestões de cross-sell de setembro:905-922 tampouco constituem arestas ativas. “Candidata” na tabela significa apenas que origem e destino atuais existem, nunca aprovação da segmentação. Os gatilhos íntimos exigem escolha explícita; não se pode inferi-los lendo conteúdo privado.

| Origem → destino histórico/atual | Momento histórico | Situação e fonte |
|---|---|---|
| Tarot Foco → Faísca do Par | Após abrir síntese | Retirada: dois SKUs antigos; setembro:905. |
| Tarot → Leitura do Dia/Semana | Após segunda pergunta sobre “quando” | Não equivalência dos SKUs; não interpretar perguntas privadas como gatilho; setembro:906. |
| Tarot → Leitura Essencial do Sonho | Após entrega | `dream-reading` existe, mas a menção íntima não autoriza oferta automática; setembro:907. |
| Mapa Completo → Faísca/Sinastria | Após concluir capítulo de amor | `birth-chart` e `synastry` existem; Faísca retirada; consumo de capítulo não instrumentado; setembro:908. |
| Mapa Completo → Ascendente 360 | Após consumo | Destino retirado; setembro:909. |
| Mapa Completo → Sua Semana | Após entrega, fora do checkout | `birth-chart` e `week-reading` existem; pergunta sobre momento atual não instrumentada; setembro:910. |
| Mapa Completo → pôster personalizado | Após entrega e gate físico | Fora do recorte digital e sujeito a gate físico; setembro:911. |
| Horóscopo → Faísca do Par | Depois da leitura semanal | Faísca retirada; não inferir evento afetivo; setembro:912. |
| Horóscopo → Tarot Foco | Após satisfazer leitura principal | Tarot Foco retirado; setembro:913. |
| Horóscopo → Revolução Solar | Janela de aniversário | `solar-return` existe; falta contrato de aresta e contexto de aniversário verificável; setembro:914. |
| Ascendente pago → Três Pilares/Mapa | Após resultado | Origem paga retirada; ferramenta gratuita atual recomenda `three-pillars`/`birth-chart` em páginas públicas; setembro:915; `free-tools.ts:20-29`. |
| Ascendente → Faísca do Par | Após compartilhar card | Faísca paga retirada; não há oferta por compartilhamento; setembro:916. |
| Sinastria → Mapa individual | Após Sinastria | `synastry` e `birth-chart` existem; falta contrato de acesso individual e consentimento; setembro:917. |
| Sinastria → Ciclos a Dois/Semana | Após consumir relatório | Clube retirado; `week-reading` existe, mas o contexto temporal da relação não é gatilho atual; setembro:918. |
| Sinastria → Tarot Foco relacional | Após leitura | Tarot Foco retirado; não converter automaticamente em método atual; setembro:919. |
| Sonhos → Tarot Foco | Após leitura e escolha explícita | Tarot Foco retirado; escolha íntima não substitui contrato; setembro:920. |
| Sonhos → Ciclos em Dia | Após três registros e opt-in | Clube retirado; setembro:921. |
| Sonhos → Mapa Completo | Na síntese mensal e opt-in | `birth-chart` existe; falta contrato da aresta e opt-in verificável; setembro:922. |

Os sete “produtos combinados” de setembro:928-936 são recomendações históricas, não novas ofertas aprovadas. O contrato de outubro enumera exatamente 19 ofertas (contrato:11-31); não acrescentar bundles ou preços por esta tabela.

## Superfícies que podem ser preparadas agora

1. As 19 páginas públicas canônicas, com copy integral da entrega e estado real de disponibilidade, no trajeto `/leituras → /produtos/[slug]` (plano comercial:1-26,28-52,63-73).
2. A página contextual de **`birth-chart → life-atlas` após compra confirmada**, com conteúdo não transacional de prévia, comparação honesta da entrega e retorno ao mapa já adquirido. O mesmo `life-atlas` na página pública pergunta se a leitura serve à pessoa; a variante pós-compra explica o acréscimo sem afirmar consumo (plano:75-89). A futura condição precisa de pedido confirmado e elegibilidade no servidor; a URL isolada não prova isso.
3. Templates não transacionais para as cinco candidatas compatíveis da matriz (`three-pillars → birth-chart`, `week-reading → solar-return`, `synastry → couple-dossier`, `dream-reading → dream-dossier`, `dream-dossier → dream-atlas`), mantendo estado de **candidata histórica**. Uma eventual variante de `birth-chart → life-atlas` após abertura/consumo precisa de copy e gatilho separados. Os dois downsells candidatos exigem recusa explícita e checagem de propriedade.

No código auditado, `/produtos/[slug]` é pública e client-side (`apps/web/src/routes/produtos/[slug]/+page.ts:8-25`). `/biblioteca/[id]/+page.server.ts:10-31` autentica e lê a entrega do próprio usuário; abrir a rota não prova conclusão da leitura. O leitor não possui motor de ofertas. O webhook Hotmart só valida token e grava inbox sob flag, sem reconciliar compra ou redirecionar cliente (`apps/web/src/routes/api/webhooks/hotmart/+server.ts:7-68`). O domínio declara `begin_checkout`, `purchase` e `delivery_opened`, mas não há emissores integrados desses eventos (`packages/domain/src/events.ts:8-10`). A projeção de direitos da Minha Área representa estado/proveniência de compra, não um gatilho de upsell (`apps/web/src/lib/server/account-rights.ts:146-157`).

Para comercializar uma dessas páginas faltam condição/preço, produto/variante de oferta quando aplicável, checkout real, vínculo pedido→direito, evento de momento verificável, política de não reoferta e retorno à entrega. `/ofertas/[offerSlug]` é a família proposta no plano (linhas 67-73), e o colega implementa uma prévia contextual local; não deve ser interpretada como aprovação das arestas históricas nem como acesso por URL. Fluxos de ATV+ e benefícios dependem de origem formal e quota/resgate verificáveis, não de rótulo no dashboard.
