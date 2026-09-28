# Três Pilares — projeção e preparação persistida

WU-119 · RUN_ID `ATV-20260902-170644Z-01A0630F` · 28/09/2026.

E1 reutiliza o intake natal `atv-natal-request/1`: perfil exato consentido, revisão esperada e consentimento separado para o snapshot do produto. O worker valida calendário, correspondência civil/UTC e coordenadas. A projeção existente `atv-natal-product-calculation/1.0.0` seleciona apenas Sol, Lua e Ascendente; contexto eventual é relatado, nunca geometria. A entrega de catálogo é web.

Antes de preparar facts a partir de um snapshot persistido, `inspectThreePillarsProjection` confere os dois corpos distintos, longitudes finitas em [0,360), latitude/distância/movimento válidos, Ascendente, signos/graus e fontes exatos. O movimento é informação experimental da candidata. Não há MC, cúspides, aspectos nem regências projetados. Fonte reúne provider, versão, algoritmo e versão da projeção. Contratos de engine/projeção, frame, zodíaco, status experimental e avisos copiados devem permanecer coerentes. Ordenação de chaves JSONB não importa.

Um snapshot polar coerente preserva Sol e Lua e o aviso de Ascendente indisponível, mas a preparação da leitura **Três Pilares** retorna `insufficient_facts`; dois fatores não substituem o terceiro, mesmo com contexto. Divergência entre números, facts ou proveniência retorna `calculation_invalid`. Nenhuma recalculação, chamada de modelo, fonte editorial ou homologação é introduzida. Coerência não autentica origem nem precisão.

Facts seguem `atv-facts/1.0.0`, capacidade `natal-synthesis`, escopo parcial. Na WU119, evidência 1.4.0 e corpus 1.6.0 vincularam a coerência aos digests existentes. A WU120 acrescenta o [perfil editorial](three-pillars-editorial.md), evidência 1.5.0 e corpus 1.7.0. Permanecem 105 casos, 103 preparados e dois polares bloqueados (Três Pilares e Ascendente), totalizando 309 posições preparadas. Manifestos antigos não comprovam o contrato atual; não há ampliação de corpus nem aprovação de interpretações.

Limites científicos e de disponibilidade permanecem em `astrology-engine.md` e `natal-product-requests.md`. Todas as liberações continuam desligadas. E1 é parcial até homologação aplicável; E2 requer conteúdo completo e revisão legítima; E3–E5 exigem autoridade e demonstração do fluxo, incluindo as pendências hospedadas. Provas desta alteração: `../qa/THREE_PILLARS_BASE_2026-09-28.md`.
