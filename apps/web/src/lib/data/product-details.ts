import { tarotMethods } from '@atv/domain';
/** Public explanations must describe the retained product contract, not invent availability. */
export const productDetails = {
	...Object.fromEntries(
		tarotMethods.map((method) => [
			method.id,
			{
				input:
					'Escolha do método e autorização para guardar sua leitura. Não é necessário formular uma pergunta.',
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
		input: 'Dados de nascimento e datas pessoais que você quiser marcar.',
		scope: 'Trânsitos pessoais para 30 dias consecutivos, contados a partir da geração da leitura.'
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
		scope: 'Uma leitura do mapa de nascimento sobre sua relação com recursos, trabalho e carreira.'
	},
	'career-forecast-30d': {
		input: 'Dados de nascimento e o contexto de trabalho e dinheiro que você quiser contar.',
		scope:
			'Trânsitos pessoais ligados a dinheiro, trabalho e carreira para 30 dias consecutivos, a partir da geração. A leitura apresenta temas e períodos de atenção sem prometer renda, emprego ou resultados.'
	},
	midheaven: {
		input: 'Data, hora e local de nascimento.',
		scope: 'O Meio do Céu e sua relação com carreira e reconhecimento profissional.'
	},
	'career-compass': {
		input:
			'Data, hora e local de nascimento; a leitura personalizada também considera o contexto profissional que você informar.',
		scope:
			'Uma leitura contextual do Meio do Céu, com signo, grau, direção pública, ambientes e tensões possíveis, além de três perguntas práticas. O cálculo gratuito mostra apenas o signo e o grau; a leitura personalizada está em preparação.'
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
		scope:
			'Registros organizados durante 30 dias e uma análise integrada ao final, relacionando os sonhos e os contextos informados. A análise considera somente os relatos registrados; interpretações individuais são leituras separadas.'
	},
	'atv-plus': {
		input: 'Sua conta, a escolha do plano e os dados necessários às leituras escolhidas.',
		scope:
			'Três planos com escolhas a cada 30 dias. Essencial: uma previsão. Ampliado: uma previsão e uma leitura básica. Premium: uma previsão e duas leituras básicas ou uma leitura de Tarot de 5 ou 7 cartas. Os produtos completos que não fazem parte dessas escolhas continuam avulsos. A avaliação privada não realiza cobranças.'
	}
} satisfies Record<string, { input: string; scope: string }>;

export const formatLabels: Record<string, string> = {
	web: 'Leitura no site',
	pdf: 'PDF para baixar',
	svg: 'Imagem do mapa',
	audio: 'Áudio da leitura',
	club: 'Acompanhamento na conta'
};
