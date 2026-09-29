# Dossiê do Casal — resultado web/PDF local, 29/09/2026

RUN_ID: `ATV-20260902-170644Z-01A0630F`. WU170, requisito independente de E4: apresentar integralmente a base e o perfil próprio das WU165–169, com PDF recuperável. Política `synthetic-couple-dossier-reader-not-approved@qa-fixture-1` e recibos `fixture-not-approved` identificam espécimes estruturais sem aprovação.

Entrega 1.15: grupos separados A/B, cem pares em dez grupos canônicos, dezenove hipóteses, nove temas, três conexões, duas sínteses e três perguntas práticas. Contexto relatado opcional, origem completa, limites e histórico são conservados. As exceções de 121 referências/300 caracteres de fonte se limitam a Sinastria e Dossiê; demais budgets permanecem. Estados pendente/revogado/falho ocultam leitura e formatos. A rota de fixture continua restrita ao teste local.

Validação local:

- Worker 173/173; projeções Dossiê/Sinastria 6/6; tipos Worker PASS.
- Leitor/PDF/formatos privados 11/11; regressão de continuidade, Biblioteca e artefatos 57/57; banco/recuperação/rollback do PDF 11/11. Persistência do formato próprio confirma igualdade de bytes/digest, idempotência, privacidade, revogação e proprietário distinto.
- Svelte: zero erros e zero avisos. Build de teste local PASS. ESLint focal, Prettier, diff e secrets staged: `test-results/wu170-*`.
- Playwright: 18 casos únicos aprovados, seis Dossiê, seis Sinastria e seis Preview do Par. Primeira rodada: 14/18; três casos longos Dossiê e uma navegação Preview excederam 30 segundos. Corrigida a espera após reload para uma asserção que aguarda o conteúdo; os quatro casos restantes passaram com um worker. O teste visual longo do Dossiê admite 60 segundos. Nenhuma condição funcional foi removida.
- Quatro larguras: 1440, 820, 390 e 320. Navegação por teclado, reabertura, fatos preservados, ações indisponíveis, estados privados, contexto ausente e ausência de overflow horizontal.

PDF `test-results/wu170-couple-dossier-reader.pdf`: 38 páginas A4, 94.330 bytes. Duas exportações idênticas. Extração confirma 121 IDs de fatos, cem pares, dezenove títulos de hipóteses e todas as 35 seções, sem faltas. As 38 páginas foram renderizadas e conferidas nas sete grades de `wu170-pdf-pages`: margens, fontes, paginação e continuidade sem corte ou sobreposição. O renderer 1.2, seus budgets e a política de recuperação histórica não foram alterados; extensão e desempenho de futuro conteúdo editorial precisam respeitar o mesmo contrato.

As vinte capturas do Dossiê estão em `test-results/wu170-web/`. Conferência visual focal: base em 1440, temas em 320, origem em 820 e histórico em 390. Títulos, IDs, fontes longas e listas quebram dentro da coluna; navegação e ações continuam legíveis. Capturas completas documentam o conteúdo sintético, sem certificar leitura aprovada ou sessão hospedada.

Provas: `wu170-delivery.log`, `wu170-worker.log`, `wu170-worker-types.log`, `wu170-reader.log`, `wu170-pdf-save.log`, `wu170-regression.log`, `wu170-artifact-db.log`, `wu170-e2e.log`, `wu170-e2e-retry.log`, `wu170-web-check.log`, `wu170-lint.log`, `wu170-format-check.log`, `wu170-pdf-extraction.json`, `wu170-diff.log` e `wu170-secrets.log`. CI169 `36558167622` SUCCESS; CI170 será verificado após push.

Aceite E4 integral BLOQUEADO: implementação e QA locais aprovadas com espécime estrutural, sem conteúdo/revisão legítimos nem validação hospedada. E1/E2/E3 continuam BLOQUEADOS conforme as provas anteriores. E5 permanece pendente da consolidação do percurso e de seus requisitos reais. Nenhuma fixture converte um marco integral em concluído.

Responsáveis/ações preservados: motor/editorial devem homologar política/base e fornecer interpretação útil/revisão legítima; proprietário deve retomar Supabase `irgnhvouvzyoqfmltrna` e confirmar acesso para sessão/RPC/artefatos hospedados. Cloudflare administrativo segue com 403 registrado. Sem nova migração, consulta de bloqueio inalterado, chamada paga, flags de liberação ou publicação. R$0; 17 alterações paralelas preservadas. Próxima WU: E5 próprio, com aceite delimitado e avanço automático pela fila.
