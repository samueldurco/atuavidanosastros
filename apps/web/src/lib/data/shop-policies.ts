export const shopPolicyUpdatedAt = '27 de outubro de 2026';
export const shopPolicyDocuments = {
	devolucoes: {
		type: 'REFUND_POLICY',
		href: '/loja/devolucoes',
		label: 'Trocas e devoluções',
		description:
			'Arrependimento, devoluções, garantia e reembolsos dos produtos físicos da Loja dos Signos.'
	},
	frete: {
		type: 'SHIPPING_POLICY',
		href: '/loja/frete',
		label: 'Frete e entrega',
		description:
			'Condições de frete, produção sob demanda, acompanhamento e atendimento para as entregas da Loja dos Signos.'
	},
	termos: {
		type: 'TERMS_OF_SERVICE',
		href: '/loja/termos',
		label: 'Termos de compra',
		description: 'Condições de compra e atendimento dos produtos físicos da Loja dos Signos.'
	}
} as const;

export type ShopPolicyKind = keyof typeof shopPolicyDocuments;
export const shopPolicyLinks = Object.values(shopPolicyDocuments);
