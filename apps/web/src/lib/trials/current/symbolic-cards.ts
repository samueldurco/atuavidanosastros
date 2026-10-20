import { tarotCanon, type TarotMeaning } from '../reconstruction/tarot-canon';

// Editorial reductions of the owner's canon. Keep one connected possibility
// and its specific cost instead of exposing the source's indexing vocabulary.
// Source, core, applications and action remain those of the individual card.
const nuances: Record<string, [resource: string, excess: string]> = {
	'major-0': [
		'curiosidade para começar antes de conhecer toda a rota',
		'improviso que evita assumir as consequências do começo'
	],
	'major-1': [
		'habilidade para transformar os recursos disponíveis em uma ação que produz efeito',
		'promessa de capacidade que cresce mais depressa do que a entrega'
	],
	'major-2': [
		'escuta que percebe nuances antes de exigir uma conclusão',
		'silêncio que se prolonga quando uma pergunta direta já seria possível'
	],
	'major-3': [
		'cuidado que oferece tempo e condições materiais para algo crescer',
		'cuidado que torna quem cuida indispensável e limita o crescimento do outro'
	],
	'major-4': [
		'clareza sobre quem decide e assume as consequências de uma escolha',
		'controle que mantém uma regra mesmo depois de ela deixar de ajudar'
	],
	'major-5': [
		'acesso a um conhecimento compartilhado que permite aprender com quem veio antes',
		'obediência a uma forma de agir cujo sentido deixou de ser examinado'
	],
	'major-6': [
		'escolha que assume um desejo e aceita negociar as diferenças',
		'indecisão que preserva todas as opções e impede um compromisso real'
	],
	'major-7': [
		'direção capaz de coordenar vontades diferentes durante o movimento',
		'pressa que transforma uma mudança de rota em sinal de fracasso'
	],
	'major-8': [
		'firmeza para permanecer em contato com uma intensidade sem ser governado por ela',
		'contenção que acumula o que deveria encontrar uma forma de expressão'
	],
	'major-9': [
		'tempo de recolhimento para distinguir uma referência própria do excesso de opiniões',
		'isolamento que adia o encontro porque nunca parece haver compreensão suficiente'
	],
	'major-10': [
		'flexibilidade para reconhecer uma mudança de condições e rever a participação',
		'dependência da próxima mudança para assumir uma escolha no presente'
	],
	'major-11': [
		'clareza para relacionar uma decisão às consequências que ela distribui',
		'rigidez de um julgamento que perde de vista as diferenças da situação'
	],
	'major-12': [
		'mudança de perspectiva que permite compreender o que a insistência encobria',
		'espera que conserva uma situação sem admitir o custo de permanecer nela'
	],
	'major-13': [
		'disposição para encerrar uma forma que já não comporta o que precisa continuar',
		'apego a uma forma esgotada ou ruptura que tenta apagar tudo o que veio antes'
	],
	'major-14': [
		'paciência para ajustar diferenças sem exigir que elas desapareçam',
		'conciliação que adia uma diferença importante para manter uma aparência de equilíbrio'
	],
	'major-15': [
		'honestidade para reconhecer o desejo e o preço de um vínculo com ele',
		'dependência de uma gratificação que reduz a liberdade de escolha'
	],
	'major-16': [
		'lucidez para reconhecer uma fragilidade que a estrutura anterior ocultava',
		'reação que amplia o estrago para provar que a antiga estrutura precisava cair'
	],
	'major-17': [
		'confiança que permite retomar o cuidado depois de uma perda de referência',
		'esperança que espera reparação sem participar das condições para ela acontecer'
	],
	'major-18': [
		'sensibilidade para perceber o peso de uma imagem ainda pouco compreendida',
		'certeza produzida por medo ou expectativa antes de haver uma referência suficiente'
	],
	'major-19': [
		'clareza para compartilhar uma experiência e reconhecer o que nela tem vida',
		'exposição que exige entusiasmo e deixa pouco espaço para o que ainda é difícil'
	],
	'major-20': [
		'capacidade de rever uma história e responder de outro modo ao que ela pede agora',
		'necessidade de se condenar ou se justificar antes de poder mudar'
	],
	'major-21': [
		'reconhecimento de uma etapa concluída e das partes que permitiram completá-la',
		'dificuldade de sair de uma forma já completa para admitir um começo menos seguro'
	],
	'wands-1': [
		'entusiasmo que dá energia a uma possibilidade ainda sem forma',
		'multiplicação de começos que consome a energia necessária para desenvolver um deles'
	],
	'wands-2': [
		'distância para escolher uma direção antes de comprometer os próximos passos',
		'planejamento que preserva a sensação de possibilidade ao adiar o contato com o mundo'
	],
	'wands-3': [
		'capacidade de acompanhar a expansão de algo que já foi colocado em movimento',
		'expectativa de crescimento que ultrapassa a capacidade de acompanhar suas consequências'
	],
	'wands-4': [
		'reconhecimento compartilhado de uma etapa que merece ser celebrada',
		'aparência de estabilidade que substitui o cuidado com a base real do encontro'
	],
	'wands-5': [
		'atrito que torna visíveis diferenças antes encobertas',
		'disputa em que vencer a discussão passa a importar mais do que o que está em jogo'
	],
	'wands-6': [
		'confiança alimentada pelo reconhecimento de uma realização',
		'dependência de reconhecimento que obriga a sustentar uma imagem de vitória'
	],
	'wands-7': [
		'firmeza para proteger uma posição que continua fazendo sentido',
		'defesa permanente que trata qualquer diferença como uma ameaça'
	],
	'wands-8': [
		'agilidade para aproveitar um movimento que já ganhou direção',
		'pressa que encadeia respostas antes de dar tempo de compreendê-las'
	],
	'wands-9': [
		'experiência para reconhecer um limite e preservar o que ainda pode ser sustentado',
		'vigilância que mantém a defesa mesmo quando a situação já permite descanso'
	],
	'wands-10': [
		'responsabilidade para levar um compromisso adiante e reconhecer sua carga',
		'acúmulo de responsabilidades que transforma dedicação em sobrecarga'
	],
	'wands-11': [
		'vontade de experimentar uma linguagem própria sem precisar dominá-la de início',
		'entusiasmo que troca de direção antes de aprender com a primeira tentativa'
	],
	'wands-12': [
		'coragem para atravessar a hesitação e colocar uma vontade em movimento',
		'impulso que muda o ritmo sem considerar quem terá de sustentá-lo depois'
	],
	'wands-13': [
		'presença que encoraja a própria expressão e a de quem está por perto',
		'necessidade de ocupar o centro que reduz o espaço para outras formas de presença'
	],
	'wands-14': [
		'visão capaz de reunir pessoas e recursos em torno de uma direção',
		'certeza de liderança que deixa de escutar quem participa da realização'
	],
	'cups-1': [
		'abertura para reconhecer um sentimento antes de definir o que ele precisa se tornar',
		'expectativa de que uma experiência inicial satisfaça toda a necessidade de afeto'
	],
	'cups-2': [
		'disponibilidade para um encontro em que ambos podem responder',
		'ideal de sintonia que torna difícil admitir uma diferença entre as pessoas'
	],
	'cups-3': [
		'apoio de um convívio em que a experiência pode ser compartilhada',
		'necessidade de pertencimento que depende de acompanhar sempre o tom do grupo'
	],
	'cups-4': [
		'pausa para reconhecer o que já não encontra resposta emocional',
		'fechamento que recusa qualquer possibilidade porque ela não coincide com a desejada'
	],
	'cups-5': [
		'espaço para reconhecer uma perda sem diminuir sua importância',
		'atenção presa ao que faltou que deixa de alcançar o que ainda pode receber cuidado'
	],
	'cups-6': [
		'contato com uma memória afetiva que ajuda a reconhecer o que tem valor',
		'idealização do passado que torna toda experiência presente insuficiente'
	],
	'cups-7': [
		'imaginação para reconhecer desejos que ainda não receberam uma escolha',
		'multiplicação de possibilidades que evita o custo de escolher uma delas'
	],
	'cups-8': [
		'coragem para se afastar de uma forma de satisfação que já não basta',
		'partida que espera encontrar fora uma resposta para toda insatisfação'
	],
	'cups-9': [
		'capacidade de reconhecer um prazer e usufruir o que foi alcançado',
		'satisfação fechada sobre si que deixa pouco espaço para a necessidade do outro'
	],
	'cups-10': [
		'visão de convivência em que a alegria pode ser compartilhada',
		'ideal de harmonia que torna uma dificuldade real impossível de dizer'
	],
	'cups-11': [
		'curiosidade para dar linguagem a um sentimento que está começando',
		'sensibilidade que toma qualquer resposta como definição do próprio valor'
	],
	'cups-12': [
		'disposição para expressar um desejo e dar forma a um convite',
		'encantamento com uma imagem de encontro maior do que a disponibilidade concreta'
	],
	'cups-13': [
		'escuta capaz de acolher uma experiência sem apressar sua definição',
		'absorção do sentimento alheio que dificulta reconhecer o próprio limite'
	],
	'cups-14': [
		'capacidade de sustentar uma conversa mesmo quando há intensidade emocional',
		'controle da expressão que parece serenidade mas impede uma troca mais franca'
	],
	'swords-1': [
		'clareza para nomear uma diferença que muda a compreensão da situação',
		'certeza que usa a precisão de uma ideia para desconsiderar sua consequência humana'
	],
	'swords-2': [
		'suspensão de uma resposta para reconhecer o conflito entre alternativas',
		'adiamento que tenta manter o equilíbrio deixando a escolha sem resposta'
	],
	'swords-3': [
		'honestidade para reconhecer uma diferença dolorosa sem escondê-la',
		'repetição mental da ferida que transforma compreensão em nova exposição à dor'
	],
	'swords-4': [
		'intervalo que permite recompor a atenção antes de retomar uma exigência',
		'retirada que se prolonga e perde a ligação com aquilo que precisava elaborar'
	],
	'swords-5': [
		'lucidez para perceber o preço de continuar uma disputa',
		'vitória buscada ao custo da confiança necessária para continuar convivendo'
	],
	'swords-6': [
		'possibilidade de atravessar uma mudança carregando o aprendizado do que ficou',
		'distância que muda o cenário mas deixa intacto o modo de participar da dificuldade'
	],
	'swords-7': [
		'estratégia para escolher o que expor e como preservar uma margem de ação',
		'evasão que evita uma conversa necessária e enfraquece a confiança'
	],
	'swords-8': [
		'percepção das condições que restringem uma escolha',
		'sensação de impedimento que torna invisível a pequena margem ainda disponível'
	],
	'swords-9': [
		'atenção ao que uma preocupação insiste em tornar importante',
		'antecipação de desfechos que faz uma possibilidade temida ocupar todo o presente'
	],
	'swords-10': [
		'reconhecimento de um limite que interrompe a tentativa de repetir a mesma resposta',
		'identificação com o desfecho doloroso que impede reconhecer qualquer continuidade'
	],
	'swords-11': [
		'curiosidade crítica para fazer uma pergunta antes de aceitar uma explicação',
		'vigilância intelectual que transforma toda conversa em algo a desmentir'
	],
	'swords-12': [
		'rapidez para defender uma ideia e responder a uma exigência',
		'pressa argumentativa que avança antes de compreender a experiência de quem escuta'
	],
	'swords-13': [
		'independência para dizer com precisão o que pode e o que não pode ser oferecido',
		'distância defensiva que protege o limite ao custo de qualquer aproximação'
	],
	'swords-14': [
		'critério para tomar uma decisão que possa ser explicada e sustentada',
		'autoridade intelectual que trata uma diferença de experiência como erro'
	],
	'pentacles-1': [
		'possibilidade concreta de começar com um recurso que pode ser desenvolvido',
		'expectativa de resultado antes de cuidar das condições materiais do começo'
	],
	'pentacles-2': [
		'flexibilidade para reorganizar compromissos sem perder o mínimo de sustentação',
		'adaptação permanente que normaliza um ritmo impossível de manter'
	],
	'pentacles-3': [
		'colaboração em que competências diferentes encontram uma tarefa comum',
		'dependência de validação que dificulta reconhecer a própria contribuição'
	],
	'pentacles-4': [
		'capacidade de preservar uma reserva e reconhecer o que precisa de proteção',
		'retenção que confunde segurança com impedir qualquer circulação'
	],
	'pentacles-5': [
		'reconhecimento de uma necessidade que permite procurar apoio',
		'isolamento diante da falta que torna mais difícil alcançar o auxílio disponível'
	],
	'pentacles-6': [
		'troca em que oferecer e receber podem ser discutidos com clareza',
		'ajuda que cria uma dívida implícita ou mantém uma desigualdade de poder'
	],
	'pentacles-7': [
		'paciência para avaliar o que um investimento de tempo está produzindo',
		'permanência sustentada apenas pelo esforço já gasto e não pelo sentido atual'
	],
	'pentacles-8': [
		'prática que transforma repetição e retorno recebido em competência',
		'aperfeiçoamento sem medida que torna todo resultado insuficiente'
	],
	'pentacles-9': [
		'autonomia para usufruir o que foi construído sem precisar exibi-lo',
		'autossuficiência que interpreta qualquer necessidade de apoio como fracasso'
	],
	'pentacles-10': [
		'continuidade que distribui recursos e conhecimento para além de uma pessoa',
		'lealdade a uma estrutura herdada que impede rever o que ela exige'
	],
	'pentacles-11': [
		'atenção para aprender fazendo e reconhecer o valor dos primeiros resultados',
		'preparação que adia a prática por ainda não se sentir competente'
	],
	'pentacles-12': [
		'constância para dar andamento ao que depende de cuidado repetido',
		'persistência que mantém a rotina mesmo quando seu propósito precisa mudar'
	],
	'pentacles-13': [
		'cuidado prático que torna uma intenção habitável no cotidiano',
		'disponibilidade que assume todas as necessidades e deixa o próprio limite para depois'
	],
	'pentacles-14': [
		'responsabilidade para organizar recursos e sustentar uma realização no tempo',
		'segurança construída sobre controle que dificulta repartir autonomia'
	]
};

export const currentTarotMeanings: Readonly<Record<string, TarotMeaning>> = Object.fromEntries(
	Object.entries(tarotCanon).map(([id, meaning]) => {
		const nuance = nuances[id];
		if (!nuance) throw new Error(`Carta sem nuance editorial: ${id}`);
		return [id, { ...meaning, resource: nuance[0], excess: nuance[1] }];
	})
);

export function cardApplication(value: string, field: 'relationship' | 'work'): string {
	const lead = field === 'relationship' ? 'No campo afetivo' : 'No trabalho';
	return /^(?:pode |favorece |é |descreve |representa |indica |aponta |mostra )/u.test(value)
		? `${lead}, a carta ${value}.`
		: `${lead}, a imagem põe em foco ${value}.`;
}
