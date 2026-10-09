# Horóscopo público — fatos e aprovação

RUN_ID `ATV-20260902-170644Z-01A0630F`. RECON-20, 08/10/2026. Complementa `horoscope-calculation.md` e `public-editorial-seo.md`; não altera o horóscopo natal privado nem a autoridade editorial.

## E1 — cálculo geral

`atv-public-horoscope-samples/1.0.0` calcula os dez corpos canônicos pelo Caelus 0.24.1/MIT, adaptador v3, zodíaco tropical e referencial geocêntrico aparente da data. Preserva contrato, manifesto de dados e proveniência reais. A coordenada de referência 0/0 não representa o leitor; casas e ângulos desse cálculo são descartados.

Períodos em UTC: dia civil, semana iniciada na segunda e mês civil. Início inclusivo, fim exclusivo; datas reais no domínio nominal 1900–2099. Um período que ultrapasse esse domínio é recusado. Amostras de seis horas contêm instante, dez longitudes e máscara de retrogradação. Uma composição exige origem uniforme e o instante correto de cada amostra; respeita cancelamento.

Em cada amostra, os 45 pares do céu são avaliados pela política `atv-public-horoscope-major/1.0.0`: conjunção, sextil, quadratura, trígono e oposição, todos com orbe nominal de 2°. São fatos gerais do céu, sem matriz trânsito × natal.

## Seleção explícita

`atv-public-sky-relevance/1.0.0` conserva todos os candidatos e escolhe até seis. Aspectos recebem 70 pontos, mais 20 quando ambos os corpos são Júpiter ou posteriores, mais dez quando não envolvem Lua, mais cinco vezes a diferença entre 2° e o orbe. Mudança de signo recebe 115 pontos, ou trinta para a Lua; mudança de movimento recebe 120. Desempate estável pelo identificador. Reserva um movimento rápido e um de fundo quando ambos existem. Não inventa candidatos para atingir três.

Um aspecto recorrente guarda primeira/última amostra observada e a amostra de menor orbe. Isso não certifica presença contínua. Mudanças de signo/movimento guardam o intervalo entre duas observações; não são instantes exatos de ingresso ou estação. A seleção organiza uma futura síntese editorial com tema central, movimentos rápidos, fundo e próximos dias; não transforma pontuação em probabilidade de acontecimentos.

## Integridade e publicação

O snapshot inclui grade completa, candidatos, seleção, políticas, limites, cobertura e proveniência. O validador refaz a projeção e recusa mutações desses elementos. O SHA-256 usa JSON canônico com chaves ordenadas por UTF-16 e ordem de arrays preservada.

Para admitir um documento `horoscope`, o registro exige exatamente um snapshot válido cujo digest, motor, versão e cobertura coincidam com os campos assinados do documento. Metadados sem bytes, fatos malformados, duplicatas ou divergências são recusados. O registro `horoscope-facts.json` permanece vazio até haver fatos e aprovação legítimos. Fixtures e chaves sintéticas existem somente nos testes.

Essa verificação não autentica sozinha uma origem externa nem homologa precisão. Permanecem a revisão independente e a assinatura Ed25519 por autoridade habilitada, os gates editoriais, visuais e de produção. A política automática atual cobre guias educativos permanentes; não autoriza previsão datada. Nenhuma previsão foi admitida por esta WU.

## Limites e aceite

Precisão integral experimental, ainda não homologada. A grade pode omitir contatos entre amostras; a última observação precede o fim do período. Não certifica aplicação, separação, duração ou eventos exatos. UTC não equivale ao dia local de todos os leitores. Os mesmos fatos gerais servem aos doze signos; uma interpretação por signo depende de método editorial explícito e aprovado.

E1 possui implementação e validação locais; homologação permanece pendente. E2 exige leitura datada original e autoridade aplicável. E3/E4 ainda exigem navegação dos doze signos, períodos, histórico e alertas consentidos, além da liberação hospedada. E5 exige percurso real e aceite correspondente. Formato público web, sem PDF.
