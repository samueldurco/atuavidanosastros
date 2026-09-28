# Comparação editorial declarada — WU-113

RUN_ID `ATV-20260902-170644Z-01A0630F`. 28/09/2026.

CLI offline `--compare-reviews` revalida quatro arquivos contra o corpus atual e preserva o bloqueio entre checagens mecânicas, declarações editoriais e autoridade de promoção. Contrato: [product-benchmark-review.md](../contracts/product-benchmark-review.md).

13 testes novos PASS (`test-results/wu113-focal.log`): pareamento por caso/repetição independente da ordem; quedas/altas de notas; critérios pass/fail; perda/recuperação de declaração completa; anotação ausente versus amostra ausente; nulos sem nota zero; schema falho apesar de notas perfeitas; custo desconhecido; vínculos trocados/antigos; execução reutilizada; bloqueios/cobertura por produto; imutabilidade; redação de output/evidências/revisor/recibo/data; CLI códigos0/1/2.624 declarações completas são fixtures de software, não revisão humana ou qualidade calibrada.

Regressão anterior:50 testes corpus/benchmark/comparação/handoff PASS junto da primeira versão de11 testes novos (`test-results/wu113-lab.log`:61PASS). Os dois novos casos e extensão do CLI foram executados na suíte focal final de13PASS. IA44PASS (`wu113-ai.log`) e TypeScript IA PASS (`wu113-ai-check.log`). `git diff --check` PASS. Sem alteração de runtime/UI, banco, gateway ou política; gates web aprovados na WU-112 não foram repetidos como se constituíssem nova evidência desta unidade.

OpenAI Docs orientou a separação entre métricas específicas e calibração humana ([Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)). Não houve acesso à API, chamada de modelo ou revisão humana. Não há ranking/vencedor, controle de identidade dos revisores, significância estatística, importação de autoridade ou homologação. Nenhum modelo homologado;13 bases parciais/12 cálculos indisponíveis, caso polar bloqueado, R$0 e default-off preservados.
