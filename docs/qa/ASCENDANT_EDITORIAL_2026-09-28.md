# Ascendente — cobertura editorial local

WU-127 · RUN_ID `ATV-20260902-170644Z-01A0630F` · 28/09/2026.

## Requisito e implementação

E2 usava instruções genéricas que aceitavam apenas o fato do ângulo. O perfil específico exige fato exato e três papéis vinculados ao ASC: abordagem/primeiro contato, possibilidades de iniciativa e tensão/excesso; síntese conjunta e três perguntas práticas. Seleção exclusiva do servidor após coerência persistida; relato permanece dado. Contrato: `../contracts/ascendant-editorial.md`.

## Provas

- AI: check TypeScript e 64 testes unitários PASS, incluindo cinco testes focais. Nove envelopes inválidos; 12 mutações dos papéis; síntese fragmentada; seis alterações de fato/perguntas/relações; contexto adversarial; compatibilidade genérica. Gateway aceita candidatos sintéticos completos nos três planos, recusa cobertura ausente e envelope inválido e impede uso de fixture em produção.
- Worker: check e 85 testes unitários PASS. Cálculo real local seleciona o perfil; cinco alterações de cobertura/fato/síntese/perguntas/evidência são recusadas e mudam o vínculo de revisão. Mesmo review de fixture com notas máximas continua `promotion_required` e publicação bloqueada.
- Lab: 63 testes PASS nos cinco scripts existentes de corpus, benchmark e comparação/revisão. Corpus 1.11.0 mantém 105/102/3/306; fingerprint atual `c7d419b297da780a5b09f4ffbde88456b13d08ad0c7feba4380df978dc45edce`. Remover somente o perfil ASC restaura `870a360458e37d3e7ef49f201ad557a7fc5810828204541fbc38852828627a68`; cálculo, casos e demais pedidos permanecem iguais.
- Prettier nos arquivos AI alterados PASS. Logs completos ignorados: `test-results/wu127-*.log`; quatro fingerprints antes/depois: `test-results/wu127-corpus-proof.json`.
- CI WU126, SHA `f1966cdfbecf0830ff20f33a30ea910ed0e49a5f`: [36502346020](https://github.com/samueldurco/atuavidanosastros/actions/runs/36502346020), completed/success. CI WU127 será registrado pelo SHA no log canônico.

## Aceite e continuidade

Cobertura mecânica implementada e validada localmente. Fixtures não são interpretação aprovada; E2 final permanece BLOQUEADO por conteúdo/modelo/revisão legítima. E1 continua BLOQUEADO para homologação determinística. Próxima entrega independente: E3/E4, apresentação dos papéis, resultado web/SVG e percurso persistido com provas locais explicitamente sintéticas.

Nenhuma chamada externa de modelo, migração, alteração de gate ou gasto. Release de todos os produtos permanece desativado. Supabase pausado bloqueia sessão/aceite hospedados; proprietário precisa executar Resume project. Administração/TikTok/mídia/social paralelos preservados.
