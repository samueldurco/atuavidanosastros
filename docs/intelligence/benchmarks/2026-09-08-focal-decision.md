# Correção focal 1.0.1 — ganho localizado, sem promoção

Oito chamadas adicionais, total de 20 chamadas sintéticas nesta rodada UTC, mantendo 1.400 tokens, temperatura 0.3 e Free Tier confirmado. Nenhuma chamada adicional foi feita após o limite desta rodada. Dados brutos: `2026-09-08-focal.json`. Mesmo schema/rubrica do baseline; novo prompt `atv-editorial/1.0.1`.

Mudanças: instrução final de cópia literal, linguagem simbólica não causal, tratamento explícito de informação ausente e associação pessoal em Sonhos. Não foram adicionadas etapas de crítica por modelo nem reescrita automática.

| Modelo | Tentativas | Respostas dentro do schema e hard checks | Dentro de 12s |
| --- | ---: | ---: | ---: |
| gemini-3.1-flash-lite | 4 | 3 | 3 |
| gemini-3.5-flash-lite | 4 | 3 | 3 |

3.1: as duas repetições de Propósito e o caso de hora ausente passaram a copiar literalmente os fatos (0/3 no mesmo subconjunto do baseline → 3/3). A tentativa de Sonhos retornou 503 por alta demanda, não uma resposta editorial. Isso não é prova de resistência ao caso adversarial nessa versão.

3.5: Sonhos passou a perguntar associações pessoais sem fixar significado universal. Na segunda repetição de Propósito, produziu objetos onde `reflections` e `limits` exigem strings; saída rejeitada, sem reparo silencioso. O caso de hora ausente demorou 21,5s. A mudança de tempos entre rodadas não pode ser atribuída causalmente à revisão do prompt: há variabilidade de serviço e amostra pequena.

A revisão exploratória continua encontrando assertividade e inferências além dos dados, inclusive uma associação arbitrária entre ausência de horário e prioridades pessoais. Por isso, o gateway ganhou um gate determinístico anterior à geração: capacidades astrológicas exigem pelo menos um fato calculado; Tarot exige carta sorteada; Sonhos exige relato. Uma ficha que só registra informação natal ausente retorna `insufficient_facts` sem chamar provider. O caso de insuficiência continua no dataset como teste adversarial de modelo, mas não é uma geração elegível do gateway.

**Decisão: manter 1.0.1 como candidato de laboratório; NO_PRODUCTION_PROMOTION.** O ganho de cópia literal é real neste subconjunto, porém não comprova qualidade integral, estabilidade, segurança semântica ou SLA. Tokens/versão resolvida seguem indisponíveis no conector. Dados pessoais continuam bloqueados. Próximos passos de IA: adapter com schema nativo/metadados/cancelamento, cobertura dos demais casos e crítico calibrado antes de integração interpretativa.
