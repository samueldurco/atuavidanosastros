# Meio do Céu — projeção e preparação persistida

WU-129 · RUN_ID `ATV-20260902-170644Z-01A0630F` · 28/09/2026.

E1 reutiliza o intake natal `atv-natal-request/1`: perfil exato consentido, revisão esperada e consentimento separado para guardar o snapshot. Calendário, correspondência civil/UTC e coordenadas são validados antes do cálculo. A projeção `atv-natal-product-calculation/1.0.0` contém somente o MC; planetas, Ascendente e cúspides não são solicitados. A entrega do catálogo é web. O comando natal v1 não recebe contexto; eventual contexto de fixture ou snapshot permanece relato `input.context`, nunca geometria.

Antes de preparar facts persistidos, `inspectMidheavenProjection` confere domínio, contrato da projeção, MC finito em [0,360), fato calculado com signo/grau e fonte exatos, posições vazias, ASC nulo e casas `not-requested`. Contrato do motor, frame, zodíaco tropical, status experimental e avisos copiados nos limites devem ser coerentes. A fonte reúne provider, versão, algoritmo e versão da projeção. Ordenação de chaves JSONB ou fatos não interfere. Divergência retorna `calculation_invalid` antes de draft, revisão ou digest. Coerência não autentica a origem nem certifica precisão científica.

O MC permanece disponível nas latitudes polares: seu cálculo é separado do Ascendente e das casas. Não há substituição de sistema de casas. Setores tropicais são semiabertos; o display trunca seis casas decimais sem arredondar para o signo seguinte. A candidata aceita UTC de 1900 a 2099 e coordenadas nos limites documentados; UTC aproximado a UT1 e demais limites científicos permanecem em [astrology-engine.md](astrology-engine.md).

Facts seguem `atv-facts/1.0.0`, capacidade `purpose-direction` e completeness parcial. Evidência editorial `1.10.0` vincula esta inspeção ao digest. Corpus sintético `1.12.0` mantém 105 casos, 102 solicitações preparadas, três bloqueadas e 306 posições; os fingerprints das solicitações não mudaram. Manifestos anteriores não comprovam esta revisão. Não houve chamada de modelo, gasto, aprovação editorial ou liberação.

E1 é **BLOQUEADO para aceite integral** até homologação aplicável. E2 exige leitura útil específica do MC e fonte/conteúdo ou modelo/prompt validado, com revisão legítima. E3–E5 dependem de autoridade, fluxo privado recuperável, resultado web e demonstração hospedada. Provas locais: [MIDHEAVEN_BASE_2026-09-28.md](../qa/MIDHEAVEN_BASE_2026-09-28.md).
