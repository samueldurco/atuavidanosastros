# WU-027 — fechamento dos contratos do motor determinístico

RUN_ID: `ATV-20260902-170644Z-01A0630F`. Data: 09/09/2026. Escopo solicitado: concluir aspectos e cobrir limites, precisão, proveniência e casos extremos; encerrar esta etapa sem avançar para outra frente. Estado de domínio: `EXPERIMENTAL_CONTRACTS_COMPLETE`, sem homologação integral nem promoção de produto.

## Contratos executáveis

O [contrato do motor](../contracts/astrology-engine.md) acompanha a saída em `atv-caelus-adapter-v3`. Os limites agora têm fonte única em `engineContract`; a proveniência registra UTC canônico, JD aproximado, ausência de DUT1 e ausência de cota global de erro. O manifesto é copiado por resultado para impedir contaminação entre chamadas. A entrada já validada mantém seus limites; não há ampliação da janela suportada.

O [contrato de aspectos](../contracts/astrology-aspects.md) exige política explícita e guarda as longitudes utilizadas. A análise de estabilidade separa precisão desconhecida, fronteira sensível e estabilidade condicional ao orçamento informado, inclusive quando nenhum aspecto é encontrado. Ela não usa os máximos observados como garantia universal. O comparador nominal permanece inclusivo sem epsilon; a guarda numérica conservadora da análise de intervalos é declarada separadamente.

| Contrato | Evidência executável |
| --- | --- |
| Limites UTC, calendário e resolução | Extremos inclusivos, 1 ms fora, 1900/2000/2096 bissextos, segundo intercalar rejeitado, formatos e tipos inválidos |
| Fuso e correspondência exata | ±14:00, data civil em ano adjacente, offsets de 30/45 minutos, fold de meia hora Lord Howe, dia ausente Apia, Paris histórico +561 segundos, divergência de milissegundos |
| Coordenadas e casas | ±90°, ±66°, valores imediatamente abaixo, antimeridianos equivalentes, inválidos e recusa sem substituição de Placidus |
| Proveniência e repetibilidade | Manifesto/entrada destacados, mutação de um resultado não afeta o seguinte, fatos repetíveis, contrato imutável, metadados de incerteza serializáveis |
| Aspectos e fronteiras | Cinco ângulos, números representáveis adjacentes aos orbes, 0°/360°, 180°, política ausente/ambígua/esparsa, corpos duplicados, ordem canônica, orçamento desconhecido/zero/extremo |
| Estabilidade condicional | Grade sintética com perturbações positivas/negativas verifica que pares declarados estáveis conservam classificação sob a hipótese; isso é teste de propriedade, não oráculo astronômico |

## Ampliação independente da referência planetária

Foram preservadas 18 respostas adicionais da [API NASA/JPL Horizons](https://ssd-api.jpl.nasa.gov/doc/horizons.html), em consultas somente de leitura, com parâmetros explícitos de observador geocêntrico, coordenadas aparentes sem refração, eclíptica da data, calendário gregoriano e escala UT. Quantidades 20/31; interpretação conforme [manual Horizons](https://ssd.jpl.nasa.gov/horizons/manual.html). O manifesto conserva URL, alvo, parâmetros, instante de aquisição, assinatura retornada e SHA-256 dos bytes. Os testes conferem arquivos esperados, hashes, alvo/centro dos cabeçalhos, parâmetros, contagem, JD e campos numéricos; CI não usa rede.

O corpus temporal tem 812 épocas a cada 90 dias, iniciando em 01/01/1900 às 12h, dentro da janela até 31/12/2099, para dez corpos: 8.120 posições. O passo não inclui todo instante nem necessariamente o último dia da janela; os extremos exatos de entrada são verificados por testes de contrato, não por alegação de referência independente nesse ponto.

O corpus de movimento tem 365 posições diárias por planeta em 2025 para Vênus/Marte e 2026 para os demais seis planetas: 2.920 posições. A direção de referência é estimada pela diferença longitudinal central de dois dias. Valores cuja magnitude não supera 120 arcsec são inconclusivos. Esse orçamento corresponde à soma das duas tolerâncias de longitude predefinidas; não é cota certificada de velocidade instantânea.

| Verificação | Resultado |
| --- | --- |
| Posições independentes adicionais | 11.040 PASS; zero falhas nas tolerâncias predefinidas |
| Máximo longitude | 15,523186863265437 arcsec; aceitação 60 arcsec |
| Máximo latitude | 3,425226976478868 arcsec; aceitação 60 arcsec |
| Máximo erro relativo de distância | 0,00012305280096036597; aceitação 0,001 |
| Comparações de sinal de movimento | 2.904: 2.490 concordantes sob o orçamento; 414 inconclusivas |
| Mudanças de sinal amostradas | 19: Mercúrio 6; Vênus 2; Marte 1; Júpiter/Saturno/Urano/Netuno/Plutão 2 cada |

As 19 mudanças são intervalos amostrados, não instantes certificados de estação. As 414 linhas inconclusivas permanecem no resultado com `pass: null`. A comparação de diferença central com o booleano instantâneo da candidata é evidência amostral de concordância longe de movimento pequeno; não prova a hora da inversão.

A [referência de aspectos](ASTROLOGY_ASPECTS_REFERENCE_2026-09-08.md) preserva seu corpus separado: 315 classificações geométricas PASS; candidata com 314 verificações condicionais e 1 inconclusiva Lua–Plutão. A [referência de casas](ASTROLOGY_HOUSES_REFERENCE_2026-09-08.md) mantém 168 casos, 1.728 comparações e 48 recusas polares. Nenhum desses conjuntos é contabilizado como homologação total.

## Gates e reprodução

`pnpm check`, `pnpm lint`, `pnpm test:unit` (58 testes, sendo 23 de astrologia), `pnpm build` e `pnpm test:e2e` (19 Chromium): PASS. A conferência final de proveniência do corpus também passou por tipagem e avaliador independente. CI/Pages são registrados no log canônico por SHA; os gates locais não substituem essa confirmação remota.

Reproduzir offline: `node scripts/evaluate-aspect-reference.mjs`, `node scripts/evaluate-astrology-coverage.mjs` e os gates pnpm. Aquisição explícita opcional: `node scripts/fetch-horizons-coverage.mjs`; as respostas já preservadas são reutilizadas quando o hash corresponde. O gerador independente de aspectos continua em `scripts/generate-aspect-reference.py`. Não é necessário adquirir ou regenerar dados para CI.

Evidências extensas locais: `test-results/astrology-aspects.json`, `test-results/astrology-coverage.json`, `test-results/wu027-*.log`. As fixtures e este resumo ficam versionados. A publicação CI/Pages é vinculada ao SHA no log externo `docs/30-execucao/EXECUCAO_MESTRA_LOG.md`.

## Limites que permanecem explícitos

Continuam sem certificação integral: todos os instantes/coordenadas entre amostras, UT1/DUT1 e história pré-1972, base IANA fixada, ASC polar, hora de estações, aplicação/separação e decisão editorial de orbes. A etapa fecha os contratos de recusa/incerteza e suas provas; não declara resolvidas essas limitações. Não há nova rota de aspectos, persistência, flag produtiva, interpretação por IA ou padrão editorial habilitado. Rollback: reverter o commit desta etapa; sem migração. Gasto automático R$0.
