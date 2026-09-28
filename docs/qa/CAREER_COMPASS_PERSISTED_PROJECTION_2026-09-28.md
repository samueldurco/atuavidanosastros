# Bússola — coerência da projeção persistida

WU-116 · RUN_ID `ATV-20260902-170644Z-01A0630F` · 28/09/2026.

Requisito E1: `validateCalculation` confere tamanho, JSON, tipos e IDs, mas aceitava um MC numérico ausente ou divergente do display, fonte e contrato. A preparação editorial da Bússola agora exige a representação 1.0.0 coerente: MC finito em [0,360), signo/grau derivados desse número, fonte vinculada ao provider/version/algorithm anexados, contratos experimentais preservados e avisos presentes nos limites. Contexto continua relatado; somente MC é projetado. Comparações independem da ordem de chaves do JSONB. A evidência editorial passa a 1.3.0, exigindo novos vínculos de revisão.

## Provas locais

- 17 testes focais PASS; 73 testes do Worker PASS. Uma tabela rejeita 32 mutações de valor/display/fonte/contexto/versões/fatores/proveniência/avisos que ainda passam pelo validador JSON genérico. Casos positivos cobrem setores semiabertos, polos, contexto consentido e reordenação JSONB. `test-results/wu116-purpose-editorial.log`, `test-results/wu116-worker.log`.
- TypeScript do Worker PASS. `test-results/wu116-worker-check.log`.
- 63 testes de corpus/benchmark/revisões/comparações PASS, com requisições/quantidade/geometria preservadas. `test-results/wu116-corpus.log`.
- Integração vertical da Bússola PASS: cálculo real da candidata, persistência/publicação privada com autoridade exclusivamente sintética do banco de teste, exportação/reabertura/histórico e reprocessamento independente. `test-results/wu116-vertical.log`.
- Check do app zero erros/avisos, `diff --check` e scan de segredos staged PASS. `test-results/wu116-web-check.log`. Gates globais do commit seguem no CI; nenhum arquivo paralelo foi corrigido ou incluído.

## Limites

Não é prova de autenticidade, precisão científica ou aprovação. Não recalcula a entrada nem chama provedor/modelo remoto. Motor experimental, nenhum modelo homologado, R$0, allowlists e releases permanecem intactos. Sem migração hospedada ou interpretação aprovada. E1/E2 continuam em execução; E3–E5 não concluídos. Supabase pausado continua o bloqueio externo já registrado, sem nova consulta remota. Alterações paralelas de administração/TikTok/mídia foram preservadas fora do escopo.

WU115 `57ff7b5`: CI run36484439394 completed/success. Próximo requisito independente: conferir e completar os títulos e a apresentação das partes exigidas da leitura web da Bússola, sem converter fixture em conteúdo aprovado.
