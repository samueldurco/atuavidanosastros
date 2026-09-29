# Foco Agora — cobertura editorial candidata

RUN_ID: ATV-20260902-170644Z-01A0630F. WU136, 28/09/2026. Produto `tarot-focus`, rota `/foco-agora`, entrega web. Este contrato implementa a cobertura de E2 conforme o V3 (Tarot: pergunta, símbolos, tensões, alternativas e reflexão). Não aprova significados, conteúdo, modelo ou publicação.

Perfil `atv-tarot-focus-editorial/1.0.0`, prompt `atv-editorial/1.0.9`, preparação `atv-product-editorial-evidence/1.15.0`, corpus `atv-product-facts-synthetic/1.17.0`. Schema e limite gratuito de cinco afirmações permanecem vigentes. A preparação confiável só atribui o perfil após validar a projeção determinística e a política candidata descritas em [tarot-focus-calculation.md](tarot-focus-calculation.md).

São exigidas exatamente cinco afirmações:

| Afirmação | Evidência e função |
| --- | --- |
| Fato da carta | Cópia exata de `card-1`, com essa única evidência. |
| Fato da pergunta | Cópia exata de `question-1`, com essa única evidência. |
| `focus-symbol` | Interpretação ou hipótese com `card-1`: possibilidade simbólica, tensão/excesso e alternativa observável no presente. |
| `focus-question` | Interpretação ou hipótese com `card-1` e `question-1`: conecta símbolo, tensão e alternativa à pergunta. Se recebido, referencia também `tarot-context`, distinguindo relato de hipótese. |
| `focus-practice` | Interpretação ou hipótese com `card-1` e `question-1`: pequeno experimento reversível que a pessoa pode escolher e observar. |

Uma parte da síntese reúne os três papéis e preserva linguagem condicional. Há exatamente uma pergunta prática terminada em `?`, `scope=partial` e `relations=[]`, pois existe uma única carta. A pergunta e o contexto permanecem relatos; não selecionam perfil, sorteio, gates ou autoridade. Não inventar carta, reversão, posição, histórico, prazo, destino, resposta sim/não absoluta ou prescrição. Limites explicitam a base simbólica parcial e a política candidata.

O Director verifica número, IDs, tipos, vínculos, fatos exatos, síntese e pergunta; não comprova que o texto desenvolve adequadamente possibilidade, tensão ou alternativa. Especificidade, utilidade, profundidade e responsabilidade exigem revisão legítima pela rubrica vigente. Uma fixture estrutural com pontuação declarada não homologa conteúdo e continua dependente de promoção autorizada. Alterações invalidam a revisão anterior; falha estrutural prevalece sobre scores.

E2 integral permanece BLOQUEADO: falta conteúdo aprovado ou modelo/prompt validado com metadados autênticos e revisão legítima. Não há nova chamada paga, modelo homologado, liberação hospedada ou gate aberto. Provas locais e limites estão em [TAROT_FOCUS_EDITORIAL_2026-09-28.md](../qa/TAROT_FOCUS_EDITORIAL_2026-09-28.md).

WU137: entrega `atv-product-delivery/1.7.0` organiza o resultado web em carta registrada, pergunta relatada, possibilidade/tensão/alternativa, conexão com a pergunta, pequeno experimento e síntese com uma pergunta prática. Preserva textos, evidências, cálculo e sorteio; o contexto recebido continua identificado como relato. A nova versão integra o digest e invalida uma revisão calculada para a entrega anterior. Estados sem aprovação não exibem leitura ou controles de download. A fixture local identifica conteúdo sintético e nunca fornece autoridade legítima. Aceite local e pendências integrais: [TAROT_FOCUS_READER_2026-09-28.md](../qa/TAROT_FOCUS_READER_2026-09-28.md).
