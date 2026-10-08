import { error } from '@sveltejs/kit';
import { productCatalog, workflowFor, type WorkflowInput } from '@atv/domain';
import { calculateTrial } from '$lib/server/trial-calculation';
import { approveTrialReading, composeTrialReading } from '$lib/trials/reading';
import type { PageServerLoad } from './$types';
import { customerProducts } from '$lib/data/product-copy';
import { productDetails } from '$lib/data/product-details';

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
	if (productId === 'horoscope')
		input.context =
			'Quero negociar as prioridades de trabalho sem assumir mais compromissos do que consigo cumprir.';
	if (productId === 'career-compass')
		input.context = 'Quero comparar uma atividade atual com um projeto pessoal.';
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
		input.atlas = { priorities: ['cuidado', 'vínculos', 'trabalho', 'aprendizado'] };
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
	return {
		view,
		trialAccess: true,
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
			notes: [],
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
			feedback: null
		}
	};
};
