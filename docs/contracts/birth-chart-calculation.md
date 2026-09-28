# Mapa Astral — base persistida experimental

WU122; produto `birth-chart`, rota `/mapa-astral`, formatos de catálogo web/PDF/SVG. Implementação e provas locais; E1 permanece parcial até homologação do motor e validação hospedada. O contrato `atv-natal-product-calculation/1.0.0` não muda: esta revisão endurece a preparação editorial de snapshots existentes, sem recalcular nem reescrever resultados.

## Entrada e projeção

Reutiliza onboarding e solicitação natal `atv-natal-request/1`: perfil próprio com hora declarada exata, revisão esperada e consentimento específico de armazenamento do produto. O servidor copia a versão imutável; calendário, correspondência civil/UTC, fuso e coordenadas são validados pelo cálculo. Relato opcional de fixtures/generic workflow é `reported`, fonte `input.context`; não altera geometria. O intake natal v1 não aceita contexto adicional. Ver `natal-product-requests.md`, `natal-onboarding.md` e `astrology-engine.md`.

A preparação exige coerência da projeção persistida inteira:

- Dez corpos canônicos distintos, cada um com exatamente corpo, longitude tropical em `[0,360)`, latitude finita entre −90 e90, distância positiva e movimento booleano.
- Ascendente e MC solicitados. Com Ascendente disponível, doze cúspides Placidus válidas e estado `ok`; com ASC ausente, estado `not-applicable` e lista vazia. Nenhum sistema alternativo é inferido.
- Fatos de todos os dez corpos, ASC/indisponibilidade, MC e doze cúspides quando disponíveis; IDs, classificação `calculated`, fonte versionada e exibição por setores semiabertos/truncamento de seis casas conferem exatamente com os números. Apenas `personal-context` pode ser acrescentado como relato.
- Seis campos de dados, contrato de projeção e contrato experimental do motor conhecidos, proveniência tropical/geocêntrica aparente da data, versões não vazias e avisos presentes nos limites. Campos extras, aspectos ou corpos adicionais são recusados.

Ordem de chaves JSONB e dos corpos não é autoridade; a identificação usa IDs canônicos. A conferência não autentica origem, não confirma que números vieram do motor e não certifica precisão, temporalidade histórica, movimento ou ângulos. As limitações e a homologação independente do motor continuam obrigatórias.

## Preparação e indisponibilidade

`prepareProductFacts` recusa divergência com `calculation_invalid`. Uma projeção polar coerente preserva dez posições e MC experimentais, ASC ausente e casas vazias; retorna `insufficient_facts` para o Mapa Astral completo, inclusive com relato do usuário. Não substitui casas, omite fatores silenciosamente ou converte a base em produto de escopo menor.

Facts permanecem `partial`; 24 fatores calculados com casas disponíveis, ou25 incluindo relato. Evidência editorial passa a `atv-product-editorial-evidence/1.6.0`, exigindo novo digest/revisão para avaliações novas. Aprovações históricas não são reescritas. Corpus sintético `1.8.0` conserva105 casos:102 preparados, três polares bloqueados e306 posições de repetição. Fixtures não homologam conteúdo.

## Escopo ainda pendente

Aspectos estão explicitamente `not-assessed`. Geometria de aspectos já tem contrato próprio (`astrology-aspects.md`), mas não há política editorial aprovada do Mapa Astral que autorize integrar orbes/seleção ao cálculo. Uma leitura completa e sua homologação devem resolver esse requisito, cobertura de planetas/ângulos/casas e revisão legítima; não podem assumir fixture ou prompt genérico como aprovação. Motor de produção, modelos aprovados e Supabase hospedado permanecem bloqueados pelas condições registradas na execução.

E3 usa persistência/privacidade/Biblioteca/recuperação existentes. E4 exige resultado web e PDF/SVG recuperáveis conforme catálogo, com todos os gates. Prova focal: `../qa/BIRTH_CHART_BASE_2026-09-28.md`.
