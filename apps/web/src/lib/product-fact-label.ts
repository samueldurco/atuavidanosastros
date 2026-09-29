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
	if (['synastry', 'couple-dossier'].includes(productId)) {
		const body = '(sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto)';
		const position = new RegExp(`^person-([ab])-${body}$`).exec(id);
		const pair = new RegExp(`^cross-${body}-${body}$`).exec(id);
		const label =
			id === 'personal-context'
				? 'Contexto informado'
				: position
					? `Pessoa ${position[1].toUpperCase()} · ${birthChartLabels[`position-${position[2]}`]}`
					: pair
						? `${birthChartLabels[`position-${pair[1]}`]} de A × ${birthChartLabels[`position-${pair[2]}`]} de B`
						: undefined;
		return label ? `${label} (${id})` : id;
	}
	if (productId === 'pair-preview') {
		const part = /^person-([ab])-(moon|venus|mars)$/.exec(id);
		const label =
			id === 'personal-context'
				? 'Contexto informado'
				: part
					? `Pessoa ${part[1].toUpperCase()} · ${birthChartLabels[`position-${part[2]}`]}`
					: undefined;
		return label ? `${label} (${id})` : id;
	}
	if (['date-reading', 'horoscope'].includes(productId)) {
		const part =
			/^(natal|sample)-(sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto)$/.exec(id);
		const pair =
			productId === 'horoscope'
				? /^transit-(sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto)-natal-(sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto)$/.exec(
						id
					)
				: null;
		const label =
			id === 'sample-instant'
				? 'Instante da amostra (12h UTC)'
				: id === 'personal-context'
					? 'Contexto informado'
					: pair
						? `${birthChartLabels[`position-${pair[1]}`]} da amostra × ${birthChartLabels[`position-${pair[2]}`]} natal`
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
