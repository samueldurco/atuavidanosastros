import { describe, expect, it } from 'vitest';
import { productCatalog } from '@atv/domain';
import { editorialPages, signs, SITE, universes } from './site';

describe('contrato público do site', () => {
	it('mantém domínio, seis universos e doze signos canônicos', () => {
		expect(SITE.url).toBe('https://atuavidanosastros.com.br');
		expect(universes).toHaveLength(6);
		expect(signs).toHaveLength(12);
	});

	it('não publica produtos como ativos antes do gate comercial', () => {
		expect(productCatalog.some((product) => product.state === 'ACTIVE')).toBe(false);
	});

	it('inclui toda aquisição do funil de Propósito', () => {
		expect(editorialPages).toHaveProperty('proposito');
		expect(editorialPages).toHaveProperty('vocacao-no-mapa-astral');
		expect(editorialPages).toHaveProperty('carreira-no-mapa-astral');
		expect(editorialPages).toHaveProperty('casa-10');
	});
});
