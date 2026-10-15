# Search Console: páginas com redirecionamento

Verificação em 15/10/2026, 16:23 UTC, no site publicado antes da reformulação.

## Origem e limite

As três imagens indicadas pelo proprietário não estavam disponíveis nos caminhos informados. A conta de e-mail conectada foi confirmada como a conta pessoal mencionada pelo proprietário, que autorizou analisar os avisos relevantes ao projeto e prosseguir sem alterações desnecessárias. Foi localizado um aviso do Google Search Console recebido em 15/10/2026 às 09:29 BRT, com o motivo “Página com redirecionamento”. O e-mail não contém a lista de URLs afetadas. A correspondência exata com as imagens permanece desconhecida; esta verificação não equivale a inspecionar o relatório completo do Search Console nem a segunda caixa postal.

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

## Demais avisos relevantes da conta pessoal

Busca de 13 a 16/10/2026 encontrou mais três avisos referentes ao projeto. Os quatro e-mails analisados apresentam SPF, DKIM e DMARC aprovados para Google; nenhum informa suspensão ou comprometimento da conta.

- Search Console, 15/10 às 10:09 BRT: confirma o início de impressões na pesquisa em 13/10; informativo.
- Merchant Center, 14/10: recomenda configurar o acompanhamento de conversões. É uma pendência de mensuração comercial, sem evidência de indisponibilidade do site. Manter para a etapa comercial, após aprovação dos produtos e configuração legítima de compras/consentimento.
- Merchant Center, 13/10: recomenda classificações da loja. Depende de avaliações reais de clientes; não criar avaliações ou antecipar comércio físico para satisfazer a sugestão.

Os avisos do Merchant Center não justificam ativar cobrança, anúncios ou rastreamento de compras fictícias nesta entrega. Nenhuma alteração de e-mail, conta, notificações ou configurações externas foi realizada nesta análise.
