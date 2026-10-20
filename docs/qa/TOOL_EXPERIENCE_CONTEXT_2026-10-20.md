# Experiência das ferramentas e leituras — revisão de 20/10/2026

RUN_ID: `ATV-20260902-170644Z-01A0630F`.

Estado: implementação, validação local e conferência visual final concluídas; publicação em fechamento. Este documento não comprova publicação nem aceite pessoal do proprietário.

## Problema confirmado

Os prints expõem três falhas relacionadas: leitura comprimida por contêineres sobrepostos no celular; desenhos tratados como anexos, sem continuidade com a interface; e interpretação que adapta conceitos ao nome do tema sem desenvolver suficientemente a experiência específica desse tema.

O caminho público é `/api/free-tools/[tool]` → runtime público → `calculateFreeToolResult` → composição interpretativa. Em produção, a execução ocorre na função `atv-free-tools-runtime`; mudar apenas a aplicação web não atualiza esse texto. As leituras privadas passam pelo cálculo do produto, `composeTrialReading` e compositores da edição atual, servidos por `atv-trial-runtime`.

No Tarot gratuito, o corpo reaproveitava princípios gerais da carta, acrescentava um tema abstrato e terminava com uma fórmula de cautela. Assim, o Dez de Ouros permanecia ligado à transmissão patrimonial mesmo numa leitura do dia; o Oito de Paus conservava linguagem de lançamento numa leitura amorosa. O problema está na composição e na especificidade do conteúdo selecionado, não no sorteio. As cartas eram identificadas como dados, mas a interface não apresentava suas imagens.

Na apresentação astrológica, o SVG completo do entregável incluía sua própria página, títulos e informações técnicas. Inserido dentro dos contêineres da ferramenta, reduzia o espaço do desenho e criava duas hierarquias visuais concorrentes. O cálculo e a geometria do mapa não precisavam ser substituídos para corrigir essa aplicação.

## Alterações implementadas

- Um componente astrológico compartilhado integra mapa, ampliação acessível, posições consultáveis e download. É usado nas ferramentas, resultados salvos, mapa natal e leitores de duas pessoas. Preserva posições, cúspides, eixos e aspectos calculados.
- O resultado móvel usa a largura disponível, tipografia de leitura e menos molduras. Dados e limites ficam em áreas consultáveis, sem interromper cada conclusão.
- As 78 imagens históricas Rider–Waite–Smith foram incorporadas com identificação, origem, hash e atribuição. Ferramentas, leitores e diagramas de PDF usam a mesma correspondência entre carta sorteada e imagem.
- Os textos gratuitos de astrologia distinguem expressão, necessidade emocional, modo de aproximação, trabalho e recursos. A relação entre fatores modifica a conclusão, em vez de repetir um retrato solar para todos os assuntos.
- O Tarot recebe aplicações próprias por carta e contexto, desenvolvimento da interpretação e composição dos métodos pagos. A revisão integral dos primeiros PDFs rejeitou pontes repetidas e concatenações artificiais, mesmo com testes automáticos aprovados. As cinco tiragens finais foram relidas integralmente, com seus fatos e posições; os casos Oito de Paus/amor e Dez de Ouros/dia receberam aplicações próprias.
- Os PDFs apresentam as imagens reais das tiragens, legendas legíveis e paginação que considera a altura do conteúdo. A Cruz Celta recebeu espaçamento específico para evitar a proximidade entre número e legenda.
- Natal, carreira, relacionamentos, ciclos e sonhos receberam revisão de conclusões, pontes entre fatores, contexto informado e repetições. Os apêndices de Sinastria e Dossiê do Casal apresentam os fatos usados na leitura; o registro bruto completo permanece intacto no TXT. A precisão desconhecida permanece declarada uma vez no método.

## Evidências locais disponíveis

- `artifacts/current-final-20261020/`: os 19 produtos atuais foram novamente calculados, aprovados para teste e exportados em JSON, TXT e PDF. A execução final de catálogo e apresentação passou em 3 arquivos / 27 testes.
- `TOOL_EXPERIENCE_VISUAL_19_2026-10-20.md`: inspeção dos 19 PDFs finais, 178 páginas e 38 contatos; nenhum caractere fora da margem segura de 15 pt e nenhum corte ou colisão bloqueador. As observações sobre microlegendas e espaço em páginas finais estão registradas no parecer.
- `artifacts/current-final-20261020/EDITORIAL-QA-14.md`: leitura integral da amostra dos 14 produtos não Tarot e revisão de todos os deltas finais, com manifesto de hashes. Nenhuma falha material nova foi encontrada. Os cinco Tarot tiveram TXT integrais, JSON, contatos de todas as páginas e página 2 em resolução nativa conferidos; 38 cartas visíveis corresponderam aos nomes e posições.
- `test-results/tool-experience-unit-final.log`: suíte geral aprovada, incluindo 2.507 testes web, 430 testes worker e 114 testes Node; 14 testes web e 2 arquivos permanecem ignorados conforme a configuração existente.
- `test-results/tool-experience-db-final.log`: 159 verificações de banco aprovadas. `tool-experience-check-release.log`, `tool-experience-build-release.log` e os dois logs `tool-experience-edge-*-release.log`: análise Svelte sem erros/avisos, build web e bundles dos dois serviços aprovados.
- `test-results/tool-experience-format-final.log`, `tool-experience-eslint-final.log` e `tool-experience-pdf-format-release.log`: formatação e lint aprovados; o check local respeita as terminações de linha do Windows. Foram executados 12 E2E focais e uma verificação adicional de download.

- `artifacts/tool-visual-20261020/`: revisão móvel dos resultados astrológico e de Tarot; leitores em 320, 390 e 1440 px; ampliação, foco, Escape e ausência de transbordamento.
- `artifacts/tool-pdf-20261020/QA_VISUAL.md`: revisão intermediária dos cinco PDFs de Tarot, substituída para liberação pelo lote final dos 19 produtos acima.
- `test-results/pdf-client-artwork-final.log`: 15 testes de imagens, diagramas e carregamento do PDF aprovados antes do último ajuste focal de paginação.
- `test-results/free-context-interpretation.log`: revisão focal das leituras astrológicas públicas e diferenças entre fatores.
- `apps/web/static/tarot/rws/sources.json`: proveniência individual das 78 imagens históricas.

## Condições de liberação

Ler os resultados integrais, incluindo os casos dos prints, e corrigir conclusões artificiais; verificar os 19 produtos atuais e oito calculadoras públicas, além do horóscopo em sua publicação própria; gerar novamente os entregáveis alterados; concluir verificações locais e os gates de CI vigentes; publicar aplicação e os dois runtimes; conferir o caminho hospedado. Produtos revogados ficam fora do escopo. A limpeza recuperável de Minha Área já foi realizada e não deve ser repetida.

Integridade, quantidade de testes e igualdade com o compositor não substituem qualidade editorial. A aprovação automática para teste continua separada do aceite pessoal E5 do proprietário.

## Limites da avaliação

A revisão integral cobre entradas sintéticas e casos focais, não todas as combinações possíveis de mapas, relatos ou tiragens. Os compositores permanecem finitos e determinísticos. Dois fechos intermediários da Cruz Celta ainda são amplos; a síntese final da amostra desenvolve concretamente pausa, mensagens, tarefas e hora de retorno. Nenhum limite conhecido de cálculo ou precisão foi convertido em certeza. A avaliação pessoal do proprietário deve acontecer sobre novos resultados após a publicação.
