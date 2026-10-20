# Correção interpretativa do catálogo atual — 19/10/2026

RUN_ID: ATV-20260902-170644Z-01A0630F

Autorização: corrigir os produtos atualmente publicados e as ferramentas gratuitas, publicar após validação e retirar as entregas de teste do proprietário em Minha Área. Preços, Hotmart e produtos revogados estão fora desta etapa.

## Escopo canônico

A referência é architecture-offers-20261015.md e o catálogo de 19 ofertas. Nomes comerciais novos não criam produtos técnicos novos.

1. Natal e relações: birth-chart, three-pillars, life-atlas, purpose-career, synastry, couple-dossier.
2. Tempo: week-reading, personal-calendar, date-reading, solar-return, career-forecast-30d.
3. Tarot: tarot-situation-challenge-advice, tarot-peladan-cross, tarot-celtic-cross, tarot-aphrodite-temple, tarot-astrological-mandala.
4. Sonhos: dream-reading, dream-dossier, dream-atlas.
5. Oito calculadores públicos: ascendente, mapa-astral, meio-do-ceu, dinheiro-no-mapa, carta-do-dia, carta-do-amor, combinacao-do-casal, registro-de-sonho.
6. Nona ferramenta gratuita: Horóscopo de Hoje, com rota e publicação editorial próprias. Disponibilidade de leitura atual e aprovação editorial devem ser verificadas separadamente.

`tarot-sim-ou-nao` é um alias revogado com redirecionamento 308, não uma oferta atual. O escopo é de 19 produtos pagos e nove ferramentas gratuitas, das quais oito são calculadores públicos.

## Plano e critérios de conclusão

- [x] Rastrear e preservar a integridade factual e a verificação de versões históricas.
- [x] Implementar a nova edição dos 19 produtos: conclusões relacionais, pergunta central de cada oferta, contexto apenas quando informado, sem delegar a síntese ao leitor. A aprovação das amostras finais permanece no item de revisão.
- [x] Implementar as correções dos oito calculadores públicos: a introdução deve ter valor próprio; registro de sonho continua registro fiel, sem inventar uma interpretação não oferecida.
- [ ] Concluir a revisão específica do Horóscopo de Hoje e comprovar a disponibilidade de leitura atual sob o seu gate editorial.
- [x] Integrar geração, revisão, web e PDF; não permitir fallback silencioso para a edição antiga nos produtos atuais.
- [x] Testar mudanças de fatores e ablações com expectativas semânticas específicas, dados ausentes, adulteração, versões históricas e todas as ofertas. Reexecutar os testes afetados pelas últimas revisões antes da publicação.
- [x] Revisar amostras completas e apresentação em tela/PDF dos 19 produtos. Igualdade, digest, tamanho e IDs são provas de integridade, não prova suficiente de qualidade. A revisão específica do Horóscopo permanece no item próprio.
- [x] Publicar runtimes e frontend pelos caminhos autorizados; verificar versão e resultados hospedados por API.
- [x] Limpar somente entregas de teste do proprietário identificado pelo relatório fornecido; preservar contas alheias, perfil, permissões e insumos pessoais que não sejam entregas.
- [ ] Registrar evidências, limites e roteiro de teste para a avaliação do proprietário. Aprovação automática privada não substitui sua avaliação do valor do produto.

## Diagnóstico que orienta a mudança

O relatório enviado foi produzido por composição determinística, sem uma etapa posterior que integrasse fatores selecionados. A quadratura Mercúrio–Júpiter existia, mas não modificava o capítulo de aprendizagem. Definições repetidas, contexto ausente tratado como declarado e sínteses encerradas como exercícios eram problemas da composição. Os gates antigos privilegiavam igualdade com essa composição, cobertura e formatos obrigatórios. Esta edição separa a preservação factual da avaliação editorial, mantém o corpus como referência e exige relações interpretadas nas próprias conclusões.

## Estado

Em 20/10/2026, as implementações locais abrangem os 19 produtos e os oito calculadores. Foram revisadas as seis amostras completas de Natal/Relações (77 páginas), as oito de Tarot/Sonhos (58 páginas) e as cinco temporais (70 páginas), com cinco exportações aprovadas. A suíte temporal focal passou inicialmente em 51 casos e depois em 52 com o ramo de Leitura de uma Data sem contatos: interpretação limitada à ausência calculada e rejeição de previsão inventada. Uma alteração posterior, restrita à frase do índice compartilhado, foi conferida na página 4 de uma nova exportação de Carreira; os quatro outros PDFs temporais mantêm seus bytes anteriores a essa frase. A verificação global disponível passou em tipos e lint, e a matriz visual local final registrada passou em 46 casos. Esses resultados não são comprovação de publicação nem de disponibilidade do Horóscopo de Hoje; os deltas finais exigem seus checks correspondentes.

A ordem de publicação acordada é frontend novo primeiro e runtimes Edge imediatamente depois, com verificação hospedada somente após ambos. A compatibilidade offline foi comprovada nos 19 produtos: handler exato do Edge base `b1d3f1c`, adaptador web atual, aprovação e exportação atual do PDF. O calendário antigo acessa uma estrutura ausente na leitura nova, tornando inadequada a ordem inversa. Os scripts de limpeza e restauração estão preparados fora do Git, com nove verificações transacionais locais aprovadas; ainda não foram executados no banco hospedado.

Atualização da publicação em 20/10/2026: PR39 integrada após CI `39402697936` aprovado; Pages produção `e34b97ac-5306-4b12-87a5-ec2c09338141` serve o merge `086bdf7`. Os dois runtimes Edge foram publicados em seguida. O probe hospedado confirmou 19 gerações iguais às amostras revisadas, 19 verificações e 38 adulterações rejeitadas; os oito calculadores passaram no runtime e pelo site, com validação dos recibos. A chave temporária de teste foi removida e a principal preservada.

Minha Área foi preparada por arquivamento recuperável: 21 leituras de teste e dois itens de biblioteca exclusivamente do proprietário identificado pelo relatório fornecido. Consulta após o commit confirmou zero entregas ativas desse lote; perfil, permissões, compras, fontes pessoais e outras contas foram preservados. Os scripts fora do Git permitem recuperar apenas esse lote, sem alterar novos testes.

A publicação datada recorrente do Horóscopo de Hoje continua em revisão própria. A avaliação do valor pelo proprietário também permanece pendente; nenhuma aceitação foi presumida. O roteiro de teste está em `C:/ATVNA/evidence/ATV-20260902-170644Z-01A0630F/current-interpretation-20261019/roteiro-de-avaliacao.md`.

Evidências e limitações estão em `C:/ATVNA/evidence/ATV-20260902-170644Z-01A0630F/current-interpretation-20261019/readiness-review.md`. O probe preparado distingue 19 produtos, oito calculadores públicos e o Horóscopo de Hoje; o modo padrão é offline e não acessa a rede.
