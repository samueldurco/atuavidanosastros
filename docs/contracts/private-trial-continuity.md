# ATV+ — base consentida dos testes privados

RUN_ID `ATV-20260902-170644Z-01A0630F`. RECON-22, 08/10/2026. Versão `atv-private-trial-continuity/1.0.0`; autorização `atv-trial-continuity-consent/1`. Complementa os contratos de seleção e contexto existentes. Esta base usa as leituras de `atv_trial_readings`; não atribui estado READY aos `product_runs` do executor legado.

## Escopo autorizado

A conta escolhe uma leitura ou jornada própria e os itens que deseja guardar: título, um capítulo ou relato literal. Temas, recorrências, acontecimentos, preferências, símbolos e mudanças são relatos da pessoa, separados de interpretações anteriores. Nenhuma leitura, recorrência ou memória é incluída automaticamente. A caixa de autorização começa desmarcada, inclusive na reabertura e após qualquer alteração. Salvar exige escolha explícita; nenhuma execução de interpretação é habilitada nesta entrega.

`/testar-produtos/atv-plus` oferece seleção, conferência, salvamento e remoção. O cliente recebe apenas IDs/títulos de suas leituras e títulos dos capítulos para escolher; o texto autorizado é relido pelo servidor. O contexto preparado pode ser conferido como texto escapado. Recusar ou apagar a autorização preserva as leituras de origem. A gestão da revogação continua disponível à conta autenticada mesmo quando seu acesso aos testes foi revogado.

## Autoridade e persistência

`GET/POST /api/private-trials/continuity` usa a sessão verificada, respostas privadas `no-store`, prazo de dez segundos e comandos limitados a 35.000 bytes. O POST exige mesma origem e exatamente `revision`, `granted`, `items`; cada item possui somente `id`, `readingId`, `selection`. IDs são UUIDs normalizados, sem duplicatas. Até doze itens; relatos até 600 caracteres, sem controles proibidos; capítulos reais entre 0 e 63. Seletores de ciclos e campos de autoridade enviados pelo cliente são recusados.

A migração `20261008190000_private_trial_continuity.sql` mantém política, estado e itens separados das leituras. RLS e ausência de permissões diretas impedem o acesso às tabelas por `anon`, `authenticated` e `service_role`. Apenas a conta autenticada pode chamar `read_atv_trial_continuity` e `set_atv_trial_continuity`; ambas conferem `auth.uid()`. O RPC de escrita usa trava por conta e revisão comparada atomicamente. Conflito retorna 409 sem sobrescrever nem repetir o comando; o rascunho permanece na página para revisão.

Uma nova autorização exige acesso gratuito vigente, coleta habilitada e fonte própria, ativa, aprovada para `private-free-test` por política admitida. Os cinco Tarot retirados não podem fornecer contexto. A propriedade é protegida também por chave estrangeira composta. As validações antecedem a substituição atômica; a revisão avança uma vez. Revogar exige lista vazia, apaga todos os itens e continua permitido com acesso ou coleta desabilitados.

## Minimização e uso futuro

Cada leitura fresca do RPC retorna o estado corrente. O texto de uma fonte fica indisponível após arquivamento, perda de acesso, suspensão da coleta ou da autorização; exclusão da leitura remove seus itens por cascata. A projeção admite somente o título/capítulo escolhido ou o relato literal, produto, versão, política, digest e limites verificáveis. Entradas de nascimento, cálculo completo e outros capítulos não são carregados como contexto.

O preparador produz aliases locais `s1`/`i1`, origem `user-reported` ou `prior-interpretation`, categoria, texto, universo e limites. Não exporta IDs da conta/leitura, email, digest ou dados de nascimento. Marca o conjunto como dados não confiáveis, sem força de instrução. Recusa fonte ausente, texto acima de 1.200 caracteres ou contexto serializado acima de 12.000 bytes; não corta silenciosamente o conteúdo. A pessoa pode selecionar um relato menor ou remover itens. O texto livre pode conter dados que a própria pessoa decidiu escrever; a aplicação não os infere nem acrescenta.

`execution: disabled` e `publication: blocked` permanecem explícitos. Um futuro executor exige nova leitura das fontes, acesso e autorização, com proteção transacional contra revogação entre a conferência e o uso. O contexto preparado não pode ser reutilizado como cache de autorização ou aprovado como nova interpretação. Esta base não concede continuidade comercial, entitlement, READY legado nem publicação pública.

## Recuperação e evidência

O forward-fix `supabase/rollback/20261008190000_private_trial_continuity.sql` desabilita a coleta sem destruir leituras, registros existentes ou a possibilidade de revogar. Os testes de banco cobrem propriedade, validação atômica, permissões, revisão, arquivamento/exclusão, perda de acesso e forward-fix. Testes de aplicação cobrem a projeção mínima, sessão, RPC, origem, erros e gestão sem acesso ativo. E2E locais usam conta/leituras sintéticas e respostas interceptadas identificadas; provam a interface, não persistência hospedada ou autorização do proprietário.

E1/E3/E4 têm implementação e validação locais. E2 é apenas preparação do motor, conforme autorização; não há interpretação artificial. E5 integral depende de migração/release com gates, sessão legítima, salvamento/reabertura/revogação hospedados e aceite correspondente.
