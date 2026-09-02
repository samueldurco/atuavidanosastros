export const SITE = {
	name: 'A Tua Vida nos Astros',
	tagline: 'Um atlas editorial para a vida.',
	url: 'https://atuavidanosastros.com.br',
	description:
		'Astrologia, Tarot e símbolos com método, contexto e linguagem responsável para orientar perguntas melhores.'
} as const;

export const navigation = [
	{ href: '/meu-ceu', label: 'Meu Céu' },
	{ href: '/ciclos', label: 'Ciclos' },
	{ href: '/amor', label: 'Amor' },
	{ href: '/proposito', label: 'Propósito' },
	{ href: '/tarot', label: 'Tarot' },
	{ href: '/sonhos', label: 'Sonhos' }
] as const;

export const universes = [
	{
		slug: 'meu-ceu',
		eyebrow: 'Identidade',
		title: 'Meu Céu',
		description:
			'Sol, Lua, Ascendente e o desenho singular do seu mapa — com contexto, método e espaço para escolha.',
		cta: 'Começar pelos Três Pilares'
	},
	{
		slug: 'ciclos',
		eyebrow: 'Tempo',
		title: 'Ciclos & Tempo',
		description:
			'Leituras para observar ritmos, trânsitos e temporadas sem transformar tendência em sentença.',
		cta: 'Ler o céu de agora'
	},
	{
		slug: 'amor',
		eyebrow: 'Encontro',
		title: 'Amor & Relações',
		description:
			'Afinidades, tensões e acordos possíveis entre dois mapas, com consentimento e sem receitas prontas.',
		cta: 'Conhecer a Sinastria'
	},
	{
		slug: 'proposito',
		eyebrow: 'Direção',
		title: 'Propósito & Prosperidade',
		description:
			'Vocação, contribuição e trabalho como campo de hipótese e experimento — não promessa de destino ou renda.',
		cta: 'Usar a Bússola de Carreira'
	},
	{
		slug: 'tarot',
		eyebrow: 'Pergunta',
		title: 'Tarot & Arcanos',
		description:
			'Imagens para desacelerar, nomear a pergunta e enxergar alternativas com responsabilidade.',
		cta: 'Tirar a Carta do Dia'
	},
	{
		slug: 'sonhos',
		eyebrow: 'Memória',
		title: 'Sonhos & Símbolos',
		description:
			'Um caderno longitudinal para registrar imagens, recorrências e associações que pertencem à sua história.',
		cta: 'Registrar um sonho'
	}
] as const;

export const signs = [
	'aries',
	'touro',
	'gemeos',
	'cancer',
	'leao',
	'virgem',
	'libra',
	'escorpiao',
	'sagitario',
	'capricornio',
	'aquario',
	'peixes'
] as const;
export type SignSlug = (typeof signs)[number];
export const signNames: Record<SignSlug, string> = {
	aries: 'Áries',
	touro: 'Touro',
	gemeos: 'Gêmeos',
	cancer: 'Câncer',
	leao: 'Leão',
	virgem: 'Virgem',
	libra: 'Libra',
	escorpiao: 'Escorpião',
	sagitario: 'Sagitário',
	capricornio: 'Capricórnio',
	aquario: 'Aquário',
	peixes: 'Peixes'
};

export const editorialPages = {
	'meu-ceu': universes[0],
	ciclos: universes[1],
	amor: universes[2],
	proposito: universes[3],
	tarot: universes[4],
	sonhos: universes[5],
	'vocacao-no-mapa-astral': {
		eyebrow: 'Guia',
		title: 'Vocação no mapa astral',
		description:
			'Uma leitura vocacional responsável cruza direção pública, recursos, rotina e contexto vivido. Nenhum signo escolhe uma profissão por você.',
		cta: 'Conhecer a Bússola'
	},
	'carreira-no-mapa-astral': {
		eyebrow: 'Guia',
		title: 'Carreira no mapa astral',
		description:
			'O mapa oferece perguntas sobre contribuição e visibilidade. Formação, território, saúde, classe, oportunidades e escolhas também fazem parte da resposta.',
		cta: 'Explorar seu Meio do Céu'
	},
	'casa-10': {
		eyebrow: 'Atlas',
		title: 'Casa 10: contribuição e presença pública',
		description:
			'A Casa 10 descreve como buscamos participar do mundo visível. É uma dimensão do mapa, não um cargo predeterminado.',
		cta: 'Ler sobre o Meio do Céu'
	},
	metodo: {
		eyebrow: 'Transparência',
		title: 'Método: cálculo, interpretação e escolha',
		description:
			'Separamos dados calculados, hipóteses interpretativas e decisões humanas. Cada resultado informa versão, origem e limites.',
		cta: 'Explorar os universos'
	},
	caderno: {
		eyebrow: 'Editorial',
		title: 'Caderno',
		description:
			'Ensaios e guias para aprofundar perguntas sobre céu, tempo, relações, propósito, Tarot e sonhos.',
		cta: 'Começar pelo Meu Céu'
	},
	privacidade: {
		eyebrow: 'Privacidade',
		title: 'Seus dados merecem contexto e limite',
		description:
			'Coletamos somente o necessário para a finalidade escolhida. Dados natais não são enviados ao analytics; controles de exportação e exclusão serão integrados à conta.',
		cta: 'Entrar na sua conta'
	},
	cookies: {
		eyebrow: 'Preferências',
		title: 'Cookies sob o seu controle',
		description:
			'Armazenamento essencial mantém o serviço. Analytics não essencial permanece desligado até consentimento e pode ser recusado com a mesma facilidade.',
		cta: 'Voltar ao início'
	},
	suporte: {
		eyebrow: 'Cuidado',
		title: 'Suporte',
		description:
			'Entregas, acesso e cobranças terão caminhos de recuperação rastreáveis. O endereço público aprovado é suporte@atuavidanosastros.com.br, sujeito à validação do domínio.',
		cta: 'Abrir a Biblioteca'
	}
} as const;
