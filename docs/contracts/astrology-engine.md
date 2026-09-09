# Motor determinístico — contrato v1

O contrato executável `engineContract` (`atv-deterministic-contract/1`) acompanha a proveniência do adaptador `atv-caelus-adapter-v3`. Seu domínio é experimental. Validade da entrada, resolução numérica, aceitação de uma amostra e precisão garantida são propriedades diferentes; nenhuma substitui a outra.

## Limites e tempo

São aceitos instantes UTC de `1900-01-01T00:00:00.000Z` até `2099-12-31T23:59:59.999Z`, inclusive. A data civil local pode cruzar esses anos quando o instante UTC permanece válido. O calendário é gregoriano proléptico; datas normalizadas implicitamente, segundos intercalares, horas 24 e frações acima de três casas são rejeitados. Segundos são obrigatórios e frações de um a três dígitos são aceitas. Resolução de entrada de 1 ms não significa precisão astronômica de 1 ms.

UTC exige `Z`. O horário local deve corresponder exatamente ao UTC e ao fuso: `UTC` ou offset explícito `UTC±HH:MM`, limitado a ±14:00; alternativamente, identificador IANA com região. O UTC desambigua horários repetidos, inclusive mudanças de meia hora. Horários inexistentes e divergência de milissegundos falham. IANA usa `runtime-intl/unpinned`, incluindo offsets históricos em segundos quando disponíveis; não há certificação da base histórica. Offset explícito não infere DST. Para reprodução, conservar entrada, instante canônico, offset resolvido e versões do runtime/dados; não recalcular silenciosamente o UTC a partir de uma base IANA diferente.

Latitude finita em `[-90, 90]`, longitude finita em `[-180, 180]` e fonte geográfica textual não vazia de até 80 caracteres são obrigatórias. Tipos coercíveis não são aceitos como números. Entradas inválidas falham antes do cálculo (`TypeError` para forma/inconsistência; `RangeError` para limites numéricos, período ou fuso desconhecido do runtime).

## Saída e proveniência

O provedor retorna dez corpos canônicos, longitudes em `[0, 360)`, latitude em graus, distância em AU e sinal retrógrado da candidata. As coordenadas são geocêntricas aparentes, eclíptica da data, zodíaco tropical. A proveniência inclui provedor/versão, algoritmo, manifesto dos dados com hashes, sistema de casas, entrada copiada, instante UTC canônico, JD aproximado, offset e modo/regras de fuso, ΔT modelado, avisos e horário de cálculo. O manifesto retornado é uma cópia independente: sua mutação não contamina cálculos seguintes. `calculatedAt` é metadado de execução e não participa dos fatos determinísticos.

UTC aproxima UT1. `dut1Seconds: null` declara ausência de correção IERS; ΔT usa o modelo Caelus. Não se deve interpretar o JD como UT1 corrigido ou certificar épocas históricas apenas porque a entrada é válida. A repetibilidade dos fatos exige as mesmas entradas, implementação e dados; IANA não fixada limita repetibilidade de resolução civil entre runtimes.

Placidus aplica o limite conservador do adaptador `abs(latitude) < 66`. Em latitude igual/superior ao limite, falha numérica ou cúspides inválidas, retorna `not-applicable`, `PLACIDUS_UNAVAILABLE` e lista vazia. Não troca sistema de casas. ASC/MC são calculados separadamente; a existência de número finito não homologa ASC polar. Resultados abaixo do limite tampouco certificam todas as coordenadas/épocas. Antimeridianos ±180 representam o mesmo local.

## Precisão e decisão de aspecto

`accuracy: experimental-sampled`, `guaranteedLongitudeErrorDegrees: null`, `retrogradeStationTiming: not-certified` e `productionPromotion: false` permanecem explícitos. Os limites de aceitação dos corpora (60 arcsec em longitude/latitude, erro relativo de distância 0,001; casas conforme relatório próprio) não são cotas globais garantidas. O sinal retrógrado não certifica o instante da estação nem aplicação/separação de aspectos.

O [contrato de aspectos](astrology-aspects.md) exige política versionada sem padrão editorial implícito e separa classificação nominal de estabilidade sob um orçamento de erro assumido. Quando a precisão é desconhecida, a estabilidade também é desconhecida. O chamador deve transportar a proveniência das posições; a função geométrica não certifica origem, instante ou referencial.

## Evidências e conclusão de escopo

Os testes de contrato cobrem extremos temporais e geográficos, anos bissextos, rejeições de formato, offsets extremos/fracionários/históricos, folds/gaps, milissegundos, isolamento da proveniência e fronteiras de orbes até números adjacentes representáveis. A [evidência complementar](../qa/ASTROLOGY_ENGINE_CONTRACTS_2026-09-09.md) discrimina amostras independentes, testes sintéticos e inconclusivos. O fechamento desta etapa conclui a WU-027 e os contratos experimentais; a homologação integral, política editorial e promoção de produto requerem evidências próprias.
