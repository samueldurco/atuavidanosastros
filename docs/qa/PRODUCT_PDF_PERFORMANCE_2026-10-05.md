# PDF: composição dentro do orçamento — WU232

- RUN_ID: `ATV-20260902-170644Z-01A0630F`.
- Requisito: formatos recuperáveis dos produtos relacionais e desempenho/QA do plano mestre (§0.6, Onda 8).
- Escopo: `apps/web/src/lib/server/product-pdf.ts`; preservar conteúdo, fontes, quebras e limites do contrato PDF 1.2.

## Falha e alteração

A suíte web completa reproduziu três retornos `null` na geração de PDF: Dossiê do Casal no teste de formatos, leitor do Dossiê e leitor de Sinastria. Os relatórios ultrapassavam o orçamento de 5 segundos durante a composição. A execução isolada dos leitores passava; isso não eliminava a falha sob a carga da suíte.

O renderer media cada prefixo crescente de cada linha com a fonte completa. Agora usa larguras de palavras já medidas para localizar o encaixe provável e confere a largura exata da linha, incluindo kerning, antes de fixar a quebra. Parágrafos curtos que cabem são compostos diretamente. Identificadores longos continuam divididos por caractere, sem perda de conteúdo. A instrumentação temporária foi removida.

Limites preservados: 120 mil caracteres, 40 páginas, 8 MB e 5 segundos. Nenhum gate, conteúdo editorial, cálculo, acesso, aprovação ou publicação foi alterado.

## Evidência local

| Verificação | Resultado | Evidência ignorada em `test-results/` |
| --- | --- | --- |
| Suíte web antes | 3 falhas, 1.585 aprovações; 286,58 s | `wu232-web-suite.log` |
| Testes focais depois | 13/13; três arquivos | `wu232-pdf-optimized-v3.log` |
| Suíte web depois | 1.588/1.588; 79 arquivos; 175,10 s | `wu232-web-suite-after.log` |
| Check web | 0 erros e 0 avisos | `wu232-check.log` |
| Build web | PASS; aviso existente de limite de exclusões `_routes.json` | `wu232-build.log` |
| Prettier e ESLint do renderer | PASS | `wu232-format.log`, `wu232-eslint.log` |
| Lint global | Bloqueado por formatação em cinco arquivos fora do escopo | `wu232-lint.log` |

O lint global apontou `NatalIntake.svelte`, `natal-request.integration.spec.ts`, `tiktok-credentials.spec.ts`, `routes/admin/+page.svelte` e `biblioteca/[id]/reader-return.spec.ts`. Esses arquivos não foram corrigidos ou incluídos nesta WU.

## Conteúdo e paginação

O PDF do Dossiê continua com 38 páginas A4. A comparação com o artefato anterior verificou 92.865 caracteres e suas coordenadas em todas as páginas: a única mudança textual é a versão editorial já vigente, de `1.15.0` para `1.18.0`, na página 37; o deslocamento de 0,054 ponto dos três caracteres seguintes decorre da largura do dígito atualizado. Todo o restante do texto e das posições coincide. Por isso os hashes binários diferem; eles não foram tratados como prova de regressão de layout.

Evidências: `wu232-pdf-content-comparison.json`, `wu232-pdf-layout-comparison.json`, `wu232-couple-dossier-baseline.pdf`, `wu170-couple-dossier-reader.pdf` e render local `wu232-pdf-visual/page-37.png`. A página renderizada foi inspecionada: conteúdo legível, sem sobreposição ou corte. Os testes existentes também confirmaram saída determinística para a mesma entrada, limites e todos os pares/hipóteses registrados.

## Estado e continuidade

Implementação e validação locais concluídas. CI remoto, push e liberação hospedada não foram comprovados nesta WU: a branch contém também o commit local de SEO `541910c`, ainda não publicado, e arquivos de outras frentes em edição. Integração remota deve reconciliar esses trabalhos; não publicar o conjunto incidentalmente.

Gates editoriais, homologação do motor, Supabase hospedado e aceites E1–E5 dos produtos continuam conforme seus contratos e bloqueios registrados. Fixtures sintéticas e esta correção de desempenho não aprovam produtos nem conteúdo real. R$0 preservado.
