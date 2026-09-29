# Jornada de Tarot — método pendente

RUN_ID `ATV-20260902-170644Z-01A0630F`; WU216, 29/09/2026. Auditoria focal de E1 após a entrada privada de pergunta e objetivo. O catálogo mantém `tarot-journey` em `PREPARING`, web, e a release SQL segue desativada.

## Fontes e limite implementado

- A arquitetura de produtos, seção “Jornada da Pergunta — 21 Dias”, linhas 216–229, descreve uma **nova oferta recomendada**: tiragem profunda inicial, diário/check-ins, dois reenquadramentos, módulos nos dias 1/7/14/21 e síntese. Essa proposta não especifica número e significado das posições, método de seleção das cartas, perguntas de cada retorno, estados do diário ou regra de conclusão.
- A matriz de linguagem de 29/09, seção 16, exige fechar questão inicial, quantidade de leituras, duração e forma de retorno antes do convite de início. Os nomes das etapas devem corresponder a ações reais.
- `packages/domain/src/symbolic-calculations.ts` calcula somente uma carta por pergunta para quatro produtos explícitos, usando o spread candidato `atv-question-slots/1.0.0`. `apps/worker/src/symbolic-calculators.ts` não registra calculadora da Jornada. Estender o sorteio de uma carta ou os três slots para representar uma “tiragem profunda” criaria um método editorial que as fontes não aprovaram.
- O formulário privado já valida pergunta, objetivo e consentimento; não sorteia, agenda nem aceita cartas escolhidas pelo cliente. Os contratos de Foco Agora e Sim/Não dizem que suas políticas e interpretações também são candidatas, sem homologação transferível.

## Decisão necessária para destravar E1–E5

Responsável de produto/editorial: aprovar um contrato versionado com (1) número, nomes, ordem e papel de cada posição da tiragem inicial e de cada retorno; (2) duração e calendário, inclusive o que ocorre se alguém atrasa, pula ou revisa um check-in; (3) perguntas e limites do diário, relação permitida entre objetivo, cartas anteriores e respostas, e critério de síntese/conclusão; (4) exemplos sintéticos completos e casos de indisponibilidade, linguagem de agência e critérios de revisão; (5) entregáveis aplicáveis, resolvendo a diferença entre áudio citado na proposta e entrega somente web no catálogo. A decisão precisa distinguir hipótese de oferta de requisito aprovado, sem criar preço ou direito de acesso por inferência.

Após essa aprovação, a responsável técnica pode versionar o sorteio e os facts com proveniência, snapshots imutáveis, transições/idempotência de check-ins e projeção fiel; testar cálculo, persistência privada, leitura e recuperação. Gate B/Lab, aprovação editorial legítima e gates hospedados permanecem obrigatórios. Não há autorização para reaproveitar automaticamente o spread de uma carta, marcar etapas por tempo sem interação ou publicar uma jornada sem interpretação.

**Estado:** E1 `EM_EXECUCAO` com entrada privada local concluída, método/processamento/facts bloqueados por decisão editorial; E2–E5 `PENDENTE`. Retomar quando o contrato versionado e os exemplos forem aprovados. Até lá, release/default13 off, gasto automático R$0 e nenhuma sessão ou liberação hospedada comprovada. Próximo produto seguro na fila: `dream-dossier`.
