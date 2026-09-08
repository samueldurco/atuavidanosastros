# Gate B — evidência local e limites

RUN_ID `ATV-20260902-170644Z-01A0630F` · WU-021 · 08/09/2026 UTC.

Resultado: **LOCAL_QA_PASS / VISUAL_REVIEW_PARTIAL**. Não equivale ao Gate B integral nem ao aceite final de produto. Referências e adjudicação: `../STITCH_ROUTE_MATRIX.md` e `../STITCH_GATE_B_2026-09-07.md`.

## Comparação por superfície

| Superfície | Referência canônica | Composição implementada e diferenças justificadas |
| --- | --- | --- |
| Home | PUB-01 `18a86cf171564902a99204e4beb82421`, SH-01 | Hero assimétrico 7/5, instrumento orbital identificado como ilustração, princípios, seis universos, ferramenta, método e continuidade editorial. Sem alegações NASA/DE441, newsletter ou acervo inexistente do protótipo. |
| Entrada | ID-01 `79e2817895054c4d88b604749d2f690e` | Cabeçalho editorial, cartão de autenticação e coluna contextual. Só Google; indisponibilidade local explícita. Sem OTP ou criptografia E2E fictícia. OAuth não foi reconfigurado. |
| Dashboard | MEM-01 `7b0e4e8f0a1140c58d1709a6f7cdfde0`, SH-02 | Sidebar desktop, navegação compacta, atenção, leituras reais/empty, seis caminhos. Não usa COM-03, métricas, assinaturas ou perfil natal inventado. |
| Biblioteca | MEM-02 `f5af4d1cdd4542488d60e94fa2c9bafb` | Cabeçalho, busca, ordenação, chips e cartões. Estados vazio, sem correspondência e falha distinguíveis. Fixtures só na rota local identificada; consultas reais seguem RLS. Recuperação individual será implementada na vertical seguinte. |
| Bússola | P0-01 `bb8083583b824254b30420a462dcd7de` + VRT-05 `b5acefefa37c4db4a3decda222bc2741` | Entrada à esquerda, resultado/método à direita; empilhamento mobile. Não é uma cópia do produto premium nem a tela de Ascendente. Cálculo determinístico preservado. |

As capturas selecionadas em `gate-b/` preservam três larguras de cada superfície (desktop 1440, tablet 820, mobile 390). Capturas completas e reflow 320px são regeneráveis pela suíte local. A inspeção comparou estrutura/hierarquia do HTML exportado e regiões visíveis das imagens Stitch; áreas invisíveis/truncadas no export impedem homologar fidelidade integral. Os tokens oficiais prevalecem sobre aproximações remotas.

## Gates executados

- `pnpm check`, `pnpm lint`, `pnpm test:unit`: aprovados no monorepo; 10 testes unitários então existentes. Após os últimos ajustes de apresentação, `pnpm --filter @atv/web check` e `lint` aprovados, sem avisos Svelte.
- `pnpm test:e2e`: **13/13**, incluindo build de produção do webapp. Sete superfícies em 1440/820/390/320px, sem overflow da página; um main e heading visível.
- Teclado: skip link, menu/Escape, Tabs/setas/Home, Dialog/Drawer/BottomSheet com contenção e restauração de foco.
- Biblioteca: filtro, busca, ordenação, nenhum resultado e falha. Bússola: cálculo real sintético e erro simulado com dados preservados.
- Reduced motion e contraste dos papéis principais de texto calculados sobre Ivory/Paper/Frost, mínimo 4.5:1.
- `git diff --check`: limpo. Secret scan de adições staged e CI Gitleaks registrados no log junto ao commit.

## Correções comprovadas

1. Shift+Tab escapava do primeiro controle modal: contenção explícita e regressão automatizada.
2. Gold 700 sobre Frost media 4.471:1: primitivo preservado, semântico de texto `#8c6330` aplicado.
3. Campo de data esticava ao lado de campo com ajuda: alinhamento inicial no primitive Field.
4. Salvar após editar inputs podia associar entrada diferente ao resultado anterior: snapshot da entrada calculada usado na persistência.
5. Falha de consulta era mostrada como acervo vazio: estado de erro separado sem detalhes internos.

## Limites ainda abertos

Não houve leitor de tela humano, zoom nativo 400%, auditoria WCAG completa, benchmark de performance ou novo login OAuth nesta suíte. Reflow 320px não prova zoom nativo. Hover/active/disabled são contratos e amostras do catálogo, não auditoria exaustiva de todos os controles. O catálogo local não certifica todas as superfícies planejadas. As demais rotas permanecem mapeadas, sem PASS visual. Não há novas migrações nem mudanças de provedores nesta unidade.
