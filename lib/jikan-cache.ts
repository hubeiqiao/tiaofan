import {safeSnapshot,saveSnapshot,snapshotDb,DAY,type Snapshot} from './snapshots';
import {takeBudget} from './request-budget';

export const JIKAN_TTL=DAY, JIKAN_COOLDOWN=5*60*1000;
const ERROR='MyAnimeList / Jikan 暂时不可用。';
let cleanupAt=0;
export type JikanFailureReason='upstream_http'|'upstream_timeout'|'upstream_network'|'invalid_response'|'client_cancelled'|'storage_unavailable'|'unknown_failure';
export class JikanFailure extends Error {
  constructor(public reason:JikanFailureReason,public status?:number){super(reason)}
}
export function jikanFailureInfo(value:string|null|undefined){
  const match=/^jikan:(upstream_http|upstream_timeout|upstream_network|invalid_response|storage_unavailable|unknown_failure)(?::([1-5]\d\d))?$/.exec(value||'');
  return {reason:match?.[1] as JikanFailureReason|undefined,status:match?.[2]?Number(match[2]):null};
}
export type JikanPayload={items:Record<string,any>[];hasNext:boolean;at:string};
export type JikanCacheInfo={source:'MyAnimeList / Jikan';updatedAt:string|null;attemptedAt:string|null;stale:boolean;degraded:boolean;error:string|null;sourceUrl:string;state:'fresh'|'stale'|'cold';reason:string|null;upstreamStatus:number|null};
type Result={payload:JikanPayload|null;cache:JikanCacheInfo;retryAfter:number};
type Job={started_at:number;finished_at:number|null;lease_until:number;last_error:string|null;run_count:number};
export type JikanDeps={read:(key:string)=>Promise<Snapshot|null>;readJob:(key:string)=>Promise<Job|null>;claim:(key:string,now:number)=>Promise<boolean>;budget:()=>Promise<true|'budget'|'rate_limit'>;cancelClaim:(key:string,started:number,prior:Job|null)=>Promise<void>;save:(key:string,data:JikanPayload,url:string)=>Promise<void>;finish:(key:string,started:number,now:number,error:string|null)=>Promise<void>;now:()=>number};
export const CLAIM_JIKAN_SQL='INSERT INTO refresh_jobs(key,started_at,lease_until,run_count) VALUES(?,?,?,1) ON CONFLICT(key) DO UPDATE SET started_at=excluded.started_at,lease_until=excluded.lease_until,run_count=refresh_jobs.run_count+1 WHERE refresh_jobs.lease_until<=? AND refresh_jobs.started_at<=?';
export const jikanDeps:JikanDeps={
  read:safeSnapshot,now:Date.now,save:saveSnapshot,
  readJob:key=>snapshotDb().prepare('SELECT started_at,finished_at,lease_until,last_error,run_count FROM refresh_jobs WHERE key=?').bind('jikan-fetch:'+key).first<Job>(),
  budget:async()=>{const now=Date.now(),r=await snapshotDb().prepare('INSERT INTO refresh_jobs(key,started_at,lease_until,run_count) VALUES(?,?,0,1) ON CONFLICT(key) DO UPDATE SET run_count=refresh_jobs.run_count+1 WHERE refresh_jobs.run_count<3').bind('jikan-rate:'+Math.floor(now/1000),now).run();if(!r.meta.changes)return 'rate_limit';return await takeBudget('source',1)?true:'budget'},
  cancelClaim:async(key,started,prior)=>{
    const db=snapshotDb();
    if(prior&&prior.finished_at!==null&&prior.finished_at>=prior.started_at&&prior.lease_until===0)await db.prepare('UPDATE refresh_jobs SET started_at=?,finished_at=?,lease_until=?,last_error=?,run_count=? WHERE key=? AND started_at=?').bind(prior.started_at,prior.finished_at,prior.lease_until,prior.last_error,prior.run_count,'jikan-fetch:'+key,started).run();
    else await db.prepare('DELETE FROM refresh_jobs WHERE key=? AND started_at=?').bind('jikan-fetch:'+key,started).run();
  },
  claim:async(key,now)=>{const db=snapshotDb();if(now-cleanupAt>60000){await db.prepare("DELETE FROM refresh_jobs WHERE (key LIKE 'jikan-fetch:%' OR key LIKE 'jikan-rate:%') AND started_at<? AND lease_until<?").bind(now-DAY,now).run();await db.prepare("DELETE FROM source_snapshots WHERE key LIKE 'jikan:%' AND updated_at<?").bind(now-30*DAY).run();cleanupAt=now}const r=await db.prepare(CLAIM_JIKAN_SQL).bind('jikan-fetch:'+key,now,now+15000,now,now-JIKAN_COOLDOWN).run();return !!r.meta.changes},
  finish:async(key,started,now,error)=>{const db=snapshotDb();const r=await db.prepare('UPDATE refresh_jobs SET finished_at=?,lease_until=0,last_error=? WHERE key=? AND started_at=?').bind(now,error,'jikan-fetch:'+key,started).run();if(r.meta.changes)await db.prepare('UPDATE source_snapshots SET attempted_at=?,last_error=? WHERE key=?').bind(started,error,key).run()},
};
/** Only canonical public source requests are cached. No identity or combined library keys. */
export async function cachedJikan(key:string,url:string,fetcher:()=>Promise<JikanPayload>,deps:JikanDeps=jikanDeps,cacheOnly:boolean|'client_cancelled'=false):Promise<Result>{
  if(!/^jikan:(?:anime:[1-9]\d{0,6}|top:(?:[1-9]|1\d|20)|season:(?:19\d{2}|20\d{2}|2100):[0-3]:(?:[1-9]|1\d|20))$/.test(key)||!url.startsWith('https://api.jikan.moe/v4/'))throw Error('Invalid Jikan cache key');
  const now=deps.now();let prior:Snapshot|null=null,payload:JikanPayload|null=null,job:Job|null=null;
  try{prior=await deps.read(key);if(prior){const parsed=JSON.parse(prior.payload);if(Array.isArray(parsed.items)&&typeof parsed.hasNext==='boolean'&&Number.isFinite(Date.parse(parsed.at)))payload=parsed}}catch{}
  const result=(reason:string|null,error:string|null,at:number|null=job?.started_at||prior?.attempted_at||null,status:number|null=null,retryAfter=300):Result=>({payload,cache:{source:'MyAnimeList / Jikan',updatedAt:payload?payload.at:null,attemptedAt:at?new Date(at).toISOString():null,stale:!prior||now-prior.updated_at>=JIKAN_TTL,degraded:reason!==null,error,sourceUrl:url,state:payload?(prior&&now-prior.updated_at<JIKAN_TTL?'fresh':'stale'):'cold',reason,upstreamStatus:status},retryAfter});
  if(payload&&prior&&now-prior.updated_at<JIKAN_TTL)return result(null,null,prior.attempted_at,null,0);
  try{const previous=await deps.readJob(key);job=previous&&previous.finished_at!==null&&previous.finished_at>=previous.started_at&&previous.lease_until===0?previous:null}catch{return result('storage_unavailable',ERROR)}
  if(cacheOnly)return result(cacheOnly==='client_cancelled'?'client_cancelled':'cache_only',cacheOnly==='client_cancelled'?null:ERROR,job?.started_at||prior?.attempted_at||null,null,0);
  let claimed=false,stage:'admission'|'fetch'|'save'='admission';
  try{
    claimed=await deps.claim(key,now);
    if(!claimed){const active=await deps.readJob(key),waiting=!!active&&active.lease_until>now;const complete=active&&active.finished_at!==null&&active.finished_at>=active.started_at&&active.lease_until===0?active:job;const failure=jikanFailureInfo(complete?.last_error);return result(waiting?'inflight':'cooldown',ERROR,complete?.started_at||prior?.attempted_at||null,failure.status,Math.max(1,Math.ceil(((waiting?active!.lease_until:(active?.started_at||now)+JIKAN_COOLDOWN)-now)/1000)))}
    const admitted=await deps.budget();if(admitted!==true){await deps.cancelClaim(key,now,job);return result(admitted,'来源读取额度暂时用尽。',job?.started_at||prior?.attempted_at||null,null,admitted==='rate_limit'?1:60)}
    stage='fetch';const fresh=await fetcher();
    if(!Array.isArray(fresh.items)||typeof fresh.hasNext!=='boolean'||!Number.isFinite(Date.parse(fresh.at))||(payload?.items.length&&!fresh.items.length))throw new JikanFailure('invalid_response');
    stage='save';await deps.save(key,fresh,url);await deps.finish(key,now,deps.now(),null);payload=fresh;
    return{payload,cache:{source:'MyAnimeList / Jikan',updatedAt:fresh.at,attemptedAt:new Date(now).toISOString(),stale:false,degraded:false,error:null,sourceUrl:url,state:'fresh',reason:null,upstreamStatus:null},retryAfter:0};
  }catch(error){
    const failure=error instanceof JikanFailure?error:new JikanFailure(stage==='fetch'?'unknown_failure':'storage_unavailable');
    if(failure.reason==='client_cancelled'||stage==='admission'){if(claimed)try{await deps.cancelClaim(key,now,job)}catch{}return result(failure.reason,failure.reason==='client_cancelled'?null:ERROR,job?.started_at||prior?.attempted_at||null,null,failure.reason==='client_cancelled'?0:60)}
    if(claimed)try{await deps.finish(key,now,deps.now(),'jikan:'+failure.reason+(failure.status?':'+failure.status:''))}catch{}
    return result(failure.reason,ERROR,now,failure.status||null);
  }
}
