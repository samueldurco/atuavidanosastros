# Bússola — diagnóstico de interpretação efetiva

WU-118 · RUN_ID `ATV-20260902-170644Z-01A0630F` · 28/09/2026.

## Requisito e resultado

E2 exige interpretação ligada ao MC/contexto e validada por revisão legítima. Foram feitas exatamente duas invocações independentes pelo MCP Google AI Studio, apenas com o caso sintético existente `career-compass-common`; nenhuma usa dados pessoais ou habilita geração produtiva. Modelo solicitado `gemini-2.5-flash`, temperatura 0.3, teto 4500 tokens, JSON. O conector retorna somente conteúdo textual, sem tokens, revisão resolvida do modelo ou billing; isso não autentica a identidade declarada nem satisfaz os gates de metadados.

O proprietário havia confirmado Free Tier sem cobrança, preservado em `docs/intelligence/benchmarks/2026-09-08-focal-decision.md` e `docs/intelligence/README.md`. A [tabela oficial consultada](https://ai.google.dev/gemini-api/docs/pricing) informa entrada/saída gratuitas para Gemini 2.5 Flash Standard no Free Tier. Essa tabela não verifica o billing da chave conectada. `costBrl=0` tem base `owner-confirmed-free-tier`, referência opaca `ATV-LAB-20260908-FOCAL-DECISION`, confrontável com os documentos anteriores; não foi inventado recibo. Dados sintéticos são necessários também porque o Free Tier admite uso para melhoria do provedor. Nenhuma configuração de faturamento ou permissão mudou.

| Captura | Prompt | Resultado mecânico | Tempo de parede do MCP |
| --- | --- | --- | --- |
| Primeira | `atv-editorial/1.0.2` | Schema PASS; mecânica FAIL: três `unknown_fact` e três `career_role_missing` | 9115 ms |
| Repetição independente | `atv-editorial/1.0.3` | Schema PASS; mecânica PASS, sem findings | 8739 ms |

A primeira saída usou `mc-fact`, ID de uma afirmação, como evidência das três interpretações; o fato recebido tem ID `angle-midheaven`. O prompt 1.0.3 reforça essa distinção ao final, além das três perguntas, limites e síntese condicional. O teste reproduz a resposta de forma estrutural: schema aceita referências sintaticamente válidas, mas o Director rejeita referências a afirmações usadas como fatos. O comportamento genérico permanece condicionado ao perfil existente.

A segunda resposta preserva MC e os três papéis/síntese e fornece três perguntas. Ainda omite a condição experimental e a ausência de garantia global de precisão; sua síntese usa formulações assertivas, e a pergunta final não especifica suficientemente um experimento reversível. São observações diagnósticas do executor, sem notas nem revisão humana atribuída. A aprovação mecânica não é aprovação editorial. As chamadas usam prompts distintos: o comparador vigente não pode compará-las como lotes com a mesma versão; não foi usado para sugerir causalidade, significância ou vencedor.

## Evidência restrita e handoff

Arquivos sintéticos em `test-results/`, ignorados pelo Git:

- `wu118-baseline-request.json`, `wu118-capture.json`, `wu118-provider-evidence.json`, `wu118-report.json` e `wu118-review-template.json`: entrada, resposta exata, horários e diagnóstico da versão 1.0.2.
- `wu118-request.json`, `wu118-candidate-capture.json`, `wu118-candidate-provider-evidence.json`, `wu118-candidate-report.json` e `wu118-candidate-review-template.json`: entrada, resposta exata, horários e diagnóstico da versão 1.0.3, com formulário de revisão em branco.

Referências locais de invocação, vinculadas aos horários/capturas reais, não IDs inventados de recibo do provedor: `ATV-WU118-career-common-r1-2026-09-28T21-40-06-851Z` e `ATV-WU118-career-common-v103-r1-2026-09-28T21-42-20-404Z`. SHA-256 das saídas: `c7f2521a255a95de0fd14ab85e743952d9be6cf038b820cb7bf9f7998cd609e6` e `73653faae79ead9b3264284aeba59a6f59f0684c4826db10e3ff8c03ced7c28d`. O request digest é `6718f399cb4719b4f0542ee24ee92fc73b4ea2ac221856d79263d644806364b5`; prompt digests e corpus fingerprint permanecem nas capturas.

Cada CLI de avaliação terminou com código 1, diagnóstico válido incompleto; cada formulário foi emitido com código 0, todos os campos de revisão nulos. Há somente uma posição capturada por versão entre as 42 esperadas para os 14 casos da Bússola, e não cobertura dos 312 slots globais. Tokens desconhecidos permanecem `null`; nenhum valor foi estimado. `promotionEligible=false`, `publication=blocked`, revisão não calibrada e procedência declarada/não autenticada. A rodada parou diante da insuficiência comprovada de metadados/revisão, sem gastar chamadas para preencher cobertura artificialmente.

## Validação e continuidade

- 50 testes AI, incluindo regressão de evidência por ID de afirmação: PASS (`wu118-ai-tests.log`); 6 focais: PASS (`wu118-career-tests.log`).
- 63 testes de corpus/benchmark/comparação/handoff e 74 worker: PASS (`wu118-scripts.log`, `wu118-worker.log`).
- Tipagem AI: PASS (`wu118-ai-check.log`). Formatação, diff e scan de segredos são registrados no log canônico após a conferência final.
- CI da WU117, SHA `e08af04011069e5f398827db07ee4748062c1579`: [36487016423, success](https://github.com/samueldurco/atuavidanosastros/actions/runs/36487016423).

Bússola continua parcial: E1 depende do aceite de precisão aplicável ao MC experimental; E2 depende de metadados confiáveis, cobertura exigida e revisão autorizada do conteúdo efetivo; E3–E5 dependem dessa autoridade e do fluxo hospedado. Responsáveis: operador do conector para metadados de execução; revisor autorizado/proprietário para revisão e homologação; proprietário para retomada do Supabase. Gates, default-off, RUN_ID e R$0 preservados. As provas já existentes do motor são reutilizadas, sem executar um novo corpus genérico para ocupar os bloqueios. Após consolidar esta WU, passar ao primeiro requisito independente de Três Pilares, preservando as pendências da Bússola.
