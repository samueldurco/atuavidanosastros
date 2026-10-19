# Previsões de Dinheiro e Carreira — 30 Dias

Contrato aditivo da arquitetura aprovada em 15/10/2026. ID novo: `career-forecast-30d`. Não substitui o cálculo nem o histórico de `direction-journey`. O mesmo período móvel passa a atender os novos pedidos de `personal-calendar`.

## E1 — entrada, entrega e limites

- Entrada: nascimento completo, consentimento, contexto opcional e `forecastPeriod: rolling-30-days`. O servidor privado ancora `targetDate` na data UTC da primeira geração; tentativas repetidas conservam a entrada salva.
- Período: 30 datas consecutivas, início incluído e fim excluído. Os instantes pertencem à escala UTC explicitada no leitor. Cruzamentos de mês, ano e fevereiro bissexto não alteram a duração.
- Marcos opcionais são relatos do usuário, limitados às 30 datas; não alteram o céu calculado.
- Entrega: síntese, pano de fundo, calendário com as 30 datas, seis grupos de cinco dias, revisão, método, referências, diagrama do nascimento e dos trânsitos observados e PDF equivalente. A seleção pode deixar datas sem destaque.
- Carreira trata de recursos, rotina ou direção profissional conforme o contexto. O calendário geral também admite foco em relacionamentos, trabalho ou vida pessoal. Os dois produtos não prometem resultados, rendimentos, promoções, intensidade emocional nem decisões de investimento.
- Pagamento e publicação comercial não são habilitados. O registro do workflow continua bloqueado; o motor novo exige opt-in privado explícito. E5, avaliação do proprietário, permanece separado da aprovação técnica privada.

## E2 — cálculo e proveniência

O motor conserva nascimento, casas e posições natais, além de 120 observações do céu: 00h, 06h, 12h e 18h UTC de cada data. A projeção compara dez corpos em trânsito com dez receptores natais, usando conjunção, sextil, quadratura, trígono e oposição até 2°.

Uma janela reúne observações consecutivas dentro do limite. Entrada é a primeira observação dentro dele, quando há observação anterior fora. Saída é a primeira observação posterior fora. Maior aproximação é o menor afastamento amostrado estritamente interior; fronteiras do período não viram picos artificiais. Janelas presentes no período inteiro ficam no pano de fundo. Esses horários não são instantes exatos de cruzamento ou perfeição: a resolução demonstrada é de seis horas.

Versões novas: `atv-thirty-day-calculation/1.0.0`, `atv-thirty-day-six-hour-samples/1.0.0`, `atv-private-thirty-day-synthesis/1.0.0` e política `atv-thirty-day-observed-major-aspects/1.0.0`. Fonte preservada: Caelus 0.24.1 / adaptador ATV v3, precisão marcada como experimental, referencial geocêntrico aparente eclíptico da data. A implementação não demonstra nova precisão astronômica nem modifica esse estado.

A compatibilidade da fonte usa sua identidade estável; avisos específicos do nascimento IANA ou da amostra UTC continuam preservados, mas não tornam fontes iguais artificialmente incompatíveis. O validador recompõe a projeção canônica, verifica 120 observações, intervalos, fonte, fatos natais, eventos, datas e entrada.

## E3 — seleção e texto

Para carreira, os contatos elegíveis atingem receptores nas casas 2, 6 ou 10, ou Sol, Mercúrio, Vênus, Marte, Júpiter ou Saturno natais. A pontuação prioriza a casa do tema (+4), seus corpos (+3), trânsito que não seja lunar (+1) e proximidade angular (0 a 1). A maior aproximação observada soma +2. O limiar do período é o maior entre 5 e seu percentil 75. Cada data admite até dois contatos de janelas distintas; não existe preenchimento obrigatório. O pano de fundo seleciona no máximo três janelas do período inteiro com pontuação de pelo menos 5.

Essa pontuação organiza atenção simbólica, não probabilidade de um acontecimento. Mudar o contexto pode mudar seleção e interpretação, mas não posições ou amostras. Mudar o nascimento deve mudar os receptores e as hipóteses quando os fatos mudarem. Cada janela selecionada recebe interpretação uma vez; as etapas seguintes remetem à primeira data e explicam somente a nova observação. Frases sobre o contexto e os marcos permanecem identificadas como relato.

O revisor privado verifica projeção canônica, fatos cobertos, escolhas do plano editorial, hipóteses, limitações e promessas proibidas. Não depende apenas da presença de IDs. Alterar conteúdo, seleção, fatos ou proveniência invalida a aprovação.

## Compatibilidade

Pedidos históricos de `personal-calendar` sem `forecastPeriod` continuam usando o mês civil e as versões existentes. Compositores e registros históricos não são migrados silenciosamente. `direction-journey` mantém sua entrega civil própria. O novo ID entra no catálogo de 19 ofertas, no retorno de autenticação, no runtime privado, no design, no leitor e no PDF; aprovação, autorização, quotas e acesso continuam verificações separadas.

Evidências locais: `docs/30-execucao/evidencias/CAREER_FORECAST_30D_2026-10-15.md`.
