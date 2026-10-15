import {
  CAREER_COMPASS_EDITORIAL_VERSION,
  SCHEMA_VERSION,
  validCareerCompassFacts,
  type FactsEnvelope,
  type Reading,
  type Tier,
} from "@atv/ai";
import {
  evaluateProductDraft,
  prepareProductFacts,
  type ProductDraft,
  type ProductDraftAssessment,
} from "./product-editorial.ts";
import { prepareProductDelivery } from "./product-delivery.ts";

/** Offline editorial candidate only. Changing authored language requires a new version. */
export const CAREER_COMPASS_CANDIDATE_VERSION =
  "atv-career-compass-candidate/1.8.4";

type SignReading = {
  direction: string;
  workMode: string;
  tension: string;
  synthesis: string;
  questions: readonly [string, string, string];
};

/** Authored possibilities tied solely to the recorded Midheaven sign. No other chart factor is projected. */
const bySign: Readonly<Record<string, SignReading>> = Object.freeze({
  Áries: {
    direction:
      "O Meio do Céu em Áries sugere testar uma contribuição que abra caminho para uma ideia ainda parada. Uma primeira decisão pequena e visível permite observar se iniciar algo tem valor no seu trabalho real.",
    workMode:
      "Compare uma tarefa em que você possa começar com autonomia limitada e receber retorno logo depois. O ponto de observação é a passagem da iniciativa para uma entrega que outras pessoas consigam usar.",
    tension:
      "Se a ação vier antes da escuta de quem executará a próxima etapa, um começo rápido pode gerar retrabalho. Verifique se isso acontece numa proposta concreta, sem transformar a hipótese em característica sua.",
    synthesis:
      "Escolha uma melhoria pequena, explicite a primeira decisão e peça a alguém afetado que indique um ajuste antes da segunda etapa. Assim você testa a iniciativa e também o efeito dela sobre a colaboração.",
    questions: [
      "Qual proposta parada você poderia iniciar em uma escala que permita revisão?",
      "Em qual tarefa há autonomia suficiente para testar a primeira etapa e receber retorno?",
      "que melhoria pequena você poderia propor e revisar depois de ouvir uma pessoa afetada?",
    ],
  },
  Touro: {
    direction:
      "Com o Meio do Céu em Touro, investigue onde a continuidade transforma uma tarefa útil em valor perceptível. A hipótese só ganha sentido se houver uma entrega cuja qualidade possa ser acompanhada ao longo do tempo.",
    workMode:
      "Observe um processo com ritmo e recursos mensuráveis: o que melhora quando há tempo para consolidar, e o que depende de uma alteração de método? Compare os dois efeitos antes de escolher um ambiente de trabalho.",
    tension:
      "Manter uma rotina conhecida pode proteger a qualidade e também adiar uma correção necessária. Procure um sinal concreto de cada possibilidade no mesmo processo.",
    synthesis:
      "Altere uma etapa por um período curto e compare qualidade, esforço e continuidade com o método anterior. A escolha entre manter e mudar depende desses resultados, não de uma suposta preferência fixa pela estabilidade.",
    questions: [
      "Qual entrega melhora quando você pode acompanhar a qualidade por mais de uma etapa?",
      "Que recursos e ritmo seriam necessários para sustentar essa qualidade sem repetir trabalho inútil?",
      "qual etapa você poderia variar por pouco tempo e comparar com o procedimento atual?",
    ],
  },
  Gêmeos: {
    direction:
      "O Meio do Céu em Gêmeos aponta para testar a tradução de uma informação entre pessoas com necessidades diferentes. O resultado a observar é se a conversa produz entendimento utilizável, e não apenas mais circulação de ideias.",
    workMode:
      "Escolha uma tarefa com perguntas variadas e uma oportunidade de explicar o que foi aprendido. Registre qual informação mudou uma decisão ou ajudou outra pessoa a agir.",
    tension:
      "Abrir frentes de conversa sem fechar uma entrega pode dispersar o esforço. Distinga as trocas que esclareceram o problema das que adiaram uma escolha.",
    synthesis:
      "Resuma uma questão para duas pessoas, confirme o que cada uma entendeu e encerre a troca com uma ação pequena e datada. Essa sequência põe a capacidade de conexão à prova.",
    questions: [
      "Que informação você poderia traduzir para alguém que precisa decidir ou executar algo?",
      "Qual espaço permite fazer perguntas e também verificar se a explicação ajudou?",
      "que conversa você poderia concluir com um resumo e uma próxima ação definida?",
    ],
  },
  Câncer: {
    direction:
      "O Meio do Céu em Câncer propõe examinar uma contribuição ligada a criar condições de confiança para o trabalho conjunto. Investigue uma situação em que cuidado tenha permitido uma ação concreta do grupo.",
    workMode:
      "Em um ambiente de equipe, observe se há espaço para perguntar como uma decisão afeta as pessoas e para transformar a resposta em responsabilidade distribuída. Vínculo sem divisão de tarefas não basta como resultado.",
    tension:
      "Apoiar o grupo pode virar uma obrigação sem limites claros. Antes de assumir mais uma demanda, diferencie o apoio que cabe a você do que precisa ser repartido.",
    synthesis:
      "Pergunte de que apoio a equipe precisa, escolha uma responsabilidade possível e declare também o que ficará com outras pessoas. Depois confira se a distribuição ajudou o trabalho a avançar.",
    questions: [
      "Em qual decisão o cuidado com as pessoas ajudaria a equipe a agir melhor?",
      "Que condições de confiança permitem dividir responsabilidades em vez de concentrá-las?",
      "qual apoio concreto você poderia oferecer deixando explícito o seu limite?",
    ],
  },
  Leão: {
    direction:
      "O Meio do Céu em Leão convida a testar a apresentação pública de uma ideia com autoria reconhecível. Observe se dar forma visível ao trabalho também abre espaço para a participação de outras pessoas.",
    workMode:
      "Procure uma entrega em que seja possível mostrar uma proposta, receber uma contribuição e identificar quem fez o quê. A visibilidade da equipe é parte do teste, não um detalhe posterior.",
    tension:
      "Quando só a apresentação final recebe atenção, contribuições discretas podem desaparecer. Veja se o reconhecimento acompanha o processo e quem sustentou a entrega.",
    synthesis:
      "Apresente uma proposta breve, convide uma pessoa a completá-la e nomeie as contribuições na versão entregue. O experimento verifica tanto a clareza da sua expressão quanto a qualidade da autoria compartilhada.",
    questions: [
      "Qual ideia sua precisaria de uma forma visível para poder ser discutida?",
      "Onde uma apresentação permitiria reconhecer também quem ajudou a construir a entrega?",
      "que proposta breve você poderia mostrar e complementar com a contribuição de outra pessoa?",
    ],
  },
  Virgem: {
    direction:
      "O Meio do Céu em Virgem oferece a hipótese de contribuir ao transformar uma observação de detalhe em melhoria de serviço. O efeito precisa aparecer no uso da entrega, e não apenas na precisão da revisão.",
    workMode:
      "Examine uma rotina com etapas visíveis, identifique uma falha pequena e combine como medir o ajuste. Assim é possível distinguir um cuidado que ajuda de uma revisão que só prolonga o processo.",
    tension:
      "Sem um critério de término, corrigir mais um detalhe pode atrasar algo já suficiente para uso. Compare o ganho da última revisão com o tempo que ela exigiu.",
    synthesis:
      "Defina antes o que contará como pronto, faça uma revisão dirigida a esse critério e verifique depois se o usuário percebeu a melhoria. O limite de revisão faz parte do método.",
    questions: [
      "Que detalhe de uma entrega faria diferença para quem a usa?",
      "Qual rotina permite medir se a correção melhorou o serviço?",
      "que critério de pronto você poderia definir antes da próxima revisão?",
    ],
  },
  Libra: {
    direction:
      "O Meio do Céu em Libra sugere testar a capacidade de tornar uma decisão compreensível para pessoas com posições diferentes. A contribuição aparece quando a conversa chega a um critério que os envolvidos conseguem reconhecer.",
    workMode:
      "Escolha uma negociação pequena em que seja possível ouvir duas perspectivas e registrar os critérios antes de decidir. Observe se a clareza do processo melhora a cooperação depois da escolha.",
    tension:
      "Tentar manter todas as opções abertas pode adiar uma decisão já suficientemente informada. Marque o ponto em que uma nova conversa deixa de acrescentar informação relevante.",
    synthesis:
      "Ouça duas posições, formule um critério comum e use-o para encerrar uma decisão reversível. A revisão posterior pode mostrar se a escuta ajudou a escolher ou apenas prolongou a dúvida.",
    questions: [
      "Qual decisão precisa de um critério que as pessoas envolvidas possam entender?",
      "Em que espaço é possível escutar posições diferentes e ainda concluir uma escolha?",
      "que decisão pequena você poderia fechar após registrar duas perspectivas e um critério?",
    ],
  },
  Escorpião: {
    direction:
      "O Meio do Céu em Escorpião propõe investigar um problema cuja causa ainda não está clara. A contribuição pública a testar é oferecer uma explicação útil sem expor o que precisa permanecer privado.",
    workMode:
      "Procure uma questão que peça análise cuidadosa e confiança. Separe as informações que podem sustentar uma decisão coletiva daquelas que exigem reserva, e explique o método usado.",
    tension:
      "Aprofundar a investigação sozinho pode proteger dados sensíveis, mas também tornar a conclusão opaca. Teste se é possível compartilhar os critérios sem revelar o conteúdo privado.",
    synthesis:
      "Escolha um problema delimitado, descreva seu método para uma pessoa envolvida e peça que ela avalie se a conclusão é compreensível. O resultado é a qualidade da decisão, não a quantidade de informação revelada.",
    questions: [
      "Que problema merece investigação antes de uma mudança importante?",
      "Onde há tempo e confiança para explicar critérios sem expor informações privadas?",
      "qual etapa do seu método você poderia compartilhar antes de apresentar uma conclusão?",
    ],
  },
  Sagitário: {
    direction:
      "O Meio do Céu em Sagitário sugere conectar uma tarefa presente a um horizonte de aprendizado mais amplo. A hipótese só se torna útil quando a visão aponta uma ação que pode ser verificada agora.",
    workMode:
      "Compare um ambiente com estudo e troca de perspectivas com a possibilidade real de aplicar o que se aprende. Registre qual ideia atravessou a distância entre conversa e execução.",
    tension:
      "Uma visão ampla pode deixar uma etapa local sem responsável ou prazo. Observe se a expansão proposta cabe nos recursos disponíveis para a primeira entrega.",
    synthesis:
      "Explique a ideia em uma página, defina uma etapa curta e verifique o que ela ensinou antes de ampliar o plano. Aprendizado e execução precisam aparecer no mesmo teste.",
    questions: [
      "Qual tarefa atual ganharia sentido com uma pergunta de aprendizado mais ampla?",
      "Que ambiente permite estudar uma ideia e testar sua utilidade em uma entrega?",
      "que parte pequena de uma visão maior você poderia executar e avaliar primeiro?",
    ],
  },
  Capricórnio: {
    direction:
      "O Meio do Céu em Capricórnio sugere testar a organização de responsabilidades que permita a um projeto continuar depois do começo. O indicador é a continuidade da entrega, inclusive quando há limites de tempo e recursos.",
    workMode:
      "Examine uma meta com etapas definidas e autonomia responsável. Pergunte quem sustenta cada etapa e quais recursos de fato estão disponíveis antes de assumir uma obrigação.",
    tension:
      "Se apenas o desempenho final conta, esforço excessivo e necessidade de apoio podem ficar invisíveis. Compare a meta ao tempo e às pessoas disponíveis para executá-la.",
    synthesis:
      "Divida uma meta em uma etapa executável, distribua responsabilidades e revise o esforço com alguém envolvido. O teste é manter um compromisso possível, não provar resistência sem limite.",
    questions: [
      "Qual responsabilidade você poderia estruturar para que não dependa só do impulso inicial?",
      "Que meta tem etapas claras e recursos suficientes para uma execução responsável?",
      "qual etapa você poderia combinar com outra pessoa depois de conferir o esforço necessário?",
    ],
  },
  Aquário: {
    direction:
      "O Meio do Céu em Aquário abre a hipótese de revisar uma regra que já não atende bem às pessoas afetadas. Uma alternativa só conta como contribuição se puder ser experimentada por quem usará o resultado.",
    workMode:
      "Escolha um grupo disposto a comparar uma regra atual com uma alternativa pequena. Ouça uma pessoa afetada antes de definir o que melhoraria para o coletivo.",
    tension:
      "Uma solução nova pode parecer convincente no desenho e falhar no uso. Separe a ideia de seu efeito observado antes de recomendar uma mudança maior.",
    synthesis:
      "Descreva a regra atual, teste uma alternativa simples com alguém afetado e registre o que mudou para essa pessoa. Use o retorno para decidir se a proposta merece outra rodada.",
    questions: [
      "Que regra de trabalho poderia ser revista porque deixou de ajudar quem a utiliza?",
      "Onde é possível experimentar uma alternativa com participação das pessoas afetadas?",
      "quem poderia testar uma mudança simples e dizer o que ela resolveu ou dificultou?",
    ],
  },
  Peixes: {
    direction:
      "O Meio do Céu em Peixes propõe observar experiências pouco nomeadas e encontrar uma forma de comunicá-las. Teste se a escuta ou a criação produz algo compartilhável para outra pessoa.",
    workMode:
      "Escolha uma atividade em que seja possível ouvir uma necessidade, definir uma resposta concreta e conferir como ela foi recebida. A margem para sensibilidade precisa coexistir com um limite de entrega.",
    tension:
      "Receber muitas demandas sem combinar o alcance da resposta pode confundir disponibilidade com compromisso. Examine um pedido específico antes de aceitar outros.",
    synthesis:
      "Escolha um pedido, diga o que pode oferecer e combine como verificar se a ajuda foi útil. O limite torna a troca observável e protege a continuidade do trabalho.",
    questions: [
      "Que experiência ainda pouco nomeada você poderia tornar compreensível para alguém?",
      "Qual atividade permite escuta e criação com um resultado que possa ser conferido?",
      "que pedido concreto você poderia acolher definindo antes o limite da sua resposta?",
    ],
  },
});

type ContextLens = {
  questions: readonly [string, string, string];
};

type ContextTopic =
  | "overload" | "leadershipInvitation" | "team" | "transition" | "study" | "noStudy"
  | "creativePractice" | "change" | "noLeadership" | "keepLeadership"
  | "stayCurrent" | "stayCareer" | "independent";

type ContextSignals = {
  primary: ContextTopic;
  overload: boolean;
  missingRest: boolean;
  transitionKind: "employment" | "career" | "profession" | "general" | undefined;
  study: boolean;
  returningToStudy: boolean;
  noStudy: boolean;
  declinedStudyReturn: boolean;
  independent: boolean;
  noLeadership: boolean;
  keepLeadership: boolean;
  stayCurrent: boolean;
  stayCareerKind: "career" | "profession" | undefined;
  creativeKind: "editorialIllustration" | "illustration" | "ceramics" | undefined;
  missingCeramicClay: boolean;
  missingCeramicFiringAccess: boolean;
};

/** Editorial applications of an explicitly reported situation, never inferred chart facts. */
const contextLenses: Readonly<Record<ContextTopic, ContextLens>> = Object.freeze({
  overload: {
    questions: [
      "Em qual demanda atual sua contribuição poderia ficar mais clara sem acrescentar trabalho?",
      "Que prazo, recurso ou divisão de responsabilidade precisaria ser combinado antes desse teste?",
      "Qual tarefa pequena poderia ser reduzida, adiada ou repartida para conferir o resultado?",
    ],
  },
  leadershipInvitation: {
    questions: [
      "Que contribuição específica esperam de você nesse convite?",
      "Quais decisões, apoios e limites viriam de fato com a função?",
      "Seria possível experimentar uma responsabilidade delimitada antes de aceitar o papel inteiro?",
    ],
  },
  team: {
    questions: [
      "Em que decisão da equipe essa contribuição poderia ajudar concretamente?",
      "Que espaço de trabalho permite escuta e uma divisão verificável de tarefas?",
      "Qual etapa vocês poderiam testar juntos e revisar após receber retorno?",
    ],
  },
  transition: {
    questions: [
      "Que tipo de contribuição você quer verificar nesta transição?",
      "Quais condições concretas distinguem duas possibilidades que está considerando?",
      "Qual amostra pequena de trabalho permitiria comparar uma delas antes de uma decisão maior?",
    ],
  },
  study: {
    questions: [
      "Que habilidade ajudaria a testar a contribuição que você considera?",
      "Quanto tempo e quais recursos uma forma de estudo exigiria agora?",
      "Que exercício breve poderia mostrar o que você já sabe e o que ainda precisa aprender?",
    ],
  },
  noStudy: {
    questions: [
      "Que contribuição você poderia experimentar com recursos já disponíveis?",
      "Que condição permitiria uma tentativa breve dentro do limite que declarou?",
      "Que resultado observável ajudaria a decidir o próximo passo?",
    ],
  },
  creativePractice: {
    questions: [
      "Que amostra da sua prática criativa poderia mostrar essa contribuição?",
      "Quais materiais, tempo e canais de apresentação estão disponíveis para você?",
      "Que versão pequena poderia receber retorno antes de uma produção maior?",
    ],
  },
  change: {
    questions: [
      "Qual etapa da rotina você gostaria de examinar primeiro?",
      "Que condição de trabalho precisa ser preservada durante a mudança?",
      "Como compararia uma tentativa curta com o modo atual de fazer essa etapa?",
    ],
  },
  noLeadership: {
    questions: [
      "Que contribuição você poderia tornar visível sem liderar uma equipe?",
      "Qual ambiente respeita esse limite e oferece condições para uma boa entrega?",
      "Que tarefa delimitada permitiria testar essa direção sem assumir gestão de pessoas?",
    ],
  },
  keepLeadership: {
    questions: [
      "Que parte da liderança que deseja manter permite uma contribuição concreta?",
      "Que tempo, apoio e autoridade existem para essa responsabilidade hoje?",
      "Que decisão pequena permitiria verificar o resultado sem ampliar suas atribuições?",
    ],
  },
  stayCurrent: {
    questions: [
      "Onde sua contribuição poderia aparecer no trabalho que já realiza?",
      "Que recursos e autonomia estão disponíveis no ambiente atual?",
      "Qual ajuste reversível caberia no seu papel sem mudar de emprego?",
    ],
  },
  stayCareer: {
    questions: [
      "Que contribuição você gostaria de examinar na carreira que deseja manter?",
      "Que condições do trabalho atual permitem uma tentativa pequena?",
      "Que ajuste reversível caberia no caminho profissional que você escolheu preservar?",
    ],
  },
  independent: {
    questions: [
      "Que contribuição você poderia realizar de modo autônomo?",
      "Quais condições permitem concentração e retorno sem trabalho contínuo em equipe?",
      "Que entrega individual curta poderia receber uma revisão objetiva?",
    ],
  },
});

/** Sign-specific actions and cautions for the situation the user reported. */
const contextBySign: Readonly<Record<string, { action: string; marker: string; risk: string }>> = Object.freeze({
  Áries: { action: "iniciar uma melhoria delimitada", marker: "se a iniciativa chegou a uma entrega utilizável", risk: "Começar rápido sem ouvir quem usará o resultado pode gerar retrabalho." },
  Touro: { action: "consolidar a qualidade de uma tarefa", marker: "se a qualidade melhorou com os recursos disponíveis", risk: "Repetir um método conhecido pode adiar uma correção necessária." },
  Gêmeos: { action: "traduzir uma informação para quem vai usá-la", marker: "se a explicação ajudou uma decisão concreta", risk: "Abrir novas perguntas sem encerrar uma entrega pode dispersar o esforço." },
  Câncer: { action: "identificar uma necessidade e produzir uma resposta com limites", marker: "se a resposta foi útil sem ampliar sua obrigação", risk: "Acolher pedidos demais pode transformar cuidado em trabalho sem limite." },
  Leão: { action: "materializar uma ideia de autoria própria", marker: "se a apresentação tornou a ideia compreensível e útil", risk: "Dar atenção só à apresentação pode esconder o trabalho necessário para concluir a ideia." },
  Virgem: { action: "corrigir uma falha específica", marker: "se o ajuste reduziu erro ou esforço", risk: "Revisar detalhes sem um critério de conclusão pode prolongar a tarefa." },
  Libra: { action: "explicar por que uma opção atende ao objetivo", marker: "se o critério ajudou a concluir uma escolha reversível", risk: "Manter todas as opções abertas pode adiar uma decisão suficientemente informada." },
  Escorpião: { action: "investigar a causa de um problema sem expor dados privados", marker: "se o método esclareceu uma decisão sem revelar o que deve ficar reservado", risk: "Uma conclusão sem critérios compartilháveis pode ficar opaca para quem a usará." },
  Sagitário: { action: "colocar uma ideia em prática", marker: "se a ideia ajudou a concluir uma etapa útil", risk: "Um horizonte amplo pode deixar a primeira etapa sem prazo ou recursos." },
  Capricórnio: { action: "organizar uma etapa com prazo e recursos explícitos", marker: "se a entrega pôde continuar dentro do esforço combinado", risk: "Assumir uma meta sem conferir os recursos pode esconder sobrecarga." },
  Aquário: { action: "experimentar uma alternativa a uma regra de trabalho", marker: "se a alternativa melhorou o uso para uma pessoa afetada", risk: "Uma solução atraente no desenho pode falhar no uso." },
  Peixes: { action: "expressar uma experiência pouco nomeada de modo compreensível", marker: "se a resposta foi compreendida por quem a recebeu", risk: "Receber pedidos sem combinar o alcance da resposta pode confundir disponibilidade com compromisso." },
});

function contextSignals(context: string | undefined): ContextSignals | undefined {
  if (!context) return undefined;
  const reported = context.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  // Separate independent intentions after punctuation or a new stated goal.
  // The negation in "sem equipe, quero estudar" must not erase studying.
  const nextIntention = "(?:nao\\s+)?(?:quero|preciso|desejo|prefiro|pretendo|busco|estou|sou|faco)";
  const clauses = reported.split(new RegExp(`[.!?;]|\\b(?:mas|porem|contudo|entretanto)\\b|,\\s*(?=${nextIntention}\\b)|\\be\\s+(?=${nextIntention}\\b)`, "g"))
    .map((part) => part.trim()).filter(Boolean).flatMap((clause) => {
      // An infinitive can be a second goal after "sem equipe e voltar a
      // estudar". Split only this clear affirmative coordination; "não quero
      // liderar e voltar a estudar" does not establish a positive study goal.
      const secondStudy = /\be\s+(?=(?:voltar|retornar)\s+(?:a\s+)?estudar\b|estudar\b)/.exec(clause);
      if (!secondStudy) return [clause];
      const first = clause.slice(0, secondStudy.index).trim();
      if (!/\b(?:prefiro|quero|desejo|pretendo|busco)\b/.test(first) ||
        /\bnao\s+(?:prefiro|quero|desejo|pretendo|busco)\b/.test(first) ||
        !/\bsem\s+(?:uma\s+)?(?:equipe|time)\b/.test(first)) return [clause];
      return [first, clause.slice(secondStudy.index + secondStudy[0].length).trim()];
    });
  // Scope a refusal to its clause and object. A negative employment change
  // must never erase an affirmed career change in the next clause.
  const affirmed = clauses.map((clause) =>
    clause.split(/\b(?:nao|nem|sem|evito|evitar|dispenso|recuso)\b/)[0]?.trim() ?? "").join(" ");
  const leadershipContinuation = /\b(?:nao\s+(?:quero|desejo|pretendo)\s+(?:deixar|parar)\s+de\s+(?:liderar|gerenciar|chefiar)|(?:quero|desejo|pretendo)\s+continuar\s+(?:liderando|gerenciando|chefiando))(?:\s+(?:uma\s+)?equipe)?\b/;
  const refusedLeadership = /\b(?:nao\s+(?:quero|desejo|pretendo)|evito|recuso|dispenso)\s+(?:(?:mais|um|uma|o|a)\s+)?(?:(?:assumir|exercer)\s+(?:(?:um|uma)\s+)?)?(?:(?:cargo|papel|funcao)\s+de\s+)?(?:liderar|gerenciar|chefiar|lideranca|gestao de pessoas)\b|\bsem\s+(?:(?:assumir|exercer)\s+)?(?:liderar|lideranca|gestao de pessoas|chefiar|gerenciar)\b/;
  const keepLeadership = clauses.some((clause) => leadershipContinuation.test(clause));
  const noLeadership = clauses.some((clause) => !leadershipContinuation.test(clause) && refusedLeadership.test(clause));
  // Contradictory preferences are retained as reported text, not resolved by
  // assigning either leadership preference to the person.
  const unambiguousNoLeadership = noLeadership && !keepLeadership;
  const unambiguousKeepLeadership = keepLeadership && !noLeadership;
  const refusedChange = /\b(?:nao\s+(?:quero|desejo)|evito|recuso|dispenso)\s+(?!\b(?:deixar|parar)\s+de\b)(?:\w+\s+){0,2}(?:mudar|trocar|sair)\s+(?:de\s+)?(emprego|trabalho|empresa|carreira|profissao)\b/;
  const refusedChangeObjects = clauses.map((clause) => refusedChange.exec(clause)?.[1]).filter(Boolean);
  const stayCurrent = refusedChangeObjects.some((object) => object === "emprego" || object === "trabalho" || object === "empresa");
  const refusedCareerObject = refusedChangeObjects.find((object) => object === "carreira" || object === "profissao");
  const stayCareerKind: ContextSignals["stayCareerKind"] = refusedCareerObject === "profissao" ? "profession" :
    refusedCareerObject ? "career" : undefined;
  const independent = clauses.some((clause) =>
    (/\b(?:prefiro|quero|desejo)\b.{0,35}\bsem\s+(?:uma\s+)?(?:equipe|time)\b/.test(clause) &&
      !/\bnao\s+(?:prefiro|quero\s+trabalhar\s+sem)\b/.test(clause)) ||
    /\bnao\s+quero\s+trabalhar\s+(?:em|com)\s+(?:uma\s+)?(?:equipe|time)\b/.test(clause));
  const missingRest = /\b(?:nao tenho|sem)\s+(?:tempo\s+(?:de|para)\s+)?(?:descanso|pausa)\b/.test(reported);
  const overload = /\b(?:sobrecarga|sobrecarregad[oa]s?|demandas? demais|muitas? demandas?|excesso de demandas?|exaust[oa]s?)\b/.test(affirmed) ||
    /\b(?:preciso|quero|necessito)\s+(?:de\s+)?(?:reduzir|diminuir|aliviar)\s+(?:(?:a|minha)\s+)?(?:carga|jornada|demandas)\b/.test(affirmed) || missingRest;
  const transitionObject = /\b(?:mudar|trocar|sair|mudanca)\s+(?:de\s+)?(emprego|trabalho|empresa|carreira|profissao)\b/.exec(affirmed)?.[1];
  const transitionKind: ContextSignals["transitionKind"] =
    transitionObject === "carreira" ? "career" : transitionObject === "profissao" ? "profession" :
    transitionObject ? "employment" : /\b(?:transicao|recolocacao)\b/.test(affirmed) ? "general" : undefined;
  const returningToStudy = /\b(?:voltar|retornar|retorno)\s+(?:a|aos|para os)?\s*estud(?:o|ar)\b/.test(affirmed);
  const affirmedStudy = returningToStudy || /\b(?:quero|pretendo|desejo|busco|preciso)\s+(?:de\s+)?estudar\b|\bestudar\b|\b(?:curso|formacao)\b/.test(affirmed);
  const declinedStudyReturn = clauses.some((clause) =>
    /\b(?:nao\s+(?:quero|desejo|pretendo)|evito|recuso|dispenso)\s+(?:voltar|retornar)\s+a\s+estudar\b/.test(clause));
  const declinedStudy = declinedStudyReturn || clauses.some((clause) =>
    /\b(?:nao\s+(?:quero|desejo|pretendo)|evito|recuso|dispenso)\s+(?:de\s+)?estudar\b/.test(clause));
  // If both opposite intentions are stated, neither is assigned as a settled
  // preference. The reported context remains visible in the facts envelope.
  const study = affirmedStudy && !declinedStudy;
  const noStudy = declinedStudy && !affirmedStudy;
  // A refusal of leadership constrains an invitation; it does not erase the
  // invitation the person actually reported.
  const invitation = /\b(?:convite|convidad[oa]s?)\b.{0,35}\b(?:liderar|lideranca|coordenar)\b/.test(affirmed);
  const team = !independent && /\b(?:colaboracao|colaborar|colaborativo|trabalh(?:o|ar) em equipe)\b/.test(affirmed);
  const creative = /\b(?:ilustracao|ceramica|ceramista|oleir[ao]|olearia|modelagem em argila|artesanato|desenho|pintura|pratica criativa|criacao artistica)\b/.test(affirmed);
  const creativeKind: ContextSignals["creativeKind"] = /\bilustracao editorial\b/.test(affirmed) ? "editorialIllustration" :
    /\bilustracao\b/.test(affirmed) ? "illustration" :
    /\b(?:ceramica|ceramista|oleir[ao]|olearia|modelagem em argila)\b/.test(affirmed) ? "ceramics" : undefined;
  const missingCeramicClay = /\b(?:nao\s+(?:tenho|possuo)|sem)\s+argila\b/.test(reported);
  const missingCeramicFiringAccess = /\b(?:nao\s+(?:tenho|possuo)|sem|nem)\s+acesso\s+(?:a|ao)\s+(?:um\s+)?(?:forno|queima)\b/.test(reported);
  const change = /\b(?:mudar|mudanca)\s+(?:(?:uma|a|de)\s+)?(?:rotina|etapa|processo|modo de trabalhar)\b/.test(affirmed);
  const primary: ContextTopic | undefined = overload ? "overload" : transitionKind ? "transition" : study ? "study" : noStudy ? "noStudy" :
    invitation ? "leadershipInvitation" : team ? "team" : creative ? "creativePractice" :
    change ? "change" : unambiguousNoLeadership ? "noLeadership" : unambiguousKeepLeadership ? "keepLeadership" :
    stayCurrent ? "stayCurrent" : stayCareerKind ? "stayCareer" :
    independent ? "independent" : undefined;
  return primary ? { primary, overload, missingRest, transitionKind, study, returningToStudy, noStudy, declinedStudyReturn, independent,
    noLeadership: unambiguousNoLeadership, keepLeadership: unambiguousKeepLeadership,
    stayCurrent, stayCareerKind, creativeKind, missingCeramicClay, missingCeramicFiringAccess } : undefined;
}

/** A reported situation changes the actual test, its conditions and its limits. */
function contextualReading(sign: string, signals: ContextSignals): SignReading {
  // The composer has already checked this sign against bySign; both tables cover it.
  const frame = contextBySign[sign]!;
  const transitionName = signals.transitionKind === "career" ? "mudança de carreira" :
    signals.transitionKind === "profession" ? "mudança de profissão" :
    signals.transitionKind === "employment" ? "mudança de emprego" : "transição profissional";
  const preservedPath = signals.stayCareerKind === "profession" ? "profissão" : "carreira";
  // Changing career, profession and employer are separate intentions. Preserve
  // a refused object whenever it differs from the affirmed transition.
  const preserveOtherPath = Boolean(signals.stayCareerKind &&
    signals.stayCareerKind !== signals.transitionKind && signals.primary !== "stayCareer");
  const transitionCondition = [
    signals.stayCurrent ? "sem mudar de emprego" : undefined,
    preserveOtherPath ? `sem mudar de ${preservedPath}` : undefined,
    signals.noLeadership ? "sem assumir liderança formal" : undefined,
    signals.keepLeadership ? "considerando seu desejo de continuar liderando" : undefined,
  ].filter(Boolean).join(" e ");
  const scope = [
    signals.independent ? "em uma entrega individual" : undefined,
    signals.stayCurrent ? "sem mudar de emprego" : undefined,
    preserveOtherPath ? `sem mudar de ${preservedPath}` : undefined,
    signals.noLeadership ? "sem assumir liderança formal" : undefined,
    signals.keepLeadership ? "considerando seu desejo de continuar liderando" : undefined,
    signals.noStudy && signals.primary !== "noStudy" ? (signals.declinedStudyReturn ? "sem voltar a estudar" : "sem estudar") : undefined,
  ].filter(Boolean).join(", ");
  const scopeSuffix = scope ? ` ${scope}` : "";
  const withConstraint = (phrase: string, constraint: string) =>
    `${phrase}${phrase.includes(" sem ") && constraint.startsWith("sem ") ? " e " : " "}${constraint}`;
  const scopedAction = scope ? withConstraint(frame.action, scope) : frame.action;
  const question = contextLenses[signals.primary].questions[0];
  switch (signals.primary) {
    case "overload":
      return {
        direction: `Diante ${signals.missingRest ? "da falta de descanso" : "das demandas em excesso"} que você relatou${signals.transitionKind ? `, enquanto considera uma ${transitionName}` : ""}, o Meio do Céu em ${sign} serve para examinar se é possível ${scopedAction} dentro da carga disponível. Essa hipótese não pede outra responsabilidade.${signals.study ? " Você também considera estudar; essa decisão precisa caber no tempo que realmente tem." : ""}`,
        workMode: `Compare o tempo e os recursos disponíveis para ${frame.action}${signals.transitionKind ? ` ao avaliar a ${transitionName}` : " na demanda atual"}. Se o teste não couber na carga existente, renegocie o alcance antes de avaliar o resultado.${signals.study ? " Para estudar, identifique primeiro o que deseja aprender e o tempo necessário, sem somá-lo automaticamente às demandas atuais." : ""}`,
        tension: `${frame.risk} Com a carga que você descreveu${signals.transitionKind ? `, a ${transitionName} também exige tempo` : ", uma entrega melhor pode atrair pedidos adicionais"}; confira prazo e divisão de responsabilidade antes de aceitar outra demanda.${signals.study ? " Uma formação sem espaço na agenda pode aumentar a sobrecarga." : ""}`,
        synthesis: `Escolha ${signals.transitionKind ? `uma comparação pequena para a ${transitionName}` : "uma demanda atual"} que permita ${frame.action}, defina o menor resultado útil e combine qual outra prioridade será adiada ou repartida. Observe ${frame.marker}, sem medir seu valor pela quantidade de tarefas.${signals.study ? " Só depois avalie quando o estudo desejado caberia, se houver tempo e recursos." : ""}`,
        questions: [signals.transitionKind ? `Que contribuição você pode examinar na ${transitionName} sem ampliar sua carga?` : question, `Que condições permitiriam ${withConstraint(scopedAction, "sem ampliar a carga")}${signals.transitionKind ? ` ao avaliar a ${transitionName}` : ""}?`, signals.study ? `Que prioridade poderia ser adiada ou repartida para conferir ${frame.marker} e reservar tempo ao estudo que deseja?` : `Qual prioridade seria adiada ou repartida para conferir ${frame.marker}${signals.transitionKind ? ` na ${transitionName}` : ""}?`],
      };
    case "transition":
      return {
        direction: `Na ${transitionName} que você considera, o Meio do Céu em ${sign} oferece uma pergunta: onde seria possível ${scopedAction}? Use a hipótese para comparar atividades, sem tomá-la como promessa de resultado.${signals.study ? " Você também considera estudar; verifique se esse objetivo prepara a mudança ou se pede uma decisão própria." : ""}`,
        workMode: `Compare duas possibilidades ligadas à ${transitionName} pelo tempo, recursos e autonomia necessários para ${scopedAction}. Confira as condições concretas de cada possibilidade antes de decidir.${signals.study ? " Se o estudo fizer parte da transição, identifique uma habilidade necessária e compare formas de aprendê-la pelo tempo e custo." : ""}`,
        tension: `${frame.risk} Nessa ${transitionName}, a pressa pode fazer uma diferença de condições parecer solução completa; investigue o esforço exigido por cada possibilidade${transitionCondition ? `, ${transitionCondition}` : ""}.${signals.study ? " Uma formação não resolve, por si, condições ruins de trabalho." : ""}`,
        synthesis: `Antes de decidir sobre a ${transitionName}, faça uma atividade curta que permita ${scopedAction}. Em cada opção, confira ${frame.marker}. Depois compare tempo, recursos e autonomia exigidos.${signals.study ? " Use o resultado para decidir se estudar responde a uma dúvida concreta dessa transição." : ""}`,
        questions: [`Que tipo de contribuição você quer verificar nesta ${transitionName}${transitionCondition ? `, ${transitionCondition}` : ""}?`, signals.study ? `Há uma habilidade que você deseja estudar para comparar as possibilidades da ${transitionName}, ou esse estudo atende a outro objetivo?` : `Em qual possibilidade da ${transitionName} você poderia ${scopedAction}?`, `Que atividade curta permitiria conferir ${frame.marker} antes da ${transitionName}${transitionCondition ? `, ${transitionCondition}` : ""}?`],
      };
    case "study":
      return {
        direction: `Ao considerar ${signals.returningToStudy ? "voltar a estudar" : "estudar"}, use o Meio do Céu em ${sign} para perguntar que aprendizagem ajudaria a ${scopedAction}. O estudo ganha função quando sustenta uma atividade que você deseja experimentar.`,
        workMode: `Compare tempo, custo e acesso de duas formas de aprender algo necessário para ${scopedAction}. Uma atividade ${signals.independent ? "individual" : "delimitada"} pode produzir uma amostra observável antes de qualquer formação maior.`,
        tension: `${frame.risk} Acumular formação também pode adiar a prática; identifique a dúvida que exige estudo e o que já pode ser testado${scopeSuffix}.`,
        synthesis: `Escolha uma habilidade útil para ${frame.action}, faça um exercício curto${scopeSuffix} e confira ${frame.marker}. Só então avalie se um curso maior responde à dúvida encontrada.`,
        questions: [signals.independent ? "Que habilidade ajudaria a testar sua contribuição em uma atividade individual?" : question, `Que forma de estudo permitiria ${scopedAction}?`, `Durante o estudo, que exercício curto${scopeSuffix} ajudaria a conferir ${frame.marker}?`],
      };
    case "noStudy": {
      const reportedLimit = signals.declinedStudyReturn ? "não quer voltar a estudar" : "não quer estudar";
      const studyBoundary = signals.declinedStudyReturn ? "sem voltar a estudar" : "sem estudar";
      return {
        direction: `Você informou que ${reportedLimit}. O Meio do Céu em ${sign} propõe examinar se é possível ${scopedAction}. Faça essa verificação em uma atividade ao seu alcance, sem tratar uma nova formação como condição.`,
        workMode: `Com tempo e recursos já disponíveis, escolha uma atividade breve em que seja possível ${scopedAction}. Combine um critério de retorno antes de realizá-la; uma formação adicional não é pressuposto para esse teste.`,
        tension: `${frame.risk} A hipótese precisa caber nas condições que você relatou; se a atividade exigir uma preparação que você não escolheu, ajuste ou descarte a proposta.`,
        synthesis: `${scopedAction.startsWith("experimentar ") ? "Escolha uma atividade breve para" : "Experimente"} ${scopedAction}. Confira ${frame.marker} e use o resultado para decidir um próximo passo ${studyBoundary}.`,
        questions: [question, `Que recurso disponível permitiria ${withConstraint(frame.action, "sem exigir nova formação")}?`, "O que você observaria nessa atividade para decidir se vale continuar?"],
      };
    }
    case "leadershipInvitation":
      if (signals.noLeadership) {
        return {
          direction: `O convite para liderar equipe que você recebeu encontra um limite claro: você disse que não quer liderar. O Meio do Céu em ${sign} permite examinar se ${frame.action} cabe em uma contribuição sem assumir liderança formal.`,
          workMode: `Ao examinar o convite, peça uma descrição das atribuições e do apoio disponível para ${frame.action}. Uma entrega delimitada só cabe no limite que você informou se não exigir gestão de pessoas.`,
          tension: `${frame.risk} O título do convite e as tarefas reais podem não coincidir; verifique se a proposta respeita seu limite de não liderar equipe.`,
          synthesis: `Antes de responder ao convite, compare as atribuições oferecidas com o limite que informou. Se houver uma atividade curta para ${withConstraint(frame.action, "sem liderança formal")}, confira ${frame.marker}; esse teste não equivale a aceitar o cargo.`,
          questions: [
            `Que parte do convite, se houver, permitiria ${withConstraint(frame.action, "sem liderar equipe")}?`,
            "Quais atribuições do convite exigiriam gestão de pessoas, contrariando seu limite?",
            `Que atividade curta ajudaria a conferir ${withConstraint(frame.marker, "sem aceitar o cargo de liderança")}?`,
          ],
        };
      }
      return {
        direction: `No convite para liderar que você relatou, o Meio do Céu em ${sign} sugere verificar se ${frame.action} cabe nas atribuições propostas. O convite, por si só, não indica que aceitá-lo seja adequado.`,
        workMode: `Peça a descrição do tempo, apoio e autoridade para ${frame.action} na função oferecida. Compare esses recursos com uma entrega delimitada antes de ampliar o papel.`,
        tension: `${frame.risk} Um título pode concentrar tarefas sem autoridade real; confira o que seria seu e o que continuaria com outras pessoas no convite recebido.`,
        synthesis: `Antes de responder ao convite, negocie uma atividade curta para ${frame.action}, com prazo e retorno definidos. Observe ${frame.marker} e se as condições do papel sustentam esse resultado.`,
        questions: [question, `Que apoio e decisão viriam com o convite para ${frame.action}?`, `Que teste curto ajudaria a verificar ${frame.marker} antes de aceitar o papel inteiro?`],
      };
    case "team":
      return {
        direction: `Na colaboração com a equipe que você relatou, o Meio do Céu em ${sign} propõe verificar como ${frame.action} pode contribuir para uma decisão compartilhada${signals.noLeadership ? ", sem assumir liderança formal" : ", sem presumir chefia"}.`,
        workMode: `Em uma tarefa da equipe com responsáveis identificados, combine quem usará a entrega que permite ${frame.action} e peça retorno sobre ela${signals.noLeadership ? ", sem assumir liderança formal" : ""}.`,
        tension: `${frame.risk} Nessa equipe, confira se a divisão das próximas etapas corresponde ao acordo${signals.noLeadership ? " e respeita seu limite de não liderar equipe" : " e não concentra o trabalho em uma pessoa"}.`,
        synthesis: `Combine uma etapa pequena para ${frame.action} com a equipe, registre quem decide e quem executa${signals.noLeadership ? ", sem assumir liderança formal;" : " e"} verifique ${frame.marker}.`,
        questions: [signals.noLeadership ? "Que contribuição você pode fazer em equipe sem assumir liderança formal?" : question, `Que divisão de tarefas da equipe permitiria ${withConstraint(frame.action, signals.noLeadership ? "sem liderar equipe" : "sem concentrar o trabalho")}?`, `Que etapa da equipe ajudaria a verificar ${signals.noLeadership ? withConstraint(frame.marker, "sem assumir gestão de pessoas") : frame.marker}?`],
      };
    case "creativePractice":
      if (signals.creativeKind === "ceramics") {
        return {
          direction: `Na prática de cerâmica que você relatou, o Meio do Céu em ${sign} propõe examinar se é possível ${scopedAction} ao planejar uma peça simples. Um esboço mostra a intenção da peça; ainda não demonstra habilidade de modelagem ou acesso à queima.${signals.missingCeramicClay ? " Você informou que não tem argila no momento; a modelagem não faz parte deste primeiro teste." : ""}`,
          workMode: `Desenhe uma peça simples e registre tamanho, uso e etapas de modelagem, secagem e queima. ${signals.missingCeramicClay ? "Sem argila, use o desenho para planejar e anote o material necessário antes de tentar modelar." : "Se houver argila e espaço adequados, modele um protótipo para observar a execução."} ${signals.missingCeramicFiringAccess ? "Como você relatou não ter acesso à queima, deixe essa etapa fora do teste atual." : "Não pressuponha equipamento de queima disponível."}`,
          tension: `${frame.risk} O esboço pode parecer resolvido no papel e ainda exigir ajustes no contato com o material. ${signals.missingCeramicClay ? "Sem argila, não há como verificar a modelagem agora; não chame o desenho de peça pronta." : "Se não houver condições para modelar, registre essa limitação em vez de chamar o projeto de peça pronta."}`,
          synthesis: `No esboço, indique quem usaria a peça e que observação numa peça concluída poderia mostrar ${frame.marker}. ${signals.missingCeramicClay ? "Registre o que a falta de argila impede de avaliar e retome a modelagem apenas se essa condição mudar." : "Se puder modelar com segurança, compare o protótipo ao desenho e anote o que mudou."} ${signals.missingCeramicFiringAccess ? "A queima fica fora deste teste enquanto não houver acesso real a equipamento e orientação." : "A queima só entra no teste quando houver acesso real a equipamento e orientação."}`,
          questions: [
            `Que peça simples permitiria examinar como ${scopedAction}?`,
            signals.missingCeramicClay ? "Que tamanho e função você consegue definir no desenho enquanto não há argila?" : "Que materiais, espaço e acesso à queima você tem de fato para essa prática?",
            "Que parte da ideia só poderá ser conferida depois da modelagem e da queima?",
          ],
        };
      }
      return {
        direction: `Na ${signals.creativeKind === "editorialIllustration" ? "ilustração editorial" : signals.creativeKind === "illustration" ? "ilustração" : "prática criativa"} que você relatou, o Meio do Céu em ${sign} sugere verificar se é possível ${scopedAction} por meio de uma peça pequena que outra pessoa possa avaliar.`,
        workMode: `Escolha materiais, tempo e um formato disponíveis para ${scopedAction}; defina antes para quem ${signals.creativeKind ? "a ilustração" : "a peça"} seria útil.`,
        tension: `${frame.risk} ${signals.creativeKind ? "A ilustração" : "Uma peça"} pode estar pronta para você e ainda não comunicar o que pretendia; peça retorno específico antes de ampliar a produção.`,
        synthesis: `Produza uma amostra curta ${signals.creativeKind === "editorialIllustration" ? "de ilustração editorial" : signals.creativeKind === "illustration" ? "de ilustração" : "da prática criativa"} para ${scopedAction}, colha retorno sobre o uso e confira ${frame.marker} antes de criar outra versão.`,
        questions: [signals.creativeKind ? "Que amostra de ilustração poderia mostrar sua contribuição?" : question, `Que materiais e tempo permitiriam ${scopedAction}?`, `Que amostra permitiria conferir ${frame.marker}?`],
      };
    case "change":
      return {
        direction: `Na mudança de rotina que você trouxe, o Meio do Céu em ${sign} aponta um teste limitado: verificar como ${withConstraint(scopedAction, "sem refazer todo o trabalho")}.`,
        workMode: `Compare uma etapa atual com uma alternativa para ${frame.action}; use o mesmo critério de qualidade, prazo e esforço nas duas.`,
        tension: `${frame.risk} A nova rotina pode resolver um incômodo e criar outro; registre o custo da alternativa antes de ampliá-la.`,
        synthesis: `Altere uma etapa por pouco tempo para ${scopedAction}, confira ${frame.marker} e decida se mantém, ajusta ou desfaz a mudança.`,
        questions: [question, `Que condição atual precisaria ser preservada ao ${frame.action}?`, `Como compararia uma tentativa curta para verificar ${frame.marker}?`],
      };
    case "noLeadership":
      return {
        direction: `Você informou que não quer liderar equipe. O Meio do Céu em ${sign} oferece uma hipótese para examinar: ${scopedAction}.`,
        workMode: `Procure autonomia sobre uma tarefa delimitada para ${frame.action} e retorno de quem receberá a entrega, sem exigir um cargo de chefia.`,
        tension: `${frame.risk} Visibilidade não obriga a assumir coordenação permanente; confira esse limite em qualquer proposta de responsabilidade.`,
        synthesis: `Defina uma entrega curta para ${scopedAction}; combine o alcance e verifique ${frame.marker}.`,
        questions: [question, `Que autonomia permitiria ${withConstraint(frame.action, "sem assumir gestão de pessoas")}?`, `Que entrega breve ajudaria a verificar ${withConstraint(frame.marker, "sem liderar equipe")}?`],
      };
    case "keepLeadership":
      return {
        direction: `Você relatou que deseja continuar liderando equipe. O Meio do Céu em ${sign} oferece uma hipótese para examinar dentro dessa escolha: ${frame.action}. Essa hipótese não exige ampliar seu cargo.`,
        workMode: `No trabalho de liderança que deseja manter, escolha uma decisão delimitada para ${frame.action}. Confira tempo, apoio e autoridade antes de assumir uma nova obrigação.`,
        tension: `${frame.risk} Continuar liderando não exige aceitar toda demanda adicional; separe a responsabilidade atual do que ainda precisaria ser negociado.`,
        synthesis: `Escolha uma etapa da liderança que deseja manter para ${frame.action}; confira ${frame.marker}. Considere o apoio disponível e decida se algum ajuste cabe no seu papel.`,
        questions: [question, `Na liderança que deseja manter, que apoio permitiria ${frame.action}?`, `Que decisão breve ajudaria a verificar ${withConstraint(frame.marker, "dentro de suas atribuições atuais")}?`],
      };
    case "stayCurrent":
      return {
        direction: `Você informou que não busca mudar de emprego. O Meio do Céu em ${sign} propõe observar se há espaço para ${scopedAction}, sem presumir troca de cargo.`,
        workMode: `Examine a autonomia e os recursos já disponíveis para ${frame.action} no trabalho atual; se não houver espaço, isso limita o teste.`,
        tension: `${frame.risk} Melhorar uma etapa não obriga a ampliar seu papel; diferencie a tentativa pontual de uma responsabilidade permanente.`,
        synthesis: `Escolha uma pequena etapa para ${scopedAction} e confira ${frame.marker}. Se não houver condições, não trate esse limite como falha sua.`,
        questions: [question, `Que recurso disponível permitiria ${frame.action} no trabalho atual?`, `Que ajuste reversível ajudaria a verificar ${withConstraint(frame.marker, "sem mudar de emprego")}?`],
      };
    case "stayCareer":
      return {
        direction: `Você informou que não quer mudar de ${preservedPath}. O Meio do Céu em ${sign} sugere examinar se é possível ${scopedAction} no caminho profissional que deseja manter.`,
        workMode: `Observe que recursos, tempo e autonomia já existem para ${frame.action} na ${preservedPath} atual. Se não houver espaço, esse limite precisa entrar na avaliação.`,
        tension: `${frame.risk} Permanecer na ${preservedPath} não obriga a assumir uma função maior; diferencie um ajuste escolhido de uma nova exigência permanente.`,
        synthesis: `Escolha uma atividade pequena dentro da ${preservedPath} atual que permita ${frame.action}, confira ${frame.marker} e decida se o ajuste cabe nas condições disponíveis.`,
        questions: [`Que contribuição você gostaria de examinar na ${preservedPath} que deseja manter?`, `Que recurso permitiria ${withConstraint(frame.action, `sem mudar de ${preservedPath}`)}?`, `Que ajuste reversível ajudaria a verificar ${frame.marker} na ${preservedPath} atual?`],
      };
    case "independent":
      return {
        direction: `Você mencionou preferência por trabalhar sem equipe. O Meio do Céu em ${sign} pode ser examinado ao ${frame.action} em uma entrega individual, preservando só as trocas necessárias para conferir o resultado.`,
        workMode: `Escolha uma atividade individual com objetivo e critério de retorno definidos para ${frame.action}; autonomia não elimina a necessidade de conferir a entrega.`,
        tension: `${frame.risk} O trabalho independente pode reduzir retorno útil; combine uma única consulta objetiva sem exigir trabalho contínuo em equipe.`,
        synthesis: `Defina uma entrega individual curta para ${frame.action}, peça uma revisão objetiva de quem usará o resultado e observe ${frame.marker}.`,
        questions: [question, `Que atividade individual permitiria ${frame.action}?`, `Que entrega individual curta ajudaria a verificar ${frame.marker}?`],
      };
  }
}

/** Pure composition. The caller must obtain this envelope from prepareProductFacts. */
export function composeCareerCompassCandidate(
  facts: FactsEnvelope,
): Reading | null {
  if (
    facts?.version !== "atv-facts/1.0.0" ||
    !validCareerCompassFacts(facts) ||
    facts.editorialProfile !== CAREER_COMPASS_EDITORIAL_VERSION ||
    facts.facts.filter((fact) => fact.id === "angle-midheaven").length !== 1 ||
    facts.facts.filter((fact) => fact.id === "personal-context").length > 1
  )
    return null;
  const midheaven = facts.facts.find((fact) => fact.id === "angle-midheaven")!;
  const context = facts.facts.find((fact) => fact.id === "personal-context");
  if (context && context.source !== "input.context") return null;
  const sign = /^Meio do Céu: \d{1,2}\.\d{6}° de (.+)$/.exec(
    midheaven.display,
  )?.[1];
  const authored =
    sign && Object.hasOwn(bySign, sign) ? bySign[sign] : undefined;
  if (!authored) return null;
  const signals = contextSignals(context?.display);
  const interpreted = signals ? contextualReading(sign!, signals) : authored;
  const supportedBy = signals
    ? ["angle-midheaven", "personal-context"]
    : ["angle-midheaven"];
  return {
    schemaVersion: SCHEMA_VERSION,
    capability: facts.capability,
    scope: "partial",
    title: `Bússola de Carreira · Meio do Céu em ${sign}`,
    claims: [
      {
        id: "midheaven-fact",
        kind: "fact",
        text: midheaven.display,
        evidence: ["angle-midheaven"],
      },
      ...(context
        ? [
            {
              id: "reported-context",
              kind: "fact" as const,
              text: context.display,
              evidence: ["personal-context"],
            },
          ]
        : []),
      {
        id: "public-direction",
        kind: "hypothesis",
        text: interpreted.direction,
        evidence: supportedBy,
      },
      {
        id: "work-possibilities",
        kind: "hypothesis",
        text: interpreted.workMode,
        evidence: supportedBy,
      },
      {
        id: "tension-or-excess",
        kind: "hypothesis",
        text: interpreted.tension,
        evidence: supportedBy,
      },
    ],
    relations: [],
    synthesis: [
      {
        claimIds: [
          "public-direction",
          "work-possibilities",
          "tension-or-excess",
        ],
        text: interpreted.synthesis,
      },
    ],
    reflections: signals
      ? [...interpreted.questions]
      : [
          authored.questions[0],
          authored.questions[1],
          context
            ? `Qual parte da situação que você relatou poderia ser observada neste teste?`
            : authored.questions[2].charAt(0).toLocaleUpperCase("pt-BR") +
              authored.questions[2].slice(1),
        ],
    limits: [
      "A base calculada aqui contém apenas o signo e o grau experimentais do Meio do Céu; Ascendente, casas, regentes e aspectos não foram avaliados.",
      "Esta é uma leitura simbólica parcial, sem garantia global de precisão ou indicação de profissão, emprego e renda.",
      "Formação, território, condições sociais, saúde, oportunidades e escolhas concretas também participam da vida profissional.",
      ...(context && !signals
        ? ["O contexto foi preservado como relato, mas seu tema não foi classificado com segurança para orientar as hipóteses desta versão."]
        : []),
    ],
  };
}

export interface CareerCompassCandidateInput {
  runId: string;
  revision: number;
  tier: Tier;
  calculation: unknown;
}

/** Creates reviewable content from the product calculation without issuing a receipt or changing a run. */
export async function prepareCareerCompassCandidate(
  input: CareerCompassCandidateInput,
) {
  const blocked = (reason: string) => ({
    status: "blocked" as const,
    publication: "blocked" as const,
    reason,
  });
  if (!input || typeof input !== "object") return blocked("invalid_input");
  const prepared = prepareProductFacts("career-compass", input.calculation);
  if (prepared.status === "blocked") return blocked(prepared.reason);
  const output = composeCareerCompassCandidate(prepared.facts);
  if (!output) return blocked("candidate_not_representable");
  const draft: ProductDraft = {
    runId: input.runId,
    revision: input.revision,
    productId: "career-compass",
    tier: input.tier,
    calculation: prepared.calculation,
    output,
  };
  const assessment: ProductDraftAssessment = await evaluateProductDraft(draft);
  if (
    assessment.status !== "needs_editorial_review" ||
    !assessment.basisDigest ||
    !assessment.outputDigest
  )
    return blocked(assessment.reason);
  const delivery = await prepareProductDelivery(draft);
  if (
    delivery.status !== "prepared_for_review" ||
    delivery.basisDigest !== assessment.basisDigest ||
    delivery.outputDigest !== assessment.outputDigest
  )
    return blocked(delivery.reason);
  // This binds the author's version to the reviewed basis and delivery. It is an
  // integrity digest, not a reviewer signature or a publication credential.
  const candidateBytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(
      JSON.stringify({
        version: CAREER_COMPASS_CANDIDATE_VERSION,
        basisDigest: assessment.basisDigest,
        outputDigest: assessment.outputDigest,
        deliveryDigest: delivery.deliveryDigest,
      }),
    ),
  );
  const candidateDigest = Array.from(new Uint8Array(candidateBytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return {
    status: "prepared_for_review" as const,
    publication: "blocked" as const,
    version: CAREER_COMPASS_CANDIDATE_VERSION,
    candidateDigest,
    facts: prepared.facts,
    reading: output,
    assessment,
    delivery,
  };
}
