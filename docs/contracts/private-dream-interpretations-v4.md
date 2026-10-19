# Interpretações privadas de sonhos — edição 4

Data: 2026-10-15. Produtos: `dream-reading` (Interpretação do Sonho) e `dream-dossier` (Interpretação Aprofundada do Sonho). Esta extensão atende à reformulação autorizada nesta conversa; a exclusão de Sonhos da reconstrução de 08/10 não limita este novo escopo. O Diário de Sonhos — 30 Dias mantém seu contrato e compositor próprios.

## Entrada e cálculo

O relato, as emoções, as associações e o contexto são declarações do usuário, nunca fatos externos inferidos. A entrada usa o schema vigente de sonhos. A interpretação individual considera um relato. A aprofundada exige consentimento e de um a três registros anteriores escolhidos, cada um com ID, revisão, data, relato integral, emoções e associações.

O servidor carrega somente registros do proprietário autorizado. O cálculo `atv-private-dream-dossier/2.0.0` valida IDs únicos, revisões positivas, datas anteriores ou iguais ao sonho atual e ordem estável. Guarda os registros completos, as revisões e sua origem no snapshot. O limite de três vale para novas gerações; versões históricas não são reescritas.

O compositor reconstrói o snapshot esperado e rejeita desacordos entre entrada, dados, fatos, revisões e proveniência. Essa verificação não autentica a propriedade isoladamente: a origem confiável é o carregamento privado no servidor, protegido pela autorização e pelo banco. Não aceitar snapshots arbitrários vindos do cliente como fontes autorizadas.

## Método editorial finito

Leitura: `atv-private-dream-interpretation/4.0.0`. Corpus local original: `atv-personal-dream-associations/2026-10-15`. Não há chamada a modelo externo nem dicionário universal de símbolos no runtime.

A leitura separa relato, palavras pessoais, hipótese pelas associações, hipótese pelas emoções e contexto, síntese, perguntas e prática. Cada hipótese explicita observação que a apoiaria, condição que a enfraqueceria e alternativa. O contexto permanece atribuído ao usuário; não é deduzido da narrativa. Instruções dentro do relato são citadas como parte dele e não executadas.

Cinco grupos de rótulos emocionais exatos oferecem perguntas distintas: exploração, cautela, atrito, ausência e pausa/acolhimento. A seleção considera somente rótulos declarados, após normalização Unicode, espaços e caixa. Frases como “não senti medo” não são classificadas por substring. Rótulos desconhecidos permanecem abertos. Exploração e cautela juntas geram uma hipótese condicional de aproximação e pausa; não afirmam conflito só por haver duas palavras. Outras combinações pedem comparação dos momentos, sem inventar uma transição.

Na aprofundada, emoções e associações são comparadas em categorias separadas. Coincidência literal, palavras exclusivas e campo ausente produzem passagens diferentes. Ausência de informação não equivale a ausência da experiência. Relatos idênticos são sinalizados como possível anotação duplicada, sem contá-los como evidência de repetição do sonho. A síntese distingue associações compartilhadas, somente emoções compartilhadas e ausência de coincidências; explicita seleção limitada e hipótese alternativa.

O método não realiza interpretação clínica, classificação livre de emoções, inferência de intenção de terceiros nem previsão. Não se apresenta como compreensão irrestrita de qualquer narrativa. A utilidade esperada é organizar as associações pessoais e orientar uma comparação reversível, que o usuário pode confirmar ou recusar.

## Avaliação e histórico

`reviewDreamInterpretation` verifica funções narrativas, preservação do relato e dos campos, dependência dos ramos selecionados, lacunas, comparação por registro, síntese correspondente à amostra, cobertura dos fatos, três perguntas distintas e prática com observação contrária. A igualdade com a composição e o digest são verificações adicionais de integridade; não substituem esses critérios nem os contrafactuais e ablações dos testes.

O gate normal permanece obrigatório antes de salvar. Conteúdo, fatos, contexto, revisões, capítulos ou prática adulterados produzem recusa. As versões anteriores conservam seus compositores, conteúdo e aprovação. Os nomes canônicos de novas gerações usam a revisão de apresentação já existente; abrir uma leitura antiga não muda seu título ou payload.

Leitor web, TXT e PDF partem da mesma leitura aprovada. O PDF da aprofundada inclui índice real, capítulos e referências. O custo automático permanece zero. Aprovação automática autoriza somente teste privado; não constitui liberação comercial, validação hospedada ou aceite pessoal E5.
