import type { SavedTrial } from './reading';
import { buildChartScene, chartSceneSvg } from './chart-engine-v2';
export function trialText(saved: SavedTrial) {
	const r = saved.reading;
	return [
		r.title,
		r.opening,
		r.source,
		...r.sections.flatMap((s) => [s.title, s.text]),
		'Perguntas para refletir',
		...r.questions.map((q, i) => `${i + 1}. ${q}`),
		'Experimento prático',
		r.practice,
		'Limites da leitura',
		...r.limits,
		'Origem dos fatos',
		...saved.calculation.facts.map((f) => `${f.display} — ${f.source}`),
		'Teste privado gratuito - aprovação pessoal separada',
		`Salvo em ${saved.created_at}`,
		`Conteúdo: ${r.version}`,
		`Política: ${saved.approval.policy}`,
		`Revisão: ${saved.approval.digest}`
	].join('\n\n');
}
export function trialSvg(saved: SavedTrial) {
	return chartSceneSvg(buildChartScene(saved));
}
