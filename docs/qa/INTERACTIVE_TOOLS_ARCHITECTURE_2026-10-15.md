# Home e ferramentas interativas — 15/10/2026

RUN_ID: `ATV-20260902-170644Z-01A0630F`.

Implementação e validação locais, sem equivaler à liberação hospedada ou ao aceite pessoal do proprietário.

## Entrega

- Home organizada em ferramentas, seis universos, Revista, vitrine física, ATV+ e presença nos canais oficiais.
- Nove ferramentas em blocos horizontais: formulário e resultado no próprio bloco, navegação por toque e botões, página individual alternativa.
- Formulários permanecem montados ao recolher o bloco. Resultados de cálculo/sorteio são recuperáveis na mesma aba por 30 minutos e podem ser apagados pelo usuário.
- Meio do Céu, Casa 2 e Carta do Amor usam os cálculos/cânone existentes. Casa 2 indisponível em uma latitude não é inventada; o Meio do Céu não depende da disponibilidade das casas.
- Horóscopo consulta apenas edições publicadas e apresenta o histórico quando não existe edição para o período.
- Links de aprofundamento seguem a oferta canônica e o assunto da Revista. A página histórica da Bússola redireciona para a ferramenta de Meio do Céu.

## Provas locais

`apps/web/scripts/qa-public-architecture.mjs`, executado contra o servidor local em 15/10:

- Larguras de 390, 768 e 1440 px: HTTP 200; zero erros JavaScript; zero violações Axe WCAG A/AA; sem overflow de página/formulário/resultado; sem imagens quebradas.
- Entrada do Ascendente preservada ao recolher e reabrir.
- Carta do Amor: POST real ao endpoint local, HTTP 200; mesma carta após recolher/reabrir e após recarregar; limpeza remove o resultado e o armazenamento temporário.
- Último bloco alcançável pela navegação lateral.
- Inspeção visual das capturas de ferramentas no desktop e resultado no celular.

Evidências geradas: `test-results/architecture/public-architecture.json`, `home-*.png`, `tools-*.png`, `love-result-*.png` e `test-results/architecture-ui-lifecycle.log`.

Regressões focais: 30 testes aprovados em `public-discovery.spec.ts`, `free-tools-calculation.spec.ts` e `product-vertical.integration.spec.ts`; registro em `test-results/architecture-regressions.txt`. O processamento público pago legado de Três Pilares permanece fechado e tem teste explícito de rejeição. O caminho privado reconstruído tem contrato próprio.

## Limites

Autenticação, salvamento remoto e execução privada hospedada requerem os respectivos serviços e grants. Dados sintéticos locais não demonstram uma sessão real do proprietário. Cobrança, assinatura comercial e automações de mensageria não são ativadas nesta etapa.
