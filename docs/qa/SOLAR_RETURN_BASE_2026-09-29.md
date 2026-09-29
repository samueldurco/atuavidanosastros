# WU193 — Revolução Solar E1: entrada e base experimental

RUN_ID `ATV-20260902-170644Z-01A0630F`. Produto `solar-return`, marco E1 em execução.

Requisito: o ciclo deve usar perfil natal e cidade/fuso do aniversário declarados, achar o instante do retorno solar e registrar carta/fatos/proveniência sem produzir interpretação. A mudança adiciona `returnLocation` ao workflow, valida âncora do aniversário e opt-in interno do cálculo. O teste com a candidata Caelus demonstrou resíduo angular dentro de `0.00002°`, comportamento de 29/02 em ano não bissexto e a invariância do instante geocêntrico frente a mudança de cidade, com casas locais distintas.

O cálculo, os facts e o snapshot são locais e experimentais. Não há intake web, pedido persistido do produto, leitura editorial, resultado final web/PDF, aprovação do motor, sessão hospedada ou release. A cidade de teste é sintética; nenhuma localização real é coletada por esta WU. CI e testes completos registrados no log canônico após execução.

Rollback: retirar o opt-in experimental do runtime e reverter o novo adaptador/entrada antes de qualquer pedido real; nenhum dado hospedado foi escrito.
