# Bússola de Carreira — perfil editorial

WU-115 · RUN_ID `ATV-20260902-170644Z-01A0630F` · 28/09/2026.

## Entrada e versão

`atv-career-compass-editorial/1.0.0` é selecionado pelo servidor ao preparar a projeção persistida de `career-compass`. O envelope continua `atv-facts/1.0.0`, com `editorialProfile` opcional; versões desconhecidas são recusadas. O perfil exige capacidade `purpose-direction`, escopo parcial, `angle-midheaven` calculado e permite apenas `personal-context` relatado como fato adicional. Contexto livre não seleciona instruções nem altera geometria.

O prompt atual é `atv-editorial/1.0.3` (1.0.2 na introdução do perfil), a evidência do produto é `atv-product-editorial-evidence/1.3.0` (1.2.0 na introdução do perfil, 1.3.0 após a checagem de coerência persistida) e o corpus sintético é `atv-product-facts-synthetic/1.5.0`. Fatos, perfil e versões entram nos vínculos existentes de prompt/requisição/revisão; avaliações anteriores não constituem prova deste prompt. Preparações sem perfil preservam as instruções genéricas.

## Conteúdo exigido

A leitura preserva uma afirmação factual com o display exato do MC: signo e grau, com a proveniência fornecida pelos fatos. Exige três afirmações de interpretação/hipótese, cada uma apoiada em `angle-midheaven`:

| ID | Conteúdo sujeito à revisão editorial |
| --- | --- |
| `public-direction` | Direção pública e contribuição possível. |
| `work-possibilities` | Ambientes, modos de trabalhar e visibilidade como possibilidades. |
| `tension-or-excess` | Uma tensão ou excesso possível e como observá-lo. |

A síntese usa os três papéis; a leitura contém exatamente três perguntas distintas sobre contribuição, ambiente/modo de trabalho e um experimento reversível. O contexto profissional consentido permanece relato, sem virar cálculo. Instruções exigem hipótese simbólica, condições sociais, experiência e escolhas; vedam profissão/renda/destino determinados e fatores ausentes (Ascendente, casas, regentes, aspectos). Limites devem declarar a base parcial experimental e ausência de garantia global de precisão.

## Checagem e autoridade

O Director verifica presença, tipo e evidência dos papéis, ligação na síntese, MC factual e quantidade de perguntas, além das regras genéricas de cópia exata, escopo, evidência, repetição e segurança. IDs e contagem não provam significado, utilidade, especificidade, pertinência ou profundidade. A revisão autorizada deve verificar cada conteúdo da tabela, as três dimensões das perguntas e todos os limites acima no texto efetivo.

Gateway e Lab preservam o perfil durante minimização e avaliação. Um candidato estruturalmente válido continua sujeito à revisão legítima e à promoção independente; produção continua `promotion_required`. Não há mudança de política, emissor de recibos, preço, entitlement, estado persistido ou modelo aprovado. Fixtures exercitam o contrato e nunca satisfazem E2.

As condições do cálculo continuam em `career-compass-calculation.md`. Provas locais e pendências: `../qa/CAREER_COMPASS_EDITORIAL_PROFILE_2026-09-28.md`.

WU-118 acrescenta uma verificação final do prompt, exclusiva do perfil da Bússola, após o schema: distingue IDs de fatos em `evidence` de IDs de afirmações em `claimIds`, exige três perguntas e reforça os limites experimentais e a linguagem condicional na síntese. O perfil e suas regras estruturais permanecem 1.0.0; a alteração das instruções está identificada pelo novo prompt e digest. Uma chamada real sintética com cada versão mostrou falha de evidência no 1.0.2 e aprovação apenas mecânica no 1.0.3. A segunda saída ainda omitiu limites experimentais e não satisfaz revisão editorial; duas chamadas não demonstram causalidade ou qualidade geral. O MCP não retornou usage nem revisão resolvida do modelo. Nenhuma saída foi promovida, publicada ou convertida em revisão autorizada. Capturas e formulário em branco estão ignorados pelo Git; diagnóstico e bloqueadores: `../qa/CAREER_COMPASS_MODEL_DIAGNOSTIC_2026-09-28.md`.

## Apresentação web

WU-117 usa `atv-product-delivery/1.1.0`: os papéis recebem títulos compreensíveis de direção/contribuição, ambientes/modos de trabalho e tensão/excesso. O MC factual é identificado como “Seu Meio do Céu”; os tipos, IDs, textos, evidências, vínculos da síntese e três perguntas continuam preservados. O leitor identifica o MC e o contexto profissional relatado junto dos IDs de origem. A versão da representação entra no digest de revisão; candidatos preparados antes da mudança precisam de revisão da representação atual. Snapshots já publicados não são reescritos.

A rota de prova permanece restrita a localhost, usa cálculo experimental e texto sintético, e desabilita ações de publicação/download. QA responsivo e estados de ocultação validam a apresentação local, sem satisfazer conteúdo aprovado, sessão hospedada ou E4 integral. Provas: `../qa/CAREER_COMPASS_READER_2026-09-28.md`.
