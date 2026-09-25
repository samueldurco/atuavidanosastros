# Entrada simbólica de produtos — WU-056

RUN_ID: ATV-20260902-170644Z-01A0630F. Data: 2026-09-25.

## Escopo entregue

`/biblioteca/nova/[productId]` tem autenticação de servidor, headers privados e formulários reais para Carta do Dia, Três Perguntas, Leitura Essencial de Sonhos e Registro de Sonhos. Biblioteca e hubs Tarot/Sonhos oferecem entradas. Schema do domínio é a autoridade; campos duplicados, arquivos, excesso de texto, datas inválidas, controles e campos desconhecidos são rejeitados. Consentimento de armazenamento obrigatório, continuidade de sonhos opcional, ambos desmarcados. Não há interpretação ou sorteio no navegador, rascunho persistido nem dados pessoais na URL.

Usa o controlador da WU-055: validação → POST com chave UUID previamente guardada → confirmação verificada por lookup/leitor → link da Biblioteca. Perda de resposta/recarga só permite consultar, mesmo após revogação da elegibilidade. Outro pedido exige ação explícita após recuperação confirmada, limpa campos/consentimentos e não envia automaticamente. 202 não significa leitura pronta.

RPC `read_product_request_access` projeta apenas AVAILABLE/UNRELEASED/ACCESS_REQUIRED para perfil ativo autenticado. Valida release/contrato e entitlement próprio com janela temporal do banco; não revela registros, não muda estado nem substitui quotas/autorização no POST. Erro/ausência da migração resultam em UNAVAILABLE. Forward-fix revoga apenas essa leitura, preservando escrita/histórico. Migração somente local; todos os 25 releases permanecem desativados.

## Verificação

- Suíte web: 333 testes/26 arquivos PASS (`test-results/wu056-web.log`), incluindo 69 novos. Quinze são PostgreSQL/PGlite real: autenticação/perfil excluído, privilégios, release/contrato, isolamento de proprietários, estados/prazos do entitlement e forward-fix. Fixture inicial sem produto violava FK: corrigida antes da suíte final.
- Check: zero erros/avisos (`wu056-check.log`). ESLint focal, Prettier e build PASS (`wu056-lint.log`, `wu056-format-check.log`, `wu056-build.log`). Build ainda avisa sobre limite de exclusões de `_routes.json` (24 removidas); não certifica orçamento de invocações em produção.
- 32 E2E locais PASS (`wu056-e2e.log`): 15 novos + 17 regressões. Quatro produtos, resposta 202 realista seguida de lookup automático, consentimento, erros associados, UUID como único dado de sessão, perda de resposta/reload sem replay, acesso revogado, consulta null, bloqueio enquanto pendente, recusa conhecida e autenticação da rota real. HTTP dos fluxos de sucesso é interceptado; não é prova integrada UI→PostgreSQL hospedado.
- Primeira rodada teve 31/32: leitor legado perdeu contexto durante navegação; nova execução integral passou, sem alteração no teste legado. Não se usou retry para mascarar falha.

## Visual e limites

Referências canônicas VRT-04 `36ae6fd956654ffe998725d2d2622038` e VRT-06 `025123a22c964870968862d25b1a1924`, exports em `test-results/gate-b/references/`. Composição de entrada adaptada: Tarot noturno/dourado; Sonhos marfim, formulário principal e coluna explicativa; Bodoni/Newsreader/Onest. Não reproduz cartas sorteadas, arquivo, gráficos ou hipóteses fictícias dos protótipos. Contraste do lead noturno corrigido após inspeção.

Capturas `wu056-{three-questions,dream-reading}-{1440,820,390,320}.png`: inspeção representativa desktop/tablet/mobile, testes de overflow em todas as oito combinações, labels e foco por teclado. Esta aprovação é restrita à entrada; não aprova integralmente os hubs, leitura, Gate B, leitor de tela ou zoom nativo.

Sem migração hospedada, chamadas pagas, promoção, alteração de política editorial/artefatos ou homologação. Entrada natal/precisão, 21 outros formulários, motor/produção integral, áudio/e-mail e continuidade completa permanecem pendentes. Não reaproveitar BirthInput sem precisão como nascimento exato. Trabalho concorrente admin/TikTok/pacotes preservado; lint amplo não recertificado.

Próximo incremento: prova local dos quatro formulários ligados aos handlers e à persistência real, incluindo cálculo e recuperação sem replay, sem fingir publicação editorial.
