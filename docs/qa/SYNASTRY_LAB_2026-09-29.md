# Sinastria — Lab experimental do produto

WU159, RUN_ID `ATV-20260902-170644Z-01A0630F`. Dependência concreta de E2: o Lab padrão não admitia a composição interna de Sinastria; agora os CLIs existentes podem selecionar explicitamente sete casos desse produto, sem alterar o corpus padrão ou o runtime produtivo.

Cinco testes focais PASS em `test-results/wu159-focal-final.log`: corpus sintético com política QA não aprovada; contexto contrafactual sem alteração geométrica; todos os 100 pares com estabilidade desconhecida; contexto ausente/máximo preservado; manifesto vinculado ao escopo; 21 amostras estruturais sem revisão/promoção/publicação; seleção e rejeição pelos CLIs existentes; novo build sem reter mutações de fixture.

Regressão dos scripts de corpus/benchmark/comparação/revisão e novos casos: 68 testes PASS em `test-results/wu159-root-test.log`. Svelte check: zero erros e zero avisos em `test-results/wu159-web-check.log`. O corpus padrão continua com suas 13 bases e 105 casos; seus testes e digests de solicitações anteriores foram preservados.

As 21 amostras de fixture passam schema e controles mecânicos. Latência, tokens e custo permanecem desconhecidos, portanto os diagnósticos operacionais não são completos. O conteúdo é deliberadamente estrutural, sem utilidade editorial demonstrada. O relatório mantém `publication=blocked`, `promotionEligible=false` e proveniência declarada não autenticada. Nenhum provedor externo foi chamado, e custo automático permanece zero.

Uma tentativa inicial passou um objeto de opções onde a fábrica exige a política diretamente; a API recusou. Outra rodada comparou timestamps reais entre execuções e foi corrigida para comparar geometria/solicitações, preservando os timestamps e seus digests nos artefatos. Nenhum controle foi reduzido.

E1 integral depende de entrada/política/motor aprovados. E2 integral está BLOQUEADO por interpretação útil validada, metadados autênticos de modelo/prompt e revisão legítima. O corpus resolve a disponibilidade de casos para avaliação; não resolve esses aceites. Sinastria permanece indisponível no runtime produtivo. Próximo requisito local independente: entrada consentida de Sinastria no mecanismo privado existente; E3–E5 e liberação hospedada seguem pendentes.
