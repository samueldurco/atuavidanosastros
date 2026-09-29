const birthChartLabels: Record<string, string> = {
	'position-sun': 'Sol',
	'position-moon': 'Lua',
	'position-mercury': 'Mercúrio',
	'position-venus': 'Vênus',
	'position-mars': 'Marte',
	'position-jupiter': 'Júpiter',
	'position-saturn': 'Saturno',
	'position-uranus': 'Urano',
	'position-neptune': 'Netuno',
	'position-pluto': 'Plutão',
	'angle-ascendant': 'Ascendente',
	'angle-midheaven': 'Meio do Céu',
	'personal-context': 'Contexto pessoal relatado'
};

/** Presentation only: retains each persisted identifier and never infers a placement. */
export function productFactLabel(productId: string, id: string): string {
	if (productId === 'date-reading') {
		const part =
			/^(natal|sample)-(sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto)$/.exec(id);
		const label =
			id === 'sample-instant'
				? 'Instante da amostra (12h UTC)'
				: id === 'personal-context'
					? 'Contexto informado'
					: part
						? `${part[1] === 'natal' ? 'Base natal' : 'Amostra da data'} · ${birthChartLabels[`position-${part[2]}`]}`
						: undefined;
		return label ? `${label} (${id})` : id;
	}
	if (productId === 'dream-journal' || productId === 'dream-reading') {
		const labels: Record<string, string> = {
			'dream-date': 'Data registrada',
			'dream-context': 'Contexto informado'
		};
		const part = /^dream-(narrative|emotion|association)-(\d+)$/.exec(id);
		const kinds: Record<string, string> = {
			narrative: 'Relato registrado, trecho',
			emotion: 'Emoção informada',
			association: 'Associação pessoal'
		};
		const label = labels[id] ?? (part ? `${kinds[part[1]]} ${part[2]}` : undefined);
		return label ? `${label} (${id})` : id;
	}
	if (productId !== 'birth-chart') return id;
	const house = /^house-([1-9]|1[0-2])$/.exec(id);
	const label = birthChartLabels[id] ?? (house ? `Cúspide da Casa ${house[1]}` : undefined);
	return label ? `${label} (${id})` : id;
}
