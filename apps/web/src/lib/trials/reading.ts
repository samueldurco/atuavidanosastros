import {
	parseWorkflowInput,
	productCatalog,
	type CalculationSnapshot,
	type WorkflowInput
} from '@atv/domain';
import {
	bodyEditorial,
	cardEditorial,
	signEditorial,
	trialProfiles,
	TRIAL_CONTENT_VERSION,
	TRIAL_POLICY_VERSION,
	sourceNotice,
	symbolicNotice
} from './content';

export type TrialReading = {
	version: string;
	productId: string;
	title: string;
	opening: string;
	source: string;
	sections: { title: string; text: string; factIds: string[] }[];
	questions: string[];
	practice: string;
	limits: string[];
};
export type TrialApproval = {
	status: 'approved';
	scope: 'private-free-test';
	policy: string;
	digest: string;
};
export type SavedTrial = {
	id: string;
	product_id: string;
	created_at: string;
	input: WorkflowInput;
	calculation: CalculationSnapshot;
	reading: TrialReading;
	approval: TrialApproval;
};
export type TrialFeedback = {
	product_id: string;
	reading_id: string;
	decision: 'approved' | 'rejected';
	comment: string;
	updated_at: string;
};

export function composeTrialReading(
	input: WorkflowInput,
	calculation: CalculationSnapshot
): TrialReading {
	const profile = trialProfiles[input.productId];
	const product = productCatalog.find((p) => p.id === input.productId);
	if (!profile || !product || !calculation.facts.length) throw new Error('Leitura indisponível.');
	const sections: TrialReading['sections'] = [];
	const chapterFacts = calculation.facts.filter((f) => f.kind !== 'reported');
	for (const fact of chapterFacts) {
		const sign = Object.keys(signEditorial).find((s) => fact.display.includes(s));
		const body = Object.keys(bodyEditorial).find((b) => fact.display.startsWith(`${b}:`));
		let text: string;
		if (sign) {
			const [strength, mode, excess, experiment] = signEditorial[sign];
			text = `${body ? `Este ponto oferece uma lente para ${bodyEditorial[body]}.` : 'Este ponto descreve uma lente simbólica para esta área da leitura.'} ${sign} oferece a possibilidade de ${strength}. Um modo possível de experimentar essa lente é ${mode}. Um excesso a observar é ${excess}. Experimento: ${experiment}. Observe se isso faz sentido para você; descarte a hipótese se ela não corresponder à sua realidade.`;
		} else if (fact.kind === 'drawn') {
			const cards = calculation.data.cards as { cardId: string; position: number }[];
			const card = cards?.find((c) => fact.id === `card-${c.position}`);
			if (!card) throw new Error('Carta sem origem verificável.');
			const [theme, action] = cardEditorial(card.cardId);
			text = `A imagem desta carta convida a refletir sobre ${theme}. Ela não determina acontecimentos nem a vontade de outra pessoa. ${action} Relacione essa possibilidade à pergunta desta posição e registre um fato real que apoie ou enfraqueça a hipótese.`;
		} else if (fact.id.includes('aspect') || fact.display.includes('orb')) {
			text =
				'Esta relação geométrica pode ser usada como uma tensão ou uma ponte entre temas, nunca como uma obrigação de agir. Conjunção reúne temas; sextil e trígono sugerem possibilidades de cooperação; quadratura e oposição convidam a observar diferenças. Compare apenas o aspecto registrado acima com um episódio concreto. Escolha um acordo ou um ajuste pequeno e confira o resultado antes de ampliar a mudança.';
		} else {
			text =
				'Use este registro como referência concreta para a reflexão. Compare o que foi registrado com sua experiência e anote o que mudou, o que permanece incerto e qual pequena ação depende de você. Um registro ausente não permite concluir que um acontecimento ocorreu ou que existe um padrão.';
		}
		sections.push({ title: fact.display, text, factIds: [fact.id] });
	}
	for (const fact of calculation.facts.filter((f) => f.kind === 'reported')) {
		sections.push({
			title: 'O que você trouxe: ' + fact.id,
			text: fact.display,
			factIds: [fact.id]
		});
	}
	if (input.dream) {
		sections.push({
			title: 'Duas hipóteses para você investigar',
			text: 'Uma possibilidade é que a cena ajude a organizar uma emoção que você já reconhece no cotidiano. Outra é que reúna lembranças, imagens e associações sem um significado único. Para distinguir essas hipóteses, pergunte quando sentiu uma emoção semelhante acordado e o que cada imagem significa na sua própria história. Nenhuma delas é diagnóstico ou explicação definitiva.',
			factIds: calculation.facts.filter((f) => f.kind === 'reported').map((f) => f.id)
		});
	}
	if (input.productId === 'career-compass') {
		const mc = calculation.facts.find((f) => f.id === 'angle-midheaven');
		const sign = mc && Object.keys(signEditorial).find((s) => mc.display.includes(s));
		if (!mc || !sign) throw new Error('Meio do Céu sem origem verificável.');
		const [strength, mode, excess, experiment] = signEditorial[sign];
		const roles = [
			[
				'Direção pública e contribuição',
				`A referência de ${sign} no MC permite investigar ${strength} como contribuição possível. Procure uma situação em que essa contribuição tenha ajudado alguém e outra em que não tenha sido útil. Seu reconhecimento também depende de experiência, formação, oportunidades e condições sociais; o mapa não escolhe profissão nem prevê renda.`
			],
			[
				'Ambientes e modos de trabalho',
				`Como possibilidade, experimente ${mode} em uma tarefa que você já consegue realizar. Compare um ambiente com autonomia e outro com colaboração: em qual deles você consegue tornar sua contribuição visível e preservar descanso? Recursos disponíveis, acessibilidade, vínculos e responsabilidades podem tornar uma opção viável ou inviável; ajuste o experimento ao seu contexto.`
			],
			[
				'Tensão ou excesso e como observar',
				`Uma tensão possível desta lente é ${excess}. Observe um episódio concreto, o custo dessa resposta e uma alternativa que esteja ao seu alcance. Experimento reversível: ${experiment}. Se não reconhecer essa tensão, registre a diferença em vez de forçar uma identificação.`
			],
			[
				'Síntese para uma escolha sua',
				`Use a contribuição de ${strength} como hipótese, compare os ambientes em que pode ${mode} e estabeleça um limite para ${excess}. O próximo passo é um experimento pequeno, com data de revisão e critério para continuar ou parar. O contexto que você declarou é relato; ele ajuda sua comparação e não altera o MC calculado.`
			]
		];
		for (const [title, text] of roles) sections.push({ title, text, factIds: [mc.id] });
	}
	for (const [index, chapter] of (input.productId === 'career-compass'
		? []
		: profile.chapters
	).entries()) {
		sections.push({
			title: chapter,
			text: `${profile.questions[index % profile.questions.length]} ${index === 0 ? profile.practice : 'Escreva um exemplo observado, uma alternativa possível e um limite que você deseja respeitar. Revise a resposta depois do experimento.'}`,
			factIds: calculation.facts.slice(index, index + 1).map((f) => f.id)
		});
	}
	return {
		version: TRIAL_CONTENT_VERSION,
		productId: input.productId,
		title: product.name,
		opening: profile.opening,
		source: sourceNotice,
		sections,
		questions: [...profile.questions],
		practice: profile.practice,
		limits: [
			...new Set([
				symbolicNotice,
				...calculation.limits,
				'Aprovação automática exclusiva para seu teste privado. A sua avaliação deste produto será registrada separadamente.'
			])
		]
	};
}

export function canonical(value: unknown): string {
	if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
	if (value && typeof value === 'object')
		return (
			'{' +
			Object.entries(value)
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([k, v]) => JSON.stringify(k) + ':' + canonical(v))
				.join(',') +
			'}'
		);
	return JSON.stringify(value);
}

/** Server-owned deterministic review. Neither a client flag nor a hash authenticates a reading. */
export async function approveTrialReading(
	input: WorkflowInput,
	calculation: CalculationSnapshot,
	candidate: TrialReading
): Promise<TrialApproval | null> {
	if (
		!parseWorkflowInput(input) ||
		!trialProfiles[input.productId] ||
		!Array.isArray(calculation.facts) ||
		calculation.facts.length === 0 ||
		calculation.facts.length > 1500 ||
		!calculation.version ||
		!calculation.limits.length
	)
		return null;
	const ids = new Set<string>();
	for (const fact of calculation.facts) {
		if (
			!fact.id ||
			ids.has(fact.id) ||
			!['reported', 'drawn', 'calculated'].includes(fact.kind) ||
			!fact.display?.trim() ||
			!fact.source?.trim()
		)
			return null;
		ids.add(fact.id);
	}
	if (canonical(candidate) !== canonical(composeTrialReading(input, calculation))) return null;
	if (candidate.sections.some((s) => !s.text.trim() || s.factIds.some((id) => !ids.has(id))))
		return null;
	const covered = new Set(candidate.sections.flatMap((s) => s.factIds));
	if ([...ids].some((id) => !covered.has(id))) return null;
	const payload = canonical({
		policy: TRIAL_POLICY_VERSION,
		input,
		calculation,
		reading: candidate
	});
	if (payload.length > 750000) return null;
	const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
	const digest = [...new Uint8Array(bytes)].map((x) => x.toString(16).padStart(2, '0')).join('');
	return { status: 'approved', scope: 'private-free-test', policy: TRIAL_POLICY_VERSION, digest };
}
