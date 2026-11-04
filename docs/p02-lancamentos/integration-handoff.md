# Integração P02 com as frentes comerciais

RUN_ID `ATV-20260902-170644Z-01A0630F`. P02 mantém uma ficha por produto em `/produtos/{slug}`, conforme `launch-metadata.json`; `/lancamentos` e o destaque da home apontam para essas fichas. Todos os onze são digitais avulsos e permanecem `PREPARING` até os gates próprios. Os testes privados não concedem acesso financeiro.

| Frente | Destino/contrato conhecido | Ação de integração e condição finita |
| --- | --- | --- |
| P01 · ATV+ | `/atv-mais`; `docs/contracts/atv-plus-commercial.md` na worktree P01 | Preservar o link existente. Integrar revisão P01 aprovada antes da liberação conjunta. Preço de membro só aparece com preço regular e política financeira aprovados; servidor escolhe a melhor condição única e revalida o direito. Não copiar código de outra worktree em andamento. |
| P03 · Livraria/Céu de Papel | Destino público ainda não registrado no log canônico consultado em 04/11/2026 | Acrescentar no grupo “Loja do ATVNA”, após verificar URL pública, título, revisão e percurso. Não inferir slug nem criar uma segunda ficha. |
| P04 · Cursos | Destino público ainda não registrado no log canônico consultado em 04/11/2026 | Acrescentar em “Produtos digitais”; estreia aponta para a ficha permanente do curso. Verificar URL/revisão e percurso em celular/desktop. |
| P06 · Consulta pelo WhatsApp | `P06.01.01` iniciou componente flutuante em worktree própria; canal e destino validados ainda não registrados | Receber o componente aprovado “Fazer uma consulta pelo WhatsApp”, sem criar nova seção na home, conforme orientação registrada por P06. Integrar revisão validada e confirmar canal/percurso no log único antes de ativar. |

O menu mantém a Revista e os universos. “Loja dos Signos” aponta para `/loja`, que já existe nesta revisão. Links pendentes não são apresentados como destinos disponíveis.

## Publicação compartilhada

A entrada `P01.04.05` encerrou a janela exclusiva anterior: PR98 integrado em `main` no SHA `2c4e3c34ae10d1cf314e315cb598cc32b5ba323b`, Pages `ddb87909-3519-429c-bc3f-bb095929bf8b` com sucesso e postflight 15 PASS. P02 deve reconciliar essa revisão antes da própria publicação e reservar a próxima janela no log. Executar os gates da revisão integrada e registrar o novo SHA/IDs de deploy. Migrações P02 devem ser aplicadas em ordem, com provas próprias; a validação local não demonstra que a tabela existe no ambiente hospedado.

Hotmart sem credencial autenticada e preços ATV+ ainda indefinidos foram registrados em `P01.03.01`. Não equivalem à impossibilidade de criar fichas ou testar métodos locais. Para os onze avulsos, preço regular, custos e oferta real continuam pendentes e precisam de prova individual; não herdar preço de outro produto.
