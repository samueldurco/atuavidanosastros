# Prazo de espera e recuperação no navegador

RUN_ID: `ATV-20260902-170644Z-01A0630F`. WU-104. 2026-09-28.

## Mudança

O controlador compartilhado de primeiro pedido e reprocessamento agora limita cada troca HTTP a 15 segundos de espera assíncrona, incluindo cabeçalhos e consumo do JSON. Antes, apenas sinalizava cancelamento ao transporte; um transporte que ignorasse o sinal podia manter a interface ocupada. A rejeição do prazo precede o abort e os timers são removidos ao encerrar a espera.

O caminho cobre entradas simbólicas, natal, data e par, consulta do pedido e leitura autenticada da versão recuperada. Não altera inputs, cálculos, interpretação, URLs, RPCs, layout, migrações ou gates. Armazena somente o UUID de correlação, não rascunhos pessoais. Após um prazo excedido, o usuário pode consultar explicitamente o pedido original, sem repetir a mutação.

## Regressões

`workflow-request-deadline.spec.ts` contém 19 testes determinísticos com relógio falso e transporte sintético. Exercitam as cinco mutações (incluindo reprocessamento), prazos nos cabeçalhos e no JSON, recuperação e leitura, o orçamento compartilhado de cabeçalhos/corpo, recusa tardia, resolução síncrona no abort, rejeição tardia, limpeza de timers e 401 sem leitura do corpo. Completamentos tardios não limpam UUID, não iniciam consultas, não autorizam outro pedido nem mudam o estado confirmado. A recuperação explícita funciona depois do prazo.

- Seis arquivos focais: **187 PASS**, `test-results/wu104-client-final.log`, repetidos após a correção de lint.
- Web completo: **1.143 PASS / 57 arquivos**, `test-results/wu104-unit.log`.
- Check web: **0 erros / 0 avisos**, `test-results/wu104-check.log`.
- Lint focal: **PASS**, `test-results/wu104-lint-retry.log`. A primeira execução detectou um parâmetro padrão sem uso; corrigido com anotação do tipo da função, sem mudar comportamento.
- Build local e **88 E2E PASS** (5,4 minutos): reprocessamento, entradas simbólicas, natal, data e par; `test-results/wu104-e2e.log`. Os E2E cobrem regressão dos fluxos; os 19 testes de relógio falso cobrem os prazos adversariais.
- CI anterior WU-103, SHA `eb441f77cd45127aec7896fb82ab7e7257b0ea4c`: quality `109053324062`, secrets `109053324708`, Pages `109053747082`, completed/success.

## Limites

O prazo é por troca HTTP, não por operação inteira: submissão reconhecida pode usar três trocas; recuperação, duas. Não interrompe CPU síncrona, suspensão de timers pelo navegador ou transação do servidor. Abort não significa rollback. O transporte original pode concluir depois; por isso nenhum timeout permite reenviar, apagar ou trocar a chave. Continuam válidos os limites de coordenação por aba/sessão e a verificação de proprietário, linhagem e referência ativa na Biblioteca.

Nenhum layout foi modificado; testes locais não certificam autenticação/JWT, latência de produção ou Gate B integral. Nenhum modelo homologado, chamada de IA, gasto, scheduler ou release foi ativado. A skill Wrangler orientou apenas a validação da toolchain local existente (4.128.0); referência oficial: https://developers.cloudflare.com/workers/wrangler/commands/.
