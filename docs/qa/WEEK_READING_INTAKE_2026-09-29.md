# Semana — entrada privada por perfil natal

RUN_ID `ATV-20260902-170644Z-01A0630F`; WU182; base `1e3b4cfed5f6bad493c32c4d20a11386698ec455`. Implementação e validação locais com dados sintéticos. Gates fechados e gasto automático R$0.

## Requisito entregue

Comando exclusivo `atv-week-reading-request/1`, API autenticada de mesma origem e RPC com snapshot natal por revisão, recibo privado e autorização existente de release/acesso/quota. O formulário reutiliza NatalIntake e pede data inicial explícita, contexto opcional e consentimento separado. O limite 2099-12-25 preserva as sete amostras no intervalo do motor. Recuperação por UUID não repete a criação, nem depende de guardar nascimento, contexto ou data no navegador.

## Provas locais

- Focal: 91/91 em três arquivos, incluindo SQL/API/controller e disponibilidade mínima, em `test-results/wu182-intake-tests.log`. Cobertura de campos exatos, Unicode, calendário e bordas 25/26/31 de dezembro de 2099; autenticação/origem; revisão e horário EXACT; snapshots, RLS/grants, colisões e idempotência após edição/esquecimento; gates/acesso/quota; forward-fix e reaplicação. A primeira rodada encontrou dois erros de adaptação de nomes, corrigidos sem relaxar validadores.
- Regressão dos pedidos compartilhados: 233/233 em sete arquivos, em `test-results/wu182-shared-regression.log`. Suíte web completa: 1.418/1.418 em 69 arquivos, 138,90 s, em `test-results/wu182-full-web-unit.log`.
- Navegador local: 15/15, 2,7 min, incluindo criação, invalidação do consentimento, contexto opcional/limites, perfis inadequados, revisão, recuperação após resposta perdida e gates fechados, autenticação e teclado/reflow. Build executado pela suíte; prova `test-results/wu182-e2e.log`.
- Visual: quatro larguras 1440/820/390/320 sem overflow. Inspeção das capturas desktop e 320 PASS; evidência preservada em `test-results/wu182-intake-1440.png` e `test-results/wu182-intake-320.png`.
- Tipos web: zero erros e zero avisos em `test-results/wu182-web-check.log`. ESLint dos doze arquivos TS/Svelte PASS em `test-results/wu182-eslint.log`. Formato, diff e secrets são verificados antes do commit e guardados em `test-results/wu182-{format-check,diff,secrets}.log`.

PostgreSQL WASM com auth sintética e mocks locais não certificam JWT/PostgREST hospedados nem concorrência entre conexões independentes. Nenhuma migração foi aplicada ao Supabase pausado. CI181 `36578480924` passou no HEAD base; CI182 será registrado no log/checkpoint após publicação.

## Estado do produto

E1 EM_EXECUCAO: entrada implementada e validada localmente; homologação aplicável e requisitos temporais integrais pendentes. E2–E5 PENDENTE. A base permanece experimental, com sete amostras às 12:00 UTC e natal compartilhado; não cobre sete dias locais inteiros, eventos, intensidade ou janelas favoráveis. Timeline, resumo por área e PDF do plano original permanecem no escopo. Conteúdo útil aprovado, autoridade editorial legítima, formatos finais e percurso hospedado ainda exigem seus aceites. Supabase pausado e administração Cloudflare 403 são os bloqueios externos registrados; dezessete alterações paralelas foram preservadas.
