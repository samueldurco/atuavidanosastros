# Continuidade na Biblioteca — WU-086

Composição de MEM-02 (`f5af4d1cdd4542488d60e94fa2c9bafb`), CMP-02 (`7e5a59578fce4c48853a139940e07418`) e SH-02 (`7d41b4e1322349109a91363bb7c2df2b`), projeto Stitch `2141801333950500965`. Extensão funcional conforme DESIGN.md; os exports incompletos não certificam paridade integral/Gate B.

## Fluxo real e limites

`/biblioteca` inclui controles para a sessão autenticada. A query existente, filtrada pelo proprietário e RLS, acrescenta apenas `source_id`; somente itens PRODUCT_RUN com UUID válido são candidatos a escopo. A API/banco revalida a fonte ao salvar. Títulos de fontes que deixaram a listagem não são reconstruídos: o identificador aparece como fallback. Bússola legada não participa deste fluxo.

Consultar é uma ação explícita, sem busca automática ao montar a página. O snapshot estrito habilita a gestão, não autoriza inferência ou certifica disponibilidade da fonte. O aceite inicia desmarcado, é invalidado quando o escopo muda e deve ser renovado após cada consulta ou mutação. Escopo persistido pode aparecer selecionado, mas nunca equivale ao novo aceite.

Usuário pode guardar nota própria de até 600 unidades UTF-16 ou referência ao resultado; revisar relevância, texto e categoria; revogar autorização; excluir um registro nomeado em diálogo. Hipóteses e fatos já salvos são exibidos como referências, com revisão de relevância sem reconstrução de conteúdo. Não há extração automática de temas, recorrências ou fatos; relato continua distinto de cálculo e hipótese.

## Persistência e recuperação

Os quatro POST da [API privada](continuity-api.md) usam sessão da mesma origem, no-store, redirect error e AbortSignal de 15 segundos. Não há armazenamento de notas/escopo em localStorage, sessionStorage, URLs, analytics ou logs. IDs de registros novos usam UUID; edição preserva ID/origem e envia revisão observada. Autenticação, propriedade, elegibilidade, quotas, consentimento e concorrência são autoridades do servidor, não dos controles desabilitados.

Cada escrita é tentada uma vez. Recibo inválido, erro HTTP, conflito, timeout ou resposta perdida remove o snapshot/rascunho e exige nova consulta/decisão. Nunca presume rollback e nunca reenvia automaticamente. Sucesso consulta novamente o estado persistido; falha nessa consulta também bloqueia novas escritas. O foco retorna ao controle de consulta, inclusive quando a exclusão remove o botão original. Escape/cancelamento do diálogo restaura o acionador.

Policy desligada bloqueia nova autorização/edição, mas preserva consulta, revogação e exclusão. Revogar não apaga notas; excluir uma nota não exclui sua leitura. Perfil excluído é tratado pelo [guard do banco](continuity-profile-lifecycle.md). A UI não torna elegível um contexto previamente selecionado: qualquer executor futuro deve revalidar gates/consentimento/fonte e limites.

## Não entregue por esta unidade

A WU-087 acrescenta [seleção diretamente no leitor](continuity-reader.md). Permanecem pendentes execução com contexto, auditoria persistente sem conteúdo e descarte de derivados. Sem modelo homologado, migração hospedada, ativação ATV+, chamadas pagas, scheduler ou e-mail. A suíte de navegador usa fixture localhost e intercepta o transporte com dados sintéticos; a integração HTTP→PostgreSQL é evidência separada das WUs 084/085, não certificação de sessão/JWT/PostgREST implantados.
