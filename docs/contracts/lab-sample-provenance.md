# Procedência de amostras para elegibilidade

RUN_ID `ATV-20260902-170644Z-01A0630F`. WU-105, 28/09/2026.

## Contrato offline

`atv-promotion/1.4.0` acrescenta dois campos obrigatórios a `EvaluatedSample`, sem modificar `BenchmarkSample` ou as vinte amostras históricas:

- `provider`: identificador canônico igual ao do candidato, sem trim ou conversão de caixa. Ambos usam `^[a-z0-9][a-z0-9._-]{0,99}$`; máximo de 100 caracteres. Provedor inválido no candidato produz `provider_invalid`; divergência ou ausência na amostra produz `sample_provider_mismatch`.
- `executionId`: referência opaca de 1–120 caracteres, `^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$`. Ausência/formato inválido produz `execution_id_missing_or_invalid`. Deve ser única no lote inteiro, inclusive entre casos diferentes; reutilização produz `execution_id_reused`. Comparação exata, sensível à caixa.

Cada referência identifica uma invocação capturada de forma independente. Número de repetição não substitui a referência. O gate continua exigindo três repetições por caso, modelo resolvido, artefatos, versões, custo conhecido zero, tokens/latência e revisão autorizada vinculada ao conteúdo. Não deduplicar por digest de resposta: execuções distintas podem produzir conteúdo idêntico.

Candidaturas antigas sem esses campos ficam bloqueadas. Não preencher referências inventadas para fazê-las passar. O replay do benchmark histórico permanece disponível como diagnóstico e não fornece elegibilidade retroativa. `promotedModels` continua vazio.

## Fronteira de confiança e privacidade

O gate consome registros confiáveis do servidor/repositório, não payloads públicos. IDs declarados, formato válido e unicidade não comprovam uma chamada nem sua independência, o provedor efetivo, o uso dos artefatos ou a autenticidade do recibo. Não há verificador criptográfico nem registro persistente de capturas nesta WU. Renomear a mesma captura para gerar referências diferentes contorna a verificação estrutural e deve ser recusado na conferência operacional.

O operador autorizado deve confrontar cada referência com registros independentes da execução, confirmando caso, repetição, provedor, modelo resolvido, artefatos, medição e conteúdo. A referência pode ser um ID local estável que aponta para evidência de acesso restrito. Não incluir credenciais, recibos brutos, URLs privadas, textos pessoais ou dados de usuário; o formato não detecta todos os segredos possíveis. Não normalizar IDs existentes nem inferir IDs a partir apenas da posição da amostra.

Unicidade é local à candidatura avaliada; não impede reutilização entre lotes. Elegibilidade não é homologação, não persiste promoção e não autoriza gasto. A integração de captura/atestação e a revisão editorial real continuam pendentes.

## Evidência e orientação

Os testes reproduzem quatro falhas antes da correção e depois validam nove cenários de promoção, incluindo limites de comprimento, metadados legados, provedor trocado e reutilização intra/intercaso. IDs, notas e modelos de teste são sintéticos; não demonstram qualidade de nenhum modelo. QA: [procedência de amostras](../qa/LAB_SAMPLE_PROVENANCE_2026-09-28.md).

A skill OpenAI Docs orientou a avaliação específica, regressões contínuas e calibração humana, conforme [Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices). Os campos, limites e regras de unicidade são decisões locais ATV, não exigências atribuídas ao provedor. Nenhuma API de avaliação ou modelo foi chamada.
