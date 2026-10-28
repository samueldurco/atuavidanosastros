# Identificação e privacidade das ferramentas gratuitas

Validação local de 28/10/2026 no worktree `home-approved-20261028`. Esta evidência cobre as correções de isolamento de conta e continuidade da leitura; não confirma publicação ou funcionamento hospedado de autenticação, e-mail ou PDF.

## Contrato aplicado

- O servidor confere a conta com `getClaims()`. Se o cookie anônimo já foi vinculado a outra conta, a conta autenticada atual usa somente seu próprio ledger. O vínculo anterior permanece bloqueado para acesso anônimo e não é transferido, apagado ou renovado para liberar cotas.
- Os envelopes de estado e histórico incluem um identificador opaco derivado por HMAC. O identificador não expõe o UUID da conta e não funciona como credencial. As respostas são privadas e `no-store`.
- O navegador mantém o rascunho oculto até a resposta do servidor confirmar o mesmo dono. Resultados e recibos em `sessionStorage` nunca são usados como fonte da leitura exibida.
- Mudanças de identidade, saída e erros de recuperação removem os dados privados da interface. Requisições são canceladas, e um contador de geração impede uma resposta atrasada de restaurar dados da identificação anterior.
- A submissão envia `x-atv-owner`; divergência em relação ao dono conferido pelo servidor retorna `409 session_changed` antes de calcular ou gravar.
- O retorno de sonhos antigos conserva o ID da leitura, inclusive na URL comercial `resultado=...`, e usa `next` no retorno da autenticação. O servidor continua conferindo a propriedade de qualquer ID solicitado.

## Provas locais

`apps/web/tests/free-tools-privacy.e2e.ts`: **5/5 passaram**, Chromium, prévia local dedicada em `127.0.0.1:4331`, 41,2 s.

1. Cache privado permanece oculto durante a conferência; a resposta da conta B descarta o rascunho de A.
2. O mesmo dono recupera o rascunho; erro `409 subject_claimed` remove leitura, rascunho e histórico e desabilita a submissão.
3. O evento de saída limpa imediatamente a interface e uma resposta GET atrasada não repõe a leitura.
4. A saída durante um POST limpa a interface, cancela a apresentação tardia e o pedido inclui o vínculo opaco correto.
5. Um sonho antigo solicitado pelo ID continua selecionado, recebe foco e segue à oferta correta com o mesmo ID.

Esses cinco testes usam respostas sintéticas interceptadas para reproduzir mudanças de conta e corridas de rede. O evento de saída é reproduzido sem realizar autenticação real. Cálculo e SQL são validados separadamente nos testes de API/ledger e na suíte E2E com PostgreSQL/PGlite.

`free-tools-api.integration.spec.ts` e `free-tool-ledger.spec.ts`: **13/13 passaram** na rodada focal anterior à atualização de texto. Incluem A → B no mesmo cookie, resposta exclusiva da conta B, manutenção das cotas de A e B, cookie preservado, acesso anônimo bloqueado após a saída, retorno de A sem reset e POST com dono divergente rejeitado antes do commit.

`svelte-check --tsconfig ./tsconfig.json`: **0 erros e 0 avisos** após os ajustes de tipos da integração.

O primeiro ensaio de navegador não executou a interface porque a prévia compartilhada respondeu `504 Outdated Optimize Dep` aos módulos Svelte. A evidência válida acima vem da prévia dedicada com dependências recompiladas.

## Limites

Estas provas não substituem o fluxo hospedado de entrada e saída, múltiplas abas autenticadas ou sessões Supabase expiradas em rede real. O estado do servidor continua sendo a autoridade; o cache local não aplica cotas. Apagar dados de navegador não é tratado aqui como identificação civil ou barreira absoluta contra múltiplos visitantes.
