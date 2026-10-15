import type { DreamAtlasFactSource, WorkflowInput } from '@atv/domain';
import { calculateDreamAtlasSnapshot } from '$lib/trials/dream-atlas-reading';
import { approveTrialReading, composeTrialReading, type SavedTrial } from '$lib/trials/reading';

/** Fixed fictional material for owner evaluation. Never creates or backdates a real diary. */
export async function dreamAtlasExample(): Promise<SavedTrial> {
	const input: WorkflowInput = {
		version: 'atv-workflow/1.0.0',
		productId: 'dream-atlas',
		dreamAtlas: { startDate: '2026-09-01' },
		consent: {
			storage: true,
			partner: false,
			continuity: false,
			policyVersion: 'atv-input-consent/1'
		}
	};
	const scenes = [
		[
			1,
			'Eu procurava uma sala em uma escola vazia. Tinha um caderno nas mãos, mas não sabia qual porta abrir.',
			'insegurança',
			'curso novo'
		],
		[
			3,
			'Encontrei uma ponte estreita. Uma pessoa conhecida esperava do outro lado e eu parei para olhar o rio.',
			'curiosidade',
			'mudança de casa'
		],
		[
			7,
			'Entrei na sala da escola e encontrei cadeiras em círculo. Escolhi uma perto da janela.',
			'curiosidade',
			'curso novo'
		],
		[
			11,
			'Eu organizava caixas na cozinha. Uma delas guardava fotografias que eu quis mostrar a alguém.',
			'saudade',
			'mudança de casa'
		],
		[
			17,
			'Na ponte, parei para conversar com uma amiga. O rio continuava alto, mas eu conseguia ouvir a voz dela.',
			'tranquilidade',
			'amizade'
		],
		[
			22,
			'Voltei à escola para apresentar um desenho. Pedi alguns minutos para terminar antes de falar.',
			'insegurança',
			'curso novo'
		],
		[
			26,
			'Abri as caixas na casa nova e reservei uma mesa para meus cadernos. As fotografias ficaram ao lado.',
			'tranquilidade',
			'mudança de casa'
		],
		[
			30,
			'Atravessei a ponte devagar e encontrei minha amiga. Falamos sobre os lugares que queríamos visitar.',
			'curiosidade',
			'amizade'
		]
	] as const;
	const entries: DreamAtlasFactSource[] = scenes.map(
		([day, narrative, emotion, association], i) => ({
			version: 'atv-dream-atlas-entry/1',
			id: `00000000-0000-4000-8000-${String(i + 501).padStart(12, '0')}`,
			revision: 1,
			dreamDate: `2026-09-${String(day).padStart(2, '0')}`,
			narrative: `Exemplo fictício: ${narrative}`,
			emotions: [emotion],
			associations: [association],
			includeInSynthesis: true
		})
	);
	const calculation = calculateDreamAtlasSnapshot(input.dreamAtlas!.startDate, entries);
	const reading = composeTrialReading(input, calculation);
	const approval = await approveTrialReading(input, calculation, reading);
	if (!approval) throw new Error('A demonstração não passou pela revisão desta edição.');
	return {
		id: '00000000-0000-4000-8000-000000000500',
		product_id: 'dream-atlas',
		created_at: '2026-10-01T12:00:00Z',
		input,
		calculation,
		reading,
		approval
	};
}
