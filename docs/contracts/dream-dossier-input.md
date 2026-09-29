# Dossiê do Sonho — entrada inicial

Produto `dream-dossier`, rota `/dossie-do-sonho`, entrega de catálogo web/PDF. RUN_ID `ATV-20260902-170644Z-01A0630F`.

E1 parcial: a entrada privada compartilhada reconhece o produto e valida o sonho principal declarado pela pessoa (data, relato, emoções, associações e contexto opcional) com consentimento de armazenamento `atv-input-consent/1`. O consentimento opcional de continuidade não carrega histórico. O parser do domínio recusa campos adicionais, inclusive IDs de sonhos anteriores enviados pelo cliente. A consulta de acesso retorna apenas o estado mínimo; o produto permanece `PREPARING` e a release desativada.

A proposta da arquitetura do produto é comparar esse sonho com contexto biográfico autorizado e até três registros anteriores escolhidos. A seleção, a autorização específica para reutilizar cada registro, a verificação do dono e a projeção imutável do histórico ainda não estão implementadas. A entrada atual não executa comparação, cálculo de recorrência, interpretação nem gera PDF. O futuro método editorial precisa diferenciar o Dossiê da Leitura Essencial por conteúdo, não pelo PDF isolado.

E1 permanece `EM_EXECUCAO` por seleção autorizada, processamento e facts contract. E2–E5 estão pendentes. Dados sintéticos e validação local não aprovam leitura nem comprovam sessão hospedada. Gate B/Lab, liberação e gasto automático R$0 permanecem preservados.

A [auditoria da fonte histórica](../qa/DREAM_DOSSIER_HISTORY_BLOCKER_2026-09-29.md) registra o bloqueio direto e a decisão de produto/privacidade necessária antes de implementar comparação.
