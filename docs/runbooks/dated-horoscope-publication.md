# Horóscopo datado: assinatura e publicação

Estado verificado em 20/10/2026: corpus V3 aprovado por revisão independente automatizada, 89/100 e oito bloqueadores PASS. Isso não confirma assinatura real, admissão, merge ou disponibilidade hospedada. A política evergreen anterior permanece separada.

## Autoridade e limites

O pedido finito está em `docs/editorial/horoscope-2026-10-20/authority-request.json`. Vincula a decisão registrada, o parecer exato, corpus, algoritmo e três períodos à identidade existente `atvna-editorial-service`, chave `github-actions-editorial-20261006-01`. Usa exclusivamente o segredo existente `ATVNA_EDITORIAL_SIGNING_KEY` do environment `atvna-editorial-signing`.

Cobertura autorizada a partir de 01/10/2026; concessão válida de 20/10/2026 10:55:15 UTC até 04/01/2027 16:00:39.930 UTC, dentro da validade real da chave. Cada lote precisa de assinatura recente e admissão em até 24 horas. A validade não é renovada automaticamente. O histórico já admitido usa sua data original de admissão e continua sujeito a revogação.

Uma cobertura precisa caber inteira no prazo da concessão. Portanto, o mensal de janeiro de 2027 já exige renovação antes de ser preparado em 31/12/2026; não basta esperar a expiração da chave em janeiro. Mudanças em corpus, método, algoritmo, identidade ou parecer exigem nova revisão e novo pedido vinculado. A renovação deve passar pela autoridade legítima, sem gerar identidade ou segredo fictício.

## Inventário remoto observado

- Permissão padrão do `GITHUB_TOKEN`: leitura; `can_approve_pull_request_reviews=false`.
- Nenhum secret ou variable no nível do repositório; nenhum PAT/App de publicação disponível nesse inventário.
- Environment de assinatura: somente `ATVNA_EDITORIAL_SIGNING_KEY`; política de branch personalizada permite `codex/editorial-seo-piloto-20261006`. `main` ainda não estava permitido no inventário.
- `main` não apresentou proteção de branch nem regras aplicáveis. O publicador exige explicitamente seus gates; não alegar que o GitHub já impõe proteção de branch.

O ajuste remoto mínimo a ser realizado pelo executor após revisão é acrescentar `main` às políticas do environment existente, preservando a entrada antiga. Não mudar o segredo ou a chave, nem habilitar a flag combinada que permite criar/aprovar PRs pelo `GITHUB_TOKEN`.

A restrição atual é concreta: sem credencial de publicação já disponível e sem habilitar aquela flag, o agendamento prepara e assina artefatos, mas não abre ou integra PRs automaticamente. `ATVNA_DATED_HOROSCOPE_AUTOPUBLISH` fica ausente. Uma solução futura para publicação sem operador exige decisão operacional adicional e prova hospedada; este runbook não declara essa etapa concluída.

## Publicação inicial por owner CLI

1. Integrar o código e o índice inicialmente vazio por PR, com CI aprovada. Confirmar o commit em `main`.
2. O executor acrescenta apenas a política `main` ao environment `atvna-editorial-signing`, se ela ainda estiver ausente. Registrar a resposta nominal como evidência, sem ler o segredo.
3. Disparar o workflow no commit corrente:

   ```powershell
   gh workflow run dated-horoscope.yml --repo samueldurco/atuavidanosastros --ref main -f mode=bootstrap -f delivery=signed-artifact
   ```

4. Aguardar o run completo. `sign` precisa terminar com sucesso e `publish` deve estar ausente ou ignorado. Registrar ID, tentativa e SHA. O workflow calcula os três períodos que contêm a data UTC de execução, reproduz fatos e textos, verifica o parecer congelado e assina com a custódia existente.
5. Usar um checkout limpo do mesmo SHA, com dependências instaladas pelo lockfile e a autenticação já existente do proprietário no GitHub CLI. Não imprimir nem exportar o token. Executar:

   ```powershell
   node --experimental-strip-types scripts/bootstrap-dated-horoscope.mjs <ID_NUMERICO_DO_RUN>
   ```

O bootstrap verifica repositório, workflow, evento, SHA, branch, tentativa, job e artefato recente. Baixa apenas o pacote público assinado; a chave privada permanece no environment externo. O token da autenticação do `gh` permanece na memória do processo. O diretório de saída por run/tentativa precisa ser novo.

O mesmo publicador usado no job futuro verifica assinaturas e reprodução, admite o lote, cria um branch somente com o índice e até três arquivos estáticos imutáveis, abre PR e dispara CI explicitamente no SHA exato. Exige sucesso de `dispatch-guard`, `quality`, `accessibility`, `secrets`, `current-readings` e `sbom`. Antes do merge, verifica `main`, SHA do PR, estado de merge e lista fechada dos arquivos permitidos. Não envia aprovação humana, bypass ou opção administrativa.

O publicador informa a URL do PR. O executor deve anexá-la à tarefa e guardar os links de CI e merge. A integração Git do Cloudflare é verificada pelo resultado hospedado, sem presumir que um merge disparou publicação.

## Concorrência e repetição

O workflow tem um grupo único de concorrência para schedule e dispatch, sem cancelar a execução em andamento. O publicador acrescenta um lock atômico compartilhado por owner CLI e job na referência `refs/heads/automation/horoscope-publication-lock`; ele falha se a referência já existir. Não toma locks antigos automaticamente. Libera a referência somente quando ela ainda aponta para o SHA adquirido.

Se houver interrupção abrupta, o lock pode permanecer. Antes de removê-lo, o executor deve conferir runs, processos, branch de publicação, PR e eventual merge. Não apagar enquanto outra publicação estiver ativa. Falha de liberação também exige inspeção.

Se `main` avançar durante a assinatura/CI, o publicador deixa o PR sem merge e exige uma nova execução a partir do estado atual. Intervalos já admitidos mantêm bytes, datas e atestações originais; a comparação ignora somente o horário válido de execução em `provenance.calculatedAt`. Qualquer mudança factual/editorial relevante bloqueia a substituição. A conferência hospedada usa os documentos efetivamente admitidos.

## Agenda e prova hospedada

Os limites de cobertura são UTC e aparecem na leitura. O cron executa às 20:15 e 22:15 UTC (17:15 e 19:15 em Brasília), preparando o dia seguinte antes da troca do dia UTC. Também prepara a semana quando o dia seguinte é segunda-feira e o mês quando é dia 1. Bootstrap cobre os três períodos correntes mesmo quando a entrada em operação ocorre no meio da semana/mês.

Na configuração atual, cada execução agendada produz um artefato para publicação pelo operador; não garante que novas leituras estejam no site sem essa operação. O job `publish` só pode rodar após habilitação explícita da variável e resolução real da permissão de PR. Essa habilitação não faz parte deste procedimento.

Depois do merge, o publicador exige HTTP 200, metadados Article e texto integral exato de todos os artigos do lote. Também confere a API atual de todos os 12 signos por período coberto: bootstrap requer 36 artigos e 36 consultas. Uma cobertura futura pode ter artigo disponível sem substituir o período corrente. A consulta deve continuar retornando o período vigente ou ausência honesta. Não basta testar a página inicial.

Falha editorial, factual, de assinatura, CI, admissão ou prazo impede nova publicação. Falha hospedada após merge é registrada como falha de verificação, sem afirmar rollback. O site conserva o histórico e informa ausência de leitura atual quando nenhum intervalo admitido cobre o momento; os guias educativos permanecem rotulados como apoio.

## Evidências e custo

O índice assinado compacto permanece no Worker; pacotes completos ficam em assets estáticos separados por intervalo e são carregados quando necessários. Evidências compartilhadas são deduplicadas por digest dentro do arquivo. Isso evita incorporar todo o histórico ao bundle, sem apagar edições antigas.

Os testes locais usam exclusivamente chaves efêmeras sintéticas. O inventário e os testes não comprovam capacidade de publicação remota. Arquivos de prova local estão em `test-results/dated-horoscope-*.log`; execução real deve acrescentar IDs e resultados de assinatura, CI e hospedagem. Nenhum recurso pago ou novo segredo faz parte deste fluxo.

Referências operacionais: [controle de criação/aprovação de PRs por Actions](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository#preventing-github-actions-from-creating-or-approving-pull-requests), [gatilhos de workflows](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow). O dispatch explícito da CI evita depender do comportamento implícito dos eventos do token.
