# Calendário pessoal — grade experimental 1.0

`personal-calendar` conserva a entrega de catálogo web/PDF e o release bloqueado. Este contrato cobre apenas uma base local de E1; não aprova método temporal, leitura ou liberação.

## Entrada e intervalo

O pedido usa o nascimento consentido já tipado no workflow (hora local e UTC, fuso, coordenadas e fonte). `targetDate` deve ser o primeiro dia de um mês civil entre 1900 e 2099. A versão 1.0 cobre exatamente esse mês: o início é inclusivo, o primeiro dia do mês seguinte é exclusivo. `context` opcional permanece um relato, sem alterar a grade ou a posição natal. A seleção de outro dia, um período móvel ou vários meses é recusada.

## Cálculo e limites

`atv-personal-calendar-calculation/1.0.0` enumera os 28–31 dias civis em UTC, com um fato identificado por data e limites explícitos. A candidata Caelus calcula uma carta natal validada; a projeção conserva apenas a longitude e a apresentação do Sol natal com proveniência do provider. Esse dado é estático e não atribui conteúdo astrológico a nenhum dos dias. Não há trânsito diário, evento, previsão, dia favorável, atualização automática ou interpretação. O contexto declarado aparece somente como fato `reported`.

O calculador é registrado apenas por opt-in interno `experimentalPersonalCalendarBase: true`, independente da lista de produtos habilitados no processador. O caminho padrão permanece sem cálculo para este produto. `prepareProductFacts` e `evaluateProductDraft` recusam o snapshot, inclusive se fatos diários arbitrários forem acrescentados. Nenhum artefato web/PDF, entitlement ou release nasce desta base.

## Próximo aceite

Para E1 completo faltam intake privado, fonte e autorização dos marcos que a pessoa deseja registrar e uma base temporal examinada para conteúdo por data. E2 exige evidência identificável por período, proveniência, regra de atualização e revisão editorial; E3–E5 exigem seus gates próprios. Dados sintéticos e a grade civil não aprovam motor nem liberação hospedada.
