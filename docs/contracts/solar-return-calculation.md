# Revolução Solar — base de cálculo experimental 1.0

`solar-return` conserva a entrega de catálogo web e PDF e o release bloqueado. Este contrato entrega somente a base local de E1; não aprova o motor, a interpretação nem a liberação.

## Entrada

- Reutilizar o nascimento consentido com data, hora, fuso, coordenadas e fonte. O adaptador verifica a correspondência entre hora local e UTC.
- Declarar `returnYear` e `targetDate`: a data é o aniversário civil nesse ano. Para nascimento em 29/02 e ano não bissexto, usar 28/02 como âncora de busca. O ano não pode preceder o nascimento.
- Declarar `returnLocation` com cidade do aniversário, fuso IANA ou offset UTC explícito, latitude, longitude e fonte. A cidade não é inferida do nascimento. Entrada sem fuso resolvível ou coordenadas válidas é rejeitada antes da efeméride.
- `context` opcional registra prioridades da pessoa como relato; não altera o cálculo. Datas importantes autorizadas ainda não são capturadas por esta base.

## Processamento e fatos

`atv-solar-return-calculation/1.0.0` usa o Sol natal tropical, geocêntrico e aparente da candidata Caelus. Busca uma mudança de sinal da diferença angular em até quatro dias de cada lado do aniversário civil em UTC e faz bissecção até um intervalo de um milissegundo. Recalcula a carta no instante encontrado com as coordenadas e o fuso declarados para o aniversário; o resíduo da longitude solar deve ser de no máximo `0.00002°`.

O snapshot experimental contém instante UTC e local, longitudes dos dez corpos, ângulos, casas Placidus quando disponíveis, proveniência natal e do retorno, resíduo, fatos calculados e contexto/cidade relatados. Em condições de Placidus indisponível, não publica Ascendente nem cúspides substitutos. A igualdade solar independe da cidade; a carta local e suas casas dependem dela. O processamento exige opt-in interno `experimentalSolarReturnBase: true` e nunca liga release, entitlement ou aprovação editorial.

## Limites e próximo aceite

O motor ainda depende de gauntlet independente, licença e homologação. A base não produz interpretação, previsões, mandala editorial, linha de doze meses, áudios, check-ins, web/PDF final, renovação ou alertas. E1 permanece parcial até existir entrada real da cidade e validação integral; E2–E5 mantêm gates próprios. A próxima etapa local é integrar intake privado e persistido da cidade/ciclo, sem inferir localização atual do nascimento.
