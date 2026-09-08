# Biblioteca — leitor recuperável da Bússola

RUN_ID `ATV-20260902-170644Z-01A0630F`, WU-023. **LOCAL_QA_PASS / VISUAL_PASS_SCOPED** para o leitor de resultado MC; Gate B integral e produto interpretativo continuam abertos.

## Referências e adaptação

Leituras MCP de 08/09/2026: MEM-03 `58afdd10c4b7484d8167ea5c62b29ee3` e SH-03 `157daa1e0776415982d5ab65d092248f`, projeto `2141801333950500965`. Exportação feita somente a partir dos URLs devolvidos pelo MCP; nenhuma mutação no Stitch.

| Referência | SHA-256 HTML | SHA-256 PNG |
| --- | --- | --- |
| MEM-03 | `c55fd0989e954d7a7f35937200fec8c72cf6a08c8a67bca2fb344f37120f1f86` | `c9df44464a7a3a48afd55bb80d6f9b628a91b989b62e84ea6b08d08eb001aee1` |
| SH-03 | `842543a2caf3efc1ae630b5a797539548507ac4426daf67972b9dc27719cf5fd` | `67282d0c108355ce414a6d9d17a7b6e2e84ccfd69540e0f8a826f63f3cdeca2c` |

MEM-03 contém índice lateral, coluna de capítulos, metadados e ações à direita. O `ReadingShell` preserva essa hierarquia com texto limitado a 720px; em tablet o índice passa acima do conteúdo e em mobile as ações seguem a leitura. Breadcrumb, numeração de seções, bordas discretas e tipografia editorial preservam a intenção do arquétipo. Brand Kit, Bodoni/Newsreader/Onest e cores locais prevalecem sobre o Theme remoto.

A entrega atual contém um dado salvo: Meio do Céu, origem e limites. Capa de livro, capítulos de outros produtos, áudio, downloads, favoritos e alegações de precisão/criptografia do protótipo não são simulados. SH-03 tem trechos invisíveis no PNG; seu HTML complementa a leitura estrutural. MEM-03 fornece a referência visual principal. O aceite não abrange relatório premium, comércio ou a prancha completa de SH-03.

## Comportamento verificado

- `/biblioteca/[id]` exige sessão; item inexistente, arquivado ou de outro usuário não é exibido. As duas consultas aplicam filtro de proprietário e usam cliente de sessão sujeito ao RLS.
- ID inválido não consulta o banco. Signo, grau, longitude e proveniência inconsistentes não viram resultado válido. O fingerprint e campos extras de proveniência não chegam ao leitor.
- Salvar devolve o ID do item da Biblioteca; Bússola, coleção e dashboard apontam para esse item. Os campos de entrada já submetidos são preservados para salvar o cálculo correspondente.
- Respostas de Biblioteca/Dashboard/Conta têm `private, no-store`, `no-referrer` e `noindex`. JSON malformado, tipo incorreto ou corpo acima de 4096 bytes são recusados antes do cálculo.
- Estados de erro, formato sem leitor e limitação de casas não se confundem com resultado disponível.

## Gates observados

Em 08/09/2026: `pnpm check` (zero erros/avisos), `pnpm lint` e `pnpm test:unit` aprovados: 37 testes (16 IA, 16 web, 2 astrologia, 3 integrações). Reprodução offline das 20 amostras de benchmark concluída sem novas chamadas ao provider. `pnpm test:e2e`: **19/19**, com build real Cloudflare e Chromium local.

Capturas em `docs/qa/library-reader/`: 1440×1000, 820×1180, 390×844 e 320×800; sem overflow horizontal, navegação por âncora, um landmark principal e estados exercitados. Desktop e mobile comparados visualmente com MEM-03: índice/leitura/ações mantidos; conteúdo reduzido conforme o resultado realmente disponível; sem corte, sobreposição ou texto ilegível observados.

O erro anterior de chave no loop do índice foi corrigido; lint final aprovado. As proteções finais do gateway contra fatos insuficientes passaram no teste de IA reexecutado. Houve uma falha operacional ao redirecionar o relatório offline para uma pasta inexistente; execução corrigida usando `test-results/`, sem alteração do benchmark ou de seus resultados.

## Limites

As consultas e a gravação são verificadas com doubles locais; esta WU não demonstra uma nova sessão OAuth nem exercita RLS em banco vivo. As fixtures de interface só respondem em loopback. Não houve leitor de tela humano ou zoom nativo 400%; reflow a 320px não substitui esses testes. Não há novo modelo promovido, dado pessoal enviado a IA, migration, cobrança ou ativação comercial.

Rollback: reverter o commit da WU-023; as tabelas e os itens salvos continuam preservados.
