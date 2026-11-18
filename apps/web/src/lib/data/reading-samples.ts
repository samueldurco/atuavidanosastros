import { tarotMethodFor } from '@atv/domain';
import natalSample from './home-reading-sample.json' with { type: 'json' };
import { launchProducts } from './launch-products';

export type SampleSection = { title: string; text: string };
export type ReadingSample = {
	productId: string;
	layout:
		| 'chart'
		| 'pillars'
		| 'chapters'
		| 'period'
		| 'pair'
		| 'tarot'
		| 'dream'
		| 'journal'
		| 'editorial';
	title: string;
	context: string;
	sections: SampleSection[];
	facts?: { label: string; value: string }[];
	methodId?: string;
	cards?: { id: string; name: string }[];
	note: string;
	source: string;
};

const editorialNote =
	'Exemplo editorial com dados fictícios. Demonstra o conteúdo e a organização da leitura; não é um resultado calculado para uma pessoa.';
const natalNote =
	'Perfil fictício: 12 de maio de 1998, às 9h, em São Paulo. Posições provenientes do mapa calculado desta demonstração.';
const section = (title: string, text: string): SampleSection => ({ title, text });
type SampleDefinition = Omit<ReadingSample, 'productId' | 'note' | 'source'> &
	Partial<Pick<ReadingSample, 'note' | 'source'>>;
const workflow: Record<string, SampleDefinition> = {
	'birth-chart': {
		layout: 'chart',
		title: 'Vontade e conforto no mesmo mapa',
		context: 'Sol em Touro · Lua em Sagitário · Ascendente em Gêmeos',
		sections: natalSample.excerpts.map(({ title, text }) => section(title, text)),
		note: natalNote,
		source: 'home-reading-sample.json · projeção natal verificada'
	},
	'three-pillars': {
		layout: 'pillars',
		title: 'Três referências para reconhecer seu jeito',
		context: 'O mesmo perfil fictício, visto por Sol, Lua e Ascendente.',
		facts: [
			{ label: 'Sol', value: 'Touro' },
			{ label: 'Lua', value: 'Sagitário' },
			{ label: 'Ascendente', value: 'Gêmeos' }
		],
		sections: [
			section(
				'O que você quer manter e o que precisa explorar',
				'O Sol em Touro procura construir algo que possa sustentar ao longo do tempo. A Lua em Sagitário pede espaço para descobrir possibilidades. Uma escolha pode ganhar continuidade quando oferece tanto uma base quanto espaço para explorar.'
			),
			section(
				'Como começa uma experiência',
				'O Ascendente em Gêmeos acrescenta perguntas e a disposição de observar respostas. Esse primeiro movimento não resume o que você busca desenvolver depois. Começar por uma conversa pode ajudar a perceber quais possibilidades merecem continuidade.'
			)
		],
		note: natalNote,
		source: 'home-reading-sample.json · Sol, Lua e Ascendente verificados'
	},
	'life-atlas': {
		layout: 'chapters',
		title: 'Seu mapa, organizado por temas',
		context: 'Trecho do tema: trabalho, rotina e projetos compartilhados.',
		facts: [
			{ label: 'Projetos', value: 'Sol · casa 11' },
			{ label: 'Rotina', value: 'Lua · casa 6' },
			{ label: 'Trabalho', value: 'Mercúrio · casa 10' }
		],
		sections: [
			section(
				'Projetos que encontram lugar na rotina',
				'Neste perfil fictício, o Sol em Touro na casa 11 se volta para os grupos e os projetos compartilhados. A Lua em Sagitário na casa 6 traz a necessidade de perceber possibilidades na rotina. Vale observar como um projeto coletivo pode continuar sem ocupar todo o espaço de exploração do dia.'
			),
			section(
				'Uma pergunta para este tema',
				'O que você quer manter com outras pessoas, e que espaço precisa reservar para experimentar algo por conta própria? As duas necessidades podem participar da mesma escolha.'
			)
		],
		note: natalNote,
		source: 'home-reading-sample.json · casas e posições verificadas'
	},
	'week-reading': {
		layout: 'period',
		title: 'Uma semana com espaço para rever acordos',
		context: 'Situação fictícia: uma entrega e uma conversa disputam a mesma semana.',
		facts: [
			{ label: 'Período', value: '7 dias' },
			{ label: 'Foco', value: 'Agenda e acordos' }
		],
		sections: [
			section(
				'O assunto da semana',
				'Você quer concluir uma entrega sem adiar outra vez uma conversa importante. Separe o prazo que já foi combinado da disponibilidade que ainda precisa ser confirmada.'
			),
			section(
				'Como acompanhar os próximos dias',
				'Ao ler os destaques de cada dia, compare-os com os compromissos reais. Uma conversa pode começar por uma pergunta simples: “Qual horário funciona para nós dois nesta semana?”'
			)
		]
	},
	'personal-calendar': {
		layout: 'period',
		title: 'Trinta dias para acompanhar seus compromissos',
		context: 'Situação fictícia: organizar estudo, trabalho e uma conversa pendente.',
		facts: [
			{ label: 'Janela', value: '30 dias' },
			{ label: 'Consulta', value: 'Por data' }
		],
		sections: [
			section(
				'Um destaque do calendário',
				'Antes de acrescentar uma tarefa à agenda, confira o espaço que já está ocupado. Anote o que precisa de confirmação e o que pode ser concluído com os recursos que você tem hoje.'
			),
			section(
				'Sua anotação para o período',
				'“Quero terminar o curso e conversar sobre meus horários.” Guardar essa intenção ajuda a relacionar os destaques das datas com uma situação concreta.'
			)
		]
	},
	'date-reading': {
		layout: 'period',
		title: 'Uma data, uma situação para observar',
		context: 'Situação fictícia: uma apresentação de trabalho em uma data escolhida.',
		facts: [
			{ label: 'Recorte', value: 'Uma data' },
			{ label: 'Tema', value: 'Apresentação' }
		],
		sections: [
			section(
				'O que está em jogo nesse dia',
				'Você quer apresentar uma proposta e ouvir o que ainda precisa ser ajustado. Ter uma pergunta para o fim da reunião pode ajudar a distinguir interesse, dúvida e decisão.'
			),
			section(
				'Preparação possível',
				'Separe o ponto principal, um exemplo e o pedido que quer fazer. A leitura da data oferece um recorte para pensar a ocasião; o resultado da reunião também depende das pessoas e das condições envolvidas.'
			)
		]
	},
	'solar-return': {
		layout: 'period',
		title: 'Entre um aniversário e o próximo',
		context: 'Situação fictícia: começar um ciclo com mudança de trabalho e rotina.',
		facts: [
			{ label: 'Ciclo', value: 'Entre aniversários' },
			{ label: 'Recorte', value: 'Temas do ano' }
		],
		sections: [
			section(
				'Um tema para acompanhar no ano',
				'Uma mudança de trabalho também altera horários, deslocamentos e convivência. Observe o que precisa de continuidade e o que pede outra organização ao começar esse ciclo.'
			),
			section(
				'Uma pergunta que pode voltar ao longo do ciclo',
				'Que compromissos ajudam a sustentar a mudança que você escolheu? Retomar essa pergunta permite comparar a intenção do início do ano com as condições que vão aparecendo.'
			)
		]
	},
	synastry: {
		layout: 'pair',
		title: 'Dois ritmos na mesma relação',
		context: 'Relato fictício: Ana prefere combinar antes; Rui costuma decidir na hora.',
		facts: [
			{ label: 'Ana', value: 'Prefere antecedência' },
			{ label: 'Rui', value: 'Prefere flexibilidade' }
		],
		sections: [
			section(
				'Uma diferença que aparece no cotidiano',
				'Para Ana, combinar o horário ajuda a aproveitar o encontro. Para Rui, deixar uma parte em aberto permite mudar de ideia. A diferença pode aparecer como desinteresse quando ninguém explica o que precisa.'
			),
			section(
				'Uma conversa possível',
				'Escolham o que precisa ser confirmado e o que pode ficar em aberto. Na leitura do casal, os mapas acrescentam referências à compreensão dessas diferenças; este trecho demonstra uma situação de convivência.'
			)
		]
	},
	'couple-dossier': {
		layout: 'pair',
		title: 'Quando o mesmo assunto volta à conversa',
		context: 'Relato fictício: Jo e Lu adiam decisões sobre tempo juntos e tempo individual.',
		facts: [
			{ label: 'Tema', value: 'Autonomia' },
			{ label: 'Acordo', value: 'Tempo compartilhado' }
		],
		sections: [
			section(
				'O que cada pessoa está pedindo',
				'Jo quer saber com antecedência quando vão se encontrar. Lu quer preservar uma noite para ficar só. Os dois pedidos podem coexistir, mas ainda precisam virar um acordo compreensível para ambos.'
			),
			section(
				'Aprofundar sem repetir a discussão',
				'Voltem a uma ocasião concreta: qual pedido foi feito, como foi entendido e o que ficou sem resposta? Esse percurso ajuda a diferenciar um desacordo sobre a agenda de uma dúvida sobre o vínculo.'
			)
		]
	},
	'purpose-career': {
		layout: 'chapters',
		title: 'Da ideia à contribuição no trabalho',
		context: 'Trecho do mapa fictício: Mercúrio em Áries, na casa 10.',
		facts: [
			{ label: 'Fator', value: 'Mercúrio em Áries' },
			{ label: 'Campo', value: 'Casa 10' }
		],
		sections: [
			section(
				'Uma forma de participar',
				'Neste mapa, Mercúrio em Áries se relaciona à tendência de formular o ponto principal e testar uma resposta direta. Na casa 10, esse trabalho encontra o campo da contribuição pública e das responsabilidades profissionais.'
			),
			section(
				'Uma pergunta para o trabalho atual',
				'Em que situação você pode apresentar uma ideia com clareza e também ouvir o que falta para colocá-la em prática? A leitura do mapa descreve referências para essa reflexão; escolhas profissionais dependem das condições reais de trabalho.'
			)
		],
		note: natalNote,
		source: 'home-reading-sample.json · Mercúrio e casa 10 verificados'
	},
	'career-forecast-30d': {
		layout: 'period',
		title: 'Próximos 30 dias de trabalho e recursos',
		context: 'Situação fictícia: rever prazos antes de assumir um projeto adicional.',
		facts: [
			{ label: 'Período', value: '30 dias' },
			{ label: 'Foco', value: 'Trabalho e recursos' }
		],
		sections: [
			section(
				'O que merece atenção no período',
				'Um novo projeto parece interessante, mas o tempo disponível ainda precisa ser conferido. Liste as entregas já assumidas e as condições que gostaria de negociar antes de responder.'
			),
			section(
				'Uma decisão que pode ser preparada',
				'Em vez de aceitar um prazo indefinido, peça escopo, data e remuneração por escrito. As previsões ajudam a pensar o período; renda e contratação dependem de fatores que a leitura não controla.'
			)
		]
	},
	'dream-reading': {
		layout: 'dream',
		title: 'Uma ponte e a vontade de atravessar',
		context: '“Sonhei com uma ponte e senti curiosidade.”',
		facts: [
			{ label: 'Emoção', value: 'Curiosidade' },
			{ label: 'Associação', value: 'Travessia' }
		],
		sections: [
			section(
				'A associação que você trouxe',
				'Você associou a ponte a uma travessia. A curiosidade dá à cena um tom de aproximação e abre uma pergunta sobre o que havia do outro lado.'
			),
			section(
				'Uma pergunta para continuar',
				'Havia algo na outra margem que chamava sua atenção? O que essa travessia lembra na sua vida de hoje? O sentido parte do relato e das suas associações, sem atribuir à ponte um significado fixo.'
			)
		],
		source: 'Amostra editorial da home aprovada pelo proprietário'
	},
	'dream-dossier': {
		layout: 'dream',
		title: 'A casa conhecida que tinha outra porta',
		context:
			'“Voltei à casa da infância. Uma porta dava para um jardim que eu não conhecia. Senti alívio.”',
		facts: [
			{ label: 'Cena', value: 'Casa e jardim' },
			{ label: 'Emoção', value: 'Alívio' }
		],
		sections: [
			section(
				'Reconstruir o percurso do sonho',
				'O relato começa em um lugar conhecido e chega a um espaço novo. Você associou a casa à cobrança e o jardim a ter tempo para si. O alívio apareceu ao atravessar a porta, e essa mudança de sensação merece atenção.'
			),
			section(
				'Relacionar imagem, emoção e associação',
				'A porta aproxima duas experiências que você descreveu: a cobrança de um lugar familiar e a possibilidade de uma pausa. Onde essa passagem encontra uma situação atual? A pergunta aprofunda o relato sem transformar a imagem em um diagnóstico.'
			)
		]
	},
	'dream-atlas': {
		layout: 'journal',
		title: 'O que reaparece nos seus registros',
		context: 'Trechos fictícios de um diário de sonhos de 30 dias.',
		facts: [
			{ label: 'Registro 01', value: 'Estação · pressa' },
			{ label: 'Registro 02', value: 'Estrada · curiosidade' },
			{ label: 'Registro 03', value: 'Praça · tranquilidade' }
		],
		sections: [
			section(
				'Uma mudança entre os relatos',
				'Nos três registros deste exemplo, aparece a experiência de chegar a algum lugar. A pressa do primeiro relato dá lugar à curiosidade e depois à tranquilidade. Essa diferença vem das emoções anotadas por você.'
			),
			section(
				'Uma pergunta para a leitura do conjunto',
				'O que mudou entre o sonho da estação e o da praça? Comparar os próprios registros permite observar recorrências e diferenças. A análise integrada considera apenas os sonhos que foram registrados no período.'
			)
		]
	}
};

const tarotExamples = [
	{
		id: 'tarot-situation-challenge-advice',
		title: 'Retomar uma conversa, uma pergunta de cada vez',
		context: 'Pergunta fictícia: como retomar uma conversa que ficou pela metade?',
		cards: [17, 9, 14],
		sections: [
			section(
				'Conselho · A Temperança',
				'A Temperança sugere retomar a conversa aos poucos. Combine quando voltar ao assunto e comece por uma pergunta.'
			),
			section(
				'Relacionando as três posições',
				'A Estrela, na situação, abre espaço para falar do que se espera. O Eremita, no desafio, pede atenção ao tempo de elaborar. A Temperança, no conselho, aproxima essas duas necessidades em um passo que possa ser combinado.'
			)
		]
	},
	{
		id: 'tarot-peladan-cross',
		title: 'O que ajuda e o que dificulta uma escolha',
		context: 'Pergunta fictícia: o que considerar antes de aceitar um projeto?',
		cards: [1, 15, 11, 14, 8],
		sections: [
			section(
				'Conselho · A Justiça',
				'Confira as condições que serão assumidas por cada parte. Colocar escopo e prazo por escrito pode ajudar a comparar o convite com o tempo que você tem.'
			),
			section(
				'Síntese · A Força',
				'A Força reúne a disposição de participar e a necessidade de reconhecer um limite. Nesta composição de exemplo, sustentar a escolha envolve conversar sobre as condições antes de se comprometer.'
			)
		]
	},
	{
		id: 'tarot-celtic-cross',
		title: 'Uma mudança vista por dez posições',
		context: 'Pergunta fictícia: como pensar uma mudança de rotina de trabalho?',
		cards: [2, 7, 4, 9, 17, 14, 8, 3, 18, 21],
		sections: [
			section(
				'Situação · A Sacerdotisa',
				'A situação pede tempo para perceber o que ainda não foi colocado em palavras. Quais informações você já tem, e quais ainda precisa buscar antes de decidir?'
			),
			section(
				'Expectativas e receios · A Lua',
				'A Lua, nesta posição, permite explorar as dúvidas ligadas à mudança. Nomear o receio é diferente de tratá-lo como um acontecimento certo. A leitura reúne as dez posições para pensar a pergunta inicial.'
			)
		]
	},
	{
		id: 'tarot-aphrodite-temple',
		title: 'Necessidades que precisam entrar na conversa',
		context: 'Pergunta fictícia: como conversar sobre o tempo que passamos juntos?',
		cards: [6, 17, 9, 4, 2, 15, 14],
		sections: [
			section(
				'Sua necessidade · O Eremita',
				'Nesta posição, O Eremita abre uma pergunta sobre o tempo individual. Que espaço você precisa preservar para conseguir participar da relação com atenção?'
			),
			section(
				'Condição de ajuda · A Temperança',
				'Combinar um momento de encontro e um tempo individual pode oferecer um começo. A posição sobre a necessidade da outra pessoa indica algo a perguntar; não revela pensamentos ou sentimentos que ela não expressou.'
			)
		]
	},
	{
		id: 'tarot-astrological-mandala',
		title: 'Doze áreas e uma leitura do conjunto',
		context: 'Pergunta fictícia: que temas merecem atenção neste momento da vida?',
		cards: [1, 4, 2, 3, 17, 14, 6, 13, 9, 8, 19, 18, 21],
		sections: [
			section(
				'Rotina e cuidado · A Temperança',
				'Nesta área, A Temperança convida a observar como atividades e pausas se distribuem. Um ajuste pequeno pode começar por um compromisso que caiba no seu dia.'
			),
			section(
				'Centro · Articulação · O Mundo',
				'A carta central relaciona as doze áreas. No exemplo, O Mundo abre uma pergunta sobre o que você quer reunir e concluir. São treze cartas: uma para cada área e uma no centro.'
			)
		]
	}
];

const majorNames = [
	'O Louco',
	'O Mago',
	'A Sacerdotisa',
	'A Imperatriz',
	'O Imperador',
	'O Hierofante',
	'Os Enamorados',
	'O Carro',
	'A Força',
	'O Eremita',
	'A Roda da Fortuna',
	'A Justiça',
	'O Enforcado',
	'A Morte',
	'A Temperança',
	'O Diabo',
	'A Torre',
	'A Estrela',
	'A Lua',
	'O Sol',
	'O Julgamento',
	'O Mundo'
];
for (const example of tarotExamples) {
	workflow[example.id] = {
		layout: 'tarot',
		title: example.title,
		context: example.context,
		methodId: example.id,
		cards: example.cards.map((number) => ({ id: `major-${number}`, name: majorNames[number] })),
		sections: example.sections,
		note: 'Pergunta fictícia. Cartas escolhidas editorialmente para demonstrar as posições e a leitura; nenhuma tiragem foi realizada para esta amostra.',
		source: 'tarot-methods.ts · posições do método vigente; composição editorial de exemplo'
	};
}

// These public P02 examples already belong to each launch offer. Keep their scope intact.
const launches = Object.fromEntries(
	launchProducts.map((product) => [
		product.id,
		{
			productId: product.id,
			layout: 'editorial' as const,
			title: product.name,
			context: product.sampleInput,
			sections: [section('Trecho da demonstração', product.sampleDelivery)],
			note: editorialNote,
			source: 'docs/p02-lancamentos/launch-metadata.json · sampleInput e sampleDelivery'
		}
	])
);

export const readingSamples: Record<string, ReadingSample> = {
	...Object.fromEntries(
		Object.entries(workflow).map(([productId, sample]) => [
			productId,
			{
				...sample,
				productId,
				note: sample.note ?? editorialNote,
				source:
					sample.source ??
					'product-details.ts · recorte público; exemplo editorial sem cálculo de trânsitos ou sinastria'
			}
		])
	),
	...launches
};

export function readingSample(productId: string): ReadingSample | undefined {
	return readingSamples[productId];
}

export function sampleTarotPositions(sample: ReadingSample) {
	return sample.methodId ? (tarotMethodFor(sample.methodId)?.positions ?? []) : [];
}
