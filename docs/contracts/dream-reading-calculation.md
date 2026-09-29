# Leitura Essencial de Sonhos — base relatada

Produto `dream-reading`, rota `/leitura-essencial-sonhos`, entrega de catálogo web. RUN_ID `ATV-20260902-170644Z-01A0630F`.

E1 reutiliza a entrada privada e persistida das WU056–057, o contrato `atv-workflow/1.0.0` e `calculateDreamRecord`. Exige consentimento de armazenamento `atv-input-consent/1`, data válida e relato até 6000 unidades UTF-16. Emoções (até oito de 80), associações pessoais (até oito de 200) e contexto (até 1200) são declarados pela pessoa. Campos desconhecidos e caracteres de controle são recusados. Contexto é opcional; continuidade é um consentimento separado e não carrega histórico.

O snapshot `atv-symbolic-calculation/1.0.0`, tipo `dream`, estado `recorded`, preserva a entrada e os fatos `reported` na ordem data → trechos do relato → emoções → associações → contexto disponível. Trechos de até 1800 unidades não separam pares UTF-16. Cada ID, fonte e texto mantém sua correspondência exata. Não calcula significados, emoções, recorrência ou diagnóstico.

Na WU147, `validDreamReadingProjection` reconstrói essa projeção pelo parser/calculador existente, usando o produto `dream-reading`. Verifica campos exatos de entrada, contexto e continuidade, todos os fatos e os três limites originais. Histórico e recorrência permanecem `false`; hipóteses simbólicas na base permanecem vazias. O preparo inspeciona os fatos originais antes da normalização genérica, recusando metadados adicionais, fatos omitidos/duplicados, mudanças de fonte/texto/ordem ou inferências introduzidas. Falha resulta em `calculation_invalid`, sem corrigir ou truncar o snapshot.

Preparo `atv-product-editorial-evidence/1.22.0`, corpus `atv-product-facts-synthetic/1.22.0`, facts `atv-facts/1.0.0`, capacidade `dream-exploration`, completude `partial`. A integridade da projeção não autentica consentimento ou origem: acesso privado, entrada real, versão e aprovação continuam sob a autoridade do fluxo existente.

E2 deve separar elementos relatados, emoções declaradas, associações pessoais, recorrência, histórico, hipótese simbólica e pergunta exploratória, conforme V3 Sonhos & Símbolos. Símbolos não são um dicionário universal; ausência de histórico/recorrência não permite inventá-los. A Leitura Essencial tem escopo próprio, distinto da observação breve do Registro de Sonho. Este contrato de base não aprova interpretação, prompt, modelo, revisão editorial ou liberação hospedada. E1 integral depende de sessão real; Supabase pausado continua bloqueando essa prova. Sem nova chamada a provedor ou gasto automático.
