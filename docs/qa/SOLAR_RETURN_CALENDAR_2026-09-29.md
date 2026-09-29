# WU196 — Revolução Solar: grade civil dos 12 meses

RUN_ID `ATV-20260902-170644Z-01A0630F`. Produto `solar-return`, preparação local de E2 em andamento.

A versão experimental `atv-solar-return-calculation/1.1.0` acrescenta uma grade civil de 12 intervalos contíguos no snapshot. A âncora é o aniversário civil declarado, não o instante astronômico. Fronteiras em meses curtos são limitadas ao último dia do mês, sempre recalculadas da âncora original. Datas autorizadas aparecem por referência aos seus fatos relatados; uma data na fronteira final do ciclo fica separada dos 12 intervalos. A geometria do retorno não foi alterada.

Os testes do calculador cobrem contiguidade, dias 31, 29/02, transições na fronteira, data terminal e rejeição de data impossível, além de comprovar que o snapshot mantém os 12 intervalos mesmo sem datas declaradas. Worker completo: 339/339; check TypeScript e Prettier dos arquivos alterados: PASS. Registro em `app/test-results/wu196-worker.log`. O contrato explicita que a grade não contém tema, previsão, regência nem leitura de qualquer mês. Ela só permite auditar cobertura civil e relacionar relatos autorizados.

Aceite desta WU: base estrutural mensal produzida e verificada localmente. E2 permanece parcial: faltam política de evidências temporais, método editorial, modelo/prompt aprovado, revisão da leitura e prova de utilidade dos 12 meses. E1 permanece parcial pelos gates de motor, licença, dados reais autorizados e verificação hospedada. E3–E5 pendentes; gates/default13 fechados e gasto automático R$0.
