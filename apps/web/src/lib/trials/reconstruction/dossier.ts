import type { BirthInput, CalculationSnapshot, WorkflowInput } from '@atv/domain';
import type { TrialReading } from '../reading';
import { bodyNames, CANON_VERSION, functions, signs } from './canon';
import { RECONSTRUCTION_VERSION } from './career';
import { aspectNames } from './date-facts';
import { assertDossierProjection, dossierSynastryInput } from './dossier-facts';
import { normalizeFactGraph } from './fact-graph';
import { composeReconstructedSynastry } from './synastry';
import { projectSynastry } from './synastry-facts';
import type { CrossAspectCalculation } from '@atv/astrology';

type Focus = {
	key: string;
	title: string;
	bodies: string[];
	answer: string;
	action: string;
	criterion: string;
};
const focuses: Record<string, Focus> = {
	distance: {
		key: 'distance',
		title: 'Presença à distância',
		bodies: ['moon', 'mercury'],
		answer:
			'transformar a ideia de presença em um gesto reconhecível para cada pessoa, com uma alternativa para os dias em que o contato habitual não for possível',
		action:
			'Cada pessoa escolhe um sinal de presença e diz de quanto contato precisa. Combinem uma frequência possível, um modo de avisar indisponibilidade e uma data para rever a experiência.',
		criterion:
			'O contato foi reconhecido como cuidado por ambos, sem exigir disponibilidade permanente?'
	},
	communication: {
		key: 'communication',
		title: 'Conversa e reparação',
		bodies: ['mercury', 'mars'],
		answer:
			'reduzir o tamanho da conversa: partir de um episódio observável, separar o que aconteceu do que foi interpretado e fazer um pedido que possa receber uma resposta',
		action:
			'Escolham um único desencontro recente. Uma pessoa descreve o que ouviu, a outra confirma ou corrige, e só depois vocês discutem o pedido. Se o tom subir, uma pausa precisa de um retorno combinado.',
		criterion:
			'Cada pessoa conseguiu explicar o pedido da outra sem transformar a conversa em disputa?'
	},
	money: {
		key: 'money',
		title: 'Recursos e responsabilidades',
		bodies: ['venus', 'saturn'],
		answer:
			'tornar visíveis os valores e as responsabilidades envolvidos antes de negociar uma divisão; um compromisso justo precisa considerar o que cada pessoa pode e aceita assumir',
		action:
			'Escrevam quais despesas ou tarefas estão em discussão, quem as assume hoje e qual mudança seria possível. Escolham uma divisão provisória e um momento de revisão; o mapa não define valores, renda ou obrigações.',
		criterion: 'A divisão ficou compreensível e pôde ser contestada sem cobrança afetiva?'
	},
	intimacy: {
		key: 'intimacy',
		title: 'Afeto e intimidade',
		bodies: ['venus', 'mars'],
		answer:
			'distinguir demonstração de carinho, desejo e disponibilidade. A aproximação só se torna um caminho para o casal quando cada pessoa pode expressar preferências, limites e recusa',
		action:
			'Cada pessoa nomeia uma forma de carinho que deseja, uma que não deseja e uma maneira confortável de comunicar mudança de vontade. Comecem pelo que foi livremente aceito, sem metas de frequência.',
		criterion: 'Houve espaço para desejar, recusar ou mudar de ideia sem pressão?'
	},
	trust: {
		key: 'trust',
		title: 'Confiança e clareza',
		bodies: ['moon', 'saturn'],
		answer:
			'pedir clareza sobre um comportamento concreto e avaliar a resposta ao longo da experiência. Nenhuma configuração confirma lealdade, traição ou sentimentos ocultos',
		action:
			'Distingam uma observação verificável de uma suspeita. Façam uma pergunta direta sobre o que precisam esclarecer e definam o limite que cada pessoa deseja preservar; acesso a contas ou mensagens não é exigido pela leitura.',
		criterion: 'A conversa trouxe informação e respeito aos limites, em vez de ampliar vigilância?'
	},
	space: {
		key: 'space',
		title: 'Espaço individual',
		bodies: ['sun', 'uranus'],
		answer:
			'dar um nome e um contorno ao espaço individual, para que autonomia e vínculo possam ser negociados como necessidades diferentes',
		action:
			'Cada pessoa escolhe uma atividade ou tempo próprio que quer preservar. Digam como esse espaço será comunicado e qual gesto de reconexão faz sentido depois, sem impor o mesmo ritmo às duas pessoas.',
		criterion:
			'Foi possível preservar a escolha individual e reconhecer o vínculo sem pedir prova de amor?'
	},
	commitment: {
		key: 'commitment',
		title: 'Compromisso possível',
		bodies: ['sun', 'saturn'],
		answer:
			'traduzir expectativas de futuro em uma responsabilidade presente que cada pessoa esteja disposta a assumir. A leitura não prevê casamento, permanência ou uma decisão da outra pessoa',
		action:
			'Cada pessoa diz o que pode oferecer agora, o que ainda não sabe e o que não deseja prometer. Escolham um próximo passo pequeno que não dependa de uma certeza que vocês ainda não têm.',
		criterion:
			'O compromisso assumido correspondeu à disponibilidade declarada, sem promessa extraída por pressão?'
	},
	children: {
		key: 'children',
		title: 'Projeto de família',
		bodies: ['moon', 'jupiter'],
		answer:
			'separar o desejo de cada pessoa das condições e responsabilidades de um projeto de família. O mapa não prevê gravidez nem indica a escolha correta para vocês',
		action:
			'Conversem separadamente sobre desejo, cuidados, tempo e apoio. Reúnam as respostas e identifiquem o ponto em que há acordo, dúvida ou diferença que ainda precisa de conversa; não transformem a experiência em uma obrigação de decidir.',
		criterion: 'As duas posições foram ouvidas, inclusive uma dúvida ou uma recusa?'
	},
	household: {
		key: 'household',
		title: 'Convivência cotidiana',
		bodies: ['moon', 'saturn'],
		answer:
			'examinar como cuidado e responsabilidade aparecem na rotina, porque a convivência depende de tarefas e limites que possam ser vistos e revistos',
		action:
			'Façam um retrato de uma semana comum: tarefas, descanso e tempo juntos. Escolham uma responsabilidade que hoje está pouco clara, definam quem fará o quê e marquem quando vão avaliar a divisão.',
		criterion: 'A mudança reduziu uma sobrecarga descrita por quem a vivia?'
	},
	decision: {
		key: 'decision',
		title: 'Escolha sobre a relação',
		bodies: ['sun', 'moon'],
		answer:
			'examinar necessidades, limites e disposição real de participar antes de tomar uma decisão. A leitura não dá uma sentença para ficar, terminar ou voltar',
		action:
			'Cada pessoa, se quiser participar, escreve o que deseja preservar, o que precisa mudar e o que não aceita. Compare a disponibilidade presente com esses critérios, sem usar a astrologia para convencer alguém a continuar.',
		criterion:
			'Sua escolha respeita os limites que você reconheceu, mesmo que a outra pessoa escolha de modo diferente?'
	},
	hidden: {
		key: 'hidden',
		title: 'O que só a outra pessoa pode dizer',
		bodies: ['mercury', 'moon'],
		answer:
			'reconhecer o limite da pergunta: este mapa não permite saber o que a outra pessoa sente, pensa ou fará. É possível preparar uma pergunta direta e observar uma resposta livre, sem substituir essa resposta por um símbolo',
		action:
			'Escreva o que deseja perguntar e o que você precisa saber para escolher. Faça o convite sem exigir uma resposta específica e considere também o limite de uma ausência de resposta.',
		criterion: 'Você conseguiu distinguir informação recebida, expectativa e hipótese sua?'
	},
	general: {
		key: 'general',
		title: 'O pedido central desta leitura',
		bodies: ['moon', 'mercury'],
		answer:
			'transformar a pergunta em uma situação concreta que possa ser descrita e em uma mudança que esteja ao alcance de quem participa. O mapa oferece hipóteses para esse exame, sem completar o que não foi relatado',
		action:
			'Escolha um episódio relacionado à pergunta. Descreva o que aconteceu, o que você precisa e uma mudança pequena que deseja propor. Convide a outra pessoa a apresentar sua versão antes de fechar qualquer acordo.',
		criterion:
			'A proposta respondeu à situação inicial e cada pessoa pôde apresentar sua própria versão?'
	}
};
const normalized = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
function classify(value: string): Focus | null {
	const s = normalized(value);
	if (/violenc|ameac|agress|coacao|medo de|nao posso recusar/.test(s)) return null;
	if (/sente por|me ama|me quer|pensa em mim|sentimentos? del|vai voltar|esta apaixonad/.test(s))
		return focuses.hidden;
	if (/termin|separar|continuar|reatar|voltar com|vale a pena/.test(s)) return focuses.decision;
	if (/filh|familia|gravidez|engravid/.test(s)) return focuses.children;
	if (/dinheiro|financ|despesa|\bcontas?\b|divisao|recursos/.test(s)) return focuses.money;
	if (/sexo|sexual|intim|desejo|carinho|afeto/.test(s)) return focuses.intimacy;
	if (/confi|traicao|ciume|fidel|segredo|mentir/.test(s)) return focuses.trust;
	if (/distancia|longe|viagen|cidades|paises/.test(s)) return focuses.distance;
	if (/espaco|autonomia|liberdade|independen/.test(s)) return focuses.space;
	if (/casar|casamento|futuro|compromisso|assumir/.test(s)) return focuses.commitment;
	if (/morar|moramos|morando|moradia|\bcasa\b|rotina|tarefa|conviv/.test(s))
		return focuses.household;
	if (/discuss|briga|conflit|desentend|comunic|conversa|discord/.test(s))
		return focuses.communication;
	return focuses.general;
}
const unsafe = (text: string) =>
	/violenc|ameac|agress|coacao|medo de|nao posso recusar/.test(normalized(text));
const unique = (ids: string[]) => [...new Set(ids)];

export function composeReconstructedDossier(
	input: WorkflowInput,
	calculation: CalculationSnapshot
): TrialReading {
	assertDossierProjection(input, calculation);
	const synInput = dossierSynastryInput(input),
		synCalculation = projectSynastry(
			synInput,
			calculation.data.sources as [CalculationSnapshot, CalculationSnapshot],
			calculation.data.sourceInputs as [BirthInput, BirthInput]
		);
	const syn = composeReconstructedSynastry(synInput, synCalculation),
		graphs = (calculation.data.sources as CalculationSnapshot[]).map(normalizeFactGraph),
		geometry = calculation.data.relationshipGeometry as CrossAspectCalculation;
	const questions = input.questions!,
		context = input.context!,
		safety = unsafe([context, ...questions].join(' '));
	const questionFocuses = questions.map((q) => classify(q) ?? focuses.general);
	const contextFocus = classify(context) ?? focuses.general;
	const priorities = [
		...new Set([
			...(contextFocus.key === 'general' ? [] : [contextFocus.key]),
			...questionFocuses.map((f) => f.key)
		])
	].map((key) => focuses[key]);
	const idsFor = (f: Focus) =>
		unique(
			f.bodies.flatMap((body) => ['a', 'b'].map((person) => `person-${person}-position-${body}`))
		);
	function anchor(f: Focus, variant = 0) {
		const aspect = geometry.aspects
			.filter((a) => f.bodies.includes(a.first) || f.bodies.includes(a.second))
			.sort(
				(a, b) =>
					Number(f.bodies.includes(b.first) && f.bodies.includes(b.second)) -
						Number(f.bodies.includes(a.first) && f.bodies.includes(a.second)) ||
					a.orbDegrees - b.orbDegrees ||
					a.first.localeCompare(b.first) ||
					a.second.localeCompare(b.second)
			)[0];
		const a = graphs[0].positions.find((p) => p.body === f.bodies[0])!,
			b = graphs[1].positions.find((p) => p.body === f.bodies[1])!;
		const contact = aspect
			? `${bodyNames[aspect.first]} de A em ${aspectNames[aspect.kind]} com ${bodyNames[aspect.second]} de B (orbe nominal ${aspect.orbDegrees.toFixed(2)}°)`
			: `${bodyNames[a.body]} de A em ${signs[a.sign]} e ${bodyNames[b.body]} de B em ${signs[b.sign]}`;
		const dynamics = aspect
			? ({
					conjunction:
						'a concentração de duas funções pode tornar o assunto muito presente, sem significar que ambas as pessoas o vivam do mesmo modo',
					square:
						'o atrito simbólico pede diferenciar as necessidades antes de procurar uma solução comum',
					opposition:
						'a polaridade sugere examinar a posição de cada pessoa sem reduzir nenhuma delas ao papel oposto',
					trine:
						'a fluência simbólica pode facilitar a aproximação, mas ainda precisa de uma iniciativa reconhecida pelas duas pessoas',
					sextile:
						'a possibilidade de cooperação depende de uma oportunidade concreta de participação'
				}[aspect.kind] ??
				'a configuração oferece uma hipótese de encontro, sem comprovar comportamento')
			: 'as posições individuais permitem comparar necessidades; a ausência de um contato maior nesta seleção não significa ausência de relação';
		return {
			contact,
			text:
				variant === 0
					? `A referência inicial é ${contact}. Para ${f.title.toLowerCase()}, ${dynamics}.`
					: variant === 1
						? `Nesta pergunta, ${contact} ajuda a examinar ${functions[aspect?.first ?? a.body]} em relação a ${functions[aspect?.second ?? b.body]}. A hipótese a conferir é esta: ${dynamics}.`
						: variant === 2
							? `Outro ângulo de ${f.title.toLowerCase()} aparece em ${contact}: ${dynamics}. Pergunte qual necessidade ficou sem palavras no episódio que motivou este pedido.`
							: `Ao retomar ${contact}, considere o limite da hipótese: ${dynamics}. O que mudou entre a situação que gerou sua pergunta e a possibilidade que você deseja construir agora?`,
			ids: unique([
				...idsFor(f),
				...(aspect
					? [
							`cross-${aspect.first}-${aspect.second}`,
							`person-a-position-${aspect.first}`,
							`person-b-position-${aspect.second}`
						]
					: [])
			])
		};
	}
	const focusAnchor = anchor(priorities[0]);
	const opening = `O pedido começa por ${priorities[0].title.toLowerCase()}. A base compara dois mapas; o Dossiê usa o contexto e ${questions.length === 1 ? 'a pergunta informada' : 'as perguntas informadas'} para transformar essa comparação em prioridades de conversa e escolha.`;
	const sections: TrialReading['sections'] = [
		{
			title: 'O que este casal precisa examinar agora',
			text: `${opening}\n\nVocê relatou: “${context}”. Essa é a perspectiva de quem fez o pedido. Ela não confirma a versão, o sentimento ou a disponibilidade da outra pessoa. ${focusAnchor.text}\n\nO percurso abaixo distingue três níveis: hipóteses dos mapas, respostas situadas às perguntas e propostas que ainda precisam de participação voluntária. O primeiro tema orienta o começo; os demais mostram como cuidado, linguagem e limites se relacionam com essa prioridade. Uma facilidade simbólica não torna um acordo automático, e uma tensão simbólica não determina o fracasso do vínculo.`,
			factIds: unique([...focusAnchor.ids, 'personal-context'])
		}
	];
	const themeTitles = [
		'Como cada pessoa reconhece cuidado',
		'As formas de dar e receber afeto',
		'O que precisa de tradução na conversa',
		'Desejo, iniciativa e limites',
		'Quando a diferença vira atrito',
		'Responsabilidades que podem ser assumidas',
		'Liberdade dentro do vínculo',
		'Aprender sem exigir que o outro mude'
	];
	const individualReflections = [
		'Observe que formas de cuidado você reconhece como acolhimento e quais vive como controle. Essa distinção pertence à sua experiência; o símbolo lunar não justifica pressão para aceitar contato.',
		'Reconheça um gesto de afeto que você deseja receber e um que prefere recusar. Uma afinidade de Vênus não cria obrigação de corresponder, nem exige demonstrar amor em condições que você não aceita.',
		'Você pode escrever para si o que precisa dizer, sem enviar a mensagem ou iniciar uma conversa. Mercúrio oferece uma linguagem de reflexão, mas não exige explicações diante de ameaça.',
		'Distinga seu desejo de uma exigência recebida. A iniciativa simbolizada por Marte não autoriza insistência; reconhecer o próprio limite pode ser um passo completo, sem qualquer encontro posterior.',
		'Identifique o ponto em que uma diferença passou a ser vivida como medo. Um contato de tensão não torna agressão inevitável e não atribui a você a tarefa de administrar a reação da outra pessoa.',
		'Separe a responsabilidade que você escolhe assumir da culpa que lhe é imposta. Saturno não transforma uma promessa em obrigação de permanecer; você pode reconsiderar o que consegue oferecer.',
		'Considere um espaço em que suas escolhas possam ser feitas com liberdade. A autonomia simbolizada por Urano não precisa ser demonstrada por confronto ou negociada sob pressão.',
		'Pense no apoio que amplia suas possibilidades sem condicionar a ajuda à reconciliação. Júpiter não promete que a outra pessoa mudará; o aprendizado pode incluir reconhecer o que você não controla.'
	];
	syn.sections.slice(1, 9).forEach((s, i) => {
		const cut = s.text.lastIndexOf('\n\n');
		sections.push({
			...s,
			title: themeTitles[i],
			text: safety ? s.text.slice(0, cut) + '\n\n' + individualReflections[i] : s.text
		});
	});
	const overlay = syn.sections[9];
	sections.push({
		...overlay,
		title: 'Os campos da vida tocados pelo encontro',
		text: safety
			? overlay.text.replace(
					/Escolham[\s\S]*$|Conversem[\s\S]*$/,
					'Você pode observar para si como essa presença afeta suas escolhas. Nenhuma área do mapa obriga a manter contato ou compartilhar esse registro. Casas dependem da hora natal; a experiência relatada continua sendo o critério para examinar a hipótese.'
				)
			: overlay.text
	});
	questions.forEach((q, i) => {
		const f = questionFocuses[i],
			a = anchor(f, i + 1),
			previous = questionFocuses.slice(0, i).findIndex((other) => other.key === f.key);
		sections.push({
			title: `Resposta à pergunta ${i + 1}: ${f.title.toLowerCase()}`,
			text: `Pergunta informada: “${q}”.\n\n${safety ? ['O relato contém sinais que pedem atenção à liberdade de recusa. Esta resposta não recomenda uma negociação conjunta sob medo, pressão ou ameaça; procure uma forma de apoio em que você possa escolher sem coerção.', 'A pergunta permanece legítima, mas os mapas não permitem avaliar segurança nem garantem uma mudança da outra pessoa. Você pode interromper a conversa e proteger um limite sem transformar isso em uma falha do vínculo.', 'Nenhuma resposta simbólica torna obrigatório confrontar, explicar ou perdoar. O passo possível é reconhecer o que você deseja preservar e identificar um apoio que não dependa da participação da outra pessoa.'][i] : previous < 0 ? `A resposta que este Dossiê pode oferecer é ${f.answer}.` : i === 2 ? `A terceira pergunta volta a ${f.title.toLowerCase()}. Depois de formular e discutir o pedido, falta examinar sua sustentação: o que cada pessoa consegue repetir na prática e o que foi apenas uma intenção? A diferença entre essas duas coisas orienta a revisão, sem decidir o vínculo.` : `Esta pergunta retoma ${f.title.toLowerCase()}, já tratado na resposta ${previous + 1}. Agora o ponto é a execução: qual parte da proposta depende de você e qual exige uma aceitação que ainda não foi comunicada? A leitura não completa essa resposta pela outra pessoa.`}\n\n${a.text}\n\n${safety ? `Para o assunto ${i + 1}, registre o limite que você deseja proteger e o apoio que pode procurar com liberdade.` : previous < 0 ? f.action : i === 2 ? 'Para esta terceira pergunta, escolha o ponto que continua sem resposta. Convide uma resposta explícita sem exigir uma decisão imediata; se ela não vier, reconheça a incerteza ao definir seu próximo passo.' : 'Antes de ampliar o compromisso, confira se houve um pedido compreensível e uma resposta livre. Se faltou uma dessas condições, reformule o pedido ou deixe a proposta em aberto; insistência não transforma silêncio em concordância.'}\n\n${previous < 0 ? `Critério de avaliação desta resposta: ${safety ? ['Você conserva a liberdade de interromper o contato e procurar apoio?', 'O limite que você reconheceu pode ser protegido sem exigir uma explicação da outra pessoa?', 'Seu próximo passo depende de uma escolha sua, em condições em que você pode recusar?'][i] : f.criterion}` : i === 2 ? 'A proposta final precisa indicar o que você aceita oferecer agora e o que permanece fora do acordo. Uma expectativa que ainda não foi discutida não pode ser cobrada como promessa.' : 'Na revisão, identifique o que foi efetivamente aceito, o que continua incerto e o que deve ser abandonado. Não atribua a incerteza a uma deficiência afetiva de nenhuma pessoa.'}`,
			factIds: unique([`couple-question-${i + 1}`, 'personal-context', ...a.ids])
		});
	});
	const priorityText = priorities
		.map((f, i) => {
			const a = anchor(f);
			return `${i + 1}. ${f.title}: ${i === 0 && contextFocus.key !== 'general' ? 'começa pelo contexto relatado' : 'entra por uma pergunta informada'}. Referência para retornar ao mapa: ${a.contact}.`;
		})
		.join('\n\n');
	sections.push({
		title: 'O que vem primeiro e por quê',
		text: `As respostas anteriores vêm antes desta ordem de trabalho. A prioridade editorial começa pelo contexto e depois reúne os assuntos das perguntas; não mede a gravidade do vínculo nem atribui uma nota ao casal.\n\n${priorityText}\n\n${safety ? 'Neste relato, a possibilidade de recusar e buscar apoio vem antes de qualquer proposta conjunta. As prioridades simbólicas não substituem essa condição.' : 'Escolham apenas o primeiro assunto para a experiência inicial. Uma mudança pequena é mais observável que tentar corrigir a relação inteira de uma vez. Se a outra pessoa preferir começar por outro tema, tratem essa diferença como informação para a conversa, sem usar esta ordem como autoridade sobre ela.'}`,
		factIds: unique([
			'personal-context',
			...questions.map((_, i) => `couple-question-${i + 1}`),
			...priorities.flatMap((f) => anchor(f).ids)
		])
	});
	const repairIds = unique([
		...syn.sections[3].factIds,
		...syn.sections[5].factIds,
		...syn.sections[6].factIds
	]);
	sections.push({
		title: 'Da diferença à negociação e à reparação',
		text: `Comunicação, conflito e compromisso se encontram quando uma pessoa faz um pedido e a outra precisa entender o que pode assumir. Os capítulos sobre linguagem, atrito e responsabilidade descrevem hipóteses diferentes para esse mesmo encontro; nenhum deles comprova quem tem razão.\n\n${safety ? 'Neste pedido, reconhecer a necessidade não obriga a propor uma solução conjunta. Você pode buscar apoio individual para examinar seus limites e alternativas, sem prestar contas à outra pessoa sobre esse processo.' : 'Para negociar, separem necessidade e solução: desejar cuidado não obriga a outra pessoa a oferecê-lo de uma única maneira; desejar autonomia não elimina a responsabilidade de comunicar um limite. Procurem uma alternativa que preserve o ponto essencial de cada pedido. Uma resposta negativa precisa continuar possível.'}\n\n${safety ? 'A reparação não é uma tarefa conjunta segura quando existe medo ou coerção. Não usem este roteiro para exigir encontro, explicação ou perdão; a participação pode ser interrompida.' : 'Quando houve um dano reconhecido por quem o viveu, reparar exige escutar o efeito, reconhecer o que se pode assumir e propor uma mudança observável. Perdão e reconciliação não são obrigações. A pessoa afetada pode precisar de tempo ou não desejar retomar a conversa.'}\n\n${safety ? 'A avaliação possível é sobre sua margem de escolha: o próximo passo preserva a liberdade de interromper o contato, recusar uma exigência e procurar apoio? A resposta não depende de uma concordância entre vocês.' : 'O teste não é terminar a conversa com a mesma opinião. É saber se a diferença foi compreendida e se existe uma responsabilidade que cada pessoa aceita assumir sem apagar a experiência da outra.'}`,
		factIds: repairIds
	});
	const action = safety
		? 'Registre um limite seu e uma forma de apoio que você possa procurar com liberdade. Não faça desta leitura um convite obrigatório à negociação com a outra pessoa.'
		: priorities[0].action;
	sections.push({
		title: 'Um acordo em experiência',
		text: `${safety ? 'A proposta para este pedido é individual e pode ser interrompida.' : `A experiência começa por ${priorities[0].title.toLowerCase()}, conforme a prioridade situada desta edição. Retomem a resposta que trata desse assunto e escolham apenas um dos gestos propostos; o objetivo é descobrir como ele funciona na vida de vocês.`}\n\n${safety ? 'Você não precisa da concordância da outra pessoa para reconhecer um limite ou decidir procurar apoio. Não há prazo imposto por esta leitura.' : 'Se ambas as pessoas quiserem participar, escrevam quatro pontos: o que será feito, quem aceita fazer, qual sinal mostrará o efeito e quando vão revisar. Escolham a data juntos; esta leitura não calcula um dia favorável. O acordo pode ser recusado ou modificado antes e durante a experiência.'}\n\n${safety ? 'Você pode revisar o próprio registro pelo que viveu e pelo apoio disponível. Não precisa apresentar esse material à outra pessoa ou demonstrar que uma hipótese do mapa estava correta.' : 'Na revisão, comparem a proposta com o que foi vivido, sem procurar confirmação dos signos. Um resultado diferente do esperado pede ajuste ou abandono da proposta, e não uma explicação sobre uma suposta incapacidade de amar.'} O registro desta edição conserva os dados e perguntas originais; não presume que um acordo tenha acontecido depois.`,
		factIds: unique(['personal-context', ...anchor(priorities[0]).ids])
	});
	sections.push({
		title: 'Síntese para uma escolha consciente',
		text: `Este Dossiê reúne os mapas em torno de ${priorities[0].title.toLowerCase()} e das perguntas que você trouxe. A configuração escolhida como referência inicial pode ser relida à luz das respostas, sem tomar o lugar delas: afinidade, atrito e responsabilidade só ganham sentido na experiência que cada pessoa pode descrever.\n\nA relação entre cuidado, comunicação e responsabilidade é o fio que liga as respostas: uma necessidade precisa ganhar palavras, uma proposta precisa caber na disponibilidade real e um limite precisa poder ser comunicado. Os contatos e as posições oferecem linguagem para examinar essas relações; a experiência de vocês pode confirmar, modificar ou afastar cada hipótese.\n\n${safety ? 'A possibilidade de recusar e procurar apoio é a condição central deste pedido.' : `O primeiro passo proposto é uma experiência sobre ${priorities[0].title.toLowerCase()}, avaliada pelo efeito que cada pessoa reconhece.`} Você não precisa transformar toda diferença em problema nem toda afinidade em promessa. A conclusão útil é a escolha que permanece sua depois de escutar o que o mapa sugere, o que você vive e o que a outra pessoa livremente comunica.`,
		factIds: unique([
			...focusAnchor.ids,
			'personal-context',
			...questions.map((_, i) => `couple-question-${i + 1}`)
		])
	});
	sections.push({
		...syn.sections.at(-1)!,
		text:
			syn.sections.at(-1)!.text +
			'\n\nO Dossiê acrescenta perguntas relatadas, respostas limitadas ao escopo simbólico, prioridade pelo contexto e propostas reversíveis. Não importa histórico, mensagens ou leituras anteriores. Cada pergunta preserva seu texto e referência de relato.',
		factIds: calculation.facts.map((f) => f.id)
	});
	return {
		version: RECONSTRUCTION_VERSION,
		productId: input.productId,
		title: 'Dossiê do Casal',
		opening,
		source: 'Conteúdo original ATVNA · mapas, contexto e perguntas do casal',
		sections,
		questions: [
			safety
				? 'Seu próximo passo conserva a liberdade de recusar e procurar apoio?'
				: priorities[0].criterion,
			'Que diferença entre necessidade e solução ficou mais clara nesta leitura?',
			'Qual proposta você deseja aceitar, modificar ou recusar depois de avaliar sua experiência?'
		],
		practice: action,
		limits: calculation.limits,
		editorial: {
			version: RECONSTRUCTION_VERSION,
			canon: CANON_VERSION,
			graph: 'atv-couple-dossier-situated/1.0.0',
			selection: [
				...new Map(
					[
						...focusAnchor.ids.map((factId, i) => ({
							factId,
							score: 100 - i,
							reason:
								'Vínculo entre a prioridade relatada e a base simbólica; não mede qualidade da relação.'
						})),
						...syn.editorial!.selection
					].map((item) => [item.factId, item])
				).values()
			],
			patterns: priorities.map((f) => ({
				kind: `dossier-priority-${f.key}`,
				factIds: anchor(f).ids
			})),
			themes: sections
				.slice(1, -1)
				.map((s, i) => ({ id: `dossier-theme-${i}`, factIds: s.factIds })),
			context: { key: 'relationships', factId: 'personal-context' },
			plan: sections.map((s, i) => ({
				title: s.title,
				factIds: s.factIds,
				role:
					i === 0
						? 'synthesis'
						: i === sections.length - 1
							? 'references'
							: s.title.startsWith('Resposta à')
								? 'answer'
								: 'interpretation'
			}))
		}
	};
}

export function reviewReconstructedDossier(
	input: WorkflowInput,
	calculation: CalculationSnapshot,
	reading: TrialReading
): string[] {
	try {
		assertDossierProjection(input, calculation);
	} catch {
		return ['invalid-dossier-projection'];
	}
	const failures: string[] = [],
		trace = reading.editorial,
		ids = new Set(calculation.facts.map((f) => f.id));
	const answers = reading.sections.filter((s) => s.title.startsWith('Resposta à pergunta'));
	if (
		answers.length !== input.questions!.length ||
		answers.some(
			(s, i) =>
				!s.text.includes(input.questions![i]) ||
				!s.factIds.includes(`couple-question-${i + 1}`) ||
				!s.factIds.includes('personal-context') ||
				s.text.length < 550
		)
	)
		failures.push('unanswered-dossier-question');
	const priority = reading.sections.findIndex((s) => s.title === 'O que vem primeiro e por quê');
	if (
		priority < 0 ||
		reading.sections.slice(priority + 1).some((s) => s.title.startsWith('Resposta à pergunta'))
	)
		failures.push('dossier-priority-before-answers');
	if (
		!trace ||
		trace.graph !== 'atv-couple-dossier-situated/1.0.0' ||
		trace.context.factId !== 'personal-context' ||
		trace.selection.some((s) => !ids.has(s.factId)) ||
		trace.patterns.some((p) => p.factIds.some((f) => !ids.has(f))) ||
		trace.plan.length !== reading.sections.length ||
		trace.plan.some(
			(p, i) =>
				p.title !== reading.sections[i].title ||
				p.factIds.join('|') !== reading.sections[i].factIds.join('|')
		)
	)
		failures.push('unbound-dossier-plan');
	if (reading.sections.some((s) => s.factIds.some((f) => !ids.has(f)) || s.text.length < 350))
		failures.push('incomplete-dossier-chapter');
	const sentences = reading.sections
		.filter((s) => !s.title.startsWith('Referências'))
		.flatMap((s) => s.text.split(/(?<=[.!?])\s+/))
		.map((s) => s.trim())
		.filter((s) => s.length > 100);
	const repeats = sentences.filter((s, i) => sentences.indexOf(s) !== i);
	if (repeats.length) failures.push('repeated-dossier-prose');
	if (
		/alma gêmea|destinados a|percentual de compatibilidade|garante.{0,20}(amor|relacionamento)/i.test(
			[input.context!, ...input.questions!].reduce(
				(text, reported) => text.split(reported).join(''),
				reading.sections.map((s) => s.text).join(' ')
			)
		)
	)
		failures.push('unsupported-dossier-claim');
	return failures;
}
