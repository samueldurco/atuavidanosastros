# Horóscopo — entrada com perfil natal e revisão

RUN_ID `ATV-20260902-170644Z-01A0630F`; WU177; base `9348296892ad8fe5c98434116b0f8bfaefb66dd4`. Implementação e provas locais com dados sintéticos. Nenhuma migração hospedada, homologação editorial/modelo, liberação de produto ou chamada paga.

## Requisito entregue

Entrada própria `atv-horoscope-request/1`, API autenticada/same-origin, snapshot natal por revisão e recibo privado. Data explícita e contexto opcional têm consentimento separado; a UI explica a amostra única às 12h UTC, precisão desconhecida dos pares e limites das recorrências ainda pendentes. Reaproveita o perfil, o fluxo e o leitor existentes; mantém web como formato do catálogo.

## Evidência e critérios

- SQL/API/controller: comandos mínimos e contexto exato, calendário/Unicode/limites, campos extras, origem/identidade, revisão/perfil EXACT, RLS/grants, gates/entitlement/quota, colisão de chaves, retry após edição/esquecimento/revogação, forward-fix e reaplicação, cascata de recibo e snapshots privados. Quatro falhas iniciais no adaptador integrado foram corrigidas. A suíte completa web passou: 1.359 testes em 67 arquivos, 113,62 s, em `test-results/wu177-full-web-unit.log`; a vertical também passou 76/76 em `test-results/wu177-vertical.log`.
- Vertical: pedidos com/sem contexto via comando próprio e via contrato genérico preservam cálculo determinístico, todos os 121/122 facts, cem pares e catorze hipóteses da fixture editorial não aprovada. Biblioteca/histórico continuam privados e pendentes, sem artefatos ou gates abertos.
- Browser: formulário, consentimento invalidado por edição, contexto vazio/limites, conflitos de revisão, perfis inadequados, recuperação por UUID sem replay, gates fechados e autenticação real. Primeira rodada: 74 PASS e duas falhas de hidratação antes da submissão; o trace registra módulo JavaScript sem export esperado. Quatro casos visuais duplicados foram removidos, preservando os quatro originais. As duas recuperações de Data/Horóscopo passaram com build isolado e um worker, sem alteração de código ou de asserções: `test-results/wu177-recovery-e2e.log`, 2/2 em 43,6 s. Cobertura final de 72 casos únicos: 70 aprovados na primeira rodada mais dois na repetição focal. Evidência inicial em `test-results/wu177-e2e.log`.
- Visual: 1440/820/390/320, sem overflow horizontal; consentimento e botão operáveis por teclado. Inspeção desktop/320 PASS em `test-results/wu177-intake-1440.png` e `test-results/wu177-intake-320.png`.
- Tipos web: `test-results/wu177-check-fixed.log`, zero erros e zero avisos. Prettier dos quinze arquivos compatíveis e ESLint dos doze arquivos TS/Svelte passaram em `test-results/wu177-format-check.log` e `test-results/wu177-eslint.log`. Diff e secrets são verificados pelo fechamento antes do commit, com prova em `test-results/wu177-diff.log` e `test-results/wu177-secrets.log`.

## Bloqueador direto de CI

CI176 `36568681113`, job `109406899583`, falhou em uma geração do PDF sintético do Dossiê: 1300 PASS/1 FAIL, limite real de cinco segundos excedido (`dossier_scope_render_failed`). Provas em `test-results/wu177-ci176.json` e `test-results/wu177-ci176-failure.log`. A repetição isolada anterior passara, mas o CI confirmou a falha concorrente. A configuração Vitest agora limita a dois workers simultâneos, preservando renderer, orçamento de produção e todas as asserções. Parâmetro documentado em [Vitest maxWorkers](https://vitest.dev/config/maxworkers.html). A suíte completa local, incluindo esse PDF, passou 1.359/1.359. O CI do novo commit será registrado no log/checkpoint após a publicação; este documento não presume seu resultado.

## Estado do produto

E1/E2/E3 integrais BLOQUEADOS; E4 EM_EXECUCAO; E5 PENDENTE. Esta entrada completa apenas um requisito independente de E1/E4. Conteúdo geral para doze signos, recorrências, alertas, histórico/renovação, funnel completo, política determinística/editorial homologada e sessão hospedada continuam pendentes. Supabase pausado e administração Cloudflare 403 permanecem bloqueios externos registrados. Fixture estrutural não aprova leitura. Gates fechados, R$0 e dezessete arquivos paralelos preservados.
