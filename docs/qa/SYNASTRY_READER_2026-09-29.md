# Sinastria — resultado web/PDF e aceite delimitado, 29/09/2026

RUN_ID: `ATV-20260902-170644Z-01A0630F`. WU163; requisito independente de E4: apresentar integralmente a base experimental e o perfil editorial WU156–162, com PDF recuperável. Todos os dados e textos usados em QA são sintéticos; política `synthetic-synastry-reader-not-approved@qa-fixture-1` e recibos `fixture-not-approved` não aprovam o produto.

Entrega 1.14: grupos separados A/B, cem pares sem seleção, dezenove hipóteses identificadas, nove dimensões, síntese e três perguntas, contexto relatado opcional, origem completa, limites e histórico. Parser permite 121 referências/300 fontes somente para Sinastria. Estados pendente/revogado/falho ocultam leitura e formatos. A rota de fixture permanece restrita ao teste local; nenhuma publicação ou chamada de provedor foi adicionada.

O PDF 1.2 mantém os budgets de 120.000 caracteres, 40 páginas, 8 MB e cinco segundos. A otimização usa as mesmas métricas e quebras, sem resumir conteúdo. A migração de renderer conserva as políticas existentes e tem reversão de escrita testada: versões 1.0/1.1/1.2 recuperadas pelos mesmos bytes/digest; 1.3 rejeitada; reaplicação anterior bloqueia escrita 1.2, preservando seu download; reaplicação nova permite retry idempotente. Artefatos desligados continuam indisponíveis.

Validação local:

- Worker: 156/156, incluindo três testes da projeção completa, imutabilidade e rejeições. Tipos Worker PASS.
- Leitor/PDF: 8/8. Regressão de continuidade, Biblioteca, artefatos, formatos e recuperação: 61/61. Web: zero erros e zero avisos.
- Banco/artefatos/domain: 15/15. A fixture de transporte usa entrada sintética do par com consentimento e tipo relationship; não representa aprovação editorial.
- Playwright local: 12/12, seis Sinastria e seis Preview do Par; larguras 1440, 820, 390 e 320, reabertura, teclado, estados e ausência de overflow horizontal.
- ESLint focal, Prettier, diff e secrets staged: evidências em `test-results/wu163-*`. CI162 `36547412906` SUCCESS; CI163 é verificado após o push.

PDF `test-results/wu163-synastry-reader.pdf`: 36 páginas A4, 89.553 bytes, fontes incorporadas, sem formulários/JavaScript. Duas exportações idênticas; extração confirma todos os 121 IDs de fatos, cem IDs de pares e dezenove títulos de hipóteses, sem faltas. Todas as páginas foram renderizadas e conferidas nas seis grades de `wu163-pdf-pages`; margens, glifos, paginação e continuidade sem corte ou sobreposição.

As vinte capturas estão em `test-results/wu163-web/`. Conferência visual focal: base em 1440, temas em 320, origem em 820 e histórico em 390. Títulos/IDs e listas extensas quebram dentro da coluna; navegação, ações desabilitadas e histórico permanecem legíveis. Os testes verificam os quatro tamanhos. Esta prova não certifica uma leitura real ou sessão hospedada.

Provas: `wu163-worker.log`, `wu163-worker-check.log`, `wu163-reader.log`, `wu163-regression.log`, `wu163-artifact-db.log`, `wu163-e2e.log`, `wu163-web-check.log`, `wu163-lint.log`, `wu163-format-check.log`, `wu163-pdf-extraction.json`, `wu163-staged.diff`, `wu163-secrets.log`, em `test-results/`.

Aceite E1–E5 consolidado: WU156/157 calculam e guardam a base experimental; WU158/159 preparam e avaliam sua estrutura editorial; WU160/162 demonstram intake e fluxo privado locais; WU163 demonstra resultado/formatos locais. E1 BLOQUEADO por política de aspectos, precisão/motor e validação hospedada; E2 BLOQUEADO por interpretação útil, modelo/conteúdo e revisão legítimos; E3 BLOQUEADO por autoridade de aprovação e sessão hospedada; E4 BLOQUEADO no aceite final por depender dessa leitura aprovada; E5 BLOQUEADO no percurso real completo. Nenhum desses marcos é convertido em concluído por fixtures.

Responsáveis/ações: proprietário e responsáveis do motor/editorial devem homologar a política/base e aprovar interpretação/revisão; proprietário deve retomar Supabase `irgnhvouvzyoqfmltrna` e confirmar acesso para provas de sessão/RPC/artefatos hospedadas. Cloudflare administrativo segue com 403 registrado. Não houve nova consulta por bloqueio inalterado, migração hospedada, alteração de flags, gastos ou liberação. Avançar pela fila para Dossiê do Casal, preservando as pendências.

WU164: CI163 `36551150007` falhou porque o teste tentava salvar evidências na pasta ignorada `test-results/`, inexistente no checkout limpo. Removidas as duas gravações do teste; as verificações do PDF continuam em memória. Reexecução focal: 3/3 PASS (`wu164-reader.log`). Os arquivos e a conferência visual da WU163 permanecem como evidência local; a correção não altera o renderizador ou o aceite do produto.
