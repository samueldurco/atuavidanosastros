import { DIRECTION_NOTE_VERSION } from '$lib/trials/reconstruction/direction-check-ins';
import { error } from '@sveltejs/kit';
import { productCatalog, workflowFor, type WorkflowInput } from '@atv/domain';
import { calculateTrial } from '$lib/server/trial-calculation';
import { approveTrialReading, composeTrialReading } from '$lib/trials/reading';
import type { PageServerLoad } from './$types';
import { customerProducts } from '$lib/data/product-copy';
import { productDetails } from '$lib/data/product-details';
import { prepareClubContinuity, type ClubState } from '$lib/trials/club-continuity';

// Local rendering evidence. Never grants access or persists a reading/approval.
export const load: PageServerLoad = async ({ url, setHeaders }) => {
	if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) error(404);
	setHeaders({ 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex, nofollow' });
	const productId = url.searchParams.get('product') ?? 'career-compass';
	const view = url.searchParams.get('view') ?? 'result';
	const workflow = workflowFor(productId),
		product = productCatalog.find((p) => p.id === productId);
	if (
		!workflow ||
		!product ||
		!['result', 'download', 'intake', 'club', 'catalog', 'index', 'library'].includes(view)
	)
		error(404);
	const birth = {
		localDateTime: '2000-01-01T12:00:00',
		utcInstant: '2000-01-01T12:00:00Z',
		timezone: 'UTC',
		latitude: 0,
		longitude: 0,
		locationSource: 'synthetic'
	};
	const input: WorkflowInput = {
		version: 'atv-workflow/1.0.0',
		productId,
		consent: {
			storage: true,
			partner: workflow.kind === 'relationship',
			continuity: false,
			policyVersion: 'atv-input-consent/1'
		}
	};
	if (
		['natal', 'cycles', 'relationship', 'purpose'].includes(workflow.kind) &&
		productId !== 'direction-journey'
	)
		input.birth = birth;
	if (workflow.kind === 'relationship') {
		input.partner = {
			...birth,
			localDateTime: '2001-01-01T12:00:00',
			utcInstant: '2001-01-01T12:00:00Z'
		};
		input.presentation = {
			version: 'atv-reading-identity/1',
			name: 'Pessoa sintética A',
			partnerName: 'Pessoa sintética B',
			city: 'Cidade sintética A',
			partnerCity: 'Cidade sintética B'
		};
	}
	if (workflow.kind === 'cycles') input.targetDate = '2026-10-06';
	if (productId === 'personal-calendar') {
		input.targetDate = '2026-01-01';
		input.context = 'Quero negociar responsabilidades de trabalho e reservar tempo para estudar.';
		input.calendarMarks = {
			authorization: 'atv-personal-calendar-marks/1',
			entries: [{ date: '2026-01-15', label: 'Revisão de prioridades com a equipe' }]
		};
	}
	if (productId === 'solar-return') {
		input.targetDate = '2026-01-01';
		input.returnYear = 2026;
		input.returnLocation = {
			city: 'São Paulo',
			timezone: 'America/Sao_Paulo',
			latitude: -23.55,
			longitude: -46.63,
			locationSource: 'synthetic-reconstruction'
		};
		input.context = 'Quero negociar responsabilidades de trabalho e reservar tempo para estudar.';
	}
	if (productId === 'week-reading')
		input.context =
			'Fuso atual declarado: America/Sao_Paulo (não usado para calcular dias locais).\nTema escolhido: Organização e prioridades.\n\nContexto declarado: Quero rever o excesso de tarefas sem abandonar meu projeto.';
	if (productId === 'horoscope')
		input.context =
			'Quero negociar as prioridades de trabalho sem assumir mais compromissos do que consigo cumprir.';
	if (productId === 'career-compass')
		input.context =
			url.searchParams.get('compassContext') === 'study'
				? 'Quero avaliar um curso de formação antes de me inscrever.'
				: url.searchParams.get('compassContext') === 'workload'
					? 'Estou com sobrecarga e preciso preservar descanso.'
					: 'Quero comparar uma atividade atual com um projeto pessoal.';
	if (productId === 'three-pillars')
		input.context =
			url.searchParams.get('pillarsContext') === 'workload'
				? 'Estou com sobrecarga e preciso preservar descanso.'
				: 'Quero observar como inicio uma conversa e apresento minhas necessidades.';
	if (productId === 'birth-chart')
		input.context =
			url.searchParams.get('birthContext') === 'workload'
				? 'Estou com sobrecarga e preciso preservar descanso.'
				: 'Quero estudar e explicar melhor o que aprendo.';
	if (productId === 'ascendant')
		input.context =
			url.searchParams.get('ascendantContext') === 'workload'
				? 'Estou com sobrecarga e preciso preservar descanso.'
				: 'Quero abrir uma conversa e explicar minhas necessidades.';
	if (productId === 'midheaven')
		input.context =
			url.searchParams.get('midheavenContext') === 'workload'
				? 'Estou com sobrecarga e preciso preservar descanso.'
				: 'Quero abrir uma conversa sobre a responsabilidade que consigo assumir.';
	if (productId === 'purpose-career')
		input.context =
			'Quero mudar de área e testar uma contribuição sem comprometer meus recursos e descanso.';
	if (productId === 'couple-dossier') {
		input.context =
			'Estamos em cidades diferentes e queremos combinar presença e espaço individual.';
		input.questions = [
			'Como manter presença à distância?',
			'Como conversar quando discordamos?',
			'Como combinar espaço individual?'
		];
	}
	if (productId === 'direction-journey')
		input.journey = {
			goal: 'Experimentar uma atividade com horário de descanso.',
			startDate: '2026-10-06'
		};
	if (productId === 'life-atlas')
		input.atlas = {
			priorities:
				url.searchParams.get('atlasSet') === 'other'
					? [
							'Recursos e autonomia',
							'Casa e pertencimento',
							'Identidade e escolhas',
							'Redes e projetos'
						]
					: [
							'Autocuidado e rotina',
							'Vínculos e acordos',
							'Trabalho e contribuição',
							'Aprendizado e expressão'
						]
		};
	if (workflow.kind === 'dream')
		input.dream = {
			date: '2026-10-06',
			narrative: '<script>window.pwned=true</script> Vi uma ponte e uma pessoa amiga.',
			emotions: ['curiosidade'],
			associations: ['travessia']
		};
	if (productId === 'tarot-journey') input.tarotJourney = { goal: 'Organizar um projeto pessoal.' };
	const id = '00000000-0000-4000-8000-000000000031';
	// Intakes do not need a result; use an actual MC calculation for the shared result shape.
	const calcInput: WorkflowInput = ['result', 'download'].includes(view)
		? input
		: {
				version: input.version,
				productId: 'career-compass',
				birth,
				consent: { ...input.consent, partner: false, continuity: false }
			};
	const calculation = await calculateTrial(calcInput, id);
	const reading = composeTrialReading(calcInput, calculation),
		approval = await approveTrialReading(calcInput, calculation, reading);
	if (!approval) error(500, 'Falha na prova local.');
	const saved = {
		id,
		product_id: calcInput.productId,
		created_at: '2026-10-06T12:00:00Z',
		input: calcInput,
		calculation,
		reading,
		approval
	};
	const continuityState: ClubState = { revision: 0, granted: false, available: true, items: [] };
	if (
		url.searchParams.get('continuity') === 'saved' ||
		url.searchParams.get('continuity') === 'unavailable'
	) {
		continuityState.revision = 1;
		continuityState.granted = true;
		continuityState.items = [
			{
				id: '11111111-1111-4111-8111-111111111111',
				readingId: id,
				selection: {
					kind: 'reported',
					category: 'recurrence',
					text: 'Relato sintético: quero retomar uma escolha de carreira.'
				},
				source: {
					productId: saved.product_id,
					title: reading.title,
					version: reading.version,
					policy: approval.policy,
					digest: approval.digest,
					text: 'Relato sintético: quero retomar uma escolha de carreira.',
					limits: reading.limits
				}
			}
		];
		if (url.searchParams.get('continuity') === 'unavailable') {
			continuityState.available = false;
			continuityState.items[0].source = null;
		}
	}
	return {
		view,
		trialAccess: url.searchParams.get('continuity') !== 'unavailable',
		catalog: {
			product: customerProducts.find((p) => p.id === productId)!,
			details: productDetails[productId as keyof typeof productDetails],
			seo: {
				title: product.name,
				description: 'Prova local sintética.',
				path: '/testar-produtos/_spec',
				indexable: false,
				managePrimary: true
			}
		},
		index: { products: productCatalog, readings: [], feedback: [], libraryUnavailable: false },
		library: {
			readings: [
				{
					id,
					product_id: 'career-compass',
					created_at: saved.created_at,
					version: saved.reading.version
				}
			],
			unavailable: false
		},
		intake: { product: workflow, dreams: [], previous: null },
		result: {
			saved,
			product,
			feedback: null,
			notes:
				productId === 'direction-journey' && url.searchParams.get('directionNotes') === 'complete'
					? [0, 7, 14, 30].map((step) => ({
							step,
							updated_at: '2026-11-10T12:00:00Z',
							text: JSON.stringify({
								version: DIRECTION_NOTE_VERSION,
								step,
								observation:
									step === 0
										? 'Espero conhecer uma tarefa sem perder descanso.'
										: step === 30
											? 'Observei interesse, mas a tarefa inteira não coube no tempo.'
											: `Fiz uma amostra no dia ${step}.`,
								conditions: 'Vinte minutos disponíveis; sem despesa.',
								counterevidence: 'A amostra não representa toda a atividade.',
								next: 'Reduzir o escopo e rever a condição de tempo.',
								decision: step === 30 ? 'adjust' : 'undecided'
							})
						}))
					: productId === 'life-atlas' && url.searchParams.get('atlasNotes') === 'complete'
						? [0, 7, 14, 21, 30].map((step) => ({
								step,
								updated_at: '2026-11-10T12:00:00Z',
								text: `Dia ${step}: observei uma tarefa, preservei meu limite e registrei uma evidência contrária.`
							}))
						: [],
			readerState: { chapter: 0, bookmarks: [] }
		},
		download: { saved },
		club: {
			products: productCatalog.filter((p) => p.id !== 'atv-plus'),
			readings: [
				{
					id,
					product_id: 'career-compass',
					created_at: saved.created_at,
					version: saved.reading.version
				}
			],
			feedback: null,
			continuity: { state: continuityState, preparation: prepareClubContinuity(continuityState) },
			continuityReadings: [
				{ id, title: reading.title, chapters: reading.sections.map((section) => section.title) }
			]
		}
	};
};
