
import published from '@/data/source-snapshots.json';
export const SIX_HOURS=6*60*60*1000,DAY=24*60*60*1000;
export function snapshotDb():D1Database{throw Error('Persistent storage is disabled in the source demo');}
export type Snapshot={key:string;payload:string;previous_payload:string|null;source_url:string;updated_at:number;attempted_at:number;last_error:string|null};
export const publishedSources=published as {generatedAt:string|null;snapshots:Snapshot[];jobs:any[]};
export async function readSnapshot(key:string):Promise<Snapshot|null>{return publishedSources.snapshots.find(s=>s.key===key)||null;}
export async function safeSnapshot(key:string){try{return await readSnapshot(key)}catch{return null}}
export function snapshotInfo(s:Snapshot,ttl=SIX_HOURS){return{updatedAt:new Date(s.updated_at).toISOString(),attemptedAt:new Date(s.attempted_at).toISOString(),stale:Date.now()-s.updated_at>ttl*2,error:s.last_error,sourceUrl:s.source_url};}
export async function saveSnapshot(key:string,payload:unknown,sourceUrl:string){const body=JSON.stringify(payload);if(new TextEncoder().encode(body).length>1200000)throw Error('数据快照超出本次更新预算');const now=Date.now();await snapshotDb().prepare('INSERT INTO source_snapshots(key,payload,source_url,updated_at,attempted_at,last_error) VALUES(?,?,?,?,?,NULL) ON CONFLICT(key) DO UPDATE SET previous_payload=source_snapshots.payload,payload=excluded.payload,source_url=excluded.source_url,updated_at=excluded.updated_at,attempted_at=excluded.attempted_at,last_error=NULL').bind(key,body,sourceUrl,now,now).run();}
export async function markSnapshotError(key:string,error:string){await snapshotDb().prepare('UPDATE source_snapshots SET attempted_at=?,last_error=? WHERE key=?').bind(Date.now(),error.slice(0,300),key).run();}
export function currentPeriods(){const d=new Date(),year=d.getUTCFullYear(),quarter=Math.floor(d.getUTCMonth()/3),previous=new Date(Date.UTC(year,quarter*3-3,1));return{current:{year,quarter},previous:{year:previous.getUTCFullYear(),quarter:Math.floor(previous.getUTCMonth()/3)}}}
export function catalogKey(year:number,quarter:number){return`catalog:${year}:${quarter}`;}
