# Avaliação humana da leitura privada

O registro humano é separado da revisão editorial automática. Uma decisão `approved` nesta tabela não libera precisão comercial, venda nem o aceite E5 do proprietário. Não há avaliação humana inserida automaticamente.

Migração local `20261104110009_p02_launch_feedback.sql`: histórico imutável vinculado à preparação, ao proprietário e ao digest da leitura salva. Somente a sessão autenticada com acesso privado vigente pode inserir; a chave de serviço não recebe permissão de escrita. O banco confere o vínculo com a leitura e gera identidade e data. A chave de requisição por proprietário impede duplicação na repetição da mesma operação; uma nova decisão exige outra chave e preserva as anteriores.

A rejeição exige comentário; o limite é 3000 caracteres. Não há UPDATE/DELETE para as funções da aplicação. A leitura do histórico exige proprietário e acesso vigente. Revogação ou expiração escondem o histórico e impedem novas avaliações. O rollback é uma desativação que preserva os registros.

Validação local: `node --test scripts/p02-launch-feedback-db.test.mjs`, 5/5 PASS em PostgreSQL descartável PGlite. Cobre identidade e data do servidor, isolamento entre proprietários, sessão anônima e chave de serviço, vínculos adulterados, comentários inválidos, imutabilidade, repetição, revogação, expiração e desativação. Evidência: `C:/ATVNA/tmp/p02-feedback-db.log`. Isso não comprova a migração hospedada nem uma avaliação real de cliente.
