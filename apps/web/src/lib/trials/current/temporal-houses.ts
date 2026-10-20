import { bodyNames } from '../reconstruction/canon';
import { aspectNames } from '../reconstruction/date-facts';
import type { Position } from '../reconstruction/fact-graph';

type HouseRelation = { support: string; friction: string; purpose: string };
const pair = (support: string, friction: string, purpose: string): HouseRelation => ({
	support,
	friction,
	purpose
});

/** Original editorial relations, not geometric aspects between house numbers. */
const relations: Record<string, HouseRelation> = {
	'1:1': pair(
		'Uma iniciativa pode reunir expressão pessoal e resposta a uma necessidade que antes ficava sem lugar. A forma de começar já comunica o que você pretende preservar.',
		'Quando toda necessidade pede uma resposta imediata, apresentar sua posição pode se confundir com reagir antes de compreender a situação.',
		'iniciar de um modo que represente sua vontade sem exigir uma resposta instantânea a tudo'
	),
	'1:2': pair(
		'A autonomia ganha sustentação quando a iniciativa respeita o tempo, os recursos e as capacidades que você pode oferecer. Reconhecer esse limite torna a escolha própria mais viável.',
		'A pressa de afirmar independência pode levar a oferecer mais do que cabe; preservar recursos, por sua vez, pode virar motivo para nunca começar.',
		'dar forma à autonomia com uma medida de investimento que possa continuar'
	),
	'1:3': pair(
		'Uma iniciativa fica mais compreensível quando encontra palavras simples para explicar sua intenção. A conversa também pode corrigir o rumo antes que uma primeira reação se torne posição definitiva.',
		'Agir antes de explicar pode criar uma leitura que não representa sua intenção; explicar indefinidamente pode ocupar o lugar da iniciativa.',
		'fazer a maneira de se apresentar conversar com aquilo que você consegue explicar'
	),
	'1:4': pair(
		'Uma base íntima suficientemente estável pode dar liberdade para se apresentar de outro modo. A mudança ganha continuidade quando existe um lugar de recolhimento que não exige abandonar a escolha própria.',
		'A necessidade de preservar o familiar pode frear uma iniciativa; afirmar autonomia pode parecer exigir romper com toda forma de apoio.',
		'assumir uma posição própria preservando uma base à qual possa retornar'
	),
	'1:5': pair(
		'Experimentar algo pelo prazer de criar pode revelar uma forma de se apresentar que ainda não estava pronta em palavras. A iniciativa encontra autoria quando permite uma expressão que não depende de aplauso imediato.',
		'Se cada tentativa precisar confirmar seu valor, o receio de não agradar pode reduzir justamente a espontaneidade que daria vida à iniciativa.',
		'iniciar e criar sem transformar cada tentativa numa prova de valor pessoal'
	),
	'1:6': pair(
		'O modo de começar encontra consequência na rotina: uma escolha própria ganha consistência quando cabe nas tarefas e no esforço que você consegue repetir.',
		'Uma iniciativa que depende de esforço excepcional pode perder continuidade; a rotina também pode ficar tão rígida que não comporte uma nova escolha.',
		'dar continuidade à iniciativa por meio de um ritmo cotidiano possível'
	),
	'1:7': pair(
		'Uma posição própria mais clara oferece à outra pessoa algo real com que negociar. O acordo pode ampliar sua liberdade quando torna explícito o que cada parte assume.',
		'Fazer valer sua posição pode parecer incompatível com considerar o outro; ceder para manter o acordo pode deixar sua participação sem vontade própria.',
		'participar de acordos em que sua iniciativa e a resposta da outra pessoa tenham lugar'
	),
	'1:8': pair(
		'Afirmar sua posição ajuda a tornar mais clara a divisão de confiança e responsabilidade. A intimidade pode aprofundar a autonomia quando compartilhar não significa perder o direito de escolher.',
		'O desejo de decidir por si pode encontrar obrigações compartilhadas; tentar resolver essa dependência controlando tudo estreita a confiança que permitiria negociar.',
		'compartilhar confiança e responsabilidade conservando voz sobre a própria participação'
	),
	'1:9': pair(
		'Uma nova perspectiva pode dar sentido a uma iniciativa, enquanto a experiência de começar mostra quais convicções conseguem acompanhar a prática.',
		'Uma ideia ampla pode virar certeza antes de ser vivida; esperar uma visão completa do caminho também pode adiar indefinidamente o primeiro passo.',
		'iniciar com uma direção de sentido que aceite ser ampliada pela experiência'
	),
	'1:10': pair(
		'A maneira de se posicionar pode dar uma expressão concreta à direção profissional. Assumir uma escolha e sustentar sua consequência pública passam a fazer parte do mesmo movimento.',
		'O papel que parece necessário ocupar pode sufocar uma iniciativa própria; querer afirmar diferença a qualquer custo pode dificultar uma responsabilidade que você deseja manter.',
		'fazer sua presença pública corresponder à posição que consegue assumir pessoalmente'
	),
	'1:11': pair(
		'Uma iniciativa pessoal pode oferecer contribuição ao grupo, e a troca com outras pessoas pode dar continuidade ao que seria difícil sustentar sozinho.',
		'Pertencer pode parecer depender de diluir sua posição; defender a iniciativa como propriedade exclusiva pode impedir a colaboração que a faria crescer.',
		'participar de um projeto coletivo sem perder a autoria da própria contribuição'
	),
	'1:12': pair(
		'Um período de elaboração reservada pode tornar a iniciativa mais consciente. Recolher-se não precisa apagar sua presença: pode permitir que a próxima resposta represente melhor o que você quer.',
		'A exigência de responder prontamente pode interromper uma elaboração necessária; o recolhimento também pode prolongar uma decisão que já ganhou clareza suficiente.',
		'dar tempo à elaboração sem abandonar a possibilidade de se posicionar'
	),
	'2:2': pair(
		'O que você valoriza pode encontrar uma medida mais concreta no modo de usar dinheiro, tempo e capacidade. Preservar recursos passa a ter sentido quando protege uma escolha que vale a pena sustentar.',
		'Quando segurança e valor pessoal se concentram naquilo que você consegue oferecer, um limite material pode parecer uma diminuição de quem você é.',
		'distinguir o valor da sua participação da quantidade de recursos que consegue oferecer'
	),
	'2:3': pair(
		'Nomear o que você sabe fazer e quanto pode oferecer torna mais claras as trocas próximas. A conversa dá contorno ao valor para que uma disponibilidade não seja confundida com obrigação ilimitada.',
		'Uma conversa vaga sobre tempo ou recursos pode criar expectativas que custam mais do que parecia; evitar falar do valor da própria participação deixa o acordo incompleto.',
		'tornar negociável o valor do seu tempo e das suas capacidades'
	),
	'2:4': pair(
		'Uma base íntima mais estável pode ajudar a escolher o que merece investimento. Preservar recursos também pode proteger o espaço de descanso e pertencimento que sustenta outras escolhas.',
		'A busca de segurança pode tornar difícil distinguir aquilo que sustenta sua vida daquilo que você mantém apenas porque é familiar.',
		'usar recursos para sustentar uma base íntima que ofereça apoio, sem imobilizar todas as escolhas'
	),
	'2:5': pair(
		'O prazer de criar pode revelar uma capacidade que merece tempo e investimento. Dar uma medida ao gasto permite que a expressão continue sem precisar justificar cada tentativa pelo retorno que produz.',
		'Cobrar utilidade imediata de toda criação pode empobrecer o prazer; investir apenas pelo entusiasmo pode comprometer recursos que sustentariam novas tentativas.',
		'dar espaço e recursos à criação sem exigir que todo prazer comprove seu valor'
	),
	'2:6': pair(
		'O valor do seu trabalho se torna mais claro quando inclui o tempo e a energia necessários para realizá-lo. Uma rotina possível ajuda a conservar capacidade em vez de tratá-la como recurso inesgotável.',
		'Oferecer disponibilidade para provar competência pode consumir a própria capacidade de continuar. Reduzir toda tarefa ao que ela rende também pode esconder o esforço real que exige.',
		'reconhecer o custo de esforço de uma tarefa ao decidir o que pode oferecer'
	),
	'2:7': pair(
		'Acordos mais claros podem proteger o valor da participação de cada pessoa. O vínculo ganha reciprocidade quando tempo e recursos oferecidos não precisam ser adivinhados.',
		'Concordar para preservar a relação pode custar mais do que você consegue oferecer; proteger recursos sem explicar a medida pode ser recebido como falta de disponibilidade.',
		'negociar presença, tempo e recursos sem usar a concessão como prova de vínculo'
	),
	'2:8': pair(
		'Reconhecer o que é seu torna mais claro o que pode ser compartilhado. A confiança ganha consistência quando dividir recursos inclui explicitar limites e responsabilidade.',
		'Uma partilha pode comprometer a autonomia se não houver clareza sobre quem decide e quem sustenta o custo; preservar tudo individualmente pode impedir uma troca que faria sentido.',
		'distinguir autonomia material e responsabilidade compartilhada dentro da mesma troca'
	),
	'2:9': pair(
		'Um horizonte de aprendizagem pode orientar onde vale a pena investir tempo e recursos. A medida concreta do investimento ajuda a transformar interesse numa possibilidade que pode ser sustentada.',
		'O entusiasmo por ampliar horizontes pode ignorar o custo de continuidade; exigir segurança completa pode impedir o aprendizado que mudaria sua avaliação de valor.',
		'dar recursos a uma possibilidade de crescimento sem tratar entusiasmo como garantia de retorno'
	),
	'2:10': pair(
		'A direção profissional ganha consistência quando corresponde às capacidades que você reconhece e ao investimento que consegue manter. O reconhecimento público pode acompanhar esse valor sem precisar defini-lo sozinho.',
		'Buscar reconhecimento pode levar a aceitar uma responsabilidade cujo custo não cabe; medir sua capacidade apenas pelo lugar ocupado torna difícil reconhecer valor antes da aprovação externa.',
		'escolher responsabilidades profissionais compatíveis com seus recursos e com o valor que reconhece no trabalho'
	),
	'2:11': pair(
		'Uma contribuição concreta ajuda um projeto coletivo a sair da intenção. A cooperação se torna mais justa quando a divisão de tempo e recursos acompanha o que cada pessoa pode sustentar.',
		'A vontade de pertencer pode levar a bancar mais do que lhe cabe; tratar toda contribuição como perda individual pode impedir o apoio que o grupo conseguiria oferecer.',
		'contribuir para um futuro compartilhado com uma medida de investimento que preserve sua autonomia'
	),
	'2:12': pair(
		'Preservar tempo e espaço de recolhimento pode ajudar a reconhecer o que ainda merece investimento. Nem toda capacidade precisa estar permanentemente disponível para manter seu valor.',
		'Uma exigência constante de produzir pode consumir a reserva necessária para elaborar escolhas; recuar sem reconhecer os compromissos materiais também pode deixar custos sem medida.',
		'conservar recursos e tempo de elaboração sem confundir pausa com perda de valor'
	),
	'3:3': pair(
		'Conversar e aprender podem se alimentar quando uma pergunta modifica a maneira de explicar. O entendimento ganha profundidade quando há espaço para esclarecer a diferença entre as versões de uma mesma situação.',
		'A circulação de muitas explicações pode dar a impressão de avanço sem que uma dúvida central tenha sido realmente compreendida.',
		'usar a troca para chegar a um entendimento que acrescente algo ao que já era sabido'
	),
	'3:4': pair(
		'Encontrar palavras para uma necessidade íntima pode tornar o apoio mais acessível. A conversa se aprofunda quando a familiaridade permite perguntar sem presumir que tudo já foi entendido.',
		'O que parece óbvio por ser familiar pode permanecer sem explicação; uma conversa apressada pode expor algo íntimo antes de existir confiança suficiente.',
		'dar palavras ao que precisa de acolhimento preservando o tempo e a privacidade dessa conversa'
	),
	'3:5': pair(
		'Uma ideia pode ganhar expressão por meio da conversa, e a criação pode oferecer uma linguagem para o que seria difícil explicar diretamente.',
		'Buscar a resposta certa pode restringir a experimentação; querer impressionar pode deixar em segundo plano aquilo que você queria de fato comunicar.',
		'deixar a expressão criativa esclarecer sua voz sem submetê-la apenas à reação alheia'
	),
	'3:6': pair(
		'Uma informação bem compartilhada pode evitar esforço repetido. A rotina também mostra quais explicações funcionam quando precisam orientar uma tarefa concreta.',
		'Trocas constantes podem fragmentar o tempo de execução; uma organização rígida pode impedir a pergunta que revelaria um modo mais simples de trabalhar.',
		'fazer informação e rotina se ajudarem sem deixar a conversa ocupar todo o tempo de execução'
	),
	'3:7': pair(
		'Uma diferença de entendimento pode se tornar negociável quando cada pessoa consegue explicar o que está propondo. O diálogo dá substância ao acordo, além de produzir uma concordância aparente.',
		'Ouvir apenas para responder pode transformar negociação em disputa de versão; concordar com palavras vagas pode esconder expectativas diferentes.',
		'construir acordos em que compreender a posição do outro não exija apagar a sua'
	),
	'3:8': pair(
		'Uma conversa precisa pode esclarecer o que será dividido e quais limites protegem a confiança. Nomear uma responsabilidade difícil pode aprofundar a troca sem exigir acesso a toda a intimidade.',
		'Perguntar pode se confundir com investigar para obter controle; evitar o assunto para preservar a confiança pode deixar uma responsabilidade compartilhada indefinida.',
		'conversar sobre confiança e partilha distinguindo esclarecimento de exigência de exposição'
	),
	'3:9': pair(
		'Uma pergunta concreta pode revisar uma convicção ampla, enquanto uma visão de conjunto ajuda a perceber por que um detalhe importa. Aprender passa a ser uma troca entre informação e sentido.',
		'Uma convicção pronta pode dispensar os detalhes que a contradizem; acumular informações sem uma pergunta de fundo pode impedir que o conhecimento ganhe direção.',
		'ligar o que você aprende nos detalhes ao sentido que dá ao conjunto'
	),
	'3:10': pair(
		'Explicar uma escolha profissional ajuda a tornar sua responsabilidade compreensível. As conversas do cotidiano podem revelar o que precisa ser esclarecido para que a direção deixe de existir apenas como intenção.',
		'Precisar parecer seguro pode dificultar admitir uma dúvida; reformular continuamente a explicação pode adiar uma posição que já precisa ser assumida.',
		'comunicar sua direção profissional com clareza suficiente para assumir suas consequências'
	),
	'3:11': pair(
		'A circulação de ideias pode dar forma a um projeto coletivo quando a troca permite distinguir contribuição, decisão e responsabilidade. O grupo amplia a compreensão sem precisar pensar de modo uniforme.',
		'Muitas conversas podem produzir uma sensação de consenso que não corresponde a compromissos definidos; preservar a concordância pode empobrecer a pergunta que faria o projeto avançar.',
		'transformar a troca de ideias em entendimento compartilhado sobre um projeto'
	),
	'3:12': pair(
		'Um intervalo de silêncio pode dar forma ao que ainda não encontrou palavras. A conversa ganha precisão quando respeita o tempo de elaboração, sem exigir que toda impressão se torne explicação imediata.',
		'O esforço de explicar antes de compreender pode aumentar a confusão; deixar tudo em silêncio pode impedir que uma necessidade já reconhecida seja comunicada.',
		'encontrar palavras depois de dar tempo à experiência, preservando a possibilidade de conversar'
	),
	'4:4': pair(
		'Uma base íntima pode acolher mais de uma necessidade ao mesmo tempo. O pertencimento se torna mais vivo quando o espaço familiar permite mudar de posição sem perder todo o apoio.',
		'Proteger o que é familiar pode dificultar perceber quando uma forma de apoio já não corresponde ao que você precisa.',
		'encontrar continuidade íntima que comporte mudanças nas suas necessidades'
	),
	'4:5': pair(
		'Uma sensação de base pode permitir experimentar sem que cada tentativa precise dar certo. A criação também pode renovar o espaço íntimo ao dar expressão a um gosto próprio.',
		'A necessidade de preservar o familiar pode conter a espontaneidade; buscar prazer apenas fora da vida íntima pode deixar a base sem espaço para a sua expressão.',
		'abrir espaço para autoria e prazer dentro de uma vida íntima que ofereça apoio'
	),
	'4:6': pair(
		'O cotidiano pode proteger a base íntima quando tarefas e descanso têm uma medida possível. O apoio deixa de ser apenas uma ideia quando aparece na maneira de dividir o esforço diário.',
		'Uma rotina que ocupa tudo pode consumir o espaço de recolhimento; preservar a tranquilidade a qualquer custo pode deixar tarefas necessárias concentradas ou adiadas.',
		'organizar o esforço cotidiano de modo que ele também sustente descanso e pertencimento'
	),
	'4:7': pair(
		'Um acordo pode oferecer apoio quando deixa claro o que cada pessoa considera uma base segura. O vínculo ganha intimidade sem exigir que as duas partes tenham a mesma história ou o mesmo modo de habitar.',
		'O que para você parece familiar e acolhedor pode não ter o mesmo significado para outra pessoa; presumir essa equivalência deixa necessidades importantes fora do acordo.',
		'construir apoio numa relação que reconheça diferentes necessidades de intimidade'
	),
	'4:8': pair(
		'Uma base íntima pode dar sustentação a conversas sobre dependência e partilha. Dividir responsabilidades com clareza permite aprofundar a confiança sem transformar pertencimento em obrigação de entregar tudo.',
		'O receio de perder apoio pode tornar difícil nomear um limite; a tentativa de garantir segurança pelo controle pode estreitar o espaço íntimo que se queria proteger.',
		'aprofundar a confiança preservando limites dentro daquilo que oferece pertencimento'
	),
	'4:9': pair(
		'Um horizonte mais amplo pode renovar aquilo que você entende como base. O apoio íntimo pode acompanhar uma mudança de perspectiva sem depender da conservação de todas as antigas certezas.',
		'Uma nova convicção pode parecer ameaçar o pertencimento; manter uma visão apenas por familiaridade pode restringir uma aprendizagem que já pede espaço.',
		'ampliar sua visão de mundo sem tratar a mudança de perspectiva como perda automática de pertencimento'
	),
	'4:10': pair(
		'A direção pública pode ganhar consistência quando tem uma base íntima que a sustenta. O reconhecimento se torna mais habitável quando a responsabilidade deixa espaço para uma vida que não está em exposição.',
		'Uma exigência de desempenho pode consumir o apoio de que você depende para continuar; proteger a intimidade pode parecer incompatível com assumir uma posição visível.',
		'assumir responsabilidades públicas que deixem uma base íntima suficiente para sustentá-las'
	),
	'4:11': pair(
		'Um grupo pode ampliar a sensação de apoio sem substituir todos os espaços íntimos. Um projeto de futuro ganha consistência quando considera a base de vida necessária para acompanhá-lo.',
		'Pertencer ao grupo pode exigir uma disponibilidade que reduz o espaço privado; preservar a familiaridade pode tornar difícil acolher vínculos que ampliariam seu horizonte.',
		'construir pertencimento coletivo conservando um espaço íntimo próprio'
	),
	'4:12': pair(
		'Um espaço íntimo protegido pode permitir elaborar sentimentos que ainda não precisam ser explicados. O recolhimento ganha sustentação quando existe apoio sem a exigência de exposição imediata.',
		'O isolamento pode parecer a única maneira de preservar a intimidade; a busca de acolhimento pode também trazer pressão para falar antes de compreender o que sente.',
		'recolher-se com apoio suficiente, sem confundir privacidade com a obrigação de ficar sozinho'
	),
	'5:5': pair(
		'O prazer pode dar energia à expressão, e criar pode tornar mais claro o que você deseja viver. Uma tentativa ganha valor pelo envolvimento que permite, antes de depender de aprovação.',
		'A vontade de ser reconhecido pode ocupar o lugar do prazer e transformar a expressão numa apresentação permanente de valor.',
		'dar espaço ao desejo de criar sem fazer da resposta alheia a única medida da experiência'
	),
	'5:6': pair(
		'Uma rotina que reserva espaço para experimentar permite que a criação continue além do entusiasmo inicial. O prazer pode tornar o esforço mais vivo sem precisar apagar o trabalho que ele exige.',
		'A cobrança de eficiência pode retirar o espaço da tentativa; depender apenas da inspiração pode deixar sem continuidade algo que você gostaria de desenvolver.',
		'dar continuidade ao prazer de criar por meio de uma rotina que conserve espaço para experimentar'
	),
	'5:7': pair(
		'Uma relação pode acolher uma expressão própria sem precisar reproduzi-la. O encontro se torna mais interessante quando o prazer compartilhado comporta diferenças de gosto e de iniciativa.',
		'O desejo de agradar pode limitar sua expressão; afirmar uma preferência sem considerar a outra pessoa pode transformar espontaneidade em falta de reciprocidade.',
		'compartilhar prazer e autoria numa relação que não exija gostos idênticos'
	),
	'5:8': pair(
		'A confiança pode permitir uma expressão mais livre do desejo, enquanto reconhecer o que dá prazer ajuda a tornar a intimidade menos dependente de suposições.',
		'A intensidade de uma entrega pode ser tomada como prova de desejo; buscar aprovação pode tornar difícil distinguir prazer próprio de uma concessão que parece necessária para manter a ligação.',
		'aprofundar a intimidade sem transformar prazer e entrega numa prova de confiança'
	),
	'5:9': pair(
		'Experimentar uma forma de criação pode abrir uma perspectiva que o estudo sozinho não oferecia. Uma visão mais ampla pode alimentar o prazer de expressar algo que tenha sentido para você.',
		'Uma ideia do que seria grandioso pode dificultar valorizar uma tentativa pequena; seguir apenas o entusiasmo pode impedir o aprofundamento que ampliaria a expressão.',
		'ampliar horizontes por meio de uma criação que preserve curiosidade e espaço para aprender'
	),
	'5:10': pair(
		'Uma expressão própria pode dar personalidade à direção profissional. A responsabilidade ganha sentido quando existe algo de sua autoria que você deseja sustentar publicamente.',
		'A expectativa de reconhecimento pode restringir o que você se permite criar; transformar todo prazer em trabalho pode retirar da expressão o espaço livre que a alimentava.',
		'dar lugar à autoria na direção profissional preservando formas de criar que não dependam de desempenho'
	),
	'5:11': pair(
		'Uma criação pode ganhar alcance na troca com outras pessoas, e o grupo pode oferecer um contexto para que uma expressão individual contribua para um projeto maior.',
		'Buscar aprovação coletiva pode uniformizar sua expressão; proteger a autoria como posse exclusiva pode dificultar uma colaboração que a enriqueceria.',
		'contribuir com uma expressão própria para um projeto coletivo sem depender de aprovação uniforme'
	),
	'5:12': pair(
		'Uma experiência elaborada em reservado pode encontrar forma na criação. O prazer de expressar não exige explicar toda a origem do que foi sentido: a obra ou a tentativa pode dizer apenas a parte que está pronta.',
		'A pressão para mostrar pode interromper uma criação ainda em elaboração; proteger a experiência de qualquer exposição pode impedir o prazer de lhe dar uma forma compartilhável.',
		'dar expressão ao que amadurece em reservado sem exigir exposição completa da experiência'
	),
	'6:6': pair(
		'Uma rotina pode reunir realização e cuidado quando a medida das tarefas respeita a capacidade de repeti-las. A continuidade depende também do modo como o esforço é distribuído.',
		'Concentrar todas as respostas em organizar melhor pode aumentar a cobrança quando o problema é o volume de esforço que se tenta acomodar.',
		'encontrar uma organização que respeite a capacidade de continuar, além da vontade de dar conta'
	),
	'6:7': pair(
		'Um acordo se torna concreto na divisão das tarefas e na consideração pelo esforço de cada pessoa. A rotina pode dar sustentação ao vínculo quando o cuidado não depende de disponibilidade ilimitada.',
		'A dedicação cotidiana pode ser tomada como obrigação silenciosa; preservar a harmonia pode deixar uma divisão de esforço sem negociação.',
		'fazer os acordos aparecerem numa divisão cotidiana de esforço que possa ser sustentada'
	),
	'6:8': pair(
		'Dividir responsabilidades com clareza pode reduzir o esforço que ficaria concentrado numa pessoa. A confiança ganha expressão cotidiana quando a partilha inclui quem faz, quem decide e quem assume o custo.',
		'Uma dependência não nomeada pode transformar a rotina em cobrança; assumir tarefas para manter controle pode ampliar o desgaste que se desejava evitar.',
		'ligar confiança e responsabilidade a uma divisão concreta do esforço diário'
	),
	'6:9': pair(
		'Uma visão de futuro pode orientar o esforço cotidiano, enquanto a prática revela quais ideias precisam de ajuste. O aprendizado ganha profundidade quando modifica o modo de fazer.',
		'Um ideal amplo pode exigir da rotina mais do que ela comporta; ocupar todo o tempo com tarefas pode impedir a revisão de sentido que tornaria o esforço mais coerente.',
		'dar sentido à rotina e deixar que a experiência cotidiana aperfeiçoe sua visão de futuro'
	),
	'6:10': pair(
		'A responsabilidade profissional se sustenta no trabalho cotidiano que a torna possível. Uma direção clara ajuda a escolher tarefas, enquanto uma rotina viável impede que o compromisso dependa sempre de esforço extraordinário.',
		'A expectativa pública pode crescer mais rápido que a capacidade diária de entrega; aperfeiçoar tarefas sem uma direção pode consumir esforço sem aproximar você do lugar que deseja ocupar.',
		'ajustar a responsabilidade profissional à capacidade real de sustentá-la no cotidiano'
	),
	'6:11': pair(
		'Um projeto coletivo ganha continuidade quando a intenção se traduz em tarefas e responsabilidades distribuídas. A cooperação pode reduzir a dependência de esforços individuais excessivos.',
		'O entusiasmo do grupo pode gerar mais compromissos do que a rotina comporta; uma divisão apenas presumida pode deixar o trabalho concentrado em quem já está disponível.',
		'tornar um projeto coletivo praticável por meio de uma divisão explícita do trabalho'
	),
	'6:12': pair(
		'O recolhimento pode ajudar a reconhecer o que a rotina está exigindo, e uma organização mais realista pode proteger tempo para elaborar a experiência. Pausa e continuidade passam a se sustentar mutuamente.',
		'Tentar produzir durante todo o tempo pode retirar a reserva necessária para continuar; afastar-se sem medida dos compromissos pode aumentar o acúmulo que torna difícil descansar.',
		'incluir tempo de elaboração e pausa na própria medida do esforço cotidiano'
	),
	'7:7': pair(
		'Uma relação pode acolher mais de uma necessidade quando os acordos permitem participação efetiva das duas partes. A diferença deixa de ser mero obstáculo quando oferece conteúdo real à negociação.',
		'Buscar concordância a qualquer custo pode esconder posições diferentes; esperar que o outro resolva toda tensão pode retirar sua própria participação do acordo.',
		'construir reciprocidade com diferenças explícitas, sem depender de concordância permanente'
	),
	'7:8': pair(
		'Um acordo claro pode dar sustentação à confiança necessária para compartilhar mais. A intimidade se aprofunda quando os limites da partilha podem ser negociados sem colocar todo o vínculo em julgamento.',
		'A expectativa de entrega pode ultrapassar o que foi combinado; usar a relação como prova de acesso irrestrito pode transformar confiança em obrigação.',
		'aprofundar um vínculo com acordos que preservem limites na intimidade e na responsabilidade compartilhada'
	),
	'7:9': pair(
		'Uma diferença de visão pode ampliar o entendimento numa relação, desde que as convicções possam ser conversadas. Um horizonte compartilhado não exige que as duas pessoas percorram todas as etapas do mesmo modo.',
		'Uma convicção pode virar critério para julgar o outro antes de entendê-lo; preservar o acordo pode parecer exigir abandonar uma visão que tem valor para você.',
		'negociar um horizonte compartilhado sem exigir identidade completa de convicções'
	),
	'7:10': pair(
		'Os acordos podem dar sustentação à direção profissional quando reconhecem o tempo e a responsabilidade que ela exige. A posição pública também fica mais coerente quando corresponde ao modo como você participa das relações.',
		'Uma exigência profissional pode ocupar espaço que parecia disponível ao vínculo; buscar aprovação na relação pode dificultar assumir uma direção própria.',
		'assumir uma direção profissional cuja presença nas relações possa ser negociada'
	),
	'7:11': pair(
		'Um vínculo pode encontrar novos projetos na participação em grupo. A colaboração se torna mais clara quando uma relação próxima não precisa substituir toda a rede de apoio e de interesses.',
		'A vida coletiva pode disputar disponibilidade com uma relação; esperar que uma única pessoa acompanhe todos os projetos pode estreitar o horizonte das duas.',
		'conciliar acordos próximos e participação coletiva sem concentrar todas as expectativas num vínculo'
	),
	'7:12': pair(
		'Uma relação pode acolher o tempo de elaboração de cada pessoa quando o recolhimento não precisa significar afastamento definitivo. Uma pausa comunicada preserva o vínculo sem exigir conversa antes de haver palavras.',
		'A necessidade de recolher-se pode ser recebida como indisponibilidade; a pressão para responder pode impedir compreender o que você precisa dizer.',
		'preservar o vínculo enquanto uma necessidade ainda precisa de tempo para ganhar palavras'
	),
	'8:8': pair(
		'A confiança pode aprofundar-se quando intimidade, decisão e responsabilidade são consideradas juntas. Compartilhar ganha consistência ao deixar claro o que cada pessoa escolhe entregar e sustentar.',
		'Quando toda diferença toca a confiança, um limite pode parecer recusa da ligação. Exigir acesso completo pode reduzir justamente a liberdade que torna a entrega significativa.',
		'aprofundar uma partilha que preserve escolha, limite e responsabilidade'
	),
	'8:9': pair(
		'Rever uma convicção pode tornar mais livre a maneira de compartilhar confiança e responsabilidade. A experiência da intimidade também pode ampliar sua visão sobre o que significa depender e escolher.',
		'Uma certeza sobre como as pessoas deveriam se relacionar pode ocultar diferenças concretas de limite; uma ligação intensa pode receber um sentido maior do que os acordos efetivamente sustentam.',
		'deixar a experiência da confiança ampliar suas convicções sem substituir acordos por expectativas'
	),
	'8:10': pair(
		'A direção profissional fica mais compreensível quando reconhece os recursos e as responsabilidades compartilhadas que a sustentam. Assumir uma posição inclui tornar claros os limites de decisão e dependência.',
		'A busca de reconhecimento pode dificultar admitir de quem ou de que você depende; concentrar controle para proteger uma posição pode enfraquecer a confiança necessária para sustentá-la.',
		'assumir uma direção pública com clareza sobre dependências e responsabilidades compartilhadas'
	),
	'8:11': pair(
		'Um projeto coletivo pode ganhar profundidade quando a confiança inclui uma divisão clara de poder e recursos. O futuro compartilhado se torna mais real quando cada contribuição encontra responsabilidade correspondente.',
		'O entusiasmo de pertencer pode encobrir diferenças sobre quem decide e quem assume os custos; proteger a confiança evitando essas diferenças pode deixá-la sem sustentação.',
		'construir um futuro coletivo com clareza sobre confiança, decisões e recursos compartilhados'
	),
	'8:12': pair(
		'Elaborar em reservado o que você sente pode tornar mais clara a medida de confiança e entrega que consegue sustentar. A intimidade não exige exposição total: o tempo de recolhimento pode permitir renegociar limites sem fechar a possibilidade de partilha.',
		'A pressão para compartilhar antes de compreender o que sente pode tornar a entrega defensiva. Recolher-se para tentar garantir controle, por outro lado, pode deixar a outra pessoa sem entender qual limite está sendo preservado.',
		'aprofundar a confiança respeitando o tempo de elaboração e o direito de não expor toda a experiência'
	),
	'9:9': pair(
		'Uma visão mais ampla pode ganhar profundidade quando permanece aberta a perguntas. Aprender passa a modificar a direção que você imagina para o futuro, em vez de apenas confirmar uma convicção.',
		'A busca de sentido pode tornar difícil aceitar uma resposta provisória; reunir grandes explicações pode substituir o contato com uma experiência que as faria mudar.',
		'ampliar sua visão sem exigir que uma convicção explique tudo antes da experiência'
	),
	'9:10': pair(
		'Uma convicção pode orientar a direção profissional quando encontra uma responsabilidade concreta. A experiência pública também pode mostrar quais ideias merecem revisão para continuar fazendo sentido.',
		'Um ideal pode exigir uma posição que ainda não encontra sustentação; manter um papel apenas por reconhecimento pode afastar o trabalho do sentido que você queria dar a ele.',
		'dar consequência profissional a uma visão de futuro que aceite amadurecer na prática'
	),
	'9:11': pair(
		'A troca com um grupo pode ampliar sua visão de futuro, e uma convicção pode oferecer direção a um projeto compartilhado. A colaboração ganha alcance quando comporta perspectivas que não são idênticas.',
		'Uma ideia de futuro pode virar exigência de concordância; preservar o pertencimento pode impedir que você questione uma convicção coletiva.',
		'participar de um horizonte coletivo que se amplie com diferenças de perspectiva'
	),
	'9:12': pair(
		'Um tempo de elaboração pode mostrar quais convicções ainda fazem sentido. O horizonte se amplia também quando existe espaço para uma experiência que ainda não cabe numa explicação pronta.',
		'Buscar uma resposta abrangente pode interromper uma experiência que precisa amadurecer; permanecer apenas na indeterminação pode impedir escolher um sentido provisório para continuar.',
		'dar tempo ao que ainda não tem explicação sem abandonar a busca de um horizonte possível'
	),
	'10:10': pair(
		'A direção profissional pode reunir reconhecimento e responsabilidade quando o lugar desejado corresponde ao compromisso que você consegue assumir. A posição ganha consistência por aquilo que sustenta.',
		'Concentrar o valor da experiência no desempenho público pode deixar pouco espaço para rever uma escolha sem senti-la como perda de posição.',
		'assumir uma direção pública que possa amadurecer sem depender de desempenho impecável'
	),
	'10:11': pair(
		'A direção profissional pode encontrar apoio e alcance numa rede de colaboração. O projeto coletivo ganha consistência quando responsabilidade pública e contribuição de cada pessoa ficam claras.',
		'Buscar posição pode disputar espaço com a colaboração; depender da aprovação do grupo pode dificultar assumir a responsabilidade de uma decisão.',
		'ligar direção profissional e colaboração sem confundir liderança com controle ou pertencimento com concordância'
	),
	'10:12': pair(
		'Uma pausa de elaboração pode ajudar a distinguir a responsabilidade que faz sentido da exposição que apenas precisa ser mantida. Preservar um espaço fora do desempenho permite retomar a direção com mais clareza.',
		'A exigência de estar sempre disponível publicamente pode impedir uma revisão necessária; recolher-se sem reconhecer os compromissos assumidos pode deixar indefinida a continuidade do trabalho.',
		'sustentar responsabilidades públicas preservando tempo de elaboração fora da exposição'
	),
	'11:11': pair(
		'Um projeto compartilhado pode reunir apoio, contribuição e visão de futuro. Pertencer ganha significado quando existe espaço para uma participação concreta, além da concordância com uma ideia.',
		'A expectativa de acompanhar o grupo pode ocupar mais espaço que sua contribuição possível; muitos planos podem dispersar a disponibilidade necessária para sustentar um deles.',
		'encontrar uma forma de participação coletiva que tenha sentido e continuidade para você'
	),
	'11:12': pair(
		'Um projeto coletivo pode amadurecer em períodos de elaboração menos exposta. A participação ganha qualidade quando o grupo comporta ritmos de presença que não exigem disponibilidade permanente.',
		'A pressão de acompanhar tudo pode retirar o tempo de elaboração; recolher-se sem tornar legível sua disponibilidade pode deixar sua participação indefinida.',
		'participar de um futuro compartilhado preservando espaço para elaborar sua própria contribuição'
	),
	'12:12': pair(
		'O recolhimento pode reunir elaboração e reconhecimento de necessidades que ainda não ganharam forma clara. Nem toda experiência precisa ser explicada imediatamente para começar a fazer sentido.',
		'Quando todas as respostas ficam adiadas para um momento de clareza total, o espaço de elaboração pode perder contato com escolhas que já se tornaram possíveis.',
		'dar tempo à elaboração sem exigir clareza total antes de retomar uma participação possível'
	)
};

const houseChoices: Record<number, string> = {
	1: 'assumir uma posição e escolher como começar',
	2: 'reconhecer o valor do seu tempo, dos recursos e das capacidades que oferece',
	3: 'conversar, aprender com o cotidiano e tornar uma ideia compreensível',
	4: 'construir uma base íntima e um lugar de pertencimento',
	5: 'dar expressão ao desejo, ao prazer e à criação',
	6: 'organizar tarefas e encontrar uma medida de esforço que possa continuar',
	7: 'negociar acordos em que outra pessoa também tem voz',
	8: 'compartilhar confiança, intimidade e responsabilidade',
	9: 'ampliar horizontes e rever o sentido das suas convicções',
	10: 'assumir uma direção profissional e suas responsabilidades públicas',
	11: 'participar de projetos coletivos e dar forma a um futuro compartilhado',
	12: 'recolher-se e elaborar a experiência em reservado'
};

const bodyFunctions: Record<string, { subject: string; agency: string }> = {
	sun: { subject: 'a direção que você deseja dar ao ciclo', agency: 'assumir uma escolha própria' },
	moon: { subject: 'a necessidade de amparo emocional', agency: 'acolher o que você sente' },
	mercury: {
		subject: 'a compreensão e a busca de palavras',
		agency: 'esclarecer o que ainda está confuso'
	},
	venus: {
		subject: 'o reconhecimento de afinidade e valor',
		agency: 'reconhecer o que torna uma troca desejável'
	},
	mars: {
		subject: 'a iniciativa e a defesa do próprio espaço',
		agency: 'agir sobre aquilo que pede iniciativa'
	},
	jupiter: {
		subject: 'a busca de crescimento e sentido',
		agency: 'dar alcance a uma possibilidade'
	},
	saturn: {
		subject: 'a sustentação de limites e compromissos',
		agency: 'dar medida ao compromisso'
	},
	uranus: {
		subject: 'a abertura a uma alternativa',
		agency: 'abrir espaço para uma forma diferente de participar'
	},
	neptune: {
		subject: 'a imaginação e a sensibilidade ao que ainda não está definido',
		agency: 'dar lugar à sensibilidade sem tomar uma impressão por certeza'
	},
	pluto: {
		subject: 'a revisão de apegos e relações de poder',
		agency: 'rever o que você tenta garantir pelo controle'
	}
};

export type AnnualHouseInterplay = {
	claim: string;
	closure: string;
	factIds: string[];
	relation: string;
};

/** Caller must supply positions projected from the verified return chart, never natal houses.
 * The caller also attaches the real aspect fact ID when passing an aspect.
 * No supplied aspect means thematic coexistence, not an invented geometric contact.
 */
export function annualHouseInterplay(
	first: Position,
	second: Position,
	aspect?: string,
	introducedPassages?: Set<string>
): AnnualHouseInterplay | null {
	const validHouse = (house: number | null): house is number =>
		house !== null && Number.isInteger(house) && house >= 1 && house <= 12;
	if (!validHouse(first.house) || !validHouse(second.house)) return null;
	if (!Object.hasOwn(bodyFunctions, first.body) || !Object.hasOwn(bodyFunctions, second.body))
		return null;
	const firstFunction = bodyFunctions[first.body],
		secondFunction = bodyFunctions[second.body];
	if (!firstFunction || !secondFunction || first.body === second.body) return null;
	if (aspect !== undefined && !Object.hasOwn(aspectNames, aspect)) return null;
	const key = [first.house, second.house].sort((a, b) => a - b).join(':');
	const meaning = relations[key];
	const location = `${bodyNames[first.body]} na casa ${first.house} relaciona ${firstFunction.subject} a ${houseChoices[first.house]}; ${bodyNames[second.body]} na casa ${second.house} associa ${secondFunction.subject} a ${houseChoices[second.house]}.`;
	const hard = aspect === 'square' || aspect === 'opposition';
	const contact =
		aspect === undefined
			? ''
			: hard
				? `A ${aspectNames[aspect]} acentua a dificuldade de ${firstFunction.agency} sem atropelar a necessidade de ${secondFunction.agency}. `
				: aspect === 'conjunction'
					? `Na conjunção, ${firstFunction.agency} e ${secondFunction.agency} ficam estreitamente ligados, o que pode concentrar tanto envolvimento quanto exigência. `
					: `O ${aspectNames[aspect]} oferece uma possibilidade de apoio: ${firstFunction.agency} pode ajudar você a ${secondFunction.agency}. `;
	const passages = hard
		? [meaning.friction, meaning.support]
		: aspect === 'conjunction' || aspect === undefined
			? [meaning.support, meaning.friction]
			: [meaning.support];
	const bridge = passages
		.filter((passage) => {
			if (introducedPassages?.has(passage)) return false;
			introducedPassages?.add(passage);
			return true;
		})
		.join(' ');
	const closure = `${hard ? 'A tensão pode ganhar uma medida mais útil quando há espaço para' : 'A ligação ganha sentido ao permitir'} ${meaning.purpose}.`;
	return {
		claim: `${location} ${contact}${bridge}`.trim(),
		closure,
		factIds: [
			...new Set([
				first.factId,
				second.factId,
				`return-house-${first.house}`,
				`return-house-${second.house}`
			])
		],
		relation: `${first.body} na casa anual ${first.house} × ${second.body} na casa anual ${second.house}; ${aspect === undefined ? 'relação temática sem inferir aspecto' : `aspecto anual ${aspect}`}; funções dos corpos e relação entre os dois campos modificam a conclusão.`
	};
}
