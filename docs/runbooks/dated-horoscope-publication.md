# Publicação do horóscopo nas páginas dos signos

A rotina `dated-horoscope` prepara, reproduz e assina os textos com a autoridade editorial existente. Depois da validação, o job `publish` grava o índice assinado e os 12 documentos da edição na branch de dados `horoscope-content`. A transação é um único push e uma repetição verifica os documentos já admitidos. O job de assinatura usa `atvna-editorial-signing`. O job de publicação usa o token da execução com escrita de conteúdo e leitura de artefatos. A branch de dados é pública e recebe somente leituras destinadas ao público e evidências compactas de assinatura.

O site verifica assinatura, escopo, revogação e digest antes de servir o texto integral em `/horoscopo/{signo}`. O índice e as abas de semana e mês consultam a mesma fonte. A troca da edição usa o calendário de `America/Sao_Paulo`. Os cálculos e as assinaturas continuam usando o contrato UTC registrado. Quando falta a diária de hoje, a página pode exibir uma edição anterior, identificada pela data. As URLs datadas já publicadas continuam servidas pelos assets admitidos e listadas no sitemap editorial. As novas edições atualizam as páginas fixas e seu `lastmod` em `sitemap-pages.xml`.

## Agendamento e recuperação

- O cron roda às 20:15 e 22:15 UTC e prepara o próximo dia. Também prepara a semana quando o dia-alvo é segunda-feira e o mês quando o alvo é dia 1. O wrapper usa a janela agendada mais recente para que uma entrega atrasada após a virada cubra a data esperada.
- Para recompor o período vigente, disparar no commit corrente de `main`.

  ```powershell
  gh workflow run dated-horoscope.yml --repo samueldurco/atuavidanosastros --ref main -f mode=bootstrap -f delivery=live
  ```

- Usar `mode=next` para antecipar a próxima edição. Para investigação com artefato, usar `delivery=signed-artifact`. Se for necessário recompor uma edição datada no arquivo legado, usar o fluxo com artefato e o publicador legado sob os gates existentes. `bootstrap-yesterday` prepara a data anterior.
- O workflow `dated-horoscope-coverage` verifica às 03:37 UTC as 36 combinações de signo e período pela API e pelo HTML produzido pelo servidor, incluindo sitemap e canonicals. Também pode ser executado com `node scripts/check-dated-horoscope-coverage.mjs`.

## Autoridade editorial

A concessão ativa e os vínculos entre corpus, parecer, algoritmo e chave constam em `docs/editorial/horoscope-2026-10-20/authority-request.json`. O segredo permanece no environment `atvna-editorial-signing`. A assinatura e a admissão precisam ocorrer dentro do prazo válido, com menos de 24 horas entre as duas, e todo o intervalo precisa caber na concessão. Ela termina em 04/01/2027 às 16:00 UTC. O mensal de janeiro exige uma nova concessão antes de sua preparação em 31/12/2026. A renovação segue pela autoridade existente. As edições admitidas mantêm sua data original de admissão e continuam sujeitas a revogação.

O build continua validando os bytes dos assets do arquivo datado antes e depois da compilação. Em caso de falha de publicação, verificar separadamente os jobs de assinatura, de publicação e o monitor hospedado. Um artefato assinado sozinho comprova apenas a preparação editorial.
