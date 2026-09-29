# Ascendente — perfil editorial

WU-127 · RUN_ID `ATV-20260902-170644Z-01A0630F` · 28/09/2026.

## Entrada e versões

O servidor seleciona `atv-ascendant-editorial/1.0.0` após validar a coerência da projeção persistida. O envelope `atv-facts/1.0.0` exige capacidade `natal-synthesis`, escopo parcial e somente `angle-ascendant` calculado. Pode conter `personal-context` relatado com fonte `input.context`; esse relato não muda geometria, escolhe instruções ou constitui outro fator astrológico. O intake natal v1 não aceita contexto livre: suporte ao relato no envelope não amplia esse intake.

Prompt `atv-editorial/1.0.6`, evidência `atv-product-editorial-evidence/1.9.0` e corpus `atv-product-facts-synthetic/1.11.0`. O perfil passa a integrar os pedidos existentes do Ascendente; retirando somente esse campo, os fingerprints anteriores são preservados. Permanecem 105 casos, 102 preparações, três bloqueios polares e 306 slots. Não há expansão de corpus ou alteração de cálculo. Perfil e versões entram nos vínculos de requisição/prompt/revisão; revisões antigas não aprovam a preparação atual.

## Leitura exigida

Uma afirmação factual copia exatamente o display fornecido do Ascendente, com signo e grau. Três afirmações de interpretação ou hipótese se apoiam em `angle-ascendant`:

| ID | Conteúdo sujeito à revisão legítima |
| --- | --- |
| `ascendant-approach` | Abordagem e primeiro contato como hipótese simbólica, com exemplo observável. |
| `ascendant-possibilities` | Alternativas para iniciar conversas ou ações e ajustar a apresentação ao contexto real. |
| `ascendant-tension` | Tensão ou excesso possível nessa abordagem e uma maneira de observá-lo. |

Uma mesma parte da síntese conecta os três papéis. Exatamente três perguntas distintas abordam primeiro contato, alternativas de iniciativa e um pequeno experimento reversível. Quatro afirmações cabem nos três planos (gratuito permite cinco).

`scope=partial` e `relations=[]`: um relato não cria um segundo fator. Não inferir Sol, Lua, MC, planetas, casas, regentes, dignidades ou aspectos ausentes. Não determinar personalidade, aparência física, saúde, profissão ou destino. Declarar base parcial e experimental e ausência de garantia global de precisão; manter linguagem condicional na síntese e reconhecer escolhas, experiência e condições reais.

## Verificação e autoridade

O Director verifica fato, três papéis, evidências, ligação conjunta na síntese, quantidade de perguntas e ausência de relações, além das regras comuns de cópia exata, escopo, repetição e segurança. Estrutura não prova significado, utilidade ou responsabilidade; cada dimensão da tabela, síntese, perguntas e limites exige revisão do texto efetivo.

Gateway e Lab preservam o perfil. Candidatos de fixture continuam sujeitos à revisão e à promoção independente; produção retorna `promotion_required`. Não há nova autoridade de publicação, modelo aprovado, recibo, preço, entitlement ou estado persistido. E2 permanece bloqueado para aceite por conteúdo/modelo/revisão legítima; o bloqueio de metadados/revisão já documentado na Bússola impede novas chamadas sem resolução.

Base e limites: `ascendant-calculation.md`. Provas locais: `../qa/ASCENDANT_EDITORIAL_2026-09-28.md`.
