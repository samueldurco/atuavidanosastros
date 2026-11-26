// Public display only: these marks never enable a payment method or bypass an offer gate.
// Pending services require provider-issued credentials/seals and evidence before activation.
export const paymentMarks = [
	{ id: 'pix', name: 'Pix' },
	{ id: 'visa', name: 'Visa' },
	{ id: 'master', name: 'Mastercard' },
	{ id: 'american_express', name: 'American Express' },
	{ id: 'diners_club', name: 'Diners Club' },
	{ id: 'elo', name: 'Elo' },
	{ id: 'hipercard', name: 'Hipercard' },
	{ id: 'hiper', name: 'Hiper' },
	{ id: 'boleto', name: 'Boleto' }
] as const;

export const siteSecurityLinks = [
	{
		id: 'https',
		name: 'Conexão HTTPS',
		detail: 'Dados em trânsito',
		href: '/privacidade',
		image: 'https.svg'
	},
	{
		id: 'google',
		name: 'Google',
		detail: 'Consultar segurança',
		href: 'https://transparencyreport.google.com/safe-browsing/search?url=atuavidanosastros.com.br',
		image: 'google.svg'
	},
	{
		id: 'cloudflare',
		name: 'Cloudflare',
		detail: 'Infraestrutura do site',
		href: 'https://www.cloudflare.com/pt-br/',
		image: 'cloudflare.svg'
	}
] as const;

// Replace each pending brand image with the original provider-issued seal and the
// ATVNA verification URL after approval. Never copy another store's rating or audit date.
export const pendingTrustSeals = [
	{
		id: 'reclameaqui',
		name: 'Reclame AQUI',
		image: 'reclameaqui.svg',
		requires: 'Approved company profile and provider-issued verification seal/URL'
	},
	{
		id: 'ebit',
		name: 'Ebit',
		image: 'ebit.png',
		requires: 'Approved store registration, store ID and provider-issued seal/URL'
	},
	{
		id: 'siteblindado',
		name: 'Site Blindado',
		image: 'siteblindado.svg',
		requires: 'Active Site Blindado / Conviso Trust contract and ATVNA public Trust Center URL'
	}
] as const;
