import type { SavedTrial } from './reading';
import { longitudePoint } from '../product-cartography';
import { bodyNames, bodyGlyphs, signNames, nominalDegree, trialGeometry } from './cartography';
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
const xml = (s: string) =>
	s.replace(
		/[&<>"']/g,
		(c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
	);
export function trialSvg(saved: SavedTrial) {
	const { positions, angles, houses, aspects, tracks } = trialGeometry(saved);
	const lines: string[] = [],
		legend: string[] = [];
	const text = (x: number, y: number, value: string, size = 15) =>
		`<text x="${x}" y="${y}" font-size="${size}">${xml(value)}</text>`;
	const radial = (a: number, r1: number, r2: number, stroke: string) => {
		const p = longitudePoint(a, r1),
			q = longitudePoint(a, r2);
		return `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="${stroke}"/>`;
	};
	for (let a = 0; a < 360; a += 5) lines.push(radial(a, a % 30 === 0 ? 268 : 283, 290, '#637083'));
	signNames.forEach((s, i) => {
		const p = longitudePoint(i * 30 + 15, 326);
		lines.push(`<text x="${p.x}" y="${p.y}" text-anchor="middle" font-size="16">${xml(s)}</text>`);
	});
	houses.cusps.forEach((a, i) => {
		lines.push(radial(a, 75, 268, '#bbc3cc'));
		const next = houses.cusps[(i + 1) % 12],
			mid = (a + ((next - a + 360) % 360) / 2) % 360,
			p = longitudePoint(mid, 177);
		lines.push(
			`<text x="${p.x}" y="${p.y}" text-anchor="middle" font-size="13" fill="#637083">${i + 1}</text>`
		);
	});
	aspects.forEach((a) => {
		const p = longitudePoint(positions.find((p) => p.body === a.first)!.longitude, 142),
			q = longitudePoint(positions.find((p) => p.body === a.second)!.longitude, 142);
		const color = ['square', 'opposition'].includes(a.kind)
			? '#a55c49'
			: a.kind === 'conjunction'
				? '#967340'
				: '#466d8a';
		lines.push(
			`<line data-aspect="${a.kind}" x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="${color}" stroke-opacity=".6"/>`
		);
	});
	positions.forEach((p, i) => {
		const radius = 248 - (tracks.get(p.body) ?? 0) * 27,
			point = longitudePoint(p.longitude, radius);
		lines.push(radial(p.longitude, radius + 12, 268, '#bbc3cc'));
		lines.push(
			`<g data-body="${p.body}" data-longitude="${p.longitude}" transform="translate(${point.x} ${point.y})"><title>${bodyNames[p.body]}: ${nominalDegree(p.longitude)}</title><circle r="13" fill="#f7f2e7"/><path d="${bodyGlyphs[p.body]}" fill="none" stroke="#102b3a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></g>`
		);
		legend.push(text(65, 815 + i * 25, `${bodyNames[p.body]}: ${nominalDegree(p.longitude)}`));
	});
	Object.entries(angles).forEach(([name, a]) => {
		if (a === null) return;
		lines.push(radial(a, 65, 307, '#967340'));
		const p = longitudePoint(a, 70);
		lines.push(
			`<rect x="${p.x - 17}" y="${p.y - 21}" width="34" height="17" fill="#f7f2e7"/><text x="${p.x}" y="${p.y - 8}" text-anchor="middle" font-size="13">${name === 'ascendant' ? 'ASC' : 'MC'}</text>`
		);
		legend.push(
			text(
				520,
				815 + legend.filter((l) => l.includes('x="520"')).length * 28,
				`${name === 'ascendant' ? 'ASC' : 'MC'}: ${nominalDegree(a)}`
			)
		);
	});
	houses.cusps.forEach((a, i) =>
		legend.push(
			text(
				65 + Math.floor(i / 6) * 470,
				1120 + (i % 6) * 25,
				`Casa ${i + 1}: ${nominalDegree(a)}`,
				14
			)
		)
	);
	return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1410" viewBox="0 0 1000 1410" role="img" aria-labelledby="title desc" lang="pt-BR"><title id="title">${xml(saved.reading.title)} - cartografia</title><desc id="desc">Projeção dos valores salvos; zero de Áries à esquerda, longitudes no sentido anti-horário. Glifos planetários, casas disponíveis e aspectos maiores salvos. Precisão experimental.</desc><rect width="1000" height="1410" fill="#f7f2e7"/><g font-family="Georgia,serif" fill="#102b3a">${text(65, 62, saved.reading.title, 27)}${text(65, 95, 'Geometria salva · zodíaco tropical · precisão experimental', 15)}<circle cx="500" cy="430" r="290" fill="none" stroke="#102b3a"/>${lines.join('')}${legend.join('')}${text(65, 1305, houses.cusps.length ? 'Casas Placidus conforme cálculo salvo.' : 'Casas não disponíveis neste cálculo; nenhuma casa foi inventada.', 14)}${text(65, 1335, 'Linhas azuis: sextil/trígono; terracota: quadratura/oposição; ouro: conjunção.', 14)}${text(65, 1365, `Leitura ${saved.id}`, 12)}</g></svg>`;
}
