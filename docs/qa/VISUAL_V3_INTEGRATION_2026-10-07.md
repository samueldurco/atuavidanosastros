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
