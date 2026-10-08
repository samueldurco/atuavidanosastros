# Calendário pessoal — base experimental 1.1 e reconstrução privada 4

`personal-calendar` conserva a entrega de catálogo web/PDF e o release bloqueado. Este contrato cobre uma base local de E1 e a coleta privada de marcos pessoais; não aprova método temporal, leitura ou liberação.

## Entrada e intervalo

O pedido privado `atv-personal-calendar-request/1` exige sessão autenticada, perfil natal atual com hora `EXACT`, revisão esperada e consentimento de armazenamento. O servidor obtém os dados de nascimento do perfil do titular, sem aceitar nascimento enviado pelo cliente. `targetDate` deve ser o primeiro dia de um mês civil entre 1900 e 2099. O início do mês é inclusivo e o primeiro dia do mês seguinte é exclusivo. `context` opcional permanece um relato e não altera o cálculo. A seleção de outro dia, período móvel ou vários meses é recusada.

Até cinco marcos pessoais de datas distintas dentro do mês podem ser enviados com a autorização específica `atv-personal-calendar-marks/1`. Cada marco exige data e descrição curta. Sem essa autorização, o pedido não aceita marcos. O cliente, a função SQL e o domínio validam o escopo; a função grava um recibo privado vinculado ao run e à versão natal. A chave do pedido é idempotente para o mesmo titular e comando. A tabela de recibos não concede leitura direta a clientes. A liberação continua sujeita ao gate de `request_product_run`.

## Cálculo e limites

`atv-personal-calendar-calculation/1.1.0` enumera os 28–31 dias civis em UTC, com um fato identificado por data e limites explícitos. A candidata Caelus calcula uma carta natal validada; a projeção conserva apenas a longitude e a apresentação do Sol natal com proveniência do provider. Esse dado é estático e não atribui conteúdo astrológico a nenhum dos dias. Marcos autorizados aparecem somente como fatos `reported`, com fonte individual no input. Não há trânsito diário, evento inferido, previsão, dia favorável, atualização automática ou interpretação. O contexto declarado aparece somente como fato `reported`.

O calculador é registrado apenas por opt-in interno `experimentalPersonalCalendarBase: true`, independente da lista de produtos habilitados no processador. O caminho padrão permanece sem cálculo para este produto. `prepareProductFacts` e `evaluateProductDraft` recusam o snapshot, inclusive se fatos diários arbitrários forem acrescentados. Nenhum artefato web/PDF, entitlement ou release nasce desta base.

## Projeção privada de leitura

A rota `/biblioteca/nova/personal-calendar` aceita o formulário apenas com sessão; a consulta de acesso devolve somente o estado mínimo e o gate real segue fechado. `read_product_run` projeta `personalCalendar` apenas para um run do titular já `READY` e legitimamente liberado pelos gates de release, entitlement, recibo editorial e promoção. A projeção contém somente o mês civil, suas 28–31 datas e a identificação explícita de grade UTC. Os fatos já projetados mostram a referência estática do Sol natal e, quando autorizados no pedido, os marcos pessoais como `reported` com fonte individual; a função não expõe input, carta ou `data` brutos.

O cliente confirma a continuidade dos dias, o limite do mês, os fatos de cada dia e a origem dos marcos antes de mostrar a grade. Datas ausentes, repetidas, fora do mês ou fontes conflitantes ocultam a grade. A interface distingue relato pessoal de cálculo e não sugere trânsito, evento ou previsão diária. Esta é uma prévia factual condicional de leitura, não uma liberação de conteúdo editorial ou um método temporal aprovado.

## Próximo aceite

E1 permanece parcial até haver fonte, método e autorização de conteúdo temporal por data. E2 exige evidência identificável por período, proveniência, regra de atualização e revisão editorial; E3–E5 exigem seus gates próprios. Dados sintéticos, marcos relatados e grade civil não aprovam motor nem liberação hospedada.

A matriz de cobertura, proveniência e recusa diária está em [personal-calendar-daily-evidence.md](personal-calendar-daily-evidence.md). O preparo editorial atual já recusa este snapshot com `insufficient_facts`.

## Reconstrução privada autorizada em 08/10/2026

As seções anteriores continuam descrevendo a base nativa 1.1 e seus gates. A autorização integral de 08/10 acrescenta um caminho privado separado: `atv-private-calendar-synthesis/4.0.0`, política `atv-calendar-observed-major-aspects/1.0.0`. Não promover nem reinterpretar snapshots históricos como esta versão. A execução mantém sessão, consentimento, grants privados e revisão canônica; não libera o workflow público legado.

O servidor calcula o natal completo e conserva o input natal validado na base. Confere igualdade dos dados de nascimento, contexto, mês, marcos, proveniência e Sol natal antes de projetar a leitura. Observações `atv-personal-calendar-six-hour-samples/1.0.0` usam dez corpos, longitudes geocêntricas tropicais, UTC, a cada seis horas entre início inclusivo e fim exclusivo do mês. A grade contém 112–124 instantes; nenhum instante fora do domínio 1900–2099 é calculado. A fonte é Caelus 0.24.1/MIT, com versão, algoritmo, manifest/contrato e horário real de cada observação. Coordenadas 0/0 são uma referência explícita para as longitudes geocêntricas; não geram casas locais diárias.

Os cinco aspectos maiores dirigidos trânsito–natal usam afastamento de até 2°. Uma janela é uma sequência de observações dentro desse limite. Entrada é a primeira observação dentro; saída é a primeira fora, com referência à última dentro; pico é o mínimo amostrado estritamente menor que os vizinhos. Limites do mês não inventam entradas, saídas ou picos. Janelas presentes em todas as observações são panorama mensal. Esta resolução não certifica a hora exata nem exclui contatos breves entre observações.

Cada uma das 28–31 datas conserva seus dez corpos observados ao meio-dia, fatos e capítulo próprios. Seleção contextual determinística admite zero a três mudanças distintas por data, com critério registrado. Movimentos persistentes têm capítulo separado; um mesmo movimento é interpretado uma vez, e suas retomadas referenciam essa leitura com perguntas da etapa atual. Datas sem seleção oferecem registro livre, sem fabricar trânsitos ou repetir uma interpretação genérica. Os marcos permanecem relatos consentidos, separados da hipótese simbólica e sem alterar a geometria.

O calendário acessível abre o capítulo da data. O mapa usa as posições reais do meio-dia selecionado e aspectos da política mensal; não rotula o céu diário como natal. PDF e TXT preservam a leitura completa, grade, datas, contexto, revisão e limites; o TXT conserva também todos os fatos e suas fontes. O apêndice PDF informa os registros extensos omitidos, evitando repetir centenas de linhas técnicas.

Qualquer amostra ausente, hora/origem divergente, input alterado, fato injetado ou falha do provider impede gerar o mês inteiro. Cancelamento interrompe o cálculo. Alterar nascimento, mês, fuso, contexto ou marcos exige nova execução; não sobrescrever leitura salva ou aprovação histórica. Composição e aprovação revalidam a projeção e comparam o conteúdo canônico. E1/E2/E4 privados possuem prova local em `docs/intelligence/reconstruction/RECON_11_LOCAL_2026-10-08.md`; E3 hospedado e E5 pessoal permanecem separados.
