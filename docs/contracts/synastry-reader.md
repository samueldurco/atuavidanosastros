# Sinastria — projeção privada e PDF

WU163 / `atv-product-delivery/1.14.0` / `atv-pdf-export/1.2.0`. O catálogo exige web e PDF. A base, a política experimental e o perfil editorial permanecem nos contratos `synastry-calculation.md` e `synastry-editorial.md`.

A projeção captura e valida os fatos originais antes da avaliação assíncrona. Preserva as dez posições da Pessoa A, as dez da Pessoa B e todos os cem pares, em dez grupos canônicos por corpo de A. Não seleciona apenas aspectos presentes nem os pares mais fortes. Cada grupo mantém os IDs e as referências originais; o leitor oferece rótulos humanos sem recalcular geometria.

As dezenove hipóteses seguem os papéis canônicos do perfil, com título e ID próprios. As nove dimensões são comunicação, vínculo, desejo, segurança, autonomia, conflito, reparação, negociação e crescimento. A síntese conserva o texto, as hipóteses citadas e exatamente três perguntas exploratórias. Contexto consentido tem grupo relatado próprio; ausência de contexto permanece literal e não cria um fato.

Com contexto há 121 fatos e 33 seções; sem contexto há 120 fatos e 32 seções. Somente Sinastria admite até 121 referências por seção e 300 fontes no parser web. Os limites dos demais produtos permanecem iguais. Os limites comuns da entrega continuam com 40 seções, 20.000 caracteres por seção e 90.000 bytes de conteúdo.

O leitor e o PDF preservam a leitura integral, origem, limites, histórico e versões. Estados pendente, revogado ou falho ocultam conteúdo e formatos. Compartilhamento, email, downloads e reprocessamento continuam subordinados às autoridades existentes. Consentimento para os dados do par não autoriza compartilhar a leitura nem comprova identidade ou autorização bilateral.

O PDF 1.2 usa cache de métricas por fonte, tamanho e texto dentro de cada exportação, evita medir avanços não utilizados e mantém a quebra por caracteres para palavras longas. Nenhum texto ou fonte é omitido; os budgets continuam em 120.000 caracteres, 40 páginas, 8 MB e cinco segundos por renderização.

A persistência admite PDF 1.0, 1.1 e 1.2, recuperando os bytes e o digest da versão gravada sem regenerá-la. A migração `20260929020000_product_pdf_renderer_1_2.sql` amplia somente a lista de renderers PDF e conserva proprietário, revisão, digest, gates, quotas e idempotência. Reaplicar a migração anterior interrompe novas escritas 1.2 e conserva sua recuperação; reaplicar a nova restaura a escrita. O gate de artefatos permanece desligado por padrão.

A projeção é candidata à revisão independente; não emite aprovação, entitlement ou release. A nova versão participa do digest e exige revisão correspondente. Política de aspectos não aprovada, precisão não certificada, estabilidade desconhecida, score nulo e ausência de eventos permanecem explícitos. Não infere sentimentos, intenção, gênero, comportamento, cronologia ou destino do par.

Fixtures sintéticas locais exercitam a estrutura completa e os estados privados; não satisfazem interpretação útil aprovada, autoridade editorial real, sessão hospedada ou liberação. O exemplo PDF de 36 páginas comprova integridade e layout desse conteúdo sintético, sem garantir duração ou extensão de um editorial futuro. Ver [QA e aceite delimitado](../qa/SYNASTRY_READER_2026-09-29.md).
