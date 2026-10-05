# Auditoria dos percursos e da linguagem

RUN_ID: ATV-20260902-170644Z-01A0630F. Escopo: 25 produtos e ATV+. Implementação local, sem liberação comercial ou homologação das interpretações pendentes.

As 26 apresentações públicas em `/produtos/[slug]` compartilham uma estrutura: nome reconhecível, benefício, escopo, dados necessários, formatos previstos e disponibilidade. O catálogo conserva IDs, slugs, direitos e estado. Todas as entradas estão em preparação; não exibem preços, checkout ou geração fictícia. A ferramenta gratuita de Meio do Céu tem acesso próprio.

Para os 25 produtos personalizados, `/biblioteca/nova/[id]` conserva a intenção em `/entrar?next=...`. O destino é validado no servidor. Formulários e leitores existentes mantêm suas validações e mecanismos de autorização. ATV+ é apresentado como clube em preparação, sem inventar benefícios comerciais.

## Continuidade entre a oferta e o formulário

O nome escolhido aparece na oferta, no retorno do login, no formulário, na Biblioteca e no leitor. Os formulários pedem os dados próprios da leitura e usam “Solicitar leitura” para registrar um pedido. A solicitação só fica habilitada quando acesso e disponibilidade permitem; o botão não anuncia um resultado instantâneo.

| Família de entrada      | Produtos                                                                                                                                                                         | Continuidade conferida                                                              |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Dados de nascimento     | Mapa Astral, Sol, Lua e Ascendente, Ascendente, Meio do Céu, Bússola de Carreira, Mapa de Carreira, Mapa Astral 360                                                              | Perfil, precisão da hora, contexto pertinente, consentimento e referência privada.  |
| Perguntas e sonhos      | Carta do Dia, Três Perguntas, Foco Agora, Tarot Sim ou Não, Interpretação de Sonhos, Registro de sonho, Jornada de Tarot, Leitura Aprofundada do Sonho, Diário de Sonhos 30 Dias | Pergunta ou relato, campos próprios do produto e recuperação do pedido.             |
| Período ou duas pessoas | Previsões para uma Data, Previsões da Semana, Revolução Solar, Calendário pessoal, Jornada de Carreira, Horóscopo, Combinação do Casal, Sinastria, Dossiê do Casal               | Data/período/local ou dois perfis, autorização pertinente e resultado identificado. |

As 25 rotas de entrada estão implementadas. Isso não significa que os 25 processamentos e interpretações estejam liberados: os estados de preparação, acesso recusado e serviço indisponível continuam visíveis. Recuperar uma solicitação antiga permanece separado de criar outra.

| Produto / ID                                 | Entrada pública                    | Dados / assunto específico                                                     | Ação quando disponível             | Formatos do contrato          |
| -------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------- | ----------------------------- |
| Mapa Astral / birth-chart                    | /produtos/mapa-astral              | Nascimento; personalidade, emoções, relações e trabalho                        | Fazer meu mapa astral              | Site, PDF, imagem             |
| Sol, Lua e Ascendente / three-pillars        | /produtos/tres-pilares             | Nascimento; três fatores explicados                                            | Conhecer meu Sol, Lua e Ascendente | Site                          |
| Ascendente / ascendant                       | /produtos/ascendente               | Nascimento; hora influencia o resultado                                        | Descobrir meu Ascendente           | Site, imagem                  |
| Mapa Astral 360 / life-atlas                 | /produtos/atlas-da-vida-360        | Nascimento e quatro assuntos escolhidos                                        | Escolher os temas do meu mapa      | Site, PDF, imagem prevista    |
| Horóscopo / horoscope                        | /produtos/horoscopo                | Nascimento e data escolhida                                                    | Ver meu horóscopo                  | Site                          |
| Previsões para uma Data / date-reading       | /produtos/leitura-da-data          | Nascimento, data e contexto opcional                                           | Ver previsões para uma data        | Site                          |
| Previsões da Semana / week-reading           | /produtos/semana                   | Nascimento, semana, fuso e tema                                                | Ver previsões da semana            | Site, PDF                     |
| Calendário pessoal / personal-calendar       | /produtos/calendario-pessoal       | Nascimento, mês e datas pessoais opcionais                                     | Criar meu calendário               | Site, PDF                     |
| Revolução Solar / solar-return               | /produtos/revolucao-solar          | Nascimento, ano e local do aniversário                                         | Ver meu ano astrológico            | Site, PDF                     |
| Sinastria / synastry                         | /produtos/sinastria                | Dois mapas e autorização                                                       | Comparar nossos mapas              | Site, PDF                     |
| Combinação do Casal / pair-preview           | /produtos/preview-do-par           | Dois mapas; Sol, Lua e Ascendente                                              | Ver nossa combinação               | Site                          |
| Dossiê do Casal / couple-dossier             | /produtos/dossie-do-casal          | Dois mapas e contexto da relação                                               | Conhecer a leitura do casal        | Site, PDF                     |
| Carta do Dia / daily-card                    | /produtos/carta-do-dia             | Pergunta e contexto opcional                                                   | Tirar minha carta do dia           | Site                          |
| Tarot Sim ou Não / tarot-yes-no              | /produtos/sim-nao-responsavel      | Pergunta; condições e possibilidades da carta, sem resposta binária automática | Fazer minha pergunta ao Tarot      | Site                          |
| Três Perguntas / three-questions             | /produtos/tres-perguntas           | Três perguntas e síntese                                                       | Fazer três perguntas               | Site                          |
| Jornada de Tarot / tarot-journey             | /produtos/jornada-tarot            | Objetivo e sequência de leituras                                               | Começar minha jornada de Tarot     | Site                          |
| Foco Agora / tarot-focus                     | /produtos/foco-agora               | Uma pergunta sobre o assunto escolhido                                         | Consultar o Tarot                  | Site                          |
| Mapa de Carreira / purpose-career            | /produtos/mapa-proposito-carreira  | Nascimento e contexto profissional                                             | Conhecer meu mapa de carreira      | Site, PDF, áudio previsto     |
| Meio do Céu / midheaven                      | /produtos/meio-do-ceu              | Nascimento; carreira e reconhecimento                                          | Descobrir meu Meio do Céu          | Site                          |
| Bússola de Carreira / career-compass         | /produtos/bussola-de-carreira      | Cálculo gratuito em /bussola-de-carreira; leitura em preparação                | Calcular meu Meio do Céu           | Site                          |
| Jornada de Carreira / direction-journey      | /produtos/jornada-direcao          | Objetivo profissional, início e 30 dias                                        | Definir meu objetivo de carreira   | Site                          |
| Interpretação de Sonhos / dream-reading      | /produtos/leitura-essencial-sonhos | Relato, emoções e associações                                                  | Interpretar meu sonho              | Site                          |
| Registro de sonho / dream-journal            | /produtos/registro-de-sonho        | Data, relato e emoções                                                         | Registrar meu sonho                | Site                          |
| Leitura Aprofundada do Sonho / dream-dossier | /produtos/dossie-do-sonho          | Relato, associações e temas escolhidos                                         | Conhecer a leitura do sonho        | Site, PDF                     |
| Diário de Sonhos 30 Dias / dream-atlas       | /produtos/atlas-dos-sonhos         | Início e relatos durante 30 dias                                               | Começar meu diário de sonhos       | Site, PDF                     |
| ATV+ / atv-plus                              | /produtos/atv-plus                 | Conta e registros autorizados; planos ainda em definição                       | Conhecer o ATV+                    | Site, acompanhamento previsto |

Os nomes e CTAs operacionais são centralizados em `packages/domain/src/catalog.ts` e `apps/web/src/lib/data/product-copy.ts`. O quadro serve como revisão editorial; essas fontes têm autoridade sobre rótulos exatos. SVG de produtos fora da geometria implementada e áudio sem provedor continuam previstos, não disponíveis.

## Estados da experiência

| Estado            | Critério de revisão / verificação                                                  |
| ----------------- | ---------------------------------------------------------------------------------- |
| Visitante         | Entende o produto antes do login; retorno seguro conserva a seleção.               |
| Conta conectada   | Dados e Biblioteca são recuperados por autorização existente.                      |
| Biblioteca vazia  | A tela explica a ausência e dá uma entrada para mapa astral.                       |
| Dados parciais    | Identifica o dado ausente; hora aproximada conserva seu limite real.               |
| Em processamento  | Nomeia a etapa real e não confunde cálculo com interpretação pronta.               |
| Leitura pronta    | Título reconhecível, abrir leitura, formatos elegíveis e salvamento/reabertura.    |
| Erro              | Falha independente por seção, tentativa concreta e nenhuma falsa Biblioteca vazia. |
| Excluído/revogado | Acesso bloqueado conforme contrato; cópias externas permanecem explicitadas.       |

## Superfícies da auditoria

Páginas públicas, seis universos, ofertas, cabeçalho, rodapé, Artigos/Notícias, Loja, login, cadastro de nascimento, dashboard, Biblioteca, formulários por produto, leitores, calendário, gráficos do mapa, continuidade, downloads, áudio, e-mail e cookies. Textos legais mantêm consentimentos e limites necessários; palavras comuns como “previsões” não são bloqueadas.

Web 1.2, PDF 1.3, SVG 1.1, imagem 1.1 e narração 1.1 identificam novos modelos. As versões históricas continuam recuperáveis. A migração `20261005150000_language_renderer_versions.sql` expande somente a lista de exportadores aceitos e tem forward-fix testado. Não foi aplicada ao Supabase hospedado durante esta auditoria.

O guia de escrita, as constituições, a rubrica e o diretor editorial incorporam a revisão de estilo. A reescrita das interpretações finais de cada usuário depende das bases e aprovações reais; fixtures de QA não são produtos homologados.

O registro de alterações está em `language-changes.json`; as evidências e limitações finais estão em `../qa/LANGUAGE_AUDIT_2026-10-05.md`.
