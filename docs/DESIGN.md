# ATVNA — direção visual MVP

Aprovada pelo proprietário em 14/10/2026. Esta é a autoridade visual da marca A Tua Vida nos Astros e de seus produtos. Substitui as direções anteriores, inclusive Atlas Essencial e propostas V1–V6. Não substitui contratos de produto, cálculo, acesso, privacidade ou segurança.

## Fonte e aplicação

A fonte aprovada é `C:/ATVNA/DESING SITE/REDESIGN_COMPLETO_2026-10-14`: apresentação navegável, `SISTEMA-VISUAL-1.0.txt`, `FECHAMENTO-PARA-APROVACAO.txt` e `data/design-tokens.json`. Os estados de avaliação nesses arquivos registram o momento anterior à aprovação. A implementação vigente está em `apps/web/static/brand/mvp`, `src/lib/styles/mvp*.css` e `packages/ui/src/tokens.css`.

A adaptação ao aplicativo preserva o desenho aprovado e seus princípios, usando os produtos e fluxos reais. Divergências com componentes antigos devem ser resolvidas em favor deste MVP, sem alterar regras de negócio para imitar um protótipo.

## DNA artístico

Papel tátil, margens desenhadas, recortes, gravuras de traço coerente, cores próprias de cada universo e espaço para leitura. A matéria aparece nos fundos, nas apresentações de produtos e nos intervalos da página. Não se resume a uma camada bege nem a ícones repetidos.

O símbolo circular da estrela sobre o livro/horizonte permanece. O nome da marca usa Newsreader com apoio de Onest. Desenhos novos devem parecer parte da mesma família de gravura: hachura, contorno, proporção, acabamento e contraste consistentes. Uma figura dominante por região; ornamentos não atravessam textos, controles ou outras artes. Referências históricas são material de investigação, não peças obrigatórias.

## Paleta e universos

Base: tinta `#183746`, noite `#102c3d`, papel `#f6efdf`, papel claro `#fff8e9`, sálvia `#d5d9c6`, cobre `#a36632`, texto secundário `#596365`, linha `#c7bfac` e erro `#9b342d`.

| Universo | Cor principal / acento | Família simbólica |
| --- | --- | --- |
| Mapa astral | `#174c69` / `#cf9a44` | Mandala astrológica, relações entre posições |
| Previsões | `#22647b` / `#e8bd6b` | Fases da Lua, passagem e ciclos |
| Amor | `#983e4b` / `#de765d` | Encontro, vínculos e botânica |
| Carreira | `#4d6231` / `#ce9b45` | Orientação, bússola e caminhos |
| Tarot | `#92501f` / `#ddb168` | Cartas e composição de cada método |
| Sonhos | `#625096` / `#bea7e2` | Figura onírica, nuvens e mariposa |

Cor diferencia o assunto; traço, papel, tipografia e composição unem a marca. Acentos não autorizam texto pequeno sem contraste: cobre sobre papel e texto secundário sobre sálvia exigem alternativas mais escuras. Símbolos decorativos nunca representam um resultado calculado.

## Tipografia, arte e hierarquia

Newsreader organiza títulos, marca e leitura editorial; Onest organiza interface, navegação, campos e instruções. Fontes locais e licenças preservadas. Coluna de leitura até 68 caracteres; conteúdo público em torno de 1160 px; ritmo de 4, 8, 12, 16, 24, 32, 48, 64 e 96 px, ajustado à tela.

A abertura da home explica a proposta: “Conheça seu mapa. Explore seu momento.” O lettering artístico tem área própria em momentos de mudança de assunto: Descoberta apresenta os universos; Caminhos acompanha carreira e orientação; Encontros acompanha vínculos; Sonhar acompanha sonhos. Não substitui o H1 informativo, labels ou controles. Cada arte tem equivalente textual acessível e espaço suficiente para respirar.

Microartes participam da composição com função: ramo para vínculo, pausa botânica para intervalo, horizonte para orientação. Não se distribuem como ruído uniforme. No celular, reduzir escala ou deslocar a arte preserva a hierarquia; esconder texto ou ação não é solução.

## Produtos e entregas

O catálogo real é a autoridade sobre IDs, nomes, métodos, disponibilidade e rotas. A família pública atual contém 27 entradas, incluindo ATV+ e seis métodos de Tarot. As composições individuais vivem em `mvp-product-design.json`; não reintroduzir os cinco métodos antigos do protótipo. Cada apresentação tem gravura, composição e assunto próprios, mantendo proporção, papel, assinatura e hierarquia comuns. Um ícone isolado não substitui a apresentação de um produto.

Conta, Biblioteca, Clube e entregas continuam em dashboards e leitores existentes. Preservar ações, estados, continuidade, histórico e rotas. A identidade também acompanha leituras do motor e exportações PDF/SVG elegíveis. Fatos, interpretação, método, fontes e incertezas mantêm suas distinções. Nenhuma gravura decorativa altera um gráfico real.

## Copy e experiência

Português objetivo e simples, com verbos concretos: explorar, conhecer, ler, salvar e continuar. Explicar o que a pessoa recebe, quais dados informa e o próximo passo. Evitar títulos abstratos como única apresentação de uma oferta, repetição de promessas, urgência inventada e alegações de cura, renda, emprego ou destino.

Não inventar preços, depoimentos, estoque, avaliações ou disponibilidade. Ferramenta gratuita entrega valor antes do cadastro; conta permite salvar e continuar. Loja e pagamentos respeitam os estados reais. Textos legais, consentimentos e limites do produto não são removidos para simplificar o visual.

## Acesso e qualidade

WCAG 2.2 AA: contraste, teclado, foco visível, labels persistentes, erros associados e alvos de toque de 44 px quando aplicável. Validar 320 px, tablet, desktop, zoom e reflow. Foco usa indicador com separação e contraste; estados não dependem só de cor. Respeitar movimento reduzido. Imagens decorativas têm alternativa vazia e nunca carregam informação indispensável sozinhas. Falha de imagem não impede uso.

CSS de apresentação pública fica sob `.mvp-public`; primitives compartilhadas de arte e estilos privados têm escopo próprio. Evitar vazamento de seletores entre catálogo, dashboard, ferramenta e leitura. Verificar sobreposição de gravuras, cards, texto, margens, menus e rodapé.

## Governança e liberação

Mudanças de DNA, símbolo, direção de marca e promessa de produto cabem ao proprietário. Ajustes de contraste, responsividade, composição, redação e coerência dentro desta direção podem ser executados continuamente. Novos trabalhos partem deste MVP; versões antigas não recuperam precedência por conter “aprovado”, “contrato” ou “final”.

O arquivo histórico `design/rascunhos/ATLAS-ESSENCIAL-3.1-revogado-20261014.md` conserva a direção anterior sem autoridade vigente. O acervo externo possui manifesto de realocação para rascunhos, preservando os originais.

Esta liberação visual não cadastra preços, ativa pagamentos ou IA paga, altera acesso, modifica cálculos ou executa migrações. Preservam-se R$0, gates, RUN_ID, consentimento e separação entre produção e testes. Implementação local, validação automatizada e liberação hospedada têm evidências separadas. A auditoria final inclui navegação pública, catálogo real, painéis, leituras, exportação, acessibilidade e prova dos arquivos servidos.
