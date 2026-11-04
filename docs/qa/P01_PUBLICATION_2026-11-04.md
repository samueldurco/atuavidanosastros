# P01 — apresentação e base comercial ATV+

RUN_ID `ATV-20260902-170644Z-01A0630F`. Responsável pela integração: P01. Base conferida `52a759df453ba21ae40f322484ca332a70907d93`; branch `codex/p01-atv-mais-20261104`. Janela de publicação reservada no log comercial canônico pelo evento `P01.04.01`.

## Resultado preparado

Página `/atv-mais` com três níveis e prazos de 3, 6 e 12 meses, exemplos estruturais das edições, cadastro privado e calendário. A próxima Revolução Solar é devida imediatamente após confirmação da compra e dos dados/canal, inclusive no trimestral quando o aniversário ultrapassar a vigência. As demais previsões seguem datas futuras. O histórico da avaliação privada anterior foi preservado.

Direitos financeiros, lifecycle, fila idempotente e contrato de adapters estão implementados. A condição de membro usa a mesma regra no servidor em catálogo, produto, carrinho e checkout: uma única melhor condição, com frete e assinaturas excluídos. Os percentuais seguem como simulações internas sem preços pagáveis ou anúncio público.

## Validações locais

- `pnpm check`: aprovado, incluindo Svelte com zero erros e zero avisos. `pnpm lint`: aprovado.
- Helper comercial: 43/43; regra de preço: domínio 8/8 e servidor 23/23; webhook Hotmart: 7/7; release gate: 19/19.
- Núcleo comercial: foco final 12/12; banco comercial 2/2 e financeiro 5/5 mais recompra após estorno 1/1. A CI deve repetir a suíte completa com as últimas asserções SQL.
- Banco anterior completo: 171/171, antes da inclusão dos oito novos casos P01.
- E2E local do build Cloudflare: 2/2, incluindo apresentação fechada, nove combinações de oferta, CSRF, acessibilidade e preservação da área privada. Revisão visual em 390 e 320 pixels sem transbordamento.
- A primeira execução unitária completa foi interrompida após falhas de prazo em renderização PDF durante carga concorrente. O foco isolado passou 15/16: producer 9/9 e formatos 6/7; o Dossiê retornou `dossier_scope_render_failed` em 14,4 segundos neste Windows de 8 GB. O renderer não foi alterado por P01. Não constitui aprovação da suíte completa; a CI completa do candidato é obrigatória antes da integração.

Logs locais completos em `test-results/p01/` (ignorados pelo Git). Preflight final aprovado 19/19. Migration revisada por dois responsáveis: base hospedada de 19 migrations, 32 colunas necessárias presentes, SHA256 `73cf089204c374c562d273bed83f4697a5a14f914c9a9b5c82cd405102562818`. A evidência hospedada final pertence ao log comercial canônico, com SHA, PR, CI, migration e deployment reais; esta preparação não comprova publicação.

## Limites de ativação

O proprietário confirmou que ainda não definiu os nove preços. Ofertas, termos, geração, canal e flags comerciais permanecem fechados. Sem cobrança, compra real, envio de mensagem ou contratação de serviço pago nesta execução.

Faltam preços e termos aprovados, custos/pisos de margem e integração comercial para descontos, acesso autenticado Hotmart, canal WhatsApp homologado com credencial válida e pipeline privado hospedado. O motor solar e o adapter precisam da homologação que comprove o primeiro retorno estritamente futuro, PDF aprovado, confirmação real do canal, recuperação e conciliação. O banco hospedado sem pipeline deve permanecer bloqueado com `pipeline_unavailable`.

As verificações sintéticas comprovam contratos locais, não compra, interpretação aprovada, mensagem recebida ou entrega comercial real. A publicação autorizada é a apresentação fechada e sua estrutura, com estes bloqueios registrados.

Referências: [contrato de integração](../contracts/atv-plus-commercial.md), [núcleo](P01_SUBSCRIPTION_CORE_2026-11-04.md), [preço de membro](P01_MEMBER_PRICING_2026-11-04.md), [auditoria de infraestrutura](P01_COMMERCIAL_READINESS_2026-11-04.md).
