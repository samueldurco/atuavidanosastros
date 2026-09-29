# Leitura Essencial de Sonhos — leitor e percurso local

RUN_ID: `ATV-20260902-170644Z-01A0630F`. WU149, 29/09/2026. Produto `dream-reading`, rota `/leitura-essencial-sonhos`, entrega de catálogo web. Dados e aprovação de teste são sintéticos; não constituem conteúdo homologado, sessão hospedada ou liberação.

## Requisito entregue

Entrega `atv-product-delivery/1.11.0`: data, relato completo e ordenado, emoções, associações pessoais e contexto aparecem como fatos registrados; seguem duas hipóteses com papéis próprios e uma síntese com duas perguntas exploratórias. As hipóteses conservam as referências exigidas pelo perfil editorial. A ordem recebida das afirmações não altera a ordem dos papéis na entrega. Opcionais ausentes recebem limites explícitos, sem inventar emoções, associações ou contexto.

A projeção relatada é capturada antes da primeira espera assíncrona; alteração posterior da entrada não modifica o resultado. Base inconsistente é rejeitada. Os rótulos humanos dos fatos são usados tanto no resultado quanto em Base e limites. Nenhum histórico é consultado, nenhuma recorrência ou condição clínica é inferida e não se atribuem significados universais aos símbolos.

## Provas locais

| Prova | Resultado / evidência |
| --- | --- |
| Worker | 125/125, `test-results/wu149-worker.log`; inclui entrega completa, opcionais ausentes e captura antes da espera. |
| SQL e Biblioteca | 22/22, `wu149-web-sql.log`; leitura, reabertura e reprocessamento preservam base e seções no pai e no filho. Autoridade de teste é sintética. |
| TypeScript | Worker passa, `wu149-worker-check.log`; web zero erros e avisos, `wu149-web-check-final.log`. |
| Navegador local | Rodada ampla: 75/79 em `wu149-e2e.log`; quatro falhas nos rótulos humanos foram corrigidas. Repetição focal 5/5 em `wu149-e2e-retry.log`: 79 casos distintos cobertos. Inclui 11 leitores e entrada simbólica com transporte mockado. |
| Leitura Essencial | 1440, 820, 390 e 320 px; oito grupos/seções, fatos e proveniência, teclado/âncora de histórico, recarga sem perda, ausência de overflow horizontal. Pending, revogação e falha não exibem leitura ou formatos. |

Inspeção visual das quatro larguras: `test-results/wu149-dream-reading-reader-{width}.png`, com recortes top/bottom, e `test-results/wu056-dream-reading-{width}.png` da entrada, regenerados na rodada ampla. Títulos, campos, foco de teclado, hierarquia e ações permanecem legíveis; o relato longo é íntegro. No celular, navegação e ações seguem o fluxo vertical. Fixtures mantêm download, e-mail, exclusão e reprocessamento indisponíveis; PDF e cartografia não são oferecidos para este produto.

## Aceite e pendências

Implementação e validação locais de E3–E5 demonstradas. E1–E5 integrais permanecem **BLOQUEADOS**: Supabase pausado impede sessão e percurso hospedados (proprietário: Resume project); E2 exige conteúdo/modelo validado e revisão editorial legítima (operador/editor). Fixtures não satisfazem esses requisitos. Os gates continuam desligados, gasto automático R$0, nenhuma liberação hospedada. Próximo produto elegível: Leitura da Data, preservando a fila dos 25, ATV+ e o plano original.
