# Atlas dos Sonhos — projeção de fatos E1 (WU222)

RUN_ID `ATV-20260902-170644Z-01A0630F`. A projeção versionada `atv-dream-atlas-facts/1` usa apenas os registros privados da execução explicitamente incluídos pela pessoa. A API a recalcula na leitura; a Biblioteca exibe contagens e termos repetidos declarados, identificando-os como observação literal sem interpretação. O contrato e seus limites estão em `../contracts/dream-atlas-facts.md`.

Provas locais em 05/10/2026: `node --test packages/domain/dream-atlas-facts.test.mjs` 3/3; `pnpm --filter @atv/domain check` PASS; `pnpm --filter @atv/web exec vitest run src/lib/server/dream-atlas-api.spec.ts` 4/4; `pnpm --filter @atv/web check` zero erros/avisos; ESLint focal e `git diff --check` PASS. Casos sintéticos cobrem inclusão/exclusão, ordenação e janelas de calendário, recorrência por registros distintos, ausência de mineração da narrativa, duplicatas e datas inválidas.

Essas provas não constituem leitura editorial, aceite E2–E5, sessão real nem aplicação de migração no Supabase hospedado pausado. Release e gates seguem desativados, gasto automático R$0.
