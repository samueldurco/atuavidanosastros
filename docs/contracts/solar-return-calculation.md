# Revolução Solar — base de cálculo experimental 1.0

`solar-return` conserva a entrega de catálogo web e PDF e o release bloqueado. Este contrato entrega somente a base local de E1; não aprova o motor, a interpretação nem a liberação.

## Entrada

- Reutilizar o nascimento consentido com data, hora, fuso, coordenadas e fonte. O adaptador verifica a correspondência entre hora local e UTC.
- Declarar `returnYear` e `targetDate`: a data é o aniversário civil nesse ano. Para nascimento em 29/02 e ano não bissexto, usar 28/02 como âncora de busca. O ano não pode preceder o nascimento.
- Declarar `returnLocation` com cidade do aniversário, fuso IANA ou offset UTC explícito, latitude, longitude e fonte. A cidade não é inferida do nascimento. Entrada sem fuso resolvível ou coordenadas válidas é rejeitada antes da efeméride. O intake web aceita apenas fuso IANA/UTC; o adaptador experimental também aceita offset explícito em entradas internas.
- `context` opcional registra prioridades da pessoa como relato; não altera o cálculo. Datas importantes autorizadas ainda não são capturadas por esta base.

## Processamento e fatos

`atv-solar-return-calculation/1.0.0` usa o Sol natal tropical, geocêntrico e aparente da candidata Caelus. Busca uma mudança de sinal da diferença angular em até quatro dias de cada lado do aniversário civil em UTC e faz bissecção até um intervalo de um milissegundo. Recalcula a carta no instante encontrado com as coordenadas e o fuso declarados para o aniversário; o resíduo da longitude solar deve ser de no máximo `0.00002°`.

O snapshot experimental contém instante UTC e local, longitudes dos dez corpos, ângulos, casas Placidus quando disponíveis, proveniência natal e do retorno, resíduo, fatos calculados e contexto/cidade relatados. Em condições de Placidus indisponível, não publica Ascendente nem cúspides substitutos. A igualdade solar independe da cidade; a carta local e suas casas dependem dela. O processamento exige opt-in interno `experimentalSolarReturnBase: true` e nunca liga release, entitlement ou aprovação editorial.

## Intake privado (WU194)

O pedido web `atv-solar-return-request/1` recebe o ano, a cidade, o fuso, as coordenadas e contexto opcional, com autorização de armazenamento. O servidor não aceita dados natais no corpo: lê a última revisão do perfil natal da própria pessoa, exige hora exata, deriva a âncora civil do aniversário (inclusive a regra de 29/02) e recusa data ou revisão adulterada. A função `request_solar_return_product_run` grava recibo privado com comando e versão natal, usa chave de idempotência por titular e encaminha o input construído no banco ao gate de pedido comum. A tabela de recibos não concede leitura direta a papéis de cliente. Respostas HTTP não expõem perfil, cidade ou contexto.

Esta integração foi validada somente no banco local de teste. O gate de release continua fechado; a migração ainda precisa ser aplicada e verificada no ambiente hospedado antes de qualquer solicitação real.

## Limites e próximo aceite

O motor ainda depende de gauntlet independente, licença e homologação. A base não produz interpretação, previsões, mandala editorial, linha de doze meses, áudios, check-ins, web/PDF final, renovação ou alertas. E1 permanece parcial até validar entrada real autorizada e o motor; E2–E5 mantêm gates próprios.
