# Atlas da Vida 360 — base natal (WU212)

RUN_ID: `ATV-20260902-170644Z-01A0630F`. Escopo: E1 local, parcial, de `life-atlas`.

O worker compõe a projeção natal já existente de `birth-chart` e acrescenta quatro fatos relatados, mantendo prioridades e contexto separados da geometria. A nova opção `experimentalLifeAtlasBase` fica desligada por padrão e não substitui a allowlist do processador. O preparo editorial bloqueia toda projeção coerente por `insufficient_facts` e recusa adulterações por `calculation_invalid`. Nenhum caminho de 30 dias ou associação entre áreas e posições é produzido.

Validação local sintética: `apps/worker/life-atlas-calculators.test.mjs` cobre opt-in, allowlist, igualdade da base natal salvo o timestamp de execução, quatro relatos, Placidus indisponível, rejeição pré-provider e adulterações da projeção. Passaram 4/4 testes focais (`test-results/wu212-life-atlas-tests.txt`) e 355/355 da suíte worker (`test-results/wu212-worker-tests.txt`); checagem TypeScript aprovada (`test-results/wu212-worker-check.txt`).

E1 ainda requer método aprovado para ligar capítulos natais e prioridades; E2 requer interpretação e exercícios revisados. E3–E5, engine/licença, Gate B/Lab, PDF/SVG, migração/sessão hospedadas e release permanecem condicionais. Flags/default13 ficam fechadas e gasto automático permanece R$ 0.
