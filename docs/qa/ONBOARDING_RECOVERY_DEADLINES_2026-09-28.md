# Recuperação natal com prazo efetivo

RUN_ID `ATV-20260902-170644Z-01A0630F`. WU-108, 28/09/2026.

## Escopo

Cliente compartilhado por NatalOnboarding e NatalIntake: prazo15s cadastro/10s consulta na entrada de produto, headers+JSON no mesmo orçamento. Rejeita antes de abort; não depende de fetch respeitar o sinal. Timers são limpos, respostas/rejeições tardias não alteram a UI nem repetem POST. Mantém revisão, consentimento desmarcado após recuperação, formulário bloqueado em estado incerto e recuperação explícita por GET. Envelope de resposta estrito evita que400 ambíguo desbloqueie edição. Redirect recusado; no-store/same-origin preservados. Nenhuma mudança de layout ou gate.

Limitação: não garante cancelamento da transação remota nem preempção de CPU ou execução pontual com timers suspensos. Um POST pode ter sido persistido; GET válido é necessário antes de nova edição. Não acrescenta geocodificação, processamento, publicação ou homologação.

## Verificação

- Cliente:16 PASS (`test-results/wu108-client.log`). GET/POST/intake × headers/corpo; transporte ignora abort, retorno no abort, rejeição tardia, orçamento único, limpeza de timer, comandos/revisão/headers preservados, envelopes inválidos e nova recuperação explícita.
- Web completo:1173 PASS em58 arquivos; check:0 erros/0 avisos; lint focal e diff-check PASS. Evidências `test-results/wu108-{unit,check,lint}.log`.
- E2E:76 PASS em5,5min, serial, com build/preview local (`test-results/wu108-e2e.log`). Quatro testes novos cobrem cadastro/consulta/intake com resposta tardia incapaz de substituir perfil recuperado e400 ambíguo que não desbloqueia mutação. Suíte existente cobre consentimento, versões, exclusão, estado incerto, revisão e entradas natais, de data e de par; visual/teclado/reflow nas larguras1440/820/390/320. Nenhuma mudança de layout.

CI anterior WU107 `16835985e2715ea414140ff0a1bee9daca26f2c2`: quality109070340228, secrets109070339798 e Pages109070784852 completed/success. Toolchain Wrangler existente4.128.0 apenas para check/build/preview local. Concorrentes não incluídos.
