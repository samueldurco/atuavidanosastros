/** Formats a persisted Career Compass fact for readers without changing the calculation. */
export function formatCareerCompassFactDisplay(display: string): string {
	return display
		.replace(
			/(-?\d+(?:\.\d+)?)°/g,
			(_, value: string) => `${Number(value).toFixed(1).replace('.', ',')}°`
		)
		.replace(/(movimento (?:direto|retrógrado)) (?:da candidata|do candidato)\b/gi, '$1');
}

/** Reader-facing labels for every fact family projected by the Career Compass. */
export function careerCompassFactLabel(id: string): string {
	const bodies: Record<string, string> = {
		sun: 'Sol',
		moon: 'Lua',
		mercury: 'Mercúrio',
		venus: 'Vênus',
		mars: 'Marte',
		jupiter: 'Júpiter',
		saturn: 'Saturno',
		uranus: 'Urano',
		neptune: 'Netuno',
		pluto: 'Plutão'
	};
	const position =
		/^position-(sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto)$/.exec(id);
	if (position) return bodies[position[1]];
	const house = /^house-([1-9]|1[0-2])$/.exec(id);
	if (house) return `Cúspide da casa ${house[1]}`;
	const aspect = /^(?:private-natal-aspect|career-aspect)-(\d+)$/.exec(id);
	if (aspect) return `Aspecto natal ${Number(aspect[1]) + 1}`;
	if (id === 'angle-ascendant') return 'Ascendente';
	if (id === 'ascendant-unavailable') return 'Ascendente indisponível';
	if (id === 'angle-midheaven') return 'Meio do Céu';
	if (id === 'personal-context') return 'Contexto profissional informado';
	if (id === 'career-mc-ruler') return 'Regente do Meio do Céu';
	if (id === 'compass-ruler-house') return 'Casa do regente do Meio do Céu';
	if (id.startsWith('compass-mc-')) return 'Contato com o Meio do Céu';
	return id;
}

/** The value for a labelled fact list; avoids repeating labels already shown beside it. */
export function careerCompassFactValue(id: string, display: string): string {
	const formatted = formatCareerCompassFactDisplay(display);
	if (/^(position-|angle-)/.test(id)) {
		const prefix = `${careerCompassFactLabel(id)}: `;
		return formatted.startsWith(prefix) ? formatted.slice(prefix.length) : formatted;
	}
	if (/^house-([1-9]|1[0-2])$/.test(id)) {
		return formatted.replace(/^Cúspide \d+ \([^)]+\):\s*/, '');
	}
	if (id === 'career-mc-ruler') {
		return formatted.replace(/^Regente (?:moderno|tradicional) do Meio do Céu:\s*/, '');
	}
	return formatted;
}

/** Translate known calculator notices while retaining the original audit snapshot. */
const careerCalculationNotices: Readonly<Record<string, string | null>> = {
	'Gauntlet integral pendente; amostras independentes não homologam todo o intervalo 1900–2099.':
		'A precisão da base astronômica ainda está em validação independente.',
	'UTC aproxima UT1; ΔT usa o modelo da candidata, sem correção IERS de DUT1.':
		'Pequenas diferenças na referência de tempo podem alterar os graus exatos.',
	'Retrogradação é um sinal da candidata; instante de estação e aplicação/separação de aspectos não são certificados.':
		'O movimento retrógrado e as relações entre posições são aproximados nesta versão.',
	'Regras IANA do runtime não estão fixadas; o offset resolvido é registrado.':
		'Confira a hora e o fuso de nascimento informados antes de usar a leitura.',
	'Offset histórico fornecido pelo usuário; DST não é inferido.':
		'Confira a hora e o fuso de nascimento informados antes de usar a leitura.',
	'Somente signo e grau experimentais do Meio do Céu; casas decimais de exibição não garantem precisão nem homologação.':
		'O cálculo desta versão usa apenas o signo e o grau aproximados do Meio do Céu.',
	'Ascendente, casas, regências e aspectos não foram projetados; nenhum sistema substituto foi usado.':
		'Ascendente, casas, regentes e aspectos não entram nesta versão.',
	'Direção pública, ambientes, tensões e perguntas práticas dependem de interpretação editorial aprovada; não foram produzidos.':
		'Os dados calculados, sozinhos, não descrevem sua carreira ou suas escolhas.',
	'Carreira não se reduz a um signo: formação, território, classe, saúde, oportunidade e escolha precisam ser considerados.':
		'Sua trajetória também depende de formação, contexto, saúde, oportunidades e escolhas.',
	'Sem prescrição de profissão ou promessa de emprego, renda, prosperidade financeira ou destino.':
		'A leitura não determina profissão, emprego, renda ou destino.'
};

const unreviewedCalculationNotice =
	'Esta leitura contém uma limitação de cálculo ainda sem explicação revisada para o leitor. Consulte o suporte antes de usar suas conclusões.';

export function careerCompassReaderLimits(
	calculationLimits: readonly string[],
	editorialLimits: readonly string[]
): string[] {
	const translated = calculationLimits.map((limit) =>
		Object.prototype.hasOwnProperty.call(careerCalculationNotices, limit)
			? careerCalculationNotices[limit]
			: unreviewedCalculationNotice
	);
	return [
		...new Set([...translated, ...editorialLimits].filter((limit): limit is string => !!limit))
	];
}
