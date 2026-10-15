# Career forecast / calendário móvel — evidência de 15/10/2026

Escopo: `career-forecast-30d`, novos calendários de 30 datas, catálogo explícito de 19 ofertas, nove ferramentas e definições ATV+ Essencial/Ampliado/Premium. Worktree: `arquitetura-integral-20261015`. Revisão segundo `atv-aprovar-interpretacoes`; contrato E1 em `docs/contracts/career-forecast-thirty-days.md`. Arquitetura comercial em `docs/contracts/architecture-offers-20261015.md`.

## Resultado por etapa

| Etapa | Evidência | Estado |
| --- | --- | --- |
| E1 | Entrada, período, entrega, método, compatibilidade e limites no contrato aditivo | Definido |
| E2 | Motor opt-in, nascimento completo, 120 observações, projeção recomputável, fonte preservada e casos de adulteração | Validado localmente |
| E3 | Seleção temática, plano editorial ligado aos fatos, contrafactuais e recusa de promessas sem suporte | Validado localmente |
| E4 | Leitor e PDF sintéticos, calendário/diagrama, testes de aprovação privada e exportação | Validado localmente; integração visual responsiva e hospedada acompanhada pela execução principal |
| E5 | Uso e avaliação pessoal do proprietário | Pendente; não substituído por testes automáticos |

Nenhum gate de publicação pública, pagamento ou modelo foi relaxado. A fonte continua experimental. Não há declaração de precisão superior à resolução de seis horas nem de validação empírica de previsões astrológicas.

## Provas funcionais e contrafactuais

- `thirty-day.spec.ts`: 15 casos, incluindo quatro limites de período (virada de mês, bissexto, virada de ano e limite da faixa suportada), opt-in fechado, proveniência IANA, 120 observações, alteração de contexto, alteração de nascimento, datas vazias/esparsas/densas, adulterações e PDF completo.
- Contexto diferente altera prioridades e texto, conservando posições e amostras. Nascimento diferente altera receptores e eventos, conservando o céu do mesmo período.
- Amostras estacionárias produzem zero destaques diários e uma leitura aprovável; não há preenchimento de datas por quota.
- Recusas: amostra removida, horário deslocado, fonte inventada, data alterada, fatos natais removidos, seção sem fatos, seleção editorial removida e promessa de promoção garantida.
- Cada janela é interpretada uma vez; novas etapas remetem à primeira data. O teste conta interpretações e referências em função das janelas realmente selecionadas.
- O gráfico permite o primeiro e o último dia reais; as seis faixas editoriais cobrem todas as datas. O PDF conserva calendário, gráfico e conteúdo, e mantém cada bloco diário junto quando cabe em uma página.
- As suítes do calendário histórico e de composição legada continuam exercitando as versões anteriores. O novo ID não é artificialmente submetido ao compositor histórico anterior à existência desse produto.

## Execuções guardadas em `test-results`

| Arquivo | Resultado |
| --- | --- |
| `domain-catalog.log` | 51 testes passaram: domínio, catálogo e regras ATV+ |
| `career-worker.log` | 19 testes passaram em três arquivos do worker |
| `career-domain-check.log` / `career-worker-check.log` | Verificação TypeScript passou |
| `catalog-calendar-baseline.log` | 57 testes passaram em três arquivos |
| `career-private-final.log` | 86 testes passaram: autenticação, entregas privadas, capas e novo período |
| `career-thirty-day-final.log` | 42 testes passaram após revisão de repetição/paginação: novo período, calendário histórico e capas |

Esses totais são de execuções específicas, com sobreposição; não devem ser somados. A suíte de E4 usa dados fictícios, sem dados pessoais reais. O check integrado é executado pela frente principal após a conclusão dos arquivos compartilhados do Diário.

## Artefato visual

`test-results/career-forecast-30d/career-forecast-30d.json` preserva a entrada, fatos, seleção, leitura e aprovação. `career-forecast-30d.pdf`, na mesma pasta, é a exportação sintética de 15 páginas A4 inspecionada em renderizações PNG; `contact-sheet-final.png` reúne todas as páginas. Não faz parte do catálogo público nem afirma aprovação do proprietário.

A amostra começa em 15/10/2026, termina em 13/11/2026 e exclui 14/11/2026. O último instante amostrado é 13/11 às 18h UTC. Contém 783 fatos, 118 janelas calculadas, 308 eventos observados e 38 destaques selecionados. Política privada: `atv-private-interpretation-review/4.0.0`. O PDF usa as famílias visuais já aprovadas; o novo produto possui entrada própria no bundle de capas, sem fallback não declarado.

## Relação com a auditoria temporal de 14/10

A auditoria em `editorial-reading-remediation/docs/30-execucao/evidencias/AUDITORIA_LEITURAS_TEMPORAIS_2026-10-14.md` orientou duas dependências concretas: identidade estável da fonte entre nascimento IANA e observações UTC, e seleção temporal capaz de deixar dias sem destaque. A nova política aditiva aplica limiar relativo e máximo de dois contatos diários; o calendário mensal histórico conserva a política antiga. Não foram declaradas corrigidas as demais questões da Leitura da Semana nem alteradas suas versões.

## Integração

O servidor privado e a migração do novo ID são da frente de integração: ancoragem UTC, retomadas idempotentes, autorização do proprietário e quotas. Os arquivos compartilhados `reading.ts` e `trial-calculation.ts` também recebem o Diário de Sonhos. A aprovação privada valida uma entrega salva; não libera automaticamente cobranças, acesso público ou planos pagos. A execução principal registra a validação hospedada e o endereço final.
