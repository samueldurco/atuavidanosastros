/** Finite choices for new requests; historical labels keep an explicit correspondence. */
export const atlasPriorities = [
	{ id: 'work', label: 'Trabalho e contribuição', aliases: ['trabalho'] },
	{ id: 'relationships', label: 'Vínculos e acordos', aliases: ['vínculos'] },
	{ id: 'resources', label: 'Recursos e autonomia', aliases: ['recursos'] },
	{ id: 'home', label: 'Casa e pertencimento', aliases: ['casa'] },
	{ id: 'learning', label: 'Aprendizado e expressão', aliases: ['aprendizado'] },
	{ id: 'care', label: 'Autocuidado e rotina', aliases: ['cuidado', 'bem-estar', 'autocuidado'] },
	{ id: 'identity', label: 'Identidade e escolhas', aliases: ['identidade'] },
	{ id: 'networks', label: 'Redes e projetos', aliases: ['redes'] }
] as const;
export type AtlasPriorityId = (typeof atlasPriorities)[number]['id'];
const normalize = (s: string) => s.normalize('NFKC').trim().toLocaleLowerCase('pt-BR');
export const atlasPriorityFor = (label: string) =>
	atlasPriorities.find((p) =>
		[p.label, ...p.aliases].some((s) => normalize(s) === normalize(label))
	);
export const validAtlasChoices = (choices: readonly string[]) => {
	const ids = choices.map((label) => atlasPriorityFor(label)?.id);
	return ids.length === 4 && ids.every(Boolean) && new Set(ids).size === 4;
};
