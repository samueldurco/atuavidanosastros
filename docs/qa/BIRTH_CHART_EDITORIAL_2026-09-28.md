# Mapa Astral — E2 local

WU-123 · RUN_ID `ATV-20260902-170644Z-01A0630F` · 28/09/2026.

Perfil editorial1.0.0, prompt1.0.5 e evidência editorial1.7.0 vinculam os 24 fatores persistidos a onze papéis interpretativos, relação entre planetas/ângulos/casas, síntese e três perguntas. A preparação confiável seleciona o perfil depois da coerência da base; contexto não o seleciona. O corpus1.9.0 preserva105 casos/102 preparados/três bloqueados/306 posições. Contrato: [birth-chart-editorial.md](../contracts/birth-chart-editorial.md).

O nível gratuito é insuficiente para onze papéis e é recusado antes de chamada ou reserva. Níveis intermediário/premium mantêm seus limites e exigem o mesmo escopo, sem promoção de entitlement. A leitura continua parcial; aspectos, regentes e posições de planetas em casas não são inventados. A cobertura mecânica não aprova utilidade, profundidade, perguntas, limites ou integração semântica.

## Provas locais

- AI:59 testes PASS e TypeScript PASS. Cinco testes novos verificam todos os24 fatores (ausência/substituição de cada um), escopo extra ou relatado indevido, contexto, limites dos níveis, omissões aceitas pelo schema, mistura factual, relação/síntese desconectadas, perguntas inválidas e seleção confiável do prompt. Gateway gratuito faz zero chamadas/reservas; intermediário usa uma fixture, sem autoridade editorial.
- Worker:80 testes PASS e TypeScript PASS. Preparação dos24 fatores e digest do perfil conferidos. Cinco mutações de rascunho são recusadas mesmo com uma revisão sintética anterior. Uma fixture completa com notas perfeitas permanece bloqueada por `promotion_required`.
- Lab/corpus/captura/revisão/comparação:63 testes PASS em cinco arquivos, sem expandir casos ou posições. Fingerprints das requisições atualizados para o perfil/prompt.
- Web:zero erros/avisos no check; lint focal PASS. Na primeira rodada, a única falha de tipagem foi o parâmetro da fixture sem JSDoc; corrigida. A integração detectou a expectativa antiga de síntese genérica e depois o uso indevido da projeção pública sanitizada para preparar fatos. A prova passou a usar o snapshot completo do SQL local. Resultado:14/15 PASS na suíte; único caso afetado Mapa Natal1/1 PASS após correções, conferindo os onze papéis,24 referências e três perguntas no HTML persistido, além de salvamento, recuperação e reprocessamento. Não houve nova falha nos outros casos.

Saídas completas ignoradas em `test-results/wu123-*.log`. A prova HTTP/SQL de publicação e recuperação usa somente políticas/revisor sintéticos locais; não aprova conteúdo, modelo, calibração ou sessão hospedada. Nenhuma mudança visual no produto nesta WU. Dados sintéticos, zero chamada externa e gasto automático R$0.

## Estado e continuidade

E1 **BLOQUEADO** para aceite integral conforme WU122. E2 **BLOQUEADO** para aceite integral: exige interpretação útil completa aprovada, modelo/prompt/proveniência validados, revisão legítima e política aprovada para aspectos quando exigidos. O perfil entregue é cobertura da base parcial, sem homologação editorial. E3–E5 seguem em verificação do fluxo e dos formatos web/PDF/SVG.

CI122 SHA `03f00ccf47fc1d00bf21cc3ff95b194f0c889972`, run36494747574: `completed/success`, consultada por API GitHub. Não prova deploy/release. Próxima WU124: conferir a representação persistida e os formatos do Mapa Natal, incluindo os24 fatores, limites, estados e recuperação. Supabase pausado requer ação do proprietário antes da validação hospedada; gates de interpretação/publicação permanecem desligados. Nenhum produto foi declarado concluído ou liberado.
