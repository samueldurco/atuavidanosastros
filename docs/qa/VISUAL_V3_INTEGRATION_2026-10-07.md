# Integração visual V3 — implementação

RUN_ID: ATV-20260902-170644Z-01A0630F. WU: V3-APP-01-INTEGRACAO.

A direção visual do acervo V3 foi integrada à aplicação existente sobre main `7daa0de1f569267233caf29179d3565316126269`. A solicitação expressa de 07/10/2026 autoriza integração, commit/push e publicação pelo canal existente após os gates. O trabalho local anterior permanece na branch de preservação `codex/visual-v3-integration` (merge `5c0ef5f`); o lockfile local e pacotes antigos não relacionados ficam fora desta entrega.

## Aceite da implementação

- As 50 pranchas têm destino verificável em [visual-v3-coverage.md](../design/visual-v3-coverage.md) e sua matriz JSON. As fundações e a galeria permanecem referências internas.
- Seis universos, 25 produtos e ATV+ usam tokens, gravuras, lettering e vinhetas aprovados. Carreira usa o Sol figurado. Formulários e leitores mantêm texto funcional, foco e títulos acessíveis quando as imagens falham.
- Home mantém os sete blocos e a entrada gratuita sem conta. Auth, conta, Biblioteca, leitor, Revista, ajuda, legal e estados comerciais recebem a fundação compartilhada sem alterar sua lógica.
- 109 recursos públicos selecionados somam 3.479.763 bytes; WebP responsivo, SVG e carregamento tardio evitam publicar o acervo completo. Originais, V2 e arquivos de revisão não foram alterados. Os manifestos registram origem, dimensões e hashes.
- PDF utiliza Bodoni Moda, Newsreader, Onest, papel claro, tinta e gravuras por universo. SVG/PNG mantêm os cálculos e adotam a mesma paleta. Áudio e e-mail mantêm capacidades e estados reais; não há transportes ou conteúdo simulados adicionados.
- Conteúdo editorial, interpretações, cálculo, permissões, persistência, flags comerciais, integrações e entitlement não foram alterados. Fixtures continuam restritas aos testes locais existentes.

## Verificação inicial e continuidade

`@atv/web check`: 0 erros e 0 avisos. Rotas públicas e leitor sintético verificados localmente sem rolagem horizontal. PDFs sintéticos de Mapa Astral e Bússola foram baixados pelo fluxo real de exportação; capas conferidas e páginas internas do Mapa Astral renderizadas para QA. Essas provas não são homologação de conteúdo ou E5 do proprietário.

WU seguinte: V3-APP-02-VALIDACAO. Executar instalação congelada, checks, lint, unidades, banco, build, runtime e testes locais em checkout limpo; registrar evidências e corrigir falhas antes da publicação. Os testes V3 cobrem cinco larguras, 26 rotas de produtos, seis universos, ausência de imagens, título longo e zoom de 200%; as suítes existentes mantêm teclado, erros, consentimento e fluxos privados.

Produção anterior confirmada pela CLI Cloudflare: projeto `atuavidanosastros`, branch `main`, deployment `0e2bd61a-c642-4a5b-9318-d3802e0e4900`, origem `7daa0de`. Rollback: republicar o build dessa revisão no mesmo projeto/branch, sem mudar variáveis ou gates. A nova publicação ainda depende dos gates e da verificação hospedada.

## V3-APP-02 — validação concluída

Código validado: `91446aad19d140c06542e123d813ddd35cf001cd`. O [CI 37693966344](https://github.com/samueldurco/atuavidanosastros/actions/runs/37693966344) aprovou quality, accessibility, secrets e sbom. A suíte de acessibilidade passou 99 casos, incluindo os 13 novos casos V3; os gates editoriais/SEO passaram 14 casos, a validação de candidatos assinados passou quatro e a suíte legal/isolamento passou quatro. A mudança visual não promove conteúdo editorial ou interpretações.

Instalação congelada, auditoria de dependências, check, lint, unidades, banco, build e runtime passaram. No checkout separado, o web check ficou em 0 erros/avisos; web unidades: 94 arquivos e 1.791 casos; worker: 355; banco: 114. O runtime compilado tem 602.337 bytes. O CI Linux valida a revisão exata; no checkout Windows foi necessário preservar LF para evitar falsos avisos de formatação causados por `core.autocrlf`.

QA cobre 320, 390, 768, 1024 e 1440 px, 26 rotas de produtos/ATV+, seis universos, teclado/foco, movimento reduzido, contraste, erros recuperáveis, títulos longos, zoom de 200% e ausência de imagens. O teste de contraste lê os tokens efetivos da página e exige 4,5:1 para texto e 3:1 para foco/bordas, preservando os limiares de acessibilidade. Home, Bússola e leitor móvel foram inspecionados visualmente; PDFs sintéticos de Mapa Astral (13 páginas) e Bússola (nove páginas) foram exportados pelo fluxo real e conferidos.

Desempenho foi medido no build local, Chromium com viewport de 390 px, sem limitação de rede. O Wrangler no Windows apresentou demora de 5–7 segundos também em arquivos minúsculos; a medição foi repetida isolando a entrega dos mesmos arquivos estáticos em Node e mantendo o SSR do mesmo worker. Home/Bússola/leitor tiveram LCP de 276/788/624 ms, CLS de 0,00133/0,00055/0,01069 e nenhum overflow. Os recursos decodificados por navegação foram 1,12/0,73/0,71 MB; não são bytes comprimidos transferidos. Essas medidas controladas não equivalem a dados de campo ou garantia de tempo em produção. Resumo rastreável em [VISUAL_V3_VALIDATION_2026-10-07.json](VISUAL_V3_VALIDATION_2026-10-07.json); logs, imagens, PDFs e medições completas permanecem em `test-results/` local.

Correções encontradas nos gates: formatação dos JSONs gerados, com o gerador atualizado para mantê-la; asserção antiga que exigia a paleta anterior, substituída pela medição de contraste da paleta efetiva. Próxima WU: CI da revisão documental final, merge do PR 26, implantação pelo projeto existente e verificação HTTP/API. O aceite E5 individual do proprietário continua separado desta entrega visual.
