# Benchmark offline de bases de produto

RUN_ID `ATV-20260902-170644Z-01A0630F`. WU-107, 28/09/2026.

`atv-product-benchmark/1.0.0` aplica o avaliador mecânico existente às respostas do corpus factual de produto. Não chama provedores, não produz respostas, não pontua semântica e não promove candidatos. É separado do benchmark histórico e do gate de promoção: não substitui o dataset de release, a autoridade de artefatos, a captura confiável nem a revisão humana.

## Uso local

Na raiz do app, `node scripts/evaluate-product-benchmark.mjs --manifest` emite as versões, o fingerprint, os casos, seus critérios/limites e os digests esperados. `node scripts/evaluate-product-benchmark.mjs caminho/privado/captura.json` lê um arquivo regular local de até16MiB e emite o diagnóstico JSON. Não recebe entrada por rede, não lê chaves e não modifica a captura. Guardar capturas apenas sintéticas, sem credenciais/dados pessoais, em local privado ou ignorado pelo Git; autorização para usar este CLI não autoriza novas chamadas de modelo.

O envelope JSON tem exatamente: `version`, `dataClass`, `corpusVersion`, `corpusFingerprint`, `promptVersion`, `provider`, `model`, `samples`. Versão de captura: `atv-product-capture/1.0.0`; classe: `synthetic`. Versões/fingerprint devem corresponder ao manifesto local. Provedor canônico:1–100 caracteres `[a-z0-9._-]`, começando por alfanumérico; modelo:1–160 caracteres `[A-Za-z0-9._/-]`, começando por alfanumérico. A identificação declarada do modelo não é resolução/autenticação de sua revisão pelo provedor.

Cada amostra tem exatamente:

- `caseId`, `repetition` (inteiro1,2 ou3), `provider`, `model`, `executionId`;
- `requestDigest`, `promptDigest`, `output`;
- `latencyMs`, `inputTokens`, `outputTokens`, `costBrl`, `costEvidence`.

Provedor/modelo devem corresponder ao envelope. `executionId` segue o formato opaco da [procedência das amostras](lab-sample-provenance.md), sendo único no lote inteiro. Cada par caso/repetição aparece no máximo uma vez; caso desconhecido ou bloqueado rejeita o lote. Campo extra, inclusive tier/review/score, também rejeita. Não copiar uma resposta três vezes nem inventar referências de captura para satisfazer cobertura. Saídas idênticas de invocações distintas são possíveis e não são deduplicadas por digest.

O fingerprint preserva a projeção canônica `{id, request}` do corpus, sem timestamps de cálculo. `requestDigest` identifica o request completo do caso; `promptDigest` identifica o resultado completo de `buildPrompt(request)`, incluindo sistema, mensagem redigida, schema e parâmetros. São SHA-256 de `JSON.stringify`, sensíveis à ordem de propriedades, não JSON canônico universal. O manifesto é reconstruído do código local confiável; a captura não fornece seu próprio corpus. Esses hashes não provam que o provedor realmente recebeu essas instruções, não abrangem todo o código transitivo do motor e não substituem o manifesto Git do gate de promoção. Critérios são expostos para revisão, não considerados automaticamente atendidos.

`output` é JSON ou uma string JSON, até64KiB serializados, preservando o digest e a validação do benchmark existente. JSON inválido como resposta vira falha de schema; tamanho excessivo/representação não serializável rejeita o lote. Latência e custo são números finitos não negativos ou `null`; tokens são inteiros seguros não negativos ou `null`. Ausente, string numérica ou valor negativo não é convertido em zero. Todos os campos são obrigatórios; usar `null` para medição desconhecida. Custo0 só é conhecido com a evidência explícita aceita pelo benchmark (`basis` e referência opaca); não inferir gratuidade de uma captura local. Recibos/referências continuam sujeitos à conferência operacional.

## Leitura do relatório

Corpus atual1.4.0:105 casos,104 preparados,1 bloqueado (`ascendant-boundary`),13 bases parciais e12 produtos sem cálculo disponível. Três repetições por caso preparado geram312 posições esperadas. Casos bloqueados não ganham respostas fictícias nem desaparecem do relatório. Suplementos de contexto não se transformam em diversidade factual nova.

O relatório inclui lacunas por caso/repetição, recorte por produto, bloqueios, critérios, digests e resultados separados de schema, revisão mecânica, tokens, latência e custo. Não emite output/prompt/request bruto nem recibos. IDs e referências não são um detector universal de segredos: o operador deve manter os campos livres de informação sensível.

`preparedChecksComplete` é verdadeiro somente com todas as312 posições e todas as checagens mecânicas/operacionais aprovadas, incluindo custo conhecido0. Refere-se apenas aos casos preparados. Mesmo assim, `status=diagnostic-only`, `promotionEligible=false`, `publication=blocked`, `provenance=declared-not-authenticated` e revisão não realizada permanecem. `unreviewedSamples` conta respostas sem revisão humana; `unreviewedPreparedCases` conta os104 casos que seguem sem calibração editorial. Os12 produtos indisponíveis e o caso bloqueado não são homologados por exclusão do denominador.

Códigos de saída:0 para manifesto emitido ou cobertura mecânica preparada completa;1 para diagnóstico válido com falhas/lacunas;2 para entrada/operação rejeitada, sem relatório parcial otimista. Código0 **não é aprovação de modelo/produto**. Erros imprimem somente código sanitizado; não incluem caminho privado, payload ou exceção original. A função auxiliar espera objetos JSON já lidos de uma captura; não é endpoint público para objetos executáveis/getters nem um sandbox de código não confiável.

## Limites editoriais

O Editorial Director existente detecta apenas suas regras mecânicas. Não avalia automaticamente os critérios semânticos de cada cenário, profundidade, precisão de interpretação temporal, qualidade de síntese ou cuidado contextual. Não há nova nota, revisão humana, golden case calibrado, chamada externa ou modelo homologado nesta WU. Fixtures deliberadamente genéricas que passam nos testes comprovam essa distinção, não qualidade de leitura.

OpenAI Docs orientou a separação entre regressões específicas e calibração humana, conforme [Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices). Formato, limites, cobertura e bloqueios são decisões locais ATV; não houve uso da API Evals ou de modelos.
