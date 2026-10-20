/** Current editorial applications of the RWS canon. These are authored readings,
 * not facts about the person. Draws, positions and historical corpora stay separate.
 * Each application develops the card's particular tension in the tool's own scope. */
export type TarotApplication = { title: string; day: string; love: string; question: string };
export const tarotApplications: Record<string, TarotApplication> = {
	'major-0': {
		title: 'Começar sem carregar tudo',
		day: 'O Louco abre espaço para experimentar algo antes de dominar cada detalhe. Um caminho diferente pode renovar o dia; deixar uma margem para corrigir o passo permite explorar sem transformar o improviso em descuido.',
		love: 'O Louco traz ao amor a liberdade de conhecer alguém sem escrever toda a história de antemão. A espontaneidade aproxima, mas precisa deixar espaço para falar de limites: disponibilidade para descobrir não equivale a prometer qualquer futuro.',
		question:
			'O Louco favorece uma experiência pequena que ajude a conhecer o caminho. Apostar tudo antes desse contato confunde abertura com desproteção; começar com espaço para voltar atrás torna a descoberta mais livre.'
	},
	'major-1': {
		title: 'Dar forma ao que já está nas mãos',
		day: 'O Mago aproxima uma ideia dos meios disponíveis para realizá-la. O dia ganha direção quando uma habilidade vira um gesto concreto; anunciar muitas possibilidades pode consumir justamente a atenção necessária para entregar a primeira.',
		love: 'O Mago destaca a iniciativa de se apresentar e dizer o que deseja. O encanto de uma boa conversa pode abrir o encontro; a confiança cresce quando os gestos seguintes sustentam aquilo que as palavras fizeram esperar.',
		question:
			'O Mago desloca a escolha da promessa para a capacidade de agir. O recurso decisivo pode já estar disponível, mas precisa ser usado numa entrega reconhecível; persuadir alguém, por si só, não realiza o compromisso.'
	},
	'major-2': {
		title: 'Escutar antes de preencher o silêncio',
		day: 'A Sacerdotisa dá valor ao intervalo em que uma impressão ainda está se formando. Escutar com calma pode revelar uma diferença que a pressa apagaria; prolongar o silêncio depois disso pode apenas adiar uma conversa necessária.',
		love: 'A Sacerdotisa acolhe o que você ainda não consegue dizer sobre um encontro. Essa escuta íntima merece tempo, mas o silêncio do outro não esclarece seus sentimentos: o que precisa ser combinado só ganha contorno numa conversa.',
		question:
			'A Sacerdotisa pede distinguir o que ainda precisa amadurecer do que já pode ser esclarecido. Reunir informação muda uma escolha; esperar que toda incerteza desapareça pode mantê-la suspensa indefinidamente.'
	},
	'major-3': {
		title: 'Cuidar para que algo cresça',
		day: 'A Imperatriz aproxima o dia daquilo que cresce com tempo e condições materiais. Preparar um ambiente, alimentar o corpo ou acompanhar uma criação dá continuidade ao impulso; fazer tudo por alguém pode impedir que essa pessoa participe.',
		love: 'A Imperatriz dá ao afeto uma presença que se sente nos cuidados cotidianos. Acolher e oferecer prazer pode nutrir um encontro; quando cuidar vira ser indispensável, sobra pouco espaço para que o outro também ofereça e escolha.',
		question:
			'A Imperatriz liga o avanço ao cuidado que uma possibilidade consegue receber. Interesse e entusiasmo precisam de tempo e condições materiais; crescer não exige sustentar sozinho tudo o que depende também da participação de outras pessoas.'
	},
	'major-4': {
		title: 'Uma estrutura que permita participar',
		day: 'O Imperador favorece organizar prioridades e assumir uma responsabilidade com começo e limite. Uma regra simples pode poupar desgaste; controlar cada detalhe torna o dia mais rígido justamente quando seria preciso ajustar o plano.',
		love: 'O Imperador aproxima a segurança afetiva de acordos claros e presença confiável. Saber com o que contar pode aliviar o encontro; decidir por duas pessoas transforma essa proteção numa relação em que só uma vontade encontra lugar.',
		question:
			'O Imperador dá peso à responsabilidade que acompanha uma decisão. Definir quem faz o quê torna o caminho viável; impor uma forma pronta sem ouvir quem vai sustentá-la pode enfraquecer a própria estrutura desejada.'
	},
	'major-5': {
		title: 'O que uma referência ajuda a compreender',
		day: 'O Hierofante valoriza aprender com uma prática, um ensinamento ou alguém experiente. Uma referência pode economizar tentativas; seguir a regra sem compreender sua razão dificulta perceber quando ela já não serve à situação.',
		love: 'O Hierofante traz ao amor os valores que dão sentido a um compromisso. Uma tradição compartilhada pode aproximar; cumprir o roteiro de uma relação para parecer correta pode deixar os desejos de vocês sem conversa.',
		question:
			'O Hierofante aproxima a escolha dos valores que você quer sustentar. Uma orientação recebida ajuda quando pode ser compreendida e examinada; obedecer apenas para obter aprovação transfere a decisão sem resolver sua dúvida.'
	},
	'major-6': {
		title: 'Escolher também é assumir um vínculo',
		day: 'Os Enamorados destacam uma escolha entre coisas que podem ter valor para você. O dia pede dar lugar ao que importa mais agora; manter todas as opções abertas pode impedir a experiência de se dedicar a uma delas.',
		love: 'Os Enamorados aproximam atração e escolha. Desejar alguém pode iniciar o encontro, mas construir um vínculo inclui dizer o que aceita oferecer e receber; evitar essa definição para preservar o encanto pode prolongar um desencontro.',
		question:
			'Os Enamorados mostram que uma escolha envolve valores, além de vantagens. A alternativa mais atraente pede um compromisso correspondente; adiar esse compromisso para não perder nenhuma possibilidade também tem o custo de permanecer dividido.'
	},
	'major-7': {
		title: 'Conduzir forças que puxam em direções diferentes',
		day: 'O Carro reúne impulso e direção. Há força para avançar quando as prioridades cabem no mesmo percurso; acelerar para vencer a hesitação pode fazer você gastar energia corrigindo desvios que uma pausa curta teria esclarecido.',
		love: 'O Carro destaca a vontade de fazer o encontro avançar. Tomar iniciativa pode ser importante, mas o ritmo precisa admitir uma resposta diferente da sua; conduzir a aproximação não dá a uma pessoa o controle do vínculo.',
		question:
			'O Carro favorece uma direção assumida depois de reunir as forças disponíveis. Persistência ajuda a atravessar resistência; tratar qualquer ajuste como derrota pode levar você a insistir num percurso que deixou de servir ao propósito.'
	},
	'major-8': {
		title: 'Sustentar a intensidade com delicadeza',
		day: 'A Força aproxima firmeza e sensibilidade. Uma emoção intensa pode ser acolhida sem comandar cada resposta; conter tudo para parecer imperturbável acumula uma pressão que dificulta a delicadeza de que o momento precisa.',
		love: 'A Força dá ao desejo uma presença que não precisa dominar o encontro. É possível afirmar um limite sem retirar o afeto; engolir a própria irritação para manter a paz pode torná-la mais difícil de conversar depois.',
		question:
			'A Força propõe enfrentar a dificuldade sem romper o contato com o que você sente. A firmeza nasce de reconhecer a intensidade e dar-lhe medida; endurecer contra ela pode tornar a decisão uma disputa consigo mesmo.'
	},
	'major-9': {
		title: 'Tempo para formar um critério próprio',
		day: 'O Eremita dá valor a um intervalo com menos solicitações. Recolher a atenção pode ajudar a compreender uma tarefa ou conversa; esperar sentir-se completamente pronto antes de voltar ao contato pode prolongar o afastamento.',
		love: 'O Eremita aproxima o afeto da necessidade de compreender o próprio ritmo. Um tempo só pode tornar a presença mais inteira; afastar-se sem dizer o que precisa deixa o vínculo sem uma referência para esse silêncio.',
		question:
			'O Eremita favorece uma decisão que possa amadurecer longe da pressão imediata. A experiência já vivida oferece um critério; continuar buscando mais uma certeza pode adiar o momento de colocar esse critério em prática.'
	},
	'major-10': {
		title: 'Responder ao que mudou',
		day: 'A Roda da Fortuna destaca o quanto um dia depende também de circunstâncias que mudam. Adaptar o plano preserva sua intenção; esperar a ocasião perfeita pode deixar o que está ao seu alcance sempre para depois.',
		love: 'A Roda da Fortuna aproxima o amor das mudanças de fase e disponibilidade. Um encontro pode precisar de novos acordos quando a rotina muda; atribuir tudo à sorte deixa sem resposta a parte que depende de uma conversa.',
		question:
			'A Roda da Fortuna diferencia a escolha das condições em que ela será feita. Há circunstâncias que você não controla, mas ajustar a participação é possível; esperar a próxima mudança pode manter a decisão presa ao acaso.'
	},
	'major-11': {
		title: 'Dar o peso justo às consequências',
		day: 'A Justiça favorece conferir um acordo e reconhecer a parte que cabe a cada pessoa. Uma resposta proporcional pode resolver um atrito; exigir perfeição antes de reparar o possível prolonga a distância entre erro e responsabilidade.',
		love: 'A Justiça aproxima o compromisso afetivo da reciprocidade nos gestos. Nem tudo precisa ser idêntico para ser justo, mas as diferenças merecem nome; transformar cada cuidado numa conta pode retirar do encontro a possibilidade de oferecer.',
		question:
			'A Justiça dá à escolha o peso de suas consequências e dos acordos envolvidos. Separar responsabilidade de culpa ajuda a responder pelo que é seu; um julgamento rígido pode tornar qualquer imperfeição motivo para não decidir.'
	},
	'major-12': {
		title: 'Mudar o ponto de vista durante a pausa',
		day: 'O Enforcado traz um intervalo que pode alterar a maneira de enxergar uma situação. Suspender uma tentativa abre outro ângulo; manter tudo parado sem reconhecer o custo da espera transforma a pausa numa prisão silenciosa.',
		love: 'O Enforcado aproxima o amor da diferença entre conceder tempo e desaparecer das próprias necessidades. Ceder pode esclarecer outro ponto de vista; esperar indefinidamente que o vínculo mude sozinho torna esse cuidado desigual.',
		question:
			'O Enforcado sugere suspender a resposta habitual para enxergar o que ela deixa de fora. A pausa ganha sentido se modifica a compreensão; permanecer nela apenas para evitar uma perda conserva a dificuldade sem lhe dar saída.'
	},
	'major-13': {
		title: 'Soltar uma forma que perdeu lugar',
		day: 'A Morte aproxima o dia de um encerramento que abre espaço para reorganizar a vida prática. Concluir uma etapa ou abandonar um hábito muda a distribuição da atenção; apagar tudo de uma vez pode descartar também o aprendizado.',
		love: 'A Morte destaca as formas de se relacionar que deixaram de caber no presente. Uma mudança pode atingir um acordo ou uma expectativa, sem determinar o fim do vínculo; preservar tudo para evitar a perda impede outra forma de encontro.',
		question:
			'A Morte dá peso ao que precisa deixar de ser sustentado para que a situação se transforme. Encerrar uma forma não exige negar o que ela significou; insistir em preservá-la inteira pode tornar a mudança mais dolorosa.'
	},
	'major-14': {
		title: 'Ajustar sem apagar as diferenças',
		day: 'A Temperança favorece dosar esforços e fazer pequenas adaptações entre uma atividade e outra. Um ritmo possível se constrói por ajustes; tentar equilibrar tudo ao mesmo tempo pode esconder uma carga que precisa ser reduzida.',
		love: 'A Temperança aproxima o afeto da convivência entre ritmos diferentes. Ceder um pouco e pedir um ajuste pode criar intimidade; chamar de equilíbrio uma situação em que só você se adapta deixa a diferença sem negociação.',
		question:
			'A Temperança propõe aproximar necessidades que parecem incompatíveis por meio de ajustes graduais. A solução pode crescer sem uma ruptura imediata; conciliar a qualquer preço, porém, mantém intacta a condição que está pesando demais.'
	},
	'major-15': {
		title: 'Desejo e liberdade no mesmo encontro',
		day: 'O Diabo destaca algo que atrai justamente por oferecer satisfação imediata. Reconhecer esse desejo permite lidar com seu preço; repetir o gesto apenas para aliviar a tensão pode reduzir a liberdade de escolher outra resposta.',
		love: 'O Diabo aproxima intensidade, prazer e o medo de perder o que o encontro oferece. A atração pode ser vivida com liberdade para recusar; quando a gratificação passa a comandar os acordos, dizer não começa a parecer uma ameaça ao vínculo.',
		question:
			'O Diabo coloca em primeiro plano o que torna uma opção difícil de largar. Reconhecer o prazer e a vantagem ajuda a enxergar também seu preço; escolher sob medo de perder essa recompensa pode estreitar suas alternativas.'
	},
	'major-16': {
		title: 'Rever o que a tensão deixou visível',
		day: 'A Torre destaca uma estrutura que não consegue mais esconder suas fragilidades. Um contratempo pode mostrar o que precisa de reparo; reagir destruindo tudo amplia o desgaste e dificulta reconhecer o que ainda merece ser preservado.',
		love: 'A Torre aproxima o amor do momento em que uma expectativa já não sustenta o encontro. Dizer o que deixou de funcionar pode ser desconfortável e necessário; transformar essa diferença num ataque dificulta reconstruir qualquer confiança.',
		question:
			'A Torre pede levar a sério a fragilidade que uma crise tornou visível. A escolha ganha clareza ao separar o que precisa mudar do que pode ser reparado; uma reação total pode cobrar mais do que a mudança necessária.'
	},
	'major-17': {
		title: 'Recuperar a confiança em gestos pequenos',
		day: 'A Estrela dá lugar a um cuidado simples que devolve disposição depois do desgaste. Retomar algo possível pode renovar a confiança; esperar que a esperança resolva tudo sozinha deixa sem alimento aquilo que você gostaria de ver crescer.',
		love: 'A Estrela aproxima a intimidade da possibilidade de estar presente sem se defender de tudo. Compartilhar um desejo pode renovar o encontro; confiar não exige ignorar os gestos que mostram se há cuidado recíproco.',
		question:
			'A Estrela favorece um caminho que devolva confiança por meio de cuidados possíveis. Uma expectativa pode orientar a escolha, mas precisa de participação; apostar apenas num futuro ideal distancia a esperança das condições que a sustentariam.'
	},
	'major-18': {
		title: 'Dar tempo ao que ainda está pouco claro',
		day: 'A Lua amplia a sensibilidade aos sinais e às impressões do dia. Uma sensação merece atenção sem precisar virar certeza imediatamente; cansaço, desejo e receio podem dar ao mesmo detalhe significados muito diferentes.',
		love: 'A Lua aproxima o amor daquilo que você imagina quando falta clareza no encontro. O receio de perder ou o desejo de ser escolhido pode preencher um silêncio; perguntar diretamente ajuda a distinguir essa imagem da resposta da outra pessoa.',
		question:
			'A Lua indica uma escolha atravessada por informação incompleta e emoções que ampliam seus efeitos. Dar tempo para esclarecer um detalhe pode mudar o quadro; tratar a impressão mais intensa como prova torna a incerteza mais difícil de atravessar.'
	},
	'major-19': {
		title: 'Estar presente no que pode ser compartilhado',
		day: 'O Sol aproxima o dia de uma satisfação simples que pode ser vivida e compartilhada. Dar visibilidade a uma realização fortalece o ânimo; exigir entusiasmo o tempo todo impede que o cansaço também encontre espaço.',
		love: 'O Sol destaca a alegria de estar junto e poder se mostrar com mais clareza. Compartilhar algo bom pode aproximar vocês; a intimidade ganha consistência quando também admite o dia difícil, sem exigir que o encontro pareça sempre perfeito.',
		question:
			'O Sol favorece uma escolha que possa ser assumida com clareza e participação. Aquilo que traz vitalidade merece lugar, mas não elimina dificuldades; reconhecer um limite preserva a alegria de uma promessa maior do que ela pode cumprir.'
	},
	'major-20': {
		title: 'Responder ao passado de outra maneira',
		day: 'O Julgamento destaca algo vivido que pode ganhar uma resposta nova. Retomar uma conversa ou reconhecer um erro abre continuidade; revisar a história apenas para se absolver ou se condenar repete o impasse.',
		love: 'O Julgamento aproxima o amor de uma conversa que revê o que aconteceu e o que mudou. Uma retomada pede uma resposta diferente aos mesmos problemas; saudade ou arrependimento, sozinhos, não mostram como o encontro seria sustentado agora.',
		question:
			'O Julgamento liga a escolha ao aprendizado que uma experiência deixou. Reconhecer sua parte permite responder de outra forma; buscar um veredito definitivo sobre quem você foi pode adiar o gesto que começa a mudar a situação.'
	},
	'major-21': {
		title: 'Reconhecer uma etapa inteira',
		day: 'O Mundo favorece concluir e reconhecer o percurso que tornou algo possível. Dar acabamento a uma tarefa libera atenção para o próximo passo; procurar o encerramento perfeito pode impedir que uma realização encontre seu lugar.',
		love: 'O Mundo aproxima o amor de um vínculo que encontra lugar entre outras partes da vida. Compartilhar projetos pode ampliar o encontro; esperar que uma relação complete tudo deixa pouco espaço para a autonomia de cada pessoa.',
		question:
			'O Mundo dá valor ao que já pode ser integrado como etapa concluída. Uma escolha nova parte desse percurso, sem precisar repeti-lo; esperar uma sensação de completude sem falhas pode manter o próximo começo distante.'
	},
	'wands-1': {
		title: 'Uma vontade que merece um primeiro gesto',
		day: 'O Ás de Paus destaca uma vontade que ainda está procurando forma. Um primeiro gesto pode dar corpo ao entusiasmo; abrir várias frentes ao mesmo tempo dispersa a energia antes que alguma delas encontre continuidade.',
		love: 'O Ás de Paus aproxima o amor da atração e da coragem de iniciar uma conversa. Esse impulso pode abrir o encontro, mas ainda precisa de convivência; a intensidade do começo não esclarece por si o compromisso possível.',
		question:
			'O Ás de Paus favorece começar por uma tentativa que coloque o desejo em movimento. A energia inicial mostra interesse, não garante sustentação; escolher também envolve reservar espaço para o que vem depois da estreia.'
	},
	'wands-2': {
		title: 'Olhar além sem adiar a partida',
		day: 'O Dois de Paus permite olhar a rotina de certa distância e imaginar outra direção. Planejar amplia as possibilidades; continuar comparando cenários sem um primeiro contato mantém o novo apenas no campo da vontade.',
		love: 'O Dois de Paus aproxima o afeto da distância entre imaginar uma vida a dois e participar do encontro presente. Falar de desejos amplia o horizonte; um projeto comum precisa admitir as escolhas reais das duas pessoas.',
		question:
			'O Dois de Paus coloca lado a lado a segurança do conhecido e uma possibilidade ainda distante. Planejar ajuda a medir o passo; uma pequena aproximação com a alternativa ensina algo que nenhuma comparação imaginada consegue oferecer.'
	},
	'wands-3': {
		title: 'Acompanhar o que começou a se expandir',
		day: 'O Três de Paus destaca o momento de acompanhar a resposta a algo que você iniciou. A expansão pede presença além do lançamento; assumir mais do que consegue atender pode tornar uma boa abertura difícil de sustentar.',
		love: 'O Três de Paus aproxima o amor do espaço para ampliar uma experiência em comum. Um plano pode ganhar alcance quando encontra participação; projetar muito adiante sem conversar sobre o presente deixa o encontro atrás da expectativa.',
		question:
			'O Três de Paus favorece ampliar um caminho depois de perceber como ele responde. A abertura tem valor quando há condições de acompanhá-la; crescer mais rápido do que a capacidade de sustentar o percurso pode trocar possibilidade por sobrecarga.'
	},
	'wands-4': {
		title: 'Uma pausa para habitar o que foi construído',
		day: 'O Quatro de Paus dá valor a uma conquista compartilhada e ao lugar em que você pode descansar. Celebrar fortalece os laços que ajudaram a construir; manter uma aparência de harmonia pode esconder um ajuste necessário.',
		love: 'O Quatro de Paus aproxima o amor da alegria de ter um espaço em comum. Um encontro, uma celebração ou um ritual cotidiano pode fortalecer o vínculo; a sensação de estabilidade precisa continuar admitindo conversas difíceis.',
		question:
			'O Quatro de Paus destaca a base compartilhada que uma escolha pode fortalecer. O apoio de outras pessoas conta, mas não exige encenar concordância; a estabilidade fica mais confiável quando as diferenças também podem ser recebidas.'
	},
	'wands-5': {
		title: 'Uma diferença que precisa encontrar conversa',
		day: 'O Cinco de Paus aproxima o dia de opiniões e iniciativas que disputam espaço. O atrito pode revelar uma diferença útil; tentar vencer cada intervenção consome a energia que poderia esclarecer a tarefa comum.',
		love: 'O Cinco de Paus destaca o desencontro entre vontades que querem ser ouvidas. A diferença pode tornar o vínculo mais vivo quando encontra conversa; disputar quem deseja do jeito certo transforma o encontro numa competição.',
		question:
			'O Cinco de Paus mostra uma escolha atravessada por interesses diferentes. Dar nome ao conflito ajuda a negociar o que importa; decidir apenas para vencer a disputa pode deixar o problema original sem resposta.'
	},
	'wands-6': {
		title: 'Receber reconhecimento sem depender dele',
		day: 'O Seis de Paus dá visibilidade a um esforço e ao desejo de ser reconhecido. Compartilhar uma conquista pode fortalecer a confiança; fazer cada gesto para manter uma boa imagem dificulta perceber o que ainda precisa de aprendizado.',
		love: 'O Seis de Paus aproxima o amor do prazer de se sentir visto e valorizado. Reconhecer o outro pode aquecer o encontro; precisar provar o valor da relação para quem está de fora pode afastar vocês da experiência que vivem.',
		question:
			'O Seis de Paus favorece assumir uma conquista e usá-la como confiança para continuar. A aprovação recebida tem valor, mas não decide o próximo passo; preservar a imagem de quem sempre acerta pode impedir uma revisão necessária.'
	},
	'wands-7': {
		title: 'Defender o que importa sem entrar em toda disputa',
		day: 'O Sete de Paus favorece proteger uma prioridade diante de muitas solicitações. Um limite claro preserva energia; responder a qualquer discordância como ataque pode transformar o dia inteiro numa posição de defesa.',
		love: 'O Sete de Paus aproxima o afeto da necessidade de sustentar um limite próprio. Dizer o que você não aceita pode proteger o encontro; tratar toda diferença como ameaça impede ouvir uma necessidade que também merece lugar.',
		question:
			'O Sete de Paus pede reconhecer o que merece ser defendido nessa escolha. Firmeza ajuda a preservar um compromisso; gastar força em todas as frentes pode deixar menos disposição para a questão que realmente importa.'
	},
	'wands-8': {
		title: 'Quando o ritmo acelera',
		day: 'O Oito de Paus aproxima o dia de mensagens, respostas e tarefas que puxam umas às outras. A rapidez ajuda quando a direção está clara; responder a tudo imediatamente pode deixar pouco tempo para compreender o efeito do que acabou de acontecer.',
		love: 'O Oito de Paus traz ao amor o ritmo das mensagens, dos convites e das respostas que puxam a próxima conversa. A rapidez pode tornar o encontro espontâneo, mas deixar pouco tempo para perceber se vocês acompanham o mesmo passo. Uma troca frequente, sozinha, não esclarece o que cada pessoa espera.',
		question:
			'O Oito de Paus indica uma decisão cujo ritmo pode encurtar o tempo de revisão. Agilidade aproveita uma direção já combinada; quando ainda falta entendimento, acelerar as respostas pode aumentar a distância entre agir e compreender suas consequências.'
	},
	'wands-9': {
		title: 'Um limite que permita recuperar o fôlego',
		day: 'O Nove de Paus reconhece o esforço acumulado e a necessidade de proteger o que ainda precisa de você. Fazer uma pausa não apaga a persistência; continuar em alerta depois que a pressão passou pode conservar o desgaste.',
		love: 'O Nove de Paus aproxima o amor da cautela de quem não quer voltar a se machucar. Um limite pode tornar o contato possível; exigir que o encontro prove segurança a cada gesto mantém a defesa sempre ocupando a frente.',
		question:
			'O Nove de Paus dá valor à experiência que permite reconhecer um limite. Persistir pode fazer sentido, desde que inclua recuperação; usar todo o fôlego para se defender deixa pouca margem para perceber uma condição diferente.'
	},
	'wands-10': {
		title: 'O peso que pode ser dividido',
		day: 'O Dez de Paus destaca compromissos que se acumularam até tornar o avanço pesado. Concluir algo pode aliviar mais do que aceitar outra tarefa; carregar tudo sozinho dificulta separar responsabilidade de uma exigência que já pode ser renegociada.',
		love: 'O Dez de Paus aproxima o afeto do trabalho de sustentar o encontro. Cuidar da relação exige gestos, mas fazer por duas pessoas pode transformar dedicação em ressentimento; dividir uma responsabilidade devolve ao outro a possibilidade de participar.',
		question:
			'O Dez de Paus coloca na escolha o peso do que já está assumido. Mais uma responsabilidade pode caber apenas com redistribuição; aceitar tudo para provar capacidade pode tornar inviável o compromisso que você desejava honrar.'
	},
	'wands-11': {
		title: 'Aprender seguindo uma curiosidade',
		day: 'O Pajem de Paus favorece experimentar uma ideia antes de exigir de si um resultado maduro. A curiosidade aprende no contato; abandonar a tentativa quando ela deixa de ser novidade impede descobrir o que poderia crescer ali.',
		love: 'O Pajem de Paus aproxima o amor de um convite curioso e ainda pouco definido. A leveza pode abrir conversa; o encanto de descobrir alguém pede espaço para aprender, além de buscar continuamente a emoção de um novo começo.',
		question:
			'O Pajem de Paus favorece uma exploração que ensine algo sobre a possibilidade escolhida. Entusiasmo ajuda a começar; aceitar a fase em que tudo ainda exige prática permite diferenciar um interesse vivo de uma novidade passageira.'
	},
	'wands-12': {
		title: 'Coragem que admite ajuste de rota',
		day: 'O Cavaleiro de Paus traz disposição para sair da inércia e fazer uma tentativa. A coragem pode desbloquear o dia; avançar sem ouvir uma informação nova transforma a energia de começar em retrabalho.',
		love: 'O Cavaleiro de Paus aproxima o amor de uma iniciativa calorosa e ousada. O impulso pode criar um encontro vivo; sustentar essa aproximação exige também ouvir o ritmo do outro quando ele difere da sua vontade de avançar.',
		question:
			'O Cavaleiro de Paus favorece agir quando a hesitação está ocupando todo o espaço. A iniciativa ganha consistência se admitir correção; mudar de direção a cada entusiasmo pode impedir que uma escolha revele suas possibilidades reais.'
	},
	'wands-13': {
		title: 'Uma presença que também abre espaço',
		day: 'A Rainha de Paus destaca a confiança de se envolver com aquilo que anima você. Essa presença pode estimular outras pessoas; ocupar todas as iniciativas para manter o entusiasmo reduz o espaço para contribuições diferentes.',
		love: 'A Rainha de Paus aproxima o amor do prazer de se mostrar e desejar com confiança. A presença pode convidar ao encontro; reciprocidade cresce quando a admiração por você também deixa espaço para a expressão da outra pessoa.',
		question:
			'A Rainha de Paus favorece uma escolha em que você possa participar com desejo e presença. A confiança anima o caminho; transformá-la na obrigação de sustentar o entusiasmo de todos pode apagar suas próprias necessidades.'
	},
	'wands-14': {
		title: 'Dar direção sem fechar a conversa',
		day: 'O Rei de Paus favorece reunir iniciativas em torno de uma direção clara. Assumir a condução pode destravar uma tarefa; ter certeza do destino não dispensa ouvir quem conhece dificuldades que você ainda não viu.',
		love: 'O Rei de Paus aproxima o amor de uma vontade capaz de assumir um projeto. Clareza sobre o que deseja facilita o encontro; conduzir os planos sem negociar pode deixar a outra pessoa apenas acompanhando uma vida já decidida.',
		question:
			'O Rei de Paus dá peso à capacidade de assumir uma direção e mobilizar recursos. A visão precisa admitir respostas diferentes para se realizar; confundir liderança com ter sempre razão pode isolar você das condições do próprio projeto.'
	},
	'cups-1': {
		title: 'Receber o que começa a ser sentido',
		day: 'O Ás de Copas abre espaço para uma emoção que merece ser acolhida antes de virar explicação. Um gesto de cuidado pode renovar a disposição; transformar esse começo numa expectativa completa exige dele mais do que ainda pode oferecer.',
		love: 'O Ás de Copas aproxima o amor da disponibilidade para sentir e receber afeto. Uma abertura pode ser preciosa sem já definir uma relação; cuidar desse começo inclui respeitar o tempo necessário para que a reciprocidade se mostre.',
		question:
			'O Ás de Copas favorece uma escolha que dê lugar ao que está começando a mobilizar você. A emoção revela valor, mas ainda pede contato e tempo; tomar a intensidade inicial como compromisso pronto pode antecipar uma certeza frágil.'
	},
	'cups-2': {
		title: 'Encontrar uma resposta do outro lado',
		day: 'O Dois de Copas destaca uma troca em que escutar e responder têm o mesmo valor. Um acordo pequeno pode aproximar; concordar depressa para preservar a simpatia deixa uma diferença importante fora da conversa.',
		love: 'O Dois de Copas aproxima o amor do reconhecimento entre duas pessoas que podem se responder. A reciprocidade não exige desejar tudo do mesmo modo; o encontro ganha intimidade quando a diferença também pode ser dita sem retirar o cuidado.',
		question:
			'O Dois de Copas dá à escolha a medida de uma parceria possível. Há valor em construir uma resposta com alguém; a concordância ajuda quando nasce da escuta, em vez de servir apenas para evitar uma diferença.'
	},
	'cups-3': {
		title: 'Afeto que circula entre pessoas',
		day: 'O Três de Copas aproxima o dia de uma convivência que pode devolver leveza. Compartilhar uma alegria fortalece o apoio; depender do clima do grupo para dizer o que sente pode deixar uma necessidade pessoal sem lugar.',
		love: 'O Três de Copas traz ao amor a amizade, o prazer da companhia e os laços em volta do casal. Essa rede pode ampliar o encontro; viver para manter a aprovação de todos dificulta preservar a conversa íntima de vocês.',
		question:
			'O Três de Copas favorece uma escolha que possa contar com troca e apoio. A companhia ajuda a sustentar um passo; seguir o entusiasmo do grupo sem ouvir a própria vontade pode confundir pertencimento com concordância.'
	},
	'cups-4': {
		title: 'Distinguir desinteresse de cansaço',
		day: 'O Quatro de Copas destaca uma disposição mais recolhida diante do que é oferecido. Uma pausa pode esclarecer o que perdeu sentido; recusar tudo por cansaço pode fechar também uma possibilidade que merecia outro olhar.',
		love: 'O Quatro de Copas aproxima o amor da dificuldade de receber quando algo por dentro já está saturado. Dizer que precisa de espaço torna essa diferença conversável; esperar que o outro adivinhe sua ausência pode aprofundar o desencontro.',
		question:
			'O Quatro de Copas pede distinguir uma opção sem interesse de um momento em que nada parece alcançar você. A pausa ajuda a perceber essa diferença; decidir apenas para afastar o incômodo pode descartar algo antes de compreendê-lo.'
	},
	'cups-5': {
		title: 'Reconhecer a perda sem perder todo o apoio',
		day: 'O Cinco de Copas dá lugar à frustração com algo que não correspondeu ao esperado. Reconhecer a falta permite cuidar dela; deixar que ela ocupe toda a atenção pode tornar invisível o apoio que continua disponível.',
		love: 'O Cinco de Copas aproxima o amor da dor por uma expectativa que não se realizou. Há algo a lamentar antes de seguir; reconhecer o que permanece possível não exige minimizar a perda nem reconstruir exatamente a mesma relação.',
		question:
			'O Cinco de Copas indica uma escolha atravessada por desapontamento. Dar nome ao que se perdeu ajuda a não decidir apenas contra essa dor; o apoio ainda disponível pode sustentar um caminho diferente daquele que você imaginou.'
	},
	'cups-6': {
		title: 'Receber o passado sem morar nele',
		day: 'O Seis de Copas aproxima o dia de uma lembrança, um gesto familiar ou uma forma antiga de cuidado. Isso pode trazer conforto; comparar tudo ao que foi vivido pode diminuir o valor de uma experiência nova.',
		love: 'O Seis de Copas traz ao amor a ternura de algo conhecido. A história compartilhada pode aproximar, mas saudade também seleciona lembranças; reencontrar alguém exige conhecer a pessoa presente, além de recuperar a sensação que o passado deixou.',
		question:
			'O Seis de Copas dá peso à memória afetiva que acompanha uma opção. A experiência antiga pode oferecer apoio, mas não garante repetição; separar o que ainda existe do que ficou na lembrança muda a escolha.'
	},
	'cups-7': {
		title: 'Uma possibilidade precisa encontrar o mundo',
		day: 'O Sete de Copas abre muitas imagens do que o dia poderia ser. Imaginar amplia o desejo; escolher uma tentativa pequena ajuda a distinguir o que realmente mobiliza você daquilo que é atraente apenas enquanto permanece distante.',
		love: 'O Sete de Copas aproxima o amor das histórias imaginadas em torno de um encontro. Fantasiar pode revelar desejos seus; conhecer a pessoa exige permitir que os gestos reais modifiquem a imagem que parecia tão completa.',
		question:
			'O Sete de Copas mostra alternativas cujo encanto pode esconder condições muito diferentes. Um contato concreto com cada possibilidade ajuda a compará-las; escolher pela imagem mais sedutora pode adiar o encontro com seu custo real.'
	},
	'cups-8': {
		title: 'Deixar de insistir no que já não alimenta',
		day: 'O Oito de Copas aproxima o dia de um afastamento que permite recuperar direção. Uma atividade pode continuar funcionando e ainda ter perdido sentido; sair exige reconhecer a falta, além de desejar alívio imediato.',
		love: 'O Oito de Copas destaca a diferença entre conservar a forma de um vínculo e sentir-se presente nele. Reconhecer uma ausência afetiva pode mudar a conversa; o afastamento merece direção para não se tornar apenas fuga da dificuldade.',
		question:
			'O Oito de Copas coloca na escolha o custo de continuar onde algo importante deixou de ser alimentado. Partir pode abrir caminho, mas pede compreender o que falta; buscar outra direção sem nomear essa necessidade pode repetir o desencontro.'
	},
	'cups-9': {
		title: 'Desfrutar sem exigir que a satisfação dure intacta',
		day: 'O Nove de Copas dá lugar ao prazer de reconhecer algo que faz bem. Desfrutar de uma satisfação pode renovar a disposição; tentar prolongá-la a qualquer custo transforma uma alegria possível numa exigência difícil de manter.',
		love: 'O Nove de Copas aproxima o amor da capacidade de desfrutar a própria companhia e o encontro. Um desejo seu merece lugar; esperar que a outra pessoa preserve sempre sua satisfação reduz o espaço para uma troca real.',
		question:
			'O Nove de Copas dá peso à satisfação que uma escolha pode trazer. Reconhecer o que deseja ajuda a assumir o passo; considerar também o que acontece depois desse prazer evita exigir de uma realização que ela resolva tudo.'
	},
	'cups-10': {
		title: 'Pertencer sem precisar parecer perfeito',
		day: 'O Dez de Copas aproxima o dia de laços que oferecem acolhimento e uma sensação de estar em casa. Compartilhar esse cuidado fortalece a convivência; preservar uma imagem feliz pode impedir que uma dificuldade receba ajuda.',
		love: 'O Dez de Copas traz ao amor a vontade de construir uma vida afetiva em comum. O pertencimento cresce nos gestos cotidianos; exigir harmonia constante pode deixar os desejos diferentes de vocês sem lugar dentro desse projeto.',
		question:
			'O Dez de Copas aproxima a escolha dos vínculos e da vida que você deseja compartilhar. Esse horizonte tem valor, mas precisa comportar diferenças; uma imagem ideal de felicidade pode esconder o trabalho de convivência que a sustenta.'
	},
	'cups-11': {
		title: 'Um sentimento ainda aprendendo a falar',
		day: 'O Pajem de Copas dá lugar à sensibilidade e a uma impressão que surpreende você. Um gesto delicado pode iniciar uma conversa; acolher a emoção sem tomar tudo como pessoal permite descobrir melhor o que ela está dizendo.',
		love: 'O Pajem de Copas aproxima o amor da coragem delicada de mostrar um sentimento. Uma mensagem ou um convite pode abrir intimidade; a resposta do outro merece ser ouvida sem transformar cada hesitação numa rejeição completa.',
		question:
			'O Pajem de Copas favorece uma aproximação sensível com o que está começando a importar. Há algo a conhecer antes de formular uma decisão inteira; receber uma resposta diferente pode ampliar essa descoberta, sem invalidar o sentimento inicial.'
	},
	'cups-12': {
		title: 'Uma intenção bonita precisa de presença',
		day: 'O Cavaleiro de Copas aproxima o dia de uma proposta guiada por desejo e imaginação. Dar forma a uma intenção pode encantar; manter o gesto apenas no anúncio deixa a experiência esperando uma presença que não chega.',
		love: 'O Cavaleiro de Copas destaca o encanto de um convite e a disposição de expressar afeto. A beleza do gesto pode aproximar; conhecer o vínculo exige também perceber como a intenção se sustenta depois do momento especial.',
		question:
			'O Cavaleiro de Copas dá à escolha uma direção desejada, ainda atravessada por idealização. A inspiração ajuda a se aproximar; transformar a intenção numa participação regular esclarece o que existe além da promessa que encantou você.'
	},
	'cups-13': {
		title: 'Escutar sem se perder no que recebe',
		day: 'A Rainha de Copas favorece ouvir uma emoção com atenção aos seus matizes. Essa sensibilidade pode acolher alguém; absorver cada tensão em volta como se fosse sua dificulta reconhecer de que cuidado você mesmo precisa.',
		love: 'A Rainha de Copas aproxima o amor da escuta que percebe nuances e acolhe o que ainda está difícil de dizer. A intimidade cresce nesse espaço; compreender o outro não exige silenciar uma necessidade sua para poupar o encontro.',
		question:
			'A Rainha de Copas aproxima a escolha do que você consegue sentir quando escuta com calma. A empatia amplia a compreensão; carregar a emoção de todos pode tornar difícil distinguir seu desejo daquilo que espera oferecer aos outros.'
	},
	'cups-14': {
		title: 'Dar sustentação ao que se sente',
		day: 'O Rei de Copas favorece reconhecer uma emoção e escolher como expressá-la. Essa estabilidade pode dar apoio numa conversa difícil; parecer sempre sereno pode esconder a necessidade de também receber cuidado.',
		love: 'O Rei de Copas aproxima o amor de uma presença capaz de acolher sentimentos sem ser levada por cada oscilação. A confiança cresce com essa constância; não mostrar nunca sua vulnerabilidade pode tornar o cuidado uma via de mão única.',
		question:
			'O Rei de Copas dá peso à capacidade de sustentar uma decisão sem negar o que ela mobiliza. A serenidade ajuda a conversar; usá-la para manter tudo sob controle pode deixar a necessidade principal sem expressão.'
	},
	'swords-1': {
		title: 'Uma diferença que as palavras podem esclarecer',
		day: 'O Ás de Espadas favorece dar nome ao ponto que estava confuso. Uma frase clara pode destravar a tarefa; dizer algo verdadeiro sem considerar a forma pode criar um atrito que desvia a conversa do assunto.',
		love: 'O Ás de Espadas aproxima o amor de uma conversa que separa desejo, expectativa e acordo. Clareza pode aliviar um desencontro; usar a verdade como golpe torna mais difícil receber a resposta que você também precisa ouvir.',
		question:
			'O Ás de Espadas destaca o critério capaz de distinguir alternativas que pareciam misturadas. Nomear a diferença ajuda a decidir; uma conclusão rápida demais pode cortar também informações que mudariam o alcance dessa clareza.'
	},
	'swords-2': {
		title: 'O custo de manter tudo suspenso',
		day: 'O Dois de Espadas destaca uma pausa entre posições difíceis de conciliar. Ganhar tempo pode impedir uma reação precipitada; evitar qualquer contato com a diferença conserva o equilíbrio apenas enquanto nada precisa se mover.',
		love: 'O Dois de Espadas aproxima o amor de um assunto que ficou suspenso para evitar conflito. Esse intervalo pode proteger uma conversa ainda frágil; manter a paz sem falar do que importa pode tornar a distância cada vez mais estável.',
		question:
			'O Dois de Espadas mostra uma escolha mantida em espera para não perder nenhuma das posições. O intervalo ajuda se permite reunir algo novo; quando serve apenas para evitar desconforto, a ausência de decisão começa a decidir por você.'
	},
	'swords-3': {
		title: 'Reconhecer a diferença que doeu',
		day: 'O Três de Espadas dá lugar ao incômodo de perceber algo diferente do que você esperava. Nomear essa dor pode esclarecer uma conversa; revivê-la apenas para provar uma razão mantém a ferida ocupando toda a atenção.',
		love: 'O Três de Espadas aproxima o amor de uma diferença que machuca justamente porque o vínculo importa. Reconhecer a dor pode abrir espaço para reparação; não é preciso concluir que todo o encontro foi falso para admitir o que falhou.',
		question:
			'O Três de Espadas coloca na escolha uma verdade ou diferença difícil de receber. Considerar essa dor impede ignorar um limite; decidir apenas para não senti-la pode encerrar a conversa antes de esclarecer o que ainda pode ser reparado.'
	},
	'swords-4': {
		title: 'Uma pausa que ajude a voltar',
		day: 'O Quatro de Espadas favorece interromper por um momento a sequência de respostas e solicitações. Descansar a atenção pode devolver clareza; afastar tudo indefinidamente transforma a recuperação numa espera sem retorno.',
		love: 'O Quatro de Espadas aproxima o amor da necessidade de baixar a tensão antes de continuar uma conversa. Um intervalo combinado pode proteger o vínculo; sumir sem referência deixa a outra pessoa diante de uma pausa que não sabe quando termina.',
		question:
			'O Quatro de Espadas propõe recuperar atenção antes de decidir sob desgaste. A pausa muda a qualidade da resposta quando permite retornar ao assunto; adiar sem cuidar do cansaço conserva a mesma dificuldade para depois.'
	},
	'swords-5': {
		title: 'O que fica depois de vencer uma disputa',
		day: 'O Cinco de Espadas destaca o preço de insistir em ter a última palavra. Uma vantagem imediata pode deixar a cooperação mais difícil; encerrar uma disputa sem humilhar permite preservar algo que a vitória sozinha não recompõe.',
		love: 'O Cinco de Espadas aproxima o amor de uma disputa em que ganhar pode custar confiança. A necessidade de ser ouvido merece lugar; ferir para provar razão pode deixar vocês sem a proximidade que tornava a conversa importante.',
		question:
			'O Cinco de Espadas pede incluir na escolha o que acontece com os vínculos depois da disputa. Obter uma vantagem pode resolver um ponto e agravar outro; preservar a possibilidade de cooperação muda o significado de vencer.'
	},
	'swords-6': {
		title: 'Uma passagem que não apaga a bagagem',
		day: 'O Seis de Espadas favorece sair de uma situação desgastante por etapas. Um ambiente mais tranquilo pode ajudar a reorganizar o pensamento; mudar de lugar não elimina imediatamente o que ainda precisa ser compreendido.',
		love: 'O Seis de Espadas aproxima o amor de uma transição para condições menos desgastantes. Isso pode envolver outro acordo ou mais distância; atravessar a mudança exige reconhecer a bagagem que continua, em vez de esperar que tudo recomece do zero.',
		question:
			'O Seis de Espadas favorece uma passagem gradual para condições mais habitáveis. A escolha pode reduzir o desgaste sem resolver tudo de uma vez; aceitar essa continuidade ajuda a preparar o percurso, além de desejar chegar ao outro lado.'
	},
	'swords-7': {
		title: 'Uma estratégia precisa poder ser sustentada',
		day: 'O Sete de Espadas favorece buscar uma forma indireta de lidar com um obstáculo. Discrição pode proteger um trabalho ainda em curso; esconder o essencial para evitar conversa cria dificuldades quando outras pessoas precisam participar.',
		love: 'O Sete de Espadas aproxima o amor da diferença entre privacidade e uma evasão que impede acordos. Preservar algo seu pode ser legítimo; contornar sempre o assunto difícil deixa o vínculo sem clareza. Dizer o que você pode compartilhar permite ao outro participar sem depender de adivinhação.',
		question:
			'O Sete de Espadas destaca uma estratégia que evita o enfrentamento direto. Ela pode abrir margem de ação, mas tem custo se depender de esconder informação necessária; um caminho sustentável precisa admitir as consequências de como foi construído.'
	},
	'swords-8': {
		title: 'Uma margem pequena ainda pode fazer diferença',
		day: 'O Oito de Espadas aproxima o dia da sensação de estar sem alternativas. Algumas limitações podem ser reais, enquanto outras crescem com o receio; localizar um passo pequeno ajuda a distinguir essas duas coisas sem exigir uma libertação imediata.',
		love: 'O Oito de Espadas destaca o que torna difícil dizer ou fazer algo dentro de um vínculo. Reconhecer essa restrição merece cuidado; uma margem pequena de expressão pode começar a diferenciar o limite concreto do medo de qualquer resposta.',
		question:
			'O Oito de Espadas mostra uma escolha que parece fechada antes de cada alternativa ser examinada. As restrições precisam ser reconhecidas; distinguir uma condição real de uma conclusão antecipada pode revelar uma margem de ação menor, mas existente.'
	},
	'swords-9': {
		title: 'Dar contorno ao que a preocupação amplia',
		day: 'O Nove de Espadas destaca uma preocupação que continua trabalhando mesmo depois de a tarefa parar. Dar nome ao ponto concreto pode reduzir a dispersão; repetir todos os cenários possíveis mantém a atenção ocupada sem esclarecer o próximo gesto.',
		love: 'O Nove de Espadas aproxima o amor dos pensamentos que ganham força quando falta uma resposta. O medo merece escuta, mas imaginar repetidamente a pior hipótese não revela o sentimento do outro; uma dúvida concreta pode encontrar conversa.',
		question:
			'O Nove de Espadas indica uma escolha tomada sob o peso de cenários temidos. Separar o problema disponível agora das consequências imaginadas devolve proporção; buscar uma decisão que elimine todo receio pode tornar qualquer caminho impossível.'
	},
	'swords-10': {
		title: 'Reconhecer o limite de uma tentativa',
		day: 'O Dez de Espadas aproxima o dia do limite de uma forma de insistir. Parar uma tentativa esgotada permite cuidar do que ficou; concluir que nada mais será possível estende o encerramento para além daquilo que realmente terminou.',
		love: 'O Dez de Espadas destaca uma maneira de se relacionar que chegou ao desgaste extremo. Reconhecer esse limite impede exigir mais do mesmo; a dor de um encerramento não precisa definir todo vínculo futuro nem decidir sozinha o que vem depois.',
		question:
			'O Dez de Espadas coloca na escolha o limite de uma resposta que já não sustenta a situação. Admitir o esgotamento permite interromper a repetição; tomar esse fim como prova de impossibilidade total deixa sem lugar outras formas de continuar.'
	},
	'swords-11': {
		title: 'Uma pergunta que esclarece sem vigiar',
		day: 'O Pajem de Espadas favorece conferir uma informação e fazer uma pergunta precisa. A curiosidade pode evitar um mal-entendido; procurar incoerência em cada detalhe transforma o aprendizado numa vigilância que nunca encontra descanso.',
		love: 'O Pajem de Espadas aproxima o amor da vontade de compreender melhor um gesto ou uma fala. Perguntar pode abrir diálogo; investigar cada sinal como prova contra alguém dificulta receber uma resposta sem suspeita antecipada.',
		question:
			'O Pajem de Espadas favorece uma escolha mais informada por perguntas específicas. Conferir um ponto pode mudar a compreensão; acumular indícios sem estabelecer o que precisa ser esclarecido prolonga a dúvida em vez de trabalhá-la.'
	},
	'swords-12': {
		title: 'Rapidez que ainda consegue escutar',
		day: 'O Cavaleiro de Espadas traz disposição para enfrentar uma pendência e dizer o que precisa ser dito. A rapidez ajuda a destravar; responder antes de compreender a situação pode criar outra urgência no lugar da primeira.',
		love: 'O Cavaleiro de Espadas aproxima o amor da vontade de resolver uma conversa imediatamente. Clareza e coragem têm valor; transformar cada diferença numa conclusão rápida pode atropelar o tempo necessário para que o outro também se expresse.',
		question:
			'O Cavaleiro de Espadas favorece enfrentar diretamente o ponto que estava sendo evitado. A decisão ganha força com clareza; agir como se a primeira compreensão fosse completa pode impedir que uma informação nova corrija a direção.'
	},
	'swords-13': {
		title: 'Clareza que preserve o contato',
		day: 'A Rainha de Espadas favorece distinguir o essencial e comunicar um limite com precisão. A experiência ajuda a poupar rodeios; antecipar toda defesa possível pode tornar a fala mais cortante do que a situação exige.',
		love: 'A Rainha de Espadas aproxima o amor da sinceridade que consegue dizer o que cabe e o que não cabe. Um limite claro protege a intimidade; afastar qualquer vulnerabilidade para não sofrer pode deixar o encontro apenas no plano das condições.',
		question:
			'A Rainha de Espadas favorece uma decisão que reconheça limites e não dependa de promessas vagas. A experiência oferece discernimento; transformar uma decepção passada numa regra para qualquer possibilidade nova pode estreitar demais o caminho.'
	},
	'swords-14': {
		title: 'Um critério que também possa ser revisto',
		day: 'O Rei de Espadas favorece organizar uma decisão por critérios claros e comunicar suas razões. Isso pode tornar um acordo mais justo; aplicar a mesma regra sem ouvir as circunstâncias perde justamente a precisão que pretendia garantir.',
		love: 'O Rei de Espadas aproxima o amor da clareza dos acordos e da capacidade de conversar sem perder o assunto. A razão pode ajudar a atravessar uma diferença; explicar tudo não substitui acolher o efeito emocional do que foi dito.',
		question:
			'O Rei de Espadas dá peso à consistência entre critério, escolha e consequência. Uma decisão fundamentada pode ser sustentada diante de outras pessoas; admitir exceções relevantes torna esse critério mais preciso, sem exigir que ele explique tudo.'
	},
	'pentacles-1': {
		title: 'Uma possibilidade que começa no concreto',
		day: 'O Ás de Ouros destaca uma oportunidade pequena que pode receber forma e continuidade. Separar tempo, material ou atenção permite começar; esperar uma condição abundante antes de usar o que existe pode manter a possibilidade parada.',
		love: 'O Ás de Ouros aproxima o amor de um gesto que torna a presença concreta. Um encontro combinado e cumprido pode valer mais do que uma promessa ampla; a confiança precisa de continuidade para crescer além dessa primeira oferta.',
		question:
			'O Ás de Ouros favorece uma escolha que possa começar com recursos reconhecíveis. A possibilidade ainda precisa ser cultivada; o que está disponível agora ajuda a medir o primeiro passo, sem garantir o resultado de todo o percurso.'
	},
	'pentacles-2': {
		title: 'Ajustar o ritmo entre compromissos',
		day: 'O Dois de Ouros aproxima o dia da necessidade de alternar tarefas sem perder o essencial. Flexibilidade pode acomodar um imprevisto; viver apenas remanejando urgências deixa sem atenção o compromisso que precisa de um lugar mais estável.',
		love: 'O Dois de Ouros destaca o ajuste entre o encontro e outras demandas da vida. Mudar um plano pode ser cuidado quando há conversa; manter o vínculo sempre no espaço que sobra pode transformar flexibilidade em presença incerta.',
		question:
			'O Dois de Ouros dá à escolha a medida do que você consegue conciliar. Um ajuste pode abrir margem, mas exige reconhecer prioridades; prometer disponibilidade para tudo conserva o equilíbrio apenas enquanto nenhuma demanda cresce.'
	},
	'pentacles-3': {
		title: 'Construir com habilidades diferentes',
		day: 'O Três de Ouros favorece uma tarefa em que saberes diferentes podem se complementar. Ouvir uma contribuição melhora o trabalho; depender de aprovação em cada passo pode impedir que você assuma a parte que já conhece.',
		love: 'O Três de Ouros aproxima o amor da construção cotidiana feita por duas pessoas. Dividir tarefas e aprender o jeito do outro pode fortalecer a parceria; cooperação exige espaço para diferenças, além de uma pessoa corrigir continuamente a outra.',
		question:
			'O Três de Ouros favorece uma escolha que reconheça as contribuições necessárias para funcionar. Pedir apoio pode aumentar a qualidade; combinar responsabilidades torna a colaboração mais confiável do que esperar que todos saibam espontaneamente o que fazer.'
	},
	'pentacles-4': {
		title: 'Proteger sem fechar toda passagem',
		day: 'O Quatro de Ouros destaca a necessidade de preservar tempo, energia ou recursos já reunidos. Um limite pode trazer segurança; fechar qualquer possibilidade de circulação dificulta usar justamente aquilo que você desejava proteger.',
		love: 'O Quatro de Ouros aproxima o amor do desejo de conservar um vínculo importante. A estabilidade merece cuidado; tentar assegurá-la controlando cada mudança pode retirar a liberdade que permite continuar escolhendo estar junto.',
		question:
			'O Quatro de Ouros dá peso à segurança do que você já possui ou construiu. Preservar uma base pode ser necessário; escolher apenas para evitar qualquer perda pode manter recursos parados mesmo quando uma parte poderia circular com cuidado.'
	},
	'pentacles-5': {
		title: 'Uma dificuldade não precisa ser atravessada a sós',
		day: 'O Cinco de Ouros aproxima o dia da sensação de faltar apoio ou margem para atender a tudo. Reconhecer a dificuldade permite localizar ajuda possível; esconder a necessidade por vergonha pode tornar o percurso ainda mais solitário.',
		love: 'O Cinco de Ouros destaca a experiência de se sentir pouco amparado num momento difícil. Essa falta merece ser dita com clareza; compartilhar uma necessidade pode revelar apoio, enquanto esperar que ela seja adivinhada conserva a distância.',
		question:
			'O Cinco de Ouros coloca na escolha os limites de recurso e apoio disponíveis. Eles precisam ser considerados sem diminuir seu valor; admitir uma necessidade pode abrir uma ajuda que a tentativa de resolver tudo sozinho deixava inacessível.'
	},
	'pentacles-6': {
		title: 'Uma troca que preserve a dignidade',
		day: 'O Seis de Ouros destaca a circulação de ajuda entre quem pode oferecer e quem precisa receber. Um apoio pode aliviar o dia; deixar seu preço implícito transforma um gesto generoso numa obrigação que só aparece depois.',
		love: 'O Seis de Ouros aproxima o amor do equilíbrio entre oferecer cuidado e poder recebê-lo. As contribuições podem ser diferentes; quando uma pessoa passa a decidir tudo porque oferece mais, a ajuda começa a pesar sobre a liberdade do vínculo.',
		question:
			'O Seis de Ouros dá à escolha a medida das trocas que ela estabelece. Receber apoio pode tornar um caminho possível; esclarecer expectativas preserva a reciprocidade e permite distinguir uma contribuição livre de uma dívida sem acordo.'
	},
	'pentacles-7': {
		title: 'Esperar também pede reconhecer o que cresce',
		day: 'O Sete de Ouros favorece acompanhar um esforço que ainda não entregou tudo o que você espera. Uma pausa para ajustar o cuidado pode ajudar; medir cada avanço como resultado final torna o amadurecimento uma frustração contínua.',
		love: 'O Sete de Ouros aproxima o amor do tempo necessário para uma confiança se formar. A dedicação pode criar raízes, mas precisa encontrar resposta; continuar apenas porque já investiu muito pode esconder a ausência de crescimento no presente.',
		question:
			'O Sete de Ouros destaca a diferença entre um processo que precisa de tempo e uma espera mantida pelo investimento passado. Reconhecer sinais de desenvolvimento ajuda a ajustar o caminho; o esforço acumulado, sozinho, não obriga a continuar.'
	},
	'pentacles-8': {
		title: 'Melhorar no contato com a prática',
		day: 'O Oito de Ouros favorece dedicar atenção a uma tarefa e perceber como fazê-la melhor. A repetição pode desenvolver habilidade; aperfeiçoar um detalhe indefinidamente pode consumir o tempo de concluir e colocar o trabalho em uso.',
		love: 'O Oito de Ouros aproxima o amor dos pequenos cuidados que se aprendem na convivência. Uma atenção repetida pode construir confiança; tratar o vínculo como algo a corrigir continuamente deixa pouco espaço para o prazer de estar junto.',
		question:
			'O Oito de Ouros favorece uma escolha que admita aprendizagem e dedicação regular. O avanço vem do contato com a prática; exigir domínio antes de começar ou perfeição antes de concluir pode interromper justamente esse desenvolvimento.'
	},
	'pentacles-9': {
		title: 'Desfrutar de uma autonomia construída',
		day: 'O Nove de Ouros dá valor ao conforto e à autonomia que um cuidado continuado pode oferecer. Desfrutar do que foi construído também faz parte do dia; provar independência a todo instante pode impedir receber uma companhia desejada.',
		love: 'O Nove de Ouros aproxima o amor da capacidade de estar junto sem abandonar um espaço próprio. A autonomia pode tornar a escolha mais livre; proteger tão rigidamente a própria rotina pode impedir a proximidade que você também deseja.',
		question:
			'O Nove de Ouros dá peso à autonomia que uma escolha preserva ou amplia. Há valor em sustentar o próprio espaço; considerar as trocas que você deseja receber evita transformar independência numa obrigação de nunca precisar de ninguém.'
	},
	'pentacles-10': {
		title: 'O que sustenta a vida em comum',
		day: 'O Dez de Ouros volta a atenção para o que se mantém com apoio compartilhado: uma casa, um acordo, um trabalho acumulado. Dividir uma tarefa ou transmitir um jeito de fazer pode valer mais do que iniciar outra coisa sozinho. Preservar essa base também inclui ajustar hábitos que ficaram pesados.',
		love: 'O Dez de Ouros aproxima o amor da vida que se constrói em meio a família, casa e responsabilidades compartilhadas. Esse chão pode dar apoio ao encontro; seguir expectativas herdadas sem conversar pode deixar os desejos de vocês fora do próprio projeto.',
		question:
			'O Dez de Ouros coloca na escolha a continuidade de algo que envolve mais de uma pessoa. A base existente oferece apoio e também traz regras; preservar o que tem valor pode exigir mudar a maneira como tarefas, recursos e decisões são transmitidos.'
	},
	'pentacles-11': {
		title: 'Aprender dando um lugar à tentativa',
		day: 'O Pajem de Ouros favorece aprender algo pelo contato paciente com uma tarefa pequena. Reservar um momento e um material dá consistência ao interesse; preparar-se sem nunca experimentar adia a descoberta de como você realmente aprende.',
		love: 'O Pajem de Ouros aproxima o amor de uma disposição cuidadosa para conhecer o outro. Cumprir um pequeno combinado pode iniciar confiança; querer oferecer a segurança de uma relação pronta antes da convivência coloca peso demais no começo.',
		question:
			'O Pajem de Ouros favorece começar uma escolha pelo aprendizado de suas condições concretas. Uma tentativa pequena esclarece tempo e dificuldade; acumular preparação sem contato com a prática mantém a possibilidade distante, mesmo quando parece prudência.'
	},
	'pentacles-12': {
		title: 'Um ritmo que consiga continuar',
		day: 'O Cavaleiro de Ouros favorece dar continuidade ao que precisa de constância. Um passo regular pode aliviar a dispersão; repetir o mesmo procedimento sem perceber uma mudança de condição transforma cuidado em lentidão desnecessária.',
		love: 'O Cavaleiro de Ouros aproxima o amor da presença confiável nos compromissos cotidianos. A constância pode dar segurança; fazer sempre tudo do mesmo jeito sem ouvir um desejo novo pode tornar o encontro estável e pouco vivo.',
		question:
			'O Cavaleiro de Ouros dá peso à possibilidade de sustentar a escolha depois do entusiasmo inicial. Regularidade ajuda a atravessar o percurso; revisar um hábito quando as condições mudam preserva a direção sem exigir rigidez em cada passo.'
	},
	'pentacles-13': {
		title: 'Cuidado que também inclua quem cuida',
		day: 'A Rainha de Ouros favorece tornar o cotidiano mais habitável com cuidados concretos. Organizar uma necessidade pode devolver conforto; atender tudo em volta sem reservar recursos para você torna difícil sustentar a própria generosidade.',
		love: 'A Rainha de Ouros aproxima o amor do cuidado que aparece em presença, conforto e atenção às necessidades reais. Esse acolhimento pode nutrir o vínculo; fazer tudo para ser necessário deixa pouco espaço para receber cuidado de volta.',
		question:
			'A Rainha de Ouros favorece uma escolha que caiba na vida e cuide de suas condições de continuidade. O bem-estar de outras pessoas tem valor; incluir suas próprias necessidades permite sustentar esse cuidado sem transformá-lo em esgotamento.'
	},
	'pentacles-14': {
		title: 'Administrar uma base sem se confundir com ela',
		day: 'O Rei de Ouros favorece administrar recursos e responsabilidades com atenção ao que precisa durar. A experiência pode dar estabilidade; concentrar todas as decisões em você torna a base dependente de uma única presença.',
		love: 'O Rei de Ouros aproxima o amor da segurança construída por presença e responsabilidade. Oferecer estabilidade pode ser cuidado; decidir pelo outro por acreditar saber o que é melhor transforma o apoio numa condição de dependência.',
		question:
			'O Rei de Ouros dá peso à capacidade de sustentar uma escolha com recursos e responsabilidade. Uma base estável amplia as possibilidades; compartilhar decisões e conhecimento evita que a continuidade dependa apenas do controle de uma pessoa.'
	}
};
