# WU181 — Semana no Lab existente

RUN_ID: `ATV-20260902-170644Z-01A0630F`. Produto `week-reading`; dependência direta de E2. O Lab existente não selecionava a base completa de 88/89 fatos e seu perfil de saída. O aceite desta WU é disponibilizar os sete cenários específicos nas ferramentas existentes, com fingerprints e recusas verificáveis. Não é aceite editorial do produto.

## Implementação

- Corpus opt-in `atv-week-reading-facts-synthetic/1.0.0`: comum, complexo, contradição, limite, incompleto, adversarial e segurança. Cálculo e preparação reais executam localmente sobre dados sintéticos, sem rede ou modelo.
- Os contextos compartilham uma base natal e sete amostras às 12 UTC, de 29/09 a 05/10/2026. A variação de contexto não constitui diversidade geométrica ou homologação. Contexto ausente preserva 88 fatos; os demais casos preservam 89. O limite Unicode tem exatamente 1.200 unidades UTF-16; comandos inseridos permanecem relato não confiável.
- `--experimental-week-reading` seleciona o corpus nos CLIs existentes de exportação, manifesto, avaliação, comparação e revisão. O corpus padrão continua em 1.25.0, com treze produtos e 105 casos; o runtime padrão não registra a Semana.
- Política de benchmark 1.4.0 aplica o limite de 4.500 tokens somente a partir do perfil confiável do caso. Excesso, tier inválido, cobertura incompleta, datas/referências erradas e limites ausentes são recusados. Versões, critérios, prompts, saídas e corpus continuam ligados por digests.

## Evidência local

`app/test-results/` contém `wu181-week-lab.log` (7/7), `wu181-lab-regression.log` (86/86 nos nove arquivos do Lab), `wu181-ai-unit.log` (122/122) e `wu181-ai-types.log` (tipos PASS). Sem falhas ou skips finais. As duas falhas iniciais eram expectativas incorretas dos testes: o template usa `evidence: null`, e alteração arbitrária de um display não é necessariamente falha de topologia; o teste de isolamento passou a remover um fato obrigatório. Nenhum validador foi relaxado.

`wu181-corpus.json`, `wu181-manifest.json`, `wu181-capture.json`, `wu181-report.json`, `wu181-review.json` e `wu181-reviewReport.json` registram sete casos e três repetições mecânicas por caso. Os 21 espécimes passam schema/checagem mecânica; latência, tokens e custo de fornecedor permanecem desconhecidos. Há 21 anotações incompletas e zero revisões confiáveis. `preparedChecksComplete=false`, `promotionEligible=false` e `publication=blocked`. Os fixtures demonstram transporte e estrutura, sem conteúdo editorial aprovado.

O CI da WU180 concluiu com sucesso no HEAD exato `4237af5d83c385e3ccb2399015e9d018c75902df`: [run 36576926587](https://github.com/samueldurco/atuavidanosastros/actions/runs/36576926587). Prova local `wu181-ci180-success.json`. O CI desta WU será vinculado ao commit exato no log/checkpoint após o push.

## Limites e continuidade

E1 permanece em execução, com intake privado, homologação e requisitos temporais completos pendentes. E2–E5 permanecem pendentes; critérios e fixtures não produzem interpretação útil aprovada. Timeline de sete dias, resumo por área e PDF previstos na arquitetura permanecem no escopo. Gates de release, gateway desabilitado, quotas, permissões e gasto automático de R$0 são preservados. Alterações paralelas de administração/TikTok/mídia/social não pertencem a esta WU.

Próximo requisito independente: entrada privada da Semana usando perfil natal e consentimentos existentes, com data inicial e contexto validado. Nenhuma nova ferramenta genérica ou chamada de modelo é necessária.
