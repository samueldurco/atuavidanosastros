# Jornada de Direção — decisão de método E1

RUN_ID `ATV-20260902-170644Z-01A0630F`. WU209. Escopo: leitura inicial e experimentos de baixo risco da Jornada de Direção (`direction-journey`).

O plano mestre §7.4 define objetivo declarado, leitura inicial, experimentos, check-ins nos dias 7/14/30 e síntese; §7.5 fixa limites editoriais. O contrato `atv-direction-journey-calculation/1.0.0` fornece somente objetivo/contexto relatados e datas civis calculadas. A matriz de linguagem indica ações e formato web, sem método de interpretação. O método aprovado da Bússola de Carreira depende de fatos astrológicos desse produto e não constitui uma regra de leitura para a Jornada sem nascimento.

Decisões pendentes para liberar a próxima etapa E1:

1. Editorial de produto: aprovar um método versionado que especifique quais fatos sustentam a leitura inicial, quais afirmações e perguntas são permitidas e como a leitura reconhece contexto social, saúde, oportunidade e escolha. Se reutilizar uma leitura da Bússola ou do Mapa de Propósito, definir elegibilidade, consentimento, proveniência e comportamento quando ela não existir.
2. Editorial de produto: aprovar critérios verificáveis para selecionar experimentos reversíveis e de baixo risco, incluindo limites de custo, tempo, exposição e acessibilidade, além de recusa quando o objetivo ou contexto for insuficiente. O texto não deve prometer emprego, renda, prosperidade ou destino.
3. Engenharia e qualidade: versionar a projeção e validar proveniência, esquema e recusa editorial com testes sintéticos. Só depois avaliar check-ins, síntese e continuidade ATV+ com autorização e isolamento próprios.

Até essas decisões, `prepareProductFacts('direction-journey', ...)` deve continuar retornando `insufficient_facts` para a projeção coerente; `calculation_invalid` continua para adulterações. Intake privado e cronograma civil locais não representam uma leitura entregue, elegibilidade comercial ou liberação hospedada. E1 permanece **EM_EXECUCAO**; E2–E5 **PENDENTE**. O próximo trabalho da fila é `life-atlas`, sem encerrar a Jornada.
