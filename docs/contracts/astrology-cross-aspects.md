# Geometria entre mapas — contrato experimental v1

`calculateCrossAspects(first, second, policy)` calcula o produto cartesiano dos corpos de dois mapas. `first` sempre identifica Pessoa A e `second` Pessoa B; não são gênero, papel afetivo ou hierarquia. Sol A/Sol B é um par válido, e Sol A/Lua B não substitui Lua A/Sol B. Até dez corpos por lado produzem até cem pares, ordenados pela lista canônica `bodies` em cada lado. Um lado vazio produz zero pares, mas não dispensa validar o outro lado e a política.

Este é um contrato separado de `calculateAspects`, que continua avaliando apenas pares únicos dentro de um mapa. Nenhum resultado natal histórico foi reinterpretado como sinastria. Validadores de posições/política são compartilhados; a geometria cruzada não concatena mapas nem remove corpos iguais de pessoas diferentes.

## Entradas, política e saída

Cada conjunto deve ter no máximo uma longitude finita em `[0,360)` por corpo suportado. Dados inválidos/duplicados não são normalizados. O chamador deve estabelecer compatibilidade do zodíaco/referencial e conservar a proveniência independente dos dois mapas; esta função aceita longitudes, não certifica origem, época, precisão ou consentimento.

A política explícita/versionada segue [aspectos natais](astrology-aspects.md): conjunction 0°, sextile 60°, square 90°, trine 120° e opposition 180°, orbes finitos `[0,180]` e intervalos não sobrepostos. Não existe default editorial. Separação nominal é `min(abs(A−B),360−abs(A−B))`; desvio absoluto menor ou igual ao orbe inclui a fronteira, sem epsilon nominal.

`atv-cross-major-aspects/1` conserva as posições canônicas dos dois lados e a política como cópias destacadas. Registra `roles: [person-a, person-b]`, coordenada eclíptica, quantidade de pares, ângulo exato, separação e desvio. `inputPrecision: not-certified` e `motion: not-evaluated` são obrigatórios. Não há score de compatibilidade, inferência emocional, interpretação, compartilhamento ou promoção.

## Incerteza independente

`assessCrossAspectStability(first, second, policy, { first, second })` exige dois orçamentos explícitos: nulo ou finito em `[0,180]`. São hipóteses do chamador, não garantias medidas do provedor. Um orçamento desconhecido torna o par `unknown-accuracy`, inclusive quando não há aspecto nominal.

Para separação `s`, o intervalo conservador é `[max(0,s−eA−eB−g),min(180,s+eA+eB+g)]`, com `g=1e-12°` somente na análise de estabilidade. Intervalo contido em um aspecto ou disjunto de todos é `stable-under-budget`; caso contrário, `boundary-sensitive`. O resultado `atv-cross-aspect-stability/1` inclui todos os pares e copia ambos os orçamentos. Mesmo orçamento zero não transforma fronteira exata em certeza.

## Integração futura

A WU-080 não registra calculador de Sinastria/Dossiê, não cria fatos editoriais nem habilita produto. Exige política editorial aprovada, envelope factual que preserve a evidência sem truncar cem pares, proveniência/precisão verificadas, consentimentos e revisão de interpretações em dinâmicas de relação. A política `qa-*` dos testes não autoriza uso produtivo. Não há mudança nos doze calculadores parciais, treze indisponíveis ou nos gates.
