# WU-027 — contrato e referência independente de aspectos

RUN_ID: `ATV-20260902-170644Z-01A0630F`. Data: 08/09/2026. Algoritmo: `atv-major-aspects/1`. Escopo: função determinística e QA, sem integração pública nem homologação integral do motor.

O contrato está em `docs/contracts/astrology-aspects.md`. Não havia política editorial de orbes definida nos contratos existentes; o módulo exige uma política versionada fornecida pelo chamador. A fixture `qa-major/1` usa conjunção 8°, sextil 4°, quadratura 6°, trígono 6° e oposição 8° apenas para avaliar o algoritmo. Alterar esses valores para eliminar casos difíceis invalidaria a comparação.

## Origem e método

As posições de referência são as dez séries NASA/JPL Horizons já preservadas pela WU-025, com manifesto, parâmetros, instantes e SHA-256. Não foram feitas novas chamadas ao provedor. Fontes: [Horizons API](https://ssd-api.jpl.nasa.gov/doc/horizons.html) e [manual](https://ssd.jpl.nasa.gov/horizons/manual.html). O JPL fornece posições, não políticas ou interpretações astrológicas.

O gerador Python usa exclusivamente biblioteca padrão. Para cada par, projeta cada longitude como vetor unitário `(cos λ, sin λ)` e calcula o arco por produto escalar e `acos`. Esse caminho é independente da candidata TypeScript, que utiliza diferença absoluta e complemento de 360°. O gerador testa âncoras analíticas antes de construir a referência. Não importa Caelus nem código TypeScript.

O corpus contém 7 épocas entre 1900 e 2099, 10 corpos e todos os 45 pares de cada época: 315 classificações, incluindo ausências. O avaliador também passa as posições da candidata Caelus pela função, conservando o orçamento de erro planetário da WU-025. Manifesto fixa hashes de gerador, fixture, manifesto Horizons e dez arquivos fonte; Git preserva LF nos arquivos cujo hash é conferido.

## Resultados

| Verificação | Resultado | Limite registrado |
| --- | --- | --- |
| Mesmas posições JPL, algoritmo vs oráculo independente | 315 classificações PASS, 75 aspectos encontrados | 0,0000001° nos aspectos encontrados |
| Maior erro geométrico nos aspectos encontrados | 5,400124791776761e-13° | Sem mudança de tolerância |
| Posições Caelus + algoritmo vs referência JPL | 314 classificações verificadas; 1 inconclusiva | 2 × 60 arcsec = 0,033333…° |
| Maior erro dos aspectos encontrados na candidata | 0,0031937065581217894° | Abaixo do orçamento fixado |
| Lua–Plutão, 2026-09-08T12:00:00Z | Inconclusivo quanto à candidata, ambas observações sem aspecto | Margem até o limite 0,0116858°, menor que o orçamento |

O caso inconclusivo permanece no relatório com `candidatePass: null`. A comparação geométrica usando exatamente as posições JPL passa também nesse par. Nenhuma cota de erro foi relaxada e a política não foi modificada. O máximo de erro reportado se refere aos aspectos encontrados; as demais linhas verificam a classificação de ausência, sem alegar medida de separação emitida pelo módulo.

Os testes sintéticos verificam os cinco ângulos exatos, orbe inclusivo e imediatamente fora dele, cruzamento de 0°/360°, pares únicos/ordem canônica, cópia da política, ausência de mutação, conjuntos sem pares, posições inválidas e políticas duplicadas/sobrepostas/ausentes. Aplicação/separação não é inferida.

## Reprodução e gates

Executar a partir de `app`:

```text
python scripts/generate-aspect-reference.py
node scripts/evaluate-aspect-reference.mjs
pnpm check
pnpm lint
pnpm test:unit
pnpm build
pnpm test:e2e
```

O corpus versionado permite CI sem Python, rede ou regeneração; `node --test` executa sua conferência. Resultados extensos ficam em `test-results/astrology-aspects.json` e `test-results/wu027-*.log` (ignorados por Git).

Validação local em 09/09: check/lint, 58 testes unitários (23 de astrologia) e build PASS. Contratos adicionais, referência ampliada, E2E e conclusão: [fechamento da etapa](ASTROLOGY_ENGINE_CONTRACTS_2026-09-09.md). CI/Pages são confirmados pelo SHA publicado no log canônico externo.

O gauntlet integral continua pendente, incluindo esta incerteza de fronteira, cobertura entre amostras, instante de estações, escala UT1/DUT1 e política editorial. A ampliação de densidade temporal e os contratos de incerteza estão documentados no fechamento; não eliminam essas limitações. Não há nova rota, dado persistido, flag habilitada ou chamada de IA. Rollback: reverter o commit da WU-027; sem migração de dados. A extração da lista de corpos mantém os mesmos dez valores e a exportação existente, agora imutável, sem mudança de efemérides.
