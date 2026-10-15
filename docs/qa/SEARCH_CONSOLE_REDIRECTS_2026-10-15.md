# Search Console: páginas com redirecionamento

Verificação em 15/10/2026, 16:23 UTC, no site publicado antes da reformulação.

## Origem e limite

As três imagens indicadas pelo proprietário não estavam disponíveis nos caminhos informados. Na conta de e-mail conectada foi localizado um aviso do Google Search Console recebido em 15/10/2026 às 09:29 BRT, com o motivo “Página com redirecionamento”. O e-mail não contém a lista de URLs afetadas. A correspondência com as imagens ainda depende da confirmação do proprietário; esta verificação não equivale a inspecionar o relatório completo do Search Console.

Segundo a [documentação oficial do Google](https://support.google.com/webmasters/answer/7440203?hl=pt-BR), a origem de um redirecionamento não é indexada; o destino pode ser. Esse estado é diferente de um erro de redirecionamento, como ciclo ou cadeia inválida. Portanto, preservar a canonicalização intencional é apropriado.

## Resultado observado

- As 39 URLs dos sitemaps responderam HTTP 200, sem redirecionamentos, sem `noindex` e com canonical correspondente ao endereço publicado.
- HTTP no domínio principal redirecionou por 301 para HTTPS; `www` em HTTPS redirecionou por 301 para o domínio principal. HTTP com `www` apresentou dois saltos válidos, sem ciclo.
- `/revista/` redirecionou por 308 para `/revista`, que respondeu 200.
- Os arquivos XML dos sitemaps possuem `X-Robots-Tag: noindex`; isso diz respeito aos próprios arquivos XML, não às páginas que eles enumeram.
- Não foi identificado um defeito de indexação nessa amostra. As URLs exatas do relatório ainda não foram verificadas.

Evidência local: `test-results/search-console-redirects-20261015.json`. Probes de variantes adivinhadas fora do sitemap não são evidência das URLs citadas pelo Google.

## Critério após publicação

Repetir a verificação dos sitemaps no novo deployment, confirmar destinos 200 e canonicals, e manter aliases fora do sitemap. Corrigir redirecionamentos somente se inesperados, com destino inválido, ciclo ou cadeia excessiva. Não remover redirects legítimos para tentar eliminar o aviso.
