# Contexto temporal — corpus offline do Lab

RUN_ID: `ATV-20260902-170644Z-01A0630F`. WU-103. 2026-09-28.

## Escopo e evidência

Corpus `atv-product-facts-synthetic/1.4.0`: 105 casos, 104 preparados e um bloqueado por ausência de Ascendente. Os fingerprints das 98, 91 e 84 entradas anteriores permanecem idênticos. Suplemento `atv-date-context-synthetic/1.0.0`: sete relatos sintéticos comuns, complexos, contraditórios, limite Unicode, ausência real, injeção e risco de decisão de alto impacto.

Os sete cenários usam o mesmo nascimento e a mesma data-alvo. A variação é exclusivamente do relato, não diversidade astronômica. Os fatos calculados e a projeção de uma única amostra às 12 UTC permanecem iguais; não representam o dia local inteiro, busca de eventos, aspectos ou casas. Contexto presente é `reported`, com procedência `input.context`; ausência não produz texto substituto. O limite inclui 1.200 unidades UTF-16 bem formadas. Contatos e URLs são sintéticos/reservados.

Fingerprint SHA-256 das requisições: `edde71a4d22332655441b5a322bddf446d72f5b3c98588b265977a4d406cc228`. Timestamps variáveis não entram nesse digest. Ele detecta deriva, não certifica exatidão ou qualidade.

- Corpus: **13 PASS**, `test-results/wu103-corpus-retry.log`.
- IA e worker: **39 + 71 PASS**, `test-results/wu103-packages.log`.
- Check IA/worker: **PASS**, `test-results/wu103-check.log`.
- Primeira execução: 12/13; o teste comparava indevidamente sistemas de capacidades diferentes. Corrigido para comparar cada suplemento com o sistema da própria capacidade, sem mudar o prompt.
- Nenhuma mudança em UI/schema/migração; gates visuais da WU-102 não foram repetidos.
- CI WU-102, SHA `2382020fec7082d6ab27bd1591fc217b118bf970`: quality `109049791164`, secrets `109049791394`, Pages `109050220503`, completed/success.

## Alcance dos controles

Papéis e instruções permanecem texto no JSON de entrada, sem alterar a mensagem de sistema de sua capacidade, criar ferramentas ou conceder acesso. Contatos sintéticos são redigidos apenas no prompt; fatos persistidos não são adulterados. Isso não prova anonimização completa ou resistência de um modelo real a injeções.

O Director rejeita as fixtures de UTC alterado, evento inventado, escopo integrado, propriedades de ferramentas, instrução conhecida e prescrições explícitas de interromper tratamento, investir todo o dinheiro ou futuro selado. Os padrões não são um detector semântico completo.

Uma fixture que alega cobrir o dia inteiro no fuso atual passa os controles mecânicos e fica `needs_editorial_review`, com `publication: blocked`. O teste documenta essa limitação deliberadamente. Não é resposta aceitável ou golden; revisão humana autorizada precisa recusar tal extrapolação. Revisores autodeclarados não satisfazem a autorização. Passar os testes não homologa modelo ou prompt.

A separação entre casos comuns/adversariais e avaliação humana segue a [documentação oficial de boas práticas de avaliações](https://developers.openai.com/api/docs/guides/evaluation-best-practices), consultada na WU-103 com a skill OpenAI Docs.

## Gates preservados

13 bases parciais e 12 produtos sem calculador. Dataset de release, golden seeds não calibrados e vinte amostras históricas não mudam. Constituições, prompt, schema, Director e política de promoção inalterados. Nenhuma chamada a modelo, gasto, benchmark novo, publicação, homologação, scheduler ou migração hospedada. IA default-off e R$0.
