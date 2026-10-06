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
