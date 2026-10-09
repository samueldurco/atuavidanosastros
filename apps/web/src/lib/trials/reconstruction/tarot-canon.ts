/** Compiled from the owner's Livro 19, chapters 3–7. No runtime search or external model.
 * Mechanisms are retained; position, focus and combinations are authored in tarot.ts. */
export const TAROT_CANON_VERSION = 'atv-rws-interpretive-canon/1.0.0';
export const TAROT_CANON_SOURCE_SHA256 =
	'0390dc4eab1c1dd57dfe3313c05f1675de88e03fe4a210ad8c4331eb6c24544c';
export type TarotMeaning = {
	name: string;
	core: string;
	resource: string;
	excess: string;
	action: string;
	relationship: string;
	work: string;
	sourceLine: number;
};
export const tarotCanon: Readonly<Record<string, TarotMeaning>> = {
	'major-0': {
		name: 'O Louco',
		core: 'disponibilidade para entrar num campo sem conhecer toda a rota; margem entre abertura real e falta de cálculo',
		resource:
			'curiosidade, mobilidade, coragem para começar com informação incompleta, capacidade de não carregar uma identidade antiga como condição para cada passo',
		excess:
			'improviso usado para fugir de consequência, ingenuidade voluntária, recusa de compromisso, romantização do risco ou dispersão que chama toda interrupção de liberdade',
		action:
			'perguntar qual risco é realmente necessário para descobrir algo e qual risco só evita preparação; começar pequeno pode preservar a abertura sem transformar incerteza em irresponsabilidade',
		relationship:
			'pode descrever vínculo que começa sem forma definida, desejo de experimentar outra maneira de se relacionar ou necessidade de retirar expectativas prematuras; em excesso, indefinição vira assimetria se apenas uma pessoa pensa que existe compromisso',
		work: 'favorece protótipo, mudança de campo, começo exploratório e aprendizagem por contato; é frágil quando o custo de errar é alto e ninguém definiu limite, reserva ou responsabilidade',
		sourceLine: 1884
	},
	'major-1': {
		name: 'O Mago',
		core: 'transformar possibilidade em operação por habilidade, seleção de recursos e direção consciente',
		resource:
			'iniciativa competente, linguagem adequada ao contexto, capacidade de combinar ferramentas, aprender rapidamente e produzir um efeito verificável',
		excess:
			'performance sem substância, manipulação de percepção, habilidade usada para concentrar poder, promessa maior que entrega ou necessidade de parecer capaz antes de compreender o problema',
		action: 'identificar o que já está disponível e qual ação mínima comprova capacidade',
		relationship:
			'pode indicar iniciativa, conversa que muda a dinâmica, sedução pela presença e pela linguagem ou habilidade de construir encontro; em sombra, charme vira gestão da percepção e a relação depende mais do efeito produzido que da reciprocidade',
		work: 'é forte em lançamento, apresentação, negociação, ofício e qualquer situação em que recursos diferentes precisam ser articulados',
		sourceLine: 1912
	},
	'major-2': {
		name: 'A Sacerdotisa',
		core: 'informação que existe antes de estar disponível para exposição; leitura de sinais, reserva e diferença entre silêncio fértil e silêncio usado para ocultar poder',
		resource:
			'observação, capacidade de esperar dado suficiente, escuta, percepção de nuance, proteção de informação sensível e tolerância ao que ainda não pode ser concluído',
		excess:
			'mistificação, passividade travestida de profundidade, segredo usado para controlar relação, recusa de perguntar diretamente ou transformar falta de evidência em certeza intuitiva',
		action: 'distinguir o que realmente precisa amadurecer do que está sendo adiado por medo',
		relationship:
			'pode indicar vínculo em que parte importante ainda não foi verbalizada, intimidade protegida ou necessidade de respeitar tempo de elaboração; não autoriza afirmar que alguém guarda segredo específico sem evidência',
		work: 'favorece pesquisa, confidencialidade, leitura de contexto e preparação antes de anúncio',
		sourceLine: 1940
	},
	'major-3': {
		name: 'A Imperatriz',
		core: 'capacidade de produzir, nutrir e dar forma sensorial a algo que precisa de tempo, recurso e ambiente favorável',
		resource:
			'cultivo, prazer sem culpa, cuidado material, criatividade que encontra corpo, generosidade com limite e competência para tornar um espaço habitável ou uma ideia fértil',
		excess:
			'cuidado invasivo, excesso de conforto que impede movimento, produção ligada à necessidade de ser indispensável, gasto para preencher vazio ou confusão entre nutrir e controlar',
		action: 'avaliar que condições materiais permitem que algo cresça',
		relationship:
			'pode falar de afeto expresso em presença, toque, alimento, tempo e cuidado concreto',
		work: 'é forte em criação, hospitalidade, design, cuidado, produção e projetos que exigem desenvolvimento orgânico',
		sourceLine: 1968
	},
	'major-4': {
		name: 'O Imperador',
		core: 'estrutura que define fronteira, responsabilidade e autoridade suficiente para manter um sistema operando',
		resource:
			'governança clara, capacidade de decidir, assumir consequência, criar regra proporcional e proteger estrutura sem depender de improviso constante',
		excess:
			'controle por medo de instabilidade, regra sem revisão, centralização, autoridade que não admite feedback ou identidade construída sobre nunca demonstrar incerteza',
		action:
			'perguntar quem possui mandato, qual regra existe e que consequência acompanha a escolha',
		relationship: 'pode indicar necessidade de acordo explícito, estabilidade e fronteiras',
		work: 'é forte em governança, gestão, propriedade, processos e definição de escopo',
		sourceLine: 1996
	},
	'major-5': {
		name: 'O Hierofante',
		core: 'conhecimento transmitido por instituição, tradição, método ou comunidade que define linguagem comum e critérios de pertencimento',
		resource:
			'aprendizagem com fontes, acesso a tradição acumulada, mentoria, rito de passagem, método compartilhado e capacidade de receber conhecimento antes de reinventá-lo',
		excess:
			'dogma, obediência sem exame, autoridade protegida pelo prestígio da instituição, exclusão de quem não domina código ou repetição de forma depois que a função morreu',
		action: 'identificar que regra ou tradição está sendo usada e se ela ainda cumpre sua função',
		relationship:
			'pode indicar formalização, valores compartilhados, expectativas sociais ou necessidade de discutir que modelo de compromisso está sendo adotado',
		work: 'favorece certificação, instituições, ensino, processos regulados e culturas profissionais com linguagem própria',
		sourceLine: 2024
	},
	'major-6': {
		name: 'Os Enamorados',
		core: 'escolha que revela valor porque relacionar-se exige excluir alternativas, declarar posição e aceitar que reciprocidade não elimina diferença',
		resource:
			'aliança consciente, desejo assumido, capacidade de escolher por valor e não apenas por pressão, intimidade que suporta exposição e diferença',
		excess:
			'indecisão alimentada pelo desejo de preservar todas as opções, fusão, terceirização da escolha ao parceiro ou idealização de uma compatibilidade que evita negociação',
		action: 'nomear o valor que cada opção protege e o custo que cada uma cria',
		relationship: 'é naturalmente relevante a vínculos, mas não promete união',
		work: 'pode descrever parceria, escolha entre caminhos, alinhamento entre valores e função ou decisão que não pode ser tratada apenas como cálculo financeiro',
		sourceLine: 2054
	},
	'major-7': {
		name: 'O Carro',
		core: 'movimento sustentado pela capacidade de coordenar forças que não desejam exatamente a mesma coisa',
		resource:
			'direção, decisão em movimento, capacidade de proteger foco, administrar tensões e avançar sem esperar que todos os impulsos se tornem idênticos',
		excess:
			'pressa convertida em identidade, controle excessivo, vitória que exige negar conflito interno ou direção mantida apenas porque parar pareceria fracasso',
		action: 'escolher direção e criar mecanismo para corrigir rota',
		relationship:
			'pode indicar relação atravessando mudança, necessidade de coordenar ritmos ou decisão de avançar com acordo',
		work: 'favorece execução, logística, competição e projetos que já possuem recursos em movimento',
		sourceLine: 2082
	},
	'major-8': {
		name: 'A Força',
		core: 'regular intensidade sem destruí-la; transformar potência bruta em capacidade utilizável por presença, vínculo e medida',
		resource:
			'coragem que não precisa humilhar, autocontrole flexível, capacidade de permanecer em contato com desejo ou raiva sem ser governado por eles',
		excess:
			'repressão apresentada como autocontrole, necessidade de provar domínio, tolerância excessiva em nome de serenidade ou explosão depois de longo bloqueio',
		action: 'perguntar qual intensidade precisa ser contida, expressa ou canalizada',
		relationship:
			'pode mostrar atração forte que precisa de confiança e regulação, capacidade de atravessar conflito sem violência ou necessidade de não confundir paciência com suportar tudo',
		work: 'é útil em liderança sob pressão, negociação difícil e projetos que exigem ritmo sustentável',
		sourceLine: 2112
	},
	'major-9': {
		name: 'O Eremita',
		core: 'reduzir ruído para investigar com profundidade e aceitar que uma pergunta pode exigir luz suficiente para o próximo passo, não visão total',
		resource:
			'pesquisa, autonomia intelectual, retirada voluntária, capacidade de trabalhar sem plateia e de distinguir solidão funcional de isolamento imposto',
		excess:
			'isolamento usado para evitar relação, perfeccionismo investigativo, adiamento por “ainda não saber o bastante” ou identidade construída sobre não precisar de ninguém',
		action: 'diminuir volume de opinião externa e buscar dado relevante',
		relationship:
			'pode indicar necessidade de espaço, elaboração individual ou fase menos expansiva',
		work: 'favorece estudo, revisão, especialização e trabalhos que exigem concentração',
		sourceLine: 2140
	},
	'major-10': {
		name: 'A Roda da Fortuna',
		core: 'mudança de condição produzida por ciclos, contexto e variáveis que nenhum indivíduo controla integralmente',
		resource:
			'capacidade de reconhecer timing, aproveitar mudança de contexto, abandonar a fantasia de controle total e adaptar estratégia quando a configuração muda',
		excess:
			'fatalismo, dependência de sorte, recusa de responsabilidade porque “era destino” ou tentativa de repetir uma fase favorável depois que o contexto já mudou',
		action: 'separar o que pode ser decidido do que precisa ser monitorado',
		relationship:
			'pode mostrar mudança de fase, circunstância externa afetando vínculo ou repetição de padrão',
		work: 'é relevante em mercado, ciclos de projeto, mudanças organizacionais e oportunidades que dependem de contexto',
		sourceLine: 2170
	},
	'major-11': {
		name: 'A Justiça',
		core: 'avaliar evidência, critério, proporcionalidade e consequência de maneira que a decisão possa ser explicada',
		resource:
			'responsabilidade, contrato claro, capacidade de distinguir preferência de regra, revisão de fatos e disposição para aceitar consequência das próprias escolhas',
		excess:
			'legalismo, julgamento sem contexto, falsa neutralidade, uso seletivo de regra ou crença de que todo sofrimento é punição merecida',
		action: 'explicitar regra e evidência antes da escolha',
		relationship:
			'pode indicar necessidade de acordo, reciprocidade mensurável e conversa sobre responsabilidades',
		work: 'é forte em contratos, avaliação, compliance, negociação, auditoria e decisões que precisam de critério documentável',
		sourceLine: 2198
	},
	'major-12': {
		name: 'O Enforcado',
		core: 'interromper a lógica habitual porque avançar pelo mesmo método não resolve o problema; suspensão como mudança de perspectiva, não como mérito do sofrimento',
		resource:
			'capacidade de parar, aceitar custo temporário, observar de outro ângulo e desistir de controle sobre timing quando insistência só aumenta desperdício',
		excess:
			'martírio, passividade, espera sem critério, romantização de sacrifício ou identidade construída sobre “aguentar mais um pouco”',
		action: 'perguntar o que precisa ser solto para que outra perspectiva apareça',
		relationship:
			'pode indicar vínculo em suspensão, necessidade de rever expectativa ou período em que forçar definição piora a relação',
		work: 'é relevante quando projeto precisa pausar, mudar premissa ou aceitar sunk cost',
		sourceLine: 2228
	},
	'major-13': {
		name: 'A Morte',
		core: 'encerramento que altera a forma do sistema de modo que voltar ao estado anterior deixa de ser solução realista',
		resource:
			'capacidade de terminar, fazer luto de uma forma, liberar recurso preso a algo concluído e permitir transição sem exigir que o novo já esteja pronto',
		excess:
			'apego a forma morta, destruição usada para sentir controle, pressa de chamar qualquer mudança de renascimento ou negação de luto por positividade',
		action:
			'identificar o que já perdeu função e qual custo existe em mantê-lo apenas por familiaridade',
		relationship:
			'pode marcar fim de configuração relacional, mudança profunda de contrato ou necessidade de encerrar padrão',
		work: 'é relevante em encerramento de projeto, reestruturação, retirada de produto, mudança de função ou abandono de modelo inviável',
		sourceLine: 2256
	},
	'major-14': {
		name: 'A Temperança',
		core: 'modular diferenças para criar uma terceira condição funcional; integração por ajuste contínuo, não por apagar contrastes',
		resource:
			'paciência ativa, combinação de ritmos, capacidade de testar proporções, negociar e criar processos que suportam diversidade',
		excess:
			'diluição para evitar conflito, ajuste infinito sem decisão, mediação que protege sistema injusto ou crença de que toda diferença deve ser harmonizada',
		action: 'evitar falso binário quando existe possibilidade real de combinação',
		relationship: 'pode indicar vínculo que aprende ritmos, culturas ou necessidades distintas',
		work: 'é forte em integração de equipes, edição, processos iterativos e operações em que qualidade depende de calibração',
		sourceLine: 2286
	},
	'major-15': {
		name: 'O Diabo',
		core: 'dependência, desejo, contrato invisível e poder que aumenta quando não é nomeado ou quando prazer e custo deixam de ser avaliados juntos',
		resource:
			'capacidade de admitir desejo, reconhecer interesse material, nomear dependência e negociar limites sem moralismo',
		excess:
			'compulsão, vergonha, exploração, sensação de não ter escolha, vínculo mantido por medo ou prazer usado para negar consequência',
		action: 'nomear o que prende: dinheiro, prazer, medo, reputação, hábito, desejo de aprovação',
		relationship:
			'pode falar de atração intensa, dependência, ciúme, poder, sexualidade ou contrato não dito',
		work: 'é relevante em incentivos perversos, golden handcuffs, dívida, status, dependência de sistema e situações em que ganho imediato aumenta custo futuro',
		sourceLine: 2314
	},
	'major-16': {
		name: 'A Torre',
		core: 'informação ou acontecimento que torna uma estrutura anterior incapaz de continuar fingindo estabilidade',
		resource:
			'capacidade de reconhecer falha estrutural, responder rapidamente a realidade nova, abandonar narrativa inviável e reconstruir sobre premissas mais honestas',
		excess:
			'catastrofização, destruição preventiva, resistência até a ruptura ficar maior ou fascínio por crise como única forma de mudar',
		action: 'verificar que parte do plano depende de algo já desmentido',
		relationship:
			'pode indicar revelação, mudança brusca de acordo ou estrutura relacional que não comporta mais os fatos',
		work: 'é forte em falha de sistema, mudança organizacional, crise de infraestrutura ou descoberta que invalida plano',
		sourceLine: 2344
	},
	'major-17': {
		name: 'A Estrela',
		core: 'recuperar orientação depois de ruptura por contato com recurso simples, horizonte e possibilidade que não exige negar dano anterior',
		resource:
			'esperança calibrada, transparência, capacidade de voltar a investir, inspiração com espaço, confiança que cresce por sinais reais',
		excess:
			'otimismo sem mecanismo, exposição excessiva, fé usada para evitar reparo ou promessa de cura automática',
		action: 'identificar que sinal concreto justifica voltar a investir',
		relationship:
			'pode indicar abertura, sinceridade e capacidade de imaginar futuro depois de decepção',
		work: 'favorece visão de médio prazo, reconstrução de confiança, reputação recuperada por consistência e projetos em que direção volta antes da escala',
		sourceLine: 2374
	},
	'major-18': {
		name: 'A Lua',
		core: 'navegar quando percepção é real mas insuficiente, distinguindo sinal, medo, memória e projeção sem exigir certeza imediata',
		resource:
			'imaginação, sensibilidade a contexto, capacidade de trabalhar com ambiguidade e reconhecer que nem toda informação chega de forma explícita',
		excess:
			'paranoia, fantasia tratada como fato, medo que preenche lacunas, narrativa sedutora sem verificação ou uso de “intuição” para evitar conversa',
		action: 'se a escolha é irreversível e os dados são insuficientes, reduzir escala ou esperar',
		relationship:
			'pode indicar insegurança, vínculo pouco definido, projeção ou sensibilidade aumentada',
		work: 'é relevante em ambiente com informação incompleta, mudança de narrativa, pesquisa exploratória e projetos criativos',
		sourceLine: 2404
	},
	'major-19': {
		name: 'O Sol',
		core: 'aumentar visibilidade e reduzir ambiguidade de modo que algo possa ser reconhecido, compartilhado ou avaliado com mais clareza',
		resource:
			'clareza, vitalidade, reconhecimento proporcional, alegria, transparência e capacidade de tornar uma conquista compartilhável',
		excess:
			'exposição sem limite, necessidade de aprovação, otimismo que ignora risco ou crença de que clareza autoriza simplificar experiência alheia',
		action:
			'trazer dado para a luz, simplificar o que estava opaco e perguntar o que melhora quando todos enxergam a mesma informação',
		relationship: 'pode indicar vínculo mais explícito, prazer, presença e conversa aberta',
		work: 'favorece lançamento, comunicação, reconhecimento, transparência e ambientes em que resultado precisa ficar visível',
		sourceLine: 2432
	},
	'major-20': {
		name: 'O Julgamento',
		core: 'reavaliar uma trajetória diante de informação suficiente para responder de outro modo; chamada que exige posição, não punição cósmica',
		resource:
			'capacidade de rever passado sem ficar preso a ele, reconhecer consequência, responder a vocação ou decisão que já não pode ser adiada',
		excess:
			'autojulgamento, necessidade de absolvição externa, dramatização de “chamado” para justificar impulso ou repetição de culpa como se fosse responsabilidade',
		action: 'perguntar que fato mudou sua avaliação e que resposta passa a ser exigida',
		relationship:
			'pode indicar conversa decisiva, retorno de tema antigo para avaliação ou momento de dizer que relação existe agora',
		work: 'é forte em revisão de carreira, avaliação de projeto, reentrada, reposicionamento e situações em que experiência anterior precisa ser reinterpretada',
		sourceLine: 2462
	},
	'major-21': {
		name: 'O Mundo',
		core: 'fechamento suficientemente completo para que partes diferentes possam ser reconhecidas como um sistema e a escala seguinte se torne possível',
		resource:
			'conclusão, integração, domínio proporcional, entrega, capacidade de reconhecer o que foi completado e passar a outro nível sem negar o trabalho feito',
		excess:
			'perfeccionismo que impede fechar, apego à identidade de quem concluiu, expansão prematura ou necessidade de transformar toda conclusão em triunfo total',
		action: 'definir o que significa “completo o bastante”',
		relationship:
			'pode indicar relação alcançando forma mais integrada, ciclo fechando ou reconhecimento de limites e totalidade do que foi vivido',
		work: 'é forte em entrega final, certificação, lançamento, encerramento de fase e integração de equipes ou sistemas',
		sourceLine: 2490
	},
	'wands-1': {
		name: 'Ás de Paus',
		core: 'potencial de ação ou criação que pede canal antes de virar resultado',
		resource: 'iniciativa, entusiasmo, coragem de testar, desejo que encontra primeiro gesto',
		excess: 'impulso sem continuidade, começar tudo, confundir excitação com compromisso',
		action:
			'dar forma mínima ao impulso e observar se ele continua vivo depois do primeiro entusiasmo',
		relationship:
			'atração, iniciativa, recomeço de dinâmica ou energia para conversar; não garante estabilidade',
		work: 'ideia, lançamento, protótipo, oportunidade de agir; precisa de escopo e recurso',
		sourceLine: 2523
	},
	'wands-2': {
		name: 'Dois de Paus',
		core: 'comparar horizonte e posição atual antes de ampliar direção',
		resource:
			'planejamento, visão de escala, consciência de alternativas e poder de escolher um campo',
		excess:
			'planejar indefinidamente, tratar possibilidades como posse, desejar expansão sem aceitar custo',
		action: 'definir que hipótese merece teste real em vez de viver apenas no mapa',
		relationship: 'conversa sobre futuro, distância, opções ou diferença de projeto de vida',
		work: 'estratégia, mercado, expansão, decisão entre manter base e explorar outro campo',
		sourceLine: 2551
	},
	'wands-3': {
		name: 'Três de Paus',
		core: 'avaliar expansão depois que algo já foi enviado ao mundo',
		resource:
			'espera ativa, leitura de retorno, visão de médio prazo, capacidade de pensar cadeia e não só gesto inicial',
		excess:
			'expectativa grandiosa, terceirizar execução, ficar olhando resultado sem ajustar operação',
		action: 'medir retorno e ajustar o próximo envio; não confundir paciência com inércia',
		relationship:
			'relação que pergunta como crescer, lidar com distância ou combinar planos além do encontro imediato',
		work: 'expansão comercial, distribuição, parceria externa, acompanhamento de projeto já lançado',
		sourceLine: 2579
	},
	'wands-4': {
		name: 'Quatro de Paus',
		core: 'estabilizar uma conquista suficiente para reconhecê-la coletivamente',
		resource:
			'celebração, marco, pertencimento, base temporária, capacidade de reconhecer uma etapa concluída',
		excess:
			'confundir cerimônia com solidez, manter aparência festiva quando a base é frágil, precisar de validação coletiva',
		action:
			'registrar o que foi de fato construído antes de ampliar; celebrar pode ser parte da manutenção',
		relationship:
			'formalização, encontro de famílias ou grupos, sensação de casa e reconhecimento do vínculo; não é carta automática de casamento',
		work: 'entrega de fase, evento, inauguração, equipe que marca uma conquista e consolida base',
		sourceLine: 2607
	},
	'wands-5': {
		name: 'Cinco de Paus',
		core: 'competição e conflito de direção antes que regras ou hierarquia estejam claras',
		resource:
			'debate produtivo, teste de força, experimentação coletiva, capacidade de aprender por confronto',
		excess:
			'ruído, disputa por atenção, energia gasta em provar posição, conflito sem critério de encerramento',
		action: 'definir regra do conflito: o que está sendo disputado, quem decide e quando termina',
		relationship:
			'fricções de estilo, disputa por prioridade ou jogo de provocação; pode ser estimulante se houver segurança e regra',
		work: 'brainstorm caótico, competição interna, equipes com prioridades incompatíveis, ambiente que confunde intensidade com produtividade',
		sourceLine: 2635
	},
	'wands-6': {
		name: 'Seis de Paus',
		core: 'tornar uma conquista visível e receber validação sem confundir aplauso com valor intrínseco',
		resource:
			'reconhecimento, liderança situacional, confiança fundada em resultado, capacidade de comunicar vitória',
		excess:
			'dependência de plateia, vaidade defensiva, inflar uma vitória local ou precisar vencer para manter identidade',
		action: 'receber reconhecimento e converter visibilidade em responsabilidade e próximo passo',
		relationship:
			'orgulho compartilhado, parceiro que reconhece conquista, visibilidade do vínculo; em sombra, relação como troféu',
		work: 'promoção, feedback positivo, vitória competitiva, lançamento bem recebido, necessidade de administrar reputação',
		sourceLine: 2663
	},
	'wands-7': {
		name: 'Sete de Paus',
		core: 'defender posição conquistada quando demandas concorrentes testam limite',
		resource:
			'coragem para sustentar prioridade, fronteira, capacidade de responder a competição sem abandonar terreno por pressão',
		excess: 'hipervigilância, defender tudo, tratar crítica como ataque, viver em modo de cerco',
		action: 'escolher o que realmente merece defesa; fronteira indiscriminada vira exaustão',
		relationship:
			'necessidade de proteger limite do vínculo contra interferências ou de sustentar uma posição difícil; excesso vira defensividade',
		work: 'competição, negociação, escopo ameaçado, defesa de projeto ou decisão sob questionamento',
		sourceLine: 2691
	},
	'wands-8': {
		name: 'Oito de Paus',
		core: 'movimento que ganhou velocidade e reduz o tempo disponível para corrigir direção',
		resource:
			'agilidade, comunicação rápida, convergência de eventos, execução sem burocracia excessiva',
		excess:
			'pressa, excesso de mensagens, decisões encadeadas sem pausa, movimento que ninguém mais governa',
		action:
			'confirmar direção antes de aumentar velocidade; depois do lançamento, correção pode custar mais',
		relationship:
			'aproximação rápida, conversa intensa, deslocamento ou mudança de ritmo; velocidade não prova profundidade',
		work: 'sprints, logística, mensagens, lançamentos, processos que entram em fase acelerada',
		sourceLine: 2719
	},
	'wands-9': {
		name: 'Nove de Paus',
		core: 'continuar depois de desgaste sem fingir que resistência é infinita',
		resource:
			'resiliência, memória de risco, capacidade de proteger energia e terminar uma fase com cautela',
		excess:
			'trauma transformado em regra universal, exaustão, expectativa de novo ataque, orgulho de suportar além do limite',
		action:
			'avaliar reserva real antes de insistir; persistência deixa de ser virtude quando destrói capacidade futura',
		relationship:
			'vínculo cauteloso depois de conflito, necessidade de confiança reconstruída; não é obrigação de “dar mais uma chance”',
		work: 'projeto perto do fim, equipe cansada, contingência, experiência que ajuda a antecipar problema',
		sourceLine: 2747
	},
	'wands-10': {
		name: 'Dez de Paus',
		core: 'acúmulo de responsabilidade produzido por expansão que não redistribuiu carga',
		resource:
			'capacidade de assumir entrega difícil, consciência do peso real, fechamento de ciclo por esforço concentrado',
		excess:
			'sobrecarga, centralização, orgulho de ser indispensável, aceitar tarefas sem reavaliar escopo',
		action:
			'separar carga essencial de carga assumida por hábito; redistribuir antes que capacidade colapse',
		relationship:
			'relação em que uma pessoa carrega manutenção, planejamento ou cuidado demais; amor não torna distribuição desigual sustentável',
		work: 'acúmulo de tarefas, projeto que cresceu sem processo, função que precisa de delegação ou encerramento',
		sourceLine: 2775
	},
	'wands-11': {
		name: 'Pajem de Paus',
		core: 'explorar uma iniciativa antes de possuir experiência suficiente para dominá-la',
		resource:
			'curiosidade, mensagem estimulante, aprendizagem por tentativa, coragem de perguntar e experimentar',
		excess:
			'entusiasmo performático, tédio rápido, prometer antes de testar, necessidade de novidade constante',
		action:
			'tratar curiosidade como investigação: testar pequeno, fazer perguntas e aceitar não saber',
		relationship:
			'flerte, curiosidade, conversa que abre possibilidade ou fase de descoberta; não define idade nem gênero',
		work: 'estágio inicial de projeto, pesquisa prática, pessoa que traz ideia ou notícia, aprendizagem de campo',
		sourceLine: 2803
	},
	'wands-12': {
		name: 'Cavaleiro de Paus',
		core: 'ação que ganha corpo e velocidade, movida por desejo de experiência e desafio',
		resource:
			'coragem, mobilização, capacidade de entrar em campo, paixão por projeto e decisão rápida quando o custo é reversível',
		excess:
			'impulsividade, abandonar depois da excitação, invadir ritmo alheio, confundir intensidade com compromisso',
		action:
			'usar velocidade onde ela cria aprendizagem, não onde o erro é irreversível ou afeta terceiros sem consentimento',
		relationship:
			'atração intensa, fase de muita iniciativa ou deslocamento; não é prova de infidelidade nem incapacidade de compromisso',
		work: 'execução, viagem, vendas, lançamento, liderança de ataque; precisa de alguém que sustente operação depois do pico',
		sourceLine: 2831
	},
	'wands-13': {
		name: 'Rainha de Paus',
		core: 'sustentar presença criativa e influência sem depender de autoridade formal',
		resource:
			'confiança, magnetismo, generosidade, capacidade de encorajar e manter um projeto vivo pela presença',
		excess:
			'centralização por carisma, ciúme de atenção, exigir entusiasmo de todos, esconder insegurança atrás de performance confiante',
		action:
			'usar influência para ampliar capacidade do sistema, não para transformar todos em plateia',
		relationship:
			'calor, desejo, encorajamento e autonomia dentro do vínculo; em sombra, competição por reconhecimento',
		work: 'liderança cultural, criatividade, networking, capacidade de mobilizar equipe por visão e presença',
		sourceLine: 2859
	},
	'wands-14': {
		name: 'Rei de Paus',
		core: 'transformar visão em direção capaz de mobilizar outras pessoas e sustentar escala',
		resource:
			'liderança, visão estratégica, coragem de decidir, capacidade de patrocinar iniciativa e conectar ação a horizonte',
		excess:
			'autoritarismo carismático, impaciência com detalhe, transformar visão pessoal em obrigação coletiva, prometer escala sem infraestrutura',
		action:
			'assumir responsabilidade pela visão e pelo custo de mobilizar outros; delegar execução sem terceirizar consequência',
		relationship:
			'parceiro ou postura que traz direção e iniciativa; em excesso, uma pessoa define o projeto do vínculo sozinha',
		work: 'empreendedorismo, direção criativa, liderança, expansão; precisa de governança e pessoas capazes de discordar',
		sourceLine: 2887
	},
	'cups-1': {
		name: 'Ás de Copas',
		core: 'receptividade que se abre para vínculo, imaginação, prazer ou experiência afetiva antes de possuir forma estável',
		resource:
			'disponibilidade emocional, acolhimento, criatividade sensível, capacidade de receber e oferecer sem exigir definição imediata',
		excess:
			'transbordamento, idealização do primeiro sentimento, ausência de limite, confundir intensidade afetiva com conhecimento profundo',
		action:
			'permitir que a experiência seja sentida e depois perguntar que recipiente real pode sustentá-la',
		relationship:
			'abertura emocional, reconexão, desejo de aproximar ou capacidade de receber cuidado; potencial não equivale a compromisso',
		work: 'projeto criativo, ambiente acolhedor, nova motivação relacional no trabalho ou capacidade de perceber impacto humano',
		sourceLine: 2920
	},
	'cups-2': {
		name: 'Dois de Copas',
		core: 'reciprocidade construída por reconhecimento mútuo e troca em que duas partes continuam distintas',
		resource: 'encontro, acordo, atração, parceria, escuta e disposição para responder ao outro',
		excess:
			'fusão, idealização da simetria, exigir que reciprocidade signifique sentir ou dar exatamente do mesmo modo',
		action:
			'verificar se ambas as partes sabem o que estão oferecendo e esperando, em vez de supor consenso pelo clima positivo',
		relationship:
			'é uma das cartas mais diretamente relacionais, podendo indicar atração, reconciliação ou acordo; não promete permanência nem “alma gêmea”',
		work: 'parceria, negociação, aliança entre pares, cliente e prestador que conseguem reconhecer interesses mútuos',
		sourceLine: 2948
	},
	'cups-3': {
		name: 'Três de Copas',
		core: 'vínculo entre pares que cria apoio, celebração e circulação além da relação de duas pessoas',
		resource:
			'amizade, rede de apoio, colaboração afetiva, celebração proporcional e capacidade de dividir alegria',
		excess:
			'panelinha, exclusão, festa usada para evitar problema, dependência de aprovação grupal ou triangulação',
		action:
			'identificar quem precisa estar na conversa ou no apoio e quem está sendo excluído pelo desenho atual do grupo',
		relationship:
			'amizades sustentando vida afetiva, integração social de um vínculo, celebração; não é prova automática de triângulo amoroso',
		work: 'cultura de equipe, celebração de entrega, apoio entre colegas e capacidade de reconhecer contribuição',
		sourceLine: 2976
	},
	'cups-4': {
		name: 'Quatro de Copas',
		core: 'suspensão do desejo quando o que está disponível não consegue produzir interesse ou quando saturação reduz percepção',
		resource:
			'capacidade de não aceitar qualquer oferta, pausa para reconhecer desejo real, discernimento afetivo',
		excess:
			'apatia, tédio defensivo, comparação com uma experiência ideal, recusar sem examinar ou esperar que algo externo produza motivação',
		action:
			'examinar se a recusa protege um critério legítimo ou apenas evita risco de se envolver novamente',
		relationship:
			'fase de desinteresse, necessidade de espaço ou dificuldade de perceber ofertas reais porque a expectativa está fixada em outra coisa',
		work: 'desmotivação, saturação de opções, proposta que não convence, necessidade de redefinir o que gera sentido no trabalho',
		sourceLine: 3004
	},
	'cups-5': {
		name: 'Cinco de Copas',
		core: 'reconhecer perda sem permitir que o perdido ocupe todo o campo perceptivo',
		resource:
			'luto, honestidade sobre decepção, capacidade de nomear custo antes de reorganizar atenção',
		excess:
			'fixação no que acabou, culpa, nostalgia que apaga recurso restante, pressão para “superar” antes de processar',
		action:
			'dar nome à perda concreta e só depois olhar o que restou; positividade prematura pode ser outra forma de negação',
		relationship:
			'decepção, término de expectativa, arrependimento ou necessidade de fazer luto; não prova separação definitiva',
		work: 'projeto perdido, cliente, oportunidade ou recurso que não retornará; pede inventário do que ainda permanece utilizável',
		sourceLine: 3032
	},
	'cups-6': {
		name: 'Seis de Copas',
		core: 'memória afetiva e troca com o passado, inclusive a forma como lembrança seleciona e suaviza experiência',
		resource:
			'gentileza, continuidade, reencontro com recurso antigo, capacidade de recuperar algo que ainda tem função',
		excess:
			'nostalgia que congela, infantilização, usar passado como medida impossível do presente ou repetir papel antigo',
		action:
			'perguntar o que do passado ainda é funcional hoje e o que só parece melhor porque a memória retirou complexidade',
		relationship:
			'reencontro, memórias compartilhadas, vínculos antigos, infância e familiaridade; não garante retorno de ex-parceiro',
		work: 'conhecimento institucional, cliente antigo, técnica já usada, cultura de equipe ou recurso que pode ser recuperado',
		sourceLine: 3060
	},
	'cups-7': {
		name: 'Sete de Copas',
		core: 'multiplicidade imaginativa que exige discriminar desejo, fantasia, risco e viabilidade',
		resource:
			'criatividade, capacidade de imaginar alternativas, reconhecer desejos contraditórios e explorar cenários',
		excess:
			'paralisia por opção, sedução pela imagem, prometer a si mesmo vários futuros incompatíveis, medo de escolher e perder possibilidades',
		action:
			'reduzir o campo por critérios reais: custo, valor, capacidade e consequência; escolher não é destruir imaginação',
		relationship:
			'fantasias sobre vínculo, várias possibilidades ou projeções sobre outra pessoa; não prova múltiplos parceiros',
		work: 'ideação, portfólio de opções, propostas demais, produto sem priorização, visão que precisa de critérios',
		sourceLine: 3088
	},
	'cups-8': {
		name: 'Oito de Copas',
		core: 'afastar-se de uma configuração que possui valor, mas deixou de responder ao que a pessoa busca',
		resource:
			'capacidade de sair sem demonizar o que existiu, reconhecer insuficiência e aceitar custo de procurar outra condição',
		excess:
			'abandonar cedo, fuga emocional, acreditar que satisfação está sempre em outro lugar, sair sem comunicar quando havia responsabilidade',
		action:
			'nomear o que a configuração atual não consegue oferecer e verificar se isso é estrutural ou negociável antes de sair',
		relationship:
			'distanciamento, necessidade de outro nível de vínculo, encerramento ou busca de espaço; não determina término',
		work: 'deixar função, produto, cliente ou projeto que já não compensa custo; pode ser decisão de portfólio',
		sourceLine: 3116
	},
	'cups-9': {
		name: 'Nove de Copas',
		core: 'satisfação com aquilo que já foi obtido e capacidade de reconhecer prazer sem precisar imediatamente ampliar',
		resource:
			'contentamento, prazer, desejo realizado em escala real, autossuficiência afetiva e gratidão concreta',
		excess:
			'complacência, consumo excessivo, transformar satisfação em exibição, imaginar que conseguir o que se queria resolve todo problema',
		action:
			'perguntar se o objetivo alcançado ainda corresponde ao desejo e como desfrutá-lo sem transformar prazer em anestesia',
		relationship:
			'prazer compartilhado ou autonomia emocional saudável; em sombra, comodidade que evita aprofundar vínculo',
		work: 'resultado satisfatório, recompensa, reconhecimento de benefício e capacidade de usufruir sem converter todo ganho em nova meta',
		sourceLine: 3144
	},
	'cups-10': {
		name: 'Dez de Copas',
		core: 'imagem compartilhada de felicidade, pertencimento e continuidade relacional que precisa ser vivida além do ideal',
		resource:
			'coesão, apoio, alegria coletiva, capacidade de construir segurança relacional e reconhecer bem-estar compartilhado',
		excess:
			'pressão para parecer feliz, ideal de família usado como norma, apagar conflito para preservar imagem ou confundir pertencimento com uniformidade',
		action:
			'distinguir o que realmente produz bem-estar do que só parece correto na fotografia; preservar conflito legítimo dentro da coesão',
		relationship:
			'pode indicar forte sensação de pertencimento, projeto comum ou integração de redes; não garante “felizes para sempre”',
		work: 'cultura de equipe, missão compartilhada, ambiente de apoio e resultado que beneficia grupo, não apenas indivíduo',
		sourceLine: 3172
	},
	'cups-11': {
		name: 'Pajem de Copas',
		core: 'mensagem afetiva ou imaginativa que interrompe expectativa e convida a responder com curiosidade',
		resource:
			'abertura emocional, criatividade, humor, capacidade de acolher surpresa e dizer algo vulnerável sem exigir controle',
		excess:
			'fantasia, ingenuidade relacional, interpretar qualquer gesto como sinal profundo, evitar realidade pela imaginação',
		action:
			'escutar a surpresa e depois verificar o que ela significa na realidade; manter curiosidade sem construir história inteira a partir de um gesto',
		relationship:
			'mensagem, flerte, pedido de desculpas, gesto inesperado ou fase de descoberta emocional; não define idade',
		work: 'ideia criativa, feedback humano, convite, intuição de design ou informação que chega por via pouco convencional',
		sourceLine: 3200
	},
	'cups-12': {
		name: 'Cavaleiro de Copas',
		core: 'movimento guiado por ideal, afeto ou proposta que busca forma relacional',
		resource:
			'romantismo com ação, diplomacia, convite, capacidade de mover-se em direção ao que tem valor emocional',
		excess:
			'promessa sedutora sem sustentação, idealização, evitar conflito mantendo tudo bonito, apaixonar-se pela própria narrativa',
		action:
			'avaliar se a proposta possui mecanismo, prazo e recurso além da forma atraente; intenção precisa encontrar execução',
		relationship:
			'convite, aproximação, declaração, tentativa de conciliação; não prova compromisso futuro nem sinceridade total',
		work: 'proposta criativa, negociação diplomática, pitch de valor simbólico, relação com cliente ou marca',
		sourceLine: 3228
	},
	'cups-13': {
		name: 'Rainha de Copas',
		core: 'receptividade com capacidade de conter e interpretar experiência afetiva sem precisar exibi-la imediatamente',
		resource:
			'escuta, empatia com limite, imaginação, cuidado atento, capacidade de permanecer junto de emoção complexa',
		excess:
			'absorver estados alheios, confundir empatia com responsabilidade, isolamento em fantasia, silêncio que impede reciprocidade',
		action:
			'ouvir antes de reagir e nomear limite antes de absorver custo que pertence a outra pessoa',
		relationship:
			'profundidade emocional, escuta e intimidade; em sombra, uma pessoa cuida de tudo e não informa o próprio limite',
		work: 'mediação, cuidado, pesquisa qualitativa, criação, liderança que percebe clima sem transformar impressão em fato',
		sourceLine: 3256
	},
	'cups-14': {
		name: 'Rei de Copas',
		core: 'governar experiência afetiva em ambiente instável sem exigir que o ambiente se torne calmo primeiro',
		resource:
			'maturidade relacional, diplomacia, capacidade de sustentar conflito, cuidado com consequência e regulação sem frieza',
		excess:
			'controle emocional usado para superioridade, manipulação por calma, evitar vulnerabilidade concreta ou gerir sentimento alheio como sistema',
		action:
			'manter o centro sem negar a água ao redor; regular não significa decidir o que os outros deveriam sentir',
		relationship:
			'parceiro ou postura que consegue conversar sob tensão e sustentar afeto sem desorganização; sombra vira paternalismo',
		work: 'liderança de pessoas, negociação, gestão de conflito, ambientes de cuidado e decisões que precisam considerar impacto humano',
		sourceLine: 3284
	},
	'swords-1': {
		name: 'Ás de Espadas',
		core: 'clareza ou distinção que corta ambiguidade e permite nomear uma questão antes de decidir o que fazer com ela',
		resource:
			'insight, formulação precisa, capacidade de separar fatos, argumento e ruído, início de decisão intelectual',
		excess:
			'certeza prematura, linguagem cortante, usar verdade como arma, transformar uma hipótese clara em conclusão total',
		action:
			'formular o problema em frase verificável antes de buscar solução; clareza útil aceita ser corrigida por evidência',
		relationship:
			'conversa franca, nomeação de limite ou mudança de entendimento; não significa conflito inevitável',
		work: 'análise, contrato, diagnóstico de problema organizacional, estratégia e definição de critério',
		sourceLine: 3317
	},
	'swords-2': {
		name: 'Dois de Espadas',
		core: 'suspender decisão quando alternativas parecem equivalentes ou quando informação e emoção foram isoladas para manter impasse',
		resource:
			'capacidade de não reagir sob pressão, adiar até obter critério, proteger-se de escolha precipitada',
		excess:
			'paralisia, neutralidade fictícia, evitar conversa, manter duas opções abertas por medo de perda, bloquear informação desconfortável',
		action:
			'retirar a venda metafórica: que dado, valor ou consequência está sendo excluído para manter o equilíbrio artificial',
		relationship:
			'impasse, silêncio, necessidade de conversa estruturada; não prova falta de sentimento',
		work: 'decisão pendente, negociação travada, informação insuficiente, duas propostas que precisam de critério comum',
		sourceLine: 3345
	},
	'swords-3': {
		name: 'Três de Espadas',
		core: 'dor produzida por separação, conflito de verdade ou informação que atravessa expectativa afetiva',
		resource:
			'capacidade de nomear dor, aceitar uma verdade difícil, distinguir o que machuca do que precisa ser corrigido',
		excess:
			'catastrofização, apego à ferida, usar honestidade para ferir, transformar um episódio doloroso em identidade permanente',
		action:
			'não minimizar dor e não extrapolá-la; identificar fato, interpretação e consequência separadamente',
		relationship:
			'decepção, separação, conflito, luto ou verdade difícil; não prova traição nem infidelidade',
		work: 'feedback duro, ruptura de parceria, decisão impopular, perda de oportunidade ou reconhecimento de incompatibilidade',
		sourceLine: 3373
	},
	'swords-4': {
		name: 'Quatro de Espadas',
		core: 'pausa deliberada para reduzir estímulo e restaurar capacidade de pensar depois de conflito ou esforço',
		resource:
			'descanso, recuperação, silêncio, suspensão estratégica, capacidade de não confundir movimento com produtividade',
		excess:
			'isolamento prolongado, evitar retorno, usar “preciso de tempo” para nunca responder, repouso que não trata a causa do desgaste',
		action:
			'definir duração e objetivo da pausa; descanso funciona melhor quando não se transforma em desaparecimento indefinido',
		relationship:
			'necessidade de espaço, pausa de conversa ou recuperação após conflito; não determina rompimento',
		work: 'licença, intervalo, revisão, manutenção, tempo de análise depois de crise ou sobrecarga',
		sourceLine: 3401
	},
	'swords-5': {
		name: 'Cinco de Espadas',
		core: 'conflito em que ganhar uma posição pode destruir cooperação, confiança ou legitimidade necessária depois',
		resource:
			'capacidade de reconhecer disputa assimétrica, recusar jogo ruim, escolher batalha e perceber custo de vitória',
		excess:
			'humilhação, manipulação, insistir em vencer qualquer debate, usar vantagem sem considerar consequência, ressentimento',
		action:
			'perguntar o que continua existindo depois da vitória e se a relação, reputação ou sistema suportará o método usado',
		relationship:
			'disputa que deixa resíduo, necessidade de reparar ou sair de dinâmica de competição; não rotula ninguém como agressor por essência',
		work: 'política interna, negociação predatória, competição destrutiva, vitória jurídica ou estratégica com custo de relação',
		sourceLine: 3429
	},
	'swords-6': {
		name: 'Seis de Espadas',
		core: 'transição para condição menos turbulenta sem fingir que o problema foi totalmente resolvido',
		resource:
			'distanciamento estratégico, mudança de ambiente, recuperação gradual, capacidade de aceitar ajuda e atravessar fase intermediária',
		excess:
			'fuga sem aprendizado, carregar o conflito intacto para outro lugar, depender de mudança externa sem revisar padrão',
		action:
			'aceitar que uma solução de transição pode ser boa o bastante agora, desde que exista plano para o que foi carregado junto',
		relationship:
			'afastamento, mudança de dinâmica, necessidade de espaço ou transição conjunta; não garante separação',
		work: 'migração de equipe, mudança de projeto, saída negociada, transferência de função, processo de recuperação após crise',
		sourceLine: 3457
	},
	'swords-7': {
		name: 'Sete de Espadas',
		core: 'estratégia que opera por informação parcial, desvio ou assimetria de conhecimento e por isso exige avaliação ética',
		resource:
			'discrição, planejamento, pensamento lateral, capacidade de evitar confronto inútil e proteger informação sensível',
		excess:
			'engano, apropriação, omissão manipulativa, estratégia que depende de ninguém perceber, paranoia sobre ser descoberto',
		action:
			'perguntar quem seria prejudicado se a estratégia fosse conhecida; discrição legítima e engano não são a mesma coisa',
		relationship:
			'pode indicar algo não dito, necessidade de privacidade ou estratégia individual; não prova traição',
		work: 'negociação, confidencialidade, competição, propriedade intelectual, atalhos e processos onde informação está distribuída de modo desigual',
		sourceLine: 3485
	},
	'swords-8': {
		name: 'Oito de Espadas',
		core: 'restrição percebida ou real cuja arquitetura precisa ser examinada antes de concluir que não existe escolha',
		resource:
			'capacidade de mapear limites, reconhecer medo, identificar pequenas margens de agência e pedir informação ou ajuda',
		excess:
			'impotência aprendida, narrativa de prisão que ignora opções, subestimar riscos reais ou culpar a pessoa por restrições estruturais',
		action: 'listar restrições reais, presumidas e negociáveis',
		relationship:
			'sensação de não poder agir, vínculo com regras implícitas ou medo de consequência; não significa que “basta mudar de pensamento”',
		work: 'burocracia, contrato, hierarquia, falta de autonomia ou processo mal desenhado; algumas barreiras são reais',
		sourceLine: 3513
	},
	'swords-9': {
		name: 'Nove de Espadas',
		core: 'ameaça amplificada pela mente quando ausência de resolução permite que pensamento repita o pior cenário',
		resource:
			'reconhecer preocupação, buscar dado, nomear medo, tratar ruminação como processo e não como profecia',
		excess:
			'insônia, culpa, catastrofização, antecipação de desastre, vergonha que impede pedir ajuda',
		action:
			'escrever ou nomear a hipótese temida, procurar evidência e definir ação possível; quando sofrimento é intenso, Tarot não substitui apoio profissional',
		relationship:
			'medo sobre relação, culpa, repetição de conversa ou ansiedade diante de incerteza; a carta não prova que o medo descreve a realidade',
		work: 'preocupação com prazo, erro, reputação ou decisão; pede separar risco real de cenário mental repetido',
		sourceLine: 3541
	},
	'swords-10': {
		name: 'Dez de Espadas',
		core: 'conclusão extrema de uma narrativa ou conflito que já não pode ser sustentado no formato anterior',
		resource:
			'capacidade de reconhecer limite final, parar de negociar com algo encerrado e impedir que mais recurso seja gasto para salvar a forma',
		excess:
			'dramatização de fim, identidade de vítima, buscar “última palavra”, interpretar qualquer derrota como destruição total',
		action:
			'parar de acrescentar espadas ao que já terminou; documentar aprendizado e impedir que a necessidade de explicar reabra continuamente a ferida',
		relationship:
			'fim de ciclo, conversa que encerra uma possibilidade ou reconhecimento de que uma forma de relação acabou; não prevê morte',
		work: 'projeto encerrado, estratégia derrotada, perda de posição, falha que exige post-mortem e fechamento claro',
		sourceLine: 3569
	},
	'swords-11': {
		name: 'Pajem de Espadas',
		core: 'curiosidade intelectual e vigilância diante de informação ainda em formação',
		resource:
			'perguntar, investigar, observar contradições, aprender linguagem nova, comunicar rápido e testar ideias',
		excess:
			'suspeita, fofoca, monitoramento, argumentação por reflexo, acumular informação sem critério',
		action:
			'formular perguntas melhores e verificar fonte antes de distribuir informação; curiosidade precisa de ética',
		relationship:
			'conversa franca, curiosidade sobre o outro ou necessidade de verificar suposição; em sombra, vigiar substitui confiar',
		work: 'pesquisa, jornalismo, análise, due diligence, aprendizado técnico, alguém que traz pergunta desconfortável',
		sourceLine: 3597
	},
	'swords-12': {
		name: 'Cavaleiro de Espadas',
		core: 'ação orientada por ideia ou decisão que reduz tolerância a demora e pode ultrapassar contexto',
		resource:
			'coragem intelectual, resposta rápida, defesa de princípio, capacidade de agir quando o problema já está claro',
		excess:
			'agressividade verbal, precipitação, certeza rígida, atacar antes de compreender, atropelar relação em nome de eficiência',
		action:
			'confirmar que a urgência é real e que a tese central continua correta quando confrontada com consequências humanas',
		relationship:
			'conversa decisiva, conflito que chega ao ponto de ação ou necessidade de dizer algo sem rodeios; não define personalidade agressiva',
		work: 'crise, negociação dura, implantação rápida, advocacia de tese, resposta a incidente',
		sourceLine: 3625
	},
	'swords-13': {
		name: 'Rainha de Espadas',
		core: 'critério que combina experiência difícil com capacidade de distinguir, perguntar e estabelecer limite',
		resource:
			'clareza, independência, comunicação direta, discernimento, escuta sem sentimentalizar fatos',
		excess:
			'cinismo, julgamento preventivo, usar inteligência para manter distância, confundir vulnerabilidade com erro',
		action:
			'dizer o necessário com precisão suficiente para preservar dignidade e possibilidade de resposta',
		relationship:
			'necessidade de honestidade, limite e autonomia; pode descrever afeto que não depende de suavizar toda verdade',
		work: 'revisão, edição, decisão, gestão de risco, estratégia e situações em que qualidade depende de critério explícito',
		sourceLine: 3653
	},
	'swords-14': {
		name: 'Rei de Espadas',
		core: 'governar por regra, linguagem e julgamento capaz de justificar escolhas diante de outras pessoas',
		resource:
			'estratégia, justiça processual, objetividade contextual, autoridade intelectual, capacidade de decidir em campo complexo',
		excess:
			'frieza performática, tecnocracia, manipular regra, acreditar que poder de nomear equivale a neutralidade',
		action:
			'separar autoridade de infalibilidade; decisões melhores tornam premissas e critérios auditáveis',
		relationship:
			'vínculo que precisa de conversas claras e decisões justas; em sombra, racionalização exclui experiência afetiva relevante',
		work: 'liderança jurídica, técnica, executiva ou analítica; políticas, contratos e decisões que precisam ser documentadas',
		sourceLine: 3681
	},
	'pentacles-1': {
		name: 'Ás de Ouros',
		core: 'oportunidade material que precisa ser recebida, testada e transformada em prática antes de produzir continuidade',
		resource:
			'recurso, começo concreto, disponibilidade para investir, corpo e tempo suficientes para iniciar',
		excess:
			'confundir oportunidade com garantia, acumular recursos sem uso, materializar cedo demais uma ideia ainda ruim',
		action:
			'verificar condições, custo e capacidade de manutenção antes de aceitar; um recurso só é útil se puder ser integrado',
		relationship:
			'gesto concreto, disponibilidade de tempo, cuidado ou espaço; pode indicar base material para vínculo, não amor por si só',
		work: 'oferta, capital, ferramenta, cliente, contrato potencial, infraestrutura inicial ou chance de aprender por prática',
		sourceLine: 3714
	},
	'pentacles-2': {
		name: 'Dois de Ouros',
		core: 'administrar recursos variáveis mantendo movimento suficiente para que o sistema não pare',
		resource:
			'flexibilidade, orçamento dinâmico, capacidade de priorizar, alternar tarefas e responder a oscilação',
		excess:
			'malabarismo permanente, normalizar instabilidade, manter compromissos demais, parecer adaptável enquanto capacidade se esgota',
		action:
			'identificar o que pode variar e o que precisa de mínimo estável; flexibilidade sem base vira precariedade',
		relationship:
			'negociação de tempo, logística, rotinas e prioridades; vínculo precisa caber na vida real, não apenas no desejo',
		work: 'fluxo de caixa, agenda, portfólio, duas funções, variação de demanda e necessidade de replanejamento',
		sourceLine: 3742
	},
	'pentacles-3': {
		name: 'Três de Ouros',
		core: 'competência individual que ganha valor dentro de coordenação, padrão e obra maior que uma pessoa',
		resource:
			'colaboração, aprendizagem, reconhecimento técnico, divisão de função, feedback e construção de qualidade compartilhada',
		excess:
			'dependência de aprovação, reunião sem produção, especialista isolado do sistema ou equipe que não define responsabilidade',
		action: 'definir quem faz, quem avalia e que padrão indica que o trabalho está bom o bastante',
		relationship:
			'construir algo juntos, negociar tarefas, reconhecer habilidade do outro; afeto sem coordenação pode não sustentar projeto comum',
		work: 'trabalho em equipe, craft, revisão, arquitetura de processo, mentoria e qualidade que precisa migrar do herói para o sistema',
		sourceLine: 3770
	},
	'pentacles-4': {
		name: 'Quatro de Ouros',
		core: 'reter valor para proteger estabilidade e descobrir quando proteção se transforma em fechamento',
		resource:
			'reserva, limite, poupança, proteção de recurso, capacidade de dizer não e manter margem',
		excess:
			'apego, medo de perda, controle, retenção de afeto ou informação, segurança construída por imobilidade',
		action:
			'definir que reserva é suficiente e qual parte do recurso precisa circular para continuar tendo função',
		relationship:
			'necessidade de limite e estabilidade; em sombra, uma pessoa protege tanto a própria autonomia que quase não existe troca',
		work: 'caixa, reserva, orçamento, propriedade, governança de acesso, controle de estoque ou risco',
		sourceLine: 3798
	},
	'pentacles-5': {
		name: 'Cinco de Ouros',
		core: 'precariedade, exclusão ou perda de acesso que precisa ser tratada como condição material e social, não como falha moral',
		resource:
			'reconhecer necessidade, buscar apoio, tornar vulnerabilidade legível, perceber recurso institucional ou coletivo disponível',
		excess:
			'vergonha, isolamento, naturalizar escassez, culpar-se por condição estrutural ou romantizar dificuldade como prova de valor',
		action:
			'mapear o que falta, que apoio existe e que barreira impede acesso; não transformar dignidade em obrigação de resolver tudo sozinho',
		relationship:
			'fase de vulnerabilidade, distância produzida por recurso, doença ou trabalho pode afetar vínculo; a carta não diagnostica saúde',
		work: 'perda de renda, falta de acesso, subfinanciamento, exclusão, ambiente que deixa pessoas sem suporte ou recurso crítico',
		sourceLine: 3826
	},
	'pentacles-6': {
		name: 'Seis de Ouros',
		core: 'distribuir recurso em relação assimétrica e tornar visível quem decide, quem recebe e por qual critério',
		resource:
			'generosidade com medida, apoio, redistribuição, remuneração justa, capacidade de receber sem vergonha',
		excess:
			'caridade como controle, ajuda que cria dívida, paternalismo, distribuição opaca ou receber de modo que reduz autonomia',
		action:
			'perguntar quem define o critério e que obrigação explícita ou implícita acompanha a transferência',
		relationship:
			'troca de cuidado, dinheiro e tempo; importante observar se apoio é recíproco, acordado e proporcional',
		work: 'pagamento, investimento, bolsas, orçamento, ajuda, remuneração, alocação de recursos e poder de aprovação',
		sourceLine: 3854
	},
	'pentacles-7': {
		name: 'Sete de Ouros',
		core: 'avaliar um processo em andamento antes de decidir se merece mais tempo, recurso ou mudança de método',
		resource:
			'paciência com evidência, revisão de retorno, capacidade de esperar ciclo adequado e ajustar investimento',
		excess:
			'sunk cost, esperar indefinidamente porque já investiu muito, cobrar fruto antes do tempo ou confundir paciência com passividade',
		action:
			'definir indicadores e prazo de nova avaliação; sem critério, “dar mais tempo” vira adiamento',
		relationship:
			'relação em fase de avaliação, investimento afetivo e pergunta sobre reciprocidade ao longo do tempo; não é ultimato automático',
		work: 'ROI, projeto de longo prazo, cultivo de competência, produto que precisa de maturação, revisão de portfólio',
		sourceLine: 3882
	},
	'pentacles-8': {
		name: 'Oito de Ouros',
		core: 'desenvolver competência por repetição deliberada, feedback e atenção ao processo',
		resource:
			'técnica, disciplina, aprendizagem, craft, revisão, capacidade de melhorar qualidade por prática',
		excess:
			'perfeccionismo, produção mecânica, trabalho sem propósito, identidade reduzida a desempenho ou repetir sem feedback',
		action:
			'identificar que repetição realmente melhora resultado e onde só reproduz erro em escala',
		relationship:
			'cuidado demonstrado por consistência e esforço; em sombra, relação tratada como tarefa de otimização',
		work: 'aprendizagem, produção, processo, qualidade, treinamento, especialização e melhoria incremental',
		sourceLine: 3910
	},
	'pentacles-9': {
		name: 'Nove de Ouros',
		core: 'usufruir resultado de competência e recurso sem depender de exibir sucesso ou de fundir autonomia com isolamento',
		resource:
			'autonomia material, refinamento, prazer conquistado, capacidade de manter ambiente e reconhecer próprio valor',
		excess:
			'isolamento confortável, status como barreira, gastar para provar independência ou acreditar que precisar de alguém é fracasso',
		action:
			'reconhecer o que já funciona e decidir onde autonomia pode abrir espaço para colaboração sem perder contorno',
		relationship:
			'autonomia dentro do vínculo, prazer e espaço individual; em sombra, intimidade ameaça a autossuficiência construída',
		work: 'resultado de longo prazo, especialização, patrimônio, negócio que sustenta seu operador, recompensa por consistência',
		sourceLine: 3938
	},
	'pentacles-10': {
		name: 'Dez de Ouros',
		core: 'integrar recurso individual a sistemas de legado, família, instituição ou continuidade que atravessam uma pessoa',
		resource:
			'estabilidade de longo prazo, patrimônio, conhecimento transmitido, rede de apoio, capacidade de pensar consequência intergeracional',
		excess:
			'tradição rígida, patrimônio como controle, obrigação familiar, preservar sistema apenas porque é antigo ou confundir legado com status',
		action:
			'perguntar que parte do valor precisa sobreviver à pessoa e que estrutura permite transmissão sem congelar o futuro',
		relationship:
			'família, projeto comum, vínculo integrado a redes e responsabilidades; não promete casamento nem riqueza',
		work: 'sucessão, patrimônio, empresa familiar, documentação, cultura institucional, benefícios de longo prazo e continuidade de sistemas',
		sourceLine: 3966
	},
	'pentacles-11': {
		name: 'Pajem de Ouros',
		core: 'aprender a lidar com matéria, recurso ou técnica por atenção concreta e começo disciplinado',
		resource:
			'curiosidade prática, estudo, planejamento, respeito ao processo, vontade de aprender algo que produz resultado tangível',
		excess:
			'procrastinação disfarçada de preparação, materialismo ingênuo, medo de começar sem garantia ou foco estreito demais',
		action:
			'escolher um objeto real de aprendizagem e criar rotina curta de prática, em vez de colecionar teoria',
		relationship:
			'gesto concreto, confiabilidade em formação, aprender como cuidar de vínculo na prática; não é carta de riqueza',
		work: 'curso, estágio, orçamento inicial, pesquisa aplicada, proposta concreta ou pessoa em fase de formação',
		sourceLine: 3994
	},
	'pentacles-12': {
		name: 'Cavaleiro de Ouros',
		core: 'sustentar uma tarefa por constância, método e compromisso com o que precisa continuar funcionando',
		resource:
			'confiabilidade, paciência, rotina, manutenção, capacidade de cumprir sem depender de motivação alta',
		excess:
			'rigidez, lentidão sem necessidade, aversão a risco, automatismo, confundir consistência com nunca revisar método',
		action:
			'manter o que funciona e marcar revisões periódicas para que constância não vire inércia',
		relationship:
			'presença estável, cuidado demonstrado por continuidade e responsabilidade; em sombra, vínculo entra em piloto automático',
		work: 'operações, manutenção, logística, produção repetível, compliance e qualquer função em que falha pequena acumulada custa caro',
		sourceLine: 4022
	},
	'pentacles-13': {
		name: 'Rainha de Ouros',
		core: 'administrar recurso e cuidado de modo que conforto, corpo e continuidade tenham infraestrutura real',
		resource:
			'pragmatismo cuidadoso, hospitalidade com limite, gestão de recurso, atenção ao corpo e capacidade de tornar o ambiente sustentável',
		excess:
			'cuidar de todos como forma de controle, sobrecarga doméstica, ansiedade material, medir valor próprio pela utilidade',
		action:
			'perguntar o que o cuidado custa e como distribuí-lo; sustentabilidade inclui quem sustenta',
		relationship:
			'cuidado concreto, criação de segurança e atenção às condições do vínculo; em sombra, uma pessoa assume manutenção invisível inteira',
		work: 'gestão, operações, hospitalidade, finanças, produção, pessoas e ambientes em que qualidade depende de detalhe material',
		sourceLine: 4050
	},
	'pentacles-14': {
		name: 'Rei de Ouros',
		core: 'governar recursos e continuidade com visão de longo prazo, assumindo responsabilidade pelo sistema que produz valor',
		resource:
			'estabilidade, competência material, investimento paciente, capacidade de proteger patrimônio sem impedir circulação',
		excess:
			'posse como identidade, conservadorismo, status, explorar recurso ou pessoas em nome de segurança, avaliar tudo por retorno material',
		action:
			'proteger valor sem congelar capital, talento ou processo; segurança precisa de capacidade de adaptação',
		relationship:
			'estabilidade e responsabilidade podem fortalecer vínculo; em sombra, segurança vira controle financeiro ou resistência a mudanças',
		work: 'gestão de patrimônio, negócio, liderança operacional, investimento, governança e decisões de longo prazo',
		sourceLine: 4078
	}
};
