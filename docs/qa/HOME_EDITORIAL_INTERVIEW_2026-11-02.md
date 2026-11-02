# HOME ATVNA — entrevista e implementação editorial

Data: 02/11/2026. RUN_ID: `ATV-20260902-170644Z-01A0630F`.
Branch: `codex/home-editorial-interview-20261102`, base `dcbc748`.
Escopo: HOME e seus componentes compartilhados de ferramentas e rodapé. Implementação local; este relatório não representa publicação hospedada ou liberação de contratação.

## Decisões do proprietário

| Tema         | Decisão incorporada                                                                                                        |
| ------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Jornada      | Descoberta gratuita → conhecer leituras → aprofundar.                                                                      |
| Entrada      | Escolha por interesse, sem ferramenta aberta ou privilegiada inicialmente.                                                 |
| Abertura     | Composição editorial assimétrica, preservando cores, fontes, símbolo e gravuras.                                           |
| Mensagem     | “Ferramentas e leituras para explorar o seu momento.”                                                                      |
| Universos    | Os seis têm igual importância e acesso claro.                                                                              |
| Demonstração | Uma amostra desenvolvida de Mapa Astral com dados fictícios identificados.                                                 |
| ATV+         | Módulo próprio depois das leituras avulsas, com diferenças reais dos três planos.                                          |
| Revista      | Três matérias com o mesmo destaque, compactas e com metadados publicados reais.                                            |
| Loja         | Uma peça protagonista e outra complementar; catálogo e imagens existentes.                                                 |
| Redes        | Somente no rodapé: ícones fiéis clicáveis e discretos, sem nomes ou setas visíveis. Nomes acessíveis permanecem nos links. |

## Resultado da auditoria

A sequência final é abertura → ferramentas por interesse → amostra → leituras avulsas → ATV+ → seis universos → revista → loja → rodapé.

- A abertura tem uma ação principal para ferramentas e um acesso secundário à demonstração. A arte ocupa um campo próprio; no celular a ação antecede a gravura.
- As nove ferramentas existentes continuam disponíveis. Filtros dos seis interesses organizam a escolha; o painel abre abaixo da linha correspondente, recebe foco e devolve o foco ao fechar. Alternar interesses não apaga o rascunho.
- A amostra usa cálculo determinístico e trechos efetivamente compostos pelo fluxo existente. O perfil é fictício; a seção identifica o caráter parcial da demonstração. Há mapa ampliável, posições em tabela e síntese expansível.
- As leituras usam uma seleção estática de três produtos e o ATV+ aparece em módulo separado. Estados reais de preparação e indisponibilidade de contratação são preservados.
- Os seis universos têm áreas equivalentes. O rótulo compacto “Amor e relações” evita divisão de palavra no celular, mantendo o destino canônico.
- A revista seleciona três documentos admitidos no registro editorial, favorecendo interesses diferentes e preservando título, descrição, data e endereço. A antiga reserva de matérias para links temáticos removidos foi retirada.
- A loja preserva a seleção por catálogo e as imagens reais. A diferença de escala entre a peça protagonista e a complementar comunica a hierarquia editorial.
- O bloco social separado saiu da HOME. O rodapé reúne os nove canais oficiais com SVGs próprios de cada rede e alvos de toque de pelo menos 44 px.
- Tipografia, papel, paleta e gravuras aprovadas foram reutilizados. Ferramentas, navegação temática, revista e comércio têm composições distintas; o celular tem arranjos próprios.
- O identificador público `sample` foi admitido no filtro de analytics, mantendo consentimento e exclusão de informações pessoais.

## Proveniência da amostra

Ver `HOME_READING_SAMPLE_2026-11-02.json` e `HOME_READING_SAMPLE_REVIEW_2026-11-02.json` neste diretório. A revisão por outro agente reproduziu os fatos e os trechos, verificou os artefatos e concluiu `APTA_PARA_INTEGRACAO_LOCAL_COMO_DEMONSTRACAO`, sem pendências. A aprovação privada original permanece restrita a `private-free-test`; não foi usada como autorização pública ou comercial.

## Validação

Os resultados finais e as capturas estão no pacote externo `C:/ATVNA/evidence/ATV-20260902-170644Z-01A0630F/home-editorial-20261102`. O arquivo `completion.json` registra comandos, contagens e limites de cada verificação.

- Build de produção aprovado, com os quatro assets datados conferidos por SHA-256.
- Checagem Svelte final: zero erros e zero avisos. A anotação de tipo ausente no teste editorial foi corrigida e seus cinco casos foram repetidos com sucesso.
- Quinze testes unitários aprovados: dez de analytics e cinco de seleção editorial.
- Nove cenários de HOME aprovados entre 320 e 1440 px. Dois precisaram de reexecução após hidratação interrompida durante HMR; ambos passaram com o código estável.
- Dois cenários de amostra e acessibilidade aprovados em 320 e 1440 px, incluindo diálogo, tabela, expansão e análise da página completa.
- Seis cenários funcionais de ferramentas aprovados contra o build final e o backend local, com sete requisições POST bem-sucedidas. Não abrangem autenticação, checkout ou cálculo de todas as nove ferramentas.
- ESLint dos arquivos alterados, Prettier, sintaxe do gerador e `git diff --check` aprovados. Há 26 capturas preservadas no pacote de evidências.

As provas separam a interface da HOME, que utiliza fixture explícita apenas para prontidão e recuperação de rascunho, da regressão funcional das ferramentas, que utiliza o servidor local de testes e o cálculo real. Nenhum serviço pago ou dado pessoal real é necessário.

Revisão visual: abertura, ferramentas, amostra, leituras/ATV+, universos, revista, loja e rodapé em desktop e celular. A análise automatizada de acessibilidade cobre a página e a amostra expandida; não substitui uma auditoria manual completa de WCAG.

## Limites preservados

Não houve alteração nos cálculos astrológicos, quotas, identidade, catálogo comercial ou gates de publicação. Os planos ATV+ e produtos em preparação não passaram a aceitar contratação. Não houve implantação, push ou alteração do checkout principal existente. O checkpoint global da execução mestra não foi reescrito para esta intervenção de design.
