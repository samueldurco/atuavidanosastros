# Revolução Solar — matriz de evidência dos 12 capítulos

**Versão de preparação:** `atv-solar-return-monthly-evidence/0.1.0`.

**Escopo:** requisito E2 de `solar-return`; não é aprovação editorial, homologação astrológica ou autorização de publicação.

## Fontes disponíveis no snapshot 1.1

- `data.calendarScaffold` contém doze intervalos civis contíguos, ancorados em `targetDate`, com fim exclusivo. É uma organização do calendário, não um cálculo astrológico mensal.
- `natal-sun`, `return-instant`, `return-*`, `return-ascendant` (se disponível), `return-midheaven` e `return-house-*` (se disponíveis) descrevem a carta **no instante único do retorno**. Podem fundamentar uma leitura do ciclo após homologação e revisão; não distinguem, por si, o mês 1 do mês 12.
- `birthday-city`, `personal-context` e `important-date-*` são relatos. Uma data autorizada pode ser localizada em um intervalo civil, mas não comprova um acontecimento, tema astrológico, intensidade ou tendência.
- `limits` registra motor experimental e ausência de método mensal. A leitura privada da grade não altera essas limitações.

## Matriz de cobertura

Para cada linha, `M[n]` é `calendarScaffold.months[n-1]`, com janela `[startDate, endDateExclusive)`. `D[n]` são somente os IDs de `importantDateIds` nessa janela. A âncora e as fronteiras variam com o aniversário; não são meses civis fixos de janeiro a dezembro.

| Capítulo | Evidência civil disponível | Evidência de período astrológico no snapshot 1.1 | Estado de capítulo interpretativo |
| -------- | -------------------------- | ------------------------------------------------ | --------------------------------- |
| 01       | `M[1]`, `D[1]`             | Nenhuma                                          | Recusar tema/tendência mensal     |
| 02       | `M[2]`, `D[2]`             | Nenhuma                                          | Recusar tema/tendência mensal     |
| 03       | `M[3]`, `D[3]`             | Nenhuma                                          | Recusar tema/tendência mensal     |
| 04       | `M[4]`, `D[4]`             | Nenhuma                                          | Recusar tema/tendência mensal     |
| 05       | `M[5]`, `D[5]`             | Nenhuma                                          | Recusar tema/tendência mensal     |
| 06       | `M[6]`, `D[6]`             | Nenhuma                                          | Recusar tema/tendência mensal     |
| 07       | `M[7]`, `D[7]`             | Nenhuma                                          | Recusar tema/tendência mensal     |
| 08       | `M[8]`, `D[8]`             | Nenhuma                                          | Recusar tema/tendência mensal     |
| 09       | `M[9]`, `D[9]`             | Nenhuma                                          | Recusar tema/tendência mensal     |
| 10       | `M[10]`, `D[10]`           | Nenhuma                                          | Recusar tema/tendência mensal     |
| 11       | `M[11]`, `D[11]`           | Nenhuma                                          | Recusar tema/tendência mensal     |
| 12       | `M[12]`, `D[12]`           | Nenhuma                                          | Recusar tema/tendência mensal     |

Uma data exatamente em `endDateExclusive` pertence a `boundaryImportantDateIds` e não a `D[12]`. Contexto ausente e lista de datas vazia permanecem ausentes; não se preenchem por inferência.

## Critérios de recusa e aceite futuro

O preparador editorial deve recusar uma solicitação de **doze interpretações mensais** quando só houver o snapshot 1.1, ainda que a grade possua doze linhas e datas relatadas. Também deve recusar intervalo inválido, fato sem fonte verificável, relato tratado como cálculo, casa/Ascendente quando `houses.status` não for `ok`, ou referência a um mês diferente daquele do fato. Texto de fixture, repetição da mesma carta em doze paráfrases e afirmações de eventos não suprem evidência de período.

Para tornar cada capítulo elegível a revisão, uma versão posterior precisará, no mínimo: (1) definir e aprovar o **método temporal** e sua política de relevância; (2) produzir fatos calculados versionados e com época, proveniência e limites associados à respectiva janela, com conferência independente do motor/licença; (3) vincular cada afirmação mensal aos fatos daquele período e distinguir explicitamente relato, cálculo e hipótese; (4) revisar a utilidade e a diferença real entre os doze capítulos, relações entre eles, síntese anual e contexto consentido; (5) validar schema, modelo/prompt, revisão editorial legítima e gates de publicação. A existência de um fato por janela, isoladamente, não prova utilidade ou suficiência interpretativa.

**Aceite desta preparação:** as doze janelas e o tratamento da fronteira final estão mapeados aos campos persistidos; a ausência de evidência astrológica mensal e as recusas estão explícitas. E2 permanece `PENDENTE`.

## Guarda de preparo editorial (WU199)

`prepareProductFacts` recusa `solar-return` com `insufficient_facts` depois de validar o snapshot, antes de expor fatos ao preparo genérico. Essa recusa é fechada para qualquer versão até existir um perfil mensal versionado, conferido e ligado ao método aprovado; adicionar uma lista de doze datas ou trocar o rótulo de versão não a remove. O cálculo experimental, a grade privada e o leitor civil continuam disponíveis sob seus próprios gates. A recusa não substitui a revisão editorial, a homologação do motor ou os testes hospedados futuros.
