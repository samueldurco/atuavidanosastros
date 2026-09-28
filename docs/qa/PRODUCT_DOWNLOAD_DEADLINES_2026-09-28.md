# Prazos e cancelamento dos downloads privados — WU-114

RUN_ID `ATV-20260902-170644Z-01A0630F`. 28/09/2026.

O leitor limita a 30 segundos a requisição privada completa, incluindo cabeçalhos e corpo. A troca da leitura/revisão, revogação ou desmontagem cancela a operação. Respostas tardias não criam downloads nem alteram o leitor; a falha permite nova tentativa manual e devolve o foco ao controle que iniciou a operação. Formatos, MIME, corpo vazio e erros de autorização são conferidos antes de criar o arquivo.

18 testes unitários PASS (`test-results/wu114-focal.log`): quatro formatos, prazo compartilhado, cabeçalhos/corpo pendentes e tardios, cancelamento antecipado/durante a requisição, limpeza de listener, 401/403/404/409/503, redirecionamento, MIME incorreto, corpo vazio e mensagem sanitizada. Check web PASS com zero erros/avisos (`wu114-check.log`); Prettier, ESLint nos arquivos da WU e `git diff --check` PASS.

6 testes Chromium PASS (`test-results/wu114-e2e.log`), usando transporte local controlado: expiração dos cabeçalhos/corpo, cancelamento ao sair, recuperação manual/foco, rejeição de formato e resposta tardia. A rota de fixture é restrita a loopback e não altera autorização da API. Os 5 testes existentes de exportação web também passaram (`wu114-export-regression.log`): 1440/820/390/320 px e conteúdo hostil inerte. Ambos os comandos compilaram o app antes do preview local.

Prova limitada ao cliente e ao transporte local. Não certifica sessão, RLS, storage ou downloads hospedados. Supabase pausado pelo proprietário; não houve migração hospedada, gasto, envio, emissão editorial ou promoção de modelo/motor. Gate B continua parcial; 13 bases parciais/12 cálculos indisponíveis, todos os releases desativados e R$0 preservados. Alterações locais de admin/TikTok/mídia/social ficaram fora desta WU.
