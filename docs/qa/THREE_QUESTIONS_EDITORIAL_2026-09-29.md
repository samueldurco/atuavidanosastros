# Três Perguntas — E2 local

RUN_ID `ATV-20260902-170644Z-01A0630F`; WU142. Implementação e validação locais, sem aprovação editorial real ou liberação hospedada.

## Requisito e comportamento

A base de três pares existia, mas aceitava a saída genérica de uma carta. O perfil específico agora exige três leituras vinculadas aos próprios pares, contexto relatado quando recebido, uma relação conjunta, uma síntese dos três papéis e três perguntas práticas distintas. Não aumenta o limite de afirmações nem junta fatos em uma afirmação inválida. Fatos, dados e sorteio permanecem preservados. [Contrato](../contracts/three-questions-editorial.md).

Os testes genéricos de transporte usam o cálculo real de um relato de sonho sem perfil editorial; Três Perguntas passa a ter fixtures específicas, identificadas como sintéticas. Isso conserva a cobertura de transporte e impede que uma saída genérica satisfaça o produto.

## Evidências

- IA: 92/92 testes; `test-results/wu142-ai-final.log`. Inclui base/fonte, três papéis, rejeição de saída genérica, troca de pares, contexto ausente ou inventado, integração, perguntas e gateway. TypeScript: `wu142-ai-check.log`.
- Worker: 110/110; `test-results/wu142-worker-final.log`. Preparação preserva sete fatos com contexto; revisão sintética não publica; erro mecânico prevalece; edição invalida digest; snapshot permanece íntegro. TypeScript: `wu142-worker-check.log`.
- Corpus: `test-results/wu142-corpus.json`. Versão 1.19.0, fingerprint `9beda44ce95d3d584548778085c667d686e18c2022892c840cc356b332f4dd54`. Retirar somente o novo perfil restaura `bac58d61a1d47192756ed7763f0775c3e4a2bc318c4dc7b5996b6d4fe7728ea7`; nenhuma mudança silenciosa nos fatos históricos.
- Corpus, benchmark, comparação, revisão e persistência: 78/78, `test-results/wu142-root-final.log`. Formatação, diff e scanner: evidências focais `wu142-*`.
- WU141: CI `36517680746`, SHA `40b57f23230bbc3450c50317d4683f848d89a010`, completed/success, `test-results/wu141-ci.json`.

## Aceite e continuidade

E2 implementado estruturalmente e validado localmente. Fixtures não são significados úteis aprovados, modelo homologado ou revisão legítima. E1/E2 integrais permanecem BLOQUEADOS: responsável editorial deve homologar a política e fornecer conteúdo ou modelo/prompt validado com metadados autênticos e revisão legítima. E3–E5 seguem para o leitor e percurso local; aceite hospedado depende também do proprietário reativar Supabase. Gates desligados, R$0, sem nova chamada de provedor, migração, alteração de permissão ou release.
