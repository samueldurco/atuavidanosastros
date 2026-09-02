# Atlas Essencial Digital Product System v3.1

- Marca-base: A Tua Vida nos Astros v3.0 oficial
- Extensão de produto: 3.1.0
- Estado: aprovado para implementação
- Direção: Atlas Essencial

## Princípio

Um atlas editorial para a vida: precisão de produto, sofisticação editorial e linguagem celestial contida. A extensão digital não altera logos, lettering ou tokens oficiais; acrescenta decisões de interação, responsividade, estados e acessibilidade.

## Temas

### Editorial Ivory

Tema padrão. `Ivory 25` é página, `Paper 0` é superfície, `Ink 900` é texto, `Orbit 800` é ação, `Pleiades 600` é foco e descoberta. Dourado é ornamento ou texto grande; texto pequeno usa `Gold 700`.

### Celestial Night

Ambiente imersivo do mesmo sistema. `Night 950` lidera página, `Night 900` cards, `Frost 50` texto e `Lunar Mist 300` apoio. Usado em Tarot, rituais de leitura e revelações — nunca como substituto genérico do tema claro.

## Tipografia responsiva

- Display: Bodoni Moda, `clamp(2.5rem, 6vw, 5.5rem)`.
- H1: Bodoni Moda, `clamp(2.25rem, 5vw, 3.75rem)`.
- H2: Bodoni Moda, `clamp(2rem, 4vw, 2.875rem)`.
- Editorial: Newsreader, 18–19 px, largura máxima 720 px.
- Produto/UI: Onest, 15–16 px.
- Labels: Onest 600, 13 px, sem all-caps obrigatória em frases longas.

## Layout e ritmo

- 4 colunas mobile, 8 tablet, 12 desktop.
- Container 1440 px; dashboard 1280 px; leitura 720 px.
- Margens laterais: 20 px mobile, 28 px tablet, 32 px desktop.
- Seções: 48–72 px mobile e 96–144 px desktop.
- Editorial usa assimetria controlada; dados e comércio usam grids rígidos.

## Componentes e estados

Todo componente implementa: padrão, hover, foco visível, ativo, desabilitado, loading, vazio, erro e sucesso quando aplicável.

- `PublicHeader`: 4–6 destinos e um CTA; logo horizontal ≥320 px ou símbolo no mobile.
- `Button`: Primary, Secondary, Tertiary, Night, Gold-on-Night e Destructive.
- `Field`: label persistente, ajuda associada, erro específico e autocomplete adequado.
- `EditorialCard`: conteúdo e continuidade, sem aparência de anúncio.
- `ProductCard`: somente produto real; preço vem de `PriceVersion`.
- `AttentionCard`: próxima ação explicada e dismiss quando seguro.
- `ResultPanel`: método, versão, incerteza, ações de salvar e continuar.
- `ConsentBanner`: rejeitar tão acessível quanto aceitar; analytics bloqueado por padrão.
- `Toast/Alert`: não depende apenas de cor; regiões ARIA apropriadas.
- `Dialog/Drawer/BottomSheet`: foco contido, Escape e restauração do foco.

## Padrões

- Público/SEO: resposta substancial, próximo passo contextual e links internos.
- Ferramenta grátis: valor antes do cadastro; conta serve para salvar/continuar.
- Autenticado: dashboard por atenção, workspaces por universo e Biblioteca normalizada.
- Comercial: oferta explicada, sem urgência fabricada; checkout Hotmart é externo e rastreável.
- Entrega: web primeiro, PDF/SVG quando elegível, recuperação pela Biblioteca.
- Loja: estado “em preparação”; sem `Product`/`Offer`, preço, estoque ou review fictício.

## Movimento e acesso

- 180/260/420 ms; ritual máximo 700 ms.
- Deslocamentos de 4–8 px; sem parallax, estrelas piscando ou cards flutuantes.
- `prefers-reduced-motion` remove movimento não essencial.
- WCAG 2.2 AA, foco visível, teclado, zoom 200–400%, landmarks e nomes acessíveis.
- Touch targets mínimos de 44×44 px.

## Conteúdo e dados

A voz é íntima, culta, clara e não absoluta. Nenhuma promessa de cura, renda, emprego ou destino. Visualizações astronômicas sempre distinguem cálculo real de ornamento.

## Analytics

Eventos de interação são versionados e não contêm PII. GTM só carrega após consentimento não essencial. Eventos comerciais recebem identificadores internos, nunca e-mail, nome ou dados natais.

## Handoff Stitch

Criar projeto privado exclusivo “A Tua Vida nos Astros — Atlas Essencial Digital”. Aplicar este arquivo antes de gerar arquétipos. Nunca alterar projetos LUMINARA. Arquétipos iniciais: home editorial, ferramenta grátis, dashboard, entrega, landing de oferta e loja em preparação; cada um em desktop/mobile e estados críticos.

