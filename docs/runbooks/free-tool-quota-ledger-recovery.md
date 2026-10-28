# Recuperação do ledger gratuito

A migração `20261028171546_free_tool_quota_ledger.sql` é uma expansão aditiva: cria quatro tabelas, dois índices e cinco funções sem alterar o contrato anterior de `calculation_results`. Não há etapa de contração nesta entrega.

## Reversão da aplicação

É possível reverter a interface preservando o ledger e suas APIs. Mantenha a verificação das cotas no servidor e a assinatura da chamada ao runtime. Se a versão anterior não respeita essas verificações, suspenda o cálculo gratuito durante a recuperação; não libere o endpoint anterior sem cotas. Nunca apague tabelas, resultados, eventos ou vínculos de identificação para reverter a interface.

O teste de compatibilidade executa o contrato anterior de leitura e gravação da biblioteca antes e depois da expansão. Isso prova compatibilidade do banco, não uma reversão hospedada completa da aplicação.

## Correção progressiva

Pré-condição: a expansão foi aplicada integralmente; os nomes e as assinaturas dos objetos continuam compatíveis. Para gerar o SQL de recuperação, execute na raiz do repositório:

```powershell
node scripts/free-tool-quota-ledger-recovery.mjs
```

O gerador extrai da migração canônica as funções, o RLS e as permissões, usa `CREATE OR REPLACE FUNCTION` e envolve tudo em uma transação. A saída deve ser revisada e aplicada pelo canal Supabase autorizado, no ambiente correto. Ela não recria tabelas ou índices, não altera linhas e não reseta cotas. Mudanças de formato ou assinaturas exigem outra migração revisada.

O teste `node --test scripts/free-tool-quota-ledger-db.test.mjs` aplica SQL real em PostgreSQL/PGlite e verifica:

- Compatibilidade do contrato anterior da biblioteca.
- Preservação de todas as linhas, IDs, datas, eventos e vínculo do visitante à conta.
- Falha introduzida antes do commit desfaz integralmente a tentativa de correção.
- Duas aplicações consecutivas da correção restabelecem funções, RLS e permissões sem modificar os dados ou liberar novamente o visitante já vinculado.
- O resultado canônico e a correção já consumida permanecem iguais.

Esse teste usa dados e papéis sintéticos locais. JWT, PostgREST e conexões PostgreSQL independentes continuam sujeitos à validação do ambiente hospedado.
