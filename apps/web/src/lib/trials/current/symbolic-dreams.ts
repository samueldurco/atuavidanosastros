import {
	prepareDreamAtlasFacts,
	type CalculationSnapshot,
	type DreamAtlasFactSource,
	type WorkflowInput
} from '@atv/domain';
import { composeDreamInterpretation } from '../dream-interpretation';
import { composeDreamAtlas } from '../dream-atlas-reading';
import { SYMBOLIC_CURRENT_VERSION, type CurrentSymbolicReading } from './symbolic';

type Dream = { narrative: string; emotions: string[]; associations: string[] };
type Action = 'blocked' | 'approach' | 'pause' | 'leave' | 'search' | 'recognize' | 'contact';
type Scene = { text: string; action: Action };
const normal = (value: string) =>
	value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLocaleLowerCase('pt-BR')
		.trim();
const quote = (text: string) => `“${text}”`;
const listed = (values: string[]) => values.map(quote).join(', ');
const date = (value: string) => value.split('-').reverse().join('/');
const distinct = <T extends string>(values: T[]): T[] => [...new Set(values)];
const shared = (a: string[], b: string[]) =>
	a.filter((x) => b.some((y) => normal(x) === normal(y)));

// Only explicitly narrated first-person actions are eligible. No object acquires
// a universal meaning, and quoted dialogue/negation cannot become an action.
const actions: [Action, RegExp][] = [
	[
		'blocked',
		/\b(?:nao consegui|nao conseguia|nao pude|nao podia|fiquei pres[oa]|estava pres[oa]|tentei.{0,55}mas nao)\b/
	],
	['search', /\b(?:procurei|procurava|busquei|buscava|estava procurando)\b/],
	['recognize', /\b(?:reconheci|reconhecia|percebi|encontrei)\b/],
	['pause', /\b(?:parei|esperei|esperava|me sentei|sentei|decidi esperar|fiquei em silencio)\b/],
	['leave', /\b(?:sai|me afastei|fugi|fugia|fui embora|me despedi)\b/],
	['contact', /\b(?:conversei|conversava|abracei|abracava|pedi ajuda|chamei|escutei)\b/],
	['approach', /\b(?:entrei|entrava|atravessei|atravessava|me aproximei|cheguei|abri)\b/]
];
function scenes(dream: Dream): Scene[] {
	return dream.narrative
		.split(/(?<=[.!?;])\s+|\s+(?=depois\b|então\b|em seguida\b|por fim\b|até que\b)/iu)
		.flatMap((text) => {
			text = text.normalize('NFC').trim();
			const normalized = normal(text);
			if (/[“”"«»]/u.test(text)) return [];
			const found = actions
				.flatMap(([action, pattern]) =>
					[...normalized.matchAll(new RegExp(pattern.source, 'gu'))].flatMap((match) => {
						const before = normalized.slice(0, match.index),
							spoken = text.slice(match.index, match.index + match[0].length);
						// Imperfect forms can have first or third person: require an explicit
						// nearby subject, rather than making another dream character the reader.
						const explicitSelf = /\beu\s+(?:(?:nao|ainda|ja|tambem|so|sempre)\s+){0,3}$/.test(
							before
						);
						if (/(?:ava|avia|ia|podia|conseguia|estava)(?:\s|$)/.test(match[0]) && !explicitSelf)
							return [];
						if (match[0] === 'sai' && spoken !== 'saí' && !explicitSelf) return [];
						const localBefore = before.split(/\b(?:mas|porem|contudo|entretanto)\b/u).at(-1)!;
						if (
							action !== 'blocked' &&
							/\b(?:nao|nunca|nem|se|talvez|poderia|queria)\s+(?:eu\s+)?(?:\w+\s+){0,2}$/.test(
								localBefore
							)
						)
							return [];
						return [{ index: match.index, action }];
					})
				)
				.sort((a, b) => a.index - b.index);
			return found.map((operation, index) => ({
				action: operation.action,
				text: text
					.slice(index === 0 ? 0 : operation.index, found[index + 1]?.index ?? text.length)
					.replace(/\s+(?:e|mas|então|depois)\s*$/iu, '')
					.trim()
			}));
		});
}
const actionMeaning: Record<Action, string> = {
	blocked: 'querer participar e encontrar um impedimento',
	approach: 'entrar em contato direto com a cena',
	pause: 'interromper o movimento e permanecer por um momento',
	leave: 'mudar a própria distância em relação à cena',
	search: 'seguir uma procura sem ter ainda uma referência suficiente',
	recognize: 'encontrar ou reconhecer uma referência',
	contact: 'buscar uma troca dentro da cena'
};
function relation(first: Scene, last: Scene): string {
	const key = `${first.action}/${last.action}`;
	const pairs: Partial<Record<string, string>> = {
		'blocked/approach':
			'O impedimento e a entrada dão à cena uma diferença decisiva: o que parecia inacessível passa a admitir participação. A leitura se concentra nessa mudança de condição, sem supor que ela represente uma vitória já ocorrida na vida desperta.',
		'blocked/contact':
			'A procura de contato desloca a dificuldade: em vez de depender apenas de conseguir atravessar o impedimento, a cena passa a incluir uma possibilidade de resposta compartilhada. O vínculo aparece como outra forma de participar, sem apagar a dificuldade inicial.',
		'blocked/leave':
			'Impedimento e afastamento colocam um limite no centro da cena. Sair pode interromper uma insistência ou deixar uma vontade sem continuidade; as emoções e associações informadas ajudam a qualificar essa diferença, sem transformar afastamento em fracasso.',
		'search/recognize':
			'A procura e o reconhecimento fazem da referência encontrada o ponto de mudança do relato. O interesse está na diferença entre procurar sem saber onde se apoiar e conseguir reconhecer algo; isso não torna a imagem encontrada uma resposta universal para a sua vida.',
		'search/pause':
			'A procura encontra uma interrupção. A pausa muda a medida da busca: a cena deixa espaço para permanecer sem resolver imediatamente o que falta. Isso pode dar lugar à elaboração, mas não permite concluir que aquilo que era procurado tenha perdido importância.',
		'approach/pause':
			'A aproximação não termina apenas em chegar: o relato também dá lugar a permanecer. Essa combinação sugere uma experiência em que entrar e assimilar têm ritmos diferentes; alcançar a cena não dispensa o tempo de viver o que foi encontrado.',
		'approach/leave':
			'A entrada e o afastamento mostram duas maneiras de regular a proximidade. A leitura está nesse movimento de experimentar uma presença e alterar a distância, sem reduzir a saída a rejeição nem a entrada a desejo de permanecer.',
		'leave/contact':
			'O afastamento e a troca impedem uma leitura de isolamento absoluto. A cena reúne distância e vínculo: separar-se de uma situação pode coexistir com a procura de presença em outra, e essa distinção dá mais precisão ao tema da proximidade.',
		'pause/approach':
			'A pausa e a aproximação apresentam dois tempos de participação. A espera não ocupa todo o relato: existe também um gesto de entrar. A diferença entre esses tempos permite ler a suspensão como parte do movimento, sem concluir que toda demora seja preparação.',
		'contact/leave':
			'O encontro e a saída colocam a duração do vínculo em foco. Há participação, mas também uma mudança de distância; isso permite pensar em contato com limites, em vez de equiparar proximidade a permanência obrigatória.'
	};
	if (pairs[key]) return pairs[key]!;
	if (first.action === last.action)
		return `A mesma maneira de participar reaparece: ${actionMeaning[first.action]}. A repetição dá peso a esse gesto no relato, enquanto os detalhes de cada cena mostram que ele não precisa ter o mesmo efeito em todos os momentos.`;
	return `O relato coloca em relação ${actionMeaning[first.action]} e ${actionMeaning[last.action]}. Esses gestos atribuem posições diferentes a quem sonha: a leitura está na mudança de participação, e não num significado fixo dos objetos ao redor. As emoções e associações abaixo dão a essa diferença seu alcance pessoal.`;
}
function story(dream: Dream) {
	const found = scenes(dream),
		first = found[0],
		last = found.at(-1);
	const turns = found.filter(
		(scene, index) => index === 0 || scene.action !== found[index - 1]!.action
	);
	if (first && last && found.length > 1)
		return {
			claim:
				turns.length > 2 && turns.length <= 4
					? turns
							.slice(1)
							.map((scene, index) => relation(turns[index]!, scene))
							.join(' ')
					: relation(first, last),
			text: `Na abertura desse movimento, você relata ${quote(first.text)}. ${turns.length > 2 && turns.length <= 4 ? `Entre esse gesto e o último, aparece ${listed(turns.slice(1, -1).map((scene) => scene.text))}. ` : ''}Em outro ponto, escreve ${quote(last.text)}. A interpretação reúne esses gestos como aparecem no relato; não pressupõe uma ordem emocional que você não tenha descrito.`,
			signature: turns.map((scene) => scene.action).join('/'),
			first,
			last
		};
	if (first)
		return {
			claim: `O gesto de ${actionMeaning[first.action]} organiza uma parte reconhecível deste sonho. Ele situa quem sonha em relação à cena, permitindo ler uma forma de participação antes de atribuir significado a qualquer imagem.`,
			text: `Essa leitura parte do trecho ${quote(first.text)}. A interpretação se concentra na relação entre essa participação, as emoções e suas associações.`,
			signature: first.action,
			first,
			last
		};
	return {
		claim:
			'Nesta leitura, a experiência ganha contorno pelas imagens relatadas e pelas associações pessoais. O sentido se desenvolve a partir dessas ligações, sem acrescentar à cena uma ação que você não tenha narrado.',
		text: `O sonho foi registrado assim: ${quote(dream.narrative)}. A leitura mantém essa forma do relato e desenvolve abaixo os sentidos pessoais que você informou, sem completar acontecimentos que ficaram em aberto.`,
		signature: 'unclassified',
		first,
		last
	};
}
const feelingSets = {
	interest: ['curiosidade', 'interesse', 'entusiasmo', 'animação'],
	caution: ['medo', 'receio', 'insegurança', 'hesitação', 'preocupação', 'ansiedade'],
	ease: ['calma', 'alívio', 'paz', 'tranquilidade', 'segurança', 'acolhimento'],
	friction: ['raiva', 'irritação', 'frustração', 'indignação'],
	absence: ['tristeza', 'saudade', 'luto', 'melancolia']
};
function emotions(dream: Dream): string {
	const has = (id: keyof typeof feelingSets) =>
		dream.emotions.some((e) => feelingSets[id].some((x) => normal(x) === normal(e)));
	if (!dream.emotions.length)
		return 'Você não nomeou emoções neste registro. A cena ainda pode ser lida por seus acontecimentos e associações; o tom afetivo permanece aberto, sem transformar uma ação de sair em medo ou uma ação de entrar em entusiasmo.';
	const grounding = `Você nomeou ${listed(dream.emotions)}. `;
	if (has('interest') && has('caution'))
		return (
			grounding +
			'Interesse e cautela compõem uma ambivalência: algo pode atrair sem parecer inteiramente confortável. Essa coexistência acrescenta uma tensão à participação narrada; aproximar-se não precisa significar ausência de receio. A lista de emoções não informa qual veio primeiro.'
		);
	if (has('caution') && has('ease'))
		return (
			grounding +
			'Receio e alívio ou calma dão ao relato mais de um tom. A mesma experiência pode conter exigência de proteção e espaço de descanso. Sem uma sequência afetiva explícita, a leitura preserva os dois polos e não inventa uma resolução em que o alívio teria apagado o medo.'
		);
	if (has('absence') && has('interest'))
		return (
			grounding +
			'Saudade ou tristeza convivem com interesse. O que falta não ocupa toda a experiência: há também disponibilidade para se envolver. Essa combinação permite ler vínculo com o que importa sem concluir que a aproximação substitua ou resolva a falta.'
		);
	if (has('friction') && has('interest'))
		return (
			grounding +
			'O atrito não elimina o interesse. Há uma diferença entre algo não importar e algo importar a ponto de produzir frustração; nesta leitura, a participação narrada recebe essa dupla tonalidade, sem atribuir culpa a alguém.'
		);
	if (has('caution'))
		return (
			grounding +
			'A cautela torna relevante o modo como a cena permite ou restringe sua participação. O receio qualifica a experiência narrada; ele não demonstra que a imagem represente um perigo fora do sonho.'
		);
	if (has('ease'))
		return (
			grounding +
			'O tom de calma ou alívio muda o peso dos acontecimentos: permanecer, chegar ou se afastar pode ser vivido sem a urgência de resolver tudo. A leitura conserva essa tonalidade sem confundir descanso no sonho com uma condição permanente da vida.'
		);
	if (has('friction'))
		return (
			grounding +
			'O atrito dá peso à diferença entre o que se queria e o que a cena permitia. Essa emoção ajuda a ler a intensidade do envolvimento, mas não identifica por si só quem teria causado a dificuldade.'
		);
	if (has('absence'))
		return (
			grounding +
			'A tonalidade de falta ou lembrança pode tornar a presença de uma imagem especialmente significativa. O vínculo com aquilo que importa ganha relevo pelas associações pessoais, sem que tristeza ou saudade provem uma perda não relatada.'
		);
	if (has('interest'))
		return (
			grounding +
			'O interesse faz da participação uma aproximação a algo que merece atenção. Ele acrescenta disponibilidade à cena sem garantir conforto ou indicar, por si só, qual escolha fazer fora do sonho.'
		);
	return (
		grounding +
		'Essas palavras qualificam sua experiência sem precisar caber em uma categoria pronta. A interpretação mantém sua formulação ao lado dos acontecimentos, sem deduzir uma emoção diferente a partir do cenário.'
	);
}
function associations(dream: Dream): string {
	if (!dream.associations.length)
		return 'Nenhuma associação pessoal foi informada. Por isso, a leitura se apoia nos acontecimentos e nas emoções descritas; o cenário conserva a possibilidade de ter um significado que este registro ainda não especifica.';
	const action = story(dream).last?.action;
	const movingHome = dream.associations.some((a) =>
		/mudanc.*(?:casa|morad)|(?:casa|morad).*nova/u.test(normal(a))
	);
	const homeMeaning: Partial<Record<Action, string>> = {
		pause:
			'A associação com mudança de casa aproxima essa pausa do tempo de se ambientar: chegar a um lugar e sentir-se instalado nele são momentos diferentes. Permanecer permite conhecer o espaço antes de exigir que ele já seja familiar.',
		approach:
			'Relacionada à mudança de casa que você nomeou, a entrada põe em cena a passagem entre considerar um novo lugar e começar a habitá-lo. O espaço passa a ser conhecido pela participação, e não apenas pela ideia que se fazia dele.',
		leave:
			'Na ligação com mudança de casa que você trouxe, sair dá importância à possibilidade de regular a proximidade com o novo lugar. Ter entrado não significa já se sentir pertencente; a distância pode fazer parte desse tempo de aproximação.',
		search:
			'Ligada à mudança de casa que você nomeou, a procura aproxima a cena da busca por uma referência no meio da transição. A questão passa a ser o que permite orientar-se quando o lugar conhecido já não organiza tudo.',
		blocked:
			'Na associação com mudança de casa que você trouxe, o impedimento dá forma à diferença entre desejar uma passagem e encontrar condições para realizá-la. A cena concentra essa distância, em vez de dizer que falta vontade de mudar.'
	};
	return `Você aproximou o sonho de ${listed(dream.associations)}. ${movingHome && action && homeMeaning[action] ? homeMeaning[action] : action ? `Nessa ligação pessoal, ${actionMeaning[action]} oferece uma maneira de experimentar o assunto: o valor da cena está no gesto que ela permite viver, junto das emoções que você nomeou.` : 'Essas referências participam da cena como lembranças ou situações que têm valor para você. O relato as aproxima sem obrigar que todas expressem a mesma questão.'}`;
}
function integrated(dream: Dream): string {
	const s = story(dream);
	const has = (id: keyof typeof feelingSets) =>
		dream.emotions.some((e) => feelingSets[id].some((x) => normal(x) === normal(e)));
	const action = s.last?.action;
	const meanings: Record<Action, string> = {
		blocked:
			'A vontade encontra uma condição que a impede de se realizar. O centro da cena é a distância entre querer e conseguir; reconhecer essa distância permite dar importância à dificuldade sem confundi-la com falta de desejo.',
		approach:
			'Entrar dá à participação uma forma concreta: algo deixa de ser apenas observado à distância e passa a ser experimentado. A cena põe em jogo a diferença entre imaginar uma possibilidade e estar dentro dela.',
		pause:
			'A permanência introduz tempo dentro da experiência. O sentido desse gesto está em poder estar diante de algo sem precisar transformá-lo imediatamente numa resposta ou num próximo passo.',
		leave:
			'A mudança de distância torna relevante a liberdade de alterar a própria participação. Na cena, ter estado presente não obriga a continuar da mesma maneira; sair muda a relação com aquilo que foi vivido.',
		search:
			'A procura mantém em movimento algo que ainda não encontrou uma referência suficiente. A cena dá lugar ao desejo de encontrar sem fingir que o objeto procurado já trouxe uma resposta.',
		recognize:
			'Encontrar ou reconhecer cria uma referência dentro da cena. Algo passa a poder ser distinguido e recebe atenção própria, o que modifica a experiência de estar apenas diante do desconhecido.',
		contact:
			'A troca acrescenta outra presença à experiência. A possibilidade de falar, ouvir ou pedir aproxima a participação de uma relação: o que acontece já não depende apenas de um movimento solitário.'
	};
	let meaning = action
		? meanings[action]
		: 'As imagens conservam as ligações pessoais que você lhes atribuiu. O valor deste relato está em colocar essas lembranças ou situações lado a lado, permitindo que participem de uma mesma experiência sem exigir que sejam equivalentes.';
	if (s.first && action && s.first.action !== action)
		meaning = `O relato aproxima ${actionMeaning[s.first.action]} de ${actionMeaning[action]}. ${meaning}`;
	if (has('interest') && has('caution'))
		meaning +=
			action === 'leave'
				? 'Com curiosidade ou interesse ao lado do receio, a distância não precisa ser lida como indiferença: algo pode continuar a atrair e ainda exigir cuidado com a proximidade.'
				: action === 'pause'
					? 'Com interesse e receio presentes, permanecer ganha uma nuance: há disponibilidade para conhecer, junto da necessidade de não se precipitar. O tempo de assimilar faz parte dessa aproximação.'
					: 'Com interesse e receio presentes, participar não equivale a sentir-se inteiramente pronto. O sonho reúne atração e necessidade de proteção dentro da mesma experiência.';
	else if (has('caution') && has('ease'))
		meaning +=
			'O receio junto da calma ou do alívio dá espaço tanto à proteção quanto ao descanso. Esses dois tons podem coexistir no relato; nenhum deles precisa apagar o outro para que a experiência tenha sentido.';
	else if (has('caution'))
		meaning +=
			action === 'leave'
				? 'O receio torna essa mudança de distância sensível ao tema da proteção; isso descreve como a saída pode ser vivida, sem provar que existia um perigo real.'
				: 'O receio acrescenta uma necessidade de segurança à participação. A experiência não se resume ao gesto realizado: também importa o cuidado necessário para vivê-lo.';
	else if (has('ease'))
		meaning +=
			action === 'leave'
				? 'A calma ou o alívio tornam possível ler a distância como espaço de descanso, em vez de tratá-la automaticamente como perda.'
				: 'A calma ou o alívio dão a esse gesto um ritmo menos urgente: participar pode incluir disponibilidade para viver a cena sem pressioná-la por uma resolução.';
	else if (has('absence'))
		meaning +=
			'A saudade ou a tristeza mantêm presente o valor de algo que importa. Essa tonalidade dá peso ao vínculo com a cena, sem autorizar uma história de perda que não foi contada.';
	else if (has('friction'))
		meaning +=
			'O atrito dá peso ao que está em jogo: a participação se encontra com uma diferença entre vontade e condição, cuja intensidade não equivale a uma culpa já atribuída.';
	else if (has('interest'))
		meaning +=
			'O interesse dá a esse gesto uma qualidade de descoberta: o que aparece merece envolvimento, mesmo sem oferecer uma resposta pronta.';
	else if (dream.emotions.length)
		meaning += `Você nomeou esse tom como ${listed(dream.emotions)}; essas palavras preservam a maneira particular como a cena foi vivida.`;
	return meaning.replace(/([.!?])(?=[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ])/gu, '$1 ');
}
function compare(previous: Dream, current: Dream): { claim: string; text: string } {
	const before = story(previous),
		after = story(current),
		common = shared(previous.associations, current.associations),
		commonEmotions = shared(previous.emotions, current.emotions);
	const sameEnding = before.last && after.last && before.last.action === after.last.action;
	const claim = common.length
		? `A associação ${listed(common)} retorna, ${sameEnding ? 'junto de uma continuidade no gesto final, embora o caminho até ele tenha diferenças.' : before.last && after.last ? 'mas o gesto final dá outra forma à participação no relato mais recente.' : 'dando continuidade a um campo de interesse entre os dois relatos.'}`
		: commonEmotions.length
			? `O tom de ${listed(commonEmotions)} aproxima os relatos, mesmo sem uma associação pessoal repetida que permita afirmar que tratam da mesma situação.`
			: 'Os relatos apresentam campos pessoais diferentes; sua proximidade no diário permite colocá-los em relação, mas não basta para declarar uma recorrência do mesmo tema.';
	const describe = (s: ReturnType<typeof story>) =>
		s.first
			? `${quote(s.first.text)} coloca em foco ${actionMeaning[s.first.action]}${s.last && s.first !== s.last ? `; o gesto ${quote(s.last.text)} acrescenta ${actionMeaning[s.last.action]}` : ''}`
			: '';
	const gestures =
		before.first && after.first
			? `No relato anterior, ${describe(before)}. No mais recente, ${describe(after)}.`
			: 'Nesta comparação, a ligação desenvolvida permanece nas associações e emoções que foram nomeadas, sem atribuir a um relato os gestos presentes apenas no outro.';
	const priorFeeling = previous.emotions[0];
	const emotionalContrast = priorFeeling
		? before.last?.action === after.last?.action && commonEmotions.includes(priorFeeling)
			? `A continuidade também aparece no tom de ${quote(priorFeeling)} junto do mesmo gesto final. ${feelingAtScene(previous, priorFeeling)} Essa aproximação preserva os outros sentimentos nomeados no sonho atual, em vez de reduzir os dois relatos a uma experiência idêntica.`
			: `No registro anterior, ${feelingAtScene(previous, priorFeeling).replace(/^Com /u, 'com ')} No atual, ${current.emotions.length ? `os tons de ${listed(current.emotions)}` : 'as imagens narradas'} acompanham ${after.last ? actionMeaning[after.last.action] : 'uma cena que não repete necessariamente essa forma de participação'}. O contraste entre os gestos dá outra condição a essa experiência, sem impor uma ordem às emoções que foram listadas.`
		: 'O alcance emocional da repetição fica limitado ao que cada registro nomeou.';
	return {
		claim,
		text: `${gestures} ${linkEndings(previous, current)}\n\n${common.length ? `O retorno de ${listed(common)} sugere que esse campo pessoal reaparece com valor para quem registra. ${emotionalContrast}` : `Associações do anterior: ${previous.associations.length ? listed(previous.associations) : 'não informadas'}. Associações do mais recente: ${current.associations.length ? listed(current.associations) : 'não informadas'}. A leitura preserva essa diferença para não construir uma continuidade apenas porque duas imagens parecem semelhantes.`}`
	};
}

/** Read an explicitly named feeling against the narrated ending. This does not
 * turn the order of a list of feelings into an emotional chronology. */
function feelingAtScene(dream: Dream, feeling: string): string {
	const action = story(dream).last?.action;
	const group = Object.entries(feelingSets).find(([, values]) =>
		values.some((value) => normal(value) === normal(feeling))
	)?.[0];
	const endings: Record<Action, string> = {
		blocked: 'o impedimento conserva uma vontade de participação sem oferecer sua realização',
		approach: 'a entrada põe quem sonha em contato com o que antes estava do outro lado',
		pause:
			'a permanência abre um intervalo em que a cena pode ser vivida sem receber uma resposta imediata',
		leave: 'o afastamento muda a medida da proximidade e permite ler um limite de participação',
		search: 'a procura mantém em aberto uma referência que ainda não foi encontrada',
		recognize: 'a referência encontrada dá um ponto de apoio ao que antes permanecia em procura',
		contact: 'a troca inclui uma possibilidade de resposta que não depende apenas de quem sonha'
	};
	if (!action)
		return `O tom de ${quote(feeling)} qualifica as imagens do registro, sem uma ação explícita que permita concluir como esse sentimento orienta a participação.`;
	const qualification: Record<string, string> = {
		interest:
			'O interesse acrescenta disponibilidade para descobrir o que essa experiência contém; não exige que a descoberta já ofereça uma conclusão.',
		caution:
			'O receio dá peso à exposição envolvida nesse gesto. A cena pode conter participação e cautela ao mesmo tempo, sem que isso comprove perigo fora do sonho.',
		ease: 'A calma ou o alívio permitem ler esse gesto sem pressupor urgência. O espaço de descanso pertence à experiência relatada, sem garantir que alguma dificuldade tenha sido resolvida.',
		friction:
			'A frustração ou a raiva fazem essa mudança de condição importar: o gesto encontra uma diferença entre vontade e possibilidade. Essa intensidade não atribui culpa a uma personagem.',
		absence:
			'A tristeza ou a saudade mantêm em foco o valor de uma presença ou lembrança. O gesto não apaga esse vínculo e tampouco prova uma perda que não foi informada.'
	};
	return `Com ${quote(feeling)}, ${endings[action]}. ${group ? qualification[group] : 'O sentido afetivo permanece na palavra escolhida por você, sem ser substituído por uma emoção presumida.'}`;
}

function linkEndings(previous: Dream, current: Dream): string {
	const before = story(previous),
		after = story(current);
	if (!before.last || !after.last)
		return 'A diferença entre esses registros permanece nas imagens e nas associações relatadas; não há dois gestos explícitos suficientes para atribuir uma mudança na forma de participar.';
	if (before.last.action === after.last.action)
		return `O gesto de ${actionMeaning[after.last.action]} reaparece nos dois finais. A continuidade está nessa forma de participação; ela pode receber imagens e tons diferentes sem se tornar automaticamente a repetição da mesma situação.`;
	const contrasts: Partial<Record<string, string>> = {
		'recognize/leave':
			'O foco passa de encontrar uma referência para regular a distância: ter encontrado algo não se converte automaticamente em permanecer perto dele.',
		'leave/pause':
			'A diferença está entre afastar-se e permanecer por um momento. O segundo final admite um tempo de presença que o primeiro não descrevia; isso acrescenta uma forma de proximidade, sem transformar a saída anterior em erro.',
		'pause/leave':
			'A permanência dá lugar ao afastamento. O contraste distingue um intervalo dentro da experiência de uma mudança na própria distância em relação a ela.',
		'recognize/pause':
			'Encontrar uma referência e permanecer com a cena são movimentos diferentes. O primeiro dá um ponto de apoio à procura; o segundo oferece tempo para viver o que já está presente.',
		'blocked/approach':
			'A passagem entre os finais desloca a questão do impedimento para a participação. O contraste está nas condições narradas de acesso, sem provar uma conquista fora desses relatos.',
		'blocked/pause':
			'O impedimento e a pausa não dizem a mesma coisa: no primeiro falta uma condição de participação; no segundo existe um intervalo de permanência. Confundi-los apagaria a diferença entre não poder continuar e dar tempo à cena.',
		'search/recognize':
			'O que permanecia em procura encontra uma referência no outro registro. Essa diferença dá mais contorno à busca, sem tornar a imagem encontrada uma resposta para todo o período.',
		'approach/leave':
			'A entrada e a saída colocam a proximidade em duas medidas. O conjunto inclui contato e afastamento, em vez de permitir uma conclusão única de adesão ou recusa.',
		'leave/approach':
			'O afastamento e a entrada mostram que a proximidade recebe respostas diferentes. O novo registro inclui contato, sem explicar retrospectivamente por que houve saída no anterior.'
	};
	return (
		contrasts[`${before.last.action}/${after.last.action}`] ??
		`O final anterior põe em foco ${actionMeaning[before.last.action]}; o seguinte, ${actionMeaning[after.last.action]}. Uma resposta não contém necessariamente a outra: são maneiras diferentes de se relacionar com o que cada cena apresenta. A comparação conserva essa diferença, sem criar um acontecimento contínuo entre os dois relatos.`
	);
}

export function composeCurrentDream(
	input: WorkflowInput,
	calculation: CalculationSnapshot
): CurrentSymbolicReading | null {
	if (!['dream-reading', 'dream-dossier', 'dream-atlas'].includes(input.productId)) return null;
	// Existing projections reject altered narratives, emotions, source revisions
	// or consent. Their narrative and previous editorial approval are not reused.
	if (input.productId === 'dream-atlas') composeDreamAtlas(input, calculation);
	else composeDreamInterpretation(input, calculation);
	const sections: CurrentSymbolicReading['sections'] = [],
		conclusions: CurrentSymbolicReading['interpretation']['conclusions'] = [];
	const add = (
		title: string,
		claim: string,
		paragraphs: string[],
		ids: string[],
		relationText: string
	) => {
		const factIds = distinct(ids);
		if (factIds.some((id) => !calculation.facts.some((f) => f.id === id)))
			throw new Error('Fonte de sonho ausente.');
		conclusions.push({ section: sections.length, claim, factIds, relation: relationText });
		sections.push({ title, text: [claim, ...paragraphs].join('\n\n'), factIds });
	};
	if (input.productId === 'dream-atlas') {
		const entries = calculation.data.entries as unknown as DreamAtlasFactSource[];
		const atlas = prepareDreamAtlasFacts(input.dreamAtlas!.startDate, entries)!;
		const id = (entry: DreamAtlasFactSource) => `entry-${entry.id}`;
		const ordered = [...entries].sort(
			(a, b) => a.dreamDate.localeCompare(b.dreamDate) || a.id.localeCompare(b.id)
		);
		const days = new Set(entries.map((e) => e.dreamDate)).size;
		add(
			'A continuidade que seu diário permite enxergar',
			`${entries.length} relatos em ${days} dias dão a este atlas uma continuidade feita de registros, com intervalos que permanecem abertos.`,
			[
				`O período vai de ${date(atlas.period.startDate)} a ${date(atlas.period.endDate)}. Os ${30 - days} dias sem relatos incluídos não demonstram ausência de sonhos nem recebem um significado emocional. A leitura reúne o que foi autorizado e encontra recorrências nas suas palavras pessoais.`
			],
			[
				'atlas-period',
				'atlas-count',
				...calculation.facts.filter((f) => f.id.startsWith('atlas-window-')).map((f) => f.id)
			],
			'Quantidade e distribuição temporal delimitam o conjunto interpretável; lacunas não são estados emocionais.'
		);
		for (const [i, recurrence] of atlas.recurrences.slice(0, 8).entries()) {
			const related = ordered.filter((e) => recurrence.entryIds.includes(e.id));
			const personal = recurrence.source === 'personal-association';
			add(
				personal
					? `A ligação que retorna: ${recurrence.label}`
					: `Um tom que reaparece: ${recurrence.label}`,
				`${quote(recurrence.label)} aparece em ${related.length} relatos, ${personal ? 'como um campo pessoal que recebe uma forma própria em cada cena.' : 'como um tom que acompanha cenas próprias, sem dar a todas elas o mesmo sentido.'}`,
				[
					...related.map((entry) => {
						const scene = story(entry);
						return personal
							? `Em ${date(entry.dreamDate)}: ${scene.claim} ${scene.text} Ao ligar essa cena a ${quote(recurrence.label)}, você dá a esse campo pessoal a forma de ${scene.last ? actionMeaning[scene.last.action] : 'conviver com as imagens relatadas sem uma ação explícita de resolução'}.`
							: `Em ${date(entry.dreamDate)}, ${scene.last ? `o gesto ${quote(scene.last.text)} participa desse tom. ` : ''}${feelingAtScene(entry, recurrence.label)}`;
					}),
					personal
						? 'A recorrência não fica restrita à presença da mesma palavra. Cada cena lhe dá uma experiência própria: a associação continua disponível, enquanto a participação pode mudar de forma.'
						: 'Reencontrar uma emoção não obriga a reencontrar a mesma situação. Seu papel aparece na maneira como acompanha cada gesto, e a repetição do tom não estabelece uma ordem emocional entre os acontecimentos.'
				],
				[`recurrence-${i}`, ...related.map(id)],
				`Recorrência literal de ${recurrence.source}; cada relato relacionado recebe interpretação da cena ou da emoção no gesto explícito. Frequência não implica significado uniforme.`
			);
		}
		if (!atlas.recurrences.length)
			add(
				'O que permanece diferente',
				'As associações e emoções nomeadas não repetem a mesma expressão entre os registros; a leitura encontra diferenças de cena sem impor um tema único ao mês.',
				[ordered.length > 1 ? compare(ordered[0]!, ordered.at(-1)!).text : integrated(ordered[0]!)],
				ordered.map(id),
				'Ausência de repetição literal impede afirmar recorrência; diferenças pessoais e narrativas são preservadas.'
			);
		const first = ordered[0]!;
		if (ordered.length > 1) {
			const endings = ordered.map((entry) => story(entry).last?.action).filter(Boolean);
			const varied = new Set(endings).size > 1;
			add(
				'Como uma cena desloca a anterior',
				varied
					? 'Os finais dos registros oferecem mais de uma forma de participação; acompanhá-los em sequência permite perceber o que cada cena acrescenta à anterior.'
					: 'A sequência dos registros permite comparar o que cada final mantém, sem transformar a ordem das datas numa história obrigatória de progresso.',
				[
					...ordered
						.slice(1)
						.map(
							(entry, index) =>
								`De ${date(ordered[index]!.dreamDate)} a ${date(entry.dreamDate)}: ${linkEndings(ordered[index]!, entry)}`
						),
					'A diferença entre as cenas não comprova uma evolução linear da pessoa entre as datas. Ela torna visíveis possibilidades de participação que coexistem neste período, sem preencher os dias que ficaram sem registro.'
				],
				ordered.map(id),
				'Contraste dos finais narrados em cada par cronológico adjacente; não generaliza trajetória psicológica para o mês.'
			);
		}
		const endings = distinct(
			ordered
				.map((entry) => story(entry).last?.action)
				.filter((action): action is Action => Boolean(action))
		);
		const closing =
			endings.length > 1
				? `O período reúne ${endings.map((action) => actionMeaning[action]).join('; ')}. Esses gestos não são etapas obrigatórias de uma única resposta. ${endings.includes('leave') && endings.includes('pause') ? 'A presença de saída e de pausa torna especialmente clara a diferença entre precisar de distância e poder permanecer sem resolver imediatamente. Ambas regulam a proximidade, mas oferecem espaços diferentes à experiência.' : endings.includes('search') && endings.includes('recognize') ? 'A procura e o reconhecimento coexistem no conjunto: encontrar uma referência em uma cena não elimina a abertura que a outra mantém. O diário permite conservar tanto o desejo de encontrar quanto o valor do que já ganhou contorno.' : 'A pluralidade das respostas impede reduzir o conjunto a um traço único: a relação com cada cena depende da condição que ela apresenta e do tom com que foi vivida.'}`
				: endings.length === 1
					? `O gesto de ${actionMeaning[endings[0]!]} volta a organizar os finais disponíveis. Essa constância concentra o interesse nessa forma de participação, enquanto as imagens e emoções de cada registro mostram que ela pode ser vivida de maneiras diferentes.`
					: 'O conjunto mantém sua continuidade nas imagens, nas associações e nas emoções declaradas. Sem gestos explícitos suficientes, sua contribuição é preservar esses vínculos pessoais sem lhes atribuir uma trajetória de ação.';
		add(
			'O desenho do conjunto',
			atlas.recurrences.length
				? `O conjunto ganha continuidade por ${listed(atlas.recurrences.slice(0, 3).map((r) => r.label))}, enquanto as ações e associações de cada relato impedem tratar essa repetição como uma mensagem sempre igual.`
				: 'Este conjunto se apresenta como uma diversidade de experiências, com mais diferenças pessoais registradas do que repetições explícitas.',
			[
				ordered.length === 1 ? integrated(first) : closing,
				atlas.recurrences.length
					? 'A repetição dá continuidade ao interesse; as diferenças mostram que esse interesse admite respostas variadas. O diário conserva essa complexidade: uma ligação pessoal pode continuar importante sem exigir sempre a mesma maneira de se aproximar dela.'
					: 'A ausência de uma expressão repetida também tem valor para a leitura: permite conservar experiências diferentes, sem reunir à força as cenas sob uma única explicação.'
			],
			['atlas-period', 'atlas-count', ...ordered.map(id)],
			'Síntese das recorrências literais e do conjunto de gestos finais de todos os relatos; não repete a comparação das extremidades nem inventa evolução ou causa.'
		);
	} else {
		const dream = input.dream!,
			s = story(dream);
		const narrativeIds = calculation.facts
			.filter((f) => f.id.startsWith('dream-narrative-'))
			.map((f) => f.id);
		const emotionIds = calculation.facts
			.filter((f) => f.id.startsWith('dream-emotion-'))
			.map((f) => f.id);
		const associationIds = calculation.facts
			.filter((f) => f.id.startsWith('dream-association-'))
			.map((f) => f.id);
		const currentIds = [...narrativeIds, ...emotionIds, ...associationIds, 'dream-date'];
		add(
			'O movimento que dá forma à cena',
			s.claim,
			[s.text],
			narrativeIds,
			`Gestos explícitos ${s.signature}; interpretação da relação entre ações, sem converter objetos em significados universais.`
		);
		add(
			'Como essa cena é vivida',
			emotions(dream),
			[associations(dream)],
			[...narrativeIds, ...emotionIds, ...associationIds],
			'Tom afetivo declarado modifica a participação narrada; associações são ligações pessoais e não equivalências universais.'
		);
		add(
			'O sentido que esta leitura reúne',
			integrated(dream),
			input.context
				? [
						`Você situou o sonho neste contexto: ${quote(input.context)}. É junto desse assunto que o contraste entre os gestos e as emoções ganha uma referência pessoal.`
					]
				: [],
			[...currentIds, ...(input.context ? ['dream-context'] : [])],
			'Síntese relaciona acontecimentos, emoções e associações; contexto informado delimita aplicação sem inventar causalidade.'
		);
		if (input.productId === 'dream-dossier') {
			const entries = calculation.data.entries as unknown as DreamAtlasFactSource[];
			for (const previous of entries) {
				const comparison = compare(previous, dream);
				add(
					`O sonho atual em diálogo com ${date(previous.dreamDate)}`,
					comparison.claim,
					[comparison.text],
					[...currentIds, `history-${previous.id}`],
					'Comparação de relato autorizado anterior com atual: repetição pessoal, gestos explícitos e mudanças do tom declarado.'
				);
			}
		}
	}
	const atlas = input.productId === 'dream-atlas';
	return {
		version: SYMBOLIC_CURRENT_VERSION,
		productId: input.productId,
		title: atlas
			? 'Atlas dos Sonhos'
			: input.productId === 'dream-dossier'
				? 'Dossiê dos Sonhos'
				: 'A leitura do seu sonho',
		opening: atlas
			? 'Este atlas reúne os relatos que você autorizou para mostrar o que retorna nas suas associações, como cada cena dá outra forma a esse retorno e onde o conjunto permanece diverso.'
			: `O sonho de ${date(input.dream!.date)} será lido pela maneira como a cena acontece, pelas emoções nomeadas e pelas ligações pessoais que você trouxe. ${input.productId === 'dream-dossier' ? 'Os relatos anteriores autorizados acrescentam contraste ao sonho atual.' : 'O significado nasce dessas relações, sem um dicionário fixo de símbolos.'}`,
		source:
			'Relatos, emoções e associações pessoais informados; comparação restrita às fontes autorizadas e às suas revisões. Leitura narrativa original ATVNA.',
		sections,
		questions: [
			atlas
				? 'Qual contraste deste conjunto você gostaria de desenvolver numa próxima anotação?'
				: 'Que passagem desta leitura mais se aproxima da maneira como você viveu o sonho?'
		],
		practice:
			'Se desejar continuar o diário, registre uma nova cena e suas associações com suas próprias palavras. A nova anotação pode acrescentar ou contrariar sentidos desta leitura.',
		limits: [
			'Esta é uma interpretação simbólica do material informado; sonhos não comprovam acontecimentos, diagnósticos, intenções de terceiros ou fatos futuros.'
		],
		interpretation: {
			version: 'atv-interpretation-evidence/1',
			family: input.productId,
			conclusions
		}
	};
}
