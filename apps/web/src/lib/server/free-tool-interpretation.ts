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
export const FREE_INTERPRETATION_VERSION = 'atv-public-interpretation/2.1.0';
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

const careerMovement = [
	'Começar uma tarefa que ainda não tem um caminho pronto pode dar sentido ao trabalho. Quando cada dificuldade abre uma nova frente, porém, a iniciativa perde o resultado que permitiria reconhecer seu valor. Um começo ganha força quando também encontra uma maneira de chegar à entrega.',
	'A qualidade aparece naquilo que você consegue tornar confiável: uma entrega que mantém o padrão, um processo que funciona de novo. O risco é que conservar o que já deu certo ocupe o lugar de perceber uma necessidade nova. A experiência acumulada continua útil quando pode ser revista.',
	'Uma informação ganha valor quando você a faz circular entre pessoas ou assuntos que ainda não se encontravam. A variedade alimenta esse trabalho; alternar de assunto antes de concluir a explicação pode deixar a equipe com muitas possibilidades e pouca clareza sobre o próximo passo.',
	'Conhecer as pessoas e a história de uma situação pode mudar a qualidade da sua resposta profissional. Essa atenção cria confiança, mas pode transformar o trabalho em disponibilidade permanente. O vínculo fica mais sustentável quando as responsabilidades são combinadas, em vez de presumidas.',
	'Uma proposta ganha força quando carrega uma escolha sua e pode ser apresentada com convicção. O retorno sobre essa entrega também pode tocar o desejo de reconhecimento. Separar a revisão do trabalho do valor pessoal de quem o criou permite aperfeiçoar a proposta sem apagar sua autoria.',
	'Localizar onde uma tarefa emperra e tornar sua execução mais precisa pode ser uma contribuição importante. O mesmo olhar que encontra a falha pode adiar uma entrega que já ajudaria alguém. O critério de qualidade precisa incluir a utilidade de terminar, além da possibilidade de corrigir.',
	'Aproximar interesses diferentes pode tornar uma decisão viável. Quando toda preferência precisa agradar a todos, porém, a negociação perde uma posição clara com a qual trabalhar. Um acordo se fortalece quando o que você considera justo também pode ser dito.',
	'Permanecer diante de um problema que outras pessoas evitam pode revelar o que realmente precisa mudar. Essa profundidade ajuda a atravessar crises; tentar controlar cada informação pode dificultar a colaboração necessária para resolvê-las. Compartilhar responsabilidade faz parte de uma mudança que possa continuar.',
	'Compreender para que um trabalho serve pode dar energia para aprender, ensinar ou abrir um caminho novo. Uma promessa muito ampla, porém, pode esconder as etapas que a tornariam realizável. A visão ganha credibilidade quando consegue explicar tanto a direção quanto o esforço do percurso.',
	'Assumir compromissos e acompanhar suas etapas pode tornar seu trabalho uma referência de confiança. Quando toda tarefa depende de você, a responsabilidade também pode impedir descanso e renovação. Uma estrutura consistente permite continuidade sem exigir presença permanente de uma única pessoa.',
	'Questionar um costume pode revelar uma solução que a equipe ainda não considerou. A diferença precisa encontrar um modo de funcionar para as pessoas que vão utilizá-la. Explicar, adaptar e construir adesão dão consequência à ideia, sem exigir que ela perca o que tem de novo.',
	'Perceber o clima de uma situação ou imaginar uma forma diferente de expressá-la pode orientar um trabalho de criação e cuidado. A abertura perde força quando as demandas ficam sem contorno. Combinar o que será entregue ajuda a transformar sensibilidade em algo que outra pessoa possa receber.'
];

const resourceExperience = [
	'Ter uma margem para começar algo por conta própria pode valer tanto quanto acumular. O impulso de conquistar autonomia também pode apressar um compromisso antes de conhecer o esforço que ele vai exigir depois.',
	'Um objeto bem cuidado, uma habilidade praticada ou uma reserva disponível podem transmitir confiança porque continuam servindo. Conservar algo só por já ser seu pode, porém, consumir o tempo e o espaço que dariam lugar a uma necessidade atual.',
	'Saber onde buscar uma informação ou com quem conversar pode parecer tão valioso quanto ter tudo à mão. Essa variedade abre saídas, mas distribuir tempo entre muitas possibilidades pode impedir que uma delas se torne uma capacidade em que você possa confiar.',
	'O que permite cuidar de si e de quem está perto pode ganhar um peso especial. O cuidado perde sustentação quando toda necessidade alheia vira um compromisso seu; manter meios para a própria vida também preserva a possibilidade de ajudar.',
	'Usar tempo e habilidades em algo que carrega sua marca pode tornar o esforço significativo. O desejo de expressar valor perde espaço quando a necessidade de reconhecimento passa a decidir o que merece ser mantido.',
	'Aprender a fazer algo com precisão pode oferecer uma segurança que a quantidade, sozinha, não oferece. Quando a habilidade só parece valer se for perfeita ou estiver sempre disponível aos outros, o recurso que ajuda também pode se tornar uma exigência constante.',
	'Um acordo parece mais seguro quando você consegue reconhecer justiça na troca. Preservar a harmonia sem dizer quanto tempo ou esforço está oferecendo pode deixar essa conta invisível; a reciprocidade precisa de termos que as duas pessoas conheçam.',
	'Ter margem de escolha pode importar tanto quanto a quantidade disponível. Ao compartilhar recursos, a confiança passa por entender o que fica sob sua responsabilidade e o que pertence ao acordo; tentar eliminar toda dependência também pode tornar difícil receber apoio.',
	'Um curso, uma viagem ou uma experiência nova podem representar uma ampliação do que você consegue fazer. O entusiasmo por essa abertura pode comprometer meios de que a continuidade do caminho ainda vai precisar.',
	'O valor pode aparecer naquilo que permite cumprir um compromisso e construir aos poucos. Quando qualquer gasto de tempo precisa provar um retorno futuro, até o descanso pode parecer desperdício; sustentar a vida inclui poder usufruir de parte do que foi construído.',
	'Um recurso pode valer pela liberdade que oferece para experimentar outro caminho. Buscar sempre uma possibilidade mais nova pode deixar sem uso uma capacidade já disponível; a autonomia cresce também quando uma ideia encontra meios concretos para continuar.',
	'A criação, o cuidado ou uma experiência com sentido podem tornar o esforço valioso. A disposição de oferecer tempo e habilidades precisa de contornos: quando toda necessidade parece igualmente urgente, fica difícil manter os meios que tornam essa contribuição possível.'
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
			? `Com o Sol em ${signs[index]}, ${style.aim} pode dar sentido às suas escolhas. O interesse cresce quando há espaço para esse desejo no que você faz.`
			: body === 'moon'
				? `Com a Lua em ${signs[index]}, ${style.need} pode ser importante para você relaxar. Em momentos de cansaço ou insegurança, a falta desse amparo pode pesar mais do que parecia.`
				: `Com o Ascendente em ${signs[index]}, ${style.entry} pode ser sua maneira de lidar com uma situação nova.`;
	const development =
		body === 'moon'
			? moonMovement[index]
			: body === 'ascendant'
				? arrivalMovement[index]
				: movement[index];
	return {
		id: body,
		title: `${name} em ${signs[index]}`,
		body: body === 'ascendant' ? development! : `${first}\n\n${development}`
	};
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
		body: `Com o Sol em ${signs[a]} e a Lua em ${signs[b]}, o desejo de ${natalStyles[a]!.aim} convive com a necessidade de ${natalStyles[b]!.need}.\n\n${elementBridges[a % 4]![b % 4]}`
	};
}

export function freeRulerSection(
	asc: number,
	rulerName: string,
	rulerLongitude: number
): FreeToolSection {
	const a = sign(asc),
		r = sign(rulerLongitude),
		action = natalStyles[r]!.action;
	return {
		id: 'ruler',
		title: 'O primeiro impulso ganha uma maneira de continuar',
		body: `O regente do seu Ascendente em ${signs[a]}, ${rulerName}, está em ${signs[r]}. ${action.charAt(0).toUpperCase() + action.slice(1)} pode ser um modo de levar adiante aquilo que chamou sua atenção no primeiro contato.\n\n${rulerContinuity[a % 4]![r % 4]}`
	};
}

export function freePairSection(
	factor: 'sun' | 'moon' | 'ascendant',
	first: number,
	second: number
): FreeToolSection {
	const a = sign(first),
		b = sign(second);
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
	return {
		id: factor,
		title:
			factor === 'moon'
				? 'Como o cuidado chega a cada um'
				: factor === 'sun'
					? 'Duas maneiras de se envolver'
					: 'O ritmo da aproximação',
		body: `${introduction}\n\n${interaction}`
	};
}

export function freeCareerSections(mc: number): FreeToolSection[] {
	const index = sign(mc),
		meaning = signMeanings[index]!;
	return [
		{
			id: 'contribution',
			title: 'O tipo de contribuição que pode ganhar reconhecimento',
			body: `Com o Meio do Céu em ${signs[index]}, seu trabalho pode ganhar reconhecimento ao ${meaning.contribution}. O envolvimento cresce com a possibilidade de ${meaning.motivation}.\n\n${careerMovement[index]}`
		},
		{
			id: 'environment',
			title: 'Quando o ambiente favorece ou dificulta essa contribuição',
			body: `Um ambiente com ${meaning.environment} oferece espaço para essa maneira de trabalhar. A dificuldade pode aparecer ao ${meaning.cost}.\n\nNo cotidiano, ter espaço para ${meaning.method} permite usar essa qualidade. Vale por isso considerar as tarefas e a autonomia que uma oportunidade oferece: o mesmo cargo pode permitir essa contribuição em uma equipe e deixá-la sem lugar em outra.`
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
			body: `Com a Casa 2 em ${signs[a]}, construir segurança passa pelo desejo de ${resourceValues[a]}. Isso envolve o uso do seu tempo, das suas habilidades e daquilo que você tem disponível.\n\n${resourceExperience[a]}`
		},
		{
			id: 'attention',
			title: 'Como você coloca esse valor em circulação',
			body: `${rulerName} rege essa Casa 2 na abordagem moderna adotada aqui e está em ${signs[r]}. Para buscar o que lhe dá segurança, aparece a disposição de ${natalStyles[r]!.action}. Ela muda o modo de sustentar aquele desejo de ${resourceValues[a]}.\n\n${resourceContinuity[a % 4]![r % 4]}`
		}
	];
}
