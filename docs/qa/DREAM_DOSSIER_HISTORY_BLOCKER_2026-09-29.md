# Dossiê do Sonho — bloqueio da comparação histórica

RUN_ID `ATV-20260902-170644Z-01A0630F`. WU218, produto `dream-dossier`, E1.

O contrato de produto pede comparar o sonho principal com contexto autorizado e até três registros anteriores. A entrada privada da WU217 valida somente o sonho principal. `consent.continuity` nessa entrada é uma escolha para uso futuro do relato; não seleciona fontes nem autoriza ler sonhos já salvos.

A continuidade genérica (`20260928130000_product_continuity.sql` e `20260928133000_product_continuity_selection.sql`) não satisfaz essa fonte: a política nasce desligada, exige consentimento/escopo e resultados liberados, e a seleção projeta itens marcados e partes do resultado, sem o relato integral dos sonhos. O snapshot retornado também não é autorização durável para uma execução posterior. `calculateDreamRecord` registra apenas o sonho atual e fixa `historyLoaded=false` e `recurrenceAssessed=false`. O parser do workflow rejeita IDs, relatos e metadados históricos enviados pelo navegador. Não há adaptador do Dossiê no worker.

**Decisão necessária — proprietário do produto e responsável por privacidade:** definir quais registros de sonho podem ser fonte (registro salvo, leitura liberada ou ambos), quais elementos mínimos serão comparados, como a pessoa escolhe até três fontes e autoriza especificamente este Dossiê, como revogação/exclusão afetam a execução e como distinguir o conteúdo da Leitura Essencial. Depois, a engenharia deve criar uma leitura privada e transacional que confirme titularidade, escopo, versão/revisão e estado das fontes no momento da execução, com prova SQL/API local e contrato de facts versionado. Não ativar a política genérica nem aceitar relatos históricos livres como se fossem registros verificados.

E1 permanece parcial e bloqueado neste ponto; E2–E5 pendentes. Nenhuma comparação, recorrência, PDF ou liberação hospedada foi demonstrada. Gate B/Lab e gasto automático R$0 permanecem intactos.
