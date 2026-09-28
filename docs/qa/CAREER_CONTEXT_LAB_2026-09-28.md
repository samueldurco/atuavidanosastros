# Contexto profissional — corpus offline do Lab

RUN_ID: `ATV-20260902-170644Z-01A0630F`. WU-101. 2026-09-28.

## Escopo e evidência

Corpus `atv-product-facts-synthetic/1.3.0`: 98 casos, 97 preparados e um bloqueado por ausência de Ascendente. As 91 bases da versão 1.2.0 e as 84 da versão 1.1.0 mantêm seus fingerprints. O suplemento `atv-career-context-synthetic/1.0.0` acrescenta sete relatos profissionais sintéticos: comum, complexo, contraditório, limite Unicode, ausência real, injeção de instruções e decisão de alto impacto.

Todos os sete usam o mesmo nascimento. A variação do relato não é diversidade astronômica: testes comparam os fatos calculados e o MC exatos. Contexto presente é `reported` com origem `input.context`; ausência não ganha um relato substituto. O limite de 1.200 unidades UTF-16 inclui caracteres suplementares válidos. Contato e URL adversariais são reservados/sintéticos.

Fingerprint SHA-256 das requisições atuais: `9b89443867a4483245c623bbc6b88192886499d608fdcda7d500ef3e5edbfe6f`. O digest não inclui timestamps variáveis dos cálculos e não certifica precisão ou qualidade.

- `node --test scripts/product-lab-corpus.test.mjs`: **10 PASS**, `test-results/wu101-corpus.log`.
- `pnpm --filter @atv/ai --filter @atv/worker test:unit`: **39 IA + 71 worker PASS**, `test-results/wu101-unit.log`.
- `pnpm --filter @atv/ai --filter @atv/worker check`: **PASS**, `test-results/wu101-check.log`.
- `git diff --check`: PASS. Nenhuma alteração de UI, schema de produção ou migração; sem necessidade de repetir os gates visuais da WU-100.
- CI da WU-100, SHA `8358e08583f35e71ca77368ddc85e73cc97349e6`: quality `109036956543`, secrets `109036956077`, Pages `109037441391`, todos completed/success.

## O que os testes provam — e não provam

O construtor mantém o mesmo sistema e serializa papéis/comandos adversariais apenas como texto no JSON de entrada; não cria mensagens de sistema, ferramentas ou estado comercial. A redação de contato ocorre no prompt, sem adulterar os fatos persistidos. É defesa em profundidade, não anonimização garantida.

O Director rejeita fixtures de MC alterado, casa inexistente, escopo integrado indevido, propriedades de ferramentas, instrução textual conhecida e prescrições explícitas de demissão/investimento/enriquecimento. As expressões verificadas não constituem detector completo de risco ou de injeção. Sem chamada a modelo, não se mede obediência real ao sistema.

Uma fixture estruturalmente válida permanece `needs_editorial_review` e `publication: blocked`; um revisor autodeclarado não é autorizado. O fato de a fixture ignorar o contexto e passar controles mecânicos ilustra a necessidade de avaliação semântica e humana: não é resposta exemplar, interpretação aprovada nem golden case.

O desenho de casos comuns, limites e adversariais e a separação de controles automatizados e julgamento humano seguem a [documentação oficial de boas práticas de avaliações](https://developers.openai.com/api/docs/guides/evaluation-best-practices). Essa referência orienta o teste; não homologa o corpus ATV.

## Gates preservados

13 bases parciais, 12 produtos sem calculador. Dataset de release de 42 casos, baseline de dez, dois golden seeds sem calibração e vinte amostras históricas inalterados. Prompt, constituições, schema, Director e política de promoção não mudaram. Nenhuma chamada paga, nova rodada de benchmark, revisão humana simulada como real, modelo homologado, release ou migração hospedada. IA default-off, R$0 e publicação bloqueada.
