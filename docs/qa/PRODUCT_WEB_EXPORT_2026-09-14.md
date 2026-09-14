# WU-035 — relatório web privado

RUN_ID: `ATV-20260902-170644Z-01A0630F`.

## Entrega e fronteira

`GET /api/workflows/[id]/download?format=web` gera um HTML completo, versionado e autocontido a partir de uma nova consulta à projeção `read_product_run` do proprietário. A sessão, o ID e os gates atuais são revalidados a cada pedido. Não usa service role, cache de página, URL pública, conteúdo bruto de input nem blob interno do cálculo. Conteúdo não publicado, revogado ou excluído não é exportado.

O arquivo preserva título, seções, evidências, fatos, fontes, versões, limites e histórico da projeção. O SHA-256 dos bytes é retornado no cabeçalho; isso é integridade de transporte, não assinatura de homologação. O HTML é reconstruído deterministicamente para a mesma projeção e versão do exportador. Não foi criado armazenamento de artefatos nem garantia de conservar os mesmos bytes após uma atualização futura do exportador.

Resposta attachment, private/no-store, no-referrer, nosniff, CORP same-origin e CSP restritiva. Todo texto variável é escapado. Sem scripts, fontes remotas, imagens externas, formulários ou chamadas de provedor. Parâmetros arbitrários e formatos desconhecidos são recusados. O leitor trata falha, sessão expirada e revogação sem navegar para JSON. Cópias já baixadas não podem ser apagadas remotamente; o aviso é explícito.

## Provas locais

- `pnpm check`: zero erros e warnings; `pnpm lint`: PASS.
- `pnpm test:unit`: 111 testes PASS, incluindo sete novos de exportação/autorização com RPC e sessão simulados.
- Playwright focal: dez testes PASS após build web real e servidor Wrangler local. HTML gerado aberto em 1440, 820, 390 e 320 px; texto longo, acentos, emoji, token sem espaços, índice, mídia print e ausência de requisições externas verificados. Payload de script/imagem permanece texto inerte. API real local sem sessão recusa acesso.
- Leitor: download desabilitado na fixture sintética; ausente em estados pendentes, revogados e falhos. Não há bypass de autenticação para testar a UI.
- Inspeção visual local: leitor desktop/mobile e relatório mobile conferidos. Hierarquia, leitura e contenção preservadas; referência MEM-03 `58afdd10c4b7484d8167ea5c62b29ee3` e shell SH-03 existentes. Relatório offline usa Georgia/Segoe UI como fallback autocontido; não representa aprovação de tipografia premium ou clone do protótipo.

Logs completos: `test-results/wu035-{check,lint,unit,web-unit,e2e}.log`. Capturas: `apps/web/test-results/tests-product-export.e2e.t-*/export-*.png` e `tests-product-run-reader.e-*/workflow-reader-*.png`.

## Limites e continuidade

É um relatório HTML, não PDF. CSS print não é entrega de PDF. SVG/cartografia, PDF premium, áudio, cards, e-mail, artefatos privados persistidos e prova integrada de download autenticado em staging permanecem pendentes. Cobrir os 25 IDs na elegibilidade web não entrega os 25 produtos verticalmente.

Nenhuma migração hospedada, modelo homologado, promoção, release ou gasto. Os gates continuam fechados. Rollback por revert do código, sem apagar registros ou arquivos pessoais.
