# Sinastria — admissão e cobertura editorial experimental

WU158. Perfil `atv-synastry-editorial/1.0.0`, preparação `atv-product-editorial-evidence/1.29.0` e prompt `atv-editorial/1.0.16`. Implementação local para E2; não constitui leitura completa aprovada, homologação de política/motor ou liberação hospedada.

## Base e transporte

O Worker verifica a projeção original conforme `synastry-calculation.md` antes de normalizar fatos. Somente a Sinastria recebe o perfil: `relationship-dynamics`, `partial`, exatamente 120 fatos calculados em ordem canônica (20 posições A/B e 100 pares ordenados), mais contexto informado opcional na última posição. Nenhum par ou ausência nominal é selecionado, removido ou resumido para caber no envelope.

Admissão específica: até 121 fatos, fonte de até 300 caracteres, posição de até 120 caracteres, par de até 240 caracteres com declaração de precisão não certificada/estabilidade desconhecida e contexto de até 1200 caracteres. Outros perfis continuam com até 40 fatos e fonte de até 160 caracteres. A verificação de topologia no pacote IA não autentica fonte nem substitui o guard geométrico do Worker.

O gateway exige tier premium para esse perfil e orçamento finito de 100000 caracteres do JSON de entrada. O teste dos comprimentos máximos admitidos demonstra que toda a base e o contexto cabem. Orçamentos de saída, tokens, chamadas, timeout, consentimento, isolamento de dados e promoção permanecem os existentes. A admissão não habilita provedor pago ou runtime produtivo; o cálculo interno continua exigindo política explícita e sem registro em `createProductCalculators()`.

## Cobertura estrutural da leitura

Exatamente 19 hipóteses em ordem: dez `synastry-base-BODY` para Sol, Lua, Mercúrio, Vênus, Marte, Júpiter, Saturno, Urano, Netuno e Plutão de A; depois comunicação, vínculo, desejo, segurança, autonomia, conflito, reparação, negociação e crescimento. Cada base referencia a posição correspondente de A, as dez posições de B e seus dez pares ordenados. Assim os 100 pares permanecem rastreáveis, sem ranking ou score. As ausências continuam nominais e sua estabilidade continua desconhecida.

Cada tema referencia posições A/B e pares entre os corpos de seu grupo, além de `personal-context` quando recebido. Grupos: comunicação — Mercúrio; vínculo — Lua/Vênus; desejo — Vênus/Marte; segurança — Lua/Saturno; autonomia — Marte/Urano; conflito — Marte/Saturno; reparação — Lua/Mercúrio; negociação — Vênus/Mercúrio; crescimento — Júpiter/Plutão. Essa organização simbólica não é política de aspectos, ponderação, precisão ou afirmação de dinâmica real. O contexto relatado nunca entra nas hipóteses da base calculada.

`relations=[]`; uma síntese referencia as 19 hipóteses em ordem; três perguntas práticas distintas preservam participação consentida e escolhas reversíveis. Três limites literais obrigatórios mantêm base parcial/experimental, política não aprovada, todos os pares com estabilidade desconhecida, ausência de score/casas/cronologia e compartilhamento não autorizado. Sem inferência de sentimentos, gênero, intenção, traição, separação ou destino de terceiros.

## Aceite e limites

O Director verifica cardinalidade, papéis, evidências, síntese, perguntas e limites. Isso não avalia utilidade semântica nem concede revisão legítima. Fixtures identificadas como estruturais só comprovam transporte e cobertura. E2 integral continua pendente de conteúdo situado aprovado ou modelo/prompt validado e revisão autorizada; E1 depende de política/motor/entrada reais. E3–E5 e gates de publicação permanecem pendentes.

## Lab do produto — WU159

O corpus padrão permanece em 13 bases e 105 casos. A opção explícita `--experimental-synastry` nos CLIs existentes seleciona somente `atv-synastry-facts-synthetic/1.0.0`: sete cenários common/complex/contradiction/boundary/incomplete/adversarial/safety, todos sintéticos. API correspondente: `buildProductLabCorpus({ experimentalProduct: 'synastry' })`. A seleção não registra o cálculo no runtime: Sinastria continua entre os 12 produtos com cálculo produtivo indisponível.

A composição interna usa a política de fixture `synthetic-synastry-lab-not-approved@qa-fixture-1`, declarada exclusivamente para QA. Um único par sintético é preservado enquanto muda o relato: isso não representa diversidade geométrica. Contexto ausente não é inventado; máximo de 1200 caracteres UTF-16, contradição do relato, autonomia, conflito, instruções hostis e segurança têm critérios específicos. Os 100 pares continuam nominais com precisão não certificada e estabilidade desconhecida; score e compartilhamento permanecem ausentes.

Exportação local: `node scripts/product-lab-corpus.mjs --experimental-synastry`. Manifesto: `node scripts/evaluate-product-benchmark.mjs --experimental-synastry --manifest`. Captura, template/revisão e comparação usam o mesmo prefixo nos modos existentes. Captura do corpus padrão não pode ser avaliada como Sinastria, e vice-versa: versão, fingerprint e digests vinculam o escopo. Os timestamps reais de cálculo permanecem no artefato e seu digest; geometria, fatos editoriais e manifesto não mudam por esse horário de execução.

Três repetições dos sete casos produzem 21 amostras diagnósticas. Fixture estrutural não mede utilidade, tokens, latência ou custo de um provedor e não autentica declaração de execução. Medições desconhecidas continuam desconhecidas; conteúdo exige revisão semântica legítima dos nove temas e das evidências, inclusive ausências nominais. Nenhuma promoção, publicação, chamada externa ou homologação decorre do corpus ou da aprovação mecânica.
