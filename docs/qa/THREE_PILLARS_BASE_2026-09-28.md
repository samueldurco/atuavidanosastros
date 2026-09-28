# Três Pilares — E1 local

WU-119 · RUN_ID `ATV-20260902-170644Z-01A0630F` · 28/09/2026.

## Requisito entregue

O intake natal consentido e o cálculo determinístico existentes foram preservados. A preparação editorial agora exige uma projeção persistida coerente de Sol, Lua e Ascendente. Facts, números, movimento, fontes, contratos e avisos devem concordar; MC, casas e aspectos não são aceitos nessa projeção. Ordenação de chaves JSONB permanece válida. O caso polar conserva o cálculo disponível, mas bloqueia a leitura por ausência de Ascendente.

Contrato: `../contracts/three-pillars-calculation.md`. Evidência editorial 1.4.0; corpus 1.6.0, sem novos casos: 105 casos, 103 preparados, dois bloqueados, 309 posições preparadas. Manifestos anteriores não provam essa revisão.

## Verificação

- Worker: 76 testes PASS; verificação de tipos PASS. Dois testes novos exercitam 25 corrupções ainda aceitas pelo schema genérico, preservação do objeto, ordenação JSONB e quatro latitudes polares.
- Corpus, benchmark e comparadores: 63 testes PASS, com fingerprints e contagens atualizados.
- Integração PostgreSQL/RLS local com PGlite, handlers e calculadores reais: 56 testes PASS. O caso consentido persistido prepara a leitura; alteração da exibição do Ascendente é recusada sem modificar a linha salva. Perfil polar passa por intake, snapshot, processamento e Biblioteca pendente; preparação retorna `insufficient_facts`, publisher fica idle e nenhuma promoção é criada.
- Web: `svelte-check` PASS, zero erros/avisos. Formatação focal e `git diff --check` verificados no fechamento da WU.

Saídas completas locais e ignoradas: `test-results/wu119-worker.log`, `wu119-check.log`, `wu119-scripts.log`, `wu119-integration.log`, `wu119-web-check.log` e `wu119-format.log`. Dados sintéticos; nenhuma chamada de modelo ou migração hospedada nesta WU.

## Limites e continuidade

E1 permanece parcial: coerência da projeção não autentica sua origem nem homologa precisão global do motor experimental. O responsável pela homologação deve validar as referências e tolerâncias aplicáveis ao domínio usado. E2 exige leitura completa e aprovação legítima; fixtures não a substituem. Próximo requisito independente: perfil editorial cobrindo separadamente Sol, Lua, Ascendente e síntese entre eles.

Gates de engine/editorial/publicação permanecem desligados, custo automático R$0. Supabase pausado continua bloqueando a sessão e demonstração hospedadas; proprietário deve executar Resume e então validar DNS/OAuth/sessão. Implementação local, validação local e liberação hospedada são estados distintos; nenhum marco integral nem produto liberado foi declarado nesta WU.
