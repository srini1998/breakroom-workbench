import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { useCases } from '../src/useCases.ts';
const out = 'public-site';
await mkdir(out, { recursive: true });
const read = async (p: string) => JSON.parse(await readFile(p, 'utf8'));
const datasets = Object.fromEntries(await Promise.all(['earthquakes','issues','stations','retail','recipes'].map(async id => {
  const data = await read(`data/public/${id}.json`);
  data.rows = data.rows.filter((r: any) => !/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(JSON.stringify(r)));
  return [id, data];
})));
const evaluation = await read('docs/evidence/evaluation-summary.json');
const sw = await read('docs/evidence/practical-switchboard.json');
const products = [];
for (const [slug, source] of Object.entries({ switchboard:'earthquakes', accessproof:'issues',eventmedic:'stations',erasurecheck:'retail',importrescue:'retail',economybreaker:'recipes'})) {
 const practical = await read(`docs/evidence/practical-${slug}.json`);
 const title = slug === 'switchboard' ? 'Switchboard' : ({accessproof:'AccessProof',eventmedic:'EventMedic',erasurecheck:'ErasureCheck',importrescue:'ImportRescue',economybreaker:'EconomyBreaker'} as any)[slug];
 const copy = slug === 'switchboard' ? {title:'Will every update reach the right people?',subtitle:'Check a Realtime change before changing the route.',audience:'Teams building live feeds and tenant dashboards',problem:'Changing how updates travel can lose events or expose another team’s records. A fast graph alone cannot prove the audience is right.',example:'Two fictional teams receive recorded USGS earthquake observations. The experiment sends real row payloads through Postgres Changes and private Broadcast, then compares expected recipients with actual receipts.',agent:'The local model chooses bounded load-group order. An independent evaluator checks audience and delivery objectives. It does not predict earthquakes or decide geological risk.',steps:['Freeze a public observation snapshot.','Send the same supported INSERT/UPDATE workload through both transports.','Compare actual receipts with the declared audience and measured objectives.'],limit:'Recorded USGS observations, fictional teams and local writes. This is not a live warning service. The small recorded live-model workload passed; an earlier full live workload remained inconclusive due coordinator delay.'} : useCases[slug];
 const checks = slug === 'switchboard' ? {run_id:sw.run.id,status:sw.run.status,verdict:sw.run.verdict,experiments:sw.experiments.length,operations:sw.operations.length,receipts:sw.receipts.length,config_hash:sw.run.config_hash,recorded_at:sw.run.updated_at} : {recorded_case_id:practical.case?.id,checks:Object.fromEntries(Object.entries(practical).filter(([k,v])=> k!=='case' && (typeof v !=='object' || v===null))),actions:practical.case?.events?.map((e:any)=>({type:e.type,at:e.at,summary:e.summary})),saved_state:practical.case?.state};
 products.push({slug,name:title,copy,source:datasets[source],checks,cases:evaluation.cases.filter((c:any)=>c.module===title)});
}
const payload = {version:1,mode:'recorded-evidence',generated_at:new Date().toISOString(),source_commit:'f53eb5209ec5569544ac6818af3bb26c344a5708',scope:'Actual recorded local experiments. Static public projection. No fresh backend operations run on this website. Email-bearing issue titles omitted from publication; source corpus remains in the private repository.',products,policy:await read('docs/evidence/policy-passport-candidate-1.json')};
const serialized = JSON.stringify(payload,null,2).replace(/[\w.+-]+@[\w-]+(\.[\w-]+)*\.[a-z]{2,}/gi,'[email removed]');
if (/sb_secret_[A-Za-z0-9]{20}|sk-proj-[A-Za-z0-9]{20}|eyJ[A-Za-z0-9_-]{20,}\.eyJ|BEGIN .*PRIVATE KEY|[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(serialized)) throw Error('Public evidence rejected by credential-pattern check');
await writeFile(`${out}/evidence.json`,serialized);
await writeFile(`${out}/manifest.json`,JSON.stringify({sha256:createHash('sha256').update(serialized).digest('hex'),files:['index.html','app.js','style.css','evidence.json','manifest.json'],scope:payload.scope},null,2));
console.log('Prepared bounded static evidence projection: six products; no credentials or backend deployment.');
