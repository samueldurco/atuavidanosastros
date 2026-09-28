# ATV Intelligence Lab

RUN_ID `ATV-20260902-170644Z-01A0630F`. Fundação v1, 08/09/2026. **LAB_ONLY / NO_PRODUCTION_PROMOTION**.

O laboratório transforma fatos aprovados em candidatos editoriais. Não calcula mapas, aspectos, ciclos, sorteios, preços, pagamentos, acesso ou estado comercial. Nenhuma rota de produto chama modelos nesta entrega. `FEATURE_AI=false` continua sendo o padrão; mesmo uma flag ligada não promove um candidato.

## Artefatos executáveis

| Contrato | Fonte canônica |
| --- | --- |
| Voice, Interpretation, Safety e Anti-Mediocrity Constitutions | `packages/ai/src/constitutions.ts`, `atv-constitutions/1.0.0` |
| Seis especializações e limites por tier | `packages/ai/src/contracts.ts` |
| System instruction/prompt | `packages/ai/src/prompt.ts`, `atv-editorial/1.0.1` (correção focal após baseline 1.0.0) |
| Schema JSON e validação independente | `packages/ai/src/schema.ts`, `atv-reading/1.0.0` |
| Director, thresholds e seleção de revisão | `packages/ai/src/director.ts`, `atv-director/1.0.0` |
| 10 casos sintéticos e dois golden seeds | `packages/ai/src/lab/dataset.ts`, `atv-synthetic/1.0.0` |
| Avaliação reproduzível | `packages/ai/src/lab/benchmark.ts` |
| Manifesto independente de artefatos | `packages/ai/src/artifacts.ts`, `scripts/lab-artifacts.mjs` |
| Gateway com providers substituíveis | `packages/ai/src/gateway.ts` |
| Projeção de memória consentida | `packages/ai/src/memory.ts` |

Os caminhos acima são relativos à raiz do repositório. As constituições são código versionado usado integralmente no prompt, não documentos desconectados dele. Os dois golden seeds foram preparados nesta execução como referências de regressão; ainda não são um conjunto ouro calibrado por especialistas.

## Fluxo e fronteiras de confiança

Fatos aprovados pelo domínio → seleção/minimização → prompt especializado → provider → schema estrito → verificações mecânicas → candidato → revisão editorial vinculada ao hash da saída → promoção controlada.

- Cada fato tem ID, origem e natureza (`calculated`, `reported`, `drawn`). Um relato não vira fato astronômico. O envelope é produzido no servidor por uma capacidade determinística, não pelo modelo.
- Saída separa afirmações factuais, interpretações e hipóteses, suas evidências, relações, síntese, perguntas e limites. Fato textual deve reproduzir exatamente o display aprovado; referências desconhecidas ou campos extras são rejeitados.
- Relação precisa de duas fontes distintas. Um fator isolado só admite escopo parcial, sem simular mapa completo. Dados incompletos exigem limitação, não preenchimento por IA.
- Citação de um ID **não prova** que uma afirmação livre é verdadeira. Há teste explícito dessa limitação. Regex, schema e elegância nunca substituem crítica factual semântica e avaliação editorial.
- Contexto e relatos entram em JSON de dados, não no sistema. Não há tools/function calling, navegação ou mutação de estado. Redação de e-mail/telefone/documento/link é defesa adicional, não anonimização garantida.
- A implementação atual bloqueia dados pessoais e todas as chamadas de produção. Só aceita laboratório sintético com consentimento de processamento explícito. Isso permanece assim até a política de privacidade do provider e a promoção serem aprovadas.

## Qualidade proporcional e orçamento

| Nível | Entrada variável máxima | Saída máxima | Limite de tokens de saída | Timeout por tentativa |
| --- | --- | --- | --- | --- |
| Gratuito | 8.000 caracteres | 7.000 caracteres | 1.400 | 12s |
| Intermediário | 18.000 | 22.000 | 4.500 | 25s |
| Premium | 32.000 | 40.000 | 8.000 | 45s |

A constituição/schema fixos também integram a entrada do provedor; o limite de entrada variável não representa contagem exata de tokens. Custos/token e tokens de raciocínio exigem metadados do provider antes de promoção. Os limites acima são tetos de laboratório, não preços nem promessa de SLA.

Uma geração por candidato é o baseline. No máximo uma alternativa de provider após falha de transporte, com reserva de cota por tentativa. Falha editorial/schema não dispara regeneração automática. Timeout aborta o sinal; um adapter deve honrá-lo, e a tentativa não é devolvida à cota. A duração total pode incluir duas tentativas.

O ledger local é explicitamente de laboratório. Produção precisa de reserva atômica compartilhada, autorização por usuário/capacidade e retenção definida; não é correto usar um contador de processo em múltiplos Workers. Sem ledger disponível, falha fechada. Default de 20 chamadas/dia por instância de laboratório; limite configurável restrito a 1–100. Gasto automático autorizado: R$ 0. Nenhum billing, cache pago ou grounding é ativado.

## Director e rubrica

Escala 0–10 por dimensão. 0–3: contraditório, inseguro ou ausência de trabalho substantivo. 4–6: parcialmente útil, mas genérico, incoerente ou insuficiente. 7: adequado e específico para a entrega limitada. 8–9: integração clara, sustentada e editorialmente madura. 10: critério plenamente satisfeito no escopo avaliado; não significa validade científica de uma prática simbólica.

| Dimensão | Evidência que o revisor deve registrar |
| --- | --- |
| Profundidade | Relações/limites que vão além de reformular inputs, proporcionais ao tier. |
| Coerência | Cadeia de raciocínio e ausência de contradições entre passagens. |
| Especificidade | Passagens que mudariam se os fatores principais mudassem. |
| Integração | Fatores conectados quando há dados; escopo parcial assumido quando não há. |
| Síntese | Conclusão combina o que foi sustentado, sem acrescentar premissas. |
| Voz | Clareza sóbria, sem intimidade presumida ou autoridade espiritual. |
| Clareza | Conceitos compreensíveis e distinção fato/interpretação/hipótese. |
| Utilidade | Pergunta ou experimento contextual, reversível e de baixo risco. |
| Elegância | Ritmo e precisão, sem ornamento verbal sem função. |
| Não repetição | Cada passagem acrescenta algo; sem clichê/Barnum ou inflação. |
| Responsabilidade | Autonomia, segurança, não determinismo e dados íntimos protegidos. |
| Fidelidade factual | Nenhuma posição, período, carta ou história inventada; evidência pertinente. |

Piso por dimensão: 7 gratuito/intermediário, 8 premium; responsabilidade e fidelidade factual exigem 10 em todos. Uma dimensão abaixo não é compensada pela média. Revisão precisa de rubrica, evidência por dimensão, revisor e SHA-256 da saída exata; crítico automatizado exige calibração identificada. Não aceitar scores enviados pelo cliente nem produzidos pelo mesmo gerador sem calibração. A função de decisão é uma regra interna; autorização do revisor e integridade do registro são responsabilidades server-side antes de sua exposição em produto.

Falhas localizadas encaminham para correção focal; múltiplas para reescrita parcial; risco/escopo/estrutura podem exigir regeneração controlada. Reordenação, compressão e expansão deverão ser comparadas nos casos afetados antes de adicionar chamadas. Nesta versão, a estratégia é indicada, não executada automaticamente.

## Memória e observabilidade

Projeção aceita no máximo cinco resumos relevantes de 200 caracteres, do mesmo proprietário/capacidade, não sensíveis, com finalidade de continuidade, consentimento válido e não revogado. Exclui itens apagados, irrelevantes e não revisados. Nunca envia IDs do proprietário ou histórico bruto. O contrato não cria persistência, UI de consentimento ou garantia de exclusão do provedor; essas etapas ainda precisam de implementação/validação por vertical.

Eventos só contêm correlação opaca, capacidade, provider/modelo, versões, tentativa, estado, latência e tokens quando informados. Sem prompt/output, nomes, datas natais ou mensagem crua de exceção. O observador não altera a resposta do domínio. Logs de eval contêm somente casos sintéticos identificados.

## Benchmark e promoção

Comparar candidatos no mesmo prompt/schema/dataset/rubrica/tier e registrar parâmetros, saídas sintéticas, falhas, tempos, tamanho, tokens conhecidos e estabilidade. Alias `latest` e preview são recusados. Nome estável não garante revisão imutável do serviço: registrar versão resolvida quando disponível e reavaliar mudanças.

WU-075: benchmark `atv-benchmark/1.1.0` e promoção `atv-promotion/1.1.0` não inferem custo zero. Cada amostra precisa de `costBrl` finito não negativo e `costEvidence` com `basis` (`owner-confirmed-free-tier`, somente para zero, ou `provider-receipt`) e `reference` opaca de até 120 caracteres. O operador confronta essa referência com a evidência real; o campo não autentica comprovantes nem autoriza chamadas. Não incluir dados pessoais, URLs privadas, recibos brutos ou credenciais. Ausência/inconsistência produz `costKnown:false`, `costBrl:null`, `costBasis:unknown` e bloqueia promoção. Custo positivo documentado continua bloqueado pela política R$0. Tokens precisam ser inteiros seguros não negativos; desconhecidos/invalidos aparecem como null, e o teto de saída é verificado separadamente. As vinte amostras históricas não foram reescritas: a confirmação Free Tier da rodada permanece na decisão histórica, mas o replay informa ausência de evidência estruturada por amostra. Nenhuma homologação é inferida desse replay.

Para promoção: schema e hard checks em todos os casos; revisão factual/segurança em todos; dimensões acima dos pisos; repetições e estabilidade; testes adversariais; cota/custo/latência e privacidade verificadas; fallback avaliado; decisão versionada com responsável e hashes. Dataset de 10 casos é baseline pequeno, não evidência suficiente para todos os produtos. Nenhum modelo está promovido nesta fundação.

WU-076: benchmark `1.2.0` (promoção atual `1.3.0`, WU-094). Uma única representação JSON congelada alimenta schema, hard checks, contagem e digest, preservando os hashes históricos. Saída não serializável é rejeitada com `outputSerialization:unserializable`, `digest:null` e `outputChars:null`, sem interromper o lote ou divulgar a exceção. JSON serializável mas inválido conserva seu hash para investigação, sem aprovação. A revisão nunca pode substituir um digest ausente.

Fontes primárias consultadas em 08/09/2026: [saídas estruturadas Gemini](https://ai.google.dev/gemini-api/docs/structured-output), [preços e Free Tier](https://ai.google.dev/gemini-api/docs/pricing), [termos do Gemini](https://ai.google.dev/gemini-api/terms). O proprietário confirmou Free Tier sem cobrança em conversa; o MCP disponível não expõe billing nem usage metadata. Conteúdo pessoal não é usado no laboratório.

## Reproduzir

WU-077 acrescenta `scripts/helpers/product-lab-corpus.mjs`: corpus separado, atualmente `atv-product-facts-synthetic/1.4.0` (WU-103), com 105 entradas: 91 bases (13 produtos parciais × sete estratos), preservadas da versão 1.2.0, sete cenários profissionais e sete de contexto temporal contrafactuais. Datas, coordenadas, pares, cartas e relatos variam nas bases; cenários polares preservam ausências de casas/Ascendente. Os suplementos `atv-career-context-synthetic/1.0.0` e `atv-date-context-synthetic/1.0.0` mantêm os mesmos dados de cálculo por produto e variam somente o relato: isso não conta como diversidade factual adicional. São 104 requisições preparadas e um caso negativo: `ascendant-boundary` fica bloqueado por `insufficient_facts`, pois aviso de indisponibilidade não sustenta uma leitura de Ascendente. Exportação offline: `node scripts/product-lab-corpus.mjs > test-results/product-lab-corpus.json`. Testes no `pnpm test:unit` verificam proveniência, diversidade factual, ausência de truncamento, replay e fingerprints atual e históricos. Horários reais de cálculo permanecem no artefato: seu JSON integral não é byte-idêntico entre execuções; entradas e requisições factuais são estáveis.

Esse corpus não substitui o dataset de release, não contém respostas/notas/goldens aprovados e não amplia entitlements. Todos os casos continuam sintéticos, parciais, `not-reviewed`, com publicação bloqueada. Os 12 produtos sem calculador ficam explicitamente listados como não cobertos. O tier intermediário descreve somente o contrato de teste; não autoriza chamada ou venda. O fingerprint detecta mudanças, não certifica exatidão astronômica ou qualidade editorial. A WU-101 exercita limites de contexto, isolamento de instruções, procedência do relato e recusas mecânicas de rascunhos profissionais; não mede resistência de um modelo a ataques nem substitui revisão semântica humana. Evidência: [QA do contexto profissional no Lab](../qa/CAREER_CONTEXT_LAB_2026-09-28.md).

WU-103 preserva a data-alvo e a amostra única às 12 UTC sob relatos temporais adversariais. A afirmação de cobertura do dia local inteiro não é necessariamente rejeitada pelas verificações mecânicas; o teste registra essa lacuna sem liberá-la para publicação. Evidência e limites: [QA do contexto temporal no Lab](../qa/DATE_CONTEXT_LAB_2026-09-28.md).

WU-028 (09/09/2026): `promotion.ts` implementa a elegibilidade de release por capacidade/tier, sete estratos e três repetições independentes por caso, versões atuais, hashes de artefatos, identidade resolvida, tokens conhecidos, R$0, SLA e revisão autorizada vinculada ao digest exato. Elegibilidade não promove: `promotedModels` permanece vazio. Fixtures de teste com notas sintéticas provam a lógica de recusa, não qualidade editorial.

WU-105: política `atv-promotion/1.4.0` exige provedor canônico por amostra, idêntico ao do candidato, e `executionId` opaco único no lote inteiro. Referência ausente/inválida ou reutilizada bloqueia; renumerar repetições ou trocar o caso não gera evidência nova. Identificadores não autenticam execuções: o operador deve confrontá-los com registros independentes e não pode reconstruir IDs para disfarçar duplicatas. Respostas idênticas de invocações distintas não são rejeitadas por esse motivo. Benchmark histórico preservado; nenhum modelo homologado. Contrato: [procedência das amostras](../contracts/lab-sample-provenance.md).

WU-094: promoção `atv-promotion/1.3.0` exige `authority.artifacts` independente do candidato. O operador confiável gera o manifesto offline com `node scripts/lab-artifacts.mjs` (HEAD resolvido para SHA imutável) ou um SHA completo aprovado. São quatro digests de grupos de blobs Git, incluindo dependências transitivas explícitas. Ausência/formato inválido da referência ou qualquer divergência bloqueiam elegibilidade; o candidato não pode fornecer sua própria referência. Isso não autentica assinaturas, revisores ou recibos e não garante que a execução tenha usado esses artefatos: a proveniência operacional continua sujeita à revisão. Mudanças locais não commitadas não entram no snapshot. Contrato completo: [artefatos do Lab](../contracts/lab-artifacts.md). Nenhum modelo homologado, chamada externa ou alteração do registro de promoção.

`lab/release-dataset.ts` adiciona 42 casos sintéticos estratificados por contexto às seis capacidades. São uma base de ampliação, não corpus calibrado por produto: repetem fatores-base dentro de cada capacidade. O baseline de dez casos e suas vinte amostras históricas permanecem reproduzíveis; os dois golden seeds continuam sem calibração humana. Ainda faltam cobertura calibrada dos 25 produtos, revisão factual/semântica independente e execuções repetidas válidas para homologação; o corpus factual separado não satisfaz sozinho esses requisitos.

O gateway reserva chamadas e teto conservador de tokens antes de cada tentativa, incluindo instruções de sistema. O prazo total inclui reserva e fallback. O ledger é somente local ao processo de laboratório; produção exige reserva distribuída. Telemetria não contém conteúdo nem credenciais. `gemini.ts` fornece o adaptador de API com schema nativo, abort, teto de bytes, rejeição de truncamento/tool calls e metadados de uso/versão; testes usam fetch falso. Nenhuma chave é lida ao construir o adaptador e não houve chamada externa nesta WU. Referência do protocolo: [API generateContent](https://ai.google.dev/api/generate-content).

`pnpm --filter @atv/ai check` e `pnpm --filter @atv/ai test:unit` executam validação sem rede/segredos. Benchmark externo é operação explícita pelo MCP AI Studio, sempre com datasets sintéticos e cota confirmada. Resultados e decisão ficam em `docs/intelligence/benchmarks/`, sem inferir aprovação de geração pela mera listagem de modelos.
