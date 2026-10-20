import type { AtlasPriorityId } from '../../atlas-priorities';

/** The consequence of pursuing two priorities together, rather than repeating their openings. */
const links: Record<string, string> = {
	'care/work':
		'Uma contribuição só ganha continuidade se o esforço tiver um tamanho que a rotina consegue receber. Um limite de carga pode melhorar a qualidade do trabalho; quando toda pausa é tratada como atraso, a própria capacidade de contribuir se desgasta.',
	'relationships/work':
		'Trabalhar com dedicação e estar disponível para os vínculos podem disputar as mesmas horas. A relação não precisa funcionar como compensação pelo trabalho, mas os acordos de convivência precisam incluir o custo real da direção profissional.',
	'resources/work':
		'A identificação com uma contribuição e sua sustentação material podem amadurecer em ritmos diferentes. Uma base de recursos dá margem para escolher; exigir que um trabalho resolva imediatamente sentido, renda e reconhecimento pode estreitar essa margem.',
	'home/work':
		'A direção pública precisa de uma base privada em que a pessoa não esteja sempre entregando algo. O pertencimento pode sustentar uma mudança profissional, desde que as obrigações de casa também recebam lugar na decisão.',
	'learning/work':
		'Aprender pode transformar a qualidade da contribuição, mas preparar-se indefinidamente também pode adiar a participação. A passagem fecunda é permitir que parte do entendimento amadureça no trabalho, sem dispensar a formação de que ele precisa.',
	'identity/work':
		'Uma realização pode expressar uma escolha própria sem representar todo o valor de quem a faz. Preservar essa diferença permite mudar de direção quando necessário, em vez de viver cada revisão como abandono de si.',
	'networks/work':
		'A contribuição ganha alcance ao participar de projetos coletivos, mas também passa a responder a compromissos que não foram definidos por uma pessoa só. Ampliar a participação exige negociar a parte que cabe a você, em vez de assumir todo o projeto como prova de envolvimento.',
	'care/relationships':
		'Disponibilidade afetiva e disponibilidade de tempo ou energia não são equivalentes. Uma rotina que admite limites permite sustentar presença; quando o vínculo só reconhece cuidado como acesso irrestrito, o descanso pode parecer afastamento mesmo quando protege a convivência.',
	'care/resources':
		'Organizar recursos pode abrir margem para diminuir uma carga; por outro lado, uma rotina exigente pode parecer necessária para proteger a base material. O encontro dessas prioridades pede que segurança também inclua o custo de manter essa organização.',
	'care/home':
		'A casa pode ser lugar de recomposição e também concentrar tarefas. Pertencer perde parte de seu amparo quando descansar depende de terminar sozinho tudo o que mantém o ambiente funcionando.',
	'care/learning':
		'Aprender precisa de atenção disponível, não apenas de tempo reservado. Um ritmo com espaço para elaborar pode dar mais continuidade ao entendimento que a tentativa de preencher todo intervalo com uma nova informação.',
	'care/identity':
		'Uma vontade própria precisa encontrar um ritmo em que possa ser sustentada. Escolher menos frentes pode dar mais expressão ao que importa, sem transformar limite em renúncia à identidade.',
	'care/networks':
		'Participar de um projeto coletivo pode trazer sentido e também ampliar o número de solicitações. O compromisso se torna mais confiável quando o grupo sabe com que disponibilidade pode contar, em vez de depender de uma presença ilimitada.',
	'relationships/resources':
		'Os acordos de proximidade também envolvem tempo, dinheiro e responsabilidades. Dar algo à relação pode expressar afeto, mas não deveria tornar impossível nomear uma diferença material ou rever uma distribuição que ficou desigual.',
	'home/relationships':
		'Sentir pertencimento não elimina a necessidade de escolher como participar. A intimidade se aprofunda quando o que se tornou familiar pode ser conversado, sem transformar toda mudança de acordo em ameaça ao vínculo.',
	'learning/relationships':
		'A troca pode ampliar a compreensão de cada pessoa, desde que conversar não vire a obrigação de chegar à mesma conclusão. Uma diferença bem formulada pode esclarecer o encontro mais do que uma concordância rápida.',
	'identity/relationships':
		'Uma escolha própria ganha espaço no vínculo quando pode ser apresentada sem funcionar como ultimato. A reciprocidade preserva tanto a possibilidade de aproximação quanto a de desejar algo diferente.',
	'networks/relationships':
		'Afinidade pessoal e participação num grupo podem se apoiar, mas não pedem os mesmos acordos. Compartilhar um projeto não obriga a compartilhar toda intimidade; uma relação também pode precisar de espaço fora das demandas coletivas.',
	'home/resources':
		'Uma base material pode proteger pertencimento, enquanto o desejo de preservar o que é familiar pode manter compromissos que já pesam. Dar continuidade à casa ou à família não exige conservar toda forma antiga de distribuir recursos.',
	'learning/resources':
		'Conhecimento amplia alternativas quando encontra meios para ser desenvolvido e usado. Investir em aprendizagem pede espaço material e tempo; a escolha ganha clareza quando o custo da preparação não fica invisível dentro da promessa do resultado.',
	'identity/resources':
		'Autonomia material pode abrir espaço para escolhas próprias, mas nenhuma base costuma eliminar toda dependência. O que importa é distinguir apoio que torna uma escolha possível de condições que acabam decidindo por você.',
	'networks/resources':
		'Um projeto coletivo pode ampliar acesso a meios e oportunidades, mas também cria compromissos compartilhados. A colaboração ganha sustentação quando fica claro o que cada participante oferece e o que precisa conservar para si.',
	'home/learning':
		'A história de pertencimento pode dar referências à aprendizagem e também estabelecer certezas difíceis de rever. Ampliar a compreensão não exige desqualificar a própria origem; permite escolher o que continua fazendo sentido levar adiante.',
	'home/identity':
		'Ter uma base reconhecível pode dar coragem para uma escolha própria. O ponto delicado aparece quando permanecer ligado parece exigir continuar igual: a autonomia pode mudar a forma de pertencer sem eliminar o vínculo.',
	'home/networks':
		'Projetos e grupos ampliam o mundo, enquanto a vida privada oferece uma base de continuidade. A participação fica mais inteira quando nenhuma dessas áreas precisa absorver todo o tempo e toda a lealdade.',
	'identity/learning':
		'Aprender pode transformar o que você reconhece como sua direção. Uma escolha própria não precisa ser defendida contra toda informação nova; pode se tornar mais precisa à medida que ganha linguagem e experiência.',
	'learning/networks':
		'A compreensão ganha alcance quando circula, mas a troca coletiva também expõe ideias ainda incompletas. O projeto pode funcionar como lugar de aprendizagem se houver espaço para revisar uma proposta sem perder o direito de participar.',
	'identity/networks':
		'Participar de algo maior pode ampliar uma escolha própria, desde que a adesão ao grupo preserve voz e possibilidade de discordância. A contribuição se empobrece quando pertencer exige apagar justamente a diferença que ela poderia oferecer.'
};

export function atlasPriorityLink(a: AtlasPriorityId, b: AtlasPriorityId): string {
	return links[[a, b].sort().join('/')] ?? '';
}
