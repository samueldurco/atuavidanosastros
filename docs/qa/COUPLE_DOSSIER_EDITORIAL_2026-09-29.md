# Dossiê do Casal — QA editorial local

WU166, RUN_ID `ATV-20260902-170644Z-01A0630F`. Requisito E2: preparar e exigir a leitura própria do Dossiê, preservando toda a composição E1 experimental. A base WU165 teve CI `36552585031` SUCCESS; comprova checks do commit, sem aprovação de conteúdo ou hospedagem.

Guarda da composição original antes da normalização, perfil próprio e prompt1.0.17: 19 hipóteses, nove temas, três conexões, duas sínteses, três perguntas e quatro limites. O prompt exige desenvolver sugestões de conversa e experimento voluntário/reversível sem inferir acordo real. A checagem estrutural não avalia essa utilidade.

Focal `couple-dossier-editorial.test.mjs`: 6/6 PASS. Preservação original e rejeição de extras inclusive `undefined`, base/score/continuidade/limites adulterados; admissão máxima de 120–121 fatos com política/fonte longa e contexto UTF-16; 100 pares e todas as evidências; topologia, referências/ordem, conexões, sínteses, perguntas e limites; isolamento de instruções hostis; premium e nenhum bypass de dados pessoais/promoção/revisão. Fixture explicitamente sintética, sem valor editorial aprovado. Duas falhas iniciais do próprio espécime foram corrigidas: textos de conexões/sínteses repetidos e expectativa de fonte de relato sem a proteção `user-report` do prompt. Nenhum gate foi relaxado.

Worker 168/168 e IA 116/116 PASS; tipos Worker/IA PASS. O teste genérico de teto premium em `product-delivery.test.mjs` usa agora `purpose-career`, pois o Dossiê exige sua composição e perfil específicos. Orçamentos genéricos e release continuam intactos. Evidências locais `test-results/wu166-{couple-editorial,worker,worker-check,ai-check,ai,format,staged,secrets}.*`; diff e scan obrigatórios no fechamento.

E2 integral continua BLOQUEADO por conteúdo situado/modelo-prompt e revisão legítima. E1 permanece parcial experimental; E3–E5 pendentes. R$0, sem chamada externa, consulta de histórico, promoção, publicação ou mudança de permissões. Próximo requisito independente: aplicar o Lab existente ao Dossiê, com escopo sintético explícito e revisão semântica vinculada.
