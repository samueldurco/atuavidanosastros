import type { CalculationSnapshot, WorkflowInput } from '@atv/domain';
import type { TrialReading } from '../reading';
import { formatCareerCompassFactDisplay } from '../../career-compass-fact-presentation';
import { CANON_VERSION, aspectNames, bodyNames, functions, signMeanings, signs } from './canon';
import type { EditorialTrace } from './career';
import { normalizeFactGraph, type Aspect, type FactGraph, type Position } from './fact-graph';
import {
	assertCompassProjection,
	COMPASS_READING_VERSION,
	COMPASS_READING_VERSION_V5,
	compassMethod,
	type CompassData
} from './compass-facts';
import { houseAreas } from './natal-canon';

const unique = (ids: string[]) => [...new Set(ids)];
const label = (p: Position) => `${bodyNames[p.body]} em ${signs[p.sign]}`;
const personal = new Set(['sun', 'moon', 'mercury', 'venus', 'mars']);
type CompassContext = {
	key: EditorialTrace['context']['key'];
	priority: string[];
	focus: string;
	task: string;
	question: string;
	scene?: string;
	probe?: {
		kind: 'illustration' | 'ceramics' | 'consulting' | 'other';
		sample: string;
		criterion: string;
		access: string;
		laterCost: string;
	};
	constraint?: string;
	currentActivity?: string;
	deferredAlternative?: string;
};
type CompassEdition = 'latest' | 'v5';
export function compassContext(text = '', edition: CompassEdition = 'latest'): CompassContext {
	const t = text.toLocaleLowerCase('pt-BR');
	const workload =
		edition === 'v5'
			? /sobrecarg|cansa|exaust|esgot|descanso/.test(t)
			: [...t.matchAll(/sobrecarg|sobrecarreg|cansa|exaust|esgot|descans/g)].some((match) => {
					const priorClause =
						t
							.slice(0, match.index)
							.split(/[.,;!?]|\bmas\b/)
							.at(-1) ?? '';
					if (/descans/.test(match[0]) && /\bsem\s*$/.test(priorClause))
						return !/\b(?:não|nunca|nem)\b(?:\s+\S+){0,3}\s+sem\s*$/.test(priorClause);
					if (
						/descans/.test(match[0]) &&
						/\b(?:não|nunca)\s+(?:tenho|consigo|posso)\s*$/.test(priorClause)
					)
						return true;
					return !/\b(?:não|nunca|nem|sem)\b(?:\s+\S+){0,3}\s*$/.test(priorClause);
				});
	const affirmedMention = (pattern: RegExp) =>
		edition === 'v5'
			? pattern.test(t)
			: [...t.matchAll(new RegExp(pattern.source, 'g'))].some((match) => {
					const priorClause =
						t
							.slice(0, match.index)
							.split(/[.,;!?]|\bmas\b/)
							.at(-1) ?? '';
					return !/\b(?:não|nunca|nem|sem)\b(?:\s+\S+){0,3}\s*$/.test(priorClause);
				});
	const affirmedStudy = affirmedMention(/estud|formaç|\bcurso\b|aprender/);
	const preservations = [
		...t.matchAll(
			/(?:sem abandonar|sem deixar|sem largar|sem perder|mantendo|manter|preservando)\s+(?:(?:minha|meu|a|o|sua|seu)\s+)?(renda|emprego|trabalho|atividade)/g
		)
	];
	const intentions =
		edition === 'latest'
			? [
					...text.matchAll(
						/\b(?:testar|experimentar|explorar|montar|criar|desenvolver|fazer|atuar(?:\s+com)?|me\s+tornar|tornar-me|virar|ingressar\s+em|(?:tenho|ter)\s+interesse\s+em)\b/gi
					)
				].filter((match) => {
					const priorClause =
						text
							.slice(0, match.index)
							.split(/[.,;!?]|\bmas\b/i)
							.at(-1) ?? '';
					return (
						!/\b(?:não|nunca|nem)\s+(?:(?:quero|quer|pretendo|pretende|desejo|deseja|posso|consigo|vou)\s+)?$/i.test(
							priorClause
						) && preservations.some((p) => p.index > match.index)
					);
				})
			: [];
	const parallelIntent = intentions.at(-1);
	const preservation = parallelIntent
		? preservations.find((p) => p.index > parallelIntent.index)
		: undefined;
	if (parallelIntent && preservation) {
		const target =
			text
				.slice(parallelIntent.index + parallelIntent[0].length, preservation.index)
				.split(/[.,;!?]|\bmas\b/i)[0]
				.trim() || 'uma atividade alternativa';
		const intentVerb = parallelIntent[0].toLocaleLowerCase('pt-BR');
		const professionalIdentity = /^(?:me tornar|tornar-me|virar)$/.test(intentVerb);
		const activity = professionalIdentity ? `a atuação como ${target}` : target;
		const intention = /interesse\s+em$/.test(intentVerb)
			? `explorar ${activity}`
			: `${intentVerb} ${target}`;
		const currentTask =
			/^(?:(?:o|a)\s+)?(?:meu|minha|nosso|nossa)\s+(?:trabalho|emprego|atividade)\b/i.test(target);
		if (!currentTask) {
			const sceneVerb = /^(?:montar|criar|desenvolver|fazer)$/.test(intentVerb)
				? intentVerb
				: 'experimentar';
			const illustration = /ilustr|desenho|arte visual/i.test(target);
			const ceramics = /cerâmic|barro|argila|oleir/i.test(target);
			const consulting = /consultori|consultor/i.test(target);
			const probe: NonNullable<CompassContext['probe']> = illustration
				? {
						kind: 'illustration',
						sample: 'um rascunho de ilustração editorial que comunique uma ideia curta',
						criterion:
							'se você consegue enunciar a ideia principal em uma frase e apontar onde ela aparece no rascunho',
						access: 'papel ou uma ferramenta de desenho que você já usa',
						laterCost: 'revisões e autorização de uso da imagem podem exigir tempo adicional'
					}
				: ceramics
					? {
							kind: 'ceramics',
							sample:
								'um esboço de peça simples de cerâmica, com tamanho e etapas de modelagem, secagem e queima',
							criterion: 'se você conhece os recursos necessários para modelar uma pequena amostra',
							access: 'argila, espaço de secagem e acesso à queima',
							laterCost: 'secagem e queima exigem condições que um esboço de vinte minutos não mede'
						}
					: consulting
						? {
								kind: 'consulting',
								sample:
									'uma página de escopo com uma pergunta, uma análise curta e um limite explícito para a consultoria',
								criterion:
									'se a análise apresenta um próximo passo específico e explicita uma incerteza relevante',
								access: 'informações que você pode usar sem expor dados de terceiros',
								laterCost:
									'atendimento, revisão e responsabilidade por recomendações exigem tempo além da página inicial'
							}
						: {
								kind: 'other',
								sample: `uma etapa pequena de ${activity} que você já consiga executar`,
								criterion: 'se você consegue apontar o resultado e explicar a quem ele seria útil',
								access: 'os recursos necessários para essa etapa, identificados por você',
								laterCost:
									'as etapas seguintes podem exigir tempo ou recursos que a amostra ainda não mede'
							};
			const constraint =
				preservation?.[1] === 'renda'
					? 'a renda atual'
					: preservation?.[1] === 'emprego'
						? 'o emprego atual'
						: 'a atividade atual';
			const currentActivity = text.match(
				/\b(?:trabalha|trabalho|atua|atuo)\s+((?:com|em|na|no)\s+.{3,50}?)(?=\s+e\s+(?:quer|quero|pretende|deseja|gostaria)\b|\s+mas\b|[.,;!?]|$)/i
			)?.[1];
			if (workload)
				return {
					key: 'workload',
					priority: ['sustainability', 'environment'],
					focus: `Na pergunta sobre carga e descanso, a capacidade disponível vem antes de ampliar a direção. Você também relata querer ${intention} preservando ${constraint}; essa alternativa só deve ser avaliada depois de reduzir a carga e verificar a margem real.`,
					task: 'identifique, apenas se souber, uma fonte possível da carga e o que poderia esperar ou diminuir; só registre uma obrigação a renegociar se ela existir',
					question: `Que carga pode diminuir primeiro, e quando haveria margem para explorar ${activity} preservando ${constraint}?`,
					constraint,
					currentActivity,
					deferredAlternative: activity
				};
			return {
				key: 'transition',
				priority: ['contribution', 'environment'],
				focus: `Você relata querer ${intention} e preservar ${constraint}. A hipótese de carreira precisa caber nessa condição antes de qualquer ampliação.`,
				task: illustration
					? `prepare ${probe.sample} em papel ou numa ferramenta já disponível e registre ${probe.criterion}. Se desejar mostrar a imagem a alguém, anote separadamente o que essa pessoa entendeu; sem esse retorno, não conclua nada sobre a compreensão de terceiros. ${/portfólio/i.test(target) ? 'Guarde o rascunho em um portfólio privado para comparar versões. ' : ''}${professionalIdentity ? `Essa amostra explora a atuação como ${target}, sem validar uma profissão. ` : ''}Anote o tempo observado; compare com a rotina atual somente se houver uma tarefa de duração e condições semelhantes, sem assumir encomenda nem alterar ${constraint}`
					: ceramics
						? `faça ${probe.sample} e verifique quais recursos estão disponíveis e, se houver, quais faltam. Se já tiver argila e espaço apropriado, modele uma forma pequena, sem presumir acesso à queima. Sem esses recursos, o registro verifica acesso e planejamento, não habilidade com cerâmica. Anote o tempo da etapa acessível sem equipará-la ao emprego atual; preserve ${constraint}`
						: consulting
							? `redija ${probe.sample} com informações que pode usar; confira ${probe.criterion} sem prometer atendimento nem divulgar dados de terceiros. Anote o tempo; compare com uma tarefa atual só se houver condições equivalentes, sem alterar ${constraint}`
							: `defina e execute, se houver acesso, ${probe.sample}. Registre ${probe.criterion}, os recursos disponíveis e, se houver, os que faltam; sem acesso, descreva apenas o plano, sem tomar isso como teste de habilidade. Anote tempo e esforço; compare com a rotina atual só se houver tarefa equivalente, sem alterar ${constraint}`,
				question: `Que resultado desse teste justificaria continuar a explorar ${activity} preservando ${constraint}?`,
				scene: professionalIdentity
					? `explorar uma tarefa ligada à atuação como ${target} enquanto preserva ${constraint}`
					: `${sceneVerb} ${activity} enquanto preserva ${constraint}`,
				probe,
				constraint,
				currentActivity
			};
		}
	}
	if (workload)
		return {
			key: 'workload',
			priority: ['sustainability', 'environment'],
			focus:
				'Na pergunta sobre carga e descanso, a capacidade disponível vem antes de ampliar a direção.',
			task:
				edition === 'v5'
					? 'escolha uma tarefa que possa ser reduzida; descreva a entrega mínima, o apoio necessário e uma responsabilidade que precisa ser renegociada'
					: 'identifique, apenas se souber, uma fonte possível da carga e o que poderia esperar ou diminuir; só registre uma obrigação a renegociar se ela existir',
			question: 'Que parte da carga pode diminuir antes de acrescentar uma nova iniciativa?'
		};
	if (affirmedStudy)
		return {
			key: 'study',
			priority: ['motivation', 'working-style'],
			focus:
				'Na pergunta sobre aprendizagem, compare interesse com a experiência concreta de praticar.',
			task:
				edition === 'v5'
					? 'compare dois exercícios gratuitos e curtos ligados à habilidade mencionada; observe compreensão, interesse e acesso a orientação antes de assumir uma formação'
					: 'defina primeiro qual habilidade quer experimentar; então compare dois exercícios gratuitos e curtos ligados a ela, observando compreensão, interesse e acesso a orientação antes de assumir uma formação',
			question:
				'Qual exercício acessível permite comparar seu interesse com a prática antes de escolher uma formação?'
		};
	if (affirmedMention(/lider|equipe|gestão|gestao|coordena/))
		return {
			key: 'leadership',
			priority: ['environment', 'contribution'],
			focus:
				'Na pergunta sobre equipe, a contribuição depende de acordos entre autonomia, responsabilidade e apoio.',
			task: 'descreva uma entrega compartilhada, quem pode decidir cada parte e o retorno necessário; identifique um acordo que precisa ficar claro antes da execução',
			question:
				'Que acordo entre autonomia e responsabilidade precisa ficar explícito para a equipe?'
		};
	if (
		(edition === 'v5' ? /autônom/ : /\bautônom[oa]s?\b/).test(t) ||
		/empreend|freela|negócio próprio|projeto próprio/.test(t)
	)
		return {
			key: 'independent',
			priority: ['sustainability', 'working-style'],
			focus: 'Na pergunta sobre atividade própria, limite o escopo antes de avaliar uma expansão.',
			task: 'esboce uma proposta pequena, o recurso já disponível e o limite de entrega; compare o tempo necessário com a margem atual sem assumir compromisso financeiro',
			question: 'Que parte da proposta cabe nos recursos atuais e pode ser avaliada sem despesa?'
		};
	if (affirmedMention(/mudança|mudar|transi|recoloca|desempreg|alternativa|comparar/))
		return {
			key: 'transition',
			priority: ['contribution', 'environment'],
			focus:
				'Na comparação entre direções, examine a tarefa real e as condições de acesso antes de decidir.',
			task: 'compare uma tarefa da situação atual com uma alternativa acessível; descreva quem se beneficia, o que muda no cotidiano e qual informação ainda falta',
			question:
				'Qual diferença concreta entre a situação atual e a alternativa precisa ser verificada antes de decidir?'
		};
	return {
		key: 'general',
		priority: ['contribution', 'motivation'],
		focus: 'A reflexão começa pela utilidade de uma tarefa e pela motivação para repeti-la.',
		task: 'escolha uma tarefa já disponível; descreva para quem ela serve e compare o resultado obtido com o esforço necessário',
		question: 'Em qual tarefa você consegue observar utilidade e motivação nas condições atuais?'
	};
}
const themeBodies = (ruler: string): Record<string, string[]> => ({
	contribution: ['sun', ruler],
	motivation: ['sun', 'moon', 'venus'],
	environment: ['moon', 'mercury', 'saturn'],
	'working-style': ['mercury', 'mars', 'sun'],
	sustainability: ['jupiter', 'saturn', 'mars']
});
const required = (g: FactGraph, body: string) => {
	const p = g.positions.find((p) => p.body === body);
	if (!p) throw Error(`Função natal ausente da Bússola: ${body}.`);
	return p;
};
export function compassSelection(g: FactGraph, edition: CompassEdition = 'latest') {
	const ruler = g.mc!.ruler,
		bodySets = themeBodies(ruler),
		themes = Object.values(bodySets),
		binding = compassContext(g.facts.find((f) => f.id === g.contextFactId)?.display, edition);
	return g.aspects
		.map((a) => ({
			aspect: a,
			score:
				[a.first, a.second].filter((b) => personal.has(b)).length *
					compassMethod.selection.personalWeight +
				([a.first, a.second].includes(ruler) ? compassMethod.selection.rulerWeight : 0) +
				themes.filter((b) => b.includes(a.first) && b.includes(a.second)).length *
					compassMethod.selection.themeWeight +
				binding.priority.filter((id) =>
					edition === 'v5'
						? bodySets[id].includes(a.first) && bodySets[id].includes(a.second)
						: bodySets[id].includes(a.first) || bodySets[id].includes(a.second)
				).length *
					compassMethod.selection.contextWeight +
				6 -
				a.orb
		}))
		.sort((a, b) => b.score - a.score || a.aspect.factId.localeCompare(b.aspect.factId))
		.slice(0, compassMethod.selection.maximumAspects);
}
const procedures: Record<string, string> = {
	sun: 'assumir uma entrega de autoria identificável e pedir retorno sobre sua utilidade',
	moon: 'observar uma necessidade de cuidado ou acolhimento e combinar como atendê-la sem absorver toda a carga',
	mercury:
		'transformar uma informação confusa numa explicação curta e conferir o que a outra pessoa compreendeu',
	venus:
		'comparar dois critérios de qualidade e negociar um acordo que respeite o valor de cada parte',
	mars: 'iniciar uma tarefa delimitada e explicitar onde sua responsabilidade começa e termina',
	jupiter: 'ligar uma tarefa a uma ideia mais ampla e testar um exemplo antes de generalizar',
	saturn: 'definir uma sequência curta, um limite de escopo e um critério verificável de conclusão',
	uranus: 'propor uma mudança pequena no procedimento e comparar o resultado com o modo habitual',
	neptune: 'dar forma concreta a uma percepção ou imagem e pedir retorno sobre o que ela comunica',
	pluto:
		'investigar a causa de um problema delimitado sem transformar a investigação em controle das pessoas'
};
const workRoles: Record<
	string,
	{ stake: string; condition: string; gain: string; loss: string; move: string }
> = {
	sun: {
		stake: 'a autoria reconhecível de uma entrega',
		condition: 'a decisão sobre uma parte da entrega permanece com você',
		gain: 'a participação fica visível sem exigir que você faça tudo',
		loss: 'o esforço pode ficar sem autoria identificável',
		move: 'reservar uma parte da entrega para sua própria decisão'
	},
	moon: {
		stake: 'o apoio necessário para sustentar a tarefa',
		condition: 'há acordo prévio sobre a carga e a ajuda',
		gain: 'o cuidado cabe num acordo de disponibilidade',
		loss: 'o cuidado pode virar uma obrigação silenciosa',
		move: 'combinar quem oferece apoio e até onde ele vai'
	},
	mercury: {
		stake: 'a clareza do pedido e da resposta',
		condition: 'o problema e o critério de conclusão estão claros',
		gain: 'a informação permite uma decisão compartilhada',
		loss: 'a tarefa pode avançar sobre instruções mal compreendidas',
		move: 'explicar o problema em poucas linhas e conferir a compreensão'
	},
	venus: {
		stake: 'o valor atribuído ao resultado por cada parte',
		condition: 'há um padrão de qualidade negociado',
		gain: 'a cooperação se apoia num critério comum',
		loss: 'um acordo aparente pode esconder critérios de qualidade diferentes',
		move: 'negociar um critério de qualidade antes de entregar'
	},
	mars: {
		stake: 'a iniciativa e o limite de responsabilidade',
		condition: 'está claro quem pode agir e onde a tarefa termina',
		gain: 'a ação começa sem absorver obrigações indefinidas',
		loss: 'a iniciativa pode se transformar em responsabilidade sem limite',
		move: 'iniciar uma parte delimitada e nomear a condição de parada'
	},
	jupiter: {
		stake: 'o alcance de uma proposta de crescimento',
		condition: 'há um caso acessível para testar a expansão',
		gain: 'uma ideia ampla ganha uma medida concreta',
		loss: 'a promessa de crescimento pode ultrapassar os recursos disponíveis',
		move: 'testar a proposta em um caso antes de ampliá-la'
	},
	saturn: {
		stake: 'a continuidade e o prazo da entrega',
		condition: 'tempo, escopo e conclusão cabem na rotina',
		gain: 'a qualidade pode ser mantida sem esforço indefinido',
		loss: 'o compromisso pode continuar depois de deixar de caber na rotina',
		move: 'definir prazo, escopo e um critério de conclusão'
	},
	uranus: {
		stake: 'a autonomia para mudar um procedimento',
		condition: 'a mudança pode ser comparada com o modo atual',
		gain: 'uma alternativa ganha espaço sem descartar o que funciona',
		loss: 'a novidade pode substituir um procedimento útil sem comparação',
		move: 'experimentar uma alteração pequena no procedimento'
	},
	neptune: {
		stake: 'a tradução de uma percepção em algo comunicável',
		condition: 'a ideia recebeu um exemplo que outras pessoas podem avaliar',
		gain: 'a sensibilidade se torna uma contribuição compreensível',
		loss: 'uma intenção valiosa pode ficar vaga para quem precisa da entrega',
		move: 'dar um exemplo concreto da percepção antes de apresentá-la'
	},
	pluto: {
		stake: 'a investigação da causa de um problema',
		condition: 'o problema foi delimitado sem controlar as pessoas envolvidas',
		gain: 'a análise profunda aponta uma mudança possível',
		loss: 'a investigação pode consumir a relação sem melhorar a tarefa',
		move: 'delimitar uma causa a investigar e uma mudança possível'
	}
};
const workloadRoles: typeof workRoles = {
	sun: {
		stake: 'a possibilidade de escolher onde usar sua energia',
		condition: 'há margem para escolher sem assumir mais trabalho',
		gain: 'uma escolha pequena pode preservar energia',
		loss: 'a escolha pode consumir a energia que deveria proteger',
		move: 'anotar uma escolha que pode esperar'
	},
	moon: {
		stake: 'a necessidade relatada de descanso',
		condition: 'o descanso tem espaço concreto na rotina',
		gain: 'a recuperação entra no planejamento',
		loss: 'a necessidade de descanso pode continuar sem espaço',
		move: 'reservar uma pausa possível sem criar outra obrigação'
	},
	mercury: {
		stake: 'a clareza sobre o que pesa agora',
		condition: 'a origem da carga foi descrita sem supor uma tarefa específica',
		gain: 'o registro permite distinguir causas da carga',
		loss: 'a carga pode continuar difícil de delimitar',
		move: 'registrar apenas o que consegue identificar como fonte de carga'
	},
	venus: {
		stake: 'o valor dado ao próprio tempo',
		condition: 'o critério de escolha considera o custo para você',
		gain: 'o tempo disponível entra na decisão',
		loss: 'um critério externo pode ocultar o custo pessoal',
		move: 'nomear uma atividade que pode aguardar, se houver'
	},
	mars: {
		stake: 'o impulso de agir e a condição de parar',
		condition: 'qualquer ação cabe na energia disponível',
		gain: 'o limite vem antes de uma iniciativa',
		loss: 'uma iniciativa pode aumentar a carga',
		move: 'definir quando interromper uma ação, se decidir realizá-la'
	},
	jupiter: {
		stake: 'a expectativa de ampliar possibilidades',
		condition: 'uma possibilidade nova não ocupa o tempo de recuperação',
		gain: 'a expansão pode ser adiada até haver margem',
		loss: 'a expansão pode virar mais uma exigência',
		move: 'deixar uma ideia nova para depois do descanso'
	},
	saturn: {
		stake: 'os limites de tempo e energia',
		condition: 'o limite observado orienta o que pode esperar',
		gain: 'a continuidade respeita a margem atual',
		loss: 'o esforço pode seguir acima da margem',
		move: 'distinguir o que tem prazo real do que pode esperar'
	},
	uranus: {
		stake: 'a possibilidade de mudar o ritmo',
		condition: 'a mudança reduz a carga sem criar custo maior',
		gain: 'uma pausa ou ajuste pode ser experimentado',
		loss: 'uma mudança apressada pode exigir energia adicional',
		move: 'considerar uma pausa ou ajuste reversível'
	},
	neptune: {
		stake: 'a percepção de cansaço ainda sem causa delimitada',
		condition: 'o cansaço foi acolhido sem exigir uma explicação imediata',
		gain: 'o descanso não depende de uma causa perfeitamente descrita',
		loss: 'a busca de explicação pode adiar o descanso',
		move: 'registrar o cansaço sem forçar uma causa'
	},
	pluto: {
		stake: 'a investigação da fonte da carga',
		condition: 'a investigação pode ser interrompida quando pesar demais',
		gain: 'uma causa possível fica visível sem exigência de resolvê-la agora',
		loss: 'investigar tudo pode aumentar o desgaste',
		move: 'anotar uma causa possível e deixar outras em aberto'
	}
};
const studyRoles: typeof workRoles = {
	sun: {
		stake: 'a escolha pessoal do que aprender',
		condition: 'você escolheu uma pergunta que deseja investigar',
		gain: 'o exercício informa seu interesse pela prática, além da ideia do curso',
		loss: 'a escolha do curso pode se apoiar só na imagem da área',
		move: 'formular uma pergunta própria antes de iniciar o exercício'
	},
	moon: {
		stake: 'o tempo e a energia disponíveis para aprender',
		condition: 'o exercício coube no tempo e na energia disponíveis',
		gain: 'o esforço observado pode ser comparado com a rotina real',
		loss: 'o cansaço pode ser confundido com falta de interesse',
		move: 'reservar uma duração curta e registrar o esforço ao terminar'
	},
	mercury: {
		stake: 'a compreensão do problema',
		condition: 'você compreendeu o pedido e a forma de conferir a resposta',
		gain: 'a dificuldade de conteúdo fica distinta da dificuldade de instrução',
		loss: 'um pedido mal compreendido pode parecer falta de aptidão',
		move: 'explicar o pedido com suas palavras e conferir um exemplo'
	},
	venus: {
		stake: 'o interesse pelo resultado produzido',
		condition: 'você identificou o que considera um resultado satisfatório',
		gain: 'a qualidade observada pode ser comparada entre as práticas',
		loss: 'o entusiasmo pela área pode esconder desinteresse pela tarefa',
		move: 'definir um critério simples de qualidade para o exercício'
	},
	mars: {
		stake: 'o início da prática e seu limite',
		condition: 'a primeira ação e o ponto de parada ficaram claros',
		gain: 'a prática começa sem exigir domínio prévio da área',
		loss: 'a tarefa pode crescer além do tempo disponível',
		move: 'executar uma primeira etapa curta e marcar onde parar'
	},
	jupiter: {
		stake: 'a vontade de ampliar o aprendizado',
		condition: 'a vontade de continuar veio depois de uma prática acessível',
		gain: 'o interesse em avançar ganha um exemplo vivido',
		loss: 'a promessa de progresso pode antecipar um compromisso caro',
		move: 'concluir um exemplo antes de decidir por uma formação maior'
	},
	saturn: {
		stake: 'a continuidade possível do estudo',
		condition: 'a duração e a frequência cabem na rotina',
		gain: 'a repetição pode ser avaliada sem exigir esforço indefinido',
		loss: 'um começo viável pode se tornar um compromisso insustentável',
		move: 'estimar o tempo de repetir a prática por algumas semanas'
	},
	uranus: {
		stake: 'a tentativa de outro modo de aprender',
		condition: 'a alternativa pôde ser comparada com o primeiro exercício',
		gain: 'uma mudança de método recebe evidência prática',
		loss: 'a novidade do método pode ser confundida com aprendizado',
		move: 'mudar apenas um passo e comparar o resultado'
	},
	neptune: {
		stake: 'a passagem de uma ideia para um exercício observável',
		condition: 'a ideia resultou em um exemplo que você consegue examinar',
		gain: 'a inspiração encontra uma forma de aprendizado verificável',
		loss: 'a expectativa pode continuar sem contato com a prática',
		move: 'produzir um exemplo pequeno e examinar o que ele mostra'
	},
	pluto: {
		stake: 'a investigação da dificuldade encontrada',
		condition: 'você distinguiu falta de instrução, acesso e prática',
		gain: 'a dificuldade aponta uma pergunta específica para aprender',
		loss: 'um obstáculo isolado pode virar julgamento sobre sua capacidade',
		move: 'nomear uma dificuldade e procurar a explicação mais próxima'
	}
};
const probeRoles: typeof workRoles = {
	sun: {
		...studyRoles.sun,
		stake: 'a escolha pessoal da atividade alternativa',
		condition:
			'a escolha foi ligada a uma etapa acessível da alternativa e a um critério de comparação com a atividade atual',
		gain: 'a experiência mostra onde sua participação aparece no resultado',
		loss: 'a imagem da área pode substituir a experiência com a tarefa',
		move: 'registrar por que quer testar a alternativa e qual resultado comparará com a atividade atual'
	},
	moon: {
		...studyRoles.moon,
		stake: 'o tempo e a energia para produzir a amostra',
		condition: 'a amostra coube no tempo e na energia disponíveis',
		gain: 'o esforço observado pode ser comparado com a atividade atual',
		loss: 'o cansaço pode ser confundido com desinteresse pela alternativa'
	},
	mercury: {
		...studyRoles.mercury,
		stake: 'a clareza da tarefa experimental',
		condition: 'você entendeu o que produzir e como conferir o resultado',
		gain: 'a dificuldade da tarefa fica distinta da falta de instrução',
		loss: 'uma tarefa vaga pode parecer falta de habilidade',
		move: 'descrever a amostra e um critério de conclusão em poucas linhas'
	},
	venus: {
		...studyRoles.venus,
		stake: 'a qualidade percebida na amostra',
		condition: 'você definiu um critério próprio de qualidade antes de comparar',
		gain: 'o resultado pode ser examinado sem presumir um cliente ou encomenda',
		loss: 'o entusiasmo com a alternativa pode encobrir o resultado obtido',
		move: 'definir o que tornaria a amostra satisfatória para este teste'
	},
	mars: {
		...studyRoles.mars,
		stake: 'o início da amostra e seu limite',
		condition: 'a primeira ação e o ponto de parada da amostra ficaram claros',
		gain: 'a prática começa sem exigir domínio prévio da atividade',
		loss: 'a amostra pode crescer além do tempo reservado',
		move: 'executar uma primeira etapa curta e marcar onde parar'
	},
	jupiter: {
		...studyRoles.jupiter,
		stake: 'a vontade de ampliar a atividade alternativa',
		condition: 'a vontade de continuar veio depois de uma amostra acessível',
		gain: 'o interesse em ampliar ganha um resultado vivido',
		loss: 'a promessa de mudança pode antecipar despesa ou compromisso',
		move: 'concluir uma amostra antes de investir numa atividade maior'
	},
	saturn: {
		...studyRoles.saturn,
		stake: 'a continuidade possível da atividade alternativa',
		condition: 'o tempo de repetir a amostra cabe na rotina',
		gain: 'a repetição pode ser comparada com as obrigações atuais',
		loss: 'um ensaio viável pode virar um compromisso insustentável',
		move: 'estimar o tempo de repetir a amostra por algumas semanas'
	},
	uranus: {
		...studyRoles.uranus,
		stake: 'a tentativa de outro modo de produzir',
		condition: 'a alternativa pôde ser comparada com o primeiro modo de fazer',
		gain: 'uma mudança de método recebe evidência na amostra',
		loss: 'a novidade do método pode ser confundida com melhora do resultado'
	},
	neptune: {
		...studyRoles.neptune,
		stake: 'a passagem de uma ideia para uma amostra observável',
		condition: 'a ideia resultou em uma amostra que você consegue examinar',
		gain: 'a inspiração encontra uma forma de contribuição verificável',
		loss: 'a expectativa pode continuar sem contato com a execução'
	},
	pluto: {
		...studyRoles.pluto,
		stake: 'a investigação da dificuldade encontrada na amostra',
		condition:
			'uma dificuldade da amostra foi distinguida de falta de acesso e de falta de prática',
		gain: 'a dificuldade aponta uma mudança pequena para testar',
		loss: 'uma dificuldade isolada pode ser tomada como juízo sobre a alternativa inteira',
		move: 'identificar um limite da etapa executada e uma pequena mudança para comparar'
	}
};
const probeRolesByKind: Record<NonNullable<CompassContext['probe']>['kind'], typeof workRoles> = {
	illustration: {
		...probeRoles,
		moon: {
			...probeRoles.moon,
			stake: 'o tempo para desenhar e revisar a imagem',
			condition: 'o rascunho coube no tempo disponível sem prometer revisões futuras',
			gain: 'o esforço observado corresponde ao desenho feito, não a uma encomenda',
			move: 'anotar separadamente o tempo do desenho e o de uma possível revisão'
		},
		mars: {
			...probeRoles.mars,
			stake: 'a execução do primeiro rascunho',
			move: 'desenhar uma imagem curta e marcar onde o rascunho termina'
		},
		venus: {
			...probeRoles.venus,
			stake: 'a clareza visual da ideia no rascunho',
			condition: 'você consegue apontar no desenho onde a ideia principal aparece',
			gain: 'a qualidade visual pode ser examinada no desenho disponível',
			move: 'comparar a frase da ideia com os elementos que desenhou'
		},
		saturn: {
			...probeRoles.saturn,
			stake: 'o tempo para produzir novos desenhos e revisá-los',
			condition: 'o tempo de uma revisão foi distinguido do tempo do primeiro rascunho',
			loss: 'um único rascunho pode parecer prova de uma rotina de ilustração',
			move: 'estimar uma revisão possível antes de prometer uma série de imagens'
		},
		jupiter: {
			...probeRoles.jupiter,
			stake: 'a vontade de ampliar a prática de ilustração',
			condition: 'a vontade de continuar veio depois de desenhar o rascunho',
			move: 'terminar um desenho antes de planejar um portfólio maior'
		}
	},
	ceramics: {
		...probeRoles,
		moon: {
			...probeRoles.moon,
			stake: 'o tempo do esboço e o esforço ainda desconhecido de modelar',
			condition: 'você separou o tempo do esboço do tempo futuro de modelagem, secagem e queima',
			gain: 'a margem observada vale apenas para a etapa realizada',
			loss: 'o custo da peça pronta pode desaparecer da comparação',
			move: 'registrar o tempo do esboço e deixar em aberto o custo das etapas materiais'
		},
		mars: {
			...probeRoles.mars,
			stake: 'a primeira etapa material que o acesso permite',
			condition: 'ficou explícito se havia argila e espaço para modelar',
			gain: 'o teste distingue planejar de trabalhar com a argila',
			loss: 'um desenho pode ser confundido com experiência de modelagem',
			move: 'desenhar a peça e modelar uma forma pequena somente com material e espaço'
		},
		venus: {
			...probeRoles.venus,
			stake: 'a qualidade da peça que ainda precisa ser observada',
			condition: 'você não atribuiu ao esboço a qualidade de uma peça modelada e queimada',
			gain: 'o critério de qualidade fica proporcional ao que foi feito',
			loss: 'a qualidade da peça pode ser afirmada sem que exista peça',
			move: 'avaliar a clareza do esboço e reservar o acabamento para um teste material'
		},
		saturn: {
			...probeRoles.saturn,
			stake: 'as condições para repetir a atividade material',
			condition: 'argila, secagem e acesso à queima foram verificados antes de falar em repetição',
			gain: 'o custo posterior aparece como limite do ensaio',
			loss: 'o tempo de um esboço pode ser tomado como custo de produção',
			move: 'listar material, espaço e queima antes de estimar uma rotina de produção'
		},
		jupiter: {
			...probeRoles.jupiter,
			stake: 'a vontade de ampliar a experiência com cerâmica',
			condition: 'o interesse pelo projeto foi distinguido do interesse por modelar',
			gain: 'a próxima etapa pode ser escolhida sem presumir habilidade material',
			loss: 'o entusiasmo com o esboço pode antecipar gasto em equipamento',
			move: 'verificar acesso à argila antes de planejar uma produção maior'
		}
	},
	consulting: {
		...probeRoles,
		moon: {
			...probeRoles.moon,
			stake: 'o tempo para analisar e revisar uma pergunta delimitada',
			condition: 'o tempo da página foi separado do tempo de um atendimento real',
			gain: 'o esforço da página pode ser observado sem prometer consultoria',
			loss: 'uma página curta pode ocultar o custo de atender e acompanhar',
			move: 'anotar o tempo da análise e o atendimento que ficou fora do ensaio'
		},
		mars: {
			...probeRoles.mars,
			stake: 'a decisão de limitar o escopo da análise',
			condition: 'a página termina antes de uma recomendação sem dados suficientes',
			gain: 'a ação produz uma análise delimitada sem promessa de serviço',
			loss: 'o teste pode virar atendimento sem acordo nem dados adequados',
			move: 'redigir uma página e marcar o que exigiria dados ou atendimento adicional'
		},
		venus: {
			...probeRoles.venus,
			stake: 'a utilidade e o limite da análise escrita',
			condition: 'a página apresenta um próximo passo e uma incerteza relevante',
			gain: 'o resultado escrito pode ser examinado sem inventar um cliente',
			loss: 'uma recomendação pode parecer sólida sem evidência suficiente',
			move: 'conferir se o próximo passo e a incerteza estão legíveis na página'
		},
		saturn: {
			...probeRoles.saturn,
			stake: 'a responsabilidade que uma consultoria futura exigiria',
			condition: 'atendimento e revisão foram separados da página inicial',
			gain: 'o custo do serviço permanece como hipótese a medir',
			loss: 'a análise curta pode ser confundida com serviço completo',
			move: 'listar as etapas de atendimento que a página não testou'
		},
		jupiter: {
			...probeRoles.jupiter,
			stake: 'a vontade de ampliar a oferta de consultoria',
			condition: 'a decisão de continuar veio depois da análise curta',
			move: 'revisar a página antes de prometer atendimento'
		}
	},
	other: probeRoles
};
const workScenes: Record<CompassContext['key'], string> = {
	workload: 'sobrecarga e necessidade de descanso relatadas',
	study: 'a escolha entre exercícios de aprendizagem antes de uma formação',
	leadership: 'uma entrega compartilhada com a equipe',
	independent: 'uma proposta própria limitada aos recursos atuais',
	transition: 'a comparação entre a atividade atual e uma alternativa',
	relationships: 'um acordo de trabalho com outras pessoas',
	general: 'uma tarefa já acessível no cotidiano'
};
const themeLenses: Record<
	CompassContext['key'],
	{
		contribution: string;
		motivation: string;
		environment: string;
		style: string;
		sustainability: string;
	}
> = {
	workload: {
		contribution: 'o que pode esperar antes de exigir uma contribuição nova',
		motivation: 'a recuperação da energia disponível',
		environment: 'as condições concretas para descansar',
		style: 'o registro da carga sem acrescentar outra tarefa',
		sustainability: 'a margem atual de tempo e energia'
	},
	study: {
		contribution: 'um exercício de aprendizagem concluído',
		motivation: 'o interesse observado depois da prática',
		environment: 'o acesso a orientação e tempo de estudo',
		style: 'uma pergunta de aprendizagem delimitada',
		sustainability: 'o tempo e o apoio exigidos pela aprendizagem'
	},
	leadership: {
		contribution: 'uma entrega da equipe com responsáveis definidos',
		motivation: 'a participação de cada pessoa na decisão',
		environment: 'os acordos sobre autonomia e apoio',
		style: 'a comunicação do pedido entre as pessoas',
		sustainability: 'a continuidade do acordo após a entrega'
	},
	independent: {
		contribution: 'uma proposta própria em pequena escala',
		motivation: 'o interesse em repetir a tarefa',
		environment: 'os recursos acessíveis sem despesa',
		style: 'a formulação de uma oferta delimitada',
		sustainability: 'o tempo necessário antes de prometer uma entrega'
	},
	transition: {
		contribution: 'a primeira amostra possível da alternativa',
		motivation: 'o interesse depois de experimentar a alternativa',
		environment: 'as condições de acesso às duas atividades',
		style: 'a definição de uma etapa que possa ser executada',
		sustainability: 'o custo de cada opção antes de decidir'
	},
	relationships: {
		contribution: 'uma entrega feita com outras pessoas',
		motivation: 'o reconhecimento da participação de cada pessoa',
		environment: 'os acordos de responsabilidade e apoio',
		style: 'a clareza da comunicação entre as partes',
		sustainability: 'a continuidade da cooperação após a entrega'
	},
	general: {
		contribution: 'uma tarefa acessível no cotidiano',
		motivation: 'o interesse em repetir essa tarefa',
		environment: 'as condições disponíveis agora',
		style: 'a definição de uma etapa pequena',
		sustainability: 'o esforço para repetir a entrega'
	}
};
const priorityImplications: Record<
	CompassContext['key'],
	Partial<
		Record<
			'contribution' | 'motivation' | 'environment' | 'working-style' | 'sustainability',
			string
		>
	>
> = {
	workload: {
		sustainability:
			'Se a carga já ultrapassa a energia disponível, a consequência é proteger o descanso antes de acrescentar trabalho. Se houver uma obrigação que possa mudar, investigue a possibilidade de reduzi-la.',
		environment:
			'Se outra pessoa puder participar de uma mudança, verifique primeiro sua disponibilidade real; a leitura não presume que esse apoio exista.'
	},
	study: {
		motivation:
			'O interesse por uma formação ganha peso quando sobrevive a um exercício concreto; gostar da ideia do curso, sozinho, não informa como será estudar.',
		'working-style':
			'Se houver dificuldade, diferencie instrução pouco clara, falta de orientação e interesse pela prática antes de julgar sua aptidão.'
	},
	leadership: {
		environment:
			'Sem autonomia e retorno combinados, uma entrega coletiva pode concentrar decisões numa pessoa e custo nas demais.',
		contribution:
			'A contribuição da equipe só pode ser atribuída com cuidado quando a responsabilidade por cada parte e o resultado comum estão visíveis.'
	},
	independent: {
		sustainability:
			'Uma proposta que exige recurso indisponível ou promessa antecipada precisa ser reduzida antes de servir como teste da atividade própria.',
		'working-style':
			'Delimitar o que será entregue protege tanto a iniciativa quanto a possibilidade de concluir sem assumir uma encomenda.'
	},
	transition: {
		contribution: '',
		environment: ''
	},
	relationships: {
		environment:
			'O acordo deve mostrar quem decide, quem executa e quem recebe o retorno; cooperação indefinida pode esconder carga desigual.',
		contribution:
			'O resultado comum precisa permitir reconhecer a contribuição de cada pessoa sem transformar vínculo em obrigação profissional.'
	},
	general: {
		contribution:
			'Se ninguém consegue identificar a utilidade da entrega, vale redefinir a tarefa antes de buscar outra direção.',
		motivation:
			'Interesse e repetição precisam ser observados em uma tarefa real, pois o nome de uma área ainda não mostra o cotidiano.'
	}
};
function compassDegree(value: number, edition: CompassEdition) {
	const rounded = value.toFixed(edition === 'v5' ? 2 : 1);
	return edition === 'v5' ? rounded : rounded.replace('.', ',');
}

function relation(
	g: FactGraph,
	a: Aspect,
	edition: CompassEdition,
	scope: 'work' | 'study' | 'probe' = 'work',
	probeKind: NonNullable<CompassContext['probe']>['kind'] = 'other'
) {
	const one = required(g, a.first),
		two = required(g, a.second);
	if (edition === 'v5') {
		const dynamic = {
			conjunction:
				'As funções entram juntas na cena; convém distinguir o que cada uma pede antes de responder de modo automático.',
			sextile:
				'Há uma possibilidade de cooperação que pede iniciativa. A facilidade só se torna recurso quando recebe uma tarefa concreta.',
			square:
				'Os procedimentos podem disputar a mesma decisão. Defina quando usar cada um, em vez de cobrar respostas simultâneas para necessidades diferentes.',
			trine:
				'A familiaridade entre os procedimentos pode facilitar a ação, mas também esconder hábitos sem revisão. Peça retorno sobre o resultado.',
			opposition:
				'As prioridades pedem negociação: dar todo o espaço a uma delas pode tornar invisível a necessidade da outra. Procure uma sequência ou um acordo.'
		}[a.kind];
		return `${label(one)} e ${label(two)} formam ${aspectNames[a.kind]} (orbe ${a.orb.toFixed(2)}°) e colocam em relação ${functions[a.first]} com ${functions[a.second]}. Um procedimento busca ${signMeanings[one.sign].method}; o outro, ${signMeanings[two.sign].method}. ${dynamic} Observe uma situação de trabalho em que essa combinação ajudou e outra em que atrapalhou. Se o contraste não aparecer na experiência, reduza o peso dessa hipótese; condições de trabalho e aprendizagem também explicam o resultado.`;
	}
	const individual = scope !== 'work';
	const roles =
		scope === 'study' ? studyRoles : scope === 'probe' ? probeRolesByKind[probeKind] : workRoles;
	const first = roles[a.first],
		second = roles[a.second];
	if (
		scope === 'probe' &&
		a.kind === 'conjunction' &&
		[a.first, a.second].sort().join(':') === 'mars:mercury'
	)
		return `${label(one)} e ${label(two)} formam ${aspectNames[a.kind]} (orbe ${compassDegree(a.orb, edition)}°). A clareza do pedido e o início da amostra chegam juntos. Observe se escrever um critério curto ajuda a começar ou se prolongar a formulação consome a janela de execução. Se a primeira ação não ocorrer, registre essa diferença e reduza a instrução antes da próxima tentativa; preserve o ponto de parada.`;
	const interpretation: Record<string, string> = {
		conjunction: `As duas exigências chegam à mesma decisão: ${first.stake} pode deixar ${second.stake} sem espaço. Uma etapa consiste em ${first.move}; a outra, em ${second.move}. Se a segunda parte ficar implícita, ${second.loss}.`,
		sextile: `A cooperação é uma possibilidade que depende de duas etapas: ${first.move}; depois, ${second.move}. A primeira condição a verificar é se ${first.condition}. Quando isso acontece, ${second.gain}. Sem a segunda etapa, ${second.loss}.`,
		square: `Se a tarefa privilegia ${first.stake} e deixa ${second.stake} sem definição, ${second.loss}. Se a prioridade se inverte, ${first.loss}. Separe as etapas: ${first.move}; depois, ${second.move}. Assim é possível observar qual exigência precisa de ${individual ? 'ajuste' : 'negociação'}.`,
		trine: `Articular ${first.stake} com ${second.stake} pode parecer fácil. A combinação ajuda em duas condições verificáveis: ${first.condition}; ${second.condition}. Nesse caso, ${first.gain} e ${second.gain}. Se uma condição faltar na tarefa real, ${second.loss}.`,
		opposition: `${individual ? 'As exigências podem disputar o mesmo tempo disponível.' : 'As exigências podem ficar em lados diferentes de um acordo.'} Se apenas ${first.stake} orientar a decisão, ${second.loss}; se apenas ${second.stake} prevalecer, ${first.loss}. Na primeira etapa, procure ${first.move}; na segunda, procure ${second.move}. O exercício ajuda a identificar o custo observado e o que ainda precisa ser avaliado.`
	};
	return `${label(one)} e ${label(two)} formam ${aspectNames[a.kind]} (orbe ${compassDegree(a.orb, edition)}°). ${interpretation[a.kind]}`;
}

function contextualRelation(g: FactGraph, a: Aspect, binding: CompassContext) {
	const scope = binding.key === 'study' ? 'study' : binding.key === 'transition' ? 'probe' : 'work';
	if (binding.key === 'workload' || binding.key === 'leadership') {
		const one = required(g, a.first);
		const two = required(g, a.second);
		const roles = binding.key === 'workload' ? workloadRoles : workRoles;
		const first = roles[a.first];
		const second = roles[a.second];
		const contact = `${label(one)} e ${label(two)} formam ${aspectNames[a.kind]} (orbe ${compassDegree(a.orb, 'latest')}°).`;
		if (binding.key === 'workload') {
			if (a.kind === 'trine' && [a.first, a.second].sort().join(':') === 'mars:moon')
				return `${contact} O contato liga energia disponível e vontade de agir, mas o cansaço relatado é o dado decisivo. Depois de descansar, confira se há margem para um registro opcional que possa ser interrompido. Se o registro cansar, pare e adie; a facilidade simbólica não prova recuperação.`;
			if (a.kind === 'square' && [a.first, a.second].sort().join(':') === 'jupiter:moon')
				return `${contact} A vontade de ampliar possibilidades pode disputar a margem necessária para descansar. Se toda a exploração for adiada por ora, o descanso pode ser preservado, mas a hipótese de crescimento continua sem teste; essa suspensão é aceitável até haver margem. Quando ela existir, escolha uma única observação breve, sem transformar o registro em obrigação.`;
			const interpretation: Record<Aspect['kind'], string> = {
				conjunction: `Na carga relatada, ${first.stake} pode se aproximar de ${second.stake}. Sem criar uma obrigação nova, observe duas possibilidades: ${first.move}; ${second.move}. Se observar isso aumentar o desgaste, pare; ${second.loss}.`,
				sextile: `Há uma hipótese de aliviar a carga ao ligar ${first.stake} a ${second.stake}. Confira se ${first.condition} e se ${second.condition}. Se faltar margem para observar agora, o descanso vem primeiro; ${second.loss}.`,
				square: `Pode haver atrito entre ${first.stake} e ${second.stake}. Se uma necessidade ocupar o espaço da outra, ${second.loss}; no sentido inverso, ${first.loss}. Se houver disposição depois de descansar, considere duas observações breves: ${first.move}; ${second.move}. O registro não precisa virar outra exigência.`,
				trine: `A relação sugere que ${first.stake} e ${second.stake} podem se apoiar. Essa possibilidade depende de duas condições: ${first.condition}; ${second.condition}. Se uma faltar, ${second.loss}. O contato do mapa não prova que a carga já diminuiu.`,
				opposition: `Pode ser difícil reservar espaço simultâneo para ${first.stake} e ${second.stake}. Se houver margem, experimente ${first.move} ou ${second.move}; escolha apenas uma observação breve. Se ambas exigirem energia que falta, adie o registro e priorize descanso.`
			};
			return `${contact} ${interpretation[a.kind]}`;
		}
		const interpretation: Record<Aspect['kind'], string> = {
			conjunction: `A equipe pode atribuir à mesma pessoa decisões sobre ${first.stake} e ${second.stake}. Distribua as decisões: quem responde por ${first.stake} e quem define ${second.stake}? Experimente ${first.move} e ${second.move} numa entrega delimitada, com retorno de quem participou.`,
			sextile: `Há uma possibilidade de cooperação entre ${first.stake} e ${second.stake}. Combine responsáveis antes da execução e confira se ${first.condition} e se ${second.condition}. Numa entrega pequena, peça a cada participante que descreva a parte assumida e o retorno recebido.`,
			square: `A entrega coletiva pode esconder desacordo entre ${first.stake} e ${second.stake}. Se a segunda exigência ficar sem responsável, ${second.loss}; se a primeira perder espaço, ${first.loss}. Antes da próxima entrega, teste duas ações: ${first.move}; ${second.move}. Depois, registre qual critério ficou sem acordo e quem arcou com o custo.`,
			trine: `A equipe pode combinar ${first.stake} com ${second.stake}. Essa cooperação precisa de uma distribuição visível de custo e responsabilidade. Antes de executar uma entrega real, confira duas condições: ${first.condition}; ${second.condition}. Se ela ocorrer, peça retorno sobre o resultado e identifique quem sustentou a colaboração; sem esse acordo, ${second.loss}.`,
			opposition: `O acordo pode separar ${first.stake} de ${second.stake} entre pessoas diferentes. Antes de executar, combine quem decide cada parte e registre onde cada participante precisou ceder. Se uma exigência ficar sem responsável, ${second.loss}.`
		};
		const pair = [a.first, a.second].sort().join(':');
		if (a.kind === 'square' && pair === 'saturn:venus')
			return `${contact} Um padrão de qualidade da entrega precisa caber no prazo e no escopo combinados. Antes de executar, peça que a equipe escolha uma revisão indispensável e registre quem pode autorizá-la. Se a revisão ultrapassar o prazo, renegocie o escopo com quem participa da decisão; não transfira silenciosamente esse custo para uma pessoa.`;
		if (a.kind === 'square' && pair === 'jupiter:moon')
			return `${contact} A vontade de ampliar a entrega pode consumir a margem de apoio da equipe. Escolha apenas uma ampliação pequena, identifique quem pode ajudar e meça a carga adicional antes de repeti-la. Se ninguém puder sustentar essa etapa, mantenha a entrega no tamanho já acordado.`;
		return `${contact} ${interpretation[a.kind]}`;
	}
	if (binding.key === 'study') {
		const one = required(g, a.first);
		const two = required(g, a.second);
		const first = studyRoles[a.first];
		const second = studyRoles[a.second];
		const contact = `${label(one)} e ${label(two)} formam ${aspectNames[a.kind]} (orbe ${compassDegree(a.orb, 'latest')}°).`;
		if (a.kind === 'trine' && [a.first, a.second].sort().join(':') === 'mars:moon')
			return `${contact} O contato liga a energia disponível ao ato de começar. Antes do primeiro exercício, marque um tempo e um ponto de parada; no segundo, confira se respeitar esse limite ajudou a compreender ou corrigir algo. Se o início consumir toda a margem, a facilidade inicial não demonstra que o curso cabe na rotina.`;
		const interpretation: Record<Aspect['kind'], string> = {
			conjunction: `A mesma prática pode reunir ${first.stake} e ${second.stake}. Compare dois exercícios curtos: no primeiro, ${first.move}; no segundo, ${second.move}. Separe interesse pela área, compreensão da instrução e esforço observado antes de escolher uma formação.`,
			sextile: `Há uma possibilidade de articular ${first.stake} com ${second.stake}. Verifique se ${first.condition} e se ${second.condition} durante dois exercícios acessíveis. Só trate a combinação como útil para aprender se conseguir apontar o que compreendeu ou corrigiu.`,
			square: `A prática pode pôr ${first.stake} em tensão com ${second.stake}. Se uma dificuldade aparecer, compare sua origem em dois exercícios: instrução, acesso, tempo ou conteúdo. Se apenas um obstáculo orientar a decisão, ${second.loss}. O resultado informa qual apoio ou ajuste investigar antes de escolher o curso.`,
			trine: `Na prática, ${first.stake} e ${second.stake} podem facilitar o início de um exercício. Confira se ${first.condition} e se ${second.condition}; uma sensação de facilidade não basta para concluir que o aprendizado pode ser repetido na rotina.`,
			opposition: `Na prática, ${first.stake} pode disputar tempo com ${second.stake}. Se o exercício escolhido revelar uma dificuldade, ela não prova desinteresse nem incapacidade. Compare duas práticas acessíveis, anote o que cada uma permitiu compreender e identifique se alguma orientação faltou antes de decidir sobre uma formação.`
		};
		return `${contact} ${interpretation[a.kind]}`;
	}
	if (binding.key === 'transition' && binding.probe) {
		const one = required(g, a.first);
		const two = required(g, a.second);
		const roles = probeRolesByKind[binding.probe.kind];
		const first = roles[a.first];
		const second = roles[a.second];
		const contact = `${label(one)} e ${label(two)} formam ${aspectNames[a.kind]} (orbe ${compassDegree(a.orb, 'latest')}°).`;
		const pair = [a.first, a.second].sort().join(':');
		if (binding.probe.kind === 'illustration') {
			if (a.kind === 'trine' && pair === 'mars:moon')
				return `${contact} O contato aproxima o tempo disponível para desenhar e a iniciativa de começar. Observe se consegue iniciar um rascunho e marcar um ponto de parada dentro de vinte minutos. Se ficar apenas na preparação, registre a condição que faltou; a facilidade sugerida pelo contato ainda não foi observada na execução.`;
			if (a.kind === 'square' && pair === 'saturn:venus')
				return `${contact} A clareza visual buscada pode pedir uma revisão que o tempo ou a ferramenta disponível não comporta. Aponte uma mudança concreta que tornaria a imagem mais clara e confira se conseguiria realizá-la com os recursos atuais. Se o recurso faltar, o limite é do teste; ele não mede aptidão para ilustrar.`;
			if (a.kind === 'square' && pair === 'jupiter:moon')
				return `${contact} O interesse em ampliar a prática pode ocupar a mesma margem usada para desenhar e revisar. Depois da amostra, escolha apenas uma variação futura e confira se ela caberia na rotina que preserva a renda atual. Se não couber, reduza o escopo antes de tratar expansão como próximo passo.`;
		}
		if (binding.probe.kind === 'ceramics' && a.kind === 'square' && pair === 'saturn:venus')
			return `${contact} A qualidade pretendida para uma peça depende de material, espaço e etapas que talvez ainda não estejam acessíveis. Verifique quais dessas condições estão acessíveis e, se houver, quais faltam antes de julgar o resultado do esboço. Sem modelagem e queima, a aparência planejada não demonstra a qualidade de uma peça pronta.`;
		if (binding.probe.kind === 'ceramics' && a.kind === 'square' && pair === 'jupiter:moon')
			return `${contact} A vontade de ampliar a experiência pode exceder o tempo reservado ao teste. Anote a duração real e confira se uma repetição caberia no tempo livre sem comprometer o emprego ou a renda; não inclua como executadas a secagem e a queima se ficaram apenas no plano. Se não houver margem, reduza o alcance da próxima tentativa.`;
		if (a.kind === 'trine' && pair === 'mars:moon')
			return `${contact} O contato aproxima o tempo disponível e a iniciativa de começar. Delimite uma etapa que você possa executar e anote onde precisou parar; depois compare duração e esforço reais. Se só houve planejamento, a facilidade de começar permanece uma hipótese.`;
		const interpretation: Record<Aspect['kind'], string> = {
			conjunction: `Na amostra, ${first.stake} se aproxima de ${second.stake}. Observe se uma exigência deixou espaço para a outra na etapa acessível. Se houver só plano, avalie sua clareza e os recursos necessários, sem inferir qualidade da prática.`,
			sextile: `Há uma possibilidade de ligar ${first.stake} a ${second.stake} na alternativa. Verifique qual ação tornou a segunda etapa possível e qual recurso ela exigiu. Sem execução, a cooperação continua uma hipótese.`,
			square: `Pode haver disputa entre ${first.stake} e ${second.stake} na amostra. Distinga falta de acesso, dificuldade de execução e custo observado; cada uma pede um ajuste diferente. Uma dificuldade isolada não decide a mudança de atividade.`,
			trine: `Na amostra, observe como ${first.stake} pode facilitar ${second.stake}. Registre o que de fato aconteceu na etapa acessível e onde foi necessário parar; um plano bem formulado ainda não mede a execução.`,
			opposition: `Na amostra, ${first.stake} e ${second.stake} podem puxar conclusões diferentes. Faça apenas a etapa delimitada se houver acesso; se não houver, registre o limite sem julgar aptidão. Preserve a atividade atual enquanto a comparação estiver incompleta.`
		};
		return `${contact} ${interpretation[a.kind]}`;
	}
	if (
		binding.key === 'transition' &&
		!binding.probe &&
		g.mc?.ruler === 'pluto' &&
		a.kind === 'sextile' &&
		[a.first, a.second].sort().join(':') === 'pluto:sun'
	) {
		return `${label(required(g, a.first))} e ${label(required(g, a.second))} formam sextil (orbe ${compassDegree(a.orb, 'latest')}°). A escolha da alternativa ganha base quando você liga um motivo pessoal a um problema que consegue investigar. Delimite a pergunta e execute a etapa acessível. Se aparecer um obstáculo, registre o limite desta amostra e uma pequena mudança possível para a próxima; se houver apenas plano, o teste ainda não informa o resultado da alternativa.`;
	}
	if (
		binding.key === 'transition' &&
		!binding.probe &&
		g.mc?.ruler === 'pluto' &&
		a.kind === 'square' &&
		[a.first, a.second].sort().join(':') === 'mercury:moon'
	) {
		return `${label(required(g, a.first))} e ${label(required(g, a.second))} formam quadratura (orbe ${compassDegree(a.orb, 'latest')}°). A investigação em profundidade sugerida pela Lua pode disputar o tempo de explicar o achado, função de Mercúrio. Se a etapa terminar com dados que não cabem numa explicação curta, ou com uma explicação sem investigação realizada, a amostra ainda não mostra uma contribuição comunicável. Uma etapa delimitada ajuda a reconhecer esse limite sem julgar a qualidade da contribuição possível.`;
	}
	return relation(g, a, 'latest', scope, binding.probe?.kind);
}

export function composeReconstructedCompass(
	input: WorkflowInput,
	c: CalculationSnapshot,
	edition: CompassEdition = 'latest'
): TrialReading {
	assertCompassProjection(input, c);
	const g = normalizeFactGraph(c),
		data = c.data as unknown as CompassData;
	if (!g.mc || !g.mc.ruler) throw Error('Meio do Céu e regente necessários.');
	const sun = required(g, 'sun'),
		moon = required(g, 'moon'),
		mercury = required(g, 'mercury'),
		venus = required(g, 'venus'),
		mars = required(g, 'mars'),
		jupiter = required(g, 'jupiter'),
		saturn = required(g, 'saturn'),
		ruler = required(g, g.mc.ruler);
	const direction = signMeanings[g.mc.sign],
		authorship = signMeanings[sun.sign],
		security = signMeanings[moon.sign],
		thinking = signMeanings[mercury.sign],
		action = signMeanings[mars.sign],
		values = signMeanings[venus.sign],
		regency = signMeanings[ruler.sign];
	const binding = compassContext(input.context, edition);
	const selected = compassSelection(g, edition),
		core = unique([...g.mc.factIds, sun.factId, ruler.factId, 'compass-ruler-house']);
	const sections: TrialReading['sections'] = [],
		plan: EditorialTrace['plan'] = [];
	const add = (title: string, text: string, factIds: string[], role: string) => {
		const ids = unique(factIds);
		sections.push({ title, text, factIds: ids });
		plan.push({ title, factIds: ids, role });
	};
	const angular = data.angular.length
		? data.angular
				.map(
					(a) =>
						`${bodyNames[a.body]} está a ${compassDegree(a.orb, edition)}° do MC: a função de ${functions[a.body]} recebe destaque angular`
				)
				.join('; ')
		: 'A direção será articulada pelo signo do MC, seu regente e os fatores pessoais';
	const scene = binding.scene ?? workScenes[binding.key];
	const contextualRoles =
		binding.key === 'workload'
			? workloadRoles
			: binding.key === 'study'
				? studyRoles
				: binding.key === 'transition'
					? probeRolesByKind[binding.probe?.kind ?? 'other']
					: workRoles;
	const primary = selected[0]?.aspect;
	const opportunity = selected.find(({ aspect }) =>
		['trine', 'sextile', 'conjunction'].includes(aspect.kind)
	)?.aspect;
	const tension = selected.find(({ aspect }) =>
		['square', 'opposition'].includes(aspect.kind)
	)?.aspect;
	const relationCostByContext: Record<CompassContext['key'], string> = {
		workload:
			'Se a carga continuar acima da margem disponível, priorize descanso e identifique, se possível, o que pode esperar ou diminuir.',
		study:
			'Se o exercício exigir mais tempo ou orientação do que você tem agora, registre a condição que falta antes de escolher uma formação.',
		leadership:
			'Se o avanço depender de uma pessoa decidir ou sustentar a entrega por todas, revise responsáveis e apoio antes da próxima rodada.',
		independent:
			'Se a primeira amostra exigir gasto ou compromisso antecipado, reduza seu alcance antes de avaliar a proposta.',
		transition:
			'Se apenas o plano for acessível, ele permite avaliar clareza e recursos, mas ainda não mostra o custo de executar a alternativa.',
		relationships:
			'Se a entrega esconder carga desigual, torne visíveis as responsabilidades antes de repetir o acordo.',
		general:
			'Se o resultado depender de esforço que não pode ser repetido, diminua a tarefa antes de ampliar a hipótese.'
	};
	const relationRevisionByContext: Record<CompassContext['key'], string> = {
		workload:
			'Uma obrigação negociável pode ter prazo ou distribuição revistos quando houver condições para essa conversa.',
		study:
			'Se os exercícios mostrarem interesses ou dificuldades diferentes, reveja a pergunta de aprendizagem antes de escolher o curso.',
		leadership:
			'Se o retorno da equipe contrariar a hipótese, ajuste o acordo de decisão e apoio antes de repetir a entrega.',
		independent:
			'Se a amostra não couber nos recursos disponíveis, reduza a proposta e verifique o acesso que falta.',
		transition:
			'Se a etapa acessível não confirmar a hipótese, mantenha a alternativa em aberto e preserve a atividade atual.',
		relationships:
			'Se as pessoas descrevem responsabilidades diferentes, reveja o acordo antes de continuar.',
		general:
			'Se a tarefa produzir um resultado diferente do esperado, ajuste a hipótese ao que pôde observar.'
	};
	const relationSynthesis =
		binding.key === 'workload'
			? `Os contatos selecionados sugerem perguntas sobre energia, limites e descanso; não identificam por si mesmos a causa da sobrecarga nem uma obrigação a mudar. ${relationCostByContext.workload}`
			: binding.key === 'study' && opportunity && tension
				? `A facilidade de começar sugerida por ${bodyNames[opportunity.first]} e ${bodyNames[opportunity.second]} só ajuda a escolher uma formação se os exercícios couberem no tempo disponível e mostrarem o que foi compreendido ou onde faltou orientação. ${relationCostByContext.study}`
				: opportunity && tension
					? `A cooperação entre ${bodyNames[opportunity.first]} e ${bodyNames[opportunity.second]} só ajuda numa decisão profissional se o limite indicado por ${bodyNames[tension.first]} e ${bodyNames[tension.second]} também couber na tarefa. ${relationCostByContext[binding.key]}`
					: opportunity
						? 'Os recursos descritos podem facilitar uma entrega, mas sua repetição ainda depende de tempo, acesso e apoio reais.'
						: 'As tensões descritas pedem uma negociação de tarefas e limites; elas não determinam uma ocupação nem um resultado.';
	const contextualSynthesis =
		binding.key === 'transition' && binding.probe?.kind === 'illustration'
			? `Em conjunto, os contatos pedem três verificações diferentes na ilustração editorial: se o rascunho começou dentro do tempo combinado, qual revisão parece necessária e, se foi realizada, o que mudou e quanto exigiu. Se uma pessoa puder ver a amostra, peça apenas que diga o que entendeu; esse retorno testa comunicação, não aceitação profissional. Anote tempo e esforço; compare com uma tarefa conhecida ${binding.currentActivity ? `do seu trabalho ${binding.currentActivity}` : 'da sua atividade atual'} somente se duração e condições forem semelhantes. Preserve ${binding.constraint ?? 'a atividade atual'}. Se só houver plano ou faltar ferramenta, a qualidade e o custo da execução ficam em aberto.`
			: binding.key === 'transition' && binding.probe?.kind === 'ceramics'
				? `Em conjunto, os contatos separam o que o esboço mostrou do que modelagem, secagem e queima ainda exigem. Registre material e espaço disponíveis, tempo da etapa realmente feita e o que não foi executado. Compare com uma tarefa do emprego atual somente se duração e condições forem semelhantes; se só o desenho foi possível, não deduza qualidade, utilidade nem custo de repetir uma peça pronta. Preserve ${binding.constraint ?? 'a atividade atual'} enquanto testa o acesso às etapas seguintes.`
				: binding.key === 'transition' && !binding.probe && ruler.body === 'pluto'
					? `Nesta comparação, a relação entre Sol e Plutão orienta a escolher um problema delimitado na alternativa e investigar o que o sustenta, sem presumir que seja sua função resolvê-lo. Lua e Mercúrio pedem que você anote o que precisa compreender antes de agir; Mercúrio e Marte põem à prova se um critério curto ajuda a iniciar a amostra ou consome o tempo de execução. Registre o resultado que conseguiu explicar e uma condição da atividade atual que não pode ser inferida dessa amostra. Se a investigação não produzir um passo observável, reduza a pergunta antes de repetir o teste.`
					: binding.key === 'workload'
						? `${relationSynthesis} Mesmo que uma relação sugira iniciativa, o cansaço informado prevalece na decisão imediata: uma pausa ou o adiamento do registro são resultados válidos. ${relationRevisionByContext.workload}`
						: binding.key === 'study'
							? `Na escolha de uma formação, observe separadamente o que foi compreendido em cada exercício, se o interesse mudou após uma correção possível e qual orientação foi necessária ou faltou no segundo exercício. ${relationRevisionByContext.study}`
							: binding.key === 'leadership'
								? `${relationSynthesis} A hipótese de contribuição da equipe depende de um acordo visível sobre decisão, prazo, revisão e apoio; uma entrega comum não prova que o custo foi distribuído. ${relationRevisionByContext.leadership}`
								: `${relationSynthesis} ${binding.probe ? `Para ${scene}, o resultado a procurar é ${binding.probe.criterion}. Antes de tratar a amostra como prática da atividade, verifique o acesso a ${binding.probe.access}. ${binding.currentActivity ? `Compare duração e esforço com uma tarefa conhecida do seu trabalho ${binding.currentActivity}, sem presumir renda equivalente.` : 'Antes da comparação, identifique uma tarefa concreta da atividade atual com duração semelhante.'}${binding.constraint ? ` O teste preserva ${binding.constraint}; ele não demonstra viabilidade de substituição da atividade atual.` : ''}` : `Para ${scene}, verifique a hipótese no teste proposto: ${binding.task}.`} ${relationRevisionByContext[binding.key]}`;
	const chapterOpeningByContext: Record<CompassContext['key'], string> = {
		workload:
			'O cansaço que você relatou muda a ordem desta leitura: primeiro descanso e espaço para reduzir a carga, depois qualquer exploração de outra atividade. O mapa não identifica a causa da sobrecarga. Se houver margem mais adiante, uma observação breve pode ajudar a nomear um limite sem criar outra obrigação.',
		study:
			'O interesse por uma formação precisa sobreviver ao contato com a prática. Dois exercícios curtos podem mostrar o que você compreende, se precisou de orientação e se há tempo para repetir o aprendizado. Uma dificuldade inicial não define sua capacidade nem decide o curso.',
		leadership:
			'Numa entrega de equipe, autonomia perde valor quando uma pessoa assume sozinha decisões, execução e custo. Antes de iniciar a entrega, esclareça quem decide, quem faz e quem oferece apoio. O resultado comum só permite avaliar sua contribuição se essas partes forem visíveis.',
		independent:
			'Uma proposta própria começa pelo tamanho que seus recursos permitem entregar. Esboce uma amostra pequena e confira o custo de realizá-la antes de prometer expansão; a primeira resposta do público não mede a rotina de atender a novas demandas.',
		transition:
			binding.probe?.kind === 'illustration'
				? `Experimentar ilustração editorial enquanto preserva ${binding.constraint ?? 'a atividade atual'} começa por um rascunho que torne uma ideia visível. Desenhar, revisar e pedir retorno são etapas diferentes: cada uma informa uma parte da hipótese, sem demonstrar renda na nova atividade.`
				: binding.probe?.kind === 'ceramics'
					? `Experimentar cerâmica enquanto preserva ${binding.constraint ?? 'a atividade atual'} começa por distinguir a peça imaginada da peça feita. Um esboço revela intenção e recursos necessários; modelagem, secagem e queima só informam a prática quando forem acessíveis e executadas.`
					: ruler.body === 'pluto'
						? 'A comparação entre a atividade atual e uma alternativa pode começar por um problema delimitado na nova tarefa. Investigue o que o sustenta, escreva um critério curto e veja se consegue iniciar e explicar uma etapa concreta. Essa amostra ainda não revela a rotina inteira da alternativa.'
						: 'Comparar a atividade atual com uma alternativa pede uma tarefa observável de cada lado. Primeiro registre o resultado e o custo da etapa que consegue executar; depois identifique o acesso que falta antes de considerar uma mudança.',
		relationships:
			'Numa entrega compartilhada, um resultado útil pode esconder uma divisão desigual do trabalho. Identifique a contribuição, a responsabilidade e o retorno de cada pessoa antes de decidir se o acordo merece continuidade.',
		general:
			'A direção profissional fica mais clara quando uma tarefa já disponível produz utilidade reconhecível sem exigir um custo impossível de repetir. Comece pelo resultado concreto e pela sua margem atual; o nome de uma profissão vem depois da observação.'
	};
	const primaryOpening = (() => {
		if (!primary)
			return 'A contribuição sugerida pelo mapa ainda depende do resultado, do custo e das condições reais da tarefa.';
		const pair = [primary.first, primary.second].sort().join(':');
		if (primary.kind === 'trine' && pair === 'mars:moon') {
			if (binding.key === 'workload')
				return 'O trígono entre Lua e Marte sugere que a iniciativa pode ser ajustada à energia disponível. Diante do cansaço relatado, a possibilidade de agir não reduz a necessidade de descanso nem revela a causa da sobrecarga.';
			if (binding.key === 'study')
				return 'O trígono entre Lua e Marte sugere que uma prática curta pode mostrar a relação entre interesse, energia e iniciativa. O resultado só ajuda na escolha se houver tempo e orientação para compreender e repetir o exercício.';
			if (binding.key === 'leadership')
				return 'O trígono entre Lua e Marte sugere que a iniciativa pode ganhar força quando carga e apoio são combinados antes da entrega. Se decisão e custo recaírem sobre uma só pessoa, o resultado comum não demonstra cooperação.';
			if (binding.key === 'transition' && binding.probe?.kind === 'ceramics')
				return 'O trígono entre Lua e Marte relaciona o ritmo necessário à iniciativa de testar a cerâmica. O desenho mostra a intenção; a relação com o fazer material ainda depende de argila, espaço e tempo para modelar.';
			if (binding.key === 'transition' && binding.probe?.kind === 'illustration')
				return 'O trígono entre Lua e Marte sugere energia para transformar uma ideia num primeiro rascunho com tempo definido. A qualidade visual e o retorno de um leitor ainda dependem da imagem feita e examinada.';
		}
		if (primary.kind === 'sextile' && pair === 'pluto:sun' && binding.key === 'transition')
			return 'O sextil entre Sol e Plutão sugere uma ligação entre escolher uma alternativa e investigar um problema delimitado. Uma dificuldade da amostra precisa ser separada de falta de acesso ou prática antes de sustentar qualquer juízo sobre a alternativa.';
		return `O contato entre ${bodyNames[primary.first]} e ${bodyNames[primary.second]} relaciona ${contextualRoles[primary.first].stake} com ${contextualRoles[primary.second].stake}. Sua importância para a escolha depende do que a tarefa permite observar e das condições disponíveis.`;
	})();
	add(
		'Uma direção para comparar com a vida real',
		edition === 'v5'
			? `A direção sugerida pelo MC em ${signs[g.mc.sign]} é ${direction.contribution}. Ela ganha um meio de execução em ${label(ruler)}: ${procedures[ruler.body]}, com atenção a ${regency.method}. ${label(sun)} acrescenta a necessidade de ${authorship.motivation}. A hipótese central é combinar uma contribuição útil a outras pessoas com um modo de fazê-la que preserve sua participação e possa ser repetido nas condições atuais.\n\n${angular}. ${selected[0] ? `Um vínculo que modifica essa hipótese será examinado adiante: ${bodyNames[selected[0].aspect.first]} e ${bodyNames[selected[0].aspect.second]} articulam as funções de ${functions[selected[0].aspect.first]} e de ${functions[selected[0].aspect.second]}.` : 'Os procedimentos abaixo devem ser avaliados pelo resultado e pelo custo.'} Comece por uma atividade que você já conhece: observe se o resultado ajudou alguém, se o procedimento funcionou e se o custo foi sustentável. Uma divergência entre esses três pontos pede ajuste da tarefa ou do ambiente, sem obrigar você a sustentar uma identidade profissional.`
			: `${chapterOpeningByContext[binding.key]}\n\nO Meio do Céu em ${signs[g.mc.sign]} sugere ${direction.contribution}; seu regente, ${label(ruler)}, oferece o procedimento de ${procedures[ruler.body]}. ${label(sun)} acrescenta a necessidade de ${authorship.motivation}. ${angular}. ${primaryOpening}`,
		unique([
			...core,
			...data.angular.map((a) => a.factId),
			...(selected[0] ? [selected[0].aspect.factId] : [])
		]),
		'integrated-compass'
	);
	add(
		'Contribuição: do ângulo à entrega',
		`O Meio do Céu está em ${signs[g.mc.sign]}, a ${compassDegree(g.mc.longitude % 30, edition)}° do signo. Sua direção simbólica é ${direction.contribution}; uma entrega útil começa quando você identifica para quem isso faz diferença e como reconhecer essa utilidade. A regência moderna liga esse ângulo a ${label(ruler)} e ao procedimento de ${procedures[ruler.body]}.\n\n${data.regent.house === null ? 'A casa do regente está indisponível; o local de expressão dessa função permanece em aberto.' : `O regente ocupa a casa ${data.regent.house}, associada a ${houseAreas[data.regent.house - 1]}. Use esse campo como lugar possível de observação: procure uma atividade já vivida ali e veja como sua contribuição apareceu.`} O signo do regente qualifica o modo: ${regency.method}. Isso não escolhe uma ocupação. Compare tarefas concretas de diferentes atividades e pergunte qual delas permite produzir um resultado que outra pessoa consiga reconhecer, dentro dos recursos a que você tem acesso.`,
		core,
		'contribution'
	);
	add(
		'Motivação: autoria, segurança e valor',
		`${edition === 'v5' ? `${label(sun)} propõe ${authorship.motivation} como fonte de participação` : `${label(sun)} indica a necessidade de ${authorship.motivation}`}; ${label(moon)} acrescenta ${security.motivation} como condição de segurança; ${label(venus)} pede atenção ao valor de ${values.contribution}. Essas três funções podem ser atendidas numa mesma atividade, mas cada uma faz uma pergunta diferente: tenho espaço para participar, consigo sustentar a experiência e considero útil o que estou fazendo?\n\n${sun.sign === moon.sign ? 'Sol e Lua compartilham o signo: a direção da autoria e a busca de segurança usam um vocabulário próximo. Essa convergência pode facilitar o início, sem dispensar o retorno de outras pessoas.' : `Sol e Lua usam procedimentos diferentes: ${authorship.method}, para participar, e ${security.method}, para obter segurança. Reserve espaço para ambos; interesse não elimina a necessidade de apoio e previsibilidade.`} Relembre uma tarefa que motivou você e uma que consumiu energia apesar do reconhecimento. Diferencie o conteúdo da tarefa, as relações e as condições de execução antes de atribuir a diferença a uma vocação.`,
		[sun.factId, moon.factId, venus.factId],
		'motivation'
	);
	add(
		'Ambientes: condições que permitem contribuir',
		`${edition === 'v5' || direction.environment !== security.environment ? `A direção do MC pode ser favorecida em contextos com ${direction.environment}. A Lua acrescenta a necessidade de ${security.environment}; Mercúrio, a de ${thinking.environment}.` : `MC e Lua apontam para a mesma condição de ambiente: ${direction.environment}. Ela pode favorecer a visibilidade da contribuição e o apoio necessário para sustentá-la, duas funções a verificar separadamente. ${thinking.environment === direction.environment ? 'Mercúrio recorre à mesma condição para tratar da circulação da informação.' : `Mercúrio acrescenta a necessidade de ${thinking.environment}.`}`} Essas são condições a investigar em atividades e organizações reais: descreva como as decisões são tomadas, como se pede ajuda, como circulam as informações e que autonomia acompanha a responsabilidade.\n\n${label(saturn)} propõe ${signMeanings[saturn.sign].method} para dar continuidade. Compare o ambiente imaginado com o disponível: uma tarefa interessante pode se tornar inviável quando faltam tempo, apoio, remuneração suficiente ou condições de saúde. Liste uma condição indispensável e uma negociável. Busque evidência em experiências anteriores ou numa conversa acessível sobre o trabalho concreto; um nome de cargo, sozinho, não informa como o cotidiano funciona.`,
		[...g.mc.factIds, moon.factId, mercury.factId, saturn.factId],
		'environment'
	);
	add(
		'Modo de trabalhar: pensar, iniciar e concluir',
		`${edition === 'latest' && mercury.sign === mars.sign ? `Mercúrio e Marte compartilham o signo de ${signs[mercury.sign]} e o procedimento de ${thinking.method}. Mercúrio o aplica à formulação e à comunicação do problema; Marte, ao início da ação e à defesa dos limites. Separe essas duas funções numa tarefa curta para conferir a compreensão antes de agir.` : `${label(mercury)} simboliza um modo de pensar e comunicar: ${thinking.method}. ${label(mars)} indica um modo de iniciar e defender limites: ${action.method}. A sequência prática é explicitar o problema, escolher uma ação pequena e combinar o critério de conclusão. ${mercury.sign === mars.sign ? 'Os dois fatores compartilham o signo; pensar e agir podem seguir um procedimento semelhante. Inclua uma pausa de conferência para não confundir rapidez com compreensão.' : `Como os procedimentos diferem, dê a cada função um momento: primeiro organize a informação do modo proposto por Mercúrio; depois inicie uma ação delimitada do modo indicado por Marte.`}`}\n\nExperimente essa sequência numa tarefa já disponível. Registre o que ficou mais claro e onde foi necessário pedir ajuda ou renegociar o limite. Se o procedimento tornar a tarefa mais lenta sem melhorar o resultado, simplifique-o. Se faltar conhecimento técnico, a próxima ação pode ser aprender ou buscar orientação; o mapa não comprova habilidade nem dispensa formação.`,
		[mercury.factId, mars.factId, sun.factId],
		'working-style'
	);
	add(
		'Tensões e recursos: três relações em contexto',
		selected.length
			? edition === 'v5'
				? selected.map((s) => relation(g, s.aspect, edition)).join('\n\n') +
					'\n\nA seleção prioriza funções pessoais, regente do MC, vínculos com os cinco temas, prioridades do contexto e proximidade do aspecto. Esses pesos organizam a leitura; não medem a importância objetiva de um traço ou acontecimento. Escolha a relação que encontra um exemplo claro e deixe as demais como hipóteses.'
				: `${binding.key === 'workload' ? `Na situação de ${scene}, os contatos sugerem perguntas sobre os limites; não explicam o cansaço relatado.` : `Para ${scene}, os contatos abaixo propõem consequências profissionais a verificar.`}\n\n${selected.map((s) => contextualRelation(g, s.aspect, binding)).join('\n\n')}\n\n${contextualSynthesis}`
			: 'Compare a contribuição que deseja oferecer com o modo de pensar, agir e buscar segurança descrito acima. Uma dificuldade pode vir da tarefa, da aprendizagem ou das condições do ambiente. Registre um exemplo e uma alternativa de procedimento antes de atribuir a tensão a uma característica permanente. A ausência de contato selecionado não elimina conflitos nem garante facilidade.',
		selected.length
			? unique(
					selected.flatMap((s) => [
						s.aspect.factId,
						required(g, s.aspect.first).factId,
						required(g, s.aspect.second).factId
					])
				)
			: [sun.factId, moon.factId, mercury.factId, mars.factId],
		'selected-relations'
	);
	add(
		'Sustentação: crescer sem ultrapassar os recursos',
		`${label(jupiter)} oferece a hipótese de ${signMeanings[jupiter.sign].contribution}, por meio de ${signMeanings[jupiter.sign].method}. ${label(saturn)} contrapõe o trabalho de ${signMeanings[saturn.sign].contribution}; seu procedimento é ${signMeanings[saturn.sign].method}. Crescimento e continuidade precisam de uma negociação concreta: o que vale ampliar, o que cabe manter e qual limite protege a qualidade da entrega?\n\nO excesso a observar em Júpiter é ${signMeanings[jupiter.sign].cost}; em Saturno, ${signMeanings[saturn.sign].cost}. Considere tempo, recursos, saúde, responsabilidades e oportunidades reais. Defina um teto de esforço e uma condição de parada antes do teste. Se a margem atual for pequena, reduzir escopo ou adiar pode ser a escolha coerente. Uma limitação de acesso não demonstra falta de propósito, disposição ou mérito.`,
		[jupiter.factId, saturn.factId, mars.factId],
		'sustainability'
	);
	add(
		'Seu contexto: transformar a pergunta em critérios',
		`${input.context ? `Você informou: “${input.context}”\n\nEsse relato define a pergunta a investigar; a leitura não acrescenta uma profissão, uma intenção de mudança ou uma condição que você não declarou.` : 'Nenhum contexto profissional foi informado. Escolha uma situação concreta antes de aplicar a leitura: uma tarefa atual, um projeto acessível ou uma dúvida sobre o cotidiano do trabalho.'}\n\nPara essa situação, compare três critérios: a utilidade de ${direction.contribution} para alguém; a possibilidade de ${procedures[ruler.body]} com os recursos atuais; e o custo de um procedimento voltado a ${regency.method} quando surgem exigências do ambiente. Escreva um exemplo favorável e um limite para cada critério. Se sua pergunta envolver uma decisão ampla, reduza-a a uma informação que ainda falta ou a uma tarefa reversível. Contexto, necessidades materiais e preferência pessoal podem fazer você escolher outro caminho, mesmo quando a hipótese simbólica parece atraente.`,
		unique([...core, ...(g.contextFactId ? [g.contextFactId] : [])]),
		'reported-context'
	);
	add(
		'Um experimento privado de vinte minutos',
		`Reserve até vinte minutos para uma tarefa já acessível, sem despesa e sem compromisso público. A hipótese é: “${direction.contribution} pode ser útil quando uso este procedimento: ${regency.method}”. Use o procedimento de ${procedures[ruler.body]}. Como ponto de partida, ${direction.test}. Adapte a proposta a uma ação pequena que possa interromper ou desfazer.\n\nAntes, registre o resultado esperado, o tempo disponível e uma condição que faria você parar. Depois, anote o que produziu, quem poderia se beneficiar e qual parte exigiu ajuda. Procure uma evidência contrária: a tarefa trouxe pouco valor, o procedimento aumentou o esforço ou o ambiente impediu a execução? Nenhum desses resultados precisa ser corrigido para caber no mapa. Escolha continuar, ajustar, adiar ou abandonar a hipótese. Se a tarefa envolver outras pessoas, combine a participação e o retorno; observar algo sozinho também é uma opção válida.`,
		core,
		'reversible-experiment'
	);
	const closingByContext: Record<CompassContext['key'], string> = {
		workload: binding.deferredAlternative
			? `Nesta situação, priorize descanso e observe, se puder, o que pode esperar ou diminuir. Se houver uma obrigação negociável, considere pedir sua redução; se não houver margem, adie o registro. Só quando houver margem, uma pequena etapa para explorar ${binding.deferredAlternative} pode ser considerada preservando ${binding.constraint}; isso ainda não demonstra viabilidade de mudança.`
			: 'Nesta situação, priorize descanso e observe, se puder, o que pode esperar ou diminuir. Se houver uma obrigação negociável, considere pedir sua redução; se não houver margem, adie o registro.',
		study:
			'Uma formação merece nova consideração se os dois exercícios mantiverem o interesse depois da prática e houver tempo para repetir o aprendizado, com orientação acessível quando ela for necessária. Uma dificuldade inicial pode pedir orientação, mudança do exercício ou mais familiaridade; sozinha, não permite concluir sobre vocação.',
		leadership:
			'O plano fica pronto para teste quando decisões, responsáveis, apoio e retorno estão claros; isso ainda não mostra como a equipe agirá. Se uma entrega real ocorrer depois, compare o acordo com o trabalho realizado e reveja qualquer carga concentrada numa pessoa.',
		independent:
			'A proposta própria pode avançar apenas no tamanho que os recursos e o tempo disponíveis sustentem. Se a amostra exigir uma promessa ou gasto antecipado, reduza a oferta antes de avaliar sua continuidade.',
		transition:
			binding.probe?.kind === 'illustration'
				? `Uma amostra de ilustração permite examinar se a ideia pretendida aparece no rascunho e qual revisão seria necessária. Conte o tempo de desenhar e, se houver, da revisão; se houver retorno de outra pessoa, use o que ela compreendeu da imagem, sem tratá-lo como aprovação comercial. Compare esse esforço com uma tarefa conhecida ${binding.currentActivity ? `do seu trabalho ${binding.currentActivity}` : 'da atividade atual'} somente se duração e condições forem semelhantes; de outro modo, registre apenas o custo observado. Preserve ${binding.constraint ?? 'a atividade atual'}. Um rascunho ainda não demonstra renda ou rotina de uma nova profissão.`
				: binding.probe?.kind === 'ceramics'
					? `O esboço permite avaliar a intenção da peça e os materiais necessários. A modelagem, a secagem e a queima precisam ser registradas separadamente quando forem acessíveis; não atribua ao desenho o tempo ou a qualidade dessas etapas. Avalie somente a etapa alcançada, os recursos usados ou eventualmente indisponíveis e o custo observado. Compare com o emprego apenas se houver tarefa de duração e condições equivalentes; preserve ${binding.constraint ?? 'a atividade atual'}. Uma peça planejada ainda não mostra o custo de repetir a produção.`
					: !binding.probe && ruler.body === 'pluto'
						? 'Continue a comparação somente se conseguir delimitar um problema na alternativa, iniciar uma etapa com um critério curto e explicar o resultado observado. Se a formulação ocupar todo o tempo ou faltar acesso, registre esse limite; ainda não há base para comparar a rotina completa da alternativa com a atividade atual.'
						: `A referência de tempo é uma tarefa concreta da atividade atual, a ser identificada antes do teste. Um plano da alternativa permite verificar clareza e condições de acesso; só uma etapa efetivamente executada permite observar qualidade, utilidade e esforço dessa etapa. Mesmo quando a execução ocorre, a amostra não mede o custo de repetir a atividade completa. ${binding.constraint ? `Preservar ${binding.constraint} continua sendo a condição relatada; esse teste não demonstra que a alternativa possa substituir o trabalho atual.` : 'O resultado de uma amostra ainda não decide uma mudança de profissão.'}`,
		relationships:
			'A cooperação só merece continuidade quando a contribuição de cada pessoa e os limites da responsabilidade ficam reconhecíveis. Se a entrega oculta carga desigual, revise o acordo antes de repetir a tarefa.',
		general:
			'Leve adiante a parte da tarefa cuja utilidade outra pessoa conseguiu reconhecer e cujo esforço você pôde observar. Se o resultado só apareceu com custo excessivo, reduza a tarefa ou procure apoio antes de ampliar o compromisso.'
	};
	const closingReviewByContext: Record<CompassContext['key'], string> = {
		workload:
			'Ao reler, compare o descanso possível com a carga que permaneceu; se alguém participou de um ajuste, registre o que ocorreu de fato.',
		study: 'Na releitura, compare o que aprendeu em cada exercício e se alguma orientação faltou.',
		leadership:
			'Ao rever o plano, confira se decisões e apoio têm responsáveis; compare com o que ocorreu somente se uma entrega real tiver sido executada.',
		independent:
			'Ao rever a amostra, registre o resultado obtido, o recurso usado e o custo para repeti-la.',
		transition:
			binding.probe?.kind === 'illustration'
				? 'Ao reler, observe se a ideia pretendida aparece no rascunho e se alguma revisão ficou fora do tempo. Registre compreensão de outra pessoa só se ela tiver dado retorno.'
				: binding.probe?.kind === 'ceramics'
					? 'Ao reler, marque até qual etapa da peça chegou, quais recursos estavam disponíveis e se algum material, espaço ou tempo faltou para prosseguir.'
					: 'Ao reler, distinga o que ficou no plano do que foi executado e compare os recursos usados com os disponíveis.',
		relationships:
			'Na próxima conversa, confira se cada pessoa reconhece a própria parte e o limite do acordo.',
		general:
			'Ao retomar a tarefa, compare o resultado observado, o esforço exigido e a condição que mudou.'
	};
	add(
		'Levar uma escolha adiante',
		edition === 'v5'
			? `A Bússola reuniu direção pública, motivação, condições de ambiente, pensamento e ação, relações selecionadas e capacidade de sustentar o esforço. Volte à hipótese inicial: ${direction.contribution}, por meio de ${regency.method}, preservando espaço para ${authorship.motivation}. Use o resultado do teste para decidir qual parte merece continuidade e qual precisa mudar.\n\nRegistre uma observação concreta, um limite e um próximo passo pequeno. Uma conversa, um exercício ou a revisão de um acordo já podem produzir informação suficiente; não é necessário iniciar uma mudança profissional. O registro fica sob sua escolha e a continuidade no ATV+ exige consentimento próprio. Reabra esta leitura quando houver novas condições e compare a hipótese com a experiência atual. A decisão permanece revisável: aprendizagem, acesso e responsabilidades mudam o que é possível realizar.`
			: `${closingByContext[binding.key]}\n\n${closingReviewByContext[binding.key]} Registre também um fato que contrarie a hipótese. O registro é privado e a continuidade no ATV+ exige seu consentimento.`,
		core,
		'practical-reflection'
	);
	if (edition === 'latest') {
		const contributionSituation: Record<CompassContext['key'], string> = {
			workload:
				'O mapa descreve uma forma possível de contribuir, mas o relato de cansaço não contém uma entrega específica cuja utilidade possamos medir. Não medir uma entrega nesta leitura não invalida o limite que você relatou nem exige prova de produtividade.',
			study:
				'Nesta pergunta, escolha uma habilidade para praticar e uma dificuldade observável. Compare compreensão, execução e correção em dois exercícios curtos; ainda não há uma entrega profissional a avaliar.',
			leadership:
				'Na entrega conjunta, identifique a parte decidida por você, as partes atribuídas à equipe e o resultado comum. O teste de contribuição exige retorno sobre essas três partes, sem tomar coordenação por execução individual.',
			independent:
				'Para uma proposta própria, delimite uma amostra que caiba nos recursos disponíveis e possa ser examinada antes de oferecer um serviço ou prometer continuidade.',
			transition:
				'O que a alternativa permite demonstrar depende da etapa acessível: um plano mostra clareza e acesso; uma amostra executada permite examinar o resultado. Preserve a atividade atual enquanto essas evidências são comparadas.',
			relationships:
				'Numa entrega compartilhada, distinga sua parte, a parte das outras pessoas e o benefício comum antes de atribuir valor ao resultado.',
			general:
				'Escolha uma tarefa já acessível e observe quem recebe o resultado, o que pode conferir e qual parte coube a você.'
		};
		const environmentSituation: Record<CompassContext['key'], string> = {
			workload:
				'Observe se a rotina atual permite uma pausa real e qual exigência tem prazo definido. A leitura não identifica quem poderia ajudar nem garante que haja apoio disponível.',
			study:
				'No estudo, confira tempo para praticar, material acessível, orientação e retorno sobre erros. A primeira prática mostra apoio para aprender, ainda não descreve um ambiente de trabalho futuro.',
			leadership:
				'Antes da entrega da equipe, combine quem decide, quem executa e a quem pedir ajuda. Autonomia sem retorno e responsabilidade sem apoio devem aparecer como limites do acordo.',
			independent:
				'Na proposta própria, confirme materiais, tempo e retorno acessíveis sem despesa nem encomenda. Uma condição ausente delimita o ensaio; não define sua aptidão.',
			transition:
				'Confira separadamente os apoios da atividade atual e os recursos acessíveis para a amostra. O ensaio não comprova que a alternativa possa substituir a situação presente.',
			relationships:
				'Num acordo com outras pessoas, registre quem decide, quem recebe retorno e qual ajuda pode ser pedida sem criar obrigação silenciosa.',
			general:
				'Observe numa tarefa atual como o pedido é explicado, como a ajuda é obtida e qual autonomia acompanha sua responsabilidade.'
		};
		const sustainabilitySituation: Record<CompassContext['key'], string> = {
			workload:
				'Aqui, o recurso escasso é a margem de energia relatada. Ampliar iniciativas antes de conhecer o custo da rotina atual tornaria a hipótese de crescimento impossível de avaliar.',
			study:
				'Antes de escolher uma formação, observe quanto tempo dois exercícios exigem, qual orientação foi necessária e se alguma faltou. O custo de um curso inteiro continua desconhecido.',
			leadership:
				'O acordo da equipe deve continuar viável depois da primeira entrega. Se o acompanhamento recair sempre na mesma pessoa, redistribua essa parte antes de repetir.',
			independent:
				'Não transforme uma amostra em compromisso público antes de conhecer o tempo de execução e os recursos para repeti-la.',
			transition:
				'O custo conhecido é apenas o da etapa realmente feita. Um plano sem execução não mede a atividade alternativa completa nem autoriza supor que haja uma tarefa equivalente no trabalho atual.',
			relationships:
				'Antes de repetir a cooperação, verifique se o cuidado e o retorno foram distribuídos de forma que cada pessoa possa manter sua parte.',
			general:
				'Meça o esforço de repetir a tarefa atual e defina uma condição de parada antes de aumentar seu escopo.'
		};
		const contributionIndex = plan.findIndex((p) => p.role === 'contribution');
		sections[contributionIndex].text =
			`A direção do Meio do Céu em ${signs[g.mc.sign]} aponta para ${direction.contribution}. ${label(ruler)} orienta como levar essa direção a uma tarefa, aqui pela atenção a ${regency.method}. ${contributionSituation[binding.key]}\n\n${sections[contributionIndex].text.split('\n\n')[1]}`;
		const environmentIndex = plan.findIndex((p) => p.role === 'environment');
		const environmentChart =
			direction.environment === security.environment
				? `MC e Lua apontam para a mesma condição: ${direction.environment}. O MC a relaciona à contribuição; a Lua, ao apoio para sustentá-la.`
				: `O MC associa a contribuição a ${direction.environment}; a Lua em ${signs[moon.sign]} acrescenta ${security.environment} como apoio.`;
		sections[environmentIndex].text =
			`${environmentChart} Mercúrio em ${signs[mercury.sign]} acrescenta ${thinking.environment} para compreender pedidos e respostas. ${environmentSituation[binding.key]}\n\n${sections[environmentIndex].text.split('\n\n')[1]}`;
		const sustainabilityIndex = plan.findIndex((p) => p.role === 'sustainability');
		sections[sustainabilityIndex].text =
			`${label(jupiter)} aponta uma possibilidade de ampliação por ${signMeanings[jupiter.sign].method}; ${label(saturn)} pede continuidade por ${signMeanings[saturn.sign].method}. ${sustainabilitySituation[binding.key]}\n\n${sections[sustainabilityIndex].text.split('\n\n')[1]}`;
		const lens = themeLenses[binding.key];
		const environmentCheck =
			direction.environment === security.environment
				? `verifique se a mesma condição — ${direction.environment} — apoia tanto a contribuição quanto a segurança necessária para sustentá-la`
				: `verifique duas condições: para contribuir, ${direction.environment}; para obter apoio, ${security.environment}`;
		const workingStyleByContext: Record<CompassContext['key'], string> = {
			workload:
				'se houver disposição após descansar e você souber a origem da carga, anote uma fonte possível e verifique se algo pode esperar; se não souber, deixe a causa em aberto. Não é necessário executar outra tarefa para validar o limite que você relatou.',
			study:
				'escolha uma habilidade e formule uma dúvida observável no primeiro exercício. Use o segundo para testar uma explicação ou correção; dificuldade de instrução, execução e interesse precisam ser anotados separadamente.',
			leadership:
				'explicite quem decide cada parte da entrega e como a equipe pedirá ajuda. Antes de executar, combine o critério de conclusão; depois, compare o acordo com a distribuição real do trabalho.',
			independent:
				'defina o limite da proposta e os recursos que já possui. Esboce uma parte que consiga concluir sem despesa nem encomenda; registre o que faltaria para repetir a entrega.',
			transition:
				binding.probe?.kind === 'ceramics'
					? 'confira separadamente o acesso a argila, espaço de secagem e local de queima. Se houver argila e espaço adequado, modele a pequena forma; sem queima, não avalie peça pronta. Se houver só esboço, avalie planejamento e acesso.'
					: `confirme o acesso a ${binding.probe?.access ?? 'recursos para uma etapa pequena'} e defina o resultado observável. Se houver acesso, execute só a etapa delimitada e então examine ${binding.probe?.criterion ?? 'o que a alternativa mostrou'}. Se houver apenas o plano, registre essa diferença antes de comparar com a atividade atual.`,
			relationships:
				'descreva a decisão, a ação e o retorno de cada pessoa envolvida numa tarefa. Confira se o acordo permite pedir ajuda antes de assumir uma obrigação que não foi distribuída.',
			general:
				'escolha uma tarefa acessível, formule a pergunta que orienta a ação e defina quando ela estará concluída. Compare o resultado com o esforço antes de ampliar o escopo.'
		};
		const themeConclusions: Partial<Record<EditorialTrace['plan'][number]['role'], string>> = {
			contribution: `${data.regent.house === null ? 'A casa do regente está indisponível; o campo específico de manifestação não pode ser afirmado.' : `A casa ${data.regent.house} do regente aponta ${houseAreas[data.regent.house - 1]} como um campo possível, sem determinar uma ocupação.`} ${binding.probe ? `O teste propõe ${binding.probe.sample}; registre ${binding.probe.criterion}. A amostra mostra apenas a etapa realizada: um plano não demonstra a utilidade ou a qualidade da atividade futura. ` : binding.scene ? `O teste proposto é ${binding.scene}. ` : ''}Avalie ${lens.contribution} pela direção proposta pelo MC. A utilidade para outra pessoa permanece uma hipótese até haver uma entrega que ela possa examinar; o procedimento de ${label(ruler)} só ganha peso se tornar essa entrega possível nos recursos atuais.`,
			motivation: `Ao avaliar ${lens.motivation}, diferencie o que você escolheu na tarefa do apoio de que precisou. ${binding.probe ? `No ensaio, anote se o interesse persistiu depois de descobrir as condições de ${binding.probe.access}; se só houve planejamento por falta de acesso, ainda não há evidência sobre o prazer de praticar. ` : ''}${label(moon)} sugere procurar ${security.environment}; se a entrega oferece autoria mas consome esse apoio, o interesse pelo resultado não resolve a carga. ${label(venus)} pede um critério de qualidade que você consiga explicar e confrontar com o resultado.`,
			environment: `${label(saturn)} propõe ${signMeanings[saturn.sign].method} para dar continuidade. Ao examinar ${lens.environment}, ${environmentCheck}. ${binding.probe ? `Confira se há acesso a ${binding.probe.access}. Se faltar alguma condição, registre-a como limite do teste, sem converter ausência de recurso em juízo sobre sua aptidão. ` : binding.scene ? `Antes do teste, identifique quais condições de acesso precisam estar disponíveis sem retirar apoio da atividade atual. ` : ''}${binding.key === 'transition' && !binding.probe ? 'Se a contribuição ou o apoio não aparecer na etapa acessível, identifique qual condição precisaria existir.' : 'Se a contribuição ou o apoio não aparecer na situação acessível, identifique qual acordo seria necessário.'} ${binding.constraint ? `Preservar ${binding.constraint} foi uma condição informada por você; o mapa não demonstra a viabilidade econômica da alternativa.` : 'Tempo, remuneração, saúde e acesso podem limitar a escolha, independentemente da afinidade simbólica.'}`,
			'working-style': `Para ${lens.style}, ${workingStyleByContext[binding.key]}`,
			sustainability: `Ao considerar ${lens.sustainability}, veja se ${binding.key === 'transition' && !binding.probe ? 'a etapa observada' : 'a entrega'} pode ser repetida dentro do tempo e dos recursos disponíveis. ${binding.probe ? `Nesse teste, compare apenas o tempo da etapa realizada com uma tarefa atual de duração semelhante; essa comparação não mede a alternativa completa; ${binding.probe.laterCost}. ` : binding.scene ? `Nesse teste, compare a carga da amostra com uma tarefa atual de duração semelhante; um interesse maior não elimina o custo. ` : ''}Se um único resultado exige esforço que não pode ser mantido, reduza o escopo antes de tomá-lo como sinal de expansão. ${binding.constraint ? `Preservar ${binding.constraint} limita o experimento; um resultado promissor ainda não demonstra segurança financeira.` : 'Se a margem real for pequena, reduzir escopo ou adiar pode ser uma decisão coerente.'}`
		};
		if (binding.key === 'workload') {
			const workingIndex = plan.findIndex((p) => p.role === 'working-style');
			sections[workingIndex].text =
				`${label(mercury)} sugere ${thinking.method} para organizar a informação; ${label(mars)} sugere ${action.method} para estabelecer um limite. Esses símbolos são perguntas, não uma indicação de executar trabalho agora.\n\n${sections[workingIndex].text.split('\n\n')[1]}`;
			themeConclusions.contribution = `${data.regent.house === null ? 'A casa do regente está indisponível; nenhum campo específico pode ser afirmado.' : `A casa ${data.regent.house} do regente sugere ${houseAreas[data.regent.house - 1]} como campo possível, sem apontar uma ocupação.`} O MC e seu regente descrevem uma contribuição possível em outro momento. Neste relato, não há base para avaliar sua utilidade por uma nova entrega.`;
			themeConclusions.motivation = `${label(sun)} e ${label(moon)} distinguem escolha e segurança; ${label(venus)} acrescenta o valor atribuído ao resultado. Gostar do que se faz e precisar interromper a carga podem ser verdade ao mesmo tempo. O relato de cansaço não informa qual atividade, relação ou condição de trabalho produziu o desgaste.`;
			themeConclusions.environment = `${label(saturn)} sugere ${signMeanings[saturn.sign].method} como forma de continuidade, mas uma rotina que não comporta pausa não se torna sustentável por organização individual. Se houver uma obrigação concreta envolvendo outra pessoa, mudar prazo ou distribuição dependerá de um acordo real; o apoio disponível permanece desconhecido.`;
			themeConclusions['working-style'] =
				`Para ${lens.style}, ${workingStyleByContext.workload} Mercúrio ajuda a nomear uma informação; Marte ajuda a definir um limite. Nenhum deles exige iniciar uma tarefa.`;
			themeConclusions.sustainability = `Ao considerar ${lens.sustainability}, ainda falta saber qual parte da rotina produz a carga e qual margem pode ser recuperada. Sem essa informação, não é possível estimar o custo de repetir ou ampliar uma atividade; adiar o registro preserva energia e mantém a pergunta aberta.`;
		}
		if (binding.key === 'study') {
			themeConclusions.contribution = `${data.regent.house === null ? 'A casa do regente está indisponível; não há um campo específico a afirmar.' : `A casa ${data.regent.house} do regente sugere ${houseAreas[data.regent.house - 1]} como campo possível de interesse, sem indicar uma profissão.`} Compare os exercícios pela compreensão alcançada, por uma correção se houver erro e pelo apoio necessário para continuar. O procedimento de ${label(ruler)} só ganha peso se ajudar você a aprender com os recursos disponíveis; a utilidade para terceiros pode ser investigada em outra etapa.`;
			themeConclusions.environment = `${label(saturn)} sugere ${signMeanings[saturn.sign].method} para manter uma rotina de prática. Reserve uma janela real para cada exercício e identifique a quem pedir retorno se surgir um erro concreto. Sem tempo ou resposta acessível, a próxima prática fica indefinida; o custo de uma formação inteira permanece em aberto.`;
			themeConclusions.motivation = `Após o primeiro exercício, registre se o interesse mudou ao encontrar uma dificuldade concreta. No segundo, observe se a vontade de continuar mudou; se conseguiu corrigir algo, anote também o efeito da correção. ${label(moon)} sugere procurar ${security.environment}; ${label(venus)} ajuda a comparar o que foi compreendido em cada tentativa, sem exigir uma entrega profissional.`;
			themeConclusions.sustainability = `Ao considerar ${lens.sustainability}, veja se a rotina de aprendizagem cabe no tempo e na energia disponíveis. Compare a duração e a dificuldade dos dois exercícios, e anote que orientação foi necessária. Esse ensaio não mede o custo de uma formação inteira; se a prática consumir mais margem do que você tem, ajuste o exercício ou adie a decisão.`;
		}
		if (binding.key === 'transition' && binding.probe) {
			if (binding.probe.kind === 'illustration') {
				themeConclusions.contribution =
					'No rascunho, observe se a ideia central se torna reconhecível na imagem e marque a decisão visual que produziu esse efeito. Esse resultado descreve sua contribuição nesta amostra; a utilidade para um leitor real depende de resposta externa. Se só houver planejamento, a qualidade da imagem permanece em aberto.';
				themeConclusions.environment =
					'Anote quais condições estavam de fato disponíveis — tempo, ferramenta e espaço para revisar —, se alguma faltou e, caso haja imagem, quais ajudaram a concluí-la. Isso informa como repetir o ensaio sem converter uma condição ausente em juízo sobre sua aptidão.';
				themeConclusions.motivation = `Depois da etapa acessível, diferencie o interesse em desenhar do interesse na ideia da ilustração. ${label(moon)} sugere observar o apoio disponível ou necessário para começar; ${label(venus)} oferece um critério de clareza visual a confrontar com o rascunho. Se apenas planejou, ainda não há evidência sobre o prazer ou o custo de praticar.`;
				themeConclusions.sustainability = `Anote o tempo gasto no rascunho e, se houver, na revisão. Compare com uma tarefa conhecida da atividade atual somente se duração e condições forem semelhantes; sem essa equivalência, mantenha apenas o custo observado. Uma imagem inicial não mede a cadência de novas ilustrações nem a renda que poderiam gerar. Se a etapa já consumir a margem disponível, reduza o escopo antes de ampliar a prática.`;
			} else if (binding.probe.kind === 'ceramics') {
				themeConclusions.contribution =
					'O esboço permite definir forma, tamanho e etapas de uma peça simples. Ele não mostra como a argila responde às mãos; a peça acabada só poderá ser avaliada depois de secar e queimar. Registre o que foi planejado antes de atribuir utilidade a uma produção ainda não executada.';
				themeConclusions.environment =
					'Depois de listar os recursos acessíveis, estime o tempo da próxima etapa possível e onde uma peça poderia secar sem interromper a rotina. Se a queima depender de outra pessoa ou espaço, registre essa dependência antes de atribuir prazo à peça acabada.';
				themeConclusions.motivation =
					'Observe se o interesse permanece ao lidar com as condições concretas da etapa acessível: preparar o espaço, medir material e aceitar um resultado inicial imperfeito. Se só houver esboço, registre o interesse pelo planejamento; a experiência com argila continua desconhecida.';
				themeConclusions.sustainability =
					'O tempo de esboço não inclui modelagem, secagem, queima nem eventuais perdas de material. Tempo, material e perdas podem ser estimados apenas para a etapa feita; a renda e a rotina do emprego atual são limites a preservar. Uma comparação entre tarefas só caberá se houver base realmente equivalente.';
			} else {
				themeConclusions.contribution = `Na etapa acessível de ${binding.probe.sample}, descreva o resultado que de fato produziu. Se houve apenas plano, registre clareza e acesso; utilidade e qualidade da execução permanecem em aberto.`;
				themeConclusions.environment = `Confira o acesso a ${binding.probe.access} e anote qual recurso facilitou ou impediu a execução. Uma condição ausente limita a amostra, sem decidir sua aptidão para a atividade.`;
				themeConclusions.motivation =
					'Observe se o interesse pela alternativa persiste depois da etapa que você conseguiu praticar. Planejar e executar oferecem experiências diferentes; sem execução, deixe o prazer da prática em aberto.';
				themeConclusions.sustainability = `Registre tempo, esforço e recursos da etapa realizada. ${binding.probe.laterCost}; uma amostra curta ainda não demonstra que a alternativa pode sustentar a rotina atual.`;
			}
		}
		if (binding.key === 'leadership') {
			themeConclusions.environment = `${label(saturn)} sugere ${signMeanings[saturn.sign].method} para dar continuidade. No acordo da equipe, se alguma decisão exigir autorização, identifique quem pode dá-la e quando pedir revisão. Isso torna o apoio verificável antes de ampliar a entrega; o mapa não informa como a equipe responderá.`;
			themeConclusions.contribution = `${data.regent.house === null ? 'A casa do regente está indisponível; não há um campo específico a afirmar.' : `A casa ${data.regent.house} do regente sugere ${houseAreas[data.regent.house - 1]} como campo possível, sem definir uma ocupação.`} Na entrega conjunta, o papel de coordenação só poderá ser examinado quando decisões, responsáveis e resultado comum estiverem registrados. Ainda não sabemos como a equipe ou o destinatário avaliará esse resultado.`;
		}
		if (binding.key === 'transition' && !binding.probe && ruler.body === 'pluto') {
			themeConclusions.contribution = `${data.regent.house === null ? 'A casa do regente está indisponível; não há um campo específico a afirmar.' : `A casa ${data.regent.house} do regente sugere ${houseAreas[data.regent.house - 1]} como campo possível, sem determinar uma ocupação.`} Se houver um problema acessível na alternativa, delimite uma pergunta e registre o que a investigação realmente esclareceu. O resultado desta etapa não informa quem usaria o achado nem como seria a rotina completa da atividade.`;
			themeConclusions.environment = `${label(saturn)} sugere ${signMeanings[saturn.sign].method} para dar continuidade. Antes de investigar, confirme qual informação pode ser acessada e qual achado pode ser compartilhado. Um limite de acesso reduz o alcance da amostra; a possibilidade de explicar o que foi encontrado é uma condição distinta, ainda por verificar.`;
		}
		const themeRoles = [
			'contribution',
			'motivation',
			'environment',
			'working-style',
			'sustainability'
		] as const;
		for (const role of themeRoles) {
			const conclusion = themeConclusions[role];
			if (!conclusion) continue;
			const index = plan.findIndex((p) => p.role === role);
			const implication =
				(binding.key === 'workload' && role === 'environment') ||
				(binding.key === 'study' && role === 'motivation')
					? undefined
					: priorityImplications[binding.key][role];
			sections[index].text =
				`${sections[index].text.split('\n\n')[0]}\n\n${conclusion}${implication ? ` ${implication}` : ''}`;
		}
		const setInterpretiveOpening = (role: (typeof themeRoles)[number], opening: string) => {
			const index = plan.findIndex((p) => p.role === role);
			sections[index].text =
				`${opening}\n\n${sections[index].text.split('\n\n').slice(1).join('\n\n')}`;
		};
		if (binding.key === 'workload') {
			setInterpretiveOpening(
				'sustainability',
				`${label(jupiter)} representa uma possibilidade de ampliação: ${signMeanings[jupiter.sign].method}; ${label(saturn)} propõe um modo de dar continuidade: ${signMeanings[saturn.sign].method}. Na situação relatada, essas funções só podem ser avaliadas depois que a carga atual e a energia disponível forem conhecidas. O cansaço informa um limite presente, sem revelar sua causa.`
			);
			setInterpretiveOpening(
				'environment',
				`O MC em ${signs[g.mc.sign]} descreve a condição de contribuição — ${direction.environment} — e ${label(moon)} descreve o apoio de ${security.environment}. Nenhuma dessas condições resolve, sozinha, se há espaço real para pausa na rotina relatada. ${label(mercury)} ajuda a distinguir o que tem prazo, o que pode esperar e o que depende de outra pessoa; essas informações ainda não foram fornecidas.`
			);
			setInterpretiveOpening(
				'motivation',
				`${label(sun)} aponta para ${authorship.motivation}; ${label(moon)}, para ${security.motivation}; ${label(venus)}, para ${values.contribution}. Essas funções explicam por que uma atividade pode conservar sentido e, ao mesmo tempo, exceder a energia disponível. O mapa não transforma o valor da pessoa em produtividade nem identifica qual parte da rotina produz o desgaste.`
			);
			setInterpretiveOpening(
				'working-style',
				`${label(mercury)} oferece ${thinking.method} como modo de dar nome a uma informação; ${label(mars)} oferece ${action.method} como modo de marcar um limite. Aqui, a contribuição dessas funções é tornar o limite compreensível, caso haja disposição para isso. A leitura não requer uma nova ação para confirmar o cansaço relatado.`
			);
		}
		if (binding.key === 'study') {
			setInterpretiveOpening(
				'motivation',
				`${label(sun)} liga autoria a ${authorship.motivation}, enquanto ${label(moon)} pede ${security.motivation}; ${label(venus)} acrescenta ${values.contribution} como critério de valor. No estudo, o interesse inicial pela ideia de um curso ainda não informa se a prática mantém esse interesse. Compreender, corrigir e querer repetir um exercício são sinais diferentes, e nenhum deles exige uma entrega profissional.`
			);
			setInterpretiveOpening(
				'environment',
				`O MC em ${signs[g.mc.sign]} associa contribuição a ${direction.environment}; ${label(moon)} acrescenta ${security.environment} como apoio e ${label(mercury)} associa compreensão a ${thinking.environment}. Em dois exercícios, essa combinação torna decisivo saber se as instruções e o retorno sobre erros foram comparáveis. Resultados diferentes sob orientações diferentes medem também a diferença de acesso, não apenas o aprendizado.`
			);
			setInterpretiveOpening(
				'working-style',
				`${label(mercury)} oferece ${thinking.method} como modo de organizar a compreensão; ${label(mars)} oferece ${action.method} como modo de iniciar a tentativa. Um primeiro exercício pode revelar a dúvida e o segundo, a possibilidade de corrigir com orientação equivalente. Se a instrução mudar entre eles, a comparação mostra uma condição de aprendizagem, mas ainda não mede aptidão para uma formação inteira.`
			);
		}
		if (binding.key === 'leadership') {
			setInterpretiveOpening(
				'environment',
				`O MC em ${signs[g.mc.sign]} associa contribuição a ${direction.environment}; ${label(moon)} acrescenta ${security.environment} como apoio e ${label(mercury)} pede ${thinking.environment} para entender os pedidos. Numa entrega conjunta, autoria de decisões, apoio e critério de conclusão precisam ficar visíveis. Sem essa divisão, o resultado comum não permite atribuir com justiça a contribuição nem o custo de cada pessoa.`
			);
			setInterpretiveOpening(
				'motivation',
				`${label(sun)} aponta para ${authorship.motivation}; ${label(moon)} pede ${security.motivation} e ${label(venus)} valoriza ${values.contribution}. Coordenar uma equipe pode oferecer participação e um resultado concreto, mas o interesse perde sustentação se uma só pessoa absorver revisões e apoio que pertencem ao acordo coletivo. A leitura não presume que isso já aconteceu; identifica a condição a observar.`
			);
			setInterpretiveOpening(
				'working-style',
				`${label(mercury)} oferece ${thinking.method} para formular o pedido, e ${label(mars)} oferece ${action.method} para iniciar a entrega. Na equipe, essa diferença aparece entre explicar o critério e assumir a execução. Se a explicação não chegar a quem executa, o atraso não demonstra falta de iniciativa dessa pessoa; aponta uma falha verificável no acordo.`
			);
		}
		if (binding.key === 'transition' && binding.probe?.kind === 'illustration') {
			setInterpretiveOpening(
				'working-style',
				`${label(mercury)} oferece ${thinking.method} para organizar uma ideia; ${label(mars)} oferece ${action.method} para iniciar a etapa. Na ilustração editorial, uma frase que esclarece a ideia e um primeiro desenho testam funções diferentes. Se a ideia estiver clara no texto e não aparecer no rascunho, a questão observada é sua tradução visual; a aceitação por um leitor ainda depende de retorno externo.`
			);
			setInterpretiveOpening(
				'motivation',
				`${label(sun)} descreve a vontade de ${authorship.motivation}; ${label(moon)} pede ${security.motivation} e ${label(venus)} valoriza ${values.contribution}. O prazer de pensar uma imagem pode existir antes de desenhá-la, mas não substitui a experiência de revisar o rascunho. Sem a imagem, o interesse pela prática e sua qualidade permanecem perguntas abertas.`
			);
		}
		if (binding.key === 'transition' && binding.probe?.kind === 'ceramics') {
			setInterpretiveOpening(
				'motivation',
				`${label(sun)} relaciona autoria ao desejo de ${authorship.motivation} e ${label(venus)} valoriza ${values.contribution}; ${label(moon)} acrescenta a necessidade de ${security.motivation}. Essa combinação pode dar sentido a planejar a forma de uma peça. O prazer e a dificuldade de trabalhar a argila, porém, só podem ser conhecidos com acesso à modelagem; esboçar não equivale a modelar, secar ou queimar.`
			);
			setInterpretiveOpening(
				'environment',
				`O MC em ${signs[g.mc.sign]} aponta ${direction.environment} como condição de contribuição; ${label(moon)} acrescenta ${security.environment} como apoio. Na cerâmica, essas condições passam pelo acesso concreto a argila, espaço de secagem e queima. A falta de uma etapa limita o que o ensaio revela, sem informar se você teria habilidade com o material.`
			);
		}
		if (binding.key === 'transition' && !binding.probe && ruler.body === 'pluto') {
			setInterpretiveOpening(
				'environment',
				`O MC em ${signs[g.mc.sign]} e ${label(moon)} convergem em ${direction.environment}. Essa condição importa tanto para investigar quanto para sustentar a experiência. ${label(mercury)} acrescenta ${thinking.environment} para explicar o resultado. Sem acesso ao problema ou oportunidade de comunicar o achado, a amostra mede uma condição ausente; não mede o valor da contribuição que poderia ser feita.`
			);
			setInterpretiveOpening(
				'working-style',
				`${label(mercury)} e ${label(mars)} compartilham o procedimento de ${thinking.method}, mas o primeiro formula a pergunta e o segundo inicia a etapa. Uma explicação convincente sem investigação feita mostra comunicação, não o resultado da alternativa; dados reunidos sem explicação deixam a contribuição pouco visível. A duração de cada parte da amostra ajudará a distinguir esses limites.`
			);
		}
	}
	if (edition === 'v5') sections[0].text = `${binding.focus}\n\n${sections[0].text}`;
	const contextIndex = plan.findIndex((p) => p.role === 'reported-context');
	sections[contextIndex].text =
		edition === 'v5'
			? `${sections[contextIndex].text}\n\nPara responder à pergunta declarada, ${binding.task}. A informação a procurar é esta: ${binding.question}`
			: `${input.context ? `Você informou: “${input.context}”` : 'Nenhum contexto profissional foi informado; escolha uma tarefa real para aplicar esta hipótese.'}\n\n${binding.key === 'workload' ? `Considere descanso antes de qualquer registro. Se houver uma obrigação identificada, observe se pode ser reduzida ou adiada; só considere uma conversa sobre mudança quando houver outra pessoa envolvida.${binding.deferredAlternative ? ` A intenção de explorar ${binding.deferredAlternative} preservando ${binding.constraint} fica para depois dessa recuperação.` : ''}` : binding.key === 'study' ? 'Compare dois exercícios acessíveis para observar compreensão, interesse após a prática e necessidade de orientação.' : binding.constraint ? `Uma amostra curta pode investigar a alternativa sem alterar ${binding.constraint}; ela não demonstra que a atividade atual possa ser substituída.` : 'A experiência concreta pode confirmar, limitar ou contrariar a hipótese simbólica.'} ${binding.currentActivity ? `Você também relatou trabalhar ${binding.currentActivity}; uma entrega conhecida dessa atividade pode servir de referência somente se duração e condições forem comparáveis. Caso contrário, registre apenas o custo observado da amostra, sem presumir renda ou reconhecimento equivalentes. ` : ''}A pergunta decisiva é: ${binding.question}`;
	const experimentIndex = plan.findIndex((p) => p.role === 'reversible-experiment');
	sections[experimentIndex].text =
		edition === 'v5'
			? `${binding.focus} No teste, ${binding.task}.\n\n${sections[experimentIndex].text}`
			: binding.key === 'workload'
				? `O descanso e o adiamento são resultados válidos. Não é preciso iniciar um projeto, produzir uma entrega ou encontrar ajuda para validar o cansaço que você relatou. Se houver disposição depois de descansar, reserve no máximo vinte minutos, sem despesa e sem compromisso público, para um registro opcional: ${binding.task}. Se não houver margem, pare por aqui.\n\nAnote apenas o que você sabe sobre a origem da carga; se não souber, deixe em aberto. O procedimento sugerido por ${label(ruler)} pode orientar a forma de registrar, mas não comprova a causa. Uma evidência contrária à hipótese seria o registro não ajudar a distinguir nada ou aumentar o desgaste; nesse caso, encerre a tentativa.${binding.deferredAlternative ? ` A exploração de ${binding.deferredAlternative} fica para uma etapa posterior, se houver margem, sem alterar ${binding.constraint}.` : ''}`
				: binding.key === 'study'
					? `Reserve até vinte minutos, sem despesa e sem compromisso público. Defina a habilidade que quer experimentar e escolha dois exercícios gratuitos e curtos ligados a ela. No primeiro, anote o que compreendeu, qualquer dúvida, o tempo e o acesso a orientação. No segundo, revisite a mesma dúvida ou explicação, se houver; caso contrário, observe se consegue repetir o que compreendeu. Tente manter instruções e apoio comparáveis. Se mudarem, registre essa diferença como condição do teste.\n\nCompare interesse após a prática, compreensão e apoio necessário ou ausente. Uma evidência contrária à hipótese seria não conseguir acessar os exercícios, repetir a compreensão ou distinguir o efeito da orientação. O resultado informa o próximo ajuste; dois exercícios não medem a aptidão para uma formação inteira.`
					: binding.key === 'transition' && !binding.probe && ruler.body === 'pluto'
						? `Reserve até vinte minutos, sem despesa e sem compromisso público. Escolha um problema pequeno da alternativa que você possa investigar com os recursos atuais; antes de começar, escreva em uma frase o que pretende descobrir e qual resultado encerraria a etapa. Faça a primeira ação sem prolongar a formulação. Depois, anote o que encontrou, o que conseguiu explicar e o tempo gasto em cada parte. Compare com uma tarefa conhecida da atividade atual apenas se duração e condições forem semelhantes; caso contrário, anote só o custo observado.\n\nUma evidência contrária à hipótese seria o problema não poder ser observado, a instrução consumir a janela de execução ou o resultado não poder ser explicado. Registre esse limite e reduza a pergunta antes de repetir. Um problema investigado não demonstra que a alternativa substitua o trabalho atual.`
						: binding.key === 'leadership'
							? `Reserve até vinte minutos, sem despesa e sem compromisso público: ${binding.task}. Faça um esboço de acordo que possa ser explicado à equipe antes de atribuir tarefas a outras pessoas.\n\nRegistre o acordo esperado, quem decide cada parte, quem oferece apoio e como será pedido retorno. Uma evidência contrária à hipótese seria não conseguir distribuir uma decisão ou deixar o apoio sem responsável. O plano concluído ainda não informa como a equipe executará a entrega; observe o trabalho real somente se ela ocorrer depois.`
							: `Reserve até vinte minutos, sem despesa e sem compromisso público: ${binding.task}. Estabeleça um resultado observável e uma condição de parada antes de agir.\n\nSe realizar o teste, registre o que foi produzido, o esforço e uma evidência contrária à hipótese. Se outra pessoa participar, combine o retorno; observar a tarefa sozinho também é válido. Use esse registro para decidir se continua, ajusta ou encerra o teste.`;
	const themeOrder = unique([...binding.priority, ...compassMethod.themes]);
	const order = [
		'integrated-compass',
		'reported-context',
		...themeOrder,
		'selected-relations',
		'reversible-experiment',
		'practical-reflection'
	];
	const ordered = sections
		.map((s, i) => ({ s, p: plan[i] }))
		.sort((a, b) => order.indexOf(a.p.role) - order.indexOf(b.p.role));
	sections.splice(0, sections.length, ...ordered.map((o) => o.s));
	plan.splice(0, plan.length, ...ordered.map((o) => o.p));
	const used = new Set(sections.flatMap((s) => s.factIds)),
		remaining = g.facts.filter((f) => !used.has(f.id)),
		appendixFacts = edition === 'v5' ? remaining : g.facts;
	add(
		'Base preservada e referências de cálculo',
		appendixFacts
			.map((f) =>
				edition === 'latest'
					? formatCareerCompassFactDisplay(f.display)
					: f.display.replace(/ da candidata\b/g, '')
			)
			.join('\n') +
			`${edition === 'latest' ? '\n\nAs posições e os orbes acima foram arredondados a 0,1° para leitura; os valores originais permanecem na base técnica.' : ''}\n\nA base natal integral fica preservada para conferência. A seleção acima organiza uma investigação de trabalho e contribuição; fatores de outras áreas não viram afirmações profissionais sem uma relação explícita. Casas indisponíveis permanecem indisponíveis. Os aspectos usam o método registrado, sem atribuir aplicação ou separação. A experiência relatada pode contrariar a hipótese e modificar seu uso.`,
		appendixFacts.map((f) => f.id),
		'technical-reference'
	);
	const openingByContext: Record<CompassContext['key'], string> = {
		workload:
			'Considere primeiro as condições que permitiriam descansar. Esta leitura considera a margem disponível antes de propor qualquer experimento; se ela faltar, adiar também é uma conclusão válida.',
		study: `${binding.focus} A leitura liga as funções do mapa a dois exercícios curtos. O que você compreender, conseguir corrigir se houver erro e quiser repetir após a prática vale mais para esta pergunta do que a ideia abstrata de uma formação.`,
		leadership: `${binding.focus} A leitura examina a contribuição e o apoio no mapa junto de uma entrega da equipe. O acordo sobre decisões, ajuda e responsabilidade é o dado a conferir antes de ampliar o papel de liderança.`,
		independent: `${binding.focus} A leitura examina uma proposta pequena que caiba nos recursos atuais. O tempo e o limite da entrega precisam ficar visíveis antes de assumir despesa ou compromisso público.`,
		transition: `${binding.focus} O primeiro registro pode ser ${binding.probe?.sample ?? 'uma etapa acessível da alternativa'}; ele mostrará apenas o que couber no acesso a ${binding.probe?.access ?? 'recursos disponíveis'}. ${binding.constraint ? `A condição de preservar ${binding.constraint} continua valendo; a amostra ainda não demonstra substituição da atividade atual.` : 'A comparação ainda depende das condições reais da atividade atual e da alternativa.'}`,
		relationships: `${binding.focus} A leitura examina como uma entrega compartilhada distribui decisões, trabalho e retorno. O primeiro acordo observável permite conferir se a cooperação sustenta a contribuição de cada pessoa.`,
		general: `${binding.focus} Uma tarefa já acessível permite observar a utilidade do resultado, o interesse em repeti-la e o esforço necessário. A leitura organiza essas observações pelas funções do mapa.`
	};
	const followUpQuestions: Record<CompassContext['key'], [string, string]> = {
		workload: [
			'Que condição concreta permitiria descansar agora, se você conseguir identificá-la?',
			'Se um registro opcional ampliar o cansaço, o que pode ficar em aberto por enquanto?'
		],
		study: [
			'Que tempo, material e orientação cada exercício exigiu?',
			'Que resultado distinguiria o interesse pela ideia do curso do interesse pela prática?'
		],
		leadership: [
			'Quem decide, executa e recebe retorno em uma entrega pequena?',
			'Que parte do acordo precisa mudar se o custo da entrega ficar desigual?'
		],
		independent: [
			'Qual etapa cabe nos recursos que você já possui?',
			'Que sinal mostraria que a proposta precisa ser reduzida ou adiada?'
		],
		transition: [
			binding.probe?.kind === 'illustration'
				? 'Você tem papel ou alguma ferramenta de desenho que já usa para fazer o rascunho?'
				: binding.probe?.kind === 'ceramics'
					? 'A quais etapas e recursos você tem acesso hoje: argila para modelar, espaço para secar e local para queimar?'
					: binding.probe
						? `A quais recursos para ${binding.probe.sample} você tem acesso hoje?`
						: 'Qual problema da alternativa você consegue investigar agora com os recursos disponíveis?',
			'Que resultado da etapa executada mudaria sua hipótese sem ameaçar a atividade atual?'
		],
		relationships: [
			'Como as pessoas envolvidas descrevem suas responsabilidades na mesma tarefa?',
			'Que acordo precisa ser revisto se o retorno ou a carga não forem distribuídos como esperado?'
		],
		general: [
			'Que recurso real permite executar uma tarefa pequena nesta direção?',
			'Que resultado observado faria você ajustar o próximo passo?'
		]
	};
	const practiceByContext: Record<CompassContext['key'], string> = {
		workload:
			'Descanso pode ser o próximo passo. Só se houver margem depois, faça o registro opcional descrito acima; interrompa se ele ampliar o cansaço.',
		study:
			'Compare dois exercícios acessíveis. Registre compreensão, eventuais correções, tempo e orientação necessária antes de escolher uma formação.',
		leadership:
			'Esboce uma entrega pequena com decisões, responsáveis e retorno combinado. Observe o cumprimento apenas se a equipe executar a entrega.',
		independent:
			'Esboce uma etapa que caiba nos recursos atuais. Anote esforço, resultado e o que faltaria antes de prometer uma entrega.',
		transition:
			binding.probe?.kind === 'ceramics'
				? 'Registre se houve plano, modelagem ou etapa posterior e quanto tempo e material cada uma exigiu. Não extrapole do esboço para produção ou renda.'
				: 'Registre a etapa da alternativa que foi acessível e se houve execução ou apenas plano. Compare o esforço com a atividade atual só se houver uma tarefa de duração e condições semelhantes; caso contrário, anote apenas o custo observado.',
		relationships:
			'Em uma tarefa compartilhada, registre o acordo, as ações de cada pessoa e o retorno recebido antes de ampliar compromissos.',
		general:
			'Execute uma tarefa acessível e curta. Registre resultado, esforço e uma evidência contrária antes de escolher o próximo passo.'
	};
	return {
		version: edition === 'v5' ? COMPASS_READING_VERSION_V5 : COMPASS_READING_VERSION,
		productId: 'career-compass',
		title: 'Bússola de Carreira',
		opening:
			edition === 'v5'
				? `${binding.focus} Uma direção possível é ${direction.contribution}, experimentando ${regency.method}. Compare essa hipótese com sua motivação, o ambiente de trabalho e as condições reais para sustentar a escolha.`
				: openingByContext[binding.key],
		source:
			'Método ATVNA de funções do trabalho: síntese natal humanista com regência moderna, cinco temas, aspectos selecionados e contexto declarado.',
		sections,
		questions: [
			binding.question,
			edition === 'v5'
				? `Que condição do ambiente permite experimentar ${regency.method} sem ultrapassar seus limites?`
				: followUpQuestions[binding.key][0],
			edition === 'v5'
				? 'Que evidência faria você ajustar ou abandonar essa hipótese?'
				: followUpQuestions[binding.key][1]
		],
		practice:
			edition === 'v5'
				? `Faça o experimento privado de até vinte minutos, sem despesa: ${binding.task}. Use o procedimento de ${procedures[ruler.body]}. Registre resultado, custo e evidência contrária; escolha um próximo passo reversível.`
				: practiceByContext[binding.key],
		limits:
			edition === 'v5'
				? c.limits
				: [
						'As posições do mapa dependem da data, hora, local e fuso informados. Confira esses dados se a leitura parecer incompatível com o registro de nascimento.',
						'A base de cálculo astronômico ainda está em validação. Posições próximas de limites de signo ou de casa, e horários históricos, exigem conferência adicional antes de interpretações finas.',
						'Os contatos entre planetas não indicam datas ou acontecimentos futuros. Quando uma casa não puder ser calculada, a leitura não atribui uma casa por suposição.',
						'A Bússola propõe hipóteses para comparar com a experiência; não determina profissão, competência, renda, contratação ou sucesso. Formação, saúde, responsabilidades, oportunidades e recursos reais delimitam qualquer escolha.'
					],
		editorial: {
			version: edition === 'v5' ? COMPASS_READING_VERSION_V5 : COMPASS_READING_VERSION,
			canon: CANON_VERSION,
			graph: 'atv-compass-work-graph/1.0.0',
			selection: selected.map((s) => ({
				factId: s.aspect.factId,
				score: Math.round(s.score * 1000) / 1000,
				reason:
					edition === 'v5'
						? 'personal-endpoints*5+mc-ruler*6+shared-themes*4+context-shared-themes*8+6-orb'
						: 'personal-endpoints*5+mc-ruler*6+shared-themes*4+context-themed-relations*8+6-orb'
			})),
			patterns: data.angular.map((a) => ({
				kind: 'mc-proximity',
				factIds: [a.factId, `position-${a.body}`, 'angle-midheaven']
			})),
			themes: Object.entries(themeBodies(ruler.body)).map(([id, bodies]) => ({
				id,
				factIds: unique([
					...(id === 'contribution' ? core : []),
					...bodies.map((b) => required(g, b).factId)
				])
			})),
			context: { key: binding.key, factId: g.contextFactId },
			plan
		}
	};
}
export function reviewReconstructedCompass(
	input: WorkflowInput,
	c: CalculationSnapshot,
	r: TrialReading
): string[] {
	try {
		assertCompassProjection(input, c);
	} catch {
		return ['compass-source-mismatch'];
	}
	const errors: string[] = [];
	if (
		r.productId !== 'career-compass' ||
		(r.version !== COMPASS_READING_VERSION && r.version !== COMPASS_READING_VERSION_V5) ||
		r.editorial?.canon !== CANON_VERSION ||
		r.editorial.graph !== 'atv-compass-work-graph/1.0.0'
	)
		errors.push('compass-edition');
	if (r.sections.length !== 11 || r.sections.some((s) => s.text.length < 220))
		errors.push('compass-depth');
	if (
		r.editorial?.plan.length !== r.sections.length ||
		r.sections.some(
			(s, i) =>
				s.title !== r.editorial?.plan[i].title ||
				JSON.stringify(s.factIds) !== JSON.stringify(r.editorial?.plan[i].factIds)
		)
	)
		errors.push('compass-plan');
	if (compassMethod.themes.some((id) => !r.editorial?.themes.some((t) => t.id === id)))
		errors.push('compass-themes');
	if (
		input.context &&
		!r.sections.some(
			(s) => s.factIds.includes('personal-context') && s.text.includes(input.context!)
		)
	)
		errors.push('compass-context');
	if (
		r.questions.length !== 3 ||
		!r.sections.some(
			(s) => s.text.includes('evidência contrária') && s.text.includes('vinte minutos')
		)
	)
		errors.push('compass-review');
	return errors;
}
