# WU180 — Perfil editorial da Semana

RUN_ID: `ATV-20260902-170644Z-01A0630F`. Base Git: `5aafb6ef62228c320e1f9729388c8a0a7ef43e0d`. Dependência direta E2/E3: o limite genérico de quarenta fatos recusava a base íntegra de 88/89 fatos da Semana. O perfil `atv-week-reading-editorial/1.0.0`, preparação 1.33.0 e prompt 1.0.19 admitem essa base sem truncamento e preservam a verificação da projeção original.

O perfil exige oito hipóteses ordenadas (base natal e sete amostras), cobertura dos fatos compartilhados e dos onze fatos de cada amostra, data literal do respectivo dia, síntese com as oito referências, três perguntas distintas e quatro limites literais. Não admite relações calculadas. A topologia confere o intervalo consecutivo, as amostras às 12:00 UTC e a proveniência específica; a geometria original continua sob o guard do Worker. O contexto declarado entra somente como dado sem autoridade de instrução.

Os limites exclusivos do transporte são 89 fatos, 60.000 caracteres de entrada, 22.000 de saída, 4.500 tokens e oito hipóteses. Os limites genéricos/free permanecem; o perfil não concede entitlement, uso de modelo, aprovação editorial ou liberação. O teste que admite uma promessa de riqueza em uma estrutura mecanicamente válida documenta a necessidade de revisão semântica legítima: o Director mantém `needs_editorial_review` e a publicação bloqueada.

Validação local, sem chamadas de modelo:

- IA: **122/122 PASS**, sem skips (`test-results/wu180-ai-unit.log`). Inclui perfil, topologia adulterada, omissão de cada fato exigido, referências cruzadas, data errada, contexto hostil, saída incompatível e recusa de entrada excessiva antes da reserva/chamada.
- Worker: **298/298 PASS**, sem skips (`wu180-worker-unit.log`). O guard original e as variantes de corrupção continuam cobertos; uma saída sintética completa chega apenas a revisão pendente.
- Regressão do Lab: **73/73 PASS**, sem skips (`wu180-lab-regression.log`). Nenhum corpus padrão ampliado.
- Tipos IA/Worker e web: **PASS**, web com zero erros e zero avisos (`wu180-ai-check.log`, `wu180-worker-check.log`, `wu180-web-check.log`). Formato, diff e segredos: evidências de fechamento em `wu180-format-check.log`, `wu180-diff.log`, `wu180-secrets.log`.

A primeira checagem de tipos encontrou atribuições incompatíveis apenas nas fixtures novas; foram corrigidas sem ampliar tipos de produção. A primeira rodada do Worker encontrou duas expectativas antigas da versão do prompt no Horóscopo/Dossiê; foram atualizadas para 1.0.19 e a suíte completa passou.

CI179 [36574571875](https://github.com/samueldurco/atuavidanosastros/actions/runs/36574571875) concluiu quality e secrets com SUCCESS no SHA da base; prova filtrada em `test-results/wu180-ci179-success.json`. CI178 também está SUCCESS (`wu180-ci-prior.json`). CI180 será vinculado ao SHA do fechamento, separadamente da validação local.

E1 segue parcial: intake real, homologação e escopo temporal integral pendentes. E2–E5 permanecem pendentes; as fixtures não entregam leitura útil aprovada. Timeline de sete dias, resumo por área e PDF do contrato original permanecem requisitos, com calendário/lembretes opcionais sujeitos a consentimento. Gates off, R$0 e alterações paralelas preservadas. Próxima dependência finita: casos sintéticos específicos da Semana no Lab existente para avaliar seu perfil, sem iniciar chamadas ou aprovação.
