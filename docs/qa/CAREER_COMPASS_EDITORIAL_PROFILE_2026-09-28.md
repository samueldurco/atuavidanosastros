# Bússola — perfil editorial local

WU-115 · RUN_ID `ATV-20260902-170644Z-01A0630F` · 28/09/2026.

Requisito E2 do plano §0.2: o fluxo anterior selecionava apenas instruções genéricas de propósito, sem exigir a entrega completa da Bússola. O servidor agora seleciona um perfil editorial versionado para `career-compass`; prompt, Director, gateway e corpus usam a mesma versão e preservam o vínculo aos fatos persistidos.

## Provas

- IA: 49 testes PASS, incluindo cinco testes do perfil: envelope parcial/MC, papéis/evidência/síntese, MC exato/três perguntas/repetição, instruções confiáveis/contexto como dado e minimização/rejeição no gateway. `test-results/wu115-ai.log`.
- Worker: 71 testes PASS e TypeScript PASS. `test-results/wu115-worker.log`, `test-results/wu115-worker-check.log`.
- Corpus/benchmark/revisão/comparação: 63 testes PASS. Cobrem preparação real do MC em entradas sintéticas, perfil obrigatório, rejeição de papéis/síntese/perguntas ausentes e impossibilidade de fixtures ou revisores autodeclarados homologarem/publicarem. `test-results/wu115-corpus.log`.
- IA TypeScript PASS. `test-results/wu115-ai-check.log`.
- Unitários amplos: 1244 PASS e uma falha na fixture antiga da Bússola; fixture e expectativas de exportação atualizadas, integração completa isolada com 15 PASS. Preserva as três seções/perguntas no resultado e reprocessamento, com aprovação exclusivamente sintética do proprietário do banco de teste. `test-results/wu115-tracked-unit.log`, `test-results/wu115-vertical.log`.
- Build dos pacotes versionados PASS; Prettier/ESLint focal da integração PASS. `test-results/wu115-build.log`, `test-results/wu115-vertical-lint.log`, `test-results/wu115-vertical-eslint.log`.
- Check final do app após tipar o helper de fixture: zero erros e avisos. `test-results/wu115-web-check-final.log`.
- Check de todos os pacotes versionados PASS, app com zero erros/avisos; 97 testes PostgreSQL local PASS. `test-results/wu115-tracked-check.log`, `test-results/wu115-db.log`.
- `diff --check`, Prettier do escopo e scan de segredos staged PASS. O check global inclui a fábrica de mídia ainda não versionada e falha nos erros preexistentes desse trabalho paralelo. O lint global detecta quatro arquivos paralelos de admin/TikTok fora da WU. Esses arquivos foram preservados; o CI do commit verifica a árvore versionada limpa. `test-results/wu115-check.log`, `test-results/wu115-lint.log`, `test-results/wu115-format-check.log`.

Corpus 1.5.0: 105 casos, 104 preparados, um negativo polar do Ascendente, 312 posições de avaliação; geometria e contagem preservadas. Fingerprint das requisições: `c5327c09e8aacd257fb8930982998c360d92e81ec7f043edc93957fbdc81347c`. O baseline que exclui Bússola e suítes adicionadas permanece idêntico. As fixtures novas são explicitamente estruturais e não contêm interpretação homologada.

## Limites e marcos

E2 está em execução, não concluído. Contagem, IDs, tipos e referências não demonstram significado, especificidade, pertinência, profundidade ou responsabilidade. O prompt instrui essas dimensões e o contrato exige revisão autorizada do texto efetivo. A separação entre checagem mecânica e avaliação semântica segue as recomendações de avaliações específicas da tarefa e calibração humana da [documentação oficial de avaliações](https://developers.openai.com/api/docs/guides/evaluation-best-practices).

Não houve chamada de modelo remoto, gasto, alteração de modelo/raciocínio, promoção, recibo legítimo, publicação, migração hospedada ou mudança de release. Todos os gates continuam fechados. E1 continua parcial pelos limites experimentais do motor e pela sessão hospedada indisponível; E3–E5 ainda dependem de interpretação/revisão/autoridade legítimas e provas hospedadas. Supabase pausado pelo proprietário é o bloqueio externo já registrado; não houve novo teste remoto sem mudança de condição.

Próximo requisito local independente: conferir a integridade da projeção numérica persistida do MC na preparação editorial, depois concluir os requisitos restantes E3–E5 que não dependem de aprovação externa.
