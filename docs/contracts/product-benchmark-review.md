# Handoff de revisão editorial de produto

RUN_ID `ATV-20260902-170644Z-01A0630F`. WU-111, 28/09/2026. Versão `atv-product-review/1.0.0`.

Extensão offline do [benchmark](product-benchmark.md), não um novo gate de homologação. Prepara anotações em branco e verifica sua integridade/completude. Não chama modelos, escreve arquivos, atribui notas, autentica pessoas ou converte declarações em `ReviewAuthority`. Nenhum modelo homologado.

## Procedimento local

1. Conferir uma captura **sintética** pelo benchmark existente, mantendo-a em diretório privado/ignorado pelo Git. A execução não autoriza novas chamadas externas.
2. Executar `node scripts/evaluate-product-benchmark.mjs --review-template captura.json`. Guardar o JSON emitido em arquivo separado; o CLI não sobrescreve a captura. A saída contém uma linha por amostra recebida, não respostas fictícias para posições ausentes/bloqueadas.
3. O revisor humano deve consultar a captura exata e o corpus/prompt local correspondente. Preencher, sem auxílio de notas inventadas, cada dimensão da [rubrica existente](../intelligence/README.md) e cada critério do caso. Não substituir a revisão por concordância automática com a checagem mecânica.
4. Executar `node scripts/evaluate-product-benchmark.mjs --review captura.json anotacoes.json`. Corrigir lacunas/falhas explícitas; manter a revisão independente e a procedência operacional como requisitos separados. O relatório não pode ser enviado diretamente ao gate de promoção como evidência confiável.

Os dois arquivos de entrada devem ser arquivos regulares de até16MiB. O leitor é o mesmo do benchmark, com leitura limitada mesmo se o tamanho mudar durante a operação. Erros de leitura/JSON/tamanho usam os códigos `capture_*`; validações de anotações usam `review_*`. Não há rede, leitura de chaves ou gravação automática. O helper recebe somente objetos JSON inertes; não é um sandbox para getters/código executável.

## Contrato de anotações

Envelope exato: `version`, `dataClass=synthetic`, `binding`, `annotations`. `binding` contém digest da captura completa, versão/fingerprint do corpus, versões de prompt/schema/rubrica/política de benchmark e digest do contrato de revisão `{caseId, criteria, tier}` de todos os casos. O contexto é reconstruído do código confiável atual; não vem de um manifesto fornecido pelo arquivo. Digests são SHA-256 de `JSON.stringify`, sensíveis à ordem das propriedades e das amostras. Até uma alteração de métrica ou de ordem da captura exige novo formulário. Não são assinaturas nem comprovam que uma pessoa leu o conteúdo.

Cada anotação contém exatamente `caseId`, `repetition`, `outputDigest`, `tier`, `source`, `reviewer`, `reviewedAt`, `dimensions`, `criteria`. Caso/repetição deve existir na captura; duplicatas são rejeitadas. Digest da saída segue o benchmark, inclusive quando `output` é uma string JSON. Tier e critérios devem corresponder ao corpus. Campos extras, versões antigas, alteração de critério/tier/digest ou referência a caso ausente/bloqueado rejeitam todo o arquivo, sem relatório parcial favorável.

O formulário deixa **todos os campos de avaliação nulos**. Para declarar revisão completa:

- `source` deve ser explicitamente `human`; `calibrated-reviewer` não é aceito neste handoff. O campo não prova a autoria.
- `reviewer` deve ser um alias opaco de1–80 caracteres `[A-Za-z0-9._-]`, iniciado por alfanumérico, nunca e-mail, identidade pessoal ou segredo.
- `reviewedAt` deve ser uma data UTC válida no formato `YYYY-MM-DDTHH:mm:ss.sssZ`. É uma declaração, não timestamp autenticado.
- As12 dimensões devem estar presentes, cada uma com `score` finito0–10 e `evidence` textual não vazia de até2000 caracteres. Nulos significam pendência; ausência, string numérica, nota fora de faixa, controle indevido ou chave extra são inválidos. Nenhuma nota é inferida.
- Cada critério do caso mantém `index` e `text` exatos, com `verdict` igual a `pass` ou `fail` e `evidence` não vazia de até2000 caracteres. Nulo significa pendência. Não é permitido apagar critérios para obter completude.

Arquivo pode omitir linhas inteiras: o relatório marca `missing`, nunca aprovação. Linha com qualquer campo pendente é `incomplete`. Evidências são texto local, não instruções/HTML; o relatório não reproduz evidências, alias, timestamp, output ou recibos. Isso minimiza exposição, mas não é um detector de dados pessoais/segredos. Não colocar tais dados em nenhuma captura/anotação nem commitá-los.

## Interpretação segura

Linha `complete` permite apenas verificar condicionalmente as notas **declaradas** pela rubrica existente: piso7 em free/intermediate,8 em premium,10 em responsabilidade/fidelidade factual, todas com evidência. Reutiliza `editorialDecision`, sem alterar sua política. Qualquer falha mecânica/schema ou critério declarado `fail` resulta em `does-not-meet-local-checks`; aprovação condicional vira `meets-local-checks`, nunca `approved` ou revisão autenticada. Linha incompleta/ausente vira `not-assessed`. Índices dos critérios declarados falhos continuam visíveis mesmo em linha incompleta.

`preparedDiagnosticsComplete` exige todas as312 posições preparadas, checagens operacionais/mecânicas aprovadas (incluindo custo conhecido0) e todas as declarações completas dentro dos critérios. Amostras ausentes e anotações ausentes são contagens diferentes. O caso polar bloqueado e os12 produtos indisponíveis continuam explícitos; não são homologados por exclusão.

Códigos de saída:0 para formulário emitido ou diagnóstico preparado completo;1 para diagnóstico válido com falhas/lacunas;2 para entrada/operação rejeitada, com erro sanitizado. **Código0 não autoriza publicação, promoção ou uso de IA produtiva.** Todo relatório mantém `status=diagnostic-only`, `provenance=declared-not-authenticated`, `editorialReview=not-authenticated`, `trustedReviews=0`, `promotionEligible=false` e `publication=blocked`, mesmo com312 declarações perfeitas. O benchmark mecânico e o gate de release permanecem separados/inalterados; não há importador automático de anotações para a autoridade confiável.

OpenAI Docs orientou a separação de checagens específicas e calibração com feedback humano ([Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)). Formato, hashes, limites e bloqueios são decisões locais ATV. Não houve uso da API Evals, coleta de revisão humana ou criação de goldens calibrados nesta entrega.

## Comparação de declarações (WU-113)

`node scripts/evaluate-product-benchmark.mjs --compare-reviews baseline.json baseline-anotacoes.json candidato.json candidato-anotacoes.json` emite `atv-product-review-comparison/1.0.0`. A ordem é captura/formulário para cada lado. Os quatro arquivos mantêm os limites de arquivo regular/16MiB e leitura limitada do benchmark. Não há escrita, rede, avaliação por modelo nem autenticação de revisores. Reavalia as duas capturas e os dois formulários contra o corpus atual; rejeita vínculo antigo/trocado, campos extras e reutilização de `(provider, executionId)` entre capturas antes de emitir qualquer relatório. Relatórios prévios não são aceitos como evidência.

Pareamento por `caseId/repetition`, nunca pela ordem do formulário. Expõe as312 posições, cobertura/digests e estado de cada anotação (`sample-missing`, `missing`, `incomplete`, `complete`). Apenas declarações completas fornecem notas e veredictos comparáveis. Qualquer pendência torna **todas** as notas/veredictos daquele lado `null` na comparação; o diagnóstico individual continua registrando critérios falhos declarados. Não atribui zero a desconhecidos. `evidenceLost`/`evidenceRecovered` significam perda/ganho de declaração completa, inclusive quando desaparece/aparece a amostra; não são regressão/melhora de qualidade.

Notas mostram baseline/candidato/delta (candidato menos baseline, somente com ambos completos). `declaredScoreDecreases`/`declaredScoreIncreases` enumeram dimensões; critérios mostram índice e veredictos sem reproduzir texto/evidências. `declaredCriterionRegressions` é pass→fail e `declaredCriterionImprovements` é fail→pass, somente entre declarações completas. Decisões condicionais de cada lado reutilizam a rubrica do handoff e falhas mecânicas; notas perfeitas não anulam schema/mecânica/critérios falhos. Contagens por produto e totais podem se sobrepor. Não há média, ranking, vencedor, análise estatística, concordância entre revisores ou inferência de causalidade. Diferenças podem refletir revisores distintos: identidades não são autenticadas nem comparadas.

O campo `mechanical` preserva o diagnóstico mecânico completo da comparação anterior, incluindo lacunas, evidências operacionais desconhecidas, caso bloqueado e12 produtos indisponíveis. Perda de declaração editorial e perda de evidência operacional são medidas separadas. Nenhum output, prompt, request, texto de evidência, alias, timestamp de revisão ou recibo é reproduzido; digests/bindings permitem rastreio local, sem provar autoria.

Código0 exige `preparedDiagnosticsComplete` nos **dois** lados (312 posições cada, checagens mecânicas/operacionais e declarações completas dentro dos pisos). Não significa ausência de queda de nota acima do piso: consulte os deltas. Código1 indica diagnóstico válido com lacunas/falhas;2 rejeição sanitizada, sem relatório parcial. Mesmo624 declarações perfeitas mantêm `trustedReviews=0`, `provenance=declared-not-authenticated`, `editorialReview=not-authenticated`, `publication=blocked` e `promotionEligible=false`. Esta comparação não alimenta automaticamente a autoridade/gate de promoção; não homologa modelo, prompt, corpus ou produto.
