# WU-051 — Interface natal recuperável

RUN_ID: ATV-20260902-170644Z-01A0630F. Validação local com fixtures sintéticas. Rota autenticada `/conta/nascimento`; fixture `/conta/_spec/nascimento` limitada a localhost/loopback, com aviso de QA. Ambas privadas/no-store/noindex. Nenhuma migração hospedada ou coleta real.

## Evidência

- 25 testes novos de formulário: calendário, limites UTC, coordenadas, deslocamento, precisão, consentimento e round-trip de segundos/milissegundos.
- 125 testes web / 19 arquivos PASS, incluindo os dez testes integrados SQL/API anteriores. `test-results/wu051-web.log`.
- 15 E2E PASS: salvar/recuperar/corrigir/apagar, consentimento desmarcado, hora desconhecida, conflito, sessão expirada, indisponibilidade, resposta malformada, falha de rede após commit, recuperação falha mantendo bloqueio, erro corrigível, operação pendente sem envio duplo, autenticação, privacidade e quatro larguras. `test-results/wu051-e2e.log`.
- svelte-check sem erros/warnings, lint/format focais, diff-check e build web PASS. Logs locais `wu051-check.log`, `wu051-lint.log`, `wu051-e2e-lint.log`, `wu051-build.log`.
- Screenshots finais inspecionados em 1440×1000, 820×1180, 390×844 e 320×800, sem overflow horizontal; teclado, Escape/restauração de foco e reduced-motion cobertos. Caminho local `test-results/wu051-browser/onboarding.e2e.ts-visual-and-keyboard-{largura}/natal-{largura}.png`.
- Corrigidos pattern de país interpolado incorretamente pelo Svelte, espaço no título responsivo e opção extensa no select móvel. Testes respeitam rejeição explícita de analytics e distinguem storage de navegação SvelteKit de dados natais, sem exigir storage vazio fictício.

## Referência e limites

Stitch canônico `2141801333950500965`, ID-02 `133f01c9992f4ebc9ad46dbabd1746ec`. Export HTML SHA-256 `fe8f150d79bc1c9a413a7156c3580fa5c17af67317216d89a2ed6ef20deb4bce`; PNG `06ce6c6732f1405b1853b7f6926a239f2e2650243eab662c69a5f87a383fcbf1`. Cache local em `test-results/gate-b/references/`. HTML orienta composição em duas colunas e agrupamento dos campos; PNG exportado majoritariamente vazio não permite certificar paridade pixel a pixel. Tokens/fontes existentes preservados. Não se reproduzem progresso fictício, geocoder inexistente ou certificação histórica de DST do protótipo.

E2E usa API sintética local; SQL/API têm cobertura integrada separada. JWT/PostgREST hospedado, leitor de tela humano, zoom nativo 400%, paridade visual integral, integração dashboard/produtos e exclusão integral da conta não certificados nesta WU. Apagar dados natais não remove snapshots da Biblioteca. Nenhum modelo homologado, promoção, gasto, emissor editorial ou mudança em releases/policies.
