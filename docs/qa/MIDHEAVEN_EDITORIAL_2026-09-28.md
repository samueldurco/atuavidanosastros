# Meio do Céu — cobertura editorial local

WU-130 · RUN_ID `ATV-20260902-170644Z-01A0630F` · 28/09/2026.

E2 exigia cobertura específica em lugar da aceitação de apenas um fato genérico. O servidor agora seleciona um perfil que exige MC exato, contribuição pública, possibilidades de ambiente/trabalho, tensão, síntese conjunta e três perguntas práticas. Relato consentido permanece dado. Contrato: `../contracts/midheaven-editorial.md`.

## Provas locais

- AI: TypeScript e 69 testes unitários PASS. Cinco testes focais cobrem escopo/fatos inválidos, papéis ausentes ou factuais, evidência só de contexto, síntese fragmentada, cópia alterada, perguntas ausentes/duplicadas/sem interrogação, relações inventadas e instruções adversariais em relato. Gateway recusa cobertura incompleta e perfil inválido; candidatos completos dos três planos não autorizam produção.
- Worker: check e 91 testes PASS. Cálculo real local seleciona o perfil. Cinco mutações de cobertura/fato/síntese/pergunta/evidência são recusadas e mudam o vínculo de revisão; revisão de fixture continua `promotion_required` e publicação bloqueada.
- Lab: 63 testes PASS nos cinco scripts existentes de corpus, benchmark e comparações/revisão. Corpus 1.13.0 mantém 105/102/3/306. Fingerprint atual `022b697884ebabe85a1bf2f6b8a9be9fee0402dbe1e015bacb1350c54311b041`; retirar somente o perfil MC restaura `c7d419b297da780a5b09f4ffbde88456b13d08ad0c7feba4380df978dc45edce`.
- Persistência: 14 testes SQL passaram na execução completa; o caso MC foi corrigido e passou na repetição focal (1 PASS, 14 não selecionados). Confere cinco seções, três papéis/perguntas e fatos MC-only no HTML privado, histórico e reprocessamento revistos independentemente. Cartografia é nula para este produto web da capacidade purpose-direction. Web check: zero erros e avisos. Logs `wu130-sql-final.log`, `wu130-sql-mc-final.log` e `wu130-web-check-final.log`.
- Evidências completas ignoradas: `test-results/wu130-*.log` e `wu130-corpus-proof.json`. Prettier e diff verificados antes do commit. CI129 SHA `6b313fc4ee1ccd157e9e23fb40401e90cd6628b9`: [36506129282](https://github.com/samueldurco/atuavidanosastros/actions/runs/36506129282), completed/success.

## Aceite

Cobertura mecânica implementada localmente; fixture não é leitura aprovada. E1 e E2 integrais permanecem BLOQUEADOS por homologação e conteúdo/modelo/revisão legítima. Próxima WU: E3/E4, apresentação específica no resultado web e percurso privado, com QA local e limites explícitos. Supabase pausado bloqueia sessão hospedada; proprietário precisa executar Resume project. Sem chamada externa de modelo, migração, gasto ou alteração de gate. Paralelos preservados.
