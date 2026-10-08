/** Original psychological/humanistic descriptions, qualified by the complete chart.
 * These are functions in situations, never diagnoses or fixed personality labels. */
export type NatalStyle = {
	aim: string;
	need: string;
	entry: string;
	thought: string;
	affection: string;
	action: string;
	excess: string;
	adjustment: string;
};
export const natalStyles: readonly NatalStyle[] = [
	{
		aim: 'participar por iniciativa própria e descobrir o que consegue começar',
		need: 'poder reagir com franqueza e recuperar alguma autonomia',
		entry: 'experimentar uma primeira ação antes de conhecer todos os detalhes',
		thought: 'formular o ponto principal e testar uma resposta direta',
		affection: 'demonstrar interesse de forma direta, preservando a iniciativa de cada pessoa',
		action: 'enfrentar o obstáculo mais imediato e ajustar o percurso depois',
		excess: 'tratar uma demora como impedimento e agir antes de ouvir a resposta',
		adjustment: 'distinguir o que precisa começar agora do que exige uma combinação prévia'
	},
	{
		aim: 'construir algo que possa reconhecer, usar e manter ao longo do tempo',
		need: 'encontrar continuidade, conforto concreto e um ritmo previsível',
		entry: 'observar condições e ganhar confiança antes de mudar de posição',
		thought: 'comparar a ideia com a experiência e procurar uma aplicação concreta',
		affection: 'dar continuidade ao contato por presença, atenção prática e gestos consistentes',
		action: 'concentrar esforço em uma direção e sustentar a execução',
		excess: 'manter um acordo só porque ele já se tornou familiar',
		adjustment: 'verificar se a continuidade ainda atende à necessidade que a justificou'
	},
	{
		aim: 'descobrir conexões e ampliar sua compreensão por meio da troca',
		need: 'poder nomear o que sente e circular entre diferentes perspectivas',
		entry: 'perguntar, observar respostas e abrir mais de uma possibilidade',
		thought: 'comparar versões e reformular uma explicação enquanto conversa',
		affection: 'manter curiosidade pela outra pessoa e espaço para conversar sem roteiro',
		action: 'mudar de estratégia quando surge informação que altera o problema',
		excess: 'continuar comparando alternativas depois de reunir informação suficiente',
		adjustment: 'escolher qual pergunta precisa de resposta antes da próxima decisão'
	},
	{
		aim: 'dar sentido à experiência por vínculos, memória e participação no cuidado',
		need: 'sentir que existe acolhimento e continuidade nas relações importantes',
		entry: 'perceber o clima da situação e procurar algum ponto de familiaridade',
		thought: 'considerar a história e o efeito que uma fala terá sobre as pessoas',
		affection: 'demonstrar cuidado ao lembrar necessidades e acompanhar o cotidiano',
		action: 'proteger aquilo com que já estabeleceu um vínculo',
		excess: 'assumir uma necessidade alheia sem perguntar que ajuda foi desejada',
		adjustment: 'combinar cuidado e disponibilidade sem substituir a decisão da outra pessoa'
	},
	{
		aim: 'assumir autoria e participar de algo que reconhece como seu',
		need: 'receber atenção pessoal e poder expressar o que considera significativo',
		entry: 'marcar presença e encontrar uma forma própria de participar',
		thought: 'organizar uma ideia em torno de uma intenção e apresentá-la com clareza',
		affection: 'mostrar apreço de maneira perceptível e compartilhar experiências especiais',
		action: 'investir energia em uma realização com a qual se identifica',
		excess: 'receber uma discordância sobre a situação como desvalorização pessoal',
		adjustment: 'separar o reconhecimento que deseja dos critérios usados para avaliar a proposta'
	},
	{
		aim: 'desenvolver capacidade por observação, prática e aperfeiçoamento',
		need: 'entender o que pode fazer e encontrar uma rotina que ajude a se organizar',
		entry: 'examinar detalhes e identificar como pode participar de modo útil',
		thought: 'distinguir etapas, conferir informação e localizar a dificuldade específica',
		affection: 'oferecer atenção aos detalhes e ajuda ajustada à situação real',
		action: 'dividir um problema em partes que consegue executar e revisar',
		excess: 'continuar corrigindo um detalhe quando a situação já permite avançar',
		adjustment: 'definir o que precisa estar suficientemente bom e o que pode ser revisto depois'
	},
	{
		aim: 'participar de relações em que diferenças possam ser discutidas com justiça',
		need: 'encontrar reciprocidade e tempo para compreender os dois lados',
		entry: 'observar como as pessoas se relacionam e procurar uma forma de aproximação',
		thought: 'colocar versões em relação e examinar os critérios de uma escolha',
		affection: 'cultivar troca, consideração e decisões que incluam as duas pessoas',
		action: 'negociar condições e mobilizar cooperação antes de confrontar',
		excess: 'adiar uma posição própria para evitar uma discordância necessária',
		adjustment: 'formular sua preferência antes de procurar um acordo possível'
	},
	{
		aim: 'compreender o que está em jogo e participar com envolvimento real',
		need: 'ter confiança suficiente para expor algo que considera íntimo',
		entry: 'observar sinais de confiança e preservar o que ainda não deseja revelar',
		thought: 'examinar motivações, inconsistências e informações que ainda faltam',
		affection: 'construir intimidade por confiança e envolvimento sustentado',
		action: 'concentrar energia no ponto que considera decisivo',
		excess: 'tomar uma hipótese sobre a intenção alheia como certeza',
		adjustment: 'conferir o que foi observado e perguntar antes de concluir o que outra pessoa quis'
	},
	{
		aim: 'ampliar sua experiência e encontrar uma direção que faça sentido',
		need: 'perceber possibilidades e conservar espaço para explorar',
		entry: 'aproximar-se pela curiosidade e experimentar uma perspectiva mais ampla',
		thought: 'ligar o assunto a uma visão de conjunto e perguntar aonde ele pode levar',
		affection: 'compartilhar descobertas e respeitar a liberdade de explorar interesses',
		action: 'mobilizar esforço por uma possibilidade que considera promissora',
		excess: 'prometer a partir do entusiasmo sem conferir os recursos disponíveis',
		adjustment: 'transformar a possibilidade em um próximo passo com alcance verificável'
	},
	{
		aim: 'construir capacidade e responder por algo que amadurece com o tempo',
		need: 'reconhecer limites, contar com acordos confiáveis e recuperar organização',
		entry: 'avaliar responsabilidades e entender o que a situação exige',
		thought: 'ordenar prioridades e examinar o que uma decisão exige para se sustentar',
		affection: 'mostrar compromisso por constância, responsabilidade e cuidado com os acordos',
		action: 'organizar esforço em etapas e acompanhar o resultado',
		excess: 'medir seu valor apenas pelo que consegue resolver ou suportar',
		adjustment: 'separar uma responsabilidade assumida da obrigação de resolver tudo sozinho'
	},
	{
		aim: 'participar com independência de pensamento e contribuir para possibilidades novas',
		need: 'ter espaço para observar a experiência e conservar alguma liberdade de escolha',
		entry: 'perceber regras, comparar perspectivas e procurar uma forma própria de participação',
		thought: 'questionar premissas e testar outra organização para o mesmo problema',
		affection: 'valorizar amizade, autonomia e acordos que permitam diferenças',
		action: 'tentar uma alternativa quando a regra habitual deixa de fazer sentido',
		excess: 'defender a alternativa sem escutar o efeito que ela produz nas pessoas',
		adjustment: 'explicar a mudança proposta e conferir quais necessidades ela precisa atender'
	},
	{
		aim: 'dar espaço à imaginação e perceber relações que uma explicação imediata não alcança',
		need: 'ter tempo para assimilar impressões e encontrar um ambiente sensível ao que sente',
		entry: 'captar o clima e adaptar a aproximação ao que percebe ao redor',
		thought: 'associar imagens e experiências antes de reduzir o assunto a uma única explicação',
		affection: 'demonstrar empatia e acolher experiências que não são iguais às suas',
		action: 'responder ao sentido da situação e adaptar o esforço conforme ela muda',
		excess: 'concordar com algo sem distinguir sua vontade da expectativa percebida',
		adjustment: 'nomear o que deseja e confirmar o acordo em termos que as duas pessoas entendem'
	}
];
export const houseAreas = [
	'presença, corpo e modo de começar',
	'recursos próprios, escolhas de valor e sustentação',
	'trocas próximas, aprendizagem e comunicação cotidiana',
	'vida privada, pertencimento e base de apoio',
	'criação, prazer e expressão pessoal',
	'rotina, manutenção e condições de trabalho',
	'parcerias, reciprocidade e acordos',
	'intimidade, recursos compartilhados e mudanças de vínculo',
	'estudo, convicções e ampliação de experiência',
	'responsabilidade pública, contribuição e reconhecimento',
	'grupos, amizades e participação em projetos',
	'recolhimento, elaboração e atividades reservadas'
] as const;
export const elementNames = ['fogo', 'terra', 'ar', 'água'] as const;
export const elementApproaches = [
	'precisar experimentar para descobrir como quer participar',
	'procurar condições concretas e continuidade antes de confiar em uma possibilidade',
	'compreender a situação por comparação, conversa e troca de perspectivas',
	'considerar o vínculo e a experiência emocional antes de decidir como responder'
] as const;
export const modalityApproaches = [
	'iniciar e definir um primeiro rumo',
	'sustentar o que já começou e aprofundar o envolvimento',
	'adaptar a resposta conforme a situação oferece novas informações'
] as const;
