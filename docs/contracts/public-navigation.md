# Navegação pública por interesse

Arquitetura aprovada pelo proprietário em 06/10/2026. O menu oferece Início,
seis assuntos, Loja dos Signos e Minha conta. Artigos, método e ajuda aparecem
como navegação de apoio. A mesma estrutura funciona no celular e no desktop.

Cada assunto abre apenas dois caminhos: a primeira experiência da esteira e
os conteúdos daquele assunto em `/caderno?tema=...`. Produtos posteriores,
upsells, dossiês, jornadas e ATV+ não entram no menu global.

| Assunto | Primeira experiência | Conteúdo |
| --- | --- | --- |
| Mapa astral | `/produtos/ascendente` | `meu-ceu` |
| Horóscopo e previsões | `/horoscopo` | `ciclos` |
| Amor e relacionamentos | `/produtos/preview-do-par` | `amor` |
| Tarot | `/produtos/carta-do-dia` | `tarot` |
| Carreira e propósito | `/bussola-de-carreira` | `proposito` |
| Sonhos e significados | `/produtos/registro-de-sonho` | `sonhos` |

A Bússola tem cálculo gratuito público. As demais entradas mostram **Em
preparação**: navegação não homologa produtos nem altera gates de entrega.
Uma mudança de disponibilidade exige comprovar a experiência pública antes de
trocar o indicador. A loja mantém o estado de preparação existente.

O caderno organiza o conteúdo estático já existente, sem inserir documentos no
registro editorial, inventar notícias, autores ou aprovações. As consultas por
assunto compartilham a canonical `/caderno`. Um assunto desconhecido mostra
todos os temas.

`public-menu.e2e.ts` verifica os dois destinos de cada tema, respostas HTTP,
indicadores de disponibilidade, ausência de upsells, filtro editorial,
canonical, teclado, Escape, accordion exclusivo, WCAG e reflow em 320, 390,
820 e 1440 px. O teste participa do job de acessibilidade da CI.

## Home e catálogo — decisão do proprietário em 07/10/2026

A home apresenta, nesta ordem: **Comece gratuitamente**, **Leituras e experiências**, **Revista ATVNA**, **Loja dos Signos**, método. A entrada gratuita pública comprovada nesta release é a Bússola de Carreira (`/bussola-de-carreira`), que calcula o signo e o grau do Meio do Céu sem cadastro. As outras ferramentas permanecem fora desse bloco até a comprovação de disponibilidade pública e os gates específicos de cada produto.

`/leituras` reúne os 25 produtos digitais dos seis universos, com filtro `tema` validado e URL canônica sem filtro. Reutiliza o catálogo de domínio e o acesso privado existente; a interface não altera estados nem concede acesso. ATV+ aparece como continuidade, fora da lista dos 25 produtos. Os produtos digitais não entram na Loja dos Signos, reservada a produtos físicos.

Revista ATVNA é o nome público do editorial. A rota canônica `/caderno` e seus filtros são preservados. A home seleciona três documentos de temas diferentes pelo registro de publicações; não promove rascunhos ou títulos demonstrativos. Horóscopos e acompanhamentos de trânsitos só entram após publicação aprovada.

A Loja dos Signos mantém a preparação sem catálogo comercial fictício. A nova navegação não altera checkout, direitos de entrega, flags do motor ou integrações pagas.
