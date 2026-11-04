# Mapa da Data de Casamento — proposta de método comparativo restrito

Data: 04/11/2026. RUN_ID: `ATV-20260902-170644Z-01A0630F`.

Estado: **perfil geométrico implementado localmente em módulo isolado; sem aprovação editorial ou liberação comercial por este documento**. A implementação descrita aqui não modifica o orquestrador de cálculo, compositor ou revisor. O método abaixo é uma regra editorial original da ATVNA, informada por fontes de prática astrológica e limitada aos fatores efetivamente disponíveis. Não é validação científica, estimativa de sucesso conjugal ou reprodução integral de uma escola tradicional.

## Decisão recomendada

É possível especificar uma **comparação simbólica de duas ou três candidatas**, com motivos, ressalvas e empate explícitos, sem contar aspectos como pontos. O resultado pode identificar uma candidata que domina as demais no recorte declarado; quando há vantagens diferentes, o resultado correto é preservar as alternativas e explicitar o tradeoff. Uma lista de longitudes e contagens ainda não cumpre esse método.

O contrato atual não justifica afirmar que uma candidata é a melhor data eletiva em sentido amplo. A proposta consegue destravar uma entrega privada completa **no recorte geométrico declarado**, depois de integradas as projeções, verificações e composição suficiente descritas abaixo. Caso a promessa continue exigindo eleição tradicional completa, são necessários cálculos adicionais; a seção final os delimita. O módulo isolado não muda o estado de revisão: o gate precisa conferir a entrega integrada antes de qualquer aprovação privada.

## Fontes primárias verificadas e limites de uso

Consulta web em 04/11/2026. As fontes são a apresentação original da prática da CHANI e o ensaio comparativo original de Ken Gillman, não evidência empírica de efeito dos astros.

| Fonte | Conteúdo usado nesta proposta | O que não autoriza inferir |
| --- | --- | --- |
| [CHANI — What is electional astrology?](https://www.chani.com/astro-education/what-is-electional-astrology-how-do-astrologers-pick-key-dates-for-the-year-and-how-can-i-use-astrology-to-plan-for-the-future), seções 1–3, linhas web 54–74 | Considerar Lua, regente e planetas destacados; contatos Lua–Vênus/Júpiter como apoio simbólico e Lua–Marte/Saturno como atenção; importância dos ângulos/casas. | Não fornece pesos, escore, orbe universal ou regra que vença todos os conflitos. |
| [CHANI, seção final](https://www.chani.com/astro-education/what-is-electional-astrology-how-do-astrologers-pick-key-dates-for-the-year-and-how-can-i-use-astrology-to-plan-for-the-future), linhas web 83–86 | Nenhum mapa reúne todas as condições desejáveis; é preciso lidar com limitações reais. | Não permite prometer data perfeita nem resultado garantido. |
| [Ken Gillman — Marriage Elections, Skyscript](https://www.skyscript.co.uk/marriage.html), introdução, The Marriage Moon e The Marriage Moon by sign, linhas web 25–30, 101–114 e 149–160 | O autor compara tradições, enfatiza Lua/Vênus e condições da eleição; documenta discordâncias sobre fase e faixas zodiacais. | Seus exemplos históricos não são amostra de validação causal; regras divergentes não podem virar tabela universal silenciosa. |

A CHANI é referência para selecionar famílias de fatores, não para os limiares técnicos da ATVNA. Gillman é referência para reconhecer a pluralidade das escolas e a insuficiência de uma soma indiscriminada. Não transplantar os prognósticos fatalistas ou as atribuições de gênero presentes nas citações históricas. O método proposto trata as pessoas como participantes da mesma cerimônia, sem distribuir Lua/Vênus por sexo.

## O que já existe no cálculo local

| Dado/função | Estado verificável |
| --- | --- |
| Duas ou três candidatas com data/hora/fuso/cidade/coordenadas | Intake de `wedding-date-map` em [launches.ts, linhas 48–52](../../packages/domain/src/launches.ts:48). |
| Um mapa por instante candidato | [launch-calculation.ts, linhas 202–215](../../apps/web/src/lib/server/launch-calculation.ts:202). |
| Longitudes de Lua, Vênus, Júpiter, Marte, Saturno e outros corpos | `chart.positions`, com proveniência; [tipo Position, linha 14](../../packages/astrology/src/index.ts:14). |
| Aspectos maiores entre corpos, com orbe de até 3° | Política atual explícita, sem pesos: [linhas 18–24](../../apps/web/src/lib/server/launch-calculation.ts:18). |
| Ascendente, Meio do Céu e estado das casas | `chart.houses`; ângulos definidos no [tipo, linhas 15–18](../../packages/astrology/src/index.ts:15). Descendente/IC não são fatos separados: podem ser derivados deterministicamente por oposição e registrados como derivados. |
| Contagens por espécie de aspecto | Já calculadas, mas expressamente não são nota da candidata: [linhas 219–228](../../apps/web/src/lib/server/launch-calculation.ts:219). |
| Seleção/justificativa eletiva | `preferredOption: null`; composição descreve coordenadas e mantém pendência; [cálculo, linha 224](../../apps/web/src/lib/server/launch-calculation.ts:224), [compositor, linhas 281–289](../../apps/web/src/lib/trials/launch-reading.ts:281), [gate atual, linha 384](../../apps/web/src/lib/trials/launch-reading.ts:384). |

O cálculo pode trazer `retrograde`, mas a versão restrita proposta não o usa para pontuar ou selecionar. Também não avalia recepção, aplicação/separação, vazio de curso, regentes, combustão ou condição natal dos participantes. Ausência dessas avaliações deve ser expressa como **não avaliado**, jamais como ausência de problema.

## Contrato original proposto

Identidade sugerida: `atv-wedding-declared-profile/1.0.0`. Escopo público sugerido: “Comparação simbólica das opções de cerimônia informadas, pelos contatos de Lua e Vênus e pelo destaque angular calculado. Pode resultar em empate.” Não é busca de todas as datas possíveis, previsão do casamento ou comparação com os mapas natais do casal.

Entradas adicionais: nenhuma narrativa nova é necessária para calcular o perfil. A frase livre de prioridades atual é usada para contextualizar logística e decisão, sem interpretação automática como peso astrológico. Antes do cálculo, a interface deve esclarecer qual momento está sendo comparado: início da cerimônia, formalização/assinatura ou outro marco informado. O marco precisa ser o mesmo nas candidatas ou a diferença deve ser explicitada; não alegar comparação equivalente se uma hora é de recepção e outra de assinatura. Esse esclarecimento não autoriza inventar duração ou horário.

### Perfil por candidata

Todos os itens vêm de fatos persistidos. Identificadores de evidência e políticas permanecem ligados ao produto, execução e digest da entrada. Não calcular astrologia nova dentro do texto.

| Família | Elementos declarados | Uso na comparação |
| --- | --- | --- |
| Apoios à Lua | Contatos calculados Lua–Vênus e Lua–Júpiter em conjunção, sextil ou trígono dentro da política de 3°. | Conjunto de apoios observados; não probabilidade nem promessa. |
| Atenções à Lua | Contatos calculados Lua–Marte e Lua–Saturno em conjunção, quadratura ou oposição dentro de 3°. | Conjunto de tensões simbólicas observadas. |
| Atenções a Vênus | Contatos calculados Vênus–Marte e Vênus–Saturno em conjunção, quadratura ou oposição dentro de 3°. | Inferência editorial original para a temática; não equivale a concluir Vênus “fraca” em sentido tradicional. |
| Destaque angular de Lua/Vênus | Proximidade à longitude de ASC, MC, DSC ou IC. Registrar distância e eixo. | Conjunto de destaques observados, se a projeção angular for implementada e validada. |
| Destaque angular de Marte/Saturno | Mesma geometria. | Conjunto de atenções angulares, com o mesmo limite técnico. |

Cada elemento é identificado pela família e par de corpos, não pelo índice no array ou pela contagem total. O tipo exato do contato e o orbe ficam na evidência textual. Nesta versão, sextil e trígono não recebem ordens de força; um orbe menor tampouco desempata o resultado. Uma conjunção não é genericamente “boa”: sua classificação depende do par explicitamente listado. Contatos não listados continuam visíveis quando úteis, porém não selecionam uma candidata.

O limite angular sugerido é **3° de distância eclíptica ao ângulo**, exclusivamente como convenção técnica desta versão, compatível com a janela geométrica já usada; não é apresentado como padrão histórico comprovado. Distância: `min(abs(a-b), 360-abs(a-b))`; `DSC=(ASC+180)%360`, `IC=(MC+180)%360`. Não chamar proximidade eclíptica de “planeta na casa 1/4/7/10”: ocupação de casa exige classificação própria pelas cúspides. Não extrapolar angularidade quando ângulos/proveniência ou sua validade local forem inadequados.

Signo e grau de Lua/Vênus podem compor a explicação. Não fazem desempate nesta versão: a divergência das fontes e a falta de tabela canônica implementada não sustentam uma ordem universal de signos. Nada de “mais aspectos harmônicos = data melhor”.

### Preferência sem pesos ou soma

Representar cada família como conjunto de **condições nomeadas presentes**. Para apoios, superset é pelo menos tão favorável dentro deste recorte; para atenções, subset é pelo menos tão livre das condições nomeadas. A comparação é uma ordem parcial original, não uma regra atribuída à CHANI ou a Gillman.

`A domina B` somente quando:

1. Os dois perfis são completos e comparáveis sob a mesma versão/política.
2. Em **cada** família de apoio, A contém todos os apoios de B.
3. Em **cada** família de atenção, A não contém atenção que B não tenha.
4. Ao menos uma dessas relações é estrita.

Essa regra impede compensar uma tensão por muitos aspectos irrelevantes e impede trocar Lua–Marte por Lua–Saturno como se tivessem valores numéricos intercambiáveis. Não escolhe o primeiro elemento de um array, a menor data, o menor orbe ou a candidata com menos palavras no relato.

Resultados possíveis:

| Resultado | Condição | Entrega autorizável pelo contrato proposto |
| --- | --- | --- |
| `PREFERENCE_IN_DECLARED_PROFILE` | Uma única candidata domina **todas** as demais. | Nomeá-la como preferência relativa no recorte; citar diferenças e limitações. Não chamá-la de data ideal nem dizer que todas as suas condições são favoráveis. |
| `TRADEOFF_NO_SINGLE_PREFERENCE` | Há perfis incomparáveis; cada um conserva algum apoio ou atenção diferente. | Mostrar os motivos distintos e as candidatas da fronteira não dominada; sem eleger vencedora. |
| `TIED_IN_DECLARED_PROFILE` | Perfis completos e idênticos na fronteira não dominada, inclusive quando nenhum critério decisivo aparece. Duas opções podem empatar e ambas dominar uma terceira. | Declarar quais candidatas empatam no método e qual ficou dominada. “Nenhum contato nesta janela” não significa que as datas sejam equivalentes em toda astrologia. |
| `UNASSESSABLE` | Falta dado/proveniência, ângulos válidos, binding ou cobertura exigida pelo método. | Informar o problema concreto; não emitir leitura aprovada como se a comparação estivesse completa. |

Com três opções, uma candidata apenas não dominada não é suficiente para anunciar preferência: a implementação deve registrar as relações entre todos os pares e demonstrar a dominância sobre as outras duas. A ordenação de apresentação deve ser estável e não decidir conteúdo.

Empate astrológico não se resolve por um novo escore logístico oculto. A entrega pode orientar o casal a decidir por disponibilidade, orçamento e prioridades realmente informadas. A preferência prática pertence às pessoas e deve ser identificada como tal. Não inferir, a partir do texto livre, qual opção atende melhor a uma prioridade não estruturada.

### Estrutura suficiente da entrega E2

1. Escopo, candidatas e marco comparado, com horários locais e UTC claros.
2. Uma seção por opção, com ao menos um motivo específico ou a ausência explícita de critérios do recorte, respectivas ressalvas e fatos rastreáveis.
3. Tabela comparativa das famílias e relações de dominância. Distinguir nenhum item observado de item não avaliado.
4. Síntese com o resultado permitido; se há preferência, explicar quais condições a sustentam e quais limitações permanecem; se há empate/tradeoff, explicá-lo sem forçar resposta.
5. Ação prática ligada às prioridades informadas: confirmar o marco, a disponibilidade e o impacto das opções na organização. Sem prometer que a data produzirá harmonia.
6. Limites do recorte, fonte/política versionadas e aviso de método experimental privado; revisão de consistência separada de precisão comercial e de aceite pessoal.

Não basta preencher três parágrafos genéricos ou copiar a mesma justificativa para opções diferentes. O resumo deve mudar quando o perfil ou o contexto muda de modo relevante. Um empate bem explicado pode ser uma entrega completa do **recorte aprovado**, mas não rebatizar comparação parcial como eleição tradicional completa.

### Projeção tipada sugerida

```ts
type WeddingProfileComparison = {
  methodVersion: 'atv-wedding-declared-profile/1.0.0';
  executionId: string;
  inputDigest: string;
  geometryPolicyId: 'atv-launch-event-major-aspects';
  angularPolicyVersion: 'atv-wedding-ecliptic-angle-proximity/1.0.0';
  profiles: Array<{
    optionId: string;
    inputOptionDigest: string;
    coverage: 'COMPLETE' | 'INCOMPLETE';
    supports: { moon: string[]; angularMoonVenus: string[] };
    cautions: { moon: string[]; venus: string[]; angularMarsSaturn: string[] };
    evidence: Array<{
      criterionId: string;
      evidenceIds: string[];
      geometry: Record<string, number | string>;
    }>;
    notEvaluated: string[];
  }>;
  dominates: Array<{ optionId: string; otherOptionId: string; criterionIds: string[] }>;
  frontier: string[];
  outcome: 'PREFERENCE_IN_DECLARED_PROFILE' | 'TRADEOFF_NO_SINGLE_PREFERENCE'
    | 'TIED_IN_DECLARED_PROFILE' | 'UNASSESSABLE';
  preferredOptionId: string | null;
};
```

`optionId` precisa de identidade estável, com vínculo à entrada original; não permitir que a troca de ordem dos arrays altere o resultado. A estrutura acima resume o contrato; o export `WeddingProfileComparison` no módulo acrescenta rótulos, horários, razões, proveniência e fatos derivados. Não implica migração aprovada. A projeção deve ser recomputável pelo revisor a partir do cálculo confiável; não aceitar flags de dominância vindas do cliente ou do texto composto.

## Aceite finito para uma edição privada restrita

O seguinte pacote é suficiente para revisar a proposta como implementação, sem abrir uma frente genérica de pesquisa:

- Implementar a projeção pura dos perfis, os fatos angulares derivados e a comparação; versionar política e fontes. Usar os dados já calculados/persistidos, sem efeméride adicional nesta edição.
- Registrar a validade dos ângulos e os bindings por candidata. Persistir o perfil junto ao cálculo ou garantir derivação determinística auditável antes da composição.
- Compor a entrega completa descrita acima, explicitando quais critérios são originais e o que ficou fora. Conservar o produto em teste privado.
- Substituir o `false` incondicional do gate apenas depois de ele conferir, independentemente, projeção, relações, síntese, evidências, contexto e limites. Não aceitar um `status` autodeclarado como aprovação.
- Provar os casos abaixo com fixtures identificadas como sintéticas; depois executar uma comparação factual real no ambiente autorizado para conferir bindings e entrega, sem custo novo. Fixtures não são mapas efetivamente calculados nem evidência de precisão.

| Caso de validação | Resultado exigido |
| --- | --- |
| A conserva todos os apoios de B e elimina uma atenção, sem nova atenção | Preferência relativa A; motivo exato, sem contagem. |
| A tem um apoio que B não tem, mas introduz atenção própria | Tradeoff; nenhum vencedor forçado. |
| As duas opções não apresentam condições do recorte | Empate, sem dizer “ambas perfeitas” ou “sem aflições”. |
| Três candidatas, duas não dominadas com vantagens distintas | Fronteira com as duas; nenhum desempate por índice/data. |
| Três candidatas, duas com perfil idêntico dominam a terceira | Empate entre as duas da fronteira; nenhuma preferência única. |
| Perfis idênticos com orbes diferentes dentro da mesma janela | Empate nesta versão; não converter menor orbe em escore. |
| Corpo a 359° e ângulo a 1°; borda de 3° e imediatamente além | Distância circular correta e inclusão/exclusão segundo a política exata. |
| Horário/fuso/instante ou rótulo de candidata substituído | Rejeição de binding; nenhuma justificativa colada ao mapa errado. |
| Ângulo indisponível, dados parciais ou versão divergente | `UNASSESSABLE`, sem perfil completo fabricado. |
| Mudança da ordem das opções e dos aspectos | Mesmas relações/preferência por identidade estável. |
| Resultado adulterado: preferência sem dominância, evidência inexistente, omissão de tensão ou aplicação/receptividade inventada | Revisor rejeita; persistência não se torna aprovação por si só. |
| Mesmo perfil com prioridades práticas diferentes | Mantém a conclusão geométrica; muda apenas o encaminhamento contextual sustentado pelo relato. |

A aprovação privada eventual é consistência da edição restrita, não comprovação de eficácia, publicação, venda, ativação de desconto, E5 ou concordância do proprietário com a leitura.

### Implementação local do perfil

O módulo [launch-wedding-profile.ts](../../apps/web/src/lib/server/launch-wedding-profile.ts) implementa `buildLaunchWeddingProfile` e `verifyLaunchWeddingProfile`, ambos assíncronos somente pelos digests SHA256 locais. Recebe as opções originais e os eventos calculados; deriva identidade estável por opção, verifica o vínculo do mapa com sua entrada, a proveniência compatível e a política geométrica exata. Reconstrói os aspectos com as longitudes já disponíveis, sem chamar efeméride. A verificação recompõe o perfil integral e rejeita alteração de preferência, evidências, famílias ou campos adicionais.

`derivedFacts` contém fatos geométricos identificáveis para persistência e vínculo editorial. Proximidade angular é declarada como distância eclíptica, não ocupação de casa. As fontes, a convenção original e os fatores não avaliados permanecem explícitos. O módulo pressupõe entrada e fatos obtidos da persistência confiável do servidor; coerência estrutural não autentica a origem de um mapa arbitrário. Não inclui composição de leitura, aprovação editorial, semântica do marco de cerimônia, certificação de precisão ou liberação comercial.

Os testes [launch-wedding-profile.spec.ts](../../apps/web/src/lib/server/launch-wedding-profile.spec.ts) cobrem as classes de aceite acima com geometria sintética explicitamente identificada e uma projeção de mapas Caelus reais locais para conferir o contrato. O caso real testa integração geométrica, sem constituir comparação independente de precisão.

## Se a promessa exigir eleição tradicional mais ampla

Os dados atuais não bastam para afirmar que Vênus ou Lua estão “fortalecidas”, que a Lua aplica favoravelmente ou que não há vazio de curso. Antes de usar tais afirmações, os blocos objetivos necessários são:

| Afirmação desejada | Cálculo/regra ausente | Aceite finito |
| --- | --- | --- |
| Regentes da eleição e da parceria | Tabela tradicional de regências versionada; regentes de ASC/DSC e seus contatos/condições. | Conferência de todos os 12 signos e das bordas 0°/30°; fatos/claims independentes por candidata. Não atribuir ASC/DSC por gênero. |
| Dignidade ou debilidade de Lua/Vênus/regentes | Tabela de domicílio/exaltação/detrimento/queda e regra de escopo explícita; limites/termos só se forem realmente adotados. | Casos positivos, negativos e neutros para cada fator e regra; não misturar escolas silenciosamente. |
| Casa ocupada ou força acidental | Classificação do corpo entre cúspides, convenção de fronteira e comportamento com casas indisponíveis. | Cobrir arco circular, cruzamento de 0°, cúspide exata e `PLACIDUS_UNAVAILABLE`; nunca substituir sistema de casas implicitamente. |
| Aplicação/separação, próximo aspecto e vazio de curso | Movimento temporal, solução dos eventos exatos até a saída do signo e definição versionada de quais corpos/aspectos contam. Um aspecto atual de 3° não prova aplicação. | Testar próximos eventos contra dados de referência, estacionamentos/movimento retrógrado, bordas do signo e ausência de evento; registrar tolerância temporal/angular. |
| Crescente/minguante, combustão/cazimi ou eclipses | Projeções específicas e limiares adotados; geometria solar/lunar não equivale automaticamente a eclipse. | Testes de fronteira e fontes do critério; nenhum rótulo por aproximação editorial. |
| Adequação aos mapas dos participantes | Entradas natais consentidas e metodologia adicional de comparação. | Novo escopo explícito; não inferir dos horários da cerimônia ou exigir dados que o intake atual não pede. |

Não é necessário implementar toda essa tradição para oferecer a comparação geométrica restrita, desde que a promessa e a revisão aceitem expressamente o recorte. É necessário implementar cada bloco antes de invocá-lo como justificativa. Para a edição atual, o próximo passo concreto recomendado é a projeção/ordem parcial e sua entrega contextual; até essa implementação ser revisada, preservar o bloqueio existente.
