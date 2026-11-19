import type { OfferedProductId } from '@atv/domain';

export type DeliveryPresentation = {
	headline: string;
	intro: string;
	labels: readonly [string, string, string];
	family:
		'map' | 'period' | 'relationship' | 'tarot' | 'dream' | 'journal' | 'comparison' | 'workbook';
};

/**
 * Public presentation of the retained scope, never a declaration of availability.
 * Formats and access must come from the domain offer; the sample remains illustrative.
 */
export const productDeliveryPresentation = {
	'birth-chart': {
		headline: 'Seu mapa ganha imagem, significado e relação com a vida.',
		intro:
			'Veja como o desenho do mapa e os trechos da leitura se encontram. O exemplo aproxima vontade, emoções e a forma de começar novas experiências.',
		labels: ['Desenho do mapa', 'Planetas, casas e aspectos', 'Leitura integrada'],
		family: 'map'
	},
	'three-pillars': {
		headline: 'Seu jeito de agir, sentir e se mostrar, lado a lado.',
		intro:
			'Sol, Lua e Ascendente aparecem identificados e depois entram em uma mesma leitura. A amostra mostra o que cada um acrescenta ao perfil.',
		labels: ['Sol, Lua e Ascendente', 'O sentido de cada posição', 'Relação entre os três'],
		family: 'map'
	},
	'life-atlas': {
		headline: 'Os assuntos que mais importam para você, dentro do seu mapa.',
		intro:
			'A leitura se organiza pelos quatro temas escolhidos. Abra um exemplo sobre trabalho, rotina e projetos e veja como um assunto ganha profundidade.',
		labels: ['Quatro temas escolhidos', 'Fatores do mapa por tema', 'Leitura de cada assunto'],
		family: 'map'
	},
	'week-reading': {
		headline: 'Sua semana, com os assuntos e os dias em destaque.',
		intro:
			'Veja a organização de uma leitura semanal: um período definido, os trânsitos em destaque e uma leitura ligada ao tema que você quer acompanhar.',
		labels: ['Período de sete dias', 'Trânsitos e dias em destaque', 'Leitura do tema escolhido'],
		family: 'period'
	},
	'personal-calendar': {
		headline: 'Um mês de previsões para consultar por data.',
		intro:
			'A apresentação reúne 30 dias de trânsitos pessoais. O exemplo mostra como consultar os destaques do período e relacioná-los aos seus compromissos.',
		labels: ['Trinta dias consecutivos', 'Consulta por data', 'Trânsitos do seu mapa'],
		family: 'period'
	},
	'date-reading': {
		headline: 'Uma data importante merece uma leitura só dela.',
		intro:
			'Veja como uma situação escolhida entra na leitura dos trânsitos daquele dia. A amostra acompanha uma apresentação de trabalho.',
		labels: ['A data escolhida', 'Trânsitos pessoais', 'Leitura da situação'],
		family: 'period'
	},
	'solar-return': {
		headline: 'Do seu aniversário ao próximo: conheça os temas do ano.',
		intro:
			'O mapa da Revolução Solar abre a leitura do novo ciclo. Veja um exemplo de como os temas do ano são apresentados e desenvolvidos.',
		labels: ['Mapa da Revolução Solar', 'Temas do seu ano', 'De aniversário a aniversário'],
		family: 'period'
	},
	synastry: {
		headline: 'Dois mapas para conhecer o que aproxima e o que pede conversa.',
		intro:
			'A comparação coloca fatores dos dois mapas lado a lado. A leitura desenvolve afinidades e diferenças para além de uma combinação de signos.',
		labels: ['Comparação de dois mapas', 'Afinidades e diferenças', 'Leitura da relação'],
		family: 'relationship'
	},
	'couple-dossier': {
		headline: 'O mapa de vocês encontra a história que vocês contam.',
		intro:
			'Veja como os temas da relação organizam a leitura aprofundada. A comparação dos mapas conversa com o contexto informado por vocês.',
		labels: ['Mapas em comparação', 'Temas da relação', 'Contexto contado por vocês'],
		family: 'relationship'
	},
	'purpose-career': {
		headline: 'Dinheiro e trabalho também fazem parte de conhecer seu mapa.',
		intro:
			'A leitura reúne os fatores do mapa ligados a recursos, trabalho e carreira. O exemplo mostra como esses assuntos ganham relação com uma situação profissional.',
		labels: ['Sua relação com recursos', 'Trabalho e carreira', 'Leitura do mapa natal'],
		family: 'workbook'
	},
	'career-forecast-30d': {
		headline: 'O próximo mês de trabalho merece atenção aos detalhes.',
		intro:
			'Veja como as previsões de 30 dias se organizam em temas e períodos de atenção. A amostra parte de uma decisão sobre assumir um novo projeto.',
		labels: ['Previsão de trinta dias', 'Dinheiro, trabalho e carreira', 'Períodos de atenção'],
		family: 'period'
	},
	'tarot-situation-challenge-advice': {
		headline: 'O que está em jogo, o que dificulta e uma resposta possível.',
		intro:
			'Três cartas ocupam posições diferentes e entram em uma leitura conjunta. Veja a imagem de cada carta, sua função e a relação entre elas.',
		labels: ['Três cartas identificadas', 'Situação, desafio e conselho', 'Leitura das relações'],
		family: 'tarot'
	},
	'tarot-peladan-cross': {
		headline: 'Uma escolha vista pelo que ajuda e pelo que resiste.',
		intro:
			'A cruz de cinco cartas organiza forças favoráveis e contrárias, conselho, tendência e síntese. A amostra mostra como essas posições se completam.',
		labels: ['Cinco cartas na cruz', 'Apoio, resistência e conselho', 'Tendência e síntese'],
		family: 'tarot'
	},
	'tarot-celtic-cross': {
		headline: 'Dez posições para olhar uma situação com mais profundidade.',
		intro:
			'A Cruz Celta distingue situação, bases, postura e ambiente. Veja a disposição das dez cartas e um trecho que reúne partes dessa leitura.',
		labels: ['Dez cartas posicionadas', 'Situação, postura e ambiente', 'Leitura do conjunto'],
		family: 'tarot'
	},
	'tarot-aphrodite-temple': {
		headline: 'Uma relação tem necessidades que precisam entrar na conversa.',
		intro:
			'Sete cartas ajudam a examinar participação, necessidades e diálogo. O exemplo mostra como a leitura abre perguntas para a relação.',
		labels: ['Sete cartas posicionadas', 'Participação e necessidades', 'Condições de diálogo'],
		family: 'tarot'
	},
	'tarot-astrological-mandala': {
		headline: 'As áreas da sua vida, vistas separadamente e em conjunto.',
		intro:
			'A mandala reúne uma carta para cada uma das doze áreas e uma no centro. Veja como a carta central articula os temas da leitura.',
		labels: ['Doze áreas da vida', 'Treze cartas na mandala', 'Carta central de integração'],
		family: 'tarot'
	},
	'dream-reading': {
		headline: 'A imagem do sonho ganha sentido a partir do que você conta.',
		intro:
			'O relato, a emoção e as suas associações abrem a leitura. Veja como uma ponte e a curiosidade de atravessar se tornam uma pergunta para continuar.',
		labels: ['Seu relato e suas emoções', 'Símbolos e associações', 'Perguntas sobre o sonho'],
		family: 'dream'
	},
	'dream-dossier': {
		headline: 'Volte às cenas do sonho e ao que cada uma despertou.',
		intro:
			'A leitura aprofundada acompanha o percurso do sonho e as associações que você informa. A amostra explora uma casa conhecida e uma porta inesperada.',
		labels: ['Percurso do sonho', 'Emoções e associações', 'Leitura aprofundada'],
		family: 'dream'
	},
	'dream-atlas': {
		headline: 'O que muda e o que reaparece quando você registra seus sonhos?',
		intro:
			'Os relatos de 30 dias formam um conjunto para observar. Veja registros de exemplo e como a análise integrada relaciona imagens, emoções e diferenças.',
		labels: ['Registros de trinta dias', 'Recorrências e diferenças', 'Análise integrada ao final'],
		family: 'journal'
	},
	'wedding-date-map': {
		headline: 'Duas ou três datas reais, com motivos para escolher.',
		intro:
			'Veja a proposta de comparação das opções de cerimônia: o que favorece cada uma, a opção preferida e os cuidados que acompanham a escolha.',
		labels: ['Quadro de duas ou três datas', 'Preferência com motivos', 'Um cuidado por opção'],
		family: 'comparison'
	},
	'ex-tarot': {
		headline: 'O contato aconteceu. O que observar antes de responder?',
		intro:
			'A proposta reúne três cartas, o episódio que você conta e sinais observáveis. Veja o recorte que diferencia possibilidades de saudade de atitudes de reparação.',
		labels: ['Três cartas e suas posições', 'Saudade e reparação', 'Um limite e uma resposta'],
		family: 'tarot'
	},
	'love-restart-map': {
		headline: 'Silêncio, contato ou reaproximação: prepare sua posição.',
		intro:
			'Veja como a previsão de 30 dias se organiza em cenários, sinais para acompanhar e escolhas pessoais para o período.',
		labels: [
			'Previsão de trinta dias',
			'Cenários e sinais observáveis',
			'Seu plano para o período'
		],
		family: 'period'
	},
	'sexuality-map': {
		headline: 'Encontre palavras para o desejo e o que faz sentido para você.',
		intro:
			'A proposta relaciona Vênus e Marte às situações que você escolhe contar. Veja o recorte sobre ritmo, conforto e formas de demonstrar interesse.',
		labels: ['Vênus e Marte no contexto', 'Ritmo e conforto', 'Interesse e limites'],
		family: 'workbook'
	},
	'intimacy-map': {
		headline: 'Um desejo pode virar um convite que respeita seu ritmo.',
		intro:
			'Veja a proposta de uma leitura que reúne desejo, ritmo e limite, com um convite adaptável à relação e uma alternativa para a recusa.',
		labels: ['Desejo, ritmo e limite', 'Um convite para adaptar', 'Uma alternativa à recusa'],
		family: 'relationship'
	},
	'emotional-reactions-map': {
		headline: 'A reação se repete. Que outra resposta você pode preparar?',
		intro:
			'A proposta parte de um episódio contado por você. Veja como reação, gatilho e efeito ajudam a organizar uma alternativa para a próxima situação.',
		labels: ['Reação, gatilho e efeito', 'Uma alternativa praticável', 'Uma frase e um sinal'],
		family: 'workbook'
	},
	'financial-blocks-tarot': {
		headline: 'Um impasse com dinheiro pode ser examinado por partes.',
		intro:
			'Três cartas organizam uma hipótese a examinar, um sinal observável e uma pequena ação. Veja o recorte de uma leitura sobre cobrar, receber ou avaliar uma oportunidade.',
		labels: [
			'Três cartas identificadas',
			'Hipótese e sinal observável',
			'Ação e critério de revisão'
		],
		family: 'tarot'
	},
	'hidden-talent-map': {
		headline: 'O que as pessoas pedem a você pode revelar uma habilidade.',
		intro:
			'A proposta parte de dois favores que você já presta. Veja como essas evidências ajudam a desenhar uma oferta pequena, um público inicial e uma forma de pedir retorno.',
		labels: ['Habilidade e evidências', 'Uma primeira oferta', 'Apresentação e retorno'],
		family: 'workbook'
	},
	'ascendant-style': {
		headline: 'Três composições com peças que já fazem parte da sua vida.',
		intro:
			'A proposta aproxima Ascendente, ocasião e a imagem que você quer expressar. Veja como as composições incluem intenção e uma troca para conforto ou clima.',
		labels: ['Ascendente e ocasião', 'Três composições completas', 'Trocas para conforto ou clima'],
		family: 'workbook'
	},
	'conversation-timing': {
		headline: 'Falar ou esperar? Prepare a conversa dos próximos dias.',
		intro:
			'Veja a proposta de comparação entre falar e esperar em um período de sete dias. A leitura reúne condições observáveis, uma frase de abertura e um limite.',
		labels: [
			'Janelas em sete dias',
			'Comparação entre falar e esperar',
			'Abertura e limite da conversa'
		],
		family: 'comparison'
	},
	'cohabitation-map': {
		headline: 'Antes de dividir a casa, coloque os hábitos na conversa.',
		intro:
			'A proposta parte dos hábitos relatados para nomear uma afinidade e um atrito. Veja como três acordos podem ganhar responsabilidade, frequência e revisão.',
		labels: ['Afinidade e atrito', 'Três propostas de acordo', 'Responsabilidade e revisão'],
		family: 'relationship'
	}
} satisfies Record<OfferedProductId, DeliveryPresentation>;
