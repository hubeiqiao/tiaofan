import {snapshotDb} from './snapshots';
let lastCleanup=0;
export async function takeBudget(namespace:'jev'|'source',cost=1){
 const db=snapshotDb(),now=Date.now();if(now-lastCleanup>60000){await db.prepare("DELETE FROM refresh_jobs WHERE (key LIKE 'jev-budget:%' OR key LIKE 'source-budget:%') AND started_at<?").bind(now-172800000).run();lastCleanup=now}const windows=namespace==='jev'?[[60000,8],[3600000,60],[86400000,200]]:[[60000,60],[3600000,300],[86400000,1000]];
 for(const [duration,limit]of windows){const key=`${namespace}-budget:${duration}:${Math.floor(now/duration)}`;const result=await db.prepare('INSERT INTO refresh_jobs(key,started_at,lease_until,run_count) VALUES(?,?,0,?) ON CONFLICT(key) DO UPDATE SET run_count=refresh_jobs.run_count+excluded.run_count WHERE refresh_jobs.run_count+excluded.run_count<=?').bind(key,now,cost,limit).run();if(!result.meta.changes)return false;}
 return true;
}
