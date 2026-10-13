# Ferramentas gratuitas — revisão técnica de segurança

Data: 13/10/2026. Base: `codex/free-tools-navigation`, worktree `free-tools-navigation-20261013`. Esta revisão cobre a implementação e as provas locais. A execução mestra informou a implantação da função Edge pública e da migração hospedada `20261013115721`; a validação HTTP hospedada continua sob revisão da execução mestra. Este registro não substitui os gates editoriais ou de liberação.

## Escopo e resultado

Foram revisados os seis IDs públicos `ascendente`, `mapa-astral`, `carta-do-dia`, `tarot-sim-ou-nao`, `combinacao-do-casal` e `registro-de-sonho`. O cálculo anônimo é separado da gravação autenticada. Não há chamada a modelo pago, uso de grant privado ou encaminhamento ao `atv-trial-runtime`.

A cadeia final de confiança é adequada para revisão local: cálculo no servidor → resultado versionado com UUID e horário do servidor → HMAC → verificação antes da escrita → INSERT por servidor → leitura e exclusão com RLS do proprietário. O backend está implantado conforme confirmação da execução mestra; ainda falta concluir a validação dos percursos HTTP hospedados e confirmar seu resultado na evidência de liberação.

## Cálculo público e mandala

- `apps/web/src/lib/server/free-tools-calculation.ts` usa o provedor Caelus, `parseCalculationInput`, o cânone existente e a geometria `longitudePoint` dos mapas salvos. As posições permanecem numéricas no resultado; truncar os graus exibidos evita rotular 30° dentro do signo anterior.
- A mandala usa dez posições calculadas, doze cúspides quando disponíveis, ASC e MC reais. Zero de Áries fica à esquerda; longitudes crescem no sentido anti-horário. Trilhas radiais distinguem corpos e não representam distância. Linhas de casas/ângulos não são aspectos.
- Casas e ASC são suprimidos quando indisponíveis, incluindo latitude absoluta a partir de 66°. A ferramenta Ascendente responde com indisponibilidade em vez de substituir o sistema de casas. Os limites experimentais, UTC/UT1 e fuso histórico acompanham o resultado.
- O Tarot sorteia no servidor com UUID próprio e algoritmo existente de SHA-256/Fisher–Yates com rejeição de viés; não aceita carta ou semente do cliente. O resultado salvo preserva o sorteio. Sim/Não não inventa um veredito binário.
- Casal exige consentimento para calcular as duas entradas, sem inferir autorização para compartilhar ou salvar. Não inventa aspectos ou percentual de compatibilidade. Sonhos preservam relato, emoções e associações informados; não geram significado, diagnóstico ou recorrência sem evidência.
- Horóscopo pessoal gratuito permanece fora deste contrato: não há liberação implícita do método privado nem promessa de resultado público que ainda não tenha contrato factual próprio.

## Fronteiras da API e do Edge

- `/api/free-tools/[tool]` é público e não consulta uma conta para calcular. Aceita somente IDs públicos e entradas limitadas; recusa origem divergente quando presente. Erros externos retornam códigos limitados, sem relato ou credencial.
- O pedido de cálculo está limitado a 32 KiB tanto na rota quanto no handler Edge, por bytes efetivamente lidos. O Edge rejeita UTF-8 inválido. O teste de relato com 6.000 caracteres multibyte confirma compatibilidade entre o limite textual e o limite de transporte.
- `free-tools-runtime.ts` importa o motor somente no ramo local. Em hospedagem encaminha ao `atv-free-tools-runtime`, com prazo de 30 segundos; não calcula na CPU do Pages como contingência. Verifica tamanho, schema, ferramenta e HMAC do resultado remoto.
- A função pública usa `verify_jwt = false` porque o cálculo é anônimo. Seu pacote não contém cliente de banco, chave service role, imports Node ou runtime privado. A chave HMAC é recebida por ambiente no servidor.
- Cálculo e gravação retornam `private, no-store`. A ausência de chave permite cálculo local com `receipt: null`; a função hospedada falha explicitamente sem chave válida. Não há confirmação fictícia de salvamento.

## Recibo, gravação e leitura

- `FREE_TOOL_RECEIPT_KEY` é exclusiva destas ferramentas e precisa ter pelo menos 32 caracteres. Edge e Pages devem receber a mesma chave. A revisão não revela nem registra seu valor.
- `free-tool-receipt.ts` usa HMAC SHA-256 via Web Crypto. Canonicaliza chaves de objetos para sobreviver à representação JSONB; preserva a ordem dos arrays. Alterar UUID, ferramenta, horário, carta, fatos ou seções invalida o recibo. A validade para gravar é de 48 horas, com tolerância máxima de 60 segundos para horário futuro.
- `/api/free-tools/save` obtém o proprietário de `getClaims().claims.sub`, não do corpo recebido. Valida schema e recibo antes de criar o writer privado. A chave `SUPABASE_SERVICE_ROLE_KEY` aparece apenas no servidor e somente esta fronteira confiável pode inserir. A busca do item da Biblioteca usa o cliente autenticado original, com filtro explícito do dono.
- `20261013115721_public_free_tool_results.sql` revoga os grants prévios inclusive de `service_role`. Concede a `authenticated` apenas SELECT e DELETE; a `service_role`, SELECT e INSERT. Não existe policy de INSERT autenticado, nem grant de UPDATE. Uma conta não consegue persistir JSON fabricado contornando o HMAC. O arquivo local foi renomeado para corresponder à versão aplicada no banco hospedado.
- A chave composta `(user_id,id)` e INSERT com conflito ignorado preservam o resultado no replay. O trigger que liga à Biblioteca usa `security invoker`, `search_path = ''` e tabelas qualificadas. Ler/excluir requer o próprio dono; excluir o resultado remove o vínculo.
- `library-reader.ts` usa cliente de sessão, filtros explícitos por dono e UUID e parser limitado. Não exige novamente o TTL para ler: depois de uma gravação válida, o resultado continua legível após 48 horas e rotação de chave. Isso depende de manter fechada a escrita direta no banco.

## Dados pessoais e apresentação

Pedidos de nascimento, casal, foco e sonho trafegam por POST para o cálculo. O motor público não escreve em banco e os handlers não registram o corpo em logs próprios. O banco recebe o resultado somente após ação explícita de salvar; relato e foco incluídos no resultado passam a integrar o item privado.

A UI usa `sessionStorage` para conservar resultado, recibo e formulário na mesma aba durante o percurso de login. Não usa `localStorage`. O prazo lógico de retomada é de 30 minutos, com descarte ao tentar restaurar um registro expirado; não equivale, por si só, à eliminação física imediata em uma aba que permanece aberta. O texto ou o mecanismo de limpeza deve representar essa diferença corretamente. Limpar a sessão ou salvar com sucesso remove o rascunho.

Textos são interpolados pelo Svelte, e o SVG gerado aparece como imagem `data:image/svg+xml` codificada, sem `{@html}`. A geração usa nomes canônicos e coordenadas calculadas; não incorpora markup informado pelo usuário. A revisão não certifica política global de retenção de logs da infraestrutura, isolamento de extensões do navegador ou atendimento de carga.

## Provas locais

- Vitest: **38/38 testes em 6 arquivos** passaram em 13/10/2026, execução iniciada às 08:56:18, duração 10,56 s: cálculo (12), recibo (5), API pública (5), Edge (4), save (5) e leitor da Biblioteca (7).
- Cálculo/API/Edge usam o motor e o sorteio reais com entradas sintéticas. Save usa cálculo e HMAC reais, simulando somente a conexão/sessão do banco para testar ordem de verificação, proprietário, writer e falhas sem vazamento.
- Testes do banco informados pela execução mestra e conferidos no log `E:/ATVNA/evidencias/free-tools-db-20261013.log`: **3/3 passaram**. Cobrem escrita anônima/autenticada negada, service role sem UPDATE, replay, isolamento do dono, exclusão do vínculo, schema e reversão anterior a dados. Esses testes usam banco de teste local, não provam os grants hospedados.
- `pnpm run build:free-tools-runtime`: pacote de **501.827 bytes**. O próprio pacote gerado foi executado com um sorteio real: HTTP 200, versão `atv-free-tool-result/1.0.0`, ferramenta `carta-do-dia` e recibo hexadecimal de 64 caracteres. Inspeção do pacote: sem imports Node, `atv-trial-runtime` ou `SERVICE_ROLE`.
- Diagnóstico de tipos: **0 erros e 0 avisos** após `svelte-kit sync`, registrado em `E:/ATVNA/evidencias/free-tools-security-check-20261013.log`. A declaração Env da chave de gravação está presente.
- ESLint focal de `free-tools-calculation.ts`: **PASS**. A supressão de `no-control-regex` se limita à expressão que rejeita controles C0/C1 intencionalmente, permitindo tabulação e quebras de linha; não modifica a validação.

## Reversão

Antes de existir qualquer resultado salvo, a migração aditiva pode ser revertida removendo somente seus objetos e reaplicada; o teste confirma preservação dos dados existentes da Bússola.

Depois de haver dados reais, **não usar DROP da tabela ou do trigger como rollback**: apagar uma tabela não executa os triggers DELETE por linha, e pode deixar vínculos da Biblioteca sem origem e eliminar relatos salvos. Preservar tabela, resultados e leitura; desativar novas entradas com migração corretiva que revogue INSERT de `service_role` e com retirada do endpoint de gravação. Restaurar a entrada apenas após corrigir e validar o problema. Não reabrir INSERT autenticado nem UPDATE durante uma reversão.

## Parecer editorial finito das ferramentas gratuitas

**Parecer em 13/10/2026: aprovado para o escopo breve e público descrito abaixo, após o ajuste de promessa do Tarot.** Foram aplicados `C:/Users/Usuãrio/.codex/skills/atv-aprovar-interpretacoes/SKILL.md` e `references/criterios.md` às fontes locais finais deste worktree. Este parecer não homologa produtos privados completos, não fecha E5, não altera gates históricos e não substitui o aceite do proprietário. A assinatura HMAC atesta integridade e origem do resultado; não representa avaliação editorial. A autorização de publicar as ferramentas gratuitas foi comunicada pela execução mestra, separadamente deste parecer.

- **Astrologia introdutória:** as hipóteses usam o signo calculado de cada fator e o cânone local. Sol apresenta participação e direção; Lua, acolhimento e condições de segurança; ASC, modo de começar. As três funções permanecem diferentes quando os três fatores ocupam o mesmo signo. O teste novo usa o motor real em uma entrada sintética com Sol, Lua e ASC em Capricórnio e, seis horas depois, confirma que Sol/Lua conservam os respectivos textos enquanto a hipótese do ASC muda. Isso verifica a ligação entre fato e texto breve; não prova a integração completa de um produto natal privado.
- **Casal:** compara somente os três fatores calculados de cada pessoa, exige `consent: true` antes do cálculo e propõe observar ou confirmar necessidades em conjunto. Não produz aspectos, nota de compatibilidade, reciprocidade, sentimentos atribuídos ao outro ou destino. A declaração de consentimento não certifica identidade nem autoriza compartilhar ou salvar.
- **Tarot:** o servidor sorteia uma carta real do baralho de 78 cartas; os textos de núcleo, recurso, excesso e ação vêm do registro correspondente no cânone. Foram conferidas variações de arcanos maiores e menores, incluindo Louco, Mago, Sacerdotisa, Seis de Espadas, Nove de Espadas e Dois de Ouros, além dos testes de sorteio real e da correspondência dos 78 nomes. O critério 16 proíbe decisão binária por cartas. O cânone disponível não contém mapeamento nem método versionado de tendência sim/não/talvez; `tarot-yes-no` continua retirado em `packages/domain/src/tarot-methods.ts`. Por isso, a condição necessária foi alinhar a promessa à reflexão existente. Verificado no código final: rótulo e título **“Tarot para uma pergunta”**, aviso anterior ao sorteio **“Uma carta para explorar sua pergunta. Esta leitura não responde sim ou não.”**. A URL `/ferramentas/tarot-sim-ou-nao` e o ID `tarot-sim-ou-nao` permanecem; método, cânone e sorteio não foram modificados.
- **Sonhos:** a entrega registra fielmente relato, data, emoções e associações fornecidos, explicita ausências e propõe perguntas de observação. Não inventa significado de símbolos, recorrência, contexto pessoal ou diagnóstico. O teste preserva inclusive um relato com instruções como texto literal, sem executar ou interpretar seu conteúdo.
- **Limites:** as hipóteses são simbólicas, condicionais e proporcionais à promessa breve. Resultados astrológicos exibem proveniência experimental, dependência de hora/local/fuso histórico e indisponibilidade de ASC/casas em latitude polar; não atribuem precisão garantida aos graus exibidos. Os textos não prometem diagnóstico, evento certo, lucro ou decisão factual. Horóscopo pessoal permanece fora deste contrato.

**Prova focal:** `apps/web/src/lib/server/free-tools-calculation.spec.ts`, Vitest 4.1.11, **13/13 testes PASS**, início 09:14:30 em 13/10/2026, duração 1,40 s; log `E:/ATVNA/evidencias/free-tools-editorial-20261013.log`. O novo teste contrapõe hora de nascimento e funções no mesmo signo com cálculo real. Os demais testes cobrem carta real e cânone, consentimento prévio, relato fiel e limites das entradas. O ESLint focal do arquivo de teste passou. A revisão semântica é finita: não afirma avaliar manualmente toda combinação natal, todo relato possível ou cada resultado aleatório futuro. A cobertura dos 78 nomes comprova correspondência técnica, não aprovação individual de todas as leituras privadas.

**Versões consultadas:** resultado `atv-free-tool-result/1.0.0`; métodos públicos `atv-public-natal-summary/1.0.0`, `atv-public-pair-three-factors/1.0.0`, `atv-public-single-card/1.0.0` e `atv-public-dream-record/1.0.0`; cânones `atv-humanistic-modern/1.0.0` e `atv-rws-interpretive-canon/1.0.0`; baralho `atv-tarot-78/1.0.0`; sorteio `sha256-counter-rejection-fisher-yates/1`; motor `atv-deterministic-contract/1`, provedor `caelus@0.24.1`, precisão `experimental-sampled`. O cabeçalho do cânone Tarot registra digest da fonte compilada `0390dc4eab1c1dd57dfe3313c05f1675de88e03fe4a210ad8c4331eb6c24544c`; esta revisão consultou o arquivo compilado local, sem alegar leitura independente do livro original.

**SHA-256 dos bytes das fontes finais revisadas:** os hashes abaixo vinculam este parecer ao snapshot de conteúdo, regras e apresentação. Não são recibos HMAC nem aprovam automaticamente conteúdo alterado depois. Caminhos relativos à raiz `E:/ATVNA/.worktrees/free-tools-navigation-20261013`:

```text
59a8e7f322872ada30b4b51032491045feca23737500f6ee31d0b5559a8c8663 apps/web/src/lib/server/free-tools-calculation.ts
7efbe8eaf352fd0c59c4848279df4fa0730b4cbcc4424d75f197c0c81c740e27 apps/web/src/lib/trials/reconstruction/canon.ts
46ae3d497a62b294899ae23d3092ebebaf0103ba420e4c76e18e27c7decf6137 apps/web/src/lib/trials/reconstruction/natal-canon.ts
ccee5143d0c87c0aac93af2df5d934bd8035dae4000853280b8d2bdcd09258f4 apps/web/src/lib/trials/reconstruction/tarot-canon.ts
07d46a5f165151e566513111cc2012872723138882259f3f8dd4c77a10ad223a apps/web/src/lib/data/free-tools.ts
e710f4d1b493835e41683a91f0e84c0bc5e0af585c7811a6896d26a7bbe9ec80 apps/web/src/routes/ferramentas/[tool]/+page.svelte
8d8af04642efcee324b7f8ca7ca8d6a8355cee71c79d37620d39e4be69420a56 apps/web/src/lib/server/free-tools-calculation.spec.ts
6a9a9b2f91c60360d28d08a24dc887e387de9acada852326e6224331c86917c2 packages/astrology/src/contract.ts
b330013fafaa11827ccca8f4b869c267aaa0029b602cbca0be9085d4f069272d packages/domain/src/tarot-methods.ts
```

Nenhum build, sync ou publicação foi executado nesta revisão final. O backend implantado e a migração hospedada são estados informados pela execução mestra; a validação HTTP hospedada e a atualização do pacote Edge com o título final continuam sob responsabilidade dela.

## Referências consultadas

As orientações atuais oficiais confirmam que grants e RLS precisam ser tratados juntos e que uma credencial de serviço deve permanecer no servidor: [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security). O uso de `security invoker`, schema explícito e permissões de função foi conferido em [Database Functions](https://supabase.com/docs/guides/database/functions). O [changelog](https://supabase.com/changelog) foi consultado; as mudanças recentes observadas não adicionaram bloqueador específico para esta migração aditiva.
