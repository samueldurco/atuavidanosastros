# P01 — núcleo comercial ATV+

RUN_ID `ATV-20260902-170644Z-01A0630F`. Data: 04/11/2026. Worktree `C:/ATVNA/.worktrees/p01-atv-mais-20261104`, branch `codex/p01-atv-mais-20261104`, base `52a759d`.

## Resultado implementado

- Matriz independente da avaliação gratuita: Essencial, Ampliado e Premium por 3, 6 ou 12 meses. As nove ofertas não têm preço ou referência comercial inventados.
- Após compra confirmada e cadastro autorizado, a próxima Revolução Solar é devida imediatamente, inclusive no trimestral e com retorno além do fim do termo. O calendário conserva apenas um marcador até o cálculo real. O seletor do worker compara os instantes calculados e preserva o status experimental do motor existente.
- Previsões posteriores ao cadastro: Essencial a cada 15 dias; Ampliado trânsitos semanais e Tarot mensal; Premium horóscopo e Tarot aprofundado semanais. Tarot se vincula ao período, sem pergunta individual.
- Presentes natais únicos por pessoa e tipo, sem reposição por nova versão natal, renovação ou upgrade. Estorno anterior ao envio não consome um presente nunca aceito. Edições e ciclos já enviados não são reenviados.
- Checkout autenticado vinculado por intenção aleatória; preço, moeda, produto/oferta e referência dos termos são imutáveis. Webhook financeiro verificado confere essas condições e conserva o vínculo de uma compra paga mesmo com oferta posteriormente alterada/desabilitada ou notificação atrasada.
- Renovação e downgrade respeitam termos superiores já pagos; upgrade inicia imediatamente e suprime previsões inferiores sobrepostas. Estorno restaura futuras inferiores elegíveis. Cancelamento conserva benefícios até o término; suspensão não concede benefício. Histórico entregue é preservado.
- RLS e RPCs isolam contas. Geração e envio verificam conta não excluída, perfil natal atual, consentimento, autorização editorial, pipeline, artefato e telefone verificado. Dados privados não aparecem em logs ou URLs públicas.
- Job de entrega integra o contrato existente de geração/artefatos por adapters injetados. PDF aprovado precisa corresponder ao delivery/run, produto, período, perfil e local. Aceitação produz `SENT`; só recibo produz `DELIVERED`. Falha anterior ao envio permite retry limitado; resultado incerto exige conciliação. Replay de `SENDING`/`SENT`/`DELIVERED` não reenvia.

## Persistência compatível

Migration CLI: `supabase/migrations/20261104094016_atv_plus_commercial_memberships.sql`. Tabelas `atv_plus_commercial_offers`, `atv_plus_checkout_intents`, `atv_plus_memberships`, `atv_plus_contacts`, `atv_plus_release_gates`, `atv_plus_deliveries` e RPCs documentadas em `docs/contracts/atv-plus-commercial.md`.

O preflight remoto somente leitura, feito pela frente de readiness, identificou ausência de `workflow_releases`, `product_runs`, `product_artifacts` e `product_artifact_run_allowed(uuid,uuid)`. A migração não exige FK, tipo de linha ou resolução estática desses objetos ausentes. Consultas opcionais são parametrizadas e executadas apenas com pipeline disponível. Uma fixture mínima equivalente aplicou P01 e o forward fix com sucesso. Não foi aplicado o histórico inteiro de migrations nem criada uma cópia improvisada do pipeline.

Forward fix operacional: `supabase/rollbacks/20261104094016_atv_plus_commercial_disable.sql`. Fecha novas ofertas e execuções, cancela jobs pendentes e preserva dados financeiros e histórico. Envios em andamento permanecem identificados para conciliação.

## Verificação local

| Verificação                                                                                                                           | Resultado observado                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node --test packages/domain/atv-plus-commercial.test.mjs apps/worker/atv-plus-delivery.test.mjs scripts/migration-versions.test.mjs` | 12/12, incluindo calendário, instante solar, prazo exato, deadline, replay e versões únicas de migration.                                                                                                           |
| `node --test scripts/atv-plus-commercial-db.test.mjs`                                                                                 | 2/2: baseline completo e mínimo sem pipeline; checkout/gates/RLS/onboarding e ciclo real SQL CLAIM → artefato sintético aprovado → READY → SENDING → SENT → CONFIRM/DELIVERED.                                      |
| `node --test scripts/atv-plus-financial-db.test.mjs`                                                                                  | 5/5 na primeira rodada e novo caso focal refund → recompra 1/1, executados pelo agente de pricing. Snapshot, atraso, divergências, replay, upgrade/refund, renovação/downgrade e presentes enviados/nunca enviados. |
| `pnpm --filter @atv/domain check` e `pnpm --filter @atv/worker check`                                                                 | Aprovados após implementação do núcleo e correção do acesso opcional TS.                                                                                                                                            |
| `pnpm --filter @atv/web exec vitest run src/routes/api/webhooks/hotmart/hotmart.spec.ts`                                              | 7/7; live flag, inbox verificada, replay, conflito e erro genérico. Avisos já existentes de configuração SvelteKit/fechamento do runner, exit 0.                                                                    |

Os testes usam valores financeiros, pessoas, telefones e PDFs exclusivamente sintéticos. Nenhum teste é prova de compra, conteúdo editorial homologado ou entrega externa. As últimas asserções SQL de replay e a serialização da deduplicação solar serão novamente verificadas no CI candidato; não se repetiu toda a suíte de banco enquanto a revisão global concorrente consumia a memória disponível. Os dois novos scripts de banco estão no comando `test:db`.

## Gates e limites reais

O proprietário declarou que os preços ainda não foram definidos. As nove ofertas permanecem `commercial_enabled=false`, `total_minor=NULL`, sem IDs de oferta Hotmart ou aprovação dos termos. `commercial_terms_approved=false`; geração/canal também permanecem falsos. A proposta técnica de pagamento único pelo prazo e renovação manual não está comercialmente aprovada.

Não há adapter comercial aprovado para gerar os documentos P01, verificar WhatsApp e enviar PDFs pelo canal, nem mapping editorial homologado dos sete tipos. O motor solar existente continua experimental. A aprovação do adapter precisa comprovar uso obrigatório da seleção do primeiro retorno estritamente futuro; a janela SQL de 370 dias, sozinha, não prova isso. Recuperação de um processamento interrompido sem resposta, acionamento periódico do dispatcher e conciliação do provedor também precisam ser homologados com o runtime real.

Esta frente não aplicou migration remota, não fez commit, não publicou e não enviou documentos. A execução segura local está implementada; contratação e envio reais permanecem fechados até preços/termos, dependências privadas, conteúdo e canal aprovados. A frente principal registra CI, publicação fechada e eventual migration única em evidência própria.

## Arquivos desta frente

Domínio: `packages/domain/src/atv-plus-commercial.ts`, reexport em `atv-plus-plans.ts`, teste `packages/domain/atv-plus-commercial.test.mjs`.

Worker: `apps/worker/src/atv-plus-delivery.ts`, integração em `apps/worker/src/index.ts`, teste `apps/worker/atv-plus-delivery.test.mjs`.

Webhook: `apps/web/src/routes/api/webhooks/hotmart/+server.ts` e `hotmart.spec.ts`.

Banco/testes: migration e forward fix citados acima; `scripts/atv-plus-commercial-db.test.mjs`; inclusão deste teste e do financeiro de pricing em `package.json`.

Documentação: este relatório e o contrato compartilhado `docs/contracts/atv-plus-commercial.md`.
