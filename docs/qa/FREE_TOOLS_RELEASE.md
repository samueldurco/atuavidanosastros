# Ferramentas grátis e navegação — preparação da liberação

Data: 13/10/2026. RUN_ID: `ATV-20260902-170644Z-01A0630F`.
Worktree: `E:/ATVNA/.worktrees/free-tools-navigation-20261013`; branch: `codex/free-tools-navigation`; baseline: `origin/main` em `63c3a539`.

Este documento registra o delta implementado e a validação local focal. Não certifica publicação em produção, execução da migração no provedor ou aprovação dos gates agregados. A execução principal deve anexar os resultados finais e relacionar o SHA integrado ao deployment hospedado.

## Arranjo implementado

O menu público organiza quatro intenções: **Explorar temas**, **Ferramentas grátis**, **Leituras** e **Revista**. Os seis temas continuam ligados aos mesmos universos e IDs de catálogo. Ascendente é a entrada gratuita geral; Bússola de Carreira é a entrada gratuita de carreira.

| Destino                 | URL canônica         | Identidade preservada                      |
| ----------------------- | -------------------- | ------------------------------------------ |
| Índice de temas         | `/temas`             | Seis temas                                 |
| Mapa astral             | `/temas/mapa-astral` | `meu-ceu`                                  |
| Previsões               | `/temas/previsoes`   | `ciclos-tempo`                             |
| Amor                    | `/temas/amor`        | `amor-relacoes`                            |
| Carreira                | `/temas/carreira`    | `proposito-prosperidade`                   |
| Tarot                   | `/temas/tarot`       | `tarot-arcanos`                            |
| Sonhos                  | `/temas/sonhos`      | `sonhos-simbolos`                          |
| Índice de ferramentas   | `/ferramentas`       | Disponibilidade própria de cada ferramenta |
| Leituras personalizadas | `/leituras`          | IDs e estados originais do catálogo        |
| Produto individual      | `/produtos/{id}`     | ID original do produto                     |
| Revista                 | `/revista`           | Artigos e filtros existentes               |

Os hubs relacionam ferramentas, leituras e artigos publicados do tema. A navegação conserva marca, motivos e cores associados aos universos; ela não altera o estado de liberação de uma leitura personalizada. A worktree V5 com alterações locais em `E:/ATVNA/.worktrees/visual-v5-20261012` permanece separada. Este delta parte da base hospedada indicada acima e não certifica integração integral da V5.

## Ferramentas e disponibilidade

O registro comum `apps/web/src/lib/data/free-tools.ts` distingue a disponibilidade das ferramentas da liberação dos produtos pagos.

| Ferramenta              | URL canônica                       | Disponibilidade no delta                                |
| ----------------------- | ---------------------------------- | ------------------------------------------------------- |
| Ascendente              | `/ferramentas/ascendente`          | Grátis; cálculo com data, hora e local                  |
| Mapa astral grátis      | `/ferramentas/mapa-astral`         | Grátis; posições do mapa calculado                      |
| Horóscopo por signo     | `/ferramentas/horoscopo`           | **Parcial**; consulta às publicações admitidas          |
| Combinação do Casal     | `/ferramentas/combinacao-do-casal` | Grátis; dados das duas pessoas autorizados              |
| Bússola de Carreira     | `/bussola-de-carreira`             | Grátis; entrada de carreira preservada                  |
| Carta do dia            | `/ferramentas/carta-do-dia`        | Grátis; tiragem e reflexão simbólica                    |
| Tarot para uma pergunta | `/ferramentas/tarot-sim-ou-nao`    | Grátis; reflexão sobre a pergunta, sem resposta sim/não |
| Registro de sonho       | `/ferramentas/registro-de-sonho`   | Grátis; relato e associações pessoais                   |

As sete ferramentas marcadas como grátis estão implementadas no delta local. A validação funcional completa das ferramentas e de seu salvamento pertence ao conjunto de gates da execução principal; os testes de navegação abaixo não substituem essa cobertura.

O horóscopo não inventa previsões para preencher períodos ausentes. O índice editorial `/horoscopo` e as páginas de signo só entram no sitemap quando há arquivo datado admitido pelo contrato existente. A URL da ferramenta pode existir com disponibilidade parcial sem publicar um índice editorial vazio. Os testes continuam exigindo ausência das URLs editoriais sem arquivo datado e presença somente dos signos publicados quando ele existe.

## URLs antigas e redirecionamentos

O helper `apps/web/src/lib/server/public-redirects.ts`, chamado pelo hook, responde **301** a GET e HEAD das correspondências exatas abaixo. Aceita uma barra final e preserva integralmente `url.search`. POST, métodos não elegíveis e eventos sem método não recebem esse redirecionamento.

| URL antiga           | Destino 301                         |
| -------------------- | ----------------------------------- |
| `/meu-ceu`           | `/temas/mapa-astral`                |
| `/ciclos`            | `/temas/previsoes`                  |
| `/amor`              | `/temas/amor`                       |
| `/proposito`         | `/temas/carreira`                   |
| `/tarot`             | `/temas/tarot`                      |
| `/sonhos`            | `/temas/sonhos`                     |
| `/caderno`           | `/revista`                          |
| `/mapa-de-proposito` | `/produtos/mapa-proposito-carreira` |

Exemplo: `/caderno?tema=amor&utm_source=legacy` retorna `Location: /revista?tema=amor&utm_source=legacy`. As regras exatas não redirecionam artigos como `/amor/{slug}`, APIs, bibliotecas ou entregas privadas. Canonicals, breadcrumbs e links do diretório apontam para `/revista`; o sitemap deduplica URLs dos hubs publicados.

Existe também o alias de rota `/ferramentas/bussola-de-carreira`, com **308** para `/bussola-de-carreira`. O registro e os links públicos usam diretamente a canônica antiga preservada. Esse alias não integra a matriz de 301 com query acima.

## Evidência local focal

Prévia utilizada: `http://127.0.0.1:5193`, servidor Vite. Nenhum resultado desta seção deve ser descrito como validação de um deployment hospedado ou de um build de produção.

| Verificação executada                                         | Resultado e alcance                                                                                                                                 |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Playwright `public-menu.e2e.ts` + `articles-discovery.e2e.ts` | **9/9 PASS**, Chromium, um worker, 1,8 min                                                                                                          |
| Menu público                                                  | Quatro intenções, seis temas, larguras 320/390/820/1440; teclado Enter/Escape, retorno de foco e axe                                                |
| Descoberta editorial                                          | Diretório SSR, 12 guias, seis filtros, breadcrumbs, acessibilidade, links canônicos e aliases 301 com query                                         |
| HTTP dos destinos de descoberta                               | `/temas`, seis hubs, `/ferramentas` e `/revista`: 200                                                                                               |
| Varredura de largura                                          | Seis hubs e índice de ferramentas em 320/390/1440: **21 casos**, sem overflow horizontal                                                            |
| Vitest após correções do gate agregado                        | **92/92 PASS**, quatro arquivos, 34,46 s: `trial-access.spec.ts`, `editorial.spec.ts`, `public-horoscope-index.spec.ts`, `public-redirects.spec.ts` |
| Contratos unitários corrigidos                                | 24 URLs canônicas estáticas; comparação de `<loc>` exato; `Request` real no mock privado; GET/HEAD 301 e POST/método ausente sem redirect           |
| ESLint e Prettier focais                                      | PASS nos arquivos de navegação, redirects e testes alterados                                                                                        |
| `git diff --check` focal                                      | Sem erro de whitespace nos arquivos próprios                                                                                                        |

Evidência detalhada: `E:/ATVNA/evidencias/free-tools-navigation-preview-20261013.txt`. Inspeção visual do hub de carreira em 390 px: `E:/ATVNA/evidencias/navigation-topic-preview-390-20261013.png`. A configuração temporária usada para apontar Playwright à prévia foi removida após os testes.

## Preservação e gates restantes

IDs de produto, dados privados, autenticação, autoridade de pagamento, preços, flags e critérios de aprovação não são promovidos por esta navegação. A inclusão de uma ferramenta grátis não aprova automaticamente interpretações privadas ou conteúdo editorial datado. O salvamento usa o contrato aditivo `supabase/migrations/20261013115721_public_free_tool_results.sql`, mantendo RLS e acesso do proprietário; não há INSERT direto concedido a `anon` ou `authenticated`.

Nenhum bloqueador final foi identificado nos diffs próprios de navegação, temas, Revista e URLs. A disponibilidade parcial do horóscopo é explícita. Ainda cabe à execução principal comprovar, no SHA final, typecheck, lint, unitários, integração, build, E2E de produção, acessibilidade, secrets e SBOM, além dos gates existentes de Git/Cloudflare e da migração com validação de leitura/salvamento. Os checks `quality`, `accessibility`, `secrets`, `sbom` e `Cloudflare Pages` continuam obrigatórios; esta nota não altera nenhum gate.

Antes de afirmar liberação hospedada, registrar SHA completo, resultado dos checks, deployment ID, domínio canônico e smoke test das URLs novas/antigas. Consultar também `docs/qa/VISUAL_V4_RELEASE_PREPARATION.md` para o contrato operacional existente. Nenhum commit, push, publicação ou operação de provedor foi realizado pelo responsável por esta nota.

## Rollback com dados preservados

**Frontend:** antes da liberação, registrar o deployment de produção anterior bem-sucedido e seu SHA. Se houver regressão, o executor autorizado deve restaurar esse deployment pelo mecanismo de rollback de Cloudflare Pages e verificar domínio canônico, URLs e fluxos privados. O rollback de Pages deve usar o deployment anterior identificado; não substituir pelo mecanismo de versões de Workers. O rollback não dispensa preservar as evidências do deployment que apresentou a falha.

**Backend após existência de dados:** interromper novas gravações sem remover tabela, resultados, vínculos da biblioteca, policies ou histórico de migrações. A medida reversível prevista é:

```sql
REVOKE INSERT ON TABLE public.free_tool_results FROM service_role;
```

Preservar os grants de SELECT/DELETE e as policies do proprietário. O frontend anterior pode deixar de oferecer o novo salvamento; o backend deve falhar de forma fechada nas tentativas de INSERT. Corrigir por migração aditiva e só restaurar INSERT ao serviço após os gates aplicáveis. Não executar DROP, limpeza de resultados ou reset de migração depois de haver dados de usuários. A revogação acima é uma instrução de rollback preparada, não uma operação executada por esta nota.
