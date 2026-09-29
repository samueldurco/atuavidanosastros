# Revolução Solar — base de cálculo experimental 1.1

`solar-return` conserva a entrega de catálogo web e PDF e o release bloqueado. Este contrato entrega somente a base local de E1; não aprova o motor, a interpretação nem a liberação.

## Entrada

- Reutilizar o nascimento consentido com data, hora, fuso, coordenadas e fonte. O adaptador verifica a correspondência entre hora local e UTC.
- Declarar `returnYear` e `targetDate`: a data é o aniversário civil nesse ano. Para nascimento em 29/02 e ano não bissexto, usar 28/02 como âncora de busca. O ano não pode preceder o nascimento.
- Declarar `returnLocation` com cidade do aniversário, fuso IANA ou offset UTC explícito, latitude, longitude e fonte. A cidade não é inferida do nascimento. Entrada sem fuso resolvível ou coordenadas válidas é rejeitada antes da efeméride. O intake web aceita apenas fuso IANA/UTC; o adaptador experimental também aceita offset explícito em entradas internas.
- `context` opcional registra prioridades da pessoa como relato; não altera o cálculo. Até três datas importantes podem ser declaradas com rótulo e autorização específica `atv-solar-important-dates/1`. Cada data deve ser única e estar entre a âncora civil do retorno e o mesmo dia no ano seguinte, inclusive, respeitado o limite de 2099. Sem autorização específica, não há campo `importantDates` no pedido.

## Processamento e fatos

`atv-solar-return-calculation/1.1.0` usa o Sol natal tropical, geocêntrico e aparente da candidata Caelus. Busca uma mudança de sinal da diferença angular em até quatro dias de cada lado do aniversário civil em UTC e faz bissecção até um intervalo de um milissegundo. Recalcula a carta no instante encontrado com as coordenadas e o fuso declarados para o aniversário; o resíduo da longitude solar deve ser de no máximo `0.00002°`. A versão 1.1 acrescenta somente a grade civil descrita abaixo; o algoritmo astronômico permanece o mesmo da versão 1.0.

O snapshot experimental contém instante UTC e local, longitudes dos dez corpos, ângulos, casas Placidus quando disponíveis, proveniência natal e do retorno, resíduo, fatos calculados e contexto/cidade relatados. Em condições de Placidus indisponível, não publica Ascendente nem cúspides substitutos. A igualdade solar independe da cidade; a carta local e suas casas dependem dela. O processamento exige opt-in interno `experimentalSolarReturnBase: true` e nunca liga release, entitlement ou aprovação editorial.

## Intake privado (WU194)

O pedido web `atv-solar-return-request/1` recebe o ano, a cidade, o fuso, as coordenadas e contexto opcional, com autorização de armazenamento. O servidor não aceita dados natais no corpo: lê a última revisão do perfil natal da própria pessoa, exige hora exata, deriva a âncora civil do aniversário (inclusive a regra de 29/02) e recusa data ou revisão adulterada. A função `request_solar_return_product_run` grava recibo privado com comando e versão natal, usa chave de idempotência por titular e encaminha o input construído no banco ao gate de pedido comum. A tabela de recibos não concede leitura direta a papéis de cliente. Respostas HTTP não expõem perfil, cidade ou contexto.

Esta integração foi validada somente no banco local de teste. O gate de release continua fechado; a migração ainda precisa ser aplicada e verificada no ambiente hospedado antes de qualquer solicitação real.

## Datas autorizadas (WU195)

O intake apresenta campos opcionais de data e rótulo e uma autorização separada da autorização de armazenamento. Campos parciais, autorização ausente, data repetida, fora da janela civil ou inválida são recusados antes do envio. O servidor e a função SQL repetem a validação; o recibo privado conserva o comando exato, e o input da execução conserva apenas as datas declaradas com o marcador de autorização. Pedidos anteriores sem `importantDates` continuam válidos sob a versão `atv-solar-return-request/1`.

O snapshot registra cada data como fato `reported` com fonte `input.importantDates.entries[n]`; não a apresenta como cálculo astronômico nem a usa para mudar a geometria do retorno. As datas não disparam mensagens ou alertas. A migração `20260929170000_solar_return_important_dates.sql` é aditiva e substitui apenas a função de pedido. Sua validação foi feita no banco local de teste; o ambiente hospedado ainda exige aplicação e verificação próprias.

## Grade civil dos 12 meses (WU196)

O snapshot experimental 1.1 inclui `data.calendarScaffold`, versão `atv-solar-return-calendar/1.0.0`. A grade parte de `targetDate`, o aniversário civil declarado, e cria 12 intervalos contíguos `[startDate, endDateExclusive)`. Cada fronteira usa o mesmo dia do mês de origem, limitado ao último dia do mês de destino; assim 31/01 passa por 28/02 (ou 29/02) e volta a 31/03. Para âncora em 29/02, o ciclo termina em 28/02 no ano seguinte. A grade não parte do instante astronômico do retorno nem atribui regência, evento ou previsão a qualquer mês.

Cada data autorizada é vinculada pelo ID do seu fato `reported` a exatamente um intervalo. A data exatamente igual à fronteira final, admitida pela coleta inclusiva, fica em `boundaryImportantDateIds` e não é lançada artificialmente no mês 12. Sem datas declaradas, os 12 intervalos continuam presentes e suas listas de IDs ficam vazias. Rótulos permanecem nos fatos originais, sem duplicação na grade.

Esta estrutura prepara a conferência de cobertura de E2, mas **não** é uma linha interpretativa mensal. A interpretação de cada mês ainda exige método editorial aprovado, evidência pertinente ao período, distinção entre geometria e relatos, revisão de utilidade e validação do modelo/prompt. Não há alegação de que a carta estática ou uma data informada prove um tema ou evento mensal.

## Limites e próximo aceite

O motor ainda depende de gauntlet independente, licença e homologação. A base não produz interpretação, previsões, mandala editorial, linha interpretativa de doze meses, áudios, check-ins, web/PDF final, renovação ou alertas. E1 permanece parcial até validar entrada real autorizada e o motor; E2–E5 mantêm gates próprios.
