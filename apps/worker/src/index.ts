export type WorkerJobName =
  | 'hotmart.reconcile'
  | 'delivery.render'
  | 'email.dispatch'
  | 'account.erase';

export interface WorkerJob<T = unknown> {
  id: string;
  name: WorkerJobName;
  payload: T;
  attempt: number;
  correlationId: string;
}

export async function handleJob(job: WorkerJob): Promise<void> {
  if (job.attempt < 0) throw new Error('A tentativa do job não pode ser negativa.');
  throw new Error(`Handler ainda não registrado para ${job.name}.`);
}
