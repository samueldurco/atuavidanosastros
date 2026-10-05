# Mapa Mestre de SEO do ATVNA

Preparação de 05/10/2026 para implementar uma arquitetura única de busca orgânica, conteúdo editorial e produtos públicos. O [manifesto de consultas](keyword-map.v1.json) atribui 835 consultas candidatas a 125 URLs propostas, com títulos, H1, tipos de conteúdo e links contextuais. Não contém pesquisa de volume, páginas publicadas ou aprovação de conteúdo.

Status: PREPARATION_ONLY. RUN_ID: ATV-20260902-170644Z-01A0630F. Gasto autorizado: R$0. Nenhuma alteração de DNS, conta Google, código de produção, gate de produto ou rotina automática é realizada por esta entrega.

## Enquadramento no plano vigente

Esta é uma preparação finita solicitada pelos anexos sobre Google Notícias e SEO. Atende à arquitetura pública e às exigências de SEO do [plano mestre](../../../docs/30-execucao/PLANO_MESTRE_CONSTRUCAO_INTEGRAL_ATV_2026-09-02.md), especialmente §5.1, Onda 3 e lançamento. Não se torna uma frente auxiliar genérica nem substitui a fila dos 25 produtos, ATV+ ou o restante do plano.

Na última conferência, o checkpoint estava na WU220 do Atlas dos Sonhos, com E1 parcial e WU221 como próximo passo. Esse foco permanece intacto. As fases SEO abaixo são dependências futuras com aceite finito, não WUs já executadas e não uma ordem para interromper o produto ativo.

O [contrato de Horóscopo](../contracts/horoscope-editorial.md) distingue o produto personalizado experimental do Horóscopo geral público. Hub, doze signos, recorrência diária/semanal/mensal, histórico e validação hospedada continuam pendentes. A presente especificação não fecha esses requisitos.

## Base observada e limites

A origem canônica configurada em [site.ts](../../apps/web/src/lib/data/site.ts) é `https://atuavidanosastros.com.br`. `atvna.com.br` aparece nos anexos como exemplo e não deve ser adotado em canonical, sitemap ou links sem uma decisão explícita de migração. Configuração local não comprova domínio registrado, DNS, HTTPS ou site hospedado disponível.

Inventário focal observado no repositório:

| Superfície | Evidência local | Consequência |
| --- | --- | --- |
| Seis universos | `/meu-ceu`, `/ciclos`, `/amor`, `/proposito`, `/tarot`, `/sonhos` no registro editorial | Preservar navegação e associação dos conteúdos |
| Método, Caderno, privacidade, cookies e suporte | Entradas em `editorialPages`, servidas por `routes/[slug]` | Existência de shell não é aceite de conteúdo substancial |
| Meio do Céu | Rota dedicada local | Avaliar conteúdo e preservar histórico da URL |
| Casa 10, vocação e carreira no mapa | Entradas no registro editorial | Enriquecer destinos existentes antes de duplicá-los |
| Sitemap | `routes/sitemap.xml/+server.ts`, lista estática de 14 caminhos | Migrar para registro de publicações; não listar todos os candidatos |
| Robots | `static/robots.txt`, bloqueios de dashboard, biblioteca e entrar | Não substituir autenticação ou `noindex` por robots |
| Signos, Horóscopo geral, Notícias e pares | Sem rotas dedicadas encontradas na inspeção focal | Propostas, não destinos liberados |
| Calendário pessoal e Sinastria | Produtos no catálogo, em preparação | Não confundir com calendário público ou compatibilidade editorial |

O manifesto registra `PROPOSED`, `LOCAL_EDITORIAL_SHELL` ou `LOCAL_ROUTE`. Nenhum desses estados significa validação hospedada. Links do manifesto indicam relações planejadas; só devem aparecer no site quando os destinos forem públicos e utilizáveis.

## O que o Google considera

Conteúdo elegível é considerado automaticamente para Google Notícias; não há uma aprovação garantida obtida por cadastrar a publicação no Publisher Center. Exibição depende dos sistemas do Google e de suas políticas. Não prometer entrada em Notícias, “Principais notícias” ou Discover. [Orientação do Publisher Center](https://support.google.com/news/publisher-center/answer/14859160?hl=en)

`Article` e `NewsArticle` ajudam a descrever uma matéria, mas esse markup não é obrigatório para Google Notícias ou “Principais notícias”. As propriedades recomendadas pelo Google não são requisitos universais de admissão. A obrigatoriedade de campos na seção seguinte é uma escolha de qualidade do ATVNA. [Dados estruturados de artigo](https://developers.google.com/search/docs/appearance/structured-data/article)

Indexação e conformidade podem tornar um conteúdo elegível ao Discover, sem tags especiais ou garantia de tráfego. Planejar imagens relevantes com largura mínima de 1200 px, resolução suficiente, preferência por composição 16:9 e permissão de prévia grande. Evitar logos como imagem principal e imagens carregadas de texto. [Orientação do Discover](https://developers.google.com/search/docs/appearance/google-discover)

Ter uma data no título ou estar em `/noticias` não transforma uma interpretação astrológica em reportagem. O ATVNA adotará classificação editorial explícita, transparência sobre autoria e separação entre fatos astronômicos e leitura simbólica. [Políticas de transparência do Google Notícias](https://support.google.com/news/publisher-center/answer/6204050?hl=en)

## Arquitetura e propriedade de consultas

Uma consulta normalizada tem um único proprietário no manifesto. A normalização remove acentos apenas para comparação, converte em minúsculas e consolida espaços; o texto exibido permanece em português correto. Essa regra organiza a arquitetura, mas não controla qual URL o Google escolherá.

| Intenção | Proprietário | Conteúdo subordinado |
| --- | --- | --- |
| Signos e datas em geral | `/signos` | Doze perfis e guias de elementos/modalidades |
| Características e relações de um signo | `/signos/{signo}` | Seções de amor, trabalho, dinheiro e convivência |
| Horóscopo geral de hoje, semana ou mês | `/horoscopo` | Resumos e caminhos para os doze signos |
| Horóscopo recorrente de um signo | `/horoscopo/{signo}` | Períodos e assuntos em seções, não dezenas de páginas finas |
| Compatibilidade ampla ou melhores combinações | `/compatibilidade` | Explicação do método e seleção de pares |
| Um par específico | `/compatibilidade/{a}/{b}` | Afinidades, diferenças, limites e perguntas |
| Conceito ou evento sem data específica | Guia permanente correspondente | Calendário e matérias pertinentes |
| Calendário público de eventos | `/calendario-astral` | Ocorrências verificadas e respectivas fontes |
| Acontecimento apurado com data | Matéria permanente em `/noticias` | Guia, calendário e conteúdos relacionados |
| Consulta explicitamente datada de horóscopo | Coluna datada, se aprovada e distinta | Hub recorrente e perfil do signo |

Exemplo de distinção: “horóscopo de áries hoje” pertence a `/horoscopo/aries`; “horóscopo de áries em {data_por_extenso}” pode pertencer a uma coluna arquivada. Não criar uma coluna datada só para repetir o texto do destino recorrente.

O hub recorrente deve ter proposta e conteúdo próprios. Quando apenas resumir uma coluna do dia, oferece orientação, seleção e contexto, com link para o texto integral. Colunas originais e substanciais usam canonical próprio; não apontar indiscriminadamente todos os arquivos datados para o hub.

Os mesmos caminhos atendem variantes com e sem acento, maiúsculas, ordem de palavras e sinônimos. Não criar URLs alternativas para essas variantes. Amor, trabalho e dinheiro ficam inicialmente no corpo da página do signo; expansões exigem demanda observada, conteúdo distinto e aceite próprio.

## Os doze signos

| Nome editorial | Perfil permanente | Horóscopo recorrente |
| --- | --- | --- |
| Áries | `/signos/aries` | `/horoscopo/aries` |
| Touro | `/signos/touro` | `/horoscopo/touro` |
| Gêmeos | `/signos/gemeos` | `/horoscopo/gemeos` |
| Câncer | `/signos/cancer` | `/horoscopo/cancer` |
| Leão | `/signos/leao` | `/horoscopo/leao` |
| Virgem | `/signos/virgem` | `/horoscopo/virgem` |
| Libra | `/signos/libra` | `/horoscopo/libra` |
| Escorpião | `/signos/escorpiao` | `/horoscopo/escorpiao` |
| Sagitário | `/signos/sagitario` | `/horoscopo/sagitario` |
| Capricórnio | `/signos/capricornio` | `/horoscopo/capricornio` |
| Aquário | `/signos/aquario` | `/horoscopo/aquario` |
| Peixes | `/signos/peixes` | `/horoscopo/peixes` |

Não inferir signo solar exato apenas de uma faixa genérica de datas para nascimentos na transição. Distinguir referência editorial aproximada de cálculo individual com ano, instante e fuso.

## Briefs de conteúdo para implementação

Os tipos abaixo correspondem a `content_kind` no manifesto. Títulos e H1 por URL já estão nele; não são textos finais nem uma obrigação de repetir todas as consultas literalmente.

| Tipo | Conteúdo mínimo próprio | Revisão e conexões |
| --- | --- | --- |
| `SIGN_INDEX` | Explicar zodíaco e limites; apresentar os doze signos, datas aproximadas, elementos e acesso aos perfis | Método, guias e perfis publicados |
| `SIGN_PROFILE` | Abertura específica; símbolos, datas e ressalvas; elemento, modalidade e regência segundo o método; personalidade, forças, desafios; amor, trabalho, dinheiro, amizade e família; perguntas de reflexão | Fonte e autoria; distinguir Sol, Lua e Ascendente; link ao horóscopo e compatibilidade |
| `HOROSCOPE_INDEX` | Explicar leitura geral por signo e sua diferença para leitura personalizada; identificar períodos disponíveis e oferecer sínteses úteis | Doze destinos, calendário e método; não exibir conteúdo vencido como atual |
| `SIGN_HOROSCOPE` | Blocos revisados para hoje, semana e mês; amanhã somente quando preparado; período exato e fuso; interpretação contextual; amor, trabalho e recursos sem certezas deterministas | Evidência astronômica quando usada, autoria e revisão; histórico apenas com registros válidos |
| `COMPATIBILITY_INDEX` | Método de leitura simbólica entre signos, limitações e diferença para Sinastria; seleção curada de combinações | Perfis e universo Amor; produto personalizado só com destino e gate válidos |
| `SIGN_PAIR` | Análise própria do par, inclusive mesmo signo; pontos de encontro, diferenças, comunicação, conflitos e reflexão | Revisão humana; não prever fidelidade, sucesso ou fracasso; ligações aos dois perfis |
| `EVERGREEN_GUIDE` | Definição clara, exemplos identificados como didáticos, limites e relações com conceitos vizinhos | Fontes e atualização substancial; enriquecer os caminhos existentes |
| `EVENT_GUIDE` | Separar fenômeno astronômico de interpretação; explicar método, recorrência e limites sem inventar próximos instantes | Links para calendário e notícias verificadas |
| `EVENT_CALENDAR` | Ocorrências por período com horários, fuso, evidência e escopo de cobertura; filtros úteis sem multiplicar URLs indexáveis | Cálculo determinístico validado e revisão; sem calendário natal privado |
| `NEWS_INDEX` | Seleção cronológica de publicações reais, assuntos, datas e autoria | Não misturar notícias, colunas e publicidade sem identificação |

Não há meta artificial de número de palavras. O aceite exige que cada página responda à intenção com informação própria; trocar o nome do signo em um mesmo parágrafo não atende. Produzir muitas páginas pouco originais para manipular ranking pode violar a política de abuso de conteúdo em escala, independentemente de usar IA. [Políticas de spam](https://developers.google.com/search/docs/essentials/spam-policies)

Os 78 pares são o conjunto possível de combinações sem direção, incluindo doze pares do mesmo signo. Não são 78 publicações autorizadas. Implementar primeiro uma seleção com conteúdo e revisão completos. A ordem canônica segue a sequência do zodíaco no manifesto; só redirecionar a ordem inversa quando o destino estiver publicado.

A redação segue Atlas Essencial v3.0 e o design do app: editorial, responsável e legível. Não prometer resultados médicos, financeiros ou afetivos, nem apresentar leitura geral como conhecimento dos fatos da vida de uma pessoa.

## Notícias, colunas e confiança editorial

Pautas possíveis: explicações de eclipses, divulgação de eventos astronômicos verificáveis, entrevistas, análise de um ingresso planetário calculado e cobertura de fatos relacionados ao campo. São categorias, não afirmações de que um evento ocorrerá em determinada data.

Cada item deve declarar `editorial_kind`: `NEWS_REPORT`, `EXPLAINER`, `HOROSCOPE_COLUMN` ou `SPONSORED`. Diretório e data não decidem o tipo. Usar `NewsArticle` apenas quando o material for efetivamente jornalístico; `Article` é a escolha inicial para uma coluna interpretativa. Marcar publicidade de forma visível, não apenas em JSON-LD.

Contrato local proposto para um item público:

- Identificador e revisão imutáveis; slug e URL permanente; título, resumo e corpo próprios.
- Assunto e tipo editorial; autor real com página de perfil; revisor identificado no registro interno.
- `published_at` do primeiro lançamento público; `modified_at` somente para mudança substancial; período da interpretação em campo separado.
- Fontes com origem e consulta; evidências de cálculo, quando aplicável; direitos e crédito da imagem; texto alternativo.
- Decisão de revisão ligada à revisão exata; aprovação editorial e eventuais gates de produto separados.
- Histórico de correções, publicação e retirada; indicação de patrocínio e responsável, quando houver.
- Status `DRAFT → IN_REVIEW → APPROVED → PUBLISHED`; rejeição e retirada explícitas, sem promoção automática por relógio ou teste.

A publicação só oferece HTTP 200 indexável após corpo, relações, evidências e revisão completos. Preview é privado, com `noindex`. A aprovação não nasce de fixtures, benchmark, resultado de IA ou ausência de erro técnico. Reutilizar os princípios do [ADR de publicação revisada](../adr/0006-reviewed-editorial-publication.md), sem presumir que o serviço de revisão dos produtos já publica o Caderno ou as notícias.

Superfícies de confiança: `/sobre`, `/contato`, `/politica-editorial`, `/correcoes`, `/pessoas` e `/pessoas/{slug}`. Reutilizar Método, Caderno, privacidade, cookies e suporte existentes. Criar perfis apenas com identidade autorizada e informações verdadeiras; não inventar equipe, formação, endereço, fonte ou entrevista.

## Cálculos e limites do Horóscopo

IA pode apoiar redação conforme as autorizações existentes; não calcula efemérides, mapas, trânsitos ou datas de eventos. A base vem do motor determinístico aprovado e de fontes rastreáveis, com instante, fuso, convenção, versão do motor/efemérides, cobertura e limitações registrados.

Amostra às 12h UTC não comprova cobertura de um dia inteiro. Definir política de amostragem ou cálculo dos eventos, tolerâncias e testes antes de afirmar posições “de hoje”. Exibir período com início e fim, referência temporal e `America/Sao_Paulo` quando essa for a convenção adotada, usando datas ISO completas nos dados.

Se a base, revisão ou rotina de atualização não estiver disponível, mostrar indisponibilidade honesta e retirar afirmações de atualidade. Nunca usar o conteúdo de ontem como hoje por alteração de título ou `dateModified`. Não gerar amanhã, semana ou mês apenas para ocupar a seção.

`/calendario-astral` é público e geral; `/calendario-pessoal` é personalizado. Compatibilidade por signo não substitui Sinastria consentida. Resultados privados, dados natais e histórico de clientes ficam fora de sitemap, busca pública, JSON-LD e analytics editorial.

## SEO técnico e metadados

Implementar um registro único de conteúdo público aprovado como origem de páginas, canonical, sitemap, RSS, índices e links. O manifesto planeja consultas, mas não autoriza o registro inteiro a aparecer nesses canais.

Requisitos locais por página publicada:

- HTML renderizado no servidor com título, H1, conteúdo principal, descrição própria, canonical absoluto e navegação útil.
- `lang="pt-BR"`, Open Graph coerente e imagem pertinente com direitos; `max-image-preview:large` para conteúdo público autorizado a prévias.
- URL em ASCII minúsculo, política única de barra final, sem parâmetros de campanha no canonical. Fragmentos são navegação interna, não URLs canônicas separadas.
- `BreadcrumbList` para hierarquia real; dados de artigo só quando o conteúdo for um artigo. Não gerar estrelas, FAQs ou rich results sem justificativa.
- Em artigos, JSON-LD com `headline`, `description`, `image`, `author`, `publisher`, `datePublished`, `dateModified` quando pertinente e `mainEntityOfPage`. Autoria, título e datas devem coincidir com o que o leitor vê.
- Autor como `Person` ou organização real, com URL de perfil; publisher com identidade e imagem verdadeiras. Schema não comprova credenciais.
- Rotas desconhecidas e conteúdo não publicado: 404 ou preview autenticado. Retirada: decisão entre 404/410 ou redirect para sucessor realmente equivalente; evitar soft 404.
- Staging fora do índice; autenticação e controles de acesso nos dados privados. `noindex` precisa ser observável pelo crawler em páginas públicas já indexadas; não confiar no bloqueio de robots para removê-las.
- Inventário de URLs históricas antes de renomear qualquer caminho. Redirecionamentos 301 apenas quando o destino preserva a intenção; não enviar tudo à home.

Canonical, sitemap e links internos devem concordar. Redirects e canonical são sinais fortes de consolidação; sitemap é um sinal mais fraco, e o Google pode escolher outra URL. Não usar robots como mecanismo de canonicalização. [Consolidação de URLs duplicadas](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)

Testes de aceitação incluem status HTTP, HTML sem depender de JavaScript para o conteúdo essencial, canonical e imagens absolutos, correspondência dos metadados, acesso privado negado, redirects sem loop, teclado, mobile e ausência de textos/fixtures usados como publicações.

## Sitemaps e RSS

Manter `/sitemap.xml` como índice dos sitemaps publicados. Proposta: `/sitemap-pages.xml` para institucionais e hubs, `/sitemap-editorial.xml` para guias e artigos públicos e `/news-sitemap.xml` para notícias elegíveis recentes. Fazer a troca a partir da implementação existente, sem listar caminhos ainda não disponíveis.

Para o News sitemap: namespace oficial; `news:publication` com nome editorial real e idioma `pt`; `news:publication_date` da publicação original; `news:title` igual ao título. Incluir apenas notícias publicadas nos últimos dois dias, no máximo 1000 entradas por arquivo. Remover notícias antigas do sitemap de notícias, não do site nem necessariamente do sitemap editorial. Um arquivo vazio pode ser legítimo. [Especificação do News sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap)

Implementar a janela com tempo controlável em testes e cache compatível com sua expiração. `lastmod` e `dateModified` não são campos para fingir frescor. Colunas interpretativas não entram automaticamente no News sitemap.

RSS proposto: `/noticias/feed.xml`, com identificador permanente, link, título, resumo, autoria e publicação original. Somente conteúdo público e aprovado; XML escapado, sem dados pessoais ou previews. RSS é distribuição editorial, não garantia de entrada no Google Notícias.

Atualizar robots com o índice de sitemap correto, sem abrir caminhos privados. Aceite técnico: XML válido, URLs 200 indexáveis, origem correta, sem repetidos ou previews, cobertura temporal testada e ausência de páginas do manifesto não publicadas.

## Pesquisa de demanda e radar editorial

As 835 consultas são hipóteses editoriais, não “palavras-chave com volume comprovado”. Todas herdam `CANDIDATE_UNMEASURED`, fonte nula e métricas nulas. Consultas temporais com placeholders estão separadas e não entram nessa contagem.

Google Trends usa interesse relativo normalizado em escala 0–100, não volume mensal absoluto. Guardar região, período, categoria, tipo de busca e data da extração antes de comparar resultados. [Como os dados do Trends são ajustados](https://support.google.com/trends/answer/4365533?hl=en)

Consultas “em ascensão” medem crescimento relativo; “Breakout” indica crescimento acima de 5000%, não procura absoluta alta por si só. Validar a intenção e a relevância do tema antes de produzir uma pauta. [Consultas relacionadas](https://support.google.com/trends/answer/4355000?hl=pt-BR)

O radar futuro recebe exportação oficial CSV/RSS ou dados fornecidos por capacidade autorizada. “Em alta” permite filtros temporais e exportações, mas isso não comprova uma API geral disponível para esta conta. [Ajuda de Em alta](https://support.google.com/trends/answer/3076011?hl=pt-BR)

Fluxo proposto: sinal com evidência → normalização → associação ao proprietário → classificação notícia/guia/coluna → checagem factual → revisão humana → publicação autorizada. Quando já existir URL adequada, atualizar seu conteúdo ou propor uma matéria realmente distinta; não criar um clone por variante da consulta.

Cada sugestão registra consulta, origem, recorte, medida observada, assunto, URL proprietária, motivo editorial, fontes a verificar e status. Se não houver evidência, permanece hipótese. O sinal do Trends não é prova de um fato astronômico.

Automação, scheduler, nova API paga e publicação automática ficam desligados. Não criar agora um monitor, job recorrente ou conector. Search Profiles e outras superfícies opcionais não são dependências desta entrega.

## Medição e liberação hospedada

Após disponibilidade e autorização dos responsáveis, verificar o domínio na Search Console e registrar evidência da propriedade, enviar sitemaps efetivamente publicados e inspecionar amostras de URL. Não criar conta, editar DNS ou registrar propriedade como parte desta preparação.

GA4 ou equivalente exige implementação compatível com consentimento e privacidade. Não transmitir nascimento, nome, identificador de cliente, diário, consultas privadas ou resultados individuais. Usar métricas agregadas e eventos editoriais mínimos.

Separar quatro níveis de evidência: manifesto íntegro local; rotas/conteúdo validados localmente; site hospedado e configuração Google confirmados; resultados observados após indexação. PASS no primeiro não implica os três seguintes.

Indicadores iniciais: indexação das páginas publicadas, erros de sitemap, consultas e páginas com impressões/cliques, CTR com contexto e destinos concorrentes para a mesma intenção. Relatórios de Google Notícias/Discover podem não estar disponíveis; ausência de relatório não equivale a zero tráfego ou rejeição. Não estabelecer metas fictícias de posição, prazo ou visitantes.

Investigar canibalização apenas com evidência: mesma intenção atendida por destinos concorrentes, conteúdo semelhante e sinal de alternância. Duas páginas com impressões para uma consulta não bastam para ordenar exclusão ou redirect.

## Fases e aceite finito

| Fase | Implementação futura | Aceite para fechar |
| --- | --- | --- |
| SEO1 | Registro público e fluxo editorial; metadados, canonical, privacidade, instituições, sitemap e RSS | Testes locais completos; apenas itens aprovados indexáveis; evidência hospedada separada e gates preservados |
| SEO2 | Hub Signos e doze perfis substanciais; elementos/modalidades quando necessários | Doze briefs revisados, autoria/fontes, relações úteis e nenhum clone por consulta |
| SEO3 | Horóscopo geral e doze signos, recorrência e arquivo editorial; Notícias com classificação honesta | Cobertura temporal/cálculos e revisão provados; atualização segura; histórico correto; News sitemap só com notícias elegíveis |
| SEO4 | Seleção de pares, guias e calendário público; pesquisa de demanda e radar somente se autorizado | Cada página tem valor próprio, evidência e revisão; pares não publicados em lote; nenhum gasto ou automação implícita |

O estado observado das páginas existentes não elimina SEO1 nem converte guias em conteúdo aprovado. A ordem é uma dependência técnica para essa superfície; sua execução continua subordinada ao plano mestre e ao produto/marco ativo. Dividir fases em WUs pequenas com provas quando sua implementação entrar no escopo.

Gate B/Lab acompanham a entrega pertinente; não promovem motor, modelo, publicação ou produto apenas por haver conteúdo SEO. E1–E5 dos produtos, disponibilidade externa, privacidade, Hotmart e orçamento permanecem com suas autoridades originais.

## Validação desta preparação

Executar a partir de `E:/ATVNA/app`:

```powershell
node scripts/validate-seo-keyword-map.mjs
```

O [validador](../../scripts/validate-seo-keyword-map.mjs) verifica schema e origem, status/gates desligados, métricas ausentes, paths, unicidade normalizada das consultas, doze signos, doze destinos recorrentes, ordem dos 78 pares, contagens e links presentes no registro. Não verifica volume, mérito editorial, URL hospedada ou aprovação Google.

Resultado local em 05/10/2026: PASS, 125 páginas propostas, 835 consultas candidatas, zero conflitos normalizados e zero destinos ausentes no registro. Os dois templates temporais não estão incluídos nas 835 consultas; as 16 rotas de fundação também não estão incluídas nas 125 páginas.

Aceite desta entrega: mapa e manifesto coerentes, referências oficiais identificadas, consulta com proprietário único e limites de implementação explícitos. Nenhuma página foi publicada; SEO1–SEO4 e o Horóscopo geral não estão concluídos.
