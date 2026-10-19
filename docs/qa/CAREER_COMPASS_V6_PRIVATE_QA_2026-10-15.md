# Carreira — revisão privada do motor e das amostras fictícias

RUN_ID: ATV-20260902-170644Z-01A0630F
Data: 15/10/2026
Estado: **implementação e validação locais; emissão e publicação da nova leitura bloqueadas**

## Contratos de produto

O plano mestre §7.2 define a **Bússola de Carreira grátis** como leitura web do signo e grau do Meio do Céu, contribuição pública, ambientes e modos de trabalho possíveis, tensão e três perguntas, com contexto profissional opcional. O candidato atv-career-compass-candidate/1.8.7 continua nesse escopo: não interpreta casas, regentes ou aspectos. O resultado público atual em /bussola-de-carreira calcula e mostra o Meio do Céu e informa que a leitura personalizada está em preparação. O candidato de leitura não está conectado à emissão pública e sempre retorna publication: blocked.

O plano §7.3 reserva Meio do Céu **com regente e casa do regente**, Casas 2/6/10, planetas angulares, aspectos relevantes e entrega web/PDF/áudio elegível ao **Mapa de Propósito & Carreira**, produto pago ainda não homologado. A leitura integral V6 usa parte desses fatores, porém não satisfaz todo o contrato pago. Seus seis PDFs são **fac-símiles privados de um protótipo integral experimental**, não exemplos da Bússola grátis nem promessa de entrega comercial. Os três PDFs da Bússola grátis também são fac-símiles privados da futura leitura web, pois seu contrato de catálogo não inclui PDF.

## Origem e limites da amostra integral

- A base atv-career-compass-full-basis/1.0.1 guarda mapa, posições, ângulos, casas, aspectos e versão do cálculo, sempre em estado experimental e com publicação bloqueada.
- O adaptador privado atv-career-compass-v6-origin/1.0.1 recalcula a base com o provedor instalado, compara snapshots estáveis sem o carimbo calculatedAt, reprojeta os fatos e compõe a leitura. Bases internamente coerentes mas substituídas por outro provedor são rejeitadas. Essa verificação estabelece **consistência do runtime local**, não precisão independente global.
- A composição integral em apps/web/src/lib/trials/reconstruction/compass.ts mantém a base factual rastreável em metadados e escreve a interpretação para o leitor. A revisão automática avalia cada amostra segundo fatos e limites; a aprovação editorial independente e a avaliação pessoal do proprietário são decisões separadas.
- Os seis perfis são fictícios e cobrem ilustração, cerâmica com emprego, liderança, sobrecarga, estudo e nascimento distinto. Cinco compartilham nascimento para isolar o efeito do contexto. O sexto verifica alteração da base natal. Não há dados de compradores.

## Precisão E1: provas delimitadas

O teste independente das seis pessoas confronta posições e cálculos derivados com referências versionadas. O envelope adicional contém **11 épocas de referência JPL entre 1900 e 2099**, 110 posições (erro máximo observado: **13,09 segundos de arco**); 66 dias amostrados de transições de movimento (29 decisões retrógradas e 37 casos próximos à estação tratados como inconclusivos); e 27 casos ERFA em nove datas para ângulos/casas, incluindo recusas polares (erro máximo observado: **0,513 segundo de arco** nos valores comparáveis). O corpus IANA exercita mudanças de horário em Brasil, Nova York, Lord Howe, Apia e Paris sob Node 24.20/ICU 78.3/CLDR 48/tzdb 2026c local.

Essas provas são amostrais. **E1 global permanece bloqueado** até demonstrar precisão e proveniência suficientes em todo o domínio 1900–2099, estações retrógradas, DUT1/IERS, fusos e regras IANA fixados no ambiente hospedado. Nenhuma contagem de comparações derivadas equivale a efemérides independentes adicionais.

## Direção visual e apresentação

A referência vigente é C:/ATVNA/DESING SITE/REDESIGN_COMPLETO_2026-10-14, implementada em docs/DESIGN.md: papel claro, tinta azul profunda, paleta Carreira oliva/ocre, títulos e prosa em Newsreader, rótulos e instruções em Onest, marca estrela/livro preservada e gravura aprovada como arte editorial. A página pública da Bússola preserva essas decisões e coloca os detalhes de provedor e versão numa seção técnica recolhível, mantendo a afirmação metodológica visível.

Os fac-símiles são gerados do JSON do motor, com texto preservado, e passam por extração textual e inspeção de capa, miolo e última página. Cada PDF identifica cenário fictício, protótipo experimental e revisão privada. Arte decorativa não representa fato calculado. A amostra integral congelada contém seis PDFs de oito páginas; a composição-fonte tem SHA-256 0cd6208da55f47a56a0d8de75bd6354ca828e48aa8f47c42b3cb0867aa8d8719. Manifesto e parecer editorial independente registram os hashes dos artefatos finais. Os fac-símiles da Bússola grátis nascem do cálculo, candidato e projeção versionada do leitor web (`atv-product-delivery-career-compass/1.0.0`); grau e minuto aproximados são apenas apresentação, e o fato completo de seis casas decimais permanece na evidência. O relógio de proveniência é fixado somente no gerador privado para reproduzir hashes das simulações; a execução real usa o cálculo persistido.

## Validação local e decisão

- Bússola grátis: 51 testes do candidato e 70 testes focados de candidato, leitor e entrega passaram; o worker passou na checagem de tipos. Três casos fictícios contrastantes foram recalculados diretamente do candidato 1.8.7 e da projeção do leitor. O caso de mudança de cidade agora usa a condição declarada nas hipóteses, síntese e perguntas, sem presumir vaga ou empresa; a negação dessa intenção também foi testada. Os três PDFs privados têm duas páginas, extração textual integral, três perguntas por perfil e 21 blocos de origem verificados. O manifesto `output/pdf/atvna-bussola-gratis-simulacoes-manifest.json` registra as versões e hashes.
- Origem integral: 3 testes do adaptador passaram, incluindo base coerente substituída. Seis leituras foram comparadas por digest e conteúdo integral; worker full-delivery 2/2. Web check: zero erros e zero avisos.
- Leitor web E4: a rota local `_spec` renderiza a projeção do candidato 1.8.7 para Ana, Bruno e Lia, com seis seções e MC vinculado ao fato calculado. O preview sinaliza perfil fictício; `publication: blocked` continua no candidato e na entrega. Playwright 15/15: três perfis em 320, 390, 820 e 1440 px, mais estados pendente, revogado e falho. Capturas estáveis em `output/qa/career-reader-e4-1.8.7/`. A verificação de largura não encontrou transbordamento horizontal; downloads e e-mail permanecem indisponíveis nesse preview.
- Referências independentes: envelope temporal e comparador ERFA/JPL passaram nos casos definidos. Isso não remove os bloqueios globais de E1.
- Git diff --check passou. Não houve migração hospedada nem deploy das alterações desta revisão; eventual PR do candidato não equivale a liberação de produto.

| Gate | Estado nesta revisão |
| --- | --- |
| E1 cálculo | Referências independentes amostrais aprovadas; cobertura global e ambiente hospedado pendentes. |
| E2 motor editorial | Candidatos locais e revisão automática; parecer independente das seis saídas integrais finais aprovado apenas para teste privado em `docs/qa/CAREER_COMPASS_V6_INDEPENDENT_EDITORIAL_2026-10-15.md`. |
| E3 persistência e autoridade | Integração candidata preservada; emissão hospedada e sessão real não homologadas. |
| E4 entrega | Leitor web local validado com conteúdo real do motor em 15 cenários de navegador; integração pública ainda bloqueada. PDFs aqui são material privado para o proprietário. Contrato pago integral ainda incompleto. |
| E5 aceite | Avaliação pessoal do proprietário e eventual liberação comercial pendentes. |

Esta WU não aprova automaticamente os outros produtos, ATV+ ou mudança de preço. A próxima implementação seguirá a fila do plano após registrar as provas locais e os bloqueios reais da Bússola.
