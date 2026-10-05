# Auditoria de linguagem e experiência — 05/10/2026

RUN_ID: `ATV-20260902-170644Z-01A0630F`. Branch: `codex/linguagem-atvna`. Checkout isolado: `E:/ATVNA/.worktrees/linguagem`. Aprovação do proprietário: revisão global e implementação, considerando a sessão **GOOGLE NOTICIAS**.

## Entrega implementada

Copy e microcopy das páginas públicas, seis temas, Loja, navegação, cookies, login, dados de nascimento, dashboard, Biblioteca, formulários, leitores, arquivos e mensagens. As 26 apresentações públicas explicam os 25 produtos e ATV+ com nomes familiares, benefício específico, dados, formatos e disponibilidade. Previsões e relação com dinheiro são termos permitidos quando correspondem ao conteúdo. A página inicial conduz ao mapa astral; a ferramenta gratuita de Meio do Céu conserva acesso próprio.

O login mantém o produto escolhido por uma lista de destinos seguros. Estados vazios, falhas, processamento, revisão, revogação e indisponibilidade continuam distintos. Nenhum preço, pagamento, áudio produzido ou e-mail enviado foi inventado. Produtos em preparação permanecem fora do índice.

As bases de **GOOGLE NOTICIAS** foram incorporadas: páginas editoriais, metadados, feeds, registro, autores, fontes, datas e gates. O registro editorial continua vazio, aguardando conteúdo real aprovado. O filtro de linguagem também passa a fazer parte da validação editorial.

Modelos atualizados: web 1.2, PDF 1.3, SVG 1.1, imagem 1.1, narração 1.1 e mensagem de e-mail 1.1. O contrato de arquivos e a migração aditiva conservam as versões históricas. O forward-fix foi testado. O novo prompt editorial inclui o guia de estilo e invalida aprovações do hash anterior, sem ativar IA produtiva.

## Verificações locais

| Verificação | Resultado e evidência |
| --- | --- |
| Tipos e Svelte | `pnpm check` PASS; web com zero erros e zero avisos. `test-results/language-check-final.log`. |
| Formatação e lint | `pnpm lint` PASS. `test-results/language-lint-final.log`. |
| Testes web | Rodada serial: 1607 PASS, dez expectativas antigas no teste de integração natal; após atualizar o texto esperado, os 82 testes desse arquivo passaram. Conjunto de 1617 testes validado entre as duas execuções. `language-web-unit-serial.log` e `language-natal-final.log`. |
| Pacotes e worker | Passaram na rodada `pnpm test:unit`; a rodada global terminou com falhas web por tempo/disputa de recursos, resolvidas na execução serial e focal. `test-results/language-unit.log`. |
| Banco | 103 testes com assertions PASS na rodada global; comando interrompido junto ao resumo. Os dois testes de renderizadores foram executados novamente com exit 0, incluindo modelo novo, arquivos históricos, idempotência, versão futura e forward-fix. `language-db.log` e `language-renderer-db-final.log`. |
| Lab e benchmarks | 80 PASS em oito arquivos. `test-results/language-lab-final.log`. |
| Percursos Chromium | Em execução isolada; registrar o resultado antes do fechamento. A rodada anterior perdeu o servidor local Wrangler enquanto verificações pesadas rodavam em paralelo e não vale como aprovação. |
| Capturas e PDF | QA visual pendente nesta versão do registro. |
| CI | Pendente nesta versão do registro. |

Os arquivos extensos em `test-results/` são evidências locais, não conteúdo público. A execução Chromium usa fixtures identificadas e não comprova login, entrega ou aprovação hospedados.

## Documentação e continuidade

- `docs/editorial/GUIA_LINGUAGEM_ATVNA.md`: voz, vocabulário, exemplos, critérios por estado e revisão dos entregáveis.
- `docs/editorial/AUDITORIA_PRODUTOS_2026-10-05.md`: matriz dos 26 percursos, ações e formatos.
- `docs/editorial/language-changes.json`: substituições literais e mudanças de fluxo/modelo, estas explicitamente identificadas como descrições.
- `scripts/check-customer-language.mjs`: verificação das fontes públicas; os prompts e o diretor avaliam a repetição entre os textos gerados.

## Limites de aceite

O filtro melhora a escrita e a coerência; não é detector de autoria nem comprovação de autoria humana. Leituras finais ainda exigem fatos, conteúdo e aprovação reais. Não foram fabricados artigos, depoimentos, especialistas ou interpretações aprovadas.

Esta entrega não homologa os 25 produtos nem encerra os marcos E1–E5 pendentes. Migração, OAuth, interpretação produtiva, checkout e entrega hospedada continuam sujeitos aos gates existentes. O Supabase pausado e a validação externa permanecem pendentes com os responsáveis registrados no checkpoint mestre. Nenhuma liberação de produção ou gasto foi realizado.
