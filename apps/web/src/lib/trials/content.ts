/** Original library written with Codex assistance and editorial revision, 06/10/2026.
 * No personal data, external model call, third-party excerpts or model-certified accuracy. */
import { tarotMethods } from '@atv/domain';
export const TRIAL_CONTENT_VERSION = 'atv-ai-editorial-trials/1.0.0';
export const TRIAL_POLICY_VERSION = 'atv-private-trial-approval/1.0.0';
export const sourceNotice =
	'Conteúdo original produzido com auxílio de IA e edição editorial. A leitura combina essa biblioteca com os seus dados; não envia seus dados a um modelo externo.';
export const symbolicNotice =
	'Leitura simbólica para reflexão. Hipóteses não são fatos sobre sua personalidade, seu futuro ou outras pessoas. Você decide o que faz sentido e pode rejeitar a leitura.';

export const signEditorial: Record<string, readonly [string, string, string, string]> = {
	Áries: [
		'iniciativa e coragem para começar',
		'aprender em uma primeira tentativa',
		'agir antes de escutar ou verificar recursos',
		'teste uma iniciativa pequena por vinte minutos e observe o que mudou'
	],
	Touro: [
		'continuidade e atenção ao que sustenta',
		'transformar uma ideia em rotina concreta',
		'manter uma escolha apenas porque ela é familiar',
		'mude um detalhe de uma rotina por três dias e compare seu conforto'
	],
	Gêmeos: [
		'curiosidade e circulação de ideias',
		'aprender conversando e comparar perspectivas',
		'abrir tantas opções que nenhuma ganha continuidade',
		'escolha uma pergunta, pesquise duas fontes e escreva uma conclusão provisória'
	],
	Câncer: [
		'cuidado e construção de pertencimento',
		'reconhecer necessidades e criar segurança',
		'assumir o cuidado de todos sem nomear suas próprias necessidades',
		'reserve uma pausa e escreva qual apoio você pode pedir de forma concreta'
	],
	Leão: [
		'expressão e participação criativa',
		'dar forma visível a algo que importa',
		'confundir reconhecimento com a medida do próprio valor',
		'compartilhe um pequeno trabalho com alguém de confiança e peça uma observação específica'
	],
	Virgem: [
		'discernimento e aperfeiçoamento',
		'organizar detalhes para tornar algo praticável',
		'adiar o começo até que tudo pareça perfeito',
		'melhore apenas um detalhe de uma tarefa e pare no tempo que você definiu'
	],
	Libra: [
		'cooperação e busca de equilíbrio',
		'comparar interesses e construir acordos',
		'ceder para evitar uma conversa necessária',
		'formule uma preferência e uma concessão possível antes de conversar'
	],
	Escorpião: [
		'profundidade e disposição para transformar',
		'investigar o que permanece sob a superfície',
		'tratar uma suspeita como certeza sem verificar',
		'separe em duas colunas o que você observou e o que está supondo'
	],
	Sagitário: [
		'exploração e construção de sentido',
		'conectar uma experiência a um horizonte maior',
		'prometer mais do que o tempo e os recursos permitem',
		'transforme uma ideia ampla em um experimento de uma semana com um limite claro'
	],
	Capricórnio: [
		'estrutura e compromisso com o tempo',
		'construir etapas e reconhecer responsabilidades',
		'medir todo o valor de uma experiência pelo desempenho',
		'defina uma etapa possível e um horário de encerramento que preserve descanso'
	],
	Aquário: [
		'autonomia e investigação de alternativas',
		'experimentar soluções e pensar em redes',
		'distanciar-se de uma necessidade concreta para defender uma ideia',
		'teste uma alternativa com uma pessoa afetada por ela e escute a resposta'
	],
	Peixes: [
		'imaginação e sensibilidade a nuances',
		'acolher imagens e perceber atmosferas',
		'deixar limites pouco claros quando algo emociona',
		'escreva uma imagem que chamou sua atenção e uma ação concreta que cabe no seu dia'
	]
};

export const bodyEditorial: Record<string, string> = {
	Sol: 'expressão consciente e construção de identidade',
	Lua: 'necessidades, acolhimento e ritmo emocional',
	Mercúrio: 'comunicação e formas de aprender',
	Vênus: 'preferências, vínculos e reciprocidade',
	Marte: 'iniciativa, energia e manejo de conflitos',
	Júpiter: 'exploração, sentido e ampliação de perspectivas',
	Saturno: 'responsabilidade, limites e sustentação no tempo',
	Urano: 'mudança e investigação de alternativas',
	Netuno: 'imaginação, idealização e necessidade de discernimento',
	Plutão: 'revisão de padrões e relações de poder',
	Ascendente: 'maneiras de iniciar encontros e perceber o ambiente',
	'Meio do Céu': 'contribuição pública e direção de trabalho'
};

const majors = [
	['abertura', 'começar com curiosidade sem dispensar um limite de segurança'],
	['recursos', 'identificar uma habilidade disponível e colocá-la em prática'],
	['escuta', 'dar tempo a uma pergunta antes de responder'],
	['criação', 'nutrir um projeto com um gesto concreto'],
	['estrutura', 'definir um limite que sustente e não apenas controle'],
	['aprendizado', 'examinar uma tradição e escolher conscientemente o que manter'],
	['escolha', 'tornar explícitos os valores envolvidos em uma decisão'],
	['direção', 'estabelecer um próximo passo e conferir se ele respeita seus recursos'],
	['firmeza', 'acolher uma emoção e responder sem se violentar'],
	['recolhimento', 'reservar uma pausa para distinguir sua voz das expectativas externas'],
	['mudança', 'identificar o que você pode ajustar diante de uma variação inesperada'],
	['responsabilidade', 'comparar fatos, acordos e consequências antes de decidir'],
	['perspectiva', 'observar a situação por outro ângulo antes de insistir'],
	['encerramento', 'nomear uma etapa que pode terminar; a carta não anuncia morte literal'],
	['integração', 'experimentar um ritmo que combine necessidades diferentes'],
	['vínculos', 'examinar um hábito ou compromisso e verificar a liberdade que ele permite'],
	[
		'revisão',
		'distinguir uma estrutura útil de uma expectativa frágil; a carta não prevê desastre'
	],
	['esperança', 'reconhecer um recurso de apoio sem exigir certeza sobre o futuro'],
	['ambiguidade', 'separar sensação, imaginação e evidência antes de concluir'],
	['clareza', 'tornar uma intenção simples e compartilhável'],
	['reavaliação', 'revisitar uma escolha à luz do que você aprendeu'],
	['integração', 'reconhecer uma etapa concluída e definir o que vale continuar']
] as const;
const suits: Record<string, string> = {
	wands: 'iniciativa e criação',
	cups: 'emoções e vínculos',
	swords: 'pensamento e comunicação',
	pentacles: 'recursos, corpo e rotina'
};
const ranks = [
	'uma abertura',
	'duas possibilidades',
	'cooperação',
	'estabilidade',
	'uma tensão',
	'troca e reorganização',
	'avaliação de alternativas',
	'prática e movimento',
	'amadurecimento',
	'integração de uma etapa',
	'aprendizado',
	'experimentação',
	'cuidado consciente',
	'responsabilidade'
];
export function cardEditorial(id: string): string {
	const [family, raw] = id.split('-');
	const index = Number(raw);
	if (family === 'major' && Number.isInteger(index) && majors[index]) {
		const [theme, action] = majors[index];
		return `Uma possibilidade simbólica é refletir sobre ${theme}. Você pode ${action}. Observe o que se relaciona com sua pergunta e descarte o que não corresponde à sua experiência.`;
	}
	if (suits[family] && Number.isInteger(index) && index >= 1 && index <= 14)
		return `No campo simbólico de ${suits[family]}, esta carta convida a observar ${ranks[index - 1]}. Escolha um exemplo da sua pergunta, identifique um recurso disponível e teste uma mudança pequena antes de tirar conclusões.`;
	throw new Error('invalid_card');
}

export type TrialProfile = {
	opening: string;
	questions: readonly [string, string, string];
	practice: string;
	chapters: readonly string[];
};
const profile = (
	opening: string,
	questions: TrialProfile['questions'],
	practice: string,
	chapters: readonly string[]
): TrialProfile => ({ opening, questions, practice, chapters });
export const trialProfiles: Record<string, TrialProfile> = {
	...Object.fromEntries(
		tarotMethods.map((method) => [
			method.id,
			profile(
				method.description,
				[
					'O que você pode observar diretamente?',
					'Que ajuste cabe nas condições atuais?',
					'O que faria você rever esta leitura?'
				],
				'Escolha uma aplicação concreta, experimente um ajuste e compare o resultado com a hipótese da tiragem.',
				['O fio desta tiragem', ...method.positions.map((p) => p.name), 'Aplicação e revisão']
			)
		])
	),
	'career-compass': profile(
		'A Bússola usa o Meio do Céu como referência simbólica para investigar contribuição, ambiente de trabalho e experimentos. Ela não escolhe uma profissão por você.',
		[
			'Que contribuição você gostaria que as pessoas reconhecessem?',
			'Em qual ambiente você consegue trabalhar com limites saudáveis?',
			'Qual experiência reversível ajudaria a verificar esse caminho?'
		],
		'Escolha uma atividade relacionada à contribuição desejada, pratique por vinte minutos e anote interesse, dificuldade e o que gostaria de repetir.',
		['Direção pública', 'Possibilidades de trabalho', 'Tensão e equilíbrio']
	),
	'three-pillars': profile(
		'Sol, Lua e Ascendente são três perspectivas simbólicas distintas: expressão, necessidades e modo de começar. Diferenças entre elas podem ser exploradas sem reduzir você a um rótulo.',
		[
			'Como você gosta de se expressar?',
			'Que necessidade merece cuidado neste momento?',
			'Como costuma iniciar uma experiência nova?'
		],
		'Observe um encontro do seu dia e anote expressão, necessidade e primeira reação em três frases.',
		['Expressão', 'Necessidades', 'Forma de iniciar']
	),
	'birth-chart': profile(
		'O mapa organiza posições natais e ângulos como uma linguagem de reflexão. Cada tema é uma hipótese de leitura; circunstâncias de vida e escolhas continuam essenciais.',
		[
			'Quais dois temas parecem dialogar com sua experiência?',
			'Onde a leitura não corresponde a você?',
			'Que ajuste pequeno vale investigar?'
		],
		'Escolha apenas dois temas do mapa e compare-os com situações concretas da última semana.',
		[
			'Identidade e necessidades',
			'Comunicação e vínculos',
			'Ação e amadurecimento',
			'Mudança e limites'
		]
	),
	ascendant: profile(
		'O Ascendente oferece uma lente simbólica sobre como você começa experiências e encontra o ambiente. Horário e localização influenciam esse cálculo.',
		[
			'Como você inicia conversas?',
			'O que faz quando entra em um ambiente novo?',
			'Que primeira reação gostaria de experimentar?'
		],
		'Em um próximo encontro, faça uma pergunta antes de assumir qual será a resposta.',
		['Primeiro contato', 'Recursos de expressão', 'Ajuste consciente']
	),
	midheaven: profile(
		'O Meio do Céu permite refletir sobre presença pública e contribuição. Reconhecimento, realização e trabalho podem ter significados diferentes para você.',
		[
			'Qual contribuição faz sentido para você?',
			'Que expectativa externa pesa mais hoje?',
			'Como distinguir reconhecimento de realização?'
		],
		'Escreva uma contribuição que importa para você e uma forma pequena de praticá-la sem depender de aprovação externa.',
		['Presença pública', 'Contribuição', 'Expectativas e limites']
	),
	'daily-card': profile(
		'A carta do dia é um ponto de reflexão, não uma previsão do que vai acontecer. O sorteio fica registrado nesta consulta.',
		[
			'O que a imagem desperta em você?',
			'Qual situação concreta dialoga com esse tema?',
			'Que gesto cabe no seu dia?'
		],
		'Escolha um gesto de até dez minutos e, ao final do dia, registre se ele foi útil.',
		['Carta e pergunta', 'Possibilidade simbólica', 'Prática do dia']
	),
	'tarot-focus': profile(
		'Foco Agora usa uma carta para organizar uma pergunta presente: o que observar, o que depende de você e qual passo pode ser testado.',
		[
			'Qual é o foco concreto da pergunta?',
			'O que está sob seu alcance?',
			'Qual passo reduz a confusão?'
		],
		'Escreva um fato, uma hipótese e uma ação possível sobre sua pergunta; mantenha as três coisas separadas.',
		['Foco da pergunta', 'Tema da carta', 'Próximo passo']
	),
	'tarot-yes-no': profile(
		'Esta leitura transforma uma pergunta binária em condições para decidir. A carta não determina sim ou não; você avalia fatos, limites e consequências.',
		[
			'Que informação falta para decidir?',
			'Em quais condições você aceitaria essa opção?',
			'Em quais condições você a recusaria?'
		],
		'Defina duas condições de aceite e uma condição de recusa, confira-as com fatos e adie a decisão se a informação essencial ainda faltar.',
		['Pergunta', 'Condições de aceite', 'Condições de recusa']
	),
	'three-questions': profile(
		'Cada pergunta tem uma carta própria, sorteada sem reposição. As três leituras podem se complementar, mas não precisam chegar à mesma conclusão.',
		[
			'Qual pergunta depende de informação concreta?',
			'Qual envolve um limite que você pode comunicar?',
			'Que ação pequena atende ao conjunto?'
		],
		'Escolha uma ação comum às três perguntas e confira se ela respeita seus limites.',
		['Pergunta um', 'Pergunta dois', 'Pergunta três', 'Síntese conjunta']
	),
	'tarot-journey': profile(
		'A jornada usa três cartas fixadas na abertura: situação, recurso e experimento. Os encontros seguintes registram o que mudou na sua experiência; não alteram o sorteio inicial.',
		[
			'Como você descreve a situação atual?',
			'Qual recurso pode apoiar o caminho?',
			'O que aprendeu depois do primeiro experimento?'
		],
		'Teste uma ação pequena e registre nos dias 1, 7 e 14 o que fez, o que observou e o que ajustaria.',
		['Situação', 'Recurso', 'Experimento', 'Acompanhamento']
	),
	'dream-journal': profile(
		'O registro preserva o sonho, suas emoções e associações pessoais. Organizar o relato pode ajudar a perceber detalhes sem atribuir um significado universal.',
		[
			'Qual detalhe você deseja preservar?',
			'Que emoção você reconhece ao lembrar?',
			'Qual associação é sua, sem depender de um dicionário?'
		],
		'Escolha um detalhe, uma emoção e uma associação; escreva uma frase sobre cada um sem tentar resolver o sonho.',
		['Relato', 'Emoções', 'Associações', 'Registro pessoal']
	),
	'dream-reading': profile(
		'A leitura parte do seu relato e das associações que você informou. Imagens de sonhos admitem hipóteses diferentes; nenhuma delas descreve um fato oculto ou um diagnóstico.',
		[
			'Qual imagem chamou mais sua atenção?',
			'Que associação pessoal ela desperta?',
			'Como a emoção muda ao considerar essa associação?'
		],
		'Escreva duas hipóteses sobre uma imagem e um motivo para aceitar ou rejeitar cada uma.',
		['Relato e contexto', 'Hipóteses pessoais', 'Perguntas de integração']
	),
	'dream-dossier': profile(
		'O dossiê relaciona o sonho atual apenas aos registros privados que você selecionou. Repetição literal de uma associação é observação de texto, não prova de um padrão psicológico.',
		[
			'O que aparece neste relato?',
			'O que muda entre os registros escolhidos?',
			'Que hipótese você deseja manter em aberto?'
		],
		'Compare uma emoção e uma associação entre os registros; anote também uma diferença para evitar uma conclusão precipitada.',
		['Sonho atual', 'Registros selecionados', 'Comparação', 'Síntese aberta']
	),
	'dream-atlas': profile(
		'O Atlas acompanha trinta dias civis por meio dos registros que você incluiu. Contagens e recorrências se referem à amostra registrada; dias sem registro não recebem sonhos inventados.',
		[
			'Qual emoção se repetiu nos registros incluídos?',
			'Que associação mudou durante o período?',
			'O que os dias sem registro impedem de concluir?'
		],
		'Registre uma observação quando lembrar de um sonho; ao revisar o período, compare começo, meio e fim respeitando as lacunas.',
		['Período', 'Registros incluídos', 'Recorrências declaradas', 'Integração']
	),
	'date-reading': profile(
		'A data recebe uma observação do céu calculado e uma reflexão ligada ao contexto informado. Ela não mede sucesso, segurança ou probabilidade de um evento pessoal.',
		[
			'Que evento você está considerando?',
			'Qual parte depende de preparação concreta?',
			'O que você deseja observar naquele dia?'
		],
		'Prepare uma lista com uma ação, um recurso e um limite para a data escolhida.',
		['Data e contexto', 'Referências do céu', 'Preparação possível']
	),
	horoscope: profile(
		'O horóscopo pessoal relaciona referências do céu da data com o mapa informado. Aspectos são geometria candidata; a interpretação oferece temas de reflexão, sem prever acontecimentos.',
		[
			'Que tema chama sua atenção hoje?',
			'Qual evidência da sua vida apoia essa impressão?',
			'Qual cuidado concreto cabe no dia?'
		],
		'Escolha um tema, observe uma situação real e registre se a hipótese ajudou a compreendê-la.',
		['Clima simbólico', 'Referências pessoais', 'Prática diária']
	),
	'week-reading': profile(
		'A semana reúne sete amostras diárias. Mudanças entre amostras ajudam a organizar a observação, mas não certificam o instante exato de um evento ou uma previsão.',
		[
			'Qual compromisso é prioridade na semana?',
			'Em qual dia você pode reservar uma pausa?',
			'O que deseja revisar ao final?'
		],
		'Escolha um compromisso, uma pausa e uma revisão de dez minutos no fim da semana.',
		['Visão da semana', 'Sete dias', 'Prioridades', 'Revisão']
	),
	'personal-calendar': profile(
		'O calendário combina o mês civil com referências diárias do céu e seus marcos pessoais. Os dias não são classificados como bons ou ruins para tomar decisões.',
		[
			'Qual marco precisa de preparação?',
			'Que rotina cabe nos seus recursos?',
			'Onde vale reservar margem para imprevistos?'
		],
		'Marque uma prioridade por semana e reserve um intervalo livre para revisar a agenda.',
		['Mês civil', 'Referências diárias', 'Marcos pessoais', 'Organização']
	),
	'solar-return': profile(
		'A Revolução Solar calcula o retorno do Sol à longitude natal no ano e local informados. O mapa do retorno é uma referência simbólica; não determina os acontecimentos do ano.',
		[
			'Qual tema você deseja cuidar neste ciclo?',
			'Que mudança depende de uma prática sua?',
			'Como você vai revisar o caminho durante o ano?'
		],
		'Escolha uma prioridade anual e faça uma revisão mensal breve com ações realizadas e ajustes possíveis.',
		['Retorno calculado', 'Temas simbólicos', 'Prioridades anuais', 'Revisão']
	),
	'pair-preview': profile(
		'O encontro compara referências dos dois mapas com consentimento. Diferenças podem orientar uma conversa; não medem compatibilidade nem revelam o que a outra pessoa pensa.',
		[
			'Que diferença vocês reconhecem na prática?',
			'Que necessidade pode ser comunicada com clareza?',
			'Que acordo pequeno vale experimentar?'
		],
		'Cada pessoa escreve uma necessidade e escuta a da outra sem interpretar intenções ocultas.',
		['Referências de cada pessoa', 'Diferenças', 'Conversa possível']
	),
	synastry: profile(
		'A sinastria organiza contatos geométricos entre dois mapas. Um aspecto não prova sentimento, intenção ou destino do vínculo; a experiência das duas pessoas é a referência para avaliar hipóteses.',
		[
			'Qual tema corresponde a uma experiência dos dois?',
			'Qual hipótese não faz sentido para vocês?',
			'Que acordo pode ser testado e revisto?'
		],
		'Escolham um tema da leitura e façam um acordo de uma semana, com uma conversa de revisão ao final.',
		['Contatos calculados', 'Aproximações', 'Tensões e limites', 'Acordos']
	),
	'couple-dossier': profile(
		'O dossiê organiza expressão, necessidades, comunicação e acordos do vínculo. Ele integra referências dos dois mapas sem transformar símbolos em avaliação da relação.',
		[
			'Como cada pessoa prefere receber cuidado?',
			'Como vocês comunicam um limite?',
			'Qual acordo respeita a autonomia dos dois?'
		],
		'Registrem um acordo concreto, quem fará o quê e quando irão revisá-lo; qualquer pessoa pode recusar a proposta.',
		['Expressão e cuidado', 'Comunicação', 'Conflitos e autonomia', 'Acordos e revisão']
	),
	'purpose-career': profile(
		'Propósito e Carreira combina Meio do Céu, referências das casas 2, 6 e 10 quando disponíveis e seu contexto. Essas lentes ajudam a investigar recursos, rotina e contribuição sem prescrever profissão ou renda.',
		[
			'Que recurso você pode desenvolver?',
			'Qual rotina permite sustentar esse desenvolvimento?',
			'Que contribuição você gostaria de experimentar?'
		],
		'Planeje um experimento de uma semana com objetivo de aprendizado, tempo máximo e critério para continuar ou parar.',
		['Recursos', 'Rotina', 'Contribuição', 'Experimento']
	),
	'direction-journey': profile(
		'A Jornada de Direção transforma um objetivo declarado em trinta dias de experimentos e revisões. O acompanhamento registra suas respostas, sem atribuir ao mapa escolhas que são suas.',
		[
			'Qual é um sinal concreto de aprendizado?',
			'Qual etapa cabe nos próximos sete dias?',
			'O que você deseja ajustar depois de tentar?'
		],
		'Divida o objetivo em uma tentativa de sete dias, revise nos dias 7 e 14 e faça uma síntese no dia 30.',
		['Objetivo', 'Primeiro experimento', 'Dias 7 e 14', 'Síntese do dia 30']
	),
	'life-atlas': profile(
		'O Atlas da Vida reúne perspectivas do mapa com as quatro prioridades que você ordenou. A ordem é sua; a leitura não cria uma hierarquia automática de áreas importantes.',
		[
			'Qual prioridade pede atenção agora?',
			'O que você pode sustentar sem abandonar as demais?',
			'Que experiência ajudaria a rever a ordem?'
		],
		'Escolha a primeira prioridade e uma ação de uma semana; depois confira se deseja manter ou mudar a ordem.',
		[
			'Prioridades declaradas',
			'Identidade e cuidado',
			'Vínculos e recursos',
			'Direção e integração'
		]
	)
};
