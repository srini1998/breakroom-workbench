import 'dotenv/config';
import {execFileSync} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {control,target} from '../server/db.ts';
const env={...process.env,DOCKER_HOST:process.env.DOCKER_HOST||(existsSync(homedir()+'/.colima/breakroom/docker.sock')?'unix://'+homedir()+'/.colima/breakroom/docker.sock':undefined)};
try{const containers=execFileSync('docker',['ps','--format','{{json .}}'],{env,encoding:'utf8'}).trim().split('\n').map(l=>JSON.parse(l)).filter(c=>c.Names.endsWith('_supa1'));const images=containers.map(c=>({container:c.Names,image:c.Image,digests:JSON.parse(execFileSync('docker',['image','inspect',c.Image,'--format','{{json .RepoDigests}}'],{env,encoding:'utf8'}))}));const models=await (await fetch('http://127.0.0.1:11434/api/tags')).json();const version=(await target.query('show server_version')).rows[0].server_version;const roles=[];for(const db of [control,target])roles.push((await db.query('select current_user,rolsuper,rolbypassrls from pg_roles where rolname=current_user')).rows[0]);await writeFile('docs/evidence/runtime-environment.json',JSON.stringify({verified_at:new Date().toISOString(),node:process.version,architecture:process.arch,supabase_postgres:version,images,models,roles},null,2));console.log('Recorded actual image digests, database/model versions and restricted runtime roles; no keys exported.');}finally{await control.end();await target.end();}
