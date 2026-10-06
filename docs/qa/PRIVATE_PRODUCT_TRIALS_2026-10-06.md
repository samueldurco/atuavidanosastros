# Teste privado gratuito dos produtos e ATV+

RUN_ID: ATV-20260902-170644Z-01A0630F. Decisão do proprietário de 06/10/2026: combinação de IA e textos editoriais originais, critérios executáveis para aprovação automática, teste gratuito na identidade Google existente, aceite pessoal de cada produto antes de preços e Hotmart.

## Entrega

Os 25 IDs do catálogo usam entrada consentida, cálculo/processamento real versionado, composição editorial assistida por IA ligada a cada fato, revisão automática no servidor, salvamento privado e reabertura. A Bússola acrescenta quatro capítulos sobre MC, contribuição, possibilidades de trabalho e experimento reversível; contexto relatado não altera a geometria. Tarot usa as cartas efetivamente sorteadas e preservadas. Sonhos preservam o relato e apresentam hipóteses alternativas. Atlas dos Sonhos e Dossiê usam somente registros selecionados da própria biblioteca, mediante consentimento.

A aprovação compara a leitura com a composição canônica e registra política, corpus e SHA-256 de entrada/cálculo/conteúdo. Nenhum texto, hash ou flag enviado pelo cliente concede aprovação. A skill pessoal `atv-aprovar-interpretacoes` foi instalada e validada; sua referência versionada acompanha o repositório. O corpus original foi produzido com assistência de IA e revisão editorial; não existe chamada paga de inferência nem envio dos relatos a um modelo externo nesta versão.

Resultados incluem o formato previsto no catálogo: web, PDF completo, cartografia SVG e reprodução de áudio local quando aplicáveis; TXT oferece recuperação integral. Jornadas permitem notas próprias nas etapas previstas. ATV+ reúne os seis universos, 25 produtos, biblioteca e prática diária/semanal/mensal. Aprovar ou pedir ajuste é uma decisão pessoal persistida, separada da revisão automática.

## Privacidade e persistência

Schema aditivo com seis tabelas, RLS por `auth.uid()`, acesso nominal revogável e consultas explicitamente limitadas ao dono. Clientes não inserem leituras aprovadas nem alteram grants; serviço escreve apenas depois da validação. Triggers verificam o grant no momento da inserção. Feedback vincula produto, leitura e dono; notas e registros têm chaves estrangeiras próprias. API valida origem, tamanho, consentimento e idempotência; um retry mantém a mesma chave. Respostas privadas não são armazenadas em cache nem indexadas. Rollback revoga os grants e preserva as leituras, sem apagar evidências.

A consulta administrativa identificou exatamente uma conta confirmada com identidade Google correspondente à solicitação. O email e o UUID não fazem parte dos arquivos versionados. A migração `20261006140000` e o grant nominal foram aplicados em transação isolada via CLI, sem executar as demais migrações pendentes. Uma segunda consulta comprovou registro da migração, seis tabelas com RLS, grant nominal ativo, leitura anônima negada, inserção de aprovação pelo cliente negada e ausência de seeds de leituras em produção. CI, deploy e smoke hospedado permanecem pendentes nesta revisão.

## Evidência local já concluída

- Banco PostgreSQL/PGlite: 111 testes aprovados, incluindo isolamento, revogação concorrente, expiração, rejeição de aprovação falsa e rollback.
- Cálculo, composição e formatos: 44 testes aprovados, cobrindo os 25 produtos reais no conjunto local sintético, todos os dez PDF e três SVG previstos no catálogo. Autorização e regressões de download completam 62 testes focais aprovados.
- Autorização/API: seis testes passaram sobre claims verificados, RPC, fontes próprias, origem e limites.
- `pnpm check`: aprovado; Svelte sem erros ou avisos.
- Skill: `quick_validate.py` aprovado e instalação pessoal confirmada.
- PDF do Mapa Astral: dez páginas com fatos e proveniência completos; contato das dez páginas, primeira e última inspecionados visualmente, sem corte ou sobreposição e com fontes incorporadas.
- Playwright: 11 testes aprovados sobre entrada, resultado, consentimento, retry, aprovação pessoal, ATV+, autorização e acessibilidade em viewport de 320px. O formulário aguarda a inicialização antes de aceitar envio.
- Lint e build completos aprovados. A primeira suíte global passou nos demais pacotes e encontrou três limites de tempo na web sob concorrência pesada; os dois PDF foram corrigidos por cache de métricas de fonte, e os 62 testes focais passaram em 8,53 segundos. A validação global final ocorre no CI.
- Auditoria das dependências: nenhuma vulnerabilidade conhecida após patches transitivos `source-map-js` 1.2.2 e `postcss-selector-parser` 7.1.6.

Logs extensos ficam fora do Git em `E:/ATVNA/.worktrees/trials-*.log`; artefatos sintéticos em `apps/web/.trial-qa`. A suíte Playwright usa fixture apenas local para renderizar os componentes reais: ela não prova sessão Google nem aceite pessoal hospedado. O grant remoto é comprovado pela consulta ao banco; a configuração de escrita do servidor será verificada no deploy pelo endpoint de disponibilidade, que não expõe conta ou credenciais.

## Estado e limites

Esta é uma liberação privada para experimentar, sem cobrança. A base astrológica experimental mantém seus limites visíveis; não é promovida a motor homologado. Gates comerciais, editoriais gerais e modelos continuam vigentes. E1–E5 comercial e a conclusão de todo o plano não são afirmados por esta entrega. Homologação de motor, aceite pessoal e requisitos posteriores de comercialização permanecem distintos. Nenhum preço ou integração Hotmart foi cadastrado.
