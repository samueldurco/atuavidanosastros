# Revisão independente do corpus recorrente — v3

Revisor: `/root/temporal_final`. Autor: `/root/horoscope_path`.
Decisão: **APROVADO_AUTOMATICAMENTE — 89/100** no escopo abaixo. Este parecer não é assinatura, admissão, aprovação humana ou liberação de produção.

## Escopo fechado

Foram conferidas as 36 leituras congeladas em `recurring-v3-daily`, `recurring-v3-weekly` e `recurring-v3-monthly`: 12 signos por período. A leitura utilizou `corpus-reading-index-v3.json`: as 534 frases únicas de títulos, descrições e parágrafos foram lidas integralmente; frases repetidas conservam referências exatas às leituras em que ocorrem. Nenhum trecho interpretativo foi resumido ou omitido pelo índice. Método, fontes, autoria e metadados foram confrontados com o compositor e o contrato vigente.

Corpus: `atv-public-horoscope-relational-corpus/1.0.0`, SHA-256 `ec287627f895e4ddec4345cf58ddc7325f75e10b28eebf06c3a9ab9c91b28e13`.
Algoritmo: `atv-public-horoscope-composition/1.0.0`, SHA-256 `0b7f61a5605f7d947c8b79f506ab5ac946d4a2cecc9dcea07d15b2ed62a001ef`.
Modo: `reviewed-corpus-and-runtime-verification`.

A política datada está explícita no contrato `public-horoscope-dated-automation.md` e na ADR 0010. A rubrica editorial é aplicada à revisão independente do corpus completo e compositor, com verificação factual e recomposição obrigatórias por lote. Não se apresenta a regra de conteúdo perene como autorização implícita de publicação datada. Os pareceres anteriores ficam separados; nenhuma aprovação foi transportada automaticamente.

IDs, revisões e digests canônicos dos 36 documentos e alegações constam de `corpus-independent-checks-v3.json`, em `batches[].documents[]`, e do parecer JSON. O arquivo factual contém também os digests dos três escopos, fatos e composição.

## Verificação factual

Em 2026-10-20T10:40:56.101Z, `check-corpus-independently.mjs` reproduziu os lotes com o adaptador autorizado do Caelus: 4, 28 e 124 linhas de posições. Verificou seleção, setores solares por fórmula independente, relações angulares selecionadas, coberturas, alegações e recomposição integral. Resultado: **36/36 documentos coerentes, zero divergências e 33 adulterações rejeitadas**.

Os negativos abrangem conclusão reescrita, setor inválido, cobertura adulterada, falsa revisão humana, digest de signo ausente, fatores insuficientes, signo/corpo/relação/movimento desconhecidos e seleção composta apenas por fatores de fundo. Isso verifica consistência com o motor utilizado; não afere sua precisão contra outra efeméride.

A grade de seis horas é declarada. Transições mostram data e hora das duas amostras, sem atribuir ao intervalo um instante exato. Setores são simbólicos a partir do signo solar, sem nascimento individual ou casas natais. Relações lentas são contexto e não recebem uma novidade diária fictícia.

## Domínio e continuidade

O corpus finito inclui 45 pares de corpos, 12 contextos de setor, aplicações específicas por corpo, movimentos direto/retrógrado e 28 consequências próprias para pares de movimentos. Foram examinados esses conteúdos e os ramos do compositor. As 28 consequências acrescentam relações reconhecíveis, como entendimento/preferência, promessa/condições, compromisso/liberdade e cuidado/limites.

`recurring-v3-domain-checks.json` enumera **4.476 casos sintéticos**: 2.700 combinações de pares/aspectos/setores, 192 movimentos, 240 passagens e 1.344 sínteses. Foram conferidas composições representativas dos cinco tipos de aspecto e dos 16 movimentos, além das 28 consequências em fonte. Os 104 exemplos sintéticos não receberam todos leitura integral; não são previsões reais nem recebem aprovação individual. Sua função é verificar domínio e encaixes. PASS mecânico não substituiu leitura editorial.

O autor registra 9/9 testes de composição com replay mensal obrigatório e 21/21 testes de arquivo. `recurring-v3-schedule-checks.json` registra 84 leituras calculadas e recompostas no bootstrap e nas viradas de semana de 26/10 e mês de 01/11. Esses 84 textos não foram lidos integralmente e não são apresentados como aprovações editoriais; sustentam continuidade técnica em datas distintas.

Combinações fora do domínio, ausência de dois fatores admissíveis ou adulteração do texto devem falhar. Ausência de suporte não autoriza inventar relevância. Novos lotes exigem fatos, cobertura, alegações, identidade e texto recomposto coerentes com estes digests. A recorrência não tem custo por chamada de geração, mas continua sujeita a validação, assinatura finita, admissão e gates de publicação.

## Profundidade e escala

No dia, contatos e setores modificam situações, custos e possibilidades. A dificuldade é desenvolvida como consequência da mesma disposição que oferece um recurso. Em Gêmeos, por exemplo, exigências da rotina podem reduzir espaço para estudo; o contato seguinte acrescenta a dificuldade de explicar o que se sente. O leitor recebe a relação interpretada.

Na semana, uma mudança de signo observada altera o contexto da questão, enquanto o fator lento mantém o pano de fundo. A síntese diferencia continuidade e mudança. Os intervalos evitam transformar passagem observada em horário de acontecimento pessoal.

No mês, Mercúrio e Vênus no mesmo setor têm desenvolvimento diferente. Mercúrio trata do que foi dito, compreendido ou omitido; Vênus, do valor da troca e da diferença entre afeição, hábito e receio de desagradar. A conclusão acrescenta uma relação: entender os termos de uma escolha não implica desejar mantê-la; uma preferência modificada pode exigir outro acordo. A passagem posterior acrescenta contexto e preserva a ordem temporal.

As leituras permanecem coletivas e simbólicas, sem inventar biografia, elogiar para obter concordância ou impor exercícios para completar a interpretação. A variação entre signos acompanha setores e situações; a variação temporal acompanha fatos e escala disponíveis. Reutilizar relações reais entre dia e semana não justifica fabricar diferenças.

## Correções da v2 verificadas

- **C1:** a síntese deixou de concatenar nomes de funções. As 28 consequências relacionais estão no corpus e o terceiro fator modifica a interpretação.
- **C2:** corrigidos encaixes de custo, prática e necessidade no domínio. Não persistem “menos espaço para o espaço”, vírgulas entre sujeito e verbo nem “conservar decidir”. Cinco aspectos e 16 movimentos foram conferidos em amostras representativas.
- **C3:** intervalos intradiários mostram horas UTC, preservando a distinção entre amostra e instante exato.
- **C4:** a descrição reconhece setor compartilhado sem anunciar relação da área consigo mesma.

## Linguagem e valor

Persistem expressões recorrentes como “o ajuste interpretado”, “condição compreensível” e “nos assuntos que envolvem”. Alguns encaixes de infinitivos são gramaticais, mas menos naturais que frases escritas para uma situação. Isso reduz linguagem e variedade, sem substituir a interpretação por abstrações no conjunto revisto.

Há espaço para ampliar situações e reduzir o texto metodológico. Não foi identificado defeito bloqueante restante no domínio revisto. Aprovação não promete satisfação de todo leitor e não substitui teste do proprietário na experiência hospedada.

## Fontes, direitos e identidade

O corpus é redação original elaborada por IA no projeto. Não incorpora imagens, trechos ou identidade visual da Personare. A referência do usuário orienta clareza e continuidade. A comparação local não certifica universalmente ausência de plágio.

Os fatos usam Caelus identificado no pacote factual, fonte primária `https://github.com/heavyblotto/caelus`, licença MIT. O cálculo não é apresentado como comprovação científica dos significados. Não há promessa clínica, financeira ou de acontecimentos inevitáveis.

A autoria identifica ATVNA e informa corpus elaborado e revisto por IA. Não há credencial humana fictícia. O contrato declara revisão independente do corpus congelado e verificação por lote, sem prometer nova leitura humana ou editorial integral a cada data. A atualização operacional de duas tentativas, mutex e idempotência não altera os digests interpretativos. Os exemplos congelados conservam a cópia anterior dessa documentação operacional; os lotes de publicação devem carregar o contrato vigente.

## Resultado e limites

Passam os oito critérios impeditivos: escopo, alegações, direitos, identidade, segurança, originalidade, ferramentas e integridade. Pontuação: intenção **18/20**, valor **17/20**, precisão **15/15**, confiança **10/10**, linguagem **7/10**, jornada **8/10**, metadados **9/10**, manutenção **5/5**. Total **89/100**, acima de 85, cada critério acima do mínimo individual.

Não foram certificados precisão astronômica externa, renderização visual, acessibilidade, SEO hospedado, execução da agenda em produção ou ausência universal de semelhança externa. Este revisor não criou chave, assinatura, admissão ou liberação hospedada.

Alteração do corpus ou algoritmo invalida o vínculo deste parecer. A aprovação vale para estes bytes e este modo finito; cada publicação depende dos gates de integração, verificação por lote e liberação. Estado: `PENDING_INTEGRATION_AND_RELEASE_GATES`.