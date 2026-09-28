# Persistência privada de continuidade — WU-082

Implementação expand-only em `20260928130000_product_continuity.sql`, compatível com o contrato `atv-continuity/1.0.0`. Testada apenas em PostgreSQL local PGlite. Feature desligada; sem aplicar a migração hospedada, ativar ATV+, aprovar motor/modelo ou chamar provider.

## Autoridade e minimização

Quatro tabelas privadas: policy default-off, consentimento atual, escopos de runs e itens curados. RLS habilitado sem policies de acesso direto; privilégios de tabelas revogados de PUBLIC, anon, authenticated e service_role. Somente RPCs estreitas SECURITY DEFINER/search_path vazio são expostas ao papel authenticated. O proprietário vem de `auth.uid()`, nunca de argumento do cliente. Auxiliar de validação não é exposto. Os controles não substituem JWT real nem isolamento de credenciais administrativas.

O consentimento possui finalidade fixa `reading-context` e versão `atv-continuity-consent/1`, expressas na projeção do servidor. Não deriva de `WorkflowInput.consent.continuity` ou entitlement. Grant exige policy ligada e 1–100 runs distintos atualmente liberados pelo leitor canônico (ownership, READY, contrato, motor e promoção não revogada). Revogação exige lista vazia e funciona mesmo desligado. Troca de escopo remove os escopos anteriores, mas não apaga notas; revogação não equivale a pedido de exclusão.

Itens guardam somente seleção/relevância, proprietário e referência à leitura. Produto é derivado da fonte na projeção. Resultado/hipótese/ciclo são referências, sem copiar a interpretação; relatos são texto explicitamente curado e ainda podem ser íntimos. Datas/revisões são metadados locais, não telemetria. FK composta exige mesmo proprietário e elimina itens/escopos quando a fonte é excluída; exclusão do perfil também é em cascata. Nenhum histórico bruto é copiado.

## Operações

| RPC | Contrato |
| --- | --- |
| `read_product_continuity()` | Retorna enabled, consent, consentRevision e itens envolvidos em `{item, revision, updatedAt}`. Até 100 itens próprios, ordenados por atualização/id. Funciona desligado/revogado para gestão; **não atesta disponibilidade para IA**. Não retorna input, cálculo, interpretação, promoção ou outras fontes. |
| `set_product_continuity_consent(expectedRevision, runIds, granted)` | Revisão 0 cria o primeiro registro; retorna nova revisão. Compare-and-swap rejeita grant/revogação obsoletos; após conflito a UI deve reler e pedir nova decisão, sem retry cego. Revogação preservada no forward-fix. |
| `save_product_continuity_item(id, runId, expectedRevision, relevance, selection)` | UUID é gerado pelo cliente. Revisão 0 cria; outra revisão exata edita, inclusive relevância. Até 100 itens por proprietário. Requer consentimento atual cobrindo fonte liberada; não permite mudar o parent nem editar UUID alheio. Retorna nova revisão. |
| `delete_product_continuity_item(id)` | Remove somente item próprio; ausente/alheio retorna false. Disponível sem gate/consentimento; idempotente e sem reutilizar texto. |

Advisory lock transacional por proprietário serializa quota e CAS entre essas RPCs; grant/save leem policy com lock compartilhado. Isso não certifica concorrência multi-conexão hospedada nem protege um executor externo que envie um contexto previamente preparado. Nenhum executor é adicionado aqui.

Seletores possuem chaves exatas e referências válidas. Relato ≤600 unidades UTF-16; hipóteses/resultado/fato selecionado ≤1.200, sem truncamento; somente ciclos experimentais e fato calculado único. Validação SQL rejeita controles (exceto tab/LF/CR), texto em branco e payload >4.800 bytes; a contagem inclui astral/emoji como duas unidades, compatível com o orçamento JavaScript. Classificação POSIX de espaços/controles pode ser mais restritiva que JavaScript; o parser de domínio deve validar a projeção novamente.

Erros de rotina são códigos sem texto curado: auth_required, continuity_disabled, consent_required, source_unavailable, item_unavailable, invalid_selection, revision_conflict, item_limit. UUID malformado é rejeitado pelo tipo PostgreSQL antes da função; futura rota deve normalizar erros do transporte e nunca expor SQL/argumentos/logs com conteúdo.

## Recuperação e limites

`supabase/forward-fixes/disable_product_continuity.sql` desliga policy e revoga save, preservando inspeção, revogação e exclusão. Sem DROP nem perda automática de dados. O ramo de grant também falha com a policy desligada. Nenhum rollback/re-enable é automático.

Testes `scripts/product-continuity-db.test.mjs` fazem parte de `pnpm test:db`/CI. Fixtures e gates locais sintéticos não homologam modelos. A WU-083 acrescenta recuperação somente da seleção explícita e integração privada com o domínio, descritas em [continuity-selection.md](continuity-selection.md). Permanecem pendentes: UI/Biblioteca, rotas autenticadas com CSRF/validação, trilha de acesso sem conteúdo, descarte de derivados, executor e QA de JWT/PostgREST/concorrência real. Não ler a listagem inteira para enviá-la a IA.
