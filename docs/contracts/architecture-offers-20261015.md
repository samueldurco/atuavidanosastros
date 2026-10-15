# Arquitetura de ofertas — decisão de 15/10/2026

O proprietário aprovou a execução da reformulação no site principal, com todos os produtos liberados para avaliação somente em sua conta. A pausa da sessão paralela de reconstrução removeu a dependência de espera; suas melhorias existentes são preservadas. Este aditivo substitui contagens, nomes comerciais, organização de navegação e definição de ATV+ dos contratos anteriores quando divergentes. Não modifica cálculo, consentimentos, gates, autorização privada ou histórico.

## Seis universos, nove ferramentas e 19 ofertas

Os universos públicos são Mapa Astral, Previsões, Amor e Relacionamentos, Dinheiro e Carreira, Tarot e Sonhos. Os IDs internos dos universos permanecem estáveis. A assinatura ATV+ é transversal e não integra a contagem das ofertas avulsas.

`packages/domain/src/catalog.ts` mantém os registros de execução e histórico em `productCatalog`; `offeredProductIds` e `productOffers` definem explicitamente as 19 ofertas. Na interface, `customerProducts` preserva o catálogo técnico e `customerOffers` alimenta as vitrines. Não deduzir a vitrine por `personalized` ou pela contagem de workflows.

| ID preservado ou novo | Oferta pública |
| --- | --- |
| `birth-chart` | Mapa Astral Completo |
| `three-pillars` | Sol, Lua e Ascendente |
| `life-atlas` | Mapa Astral por Temas |
| `week-reading` | Horóscopo Semanal Pessoal |
| `personal-calendar` | Calendário de Previsões — Próximos 30 Dias |
| `date-reading` | Horóscopo para uma Data Especial |
| `solar-return` | Mapa do Seu Ano — Revolução Solar |
| `synastry` | Análise Astral do Casal |
| `couple-dossier` | Aprofundamento Astral do Casal |
| `purpose-career` | Mapa Astral de Dinheiro e Carreira |
| `career-forecast-30d` (novo) | Previsões de Dinheiro e Carreira — Próximos 30 Dias |
| `tarot-situation-challenge-advice` | Tarot — 3 Cartas (Situação, Desafio e Conselho) |
| `tarot-peladan-cross` | Tarot — 5 Cartas (Cruz Péladan) |
| `tarot-celtic-cross` | Tarot — 10 Cartas (Cruz Celta) |
| `tarot-aphrodite-temple` | Tarot Relacionamentos — 7 Cartas (Templo de Afrodite) |
| `tarot-astrological-mandala` | Tarot — 12 Áreas da Vida (Mandala Astrológica) |
| `dream-reading` | Interpretação do Sonho |
| `dream-dossier` | Interpretação Aprofundada do Sonho |
| `dream-atlas` | Diário de Sonhos — 30 Dias |

Os métodos de Tarot são independentes; não há compra obrigatória de um método anterior. A Mandala tem 13 cartas: 12 áreas e uma síntese central. Não apresentar as 12 áreas como um mapa natal calculado nem atribuir conhecimento dos pensamentos de outra pessoa. Uma nova visualização ou exportação da mesma leitura não sorteia novamente.

Calendário pessoal e previsão de dinheiro e carreira cobrem 30 dias consecutivos a partir da geração. `direction-journey` conserva sua execução histórica de objetivo e etapas; seu antigo endereço comercial redireciona para a nova previsão, sem reinterpretar entregas salvas como trânsitos. `dream-atlas` reúne registros por 30 dias e entrega análise integrada ao final, somente sobre relatos existentes. Interpretações individuais permanecem avulsas.

As ferramentas gratuitas são Calculadora de Ascendente, Mapa Astral Grátis, Horóscopo de Hoje, Combinação Astral do Casal, Calculadora do Meio do Céu, Dinheiro no Seu Mapa Astral, Carta do Dia, Carta do Amor e Registro de Sonhos. IDs, destinos, disponibilidade e ligação às ofertas ficam em `apps/web/src/lib/data/free-tools.ts`. A disponibilidade de uma ferramenta depende de seu runtime ou publicação real, não do estado do produto pago. Resultados gratuitos precedem cadastro; guardar na conta exige autenticação e consentimento.

## ATV+ sem canibalizar ofertas avulsas

As definições reutilizáveis estão em `packages/domain/src/atv-plus-plans.ts`. Cada ciclo tem 30 dias:

| Plano | Escolhas por ciclo |
| --- | --- |
| Essencial | Um Calendário de Previsões **ou** uma Previsão de Dinheiro e Carreira. |
| Ampliado | A previsão do Essencial e uma leitura: Tarot de 3 cartas **ou** Interpretação do Sonho. |
| Premium | A previsão do Essencial e duas leituras básicas, em qualquer combinação, **ou**, no lugar dessas duas, uma Cruz Péladan de 5 cartas ou um Tarot Relacionamentos de 7 cartas. |

As duas previsões são alternativas. O Premium não acumula duas leituras básicas com uma maior. Não há leitura ilimitada, saldo em dinheiro ou descontos definidos nesta etapa. Mapas natais, análises do casal, Revolução Solar, Tarot de 10 cartas, Mandala, leitura aprofundada de sonho, diário e horóscopo de uma data continuam avulsos. Produtos físicos também ficam fora. Ferramentas gratuitas e histórico da conta não exigem assinatura; entregas recebidas permanecem no histórico após cancelamento.

A função `atvPlusSelectionAllowed` valida apenas a combinação de IDs de um ciclo completo, incluindo consumo anterior. Não autentica, persiste, abre acesso nem simula cobrança. O servidor deve conservar o consumo e verificar a autorização privada. A simulação de plano é distinta da liberação ampla de avaliação do proprietário.

## Endereços, publicação e cobrança

`productSlugAliases` preserva os endereços comerciais antigos com redirecionamento 308 para os nomes atuais. Os leitores e arquivos continuam ligados aos IDs originais. A substituição comercial de Jornada de Carreira não remove seu histórico. Os cinco produtos de Tarot aposentados continuam fora da vitrine e preservados somente para consulta histórica.

A oferta planejada de R$ 7,90 pertence a Previsões, na leitura de uma data especial; este aditivo não cadastra esse valor nem cria preços para outros produtos. Cadastro de preços, plataformas e cobranças ocorrerá após uso e aprovação dos produtos pelo proprietário. Novas definições continuam `PREPARING`; o teste privado não altera publicação pública nem autoriza pagamento. Loja dos Signos trata de produtos físicos e exibe apenas disponibilidade comprovada.

O lettering passa a apresentar grandes blocos com título informativo. “Caminhos” deixa de ser a marca de uma microferramenta. A estética vigente continua regida por `docs/DESIGN.md` e pela skill `atvna-web-design`.
