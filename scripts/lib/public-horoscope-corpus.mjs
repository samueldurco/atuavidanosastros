/**
 * Editorial source, not astronomical evidence. Changes invalidate corpus review.
 * Solar sectors are symbolic whole-sign topics; they are never natal houses.
 */
export const CORPUS_VERSION = "atv-public-horoscope-relational-corpus/1.0.0";
export const APPLICATIONS = {
  sun: "Quando a escolha envolve {area}, dar uma direção própria significa reconhecer o que você deseja representar naquela situação. Ao {scene}, uma resposta pode parecer correta para todos e ainda deixar sua intenção de fora; {practice} permite que essa intenção encontre uma forma reconhecível.",
  moon: "Nas situações que envolvem {area}, a sensação de segurança pode chegar em outro ritmo que a decisão. Ao {scene}, um desconforto merece cuidado antes de virar uma conclusão sobre tudo; {practice} pode oferecer um contorno para acolher a reação sem entregar a ela toda a escolha.",
  mercury:
    "Nos assuntos que envolvem {area}, a revisão procura a diferença entre o que foi dito e o que cada pessoa entendeu. Ao {scene}, uma condição omitida pode pesar mais do que a quantidade de explicações. O sentido de {practice} depende de tornar essa condição compreensível, para que concordar seja uma escolha informada.",
  venus:
    "Quando a escolha envolve {area}, a pergunta afetiva é o que você deseja continuar oferecendo e recebendo. Um acordo pode estar perfeitamente explicado e ainda não expressar uma preferência importante. {practiceCapitalized} ganha valor quando comporta essa preferência; ceder para manter o vínculo pode parecer generosidade mesmo quando já custa reciprocidade.",
  mars: "Nas situações que envolvem {area}, a revisão distingue uma ação que protege seu desejo de uma reação que apenas responde à resistência. Ao {scene}, insistir com mais força pode reduzir as possibilidades de negociação. {practiceCapitalized} dá um destino ao esforço, sem exigir que cada diferença seja vencida.",
  jupiter:
    "Nos assuntos que envolvem {area}, a revisão distingue uma possibilidade que amplia a vida de uma promessa que aumenta a obrigação de corresponder. Ao {scene}, entusiasmo pode fazer uma escolha parecer maior do que as condições permitem. {practiceCapitalized} dá medida ao crescimento e ajuda a preservar o sentido que o tornou desejável.",
  saturn:
    "Quando a decisão envolve {area}, a revisão distingue responsabilidade de uma cobrança que já não organiza nada. Ao {scene}, um limite pode proteger a continuidade ou proibir toda tentativa de mudança. {practiceCapitalized} torna esse limite compreensível e permite reconhecer o compromisso que ainda faz sentido sustentar.",
  uranus:
    "Nos assuntos que envolvem {area}, a revisão pergunta o que uma alternativa realmente muda. Ao {scene}, abandonar a forma conhecida pode trazer alívio sem abrir uma escolha melhor. {practiceCapitalized} oferece uma experiência com contorno: a diferença pode ser vivida antes de exigir uma ruptura com tudo.",
  neptune:
    "Quando a experiência envolve {area}, a revisão distingue a sensibilidade ao que acontece da imagem que você gostaria de encontrar. Ao {scene}, uma intenção pode ser generosa e ainda pouco clara para outra pessoa. {practiceCapitalized} dá forma a essa intenção, para que a expectativa não precise preencher sozinha o que ficou indefinido.",
  pluto:
    "Nas situações que envolvem {area}, a revisão toca a diferença entre participar de uma decisão e tentar controlar todas as suas condições. Ao {scene}, o receio de perder espaço pode endurecer justamente a troca que precisava mudar. {practiceCapitalized} torna a participação negociável e ajuda a distinguir compromisso de dependência.",
};
export const MOVEMENTS = {
  mercury: {
    retrograde:
      "A revisão recai sobre a maneira de entender e comunicar. Uma conversa pode estar bem explicada e ainda deixar um pedido importante sem nome; retomar o sentido do acordo é diferente de apenas repetir as mesmas palavras.",
    direct:
      "A retomada simbólica envolve dar uma forma comunicável ao que foi reconsiderado. Uma explicação ganha valor quando permite uma resposta clara, sem precisar apresentar como certeza aquilo que ainda está em elaboração.",
  },
  venus: {
    retrograde:
      "A revisão recai sobre o valor que sustenta uma escolha. Continuar por afeição, por hábito ou pelo receio de desagradar são movimentos diferentes; reconhecer essa diferença permite compreender melhor o que você deseja preservar.",
    direct:
      "A retomada simbólica envolve dar consequência a uma preferência amadurecida. Gostar de algo não resolve sozinho os termos de uma troca: o valor reconhecido precisa encontrar uma forma de reciprocidade que possa ser vivida.",
  },
  mars: {
    retrograde:
      "A revisão recai sobre o modo de agir e defender uma posição. A firmeza pode continuar importante mesmo quando a estratégia precisa mudar; insistir no mesmo gesto não é a única maneira de manter um desejo presente.",
    direct:
      "A retomada simbólica envolve transformar intenção em uma ação delimitada. A energia encontra direção quando o primeiro passo esclarece o próximo, sem exigir que toda a situação se resolva num único movimento.",
  },
  jupiter: {
    retrograde:
      "A revisão recai sobre a promessa de crescimento que orienta uma escolha. Um projeto pode continuar valioso e precisar de outra medida; diminuir uma expectativa exagerada pode devolver sentido ao que ainda é possível desenvolver.",
    direct:
      "A retomada simbólica envolve aproximar uma possibilidade maior dos recursos que podem sustentá-la. Ampliar o horizonte ganha consistência quando uma experiência concreta permite ajustar a visão ao longo do caminho.",
  },
  saturn: {
    retrograde:
      "A revisão recai sobre as responsabilidades que passaram a organizar a vida. Um limite pode proteger uma prioridade ou conservar uma exigência antiga; compreender sua função ajuda a distinguir compromisso de obrigação automática.",
    direct:
      "A retomada simbólica envolve dar forma a um compromisso que possa ser sustentado. O critério mais útil é reconhecer o que cabe na responsabilidade assumida e o que precisa continuar sendo negociado.",
  },
  uranus: {
    retrograde:
      "A revisão recai sobre o sentido de uma mudança. O desejo de sair de uma repetição merece uma alternativa própria; trocar de forma sem reconhecer o que se quer preservar pode reproduzir a mesma dependência em outro lugar.",
    direct:
      "A retomada simbólica envolve experimentar uma alternativa com margem para resposta. A liberdade se torna mais concreta quando a mudança abre uma escolha possível, em vez de depender apenas de recusar a forma anterior.",
  },
  neptune: {
    retrograde:
      "A revisão recai sobre imagens, expectativas e ideais. Uma inspiração pode continuar fértil depois que perde uma promessa impossível; distinguir o desejo daquilo que já está claro protege tanto a imaginação quanto os limites.",
    direct:
      "A retomada simbólica envolve encontrar uma forma para algo sensível que ainda não estava bem definido. A inspiração ganha utilidade quando pode conviver com limites e perguntas, sem precisar se transformar numa certeza total.",
  },
  pluto: {
    retrograde:
      "A revisão recai sobre dependências e modos de exercer controle. Uma ligação pode ter valor sem exigir que você detenha todas as respostas; reconhecer o que precisa ser dividido muda a maneira de negociar sua intensidade.",
    direct:
      "A retomada simbólica envolve dar consequência a uma mudança de posição. A profundidade de uma escolha aparece no que ela permite reorganizar, sem transformar cada diferença numa disputa para provar quem decide.",
  },
};
export const METHOD_VERSION = "atv-solar-symbolic-sectors/1.0.0";
export const SIGNS = [
  ["aries", "Áries"],
  ["touro", "Touro"],
  ["gemeos", "Gêmeos"],
  ["cancer", "Câncer"],
  ["leao", "Leão"],
  ["virgem", "Virgem"],
  ["libra", "Libra"],
  ["escorpiao", "Escorpião"],
  ["sagitario", "Sagitário"],
  ["capricornio", "Capricórnio"],
  ["aquario", "Aquário"],
  ["peixes", "Peixes"],
];
export const SECTORS = [
  null,
  {
    title: "escolher sua própria posição",
    area: "sua maneira de se apresentar e começar",
    scene:
      "tomar a iniciativa, dizer o que você quer ou mudar a forma de se apresentar",
    question: "a liberdade de escolher por si",
    cost: "decidir depressa e deixar pouco espaço para ajustar o caminho",
    practice:
      "uma iniciativa que possa ser corrigida depois da primeira resposta",
  },
  {
    title: "dar valor ao que sustenta você",
    area: "suas prioridades e recursos",
    scene: "distribuir tempo, dinheiro e atenção entre o que importa",
    question: "a segurança de ter recursos e prioridades próprios",
    cost: "conservar algo apenas porque já custou esforço",
    practice: "uma prioridade que caiba nos recursos realmente disponíveis",
  },
  {
    title: "encontrar palavras que aproximam",
    area: "as conversas e os aprendizados cotidianos",
    scene: "explicar uma ideia, pedir uma informação ou retomar uma conversa",
    question: "a possibilidade de compreender e ser compreendido",
    cost: "multiplicar explicações sem chegar ao ponto que precisa ser entendido",
    practice:
      "uma conversa em que o pedido fique compreensível para os dois lados",
  },
  {
    title: "cuidar da base que acolhe você",
    area: "a intimidade e a vida de casa",
    scene:
      "organizar a convivência, resguardar a privacidade ou cuidar do lugar onde você descansa",
    question: "o direito de ter uma base íntima que acolha você",
    cost: "proteger a familiaridade mesmo quando ela já deixou de acolher",
    practice: "um acordo de convivência que preserve espaço pessoal",
  },
  {
    title: "abrir espaço para criar e gostar",
    area: "a criação, o prazer e a expressão pessoal",
    scene:
      "mostrar algo que criou, experimentar um interesse ou reservar tempo para o prazer",
    question:
      "a liberdade de gostar de algo sem precisar justificá-lo o tempo inteiro",
    cost: "depender da resposta alheia para continuar algo que tem valor para você",
    practice:
      "uma experiência criativa que possa existir antes de ser avaliada",
  },
  {
    title: "dar uma forma possível à rotina",
    area: "o trabalho cotidiano e os cuidados de rotina",
    scene:
      "dividir tarefas, ajustar uma agenda ou cuidar daquilo que precisa de constância",
    question: "a possibilidade de manter uma rotina que caiba na vida",
    cost: "acrescentar exigências até que a organização se torne outra fonte de desgaste",
    practice: "uma tarefa com tempo e responsabilidade bem definidos",
  },
  {
    title: "negociar sem desaparecer do encontro",
    area: "as parcerias e os acordos a dois",
    scene:
      "negociar uma diferença, fazer um pedido ou decidir algo com outra pessoa",
    question: "o espaço de cada pessoa dentro de uma escolha compartilhada",
    cost: "confundir um acordo com a obrigação de concordar em tudo",
    practice: "um acordo que permita discordar sem desfazer toda a parceria",
  },
  {
    title: "dividir sem perder a clareza",
    area: "a partilha e os compromissos que envolvem confiança",
    scene:
      "combinar o que será compartilhado, reconhecer uma dependência ou esclarecer uma responsabilidade",
    question:
      "a confiança necessária para dividir algo sem perder a clareza dos limites",
    cost: "deixar expectativas implícitas acumularem peso no vínculo",
    practice:
      "uma combinação clara sobre o que cada pessoa oferece e pode pedir",
  },
  {
    title: "ampliar a visão sem perder o chão",
    area: "os estudos, as convicções e os projetos de expansão",
    scene:
      "escolher um estudo, conhecer uma perspectiva diferente ou rever um plano de longo alcance",
    question:
      "a liberdade de ampliar a visão sem transformar uma ideia em certeza absoluta",
    cost: "defender uma explicação antes de conhecer suas consequências concretas",
    practice:
      "um plano maior que aceite uma primeira experiência pequena e verificável",
  },
  {
    title: "assumir uma direção que faça sentido",
    area: "a direção profissional e as responsabilidades públicas",
    scene:
      "assumir uma responsabilidade, apresentar um trabalho ou decidir que direção deseja sustentar",
    question:
      "o compromisso com uma direção que possa ser sustentada publicamente",
    cost: "medir todas as escolhas pelo reconhecimento que elas podem trazer",
    practice:
      "uma responsabilidade com critérios claros para o que é suficiente",
  },
  {
    title: "participar sem perder sua voz",
    area: "os grupos, as amizades e os projetos em comum",
    scene:
      "participar de um grupo, dividir uma ideia de futuro ou combinar uma contribuição",
    question: "o pertencimento que permite contribuir sem apagar sua posição",
    cost: "aceitar expectativas coletivas sem conferir o lugar que você deseja ocupar",
    practice:
      "uma contribuição cujos limites sejam compreensíveis para o grupo",
  },
  {
    title: "respeitar o tempo de recolher",
    area: "o recolhimento e os assuntos que pedem encerramento",
    scene:
      "diminuir estímulos, terminar uma pendência ou preservar um tempo sem exposição",
    question: "o espaço para elaborar algo antes de responder ao mundo",
    cost: "adiar indefinidamente uma conversa ou um encerramento por precisar de mais silêncio",
    practice: "uma pausa que ajude a voltar ou a concluir",
  },
];
export const BODIES = {
  sun: {
    name: "Sol",
    need: "dar uma direção pessoal ao que faz",
    verb: "escolher",
    shadow: "transformar a própria posição na única resposta possível",
  },
  moon: {
    name: "Lua",
    need: "reconhecer o que traz acolhimento e segurança",
    verb: "acolher",
    shadow:
      "responder ao desconforto antes de entender o que está pedindo cuidado",
  },
  mercury: {
    name: "Mercúrio",
    need: "compreender, nomear e trocar informações",
    verb: "explicar",
    shadow: "confundir uma explicação rápida com um entendimento completo",
  },
  venus: {
    name: "Vênus",
    need: "escolher o que tem valor e cultivar reciprocidade",
    verb: "valorizar",
    shadow: "preservar a harmonia à custa de uma preferência importante",
  },
  mars: {
    name: "Marte",
    need: "agir, desejar e sustentar uma posição",
    verb: "agir",
    shadow: "tratar toda resistência como uma disputa que precisa vencer",
  },
  jupiter: {
    name: "Júpiter",
    need: "ampliar possibilidades e encontrar sentido",
    verb: "expandir",
    shadow: "prometer mais do que a situação permite sustentar",
  },
  saturn: {
    name: "Saturno",
    need: "definir limites e dar continuidade ao que importa",
    verb: "sustentar",
    shadow: "transformar um limite necessário numa proibição permanente",
  },
  uranus: {
    name: "Urano",
    need: "abrir alternativas e rever padrões que ficaram estreitos",
    verb: "experimentar",
    shadow: "romper uma forma antes de entender o que ainda vale preservar",
  },
  neptune: {
    name: "Netuno",
    need: "dar espaço à imaginação e à sensibilidade",
    verb: "imaginar",
    shadow: "tomar o que deseja ver pelo que já está claramente combinado",
  },
  pluto: {
    name: "Plutão",
    need: "rever dependências e relações de poder",
    verb: "transformar",
    shadow: "buscar controle justamente onde uma mudança pede negociação",
  },
};
// Each pair adds a relational conclusion. It does not infer a reader's biography.
export const PAIRS = {
  "sun:moon":
    "Uma escolha pode expressar bem o que você quer e ainda precisar de tempo para se tornar emocionalmente habitável. Clareza de direção e sensação de segurança nem sempre chegam juntas.",
  "sun:mercury":
    "Explicar uma escolha ajuda a reconhecê-la como sua. Mas uma decisão pode ficar presa à necessidade de ter uma justificativa perfeita antes de ganhar forma.",
  "sun:venus":
    "O que você deseja construir ganha consistência quando também tem valor afetivo. A aprovação de alguém pode encorajar essa direção, sem precisar se tornar seu único critério.",
  "sun:mars":
    "Vontade e iniciativa se encontram: uma decisão pede um gesto. A mesma firmeza que ajuda a sair da espera pode endurecer a posição antes de você conhecer a resposta do ambiente.",
  "sun:jupiter":
    "Uma direção pessoal pode ganhar horizonte e entusiasmo. A nuance é distinguir um crescimento que amplia suas escolhas de uma promessa que aumenta apenas a obrigação de corresponder.",
  "sun:saturn":
    "Assumir uma direção envolve aceitar seus limites concretos. A responsabilidade pode dar firmeza à escolha, mas perde essa função quando exige que você já saiba fazer tudo antes de começar.",
  "sun:uranus":
    "Experimentar outra forma de agir pode revelar um desejo que não cabia no papel habitual. A liberdade ganha consistência quando a mudança expressa uma escolha, e não só uma reação à pressão.",
  "sun:neptune":
    "Uma imagem de futuro pode dar sentido à escolha presente. Seu valor aparece quando inspira um passo possível, sem exigir que você represente uma versão ideal de si o tempo inteiro.",
  "sun:pluto":
    "Escolher uma direção pode expor o que você tenta preservar por controle ou dependência. Uma posição mais própria se constrói distinguindo compromisso escolhido de obrigação que já perdeu o sentido.",
  "moon:mercury":
    "Dar nome a uma sensação pode tornar uma conversa mais clara. O cuidado está em não tratar toda emoção como um problema que desaparece assim que recebe uma explicação.",
  "moon:venus":
    "Acolhimento e reciprocidade se aproximam. Um gesto de afeto ganha valor quando considera o que conforta cada pessoa, em vez de pressupor que ambas precisam receber a mesma coisa.",
  "moon:mars":
    "Uma necessidade de acolhimento pode encontrar a pressa de resolver ou se defender. Dar uma resposta firme ajuda quando ela protege o que importa; perde precisão quando a irritação decide sozinha o tamanho da resposta.",
  "moon:jupiter":
    "Entusiasmo e vontade de acolher podem ampliar o que parece possível. A generosidade continua mais habitável quando não exige oferecer tudo para que ninguém se frustre.",
  "moon:saturn":
    "Uma forma estável de cuidado pode conter a oscilação do momento. O limite funciona melhor como apoio compreensível do que como cobrança para deixar de sentir o que está sentindo.",
  "moon:uranus":
    "A necessidade de familiaridade encontra o desejo de respirar de outro jeito. Uma pequena mudança pode renovar o acolhimento sem obrigar você a escolher entre toda a segurança e toda a liberdade.",
  "moon:neptune":
    "A sensibilidade pode perceber nuances difíceis de nomear. Ela fica mais clara quando impressões e expectativas não são tomadas automaticamente como sentimentos ou intenções da outra pessoa.",
  "moon:pluto":
    "Uma reação emocional pode parecer maior quando toca a necessidade de manter controle ou proximidade. Reconhecer o peso do vínculo ajuda a separar o cuidado que aproxima da pressão que tenta garantir uma resposta.",
  "mercury:venus":
    "A palavra pode aproximar pessoas e tornar uma preferência compreensível. A delicadeza ganha força quando permite dizer algo verdadeiro, sem transformar cada diferença em uma frase apenas agradável.",
  "mercury:mars":
    "Pensamento e resposta podem ganhar velocidade. A precisão da fala importa tanto quanto sua firmeza: nomear o problema ajuda mais do que aumentar a intensidade para garantir que ele seja ouvido.",
  "mercury:jupiter":
    "Os detalhes de uma ideia encontram a vontade de enxergar o conjunto. O entendimento cresce quando a visão maior orienta as perguntas sem dispensar as informações que poderiam corrigi-la.",
  "mercury:saturn":
    "Organizar o pensamento pode tornar uma conversa mais responsável. A mesma atenção que melhora uma explicação pode travá-la quando todo detalhe vira condição para começar a falar.",
  "mercury:uranus":
    "Uma associação inesperada pode abrir uma alternativa. Para que a novidade seja compartilhada, importa construir a passagem entre o que parece evidente para você e o que o outro ainda precisa compreender.",
  "mercury:neptune":
    "Imaginação e linguagem podem aproximar experiências difíceis de explicar. Uma imagem esclarece quando acompanha uma informação concreta; confunde quando ocupa o lugar de um acordo que precisava ser explícito.",
  "mercury:pluto":
    "Uma conversa pode ganhar profundidade ao alcançar o que sustenta uma posição. A investigação deixa de aproximar quando vira tentativa de encontrar a palavra capaz de controlar a resposta alheia.",
  "venus:mars":
    "Desejo e reciprocidade entram na mesma conversa. Querer algo com clareza ajuda a negociar; a intensidade do desejo, por si só, não revela o ritmo nem a disponibilidade de quem participa.",
  "venus:jupiter":
    "Prazer e abertura podem ampliar o que você deseja experimentar ou compartilhar. O valor de uma experiência não depende de torná-la maior, mais cara ou mais frequente a cada vez.",
  "venus:saturn":
    "Um vínculo ou uma preferência ganha consistência quando encontra disponibilidade real. A continuidade pode demonstrar cuidado, desde que compromisso não passe a significar ausência completa de prazer ou escolha.",
  "venus:uranus":
    "Uma nova forma de se relacionar ou escolher pode devolver espaço ao desejo. A liberdade se torna mais compartilhável quando a mudança é comunicada, em vez de exigir que o outro adivinhe suas novas condições.",
  "venus:neptune":
    "Encantamento e sensibilidade podem enriquecer uma aproximação. Conhecer melhor o que existe ajuda a preservar o afeto sem exigir que a pessoa ou a experiência sustente uma imagem ideal.",
  "venus:pluto":
    "O desejo de manter um vínculo encontra a pergunta sobre o que cada pessoa pode escolher dentro dele. Uma preferência ganha profundidade quando consegue reconhecer dependências sem transformar intensidade em prova de valor.",
  "mars:jupiter":
    "A iniciativa pode ganhar coragem quando encontra uma possibilidade maior. O alcance da ação depende também de reconhecer os recursos e os acordos necessários para sustentar o entusiasmo inicial.",
  "mars:saturn":
    "A vontade de avançar encontra uma medida, uma espera ou um limite. Essa resistência pode dar forma à ação; torna-se desgaste quando todo impedimento é lido como proibição ou toda pressa como falta de responsabilidade.",
  "mars:uranus":
    "A ação encontra vontade de romper uma repetição. Uma alternativa concreta dá direção a esse impulso; reagir apenas ao que incomoda pode trocar a forma do problema sem mudar a relação com ele.",
  "mars:neptune":
    "Agir com sensibilidade exige reconhecer também o que ainda está pouco definido. Uma intenção generosa se torna mais útil quando encontra um gesto claro, sem prometer resolver o que não depende só de você.",
  "mars:pluto":
    "A firmeza pode se intensificar quando uma escolha parece envolver controle ou perda. Distinguir o que você consegue decidir do que precisa negociar ajuda a não transformar todo obstáculo numa prova de força.",
  "jupiter:saturn":
    "A vontade de ampliar e a necessidade de sustentar pedem escalas diferentes. Um limite pode tornar o crescimento viável; uma possibilidade nova pode mostrar que um limite antigo já precisa ser revisto.",
  "jupiter:uranus":
    "Uma perspectiva diferente pode abrir possibilidades antes invisíveis. A descoberta ganha consistência quando encontra espaço para experimentar, sem exigir que toda novidade seja tratada como solução definitiva.",
  "jupiter:neptune":
    "Sentido e imaginação podem alimentar uma visão generosa. Essa abertura se torna mais responsável quando convicção e esperança não dispensam perguntas sobre o que de fato pode ser oferecido.",
  "jupiter:pluto":
    "Uma visão maior pode levar à revisão de influências e dependências. A convicção ajuda a sustentar uma mudança, mas perde abertura quando precisa convencer todos de que só existe um caminho legítimo.",
  "saturn:uranus":
    "Continuidade e mudança negociam o mesmo espaço. Uma estrutura pode preservar o que funciona e ainda abrir uma experiência nova; rigidez e ruptura total não são as únicas formas de responder.",
  "saturn:neptune":
    "Dar forma a uma intenção exige aceitar que ela nunca caberá inteira num plano. Um compromisso delimitado pode tornar a sensibilidade útil sem reduzir toda experiência ao que já consegue ser medido.",
  "saturn:pluto":
    "Responsabilidade e poder podem se aproximar. Sustentar uma decisão envolve reconhecer seus efeitos, enquanto controlar todas as condições pode tornar pesado até aquilo que começou como compromisso escolhido.",
  "uranus:neptune":
    "Alternativas e imaginação ampliam o campo do possível. Uma abertura se torna habitável quando permite experimentar sem exigir certeza sobre tudo o que ainda está se formando.",
  "uranus:pluto":
    "Mudar uma forma pode revelar uma relação de poder que continuaria igual. A transformação ganha profundidade quando a novidade altera também quem decide, quem participa e que dependências permanecem.",
  "neptune:pluto":
    "Uma imagem coletiva pode ganhar força sem que seus efeitos estejam claros. A leitura simbólica convida a distinguir a inspiração que abre possibilidades da adesão que entrega a outros todo o poder de definir seu sentido.",
};
export const ASPECTS = {
  conjunction: {
    name: "conjunção",
    dynamic:
      "As duas demandas ocupam um espaço próximo e tendem a ser lidas juntas. O ganho está na concentração; a dificuldade é perceber onde uma necessidade termina e a outra começa.",
    connector: "pedem espaço na mesma escolha",
  },
  sextile: {
    name: "sextil",
    dynamic:
      "A relação é interpretada como uma possibilidade de cooperação. Ela depende de uma ligação concreta entre as duas áreas: a facilidade pode passar despercebida quando cada assunto fica isolado.",
    connector: "podem oferecer apoio uma à outra",
  },
  square: {
    name: "quadratura",
    dynamic:
      "A relação é interpretada como uma tensão de ajuste: responder a uma demanda pode deixar a outra sem espaço. O atrito mostra o que precisa ser combinado para que a escolha não cobre sempre o mesmo preço.",
    connector: "pedem um ajuste que nenhuma das duas resolve sozinha",
  },
  trine: {
    name: "trígono",
    dynamic:
      "A relação é interpretada como uma continuidade possível entre as duas demandas. Essa fluidez ajuda a construir uma resposta, mas pode também manter um hábito só porque ele funciona sem muito esforço.",
    connector: "podem encontrar uma continuidade",
  },
  opposition: {
    name: "oposição",
    dynamic:
      "A relação é interpretada como duas posições que pedem reconhecimento. Alternar entre elas pode parecer mais fácil do que negociar sua convivência; a nuance está em evitar que uma precise desaparecer para a outra existir.",
    connector: "precisam coexistir sem se anularem",
  },
};
export const AXES = {
  "1:7":
    "A iniciativa própria e a escolha compartilhada precisam caber na mesma decisão. Um acordo ganha qualidade quando a sua posição está presente e ainda pode escutar uma resposta.",
  "2:8":
    "Ter uma base própria muda a maneira de compartilhar. A confiança fica mais clara quando contribuição, expectativa e limite deixam de depender de suposições.",
  "3:9":
    "A visão maior precisa conversar com a informação concreta. Uma boa pergunta pode preservar o sentido de uma ideia e, ao mesmo tempo, mudar a forma como você pretende colocá-la em prática.",
  "4:10":
    "O que você sustenta publicamente precisa encontrar apoio na vida íntima. Reconhecimento e responsabilidade ficam mais habitáveis quando não consomem todo o espaço onde você pode simplesmente descansar.",
  "5:11":
    "Participar de algo maior não precisa apagar a contribuição pessoal. A criação ganha alcance no encontro com outras pessoas, desde que pertencer não exija abandonar tudo o que a torna sua.",
  "6:12":
    "Constância e recolhimento se sustentam melhor quando um não chega apenas depois do esgotamento do outro. Uma pausa pode preservar a continuidade; uma rotina delimitada pode tornar a pausa possível.",
};
// Consequences of reading two changes of motion together. These are symbolic
// distinctions, not claims that a planetary movement causes a personal event.
export const MOTION_CONSEQUENCES = {
  "mercury:venus":
    "Entender os termos de uma escolha não basta para desejar sustentá-la. Uma preferência que mudou pode exigir outro acordo, mesmo quando o anterior estava claro.",
  "mercury:mars":
    "Uma intenção pode estar bem explicada e ainda produzir uma ação diferente do que foi combinado. A revisão ganha consequência quando o gesto permite reconhecer o pedido que as palavras tentaram transmitir.",
  "mercury:jupiter":
    "Uma explicação convincente pode sustentar uma expectativa maior do que suas informações permitem. Rever o alcance da promessa ajuda a recuperar o que se sabe e o que ainda precisa ser aprendido.",
  "mercury:saturn":
    "Esclarecer um compromisso pode revelar que parte dele nunca foi realmente combinada. Nomear essa diferença permite ajustar a responsabilidade sem transformar toda dúvida em falta de seriedade.",
  "mercury:uranus":
    "Uma ideia diferente pode abrir a conversa e também mudar as perguntas que pareciam resolvidas. Sua utilidade depende de tornar a alternativa compreensível para quem terá de responder a ela.",
  "mercury:neptune":
    "Uma conversa pode transmitir sensibilidade sem deixar claro o que foi acordado. Distinguir intenção, expectativa e pedido dá à compreensão uma forma que outra pessoa possa confirmar ou recusar.",
  "mercury:pluto":
    "Uma explicação pode esclarecer a troca ou tentar decidir por quem a escuta. A possibilidade de discordar mostra se a conversa está ampliando a participação ou apenas tornando o controle mais persuasivo.",
  "venus:mars":
    "Desejar preservar uma relação não resolve sozinho o modo de defender uma preferência. A firmeza ganha sentido quando protege algo valorizado sem transformar a reciprocidade numa disputa a vencer.",
  "venus:jupiter":
    "Uma possibilidade atraente pode aumentar a vontade de oferecer mais do que cabe na troca. Dar medida ao entusiasmo ajuda a preservar o valor do vínculo sem prometer uma disponibilidade impossível.",
  "venus:saturn":
    "Continuar um compromisso pode expressar afeto ou apenas receio de decepcionar. Uma preferência reconhecida precisa caber nos limites do acordo para que a constância ainda tenha reciprocidade.",
  "venus:uranus":
    "Pedir mais liberdade pode mudar a forma de uma relação sem eliminar seu valor. A alternativa ganha consistência quando permite reconhecer o que se deseja preservar e o que já não pode ser oferecido do mesmo modo.",
  "venus:neptune":
    "O encanto de uma possibilidade pode preencher aquilo que a outra pessoa ainda não ofereceu. Tornar uma preferência explícita permite distinguir a reciprocidade vivida da expectativa que sustenta sozinha a ligação.",
  "venus:pluto":
    "O desejo de preservar algo valioso pode se misturar ao medo de perder poder na relação. Uma troca se torna mais livre quando continuar deixa de depender de ceder ou controlar todas as suas condições.",
  "mars:jupiter":
    "Uma perspectiva maior pode dar direção à iniciativa e também fazê-la ultrapassar sua medida. O primeiro passo ganha força quando permite ajustar o alcance da intenção antes que o entusiasmo vire obrigação.",
  "mars:saturn":
    "Um limite pode orientar o esforço ou ser vivido como algo que precisa ser derrotado. Distinguir essas duas respostas permite manter a firmeza sem gastar toda a energia contra a condição que sustenta o compromisso.",
  "mars:uranus":
    "Uma ação rápida pode abrir uma alternativa e também fechar a possibilidade de negociar a mudança. A autonomia ganha espaço quando o gesto permite uma resposta, em vez de tornar a ruptura sua única consequência.",
  "mars:neptune":
    "Uma intenção generosa pode mover a ação sem esclarecer onde ela deve parar. Dar um destino ao esforço permite ajudar ou criar sem assumir como sua toda necessidade que aparece.",
  "mars:pluto":
    "A firmeza pode defender uma escolha ou tentar garantir que nenhuma outra resposta seja possível. Reconhecer essa diferença muda o uso da força: sustentar uma posição deixa de exigir o controle de toda a situação.",
  "jupiter:saturn":
    "Uma expectativa menor pode tornar um projeto mais consistente, sem retirar o sentido que o fez nascer. O limite contribui quando ajuda a escolher o crescimento possível, em vez de transformar prudência em desistência automática.",
  "jupiter:uranus":
    "Uma alternativa pode ampliar o horizonte e ainda precisar de uma experiência pequena para mostrar seu alcance. A novidade ganha valor quando produz escolhas concretas, sem depender de prometer uma transformação completa.",
  "jupiter:neptune":
    "Uma visão inspiradora pode oferecer sentido e também transformar esperança em certeza. Preservar o que mobiliza você pede distinguir a possibilidade desejada das condições que já estão disponíveis.",
  "jupiter:pluto":
    "Um projeto de crescimento pode ampliar a participação ou concentrar a decisão em quem define seu rumo. Rever essa distribuição ajuda a reconhecer se a promessa de expansão está trazendo mais escolha ou mais dependência.",
  "saturn:uranus":
    "Mudar uma regra pode proteger melhor o compromisso que ela deveria sustentar. A continuidade ganha flexibilidade quando a forma pode ser revista sem que toda responsabilidade precise ser abandonada.",
  "saturn:neptune":
    "Uma intenção sensível pode precisar de limites para continuar existindo. Delimitar o que cabe no compromisso ajuda a transformar disponibilidade difusa em cuidado que possa ser sustentado.",
  "saturn:pluto":
    "Uma responsabilidade pode organizar a participação e também conservar uma dependência. A diferença aparece na possibilidade de renegociar seus termos sem tratar qualquer mudança como ameaça à autoridade.",
  "uranus:neptune":
    "Uma alternativa pode parecer libertadora antes que esteja claro o que ela permite viver. Dar forma à experiência ajuda a distinguir uma escolha nova do alívio momentâneo de imaginar outra realidade.",
  "uranus:pluto":
    "Uma ruptura pode mudar a aparência de uma relação e preservar a mesma distribuição de poder. A mudança ganha profundidade quando altera quem pode escolher, responder e participar das decisões.",
  "neptune:pluto":
    "Uma imagem de união pode esconder diferenças de poder que ainda precisam de negociação. Reconhecer essas diferenças permite cuidar do vínculo sem pedir que alguém desapareça dentro do ideal compartilhado.",
};
export const CORPUS = {
  version: CORPUS_VERSION,
  methodVersion: METHOD_VERSION,
  motionConsequences: MOTION_CONSEQUENCES,
  signs: SIGNS,
  sectors: SECTORS,
  bodies: BODIES,
  pairs: PAIRS,
  aspects: ASPECTS,
  axes: AXES,
  movements: MOVEMENTS,
  applications: APPLICATIONS,
  disclosure:
    "Esta leitura foi composta por regras determinísticas a partir de um corpus editorial elaborado com IA e revisto por outra execução de IA. Cada publicação passa por verificações automatizadas dos fatos, do método e da integridade. Não houve revisão humana nem uma nova revisão interpretativa individual de cada texto.",
};
