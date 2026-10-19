# Três Pilares — revisão editorial privada da leitura 5.1.0

Data: 15/10/2026. Escopo: implementação e QA locais da leitura privada. Este documento registra uma leitura humana das amostras, separada da aprovação automática, do digest e da avaliação pessoal do proprietário. Não comprova entrega paga nem aceite E5 hospedado.

## Fontes e limites

- Fonte editorial efetivamente consultada: `LIVROS/LIVROS_COMPLETOS/LIVRO_01/LIVRO_01_SEU_MAPA_ASTRAL_POR_INTEIRO.md`, especialmente as passagens sobre Sol, Lua e Ascendente (linhas 1473–1594) e sobre planetas, funções e relações (linhas 1682–1791). A leitura não atribui acontecimentos pessoais ao comprador.
- Contratos aplicados: `docs/contracts/private-three-pillars-reconstruction.md`, `atv-private-three-pillars/5.0.0` para cálculo, `atv-three-pillars-editorial/5.1.0` para texto e `atv-pillars-integrated-graph/1.1.0` para rastreio. A edição 5.0.0 permanece histórica.
- Procedimento: compor e aprovar localmente mapas natais sintéticos com o motor real; ler integralmente os capítulos dos dois casos com o mesmo trio de signos; conferir posições, aspectos, regente, casa, contexto, seleção, citações dos fatos e progressão. Os objetos completos são reproduzidos por `apps/web/src/lib/trials/reconstruction/pillars.spec.ts` em `apps/web/.trial-qa/pillars-v51-*.json` (diretório ignorado no Git).

## Casos confrontados

| Caso | Nascimento sintético e contexto | Fatos e escolha editorial | Consequência na leitura |
| --- | --- | --- | --- |
| A | 01/01/2000, 12:00 UTC, 0°/0°. “Estou com sobrecarga e preciso de descanso.” | Sol em Capricórnio, Lua em Escorpião, Ascendente em Áries; Sol–Lua em sextil (2,95°); prioridade Sol–Saturno em trígono (0,03°); regente Marte em Aquário, casa 11. | A cena é uma demanda adicional que ocuparia o descanso. O texto liga a promessa implícita no primeiro gesto à capacidade e ao prazo, prioriza tempo e energia e propõe reduzir uma demanda. |
| B | 02/01/2000, 12:00 UTC, 0°/0°. “Quero conversar sobre confiança e limites.” | Mesmo trio de signos e mesmo regente/casa; sem aspecto maior Sol–Lua; prioridade Lua–Marte em quadratura (3,46°). | A cena é uma resposta imediata numa conversa de confiança. O texto não inventa fluidez Sol–Lua; liga a condição de apoio ao limite da ação, prioriza o que foi aceito dizer ou ouvir e propõe uma conversa curta com resposta explícita. |

O achado que organiza os dois casos é legível logo na abertura: o primeiro gesto pode ser recebido como uma promessa maior do que a escolha e o apoio permitem sustentar. A hipótese ganha aplicação diferente nos casos A e B pela geometria e pelo contexto; não se limita à troca de nomes dos signos. A síntese do capítulo 8 junta Sol, Lua, Ascendente, aspecto Sol–Lua ou ausência, regente/casa, relação selecionada, contato angular e pergunta declarada numa cena. O capítulo de aspectos explica funções planetárias com resultados observáveis em frases declarativas; a ação fica concentrada na tentativa breve do capítulo seguinte. O capítulo técnico conserva a cobertura integral dos fatos.

## Ablações e revisão adversarial

| Alteração controlada | Resultado exigido e verificado |
| --- | --- |
| Remover o aspecto editorial selecionado | Muda a hipótese do capítulo de síntese e retira seu ID do rastreio; não cria relação substituta. |
| Mover apenas a casa do regente no grafo de ensaio | Muda o campo da síntese e os IDs de casa. Os dados de cálculo originais continuam protegidos pelo verificador de projeção. |
| Trocar somente o contexto declarado | Geometria idêntica; mudam prioridade, perguntas e tentativa de vinte minutos. |
| Remover aspecto maior Sol–Lua | A leitura declara sua ausência e não o apresenta como tensão ou facilidade calculada. |
| Dar o mesmo signo e tipo de aspecto a Mercúrio, Vênus e Marte | Mercúrio trata de pergunta e resposta; Vênus, de acordo e reciprocidade; Marte, de passo e limite. As três consequências textuais são diferentes. |
| Trocar par de IDs ou apagar sentido mantendo o comprimento | O revisor acusa `pillars-pair-trace`, `pillars-pair-meaning` ou `pillars-function-specificity`; a aprovação privada recusa a leitura adulterada. Mudanças de elemento e modalidade também mudam a hipótese do par. |
| Adulterar fato natal, derivados, nascimento, contexto ou prosa categórica | Projeção, recomposição e revisão bloqueiam a aprovação. A prova de origem Caelus instalada continua um gate separado. |

Validação focal: `pnpm exec vitest run src/lib/trials/reconstruction/pillars.spec.ts` passou com 25 testes; `pnpm exec svelte-check --tsconfig ./tsconfig.json` encontrou 0 erros e 0 avisos na validação anterior desta edição. A inspeção manual dos casos A e B identificou comandos repetidos na primeira redação do capítulo de aspectos; a redação foi revista para descrever implicações de cada função e manter uma única tentativa prática. Essa correção foi aplicada ao compositor, não aos arquivos de amostra.

## Revisão integral das capturas Lia e Caio

O manifesto local `tmp/pdfs/three-pillars-captures/manifest.json` preserva as primeiras capturas integrais do leitor real. Lia (12/05/1998, 12:00 UTC; sobrecarga) e Caio (15/06/1992, 08:30 UTC; conversa) compartilham Lua em Sagitário e Ascendente em Gêmeos, mas diferem no Sol, regente/casa, contexto, relação prioritária e vínculo Sol–Lua. Lia traz Sol–Marte em conjunção e nenhum aspecto maior Sol–Lua; Caio traz Sol–Vênus em conjunção e Sol–Lua em oposição. As cenas e a prioridade material mudam: tempo e energia para preservar descanso em Lia; o que foi aceito dizer ou ouvir em Caio.

A leitura humana das 22 seções capturadas encontrou falhas específicas de prosa: concordância em uma frase lunar e no contato de Júpiter, contração ausente em “um sinal de a escolha”, “regente moderno” aplicado a Mercúrio em Gêmeos, explicação contraditória de contato angular, comandos práticos em excesso e conjunção descrita como facilidade garantida. Corrigi essas construções no compositor. Também distingui conjunção Sol–Lua de cooperação nos capítulos de relação e síntese; o teste contrafactual com conjunção calculada verifica a distinção. O revisor agora exige a nova formulação de contraponto, e a aprovação completa dos dois perfis sintéticos passa pelo mesmo gate da rota de teste. A rota Lia respondeu HTTP 200 após a correção do revisor; as capturas acima são evidência da versão anterior à revisão final e devem ser reconstruídas para inspeção visual.

## Julgamento e próximos gates

**Apta para QA local de conteúdo, condicionada à revisão do proprietário das leituras integrais e dos PDFs.** A leitura é factual, preserva a incerteza e apresenta uma descoberta reconhecível com aplicação diferente nos dois casos. Ainda há trechos de estrutura comum quando o trio de signos é igual, e a taxonomia de cenas cobre quatro contextos finitos; são limites editoriais visíveis, não acontecimentos inferidos. O PDF do leitor real deve confirmar ritmo, densidade e legibilidade antes do aceite.

A integração da rota paga `/biblioteca/[id]` é avaliada em frente própria, com gates de origem, fatos, Lab, autorização, persistência e versões históricas. Esta revisão editorial não declara o produto liberado ou hospedado.
