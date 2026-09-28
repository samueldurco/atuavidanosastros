# Manifesto de artefatos do Intelligence Lab

RUN_ID `ATV-20260902-170644Z-01A0630F`. WU-094, 28/09/2026.

## Fronteira de confiança

`assessPromotion(candidate, authority)` é um gate offline para registros confiáveis do laboratório, não uma API pública nem um parser de payloads arbitrários. A política `atv-promotion/1.3.0` compara os quatro hashes declarados pelo candidato com `authority.artifacts`, obtido independentemente pelo operador. Uma referência ausente ou inválida resulta em `artifact_manifest_missing_or_invalid`; divergência resulta em `artifact_mismatch:prompt|schema|rubric|dataset`. Os checks anteriores de versão, cobertura, repetição, identidade, custo, latência e revisão continuam obrigatórios.

Não copiar a referência do candidato, do cliente ou de uma resposta de modelo. A validade estrutural de `validArtifactManifest` não autentica autoria, assinatura, histórico de execução, revisão editorial, privacidade ou recibos. O operador deve selecionar o commit aprovado para a avaliação, conferir a execução e manter evidências. A correspondência de hashes é necessária, mas não basta para homologação. `promotedModels` permanece vazio; elegibilidade não escreve no registro nem liga flags.

## Snapshot offline

Na raiz do repositório: `node scripts/lab-artifacts.mjs [SHA]`. Sem argumento usa HEAD, resolvido uma vez para SHA completo; também aceita literalmente HEAD ou um SHA de 40 caracteres hexadecimais minúsculos existente no repositório. Não aceita branches, caminhos, opções nem argumentos extras. O comando não usa rede, segredos, modelos ou migrações. Saída: JSON com `version`, `commit` e `artifactDigests`; falhas retornam código 1 e mensagem sanitizada, sem conteúdo de fonte ou detalhes de Git.

Versão `atv-lab-artifacts/1.0.0`. Os bytes são lidos de blobs do commit, não do working tree, com limite de 1 MiB por arquivo e recusa de blob vazio/ausente. Não há normalização de quebras de linha. Isso mantém o mesmo manifesto em checkouts LF/CRLF de um commit. Dois commits com os mesmos blobs possuem os mesmos digests; o SHA identifica a origem, não modifica os hashes de conteúdo. Código local não commitado não é evidência do snapshot.

## Grupos e formato de hash

Caminhos relativos a `packages/ai/src`, na ordem canônica abaixo:

| Grupo | Blobs incluídos |
| --- | --- |
| prompt | constitutions.ts, contracts.ts, prompt.ts, schema.ts |
| schema | contracts.ts, schema.ts |
| rubric | contracts.ts, director.ts |
| dataset | contracts.ts, lab/dataset.ts, lab/release-dataset.ts |

Cada arquivo é lido uma vez, recebe SHA-256 dos bytes e compõe `{path, sha256}`. O digest do grupo é SHA-256 do JSON UTF-8 compacto `{version, artifact, files}`, nessa ordem de propriedades e com a ordem de arquivos acima. O manifesto contém exatamente quatro hashes hexadecimais minúsculos de 64 caracteres e nenhum campo extra. Mudança de constituição, limites, schema ou caso-base invalida os grupos dependentes mesmo que uma versão pública tenha sido esquecida.

A lista de dependências é explícita, não um resolvedor automático: ao adicionar imports ou outras fontes que influenciem os artefatos, atualizar grupos/testes e versionar o formato se necessário. Este manifesto não cobre o adaptador de provider, gateway, motor determinístico nem o corpus factual de produto separado. Eles mantêm seus próprios contratos e evidências. Não reescreve as vinte amostras históricas nem transforma golden seeds em goldens calibrados.

## Verificação

`pnpm --filter @atv/ai check` e `pnpm --filter @atv/ai test:unit`. Cobertura: determinismo, grupos transitivos, mudança de bytes e de commit, LF/CRLF, blobs ausentes/vazios/grandes, formatos recusados, CLI fora da raiz, SHA inexistente, ausência de referência e quatro divergências. Fixtures e notas são sintéticas e não demonstram qualidade editorial.
