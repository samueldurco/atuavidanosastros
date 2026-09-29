# WU199 — recusa editorial de Revolução Solar sem evidência mensal

`solar-return` continua calculável e legível como base experimental privada, mas a versão 1.1 só contém uma carta no instante do retorno e doze janelas civis. O preparo editorial genérico poderia aceitar esses fatos como base parcial. O requisito de catálogo exige uma leitura útil de doze capítulos, então `prepareProductFacts` agora recusa o produto com `insufficient_facts` antes de formar o envelope de IA. A versão global do contrato de preparo permanece em `atv-product-editorial-evidence/1.34.0`, preservando as bases de revisão dos demais produtos.

O teste focal executa o cálculo Solar real com dados sintéticos, confirma a recusa, tenta acrescentar um fato mensal inventado e trocar a versão do snapshot, e confirma que `evaluateProductDraft` devolve `rejected` sem leitura pronta. A suíte completa do Worker passa com 339/339 testes, `tsc --noEmit` passa, e Prettier dos arquivos afetados passa.

Esta recusa não homologa motor ou método temporal e não representa E2 concluído. Para removê-la, será necessário um perfil mensal versionado, verificação estrutural dos fatos por janela, método/revisão editorial e gates do produto. Nenhum provider, release, entitlement, publicação ou gasto foi acionado.
