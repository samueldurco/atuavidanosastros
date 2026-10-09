# ATVNA V4 — orçamento no runtime de produção local

Medição em 2026-10-09T10:07:03.059Z, Chromium 151.0.7922.34, build de produção servido em http://127.0.0.1:4173. Cache desativado, contextos novos, sem simulação de rede/CPU. Valores de LCP e CLS são diagnósticos locais; não certificam Core Web Vitals de campo.

| Superfície | Imagens + fontes iniciais | Rolagem vertical | Todos os cartões expostos | Transporte inicial total | LCP local | CLS após exposição |
|---|---:|---:|---:|---:|---:|---:|---:|
| home-1440 | 530143 B | 536349 B | 758591 B | 632951 B | 800 ms | 0.0041 |
| home-390 | 508390 B | 641308 B | 736838 B | 610621 B | 9408 ms | 0.0194 |
| meu-ceu-1440 | 558404 B | 558404 B | 558404 B | 670745 B | 1792 ms | 0.0093 |
| amor-390 | 502353 B | 502353 B | 502353 B | 613471 B | 5960 ms | 0.0013 |

Meta inicial de imagens/fontes: 665600 B (650 KiB). Resultado: PASS. Transporte total inclui HTML, CSS e JS e é apresentado separadamente.

Validação: `{"initialBudget":true,"noOverflow":true,"noFailures":true,"menuContrast":true,"cardArtReady":true,"ssrContent":true,"initialFontsSubsetOnly":true,"fontsPortuguese":true,"masterFallback":true,"hashesStable":true}`.

Os cartões preservam texto e links no HTML sem JavaScript. Suas decorações começam ausentes abaixo da primeira viewport e aparecem por IntersectionObserver quando expostas. A Home mobile usa trilho horizontal: a rolagem vertical expõe 5 de 9 cartões; ao percorrer também o trilho, os 9 ativam suas artes e as imagens carregam. As três fontes derivadas atendem português NFC/NFD; solicitar Ā (U+0100, fora do perfil) baixa os três masters aprovados. As sondagens de fonte foram feitas em contexto separado e não entram no orçamento inicial.

Detalhes de recursos, menus e cartões constam no JSON adjacente.

Esclarecimento do LCP: os E2E já estavam encerrados nesta comparação. Foram feitas duas navegações frias em série por superfície, com o mesmo Chromium e viewports. O controle Node serviu os arquivos exatos de `.svelte-kit/cloudflare` e encaminhou HTML/rotas dinâmicas ao mesmo SSR do Wrangler na porta 4173. Nenhum código ou build foi alterado.

| Superfície   | Wrangler serial, LCP | Node + mesmos assets/SSR, LCP |
| ------------ | -------------------: | ----------------------------: |
| home-1440    |     1008 ms / 824 ms |               304 ms / 248 ms |
| home-390     |    2852 ms / 2024 ms |               352 ms / 292 ms |
| meu-ceu-1440 |     1544 ms / 832 ms |               200 ms / 192 ms |
| amor-390     |    3652 ms / 2920 ms |               184 ms / 188 ms |

A Home mobile mede o background `fundo-continuo-mobile-v005.avif`; o Amor mede `B03-figure-1.webp`. No Amor serial/Wrangler, a imagem é descoberta aos 36–66,5 ms, espera 2403,5–3041,4 ms antes do request e pinta 8,7–23,5 ms depois do fim da resposta. No controle, a fila cai para 45–54,8 ms e resposta + transferência para 6,2–7,2 ms. Na Home, a descoberta do background e a entrega do CSS/assets também antecipam no controle. A distribuição de timings identifica fila/entrega local como a causa dominante dos samples lentos.

Os 49 assets servidos pelo controle, incluindo os dois LCP e os três subsets, tiveram igualdade SHA-256 entre o corpo descomprimido do Wrangler e o arquivo do build. O controle Node entrega assets sem compressão; o Wrangler comprime texto/CSS/JS/SVG, portanto os tamanhos de transporte diferem. O controle não reduz o conteúdo transferido. A comparação de caminhos/tamanhos e os ResourceTiming de cada navegação estão no JSON adjacente. Os 9,4 s / 6,0 s da amostra concorrente não representam um gate de campo; o controle demonstra a limitação do preview local. **CWV hospedado/de campo permanece sem aprovação.**

Capturas finais Home: consentimento opcional recusado e nove artes completas após exposição vertical/horizontal, com retorno ao topo e início do trilho. Arquivos: `E:/ATVNA/tmp/v4-audit/v4-production-home-390.png` e `E:/ATVNA/tmp/v4-audit/v4-production-home-1440.png`.
