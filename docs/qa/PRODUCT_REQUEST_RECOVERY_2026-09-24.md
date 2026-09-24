# WU-053 — recuperação de submissão

RUN_ID: ATV-20260902-170644Z-01A0630F. Data: 2026-09-24.

## Escopo e evidência

Migração expand-only `20260924170000_product_request_recovery.sql`, API autenticada `POST /api/workflows/recover` e forward-fix de revogação. Consulta somente leitura por chave original, restrita ao proprietário e com projeção mínima de identificadores. Nenhuma entrada pessoal ou leitura editorial retorna por essa rota.

Oito testes de integração usam PostgreSQL local PGlite, papéis reais e handlers HTTP reais com cliente de transporte simulado:

- Resposta perdida após commit: recuperação sem reenvio; contagens de runs, eventos e Biblioteca permanecem iguais.
- Mesma chave em duas contas: isolamento; inexistente e pedido de outro proprietário retornam null indistinguível.
- Release revogada: identificadores recuperáveis, sem publicar ou produzir conteúdo.
- Referência arquivada, perfil soft-deleted e run removido: sem ressurreição.
- EXECUTE negado a anon/service_role, subject ausente e chave nula rejeitados; SELECT bruto continua revogado.
- Onze entradas/estados inválidos de autenticação, CSRF, tamanho e schema rejeitados antes da RPC.
- Falhas de backend, projeções inválidas e transporte nunca são convertidas em not-found; resposta sanitizada.
- Contenção testada: revoga recuperação sem apagar eventos nem interromper o leitor já existente.

## Limites

## Verificações executadas

- Suíte web: 155 testes / 21 arquivos PASS (`test-results/wu053-web.log`). Após correções de tipos, os oito testes focais passaram novamente (`wu053-focused.log`).
- Check: zero erros/warnings; ESLint e Prettier focais PASS (`wu053-check.log`, `wu053-lint.log`). Build web PASS (`wu053-build.log`); diff-check PASS.
- Lint amplo não foi recertificado: a WU-052 registrou formatação pendente em quatro arquivos concorrentes admin/TikTok, fora deste escopo e preservados.

## Limites de entrega

Null não prova falha de submissão: pode haver transação em andamento. Não autoriza nova chave ou reenvio automático. A integração de cliente com esse estado é trabalho posterior. Migração somente local; JWT/PostgREST hospedados não certificados. Todas as releases/policies produtivas continuam false, modelos não homologados, nenhum gasto ou chamada de IA. Não houve mudança visual nesta WU.
