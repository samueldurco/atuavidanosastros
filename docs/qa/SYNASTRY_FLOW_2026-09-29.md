# Sinastria — fluxo persistido local, 29/09/2026

RUN_ID: `ATV-20260902-170644Z-01A0630F`. WU162; requisito independente de E3: ligar o intake WU160 e o calculador WU156 ao processador existente e provar persistência/recuperação privada. Política sintética `synthetic-synastry-vertical-not-approved@qa-fixture-1`; nenhum dado pessoal real.

O runtime aceita `experimentalSynastryPolicy` somente por configuração interna explícita e validada, além da allowlist independente. Nenhum endpoint ou entrypoint hospedado recebe essa opção. Configuração padrão permanece com 13 bases parciais e Sinastria indisponível. A política é copiada antes do cálculo; mutação posterior da configuração não amplia produtos habilitados. Política inválida falha antes do transporte.

O teste vertical usa onboarding, consentimentos separados, controller, handlers HTTP, PostgreSQL/RLS, RPCs com lease/revisão, calculador Caelus e leitura da Biblioteca existentes. A migração WU160 é aplicada na base sintética isolada. Somente o intake local é habilitado para exercitar o percurso; aprovação do motor permanece falsa, sem promoção editorial ou READY.

- Pedido, recibo imutável e item privado persistem uma vez. Histórico: QUEUED → CALCULATED → AWAITING_EDITORIAL, revisões 1–3.
- Snapshot completo: 20 posições, proveniências independentes, 100 pares em ordem canônica, 121 fatos com contexto consentido. O cálculo sem contexto tem 120 fatos e geometria idêntica.
- Todos os pares mantêm precisão desconhecida e budgets nulos. Política sem aprovação, score nulo, eventos vazios e compartilhamento não autorizado permanecem explícitos.
- A preparação editorial conserva todos os fatos no perfil específico. Não há interpretação, chamada de modelo, promoção ou artefato.
- Biblioteca pendente oculta entradas, contexto e cálculo. Outro usuário não acessa pedido, perfil, Biblioteca ou downloads.
- Perda de confirmação recupera sem repetir criação; edição/exclusão do perfil não altera snapshot; duplicatas/reprocessamento permanecem nos mecanismos existentes.

Validação final: runtime/calculador focal 15/15; vertical PostgreSQL/RLS 62/62; regressão Worker 153/153; tipos Worker PASS e web com zero erros/avisos. ESLint focal, Prettier, diff e secrets staged também registrados. A primeira rodada vertical teve 61 aprovações e uma asserção nova usando campos incorretos de estabilidade; corrigida para `calculation.policy` e `status='unknown-accuracy'`, sem modificar o contrato ou afrouxar o cálculo.

Provas: `test-results/wu162-runtime.log`, `wu162-vertical-final.log`, `wu162-worker-regression.log`, `wu162-worker-check.log`, `wu162-web-check.log`, `wu162-eslint.log`, `wu162-format-check.log`, `wu162-staged.diff`, `wu162-secrets.log`. Nenhuma superfície visual mudou nesta WU; QA de intake permanece na WU160.

E1/E2 continuam bloqueados por política/motor/revisão legítimos e ambiente hospedado. E3 integral continua bloqueado por autoridade de aprovação e sessão hospedada. E4 web/PDF final e E5 completo permanecem pendentes. Fixtures não aprovam produto. Custo zero; gates preservados; nenhuma liberação hospedada.
