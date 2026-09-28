# Biblioteca: histórico paginado — WU-110

RUN_ID `ATV-20260902-170644Z-01A0630F`. Evidência local sintética, 28/09/2026.

## Entrega

Paginação privada 50+1 com keyset `created_at DESC,id DESC`, cursor resolvido no acervo ativo do proprietário e microssegundos preservados. Prazo compartilhado de 10s, respostas tardias ignoradas e nenhum retry automático. Resposta inválida/timeout não vira acervo vazio. Cabeçalhos privados, sem conteúdo ou timestamp na URL. Ver [contrato](../contracts/library-pagination.md).

Componente compartilhado da coleção mantém busca/filtros/contagem explicitamente locais à página, limpa filtros na navegação e oferece links para registros anteriores/mais recentes, inclusive sem JavaScript. Estados de cursor expirado, falha e página antiga vazia permitem recuperação. Continuidade não é revogada ao mudar de página.

## Validação

- 33 testes focais PASS: `test-results/wu110-focal-final.log`. Incluem 1.051 registros sintéticos em 22 páginas pelo cliente Supabase instalado, filtros por proprietário, cursor malicioso/expirado, fronteira com microssegundos, resposta inválida e deadline compartilhado.
- 1.206 testes web em 59 arquivos PASS: `test-results/wu110-unit-verified.log`.
- Check: zero erros/avisos, `test-results/wu110-check-final.log`.
- Build local e 59 E2E seriais PASS em 4,6min: `test-results/wu110-e2e-final.log`; paginação, leitor, Gate B local, continuidade e acessos. Inclui teclado, recarga, navegação sem JavaScript, reflow e alvo de 44px.
- Prettier/ESLint do escopo PASS: `test-results/wu110-format-final.log`, `test-results/wu110-eslint-final.log`. Lint global bloqueado por formatação em quatro arquivos concorrentes, preservados: `tiktok-credentials.spec.ts`, rotas admin server/Svelte e callback TikTok (`test-results/wu110-lint.log`).
- Falhas intermediárias corrigidas: ordem SDK `abortSignal(...).maybeSingle()` e prop não permitida em rota SvelteKit, resolvida extraindo `LibraryCollection`.

Capturas `test-results/wu110-library-{1440,820,390,320}.png` inspecionadas: hierarquia Atlas e reflow preservados. Banner de consentimento existente aparece sobre a região inferior; captura não certifica ausência de toda sobreposição. Navegação funcional coberta separadamente. Referência MEM-02 `f5af4d1cdd4542488d60e94fa2c9bafb`, projeto Stitch `2141801333950500965`; revisão visual parcial, não Gate B integral.

## Limites

O fetch sintético não prova PostgREST/RLS/JWT hospedados. Páginas são leituras independentes, sem snapshot transacional, busca global ou total global. Fixture limitada a localhost/127.0.0.1 e dados sintéticos. Não houve migração, gasto pago, envio, habilitação de release ou promoção. Nenhum modelo homologado; 13 bases parciais e 12 cálculos indisponíveis permanecem.
