/** Public identities verified in docs/30-execucao/REDES_SOCIAIS_INVENTARIO.json.
 * Threads is additionally backed by the published-permalink verification of 2026-10-09.
 * Do not derive new handles or expose private automation destinations here. */
export const publicContactEmail = 'atuavidanosastros2026@gmail.com';

export const publicChannels = [
	{
		id: 'instagram',
		name: 'Instagram',
		href: 'https://www.instagram.com/atuavidanosastros/',
		handle: '@atuavidanosastros'
	},
	{
		id: 'facebook',
		name: 'Facebook',
		href: 'https://www.facebook.com/profile.php?id=61594840114291',
		handle: 'A Tua Vida nos Astros'
	},
	{
		id: 'youtube',
		name: 'YouTube',
		href: 'https://www.youtube.com/@atuavidanosastros',
		handle: '@atuavidanosastros'
	},
	{
		id: 'threads',
		name: 'Threads',
		href: 'https://www.threads.com/@atuavidanosastros',
		handle: '@atuavidanosastros'
	},
	{ id: 'x', name: 'X', href: 'https://x.com/atvnastros', handle: '@atvnastros' },
	{
		id: 'tiktok',
		name: 'TikTok',
		href: 'https://www.tiktok.com/@atuavidanosastros',
		handle: '@atuavidanosastros'
	},
	{
		id: 'pinterest',
		name: 'Pinterest',
		href: 'https://br.pinterest.com/atuavidanosastros/',
		handle: '@atuavidanosastros'
	},
	{
		id: 'linkedin',
		name: 'LinkedIn',
		href: 'https://www.linkedin.com/in/atuavidanosastros/',
		handle: 'A Tua Vida nos Astros'
	},
	{
		id: 'reddit',
		name: 'Reddit',
		href: 'https://www.reddit.com/user/Logical_Try7048/',
		handle: 'u/Logical_Try7048'
	}
] as const;

export const contactSubjects = [
	{ id: 'acesso', label: 'Conta e acesso', subject: 'Ajuda com minha conta ATVNA' },
	{ id: 'leitura', label: 'Minhas leituras', subject: 'Ajuda com uma leitura ATVNA' },
	{
		id: 'correcao',
		label: 'Correção de conteúdo',
		subject: 'Correção de conteúdo da Revista ATVNA'
	},
	{ id: 'loja', label: 'Loja dos Signos', subject: 'Contato sobre a Loja dos Signos' },
	{ id: 'parceria', label: 'Parcerias e imprensa', subject: 'Parcerias e imprensa — ATVNA' },
	{ id: 'outro', label: 'Outro assunto', subject: 'Contato com a ATVNA' }
] as const;

export function contactHref(subject: string): string {
	return `mailto:${publicContactEmail}?subject=${encodeURIComponent(subject)}`;
}
