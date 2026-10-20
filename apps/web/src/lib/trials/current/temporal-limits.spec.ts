import { describe, expect, it } from 'vitest';
import { temporalReadableLimits } from './temporal-limits';

describe('temporal limitations in reader language', () => {
	it('retains precision and sampling caveats while the immutable calculation keeps audit wording', () => {
		const raw = Object.freeze([
			'Gauntlet integral pendente; amostras independentes não homologam todo o intervalo 1900–2099.',
			'UTC aproxima UT1; ΔT usa o modelo da candidata, sem correção IERS de DUT1.',
			'Semana: busca nominal experimental de sete dias UTC; grade horária e brackets de até 60 s não certificam cobertura contínua.',
			'Reversões, tangências, múltiplas voltas e excursões entre amostras podem ser perdidas.',
			'A trilha completa de bisseção fica na evidência local.'
		]);
		const readable = temporalReadableLimits(raw).join(' ');
		expect(readable).toContain('O cálculo é experimental');
		expect(readable).toContain('não certificam sua precisão em todo o intervalo de 1900 a 2099');
		expect(readable).toContain('não incluem todas as correções de tempo');
		expect(readable).toContain('não garante que todos os contatos');
		expect(readable).toContain('não indicam períodos favoráveis');
		expect(readable).toContain('registro detalhado do refinamento');
		expect(readable).not.toMatch(/Gauntlet|candidata|brackets|bisseção|IERS/);
		expect(raw[0]).toContain('Gauntlet');
	});
	it('preserves unknown or product-specific constraints instead of silently filtering them', () => {
		const raw = [
			'A data foi amostrada somente às 12:00 UTC.',
			'Casa indisponível por restrição de latitude.',
			'Consentimento não permite usar outro relato.'
		];
		expect(temporalReadableLimits(raw)).toEqual(raw);
	});
});
