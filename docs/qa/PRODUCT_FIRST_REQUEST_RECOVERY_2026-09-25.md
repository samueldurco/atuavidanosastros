# Primeira submissão recuperável — WU-055

RUN_ID: ATV-20260902-170644Z-01A0630F. Data: 2026-09-25.

## Entrega e contrato

Controlador comum para criação e reprocessamento; wrapper anterior preservado. Valida input estrito, consentimentos, produto e limite HTTP de 20.000 bytes UTF-8 antes do envio. sessionStorage guarda apenas UUID, segregado por proprietário/produto; nenhum texto pessoal, interpretação ou rascunho. Resposta perdida/reload permite somente consulta. Lookup e leitor autenticado precisam concordar com produto, raiz sem pai, ID e referência ativa da Biblioteca. 202 e recuperação não significam leitura pronta.

Somente após recuperação verificada, uma ação explícita `startAnother` pode retirar a chave local e preparar outro pedido independente. Null, arquivo sem referência, falha, troca de chave ou lookup inválido não permitem isso. A limpeza após recusa exata também reconfere a chave para não apagar uma substituição concorrente. Não há formulário novo nesta WU; a próxima incrementa a entrada simbólica sem modificar precisão natal.

## Evidência

- 66 casos novos do controlador e 40 legados PASS (`test-results/wu055-unit.log`). Consentimento, schemas, UTF-8, perda de confirmação, reload, concorrência, isolamento por conta, recusas conhecidas/ambíguas, lineage, armazenamento e início explícito de outro pedido.
- Três novos testes locais PostgreSQL/PGlite + handlers HTTP, total de 11 na integração de recuperação. O transporte descarta a confirmação depois do commit real: permanece exatamente um run/evento/referência; recarga só lê, inclusive após revogação. Recusa real não deixa escrita/chave; outro pedido intencional cria segunda raiz e preserva a primeira. Adaptador de erro sintético alinhado à mensagem real do RPC.
- Suíte web completa: 264 testes/23 arquivos PASS (`wu055-web.log`). Check zero erros/avisos (`wu055-check.log`); ESLint focal, Prettier, build e diff-check PASS (`wu055-lint.log`, `wu055-build.log`).
- Regressão do leitor e reprocessamento: 17 E2E PASS (`wu055-e2e.log`), incluindo quatro larguras, teclado, storage negado e recuperação após reload. Sem mudança de layout; reutiliza fixtures locais da WU-054, não representa UI nova de intake.

## Limites e contenção

Proteção restrita à sessão/aba, não distribuída. Limpeza anterior ao reload, fechamento da aba e outros dispositivos podem perder coordenação. Idempotência e quotas SQL continuam autoridades. Nenhum teste certifica JWT/PostgREST hospedados: autenticação e claims do banco local são sintéticos. Nenhuma migração hospedada, chamada de IA, gasto, promoção ou ativação; policies/releases false, nenhum modelo homologado.

Não converter BirthInput existente em promessa de precisão nem reaproveitar implicitamente perfil aproximado. Alterações concorrentes admin/TikTok/pacotes preservadas; lint amplo concorrente não recertificado. Contenção: não ligar o controlador a nova UI enquanto gates faltarem; manter consulta/histórico e nunca apagar chaves incertas para forçar envio.
