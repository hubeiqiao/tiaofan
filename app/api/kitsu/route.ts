import {safeSnapshot,snapshotInfo} from '@/lib/snapshots';

const numberIds=(value:string|null)=>[...new Set((value||'').split(',').filter(id=>/^[1-9]\d{0,11}$/.test(id)))].slice(0,20);
/** Public snapshots only: missing entries never suppress other exact matches. */
export async function GET(req:Request){
 const u=new URL(req.url),top=u.searchParams.get('top')==='1',ids=numberIds(u.searchParams.get('ids')),directIds=numberIds(u.searchParams.get('kitsu_ids'));
 if(top){const cached=await safeSnapshot('rank:kitsu');if(cached)return Response.json({...JSON.parse(cached.payload),cache:snapshotInfo(cached)},{headers:{'Cache-Control':'no-store'}});return Response.json({items:[],availability:'unavailable',note:'当前后台快照没有可用的Kitsu榜单。'},{headers:{'Cache-Control':'no-store'}})}
 const seasonal=await safeSnapshot('kitsu:seasonal'),data=seasonal?JSON.parse(seasonal.payload):null;
 const byMal=data?.byMal&&typeof data.byMal==='object'&&!Array.isArray(data.byMal)?data.byMal:{};
 const seasonInfo=seasonal?snapshotInfo(seasonal):null;
 const annotate=(item:any,info:ReturnType<typeof snapshotInfo>|null)=>({...item,cacheStale:!!info?.stale,cacheDegraded:!!info?.error});
 const exactMal=ids.flatMap(id=>{const item=byMal[id];return item&&String(item.mal)===id&&/^[1-9]\d{0,11}$/.test(String(item.kitsu))?[annotate(item,seasonInfo)]:[]});
 const rank=directIds.length?await safeSnapshot('rank:kitsu'):null,rankData=rank?JSON.parse(rank.payload):null;
 const rankInfo=rank?snapshotInfo(rank):null;
 const directCandidates=[...Object.values(byMal).filter(Boolean).map(item=>annotate(item,seasonInfo)),...(Array.isArray(rankData?.items)?rankData.items:[]).map((item:any)=>annotate(item,rankInfo))].filter((item:any)=>item&&/^[1-9]\d{0,11}$/.test(String(item.kitsu)));
 const exactDirect=directIds.flatMap(id=>{const item=directCandidates.find((item:any)=>String(item.kitsu)===id);return item?[item]:[]});
 const items=[...new Map([...exactMal,...exactDirect].map((item:any)=>[String(item.kitsu),item])).values()];
 const missing={mal:ids.filter(id=>!exactMal.some((item:any)=>String(item.mal)===id)),kitsu:directIds.filter(id=>!exactDirect.some((item:any)=>String(item.kitsu)===id))};
 const available=(!ids.length||!!seasonal)&&(!directIds.length||!!seasonal||!!rank);
 return Response.json({items,missing,availability:available?'available':'unavailable',at:data?.at||rankData?.at||null,...(seasonal?{cache:seasonInfo}:rank?{cache:rankInfo}:{}),...(missing.mal.length||missing.kitsu.length||!available?{note:'当前后台快照没有部分作品的Kitsu评分；已保留其他作品的准确匹配。'}:{})},{headers:{'Cache-Control':'no-store'}});
}
