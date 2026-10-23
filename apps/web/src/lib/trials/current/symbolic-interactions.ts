/** Operational reductions of the current card corpus. The condition is the
 * concrete requirement of the action, not another keyword for the card. These
 * profiles connect positions without changing the recorded cards or method. */
export type TarotOperation =
	| 'begin'
	| 'direct'
	| 'pause'
	| 'nurture'
	| 'govern'
	| 'choose'
	| 'change'
	| 'judge'
	| 'release'
	| 'balance'
	| 'desire'
	| 'imagine'
	| 'share'
	| 'contest'
	| 'defend'
	| 'carry'
	| 'repair'
	| 'craft'
	| 'keep';
export type TarotAction = { operation: TarotOperation; action: string; condition: string };
type Row = [TarotOperation, string, string];
const rows: Record<string, Row> = {
	'major-0': [
		'begin',
		'experimentar um começo antes de conhecer toda a rota',
		'A liberdade do primeiro passo inclui reconhecer as consequências quando elas aparecem'
	],
	'major-1': [
		'direct',
		'transformar o que já está disponível numa primeira ação',
		'Uma intenção se torna compreensível quando encontra uma entrega que possa ser reconhecida'
	],
	'major-2': [
		'pause',
		'escutar antes de encerrar a questão numa resposta',
		'O silêncio ajuda a compreender quando depois pode dar lugar à palavra'
	],
	'major-3': [
		'nurture',
		'oferecer tempo e condições para algo crescer',
		'O cuidado favorece o crescimento quando quem o recebe também pode participar e ganhar autonomia'
	],
	'major-4': [
		'govern',
		'definir quem decide e por qual responsabilidade responde',
		'Uma regra conserva sua utilidade enquanto responde à situação que deveria organizar'
	],
	'major-5': [
		'craft',
		'aprender com uma referência e compreender a prática que ela transmite',
		'Uma referência continua ensinando quando pode ser interrogada e adaptada ao que acontece agora'
	],
	'major-6': [
		'choose',
		'assumir um desejo e negociar o compromisso que ele pede',
		'Escolher inclui reconhecer as diferenças e as alternativas que ficam de fora'
	],
	'major-7': [
		'direct',
		'coordenar vontades diferentes em torno de uma direção',
		'Uma direção admite correções sem transformar toda mudança numa derrota'
	],
	'major-8': [
		'balance',
		'dar expressão a uma intensidade sem ser governado por ela',
		'A firmeza dá expressão ao que se sente sem deixar que a intensidade decida cada resposta'
	],
	'major-9': [
		'pause',
		'se recolher para distinguir uma referência própria',
		'O recolhimento esclarece uma referência própria quando mantém um caminho de volta à participação'
	],
	'major-10': [
		'change',
		'rever a participação quando as condições mudam',
		'Reconhecer uma mudança permite escolher a participação possível nas condições de agora'
	],
	'major-11': [
		'judge',
		'distribuir responsabilidades levando em conta as consequências',
		'Um critério se torna mais justo quando admite diferenças relevantes entre as pessoas e as situações'
	],
	'major-12': [
		'pause',
		'suspender a insistência para enxergar a questão de outro ângulo',
		'Uma espera ganha sentido quando muda a compreensão e reconhece o custo de permanecer'
	],
	'major-13': [
		'release',
		'encerrar uma forma que já não comporta a continuidade',
		'Um encerramento permite distinguir o que acabou do que ainda merece cuidado'
	],
	'major-14': [
		'balance',
		'ajustar diferenças por aproximações que possam ser sustentadas',
		'Uma aproximação ganha consistência quando inclui a diferença difícil que antes ficava adiada'
	],
	'major-15': [
		'desire',
		'reconhecer o desejo e o preço do que ele oferece',
		'A liberdade para recusar continua necessária mesmo diante de algo que oferece prazer ou vantagem'
	],
	'major-16': [
		'change',
		'reconhecer uma fragilidade e rever o que se apoiava nela',
		'Rever uma base frágil inclui poupar o que ainda pode ser preservado na mudança'
	],
	'major-17': [
		'repair',
		'retomar o cuidado depois de perder uma referência',
		'A esperança recebe apoio nos cuidados que tornam um recomeço possível'
	],
	'major-18': [
		'imagine',
		'dar atenção a uma imagem que ainda não está compreendida',
		'Medo e expectativa podem receber atenção sem virar certeza sobre o que acontece'
	],
	'major-19': [
		'share',
		'compartilhar uma experiência e o que nela dá alegria',
		'A proximidade pode acolher também o que ainda é difícil de mostrar'
	],
	'major-20': [
		'judge',
		'rever uma história para responder de outro modo agora',
		'Uma revisão muda a história quando chega a uma participação diferente no presente'
	],
	'major-21': [
		'release',
		'reconhecer uma etapa completa e preparar outra participação',
		'Concluir uma etapa deixa espaço para um começo que ainda não oferece a mesma segurança'
	],
	'wands-1': [
		'begin',
		'dar uma primeira forma a um entusiasmo',
		'A energia de começar encontra continuidade quando uma tentativa recebe tempo para se desenvolver'
	],
	'wands-2': [
		'choose',
		'escolher uma direção antes de comprometer os próximos passos',
		'O planejamento ganha medida no contato com as condições que existem fora da imaginação'
	],
	'wands-3': [
		'direct',
		'acompanhar a expansão de algo que já entrou em movimento',
		'Uma expansão se sustenta enquanto pode ser acompanhada com os recursos disponíveis'
	],
	'wands-4': [
		'share',
		'reconhecer e celebrar uma base construída em comum',
		'Uma celebração reconhece a base comum e o cuidado que ainda a mantém de pé'
	],
	'wands-5': [
		'contest',
		'tornar visíveis diferenças por meio do confronto',
		'O desacordo esclarece diferenças enquanto continua ligado ao assunto, em vez de medir superioridade'
	],
	'wands-6': [
		'share',
		'receber reconhecimento por uma realização',
		'O reconhecimento dá apoio à realização, mas sua continuidade inclui os momentos em que não há aplauso'
	],
	'wands-7': [
		'defend',
		'proteger uma posição que ainda faz sentido',
		'Um limite pode proteger a própria posição e ainda permitir que uma diferença seja ouvida'
	],
	'wands-8': [
		'direct',
		'dar sequência a mensagens e movimentos que já têm direção',
		'Uma resposta ganha sentido quando pode ser compreendida antes de cobrar o próximo compromisso'
	],
	'wands-9': [
		'defend',
		'preservar o que pode continuar depois de um esforço',
		'A experiência ajuda quando distingue um perigo presente da defesa que permaneceu ligada'
	],
	'wands-10': [
		'carry',
		'levar um compromisso adiante reconhecendo sua carga',
		'A continuidade ganha fôlego quando tarefas podem ser divididas ou reduzidas antes do esgotamento'
	],
	'wands-11': [
		'begin',
		'experimentar uma forma própria de se expressar',
		'Uma experiência ensina quando dura o suficiente para receber uma resposta antes da próxima novidade'
	],
	'wands-12': [
		'direct',
		'atravessar a hesitação e colocar uma vontade em movimento',
		'Um impulso ganha direção quando considera quem precisará acompanhar e sustentar o novo ritmo'
	],
	'wands-13': [
		'share',
		'encorajar a própria expressão e a de outras pessoas',
		'A confiança pode encorajar uma expressão diferente da própria'
	],
	'wands-14': [
		'govern',
		'dar direção a uma realização e responder pelo que mobiliza',
		'Uma liderança responde pelo que mobiliza ao compartilhar decisões que também comprometem outras pessoas'
	],
	'cups-1': [
		'begin',
		'acolher uma abertura afetiva e o que ela desperta',
		'Uma abertura afetiva pode acolher a resposta e o ritmo de quem participa'
	],
	'cups-2': [
		'share',
		'construir um encontro em que os dois lados tenham resposta',
		'A proximidade ganha reciprocidade quando nenhuma das pessoas precisa desaparecer para manter o acordo'
	],
	'cups-3': [
		'share',
		'se apoiar na convivência e na alegria de participar de um grupo',
		'O pertencimento pode acolher limites e necessidades que não são iguais para todos'
	],
	'cups-4': [
		'pause',
		'distinguir o que já perdeu sentido do que ainda pode ser recebido',
		'O afastamento de uma repetição pode deixar alguma abertura para uma experiência diferente'
	],
	'cups-5': [
		'repair',
		'reconhecer uma perda sem abandonar todo apoio restante',
		'Reconhecer a falta permite receber apoio sem exigir que ele apague a perda'
	],
	'cups-6': [
		'imagine',
		'recuperar um vínculo com a memória e com gestos de confiança',
		'Uma lembrança pode dar apoio ao presente sem exigir que a experiência anterior seja repetida'
	],
	'cups-7': [
		'imagine',
		'distinguir desejos entre várias possibilidades atraentes',
		'Uma possibilidade ganha consistência quando encontra o custo e os limites de ser escolhida'
	],
	'cups-8': [
		'release',
		'se afastar de algo que já não recebe sua participação inteira',
		'Uma saída reconhece o valor do que foi vivido sem obrigar sua continuidade'
	],
	'cups-9': [
		'desire',
		'reconhecer uma satisfação que pode ser desfrutada',
		'O prazer pode ter lugar sem se tornar a única medida para continuar'
	],
	'cups-10': [
		'share',
		'cultivar uma vida afetiva que comporte participação e pertencimento',
		'Uma imagem de harmonia ganha vida quando admite as diferenças reais de quem participa'
	],
	'cups-11': [
		'begin',
		'dar expressão a um sentimento ainda recente',
		'A delicadeza abre uma conversa quando também permite dizer algo que pode receber outra resposta'
	],
	'cups-12': [
		'desire',
		'aproximar um desejo por meio de um convite',
		'O encanto ganha continuidade quando encontra uma presença que possa ser sustentada'
	],
	'cups-13': [
		'nurture',
		'acolher o que se sente antes de buscar uma solução',
		'A escuta acolhe o sentimento sem precisar assumir por ele toda a responsabilidade'
	],
	'cups-14': [
		'balance',
		'sustentar uma conversa afetiva mesmo diante de intensidade',
		'A calma permite reconhecer uma diferença sem apagar o próprio sentimento'
	],
	'swords-1': [
		'judge',
		'nomear o ponto decisivo e formular uma posição clara',
		'A clareza torna uma diferença discutível quando inclui suas consequências e o que ainda falta compreender'
	],
	'swords-2': [
		'pause',
		'reconhecer o impasse antes de forçar uma decisão',
		'Adiar uma decisão só esclarece a questão quando abre espaço para a informação ou a conversa que faltava'
	],
	'swords-3': [
		'repair',
		'nomear uma diferença dolorosa sem esconder o que ela rompe',
		'Uma dor reconhecida pode ganhar expressão sem virar uma nova acusação'
	],
	'swords-4': [
		'pause',
		'interromper respostas para recuperar atenção e discernimento',
		'Uma pausa recupera atenção quando protege um intervalo e uma possibilidade de retorno'
	],
	'swords-5': [
		'contest',
		'reconhecer o custo de tentar vencer uma disputa',
		'O resultado de uma disputa inclui o que acontece com a confiança depois dela'
	],
	'swords-6': [
		'release',
		'fazer uma passagem gradual levando o aprendizado necessário',
		'Uma passagem se torna viável quando encaminha o que continuará precisando de cuidado'
	],
	'swords-7': [
		'choose',
		'preservar margem de ação escolhendo o que dizer e quando agir',
		'Uma estratégia preserva autonomia sem retirar de quem participa a informação necessária para escolher'
	],
	'swords-8': [
		'defend',
		'distinguir os limites que restringem uma escolha',
		'Reconhecer um limite permite distinguir a restrição atual do passo que ainda pode ser dado'
	],
	'swords-9': [
		'imagine',
		'dar nome ao receio que ocupa a atenção',
		'Uma antecipação pode ser examinada sem que todo receio se torne previsão do que acontecerá'
	],
	'swords-10': [
		'release',
		'reconhecer o esgotamento de uma forma de responder',
		'Um fim permite reconhecer a perda sem definir por ela todas as possibilidades futuras'
	],
	'swords-11': [
		'judge',
		'perguntar e verificar antes de aceitar uma explicação',
		'Uma investigação esclarece quando a pergunta pode receber uma resposta e mudar o entendimento'
	],
	'swords-12': [
		'direct',
		'defender uma ideia por uma intervenção direta',
		'Uma resposta firme continua responsável quando admite revisão e escuta antes de aumentar o confronto'
	],
	'swords-13': [
		'judge',
		'formular um limite com clareza e autonomia',
		'A lucidez pode delimitar uma diferença sem retirar da conversa toda possibilidade de afeto'
	],
	'swords-14': [
		'govern',
		'aplicar um critério e responder pela decisão que ele organiza',
		'Uma autoridade se torna responsável quando seu critério pode ser explicado, contestado e revisto'
	],
	'pentacles-1': [
		'begin',
		'dar uma base concreta a uma possibilidade',
		'Uma oportunidade ganha forma quando recebe o tempo, os recursos e o trabalho de que precisa'
	],
	'pentacles-2': [
		'balance',
		'reorganizar compromissos para atravessar uma mudança',
		'Um ajuste ajuda quando reduz a instabilidade, em vez de apenas acomodar novas exigências'
	],
	'pentacles-3': [
		'craft',
		'combinar contribuições para realizar um trabalho em conjunto',
		'O trabalho comum ganha consistência quando cada pessoa conhece sua parte e pode participar da avaliação'
	],
	'pentacles-4': [
		'keep',
		'proteger uma base e reconhecer o que ela permite sustentar',
		'A preservação sustenta uma base enquanto permite a circulação do que a mantém viva'
	],
	'pentacles-5': [
		'repair',
		'reconhecer uma falta e procurar um apoio acessível',
		'Um pedido de ajuda pode ser formulado sem transformar a falta numa definição permanente de quem o faz'
	],
	'pentacles-6': [
		'share',
		'distribuir apoio considerando quem dá e quem recebe',
		'Uma ajuda oferece apoio quando preserva a participação e a liberdade de quem recebe'
	],
	'pentacles-7': [
		'pause',
		'avaliar o que amadureceu antes de investir mais esforço',
		'A espera permite avaliar o retorno do esforço quando também reconhece o custo de continuar'
	],
	'pentacles-8': [
		'craft',
		'aprimorar uma prática pelo trabalho continuado',
		'A repetição melhora uma prática quando permite corrigir o que o retorno revela'
	],
	'pentacles-9': [
		'keep',
		'usufruir de uma autonomia construída pelo próprio esforço',
		'A autonomia permite escolher apoio sem fazer dessa escolha uma perda de valor próprio'
	],
	'pentacles-10': [
		'keep',
		'sustentar o que pode continuar com apoio compartilhado',
		'Uma base compartilhada ganha continuidade quando tarefas, recursos e conhecimentos podem passar a outras mãos'
	],
	'pentacles-11': [
		'craft',
		'aprender a dar consistência a uma possibilidade concreta',
		'Uma preparação se torna aprendizado quando encontra uma prática delimitada e algum retorno'
	],
	'pentacles-12': [
		'craft',
		'cumprir uma tarefa com constância e atenção aos detalhes',
		'A regularidade sustenta a continuidade quando admite um ajuste antes de virar obrigação sem propósito'
	],
	'pentacles-13': [
		'nurture',
		'cuidar das condições práticas que sustentam a vida',
		'O cuidado cotidiano preserva a disponibilidade de quem oferece e a participação de quem recebe'
	],
	'pentacles-14': [
		'govern',
		'administrar recursos e responder pela continuidade do que se construiu',
		'A capacidade de prover oferece segurança quando também permite dividir responsabilidade e rever acordos'
	]
};
export const tarotActions = Object.fromEntries(
	Object.entries(rows).map(([id, [operation, action, condition]]) => [
		id,
		{ operation, action, condition }
	])
) as Record<string, TarotAction>;

export type TarotScope = 'relationship' | 'resources' | 'learning' | 'work' | 'choice' | 'open';
export type TarotConnection = 'obstacle' | 'response' | 'complement';

/** Each rule describes why these operations modify one another. It is applied
 * after the actual positions have selected obstacle, response or complement.
 * The card-specific actions and conditions remain visible alongside the rule. */
export function interactionMechanism(
	aId: string,
	bId: string,
	kind: TarotConnection,
	scope: TarotScope
): string {
	const a = tarotActions[aId],
		b = tarotActions[bId];
	if (!a || !b) throw new Error('Carta sem perfil relacional atual.');
	const response = kind === 'response';
	if (aId === 'swords-7' && bId === 'wands-1')
		return scope === 'relationship'
			? 'Uma nova aproximação pode animar o vínculo sem resolver o que ainda fica fora da conversa. Se cada entusiasmo permite mudar de assunto, a relação ganha movimento e continua sem saber com o que pode contar. O desafio do Ás de Paus é dar expressão ao desejo sem usá-lo para contornar uma diferença.'
			: 'Uma ideia nova pode oferecer uma saída antes que as consequências da estratégia anterior tenham sido assumidas. Começar outra tentativa sem esclarecer o que ficou pendente leva a mesma dificuldade para uma forma mais animadora. O desafio é transformar a energia inicial em uma entrega que possa ser acompanhada.';
	if (aId === 'wands-1' && bId === 'wands-14')
		return scope === 'relationship'
			? 'O entusiasmo de começar ganha continuidade quando alguém pode dizer o que deseja e responder pelo que propõe. O Rei de Paus acrescenta ao impulso uma direção que possa ser conversada: um convite fica mais claro quando também diz que tipo de presença está sendo oferecida.'
			: 'A iniciativa deixa de depender apenas do entusiasmo quando encontra alguém disposto a organizar sua continuidade. O Rei de Paus dá direção à primeira tentativa: delimita o que será feito, reúne participação e responde pelas consequências do que propõe.';
	if (aId === 'swords-7' && bId === 'wands-14')
		return 'A saída discreta do Sete de Espadas encontra no Rei de Paus a responsabilidade de tornar uma direção compreensível. Há uma diferença entre preservar o tempo de pensar e deixar outras pessoas sem saber com o que podem contar. Assumir a própria proposta permite negociar a participação, em vez de depender do que não chega a ser dito.';
	if (aId === 'pentacles-4' && bId === 'wands-7')
		return 'Guardar o que oferece segurança e defender a própria posição podem reforçar o mesmo fechamento. Um limite protege o vínculo quando esclarece o que pode ser compartilhado; se toda diferença parece ameaçar a base, a defesa acaba afastando a participação que ajudaria a sustentá-la.';
	if (aId === 'wands-7' && bId === 'swords-9')
		return 'A defesa constante pode continuar por dentro mesmo quando a conversa terminou. Antecipar cada crítica transforma uma diferença em muitas discussões imaginadas, e o esforço de se proteger aumenta o cansaço que torna difícil escutar. Dar nome ao receio permite conversar sobre um ponto de cada vez, em vez de responder antecipadamente a todos.';
	if (aId === 'swords-6' && bId === 'cups-2')
		return 'Um afastamento pode abrir espaço para rever a maneira de estar perto. O Dois de Copas acrescenta à passagem a possibilidade de um novo acordo: a aproximação pode ganhar outra forma quando os dois dizem o que conseguem oferecer. A conversa permite descobrir se há lugar para essa presença, em vez de tentar recuperar sozinho o modo anterior de estar junto.';
	if (aId === 'major-6' && bId === 'major-1')
		return 'Uma escolha afetiva ganha clareza quando chega a um gesto que a outra pessoa possa compreender. O Mago transforma a hesitação dos Enamorados numa participação delimitada: dizer o que deseja, fazer um convite ou propor um acordo permite receber uma resposta. O gesto esclarece a escolha sem decidir pelos dois.';
	if (aId === 'swords-9' && bId === 'cups-2')
		return 'A conversa pode trazer uma resposta que a antecipação solitária não consegue produzir. Uma preocupação nomeada dá ao outro algo a que responder; tratar o receio como uma certeza pode fazer você discutir com uma posição que ele ainda não apresentou. A reciprocidade inclui ouvir essa resposta sem precisar adivinhá-la antes.';
	if (aId === 'wands-7' && bId === 'swords-6')
		return 'Defender uma posição e tomar distância podem parecer recusas equivalentes, mas cumprem funções diferentes. A defesa tenta preservar um lugar dentro da relação; o afastamento pode buscar condições para participar de outro modo. Quando essa diferença é conversada, um intervalo deixa de precisar ser entendido de saída como ataque ou abandono.';
	if (aId === 'swords-5' && bId === 'swords-3')
		return response
			? 'Nomear a ferida muda o propósito da conversa: o que precisa de reparo ganha lugar onde antes a discussão buscava um vencedor. A confiança pode começar a ser cuidada quando a dor deixa de servir como nova acusação.'
			: 'Vencer a discussão pode deixar a confiança sem lugar para continuar. A ferida dá uma medida ao preço da vitória: retomar o mesmo argumento com mais força pode aprofundar a distância que ele pretendia resolver.';
	if (aId === 'swords-3' && bId === 'swords-5')
		return response
			? 'A dor precisa de reconhecimento, e a disputa mostra o custo de buscar esse reconhecimento vencendo a outra pessoa. Distinguir reparação de vitória permite formular o que precisaria mudar depois da conversa.'
			: 'Quando uma diferença já dói, transformar a conversa numa disputa pode tornar mais difícil ouvir o que foi ferido. A tentativa de provar quem tem razão passa a ocupar o lugar do reconhecimento que faltava.';
	if (aId === 'cups-1' && bId === 'major-15')
		return response
			? 'A abertura afetiva pode incluir prazer sem entregar a ele toda a medida do vínculo. Reconhecer o que atrai e o preço dessa atração devolve lugar à liberdade para recusar, mesmo quando há vontade de continuar.'
			: 'A disponibilidade afetiva pode ficar presa à gratificação que o encontro oferece. A intensidade do começo dificulta perceber o momento em que receber afeto passa a exigir abrir mão da liberdade para recusar.';
	if (aId === 'cups-1' && bId === 'major-4')
		return response
			? 'Dar nome ao que cada pessoa pode assumir oferece uma base à abertura afetiva. A autoridade sobre as próprias escolhas permite distinguir disponibilidade para sentir de compromisso já estabelecido.'
			: 'Uma abertura afetiva perde espaço quando só pode acontecer dentro de regras que uma pessoa decide pela outra. A autoridade precisa organizar o encontro sem decidir antecipadamente qual resposta será aceita.';
	const operations = [a.operation, b.operation];
	const has = (x: TarotOperation, y: TarotOperation) =>
		x === y
			? operations.every((operation) => operation === x)
			: operations.includes(x) && operations.includes(y);
	if (a.operation === 'direct' && b.operation === 'govern')
		return kind === 'obstacle'
			? 'A iniciativa pode ficar estreita quando precisa caber numa regra que ainda não ouviu o que você está propondo. Explicar melhor a intenção ajuda até certo ponto; o encontro também precisa admitir que o próprio acordo seja revisto. Caso contrário, toda tentativa nova acaba respondendo a uma exigência antiga.'
			: 'Uma proposta ganha continuidade quando fica claro quem pode decidir e pelo que cada pessoa responde. A organização dá apoio ao primeiro gesto ao transformar uma intenção em compromissos que possam ser acompanhados. Ela perde esse apoio se o combinado impedir qualquer correção depois do começo.';
	if (a.operation === 'govern' && b.operation === 'balance')
		return scope === 'relationship'
			? 'Um acordo claro pode continuar difícil de viver quando desconsidera o tempo e a disponibilidade de vocês. O ajuste permite manter o compromisso mudando a maneira de cumpri-lo: conversar sobre frequência, presença e divisão das tarefas torna a regra mais próxima da vida que ela organiza. Ceder sempre do mesmo lado apenas transfere a rigidez para quem se adapta.'
			: 'Um compromisso bem definido ainda precisa caber no tempo e nos recursos de quem o assume. O ajuste alcança a regra quando permite rever prazo, carga ou divisão do trabalho. Se apenas a execução muda e a exigência continua aumentando, a organização conserva o problema que deveria resolver.';
	if (a.operation === 'balance' && b.operation === 'begin')
		return scope === 'relationship'
			? 'Ajustar a disponibilidade pode abrir espaço para um convite pequeno e sincero. O começo não precisa prometer toda a presença futura; ele permite descobrir como vocês conseguem estar juntos nas condições de agora. A espontaneidade fica mais acolhedora quando a variação de tempo pode ser dita, em vez de aparecer como interesse que surge e desaparece.'
			: 'Reorganizar o que já ocupa seu tempo pode abrir espaço para uma tentativa delimitada. Começar por uma parte permite conhecer a nova demanda antes de acrescentá-la inteira aos compromissos atuais. A experiência só ajuda a ajustar a carga se houver espaço para rever o que ela passou a exigir.';
	if (a.operation === 'balance' && b.operation === 'share')
		return scope === 'relationship'
			? 'A disponibilidade pode oscilar sem que o encontro perca toda a sua alegria. Quando essa oscilação é conversada, vocês podem combinar uma presença possível e dividir o cuidado para mantê-la. O tempo junto deixa de exigir que alguém esconda o próprio cansaço para preservar a imagem de que está tudo bem.'
			: 'Um ritmo variável se torna mais viável quando o trabalho de ajustá-lo também pode ser compartilhado. Dizer o que mudou permite redistribuir uma tarefa antes que outra pessoa tenha de adivinhar por que ela ficou sem resposta. O acordo ganha continuidade ao incluir os limites de quem participa.';
	if (has('nurture', 'share'))
		return scope === 'relationship'
			? 'O cuidado oferecido pode preparar uma proximidade em que você também recebe. Essa passagem exige deixar que o outro conheça uma necessidade sua e encontre sua própria maneira de responder. Fazer tudo para manter o encontro acolhedor pode conservar o papel de quem cuida e impedir a reciprocidade que permitiria descansar nele.'
			: 'O apoio dá resultado quando quem o recebe encontra espaço para contribuir de volta. Dividir uma tarefa ou uma decisão transforma o cuidado em participação, em vez de tornar sua continuidade dependente de uma única pessoa. Aceitar uma contribuição diferente da sua faz parte dessa passagem.';
	if (has('carry', 'judge'))
		return scope === 'relationship'
			? 'Uma carga acumulada ganha possibilidade de divisão quando pode ser nomeada sem virar uma lista de acusações. Dizer qual tarefa pesa e que mudança você propõe oferece ao outro algo concreto a que responder. A conversa perde força se servir apenas para provar quem se dedica mais, deixando a mesma pessoa responsável por tudo depois.'
			: 'Tornar a carga compreensível permite discutir o que merece continuar e o que precisa de outra distribuição. Um critério explícito ajuda a reduzir a lista, além de ordenar sua execução. A clareza tem efeito quando muda uma responsabilidade concreta antes que o esforço de explicar vire mais uma tarefa.';
	if (has('balance', 'judge'))
		return 'A negociação fica mais clara quando a diferença tem nome: quanto tempo existe, qual responsabilidade pesa e o que cada pessoa consegue oferecer. Isso permite ajustar um acordo sem tratar toda mudança como falta de compromisso. Uma frase pode orientar o próximo gesto e ainda admitir uma resposta que a corrija.';
	if (has('pause', 'keep'))
		return scope === 'relationship'
			? 'Um assunto suspenso pode continuar escondido na rotina que vocês já construíram. O apoio da vida em comum permite retomá-lo sem decidir tudo de uma vez, desde que a segurança também dê lugar a uma mudança no acordo. Manter cada hábito intacto pode transformar o silêncio num modo permanente de estar junto.'
			: 'Uma base já construída pode oferecer tempo para esclarecer o que ficou suspenso. Essa espera ganha utilidade quando permite rever uma tarefa ou um acordo que mantém a questão parada. Conservar toda a forma anterior apenas porque ela é conhecida pode consumir o apoio que ajudaria a atravessar a mudança.';
	if (a.operation === 'judge' && b.operation === 'govern')
		return scope === 'relationship'
			? 'Uma pergunta pode abrir o acordo ou servir apenas para confirmar uma regra já decidida. A conversa se amplia quando uma resposta diferente também pode mudar o combinado. Se cada dúvida vira uma prova de que alguém está errado, explicar as condições do vínculo acaba ocupando o espaço de conhecer quem está nele.'
			: 'Uma investigação encontra consequência quando seu resultado pode modificar a regra que organiza o trabalho. O critério deixa de ensinar se toda resposta precisa confirmar a decisão anterior. Esclarecer quem pode rever o acordo dá à pergunta uma possibilidade real de mudar o próximo passo.';
	if (a.operation === 'defend' && b.operation === 'begin')
		return scope === 'relationship'
			? 'Um convite leve pode encontrar uma cautela construída por experiências anteriores. A aproximação ganha espaço quando o limite é compreensível e permite uma tentativa pequena, em vez de exigir prova completa de segurança antes de qualquer encontro. O começo também precisa durar o suficiente para que você conheça uma resposta diferente da que teme.'
			: 'Uma tentativa nova pode encontrar resistência porque o esforço anterior ainda deixou pouco fôlego. Delimitar o que será experimentado protege esse fôlego sem impedir toda iniciativa. O retorno do primeiro passo ajuda a distinguir uma dificuldade presente da defesa que continuou ligada depois da experiência passada.';
	if (a.operation === 'begin' && b.operation === 'repair')
		return scope === 'relationship'
			? 'Uma abertura afetiva pode encontrar uma diferença que ainda dói. O começo ganha intimidade quando permite falar dessa dor sem exigir que ela desapareça para que exista proximidade. Oferecer escuta e receber uma resposta vale mais do que tentar demonstrar que o entusiasmo atual já corrigiu o que machucou.'
			: 'Uma tentativa nova pode tornar visível o que a experiência anterior deixou sem cuidado. Reconhecer essa dificuldade permite começar por outra forma, em vez de exigir que o novo projeto compense toda a perda. O primeiro passo ganha medida quando inclui o apoio de que você precisa para sustentá-lo.';
	if (has('direct', 'pause'))
		return response && b.operation === 'pause'
			? scope === 'relationship'
				? 'Dar um intervalo entre as respostas permite perceber o que a aproximação está produzindo. O contato pode continuar com menos urgência: uma mensagem ganha sentido pelo que os dois conseguem compreender, além da rapidez com que chega.'
				: scope === 'work'
					? 'Interromper a sequência de entregas por uma revisão permite descobrir qual tarefa depende do resultado da anterior. O prazo ganha uma medida mais real quando a próxima promessa considera o que já pôde ser compreendido e concluído.'
					: 'O intervalo devolve à ação a informação que a pressa deixou para trás. Retomar depois de compreender o efeito do passo anterior permite corrigir a direção antes de acrescentar outro compromisso.'
			: 'A velocidade de agir e o tempo de compreender uma resposta podem se desencontrar. Acrescentar outro passo antes dessa compreensão pode aumentar o esforço sem esclarecer se a direção ainda merece ser seguida.';
	if (has('direct', 'carry'))
		return response && b.operation === 'carry'
			? 'Dar continuidade ao impulso exige tornar visível o trabalho que ele cria. Ao distinguir a vontade de avançar da carga de executar, a próxima iniciativa pode ser dimensionada pelo que será possível sustentar depois.'
			: 'A iniciativa cria tarefas que continuam existindo depois do entusiasmo. Quando o ritmo das novas respostas ultrapassa o de concluir ou dividir essas tarefas, agir mais aumenta o acúmulo que dificulta avançar.';
	if (has('begin', 'carry'))
		return 'Cada começo pede uma parte da mesma disponibilidade que já sustenta os compromissos em andamento. Escolher uma tentativa para desenvolver dá ao entusiasmo um destino; multiplicá-las pode transformar a vontade de criar em mais uma carga.';
	if (has('begin', 'begin'))
		return 'Os dois impulsos favorecem a abertura, mas nenhum deles, sozinho, dá duração ao que começa. Uma tentativa precisa permanecer tempo suficiente para encontrar uma resposta; trocar de possibilidade a cada hesitação preserva o entusiasmo e interrompe o aprendizado.';
	if (has('keep', 'release'))
		return response && b.operation === 'release'
			? 'Uma passagem pode preservar o valor da base construída ao mudar a maneira de mantê-la. Encaminhar tarefas, transmitir conhecimento ou rever acordos permite que a continuidade deixe de depender da conservação de toda a forma anterior.'
			: 'Conservar uma base e encerrar uma forma de participação se cruzam no que precisa continuar depois da mudança. O apego à forma antiga pode imobilizar os recursos que ela deveria proteger; a ruptura sem encaminhamento pode perder um apoio ainda útil.';
	if (has('keep', 'keep'))
		return 'A proteção precisa permitir circulação para que a base continue viva. Quando segurança significa reter toda tarefa, recurso ou decisão, o que foi construído fica dependente de uma presença cada vez mais difícil de substituir.';
	if (has('keep', 'share'))
		return 'A base ganha continuidade quando pode receber participação sem perder todo limite. Compartilhar exige esclarecer o que fica sob responsabilidade de cada lado; dar acesso sem combinar o uso pode criar dependência, e reter tudo pode esvaziar o apoio disponível.';
	if (has('nurture', 'govern') || has('nurture', 'defend'))
		return response && b.operation === 'nurture'
			? 'O cuidado permite rever a regra ou a defesa a partir do que ela produz na vida de quem participa. Proteger inclui criar condições para crescer e escolher, além de impedir que algo aconteça.'
			: 'Cuidar precisa de um limite que preserve a participação de quem recebe e de quem oferece. Quando a proteção decide tudo por alguém, o amparo pode tornar essa pessoa menos livre para agir e quem cuida mais sobrecarregado.';
	if (has('nurture', 'carry'))
		return 'O cuidado cria trabalho mesmo quando nasce de afeto ou generosidade. Se uma pessoa assume cada necessidade para garantir que tudo continue bem, o amparo passa a depender do próprio esgotamento. Dar continuidade exige distribuir também o trabalho de cuidar.';
	if (has('share', 'pause'))
		return response && b.operation === 'pause'
			? 'Uma pausa pode abrir espaço para dizer o que a tentativa de manter o encontro encobriu. O silêncio ajuda quando prepara essa conversa; prolongá-lo para conservar a harmonia deixa uma das partes respondendo por um acordo que ainda não foi feito.'
			: 'A proximidade precisa encontrar uma resposta que possa ser dita. Uma diferença mantida em silêncio pode preservar a aparência de acordo enquanto cada pessoa segue entendendo o encontro de um modo.';
	if (has('pause', 'judge'))
		return response && b.operation === 'judge'
			? 'Nomear a diferença que ficou suspensa permite dar fim à espera sem exigir uma certeza completa. Uma pergunta direta ou um critério compartilhado transforma o intervalo numa decisão que pode ser discutida.'
			: 'Escutar uma questão e formular um critério pedem momentos diferentes. Concluir cedo demais pode eliminar a nuance que faltava; continuar suspendendo a palavra depois de compreendê-la pode manter um impasse que já admite conversa.';
	if (has('imagine', 'judge'))
		return response && b.operation === 'judge'
			? 'Separar o que se imagina do que já pode ser nomeado reduz o peso de decidir sob uma única imagem. O critério precisa nascer do que a situação permite compreender, preservando espaço para rever uma expectativa.'
			: 'Uma imagem atraente ou temida pode selecionar de antemão o que parece convincente. O julgamento fica estreito quando usa essa imagem como confirmação de algo que ainda precisa ser compreendido.';
	if (has('imagine', 'direct'))
		return response && b.operation === 'direct'
			? 'Uma ação delimitada permite que a possibilidade encontre uma resposta fora da imaginação. O passo ganha valor pelo que esclarece; agir em grande escala para confirmar uma expectativa pode tornar mais caro revê-la.'
			: 'A vontade de responder pode dar à expectativa a aparência de certeza. Um movimento feito para confirmar uma imagem tende a ignorar a resposta que a contraria, embora seja justamente ela que permitiria corrigir a direção.';
	if (has('desire', 'share'))
		return 'A satisfação de um lado e a participação do outro precisam caber no mesmo encontro. Quando a gratificação se torna a medida de tudo, uma diferença pode parecer falta de afeto. A reciprocidade inclui poder receber uma resposta que não repete o próprio desejo.';
	if (has('desire', 'defend') || has('desire', 'govern'))
		return 'O que atrai pode tornar uma regra ou um limite difícil de negociar. A liberdade de escolher depende de poder dizer até onde vai a participação, inclusive quando a recusa põe em risco uma vantagem ou uma satisfação.';
	if (has('contest', 'share'))
		return 'O encontro precisa comportar uma diferença sem transformar cada conversa numa disputa por lugar. A participação comum se enfraquece quando vencer ou obter aprovação passa a valer mais do que manter espaço para a resposta alheia.';
	if (has('contest', 'repair'))
		return response && b.operation === 'repair'
			? 'Reconhecer o dano muda a conversa porque deixa de exigir que alguém perca para que a outra pessoa seja ouvida. Uma reparação começa por nomear o efeito do conflito e o que precisaria de outro tratamento depois dele.'
			: 'O atrito pode tornar uma diferença visível e também atingir a confiança necessária para lidar com ela. Reabrir a disputa para corrigir a dor tende a reproduzir o gesto que a provocou.';
	if (has('change', 'govern') || has('change', 'keep'))
		return response && b.operation === 'change'
			? 'Rever a estrutura permite proteger a função que ela cumpria sem manter toda regra anterior. Admitir o ponto frágil abre a possibilidade de mudar por partes, antes que o esforço de conservar amplie a perda.'
			: 'Uma mudança nas condições torna visível o custo de manter tudo pelo mesmo arranjo. Quanto mais a segurança depende de uma regra permanecer intacta, mais difícil fica distinguir o apoio que vale preservar da forma que já precisa mudar.';
	if (has('craft', 'pause'))
		return response && b.operation === 'pause'
			? 'O tempo de revisão permite descobrir se repetir a prática ainda produz aprendizado. O intervalo tem utilidade quando ajuda a corrigir o próximo esforço, em vez de apenas adiar o contato com o resultado.'
			: 'A constância precisa de intervalos em que seja possível avaliar o que está mudando. Repetir para provar dedicação pode consumir o tempo que permitiria reconhecer um ajuste necessário na própria prática.';
	if (has('craft', 'govern'))
		return 'Uma regra pode dar continuidade à prática ao esclarecer responsabilidade e critério de conclusão. Quando o modo de fazer fica acima do que ele produz, o trabalho passa a atender ao procedimento e perde a possibilidade de aprender com o resultado.';
	if (has('carry', 'balance'))
		return response && b.operation === 'balance'
			? 'Reorganizar a carga precisa retirar ou redistribuir alguma exigência. Apenas mudar a ordem das tarefas pode dar fôlego por um instante e conservar a mesma sobrecarga no dia seguinte.'
			: 'A adaptação tem um limite quando cada ajuste serve para acomodar mais uma responsabilidade. A carga só muda de fato se a negociação também alcançar o que pode ser dividido, reduzido ou deixado.';
	if (has('repair', 'release'))
		return 'Reconhecer o que terminou permite cuidar da perda sem exigir que tudo volte à forma anterior. A passagem precisa de tempo e apoio; apressar o recomeço pode deixar a dor decidindo o próximo movimento sem encontrar expressão.';
	if (has('choose', 'begin'))
		return 'Escolher dá duração ao começo porque aceita que outras possibilidades ficarão para depois. O primeiro gesto esclarece a escolha quando recebe continuidade; usá-lo apenas para manter todas as opções abertas adia o compromisso que faria uma delas existir.';
	if (has('choose', 'judge'))
		return 'Uma escolha se torna mais compreensível quando o desejo encontra um critério que possa ser explicado. O critério perde utilidade se servir apenas para justificar o que já se queria, ou para evitar assumir que toda direção deixa algo de fora.';
	if (has('defend', 'repair'))
		return 'Uma defesa aprendida com a dor pode continuar ligada mesmo quando já existe algum apoio. Cuidar da ferida permite distinguir o limite que ainda protege da vigilância que impede receber uma participação diferente.';
	// Directed operational connections cover the remaining pairs. These explain
	// how the second card changes the first card's authored condition. They are
	// shared editorial rules, not 6,084 separately authored pair interpretations.
	const pressure: Record<TarotOperation, string> = {
		begin:
			'Outro começo disputa a disponibilidade que permitiria desenvolver a primeira tentativa. Trocar de possibilidade antes de receber uma resposta interrompe o que ainda precisava de continuidade.',
		direct:
			'A exigência de avançar pode chegar antes de haver tempo para compreender o efeito do passo anterior. A próxima resposta então amplia um compromisso cujas condições ainda não ficaram claras.',
		pause:
			'A suspensão retira da ação a resposta de que ela precisa para continuar. O intervalo perde utilidade quando preserva o assunto intacto em vez de preparar uma compreensão ou uma conversa.',
		nurture:
			'Assumir cada necessidade para manter tudo bem pode retirar participação de quem recebe e disponibilidade de quem cuida. A continuidade fica dependente de uma pessoa conseguir responder por todos.',
		govern:
			'Uma regra aplicada antes de ouvir o que a situação exige pode bloquear o ajuste necessário. O controle conserva o arranjo, mas deixa sem resposta a necessidade que tornou esse arranjo insuficiente.',
		choose:
			'A tentativa de preservar todas as alternativas pode adiar o compromisso de que essa ação precisa. Cada possibilidade continua atraente porque ainda não encontrou o custo de ser escolhida.',
		change:
			'A mudança nas condições pode retirar uma referência antes que outra esteja disponível. Insistir na forma anterior aumenta o esforço de conservar algo que já não oferece o mesmo apoio.',
		judge:
			'Um critério fechado cedo demais pode excluir uma diferença relevante. A clareza da resposta perde valor quando ela precisa ignorar parte da situação para continuar parecendo correta.',
		release:
			'Uma saída sem encaminhamento pode retirar também um apoio que ainda precisava de continuidade. O que termina e o que permanece sob responsabilidade pedem tratamentos diferentes.',
		balance:
			'O ajuste pode se transformar numa maneira de acomodar de novo a mesma dificuldade. Conciliar sem dar lugar à diferença preserva a aparência de equilíbrio e repassa o custo para a próxima tentativa.',
		desire:
			'A satisfação imediata pode tornar difícil reconhecer o preço da participação. Quando conservar a vantagem ou o encanto vale mais do que poder recusar, o compromisso perde espaço para ser revisto.',
		imagine:
			'Uma possibilidade atraente ou temida pode ocupar o lugar da resposta que ainda falta. Agir para confirmar essa imagem reduz a atenção ao que permitiria corrigir o entendimento.',
		share:
			'A busca de concordância pode encobrir uma diferença necessária. Um acordo perde reciprocidade quando depende de alguém continuar oferecendo o que ainda não pôde negociar.',
		contest:
			'A necessidade de vencer desloca o assunto para uma disputa por lugar. Mesmo uma resposta convincente pode empobrecer a confiança de que a continuidade depende.',
		defend:
			'A defesa pode excluir de saída a resposta que permitiria um ajuste. Proteger tudo da mesma maneira torna difícil distinguir uma ameaça atual de uma diferença que poderia ser ouvida.',
		carry:
			'O trabalho acumulado consome a disponibilidade de que a próxima etapa precisa. Acrescentar esforço sem reduzir ou dividir exigências conserva a carga que impede a continuidade.',
		repair:
			'A dor pode ocupar toda a atenção e tornar cada nova resposta uma repetição da perda. Reconhecer o que rompeu precisa deixar algum espaço para o apoio que ainda pode ser recebido.',
		craft:
			'Repetir o procedimento pode conservar justamente o ponto que precisava mudar. O esforço deixa de ensinar quando sua medida passa a ser apenas quantas vezes foi repetido.',
		keep: 'A preservação pode reter os recursos, as decisões ou as tarefas que precisavam circular. A base parece protegida, mas se torna mais dependente de uma única forma de mantê-la.'
	};
	const responseTo: Record<TarotOperation, string> = {
		begin:
			'Uma tentativa pequena permite receber uma resposta antes de comprometer toda a continuidade. O começo vale pelo que ensina sobre o próximo passo, além do entusiasmo que desperta.',
		direct:
			'Um passo delimitado leva a questão para uma resposta que possa ser reconhecida. A direção ganha consistência quando o movimento permite rever o que foi feito antes de aumentar o compromisso.',
		pause:
			'Um intervalo com possibilidade de retorno recupera a atenção consumida pela resposta imediata. Ele permite distinguir o que precisa mudar do que apenas ficou difícil de compreender no mesmo ritmo.',
		nurture:
			'Dar tempo e condições ao que ainda precisa crescer evita exigir uma resposta pronta. O cuidado favorece a continuidade quando quem o recebe também pode participar e ganhar autonomia.',
		govern:
			'Esclarecer quem decide e por qual consequência responde dá um limite ao compromisso. A regra ajuda quando permite negociar o que será assumido e rever o que deixou de servir.',
		choose:
			'Assumir uma direção libera a disponibilidade que ficava repartida entre alternativas. A renúncia ao que fica para depois dá duração à possibilidade escolhida.',
		change:
			'Rever o arranjo permite preservar sua função sem insistir em toda a forma anterior. Uma mudança delimitada pode liberar o apoio que o esforço de conservar estava consumindo.',
		judge:
			'Nomear um critério torna a diferença discutível. A clareza ajuda a decidir o próximo passo quando inclui suas consequências e admite uma resposta que possa modificá-la.',
		release:
			'Distinguir o que se encerra do que ainda merece cuidado permite mudar sem perder toda a base. A passagem ganha consistência pelos encaminhamentos que deixam a continuidade possível.',
		balance:
			'Um ajuste que alcança a exigência difícil muda a carga da participação. Aproximar os ritmos pede rever o compromisso, além de melhorar a maneira de suportá-lo.',
		desire:
			'Reconhecer o que se quer torna mais claro o custo que faz sentido assumir. O desejo pode orientar a escolha sem exigir que toda satisfação se transforme numa obrigação de continuar.',
		imagine:
			'Abrir mais de uma imagem para a questão reduz o peso de uma única expectativa. Essa abertura ajuda quando devolve curiosidade à situação e permite receber uma resposta diferente da imaginada.',
		share:
			'Dividir participação e responsabilidade retira a continuidade de uma única presença. A reciprocidade precisa de um acordo em que cada lado possa dizer o que oferece e o que não consegue assumir.',
		contest:
			'Dar expressão ao desacordo permite corrigir um arranjo que parecia funcionar apenas porque a diferença ficava encoberta. O confronto ajuda quando continua ligado ao assunto e admite negociação.',
		defend:
			'Um limite explícito protege a parte que ainda pode ser sustentada. Recusar uma exigência não precisa encerrar toda a participação; pode delimitar a condição em que ela ainda faz sentido.',
		carry:
			'Tornar a carga visível permite dimensionar o próximo compromisso. O esforço ganha continuidade quando inclui o que será dividido, reduzido ou deixado para depois.',
		repair:
			'Reconhecer a perda ou o dano permite mudar o tratamento dado à questão. O que ainda pode continuar deixa de depender de fingir que nada rompeu ou de recuperar toda a forma anterior.',
		craft:
			'Uma prática delimitada dá à intenção uma forma que possa ser repetida e aperfeiçoada. O trabalho ganha valor quando o retorno permite mudar o próximo esforço.',
		keep: 'Uma base disponível permite atravessar a dificuldade sem recomeçar tudo sozinho. Preservar inclui fazer circular tarefas, recursos ou conhecimentos que sustentem a próxima participação.'
	};
	const mechanism = kind === 'obstacle' ? pressure[b.operation] : responseTo[b.operation];
	return `${mechanism} ${a.condition}. ${b.condition}.`;
}

/** Three-card resolutions keep the obstacle in the conclusion. The authored
 * cases distinguish similar operations with different purposes; the fallback
 * relates the available action to the response, then retains the exact
 * obstacle and the response's concrete condition. */
export function resolutionMechanism(
	sourceId: string,
	obstacleId: string,
	responseId: string,
	scope: TarotScope
): string {
	if (sourceId === 'swords-7' && obstacleId === 'wands-1' && responseId === 'wands-14')
		return scope === 'relationship'
			? 'A diferença entre se aproximar e assumir uma presença reúne estas três cartas. O Sete de Espadas pode preservar margem de manobra deixando algo sem explicação; o Ás de Paus pode renovar o interesse antes que essa falta seja conversada. O Rei de Paus oferece outra continuidade: tornar o desejo compreensível e dizer o que você pode sustentar depois do convite. Assim, o entusiasmo abre uma conversa em que a relação pode ganhar direção.'
			: 'Uma nova iniciativa não resolve sozinha o que a estratégia anterior deixou sem encaminhamento. O Sete de Espadas e o Ás de Paus podem manter a atividade mudando de tentativa antes que exista uma entrega clara. O Rei de Paus reúne o que faltava: uma direção assumida, participação organizada e responsabilidade pelo que será feito. A energia do começo passa a servir a um compromisso que pode ser acompanhado.';
	if (sourceId === 'wands-8' && obstacleId === 'pentacles-7' && responseId === 'swords-4')
		return scope === 'relationship'
			? 'A demora pode fazer uma troca de mensagens parecer sem direção e aumentar a vontade de obter logo outra resposta. O Quatro de Espadas muda o propósito do intervalo: recuperar atenção antes de continuar a conversa. Esperar que o encontro amadureça e descansar da urgência de responder são pausas diferentes; a segunda ajuda a perceber se ainda existe algo que vale acompanhar na primeira.'
			: 'A sequência de ações encontra uma etapa em que o resultado ainda precisa amadurecer. O Quatro de Espadas evita preencher essa espera com mais tarefas: recuperar atenção permite rever o retorno do esforço, em vez de confundir atividade contínua com avanço. O intervalo serve à avaliação proposta pelo Sete de Ouros.';
	if (sourceId === 'pentacles-10' && obstacleId === 'pentacles-4' && responseId === 'swords-6')
		return 'A continuidade do Dez de Ouros depende de mais pessoas poderem sustentar o que foi reunido. Quando a proteção do Quatro de Ouros concentra recursos e decisões, essa continuidade se torna frágil. O Seis de Espadas desloca a prioridade para a passagem: distribuir uma responsabilidade ou transmitir um modo de fazer pode preservar a base melhor do que manter cada coisa sob a mesma guarda.';
	if (sourceId === 'cups-2' && obstacleId === 'swords-2' && responseId === 'swords-1')
		return 'O encontro do Dois de Copas precisa de uma resposta dos dois lados. O silêncio do Dois de Espadas pode conservar a proximidade enquanto deixa uma diferença sem negociação. O Ás de Espadas pede dar nome a esse ponto: uma frase clara permite saber sobre o que vocês concordam e o que ainda precisa de conversa, mesmo que interrompa a aparência de entendimento.';
	if (sourceId === 'swords-4' && obstacleId === 'wands-8' && responseId === 'major-14')
		return scope === 'relationship'
			? 'A pausa e a troca rápida de mensagens pedem um acordo sobre o tempo de responder. Descansar da conversa pode recuperar atenção; continuar cobrando a próxima resposta durante esse intervalo conserva a tensão que motivou a pausa. A Temperança aproxima esses ritmos ao permitir combinar quando voltar ao assunto e o que cabe conversar então. O intervalo passa a cuidar do encontro porque tem um caminho de volta, e a conversa pode continuar sem exigir disponibilidade imediata a cada mensagem.'
			: 'O intervalo perde sua função quando continua ocupado pela cobrança de avançar. Recuperar atenção e retomar o trabalho pedem tempos diferentes; um acordo sobre prazo e volume pode aproximá-los. O ajuste precisa alcançar a exigência que interrompe o descanso, para que a próxima etapa comece com condições de ser sustentada.';
	const obstacle = tarotActions[obstacleId],
		reply = tarotActions[responseId];
	if (!obstacle || !reply) throw new Error('Carta sem perfil para síntese relacional.');
	return `${interactionMechanism(sourceId, responseId, 'response', scope)} A dificuldade continua pedindo atenção: ${obstacle.condition.charAt(0).toLowerCase()}${obstacle.condition.slice(1)}.`;
}
