# Continuidade estruturada — atv-continuity/1.0.0

Contrato experimental da WU-081 para a seção de memória longitudinal do V3. Não é ativação de ATV+, persistência de memória, autorização ou envio a um modelo. `prepareContinuityContext` permanece desligado por default e retorna `publication: blocked` mesmo quando a preparação passa. Nenhum modelo está homologado.

## Curadoria e proveniência

`ContinuityItem` pertence a um usuário e referencia um run/produto. A relevância é explicitamente `relevant`, `irrelevant` ou `unreviewed`; somente a primeira pode entrar numa seleção. Relatos curtos (até 600 caracteres) representam temas, eventos, recorrências percebidas pelo usuário, preferências, símbolos e mudanças. Não há extração automática nem comprovação de recorrência, causalidade, emoção ou diagnóstico.

Resultados anteriores selecionam o título persistido; hipóteses selecionam uma seção exata da interpretação persistida. O texto não pode ser substituído pelo cliente e permanece rotulado `prior-interpretation`, nunca fato novo. Ciclos referenciam um fato calculado único de um produto da família `cycles`, rotulado `calculated-experimental`: a categoria não transforma uma amostra em evento temporal ou certifica sua precisão. O texto selecionado não pode exceder 1.200 caracteres; não há resumo ou recorte silencioso.

## Consentimento e disponibilidade atuais

`atv-continuity-consent/1` exige finalidade `reading-context`, proprietário, estado atual e escopo explícito de até 100 runs. O booleano histórico `WorkflowInput.consent.continuity` não substitui esse consentimento atual. Revogação ou retirada de um run do escopo bloqueia a reconstrução; não existe fallback para outro consentimento, marketing ou compartilhamento. Não há consentimento presumido a partir de entitlement ATV+.

O repositório confiável deve reler consentimento, itens e fontes **antes de cada uso**, com autenticação, RLS e gates atuais. `ContinuitySource.available` é uma atestação do servidor, jamais campo aceito de HTTP. Todas as fontes precisam estar READY, pertencer ao mesmo usuário, corresponder ao produto e ter cálculo/interpretação. Ownership em objeto não substitui autenticação. Exclusão, revogação ou indisponibilidade da fonte bloqueiam a preparação. Nenhum contexto derivado pode ser cacheado para contornar nova leitura. Revogação concorrente precisa ser verificada no limite de uso pelo futuro executor; esta função pura não fornece transação nem elimina cópias já enviadas.

## Minimização e controle

O chamador entrega **somente** os itens explicitamente selecionados (1–12) e as fontes correspondentes (até 12), sem registros duplicados/ambíguos. Itens extras, ausentes, irrelevantes, não revisados ou de outro proprietário bloqueiam a operação inteira. Ordem é a da seleção; não há ranking inferido.

O contexto possui aliases locais `i1`/`s1`, produto/universo, trechos selecionados, origem e todos os limites das fontes, deduplicados sem alteração do texto. Não copia input, narrativa integral, nascimento, coordenadas, e-mail, dados arbitrários de cálculo, seções não selecionadas, owner/run/item IDs ou credenciais de promoção. Uma nota curada ainda pode conter dados íntimos: minimização não é anonimização nem DLP; interface e executor deverão permitir revisão/remoção e controlar o destino.

O manifesto local separado conserva item/run/revisão para auditoria e remoção de derivados. Não deve acompanhar o payload de modelo ou telemetria pública. Teto fixo de 12.000 bytes UTF-8 sobre o contexto serializado; excesso retorna `context_too_large`, sem truncar itens ou ressalvas. Falhas retornam apenas códigos, sem conteúdo/identidade.

Todo texto é dado não confiável, inclusive instruções adversariais preservadas como relato. O rótulo `untrusted-data-not-instructions` é metadado de contrato, não proteção completa contra prompt injection: o gateway deve separar dados de instruções, aplicar os gates de segurança/evals/revisão e não conceder ferramentas/autorização a esse conteúdo.

## Pendências verticais

Persistência privada, edição/exclusão, consentimento revogável em UI, integração Biblioteca/dashboard, auditoria de acesso e executor com revalidação transacional ainda não estão implementados por esta WU. Não conectar diretamente a payload de usuário ou ao gateway antes dessas fronteiras. Não há migração hospedada, provider, envio de histórico ou inferência longitudinal ativa.
