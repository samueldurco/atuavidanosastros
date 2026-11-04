import { LAUNCH_INPUT_VERSION, type LaunchInput } from '@atv/domain';

/** Synthetic local examples only. No owner account, access grant or human E5 acceptance. */
const consent = { storage: true, policyVersion: 'atv-launch-consent/1' } as const;
const base = { version: LAUNCH_INPUT_VERSION, consent };
export const launchExampleBirth = {
	localDateTime: '1990-05-10T10:30:00',
	utcInstant: '1990-05-10T13:30:00Z',
	timezone: 'America/Sao_Paulo',
	latitude: -23.55,
	longitude: -46.63,
	locationSource: 'synthetic/local-example'
};
const birth = launchExampleBirth;
const option = (label: string, date: string) => ({
	...birth,
	label,
	city: 'Cidade fictícia',
	localDateTime: `${date}T10:30:00`,
	utcInstant: `${date}T13:30:00Z`
});
export const launchExampleInputs: LaunchInput[] = [
	{
		...base,
		productId: 'wedding-date-map',
		answers: {
			ceremonies: [
				option('Início da cerimônia A', '2027-03-20'),
				option('Início da cerimônia B', '2027-04-17')
			],
			priorities:
				'Mesmo marco: início da cerimônia, durante o dia e com tempo para receber familiares.'
		}
	},
	{
		...base,
		productId: 'ex-tarot',
		answers: {
			episode: 'Recebi uma mensagem depois de meses sem contato.',
			observedActions: 'Perguntou como estou; não propôs conversar nem pediu desculpas.',
			question: 'Quero responder a esta mensagem?',
			boundaries: 'Preservar meu tempo de descanso e não aceitar pressão por resposta.'
		}
	},
	{
		...base,
		productId: 'love-restart-map',
		birth,
		answers: {
			startDate: '2026-11-01',
			situation:
				'Quero conhecer novas pessoas depois de uma separação; não quero voltar para o meu ex.',
			desiredChange: 'Experimentar um encontro sem apressar compromisso.',
			boundaries: 'Preservar minhas noites de descanso.'
		}
	},
	{
		...base,
		productId: 'sexuality-map',
		birth,
		answers: {
			adult: true,
			situations: [
				'Quando conheço alguém e quero expressar interesse.',
				'Quando preciso dizer que prefiro ir devagar.'
			],
			preferences: 'Quero conversar antes de experimentar algo e poder interromper sem cobrança.'
		}
	},
	{
		...base,
		productId: 'intimacy-map',
		birth,
		answers: {
			adult: true,
			wish: 'Conversar sobre proximidade física com mais clareza.',
			boundaries: 'Quero poder pausar ou recusar sem insistência.',
			situation: 'Tenho dificuldade de iniciar esse assunto num encontro.'
		}
	},
	{
		...base,
		productId: 'emotional-reactions-map',
		birth,
		answers: {
			trigger: 'Quando me interrompem e não consigo terminar uma frase.',
			reaction: 'Falo mais alto e tento terminar rapidamente.',
			effect: 'A conversa fica mais tensa e eu desisto de explicar.'
		}
	},
	{
		...base,
		productId: 'financial-blocks-tarot',
		answers: {
			impasse: 'Adio mostrar uma primeira versão do meu trabalho.',
			attemptedAction: 'Preparei muitos rascunhos e ainda não mostrei nenhum.',
			availableStep: 'Tenho uma hora para escolher uma versão e pedir retorno a uma pessoa.'
		}
	},
	{
		...base,
		productId: 'hidden-talent-map',
		birth,
		answers: {
			favors: [
				'Uma pessoa pediu ajuda para organizar uma agenda de tarefas.',
				'Outra pessoa pediu que eu organizasse uma planilha de próximos passos.'
			],
			resources: 'Tenho uma planilha simples e duas horas disponíveis nesta semana.'
		}
	},
	{
		...base,
		productId: 'ascendant-style',
		birth,
		answers: {
			occasion: 'Uma apresentação informal de um trabalho.',
			wardrobe: ['Camisa azul', 'Blusa branca', 'Calça preta', 'Saia verde', 'Tênis branco'],
			comfort: 'Quero me movimentar e sentar sem peças apertadas.'
		}
	},
	{
		...base,
		productId: 'conversation-timing',
		birth,
		answers: {
			startDate: '2026-11-01',
			subject: 'A divisão de uma tarefa que está sobrecarregando minha semana.',
			objective: 'Combinar uma responsabilidade que cada pessoa aceite assumir.',
			constraints: 'Só iniciar depois de confirmar disponibilidade e sem conversar tarde da noite.'
		}
	},
	{
		...base,
		productId: 'cohabitation-map',
		birth,
		answers: {
			habits: [
				'Preciso de silêncio cedo para descansar.',
				'Gosto de combinar antes o horário de arrumar os espaços.'
			],
			expectation: 'Dividir as tarefas com confirmação explícita de cada pessoa.',
			friction: 'As tarefas ficam para depois e acabamos cobrando um ao outro.'
		}
	}
];
export const launchExampleExecutionId = (index: number) =>
	`8c6d9da2-d296-4b63-a30c-${String(index + 1).padStart(12, '0')}`;
