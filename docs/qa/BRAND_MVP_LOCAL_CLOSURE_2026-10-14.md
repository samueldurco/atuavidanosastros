# ATVNA — fechamento local do MVP visual

RUN_ID: `ATV-20260902-170644Z-01A0630F`.
Direção aprovada e publicação autorizada pelo proprietário em 14/10/2026.
Base de integração: `3e09bc83e6ec9159b5098ecd69bba7758382b7aa`.

## Escopo integrado

- Marca, navegação, home, seis universos, catálogo e páginas dos produtos reais.
- 27 apresentações individuais, incluindo ATV+ e seis métodos atuais de Tarot; gravuras, texturas, cores e lettering com hierarquia própria.
- Conta, Biblioteca, Clube, ferramentas, leitores e entregas PDF/SVG adaptados sobre os fluxos existentes.
- Direção canônica em `docs/DESIGN.md`; direção anterior preservada em `docs/design/rascunhos` e acervo externo realocado com manifesto.
- Ativos locais WebP, fontes locais licenciadas e ícones PWA. Os originais aprovados permanecem preservados fora do app.

## Validação local

`pnpm check`, `pnpm lint`, build web, build trial runtime e build free-tools runtime: PASS.
Auditoria de dependências no nível low: PASS. Banco: 133 testes PASS. Worker: 355 testes PASS. Nove scripts de teste de raiz, testes editoriais e validação do piloto: PASS.

A rodada web registrou 2163 testes PASS, 13 ignorados e três falhas de caminhos temporários antigos `E:/`. Os três testes foram tornados portáteis com `tmpdir()`; a rodada focal posterior passou em 45 testes. O CI do commit de publicação deve confirmar novamente o conjunto completo.

A rodada integrada de 68 E2E teve 64 PASS, incluindo os 47 casos privados. As quatro falhas visuais foram corrigidas. A rodada final focal passou em cinco casos, cobrindo reflow em 320 px, os produtos reais em 320/1440 px, ampliação de 200%, falha de arte e download do PDF privado. A revisão final de exportação passou em 71 testes; PDFs renderizados e capturas públicas/privadas foram inspecionados.

Auditoria final de código: nenhum bloqueador crítico. Sem alterações semânticas em cálculos, autorização, endpoints, domínio, Supabase, migrações ou workflows. SVGs de apresentação são estáticos e locais, sem scripts, eventos ou referências externas. `git diff --check`: PASS.

## Evidências e limites

Logs e capturas extensas ficam em `C:/ATVNA/evidencias/brand-mvp-20261014/`, `C:/ATVNA/evidencias/mvp-*.log` e `C:/Users/samue/AppData/Local/Temp/atvna-mvp-public-qa/`.

Este registro comprova integração e validação locais. A publicação exige CI aprovado no commit exato, merge autorizado, confirmação Cloudflare e verificação HTTP dos arquivos servidos. O resultado hospedado será registrado no log canônico e no checkpoint externos; este documento não antecipa esse resultado.

Testes privados automatizados usam dados sintéticos. A sessão real e o aceite pessoal do proprietário continuam distintos desses testes. Preços, pagamentos, IA paga e regras comerciais não foram ativados nem modificados. Pendências anteriores de precisão independente e conteúdo público datado não são resolvidas por uma liberação visual.
