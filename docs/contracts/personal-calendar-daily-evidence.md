# Calendário pessoal — matriz de evidência diária

**Versão de preparação:** `atv-personal-calendar-daily-evidence/0.1.0`.

**Escopo:** requisito E2 de `personal-calendar`. Esta matriz não homologa método astrológico, texto editorial ou publicação.

## Cobertura do snapshot 1.1

Para cada `d` em `data.dates`, `civil-day-${d}` comprova somente que `d` pertence ao mês civil UTC `[monthStart, monthEndExclusive)`. São 28–31 dias consecutivos. `natal-sun` descreve a posição estática na carta de nascimento; não é posição, trânsito ou influência em `d`. `reported-mark-*` e `personal-context`, quando presentes, são relatos autorizados do titular. O mês pode não ter nenhum marco; ausência não pode ser preenchida por inferência. A grade privada projeta esses elementos apenas após os gates do run e não acrescenta evidência temporal.

| Unidade exigida no calendário | Identidade e vínculo existentes                                          | Evidência astrológica do dia em 1.1 | Uso editorial permitido                                          |
| ----------------------------- | ------------------------------------------------------------------------ | ----------------------------------- | ---------------------------------------------------------------- |
| Cada um dos 28–31 dias `d`    | `data.dates[i]` e `civil-day-${d}`                                       | Nenhuma                             | Identificar o dia civil, sem tema ou previsão                    |
| Sol natal                     | `natal-sun`, sem vínculo diário                                          | Referência natal estática           | Identificar a referência, sem repeti-la como leitura de cada dia |
| Marco opcional do titular     | `reported-mark-n`, data no mês, fonte `input.calendarMarks.entries[n-1]` | Nenhuma; é relato                   | Exibir como informado, sem tratar como evento inferido           |
| Contexto opcional             | `personal-context`, fonte no input                                       | Nenhuma; é relato                   | Preservar classificação e consentimento                          |

Uma linha diária só poderá sustentar conteúdo interpretativo após método temporal aprovado e fatos calculados **para aquela data**, com época e fuso definidos, origem/licença da efeméride, versão do cálculo, unidades, limites e rastreio até o input consentido. Deve haver regra explícita para fronteiras do dia, revisão de fuso, atualização/reprocessamento e tratamento de falha ou dado ausente. A política precisa distinguir cálculo, relato e hipótese; citar um marco pessoal não transforma o dia em favorável, crítico ou preditivo.

## Recusa e aceite futuro

O preparo editorial atual recusa `personal-calendar` com `insufficient_facts`, inclusive se alguém acrescentar um fato diário arbitrário ou alterar o rótulo de versão. Deve continuar recusando previsões, dias favoráveis, eventos, intensidades ou conselhos específicos produzidos só da grade, do Sol natal estático ou de relatos. Também deve recusar fato sem época/fonte verificável, dia fora do mês, fonte associada à data errada e paráfrases repetidas como se fossem 28–31 leituras distintas. Um fato por dia, isolado, ainda não comprova relevância ou utilidade.

Para submeter uma versão futura à revisão E2, são necessários: método temporal e política de relevância aprovados; cobertura verificável de cada dia com proveniência, limites e homologação do motor/licença; vínculo de cada afirmação ao dia e aos fatos que a sustentam; regra de atualização e de ausência; modelo, prompt e schema versionados; revisão editorial legítima da utilidade e da variação entre dias. E3–E5 ainda exigem persistência, entrega web/PDF, QA visual, gates e liberação hospedada próprios. Nenhum desses aceites é suprido por fixture sintética.

**Aceite desta preparação:** os 28–31 dias e os relatos estão mapeados aos campos persistidos, a falta de evidência temporal está registrada e a recusa atual está identificada. E2 permanece `PENDENTE`.
