# Experiência privada V3 — 25 produtos e ATV+

RUN_ID: ATV-20260902-170644Z-01A0630F. Escopo autorizado em 07/10/2026: aplicar a reengenharia de experiência a toda a esteira, mantendo os testes gratuitos e o aceite individual do proprietário antes de preço/Hotmart.

## Estado e autoridade

Implementação V3 nesta branch, baseada em `0044e609`. O release V2 anterior não comprova esta entrega. Publicação V3 e verificações hospedadas são registradas abaixo somente depois de observadas. E5 pessoal continua pendente; o avaliador automático aprova apenas o teste privado e não preenche o aceite humano.

Conteúdo `atv-ai-editorial-trials/3.0.0`; política `atv-private-trial-approval/3.0.0`. A composição usa corpus original com IA e edição, associado a fatos determinísticos. Não houve chamada a modelo externo com dados pessoais. O hash vincula a composição exata, sem homologar a precisão global do motor experimental. O corpus e as políticas históricas continuam disponíveis para verificar edições antigas.

## Jornada comum

- Benefício e formato próprios antes do formulário; confirmação de nome, data civil, cidade e fuso quando aplicáveis; prioridades do Atlas em seleção de temas distintos.
- Leitura web com síntese, capítulos, referências em detalhes, navegação acessível, posição e marcadores persistidos. Anotações continuam privadas e recuperáveis.
- Biblioteca com capas, data, edição, retomada, exportação aplicável, correção de dados para uma nova leitura e conteúdo editorial relacionado. A correção conserva a edição anterior; as autorizações precisam ser confirmadas novamente.
- Falhas de API/HTML/limites do provedor recebem mensagem recuperável. O PDF é produzido depois da leitura no navegador, evitando o limite de CPU do Worker.
- Compartilhamento explícito e revogável dos três produtos de casal: token aleatório, hash no banco, sete dias, projeção sem conta, nascimento, notas, cálculos ou IDs internos. A interface avisa que nomes e texto da leitura estarão no link. Revogar a concessão também desabilita a projeção.

## Contratos por produto

| Produto              | Experiência e curadoria V3                                                                                                                                                                      |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mapa Astral          | Cinco referências interativas, mandala, síntese e capítulos de funções, casas/contatos disponíveis; livro pessoal e imagem PNG 3000 × 4230/SVG.                                                 |
| Três Pilares         | Expressão solar, necessidade lunar, apresentação e integração/conflito. Funções no mesmo signo possuem hipóteses e exemplos diferentes.                                                         |
| Ascendente           | Apresentação, início de experiências e perguntas próprias; imagem restrita ao fator calculado.                                                                                                  |
| Meio do Céu          | Contribuição e reconhecimento, tensão e reflexão; não infere profissão/renda.                                                                                                                   |
| Horóscopo            | Contatos pessoais selecionados, tema do dia, ritmo rápido/pano de fundo quando presentes, ação/reflexão e revisão amanhã; web, sem PDF.                                                         |
| Leitura da Data      | Contatos efetivamente calculados para a data, recursos e limites; sem transformar uma amostra em janela exata.                                                                                  |
| Semana               | Sete amostras, contatos prioritários e orientações ligadas aos fatores selecionados.                                                                                                            |
| Calendário pessoal   | Contatos por dia ordenados por personalização/orbe, funções e dinâmica do aspecto, práticas variadas; repetição real do contato indicada como continuidade.                                     |
| Revolução Solar      | Tema do ciclo, Lua, pessoais/ângulos disponíveis, sombras, oportunidades e quatro revisões editoriais do ano; livro. As revisões não são eventos astrológicos calculados.                       |
| Combinação do Casal  | Dois gráficos de Lua/Vênus/Marte, aproximação, necessidade e desejo com conversa prática; sem casas, aspectos intermapas ou percentual inventados.                                              |
| Sinastria            | Dois mapas, afeto, emoções, comunicação, desejo, atrito/reparo e crescimento; capítulos ligados a contatos reais e acordos.                                                                     |
| Dossiê do Casal      | Comparação ampliada e referências individuais das duas pessoas, temas e acordos revistos; dois gráficos e livro.                                                                                |
| Bússola de Carreira  | Cálculo natal privado ampliado: regente tradicional do MC, Sol/Mercúrio/Marte/Júpiter/Saturno, casas 2/6/10 e aspectos disponíveis; forças, armadilhas, critérios e experimento de trinta dias. |
| Propósito & Carreira | Contribuição, recursos e rotina com a síntese profissional ampliada; prioridades e experimento observável.                                                                                      |
| Jornada de Direção   | Objetivo e revisões civis nos dias 7, 14 e 30, com anotações persistidas; não afirma trânsitos nessas datas.                                                                                    |
| Atlas da Vida        | Quatro prioridades distintas cruzadas com fatores reais, leitura longa, prática de trinta dias e mandala.                                                                                       |
| Carta do Dia         | Carta efetivamente sorteada, pergunta e gesto concreto; web, sem PDF artificial.                                                                                                                |
| Foco Agora           | Questão presente, carta/recurso e próximo passo contextualizado.                                                                                                                                |
| Sim/Não responsável  | Condições, alternativas e informação faltante; nenhuma decisão binária delegada ao sorteio.                                                                                                     |
| Três Perguntas       | Três perguntas associadas às cartas salvas e síntese das ações.                                                                                                                                 |
| Jornada de Tarot     | Situação, recurso, experimento e acompanhamento sem alterar cartas da abertura.                                                                                                                 |
| Registro de Sonho    | Relato, emoções e associações próprias preservados; diário com anotações.                                                                                                                       |
| Leitura de Sonhos    | Hipóteses condicionais com base no relato e associações; perguntas e lacunas explícitas.                                                                                                        |
| Dossiê do Sonho      | Comparação com registros consentidos, diferenças e lacunas; livro de consulta.                                                                                                                  |
| Atlas dos Sonhos     | Revisão de registros de trinta dias e contadores reais; dias sem registro permanecem vazios.                                                                                                    |
| ATV+                 | Biblioteca de todos os produtos, histórico e acompanhamento privado; web, sem PDF de assinatura.                                                                                                |

## Validação local

- 65 testes de cálculo, composição, rejeição, formatos e integridade passaram, incluindo os 25 produtos, três gráficos/funções da Combinação e variedade do Calendário.
- 23 PDFs sintéticos reabertos e renderizados; páginas de capa, início, meio e apêndice inspecionadas. Exemplos: Mapa 13 páginas/3291 palavras; Carreira 9/1678; Sinastria 17/3864; Dossiê do Casal 17/3968. Quantidade não substitui aprovação editorial do proprietário.
- `svelte-check`: zero erros e avisos. ESLint completo identificou seis ajustes de chave/atribuição, corrigidos e reavaliados nos arquivos afetados.
- Banco descartável: três testes passaram para progresso/marcadores, isolamento proprietário/terceiro/anônimo, limites, compartilhamento apenas de casal, substituição/revogação, concessão revogada e rollback preservando histórico.
- E2E local: 18 casos passaram na bateria; o teste novo do gráfico breve exigiu identificação dos três corpos no SVG e passou na repetição (19 cenários verificados). O gate completo no CI permanece obrigatório.
- Bateria unitária geral: repetição final com 1789 testes web aprovados e um timeout de cinco segundos na renderização dos doze artigos existentes. A repetição focal dos dois arquivos anteriormente afetados passou com 16 testes. O gate completo no CI permanece obrigatório; timeout local não conta como aprovação.
- Skill instalada `atv-aprovar-interpretacoes` atualizada com critérios V3; validador da skill passou.
- Medição sintética local dos 25 cálculos/composições: 2–374 ms. Não representa latência hospedada ou medição de interação do navegador.

Evidências extensas locais fora do Git: `E:/ATVNA/.worktrees/products-experience-*.log`, `E:/ATVNA/.worktrees/product-review-synthetic/` e `apps/web/.trial-qa/`. Originais privados enviados pelo proprietário não integram este commit.

## Limites e aceite restante

O motor segue experimental e as séries diárias seguem amostras; a promessa de janelas exatas foi removida. Nenhuma venda, preço, webhook Hotmart, provedor pago ou concessão automática por IA foi ativado. O teste administrativo da concessão não substitui uma sessão real do proprietário. Ele deve gerar/reabrir cada nova edição, conferir seus dados e registrar aprovação ou rejeição. Comparações com sites citados no anexo não foram usadas como evidência de benchmark.

A credencial dedicada do cálculo admite uma segunda chave apenas durante a rotação, sem retirar a chave vigente antes de publicar o servidor. Teste específico verifica retirada da chave anterior; nenhuma credencial integra o repositório.

## Registro de liberação

Pendente nesta revisão inicial: PR/CI, migração expand, runtime, Pages, verificação hospedada dos 25 cálculos e acesso da concessão. Atualizar esta seção com IDs e resultados observados antes de declarar a versão disponível.
