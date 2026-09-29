# Semana — fuso e tema declarados (WU186)

RUN_ID: `ATV-20260902-170644Z-01A0630F`. Requisito E1: entrada explícita do fuso atual e tema da Semana, previstos na arquitetura do produto. Implementação e provas são locais, com dados sintéticos e publicação desabilitada.

## Implementação local

- Pedido `atv-week-reading-request/2` exige fuso IANA reconhecido ou UTC e uma escolha entre visão geral, conversas e vínculos, organização e prioridades, ritmo e cuidado cotidiano. Não há escolha automática. O relato opcional admite até 900 unidades UTF-16.
- O formulário pede novo consentimento quando as escolhas mudam. Limpar ou iniciar outro pedido remove as escolhas e a autorização. O fuso atual permanece separado do fuso natal.
- A migração `20260929140000_week_reading_preferences.sql` preserva a versão 1 e o workflow existente. A versão 2 guarda o comando exato em recibo privado e compõe seu contexto com fuso/tema declarados, limitado a 1200 unidades. A geometria natal e as sete amostras às 12h UTC permanecem iguais.
- HTTP e SQL validam tipos, campos exatos, datas, revisão, consentimento, fuso e tema. Recuperação UUID, idempotência, conflitos, RLS e redaction continuam aplicáveis. Recuperar um pedido não depende de manter o perfil natal ou de gates de criação ainda abertos.
- O forward-fix existente revoga criação/replay nas duas versões sem remover recuperação. Reaplicar a migração restaura o mesmo recibo. Datas importantes, calendário e lembretes opcionais não integram esta WU.

## Provas e limites

Web: 1443/1443 testes em 70 arquivos. Após as correções finais de tipos, chave Svelte e mensagem explicativa, os dois arquivos focais passaram novamente: 74/74. Svelte: 0 erros e 0 avisos; tipos Wrangler atualizados. ESLint focal sem diagnósticos.

Playwright final: 16/16, incluindo escolha obrigatória, fuso inválido, novo consentimento, recuperação após resposta perdida sem nova criação, estados bloqueados, autenticação, contexto opcional, limpeza e reflow/teclado em 1440/820/390/320 px. Quatro screenshots finais preservados; conferência visual sem cortes ou sobreposições, com o texto correto de contexto declarado. O servidor de teste foi construído pelo fluxo Playwright existente.

Provas extensas: `test-results/wu186-{web,types,focal-final,lint,e2e-final,format-check,secrets}.log`; `test-results/wu186-visual/week-reading-intake-{320,390,820,1440}.png`. CI185 `36590305464` SUCCESS no SHA anterior `e96d23f6d300e62b5d8bf9d0e8f615feaa569ba9`, comprovado em `test-results/wu186-ci185-success.json`. Formato, diff e segredos staged são conferidos no fechamento; CI desta WU será conferido pelo novo SHA.

Esta entrada não calcula dias locais completos, tendências, eventos ou janelas favoráveis. E1/E3/E4 permanecem EM_EXECUCAO e E2/E5 PENDENTE: escopo temporal integral, homologação do motor, interpretação e aprovação legítimas e aceite hospedado continuam pendentes. Nenhuma chamada paga, liberação ou alteração de gates; gasto automático R$0. Supabase pausado e Cloudflare 403 permanecem nos bloqueios já registrados.
