# 0010 — Revisão automatizada identificada do horóscopo público

Data: 20/10/2026. Estado: implementação preparada; admissão pública depende dos gates abaixo. RUN_ID: ATV-20260902-170644Z-01A0630F.

## Decisão e autorização

O proprietário pediu a correção e execução de todos os produtos atuais e ferramentas gratuitas. Esta decisão registra uma extensão de produto dentro desse pedido: uma política específica para interpretações simbólicas datadas, com revisão automatizada independente identificada, sem afirmar revisão humana.

A identidade `atvna-editorial-service`, a chave pública identificada por `github-actions-editorial-20261006-01` e a custódia externa GitHub no ambiente `atvna-editorial-signing` já existem. Esta decisão não cria outra identidade, chave, segredo, custódia ou despesa. O pedido antigo P01–P12 e seu ownerDecisionDigest não autorizam esta extensão e não serão reutilizados como prova. A política dos guias permanece inalterada.

O contrato `public-editorial-automation.md` exige: “Obtain specific authorization for the real service identity and its external key custody/provisioning, without changing permissions or spending by implication.” Esse onboarding existente não é repetido. O fluxo complementar explicita permissões mínimas por job para preparar um branch de conteúdo, solicitar CI e integrar somente após os gates; a revisão concreta do workflow precede sua ativação. Não há ampliação global, bypass de proteção, nova custódia ou custo.

O contrato `public-horoscope-reconstruction.md` dizia: “A política automática atual cobre guias educativos permanentes; não autoriza previsão datada.” A política antiga continua restrita. A nova política `atvna-horoscope-policy-2026-10-20-v1` admite somente o tipo `horoscope`, risco `general-symbolic-dated-horoscope`, com o método e requisitos adicionais deste ADR e do contrato complementar.

A skill `atvna-editorial-approval` exige “decisão explícita registrada, contrato/ADR atualizado e verificador testado com identidade de automação legítima, sem disfarçar a IA de revisor humano”. O pedido do proprietário é a autorização de produto; a skill não é a fonte dessa autorização. A passagem de revisão precisa ser realizada por um agente diferente do redator e registrar essa identidade real. O arquivo não transforma uma autoavaliação do redator em revisão independente.

## Escopo exato da extensão

- `policyVersion`: `atvna-horoscope-policy-2026-10-20-v1`.
- `allowedKinds`: somente `["horoscope"]`.
- `risk`: `general-symbolic-dated-horoscope`.
- `methodVersion`: `atv-solar-symbolic-sectors/1.0.0`.
- `keyId` e `reviewerId`: os mesmos acima; chave pública conferida contra o registro previamente provisionado.
- Cada execução: um único período `daily`, `weekly` ou `monthly`, uma cobertura civil UTC e exatamente os doze signos; sem intervalo aberto.
- `reviewMode`: `reviewed-corpus-and-runtime-verification`. O corpus, o algoritmo, a seleção editorial e amostras reais dos três períodos recebem revisão independente identificada. O parecer vincula os digests exatos; qualquer alteração exige nova revisão.
- Cada lote congela documento, mapa de afirmações, fatos completos, método, relatório de verificação automática e manifestos. A concessão associa o parecer independente do corpus aos mesmos digests. Assinatura Ed25519 cobre seus bytes exatos.
- Cada execução verifica novamente seus fatos, a reprodução integral da composição, diferenças entre signos, limites e cobertura; exige assinatura e gates. Isso não é uma nova revisão interpretativa individual. A divulgação pública distingue as duas etapas.
- A concessão cobre apenas os três períodos, a versão congelada e datas finitas. `coverageFrom` permite o mês corrente do bootstrap; `validFrom` corresponde à concessão assinada e `validUntil` não ultrapassa a validade da chave existente. Expiração exige renovação explícita.
- A atestação vale até 24 horas para admissão. O arquivo publicado continua consultável depois da expiração; “atual” depende da cobertura, nunca da data da última publicação.

## Pipeline e limite de prontidão

1. Calcular o período real com o adaptador Caelus autorizado; conferir grade, versão, origem, seleção e digest.
2. Compor os doze documentos pelo corpus versionado: a relação entre corpos, o aspecto ou mudança observada, os setores e a distribuição temporal modificam a interpretação e sua síntese. Registrar cada parágrafo com os fatores, amostras e setores usados.
3. Antes de habilitar uma versão, congelar corpus e algoritmo e obter revisão independente desses materiais, dos 36 documentos reais de dia/semana/mês e de testes de contraste. O piloto autoral diário tem parecer próprio e não aprova o compositor recorrente.
4. Em cada execução, reproduzir os doze documentos e mapas de afirmações integralmente; rejeitar qualquer divergência, falta de cobertura do corpus ou resultado repetido entre signos. Recalcular a base pelo adaptador real na etapa de assinatura. O texto público informa que essa verificação automática não é nova revisão individual.
5. O workflow complementar valida novamente arquivos, parecer congelado e concessão finita; somente então usa a chave já em custódia. Chave privada nunca é baixada, impressa ou enviada ao app.
6. Validar assinatura, fatos, manifesto e admissão no app; executar gates e CI para o commit exato e somente então integrar e publicar. As permissões de escrita ficam nos jobs necessários, o restante permanece somente leitura. Falha de gate não autoriza integração.

O preparador oferece bootstrap dos três períodos correntes e renovação às 20:15 UTC, com segunda tentativa às 22:15 UTC, para o próximo dia, incluindo semana ou mês quando começam no dia seguinte. Um mutex comum protege agendamento e bootstrap. Cada pacote tem exatamente uma cobertura; o índice da execução enumera pacotes e digests. Repetir uma cobertura preserva os bytes e datas já admitidos; somente o relógio validado de execução `provenance.calculatedAt` é desconsiderado na comparação factual de idempotência. O fluxo deve concluir gates e publicação antes da cobertura seguinte; atrasos não mudam a data do texto anterior. A operação recorrente só é pronta quando assinatura, admissão, CI, integração e cobertura hospedada estiverem demonstradas. Até lá a interface mantém disponibilidade honesta e acesso ao arquivo e aos guias educativos admitidos.

## Rejeições obrigatórias

Não admitir ausência de revisão, revisor igual ao redator, alegação de revisão humana, fato só em metadados, snapshot divergente/duplicado, cálculo usado como interpretação natal, limites omitidos, seleção artificial para preencher quota, aconselhamento individual de alto risco, datas adulteradas, digest divergente, assinatura sintética, chave diferente da custódia existente, autoridade revogada ou qualquer pacote fora do lote finito.

## Rollback

Suspender novas admissões dessa política e remover a admissão afetada; preservar evidência de auditoria. Não alterar, reemitir ou afrouxar a política evergreen para contornar uma rejeição.
