# WU195 — Revolução Solar E1: datas importantes autorizadas

RUN_ID `ATV-20260902-170644Z-01A0630F`. Produto `solar-return`, E1 local em execução.

O formulário aceita até três datas com descrições curtas dentro da janela civil iniciada na âncora do aniversário e terminada no mesmo dia do ano seguinte. Exige autorização específica para incluir as datas no pedido; a autorização de armazenamento do pedido permanece separada. Campos parciais, datas duplicadas ou fora da janela e entradas sem autorização são recusados. O servidor, o contrato de workflow e a função SQL validam de novo. O comando exato fica no recibo privado; a execução conserva datas e autorização. Pedidos anteriores sem datas continuam válidos.

No cálculo experimental, as datas são fatos `reported` com fonte no input. Não alteram a geometria da carta nem geram previsões, mensagens ou alertas. A janela é civil e serve à coleta de relatos; a busca astronômica do instante do retorno tem contrato próprio.

Provas locais: teste PGlite cobre persistência e proveniência de datas autorizadas com nascimento em 29/02, release fechado, autorização ausente, tipos incorretos, limite de três, datas anteriores ao ciclo e duplicadas, sem gravação em falhas. Teste do calculador confirma fatos relatados e geometria inalterada. As suítes completas Web, Domain e Worker e checks de tipo/formatação estão registrados em `app/test-results/wu195-*.log`.

Aceite desta WU: coleta e propagação privadas das datas implementadas e validadas somente no ambiente local de teste. A migração `20260929170000_solar_return_important_dates.sql` não foi aplicada nem verificada no ambiente hospedado. E1 segue parcial pelos gates de motor, licença, dados autorizados e verificação hospedada; E2–E5 permanecem pendentes. Gates/default13 continuam fechados, gasto automático R$0.
