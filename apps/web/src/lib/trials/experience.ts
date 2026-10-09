/** Private, free-test experience contracts. These do not enable sales or override catalog gates. */
import { tarotMethods } from '@atv/domain';
export type Experience = {
	benefit: string;
	minutes: number;
	format: 'brief' | 'book' | 'journal' | 'calendar';
	pdf: boolean;
};
const contract = (
	benefit: string,
	minutes: number,
	format: Experience['format'],
	pdf = true
): Experience => ({ benefit, minutes, format, pdf });
export const experiences: Record<string, Experience> = {
	...Object.fromEntries(
		tarotMethods.map((method) => [
			method.id,
			contract(
				method.description,
				Math.max(4, method.positions.length * 2),
				method.positions.length > 5 ? 'book' : 'brief'
			)
		])
	),
	'birth-chart': contract(
		'Explore seis assinaturas do seu mapa, relacione os temas de vida e construa uma síntese para uma situação real.',
		20,
		'book'
	),
	'three-pillars': contract(
		'Relacione o que você expressa, o que precisa e como inicia uma experiência.',
		10,
		'book',
		false
	),
	ascendant: contract(
		'Relacione sua forma de aproximação ao regente, a Sol e Lua e aos contatos calculados; teste uma resposta em uma situação real.',
		12,
		'book',
		false
	),
	midheaven: contract(
		'Examine sua direção pública pelo regente, pela casa e pelas relações calculadas; teste uma responsabilidade que pode sustentar.',
		12,
		'book',
		false
	),
	horoscope: contract(
		'Escolha um tema pessoal para observar hoje e um cuidado que cabe no seu dia.',
		3,
		'brief',
		false
	),
	'date-reading': contract(
		'Prepare uma data com temas de observação, recursos e limites concretos.',
		5,
		'brief'
	),
	'week-reading': contract(
		'Organize prioridades e pausas a partir das sete amostras da semana.',
		7,
		'calendar'
	),
	'personal-calendar': contract(
		'Reúna referências do mês e seus marcos em uma agenda que você pode rever.',
		8,
		'calendar'
	),
	'solar-return': contract(
		'Escolha uma intenção para o novo ciclo e acompanhe como ela encontra a vida real.',
		15,
		'book'
	),
	synastry: contract(
		'Conversem sobre afeto, necessidades, comunicação e diferenças com exemplos dos dois.',
		15,
		'book'
	),
	'pair-preview': contract(
		'Comecem uma conversa sobre aproximação, necessidades e um primeiro acordo.',
		5,
		'brief'
	),
	'couple-dossier': contract(
		'Transformem a comparação dos dois mapas em conversas e acordos que possam ser revistos.',
		20,
		'book'
	),
	'career-compass': contract(
		'Compare contribuição, motivação e ambientes de trabalho num experimento curto e reversível.',
		12,
		'book',
		false
	),
	'purpose-career': contract(
		'Relacione contribuição, recursos e rotina antes de escolher um próximo passo.',
		12,
		'book'
	),
	'direction-journey': contract(
		'Acompanhe um objetivo com revisões nos dias 7, 14 e 30.',
		10,
		'journal',
		false
	),
	'life-atlas': contract(
		'Cruze o mapa com suas quatro prioridades e escolha uma experiência por vez.',
		20,
		'book'
	),
	'daily-card': contract(
		'Encontre uma pergunta e um gesto pequeno para experimentar hoje.',
		3,
		'brief',
		false
	),
	'tarot-focus': contract(
		'Organize uma questão presente em observação, recurso e próximo passo.',
		4,
		'brief'
	),
	'tarot-yes-no': contract(
		'Examine condições e alternativas antes de responder à sua pergunta.',
		4,
		'brief'
	),
	'three-questions': contract(
		'Compare três perguntas e veja qual ação conecta as respostas simbólicas.',
		7,
		'brief'
	),
	'tarot-journey': contract(
		'Acompanhe situação, recurso e experimento sem alterar as cartas da abertura.',
		8,
		'journal'
	),
	'dream-journal': contract(
		'Preserve seu relato, suas emoções e associações para voltar a eles depois.',
		4,
		'journal'
	),
	'dream-reading': contract(
		'Explore hipóteses a partir das suas próprias associações com o sonho.',
		7,
		'brief'
	),
	'dream-dossier': contract(
		'Compare o sonho atual com registros escolhidos, incluindo diferenças e lacunas.',
		12,
		'book'
	),
	'dream-atlas': contract(
		'Revise trinta dias de registros sem preencher os dias em que você não anotou sonhos.',
		12,
		'journal'
	),
	'atv-plus': contract(
		'Reabra suas leituras e reúna anotações para acompanhar o que mudou.',
		5,
		'journal',
		false
	)
};
export const experienceFor = (id: string) => experiences[id];

export function privateFormats(id: string, catalog: readonly string[]): string[] {
	const experience = experienceFor(id);
	return [
		...new Set([
			'txt',
			...catalog.filter((f) => f !== 'pdf' || experience?.pdf !== false),
			...(experience?.pdf ? ['pdf'] : [])
		])
	];
}
