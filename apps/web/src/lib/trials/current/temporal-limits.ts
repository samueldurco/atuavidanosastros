/** Reader-facing wording only. CalculationSnapshot.limits remains the original audit record. */
export function temporalReadableLimits(limits: readonly string[]): string[] {
	const wording: Array<[RegExp, string]> = [
		[
			/^Gauntlet integral pendente;/,
			'O cálculo é experimental. As verificações realizadas ainda não certificam sua precisão em todo o intervalo de 1900 a 2099.'
		],
		[
			/^UTC aproxima UT1;/,
			'Os horários de cálculo usam aproximações da rotação da Terra e não incluem todas as correções de tempo de alta precisão. Por isso, um horário registrado não deve ser tratado como um instante astronômico certificado.'
		],
		[
			/^Retrogradação é um sinal da candidata;/,
			'A indicação de movimento retrógrado é aproximada. Não estão certificados os instantes em que esse movimento muda de direção nem se um aspecto está se aproximando ou se afastando da exatidão.'
		],
		[
			/^Offset histórico fornecido pelo usuário;/,
			'A diferença histórica entre o horário local e UTC foi informada por você. O cálculo não deduz automaticamente o horário de verão dessa data.'
		],
		[
			/^Regras IANA do runtime não estão fixadas;/,
			'A conversão de fuso usa as regras disponíveis no momento do cálculo, e a diferença aplicada fica registrada nesta edição. Mudanças posteriores nessas regras podem exigir uma nova conferência.'
		],
		[
			/^Semana: busca nominal experimental/,
			'A semana usa observações a cada hora em sete dias UTC e um refinamento dos limites encontrados. Isso não garante que todos os contatos entre as observações tenham sido detectados nem certifica sua duração contínua.'
		],
		[
			/^Reversões, tangências, múltiplas voltas/,
			'Contatos breves, mudanças de direção ou passagens repetidas podem ocorrer entre as observações e não ser detectados. Os intervalos apresentados não indicam períodos favoráveis.'
		],
		[
			/^A trilha completa de bisseção/,
			'A edição preserva as observações e os limites finais encontrados. O registro detalhado do refinamento permanece na documentação técnica do cálculo.'
		],
		[
			/^Sete dias UTC com grade de 169/,
			'São 169 observações horárias ao longo de sete dias UTC. As amostras das 12h UTC não representam dias locais completos; a data e a hora locais podem ser diferentes.'
		],
		[
			/^Orbe editorial de até 2°/,
			'A seleção considera os cinco aspectos maiores com distância de até 2° da relação angular exata. Esse critério de seleção não mede a precisão do cálculo. A menor distância observada também não certifica o instante exato ou a velocidade entre as observações.'
		],
		[
			/^Trânsito e natal usam épocas tropicais próprias;/,
			'As posições do nascimento e do período são calculadas separadamente no zodíaco tropical. Casas e ângulos pertencem ao nascimento; o fuso atual informado não altera as datas UTC usadas nesta leitura.'
		],
		[
			/^Geometria experimental: dez corpos/,
			'O cálculo experimental compara dez corpos na data com dez posições do nascimento e seleciona os cinco aspectos maiores até 2° da relação angular exata. Esse limite organiza a leitura e não certifica a precisão das posições calculadas.'
		],
		[
			/^Aspectos anuais maiores até 4°;/,
			'Na carta anual, a seleção considera os aspectos maiores até 4° da relação angular exata. No acompanhamento mensal, usa até 2° e uma observação diária às 12h UTC. Esses limites organizam a interpretação e não medem a precisão do cálculo.'
		]
	];
	return [
		...new Set(
			limits.map((limit) => wording.find(([pattern]) => pattern.test(limit))?.[1] ?? limit)
		)
	];
}
