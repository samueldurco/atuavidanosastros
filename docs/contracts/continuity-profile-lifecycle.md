# Continuidade e ciclo de vida do perfil — WU-085

Migração expand-only `20260928140000_product_continuity_profile_guard.sql` acrescenta triggers privados de INSERT/UPDATE a consentimentos e itens. Nenhuma tabela, nota, escopo ou revisão existente é reescrita. Feature permanece default-off; nenhuma migração hospedada.

Grant e criação/edição de item exigem perfil existente com deleted_at nulo **na fronteira de persistência**, incluindo chamadas das RPCs já existentes. Um SELECT FOR SHARE mantém lock no perfil até o fim da transação e conflita com UPDATE/DELETE desse registro. Perfil ausente/excluído gera profile_unavailable (403 na API). Falha reverte a instrução, sem consumir revisão CAS nem substituir texto. Não certifica concorrência multi-conexão hospedada, não impede superusuário de alterar/desativar triggers e não autoriza envio futuro a um provider.

Revogação é explicitamente isenta dessa exigência; consulta de gestão e DELETE não disparam os guards. Assim o usuário ainda pode inspecionar, revogar e excluir notas após soft-delete ou policy desligada. Soft-delete não é apagamento físico nem revogação automática: notas/estado persistem até operação explícita ou cascata de exclusão física. A leitura selecionada WU-083 recusa o perfil excluído independentemente desse guard. Restauração administrativa de perfil não é implementada nem autorizada nesta unidade.

A função de trigger tem SECURITY DEFINER/search_path vazio e nenhum EXECUTE para PUBLIC/anon/authenticated/service_role. Triggers são invocados pelo banco; não são endpoint. Autoridade de sessão, ownership e gates das RPCs permanecem intactos. A migração anterior de onboarding revoga escrita direta de perfis para clientes; este guard não cria nem amplia privilégios.

## Recuperação segura

`supabase/forward-fixes/disable_product_continuity_profile_guard.sql` desliga a policy e revoga save/leitura selecionada. Preserva guard, dados, gestão, revogação e exclusão. Não remover o guard para recuperar disponibilidade; nenhuma reativação automática.

Validação local em `product-continuity-api.integration.spec.ts`: grant/create/edit negados sem mutação residual; perfil ativo distinto preservado; preparação bloqueada; revogação/delete mesmo desligado; ACL/attachment dos triggers; guard também em writes privilegiados; forward-fix sem perda de dados. Não há homologação de modelo ou ativação ATV+.
