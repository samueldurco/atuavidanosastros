# Mapa Astral — E1 local

WU-122 · RUN_ID `ATV-20260902-170644Z-01A0630F` · 28/09/2026.

A preparação editorial exige agora coerência dos dez corpos, ASC, MC e doze cúspides Placidus com fatos, fontes, versões e limites persistidos. O intake consentido existente permanece; a projeção natal experimental1.0.0 não muda. A evidência editorial1.6.0 impede reutilizar um digest anterior para avaliações novas. Contrato: `../contracts/birth-chart-calculation.md`.

Uma base polar válida continua salva com dez posições, MC e avisos, mas retorna `insufficient_facts` para preparar o Mapa Astral completo. Nenhuma casa alternativa, interpretação, aspecto ou precisão é inventada. Conferência de coerência não autentica a origem da base nem homologa o motor.

## Provas locais

- Worker:79 testes PASS e TypeScript PASS. O teste novo cobre32 mutações aceitas pelo schema genérico (planetas, movimento, ASC/MC, cúspides, fontes, contexto, versão, fatores extras, promoção/precisão indevida), sem alterar o objeto; chaves JSONB e ordem dos corpos não impedem uma projeção coerente. Quatro latitudes polares preservam os limites, inclusive com relato, e recusam estado de casas contraditório.
- SQL real local/PGlite:15 testes PASS de processamento. O Mapa Astral persistido prepara; uma cúspide divergente é recusada. Uma solicitação polar persiste, chega a revisão pendente, bloqueia preparação e segue privada, sem leitura/calculo liberados ou promoção. Os quatro produtos natais seguem preparando no caso suportado.
- Intake natal e percurso HTTP/SQL/calculador/publicação/recuperação existentes:96 testes PASS em dois arquivos. Fixtures de consentimento/revisão não conferem autoridade produtiva. Nenhuma migração foi modificada.
- Corpus e benchmark:62/63 PASS na primeira rodada; a única falha foi uma contagem residual de posições ausentes após retirar o caso polar. Corrigida:11/11 testes do arquivo afetado PASS. Corpus1.8.0 mantém105 casos, agora102 preparados/três bloqueados/306 posições; hashes das requisições atualizados, sem expansão.
- Web:zero erros/avisos em `svelte-check`. Sem alteração visual nesta WU; não há novo aceite visual.

Saídas ignoradas em `test-results/wu122-{natal,worker,worker-check,scripts,comparison-corrected,processing-sql,natal-sql,web-check}.log`. Formatação documental e diff/scan são conferidos no fechamento. Dados sintéticos, zero chamada de IA, gasto automático R$0.

## Estado dos marcos e continuidade

E1 **BLOQUEADO para aceite integral**, com requisito local entregue. Motor experimental requer homologação independente no domínio usado; precisão de casas/ângulos e origem não são garantidas por este teste. Sessão/persistência hospedadas dependem do proprietário retomar o Supabase pausado e da validação posterior de DNS/OAuth/sessão. CI121 (`f36e04e`, run36493264386) terminou `success`.

E2 é a próxima frente do produto: conferir o escopo editorial dos24 fatores, síntese e perguntas, reutilizando o Lab. Aspectos estão ausentes e exigem política editorial aprovada antes de integração; o contrato de geometria não autoriza adotar seus orbes de QA. Modelos homologados/revisores legítimos também continuam ausentes. E3–E5 seguem pendentes para este produto, com fluxos e formatos existentes a verificar depois do escopo editorial. Nenhuma liberação ou conclusão do produto foi declarada.
