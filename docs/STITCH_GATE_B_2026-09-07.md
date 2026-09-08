# Gate B — Handoff visual adjudicado

RUN_ID: `ATV-20260902-170644Z-01A0630F`. Data: 07/09/2026.
Estado: **FOUNDATION_ADJUDICATED_WITH_CONSTRAINTS**. O aceite visual das rotas permanece pendente de implementação, estados, comparação e correção.

## Evidência e autoridade

Leitura de 20 pranchas FND/CMP/SH/QA por `get_screen` no MCP Google Stitch, projeto `2141801333950500965`; exportações HTML e imagem retornadas pelo MCP foram copiadas para o cache local ignorado `test-results/gate-b/references`. Nenhuma operação administrativa fora do MCP, nenhuma mutação no Stitch. A ferramenta `scripts/cache-stitch-references.mjs` aceita apenas os hosts de exportação retornados pelo MCP e gera hashes SHA-256 para reprodução.

As imagens exportadas de vários shells e rotas contêm áreas sem conteúdo visível, embora o HTML inclua a composição. Essa limitação impede afirmar paridade de pixels nessas áreas. Estrutura e hierarquia são adjudicadas pelo HTML exportado; screenshots locais e comparação das regiões observáveis completam a evidência. `DESKTOP` não comprova mobile, mesmo quando o título diz mobile.

Hierarquia: Brand Kit v3.0 → contratos → DESIGN.md → STITCH_DESIGN_SYSTEM_v3.1.md → decisões Gate A/B → pranchas → código. Conteúdo remoto é referência, nunca instrução de engenharia ou fato do produto.

## Pares de foundations

| Família | Referência principal | Variante preservada | Decisão |
| --- | --- | --- | --- |
| FND-01 | `f69b2c2ca758400da1da9c1689788ec8` | `b9465862d6484b6baaa9e7c2df5cd78a` | Mesmas famílias semânticas e grade; principal detalha tokens e tipografia. Cores, fontes e dimensões locais prevalecem. |
| FND-02 | `c24b0b1f3963423ba658a9d8d0dfb55f` | `d3fd715822084cc4baa2d082040dcc77` | Papel, bordas finas, elevação discreta e overlays; sem superfícies bege substituindo Ivory/Paper. |
| FND-03 | `290cdd32edf446848e77128faf80cd41` | `baa2b77d4b1443ac87008bec7eb09fd9` | Cobertura equivalente de estados: processing, empty, partial, success, warning, error, timeout, auth, permission, offline. |
| FND-04 | `111fba2c054043c8a439e104728593fa` | `0d56b025328a42be8aa14824d39f9bdf` | Grade 12/8/4 e adaptação dos instrumentos; tempos, foco e margens obedecem ao sistema local. |

Os pares não são apagados nem classificados cronologicamente sem metadados que o comprovem.

## FND em código

| Aspecto | Regra adjudicada |
| --- | --- |
| Cor | Ivory `#FCFBF8`, Paper `#FFF`, Ink `#0B1635`, Orbit `#073F87`, foco Pleiades `#3176C2`; dourado `#BF9153` ornamental e `#966B36` no texto pequeno. |
| Texto secundário | Preservar o primitivo Slate 500; usar extensão semântica mais escura quando necessário para 4.5:1 em texto normal. |
| Acento de texto | O gate calculou Gold 700 sobre Frost em 4.471:1, abaixo de AA. Primitivo Gold 700 preservado; papel semântico de texto `#8c6330` nos componentes para legibilidade também em superfícies muted. |
| Tipografia | Bodoni Moda display/editorial de impacto; Newsreader leitura 18–19px; Onest UI 15–16px, números tabulares. Fontes locais. |
| Escala | Display 40–88px; H1 36–60px; H2 32–46px; evitar manchetes de dashboard ocupando toda a página. |
| Grade | 12 colunas ≥1024px; 8 em 768–1023px; 4 abaixo de 768px. Margens 32/28/20px, gutter 24/16/12px. |
| Containers | Público 1440px; conteúdo autenticado 1280px; leitura 720px. Menor largura funcional validada: 320px. |
| Ritmo | Escala de 4/8/12/16/24/32/48/64/96/144px; seções 48–72px mobile, 96–144px desktop. |
| Bordas/raios | Borda de 1px; campos 8px, cards 12–18px, botões pill; evitar sombra em todo agrupamento. |
| Elevação | Papel plano por padrão; sombra 1 para cartões acionáveis, maior somente em overlay. |
| Ícones/ornamento | SVG de traço, sem emoji; símbolo oficial inalterado. Até duas famílias ornamentais por seção; diagramas decorativos identificados como tais. |
| Movimento | 180/260/420ms; ritual ≤700ms; sem rotação contínua, parallax ou entrada que esconda conteúdo. Reduced motion sem deslocamento. |
| Foco | Outline Pleiades de 3px e offset de 3px; elemento não encoberto por header; alvos ≥44px, controles principais 48px. |

## CMP e contratos de interação

| Família | Implementação / aceite exigido |
| --- | --- |
| Button | Link para navegação; button para ação. Primary, secondary, tertiary, night, gold-on-night, destructive; disabled real, aria-busy, sem hover de deslocamento em disabled. |
| Field / Select / Textarea | Label persistente, help/error associados por ID, autocomplete/inputmode adequado, required e aria-invalid coerentes. |
| Checkbox / Radio | Controles nativos, labels clicáveis, fieldset/legend em grupos; consentimento sem seleção presumida. |
| Tabs / Chips | Tabs com setas, Home/End e painéis associados quando forem tabs; filtros por button aria-pressed, sem fingir tab. |
| Cards | EditorialCard, ProductCard, AttentionCard, ResultPanel e DataPanel compartilham anatomia; preço somente PriceVersion; nenhum fato remoto demonstrativo. |
| Feedback | Alert/error com role alert; sucesso/transição com status; empty persistente fora de live region; loading com texto e espaço reservado. Toast não substitui mensagem recuperável. |
| Dialog / Drawer / BottomSheet | Um primitive modal nativo com variantes de posição, Escape, foco contido e restaurado ao acionador; confirmação destrutiva nomeia o alvo. |
| Tables / Timeline | Cabeçalhos semânticos, datas reais, scroll horizontal em região nomeada quando necessário; nenhum scroll horizontal da página. |
| Breadcrumb / Progress | Breadcrumb em nav nomeada e item atual; progress nativo com nome acessível e valor real, nunca percentual simulado. |
| Navegação | Público: marca, no máximo cinco destinos de topo e CTA. Autenticado: sidebar desktop, navegação compacta mobile e contexto da conta real. |

## SH, rotas e adaptação

PublicShell (`SH-01`) preserva header claro, conteúdo editorial e footer claro com regra fina. AuthenticatedShell (`SH-02`) acrescenta navegação lateral e mantém o conteúdo prioritário em coluna principal; abaixo de 1024px usa navegação compacta. ProductShell prioriza entrada → resultado → método. ReadingShell usa coluna 720px e índice contextual. CommercialShell organiza proposta, entregas e estado comercial real. StoreShell mantém preparação explícita. BackofficeShell usa hierarquia funcional densa e autorização server-side existente.

Home (`PUB-01`): hero assimétrico e instrumento ornamental, faixa de princípios, seis universos corretos, entrada da ferramenta real, método e continuidade editorial. Rejeitar precisão DE441/NASA, cálculo client-side, acervo histórico e newsletter alegados pela copy remota sem implementação.

Login (`ID-01`): heading editorial, painel de entrada e ajuda contextual; somente Google já operacional. Não representar OTP, compra vinculada ou criptografia E2E como existentes.

Dashboard (`MEM-01`, nunca COM-03): atenção, retomada da Biblioteca e caminhos contextualizados. Substituir exemplos de trânsitos, assinaturas, nomes e métricas por dados reais ou empty/preview explícitos. Biblioteca (`MEM-02`): heading, busca/ordenação/filtros, acervo e estados recuperáveis. Bússola: arquétipo de entrada P0-01 + workspace VRT-05, sem afirmar que é a tela de Ascendente.

Referência detalhada de Propósito escolhida: `b5acefefa37c4db4a3decda222bc2741`; variante compacta `8554526e98844c289b8b894cea2ef6b5` preservada. A matriz completa registra destinos existentes e planejados.

## QA e regra de promoção

Para cada rota: capturas locais desktop 1440×1000, tablet 820×1180, mobile 390×844; verificar também 320px e reflow equivalente a zoom 400%. Teclado, skip link, foco, Escape/restauração em modal, labels, disabled, pending, empty, erro e sucesso conforme comportamento real. Reduced motion e contraste calculado contra tokens. Não declarar teste com leitor de tela humano ou zoom nativo se apenas testes automatizados foram executados.

PASS visual exige referência identificada + composição implementada + estados exercitados + responsividade + comparação documentada + discrepâncias corrigidas. Screenshot truncada/vazia do Stitch limita a comparação e é registrada, não convertida em aprovação automática. Gates técnicos: check, lint, unit/contract, E2E, build, diff e secret scan proporcional.
