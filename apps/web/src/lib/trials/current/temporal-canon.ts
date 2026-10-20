import { bodyNames, signs } from '../reconstruction/canon';
import { aspectNames } from '../reconstruction/date-facts';
import type { Position } from '../reconstruction/fact-graph';
import { natalStyles, type NatalStyle } from '../reconstruction/natal-canon';

/** Versioned editorial vocabulary. These are symbolic relations, never event predictions. */
export const temporalTargets: Record<string, { subject: string; choice: string; risk: string }> = {
	sun: {
		subject: 'a direção que você quer dar à própria vida',
		choice: 'escolher o que merece levar sua assinatura',
		risk: 'confundir reconhecimento com uma obrigação de provar seu valor'
	},
	moon: {
		subject: 'o que ajuda você a se sentir à vontade e amparado',
		choice: 'acolher uma necessidade sem entregar a ela todas as decisões',
		risk: 'responder a uma situação nova como se fosse preciso se proteger de algo já conhecido'
	},
	mercury: {
		subject: 'o modo como você entende uma situação e encontra palavras para explicá-la',
		choice: 'distinguir o que sabe do que ainda está supondo',
		risk: 'fechar uma conclusão antes de ouvir a parte que falta'
	},
	venus: {
		subject: 'aquilo que faz uma relação, um gasto ou uma escolha valer a pena para você',
		choice: 'dar espaço ao desejo sem perder de vista a reciprocidade',
		risk: 'concordar para preservar a harmonia e depois sentir o preço dessa concessão'
	},
	mars: {
		subject: 'a passagem entre querer algo e agir para consegui-lo',
		choice: 'sustentar uma iniciativa sem transformar toda resistência em confronto',
		risk: 'gastar na reação a energia que faria falta para continuar'
	},
	jupiter: {
		subject: 'as possibilidades em que você acredita e o espaço que deseja conquistar',
		choice: 'ampliar o horizonte sem saltar as etapas que tornam um projeto viável',
		risk: 'tomar entusiasmo por uma confirmação de que tudo caberá'
	},
	saturn: {
		subject: 'os compromissos que você tenta manter mesmo quando deixam de ser fáceis',
		choice: 'diferenciar responsabilidade de uma cobrança que já não ajuda',
		risk: 'continuar apenas porque mudar pareceria desperdiçar o esforço anterior'
	},
	uranus: {
		subject: 'o espaço de liberdade de que você precisa para pensar e escolher por conta própria',
		choice: 'mudar uma regra sem romper também o que ainda faz sentido',
		risk: 'confundir autonomia com a necessidade de contrariar qualquer limite'
	},
	neptune: {
		subject: 'as imagens, expectativas e sensibilidades que orientam seus desejos',
		choice: 'dar forma a uma inspiração sem exigir que a realidade corresponda inteira a ela',
		risk: 'preencher com esperança uma informação que ainda falta'
	},
	pluto: {
		subject: 'aquilo a que você se apega quando uma mudança parece ameaçar seu lugar',
		choice: 'reconhecer o que pode ser renegociado sem tentar controlar a resposta inteira',
		risk: 'investir ainda mais em uma disputa para não admitir que algo precisa mudar'
	}
};
const signsInExperience = [
	{
		strength: 'começar e descobrir durante a ação',
		friction: 'esperar por uma definição pode ser mais difícil do que lidar com a tentativa',
		route: 'uma iniciativa delimitada preserva sua autonomia sem antecipar todas as respostas'
	},
	{
		strength: 'construir confiança pela continuidade e pelo que pode verificar',
		friction: 'mudar o combinado pode custar mais do que a mudança parece custar para os outros',
		route: 'uma transição com passos reconhecíveis permite mudar sem perder todo o apoio'
	},
	{
		strength: 'entender por meio da conversa e da comparação entre possibilidades',
		friction: 'uma possibilidade nova pode interromper uma decisão que já estava amadurecendo',
		route: 'nomear a pergunta central ajuda a explorar alternativas sem dispersar o assunto'
	},
	{
		strength: 'perceber o clima emocional e cuidar do que cria familiaridade',
		friction: 'a forma como algo é dito pode pesar tanto quanto o conteúdo',
		route: 'um pedido explícito dá ao cuidado uma forma que o outro consegue compreender'
	},
	{
		strength: 'colocar calor, criatividade e envolvimento pessoal no que escolhe',
		friction: 'uma correção pode ser sentida como desvalorização do esforço inteiro',
		route: 'separar a qualidade da troca da aprovação pessoal protege sua espontaneidade'
	},
	{
		strength: 'tornar uma ideia útil, ajustando detalhes e percebendo o que falta',
		friction: 'tentar corrigir tudo antes de prosseguir pode adiar uma experiência necessária',
		route: 'distinguir o detalhe decisivo do aperfeiçoamento opcional deixa espaço para avançar'
	},
	{
		strength: 'entender os dois lados e buscar uma medida que possa ser compartilhada',
		friction: 'manter todas as posições em consideração pode adiar a sua',
		route: 'explicitar sua preferência torna o acordo mais real, mesmo quando exige negociação'
	},
	{
		strength: 'perceber o que está por trás de uma resposta e buscar vínculos de confiança',
		friction: 'a incerteza pode convidar a procurar garantias que nenhuma conversa consegue dar',
		route:
			'distinguir reserva legítima de suspeita permite aprofundar sem transformar proximidade em controle'
	},
	{
		strength: 'ligar uma experiência a um horizonte maior e encontrar sentido para continuar',
		friction: 'a convicção sobre o caminho pode ultrapassar o que já foi demonstrado',
		route: 'uma etapa verificável ajuda a dar corpo ao sentido que mobiliza você'
	},
	{
		strength: 'organizar prioridades e sustentar o esforço ao longo do tempo',
		friction:
			'a responsabilidade pode ocupar o espaço que também precisa de descanso ou experimentação',
		route: 'dar limites ao dever torna a continuidade mais possível, sem exigir dureza permanente'
	},
	{
		strength: 'enxergar alternativas e pensar além do costume imediato',
		friction:
			'a coerência de uma ideia pode fazer parecer dispensável explicar seu efeito sobre as pessoas',
		route: 'traduzir a proposta para uma situação concreta aproxima liberdade e participação'
	},
	{
		strength: 'captar nuances e permitir que a experiência ainda encontre uma forma',
		friction: 'sentir muito de uma situação não esclarece, por si só, o que cabe a você resolver',
		route: 'um contorno simples permite preservar a sensibilidade sem absorver todas as demandas'
	}
] as const;

export const temporalHouses: Record<number, { area: string; example: string }> = {
	1: {
		area: 'sua maneira de se colocar e iniciar',
		example: 'a diferença entre se apresentar por uma decisão própria e apenas reagir ao ambiente'
	},
	2: {
		area: 'o uso do dinheiro, do tempo e das capacidades que reconhece como suas',
		example: 'o que você aceita oferecer e o que precisa preservar para não se desvalorizar'
	},
	3: {
		area: 'conversas, aprendizagem cotidiana e trocas próximas',
		example: 'a passagem entre ter uma impressão e conseguir explicá-la sem gerar um mal-entendido'
	},
	4: {
		area: 'a intimidade, a casa e aquilo que dá uma sensação de base',
		example: 'como conciliar uma demanda externa com o recolhimento de que você precisa'
	},
	5: {
		area: 'a criação, o prazer e o desejo de se expressar',
		example:
			'o espaço que uma escolha espontânea encontra entre obrigações e expectativas de aprovação'
	},
	6: {
		area: 'a rotina, as tarefas e o modo como organiza o esforço diário',
		example: 'a diferença entre uma agenda possível e uma soma de compromissos que só cabe no papel'
	},
	7: {
		area: 'os acordos e as relações em que é preciso considerar outra pessoa',
		example: 'a distância entre esperar que alguém compreenda sua necessidade e torná-la negociável'
	},
	8: {
		area: 'a confiança, a intimidade e os recursos compartilhados',
		example: 'o que pode ser dividido sem deixar indefinidos os limites e as responsabilidades'
	},
	9: {
		area: 'os estudos, as convicções e os horizontes que deseja ampliar',
		example:
			'a diferença entre uma ideia inspiradora e um caminho de aprendizagem que possa ser sustentado'
	},
	10: {
		area: 'a direção profissional, a exposição e as responsabilidades assumidas',
		example:
			'a relação entre o lugar que deseja ocupar e o compromisso real necessário para sustentá-lo'
	},
	11: {
		area: 'os projetos em grupo, as amizades e os planos de futuro',
		example:
			'como uma proposta pessoal encontra apoio sem depender de concordância completa do grupo'
	},
	12: {
		area: 'a vida reservada, o recolhimento e o que ainda precisa de elaboração',
		example:
			'a necessidade de deixar uma experiência amadurecer antes de transformá-la em resposta pública'
	}
};

type Pair = { tension: string; cooperation: string; conjunction: string };
const pairMeaning = (tension: string, cooperation: string, conjunction: string): Pair => ({
	tension,
	cooperation,
	conjunction
});
/** Directional relations for every supported transit/target pair; no lexical fallback. */
const pairs: Record<string, Pair> = {
	'saturn:mercury': pairMeaning(
		'A exigência de precisão pode pesar sobre a confiança no próprio raciocínio. Uma dúvida passa a parecer incapacidade, e o cuidado com os detalhes pode adiar a conversa que permitiria completar o entendimento.',
		'Um critério claro pode ajudar a organizar informações e sustentar uma conclusão. A concentração ganha utilidade quando permite distinguir o que precisa de rigor do aperfeiçoamento que já não muda a resposta.',
		'O pensamento encontra uma exigência de forma e consistência. Há espaço para aprofundar um assunto ou assumir uma palavra com responsabilidade; o rigor perde alcance quando só admite falar depois de eliminar toda incerteza.'
	),
	'saturn:jupiter': pairMeaning(
		'Uma expectativa de crescimento encontra o custo de sustentá-la. O limite pode parecer negação do horizonte desejado, mas também mostra a distância entre acreditar numa possibilidade e assumir os compromissos que a tornam praticável.',
		'Um limite claro pode dar continuidade a uma possibilidade de crescimento. A prudência ajuda a escolher uma etapa que cabe nos recursos disponíveis, permitindo que a confiança se apoie em algo além da promessa inicial.',
		'A expansão precisa encontrar forma, medida e compromisso. Uma possibilidade pode ganhar consistência ao aceitar condições reais; o cuidado está em não transformar a necessidade de estrutura numa regra de nunca arriscar o que ainda está amadurecendo.'
	),
	'saturn:saturn': pairMeaning(
		'Uma exigência atual pode expor o custo de compromissos mantidos por muito tempo. Persistir deixa de ser suficiente quando a regra que organizava o esforço já não corresponde ao que você consegue ou deseja sustentar.',
		'A experiência pode oferecer uma medida mais clara para os compromissos atuais. O que foi aprendido ajuda a distribuir esforço e reconhecer limites, desde que a familiaridade com uma responsabilidade não impeça ajustá-la.',
		'A relação com dever, tempo e continuidade ganha destaque. Um compromisso pode pedir renovação de sentido: assumir responsabilidade também envolve reconhecer quais exigências ainda constroem algo e quais permanecem apenas porque foram assumidas antes.'
	),
	'saturn:uranus': pairMeaning(
		'A necessidade de continuidade pode confrontar sua maneira de preservar liberdade. Uma regra protege a base e ao mesmo tempo estreita a experimentação; romper tudo ou manter tudo parecem saídas simples para uma diferença que pede mudança de estrutura.',
		'Uma estrutura pode dar sustentação à mudança que você deseja experimentar. A liberdade ganha duração quando uma alternativa encontra tempo, espaço e condições para funcionar, em vez de depender apenas da disposição de contrariar o modelo anterior.',
		'Compromisso e autonomia se encontram na mesma questão. Dar forma a uma mudança pode tornar a liberdade mais real; a organização ajuda quando protege a experiência sem exigir que ela repita exatamente o que pretendia transformar.'
	),
	'saturn:neptune': pairMeaning(
		'Um ideal encontra limites que sua imagem inicial deixava de fora. A frustração pode levar tanto a abandonar a inspiração quanto a negar o custo de realizá-la; a dificuldade está em permitir uma forma possível sem tratá-la como fracasso do sonho inteiro.',
		'Uma estrutura pode dar expressão a algo que antes era apenas imagem ou sensibilidade. A continuidade ajuda uma inspiração a amadurecer quando oferece forma e tempo sem exigir que seu valor seja reduzido ao resultado mais imediato.',
		'Imaginação e responsabilidade se aproximam. Um ideal pede forma concreta, e a forma revela limites; esse encontro pode tornar a inspiração praticável, desde que aceitar uma realização parcial não seja confundido com perder seu sentido.'
	),
	'saturn:pluto': pairMeaning(
		'A necessidade de manter uma estrutura pode encontrar um apego que tornou a mudança ameaçadora. O esforço se endurece quando limitar uma responsabilidade parece perder poder, e a continuidade começa a depender de controlar cada vez mais.',
		'Um limite pode ajudar a reorganizar algo que se tornou intenso ou difícil de negociar. A consistência oferece apoio à transformação quando distingue o que precisa ser preservado daquilo que só permanece por receio de perder controle.',
		'Responsabilidade e necessidade de controle podem ocupar o mesmo lugar. Há força para sustentar uma reorganização profunda, mas o compromisso se torna estreito quando nenhuma condição pode mudar sem parecer ameaça à base inteira.'
	),
	'uranus:moon': pairMeaning(
		'A necessidade de mudar pode tocar hábitos que oferecem segurança. A liberdade parece exigir afastar-se do conhecido, enquanto o acolhimento parece depender de conservá-lo; a tensão aumenta quando novidade e cuidado são tratados como escolhas incompatíveis.',
		'Uma mudança de hábito pode abrir espaço para uma forma de cuidado mais adequada ao que você sente. A novidade oferece alívio quando permite respirar sem exigir que toda referência de segurança seja abandonada.',
		'A vontade de sair de uma repetição toca sua base emocional. Um costume antes confortável pode parecer estreito; a mudança ganha sentido quando expressa uma necessidade atual de cuidado, além da urgência de interromper o desconforto.'
	),
	'uranus:mercury': pairMeaning(
		'Uma ideia diferente pode romper a sequência pela qual você costuma compreender um assunto. A rapidez das associações amplia possibilidades, mas pode dificultar explicar as passagens, deixando os outros diante de uma conclusão cuja construção não acompanharam.',
		'Uma associação inesperada pode reorganizar o que você já sabe. A originalidade se torna comunicável quando a ligação nova esclarece um problema, permitindo rever a explicação sem perder o fio que a torna compreensível.',
		'A necessidade de pensar de outro modo se aproxima da sua forma habitual de raciocinar. Uma ideia pode mudar o enquadramento do assunto; sua força cresce quando a novidade encontra palavras, exemplos e ligação entre as partes.'
	),
	'uranus:mars': pairMeaning(
		'A necessidade de liberdade pode acionar uma resposta antes de haver direção para ela. A iniciativa vira ruptura quando qualquer resistência parece intolerável, e a energia se concentra em sair sem definir o espaço que deseja abrir.',
		'Uma alternativa pode renovar sua maneira de agir. A disposição para experimentar ajuda a sair de uma disputa repetida quando permite mudar o procedimento, em vez de apenas aplicar mais força ao mesmo obstáculo.',
		'Autonomia e iniciativa se aproximam. Uma ação diferente pode abrir espaço onde havia repetição; a mudança ganha consequência quando o gesto inclui uma direção para continuar, além da coragem de interromper o padrão anterior.'
	),
	'uranus:jupiter': pairMeaning(
		'Uma alternativa pode desafiar a visão que vinha dando sentido às suas escolhas. O desejo de liberdade pode levar a trocar uma certeza por outra com rapidez, confundindo a amplitude de uma promessa nova com experiência já adquirida.',
		'Uma ideia diferente pode ampliar o horizonte em que você acredita. A abertura ganha valor quando permite aprender com uma possibilidade que antes parecia fora de alcance, sem exigir que toda convicção anterior seja descartada.',
		'A mudança toca suas expectativas de crescimento. Uma alternativa pode reunir liberdade e futuro numa mesma promessa; sua contribuição fica mais clara quando amplia possibilidades reais de escolha, além do entusiasmo com a novidade.'
	),
	'uranus:saturn': pairMeaning(
		'A vontade de mudar encontra uma estrutura sustentada por compromisso e esforço. A ruptura pode parecer libertadora, mas também ameaça apoios que ainda têm função; o atrito está em rever a regra sem confundir toda continuidade com prisão.',
		'Uma alternativa pode tornar um compromisso mais viável. Mudar o modo de fazer permite preservar o que merece continuidade, mostrando que flexibilidade também pode ser uma forma de responsabilidade.',
		'A necessidade de autonomia se aproxima dos limites que organizam sua vida. Uma estrutura pode pedir revisão; a mudança ganha consistência quando identifica a regra que perdeu função, em vez de exigir que todo compromisso desapareça.'
	),
	'uranus:uranus': pairMeaning(
		'Uma possibilidade de mudança pode confrontar a imagem que você já tem da própria liberdade. Defender um jeito independente de viver pode se tornar outra rigidez quando impede reconhecer uma alternativa que não estava prevista.',
		'Uma alternativa pode encontrar espaço na liberdade que você já vem construindo. A mudança ganha continuidade quando acrescenta possibilidades de escolha, em vez de exigir uma nova ruptura para comprovar independência.',
		'A relação com autonomia e diferença ganha destaque. Uma mudança pode pedir outra definição do que significa escolher por conta própria; conservar liberdade também inclui poder permanecer onde ainda existe sentido.'
	),
	'uranus:neptune': pairMeaning(
		'Uma mudança de perspectiva pode abalar uma imagem que orientava seus desejos. A novidade desperta possibilidades, mas também pode substituir um ideal pouco definido por outro, sem esclarecer o que você espera viver de modo diferente.',
		'Uma alternativa pode dar nova linguagem a uma inspiração. A experimentação amplia o campo criativo quando permite descobrir formas de expressão que a imagem anterior não comportava, sem exigir uma certeza imediata sobre o resultado.',
		'A mudança se aproxima dos ideais que orientam sua imaginação. Uma imagem de futuro pode ganhar outra forma; a liberdade está em poder recriá-la, sem precisar tratar a primeira inspiração como promessa que deve ser cumprida inteira.'
	),
	'uranus:pluto': pairMeaning(
		'A necessidade de mudar pode tocar um ponto em que você teme perder controle. A tensão se intensifica quando só parecem existir ruptura total ou manutenção rígida, apagando a possibilidade de reorganizar o vínculo com aquilo que importa.',
		'Uma alternativa pode abrir espaço numa questão que parecia sem saída. A mudança ganha profundidade quando amplia sua margem de escolha diante de um apego, além de apenas trocar o objeto sobre o qual procura segurança.',
		'Liberdade e transformação se concentram numa questão de grande peso. Um gesto de mudança pode romper uma fixação, mas também assumir caráter absoluto; o valor da autonomia aparece no espaço de escolha que continua depois do gesto.'
	),
	'neptune:sun': pairMeaning(
		'A imagem de uma vida significativa pode se afastar do lugar que você consegue ocupar concretamente. A participação real parece pequena diante do ideal, e o desejo de corresponder a essa imagem pode obscurecer preferências que são de fato suas.',
		'A sensibilidade pode ampliar o sentido da sua participação. Um ideal encontra expressão em criação, cuidado ou presença quando inspira uma escolha concreta, sem exigir que você represente sozinho tudo o que admira.',
		'A imaginação se aproxima da maneira como você se reconhece. Um ideal pode dar sentido à direção pessoal, mas também tornar menos nítida a diferença entre uma escolha sua e o papel que deseja encarnar para corresponder a uma imagem.'
	),
	'neptune:moon': pairMeaning(
		'A sensibilidade ao ambiente pode se misturar à necessidade de acolhimento. Um clima ambíguo recebe o sentido que você teme ou espera, tornando difícil reconhecer qual sentimento é seu e qual interpretação foi acrescentada ao gesto do outro.',
		'A sensibilidade pode dar expressão delicada a uma necessidade emocional. Acolher uma impressão, uma lembrança ou uma imagem pode ajudar você a reconhecer o que sente, sem exigir que isso explique inteiramente o comportamento de quem está próximo.',
		'Imaginação e necessidade de segurança se aproximam. O desejo de amparo pode ganhar uma imagem ideal, capaz de inspirar cuidado, mas também de tornar uma presença real insuficiente por não oferecer compreensão sem limites.'
	),
	'neptune:mars': pairMeaning(
		'Um ideal pode mobilizar esforço sem oferecer uma direção suficientemente clara. A ação se dispersa quando cada tentativa busca realizar uma imagem inteira; a dificuldade está menos na falta de vontade do que na ausência de um objetivo reconhecível.',
		'A sensibilidade pode orientar sua iniciativa para uma forma de agir mais atenta ao contexto. Uma inspiração ganha corpo quando o gesto aceita experimentar e ajustar, em vez de exigir uma execução perfeita da imagem inicial.',
		'A iniciativa se aproxima de um ideal. Isso pode dar sentido a um esforço criativo ou de cuidado, mas também tornar pouco claro o ponto em que dedicação vira entrega sem medida a uma expectativa que ninguém consegue definir.'
	),
	'neptune:jupiter': pairMeaning(
		'Um ideal pode se misturar às convicções que orientam suas escolhas. A promessa ganha força porque parece confirmar algo em que você deseja acreditar, enquanto as condições concretas de crescimento ficam em segundo plano.',
		'A imaginação pode ampliar o sentido de um caminho em que você acredita. A generosidade encontra profundidade quando um ideal inspira participação concreta, conservando espaço para aprender com o que a experiência revela de diferente.',
		'Esperança e convicção se aproximam. Um horizonte pode ganhar grande significado, mas a confiança se torna frágil se exige negar toda dúvida; admitir o que ainda não se sabe permite que a inspiração continue sem virar certeza sobre o futuro.'
	),
	'neptune:saturn': pairMeaning(
		'Uma sensibilidade ou expectativa nova pode tornar menos convincente uma regra que antes sustentava seu esforço. A obrigação continua existindo, mas perde sentido quando sua forma não acolhe o que você deseja expressar ou preservar.',
		'A sensibilidade pode humanizar uma estrutura rígida. Um compromisso ganha sentido quando admite ritmos, limites e necessidades que a regra sozinha não reconhecia, permitindo continuar com mais presença e menos cumprimento automático.',
		'Um ideal se aproxima dos compromissos que organizam sua vida. A estrutura pode servir à inspiração, mas também pedir revisão quando preserva apenas a forma de um dever cujo sentido já não está claro.'
	),
	'neptune:uranus': pairMeaning(
		'Uma imagem de liberdade pode tornar a realidade de qualquer vínculo ou estrutura decepcionante. O desejo de escapar recebe um ideal amplo demais, dificultando distinguir uma mudança necessária da expectativa de viver sem nenhum limite.',
		'A imaginação pode abrir outra linguagem para sua necessidade de liberdade. Uma alternativa ganha riqueza quando não se limita a negar o conhecido, mas permite criar formas de participação que antes pareciam incompatíveis.',
		'A inspiração se aproxima da vontade de viver de outro modo. Um ideal de autonomia pode renovar possibilidades, mas continua precisando de forma: uma imagem de liberdade não diz, sozinha, como partilhar espaço, tempo e compromisso.'
	),
	'neptune:neptune': pairMeaning(
		'Uma percepção atual pode contrariar a imagem de futuro que orientava seus desejos. A frustração cresce quando admitir a diferença parece invalidar toda esperança, em vez de permitir que o ideal encontre uma forma menos absoluta.',
		'Uma inspiração pode encontrar ligação com sensibilidades que você já reconhece. A continuidade favorece expressão e imaginação quando amplia suas formas de criar sentido, sem exigir que uma experiência confirme o ideal inteiro.',
		'A relação com ideais e expectativas ganha destaque. Uma imagem significativa pode ser retomada com outra sensibilidade; seu valor está no que permite expressar agora, além da promessa que um dia pareceu conter.'
	),
	'neptune:pluto': pairMeaning(
		'Um ideal pode envolver um apego que já tem grande peso. A imagem de como algo deveria ser dificulta reconhecer o que está sendo controlado, e a entrega parece livre mesmo quando nasce do medo de perder lugar.',
		'A sensibilidade pode tornar mais compreensível uma necessidade que estava endurecida. Uma imagem ou expressão simbólica ajuda a aproximar-se do que é difícil admitir, criando espaço para elaborar a intensidade sem exigir controle de toda resposta.',
		'Imaginação e apego se encontram numa questão profunda. Um vínculo ou projeto pode ganhar significado quase absoluto; reconhecer a imagem investida nele permite distinguir seu valor real da tarefa de dar sentido à vida inteira.'
	),
	'pluto:sun': pairMeaning(
		'A necessidade de preservar seu lugar pode tornar uma escolha pessoal difícil de renegociar. Um projeto passa a carregar a prova do seu valor, e mudar de direção parece perder identidade mesmo quando a forma anterior já exige controle excessivo.',
		'Uma percepção mais profunda das suas motivações pode tornar a direção pessoal mais inteira. Assumir o que importa reduz a necessidade de manter uma imagem, permitindo dedicar força a uma escolha em vez de apenas defendê-la.',
		'A intensidade se aproxima da forma como você se reconhece e participa. Uma direção pode pedir transformação; o envolvimento ganha profundidade quando você pode rever um papel sem tratar essa mudança como desaparecimento da própria identidade.'
	),
	'pluto:mercury': pairMeaning(
		'A necessidade de chegar ao fundo de uma questão pode estreitar a escuta. Um detalhe passa a funcionar como chave de tudo, e a investigação se torna pressão quando só aceita respostas que confirmam a explicação já suspeitada.',
		'Uma investigação pode alcançar o interesse ou receio que uma explicação superficial deixava escondido. A profundidade fortalece o entendimento quando amplia a conversa, em vez de usar cada descoberta para encerrar a possibilidade de outra leitura.',
		'O pensamento se concentra numa questão de grande peso. Há disposição para investigar além da superfície, mas compreender perde liberdade quando vira necessidade de eliminar toda dúvida ou de controlar o que outra pessoa pode dizer.'
	),
	'pluto:venus': pairMeaning(
		'O desejo de reciprocidade pode se misturar ao medo de perder uma ligação. A intensidade torna cada diferença um sinal de ameaça, e a tentativa de garantir afeto pode reduzir o espaço de escolha que permitiria uma troca verdadeira.',
		'Uma ligação pode ganhar profundidade quando desejos difíceis de admitir encontram expressão. A intimidade aumenta com a franqueza sobre o que importa, desde que revelar vulnerabilidade não se torne uma dívida que o outro precisa pagar.',
		'A intensidade toca aquilo que faz uma relação ou escolha valer a pena. Um desejo pode ganhar força de necessidade; reconhecer seu peso ajuda a conservar reciprocidade sem transformar o vínculo na única fonte possível de valor.'
	),
	'pluto:mars': pairMeaning(
		'A necessidade de controlar um resultado pode endurecer sua maneira de agir. A resistência aumenta a força investida, e recuar um passo passa a parecer derrota total, mesmo quando insistir no mesmo gesto já não produz avanço.',
		'A força para enfrentar uma questão difícil pode dar profundidade à iniciativa. O esforço ganha direção quando alcança o ponto que precisa mudar, permitindo abandonar disputas laterais que consumiam energia sem tocar o problema.',
		'Intensidade e iniciativa se concentram. Há capacidade de investir esforço numa mudança difícil, mas a ação perde margem de escolha quando negociar, interromper ou rever o objetivo passa a ser vivido como perda de poder.'
	),
	'pluto:jupiter': pairMeaning(
		'Uma convicção pode ganhar o peso de uma posição que precisa vencer. O desejo de crescer se mistura à necessidade de provar que seu caminho é o certo, tornando mais difícil aprender com limites ou com uma perspectiva diferente.',
		'Examinar o que sustenta uma convicção pode ampliar sua liberdade de escolha. O crescimento ganha profundidade quando reconhece interesses e custos antes deixados de fora, sem depender de que a visão anterior permaneça intacta.',
		'A intensidade alcança aquilo em que você acredita e o espaço que deseja conquistar. Uma ambição pode ganhar grande força; seu sentido fica mais claro quando o crescimento não precisa justificar qualquer custo para confirmar a própria visão.'
	),
	'pluto:saturn': pairMeaning(
		'Uma estrutura de compromisso pode ficar mais rígida quando mudar parece ameaçar a base inteira. O esforço de conservar tudo aumenta o peso da responsabilidade, mesmo quando parte dessa forma já deixou de cumprir sua função.',
		'Uma reorganização profunda pode fortalecer o que merece continuidade. O compromisso ganha consistência quando permite rever regras e distribuir responsabilidades, em vez de confundir solidez com a impossibilidade de mudar.',
		'A intensidade toca os limites e deveres que organizam sua vida. Uma estrutura pode pedir transformação; conservar a base não exige conservar cada regra, especialmente quando a forma anterior passou a consumir o sentido do compromisso.'
	),
	'pluto:uranus': pairMeaning(
		'A necessidade de mudar pode ganhar a força de uma disputa por autonomia. Cada limite parece ameaça à liberdade, e a transformação se estreita quando só admite uma ruptura capaz de provar que ninguém controla sua escolha.',
		'Uma mudança profunda pode ampliar a liberdade que você consegue sustentar. Rever um apego permite escolher com menos necessidade de contrariar, deixando a autonomia aparecer também naquilo que você decide manter.',
		'Intensidade e independência se aproximam. Uma alternativa pode carregar a tarefa de transformar tudo; a liberdade ganha alcance quando a mudança aumenta opções reais, em vez de trocar uma obrigação antiga pela obrigação de romper.'
	),
	'pluto:neptune': pairMeaning(
		'Uma imagem ideal pode resistir à revisão porque recebeu grande parte do sentido de uma escolha. A intensidade dificulta admitir diferenças entre esperança e experiência, como se perder uma ilusão significasse perder toda possibilidade de significado.',
		'Aprofundar o que uma imagem representa pode renovar sua relação com um ideal. A inspiração ganha liberdade quando deixa de depender de uma única pessoa, projeto ou resultado para poder existir.',
		'A intensidade encontra os ideais que orientam seus desejos. Uma imagem pode pedir transformação: preservar seu significado envolve reconhecer o que ela inspira e o que exige de uma realidade incapaz de corresponder a tudo.'
	),
	'pluto:pluto': pairMeaning(
		'Uma pressão de mudança pode encontrar a maneira como você tenta conservar controle. O apego se fortalece quando qualquer revisão parece perda total, e manter a posição passa a custar mais do que aquilo que ela deveria proteger.',
		'Reconhecer a função de um apego pode ampliar sua margem de escolha. A transformação encontra apoio na capacidade de admitir o que importa sem fazer da permanência de uma única forma a condição para continuar.',
		'A relação com perda, controle e transformação ganha destaque. Um vínculo ou papel pode revelar o peso que recebeu; mudar sua forma não elimina necessariamente seu valor, mas permite distinguir continuidade de uma obrigação de conservar tudo.'
	),
	'venus:moon': pairMeaning(
		'Uma troca agradável pode não oferecer o acolhimento de que você precisa. Ser apreciado e sentir-se amparado se afastam quando a harmonia depende de deixar uma necessidade sem palavras; a concessão traz companhia, mas pode conservar a solidão do pedido.',
		'Um gesto de afeto pode encontrar a forma de cuidado que faz sentido para você. O prazer da proximidade ganha profundidade quando há espaço para receber, além de oferecer atenção para manter a relação agradável.',
		'A busca de afinidade toca sua necessidade de segurança. Uma relação ou escolha confortável pode ter peso especial, porque o que agrada também parece proteger; isso torna importante reconhecer quando o apego vem do vínculo e quando vem do medo de perder amparo.'
	),
	'venus:mercury': pairMeaning(
		'O desejo de preservar uma conversa agradável pode suavizar uma diferença até torná-la pouco compreensível. A delicadeza perde função quando esconde a informação de que o outro precisaria para compreender sua preferência.',
		'A vontade de encontrar afinidade pode tornar a comunicação mais receptiva. Há espaço para explicar uma diferença de gosto ou de valor com delicadeza, sem retirar da conversa aquilo que precisa ficar claro.',
		'A busca de aproximação se concentra na conversa. Palavras podem expressar apreço e criar entendimento; também podem receber um valor afetivo maior que seu conteúdo, fazendo uma formulação agradável parecer um acordo já estabelecido.'
	),
	'venus:venus': pairMeaning(
		'Uma atração do momento pode contrariar o que costuma fazer uma troca valer a pena para você. O prazer de escolher algo novo encontra o custo de mantê-lo, expondo a diferença entre gostar da possibilidade e desejar suas condições reais.',
		'O prazer do momento pode encontrar uma preferência que você reconhece como sua. Uma escolha ganha naturalidade quando o que agrada também respeita a medida de reciprocidade, tempo ou recurso que deseja dedicar.',
		'A atenção se aproxima dos seus gostos e modos de trocar afeto. Uma preferência pode ganhar nitidez; reafirmá-la tem mais sentido quando expressa desejo presente, além do hábito de continuar escolhendo o que antes agradava.'
	),
	'venus:mars': pairMeaning(
		'O desejo de aproximação pode encontrar uma forma de agir mais direta do que a troca comporta. Atrair e conquistar deixam de ser equivalentes quando a iniciativa tenta obter uma resposta em vez de criar espaço para a reciprocidade.',
		'Uma afinidade pode dar direção à iniciativa. Demonstrar interesse ganha clareza quando o gesto expressa o que você deseja e deixa lugar para a resposta, reunindo coragem para aproximar-se e atenção ao ritmo da troca.',
		'Prazer e iniciativa se aproximam: aquilo que atrai desperta vontade de agir. Essa ligação pode tornar o desejo mais visível, mas também confundir a intensidade do impulso com a existência de interesse recíproco.'
	),
	'venus:jupiter': pairMeaning(
		'Uma possibilidade agradável pode se encaixar depressa numa expectativa de crescimento. A generosidade se amplia junto com o desejo, tornando fácil aceitar um custo maior porque a escolha parece prometer satisfação em muitas frentes ao mesmo tempo.',
		'Afinidade e confiança podem ampliar o espaço de uma troca. O prazer de participar ajuda a reconhecer possibilidades de crescimento compartilhado quando a generosidade inclui uma medida que cada parte consegue manter.',
		'O que agrada se aproxima de uma expectativa maior de realização. Uma escolha pode parecer representar abundância ou pertencimento; seu valor fica mais claro quando o desejo por essa imagem não substitui a experiência concreta da troca.'
	),
	'venus:saturn': pairMeaning(
		'O desejo de prazer ou proximidade pode esbarrar numa regra sobre o que precisa ser merecido. Uma troca corre o risco de virar avaliação de suficiência quando receber afeto parece depender de cumprir uma obrigação inteira.',
		'Uma aproximação pode ganhar confiança pela disponibilidade que se mantém. O afeto encontra apoio em gestos consistentes quando o compromisso dá espaço ao prazer, em vez de transformar a relação apenas em dever.',
		'Uma preferência encontra o peso do compromisso. Gostar pode envolver escolher o que vale manter, inclusive quando exige esforço; a escolha perde reciprocidade se só uma parte pode desejar e à outra cabe sempre corresponder.'
	),
	'venus:uranus': pairMeaning(
		'A vontade de aproximação pode encontrar uma necessidade de espaço que não se acomoda aos gestos habituais de vínculo. O atrito cresce quando demonstrar afeto exige disponibilidade constante ou quando preservar liberdade impede qualquer combinação.',
		'Uma afinidade pode abrir lugar para um jeito diferente de estar junto. A liberdade contribui para a troca quando permite preferências próprias sem tornar a proximidade uma obrigação de pensar, gostar ou responder da mesma maneira.',
		'O que atrai toca sua necessidade de independência. A novidade pode renovar o desejo, mas seu valor não está apenas em interromper a rotina: importa também o espaço de troca que continua possível depois da surpresa.'
	),
	'venus:neptune': pairMeaning(
		'Uma aproximação pode ganhar o encanto da relação que você imagina. Pequenos sinais parecem confirmar uma afinidade maior, enquanto diferenças concretas perdem nitidez; desejar essa imagem pode dificultar reconhecer a troca que está disponível.',
		'Um gesto delicado pode dar expressão a uma sensibilidade difícil de explicar. A beleza de uma troca ganha profundidade quando o afeto permite imaginar e criar sem exigir que a outra pessoa corresponda inteira ao ideal.',
		'Afinidade e imaginação se aproximam. Uma escolha pode tocar um ideal de beleza ou de vínculo e ganhar grande significado; esse encanto enriquece a experiência quando continua possível perceber também o que ainda não foi combinado.'
	),
	'venus:pluto': pairMeaning(
		'O desejo de aproximação pode tocar um apego que pede garantias demais. A intensidade faz a troca parecer indispensável, mas a busca de confirmação pode estreitar a liberdade de desejar, recusar ou negociar de cada parte.',
		'Uma afinidade pode permitir reconhecer um desejo que costuma ficar protegido. A intimidade se aprofunda quando admitir o que importa aumenta a franqueza da troca, sem transformar vulnerabilidade em cobrança de controle.',
		'O que atrai encontra algo difícil de relativizar. Uma preferência pode ganhar força de necessidade; a profundidade do desejo fica mais compreensível quando o vínculo pode existir sem ser tratado como a única fonte de valor ou segurança.'
	),
	'mars:mercury': pairMeaning(
		'A urgência de resolver pode encurtar a escuta. Uma ideia ainda em elaboração vira posição a defender, e a energia que poderia esclarecer a tarefa passa a disputar quem tem razão ou quem responde primeiro.',
		'A iniciativa pode dar consequência a uma ideia. Uma explicação clara ajuda a escolher onde agir, enquanto a disposição para começar impede que o raciocínio permaneça circulando sem encontrar uma aplicação.',
		'A ação se aproxima do pensamento: compreender algo pode despertar vontade imediata de responder ou executar. Essa prontidão dá firmeza às palavras, mas também pode apresentar como conclusão uma ideia que ainda precisava de elaboração.'
	),
	'mars:venus': pairMeaning(
		'A iniciativa pode avançar além do ritmo que torna uma troca agradável. Querer aproximar-se ou obter algo ganha urgência, mas insistir pode reduzir justamente a liberdade da resposta que daria valor ao encontro.',
		'A disposição para agir pode tornar uma preferência visível. Um convite ou uma escolha concreta dá consequência ao desejo quando a firmeza da iniciativa conserva espaço para acordo, recusa e reciprocidade.',
		'Agir e desejar ficam próximos. Aquilo que você valoriza pode mobilizar esforço com facilidade; a intensidade do investimento, porém, não obriga a outra parte a dar ao encontro o mesmo significado.'
	),
	'mars:mars': pairMeaning(
		'A pressa de responder pode encontrar um modo de agir que já tende a insistir. O esforço aumenta sem necessariamente melhorar o resultado quando cada resistência parece exigir mais força na mesma direção.',
		'O impulso do momento pode encontrar uma maneira de agir que você conhece. Há disposição para dar continuidade a uma iniciativa, especialmente quando a energia encontra uma tarefa definida em vez de se dividir entre reações.',
		'A prontidão para agir ganha destaque. Um desejo pode mobilizar iniciativa rapidamente, mas a mesma concentração de força pode tornar difícil distinguir o passo que faz avançar daquele que apenas descarrega a urgência.'
	),
	'mars:jupiter': pairMeaning(
		'A vontade de agir pode crescer junto com a confiança numa possibilidade. O entusiasmo torna o primeiro passo fácil, mas pode ampliar a tarefa antes que tempo e esforço tenham sido medidos; arriscar passa a parecer prova de convicção.',
		'A iniciativa pode dar um passo concreto na direção de uma possibilidade em que você acredita. A confiança oferece motivo para agir quando o gesto tem tamanho suficiente para produzir avanço, sem precisar realizar todo o horizonte de uma vez.',
		'A ação se aproxima de uma expectativa de crescimento. Uma iniciativa pode carregar grande sentido e disposição, mas também receber a tarefa de provar que um caminho inteiro dará certo antes de suas condições estarem claras.'
	),
	'mars:uranus': pairMeaning(
		'A urgência de agir pode tocar a necessidade de romper uma limitação. A resposta ganha velocidade quando qualquer impedimento parece restrição de liberdade, e sair da situação pode passar à frente de escolher o que fazer depois.',
		'A iniciativa pode abrir uma alternativa concreta para algo que parecia preso à repetição. A liberdade ganha forma quando o gesto muda um procedimento ou uma escolha, sem precisar desfazer tudo para produzir diferença.',
		'Agir e libertar-se de uma repetição se aproximam. Um impulso pode dar coragem para experimentar outra resposta; a autonomia ganha continuidade quando a mudança também considera o espaço em que você quer permanecer.'
	),
	'mars:neptune': pairMeaning(
		'A vontade de agir pode se orientar por uma imagem ainda pouco definida. O esforço perde direção quando tenta realizar uma expectativa sem saber o que a confirmaria; aumentar a intensidade não resolve a falta de contorno do objetivo.',
		'A iniciativa pode dar forma a uma inspiração por meio de um gesto concreto. A sensibilidade ajuda a escolher como agir quando o esforço aceita ajustes, em vez de exigir que a primeira tentativa corresponda inteira à imagem imaginada.',
		'A ação se aproxima de um ideal que mobiliza desejo. Isso pode dar sentido a um esforço criativo ou de cuidado, mas também fazer você se dedicar a uma promessa cuja forma prática ainda não está clara.'
	),
	'mars:pluto': pairMeaning(
		'A urgência de responder pode tocar uma disputa em que ceder parece perder tudo. A força cresce, mas o campo de escolha diminui quando cada obstáculo se torna motivo para controlar mais, em vez de avaliar o que ainda vale sustentar.',
		'A iniciativa pode alcançar uma dificuldade que respostas superficiais vinham contornando. A força ganha precisão quando se dirige ao ponto que precisa mudar, sem transformar a capacidade de insistir em obrigação de vencer a qualquer custo.',
		'Impulso e intensidade se concentram na mesma questão. Há força para enfrentar algo difícil, mas o investimento pode se tornar absoluto quando parar, ajustar ou negociar passa a parecer equivalente a desistir de si.'
	),
	'jupiter:sun': pairMeaning(
		'A vontade de ampliar sua participação pode ultrapassar a direção que você consegue sustentar. Reconhecimento e crescimento parecem caminhar juntos, mas aceitar cada abertura pode dispersar o projeto que deveria dar sentido à expansão.',
		'Uma possibilidade de crescimento pode dar mais espaço à direção que você deseja assumir. A confiança ajuda a participar quando a ampliação permite expressar algo seu, além de apenas ocupar um lugar maior.',
		'A expectativa de expansão se aproxima da imagem que você constrói de si. Uma possibilidade pode parecer confirmar quem deseja ser; a confiança ganha consistência quando também admite o aprendizado necessário para ocupar esse espaço.'
	),
	'jupiter:moon': pairMeaning(
		'O desejo de ampliar o conforto pode tornar difícil reconhecer quando o bastante foi alcançado. Mais cuidado, mais companhia ou mais possibilidades parecem prometer segurança, mas a necessidade pode continuar sem nome mesmo depois de receber muito.',
		'A confiança pode ampliar o espaço para receber e oferecer cuidado. O acolhimento deixa de depender apenas do que já é familiar quando uma nova possibilidade cabe numa base emocional que continua reconhecível.',
		'A expansão toca sua maneira de buscar segurança. Uma expectativa de acolhimento pode crescer e tornar mais visível o que você deseja receber; o tamanho da esperança não define a disponibilidade real de quem participa da troca.'
	),
	'jupiter:mars': pairMeaning(
		'A confiança numa possibilidade pode aumentar a força que você se dispõe a investir. A iniciativa perde medida quando cada avanço autoriza uma aposta maior, como se entusiasmo garantisse energia para sustentar todos os passos seguintes.',
		'Um horizonte mais amplo pode dar propósito à iniciativa. A coragem para começar encontra direção quando o esforço faz parte de um caminho compreensível, e não precisa provar toda a sua capacidade numa única ação.',
		'A expansão se aproxima da sua maneira de agir e disputar espaço. Uma iniciativa pode ganhar ambição; a força desse movimento depende de distinguir coragem para tentar de certeza de que todo limite será superado.'
	),
	'jupiter:jupiter': pairMeaning(
		'Uma possibilidade de crescimento pode contrariar a visão pela qual você vinha orientando escolhas. O atrito aparece quando ampliar o horizonte exige rever uma convicção, e confiar no novo parece desautorizar tudo o que antes fazia sentido.',
		'Uma possibilidade encontra ligação com aquilo em que você já acredita. O crescimento ganha coerência quando amplia experiência e compreensão, sem fazer da concordância com sua visão a única medida do que vale aprender.',
		'A atenção se volta para o horizonte que orienta suas escolhas. Um desejo de crescer pode ganhar novo alcance; a renovação de confiança fica mais consistente quando considera o que a experiência acrescentou à expectativa inicial.'
	),
	'jupiter:uranus': pairMeaning(
		'A expansão pode se confundir com a necessidade de escapar de qualquer limite. Uma alternativa parece especialmente promissora por ser diferente, e o desejo de liberdade pode antecipar benefícios que ainda não têm forma concreta.',
		'Uma possibilidade de crescimento pode abrir espaço para experimentar outra maneira de viver ou trabalhar. A inovação ganha sentido quando a liberdade adquirida permite desenvolver algo que o modelo anterior deixava de fora.',
		'Crescimento e independência se aproximam. Uma alternativa pode carregar a promessa de ampliar sua liberdade; o alcance dessa escolha depende também do que ela permite construir, além do que deixa para trás.'
	),
	'jupiter:neptune': pairMeaning(
		'A confiança pode ampliar uma imagem de futuro antes de suas condições ficarem claras. Um ideal inspirador passa a parecer confirmação de viabilidade, tornando mais difícil reconhecer os detalhes que ainda não sustentam a promessa.',
		'A imaginação pode dar sentido a uma possibilidade de crescimento. Um ideal amplia a visão quando inspira escolhas concretas e admite formas imperfeitas de realização, em vez de exigir que uma única experiência entregue tudo o que foi imaginado.',
		'A expansão se aproxima de um ideal que reúne esperança e desejo. Essa imagem pode mobilizar generosidade e criação, mas também receber promessas demais quando confiar passa a significar não admitir qualquer incerteza.'
	),
	'jupiter:pluto': pairMeaning(
		'O desejo de crescer pode se ligar a uma necessidade de garantir poder sobre o resultado. A aposta aumenta quando abrir mão de uma vantagem parece perder lugar; ampliar recursos pode então servir mais à disputa do que ao projeto.',
		'Uma possibilidade de crescimento pode permitir rever um apego que limitava suas escolhas. A expansão ganha profundidade quando aumenta sua margem de decisão, além de reforçar o controle sobre o que já possui.',
		'A ambição de ampliar o caminho toca uma questão de poder ou pertencimento difícil de relativizar. A confiança pode sustentar uma transformação, mas também tornar uma aposta absoluta se todo o sentido da escolha depende de vencer.'
	),
	'sun:sun': pairMeaning(
		'O que recebe sua atenção agora pode disputar espaço com a direção que considera sua. Uma tarefa visível pode pedir tanto envolvimento que o reconhecimento de curto prazo passa a decidir prioridades que tinham outro sentido.',
		'Aquilo a que você dedica atenção pode expressar com clareza a direção que deseja seguir. Há coerência entre presença e propósito quando uma tarefa concreta representa algo seu, sem precisar resumir toda a sua identidade.',
		'A atenção se volta para o modo como você ocupa a própria vida. Querer aparecer, criar ou assumir uma decisão pode reunir-se numa pergunta de autoria: quanto do que recebe seu empenho ainda corresponde ao que deseja construir?'
	),
	'sun:moon': pairMeaning(
		'Colocar-se em evidência pode pedir uma disponibilidade emocional que não acompanha a intenção. A vontade de realizar continua legítima, mas fica mais difícil sustentá-la quando o descanso ou o acolhimento passam a parecer obstáculos ao desempenho.',
		'A direção que você assume pode encontrar apoio naquilo que traz familiaridade e amparo. Participar deixa de exigir uma separação tão grande entre o que quer realizar e o modo como precisa ser cuidado para continuar.',
		'A maneira como você se posiciona toca diretamente sua necessidade de acolhimento. Uma escolha pode ganhar um significado muito íntimo; por isso, a resposta recebida tende a ser lida também como sinal de aceitação, além de avaliação da proposta.'
	),
	'sun:mercury': pairMeaning(
		'Querer que uma ideia represente bem você pode tornar mais difícil revisá-la. Uma discordância sobre um detalhe corre o risco de parecer desvalorização pessoal, estreitando justamente a conversa que permitiria melhorar a explicação.',
		'Uma intenção encontra palavras que a tornam compreensível. Explicar por que um assunto importa para você pode dar unidade aos detalhes, sem exigir que cada argumento prove sua competência.',
		'Sua atenção se concentra no que pensa e no modo como se faz entender. Falar de uma ideia pode ser também apresentar-se; a conversa ganha espaço quando uma revisão do argumento não precisa ser sentida como recuo de identidade.'
	),
	'sun:venus': pairMeaning(
		'O desejo de assumir uma posição pode expor uma diferença de gosto ou de valor que antes passava despercebida. Conquistar reconhecimento e preservar uma troca agradável deixam de ser a mesma coisa quando a preferência precisa ficar clara.',
		'Você pode dar mais presença ao que aprecia: uma relação, uma criação ou uma escolha ganha lugar porque representa um valor seu. O prazer ajuda a distinguir participação verdadeira de uma obrigação de agradar.',
		'A atenção ilumina aquilo que faz uma troca valer a pena. Receber apreço pode ser especialmente significativo, mas há uma diferença entre sentir-se reconhecido por sua preferência e escolher apenas aquilo que rende aprovação.'
	),
	'sun:jupiter': pairMeaning(
		'Uma oportunidade de se afirmar pode ganhar proporções maiores do que o espaço disponível para realizá-la. O entusiasmo se mistura ao desejo de reconhecimento, tornando mais difícil admitir que uma boa ideia ainda precisa de etapas.',
		'Uma direção pessoal encontra um horizonte que lhe dá sentido. A confiança pode ajudar você a assumir uma participação maior, especialmente quando a possibilidade de crescer se liga a algo em que de fato acredita.',
		'O que você deseja realizar se aproxima de uma imagem mais ampla do futuro. Essa identificação pode dar coragem para ocupar espaço, mas também tornar cada oportunidade uma promessa sobre quem você deveria conseguir ser.'
	),
	'sun:saturn': pairMeaning(
		'Colocar sua vontade em primeiro plano pode expor o peso de compromissos já assumidos. A dificuldade está em não confundir uma limitação concreta com incapacidade pessoal: o projeto e a medida de esforço disponível precisam caber na mesma decisão.',
		'A atenção dedicada a uma responsabilidade pode tornar visível o valor do trabalho contínuo. Há espaço para reconhecer competência no que você consegue manter, além daquilo que chama atenção de imediato.',
		'Um compromisso pode ocupar o centro da sua participação. Assumir uma tarefa dá forma à direção desejada, mas perde autoria quando a única razão para continuar é demonstrar que você suporta a cobrança.'
	),
	'sun:uranus': pairMeaning(
		'A vontade de ser reconhecido pode esbarrar na necessidade de conservar independência. Um papel oferece visibilidade, mas pode parecer estreito se exige esconder aquilo que você faria de modo diferente.',
		'Sua participação pode ganhar uma forma mais própria quando você dá espaço a uma ideia incomum. A diferença passa a contribuir para o que deseja construir, em vez de depender apenas da recusa de um modelo.',
		'A atenção se volta para a liberdade de ocupar um lugar do seu jeito. Destacar uma diferença pode afirmar sua presença; o sentido dessa escolha depende também do que ela permite criar, além de romper expectativas.'
	),
	'sun:neptune': pairMeaning(
		'A imagem de quem você gostaria de ser pode ficar mais nítida que os meios de vivê-la. O envolvimento com um ideal pode enriquecer a direção pessoal, mas também fazer uma participação real parecer insuficiente diante de uma imagem sem limites.',
		'Imaginação e sensibilidade podem dar profundidade ao modo como você participa. Uma intenção ganha expressão quando encontra linguagem, gesto ou criação capazes de transmitir algo que uma explicação puramente prática deixaria de fora.',
		'A atenção se aproxima de uma imagem que inspira sua participação. Há espaço para criar a partir desse ideal, desde que a identificação com ele não apague a diferença entre o que você sente ser possível e o que já tomou forma.'
	),
	'sun:pluto': pairMeaning(
		'Afirmar sua presença pode tocar uma questão em que ceder parece perder o próprio lugar. Uma diferença pontual ganha intensidade quando o reconhecimento se mistura ao controle; vencer a disputa pode então custar o sentido da participação.',
		'A atenção pode alcançar uma motivação que costuma ficar escondida sob a necessidade de manter uma posição. Reconhecer o que você deseja preservar permite assumir uma escolha com mais inteireza e menos esforço para controlar toda resposta.',
		'O modo como você se posiciona encontra um vínculo, projeto ou papel difícil de relativizar. O envolvimento pode dar profundidade à escolha, mas também torná-la absoluta, como se mudar uma parte significasse perder a presença inteira.'
	),
	'moon:sun': pairMeaning(
		'O conforto procurado no momento pode não acompanhar a direção que você escolheu sustentar. Uma tarefa que faz sentido pode parecer menos atraente quando pede exposição ou esforço; a oscilação de disposição não decide, sozinha, o valor da escolha.',
		'A disposição emocional pode acompanhar uma escolha que tem sentido para você. Um gesto simples de participação tende a parecer mais seu quando há espaço para agir sem esconder o que sente nem transformar cada reação em decisão definitiva.',
		'Um estado emocional pode tornar especialmente pessoal aquilo que você está fazendo. Há proximidade entre sentir e se posicionar; uma resposta imediata pode revelar envolvimento, mas não precisa definir toda a direção que você deseja manter.'
	),
	'moon:moon': pairMeaning(
		'Uma necessidade do momento pode encontrar um hábito de proteção que já não a atende tão bem. Buscar o conhecido pode trazer alívio e, ainda assim, deixar sem resposta aquilo que mudou na maneira como você precisa de cuidado.',
		'O que você sente no momento pode encontrar acolhimento em um gesto conhecido: descanso, presença ou um ritmo familiar. Essa continuidade ajuda a reconhecer uma necessidade antes que ela precise aparecer como reação intensa.',
		'A resposta emocional se aproxima dos seus modos habituais de buscar segurança. Uma sensação familiar pode ganhar nitidez; há diferença entre reconhecer a necessidade que volta e repetir automaticamente a mesma forma de atendê-la.'
	),
	'moon:mercury': pairMeaning(
		'O sentimento do momento pode ocupar as lacunas de uma conversa. Uma frase ambígua ganha sentido conforme o acolhimento ou a defesa que você procura, tornando mais difícil distinguir o que foi dito daquilo que a reação acrescentou.',
		'Uma emoção pode encontrar palavras antes de virar ruído na conversa. Nomear o que afeta você ajuda a tornar a explicação mais humana, sem fazer do sentimento a única prova sobre a intenção de quem escuta.',
		'O que você sente e o que pensa sobre uma situação ficam próximos. Essa ligação pode dar precisão à expressão de uma necessidade, mas também fazer uma impressão momentânea parecer uma conclusão já examinada.'
	),
	'moon:venus': pairMeaning(
		'Precisar de acolhimento pode tornar a aprovação especialmente importante. Uma concessão traz alívio imediato, mas pode deixar sua preferência sem lugar se manter o clima agradável passa a valer mais que a reciprocidade.',
		'O conforto emocional pode se aproximar de gestos de afeto que você valoriza. A delicadeza de uma troca ganha sentido quando o prazer de estar junto inclui espaço para a sua necessidade, além de atender à do outro.',
		'Afeto e necessidade de conforto se misturam. Uma escolha agradável pode cuidar de você, mas também funcionar como compensação rápida para um incômodo que continua pedindo acolhimento; prazer e cuidado se encontram sem serem sempre equivalentes.'
	),
	'moon:mars': pairMeaning(
		'Um incômodo do momento pode acionar sua maneira habitual de reagir antes de ficar claro o que precisa de proteção. A defesa ganha força, mas pode transformar um pedido de cuidado numa disputa que dificulta recebê-lo.',
		'Perceber um incômodo pode dar direção a uma iniciativa concreta. A disposição para agir ajuda a cuidar de uma necessidade quando a firmeza do gesto corresponde ao tamanho do que está acontecendo.',
		'A emoção toca diretamente sua prontidão para agir. Essa proximidade pode tornar um limite mais visível, mas também dar urgência a uma resposta que continuará produzindo efeitos depois que o sentimento inicial mudar.'
	),
	'moon:jupiter': pairMeaning(
		'A vontade de sentir alívio pode aumentar o tamanho de uma expectativa. Algo que anima no momento parece prometer mais do que já oferece; entusiasmo e conforto se confundem quando aceitar mais parece a maneira de não perder essa sensação.',
		'Uma disposição mais receptiva pode aproximar você de uma possibilidade em que já acredita. O ânimo ajuda a sair de uma preocupação estreita e perceber caminhos, sem transformar o bem-estar momentâneo em garantia de que tudo caberá.',
		'O sentimento do momento encontra sua maneira de confiar no futuro. Uma pequena abertura pode ganhar grande significado e trazer esperança; o tamanho da emoção, porém, não determina o tamanho real da oportunidade.'
	),
	'moon:saturn': pairMeaning(
		'Uma necessidade imediata de descanso pode esbarrar no compromisso que você costuma manter. O desconforto aumenta quando precisar de cuidado parece sinal de falha, deixando a responsabilidade sem uma medida humana de continuidade.',
		'Uma estrutura conhecida pode oferecer amparo ao sentimento do momento. Um acordo previsível ou uma tarefa com limite claro ajuda a descansar da incerteza, desde que organização também deixe lugar para receber cuidado.',
		'A emoção se aproxima do peso que você atribui ao dever. Cumprir algo pode trazer segurança, mas também se tornar a única permissão para descansar; cuidado e mérito começam a ocupar o mesmo lugar.'
	),
	'moon:uranus': pairMeaning(
		'A necessidade de conforto pode entrar em atrito com sua vontade de preservar liberdade. Aproximar-se parece arriscar espaço; afastar-se pode aumentar a falta de acolhimento. A tensão está em imaginar que só uma dessas necessidades pode ter lugar.',
		'Uma pequena mudança de ritmo pode tornar mais fácil reconhecer o que você sente. A liberdade para responder de outro modo oferece alívio quando abre espaço para uma necessidade, além de apenas afastar o que incomoda.',
		'O sentimento do momento toca sua necessidade de independência. Uma vontade de mudar o ambiente ou interromper uma repetição pode expressar necessidade de espaço, sem constituir, por si só, uma decisão de rompimento.'
	),
	'moon:neptune': pairMeaning(
		'O clima emocional pode ganhar mais peso que as informações disponíveis. Uma ausência ou um gesto pequeno pode ser preenchido com esperança ou receio, tornando difícil distinguir a sensibilidade ao ambiente de uma certeza sobre o que ele significa.',
		'Uma impressão sutil pode encontrar acolhimento sem precisar virar explicação imediata. Música, imagem ou um gesto delicado podem dar forma ao que você sente; o ganho está nessa expressão, sem presumir que a impressão revele a intenção de outra pessoa.',
		'Emoção e imaginação ficam próximas, dando força a imagens, lembranças e expectativas. Essa riqueza pode ampliar a expressão do sentimento, mas também fazer o que você teme ou deseja parecer já presente na situação.'
	),
	'moon:pluto': pairMeaning(
		'Uma reação breve pode tocar um vínculo ao qual você atribui grande peso. A necessidade de segurança ganha intensidade quando um sinal pequeno parece ameaçar o lugar inteiro, levando a buscar garantias que nenhuma resposta pontual consegue oferecer.',
		'Uma emoção do momento pode tornar reconhecível uma necessidade mais profunda. Há espaço para admitir o que importa sem transformar essa descoberta em exigência de controlar a resposta ou a disponibilidade de outra pessoa.',
		'O sentimento se aproxima de algo difícil de soltar. Uma lembrança ou um gesto pode adquirir grande importância; reconhecer essa intensidade ajuda a distinguir o vínculo que está em jogo do episódio breve que o tornou visível.'
	),
	'mercury:sun': pairMeaning(
		'Uma informação nova pode contrariar a maneira como você deseja se apresentar. Explicar mais e mais a própria posição pode virar defesa de identidade, deixando pouco espaço para a revisão que tornaria a escolha mais consistente.',
		'Uma conversa pode ajudar você a esclarecer a direção que pretende assumir. As palavras dão contorno à participação quando permitem distinguir uma intenção sua das expectativas que foram sendo acrescentadas a ela.',
		'Perguntas e explicações se concentram no modo como você se posiciona. Dar nome a uma intenção pode fortalecê-la; a mesma proximidade pode fazer cada objeção ao argumento parecer uma objeção à sua presença.'
	),
	'mercury:moon': pairMeaning(
		'Procurar uma explicação pode não atender à necessidade de acolhimento envolvida. Uma conversa se alonga quando cada detalhe tenta provar por que um sentimento deveria ser aceito, embora o cuidado procurado dependa também de escuta.',
		'A conversa pode dar forma a uma necessidade que era difícil mostrar. Um pedido se torna mais compreensível quando as palavras conservam o sentimento, sem exigir que ele seja perfeitamente racional para merecer atenção.',
		'Pensar sobre uma situação toca seus modos habituais de buscar segurança. Uma lembrança pode organizar a explicação, mas também preencher uma lacuna com uma experiência anterior que não corresponde inteira ao que acontece agora.'
	),
	'mercury:mercury': pairMeaning(
		'Uma informação nova pode encontrar uma explicação já organizada demais para acolhê-la. O atrito não está apenas na quantidade de detalhes, mas no esforço de fazer tudo caber numa conclusão que talvez precise ser revista.',
		'Uma pergunta encontra ligação com algo que você já sabe. Comparar versões pode tornar a explicação mais clara, porque o conhecimento anterior oferece uma base sem precisar encerrar a investigação.',
		'O pensamento se concentra na maneira de entender e comunicar. Retomar uma questão pode revelar um detalhe antes disperso; a repetição deixa de ajudar quando apenas reformula a mesma conclusão sem incorporar o que chegou de novo.'
	),
	'mercury:venus': pairMeaning(
		'Uma conversa pode mostrar a distância entre o que parece razoável e o que você de fato deseja. Encontrar uma formulação agradável não resolve a diferença de preferência quando o acordo depende de esconder o que faria a troca valer a pena.',
		'Explicar uma preferência pode facilitar uma troca mais justa. A conversa ganha delicadeza quando torna o desejo compreensível, oferecendo ao outro algo mais claro que a tarefa de adivinhar o que agrada.',
		'As palavras se aproximam do desejo de afinidade. Uma negociação pode dar nome ao que você valoriza, mas também encobrir uma diferença com uma expressão bonita; a clareza está em o acordo representar a preferência, além de soar bem.'
	),
	'mercury:mars': pairMeaning(
		'Uma ideia pode acionar a prontidão para responder antes de ser compreendida inteira. A conversa ganha força de disputa quando cada detalhe vira argumento para avançar ou se defender, deixando a pergunta inicial para trás.',
		'Uma informação pode tornar a iniciativa mais precisa. Dar nome ao que precisa ser feito ajuda a dirigir o esforço, e a firmeza da comunicação reduz a distância entre decidir e começar.',
		'Pensamento e impulso de agir se aproximam. Uma resposta rápida pode destravar uma tarefa, mas também transformar uma hipótese em ordem; a diferença está em saber quanto da ação já tem fundamento e quanto ainda nasce da pressa.'
	),
	'mercury:jupiter': pairMeaning(
		'Um detalhe pode contrariar a conclusão ampla em que você acredita. A dificuldade surge quando a conversa precisa confirmar o horizonte desejado: selecionar apenas os argumentos favoráveis preserva a confiança, mas enfraquece a compreensão do caminho.',
		'Uma informação concreta pode dar sustentação a uma ideia maior. Aprender e explicar se aproximam quando o detalhe mostra como uma possibilidade funciona, além de repetir por que ela parece promissora.',
		'Uma pergunta pode abrir muitas associações com aquilo em que você acredita. A conversa ganha alcance, mas uma explicação abrangente ainda pode deixar lacunas; compreender o sentido geral não dispensa compreender a passagem entre as partes.'
	),
	'mercury:saturn': pairMeaning(
		'A necessidade de explicar corretamente pode encontrar uma cobrança que não admite rascunho. Uma dúvida simples se torna prova de competência, tornando difícil falar antes de ter certeza de todos os detalhes.',
		'Uma pergunta pode ajudar a organizar um compromisso em partes compreensíveis. A precisão dá apoio à continuidade quando esclarece o necessário e permite distinguir um limite real de uma exigência que ficou maior que a tarefa.',
		'O pensamento se concentra no que precisa ter forma, prazo ou critério. Essa seriedade pode produzir um acordo claro, mas também fechar cedo a conversa se toda dúvida for tratada como risco de falhar.'
	),
	'mercury:uranus': pairMeaning(
		'Uma informação pode despertar a vontade de contrariar uma explicação conhecida antes de examiná-la. A originalidade perde clareza quando cada correção parece ameaça à liberdade de pensar, e a conversa vira defesa da diferença.',
		'Uma pergunta pode abrir uma ligação que o raciocínio habitual deixava de fora. A ideia diferente ganha utilidade quando encontra palavras para ser compartilhada, em vez de permanecer apenas como intuição de que existe outro caminho.',
		'O pensamento se aproxima da vontade de experimentar uma explicação nova. Uma associação inesperada pode reorganizar o assunto; seu valor aparece no que esclarece, além da surpresa de não seguir o raciocínio anterior.'
	),
	'mercury:neptune': pairMeaning(
		'Uma explicação pode receber mais sentido da imagem que desperta do que do que efetivamente informa. Uma palavra ambígua permite preencher lacunas com expectativa, tornando difícil separar uma interpretação sensível de uma afirmação verificável.',
		'Palavras podem dar forma a uma percepção que parecia vaga. Uma imagem ou analogia ajuda a comunicar nuances quando esclarece a experiência, conservando a diferença entre descrever uma impressão e afirmar um fato.',
		'A conversa se aproxima da imaginação. Uma imagem expressiva pode reunir sentimentos difíceis de nomear, mas também produzir um entendimento apenas aparente se cada pessoa atribui um sentido diferente ao que foi dito.'
	),
	'mercury:pluto': pairMeaning(
		'Uma pergunta pode tocar um assunto em que conhecer parece oferecer controle. A conversa se estreita quando cada resposta gera outra exigência de certeza, e compreender o que importa passa a se confundir com eliminar toda ambiguidade.',
		'Uma pergunta bem situada pode alcançar o que uma explicação superficial deixava de fora. A profundidade aparece quando a conversa nomeia o interesse ou o receio em jogo, sem transformar a descoberta em instrumento de pressão.',
		'O pensamento se concentra numa questão difícil de relativizar. Investigar pode esclarecer o que sustenta seu apego, mas também fazer um detalhe ocupar espaço demais quando ele parece conter a resposta definitiva sobre tudo.'
	),
	'saturn:sun': {
		tension:
			'A direção que você deseja dar à vida encontra a medida do que consegue sustentar. Um projeto importante pode passar a parecer uma prova de competência, tornando difícil reconhecer avanços que ainda não correspondem à exigência inteira. A tensão está em dar forma à ambição sem transformar cada limite em um julgamento sobre seu valor.',
		cooperation:
			'A vontade de realizar encontra apoio na continuidade: uma escolha ganha força quando recebe tempo, prioridade e um compromisso possível. Assumir responsabilidade pode tornar sua participação mais clara, sem exigir que você dê conta de tudo para merecer reconhecimento.',
		conjunction:
			'A direção pessoal e a responsabilidade se concentram na mesma questão. Aquilo que você quer construir pede uma forma mais definida, mas o compromisso perde sentido se resta apenas cumprir exigências. A maturidade desse encontro está em reconhecer quais deveres sustentam uma escolha sua.'
	},
	'mars:moon': {
		tension:
			'A reação pode ganhar velocidade antes de a necessidade emocional encontrar palavras. Um incômodo pede ação, mas responder apenas ao impulso pode afastar justamente o acolhimento procurado. A tensão aproxima proteção e confronto: defender um limite fica mais claro quando a resposta expressa o que precisa ser cuidado.',
		cooperation:
			'Perceber uma necessidade pode ajudar você a agir em favor dela. O impulso encontra uma direção afetiva, como tomar uma iniciativa de cuidado ou tornar um limite compreensível. A força desse encontro está em responder ao sentimento sem exigir que ele justifique qualquer reação.',
		conjunction:
			'Sentimento e reação ficam próximos: o que toca você pode despertar vontade imediata de fazer algo. Essa prontidão pode proteger uma necessidade, mas também dar a uma emoção passageira a força de uma decisão. Distinguir o cuidado procurado da urgência da resposta permite agir com mais precisão.'
	},
	'venus:sun': {
		tension:
			'O desejo de ser aceito pode entrar em negociação com a maneira como você quer se posicionar. Manter uma troca agradável tem valor, mas perde reciprocidade quando sua participação depende de esconder uma preferência. A dificuldade está em fazer caber vínculo e escolha própria na mesma relação.',
		cooperation:
			'Aquilo que agrada pode ajudar você a reconhecer onde deseja participar. Afinidade e expressão pessoal se aproximam: uma escolha ganha sentido quando combina envolvimento com uma troca que vale a pena manter. O reconhecimento recebido pode acompanhar sua direção, sem precisar defini-la.',
		conjunction:
			'O que você valoriza se aproxima da imagem que deseja construir de si. Uma preferência deixa de ser mero detalhe quando orienta onde colocar presença, tempo e afeto. A questão é reconhecer o que dá gosto à participação sem fazer da aprovação alheia a única medida dessa escolha.'
	},
	'mars:sun': {
		tension:
			'A vontade de afirmar uma direção pode se confundir com a necessidade de vencer uma resistência. A ação ganha força, mas pode consumir energia defendendo sua posição em vez de fazer avançar o que importa. Separar iniciativa de disputa ajuda a dar consequência à vontade de realizar.',
		cooperation:
			'A iniciativa encontra uma direção pessoal: fica mais compreensível por que vale a pena agir e em que investir esforço. Essa combinação favorece dar um primeiro passo coerente com o que você quer construir, desde que a prontidão também aceite o trabalho de continuar.',
		conjunction:
			'Querer e agir se aproximam. Uma intenção pode pedir expressão concreta, aumentando a disposição para iniciar e assumir uma posição. O mesmo envolvimento que dá força ao movimento pode tornar a resistência mais pessoal; a ação ganha direção quando serve ao projeto, além de provar que você consegue.'
	},
	'sun:mars': {
		tension:
			'A vontade de se posicionar encontra uma maneira de agir que nem sempre acompanha a direção desejada. Insistir para provar uma escolha pode consumir a energia necessária para realizá-la. A tensão pede aproximar intenção e gesto, distinguindo o que faz avançar do que apenas responde à resistência.',
		cooperation:
			'A direção escolhida e a iniciativa podem se apoiar: agir torna visível o que você quer construir. A disposição ganha propósito quando encontra uma tarefa em que sua participação faz diferença, sem depender de transformar cada passo em demonstração de força.',
		conjunction:
			'A afirmação pessoal e a iniciativa se concentram na mesma direção. Há uma proximidade entre desejar algo e procurar um modo de fazê-lo acontecer. O envolvimento pode dar coragem para começar, mas também tornar qualquer impedimento uma questão pessoal; escolher onde investir a força dá mais continuidade à ação.'
	},
	'saturn:moon': {
		tension:
			'O desejo de dar conta das responsabilidades pode entrar em conflito com a necessidade de receber cuidado. A dificuldade específica está em tentar merecer acolhimento pela resistência: quanto mais você aguenta em silêncio, menos espaço sobra para mostrar o que precisa.',
		cooperation:
			'A necessidade de acolhimento encontra apoio em algo previsível: um limite combinado, uma presença constante, uma rotina menos exigente. O cuidado ganha consistência quando deixa de depender apenas da disposição do momento.',
		conjunction:
			'Cuidado e responsabilidade se aproximam tanto que pode ficar difícil distingui-los. Construir uma base segura pede compromisso, mas uma base que só exige esforço deixa de oferecer descanso.'
	},
	'jupiter:mercury': {
		tension:
			'A visão do conjunto pode avançar mais rápido do que a verificação dos detalhes. Você pode compreender uma possibilidade ampla e ainda precisar revisar como chegou à conclusão; a riqueza das associações perde precisão quando toda ideia promissora é tratada como resposta pronta.',
		cooperation:
			'O detalhe encontra uma ideia maior que o organiza. Isso favorece aprender por conexões e explicar um assunto mostrando por que ele importa; a clareza cresce quando a visão ampla conserva exemplos verificáveis.',
		conjunction:
			'Pensamento e expectativa de expansão ocupam o mesmo espaço: uma informação pode abrir muitas possibilidades de uma vez. A leitura destaca a diferença entre compreender um caminho e já dispor de todas as condições para percorrê-lo.'
	},
	'uranus:venus': {
		tension:
			'O desejo de respirar com mais liberdade pode entrar em atrito com aquilo que mantém uma relação ou escolha familiar. Uma concessão antes tolerável pode parecer estreita; a questão é atualizar o acordo sem concluir, apenas pela inquietação, que tudo perdeu valor.',
		cooperation:
			'A afinidade pode se renovar quando cabe nela uma preferência inesperada ou um modo menos habitual de estar junto. Há espaço simbólico para ampliar a troca sem exigir que proximidade signifique fazer tudo do mesmo jeito.',
		conjunction:
			'Liberdade e desejo ficam muito próximos: o que atrai pode ser justamente o que interrompe uma repetição. A novidade ganha sentido quando revela uma preferência sua, em vez de servir apenas para escapar do tédio.'
	},
	'neptune:mercury': {
		tension:
			'A sensibilidade pode captar muitas nuances enquanto as palavras ainda não conseguem separá-las. Uma impressão forte pode parecer explicação suficiente; a dificuldade está em distinguir o que foi dito, o que foi imaginado e o que você gostaria de ouvir.',
		cooperation:
			'A imaginação encontra linguagem: uma imagem, uma associação ou uma maneira delicada de dizer pode tornar compreensível algo que uma explicação literal deixaria escapar. Essa abertura funciona melhor quando a metáfora não substitui a informação necessária.',
		conjunction:
			'Pensar e imaginar se aproximam. As associações podem enriquecer a compreensão, mas a mesma permeabilidade que permite criar também pede cuidado ao tratar uma impressão como mensagem inequívoca.'
	},
	'mars:saturn': {
		tension:
			'A vontade de avançar encontra um limite que exige ritmo e preparo. Isso pode ser vivido como freio, mas acelerar contra a resistência tende a consumir esforço; a tensão pede distinguir o obstáculo que protege a continuidade daquele que apenas repete uma cobrança.',
		cooperation:
			'A iniciativa encontra uma estrutura capaz de sustentá-la. O impulso de começar pode se transformar em trabalho continuado quando há uma tarefa definida e um limite de esforço; disciplina e ação deixam de disputar o mesmo lugar.',
		conjunction:
			'O impulso de agir se concentra justamente onde há responsabilidade ou resistência. Um esforço firme pode ganhar direção, mas forçar todas as etapas ao mesmo tempo pode transformar persistência em desgaste.'
	},
	'saturn:mars': {
		tension:
			'Você pode querer resolver pela ação uma questão que exige tempo, limite ou preparação. A frustração nasce da diferença entre a energia disponível para começar e as condições para continuar; sustentar a iniciativa pede uma medida de esforço que não dependa de vencer tudo imediatamente.',
		cooperation:
			'A força para agir encontra uma medida que ajuda a durar. Um limite claro pode concentrar a energia em vez de apagá-la, permitindo que a iniciativa se torne um compromisso praticável.',
		conjunction:
			'A ação encontra o peso do compromisso. O esforço pode ficar mais concentrado, mas a vontade de fazer precisa negociar com o tempo real de execução para que firmeza não se torne rigidez.'
	},
	'jupiter:venus': {
		tension:
			'O desejo de ampliar prazer, contato ou conforto pode ultrapassar a medida da troca. Uma possibilidade atraente pode receber mais investimento do que comporta; o ponto delicado é reconhecer valor sem transformar entusiasmo em obrigação de aceitar ou gastar.',
		cooperation:
			'A vontade de compartilhar encontra mais espaço. Uma preferência pode ser expressa com generosidade e tornar uma troca mais fértil, desde que dar mais não signifique ignorar diferenças de disponibilidade.',
		conjunction:
			'O que agrada ganha dimensão: prazer, afinidade e expectativas de troca podem se intensificar na leitura. A generosidade se sustenta quando preserva uma medida que não precise ser paga depois com ressentimento.'
	},
	'pluto:moon': {
		tension:
			'A necessidade de segurança encontra sentimentos que não se acomodam facilmente. Tentar garantir acolhimento controlando a resposta alheia pode estreitar a própria relação; a questão é reconhecer a intensidade da necessidade sem confundi-la com direito sobre o outro.',
		cooperation:
			'Uma disposição para aprofundar pode ajudar a reconhecer o que sustenta ou esgota sua sensação de segurança. A intimidade ganha espaço quando é possível admitir uma necessidade difícil sem exigir uma solução imediata.',
		conjunction:
			'O que oferece segurança pode ganhar um peso emocional maior. A leitura aproxima intimidade e intensidade: aprofundar uma ligação pede também tolerar que nem toda resposta possa ser controlada.'
	},
	'neptune:venus': {
		tension:
			'O desejo pode se aproximar muito da imagem que você faz de uma relação ou possibilidade. A delicadeza da expectativa merece espaço, mas os sinais concretos de reciprocidade podem ficar em segundo plano quando preservar o encanto se torna mais importante que compreender a troca.',
		cooperation:
			'Sensibilidade e afeto podem se enriquecer: há espaço para perceber beleza, sutileza e formas de cuidado que não se resumem a utilidade. A conexão fica mais sustentável quando o gesto sensível convive com acordos claros.',
		conjunction:
			'Afinidade e idealização podem ocupar o mesmo lugar. O encontro entre desejo e imaginação amplia a delicadeza da experiência, mas também pede distinguir a relação possível da imagem que a torna tão atraente.'
	},
	'jupiter:saturn': {
		tension:
			'A vontade de ampliar o caminho esbarra nos compromissos que já o sustentam. Crescer pode exigir rever uma regra, mas tratar todo limite como falta de coragem apagaria o custo real da expansão; a escolha envolve decidir o que pode aumentar sem perder a base.',
		cooperation:
			'O horizonte de crescimento encontra uma estrutura que lhe dá continuidade. A experiência acumulada pode tornar uma expansão mais consistente, desde que a prudência não impeça ajustar um plano que ficou pequeno.',
		conjunction:
			'Expansão e compromisso se encontram no mesmo ponto. A leitura põe em destaque um crescimento que precisa assumir forma, prazo e responsabilidade para deixar de ser apenas possibilidade.'
	},
	'saturn:venus': {
		tension:
			'O que você deseja de uma troca pode se confrontar com seus limites reais de tempo, dinheiro ou disponibilidade. A frustração pode levar a medir o próprio valor pela resposta recebida; o trabalho interpretativo aqui é separar reciprocidade possível de uma exigência de merecer afeto pelo esforço.',
		cooperation:
			'Uma preferência pode ganhar a consistência de um acordo. O cuidado aparece na disponibilidade que se mantém, e a escolha ganha valor quando seu custo cabe na vida que você consegue sustentar.',
		conjunction:
			'Desejo e compromisso se aproximam: gostar de algo passa a envolver o que você aceita dedicar a isso. A maturidade da escolha depende de reconhecer também o limite, sem transformar toda troca em uma obrigação.'
	},
	'uranus:sun': {
		tension:
			'Uma necessidade de autonomia pode desafiar o lugar pelo qual você se reconhece ou é reconhecido. A mudança perde clareza quando se torna apenas recusa do papel anterior; o centro da questão é descobrir que participação ainda representa você.',
		cooperation:
			'Uma alternativa pode renovar sua maneira de participar sem apagar o que já construiu. A autonomia ganha uma expressão mais concreta quando uma ideia diferente encontra lugar em uma escolha sua.',
		conjunction:
			'A vontade de viver de um modo mais próprio se aproxima da imagem que você tem de si. A leitura destaca uma renovação de direção: experimentar outra forma de participar pode revelar o que estava sendo mantido apenas por costume.'
	}
};

export type TemporalContact = {
	id: string;
	transit: string;
	natal: string;
	aspect: keyof typeof aspectNames;
	orb: number;
	/** Only attach a transit sign when an actual source position and its fact exist. */
	transitSign?: { sign: number; factId: string; instant: string };
};
const hard = (aspect: string) => aspect === 'square' || aspect === 'opposition';
export const temporalIsTense = hard;

export function temporalPairMeaning(c: TemporalContact, explainAspect = true): string {
	const pair = pairs[`${c.transit}:${c.natal}`];
	if (!pair) throw new Error(`Combinação temporal sem cânone: ${c.transit}/${c.natal}.`);
	const core =
		c.aspect === 'conjunction'
			? pair.conjunction
			: hard(c.aspect)
				? pair.tension
				: pair.cooperation;
	const aspect =
		c.aspect === 'opposition'
			? 'A oposição descreve dois polos que pedem lugar: dar toda a razão a um deles tende a devolver o outro como insatisfação.'
			: c.aspect === 'square'
				? 'Na quadratura, a questão pede uma mudança de maneira: insistir no mesmo ritmo para atender às duas exigências pode aumentar o atrito.'
				: c.aspect === 'sextile'
					? 'O sextil descreve uma abertura que depende de participação: a conexão pode existir sem se transformar sozinha em escolha.'
					: c.aspect === 'trine'
						? 'No trígono, a familiaridade entre esses movimentos pode facilitar a passagem, mas também fazer você repetir uma resposta conhecida sem perceber que há outra possibilidade.'
						: 'Na conjunção, os movimentos se misturam: distinguir suas necessidades ajuda a não tomar uma única resposta como solução para tudo.';
	return explainAspect ? `${core} ${aspect}` : core;
}

export function temporalNatalModifier(p: Position, aspect: string, includeHouse = true): string {
	const s = signsInExperience[p.sign];
	const house = p.house ? temporalHouses[p.house] : null;
	const styles: Record<string, keyof NatalStyle> = {
		sun: 'aim',
		moon: 'need',
		mercury: 'thought',
		venus: 'affection',
		mars: 'action',
		jupiter: 'aim',
		saturn: 'action'
	};
	const style = styles[p.body];
	const modifier = style
		? `${bodyNames[p.body]} natal em ${signs[p.sign]} associa ${temporalTargets[p.body].subject} à disposição para ${natalStyles[p.sign][style]}. ${hard(aspect) ? `O atrito pode aumentar a insistência nesse caminho; ${natalStyles[p.sign].adjustment} permite responder à exigência sem abandonar o que importa.` : `Essa disposição encontra apoio no contato e pode ajudar você a ${temporalTargets[p.body].choice}.`}`
		: `${bodyNames[p.body]} natal em ${signs[p.sign]} associa ${temporalTargets[p.body].subject} à disposição para ${s.strength}. ${hard(aspect) ? `Com o atrito deste aspecto, ${s.friction}; ${s.route}.` : `Há uma forma de dar alcance a essa disposição: ${s.route}.`}`;
	if (!includeHouse) return modifier;
	return `${modifier} ${house ? `Na casa ${p.house}, essa dinâmica se relaciona com ${house.area}. Um exemplo possível é ${house.example}.` : 'Sem casas disponíveis, a leitura não fixa uma área da vida para essa dinâmica.'}`;
}

export function temporalContactReading(
	c: TemporalContact,
	p: Position,
	includeNatal = true,
	explainAspect = true
) {
	const title = `${bodyNames[c.transit]} e ${bodyNames[c.natal]}: ${hard(c.aspect) ? 'duas necessidades em negociação' : c.aspect === 'conjunction' ? 'um encontro que concentra a atenção' : 'uma conexão que pode ajudar'}`;
	const claim = `${temporalPairMeaning(c, explainAspect)}${includeNatal ? `\n\n${temporalNatalModifier(p, c.aspect)}` : ''}`;
	return {
		title,
		claim,
		text: `${bodyNames[c.transit]} em ${aspectNames[c.aspect]} com ${bodyNames[c.natal]} natal. ${claim}${c.transitSign ? ` Nesse retrato da data, ${bodyNames[c.transit]} em ${signs[c.transitSign.sign]} acrescenta uma inclinação para ${signsInExperience[c.transitSign.sign].strength}.` : ''}`,
		factIds: [
			c.id,
			p.factId,
			...(includeNatal && p.house ? [`house-${p.house}`] : []),
			...(c.transitSign ? [c.transitSign.factId] : [])
		],
		relation: `${c.transit}→${c.natal}; ${c.aspect} modifica a relação; ${includeNatal ? `signo natal ${p.sign}; casa natal ${p.house ?? 'indisponível'}` : 'relação adicional com um alvo natal já desenvolvido nesta leitura'}${c.transitSign ? `; signo do trânsito ${c.transitSign.sign} somente na amostra registrada` : ''}`
	};
}

/** Each contact adds its own meaning; natal descriptions are developed once per aspect mode. */
export function temporalNarrative() {
	const introduced = new Set<string>();
	const explainedAspects = new Set<string>();
	return (c: TemporalContact, p: Position) => {
		const key = `${p.body}:${hard(c.aspect) ? 'tension' : 'connection'}`;
		const meaning = temporalContactReading(
			c,
			p,
			!introduced.has(key),
			!explainedAspects.has(c.aspect)
		);
		introduced.add(key);
		explainedAspects.add(c.aspect);
		return meaning;
	};
}

// These relations compare two actual contacts to the SAME natal target. They do not
// assert an aspect between the transiting bodies or make a third, uncalculated transit.
const simultaneousMovements: Record<string, string> = {
	'sun:moon':
		'Uma direção que faz sentido e o conforto do momento podem ter ritmos diferentes. A disposição emocional ajuda a participar, mas sua oscilação não precisa decidir o valor inteiro da escolha.',
	'sun:mercury':
		'Assumir uma posição e encontrar palavras para explicá-la se modificam mutuamente. A conversa pode tornar a intenção mais clara, desde que revisar um argumento não seja confundido com diminuir sua presença.',
	'sun:venus':
		'A vontade de se posicionar encontra a busca de afinidade. O apreço recebido ganha valor quando reconhece uma preferência sua; se passa a decidir a preferência, a aproximação pode custar autoria.',
	'sun:mars':
		'A direção escolhida dá propósito à iniciativa, e a ação mostra quanto dessa intenção encontra lugar concreto. O esforço perde precisão quando se dedica mais a provar uma posição que a realizá-la.',
	'sun:jupiter':
		'Uma possibilidade de crescimento pode ampliar sua participação. A expansão ganha coerência quando dá espaço a uma direção sua, em vez de fazer cada nova abertura competir pela definição de quem você precisa ser.',
	'sun:saturn':
		'Assumir uma direção inclui reconhecer o que consegue manter. Um compromisso pode dar consistência à vontade pessoal, mas cumprir uma exigência não substitui o sentido que levou você a escolhê-la.',
	'sun:uranus':
		'A liberdade de participar de outro modo pode renovar uma escolha pessoal. A diferença ganha sentido no que permite expressar, além da necessidade de sair de um papel conhecido.',
	'sun:neptune':
		'Uma imagem inspiradora pode dar profundidade à participação. Ela ajuda a criar sentido quando cabe numa expressão real, sem exigir que sua presença corresponda a um ideal sem falhas.',
	'sun:pluto':
		'O envolvimento pessoal ganha intensidade quando uma escolha toca algo difícil de soltar. Assumir o que importa pode fortalecer a direção, enquanto defender cada detalhe como parte da identidade estreita a margem de mudança.',
	'moon:mercury':
		'A reação emocional pode encontrar palavras, e a conversa pode modificar o que parecia evidente no primeiro sentimento. O entendimento cresce quando a impressão é acolhida sem ser tomada como prova da intenção alheia.',
	'moon:venus':
		'Conforto e prazer se aproximam, mas não atendem sempre à mesma necessidade. Uma troca agradável pode acolher o sentimento quando há lugar para pedir cuidado, além de preservar a harmonia.',
	'moon:mars':
		'Um incômodo pode indicar onde agir, e uma ação pode mudar o clima emocional. A firmeza protege melhor quando expressa a necessidade; a reação que busca apenas alívio pode afastar o acolhimento procurado.',
	'moon:jupiter':
		'O ânimo pode tornar um horizonte mais acessível, e a expectativa de crescimento pode trazer alívio. A confiança ajuda quando amplia a percepção das possibilidades sem fazer do bem-estar momentâneo uma garantia sobre elas.',
	'moon:saturn':
		'A necessidade de conforto responde ao momento, enquanto um compromisso depende de continuidade. Uma estrutura previsível pode acolher a oscilação emocional; exigir disposição constante para continuar transforma cuidado em prova de resistência.',
	'moon:uranus':
		'A necessidade de espaço pode mudar a maneira de buscar acolhimento. Uma pequena liberdade ajuda quando permite reconhecer o sentimento, sem exigir afastamento como única forma de respirar.',
	'moon:neptune':
		'O sentimento recebe imagens e nuances que podem ajudá-lo a encontrar expressão. A sensibilidade ganha clareza quando uma impressão pode ser significativa sem precisar explicar tudo sobre a situação.',
	'moon:pluto':
		'Uma reação breve pode tornar visível um apego mais profundo. O episódio e o peso do vínculo não são equivalentes: distinguir os dois permite acolher a intensidade sem exigir que uma resposta pontual resolva toda insegurança.',
	'mercury:venus':
		'A conversa pode dar nome ao que faz uma troca valer a pena. A delicadeza ajuda a comunicar uma diferença quando mantém o conteúdo do pedido, em vez de substituí-lo por uma concordância agradável.',
	'mercury:mars':
		'Uma explicação pode tornar a ação mais precisa, e a tentativa concreta pode revelar o que faltava entender. A pressa de responder enfraquece essa troca quando transforma toda pergunta numa disputa.',
	'mercury:jupiter':
		'A visão do conjunto dá sentido ao detalhe, e o detalhe verifica o alcance da ideia maior. A aprendizagem ganha profundidade nessa passagem; uma associação promissora ainda não equivale a uma conclusão sustentada.',
	'mercury:saturn':
		'Um critério claro pode organizar o pensamento sem exigir certeza absoluta. O rigor ajuda a concluir quando distingue a informação decisiva do detalhe que já não muda a resposta.',
	'mercury:uranus':
		'Uma associação inesperada pode renovar a explicação, enquanto a linguagem mostra se a ligação nova é compreensível. A originalidade ganha alcance quando os passos do raciocínio podem ser compartilhados.',
	'mercury:neptune':
		'Uma imagem pode expressar o que uma explicação literal deixaria de fora. A conversa ganha nuance quando conserva a diferença entre descrever uma impressão e confirmar um fato.',
	'mercury:pluto':
		'Uma pergunta pode alcançar o interesse escondido sob uma explicação. A profundidade amplia o entendimento quando admite outras respostas, em vez de usar a investigação para confirmar uma suspeita a qualquer custo.',
	'venus:mars':
		'O desejo indica o que merece iniciativa, e a iniciativa torna o desejo visível. Essa ligação sustenta uma aproximação quando agir pelo que você valoriza não se confunde com obter uma resposta pela insistência.',
	'venus:jupiter':
		'Afinidade e confiança podem ampliar uma troca. A generosidade preserva seu sentido quando o prazer de oferecer não produz compromissos que depois precisem ser pagos com ressentimento.',
	'venus:saturn':
		'Uma troca ganha confiança pela disponibilidade que se mantém. O compromisso dá duração ao afeto quando também deixa lugar para prazer e escolha, além do cumprimento de obrigações.',
	'venus:uranus':
		'A liberdade pode renovar uma afinidade ao permitir preferências próprias. O espaço individual contribui para a troca quando não elimina a possibilidade de combinar presença e reciprocidade.',
	'venus:neptune':
		'A sensibilidade pode enriquecer o afeto com delicadeza e imaginação. O encanto se torna mais sustentável quando a imagem desejada não apaga os sinais concretos do que cada parte oferece.',
	'venus:pluto':
		'Uma preferência pode revelar um desejo de grande peso. A intimidade cresce com a franqueza quando reconhecer essa intensidade não se torna uma exigência de garantir a resposta do outro.',
	'mars:jupiter':
		'A confiança oferece motivo para agir, e a iniciativa dá consequência à possibilidade. A coragem ganha continuidade quando o primeiro avanço não é tomado como garantia de que todo passo seguinte caberá.',
	'mars:saturn':
		'A iniciativa precisa de passagem, enquanto a continuidade precisa de medida. Um limite pode orientar o esforço; tratado apenas como resistência a vencer, consome a energia que deveria proteger.',
	'mars:uranus':
		'A ação pode abrir uma alternativa onde havia repetição. A liberdade ganha consequência quando o gesto inclui uma direção para continuar, além da urgência de interromper o que incomoda.',
	'mars:neptune':
		'Uma inspiração pode orientar a iniciativa quando encontra um objetivo reconhecível. A sensibilidade permite ajustar o gesto; sem esse contorno, mais esforço pode apenas ampliar a dispersão.',
	'mars:pluto':
		'A força pode alcançar uma dificuldade que respostas superficiais não resolvem. Ela ganha precisão quando distingue transformar o problema de vencer cada resistência encontrada no caminho.',
	'jupiter:saturn':
		'A expansão precisa de uma base, e a base pode precisar mudar para permitir crescimento. Uma etapa viável aproxima confiança e compromisso sem tratar todo limite como proibição nem toda promessa como plano.',
	'jupiter:uranus':
		'Uma alternativa pode ampliar o horizonte e a margem de escolha. A novidade ganha valor quando oferece liberdade concreta, além da sensação de que tudo será diferente apenas por sair do caminho conhecido.',
	'jupiter:neptune':
		'Um ideal pode dar sentido ao crescimento e mobilizar generosidade. A esperança preserva seu alcance quando admite condições ainda indefinidas, sem transformar a força da inspiração em confirmação da promessa.',
	'jupiter:pluto':
		'A vontade de crescer pode alcançar um desejo de poder ou pertencimento. A expansão aumenta sua liberdade quando amplia opções, em vez de exigir uma aposta cada vez maior para não admitir uma perda.',
	'saturn:uranus':
		'A mudança pode tornar um compromisso mais viável, e a estrutura pode dar duração à alternativa. A negociação ganha clareza quando distingue a regra que perdeu função da base que ainda oferece apoio.',
	'saturn:neptune':
		'Uma inspiração encontra os limites de uma forma concreta. Aceitar uma realização parcial pode dar continuidade ao ideal; exigir que ele apareça inteiro tende a transformar toda tentativa em insuficiência.',
	'saturn:pluto':
		'Conservar uma base pode exigir mudar a forma como ela é sustentada. A responsabilidade ganha sentido quando a continuidade não depende de controlar cada vez mais nem de manter toda regra anterior.',
	'uranus:neptune':
		'Uma alternativa pode renovar uma imagem de futuro. A liberdade da imaginação abre possibilidades quando também permite rever o ideal, em vez de substituí-lo por outra promessa que não admite limites.',
	'uranus:pluto':
		'A necessidade de mudança pode abrir espaço numa questão que parecia absoluta. A transformação amplia autonomia quando cria mais escolhas, sem impor a ruptura total como única prova de liberdade.',
	'neptune:pluto':
		'Uma imagem ideal pode revelar o peso de um apego. Elaborar esse significado permite conservar a inspiração sem exigir que uma única relação, projeto ou resultado dê sentido a tudo.'
};
const temporalBodyOrder = [
	'sun',
	'moon',
	'mercury',
	'venus',
	'mars',
	'jupiter',
	'saturn',
	'uranus',
	'neptune',
	'pluto'
];
const sharedApplication: Record<string, string> = {
	sun: 'Nessa convergência, o efeito sobre sua direção pessoal depende de a escolha continuar reconhecível como sua: receber aprovação, aliviar um incômodo ou cumprir uma tarefa podem acompanhar a participação, mas nenhum deles a define sozinho.',
	moon: 'Nessa convergência, o cuidado precisa atender à necessidade que está presente. A resposta que organiza, anima ou mobiliza você só oferece amparo se deixa também espaço para receber, descansar ou mostrar o que falta.',
	mercury:
		'Nessa convergência, a qualidade do entendimento depende de ligar a impressão inicial aos detalhes que a sustentam. A explicação fica mais clara quando consegue mostrar suas passagens, além de soar convincente.',
	venus:
		'Nessa convergência, o valor da escolha aparece na troca que ela permite manter. O desejo precisa encontrar lugar junto da disponibilidade real de tempo, afeto ou recursos, para que a aproximação não deixe sua preferência sem voz.',
	mars: 'Nessa convergência, a iniciativa precisa conservar energia para continuar. Um gesto ganha direção quando transforma a situação de maneira útil, além de produzir alívio, aprovação ou uma vitória imediata.',
	jupiter:
		'Nessa convergência, a possibilidade de crescer precisa incluir o caminho até ela. A confiança ganha consistência quando o horizonte desejado admite etapas e aprendizado, sem exigir que cada abertura confirme a visão inteira.',
	saturn:
		'Nessa convergência, a continuidade depende da forma de repartir esforço e limite. Manter um compromisso faz mais sentido quando ainda sustenta algo escolhido, em vez de apenas evitar a sensação de desperdiçar o investimento anterior.',
	uranus:
		'Nessa convergência, a liberdade se mede também pelo que você pode escolher manter. Uma alternativa amplia autonomia quando abre possibilidades reais, sem criar a obrigação de contrariar ou abandonar tudo o que já existe.',
	neptune:
		'Nessa convergência, uma imagem precisa encontrar expressão sem ser tratada como contrato com a realidade. A inspiração pode orientar um gesto possível mesmo quando a experiência não corresponde inteira ao que foi imaginado.',
	pluto:
		'Nessa convergência, a intensidade fica mais compreensível ao distinguir o que tem valor da forma específica que você teme perder. Essa diferença permite negociar uma mudança sem viver cada ajuste como ameaça ao lugar inteiro.'
};

function specificSolarConvergence(a: TemporalContact, b: TemporalContact): string | null {
	if (a.natal !== 'sun') return null;
	const contacts = [a, b];
	const venus = contacts.find((c) => c.transit === 'venus');
	const mars = contacts.find((c) => c.transit === 'mars');
	if (venus && mars) {
		const opening =
			'Vênus e Marte alcançam sua direção pessoal por caminhos diferentes: o que você valoriza e deseja compartilhar encontra a força com que procura afirmar uma escolha.';
		if (venus.aspect === 'conjunction' || mars.aspect === 'conjunction') {
			const concentrated =
				venus.aspect === 'conjunction' && mars.aspect === 'conjunction'
					? 'As duas conjunções aproximam desejo, iniciativa e identidade: algo que atrai você pode rapidamente parecer uma escolha que precisa defender.'
					: venus.aspect === 'conjunction'
						? `A conjunção de Vênus aproxima preferência e identidade; ${hard(mars.aspect) ? 'a tensão de Marte pode fazer a defesa dessa preferência virar disputa, como se qualquer resistência diminuísse seu valor' : 'o apoio de Marte pode ajudar a tornar essa preferência uma iniciativa concreta'}.`
						: `A conjunção de Marte aproxima vontade e ação; ${hard(venus.aspect) ? 'a tensão de Vênus pode dividir essa iniciativa entre afirmar o que você quer e evitar desagradar' : 'o apoio de Vênus pode dar ao impulso uma medida de afinidade e reciprocidade'}.`;
			return `${opening} ${concentrated} Agir pelo que tem valor para você fica mais claro quando uma preferência pode receber expressão sem exigir aprovação nem transformar a resposta alheia em vitória ou derrota.`;
		}
		const interaction =
			hard(venus.aspect) && hard(mars.aspect)
				? 'O receio de desagradar pode disputar espaço com a necessidade de vencer uma resistência. Você pode acabar gastando força para conquistar aprovação, embora a escolha que deseja assumir continue pouco expressa.'
				: hard(venus.aspect)
					? 'A abertura de Marte não anula a tensão de Vênus: há impulso para participar, mas ele pode ser usado para corresponder ao que agrada aos outros. A iniciativa ganha direção quando expressa sua preferência, além de tentar merecer aceitação.'
					: hard(mars.aspect)
						? 'A abertura de Vênus não anula a tensão de Marte: reconhecer o que aproxima pode dar uma medida ao impulso de disputar. Uma preferência clara permite agir pelo que você valoriza sem transformar toda resistência numa prova de força.'
						: 'A afinidade pode orientar a iniciativa, e a iniciativa pode dar presença ao que você valoriza. A convergência favorece uma participação em que desejar, escolher e agir se apoiam, desde que demonstrar interesse conserve espaço para a resposta alheia.';
		return `${opening} ${interaction}`;
	}
	const saturn = contacts.find((c) => c.transit === 'saturn');
	const moon = contacts.find((c) => c.transit === 'moon');
	if (saturn && moon) {
		const opening =
			'Saturno e Lua tocam sua direção pessoal em ritmos diferentes: a responsabilidade que precisa de continuidade encontra o conforto ou incômodo mais imediato.';
		if (saturn.aspect === 'conjunction' || moon.aspect === 'conjunction') {
			const concentrated =
				saturn.aspect === 'conjunction' && moon.aspect === 'conjunction'
					? 'As conjunções aproximam dever e sentimento da imagem que você tem de si; cumprir uma tarefa e sentir-se bem com ela podem parecer a mesma medida de valor pessoal.'
					: saturn.aspect === 'conjunction'
						? `A conjunção de Saturno dá peso pessoal ao compromisso; ${hard(moon.aspect) ? 'a tensão lunar pode tornar essa carga emocionalmente menos confortável' : 'o apoio lunar pode trazer disposição para assumir a tarefa, sem garantir que todo o esforço tenha a mesma facilidade'}.`
						: `A conjunção da Lua torna a reação especialmente pessoal; ${hard(saturn.aspect) ? 'a tensão de Saturno pode fazer um desconforto breve parecer prova de incapacidade para o compromisso inteiro' : 'o apoio de Saturno oferece uma medida de continuidade que não precisa acompanhar cada oscilação do sentimento'}.`;
			return `${opening} ${concentrated} Sua disposição pode variar sem decidir, a cada mudança, se a escolha merece continuar; ao mesmo tempo, um compromisso duradouro precisa incluir condições reais de descanso e cuidado.`;
		}
		const interaction =
			hard(saturn.aspect) && hard(moon.aspect)
				? 'O peso de corresponder a uma exigência pode aumentar quando o sentimento do momento também pede alívio. Tratar esse desconforto como falta de competência soma cobrança à necessidade de cuidado; o tamanho do compromisso e o estado emocional precisam ser distinguidos.'
				: hard(saturn.aspect)
					? 'A abertura da Lua não elimina a tensão de Saturno: um momento de maior conforto pode ajudar a participar, mas não reduz sozinho o tamanho da responsabilidade. O alívio tem valor como apoio, sem precisar provar que toda a exigência se tornou viável.'
					: hard(moon.aspect)
						? 'A abertura de Saturno não elimina a tensão da Lua: uma estrutura viável pode acolher um dia menos confortável sem transformar essa oscilação em motivo para abandonar a escolha. A continuidade oferece apoio quando também permite cuidado.'
						: 'Uma estrutura viável pode acolher a disposição do momento, e o conforto pode tornar mais leve assumir uma tarefa. O apoio se sustenta quando o compromisso não exige que você esteja sempre igualmente disposto para continuar.';
		return `${opening} ${interaction}`;
	}
	return null;
}

export function temporalSharedTarget(a: TemporalContact, b: TemporalContact, p: Position) {
	if (a.natal !== b.natal || a.natal !== p.body || a.transit === b.transit) return null;
	// Validate both actual relations before composing a convergence.
	temporalPairMeaning(a, false);
	temporalPairMeaning(b, false);
	const key = [a.transit, b.transit]
		.sort((left, right) => temporalBodyOrder.indexOf(left) - temporalBodyOrder.indexOf(right))
		.join(':');
	const dynamic = simultaneousMovements[key];
	if (!dynamic || !sharedApplication[p.body])
		throw new Error(`Convergência temporal sem cânone: ${key}/${p.body}.`);
	const mixed = hard(a.aspect) !== hard(b.aspect);
	const blended = a.aspect === 'conjunction' || b.aspect === 'conjunction';
	const modes =
		a.aspect === 'conjunction' && b.aspect === 'conjunction'
			? 'As duas conjunções concentram essas necessidades no mesmo tema. A intensidade de uma pode tornar mais difícil distinguir o que a outra pede; proximidade simbólica não implica facilidade nem conflito inevitável.'
			: blended
				? `A conjunção de ${bodyNames[a.aspect === 'conjunction' ? a.transit : b.transit]} concentra essas necessidades no mesmo tema; sua intensidade precisa ser distinguida da facilidade ou do atrito do outro contato.`
				: mixed
					? `A abertura de um contato não anula a tensão do outro: o apoio de ${bodyNames[hard(a.aspect) ? b.transit : a.transit]} pode oferecer uma maneira de responder ao atrito de ${bodyNames[hard(a.aspect) ? a.transit : b.transit]}, sem apagar o que ele pede.`
					: hard(a.aspect)
						? 'Responder às duas pressões com o mesmo gesto pode aumentar uma delas: o alívio imediato de uma necessidade não garante que a outra tenha sido atendida.'
						: 'As duas aberturas podem se apoiar quando a possibilidade de um contato encontra expressão no outro; facilidade, aqui, permite desenvolver a escolha sem determinar seu resultado.';
	const claim =
		specificSolarConvergence(a, b) ?? `${dynamic} ${modes} ${sharedApplication[p.body]}`;
	return {
		claim,
		factIds: [a.id, b.id, p.factId],
		relation: `Convergência de ${a.transit}/${b.transit} no mesmo alvo ${a.natal}; ${a.aspect}/${b.aspect}; simultaneidade deve ser comprovada pelo compositor.`
	};
}

export function temporalContext(inputContext: string | undefined, career = false) {
	const value = (inputContext ?? '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase();
	const key = /dinheiro|renda|orcamento|custo|remunera|financeir/.test(value)
		? 'money'
		: /rotina|equipe|prazo|carga|tarefa/.test(value)
			? 'routine'
			: /trabalho|carreira|profission|negocio/.test(value) || career
				? 'career'
				: /amor|relacion|parceir|casal|vinculo/.test(value)
					? 'relationship'
					: /estud|aprend|curso|formacao/.test(value)
						? 'study'
						: 'personal';
	const choices = {
		money: {
			topic: 'dinheiro e escolhas de valor',
			bodies: ['venus', 'saturn', 'jupiter'],
			houses: [2, 8],
			application:
				'No tema financeiro que você trouxe, isso se traduz na diferença entre desejar uma expansão e decidir quanto tempo, dinheiro ou compromisso cabe nela. O contato ajuda a compreender essa escolha; valores, custos e condições precisam vir da situação real.'
		},
		routine: {
			topic: 'ritmo de trabalho e distribuição de esforço',
			bodies: ['mars', 'mercury', 'saturn'],
			houses: [6, 10],
			application:
				'Para a rotina que você trouxe, a questão aparece na maneira de distribuir esforço: uma tarefa pode pedir atenção imediata sem merecer ocupar todo o período. A leitura distingue impulso, capacidade de continuidade e espaço para combinar responsabilidades.'
		},
		career: {
			topic: 'direção profissional e compromissos',
			bodies: ['sun', 'saturn', 'jupiter', 'mercury'],
			houses: [2, 6, 10],
			application:
				'No trabalho, essa dinâmica pode aparecer entre assumir uma posição e sustentar as condições da entrega. Visibilidade, interesse e capacidade de execução não precisam avançar no mesmo ritmo; um acordo ganha clareza quando essas diferenças podem ser nomeadas.'
		},
		relationship: {
			topic: 'vínculos, proximidade e acordos',
			bodies: ['moon', 'venus', 'mars'],
			houses: [5, 7, 8],
			application:
				'Na relação que você trouxe, a leitura se concentra no modo como você recebe e responde à troca. Uma necessidade pode ser legítima e ainda precisar de palavras para se tornar compreensível; o mapa de uma pessoa não informa o sentimento ou a intenção da outra.'
		},
		study: {
			topic: 'aprendizagem e ampliação de horizonte',
			bodies: ['mercury', 'jupiter', 'saturn'],
			houses: [3, 9],
			application:
				'Na aprendizagem, a diferença pode aparecer entre o interesse que abre muitas perguntas e o tempo necessário para assimilar uma delas. Compreender a promessa de um assunto e conseguir explicá-lo com precisão são etapas distintas, que podem se ajudar.'
		},
		personal: {
			topic: 'prioridades pessoais',
			bodies: ['sun', 'moon', 'mercury'],
			houses: [1, 4, 7, 10],
			application: ''
		}
	};
	return { key, ...choices[key], declared: Boolean(inputContext?.trim()) };
}
