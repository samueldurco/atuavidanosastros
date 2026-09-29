# Calendário pessoal — base experimental 1.1

`personal-calendar` conserva a entrega de catálogo web/PDF e o release bloqueado. Este contrato cobre uma base local de E1 e a coleta privada de marcos pessoais; não aprova método temporal, leitura ou liberação.

## Entrada e intervalo

O pedido privado `atv-personal-calendar-request/1` exige sessão autenticada, perfil natal atual com hora `EXACT`, revisão esperada e consentimento de armazenamento. O servidor obtém os dados de nascimento do perfil do titular, sem aceitar nascimento enviado pelo cliente. `targetDate` deve ser o primeiro dia de um mês civil entre 1900 e 2099. O início do mês é inclusivo e o primeiro dia do mês seguinte é exclusivo. `context` opcional permanece um relato e não altera o cálculo. A seleção de outro dia, período móvel ou vários meses é recusada.

Até cinco marcos pessoais de datas distintas dentro do mês podem ser enviados com a autorização específica `atv-personal-calendar-marks/1`. Cada marco exige data e descrição curta. Sem essa autorização, o pedido não aceita marcos. O cliente, a função SQL e o domínio validam o escopo; a função grava um recibo privado vinculado ao run e à versão natal. A chave do pedido é idempotente para o mesmo titular e comando. A tabela de recibos não concede leitura direta a clientes. A liberação continua sujeita ao gate de `request_product_run`.

## Cálculo e limites

`atv-personal-calendar-calculation/1.1.0` enumera os 28–31 dias civis em UTC, com um fato identificado por data e limites explícitos. A candidata Caelus calcula uma carta natal validada; a projeção conserva apenas a longitude e a apresentação do Sol natal com proveniência do provider. Esse dado é estático e não atribui conteúdo astrológico a nenhum dos dias. Marcos autorizados aparecem somente como fatos `reported`, com fonte individual no input. Não há trânsito diário, evento inferido, previsão, dia favorável, atualização automática ou interpretação. O contexto declarado aparece somente como fato `reported`.

O calculador é registrado apenas por opt-in interno `experimentalPersonalCalendarBase: true`, independente da lista de produtos habilitados no processador. O caminho padrão permanece sem cálculo para este produto. `prepareProductFacts` e `evaluateProductDraft` recusam o snapshot, inclusive se fatos diários arbitrários forem acrescentados. Nenhum artefato web/PDF, entitlement ou release nasce desta base.

## Próximo aceite

E1 permanece parcial até haver fonte, método e autorização de conteúdo temporal por data. E2 exige evidência identificável por período, proveniência, regra de atualização e revisão editorial; E3–E5 exigem seus gates próprios. Dados sintéticos, marcos relatados e grade civil não aprovam motor nem liberação hospedada.
