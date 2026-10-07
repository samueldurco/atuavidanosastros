import type { CalculationSnapshot } from '@atv/domain';
import type { TrialReading } from './reading';
import { bodyEditorial, signEditorial } from './content';

// Editorial hypotheses, never additional calculation facts. Each personal function
// has its own expression of the sign; sharing a sign does not merge the functions.
const personal = ['Sol', 'Lua', 'Mercúrio', 'Vênus', 'Marte'];
const expressions: Record<string, readonly string[]> = {
	Áries: [
		'Sua autoria pode aparecer ao escolher um começo que tenha importância própria, sem precisar ser o primeiro em tudo. Investigue quando a pressa de se afirmar impede terminar o que escolheu.',
		'O acolhimento pode começar pela liberdade de reconhecer uma reação e pedir espaço antes de responder. Diferencie uma emoção urgente de uma decisão que precisa ser tomada agora.',
		'Uma explicação direta pode abrir a conversa e tornar sua pergunta compreensível. Antes de concluir, deixe a outra pessoa completar a resposta; rapidez de raciocínio não substitui escuta.',
		'Expressar interesse com clareza pode facilitar um encontro e tornar visível sua preferência. Confira se existe reciprocidade e espaço para a outra pessoa escolher o próprio ritmo.',
		'O impulso de agir pode ajudar a enfrentar uma resistência concreta. Defina onde quer chegar e uma regra de pausa: defender uma posição não exige vencer cada troca.'
	],
	Touro: [
		'A autoria pode ganhar forma em algo que você constrói e acompanha com continuidade. Observe quando preservar uma conquista começa a impedir uma escolha que já perdeu sentido.',
		'Ritmos previsíveis e cuidados concretos podem oferecer uma base para recuperar segurança. Experimente distinguir o descanso que nutre do hábito que apenas evita uma mudança necessária.',
		'Explicar por etapas e conferir um exemplo concreto pode favorecer o aprendizado. Reserve espaço para revisar a conclusão quando uma informação nova não cabe no que já conhecia.',
		'Afeição pode ser investigada por presença, gestos constantes e atenção ao que é agradável para ambos. Cuidado não dá posse: conversem sobre preferências que mudaram.',
		'A energia pode ser organizada em passos sustentáveis, em vez de depender apenas de entusiasmo inicial. Ao encontrar resistência, confira se persistir ainda serve ao objetivo ou só ao esforço já investido.'
	],
	Gêmeos: [
		'A expressão pessoal pode se desenvolver ao experimentar linguagens e comparar perspectivas. Escolha também algo que deseja aprofundar, para que a curiosidade não deixe sua autoria sempre provisória.',
		'Conversar ou nomear diferentes sentimentos pode ajudar a elaborar uma experiência. Observe se explicar a emoção está oferecendo acolhimento ou afastando você do que sente.',
		'Perguntas, comparações e reformulações podem tornar uma ideia mais clara. Feche uma conversa com uma conclusão provisória e a informação que ainda falta, evitando abrir novos assuntos sem concluir o necessário.',
		'A troca de ideias pode participar do interesse e do prazer de conhecer alguém. Confira se a conversa também permite nomear compromissos e ouvir uma necessidade que não é nova nem divertida.',
		'A ação pode avançar por testes curtos e alternativas rápidas. Defina qual tentativa terminar primeiro e como reconhecer o resultado, para não confundir movimento com avanço.'
	],
	Câncer: [
		'Autoria pode envolver dar forma a algo que preserva uma história ou constrói pertencimento. Compare o que deseja expressar com o papel que aprendeu a cumprir para manter todos próximos.',
		'A segurança pode ser investigada por vínculos, memória e cuidados que permitem baixar a vigilância. Nomeie o apoio de que precisa; cuidar de todos não garante que sua necessidade seja percebida.',
		'O contexto emocional de uma conversa pode ajudar a compreender o que foi dito. Confira as palavras da outra pessoa antes de completar seu sentido com uma lembrança ou receio seu.',
		'Afeição pode aparecer em atenção e disponibilidade para acolher. Conversem sobre o cuidado que cada pessoa deseja receber, sem transformar proximidade em obrigação de estar sempre disponível.',
		'A energia pode se mobilizar para proteger algo importante. Diga qual limite foi atingido e peça uma mudança concreta, em vez de esperar que o incômodo se torne evidente por afastamento.'
	],
	Leão: [
		'A autoria pode ganhar força quando você encontra uma forma visível de expressar o que importa. Separe o prazer de criar da necessidade de receber aprovação a cada etapa.',
		'Ser reconhecido com atenção pode participar da sensação de acolhimento. Peça presença de maneira específica e observe se consegue receber cuidado mesmo quando ele não vem como elogio.',
		'Uma explicação com imagem, exemplo ou voz própria pode envolver quem escuta. Abra espaço para correção e perguntas, para que a apresentação não ocupe o lugar da troca.',
		'Afeição pode incluir celebração, generosidade e vontade de demonstrar interesse. Verifique se o gesto corresponde ao gosto de quem recebe e se também há espaço para um pedido simples.',
		'A ação pode se sustentar quando o objetivo permite participação e iniciativa próprias. Em um conflito, proteja o assunto em discussão de uma disputa sobre quem merece reconhecimento.'
	],
	Virgem: [
		'Autoria pode aparecer na capacidade de melhorar algo que precisa funcionar. Defina o suficiente para esta etapa, evitando condicionar sua participação a uma preparação perfeita.',
		'Uma rotina de cuidado e a organização do que está confuso podem ajudar a recuperar estabilidade. Observe se corrigir detalhes está acolhendo sua necessidade ou adiando o descanso.',
		'Distinguir informações e verificar detalhes pode favorecer uma explicação precisa. Comece pelo ponto principal e ajuste a quantidade de informação ao que a outra pessoa precisa entender.',
		'Afeição pode se tornar concreta em ajuda e atenção aos detalhes do cotidiano. Pergunte se a ajuda é desejada e se há espaço para apreciar sem corrigir.',
		'A energia pode se concentrar em uma tarefa delimitada e aperfeiçoável. Combine um prazo de encerramento, para que a busca de execução correta não impeça começar ou entregar.'
	],
	Libra: [
		'A expressão pessoal pode se desenvolver no encontro entre uma preferência própria e outras perspectivas. Investigue qual escolha continuaria sendo sua mesmo sem concordância imediata.',
		'Uma troca respeitosa pode ajudar a recuperar equilíbrio emocional. Nomeie o desconforto antes de buscar conciliação; a ausência de discussão não confirma que a necessidade foi atendida.',
		'Comparar argumentos pode tornar uma decisão mais compreensível para todos. Explicite também seu critério e uma conclusão possível, em vez de manter todas as posições em aberto.',
		'Afeição pode ser investigada por reciprocidade e disposição para construir acordos. Diferencie uma concessão escolhida de silenciar uma preferência para preservar a harmonia.',
		'A ação pode ganhar direção quando existe um acordo claro sobre objetivos e limites. Ao discordar, formule um pedido próprio e negociável, sem esperar consenso para reconhecer o problema.'
	],
	Escorpião: [
		'Autoria pode envolver investigar um assunto até encontrar o que merece transformação. Preserve a liberdade de mudar sua leitura quando a experiência contraria a hipótese inicial.',
		'Confiança pode exigir tempo e espaço para reconhecer vulnerabilidade. Diga o que ajuda a se sentir seguro, sem usar silêncio ou testes como prova da lealdade de alguém.',
		'Perguntas aprofundadas podem revelar uma contradição que merece exame. Separe o que foi observado do que está supondo; perceber uma lacuna não demonstra uma intenção oculta.',
		'Afeição pode envolver intimidade, compromisso e desejo de conhecer com profundidade. Negociem privacidade e autonomia, para que confiança não dependa de acesso irrestrito à vida do outro.',
		'A energia pode se concentrar em enfrentar um obstáculo persistente. Defina um limite para essa insistência e uma saída negociável, evitando que o conflito vire uma disputa de controle.'
	],
	Sagitário: [
		'A expressão pessoal pode encontrar direção ao relacionar experiências a uma busca de sentido. Confira quais valores são seus e quais apenas repetem uma convicção recebida.',
		'Espaço para respirar, aprender ou mudar de perspectiva pode favorecer recuperação emocional. Permita também reconhecer uma tristeza que não precisa ser resolvida por otimismo.',
		'Conectar exemplos a uma ideia ampla pode facilitar a compreensão. Verifique os detalhes que sustentam a conclusão e convide perguntas antes de tratar a visão geral como resposta suficiente.',
		'Afeição pode incluir descoberta e liberdade para compartilhar experiências novas. Conversem sobre o compromisso possível, para que entusiasmo não seja recebido como uma promessa maior.',
		'A energia pode se mobilizar por um objetivo que amplia horizontes. Transforme a intenção em um passo com prazo e recursos definidos, verificando o que é viável antes de prometer.'
	],
	Capricórnio: [
		'A autoria pode se consolidar ao assumir uma construção que você considera valiosa no longo prazo. Investigue se o objetivo expressa uma escolha própria ou apenas a necessidade de provar competência.',
		'Previsibilidade e apoio confiável podem participar da segurança emocional. Reconheça uma necessidade mesmo quando ela não melhora seu desempenho; receber cuidado não precisa ser conquistado por produtividade.',
		'Organizar uma explicação por etapas e responsabilidades pode tornar um acordo praticável. Inclua dúvidas e condições de revisão, evitando apresentar um plano bem estruturado como se já fosse certeza.',
		'Afeição pode se expressar por constância e compromissos que se sustentam em atitudes. Verifique se o vínculo também permite prazer e vulnerabilidade, sem transformar reciprocidade em uma avaliação de desempenho.',
		'A energia pode ser dirigida a um objetivo com etapas e limites concretos. Inclua descanso e uma regra de interrupção no plano, para que persistir não signifique ultrapassar o próprio limite ou o de alguém.'
	],
	Aquário: [
		'A autoria pode aparecer ao propor uma alternativa ou contribuir para uma rede. Confira se a ideia ainda representa você quando precisa encontrar uma necessidade individual concreta.',
		'Autonomia e espaço para observar podem ajudar a elaborar uma emoção. Investigue se tomar distância está permitindo compreender o que sente ou apenas evitando pedir apoio.',
		'Questionar uma regra e conectar perspectivas diferentes pode abrir possibilidades de compreensão. Mostre um exemplo concreto e escute quem será afetado pela ideia.',
		'Afeição pode incluir amizade e liberdade para preservar diferenças. Tornem explícito o cuidado que cada um espera, porque respeitar autonomia não substitui presença combinada.',
		'A ação pode avançar por uma solução alternativa ou um experimento coletivo. Combine responsabilidades e critérios de revisão, para que inovar não deixe o custo da mudança com outras pessoas.'
	],
	Peixes: [
		'A expressão pessoal pode ganhar forma por imagens, sensibilidade e criação. Escolha uma realização concreta para essa inspiração e preserve uma distinção entre sua escolha e a expectativa do ambiente.',
		'Uma pausa com espaço para sentir pode ajudar a perceber uma necessidade pouco nomeada. Diferencie acolher o sentimento de alguém de assumir a responsabilidade por resolvê-lo.',
		'Imagens e associações podem ajudar a explicar uma impressão difícil de traduzir. Confira o entendimento com palavras concretas e verifique informações antes de tomá-las como evidência.',
		'Afeição pode envolver empatia, delicadeza e atenção ao que é difícil de dizer. Nomeiem limites e pedidos, para que compreender o outro não exija aceitar algo que faz mal.',
		'A energia pode se mobilizar por uma imagem ou causa que toca você. Defina o primeiro gesto e um limite de disponibilidade, evitando depender apenas do clima emocional para agir.'
	]
};

export function positionInterpretation(body: string, sign: string): string | undefined {
	const index = personal.indexOf(body);
	if (index >= 0) return expressions[sign]?.[index];
	const lens = signEditorial[sign];
	if (!lens) return;
	const [strength, mode, excess] = lens;
	const other: Record<string, string> = {
		Júpiter: `Ao explorar uma oportunidade, ${strength} pode orientar o que vale aprender. Verifique se ${mode} amplia uma possibilidade real; confronte o entusiasmo com tempo, recursos e a tendência a ${excess}.`,
		Saturno: `Uma responsabilidade pode ser sustentada por ${strength}. Diferencie um limite útil da cobrança de ${excess}: escolha o compromisso possível e as condições em que ele deve ser renegociado.`,
		Urano: `Para testar uma mudança, experimente ${mode} em apenas um hábito. Pergunte quem será afetado e como rever o teste; a alternativa perde utilidade quando exige ${excess}.`,
		Netuno: `Na imaginação, ${strength} pode oferecer uma imagem para elaborar uma experiência. Anote o que foi percebido e o que foi desejado, investigando se ${excess} torna difícil distinguir os dois.`,
		Plutão: `Ao examinar um padrão de influência, use ${strength} para reconhecer o que pode ser transformado por você. Observe se ${excess} reduz sua liberdade ou a de alguém; negocie um limite verificável.`,
		Ascendente: `Em um primeiro contato, ${mode} pode ser uma resposta que vale observar. Antes de tomá-la como regra, confira o que o ambiente pede; ${excess} pode limitar a possibilidade de conhecer a situação antes de reagir.`,
		'Meio do Céu': `Na contribuição pública, ${strength} é uma hipótese para confrontar com uma entrega real. Pergunte quem se beneficia do seu trabalho e se ${excess} está cobrando um custo maior do que o reconhecimento obtido.`
	};
	return other[body];
}

export function personalizePositions(base: TrialReading, calc: CalculationSnapshot): TrialReading {
	return {
		...base,
		sections: base.sections.map((section) => {
			if (section.factIds.length !== 1) return section;
			const fact = calc.facts.find((f) => f.id === section.factIds[0]);
			if (!fact) return section;
			const body = Object.keys(bodyEditorial).find((b) =>
				new RegExp(`${b}(?: natal| no retorno| do retorno)?:`).test(fact.display)
			);
			const sign = Object.keys(signEditorial).find((s) => fact.display.includes(s));
			if (!body || !sign) return section;
			const [strength, mode, excess] = signEditorial[sign];
			const previous = `Em ${sign}, a leitura propõe ${strength} como uma maneira de lidar com esse tema. Você pode reconhecer essa combinação ao ${mode}; observe também a possibilidade de ${excess}.`;
			const text = positionInterpretation(body, sign);
			return text ? { ...section, text: section.text.replace(previous, text) } : section;
		})
	};
}
