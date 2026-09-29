# Semana — PDF privado, WU184

RUN_ID: `ATV-20260902-170644Z-01A0630F`. Requisito E4 da arquitetura original: PDF recuperável da Semana. Implementação e validação locais, com identidades e leitura sintéticas. Estado do catálogo continua `PREPARING`; nenhuma liberação hospedada ou aprovação editorial é demonstrada.

## Entrega

O catálogo declara web/PDF. O exportador existente `atv-pdf-export/1.2.0` preserva a projeção privada integral: intervalo, base natal, sete amostras de 12h UTC, contexto quando informado, oito hipóteses e suas referências, síntese/três perguntas, fatos/fontes, limites e histórico. A implementação não transforma amostras em dias locais inteiros nem cria previsão ou resumo por áreas.

A migração `20260929130000_week_reading_pdf_artifacts.sql` estende somente a allowlist PDF do produto. O forward-fix `disable_week_reading_pdf_artifacts.sql` restaura a função anterior, bloqueando novas gravações e preservando recuperação autorizada de artefatos imutáveis. Nenhuma política ou release é habilitada fora da fixture local.

## Provas

- `test-results/wu184-pdf-tests.log`: 12/12 testes de renderização/integração. Os dois casos Semana validam leitura integral, metadados/paginação, determinismo, PDF sem SVG, gates, revisão/digest/proprietário, bytes recuperados, MIME/cache/hash, listagem única/idempotência, forward-fix/reaplicação e revogação.
- `test-results/wu184/extraction-proof.json`: dois PDFs de 21 páginas, 61.359 e 60.487 bytes; respectivamente 89 fatos/19 seções e 88 fatos/18 seções. As 682/668 verificações de conteúdo extraído não encontraram ausências. Cabeçalho e rodapé repetidos são retirados apenas da comparação textual entre páginas; o conteúdo original permanece literal.
- `test-results/wu184/pages-{context,no-context}/`: 42 PNGs Poppler e oito folhas de contato inspecionadas; páginas de síntese e histórico também inspecionadas em tamanho integral. Texto, acentos, ΔT, fontes, margens, referências extensas, limites, números de página e histórico legíveis; sem cortes ou sobreposição.
- `test-results/wu184-domain-tests.log`: 29/29; `wu184-web-check-final.log`: zero erros/avisos; `wu184-eslint.log`: PASS.
- CI anterior WU183 `36585302809`: SUCCESS no SHA `bc0c3acd95d94877a44c614d84520bb2372b9506`, prova `test-results/wu184-ci183-success.json`.

- `test-results/wu184-web-tests.log`: 1.425/1.425 testes em 70 arquivos. `wu184-e2e.log`: 6/6; leitura em 1440/820/390/320 px, teclado, ausência de overflow, reabertura estável, contexto ausente e estados privados indisponíveis. PDF desabilitado na fixture sem release e ausente nos estados pending/failed/revoked.
- `test-results/wu184-format-check.log`, `wu184-diff-check.log` e `wu184-secrets.log`: gates finais de formato, diff e segredos PASS.

## Limites e continuidade

E1/E3/E4 permanecem parciais. O PDF transporta conteúdo sintético exclusivamente para QA; não satisfaz E2/E5. Resumo por áreas, escopo temporal completo, motor homologado e interpretação/autoridade legítimas continuam pendentes. Supabase pausado e acesso administrativo Cloudflare bloqueiam a validação externa já registrada. Gates preservados, R$0, sem chamadas a modelos ou alteração dos 17 arquivos paralelos.
