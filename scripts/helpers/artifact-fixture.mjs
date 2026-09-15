import { randomUUID } from 'node:crypto';
import { owner } from './product-database.mjs';

/** @template T
 * @param {import('@electric-sql/pglite').PGlite} db
 * @param {string} role
 * @param {string|null} user
 * @param {()=>Promise<T>} fn
 */
export async function asRole(db,role,user,fn) {
  if (!['anon','authenticated','service_role'].includes(role)) throw new Error('invalid fixture role');
  await db.exec(`set role ${role}`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user??'']);
  try{return await fn();}finally{await db.exec('reset role');}
}
// Isolated local fixture only. Never imported by application code or migration seeds.
/** @param {import('@electric-sql/pglite').PGlite} db */
export async function readyArtifactFixture(db,product='daily-card',user=owner) {
  await db.query('update workflow_releases set enabled=true,engine_approved=true,access_policy=\'free\' where product_id=$1',[product]);
  const created=await asRole(db,'authenticated',user,()=>db.query('select request_product_run($1,$2,$3) as id',
    [product,randomUUID(),{version:'atv-workflow/1.0.0',productId:product,consent:{storage:true,policyVersion:'atv-input-consent/1'}}]));
  const id=/** @type {{id:string}} */ (created.rows[0]).id;
  const calculation={version:'fixture/1',kind:product==='daily-card'?'tarot':'natal',status:'recorded',data:{synthetic:true},
    facts:[{id:'fact-1',kind:'calculated',display:'Base sintética',source:'fixture/1'}],limits:['Não é leitura real.']};
  const promotion='fixture-'+randomUUID();
  await db.query('insert into editorial_promotions values ($1,$2,$3,$4,null)',[promotion,product,'atv-workflow/1.0.0','b'.repeat(64)]);
  const editorial={version:'fixture/1',promotionId:promotion,reviewDigest:'a'.repeat(64),title:'Leitura sintética',
    sections:[{title:'Perspectiva',text:'Conteúdo sintético integral.',evidence:['fact-1']}],limits:['Somente QA local.']};
  for(const [rev,state,calc,edit] of [[1,'CALCULATED',calculation,null],[2,'AWAITING_EDITORIAL',null,null],[3,'READY',null,editorial]])
    await asRole(db,'service_role',null,()=>db.query('select advance_product_run($1,$2,$3,$4,$5,$6)',[id,user,rev,state,calc,edit]));
  return {id,productId:product,revision:4,reviewDigest:editorial.reviewDigest,sectionCount:1};
}
