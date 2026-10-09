export const DIRECTION_NOTE_VERSION = 'atv-direction-check-in/1.0.0';
export const directionSteps = [0, 7, 14, 30] as const;
export type DirectionStep = (typeof directionSteps)[number];
export const directionDecisions = ['undecided', 'continue', 'adjust', 'pause', 'finish'] as const;
export type DirectionNote = {
	version: typeof DIRECTION_NOTE_VERSION;
	step: DirectionStep;
	observation: string;
	conditions: string;
	counterevidence: string;
	next: string;
	decision: (typeof directionDecisions)[number];
};
export type DirectionSavedNote = { step: number; text: string; updated_at: string };
export const decisionLabels = {
	undecided: 'Ainda não decidi',
	continue: 'Continuar',
	adjust: 'Ajustar',
	pause: 'Pausar',
	finish: 'Encerrar'
};
export function parseDirectionNote(text: unknown, step: unknown): DirectionNote | null {
	if (
		typeof text !== 'string' ||
		text.length > 3000 ||
		!directionSteps.includes(step as DirectionStep)
	)
		return null;
	try {
		const n = JSON.parse(text);
		if (
			!n ||
			Array.isArray(n) ||
			Object.keys(n).sort().join(',') !==
				'conditions,counterevidence,decision,next,observation,step,version' ||
			n.version !== DIRECTION_NOTE_VERSION ||
			n.step !== step ||
			!directionDecisions.includes(n.decision) ||
			(step === 30 ? n.decision === 'undecided' : n.decision !== 'undecided') ||
			!['observation', 'conditions', 'counterevidence', 'next'].every(
				(key) => typeof n[key] === 'string' && n[key].trim().length > 0 && n[key].length <= 600
			)
		)
			return null;
		return n;
	} catch {
		return null;
	}
}
export function directionSynthesis(notes: DirectionSavedNote[]) {
	const stages = directionSteps.map((step) => {
		const saved = notes.find((note) => note.step === step);
		return { step, saved, note: saved ? parseDirectionNote(saved.text, step) : null };
	});
	const baseline = stages[0].note,
		final = stages[3].note;
	return {
		stages,
		baseline,
		final,
		missing: stages.filter((stage) => !stage.note).map((stage) => stage.step),
		comparisonReady: !!baseline && !!final,
		complete: stages.every((stage) => !!stage.note),
		// This is a faithful comparison of reports. No score or success inference.
		intermediate: stages.slice(1, 3).filter((stage) => stage.note)
	};
}
