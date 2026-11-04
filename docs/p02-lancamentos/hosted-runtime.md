# Runtime hospedado dos testes gratuitos P02

Em 04/11/2026, o dispatcher dos onze lançamentos foi publicado na função **existente** `atv-trial-runtime`, projeto `irgnhvouvzyoqfmltrna`, por CLI dedicado autenticado. Nenhuma função, segredo, identidade, grant ou cobrança nova foi criada.

| Evidência | Resultado |
| --- | --- |
| Função | `9b147a42-36c1-4672-892f-58cb6b65b09f` |
| Versão anterior / publicada | 26 / **28** (27 intermediária) |
| Estado após publicação | `ACTIVE` |
| JWT da plataforma | `verify_jwt: true`, preservado |
| Protocolo externo | `atv-trial-runtime/1`, preservado |
| Operações novas | `launch-calculation`, `launch-generate`, `launch-verify` |
| Operações anteriores | Mantidas no dispatcher original |
| Bundle local e fonte recuperada pela API | **2.081.629 bytes**, SHA256 `f49955668e873254f2fc9b305e8463e5552d705da15bb0046590a604cb218c4f` |
| Pacote remoto da plataforma | `2c9625f5d66887bf7ea8621c464bf4c848a98b5d24831672cdc45eaf284dde3a` |

O Pages executa autenticação, acesso privado, validação leve de vínculos/digests e persistência. Cálculo, composição e revisão semântica hospedados seguem para a Edge, sem fallback de CPU no Pages. Um digest válido não aprova conteúdo: a geração e a reabertura exigem avaliação semântica real. Na reabertura, a avaliação salva inteira também deve ser igual à avaliação vigente. A avaliação privada não libera precisão ou venda comercial.

Antes da atualização: 137 testes focais aprovados em sete arquivos, incluindo handler/transporte anteriores, autenticação, protocolo, limites de tamanho, vínculos, APIs e três adulterações da avaliação salva. Revisão independente confirmou o encaminhamento hospedado e o fechamento do vínculo incompleto da avaliação. A função foi recuperada após a publicação e sua fonte corresponde ao bundle validado. Isso comprova implantação e integridade; não substitui percurso autenticado e aceite real do proprietário (E5).

Comando aplicado: `pnpm exec supabase functions deploy atv-trial-runtime --project-ref irgnhvouvzyoqfmltrna --use-api`. Saídas operacionais: `C:/ATVNA/tmp/p02-edge-deploy.log` e `C:/ATVNA/tmp/p02-edge-deploy-final.log`. A limpeza de declarações sem uso passou em 44 testes focais e ESLint; o bundle final diminuiu quatro bytes e foi sincronizado na versão 28. Inventário e download pela integração Supabase confirmaram a versão 28 ativa, JWT obrigatório e SHA256 idêntico ao artefato final. A função de ferramentas gratuitas permaneceu na versão 15.

## Recuperação

Backup íntegro da versão 26, obtido antes da alteração: `C:/ATVNA/tmp/p02-edge-backup-v26/index.ts` e `runtime.js`; SHA256 do bundle anterior `b95bb2a4c3f49a485ff381cc17015cace511fd75d6c90baabdc50aca6130be41`. Se necessário, republicar esses dois arquivos numa cópia isolada usando o mesmo nome/projeto e JWT obrigatório. A plataforma cria uma nova versão; não apaga registros privados. Nenhuma recuperação foi executada.

Esta publicação de backend antecede a liberação web. A comprovação do frontend fica no registro de publicação e no postflight Pages.
