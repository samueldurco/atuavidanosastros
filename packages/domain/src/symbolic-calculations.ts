import { parseWorkflowInput, type CalculationSnapshot } from './workflows.ts';

// Candidate content policy, not an approved interpretive corpus. No card meanings or predictions.
const majors = ['O Louco','O Mago','A Sacerdotisa','A Imperatriz','O Imperador','O Hierofante','Os Enamorados',
  'O Carro','A Força','O Eremita','A Roda da Fortuna','A Justiça','O Enforcado','A Morte','A Temperança',
  'O Diabo','A Torre','A Estrela','A Lua','O Sol','O Julgamento','O Mundo'];
const ranks = ['Ás','Dois','Três','Quatro','Cinco','Seis','Sete','Oito','Nove','Dez','Pajem','Cavaleiro','Rainha','Rei'];
const suits = [['wands','Paus'],['cups','Copas'],['swords','Espadas'],['pentacles','Ouros']] as const;
export const tarotDeck = Object.freeze([
  ...majors.map((name,index)=>Object.freeze({id:`major-${index}`,name})),
  ...suits.flatMap(([suit,label])=>ranks.map((rank,index)=>Object.freeze({id:`${suit}-${index+1}`,name:`${rank} de ${label}`})))
]);
export const symbolicContract = Object.freeze({
  version:'atv-symbolic-calculation/1.0.0', deckVersion:'atv-tarot-78/1.0.0',
  drawAlgorithm:'sha256-counter-rejection-fisher-yates/1', spreadVersion:'atv-question-slots/1.0.0',
  reviewStatus:'candidate', reversals:false,
  products:Object.freeze(['daily-card','three-questions','dream-reading','dream-journal'])
});
const runIdPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Server-created UUID fixes the draw before a retry. Input text and client idempotency keys are not seeds. */
export async function calculateTarot(value: unknown, runId: string, signal: AbortSignal): Promise<CalculationSnapshot> {
  const input=parseWorkflowInput(value);
  if(!input || !['daily-card','three-questions'].includes(input.productId) || !runIdPattern.test(runId))
    throw new TypeError('invalid_tarot_input');
  const count=input.productId==='daily-card'?1:3;
  const seed=[symbolicContract.drawAlgorithm,symbolicContract.deckVersion,symbolicContract.spreadVersion,input.productId,runId.toLowerCase()].join('|');
  let block=new Uint32Array(0),cursor=0,counter=0;
  async function next(bound: number): Promise<number> {
    const limit=Math.floor(0x100000000/bound)*bound;
    for(let attempts=0;attempts<4096;attempts++) {
      signal.throwIfAborted();
      if(cursor>=block.length) {
        const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${seed}|${counter++}`));
        const bytes=new DataView(hash);block=Uint32Array.from({length:8},(_,i)=>bytes.getUint32(i*4,false));cursor=0;
      }
      const candidate=block[cursor++]!;
      if(candidate<limit)return candidate%bound;
    }
    throw new Error('draw_exhausted');
  }
  const deck=[...tarotDeck];
  const cards=[];
  for(let i=0;i<count;i++) {
    const selected=i+await next(deck.length-i);
    [deck[i],deck[selected]]=[deck[selected]!,deck[i]!];
    cards.push({position:i+1,questionIndex:i,cardId:deck[i]!.id,name:deck[i]!.name,orientation:'upright'});
  }
  signal.throwIfAborted();
  const source=`${symbolicContract.deckVersion};${symbolicContract.drawAlgorithm};${symbolicContract.spreadVersion}`;
  return {version:symbolicContract.version,kind:'tarot',status:'recorded',
    facts:[...cards.flatMap((card,i)=>[
      {id:`question-${i+1}`,kind:'reported' as const,display:input.questions![i]!,source:`input.questions[${i}]`},
      {id:`card-${i+1}`,kind:'drawn' as const,display:`Posição ${card.position}: ${card.name} (posição direta)`,source}
    ]),...(input.context?[{id:'tarot-context',kind:'reported' as const,display:input.context,source:'input.context'}]:[])],
    data:{deckVersion:symbolicContract.deckVersion,spreadVersion:symbolicContract.spreadVersion,
      drawAlgorithm:symbolicContract.drawAlgorithm,seedSource:'server-run-uuid',replacement:false,reversals:false,
      cards,questions:input.questions,reviewStatus:'candidate'},
    limits:['Registro de sorteio, não previsão nem interpretação homologada.',
      'Uma carta por pergunta; cartas sem reposição, somente na posição direta. Política candidata sujeita à revisão editorial.',
      'Reprocessar preserva as cartas registradas. Nova consulta cria uma nova execução.']};
}

// Keep every original UTF-16 character, without splitting a surrogate pair at the fact boundary.
function narrativeParts(value: string): string[] {
  const parts=[];
  for(let start=0;start<value.length;) {
    let end=Math.min(start+1800,value.length);
    if(end<value.length && /[\uD800-\uDBFF]/.test(value[end-1]!))end--;
    parts.push(value.slice(start,end));start=end;
  }
  return parts;
}

/** An owned report, not a diagnosis, symbol dictionary, inferred emotion or longitudinal query. */
export function calculateDreamRecord(value: unknown): CalculationSnapshot {
  const input=parseWorkflowInput(value);
  if(!input || !['dream-reading','dream-journal'].includes(input.productId) || !input.dream)
    throw new TypeError('invalid_dream_input');
  const dream=input.dream;
  const facts:CalculationSnapshot['facts']=[{id:'dream-date',kind:'reported',display:dream.date,source:'input.dream.date'}];
  narrativeParts(dream.narrative).forEach((part,index)=>facts.push({id:`dream-narrative-${index+1}`,kind:'reported',display:`Relato (trecho ${index+1}): ${part}`,source:'input.dream.narrative'}));
  dream.emotions.forEach((emotion,index)=>facts.push({id:`dream-emotion-${index+1}`,kind:'reported',display:emotion,source:`input.dream.emotions[${index}]`}));
  dream.associations.forEach((association,index)=>facts.push({id:`dream-association-${index+1}`,kind:'reported',display:association,source:`input.dream.associations[${index}]`}));
  if(input.context)facts.push({id:'dream-context',kind:'reported',display:input.context,source:'input.context'});
  return {version:symbolicContract.version,kind:'dream',status:'recorded',facts,
    data:{entry:structuredClone(dream),context:input.context??null,
      continuity:{consent:input.consent.continuity,historyLoaded:false,recurrenceAssessed:false},symbolicHypotheses:[]},
    limits:['Relato e associações pessoais registrados sem atribuir significados universais aos símbolos.',
      'Emoções são informadas pela pessoa; não há diagnóstico ou inferência clínica.',
      'Nenhum histórico foi consultado; recorrência e interpretação simbólica não foram avaliadas.']};
}
