# Ascendente — projeção e preparação persistida

WU-126 · RUN_ID `ATV-20260902-170644Z-01A0630F` · 28/09/2026.

E1 reutiliza o intake natal `atv-natal-request/1`: perfil exato consentido, revisão esperada e consentimento separado para o snapshot do produto. O worker valida calendário, correspondência civil/UTC e coordenadas. A projeção `atv-natal-product-calculation/1.0.0` contém somente o Ascendente; não solicita planetas, MC ou cúspides. Entregas do catálogo: web e SVG. O comando natal v1 não recebe contexto; o eventual `personal-context` de fixtures ou snapshots aceitos permanece relato `input.context`, nunca geometria.

Antes de preparar facts persistidos, `inspectAscendantProjection` confere domínio, contrato da projeção, ângulo finito em [0,360), signo/grau e fonte exatos, ausência de posições/MC/cúspides e casas `not-requested`. Contrato do motor, frame, zodíaco tropical, status experimental e avisos copiados nos limites devem ser coerentes. Fonte reúne provider, versão, algoritmo e versão da projeção. Ordenação das chaves JSONB ou dos fatos não altera o resultado. Qualquer divergência retorna `calculation_invalid`, antes de draft, revisão ou digest. Essa inspeção não autentica origem nem certifica precisão.

Um snapshot polar coerente conserva ASC nulo e aviso de indisponibilidade. Retorna `insufficient_facts`: contexto, notas de revisão ou sistema de casas alternativo não substituem o ângulo. A faixa conservadora da candidata retém ASC a partir de |latitude| = 66°. Os setores tropicais são semiabertos; o display trunca seis casas decimais sem arredondar para o signo seguinte.

Facts seguem `atv-facts/1.0.0`, capacidade `natal-synthesis`, completeness parcial. Evidência editorial `1.8.0` vincula a inspeção ao digest existente; corpus sintético `1.10.0` conserva 105 solicitações, 102 preparadas, três bloqueadas e 306 posições. Manifestos anteriores não comprovam esta revisão. Não houve novo cálculo, chamada de modelo, gasto, aprovação editorial ou liberação.

Limites científicos permanecem em [astrology-engine.md](astrology-engine.md). E1 é **BLOQUEADO para aceite integral** até homologação aplicável; E2 exige leitura completa útil, conteúdo/modelo aprovado e revisão legítima. E3–E5 exigem autoridade, fluxo e formatos recuperáveis, incluindo demonstração hospedada. Provas locais: [ASCENDANT_BASE_2026-09-28.md](../qa/ASCENDANT_BASE_2026-09-28.md).
