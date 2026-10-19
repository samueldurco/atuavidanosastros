import type { OfferedProductId } from '@atv/domain';

export type ContextualOfferKind = 'upsell' | 'downsell';
export type ContextualOfferMoment =
	| 'post-purchase'
	| 'after-reading-or-theme-choice'
	| 'after-short-reading'
	| 'near-birthday'
	| 'after-reading-with-consent'
	| 'after-important-dream-marked'
	| 'after-two-or-three-records'
	| 'after-public-offer-declined';
export type ContextualOfferStatus = 'DECIDED_PREPARING' | 'HISTORICAL_CANDIDATE';

export interface ContextualOfferPresentation {
	sourceId: OfferedProductId;
	targetId: OfferedProductId;
	kind: ContextualOfferKind;
	moment: ContextualOfferMoment;
	status: ContextualOfferStatus;
	eyebrow: string;
	headline: string;
	opening: string;
	comparison: string;
	decision: string;
}

/**
 * Preparatory presentations for documented journey edges. Only the first edge
 * has an owner decision in the current session. The others are historical
 * candidates (product funnel architecture, section 8.2 or 8.4), not active
 * commercial offers. A URL never proves a purchase, reading or refusal.
 * Future activation must validate the trigger and eligibility on the server.
 */
export const contextualOfferPresentations = {
	'upsell-birth-chart-life-atlas-post-purchase': {
		sourceId: 'birth-chart',
		targetId: 'life-atlas',
		kind: 'upsell',
		moment: 'post-purchase',
		status: 'DECIDED_PREPARING',
		eyebrow: 'Mapa Astral · Proposta para depois da compra',
		headline: 'Do mapa inteiro aos temas que você quer aprofundar',
		opening:
			'Se você escolheu o Mapa Astral Completo, pode querer olhar com mais atenção para assuntos específicos. O Mapa Astral por Temas, também chamado de Mapa Astral Aprofundado, organiza outra leitura do seu mapa em quatro temas escolhidos por você.',
		comparison:
			'O Mapa Astral Completo apresenta os fatores do nascimento em conjunto. A leitura por temas parte do mesmo mapa e concentra a interpretação nos quatro assuntos que você indicar; não substitui a visão integrada da primeira leitura.',
		decision:
			'Pense nos assuntos sobre os quais gostaria de refletir com mais detalhe. Você pode conhecer a proposta por temas com calma, mesmo que ainda não tenha aberto a leitura completa.'
	},
	'upsell-birth-chart-life-atlas-after-reading-or-theme-choice': {
		sourceId: 'birth-chart',
		targetId: 'life-atlas',
		kind: 'upsell',
		moment: 'after-reading-or-theme-choice',
		status: 'HISTORICAL_CANDIDATE',
		eyebrow: 'Mapa Astral · Possível aprofundamento',
		headline: 'Quatro temas para olhar com mais atenção',
		opening:
			'Se, depois de explorar o Mapa Astral Completo, você quiser aprofundar alguns assuntos — ou já souber quais temas quer escolher —, o Mapa Astral por Temas organiza uma nova leitura em quatro temas indicados por você.',
		comparison:
			'O mapa completo reúne planetas, casas e aspectos numa visão integrada. A leitura por temas usa o mapa natal para se concentrar nos quatro assuntos escolhidos, sem substituir aquela visão de conjunto.',
		decision:
			'Considere quais temas merecem uma leitura própria. Esta possibilidade histórica ainda precisa de um gatilho verificável antes de integrar a jornada.'
	},
	'upsell-three-pillars-birth-chart-after-short-reading': {
		sourceId: 'three-pillars',
		targetId: 'birth-chart',
		kind: 'upsell',
		moment: 'after-short-reading',
		status: 'HISTORICAL_CANDIDATE',
		eyebrow: 'Mapa Astral · Da primeira leitura ao conjunto',
		headline: 'Além de Sol, Lua e Ascendente',
		opening:
			'Se a leitura de Sol, Lua e Ascendente despertou outras perguntas sobre o mapa, o Mapa Astral Completo amplia o recorte para planetas, casas e aspectos.',
		comparison:
			'Sol, Lua e Ascendente se limita aos três pilares. O Mapa Astral Completo reúne mais fatores do nascimento numa interpretação integrada.',
		decision:
			'A leitura mais ampla faz sentido quando você deseja relacionar os três pilares aos demais elementos do mapa.'
	},
	'upsell-week-reading-solar-return-near-birthday': {
		sourceId: 'week-reading',
		targetId: 'solar-return',
		kind: 'upsell',
		moment: 'near-birthday',
		status: 'HISTORICAL_CANDIDATE',
		eyebrow: 'Ciclos e Tempo · Uma escala mais longa',
		headline: 'Da semana ao seu ano astrológico',
		opening:
			'Perto de um aniversário, talvez você queira olhar além dos trânsitos de uma semana. O Mapa do Seu Ano apresenta a Revolução Solar para o período de um aniversário ao seguinte.',
		comparison:
			'O Horóscopo Semanal Pessoal mostra trânsitos e dias em destaque na semana escolhida. A Revolução Solar interpreta o mapa do retorno do Sol para um ciclo anual.',
		decision:
			'São escalas diferentes: escolha a que corresponde à pergunta que você quer explorar agora.'
	},
	'upsell-synastry-couple-dossier-after-reading-with-consent': {
		sourceId: 'synastry',
		targetId: 'couple-dossier',
		kind: 'upsell',
		moment: 'after-reading-with-consent',
		status: 'HISTORICAL_CANDIDATE',
		eyebrow: 'Amor e Relações · Outro nível de contexto',
		headline: 'Aprofundar a leitura dos dois mapas',
		opening:
			'Se vocês quiserem ir além da comparação dos mapas, o Aprofundamento Astral do Casal organiza a leitura pelos temas da relação e considera o contexto que quiserem contar.',
		comparison:
			'A Análise Astral do Casal compara afinidades e diferenças entre dois mapas. O aprofundamento lê essa comparação com mais detalhe e com o contexto da relação, mediante autorização para usar os dados da outra pessoa.',
		decision:
			'Esse passo só deve ser apresentado na jornada após a leitura anterior e com o consentimento necessário para os dados de ambos.'
	},
	'upsell-dream-reading-dream-dossier-after-important-dream-marked': {
		sourceId: 'dream-reading',
		targetId: 'dream-dossier',
		kind: 'upsell',
		moment: 'after-important-dream-marked',
		status: 'HISTORICAL_CANDIDATE',
		eyebrow: 'Sonhos e Símbolos · Um sonho em foco',
		headline: 'Voltar a um sonho que pede mais atenção',
		opening:
			'Se você reconhecer um sonho como importante ou recorrente, o Dossiê do Sonho propõe uma leitura mais aprofundada desse relato, organizada pelas suas associações.',
		comparison:
			'A leitura inicial interpreta símbolos a partir do relato, das emoções e das associações. O dossiê aprofunda um sonho com os temas que você quiser explorar.',
		decision:
			'O aprofundamento pode servir quando há um sonho específico ao qual você quer dedicar mais contexto.'
	},
	'upsell-dream-dossier-dream-atlas-after-two-or-three-records': {
		sourceId: 'dream-dossier',
		targetId: 'dream-atlas',
		kind: 'upsell',
		moment: 'after-two-or-three-records',
		status: 'HISTORICAL_CANDIDATE',
		eyebrow: 'Sonhos e Símbolos · Do sonho ao conjunto',
		headline: 'Quando os relatos começam a formar uma sequência',
		opening:
			'Se você estiver reunindo relatos de sonhos ao longo do tempo, o Atlas dos Sonhos organiza registros durante 30 dias e integra apenas os sonhos e contextos que você informar.',
		comparison:
			'O Dossiê do Sonho aprofunda um sonho. O Atlas dos Sonhos considera uma sequência de registros e oferece uma análise integrada ao final; interpretações individuais são leituras separadas.',
		decision:
			'A proposta de sequência só faz sentido se você quiser registrar sonhos durante o período e voltar ao conjunto depois.'
	},
	'downsell-birth-chart-three-pillars-after-public-offer-declined': {
		sourceId: 'birth-chart',
		targetId: 'three-pillars',
		kind: 'downsell',
		moment: 'after-public-offer-declined',
		status: 'HISTORICAL_CANDIDATE',
		eyebrow: 'Mapa Astral · Uma leitura mais delimitada',
		headline: 'Começar por Sol, Lua e Ascendente',
		opening:
			'Se o Mapa Astral Completo parece mais amplo do que você procura agora, Sol, Lua e Ascendente concentra a leitura nesses três fatores do nascimento.',
		comparison:
			'O Mapa Astral Completo reúne planetas, casas e aspectos. A alternativa de menor escopo se limita a Sol, Lua e Ascendente; ela não entrega a visão integrada do mapa completo.',
		decision:
			'Esta alternativa histórica só faria sentido após uma recusa explícita da oferta pública e se você ainda não possuísse a leitura menor.'
	},
	'downsell-dream-dossier-dream-reading-after-public-offer-declined': {
		sourceId: 'dream-dossier',
		targetId: 'dream-reading',
		kind: 'downsell',
		moment: 'after-public-offer-declined',
		status: 'HISTORICAL_CANDIDATE',
		eyebrow: 'Sonhos e Símbolos · Um primeiro olhar',
		headline: 'Uma leitura inicial de um sonho',
		opening:
			'Se você quer explorar um sonho sem o escopo aprofundado do Dossiê, a Leitura de Sonho parte do seu relato, das emoções e das associações para interpretar seus símbolos.',
		comparison:
			'O Dossiê aprofunda um sonho e organiza a leitura pelas suas associações e temas escolhidos. A Leitura de Sonho oferece uma interpretação inicial do relato.',
		decision:
			'Esta alternativa histórica só faria sentido após uma recusa explícita da oferta pública e se você ainda não possuísse a leitura inicial.'
	}
} as const satisfies Record<string, ContextualOfferPresentation>;

export type ContextualOfferSlug = keyof typeof contextualOfferPresentations;

export function contextualOfferForSlug(slug: string): ContextualOfferPresentation | undefined {
	return Object.prototype.hasOwnProperty.call(contextualOfferPresentations, slug)
		? contextualOfferPresentations[slug as ContextualOfferSlug]
		: undefined;
}
