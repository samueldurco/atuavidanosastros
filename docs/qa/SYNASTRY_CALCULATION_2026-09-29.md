# Sinastria — composição interna experimental — WU156

RUN_ID: `ATV-20260902-170644Z-01A0630F`. Data: 29/09/2026. Produto: `synastry`, marco E1. Contrato: [synastry-calculation.md](../contracts/synastry-calculation.md).

Implementação local: fábrica interna com política de aspectos explicitamente injetada, dois mapas natais validados, 20 posições canônicas, 100 pares completos e contexto declarado opcional. Não foi registrado um cálculo produtivo, criado um endpoint ou aprovado conteúdo de relacionamento. O runtime comum continua sem `synastry`.

Sete testes focais passaram em `test-results/wu156-worker-focal.log`: fronteira circular e de orbe sem tolerância nominal; 100 ausências com estabilidade desconhecida; duas bases reais do motor com dados sintéticos; cartesianidade de 100 conjunções; referências, proveniência e limites do envelope; captura contra mutação assíncrona de input/política/provider; rejeição antes do provider de input, consentimento e política inválidos; saída inválida e cancelamento antes/depois do cálculo. O contexto máximo mantém 121 fatos e não altera a geometria. Campos pessoais extras do provider não entram nas posições projetadas.

A suíte completa do Worker passou com 142 testes e nenhuma falha (`test-results/wu156-worker-test.log`). A checagem de tipos do Worker passou (`test-results/wu156-worker-check.log`). Sem alteração de UI, esta WU não exige nova rodada visual ou E2E do leitor. A CI anterior, WU155 no SHA `5e903e4eabb1fa71f0729c4179348440dc60d077`, concluiu com sucesso no run `36538308841` (`test-results/wu156-ci.json`).

Formatação, diff staged, escopo e varredura de segredos são verificados antes do commit, com evidências `test-results/wu156-format-check.log` e `test-results/wu156-stage.json`. O stage contém somente os seis arquivos desta WU; alterações paralelas de administração, TikTok, mídia e social são preservadas.

Limites: política sem aprovação editorial; precisão de ambas as bases não certificada; todos os 100 pares com estabilidade desconhecida; sem casas/ângulos, movimento, eventos, score ou interpretação; sem identidade ou autorização bilateral verificadas; compartilhamento não autorizado. Fixture e teste local não homologam motor, produto, modelo, leitura ou ambiente hospedado. E1 integral e E2–E5 continuam pendentes; liberação permanece bloqueada pelos requisitos aplicáveis. Gates off e custo automático R$0.
