import { tarotMethods } from '@atv/domain';
/** Public explanations must describe the retained product contract, not invent availability. */
export const productDetails = {
	...Object.fromEntries(
		tarotMethods.map((method) => [
			method.id,
			{
				input: 'Foco opcional e autorização para guardar sua leitura.',
				scope: `${method.positions.length} ${method.positions.length === 1 ? 'carta' : 'cartas'}: ${method.positions.map((p) => p.name).join(', ')}. ${method.integration}`
			}
		])
	),
	'birth-chart': {
		input: 'Data, hora e local de nascimento.',
		scope: 'Sol, Lua, planetas, Ascendente, casas e aspectos do seu mapa natal.'
	},
	'three-pillars': {
		input: 'Data, hora e local de nascimento.',
		scope: 'Uma leitura centrada no Sol, na Lua e no Ascendente.'
	},
	ascendant: {
		input: 'Data, hora e local de nascimento. A hora influencia o resultado.',
		scope: 'O signo e a posição do Ascendente no seu mapa.'
	},
	'life-atlas': {
		input: 'Dados de nascimento e quatro temas que você quer aprofundar.',
		scope: 'Uma leitura organizada pelos quatro assuntos escolhidos no seu mapa.'
	},
	horoscope: {
		input: 'Dados de nascimento e a data que você quer consultar.',
		scope: 'Trânsitos astrológicos da data escolhida em relação ao seu mapa natal.'
	},
	'date-reading': {
		input: 'Dados de nascimento, data da consulta e contexto que você quiser contar.',
		scope: 'Uma leitura dos trânsitos para uma data específica.'
	},
	'week-reading': {
		input: 'Dados de nascimento, semana, fuso horário e tema de interesse.',
		scope: 'Os trânsitos da semana e os dias em destaque no período escolhido.'
	},
	'personal-calendar': {
		input: 'Dados de nascimento, mês e datas pessoais que você quiser marcar.',
		scope: 'Um calendário de trânsitos para consultar ao longo do mês.'
	},
	'solar-return': {
		input: 'Dados de nascimento, ano e local onde você estará no aniversário.',
		scope: 'O mapa do retorno do Sol à posição do seu nascimento, de um aniversário ao seguinte.'
	},
	synastry: {
		input: 'Dados de nascimento das duas pessoas e autorização para usar os dados da outra pessoa.',
		scope: 'A comparação dos dois mapas, com afinidades e diferenças entre os fatores analisados.'
	},
	'pair-preview': {
		input: 'Dados de nascimento das duas pessoas e autorização para usar os dados da outra pessoa.',
		scope: 'Uma comparação inicial do Sol, da Lua e do Ascendente do casal.'
	},
	'couple-dossier': {
		input: 'Dados das duas pessoas, autorização e o contexto que vocês quiserem contar.',
		scope: 'Uma leitura aprofundada da comparação dos mapas, organizada pelos temas da relação.'
	},
	'daily-card': {
		input: 'Uma pergunta e o contexto que você quiser contar.',
		scope: 'Uma carta de Tarot e uma interpretação ligada à sua pergunta.'
	},
	'tarot-yes-no': {
		input: 'Uma pergunta de sim ou não.',
		scope:
			'Uma carta para explorar a pergunta, as condições e as possibilidades. A leitura disponível não fornece uma resposta binária automática.'
	},
	'three-questions': {
		input: 'Três perguntas e o contexto que você quiser contar.',
		scope: 'Uma leitura de Tarot para cada pergunta e uma síntese dos temas em comum.'
	},
	'tarot-journey': {
		input: 'Um objetivo, sua pergunta e o contexto que você quiser contar.',
		scope: 'Uma sequência de leituras de Tarot sobre o objetivo escolhido.'
	},
	'tarot-focus': {
		input: 'Uma pergunta sobre o assunto que você quer explorar.',
		scope: 'Uma carta e uma leitura centrada no assunto da sua pergunta.'
	},
	'purpose-career': {
		input: 'Dados de nascimento e o contexto profissional que você quiser contar.',
		scope: 'Uma leitura do mapa voltada a carreira, trabalho e relação com recursos.'
	},
	midheaven: {
		input: 'Data, hora e local de nascimento.',
		scope: 'O Meio do Céu e sua relação com carreira e reconhecimento profissional.'
	},
	'career-compass': {
		input: 'Data, hora e local de nascimento.',
		scope:
			'O cálculo do Meio do Céu. A ferramenta gratuita já pode ser consultada; a leitura personalizada está em preparação.'
	},
	'direction-journey': {
		input: 'Um objetivo profissional, a data de início e o que você quer desenvolver.',
		scope: 'Etapas para acompanhar seu objetivo de carreira durante 30 dias.'
	},
	'dream-reading': {
		input: 'O relato do sonho, suas emoções e associações.',
		scope: 'Uma interpretação dos símbolos a partir do que você conta sobre o sonho.'
	},
	'dream-journal': {
		input: 'Data, relato e emoções do sonho.',
		scope: 'Um registro de sonho para voltar a consultar e refletir sobre o relato.'
	},
	'dream-dossier': {
		input: 'Relato do sonho, emoções, associações e os temas que você quer aprofundar.',
		scope: 'Uma leitura aprofundada de um sonho, organizada pelas suas associações.'
	},
	'dream-atlas': {
		input: 'Data de início e os relatos dos sonhos que você registrar.',
		scope: 'Um diário de 30 dias para reunir os sonhos e observar temas que se repetem.'
	},
	'atv-plus': {
		input: 'Sua conta e os registros que você autorizar guardar.',
		scope:
			'Acompanhamento das suas leituras. Os planos, benefícios e condições de assinatura serão apresentados quando estiverem definidos.'
	}
} satisfies Record<string, { input: string; scope: string }>;

export const formatLabels: Record<string, string> = {
	web: 'Leitura no site',
	pdf: 'PDF para baixar',
	svg: 'Imagem do mapa',
	audio: 'Áudio da leitura',
	club: 'Acompanhamento na conta'
};
