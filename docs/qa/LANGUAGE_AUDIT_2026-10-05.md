# Auditoria de linguagem e experiência — 05/10/2026

RUN_ID: `ATV-20260902-170644Z-01A0630F`. Branch: `codex/linguagem-atvna`. Checkout isolado: `E:/ATVNA/.worktrees/linguagem`. Aprovação do proprietário: revisão global e implementação, considerando a sessão **GOOGLE NOTICIAS**.

## Entrega implementada

Copy e microcopy das páginas públicas, seis temas, Loja, navegação, cookies, login, dados de nascimento, dashboard, Biblioteca, formulários, leitores, arquivos e mensagens. As 26 apresentações públicas explicam os 25 produtos e ATV+ com nomes familiares, benefício específico, dados, formatos e disponibilidade. Previsões e relação com dinheiro são termos permitidos quando correspondem ao conteúdo. A página inicial conduz ao mapa astral; a ferramenta gratuita de Meio do Céu conserva acesso próprio.

O login mantém o produto escolhido por uma lista de destinos seguros. Estados vazios, falhas, processamento, revisão, revogação e indisponibilidade continuam distintos. Nenhum preço, pagamento, áudio produzido ou e-mail enviado foi inventado. Produtos em preparação permanecem fora do índice.

As bases de **GOOGLE NOTICIAS** foram incorporadas: páginas editoriais, metadados, feeds, registro, autores, fontes, datas e gates. O registro editorial continua vazio, aguardando conteúdo real aprovado. O filtro de linguagem também passa a fazer parte da validação editorial.

Modelos atualizados: web 1.2, PDF 1.3, SVG 1.1, imagem 1.1, narração 1.1 e mensagem de e-mail 1.1. O contrato de arquivos e a migração aditiva conservam as versões históricas. O forward-fix foi testado. O novo prompt editorial inclui o guia de estilo e invalida aprovações do hash anterior, sem ativar IA produtiva.

## Verificações locais

| Verificação         | Resultado e evidência                                                                                                                                                                                                                                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tipos e Svelte      | `pnpm check` PASS; web com zero erros e zero avisos. `test-results/language-check-final.log`.                                                                                                                                                                                                                             |
| Formatação e lint   | `pnpm lint` PASS. `test-results/language-lint-final.log`.                                                                                                                                                                                                                                                                 |
| Testes web          | Rodada serial: 1607 PASS, dez expectativas antigas no teste de integração natal; após atualizar o texto esperado, os 82 testes desse arquivo passaram. Conjunto de 1617 testes validado entre as duas execuções. `language-web-unit-serial.log` e `language-natal-final.log`.                                             |
| Pacotes e worker    | Passaram na rodada `pnpm test:unit`; a rodada global terminou com falhas web por tempo/disputa de recursos, resolvidas na execução serial e focal. `test-results/language-unit.log`.                                                                                                                                      |
| Banco               | 103 testes com assertions PASS na rodada global; comando interrompido junto ao resumo. Os dois testes de renderizadores foram executados novamente com exit 0, incluindo modelo novo, arquivos históricos, idempotência, versão futura e forward-fix. `language-db.log` e `language-renderer-db-final.log`.               |
| Lab e benchmarks    | 80 PASS em oito arquivos. `test-results/language-lab-final.log`.                                                                                                                                                                                                                                                          |
| Build               | `pnpm build` PASS na versão final dos componentes e do guard de rotas editoriais. `test-results/language-final-build.log`.                                                                                                                                                                                                |
| Percursos Chromium  | 483 testes únicos PASS em 49 arquivos; mais 11 verificações focais repetidas das telas finais. A união dos testes aprovados foi conferida contra a lista completa, sem contar repetições como testes adicionais. Evidência durável: `E:/ATVNA/docs/30-execucao/evidencias/linguagem-2026-10-05/CHROMIUM_EVIDENCIAS.json`. |
| Capturas e PDF      | Dashboard em 1440/390, oferta e leitor do Mapa Astral, entrada de casal e diálogo de acesso revisados visualmente. PDF sintético do Dossiê do Casal: 38 páginas A4, 121 fatos e 35 seções; primeira e última páginas renderizadas e inspecionadas. Capturas e PDF na pasta de evidências acima.                           |
| Filtro de linguagem | 173 fontes públicas verificadas, zero ocorrências bloqueadas. O filtro também integra prompts e revisão editorial dos textos gerados.                                                                                                                                                                                     |
| CI                  | Commit anterior `d25e93f`: execução 37328081697 SUCCESS nos quatro jobs. A execução do commit de fechamento, seus jobs e resultados ficam em `E:/ATVNA/docs/30-execucao/evidencias/linguagem-2026-10-05/CI_EVIDENCIAS.json` e na WU-LING-003 do log canônico.                                                             |

Os arquivos extensos em `test-results/` são evidências locais, não conteúdo público. A suíte completa de percursos usa o build SvelteKit com adapter Node local, após instabilidade do Wrangler no Windows. Acessibilidade pública e Gate B também foram verificados pelo adapter Cloudflare no CI. Os percursos usam fixtures identificadas e não comprovam login, entrega ou aprovação hospedados. As expectativas de texto foram atualizadas; permissões, dados, downloads, recuperação, consentimento, histórico e estados continuam sendo verificados.

## Documentação e continuidade

- `docs/editorial/GUIA_LINGUAGEM_ATVNA.md`: voz, vocabulário, exemplos, critérios por estado e revisão dos entregáveis.
- `docs/editorial/AUDITORIA_PRODUTOS_2026-10-05.md`: matriz dos 26 percursos, ações e formatos.
- `docs/editorial/language-changes.json`: substituições literais e mudanças de fluxo/modelo, estas explicitamente identificadas como descrições.
- `scripts/check-customer-language.mjs`: verificação das fontes públicas; os prompts e o diretor avaliam a repetição entre os textos gerados.

## Limites de aceite

O filtro melhora a escrita e a coerência; não é detector de autoria nem comprovação de autoria humana. Leituras finais ainda exigem fatos, conteúdo e aprovação reais. Não foram fabricados artigos, depoimentos, especialistas ou interpretações aprovadas.

Esta entrega não homologa os 25 produtos nem encerra os marcos E1–E5 pendentes. Migração, OAuth, interpretação produtiva, checkout e entrega hospedada continuam sujeitos aos gates existentes. Integração à branch principal e liberação hospedada desta revisão permanecem pendentes; o checkout principal contém alterações concorrentes que foram preservadas. Nenhuma liberação de produção ou gasto foi realizado. O estado atual dos provedores deve ser consultado nas evidências da frente responsável, sem reutilizar indisponibilidades históricas como diagnóstico atual.
