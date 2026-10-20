import type { FreeToolSection } from '../free-tools';
import { signs, signMeanings } from '../trials/reconstruction/canon';
import { natalStyles } from '../trials/reconstruction/natal-canon';
import {
	arrivalMovement,
	moonMovement,
	pairElementMeaning,
	resourceContinuity,
	resourceValues,
	rulerContinuity
} from './free-tool-interpretation-canon';

/** Original ATVNA introductory edition. Geometry stays in the calculation service.
 * These paragraphs interpret the declared factors; they do not claim life events. */
export const FREE_INTERPRETATION_VERSION = 'atv-public-interpretation/2.0.0';
const sign = (longitude: number) => Math.floor((((longitude % 360) + 360) % 360) / 30);
const movement = [
	'Quando o primeiro passo depende de você, a situação ganha movimento. A mesma prontidão pode fazer uma espera parecer uma recusa, mesmo quando o outro ainda está elaborando uma resposta.',
	'A confiança cresce quando uma experiência pode ser repetida e reconhecida. Essa continuidade dá consistência ao que você constrói; também pode tornar difícil admitir que algo familiar já deixou de servir.',
	'Uma conversa pode abrir caminhos que não apareciam no pensamento solitário. O interesse por novas possibilidades ajuda a encontrar saídas, mas pode interromper o aprofundamento justo quando a novidade termina.',
	'O sentido de uma situação passa pelo vínculo que ela cria. Perceber o que alguém precisa favorece o cuidado; assumir essa necessidade sem combiná-la pode fazer você carregar uma responsabilidade que não era sua.',
	'Envolver-se fica mais fácil quando há espaço para uma expressão própria. Por isso, uma crítica ao que foi feito pode tocar também o desejo de ser reconhecido: distinguir essas duas coisas permite revisar a obra sem diminuir quem a criou.',
	'Perceber um detalhe que pode melhorar dá direção ao esforço. Essa atenção torna a ajuda precisa, mas pode estreitar o olhar: quando tudo parece precisar de correção, fica difícil reconhecer o que já funciona.',
	'Colocar diferentes pontos de vista em relação ajuda a construir acordos. A dificuldade aparece quando preservar a conversa exige esconder a própria preferência; um acordo perde consistência se uma das posições não chega a ser dita.',
	'A confiança tende a pedir tempo e profundidade. Essa disposição sustenta conversas difíceis, mas a tentativa de eliminar toda incerteza pode tornar a aproximação uma investigação sem fim.',
	'Uma possibilidade ganha força quando parece ampliar a vida e dar sentido ao caminho. O entusiasmo ajuda a atravessar o desconhecido; também pode levar a prometer uma chegada antes de conhecer o esforço do percurso.',
	'Assumir uma responsabilidade dá forma ao que importa. A capacidade de sustentar um compromisso pode, porém, tornar difícil descansar ou mudar de direção sem sentir que está abandonando algo.',
	'Tomar distância do costume permite imaginar outras formas de participar. A liberdade de questionar abre espaço para soluções próprias, mas uma ideia coerente ainda precisa encontrar as pessoas e as condições que a tornam possível.',
	'Perceber nuances e imaginar outros sentidos amplia a experiência. Essa abertura pode fazer diferentes necessidades se misturarem; dar nome ao que é seu ajuda a continuar sensível sem assumir tudo o que chega.'
];

export function freeNatalPortrait(
	body: 'sun' | 'moon' | 'ascendant',
	longitude: number
): FreeToolSection {
	const index = sign(longitude),
		style = natalStyles[index]!;
	const name = body === 'sun' ? 'Sol' : body === 'moon' ? 'Lua' : 'Ascendente';
	const first =
		body === 'sun'
			? `Com o Sol em ${signs[index]}, a leitura destaca o desejo de ${style.aim}. É uma maneira de se envolver com aquilo que faz a vida parecer sua: o interesse se sustenta quando você reconhece esse sentido no que está construindo.`
			: body === 'moon'
				? `A Lua em ${signs[index]} fala da necessidade de ${style.need}. Em momentos de cansaço ou insegurança, esse modo de recuperar conforto pode ficar mais evidente. O que tranquiliza você nem sempre é o gesto que outra pessoa ofereceria espontaneamente.`
				: `O Ascendente em ${signs[index]} sugere uma entrada nas situações marcada por ${style.entry}. É o primeiro movimento diante do que ainda não é familiar. Ele pode ajudar a abrir uma experiência, sem precisar definir todo o modo como você a vive depois.`;
	const development =
		body === 'moon'
			? moonMovement[index]
			: body === 'ascendant'
				? arrivalMovement[index]
				: movement[index];
	return { id: body, title: `${name} em ${signs[index]}`, body: `${first}\n\n${development}` };
}

// Only for the Sun's direction and Moon's comfort within one person, never for
// regency or a relationship between two people. This is not an aspect calculation.
const elementBridges = [
	[
		'Os dois movimentos procuram uma resposta viva e imediata. A energia de começar pode ser reforçada, mas uma pausa pode parecer perda de interesse mesmo quando serve apenas para recuperar fôlego.',
		'A vontade de começar encontra uma necessidade de segurança concreta. Uma parte se anima com a abertura; outra só relaxa quando conhece o ritmo, os recursos e a continuidade. Avançar em etapas dá lugar às duas.',
		'A iniciativa encontra espaço para conversar e imaginar alternativas. Isso favorece começar com criatividade; o excesso de possibilidades pode, porém, dispersar a energia antes de uma escolha ganhar continuidade.',
		'A vontade de agir encontra uma sensibilidade ao que a mudança faz sentir. Começar algo pode ser desejado e, ao mesmo tempo, pedir acolhimento. Uma hesitação emocional não precisa significar falta de vontade.'
	],
	[
		'O desejo de construir com consistência convive com uma necessidade de movimento. A estabilidade pode virar imobilidade se não houver espaço para uma iniciativa própria; a novidade pode trazer ânimo sem exigir abandonar tudo.',
		'Os dois movimentos valorizam algo em que se possa confiar. A repetição ajuda a consolidar o caminho, mas pode tornar uma mudança necessária mais difícil de admitir. O conforto merece continuidade enquanto ainda sustenta a vida que se deseja.',
		'O desejo de concretizar encontra uma necessidade de trocar ideias e manter alternativas abertas. O que parece indecisão pode ser uma busca de compreensão; o que parece rigidez pode ser uma tentativa de dar chão à conversa.',
		'A construção de algo estável encontra uma necessidade de vínculo. Gestos consistentes podem transmitir cuidado, mas nem toda necessidade emocional se resolve com uma providência prática; às vezes é preciso também reconhecer o que foi sentido.'
	],
	[
		'A busca de possibilidades encontra uma necessidade de reagir e experimentar. Conversar pode esclarecer, mas também adiar uma ação que já ajudaria a entender. A experiência concreta dá retorno às ideias sem exigir decidir tudo de uma vez.',
		'A curiosidade encontra uma necessidade de previsibilidade. Você pode gostar de imaginar mudanças e ainda precisar de tempo para se sentir à vontade nelas. Distinguir explorar uma ideia de se comprometer com ela evita cobrar um único ritmo das duas coisas.',
		'Os dois movimentos passam pela troca e pela elaboração de perspectivas. Falar pode aproximar e esclarecer, mas explicar um sentimento não é sempre o mesmo que atravessá-lo; uma conclusão inteligente pode precisar de tempo para se tornar experiência.',
		'A busca de explicações encontra uma necessidade de acolhimento. Entender uma situação pode trazer alívio, mas uma resposta lógica pode chegar antes de o sentimento ter espaço. Nomear o que aconteceu ajuda quando a explicação não apressa a emoção.'
	],
	[
		'O envolvimento afetivo encontra uma necessidade de autonomia e ação. Cuidar de um vínculo e querer espaço podem coexistir. Um gesto de independência fica mais compreensível quando não precisa ser interpretado como retirada de afeto.',
		'O envolvimento afetivo encontra uma necessidade de continuidade concreta. Presença e rotina podem oferecer confiança, mas manter o conhecido nem sempre protege o vínculo: algumas mudanças permitem que ele continue vivo.',
		'A sensibilidade ao vínculo encontra uma necessidade de conversar e abrir perspectivas. Dar palavras à experiência pode aliviar, desde que a conversa tenha espaço para o sentimento e não tente resolvê-lo antes de ouvi-lo.',
		'Os dois movimentos dão peso ao vínculo e ao clima emocional. A sensibilidade pode aproximar, mas também aumentar o espaço das suposições. Um sentimento percebido merece ser nomeado antes de virar certeza sobre o que está acontecendo.'
	]
];

export function freeNatalSynthesis(sun: number, moon: number): FreeToolSection {
	const a = sign(sun),
		b = sign(moon);
	return {
		id: 'synthesis',
		title: 'O que dá direção e o que traz conforto',
		body: `O Sol em ${signs[a]} e a Lua em ${signs[b]} aproximam duas questões diferentes: o que faz você querer participar e o que precisa estar presente para se sentir à vontade. ${elementBridges[a % 4]![b % 4]}\n\nNesta combinação, ${natalStyles[a]!.aim} não elimina a necessidade de ${natalStyles[b]!.need}. Uma escolha pode ser interessante e ainda precisar de um modo de acontecer que respeite essa necessidade. É nessa diferença que a leitura acrescenta algo à descrição isolada do signo solar.`
	};
}

export function freeRulerSection(
	asc: number,
	rulerName: string,
	rulerLongitude: number
): FreeToolSection {
	const a = sign(asc),
		r = sign(rulerLongitude),
		style = natalStyles[r]!;
	return {
		id: 'ruler',
		title: 'O primeiro impulso ganha uma maneira de continuar',
		body: `O Ascendente em ${signs[a]} é regido, nesta leitura moderna, por ${rulerName}, que está em ${signs[r]}. Isso qualifica o começo da experiência: depois de ${natalStyles[a]!.entry}, a continuidade pede ${style.action}.\n\n${rulerContinuity[a % 4]![r % 4]}`
	};
}

export function freePairSection(
	factor: 'sun' | 'moon' | 'ascendant',
	first: number,
	second: number
): FreeToolSection {
	const a = sign(first),
		b = sign(second);
	const role = factor === 'sun' ? 'Sol' : factor === 'moon' ? 'Lua' : 'Ascendente';
	const introduction =
		factor === 'moon'
			? `Com a Lua em ${signs[a]}, a pessoa A pode reconhecer cuidado quando há espaço para ${natalStyles[a]!.need}. A Lua em ${signs[b]} da pessoa B destaca a necessidade de ${natalStyles[b]!.need}.`
			: factor === 'sun'
				? `O Sol em ${signs[a]} da pessoa A destaca o desejo de ${natalStyles[a]!.aim}. Para a pessoa B, o Sol em ${signs[b]} associa o envolvimento a ${natalStyles[b]!.aim}.`
				: `O Ascendente em ${signs[a]} sugere que a pessoa A pode se aproximar ao ${natalStyles[a]!.entry}. Para a pessoa B, o Ascendente em ${signs[b]} destaca a maneira de ${natalStyles[b]!.entry}.`;
	const sameSign =
		factor === 'moon'
			? `Com a Lua no mesmo signo, as duas pessoas podem reconhecer com facilidade essa forma de pedir amparo. Isso não significa que tenham a mesma disponibilidade para oferecê-lo. Quando ambas precisam receber ao mesmo tempo, o desencontro pode estar no momento da resposta, mesmo que o gesto desejado seja familiar às duas.`
			: factor === 'sun'
				? 'Com o Sol no mesmo signo, pode ser mais fácil reconhecer o que faz a participação do outro parecer significativa. Essa afinidade pode apoiar uma escolha compartilhada; também pode concentrar expectativas no mesmo lugar, quando os dois querem conduzir, preservar ou transformar algo ao mesmo tempo.'
				: 'Com o Ascendente no mesmo signo, a maneira de começar pode parecer familiar às duas pessoas. Isso pode facilitar os primeiros passos e também reproduzir a mesma hesitação ou pressa. A continuidade do vínculo depende de outros fatores além dessa entrada semelhante.';
	const interaction = a === b ? sameSign : pairElementMeaning(factor, a, b);
	const scope = `Esta comparação considera ${factor === 'moon' ? 'a' : 'o'} ${role} por signo nas duas pessoas; não calcula aspectos entre os mapas nem mede a qualidade ou o futuro da relação.`;
	return {
		id: factor,
		title:
			factor === 'moon'
				? 'Como o cuidado chega a cada um'
				: factor === 'sun'
					? 'Duas maneiras de se envolver'
					: 'O ritmo da aproximação',
		body: `${introduction}\n\n${interaction}\n\n${scope}`
	};
}

export function freeCareerSections(mc: number): FreeToolSection[] {
	const index = sign(mc),
		meaning = signMeanings[index]!;
	return [
		{
			id: 'contribution',
			title: 'O tipo de contribuição que pode ganhar reconhecimento',
			body: `O Meio do Céu em ${signs[index]} destaca a possibilidade de ${meaning.contribution}. Mais do que indicar um cargo, esse símbolo descreve a maneira pela qual seu trabalho pode se tornar reconhecível: ${meaning.motivation}. Uma mesma profissão pode dar muito ou pouco espaço para isso, dependendo das tarefas e da autonomia que oferece.\n\n${movement[index]}`
		},
		{
			id: 'environment',
			title: 'Quando o ambiente favorece ou dificulta essa contribuição',
			body: `Um contexto com ${meaning.environment} tende a dar lugar a essa contribuição. O ponto de tensão é ${meaning.cost}: uma qualidade pode perder utilidade quando passa a responder a toda situação do mesmo modo. Por isso, a leitura não determina uma profissão; ela distingue as condições em que essa maneira de trabalhar pode se desenvolver das condições que a tornam desgastante.\n\nNa prática, a diferença pode aparecer entre receber uma tarefa com espaço para ${meaning.method} e ter de entregar o mesmo resultado sem essa margem. O sentido profissional depende também de competências, oportunidades e escolhas que este fator isolado não descreve.`
		}
	];
}

export function freeMoneySections(
	cusp: number,
	rulerName: string,
	rulerLongitude: number
): FreeToolSection[] {
	const a = sign(cusp),
		r = sign(rulerLongitude);
	return [
		{
			id: 'values',
			title: 'O que faz um recurso parecer valioso',
			body: `A Casa 2 em ${signs[a]} associa a construção de segurança a ${resourceValues[a]}. Aqui, recursos incluem tempo, habilidades e aquilo de que você pode dispor. O valor não está apenas na quantidade acumulada, mas no que esses meios permitem sustentar.\n\nEsse modo de construir segurança pode influenciar tanto o que merece seu esforço quanto aquilo de que custa abrir mão. Uma capacidade útil deixa de ajudar quando vira a única maneira aceitável de se sentir seguro.`
		},
		{
			id: 'attention',
			title: 'Como você coloca esse valor em circulação',
			body: `${rulerName}, regente moderno dessa Casa 2, está em ${signs[r]}. A combinação acrescenta um modo de agir: ${natalStyles[r]!.action}. O desejo de ${resourceValues[a]} ganha, assim, um caminho específico de realização.\n\n${resourceContinuity[a % 4]![r % 4]} Esta é uma leitura sobre a relação simbólica com recursos; não estima sua situação financeira nem recomenda uma decisão de investimento.`
		}
	];
}
