# P02 — catálogo e evidência de intenção

Data: 04/11/2026. RUN_ID: `ATV-20260902-170644Z-01A0630F`.

Este documento especifica onze produtos digitais avulsos, com entrega web individual. Os três primeiros formam a estreia prioritária; a ordem não libera os demais para cobrança nem transforma preparação em entrega. O registro estruturado é [launch-metadata.json](launch-metadata.json): contém promessa, situação, entradas públicas e técnicas, método, limites, esquema completo da entrega, produto próximo e amostra editorial de cada item. Os exemplos são inteiramente fictícios e não calculados; não são mapas, tiragens, resultados de modelo ou interpretações homologadas.

## Identidade e recorte de cada produto

| Ordem | ID estável / nome público | Decisão ou situação | Método e entrega delimitada | Oferta próxima e diferença |
| --- | --- | --- | --- | --- |
| 1, estreia | `wedding-date-map` — Mapa da Data de Casamento | Escolher entre duas ou três opções reais de cerimônia. | Astrologia eletiva dos mapas dos eventos; quadro comparativo, opção preferida, alternativa e cuidado de cada opção. | `date-reading`: interpreta uma data para uma pessoa; o novo produto compara eventos. Não é sinastria nem garantia de casamento feliz. |
| 2, estreia | `ex-tarot` — Tarot do Ex: Saudade e Arrependimento | Examinar um episódio ou contato recente com o ex antes de agir. | Tiragem de três posições com fatos do relato, hipóteses alternativas e sinais observáveis de reparação. | `tarot-aphrodite-temple`: recorte específico do episódio, com três posições; não retrato amplo da relação nem acesso à mente alheia. |
| 3, estreia | `love-restart-map` — Mapa do Recomeço Amoroso | Lidar com silêncio, contato ou possível retomada nos próximos 30 dias. | Trânsitos do próprio mapa em período fechado; sinais e postura para cada cenário, condições e limites. Subtítulo: **Previsão de 30 dias**. | `personal-calendar`: foco em uma transição amorosa e nos cenários de ação, sem substituir o calendário geral. |
| 4 | `sexuality-map` — Mapa da Sexualidade | Reconhecer desejo, conforto e forma de demonstrar interesse. | Vênus e Marte no mapa próprio e duas situações relatadas; condição de conforto, experiência de expressão e limite. | `birth-chart`: recorte adulto e pessoal de desejo, sem inferir orientação ou saúde sexual. |
| 5 | `intimacy-map` — Mapa da Intimidade a Dois | Comunicar um desejo na relação atual respeitando ritmo e limite. | Leitura individual e contexto; convite adaptável e alternativa real diante de recusa. | `synastry`: não exige mapa nem participação do parceiro; não vende compatibilidade do casal. |
| 6 | `emotional-reactions-map` — Mapa das Reações Emocionais | Compreender uma reação recorrente em uma situação concreta. | Fatores natais e sequência gatilho → reação → efeito observado; frase alternativa e sinal para reavaliar. | `birth-chart`: um padrão aplicado ao cotidiano; não diagnóstico ou tratamento. |
| 7 | `financial-blocks-tarot` — Tarot dos Bloqueios Financeiros | Examinar um impasse ao cobrar, receber ou aproveitar oportunidade. | Três cartas: impasse, possível bloqueio e primeiro passo; hipótese, sinal e ação verificável. | `tarot-situation-challenge-advice`: recorte financeiro concreto; não investimento, renda prometida ou explicação única para dificuldades. |
| 8 | `hidden-talent-map` — Mapa do Talento Oculto | Reconhecer uma habilidade recorrente nos favores que os outros pedem. | Mapa próprio e dois exemplos de ajuda; habilidade comum, pequena oferta inicial, escopo, limite, apresentação e retorno a colher. | `career-compass`: experimento pequeno a partir de tarefas reais; não orientação completa de carreira nem precificação automática. |
| 9 | `ascendant-style` — Meu Estilo pelo Ascendente | Vestir-se para uma ocasião com o que já possui. | Ascendente calculado com horário confiável, preferências e inventário; três composições com peças existentes e ajuste de conforto. | `ascendant`: a calculadora segue gratuita; o produto pago é a aplicação individual em escolhas de vestuário. |
| 10 | `conversation-timing` — A Hora da Conversa — Horóscopo Amoroso | Decidir quando abordar um assunto amoroso nos próximos sete dias. | Trânsitos do próprio mapa e disponibilidade real; falar/aguardar, condição do momento e frases de abertura/encerramento. | `week-reading`: uma conversa delimitada; não leitura da semana inteira nem promessa de resposta favorável. |
| 11 | `cohabitation-map` — Mapa da Convivência a Dois | Preparar uma conversa antes de morar junto. | Mapa próprio e hábitos próprios/observados; afinidade, atrito e três acordos com responsabilidade, frequência e revisão. | `synastry`: não compara dois mapas nem exige segundo respondente; produz pautas negociáveis de convivência. |

Os quatro produtos afetivos de mapa não se fundem: Sexualidade termina em autopercepção e expressão; Intimidade termina em convite; Convivência termina em acordos; Recomeço termina em cenários temporais. Os dois Tarot também têm posições, situação e saída diferentes. Não criar novas categorias de produto ou duplicar os IDs por variação de título.

## Evidência local e limites de interpretação

A extração leu exatamente as cinco fontes exigidas no prompt, sem modificar os originais. A skill `atvna-seo-expansao` foi aplicada somente ao tratamento de evidências locais e à prevenção de canibalização. O script [extract-keyword-evidence.py](extract-keyword-evidence.py) reproduz [keyword-evidence.json](keyword-evidence.json), que registra caminhos absolutos, SHA-256, contagem de linhas, linhas de origem e valores literais. As contagens excluem o cabeçalho:

| Fonte | Registros | Uso |
| --- | ---: | --- |
| `04-fonte-bruta/keywords-merged-consolidado.csv` | 19.519 | Estimativas históricas de busca e termo bruto. |
| `01-seo-intelligence/KEYWORD_MASTER.csv` | 19.519 | Classificação histórica, hipótese de intenção e URL proposta. |
| `01-seo-intelligence/KEYWORD_PLANNER_TAROT_2026-07-29.csv` | 478 | Contexto histórico de Tarot e faixas do Keyword Planner. |
| `01-seo-intelligence/KEYWORD_URL_MAP.csv` | 47 | Responsáveis de intenção já propostos; evitar substituição silenciosa. |
| `01-seo-intelligence/KEYWORD_DATA_DICTIONARY.md` | Documento | Semântica e ressalvas; texto histórico não substitui presença atual do MASTER. |

Na tabela abaixo, `B:n` significa linha física no consolidado bruto, incluindo cabeçalho. Os números são o campo histórico `avg_monthly_searches` e **não** buscas observadas na ATVNA, demanda comercial pelo produto, pessoas únicas ou previsão atual. O JSON também preserva as contrapartes do MASTER.

| Produto | Indícios adjacentes na fonte bruta | O que a evidência permite concluir |
| --- | --- | --- |
| Data de Casamento | “signos que combinam para casar”, 500 (B:3910); “aquário e gêmeos no casamento”, 500 (B:4157) | Há interesse em casamento e compatibilidade. A disposição a pagar por eleição de data continua hipótese. |
| Tarot do Ex | “signos que voltam com ex”, 500 (B:3920); “taurino arrependido”, 50 (B:17898) | Há interesse em retomada e arrependimento. Não mede procura por esta tiragem. |
| Recomeço Amoroso | “signos que voltam com ex”, 500 (B:3920); “mapa astral amoroso”, 50 (B:7417) | Sustenta o contexto de retorno e astrologia amorosa, sem medir previsão individual paga de 30 dias. |
| Sexualidade | “venus capricórnio”, 5.000 (B:2088); “áries no sexo”, 500 (B:2359) | Interesse interpretativo em Vênus e sexualidade por signo, não conversão do mapa individual. |
| Intimidade a Dois | “áries no sexo”, 500 (B:2359); “libra no sexo”, 500 (B:3074) | Contexto adulto adjacente. A utilidade de um convite negociável é hipótese de produto. |
| Reações Emocionais | “lua em touro significado”, 500 (B:5270); “capricórnio com raiva”, 50 (B:10409) | Procura por interpretação e reação; não valida diagnóstico nem tratamento. |
| Bloqueios Financeiros | “dinheiro para o signo de peixes hoje”, 5.000 (B:810); “mapa astral financeiro”, 50 (B:7799) | Tema financeiro astrológico adjacente, sem procura medida por esta tiragem. |
| Talento Oculto | “mapa astral profissional gratuito”, 500 (B:3132); “mapa astral vocacional”, 50 (B:6485) | Interesse vocacional; o termo gratuito não demonstra disposição a pagar por microoferta. |
| Estilo pelo Ascendente | “ascendente em touro”, 5.000 (B:408); “ascendente em áries”, 5.000 (B:447) | Forte adjacência à calculadora/interpretação, sem comprovação de demanda por vestuário. |
| Hora da Conversa | “horóscopo do amor hoje”, 5.000 (B:375); “horóscopo semanal amor”, 500 (B:2157) | Interesse temporal amoroso geral; timing de uma conversa é hipótese mais estreita. |
| Convivência a Dois | “sinastria”, 5.000 (B:358); “mapa astral casal”, 500 (B:2141) | Interesse em casal; não valida um produto com um único mapa e acordos de casa. |

Os onze títulos aprovados não aparecem como correspondência literal nos quatro CSV após normalização de acento e caixa. Isso não demonstra volume zero: as fontes têm cobertura limitada e não houve nova pesquisa de mercado nesta execução. O suplemento de Tarot contém “a carta da estrela no amor” (linha 46) e “carta a torre no amor” (linha 239), ambas na faixa histórica 10–100 e com origem `google_keyword_planner_2026-07-29`. São contexto interpretativo; não confirmação de demanda pelos novos Tarot do Ex ou Financeiro.

O MASTER conserva registros `proxy_lexical`, `PENDENTE_SERP` e decisão `PENDENTE`; a intenção informacional não vira intenção transacional por ser usada nesta ficha. Há inconsistência em “ascendente em touro”: `volume_band=10k-100k` e `volume_monthly_source=5000`. No MASTER, esse último campo contém número em texto; no suplemento, contém proveniência. Não somar colunas de semântica distinta nem escolher a maior faixa para um argumento comercial. Concorrência/CPC de anúncios não são dificuldade orgânica, preço ou faturamento. Buscas de Lua também geraram candidatos de celebridades na filtragem ampla; foram descartadas semanticamente. As contagens de candidatos não são estimativas de mercado.

## Intenção e descoberta

Preservar os responsáveis atuais de intenção e o catálogo oficial: a calculadora de ascendente continua ferramenta gratuita; sinastria mantém sua comparação de dois mapas; páginas de horóscopo permanecem leitura geral; os novos produtos entram com seus próprios slugs e promessa específica. URLs históricas propostas no URL_MAP não provam rotas publicadas. Não atualizar esse arquivo automaticamente a partir destas fichas.

Os onze itens ocupam Meu Céu, Amor e Relações, Tarot e Arcanos e Propósito e Prosperidade. A ausência de um novo produto de Sonhos e Símbolos é uma decisão de escopo: não inventar um décimo segundo item nem uma análise de sonhos sem método e entrega próprios. Ciclos do Tempo continua representado no catálogo existente; não reclassificar produtos apenas para preencher universos.

## Aceite de preparação e passagem aos gates

Uma ficha está especificada quando tem todos os campos de `launch-metadata.json`, diferenciação testável e exemplo da estrutura. Os `sampleDelivery` curtos das fichas não são as entregas completas exigidas por E2. O [contrato editorial](editorial-delivery-contract.md) define as seções e o pacote de exemplo completo necessário por produto. Antes de coleta real, o servidor deve validar entradas por produto, identidade e consentimentos, recusar horário necessário ausente e separar evidência determinística de texto interpretativo. Astronomia usa fatos calculados e método versionado; Tarot usa uma tiragem real registrada. Os exemplos editoriais não substituem nenhum desses fatos.

Para liberar uma entrega: implementar o fluxo, produzir evidência determinística, passar homologação privada aplicável, medir geração/custo/latência e concluir os gates técnicos e comerciais. Registrar preço ou custo desconhecido como `null`. A presença no catálogo, formulário ou recibo de preparação não é uma leitura, um cálculo pronto ou homologação. Publicação hospedada e cobrança exigem evidência própria; a preparação local não as autoriza por inferência.
