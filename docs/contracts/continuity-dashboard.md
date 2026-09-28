# Resumo privado de continuidade no dashboard — WU-088

`read_product_continuity_summary()` retorna somente versão `atv-continuity-summary/1`, policy `enabled`, `consentState` e contagens `total/relevant/irrelevant/unreviewed`. Nenhum ID, seletor, nota, título, data ou conteúdo de fonte é retornado. Contagens não são autorização de uso nem avaliação da disponibilidade atual das fontes.

## Autoridade e recuperação

RPC sem argumentos, STABLE, SECURITY DEFINER e search_path vazio; apenas authenticated recebe EXECUTE. Proprietário vem de auth.uid(); perfil ausente ou excluído é rejeitado. A agregação filtra o proprietário e usa um snapshot de statement. Consulta não modifica consentimento, itens, policy ou releases e funciona com policy desligada/consentimento revogado: revogar não apaga registros.

O loader usa o cliente da sessão verificada, prazo de 10 segundos e validação por chaves exatas, tipos e soma de inteiros entre 0 e 100. Resposta inválida, falha ou timeout viram UNAVAILABLE, nunca zero registros. Não há fallback à listagem de notas. Biblioteca, perfil natal e continuidade são recuperados independentemente, em paralelo, cada qual com limite efetivo de espera assíncrona via `withRpcDeadline`, mesmo se o transporte ignorar abort. Uma seção indisponível preserva as demais; o limite não inclui autenticação nem garante cancelamento SQL. A prévia anônima não consulta a RPC. Página privada mantém no-store.

A interface diferencia prévia, indisponibilidade, desativação, ausência de registros e consentimento concedido/revogado. Exibe somente contagens e links para recuperação/gestão na Biblioteca, sem selecionar contexto ou iniciar interpretação. Relevância é marcada pelo usuário, não inferida. Nenhum modelo está homologado.

## Retirada e limites

Migração expand-only `20260928150000_product_continuity_summary.sql`. Forward-fix `disable_product_continuity_summary.sql` revoga a RPC sem apagar registros ou retirar os controles de gestão, revogação e exclusão. Reativação exige validação separada, nunca é automática.

QA local em [CONTINUITY_DASHBOARD_2026-09-28.md](../qa/CONTINUITY_DASHBOARD_2026-09-28.md). MEM-01 tem revisão parcial; não há Gate B integral, migração hospedada, JWT/PostgREST real, executor, auditoria persistente de acesso, descarte de derivados ou ativação ATV+ nesta unidade.
