# P02 — preparação comercial finita

Data: 04/11/2026. RUN_ID: `ATV-20260902-170644Z-01A0630F`. Escopo: onze lançamentos digitais avulsos com entrega web. Resultado: estrutura comercial especificada, **sem novo preço aprovado nem custo marginal comprovado**. Não foram feitas chamadas pagas, cobranças, upgrades ou alterações em provedores por esta auditoria.

## Autoridade existente

- `docs/20-produto/programa-comercial-atvna/README.md`, itens 17–19 e 29–30: custo inicial autorizado R$ 0, simulação de taxas/margem, preço regular e piso ainda dependentes de definição; P01 governa preço, carrinho e conta; P02 governa descoberta. IDs, URL, tipo, preço, elegibilidade e disponibilidade precisam ser estáveis. O servidor decide condição vigente e preço final.
- `docs/adr/0002-environments-and-cost.md`: não criar custo fixo, upgrade, complemento, faturamento ou domínio automaticamente. Essa política não prova custo marginal zero nem o saldo atual de qualquer conta.
- `docs/contracts/architecture-offers-20261015.md`, linhas 57–66: o valor histórico proposto de R$ 7,90 se refere exclusivamente à leitura de uma data especial, não registra preço e não se estende a outros produtos. Definições novas permanecem `PREPARING`; teste privado não equivale a oferta paga ou publicação.
- `docs/contracts/couple-dossier-lab.md`: sem medição, tokens, latência, custo e recibo ficam nulos. Uma fixture estrutural não é resposta de modelo nem interpretação completa.
- Integração P01 em `C:/ATVNA/.worktrees/p01-atv-mais-20261104/docs/contracts/atv-plus-commercial.md`: política `atv-plus-commercial/1`; percentuais digitais Essencial 10%, Ampliado 20%, Premium 30% são **simulações** até aprovação de custos, piso e sustentação. Usa a melhor condição única a partir do preço regular; exclui frete e assinatura ATV+, não soma cupom/promoção/benefício. Revalida no servidor no checkout e na confirmação. O contrato P01 é evidência local de integração, não publicação ou ativação comercial.

Não foi encontrada nessas fontes autorização de preço para os onze IDs novos. `PriceVersion` no domínio define o formato e vigência, mas uma interface não constitui registro `ACTIVE`. Nenhum valor de teste, fixture, desconto simulado ou preço de outra oferta deve virar preço destes lançamentos.

## Matriz de decisão

| IDs | Preço regular | Geração e custo | Provedor e entrega | Condição de membro |
| --- | --- | --- | --- | --- |
| `wedding-date-map`, `ex-tarot`, `love-restart-map` (estreia) | Pendente de proposta numérica fundada em custos e aprovação. | Cálculo factual local e composição E2 por corpus local versionado, sem modelo externo; custo de CPU/infra/operação ainda não medido por produto. Método/entrega conservam seus gates próprios. | Cadastro real de oferta, vínculo de preço e entrega homologada precisam de comprovação própria. | Simular somente; não prometer benefício disponível. |
| `sexuality-map`, `intimacy-map`, `emotional-reactions-map` | Mesmo bloqueio. | Mesmo bloqueio; entradas adultas/privadas não constituem evidência de leitura. | Mesmo bloqueio. | Mesmo bloqueio. |
| `financial-blocks-tarot`, `hidden-talent-map`, `ascendant-style` | Mesmo bloqueio. | Mesmo bloqueio; calculadora gratuita não tem preço a reutilizar. | Mesmo bloqueio. | Mesmo bloqueio. |
| `conversation-timing`, `cohabitation-map` | Mesmo bloqueio. | Mesmo bloqueio; não reutilizar custo de semana ou sinastria sem medição. | Mesmo bloqueio. | Mesmo bloqueio. |

`launch-metadata.json` registra os onze com `regularMinor=null`, custos e piso `null`, moeda BRL, compra individual e orçamento autorizado de novas despesas igual a zero. `null` significa desconhecido/pendente, nunca preço gratuito ou custo zero. O estado remoto das ofertas não foi inspecionado por este levantamento; cadastro não comprovado não é prova de inexistência no provedor.

## Proposta concreta de cálculo

Simular em centavos inteiros, por produto e por versão de entrega. Para um preço regular aprovado `P`, gerar cenários de venda regular e digitais de membro: `0,90P`, `0,80P`, `0,70P`, com a regra de arredondamento do serviço comercial P01. Não inventar outra regra no front-end. Confrontar cada um com promoções ou cupom elegíveis e usar a melhor condição única validada pelo servidor.

Para cada cenário, calcular:

`contribuição = valor cobrado − taxa efetiva da plataforma − geração − entrega − reserva aprovada de suporte/reembolso`

O cenário só passa se todos os componentes tiverem origem e vigência, se o resultado alcançar o piso de contribuição aprovado e se não depender de gasto fixo proibido. A taxa efetiva deve vir do contrato/conta oficial aplicável à oferta; não foi preenchida uma taxa atual genérica. A edição atual usa geração factual local e composição determinística por corpus local (`apps/web/src/lib/trials/launch-reading.ts`, proveniência `externalModelCalled: false`): medir CPU, latência, infraestrutura e operação, sem exigir tokens ou recibo de IA inexistente. Modelo/versão, tokens de entrada e saída, moeda/câmbio e recibo só se aplicam quando houver chamada real de modelo em outra edição. Entrega web pode usar infraestrutura existente, mas isso não prova custo marginal ou capacidade infinita. Suporte, reembolso e piso são decisões de negócio a registrar, não zeros automáticos. O levantamento detalhado está em [pricing-evidence.md](pricing-evidence.md).

A recomendação executável enquanto os componentes faltam é manter fichas e preparação gratuitas na infraestrutura autorizada, sem ativar geração paga, preço público, cobrança ou benefício financeiro. Não propor um número arbitrário para preencher a tabela. A escolha de preço se torna concreta quando a mesma planilha/matriz contiver todos os cenários acima e uma decisão aprovada por produto.

## Fechamento verificável antes de cobrar

1. Homologar o método e a entrega dos três primeiros, depois dos oito restantes; medir pelo menos o fluxo representativo e registrar fatos, qualidade, custo, latência e falhas. A amostra editorial fictícia não serve como medição.
2. Registrar componentes financeiros, fontes, vigência e piso; testar a contribuição nos três níveis de membro e na melhor condição única. Se o piso falhar, revisar preço ou elegibilidade sem prometer cobertura universal.
3. Registrar versão de preço aprovada, vínculo da oferta e disponibilidade real. Servidor valida identidade, janela de benefício, condição elegível e valor final; cliente não informa nível ou preço autoritativos.
4. Homologar compra/entrega/revogação/idempotência pelos gates existentes e manter as flags de cobrança/publicação fechadas até as provas. O contrato P01 exige oferta real, preço positivo revisado e flags explícitas; não ativar por ter criado uma ficha.
5. Na interface, informar preparação de forma objetiva. Formulário salvo recebe recibo de preparação; não exibir “mapa pronto”, cartas sorteadas ou leitura entregue sem fatos e homologação.

Não resta pesquisa genérica de preço neste levantamento: os bloqueadores são dados financeiros e gates específicos acima. A execução local pode avançar catálogo, formulário, persistência e testes sem convertê-los em autorização de venda.
