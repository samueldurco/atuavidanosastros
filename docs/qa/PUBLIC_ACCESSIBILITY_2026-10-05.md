# Acessibilidade pública automática — 05/10/2026

WU236 / Onda 8 §15, linha 614 / Gate B / execução V3 §44. RUN_ID `ATV-20260902-170644Z-01A0630F`.

## Entrega

- `@axe-core/playwright` e axe-core 4.13.0 somente no desenvolvimento; versão exata e lockfile, sem alteração de dependências existentes de runtime.
- 17 casos Chromium: home, entrada, Bússola de Carreira, Meu Céu, Loja e Método em 1440×1000 e 390×844; 404 em ambos; home após recusa de analytics em ambos; menu móvel aberto por Enter, Escape e foco restaurado.
- Respostas 200/404 verificadas antes do scan, regras WCAG 2 A/AA, 2.1 A/AA e 2.2 AA sem exclusões ou regras desativadas. Cada análise completa, inclusive `incomplete`, é salva e anexada.
- Página de erro com título descritivo e recuperação para o início. O teste confirma o título, status HTTP, heading e recuperação.
- CI passa a executar estes casos e os nove testes existentes do Gate B com um worker. Relatórios, screenshots e traces em artifact `public-accessibility-results`, retenção de sete dias, inclusive em falha. Nenhum dado ou credencial de produção.

## Diagnóstico e correção

1. Rodada inicial: 10/15 PASS. `/atv-plus` e `/mapa-astral` são slugs de catálogo sem páginas públicas implementadas; os quatro scans dessas URLs encontraram a página 404 sem `<title>`. Corrigida a página de erro; cobertura principal usa rotas existentes e testa 404 separadamente. Nenhuma oferta ou interpretação fictícia foi criada. O locator do menu foi corrigido para permanecer estável quando o nome muda para “Fechar menu”.
2. Rodada com dois workers: 1/26 PASS; Wrangler ProxyController perdeu conexão (`Network connection lost`) e encerrou o servidor, seguido de `ERR_CONNECTION_REFUSED`. Falha de execução preservada; não contada como aprovação nem ocultada por retry automático. Log e traces em `test-results/wu236-e2e-final*`.
3. Rodada sequencial, sem alteração dos asserts ou dos timeouts: **26/26 PASS**, 2,1 minutos. Inclui todos os 17 scans e os nove casos Gate B (quatro viewports, teclado/foco, Bússola com erro recuperável, Biblioteca sintética, reduced motion e contraste de tokens).

## Evidências locais

- `test-results/wu236-e2e-initial.log`, `wu236-e2e-final.log`, `wu236-e2e-serial.log`.
- `test-results/wu236-e2e-serial-artifacts/`: 17 `axe-results.json`, screenshots Gate B e evidências anexadas. Evidências extensas ignoradas pelo Git; no CI serão publicadas como artifact.
- Check: zero erros e warnings; lint, build, formatação do workflow e `git diff --check`: PASS.
- `pnpm audit --json`: zero alertas em todas as severidades após adicionar axe; saída `test-results/wu236-audit.json`.

## Limites do aceite

Zero violações **detectadas automaticamente** nos 17 estados; não equivale a certificação WCAG integral. `color-contrast` contém resultados inconclusivos: setas decorativas `aria-hidden`, texto da home coberto pelo menu aberto e parágrafo do banner com detecção de sobreposição. Relatórios completos preservam esses nós. A captura móvel do consentimento foi revisada: texto legível sobre cartão branco, controles e link separados, sem sobreposição visual do parágrafo. O contraste dos papéis de texto passou no Gate B; avaliações manuais completas, leitor de tela e fluxos privados/hospedados continuam pendentes.

ATV+, Mapa Astral e demais produtos mantêm seus bloqueios E1–E5. Nenhuma flag comercial, autorização, consentimento, marca ou custo foi alterado. CI remoto ainda deve validar o commit exato; prova de conclusão permanece no log canônico externo, sem declarar liberação hospedada.

Referência primária: [Playwright — testes de acessibilidade](https://playwright.dev/docs/accessibility-testing).
