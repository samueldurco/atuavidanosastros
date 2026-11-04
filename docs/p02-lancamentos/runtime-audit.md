# P02 — auditoria do caminho de execução

Data: 04/11/2026. RUN_ID preservado: `ATV-20260902-170644Z-01A0630F`.

Escopo: inspeção do repositório P02 e do contrato local P01; implementação local de entrada, cálculo factual, composição e revisão privada dos 11 produtos. Entradas sintéticas exercitam os métodos reais locais, inclusive sorteios Tarot. Nenhum segredo foi lido, provedor alterado, preço ativado, precisão comercial homologada ou deploy realizado por esta frente.

## Estado implementado

`packages/domain/src/launches.ts` exporta os 11 IDs e definições de produto, todos `PREPARING`, personalizados e com entrega `web`. Nomes, slugs e universos coincidem com `launch-metadata.json`. Exporta também `launchSpecs`, formulário declarativo específico, `parseLaunchInput` e `prepareLaunchEvidence`.

O contrato de entrada é `atv-launch-input/1`, separado de `atv-workflow/1.0.0`. Exige consentimento de armazenamento `atv-launch-consent/1`, rejeita chaves estranhas e parceiro, distingue relatos, listas, datas, confirmação adulta e opções completas de cerimônia. Confere data civil, limites geográficos e correspondência entre horário local, fuso IANA e instante UTC. A comparação de casamento aceita duas ou três opções distintas; produtos individuais não exigem dados de outra pessoa. Produtos sensíveis exigem confirmação adulta explícita; relatos continuam autorrelatos, sem inferência de idade ou cronologia não declarada.

`prepareLaunchEvidence(input, executionId)` exige UUID v4 fornecido pelo chamador servidor, calcula SHA-256 canônico da entrada e prepara fatos exclusivamente `reported`. Retorna `AWAITING_CALCULATION`, método planejado e três pendências explícitas: cálculo específico, revisão editorial específica e aprovação persistida. Esse envelope não é `CalculationSnapshot`, leitura final ou autorização de acesso. O chamador deve gerar e persistir a identidade de execução; validar o formato de um UUID não autentica sua origem.

`workflows.ts` exclui explicitamente os IDs P02 da engine legada. Incluir produtos no catálogo não pode criar automaticamente sinastria com parceiro nem selecionar um compositor editorial genérico.

## Caminho existente reutilizável e limites

| Etapa | Implementação existente | Limite para P02 |
|---|---|---|
| Catálogo e descoberta | `packages/domain/src/catalog.ts`; páginas em `apps/web/src/routes/produtos/[slug]` | Registro não libera geração nem venda; `PREPARING` preservado. |
| Entrada privada | `apps/web/src/routes/testar-produtos/[productId]/+page.server.ts`, `lib/server/private-trials.ts` | Registro legado consulta `workflows`; P02 usa contrato próprio e permanece fora dele. |
| Autorização | `trialIdentity`: sessão Supabase, claims e `has_atv_trial_access` | Precisa continuar no servidor; formulário público não equivale a acesso. |
| Execução | `lib/server/trial-runtime.ts`, `trial-computation.ts`, `trial-calculation.ts` | Runtime hospedado é Edge Function; cálculo local não é fallback hospedado. Requer adapters P02 específicos. |
| Composição | `lib/trials/current/index.ts` e compositores natal/temporal/simbólico | O teste atual de elegibilidade usa `offeredProductIds`, mas não implementa novos métodos. Não liberar esses IDs no dispatch privado só por estarem no catálogo. |
| Persistência e reabertura | `/api/private-trials/+server.ts` e `[id]/+server.ts` | Mantém owner, entrada, cálculo, leitura, aprovação e idempotência. Exige migração para novos IDs e vínculo com o contrato P02. Reabrir deve conservar execução e cartas. |
| Tarot | `lib/server/private-tarot-draw.ts`; `packages/domain/src/tarot-method-calculation.ts` | Reserva UUID no banco, sorteia, registra e só então interpreta. Os seis métodos atuais não incluem as duas tiragens temáticas P02. |
| Aprovação | runtime privado e experiência de leitura | Digest/integridade não comprovam adequação ao método novo. Exigem corpus, critérios e aprovação próprios, separados da avaliação do proprietário. |

O Tarot atual usa baralho de 78 cartas `atv-tarot-78/1.0.0`, seleção determinística vinculada à execução persistida e algoritmo `sha256-counter-rejection-fisher-yates/1`. Não usar seed do cliente nem adaptar um ID antigo para simular um produto novo. Os métodos temáticos previstos são: Ex — episódio, hipótese a examinar, critério de reparação; Bloqueios Financeiros — impasse, possível bloqueio, primeiro passo. As posições e versões precisam ser registradas como métodos novos antes do sorteio real.

## Próximas entregas finitas por método

| Produto ou grupo | Cálculo factual que falta | Síntese e revisão que faltam |
|---|---|---|
| Estreia: Data de Casamento | Mapas de evento das duas ou três opções; versão e política comparativa explícitas | Preferência e alternativa rastreáveis, cuidados e desempate; sem nota de felicidade conjugal. |
| Estreia: Tarot do Ex | Método próprio de três cartas, reserva e persistência autorizadas | Hipóteses ancoradas no episódio, sinais observáveis e limite; não afirmar sentimentos de terceiros. Astrologia eventual é complemento não implementado. |
| Estreia: Recomeço Amoroso | Natal e trânsitos no intervalo de 30 dias, com início e fim | Três cenários condicionais e postura pessoal; sem promessa de reconciliação. |
| Sexualidade e Intimidade | Fatores natais afetivos com escopo versionado; Vênus/Marte quando previstos | Confronto com relatos, limites e consentimento; não inferir preferências de terceiros. |
| Reações Emocionais | Lua e fatores emocionais declarados | Gatilho–reação–efeito, alternativa observável, sem diagnóstico. |
| Bloqueios Financeiros | Método próprio de três cartas, reserva e persistência | Impasse, hipótese de bloqueio e passo verificável; sem previsão de renda. |
| Talento Oculto | Fatores natais vocacionais definidos | Habilidade sustentada pelos dois favores e oferta experimental; sem promessa financeira. |
| Estilo pelo Ascendente | Ascendente real com proveniência | Três composições usando somente o inventário, adequadas à ocasião. |
| A Hora da Conversa | Natal e trânsitos em sete dias | Comparar falar e esperar conforme disponibilidade e limites; sem garantir resposta. |
| Convivência a Dois | Fatores natais individuais de rotina e espaço definidos | Afinidade, atrito a conferir e três acordos negociáveis, sem sinastria implícita. |

O provedor Caelus existente em `packages/astrology/src/index.ts` calcula posições/casas com proveniência `experimental`. Pode fornecer fatos reais locais, preservando esse estado; não transforma cálculo experimental em engine homologada ou leitura pronta. Cálculos temporais exigem suas políticas de aspectos/seleção. Comparação eletiva e sínteses temáticas não são implementadas pelo simples cálculo de um mapa natal/evento.

## Persistência, comercial e publicação

As restrições de produto e Tarot são concretas: `20261015145546_atv_plus_owner_simulation.sql` contém a allowlist de `atv_trial_readings`; `20261008170000_private_tarot_methods.sql` restringe métodos, quantidade e vínculo de sorteio. As guardas de aprovação/experiência e exportação estão em `20261007160000_private_reading_experience.sql`, `20261009090221_visual_v4_pdf_renderer.sql` e `20261015125547_career_web_export_1_4.sql`. São necessárias migrações novas revisáveis, testes de ownership/idempotência/integridade e aplicação hospedada; não alterar silenciosamente as migrações históricas. PDF não consta da entrega P02 atual.

O contrato P01 consultado foi `C:/ATVNA/.worktrees/p01-atv-mais-20261104/docs/contracts/atv-plus-commercial.md`. Direitos ATV+ têm vigência paga verificada no servidor; descontos digitais de 10/20/30% são simulações internas, sem preço/custo aprovado nem liberação. A regra escolhe uma vantagem aplicável, sem acumular cupom, promoção e benefício. O checkout deve reconferir elegibilidade e preço antes da compra e na confirmação.

A infraestrutura Hotmart existente inclui Hottok, inbox idempotente e transições comerciais. Não foi encontrado um caminho completo de checkout avulso digital que possa ser ligado aos 11 por cadastro. Faltam preço/custo aprovados, mapeamentos reais de produto/oferta e confirmação coerente com compra/entitlement. `FEATURE_HOTMART_LIVE` permanece false; o gate atual de Pages exige essa flag desligada. Não redirecionar a um link comercial para contornar esses gates. Orçamento autorizado desta etapa: zero.

Deploy deve usar CLI/API. `scripts/build-trial-runtime.mjs` monta o runtime; `scripts/prepare-architecture-supabase-release.mjs` exige HEAD exato/limpo e contém lista explícita de migrações, que deve ser revista para uma futura entrega P02. `scripts/pages-release-gate.mjs` faz preflight/postflight sem liberar venda. UI E2E somente local. Nenhum deploy é consequência automática dos testes locais.

## Validação desta frente

- `node --test packages/domain/launches.test.mjs packages/domain/workflows.test.mjs`: 17 testes passaram na implementação do contrato.
- `pnpm --filter @atv/domain check`: resultado registrado na comunicação da execução; deve permanecer verde após integração.
- Os testes verificam as 11 entradas específicas, igualdade com metadados, isolamento da engine antiga, consentimento, excesso de campos, datas/fusos/opções, limites adultos declarados, listas duplicadas e evidência sem cálculo/aprovação.

## Implementação factual E1 e editorial E2 entregue nesta execução

`apps/web/src/lib/server/launch-calculation.ts` calcula os 11 contratos específicos. Casamento usa dois ou três mapas do início da cerimônia e `launch-wedding-profile.ts`: fatos derivados com identidade estável por opção, cobertura, apoios/ressalvas geométricos e comparação original sem pesos. Preferência existe somente se um perfil contém todos os apoios e nenhuma ressalva adicional frente aos concorrentes, com diferença estrita. Empate e trocas são resultados completos, sem desempate inventado. Não é eleição completa nem certificação de precisão.

Ex e Bloqueios Financeiros usam dois métodos temáticos distintos de três cartas, diretas, sem reposição e com sorteio real. O estado factual `UNPERSISTED` descreve a origem do envelope; o serviço deve persistir o envelope e reabri-lo antes de compor, sem reescrever os fatos para fingir outro estado. Os exemplos em disco são snapshots sintéticos declarados, sem alegação de linha DB ou grant real.

Recomeço calcula natal e 120 amostras em 30 dias UTC (intervalo de seis horas); Conversa calcula natal e 28 amostras em sete dias. Contatos trânsito/natal são recomputados na revisão e não constituem horários favoráveis. Os seis produtos natais restantes têm recortes próprios de planetas/ângulos/aspectos; nenhum usa a engine de relacionamento ou calcula um parceiro implícito.

`launch-reading.ts`, `launch-reading-products.ts` e `launch-reading-wedding.ts` compõem entregas fechadas a partir de cânones locais versionados, relatos e fatos. Cada função planetária, posição Tarot, contato temporal, apoio/ressalva e integração tem vínculo próprio verificável. A revisão testa geometria, papéis, aplicação contextual e decisão parcial independentemente do digest de integridade; contrafactuais alteram cálculo real, relações, contexto, negações, conteúdo livre e fontes. Fontes fora da allowlist, parágrafos extras e afirmações contraditórias recebem rejeição.

Gates de dados continuam reais: Talento é rejeitado sem padrão sustentado pelos dois favores; Estilo é rejeitado sem inventário que permita três combinações completas; Reações exige relação lunar calculada suficiente; fatos/recortes incompletos não recebem interpretação inventada. O casamento é rejeitado quando o perfil não tem cobertura completa ou não se reconstrói dos eventos e entradas originais.

O resultado `APPROVED_FOR_PRIVATE_TEST` atesta somente consistência editorial privada. `commercialPrecisionApproved` e `commercialReleaseApproved` permanecem false em toda revisão. Persistência, ownership, grants, reabertura e avaliação do proprietário têm gates separados implementados pela frente de serviço/DB; ver suas evidências de E3/E4. Nenhum resultado local dá aceite humano E5, compra ou produção.

`launch-reading.samples.spec.ts` gera por opt-in `P02_WRITE_SAMPLES=1` os 11 pacotes em `docs/p02-lancamentos/samples/`, com `EXAMPLE_PRIVATE_REVIEW`, entrada sintética, cálculo real, leitura, revisão e digests. `benchmark.json` mede uma passagem sequencial local: duração factual/composição/revisão e bytes UTF-8 de JSON compacto. Sem aquecimento ou distribuição estatística, sob carga da estação; não prevê produção ou custos em moeda. Nenhuma chamada paga.

Aceite desta frente: E1/E2 locais e exemplos revisáveis; liberação hospedada, avaliação pessoal E5, precisão comercial, custos/preço e compra exigem seus gates próprios.
