# Revisão interpretativa dos 14 produtos atuais não Tarot — 20/10/2026

Avaliação local com entradas sintéticas. Não registra publicação, aceite comercial nem aceite pessoal do proprietário. A leitura integral e a revisão de significado são distintas dos testes de integridade.

## Escopo efetivamente lido

Foram lidos integralmente os TXT de `three-pillars`, `birth-chart`, `life-atlas`, `purpose-career`, `synastry`, `couple-dossier`, `date-reading`, `week-reading`, `solar-return`, `personal-calendar`, `career-forecast-30d`, `dream-reading`, `dream-dossier` e `dream-atlas`, inclusive suas referências técnicas. A exportação dos 14 passou em `catalogue.spec.ts` antes do último delta editorial. Os PDFs correspondentes foram renderizados e revisados pelo agente visual: 158 páginas em 32 contatos, além das conferências nativas registradas em `VISUAL-QA-14.md`.

## Problemas concretos corrigidos

| Família | Falha observada | Mudança interpretativa |
| --- | --- | --- |
| Natal e três pilares | A síntese reunia funções sem concluir a relação entre elas. | Sol na casa 10 e Lua na 8 ligam reconhecimento público ao custo íntimo de se expor; Ascendente em Áries e Marte na 11 acrescentam a diferença entre começar por impulso próprio e sustentar a participação de outras pessoas. Os significados dependem dos fatores disponíveis. |
| Atlas da Vida | Prioridades repetiam os mesmos recursos e avisos. | As pontes nomeiam os planetas compartilhados e o que uma escolha numa prioridade precisa preservar na outra; o segundo uso do mesmo planeta não repete o parágrafo inteiro. O aviso de saúde foi retirado do desenvolvimento, preservando o escopo consultável. |
| Carreira e aprendizagem | Fatores descritos separadamente ou em funções excessivamente abstratas. | As pontes ligam casas, funções e aspectos; o ritmo de fundamentar uma ideia modifica o entusiasmo de ampliá-la. As sínteses de carreira relacionam as frentes efetivamente tocadas pelos contatos. |
| Casal e sinastria | Casas e funções eram recitadas; o contexto sobre distância e responsabilidades não alterava suficientemente a conclusão. | Distância modifica a forma de tornar o cuidado reconhecível entre as duas necessidades lunares; frequência de mensagens e disponibilidade contínua deixam de ser equivalentes a presença. Responsabilidades modificam a viabilidade do projeto comum pelo tempo, esforço e tarefas de cada pessoa. O parágrafo duplicado de compromisso foi removido. |
| Sonhos | Ausência de personagens gerava seção sem base; associação de mudança de casa ficava periférica; finais iguais podiam ser descritos como mudança. | A ausência permanece uma lacuna. Entrar e sentar, junto da associação informada, diferencia chegar de se sentir instalado. Dois gestos finais de pausa são tratados como continuidade, ainda que o percurso mude. Nenhuma biografia ou personagem foi inventado. |
| Data, semana, ano e calendário | Pontes de síntese e signos natais genéricos; explicações idênticas sobre duração; reapresentação integral de passagens recorrentes. | O estilo natal usa a função do planeta; contatos conjuntos alteram a leitura do tema. A primeira duração recebe explicação completa e as demais são identificadas sem repeti-la. O calendário distingue entradas, maior aproximação observada e saídas, sem prometer eventos ou horários exatos. |

## Fontes e validação

Fontes de produção revisadas: `natal.ts`, `natal-language.ts`, `natal-relationships.ts`, `symbolic-dreams.ts`, `temporal.ts`, `temporal-canon.ts` e `temporal-career.ts`, em `apps/web/src/lib/trials/current`. O cânone natal local é usado para diferenciar pensamento, necessidade, afeto, ação e direção. Não houve chamada a modelo externo, novo cálculo, novo sorteio ou pesquisa no runtime.

O último delta nas cinco fontes natal/relacional/temporal passou pelos sete arquivos focais de teste: **92 testes aprovados**, execução iniciada às 13:06:31 de 20/10/2026, America/Sao_Paulo. Prettier passou nos cinco arquivos. As regressões de sonhos sobre associação, ausência de personagens, comparação de finais e continuidade foram atualizadas e passaram na etapa anterior. Os testes verificam invariantes e contrafactuais focais, sem substituir a leitura dos produtos.

## Limites da conclusão

- A inspeção integral cobre uma entrada sintética por produto, com contextos específicos e regressões selecionadas. Não comprova qualidade uniforme de todas as combinações de mapas, perguntas ou relatos.
- As regras continuam finitas e determinísticas. O significado do contexto depende das distinções explicitamente suportadas; não equivale a compreensão irrestrita de qualquer relato.
- Séries temporais são amostras calculadas. O texto mantém essa disponibilidade e não transforma as datas observadas em janelas exatas ou acontecimentos garantidos.
- O QA visual anterior encontrou apêndices excessivamente extensos de pares sem aspecto na Sinastria e no Dossiê do Casal. O coordenador consolidou a referência PDF nos fatos usados e reuniu a precisão no método, preservando os fatos brutos salvos; a inspeção visual do lote final pertence ao relatório visual correspondente.
- O último delta editorial foi confirmado nos 14 TXT do lote final de 19 exportações, concluído pelo coordenador em 20/10/2026. Sete TXT são idênticos ao lote lido integralmente; os sete alterados tiveram todas as diferenças revistas. A amostra final passou na avaliação semântica desta etapa, sem nova falha material no delta. Os hashes da versão anterior e da final estão no manifesto, e o aceite pessoal do proprietário permanece separado.

Critérios aplicados: `atv-aprovar-interpretacoes/references/criterios.md`, edição 4. Integridade, qualidade editorial, navegação, autorização de acesso e aceite pessoal do proprietário permanecem avaliações separadas.

## Confirmação do lote final

As diferenças finais estão em career-forecast-30d, couple-dossier, life-atlas, personal-calendar, solar-return, synastry e week-reading. A separação das duas frentes de carreira ficou compreensível; o casal mantém a interpretação das responsabilidades sem repetir o compromisso; a abertura da aproximação desenvolve os ritmos de desejo e iniciativa; o Atlas preserva a conclusão sobre esforço e recomposição; anual e calendário preservam o contraste dos polos sem a ressalva deslocada; a semana identifica a duração dos demais contatos sem repetir a mesma explicação. Nenhum cálculo ou fato foi alterado por essas correções. A exportação final informada pelo coordenador passou por 3 arquivos / 27 testes.

**Resultado editorial da amostra final: aprovado para a validação local desta etapa**, com os limites de cobertura acima. A avaliação visual final dos PDFs, a autorização de acesso e os gates de publicação são registrados separadamente.
