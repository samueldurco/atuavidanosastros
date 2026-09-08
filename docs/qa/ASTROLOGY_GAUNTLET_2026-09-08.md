# Motor — contrato temporal e amostra independente JPL

RUN_ID `ATV-20260902-170644Z-01A0630F`; WU-025-ENGINE-CONTRACT-GAUNTLET.
Estado: **PLANETARY_SAMPLE_PASS**. Não é homologação integral nem autorização nova de produto público.

## Correções do contrato

- Data ISO gregoriana estrita, com segundos, UTC explícito `Z`, coordenadas finitas e intervalo experimental UTC de 1900 a 2099. Datas normalizadas pelo JavaScript, segundos intercalares e horários locais inconsistentes são rejeitados antes do cálculo/persistência.
- `UTC±HH:mm` exige correspondência exata; o offset histórico é fornecido pelo usuário. IANA usa as regras `Intl` do runtime, verifica DST e registra o offset resolvido. Uma hora repetida exige UTC explícito para desambiguar; uma hora inexistente é rejeitada. A base IANA ainda não está fixada por versão.
- O instante preserva milissegundos. A fixture de São Paulo em 01/01/2000 foi corrigida: 12h UTC corresponde a 10h local nas regras IANA do runtime; 09h permanece válido apenas para o offset explícito UTC−03.
- `EphemerisProvider` e `HouseCalculator` são separados. Em condição não suportada pela candidata (incluindo o limite conservador `|latitude| >= 66°`), Placidus devolve `not-applicable`, código `PLACIDUS_UNAVAILABLE`, aviso e **nenhuma cúspide**. MC é calculado separadamente. Não há conversão silenciosa para outro sistema de casas.
- Dez corpos são obrigatórios; posições inválidas não são omitidas nem distâncias ausentes viram zero. A proveniência v2 registra referencial, escala temporal, ΔT modelado, estado experimental e SHA-256 de 15 arquivos de dados da dependência.
- O parser compartilhado protege cálculo anônimo e salvamento. O leitor da Biblioteca continua com sua allowlist de proveniência; novos metadados não ampliam os dados enviados ao leitor.

## Referência e limites definidos antes da execução

[NASA/JPL Horizons API](https://ssd-api.jpl.nasa.gov/doc/horizons.html) e [manual oficial](https://ssd.jpl.nasa.gov/horizons/manual.html). Respostas brutas obtidas em 08/09/2026, sem credenciais e sem custo, preservadas em `packages/astrology/fixtures/horizons/`. O manifesto contém URL completa, assinatura, data e hash por corpo. Testes normais são offline. `.gitattributes` fixa LF para preservar os hashes entre Windows/Linux.

Configuração: observador no geocentro `500@399`, efeméride `OBSERVER`, quantidades 20 e 31, aparente `AIRLESS`, eclíptica da data IAU76/80, UT. A quantidade 31 inclui correções aparentes descritas pelo JPL. Antes de 1962, UT no Horizons significa UT1; depois, UTC. A candidata aproxima UT1 por UTC e usa seu modelo de ΔT. Essa diferença permanece explícita; não se declara equivalência rigorosa das escalas nem uso de DUT1/IERS.

Corpus: Sol, Lua, Mercúrio, Vênus, Marte, Júpiter, Saturno, Urano, Netuno e Plutão em sete épocas: 1900-01-01, 1950-06-21, 2000-01-01, 2024-03-20, 2026-09-08, 2050-12-21 e 2099-12-31 (horários completos no manifesto). Cada época inclui referências a ±1 hora para conferir o sentido do movimento. São 210 linhas brutas e 70 comparações centrais.

| Medida | Limite prévio | Máximo observado |
|---|---:|---:|
| Longitude, diferença circular | 60″ | 11,635921″ |
| Latitude | 60″ | 2,607404″ |
| Distância, erro relativo | 0,001 (0,1%) | 0,000105160 (0,010516%) |
| Sentido retrógrado | Concordância nas 70 amostras | 70/70 |

Resultado: **70/70** dentro dos limites. O teste verifica hashes, dez corpos, 21 instantes por corpo, datas julianas e campos finitos antes das comparações. Movimento de referência próximo de zero não seria aceito como evidência de estação. O manifesto da candidata também é conferido contra o pacote instalado em cada teste unitário.

## Reprodução e gates

- `node scripts/evaluate-astrology.mjs`: gera o relatório detalhado em `test-results/astrology-horizons.json`.
- `node scripts/astrology-data-manifest.mjs`: confere versão e hashes do dataset instalado; `--write` é atualização explícita, nunca automática durante testes.
- `node scripts/fetch-horizons-fixtures.mjs`: atualização explícita das referências; exige revisão do diff, não integra CI.
- `pnpm check`: zero erros e avisos; `pnpm lint`: aprovado.
- `pnpm test:unit`: 43 aprovados (8 astrologia, 16 IA, 16 web, 3 integrações). O teste JPL contém as 70 comparações.
- `pnpm test:e2e`: 19/19 aprovados, incluindo cálculo real no runtime local Cloudflare, leitor, acesso protegido e reflow. Nenhuma nova alegação de paridade visual integral.
- `pnpm build`: aprovado em todos os pacotes. `git diff --check`: aprovado. Checks remotos são reconciliados no log pelo SHA publicado.

## Gate ainda aberto

Esta amostra não cobre todo o intervalo nem autoriza promover a candidata. Permanecem pendentes: corpus independente de Ascendente/MC/cúspides e aspectos, fronteiras de Placidus, estações retrógradas, cobertura temporal mais densa e decisão sobre regras IANA/UT1/ΔT em produção. A superfície MC existente mantém seu escopo anterior; não foi criado mapa completo, interpretação por IA, produto pago ou novo entitlement. Gasto automático R$0, flags e gates preservados.

Rollback: reverter o commit desta WU restaura o adaptador anterior; não há migração de banco. A reversão também retiraria as novas recusas de entradas inconsistentes e a proteção contra cúspides substitutas, devendo ser registrada como tal.
