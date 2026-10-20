import type { OfferedProductId } from '@atv/domain';

type OtherOfferId = Exclude<OfferedProductId, 'purpose-career'>;

interface ProductLanding {
	eyebrow: string;
	question: string;
	focus: string;
	distinction: string;
}

/** Product-specific public copy. Availability, deliverables and inputs remain in the catalog. */
const productLanding = {
	'birth-chart': {
		eyebrow: 'Mapa Astral · Leitura completa',
		question: 'Como as partes do meu mapa conversam entre si?',
		focus:
			'A proposta reúne planetas, Ascendente, casas e aspectos em uma leitura do mapa de nascimento. É um olhar para o conjunto, além de conhecer cada posição isoladamente.',
		distinction:
			'O preview gratuito oferece um primeiro contato com o mapa. A leitura Sol, Lua e Ascendente se concentra nesses três pilares; o Mapa Astral Completo amplia o escopo para os demais fatores do mapa.'
	},
	'three-pillars': {
		eyebrow: 'Mapa Astral · Três pilares',
		question: 'O que Sol, Lua e Ascendente revelam quando lidos juntos?',
		focus:
			'A leitura se concentra no Sol, na Lua e no Ascendente do seu mapa de nascimento. Cada um desses fatores participa de um retrato mais articulado do que uma lista de signos.',
		distinction:
			'O cálculo gratuito do Ascendente mostra um desses fatores. Esta proposta permanece delimitada aos três pilares; planetas, casas e aspectos integram a proposta mais ampla do Mapa Astral Completo.'
	},
	'life-atlas': {
		eyebrow: 'Mapa Astral · Quatro temas',
		question: 'Quais assuntos do meu mapa quero aprofundar?',
		focus:
			'Você escolhe quatro temas para orientar uma leitura do mapa de nascimento. A organização por assuntos permite acompanhar relações entre os fatores do mapa dentro das áreas escolhidas.',
		distinction:
			'O Mapa Astral Completo apresenta uma leitura integrada do conjunto. Aqui, a ênfase está nos quatro temas escolhidos por você; a página não exige a compra prévia de outra leitura.'
	},
	'week-reading': {
		eyebrow: 'Previsões · Uma semana',
		question: 'Quais trânsitos se destacam na semana que escolhi?',
		focus:
			'A leitura relaciona os trânsitos da semana ao seu mapa natal e destaca dias do período. Você informa a semana, o fuso horário e um tema de interesse.',
		distinction:
			'O horóscopo gratuito mostra um recorte diário quando há previsão publicada. Esta leitura se concentra em uma semana escolhida; o Calendário de Previsões acompanha 30 dias consecutivos a partir da geração.'
	},
	'personal-calendar': {
		eyebrow: 'Previsões · 30 dias',
		question: 'Como acompanhar os próximos 30 dias no meu mapa?',
		focus:
			'O calendário organiza trânsitos pessoais para 30 dias consecutivos contados da geração da leitura. Você também pode informar datas pessoais que queira marcar nesse intervalo.',
		distinction:
			'A data de início é definida quando a leitura é gerada, não na visita a esta página. O Horóscopo Semanal Pessoal recorta uma semana escolhida; este calendário percorre uma janela mais longa.'
	},
	'date-reading': {
		eyebrow: 'Previsões · Uma data',
		question: 'O que observar em uma data importante para mim?',
		focus:
			'A proposta relaciona os trânsitos de uma data específica ao seu mapa natal. Você escolhe a data e pode contar o contexto que faz dela um momento importante.',
		distinction:
			'Esta é uma leitura de uma data, sem acompanhamento contínuo. Para explorar uma semana ou uma janela de 30 dias, há propostas próprias com esses períodos.'
	},
	'solar-return': {
		eyebrow: 'Previsões · Ciclo anual',
		question: 'Quais temas marcam o ciclo entre dois aniversários?',
		focus:
			'A Revolução Solar considera o retorno do Sol à posição do nascimento para ler temas do ano. São necessários o ano e o local onde você estará no aniversário, além dos dados de nascimento.',
		distinction:
			'O recorte é um ciclo anual do mapa, de um aniversário ao seguinte. Isso descreve o período da leitura, não uma assinatura ou acesso recorrente.'
	},
	synastry: {
		eyebrow: 'Amor · Dois mapas',
		question: 'Como dois mapas se encontram em uma relação?',
		focus:
			'A análise compara fatores dos mapas de duas pessoas para explorar afinidades, diferenças e desafios possíveis. Os dados da outra pessoa exigem sua autorização de uso.',
		distinction:
			'A combinação gratuita faz um primeiro recorte de Sol, Lua e Ascendente. Esta leitura compara os mapas com um escopo mais amplo, sem afirmar o que a outra pessoa sente nem prever o futuro da relação.'
	},
	'couple-dossier': {
		eyebrow: 'Amor · Relação em contexto',
		question: 'O que muda quando a história da relação entra na leitura?',
		focus:
			'A proposta aprofunda a comparação dos dois mapas e organiza a leitura pelos temas da relação. Além dos dados de nascimento e da autorização, vocês podem contar o contexto que consideram relevante.',
		distinction:
			'A Análise Astral do Casal compara os mapas. O Aprofundamento acrescenta a organização pelos temas e pelo contexto informado, sem exigir uma compra anterior para esta apresentação pública.'
	},
	'career-forecast-30d': {
		eyebrow: 'Dinheiro e carreira · 30 dias',
		question: 'Que períodos pedem atenção em trabalho e recursos?',
		focus:
			'A leitura acompanha trânsitos pessoais ligados a dinheiro, trabalho e carreira por 30 dias consecutivos a partir da geração. O seu contexto profissional pode ajudar a situar os temas do período.',
		distinction:
			'O Mapa Astral de Dinheiro e Carreira olha para o mapa de nascimento. Esta proposta trata de um período móvel e não promete renda, emprego nem acontecimentos garantidos.'
	},
	'tarot-situation-challenge-advice': {
		eyebrow: 'Tarot · Três cartas',
		question: 'O que está em jogo, onde está a fricção e qual resposta posso considerar?',
		focus:
			'As três posições são Situação, Desafio e Conselho. O conselho é lido em relação ao desafio dentro da situação, para reunir a leitura em vez de apresentar três respostas soltas.',
		distinction:
			'Este método não usa as posições como passado, presente e futuro. A Carta do Dia gratuita oferece uma carta; aqui a leitura articula três funções diferentes.'
	},
	'tarot-peladan-cross': {
		eyebrow: 'Tarot · Cruz Péladan',
		question: 'Que forças apoiam e limitam a situação?',
		focus:
			'Cinco cartas ocupam as posições A favor, Contra, Conselho, Tendência e Síntese. A carta central integra os contrastes da cruz, e a tendência depende das condições examinadas.',
		distinction:
			'É um método próprio de cinco posições. Você não precisa passar antes pela leitura de três cartas para conhecer esta proposta.'
	},
	'tarot-celtic-cross': {
		eyebrow: 'Tarot · Cruz Celta',
		question: 'Como observar uma situação em dez posições relacionadas?',
		focus:
			'A Cruz Celta diferencia situação, força que a atravessa, fundamento, direção percebida, postura pessoal, ambiente e outros aspectos antes de reunir uma tendência.',
		distinction:
			'O método amplia os ângulos de observação, sem transformar a tendência em certeza ou data marcada. É uma leitura independente das tiragens de três e cinco cartas.'
	},
	'tarot-aphrodite-temple': {
		eyebrow: 'Tarot · Relações',
		question: 'Como olhar para participação, necessidades e diálogo na relação?',
		focus:
			'Sete cartas organizam tema comum, lugares na relação, necessidades, tensão compartilhada e uma condição de ajuda. A leitura parte da perspectiva de quem consulta.',
		distinction:
			'O lugar da outra pessoa permanece uma hipótese a conferir em diálogo. Este é um método de Tarot; a Análise Astral do Casal usa dados de nascimento para comparar mapas.'
	},
	'tarot-astrological-mandala': {
		eyebrow: 'Tarot · Treze cartas',
		question: 'Como diferentes áreas da vida se relacionam agora?',
		focus:
			'Doze cartas percorrem áreas simbólicas da vida e uma carta central articula os contrastes e uma prioridade de observação. O total do método é de 13 cartas.',
		distinction:
			'O nome Mandala Astrológica descreve a organização simbólica da tiragem. Não há cálculo de mapa natal nem leitura das casas do seu nascimento.'
	},
	'dream-reading': {
		eyebrow: 'Sonhos · Um relato',
		question: 'Que sentidos posso explorar no sonho que contei?',
		focus:
			'A interpretação parte do seu relato, das emoções e das associações que você fornece. Os símbolos são lidos dentro desse contexto, sem presumir fatos da sua vida que você não contou.',
		distinction:
			'Esta proposta interpreta um sonho. O Diário de Sonhos reúne registros ao longo de 30 dias e faz uma análise integrada ao final do período.'
	},
	'dream-dossier': {
		eyebrow: 'Sonhos · Aprofundamento',
		question: 'Que camadas de um sonho quero examinar com mais cuidado?',
		focus:
			'A leitura aprofunda um sonho a partir do relato, das emoções, das suas associações e dos temas que você escolhe explorar. A organização segue o material fornecido por você.',
		distinction:
			'A Interpretação do Sonho oferece uma leitura inicial de um relato. Esta proposta dá mais espaço às associações e aos temas escolhidos, sem exigir nesta página uma compra anterior.'
	},
	'dream-atlas': {
		eyebrow: 'Sonhos · 30 dias',
		question: 'Que relações surgem entre os sonhos que registro ao longo do tempo?',
		focus:
			'O diário organiza relatos durante 30 dias. Ao final, uma análise integrada relaciona os sonhos e os contextos que você registrou nesse intervalo.',
		distinction:
			'A análise considera somente os relatos registrados. Interpretações individuais de cada sonho são leituras separadas; o diário não promete interpretações avulsas ilimitadas.'
	}
} satisfies Record<OtherOfferId, ProductLanding>;

export function productLandingFor(id: string): ProductLanding | undefined {
	return (productLanding as Partial<Record<string, ProductLanding>>)[id];
}
