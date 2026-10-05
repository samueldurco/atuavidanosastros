# Actions do CI por commit — 05/10/2026

WU239 / plano §0.6 e Onda 8 §15, supply chain. RUN_ID `ATV-20260902-170644Z-01A0630F`.

Cinco Actions distintas eram usadas por tags móveis. As 11 referências `uses` do workflow passam a usar SHA completo; Anchore já estava fixada e foi preservada. A recomendação primária do [GitHub — Secure use](https://docs.github.com/en/actions/reference/security/secure-use#using-third-party-actions) orienta fixar Actions por commit e verificar a origem no repositório oficial.

## Referências verificadas

Tags consultadas pela API dedicada GitHub em 05/10/2026, resolvendo tags anotadas até o objeto commit. A API de commits confirmou cada SHA no respectivo repositório oficial; `action.yml` foi lido nesse SHA. Runtimes existentes Node 20, versões principais, inputs, permissões, jobs, testes e upload de evidências foram preservados.

| Action/tag anterior         | Commit oficial                                                                                                                          |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| actions/checkout v4         | [11d5960a326750d5838078e36cf38b85af677262](https://github.com/actions/checkout/commit/11d5960a326750d5838078e36cf38b85af677262)         |
| pnpm/action-setup v4        | [b906affcce14559ad1aafd4ab0e942779e9f58b1](https://github.com/pnpm/action-setup/commit/b906affcce14559ad1aafd4ab0e942779e9f58b1)        |
| actions/setup-node v4       | [49933ea5288caeca8642d1e84afbd3f7d6820020](https://github.com/actions/setup-node/commit/49933ea5288caeca8642d1e84afbd3f7d6820020)       |
| actions/upload-artifact v4  | [ea165f8d65b6e75b540449e92b4886f43607fa02](https://github.com/actions/upload-artifact/commit/ea165f8d65b6e75b540449e92b4886f43607fa02)  |
| gitleaks/gitleaks-action v2 | [ff98106e4c7b2bc287b24eaf42907196329070c7](https://github.com/gitleaks/gitleaks-action/commit/ff98106e4c7b2bc287b24eaf42907196329070c7) |

## Aceite e limites

Conferência focal: 11 referências, zero `uses` sem SHA de 40 caracteres; formatação e diff verificados. O CI do commit exato será registrado no log canônico externo após conclusão. Provas extensas no checkout isolado: `test-results/actions-pinning-{candidates,resolved}.json` e `action-*.yml`.

Essa fixação impede que a movimentação das tags altere o código das Actions selecionadas. Runners, ferramentas e binários baixados pelas Actions não se tornam imutáveis com essa mudança. Atualizações futuras exigem revisão dos novos commits; não foi criada automação. Audit, secret scan e SBOM continuam obrigatórios. Nenhum código do app, produto, preço, permissão, segredo, gate de liberação ou gasto foi alterado.
