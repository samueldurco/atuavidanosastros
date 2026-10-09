/** Original ATVNA editorial material. References and limits of consultation live in
 * docs/intelligence/reconstruction/SOURCES_2026-10-08.md. No runtime retrieval. */
export const CANON_VERSION = 'atv-humanistic-modern/1.0.0';
export const signs = [
	'Áries',
	'Touro',
	'Gêmeos',
	'Câncer',
	'Leão',
	'Virgem',
	'Libra',
	'Escorpião',
	'Sagitário',
	'Capricórnio',
	'Aquário',
	'Peixes'
] as const;
export const modernRulers = [
	'mars',
	'venus',
	'mercury',
	'moon',
	'sun',
	'mercury',
	'venus',
	'pluto',
	'jupiter',
	'saturn',
	'uranus',
	'neptune'
] as const;
export const bodyNames: Record<string, string> = {
	sun: 'Sol',
	moon: 'Lua',
	mercury: 'Mercúrio',
	venus: 'Vênus',
	mars: 'Marte',
	jupiter: 'Júpiter',
	saturn: 'Saturno',
	uranus: 'Urano',
	neptune: 'Netuno',
	pluto: 'Plutão'
};
export const functions: Record<string, string> = {
	sun: 'autoria e participação',
	moon: 'segurança e pertencimento',
	mercury: 'análise e comunicação',
	venus: 'valores e cooperação',
	mars: 'iniciativa e defesa de limites',
	jupiter: 'expansão e aprendizagem',
	saturn: 'responsabilidade e continuidade',
	uranus: 'autonomia e mudança',
	neptune: 'imaginação e sensibilidade',
	pluto: 'profundidade e transformação'
};
export type SignMeaning = {
	contribution: string;
	environment: string;
	method: string;
	motivation: string;
	cost: string;
	test: string;
};
export const signMeanings: readonly SignMeaning[] = [
	{
		contribution: 'abrir caminhos e tomar a primeira iniciativa',
		environment: 'decisões próximas de quem executa, com espaço para iniciar e corrigir',
		method: 'começar por uma tentativa curta e aprender com a resposta',
		motivation: 'perceber que sua iniciativa produz um efeito',
		cost: 'iniciar mais frentes do que consegue concluir',
		test: 'entregar uma primeira versão com prazo e critério de conclusão'
	},
	{
		contribution: 'dar consistência ao que precisa durar',
		environment: 'continuidade, recursos definidos e tempo para aperfeiçoar a execução',
		method: 'repetir, comparar qualidade e consolidar um procedimento',
		motivation: 'ver um resultado concreto que conserva seu valor',
		cost: 'manter um procedimento mesmo quando sua utilidade diminui',
		test: 'melhorar um processo existente e medir se o esforço diminuiu'
	},
	{
		contribution: 'aproximar informações, pessoas e alternativas',
		environment: 'troca frequente, variedade de assuntos e acesso a informação',
		method: 'comparar hipóteses, perguntar e explicar o que descobriu',
		motivation: 'aprender algo que muda sua compreensão do trabalho',
		cost: 'abrir possibilidades sem escolher qual merece continuidade',
		test: 'comparar duas soluções e apresentar uma recomendação fundamentada'
	},
	{
		contribution: 'perceber necessidades e sustentar vínculos de confiança',
		environment: 'relações confiáveis, acordos de cuidado e pertencimento à equipe',
		method: 'conhecer a história da situação antes de oferecer uma resposta',
		motivation: 'reconhecer quem se beneficia daquilo que faz',
		cost: 'assumir necessidades alheias sem combinar disponibilidade',
		test: 'acompanhar uma necessidade concreta e combinar até onde vai sua responsabilidade'
	},
	{
		contribution: 'assumir autoria e tornar uma proposta reconhecível',
		environment: 'espaço para apresentar ideias e receber retorno sobre sua contribuição',
		method: 'dar forma própria a uma proposta e colocá-la em discussão',
		motivation: 'ter participação reconhecida por algo que construiu',
		cost: 'confundir uma crítica à entrega com rejeição pessoal',
		test: 'apresentar uma proposta autoral e pedir retorno sobre dois critérios objetivos'
	},
	{
		contribution: 'aperfeiçoar procedimentos e resolver dificuldades específicas',
		environment: 'critérios claros de qualidade e liberdade para corrigir detalhes',
		method: 'examinar etapas, localizar falhas e testar uma melhoria por vez',
		motivation: 'constatar que seu trabalho ficou mais útil e preciso',
		cost: 'adiar uma entrega utilizável enquanto procura eliminar todo defeito',
		test: 'corrigir um problema recorrente e comparar o resultado antes e depois'
	},
	{
		contribution: 'construir acordos e considerar interesses diferentes',
		environment: 'decisões discutidas, critérios de justiça e cooperação entre áreas',
		method: 'ouvir posições distintas e tornar os critérios de escolha explícitos',
		motivation: 'participar de uma solução que as pessoas conseguem sustentar',
		cost: 'adiar um posicionamento para evitar desaprovação',
		test: 'mediar uma escolha e registrar um acordo com responsabilidades definidas'
	},
	{
		contribution: 'investigar o que sustenta um problema e acompanhar mudanças difíceis',
		environment: 'confiança para tratar assuntos complexos e limites claros de acesso',
		method: 'aprofundar a investigação antes de alterar a estrutura do problema',
		motivation: 'perceber uma mudança relevante além da aparência inicial',
		cost: 'tentar controlar todo o processo para não depender de outras pessoas',
		test: 'investigar uma causa recorrente e propor uma mudança de alcance delimitado'
	},
	{
		contribution: 'ampliar perspectivas e relacionar o trabalho a uma direção',
		environment:
			'aprendizagem, circulação de ideias e espaço para discutir o propósito das tarefas',
		method: 'partir de uma hipótese ampla e confrontá-la com uma experiência',
		motivation: 'entender por que uma atividade merece seu esforço',
		cost: 'prometer mais do que as condições de execução permitem',
		test: 'traduzir uma ideia ampla em uma atividade com resultado verificável'
	},
	{
		contribution: 'organizar responsabilidades e construir resultados ao longo do tempo',
		environment: 'papéis definidos, critérios de progresso e decisões com continuidade',
		method: 'dividir uma responsabilidade em etapas e acompanhar sua execução',
		motivation: 'conquistar confiança por uma realização consistente',
		cost: 'medir seu valor apenas pela produtividade ou pelo cargo',
		test: 'planejar uma entrega em etapas e negociar um limite de carga'
	},
	{
		contribution: 'rever padrões e criar alternativas que beneficiem um grupo',
		environment: 'autonomia, circulação de conhecimento e abertura para rever regras',
		method: 'questionar uma premissa e testar uma alternativa em pequena escala',
		motivation: 'contribuir com uma solução que amplia possibilidades para outras pessoas',
		cost: 'defender uma ideia nova sem verificar quem consegue utilizá-la',
		test: 'testar uma mudança com as pessoas afetadas e incorporar o retorno recebido'
	},
	{
		contribution: 'perceber nuances e dar forma ao que ainda está pouco definido',
		environment: 'escuta, imaginação e margem para elaborar antes de decidir',
		method: 'observar sinais distintos e transformar uma impressão em proposta concreta',
		motivation: 'encontrar sentido humano no que entrega',
		cost: 'aceitar solicitações pouco definidas e perder a medida do compromisso',
		test: 'transformar uma ideia aberta em uma entrega com escopo e prazo combinados'
	}
];
export const houseMeanings: Record<number, string> = {
	2: 'recursos que você mobiliza e critérios pelos quais avalia seu trabalho',
	6: 'organização cotidiana, manutenção das tarefas e condições de trabalho',
	10: 'responsabilidade pública e reconhecimento da contribuição'
};
export const aspectNames: Record<string, string> = {
	conjunction: 'conjunção',
	sextile: 'sextil',
	square: 'quadratura',
	trine: 'trígono',
	opposition: 'oposição'
};
