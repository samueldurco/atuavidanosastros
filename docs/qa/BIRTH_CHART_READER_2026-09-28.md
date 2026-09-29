# Mapa Astral — persistência, leitor e formatos

WU-124 · RUN_ID `ATV-20260902-170644Z-01A0630F` · 28/09/2026.

A representação `atv-product-delivery/1.3.0` identifica os onze temas exigidos pelo perfil natal e a síntese com três perguntas. Conserva texto, tipo, ID, ordem e referências das treze seções. Seus títulos participam do digest: revisão anterior não aprova uma representação nova. O leitor e os exports identificam os dez planetas, ASC/MC, doze cúspides e contexto relatado, mantendo os IDs e fontes originais. Snapshots já persistidos não são reescritos.

Web e PDF passam a `atv-web-export/1.1.0` e `atv-pdf-export/1.1.0`. SVG continua 1.0.0, com geometria canônica experimental; nomes não acrescentam aspectos, regentes, planetas em casas ou garantia de precisão. A entrega do catálogo continua web/PDF/SVG.

## Provas locais

- Delivery/review: 18 PASS. Treze seções, onze temas, 24 fatores, três perguntas, texto/evidência exatos, rejeição de cúspide ausente e mudança do digest. `test-results/wu124-delivery.log`.
- Domínio/Worker/SQL de artefatos: 18 PASS. Versões anteriores e atuais, byte/hash/idempotência exatos, propriedade, revogação, quotas, rejeição de versão desconhecida/nula/incompatível e reversão seguida de reaplicação. `test-results/wu124-artifacts.log`.
- Web/PDF/SVG/producer: 26 PASS, com cálculo natal real experimental e persistência SQL local das três saídas; recuperação exata, isolamento de proprietário e revogação. `test-results/wu124-formats.log`. Autoridade editorial exclusivamente sintética nos testes.
- Svelte check: zero erros/avisos. TypeScript domínio/Worker PASS; Prettier/ESLint dos arquivos alterados PASS. `test-results/wu124-check.log`, `wu124-format.log`, `wu124-eslint.log`, `wu124-lint-focal.log`.
- Lint global impedido por arquivos paralelos não incluídos nesta WU: erros TypeScript em `packages/fabrica-de-midia` e formatação de administração/TikTok. Evidências `wu124-lint.log` e `wu124-lint-focal.log`; não foram alterados para fechar este produto.
- Playwright natal: cinco PASS, build/preview locais e larguras 1440/820/390/320. Treze títulos, 24 fatores/contexto/fontes, três perguntas, um main, ausência de overflow, navegação por teclado/reload; pendente/revogado/falha ocultam conteúdo e formatos. `wu124-e2e-birth-final.log`. A primeira rodada teve quatro falhas por texto esperado incorreto; a segunda teve uma falha de rolagem/foco após screenshot longo, estabilizada posicionando e verificando o link antes do Enter. Dez casos Bússola/Três Pilares passaram na primeira rodada `wu124-e2e.log`.
- HTML offline: quatro larguras sem overflow; SVG: dez corpos, doze casas, dois ângulos em 1200 e 390. `test-results/wu124/offline-format-proof.json`; capturas/recortes inspecionados em `test-results/wu124/`.
- PDF nativo de sete páginas/32196 bytes: treze títulos/textos, referências e nomes das cúspides presentes; sem glifos de substituição. Todas as páginas renderizadas pelo Poppler e inspecionadas, sem corte visível. `test-results/wu124/pdf-content-proof.json`, `pdf-page-*.png`, `pdf-contact-*.png`. Não é um PDF produzido por ferramenta substituta.

Fixtures localhost de `_spec/fluxo` são explícitas, sintéticas, sem aprovação legítima e com exports desabilitados. Reload comprova apresentação; persistência/reabertura/recuperação são provadas pelas integrações SQL separadas. Provas locais ignoradas pelo Git não contêm dados pessoais reais.

## Migração expansiva e reversão

`20260928234000_product_artifact_renderer_versions.sql` amplia somente a lista explícita de renderers web/PDF aceitos pelo RPC existente. Mantém corpo de autorização, gates, locks, identidade, quotas, ACLs e idempotência; nenhuma linha/byte já armazenado é reescrita. O parser conserva a versão original de manifestos antigos.

A reversão local testada restaura por `CREATE OR REPLACE` o corpo de `persist_product_artifact` da migração `20260915180000_product_artifacts.sql`, mantendo suas ACLs. Novas escritas 1.1.0 ficam recusadas, enquanto leituras das duas versões mantêm bytes/hashes. Se necessário, reverter o app para o renderer 1.0.0 junto do RPC. A reaplicação da migração expansiva recupera a idempotência da escrita 1.1.0. Não apagar artefatos nem aplicar contract enquanto houver consumidor antigo. Nenhuma migração hospedada executada.

## Gate B focal e E1–E5

Stitch canônico `2141801333950500965`: P0-04 `8e3543124b6240c899122db934a1be96` (workspace) e P0-05 `601831e725ff44538769eeb629e5f71e` (deliverable). Exports cacheados em `test-results/gate-b/references/`. PNGs SHA-256 respectivamente `3d45bba27bdbcf8d5fc9a295d3fe02af815f5878bab52274eadcdbe9859b1508` e `0d3d0028ddb97821005854a8ace63c1aa837b314444e73f0bd63872852defd29`; HTML `0080223276a7feabd73259e7eff077414f3535f862788cb726ef1ee7c9e4352e` e `f2e8c0b77b77876a310458fa2d5b47b333f6998bea9f1fc0d224d8942e5ccc3c`.

WU125 integra cartografia persistida, legenda completa e índice dos treze capítulos à composição natal. A ampliação oferece rolagem por toque e teclado sem overflow da página. As capturas comprovam legibilidade/estados no escopo local; intake, conteúdo aprovado e paridade integral continuam pendentes. As linhas do `STITCH_ROUTE_MATRIX.md` permanecem MAPPED/NOT_VISUAL_PASS. Aspectos, trânsitos e planetas em casas desenhados nos mocks não são capacidades aprovadas.

| Marco | Implementação/prova local | Aceite final |
| --- | --- | --- |
| E1 | Intake existente e coerência completa natal WU122. | BLOQUEADO: homologação do motor/referências/tolerâncias e política de aspectos aplicável. |
| E2 | Perfil onze papéis/24 fatores WU123; representação preservada. | BLOQUEADO: modelo/proveniência autêntica, conteúdo útil aprovado e revisão legítima. |
| E3 | Persistência/privacidade/Biblioteca/histórico e recuperação local dos três formatos. | BLOQUEADO: aprovação legítima e sessão hospedada. |
| E4 | Títulos/bases, cartografia, índice, leitor responsivo e HTML/PDF/SVG locais validados. | BLOQUEADO: conteúdo aprovado, Gate B integral e hospedagem. |
| E5 | Provas complementares cobrem cadeia local, com autoridade sintética identificada. | BLOQUEADO: percurso completo aprovado/hospedado ainda não demonstrado. |

Supabase pausado: proprietário deve executar Resume project; retestar DNS/OAuth/sessão somente depois de mudança. Homologador/revisor/operador respondem pelos aceites editoriais/motor já documentados nas WUs122–123. CI123 `36496182403` completed/success em `e3ee3e555a695c49d20e76aba951278d921ed8c5`; CI não comprova deploy/release.

## WU125 — composição natal e cartografia

- SVG nativo mostra dez longitudes preservadas, ASC/MC e doze cúspides quando válidos. Zero de Áries à esquerda, sentido anti-horário; trilhas radiais organizam os marcadores e não representam distância. A legenda liga cada corpo ao valor completo da base. Dados polares explicitam a ausência de ASC/casas; geometria ausente não fabrica mapa.
- Índice segue os títulos reais das treze seções; links para capítulos e fatores funcionam por teclado. Conteúdo pendente/revogado/falho continua oculto. Exportação privada, autoridade editorial e recuperação conservam seus gates.
- Playwright natal: seis PASS em 1440/820/390/320, incluindo longitudes/raios, dez corpos/doze cúspides/dois ângulos, ampliação e rolagem por teclado, ausência de overflow, estados e geometria ausente. `test-results/wu125-e2e-zoom.log`. Dez regressões Bússola/Três Pilares PASS em `wu125-e2e.log`; a primeira rodada natal falhou por comparação estrita com diferença de ponto flutuante em Netuno, corrigida no teste com tolerância de dez casas decimais.
- Capturas normais das quatro larguras e cartografia ampliada de 320 inspecionadas, sem sobreposição/corte de texto; arquivos `test-results/wu125/birth-chart-reader-*.png`, `birth-chart-cartography-*.png` e `birth-chart-enlarged-*.png`. A ampliação tem região focalizável somente enquanto ativa; o comentário Svelte documenta a exceção para rolagem por teclado.
- Integrações de persistência/artefatos e SVG: 24 PASS, `wu125-persistence.log`. CI124 `36499064505` falhou em 14 casos porque dois setups SQL não aplicavam a migração expansiva de renderers1.1.0. WU125 acrescenta a migração a esses setups; contratos e RPC de produção permanecem iguais.
- Svelte check final: zero erros/avisos (`wu125-check-verified.log`); Prettier/ESLint focal PASS (`wu125-format.log`, `wu125-eslint-final.log`, `wu125-eslint-zoom.log`). CI125 será registrado no log/checkpoint após push; validação local não comprova deploy.

Releases/allowlists, R$0 e dados paralelos preservados. Nenhuma chamada de modelo, promoção, migração hospedada ou gasto. Sem requisito independente restante deste escopo natal, próxima WU segura: Ascendente E1, coerência da base persistida antes da preparação editorial.
