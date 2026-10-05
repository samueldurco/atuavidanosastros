export type EditorialSection = { title: string; paragraphs: string[] };

/** Text shown on the existing public pages. Availability comes from the product catalog. */
export const editorialContent: Record<string, EditorialSection[]> = {
	'meu-ceu': [
		{
			title: 'O que tem no seu mapa astral?',
			paragraphs: [
				'O mapa astral reúne as posições dos astros no momento do seu nascimento. A leitura relaciona essas posições com assuntos como personalidade, emoções, amor e trabalho.',
				'O Sol, a Lua e o Ascendente são um bom começo. Para uma leitura mais completa, entram também os outros planetas, as casas e os aspectos entre eles.'
			]
		},
		{
			title: 'De quais dados você precisa?',
			paragraphs: [
				'Data, hora e local de nascimento. A hora ajuda a calcular o Ascendente e as casas. Se você tiver apenas uma hora aproximada, informe isso: alguns resultados podem mudar.'
			]
		}
	],
	ciclos: [
		{
			title: 'Previsões para o seu momento',
			paragraphs: [
				'As previsões astrológicas relacionam os movimentos atuais dos astros com o seu mapa de nascimento. Você pode consultar uma data, acompanhar uma semana ou conhecer os temas do seu ano astrológico.'
			]
		},
		{
			title: 'Qual leitura escolher?',
			paragraphs: [
				'O horóscopo destaca os temas de um período. A leitura da data observa um dia específico. O calendário pessoal organiza os trânsitos por data. A Revolução Solar acompanha o ciclo entre um aniversário e o seguinte.',
				'Confira abaixo o que cada leitura inclui e sua disponibilidade.'
			]
		}
	],
	amor: [
		{
			title: 'Como vocês combinam?',
			paragraphs: [
				'A comparação de dois mapas ajuda a explorar atração, comunicação, necessidades afetivas e diferenças entre vocês. Na astrologia, essa comparação se chama sinastria.'
			]
		},
		{
			title: 'Atração e sensualidade',
			paragraphs: [
				'Vênus e Marte entram na leitura de desejo, afeto e atração. A Lua ajuda a entender necessidades emocionais. O signo solar sozinho traz apenas uma parte dessa leitura.',
				'Para comparar os mapas, você precisa dos dados de nascimento das duas pessoas e da autorização de quem compartilhar seus dados.'
			]
		}
	],
	proposito: [
		{
			title: 'Sua carreira no mapa astral',
			paragraphs: [
				'O Meio do Céu, a Casa 10 e seus planetas ajudam a explorar interesses profissionais e a forma como você quer ser reconhecido pelo seu trabalho. A rotina e as condições de trabalho também entram nessa leitura.'
			]
		},
		{
			title: 'Sua relação com dinheiro',
			paragraphs: [
				'A Casa 2 participa da leitura sobre recursos, valores e a maneira de lidar com o que você tem. Para conhecer essa parte do mapa, é preciso considerar também os planetas e suas relações.'
			]
		},
		{
			title: 'Comece pelo Meio do Céu',
			paragraphs: [
				'A Bússola de Carreira tem um cálculo gratuito do Meio do Céu. Informe seus dados de nascimento e veja o resultado. As outras leituras estão listadas abaixo.'
			]
		}
	],
	tarot: [
		{
			title: 'Qual é a sua pergunta?',
			paragraphs: [
				'Você pode começar com uma carta do dia, explorar uma pergunta ou trazer três assuntos para a leitura. Uma pergunta específica ajuda a interpretar as cartas em relação ao que está acontecendo na sua vida.'
			]
		},
		{
			title: 'O que você recebe?',
			paragraphs: [
				'A leitura mostra as cartas tiradas e sua interpretação para a pergunta enviada. Cada produto informa quantas perguntas ou etapas estão incluídas.'
			]
		}
	],
	sonhos: [
		{
			title: 'O que você lembra do sonho?',
			paragraphs: [
				'Conte o que aconteceu, quem apareceu e como você se sentiu. As associações que você faz com esses elementos ajudam a explorar o sonho.'
			]
		},
		{
			title: 'Um sonho ou um diário?',
			paragraphs: [
				'A leitura de um sonho se concentra em um relato. O diário permite reunir sonhos ao longo do tempo e observar personagens, emoções e temas que voltam a aparecer.'
			]
		}
	],
	'vocacao-no-mapa-astral': [
		{
			title: 'Por onde começar',
			paragraphs: [
				'O Meio do Céu e a Casa 10 participam da leitura de carreira e reconhecimento. O planeta que rege o signo do Meio do Céu acrescenta informações sobre essa área.',
				'A Casa 6 ajuda a explorar rotina e trabalho cotidiano. A Casa 2 traz questões sobre recursos e valores. Esses fatores são lidos em conjunto.'
			]
		},
		{
			title: 'Use a leitura para conhecer seus interesses',
			paragraphs: [
				'Compare o que aparece no mapa com suas experiências: atividades de que você gosta, condições em que trabalha melhor e habilidades que quer desenvolver. A escolha de uma profissão também depende de formação, oportunidades e necessidades pessoais.'
			]
		}
	],
	'carreira-no-mapa-astral': [
		{
			title: 'Carreira, rotina e dinheiro',
			paragraphs: [
				'A Casa 10 trata da vida pública e profissional. A Casa 6 entra na leitura da rotina. A Casa 2 participa da leitura de recursos e valores. Planetas e aspectos acrescentam detalhes a cada uma dessas áreas.'
			]
		},
		{
			title: 'Conheça seu Meio do Céu',
			paragraphs: [
				'O cálculo usa data, hora, local e fuso de nascimento. Uma hora incorreta pode mudar o resultado. Você pode usar a Bússola de Carreira para começar por esse ponto do mapa.'
			]
		}
	],
	'casa-10': [
		{
			title: 'O que a Casa 10 mostra?',
			paragraphs: [
				'A Casa 10 participa da leitura de carreira, reconhecimento e responsabilidades públicas. Seu signo, os planetas presentes e o planeta regente ajudam a interpretar essa área.'
			]
		},
		{
			title: 'Casa 10 e Meio do Céu',
			paragraphs: [
				'O Meio do Céu é um ponto calculado a partir dos dados de nascimento. Sua relação com a Casa 10 depende do sistema de casas usado. Por isso, a leitura deve informar o sistema adotado.'
			]
		}
	],
	metodo: [
		{
			title: 'Cálculo e interpretação',
			paragraphs: [
				'Os cálculos astrológicos usam os dados de nascimento e as configurações indicadas no resultado. A interpretação explica os fatores do mapa e relaciona esses fatores com o assunto da leitura.',
				'No Tarot, a leitura parte das cartas registradas no sorteio. Nos sonhos, parte do relato e das associações que você enviar.'
			]
		},
		{
			title: 'Dados incompletos',
			paragraphs: [
				'Se a hora de nascimento for aproximada ou desconhecida, essa informação acompanha o resultado. O produto indica quais partes podem ser afetadas.'
			]
		},
		{
			title: 'Disponibilidade',
			paragraphs: [
				'Cada produto informa quando está em preparação e quando pode ser solicitado. Salvar dados de nascimento não compra nem libera uma leitura.'
			]
		}
	],
	caderno: [
		{
			title: 'Guias para entender seu mapa',
			paragraphs: [
				'Leia os guias sobre vocação, carreira, Casa 10 e Meio do Céu. Eles explicam os principais termos antes de você começar uma leitura pessoal.'
			]
		}
	],
	privacidade: [
		{
			title: 'Dados de nascimento e leituras',
			paragraphs: [
				'Na sua conta, você pode consultar, corrigir ou excluir os dados de nascimento. A Biblioteca reúne suas leituras e os controles disponíveis para os registros salvos.'
			]
		},
		{
			title: 'Uso dos registros em outras leituras',
			paragraphs: [
				'Esse uso exige uma autorização específica. Desativar ou revogar a autorização não apaga os registros; a exclusão é uma ação separada na Biblioteca.'
			]
		},
		{
			title: 'Dados de outra pessoa',
			paragraphs: [
				'Compartilhe dados de outra pessoa apenas com sua autorização. Essa regra também se aplica às leituras de casal.'
			]
		}
	],
	cookies: [
		{
			title: 'Armazenamento essencial',
			paragraphs: [
				'O site usa armazenamento necessário para a sessão e para lembrar suas escolhas de consentimento.'
			]
		},
		{
			title: 'Analytics',
			paragraphs: [
				'A medição de uso só é ativada depois da sua autorização. Você pode revisar a escolha no aviso de cookies quando ele estiver disponível.'
			]
		}
	],
	suporte: [
		{
			title: 'Não consegue abrir uma leitura?',
			paragraphs: [
				'Entre na conta usada para salvar o resultado e abra a Biblioteca. Se aparecer um erro de carregamento, tente novamente antes de criar outro pedido.'
			]
		},
		{
			title: 'Compra e cobrança',
			paragraphs: [
				'Use os canais indicados no comprovante da compra para consultar a transação. O atendimento próprio do site ainda está em preparação.'
			]
		}
	]
};
