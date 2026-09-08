# Ângulos e casas: referência geométrica independente

RUN_ID `ATV-20260902-170644Z-01A0630F`; WU-026-ANGLES-HOUSES-REFERENCE.
Estado: **ANGLES_HOUSES_GEOMETRIC_SAMPLE_PASS**. Nenhuma promoção de produção.

## Método e independência

O gerador Python não importa Caelus, dados da candidata nem o adaptador TypeScript. [PyERFA 2.0.1.5](https://pypi.org/project/pyerfa/2.0.1.5/) fornece ERFA 2.0.1, sob BSD-3-Clause; NumPy 2.2.6 faz operações vetoriais. Estas dependências são exclusivas do gerador local de QA. O app e o CI consomem somente as fixtures JSON versionadas.

ERFA calcula tempo sideral aparente com [`gst06a`](https://github.com/liberfa/erfa/blob/v2.0.1/src/gst06a.c) e obliquidade verdadeira com [`obl06`](https://github.com/liberfa/erfa/blob/v2.0.1/src/obl06.c) + [`nut06a`](https://github.com/liberfa/erfa/blob/v2.0.1/src/nut06a.c), modelo IAU 2006/2000A. Interseções vetoriais dos planos fornecem MC/ASC. Um solucionador próprio por bisseção na longitude eclíptica encontra as divisões dos semiarcos diurno/noturno de Placidus; não usa a iteração em ascensão reta da candidata.

A definição dos semiarcos foi conferida em Michael P. Munkasey, *An Astrological House Formulary*, [NCGR Geocosmic Journal, Spring 2006](https://ncgrastrology.org/wp-content/uploads/publications/geocosmic-journal-archive/2006_NCGR_Journal_Spring_2006.pdf), páginas impressas 59–60 (PDF 60–61), com inspeção visual. O artigo e seu código não são incorporados ao repositório. A bisseção é uma implementação separada das relações geométricas; não constitui uma segunda certificação profissional externa.

Antes da geração, âncoras analíticas com obliquidade e latitude nulas verificam quadrantes e ordem das doze casas. A geração exige resíduos inferiores a 1e-12 radiano nos quatro semiarcos. Manifesto e teste verificam SHA-256 da fixture e do gerador; os limites são fixados também no teste.

## Corpus e resultados

São 12 instantes: 1972-01-01, 2000-01-01, 2016-12-31 imediatamente antes do segundo intercalar, 2026-09-08 e oito horários espaçados de três horas em 2024-03-20. Cada instante cruza 14 coordenadas sintéticas, incluindo equador, longitudes +180/−180, trópicos, latitudes médias dos dois hemisférios, ±65,9999°, ±66° e polos.

| Comparação | Quantidade | Tolerância prévia | Máximo observado |
|---|---:|---:|---:|
| Meio do Céu | 168 | 60″ | 0,105633″ |
| Ascendente abaixo de 66° | 120 | 60″ | 1,420028″ |
| Cúspides Placidus abaixo de 66° | 1.440 | 120″ | 1,420028″ |
| Recusa de casas em ±66°/polos | 48 | status, código, aviso e cúspides vazias | 48/48 |

Resultado: **1.728/1.728 comparações angulares aprovadas**, sem divergência de status. As diferenças são circulares, com tratamento de 0°/360°.

O gerador converte o quasi-JD UTC do ERFA para UT1 com `utcut1(..., DUT1=0)` antes de calcular tempo sideral. Passar diretamente esse quasi-JD como UT1 deslocaria em aproximadamente um segundo a amostra no final do dia de segundo intercalar. A revisão corrigiu essa conversão na referência. O contrato do app continua rejeitando entrada civil `23:59:60`; não foi ampliado.

## Reprodução e verificações

Ambiente isolado, sem instalação global:

```powershell
python -m venv test-results/erfa-venv
test-results/erfa-venv/Scripts/python.exe -m pip install -r scripts/house-reference-requirements.txt
test-results/erfa-venv/Scripts/python.exe scripts/generate-house-reference.py
node scripts/evaluate-house-reference.mjs
pnpm check
pnpm lint
pnpm test:unit
```

O relatório detalhado fica em `test-results/astrology-houses.json`. A geração explícita requer revisão do diff; o CI não acessa Python, rede, IERS ou NASA. Resultados de validação do commit e checks remotos são reconciliados no log canônico pelo SHA.

Validação local: `pnpm check` (zero erros/avisos), `pnpm lint` e 44 testes unitários aprovados (9 astrologia, 16 IA, 16 web, 3 integrações). Esta WU altera somente QA; os 19 E2E da WU-025 permanecem a última evidência do código produtivo inalterado. O build de publicação é conferido no CI pelo SHA.

## Limites e continuidade

DUT1=0 aproxima UT1 por UTC; a tabela de segundos intercalares acompanha a versão fixada do ERFA. Esta prova não homologa IANA, datas históricas anteriores a 1972, todo o intervalo 1900–2099, refração ou convenções de ASC circumpolar. As 48 condições de recusa são o limite conservador do adaptador, não uma afirmação de que Placidus seja matematicamente impossível em toda latitude ≥66°.

Permanecem abertos aspectos, estações retrógradas, cobertura temporal densa e decisão integral de precisão/proveniência. A referência independente desta WU substitui a pendência de ausência completa de corpus de ângulos/casas da WU-025, com os limites acima. Gate B visual, homologação de IA e produção completa continuam separados e pendentes.

Nenhum código de cálculo produtivo, API, banco, flag, entitlement ou interface foi alterado nesta WU. Rollback: reverter somente os artefatos de QA adicionados; sem migração ou efeito nos resultados já salvos. Gasto automático R$0.
