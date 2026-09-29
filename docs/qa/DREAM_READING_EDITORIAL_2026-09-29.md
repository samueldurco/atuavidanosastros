# Leitura Essencial de Sonhos — cobertura editorial local

Data: 29/09/2026. RUN_ID: ATV-20260902-170644Z-01A0630F. WU148.

O perfil `atv-dream-reading-editorial/1.0.0` integra o preparo, prompt, Director e fixtures de transporte existentes. A base registrada continua separada das hipóteses: data, todos os trechos do relato, emoções, associações e contexto disponíveis. Histórico não foi consultado; recorrência não foi avaliada. O contrato está em [dream-reading-editorial.md](../contracts/dream-reading-editorial.md).

São exigidas duas hipóteses com papéis e evidências específicos, nenhuma relação autônoma, uma síntese ligada às duas hipóteses e duas perguntas exploratórias distintas. O prompt recusa significado universal, diagnóstico e previsão; dados hostis não selecionam regras. O Director verifica cobertura estrutural e mantém `needs_editorial_review`; não certifica o sentido do texto. Um exemplo com afirmação universal demonstra essa limitação e a necessidade de revisão legítima.

## Evidências locais

- IA: 104/104 testes; seis casos próprios cobrem relato longo, ausência de opcionais, referências completas, 12 mutações, dados hostis, limite semântico e recusa antes de chamar gateway. `test-results/wu148-ai-all.log`.
- Worker: 122/122, incluindo revisão, coerência da base e entrega. Capacidade premium genérica continua verificada com cálculo sintético de Preview do par. `test-results/wu148-worker-final.log`.
- Root/banco: 160/161 na primeira rodada; a única falha era o digest anterior no teste do manifesto. Após atualização do digest, 25/25 testes focais de benchmark/corpus passaram; os 161 casos distintos estão cobertos. `wu148-root.log` e `wu148-root-retry.log`.
- Web SQL: 44/45 na primeira rodada; a única falha esperava o texto da fixture genérica anterior. Após adequação ao perfil, os 15 testes da suíte afetada passaram; os 45 casos distintos estão cobertos. Salvamento, reabertura e regeneração preservam fatos, hipóteses e referências. `wu148-web-vertical.log` e `wu148-web-vertical-retry.log`.
- TypeScript da IA e Worker aprovado. Formato verificado nos arquivos alterados; diff e scanner de segredos obrigatórios antes do commit. Logs `test-results/wu148-*`.
- CI da WU147: execução 36525457216, SHA d02d9de55d8bd79c44cbcedaf931747e08de71d3, SUCCESS; evidência `wu147-ci.json`.

Prompt 1.0.13; preparo/corpus 1.23.0. Digest de requests: `326feb034d473d7ca8f0fc1f6db59195904d1c7468cf511488e39ef39b0c8660`. Os sete casos preparados do produto recebem o perfil próprio. Fixtures são exclusivamente sintéticas e não aprovam publicação.

## Estado e próximo requisito

E1 integral BLOQUEADO: sessão real hospedada depende do proprietário retomar e confirmar o Supabase pausado. E2 integral BLOQUEADO: operador/editor precisam fornecer conteúdo ou modelo validado e revisão legítima; não foram feitas chamadas pagas adicionais. E3–E5 PENDENTES: WU149 implementará o leitor reconhecível, verificará o fluxo e fará QA visual local. O formato previsto é web.

Gates de release permanecem desligados, gasto automático R$0, nenhuma homologação ou liberação hospedada. Admin/TikTok/mídia/social paralelos preservados. A conclusão desta cobertura local não conclui o produto; a execução continua pela fila dos 25 produtos, ATV+ e plano original.
