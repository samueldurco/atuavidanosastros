# Horóscopo datado — política automatizada complementar

Versão: `atvna-horoscope-policy-2026-10-20-v1`. Decisão: ADR 0010. Esta política complementa o contrato factual `public-horoscope-reconstruction.md`; não homologa a precisão experimental do motor.

## Método editorial

`atv-solar-symbolic-sectors/1.0.0`: tomar o signo solar escolhido como primeiro de doze setores simbólicos de signo inteiro. Para cada corpo observado, `setor = 1 + ((índiceDoSignoDoCorpo − índiceDoSignoEscolhido + 12) % 12)`. Os índices começam em Áries, zero. Os setores organizam a leitura geral: (1) iniciativa e apresentação, (2) recursos e prioridades, (3) comunicação e aprendizagem cotidiana, (4) intimidade e base, (5) criação e prazer, (6) rotina e cuidado, (7) parcerias, (8) partilha e vulnerabilidade, (9) horizontes e convicções, (10) responsabilidade pública e direção, (11) grupos e projetos, (12) recolhimento e encerramento.

Esse é um método simbólico editorial declarado, não um cálculo de casas natais. Não se conhece o Ascendente, o horário, o nascimento nem a biografia do leitor. O cálculo do céu é o mesmo para os doze signos. Setores diferentes precisam produzir relações e exemplos diferentes, e não doze textos com nomes substituídos.

Uma conclusão relaciona ao menos dois fatores observados; descreve um contraste compreensível e sua consequência interpretativa, sem afirmar acontecimentos pessoais. A narrativa integra facilidade e dificuldade, oferece um significado antes de convidar à reflexão e não faz promessas. Casas/ângulos natais, saúde, diagnóstico, investimento, eventos garantidos e horários exatos ficam fora do escopo.

## Rastreabilidade

Cada documento carrega o digest do snapshot completo. O mapa de afirmações contém `documentId`, `methodVersion`, `claims[]`: cada item aponta seção, parágrafo, `factorIds`, interpretação exata e `sampledFactors`. `positionObservations` registra as posições/setores em toda a grade; `observedAtByFactor` distingue as amostras nas quais o aspecto ficou dentro do orbe ou a transição foi registrada. Uma posição amostrada não é evidência de aspecto ativo. A síntese referencia todos os fatores usados. Não basta repetir o ID: a revisão do corpus deve conferir se a relação segue o método e se considera o contraste dos fatores.

As coberturas seguem o contrato: dia civil UTC; semana civil de segunda a segunda; mês civil. O rótulo público explica UTC. Amostras a cada seis horas não comprovam duração nem instantes exatos. Primeiro/último registro e menor orbe são observações; não se transformam em “o aspecto acontece às ...”. Trânsitos lentos são pano de fundo, não novidade diária.

O documento informa em linguagem acessível: leitura simbólica geral por signo, método de setores solares, conteúdo e revisão automatizados, sem revisão humana, e precisão experimental da base calculada. Esses limites acompanham a leitura, sem substituir sua interpretação.

## Revisão e assinatura

O modo é `reviewed-corpus-and-runtime-verification`. A revisão editorial independente é uma execução por agente diferente do autor do corpus/algoritmo, ambos identificados no relatório; a organização publicadora é ATVNA. O parecer avalia o corpus inteiro, o método, a composição, os 36 exemplos reais de dia/semana/mês e contrastes que demonstrem alteração de significado quando os dados mudam. Nenhuma pessoa ou credencial humana é inventada. Critérios: oito bloqueadores da política editorial; nota mínima 85/100 e ao menos metade de cada dimensão; adicionais obrigatórios de fatos, método, diferenciação dos signos, limites temporais e independência. UNKNOWN impede admissão.

O parecer é vinculado a `corpusVersion`, `corpusDigest`, `algorithmVersion`, `algorithmDigest` e `reviewMode`. O corpus contém as 45 relações entre os dez corpos, cinco aspectos, doze setores, seis eixos, oito corpos com movimentos retrógrado/direto e 28 consequências relacionais para os pares desses oito corpos. A composição usa de dois a três fatores realmente selecionados, favorece conexões entre corpos e limita fatores lentos a um pano de fundo. Uma combinação ausente ou cobertura insuficiente causa rejeição, sem inventar conteúdo de contingência. Mudança em qualquer material assinado exige nova revisão.

Em cada nova cobertura, a verificação automática recalcula o snapshot com o adaptador real, confere digests e amostras, reproduz integralmente texto e mapa de afirmações pelo algoritmo aprovado e verifica os doze signos, limites, fontes e divulgação. O relatório por documento registra `facts`, `claims`, `composition`, `coverage`, `disclosure` e `differentiation`, todos PASS. Esse processo não é uma nova leitura editorial individual, e a divulgação pública diz isso explicitamente. A qualidade dessa composição depende do corpus e do algoritmo revisados; a assinatura não transforma o simbolismo em causalidade científica.

O pedido de assinatura contém o lote finito, política, método, período, cobertura, os doze IDs e seus digests, fatos, relatório automático, parecer independente congelado e manifesto. A autoridade existente é vinculada à política complementar por concessão assinada com `ownerDecisionDigest`, `corpusReviewDigest`, composição exata, três períodos permitidos, `coverageFrom`, `validFrom` e `validUntil` finitos dentro da validade da chave. Não substituir o registro evergreen. A assinatura externa autentica esses bytes e a concessão; testes só usam chaves efêmeras claramente identificadas e nunca admitidas em produção.

## Continuidade

Cada pacote recebe exatamente um período e uma cobertura. `--schedule bootstrap <data-UTC> <diretório-novo>` prepara os três períodos correntes. `--schedule next <data-UTC> <diretório-novo>`, previsto às 20:15 UTC com segunda tentativa às 22:15 UTC, prepara o dia seguinte e também a semana/mês quando começam nesse dia. Um mutex compartilhado entre agendamento e bootstrap impede publicação concorrente. `index.json` enumera os pacotes finitos e seus digests. Cada cobertura recalcula fatos, recompõe narrativas e executa verificações próprias. Reutiliza apenas a versão de corpus/algoritmo efetivamente revisada; não recicla um parecer individual como se houvesse nova leitura.

Uma repetição da mesma cobertura preserva os bytes, datas e atestações dos documentos já admitidos. A equivalência dos fatos desconsidera somente `provenance.calculatedAt`, que deve continuar sendo um instante válido de execução; posições, amostras, intervalos e restante da proveniência precisam permanecer idênticos. Divergência editorial ou factual impede substituir silenciosamente a edição. O publicador usa `effectiveDocuments` devolvidos pela admissão para verificar a edição efetivamente servida.

O fluxo complementar assina pela custódia existente, prepara um branch de conteúdo, solicita CI para o commit exato e integra apenas depois dos gates. Escrita de conteúdo/PR e disparo de CI devem ser concedidos somente aos jobs necessários; nenhuma permissão global, nova chave/segredo ou bypass está autorizado. O workflow concreto precisa ser revisado antes de ativado. A renovação da concessão é explícita; uma concessão expirada bloqueia novas admissões.

O índice mantém publicação atual e histórico separados. A ausência de material atual é explícita. Guias educativos admitidos apoiam a experiência com rótulo próprio, sem se apresentarem como previsão. Um script de preparação não é uma operação recorrente concluída: assinatura real, gates, admissão, CI, integração e disponibilidade hospedada ainda precisam ser demonstrados. Falhas deixam o período indisponível em vez de republicar texto vencido.
