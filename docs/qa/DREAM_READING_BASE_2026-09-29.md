# Leitura Essencial de Sonhos — E1 local / WU147

RUN_ID `ATV-20260902-170644Z-01A0630F`. Produto `dream-reading`, rota `/leitura-essencial-sonhos`, formato web. Referências: plano §0.2–0.6, V3 Sonhos & Símbolos, `../contracts/dream-reading-calculation.md`, WU056/057 e WU144–146.

Requisito entregue: a base relatada salva é verificada antes do preparo editorial, reaproveitando entrada privada, parser, cálculo determinístico e persistência existentes. Dados, lista completa de fatos, ordem, texto, fonte e limites devem corresponder exatamente. Campos adicionais são rejeitados antes de a normalização genérica omiti-los. Não são inferidos emoção, significado, recorrência ou histórico. A continuidade consentida continua sem consulta longitudinal.

Implementação: `validDreamReadingProjection` usa a mesma inspeção pura da base do Registro, reconstruindo pelo produto correto. Preparo `atv-product-editorial-evidence/1.22.0` e corpus `atv-product-facts-synthetic/1.22.0`; cálculo/facts permanecem 1.0.0. Digest das solicitações do corpus preservado: `d3c7505d94d55c2b9f42554a58525dd8185e20b3528c036ec6ac9d4785235b5b`.

Provas em `test-results/`:

- `wu147-projection.log`: 7/7 testes, ambos os produtos; opcionais ausentes, continuidade true/false, pureza, 22 mutações por produto, trecho longo e par UTF-16 preservado. Um fato extra, alterado ou sem correspondência não alcança interpretação.
- `wu147-worker-final.log`: 122/122. A primeira execução teve dois testes antigos incompatíveis com a integridade agora exigida (`wu147-worker.log`, 120/122). Mudança coerente de contexto altera a entrada e o fato; limite adulterado/fato sem correspondência agora são explicitamente inválidos. Após ajuste, regressões passaram.
- `wu147-root.log`: 161/161, incluindo corpus, banco PostgreSQL local, autorização, gates e recuperação. O corpus continua sintético e não homologa conteúdo.
- `wu147-web-vertical.log`: 45/45 em duas suítes SQL/PGlite, entrada simbólica e vertical persistida, com Leitura Essencial. Publicação simulada nos testes não é aprovação legítima ou sessão hospedada.
- `wu147-worker-check.log`: TypeScript aprovado. Nenhuma interface foi alterada nesta WU; QA visual permanece requisito do leitor E4.

CI da WU146 confirmado `success`, SHA `919ad23163ee28351747547f421c8d5ce32976b2`, execução `36524636974`, evidência `wu146-ci.json`.

E1 implementado e validado localmente; **E1 integral BLOQUEADO** pela sessão/entrada real hospedada com Supabase pausado. Responsável: proprietário, reativar projeto e confirmar para validar DNS/OAuth/sessão. **E2 EM_EXECUCAO**: definir cobertura da interpretação própria da Leitura Essencial, preservando separação entre relato, emoção, associação, hipótese e pergunta. E3–E5 pendentes. Conteúdo/prompt/modelo e revisão legítimos continuam necessários; nenhuma fixture, contagem de testes ou checkpoint aprova o produto. Gates desativados e gasto automático R$0.
