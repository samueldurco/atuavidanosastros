# Recuperação de reprocessamento na Biblioteca — WU-054

RUN_ID: ATV-20260902-170644Z-01A0630F. Data: 2026-09-25.

## Entrega

`ReprocessAction` substitui o envio repetido do leitor por um controlador com chave persistida antes do primeiro POST. Resposta perdida, reload, lookup null/erro ou resultado inválido preservam a chave e permitem somente consulta. A referência recuperada é confrontada com produto, filho, pai e item da Biblioteca no leitor autenticado antes da navegação. Revogação impede nova versão, não a consulta. Ações concorrentes do leitor ficam bloqueadas durante a operação.

Falha de armazenamento bloqueia envio; remoção/troca da chave observada na mesma instância também bloqueia. Somente recusas exatas e conhecidas anteriores à escrita permitem limpar uma chave recém-criada. Nenhum input pessoal é persistido no navegador. A separação da ação de exclusão preserva confirmação explícita, valida a resposta e não afirma que uma exclusão incerta falhou.

## Evidências locais

- 40 casos novos do controlador; suíte web: 195 testes em 22 arquivos PASS (`test-results/wu054-web.log`). Inclui dupla ativação, legado, respostas inválidas, conflitos, armazenamento indisponível/corrompido/alterado e linhagem divergente.
- 17 E2E PASS (`wu054-e2e.log`): oito de recuperação e nove do leitor existente. Resposta perdida gera exatamente um POST de escrita; após reload só consultas. Lookup pendente bloqueia outras ações, storage negado não envia, auth da Biblioteca permanece exigida.
- Check: zero erros/avisos (`wu054-check.log`); ESLint focal (`wu054-lint.log`), Prettier focal, diff-check e build web (`wu054-build.log`) PASS.
- Falhas intermediárias corrigidas: colisão de nome com rune Svelte; feedback não reativo; teste esperando acesso privado sem login; banner de consentimento interceptando botão em 320px. O teste agora recusa analytics pela interface e verifica a navegação seguida do gate real de autenticação.
- CI anterior, SHA 86d40ab: quality 107727316910, secrets 107727316665, Pages 107727730804 completed/success.

## Gate visual e acessibilidade

Referências existentes MEM-03 `58afdd10c4b7484d8167ea5c62b29ee3` e SH-03 `157daa1e0776415982d5ab65d092248f`, projeto Stitch `2141801333950500965`; HTML/PNG locais consultados. A mudança conserva ReadingShell e painel de ações, tipografia, paleta e hierarquia. O export SH-03 incompleto não permite certificar paridade integral.

Screenshots `test-results/wu054-browser/**/recovery-{1440,820,390,320}.png` inspecionadas: quebra de texto legível, sem overflow horizontal, botão >=44px. Teclado Enter e foco no status testados; reduced-motion nas quatro larguras. Captura full-page normaliza scroll para não deslocar elementos fixed. Não certifica leitor de tela humano nem zoom nativo 400%. A fixture loopback-only não representa produto liberado; handlers de produção mantêm autenticação e gates.

## Limites e contenção

Transporte do navegador é simulado; não se afirma integração JWT/PostgREST hospedada. Chave em sessionStorage protege a sessão da aba, não garante coordenação distribuída entre abas/dispositivos nem após limpeza antes de reload. Consultar a Biblioteca antes de começar em outro contexto. Null não prova falha de escrita e não libera novo envio. A nova consulta não interpreta, publica ou processa o pedido.

Sem migração hospedada, scheduler, chamada de IA, gasto ou homologação. Releases/policies continuam false. Lint amplo concorrente não recertificado; alterações admin/TikTok e pacotes paralelos preservadas. Contenção: desabilitar a ação de reprocessar mantendo o leitor e histórico; não apagar chaves/pedidos para contornar erro. Esta WU não conclui os 25 produtos nem cria o formulário de primeira submissão.
