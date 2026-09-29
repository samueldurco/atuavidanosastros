# Sinastria — QA da admissão e cobertura editorial

WU158, RUN_ID `ATV-20260902-170644Z-01A0630F`. Perfil `atv-synastry-editorial/1.0.0`, preparação 1.29.0 e prompt 1.0.16. E2 local: remover o bloqueio de transporte que recusava todos os 120/121 fatos e definir cobertura finita dos nove temas relacionais. Nenhuma interpretação ou política foi homologada.

## Provas

- Nove testes focais PASS em `test-results/wu158-focal-final.log`: projeção original, factual admission, contexto ausente/máximo, política com ID e versão de 80 caracteres, fontes maiores que 160, prompt inteiro sem truncamento, todas as 100 evidências cruzadas e nove temas com contexto relatado separado.
- O envelope de topologia com todos os campos nos comprimentos máximos admitidos cabe em 100000 caracteres de JSON, inclusive contexto de 1200 caracteres. Essa fixture deliberadamente não representa cálculo coerente; a geometria original continua sujeita ao guard do Worker.
- Alterações de cardinalidade, ordem, perfil, capability, completude, fonte, precisão inventada e contexto inválido falham. Tiers free/intermediate, contexto externo excessivo e tentativas de usar o orçamento por outro perfil são recusados antes de reserva/chamada.
- O schema de saída permanece inalterado: 19 hipóteses com menos de 40 evidências por claim, uma síntese, três perguntas e três limites cabem nas restrições premium. Ausências nominais permanecem rastreáveis e com estabilidade desconhecida. Relações adicionais, omissões de pares/temas/contexto, claims fora de ordem, scope integrado e perguntas duplicadas são rejeitados.
- A candidata de provedor fixture offline continua em `needs_editorial_review` e `publication=blocked`. A fixture textual identifica sua natureza estrutural e não prova utilidade semântica. Nenhum provedor externo foi chamado.
- Worker: 151 testes PASS; tipos do Worker PASS. Scripts de corpus/benchmark/comparação/revisão: 63 testes PASS. Evidências: `wu158-worker-test-final.log`, `wu158-worker-check.log` e `wu158-root-test.log`.

O primeiro teste focal usou equivocadamente `rules` em vez de `aspects` no fixture de política; a API recusou a entrada. Ajustes subsequentes corrigiram o nome do tier (`intermediate`), a identificação/revisão exigida pelo bridge e texto repetido de fixture que o Director corretamente rejeitou. Nenhuma dessas correções enfraqueceu os controles. A rodada final está registrada separadamente.

## Pendências de aceite

E1 integral BLOQUEADO por política/motor/entrada real. E2 integral permanece em execução e exige avaliação semântica situada, conteúdo aprovado ou modelo/prompt validado e revisão legítima. O runtime ordinário não registra Sinastria. E3–E5 e liberação hospedada permanecem pendentes; gates off, custo automático zero. A próxima alteração acompanha o produto no Lab com casos sintéticos explicitamente experimentais, preservando a indisponibilidade produtiva e sem tratar fixtures como aceite.
