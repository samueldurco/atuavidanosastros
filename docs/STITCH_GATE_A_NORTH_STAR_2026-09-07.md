# Gate A — North Star Stitch

**Data:** 07/09/2026  
**Estado:** PASS_WITH_CONSTRAINTS  
**Projeto:** `projects/2141801333950500965`  
**Método:** leitura exclusiva pelo MCP Google Stitch; nenhuma tela ou token remoto foi alterado.

## Escopo examinado

| Prancha | Screen ID | Decisão |
| --- | --- | --- |
| 00A — North Star / Editorial Ivory | `e025eda950cb4d90bdd0348cdca986cb` | aprovada como referência de composição editorial |
| 00B — North Star / Celestial Night | `95cb64944f564726a53234eaf6adeb84` | aprovada para momentos imersivos seletivos |
| 00C — North Star / Product Instrument | `29cc39c85b64455fbe153be2bc90f97c` | aprovada para cálculo, dados e fluxos funcionais |
| 00D — DNA Visual Consolidado | `9820fd5679914419bef58654aa971d09` | aprovada como biblioteca conceitual, sujeita ao Gate B |
| 00E — Content & Voice Constitution | `db6f5a675c56407a9ea1f42229cce3fb` | aprovada como referência de voz, subordinada aos contratos locais |

## Adjudicação

| Critério | Resultado | Regra de implementação |
| --- | --- | --- |
| Marca e logotipos | PASS | Usar somente os assets oficiais do Brand Kit v3.0; nunca redesenhar ou recompor o wordmark. |
| Direção editorial | PASS | Manter produto sóbrio, preciso, íntimo e sem estética mística genérica, neon ou roxo dominante. |
| Modos de experiência | PASS | Editorial Ivory é o padrão; Celestial Night fica restrito a revelações e experiências imersivas; Instrumento prioriza clareza de dados. |
| Voz e interpretação | PASS | A prancha 00E é compatível com linguagem não determinista, transparência de dados e privacidade literal. |
| Tipografia técnica | CONSTRAINT | O Theme remoto fixa Onest nos campos técnicos. Código e documentação local mantêm os três papéis: Bodoni Moda em momentos de display, Newsreader para leitura e Onest para UI. |
| Tokens de cor | CONSTRAINT | O Theme remoto (`#fff8f1`, `#001636`) é uma aproximação, não substitui os tokens locais oficiais de produto (`#FCFBF8`, `#0B1635`, `#073F87`, `#BF9153`). Não aplicar tokens automaticamente. |
| Acessibilidade e estados | DEFERRED_TO_B | As pranchas expressam intenção WCAG, mas não comprovam foco, teclado, contraste, loading, erro ou responsividade. |
| Mobile/tablet | DEFERRED_TO_B | As cinco pranchas retornadas são `DESKTOP`; variantes responsivas precisam de matriz explícita. |
| Estado comercial | PASS | Nenhuma referência visual ativa preço, estoque, checkout ou promessa comercial sem dado real do sistema. |

## Decisão

A base Stitch v4.2 passa pelo Gate A como **referência visual complementar**. Os contratos, o Brand Kit v3.0, `DESIGN.md` e `STITCH_DESIGN_SYSTEM_v3.1.md` permanecem autoridade para código, tokens, acessibilidade e comportamento. Não é autorizada aplicação automática do design system remoto nem edição/geração de telas antes do Gate B.

## Próximo gate

Adjudicar os pares `FND-01`–`FND-04`, validar `CMP`, `SH` e `QA`, e publicar uma matriz de componente, estado, breakpoint, rota e critério de aceite.
